import type { Env } from "../../config/env.js";
import type { RegistrationOrchestrator } from "../orchestration/registration-orchestrator.js";
import type { SupabaseSessionStore } from "../../repositories/session-store.js";

export function startPollingWorker(
  env: Env,
  store: SupabaseSessionStore,
  orchestrator: RegistrationOrchestrator
) {
  console.log(`[polling-worker] Starting in-app polling worker...`);

  const poll = async () => {
    try {
      const ready = await store.listByState("READY_FOR_SUBMISSION");
      const confirmed = await store.listByState("PAYMENT_CONFIRMED");
      const jobs = [...ready, ...confirmed];

      if (jobs.length > 0) {
        console.log(`[polling-worker] Found ${jobs.length} jobs. Processing...`);
      }

      for (const job of jobs) {
        if (job.state === "READY_FOR_SUBMISSION") {
          console.log(`[polling-worker] Processing submission: ${job.id}`);
          await orchestrator.submitReadySession(job.id).catch(err => console.error(err));
        } else if (job.state === "PAYMENT_CONFIRMED") {
          console.log(`[polling-worker] Processing resume: ${job.id}`);
          await orchestrator.resumeAfterPayment(job.id).catch(err => console.error(err));
        }
      }
    } catch (err) {
      console.error(`[polling-worker] Error in loop: ${String(err)}`);
    } finally {
      setTimeout(() => void poll(), 15000);
    }
  };

  void poll();
}
