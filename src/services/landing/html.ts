import { env } from "../../config/env.js";

export function renderLandingPage(env: any): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Asbestos AI | TerraNile</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
      :root {
        --bg-main: #212121;
        --bg-sidebar: #171717;
        --bg-input: #2f2f2f;
        --text-main: #ececec;
        --text-muted: #b4b4b4;
        --accent: #6366f1;
        --accent-hover: #4f46e5;
        --border-color: rgba(255, 255, 255, 0.1);
      }

      * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }

      body {
        background-color: var(--bg-main);
        color: var(--text-main);
        height: 100vh;
        display: flex;
        overflow: hidden;
      }

      /* Navbar (Floating) */
      .navbar {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        width: 90%;
        max-width: 1200px;
        background: rgba(23, 23, 23, 0.6);
        backdrop-filter: blur(16px);
        border: 1px solid var(--border-color);
        border-radius: 100px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 24px;
        z-index: 1000;
        transition: all 0.4s ease;
      }

      .navbar.chat-mode {
        top: -100px; /* Hide navbar when in deep chat mode */
      }

      .nav-brand {
        font-weight: 700;
        font-size: 1.2rem;
        display: flex;
        align-items: center;
        gap: 8px;
        color: white;
        text-decoration: none;
      }

      .nav-links {
        display: flex;
        gap: 20px;
        align-items: center;
      }

      .btn-login {
        background: white;
        color: black;
        padding: 8px 16px;
        border-radius: 20px;
        font-weight: 600;
        font-size: 0.9rem;
        text-decoration: none;
        cursor: pointer;
      }

      /* Sidebar */
      .sidebar {
        width: 260px;
        background: var(--bg-sidebar);
        height: 100vh;
        flex-shrink: 0;
        padding: 20px;
        display: flex;
        flex-direction: column;
        transition: transform 0.3s ease;
        border-right: 1px solid var(--border-color);
        transform: translateX(-100%);
        position: absolute;
        z-index: 500;
      }

      .sidebar.active {
        transform: translateX(0);
        position: relative;
      }

      .new-chat-btn {
        display: flex;
        align-items: center;
        gap: 10px;
        background: transparent;
        color: white;
        border: 1px solid var(--border-color);
        padding: 12px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.95rem;
        font-weight: 500;
        margin-bottom: 20px;
        transition: background 0.2s;
      }

      .new-chat-btn:hover { background: rgba(255,255,255,0.05); }

      .history-list {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .history-item {
        color: var(--text-muted);
        font-size: 0.9rem;
        padding: 10px;
        border-radius: 6px;
        cursor: pointer;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .history-item:hover {
        background: rgba(255,255,255,0.05);
        color: white;
      }

      /* Main Content */
      .main-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        position: relative;
        height: 100vh;
      }

      /* Marketing View (Landing) */
      .marketing-view {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        transition: opacity 0.4s ease, transform 0.4s ease;
      }

      .marketing-view.hidden {
        opacity: 0;
        pointer-events: none;
        position: absolute;
        transform: translateY(-20px);
      }

      .hero-title {
        font-size: 2.5rem;
        font-weight: 700;
        margin-bottom: 40px;
        text-align: center;
      }

      /* Input Area */
      .input-container {
        width: 100%;
        max-width: 768px;
        background: var(--bg-input);
        border-radius: 24px;
        padding: 8px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 0 15px rgba(0,0,0,0.1);
        margin: 0 auto;
        transition: all 0.4s ease;
      }

      .chat-mode .input-container {
        margin-bottom: 40px;
      }

      .chat-input {
        flex: 1;
        background: transparent;
        border: none;
        color: white;
        font-size: 1rem;
        padding: 12px 0;
        outline: none;
      }

      .chat-input::placeholder { color: var(--text-muted); }

      .send-btn {
        background: white;
        color: black;
        border: none;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.2s;
      }

      .send-btn:hover { transform: scale(1.05); }

      /* Carousel */
      .features-carousel {
        display: flex;
        gap: 16px;
        margin-top: 60px;
        max-width: 800px;
        overflow-x: auto;
        padding-bottom: 20px;
        scrollbar-width: none;
      }
      .features-carousel::-webkit-scrollbar { display: none; }

      .feature-card {
        background: var(--bg-sidebar);
        border: 1px solid var(--border-color);
        padding: 16px 20px;
        border-radius: 16px;
        min-width: 220px;
        font-size: 0.9rem;
        color: var(--text-muted);
        cursor: pointer;
        transition: background 0.2s;
      }
      .feature-card:hover { background: var(--bg-input); color: white; }
      .feature-title { font-weight: 600; color: white; margin-bottom: 4px; display: block; }

      /* Chat View */
      .chat-view {
        flex: 1;
        display: flex;
        flex-direction: column;
        opacity: 0;
        pointer-events: none;
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        padding-top: 60px;
      }

      .chat-view.active {
        opacity: 1;
        pointer-events: all;
        position: relative;
      }

      .messages-area {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 24px;
        max-width: 768px;
        margin: 0 auto;
        width: 100%;
      }

      .message {
        display: flex;
        gap: 16px;
        max-width: 100%;
      }

      .message.user { justify-content: flex-end; }
      
      .message-avatar {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: var(--accent);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .message.user .message-avatar { display: none; }

      .message-bubble {
        padding: 12px 16px;
        border-radius: 18px;
        font-size: 1rem;
        line-height: 1.5;
        max-width: 85%;
      }

      .message.user .message-bubble {
        background: var(--bg-input);
        color: white;
        border-bottom-right-radius: 4px;
      }

      .message.bot .message-bubble {
        background: transparent;
        color: var(--text-main);
      }

      .typing-indicator {
        display: none;
        padding: 12px 16px;
        color: var(--text-muted);
        font-style: italic;
      }

      /* Mobile tweaks */
      @media (max-width: 768px) {
        .sidebar { position: fixed; box-shadow: 2px 0 10px rgba(0,0,0,0.5); }
      }
    </style>
  </head>
  <body>

    <!-- Sidebar (History) -->
    <div class="sidebar" id="sidebar">
      <button class="new-chat-btn" onclick="startNewChat()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
        New Registration
      </button>
      <div class="history-list" id="historyList">
        <!-- JS will populate past chats here -->
      </div>
    </div>

    <main class="main-content">
      
      <!-- Floating Navbar -->
      <nav class="navbar" id="navbar">
        <a href="/" class="nav-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
          Asbestos AI
        </a>
        <div class="nav-links">
          <a class="btn-login auth-trigger" href="#">Sign In</a>
        </div>
      </nav>

      <!-- Marketing View (Hero & Carousel) -->
      <div class="marketing-view" id="marketingView">
        <h1 class="hero-title">What can I help you register today?</h1>
        
        <form class="input-container" id="heroForm">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b4b4b4" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          <input type="text" class="chat-input" id="heroInput" placeholder="Message Asbestos..." required autocomplete="off">
          <button type="submit" class="send-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
          </button>
        </form>

        <div class="features-carousel">
          <div class="feature-card" onclick="document.getElementById('heroInput').value='I want to register a Business Name'; document.getElementById('heroForm').dispatchEvent(new Event('submit'));">
            <span class="feature-title">Register a Business</span>
            Fast tracked BN registration
          </div>
          <div class="feature-card" onclick="document.getElementById('heroInput').value='I want to incorporate a Limited Liability Company'; document.getElementById('heroForm').dispatchEvent(new Event('submit'));">
            <span class="feature-title">Incorporate a Company</span>
            Full LTD incorporation
          </div>
          <div class="feature-card" onclick="document.getElementById('heroInput').value='I need to file my Annual Returns'; document.getElementById('heroForm').dispatchEvent(new Event('submit'));">
            <span class="feature-title">Annual Returns</span>
            Stay compliant instantly
          </div>
        </div>
      </div>

      <!-- Chat View (Main App) -->
      <div class="chat-view" id="chatView">
        <div class="messages-area" id="chatBody">
          <!-- Messages will appear here -->
        </div>
        <div class="typing-indicator" id="typingIndicator">Asbestos is thinking...</div>
        
        <form class="input-container chat-mode" id="chatForm">
          <input type="text" class="chat-input" id="chatInput" placeholder="Message Asbestos..." required autocomplete="off">
          <button type="submit" class="send-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
          </button>
        </form>
      </div>

    </main>

    <script
      async
      crossorigin="anonymous"
      data-clerk-publishable-key="${env.CLERK_PUBLISHABLE_KEY || ''}"
      src="https://proven-chow-42.clerk.accounts.dev/npm/@clerk/clerk-js@5/dist/clerk.browser.js"
      type="text/javascript"
    ></script>

    <script>
      const marketingView = document.getElementById('marketingView');
      const chatView = document.getElementById('chatView');
      const sidebar = document.getElementById('sidebar');
      const navbar = document.getElementById('navbar');
      const chatBody = document.getElementById('chatBody');
      const typingIndicator = document.getElementById('typingIndicator');
      
      const heroForm = document.getElementById('heroForm');
      const heroInput = document.getElementById('heroInput');
      const chatForm = document.getElementById('chatForm');
      const chatInput = document.getElementById('chatInput');
      const historyList = document.getElementById('historyList');

      let userId = localStorage.getItem('asbestos_user_id') || null;
      let chatHistory = JSON.parse(localStorage.getItem('asbestos_history')) || [];

      // Load History Sidebar
      function renderHistory() {
        historyList.innerHTML = '';
        chatHistory.forEach((chat, index) => {
          const div = document.createElement('div');
          div.className = 'history-item';
          div.textContent = chat.title || 'New Registration';
          div.onclick = () => alert('Loading past chats will be fully available in the dashboard!');
          historyList.appendChild(div);
        });
      }
      renderHistory();

      function startNewChat() {
        chatBody.innerHTML = '';
        marketingView.classList.remove('hidden');
        chatView.classList.remove('active');
        sidebar.classList.remove('active');
        navbar.classList.remove('chat-mode');
        heroInput.value = '';
        heroInput.focus();
      }

      function transitionToChat(initialText) {
        marketingView.classList.add('hidden');
        chatView.classList.add('active');
        sidebar.classList.add('active');
        navbar.classList.add('chat-mode');
        
        if (initialText) {
          addMessage(initialText, 'user');
          sendMessage(initialText);
        }
      }

      function addMessage(text, role) {
        const msg = document.createElement('div');
        msg.className = 'message ' + role;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"></path></svg>';
        
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        bubble.textContent = text;
        
        msg.appendChild(avatar);
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
              chatHistory.unshift({ title: text.slice(0, 25) + '...' });
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

      heroForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = heroInput.value.trim();
        if (!text) return;
        transitionToChat(text);
      });

      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (!text) return;
        addMessage(text, 'user');
        chatInput.value = '';
        sendMessage(text);
      });

      // Clerk Auth
      async function initClerkOnLanding() {
        try {
          await window.Clerk.load();
          document.querySelectorAll('.auth-trigger').forEach(el => {
            el.addEventListener('click', (e) => {
              if (!window.Clerk.user) {
                e.preventDefault();
                window.Clerk.openSignIn({
                   afterSignInUrl: '/dashboard'
                });
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
