import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { encodePolyglotMove } from "./book/polyglotMove.ts";
import { polyglotKey } from "./book/polyglotKey.ts";
import { writePolyglot } from "./book/polyglotWriter.ts";
import { LocalGameSimulator } from "./localSimulator.ts";
import { UniformAI } from "./testing/fakeAi.ts";
import type { GameJob } from "./types.ts";

const job: GameJob = {
  white: { name: "A", selfElo: 1500, temperature: 1, topP: 1 },
  black: { name: "B", selfElo: 1400, temperature: 1, topP: 1 },
  seed: "s/r1/b1",
  maxPlies: 20,
  headers: { Round: "1", Board: "1" },
};

describe("LocalGameSimulator", () => {
  it("plays a job deterministically and streams moves", async () => {
    const sim = new LocalGameSimulator(new UniformAI());
    const seen: string[] = [];
    const a = await sim.playGame(job, (m) => seen.push(m.uci));
    const b = await sim.playGame(job);
    expect(a.pgn).toBe(b.pgn);
    expect(seen).toEqual(a.moves.map((m) => m.uci));
    expect(a.pgn).toContain('[White "A"]');
    expect(a.pgn).toContain('[Board "1"]');
  });

  it("plays the side's opening book before handing over to the engine", async () => {
    const start = new Chess().fen();
    const book = writePolyglot([
      { key: polyglotKey(start), move: encodePolyglotMove("c2c4", start), weight: 1 },
    ]);
    const sim = new LocalGameSimulator(new UniformAI());
    const withBook: GameJob = { ...job, white: { ...job.white, book } };
    const a = await sim.playGame(withBook);
    const b = await sim.playGame(withBook);
    expect(a.moves[0]).toMatchObject({ uci: "c2c4", source: "book" });
    expect(a.moves[1]!.source).toBe("engine");
    expect(a.moves[2]!.source).toBe("engine");
    expect(a.pgn).toBe(b.pgn);
  });
});
