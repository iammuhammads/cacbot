import type { Env } from "./env.js";

export interface RuntimeCheckReport {
  ok: boolean;
  provider: string;
  missing: string[];
  warnings: string[];
}

export function getRuntimeCheckReport(env: Env): RuntimeCheckReport {
  const missing: string[] = [];
  const warnings: string[] = [];

  if (env.whatsappProvider === "twilio") {
    if (!env.TWILIO_ACCOUNT_SID) missing.push("TWILIO_ACCOUNT_SID");
    if (!env.TWILIO_AUTH_TOKEN) missing.push("TWILIO_AUTH_TOKEN");
    if (!env.TWILIO_WHATSAPP_FROM) missing.push("TWILIO_WHATSAPP_FROM");
    if (env.TWILIO_VALIDATE_SIGNATURE && !env.TWILIO_WEBHOOK_URL) {
      warnings.push(
        "TWILIO_WEBHOOK_URL is not set. Signature validation will use PUBLIC_BASE_URL + request path."
      );
    }
  }

  if (!env.OPENAI_API_KEY) {
    warnings.push("OPENAI_API_KEY is not set. The intake flow will use heuristic fallback logic.");
  }

  if (!env.REDIS_URL) {
    warnings.push("REDIS_URL is not set. Sessions will be stored in memory only.");
  }

  if (env.AUTOMATION_QUEUE_MODE === "bullmq" && !env.REDIS_URL) {
    missing.push("REDIS_URL");
  }

  if (!env.ANTHROPIC_API_KEY) {
    warnings.push(
      "ANTHROPIC_API_KEY is not set. Claude brain will not be available."
    );
  }

  if (!env.CAC_EMAIL || !env.CAC_PASSWORD) {
    warnings.push("CAC portal credentials are incomplete. Automation submission cannot run yet.");
  }

  return {
    ok: missing.length === 0,
    provider: env.whatsappProvider,
    missing,
    warnings
  };
}

export function assertRuntimeConfig(env: Env): void {
  const report = getRuntimeCheckReport(env);
  if (!report.ok) {
    throw new Error(
      `Missing required configuration for provider ${report.provider}: ${report.missing.join(", ")}`
    );
  }
}
