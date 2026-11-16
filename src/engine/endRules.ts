import { balance } from "../config/balance.ts";

export type Color = "white" | "black";
export type Wdl = [number, number, number];

/** Draw-by-agreement and resignation rules (GDD §8.2). */
export interface EndRules {
  drawOfferFromMove: number;
  drawBand: number;
  drawStableMoves: number;
  resignProb: number;
  resignStableMoves: number;
  /** Full move number before which nobody resigns (the streak still counts). */
  resignFromMove: number;
}

export function defaultEndRules(): EndRules {
  const g = balance.game;
  return {
    drawOfferFromMove: g.drawOfferFromMove,
    drawBand: g.drawBand,
    drawStableMoves: g.drawStableMoves,
    resignProb: g.resignProb,
    resignStableMoves: g.resignStableMoves,
    resignFromMove: g.resignFromMove,
  };
}

/** Mover's expected score from a WDL triple. */
export const expectedScore = ([win, draw]: Wdl) => win + draw / 2;

export type EndRuleOutcome =
  | { termination: "resignation"; loser: Color }
  | { termination: "agreement" };

/**
 * Applies the end rules to the engine evaluations of a game, in order. Book
 * moves are not evaluated and don't touch the streaks. Holds no randomness:
 * the rules only stop a game early, so replaying the evaluations of a game
 * played without rules gives exactly the game that would have been played
 * with them (tools/engine/endRules.ts).
 */
export class EndRuleTracker {
  private drawStreak = 0;
  private readonly resignStreak = { white: 0, black: 0 };

  constructor(private readonly rules: EndRules) {}

  /** Call before the engine's move is played, with the mover's WDL. */
  onEngineEval(color: Color, moveNumber: number, wdl: Wdl): EndRuleOutcome | null {
    const r = this.rules;
    const score = expectedScore(wdl);
    this.resignStreak[color] = score < r.resignProb ? this.resignStreak[color] + 1 : 0;
    if (this.resignStreak[color] >= r.resignStableMoves && moveNumber >= r.resignFromMove) {
      return { termination: "resignation", loser: color };
    }
    const drawable = moveNumber >= r.drawOfferFromMove && Math.abs(score - 0.5) <= r.drawBand;
    this.drawStreak = drawable ? this.drawStreak + 1 : 0;
    if (this.drawStreak >= r.drawStableMoves) return { termination: "agreement" };
    return null;
  }
}
