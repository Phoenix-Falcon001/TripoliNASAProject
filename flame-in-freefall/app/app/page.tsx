import Link from "next/link";
import CardSummary from "@/components/CardSummary";
import { LayerBadge } from "@/components/Layers";
import StabilityBadge from "@/components/StabilityBadge";
import { experimentOf, getCardData, getStability } from "@/lib/cards";
import { formatScore, rankCards } from "@/lib/rank";

export default function Home() {
  const data = getCardData();
  const { cards, isSample } = data;
  const stab = getStability();
  const experiments = new Set(cards.map((c) => experimentOf(data, c)));
  const top = rankCards(cards).slice(0, 5);

  return (
    <div className="space-y-8">
      <section className="max-w-3xl pt-2">
        <h1 className="text-3xl font-bold">Flame in Freefall</h1>
        <p className="mt-3 text-lg text-neutral-700">
          What NASA&apos;s fire-in-space experiments (SAFFIRE, FLEX, BASS-II) tell us about crew safety — each finding checked
          against its source page, ranked, and clearly separated from our own reading and from AI text.
        </p>
        <p className="mt-3 text-neutral-700">
          {cards.length} verified {isSample ? "sample " : ""}cards from {experiments.size} experiments.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/explore" className="rounded bg-neutral-900 px-5 py-2.5 font-semibold text-white hover:bg-neutral-700">
            Explore the evidence →
          </Link>
          <Link href="/ask" className="rounded border border-neutral-900 px-5 py-2.5 font-semibold hover:bg-neutral-100">
            Ask a question
          </Link>
          <Link href="/gaps" className="rounded border border-neutral-900 px-5 py-2.5 font-semibold hover:bg-neutral-100">
            What NASA doesn&apos;t know
          </Link>
        </div>
      </section>

      <section aria-labelledby="legend-h" className="rounded-md border border-neutral-200 p-4">
        <h2 id="legend-h" className="font-semibold">How to read this app</h2>
        <ul className="mt-2 grid gap-2 text-sm md:grid-cols-3">
          <li className="flex items-start gap-2">
            <LayerBadge kind="nasa" /> <span>What the NASA paper says, with page.</span>
          </li>
          <li className="flex items-start gap-2">
            <LayerBadge kind="ours" /> <span>Our team&apos;s interpretation and scores. Not NASA guidance.</span>
          </li>
          <li className="flex items-start gap-2">
            <LayerBadge kind="ai" /> <span>Text from a local AI. Must cite cards; may be wrong.</span>
          </li>
        </ul>
      </section>

      <section aria-labelledby="top-h">
        <h2 id="top-h" className="text-xl font-semibold">Top 5 by our default ranking (crew safety 40% · evidence 35% · Moon/Mars 25%)</h2>
        {top.length === 0 ? (
          <p className="mt-2">No verified cards yet.</p>
        ) : (
          <ol className="mt-3 space-y-3">
            {top.map((r) => (
              <li key={r.card.card_id}>
                <CardSummary
                  card={r.card}
                  experiment={experimentOf(data, r.card)}
                  before={<span className="text-sm font-semibold text-neutral-500">#{r.rank}</span>}
                  after={
                    <>
                      Score <strong>{formatScore(r.score)}</strong>
                    </>
                  }
                >
                  <div className="mt-2">
                    <StabilityBadge s={stab.get(r.card.card_id)} />
                  </div>
                </CardSummary>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
