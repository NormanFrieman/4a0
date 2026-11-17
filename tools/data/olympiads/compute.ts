/**
 * Card numbers from the parsed sources (plano-dados.md, "Força de jogo sem
 * performance oficial" and "Decisividade"). Pure functions.
 */
import { dp } from "./dp.ts";
import { TITLE_RANK, type EloEntry, type TitleEntry } from "./wikidata.ts";

/**
 * Window around the edition for the card's FIDE list (user decision,
 * 2026-11-16): Wikidata's lists start in July 1971, and some players have
 * gaps. A data-source rule, not a game balance number.
 */
export const ELO_WINDOW_MONTHS = 24;

/** ISO date (first of the month) `months` after `date`; negative goes back. */
export function addMonths(date: string, months: number): string {
  const [y, m] = date.split("-").map(Number) as [number, number];
  const total = y * 12 + (m - 1) + months;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}-01`;
}

/**
 * FIDE list of a card: the latest one on or before `start` (ISO) if it is at
 * most `ELO_WINDOW_MONTHS` old; otherwise the first one at most that many
 * months after; otherwise null.
 */
export function eloAt(elo: readonly EloEntry[], start: string): EloEntry | null {
  const oldest = addMonths(start, -ELO_WINDOW_MONTHS);
  const newest = addMonths(start, ELO_WINDOW_MONTHS);
  let before: EloEntry | null = null;
  let after: EloEntry | null = null;
  for (const e of elo) {
    if (e.date <= start) {
      if (e.date >= oldest && (!before || e.date > before.date)) before = e;
    } else if (e.date <= newest && (!after || e.date < after.date)) after = e;
  }
  return before ?? after;
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
