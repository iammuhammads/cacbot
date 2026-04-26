import path from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { env } from "../src/config/env.js";
import { createClient } from "@supabase/supabase-js";

async function main() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    console.error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env to run migration.");
    process.exit(1);
  }

  const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
  const dir = path.resolve(env.LOCAL_STORAGE_ROOT, "cac-accounts");
  let files: string[] = [];
  try {
    files = await readdir(dir);
  } catch (err) {
    console.error("No local cac-accounts directory found; nothing to migrate.");
    process.exit(0);
  }

  for (const file of files) {
    if (!file.endsWith(".enc")) continue;
    const userId = decodeURIComponent(file.replace(/\.enc$/, ""));
    const blob = await readFile(path.join(dir, file), { encoding: "utf8" });
    const { error } = await client.from("cac_accounts").upsert({ user_id: userId, payload: blob });
    if (error) {
      console.error(`Failed migrating ${userId}: ${error.message}`);
    } else {
      console.log(`Migrated ${userId}`);
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
