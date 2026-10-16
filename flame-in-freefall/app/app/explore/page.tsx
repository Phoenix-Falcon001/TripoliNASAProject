import type { Metadata } from "next";
import ExploreList, { type ExploreItem } from "@/components/ExploreList";
import { experimentOf, getCardData, getStability } from "@/lib/cards";

export const metadata: Metadata = { title: "Explore · Flame in Freefall" };

export default function ExplorePage() {
  const data = getCardData();
  const stab = getStability();
  const items: ExploreItem[] = data.cards.map((card) => ({
    card,
    experiment: experimentOf(data, card),
    stability: stab.get(card.card_id),
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold">Explore the evidence</h1>
      <p className="mt-1 max-w-3xl text-neutral-700">
        {data.cards.length} verified cards. Move the sliders to rank them by what matters most to you. The scores and weights
        are our team&apos;s reading, not NASA&apos;s.
      </p>
      <ExploreList items={items} />
    </div>
  );
}
