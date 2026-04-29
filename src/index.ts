import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { assertRuntimeConfig } from "./config/runtime-checks.js";

async function main() {
  assertRuntimeConfig(env);
  const app = await buildApp(env);
  const address = await app.listen({
    host: "0.0.0.0",
    port: env.PORT
  });
  console.log(`[server] 🚀 CAC Bot is live at ${address}`);
  console.log(`[server] Webhook endpoint: ${address}/webhooks/whatsapp`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
