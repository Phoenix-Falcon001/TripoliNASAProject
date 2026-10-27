import { getCardData } from "@/lib/cards";

/** The cards the app is showing (verified only, or the DEMO- sample set). */
export function GET() {
  const { cards, isSample } = getCardData();
  return new Response(JSON.stringify(cards, null, 2) + "\n", {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${isSample ? "SAMPLE_cards.json" : "verified_cards.json"}"`,
    },
  });
}
