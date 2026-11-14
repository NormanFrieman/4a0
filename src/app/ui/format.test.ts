import { describe, expect, it } from "vitest";
import { formatPoints, outcomeOf } from "./format.ts";

describe("formatPoints", () => {
  it("uses the half sign", () => {
    expect(formatPoints(0)).toBe("0");
    expect(formatPoints(0.5)).toBe("½");
    expect(formatPoints(3)).toBe("3");
    expect(formatPoints(17.5)).toBe("17½");
  });
});

describe("outcomeOf", () => {
  it("maps the user's share to an outcome", () => {
    expect(outcomeOf(1)).toBe("win");
    expect(outcomeOf(0.5)).toBe("draw");
    expect(outcomeOf(0)).toBe("loss");
    expect(outcomeOf(2.5 / 4)).toBe("win");
  });
});
