// Trust badges (G5): what was checked on each verified card, and by whom. Text labels,
// never colour alone. Second checks come from data/review/*_decisions.json and count only
// if they were made on this exact version of the card (same fingerprint).
import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import { DATA_DIR } from "./cards";
import { cardFingerprint, type Decision } from "./review";
import type { Card } from "./types";

export interface TrustBadge {
  label: string;
  ok: boolean;
}

const SOURCE_TYPE: Record<string, string> = { full_paper: "Full paper", slides: "Slides", summary: "Summary" };

export function trustBadges(card: Card, decision: Decision | undefined): TrustBadge[] {
  const quoteOk = card.auto_check?.quote_found === true;
  const sc = decision?.second_check;
  const secondOk =
    !!sc && sc.result === "pass" && sc.by !== decision?.reviewed_by && decision?.fingerprint === cardFingerprint(card as unknown as Record<string, unknown>);
  const badges: TrustBadge[] = [
    { label: quoteOk ? "Quote auto-verified on the page" : "Quote not auto-verified", ok: quoteOk },
    { label: card.reviewed_by ? `Reviewed by ${card.reviewed_by}` : "Reviewer not recorded", ok: !!card.reviewed_by },
    { label: secondOk ? `Second-checked by ${sc!.by}` : "Not second-checked", ok: secondOk },
    { label: `Source: ${SOURCE_TYPE[card.source_type] ?? card.source_type}`, ok: card.source_type === "full_paper" },
  ];
  if (card.expert_checked) badges.push({ label: "Expert-checked", ok: true });
  return badges;
}

/** All review decisions keyed by card_id (empty when there are none, e.g. sample data). */
export function loadAllDecisions(dataDir: string = DATA_DIR): Record<string, Decision> {
  const dir = path.join(dataDir, "review");
  if (!fs.existsSync(dir)) return {};
  const out: Record<string, Decision> = {};
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith("_decisions.json")).sort()) {
    try {
      Object.assign(out, JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
    } catch {
      console.warn(`[trust] ${f} is not valid JSON`);
    }
  }
  return out;
}

export const getDecisions = cache(() => loadAllDecisions());
