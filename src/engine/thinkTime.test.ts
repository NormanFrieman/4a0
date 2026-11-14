import { describe, expect, it } from "vitest";
import { createRng } from "../rng/rng.ts";
import { thinkTimeMs } from "./thinkTime.ts";

const avg = (f: () => number, n = 2000) => Array.from({ length: n }, f).reduce((a, b) => a + b) / n;

describe("thinkTimeMs", () => {
  it("is faster in the opening", () => {
    const rng = createRng(1);
    const opening = avg(() => thinkTimeMs({ ply: 2, topMoveProb: 0.3, remainingMs: 300_000, rng }));
    const middle = avg(() => thinkTimeMs({ ply: 30, topMoveProb: 0.3, remainingMs: 300_000, rng }));
    expect(opening).toBeLessThan(middle);
  });

  it("is slower when the policy is scattered", () => {
    const rng = createRng(2);
    const sure = avg(() => thinkTimeMs({ ply: 30, topMoveProb: 0.95, remainingMs: 300_000, rng }));
    const unsure = avg(() => thinkTimeMs({ ply: 30, topMoveProb: 0.1, remainingMs: 300_000, rng }));
    expect(unsure).toBeGreaterThan(sure);
  });

  it("never exceeds a fraction of the remaining clock", () => {
    const rng = createRng(3);
    for (let i = 0; i < 500; i++) {
      expect(thinkTimeMs({ ply: 40, topMoveProb: 0.05, remainingMs: 5_000, rng })).toBeLessThan(
        5_000,
      );
    }
  });
});
