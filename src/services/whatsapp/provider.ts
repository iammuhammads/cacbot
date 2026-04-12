import { randomUUID } from "node:crypto";
import twilio from "twilio";
import type { Env } from "../../config/env.js";
import type {
  NormalizedInboundMessage,
  WhatsAppProviderName
} from "../../types/domain.js";

export interface WhatsAppProvider {
  readonly name: WhatsAppProviderName;
  parseInbound(
    body: unknown,
    headers: Record<string, string | string[] | undefined>
  ): Promise<NormalizedInboundMessage[]>;
  validateInboundRequest?(input: {
    body: unknown;
    headers: Record<string, string | string[] | undefined>;
    rawUrl: string;
  }): boolean;
  sendTextMessage(to: string, body: string): Promise<void>;
}

function buildAuthHeader(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

export class MockWhatsAppProvider implements WhatsAppProvider {
  readonly name = "mock" as const;

  async parseInbound(
    body: unknown,
    _headers?: Record<string, string | string[] | undefined>
  ): Promise<NormalizedInboundMessage[]> {
    const payload = (body ?? {}) as Record<string, unknown>;
    const from = String(payload.from ?? "");

    return [
      {
        provider: this.name,
        messageId: String(payload.messageId ?? randomUUID()),
        from,
        to: typeof payload.to === "string" ? payload.to : undefined,
        text: String(payload.text ?? ""),
        media: Array.isArray(payload.media)
          ? payload.media.map((item) => item as NormalizedInboundMessage["media"][number])
          : [],
        raw: body,
        timestamp: new Date().toISOString(),
        profileName: typeof payload.profileName === "string" ? payload.profileName : undefined
      }
    ];
  }

  async sendTextMessage(to: string, body: string): Promise<void> {
    console.log(`[mock-whatsapp] -> ${to}: ${body}`);
  }
}

export class TwilioWhatsAppProvider implements WhatsAppProvider {
  readonly name = "twilio" as const;
  private readonly client;

  constructor(private readonly env: Env) {
    this.client =
      env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN
        ? twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
        : undefined;
  }

  validateInboundRequest(input: {
    body: unknown;
    headers: Record<string, string | string[] | undefined>;
    rawUrl: string;
  }): boolean {
    if (!this.env.TWILIO_VALIDATE_SIGNATURE) {
      return true;
    }

    if (!this.env.TWILIO_AUTH_TOKEN) {
      throw new Error("TWILIO_AUTH_TOKEN is required for signature validation.");
    }

    const signatureHeader = input.headers["x-twilio-signature"];
    const signature = Array.isArray(signatureHeader)
      ? signatureHeader[0]
      : signatureHeader;

    if (!signature) {
      return false;
    }

    const webhookUrl =
      this.env.TWILIO_WEBHOOK_URL ??
      new URL(input.rawUrl, this.env.PUBLIC_BASE_URL).toString();

    const params = Object.fromEntries(
      Object.entries((input.body ?? {}) as Record<string, unknown>).map(([key, value]) => [
        key,
        Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "")
      ])
    );

    return twilio.validateRequest(this.env.TWILIO_AUTH_TOKEN, signature, webhookUrl, params);
  }

  async parseInbound(
    body: unknown,
    _headers?: Record<string, string | string[] | undefined>
  ): Promise<NormalizedInboundMessage[]> {
    const payload = (body ?? {}) as Record<string, string>;
    const mediaCount = Number.parseInt(payload.NumMedia ?? "0", 10);

    return [
      {
        provider: this.name,
        messageId: payload.MessageSid ?? randomUUID(),
        from: payload.From ?? "",
        to: payload.To,
        text: payload.Body ?? "",
        media: Array.from({ length: Number.isNaN(mediaCount) ? 0 : mediaCount }).map(
          (_, index) => ({
            url: payload[`MediaUrl${index}`] ?? "",
            contentType: payload[`MediaContentType${index}`] ?? "application/octet-stream",
            fileName: payload[`MediaFileName${index}`] ?? `media-${index}`
          })
        ),
        raw: body,
        timestamp: new Date().toISOString(),
        profileName: payload.ProfileName
      }
    ];
  }

  async sendTextMessage(to: string, body: string): Promise<void> {
    if (this.env.TWILIO_DISABLE_OUTBOUND) {
      console.log(`[twilio-disabled] -> ${to}: ${body}`);
      return;
    }

    if (!this.client || !this.env.TWILIO_WHATSAPP_FROM) {
      throw new Error("Twilio credentials are missing.");
    }

    await this.client.messages.create({
      from: this.env.TWILIO_WHATSAPP_FROM,
      to,
      body
    });
  }
}

export class Dialog360WhatsAppProvider implements WhatsAppProvider {
  readonly name = "360dialog" as const;

  constructor(private readonly env: Env) {}

  async parseInbound(
    body: unknown,
    _headers?: Record<string, string | string[] | undefined>
  ): Promise<NormalizedInboundMessage[]> {
    const payload = (body ?? {}) as Record<string, unknown>;
    const entries = Array.isArray(payload.entry) ? payload.entry : [];
    const messages: NormalizedInboundMessage[] = [];

    for (const entry of entries) {
      const changes = Array.isArray((entry as Record<string, unknown>).changes)
        ? ((entry as Record<string, unknown>).changes as Record<string, unknown>[])
        : [];

      for (const change of changes) {
        const value = ((change.value as Record<string, unknown>) ?? {}) as Record<
          string,
          unknown
        >;
        const contacts = Array.isArray(value.contacts)
          ? (value.contacts as Record<string, unknown>[])
          : [];
        const inbound = Array.isArray(value.messages)
          ? (value.messages as Record<string, unknown>[])
          : [];

        for (const message of inbound) {
          const image = message.image as Record<string, unknown> | undefined;
          const document = message.document as Record<string, unknown> | undefined;
          const text = (message.text as Record<string, unknown> | undefined)?.body;
          const senderProfile = contacts[0]?.profile as Record<string, unknown> | undefined;

          messages.push({
            provider: this.name,
            messageId: String(message.id ?? randomUUID()),
            from: String(message.from ?? ""),
            text: typeof text === "string" ? text : "",
            media: [image, document]
              .filter(Boolean)
              .map((media) => ({
                url: String((media as Record<string, unknown>).id ?? ""),
                contentType: String(
                  (media as Record<string, unknown>).mime_type ?? "application/octet-stream"
                ),
                fileName: typeof (media as Record<string, unknown>).filename === "string"
                  ? String((media as Record<string, unknown>).filename)
                  : undefined
              })),
            raw: message,
            timestamp: new Date().toISOString(),
            profileName:
              typeof senderProfile?.name === "string" ? String(senderProfile.name) : undefined
          });
        }
      }
    }

    return messages;
  }

  async sendTextMessage(to: string, body: string): Promise<void> {
    if (!this.env.D360_API_KEY || !this.env.D360_PHONE_NUMBER_ID) {
      throw new Error("360dialog credentials are missing.");
    }

    const response = await fetch(
      `${this.env.D360_API_BASE}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "D360-API-KEY": this.env.D360_API_KEY
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to.replace("whatsapp:", ""),
          type: "text",
          text: {
            body
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`360dialog send failed with status ${response.status}.`);
    }
  }
}

export function createWhatsAppProvider(env: Env): WhatsAppProvider {
  switch (env.whatsappProvider) {
    case "twilio":
      return new TwilioWhatsAppProvider(env);
    case "360dialog":
      return new Dialog360WhatsAppProvider(env);
    default:
      return new MockWhatsAppProvider();
  }
}
