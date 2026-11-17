/**
 * Quick simulation of games between field teams (GDD §6.3): each game is
 * drawn from Elo probabilities instead of being played move by move.
 */
import { balance } from "../config/balance.ts";
import type { Rng } from "../rng/rng.ts";
import { expectedScore } from "./elo.ts";

export type GameScore = 1 | 0.5 | 0;

/** Anything with a card strength (GDD §6.1). */
export interface HasStrength {
  strength: number;
}

export interface Outcome {
  whiteWin: number;
  draw: number;
  blackWin: number;
}

/** Win/draw/loss probabilities for white, from card strengths (GDD §6.3). */
export function outcomeProbabilities(
  white: number,
  black: number,
  cfg: typeof balance.quickSim = balance.quickSim,
): Outcome {
  const e = expectedScore(white + cfg.whiteAdvantage, black);
  const avg = (white + black) / 2;
  const base = cfg.drawBase + (cfg.drawSlope * (avg - cfg.drawPivot)) / 100;
  const draw = Math.min(Math.max(base, cfg.drawMin), cfg.drawMax, 2 * Math.min(e, 1 - e));
  const whiteWin = e - draw / 2;
  return { whiteWin, draw, blackWin: 1 - whiteWin - draw };
}

/** `QuickSimulator` (GDD §12.3). */
export interface QuickSimulator {
  sampleResult(white: HasStrength, black: HasStrength, rng: Rng): GameScore;
}

export const eloQuickSimulator: QuickSimulator = {
  sampleResult(white, black, rng) {
    const p = outcomeProbabilities(white.strength, black.strength);
    const r = rng();
    if (r < p.whiteWin) return 1;
    if (r < p.whiteWin + p.draw) return 0.5;
    return 0;
  },
};
