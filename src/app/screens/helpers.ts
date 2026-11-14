import { traitOf } from "../../data/cardStrength.ts";
import type { Dataset } from "../../data/dataset.ts";
import { USER_ID, type TournamentState } from "../../tournament/tournament.ts";
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
      const asWhite = totals.get(b.whiteCardId);
      const asBlack = totals.get(b.blackCardId);
      if (asWhite) {
        asWhite.points += b.score;
        asWhite.games++;
      }
      if (asBlack) {
        asBlack.points += 1 - b.score;
        asBlack.games++;
      }
    }
  return totals;
}
