import { formatPoints } from "./format.ts";

/** Headline score of a match: "Sua seleção 1½ × ½ Iugoslávia 1974". */
export function MatchScore({
  home,
  away,
  homePoints,
  awayPoints,
  className = "",
}: {
  home: string;
  away: string;
  homePoints: number;
  awayPoints: number;
  className?: string;
}) {
  return (
    <h2
      className={`text-center font-display text-3xl leading-tight font-black sm:text-5xl ${className}`}
    >
      {home}{" "}
      <span className="whitespace-nowrap tabular-nums">
        {formatPoints(homePoints)} × {formatPoints(awayPoints)}
      </span>{" "}
      <span className="whitespace-nowrap">{away}</span>
    </h2>
  );
}
