import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../src/config/env.js";

async function migrate(dryRun = true) {
  console.log("Starting migration from local cac-account files to Supabase...");

  if (!env.CREDENTIALS_ENCRYPTION_KEY) {
    console.error("CREDENTIALS_ENCRYPTION_KEY is required in .env to decrypt local accounts.");
    process.exit(1);
  }

  // Dynamically import local and supabase stores
  const { CacAccountStore } = await import("../src/repositories/cac-account-store.js");
  const { SupabaseCacAccountStore } = await import("../src/repositories/supabase-cac-account-store.js");

  const local = new CacAccountStore(env as any);
  await local.connect();

  const supabase = new SupabaseCacAccountStore(env as any);
  await supabase.connect();

  const dir = path.resolve(env.LOCAL_STORAGE_ROOT, "cac-accounts");
  let names: string[] = [];
  try {
    names = await fs.readdir(dir);
  } catch (err) {
    console.error("Could not read local cac-accounts directory:", String(err));
    process.exit(1);
  }

  for (const file of names) {
    if (!file.endsWith(".enc")) continue;
    const encoded = file.replace(/\.enc$/, "");
    const userId = decodeURIComponent(encoded);
    try {
      const account = await local.getAccount(userId);
      if (!account) {
        console.warn(`No decrypted payload for ${userId}, skipping.`);
        continue;
      }

      console.log(`Migrating account for ${userId} -> ${account.email}`);
      if (!dryRun) {
        await supabase.saveAccount(userId, account as any);
        // Optionally remove local copy
        // await local.deleteAccount(userId);
      }
    } catch (err) {
      console.error(`Failed to migrate ${userId}:`, String(err));
    }
  }

  console.log("Migration complete.", dryRun ? "(dry-run)" : "(committed)");
}

const args = process.argv.slice(2);
const dry = !(args.includes("--apply") || args.includes("apply"));
migrate(dry).catch((err) => { console.error(err); process.exit(1); });
