import { describe, expect, it } from "vitest";
import { balance, type EngineCalibrationPoint } from "../config/balance.ts";
import { engineParamsForRating } from "./engineParams.ts";
import {
  engineParamsForStyle,
  interpolate,
  styleTemperature,
  toEngineParams,
  toGameRating,
} from "./strength.ts";

describe("interpolate", () => {
  it("is linear between points and clamped outside", () => {
    const pts = [
      [0, 0],
      [10, 100],
    ] as const;
    expect(interpolate(pts, 5)).toBe(50);
    expect(interpolate(pts, -5)).toBe(0);
    expect(interpolate(pts, 50)).toBe(100);
  });
});

describe("toGameRating", () => {
  it("maps the strength scale ends and is monotonic", () => {
    const a = balance.strengthScale[0]!;
    const b = balance.strengthScale[balance.strengthScale.length - 1]!;
    expect(toGameRating(a.strength)).toBe(a.rating);
    expect(toGameRating(b.strength)).toBe(b.rating);
    expect(toGameRating(2700)).toBeGreaterThan(toGameRating(2600));
  });
});

describe("styleTemperature", () => {
  it("spans temperatureMin..temperatureMax", () => {
    expect(styleTemperature(0)).toBe(balance.style.temperatureMin);
    expect(styleTemperature(1)).toBe(balance.style.temperatureMax);
    expect(styleTemperature(2)).toBe(balance.style.temperatureMax);
  });
});

describe("engineParamsForStyle", () => {
  // Synthetic grid: higher temperature is weaker, so the same rating needs a higher selfElo.
  const grid: EngineCalibrationPoint[] = [
    { rating: 1000, selfElo: 1000, temperature: 0.8 },
    { rating: 1600, selfElo: 2000, temperature: 0.8 },
    { rating: 900, selfElo: 1000, temperature: 1.2 },
    { rating: 1500, selfElo: 2000, temperature: 1.2 },
  ];

  it("compensates selfElo so higher temperature keeps the same strength", () => {
    const solid = engineParamsForStyle(1300, 0.8, grid);
    const combative = engineParamsForStyle(1300, 1.2, grid);
    expect(solid).toEqual({ selfElo: 1500, temperature: 0.8 });
    expect(combative.temperature).toBe(1.2);
    expect(combative.selfElo).toBeGreaterThan(solid.selfElo);
  });

  it("interpolates between temperature curves", () => {
    const mid = engineParamsForStyle(1300, 1.0, grid);
    const lo = engineParamsForStyle(1300, 0.8, grid).selfElo;
    const hi = engineParamsForStyle(1300, 1.2, grid).selfElo;
    expect(mid.temperature).toBe(1);
    expect(Math.abs(mid.selfElo - (lo + hi) / 2)).toBeLessThanOrEqual(1);
  });

  it("falls back to strength-first parameters when the style cannot reach the rating", () => {
    expect(engineParamsForStyle(1580, 1.2, grid)).toEqual(engineParamsForRating(1580, grid));
  });

  it("with the measured grid, solid players get a lower selfElo for the same rating", () => {
    for (const r of [1300, 1500, 1700]) {
      const solid = engineParamsForStyle(r, 0.7);
      const combative = engineParamsForStyle(r, 1.1);
      expect(solid.temperature).toBe(0.7);
      expect(combative.temperature).toBe(1.1);
      expect(combative.selfElo - solid.selfElo).toBeGreaterThan(200);
    }
  });

  it("T=1 matches the strength path inside the T=1 range", () => {
    for (const r of [1000, 1300, 1600, 1850]) {
      expect(engineParamsForStyle(r, 1)).toEqual(engineParamsForRating(r));
    }
  });

  it("strength wins at the top: legends keep their strength", () => {
    expect(engineParamsForStyle(balance.ratingMax, 1.1)).toEqual(
      engineParamsForRating(balance.ratingMax),
    );
  });
});

describe("toEngineParams", () => {
  it("is monotonic in strength", () => {
    let prev = toEngineParams(1400, 0.5);
    for (let s = 1450; s <= 2850; s += 50) {
      const cur = toEngineParams(s, 0.5);
      const stronger =
        cur.selfElo > prev.selfElo ||
        (cur.selfElo === prev.selfElo && cur.temperature <= prev.temperature);
      expect(stronger).toBe(true);
      prev = cur;
    }
  });
});
