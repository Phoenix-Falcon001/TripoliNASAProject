import type { Metadata } from "next";
import Link from "next/link";
import CardSummary from "@/components/CardSummary";
import { LayerBadge, NasaFound, OurReading } from "@/components/Layers";
import { experimentOf, getCardData } from "@/lib/cards";
import { rankCards } from "@/lib/rank";
import { CONTROL_CATEGORIES, CONTROL_LABELS, HAZARDS, HAZARD_LABELS } from "@/lib/types";

export const metadata: Metadata = { title: "What NASA doesn't know · Flame in Freefall" };

export default function GapsPage() {
  const data = getCardData();
  const rankOf = new Map(rankCards(data.cards).map((r) => [r.card.card_id, r.rank]));

  const open = data.cards
    .filter((c) => c.open_question)
    .sort(
      (a, b) =>
        b.scores.crew_safety - a.scores.crew_safety || rankOf.get(a.card_id)! - rankOf.get(b.card_id)!,
    );

  const count = (h: string, k: string) => data.cards.filter((c) => c.hazard === h && c.control_category === k).length;

  const byId = new Map(data.cards.map((c) => [c.card_id, c]));
  const seen = new Set<string>();
  const conflicts: [string, string][] = [];
  for (const c of data.cards) {
    for (const r of c.related_cards ?? []) {
      const key = [c.card_id, r.card_id].sort().join("|");
      if (r.relation === "conflicts" && byId.has(r.card_id) && !seen.has(key)) {
        seen.add(key);
        conflicts.push([c.card_id, r.card_id]);
      }
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">What NASA doesn&apos;t know yet</h1>
        <p className="mt-1 max-w-3xl text-neutral-700">
          Open questions the papers themselves state, where our verified evidence is thin, and where cards disagree.
        </p>
      </div>

      <section aria-labelledby="open-h">
        <h2 id="open-h" className="text-xl font-semibold">
          Open questions stated in the papers ({open.length})
        </h2>
        <p className="text-sm text-neutral-600">
          Sorted by our crew-safety score (highest first). The questions are NASA&apos;s; the order is ours.
        </p>
        {open.length === 0 ? (
          <p className="mt-2">No verified card records an open question yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {open.map((c) => (
              <li key={c.card_id}>
                <NasaFound title="Still unknown">
                  <p className="text-lg">{c.open_question}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-700">
                    <span>
                      From{" "}
                      <Link href={`/card/${c.card_id}`} className="font-mono text-blue-900 underline">
                        {c.card_id}
                      </Link>{" "}
                      · {experimentOf(data, c)} · {HAZARD_LABELS[c.hazard]}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <LayerBadge kind="ours" /> crew-safety priority {c.scores.crew_safety}/5
                    </span>
                  </p>
                </NasaFound>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="cov-h">
        <h2 id="cov-h" className="text-xl font-semibold">
          Where our evidence is thin
        </h2>
        <OurReading title="Verified cards per hazard and control">
          <p className="mb-3 text-sm">
            Each cell counts our verified cards. An empty cell is a gap in <em>our card set</em> — it does not prove NASA
            has not studied it.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white text-sm">
              <caption className="sr-only">Number of verified cards for each hazard and control category</caption>
              <thead>
                <tr>
                  <th scope="col" className="border border-neutral-300 p-2 text-left">
                    Hazard
                  </th>
                  {CONTROL_CATEGORIES.map((k) => (
                    <th key={k} scope="col" className="border border-neutral-300 p-2">
                      {CONTROL_LABELS[k]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HAZARDS.map((h) => (
                  <tr key={h}>
                    <th scope="row" className="border border-neutral-300 p-2 text-left font-medium">
                      {HAZARD_LABELS[h]}
                    </th>
                    {CONTROL_CATEGORIES.map((k) => {
                      const n = count(h, k);
                      return (
                        <td
                          key={k}
                          className={`border border-neutral-300 p-2 text-center ${n === 0 ? "text-neutral-400" : "font-semibold"}`}
                        >
                          {n === 0 ? "— none" : n}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </OurReading>
      </section>

      <section aria-labelledby="conf-h">
        <h2 id="conf-h" className="text-xl font-semibold">
          Cards that disagree ({conflicts.length})
        </h2>
        <p className="text-sm text-neutral-600">
          <LayerBadge kind="ours" /> Our team linked these cards as conflicting. Each finding is NASA&apos;s.
        </p>
        {conflicts.length === 0 ? (
          <p className="mt-2">No conflicting cards recorded.</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {conflicts.map(([a, b]) => (
              <li key={`${a}|${b}`} className="grid gap-2 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <CardSummary card={byId.get(a)!} experiment={experimentOf(data, byId.get(a)!)} />
                <span className="text-center text-sm font-bold" aria-label="conflicts with">
                  ⇄ conflicts
                </span>
                <CardSummary card={byId.get(b)!} experiment={experimentOf(data, byId.get(b)!)} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
