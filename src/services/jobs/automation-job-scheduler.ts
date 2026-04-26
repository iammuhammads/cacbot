import type { Env } from "../../config/env.js";
import { KeyedSerialQueue } from "../../utils/queue.js";

export type AutomationJobName = "submit_registration" | "resume_payment";

export interface AutomationJobPayload {
  sessionId: string;
}

export interface AutomationJobHandlers {
  submitRegistration(sessionId: string): Promise<void>;
  resumePayment(sessionId: string): Promise<void>;
}

export interface AutomationJobScheduler {
  enqueueSubmission(sessionId: string, priority?: number): Promise<void>;
  enqueueResumePayment(sessionId: string): Promise<void>;
  close?(): Promise<void>;
}

export class InlineAutomationJobScheduler implements AutomationJobScheduler {
  private readonly queue = new KeyedSerialQueue();

  constructor(private readonly handlers: AutomationJobHandlers) {}

  async enqueueSubmission(sessionId: string, _priority = 10): Promise<void> {
    void this.queue.enqueue(`submit-${sessionId}`, async () => {
      await this.handlers.submitRegistration(sessionId);
    }).catch((error) => {
      console.error(`[inline-automation] submit failed for ${sessionId}: ${String(error)}`);
    });
  }

  async enqueueResumePayment(sessionId: string): Promise<void> {
    void this.queue.enqueue(`resume-${sessionId}`, async () => {
      await this.handlers.resumePayment(sessionId);
    }).catch((error) => {
      console.error(`[inline-automation] resume failed for ${sessionId}: ${String(error)}`);
    });
  }
}

export class NoopAutomationJobScheduler implements AutomationJobScheduler {
  async enqueueSubmission(_sessionId: string, _priority = 10): Promise<void> {
    // No-op in polling mode as state changes trigger jobs
  }

  async enqueueResumePayment(): Promise<void> {
    // No-op in polling mode as state changes trigger jobs
  }
}
