import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { balance } from "../config/balance.ts";
import { playGame, type OpeningBook, type SideConfig } from "./game.ts";
import { ScriptedAI, UniformAI } from "./testing/fakeAi.ts";
import type { MoveRequest } from "./types.ts";

const side = (ai: SideConfig["ai"], extra: Partial<SideConfig> = {}): SideConfig => ({
  ai,
  elo: 1500,
  temperature: 1,
  topP: 1,
  ...extra,
});

const whiteToMove = (req: MoveRequest) => req.fen.split(" ")[1] === "w";
const moveNumber = (req: MoveRequest) => Number(req.fen.split(" ")[5]);

describe("playGame", () => {
  it("records the blunder check's evaluation from White's point of view (GDD §8.6)", async () => {
    const script = new ScriptedAI(["f2f3", "e7e5", "g2g4", "d8h4"]);
    const ai: SideConfig["ai"] = {
      async chooseMove() {
        const r = await script.chooseMove();
        return {
          ...r,
          check: { scoreBefore: { cp: 70 }, scoreAfter: { cp: 100 }, best: true, drop: 0 },
        };
      },
    };
    const g = await playGame({ white: side(ai), black: side(ai), seed: 1 });
    expect(g.moves.map((m) => m.eval)).toEqual([{ cp: 100 }, { cp: -100 }, { cp: 100 }, undefined]);
    expect(g.moves.map((m) => m.evalBefore)).toEqual([
      { cp: 70 },
      { cp: -70 },
      { cp: 70 },
      { cp: -70 },
    ]);
    expect(g.moves.every((m) => m.best === true && m.drop === 0)).toBe(true);
  });

  it("leaves moves without a check unannotated", async () => {
    const ai = new ScriptedAI(["f2f3", "e7e5", "g2g4", "d8h4"]);
    const g = await playGame({ white: side(ai), black: side(ai), seed: 1 });
    expect(
      g.moves.some((m) => "eval" in m || "evalBefore" in m || "drop" in m || "best" in m),
    ).toBe(false);
  });

  it("detects checkmate (fool's mate)", async () => {
    const ai = new ScriptedAI(["f2f3", "e7e5", "g2g4", "d8h4"]);
    const g = await playGame({ white: side(ai), black: side(ai), seed: 1 });
    expect(g.result).toBe("0-1");
    expect(g.termination).toBe("checkmate");
    expect(g.moves.map((m) => m.san)).toEqual(["f3", "e5", "g4", "Qh4#"]);
  });

  it("produces a valid PGN with result, termination and extra headers", async () => {
    const ai = new ScriptedAI(["f2f3", "e7e5", "g2g4", "d8h4"]);
    const g = await playGame({
      white: side(ai),
      black: side(ai),
      seed: 1,
      headers: { Event: "Olimpíada 1980", Round: "3", Board: "1" },
    });
    expect(g.pgn).toContain('[Result "0-1"]');
    expect(g.pgn).toContain('[Termination "checkmate"]');
    expect(g.pgn).toContain('[Event "Olimpíada 1980"]');
    expect(g.pgn).not.toContain("%clk");
    const reloaded = new Chess();
    reloaded.loadPgn(g.pgn);
    expect(reloaded.isCheckmate()).toBe(true);
  });

  it("is reproducible for the same seed and differs for another seed", async () => {
    const play = (seed: number) =>
      playGame({ white: side(new UniformAI()), black: side(new UniformAI()), seed, maxPlies: 60 });
    const [a, b, c] = await Promise.all([play(5), play(5), play(6)]);
    expect(a.pgn).toBe(b.pgn);
    expect(a.pgn).not.toBe(c.pgn);
  });

  it("always reaches a legal termination with random play", async () => {
    for (let seed = 0; seed < 5; seed++) {
      const g = await playGame({
        white: side(new UniformAI()),
        black: side(new UniformAI()),
        seed,
        endRules: false,
      });
      expect(["1-0", "0-1", "1/2-1/2"]).toContain(g.result);
      expect(g.moves.length).toBeLessThanOrEqual(balance.game.maxPlies);
    }
  }, 30_000);

  describe("adjudication at maxPlies", () => {
    it("gives the win to the side to move above the threshold", async () => {
      const confident = new UniformAI([0.95, 0.04, 0.01]);
      const g = await playGame({
        white: side(confident),
        black: side(confident),
        seed: 3,
        maxPlies: 10,
        endRules: false,
      });
      expect(g.termination).toBe("adjudication");
      // After 10 plies it is white to move.
      expect(g.result).toBe("1-0");
    });

    it("gives the loss to the side to move when its loss prob passes the threshold", async () => {
      const losing = new UniformAI([0.01, 0.04, 0.95]);
      const g = await playGame({
        white: side(losing),
        black: side(losing),
        seed: 3,
        maxPlies: 11,
        endRules: false,
      });
      expect(g.termination).toBe("adjudication");
      // After 11 plies it is black to move, and black is losing.
      expect(g.result).toBe("1-0");
    });

    it("is a draw below the threshold", async () => {
      const g = await playGame({
        white: side(new UniformAI()),
        black: side(new UniformAI()),
        seed: 3,
        maxPlies: 10,
      });
      expect(g.termination).toBe("adjudication");
      expect(g.result).toBe("1/2-1/2");
    });
  });

  describe("draw by agreement", () => {
    const rules = { drawOfferFromMove: 5, drawBand: 0.08, drawStableMoves: 4 };

    it("ends drawn once the balanced evaluation is stable from the given move", async () => {
      const ai = new UniformAI([0.3, 0.4, 0.3]);
      const g = await playGame({ white: side(ai), black: side(ai), seed: 7, endRules: rules });
      expect(g.termination).toBe("agreement");
      expect(g.result).toBe("1/2-1/2");
      // Move 5 starts at ply 8; four stable evaluations (plies 8–11), no move played on the 4th.
      expect(g.moves.length).toBe(11);
    });

    it("does not happen when the evaluation is unbalanced", async () => {
      const ai = new UniformAI((req) => (whiteToMove(req) ? [0.7, 0.2, 0.1] : [0.1, 0.2, 0.7]));
      const g = await playGame({
        white: side(ai),
        black: side(ai),
        seed: 7,
        maxPlies: 40,
        endRules: rules,
      });
      expect(g.termination).not.toBe("agreement");
    });
  });

  describe("resignation", () => {
    it("the losing side resigns after resignStableMoves evaluations below resignProb", async () => {
      // Black sees itself as lost from move 3 on; white sees a won game.
      const ai = new UniformAI((req) => {
        if (moveNumber(req) < 3) return [0.33, 0.34, 0.33];
        return whiteToMove(req) ? [0.97, 0.02, 0.01] : [0.01, 0.02, 0.97];
      });
      const g = await playGame({
        white: side(ai),
        black: side(ai),
        seed: 9,
        endRules: {
          resignProb: 0.05,
          resignStableMoves: 3,
          resignFromMove: 1,
          drawOfferFromMove: 999,
        },
      });
      expect(g.termination).toBe("resignation");
      expect(g.result).toBe("1-0");
      // Black's own moves 3 and 4 count, the third evaluation (move 5) resigns before moving.
      expect(g.moves.length).toBe(9);
    });

    it("waits for resignFromMove, keeping the streak meanwhile", async () => {
      const ai = new UniformAI((req) => {
        if (moveNumber(req) < 3) return [0.33, 0.34, 0.33];
        return whiteToMove(req) ? [0.97, 0.02, 0.01] : [0.01, 0.02, 0.97];
      });
      const g = await playGame({
        white: side(ai),
        black: side(ai),
        seed: 9,
        endRules: {
          resignProb: 0.05,
          resignStableMoves: 3,
          resignFromMove: 8,
          drawOfferFromMove: 999,
        },
      });
      expect(g.termination).toBe("resignation");
      expect(g.result).toBe("1-0");
      // The streak is complete at move 5, but black only resigns on move 8 (ply 15), before moving.
      expect(g.moves.length).toBe(15);
    });
  });

  describe("opening book", () => {
    const book: OpeningBook = {
      probe(fen) {
        const start = new Chess().fen();
        if (fen === start) return [["e2e4", 1]];
        if (fen.startsWith("rnbqkbnr/pppppppp/8/8/4P3/"))
          return [
            ["e7e5", 3],
            ["c7c5", 1],
          ];
        return null;
      },
    };

    it("plays book moves while in book, then hands over to the engine", async () => {
      const g = await playGame({
        white: side(new UniformAI(), { book }),
        black: side(new UniformAI(), { book }),
        seed: 1,
        maxPlies: 6,
      });
      expect(g.moves[0]).toMatchObject({ uci: "e2e4", source: "book" });
      expect(g.moves[1]!.source).toBe("book");
      expect(["e7e5", "c7c5"]).toContain(g.moves[1]!.uci);
      expect(g.moves.slice(2).every((m) => m.source === "engine")).toBe(true);
      expect(g.moves[0]!.wdl).toBeUndefined();
    });

    it("samples book moves by weight with the side's seeded rng", async () => {
      const counts = { e7e5: 0, c7c5: 0 };
      for (let seed = 0; seed < 200; seed++) {
        const g = await playGame({
          white: side(new UniformAI(), { book }),
          black: side(new UniformAI(), { book }),
          seed,
          maxPlies: 2,
        });
        counts[g.moves[1]!.uci as keyof typeof counts]++;
      }
      expect(counts.e7e5 / 200).toBeGreaterThan(0.65);
      expect(counts.e7e5 / 200).toBeLessThan(0.85);
    });

    it("leaves the book on an illegal book move", async () => {
      const bad: OpeningBook = { probe: () => [["e2e5", 1]] };
      const g = await playGame({
        white: side(new UniformAI(), { book: bad }),
        black: side(new UniformAI()),
        seed: 1,
        maxPlies: 4,
      });
      expect(g.moves.every((m) => m.source === "engine")).toBe(true);
    });
  });
});
