import type { GameRecord, PlayedMove } from "./game.ts";

/**
 * Engine interface (GDD §12.3). All game code depends on `ChessAI`, never on
 * Maia directly, so the model can be swapped or run in the browser.
 */

export interface MoveRequest {
  fen: string;
  /** Up to 8 previous UCI moves, oldest first, leading to `fen`. */
  priorMoves: string[];
  /**
   * Position before the first of `priorMoves`. Needed because only the last
   * 8 moves are sent; defaults to the standard start position.
   * (Addition to GDD §10.3.)
   */
  baseFen?: string;
  /** Effective rating (600–2600). */
  selfElo: number;
  oppoElo: number;
  temperature: number;
  topP: number;
  /** Seeded generator, for reproducibility. */
  rng: () => number;
}

export interface MoveResult {
  /** UCI */
  move: string;
  /** Legal UCI move → model probability (before temperature/top-p). */
  policy: Record<string, number>;
  /** Win/draw/loss from the side to move's point of view. */
  wdl: [number, number, number];
}

export interface ChessAI {
  chooseMove(req: MoveRequest): Promise<MoveResult>;
}

/** Engine score from the side to move's point of view: centipawns or mate in N moves. */
export type Score = { cp: number } | { mate: number };

export interface Analysis {
  score: Score;
  /** UCI, or null when the engine had no move to give. */
  bestMove: string | null;
}

/**
 * Tactical evaluator for the blunder check (GDD §8.1), backed by Stockfish.
 * Must be deterministic: same position and options, same answer.
 */
export interface PositionEvaluator {
  /** Search `fen` with a node budget; with `onlyMove`, search only that move. */
  analyse(fen: string, opts: { nodes: number; onlyMove?: string }): Promise<Analysis>;
}

/** One side of a game, with engine parameters already converted (GDD §6.2). */
export interface GameSide {
  name?: string;
  selfElo: number;
  temperature: number;
  topP: number;
  /**
   * Opening book as raw Polyglot bytes (GDD §7.1). Plain bytes so the job
   * crosses `postMessage` to the worker unchanged.
   */
  book?: Uint8Array;
}

export interface GameJob {
  white: GameSide;
  black: GameSide;
  seed: string | number;
  maxPlies?: number;
  /** Extra PGN headers (Event, Round, Board…). */
  headers?: Record<string, string>;
}

/**
 * Plays full games (GDD §12.3). Tournament code depends on this, never on
 * Maia: the browser uses the Maia worker, tests use a fake `ChessAI`.
 * Card → `GameSide` conversion lives with the cards (Phase 1).
 */
export interface GameSimulator {
  playGame(job: GameJob, onMove?: (move: PlayedMove) => void): Promise<GameRecord>;
}
