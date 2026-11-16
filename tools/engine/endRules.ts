/**
 * Offline end-rule sweeps. The rules (GDD §8.2) hold no randomness and only
 * stop a game early, so a game played *without* rules, with its per-ply
 * evaluations recorded, gives the exact game under any rule set: replay the
 * evaluations through `EndRuleTracker` and cut at the first trigger.
 */
import type { GameRecord, GameResult } from "../../src/engine/game.ts";
import {
  type Color,
  type EndRules,
  EndRuleTracker,
  expectedScore,
  type Wdl,
} from "../../src/engine/endRules.ts";

/** A game played with `endRules: false`, reduced to what the replay needs. */
export interface RecordedGame {
  result: GameResult;
  termination: string;
  /** Mover's WDL per ply, before the move; null for book moves. */
  evals: Array<Wdl | null>;
}

export function recordGame(g: GameRecord): RecordedGame {
  return {
    result: g.result,
    termination: g.termination,
    evals: g.moves.map((m) => (m.source === "engine" && m.wdl ? m.wdl : null)),
  };
}

export interface ReplayedGame {
  result: GameResult;
  termination: string;
  /** Half-moves actually played. */
  plies: number;
  /** Full move number of the resignation. */
  resignMove?: number;
  /**
   * Games decided on the board (mate, stalemate, adjudication): the longest
   * run of the final loser's (or, for draws, either side's) own moves at the
   * end with expected score below `hopelessScore` — a lost ending played out.
   */
  hopelessTail: number;
}

const colorOf = (ply: number): Color => (ply % 2 === 0 ? "white" : "black");
const moveNumberOf = (ply: number) => Math.floor(ply / 2) + 1;

function trailingHopeless(
  evals: Array<Wdl | null>,
  end: number,
  color: Color,
  hopelessScore: number,
): number {
  let run = 0;
  for (let p = end - 1; p >= 0; p--) {
    if (colorOf(p) !== color) continue;
    const e = evals[p];
    if (!e || expectedScore(e) >= hopelessScore) break;
    run++;
  }
  return run;
}

export function replayEndRules(
  g: RecordedGame,
  rules: EndRules | false,
  hopelessScore = 0.1,
): ReplayedGame {
  if (rules) {
    const tracker = new EndRuleTracker(rules);
    for (let ply = 0; ply < g.evals.length; ply++) {
      const wdl = g.evals[ply];
      if (!wdl) continue;
      const out = tracker.onEngineEval(colorOf(ply), moveNumberOf(ply), wdl);
      if (out?.termination === "resignation") {
        return {
          result: out.loser === "white" ? "0-1" : "1-0",
          termination: "resignation",
          plies: ply,
          resignMove: moveNumberOf(ply),
          hopelessTail: 0,
        };
      }
      if (out?.termination === "agreement") {
        return { result: "1/2-1/2", termination: "agreement", plies: ply, hopelessTail: 0 };
      }
    }
  }
  const end = g.evals.length;
  const tail = (c: Color) => trailingHopeless(g.evals, end, c, hopelessScore);
  const hopelessTail =
    g.result === "1-0"
      ? tail("black")
      : g.result === "0-1"
        ? tail("white")
        : Math.max(tail("white"), tail("black"));
  return { result: g.result, termination: g.termination, plies: end, hopelessTail };
}
