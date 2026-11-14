/** Scoring and standings (GDD §5.3). */
import { balance } from "../config/balance.ts";
import type { Medal } from "../data/types.ts";
import type { MatchResult } from "./types.ts";

export function matchPointsFor(own: number, other: number): number {
  const mp = balance.tournament.matchPoints;
  return own > other ? mp.win : own < other ? mp.loss : mp.draw;
}

export interface StandingRow {
  teamId: string;
  rank: number;
  matchPoints: number;
  gamePoints: number;
  /** Sum of the opponents' match points. */
  buchholz: number;
  played: number;
  medal: Medal | null;
}

const MEDALS: Medal[] = ["gold", "silver", "bronze"];

/** Ranking: match points → game points → Buchholz → head-to-head → id. */
export function standings(
  teamIds: readonly string[],
  results: readonly MatchResult[],
): StandingRow[] {
  const mp = new Map(teamIds.map((id) => [id, 0]));
  const gp = new Map(teamIds.map((id) => [id, 0]));
  const played = new Map(teamIds.map((id) => [id, 0]));
  const opponents = new Map<string, string[]>(teamIds.map((id) => [id, []]));
  const h2h = new Map<string, number>(); // "a>b" → match points of a vs b

  for (const r of results) {
    const add = (m: Map<string, number>, id: string, v: number) => m.set(id, (m.get(id) ?? 0) + v);
    const a = matchPointsFor(r.firstPoints, r.secondPoints);
    const b = matchPointsFor(r.secondPoints, r.firstPoints);
    add(mp, r.first, a);
    add(mp, r.second, b);
    add(gp, r.first, r.firstPoints);
    add(gp, r.second, r.secondPoints);
    add(played, r.first, 1);
    add(played, r.second, 1);
    opponents.get(r.first)?.push(r.second);
    opponents.get(r.second)?.push(r.first);
    h2h.set(`${r.first}>${r.second}`, (h2h.get(`${r.first}>${r.second}`) ?? 0) + a);
    h2h.set(`${r.second}>${r.first}`, (h2h.get(`${r.second}>${r.first}`) ?? 0) + b);
  }

  const buchholz = (id: string) => opponents.get(id)!.reduce((s, o) => s + (mp.get(o) ?? 0), 0);
  const rows = teamIds.map((id) => ({
    teamId: id,
    matchPoints: mp.get(id)!,
    gamePoints: gp.get(id)!,
    buchholz: buchholz(id),
    played: played.get(id)!,
  }));
  rows.sort(
    (x, y) =>
      y.matchPoints - x.matchPoints ||
      y.gamePoints - x.gamePoints ||
      y.buchholz - x.buchholz ||
      (h2h.get(`${y.teamId}>${x.teamId}`) ?? 0) - (h2h.get(`${x.teamId}>${y.teamId}`) ?? 0) ||
      x.teamId.localeCompare(y.teamId),
  );
  return rows.map((r, i) => ({
    ...r,
    rank: i + 1,
    medal: i < balance.tournament.medalPlaces ? (MEDALS[i] ?? null) : null,
  }));
}
