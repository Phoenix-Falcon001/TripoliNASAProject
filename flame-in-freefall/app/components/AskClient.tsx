"use client";

import { useEffect, useRef, useState } from "react";
import CardSummary from "@/components/CardSummary";
import CitedText from "@/components/CitedText";
import { AiExplanation } from "@/components/Layers";
import type { AskEvent } from "@/lib/ask";
import { extractCitations, unknownCitations } from "@/lib/citations";
import type { Card } from "@/lib/types";

interface OllamaStatus {
  online: boolean;
  model: string;
  modelInstalled: boolean;
}

type Result =
  | { kind: "ai"; model: string; text: string; done: boolean; error?: string }
  | { kind: "cached"; text: string; reason?: string }
  | { kind: "message"; text: string; reason?: string };

function StatusLine({ status }: { status: OllamaStatus | null }) {
  if (!status) return <p className="text-sm text-neutral-600">Checking local AI…</p>;
  if (!status.online)
    return (
      <p className="text-sm text-neutral-700">
        <span aria-hidden="true">○ </span>Local AI is <strong>offline</strong>. You will get pre-written answers (where we have
        one) or the most relevant cards.
      </p>
    );
  if (!status.modelInstalled)
    return (
      <p className="text-sm text-neutral-700">
        <span aria-hidden="true">◐ </span>Ollama is running but model <code>{status.model}</code> is not installed. Run{" "}
        <code className="rounded bg-neutral-100 px-1">ollama pull {status.model}</code>.
      </p>
    );
  return (
    <p className="text-sm text-neutral-700">
      <span aria-hidden="true">● </span>Local AI is <strong>online</strong> ({status.model}, on this laptop).
    </p>
  );
}

export default function AskClient({
  experiments,
  suggestions,
}: {
  experiments: Record<string, string>;
  suggestions: string[];
}) {
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[] | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("/api/ollama")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ online: false, model: "?", modelInstalled: false }));
  }, []);

  function handle(e: AskEvent) {
    switch (e.type) {
      case "cards":
        setCards(e.cards);
        break;
      case "ai":
        setResult({ kind: "ai", model: e.model, text: "", done: false });
        break;
      case "token":
        setResult((r) => (r && r.kind === "ai" ? { ...r, text: r.text + e.text } : r));
        break;
      case "fallback":
        setResult(
          e.mode === "cached"
            ? { kind: "cached", text: e.text, reason: e.reason }
            : { kind: "message", text: e.text, reason: e.reason },
        );
        break;
      case "error":
        setResult((r) => (r && r.kind === "ai" ? { ...r, error: e.message } : r));
        break;
      case "done":
        setResult((r) => (r && r.kind === "ai" ? { ...r, done: true } : r));
        break;
    }
  }

  async function ask(q: string) {
    const text = q.trim();
    if (!text) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setAsked(text);
    setCards(null);
    setResult(null);
    setRequestError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setRequestError(body.error ?? `Request failed (${res.status})`);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (line) handle(JSON.parse(line) as AskEvent);
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setRequestError((e as Error).message);
    } finally {
      if (abortRef.current === controller) setBusy(false);
    }
  }

  const givenIds = (cards ?? []).map((c) => c.card_id);
  const aiText = result && result.kind !== "message" ? result.text : "";
  const strayCites = aiText ? unknownCitations(aiText, givenIds) : [];
  const noCites = result?.kind === "ai" && result.done && !result.error && extractCitations(aiText).length === 0;

  return (
    <div className="space-y-4">
      <StatusLine status={status} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="flex flex-col gap-2 md:flex-row"
      >
        <label htmlFor="q" className="sr-only">
          Your question
        </label>
        <input
          id="q"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={500}
          placeholder="e.g. How fast does fire spread in microgravity?"
          className="flex-1 rounded border border-neutral-400 px-3 py-2"
        />
        <button
          type="submit"
          disabled={busy || !question.trim()}
          className="rounded bg-neutral-900 px-5 py-2 font-semibold text-white hover:bg-neutral-700 disabled:opacity-40"
        >
          {busy ? "Answering…" : "Ask"}
        </button>
      </form>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-neutral-600">Try:</span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setQuestion(s);
                ask(s);
              }}
              className="rounded-full border border-neutral-300 px-3 py-1 hover:bg-neutral-100"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {requestError && (
        <p role="alert" className="rounded border border-red-400 bg-red-50 p-3 text-red-900">
          {requestError}
        </p>
      )}

      {asked && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section aria-labelledby="answer-h" className="space-y-2">
            <h2 id="answer-h" className="text-lg font-semibold">
              Answer
            </h2>
            {!result && <p className="text-neutral-600">{busy ? "Waiting for the local AI…" : ""}</p>}
            {result?.kind === "ai" && (
              <AiExplanation title={`Answer from ${result.model}`}>
                <div aria-live="polite" aria-busy={!result.done}>
                  <CitedText text={result.text} knownIds={givenIds} />
                  {!result.done && <span className="animate-pulse"> ▍</span>}
                </div>
                {result.error && <p className="mt-2 text-sm font-medium text-red-800">⚠ {result.error}</p>}
              </AiExplanation>
            )}
            {result?.kind === "cached" && (
              <AiExplanation title="Pre-written answer (local AI is offline)">
                <CitedText text={result.text} knownIds={givenIds} />
              </AiExplanation>
            )}
            {result?.kind === "message" && (
              <p className="rounded-md border border-neutral-300 bg-neutral-50 p-4">{result.text}</p>
            )}
            {strayCites.length > 0 && (
              <p className="text-sm font-medium text-red-800">
                ⚠ The answer cites cards it was not given: {strayCites.join(", ")}. Treat those claims as unsupported.
              </p>
            )}
            {noCites && (
              <p className="text-sm font-medium text-red-800">⚠ The answer cites no cards. Check it against the cards.</p>
            )}
            {result && "reason" in result && result.reason && (
              <p className="text-xs text-neutral-500">Why no live AI: {result.reason}</p>
            )}
          </section>

          <section aria-labelledby="cards-h" className="space-y-2">
            <h2 id="cards-h" className="text-lg font-semibold">
              Cards given to the AI {cards && `(${cards.length})`}
            </h2>
            {cards === null ? (
              <p className="text-neutral-600">Finding cards…</p>
            ) : cards.length === 0 ? (
              <p className="text-neutral-700">No verified card matches these words.</p>
            ) : (
              <ul className="space-y-2">
                {cards.map((c) => (
                  <li key={c.card_id}>
                    <CardSummary card={c} experiment={experiments[c.card_id]} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
