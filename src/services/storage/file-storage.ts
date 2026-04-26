import { v4 as uuid } from "uuid";
import type { Env } from "../../config/env.js";
import type {
  InboundMediaAttachment,
  SessionRecord,
  UploadedDocument,
  WhatsAppProviderName
} from "../../types/domain.js";
import type { StorageProvider } from "./storage-provider.js";

function buildTwilioAuthHeader(env: Env): string | undefined {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    return undefined;
  }

  return `Basic ${Buffer.from(
    `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`
  ).toString("base64")}`;
}

function inferDocumentKind(fileName?: string, contentType?: string): string {
  const haystack = `${fileName ?? ""} ${contentType ?? ""}`.toLowerCase();
  if (haystack.includes("passport")) return "passport_photo";
  if (haystack.includes("signature") || haystack.includes("sign")) return "signature";
  if (haystack.includes("resolution") || haystack.includes("board resolution") || haystack.includes("board_resolution") || haystack.includes("board-res")) return "board_resolution";
  if (haystack.includes("annual") || haystack.includes("returns") || haystack.includes("financial") || haystack.includes("accounts") || haystack.includes("audited")) return "annual_returns";
  if (haystack.includes("certificate") || haystack.includes("cert")) return "certificate";
  if (haystack.includes("id") || haystack.includes("ident") || haystack.includes("identity")) return "means_of_identification";
  return "unclassified";
}

export class FileStorageService {
  constructor(
    private readonly env: Env,
    private readonly storage: StorageProvider
  ) {}

  private async fetchAttachment(
    provider: WhatsAppProviderName,
    media: InboundMediaAttachment
  ): Promise<ArrayBuffer> {
    if (provider === "mock") {
      return new TextEncoder().encode(media.caption ?? "").buffer;
    }

    if (provider === "twilio") {
      const auth = buildTwilioAuthHeader(this.env);
      const response = await fetch(media.url, {
        headers: auth ? { Authorization: auth } : undefined
      });
      if (!response.ok) {
        throw new Error(`Unable to download Twilio media: ${response.status}`);
      }
      return response.arrayBuffer();
    }

    if (!this.env.D360_API_KEY) {
      throw new Error("360dialog API key is required to fetch media.");
    }

    const mediaLookupResponse = await fetch(`${this.env.D360_API_BASE}/media/${media.url}`, {
      headers: {
        "D360-API-KEY": this.env.D360_API_KEY
      }
    });

    if (!mediaLookupResponse.ok) {
      throw new Error(`Unable to resolve 360dialog media: ${mediaLookupResponse.status}`);
    }

    const resolved = (await mediaLookupResponse.json()) as { url?: string };
    if (!resolved.url) {
      throw new Error("360dialog media response did not include a download URL.");
    }

    const fileResponse = await fetch(resolved.url, {
      headers: {
        "D360-API-KEY": this.env.D360_API_KEY
      }
    });

    if (!fileResponse.ok) {
      throw new Error(`Unable to download 360dialog media: ${fileResponse.status}`);
    }

    return fileResponse.arrayBuffer();
  }

  async saveInboundMedia(
    session: SessionRecord,
    media: InboundMediaAttachment[]
  ): Promise<UploadedDocument[]> {
    if (media.length === 0) {
      return [];
    }

    const storedDocuments: UploadedDocument[] = [];

    for (const attachment of media) {
      const extension = attachment.contentType.split("/")[1] ?? "bin";
      const fileName = attachment.fileName ?? `${uuid()}.${extension}`;
      
      // Path format: sessions/{sessionId}/docs/{fileName}
      const storagePath = `sessions/${session.id}/docs/${fileName}`;
      
      const payload = await this.fetchAttachment(session.provider, attachment);
      await this.storage.upload(storagePath, Buffer.from(payload), attachment.contentType);

      storedDocuments.push({
        id: uuid(),
        kind: inferDocumentKind(fileName, attachment.contentType),
        fileName,
        contentType: attachment.contentType,
        localPath: storagePath, // We now store the cloud path here
        sourceUrl: attachment.url,
        uploadedAt: new Date().toISOString()
      });
    }

    return storedDocuments;
  }
}

