/**
 * Evaluation bar and move marks (GDD §8.6). Pure functions over what the
 * blunder check already measured: no engine call happens here.
 */
import { balance } from "../config/balance.ts";
import { winChances } from "../engine/blunderCheck.ts";
import type { Termination } from "../engine/game.ts";
import type { Score } from "../engine/types.ts";

/** "!" great move, "?" mistake, "??" blunder. */
export type MoveMark = "great" | "mistake" | "blunder";

export const markGlyph: Record<MoveMark, string> = { great: "!", mistake: "?", blunder: "??" };

/** The fields of a played move the marks are read from. */
export interface MarkInput {
  color: "white" | "black";
  /** Half-move index from the start (0 = White's first move). */
  ply?: number;
  best?: boolean;
  drop?: number;
  moveProb?: number;
  /** White's point of view. */
  evalBefore?: Score;
}

/**
 * Winning chances the mover lost with the move, measured with the next
 * move's own search of the resulting position (a fresh search, more honest
 * than the mover's estimate). Undefined when either side is unanalysed.
 */
export function confirmedDrop(m: MarkInput, next?: MarkInput): number | undefined {
  if (!m.evalBefore || !next?.evalBefore) return undefined;
  const k = balance.blunderCheck.winChanceK;
  const sign = m.color === "white" ? 1 : -1;
  return Math.max(0, sign * (winChances(m.evalBefore, k) - winChances(next.evalBefore, k)));
}

/**
 * Mark of a move, or null when it is not worth pointing out (most moves).
 * `next` is the following move, whose search confirms or refutes this one:
 * "!" needs that confirmation.
 */
export function classifyMove(
  m: MarkInput,
  next?: MarkInput,
  cfg = balance.moveFeedback,
): MoveMark | null {
  if (m.drop === undefined) return null;
  const confirmed = confirmedDrop(m, next);
  const drop = confirmed ?? m.drop;
  if (drop >= cfg.blunderDrop) return "blunder";
  if (drop >= cfg.mistakeDrop) return "mistake";
  if (
    m.best &&
    m.moveProb !== undefined &&
    m.moveProb < cfg.greatMaxProb &&
    confirmed !== undefined &&
    confirmed <= cfg.greatMaxDrop &&
    isOpenMoment(m, cfg)
  ) {
    return "great";
  }
  return null;
}

/**
 * "!" only where a move can matter: out of the opening (from move
 * `greatFromMove`) and while the game is still open (the mover's winning
 * chances within ±`greatMaxChances`). Keeps routine moves unmarked.
 */
function isOpenMoment(m: MarkInput, cfg: typeof balance.moveFeedback): boolean {
  if (m.ply !== undefined && Math.floor(m.ply / 2) + 1 < cfg.greatFromMove) return false;
  if (!m.evalBefore) return false;
  const chances = winChances(m.evalBefore, balance.blunderCheck.winChanceK);
  return Math.abs(chances) <= cfg.greatMaxChances;
}

/** One ply as the bar needs it; the first ply is White's (games start from the initial position). */
export interface EvalInput {
  san: string;
  /** Score after the move, White's point of view (the mover's estimate). */
  eval?: Score;
  /** Score before the move (fresh search of the position), White's point of view. */
  evalBefore?: Score;
}

export interface EvalPoint {
  /** White's winning chances, −1…1. */
  chances: number;
  /** Score as shown: "+1,2", "−0,4", "M3", "#", or "0,0" before any analysis. */
  text: string;
}

const DRAWN_BY_RULE: ReadonlySet<Termination> = new Set([
  "stalemate",
  "threefoldRepetition",
  "fiftyMoves",
  "insufficientMaterial",
]);

/**
 * Bar value after the first `shown` plies: the last known evaluation,
 * preferring the next move's fresh search of the position (book
 * moves and unchecked sides have none), ±1 after a checkmate, 0 when the
 * game ended drawn by the rules. `termination` applies only once every ply
 * is shown.
 */
export function evalAt(
  plies: readonly EvalInput[],
  shown: number,
  termination?: Termination | null,
): EvalPoint {
  if (termination && shown >= plies.length && DRAWN_BY_RULE.has(termination)) {
    return { chances: 0, text: "½" };
  }
  for (let i = Math.min(shown, plies.length) - 1; i >= 0; i--) {
    const p = plies[i]!;
    if (p.san.endsWith("#")) return { chances: i % 2 === 0 ? 1 : -1, text: "#" };
    // The next move's search of this position beats the mover's estimate.
    const score = plies[i + 1]?.evalBefore ?? p.eval;
    if (score) {
      return {
        chances: winChances(score, balance.blunderCheck.winChanceK),
        text: formatEval(score),
      };
    }
  }
  return { chances: 0, text: formatEval({ cp: 0 }) };
}

/** Score from White's point of view, pt-BR: "+1,2", "−0,4", "M3", "−M3". */
export function formatEval(score: Score): string {
  if ("mate" in score) return `${score.mate < 0 ? "−" : ""}M${Math.abs(score.mate)}`;
  const pawns = Math.abs(score.cp) / 100;
  const sign = score.cp > 0 ? "+" : score.cp < 0 ? "−" : "";
  return `${sign}${pawns.toFixed(1).replace(".", ",")}`;
}
