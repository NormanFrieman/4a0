/**
 * Stockfish over UCI (GDD §8.1), as a deterministic `PositionEvaluator`.
 * Transport-agnostic: Node feeds it the `stockfish` package's engine, the
 * browser a Web Worker running the same build.
 */
import type { Analysis, PositionEvaluator, Score } from "./types.ts";

export interface UciTransport {
  send(command: string): void;
  /** Register the single listener for engine output lines. */
  onLine(listener: (line: string) => void): void;
}

/** Score of a UCI `info` line, or null when it has none. */
export function parseScore(line: string): Score | null {
  const m = / score (cp|mate) (-?\d+)/.exec(line);
  if (!m) return null;
  const n = Number(m[2]);
  return m[1] === "cp" ? { cp: n } : { mate: n };
}

export class UciEvaluator implements PositionEvaluator {
  private waiter: ((line: string) => void) | null = null;
  /** Searches run one at a time, in call order. */
  private queue: Promise<unknown> = Promise.resolve();

  private constructor(private readonly transport: UciTransport) {
    transport.onLine((line) => this.waiter?.(line));
  }

  /** Start the engine: UCI handshake, one thread, fixed hash. */
  static async create(transport: UciTransport, hashMb = 1): Promise<UciEvaluator> {
    const ev = new UciEvaluator(transport);
    await ev.command("uci", (l) => l === "uciok");
    transport.send("setoption name Threads value 1");
    transport.send(`setoption name Hash value ${hashMb}`);
    await ev.command("isready", (l) => l === "readyok");
    return ev;
  }

  /** Send a command and collect output lines until `done` matches. */
  private command(cmd: string, done: (line: string) => boolean): Promise<string[]> {
    return new Promise((resolve) => {
      const lines: string[] = [];
      this.waiter = (line) => {
        lines.push(line);
        if (done(line)) {
          this.waiter = null;
          resolve(lines);
        }
      };
      this.transport.send(cmd);
    });
  }

  analyse(fen: string, opts: { nodes: number; onlyMove?: string }): Promise<Analysis> {
    const run = async (): Promise<Analysis> => {
      // A fresh hash for every search keeps results independent of history.
      // UCI commands run in order, so no `isready` round trip is needed.
      this.transport.send("ucinewgame");
      this.transport.send(`position fen ${fen}`);
      const only = opts.onlyMove ? ` searchmoves ${opts.onlyMove}` : "";
      const lines = await this.command(`go nodes ${opts.nodes}${only}`, (l) =>
        l.startsWith("bestmove"),
      );
      let score: Score | null = null;
      for (const l of lines) {
        if (l.startsWith("info") && !l.includes(" lowerbound") && !l.includes(" upperbound")) {
          score = parseScore(l) ?? score;
        }
      }
      const best = lines[lines.length - 1]!.split(" ")[1];
      return {
        score: score ?? { cp: 0 },
        bestMove: best && best !== "(none)" ? best : null,
      };
    };
    const result = this.queue.then(run);
    this.queue = result.catch(() => undefined);
    return result;
  }
}
