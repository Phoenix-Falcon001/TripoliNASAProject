import type { Metadata } from "next";
import AskClient from "@/components/AskClient";
import { experimentOf, getCardData, getDemoAnswers } from "@/lib/cards";

export const metadata: Metadata = { title: "Ask · Flame in Freefall" };

export default function AskPage() {
  const data = getCardData();
  const experiments = Object.fromEntries(data.cards.map((c) => [c.card_id, experimentOf(data, c)]));
  const suggestions = getDemoAnswers().map((d) => d.question);
  return (
    <div>
      <h1 className="text-2xl font-bold">Ask the evidence</h1>
      <p className="mt-1 max-w-3xl text-neutral-700">
        Your question is matched to our verified cards by keywords. Only those cards are given to a local AI running on this
        laptop, which must cite them. The answer is an <strong>AI explanation</strong> — check it against the cards on the
        right. It is not NASA guidance.
      </p>
      <div className="mt-4">
        <AskClient experiments={experiments} suggestions={suggestions} />
      </div>
    </div>
  );
}
