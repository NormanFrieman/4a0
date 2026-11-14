import { describe, expect, it } from "vitest";
import { expectedScore } from "./elo.ts";

describe("expectedScore", () => {
  it("follows the Elo curve", () => {
    expect(expectedScore(1500, 1500)).toBeCloseTo(0.5);
    expect(expectedScore(1600, 1500)).toBeCloseTo(0.64, 2);
    expect(expectedScore(1700, 1500)).toBeCloseTo(0.76, 2);
  });
});
