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
  best?: boolean;
  drop?: number;
  moveProb?: number;
}

/** Mark of a move, or null when it is not worth pointing out (most moves). */
export function classifyMove(m: MarkInput, cfg = balance.moveFeedback): MoveMark | null {
  if (m.drop === undefined) return null;
  if (m.drop >= cfg.blunderDrop) return "blunder";
  if (m.drop >= cfg.mistakeDrop) return "mistake";
  if (m.best && m.moveProb !== undefined && m.moveProb < cfg.greatMaxProb) return "great";
  return null;
}

/** One ply as the bar needs it; the first ply is White's (games start from the initial position). */
export interface EvalInput {
  san: string;
  /** White's point of view. */
  eval?: Score;
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
 * Bar value after the first `shown` plies: the last known evaluation (book
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
    if (p.eval) {
      return {
        chances: winChances(p.eval, balance.blunderCheck.winChanceK),
        text: formatEval(p.eval),
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
