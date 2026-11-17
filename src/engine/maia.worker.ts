/// <reference lib="webworker" />
/**
 * Web Worker running Maia-3 (maia3-js + onnxruntime-web), so games are
 * computed without blocking the UI (GDD §8). Games run one at a time, in the
 * order received, on a single ONNX session.
 */
import { ensureModelWeb, Maia3 } from "maia3-js/web";
import { BlunderCheckedAI } from "./blunderCheck.ts";
import { LocalGameSimulator } from "./localSimulator.ts";
import { Maia3Engine } from "./maia3.ts";
import { UciEvaluator } from "./stockfish.ts";
import type { ChessAI } from "./types.ts";
import type { InitOptions, WorkerRequest, WorkerResponse } from "./workerProtocol.ts";

declare const self: DedicatedWorkerGlobalScope;

const post = (msg: WorkerResponse) => self.postMessage(msg);

let simulator: LocalGameSimulator | null = null;
let latencies: number[] = [];
/** Serializes jobs: one ONNX session, one game at a time. */
let queue: Promise<void> = Promise.resolve();

async function init(options: InitOptions) {
  const t0 = performance.now();
  const bytes = await ensureModelWeb({
    variant: options.variant,
    ...(options.modelUrl ? { url: options.modelUrl } : {}),
    onProgress: (loaded, total) => post({ type: "progress", loaded, total }),
  });
  const downloadMs = performance.now() - t0;
  const t1 = performance.now();
  const maia = new Maia3({
    variant: options.variant,
    modelBytes: bytes,
    executionProviders: options.forceWasm ? ["wasm"] : ["webgpu", "wasm"],
    ...(options.numThreads ? { numThreads: options.numThreads } : {}),
    ...(options.wasmPaths ? { wasmPaths: options.wasmPaths } : {}),
  });
  await maia.load();
  const maiaEngine = new Maia3Engine(maia);
  const engine: ChessAI = options.stockfishUrl
    ? new BlunderCheckedAI(maiaEngine, await startStockfish(options.stockfishUrl))
    : maiaEngine;
  const timed: ChessAI = {
    async chooseMove(req) {
      const t = performance.now();
      const r = await engine.chooseMove(req);
      latencies.push(performance.now() - t);
      return r;
    },
  };
  simulator = new LocalGameSimulator(timed);
  post({
    type: "ready",
    info: {
      downloadMs: Math.round(downloadMs),
      initMs: Math.round(performance.now() - t1),
      modelBytes: bytes.byteLength,
      crossOriginIsolated: self.crossOriginIsolated,
    },
  });
}

/** Stockfish in a nested classic Worker, speaking UCI over postMessage. */
function startStockfish(url: string): Promise<UciEvaluator> {
  const sf = new Worker(url);
  const failed = new Promise<never>((_, reject) => {
    sf.onerror = (ev) => {
      ev.preventDefault();
      reject(new Error(`Stockfish worker failed (${url}): ${ev.message || "load error"}`));
    };
  });
  return Promise.race([
    UciEvaluator.create({
      send: (cmd) => sf.postMessage(cmd),
      onLine: (listener) => {
        sf.onmessage = (ev: MessageEvent<string>) => listener(ev.data);
      },
    }),
    failed,
  ]);
}

self.addEventListener("message", (ev: MessageEvent<WorkerRequest>) => {
  const msg = ev.data;
  queue = queue.then(async () => {
    try {
      if (msg.type === "init") return await init(msg.options);
      if (!simulator) throw new Error("Worker not initialized");
      latencies = [];
      const record = await simulator.playGame(
        msg.job,
        msg.streamMoves ? (move) => post({ type: "move", id: msg.id, move }) : undefined,
      );
      post({ type: "done", id: msg.id, record, latenciesMs: latencies });
    } catch (err) {
      post({
        type: "error",
        ...(msg.type === "play" ? { id: msg.id } : {}),
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });
});
