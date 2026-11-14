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
