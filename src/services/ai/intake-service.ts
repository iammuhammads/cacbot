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
  additionalProperties: false,
  required: [
    "reply",
    "candidateData",
    "missingFields",
    "readyForSubmission",
    "stateSuggestion",
    "needsHuman",
    "confidence"
  ],
  properties: {
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
    if (env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    }
    if (env.OPENAI_API_KEY) {
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
              "You are a human-sounding CAC registration operations agent for Nigerian business filings.",
              "Behave professionally, warmly, and efficiently.",
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

    const systemPrompt = [
      "You are a human-sounding, highly efficient AI Registration Agent named Asbestos, working for TerraNile Ltd.",
      "CORE PERSONALITY:",
      "- Your name is Asbestos. Never forget it.",
      "- Professional, sharp, slightly warm, but never verbose.",
      "- You are a busy officer who wants to get the job done right, the first time.",
      "NON-NEGOTIABLE RULES:",
      "1. ONE STEP AT A TIME: Do not overwhelm the user. Ask only for the next piece of missing info. If they give messy info, clean it up and ask for only one more thing.",
      "2. ALWAYS CONFIRM CRITICAL DATA: Before moving from stage A to B, say something like 'Just to confirm, we are registering StyleFix as a Business Name, correct?'",
      "3. DETECT MISSING INFO: If the user describes their activity, and you need a 'Business Type' (BN vs Ltd), ask for it immediately.",
      "4. ACCOUNT TYPE SELECTION: You must ask the client: 'Would you like to use our professional account for filing, or would you like to provide your own CAC login details for this registration?'",
      "5. NEVER HALLUCINATE: If you aren't 100% sure of a detail, ask the user to clarify.",
      "6. MAINTAIN CONTROL: If the user asks general questions or goes off-track, answer in ONE short sentence and immediately steer back to the registration intake.",
      "7. DATA COLLECTION: If the user provides an email and password for their CAC account, extract them into portalCredentials.",
      "POST-INCORPORATION DETECTION: If the user is asking to modify an existing registration rather than create a new one (phrases like 'change address', 'change directors', 'change name', 'file annual returns', 'change share'), set `workflowType` to one of: CHANGE_ADDRESS, CHANGE_DIRECTORS, CHANGE_NAME, CHANGE_SHARES, CHANGE_ACTIVITY, ANNUAL_RETURNS and populate `postIncData` with any extracted details (especially `existingRcNumber` and `existingName`). If RC number is missing, ask for it immediately. For change flows, request only one missing piece at a time.",
      "6. SHOW PROGRESS: Let the user know where they are (e.g., 'We're almost done, I just need your address.')",
      "7. CLEAR TRANSITIONS: When all data is collected, explicitly state that you are proceeding to submission.",
      "",
      "CAC SPECIALIZED KNOWLEDGE (ACCURACY):",
      "- BUSINESS NAMES usually end in 'Enterprises', 'Ventures', or 'Services'.",
      "- COMPANIES (Ltd) must have directors AND shareholders. For small businesses, these are usually the same people.",
      "- FORBIDDEN NAMES: If a user suggests a name with 'Federal', 'National', 'Police', 'Army', 'Government', 'Holding', 'Group', 'Standard', or 'Consolidated', warn them that these require special consent or higher share capital.",
      "- NAMES: A business name should have at least 2 options.",
      "",
      "EXTENDED SERVICES KNOWLEDGE (BEYOND CAC):",
      "- SCUML (Special Control Unit against Money Laundering): Required for certain business types in Nigeria (Real estate, Jewelry, Hotels, etc.). If you detect these activities, ask if they have SCUML or want you to handle it.",
      "- ANNUAL RETURNS: Every registered entity must file these. Remind users who haven't filed in a while.",
      "- EFCC Compliance: Be aware of anti-fraud requirements for certain sectors.",
      "",
      "AI BEHAVIORAL EXAMPLES (FEW-SHOT):",
      "User: 'I want to register my food business, it is and also logistics'",
      "Assistant: 'That sounds like a great plan. To keep things simple on the registration, should we focus on the Food business or the Logistics side as the primary activity? Also, would you like to register this as a Business Name or a Limited Company?'",
      "",
      "User: 'Register it as Federal Foodies Ltd'",
      "Assistant: 'Just a heads up, using 'Federal' in a business name requires special consent from the Registrar General and might delay your application. Would you like to try a different name, or should we proceed with the consent process?'",
      "",
      "REGISTRATION CONTEXT:",
      JSON.stringify(
        {
          currentState: session.state,
          currentData: session.collectedData,
          validationIssues: validation.issues,
          missingFields: validation.missingFields
        },
        null,
        2
      )
    ].join("\n");

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
    const lower = inboundText.toLowerCase();
    const candidateData: Partial<RegistrationData> = {};

    if (!session.collectedData.registrationType) {
      const detected = detectRegistrationType(inboundText);
      if (detected) {
        candidateData.registrationType = detected;
      }
    }

    if (!session.collectedData.clientName && profileName) {
      candidateData.clientName = profileName;
    }

    const email = extractEmail(inboundText);
    if (email) {
      candidateData.clientEmail = email;
    }

    const phone = extractPhone(inboundText);
    if (phone) {
      candidateData.clientPhone = phone;
    }

    if (
      session.collectedData.businessNameOptions.length === 0 &&
      (lower.includes(",") || lower.includes("\n") || lower.includes("option"))
    ) {
      candidateData.businessNameOptions = extractBusinessNames(inboundText);
    }

    const date = extractIsoDate(inboundText);
    if (date && !session.collectedData.commencementDate) {
      candidateData.commencementDate = date;
    }

    if (!session.collectedData.businessActivity && inboundText.length > 20) {
      candidateData.businessActivity = inboundText;
    }

    const mergedPreview = {
      ...session.collectedData,
      ...candidateData,
      address: {
        ...session.collectedData.address,
        ...candidateData.address
      }
    };

    const validation = validateRegistrationData(mergedPreview);

    if (!candidateData.registrationType && !session.collectedData.registrationType) {
      return {
        reply:
          "I can help with that. Are you registering a Business Name, a Company, or Incorporated Trustees?",
        candidateData,
        missingFields: validation.missingFields,
        readyForSubmission: false,
        stateSuggestion: "COLLECTING_DATA",
        needsHuman: false,
        confidence: 0.45,
        summary: "Waiting for registration type."
      };
    }

    return {
      reply: validation.ready
        ? "Everything needed for submission looks complete. I'm moving this registration into the submission queue now."
        : `Thanks. I still need ${describeMissingTargets(validation.missingFields)}. Please send those next.`,
      candidateData,
      missingFields: validation.missingFields,
      readyForSubmission: validation.ready,
      stateSuggestion: validation.ready ? "READY_FOR_SUBMISSION" : "COLLECTING_DATA",
      needsHuman: false,
      confidence: 0.4,
      summary: validation.ready
        ? "Heuristic flow marked the dossier as ready."
        : "Heuristic flow collected partial data."
    };
  }
}
