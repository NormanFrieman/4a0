import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { balance } from "../config/balance.ts";
import { createRng } from "../rng/rng.ts";
import { BlunderCheckedAI, toleranceFor, winChances } from "./blunderCheck.ts";
import type { Analysis, ChessAI, MoveRequest, PositionEvaluator } from "./types.ts";

const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const cfg = {
  ...balance.blunderCheck,
  tolerance: [
    { selfElo: 1000, maxDrop: 2 },
    { selfElo: 2000, maxDrop: 0.2 },
  ],
};

/** Policy where the most likely move is the blunder. */
const policy = { f2f3: 0.7, e2e4: 0.2, d2d4: 0.1 };
const inner: ChessAI = {
  async chooseMove() {
    return { move: "f2f3", policy, wdl: [0.4, 0.3, 0.3] };
  },
};

const after = (uci: string) => {
  const c = new Chess(fen);
  c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
  return c.fen();
};

/**
 * Root scored +40 with best move e2e4; each position after a move is scored
 * from the opponent's point of view, as Stockfish does.
 */
class FakeEvaluator implements PositionEvaluator {
  calls: string[] = [];
  private readonly byFen = new Map<string, number>();
  constructor(moverCp: Record<string, number>) {
    for (const [m, cp] of Object.entries(moverCp)) this.byFen.set(after(m), -cp);
  }
  async analyse(f: string): Promise<Analysis> {
    this.calls.push(f);
    if (f === fen) return { score: { cp: 40 }, bestMove: "e2e4" };
    return { score: { cp: this.byFen.get(f)! }, bestMove: null };
  }
}

const req = (selfElo: number, seed = 1): MoveRequest => ({
  fen,
  priorMoves: [],
  selfElo,
  oppoElo: selfElo,
  temperature: 1,
  topP: 1,
  rng: createRng(seed),
});

describe("winChances", () => {
  it("is 0 at equality, symmetric, and ±1 for mates", () => {
    const k = balance.blunderCheck.winChanceK;
    expect(winChances({ cp: 0 }, k)).toBe(0);
    expect(winChances({ cp: 300 }, k)).toBeCloseTo(-winChances({ cp: -300 }, k));
    expect(winChances({ cp: 300 }, k)).toBeGreaterThan(0.4);
    expect(winChances({ mate: 3 }, k)).toBe(1);
    expect(winChances({ mate: -1 }, k)).toBe(-1);
  });
});

describe("toleranceFor", () => {
  it("interpolates by selfElo and clamps at the ends", () => {
    expect(toleranceFor(500, cfg)).toBe(2);
    expect(toleranceFor(1500, cfg)).toBeCloseTo(1.1);
    expect(toleranceFor(2600, cfg)).toBe(0.2);
  });
});

describe("BlunderCheckedAI", () => {
  it("vetoes the blunder and resamples among the rest", async () => {
    const ev = new FakeEvaluator({ f2f3: -500, d2d4: 30 });
    const ai = new BlunderCheckedAI(inner, ev, cfg);
    const played = new Set<string>();
    for (let s = 0; s < 50; s++) {
      const r = await ai.chooseMove(req(2000, s));
      played.add(r.move);
      expect(r.policy).toBe(policy);
    }
    expect(played.has("f2f3")).toBe(false);
    expect([...played].sort()).toEqual(["d2d4", "e2e4"]);
  });

  it("plays Stockfish's best move without a second search", async () => {
    const ev = new FakeEvaluator({});
    const ai = new BlunderCheckedAI(
      { chooseMove: async () => ({ move: "e2e4", policy, wdl: [0.4, 0.3, 0.3] }) },
      ev,
      cfg,
    );
    expect((await ai.chooseMove(req(2000))).move).toBe("e2e4");
    expect(ev.calls).toEqual([fen]);
  });

  it("caches analyses by FEN", async () => {
    const ev = new FakeEvaluator({ f2f3: 30 });
    const ai = new BlunderCheckedAI(inner, ev, cfg);
    await ai.chooseMove(req(2000));
    await ai.chooseMove(req(2000));
    expect(ev.calls).toEqual([fen, after("f2f3")]);
  });

  it("is off where the tolerance is 2 or more", async () => {
    const ev = new FakeEvaluator({ f2f3: -900 });
    const r = await new BlunderCheckedAI(inner, ev, cfg).chooseMove(req(900));
    expect(r.move).toBe("f2f3");
    expect(ev.calls).toHaveLength(0);
  });

  it("falls back to Stockfish's best move when every try fails", async () => {
    const ev = new FakeEvaluator({ f2f3: -500, d2d4: -500, e2e4: -500 });
    const ai = new BlunderCheckedAI(inner, ev, { ...cfg, maxTries: 2 });
    expect((await ai.chooseMove(req(2000))).move).toBe("e2e4");
  });

  it("is deterministic for a seed", async () => {
    const ev = new FakeEvaluator({ f2f3: -500, d2d4: 30 });
    const ai = new BlunderCheckedAI(inner, ev, cfg);
    const a = await ai.chooseMove(req(2000, 7));
    const b = await ai.chooseMove(req(2000, 7));
    expect(a.move).toBe(b.move);
  });

  describe("check (GDD §8.6)", () => {
    const k = balance.blunderCheck.winChanceK;

    it("reports Stockfish's best move with the root score", async () => {
      const ai = new BlunderCheckedAI(
        { chooseMove: async () => ({ move: "e2e4", policy, wdl: [0.4, 0.3, 0.3] }) },
        new FakeEvaluator({}),
        cfg,
      );
      expect((await ai.chooseMove(req(2000))).check).toEqual({
        scoreAfter: { cp: 40 },
        best: true,
        drop: 0,
      });
    });

    it("reports an accepted move with its score and drop", async () => {
      const ai = new BlunderCheckedAI(inner, new FakeEvaluator({ f2f3: 30 }), cfg);
      const r = await ai.chooseMove(req(2000));
      expect(r.move).toBe("f2f3");
      expect(r.check!.scoreAfter).toEqual({ cp: 30 });
      expect(r.check!.best).toBe(false);
      expect(r.check!.drop).toBeCloseTo(winChances({ cp: 40 }, k) - winChances({ cp: 30 }, k));
    });

    it("reports the fallback as the best move", async () => {
      const ev = new FakeEvaluator({ f2f3: -500, d2d4: -500, e2e4: -500 });
      const r = await new BlunderCheckedAI(inner, ev, { ...cfg, maxTries: 2 }).chooseMove(
        req(2000),
      );
      expect(r.move).toBe("e2e4");
      expect(r.check).toEqual({ scoreAfter: { cp: 40 }, best: true, drop: 0 });
    });

    it("is absent where the check is off", async () => {
      const r = await new BlunderCheckedAI(inner, new FakeEvaluator({}), cfg).chooseMove(req(900));
      expect(r.check).toBeUndefined();
    });
  });
});
