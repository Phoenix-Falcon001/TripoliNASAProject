import type { EvalSummaryData, ModeMetrics } from "@/lib/evalSummary";

const ROWS: { label: string; key: keyof ModeMetrics; better: "lower" | "higher" }[] = [
  { label: "Answers with a number that is in none of our verified cards", key: "invented_numbers_pct", better: "lower" },
  { label: "Answers that cite an evidence card", key: "cites_a_card_pct", better: "higher" },
  { label: "Says \"Not in our evidence\" when the cards can't answer", key: "not_in_evidence_correct_pct", better: "higher" },
  { label: "Human verdict: correct", key: "verdict_correct_pct", better: "higher" },
  { label: "Human verdict: partly correct", key: "verdict_partly_pct", better: "higher" },
  { label: "Human verdict: wrong", key: "verdict_wrong_pct", better: "lower" },
];

const fmt = (v: number | null | undefined) => (v === null || v === undefined ? "not measured" : `${v}%`);

/** "Plain AI vs our evidence" (G1). Same model and settings; only the cards differ. */
export default function EvalSummary({ summary }: { summary: EvalSummaryData | null }) {
  if (!summary) {
    return (
      <p className="rounded-md border border-neutral-300 bg-neutral-50 p-3 text-neutral-700">
        Plain AI vs our evidence: <strong>not measured yet</strong>. Results appear here after the team runs the G1 test
        (<code>npm run eval:g1</code>).
      </p>
    );
  }
  const models = Object.entries(summary.models);
  const sample = models.some(([, m]) => m.plain?.sample_data || m.cards?.sample_data);
  return (
    <div className="space-y-2">
      {sample && (
        <p role="note" className="rounded bg-red-700 px-3 py-1 text-sm font-bold text-white">
          ⚠ SAMPLE RUN on fake DEMO- cards — these numbers say nothing about real answers.
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="mb-1 text-left text-neutral-700">
            Same local model and settings, {summary.questions} questions. <strong>Plain AI</strong> gets the question only;{" "}
            <strong>with our cards</strong> gets the verified cards found for the question and must cite them.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="border-b border-neutral-400 px-2 py-1.5 text-left">Measure</th>
              {models.map(([model]) => [
                <th key={`${model}-p`} scope="col" className="border-b border-neutral-400 px-2 py-1.5 text-left">
                  Plain AI <span className="font-normal text-neutral-600">({model})</span>
                </th>,
                <th key={`${model}-c`} scope="col" className="border-b border-neutral-400 px-2 py-1.5 text-left">
                  With our cards <span className="font-normal text-neutral-600">({model})</span>
                </th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.key}>
                <th scope="row" className="border-b border-neutral-200 px-2 py-1.5 text-left font-normal">
                  {r.label} <span className="text-xs text-neutral-500">({r.better} is better)</span>
                </th>
                {models.map(([model, m]) => [
                  <td key={`${model}-p`} className="border-b border-neutral-200 px-2 py-1.5 font-mono">{fmt(m.plain?.[r.key] as number | null)}</td>,
                  <td key={`${model}-c`} className="border-b border-neutral-200 px-2 py-1.5 font-mono font-semibold">{fmt(m.cards?.[r.key] as number | null)}</td>,
                ])}
              </tr>
            ))}
            <tr>
              <th scope="row" className="px-2 py-1.5 text-left font-normal">Median answer time</th>
              {models.map(([model, m]) => [
                <td key={`${model}-p`} className="px-2 py-1.5 font-mono">{m.plain?.median_seconds != null ? `${m.plain.median_seconds} s` : "not measured"}</td>,
                <td key={`${model}-c`} className="px-2 py-1.5 font-mono">{m.cards?.median_seconds != null ? `${m.cards.median_seconds} s` : "not measured"}</td>,
              ])}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-neutral-600">
        Measured {summary.generated_at.slice(0, 10)}. Human verdicts count only answers a team member has marked. &quot;not measured&quot; means
        we have no data for it — never an estimate.
      </p>
    </div>
  );
}
