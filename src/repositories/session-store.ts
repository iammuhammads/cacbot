import { createClient, type RedisClientType } from "redis";
import type { SessionRecord, SessionState } from "../types/domain.js";

export interface SessionStore {
  connect(): Promise<void>;
  getById(sessionId: string): Promise<SessionRecord | null>;
  getActiveByUser(userId: string): Promise<SessionRecord | null>;
  save(session: SessionRecord): Promise<void>;
  listByState(state?: SessionState): Promise<SessionRecord[]>;
  findAwaitingPaymentByAgent(agentPhone: string): Promise<SessionRecord[]>;
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

  async findAwaitingPaymentByAgent(agentPhone: string): Promise<SessionRecord[]> {
    return [...this.sessions.values()].filter(
      (session) =>
        session.assignedAgent === agentPhone && session.state === "AWAITING_PAYMENT"
    );
  }
}

export class RedisSessionStore implements SessionStore {
  private readonly client: RedisClientType;

  constructor(redisUrl: string) {
    this.client = createClient({ url: redisUrl });
  }

  async connect(): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  async getById(sessionId: string): Promise<SessionRecord | null> {
    const value = await this.client.get(`session:${sessionId}`);
    return value ? (JSON.parse(value) as SessionRecord) : null;
  }

  async getActiveByUser(userId: string): Promise<SessionRecord | null> {
    const currentId = await this.client.get(`user-active:${userId}`);
    if (!currentId) {
      return null;
    }

    return this.getById(currentId);
  }

  async save(session: SessionRecord): Promise<void> {
    const multi = this.client.multi();
    multi.set(`session:${session.id}`, JSON.stringify(session));
    multi.sAdd(`state:${session.state}`, session.id);
    multi.set(`user-active:${session.userId}`, session.id);

    const states: SessionState[] = [
      "NEW",
      "COLLECTING_DATA",
      "READY_FOR_SUBMISSION",
      "SUBMITTING",
      "AWAITING_PAYMENT",
      "PAYMENT_CONFIRMED",
      "COMPLETED",
      "ERROR",
      "MANUAL_REVIEW"
    ];

    for (const state of states) {
      if (state !== session.state) {
        multi.sRem(`state:${state}`, session.id);
      }
    }

    if (isTerminalState(session.state)) {
      multi.del(`user-active:${session.userId}`);
    }

    await multi.exec();
  }

  async listByState(state?: SessionState): Promise<SessionRecord[]> {
    if (!state) {
      const keys = await this.client.keys("session:*");
      if (keys.length === 0) {
        return [];
      }
      const values = await this.client.mGet(keys);
      return values
        .filter((value): value is string => Boolean(value))
        .map((value) => JSON.parse(value) as SessionRecord);
    }

    const ids = await this.client.sMembers(`state:${state}`);
    if (ids.length === 0) {
      return [];
    }

    const values = await this.client.mGet(ids.map((id) => `session:${id}`));
    return values
      .filter((value): value is string => Boolean(value))
      .map((value) => JSON.parse(value) as SessionRecord);
  }

  async findAwaitingPaymentByAgent(agentPhone: string): Promise<SessionRecord[]> {
    const records = await this.listByState("AWAITING_PAYMENT");
    return records.filter((record) => record.assignedAgent === agentPhone);
  }
}

