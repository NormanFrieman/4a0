import { describe, expect, it } from "vitest";
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
});
