import type { Outcome } from "./format.ts";

const color: Record<Outcome, string> = { win: "text-win", draw: "text-draw", loss: "text-loss" };

/** Result text coloured by outcome (from the user's point of view). */
export function ResultBadge({
  outcome,
  children,
  className = "",
}: {
  outcome: Outcome | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`font-bold tabular-nums ${outcome ? color[outcome] : "text-muted"} ${className}`}
    >
      {children}
    </span>
  );
}
