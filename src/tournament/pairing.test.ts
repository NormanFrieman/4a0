import { describe, expect, it } from "vitest";
import { createRng } from "../rng/rng.ts";
import { completable, pairRound, playedKey } from "./pairing.ts";

describe("pairing at MVP size", () => {
  it("pairs 24 teams over 7 rounds without repeats, quickly", () => {
    const rng = createRng("mvp");
    const teams = Array.from({ length: 24 }, (_, i) => ({
      id: `t${String(i).padStart(2, "0")}`,
      matchPoints: 0,
      gamePoints: 0,
      avgStrength: 2700 - i * 10,
      firstCount: 0,
    }));
    const played = new Set<string>();
    const t0 = performance.now();
    for (let round = 1; round <= 7; round++) {
      const pairs = pairRound(teams, played, round, 7 - round);
      expect(pairs).toHaveLength(12);
      for (const p of pairs) {
        const k = playedKey(p.first, p.second);
        expect(played.has(k)).toBe(false);
        played.add(k);
        const r = rng();
        const a = teams.find((t) => t.id === p.first)!;
        const b = teams.find((t) => t.id === p.second)!;
        a.matchPoints += r < 0.4 ? 2 : r < 0.6 ? 1 : 0;
        b.matchPoints += r < 0.4 ? 0 : r < 0.6 ? 1 : 2;
        a.firstCount++;
      }
    }
    expect(performance.now() - t0).toBeLessThan(2000);
  });

  it("detects rounds that cannot be completed", () => {
    // 4 teams, a-b and c-d already played: a-c/b-d and a-d/b-c remain → 2 rounds max.
    const played = new Set([playedKey("a", "b"), playedKey("c", "d")]);
    expect(completable(["a", "b", "c", "d"], played, 2)).toBe(true);
    expect(completable(["a", "b", "c", "d"], played, 3)).toBe(false);
  });
});

describe("score groups (GDD §5.2)", () => {
  /** Teams in seed order: `mp[i]` match points, strength descending. */
  const teams = (mp: number[]) =>
    mp.map((m, i) => ({
      id: `t${i}`,
      matchPoints: m,
      gamePoints: 0,
      avgStrength: 2700 - i * 10,
      firstCount: 0,
    }));
  const pairsOf = (ps: { first: string; second: string }[]) =>
    ps.map((p) => [p.first, p.second].sort().join("-")).sort();
  const played = (...pairs: [string, string][]) => new Set(pairs.map(([a, b]) => playedKey(a, b)));

  it("pairs top half against bottom half inside each group", () => {
    // Round 1 was t0-t4, t1-t5, t2-t6, t3-t7 and the top four won.
    const r1 = played(["t0", "t4"], ["t1", "t5"], ["t2", "t6"], ["t3", "t7"]);
    const p = pairRound(teams([2, 2, 2, 2, 0, 0, 0, 0]), r1, 2);
    expect(pairsOf(p)).toEqual(["t0-t2", "t1-t3", "t4-t6", "t5-t7"]);
  });

  it("an odd group sends its last team down to the top of the next one", () => {
    const p = pairRound(teams([2, 2, 2, 0, 0, 0, 0, 0]), new Set(), 2);
    expect(pairsOf(p)).toEqual(["t0-t1", "t2-t3", "t4-t6", "t5-t7"]);
  });

  it("rearranges a group instead of floating when a repeat blocks the first choice", () => {
    // t1-t3 already met: t0-t2 / t1-t3 is out, t0-t3 / t1-t2 keeps both groups whole.
    const p = pairRound(teams([2, 2, 2, 2, 0, 0, 0, 0]), played(["t1", "t3"]), 2);
    expect(pairsOf(p)).toEqual(["t0-t3", "t1-t2", "t4-t6", "t5-t7"]);
  });

  it("floats only when repeats leave no pairing inside the groups", () => {
    // The top pair already met, so each of them has to float.
    const p = pairRound(teams([4, 4, 2, 2, 2, 2]), played(["t0", "t1"]), 3);
    const cross = p.filter((x) => Number(x.first.slice(1)) < 2 !== Number(x.second.slice(1)) < 2);
    expect(cross).toHaveLength(2);
  });
});
