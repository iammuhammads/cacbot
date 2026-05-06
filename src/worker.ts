import { env } from "./config/env.js";
import { assertRuntimeConfig } from "./config/runtime-checks.js";
import { SupabaseSessionStore } from "./repositories/session-store.js";
import { RegistrationIntakeService } from "./services/ai/intake-service.js";
import { CacAutomationService } from "./services/cac/cac-automation.js";
import { createOtpResolver } from "./services/cac/otp-resolver.js";
import { NoopAutomationJobScheduler } from "./services/jobs/automation-job-scheduler.js";
import { RegistrationOrchestrator } from "./services/orchestration/registration-orchestrator.js";
import { FileStorageService } from "./services/storage/file-storage.js";
import { SupabaseStorageProvider } from "./services/storage/supabase-storage-provider.js";
import { createWhatsAppProvider } from "./services/whatsapp/provider.js";
import { SupabaseCacAccountStore } from "./repositories/supabase-cac-account-store.js";
import { WebhookService } from "./services/monitoring/webhook-service.js";
import { RemitaService } from "./services/payment/remita-service.js";
import { NotificationService } from "./services/notifications/notification-service.js";

async function main() {
  assertRuntimeConfig(env);

  const store = new SupabaseSessionStore(env);
  await store.connect();

  const storage = new SupabaseStorageProvider(env);
  await storage.connect();

  const cacAccountStore = new SupabaseCacAccountStore(env);
  await cacAccountStore.connect();

  const adl = new (await import("./services/ai/agent-decision-engine.js")).AgentDecisionEngine(env);

  const whatsapp = createWhatsAppProvider(env);
  const orchestrator = new RegistrationOrchestrator(
    env,
    store,
    whatsapp,
    new RegistrationIntakeService(env),
    new FileStorageService(env, storage),
    new CacAutomationService(env, createOtpResolver(env), storage, adl),
    new NoopAutomationJobScheduler(),
    adl,
    new WebhookService(),
    new RemitaService(env),
    new NotificationService(env, whatsapp),
    cacAccountStore
  );

  console.log(`[polling-worker] Starting in stateless Supabase mode...`);

  // The Polling Loop
  // We check for jobs every 15 seconds.
  const poll = async () => {
    try {
      // 1. Look for candidates
      const ready = await store.listByState("READY_FOR_SUBMISSION");
      const confirmed = await store.listByState("PAYMENT_CONFIRMED");
      const jobs = [...ready, ...confirmed];

      if (jobs.length > 0) {
        console.log(`[polling-worker] Found ${jobs.length} potential jobs. Attempting to claim...`);
      }

      for (const job of jobs) {
        // 2. Attempt atomic claim in the orchestrator/store
        // We set to SUBMITTING immediately via the orchestrator to prevent double-processing.
        // In the orchestrator, we can use a more atomic check later, but for now
        // the state machine check in the automation service handles the guard.
        
        if (job.state === "READY_FOR_SUBMISSION") {
          console.log(`[polling-worker] Processing submission: ${job.id}`);
          await orchestrator.submitReadySession(job.id);
        } else if (job.state === "PAYMENT_CONFIRMED") {
          console.log(`[polling-worker] Processing resume payment: ${job.id}`);
          await orchestrator.resumeAfterPayment(job.id);
        }
      }
    } catch (err) {
      console.error(`[polling-worker] Error in loop: ${String(err)}`);
    } finally {
      setTimeout(() => void poll(), 15000);
    }
  };

  void poll();

  const shutdown = async () => {
    console.log("[polling-worker] Shutting down...");
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

