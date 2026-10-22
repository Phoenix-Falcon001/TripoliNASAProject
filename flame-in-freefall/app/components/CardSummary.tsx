import Link from "next/link";
import type { ReactNode } from "react";
import { LayerBadge } from "@/components/Layers";
import { CONTROL_LABELS, HAZARD_LABELS, type Card } from "@/lib/types";

/** Compact card: id, experiment, hazard, control, and the NASA finding. Server- and client-safe. */
export default function CardSummary({
  card,
  experiment,
  before,
  after,
  children,
}: {
  card: Card;
  experiment?: string;
  /** Shown before the card id (e.g. rank). */
  before?: ReactNode;
  /** Shown at the right of the header (e.g. score). */
  after?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-neutral-200 p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {before}
        <Link href={`/card/${card.card_id}`} className="font-mono font-bold text-blue-900 underline-offset-2 hover:underline">
          {card.card_id}
        </Link>
        {experiment && <span className="text-sm text-neutral-700">{experiment}</span>}
        <span className="rounded bg-neutral-200 px-2 py-0.5 text-xs">{HAZARD_LABELS[card.hazard]}</span>
        <span className="rounded bg-neutral-200 px-2 py-0.5 text-xs">{CONTROL_LABELS[card.control_category]}</span>
        {after && <span className="ml-auto text-sm">{after}</span>}
      </div>
      <div className="mt-2 flex items-start gap-2">
        <LayerBadge kind="nasa" />
        <p className="text-neutral-900">{card.finding}</p>
      </div>
      {children}
    </div>
  );
}
