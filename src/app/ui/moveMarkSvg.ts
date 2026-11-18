import { markGlyph, type MoveMark } from "../../sim/moveFeedback.ts";

/** Ink of each mark: the result tokens (GDD §8.6, docs/design.md). */
export const markColor: Record<MoveMark, string> = {
  great: "var(--color-win)",
  mistake: "var(--color-draw)",
  blunder: "var(--color-loss)",
};

/**
 * Glyph drawn on the destination square (chessground `customSvg`, a 100 × 100
 * box over the square, origin at its top-left): "margin notation", Fraunces 900 italic in the
 * mark's colour with a paper outline, at the square's top-right corner.
 */
export function moveMarkSvg(mark: MoveMark): string {
  return (
    `<text x="106" y="40" text-anchor="end" font-family="Fraunces, Georgia, serif" ` +
    `font-weight="900" font-style="italic" font-size="68" letter-spacing="-4" ` +
    `fill="${markColor[mark]}" stroke="var(--color-paper)" stroke-width="8" ` +
    `stroke-linejoin="round" paint-order="stroke">${markGlyph[mark]}</text>`
  );
}
