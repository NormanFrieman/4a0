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
import index from "../../public/data/v1/index.json";
import persons from "../../public/data/v1/persons.json";
import { bookFilesFor } from "./books.ts";
import { assembleDataset } from "./dataset.ts";
import type { DatasetIndex, OlympiadFile, Person } from "./types.ts";

/** The published dataset (public/data/v1, `pnpm data:olympiads --publish`). */
const files = import.meta.glob<OlympiadFile>("../../public/data/v1/olympiads/*.json", {
  eager: true,
  import: "default",
});
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

  it("has a rating for every card and no opening books yet", () => {
    for (const t of ds.teams)
      for (const id of t.cardIds) {
        const c = ds.card(id);
        expect(c.fideRating).toBeGreaterThan(0);
        expect(c.bookFile).toBeNull();
      }
    expect(
      bookFilesFor(
        ds,
        ds.teams.flatMap((t) => t.cardIds),
      ),
    ).toEqual([]);
  });

  it("plays a full tournament with the configured field", () => {
    const { fieldSize, rounds } = balance.tournament;
    for (const seed of ["a", "b", "c"]) {
      let d = createDraft(ds, seed);
      while (!isDraftComplete(d)) d = pick(ds, d, pickableCards(ds, d)[0]!, d.slots.indexOf(null));
      let t = startTournament(ds, seed, d.slots as string[], fieldSize, rounds);
      expect(t.entrants).toHaveLength(fieldSize + 1);
      while (!isFinished(t)) {
        t = pairNextRound(t);
        const p = userPairing(t);
        const l = lineups(t, p);
        const round = currentRound(t)!.round;
        // Engine jobs build without books: every side plays from move 1.
        for (const g of boardsFor(l.first, l.second)) {
          const job = gameJobFor(ds, seed, round, g, new Map());
          expect(job.white.book).toBeUndefined();
          expect(job.black.book).toBeUndefined();
        }
        const user = quickMatch(ds, seed, round, p, l.first, l.second);
        t = recordRound(t, [user, ...fieldResults(ds, t)]);
      }
      expect(currentStandings(t)).toHaveLength(fieldSize + 1);
    }
  });
});
