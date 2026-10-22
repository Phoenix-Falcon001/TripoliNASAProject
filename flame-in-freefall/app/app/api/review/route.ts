import { DECISIONS, REVIEWERS, reviewEnabled, saveDecision, type DecisionStatus, type Reviewer } from "@/lib/review";

export const dynamic = "force-dynamic";

/** POST { source, card_id, status | null, reviewed_by, fingerprint } — dev mode only. */
export async function POST(request: Request) {
  if (!reviewEnabled()) return new Response("Not found", { status: 404 });
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "Send JSON" }, { status: 400 });
  }
  const { source, card_id, status, reviewed_by, fingerprint } = body;
  if (
    typeof source !== "string" ||
    typeof card_id !== "string" ||
    typeof fingerprint !== "string" ||
    !(status === null || DECISIONS.includes(status as DecisionStatus)) ||
    !REVIEWERS.includes(reviewed_by as Reviewer)
  ) {
    return Response.json({ ok: false, error: "Missing or invalid fields" }, { status: 400 });
  }
  const result = saveDecision(source, card_id, status as DecisionStatus | null, reviewed_by as Reviewer, fingerprint);
  return Response.json(result, { status: result.ok ? 200 : 409 });
}
