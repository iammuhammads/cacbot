import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { env } from "../../config/env.js";

export interface ApiKeyRecord {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  scopes: string[];
}

export class ApiKeyService {
  private client: any;

  constructor() {
    this.client = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_KEY!);
  }

  async createKey(userId: string, name: string): Promise<{ id: string; key: string }> {
    const rawKey = randomBytes(32).toString("hex");
    const keyPrefix = "asb_live_";
    const fullKey = `${keyPrefix}${rawKey}`;
    const keyHash = this.hashKey(fullKey);

    const { data, error } = await this.client
      .from("api_keys")
      .insert({
        user_id: userId,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        name: name,
        scopes: ["registration:read", "registration:write"]
      })
      .select("id")
      .single();

    if (error) throw error;

    return { id: data.id, key: fullKey };
  }

  async listKeys(userId: string): Promise<ApiKeyRecord[]> {
    const { data, error } = await this.client
      .from("api_keys")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      keyPrefix: row.key_prefix,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
      scopes: row.scopes
    }));
  }

  async deleteKey(userId: string, keyId: string): Promise<boolean> {
    const { error } = await this.client
      .from("api_keys")
      .delete()
      .eq("id", keyId)
      .eq("user_id", userId);

    return !error;
  }

  async validateKey(fullKey: string): Promise<string | null> {
    const keyHash = this.hashKey(fullKey);

    const { data, error } = await this.client
      .from("api_keys")
      .select("user_id")
      .eq("key_hash", keyHash)
      .single();

    if (error || !data) return null;

    // Update last used at
    await this.client
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("key_hash", keyHash);

    return data.user_id;
  }

  private hashKey(key: string): string {
    return createHash("sha256").update(key).digest("hex");
  }
}
