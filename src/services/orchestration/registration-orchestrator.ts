import { randomUUID } from "node:crypto";
import type { Env } from "../../config/env.js";
import type { SessionStore } from "../../repositories/session-store.js";
import type { AgentCommand, NormalizedInboundMessage, SessionRecord, SessionState } from "../../types/domain.js";
import { EMPTY_REGISTRATION_DATA } from "../../types/domain.js";
import { mergeRegistrationData } from "../../utils/merge.js";
import { validateRegistrationData } from "../../utils/validation.js";
import type { RegistrationIntakeService } from "../ai/intake-service.js";
import type { CacAutomationService } from "../cac/cac-automation.js";
import type { ICacAccountStore } from "../../repositories/cac-account-store.js";
import type { AutomationJobScheduler } from "../jobs/automation-job-scheduler.js";
import type { FileStorageService } from "../storage/file-storage.js";
import type { WhatsAppProvider } from "../whatsapp/provider.js";
import type { AgentDecisionEngine } from "../ai/agent-decision-engine.js";

function normalizePhone(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, "").toLowerCase();
}

function extractAgentCommand(text: string): AgentCommand | null {
  const match = text.trim().match(/^(PAID|STATUS|OVERRIDE|RESUME|HELP|LIST|CANCEL|NOTE)\s*(.+)?$/i);
  if (!match?.[1]) {
    return null;
  }

  return {
    command: match[1].toUpperCase() as AgentCommand["command"],
    sessionId: match[2]?.trim()?.split(/\s+/)[0],
    extra: match[2]?.trim()?.split(/\s+/)?.slice(1)?.join(" ")
  };
}

export class RegistrationOrchestrator {
  private readonly agentPhones: Set<string>;

  constructor(
    private readonly env: Env,
    private readonly store: SessionStore,
    private readonly provider: WhatsAppProvider,
    private readonly intakeService: RegistrationIntakeService,
    private readonly fileStorage: FileStorageService,
    private readonly automation: CacAutomationService,
    private readonly jobScheduler: AutomationJobScheduler,
    private readonly adl: AgentDecisionEngine,
    private readonly cacAccountStore?: ICacAccountStore
  ) {
    this.agentPhones = new Set(env.agentPhoneNumbers.map((value) => normalizePhone(value)));
  }

  private appendAudit(session: SessionRecord, actor: SessionRecord["auditTrail"][number]["actor"], action: string, detail?: unknown): void {
    session.auditTrail.push({
      at: new Date().toISOString(),
      actor,
      action,
      detail
    });
  }

  private appendTurn(session: SessionRecord, role: SessionRecord["history"][number]["role"], text: string): void {
    session.history.push({
      id: randomUUID(),
      role,
      text,
      timestamp: new Date().toISOString()
    });
  }

  private setState(session: SessionRecord, state: SessionState, action: string): void {
    session.state = state;
    session.lastAction = action;
    session.updatedAt = new Date().toISOString();
  }

  private async persist(session: SessionRecord): Promise<void> {
    await this.store.save(session);
  }

  private createSession(message: NormalizedInboundMessage): SessionRecord {
    const now = new Date().toISOString();
    return {
      id: randomUUID(),
      userId: message.from,
      provider: message.provider,
      assignedAgent: this.env.agentPhoneNumbers[0],
      state: "NEW",
      collectedData: {
        ...EMPTY_REGISTRATION_DATA,
        clientName: message.profileName,
        clientPhone: message.from
      },
      history: [],
      auditTrail: [],
      lastAction: "session_created",
      behavioralContext: {
        mode: "CONVERSATIONAL",
        questionAttempts: {},
        userConfusionScore: 0,
        fieldIntegrity: {},
        lastActivityAt: now
      },
      plan: {
        currentStepIndex: 0,
        steps: [
          { id: "collect_type", label: "Collect registration type", completed: false, blocked: false },
          { id: "collect_names", label: "Collect business names", completed: false, blocked: false },
          { id: "collect_directors", label: "Collect directors/proprietors", completed: false, blocked: false },
          { id: "collect_details", label: "Collect business address & activity", completed: false, blocked: false },
          { id: "validate_data", label: "Validate all data", completed: false, blocked: false },
          { id: "submit_cac", label: "Submit to CAC Portal", completed: false, blocked: false },
          { id: "handle_payment", label: "Process payment", completed: false, blocked: false },
          { id: "confirm_completion", label: "Confirm submission complete", completed: false, blocked: false }
        ]
      },
      createdAt: now,
      updatedAt: now
    };
  }

  async handleInbound(message: NormalizedInboundMessage): Promise<void> {
    if (this.agentPhones.has(normalizePhone(message.from))) {
      await this.handleAgentMessage(message.from, message.text);
      return;
    }

    await this.handleClientMessage(message);
  }

  async handleWebChat(userId: string, text: string): Promise<string> {
    const message: NormalizedInboundMessage = {
      messageId: `web:${randomUUID()}`,
      from: userId,
      to: "system",
      text,
      media: [],
      provider: "mock",
      timestamp: new Date().toISOString(),
      profileName: "Web User",
      raw: {}
    };

    return this.processMessage(message);
  }

  async handleAgentMessage(from: string, text: string): Promise<void> {
    const command = extractAgentCommand(text);
    if (!command) {
      await this.provider.sendTextMessage(
        from,
        'Available commands: "PAID <sessionId>", "STATUS <sessionId>", "OVERRIDE <sessionId>", "RESUME <sessionId>".'
      );
      return;
    }

    if (command.command === "HELP") {
      await this.provider.sendTextMessage(
        from,
        'Commands:\n• PAID <sessionId> — confirm payment\n• STATUS <sessionId> — check status\n• LIST — show all active sessions\n• OVERRIDE <sessionId> — move to manual review\n• RESUME <sessionId> — resume after payment\n• CANCEL <sessionId> — cancel a session\n• NOTE <sessionId> <text> — add internal note\n• HELP — show this menu'
      );
      return;
    }

    if (command.command === "LIST") {
      const sessions = await this.store.listByState();
      const active = sessions.filter((s) => !["COMPLETED", "ERROR"].includes(s.state));
      if (active.length === 0) {
        await this.provider.sendTextMessage(from, "No active sessions at the moment.");
        return;
      }

      const summary = active
        .slice(0, 10)
        .map((s) => `• ${s.id.slice(0, 8)} | ${s.collectedData.clientName ?? s.userId} | ${s.state}`)
        .join("\n");
      await this.provider.sendTextMessage(from, `Active Sessions (${active.length}):\n${summary}`);
      return;
    }

    if (command.command === "CANCEL") {
      if (!command.sessionId) {
        await this.provider.sendTextMessage(from, "Send CANCEL <sessionId> to abort a case.");
        return;
      }

      const session = await this.store.getById(command.sessionId);
      if (!session) {
        await this.provider.sendTextMessage(from, `No session found for ${command.sessionId}.`);
        return;
      }

      this.setState(session, "ERROR", "agent_cancelled");
      this.appendAudit(session, "agent", "session_cancelled", { reason: "Agent cancelled via WhatsApp" });
      await this.persist(session);

      await this.provider.sendTextMessage(
        session.userId,
        "Your registration process has been paused. Our team will reach out if any further action is needed."
      );
      await this.provider.sendTextMessage(from, `Session ${session.id.slice(0, 8)} has been cancelled.`);
      return;
    }

    if (command.command === "NOTE") {
      if (!command.sessionId) {
        await this.provider.sendTextMessage(from, "Send NOTE <sessionId> <your note text>.");
        return;
      }

      const noteText = command.extra;
      if (!noteText) {
        await this.provider.sendTextMessage(from, "Please include note text: NOTE <sessionId> <text>.");
        return;
      }

      const session = await this.store.getById(command.sessionId);
      if (!session) {
        await this.provider.sendTextMessage(from, `No session found for ${command.sessionId}.`);
        return;
      }

      this.appendAudit(session, "agent", "internal_note", { note: noteText });
      session.collectedData.notes.push(`[AGENT] ${noteText}`);
      await this.persist(session);
      await this.provider.sendTextMessage(from, `Note added to ${session.id.slice(0, 8)}.`);
      return;
    }

    if (command.command === "STATUS") {
      if (!command.sessionId) {
        await this.provider.sendTextMessage(from, "Send STATUS <sessionId> so I can look it up.");
        return;
      }

      const session = await this.store.getById(command.sessionId);
      if (!session) {
        await this.provider.sendTextMessage(from, `No session found for ${command.sessionId}.`);
        return;
      }

      await this.provider.sendTextMessage(
        from,
        `Session ${session.id}\nState: ${session.state}\nClient: ${session.collectedData.clientName ?? session.userId}\nLast action: ${session.lastAction}`
      );
      return;
    }

    if (command.command === "OVERRIDE") {
      if (!command.sessionId) {
        await this.provider.sendTextMessage(from, "Send OVERRIDE <sessionId> to move a case to manual review.");
        return;
      }

      const session = await this.store.getById(command.sessionId);
      if (!session) {
        await this.provider.sendTextMessage(from, `No session found for ${command.sessionId}.`);
        return;
      }

      this.setState(session, "MANUAL_REVIEW", "agent_override");
      this.appendAudit(session, "agent", "manual_override");
      await this.persist(session);
      await this.provider.sendTextMessage(from, `Session ${session.id} is now in MANUAL_REVIEW.`);
      return;
    }

    const targetSession = await this.resolveAgentSession(from, command.sessionId);
    if (!targetSession) {
      return;
    }

    await this.provider.sendTextMessage(
      from,
      `${command.command === "PAID" ? "Payment received" : "Resuming"} for ${targetSession.id}.`
    );

    await this.jobScheduler.enqueueResumePayment(targetSession.id);
  }

  private async resolveAgentSession(agentPhone: string, requestedSessionId?: string): Promise<SessionRecord | null> {
    if (requestedSessionId) {
      const direct = await this.store.getById(requestedSessionId);
      if (!direct) {
        await this.provider.sendTextMessage(agentPhone, `No session found for ${requestedSessionId}.`);
        return null;
      }
      return direct;
    }

    const awaiting = await this.store.findAwaitingPaymentByAgent(agentPhone);
    if (awaiting.length === 1) {
      return awaiting[0] ?? null;
    }

    if (awaiting.length === 0) {
      await this.provider.sendTextMessage(
        agentPhone,
        "There is no payment-waiting session assigned to you right now."
      );
      return null;
    }

    await this.provider.sendTextMessage(
      agentPhone,
      `You have ${awaiting.length} payment-waiting sessions. Reply with PAID <sessionId> to avoid mixing them up.`
    );
    return null;
  }

  private async handleClientMessage(message: NormalizedInboundMessage): Promise<void> {
    const reply = await this.processMessage(message);
    await this.provider.sendTextMessage(message.from, reply);
  }

  private async processMessage(message: NormalizedInboundMessage): Promise<string> {
    let session = await this.store.getActiveByUser(message.from);
    if (!session) {
      session = this.createSession(message);
    }

    const storedDocuments = await this.fileStorage.saveInboundMedia(session, message.media);
    if (storedDocuments.length > 0) {
      session.collectedData.documents.push(...storedDocuments);
      this.appendAudit(session, "client", "documents_uploaded", {
        count: storedDocuments.length,
        documentIds: storedDocuments.map((item: any) => item.id)
      });
    }

    const inboundText = message.text.trim() || `[${message.media.length} document(s) uploaded]`;
    
    // --- 💳 FLEXIBLE PAYMENT DETECTION ---
    const isAwaitingPayment = session.state === "AWAITING_PAYMENT";
    const paymentKeywords = ["paid", "done", "completed", "sent", "finished"];
    const hasPaymentKeyword = paymentKeywords.some(k => inboundText.toLowerCase().includes(k));
    const hasRrr = inboundText.match(/\b\d{12}\b/);

    if (isAwaitingPayment && (hasPaymentKeyword || hasRrr)) {
      this.appendAudit(session, "client", "payment_intent_detected", { text: inboundText });
      this.setState(session, "PAYMENT_CONFIRMED", "auto_payment_detected");
      await this.persist(session);
      await this.jobScheduler.enqueueResumePayment(session.id);
      return "I’m verifying your payment now... One moment please. ⌛\n\nI will notify you the moment your registration is finalized!";
    }
    
    // Elite Manual OTP Logic
    // Only sniff for OTP if we are in AWAITING_OTP or ERROR states
    const isAwaitingOtp = session.state === "AWAITING_OTP" || session.state === "ERROR";
    const otpCandidate = inboundText.replace(/\s+/g, "").match(/\b\d{6}\b/)?.[0];

    if (isAwaitingOtp && otpCandidate) {
      session.collectedData.portal = {
        ...session.collectedData.portal,
        pendingManualOtp: {
          code: otpCandidate,
          receivedAt: new Date().toISOString(),
          confirmed: false
        }
      };
      await this.persist(session);
      const reply = `I detected "${otpCandidate}" as your CAC login code. Is this correct? Reply "YES" to confirm.`;
      return reply;
    }

    if (inboundText.toUpperCase() === "YES" && session.collectedData.portal?.pendingManualOtp?.confirmed === false) {
      const manual = session.collectedData.portal.pendingManualOtp!;
      manual.confirmed = true;
      this.setState(session, "READY_FOR_SUBMISSION", "manual_otp_confirmed");
      await this.persist(session);
      await this.jobScheduler.enqueueSubmission(session.id, 1); // Resume with HIGH PRIORITY
      return "Confirming code. Resuming your registration now! 🚀";
    }

    this.appendTurn(session, "client", inboundText);
    this.appendAudit(session, "client", "message_received", { messageId: message.messageId });

    session.behavioralContext.lastActivityAt = new Date().toISOString();

    const decision = await this.intakeService.processTurn(session, inboundText, message.profileName);
    
    // --- 🧠 AGENTIC DECISION LAYER (ADL) ---
    if (session.behavioralContext.userConfusionScore > 2 || decision.suggestedMode) {
       const adlDecision = await this.adl.decide(session, { event: "intake_friction_detected" });
       this.appendAudit(session, "system", "adl_decision", adlDecision);
       
       if (adlDecision.action === "ESCALATE") {
         decision.needsHuman = true;
       }
    }

    if (decision.userBehaviorProfile) {
      session.behavioralContext.userBehaviorProfile = decision.userBehaviorProfile;
    }

    // --- 🧠 BEHAVIORAL STRATEGY ENGINE ---
    if (decision.intent === "CONFUSION") {
      session.behavioralContext.userConfusionScore += 1;
    }

    // Immediate Guided Mode if AI is guessing
    if (decision.confidence < 0.5 && session.behavioralContext.mode === "CONVERSATIONAL") {
      session.behavioralContext.mode = "GUIDED";
    }
    
    // Active Threshold-based switching
    if (session.behavioralContext.userConfusionScore >= 2 && session.behavioralContext.mode === "CONVERSATIONAL") {
      session.behavioralContext.mode = "GUIDED";
    }
    if (session.behavioralContext.userConfusionScore >= 4) {
      session.behavioralContext.mode = "STRICT";
    }

    // --- ✅ FIELD-LEVEL INTEGRITY ---
    for (const [field, conf] of Object.entries(decision.fieldConfidence)) {
       // Only save if confidence is high enough
       if (conf >= 0.7) {
         session.behavioralContext.fieldIntegrity[field] = conf;
         // Merge into candidate data effectively
         const fieldData = (decision.candidateData as any)[field];
         if (fieldData) {
            (session.collectedData as any)[field] = fieldData;
            session.behavioralContext.userConfusionScore = Math.max(0, session.behavioralContext.userConfusionScore - 0.5);
         }
       }
    }

    // --- 📊 PLAN & PROGRESS VISIBILITY ---
    const validation = validateRegistrationData(session.collectedData);
    
    const plan = session.plan;
    const currentSubgoal = plan.steps[plan.currentStepIndex];
    if (currentSubgoal) {
       if (currentSubgoal.id === "collect_type" && session.collectedData.registrationType) currentSubgoal.completed = true;
       if (currentSubgoal.id === "collect_names" && session.collectedData.businessNameOptions.length >= 2) currentSubgoal.completed = true;
       if (currentSubgoal.completed && plan.currentStepIndex < plan.steps.length - 1) {
         plan.currentStepIndex += 1;
       }
    }

    const progressHeader = `[Step ${plan.currentStepIndex + 1}/${plan.steps.length}: ${plan.steps[plan.currentStepIndex]?.label}]\n\n`;
    let finalReply = progressHeader + decision.reply;

    // --- 🆘 ESCAPE HATCH ---
    if (session.behavioralContext.userConfusionScore >= 5) {
       finalReply += "\n\nI noticed this is getting a bit complex. Would you like me to connect you to a human agent to finish this quickly? Just say 'YES'.";
    }

    const ready = validation.ready && !decision.needsHuman && decision.confidence >= 0.7;
    
    const nextState: SessionState = ready
      ? "READY_FOR_SUBMISSION"
      : (decision.needsHuman || session.behavioralContext.userConfusionScore >= 8)
        ? "MANUAL_REVIEW"
        : "COLLECTING_DATA";

    this.setState(session, nextState, ready ? "validated_ready" : "awaiting_data");

    this.appendAudit(session, "system", "intake_processed", {
      ready,
      missingFields: validation.missingFields,
      intent: decision.intent,
      confidence: decision.confidence,
      mode: session.behavioralContext.mode
    });

    await this.persist(session);
    return finalReply;
  }

  async submitReadySession(sessionId: string): Promise<void> {
    const session = await this.store.getById(sessionId);
    if (!session) {
      return;
    }

    // Attach per-user CAC credentials if available
    try {
      const auth = this.cacAccountStore ? await this.cacAccountStore.getAccount(session.userId) : null;
      if (auth) {
        session.collectedData.portalCredentials = {
          email: auth.email,
          password: auth.password,
          useProfessionalAccount: Boolean(auth.useProfessionalAccount)
        };
      }
    } catch (err) {
      // ignore errors retrieving user account; fall back to env credentials
    }

    this.setState(session, "SUBMITTING", "automation_started");
    this.appendAudit(session, "system", "automation_submission_started");
    await this.persist(session);

    try {
      const outcome = await this.automation.startSubmission(session);
      session.collectedData = mergeRegistrationData(session.collectedData, {
        payment: outcome.payment,
        portal: outcome.portal
      });

      if (outcome.kind === "AWAITING_PAYMENT") {
        this.setState(session, "AWAITING_PAYMENT", "awaiting_payment");
        this.appendAudit(session, "system", "awaiting_payment", outcome);
        await this.persist(session);

        if (session.assignedAgent) {
          await this.provider.sendTextMessage(
            session.assignedAgent,
            [
              "New registration ready for payment:",
              `Client: ${session.collectedData.clientName ?? session.userId}`,
              `Type: ${session.collectedData.registrationType ?? "UNKNOWN"}`,
              `Amount: NGN ${outcome.payment?.amountNaira?.toLocaleString() ?? "TBD"}`,
              `RRR: ${outcome.payment?.rrr ?? "Pending scrape"}`,
              `Session ID: ${session.id}`,
              `Payment link: ${outcome.payment?.paymentLink ?? "N/A"}`,
              `Reply "PAID ${session.id}" once completed.`
            ].join("\n")
          );
        }

        await this.provider.sendTextMessage(
          session.userId,
          "Your CAC application has been prepared and moved to payment processing. I'll keep you updated as soon as the payment is confirmed."
        );

        return;
      }

      if (outcome.kind === "PENDING_APPROVAL" || outcome.kind === "QUERIED") {
        this.setState(session, "PENDING_APPROVAL", "awaiting_cac_approval");
        this.appendAudit(session, "system", "post_inc_pending", outcome);
        await this.persist(session);

        if (session.assignedAgent) {
          await this.provider.sendTextMessage(
            session.assignedAgent,
            `Post-inc session ${session.id} requires manual review: ${outcome.summary} | RC: ${session.collectedData.postIncData?.existingRcNumber ?? "N/A"}`
          );
        }

        await this.provider.sendTextMessage(
          session.userId,
          ["Your post-incorporation filing has been submitted and is pending CAC approval.", outcome.summary]
            .filter(Boolean)
            .join("\n")
        );

        return;
      }

      // Default: completed
      this.setState(session, "COMPLETED", "automation_completed");
      this.appendAudit(session, "system", "automation_completed", outcome);
      await this.persist(session);

      await this.provider.sendTextMessage(
        session.userId,
        [
          "Your CAC registration update:",
          outcome.summary,
          outcome.portal?.referenceNumber ? `Reference: ${outcome.portal.referenceNumber}` : undefined,
          outcome.portal?.statusText ? `Status: ${outcome.portal.statusText}` : undefined
        ].filter(Boolean).join("\n")
      );
    } catch (error) {
      const isOtpTimeout = session.state === "AWAITING_OTP";
      
      this.setState(session, isOtpTimeout ? "AWAITING_OTP" : "ERROR", "automation_failed");
      this.appendAudit(session, "system", "automation_error", {
        message: error instanceof Error ? error.message : String(error),
        isOtpTimeout
      });
      await this.persist(session);

      if (isOtpTimeout) {
        await this.provider.sendTextMessage(
          session.userId,
          "We are stuck at the CAC login screen! 🛑\n\nI couldn't receive the automated Login Code (OTP) via email. If you have the 6-digit code on your phone, please send it here so I can finish your registration!"
        ).catch(() => undefined);
      } else {
        // Notify the client with a reassuring message
        await this.provider.sendTextMessage(
          session.userId,
          "We're experiencing a brief delay with your registration. Our team is on it and will update you shortly."
        ).catch(() => undefined);
      }

      if (session.assignedAgent) {
        await this.provider.sendTextMessage(
          session.assignedAgent,
          `${isOtpTimeout ? "⏳" : "⚠️"} Automation ${isOtpTimeout ? "paused for OTP" : "failed"} for session ${session.id}:\n${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  async resumeAfterPayment(sessionId: string): Promise<void> {
    const session = await this.store.getById(sessionId);
    if (!session) {
      return;
    }

    session.collectedData.payment = {
      ...session.collectedData.payment,
      paidAt: new Date().toISOString()
    };
    this.setState(session, "PAYMENT_CONFIRMED", "payment_confirmed");
    this.appendAudit(session, "agent", "payment_confirmed");
    await this.persist(session);

    try {
      const outcome = await this.automation.resumeAfterPayment(session);
      session.collectedData = mergeRegistrationData(session.collectedData, {
        portal: outcome.portal
      });

      if (outcome.kind === "COMPLETED") {
        this.setState(session, "COMPLETED", "post_payment_completed");
        this.appendAudit(session, "system", "post_payment_completed", outcome);
        await this.persist(session);

        await this.provider.sendTextMessage(
          session.userId,
          [
            "Your CAC registration has been updated.",
            outcome.summary,
            outcome.portal?.referenceNumber ? `Reference: ${outcome.portal.referenceNumber}` : undefined,
            outcome.portal?.statusText ? `Status: ${outcome.portal.statusText}` : undefined
          ]
            .filter(Boolean)
            .join("\n")
        );
        return;
      }

      if (outcome.kind === "PENDING_APPROVAL" || outcome.kind === "QUERIED") {
        this.setState(session, "PENDING_APPROVAL", "post_payment_pending_approval");
        this.appendAudit(session, "system", "post_payment_pending_approval", outcome);
        await this.persist(session);

        if (session.assignedAgent) {
          await this.provider.sendTextMessage(
            session.assignedAgent,
            `Post-inc session ${session.id} requires follow-up after payment: ${outcome.summary}`
          );
        }

        await this.provider.sendTextMessage(
          session.userId,
          ["Your filing has been paid for and is now pending CAC review.", outcome.summary].filter(Boolean).join("\n")
        );
        return;
      }

      // Fallback: mark completed and persist
      this.setState(session, "COMPLETED", "post_payment_completed");
      this.appendAudit(session, "system", "post_payment_completed", outcome);
      await this.persist(session);
    } catch (error) {
      this.setState(session, "ERROR", "post_payment_resume_failed");
      this.appendAudit(session, "system", "post_payment_resume_failed", {
        message: error instanceof Error ? error.message : String(error)
      });
      await this.persist(session);

      if (session.assignedAgent) {
        await this.provider.sendTextMessage(
          session.assignedAgent,
          `Post-payment automation failed for ${session.id}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  async checkStaleSessions(): Promise<void> {
    const sessions = await this.store.listByStates(["COLLECTING_DATA", "AWAITING_PAYMENT", "AWAITING_OTP"]);
    const now = Date.now();

    for (const session of sessions) {
       const lastActive = new Date(session.behavioralContext.lastActivityAt).getTime();
       const diffMin = (now - lastActive) / (1000 * 60);

       if (diffMin >= 1440) { // 24 hours
          this.setState(session, "ERROR", "archived_due_to_inactivity");
          await this.persist(session);
          await this.provider.sendTextMessage(session.id, "I've saved your progress. We can continue anytime. Just send a message when you are back! 👋");
       } else if (diffMin >= 60 && session.state !== "ERROR") { // 1 hour
          // soft pause - log it
       } else if (diffMin >= 10 && !session.auditTrail.some((a: any) => a.action === "stale_reminder_sent" && (now - new Date(a.at).getTime()) < 3600000)) {
          this.appendAudit(session, "system", "stale_reminder_sent", {});
          await this.persist(session);
          await this.provider.sendTextMessage(session.id, "Checking in! I'm still here to help with your CAC registration. Would you like to continue?");
       }
    }
  }

  async listSessions(state?: SessionState): Promise<SessionRecord[]> {
    if (state) return this.store.listByState(state);
    return this.store.listAll();
  }

  async getSession(sessionId: string): Promise<SessionRecord | null> {
    return this.store.getById(sessionId);
  }

  async moveToManualReview(sessionId: string): Promise<boolean> {
    const session = await this.store.getById(sessionId);
    if (!session) {
      return false;
    }

    this.setState(session, "MANUAL_REVIEW", "dashboard_manual_review");
    this.appendAudit(session, "agent", "dashboard_manual_review");
    await this.persist(session);
    return true;
  }

  async retrySubmission(sessionId: string): Promise<boolean> {
    const session = await this.store.getById(sessionId);
    if (!session) {
      return false;
    }

    await this.jobScheduler.enqueueSubmission(sessionId);
    return true;
  }

  async confirmPaymentAndResume(sessionId: string): Promise<boolean> {
    const session = await this.store.getById(sessionId);
    if (!session) {
      return false;
    }

    await this.jobScheduler.enqueueResumePayment(sessionId);
    return true;
  }
}
