"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const REVIEWERS = ["Bassam", "Reviewer 2", "Nermine", "Rita", "Kafa"] as const;
type ReviewerName = (typeof REVIEWERS)[number];
const EVIDENCE_LEAD: ReviewerName = "Bassam";
type Status = "verified" | "flagged" | "rejected";
type Relation = "agrees" | "conflicts" | "extends";

export interface EditableFields {
  scores: { crew_safety: number; evidence: number; moon_mars: number };
  open_question: string | null;
  related_cards: { card_id: string; relation: Relation }[];
}

function useReviewer(): [ReviewerName | "", (r: ReviewerName) => void] {
  const [reviewer, setReviewer] = useState<ReviewerName | "">("");
  useEffect(() => {
    const saved = localStorage.getItem("reviewer");
    // Restore the last reviewer name on this laptop.
    if (REVIEWERS.includes(saved as ReviewerName)) setReviewer(saved as ReviewerName); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);
  return [
    reviewer,
    (r) => {
      setReviewer(r);
      localStorage.setItem("reviewer", r);
    },
  ];
}

/** "agrees SAF-002, conflicts FLX-001" ⇄ related_cards */
function relatedToText(r: EditableFields["related_cards"]): string {
  return r.map((x) => `${x.relation} ${x.card_id}`).join(", ");
}
function textToRelated(t: string): EditableFields["related_cards"] {
  return t
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [relation, card_id] = s.split(/\s+/);
      return { relation: relation as Relation, card_id: (card_id ?? "").toUpperCase() };
    });
}

export default function ReviewActions({
  source,
  cardId,
  fingerprint,
  current,
  approvedBy,
  mode,
  nextHref,
  nextOpenHref,
  fields,
}: {
  source: string;
  cardId: string;
  fingerprint: string;
  current: Status | null;
  /** Who approved it (second-check mode). */
  approvedBy: string | null;
  mode: "review" | "second";
  /** N: next card in the list. */
  nextHref: string | null;
  /** After a decision: next card that still needs one. */
  nextOpenHref: string | null;
  fields: EditableFields;
}) {
  const router = useRouter();
  const [reviewer, setReviewer] = useReviewer();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Set once a decision is saved: this card's keys/buttons stay locked until the next card
  // replaces this component, so a fast key press can never land on the old card.
  const [leaving, setLeaving] = useState(false);
  const [reasonFor, setReasonFor] = useState<"flag" | "fail" | null>(null);
  const [reason, setReason] = useState("");
  const reasonRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [scores, setScores] = useState(fields.scores);
  const [openQ, setOpenQ] = useState(fields.open_question ?? "");
  const [related, setRelated] = useState(relatedToText(fields.related_cards));

  async function post(payload: Record<string, unknown>, after: string | null) {
    if (leaving) return;
    if (!reviewer) {
      setError("Choose who is reviewing first.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, card_id: cardId, reviewed_by: reviewer, fingerprint, ...payload }),
    });
    const body = (await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))) as { ok: boolean; error?: string };
    setBusy(false);
    if (!body.ok) {
      setError(body.error ?? "Could not save");
      return;
    }
    setReasonFor(null);
    setReason("");
    setEditing(false);
    if (after) {
      setLeaving(true);
      router.push(after);
    } else router.refresh();
  }

  const decide = (status: Status | null, note = "") => post({ action: "decide", status, note }, status ? nextOpenHref : null);
  const secondCheck = (result: "pass" | "fail", note = "") => post({ action: "second_check", result, note }, nextOpenHref);

  function askReason(kind: "flag" | "fail") {
    setReasonFor(kind);
    setTimeout(() => reasonRef.current?.focus(), 0);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey || busy || leaving) return;
      const k = e.key.toLowerCase();
      if (k === "n" && nextHref) router.push(nextHref);
      else if (mode === "review" && k === "a") decide("verified");
      else if (mode === "review" && k === "f") askReason("flag");
      else if (mode === "review" && k === "r") decide("rejected");
      else if (mode === "second" && k === "a") secondCheck("pass");
      else if (mode === "second" && k === "f") askReason("fail");
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const isLead = reviewer === EVIDENCE_LEAD;
  const sameAsApprover = mode === "second" && !!reviewer && reviewer === approvedBy;

  return (
    <div className="space-y-2 rounded-md border border-neutral-300 bg-neutral-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="reviewer" className="text-sm font-medium">
          Reviewer
        </label>
        <select
          id="reviewer"
          value={reviewer}
          onChange={(e) => setReviewer(e.target.value as ReviewerName)}
          className="rounded border border-neutral-400 bg-white px-2 py-1 text-sm"
        >
          <option value="">— choose —</option>
          {REVIEWERS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <span className="text-xs text-neutral-500">
          Keys: {mode === "review" ? "A approve · F flag · R reject" : "A pass · F fail"} · N next
        </span>
      </div>

      {mode === "review" ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy || leaving} onClick={() => decide("verified")} aria-pressed={current === "verified"}
            className={`rounded bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50 ${current === "verified" ? "ring-4 ring-neutral-900 ring-offset-1" : ""}`}>
            ✓ Approve (verified)
          </button>
          <button type="button" disabled={busy || leaving} onClick={() => askReason("flag")} aria-pressed={current === "flagged"}
            className={`rounded bg-amber-400 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-500 disabled:opacity-50 ${current === "flagged" ? "ring-4 ring-neutral-900 ring-offset-1" : ""}`}>
            ⚑ Flag (needs fixing)
          </button>
          <button type="button" disabled={busy || leaving} onClick={() => decide("rejected")} aria-pressed={current === "rejected"}
            className={`rounded bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50 ${current === "rejected" ? "ring-4 ring-neutral-900 ring-offset-1" : ""}`}>
            ✗ Reject
          </button>
          {current && (
            <button type="button" disabled={busy || leaving} onClick={() => decide(null)}
              className="rounded border border-neutral-400 bg-white px-4 py-2 text-sm hover:bg-neutral-100">
              Undo decision
            </button>
          )}
          {nextHref && (
            <button type="button" onClick={() => router.push(nextHref)}
              className="rounded border border-neutral-400 bg-white px-4 py-2 text-sm hover:bg-neutral-100">
              Next →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-sm">
            Approved by <strong>{approvedBy}</strong>. Check the quote and every number against the PDF page yourself.
          </p>
          {sameAsApprover && <p className="text-sm font-medium text-red-800">You approved this card — someone else must second-check it.</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy || leaving || sameAsApprover} onClick={() => secondCheck("pass")}
              className="rounded bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50">
              ✓ Second check passes
            </button>
            <button type="button" disabled={busy || leaving || sameAsApprover} onClick={() => askReason("fail")}
              className="rounded bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50">
              ✗ Fails — send back to flagged
            </button>
            {nextHref && (
              <button type="button" onClick={() => router.push(nextHref)}
                className="rounded border border-neutral-400 bg-white px-4 py-2 text-sm hover:bg-neutral-100">
                Next →
              </button>
            )}
          </div>
        </div>
      )}

      {reasonFor && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (reasonFor === "flag") decide("flagged", reason);
            else secondCheck("fail", reason);
          }}
        >
          <label htmlFor="reason" className="text-sm font-medium">
            {reasonFor === "flag" ? "Why flag it?" : "What is wrong?"}
          </label>
          <input id="reason" ref={reasonRef} value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. quote is on page 5, not 4" className="min-w-64 flex-1 rounded border border-neutral-400 px-2 py-1 text-sm" />
          <button type="submit" disabled={busy || !reason.trim()} className="rounded bg-neutral-900 px-3 py-1 text-sm text-white disabled:opacity-40">
            Save
          </button>
          <button type="button" onClick={() => setReasonFor(null)} className="text-sm underline">
            Cancel
          </button>
        </form>
      )}

      {mode === "review" && isLead && (
        <div className="border-t border-neutral-200 pt-2">
          {!editing ? (
            <button type="button" onClick={() => setEditing(true)} className="text-sm font-medium underline">
              ✎ Edit scores, open question or related cards (Evidence lead)
            </button>
          ) : (
            <form
              className="space-y-2 text-sm"
              onSubmit={(e) => {
                e.preventDefault();
                post({ action: "edit", edit: { scores, open_question: openQ.trim() || null, related_cards: textToRelated(related) } }, null);
              }}
            >
              <p className="text-xs text-neutral-600">Saving changes the card, so it must be approved again.</p>
              <div className="flex flex-wrap gap-3">
                {(["crew_safety", "evidence", "moon_mars"] as const).map((k) => (
                  <label key={k} className="flex items-center gap-1">
                    {k}
                    <select value={scores[k]} onChange={(e) => setScores({ ...scores, [k]: Number(e.target.value) })}
                      className="rounded border border-neutral-400 bg-white px-1 py-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <label className="block">
                Open question (only if the paper says it is unknown)
                <textarea value={openQ} onChange={(e) => setOpenQ(e.target.value)} rows={2}
                  className="mt-1 block w-full rounded border border-neutral-400 px-2 py-1" />
              </label>
              <label className="block">
                Related cards (e.g. <code>agrees SAF-002, conflicts FLX-001</code>)
                <input value={related} onChange={(e) => setRelated(e.target.value)}
                  className="mt-1 block w-full rounded border border-neutral-400 px-2 py-1" />
              </label>
              <div className="flex gap-2">
                <button type="submit" disabled={busy || leaving} className="rounded bg-neutral-900 px-3 py-1 text-white disabled:opacity-40">
                  Save changes
                </button>
                <button type="button" onClick={() => setEditing(false)} className="underline">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
