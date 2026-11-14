import { describe, expect, it } from "vitest";
import { createRng } from "../../../src/rng/rng.ts";
import { fitElo, type PairResult } from "./fitElo.ts";

const expected = (ra: number, rb: number) => 1 / (1 + 10 ** ((rb - ra) / 400));

describe("fitElo", () => {
  it("recovers known ratings from simulated games", () => {
    const truth: Record<string, number> = { A: 1000, B: 1150, C: 1300, D: 1600 };
    const rng = createRng("fit");
    const games: PairResult[] = [];
    const names = Object.keys(truth);
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const a = names[i]!;
        const b = names[j]!;
        const p = expected(truth[a]!, truth[b]!);
        for (let g = 0; g < 2000; g++) games.push({ a, b, scoreA: rng() < p ? 1 : 0 });
      }
    }
    const fit = fitElo(games, { nodes: names, mean: 1262.5 });
    for (const n of names) expect(Math.abs(fit[n]! - truth[n]!)).toBeLessThan(25);
  });

  it("stays finite when a pair is 100%–0%", () => {
    const games: PairResult[] = Array.from({ length: 50 }, () => ({ a: "X", b: "Y", scoreA: 1 }));
    const fit = fitElo(games, { nodes: ["X", "Y"], mean: 0 });
    expect(Number.isFinite(fit.X)).toBe(true);
    expect(fit.X!).toBeGreaterThan(fit.Y!);
  });

  it("applies the anchor", () => {
    const fit = fitElo([{ a: "X", b: "Y", scoreA: 0.5 }], { nodes: ["X", "Y"], mean: 1500 });
    expect((fit.X! + fit.Y!) / 2).toBeCloseTo(1500);
  });
});
