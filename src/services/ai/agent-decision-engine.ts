import Anthropic from "@anthropic-ai/sdk";
import type { Env } from "../../config/env.js";
import type { SessionRecord } from "../../types/domain.js";

export interface ADLResponse {
  action: "ASK" | "PROCEED" | "RETRY" | "ESCALATE" | "PAUSE";
  reasoning: string;
  confidence: number;
}

const adlResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["action", "reasoning", "confidence"],
  properties: {
    action: {
      type: "string",
      enum: ["ASK", "PROCEED", "RETRY", "ESCALATE", "PAUSE"]
    },
    reasoning: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 }
  }
} as const;

export class AgentDecisionEngine {
  private readonly anthropic: Anthropic;

  constructor(private readonly env: Env) {
    this.anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }

  async decide(
    session: SessionRecord,
    context: {
      event: string;
      error?: string;
      domSnapshot?: string;
    }
  ): Promise<ADLResponse> {
    const systemPrompt = `You are the Agentic Decision Layer (ADL) for a CAC Registration System.
Your job is to analyze the current session state, execution plan, and event context to decide the next meta-action.

### 🎯 GOAL
Complete CAC registration successfully.

### 🛠️ ACTIONS
- ASK: Need more info from the user.
- PROCEED: Everything looks good, continue with the plan.
- RETRY: A temporary failure occurred, try the current step again.
- ESCALATE: Hit a wall that requires human intervention.
- PAUSE: Wait for an external event (like payment).

### 📏 RULES
- Be decisive.
- If confidence is low, prefer ASK or ESCALATE.
- Do NOT repeat failed strategies.
- Use reasoning to explain WHY you chose the action.`;

    const promptContext = [
      `Event: ${context.event}`,
      `Error: ${context.error || "None"}`,
      `Session State: ${session.state}`,
      `Plan Progress: Step ${session.plan.currentStepIndex + 1}/${session.plan.steps.length}`,
      `Current Subgoal: ${session.plan.steps[session.plan.currentStepIndex]?.label || "N/A"}`,
      `Data Collected: ${JSON.stringify(session.collectedData, (k, v) => (k === "documents" ? undefined : v))}`,
      context.domSnapshot ? `--- DOM SNAPSHOT ---\n${context.domSnapshot.substring(0, 5000)}` : ""
    ].join("\n");

    const response = await this.anthropic.messages.create({
      model: this.env.ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      tools: [
        {
          name: "record_decision",
          description: "Record the agentic decision.",
          input_schema: adlResponseSchema as any
        }
      ],
      tool_choice: { type: "tool", name: "record_decision" },
      messages: [{ role: "user", content: promptContext }]
    });

    const toolUse = response.content.find((c) => c.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("ADL failed to provide a structured decision.");
    }

    return toolUse.input as ADLResponse;
  }
}
