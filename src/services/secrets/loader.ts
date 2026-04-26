import type { Env } from "../../config/env.js";

async function tryVaultFetch(base: string, token: string, key: string): Promise<string | undefined> {
  const kvV2 = `${base.replace(/\/$/, "")}/v1/secret/data/${encodeURIComponent(key)}`;
  try {
    const res = await (globalThis as any).fetch(kvV2, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const j = await res.json().catch(() => null) as any;
      const candidate = j?.data?.data?.value ?? j?.data?.data?.secret ?? Object.values(j?.data?.data ?? {})[0];
      if (typeof candidate === 'string' && candidate.length > 0) return candidate;
    }
  } catch {}

  try {
    const v1 = `${base.replace(/\/$/, "")}/v1/secret/${encodeURIComponent(key)}`;
    const res2 = await (globalThis as any).fetch(v1, { headers: { Authorization: `Bearer ${token}` } });
    if (res2.ok) {
      const j2 = await res2.json().catch(() => null) as any;
      const candidate = j2?.data?.value ?? j2?.data;
      if (typeof candidate === 'string' && candidate.length > 0) return candidate;
      if (typeof candidate === 'object') return JSON.stringify(candidate);
    }
  } catch {}

  return undefined;
}

export async function loadSecrets(env: Env): Promise<Record<string, string>> {
  if (env.SECRETS_BACKEND !== 'vault') return {};
  if (!env.VAULT_ADDR || !env.VAULT_TOKEN) return {};

  const keys = [
    'CREDENTIALS_ENCRYPTION_KEY'
  ];

  const out: Record<string, string> = {};
  for (const k of keys) {
    try {
      const v = await tryVaultFetch(env.VAULT_ADDR, env.VAULT_TOKEN, k);
      if (v) out[k] = v;
    } catch (err) {
      // ignore
    }
  }

  return out;
}
