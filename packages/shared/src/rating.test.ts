import { describe, expect, it } from "vitest";
import { balance } from "./config/balance.ts";
import { effectiveRating, expectedScore, fatiguePenalty } from "./rating.ts";

describe("effectiveRating", () => {
  it("equals rating with no fatigue", () => {
    expect(effectiveRating({ rating: 1500, fatigue: 0 })).toBe(1500);
  });

  it("subtracts up to fatigueMaxPenalty at full fatigue", () => {
    expect(fatiguePenalty(100)).toBe(balance.fatigueMaxPenalty);
    expect(effectiveRating({ rating: 1500, fatigue: 100 })).toBe(1500 - balance.fatigueMaxPenalty);
    expect(effectiveRating({ rating: 1500, fatigue: 50 })).toBe(1500 - balance.fatigueMaxPenalty / 2);
  });

  it("clamps to [ratingMin, ratingMax]", () => {
    expect(effectiveRating({ rating: 650, fatigue: 100 })).toBe(balance.ratingMin);
    expect(effectiveRating({ rating: 2600, fatigue: 0, specialtyBonus: 100 })).toBe(
      balance.ratingMax,
    );
  });
});

describe("expectedScore", () => {
  it("matches the Elo curve used in GDD §12.1", () => {
    expect(expectedScore(1500, 1500)).toBeCloseTo(0.5);
    expect(expectedScore(1600, 1500)).toBeCloseTo(0.64, 2);
    expect(expectedScore(1700, 1500)).toBeCloseTo(0.76, 2);
  });
});
