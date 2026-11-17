/**
 * Mark of a world champion (classical/unified line, `Person.worldChampion`):
 * the white king glyph, a typographic sign rather than an icon (docs/design.md).
 * `label` (i18n) is the accessible name and tooltip. It inherits the colour
 * when `inherit` is set (e.g. on a selected row with an accent background).
 */
export function ChampionMark({
  label,
  inherit = false,
  className = "",
}: {
  label: string;
  inherit?: boolean;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`font-normal not-italic ${inherit ? "" : "text-champion"} ${className}`}
    >
      ♔
    </span>
  );
}
