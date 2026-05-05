import twilio from "twilio";
import "dotenv/config";

async function test() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const to = process.argv[2]; // Target phone number

  if (!accountSid || !authToken || !from || !to) {
    console.error("Missing credentials or target number. Usage: npx tsx scripts/test-twilio-outbound.ts whatsapp:+234...");
    return;
  }

  const client = twilio(accountSid, authToken);

  console.log(`Testing Twilio Outbound...`);
  console.log(`From: ${from}`);
  console.log(`To: ${to}`);

  try {
    const message = await client.messages.create({
      from,
      to,
      body: "Diagnostics: Testing WhatsApp connectivity from TerraNile."
    });
    console.log("SUCCESS! Message SID:", message.sid);
  } catch (err: any) {
    console.error("FAILED!");
    console.error("Code:", err.code);
    console.error("Message:", err.message);
    if (err.code === 63007) {
      console.error("\n--- ANALYSIS ---");
      console.error("Error 63007 means Twilio doesn't recognize your 'From' number as a valid WhatsApp sender.");
      console.error("1. Are you using the Twilio Sandbox? If so, your 'From' MUST be whatsapp:+14155238886.");
      console.error("2. If you are using a custom number, have you submitted the WhatsApp sender profile and been approved by Meta?");
    }
  }
}

test();
