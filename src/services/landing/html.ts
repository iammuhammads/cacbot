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
    <title>Chat | TerraNile Agent</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
      :root {
        --bg-main: #f0fdf4; /* Very light green */
        --bg-sidebar: #064e3b; /* Very dark green */
        --bg-panel: #ffffff;
        --text-main: #0f172a;
        --text-muted: #64748b;
        --accent: #10b981; /* Emerald */
        --accent-dark: #059669;
        --border: #e2e8f0;
      }

      * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }

      body {
        display: flex;
        height: 100vh;
        overflow: hidden;
        background: var(--bg-main);
      }

      /* Sidebar */
      .sidebar {
        width: 260px;
        background: var(--bg-sidebar);
        color: white;
        display: flex;
        flex-direction: column;
        padding: 16px;
      }

      .new-chat {
        display: flex;
        align-items: center;
        gap: 10px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        color: white;
        padding: 12px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        transition: background 0.2s;
      }
      .new-chat:hover { background: rgba(255,255,255,0.2); }

      .history {
        margin-top: 24px;
        flex: 1;
        overflow-y: auto;
      }
      .history-item {
        padding: 10px;
        border-radius: 6px;
        color: #d1fae5;
        font-size: 0.9rem;
        cursor: pointer;
        margin-bottom: 4px;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .history-item:hover { background: rgba(255,255,255,0.1); }

      .sidebar-footer {
        margin-top: auto;
        padding-top: 16px;
        border-top: 1px solid rgba(255,255,255,0.1);
      }
      .back-home {
        color: #a7f3d0; text-decoration: none; font-size: 0.9rem;
        display: flex; align-items: center; gap: 8px;
      }

      /* Chat Main Area */
      .chat-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        background: var(--bg-panel);
        border-top-left-radius: 24px;
        border-bottom-left-radius: 24px;
        box-shadow: -4px 0 24px rgba(0,0,0,0.05);
      }

      .chat-header {
        padding: 20px 32px;
        border-bottom: 1px solid var(--border);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .chat-title { font-weight: 600; color: var(--text-main); }
      .agent-status { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--accent-dark); background: #d1fae5; padding: 4px 12px; border-radius: 100px; font-weight: 500; }
      .dot { width: 6px; height: 6px; background: var(--accent); border-radius: 50%; animation: blink 2s infinite; }
      @keyframes blink { 50% { opacity: 0.3; } }

      .messages {
        flex: 1;
        overflow-y: auto;
        padding: 32px;
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .message {
        display: flex;
        gap: 16px;
        max-width: 800px;
        margin: 0 auto;
        width: 100%;
      }
      .message.user { flex-direction: row-reverse; }

      .avatar {
        width: 36px; height: 36px;
        border-radius: 10px;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      }
      .bot .avatar { background: var(--accent); color: white; }
      .user .avatar { background: #cbd5e1; color: white; }

      .bubble {
        padding: 16px 20px;
        border-radius: 16px;
        font-size: 1rem;
        line-height: 1.6;
        color: var(--text-main);
        background: #f1f5f9;
      }
      .user .bubble {
        background: var(--accent);
        color: white;
      }

      /* Visual Loader */
      .loader-container {
        display: flex;
        flex-direction: column;
        gap: 8px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        padding: 16px;
        border-radius: 12px;
        width: 100%;
        max-width: 300px;
        margin-top: 8px;
      }
      .loader-text { font-size: 0.85rem; color: var(--accent-dark); font-weight: 500; display: flex; align-items: center; gap: 8px; }
      .loader-bar { width: 100%; height: 4px; background: #e2e8f0; border-radius: 4px; overflow: hidden; position: relative; }
      .loader-progress { position: absolute; left: 0; top: 0; bottom: 0; width: 30%; background: var(--accent); animation: loading 1.5s infinite ease-in-out; }
      @keyframes loading { 0% { left: -30%; } 100% { left: 100%; } }

      /* Input */
      .input-area {
        padding: 24px 32px;
        background: white;
      }
      .input-box {
        max-width: 800px;
        margin: 0 auto;
        background: #f8fafc;
        border: 1px solid var(--border);
        border-radius: 24px;
        padding: 12px 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      .input-box:focus-within {
        border-color: var(--accent);
        background: white;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1);
      }
      .input-box input {
        flex: 1; border: none; background: transparent; font-size: 1rem; color: var(--text-main); outline: none;
      }
      .send-btn {
        background: var(--text-main); color: white; border: none; width: 36px; height: 36px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s;
      }
      .send-btn:hover { background: var(--accent); transform: scale(1.05); }

    </style>
  </head>
  <body>

    <!-- Sidebar -->
    <div class="sidebar">
      <button class="new-chat" onclick="location.reload()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        New Registration
      </button>
      <div class="history" id="historyList"></div>
      <div class="sidebar-footer">
        <a href="/" class="back-home">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Back to Homepage
        </a>
      </div>
    </div>

    <!-- Main Chat -->
    <div class="chat-container">
      <div class="chat-header">
        <div class="chat-title">Asbestos Assistant</div>
        <div class="agent-status"><div class="dot"></div> Agent Ready</div>
      </div>
      
      <div class="messages" id="chatBody">
        <div class="message bot">
          <div class="avatar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path></svg></div>
          <div class="bubble">Hello! I am Asbestos, your Elite Registration Agent. Are you looking to register a Business Name, a Company, or Incorporated Trustees?</div>
        </div>
      </div>

      <div class="input-area">
        <form class="input-box" id="chatForm">
          <input type="text" id="chatInput" placeholder="Message Asbestos..." required autocomplete="off">
          <button type="submit" class="send-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </form>
      </div>
    </div>

    <script>
      const chatBody = document.getElementById('chatBody');
      const chatForm = document.getElementById('chatForm');
      const chatInput = document.getElementById('chatInput');
      const historyList = document.getElementById('historyList');

      let userId = localStorage.getItem('asbestos_user_id') || null;
      let chatHistory = JSON.parse(localStorage.getItem('asbestos_history')) || [];

      function renderHistory() {
        historyList.innerHTML = '';
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
          ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path></svg>'
          : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
        
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.textContent = text;
        
        msg.appendChild(avatar);
        msg.appendChild(bubble);
        chatBody.appendChild(msg);
        chatBody.scrollTop = chatBody.scrollHeight;
      }

      function showLoader() {
        const msg = document.createElement('div');
        msg.className = 'message bot';
        msg.id = 'tempLoader';
        
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path></svg>';
        
        const loader = document.createElement('div');
        loader.className = 'loader-container';
        loader.innerHTML = \`
          <div class="loader-text">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
            Asbestos is processing...
          </div>
          <div class="loader-bar"><div class="loader-progress"></div></div>
        \`;
        
        msg.appendChild(avatar);
        msg.appendChild(loader);
        chatBody.appendChild(msg);
        chatBody.scrollTop = chatBody.scrollHeight;

        const style = document.createElement('style');
        style.textContent = '@keyframes spin { 100% { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }';
        document.head.appendChild(style);
      }

      function removeLoader() {
        const loader = document.getElementById('tempLoader');
        if (loader) loader.remove();
      }

      async function sendMessage(text) {
        showLoader();
        
        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, userId })
          });
          const data = await res.json();
          removeLoader();
          
          if (data.ok) {
            addMessage(data.text, 'bot');
            if (data.userId && !userId) {
              userId = data.userId;
              localStorage.setItem('asbestos_user_id', userId);
              chatHistory.unshift({ title: text.slice(0, 30) + '...' });
              localStorage.setItem('asbestos_history', JSON.stringify(chatHistory));
              renderHistory();
            }
          } else {
            addMessage('Error: ' + (data.error || 'Unknown error'), 'bot');
          }
        } catch (err) {
          removeLoader();
          addMessage('Network error. Please try again.', 'bot');
        }
      }

      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (!text) return;
        
        addMessage(text, 'user');
        chatInput.value = '';
        sendMessage(text);
      });
    </script>
  </body>
</html>`;
}
