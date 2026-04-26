import { env } from "../src/config/env.js";

async function main() {
  const base = process.env.PUBLIC_BASE_URL ?? env.PUBLIC_BASE_URL;
  console.log('Running smoke checks against', `${base}/health`);

  try {
    const res = await (globalThis as any).fetch(`${base}/health`, { method: 'GET' });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error('Health check failed:', res.status, txt);
      process.exit(2);
    }
    const json = await res.json().catch(() => null);
    console.log('Health OK:', json);
  } catch (err) {
    console.error('Health check error:', err);
    process.exit(2);
  }

  try {
    const cfg = await (globalThis as any).fetch(`${base}/health/config`);
    if (cfg.ok) {
      const cfgText = await cfg.text().catch(() => '');
      console.log('/health/config:', cfgText);
    } else {
      console.warn('/health/config returned', cfg.status);
    }
  } catch (err) {
    console.warn('Config check failed', err);
  }

  if (process.env.RUN_PLAYWRIGHT === '1') {
    try {
      const { spawnSync } = await import('child_process');
      const r = spawnSync('npx', ['playwright', 'test', '--forbid-only', '--reporter=list'], { stdio: 'inherit' });
      process.exit(r.status ?? 1);
    } catch (err) {
      console.error('Failed to run Playwright:', err);
      process.exit(3);
    }
  }

  console.log('Smoke checks completed.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Smoke harness error:', err);
  process.exit(2);
});
