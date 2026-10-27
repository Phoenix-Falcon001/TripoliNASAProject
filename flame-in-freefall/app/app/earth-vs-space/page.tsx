import type { Metadata } from "next";
import Link from "next/link";
import { LayerBadge } from "@/components/Layers";
import { experimentOf, getCardData } from "@/lib/cards";
import { HAZARDS, HAZARD_LABELS } from "@/lib/types";

export const metadata: Metadata = { title: "Earth vs Space · Flame in Freefall" };

export default function EarthVsSpacePage() {
  const data = getCardData();
  const withComparison = data.cards.filter((c) => c.earth_comparison);
  const groups = HAZARDS.map((h) => ({ hazard: h, cards: withComparison.filter((c) => c.hazard === h) })).filter(
    (g) => g.cards.length > 0,
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">Earth vs Space</h1>
      <p className="mt-1 max-w-3xl text-neutral-700">
        How fire behaves in microgravity compared with Earth — only where the NASA source itself makes the comparison. Both
        columns are what NASA found; we add nothing.
      </p>
      <p className="mt-1 text-sm text-neutral-600">
        {withComparison.length} of {data.cards.length} verified cards include an Earth comparison.
      </p>

      {groups.length === 0 && <p className="mt-6">No verified card has an Earth comparison yet.</p>}

      {groups.map((g) => (
        <section key={g.hazard} aria-labelledby={`h-${g.hazard}`} className="mt-6">
          <h2 id={`h-${g.hazard}`} className="text-lg font-semibold">
            {HAZARD_LABELS[g.hazard]}
          </h2>
          <ul className="mt-2 space-y-3">
            {g.cards.map((c) => (
              <li key={c.card_id} className="rounded-md border-l-8 border-blue-600 bg-blue-50 p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <LayerBadge kind="nasa" />
                  <Link href={`/card/${c.card_id}`} className="font-mono font-bold text-blue-900 underline">
                    {c.card_id}
                  </Link>
                  <span className="text-sm text-neutral-700">{experimentOf(data, c)}</span>
                  {c.material_or_fuel && <span className="text-sm text-neutral-600">· {c.material_or_fuel}</span>}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-700">
                      <span aria-hidden="true">🛰 </span>In space
                    </h3>
                    <p className="mt-1">{c.finding}</p>
                    {c.conditions && <p className="mt-1 text-sm text-neutral-700">Conditions: {c.conditions}</p>}
                    {(c.values ?? []).length > 0 && (
                      <ul className="mt-1 text-sm">
                        {c.values!.map((v, i) => (
                          <li key={i}>
                            {v.quantity}: <span className="font-mono">{v.value}</span> {v.unit}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="md:border-l md:border-blue-200 md:pl-4">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-700">
                      <span aria-hidden="true">🌍 </span>On Earth (as stated in the source)
                    </h3>
                    <p className="mt-1">{c.earth_comparison}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
