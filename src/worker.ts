import { env } from "./config/env.js";
import { assertRuntimeConfig } from "./config/runtime-checks.js";
import { InMemorySessionStore, RedisSessionStore } from "./repositories/session-store.js";
import { RegistrationIntakeService } from "./services/ai/intake-service.js";
import { CacAutomationService } from "./services/cac/cac-automation.js";
import { createOtpResolver } from "./services/cac/otp-resolver.js";
import { createAutomationWorker } from "./services/jobs/automation-worker.js";
import {
  NoopAutomationJobScheduler,
  shouldUseBullMq
} from "./services/jobs/automation-job-scheduler.js";
import { RegistrationOrchestrator } from "./services/orchestration/registration-orchestrator.js";
import { FileStorageService } from "./services/storage/file-storage.js";
import { createWhatsAppProvider } from "./services/whatsapp/provider.js";

async function main() {
  assertRuntimeConfig(env);

  if (!shouldUseBullMq(env)) {
    throw new Error(
      "The worker process only runs in BullMQ mode. Set REDIS_URL or AUTOMATION_QUEUE_MODE=bullmq."
    );
  }

  if (!env.REDIS_URL) {
    throw new Error("REDIS_URL is required to start the automation worker.");
  }

  const store = env.REDIS_URL
    ? new RedisSessionStore(env.REDIS_URL)
    : new InMemorySessionStore();
  await store.connect();

  const orchestrator = new RegistrationOrchestrator(
    env,
    store,
    createWhatsAppProvider(env),
    new RegistrationIntakeService(env),
    new FileStorageService(env),
    new CacAutomationService(env, createOtpResolver(env)),
    new NoopAutomationJobScheduler()
  );

  const worker = createAutomationWorker(env, {
    submitRegistration: async (sessionId) => {
      await orchestrator.submitReadySession(sessionId);
    },
    resumePayment: async (sessionId) => {
      await orchestrator.resumeAfterPayment(sessionId);
    }
  });

  console.log(
    `[automation-worker] listening on queue ${env.AUTOMATION_QUEUE_NAME} with concurrency ${env.AUTOMATION_WORKER_CONCURRENCY}`
  );

  const shutdown = async () => {
    await worker.close();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
