import { askEvents, ollamaModel, validateQuestion, MAX_QUESTION_LENGTH } from "@/lib/ask";
import { getCardData, getDemoAnswers } from "@/lib/cards";

export const dynamic = "force-dynamic";

/**
 * POST { question } → NDJSON stream of AskEvent lines:
 * first the selected cards, then the Ollama answer token by token (or a fallback).
 */
export async function POST(request: Request) {
  let question: string | null = null;
  try {
    question = validateQuestion(((await request.json()) as { question?: unknown }).question);
  } catch {
    // fall through to the 400 below
  }
  if (!question) {
    return Response.json({ error: `Send JSON {"question": "..."} with 1–${MAX_QUESTION_LENGTH} characters.` }, { status: 400 });
  }

  const events = askEvents(question, {
    cards: getCardData().cards,
    demoAnswers: getDemoAnswers(),
    model: ollamaModel(),
    signal: request.signal,
  });
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await events.next();
      if (done) controller.close();
      else controller.enqueue(encoder.encode(JSON.stringify(value) + "\n"));
    },
    async cancel() {
      await events.return(undefined);
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
