import { MAX_QUESTION_LENGTH, ollamaModel } from "@/lib/ask";
import { getCardData, getDemoAnswers } from "@/lib/cards";
import { runEval, type EvalMode } from "@/lib/evalRun";

export const dynamic = "force-dynamic";

/**
 * Used by the G1 test runner (npm run eval:g1) and the AI drafts script (npm run ai:drafts).
 * POST { mode: "plain" | "cards" | "explain", question?, card_id?, model? } → EvalResult JSON.
 * Runs the same code as the Ask page, with the same Ollama settings. Localhost only.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Send JSON" }, { status: 400 });
  }
  const mode = body.mode as EvalMode;
  if (!["plain", "cards", "explain"].includes(mode)) return Response.json({ error: "mode must be plain, cards or explain" }, { status: 400 });
  const question = typeof body.question === "string" ? body.question.slice(0, MAX_QUESTION_LENGTH) : undefined;
  const card_id = typeof body.card_id === "string" ? body.card_id : undefined;
  const model = typeof body.model === "string" && body.model.trim() ? body.model.trim() : ollamaModel();
  const data = getCardData();
  if (data.isSample && body.allow_sample !== true) {
    return Response.json({ error: "data/cards.json is empty (SAMPLE DATA). G1 must run on real verified cards." }, { status: 409 });
  }
  try {
    const result = await runEval({ mode, question, card_id }, { cards: data.cards, demoAnswers: getDemoAnswers(), model });
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
