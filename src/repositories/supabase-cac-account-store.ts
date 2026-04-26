import type { Env } from "../config/env.js";
import type { CacAccountPayload } from "./cac-account-store.js";
import crypto from "node:crypto";

export class SupabaseCacAccountStore {
  private client: any;

  constructor(private readonly env: Env) {}

  async connect(): Promise<void> {
    if (!this.env.SUPABASE_URL || !this.env.SUPABASE_SERVICE_KEY) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set to use SupabaseCacAccountStore");
    }
    const supabase = await import("@supabase/supabase-js");
    this.client = supabase.createClient(this.env.SUPABASE_URL, this.env.SUPABASE_SERVICE_KEY);
  }

  private deriveKey(secret: string) {
    return crypto.scryptSync(secret, "cac-account-store", 32);
  }

  private encrypt(plain: string, secret: string) {
    const key = this.deriveKey(secret);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString("base64");
  }

  private decrypt(payloadB64: string, secret: string) {
    const key = this.deriveKey(secret);
    const buffer = Buffer.from(payloadB64, "base64");
    const iv = buffer.subarray(0, 12);
    const tag = buffer.subarray(12, 28);
    const encrypted = buffer.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const out = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return out.toString("utf8");
  }

  async saveAccount(userId: string, payload: CacAccountPayload): Promise<void> {
    if (!this.env.CREDENTIALS_ENCRYPTION_KEY) {
      throw new Error("CREDENTIALS_ENCRYPTION_KEY is not configured.");
    }
    const blob = this.encrypt(JSON.stringify(payload), this.env.CREDENTIALS_ENCRYPTION_KEY);
    await this.client.from("cac_accounts").upsert([{ user_id: userId, payload: blob }], { onConflict: "user_id" });
  }

  async getAccount(userId: string): Promise<CacAccountPayload | null> {
    if (!this.env.CREDENTIALS_ENCRYPTION_KEY) return null;
    const resp = await this.client.from("cac_accounts").select("payload").eq("user_id", userId).maybeSingle();
    const data = resp?.data ?? resp;
    const payload = data && data.payload ? data.payload : null;
    if (!payload) return null;
    try {
      const plain = this.decrypt(payload, this.env.CREDENTIALS_ENCRYPTION_KEY);
      return JSON.parse(plain) as CacAccountPayload;
    } catch {
      return null;
    }
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.client.from("cac_accounts").delete().eq("user_id", userId);
  }
}
