import { balance, type EngineCalibrationPoint } from "../config/balance.ts";

export interface EngineParams {
  /** Maia-3 selfElo / oppoElo input. */
  selfElo: number;
  temperature: number;
}

/**
 * The "strength path" through the calibration grid, weakest first: the
 * lowest selfElo at temperatures above 1, then the T=1 curve, then the
 * highest selfElo at temperatures below 1. Along it, more rating always
 * means stronger parameters.
 */
export function strengthPath(grid: readonly EngineCalibrationPoint[]): EngineCalibrationPoint[] {
  const elos = grid.map((p) => p.selfElo);
  const minElo = Math.min(...elos);
  const maxElo = Math.max(...elos);
  const path = grid.filter(
    (p) =>
      p.temperature === 1 ||
      (p.selfElo === minElo && p.temperature > 1) ||
      (p.selfElo === maxElo && p.temperature < 1),
  );
  return path.sort((a, b) => a.rating - b.rating);
}

/**
 * Convert a game rating (calibrated real-strength scale) into the Maia-3
 * parameters that play at that strength, by piecewise-linear interpolation
 * along the strength path of `balance.engineCalibration`. Ratings outside
 * it are clamped to its ends.
 */
export function engineParamsForRating(
  rating: number,
  grid: readonly EngineCalibrationPoint[] = balance.engineCalibration,
): EngineParams {
  const table = strengthPath(grid);
  const first = table[0]!;
  const last = table[table.length - 1]!;
  if (rating <= first.rating) return { selfElo: first.selfElo, temperature: first.temperature };
  if (rating >= last.rating) return { selfElo: last.selfElo, temperature: last.temperature };
  for (let i = 1; i < table.length; i++) {
    const hi = table[i]!;
    if (rating <= hi.rating) {
      const lo = table[i - 1]!;
      const f = (rating - lo.rating) / (hi.rating - lo.rating);
      return {
        selfElo: Math.round(lo.selfElo + f * (hi.selfElo - lo.selfElo)),
        temperature:
          Math.round((lo.temperature + f * (hi.temperature - lo.temperature)) * 1000) / 1000,
      };
    }
  }
  return { selfElo: last.selfElo, temperature: last.temperature };
}
