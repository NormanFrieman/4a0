/**
 * Derived card and team numbers (GDD §4.1, §6.1, §7.2). Used by the data
 * pipeline (`tools/data/`) and by the app for display.
 */
import { balance } from "../config/balance.ts";

/** GDD §6.1: strength = R + k·(P − R); unrated players use P, capped. */
export function cardStrength(fideRating: number | null, performance: number): number {
  if (fideRating === null) return Math.min(performance, balance.strength.unratedCap);
  const k = balance.strength.performanceWeight;
  return Math.round(fideRating + k * (performance - fideRating));
}

/** GDD §4.1: roll weight from the team's final rank in its edition. */
export function rollWeight(finalRank: number): number {
  return finalRank <= balance.draft.rollTopRank ? balance.draft.rollWeightTop10 : 1;
}

/** Mean strength of a team (GDD §5.2: round 1 pairing, tiebreak). */
export function avgStrength(strengths: readonly number[]): number {
  return Math.round(strengths.reduce((a, b) => a + b, 0) / strengths.length);
}

export type Trait = "solid" | "balanced" | "combative";

/** GDD §7.2: decisiveness → trait shown on the card. */
export function traitOf(decisiveness: number): Trait {
  if (decisiveness < balance.style.traitSolidBelow) return "solid";
  if (decisiveness >= balance.style.traitCombativeFrom) return "combative";
  return "balanced";
}
