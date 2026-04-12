import { Queue } from "bullmq";
import IORedis from "ioredis";
import type { Env } from "../../config/env.js";
import { shouldUseBullMq } from "./automation-job-scheduler.js";

export interface QueueStatusSnapshot {
  mode: "inline" | "bullmq";
  queueName: string;
  counts: Record<string, number>;
  recentJobs: Array<{
    id: string;
    name: string;
    state: string;
    sessionId?: string;
    attemptsMade: number;
    timestamp: number;
    failedReason?: string;
  }>;
}

export interface QueueMonitor {
  getSnapshot(limit?: number): Promise<QueueStatusSnapshot>;
  close?(): Promise<void>;
}

export class InlineQueueMonitor implements QueueMonitor {
  constructor(private readonly env: Env) {}

  async getSnapshot(): Promise<QueueStatusSnapshot> {
    return {
      mode: "inline",
      queueName: this.env.AUTOMATION_QUEUE_NAME,
      counts: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0
      },
      recentJobs: []
    };
  }
}

export class BullMqQueueMonitor implements QueueMonitor {
  private readonly connection: IORedis;
  private readonly queue: Queue;

  constructor(private readonly env: Env) {
    if (!env.REDIS_URL) {
      throw new Error("REDIS_URL is required for BullMQ queue monitoring.");
    }

    this.connection = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null
    });
    this.queue = new Queue(env.AUTOMATION_QUEUE_NAME, {
      connection: this.connection
    });
  }

  async getSnapshot(limit = 20): Promise<QueueStatusSnapshot> {
    const counts = await this.queue.getJobCounts(
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed",
      "paused"
    );
    const jobs = await this.queue.getJobs(
      ["active", "waiting", "delayed", "failed", "completed"],
      0,
      Math.max(limit - 1, 0),
      true
    );

    const recentJobs = await Promise.all(
      jobs.map(async (job) => ({
        id: String(job.id),
        name: job.name,
        state: await job.getState(),
        sessionId: (job.data as { sessionId?: string } | undefined)?.sessionId,
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
        failedReason: job.failedReason
      }))
    );

    return {
      mode: "bullmq",
      queueName: this.env.AUTOMATION_QUEUE_NAME,
      counts,
      recentJobs
    };
  }

  async close(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}

export function createQueueMonitor(env: Env): QueueMonitor {
  return shouldUseBullMq(env) ? new BullMqQueueMonitor(env) : new InlineQueueMonitor(env);
}

