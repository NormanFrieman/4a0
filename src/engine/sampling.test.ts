import { describe, expect, it } from "vitest";
import { createRng } from "../rng/rng.ts";
import { sampleMove, shapePolicy } from "./sampling.ts";

const policy = { e2e4: 0.5, d2d4: 0.3, g1f3: 0.15, a2a3: 0.05 };

function frequencies(temperature: number, topP: number, n = 20000) {
  const rng = createRng(`freq-${temperature}-${topP}`);
  const counts: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    const m = sampleMove(policy, { temperature, topP, rng });
    counts[m] = (counts[m] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, v / n]));
}

describe("shapePolicy", () => {
  it("is the identity at temperature 1 and topP 1", () => {
    const d = Object.fromEntries(shapePolicy(policy, 1, 1));
    for (const [m, p] of Object.entries(policy)) expect(d[m]).toBeCloseTo(p);
  });

  it("sharpens at low temperature and flattens at high temperature", () => {
    const cold = Object.fromEntries(shapePolicy(policy, 0.5, 1));
    const hot = Object.fromEntries(shapePolicy(policy, 2, 1));
    expect(cold.e2e4).toBeGreaterThan(0.5);
    expect(hot.e2e4).toBeLessThan(0.5);
  });

  it("top-p cuts the tail", () => {
    const d = shapePolicy(policy, 1, 0.8);
    expect(d.map(([m]) => m)).toEqual(["e2e4", "d2d4"]);
    expect(d[0]![1] + d[1]![1]).toBeCloseTo(1);
  });

  it("temperature 0 keeps only the top move", () => {
    expect(shapePolicy(policy, 0, 1)).toEqual([["e2e4", 1]]);
  });
});

describe("sampleMove", () => {
  it("is reproducible with the same seed", () => {
    const a = createRng(9);
    const b = createRng(9);
    for (let i = 0; i < 50; i++) {
      expect(sampleMove(policy, { temperature: 1, topP: 1, rng: a })).toBe(
        sampleMove(policy, { temperature: 1, topP: 1, rng: b }),
      );
    }
  });

  it("matches the policy distribution at T=1", () => {
    const f = frequencies(1, 1);
    for (const [m, p] of Object.entries(policy)) expect(f[m]).toBeCloseTo(p, 1);
  });

  it("never samples moves cut by top-p", () => {
    const f = frequencies(1, 0.8);
    expect(f.g1f3).toBeUndefined();
    expect(f.a2a3).toBeUndefined();
  });
});
