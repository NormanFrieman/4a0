import { parentPort, workerData } from "node:worker_threads";
import { playGame } from "../../../src/engine/game.ts";
import { createNodeMaia3Engine } from "../node.ts";

export interface ValidateJob {
  id: number;
  seed: string;
  white: { elo: number; temperature: number };
  black: { elo: number; temperature: number };
  topP: number;
  /** Disable draw by agreement and resignation (GDD §8.2). */
  pure?: boolean;
}

export interface ValidateJobResult {
  id: number;
  result: "1-0" | "0-1" | "1/2-1/2";
  termination: string;
  plies: number;
  ms: number;
}

const { modelPath } = workerData as { modelPath: string };
// One ORT thread per worker: we parallelize across games instead.
const { engine } = await createNodeMaia3Engine({ modelPath, intraOpNumThreads: 1 });

parentPort!.on("message", async (job: ValidateJob) => {
  const t0 = performance.now();
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
  };
  parentPort!.postMessage(out);
});

parentPort!.postMessage("ready");
