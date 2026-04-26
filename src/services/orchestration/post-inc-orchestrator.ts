import { randomUUID } from "node:crypto";
import type { Env } from "../../config/env.js";
import type { SessionStore } from "../../repositories/session-store.js";
import type { SessionRecord, SessionState, AutomationOutcome } from "../../types/domain.js";
import type { WhatsAppProvider } from "../whatsapp/provider.js";

export class PostIncOrchestrator {
  constructor(
    private readonly env: Env,
    private readonly store: SessionStore,
    private readonly provider: WhatsAppProvider
  ) {}

  private appendAudit(session: SessionRecord, actor: SessionRecord["auditTrail"][number]["actor"], action: string, detail?: unknown): void {
    session.auditTrail.push({ at: new Date().toISOString(), actor, action, detail });
  }

  private setState(session: SessionRecord, state: SessionState, action: string): void {
    session.state = state;
    session.lastAction = action;
    session.updatedAt = new Date().toISOString();
  }

  async moveToPendingApproval(sessionId: string): Promise<boolean> {
    const session = await this.store.getById(sessionId);
    if (!session) return false;

    this.setState(session, "PENDING_APPROVAL", "moved_to_pending_approval");
    this.appendAudit(session, "system", "moved_to_pending_approval");
    await this.store.save(session);

    // Notify assigned agent or first configured approver
    const agent = session.assignedAgent ?? this.env.agentPhoneNumbers[0];
    if (agent) {
      await this.provider.sendTextMessage(
        agent,
        `Post-Incorporation filing requires manual approval: Session ${session.id} | Client: ${session.collectedData.clientName ?? session.userId} | RC: ${session.collectedData.postIncData?.existingRcNumber ?? "N/A"}`
      );
    }

    return true;
  }

  async processApprovalOutcome(sessionId: string, outcome: AutomationOutcome): Promise<boolean> {
    const session = await this.store.getById(sessionId);
    if (!session) return false;

    if (outcome.kind === "COMPLETED") {
      this.setState(session, "COMPLETED", "post_inc_completed");
      this.appendAudit(session, "system", "post_inc_completed", outcome);
      session.collectedData.portal = outcome.portal ?? session.collectedData.portal;
      await this.store.save(session);
      await this.provider.sendTextMessage(
        session.userId,
        `Your post-incorporation filing is complete. ${outcome.summary}`
      );
      return true;
    }

    if (outcome.kind === "QUERIED" || outcome.kind === "PENDING_APPROVAL") {
      this.setState(session, "PENDING_APPROVAL", "post_inc_pending_or_queried");
      this.appendAudit(session, "system", "post_inc_pending_or_queried", outcome);
      await this.store.save(session);
      if (session.assignedAgent) {
        await this.provider.sendTextMessage(
          session.assignedAgent,
          `Post-inc session ${session.id} requires attention: ${outcome.summary}`
        );
      }
      return true;
    }

    return false;
  }
}
