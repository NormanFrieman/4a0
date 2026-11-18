/**
 * Evaluation bar (GDD §8.6). Pure functions over what the blunder check
 * already measured: no engine call happens here.
 */
import { balance } from "../config/balance.ts";
import { winChances } from "../engine/blunderCheck.ts";
import type { Termination } from "../engine/game.ts";
import type { Score } from "../engine/types.ts";

/** One ply as the bar needs it; the first ply is White's (games start from the initial position). */
export interface EvalInput {
  san: string;
  /** Score after the move, White's point of view (the mover's estimate). */
  eval?: Score | null;
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
