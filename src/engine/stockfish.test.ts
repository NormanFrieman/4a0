import { describe, expect, it } from "vitest";
import { parseScore, UciEvaluator, type UciTransport } from "./stockfish.ts";

describe("parseScore", () => {
  it("reads centipawns and mates", () => {
    expect(parseScore("info depth 12 seldepth 18 score cp -35 nodes 5000 pv e2e4")).toEqual({
      cp: -35,
    });
    expect(parseScore("info depth 5 score mate 2 pv d1h5")).toEqual({ mate: 2 });
    expect(parseScore("info string NNUE enabled")).toBeNull();
  });
});

/** Fake engine: answers the handshake and every search with a scripted score. */
function fakeTransport(log: string[]): UciTransport {
  let out: (line: string) => void = () => {};
  return {
    onLine: (l) => (out = l),
    send(cmd) {
      log.push(cmd);
      queueMicrotask(() => {
        if (cmd === "uci") out("uciok");
        else if (cmd === "isready") out("readyok");
        else if (cmd.startsWith("go")) {
          const only = /searchmoves (\S+)/.exec(cmd)?.[1];
          out("info depth 10 score cp 50 upperbound nodes 100");
          out(`info depth 12 score ${only ? "cp -200" : "mate 3"} nodes 5000 pv e2e4`);
          out(`bestmove ${only ?? "e2e4"} ponder e7e5`);
        }
      });
    },
  };
}

describe("UciEvaluator", () => {
  it("searches with a fresh hash and a node budget", async () => {
    const log: string[] = [];
    const ev = await UciEvaluator.create(fakeTransport(log));
    const fen = "8/8/8/8/8/8/8/K6k w - - 0 1";
    const [a, b] = await Promise.all([
      ev.analyse(fen, { nodes: 5000 }),
      ev.analyse(fen, { nodes: 5000, onlyMove: "a1a2" }),
    ]);
    expect(a).toEqual({ score: { mate: 3 }, bestMove: "e2e4" });
    expect(b).toEqual({ score: { cp: -200 }, bestMove: "a1a2" });
    expect(log).toContain("setoption name Threads value 1");
    expect(log.filter((c) => c === "ucinewgame")).toHaveLength(2);
    expect(log).toContain("go nodes 5000 searchmoves a1a2");
  });
});
