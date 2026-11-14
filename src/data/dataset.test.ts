import { describe, expect, it } from "vitest";
import { balance } from "../config/balance.ts";
import { avgStrength, cardStrength, rollWeight, traitOf } from "./cardStrength.ts";
import { sampleDataset } from "./testing.ts";

describe("sample dataset", () => {
  const ds = sampleDataset();

  it("has enough distinct teams for a full draft with rerolls and the field", () => {
    expect(ds.teams.length).toBeGreaterThanOrEqual(
      balance.draft.slots + balance.draft.rerollsPerDraft,
    );
    expect(ds.teams.length).toBeGreaterThanOrEqual(balance.sampleTournament.fieldSize);
  });

  it("resolves every card and person", () => {
    for (const t of ds.teams)
      for (const id of t.cardIds) expect(ds.person(ds.card(id).personId).name).toBeTruthy();
  });

  it("throws on unknown ids", () => {
    expect(() => ds.card("nope")).toThrow();
  });
});

describe("card numbers", () => {
  it("blends rating and performance (GDD §6.1)", () => {
    const k = balance.strength.performanceWeight;
    expect(cardStrength(2600, 2800)).toBe(Math.round(2600 + k * 200));
    expect(cardStrength(null, 2500)).toBe(Math.min(2500, balance.strength.unratedCap));
  });

  it("weights top teams in the roll", () => {
    expect(rollWeight(1)).toBe(balance.draft.rollWeightTop10);
    expect(rollWeight(balance.draft.rollTopRank + 1)).toBe(1);
  });

  it("averages the first four boards", () => {
    expect(avgStrength([2600, 2500, 2400, 2300, 1000])).toBe(2450);
  });

  it("maps decisiveness to a trait", () => {
    expect(traitOf(0.3)).toBe("solid");
    expect(traitOf(0.5)).toBe("balanced");
    expect(traitOf(0.8)).toBe("combative");
  });
});
