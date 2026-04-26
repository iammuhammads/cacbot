import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { z } from "zod";
import type { Env } from "../../config/env.js";
import type { SessionRecord } from "../../types/domain.js";

export const recoveryActionSchema = z.object({
  action: z.enum(["click", "fill", "abort"]),
  selector: z.string().optional(),
  value: z.string().optional(),
  reason: z.string()
});

export type RecoveryAction = z.infer<typeof recoveryActionSchema>;

const llmRecoveryResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["action", "reason"],
  properties: {
    action: {
      type: "string",
      enum: ["click", "fill", "abort"]
    },
    selector: { type: "string" },
    value: { type: "string" },
    reason: { type: "string" }
  }
} as const;

export class RegistrationRecoveryService {
  private readonly anthropic?: Anthropic;
  private readonly openai?: OpenAI;

  constructor(private readonly env: Env) {
    if (env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    }
    if (env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    }
  }

  async processFailure(
    session: SessionRecord,
    errorText: string,
    domText: string,
    stepName: string
  ): Promise<RecoveryAction> {
    if (this.anthropic) {
      return this.processWithClaude(session, errorText, domText, stepName);
    }
    if (this.openai) {
      return this.processWithOpenAI(session, errorText, domText, stepName);
    }

    throw new Error("No AI provider configured for recovery service.");
  }

  private async processWithClaude(
    session: SessionRecord,
    errorText: string,
    domText: string,
    stepName: string
  ): Promise<RecoveryAction> {
    const client = this.anthropic;
    if (!client) throw new Error("Anthropic client not initialized.");

    const systemPrompt = [
      "You are the Exception Handler for an automated browser agent registering companies on the Nigerian Corporate Affairs Commission (CAC) portal.",
      "The underlying Playwright script has encountered a fatal execution error.",
      "Your job is to analyze the error and the provided DOM text snapshot to dictate a single recovery action to heal the browser state.",
      "If the issue is an unexpected popup, consent wall, or interactive element, return a 'click' action on its CSS selector (e.g. '.btn-close' or 'button:has-text(\"Accept\")').",
      "If you cannot determine a safe recovery action, or if it's a fatal anomaly (e.g., site maintenance, totally blank page), return 'abort'.",
      "The automation only supports basic CSS selectors. Be robust in your selector choices. DO NOT try to click structural divs, only buttons/links/checkboxes."
    ].join("\n");

    const promptContext = [
      `Step that failed: ${stepName}`,
      `Error encountered: ${errorText}`,
      `Current Workflow: ${session.collectedData.workflowType || "NEW_REGISTRATION"}`,
      `--- DOM INNER TEXT ---`,
      domText.substring(0, 10000) // cap to 10k chars to prevent context overflow from massive garbage DOMs
    ].join("\n");

    const response = await client.messages.create({
      model: this.env.ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      tools: [
        {
          name: "execute_recovery",
          description: "Execute a recovery action in the browser",
          input_schema: llmRecoveryResponseSchema as any
        }
      ],
      tool_choice: { type: "tool", name: "execute_recovery" },
      messages: [{ role: "user", content: promptContext }]
    });

    const toolUse = response.content.find((c) => c.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("Claude failed to provide a recovery structured decision.");
    }

    const payload = toolUse.input as any;
    return recoveryActionSchema.parse(payload);
  }

  private async processWithOpenAI(
    session: SessionRecord,
    errorText: string,
    domText: string,
    stepName: string
  ): Promise<RecoveryAction> {
    const client = this.openai;
    if (!client) throw new Error("OpenAI client not initialized.");

    const input = [
      {
        role: "system" as const,
        content: [
          {
            type: "text" as const,
            text: [
              "You are the Exception Handler for an automated browser agent registering companies on the Nigerian CAC portal.",
              "The underlying Playwright script has encountered a fatal execution error.",
              "Analyze the error and the provided DOM text snapshot to dictate a single recovery action to heal the browser state.",
              "If the issue is an unexpected popup or interactive element, return a 'click' action on its CSS selector.",
              "If you cannot determine a safe recovery action, return 'abort'."
            ].join(" ")
          }
        ]
      },
      {
        role: "user" as const,
        content: [
          {
            type: "text" as const,
            text: [
              `Step: ${stepName}`,
              `Error: ${errorText}`,
              `DOM Text:\n${domText.substring(0, 5000)}`
            ].join("\n")
          }
        ]
      }
    ];

    const response = await client.chat.completions.create({
      model: this.env.OPENAI_MODEL,
      messages: input.map(m => ({ role: m.role, content: m.content[0]?.text ?? "" })),
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "recovery_action",
          strict: true,
          schema: llmRecoveryResponseSchema
        }
      }
    });

    const payload = JSON.parse(response.choices[0]?.message.content ?? "{}");
    return recoveryActionSchema.parse(payload);
  }
}
