/**
 * Stockfish (stockfish.js, lite single-threaded WASM build) in Node, as the
 * blunder check's `PositionEvaluator` (GDD §8.1). Same build as the browser.
 *
 * It runs as a child process speaking UCI over stdio: inside a
 * `worker_threads` worker the build mistakes itself for one of its own
 * pthreads and never initializes, so it cannot be `require`d there.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createInterface } from "node:readline";
import { UciEvaluator } from "../../src/engine/stockfish.ts";

const require = createRequire(import.meta.url);

export const STOCKFISH_BUILD = "stockfish/bin/stockfish-18-lite-single.js";

export async function createNodeStockfish(): Promise<{
  evaluator: UciEvaluator;
  close: () => void;
}> {
  const child = spawn(process.execPath, [require.resolve(STOCKFISH_BUILD)], {
    stdio: ["pipe", "pipe", "inherit"],
  });
  const lines = createInterface({ input: child.stdout });
  let listener: (line: string) => void = () => {};
  lines.on("line", (l) => listener(l));
  const evaluator = await UciEvaluator.create({
    send: (cmd) => child.stdin.write(`${cmd}\n`),
    onLine: (l) => {
      listener = l;
    },
  });
  return { evaluator, close: () => child.kill() };
}
