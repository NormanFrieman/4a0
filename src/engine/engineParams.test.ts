import { describe, expect, it } from "vitest";
import { balance } from "../config/balance.ts";
import { engineParamsForRating } from "./engineParams.ts";

describe("engineParamsForRating", () => {
  it("hits calibration points exactly", () => {
    for (const p of balance.engineCalibration) {
      expect(engineParamsForRating(p.rating)).toEqual({
        selfElo: p.selfElo,
        temperature: p.temperature,
      });
    }
  });

  it("maps the anchor: game 1500 ≈ Maia 1500 at T=1", () => {
    const p = engineParamsForRating(1500);
    expect(Math.abs(p.selfElo - 1500)).toBeLessThanOrEqual(10);
    expect(p.temperature).toBe(1);
  });

  it("uses temperature below selfElo 600 and above 2600", () => {
    const low = engineParamsForRating(balance.ratingMin);
    expect(low.selfElo).toBe(600);
    expect(low.temperature).toBeGreaterThan(1);
    const high = engineParamsForRating(balance.ratingMax);
    expect(high.selfElo).toBe(2600);
    expect(high.temperature).toBeLessThan(0.7);
  });

  it("is monotonic: higher rating never means weaker parameters", () => {
    let prev = engineParamsForRating(700);
    for (let r = 710; r <= 2100; r += 10) {
      const cur = engineParamsForRating(r);
      expect(cur.selfElo).toBeGreaterThanOrEqual(prev.selfElo);
      expect(cur.temperature).toBeLessThanOrEqual(prev.temperature);
      prev = cur;
    }
  });

  it("covers the whole game rating range", () => {
    const first = balance.engineCalibration[0]!.rating;
    const last = balance.engineCalibration[balance.engineCalibration.length - 1]!.rating;
    expect(first).toBeLessThanOrEqual(balance.ratingMin);
    expect(last).toBeGreaterThanOrEqual(balance.ratingMax);
  });
});
