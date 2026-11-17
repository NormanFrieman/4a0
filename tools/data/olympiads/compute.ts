/**
 * Card numbers from the parsed sources (plano-dados.md, "Força de jogo sem
 * performance oficial" and "Decisividade"). Pure functions.
 */
import { dp } from "./dp.ts";
import { TITLE_RANK, type EloEntry, type TitleEntry } from "./wikidata.ts";

/** Latest FIDE list dated on or before `date` (ISO), or null. */
export function eloAt(elo: readonly EloEntry[], date: string): EloEntry | null {
  let best: EloEntry | null = null;
  for (const e of elo) if (e.date <= date && (!best || e.date > best.date)) best = e;
  return best;
}

const titleRank = (qid: string) => TITLE_RANK.findIndex((t) => t.qid === qid);

/**
 * Strongest title held in `year`: awarded that year or before, or with no
 * date (plano-dados.md: without a date, the highest known title counts).
 * `year` null: the strongest title ever.
 */
export function titleAt(titles: readonly TitleEntry[], year: number | null): string {
  let best = -1;
  for (const t of titles) {
    const r = titleRank(t.qid);
    if (r < 0 || (year !== null && t.year !== null && t.year > year)) continue;
    if (best < 0 || r < best) best = r;
  }
  return best < 0 ? "" : TITLE_RANK[best]!.title;
}

/**
 * Approximate performance: mean rating of the opponents + dp(score
 * fraction). null without games or without any rated opponent.
 */
export function approxPerformance(
  opponentRatings: readonly number[],
  points: number,
  games: number,
): number | null {
  if (games <= 0 || opponentRatings.length === 0) return null;
  const mean = opponentRatings.reduce((a, b) => a + b, 0) / opponentRatings.length;
  return Math.round(mean + dp(points / games));
}

/** GDD §7.2: 1 − draw rate. null without games. */
export function decisiveness(wins: number, draws: number, losses: number): number | null {
  const games = wins + draws + losses;
  return games > 0 ? Math.round((1 - draws / games) * 1000) / 1000 : null;
}

/**
 * Rating that a board-`board` player met in a match against a team: the
 * rating of the opponent's player on the same board, or the mean of its
 * rated boards 1–4 when that one is unrated; null when none is rated.
 */
export function opponentRating(
  boardRatings: readonly (number | null)[],
  board: number,
): number | null {
  const same = boardRatings[board - 1];
  if (same != null) return same;
  const rated = boardRatings.filter((r): r is number => r != null);
  return rated.length ? Math.round(rated.reduce((a, b) => a + b, 0) / rated.length) : null;
}
