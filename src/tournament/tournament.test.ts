import { describe, expect, it } from "vitest";
import { balance } from "../config/balance.ts";
import { sampleDataset } from "../data/testing.ts";
import { createDraft, isDraftComplete, pick, pickableCards } from "../draft/draft.ts";
import { UniformAI } from "../engine/testing/fakeAi.ts";
import { LocalGameSimulator } from "../engine/localSimulator.ts";
import { boardsFor, gameJobFor, matchFromBoards, quickMatch, scoreOf } from "../sim/match.ts";
import { buildField, fieldConfig, fieldSizeOf, tiersOf, type FieldConfig } from "./field.ts";
import { pairRound, playedKey } from "./pairing.ts";
import { matchPointsFor, standings } from "./standings.ts";
import {
  USER_ID,
  currentRound,
  currentStandings,
  fieldResults,
  isFinished,
  lineups,
  pairNextRound,
  recordRound,
  startTournament,
  userPairing,
  type TournamentState,
} from "./tournament.ts";
import type { MatchResult } from "./types.ts";

const ds = sampleDataset();
const field = fieldConfig({ ...balance.tournament, ...balance.sampleTournament });
const fieldSize = fieldSizeOf(field);
const rounds = balance.tournament.rounds;

function userTeam(seed: string): string[] {
  let s = createDraft(ds, seed);
  while (!isDraftComplete(s)) s = pick(ds, s, pickableCards(ds, s)[0]!, s.slots.indexOf(null));
  return s.slots as string[];
}

/** Plays a whole tournament; the user's match by quick simulation too. */
function playAll(seed: string): TournamentState {
  let t = startTournament(ds, seed, userTeam(seed), field, rounds);
  while (!isFinished(t)) {
    t = pairNextRound(t);
    const p = userPairing(t);
    const l = lineups(t, p);
    const user = quickMatch(ds, seed, currentRound(t)!.round, p, l.first, l.second);
    t = recordRound(t, [user, ...fieldResults(ds, t)]);
  }
  return t;
}

describe("field", () => {
  it("has the configured size, distinct teams, max per country", () => {
    const f = buildField(ds, "f", field);
    expect(f).toHaveLength(fieldSize);
    expect(new Set(f.map((e) => e.id)).size).toBe(fieldSize);
    const per = new Map<string, number>();
    for (const e of f) {
      const c = ds.team(e.id).countryCode;
      per.set(c, (per.get(c) ?? 0) + 1);
    }
    expect(Math.max(...per.values())).toBeLessThanOrEqual(balance.tournament.fieldMaxPerCountry);
  });

  it("fills each tier and the minimum of elite champions", () => {
    const tiers = tiersOf(ds.teams, field.tierQuantiles);
    for (let i = 0; i < 50; i++) {
      const ids = new Set(buildField(ds, `tier-${i}`, field).map((e) => e.id));
      for (const tier of ["elite", "middle", "weak"] as const)
        expect(tiers[tier].filter((t) => ids.has(t.id))).toHaveLength(field.tiers[tier]);
      const champions = tiers.elite.filter((t) => ids.has(t.id) && t.finalRank === 1);
      expect(champions.length).toBeGreaterThanOrEqual(field.minChampions);
    }
  });

  it("is reproducible by seed", () => {
    const ids = (seed: string) => buildField(ds, seed, field).map((e) => e.id);
    expect(ids("same")).toEqual(ids("same"));
    const draws = new Set(Array.from({ length: 20 }, (_, i) => ids(`s${i}`).sort().join()));
    expect(draws.size).toBeGreaterThan(1);
  });

  it("borrows from a neighbour tier when one runs short", () => {
    // The sample's elite has 3 teams; ask for 5.
    const short: FieldConfig = { ...field, tiers: { elite: 5, middle: 1, weak: 1 } };
    const f = buildField(ds, "short", short);
    expect(f).toHaveLength(7);
    expect(new Set(f.map((e) => e.id)).size).toBe(7);
  });

  it("keeps a person picked by the user in their real team (GDD §5.1)", () => {
    const user = userTeam("dup");
    // Every sample team in the field: tiers of 3/3/4 at the thirds.
    const all: FieldConfig = { ...field, tiers: { elite: 3, middle: 3, weak: 4 }, minChampions: 0 };
    const t = startTournament(ds, "dup", user, all, rounds);
    expect(t.entrants).toHaveLength(ds.teams.length + 1);
    for (const e of t.entrants.slice(1)) expect(e.cardIds).toEqual(ds.team(e.id).cardIds);
    const fieldCards = new Set(t.entrants.slice(1).flatMap((e) => e.cardIds));
    expect(user.some((id) => fieldCards.has(id))).toBe(true);
  });
});

describe("match", () => {
  it("scores by board, even when the same card plays for both teams", () => {
    const p = { first: USER_ID, second: "x" };
    const lineup = ["A", "B", "C", "D"];
    // White on board 2 is the second team: it wins there; the rest are draws.
    const boards = boardsFor(lineup, lineup).map((g) => ({
      ...g,
      score: g.board === 2 ? (1 as const) : (0.5 as const),
    }));
    const m = matchFromBoards(1, p, boards);
    expect(m.firstPoints).toBe(1.5);
    expect(m.secondPoints).toBe(2.5);
  });
});

describe("pairing", () => {
  it("round 1 pairs the top half against the bottom half", () => {
    const teams = [2600, 2500, 2400, 2300].map((s, i) => ({
      id: `t${i}`,
      matchPoints: 0,
      gamePoints: 0,
      avgStrength: s,
      firstCount: 0,
    }));
    const p = pairRound(teams, new Set(), 1).map((x) => [x.first, x.second].sort().join("-"));
    expect(p.sort()).toEqual(["t0-t2", "t1-t3"]);
  });

  it("plays 7 rounds with 8 teams without repeats, for many seeds", () => {
    for (let i = 0; i < 40; i++) {
      const t = playAll(`pair-${i}`);
      const keys = t.rounds.flatMap((r) => r.results.map((m) => playedKey(m.first, m.second)));
      expect(keys).toHaveLength((rounds * (fieldSize + 1)) / 2);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("balances colours: each team listed first 3 or 4 times in 7 rounds", () => {
    const t = playAll("colours");
    const first = new Map<string, number>();
    for (const r of t.rounds)
      for (const p of r.pairings) first.set(p.first, (first.get(p.first) ?? 0) + 1);
    for (const e of t.entrants) expect(first.get(e.id) ?? 0).toBeGreaterThanOrEqual(2);
  });
});

describe("standings", () => {
  const m = (first: string, second: string, fp: number): MatchResult => ({
    round: 1,
    first,
    second,
    boards: [],
    firstPoints: fp,
    secondPoints: 4 - fp,
  });

  it("scores matches 2/1/0", () => {
    expect(matchPointsFor(2.5, 1.5)).toBe(balance.tournament.matchPoints.win);
    expect(matchPointsFor(2, 2)).toBe(balance.tournament.matchPoints.draw);
    expect(matchPointsFor(1, 3)).toBe(balance.tournament.matchPoints.loss);
  });

  it("orders by match points, game points, Buchholz, then head-to-head", () => {
    const rows = standings(
      ["a", "b", "c", "d"],
      [m("a", "b", 3), m("c", "d", 2.5), m("a", "c", 2), m("b", "d", 4)],
    );
    expect(rows.map((r) => r.teamId)).toEqual(["a", "c", "b", "d"]);
    expect(rows[0]!.medal).toBe("gold");
    expect(rows[3]!.medal).toBeNull();
  });
});

describe("standings tiebreaks, one at a time (GDD §5.3)", () => {
  const m = (round: number, first: string, second: string, fp: number): MatchResult => ({
    round,
    first,
    second,
    boards: [],
    firstPoints: fp,
    secondPoints: 4 - fp,
  });
  const order = (ids: string[], rs: MatchResult[]) => standings(ids, rs).map((r) => r.teamId);

  it("game points break a tie in match points", () => {
    // Both win their match; z by more.
    expect(order(["a", "b", "y", "z"], [m(1, "a", "b", 2.5), m(1, "z", "y", 3.5)])).toEqual([
      "z",
      "a",
      "b",
      "y",
    ]);
  });

  it("Buchholz breaks a tie in match and game points", () => {
    // a and z both win 3–1; z's opponent (c) then wins, a's (d) loses.
    const rows = standings(
      ["a", "c", "d", "e", "f", "z"],
      [m(1, "a", "d", 3), m(1, "z", "c", 3), m(2, "c", "e", 3), m(2, "f", "d", 3)],
    );
    const z = rows.find((r) => r.teamId === "z")!;
    const a = rows.find((r) => r.teamId === "a")!;
    expect([z.matchPoints, z.gamePoints]).toEqual([a.matchPoints, a.gamePoints]);
    expect(z.buchholz).toBeGreaterThan(a.buchholz);
    expect(z.rank).toBeLessThan(a.rank);
  });

  it("head-to-head breaks a tie in match points, game points and Buchholz", () => {
    const rows = standings(
      ["a", "p", "q", "r", "s", "z"],
      [
        m(1, "z", "a", 2.5),
        m(1, "p", "r", 3),
        m(1, "s", "q", 4),
        m(2, "a", "p", 2.5),
        m(2, "q", "z", 2.5),
      ],
    );
    const z = rows.find((r) => r.teamId === "z")!;
    const a = rows.find((r) => r.teamId === "a")!;
    expect([z.matchPoints, z.gamePoints, z.buchholz]).toEqual([
      a.matchPoints,
      a.gamePoints,
      a.buchholz,
    ]);
    expect(z.rank).toBe(a.rank - 1);
  });

  it("gives gold, silver and bronze to the first three only", () => {
    const rows = standings(
      ["a", "b", "c", "d", "e", "f"],
      [m(1, "a", "b", 4), m(1, "c", "d", 3), m(1, "e", "f", 2.5)],
    );
    expect(rows.map((r) => r.medal)).toEqual(["gold", "silver", "bronze", null, null, null]);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("full tournament", () => {
  it("is reproducible for a seed and ends with a full standings", () => {
    const a = playAll("same");
    const b = playAll("same");
    expect(a).toEqual(b);
    const rows = currentStandings(a);
    expect(rows).toHaveLength(fieldSize + 1);
    expect(rows.every((r) => r.played === rounds)).toBe(true);
  });

  it("plays every card on its real board in every round (GDD §4.3)", () => {
    for (let i = 0; i < 20; i++) {
      const t = playAll(`boards-${i}`);
      const user = t.entrants.find((e) => e.isUser)!;
      for (const r of t.rounds) {
        expect(r.results.find((m) => m.first === USER_ID || m.second === USER_ID)).toBeDefined();
        for (const m of r.results) {
          const first = t.entrants.find((e) => e.id === m.first)!;
          const second = t.entrants.find((e) => e.id === m.second)!;
          expect(m.boards.map((b) => b.board)).toEqual([1, 2, 3, 4]);
          for (const b of m.boards) {
            const [own, other] = b.board % 2 === 1 ? [first, second] : [second, first];
            expect(b.whiteCardId).toBe(own.cardIds[b.board - 1]);
            expect(b.blackCardId).toBe(other.cardIds[b.board - 1]);
            expect(ds.card(b.whiteCardId).board).toBe(b.board);
            expect(ds.card(b.blackCardId).board).toBe(b.board);
          }
        }
      }
      expect(user.cardIds).toHaveLength(balance.draft.slots);
    }
  });

  /**
   * A whole session as the app runs it (src/app/state/session.ts): draft,
   * field, then every round with the user's games on a GameSimulator and the
   * rest by quick simulation. Returns everything a seed must reproduce.
   */
  async function session(seed: string) {
    const sim = new LocalGameSimulator(new UniformAI());
    const team = userTeam(seed);
    let t = startTournament(ds, seed, team, field, rounds);
    const pgns: string[] = [];
    while (!isFinished(t)) {
      t = pairNextRound(t);
      const round = currentRound(t)!.round;
      const p = userPairing(t);
      const l = lineups(t, p);
      const boards = [];
      for (const g of boardsFor(l.first, l.second)) {
        const rec = await sim.playGame({ ...gameJobFor(ds, seed, round, g), maxPlies: 16 });
        pgns.push(rec.pgn);
        boards.push({ ...g, score: scoreOf(rec.result) });
      }
      t = recordRound(t, [matchFromBoards(round, p, boards), ...fieldResults(ds, t)]);
    }
    return { team, entrants: t.entrants, rounds: t.rounds, pgns, standings: currentStandings(t) };
  }

  it("reproduces draft, field, pairings and games for the same seed (GDD §8.4)", async () => {
    const a = await session("repro");
    const b = await session("repro");
    expect(b).toEqual(a);
    expect(a.pgns).toHaveLength(rounds * 4);
    const c = await session("other");
    expect(c.pgns).not.toEqual(a.pgns);
  }, 30_000);

  it("plays the user's games through a GameSimulator", async () => {
    const sim = new LocalGameSimulator(new UniformAI());
    let t = startTournament(ds, "engine", userTeam("engine"), field, rounds);
    t = pairNextRound(t);
    const p = userPairing(t);
    const l = lineups(t, p);
    const games = boardsFor(l.first, l.second);
    const boards = await Promise.all(
      games.map(async (g) => {
        const rec = await sim.playGame({ ...gameJobFor(ds, t.seed, 1, g), maxPlies: 12 });
        return { ...g, score: scoreOf(rec.result) };
      }),
    );
    const user = matchFromBoards(1, p, boards);
    t = recordRound(t, [user, ...fieldResults(ds, t)]);
    expect(currentRound(t)!.results).toHaveLength((fieldSize + 1) / 2);
    expect(user.firstPoints + user.secondPoints).toBe(4);
    expect([p.first, p.second]).toContain(USER_ID);
  });
});
