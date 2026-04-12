export type WhatsAppProviderName = "twilio" | "360dialog" | "mock";

export type RegistrationType =
  | "BUSINESS_NAME"
  | "COMPANY"
  | "INCORPORATED_TRUSTEES"
  | "OTHER";

export type SessionState =
  | "NEW"
  | "COLLECTING_DATA"
  | "READY_FOR_SUBMISSION"
  | "SUBMITTING"
  | "AWAITING_PAYMENT"
  | "PAYMENT_CONFIRMED"
  | "COMPLETED"
  | "ERROR"
  | "MANUAL_REVIEW";

export type ActorRole = "client" | "assistant" | "agent" | "system";

export interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  lga?: string;
  state?: string;
  country?: string;
}

export interface PersonRecord {
  fullName?: string;
  dob?: string;
  nationality?: string;
  email?: string;
  phone?: string;
  residentialAddress?: Address;
  idType?: string;
  idNumber?: string;
  role?: string;
}

export interface UploadedDocument {
  id: string;
  kind: string;
  fileName: string;
  contentType: string;
  localPath: string;
  sourceUrl?: string;
  ownerRole?: string;
  ownerName?: string;
  uploadedAt: string;
}

export interface PaymentDetails {
  amountNaira?: number;
  rrr?: string;
  paymentLink?: string;
  paidAt?: string;
}

export interface PortalProgress {
  avCode?: string;
  applicationId?: string;
  statusText?: string;
  referenceNumber?: string;
  lastCheckpoint?: string;
  certificatePath?: string;
}

export interface RegistrationData {
  registrationType?: RegistrationType;
  registrationSubtype?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  businessNameOptions: string[];
  businessActivity?: string;
  specificBusinessActivity?: string;
  commencementDate?: string;
  address?: Address;
  shareCapitalNaira?: number;
  proprietors: PersonRecord[];
  directors: PersonRecord[];
  trustees: PersonRecord[];
  documents: UploadedDocument[];
  payment?: PaymentDetails;
  portal?: PortalProgress;
  portalCredentials?: {
    email?: string;
    password?: string;
    useProfessionalAccount: boolean;
  };
  notes: string[];
}

export interface ConversationTurn {
  id: string;
  role: ActorRole;
  text: string;
  timestamp: string;
}

export interface AuditEntry {
  at: string;
  actor: ActorRole;
  action: string;
  detail?: unknown;
}

export interface SessionRecord {
  id: string;
  userId: string;
  provider: WhatsAppProviderName;
  assignedAgent?: string;
  state: SessionState;
  collectedData: RegistrationData;
  history: ConversationTurn[];
  auditTrail: AuditEntry[];
  lastAction: string;
  createdAt: string;
  updatedAt: string;
}

export interface InboundMediaAttachment {
  url: string;
  contentType: string;
  fileName?: string;
  caption?: string;
}

export interface NormalizedInboundMessage {
  provider: WhatsAppProviderName;
  messageId: string;
  from: string;
  to?: string;
  text: string;
  media: InboundMediaAttachment[];
  raw: unknown;
  timestamp: string;
  profileName?: string;
}

export interface IntakeDecision {
  reply: string;
  candidateData: Partial<RegistrationData>;
  missingFields: string[];
  readyForSubmission: boolean;
  stateSuggestion: SessionState;
  needsHuman: boolean;
  confidence: number;
  summary?: string;
}

export interface AutomationOutcome {
  kind: "AWAITING_PAYMENT" | "COMPLETED";
  payment?: PaymentDetails;
  portal?: PortalProgress;
  summary: string;
}

export interface AgentCommand {
  command: "PAID" | "STATUS" | "OVERRIDE" | "RESUME" | "HELP";
  sessionId?: string;
}

export const EMPTY_REGISTRATION_DATA: RegistrationData = {
  businessNameOptions: [],
  proprietors: [],
  directors: [],
  trustees: [],
  documents: [],
  notes: []
};

