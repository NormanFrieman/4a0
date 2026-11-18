/**
 * Archive of the user's games (GDD §3.8): enough to replay them and export PGN.
 * Kept compact (SAN only) so it fits the local save; positions are rebuilt
 * with chess.js.
 */
import { Chess } from "chess.js";
import type { GameRecord, GameResult, Termination } from "../engine/game.ts";
import type { Score } from "../engine/types.ts";
import type { Pairing } from "../tournament/types.ts";
import { firstIsWhite, type BoardGame } from "./match.ts";

export interface ArchivedGame {
  round: number;
  board: number;
  whiteCardId: string;
  blackCardId: string;
  /** Tournament entrant ids (the user's or a field team). */
  whiteTeamId: string;
  blackTeamId: string;
  result: GameResult;
  termination: Termination;
  san: string[];
  /** Book moves at the start of the game. */
  bookPlies: number;
  /**
   * Per ply, the evaluation after the move from White's point of view, for
   * the evaluation bar (GDD §8.6); null where none was measured. Absent when
   * no ply was checked.
   */
  evals?: (Score | null)[];
}

export const archiveKey = (round: number, board: number) => `r${round}b${board}`;

/** Archive one finished game. Teams are told apart by board, never by card (GDD §5.1). */
export function archiveGame(
  round: number,
  pairing: Pairing,
  game: BoardGame,
  rec: GameRecord,
): ArchivedGame {
  const w = firstIsWhite(game.board);
  const firstBook = rec.moves.findIndex((m) => m.source !== "book");
  // The next move's fresh search of the position beats the mover's estimate.
  const evals = rec.moves.map((m, i) => rec.moves[i + 1]?.evalBefore ?? m.eval ?? null);
  return {
    round,
    board: game.board,
    whiteCardId: game.whiteCardId,
    blackCardId: game.blackCardId,
    whiteTeamId: w ? pairing.first : pairing.second,
    blackTeamId: w ? pairing.second : pairing.first,
    result: rec.result,
    termination: rec.termination,
    san: rec.moves.map((m) => m.san),
    bookPlies: firstBook === -1 ? rec.moves.length : firstBook,
    ...(evals.some((e) => e) ? { evals } : {}),
  };
}

export interface ReplayPosition {
  fen: string;
  /** The move that led here (absent for the start position). */
  san?: string;
  from?: string;
  to?: string;
}

/** Start position plus one position per move. */
export function replayPositions(san: readonly string[]): ReplayPosition[] {
  const chess = new Chess();
  const out: ReplayPosition[] = [{ fen: chess.fen() }];
  for (const s of san) {
    const m = chess.move(s);
    out.push({ fen: chess.fen(), san: m.san, from: m.from, to: m.to });
  }
  return out;
}
