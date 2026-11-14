import type { GameRecord, PlayedMove } from "./game.ts";
import type { GameJob, GameSimulator } from "./types.ts";
import type { InitOptions, ReadyInfo, WorkerRequest, WorkerResponse } from "./workerProtocol.ts";

interface Pending {
  resolve: (r: { record: GameRecord; latenciesMs: number[] }) => void;
  reject: (e: Error) => void;
  onMove?: (move: PlayedMove) => void;
}

/** Main-thread handle to the Maia worker. Implements `GameSimulator`. */
export class MaiaWorkerClient implements GameSimulator {
  private readonly worker: Worker;
  private nextId = 0;
  private readonly pending = new Map<number, Pending>();
  private ready: Promise<ReadyInfo> | null = null;
  private onProgress: ((loaded: number, total: number) => void) | undefined;
  private resolveReady: ((info: ReadyInfo) => void) | null = null;
  private rejectReady: ((e: Error) => void) | null = null;

  constructor() {
    this.worker = new Worker(new URL("./maia.worker.ts", import.meta.url), { type: "module" });
    this.worker.addEventListener("message", (ev: MessageEvent<WorkerResponse>) =>
      this.handle(ev.data),
    );
    this.worker.addEventListener("error", (ev) => this.failAll(new Error(ev.message)));
  }

  /** Download (or read from cache) and load the model. Safe to call more than once. */
  init(options: InitOptions, onProgress?: (loaded: number, total: number) => void) {
    this.onProgress = onProgress;
    this.ready ??= new Promise<ReadyInfo>((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
      this.send({ type: "init", options });
    });
    return this.ready;
  }

  async playGame(job: GameJob, onMove?: (move: PlayedMove) => void): Promise<GameRecord> {
    return (await this.playGameWithStats(job, onMove)).record;
  }

  /** Same as `playGame`, plus per-move engine latencies. */
  playGameWithStats(job: GameJob, onMove?: (move: PlayedMove) => void) {
    const id = this.nextId++;
    return new Promise<{ record: GameRecord; latenciesMs: number[] }>((resolve, reject) => {
      this.pending.set(id, { resolve, reject, ...(onMove ? { onMove } : {}) });
      this.send({ type: "play", id, job, streamMoves: !!onMove });
    });
  }

  dispose() {
    this.worker.terminate();
    this.failAll(new Error("Worker disposed"));
  }

  private send(msg: WorkerRequest) {
    this.worker.postMessage(msg);
  }

  private handle(msg: WorkerResponse) {
    switch (msg.type) {
      case "progress":
        this.onProgress?.(msg.loaded, msg.total);
        return;
      case "ready":
        this.resolveReady?.(msg.info);
        return;
      case "move":
        this.pending.get(msg.id)?.onMove?.(msg.move);
        return;
      case "done": {
        const p = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        p?.resolve({ record: msg.record, latenciesMs: msg.latenciesMs });
        return;
      }
      case "error": {
        const err = new Error(msg.message);
        if (msg.id === undefined) {
          this.ready = null;
          this.rejectReady?.(err);
          return;
        }
        const p = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        p?.reject(err);
      }
    }
  }

  private failAll(err: Error) {
    this.rejectReady?.(err);
    for (const p of this.pending.values()) p.reject(err);
    this.pending.clear();
  }
}
