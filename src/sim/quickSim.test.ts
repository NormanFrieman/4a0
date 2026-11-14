import { describe, expect, it } from "vitest";
import { balance } from "../config/balance.ts";
import { createRng } from "../rng/rng.ts";
import { eloQuickSimulator, outcomeProbabilities } from "./quickSim.ts";

describe("outcomeProbabilities", () => {
  it("sums to 1 and keeps the Elo expected score for white", () => {
    for (const [w, b] of [
      [2000, 2000],
      [2700, 2400],
      [2200, 2650],
    ] as const) {
      const p = outcomeProbabilities(w, b);
      expect(p.whiteWin + p.draw + p.blackWin).toBeCloseTo(1);
      const e = 1 / (1 + 10 ** (-(w - b + balance.quickSim.whiteAdvantage) / 400));
      expect(p.whiteWin + p.draw / 2).toBeCloseTo(e);
      expect(Math.min(p.whiteWin, p.draw, p.blackWin)).toBeGreaterThanOrEqual(0);
    }
  });

  it("draws more at higher levels, within drawMin..drawMax", () => {
    const low = outcomeProbabilities(1800, 1800).draw;
    const high = outcomeProbabilities(2700, 2700).draw;
    expect(high).toBeGreaterThan(low);
    expect(low).toBeGreaterThanOrEqual(balance.quickSim.drawMin);
    expect(high).toBeLessThanOrEqual(balance.quickSim.drawMax);
  });

  it("caps draws at 2·min(E, 1−E) in lopsided games", () => {
    const p = outcomeProbabilities(2800, 1600);
    expect(p.blackWin).toBeCloseTo(0);
    expect(p.draw).toBeLessThanOrEqual(balance.quickSim.drawMax);
  });
});

describe("eloQuickSimulator", () => {
  it("matches the probabilities with a seeded rng", () => {
    const rng = createRng("quick");
    const n = 20_000;
    const counts = { 1: 0, 0.5: 0, 0: 0 };
    for (let i = 0; i < n; i++) {
      counts[eloQuickSimulator.sampleResult({ strength: 2600 }, { strength: 2500 }, rng)]++;
    }
    const p = outcomeProbabilities(2600, 2500);
    expect(counts[1] / n).toBeCloseTo(p.whiteWin, 1);
    expect(counts[0.5] / n).toBeCloseTo(p.draw, 1);
  });

  it("is reproducible for the same seed", () => {
    const run = () => {
      const rng = createRng(7);
      return Array.from({ length: 50 }, () =>
        eloQuickSimulator.sampleResult({ strength: 2500 }, { strength: 2500 }, rng),
      );
    };
    expect(run()).toEqual(run());
  });
});
