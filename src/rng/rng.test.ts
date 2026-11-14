import { describe, expect, it } from "vitest";
import { createRng, deriveRng } from "./rng.ts";

describe("createRng", () => {
  it("is deterministic for the same seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it("differs for different seeds", () => {
    const a = createRng(1);
    const b = createRng(2);
    const sa = Array.from({ length: 10 }, a);
    const sb = Array.from({ length: 10 }, b);
    expect(sa).not.toEqual(sb);
  });

  it("returns values in [0, 1) with a roughly uniform mean", () => {
    const r = createRng("uniform");
    let sum = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) {
      const x = r();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      sum += x;
    }
    expect(sum / n).toBeCloseTo(0.5, 1);
  });

  it("derived streams are independent of each other", () => {
    expect(deriveRng(7, "white")()).not.toBe(deriveRng(7, "black")());
  });
});
