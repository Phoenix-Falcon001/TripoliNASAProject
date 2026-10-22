"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const REVIEWERS = ["Bassam", "Nermine"] as const;
type Status = "verified" | "flagged" | "rejected";

const BUTTONS: { status: Status; label: string; key: string; cls: string }[] = [
  { status: "verified", label: "✓ Approve (verified)", key: "a", cls: "bg-green-700 text-white hover:bg-green-800" },
  { status: "flagged", label: "⚑ Flag (needs fixing)", key: "f", cls: "bg-amber-400 text-black hover:bg-amber-500" },
  { status: "rejected", label: "✗ Reject", key: "r", cls: "bg-red-700 text-white hover:bg-red-800" },
];

export default function ReviewActions({
  source,
  cardId,
  fingerprint,
  current,
  nextHref,
}: {
  source: string;
  cardId: string;
  fingerprint: string;
  current: Status | null;
  nextHref: string | null;
}) {
  const router = useRouter();
  const [reviewer, setReviewer] = useState<(typeof REVIEWERS)[number] | "">("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("reviewer");
    // Restore the last reviewer name on this laptop.
    if (saved === "Bassam" || saved === "Nermine") setReviewer(saved); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  async function decide(status: Status | null) {
    if (!reviewer) {
      setError("Choose who is reviewing first.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, card_id: cardId, status, reviewed_by: reviewer, fingerprint }),
    });
    const body = (await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))) as { ok: boolean; error?: string };
    setBusy(false);
    if (!body.ok) {
      setError(body.error ?? "Could not save");
      return;
    }
    if (status && nextHref) router.push(nextHref);
    else router.refresh();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.metaKey || e.ctrlKey) return;
      const b = BUTTONS.find((x) => x.key === e.key.toLowerCase());
      if (b) decide(b.status);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="space-y-2 rounded-md border border-neutral-300 bg-neutral-50 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="reviewer" className="text-sm font-medium">
          Reviewer
        </label>
        <select
          id="reviewer"
          value={reviewer}
          onChange={(e) => {
            const v = e.target.value as (typeof REVIEWERS)[number];
            setReviewer(v);
            localStorage.setItem("reviewer", v);
          }}
          className="rounded border border-neutral-400 bg-white px-2 py-1 text-sm"
        >
          <option value="">— choose —</option>
          {REVIEWERS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <span className="text-xs text-neutral-500">Shortcuts: A approve · F flag · R reject</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {BUTTONS.map((b) => (
          <button
            key={b.status}
            type="button"
            disabled={busy}
            onClick={() => decide(b.status)}
            aria-pressed={current === b.status}
            className={`rounded px-4 py-2 text-sm font-semibold disabled:opacity-50 ${b.cls} ${
              current === b.status ? "ring-4 ring-neutral-900 ring-offset-1" : ""
            }`}
          >
            {b.label}
          </button>
        ))}
        {current && (
          <button
            type="button"
            disabled={busy}
            onClick={() => decide(null)}
            className="rounded border border-neutral-400 bg-white px-4 py-2 text-sm hover:bg-neutral-100"
          >
            Undo decision
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
