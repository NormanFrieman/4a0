import { describe, expect, it } from "vitest";
import { moveMarkSvg } from "./moveMarkSvg.ts";

describe("moveMarkSvg", () => {
  it("draws each glyph with design tokens only (no literal colours)", () => {
    for (const [mark, glyph, token] of [
      ["great", "!", "--color-win"],
      ["mistake", "?", "--color-draw"],
      ["blunder", "??", "--color-loss"],
    ] as const) {
      const svg = moveMarkSvg(mark);
      expect(svg).toContain(`>${glyph}</text>`);
      expect(svg).toContain(`fill="var(${token})"`);
      expect(svg).toContain('stroke="var(--color-paper)"');
      expect(svg).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(/i);
    }
  });
});
