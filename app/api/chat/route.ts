import { createGroq } from "@ai-sdk/groq";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  safeValidateUIMessages,
  streamText,
  toUIMessageStream,
} from "ai";
import { buildInstructions } from "@/lib/ai/instructions";
import { cleanMessages } from "@/lib/ai/limits";
import { allow } from "@/lib/ai/rate-limit";
import { generatePlan } from "@/lib/engine";
import { PlanInputSchema } from "@/lib/schemas";

export const maxDuration = 30;

const error = (status: number, message: string) => Response.json({ error: message }, { status });

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL;
  if (!apiKey || !model) return error(503, "The assistant isn't set up yet.");

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allow(ip)) return error(429, "You're sending messages quickly. Wait a minute and try again.");

  const body = (await req.json().catch(() => null)) as { messages?: unknown; input?: unknown } | null;

  // The plan is rebuilt here from validated answers; nothing the browser says about numbers is used.
  const input = PlanInputSchema.safeParse(body?.input);
  if (!input.success) return error(400, "Make a plan first, then ask about it.");

  const validated = await safeValidateUIMessages({ messages: body?.messages });
  const messages = validated.success ? cleanMessages(validated.data) : null;
  if (!messages) return error(400, "That message couldn't be sent. Keep questions under 1,000 characters, or start a new chat.");

  const report = generatePlan(input.data);
  const groq = createGroq({ apiKey });

  const result = streamText({
    model: groq(model),
    instructions: buildInstructions(input.data, report),
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 1200,
    temperature: 0.2,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      sendReasoning: false,
      onError: (err) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error("chat stream failed:", message);
        return /rate limit/i.test(message)
          ? "Lots of questions right now. Try again in a minute."
          : "The assistant couldn't answer just now. Try again in a moment.";
      },
    }),
  });
}
