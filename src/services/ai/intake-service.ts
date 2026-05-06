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
  intent: z.enum(["GREETING", "CAC_INTENT", "DATA_INPUT", "CONFUSION", "IRRELEVANT", "CHAT"]),
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
      enum: ["GREETING", "CAC_INTENT", "DATA_INPUT", "CONFUSION", "IRRELEVANT", "CHAT"]
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
        console.log("[AI] Routing to Claude...");
        return await this.processWithClaude(session, inboundText, profileName);
      }
    } catch (err) {
      console.error("[AI] Anthropic/Claude failed:", err);
    }

    if (this.openai) {
      try {
        console.log("[AI] Routing to OpenAI fallback...");
        return await this.processWithOpenAI(session, inboundText, profileName);
      } catch (err) {
        console.error("[AI] OpenAI failed:", err);
      }
    }

    console.warn("[AI] All AI providers failed. Using HEURISTIC fallback.");

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
              "You are Mr. Chinedu, a senior corporate legal assistant specializing in CAC business registration in Nigeria.",
              "Your job is to help users complete registration through natural, human conversation while silently extracting data.",
              "CORE BEHAVIOR: Speak like a real, calm legal consultant. Natural, simple, human. Never sound like a software system. No steps, no JSON, no tools mentioned.",
              "STYLE: Professional, conversational, and direct. Short responses. No filler greetings or robotic phrasing. No interrogation tone.",
              "FORMATTING: Never use em-dashes (—). Never use bullet points (* or -). Use plain sentences. Never use \\n\\n* format.",
              "Default to conversation-first behavior. Only switch to structured extraction internally. Never reflect structure in user-facing text."
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

    const systemPrompt = `You are Mr. Chinedu, a senior corporate legal assistant specializing in CAC business registration in Nigeria.

Your job is to help users complete registration through natural, human conversation while silently extracting required data in the background.

CORE BEHAVIOR:
- Speak like a real, calm legal consultant.
- Keep conversation natural, simple, and human.
- Never sound like a form, checklist, or software system.
- Never use “Step 1/2/3”, numbering, or structured workflows in chat.
- Never mention JSON, schemas, tools, system logic, or internal processing.
- Do not overwhelm the user with multiple requests at once.
- If the user provides partial information, acknowledge briefly and continue smoothly.

STYLE:
- Professional, conversational, and direct.
- Short responses (clear and efficient, not robotic).
- No filler greetings or repetitive confirmations.
- No interrogation tone.
- Never use em-dashes (—).
- Never use bullet points (* or -). Use plain sentences.
- Never use \n\n* format.

IMPORTANT:
The intelligence is hidden. The user only sees a human conversation. Default to conversation-first behavior.

### 🌍 CONTEXT
- User: ${profileName || 'Client'}
- Registration Type: ${session.collectedData.registrationType || 'Not chosen yet'}
- Missing Fields: ${validation.missingFields.join(", ")}
- Fields to focus on now: ${validation.missingFields.slice(0, 2).join(", ")}
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
      tool_choice: validation.missingFields.length > 0 ? { type: "auto" } : "none" as any,
      messages: [
        ...recentTurns.map((t) => ({ role: t.role as "user" | "assistant", content: t.content })),
        { role: "user", content: inboundText }
      ]
    });

    const toolUse = response.content.find((c) => c.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      // Return a chatty response if no tool was called
      const chatText = response.content.find(c => c.type === 'text')?.type === 'text' 
        ? (response.content.find(c => c.type === 'text') as any).text 
        : "I've noted that. Let's continue.";

      return {
        intent: "CHAT",
        reply: chatText,
        candidateData: {},
        fieldConfidence: {},
        missingFields: validation.missingFields,
        readyForSubmission: false,
        stateSuggestion: "COLLECTING_DATA",
        needsHuman: false,
        confidence: 0.8,
        summary: "Normal conversational turn."
      };
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
    if (detected) {
      candidateData.registrationType = detected;
      session.collectedData.registrationType = detected; // Force update for immediate feedback
    }
    
    const email = extractEmail(inboundText);
    if (email) candidateData.clientEmail = email;

    let reply = `Hello! I'm Mr. Chinedu, your corporate legal assistant. I can help you register a Business Name, a Company, or Incorporated Trustees. Which one are you looking to start today?`;
    
    if (session.collectedData.registrationType) {
      reply = `I've noted that we are registering a ${session.collectedData.registrationType.replace(/_/g, ' ').toLowerCase()}. What name options are you considering for it? It's best to have at least two in mind.`;
    }

    return {
      intent: "DATA_INPUT",
      reply: reply,
      candidateData,
      fieldConfidence: detected ? { registrationType: 1 } : {},
      missingFields: validation.missingFields,
      readyForSubmission: false,
      stateSuggestion: "COLLECTING_DATA",
      needsHuman: false,
      confidence: 0.1,
      summary: "Heuristic fallback triggered due to AI connectivity issues."
    };
  }
}
