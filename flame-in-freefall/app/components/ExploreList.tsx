"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LayerBadge } from "@/components/Layers";
import { NO_FILTERS, NO_MATERIAL, distinct, filterItems, type CardFilters } from "@/lib/filter";
import { formatScore } from "@/lib/rank";
import { CONTROL_CATEGORIES, CONTROL_LABELS, HAZARDS, HAZARD_LABELS, type Card } from "@/lib/types";

export interface ExploreItem {
  card: Card;
  score: number;
  rank: number;
  experiment: string;
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

export default function ExploreList({ items }: { items: ExploreItem[] }) {
  const [filters, setFilters] = useState<CardFilters>(NO_FILTERS);
  const shown = useMemo(() => filterItems(items, filters), [items, filters]);

  const experiments = distinct(items.map((i) => i.experiment)).map((e) => ({ value: e, label: e }));
  const usedHazards = new Set(items.map((i) => i.card.hazard));
  const usedControls = new Set(items.map((i) => i.card.control_category));
  const materials: Option[] = distinct(items.flatMap((i) => (i.card.material_or_fuel ? [i.card.material_or_fuel] : []))).map(
    (m) => ({ value: m, label: m }),
  );
  if (items.some((i) => !i.card.material_or_fuel)) materials.push({ value: NO_MATERIAL, label: "(not stated)" });

  const set = <K extends keyof CardFilters>(key: K) => (v: string) => setFilters((f) => ({ ...f, [key]: v }));
  const anyFilter = Object.values(filters).some(Boolean);

  return (
    <div className="mt-4">
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

      <p aria-live="polite" className="mt-3 text-sm text-neutral-600">
        Showing {shown.length} of {items.length} cards · sorted by score (40/35/25)
      </p>

      {shown.length === 0 ? (
        <p className="mt-6 text-neutral-700">No cards match these filters.</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {shown.map(({ card, score, rank, experiment }) => (
            <li key={card.card_id}>
              <Link
                href={`/card/${card.card_id}`}
                className="block rounded-md border border-neutral-200 p-4 hover:border-neutral-500 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-blue-700"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-sm font-semibold text-neutral-500">#{rank}</span>
                  <span className="font-mono font-bold">{card.card_id}</span>
                  <span className="text-sm text-neutral-700">{experiment}</span>
                  <span className="rounded bg-neutral-200 px-2 py-0.5 text-xs">{HAZARD_LABELS[card.hazard]}</span>
                  <span className="rounded bg-neutral-200 px-2 py-0.5 text-xs">{CONTROL_LABELS[card.control_category]}</span>
                  <span className="ml-auto text-sm">
                    Score <strong>{formatScore(score)}</strong>
                    <span className="text-neutral-500">
                      {" "}
                      (crew {card.scores.crew_safety} · evidence {card.scores.evidence} · Moon/Mars {card.scores.moon_mars})
                    </span>
                  </span>
                </div>
                <div className="mt-2 flex items-start gap-2">
                  <LayerBadge kind="nasa" />
                  <p className="text-neutral-900">{card.finding}</p>
                </div>
                {card.material_or_fuel && <p className="mt-1 text-sm text-neutral-600">Material: {card.material_or_fuel}</p>}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
