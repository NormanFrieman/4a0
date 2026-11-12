import { balance, type EngineCalibrationPoint } from "./config/balance.ts";

export interface EngineParams {
  /** Maia-3 selfElo / oppoElo input. */
  selfElo: number;
  temperature: number;
}

/**
 * Convert a game rating (calibrated real-strength scale) into the Maia-3
 * parameters that play at that strength, by piecewise-linear interpolation
 * over `balance.engineCalibration`. Ratings outside the table are clamped
 * to its ends.
 */
export function engineParamsForRating(
  rating: number,
  table: readonly EngineCalibrationPoint[] = balance.engineCalibration,
): EngineParams {
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
        temperature: Math.round((lo.temperature + f * (hi.temperature - lo.temperature)) * 1000) / 1000,
      };
    }
  }
  return { selfElo: last.selfElo, temperature: last.temperature };
}
