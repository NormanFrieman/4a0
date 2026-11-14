/**
 * Engine interface (GDD §10.3). All game code depends on `ChessAI`, never on
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
