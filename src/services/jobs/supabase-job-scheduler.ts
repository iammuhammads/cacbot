import type { SessionStore } from "../../repositories/session-store.js";
import type { AutomationJobScheduler } from "./automation-job-scheduler.js";

export class SupabaseJobScheduler implements AutomationJobScheduler {
  constructor(private readonly store: SessionStore) {}

  async enqueueSubmission(sessionId: string, _priority = 10): Promise<void> {
    const session = await this.store.getById(sessionId);
    if (!session) return;

    // In a stateless Supabase queue, "enqueuing" simply means
    // ensuring the state is set to READY_FOR_SUBMISSION.
    // The polling worker will pick it up.
    session.state = "READY_FOR_SUBMISSION";
    session.updatedAt = new Date().toISOString();
    await this.store.save(session);
    console.log(`[supabase-job-scheduler] Enqueued submission for ${sessionId}`);
  }

  async enqueueResumePayment(sessionId: string): Promise<void> {
    const session = await this.store.getById(sessionId);
    if (!session) return;

    session.state = "PAYMENT_CONFIRMED";
    session.updatedAt = new Date().toISOString();
    await this.store.save(session);
    console.log(`[supabase-job-scheduler] Enqueued resume payment for ${sessionId}`);
  }
}
