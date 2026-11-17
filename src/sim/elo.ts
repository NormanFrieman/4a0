import { dp } from "./dp.ts";

/** Expected score of A vs B under the Elo model (GDD §6.3). */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

/**
 * Approximate performance: mean rating of the opponents + dp(score
 * fraction). null without games or without any rated opponent.
 */
export function approxPerformance(
  opponentRatings: readonly number[],
  points: number,
  games: number,
): number | null {
  if (games <= 0 || opponentRatings.length === 0) return null;
  const mean = opponentRatings.reduce((a, b) => a + b, 0) / opponentRatings.length;
  return Math.round(mean + dp(points / games));
}
