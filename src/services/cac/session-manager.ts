import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import type { Env } from "../../config/env.js";

export class SessionPoolManager {
  constructor(private readonly env: Env) {}

  /**
   * Scans the storage directory and refreshes all found CAC sessions
   * to ensure cookies remain valid and avoid OTP triggers.
   */
  async refreshAllSessions(): Promise<void> {
    const dir = this.env.LOCAL_STORAGE_ROOT;
    if (!existsSync(dir)) return;

    const files = readdirSync(dir).filter(f => f.startsWith("cac-session-") && f.endsWith(".json"));
    console.log(`[session-manager] Found ${files.length} sessions to refresh.`);

    for (const file of files) {
      const filePath = path.join(dir, file);
      try {
        await this.refreshSession(filePath);
      } catch (err) {
        console.error(`[session-manager] Failed to refresh ${file}: ${String(err)}`);
      }
    }
  }

  private async refreshSession(statePath: string): Promise<void> {
    console.log(`[session-manager] Refreshing session: ${path.basename(statePath)}`);
    
    const browser = await chromium.launch({
      headless: true,
      args: ["--disable-blink-features=AutomationControlled"]
    });

    try {
      const context = await browser.newContext({
        storageState: statePath,
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
      });
      const page = await context.newPage();

      // Navigate to dashboard to extend session
      await page.goto("https://icrp.cac.gov.ng/dashboard", { 
        waitUntil: "domcontentloaded", 
        timeout: 30000 
      }).catch(() => undefined);
      
      await page.waitForTimeout(5000); // Wait for potential redirects or background pings

      const url = page.url();
      if (url.includes("/dashboard")) {
        console.log(`[session-manager] Session ${path.basename(statePath)} is still VALID. Updating cookies...`);
        await context.storageState({ path: statePath });
      } else {
        console.warn(`[session-manager] Session ${path.basename(statePath)} has EXPIRED.`);
      }
    } finally {
      await browser.close();
    }
  }

  /**
   * Orchestrates the heartbeat loop.
   */
  startHeartbeat(intervalMs = 3600000): void {
    console.log(`[session-manager] Starting background session heartbeat (every ${intervalMs / 60000} mins)`);
    
    const loop = async () => {
      try {
        await this.refreshAllSessions();
      } finally {
        setTimeout(loop, intervalMs);
      }
    };

    void loop();
  }
}
