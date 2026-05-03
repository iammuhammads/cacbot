import type { SessionRecord } from "../../types/domain.js";
import type { BotSettings } from "../../repositories/bot-config-store.js";
import { env } from "../../config/env.js";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function badgeColor(state: SessionRecord["state"]): string {
  switch (state) {
    case "COMPLETED":
      return "#059669";
    case "AWAITING_PAYMENT":
      return "#d97706";
    case "PENDING_APPROVAL":
      return "#059669";
    case "QUERIED":
      return "#dc2626";
    case "ERROR":
      return "#dc2626";
    case "MANUAL_REVIEW":
      return "#7c3aed";
    case "SUBMITTING":
    case "PAYMENT_CONFIRMED":
      return "#2563eb";
    case "READY_FOR_SUBMISSION":
      return "#0891b2";
    default:
      return "#64748b";
  }
}

function badgeBg(state: SessionRecord["state"]): string {
  switch (state) {
    case "COMPLETED":
      return "rgba(5, 150, 105, 0.12)";
    case "AWAITING_PAYMENT":
      return "rgba(217, 119, 6, 0.12)";
    case "PENDING_APPROVAL":
      return "rgba(5, 150, 105, 0.12)";
    case "QUERIED":
      return "rgba(220, 38, 38, 0.12)";
    case "ERROR":
      return "rgba(220, 38, 38, 0.12)";
    case "MANUAL_REVIEW":
      return "rgba(124, 58, 237, 0.12)";
    case "SUBMITTING":
    case "PAYMENT_CONFIRMED":
      return "rgba(37, 99, 235, 0.12)";
    case "READY_FOR_SUBMISSION":
      return "rgba(8, 145, 178, 0.12)";
    default:
      return "rgba(100, 116, 139, 0.1)";
  }
}

function stateIcon(state: SessionRecord["state"]): string {
  switch (state) {
    case "COMPLETED":
      return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    case "QUERIED":
      return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    case "PENDING_APPROVAL":
      return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    case "ERROR":
      return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    case "AWAITING_PAYMENT":
      return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
    case "SUBMITTING":
      return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"></path><path d="M22 2L15 22L11 13L2 9L22 2Z"></path></svg>';
    default:
      return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>';
  }
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function regTypeLabel(type: string | undefined): string {
  switch (type) {
    case "BUSINESS_NAME": return "Business Name";
    case "COMPANY": return "Company (Ltd)";
    case "INCORPORATED_TRUSTEES": return "Inc. Trustees";
    default: return type ?? "—";
  }
}

function workflowLabel(workflow: string | undefined): string {
  switch (workflow) {
    case "NEW_REGISTRATION": return "New Registration";
    case "CHANGE_NAME": return "Change Name";
    case "CHANGE_DIRECTORS": return "Change Directors";
    case "CHANGE_SHARES": return "Change Shares";
    case "CHANGE_ADDRESS": return "Change Address";
    case "CHANGE_ACTIVITY": return "Change Activity";
    case "ANNUAL_RETURNS": return "Annual Returns";
    default: return workflow ?? "New Registration";
  }
}

function layout(title: string, body: string, activePage: string = "overview"): string {
  return `<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} | Asbestos Command</title>
    <meta name="description" content="Asbestos CAC Agent Dashboard — manage, monitor, and control automated business registrations." />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
      :root {
        --bg: #06080f;
        --bg-elevated: #0c0f1a;
        --sidebar-bg: #080b14;
        --card: rgba(15, 20, 38, 0.85);
        --card-hover: rgba(20, 27, 50, 0.9);
        --border: rgba(56, 68, 100, 0.28);
        --border-light: rgba(99, 115, 160, 0.15);
        --accent: #10b981;
        --accent-glow: rgba(16, 185, 129, 0.15);
        --accent-hover: #34d399;
        --accent-subtle: rgba(16, 185, 129, 0.08);
        --text: #eef0f6;
        --text-secondary: #b0b8d1;
        --text-muted: #6b7599;
        --success: #10b981;
        --success-bg: rgba(16, 185, 129, 0.1);
        --warning: #f59e0b;
        --warning-bg: rgba(245, 158, 11, 0.1);
        --danger: #ef4444;
        --danger-bg: rgba(239, 68, 68, 0.08);
        --info: #0ea5e9;
        --gradient-1: linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%);
        --gradient-2: linear-gradient(135deg, #10b981 0%, #06b6d4 100%);
        --gradient-3: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
        --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
        --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.3);
        --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.4);
        --shadow-glow: 0 0 20px rgba(99, 102, 241, 0.15);
      }

      * { box-sizing: border-box; margin: 0; padding: 0; }
      
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        background-color: var(--bg);
        color: var(--text);
        display: flex;
        min-height: 100vh;
        overflow-x: hidden;
        -webkit-font-smoothing: antialiased;
      }

      /* ─── Scrollbar ─── */
      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

      /* ─── Sidebar ─── */
      .sidebar {
        width: 260px;
        background: var(--sidebar-bg);
        border-right: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        position: fixed;
        height: 100vh;
        z-index: 100;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .sidebar-header {
        padding: 28px 24px 24px;
        border-bottom: 1px solid var(--border);
      }

      .logo {
        display: flex;
        align-items: center;
        gap: 12px;
        text-decoration: none;
      }

      .logo-icon {
        width: 36px;
        height: 36px;
        background: var(--gradient-1);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 10px rgba(99, 102, 241, 0.3);
      }

      .logo-text {
        font-weight: 800;
        font-size: 1.2rem;
        letter-spacing: -0.02em;
        color: var(--text);
      }

      .logo-badge {
        font-size: 0.55rem;
        font-weight: 700;
        color: var(--accent);
        background: var(--accent-subtle);
        padding: 2px 6px;
        border-radius: 4px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        margin-left: -4px;
      }

      .sidebar-nav {
        flex: 1;
        padding: 16px 12px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .nav-label {
        font-size: 0.65rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--text-muted);
        padding: 16px 12px 8px;
      }

      .nav-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        border-radius: 10px;
        text-decoration: none;
        color: var(--text-secondary);
        transition: all 0.15s ease;
        font-weight: 500;
        font-size: 0.88rem;
        position: relative;
      }

      .nav-item:hover {
        background: var(--accent-subtle);
        color: var(--text);
      }

      .nav-item.active {
        background: var(--accent-glow);
        color: var(--accent-hover);
      }

      .nav-item.active::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 3px;
        height: 20px;
        background: var(--accent);
        border-radius: 0 3px 3px 0;
      }

      .nav-icon {
        width: 18px;
        height: 18px;
        opacity: 0.7;
        flex-shrink: 0;
      }

      .nav-item.active .nav-icon { opacity: 1; }

      .nav-counter {
        margin-left: auto;
        font-size: 0.7rem;
        font-weight: 700;
        background: var(--accent-subtle);
        color: var(--accent);
        padding: 2px 8px;
        border-radius: 100px;
        min-width: 20px;
        text-align: center;
      }

      .sidebar-footer {
        padding: 16px;
        border-top: 1px solid var(--border);
      }

      .sidebar-footer button {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 10px 14px;
        border: none;
        background: transparent;
        color: var(--text-muted);
        cursor: pointer;
        border-radius: 10px;
        font-family: inherit;
        font-size: 0.85rem;
        font-weight: 500;
        transition: all 0.15s;
      }

      .sidebar-footer button:hover {
        background: var(--danger-bg);
        color: var(--danger);
      }

      /* ─── Main ─── */
      .main {
        flex: 1;
        margin-left: 260px;
        min-height: 100vh;
      }

      .topbar {
        padding: 20px 40px;
        border-bottom: 1px solid var(--border);
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: rgba(6, 8, 15, 0.8);
        backdrop-filter: blur(12px);
        position: sticky;
        top: 0;
        z-index: 50;
      }

      .topbar-left h1 {
        font-size: 1.35rem;
        font-weight: 700;
        letter-spacing: -0.02em;
      }

      .topbar-left p {
        font-size: 0.82rem;
        color: var(--text-muted);
        margin-top: 2px;
      }

      .topbar-right {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .pulse-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--success);
        animation: pulse-glow 2s infinite;
      }

      @keyframes pulse-glow {
        0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
        50% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
      }

      .system-status {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.78rem;
        color: var(--success);
        font-weight: 600;
        background: var(--success-bg);
        padding: 6px 14px;
        border-radius: 100px;
      }

      .content {
        padding: 32px 40px 60px;
        max-width: 1400px;
      }

      /* ─── Stats Grid ─── */
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 20px;
        margin-bottom: 32px;
      }

      .stat-card {
        background: var(--card);
        backdrop-filter: blur(12px);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 24px;
        position: relative;
        overflow: hidden;
        transition: all 0.2s ease;
      }

      .stat-card:hover {
        border-color: rgba(99, 102, 241, 0.3);
        box-shadow: var(--shadow-glow);
        transform: translateY(-2px);
      }

      .stat-card::after {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        width: 80px;
        height: 80px;
        border-radius: 50%;
        filter: blur(40px);
        opacity: 0.15;
        pointer-events: none;
      }

      .stat-card:nth-child(1)::after { background: var(--accent); }
      .stat-card:nth-child(2)::after { background: var(--success); }
      .stat-card:nth-child(3)::after { background: var(--warning); }
      .stat-card:nth-child(4)::after { background: var(--danger); }
      
      .clickable-stat {
        cursor: pointer;
        user-select: none;
      }
      .clickable-stat:active {
        transform: scale(0.98);
      }

      .stat-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;
      }

      .stat-label {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted);
        margin-bottom: 6px;
      }

      .stat-value {
        font-size: 2rem;
        font-weight: 800;
        letter-spacing: -0.03em;
        line-height: 1;
      }

      .stat-change {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.72rem;
        font-weight: 600;
        margin-top: 8px;
        padding: 3px 8px;
        border-radius: 6px;
      }

      .stat-change.up { color: var(--success); background: var(--success-bg); }
      .stat-change.down { color: var(--danger); background: var(--danger-bg); }

      /* ─── Table ─── */
      .table-section {
        background: var(--card);
        backdrop-filter: blur(12px);
        border: 1px solid var(--border);
        border-radius: 16px;
        overflow: hidden;
      }

      .table-header {
        padding: 20px 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid var(--border);
      }

      .table-header h2 {
        font-size: 1rem;
        font-weight: 700;
      }

      .table-filter {
        display: flex;
        gap: 8px;
      }

      .filter-chip {
        font-size: 0.75rem;
        font-weight: 600;
        padding: 6px 14px;
        border-radius: 8px;
        background: transparent;
        color: var(--text-muted);
        border: 1px solid var(--border);
        cursor: pointer;
        transition: all 0.15s;
        font-family: inherit;
      }

      .filter-chip:hover, .filter-chip.active {
        background: var(--accent-subtle);
        color: var(--accent);
        border-color: rgba(99, 102, 241, 0.3);
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th {
        text-align: left;
        font-size: 0.68rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-muted);
        padding: 14px 24px;
        border-bottom: 1px solid var(--border);
        white-space: nowrap;
      }

      td {
        padding: 16px 24px;
        font-size: 0.85rem;
        border-bottom: 1px solid var(--border-light);
        color: var(--text-secondary);
      }

      tr:last-child td { border-bottom: none; }

      tr {
        transition: background 0.1s;
      }

      tr:hover td { background: rgba(99, 102, 241, 0.03); }

      .cell-id {
        font-family: 'SF Mono', 'Fira Code', monospace;
        font-size: 0.78rem;
        font-weight: 600;
        color: var(--accent);
        text-decoration: none;
        transition: color 0.15s;
      }

      .cell-id:hover { color: var(--accent-hover); }

      .cell-client {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .cell-avatar {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: var(--gradient-1);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7rem;
        font-weight: 700;
        color: white;
        flex-shrink: 0;
      }

      .cell-client-name {
        font-weight: 600;
        color: var(--text);
        white-space: nowrap;
      }

      .cell-client-phone {
        font-size: 0.72rem;
        color: var(--text-muted);
      }

      /* ─── Badge ─── */
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
        border-radius: 8px;
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.03em;
        white-space: nowrap;
      }

      .badge-pulse {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        animation: pulse-glow 2s infinite;
      }

      .cell-time {
        font-size: 0.78rem;
        color: var(--text-muted);
        white-space: nowrap;
      }

      .cell-type {
        font-size: 0.78rem;
        font-weight: 600;
        color: var(--text-secondary);
      }

      .empty-state {
        text-align: center;
        padding: 60px 20px;
        color: var(--text-muted);
      }

      .empty-state-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: var(--accent-subtle);
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px;
      }

      /* ─── Detail Page ─── */
      .detail-grid {
        display: grid;
        grid-template-columns: 1fr 380px;
        gap: 24px;
      }

      .detail-card {
        background: var(--card);
        backdrop-filter: blur(12px);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 24px;
      }

      .detail-card h3 {
        font-size: 0.85rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted);
        margin-bottom: 16px;
      }

      .info-row {
        display: flex;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px solid var(--border-light);
        font-size: 0.85rem;
      }

      .info-row:last-child { border-bottom: none; }
      .info-label { color: var(--text-muted); font-weight: 500; }
      .info-value { color: var(--text); font-weight: 600; text-align: right; }

      /* ─── Chat View ─── */
      .chat-log {
        max-height: 500px;
        overflow-y: auto;
        padding: 8px 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .chat-bubble {
        max-width: 85%;
        padding: 12px 16px;
        border-radius: 14px;
        font-size: 0.85rem;
        line-height: 1.5;
        position: relative;
      }

      .chat-bubble.client {
        align-self: flex-end;
        background: rgba(99, 102, 241, 0.15);
        color: var(--text);
        border-bottom-right-radius: 4px;
      }

      .chat-bubble.assistant {
        align-self: flex-start;
        background: var(--bg-elevated);
        border: 1px solid var(--border);
        color: var(--text-secondary);
        border-bottom-left-radius: 4px;
      }

      .chat-bubble.system {
        align-self: center;
        background: var(--warning-bg);
        color: var(--warning);
        font-size: 0.75rem;
        font-weight: 600;
        padding: 6px 16px;
        border-radius: 100px;
      }

      .chat-role {
        font-size: 0.65rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-muted);
        margin-bottom: 4px;
      }

      .chat-time {
        font-size: 0.6rem;
        color: var(--text-muted);
        margin-top: 4px;
        text-align: right;
      }

      /* ─── Audit Trail ─── */
      .audit-list {
        max-height: 400px;
        overflow-y: auto;
      }

      .audit-entry {
        display: flex;
        gap: 12px;
        padding: 10px 0;
        border-bottom: 1px solid var(--border-light);
        font-size: 0.78rem;
      }

      .audit-entry:last-child { border-bottom: none; }

      .audit-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-top: 4px;
        flex-shrink: 0;
      }

      .audit-actor { font-weight: 700; color: var(--accent); }
      .audit-action { color: var(--text-secondary); }
      .audit-time { color: var(--text-muted); font-size: 0.7rem; margin-top: 2px; }

      /* ─── Action Buttons ─── */
      .actions-bar {
        display: flex;
        gap: 8px;
        margin-top: 20px;
        flex-wrap: wrap;
      }

      .btn {
        padding: 10px 20px;
        border-radius: 10px;
        font-weight: 600;
        font-size: 0.82rem;
        cursor: pointer;
        border: 1px solid transparent;
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-family: inherit;
        text-decoration: none;
      }

      .btn-primary {
        background: var(--gradient-1);
        color: white;
        border: none;
      }

      .btn-primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
      }

      .btn-outline {
        background: transparent;
        border-color: var(--border);
        color: var(--text-secondary);
      }

      .btn-outline:hover {
        background: var(--accent-subtle);
        border-color: rgba(99, 102, 241, 0.3);
        color: var(--accent);
      }

      .btn-danger {
        background: transparent;
        border-color: rgba(220, 38, 38, 0.3);
        color: var(--danger);
      }

      .btn-danger:hover {
        background: var(--danger-bg);
      }

      .btn-success {
        background: transparent;
        border-color: rgba(16, 185, 129, 0.3);
        color: var(--success);
      }

      .btn-success:hover {
        background: var(--success-bg);
      }

      /* ─── Settings ─── */
      .settings-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
      }

      .form-group {
        margin-bottom: 20px;
      }

      .form-label {
        display: block;
        font-size: 0.78rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted);
        margin-bottom: 8px;
      }

      textarea, input[type="text"], input[type="email"] {
        background: var(--bg);
        color: var(--text);
        border: 1px solid var(--border);
        padding: 12px 16px;
        border-radius: 10px;
        width: 100%;
        font-family: inherit;
        font-size: 0.88rem;
        transition: border-color 0.2s;
        resize: vertical;
      }

      textarea:focus, input:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 3px var(--accent-glow);
      }

      .toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 0;
        border-bottom: 1px solid var(--border-light);
      }

      .toggle-row:last-child { border-bottom: none; }

      .toggle-info h4 {
        font-size: 0.88rem;
        font-weight: 600;
        margin-bottom: 2px;
      }

      .toggle-info p {
        font-size: 0.75rem;
        color: var(--text-muted);
      }

      .toggle {
        position: relative;
        width: 44px;
        height: 24px;
        cursor: pointer;
      }

      .toggle input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .toggle-slider {
        position: absolute;
        inset: 0;
        background: var(--border);
        border-radius: 100px;
        transition: background 0.2s;
      }

      .toggle-slider::after {
        content: '';
        position: absolute;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: white;
        top: 3px;
        left: 3px;
        transition: transform 0.2s;
      }

      .toggle input:checked + .toggle-slider {
        background: var(--accent);
      }

      .toggle input:checked + .toggle-slider::after {
        transform: translateX(20px);
      }

      .deploy-url {
        font-family: 'SF Mono', 'Fira Code', monospace;
        font-size: 0.82rem;
        background: var(--bg);
        border: 1px solid var(--border);
        padding: 14px 16px;
        border-radius: 10px;
        color: var(--success);
        word-break: break-all;
        display: block;
        user-select: all;
      }

      /* ─── Mobile ─── */
      .mobile-menu-btn {
        display: none;
        position: fixed;
        top: 16px;
        left: 16px;
        z-index: 200;
        padding: 8px;
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 8px;
        color: var(--text);
        cursor: pointer;
      }

      @media (max-width: 1024px) {
        .sidebar {
          transform: translateX(-100%);
        }

        .sidebar.open {
          transform: translateX(0);
        }

        .main { margin-left: 0; }
        .content { padding: 24px 20px; }
        .topbar { padding: 16px 20px; }
        .stats-grid { grid-template-columns: repeat(2, 1fr); }
        .detail-grid { grid-template-columns: 1fr; }
        .settings-grid { grid-template-columns: 1fr; }
        .mobile-menu-btn { display: block; }
        .topbar-left h1 { font-size: 1.1rem; margin-left: 48px; }
      }

      @media (max-width: 640px) {
        .stats-grid { grid-template-columns: 1fr; }
        .table-filter { display: none; }
      }

      /* ─── Animations ─── */
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .fade-in {
        animation: fadeIn 0.4s ease forwards;
      }

      .fade-in-delay-1 { animation-delay: 0.1s; opacity: 0; }
      .fade-in-delay-2 { animation-delay: 0.2s; opacity: 0; }
      .fade-in-delay-3 { animation-delay: 0.3s; opacity: 0; }
      .fade-in-delay-4 { animation-delay: 0.4s; opacity: 0; }
    </style>
    <script
      async
      crossorigin="anonymous"
      data-clerk-publishable-key="${env.CLERK_PUBLISHABLE_KEY}"
      src="https://proven-chow-42.clerk.accounts.dev/npm/@clerk/clerk-js@5/dist/clerk.browser.js"
      type="text/javascript"
    ></script>
    <script>
      async function startDashboardClerk() {
        try {
          await window.Clerk.load();
        } catch (e) {
          console.error("Dashboard Clerk Load Failed:", e);
        }
      }

      if (window.Clerk) startDashboardClerk();
      else window.addEventListener('load', startDashboardClerk);
    </script>
  </head>
  <body>
    <button class="mobile-menu-btn" onclick="document.querySelector('.sidebar').classList.toggle('open')">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
    </button>

    <aside class="sidebar">
      <div class="sidebar-header">
        <a href="/dashboard" class="logo">
          <div class="logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          </div>
          <span class="logo-text">Asbestos</span>
          <span class="logo-badge">v1</span>
        </a>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-label">Main</div>
        <a href="/dashboard" class="nav-item ${activePage === 'overview' ? 'active' : ''}" id="nav-overview">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect></svg>
          Overview
        </a>
        <a href="javascript:void(0)" onclick="filterState('READY_FOR_SUBMISSION')" class="nav-item" id="nav-queue">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
          Queue Monitor
        </a>

        <div class="nav-label">Agent Workspace</div>
        <a href="/chat" class="nav-item" id="nav-chat">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          Open AI Chat
        </a>
        <a href="/" class="nav-item" id="nav-home">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          Back to Homepage
        </a>

        <div class="nav-label">System</div>
        <a href="/dashboard/settings" class="nav-item ${activePage === 'settings' ? 'active' : ''}" id="nav-settings">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.32 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          AI Config
        </a>
        <a href="javascript:void(0)" onclick="window.scrollTo({top:0, behavior:'smooth'})" class="nav-item" id="nav-health">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="M12 6v6l4 2"></path></svg>
          Health Check
        </a>
      </nav>

      <div class="sidebar-footer">
        <button id="sign-out-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          Sign Out
        </button>
      </div>
      <script>
        document.getElementById('sign-out-btn')?.addEventListener('click', async () => {
          if (window.Clerk) {
             await window.Clerk.signOut();
             window.location.href = '/';
          }
        });
      </script>
    </aside>

    <main class="main">
      ${body}
    </main>
  </body>
</html>`;
}

export function renderDashboardIndex(sessions: SessionRecord[], health: { db: boolean; worker: boolean; ai: boolean; whatsapp: boolean; cac: boolean }, queue: SessionRecord[]): string {
  const totals = {
    total: sessions.length,
    intake: sessions.filter((s) => !["COMPLETED", "ERROR", "AWAITING_PAYMENT", "READY_FOR_SUBMISSION", "SUBMITTING", "PAYMENT_CONFIRMED", "AWAITING_OTP"].includes(s.state)).length,
    ready: sessions.filter((s) => ["READY_FOR_SUBMISSION", "SUBMITTING"].includes(s.state)).length,
    awaiting: sessions.filter((s) => s.state === "AWAITING_PAYMENT").length,
    errors: sessions.filter((s) => s.state === "ERROR").length,
  };

  const rows = sessions
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((s) => {
      const name = s.collectedData.clientName || s.userId;
      const initials = name
        .split(/\s+/)
        .slice(0, 2)
        .map((w: string) => w[0]?.toUpperCase() ?? "")
        .join("");

      return `
        <tr class="session-row" data-state="${s.state}">
          <td><a href="/dashboard/${s.id}" class="cell-id">${s.id.slice(0, 8)}…</a></td>
          <td>
            <div class="cell-client">
              <div class="cell-avatar">${initials || "?"}</div>
              <div>
                <div class="cell-client-name">${escapeHtml(name)}</div>
                <div class="cell-client-phone">${escapeHtml(s.userId)}</div>
              </div>
            </div>
          </td>
          <td>
            <span class="badge" style="background:${badgeBg(s.state)}; color:${badgeColor(s.state)}">
              ${stateIcon(s.state)}
              ${s.state.replace(/_/g, " ")}
            </span>
          </td>
          <td><span class="cell-type">${workflowLabel(s.collectedData.workflowType)}</span></td>
          <td><span class="cell-type">${regTypeLabel(s.collectedData.registrationType)}</span></td>
          <td><span class="cell-time">${timeAgo(s.updatedAt)}</span></td>
        </tr>`;
    })
    .join("");

  const queueRows = queue.length > 0 
    ? queue.map(q => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: var(--bg-elevated); border-radius: 10px; margin-bottom: 8px; border-left: 4px solid var(--accent);">
          <div>
            <div style="font-size: 0.85rem; font-weight: 700;">${escapeHtml(q.collectedData.clientName || q.userId)}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${q.state.replace(/_/g, " ")}</div>
          </div>
          <div class="pulse-dot" style="width: 8px; height: 8px;"></div>
        </div>
      `).join("")
    : `<div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 0.85rem;">No active automation tasks.</div>`;

  return layout("Overview", `
    <div class="topbar">
      <div class="topbar-left">
        <h1>Command Center</h1>
        <p>${new Date().toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>
      <div class="topbar-right">
        <div class="system-status">
          <div class="pulse-dot" style="background: ${health.db && health.ai ? 'var(--success)' : 'var(--warning)'};"></div>
          System Pulse: ${health.db && health.ai ? 'OPTIMAL' : 'DEGRADED'}
        </div>
      </div>
    </div>

    <div class="content">
      <!-- Real-Time Pulse Grid -->
      <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-bottom: 32px;">
        <div class="stat-card fade-in" style="padding: 14px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="pulse-dot" style="background: ${health.db ? 'var(--success)' : 'var(--danger)'};"></div>
            <span style="font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted);">Database</span>
          </div>
          <p style="font-size: 0.95rem; font-weight: 800; margin-top: 4px; color: ${health.db ? 'var(--success)' : 'var(--danger)'};">${health.db ? 'SUPABASE LIVE' : 'OFFLINE'}</p>
        </div>
        <div class="stat-card fade-in fade-in-delay-1" style="padding: 14px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="pulse-dot" style="background: ${health.ai ? 'var(--success)' : 'var(--danger)'};"></div>
            <span style="font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted);">Intake AI</span>
          </div>
          <p style="font-size: 0.95rem; font-weight: 800; margin-top: 4px; color: ${health.ai ? 'var(--success)' : 'var(--danger)'};">${health.ai ? 'CLAUDE-3.5 ACTIVE' : 'MISSING KEY'}</p>
        </div>
        <div class="stat-card fade-in fade-in-delay-2" style="padding: 14px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="pulse-dot" style="background: ${health.whatsapp ? 'var(--success)' : 'var(--danger)'};"></div>
            <span style="font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted);">WhatsApp</span>
          </div>
          <p style="font-size: 0.95rem; font-weight: 800; margin-top: 4px; color: ${health.whatsapp ? 'var(--success)' : 'var(--danger)'};">${health.whatsapp ? 'GATEWAY UP' : 'DISCONNECTED'}</p>
        </div>
        <div class="stat-card fade-in fade-in-delay-3" style="padding: 14px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="pulse-dot" style="background: ${health.cac ? 'var(--success)' : 'var(--danger)'};"></div>
            <span style="font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted);">CAC Portal</span>
          </div>
          <p style="font-size: 0.95rem; font-weight: 800; margin-top: 4px; color: ${health.cac ? 'var(--success)' : 'var(--danger)'};">${health.cac ? 'PORTAL ONLINE' : 'PORTAL DOWN'}</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 340px; gap: 24px;">
        <div>
          <div class="stats-grid" style="grid-template-columns: repeat(2, 1fr); margin-bottom: 24px;">
            <div class="stat-card clickable-stat" onclick="filterState('COLLECTING_DATA')">
              <div class="stat-label">In Intake</div>
              <div class="stat-value">${totals.intake}</div>
            </div>
            <div class="stat-card clickable-stat" onclick="filterState('READY_FOR_SUBMISSION')" style="border-left: 4px solid var(--info);">
              <div class="stat-label">Pending Automation</div>
              <div class="stat-value" style="color: var(--info);">${totals.ready}</div>
            </div>
            <div class="stat-card clickable-stat" onclick="filterState('AWAITING_PAYMENT')" style="border-left: 4px solid var(--warning);">
              <div class="stat-label">Awaiting Payment</div>
              <div class="stat-value" style="color: var(--warning);">${totals.awaiting}</div>
            </div>
            <div class="stat-card clickable-stat" onclick="filterState('ERROR')" style="border-left: 4px solid var(--danger);">
              <div class="stat-label">Critical Errors</div>
              <div class="stat-value" style="color: var(--danger);">${totals.errors}</div>
            </div>
          </div>

          <div class="table-section fade-in" style="animation-delay: 0.3s; opacity: 1;">
            <div class="table-header">
              <h2>Recent Sessions</h2>
              <div class="table-filter">
                <button class="filter-chip active" onclick="filterState('ALL')">All</button>
                <button class="filter-chip" onclick="filterState('COLLECTING_DATA')">Collecting</button>
                <button class="filter-chip" onclick="filterState('AWAITING_PAYMENT')">Payment</button>
                <button class="filter-chip" onclick="filterState('ERROR')">Errors</button>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Client</th>
                  <th>Status</th>
                  <th>Workflow</th>
                  <th>Type</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                ${rows || `
                  <tr>
                    <td colspan="6">
                      <div class="empty-state">
                        <p>No sessions found.</p>
                      </div>
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
        
        <div style="background: white; border-radius: 20px; border: 1px solid var(--border); padding: 24px; position: sticky; top: 100px; height: fit-content;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
            <h2 style="font-size: 1.1rem; font-weight: 800; margin: 0;">Queue Monitor</h2>
            <div class="pulse-dot" style="background: var(--success); width: 10px; height: 10px;"></div>
          </div>
          ${queueRows}
          
          <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--border);">
            <h3 style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 12px;">Active Workers</h3>
            <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: var(--bg-elevated); border-radius: 10px;">
              <div style="width: 32px; height: 32px; background: var(--accent); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 0.7rem;">W1</div>
              <div style="flex: 1;">
                <div style="font-size: 0.75rem; font-weight: 700;">Worker #01</div>
                <div style="font-size: 0.65rem; color: var(--success);">Poling Supabase...</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <script>
        function filterState(state) {
          const rows = document.querySelectorAll('.session-row');
          rows.forEach(row => {
            if (state === 'ALL' || row.dataset.state === state || (state === 'READY_FOR_SUBMISSION' && row.dataset.state === 'SUBMITTING')) {
              row.style.display = 'table-row';
            } else {
              row.style.display = 'none';
            }
          });
          
          // Update chips
          document.querySelectorAll('.filter-chip').forEach(chip => {
            const text = chip.textContent.toUpperCase();
            const target = state.split('_')[0]; 
            chip.classList.toggle('active', text.includes(target) || (state === 'ALL' && text === 'ALL'));
          });
        }

        // Auto-refresh every 60 seconds to keep live data flowing
        setTimeout(() => {
          window.location.reload();
        }, 60000);
      </script>
      </div>
    </div>
  `, "overview");
}

export function renderDashboardDetail(session: SessionRecord): string {
  const data = session.collectedData;
  const name = data.clientName || session.userId;

  const chatBubbles = session.history
    .map((h) => {
      const roleClass = h.role === "client" ? "client" : h.role === "system" ? "system" : "assistant";
      const label = h.role === "client" ? "Client" : h.role === "system" ? "System" : "Asbestos";
      const ts = new Date(h.timestamp).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
      return `
        <div class="chat-bubble ${roleClass}">
          <div class="chat-role">${label}</div>
          ${escapeHtml(h.text)}
          <div class="chat-time">${ts}</div>
        </div>`;
    })
    .join("");

  const auditItems = session.auditTrail
    .slice(-20)
    .reverse()
    .map((entry) => {
      const dotColor = entry.actor === "system" ? "var(--accent)" : entry.actor === "agent" ? "var(--warning)" : "var(--success)";
      return `
        <div class="audit-entry">
          <div class="audit-dot" style="background: ${dotColor};"></div>
          <div>
            <span class="audit-actor">${entry.actor}</span>
            <span class="audit-action"> — ${escapeHtml(entry.action)}</span>
            <div class="audit-time">${timeAgo(entry.at)}</div>
          </div>
        </div>`;
    })
    .join("");

  const docs = data.documents
    .map((d) => `<div class="info-row"><span class="info-label">${escapeHtml(d.kind)}</span><span class="info-value">${escapeHtml(d.fileName)}</span></div>`)
    .join("");

  return layout("Session Details", `
    <div class="topbar">
      <div class="topbar-left">
        <h1>${escapeHtml(name)}</h1>
        <p style="font-family: 'SF Mono', monospace; font-size: 0.75rem;">${session.id}</p>
      </div>
      <div class="topbar-right">
        <span class="badge" style="background:${badgeBg(session.state)}; color:${badgeColor(session.state)}; font-size: 0.78rem; padding: 6px 16px;">
          ${stateIcon(session.state)}
          ${session.state.replace(/_/g, " ")}
        </span>
        <a href="/dashboard" class="btn btn-outline" style="font-size: 0.78rem; padding: 8px 16px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </a>
      </div>
    </div>

    <div class="content">
      <div class="detail-grid">
        <div>
          <div class="detail-card fade-in" style="margin-bottom: 24px;">
            <h3>💬 Conversation</h3>
            <div class="chat-log">
              ${chatBubbles || '<div class="empty-state"><p style="font-size: 0.85rem;">No messages yet.</p></div>'}
            </div>
          </div>

          <div class="detail-card fade-in fade-in-delay-1">
            <h3>📎 Documents (${data.documents.length})</h3>
            ${docs || '<p style="color: var(--text-muted); font-size: 0.85rem;">No documents uploaded yet.</p>'}
          </div>
        </div>

        <div>
          <div class="detail-card fade-in fade-in-delay-1" style="margin-bottom: 24px;">
            <h3>📋 Task Info</h3>
            <div class="info-row">
              <span class="info-label">Workflow</span>
              <span class="info-value">${workflowLabel(data.workflowType)}</span>
            </div>
            ${data.workflowType === "NEW_REGISTRATION" ? `
            <div class="info-row">
              <span class="info-label">Type</span>
              <span class="info-value">${regTypeLabel(data.registrationType)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Name Options</span>
              <span class="info-value">${data.businessNameOptions.length > 0 ? escapeHtml(data.businessNameOptions.join(", ")) : "—"}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Commencement</span>
              <span class="info-value">${escapeHtml(data.commencementDate ?? "—")}</span>
            </div>` : ""}

            ${data.postIncData?.existingRcNumber ? `
            <div class="info-row">
              <span class="info-label">Existing RC Number</span>
              <span class="info-value">${escapeHtml(data.postIncData.existingRcNumber)}</span>
            </div>` : ""}
            ${data.postIncData?.existingName ? `
            <div class="info-row">
              <span class="info-label">Existing Name</span>
              <span class="info-value">${escapeHtml(data.postIncData.existingName)}</span>
            </div>` : ""}
            ${data.postIncData?.changeDetails ? `
            <div class="info-row">
              <span class="info-label">Proposed Change</span>
              <span class="info-value">${escapeHtml(data.postIncData.changeDetails)}</span>
            </div>` : ""}

            <div class="info-row">
              <span class="info-label">Email</span>
              <span class="info-value">${escapeHtml(data.clientEmail ?? "—")}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Phone</span>
              <span class="info-value">${escapeHtml(data.clientPhone ?? "—")}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Address</span>
              <span class="info-value">${escapeHtml(data.address?.line1 ?? "—")}</span>
            </div>
            <div class="info-row">
              <span class="info-label">State</span>
              <span class="info-value">${escapeHtml(data.address?.state ?? "—")}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Activity</span>
              <span class="info-value">${escapeHtml(data.businessActivity ?? "—")}</span>
            </div>
            
            ${data.portal?.avCode ? `
              <div class="info-row">
                <span class="info-label">AV Code</span>
                <span class="info-value" style="color: var(--success);">${escapeHtml(data.portal.avCode)}</span>
              </div>` : ""}
            ${data.payment?.rrr ? `
              <div class="info-row">
                <span class="info-label">RRR</span>
                <span class="info-value" style="color: var(--warning);">${escapeHtml(data.payment.rrr)}</span>
              </div>` : ""}
            ${data.payment?.amountNaira ? `
              <div class="info-row">
                <span class="info-label">Amount</span>
                <span class="info-value">NGN ${data.payment.amountNaira.toLocaleString()}</span>
              </div>` : ""}

            <div class="actions-bar">
              <form method="POST" action="/dashboard/actions" style="display:contents;">
                <input type="hidden" name="sessionId" value="${session.id}" />
                ${session.state === "AWAITING_PAYMENT" ? `
                  <button type="submit" name="action" value="resume_payment" class="btn btn-success">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Confirm Payment
                  </button>` : ""}
                ${session.state === "ERROR" ? `
                  <button type="submit" name="action" value="retry_submission" class="btn btn-primary">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                    Retry Submission
                  </button>` : ""}
                ${!["COMPLETED", "ERROR", "MANUAL_REVIEW"].includes(session.state) ? `
                  <button type="submit" name="action" value="manual_review" class="btn btn-danger">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    Manual Review
                  </button>` : ""}
              </form>
            </div>
          </div>

          <div class="detail-card fade-in fade-in-delay-2">
            <h3>📜 Audit Trail</h3>
            <div class="audit-list">
              ${auditItems || '<p style="color: var(--text-muted); font-size: 0.85rem;">No audit entries.</p>'}
            </div>
          </div>
        </div>
      </div>
    </div>
  `, "detail");
}

export function renderDashboardSettings(settings: BotSettings): string {
  const whatsappNum = env.TWILIO_WHATSAPP_FROM?.replace("whatsapp:", "") ?? "NOT_SET";

  return layout("AI Config", `
    <div class="topbar">
      <div class="topbar-left">
        <h1>AI Configuration</h1>
        <p>Control your Asbestos agent's personality and deployment.</p>
      </div>
    </div>

    <div class="content">
      <form method="POST">
        <div class="settings-grid">
          <div class="detail-card fade-in">
            <h3>🧠 Agent Personality</h3>
            <div class="form-group">
              <label class="form-label">System Prompt</label>
              <textarea name="systemPrompt" rows="14" style="font-size: 0.82rem; line-height: 1.6;">${escapeHtml(settings.systemPrompt)}</textarea>
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              Save Configuration
            </button>
          </div>

          <div>
            <div class="detail-card fade-in fade-in-delay-1" style="margin-bottom: 24px;">
              <h3>⚙️ Runtime Controls</h3>
              <div class="toggle-row">
                <div class="toggle-info">
                  <h4>Maintenance Mode</h4>
                  <p>Pause all automated responses</p>
                </div>
                <label class="toggle">
                  <input type="checkbox" name="maintenanceMode" ${settings.maintenanceMode ? "checked" : ""}>
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="toggle-row">
                <div class="toggle-info">
                  <h4>Auto-Submit</h4>
                  <p>Automatically start portal automation when data is complete</p>
                </div>
                <label class="toggle">
                  <input type="checkbox" name="autoSubmit" ${settings.autoSubmit ? "checked" : ""}>
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div class="detail-card fade-in fade-in-delay-2">
              <h3>🔗 WhatsApp Deployment</h3>
              <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">Copy the URL below and paste it into your <a href="https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox" target="_blank" style="color: var(--accent);">Twilio Sandbox Settings</a> under <b>"When a message comes in"</b>.</p>
              
              <div class="form-group">
                <label class="form-label">Webhook URL (Paste into Twilio)</label>
                <div style="display: flex; gap: 8px; align-items: center; background: var(--bg-elevated); padding: 12px; border-radius: 8px; border: 1px solid var(--accent);">
                   <code class="deploy-url" style="color: var(--accent); font-weight: 700; flex: 1;">${escapeHtml(env.PUBLIC_BASE_URL)}/webhooks/whatsapp</code>
                </div>
              </div>

              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">WhatsApp Test Link</label>
                <code class="deploy-url">https://wa.me/${escapeHtml(whatsappNum)}</code>
              </div>
            </div>
            <div class="detail-card fade-in fade-in-delay-3" style="margin-top:20px;">
              <h3>🔐 Link Your CAC Account</h3>
              <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:10px;">Link your CAC professional account so the AI can perform filings on your behalf. We store credentials encrypted and only use them to log into the CAC portal when you initiate automation. By linking you confirm you have consent to use this account for your clients.</p>
              <form id="link-cac-form" method="POST" action="/api/link-cac">
                <div class="form-group">
                  <label class="form-label">CAC Email</label>
                  <input type="email" name="email" id="cac-email" placeholder="you@company.com" />
                </div>
                <div class="form-group">
                  <label class="form-label">CAC Password</label>
                  <input type="password" name="password" id="cac-password" placeholder="••••••••" />
                </div>
                <div class="form-group">
                  <label style="display:flex; align-items:center; gap:8px;">
                    <input type="checkbox" name="useProfessionalAccount" id="cac-prof" /> Use as professional account
                  </label>
                </div>
                <div class="form-group">
                  <label style="display:flex; align-items:center; gap:8px;">
                    <input type="checkbox" name="consent" id="cac-consent" /> I consent to Asbestos storing and using these credentials to perform CAC filings on my behalf.
                  </label>
                </div>
                <div style="display:flex; gap:8px;">
                  <button type="button" id="link-cac" class="btn btn-primary">Link Account</button>
                  <button type="button" id="unlink-cac" class="btn btn-outline">Unlink</button>
                </div>
                <div id="cac-status" style="margin-top:10px; color:var(--text-muted); font-size:0.9rem;"></div>
              </form>
              <script>
                async function refreshCacStatus(){
                  const el = document.getElementById('cac-status');
                  try{
                    const res = await fetch('/api/cac-account');
                    if(!res.ok){ el.textContent = 'Not linked'; return; }
                    const data = await res.json();
                    if(data.linked){ el.textContent = 'Linked: ' + (data.email || ''); }
                    else { el.textContent = 'Not linked'; }
                  }catch(e){ el.textContent = 'Status unknown'; }
                }
                document.getElementById('link-cac')?.addEventListener('click', async ()=>{
                  const email = (document.getElementById('cac-email') as HTMLInputElement).value;
                  const password = (document.getElementById('cac-password') as HTMLInputElement).value;
                  const useProf = (document.getElementById('cac-prof') as HTMLInputElement).checked;
                  const consent = (document.getElementById('cac-consent') as HTMLInputElement).checked;
                  if(!email || !password){ alert('Email and password are required'); return; }
                  if(!consent){ alert('You must consent to store credentials'); return; }
                  const form = new URLSearchParams();
                  form.append('email', email);
                  form.append('password', password);
                  if(useProf) form.append('useProfessionalAccount', 'on');
                  if(consent) form.append('consent','on');
                  const res = await fetch('/api/link-cac', { method: 'POST', body: form });
                  if(res.ok) { alert('CAC account linked'); refreshCacStatus(); }
                  else { const err = await res.json().catch(()=>({error:'failed'})); alert('Link failed: '+ (err.error||'Unknown')); }
                });
                document.getElementById('unlink-cac')?.addEventListener('click', async ()=>{
                  if(!confirm('Unlink CAC account?')) return;
                  const res = await fetch('/api/unlink-cac', { method: 'POST' });
                  if(res.ok) { alert('Unlinked'); refreshCacStatus(); }
                  else { alert('Unlink failed'); }
                });
                refreshCacStatus();
              </script>
            </div>
          </div>
        </div>
      </form>
    </div>
  `, "settings");
}
