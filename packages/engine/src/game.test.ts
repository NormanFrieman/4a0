import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { playGame, type SideConfig } from "./game.ts";
import { ScriptedAI, UniformAI } from "./testing/fakeAi.ts";

const side = (ai: SideConfig["ai"], elo = 1500): SideConfig => ({
  ai,
  elo,
  temperature: 1,
  topP: 1,
});

describe("playGame", () => {
  it("detects checkmate (fool's mate)", async () => {
    const ai = new ScriptedAI(["f2f3", "e7e5", "g2g4", "d8h4"]);
    const g = await playGame({ white: side(ai), black: side(ai), seed: 1 });
    expect(g.result).toBe("0-1");
    expect(g.termination).toBe("checkmate");
    expect(g.moves.map((m) => m.san)).toEqual(["f3", "e5", "g4", "Qh4#"]);
  });

  it("produces a valid PGN with headers and clock comments", async () => {
    const ai = new ScriptedAI(["f2f3", "e7e5", "g2g4", "d8h4"]);
    const g = await playGame({ white: side(ai), black: side(ai), seed: 1 });
    expect(g.pgn).toContain('[Result "0-1"]');
    expect(g.pgn).toContain('[TimeControl "300+3"]');
    expect(g.pgn).toContain("[%clk");
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
      });
      expect(["1-0", "0-1", "1/2-1/2"]).toContain(g.result);
      expect(g.moves.length).toBeLessThanOrEqual(300);
    }
  }, 30_000);

  it("adjudicates a win for the side to move when WDL passes the threshold", async () => {
    const confident = new UniformAI([0.95, 0.04, 0.01]);
    const g = await playGame({
      white: side(confident),
      black: side(confident),
      seed: 3,
      maxPlies: 10,
    });
    expect(g.termination).toBe("adjudication");
    // After 10 plies it is white to move.
    expect(g.result).toBe("1-0");
  });

  it("adjudicates a loss for the side to move when its loss prob passes the threshold", async () => {
    const losing = new UniformAI([0.01, 0.04, 0.95]);
    const g = await playGame({ white: side(losing), black: side(losing), seed: 3, maxPlies: 11 });
    expect(g.termination).toBe("adjudication");
    // After 11 plies it is black to move, and black is losing.
    expect(g.result).toBe("1-0");
  });

  it("adjudicates a draw below the threshold", async () => {
    const g = await playGame({
      white: side(new UniformAI()),
      black: side(new UniformAI()),
      seed: 3,
      maxPlies: 10,
    });
    expect(g.termination).toBe("adjudication");
    expect(g.result).toBe("1/2-1/2");
  });

  it("keeps clocks positive and applies the increment", async () => {
    const g = await playGame({
      white: side(new UniformAI()),
      black: side(new UniformAI()),
      seed: 11,
      maxPlies: 40,
    });
    const first = g.moves[0]!;
    expect(first.clocksMs.white).toBe(300_000 - first.thinkMs + 3_000);
    for (const m of g.moves) {
      expect(m.clocksMs.white).toBeGreaterThan(0);
      expect(m.clocksMs.black).toBeGreaterThan(0);
    }
  });
});
