import {
  DECISIONS,
  REVIEWERS,
  editCard,
  reviewEnabled,
  saveDecision,
  saveSecondCheck,
  type CardEdit,
  type DecisionStatus,
  type Reviewer,
} from "@/lib/review";

export const dynamic = "force-dynamic";

/**
 * POST (dev mode only), JSON body with source, card_id, reviewed_by, fingerprint and:
 * - action "decide" (default): status ("verified" | "flagged" | "rejected" | null), note
 * - action "second_check": result ("pass" | "fail"), note
 * - action "edit": edit { scores?, open_question?, related_cards? } (Evidence lead only)
 */
export async function POST(request: Request) {
  if (!reviewEnabled()) return new Response("Not found", { status: 404 });
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "Send JSON" }, { status: 400 });
  }
  const { source, card_id, reviewed_by, fingerprint } = body;
  const action = body.action ?? "decide";
  const note = typeof body.note === "string" ? body.note : "";
  if (
    typeof source !== "string" ||
    typeof card_id !== "string" ||
    typeof fingerprint !== "string" ||
    !REVIEWERS.includes(reviewed_by as Reviewer)
  ) {
    return Response.json({ ok: false, error: "Missing or invalid fields" }, { status: 400 });
  }
  const who = reviewed_by as Reviewer;

  let result;
  if (action === "decide") {
    const status = body.status;
    if (!(status === null || DECISIONS.includes(status as DecisionStatus))) {
      return Response.json({ ok: false, error: "Invalid status" }, { status: 400 });
    }
    result = saveDecision(source, card_id, status as DecisionStatus | null, who, fingerprint, undefined, undefined, note);
  } else if (action === "second_check") {
    if (body.result !== "pass" && body.result !== "fail") {
      return Response.json({ ok: false, error: "result must be pass or fail" }, { status: 400 });
    }
    result = saveSecondCheck(source, card_id, body.result, who, fingerprint, note);
  } else if (action === "edit") {
    if (!body.edit || typeof body.edit !== "object") return Response.json({ ok: false, error: "Missing edit" }, { status: 400 });
    result = editCard(source, card_id, body.edit as CardEdit, who, fingerprint);
  } else {
    return Response.json({ ok: false, error: "Unknown action" }, { status: 400 });
  }
  return Response.json(result, { status: result.ok ? 200 : 409 });
}
