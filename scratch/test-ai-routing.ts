import { RegistrationIntakeService } from "../src/services/ai/intake-service.js";
import { env } from "../src/config/env.js";
import { EMPTY_REGISTRATION_DATA } from "../src/types/domain.js";
import { randomUUID } from "node:crypto";

async function test() {
  console.log("--- AI ROUTING TEST ---");
  console.log("Anthropic Key Prefix:", env.ANTHROPIC_API_KEY?.substring(0, 10));
  console.log("Anthropic Model:", env.ANTHROPIC_MODEL);
  
  const intake = new RegistrationIntakeService(env);
  
  const mockSession = {
    id: randomUUID(),
    userId: "whatsapp:+2348000000000",
    state: "COLLECTING_DATA" as any,
    collectedData: { 
      ...EMPTY_REGISTRATION_DATA,
      registrationType: "COMPANY" as any
    },
    history: [],
    auditTrail: [],
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    behavioralContext: {
        mode: "CONVERSATIONAL" as any,
        lastActivityAt: new Date().toISOString(),
        questionAttempts: {},
        userConfusionScore: 0,
        fieldIntegrity: {}
    },
    plan: { currentStepIndex: 1, steps: [] }
  };

  console.log("\n[Test 1] Simple Joke Request (Conversational)");
  try {
    const decision = await intake.processTurn(mockSession as any, "tell me a joke please");
    console.log("Decision Intent:", decision.intent);
    console.log("Decision Reply:", decision.reply);
    console.log("Summary:", decision.summary);
    
    if (decision.summary?.includes("Heuristic fallback")) {
        console.error("❌ FAILED: Fell back to heuristics!");
    } else {
        console.log("✅ SUCCESS: AI responded.");
    }
  } catch (err) {
    console.error("❌ CRITICAL ERROR:", err);
  }
}

test().catch(console.error);
