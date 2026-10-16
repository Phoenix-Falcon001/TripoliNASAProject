"use client";

import { useMemo, useState } from "react";
import CardSummary from "@/components/CardSummary";
import StabilityBadge from "@/components/StabilityBadge";
import WeightSliders from "@/components/WeightSliders";
import { NO_FILTERS, NO_MATERIAL, distinct, filterItems, type CardFilters } from "@/lib/filter";
import { DEFAULT_WEIGHTS, formatScore, rankCards, type Weights } from "@/lib/rank";
import type { Stability } from "@/lib/stability";
import { CONTROL_CATEGORIES, CONTROL_LABELS, HAZARDS, HAZARD_LABELS, type Card } from "@/lib/types";

export interface ExploreItem {
  card: Card;
  experiment: string;
  stability?: Stability;
}

interface Option {
  value: string;
  label: string;
}

function Select({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: Option[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="text-sm font-medium text-neutral-700">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const TOP_N = 10;

export default function ExploreList({ items }: { items: ExploreItem[] }) {
  const [filters, setFilters] = useState<CardFilters>(NO_FILTERS);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);

  const ranked = useMemo(() => {
    const byId = new Map(items.map((i) => [i.card.card_id, i]));
    return rankCards(
      items.map((i) => i.card),
      weights,
    ).map((r) => ({ ...byId.get(r.card.card_id)!, score: r.score, rank: r.rank }));
  }, [items, weights]);
  const shown = useMemo(() => filterItems(ranked, filters), [ranked, filters]);

  const experiments = distinct(items.map((i) => i.experiment)).map((e) => ({ value: e, label: e }));
  const usedHazards = new Set(items.map((i) => i.card.hazard));
  const usedControls = new Set(items.map((i) => i.card.control_category));
  const materials: Option[] = distinct(items.flatMap((i) => (i.card.material_or_fuel ? [i.card.material_or_fuel] : []))).map(
    (m) => ({ value: m, label: m }),
  );
  if (items.some((i) => !i.card.material_or_fuel)) materials.push({ value: NO_MATERIAL, label: "(not stated)" });

  const set = (key: keyof CardFilters) => (v: string) => setFilters((f) => ({ ...f, [key]: v }));
  const anyFilter = Object.values(filters).some(Boolean);

  return (
    <div className="mt-4 space-y-3">
      <WeightSliders weights={weights} onChange={setWeights} />

      <form
        aria-label="Filter cards"
        className="grid grid-cols-2 gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-3 md:grid-cols-5 md:items-end"
        onSubmit={(e) => e.preventDefault()}
      >
        <Select id="f-exp" label="Experiment" value={filters.experiment} options={experiments} onChange={set("experiment")} />
        <Select
          id="f-hazard"
          label="Hazard"
          value={filters.hazard}
          options={HAZARDS.filter((h) => usedHazards.has(h)).map((h) => ({ value: h, label: HAZARD_LABELS[h] }))}
          onChange={set("hazard")}
        />
        <Select
          id="f-control"
          label="Control category"
          value={filters.control}
          options={CONTROL_CATEGORIES.filter((c) => usedControls.has(c)).map((c) => ({ value: c, label: CONTROL_LABELS[c] }))}
          onChange={set("control")}
        />
        <Select id="f-material" label="Material" value={filters.material} options={materials} onChange={set("material")} />
        <button
          type="button"
          onClick={() => setFilters(NO_FILTERS)}
          disabled={!anyFilter}
          className="rounded border border-neutral-400 bg-white px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 disabled:opacity-40"
        >
          Reset filters
        </button>
      </form>

      <p aria-live="polite" className="text-sm text-neutral-600">
        Showing {shown.length} of {items.length} cards · sorted by score ({weights.crew}/{weights.evid}/{weights.mm}). Stability
        badges use all 27 weight mixes, not just the sliders.
      </p>

      {shown.length === 0 ? (
        <p className="mt-6 text-neutral-700">No cards match these filters.</p>
      ) : (
        <ol className="space-y-3">
          {shown.map(({ card, score, rank, experiment, stability }) => (
            <li key={card.card_id}>
              <CardSummary
                card={card}
                experiment={experiment}
                before={
                  <span className="text-sm font-semibold text-neutral-500">
                    #{rank}
                    {rank <= TOP_N && <span className="sr-only"> (top {TOP_N})</span>}
                  </span>
                }
                after={
                  <>
                    Score <strong>{formatScore(score)}</strong>
                    <span className="text-neutral-500">
                      {" "}
                      (crew {card.scores.crew_safety} · evidence {card.scores.evidence} · Moon/Mars {card.scores.moon_mars})
                    </span>
                  </>
                }
              >
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-600">
                  <StabilityBadge s={stability} />
                  {card.material_or_fuel && <span>Material: {card.material_or_fuel}</span>}
                </div>
              </CardSummary>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
