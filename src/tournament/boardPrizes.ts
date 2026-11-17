/**
 * Individual prizes (GDD §5.3): the best performance on each board, among
 * every card that played it (user and field) with at least
 * `boardPrizeMinGames` games. Pure and deterministic.
 */
import { balance } from "../config/balance.ts";
import type { Dataset } from "../data/dataset.ts";
import { approxPerformance } from "../sim/elo.ts";
import { firstIsWhite } from "../sim/match.ts";
import type { TournamentState } from "./tournament.ts";

export interface BoardPrize {
  board: number;
  cardId: string;
  /** Team the card played for (`USER_ID` or a field team id). */
  entrantId: string;
  points: number;
  games: number;
  /** Mean strength of the opponents (GDD §6.1). */
  avgOpponent: number;
  performance: number;
}

interface Line {
  board: number;
  cardId: string;
  entrantId: string;
  points: number;
  opponents: number[];
}

/** One prize per board that has an eligible card, board order. */
export function boardPrizes(ds: Dataset, t: TournamentState): BoardPrize[] {
  // By team and board, not by card: the same card can play for both teams (GDD §5.1).
  const lines = new Map<string, Line>();
  const add = (entrantId: string, board: number, cardId: string, points: number, opp: string) => {
    const k = `${entrantId}/${board}`;
    const l = lines.get(k) ?? { board, cardId, entrantId, points: 0, opponents: [] };
    l.points += points;
    l.opponents.push(ds.card(opp).strength);
    lines.set(k, l);
  };
  for (const r of t.rounds)
    for (const m of r.results)
      for (const b of m.boards) {
        const [white, black] = firstIsWhite(b.board) ? [m.first, m.second] : [m.second, m.first];
        add(white, b.board, b.whiteCardId, b.score, b.blackCardId);
        add(black, b.board, b.blackCardId, 1 - b.score, b.whiteCardId);
      }

  const eligible = [...lines.values()]
    .filter((l) => l.opponents.length >= balance.tournament.boardPrizeMinGames)
    .map((l): BoardPrize => ({
      board: l.board,
      cardId: l.cardId,
      entrantId: l.entrantId,
      points: l.points,
      games: l.opponents.length,
      avgOpponent: Math.round(l.opponents.reduce((s, x) => s + x, 0) / l.opponents.length),
      performance: approxPerformance(l.opponents, l.points, l.opponents.length)!,
    }));

  const prizes: BoardPrize[] = [];
  const boards = [...new Set(eligible.map((p) => p.board))].sort((a, b) => a - b);
  for (const board of boards) {
    const best = eligible
      .filter((p) => p.board === board)
      .sort(
        (a, b) =>
          b.performance - a.performance ||
          b.points - a.points ||
          b.avgOpponent - a.avgOpponent ||
          ds.card(a.cardId).personId.localeCompare(ds.card(b.cardId).personId) ||
          a.entrantId.localeCompare(b.entrantId),
      )[0]!;
    prizes.push(best);
  }
  return prizes;
}
