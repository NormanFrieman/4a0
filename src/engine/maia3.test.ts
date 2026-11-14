import { describe, expect, it } from "vitest";
import { createRng } from "../rng/rng.ts";
import { Maia3Engine, type Maia3Predictor } from "./maia3.ts";

describe("Maia3Engine", () => {
  it("asks maia3-js for argmax only and samples with our rng", async () => {
    const calls: Parameters<Maia3Predictor["predict"]>[0][] = [];
    const fake: Maia3Predictor = {
      async predict(input) {
        calls.push(input);
        return {
          moves: new Map([
            ["e2e4", 0.6],
            ["d2d4", 0.4],
          ]),
          wdl: { win: 0.4, draw: 0.3, loss: 0.3 },
        };
      },
    };
    const engine = new Maia3Engine(fake);
    const req = {
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      priorMoves: [],
      selfElo: 1500.4,
      oppoElo: 1600,
      temperature: 1,
      topP: 1,
    };
    const a = await engine.chooseMove({ ...req, rng: createRng(1) });
    const b = await engine.chooseMove({ ...req, rng: createRng(1) });
    expect(a.move).toBe(b.move);
    expect(a.wdl).toEqual([0.4, 0.3, 0.3]);
    expect(a.policy).toEqual({ e2e4: 0.6, d2d4: 0.4 });
    expect(calls[0]).toMatchObject({ selfElo: 1500, oppoElo: 1600, temperature: 0, topK: 0 });
    expect(calls[0]).not.toHaveProperty("priorMoves");
  });
});
