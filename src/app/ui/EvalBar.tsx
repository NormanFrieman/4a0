/**
 * Evaluation bar beside a board (GDD §8.6), "thin rule" style: ink for Black,
 * paper for White, a hairline outline in `line` and a tick at 0,0. White's
 * share grows from White's side of the board; the bar stretches to the
 * height of its row. `text` (Replay) prints the score at the leading side.
 */
export function EvalBar({
  chances,
  label,
  text,
  orientation = "white",
  className = "",
}: {
  /** White's winning chances, −1…1. */
  chances: number;
  /** Accessible name and tooltip, e.g. "Avaliação: +1,2" (i18n). */
  label: string;
  /** Score printed on the bar ("+1,2"); omit on small boards. */
  text?: string;
  orientation?: "white" | "black";
  className?: string;
}) {
  const white = Math.round(((Math.max(-1, Math.min(1, chances)) + 1) / 2) * 1000) / 10;
  const whiteAtBottom = orientation === "white";
  // The score sits at the end of the side that is ahead, in that side's ink.
  const whiteAhead = chances >= 0;
  const textAtBottom = whiteAhead === whiteAtBottom;
  return (
    <div
      role="img"
      aria-label={label}
      title={label}
      className={`relative w-2.5 shrink-0 bg-ink shadow-[0_0_0_1px_var(--color-line)] ${className}`}
    >
      <div
        className={`absolute inset-x-0 bg-paper transition-[height] duration-300 ${whiteAtBottom ? "bottom-0" : "top-0"}`}
        style={{ height: `${white}%` }}
      />
      <div aria-hidden className="absolute inset-x-0 top-1/2 border-t border-muted" />
      {text && (
        <span
          aria-hidden
          className={`absolute right-0 left-0 rotate-180 text-center text-[9px] leading-none font-bold tabular-nums [writing-mode:vertical-rl] ${whiteAhead ? "text-ink" : "text-paper"} ${textAtBottom ? "bottom-1" : "top-1"}`}
        >
          {text}
        </span>
      )}
    </div>
  );
}
