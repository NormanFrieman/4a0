/**
 * Swiss pairing (GDD §5.2). Round 1: by strength, top half vs bottom half.
 * Later rounds: score groups, top half vs bottom half inside the group, with
 * backtracking so a pairing without repeats is always found when one exists
 * (a greedy Swiss can get stuck, e.g. 8 teams over 7 rounds). Among the
 * pairings without repeats, the one with the fewest floaters (counted in
 * score groups crossed) wins. Deterministic.
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

/**
 * Search steps per cost budget. Not a balancing number: it only bounds the
 * time, and the result is still deterministic.
 */
const PAIRING_NODE_LIMIT = 20_000;

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

  /**
   * Score group of each team, as an index over the distinct match-point
   * levels (0 = top). Round 1 has a single group.
   */
  const levels = [...new Set(sorted.map((t) => (round === 1 ? 0 : t.matchPoints)))];
  const level = sorted.map((t) => levels.indexOf(round === 1 ? 0 : t.matchPoints));
  /** Cost of a pair: how many score groups apart the two teams are. */
  const cost = (i: number, j: number) => Math.abs(level[i]! - level[j]!);
  /**
   * Lower bound of the cost of pairing `free` (in seed order): every time
   * the teams above a group boundary are odd in number, one of them has to
   * float across it.
   */
  const minCost = (free: readonly number[]): number => {
    let c = 0;
    for (let k = 0; k + 1 < free.length; k++)
      if (k % 2 === 0) c += level[free[k + 1]!]! - level[free[k]!]!;
    return c;
  };

  /** Preferred opponents of sorted[i] among the free ones. */
  const candidates = (i: number, free: number[]): number[] => {
    if (round === 1) {
      // Top half vs bottom half: i meets i + half first.
      return [...free].sort((x, y) => Math.abs(x - i - half) - Math.abs(y - i - half) || x - y);
    }
    const group = free.filter((j) => level[j] === level[i]);
    const mid = Math.floor((group.length + 1) / 2);
    const bottomHalf = group.slice(mid - 1);
    const topHalf = group.slice(0, mid - 1);
    const below = free.filter((j) => level[j] !== level[i]);
    return [...bottomHalf, ...topHalf, ...below];
  };

  const pairs: Array<[number, number]> = [];
  const ids = sorted.map((t) => t.id);
  let nodes = 0;
  let nodeLimit = PAIRING_NODE_LIMIT;
  /**
   * First pairing in preference order whose total cost fits `budget`. Gives
   * up after `nodeLimit` steps, so a budget that repeats make
   * impossible does not explore every pairing.
   */
  const solve = (free: number[], budget: number): boolean => {
    if (++nodes > nodeLimit) return false;
    if (free.length === 0) {
      const now = pairs.map(([i, j]) => key(sorted[i]!.id, sorted[j]!.id));
      return completable(ids, new Set([...played, ...now]), roundsAfter);
    }
    const [i, ...rest] = free as [number, ...number[]];
    for (const j of candidates(i, rest)) {
      if (played.has(key(sorted[i]!.id, sorted[j]!.id))) continue;
      const left = rest.filter((x) => x !== j);
      const spend = cost(i, j);
      if (spend + minCost(left) > budget) continue;
      pairs.push([i, j]);
      if (solve(left, budget - spend)) return true;
      pairs.pop();
    }
    return false;
  };
  // Score groups first (GDD §5.2): the cheapest pairing in floaters, raising
  // the budget only when repeats leave no cheaper one.
  const all = sorted.map((_, i) => i);
  const maxCost = (levels.length - 1) * half;
  const tryBudget = (budget: number, limit: number) => {
    nodes = 0;
    nodeLimit = limit;
    return solve(all, budget);
  };
  let found = false;
  for (let b = minCost(all); b < maxCost && !found; b++) found = tryBudget(b, PAIRING_NODE_LIMIT);
  // Last resort: any pairing without repeats, with no step limit.
  if (!found && !tryBudget(maxCost, Infinity))
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
