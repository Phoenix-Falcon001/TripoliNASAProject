import type { Stability } from "@/lib/stability";

/** Text + symbol, never colour alone. */
export default function StabilityBadge({ s }: { s: Stability | undefined }) {
  if (!s) return null;
  const pct = Math.round(s.share * 100);
  const stable = s.label === "Stable";
  return (
    <span
      title={`In the top 10 for ${pct}% of the 27 weight mixes we tested`}
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${
        stable ? "border-neutral-700 bg-white text-neutral-900" : "border-dashed border-neutral-500 bg-neutral-50 text-neutral-700"
      }`}
    >
      <span aria-hidden="true">{stable ? "■" : "↕"}</span>
      {s.label} <span className="text-neutral-500">({pct}%)</span>
    </span>
  );
}
