import { describe, expect, it } from "vitest";
import { balance } from "../config/balance.ts";
import { classifyMove, evalAt, formatEval } from "./moveFeedback.ts";

const cfg = balance.moveFeedback;

describe("classifyMove", () => {
  it("marks blunders and mistakes by the drop", () => {
    expect(classifyMove({ drop: cfg.blunderDrop })).toBe("blunder");
    expect(classifyMove({ drop: cfg.mistakeDrop })).toBe("mistake");
    expect(classifyMove({ drop: cfg.mistakeDrop - 0.01 })).toBeNull();
  });

  it("marks only the best moves that Maia found unlikely as great", () => {
    expect(classifyMove({ drop: 0, best: true, moveProb: cfg.greatMaxProb / 2 })).toBe("great");
    expect(classifyMove({ drop: 0, best: true, moveProb: cfg.greatMaxProb })).toBeNull();
    expect(classifyMove({ drop: 0.01, best: false, moveProb: 0.01 })).toBeNull();
  });

  it("leaves unchecked moves (book, check off) unmarked", () => {
    expect(classifyMove({ best: true, moveProb: 0.01 })).toBeNull();
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
