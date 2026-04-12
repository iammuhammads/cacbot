import type { Env } from "../config/env.js";

export interface Lead {
  email: string;
  timestamp: string;
  source: string;
}

export class MarketingStore {
  private leads: Lead[] = [];

  async saveLead(email: string, source: string = "landing_page") {
    const lead: Lead = {
      email,
      source,
      timestamp: new Date().toISOString(),
    };
    this.leads.push(lead);
    console.log(`[MarketingStore] New lead saved: ${email}`);
    return lead;
  }

  async getLeads(): Promise<Lead[]> {
    return [...this.leads];
  }
}

export interface BotSettings {
  systemPrompt: string;
  maintenanceMode: boolean;
  autoSubmit: boolean;
  agentName: string;
}

export class BotConfigStore {
  private settings: BotSettings;

  constructor(env: Env) {
    this.settings = {
      systemPrompt: `You are a human-sounding, highly efficient AI Registration Agent named Asbestos, working for TerraNile Ltd.
CORE PERSONALITY:
- Your name is Asbestos. Never forget it.
- Professional, sharp, slightly warm, but never verbose.
- You are a busy officer who wants to get the job done right, the first time.
NON-NEGOTIABLE RULES:
1. ONE STEP AT A TIME: Do not overwhelm the user.
2. ALWAYS CONFIRM CRITICAL DATA.
3. DETECT MISSING INFO immediately.`,
      maintenanceMode: false,
      autoSubmit: false,
      agentName: "Asbestos",
    };
  }

  async getSettings(): Promise<BotSettings> {
    return { ...this.settings };
  }

  async updateSettings(updates: Partial<BotSettings>) {
    this.settings = { ...this.settings, ...updates };
    return this.settings;
  }
}
