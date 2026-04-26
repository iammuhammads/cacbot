import type { Env } from "../../config/env.js";
import type { StorageProvider } from "./storage-provider.js";

export class SupabaseStorageProvider implements StorageProvider {
  private client: any;
  private readonly bucketName = "cac-automation-files";

  constructor(private readonly env: Env) {}

  async connect(): Promise<void> {
    if (!this.env.SUPABASE_URL || !this.env.SUPABASE_SERVICE_KEY) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY are required for SupabaseStorageProvider.");
    }
    const { createClient } = await import("@supabase/supabase-js");
    this.client = createClient(this.env.SUPABASE_URL, this.env.SUPABASE_SERVICE_KEY);
  }

  async upload(path: string, content: Buffer | string, contentType?: string): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucketName)
      .upload(path, content, {
        contentType,
        upsert: true
      });

    if (error) throw error;
    return data.path;
  }

  async download(path: string): Promise<Buffer> {
    const { data, error } = await this.client.storage
      .from(this.bucketName)
      .download(path);

    if (error) throw error;
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async delete(path: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucketName)
      .remove([path]);

    if (error) throw error;
  }

  async getPublicUrl(path: string): Promise<string> {
    const { data } = this.client.storage
      .from(this.bucketName)
      .getPublicUrl(path);
      
    return data.publicUrl;
  }
}
