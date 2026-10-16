import Link from "next/link";
import { getCardData } from "@/lib/cards";

export default function Home() {
  const { cards, sources, isSample } = getCardData();
  const experiments = new Set(cards.map((c) => sources.find((s) => s.source_id === c.source_id)?.experiment).filter(Boolean));
  return (
    <div className="max-w-3xl py-6">
      <h1 className="text-3xl font-bold">Flame in Freefall</h1>
      <p className="mt-3 text-lg text-neutral-700">
        Evidence cards from NASA fire-in-space experiments (SAFFIRE, FLEX, BASS-II), each checked against its source page,
        ranked for crew safety.
      </p>
      <p className="mt-3 text-neutral-700">
        {cards.length} verified {isSample ? "sample " : ""}cards from {experiments.size} experiments.
      </p>
      <Link
        href="/explore"
        className="mt-6 inline-block rounded bg-neutral-900 px-5 py-2.5 font-semibold text-white hover:bg-neutral-700"
      >
        Explore the evidence →
      </Link>
    </div>
  );
}
