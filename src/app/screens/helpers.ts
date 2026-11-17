import { traitOf } from "../../data/cardStrength.ts";
import type { TFunction } from "i18next";
import type { Dataset } from "../../data/dataset.ts";
import type { ArchivedGame } from "../../sim/gameArchive.ts";
import { campaignPgn, gamePgn, type PgnContext } from "../../sim/pgn.ts";
import { downloadText } from "../download.ts";
import { firstIsWhite } from "../../sim/match.ts";
import { USER_ID, currentStandings, type TournamentState } from "../../tournament/tournament.ts";
import type { ShareSummary } from "../../share/text.ts";
import { modeParam, type Mode } from "../state/mode.ts";
import type { MatchResult } from "../../tournament/types.ts";

export interface TeamLabel {
  name: string;
  countryCode: string | null;
  year: number | null;
  isUser: boolean;
}

/** Display name of a tournament entrant; `userName` comes from i18n. */
export function teamLabel(ds: Dataset, id: string, userName: string): TeamLabel {
  if (id === USER_ID) return { name: userName, countryCode: null, year: null, isUser: true };
  const t = ds.team(id);
  return {
    name: `${t.countryName} ${t.year}`,
    countryCode: t.countryCode,
    year: t.year,
    isUser: false,
  };
}

export function cardView(ds: Dataset, id: string) {
  const card = ds.card(id);
  const person = ds.person(card.personId);
  const team = ds.team(card.teamId);
  return {
    card,
    person,
    team,
    name: person.name,
    trait: traitOf(person.decisiveness),
  };
}

/** The user's points in a match. */
export const userPointsIn = (m: MatchResult) =>
  m.first === USER_ID ? m.firstPoints : m.second === USER_ID ? m.secondPoints : null;

export const opponentIn = (m: MatchResult) => (m.first === USER_ID ? m.second : m.first);

/** User's match of each round, in order. */
export const userMatches = (t: TournamentState) =>
  t.rounds.flatMap((r) => r.results).filter((m) => m.first === USER_ID || m.second === USER_ID);

/** Points and games of each user card across the tournament. */
export function cardTotals(t: TournamentState): Map<string, { points: number; games: number }> {
  const user = t.entrants.find((e) => e.id === USER_ID)!;
  const totals = new Map(user.cardIds.map((id) => [id, { points: 0, games: 0 }]));
  for (const m of userMatches(t))
    for (const b of m.boards) {
      // By board, not by card: the same card can play for both teams (GDD §5.1).
      const white = (m.first === USER_ID) === firstIsWhite(b.board);
      const s = totals.get(white ? b.whiteCardId : b.blackCardId)!;
      s.points += white ? b.score : 1 - b.score;
      s.games++;
    }
  return totals;
}

/** Link that reproduces the session: `?seed=` and, in Mestre, `?modo=`. */
export function sessionUrl(seed: string, mode: Mode = "classic"): string {
  const p = new URLSearchParams({ seed });
  const m = modeParam(mode);
  if (m) p.set("modo", m);
  return `${location.origin}${location.pathname}?${p}`;
}

/** What the share text and image show about the finished tournament. */
export function shareSummary(
  ds: Dataset,
  t: TournamentState,
  mode: Mode,
  url: string,
): ShareSummary {
  const row = currentStandings(t).find((r) => r.teamId === USER_ID)!;
  const user = t.entrants.find((e) => e.id === USER_ID)!;
  return {
    mode,
    medal: row.medal,
    place: row.rank,
    matchPoints: row.matchPoints,
    gamePoints: row.gamePoints,
    players: user.cardIds.map((id, i) => {
      const { name, team } = cardView(ds, id);
      return {
        board: i + 1,
        name,
        countryCode: team.countryCode,
        countryName: team.countryName,
        year: team.year,
      };
    }),
    rounds: userMatches(t).map((m) => {
      const own = userPointsIn(m)!;
      return { round: m.round, own, other: m.first === USER_ID ? m.secondPoints : m.firstPoints };
    }),
    url,
  };
}

/** PGN context of the session: texts from i18n, names from the dataset. */
export function pgnContext(ds: Dataset, seed: string, t: TFunction): PgnContext {
  return {
    event: t("pgn.event"),
    site: sessionUrl(seed),
    date: new Date(),
    seed,
    playerName: (id) => {
      const v = cardView(ds, id);
      return `${v.name} (${v.team.year})`;
    },
    teamName: (id) => teamLabel(ds, id, t("round.you")).name,
    terminationLabel: (x) => t(`termination.${x}`),
    bookComment: t("pgn.book"),
  };
}

/** The user's games in round and board order. */
export const sortedGames = (games: Record<string, ArchivedGame>) =>
  Object.values(games).sort((a, b) => a.round - b.round || a.board - b.board);

export function downloadGame(ds: Dataset, seed: string, t: TFunction, g: ArchivedGame) {
  downloadText(
    `4a0-${seed}-r${g.round}-m${g.board}.pgn`,
    `${gamePgn(g, pgnContext(ds, seed, t))}\n`,
  );
}

export function downloadCampaign(
  ds: Dataset,
  seed: string,
  t: TFunction,
  games: Record<string, ArchivedGame>,
) {
  downloadText(`4a0-${seed}.pgn`, campaignPgn(sortedGames(games), pgnContext(ds, seed, t)));
}
