import { describe, expect, it } from "vitest";
import { modeParam, parseMode, showStrength } from "./mode.ts";

describe("parseMode / modeParam", () => {
  it("reads ?modo=mestre and defaults to Clássico", () => {
    expect(parseMode("mestre")).toBe("master");
    expect(parseMode(null)).toBe("classic");
    expect(parseMode("")).toBe("classic");
    expect(parseMode("outro")).toBe("classic");
  });

  it("round-trips", () => {
    expect(parseMode(modeParam("master"))).toBe("master");
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

  it("hides strength in Mestre until the tournament is over", () => {
    for (const phase of during) expect(showStrength("master", phase, null)).toBe(false);
    expect(showStrength("master", "replay", "playing")).toBe(false);
  });

  it("reveals strength on the final result and its replays", () => {
    expect(showStrength("master", "final", null)).toBe(true);
    expect(showStrength("master", "replay", "final")).toBe(true);
  });
});
