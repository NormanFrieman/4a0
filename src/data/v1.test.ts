import { describe, expect, it } from "vitest";
import { balance } from "../config/balance.ts";
import { createDraft, isDraftComplete, pick, pickableCards } from "../draft/draft.ts";
import { boardsFor, gameJobFor, quickMatch } from "../sim/match.ts";
import {
  currentRound,
  currentStandings,
  fieldResults,
  isFinished,
  lineups,
  pairNextRound,
  recordRound,
  startTournament,
  userPairing,
} from "../tournament/tournament.ts";
import { buildField, fieldConfig, fieldSizeOf, tiersOf } from "../tournament/field.ts";
import index from "../../public/data/v1/index.json";
import persons from "../../public/data/v1/persons.json";
import { assembleDataset } from "./dataset.ts";
import type { DatasetIndex, OlympiadFile, Person } from "./types.ts";

/** The published dataset (public/data/v1, `pnpm data:olympiads --publish`). */
const files = import.meta.glob<OlympiadFile>("../../public/data/v1/olympiads/*.json", {
  eager: true,
  import: "default",
});
/** Published book files, by path relative to the dataset root (not loaded). */
const bookPaths = new Set(
  Object.keys(import.meta.glob("../../public/data/v1/books/*.bin")).map((k) =>
    k.replace("../../public/data/v1/", ""),
  ),
);
const ds = assembleDataset(index as DatasetIndex, persons as Person[], Object.values(files));

describe("dataset v1", () => {
  it("covers every edition with at most 20 teams each", () => {
    expect(index.dataset).toBe("v1");
    expect(ds.index.note).toBeUndefined();
    expect(index.olympiads).toHaveLength(28);
    for (const o of index.olympiads) {
      const n = ds.teams.filter((t) => t.year === o.year).length;
      expect(n).toBeGreaterThan(0);
      expect(n).toBeLessThanOrEqual(20);
    }
  });

  it("has one team id per team; only host second teams share country and edition (GDD §4.1)", () => {
    expect(new Set(ds.teams.map((t) => t.id)).size).toBe(ds.teams.length);
    const byKey = new Map<string, string[]>();
    for (const t of ds.teams) {
      const k = `${t.countryCode}/${t.year}`;
      byKey.set(k, [...(byKey.get(k) ?? []), t.countryName]);
    }
    for (const names of byKey.values())
      if (names.length > 1) {
        expect(names).toHaveLength(2);
        expect(names.some((n) => / 2$/.test(n))).toBe(true);
      }
  });

  it("never offers a person already on the team, even from another edition (GDD §4.3)", () => {
    const editions = new Map<string, Set<number>>();
    for (const t of ds.teams)
      for (const id of t.cardIds) {
        const p = ds.card(id).personId;
        editions.set(p, (editions.get(p) ?? new Set()).add(t.year));
      }
    const multi = new Set([...editions].filter(([, y]) => y.size > 1).map(([p]) => p));
    expect(multi.size).toBeGreaterThan(100);
    let repeatsAvoided = 0;
    for (let i = 0; i < 300; i++) {
      let d = createDraft(ds, `person-${i}`);
      while (!isDraftComplete(d)) {
        const taken = new Set(d.slots.filter((c) => c !== null).map((c) => ds.card(c!).personId));
        const pickable = pickableCards(ds, d);
        for (const id of ds.team(d.currentTeamId!).cardIds)
          if (taken.has(ds.card(id).personId)) {
            expect(pickable).not.toContain(id);
            repeatsAvoided++;
          }
        // Prefer people who played several editions, to provoke repeats.
        const card = pickable.find((id) => multi.has(ds.card(id).personId)) ?? pickable[0]!;
        d = pick(ds, d, card, ds.card(card).board - 1);
      }
    }
    expect(repeatsAvoided).toBeGreaterThan(0);
  });

  it("rolls top teams by their weight (GDD §4.1)", () => {
    const { rollWeightTop10, rollTopRank } = balance.draft;
    const top = ds.teams.filter((t) => t.finalRank <= rollTopRank);
    for (const t of ds.teams) expect(t.rollWeight).toBe(top.includes(t) ? rollWeightTop10 : 1);
    const expected =
      (top.length * rollWeightTop10) /
      (top.length * rollWeightTop10 + ds.teams.length - top.length);
    const n = 4000;
    let hits = 0;
    for (let i = 0; i < n; i++)
      if (ds.team(createDraft(ds, `weight-${i}`).currentTeamId!).finalRank <= rollTopRank) hits++;
    // 4000 rolls: the standard error is under 1 p.p.
    expect(Math.abs(hits / n - expected)).toBeLessThan(0.03);
  });

  it("has a rating for every card and books only for world champions", () => {
    let withBook = 0;
    for (const t of ds.teams)
      for (const id of t.cardIds) {
        const c = ds.card(id);
        expect(c.fideRating).toBeGreaterThan(0);
        if (c.bookFile === null) continue;
        withBook++;
        expect(ds.person(c.personId).worldChampion).toBe(true);
        expect(c.bookFile).toBe(`books/${c.id}.bin`);
        expect(bookPaths.has(c.bookFile)).toBe(true);
      }
    expect(withBook).toBeGreaterThan(0);
    expect(bookPaths.size).toBe(withBook);
  });

  it("marks the 11 world champions of the classical line", () => {
    const champions = ds.index.teams
      .flatMap((t) => t.cardIds)
      .map((id) => ds.person(ds.card(id).personId))
      .filter((p) => p.worldChampion);
    expect(new Set(champions.map((p) => p.name)).size).toBe(11);
    // FIDE knockout champions are left out (user decision, 2026-11-17).
    expect(champions.some((p) => p.name.includes("Topalov"))).toBe(false);
  });

  it("plays a full tournament with the configured field", () => {
    const { fieldSize, rounds } = balance.tournament;
    expect(fieldSizeOf(fieldConfig())).toBe(fieldSize);
    for (const seed of ["a", "b", "c"]) {
      let d = createDraft(ds, seed);
      while (!isDraftComplete(d)) d = pick(ds, d, pickableCards(ds, d)[0]!, d.slots.indexOf(null));
      let t = startTournament(ds, seed, d.slots as string[], fieldConfig(), rounds);
      expect(t.entrants).toHaveLength(fieldSize + 1);
      while (!isFinished(t)) {
        t = pairNextRound(t);
        const p = userPairing(t);
        const l = lineups(t, p);
        const round = currentRound(t)!.round;
        // Engine jobs get a book only for world champions; the rest play from move 1.
        const fakeBooks = new Map([...bookPaths].map((f) => [f, new Uint8Array(0)] as const));
        for (const g of boardsFor(l.first, l.second)) {
          const job = gameJobFor(ds, seed, round, g, fakeBooks);
          for (const [side, id] of [
            [job.white, g.whiteCardId],
            [job.black, g.blackCardId],
          ] as const)
            expect(side.book !== undefined).toBe(ds.card(id).bookFile !== null);
        }
        const user = quickMatch(ds, seed, round, p, l.first, l.second);
        t = recordRound(t, [user, ...fieldResults(ds, t)]);
      }
      expect(currentStandings(t)).toHaveLength(fieldSize + 1);
    }
  });

  it("draws the field by tiers, champions and country (GDD §5.1, §13.2)", () => {
    const cfg = fieldConfig();
    const tierOf = new Map<string, string>();
    for (const [tier, teams] of Object.entries(tiersOf(ds.teams, cfg.tierQuantiles)))
      for (const t of teams) tierOf.set(t.id, tier);
    for (let i = 0; i < 1000; i++) {
      const f = buildField(ds, `field-${i}`, cfg).map((e) => ds.team(e.id));
      expect(new Set(f.map((t) => t.id)).size).toBe(balance.tournament.fieldSize);
      for (const tier of ["elite", "middle", "weak"] as const)
        expect(f.filter((t) => tierOf.get(t.id) === tier)).toHaveLength(cfg.tiers[tier]);
      const champions = f.filter((t) => tierOf.get(t.id) === "elite" && t.finalRank === 1);
      expect(champions.length).toBeGreaterThanOrEqual(cfg.minChampions);
      const per = new Map<string, number>();
      for (const t of f) per.set(t.countryCode, (per.get(t.countryCode) ?? 0) + 1);
      expect(Math.max(...per.values())).toBeLessThanOrEqual(cfg.maxPerCountry);
    }
  });
});
