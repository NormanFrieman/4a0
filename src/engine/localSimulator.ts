import { playGame, type SideConfig } from "./game.ts";
import type { ChessAI, GameJob, GameSide, GameSimulator } from "./types.ts";

/** `GameSimulator` running in the current thread (Node CLIs, tests, the worker itself). */
export class LocalGameSimulator implements GameSimulator {
  constructor(private readonly ai: ChessAI) {}

  playGame(job: GameJob, onMove?: Parameters<GameSimulator["playGame"]>[1]) {
    const side = (s: GameSide): SideConfig => ({
      ai: this.ai,
      elo: s.selfElo,
      temperature: s.temperature,
      topP: s.topP,
      ...(s.name ? { name: s.name } : {}),
    });
    return playGame({
      white: side(job.white),
      black: side(job.black),
      seed: job.seed,
      ...(job.maxPlies !== undefined ? { maxPlies: job.maxPlies } : {}),
      ...(job.headers ? { headers: job.headers } : {}),
      ...(onMove ? { onMove } : {}),
    });
  }
}
