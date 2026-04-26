import { Queue } from "bullmq";
import IORedis from "ioredis";
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

function jobId(name: AutomationJobName, sessionId: string): string {
  return `${name}-${sessionId}`;
}

export class InlineAutomationJobScheduler implements AutomationJobScheduler {
  private readonly queue = new KeyedSerialQueue();

  constructor(private readonly handlers: AutomationJobHandlers) {}

  async enqueueSubmission(sessionId: string, priority = 10): Promise<void> {
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
    throw new Error("No job scheduler is configured in this process.");
  }

  async enqueueResumePayment(): Promise<void> {
    throw new Error("No job scheduler is configured in this process.");
  }
}

export class BullMqAutomationJobScheduler implements AutomationJobScheduler {
  private readonly connection: IORedis;
  private readonly queue: Queue<AutomationJobPayload>;

  constructor(private readonly env: Env) {
    if (!env.REDIS_URL) {
      throw new Error("REDIS_URL is required for BullMQ automation jobs.");
    }

    this.connection = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null
    });
    this.queue = new Queue<AutomationJobPayload>(env.AUTOMATION_QUEUE_NAME, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000
        },
        removeOnComplete: 100,
        removeOnFail: 100
      }
    });
  }

  async enqueueSubmission(sessionId: string, priority = 10): Promise<void> {
    await this.queue.add(
      "submit_registration",
      { sessionId },
      {
        jobId: jobId("submit_registration", sessionId),
        priority
      }
    );
  }

  async enqueueResumePayment(sessionId: string): Promise<void> {
    await this.queue.add(
      "resume_payment",
      { sessionId },
      {
        jobId: jobId("resume_payment", sessionId),
        priority: 1 // High priority - push to front of queue
      }
    );
  }

  async close(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}

export function shouldUseBullMq(env: Env): boolean {
  if (env.AUTOMATION_QUEUE_MODE === "bullmq") {
    return true;
  }
  if (env.AUTOMATION_QUEUE_MODE === "inline") {
    return false;
  }
  return Boolean(env.REDIS_URL);
}
