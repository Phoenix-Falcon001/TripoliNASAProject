"use client";

import { DEFAULT_WEIGHTS, type Weights } from "@/lib/rank";
import { setWeight, type WeightKey } from "@/lib/weights";

const LABELS: Record<WeightKey, string> = {
  crew: "Crew safety",
  evid: "Strength of evidence",
  mm: "Moon/Mars relevance",
};

export default function WeightSliders({ weights, onChange }: { weights: Weights; onChange: (w: Weights) => void }) {
  const isDefault =
    weights.crew === DEFAULT_WEIGHTS.crew && weights.evid === DEFAULT_WEIGHTS.evid && weights.mm === DEFAULT_WEIGHTS.mm;
  return (
    <fieldset className="rounded-md border border-orange-300 bg-orange-50 p-3">
      <legend className="px-1 text-sm font-semibold">
        <span aria-hidden="true">▲ </span>Our priorities (team weights, not NASA&apos;s) — always total 100%
      </legend>
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
        {(Object.keys(LABELS) as WeightKey[]).map((k) => (
          <div key={k}>
            <label htmlFor={`w-${k}`} className="flex justify-between text-sm font-medium">
              <span>{LABELS[k]}</span>
              <output htmlFor={`w-${k}`} className="font-mono">
                {weights[k]}%
              </output>
            </label>
            <input
              id={`w-${k}`}
              type="range"
              min={0}
              max={100}
              step={1}
              value={weights[k]}
              onChange={(e) => onChange(setWeight(weights, k, Number(e.target.value)))}
              className="mt-1 w-full accent-orange-600"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange(DEFAULT_WEIGHTS)}
          disabled={isDefault}
          className="rounded border border-neutral-400 bg-white px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 disabled:opacity-40"
        >
          Reset to 40/35/25
        </button>
      </div>
    </fieldset>
  );
}
