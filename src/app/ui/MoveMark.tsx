import { markGlyph, type MoveMark as Mark } from "../../sim/moveFeedback.ts";

const color: Record<Mark, string> = {
  great: "text-win",
  mistake: "text-draw",
  blunder: "text-loss",
};

/**
 * "!", "?" or "??" after a move (GDD §8.6), with its name (i18n) as tooltip
 * and for screen readers. `inherit` keeps the text color (selected move).
 */
export function MoveMark({
  mark,
  label,
  inherit = false,
  className = "",
}: {
  mark: Mark;
  label: string;
  inherit?: boolean;
  className?: string;
}) {
  return (
    <abbr
      title={label}
      aria-label={label}
      className={`font-bold no-underline ${inherit ? "" : color[mark]} ${className}`}
    >
      {markGlyph[mark]}
    </abbr>
  );
}
