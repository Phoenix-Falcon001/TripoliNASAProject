import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReviewActions from "@/components/ReviewActions";
import { cardNumbers, highlight } from "@/lib/highlight";
import {
  listCheckedSources,
  loadPageTexts,
  loadReviewItems,
  reviewEnabled,
  type DraftCard,
  type ReviewItem,
} from "@/lib/review";

export const metadata: Metadata = { title: "Review drafts · Flame in Freefall" };
export const dynamic = "force-dynamic";

const STATUS_LABEL = { verified: "✓ approved", flagged: "⚑ flagged", rejected: "✗ rejected" } as const;

function itemState(i: ReviewItem): string {
  if (i.stale) return "↻ changed — review again";
  if (i.decision) return STATUS_LABEL[i.decision.status];
  return (i.card.auto_check?.reasons?.length ?? 0) > 0 ? "• auto-check flags" : "• to review";
}

function str(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  return typeof v === "string" ? v : JSON.stringify(v);
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 border-b border-neutral-100 py-1.5 text-sm">
      <dt className="font-semibold text-neutral-700">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function CardFields({ card }: { card: DraftCard }) {
  const values = Array.isArray(card.values) ? (card.values as { quantity: string; value: string; unit: string }[]) : [];
  const scores = (card.scores ?? {}) as Record<string, number>;
  const reasons = (card.score_reasons ?? {}) as Record<string, string>;
  const ti = card.team_interpretation as { text?: string; suggested_by?: string } | null | undefined;
  const related = Array.isArray(card.related_cards) ? (card.related_cards as { card_id: string; relation: string }[]) : [];
  return (
    <dl>
      <Row label="Evidence quote">
        <q className="italic">{str(card.evidence_quote)}</q>
      </Row>
      <Row label="Finding">{str(card.finding)}</Row>
      <Row label="Source · page">
        {str(card.source_id)} · PDF page {str(card.page)} · {str(card.source_type)}
      </Row>
      <Row label="Material / fuel">{str(card.material_or_fuel)}</Row>
      <Row label="Conditions">{str(card.conditions)}</Row>
      <Row label="Values">
        {values.length === 0
          ? "—"
          : values.map((v, i) => (
              <div key={i}>
                {v.quantity}: <span className="font-mono">{v.value}</span> {v.unit}
              </div>
            ))}
      </Row>
      <Row label="Earth comparison">{str(card.earth_comparison)}</Row>
      <Row label="Hazard · control">
        {str(card.hazard)} · {str(card.control_category)}
      </Row>
      <Row label="Open question">{str(card.open_question)}</Row>
      <Row label="Team reading">{ti ? `${ti.text} (suggested by ${ti.suggested_by})` : "—"}</Row>
      <Row label="Scores">
        {(["crew_safety", "evidence", "moon_mars"] as const).map((k) => (
          <div key={k}>
            {k}: <strong>{str(scores[k])}</strong> — {str(reasons[k])}
          </div>
        ))}
      </Row>
      <Row label="Related">{related.length ? related.map((r) => `${r.relation} ${r.card_id}`).join(", ") : "—"}</Row>
    </dl>
  );
}

export default async function ReviewPage({ searchParams }: PageProps<"/review">) {
  if (!reviewEnabled()) notFound();
  const sp = await searchParams;
  const sources = listCheckedSources();
  const source = typeof sp.source === "string" && sources.includes(sp.source) ? sp.source : sources[0];

  if (!source) {
    return (
      <div className="max-w-3xl space-y-3">
        <h1 className="text-2xl font-bold">Review drafts</h1>
        <p>No checked drafts found. Run the pipeline first:</p>
        <pre className="rounded bg-neutral-100 p-3 text-sm">
          {`python pipeline/extract_text.py papers/S01.pdf S01
python pipeline/validate_cards.py data/drafts/S01_drafts.json`}
        </pre>
        <p className="text-sm text-neutral-600">
          This creates <code>data/drafts/S01_checked.json</code>, which appears here.
        </p>
      </div>
    );
  }

  const items = loadReviewItems(source);
  const pages = loadPageTexts(source);
  const selectedIdx = Math.max(
    0,
    items.findIndex((i) => i.card.card_id === sp.card),
  );
  const item = items[selectedIdx];
  const done = items.filter((i) => i.decision && !i.stale).length;
  const approved = items.filter((i) => i.decision?.status === "verified" && !i.stale).length;
  const href = (i: ReviewItem) => `/review?source=${source}&card=${i.card.card_id}`;
  const nextOpen = items.slice(selectedIdx + 1).concat(items.slice(0, selectedIdx)).find((i) => !i.decision || i.stale);

  const pageText = item ? pages[String(item.card.page)] : undefined;
  const hl =
    item && pageText
      ? highlight(
          pageText,
          String(item.card.evidence_quote ?? ""),
          cardNumbers([
            item.card.finding as string,
            item.card.conditions as string,
            item.card.earth_comparison as string,
            item.card.evidence_quote as string,
            ...((item.card.values as { value: string }[] | undefined) ?? []).map((v) => v.value),
          ]),
        )
      : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-bold">Review drafts</h1>
        <span className="rounded bg-amber-200 px-2 py-0.5 text-xs font-bold uppercase">Dev only · drafts are not verified</span>
        <nav aria-label="Sources" className="flex gap-1 text-sm">
          {sources.map((s) => (
            <Link
              key={s}
              href={`/review?source=${s}`}
              aria-current={s === source ? "page" : undefined}
              className={`rounded px-2 py-1 ${s === source ? "bg-neutral-900 text-white" : "border border-neutral-300"}`}
            >
              {s}
            </Link>
          ))}
        </nav>
        <span className="text-sm text-neutral-600">
          {done}/{items.length} reviewed · {approved} approved
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[14rem_1fr]">
        <ol className="space-y-1 text-sm">
          {items.map((i, idx) => (
            <li key={`${i.card.card_id}-${idx}`}>
              <Link
                href={href(i)}
                aria-current={idx === selectedIdx ? "true" : undefined}
                className={`block rounded px-2 py-1 ${idx === selectedIdx ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"}`}
              >
                <span className="font-mono font-semibold">{i.card.card_id ?? `#${idx + 1}`}</span>
                <span className="block text-xs opacity-80">{itemState(i)}</span>
              </Link>
            </li>
          ))}
        </ol>

        {item && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="font-mono text-xl font-bold">{item.card.card_id}</h2>
              <span className="text-sm">{itemState(item)}</span>
              {item.decision && (
                <span className="text-xs text-neutral-500">
                  by {item.decision.reviewed_by}, {item.decision.decided_at.slice(0, 16).replace("T", " ")}
                </span>
              )}
            </div>

            <ReviewActions
              source={source}
              cardId={String(item.card.card_id)}
              fingerprint={item.fingerprint}
              current={item.stale ? null : (item.decision?.status ?? null)}
              nextHref={nextOpen ? href(nextOpen) : null}
            />

            {(item.card.auto_check?.reasons?.length ?? 0) > 0 ? (
              <div className="rounded-md border border-amber-400 bg-amber-50 p-3 text-sm">
                <p className="font-semibold">⚑ Auto-check found problems — check these against the PDF:</p>
                <ul className="mt-1 list-disc pl-5">
                  {item.card.auto_check!.reasons!.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-neutral-700">✓ Auto-check passed (quote found on the page, all numbers on the page).</p>
            )}

            <div className="grid gap-4 xl:grid-cols-2">
              <section aria-labelledby="card-h" className="rounded-md border border-neutral-200 p-3">
                <h3 id="card-h" className="mb-2 font-semibold">
                  Draft card
                </h3>
                <CardFields card={item.card} />
              </section>
              <section aria-labelledby="page-h" className="rounded-md border border-neutral-200 p-3">
                <h3 id="page-h" className="mb-1 font-semibold">
                  PDF page {str(item.card.page)} — extracted text
                </h3>
                <p className="mb-2 text-xs text-neutral-600">
                  <mark className="bg-yellow-200 px-1">quote</mark> ·{" "}
                  <mark className="bg-sky-200 px-1 font-semibold">number from the card</mark>
                  {hl && !hl.quoteFound && " · exact quote not found here — compare by eye with the PDF"}
                </p>
                {hl ? (
                  <p className="max-h-[32rem] overflow-y-auto text-sm leading-relaxed">
                    {hl.segments.map((s, i) =>
                      s.kind === "quote" ? (
                        <mark key={i} className="bg-yellow-200">
                          {s.text}
                        </mark>
                      ) : s.kind === "number" ? (
                        <mark key={i} className="bg-sky-200 font-semibold">
                          {s.text}
                        </mark>
                      ) : (
                        <span key={i}>{s.text}</span>
                      ),
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-neutral-600">
                    No extracted text for this page. Run <code>python pipeline/extract_text.py papers/{source}.pdf {source}</code>,
                    or open the PDF.
                  </p>
                )}
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
