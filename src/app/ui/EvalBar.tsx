/**
 * Evaluation bar beside a board (GDD §8.6): White's share grows from White's
 * side of the board. Stretches to the height of its row.
 */
export function EvalBar({
  chances,
  label,
  orientation = "white",
  className = "",
}: {
  /** White's winning chances, −1…1. */
  chances: number;
  /** Accessible name and tooltip, e.g. "Avaliação: +1,2" (i18n). */
  label: string;
  orientation?: "white" | "black";
  className?: string;
}) {
  const white = Math.round(((Math.max(-1, Math.min(1, chances)) + 1) / 2) * 1000) / 10;
  return (
    <div
      role="img"
      aria-label={label}
      title={label}
      className={`relative w-2 shrink-0 overflow-hidden border border-ink bg-ink ${className}`}
    >
      <div
        className={`absolute inset-x-0 bg-white transition-[height] duration-300 ${orientation === "white" ? "bottom-0" : "top-0"}`}
        style={{ height: `${white}%` }}
      />
    </div>
  );
}
