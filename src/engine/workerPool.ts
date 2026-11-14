import type { GameRecord, PlayedMove } from "./game.ts";
import type { GameJob, GameSimulator } from "./types.ts";
import { MaiaWorkerClient } from "./workerClient.ts";
import type { InitOptions, ReadyInfo } from "./workerProtocol.ts";

const cores = () => (typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 2 : 2);

/** Default pool size: one worker per board, bounded by the CPU. */
export function defaultPoolSize(): number {
  return Math.max(1, Math.min(4, cores() - 1));
}

/** ORT threads per worker so the pool uses the cores without oversubscribing them. */
export function defaultThreadsPerWorker(size: number): number {
  return Math.max(1, Math.floor(cores() / size));
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
