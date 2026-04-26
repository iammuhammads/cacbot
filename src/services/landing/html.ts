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
    <title>Asbestos — AI-Powered CAC Registration Agent | TerraNile</title>
    <meta name="description" content="Automate CAC business registrations, post-incorporation changes, and annual returns through WhatsApp. Built for high-volume agents." />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
      :root {
        --bg: #fafbff;
        --bg-dark: #06080f;
        --text: #0c0f1a;
        --text-muted: #64748b;
        --text-light: #94a3b8;
        --accent: #6366f1;
        --accent-light: #818cf8;
        --accent-subtle: rgba(99, 102, 241, 0.06);
        --accent-glow: rgba(99, 102, 241, 0.15);
        --border: #e8ecf4;
        --border-dark: rgba(56, 68, 100, 0.25);
        --card-bg: #ffffff;
        --card-dark: rgba(15, 20, 38, 0.7);
        --whatsapp: #25d366;
        --success: #10b981;
        --warning: #f59e0b;
        --gradient-hero: linear-gradient(135deg, #6366f1 0%, #8b5cf6 30%, #a78bfa 60%, #c4b5fd 100%);
        --gradient-dark: linear-gradient(135deg, #06080f 0%, #0c1225 50%, #111832 100%);
        --gradient-glow: radial-gradient(ellipse at 50% 0%, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
      }

      * { box-sizing: border-box; margin: 0; padding: 0; }

      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        color: var(--text);
        background: var(--bg);
        line-height: 1.6;
        overflow-x: hidden;
        -webkit-font-smoothing: antialiased;
      }

      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 24px;
      }

      /* ─── Navbar ─── */
      .navbar {
        padding: 20px 0;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 100;
        background: rgba(250, 251, 255, 0.8);
        backdrop-filter: blur(20px);
        border-bottom: 1px solid rgba(232, 236, 244, 0.6);
        transition: all 0.3s;
      }

      .navbar .container {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .nav-logo {
        display: flex;
        align-items: center;
        gap: 10px;
        text-decoration: none;
        color: var(--text);
      }

      .nav-logo-icon {
        width: 34px;
        height: 34px;
        background: var(--gradient-hero);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
      }

      .nav-logo span {
        font-weight: 800;
        font-size: 1.25rem;
        letter-spacing: -0.03em;
      }

      .nav-links {
        display: flex;
        gap: 36px;
        align-items: center;
      }

      .nav-links a {
        text-decoration: none;
        color: var(--text-muted);
        font-weight: 500;
        font-size: 0.9rem;
        transition: color 0.2s;
      }

      .nav-links a:hover { color: var(--text); }

      .nav-cta {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 22px;
        background: var(--text);
        color: white !important;
        border-radius: 10px;
        font-weight: 600;
        font-size: 0.88rem;
        text-decoration: none;
        transition: all 0.2s;
      }

      .nav-cta:hover {
        background: #000;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      /* ─── Hero ─── */
      .hero {
        padding: 160px 0 100px;
        position: relative;
        overflow: hidden;
      }

      .hero::before {
        content: '';
        position: absolute;
        top: -200px;
        left: 50%;
        transform: translateX(-50%);
        width: 800px;
        height: 800px;
        background: radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%);
        pointer-events: none;
      }

      .hero-grid {
        display: grid;
        grid-template-columns: 1.1fr 0.9fr;
        gap: 60px;
        align-items: center;
      }

      .hero-tag {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 16px;
        background: var(--accent-subtle);
        color: var(--accent);
        border-radius: 100px;
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.02em;
        margin-bottom: 24px;
        border: 1px solid rgba(99, 102, 241, 0.12);
      }

      .hero-tag-dot {
        width: 6px;
        height: 6px;
        background: var(--accent);
        border-radius: 50%;
        animation: hero-pulse 2s infinite;
      }

      @keyframes hero-pulse {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 1; }
      }

      .hero h1 {
        font-size: 3.8rem;
        font-weight: 900;
        line-height: 1.05;
        letter-spacing: -0.045em;
        margin-bottom: 24px;
        color: var(--text);
      }

      .hero h1 .gradient-text {
        background: var(--gradient-hero);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .hero-desc {
        font-size: 1.15rem;
        color: var(--text-muted);
        max-width: 520px;
        margin-bottom: 40px;
        line-height: 1.7;
      }

      .hero-actions {
        display: flex;
        gap: 16px;
        align-items: center;
      }

      .btn-hero {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 16px 32px;
        border-radius: 14px;
        font-weight: 700;
        font-size: 1rem;
        text-decoration: none;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        border: none;
        cursor: pointer;
        font-family: inherit;
      }

      .btn-hero-primary {
        background: var(--text);
        color: white;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
      }

      .btn-hero-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
      }

      .btn-hero-ghost {
        background: transparent;
        color: var(--text-muted);
        border: 1px solid var(--border);
      }

      .btn-hero-ghost:hover {
        border-color: var(--accent);
        color: var(--accent);
      }

      /* ─── Phone Demo ─── */
      .phone-wrapper {
        display: flex;
        justify-content: center;
        perspective: 1000px;
      }

      .phone-frame {
        width: 300px;
        height: 580px;
        background: #1a1a2e;
        border-radius: 36px;
        padding: 10px;
        box-shadow:
          0 25px 80px rgba(0, 0, 0, 0.12),
          0 0 0 1px rgba(255, 255, 255, 0.08) inset;
        transform: rotateY(-5deg) rotateX(2deg);
        transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
      }

      .phone-frame:hover {
        transform: rotateY(0deg) rotateX(0deg);
      }

      .phone-notch {
        position: absolute;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        width: 120px;
        height: 24px;
        background: #1a1a2e;
        border-radius: 0 0 14px 14px;
        z-index: 10;
      }

      .phone-screen {
        width: 100%;
        height: 100%;
        background: #ece5dd;
        border-radius: 28px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .wa-header {
        background: #075e54;
        padding: 36px 16px 12px;
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .wa-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .wa-avatar svg {
        width: 16px;
        height: 16px;
      }

      .wa-name {
        color: white;
        font-weight: 600;
        font-size: 0.85rem;
      }

      .wa-status {
        color: rgba(255,255,255,0.6);
        font-size: 0.65rem;
      }

      .wa-chat {
        flex: 1;
        padding: 12px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 6px;
        background: url("data:image/svg+xml,%3Csvg width='80' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h80v80H0z' fill='%23ece5dd'/%3E%3Cpath d='M20 20h4v4h-4zm36 0h4v4h-4zm-18 36h4v4h-4z' fill='%23d5ccbe' opacity='0.3'/%3E%3C/svg%3E");
      }

      .wa-bubble {
        max-width: 82%;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 0.75rem;
        line-height: 1.4;
        box-shadow: 0 1px 2px rgba(0,0,0,0.08);
        opacity: 0;
        transform: translateY(10px);
        animation: bubbleIn 0.4s ease forwards;
      }

      .wa-bubble-out {
        align-self: flex-end;
        background: #dcf8c6;
        border-top-right-radius: 2px;
      }

      .wa-bubble-in {
        align-self: flex-start;
        background: white;
        border-top-left-radius: 2px;
      }

      .wa-bubble-system {
        align-self: center;
        background: rgba(99, 102, 241, 0.1);
        color: var(--accent);
        font-size: 0.65rem;
        font-weight: 700;
        padding: 4px 12px;
        border-radius: 100px;
        border: 1px solid rgba(99, 102, 241, 0.2);
      }

      .wa-bubble-time {
        font-size: 0.55rem;
        color: rgba(0,0,0,0.35);
        text-align: right;
        margin-top: 2px;
      }

      @keyframes bubbleIn {
        to { opacity: 1; transform: translateY(0); }
      }

      .msg-1 { animation-delay: 0.8s; }
      .msg-2 { animation-delay: 2.5s; }
      .msg-3 { animation-delay: 4.2s; }
      .msg-4 { animation-delay: 5.8s; }
      .msg-5 { animation-delay: 7.5s; }
      .msg-6 { animation-delay: 9s; }
      .msg-7 { animation-delay: 10.5s; }

      /* ─── Trust Strip ─── */
      .trust-section {
        padding: 48px 0;
        border-top: 1px solid var(--border);
        border-bottom: 1px solid var(--border);
      }

      .trust-grid {
        display: flex;
        justify-content: center;
        gap: 48px;
        flex-wrap: wrap;
      }

      .trust-item {
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--text-muted);
        font-weight: 600;
        font-size: 0.88rem;
      }

      .trust-icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* ─── How It Works ─── */
      .how-section {
        padding: 120px 0;
      }

      .section-tag {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 14px;
        background: var(--accent-subtle);
        color: var(--accent);
        border-radius: 100px;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        margin-bottom: 16px;
        border: 1px solid rgba(99, 102, 241, 0.1);
      }

      .section-title {
        font-size: 2.8rem;
        font-weight: 900;
        letter-spacing: -0.04em;
        line-height: 1.1;
        margin-bottom: 16px;
      }

      .section-desc {
        color: var(--text-muted);
        font-size: 1.08rem;
        max-width: 560px;
        margin-bottom: 60px;
      }

      .steps-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 32px;
        counter-reset: step;
      }

      .step-card {
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 36px 28px;
        position: relative;
        transition: all 0.25s;
        counter-increment: step;
      }

      .step-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.06);
        border-color: rgba(99, 102, 241, 0.2);
      }

      .step-num {
        width: 40px;
        height: 40px;
        background: var(--gradient-hero);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        color: white;
        font-size: 1rem;
        margin-bottom: 20px;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
      }

      .step-card h3 {
        font-size: 1.15rem;
        font-weight: 800;
        margin-bottom: 10px;
        letter-spacing: -0.02em;
      }

      .step-card p {
        color: var(--text-muted);
        font-size: 0.92rem;
        line-height: 1.6;
      }

      /* ─── Services ─── */
      .services-section {
        padding: 120px 0;
        background: var(--bg-dark);
        color: white;
        position: relative;
        overflow: hidden;
      }

      .services-section::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: var(--gradient-glow);
        pointer-events: none;
      }

      .services-section .section-tag {
        background: rgba(99, 102, 241, 0.12);
        border-color: rgba(99, 102, 241, 0.2);
      }

      .services-section .section-desc {
        color: rgba(255, 255, 255, 0.5);
      }

      .services-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 24px;
      }

      .service-card {
        background: var(--card-dark);
        backdrop-filter: blur(12px);
        border: 1px solid var(--border-dark);
        border-radius: 20px;
        padding: 32px 28px;
        transition: all 0.25s;
        position: relative;
        overflow: hidden;
      }

      .service-card:hover {
        transform: translateY(-4px);
        border-color: rgba(99, 102, 241, 0.35);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
      }

      .service-card::after {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        width: 100px;
        height: 100px;
        border-radius: 50%;
        filter: blur(60px);
        opacity: 0;
        transition: opacity 0.3s;
        pointer-events: none;
      }

      .service-card:hover::after { opacity: 0.15; }
      .service-card:nth-child(1)::after { background: var(--accent); }
      .service-card:nth-child(2)::after { background: var(--success); }
      .service-card:nth-child(3)::after { background: var(--warning); }
      .service-card:nth-child(4)::after { background: #ec4899; }
      .service-card:nth-child(5)::after { background: #06b6d4; }
      .service-card:nth-child(6)::after { background: #f97316; }

      .service-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 20px;
        font-size: 1.4rem;
      }

      .service-badge {
        display: inline-block;
        font-size: 0.6rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        padding: 3px 10px;
        border-radius: 6px;
        margin-bottom: 14px;
      }

      .service-badge-live {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
      }

      .service-badge-soon {
        background: rgba(245, 158, 11, 0.12);
        color: #fbbf24;
      }

      .service-badge-beta {
        background: rgba(99, 102, 241, 0.15);
        color: #a5b4fc;
      }

      .service-card h3 {
        font-size: 1.08rem;
        font-weight: 700;
        margin-bottom: 8px;
        color: white;
      }

      .service-card p {
        color: rgba(255, 255, 255, 0.45);
        font-size: 0.88rem;
        line-height: 1.5;
      }

      /* ─── Pricing ─── */
      .pricing-section {
        padding: 120px 0;
      }

      .pricing-section .section-title,
      .pricing-section .section-desc {
        text-align: center;
      }

      .pricing-section .section-desc {
        margin: 0 auto 60px;
      }

      .pricing-card {
        max-width: 480px;
        margin: 0 auto;
        background: var(--card-bg);
        border: 2px solid var(--border);
        border-radius: 24px;
        padding: 48px 40px;
        text-align: center;
        position: relative;
        overflow: hidden;
        transition: all 0.3s;
      }

      .pricing-card:hover {
        border-color: var(--accent);
        box-shadow: 0 0 0 4px var(--accent-glow), 0 20px 60px rgba(0, 0, 0, 0.06);
      }

      .pricing-card::before {
        content: '';
        position: absolute;
        top: -100px;
        right: -100px;
        width: 200px;
        height: 200px;
        background: radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%);
        pointer-events: none;
      }

      .pricing-label {
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--accent);
        margin-bottom: 8px;
      }

      .pricing-title {
        font-size: 1.8rem;
        font-weight: 800;
        letter-spacing: -0.03em;
        margin-bottom: 24px;
      }

      .pricing-features {
        list-style: none;
        text-align: left;
        margin-bottom: 36px;
      }

      .pricing-features li {
        padding: 10px 0;
        border-bottom: 1px solid var(--border);
        color: var(--text-muted);
        font-size: 0.92rem;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .pricing-features li:last-child { border-bottom: none; }

      .pricing-check {
        width: 20px;
        height: 20px;
        border-radius: 6px;
        background: rgba(16, 185, 129, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .btn-pricing {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        width: 100%;
        padding: 16px;
        background: var(--gradient-hero);
        color: white;
        border: none;
        border-radius: 14px;
        font-weight: 700;
        font-size: 1rem;
        cursor: pointer;
        font-family: inherit;
        text-decoration: none;
        transition: all 0.25s;
      }

      .btn-pricing:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(99, 102, 241, 0.35);
      }

      /* ─── FAQ ─── */
      .faq-section {
        padding: 100px 0;
        background: #f4f6fb;
      }

      .faq-section .section-title,
      .faq-section .section-desc {
        text-align: center;
      }

      .faq-section .section-desc {
        margin: 0 auto 48px;
      }

      .faq-list {
        max-width: 700px;
        margin: 0 auto;
      }

      .faq-item {
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 14px;
        margin-bottom: 12px;
        overflow: hidden;
        transition: all 0.2s;
      }

      .faq-item:hover {
        border-color: rgba(99, 102, 241, 0.2);
      }

      .faq-q {
        padding: 20px 24px;
        font-weight: 700;
        font-size: 0.95rem;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        user-select: none;
        transition: color 0.2s;
      }

      .faq-q:hover { color: var(--accent); }

      .faq-chevron {
        transition: transform 0.3s;
        flex-shrink: 0;
      }

      .faq-item.open .faq-chevron {
        transform: rotate(180deg);
      }

      .faq-a {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease;
      }

      .faq-item.open .faq-a {
        max-height: 200px;
      }

      .faq-a-inner {
        padding: 0 24px 20px;
        color: var(--text-muted);
        font-size: 0.9rem;
        line-height: 1.7;
      }

      /* ─── CTA Footer ─── */
      .cta-section {
        padding: 0 24px 100px;
      }

      .cta-card {
        background: var(--gradient-hero);
        border-radius: 28px;
        padding: 72px 48px;
        text-align: center;
        color: white;
        max-width: 900px;
        margin: 0 auto;
        position: relative;
        overflow: hidden;
      }

      .cta-card::before {
        content: '';
        position: absolute;
        top: -150px;
        right: -150px;
        width: 300px;
        height: 300px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 50%;
      }

      .cta-card h2 {
        font-size: 2.2rem;
        font-weight: 800;
        letter-spacing: -0.03em;
        margin-bottom: 12px;
      }

      .cta-card p {
        color: rgba(255,255,255,0.75);
        font-size: 1.05rem;
        margin-bottom: 36px;
      }

      #lead-form {
        display: flex;
        gap: 10px;
        max-width: 460px;
        margin: 0 auto;
      }

      .form-input {
        flex: 1;
        padding: 14px 18px;
        border-radius: 12px;
        border: 2px solid rgba(255, 255, 255, 0.2);
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(4px);
        color: white;
        font-family: inherit;
        font-size: 0.92rem;
        transition: all 0.2s;
      }

      .form-input::placeholder { color: rgba(255, 255, 255, 0.5); }
      .form-input:focus {
        outline: none;
        border-color: white;
        background: rgba(255, 255, 255, 0.15);
      }

      .btn-cta-submit {
        padding: 14px 28px;
        border-radius: 12px;
        background: white;
        color: var(--accent);
        font-weight: 700;
        font-size: 0.9rem;
        border: none;
        cursor: pointer;
        font-family: inherit;
        transition: all 0.2s;
        white-space: nowrap;
      }

      .btn-cta-submit:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      #form-msg {
        margin-top: 16px;
        font-weight: 600;
        display: none;
      }

      /* ─── Footer ─── */
      .site-footer {
        padding: 60px 0;
        text-align: center;
        border-top: 1px solid var(--border);
      }

      .footer-brand {
        font-size: 0.65rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--text-light);
        margin-bottom: 6px;
      }

      .footer-company {
        font-size: 1.4rem;
        font-weight: 800;
        letter-spacing: -0.03em;
        color: var(--text);
        margin-bottom: 12px;
      }

      .footer-copy {
        color: var(--text-light);
        font-size: 0.82rem;
      }

      /* ─── Responsive ─── */
      @media (max-width: 900px) {
        .hero { padding: 120px 0 60px; }
        .hero-grid { grid-template-columns: 1fr; text-align: center; }
        .hero-desc { margin: 0 auto 32px; }
        .hero-actions { justify-content: center; flex-wrap: wrap; }
        .hero h1 { font-size: 2.6rem; }
        .steps-grid, .services-grid { grid-template-columns: 1fr; }
        .section-title { font-size: 2rem; }
        .phone-wrapper { margin-top: 40px; }
        .phone-frame { transform: none; }
        .nav-links { gap: 20px; }
        #lead-form { flex-direction: column; }
        .cta-card { padding: 48px 24px; }
        .cta-card h2 { font-size: 1.6rem; }
      }

      @media (max-width: 600px) {
        .nav-links a:not(.nav-cta) { display: none; }
        .trust-grid { gap: 24px; justify-content: flex-start; }
      }

      /* ─── Scroll Animation ─── */
      .reveal {
        opacity: 0;
        transform: translateY(30px);
        transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .reveal.visible {
        opacity: 1;
        transform: translateY(0);
      }
    </style>
  </head>
  <body>

    <nav class="navbar" id="navbar">
      <div class="container">
        <a href="/" class="nav-logo">
          <div class="nav-logo-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          </div>
          <span>Asbestos</span>
        </a>
        <div class="nav-links">
          <a href="#how">How it Works</a>
          <a href="#services">Services</a>
          <a href="#pricing">Pricing</a>
          <a href="/dashboard" class="nav-cta auth-trigger">
            Launch Dashboard
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
      </div>
    </nav>

    <div class="container">
      <section class="hero">
        <div class="hero-grid">
          <div>
            <div class="hero-tag">
              <span class="hero-tag-dot"></span>
              AI Registration Agent
            </div>
            <h1>Register businesses on CAC <span class="gradient-text">automatically</span> via WhatsApp.</h1>
            <p class="hero-desc">Asbestos handles client intake, document collection, portal automation, and post-incorporation changes — so you can scale without hiring.</p>
            <div class="hero-actions">
              <a href="/dashboard" class="btn-hero btn-hero-primary auth-trigger">
                Start Automating
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </a>
              <a href="#how" class="btn-hero btn-hero-ghost">See how it works</a>
            </div>
          </div>

          <div class="phone-wrapper">
            <div class="phone-frame">
              <div class="phone-notch"></div>
              <div class="phone-screen">
                <div class="wa-header">
                  <div class="wa-avatar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                  </div>
                  <div>
                    <div class="wa-name">Asbestos Agent</div>
                    <div class="wa-status">online</div>
                  </div>
                </div>
                <div class="wa-chat">
                  <div class="wa-bubble wa-bubble-out msg-1">
                    I want to register my salon business
                    <div class="wa-bubble-time">10:31 AM</div>
                  </div>
                  <div class="wa-bubble wa-bubble-in msg-2">
                    I can help with that. Are you registering a Business Name or a Limited Company?
                    <div class="wa-bubble-time">10:31 AM</div>
                  </div>
                  <div class="wa-bubble wa-bubble-out msg-3">
                    Limited company pls
                    <div class="wa-bubble-time">10:32 AM</div>
                  </div>
                  <div class="wa-bubble wa-bubble-in msg-4">
                    Great choice. What name options are you considering? Please provide at least two.
                    <div class="wa-bubble-time">10:32 AM</div>
                  </div>
                  <div class="wa-bubble wa-bubble-out msg-5">
                    1. StyleFix Ltd<br>2. GlamourHair Global
                    <div class="wa-bubble-time">10:33 AM</div>
                  </div>
                  <div class="wa-bubble wa-bubble-system msg-6">
                    ✓ Names validated — no restricted words
                  </div>
                  <div class="wa-bubble wa-bubble-in msg-7">
                    Both names look good! Now I need the following: your email address, business address, and a proposed commencement date.
                    <div class="wa-bubble-time">10:33 AM</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <section class="trust-section">
      <div class="container">
        <div class="trust-grid">
          <div class="trust-item">
            <div class="trust-icon" style="background: rgba(16, 185, 129, 0.08);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            </div>
            End-to-End Encrypted
          </div>
          <div class="trust-item">
            <div class="trust-icon" style="background: rgba(99, 102, 241, 0.08);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
            </div>
            Built for High-Volume Agents
          </div>
          <div class="trust-item">
            <div class="trust-icon" style="background: rgba(245, 158, 11, 0.08);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
            </div>
            Retry-Safe Automation
          </div>
          <div class="trust-item">
            <div class="trust-icon" style="background: rgba(236, 72, 153, 0.08);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
            Multi-Agent Ready
          </div>
        </div>
      </div>
    </section>

    <div class="container">
      <section class="how-section reveal" id="how">
        <div class="section-tag">Workflow</div>
        <h2 class="section-title">Three steps. Zero manual work.</h2>
        <p class="section-desc">From client inquiry to CAC certificate — fully automated.</p>

        <div class="steps-grid">
          <div class="step-card">
            <div class="step-num">1</div>
            <h3>Configure Your Agent</h3>
            <p>Set your AI persona, connect WhatsApp, and define the documents you need from clients.</p>
          </div>
          <div class="step-card">
            <div class="step-num">2</div>
            <h3>Share Your Link</h3>
            <p>Give clients your WhatsApp registration link. The AI collects every detail — names, IDs, addresses, documents.</p>
          </div>
          <div class="step-card">
            <div class="step-num">3</div>
            <h3>Collect Your Fee</h3>
            <p>Asbestos submits to CAC, generates the RRR, and pauses for payment. You confirm, it finishes.</p>
          </div>
        </div>
      </section>
    </div>

    <section class="services-section reveal" id="services">
      <div class="container">
        <div class="section-tag">Full Lifecycle</div>
        <h2 class="section-title" style="color: white;">Beyond Registration.</h2>
        <p class="section-desc">Cover the entire company lifecycle — from day-one filing to annual compliance.</p>

        <div class="services-grid">
          <div class="service-card">
            <div class="service-icon" style="background: rgba(99, 102, 241, 0.12);">🏢</div>
            <div class="service-badge service-badge-live">Live</div>
            <h3>CAC Registration</h3>
            <p>Automated portal submission for Business Names, Companies (Ltd), and Incorporated Trustees.</p>
          </div>
          <div class="service-card">
            <div class="service-icon" style="background: rgba(16, 185, 129, 0.12);">🔄</div>
            <div class="service-badge service-badge-soon">Coming Soon</div>
            <h3>Post-Incorporation Changes</h3>
            <p>Change directors, shares, addresses, business names, and activities — all through WhatsApp.</p>
          </div>
          <div class="service-card">
            <div class="service-icon" style="background: rgba(245, 158, 11, 0.12);">📊</div>
            <div class="service-badge service-badge-beta">Beta</div>
            <h3>Annual Returns</h3>
            <p>Automated reminders and filing for yearly compliance. Never miss a deadline again.</p>
          </div>
          <div class="service-card">
            <div class="service-icon" style="background: rgba(236, 72, 153, 0.12);">🛡️</div>
            <div class="service-badge service-badge-soon">Coming Soon</div>
            <h3>SCUML / EFCC</h3>
            <p>Anti-money laundering registration for designated non-financial businesses and institutions.</p>
          </div>
          <div class="service-card">
            <div class="service-icon" style="background: rgba(6, 182, 212, 0.12);">📱</div>
            <div class="service-badge service-badge-live">Live</div>
            <h3>Smart Client Chat</h3>
            <p>AI handles all WhatsApp conversations — questions, follow-ups, document requests — 24/7.</p>
          </div>
          <div class="service-card">
            <div class="service-icon" style="background: rgba(249, 115, 22, 0.12);">📋</div>
            <div class="service-badge service-badge-live">Live</div>
            <h3>Agent Dashboard</h3>
            <p>Monitor all registrations, view conversations, retry failures, and manage payments in real-time.</p>
          </div>
        </div>
      </div>
    </section>

    <div class="container">
      <section class="pricing-section reveal" id="pricing">
        <div class="section-tag">Pricing</div>
        <h2 class="section-title">Built for agents who mean business.</h2>
        <p class="section-desc">Start for free during beta. Scale with confidence.</p>

        <div class="pricing-card">
          <div class="pricing-label">Beta Access</div>
          <div class="pricing-title">Agent Plan</div>
          <ul class="pricing-features">
            <li>
              <span class="pricing-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span>
              Unlimited automated intake
            </li>
            <li>
              <span class="pricing-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span>
              Full CAC portal automation
            </li>
            <li>
              <span class="pricing-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span>
              Advanced AI persona editor
            </li>
            <li>
              <span class="pricing-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span>
              Real-time agent dashboard
            </li>
            <li>
              <span class="pricing-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span>
              WhatsApp agent commands
            </li>
          </ul>
          <a href="/dashboard" class="btn-pricing auth-trigger">
            Get Started Free
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
      </section>
    </div>

    <section class="faq-section reveal" id="faq">
      <div class="container">
        <div class="section-tag">FAQ</div>
        <h2 class="section-title">Common questions.</h2>
        <p class="section-desc">Everything you need to know before getting started.</p>

        <div class="faq-list">
          <div class="faq-item open">
            <div class="faq-q" onclick="this.parentElement.classList.toggle('open')">
              Is my client data secure?
              <svg class="faq-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
            <div class="faq-a">
              <div class="faq-a-inner">Yes. All data is encrypted at rest and in transit. Client documents are stored securely and never shared with third parties. Your CAC credentials are held in encrypted environment variables.</div>
            </div>
          </div>
          <div class="faq-item">
            <div class="faq-q" onclick="this.parentElement.classList.toggle('open')">
              How does AI handle payments?
              <svg class="faq-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
            <div class="faq-a">
              <div class="faq-a-inner">The AI generates the RRR on the CAC portal and sends the payment details to you via WhatsApp. After you confirm payment with a simple "PAID" command, the AI resumes the submission automatically.</div>
            </div>
          </div>
          <div class="faq-item">
            <div class="faq-q" onclick="this.parentElement.classList.toggle('open')">
              What happens if the CAC portal goes down?
              <svg class="faq-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
            <div class="faq-a">
              <div class="faq-a-inner">Asbestos uses retry-safe automation with exponential backoff. If the portal is down, tasks are queued and retried automatically. You're notified via WhatsApp if manual intervention is needed.</div>
            </div>
          </div>
          <div class="faq-item">
            <div class="faq-q" onclick="this.parentElement.classList.toggle('open')">
              Can I use my own CAC login?
              <svg class="faq-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
            <div class="faq-a">
              <div class="faq-a-inner">Yes — clients can provide their own CAC portal credentials, or you can configure a professional account for all filings. The AI asks each client which approach they prefer.</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="cta-section reveal">
      <div class="cta-card">
        <h2>Ready to automate your filings?</h2>
        <p>Join the beta — get early access to every new filing type we launch.</p>
        <form id="lead-form">
          <input type="email" class="form-input" placeholder="Enter your email..." required>
          <button type="submit" class="btn-cta-submit">Get Access</button>
        </form>
        <div id="form-msg">🎉 You're in! We'll be in touch shortly.</div>
      </div>
    </div>

    <footer class="site-footer">
      <div class="container">
        <div class="footer-brand">A Product Of</div>
        <div class="footer-company">TerraNile</div>
        <p class="footer-copy">&copy; ${new Date().getFullYear()} TerraNile Ltd. All rights reserved.</p>
      </div>
    </footer>

    <script
      async
      crossorigin="anonymous"
      data-clerk-publishable-key="${env.CLERK_PUBLISHABLE_KEY || ''}"
      src="https://proven-chow-42.clerk.accounts.dev/npm/@clerk/clerk-js@5/dist/clerk.browser.js"
      type="text/javascript"
    ></script>
    <script>
      // Clerk auth integration
      async function initClerkOnLanding() {
        try {
          await window.Clerk.load();
          document.querySelectorAll('.auth-trigger').forEach(el => {
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

      // Lead form
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
          alert('Something went wrong. Please try again.');
          btn.disabled = false;
          btn.textContent = 'Get Access';
        }
      });

      // Scroll reveal
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

      document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

      // Navbar background on scroll
      window.addEventListener('scroll', () => {
        const navbar = document.getElementById('navbar');
        if (window.scrollY > 50) {
          navbar.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)';
        } else {
          navbar.style.boxShadow = 'none';
        }
      });
    </script>
  </body>
</html>`;
}
