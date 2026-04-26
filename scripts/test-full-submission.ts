import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

// Import env after we set any overrides
import { env } from "../src/config/env.js";
import { CacAutomationService } from "../src/services/cac/cac-automation.js";
import { createOtpResolver } from "../src/services/cac/otp-resolver.js";

async function testFullSubmission() {
  console.log("Starting full CAC submission test...");

  // Force headless to true for automated runs in CI/headless environments
  (env as any).CAC_HEADLESS = true;

  if (!env.CAC_EMAIL || !env.CAC_PASSWORD) {
    console.error("ERROR: CAC_EMAIL or CAC_PASSWORD is not set in .env");
    process.exit(1);
  }

  const resolver = createOtpResolver(env);
  const service = new CacAutomationService(env, resolver);

  const sessionId = `test-full-${Date.now()}`;
  const session = {
    id: sessionId,
    userId: "whatsapp:+000000000",
    provider: "mock",
    state: "READY_FOR_SUBMISSION",
    collectedData: {
      workflowType: "NEW_REGISTRATION",
      registrationType: "BUSINESS_NAME",
      businessNameOptions: [`Test Business ${Date.now()}`],
      clientName: "Test Client",
      clientEmail: env.CAC_EMAIL,
      clientPhone: env.agentPhoneNumbers?.[0] ?? "whatsapp:+000000000",
      businessActivity: "Retail Trade",
      commencementDate: new Date().toISOString().split("T")[0],
      address: { line1: "1 Test St", city: "Lagos", state: "Lagos", country: "Nigeria" },
      shareCapitalNaira: 100000,
      proprietors: [
        {
          fullName: "John Doe",
          dob: "1985-01-01",
          phone: "+2348012345678",
          idType: "National ID",
          idNumber: "NID1234567",
          nationality: "NG"
        }
      ],
      directors: [],
      trustees: [],
      documents: [],
      notes: []
    },
    history: [],
    auditTrail: [],
    lastAction: "test_full_submission",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const dir = path.resolve(env.ARTIFACTS_ROOT, sessionId);
  await mkdir(dir, { recursive: true });
  const samplePath = path.join(dir, "sample-id.txt");
  await writeFile(samplePath, "Sample ID document for automated test", { encoding: "utf8" });

  session.collectedData.documents.push({
    id: randomUUID(),
    kind: "identification",
    fileName: "sample-id.txt",
    contentType: "text/plain",
    localPath: samplePath,
    uploadedAt: new Date().toISOString()
  });

  try {
    console.log("Submitting session to CacAutomationService.startSubmission()");
    const outcome = await service.startSubmission(session as any);
    console.log("Automation outcome:", JSON.stringify(outcome, null, 2));
    console.log("Artifacts saved to:", dir);
  } catch (err) {
    console.error("Automation error:", err instanceof Error ? err.message : String(err));
    console.error(err);
  }
}

testFullSubmission().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
