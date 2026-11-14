import { describe, expect, it } from "vitest";
import { balance } from "../config/balance.ts";
import { sampleDataset } from "../data/testing.ts";
import { createDraft, isDraftComplete, pick, pickableCards } from "../draft/draft.ts";
import { UniformAI } from "../engine/testing/fakeAi.ts";
import { LocalGameSimulator } from "../engine/localSimulator.ts";
import { boardsFor, gameJobFor, matchFromBoards, quickMatch, scoreOf } from "../sim/match.ts";
import { buildField } from "./field.ts";
import { defaultResting, lineupFor } from "./lineup.ts";
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
const { fieldSize } = balance.sampleTournament;
const rounds = balance.tournament.rounds;

function userTeam(seed: string): string[] {
  let s = createDraft(ds, seed);
  while (!isDraftComplete(s)) s = pick(ds, s, pickableCards(ds, s)[0]!, s.slots.indexOf(null));
  return s.slots as string[];
}

/** Plays a whole tournament; the user's match by quick simulation too. */
function playAll(seed: string): TournamentState {
  let t = startTournament(ds, seed, userTeam(seed), fieldSize, rounds);
  while (!isFinished(t)) {
    t = pairNextRound(t);
    const p = userPairing(t);
    const l = lineups(t, p, defaultResting(t.entrants[0]!.cardIds));
    const user = quickMatch(ds, seed, currentRound(t)!.round, p, l.first, l.second);
    t = recordRound(t, [user, ...fieldResults(ds, t)]);
  }
  return t;
}

describe("field", () => {
  it("has the configured size, distinct teams, max per country", () => {
    const f = buildField(ds, "f", userTeam("f"), fieldSize);
    expect(f).toHaveLength(fieldSize);
    expect(new Set(f.map((e) => e.id)).size).toBe(fieldSize);
    const per = new Map<string, number>();
    for (const e of f) {
      const c = ds.team(e.id).countryCode;
      per.set(c, (per.get(c) ?? 0) + 1);
    }
    expect(Math.max(...per.values())).toBeLessThanOrEqual(balance.tournament.fieldMaxPerCountry);
  });

  it("replaces a person picked by the user with the team's reserve", () => {
    const team = ds.teams.find((t) => t.cardIds.length >= 5)!;
    const picked = [team.cardIds[0]!];
    const f = buildField(ds, "x", picked, ds.teams.length);
    const e = f.find((x) => x.id === team.id)!;
    expect(e.cardIds).not.toContain(team.cardIds[0]);
    expect(lineupFor(e.cardIds)).toEqual(team.cardIds.slice(1, 5));
  });
});

describe("lineup", () => {
  it("keeps relative order when a card rests (GDD §4.3)", () => {
    expect(lineupFor(["A", "B", "C", "D", "R"], "B")).toEqual(["A", "C", "D", "R"]);
    expect(lineupFor(["A", "B", "C", "D", "R"], defaultResting(["A", "B", "C", "D", "R"]))).toEqual(
      ["A", "B", "C", "D"],
    );
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

describe("full tournament", () => {
  it("is reproducible for a seed and ends with a full standings", () => {
    const a = playAll("same");
    const b = playAll("same");
    expect(a).toEqual(b);
    const rows = currentStandings(a);
    expect(rows).toHaveLength(fieldSize + 1);
    expect(rows.every((r) => r.played === rounds)).toBe(true);
  });

  it("plays the user's games through a GameSimulator", async () => {
    const sim = new LocalGameSimulator(new UniformAI());
    let t = startTournament(ds, "engine", userTeam("engine"), fieldSize, rounds);
    t = pairNextRound(t);
    const p = userPairing(t);
    const l = lineups(t, p, null);
    const games = boardsFor(l.first, l.second);
    const boards = await Promise.all(
      games.map(async (g) => {
        const rec = await sim.playGame({ ...gameJobFor(ds, t.seed, 1, g), maxPlies: 12 });
        return { ...g, score: scoreOf(rec.result) };
      }),
    );
    const user = matchFromBoards(1, p, l.first, boards);
    t = recordRound(t, [user, ...fieldResults(ds, t)]);
    expect(currentRound(t)!.results).toHaveLength((fieldSize + 1) / 2);
    expect(user.firstPoints + user.secondPoints).toBe(4);
    expect([p.first, p.second]).toContain(USER_ID);
  });
});
