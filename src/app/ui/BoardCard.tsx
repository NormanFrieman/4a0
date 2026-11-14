import { BoardFrame } from "./BoardFrame.tsx";
import { Kicker } from "./Masthead.tsx";
import { ResultBadge } from "./ResultBadge.tsx";
import type { Outcome } from "./format.ts";

export interface BoardCardPlayer {
  name: string;
  /** null in the Almanaque mode. */
  strength: number | null;
  isUser: boolean;
}

/**
 * One game of a match in the Round screen. The four boards of a round always
 * have the same size so the user can follow every game (GDD §10.1); lay them
 * out with `grid grid-cols-2 lg:grid-cols-4`.
 */
export function BoardCard({
  boardLabel,
  status,
  outcome,
  fen,
  lastMove,
  white,
  black,
  className = "",
}: {
  boardLabel: string;
  /** "lance 23…" while live, "½-½ · empate" when finished. */
  status: string;
  /** null while the game is live. */
  outcome: Outcome | null;
  fen: string;
  lastMove?: readonly [string, string];
  white: BoardCardPlayer;
  black: BoardCardPlayer;
  /** Extra classes, e.g. a width cap so the board fits the viewport height. */
  className?: string;
}) {
  const userIsBlack = black.isUser;
  const line = (p: BoardCardPlayer, color: "white" | "black") => (
    <div className="truncate">
      <span
        aria-hidden
        className={`mr-1 inline-block size-2.5 border border-ink align-middle ${color === "white" ? "bg-white" : "bg-ink"}`}
      />
      <span className={p.isUser ? "font-bold" : "italic"}>{p.name}</span>{" "}
      {p.strength !== null && <span className="text-muted tabular-nums">{p.strength}</span>}
    </div>
  );
  return (
    <figure className={`min-w-0 ${className}`}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <Kicker>{boardLabel}</Kicker>
        <ResultBadge outcome={outcome} className="truncate text-sm">
          {status}
        </ResultBadge>
      </div>
      <BoardFrame fen={fen} lastMove={lastMove} orientation={userIsBlack ? "black" : "white"} />
      <figcaption className="mt-1.5 text-sm leading-snug">
        {userIsBlack ? line(white, "white") : line(black, "black")}
        {userIsBlack ? line(black, "black") : line(white, "white")}
      </figcaption>
    </figure>
  );
}
