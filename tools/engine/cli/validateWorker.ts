import { parentPort, workerData } from "node:worker_threads";
import { playGame } from "../../../src/engine/game.ts";
import { balance } from "../../../src/config/balance.ts";
import { BlunderCheckedAI, type BlunderCheckConfig } from "../../../src/engine/blunderCheck.ts";
import type { ChessAI } from "../../../src/engine/types.ts";
import { createNodeMaia3Engine } from "../node.ts";
import { createNodeStockfish } from "../stockfish.node.ts";
import { gameQuality, lichessQuality, type GameQuality, type LichessQuality } from "../quality.ts";

export interface ValidateJob {
  id: number;
  seed: string;
  white: { elo: number; temperature: number };
  black: { elo: number; temperature: number };
  topP: number;
  /** Blunder check (GDD §8.1); default `balance.blunderCheck`, `false` = off. */
  check?: BlunderCheckConfig | false;
  /** Disable draw by agreement and resignation (GDD §8.2). */
  pure?: boolean;
  /** Compute move-quality metrics (tools/engine/quality.ts). */
  quality?: boolean;
  /** With `quality`: deep Stockfish analysis with this many nodes per position. */
  analyseNodes?: number;
}

export interface ValidateJobResult {
  id: number;
  result: "1-0" | "0-1" | "1/2-1/2";
  termination: string;
  plies: number;
  ms: number;
  quality?: GameQuality;
  lichess?: LichessQuality;
}

const { modelPath } = workerData as { modelPath: string };
// One ORT thread per worker: we parallelize across games instead.
const { maiaEngine } = await createNodeMaia3Engine({
  modelPath,
  intraOpNumThreads: 1,
  blunderCheck: false,
});
const { evaluator: stockfish } = await createNodeStockfish();

parentPort!.on("message", async (job: ValidateJob) => {
  const t0 = performance.now();
  const check = job.check ?? balance.blunderCheck;
  const engine: ChessAI = check ? new BlunderCheckedAI(maiaEngine, stockfish, check) : maiaEngine;
  const g = await playGame({
    white: { ai: engine, ...job.white, topP: job.topP },
    black: { ai: engine, ...job.black, topP: job.topP },
    seed: job.seed,
    ...(job.pure ? { endRules: false as const } : {}),
  });
  const out: ValidateJobResult = {
    id: job.id,
    result: g.result,
    termination: g.termination,
    plies: g.moves.length,
    ms: performance.now() - t0,
    ...(job.quality ? { quality: gameQuality(g) } : {}),
    ...(job.quality && job.analyseNodes
      ? {
          lichess: await lichessQuality(
            g,
            stockfish,
            job.analyseNodes,
            balance.blunderCheck.winChanceK,
          ),
        }
      : {}),
  };
  parentPort!.postMessage(out);
});

parentPort!.postMessage("ready");
