import { balance } from "./config/balance.ts";

export interface EffectiveRatingInput {
  rating: number;
  /** 0–100 */
  fatigue: number;
  /** Post-MVP (GDD §4.2). */
  specialtyBonus?: number;
  /** Post-MVP (GDD §4.2), already converted to rating points. */
  moraleAdjustment?: number;
}

export function clampRating(r: number): number {
  return Math.min(balance.ratingMax, Math.max(balance.ratingMin, r));
}

/** Penalty grows linearly with fatigue up to `fatigueMaxPenalty`. */
export function fatiguePenalty(fatigue: number): number {
  const f = Math.min(balance.fatigueMax, Math.max(0, fatigue));
  return (f / balance.fatigueMax) * balance.fatigueMaxPenalty;
}

/**
 * Effective rating per move (GDD §4.2):
 * rating + specialty bonus + morale − fatigue penalty, clamped to [600, 2600].
 */
export function effectiveRating(p: EffectiveRatingInput): number {
  return clampRating(
    p.rating + (p.specialtyBonus ?? 0) + (p.moraleAdjustment ?? 0) - fatiguePenalty(p.fatigue),
  );
}

/** Expected score of A vs B under the Elo model. */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}
