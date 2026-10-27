import type { Card } from "./types";

// The ONE strict prompt. The Ask route and the G1 eval script both go through
// buildPrompt(), so the text is identical. Do not edit without re-running G1.
export const STRICT_PROMPT = `Answer using ONLY the evidence cards below.
- Cite card IDs like [SAF-001] after each claim.
- Separate: What NASA found / Our safety reading / Summary.
- If the cards don't answer the question, say "Not in our evidence." Do not guess.
- Never present our reading as NASA guidance.
Cards: {cards}
Question: {question}`;

/** One card as plain text for the prompt. Our reading is explicitly labelled. */
export function formatCard(card: Card): string {
  const lines = [
    `[${card.card_id}]`,
    `NASA found: ${card.finding}`,
    `Quote (page ${card.page}): "${card.evidence_quote}"`,
  ];
  if (card.material_or_fuel) lines.push(`Material: ${card.material_or_fuel}`);
  if (card.conditions) lines.push(`Conditions: ${card.conditions}`);
  for (const v of card.values ?? []) lines.push(`Value: ${v.quantity} = ${v.value} ${v.unit}`.trimEnd());
  if (card.earth_comparison) lines.push(`Earth comparison: ${card.earth_comparison}`);
  lines.push(`Hazard: ${card.hazard}; control category: ${card.control_category}`);
  if (card.open_question) lines.push(`Open question stated in the paper: ${card.open_question}`);
  if (card.team_interpretation) lines.push(`Our safety reading (team, not NASA): ${card.team_interpretation.text}`);
  return lines.join("\n");
}

export function buildPrompt(cards: readonly Card[], question: string): string {
  const cardText = cards.length ? "\n" + cards.map(formatCard).join("\n\n") + "\n" : "(none)";
  // Function replacers so "$" in card text is never treated as a replacement pattern.
  return STRICT_PROMPT.replace("{cards}", () => cardText).replace("{question}", () => question.trim());
}
