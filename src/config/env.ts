import "dotenv/config";
import { z } from "zod";
import type { WhatsAppProviderName } from "../types/domain.js";

const booleanString = z.preprocess((value) => {
  if (typeof value === "string") {
    return value === "true";
  }
  if (typeof value === "boolean") {
    return value;
  }
  return false;
}, z.boolean());

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  WHATSAPP_PROVIDER: z.enum(["twilio", "360dialog", "mock"]).default("mock"),
  REDIS_URL: z.string().optional(),
  AUTOMATION_QUEUE_MODE: z.enum(["auto", "inline", "bullmq"]).default("auto"),
  AUTOMATION_QUEUE_NAME: z.string().default("cac-automation"),
  AUTOMATION_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(2),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-3-5-sonnet-latest"),
  CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  AGENT_PHONE_NUMBERS: z.string().default(""),
  PUBLIC_BASE_URL: z.string().url().default("http://localhost:3000"),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_FROM: z.string().optional(),
  TWILIO_WEBHOOK_URL: z.string().url().optional(),
  TWILIO_VALIDATE_SIGNATURE: booleanString.default(true),
  TWILIO_DISABLE_OUTBOUND: booleanString.default(false),
  D360_API_KEY: z.string().optional(),
  D360_PHONE_NUMBER_ID: z.string().optional(),
  D360_API_BASE: z.string().default("https://waba-v2.360dialog.io"),
  // Supabase/service configuration (preferred keys: SUPABASE_URL + SUPABASE_SERVICE_KEY)
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_KEY: z.string().optional(),
  CAC_PORTAL_URL: z.string().url().default("https://icrp.cac.gov.ng"),
  CAC_EMAIL: z.string().optional(),
  CAC_PASSWORD: z.string().optional(),
  CAC_HEADLESS: booleanString.default(false),
  CAC_OTP_MODE: z.enum(["imap", "static"]).default("imap"),
  CAC_STATIC_OTP: z.string().optional(),
  CAC_IMAP_HOST: z.string().optional(),
  CAC_IMAP_PORT: z.coerce.number().int().positive().default(993),
  CAC_IMAP_SECURE: booleanString.default(true),
  CAC_IMAP_USERNAME: z.string().optional(),
  CAC_IMAP_PASSWORD: z.string().optional(),
  CAC_IMAP_MAILBOX: z.string().default("INBOX"),
  CAC_IMAP_FROM_FILTER: z.string().optional(),
  CAC_IMAP_SUBJECT_FILTER: z.string().default("OTP"),
  CAC_OTP_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
  CREDENTIALS_ENCRYPTION_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  SECRETS_BACKEND: z.enum(["env", "vault"]).default("env"),
  VAULT_ADDR: z.string().url().optional(),
  VAULT_TOKEN: z.string().optional(),
  LOCAL_STORAGE_ROOT: z.string().default("storage"),
  ARTIFACTS_ROOT: z.string().default("artifacts"),
  CAC_DEMO_NETWORK: z.enum(["offline", "fail-fast", "online"]).optional()
});

const envData = { ...process.env };
if (envData.RENDER_EXTERNAL_URL && !envData.PUBLIC_BASE_URL) {
  envData.PUBLIC_BASE_URL = envData.RENDER_EXTERNAL_URL;
}

const parsed = envSchema.parse(envData);

export const env = {
  ...parsed,
  ANTHROPIC_API_KEY: parsed.ANTHROPIC_API_KEY?.trim(),
  ANTHROPIC_MODEL: parsed.ANTHROPIC_MODEL?.trim(),
  SUPABASE_URL: parsed.SUPABASE_URL?.trim(),
  SUPABASE_SERVICE_KEY: parsed.SUPABASE_SERVICE_KEY?.trim(),
  agentPhoneNumbers: parsed.AGENT_PHONE_NUMBERS
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  whatsappProvider: parsed.WHATSAPP_PROVIDER as WhatsAppProviderName,
  secretsBackend: parsed.SECRETS_BACKEND
};

if (env.ANTHROPIC_API_KEY) {
  const mask = env.ANTHROPIC_API_KEY.substring(0, 10);
  console.log(`[config] Anthropic API Key loaded. Prefix: ${mask}... (Length: ${env.ANTHROPIC_API_KEY.length})`);
}

export type Env = typeof env;
