/**
 * Swiss pairing (GDD §5.2). Round 1: by strength, top half vs bottom half.
 * Later rounds: score groups, top half vs bottom half inside the group, with
 * backtracking so a pairing without repeats is always found when one exists
 * (a greedy Swiss can get stuck, e.g. 8 teams over 7 rounds). Deterministic.
 */
import type { Pairing } from "./types.ts";

export interface PairingTeam {
  id: string;
  matchPoints: number;
  gamePoints: number;
  avgStrength: number;
  /** Times listed first (white on boards 1 and 3) so far. */
  firstCount: number;
}

const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** All perfect matchings of `ids` avoiding `played`, lazily, in index order. */
function* matchings(ids: readonly string[], played: ReadonlySet<string>): Generator<string[]> {
  if (ids.length === 0) {
    yield [];
    return;
  }
  const [a, ...rest] = ids as [string, ...string[]];
  for (const b of rest) {
    if (played.has(key(a, b))) continue;
    for (const m of matchings(
      rest.filter((x) => x !== b),
      played,
    ))
      yield [key(a, b), ...m];
  }
}

/** Can `rounds` more rounds be paired without repeats? (depth-first search) */
export function completable(
  ids: readonly string[],
  played: ReadonlySet<string>,
  rounds: number,
): boolean {
  if (rounds <= 0) return true;
  for (const m of matchings(ids, played))
    if (completable(ids, new Set([...played, ...m]), rounds - 1)) return true;
  return false;
}

/**
 * `roundsAfter`: rounds still to be paired after this one. A pairing is only
 * accepted if those rounds can still be completed without repeats.
 */
export function pairRound(
  teams: readonly PairingTeam[],
  played: ReadonlySet<string>,
  round: number,
  roundsAfter = 0,
): Pairing[] {
  if (teams.length % 2 !== 0) throw new Error("Pairing: odd number of teams");
  const sorted = [...teams].sort(
    (a, b) =>
      (round === 1 ? 0 : b.matchPoints - a.matchPoints || b.gamePoints - a.gamePoints) ||
      b.avgStrength - a.avgStrength ||
      a.id.localeCompare(b.id),
  );
  const half = sorted.length / 2;

  /** Preferred opponents of sorted[i] among the free ones. */
  const candidates = (i: number, free: number[]): number[] => {
    if (round === 1) {
      // Top half vs bottom half: i meets i + half first.
      return [...free].sort((x, y) => Math.abs(x - i - half) - Math.abs(y - i - half) || x - y);
    }
    const mp = sorted[i]!.matchPoints;
    const group = free.filter((j) => sorted[j]!.matchPoints === mp);
    const mid = Math.floor((group.length + 1) / 2);
    const bottomHalf = group.slice(mid - 1);
    const topHalf = group.slice(0, mid - 1);
    const below = free.filter((j) => !group.includes(j));
    return [...bottomHalf, ...topHalf, ...below];
  };

  const pairs: Array<[number, number]> = [];
  const ids = sorted.map((t) => t.id);
  const solve = (free: number[]): boolean => {
    if (free.length === 0) {
      const now = pairs.map(([i, j]) => key(sorted[i]!.id, sorted[j]!.id));
      return completable(ids, new Set([...played, ...now]), roundsAfter);
    }
    const [i, ...rest] = free as [number, ...number[]];
    for (const j of candidates(i, rest)) {
      if (played.has(key(sorted[i]!.id, sorted[j]!.id))) continue;
      pairs.push([i, j]);
      if (solve(rest.filter((x) => x !== j))) return true;
      pairs.pop();
    }
    return false;
  };
  if (!solve(sorted.map((_, i) => i)))
    throw new Error(`Pairing: no valid pairing in round ${round}`);

  return pairs.map(([i, j]) => {
    const a = sorted[i]!;
    const b = sorted[j]!;
    // Colour balance: the team listed first fewer times goes first; tie → higher seed.
    const aFirst = a.firstCount <= b.firstCount;
    return aFirst ? { first: a.id, second: b.id } : { first: b.id, second: a.id };
  });
}

export const playedKey = key;
