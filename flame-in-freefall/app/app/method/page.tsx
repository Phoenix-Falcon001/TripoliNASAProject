import type { Metadata } from "next";
import Link from "next/link";
import { AiExplanation, NasaFound, OurReading } from "@/components/Layers";
import { DEFAULT_MODEL } from "@/lib/ask";
import { STRICT_PROMPT } from "@/lib/prompts";
import { DEFAULT_WEIGHTS } from "@/lib/rank";
import { STABLE_THRESHOLD, TOP_N, weightCombos } from "@/lib/stability";

export const metadata: Metadata = { title: "Method · Flame in Freefall" };

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm font-bold text-white">
        {n}
      </span>
      <div>
        <h3 className="font-semibold">
          <span className="sr-only">Step {n}: </span>
          {title}
        </h3>
        <div className="text-neutral-700">{children}</div>
      </div>
    </li>
  );
}

export default function MethodPage() {
  const combos = weightCombos().length;
  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Method</h1>
        <p className="mt-1 text-neutral-700">How a sentence in a NASA paper becomes a card in this app, and how we keep facts, opinions and AI apart.</p>
      </div>

      <section aria-labelledby="pipe-h">
        <h2 id="pipe-h" className="text-xl font-semibold">From paper to card</h2>
        <ol className="mt-3 space-y-4">
          <Step n={1} title="Extract the text">
            Each NASA PDF (SAFFIRE, FLEX, BASS-II) is turned into text page by page, so every card can point to an exact PDF page.
          </Step>
          <Step n={2} title="Draft a card">
            One card = one finding from one source: an exact quote (max 25 words), the finding, conditions, numbers as written, and any
            open question the paper states.
          </Step>
          <Step n={3} title="Automatic check">
            A script checks the card against the schema, finds the quote on the stated page, and checks that every number appears on
            that page. Failing cards are flagged with reasons.
          </Step>
          <Step n={4} title="Human review">
            A team member reads the card against the PDF and only then marks it <code>verified</code>. The app shows verified cards
            only — never drafts, flagged or rejected cards.
          </Step>
        </ol>
      </section>

      <section aria-labelledby="layers-h" className="space-y-3">
        <h2 id="layers-h" className="text-xl font-semibold">Three layers, always labelled</h2>
        <NasaFound>The finding, quote, values, conditions, Earth comparison, open questions and the source page.</NasaFound>
        <OurReading>Our team&apos;s safety interpretation, the 1–5 scores and their reasons, and links between cards.</OurReading>
        <AiExplanation>Anything written by the local AI (live or pre-written). It must cite cards and may still be wrong.</AiExplanation>
      </section>

      <section aria-labelledby="rank-h">
        <h2 id="rank-h" className="text-xl font-semibold">Ranking</h2>
        <p className="mt-2 text-neutral-700">Each card has three team scores from 1 to 5. The ranking score is:</p>
        <p className="mt-2 rounded bg-neutral-100 p-3 font-mono text-sm">
          score = (w_crew × crew_safety + w_evid × evidence + w_mm × moon_mars) / 100
        </p>
        <p className="mt-2 text-neutral-700">
          Default weights are {DEFAULT_WEIGHTS.crew}% crew safety, {DEFAULT_WEIGHTS.evid}% strength of evidence and{" "}
          {DEFAULT_WEIGHTS.mm}% Moon/Mars relevance. You can change them on <Link href="/explore" className="underline">Explore</Link>.
          Ties are broken by card ID so the order never changes randomly.
        </p>
        <h3 className="mt-4 font-semibold">Is the ranking stable?</h3>
        <p className="mt-1 text-neutral-700">
          We re-rank the cards under all {combos} weight mixes where each weight is 10–60% (steps of 10) and they add up to 100%. A
          card in the top {TOP_N} in at least {Math.round(STABLE_THRESHOLD * 100)}% of mixes is marked <strong>■ Stable</strong>;
          otherwise <strong>↕ Depends on priorities</strong>.
        </p>
      </section>

      <section aria-labelledby="ai-h">
        <h2 id="ai-h" className="text-xl font-semibold">The Ask page and the local AI</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-700">
          <li>The AI runs on this laptop with Ollama (default model <code>{DEFAULT_MODEL}</code>). No internet and no cloud AI.</li>
          <li>Your question is matched to cards by simple keywords; only the top 6 cards are given to the AI.</li>
          <li>The answer must cite card IDs. The app warns if it cites a card it was not given, or cites none.</li>
          <li>If the AI is offline, the app shows a pre-written answer (if one matches) or just the most relevant cards.</li>
        </ul>
        <h3 className="mt-4 font-semibold">The exact prompt</h3>
        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-neutral-100 p-3 text-sm">{STRICT_PROMPT}</pre>
      </section>

      <section aria-labelledby="lim-h">
        <h2 id="lim-h" className="text-xl font-semibold">Limits</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-700">
          <li>We cover only the papers listed on the <Link href="/data" className="underline">Data</Link> page — not all NASA research.</li>
          <li>Scores are our judgement. Use the sliders and stability badges to see how much the ranking depends on them.</li>
          <li>&quot;Gaps&quot; in our card set are not proof that NASA has not studied something.</li>
          <li>Nothing here is NASA guidance or an official safety recommendation.</li>
        </ul>
      </section>
    </div>
  );
}
