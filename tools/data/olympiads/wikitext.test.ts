import { describe, expect, it } from "vitest";
import {
  firstTemplate,
  linkTarget,
  parseGermanNumber,
  parseTables,
  plainText,
} from "./wikitext.ts";

describe("parseTables", () => {
  it("splits rows and cells, dropping attributes but not link pipes", () => {
    const text = [
      '{| class="wikitable"',
      "|-",
      "! Brett !! Spieler !! Punkte",
      "|-",
      '| 1 || [[Anatoli Jewgenjewitsch Karpow|Anatoli Karpow]] ||- style="text-align:center;" | 9',
      "|}",
    ].join("\n");
    const [table] = parseTables(text);
    expect(table!.rows).toHaveLength(2);
    expect(table!.rows[0]!.map((c) => [c.header, c.raw])).toEqual([
      [true, "Brett"],
      [true, "Spieler"],
      [true, "Punkte"],
    ]);
    expect(table!.rows[1]!.map((c) => c.raw)).toEqual([
      "1",
      "[[Anatoli Jewgenjewitsch Karpow|Anatoli Karpow]]",
      "9",
    ]);
  });

  it("reads header rows separated by ||", () => {
    const [table] = parseTables("{|\n!Rg||Mannschaft||Code\n|-\n|1.||Sowjetunion||URS\n|}");
    expect(table!.rows[0]!.map((c) => c.raw)).toEqual(["Rg", "Mannschaft", "Code"]);
    expect(table!.rows[1]!.map((c) => c.raw)).toEqual(["1.", "Sowjetunion", "URS"]);
  });
});

describe("cell helpers", () => {
  it("plainText keeps link labels and drops templates", () => {
    expect(plainText("[[Efim Geller]]")).toBe("Efim Geller");
    expect(plainText("[[A B|C]] {{0}}6")).toBe("C 6");
    expect(plainText("VEN<br>2½")).toBe("VEN 2½");
  });

  it("linkTarget and firstTemplate", () => {
    expect(linkTarget("[[Lew Abramowitsch Polugajewski|Lew Polugajewski]]")).toBe(
      "Lew Abramowitsch Polugajewski",
    );
    expect(linkTarget("Milan Vukadinov")).toBeNull();
    expect(firstTemplate("{{SUN-1980}}")).toEqual({ name: "SUN-1980", args: [] });
    expect(firstTemplate("{{MLT|2=Malta B}}")).toEqual({ name: "MLT", args: ["2=Malta B"] });
  });

  it("parseGermanNumber", () => {
    expect(parseGermanNumber("3,5")).toBe(3.5);
    expect(parseGermanNumber("2½")).toBe(2.5);
    expect(parseGermanNumber("½")).toBe(0.5);
    expect(parseGermanNumber("{{0}}6")).toBe(6);
    expect(parseGermanNumber("")).toBeNull();
    expect(parseGermanNumber("R")).toBeNull();
  });
});
