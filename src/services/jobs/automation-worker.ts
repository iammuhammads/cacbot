import { Worker } from "bullmq";
import IORedis from "ioredis";
import type { Env } from "../../config/env.js";
import type {
  AutomationJobHandlers,
  AutomationJobPayload
} from "./automation-job-scheduler.js";

export function createAutomationWorker(
  env: Env,
  handlers: AutomationJobHandlers
): Worker<AutomationJobPayload> {
  if (!env.REDIS_URL) {
    throw new Error("REDIS_URL is required to start the automation worker.");
  }

  const connection = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null
  });

  const worker = new Worker<AutomationJobPayload>(
    env.AUTOMATION_QUEUE_NAME,
    async (job) => {
      // Phase 3: Anti-Detection Rate Limiting
      // Injected random delay (5-15s) to prevent concurrent workers from hitting CAC at exactly the same microsecond
      const jitterMs = Math.floor(Math.random() * 10000) + 5000;
      console.log(`[automation-worker] Job ${job.id} selected. Sleeping ${jitterMs}ms for anti-detection...`);
      await new Promise(r => setTimeout(r, jitterMs));

      if (job.name === "submit_registration") {
        await handlers.submitRegistration(job.data.sessionId);
        return;
      }

      if (job.name === "resume_payment") {
        await handlers.resumePayment(job.data.sessionId);
        return;
      }

      throw new Error(`Unsupported job name: ${job.name}`);
    },
    {
      connection,
      concurrency: env.AUTOMATION_WORKER_CONCURRENCY
    }
  );

  worker.on("completed", (job) => {
    console.log(
      `[automation-worker] completed ${job.name} for session ${job.data.sessionId}`
    );
  });

  worker.on("failed", (job, error) => {
    console.error(
      `[automation-worker] failed ${job?.name ?? "unknown"} for session ${job?.data.sessionId ?? "unknown"}: ${error.message}`
    );
  });

  return worker;
}

