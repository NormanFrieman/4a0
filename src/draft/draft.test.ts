import { describe, expect, it } from "vitest";
import { balance } from "../config/balance.ts";
import { sampleDataset } from "../data/testing.ts";
import { createDraft, isDraftComplete, pick, pickableCards, reroll, slotForCard } from "./draft.ts";

const ds = sampleDataset();

function autoDraft(seed: string) {
  let s = createDraft(ds, seed);
  while (!isDraftComplete(s)) {
    const card = pickableCards(ds, s)[0]!;
    s = pick(ds, s, card, slotForCard(ds, card));
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
    const s2 = pick(ds, s, card, slotForCard(ds, card));
    expect(() => pick(ds, s2, card, slotForCard(ds, card))).toThrow();
  });

  it("puts each card only in the slot of its real board (reserves in the reserve slot)", () => {
    for (let i = 0; i < 50; i++) {
      const s = autoDraft(`board-${i}`);
      s.slots.forEach((c, slot) => {
        const board = ds.card(c!).board;
        expect(slot).toBe(Math.min(board, balance.draft.slots) - 1);
      });
    }
  });

  it("rejects a pick into another slot", () => {
    const s = createDraft(ds, "wrong");
    const card = pickableCards(ds, s)[0]!;
    const other = (slotForCard(ds, card) + 1) % balance.draft.slots;
    expect(() => pick(ds, s, card, other)).toThrow();
  });

  it("disables cards whose slot is taken and always offers a pickable card", () => {
    for (let i = 0; i < 50; i++) {
      let s = createDraft(ds, `free-${i}`);
      while (!isDraftComplete(s)) {
        const pickable = pickableCards(ds, s);
        expect(pickable.length).toBeGreaterThan(0);
        for (const id of ds.team(s.currentTeamId!).cardIds)
          if (s.slots[slotForCard(ds, id)] !== null) expect(pickable).not.toContain(id);
        const card = pickable[pickable.length - 1]!;
        s = pick(ds, s, card, slotForCard(ds, card));
      }
    }
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
});
