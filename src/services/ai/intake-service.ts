import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { z } from "zod";
import type { Env } from "../../config/env.js";
import type {
  IntakeDecision,
  RegistrationData,
  RegistrationType,
  SessionRecord
} from "../../types/domain.js";
import { getNextPromptTargets, validateRegistrationData } from "../../utils/validation.js";

const registrationTypeSchema = z
  .enum(["BUSINESS_NAME", "COMPANY", "INCORPORATED_TRUSTEES", "OTHER"])
  .optional();

const addressSchema = z
  .object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    lga: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional()
  })
  .optional();

const personSchema = z.object({
  fullName: z.string().optional(),
  dob: z.string().optional(),
  nationality: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  residentialAddress: addressSchema,
  idType: z.string().optional(),
  idNumber: z.string().optional(),
  role: z.string().optional()
});

const workflowTypeSchema = z
  .enum([
    "NEW_REGISTRATION",
    "CHANGE_NAME",
    "CHANGE_DIRECTORS",
    "CHANGE_SHARES",
    "CHANGE_ADDRESS",
    "CHANGE_ACTIVITY",
    "ANNUAL_RETURNS"
  ])
  .optional();

const postIncDataSchema = z
  .object({
    existingRcNumber: z.string().optional(),
    existingName: z.string().optional(),
    changeDetails: z.string().optional(),
    proposedNames: z.array(z.string()).optional(),
    newDirectors: z.array(personSchema).optional(),
    removedDirectorNames: z.array(z.string()).optional()
  })
  .optional();

const candidateDataSchema = z.object({
  workflowType: workflowTypeSchema,
  registrationType: registrationTypeSchema,
  registrationSubtype: z.string().optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().optional(),
  clientPhone: z.string().optional(),
  businessNameOptions: z.array(z.string()).optional(),
  businessActivity: z.string().optional(),
  specificBusinessActivity: z.string().optional(),
  commencementDate: z.string().optional(),
  address: addressSchema,
  shareCapitalNaira: z.number().optional(),
  proprietors: z.array(personSchema).optional(),
  directors: z.array(personSchema).optional(),
  trustees: z.array(personSchema).optional(),
  postIncData: postIncDataSchema,
  notes: z.array(z.string()).optional()
});

const llmDecisionSchema = z.object({
  intent: z.enum(["GREETING", "CAC_INTENT", "DATA_INPUT", "CONFUSION", "IRRELEVANT"]),
  suggestedMode: z.enum(["CONVERSATIONAL", "GUIDED", "STRICT"]).optional(),
  userBehaviorProfile: z.string().optional(),
  fieldConfidence: z.record(z.number()),
  reply: z.string().min(1),
  candidateData: candidateDataSchema,
  missingFields: z.array(z.string()),
  readyForSubmission: z.boolean(),
  stateSuggestion: z.enum([
    "COLLECTING_DATA",
    "READY_FOR_SUBMISSION",
    "MANUAL_REVIEW",
    "ERROR"
  ]),
  needsHuman: z.boolean(),
  confidence: z.number().min(0).max(1),
  summary: z.string().optional()
});

const llmResponseJsonSchema = {
  type: "object",
  required: ["intent", "fieldConfidence", "reply", "candidateData", "missingFields", "readyForSubmission", "stateSuggestion", "needsHuman", "confidence"],
  properties: {
    intent: {
      type: "string",
      enum: ["GREETING", "CAC_INTENT", "DATA_INPUT", "CONFUSION", "IRRELEVANT"]
    },
    suggestedMode: {
      type: "string",
      enum: ["CONVERSATIONAL", "GUIDED", "STRICT"]
    },
    userBehaviorProfile: { type: "string" },
    fieldConfidence: {
      type: "object",
      additionalProperties: { type: "number", minimum: 0, maximum: 1 }
    },
    reply: { type: "string" },
    candidateData: {
      type: "object",
      additionalProperties: false,
      properties: {
        workflowType: {
          type: ["string", "null"],
          enum: [
            "NEW_REGISTRATION",
            "CHANGE_NAME",
            "CHANGE_DIRECTORS",
            "CHANGE_SHARES",
            "CHANGE_ADDRESS",
            "CHANGE_ACTIVITY",
            "ANNUAL_RETURNS",
            null
          ]
        },
        registrationType: {
          type: ["string", "null"],
          enum: ["BUSINESS_NAME", "COMPANY", "INCORPORATED_TRUSTEES", "OTHER", null]
        },
        registrationSubtype: { type: ["string", "null"] },
        clientName: { type: ["string", "null"] },
        clientEmail: { type: ["string", "null"] },
        clientPhone: { type: ["string", "null"] },
        businessNameOptions: {
          type: ["array", "null"],
          items: { type: "string" }
        },
        businessActivity: { type: ["string", "null"] },
        specificBusinessActivity: { type: ["string", "null"] },
        commencementDate: { type: ["string", "null"] },
        address: {
          type: ["object", "null"],
          additionalProperties: false,
          properties: {
            line1: { type: ["string", "null"] },
            line2: { type: ["string", "null"] },
            city: { type: ["string", "null"] },
            lga: { type: ["string", "null"] },
            state: { type: ["string", "null"] },
            country: { type: ["string", "null"] }
          }
        },
        shareCapitalNaira: { type: ["number", "null"] },
        proprietors: {
          type: ["array", "null"],
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              fullName: { type: ["string", "null"] },
              dob: { type: ["string", "null"] },
              nationality: { type: ["string", "null"] },
              email: { type: ["string", "null"] },
              phone: { type: ["string", "null"] },
              residentialAddress: {
                type: ["object", "null"],
                additionalProperties: false,
                properties: {
                  line1: { type: ["string", "null"] },
                  line2: { type: ["string", "null"] },
                  city: { type: ["string", "null"] },
                  lga: { type: ["string", "null"] },
                  state: { type: ["string", "null"] },
                  country: { type: ["string", "null"] }
                }
              },
              idType: { type: ["string", "null"] },
              idNumber: { type: ["string", "null"] },
              role: { type: ["string", "null"] }
            }
          }
        },
        directors: {
          type: ["array", "null"],
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              fullName: { type: ["string", "null"] },
              dob: { type: ["string", "null"] },
              nationality: { type: ["string", "null"] },
              email: { type: ["string", "null"] },
              phone: { type: ["string", "null"] },
              residentialAddress: {
                type: ["object", "null"],
                additionalProperties: false,
                properties: {
                  line1: { type: ["string", "null"] },
                  line2: { type: ["string", "null"] },
                  city: { type: ["string", "null"] },
                  lga: { type: ["string", "null"] },
                  state: { type: ["string", "null"] },
                  country: { type: ["string", "null"] }
                }
              },
              idType: { type: ["string", "null"] },
              idNumber: { type: ["string", "null"] },
              role: { type: ["string", "null"] }
            }
          }
        },
        trustees: {
          type: ["array", "null"],
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              fullName: { type: ["string", "null"] },
              dob: { type: ["string", "null"] },
              nationality: { type: ["string", "null"] },
              email: { type: ["string", "null"] },
              phone: { type: ["string", "null"] },
              residentialAddress: {
                type: ["object", "null"],
                additionalProperties: false,
                properties: {
                  line1: { type: ["string", "null"] },
                  line2: { type: ["string", "null"] },
                  city: { type: ["string", "null"] },
                  lga: { type: ["string", "null"] },
                  state: { type: ["string", "null"] },
                  country: { type: ["string", "null"] }
                }
              },
              idType: { type: ["string", "null"] },
              idNumber: { type: ["string", "null"] },
              role: { type: ["string", "null"] }
            }
          }
        },
        notes: {
          type: ["array", "null"],
          items: { type: "string" }
        },
        postIncData: {
          type: ["object", "null"],
          additionalProperties: false,
          properties: {
            existingRcNumber: { type: ["string", "null"] },
            existingName: { type: ["string", "null"] },
            changeDetails: { type: ["string", "null"] },
            proposedNames: {
              type: ["array", "null"],
              items: { type: "string" }
            },
            newDirectors: {
              type: ["array", "null"],
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  fullName: { type: ["string", "null"] },
                  dob: { type: ["string", "null"] },
                  nationality: { type: ["string", "null"] },
                  email: { type: ["string", "null"] },
                  phone: { type: ["string", "null"] },
                  residentialAddress: {
                    type: ["object", "null"],
                    additionalProperties: false,
                    properties: {
                      line1: { type: ["string", "null"] },
                      line2: { type: ["string", "null"] },
                      city: { type: ["string", "null"] },
                      lga: { type: ["string", "null"] },
                      state: { type: ["string", "null"] },
                      country: { type: ["string", "null"] }
                    }
                  },
                  idType: { type: ["string", "null"] },
                  idNumber: { type: ["string", "null"] },
                  role: { type: ["string", "null"] }
                }
              }
            },
            removedDirectorNames: {
              type: ["array", "null"],
              items: { type: "string" }
            }
          }
        }
      }
    },
    missingFields: {
      type: "array",
      items: { type: "string" }
    },
    readyForSubmission: { type: "boolean" },
    stateSuggestion: {
      type: "string",
      enum: ["COLLECTING_DATA", "READY_FOR_SUBMISSION", "MANUAL_REVIEW", "ERROR"]
    },
    needsHuman: { type: "boolean" },
    confidence: { type: "number" },
    summary: { type: "string" }
  }
} as const;

function compact<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function detectRegistrationType(text: string): RegistrationType | undefined {
  const lower = text.toLowerCase();
  if (lower.includes("business name") || /\bbn\b/.test(lower)) return "BUSINESS_NAME";
  if (lower.includes("company") || lower.includes("limited") || lower.includes("rc")) {
    return "COMPANY";
  }
  if (lower.includes("trustee") || /\bit\b/.test(lower)) {
    return "INCORPORATED_TRUSTEES";
  }
  return undefined;
}

function extractEmail(text: string): string | undefined {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0];
}

function extractPhone(text: string): string | undefined {
  const match = text.match(/(\+234\d{10}|0\d{10})/);
  return match?.[0];
}

function extractIsoDate(text: string): string | undefined {
  const match = text.match(/\b\d{4}-\d{2}-\d{2}\b/);
  return match?.[0];
}

function extractBusinessNames(text: string): string[] {
  return text
    .split(/\n|,/)
    .map((value) => value.trim())
    .filter((value) => value.length > 2)
    .slice(0, 3);
}

function describeMissingTargets(missingFields: string[]): string {
  const [first, second] = getNextPromptTargets(missingFields);
  if (first && second) {
    return `${first} and ${second}`;
  }
  return first ?? "the remaining required details";
}

export class RegistrationIntakeService {
  private readonly openai?: OpenAI;
  private readonly anthropic?: Anthropic;

  constructor(private readonly env: Env) {
    console.log("[AI] Initializing Intake Service...");
    if (env.ANTHROPIC_API_KEY) {
      console.log("[AI] Anthropic Key Detected. Initializing Claude...");
      this.anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    } else {
      console.warn("[AI] WARNING: ANTHROPIC_API_KEY is missing!");
    }
    
    if (env.OPENAI_API_KEY) {
      console.log("[AI] OpenAI Key Detected. Initializing GPT-4o...");
      this.openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    }
  }

  async processTurn(
    session: SessionRecord,
    inboundText: string,
    profileName?: string
  ): Promise<IntakeDecision> {
    try {
      if (this.anthropic) {
        return await this.processWithClaude(session, inboundText, profileName);
      }
    } catch (err) {
      console.error("[AI] Anthropic failed, trying fallback...", err);
    }

    if (this.openai) {
      return this.processWithOpenAI(session, inboundText, profileName);
    }

    return this.processHeuristically(session, inboundText, profileName);
  }

  private async processWithOpenAI(
    session: SessionRecord,
    inboundText: string,
    profileName?: string
  ): Promise<IntakeDecision> {
    const client = this.openai;
    if (!client) {
      return this.processHeuristically(session, inboundText, profileName);
    }

    const validation = validateRegistrationData(session.collectedData);
    const recentTurns = session.history.slice(-12).map((turn) => ({
      role: turn.role,
      text: turn.text,
      timestamp: turn.timestamp
    }));

    const input = [
      {
        role: "system" as const,
        content: [
          {
            type: "input_text" as const,
            text: [
              "You are Mr. Chinedu, a human-sounding senior registration operations agent at TerraNile Ltd for Nigerian business filings.",
              "Behave professionally, warmly, and efficiently. Talk like a real person, not a chatbot.",
              "If the user says 'hi' or greets you, greet them back warmly (e.g. 'Hello! How can I help you today?') before proceeding.",
              "Ask no more than two questions at a time.",
              "You must maintain the intake context and progressively complete a registration dossier.",
              "Supported registrationType values are BUSINESS_NAME, COMPANY, INCORPORATED_TRUSTEES, OTHER.",
              "Normalize all dates to YYYY-MM-DD whenever the client gives a full date.",
              "When information is missing or inconsistent, ask follow-up questions in plain English.",
                "Do not say the workflow is complete unless the dossier is genuinely ready for submission.",
                "If the user intends to MODIFY an existing registration (for example: change address, change directors, change company name, change shares, change activity, or file annual returns), set the `workflowType` to one of: CHANGE_ADDRESS, CHANGE_DIRECTORS, CHANGE_NAME, CHANGE_SHARES, CHANGE_ACTIVITY, ANNUAL_RETURNS and populate `postIncData` with any extracted details (especially `existingRcNumber` and `existingName`). If it's a new registration, set `workflowType` to NEW_REGISTRATION. For change workflows, ask for the RC number first if missing, then request one additional required piece of information at a time."
            ].join(" ")
          }
        ]
      },
      {
        role: "user" as const,
        content: [
          {
            type: "input_text" as const,
            text: JSON.stringify(
              {
                clientProfileName: profileName,
                currentState: session.state,
                currentCollectedData: session.collectedData,
                recentTurns,
                latestInboundText: inboundText,
                validation
              },
              null,
              2
            )
          }
        ]
      }
    ];

    const response = await client.responses.create({
      model: this.env.OPENAI_MODEL,
      input,
      text: {
        format: {
          type: "json_schema",
          name: "cac_intake_turn",
          strict: true,
          schema: llmResponseJsonSchema
        }
      }
    });

    const payload = JSON.parse(response.output_text);
    const parsed = llmDecisionSchema.parse(payload);

    return {
      ...parsed,
      candidateData: compact(parsed.candidateData)
    };
  }

  private async processWithClaude(
    session: SessionRecord,
    inboundText: string,
    profileName?: string
  ): Promise<IntakeDecision> {
    const client = this.anthropic;
    if (!client) throw new Error("Anthropic client not initialized.");
    
    console.log(`[AI] Processing turn with model: "${this.env.ANTHROPIC_MODEL}"`);

    const validation = validateRegistrationData(session.collectedData);
    const recentTurns = session.history.slice(-10).map((turn) => ({
      role: turn.role === "client" ? "user" : "assistant",
      content: turn.text
    }));

    const systemPrompt = `You are Mr. Chinedu, a Senior Corporate Legal Partner at TerraNile. You manage the conversation with authority and empathy.

### 🎭 ADAPTIVE INTERACTION MODES
- **CONVERSATIONAL** (Default): Warm, professional, natural dialogue.
- **GUIDED**: User is confused. Use numbered options, direct buttons, and simpler language.
- **STRICT**: Only accept the specific data requested. Minimal social fluff.

You can suggest a mode switch in your JSON output if you detect high friction or if the user asks for more guidance.

### 🧠 CONVERSATION STRATEGY ENGINE
For every message, you MUST:
1. **Classify Intent**: GREETING, CAC_INTENT, DATA_INPUT, CONFUSION, or IRRELEVANT.
2. **Apply Behavioral Rules**:
   - **GREETING**: Acknowledge warmly ("Got you.", "Perfect.") then guide back to the missing fields.
   - **CONFUSION**: If the user seems lost, stop asking for data. Offer simpler choices or explain the process.
   - **IRRELEVANT**: Acknowledge briefly and redirect: "I hear you. But to keep our filing moving, I still need..."
   - **DATA_INPUT**: Acknowledge the info was saved before asking the next thing.

3. **Strategy Adaptation**:
   - Look at the "Attempts" for the current missing fields.
   - **Attempt 1**: Ask naturally.
   - **Attempt 2**: Rephrase simply.
   - **Attempt 3+**: Switch to guided options (e.g., "Reply 1 for LTD, 2 for Business Name").
   - **NEVER** repeat the same question twice in similar wording.

### 📋 GOAL
Collect: Registration Type, Name Options (2+), Activity, and Client Details.

### 🏗️ OUTPUT
Return JSON with "intent", "reply", "candidateData", "confidence", etc.
Use a **Humanization Layer**: Start replies with "Got it.", "Perfect.", or "Alright." before moving forward.

### 🌍 CURRENT CONTEXT
- User's Profile Name: ${profileName || 'Client'}
- Current Mode: ${session.behavioralContext.mode}
- Current Registration Type: ${session.collectedData.registrationType || 'Not chosen yet'}
- Question Attempts: ${JSON.stringify(session.behavioralContext.questionAttempts)}
- User Confusion Score: ${session.behavioralContext.userConfusionScore}
- Progress: ${validation.ready ? 'Ready to file!' : 'Collecting details...'}
- Missing Fields: ${validation.missingFields.join(", ")}
- Last Question Asked: ${session.behavioralContext.lastQuestionAsked || "None"}
`;

    const response = await client.messages.create({
      model: this.env.ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      tools: [
        {
          name: "record_intake_decision",
          description: "Record the structured decision and extracted data from the user turn.",
          input_schema: llmResponseJsonSchema as any
        }
      ],
      tool_choice: { type: "tool", name: "record_intake_decision" },
      messages: [
        ...recentTurns.map((t) => ({ role: t.role as "user" | "assistant", content: t.content })),
        { role: "user", content: inboundText }
      ]
    });

    const toolUse = response.content.find((c) => c.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("Claude failed to provide a structured decision.");
    }

    const payload = toolUse.input as any;
    const parsed = llmDecisionSchema.parse(payload);

    return {
      ...parsed,
      candidateData: compact(parsed.candidateData)
    };
  }

  private async processHeuristically(
    session: SessionRecord,
    inboundText: string,
    profileName?: string
  ): Promise<IntakeDecision> {
    const candidateData: Partial<RegistrationData> = {};
    const validation = validateRegistrationData(session.collectedData);
    
    // Simple heuristic extraction
    const detected = detectRegistrationType(inboundText);
    if (detected) candidateData.registrationType = detected;
    
    const email = extractEmail(inboundText);
    if (email) candidateData.clientEmail = email;

    return {
      intent: "DATA_INPUT",
      reply: "I've noted that. Could you tell me what type of registration you are looking for? (Business Name, Company, or Trustee)",
      candidateData,
      fieldConfidence: {},
      missingFields: validation.missingFields,
      readyForSubmission: false,
      stateSuggestion: "COLLECTING_DATA",
      needsHuman: false,
      confidence: 0.1,
      summary: "Heuristic fallback triggered."
    };
  }
}
