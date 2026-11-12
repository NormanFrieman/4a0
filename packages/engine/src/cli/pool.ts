import { availableParallelism } from "node:os";
import { Worker } from "node:worker_threads";
import { ensureModel, type Maia3Variant } from "../node.ts";
import type { ValidateJob, ValidateJobResult } from "./validateWorker.ts";

export const defaultWorkers = () => Math.max(1, availableParallelism() - 2);

/**
 * Play many AI-vs-AI games in parallel worker threads (one ORT thread each).
 * The model is resolved/downloaded once here so workers never race on it.
 */
export async function runGames(
  jobs: ValidateJob[],
  opts: { variant: Maia3Variant; workers: number },
): Promise<ValidateJobResult[]> {
  const modelPath = await ensureModel(opts.variant);
  const results: ValidateJobResult[] = [];
  if (jobs.length === 0) return results;
  const t0 = performance.now();

  // Workers don't inherit tsx's loader; register it before importing the TS worker.
  const workerUrl = new URL("./validateWorker.ts", import.meta.url);
  const bootstrap = `import { register } from ${JSON.stringify(import.meta.resolve("tsx/esm/api"))};
register();
await import(${JSON.stringify(workerUrl.href)});`;
  const bootstrapUrl = new URL(`data:text/javascript,${encodeURIComponent(bootstrap)}`);

  await new Promise<void>((resolveAll, reject) => {
    let next = 0;
    const workers: Worker[] = [];
    const feed = (w: Worker) => {
      if (next < jobs.length) w.postMessage(jobs[next++]);
    };
    for (let i = 0; i < Math.min(opts.workers, jobs.length); i++) {
      const w = new Worker(bootstrapUrl, { workerData: { modelPath } });
      workers.push(w);
      w.on("error", (err) => {
        for (const x of workers) void x.terminate();
        reject(err);
      });
      w.on("message", (msg: ValidateJobResult | "ready") => {
        if (msg !== "ready") {
          results.push(msg);
          const done = results.length;
          if (done % 20 === 0 || done === jobs.length) {
            const elapsed = (performance.now() - t0) / 1000;
            const eta = (elapsed / done) * (jobs.length - done);
            console.error(`  ${done}/${jobs.length} · ${elapsed.toFixed(0)}s · eta ${eta.toFixed(0)}s`);
          }
          if (done === jobs.length) {
            for (const x of workers) void x.terminate();
            resolveAll();
            return;
          }
        }
        feed(w);
      });
    }
  });
  return results;
}
