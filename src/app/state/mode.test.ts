import { describe, expect, it } from "vitest";
import { modeParam, parseMode, showStrength } from "./mode.ts";

describe("parseMode / modeParam", () => {
  it("reads ?modo=almanaque and defaults to Clássico", () => {
    expect(parseMode("almanaque")).toBe("almanac");
    expect(parseMode(null)).toBe("classic");
    expect(parseMode("")).toBe("classic");
    expect(parseMode("outro")).toBe("classic");
  });

  it("round-trips", () => {
    expect(parseMode(modeParam("almanac"))).toBe("almanac");
    expect(parseMode(modeParam("classic"))).toBe("classic");
    expect(modeParam("classic")).toBeNull();
  });
});

describe("showStrength", () => {
  const during = ["home", "draft", "confirm", "field", "preRound", "playing", "standings"];

  it("always shows strength in Clássico", () => {
    for (const phase of [...during, "final", "replay"])
      expect(showStrength("classic", phase, "playing")).toBe(true);
  });

  it("hides strength in Almanaque until the tournament is over", () => {
    for (const phase of during) expect(showStrength("almanac", phase, null)).toBe(false);
    expect(showStrength("almanac", "replay", "playing")).toBe(false);
  });

  it("reveals strength on the final result and its replays", () => {
    expect(showStrength("almanac", "final", null)).toBe(true);
    expect(showStrength("almanac", "replay", "final")).toBe(true);
  });
});
