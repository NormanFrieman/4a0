import { describe, expect, it } from "vitest";
import { balance } from "../config/balance.ts";
import { sampleDataset } from "../data/testing.ts";
import { createDraft, isDraftComplete, pick, pickableCards, reorder, reroll } from "./draft.ts";

const ds = sampleDataset();

function autoDraft(seed: string) {
  let s = createDraft(ds, seed);
  while (!isDraftComplete(s)) {
    const slot = s.slots.indexOf(null);
    s = pick(ds, s, pickableCards(ds, s)[0]!, slot);
  }
  return s;
}

describe("draft", () => {
  it("is deterministic for a seed", () => {
    expect(autoDraft("x").slots).toEqual(autoDraft("x").slots);
    expect(createDraft(ds, "a").currentTeamId).toBeTruthy();
  });

  it("fills 5 slots with 5 distinct persons and never repeats a team", () => {
    for (let i = 0; i < 50; i++) {
      const s = autoDraft(`seed-${i}`);
      const persons = s.slots.map((c) => ds.card(c!).personId);
      expect(new Set(persons).size).toBe(balance.draft.slots);
      expect(new Set(s.seenTeamIds).size).toBe(s.seenTeamIds.length);
      expect(s.currentTeamId).toBeNull();
    }
  });

  it("limits rerolls and never shows a team twice", () => {
    let s = createDraft(ds, "rr");
    for (let i = 0; i < balance.draft.rerollsPerDraft; i++) s = reroll(ds, s);
    expect(s.rerollsLeft).toBe(0);
    expect(() => reroll(ds, s)).toThrow();
    expect(new Set(s.seenTeamIds).size).toBe(balance.draft.rerollsPerDraft + 1);
  });

  it("rejects cards outside the roll and occupied slots", () => {
    const s = createDraft(ds, "p");
    const card = pickableCards(ds, s)[0]!;
    const s2 = pick(ds, s, card, 0);
    expect(() => pick(ds, s2, card, 1)).toThrow();
    expect(() => pick(ds, s2, pickableCards(ds, s2)[0]!, 0)).toThrow();
  });

  it("favours top teams by roll weight", () => {
    const counts = new Map<string, number>();
    for (let i = 0; i < 2000; i++) {
      const t = createDraft(ds, `w${i}`).currentTeamId!;
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    const heavy = ds.teams.find((t) => t.rollWeight > 1)!;
    expect(counts.get(heavy.id)).toBeGreaterThan(0);
    expect(counts.size).toBe(ds.teams.length);
  });

  it("allows one final reorder", () => {
    const s = autoDraft("ord");
    const r = reorder(s, [4, 3, 2, 1, 0]);
    expect(r.slots).toEqual([...s.slots].reverse());
    expect(() => reorder(r, [0, 1, 2, 3, 4])).toThrow();
  });
});
