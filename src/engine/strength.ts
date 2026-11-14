/**
 * Card strength and style → Maia-3 parameters (GDD §6.2, §7.2).
 *
 *   strength (FIDE-like) ──strengthScale──▶ game rating (calibrated scale)
 *   game rating + style temperature ──engineCalibration grid──▶ selfElo
 *
 * The calibration grid is a set of measured nodes (selfElo, temperature) →
 * real strength. For each temperature with at least two nodes we get a
 * monotonic curve selfElo → rating; the selfElo for a (rating, T) pair is
 * found by inverting the curves that bracket T and interpolating between them.
 * That way the style temperature never changes a card's strength.
 */
import {
  balance,
  type EngineCalibrationPoint,
  type StrengthScalePoint,
} from "../config/balance.ts";
import { engineParamsForRating, type EngineParams } from "./engineParams.ts";

/** Piecewise-linear interpolation over sorted (x, y) points, clamped at the ends. */
export function interpolate(points: ReadonlyArray<readonly [number, number]>, x: number): number {
  const first = points[0]!;
  const last = points[points.length - 1]!;
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < points.length; i++) {
    const hi = points[i]!;
    if (x <= hi[0]) {
      const lo = points[i - 1]!;
      return lo[1] + ((x - lo[0]) / (hi[0] - lo[0])) * (hi[1] - lo[1]);
    }
  }
  return last[1];
}

/** GDD §6.2 step 1: card strength → game rating. */
export function toGameRating(
  strength: number,
  scale: readonly StrengthScalePoint[] = balance.strengthScale,
): number {
  return interpolate(
    scale.map((p) => [p.strength, p.rating] as const),
    strength,
  );
}

/** GDD §7.2: decisiveness (0 = always draws, 1 = never draws) → sampling temperature. */
export function styleTemperature(decisiveness: number, style = balance.style): number {
  const d = Math.min(1, Math.max(0, decisiveness));
  return style.temperatureMin + d * (style.temperatureMax - style.temperatureMin);
}

interface Curve {
  temperature: number;
  /** [selfElo, rating], sorted by selfElo. */
  points: Array<readonly [number, number]>;
}

function curvesByTemperature(grid: readonly EngineCalibrationPoint[]): Curve[] {
  const byT = new Map<number, Array<readonly [number, number]>>();
  for (const p of grid) {
    const list = byT.get(p.temperature) ?? [];
    list.push([p.selfElo, p.rating]);
    byT.set(p.temperature, list);
  }
  return [...byT.entries()]
    .filter(([, pts]) => pts.length >= 2)
    .map(([temperature, pts]) => ({ temperature, points: pts.sort((a, b) => a[0] - b[0]) }))
    .sort((a, b) => a.temperature - b.temperature);
}

/** selfElo that reaches `rating` on this curve, or null when out of its range. */
function invert(curve: Curve, rating: number): number | null {
  const pts = curve.points;
  const lo = pts[0]![1];
  const hi = pts[pts.length - 1]![1];
  if (rating < lo || rating > hi) return null;
  return interpolate(
    pts.map(([elo, r]) => [r, elo] as const),
    rating,
  );
}

/**
 * Maia parameters for a game rating played with the given style temperature,
 * keeping the real strength (GDD §7.2). When the style temperature cannot
 * reach the rating (beyond selfElo 600–2600 at that temperature), falls back
 * to `engineParamsForRating`, which adjusts temperature as needed: at the
 * extremes, strength wins over style. Temperatures outside the measured
 * curves are clamped to the nearest measured one.
 */
export function engineParamsForStyle(
  rating: number,
  temperature: number,
  grid: readonly EngineCalibrationPoint[] = balance.engineCalibration,
): EngineParams {
  const curves = curvesByTemperature(grid);
  if (curves.length === 0) return engineParamsForRating(rating, grid);

  const t = Math.min(
    curves[curves.length - 1]!.temperature,
    Math.max(curves[0]!.temperature, temperature),
  );
  let hiIdx = curves.findIndex((c) => c.temperature >= t);
  if (hiIdx < 0) hiIdx = curves.length - 1;
  const hi = curves[hiIdx]!;
  const lo = hi.temperature === t ? hi : curves[hiIdx - 1]!;

  const eloLo = invert(lo, rating);
  const eloHi = invert(hi, rating);
  if (eloLo === null || eloHi === null) return engineParamsForRating(rating, grid);

  const f = hi === lo ? 0 : (t - lo.temperature) / (hi.temperature - lo.temperature);
  return {
    selfElo: Math.round(eloLo + f * (eloHi - eloLo)),
    temperature: Math.round(t * 1000) / 1000,
  };
}

/** GDD §6.2 + §7.2: card strength and decisiveness → Maia-3 parameters. */
export function toEngineParams(strength: number, decisiveness: number): EngineParams {
  return engineParamsForStyle(toGameRating(strength), styleTemperature(decisiveness));
}
