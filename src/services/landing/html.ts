import { env } from "../../config/env.js";

export function renderLandingPage(env: any): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>TerraNile | Automated Legal Filings</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
      :root {
        --bg-main: #f8fafc;
        --text-main: #0f172a;
        --text-muted: #475569;
        --primary: #059669; /* Emerald Green */
        --primary-light: #10b981;
        --primary-dark: #047857;
        --secondary: #0284c7; /* Ocean Blue */
        --glass-bg: rgba(255, 255, 255, 0.85);
        --shadow-sm: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        --shadow-md: 0 10px 25px -5px rgba(5, 150, 105, 0.1);
      }

      * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }

      body {
        background: var(--bg-main);
        color: var(--text-main);
        overflow-x: hidden;
      }

      /* Navbar */
      .navbar {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        width: 90%;
        max-width: 1200px;
        background: var(--glass-bg);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(0,0,0,0.05);
        border-radius: 100px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 24px;
        z-index: 1000;
        box-shadow: var(--shadow-sm);
      }

      .nav-brand {
        font-weight: 800;
        font-size: 1.3rem;
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--primary-dark);
        text-decoration: none;
        letter-spacing: -0.5px;
      }

      .nav-links {
        display: flex;
        gap: 32px;
        align-items: center;
      }

      .nav-links a {
        text-decoration: none;
        color: var(--text-muted);
        font-weight: 500;
        font-size: 0.95rem;
        transition: color 0.2s;
      }
      .nav-links a:hover { color: var(--primary); }

      .btn-chat {
        background: var(--primary);
        color: white !important;
        padding: 10px 24px;
        border-radius: 100px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s;
      }
      .btn-chat:hover {
        background: var(--primary-dark);
        box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
        transform: translateY(-2px);
      }

      /* Container */
      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 24px;
      }

      /* Hero Section */
      .hero {
        padding: 180px 0 100px;
        text-align: center;
        position: relative;
      }
      .hero::before {
        content: ''; position: absolute; top: -200px; left: 50%; transform: translateX(-50%);
        width: 800px; height: 800px;
        background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%);
        pointer-events: none; z-index: -1;
      }

      .hero-tag {
        display: inline-block;
        background: rgba(16, 185, 129, 0.1);
        color: var(--primary-dark);
        padding: 8px 16px;
        border-radius: 100px;
        font-weight: 600;
        font-size: 0.9rem;
        margin-bottom: 24px;
      }

      .hero h1 {
        font-size: 4rem;
        font-weight: 800;
        line-height: 1.1;
        letter-spacing: -1px;
        margin-bottom: 24px;
        color: #0f172a;
      }
      .hero h1 span { color: var(--primary); }
      
      .hero p {
        font-size: 1.2rem;
        color: var(--text-muted);
        max-width: 600px;
        margin: 0 auto 40px;
        line-height: 1.6;
      }

      .hero-actions { display: flex; justify-content: center; gap: 16px; }

      /* Features Grid */
      .section { padding: 100px 0; }
      .section-header { text-align: center; margin-bottom: 60px; }
      .section-header h2 { font-size: 2.5rem; font-weight: 800; margin-bottom: 16px; }
      .section-header p { color: var(--text-muted); font-size: 1.1rem; }

      .grid-3 {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 32px;
      }

      .card {
        background: white;
        padding: 40px;
        border-radius: 24px;
        border: 1px solid rgba(0,0,0,0.05);
        transition: transform 0.3s, box-shadow 0.3s;
      }
      .card:hover {
        transform: translateY(-5px);
        box-shadow: var(--shadow-md);
        border-color: rgba(16, 185, 129, 0.2);
      }
      .card-icon {
        width: 56px; height: 56px;
        background: rgba(16, 185, 129, 0.1);
        color: var(--primary);
        border-radius: 16px;
        display: flex; align-items: center; justify-content: center;
        margin-bottom: 24px;
      }
      .card h3 { font-size: 1.3rem; margin-bottom: 12px; font-weight: 700; }
      .card p { color: var(--text-muted); line-height: 1.6; }

      /* Interactive Demo Section */
      .demo-section {
        background: #0f172a;
        color: white;
        padding: 100px 0;
        border-radius: 40px;
        margin: 40px 24px;
        text-align: center;
      }
      .demo-section h2 { font-size: 2.5rem; margin-bottom: 24px; font-weight: 800; }
      .demo-section p { color: #94a3b8; margin-bottom: 40px; font-size: 1.1rem; }
      .demo-btn {
        background: white; color: var(--primary-dark);
        padding: 16px 32px; border-radius: 100px;
        font-weight: 700; font-size: 1.1rem; text-decoration: none;
        display: inline-flex; align-items: center; gap: 10px;
        transition: transform 0.2s;
      }
      .demo-btn:hover { transform: scale(1.05); }

      /* Footer */
      .footer {
        padding: 60px 0;
        text-align: center;
        color: var(--text-muted);
        border-top: 1px solid rgba(0,0,0,0.05);
      }

      /* Mobile Support */
      @media (max-width: 768px) {
        .navbar { border-radius: 20px; top: 10px; width: 95%; padding: 8px 16px; }
        .nav-links { display: none; }
        .hero { padding: 140px 0 60px; }
        .hero h1 { font-size: 2.5rem; }
        .hero p { font-size: 1rem; padding: 0 10px; }
        .hero-actions { flex-direction: column; align-items: center; }
        .grid-3 { grid-template-columns: 1fr; }
        .section { padding: 60px 0; }
        .section-header h2 { font-size: 2rem; }
        .demo-section { margin: 20px 12px; padding: 60px 20px; }
        .demo-section h2 { font-size: 1.8rem; }
      }
    </style>
  </head>
  <body>

    <nav class="navbar">
      <a href="/" class="nav-brand">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
        TerraNile
      </a>
      <div class="nav-links">
        <a href="#services">Services</a>
        <a href="#how-it-works">How it Works</a>
        <a href="/dashboard" class="auth-trigger">Client Portal</a>
        <a href="/chat" class="btn-chat">
          Open AI Agent
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </a>
      </div>
    </nav>

    <div class="container">
      <section class="hero">
        <div class="hero-tag">⚡ The Future of Corporate Compliance</div>
        <h1>Legal Filings,<br><span>Automated by AI.</span></h1>
        <p>Chat with our intelligent agent to register your business, incorporate a company, or file annual returns without filling out a single form.</p>
        <div class="hero-actions">
          <a href="/chat" class="btn-chat" style="font-size: 1.1rem; padding: 16px 36px;">Start Filing Now</a>
        </div>
      </section>

      <section class="section" id="services">
        <div class="section-header">
          <h2>Everything your business needs</h2>
          <p>End-to-end automation for Nigerian corporate compliance.</p>
        </div>
        <div class="grid-3">
          <div class="card">
            <div class="card-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg></div>
            <h3>Business Names</h3>
            <p>Get your BN registered in record time. Our AI automatically checks name availability and categorizes your services perfectly.</p>
          </div>
          <div class="card">
            <div class="card-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect></svg></div>
            <h3>LTD Companies</h3>
            <p>Full incorporation including share capital distribution, directors, and automatic memorandum generation.</p>
          </div>
          <div class="card">
            <div class="card-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div>
            <h3>Annual Returns</h3>
            <p>Never miss a deadline. Our system polls your status and auto-files your returns with zero friction.</p>
          </div>
        </div>
      </section>
    </div>

    <section class="demo-section">
      <div class="container">
        <h2>Experience the AI Agent</h2>
        <p>Stop typing into boxes. Start talking to your legal assistant.</p>
        <a href="/chat" class="demo-btn">
          Launch Asbestos AI
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 16 16 12 12 8"></polyline><line x1="8" y1="12" x2="16" y2="12"></line></svg>
        </a>
      </div>
    </section>

    <footer class="footer">
      <p>&copy; 2026 TerraNile Ltd. All rights reserved. Automated CAC Registration System.</p>
    </footer>

    <script
      async
      crossorigin="anonymous"
      data-clerk-publishable-key="${env.CLERK_PUBLISHABLE_KEY || ''}"
      src="https://proven-chow-42.clerk.accounts.dev/npm/@clerk/clerk-js@5/dist/clerk.browser.js"
      type="text/javascript"
    ></script>

    <script>
      async function initClerkOnLanding() {
        try {
          await window.Clerk.load();
          document.querySelectorAll('.auth-trigger').forEach(el => {
            el.addEventListener('click', (e) => {
              if (!window.Clerk.user) {
                e.preventDefault();
                window.Clerk.openSignIn({ 
                  afterSignInUrl: '/dashboard',
                  afterSignUpUrl: '/dashboard'
                });
              } else {
                window.location.href = '/dashboard';
              }
            });
          });
        } catch (e) { console.error(e); }
      }
      if (window.Clerk) initClerkOnLanding();
      else window.addEventListener('load', initClerkOnLanding);
    </script>
  </body>
</html>`;
}

export function renderChatPage(env: any): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Agent Workspace | TerraNile</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
      :root {
        --bg-main: #ffffff;
        --bg-sidebar: #f9fafb;
        --bg-panel: #ffffff;
        --text-main: #0f172a;
        --text-muted: #64748b;
        --text-faded: #94a3b8;
        --accent: #10b981;
        --accent-glow: rgba(16, 185, 129, 0.1);
        --accent-dark: #059669;
        --border: rgba(0, 0, 0, 0.06);
      }

      * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }

      body {
        display: flex;
        height: 100vh;
        overflow: hidden;
        background: var(--bg-main);
        background-image: radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.03) 0%, transparent 60%);
        color: var(--text-main);
      }

      /* Sidebar */
      .sidebar {
        width: 280px;
        background: var(--bg-sidebar);
        border-right: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        padding: 24px 16px;
        z-index: 10;
      }

      .logo {
        font-weight: 800;
        font-size: 1.2rem;
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--text-main);
        margin-bottom: 32px;
        padding-left: 8px;
        letter-spacing: -0.5px;
      }
      .logo svg { color: var(--accent); }

      .new-chat {
        display: flex;
        align-items: center;
        gap: 10px;
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid rgba(16, 185, 129, 0.2);
        color: var(--accent);
        padding: 12px 16px;
        border-radius: 12px;
        cursor: pointer;
        font-weight: 600;
        font-size: 0.95rem;
        transition: all 0.2s;
      }
      .new-chat:hover {
        background: rgba(16, 185, 129, 0.2);
        box-shadow: 0 0 15px var(--accent-glow);
        transform: translateY(-1px);
      }

      .history-label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-muted);
        margin: 32px 0 12px 8px;
        font-weight: 700;
      }

      .history {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .history::-webkit-scrollbar { width: 4px; }
      .history::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

      .history-item {
        padding: 12px 16px;
        border-radius: 10px;
        color: var(--text-muted);
        font-size: 0.9rem;
        cursor: pointer;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        transition: all 0.2s;
        border: 1px solid transparent;
      }
      .history-item:hover {
        background: rgba(255,255,255,0.03);
        color: white;
        border-color: rgba(255,255,255,0.05);
      }

      .sidebar-footer {
        margin-top: auto;
        padding-top: 24px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .footer-link {
        color: var(--text-muted); text-decoration: none; font-size: 0.9rem;
        display: flex; align-items: center; gap: 10px;
        padding: 10px 16px; border-radius: 10px; transition: all 0.2s;
      }
      .footer-link:hover { background: rgba(255,255,255,0.05); color: white; }

      /* Chat Main Area */
      .chat-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: var(--bg-panel);
        position: relative;
      }

      .chat-header {
        padding: 24px 40px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(10, 13, 22, 0.8);
        backdrop-filter: blur(16px);
        border-bottom: 1px solid var(--border);
        position: sticky; top: 0; z-index: 50;
      }

      /* Mobile Sidebar Adjustments */
      @media (max-width: 1024px) {
        .sidebar { 
          transform: translateX(-100%); 
          position: fixed; 
          height: 100vh; 
          top: 0; 
          left: 0; 
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 20px 0 50px rgba(0,0,0,0.3); 
          z-index: 2000;
        }
        .sidebar.active { transform: translateX(0); }
        .chat-header { padding: 16px 20px; }
        .messages { padding: 20px; }
        .bubble { padding: 14px 18px; font-size: 0.95rem; }
        .mobile-chat-toggle { display: flex !important; }
      }

      .mobile-chat-toggle {
        display: none;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        background: var(--bg-sidebar);
        border: 1px solid var(--border);
        border-radius: 10px;
        color: var(--text-main);
        cursor: pointer;
        margin-right: 12px;
      }
      .chat-title { font-weight: 600; color: white; font-size: 1.1rem; }
      .bubble {
        padding: 18px 24px;
        border-radius: 18px;
        font-size: 1rem;
        line-height: 1.55;
        max-width: 85%;
        position: relative;
      }
      .bot .bubble {
        background: #f8fafc;
        color: var(--text-main);
        border: 1px solid var(--border);
        border-top-left-radius: 4px;
      }
      .user .bubble {
        background: linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%);
        color: #000;
        font-weight: 500;
        border-top-right-radius: 4px;
        box-shadow: 0 10px 20px -5px rgba(16, 185, 129, 0.3);
      }

      /* Input Area Overhaul */
      .input-area {
        padding: 24px 40px 40px;
        background: linear-gradient(to top, var(--bg-panel) 80%, transparent);
      }
      .input-box {
        max-width: 860px;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 8px 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        transition: all 0.3s;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
      }
      .input-box:focus-within {
        border-color: var(--accent);
        background: #ffffff;
        box-shadow: 0 10px 40px rgba(16, 185, 129, 0.08);
      }
      .input-box input {
        flex: 1;
        background: transparent;
        border: none;
        color: var(--text-main);
        font-size: 1rem;
        padding: 12px 4px;
        outline: none;
      }
      .input-box input::placeholder { color: var(--text-muted); }
      
      .send-btn {
        width: 40px; height: 40px;
        background: var(--accent);
        color: #000;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.2s;
      }
      .send-btn:hover {
        background: white;
        transform: scale(1.05);
      }
      .send-btn:disabled {
        background: var(--text-faded);
        cursor: not-allowed;
      }

      /* Automation Live Terminal */
      .automation-overlay {
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(6, 8, 15, 0.95);
        display: none; flex-direction: column; align-items: center; justify-content: center;
        z-index: 1000; backdrop-filter: blur(20px);
      }
      .terminal-window {
        width: 90%; max-width: 800px; height: 500px;
        background: #000; border: 1px solid var(--accent);
        border-radius: 12px; box-shadow: 0 0 50px rgba(16, 185, 129, 0.3);
        display: flex; flex-direction: column; overflow: hidden;
        position: relative;
      }
      .terminal-header {
        background: #111; padding: 12px 20px;
        display: flex; justify-content: space-between; align-items: center;
        border-bottom: 1px solid #222;
      }
      .terminal-controls { display: flex; gap: 8px; }
      .terminal-dot { width: 12px; height: 12px; border-radius: 50%; }
      .terminal-body {
        flex: 1; padding: 24px; font-family: 'Courier New', monospace;
        font-size: 0.95rem; color: var(--accent); overflow-y: auto;
        line-height: 1.5; text-shadow: 0 0 5px var(--accent);
      }
      .terminal-line { margin-bottom: 8px; opacity: 0; transform: translateX(-10px); animation: slideIn 0.3s forwards; }

      /* Typing Indicator */
      .typing { padding: 12px 20px !important; width: fit-content; }
      .typing-dots { display: flex; gap: 4px; align-items: center; height: 20px; }
      .typing-dots span {
        width: 6px; height: 6px; background: var(--accent);
        border-radius: 50%; opacity: 0.4;
        animation: typing 1.4s infinite ease-in-out;
      }
      .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
      .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
      @keyframes typing {
        0%, 100% { transform: translateY(0); opacity: 0.4; }
        50% { transform: translateY(-4px); opacity: 1; }
      }
      .typing-dots span { display: inline-block; }
      @keyframes slideIn { to { opacity: 1; transform: translateX(0); } }

      /* Matrix Background for Terminal */
      .matrix-canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0.1; pointer-events: none; }
    </style>
  </head>
  <body>

    <!-- Sidebar -->
    <div class="sidebar">
      <div class="logo">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
        TerraNile
      </div>
      
      <button class="new-chat" onclick="location.reload()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        New Registration
      </button>
      
      <div class="history-label">Past Sessions</div>
      <div class="history" id="historyList"></div>
      
      <div class="sidebar-footer">
        <a href="/dashboard" class="footer-link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect></svg>
          Client Portal
        </a>
        <a href="/" class="footer-link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Exit to Homepage
        </a>
      </div>
    </div>

    <!-- Main Chat -->
    <div class="chat-container">
      <div class="chat-header">
        <div style="display: flex; align-items: center;">
          <button class="mobile-chat-toggle" onclick="document.querySelector('.sidebar').classList.toggle('active')">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <div class="chat-title">Mr. Chinedu AI Agent</div>
        </div>
        <div class="agent-status"><div class="dot"></div> Online</div>
      </div>
      
      <div class="messages" id="chatBody">
        <div class="message bot">
          <div class="avatar"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path></svg></div>
          <div class="bubble">Hello! I am Mr. Chinedu, your Elite Registration Agent. Are you looking to register a Business Name, a Company, or Incorporated Trustees?</div>
        </div>
      </div>

      <div class="input-area">
        <form class="input-box" id="chatForm">
          <input type="text" id="chatInput" placeholder="Message Mr. Chinedu to start your filing..." required autocomplete="off">
          <button type="submit" class="send-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </form>
      </div>
    </div>

    <!-- Automation Live Terminal Overlay -->
    <div class="automation-overlay" id="automationOverlay">
      <div class="terminal-window">
        <canvas class="matrix-canvas" id="matrixCanvas"></canvas>
        <div class="terminal-header">
          <div class="terminal-controls">
            <div class="terminal-dot" style="background: #ff5f56;"></div>
            <div class="terminal-dot" style="background: #ffbd2e;"></div>
            <div class="terminal-dot" style="background: #27c93f;"></div>
          </div>
          <div style="color: #666; font-size: 0.8rem; font-weight: 600;">TERRANILE_CORE_V4_SUBMISSION_SERVICE</div>
        </div>
        <div class="terminal-body" id="terminalBody">
          <div class="terminal-line" style="color: white;">> INITIALIZING AUTOMATED COMPLIANCE AGENT...</div>
        </div>
      </div>
      <div style="margin-top: 30px; color: var(--accent); font-weight: 700; font-size: 1.1rem; letter-spacing: 2px; text-transform: uppercase;">Automation in Progress</div>
    </div>

    <script>
      const chatBody = document.getElementById('chatBody');
      const chatForm = document.getElementById('chatForm');
      const chatInput = document.getElementById('chatInput');
      const historyList = document.getElementById('historyList');
      const automationOverlay = document.getElementById('automationOverlay');
      const terminalBody = document.getElementById('terminalBody');
      const matrixCanvas = document.getElementById('matrixCanvas');

      let userId = localStorage.getItem('asbestos_user_id');
      let chatHistory = JSON.parse(localStorage.getItem('asbestos_history') || '[]');

      async function initUser() {
        if (window.Clerk && window.Clerk.user) {
          const uId = window.Clerk.user.id;
          userId = uId;
          localStorage.setItem('asbestos_user_id', uId);
          // Try to load previous session from server
          try {
            const res = await fetch('/sessions/' + uId);
            if (res.ok) {
              const session = await res.json();
              if (session.history && session.history.length > 0) {
                chatBody.innerHTML = ''; // Clear defaults
                session.history.forEach(turn => {
                  const role = turn.role === 'client' ? 'user' : 'bot';
                  addMessage(turn.text, role);
                });
              }
            }
          } catch (e) { 
            console.error("Failed to load session:", e); 
          }
        }
      }

      if (window.Clerk) initUser();
      else window.addEventListener('load', initUser);
      let isAutomating = false;
      let lastStepIndex = -1;

      // Matrix Rain Effect
      const ctx = matrixCanvas.getContext('2d');
      let columns;
      let drops = [];
      const fontSize = 16;
      const characters = '01ABCDEFGHIJKLMNOPQRSTUVWXYZｦｱｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ';

      function initMatrix() {
        matrixCanvas.width = matrixCanvas.parentElement.offsetWidth;
        matrixCanvas.height = matrixCanvas.parentElement.offsetHeight;
        columns = Math.floor(matrixCanvas.width / fontSize);
        drops = Array(columns).fill(1);
      }

      function drawMatrix() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
        ctx.fillStyle = '#10b981';
        ctx.font = fontSize + 'px monospace';
        for (let i = 0; i < drops.length; i++) {
          const text = characters[Math.floor(Math.random() * characters.length)];
          ctx.fillText(text, i * fontSize, drops[i] * fontSize);
          if (drops[i] * fontSize > matrixCanvas.height && Math.random() > 0.975) drops[i] = 0;
          drops[i]++;
        }
      }
      window.addEventListener('resize', initMatrix);
      initMatrix();
      setInterval(drawMatrix, 50);

      function renderHistory() {
        historyList.innerHTML = '';
        if (chatHistory.length === 0) {
          historyList.innerHTML = '<div class="history-item" style="color:var(--text-faded); cursor:default;">No past sessions</div>';
        }
        chatHistory.forEach(chat => {
          const item = document.createElement('div');
          item.className = 'history-item';
          item.textContent = chat.title;
          historyList.appendChild(item);
        });
      }
      renderHistory();

      function addMessage(text, role) {
        const msg = document.createElement('div');
        msg.className = 'message ' + role;
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.innerHTML = role === 'bot' 
          ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path></svg>'
          : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.textContent = text;
        msg.appendChild(avatar);
        msg.appendChild(bubble);
        chatBody.appendChild(msg);
        chatBody.scrollTop = chatBody.scrollHeight;
      }

      function showTyping() {
        const msg = document.createElement('div');
        msg.className = 'message bot typing';
        msg.id = 'typing-indicator';
        msg.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
        chatBody.appendChild(msg);
        chatBody.scrollTop = chatBody.scrollHeight;
      }

      function hideTyping() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
      }

      function showTerminalLine(text, color = 'var(--accent)') {
        const line = document.createElement('div');
        line.className = 'terminal-line';
        line.style.color = color;
        line.textContent = '> ' + text;
        terminalBody.appendChild(line);
        terminalBody.scrollTop = terminalBody.scrollHeight;
      }

      function startAutomationPolling() {
        if (isAutomating) return;
        isAutomating = true;
        automationOverlay.style.display = 'flex';
        initMatrix();
        
        const poll = setInterval(async () => {
          try {
            const res = await fetch(\`/sessions/\${userId}\`);
            const data = await res.json();
            
            if (data.auditTrail) {
              data.auditTrail.forEach((step, index) => {
                if (index > lastStepIndex) {
                  if (step.action === 'automation_step_started') {
                    showTerminalLine(\`EXECUTING: \${step.detail.stepName}...\`);
                  } else if (step.action === 'automation_step_completed') {
                    showTerminalLine(\`COMPLETED: \${step.detail.stepName}\`, '#27c93f');
                  } else if (step.action === 'automation_failed') {
                    showTerminalLine(\`CRITICAL ERROR: \${step.detail.error}\`, '#ff5f56');
                  }
                  lastStepIndex = index;
                }
              });
            }

            if (data.state !== 'SUBMITTING' && data.state !== 'PAYMENT_CONFIRMED') {
              clearInterval(poll);
              isAutomating = false;
              setTimeout(() => {
                automationOverlay.style.display = 'none';
                addMessage("Automation phase completed. Please check the chat for the next steps or payment details.", "bot");
              }, 3000);
            }
          } catch (err) { console.error(err); }
        }, 2000);
      }

      async function sendMessage(text) {
        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, userId })
          });
          const data = await res.json();
          
          if (data.ok) {
            hideTyping();
            addMessage(data.text, 'bot');
            if (data.state === 'SUBMITTING') {
              startAutomationPolling();
            }
            if (data.userId && !userId) {
              userId = data.userId;
              localStorage.setItem('asbestos_user_id', userId);
              chatHistory.unshift({ title: text.slice(0, 30) + '...' });
              localStorage.setItem('asbestos_history', JSON.stringify(chatHistory));
              renderHistory();
            }
          } else {
            hideTyping();
            let errMsg = 'Unknown error';
            if (data.error) {
               errMsg = typeof data.error === 'object' ? (data.error.message || JSON.stringify(data.error)) : String(data.error);
            }
            addMessage('Error: ' + errMsg, 'bot');
          }
        } catch (err) {
          addMessage('Network error. Please try again.', 'bot');
        }
      }

      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (!text) return;
        addMessage(text, 'user');
        chatInput.value = '';
        showTyping();
        sendMessage(text);
      });
    </script>
  </body>
</html>`;
}
