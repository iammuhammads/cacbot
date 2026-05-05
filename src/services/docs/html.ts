import { env } from "../../config/env.js";

export function renderDocsPage(): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Documentation | Asbestos CAC AI</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
            :root {
                --bg: #0a0a0a;
                --surface: #141414;
                --primary: #ffffff;
                --accent: #2ecc71;
                --text: #a0a0a0;
                --text-bright: #ffffff;
                --border: #262626;
                --sidebar-width: 280px;
            }

            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
                background: var(--bg); 
                color: var(--text); 
                font-family: 'Inter', sans-serif; 
                line-height: 1.6;
                display: flex;
            }

            aside {
                width: var(--sidebar-width);
                height: 100vh;
                background: var(--surface);
                border-right: 1px solid var(--border);
                padding: 40px 24px;
                position: fixed;
                left: 0;
                top: 0;
            }

            main {
                margin-left: var(--sidebar-width);
                padding: 60px 80px;
                max-width: 1000px;
            }

            .logo {
                font-size: 1.2rem;
                font-weight: 700;
                color: var(--text-bright);
                margin-bottom: 40px;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .nav-item {
                display: block;
                color: var(--text);
                text-decoration: none;
                margin-bottom: 12px;
                font-size: 0.9rem;
                padding: 8px 12px;
                border-radius: 6px;
                transition: all 0.2s;
            }

            .nav-item:hover {
                background: var(--border);
                color: var(--text-bright);
            }

            .nav-item.active {
                background: var(--accent);
                color: #000;
                font-weight: 600;
            }

            h1 { color: var(--text-bright); font-size: 2.5rem; margin-bottom: 24px; }
            h2 { color: var(--text-bright); font-size: 1.5rem; margin: 40px 0 16px 0; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
            p { margin-bottom: 20px; }

            .feature-card {
                background: var(--surface);
                border: 1px solid var(--border);
                border-radius: 12px;
                padding: 24px;
                margin-bottom: 24px;
            }

            .feature-title {
                color: var(--text-bright);
                font-weight: 600;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .badge {
                padding: 4px 10px;
                border-radius: 4px;
                font-size: 0.75rem;
                font-weight: 600;
                background: var(--border);
                color: var(--text-bright);
            }

            code {
                background: #1e1e1e;
                padding: 2px 6px;
                border-radius: 4px;
                font-family: monospace;
                color: var(--accent);
            }

            pre {
                background: #1e1e1e;
                padding: 20px;
                border-radius: 8px;
                overflow-x: auto;
                margin-bottom: 24px;
                border: 1px solid var(--border);
            }

            .step {
                display: flex;
                gap: 20px;
                margin-bottom: 30px;
            }

            .step-number {
                width: 32px;
                height: 32px;
                background: var(--accent);
                color: #000;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                flex-shrink: 0;
            }

            .command-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 24px;
            }

            .command-table th, .command-table td {
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid var(--border);
            }

            .command-table th { color: var(--text-bright); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; }

            @media (max-width: 768px) {
                aside { display: none; }
                main { margin-left: 0; padding: 40px 24px; }
            }
        </style>
    </head>
    <body>
        <aside>
            <div class="logo">
                <div style="width: 24px; height: 24px; background: var(--accent); border-radius: 4px;"></div>
                Asbestos Docs
            </div>
            <a href="#intro" class="nav-item">Introduction</a>
            <a href="#workflow" class="nav-item">Registration Workflow</a>
            <a href="#modes" class="nav-item">Interaction Modes</a>
            <a href="#commands" class="nav-item">Agent Commands</a>
            <a href="#recovery" class="nav-item">Recovery System</a>
            <a href="#delivery" class="nav-item">Document Delivery</a>
            
            <div style="margin-top: 60px;">
                <a href="/dashboard" class="nav-item" style="border: 1px solid var(--border);">← Go to Dashboard</a>
            </div>
        </aside>

        <main>
            <section id="intro">
                <h1>The Asbestos Agent Architecture</h1>
                <p>Welcome to the core documentation for your Agentic CAC Registration Bot. This system uses a **Controlled Agentic Architecture**, combining high-level AI reasoning with deterministic browser automation.</p>
            </section>

            <section id="workflow">
                <h2>1. Registration Workflow</h2>
                <p>Every session follows a goal-oriented roadmap. The agent tracks progress against 8 critical subgoals:</p>
                
                <div class="step">
                    <div class="step-number">1</div>
                    <div>
                        <div class="feature-title">Intake & Intent Detection</div>
                        <p>The AI identifies if the user wants a Business Name, Company, or Trustee registration. It also detects greetings or confusion.</p>
                    </div>
                </div>

                <div class="step">
                    <div class="step-number">2</div>
                    <div>
                        <div class="feature-title">Data Extraction & Validation</div>
                        <p>Individual fields (Directors, Address, Share Capital) are extracted with confidence scores. If confidence is low, the AI switches modes.</p>
                    </div>
                </div>

                <div class="step">
                    <div class="step-number">3</div>
                    <div>
                        <div class="feature-title">Submission & Payment</div>
                        <p>Automation handles the portal filing. If payment is required, it pauses, notifies an agent, and resumes only after RRR confirmation.</p>
                    </div>
                </div>
            </section>

            <section id="modes">
                <h2>2. Interaction Modes</h2>
                <p>The agent adapts its personality based on a "User Confusion Score."</p>

                <div class="feature-card">
                    <div class="feature-title">
                        CONVERSATIONAL
                        <span class="badge">Default</span>
                    </div>
                    <p>Natural, fluid dialogue. Best for users who know what they want. AI handles complex multi-field inputs.</p>
                </div>

                <div class="feature-card">
                    <div class="feature-title">
                        GUIDED
                        <span class="badge">Trigger: Confusion ≥ 2</span>
                    </div>
                    <p>The AI provides clear, numbered options. It stops asking for multiple fields at once and focuses on one specific value.</p>
                </div>

                <div class="feature-card">
                    <div class="feature-title">
                        STRICT
                        <span class="badge">Trigger: Confusion ≥ 4</span>
                    </div>
                    <p>Minimalist dialogue. Only accepts structured input. If the user continues to struggle, the AI offers a Human Escape Hatch.</p>
                </div>
            </section>

            <section id="commands">
                <h2>3. Agent Commands</h2>
                <p>Agents can control the bot directly via WhatsApp messages.</p>
                <table class="command-table">
                    <thead>
                        <tr>
                            <th>Command</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><code>PAID [sessionId]</code></td>
                            <td>Manually overrides payment check and proceeds to submission.</td>
                        </tr>
                        <tr>
                            <td><code>STATUS [sessionId]</code></td>
                            <td>Returns the current state and missing fields for a user.</td>
                        </tr>
                        <tr>
                            <td><code>LIST</code></td>
                            <td>Shows all active registrations currently in the queue.</td>
                        </tr>
                        <tr>
                            <td><code>NOTE [sessionId] [text]</code></td>
                            <td>Adds a persistent note to the session for other agents.</td>
                        </tr>
                    </tbody>
                </table>
            </section>

            <section id="recovery">
                <h2>4. The Intelligent Recovery System</h2>
                <p>When the CAC Portal throws an error (e.g., "Name Already Taken" or "Selector Changed"), the bot triggers the **Recovery Bridge**.</p>
                <ul>
                    <li><strong>ADL Analysis</strong>: The Agentic Decision Layer reviews the error and DOM snapshot.</li>
                    <li><strong>Self-Correction</strong>: If it's a minor UI change, the AI finds the new button and retries.</li>
                    <li><strong>Escalation</strong>: If it's a "Fatal" error (e.g., Portal Down), it notifies the admin via the Dashboard.</li>
                </ul>
            </section>

            <section id="delivery">
                <h2>5. Document Delivery</h2>
                <p>After a successful filing, the handover is automated:</p>
                <div class="feature-card">
                    <div class="feature-title">Final Handover</div>
                    <p>1. Automation downloads Certificate and Status Report.<br>
                       2. Files are uploaded to Supabase Storage.<br>
                       3. A WhatsApp message is sent with secure download links.</p>
                </div>
            </section>

            <footer style="margin-top: 100px; padding-top: 20px; border-top: 1px solid var(--border); font-size: 0.8rem;">
                Asbestos Agentic Architecture v2.0 | Powered by Gemini 3 Flash & Supabase
            </footer>
        </main>
    </body>
    </html>
  `;
}
