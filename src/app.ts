import Fastify from "fastify";
import formBody from "@fastify/formbody";
import multipart from "@fastify/multipart";
import type { Env } from "./config/env.js";
import { getRuntimeCheckReport } from "./config/runtime-checks.js";
import { InMemorySessionStore, RedisSessionStore } from "./repositories/session-store.js";
import { RegistrationIntakeService } from "./services/ai/intake-service.js";
import { CacAutomationService } from "./services/cac/cac-automation.js";
import { createOtpResolver } from "./services/cac/otp-resolver.js";
import { RegistrationOrchestrator } from "./services/orchestration/registration-orchestrator.js";
import { FileStorageService } from "./services/storage/file-storage.js";
import { createWhatsAppProvider } from "./services/whatsapp/provider.js";
import type { SessionState } from "./types/domain.js";
import {
  renderDashboardDetail,
  renderDashboardIndex,
  renderDashboardSettings
} from "./services/dashboard/html.js";
import { renderLandingPage } from "./services/landing/html.js";
import {
  BullMqAutomationJobScheduler,
  InlineAutomationJobScheduler,
  shouldUseBullMq
} from "./services/jobs/automation-job-scheduler.js";
import { createQueueMonitor } from "./services/jobs/queue-monitor.js";
import { setupClerk, requireAuth } from "./plugins/clerk.js";
import { BotConfigStore, MarketingStore } from "./repositories/bot-config-store.js";

export async function buildApp(env: Env) {
  const app = Fastify({
    logger: true
  });

  await app.register(formBody);
  await app.register(multipart);
  await setupClerk(app);

  const store = env.REDIS_URL
    ? new RedisSessionStore(env.REDIS_URL)
    : new InMemorySessionStore();
  await store.connect();

  const provider = createWhatsAppProvider(env);
  const fileStorage = new FileStorageService(env);
  const intakeService = new RegistrationIntakeService(env);
  const automation = new CacAutomationService(env, createOtpResolver(env));
  const queueMonitor = createQueueMonitor(env);
  const botConfig = new BotConfigStore(env);
  const marketing = new MarketingStore();
  let orchestrator!: RegistrationOrchestrator;
  const jobScheduler = shouldUseBullMq(env)
    ? new BullMqAutomationJobScheduler(env)
    : new InlineAutomationJobScheduler({
        submitRegistration: async (sessionId) => {
          await orchestrator.submitReadySession(sessionId);
        },
        resumePayment: async (sessionId) => {
          await orchestrator.resumeAfterPayment(sessionId);
        }
      });

  orchestrator = new RegistrationOrchestrator(
    env,
    store,
    provider,
    intakeService,
    fileStorage,
    automation,
    jobScheduler
  );

  app.get("/health", async () => ({
    ok: true,
    provider: provider.name,
    redis: Boolean(env.REDIS_URL),
    queueMode: shouldUseBullMq(env) ? "bullmq" : "inline"
  }));

  app.get("/health/config", async () => getRuntimeCheckReport(env));
  app.get("/queue/status", async () => queueMonitor.getSnapshot(20));

  app.post("/api/leads", async (request, reply) => {
    const body = (request.body ?? {}) as { email?: string };
    if (!body.email) return reply.code(400).send({ error: "Email is required." });
    await marketing.saveLead(body.email);
    return { ok: true, message: "Lead captured! Talk soon." };
  });

  app.get("/", async (_request, reply) => {
    return reply.type("text/html").send(renderLandingPage());
  });

  app.post("/webhooks/whatsapp", async (request, reply) => {
    if (provider.validateInboundRequest) {
      const valid = provider.validateInboundRequest({
        body: request.body,
        headers: request.headers as Record<string, string | string[] | undefined>,
        rawUrl: request.raw.url ?? request.url
      });

      if (!valid) {
        return reply.code(403).send({
          ok: false,
          error: "Invalid webhook signature."
        });
      }
    }

    const inbound = await provider.parseInbound(
      request.body,
      request.headers as Record<string, string | string[] | undefined>
    );

    for (const message of inbound) {
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

  app.get("/dashboard", { preHandler: [requireAuth] }, async (_request, reply) => {
    const sessions = await orchestrator.listSessions();
    return reply.type("text/html").send(renderDashboardIndex(sessions));
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
    }

    if (!ok) {
      return reply.code(404).send({ error: "Session not found or unsupported action." });
    }

    return reply.redirect(`/dashboard/${body.sessionId}`);
  });

  return app;
}
