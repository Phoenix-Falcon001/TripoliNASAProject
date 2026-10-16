import type { Metadata } from "next";
import ExploreList, { type ExploreItem } from "@/components/ExploreList";
import { experimentOf, getCardData } from "@/lib/cards";
import { DEFAULT_WEIGHTS, rankCards } from "@/lib/rank";

export const metadata: Metadata = { title: "Explore · Flame in Freefall" };

export default function ExplorePage() {
  const data = getCardData();
  const items: ExploreItem[] = rankCards(data.cards, DEFAULT_WEIGHTS).map((r) => ({
    card: r.card,
    score: r.score,
    rank: r.rank,
    experiment: experimentOf(data, r.card),
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold">Explore the evidence</h1>
      <p className="mt-1 max-w-3xl text-neutral-700">
        {data.cards.length} verified cards, ranked by our default priorities: crew safety {DEFAULT_WEIGHTS.crew}%,
        strength of evidence {DEFAULT_WEIGHTS.evid}%, Moon/Mars relevance {DEFAULT_WEIGHTS.mm}%. The scores are our team&apos;s
        reading, not NASA&apos;s.
      </p>
      <ExploreList items={items} />
    </div>
  );
}
