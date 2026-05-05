import { sessionRecordSchema } from "../types/domain.js";

export interface SessionStore {
  connect(): Promise<void>;
  getById(sessionId: string): Promise<SessionRecord | null>;
  getActiveByUser(userId: string): Promise<SessionRecord | null>;
  save(session: SessionRecord): Promise<void>;
  listByState(state?: SessionState): Promise<SessionRecord[]>;
  listByStates(states: SessionState[]): Promise<SessionRecord[]>;
  listAll(): Promise<SessionRecord[]>;
  findAwaitingPaymentByAgent(agentPhone: string): Promise<SessionRecord[]>;
  checkConnection(): Promise<boolean>;
}

function isTerminalState(state: SessionState): boolean {
  return state === "COMPLETED" || state === "ERROR";
}

export class InMemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, SessionRecord>();

  async connect(): Promise<void> {
    return Promise.resolve();
  }

  async getById(sessionId: string): Promise<SessionRecord | null> {
    return this.sessions.get(sessionId) ?? null;
  }

  async getActiveByUser(userId: string): Promise<SessionRecord | null> {
    const matches = [...this.sessions.values()].filter(
      (session) => session.userId === userId && !isTerminalState(session.state)
    );
    matches.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    return matches[0] ?? null;
  }

  async save(session: SessionRecord): Promise<void> {
    this.sessions.set(session.id, session);
  }

  async listByState(state?: SessionState): Promise<SessionRecord[]> {
    const records = [...this.sessions.values()];
    return state ? records.filter((record) => record.state === state) : records;
  }

  async listByStates(states: SessionState[]): Promise<SessionRecord[]> {
    return [...this.sessions.values()].filter((record) => states.includes(record.state));
  }

  async listAll(): Promise<SessionRecord[]> {
    return [...this.sessions.values()];
  }

  async findAwaitingPaymentByAgent(agentPhone: string): Promise<SessionRecord[]> {
    return [...this.sessions.values()].filter(
      (session) =>
        session.assignedAgent === agentPhone && session.state === "AWAITING_PAYMENT"
    );
  }

  async checkConnection(): Promise<boolean> {
    return true;
  }
}

export class SupabaseSessionStore implements SessionStore {
  private client: any;

  constructor(private readonly env: Env) {}

  async connect(): Promise<void> {
    if (!this.env.SUPABASE_URL || !this.env.SUPABASE_SERVICE_KEY) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY are required for SupabaseSessionStore.");
    }
    const { createClient } = await import("@supabase/supabase-js");
    this.client = createClient(this.env.SUPABASE_URL, this.env.SUPABASE_SERVICE_KEY);
  }

  async getById(sessionId: string): Promise<SessionRecord | null> {
    const { data, error } = await this.client
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return this.mapFromDb(data);
  }

  async getActiveByUser(userId: string): Promise<SessionRecord | null> {
    const { data, error } = await this.client
      .from("sessions")
      .select("*")
      .eq("user_id", userId)
      .not("state", "in", `("COMPLETED","ERROR")`)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) return null;

    return this.mapFromDb(data[0]);
  }

  async save(session: SessionRecord): Promise<void> {
    const nextVersion = (session as any).version ? (session as any).version + 1 : 1;
    
    const payload = {
      id: session.id,
      user_id: session.userId,
      state: session.state,
      collected_data: session.collectedData,
      history: session.history,
      audit_trail: session.auditTrail,
      plan: session.plan,
      behavioral_context: session.behavioralContext,
      last_action: session.lastAction,
      updated_at: session.updatedAt,
      version: nextVersion
    };

    const { error } = await this.client
      .from("sessions")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      if (error.code === "23505") { // Just in case, but upsert usually handles this
         throw new Error("Concurrency conflict detected. Session updated by another process.");
      }
      throw error;
    }
    (session as any).version = nextVersion;
  }

  async listByState(state?: SessionState): Promise<SessionRecord[]> {
    let query = this.client.from("sessions").select("*").eq("archived", false);
    if (state) {
      query = query.eq("state", state);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((row: any) => this.mapFromDb(row));
  }

  async listByStates(states: SessionState[]): Promise<SessionRecord[]> {
    const { data, error } = await this.client
      .from("sessions")
      .select("*")
      .eq("archived", false)
      .in("state", states);

    if (error) throw error;
    return (data || []).map((row: any) => this.mapFromDb(row));
  }

  async findAwaitingPaymentByAgent(agentPhone: string): Promise<SessionRecord[]> {
    const { data, error } = await this.client
      .from("sessions")
      .select("*")
      .eq("archived", false)
      .eq("state", "AWAITING_PAYMENT");

    if (error) throw error;

    const records = (data || []).map((row: any) => this.mapFromDb(row));
    return records.filter((r: SessionRecord) => r.assignedAgent === agentPhone);
  }

  private mapFromDb(row: any): SessionRecord {
    return {
      id: row.id,
      userId: row.user_id,
      provider: "twilio", // Default provider, can be refined if stored
      state: row.state as SessionState,
      collectedData: row.collected_data,
      history: row.history,
      auditTrail: row.audit_trail,
      plan: row.plan,
      behavioralContext: row.behavioral_context,
      lastAction: row.last_action,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
      version: row.version
    } as any;
  }

  async checkConnection(): Promise<boolean> {
    try {
      const { error } = await this.client.from("sessions").select("id").limit(1);
      return !error;
    } catch {
      return false;
    }
  }
}


