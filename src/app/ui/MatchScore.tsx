import { formatPoints } from "./format.ts";

/** Headline score of a match: "Sua seleção 1½ × ½ Iugoslávia 1974". */
export function MatchScore({
  home,
  away,
  homePoints,
  awayPoints,
}: {
  home: string;
  away: string;
  homePoints: number;
  awayPoints: number;
}) {
  return (
    <h2 className="text-center font-display text-3xl leading-tight font-black sm:text-5xl">
      {home}{" "}
      <span className="whitespace-nowrap tabular-nums">
        {formatPoints(homePoints)} × {formatPoints(awayPoints)}
      </span>{" "}
      <span className="whitespace-nowrap">{away}</span>
    </h2>
  );
}
