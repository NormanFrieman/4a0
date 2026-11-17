import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCrosstable } from "./crosstable.ts";
import { parseLineups } from "./lineups.ts";

const fixture = (name: string) => readFileSync(join(import.meta.dirname, "fixtures", name), "utf8");

describe("parseLineups", () => {
  it("1980: Soviet team with two reserves, red links and an unranked host team", () => {
    const teams = parseLineups(fixture("lineups-1980.txt"));
    expect(teams.map((t) => [t.rank, t.name, t.countryTemplate])).toEqual([
      [1, "Sowjetunion", "SUN"],
      [9, "Kanada", "CAN"],
      [null, "Malta B", "MLT"],
    ]);
    const urs = teams[0]!;
    expect(urs.boardPoints).toBe(39);
    expect(urs.players.map((p) => p.board)).toEqual([1, 2, 3, 4, "R", "R"]);
    expect(urs.players[0]).toEqual({
      board: 1,
      name: "Anatoli Karpow",
      wikiTitle: "Anatoli Jewgenjewitsch Karpow",
      wins: 6,
      draws: 6,
      losses: 0,
      points: 9,
      games: 12,
    });
    expect(urs.players[2]).toMatchObject({ name: "Michail Tal", points: 3.5, games: 6 });
    expect(urs.players.reduce((s, p) => s + p.points, 0)).toBe(urs.boardPoints);
    const vukadinov = teams[1]!.players.find((p) => p.board === 4)!;
    expect(vukadinov).toMatchObject({ name: "Milan Vukadinov", wikiTitle: null });
  });

  it("2024: one reserve and the host's B team", () => {
    const [ind, hunB] = parseLineups(fixture("lineups-2024.txt"));
    expect(ind!.players.map((p) => p.board)).toEqual([1, 2, 3, 4, "R"]);
    expect(ind!.players[0]).toMatchObject({ name: "D. Gukesh", points: 9, games: 10 });
    expect(hunB).toMatchObject({ rank: 33, name: "Ungarn B", countryTemplate: "HUN" });
  });
});

describe("parseLineups, 1970s and teams without a flag", () => {
  const [urs, alb, pal] = parseLineups(fixture("lineups-1970s.txt"));

  it("1970: rank and final group, preliminary + final board points", () => {
    expect(urs).toMatchObject({ rank: 1, name: "Sowjetunion", countryTemplate: "SUN" });
    expect(urs!.boardPoints).toBe(31 + 27.5);
    expect(urs!.players[0]).toMatchObject({ name: "Boris Spasski", points: 9.5, games: 12 });
  });

  it("1972: a team without a final rank, final points in parentheses", () => {
    expect(alb).toMatchObject({ rank: null, name: "Albanien", countryTemplate: "ALB" });
    expect(alb!.boardPoints).toBe(19.5 + 19);
  });

  it("a team with a flag image instead of a template", () => {
    expect(pal).toMatchObject({ rank: 88, name: "Palästina", countryTemplate: null });
    expect(pal!.players).toHaveLength(6);
  });
});

describe("parseCrosstable", () => {
  it("1980: opponent codes per round, unranked host team", () => {
    const [urs, mlt2] = parseCrosstable(fixture("crosstable-1980.txt"));
    expect(urs).toMatchObject({ rank: 1, name: "Sowjetunion", code: "URS" });
    expect(urs!.opponents).toHaveLength(14);
    expect(urs!.opponents.slice(0, 3)).toEqual(["VEN", "GRE", "AUT"]);
    expect(mlt2).toMatchObject({ rank: null, name: "Malta II", code: "MLT2" });
  });

  it("2024: code in parentheses, B-team opponents", () => {
    const [ind] = parseCrosstable(fixture("crosstable-2024.txt"));
    expect(ind).toMatchObject({ rank: 1, name: "Indien", code: "IND" });
    expect(ind!.opponents).toHaveLength(11);
    expect(ind!.opponents[2]).toBe("HUN-B");
  });
});
