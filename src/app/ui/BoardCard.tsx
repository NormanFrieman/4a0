import { BoardFrame } from "./BoardFrame.tsx";
import { ChampionName } from "./ChampionName.tsx";
import { EvalBar } from "./EvalBar.tsx";
import { Kicker } from "./Masthead.tsx";
import { MoveMark } from "./MoveMark.tsx";
import { ResultBadge } from "./ResultBadge.tsx";
import type { MoveMark as Mark } from "../../sim/moveFeedback.ts";
import type { Outcome } from "./format.ts";

export interface BoardCardPlayer {
  name: string;
  /** null in the Mestre mode. */
  strength: number | null;
  isUser: boolean;
  /** World champion label (i18n), only for world champions. */
  champion?: string;
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
  evaluation,
  mark,
  onOpen,
  openLabel,
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
  /** Evaluation bar (GDD §8.6); absent in the Mestre mode. */
  evaluation?: { chances: number; label: string };
  /** Mark of the move on the board, with its name (i18n). */
  mark?: { mark: Mark; label: string };
  /** Opens the game's replay: the board becomes clickable when given. */
  onOpen?: () => void;
  /** Accessible name of the clickable board (i18n). */
  openLabel?: string;
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
      <ChampionName
        name={p.name}
        champion={p.champion}
        className={p.isUser ? "font-bold" : "italic"}
      />{" "}
      {p.strength !== null && <span className="text-muted tabular-nums">{p.strength}</span>}
    </div>
  );
  const orientation = userIsBlack ? "black" : "white";
  const frame = <BoardFrame fen={fen} lastMove={lastMove} orientation={orientation} />;
  const board = evaluation ? (
    <div className="flex gap-1">
      <EvalBar chances={evaluation.chances} label={evaluation.label} orientation={orientation} />
      <div className="min-w-0 flex-1">{frame}</div>
    </div>
  ) : (
    frame
  );
  return (
    <figure className={`min-w-0 ${className}`}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <Kicker>{boardLabel}</Kicker>
        <ResultBadge outcome={outcome} className="truncate text-sm">
          {status}
          {mark && <MoveMark mark={mark.mark} label={mark.label} className="ml-1" />}
        </ResultBadge>
      </div>
      {onOpen ? (
        // A div, not a <button>: the board is block content.
        <div
          role="button"
          tabIndex={0}
          aria-label={openLabel}
          title={openLabel}
          onClick={onOpen}
          onKeyDown={(e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            onOpen();
          }}
          className="cursor-pointer transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {board}
        </div>
      ) : (
        board
      )}
      <figcaption className="mt-1.5 text-sm leading-snug">
        {userIsBlack ? line(white, "white") : line(black, "black")}
        {userIsBlack ? line(black, "black") : line(white, "white")}
      </figcaption>
    </figure>
  );
}
