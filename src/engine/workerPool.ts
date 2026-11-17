import type { GameRecord, PlayedMove } from "./game.ts";
import type { GameJob, GameSimulator } from "./types.ts";
import { MaiaWorkerClient } from "./workerClient.ts";
import type { InitOptions, ReadyInfo } from "./workerProtocol.ts";

const cores = () => (typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 2 : 2);

/** At most one worker per board of a round. */
const MAX_WORKERS = 4;

/**
 * Workers for a machine with `n` logical cores: one per board, leaving a core
 * for the UI. Each worker's Stockfish runs between Maia's inferences, never at
 * the same time (`BlunderCheckedAI`), so it doesn't need a core of its own.
 */
export function poolSizeFor(n: number): number {
  return Math.max(1, Math.min(MAX_WORKERS, n - 1));
}

/** ORT threads per worker, splitting the cores among the workers. */
export function threadsPerWorkerFor(n: number, size: number): number {
  return Math.max(1, Math.floor(n / size));
}

/** Default pool size for this device. */
export function defaultPoolSize(): number {
  return poolSizeFor(cores());
}

/** ORT threads per worker for this device. */
export function defaultThreadsPerWorker(size: number): number {
  return threadsPerWorkerFor(cores(), size);
}

/**
 * Several Maia workers, one ONNX session each, so the 4
 * games of a round run in parallel (GDD §8.3). Each game goes to the least
 * busy worker. Results don't depend on which worker plays a game.
 */
export class MaiaWorkerPool implements GameSimulator {
  private readonly clients: MaiaWorkerClient[];
  private readonly busy: number[];

  constructor(
    size = defaultPoolSize(),
    private readonly threadsPerWorker = defaultThreadsPerWorker(size),
  ) {
    this.clients = Array.from({ length: size }, () => new MaiaWorkerClient());
    this.busy = this.clients.map(() => 0);
  }

  get size() {
    return this.clients.length;
  }

  get threads() {
    return this.threadsPerWorker;
  }

  /** Load the model in every worker. The first download fills the cache for the others. */
  async init(
    options: Omit<InitOptions, "numThreads">,
    onProgress?: (loaded: number, total: number) => void,
  ): Promise<ReadyInfo> {
    const opts = { ...options, numThreads: this.threadsPerWorker };
    const first = await this.clients[0]!.init(opts, onProgress);
    await Promise.all(this.clients.slice(1).map((c) => c.init(opts)));
    return first;
  }

  async playGame(job: GameJob, onMove?: (move: PlayedMove) => void): Promise<GameRecord> {
    return (await this.playGameWithStats(job, onMove)).record;
  }

  async playGameWithStats(job: GameJob, onMove?: (move: PlayedMove) => void) {
    const i = this.busy.indexOf(Math.min(...this.busy));
    this.busy[i]!++;
    try {
      return await this.clients[i]!.playGameWithStats(job, onMove);
    } finally {
      this.busy[i]!--;
    }
  }

  dispose() {
    for (const c of this.clients) c.dispose();
  }
}
