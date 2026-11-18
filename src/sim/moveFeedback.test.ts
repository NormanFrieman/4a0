import { describe, expect, it } from "vitest";
import { balance } from "../config/balance.ts";
import { classifyMove, confirmedDrop, evalAt, formatEval } from "./moveFeedback.ts";

const cfg = balance.moveFeedback;

describe("classifyMove", () => {
  const w = "white" as const;
  const b = "black" as const;

  it("marks blunders and mistakes by the drop", () => {
    expect(classifyMove({ color: w, drop: cfg.blunderDrop })).toBe("blunder");
    expect(classifyMove({ color: w, drop: cfg.mistakeDrop })).toBe("mistake");
    expect(classifyMove({ color: w, drop: cfg.mistakeDrop - 0.01 })).toBeNull();
  });

  /** Black's best move, which Maia found unlikely, scored −50 by its own search. */
  const unlikelyBest = {
    color: b,
    drop: 0,
    best: true,
    moveProb: cfg.greatMaxProb / 2,
    evalBefore: { cp: -50 },
  };

  it("marks a great move only when the next search confirms it", () => {
    expect(classifyMove(unlikelyBest, { color: w, evalBefore: { cp: -55 } })).toBe("great");
    // Not unlikely enough for Maia.
    expect(
      classifyMove(
        { ...unlikelyBest, moveProb: cfg.greatMaxProb },
        { color: w, evalBefore: { cp: -50 } },
      ),
    ).toBeNull();
    // No next search (end of game, book, check off): no "!".
    expect(classifyMove(unlikelyBest)).toBeNull();
    expect(classifyMove(unlikelyBest, { color: w })).toBeNull();
  });

  it("refutes a 'best' move that the next search finds worse (15...c6 case)", () => {
    // Black's search thought −50; White's fresh search of the position finds +40.
    expect(classifyMove(unlikelyBest, { color: w, evalBefore: { cp: 40 } })).toBeNull();
    // Far worse: the confirmed drop marks it as an error, like the bar shows.
    expect(classifyMove(unlikelyBest, { color: w, evalBefore: { cp: 250 } })).toBe("blunder");
  });

  it("marks no great move in the opening or once the game is decided", () => {
    const confirm = { color: w, evalBefore: { cp: -50 } };
    expect(classifyMove({ ...unlikelyBest, ply: 2 * cfg.greatFromMove - 1 }, confirm)).toBe(
      "great",
    );
    expect(classifyMove({ ...unlikelyBest, ply: 2 * cfg.greatFromMove - 3 }, confirm)).toBeNull();
    // Black already winning (−8): a routine winning move is not "!".
    const decided = { ...unlikelyBest, evalBefore: { cp: -800 } };
    expect(classifyMove(decided, { color: w, evalBefore: { cp: -800 } })).toBeNull();
  });

  it("measures the confirmed drop from the mover's point of view", () => {
    expect(confirmedDrop(unlikelyBest, { color: w, evalBefore: { cp: -50 } })).toBe(0);
    expect(
      confirmedDrop({ color: w, evalBefore: { cp: 100 } }, { color: b, evalBefore: { cp: -200 } }),
    ).toBeGreaterThan(0.4);
    expect(confirmedDrop({ color: w }, { color: b, evalBefore: { cp: 0 } })).toBeUndefined();
  });

  it("leaves unchecked moves (book, check off) unmarked", () => {
    expect(classifyMove({ color: w, best: true, moveProb: 0.01 })).toBeNull();
  });
});

describe("evalAt", () => {
  const plies = [
    { san: "e4" }, // book: no evaluation
    { san: "e5", eval: { cp: 50 } },
    { san: "Nf3" },
    { san: "Nc6", eval: { cp: -300 } },
  ];

  it("starts at 0 and keeps the last known evaluation through gaps", () => {
    expect(evalAt(plies, 0)).toEqual({ chances: 0, text: "0,0" });
    expect(evalAt(plies, 1).chances).toBe(0);
    expect(evalAt(plies, 2).text).toBe("+0,5");
    expect(evalAt(plies, 3).text).toBe("+0,5");
    expect(evalAt(plies, 4).chances).toBeLessThan(-0.4);
    expect(evalAt(plies, 4).text).toBe("−3,0");
  });

  it("prefers the next move's fresh search of the position", () => {
    const p = [
      { san: "e4", eval: { cp: 20 } },
      { san: "c6", eval: { cp: -50 }, evalBefore: { cp: 30 } },
      { san: "d4", eval: { cp: 60 }, evalBefore: { cp: 90 } },
    ];
    expect(evalAt(p, 1).text).toBe("+0,3");
    expect(evalAt(p, 2).text).toBe("+0,9");
    expect(evalAt(p, 3).text).toBe("+0,6");
  });

  it("is full after a checkmate, for the side that mated", () => {
    expect(evalAt([{ san: "f3" }, { san: "e5" }, { san: "g4" }, { san: "Qh4#" }], 4)).toEqual({
      chances: -1,
      text: "#",
    });
  });

  it("is 0 when the game ended drawn by the rules, once every ply is shown", () => {
    expect(evalAt(plies, 4, "stalemate").chances).toBe(0);
    expect(evalAt(plies, 3, "stalemate").text).toBe("+0,5");
    expect(evalAt(plies, 4, "resignation").text).toBe("−3,0");
  });
});

describe("formatEval", () => {
  it("formats pawns and mates in pt-BR", () => {
    expect(formatEval({ cp: 123 })).toBe("+1,2");
    expect(formatEval({ cp: -40 })).toBe("−0,4");
    expect(formatEval({ cp: 0 })).toBe("0,0");
    expect(formatEval({ mate: 3 })).toBe("M3");
    expect(formatEval({ mate: -2 })).toBe("−M2");
  });
});
