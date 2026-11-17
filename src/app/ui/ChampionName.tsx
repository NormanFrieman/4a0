/**
 * A player's name. World champions (`Person.worldChampion`) get it in gold,
 * with `champion` (the i18n label) as tooltip and for screen readers; pass
 * `champion` only for them. `inherit` keeps the text colour (e.g. on a
 * selected row with an accent background).
 */
export function ChampionName({
  name,
  champion,
  inherit = false,
  className = "",
}: {
  name: string;
  champion?: string | undefined;
  inherit?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`${champion && !inherit ? "text-champion" : ""} ${className}`}
      title={champion}
    >
      {name}
      {champion && <span className="sr-only"> ({champion})</span>}
    </span>
  );
}
