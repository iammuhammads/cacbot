# WhatsApp-Native AI Agent for CAC Registration Automation

This project is a TypeScript/Fastify service that turns WhatsApp conversations into structured CAC registration workflows, validates the intake, submits data through browser automation, pauses at payment, and resumes once an agent confirms payment.

Twilio is now the default WhatsApp provider in the sample environment.

## What is included

- WhatsApp webhook intake for `Twilio`, `360dialog`, or a local `mock` provider
- Twilio webhook signature validation using the official Twilio helper library
- AI-driven conversation orchestration with structured JSON output
- Redis-backed session/state management with in-memory fallback for local development
- Durable Redis/BullMQ automation jobs for submission and payment resume flows
- Local file storage for inbound WhatsApp documents
- Validation for required CAC registration details and Nigerian-specific data formats
- Playwright automation service for CAC portal login, name reservation, registration, payment pause, and resume hooks
- First-pass automation branches for `BUSINESS_NAME`, `COMPANY`, and `INCORPORATED_TRUSTEES`
- Agent command handling for `PAID`, `STATUS`, `OVERRIDE`, and `RESUME`
- Audit trail logging inside each session record
- Queue visibility via `GET /queue/status`

## Important CAC assumption

CAC CRP 3.0 currently requires login with an email OTP, according to the interim user guide published for `icrp.cac.gov.ng`. This build includes an IMAP-based OTP resolver so the automation can stay close to the "minimal human involvement" target. If you cannot use IMAP, set `CAC_OTP_MODE=static` and populate `CAC_STATIC_OTP` before a run, or swap in your own resolver.

The current automation selectors are designed to be resilient, but they still depend on the live CAC UI. Expect to refine selectors after connecting to a real CRP account.

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Start Redis locally:

```bash
docker compose up -d redis
```

3. Copy environment variables:

```bash
cp .env.example .env
```

4. Run the service:

```bash
npm run dev
```

If you are using durable automation jobs, start the worker too:

```bash
npm run dev:worker
```

## Twilio setup

1. In Twilio, configure your WhatsApp sandbox or sender webhook to point to:

```text
https://your-public-domain.example.com/webhooks/whatsapp
```

2. Set these variables in your `.env`:

```bash
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_WEBHOOK_URL=https://your-public-domain.example.com/webhooks/whatsapp
TWILIO_VALIDATE_SIGNATURE=true
```

3. Keep `TWILIO_WEBHOOK_URL` aligned with the exact public URL Twilio calls. Signature validation depends on an exact URL match.

4. For local development behind a tunnel, update both your Twilio console webhook and `TWILIO_WEBHOOK_URL` whenever the tunnel URL changes.

If you want to test signed inbound webhooks locally without sending real outbound WhatsApp replies, set:

```bash
TWILIO_DISABLE_OUTBOUND=true
```

## Local Twilio webhook simulation

You can test signed Twilio webhook delivery locally without using the Twilio console every time.

1. Start the app with Twilio env vars set.
2. Run:

```bash
npm run dev:twilio:test-webhook -- --target http://127.0.0.1:3000/webhooks/whatsapp --signature-url http://127.0.0.1:3000/webhooks/whatsapp
```

Optional flags:

```bash
--auth-token "your_twilio_auth_token"
--text "I want to register a company"
--from "whatsapp:+2348012345678"
--profile-name "Aisha Musa"
--media-url "https://example.com/passport.jpg"
--media-content-type "image/jpeg"
--media-file-name "passport.jpg"
```

When you are validating through a public tunnel, keep `--signature-url` aligned with the exact URL Twilio is configured to call.

## Core endpoints

- `POST /webhooks/whatsapp`
- `GET /health`
- `GET /health/config`
- `GET /queue/status`
- `GET /sessions`
- `GET /sessions/:sessionId`
- `POST /agent/commands`

`GET /health/config` shows missing required configuration and non-blocking warnings for the current provider setup.

`GET /health` now also reports whether the app is using `inline` or `bullmq` job dispatching.

`GET /queue/status` shows queue mode, counts, and recent jobs. In inline mode it returns an empty recent-jobs list; in BullMQ mode it reports waiting, active, delayed, completed, and failed jobs from Redis.

## Mock provider example

Use the mock provider for local testing:

```bash
curl -X POST http://localhost:3000/webhooks/whatsapp \
  -H "content-type: application/json" \
  -d '{
    "from": "whatsapp:+2348012345678",
    "text": "I want to register a business name for my fashion brand.",
    "profileName": "Aisha Musa"
  }'
```

Agent payment confirmation:

```bash
curl -X POST http://localhost:3000/agent/commands \
  -H "content-type: application/json" \
  -d '{
    "from": "whatsapp:+2348000000000",
    "text": "PAID <session-id>"
  }'
```

## Suggested delivery phases

### Phase 1

- Run the WhatsApp conversation flow only
- Validate structured output
- Review session JSON in Redis

### Phase 2

- Connect a live CAC account
- Tune Playwright selectors against the real portal
- Enable payment pause/resume with the agent number
- Run the API and worker as separate processes
- Validate Company and Incorporated Trustees selectors against real CRP screens

### Phase 3

- Add a dashboard UI
- Add observability, alerts, and retry policies

## High-level architecture

```text
WhatsApp Webhook -> Provider Normalizer -> Session Store -> AI Intake Service
                 -> Validation -> BullMQ/Inline Queue -> Playwright CAC Runner
                 -> Payment Notification -> Agent Reply -> Resume Automation
```

## Durable job mode

When `REDIS_URL` is present and `AUTOMATION_QUEUE_MODE=auto`, the API process becomes a job producer and the worker process handles:

- `submit_registration`
- `resume_payment`

If Redis is not configured, the app falls back to inline processing for local development.
