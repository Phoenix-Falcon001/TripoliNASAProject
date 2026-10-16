import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AiExplanation, NasaFound, OurReading } from "@/components/Layers";
import { experimentOf, findCard, findSource, getAiExplanation, getCardData } from "@/lib/cards";
import { DEFAULT_WEIGHTS, formatScore, score } from "@/lib/rank";
import { CONTROL_LABELS, HAZARD_LABELS, type Relation } from "@/lib/types";

export function generateStaticParams() {
  return getCardData().cards.map((c) => ({ id: c.card_id }));
}

export async function generateMetadata({ params }: PageProps<"/card/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `${id} · Flame in Freefall` };
}

const RELATION_LABELS: Record<Relation, string> = {
  agrees: "Agrees with",
  conflicts: "Conflicts with",
  extends: "Extends",
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  full_paper: "Full paper",
  slides: "Slides",
  summary: "Summary",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm font-semibold text-neutral-700">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

export default async function CardPage({ params }: PageProps<"/card/[id]">) {
  const { id } = await params;
  const data = getCardData();
  const card = findCard(data, id);
  if (!card) notFound();

  const source = findSource(data, card.source_id);
  const ai = getAiExplanation(card.card_id);
  const values = card.values ?? [];
  const related = card.related_cards ?? [];

  return (
    <article className="space-y-5">
      <div>
        <Link href="/explore" className="text-sm text-blue-800 underline">
          ← Back to Explore
        </Link>
        <h1 className="mt-2 flex flex-wrap items-baseline gap-x-3 text-2xl font-bold">
          <span className="font-mono">{card.card_id}</span>
          <span className="text-lg font-normal text-neutral-700">{experimentOf(data, card)}</span>
        </h1>
        <p className="mt-1 flex flex-wrap gap-2 text-sm">
          <span className="rounded bg-neutral-200 px-2 py-0.5">Hazard: {HAZARD_LABELS[card.hazard]}</span>
          <span className="rounded bg-neutral-200 px-2 py-0.5">Control: {CONTROL_LABELS[card.control_category]}</span>
          <span className="rounded bg-neutral-200 px-2 py-0.5">
            Reviewed by: {card.reviewed_by ?? "—"}
            {card.expert_checked ? " · expert checked" : ""}
          </span>
        </p>
      </div>

      <NasaFound title="Finding">
        <p className="text-lg">{card.finding}</p>

        <blockquote className="mt-3 border-l-4 border-blue-300 pl-3 italic">
          “{card.evidence_quote}”
        </blockquote>
        <p className="mt-1 text-sm text-neutral-700">
          Source: {source ? source.title : `Unknown source ${card.source_id}`} · PDF page {card.page} ·{" "}
          {SOURCE_TYPE_LABELS[card.source_type] ?? card.source_type}
          {source?.ntrs_id ? ` · NTRS ${source.ntrs_id}` : ""}
        </p>

        <dl className="mt-4 grid gap-3 md:grid-cols-3">
          <Field label="Material / fuel">{card.material_or_fuel ?? "Not stated"}</Field>
          <Field label="Conditions">{card.conditions ?? "Not stated"}</Field>
          <Field label="Earth comparison">{card.earth_comparison ?? "Not stated"}</Field>
        </dl>

        <h3 className="mt-4 text-sm font-semibold text-neutral-700">Values</h3>
        {values.length === 0 ? (
          <p className="text-sm text-neutral-700">No values recorded on this card.</p>
        ) : (
          <table className="mt-1 w-full max-w-2xl border-collapse text-sm">
            <thead>
              <tr className="border-b border-blue-300 text-left">
                <th scope="col" className="py-1 pr-4">Quantity</th>
                <th scope="col" className="py-1 pr-4">Value</th>
                <th scope="col" className="py-1">Unit</th>
              </tr>
            </thead>
            <tbody>
              {values.map((v, i) => (
                <tr key={i} className="border-b border-blue-100">
                  <td className="py-1 pr-4">{v.quantity}</td>
                  <td className="py-1 pr-4 font-mono">{v.value}</td>
                  <td className="py-1">{v.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </NasaFound>

      <NasaFound title="What the paper says is still unknown">
        <p>{card.open_question ?? "The paper does not state an open question for this finding."}</p>
      </NasaFound>

      <OurReading title="Safety reading and scores">
        {card.team_interpretation ? (
          <p>
            {card.team_interpretation.text}{" "}
            <span className="text-sm text-neutral-600">(suggested by {card.team_interpretation.suggested_by})</span>
          </p>
        ) : (
          <p>No team reading on this card yet.</p>
        )}
        <p className="mt-3 text-sm">
          Default score <strong>{formatScore(score(card.scores, DEFAULT_WEIGHTS))}</strong> (weights crew{" "}
          {DEFAULT_WEIGHTS.crew}% · evidence {DEFAULT_WEIGHTS.evid}% · Moon/Mars {DEFAULT_WEIGHTS.mm}%)
        </p>
        <table className="mt-2 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-orange-300 text-left">
              <th scope="col" className="py-1 pr-4">Criterion</th>
              <th scope="col" className="py-1 pr-4">Score (1–5)</th>
              <th scope="col" className="py-1">Why</th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                ["Crew safety", "crew_safety"],
                ["Strength of evidence", "evidence"],
                ["Moon/Mars relevance", "moon_mars"],
              ] as const
            ).map(([label, key]) => (
              <tr key={key} className="border-b border-orange-100">
                <td className="py-1 pr-4">{label}</td>
                <td className="py-1 pr-4 font-mono">{card.scores[key]}</td>
                <td className="py-1">{card.score_reasons[key]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </OurReading>

      <AiExplanation title="Plain-language explanation">
        <p>{ai ?? "No AI explanation for this card yet."}</p>
      </AiExplanation>

      <section aria-labelledby="related-heading" className="rounded-md border border-neutral-200 p-4">
        <h2 id="related-heading" className="text-base font-semibold">
          Related cards
        </h2>
        {related.length === 0 ? (
          <p className="mt-1 text-sm text-neutral-700">No related cards recorded.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {related.map((r) => {
              const target = findCard(data, r.card_id);
              return (
                <li key={r.card_id} className="text-sm">
                  <span className="font-medium">{RELATION_LABELS[r.relation]}</span>{" "}
                  {target ? (
                    <Link href={`/card/${r.card_id}`} className="font-mono text-blue-800 underline">
                      {r.card_id}
                    </Link>
                  ) : (
                    <span className="font-mono">{r.card_id}</span>
                  )}
                  {target ? (
                    <span className="text-neutral-700"> — {target.finding}</span>
                  ) : (
                    <span className="text-neutral-500"> (not in the verified set)</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </article>
  );
}
