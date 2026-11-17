import type { GameRecord, PlayedMove } from "./game.ts";
import type { GameJob } from "./types.ts";

export type MaiaVariant = "5m" | "23m";

export interface InitOptions {
  variant: MaiaVariant;
  /** Where to download the weights from (default: maia3-js's Hugging Face URL). */
  modelUrl?: string;
  /**
   * WASM only, no WebGPU: small numeric differences between backends can
   * change a move, so the app forces WASM to keep `?seed=` reproducible
   * (GDD §8.4).
   */
  forceWasm: boolean;
  /**
   * ORT WASM threads in this worker (default: maia3-js picks). The pool
   * splits the cores between its workers and parallelizes across games.
   */
  numThreads?: number;
  /** Where onnxruntime-web loads its .wasm files from. */
  wasmPaths?: string;
  /**
   * Stockfish worker script for the blunder check (GDD §8.1); its .wasm
   * must sit next to it. Absent = no check.
   */
  stockfishUrl?: string;
}

export interface ReadyInfo {
  downloadMs: number;
  initMs: number;
  modelBytes: number;
  crossOriginIsolated: boolean;
}

export type WorkerRequest =
  | { type: "init"; options: InitOptions }
  | { type: "play"; id: number; job: GameJob; streamMoves: boolean };

export type WorkerResponse =
  | { type: "progress"; loaded: number; total: number }
  | { type: "ready"; info: ReadyInfo }
  | { type: "move"; id: number; move: PlayedMove }
  | { type: "done"; id: number; record: GameRecord; latenciesMs: number[] }
  | { type: "error"; id?: number; message: string };
