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
import { logger } from "../utils/logger.js";

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

/**
 * Recursively converts null values to undefined so Zod optional() validators
 * don't reject them with "expected string, received null".
 */
function stripNulls(obj: unknown): unknown {
  if (obj === null) return undefined;
  if (Array.isArray(obj)) return obj.map(stripNulls);
  if (typeof obj === "object" && obj !== null) {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>)
        .map(([k, v]) => [k, stripNulls(v)])
        .filter(([, v]) => v !== undefined)
    );
  }
  return obj;
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
  // Elite: Look for phrases followed by "ltd", "limited", "inc", "nigeria", etc.
  // Or just clean up the input if it's short
  const noise = ["lets go with", "i want", "use", "the name is", "names are", "how about"];
  let cleaned = text.toLowerCase();
  for (const n of noise) {
    cleaned = cleaned.replace(n, "");
  }

  return cleaned
    .split(/\n|,|\band\b|\bor\b/)
    .map((value) => value.trim())
    .filter((value) => value.length > 3)
    .map(v => v.replace(/^["']|["']$/g, "")) // Remove quotes
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
    logger.info("Initializing Intake Service...");
    if (env.ANTHROPIC_API_KEY) {
      logger.info("Anthropic Key Detected. Initializing Claude...");
      this.anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    } else {
      console.warn("[AI] WARNING: ANTHROPIC_API_KEY is missing!");
    }
    
    if (env.OPENAI_API_KEY) {
      logger.info("OpenAI Key Detected. Initializing GPT-4o...");
      this.openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    }

    // Safety: Correct legacy/invalid model names from env
    if (this.env.ANTHROPIC_MODEL === "claude-sonnet-4.6" || this.env.ANTHROPIC_MODEL === "claude-3-5-sonnet-20240620" || this.env.ANTHROPIC_MODEL === "claude-3-sonnet-20240229" || this.env.ANTHROPIC_MODEL === "claude-3-5-sonnet-latest") {
      (this.env as any).ANTHROPIC_MODEL = "claude-sonnet-4-6";
      logger.warn(`Detected invalid or deprecated ANTHROPIC_MODEL '${this.env.ANTHROPIC_MODEL}'. Auto-correcting to 'claude-sonnet-4-6'.`);
    }
  }

  async processTurn(
    session: SessionRecord,
    inboundText: string,
    profileName?: string
  ): Promise<IntakeDecision> {
    let lastError = "";

    // 1. Attempt primary AI (Claude)
    if (this.anthropic) {
      try {
        logger.info(`Routing to Claude (${this.env.ANTHROPIC_MODEL})...`, { sessionId: session.id });
        return await this.processWithClaude(session, inboundText, profileName);
      } catch (err: any) {
        lastError = `Claude: ${err.message || String(err)}`;
        logger.error("Claude/Anthropic failed - attempting OpenAI fallback", { error: lastError, sessionId: session.id });
      }
    } else {
      lastError = "Claude: client not initialized (no ANTHROPIC_API_KEY)";
    }

    // 2. Attempt fallback AI (OpenAI)
    if (this.openai) {
      try {
        logger.info("Routing to OpenAI fallback...", { sessionId: session.id });
        return await this.processWithOpenAI(session, inboundText, profileName);
      } catch (err: any) {
        lastError += ` | OpenAI: ${err.message || String(err)}`;
        logger.error("OpenAI fallback failed too", { error: err.message, sessionId: session.id });
      }
    }

    // 3. Last resort: Heuristic (with error surfacing for debugging)
    console.warn(`[AI] All AI providers failed. Using HEURISTIC fallback. Reason: ${lastError}`);
    const result = await this.processHeuristically(session, inboundText, profileName);
    
    // Surface error in reply during debugging (prefix it)
    if (lastError) {
      result.reply = `[AI DEBUG: ${lastError.substring(0, 150)}]\n\n${result.reply}`;
      result.summary = `Heuristic fallback. Error: ${lastError.substring(0, 200)}`;
    }
    
    return result;
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

    const payload = stripNulls(JSON.parse(response.output_text));
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

    // Optimized model choice for speed: Use Haiku for simple chat, Sonnet for data extraction
    const model = validation.missingFields.length > 0 ? this.env.ANTHROPIC_MODEL : "claude-3-haiku-20240307";

    logger.info(`Processing turn with model: "${model}"`, { sessionId: session.id });

    try {
      const response = await client.messages.create({
      model: model,
      max_tokens: 1024,
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
    }).catch(async (err: any) => {
       // --- 🔄 DYNAMIC MODEL AUTO-CORRECTION ---
       const errMsg = err.message || '';
       const match = errMsg.match(/Did you mean ([a-zA-Z0-9.-]+)\?/);
       if (err.status === 404 && match && match[1]) {
         const suggestedModel = match[1];
         logger.warn(`Claude Model 404 Auto-Correction: Retrying with suggested model '${suggestedModel}' instead of '${model}'...`, { sessionId: session.id });
         // Update the env for future requests in this container instance
         (this.env as any).ANTHROPIC_MODEL = suggestedModel;
         
         return await client.messages.create({
            model: suggestedModel,
            max_tokens: 1024,
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
       }
       
       logger.error("Claude Message Creation Failed", { 
          error: err.message, 
          model,
          turns: recentTurns.length,
          sessionId: session.id 
       });
       throw err;
    });

    logger.info("Claude Response Received", { 
       contentTypes: response.content.map(c => c.type),
       sessionId: session.id 
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

    const payload = stripNulls(toolUse.input);
    const parsed = llmDecisionSchema.parse(payload);

    return {
      ...parsed,
      candidateData: compact(parsed.candidateData)
    };
    } catch (err) {
      logger.error("Claude Processing Exception", { error: (err as any).message, sessionId: session.id });
      throw err;
    }
  }

  private async processHeuristically(
    session: SessionRecord,
    inboundText: string,
    profileName?: string
  ): Promise<IntakeDecision> {
    const candidateData: Partial<RegistrationData> = {};
    const validation = validateRegistrationData(session.collectedData);
    const fieldConfidence: Record<string, number> = {};
    
    // Simple heuristic extraction
    const regType = detectRegistrationType(inboundText);
    if (regType) {
      candidateData.registrationType = regType;
      session.collectedData.registrationType = regType; 
      fieldConfidence.registrationType = 1;
    }
    
    const email = extractEmail(inboundText);
    if (email) {
      candidateData.clientEmail = email;
      fieldConfidence.clientEmail = 1;
    }

    const names = extractBusinessNames(inboundText);
    if (names.length > 0 && session.collectedData.registrationType) {
       candidateData.businessNameOptions = names;
       fieldConfidence.businessNameOptions = 1;
    }

    let reply = "";
    
    if (session.collectedData.registrationType) {
      if (inboundText.toLowerCase().includes("how are you") || inboundText.toLowerCase().includes("hello")) {
        reply = "I am doing well, thank you! Ready to continue with your " + session.collectedData.registrationType.replace(/_/g, ' ').toLowerCase() + " registration. What names are we considering for this entity?";
      } else if (names.length > 0) {
        reply = `I've noted your name options: ${names.join(", ")}. \n\nWhat is the main business address? (Please include the state and LGA).`;
      } else {
        reply = `I've noted that we are registering a ${session.collectedData.registrationType.replace(/_/g, ' ').toLowerCase()}. What name options are you considering for it? It's best to have at least two in mind.`;
      }
    } else {
       if (inboundText.toLowerCase().includes("how are you")) {
         reply = "I am excellent, thank you! I am here to help you with Nigerian business registrations. Would you like to start a Business Name, a Company, or Incorporated Trustees?";
       } else {
         reply = `Hello! I'm Mr. Chinedu, your corporate legal assistant. I can help you register a Business Name, a Company, or Incorporated Trustees. Which one are you looking to start today?`;
       }
    }

    return {
      intent: "DATA_INPUT",
      reply: reply,
      candidateData,
      fieldConfidence,
      missingFields: validation.missingFields,
      readyForSubmission: false,
      stateSuggestion: "COLLECTING_DATA",
      needsHuman: false,
      confidence: 0.1,
      summary: "Heuristic fallback triggered due to AI connectivity issues."
    };
  }
}
