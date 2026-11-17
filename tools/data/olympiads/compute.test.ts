import { describe, expect, it } from "vitest";
import { cardStrength } from "../../../src/data/cardStrength.ts";
import { balance } from "../../../src/config/balance.ts";
import { approxPerformance, decisiveness, eloAt, opponentRating, titleAt } from "./compute.ts";
import { countryOf, teamSuffix } from "./countries.ts";
import { dp } from "./dp.ts";

describe("eloAt", () => {
  const elo = [
    { date: "1980-01-01", rating: 2725 },
    { date: "1980-07-01", rating: 2725 },
    { date: "1981-01-01", rating: 2690 },
  ];
  it("takes the latest list on or before the start", () => {
    expect(eloAt(elo, "1980-11-20")).toEqual({ date: "1980-07-01", rating: 2725 });
    expect(eloAt(elo, "1981-01-01")!.rating).toBe(2690);
  });
  it("without one in the 24 months before, the first one up to 24 months after", () => {
    // 1970: the first list in Wikidata is July 1971.
    expect(eloAt([{ date: "1971-07-01", rating: 2690 }], "1970-09-05")!.rating).toBe(2690);
    expect(eloAt(elo, "1979-12-31")!.date).toBe("1980-01-01");
    expect(eloAt(elo, "1977-12-31")).toBeNull();
    // Whole months: the window of a start in January 1983 opens in January 1981.
    expect(eloAt(elo, "1983-01-15")!.date).toBe("1981-01-01");
    expect(eloAt(elo, "1983-02-01")).toBeNull();
  });
});

describe("titleAt", () => {
  const titles = [
    { qid: "Q1973600", year: 2015 }, // CM
    { qid: "Q752119", year: 2018 }, // IM
    { qid: "Q105269", year: 2019 }, // GM
    { qid: "Q64821631", year: 2009 }, // FIDE Senior Trainer: not a card title
  ];
  it("strongest title awarded by that year", () => {
    expect(titleAt(titles, 2018)).toBe("IM");
    expect(titleAt(titles, 2024)).toBe("GM");
    expect(titleAt(titles, 2010)).toBe("");
    expect(titleAt(titles, null)).toBe("GM");
  });
  it("an undated title counts", () => {
    expect(titleAt([{ qid: "Q105269", year: null }], 1970)).toBe("GM");
  });
});

describe("dp and approximate performance", () => {
  it("FIDE table, symmetric", () => {
    expect(dp(0.5)).toBe(0);
    expect(dp(0.75)).toBe(193);
    expect(dp(0.9)).toBe(366);
    expect(dp(1)).toBe(800);
    expect(dp(0.25)).toBe(-193);
    expect(dp(0)).toBe(-800);
  });

  it("mean opponent + dp", () => {
    // 9/12 = 0.75 → +193.
    expect(approxPerformance([2600, 2500, 2550], 9, 12)).toBe(2550 + 193);
    expect(approxPerformance([], 9, 12)).toBeNull();
    expect(approxPerformance([2500], 0, 0)).toBeNull();
  });

  it("opponent on the same board, else the team's rated mean", () => {
    expect(opponentRating([2700, 2600, null, 2500], 2)).toBe(2600);
    expect(opponentRating([2700, 2600, null, 2500], 3)).toBe(2600);
    expect(opponentRating([null, null, null, null], 1)).toBeNull();
  });

  it("unrated player: performance, capped (GDD §6.1)", () => {
    expect(cardStrength(null, 2500)).toBe(balance.strength.unratedCap);
  });
});

describe("decisiveness", () => {
  it("1 − draw rate", () => {
    expect(decisiveness(6, 6, 0)).toBe(0.5);
    expect(decisiveness(0, 0, 0)).toBeNull();
  });
});

describe("countries", () => {
  it("maps templates, historical names and host extra teams", () => {
    expect(countryOf("SUN", 1980, null)).toEqual({ code: "su", name: "URSS" });
    expect(countryOf("DEU", 1980, null).name).toBe("Alemanha Ocidental");
    expect(countryOf("DEU", 2024, null).name).toBe("Alemanha");
    expect(countryOf("HUN", 2024, teamSuffix("Ungarn B"))).toEqual({
      code: "hu",
      name: "Hungria 2",
    });
    expect(teamSuffix("Ungarn")).toBeNull();
    expect(() => countryOf("XYZ", 2024, null)).toThrow(/no entry/);
  });
});
