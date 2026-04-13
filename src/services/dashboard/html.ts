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
      return "#1d6f42";
    case "AWAITING_PAYMENT":
      return "#a16207";
    case "ERROR":
      return "#b91c1c";
    case "MANUAL_REVIEW":
      return "#7c3aed";
    case "SUBMITTING":
    case "PAYMENT_CONFIRMED":
      return "#1d4ed8";
    default:
      return "#4b5563";
  }
}

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} | Asbestos Premium</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      :root {
        --bg: #0f172a;
        --sidebar: #1e293b;
        --card: rgba(30, 41, 59, 0.7);
        --border: rgba(51, 65, 85, 0.5);
        --accent: #6366f1;
        --accent-hover: #818cf8;
        --text: #f8fafc;
        --text-muted: #94a3b8;
        --success: #10b981;
        --warning: #f59e0b;
        --danger: #ef4444;
      }

      * { box-sizing: border-box; }
      
      body {
        margin: 0;
        font-family: 'Inter', sans-serif;
        background-color: var(--bg);
        color: var(--text);
        display: flex;
        min-height: 100vh;
      }

      /* Sidebar */
      .sidebar {
        width: 260px;
        background-color: var(--sidebar);
        border-right: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        padding: 24px;
        position: fixed;
        height: 100vh;
      }

      .logo {
        display: flex;
        align-items: center;
        gap: 12px;
        font-weight: 700;
        font-size: 1.25rem;
        margin-bottom: 40px;
        color: var(--accent);
      }

      .nav-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex: 1;
      }

      .nav-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-radius: 8px;
        text-decoration: none;
        color: var(--text-muted);
        transition: all 0.2s;
        font-weight: 500;
        font-size: 0.95rem;
      }

      .nav-item:hover, .nav-item.active {
        background-color: rgba(99, 102, 241, 0.1);
        color: var(--accent);
      }

      /* Main Content */
      .main {
        flex: 1;
        margin-left: 260px;
        padding: 40px;
        max-width: 1200px;
      }

      .header {
        margin-bottom: 32px;
      }

      h1 { font-size: 1.875rem; font-weight: 700; margin: 0; }
      p { color: var(--text-muted); margin: 8px 0 0; }

      /* Cards & Grid */
      .grid {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        gap: 24px;
      }

      .card {
        background-color: var(--card);
        backdrop-filter: blur(8px);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }

      .stats-card {
        grid-column: span 3;
      }

      .stat-value { font-size: 1.5rem; font-weight: 700; margin-top: 8px; }
      .stat-label { font-size: 0.875rem; color: var(--text-muted); }

      .table-card {
        grid-column: span 12;
      }

      /* Table Styles */
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 16px;
      }

      th {
        text-align: left;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--text-muted);
        padding: 12px 16px;
        border-bottom: 1px solid var(--border);
      }

      td {
        padding: 16px;
        font-size: 0.875rem;
        border-bottom: 1px solid var(--border);
      }

      tr:hover td {
        background-color: rgba(255, 255, 255, 0.02);
      }

      /* Badges */
      .badge {
        display: inline-flex;
        align-items: center;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
        color: white;
      }

      /* Buttons & Actions */
      .btn {
        padding: 10px 20px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.875rem;
        cursor: pointer;
        border: 1px solid transparent;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .btn-primary { background-color: var(--accent); color: white; }
      .btn-primary:hover { background-color: var(--accent-hover); }

      .btn-outline { 
        background-color: transparent; 
        border-color: var(--border); 
        color: var(--text); 
      }
      .btn-outline:hover { background-color: var(--border); }

      textarea {
        background: rgba(0,0,0,0.2);
        color: white;
        border: 1px solid var(--border);
        padding: 12px;
        border-radius: 8px;
        width: 100%;
        font-family: inherit;
      }

      @media (max-width: 1024px) {
        .sidebar { display: none; }
        .main { margin-left: 0; padding: 24px; }
        .stats-card { grid-column: span 6; }
      }
    </style>
    <script
      async
      crossorigin="anonymous"
      data-clerk-publishable-key="${env.CLERK_PUBLISHABLE_KEY}"
      src="https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js"
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
    <aside class="sidebar">
      <div class="logo">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
        <span>Asbestos</span>
      </div>
      <nav class="nav-group">
        <a href="/dashboard" class="nav-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          Overview
        </a>
        <a href="/dashboard/settings" class="nav-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          AI Config
        </a>
      </nav>
      <div class="user-info">
        <button id="sign-out-btn" class="nav-item" style="background:none; border:none; width:100%; cursor:pointer;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
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

export function renderDashboardIndex(sessions: SessionRecord[]): string {
  const totals = {
    total: sessions.length,
    active: sessions.filter((s) => !["COMPLETED", "ERROR"].includes(s.state)).length,
    errors: sessions.filter((s) => s.state === "ERROR").length
  };

  const rows = sessions
    .sort((a,b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((s) => `
      <tr>
        <td><a href="/dashboard/${s.id}" style="color:var(--accent); text-decoration:none;">${s.id.slice(0,8)}</a></td>
        <td>${escapeHtml(s.collectedData.clientName || s.userId)}</td>
        <td><span class="badge" style="background:${badgeColor(s.state)}">${s.state}</span></td>
        <td>${escapeHtml(s.collectedData.registrationType || "—")}</td>
        <td>${new Date(s.updatedAt).toLocaleDateString()}</td>
      </tr>
    `).join("");

  return layout("Overview", `
    <div class="header"><h1>Overview</h1><p>Welcome back to Asbestos.</p></div>
    <div class="grid">
      <div class="card stats-card"><div class="stat-label">Total</div><div class="stat-value">${totals.total}</div></div>
      <div class="card stats-card"><div class="stat-label">Active</div><div class="stat-value" style="color:var(--accent)">${totals.active}</div></div>
      <div class="card stats-card"><div class="stat-label">Errors</div><div class="stat-value" style="color:var(--danger)">${totals.errors}</div></div>
      <div class="card table-card">
        <table>
          <thead><tr><th>ID</th><th>Client</th><th>State</th><th>Type</th><th>Updated</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="5">No sessions found.</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `);
}

export function renderDashboardDetail(session: SessionRecord): string {
  return layout("Session Details", `
    <div class="header"><h1>${escapeHtml(session.collectedData.clientName || session.userId)}</h1><p>ID: ${session.id}</p></div>
    <div class="grid">
      <div class="card table-card">
        <h3>Conversation Log</h3>
        <div style="max-height: 400px; overflow-y: auto;">
          ${session.history.map(h => `<div style="margin-bottom:12px;"><b>${h.role}:</b> ${escapeHtml(h.text)}</div>`).join("")}
        </div>
      </div>
    </div>
  `);
}

export function renderDashboardSettings(settings: BotSettings): string {
  return layout("AI Config", `
    <div class="header"><h1>AI Configuration</h1><p>Edit your Asbestos persona and deployment settings.</p></div>
    <div class="grid">
      <div class="card table-card">
        <form method="POST">
          <label>AI System Prompt</label>
          <textarea name="systemPrompt" rows="10">${escapeHtml(settings.systemPrompt)}</textarea>
          <div style="margin-top:20px; display:flex; gap:20px;">
            <label><input type="checkbox" name="maintenanceMode" ${settings.maintenanceMode ? "checked" : ""}> Maintenance Mode</label>
            <label><input type="checkbox" name="autoSubmit" ${settings.autoSubmit ? "checked" : ""}> Auto-Submit</label>
          </div>
          <div style="margin-top:24px;">
            <h3>Deployment URL</h3>
            <p>Your unique registration link for customers:</p>
            <code style="background:#000; padding:12px; display:block; color:var(--success);">https://wa.me/${env.TWILIO_WHATSAPP_FROM?.replace("whatsapp:", "")}</code>
          </div>
          <button type="submit" class="btn btn-primary" style="margin-top:24px;">Save Settings</button>
        </form>
      </div>
    </div>
  `);
}
