import { randomUUID } from "node:crypto";
import type { Env } from "../../config/env.js";
import type { SessionStore } from "../../repositories/session-store.js";
import type { AgentCommand, NormalizedInboundMessage, SessionRecord, SessionState } from "../../types/domain.js";
import { EMPTY_REGISTRATION_DATA } from "../../types/domain.js";
import { mergeRegistrationData } from "../../utils/merge.js";
import { validateRegistrationData } from "../../utils/validation.js";
import type { RegistrationIntakeService } from "../ai/intake-service.js";
import type { CacAutomationService } from "../cac/cac-automation.js";
import type { AutomationJobScheduler } from "../jobs/automation-job-scheduler.js";
import type { FileStorageService } from "../storage/file-storage.js";
import type { WhatsAppProvider } from "../whatsapp/provider.js";

function normalizePhone(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, "").toLowerCase();
}

function extractAgentCommand(text: string): AgentCommand | null {
  const match = text.trim().match(/^(PAID|STATUS|OVERRIDE|RESUME|HELP)\s*([A-Za-z0-9-]+)?$/i);
  if (!match?.[1]) {
    return null;
  }

  return {
    command: match[1].toUpperCase() as AgentCommand["command"],
    sessionId: match[2]
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
    private readonly jobScheduler: AutomationJobScheduler
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
        'Commands: "PAID <sessionId>", "STATUS <sessionId>", "OVERRIDE <sessionId>", "RESUME <sessionId>".'
      );
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
    let session = await this.store.getActiveByUser(message.from);
    if (!session) {
      session = this.createSession(message);
    }

    const storedDocuments = await this.fileStorage.saveInboundMedia(session, message.media);
    if (storedDocuments.length > 0) {
      session.collectedData.documents.push(...storedDocuments);
      this.appendAudit(session, "client", "documents_uploaded", {
        count: storedDocuments.length,
        documentIds: storedDocuments.map((item) => item.id)
      });
    }

    const inboundText = message.text.trim() || `[${message.media.length} document(s) uploaded]`;
    this.appendTurn(session, "client", inboundText);
    this.appendAudit(session, "client", "message_received", { messageId: message.messageId });

    const decision = await this.intakeService.processTurn(session, inboundText, message.profileName);
    session.collectedData = mergeRegistrationData(session.collectedData, decision.candidateData);

    const validation = validateRegistrationData(session.collectedData);
    const ready = validation.ready && !decision.needsHuman;
    const nextState: SessionState = ready
      ? "READY_FOR_SUBMISSION"
      : decision.needsHuman
        ? "MANUAL_REVIEW"
        : "COLLECTING_DATA";

    this.setState(
      session,
      nextState,
      ready ? "validated_ready_for_submission" : "awaiting_more_data"
    );
    this.appendAudit(session, "system", "intake_processed", {
      ready,
      missingFields: validation.missingFields,
      issues: validation.issues,
      summary: decision.summary
    });

    const outbound = ready ? `${decision.reply}\n\nReference ID: ${session.id}` : decision.reply;

    this.appendTurn(session, "assistant", outbound);
    await this.persist(session);
    await this.provider.sendTextMessage(message.from, outbound);

    if (ready) {
      await this.jobScheduler.enqueueSubmission(session.id);
    }
  }

  async submitReadySession(sessionId: string): Promise<void> {
    const session = await this.store.getById(sessionId);
    if (!session) {
      return;
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
        ]
          .filter(Boolean)
          .join("\n")
      );
    } catch (error) {
      this.setState(session, "ERROR", "automation_failed");
      this.appendAudit(session, "system", "automation_error", {
        message: error instanceof Error ? error.message : String(error)
      });
      await this.persist(session);

      if (session.assignedAgent) {
        await this.provider.sendTextMessage(
          session.assignedAgent,
          `Automation failed for session ${session.id}: ${error instanceof Error ? error.message : String(error)}`
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

  async listSessions(state?: SessionState): Promise<SessionRecord[]> {
    return this.store.listByState(state);
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
