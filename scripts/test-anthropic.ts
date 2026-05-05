import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

async function test() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("No API key found in .env");
    return;
  }

  const client = new Anthropic({ apiKey });
  const models = [
    "claude-3-5-sonnet-20241022",
    "claude-3-5-sonnet-20240620",
    "claude-3-haiku-20240307",
    "claude-3-sonnet-20240229",
    "claude-2.1",
    "claude-2.0"
  ];

  for (const model of models) {
    console.log(`Testing model: ${model}...`);
    try {
      const response = await client.messages.create({
        model,
        max_tokens: 10,
        messages: [{ role: "user", content: "Hi" }]
      });
      console.log(`SUCCESS with ${model}:`, response.content[0]);
      break;
    } catch (err: any) {
      console.error(`FAILED with ${model}:`, err.message);
      if (err.status === 401) {
        console.error("ERROR 401: Invalid API Key.");
        break;
      }
    }
  }
}

test();
