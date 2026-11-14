import { describe, expect, it } from "vitest";
import { balance } from "../config/balance.ts";
import { engineParamsForRating, strengthPath } from "./engineParams.ts";

const path = strengthPath(balance.engineCalibration);

describe("engineParamsForRating", () => {
  it("hits strength-path points exactly", () => {
    for (const p of path) {
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
    const first = path[0]!.rating;
    const last = path[path.length - 1]!.rating;
    expect(first).toBeLessThanOrEqual(balance.ratingMin);
    expect(last).toBeGreaterThanOrEqual(balance.ratingMax);
  });

  it("builds the path from the grid: T>1 at the bottom, T=1, then T<1 at the top", () => {
    expect(path[0]).toMatchObject({ selfElo: 600, temperature: 1.3 });
    expect(path[path.length - 1]).toMatchObject({ selfElo: 2600, temperature: 0.6 });
    for (let i = 1; i < path.length; i++) {
      expect(path[i]!.rating).toBeGreaterThan(path[i - 1]!.rating);
    }
  });
});
