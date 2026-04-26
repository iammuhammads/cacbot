/* Sentry initializer (dynamic require to avoid hard dependency at compile-time) */
/* eslint-disable no-console */
declare const require: any;
import type { Env } from "../../config/env.js";

export async function initSentry(env: Env) {
  if (!env.SENTRY_DSN) {
    return null;
  }

  try {
    // load at runtime so CI/dev without the package won't fail at build-time
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require("@sentry/node");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Tracing = require("@sentry/tracing");

    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.05)
    });

    Sentry.setTag("service", "cac-agent");

    process.on("uncaughtException", (err) => {
      try { Sentry.captureException(err); } catch (_) {}
      // eslint-disable-next-line no-console
      console.error("uncaughtException:", err);
    });

    process.on("unhandledRejection", (err) => {
      try { Sentry.captureException(err); } catch (_) {}
      // eslint-disable-next-line no-console
      console.error("unhandledRejection:", err);
    });

    return Sentry;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("Sentry not available:", err);
    return null;
  }
}

