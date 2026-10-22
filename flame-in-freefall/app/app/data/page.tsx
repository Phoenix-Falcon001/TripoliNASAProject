import type { Metadata } from "next";
import Link from "next/link";
import HazardChart from "@/components/HazardChart";
import { experimentOf, getCardData, getEvalResults } from "@/lib/cards";
import { CONTROL_LABELS, HAZARDS, HAZARD_LABELS } from "@/lib/types";

export const metadata: Metadata = { title: "Data · Flame in Freefall" };

const YES = /^(y|yes|true|1)$/i;

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-neutral-200 p-4">
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm text-neutral-600">{label}</div>
    </div>
  );
}

const th = "border-b border-neutral-300 px-2 py-1.5 text-left font-semibold";
const td = "border-b border-neutral-100 px-2 py-1.5 align-top";

export default function DataPage() {
  const data = getCardData();
  const { cards, sources, isSample } = data;
  const usedSourceIds = new Set(cards.map((c) => c.source_id));
  const experiments = [...new Set(cards.map((c) => experimentOf(data, c)))].sort();
  const hazardCounts = HAZARDS.map((h) => ({ label: HAZARD_LABELS[h], count: cards.filter((c) => c.hazard === h).length }));

  const evalRows = getEvalResults();
  const groups = new Map<string, Record<string, string>[]>();
  for (const r of evalRows) {
    const key = `${r.mode || "?"} · ${r.model || "?"}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const verdicts = [...new Set(evalRows.map((r) => r.verdict || "(not marked)"))].sort();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Data</h1>
        <p className="mt-1 max-w-3xl text-neutral-700">
          Everything the app shows comes from these files. Only cards marked <code>verified</code> by a human reviewer are
          included.
        </p>
        <p className="mt-2 flex flex-wrap gap-3 text-sm">
          <a href="/download/cards.json" className="rounded border border-neutral-400 px-3 py-1.5 hover:bg-neutral-100">
            ⬇ Download {isSample ? "SAMPLE " : "verified "}cards (JSON)
          </a>
          <a href="/download/sources.csv" className="rounded border border-neutral-400 px-3 py-1.5 hover:bg-neutral-100">
            ⬇ Download sources (CSV)
          </a>
        </p>
      </div>

      <section aria-labelledby="sum-h">
        <h2 id="sum-h" className="sr-only">
          Summary
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label={isSample ? "sample cards" : "verified cards"} value={cards.length} />
          <Stat label="sources used" value={usedSourceIds.size} />
          <Stat label="experiments" value={experiments.length} />
          <Stat label="cards with an open question" value={cards.filter((c) => c.open_question).length} />
        </div>
      </section>

      <section aria-labelledby="haz-h">
        <h2 id="haz-h" className="text-xl font-semibold">
          Verified cards per hazard
        </h2>
        <HazardChart data={hazardCounts} />
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer">Show as a table</summary>
          <table className="mt-2 border-collapse">
            <thead>
              <tr>
                <th scope="col" className={th}>Hazard</th>
                <th scope="col" className={th}>Cards</th>
              </tr>
            </thead>
            <tbody>
              {hazardCounts.map((h) => (
                <tr key={h.label}>
                  <td className={td}>{h.label}</td>
                  <td className={`${td} font-mono`}>{h.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      <section aria-labelledby="src-h">
        <h2 id="src-h" className="text-xl font-semibold">
          Sources
        </h2>
        <div className="overflow-x-auto">
          <table className="mt-2 w-full border-collapse text-sm">
            <thead>
              <tr>
                <th scope="col" className={th}>ID</th>
                <th scope="col" className={th}>Title</th>
                <th scope="col" className={th}>Experiment</th>
                <th scope="col" className={th}>Type</th>
                <th scope="col" className={th}>Year</th>
                <th scope="col" className={th}>NTRS</th>
                <th scope="col" className={th}>Cards shown</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.source_id}>
                  <td className={`${td} font-mono`}>{s.source_id}</td>
                  <td className={td}>{s.title}</td>
                  <td className={td}>{s.experiment}</td>
                  <td className={td}>{s.source_type}</td>
                  <td className={td}>{s.year || "—"}</td>
                  <td className={td}>
                    {s.url ? (
                      <a href={s.url} className="text-blue-900 underline" rel="noreferrer">
                        {s.ntrs_id || "link"}
                      </a>
                    ) : (
                      s.ntrs_id || "—"
                    )}
                  </td>
                  <td className={`${td} font-mono`}>{cards.filter((c) => c.source_id === s.source_id).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-xs text-neutral-500">NTRS links open the NASA website and need internet; the app itself does not.</p>
      </section>

      <section aria-labelledby="cards-h">
        <h2 id="cards-h" className="text-xl font-semibold">
          All {isSample ? "sample" : "verified"} cards
        </h2>
        <div className="overflow-x-auto">
          <table className="mt-2 w-full border-collapse text-sm">
            <thead>
              <tr>
                <th scope="col" className={th}>Card</th>
                <th scope="col" className={th}>Source · page</th>
                <th scope="col" className={th}>Hazard</th>
                <th scope="col" className={th}>Control</th>
                <th scope="col" className={th}>Crew / Evid / M&M</th>
                <th scope="col" className={th}>Reviewed by</th>
                <th scope="col" className={th}>Expert checked</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((c) => (
                <tr key={c.card_id}>
                  <td className={td}>
                    <Link href={`/card/${c.card_id}`} className="font-mono text-blue-900 underline">
                      {c.card_id}
                    </Link>
                  </td>
                  <td className={td}>
                    {c.source_id} · p.{c.page}
                  </td>
                  <td className={td}>{HAZARD_LABELS[c.hazard]}</td>
                  <td className={td}>{CONTROL_LABELS[c.control_category]}</td>
                  <td className={`${td} font-mono`}>
                    {c.scores.crew_safety} / {c.scores.evidence} / {c.scores.moon_mars}
                  </td>
                  <td className={td}>{c.reviewed_by ?? "—"}</td>
                  <td className={td}>{c.expert_checked ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="eval-h">
        <h2 id="eval-h" className="text-xl font-semibold">
          AI accuracy test (G1)
        </h2>
        {evalRows.length === 0 ? (
          <p className="mt-1 text-neutral-700">
            Not run yet. Results will appear here from <code>data/eval/results.csv</code>.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-2 w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th scope="col" className={th}>Mode · model</th>
                  <th scope="col" className={th}>Answers</th>
                  {verdicts.map((v) => (
                    <th key={v} scope="col" className={th}>
                      Verdict: {v}
                    </th>
                  ))}
                  <th scope="col" className={th}>Invented a number</th>
                  <th scope="col" className={th}>Cited a card</th>
                  <th scope="col" className={th}>Said &quot;Not in our evidence&quot;</th>
                </tr>
              </thead>
              <tbody>
                {[...groups].map(([key, rows]) => (
                  <tr key={key}>
                    <td className={td}>{key}</td>
                    <td className={`${td} font-mono`}>{rows.length}</td>
                    {verdicts.map((v) => (
                      <td key={v} className={`${td} font-mono`}>
                        {rows.filter((r) => (r.verdict || "(not marked)") === v).length}
                      </td>
                    ))}
                    <td className={`${td} font-mono`}>{rows.filter((r) => YES.test(r.invented_number ?? "")).length}</td>
                    <td className={`${td} font-mono`}>{rows.filter((r) => YES.test(r.cited_source ?? "")).length}</td>
                    <td className={`${td} font-mono`}>{rows.filter((r) => YES.test(r.said_not_in_evidence ?? "")).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
