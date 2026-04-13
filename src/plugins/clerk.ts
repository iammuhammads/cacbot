import { clerkPlugin, getAuth } from "@clerk/fastify";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.js";

/**
 * Plugin to initialize Clerk authentication.
 */
export async function setupClerk(app: FastifyInstance) {
  if (!env.CLERK_SECRET_KEY || !env.CLERK_PUBLISHABLE_KEY) {
    app.log.warn("Clerk keys are missing. Authentication is disabled.");
    return;
  }

  await app.register(clerkPlugin, {
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
    secretKey: env.CLERK_SECRET_KEY,
  });
}

/**
 * Renders a professional "Auth Gate" page that triggers the Clerk modal instantly.
 */
function renderAuthGate(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authenticating | Asbestos</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body {
            margin: 0;
            background: #0f172a;
            color: white;
            font-family: 'Inter', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            text-align: center;
            overflow: hidden;
        }
        .container {
            animation: pulse 2s infinite ease-in-out;
        }
        @keyframes pulse {
            0%, 100% { opacity: 0.6; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.05); }
        }
        .logo {
            font-size: 2rem;
            font-weight: 700;
            color: #6366f1;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
            justify-content: center;
        }
        .status {
            color: #94a3b8;
            font-size: 0.9rem;
            letter-spacing: 0.05em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            <span>Asbestos</span>
        </div>
        <div class="status">INITIALIZING SECURE SESSION...</div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js"></script>
    <script>
        const CLERK_PUBLISHABLE_KEY = "${env.CLERK_PUBLISHABLE_KEY || ''}";
        
        async function startClerk() {
            if (!CLERK_PUBLISHABLE_KEY) {
                console.error("Clerk Error: Publishable Key is empty. Check your .env file.");
                return;
            }

            const clerk = new Clerk(CLERK_PUBLISHABLE_KEY);
            try {
                await clerk.load();
                if (!clerk.user) {
                    clerk.openSignUp({
                        afterSignUpUrl: '/dashboard',
                        afterSignInUrl: '/dashboard'
                    });
                } else {
                    window.location.href = '/dashboard';
                }
            } catch (err) {
                console.error("Clerk instance failed to load:", err);
            }
        }

        if (window.Clerk) {
           startClerk();
        } else {
           window.addEventListener('load', startClerk);
        }
    </script>
</body>
</html>`;
}

/**
 * Hook to protect routes by requiring a valid Clerk session.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  if (!env.CLERK_SECRET_KEY) return;

  try {
    const { userId } = getAuth(request);

    if (!userId) {
      if (request.url.startsWith("/api/")) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      return reply.type("text/html").send(renderAuthGate());
    }
  } catch (err) {
    request.log.error(err, "Clerk Authentication Error");
    return reply.status(500).send({ error: "Authentication configuration error." });
  }
}
