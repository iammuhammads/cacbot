import { env } from "../../config/env.js";

export function renderLandingPage(env: any): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>TerraNile | Asbestos AI Agent</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
      :root {
        --bg-main: #f8fafc;
        --text-main: #0f172a;
        --text-muted: #64748b;
        --accent: #4f46e5;
        --accent-gradient: linear-gradient(135deg, #4f46e5 0%, #9333ea 100%);
        --glass-bg: rgba(255, 255, 255, 0.7);
        --glass-border: rgba(255, 255, 255, 0.4);
        --shadow-sm: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        --shadow-lg: 0 20px 40px -10px rgba(79, 70, 229, 0.15);
      }

      * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Outfit', sans-serif; }

      body {
        background: var(--bg-main);
        background-image: 
          radial-gradient(at 0% 0%, rgba(79, 70, 229, 0.15) 0px, transparent 50%),
          radial-gradient(at 100% 0%, rgba(147, 51, 234, 0.15) 0px, transparent 50%);
        background-attachment: fixed;
        color: var(--text-main);
        min-height: 100vh;
        overflow-x: hidden;
      }

      /* Floating Navbar */
      .navbar {
        position: fixed;
        top: 24px;
        left: 50%;
        transform: translateX(-50%);
        width: 90%;
        max-width: 1200px;
        background: var(--glass-bg);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid var(--glass-border);
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
        font-size: 1.4rem;
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--text-main);
        text-decoration: none;
        letter-spacing: -0.5px;
      }

      .nav-brand svg { color: var(--accent); }

      .nav-links {
        display: flex;
        gap: 24px;
        align-items: center;
      }

      .history-btn {
        background: transparent;
        border: none;
        color: var(--text-muted);
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.95rem;
        transition: color 0.2s;
      }
      .history-btn:hover { color: var(--accent); }

      .btn-login {
        background: var(--text-main);
        color: white;
        padding: 10px 20px;
        border-radius: 100px;
        font-weight: 600;
        font-size: 0.95rem;
        text-decoration: none;
        transition: all 0.3s;
      }
      .btn-login:hover {
        background: var(--accent);
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
      }

      /* Layout */
      .container {
        max-width: 1300px;
        margin: 0 auto;
        padding: 140px 24px 60px;
        display: grid;
        grid-template-columns: 1fr 1.1fr;
        gap: 60px;
        align-items: center;
        min-height: 100vh;
      }

      @media (max-width: 968px) {
        .container { grid-template-columns: 1fr; padding-top: 120px; gap: 40px; }
      }

      /* Left Side: Marketing */
      .hero-content {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .tagline {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: rgba(79, 70, 229, 0.1);
        color: var(--accent);
        padding: 8px 16px;
        border-radius: 100px;
        font-weight: 600;
        font-size: 0.9rem;
        width: fit-content;
      }
      .pulse-dot {
        width: 8px; height: 8px;
        background: var(--accent);
        border-radius: 50%;
        animation: pulse 2s infinite;
      }
      @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(79, 70, 229, 0); } 100% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); } }

      .hero-title {
        font-size: 3.5rem;
        font-weight: 800;
        line-height: 1.1;
        letter-spacing: -1px;
      }
      .hero-title span {
        background: var(--accent-gradient);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .hero-desc {
        font-size: 1.1rem;
        color: var(--text-muted);
        line-height: 1.6;
        max-width: 480px;
      }

      /* Carousel */
      .carousel-wrapper {
        margin-top: 20px;
        overflow-x: auto;
        display: flex;
        gap: 16px;
        padding-bottom: 20px;
        scrollbar-width: none;
      }
      .carousel-wrapper::-webkit-scrollbar { display: none; }

      .action-card {
        background: white;
        border: 1px solid rgba(0,0,0,0.05);
        padding: 20px;
        border-radius: 20px;
        min-width: 240px;
        cursor: pointer;
        transition: all 0.3s;
        box-shadow: var(--shadow-sm);
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .action-card:hover {
        transform: translateY(-5px);
        box-shadow: var(--shadow-lg);
        border-color: rgba(79, 70, 229, 0.3);
      }
      .action-icon {
        width: 40px; height: 40px;
        background: rgba(79, 70, 229, 0.1);
        border-radius: 12px;
        display: flex; align-items: center; justify-content: center;
        color: var(--accent);
      }
      .action-title { font-weight: 700; font-size: 1.1rem; }
      .action-desc { font-size: 0.9rem; color: var(--text-muted); }

      /* Right Side: AI Interface */
      .ai-interface {
        background: white;
        border-radius: 32px;
        box-shadow: var(--shadow-lg);
        height: 650px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,0.8);
        position: relative;
      }

      .ai-header {
        padding: 24px;
        border-bottom: 1px solid rgba(0,0,0,0.05);
        display: flex;
        align-items: center;
        gap: 16px;
        background: rgba(255,255,255,0.9);
        backdrop-filter: blur(10px);
        z-index: 10;
      }
      .ai-avatar {
        width: 48px; height: 48px;
        background: var(--accent-gradient);
        border-radius: 16px;
        display: flex; align-items: center; justify-content: center;
        color: white;
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
      }
      .ai-info h3 { font-weight: 700; font-size: 1.1rem; margin-bottom: 2px; }
      .ai-info p { font-size: 0.85rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
      .online-dot { width: 6px; height: 6px; background: #10b981; border-radius: 50%; }

      .chat-area {
        flex: 1;
        padding: 24px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 20px;
        background: #fafcff;
      }

      .message {
        display: flex;
        gap: 12px;
        max-width: 85%;
        opacity: 0;
        transform: translateY(10px);
        animation: msg-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      @keyframes msg-in { to { opacity: 1; transform: translateY(0); } }

      .message.user { align-self: flex-end; flex-direction: row-reverse; }
      
      .bubble {
        padding: 14px 18px;
        border-radius: 20px;
        font-size: 0.95rem;
        line-height: 1.5;
        box-shadow: 0 2px 5px rgba(0,0,0,0.02);
      }
      .message.bot .bubble {
        background: white;
        border: 1px solid rgba(0,0,0,0.05);
        border-top-left-radius: 4px;
      }
      .message.user .bubble {
        background: var(--text-main);
        color: white;
        border-top-right-radius: 4px;
      }
      
      .typing { color: var(--text-muted); font-style: italic; font-size: 0.9rem; display: none; }

      .input-area {
        padding: 24px;
        background: white;
        border-top: 1px solid rgba(0,0,0,0.05);
      }
      .input-wrapper {
        display: flex;
        align-items: center;
        background: var(--bg-main);
        border: 1px solid rgba(0,0,0,0.05);
        border-radius: 100px;
        padding: 8px 16px;
        transition: all 0.3s;
      }
      .input-wrapper:focus-within {
        border-color: var(--accent);
        box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
        background: white;
      }
      .chat-input {
        flex: 1;
        border: none;
        background: transparent;
        padding: 10px 8px;
        font-size: 1rem;
        outline: none;
        color: var(--text-main);
      }
      .send-btn {
        width: 40px; height: 40px;
        border-radius: 50%;
        background: var(--accent);
        border: none;
        color: white;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        transition: transform 0.2s;
      }
      .send-btn:hover { transform: scale(1.05); }

      /* Past Chats Overlay */
      .history-overlay {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(255,255,255,0.95);
        backdrop-filter: blur(10px);
        z-index: 50;
        padding: 24px;
        transform: translateY(100%);
        transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        display: flex;
        flex-direction: column;
      }
      .history-overlay.open { transform: translateY(0); }
      .history-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
      .close-history { background: transparent; border: none; cursor: pointer; color: var(--text-muted); }
      .history-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
      .history-item {
        padding: 16px;
        background: white;
        border: 1px solid rgba(0,0,0,0.05);
        border-radius: 12px;
        cursor: pointer;
        box-shadow: var(--shadow-sm);
        transition: all 0.2s;
      }
      .history-item:hover { border-color: var(--accent); transform: translateY(-2px); }
      .history-title { font-weight: 600; font-size: 0.95rem; margin-bottom: 4px; }
      .history-meta { font-size: 0.8rem; color: var(--text-muted); }

    </style>
  </head>
  <body>

    <!-- Floating Navbar -->
    <nav class="navbar">
      <a href="/" class="nav-brand">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
        TerraNile
      </a>
      <div class="nav-links">
        <button class="history-btn" onclick="document.getElementById('historyOverlay').classList.add('open')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          Past Sessions
        </button>
        <a class="btn-login auth-trigger" href="#">Client Portal</a>
      </div>
    </nav>

    <div class="container">
      
      <!-- Left: Marketing & Carousel -->
      <div class="hero-content">
        <div class="tagline">
          <div class="pulse-dot"></div>
          AI Registration Agent Online
        </div>
        
        <h1 class="hero-title">Meet <span>Asbestos.</span><br>Your legal fast-track.</h1>
        <p class="hero-desc">
          Skip the 20-page forms. Chat with our highly-trained AI agent to register your business, incorporate companies, and file annual returns instantly.
        </p>

        <!-- Carousel -->
        <div class="carousel-wrapper">
          <div class="action-card" onclick="triggerChat('I want to register a Business Name')">
            <div class="action-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            </div>
            <div class="action-title">Business Name</div>
            <div class="action-desc">Fast-tracked registration</div>
          </div>
          
          <div class="action-card" onclick="triggerChat('I want to incorporate a Limited Liability Company')">
            <div class="action-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>
            </div>
            <div class="action-title">LTD Company</div>
            <div class="action-desc">Full incorporation</div>
          </div>

          <div class="action-card" onclick="triggerChat('I need to file my Annual Returns')">
            <div class="action-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <div class="action-title">Annual Returns</div>
            <div class="action-desc">Stay compliant</div>
          </div>
        </div>
      </div>

      <!-- Right: AI Interface Terminal -->
      <div class="ai-interface">
        
        <!-- History Overlay Panel -->
        <div class="history-overlay" id="historyOverlay">
          <div class="history-header">
            <h3>Past Sessions</h3>
            <button class="close-history" onclick="document.getElementById('historyOverlay').classList.remove('open')">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div class="history-list" id="historyList">
            <!-- Dynamic past chats -->
          </div>
        </div>

        <!-- Chat Header -->
        <div class="ai-header">
          <div class="ai-avatar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path></svg>
          </div>
          <div class="ai-info">
            <h3>Asbestos</h3>
            <p><span class="online-dot"></span> Agent Online</p>
          </div>
        </div>

        <!-- Chat Body -->
        <div class="chat-area" id="chatBody">
          <div class="message bot">
            <div class="bubble">Hello! I am Asbestos, your Elite Registration Agent. Are you looking to register a Business Name, a Company, or Incorporated Trustees?</div>
          </div>
        </div>
        
        <div class="typing" id="typingIndicator" style="padding: 0 24px;">Asbestos is analyzing...</div>

        <!-- Input Area -->
        <div class="input-area">
          <form class="input-wrapper" id="chatForm">
            <input type="text" class="chat-input" id="chatInput" placeholder="Message Asbestos..." required autocomplete="off">
            <button type="submit" class="send-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </form>
        </div>

      </div>

    </div>

    <script
      async
      crossorigin="anonymous"
      data-clerk-publishable-key="${env.CLERK_PUBLISHABLE_KEY || ''}"
      src="https://proven-chow-42.clerk.accounts.dev/npm/@clerk/clerk-js@5/dist/clerk.browser.js"
      type="text/javascript"
    ></script>

    <script>
      const chatBody = document.getElementById('chatBody');
      const chatForm = document.getElementById('chatForm');
      const chatInput = document.getElementById('chatInput');
      const typingIndicator = document.getElementById('typingIndicator');
      const historyList = document.getElementById('historyList');

      let userId = localStorage.getItem('asbestos_user_id') || null;
      let chatHistory = JSON.parse(localStorage.getItem('asbestos_history')) || [];

      function renderHistory() {
        historyList.innerHTML = '';
        if (chatHistory.length === 0) {
          historyList.innerHTML = '<p style="color:var(--text-muted); font-size: 0.9rem;">No past sessions found.</p>';
          return;
        }
        chatHistory.forEach(chat => {
          const item = document.createElement('div');
          item.className = 'history-item';
          item.innerHTML = \`
            <div class="history-title">\${chat.title}</div>
            <div class="history-meta">\${new Date(chat.date).toLocaleDateString()}</div>
          \`;
          item.onclick = () => alert('Loading specific past chats is managed via your Client Portal Dashboard.');
          historyList.appendChild(item);
        });
      }
      renderHistory();

      function triggerChat(text) {
        chatInput.value = text;
        chatForm.dispatchEvent(new Event('submit'));
      }

      function addMessage(text, role) {
        const msg = document.createElement('div');
        msg.className = 'message ' + role;
        
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        bubble.textContent = text;
        
        msg.appendChild(bubble);
        chatBody.appendChild(msg);
        chatBody.scrollTop = chatBody.scrollHeight;
      }

      async function sendMessage(text) {
        typingIndicator.style.display = 'block';
        chatBody.scrollTop = chatBody.scrollHeight;
        
        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, userId })
          });
          const data = await res.json();
          typingIndicator.style.display = 'none';
          
          if (data.ok) {
            addMessage(data.text, 'bot');
            if (data.userId && !userId) {
              userId = data.userId;
              localStorage.setItem('asbestos_user_id', userId);
              chatHistory.unshift({ title: text.slice(0, 30) + '...', date: new Date().toISOString() });
              localStorage.setItem('asbestos_history', JSON.stringify(chatHistory));
              renderHistory();
            }
          } else {
            addMessage('Error: ' + (data.error || 'Unknown error'), 'bot');
          }
        } catch (err) {
          typingIndicator.style.display = 'none';
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

      // Clerk Auth Setup
      async function initClerkOnLanding() {
        try {
          await window.Clerk.load();
          document.querySelectorAll('.auth-trigger').forEach(el => {
            el.addEventListener('click', (e) => {
              if (!window.Clerk.user) {
                e.preventDefault();
                window.Clerk.openSignIn({ afterSignInUrl: '/dashboard' });
              } else {
                window.location.href = '/dashboard';
              }
            });
          });
        } catch (e) {
          console.error("Clerk Load Failed:", e);
        }
      }

      if (window.Clerk) initClerkOnLanding();
      else window.addEventListener('load', initClerkOnLanding);
    </script>
  </body>
</html>`;
}
