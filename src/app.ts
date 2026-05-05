import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import formBody from "@fastify/formbody";
import multipart from "@fastify/multipart";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import type { Env } from "./config/env.js";
import { getRuntimeCheckReport } from "./config/runtime-checks.js";
import { loadSecrets } from "./services/secrets/loader.js";
import { initSentry } from "./services/monitoring/sentry.js";
import { SupabaseSessionStore } from "./repositories/session-store.js";
import { RegistrationIntakeService } from "./services/ai/intake-service.js";
import { CacAutomationService } from "./services/cac/cac-automation.js";
import { createOtpResolver } from "./services/cac/otp-resolver.js";
import { RegistrationOrchestrator } from "./services/orchestration/registration-orchestrator.js";
import { FileStorageService } from "./services/storage/file-storage.js";
import { SupabaseStorageProvider } from "./services/storage/supabase-storage-provider.js";
import { SupabaseCacAccountStore } from "./repositories/supabase-cac-account-store.js";
import { createWhatsAppProvider } from "./services/whatsapp/provider.js";
import type { SessionState } from "./types/domain.js";
import {
  renderDashboardDetail,
  renderDashboardIndex,
  renderDashboardSettings
} from "./services/dashboard/html.js";
import { renderChatPage, renderLandingPage } from "./services/landing/html.js";
import { NoopAutomationJobScheduler } from "./services/jobs/automation-job-scheduler.js";
import { SupabaseJobScheduler } from "./services/jobs/supabase-job-scheduler.js";
import { setupClerk, requireAuth } from "./plugins/clerk.js";
import { SessionPoolManager } from "./services/cac/session-manager.js";
import { getAuth } from "@clerk/fastify";
import { BotConfigStore, MarketingStore } from "./repositories/bot-config-store.js";

export async function buildApp(env: Env) {
  // attempt to load secrets from configured backend (Vault) and initialize monitoring
  const externalSecrets = await loadSecrets(env).catch((err) => {
    // log but continue
    // eslint-disable-next-line no-console
    console.warn('loadSecrets error', err);
    return {} as Record<string, string>;
  });

  // if an encryption key is provided from secrets backend, use it to augment env at runtime
  if (externalSecrets.CREDENTIALS_ENCRYPTION_KEY) {
    // mutate env so stores that read env.CREDENTIALS_ENCRYPTION_KEY will work
    // @ts-ignore
    env.CREDENTIALS_ENCRYPTION_KEY = externalSecrets.CREDENTIALS_ENCRYPTION_KEY;
  }

  await initSentry(env);

  const app = Fastify({
    logger: true
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors);
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute'
  });
  
  await app.register(formBody);
  await app.register(multipart);
  await setupClerk(app);

  const storageProvider = new SupabaseStorageProvider(env);
  await storageProvider.connect();

  const store = new SupabaseSessionStore(env);
  await store.connect();

  const provider = createWhatsAppProvider(env);
  const fileStorage = new FileStorageService(env, storageProvider);
  const adl = new (await import("./services/ai/agent-decision-engine.js")).AgentDecisionEngine(env);
  const intakeService = new RegistrationIntakeService(env);
  const automation = new CacAutomationService(env, createOtpResolver(env), storageProvider, adl);
  
  const cacAccountStore = new SupabaseCacAccountStore(env);
  await cacAccountStore.connect();

  const botConfig = new BotConfigStore(env);
  const marketing = new MarketingStore();
  
  const jobScheduler = new SupabaseJobScheduler(store);

  const orchestrator = new RegistrationOrchestrator(
    env,
    store,
    provider,
    intakeService,
    fileStorage,
    automation,
    jobScheduler,
    adl,
    cacAccountStore
  );

  // Phase 4: Session Manager Heartbeat
  // Proactively refreshes CAC sessions every hour to avoid OTP blocks
  const sessionManager = new SessionPoolManager(env);
  // Start the heartbeat and the in-app polling worker
  sessionManager.startHeartbeat(3600000); 

  const { startPollingWorker } = await import("./services/jobs/polling-worker.js");
  startPollingWorker(env, store, orchestrator);
  // Post-inc approval helper
  const postIncOrchestrator = new (await import("./services/orchestration/post-inc-orchestrator.js")).PostIncOrchestrator(
    env,
    store,
    provider
  );

  app.get("/health", async () => ({
    ok: true,
    provider: provider.name,
    supabase: Boolean(env.SUPABASE_URL),
    queueMode: "supabase-polling"
  }));

  app.get("/health/config", async () => getRuntimeCheckReport(env));

  app.post("/api/leads", async (request, reply) => {
    const body = (request.body ?? {}) as { email?: string };
    if (!body.email) return reply.code(400).send({ error: "Email is required." });
    await marketing.saveLead(body.email);
    return { ok: true, message: "Lead captured! Talk soon." };
  });

  // Link CAC account (store encrypted credentials per authenticated user)
  app.post("/api/link-cac", { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as { email?: string; password?: string; useProfessionalAccount?: string; consent?: string };
    if (!body.email || !body.password) return reply.code(400).send({ error: "email and password are required" });
    if (!body.consent || body.consent !== "on") return reply.code(400).send({ error: "User consent is required to store CAC credentials." });
    try {
      const { userId } = getAuth(request) as any;
      if (!userId) return reply.code(401).send({ error: "Unauthorized" });
      await cacAccountStore.saveAccount(userId, {
        email: body.email,
        password: body.password,
        useProfessionalAccount: Boolean(body.useProfessionalAccount),
        consent: true
      });
      return { ok: true };
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: "Could not save CAC account." });
    }
  });

  app.get("/api/cac-account", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = getAuth(request) as any;
    if (!userId) return reply.code(401).send({ error: "Unauthorized" });
    const stored = await cacAccountStore.getAccount(userId);
    if (!stored) return { linked: false };
    return { linked: true, email: stored.email, useProfessionalAccount: Boolean(stored.useProfessionalAccount) };
  });

  app.post("/api/unlink-cac", { preHandler: [requireAuth] }, async (request, reply) => {
    const { userId } = getAuth(request) as any;
    if (!userId) return reply.code(401).send({ error: "Unauthorized" });
    await cacAccountStore.deleteAccount(userId);
    return { ok: true };
  });

  app.get("/", async (_request, reply) => {
    return reply.type("text/html").send(renderLandingPage(env));
  });

  app.get("/chat", async (_request, reply) => {
    return reply.type("text/html").send(renderChatPage(env));
  });

  app.post("/webhooks/whatsapp", {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: "1 minute"
      }
    }
  }, async (request, reply) => {
    console.log(`[webhook] Received WhatsApp message from provider: ${provider.name}`);
    if (provider.validateInboundRequest) {
      console.log(`[webhook] Validating signature for ${request.url}...`);
      const valid = provider.validateInboundRequest({
        body: request.body,
        headers: request.headers as Record<string, string | string[] | undefined>,
        rawUrl: request.raw.url ?? request.url
      });

      if (!valid) {
        console.error(`[webhook] Signature validation FAILED for ${request.url}`);
        return reply.code(403).send({
          ok: false,
          error: "Invalid webhook signature."
        });
      }
      console.log(`[webhook] Signature validation PASSED.`);
    }

    const inbound = await provider.parseInbound(
      request.body,
      request.headers as Record<string, string | string[] | undefined>
    );

    console.log(`[webhook] Parsed ${inbound.length} messages.`);

    for (const message of inbound) {
      console.log(`[webhook] Handling message from ${message.from}: ${message.text?.slice(0, 20)}...`);
      await orchestrator.handleInbound(message);
    }

    return reply.code(200).send({
      received: inbound.length
    });
  });

  app.post("/agent/commands", async (request) => {
    const body = (request.body ?? {}) as {
      from?: string;
      text?: string;
    };

    if (!body.from || !body.text) {
      return {
        ok: false,
        error: "from and text are required."
      };
    }

    await orchestrator.handleAgentMessage(body.from, body.text);
    return { ok: true };
  });

  app.get("/sessions", async (request) => {
    const query = request.query as { state?: SessionState };
    const sessions = await orchestrator.listSessions(query.state);
    return sessions.map((session) => ({
      id: session.id,
      state: session.state,
      userId: session.userId,
      assignedAgent: session.assignedAgent,
      registrationType: session.collectedData.registrationType,
      clientName: session.collectedData.clientName,
      updatedAt: session.updatedAt
    }));
  });

  app.get("/sessions/:sessionId", async (request, reply) => {
    const params = request.params as { sessionId: string };
    const session = await orchestrator.getSession(params.sessionId);
    if (!session) {
      return reply.code(404).send({ error: "Session not found." });
    }

    return session;
  });

  app.post("/api/chat", async (request, reply) => {
    const body = (request.body ?? {}) as { text: string; userId?: string };
    if (!body.text) return reply.code(400).send({ error: "Text is required." });
    
    // Generate or use provided userId (for web chat we use a 'web:' prefix)
    const userId = body.userId || `web:${randomUUID()}`;
    
    try {
      const response = await orchestrator.handleWebChat(userId, body.text);
      const session = await orchestrator.getSession(userId);
      return { 
        ok: true, 
        text: response,
        userId: userId,
        state: session?.state,
        auditTrail: session?.auditTrail
      };
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ 
        ok: false, 
        error: err instanceof Error ? err.message : String(err),
        tip: "Check your Render Environment Variables for ANTHROPIC_API_KEY"
      });
    }
  });

  app.get("/dashboard", { preHandler: [requireAuth] }, async (_request, reply) => {
    const sessions = await orchestrator.listSessions();
    const queue = await store.listByStates(["READY_FOR_SUBMISSION", "SUBMITTING", "PAYMENT_CONFIRMED", "AWAITING_OTP"]);
    
    // Real-Time Health Diagnostics
    const health = {
      db: await store.checkConnection(),
      worker: true, // In-app worker is always running if server is up
      ai: !!env.ANTHROPIC_API_KEY,
      whatsapp: !!env.TWILIO_ACCOUNT_SID && !!env.TWILIO_AUTH_TOKEN,
      cac: false
    };

    // Check CAC Portal Accessibility (ping-like check)
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(env.CAC_PORTAL_URL, { signal: controller.signal, method: 'HEAD' }).catch(() => null);
      clearTimeout(id);
      health.cac = !!(res && res.ok);
    } catch {
      health.cac = false;
    }
    
    return reply.type("text/html").send(renderDashboardIndex(sessions, health, queue));
  });

  app.get("/dashboard/:sessionId", { preHandler: [requireAuth] }, async (request, reply) => {
    const params = request.params as { sessionId: string };
    const session = await orchestrator.getSession(params.sessionId);
    if (!session) {
      return reply.code(404).type("text/html").send("<h1>Session not found.</h1>");
    }

    return reply.type("text/html").send(renderDashboardDetail(session));
  });

  app.get("/dashboard/settings", { preHandler: [requireAuth] }, async (_request, reply) => {
    const settings = await botConfig.getSettings();
    return reply.type("text/html").send(renderDashboardSettings(settings));
  });

  app.post("/dashboard/settings", { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as any;
    await botConfig.updateSettings({
      systemPrompt: body.systemPrompt,
      maintenanceMode: body.maintenanceMode === "on",
      autoSubmit: body.autoSubmit === "on"
    });
    return reply.redirect("/dashboard/settings?saved=true");
  });

  app.post("/dashboard/actions", { preHandler: [requireAuth] }, async (request, reply) => {
    const body = (request.body ?? {}) as {
      action?: string;
      sessionId?: string;
    };

    if (!body.action || !body.sessionId) {
      return reply.code(400).send({ error: "action and sessionId are required." });
    }

    let ok = false;
    if (body.action === "manual_review") {
      ok = await orchestrator.moveToManualReview(body.sessionId);
    } else if (body.action === "retry_submission") {
      ok = await orchestrator.retrySubmission(body.sessionId);
    } else if (body.action === "resume_payment") {
      ok = await orchestrator.confirmPaymentAndResume(body.sessionId);
    } else if (body.action === "approve_postinc") {
      // Agent approves a pending post-inc filing
      const outcome = {
        kind: "COMPLETED",
        summary: "Approved by agent via dashboard.",
        portal: {}
      } as any;
      ok = await postIncOrchestrator.processApprovalOutcome(body.sessionId, outcome as any);
    } else if (body.action === "mark_queried") {
      const outcome = {
        kind: "QUERIED",
        summary: "Marked as queried by agent.",
        portal: {}
      } as any;
      ok = await postIncOrchestrator.processApprovalOutcome(body.sessionId, outcome as any);
    }

    if (!ok) {
      return reply.code(404).send({ error: "Session not found or unsupported action." });
    }

    return reply.redirect(`/dashboard/${body.sessionId}`);
  });

  return app;
}
