import { env } from "../src/config/env.js";
import { CacAutomationService } from "../src/services/cac/cac-automation.js";
import { createOtpResolver } from "../src/services/cac/otp-resolver.js";
import { chromium } from "playwright";

async function testLogin() {
  console.log("Starting CAC login test...");
  console.log(`Target URL: ${env.CAC_PORTAL_URL}`);
  console.log(`Email: ${env.CAC_EMAIL}`);
  console.log(`OTP Mode: ${env.CAC_OTP_MODE}`);

  if (!env.CAC_EMAIL || !env.CAC_PASSWORD) {
    console.error("ERROR: CAC_EMAIL or CAC_PASSWORD is not set in .env");
    process.exit(1);
  }

  const resolver = createOtpResolver(env);
  const mockStorage = { 
    saveFile: async () => "mock-url",
    getFileUrl: async () => "mock-url",
    deleteFile: async () => {},
    connect: async () => {} 
  } as any;
  const service = new CacAutomationService(env, resolver, mockStorage);
  const browser = await chromium.launch({ headless: env.CAC_HEADLESS });
  const page = await browser.newPage();

  try {
    // We call a private method for testing, or better, we create a wrapper
    // For this test, we'll just implement the login steps directly to observe
    // or use the service if we make it public (which it should be if we want to test)
    
    // Let's use the service's internal login logic by casting to any
    await (service as any).login(page, "test-session");
    
    console.log("Login sequence completed successfully (at least UI-wise).");
    console.log("Capturing result...");
    await page.screenshot({ path: "artifacts/test-login-result.png" });
    
  } catch (error) {
    console.error("Login failed:", error);
    await page.screenshot({ path: "artifacts/test-login-error.png" });
  } finally {
    await browser.close();
    console.log("Test finished.");
  }
}

testLogin().catch(console.error);
