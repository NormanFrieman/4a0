import { balance } from "../config/balance.ts";

export interface ThinkTimeInput {
  /** Plies already played before this move. */
  ply: number;
  /** Probability of the most likely move in the raw policy (0–1). */
  topMoveProb: number;
  remainingMs: number;
  rng: () => number;
}

/**
 * Simulated human think time (GDD §6.4): quick in the opening, slower when
 * the policy is scattered, never more than a fraction of the remaining clock.
 */
export function thinkTimeMs(input: ThinkTimeInput, cfg = balance.thinkTime): number {
  const uncertainty = 1 - Math.min(1, Math.max(0, input.topMoveProb));
  const base =
    input.ply < cfg.openingPlies
      ? cfg.openingSeconds
      : cfg.baseSeconds + cfg.uncertaintyExtraSeconds * uncertainty;
  const jitter = 1 + (input.rng() * 2 - 1) * cfg.jitter;
  const seconds = Math.max(cfg.minSeconds, base * jitter);
  const cap = Math.max(0, input.remainingMs * cfg.maxClockFraction);
  return Math.round(Math.min(seconds * 1000, cap));
}
