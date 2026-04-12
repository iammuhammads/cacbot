import "dotenv/config";
import { randomUUID } from "node:crypto";
import twilio from "twilio";

function getArg(name: string, fallback?: string): string | undefined {
  const prefix = `--${name}=`;
  const exactIndex = process.argv.indexOf(`--${name}`);
  if (exactIndex >= 0) {
    return process.argv[exactIndex + 1] ?? fallback;
  }

  const paired = process.argv.find((value) => value.startsWith(prefix));
  if (paired) {
    return paired.slice(prefix.length);
  }

  return fallback;
}

async function main() {
  const authToken = getArg("auth-token", process.env.TWILIO_AUTH_TOKEN);
  if (!authToken) {
    throw new Error("TWILIO_AUTH_TOKEN is required to simulate a signed Twilio webhook.");
  }

  const targetUrl = getArg("target", "http://127.0.0.1:3000/webhooks/whatsapp")!;
  const signatureUrl = getArg("signature-url", process.env.TWILIO_WEBHOOK_URL ?? targetUrl)!;
  const from = getArg("from", "whatsapp:+2348012345678")!;
  const to = getArg("to", process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886")!;
  const text = getArg(
    "text",
    "I want to register a business name for my design studio."
  )!;
  const profileName = getArg("profile-name", "Aisha Musa")!;
  const messageSid = getArg("message-sid", `SM${randomUUID().replaceAll("-", "").slice(0, 32)}`)!;
  const accountSid = getArg("account-sid", process.env.TWILIO_ACCOUNT_SID ?? "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")!;
  const mediaUrl = getArg("media-url");
  const mediaContentType = getArg("media-content-type", "image/jpeg");
  const mediaFileName = getArg("media-file-name", "document.jpg");

  const formEntries: Record<string, string> = {
    SmsMessageSid: messageSid,
    MessageSid: messageSid,
    AccountSid: accountSid,
    From: from,
    To: to,
    Body: text,
    ProfileName: profileName,
    NumMedia: mediaUrl ? "1" : "0"
  };

  if (mediaUrl) {
    formEntries.MediaUrl0 = mediaUrl;
    formEntries.MediaContentType0 = mediaContentType!;
    formEntries.MediaFileName0 = mediaFileName!;
  }

  const signature = twilio.getExpectedTwilioSignature(authToken, signatureUrl, formEntries);
  const body = new URLSearchParams(formEntries);

  const response = await fetch(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Twilio-Signature": signature
    },
    body
  });

  const responseText = await response.text();
  console.log(
    JSON.stringify(
      {
        targetUrl,
        signatureUrl,
        status: response.status,
        ok: response.ok,
        responseText
      },
      null,
      2
    )
  );

  if (!response.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
