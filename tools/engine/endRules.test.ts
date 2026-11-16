import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { type EndRules, defaultEndRules } from "../../src/engine/endRules.ts";
import { type OpeningBook, playGame, type SideConfig } from "../../src/engine/game.ts";
import { UniformAI } from "../../src/engine/testing/fakeAi.ts";
import type { MoveRequest } from "../../src/engine/types.ts";
import { recordGame, replayEndRules } from "./endRules.ts";

/** WDL that drifts with the position: balanced, lopsided or hopeless. */
const wdls: Array<[number, number, number]> = [
  [0.33, 0.34, 0.33],
  [0.3, 0.42, 0.28],
  [0.02, 0.03, 0.95],
  [0.95, 0.03, 0.02],
  [0.6, 0.3, 0.1],
];
const driftingWdl = (req: MoveRequest): [number, number, number] => {
  let h = 0;
  for (const ch of req.fen.split(" ")[0]!) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return wdls[h % wdls.length]!;
};

const book: OpeningBook = {
  probe: (fen) => (fen === new Chess().fen() ? [["e2e4", 1]] : null),
};

const side = (extra: Partial<SideConfig> = {}): SideConfig => ({
  ai: new UniformAI(driftingWdl),
  elo: 1500,
  temperature: 1,
  topP: 1,
  ...extra,
});

const ruleSets: EndRules[] = [
  defaultEndRules(),
  { ...defaultEndRules(), drawOfferFromMove: 5, drawStableMoves: 2, drawBand: 0.1 },
  {
    ...defaultEndRules(),
    resignProb: 0.06,
    resignStableMoves: 2,
    resignFromMove: 15,
    drawOfferFromMove: 999,
  },
];

describe("replayEndRules", () => {
  it("reproduces playGame with the rules on, from a game played without them", async () => {
    let triggered = 0;
    for (let seed = 0; seed < 6; seed++) {
      const opts = { white: side({ book }), black: side(), seed, maxPlies: 120 };
      const pure = recordGame(await playGame({ ...opts, endRules: false }));
      for (const rules of ruleSets) {
        const real = await playGame({ ...opts, endRules: rules });
        const replay = replayEndRules(pure, rules);
        expect(replay.result).toBe(real.result);
        expect(replay.termination).toBe(real.termination);
        expect(replay.plies).toBe(real.moves.length);
        if (["agreement", "resignation"].includes(real.termination)) triggered++;
      }
    }
    expect(triggered).toBeGreaterThan(3);
  }, 60_000);

  it("leaves the game untouched without rules", async () => {
    const g = recordGame(
      await playGame({ white: side(), black: side(), seed: 1, maxPlies: 40, endRules: false }),
    );
    const r = replayEndRules(g, false);
    expect(r.result).toBe(g.result);
    expect(r.plies).toBe(g.evals.length);
  });
});
