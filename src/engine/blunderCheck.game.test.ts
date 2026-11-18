import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { hashSeed } from "../rng/rng.ts";
import { BlunderCheckedAI } from "./blunderCheck.ts";
import { playGame, type SideConfig } from "./game.ts";
import { UniformAI } from "./testing/fakeAi.ts";
import type { Analysis, PositionEvaluator } from "./types.ts";

/** Deterministic evaluator: score and best move derived from the FEN; counts searches. */
class HashEvaluator implements PositionEvaluator {
  searches = 0;
  async analyse(fen: string): Promise<Analysis> {
    this.searches++;
    const legal = new Chess(fen).moves({ verbose: true });
    const h = hashSeed(fen);
    const best = legal.length ? legal[h % legal.length]! : null;
    return {
      score: { cp: (h % 1200) - 600 },
      bestMove: best ? best.from + best.to + (best.promotion ?? "") : null,
    };
  }
}

const side = (ai: SideConfig["ai"], elo: number): SideConfig => ({
  ai,
  elo,
  temperature: 1,
  topP: 1,
});

async function play(whiteElo: number, blackElo: number) {
  const ev = new HashEvaluator();
  const ai = new BlunderCheckedAI(new UniformAI(), ev);
  const g = await playGame({
    white: side(ai, whiteElo),
    black: side(ai, blackElo),
    seed: 3,
    maxPlies: 60,
    endRules: false,
  });
  return { g, searches: ev.searches };
}

/**
 * The evaluation bar (GDD §8.6) only reuses the blunder
 * check's analyses: the number of searches and the moves must stay exactly
 * what they were before the feature.
 */
describe("blunder check in a full game", () => {
  it("keeps the search count and the moves", async () => {
    const { g, searches } = await play(2400, 1500);
    expect({ plies: g.moves.length, searches, pgnHash: hashSeed(g.pgn) }).toMatchInlineSnapshot(`
      {
        "pgnHash": 2337742843,
        "plies": 60,
        "searches": 97,
      }
    `);
  });

  it("does not search for a side with the check off", async () => {
    const { g, searches } = await play(600, 600);
    expect(g.moves.length).toBe(60);
    expect(searches).toBe(0);
  });
});
