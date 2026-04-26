import path from "node:path";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import crypto from "node:crypto";
import type { Env } from "../config/env.js";

export interface ICacAccountStore {
  connect(): Promise<void>;
  saveAccount(userId: string, payload: CacAccountPayload): Promise<void>;
  getAccount(userId: string): Promise<CacAccountPayload | null>;
  deleteAccount(userId: string): Promise<void>;
}

export interface CacAccountPayload {
  email: string;
  password: string;
  useProfessionalAccount?: boolean;
  consent?: boolean;
}

function deriveKey(secret: string) {
  // Derive a 32-byte key from the provided passphrase
  return crypto.scryptSync(secret, "cac-account-store", 32);
}

function encrypt(plain: string, secret: string) {
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

function decrypt(payloadB64: string, secret: string) {
  const key = deriveKey(secret);
  const buffer = Buffer.from(payloadB64, "base64");
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return out.toString("utf8");
}

export class CacAccountStore {
  private readonly dir: string;
  constructor(private readonly env: Env) {
    this.dir = path.resolve(this.env.LOCAL_STORAGE_ROOT, "cac-accounts");
  }

  async connect(): Promise<void> {
    await mkdir(this.dir, { recursive: true });
  }

  private fileFor(userId: string) {
    // sanitize userId to a safe filename
    const id = encodeURIComponent(userId);
    return path.join(this.dir, `${id}.enc`);
  }

  async saveAccount(userId: string, payload: CacAccountPayload): Promise<void> {
    if (!this.env.CREDENTIALS_ENCRYPTION_KEY) {
      throw new Error("CREDENTIALS_ENCRYPTION_KEY is not configured.");
    }
    const file = this.fileFor(userId);
    const plain = JSON.stringify(payload);
    const blob = encrypt(plain, this.env.CREDENTIALS_ENCRYPTION_KEY);
    await writeFile(file, blob, { encoding: "utf8" });
  }

  async getAccount(userId: string): Promise<CacAccountPayload | null> {
    if (!this.env.CREDENTIALS_ENCRYPTION_KEY) return null;
    const file = this.fileFor(userId);
    try {
      const blob = await readFile(file, { encoding: "utf8" });
      const plain = decrypt(blob, this.env.CREDENTIALS_ENCRYPTION_KEY);
      return JSON.parse(plain) as CacAccountPayload;
    } catch (err) {
      return null;
    }
  }

  async deleteAccount(userId: string): Promise<void> {
    const file = this.fileFor(userId);
    try {
      await rm(file);
    } catch {
      // ignore
    }
  }
}
