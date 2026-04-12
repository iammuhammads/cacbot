import { setTimeout as delay } from "node:timers/promises";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { Env } from "../../config/env.js";

export interface OtpResolver {
  resolveOtp(sinceIso: string): Promise<string>;
}

export class StaticOtpResolver implements OtpResolver {
  constructor(private readonly env: Env) {}

  async resolveOtp(): Promise<string> {
    if (!this.env.CAC_STATIC_OTP) {
      throw new Error("CAC_STATIC_OTP is not configured.");
    }

    return this.env.CAC_STATIC_OTP;
  }
}

export class ImapOtpResolver implements OtpResolver {
  constructor(private readonly env: Env) {}

  async resolveOtp(sinceIso: string): Promise<string> {
    if (
      !this.env.CAC_IMAP_HOST ||
      !this.env.CAC_IMAP_USERNAME ||
      !this.env.CAC_IMAP_PASSWORD
    ) {
      throw new Error("IMAP credentials are incomplete.");
    }

    const client = new ImapFlow({
      host: this.env.CAC_IMAP_HOST,
      port: this.env.CAC_IMAP_PORT,
      secure: this.env.CAC_IMAP_SECURE,
      auth: {
        user: this.env.CAC_IMAP_USERNAME,
        pass: this.env.CAC_IMAP_PASSWORD
      }
    });

    const deadline = Date.now() + this.env.CAC_OTP_TIMEOUT_MS;
    const sinceDate = new Date(sinceIso);
    console.log(`[IMAP] Connecting to ${this.env.CAC_IMAP_HOST}...`);
    await client.connect();

    try {
      console.log(`[IMAP] Opening mailbox: ${this.env.CAC_IMAP_MAILBOX}`);
      await client.mailboxOpen(this.env.CAC_IMAP_MAILBOX);

      while (Date.now() < deadline) {
        // Fetch only the most recent 10 messages from the end of the mailbox
        const range = { from: -10 };
        console.log(`[IMAP] Fetching most recent 10 messages to check for OTP...`);
        
        for await (const message of client.fetch(range, { source: true, envelope: true })) {
          // Only check messages received after our 'sinceDate'
          const internalDate = message.internalDate;
          if (internalDate && internalDate < sinceDate) {
            continue;
          }

          if (!message.source) continue;

          const parsed = await simpleParser(message.source);
          const from = parsed.from?.text ?? "";
          const subject = parsed.subject ?? "";
          
          // Check if it matches our filters
          const matchesFrom = !this.env.CAC_IMAP_FROM_FILTER || from.toLowerCase().includes(this.env.CAC_IMAP_FROM_FILTER.toLowerCase());
          const matchesSubject = !this.env.CAC_IMAP_SUBJECT_FILTER || subject.toLowerCase().includes(this.env.CAC_IMAP_SUBJECT_FILTER.toLowerCase());

          if (matchesFrom && matchesSubject) {
            const haystack = `${subject}\n${parsed.text ?? ""}`;
            const match = haystack.match(/\b(\d{6})\b/);

            if (match?.[1]) {
              console.log(`[IMAP] Found OTP: ${match[1]}`);
              return match[1];
            }
          }
        }

        console.log(`[IMAP] No OTP found among latest messages. Retrying in 5s... (Deadline in ${Math.round((deadline - Date.now()) / 1000)}s)`);
        await delay(5000);
      }
    } finally {
      await client.logout().catch(() => undefined);
    }

    throw new Error("Timed out waiting for CAC OTP email.");
  }
}

export function createOtpResolver(env: Env): OtpResolver {
  return env.CAC_OTP_MODE === "imap" ? new ImapOtpResolver(env) : new StaticOtpResolver(env);
}
