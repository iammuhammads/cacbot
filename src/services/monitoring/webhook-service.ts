import { env } from "../../config/env.js";

export interface WebhookPayload {
  event: string;
  sessionId: string;
  userId: string;
  oldState: string;
  newState: string;
  data: any;
  timestamp: string;
}

export class WebhookService {
  private webhookUrl: string | null = null;

  constructor() {
    // In a real multi-tenant app, this would come from the database per-user.
    // For now, we'll use an env var or a default.
    this.webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL || null;
  }

  async notify(payload: WebhookPayload): Promise<void> {
    if (!this.webhookUrl) return;

    try {
      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Asbestos-Signature": "tbd" // Future: Add HMAC signature
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.warn(`[webhook] Delivery failed for ${payload.sessionId}: ${response.statusText}`);
      }
    } catch (err) {
      console.error(`[webhook] Error delivering to ${this.webhookUrl}:`, err);
    }
  }
}
