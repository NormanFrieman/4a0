import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import type { PlayedMove } from "../../src/engine/game.ts";
import type { PositionEvaluator } from "../../src/engine/types.ts";
import { gameQuality, hasMateInOne, lichessQuality, materialBalance } from "./quality.ts";

type Wdl = [number, number, number];

/** Build engine moves from SAN, with an optional mover WDL per move. */
function line(sans: string[], wdls: Array<Wdl | undefined> = []): PlayedMove[] {
  const chess = new Chess();
  return sans.map((san, ply) => {
    const m = chess.move(san);
    const wdl = wdls[ply];
    return {
      ply,
      color: m.color === "w" ? "white" : "black",
      uci: m.from + m.to + (m.promotion ?? ""),
      san: m.san,
      fenAfter: chess.fen(),
      source: "engine",
      ...(wdl ? { wdl } : {}),
    };
  });
}

describe("materialBalance", () => {
  it("is zero at the start and counts a missing knight", () => {
    expect(materialBalance(new Chess().fen())).toBe(0);
    expect(materialBalance("r1bqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")).toBe(3);
  });
});

describe("hasMateInOne", () => {
  it("finds the fool's mate", () => {
    const chess = new Chess();
    for (const san of ["f3", "e5", "g4"]) chess.move(san);
    expect(hasMateInOne(chess.fen())).toBe(true);
    expect(hasMateInOne(new Chess().fen())).toBe(false);
  });
});

describe("gameQuality", () => {
  it("flags the move that allowed mate in one", () => {
    const q = gameQuality({ moves: line(["f3", "e5", "g4", "Qh4#"]) });
    expect(q.allowedMateInOne).toBe(1);
    expect(q.missedMateInOne).toBe(0);
  });

  it("flags a missed mate in one", () => {
    const q = gameQuality({ moves: line(["f3", "e5", "g4", "Nc6"]) });
    expect(q.missedMateInOne).toBe(1);
  });

  it("measures one-ply drops from consecutive WDLs", () => {
    // White at 0.5, then black sees itself at 0.9 → white dropped 0.4.
    const q = gameQuality({
      moves: line(["e4", "e5", "Nf3"], [[0.3, 0.4, 0.3], [0.8, 0.2, 0], undefined]),
    });
    expect(q.scoredMoves).toBe(1);
    expect(q.blunders).toEqual([1, 1]);
  });

  it("detects an early stable material lead", () => {
    // Black loses the queen on move 4 and the game goes on.
    const sans = ["e4", "e5", "Nf3", "Qh4", "Nxh4", "Nc6", "Nf3", "Nf6", "Nc3", "Bc5", "d3", "d6"];
    const q = gameQuality({ moves: line(sans) });
    expect(q.earlyMaterialLead).toBe(true);
    expect(q.maxMaterialLead).toBe(9);
  });
});

describe("lichessQuality", () => {
  it("classifies moves by the drop in winning chances", async () => {
    // Scores for the side to move after 0, 1, 2, 3 plies.
    const cps = [20, -20, 400, -800];
    const moves = line(["e4", "e5", "Nf3"]);
    const fens = [new Chess().fen(), ...moves.map((m) => m.fenAfter)];
    const ev: PositionEvaluator = {
      analyse: async (fen) => ({ score: { cp: cps[fens.indexOf(fen)]! }, bestMove: null }),
    };
    const q = await lichessQuality({ moves }, ev, 1000, 0.00368208);
    expect(q.moves).toBe(3);
    // e4: 20 → 20, no loss. e5: −20 for black after → white +400: black blunders.
    // Nf3: white 400 → 800, a gain.
    expect(q.blunders).toBe(1);
    expect(q.mistakes + q.inaccuracies).toBe(0);
    expect(q.cpLoss).toBe(380);
  });
});
