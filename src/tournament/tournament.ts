/**
 * Tournament flow (GDD §5): entrants, round-by-round pairing, field matches
 * by quick simulation, results. Pure; the user's match is played by the
 * caller (engine or quick simulation) and recorded with `recordRound`.
 */
import { avgStrength } from "../data/cardStrength.ts";
import type { Dataset } from "../data/dataset.ts";
import { quickMatch } from "../sim/match.ts";
import { buildField, fieldSizeOf, type FieldConfig } from "./field.ts";
import { pairRound, playedKey } from "./pairing.ts";
import { standings, type StandingRow } from "./standings.ts";
import type { Entrant, MatchResult, Pairing } from "./types.ts";

export const USER_ID = "user";

export interface RoundState {
  round: number;
  pairings: Pairing[];
  /** Empty until the round is recorded. */
  results: MatchResult[];
}

export interface TournamentState {
  seed: string;
  totalRounds: number;
  entrants: Entrant[];
  rounds: RoundState[];
}

export function startTournament(
  ds: Dataset,
  seed: string,
  userCardIds: readonly string[],
  field: FieldConfig,
  totalRounds: number,
): TournamentState {
  if (totalRounds > fieldSizeOf(field)) throw new Error("Tournament: more rounds than opponents");
  const user: Entrant = {
    id: USER_ID,
    isUser: true,
    cardIds: [...userCardIds],
    avgStrength: avgStrength(userCardIds.map((id) => ds.card(id).strength)),
  };
  return {
    seed,
    totalRounds,
    entrants: [user, ...buildField(ds, seed, field)],
    rounds: [],
  };
}

const allResults = (s: TournamentState) => s.rounds.flatMap((r) => r.results);

export const currentRound = (s: TournamentState): RoundState | undefined => s.rounds.at(-1);

export const isFinished = (s: TournamentState) =>
  s.rounds.length === s.totalRounds && (currentRound(s)?.results.length ?? 0) > 0;

export function currentStandings(s: TournamentState): StandingRow[] {
  return standings(
    s.entrants.map((e) => e.id),
    allResults(s),
  );
}

/** Pairs the next round. */
export function pairNextRound(s: TournamentState): TournamentState {
  const cur = currentRound(s);
  if (cur && cur.results.length === 0) throw new Error("Tournament: current round not played");
  if (s.rounds.length >= s.totalRounds) throw new Error("Tournament: finished");
  const round = s.rounds.length + 1;
  const rows = new Map(currentStandings(s).map((r) => [r.teamId, r]));
  const played = new Set(allResults(s).map((r) => playedKey(r.first, r.second)));
  const firstCount = new Map<string, number>();
  for (const r of allResults(s)) firstCount.set(r.first, (firstCount.get(r.first) ?? 0) + 1);
  const pairings = pairRound(
    s.entrants.map((e) => ({
      id: e.id,
      matchPoints: rows.get(e.id)!.matchPoints,
      gamePoints: rows.get(e.id)!.gamePoints,
      avgStrength: e.avgStrength,
      firstCount: firstCount.get(e.id) ?? 0,
    })),
    played,
    round,
    s.totalRounds - round,
  );
  return { ...s, rounds: [...s.rounds, { round, pairings, results: [] }] };
}

export const entrant = (s: TournamentState, id: string) => s.entrants.find((e) => e.id === id)!;

/** The user's pairing in the current round. */
export function userPairing(s: TournamentState): Pairing {
  const p = currentRound(s)?.pairings.find((x) => x.first === USER_ID || x.second === USER_ID);
  if (!p) throw new Error("Tournament: no user pairing");
  return p;
}

export const opponentOf = (p: Pairing) => (p.first === USER_ID ? p.second : p.first);

/** Lineups of a pairing: every team plays its 4 cards in board order (GDD §4.3). */
export function lineups(s: TournamentState, p: Pairing): { first: string[]; second: string[] } {
  return { first: entrant(s, p.first).cardIds, second: entrant(s, p.second).cardIds };
}

/** Quick-simulated results of every match of the current round except the user's. */
export function fieldResults(ds: Dataset, s: TournamentState): MatchResult[] {
  const cur = currentRound(s)!;
  return cur.pairings
    .filter((p) => p.first !== USER_ID && p.second !== USER_ID)
    .map((p) => {
      const l = lineups(s, p);
      return quickMatch(ds, s.seed, cur.round, p, l.first, l.second);
    });
}

/** Stores the current round's results (user's match + field). */
export function recordRound(s: TournamentState, results: MatchResult[]): TournamentState {
  const cur = currentRound(s);
  if (!cur || cur.results.length > 0) throw new Error("Tournament: nothing to record");
  if (results.length !== cur.pairings.length) throw new Error("Tournament: missing results");
  return { ...s, rounds: [...s.rounds.slice(0, -1), { ...cur, results }] };
}
