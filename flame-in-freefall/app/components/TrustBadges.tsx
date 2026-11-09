import type { TrustBadge } from "@/lib/trust";

/** What was checked on this card. Text + symbol (✓ / –), never colour alone. */
export default function TrustBadges({ badges, compact = false }: { badges: TrustBadge[]; compact?: boolean }) {
  return (
    <ul aria-label="Trust checks" className="flex flex-wrap gap-1.5">
      {badges.map((b) => (
        <li
          key={b.label}
          className={`rounded border px-2 py-0.5 ${compact ? "text-xs" : "text-sm"} ${
            b.ok ? "border-neutral-700 bg-white text-neutral-900" : "border-dashed border-neutral-400 bg-neutral-50 text-neutral-600"
          }`}
        >
          <span aria-hidden="true">{b.ok ? "✓ " : "– "}</span>
          {b.label}
        </li>
      ))}
    </ul>
  );
}
