import { env } from "../../config/env.js";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderLandingPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Asbestos | AI Registration Agent by TerraNile</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"/>
    <style>
      :root {
        --bg: #ffffff;
        --text: #0f172a;
        --text-muted: #64748b;
        --accent: #6366f1;
        --accent-dark: #4f46e5;
        --border: #e2e8f0;
        --whatsapp: #25d366;
        --whatsapp-dark: #128c7e;
      }

      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: 'Inter', sans-serif;
        color: var(--text);
        background-color: var(--bg);
        line-height: 1.5;
        overflow-x: hidden;
      }

      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 24px;
      }

      /* Navbar */
      nav {
        padding: 24px 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--border);
      }

      .logo-container {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .logo-text {
        font-weight: 800;
        font-size: 1.5rem;
        letter-spacing: -0.02em;
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

      .nav-links a:hover { color: var(--text); }

      /* Hero Section */
      .hero {
        padding: 80px 0;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 60px;
        align-items: center;
      }

      h1 {
        font-size: 3.5rem;
        font-weight: 800;
        line-height: 1.1;
        margin: 0 0 24px;
        letter-spacing: -0.04em;
      }

      .hero-p {
        font-size: 1.25rem;
        color: var(--text-muted);
        margin-bottom: 40px;
        max-width: 500px;
      }

      .btn {
        padding: 16px 32px;
        border-radius: 12px;
        font-weight: 700;
        font-size: 1.1rem;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        transition: all 0.2s;
        cursor: pointer;
        border: none;
      }

      .btn-primary {
        background-color: var(--text);
        color: white;
      }

      .btn-primary:hover {
        background-color: #000;
        transform: translateY(-2px);
      }

      /* WhatsApp Simulation */
      .phone-frame {
        width: 320px;
        height: 600px;
        background: #000;
        border-radius: 40px;
        padding: 12px;
        box-shadow: 0 40px 100px rgba(0,0,0,0.15);
        margin: 0 auto;
        position: relative;
        overflow: hidden;
      }

      .phone-screen {
        width: 100%;
        height: 100%;
        background: #efe7de; /* WhatsApp background color */
        border-radius: 30px;
        overflow-y: auto;
        padding: 20px 12px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .chat-bubble {
        max-width: 85%;
        padding: 10px 14px;
        border-radius: 12px;
        font-size: 0.85rem;
        position: relative;
        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        animation: fadeInUp 0.5s ease backwards;
      }

      .bubble-client {
        align-self: flex-end;
        background-color: #dcf8c6;
        border-top-right-radius: 2px;
      }

      .bubble-asbestos {
        align-self: flex-start;
        background-color: #ffffff;
        border-top-left-radius: 2px;
      }

      .typing-indicator {
        font-size: 0.75rem;
        color: var(--text-muted);
        font-style: italic;
        margin-left: 10px;
      }

      /* Proof Grid */
      .proof-section {
        padding: 80px 0;
        background: #f8fafc;
      }

      .section-header {
        text-align: center;
        margin-bottom: 60px;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 32px;
      }

      .card {
        background: white;
        padding: 32px;
        border-radius: 20px;
        border: 1px solid var(--border);
        transition: transform 0.2s;
      }

      .card:hover { transform: translateY(-5px); }

      .card h3 { margin: 0 0 12px; font-weight: 700; }
      .card p { color: var(--text-muted); margin: 0; font-size: 0.95rem; }

      .badge {
        display: inline-block;
        padding: 4px 12px;
        background: rgba(99, 102, 241, 0.1);
        color: var(--accent);
        border-radius: 999px;
        font-weight: 700;
        font-size: 0.75rem;
        text-transform: uppercase;
        margin-bottom: 16px;
      }

      /* Trust Section */
      .trust-strip {
        padding: 40px 0;
        border-top: 1px solid var(--border);
        border-bottom: 1px solid var(--border);
        display: flex;
        justify-content: space-around;
        align-items: center;
        flex-wrap: wrap;
        gap: 24px;
      }

      .trust-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        color: var(--text-muted);
      }

      /* Footer */
      footer {
        padding: 60px 0;
        text-align: center;
        color: var(--text-muted);
        font-size: 0.9rem;
      }

      .terranile-logo {
         margin-bottom: 12px;
         opacity: 0.8;
      }

      /* How it Works */
      .how-it-works {
        padding: 100px 0;
        text-align: center;
      }

      .step-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 40px;
        margin-top: 60px;
      }

      .step {
        position: relative;
      }

      .step-num {
        width: 40px;
        height: 40px;
        background: var(--text);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        margin: 0 auto 20px;
      }

      /* Pricing */
      .pricing {
        padding: 100px 0;
        background: #0f172a;
        color: white;
      }

      .pricing-card {
        max-width: 400px;
        margin: 0 auto;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        padding: 48px;
        border-radius: 24px;
        text-align: center;
        backdrop-filter: blur(10px);
      }

      /* FAQ */
      .faq {
        padding: 100px 0;
      }

      .faq-item {
        border-bottom: 1px solid var(--border);
        padding: 24px 0;
      }

      .faq-q {
        font-weight: 700;
        font-size: 1.1rem;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .faq-a {
        margin-top: 16px;
        color: var(--text-muted);
        display: none;
      }

      /* Lead Form */
      .cta-footer {
        padding: 80px 40px;
        background: var(--accent);
        border-radius: 32px;
        color: white;
        text-align: center;
        margin-bottom: 80px;
      }

      #lead-form {
        display: flex;
        gap: 12px;
        max-width: 500px;
        margin: 32px auto 0;
      }

      .form-input {
        flex: 1;
        padding: 16px;
        border-radius: 12px;
        border: none;
        font-family: inherit;
        font-size: 1rem;
      }

      @media (max-width: 900px) {
        .hero { grid-template-columns: 1fr; text-align: center; }
        .hero-p { margin: 0 auto 40px; }
        .grid, .step-grid { grid-template-columns: 1fr; }
        h1 { font-size: 2.5rem; }
        #lead-form { flex-direction: column; }
      }

      /* Chat Animation delays */
      .msg-1 { animation-delay: 1s; }
      .msg-2 { animation-delay: 3s; }
      .msg-3 { animation-delay: 5s; }
      .msg-4 { animation-delay: 7s; }
      .msg-5 { animation-delay: 9s; }
    </style>
  </head>
  <body>
    <div class="container">
      <nav>
        <div class="logo-container">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text)"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          <span class="logo-text">Asbestos</span>
        </div>
        <div class="nav-links">
          <a href="#demo">Demo</a>
          <a href="#services">Services</a>
          <a href="#pricing">Pricing</a>
          <a href="/dashboard" class="btn btn-primary auth-trigger" style="padding: 10px 20px; font-size: 0.9rem;">Launch Dashboard</a>
        </div>
      </nav>

      <section class="hero">
        <div class="animate__animated animate__fadeInLeft">
          <div class="badge">Your AI Registration Agent</div>
          <h1>Register businesses on CAC automatically through WhatsApp.</h1>
          <p class="hero-p">Asbestos is the intelligent layer between your clients and the CAC portal. Automate data intake, document collection, and filings without lifting a finger.</p>
          <a href="/dashboard" class="btn btn-primary auth-trigger">
            Start Automating Registrations
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
        
        <div class="animate__animated animate__fadeInRight" id="demo">
          <div class="phone-frame">
            <div class="phone-screen">
              <div class="chat-bubble bubble-client msg-1">I want to register my hair salon business.</div>
              <div class="chat-bubble bubble-asbestos msg-2">I can help with that. Is it a Business Name (Enterprise) or a Limited Company?</div>
              <div class="chat-bubble bubble-client msg-3">A Limited company pls.</div>
              <div class="chat-bubble bubble-asbestos msg-4">Great. What are the name options you're considering? (Provide at least two).</div>
              <div class="chat-bubble bubble-client msg-5">1. StyleFix Ltd<br>2. GlamourHair Global</div>
              <div class="chat-bubble bubble-asbestos" style="background:#f1f5f9; border:1px solid #e2e8f0; animation-delay: 11s;">
                 <div style="font-weight:700; font-size:0.7rem; color:var(--accent); margin-bottom:4px;">ASBESTOS SYSTEM</div>
                 Extracting Business Names...<br>
                 Validation: OK (No forbidden words)
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="trust-strip">
        <div class="trust-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--whatsapp)"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          Secure Data Handling
        </div>
        <div class="trust-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--whatsapp)"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          Built for High-Volume Agents
        </div>
        <div class="trust-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--whatsapp)"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          Retry-Safe Automation
        </div>
      </section>

      <section class="how-it-works">
        <h2 style="font-size: 2.5rem; font-weight: 800; letter-spacing:-0.03em;">How Asbestos Works.</h2>
        <div class="step-grid">
          <div class="step">
            <div class="step-num">1</div>
            <h3 style="font-weight:700;">Set your Agent Prompt</h3>
            <p style="color:var(--text-muted);">Configure how Asbestos talks to your clients and what documents it should collect.</p>
          </div>
          <div class="step">
            <div class="step-num">2</div>
            <h3 style="font-weight:700;">Connect your Link</h3>
            <p style="color:var(--text-muted);">Share your unique WhatsApp registration link with your customers.</p>
          </div>
          <div class="step">
            <div class="step-num">3</div>
            <h3 style="font-weight:700;">Collect your Fee</h3>
            <p style="color:var(--text-muted);">The AI completes the intake—you just review the summary and submit to CAC.</p>
          </div>
        </div>
      </section>

      <section class="proof-section" id="services">
        <div class="section-header">
          <h2 style="font-size: 2.5rem; font-weight: 800; letter-spacing:-0.03em;">One Agent, Multiple Services.</h2>
          <p style="color:var(--text-muted); font-size: 1.1rem;">Scale beyond CAC with unified intake for all Nigerian compliance filings.</p>
        </div>
        <div class="grid">
          <div class="card">
            <div class="badge">Available</div>
            <h3>CAC Registration</h3>
            <p>End-to-end data intake and automated portal submission for BN, Ltd, and Incorporated Trustees.</p>
          </div>
          <div class="card">
            <div class="badge" style="background:rgba(16, 185, 129, 0.1); color:#10b981;">Coming Soon</div>
            <h3>SCUML / EFCC</h3>
            <p>Automated compliance filings for designated non-financial businesses and special control units.</p>
          </div>
          <div class="card">
            <div class="badge">In Beta</div>
            <h3>Annual Returns</h3>
            <p>Keep your businesses in good standing with automated yearly filing reminders and execution.</p>
          </div>
        </div>
      </section>

      <section class="pricing" id="pricing">
        <div class="pricing-card">
          <div class="badge" style="background:var(--accent); color:white;">BETA PRICING</div>
          <h2 style="font-size: 2.5rem; margin: 16px 0;">Agent Plan</h2>
          <div style="font-size: 1.1rem; color: rgba(255,255,255,0.7); margin-bottom: 32px;">
            Unlimited automated intake<br>
            Advanced Persona Editor<br>
            Automated CAC Submissions
          </div>
          <a href="/dashboard" class="btn btn-primary auth-trigger" style="background: white; color: black; width: 100%; justify-content: center;">Get Started Now</a>
        </div>
      </section>

      <section class="faq">
        <h2 style="text-align:center; font-size: 2rem; margin-bottom: 40px;">Common Questions.</h2>
        <div class="faq-item">
          <div class="faq-q">Is my data secure? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></div>
          <div class="faq-a" style="display:block;">Yes. Asbestos uses end-to-end encryption for all data storage. Your client IDs and personal info are never shared with third parties.</div>
        </div>
        <div class="faq-item">
          <div class="faq-q">How does AI handle payments? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></div>
          <div class="faq-a" style="display:block;">The agent generates the RRR on the CAC portal. You can then review it and send the invoice to your client directly.</div>
        </div>
      </section>

      <div class="cta-footer animate__animated animate__pulse animate__infinite">
        <h2>Stay in the loop.</h2>
        <p>Get notified when we launch new filing types (SCUML, EFCC).</p>
        <form id="lead-form">
          <input type="email" class="form-input" placeholder="Enter your business email..." required>
          <button type="submit" class="btn btn-primary" style="background:black;">Keep me updated</button>
        </form>
        <div id="form-msg" style="margin-top:16px; font-weight:600; display:none;">Thanks! We'll be in touch.</div>
      </div>

      <footer>
        <div class="logo-container" style="justify-content:center; margin-bottom:16px; flex-direction:column;">
          <small style="color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:8px;">A Product of</small>
          <div style="font-weight:800; font-size:1.5rem; letter-spacing:-0.04em; color:var(--text);">TerraNile</div>
        </div>
        <p>&copy; 2026 TerraNile Ltd. All rights reserved.</p>
      </footer>
    </div>

    <script
      async
      crossorigin="anonymous"
      data-clerk-publishable-key="${env.CLERK_PUBLISHABLE_KEY || ''}"
      src="https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js"
      type="text/javascript"
    ></script>
    <script>
      async function initClerkOnLanding() {
        try {
          await window.Clerk.load();
          
          const triggers = document.querySelectorAll('.auth-trigger');
          triggers.forEach(el => {
            el.addEventListener('click', (e) => {
              if (!window.Clerk.user) {
                e.preventDefault();
                window.Clerk.openSignUp({
                   afterSignUpUrl: '/dashboard',
                   afterSignInUrl: '/dashboard'
                });
              }
            });
          });
        } catch (e) {
          console.error("Landing Clerk Load Failed:", e);
        }
      }

      if (window.Clerk) initClerkOnLanding();
      else window.addEventListener('load', initClerkOnLanding);

      const form = document.getElementById('lead-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = form.querySelector('input').value;
        const btn = form.querySelector('button');
        
        btn.disabled = true;
        btn.textContent = 'Saving...';
        
        try {
          const res = await fetch('/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          
          if (res.ok) {
            form.style.display = 'none';
            document.getElementById('form-msg').style.display = 'block';
          }
        } catch (err) {
          console.error('Failed to save lead', err);
          alert('Something went wrong. Please try again.');
          btn.disabled = false;
          btn.textContent = 'Keep me updated';
        }
      });
    </script>
  </body>
</html>\`;
}
