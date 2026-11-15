/**
 * Move-quality metrics for AI-vs-AI games (docs/benchmarks.md, "Qualidade
 * dos lances"). Pure functions over a `GameRecord`, so they run inside the
 * benchmark workers and in tests.
 */
import { Chess } from "chess.js";
import { winChances } from "../../src/engine/blunderCheck.ts";
import type { GameRecord, PlayedMove } from "../../src/engine/game.ts";
import type { PositionEvaluator, Score } from "../../src/engine/types.ts";

/** Thresholds for the quality metrics. Measurement-only, not game balance. */
export const qualityThresholds = {
  /** Expected-score drops counted as blunders (mover's POV, one ply). */
  blunderDrops: [0.25, 0.4] as const,
  /** Material lead (pawn units) that counts as "a piece up". */
  materialLead: 3,
  /** Plies the lead must last, so trades in progress don't count. */
  materialStablePlies: 6,
  /** Only leads reached before this ply count as early (move 30). */
  earlyPly: 60,
};

const pieceValue: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** White material minus black material, in pawn units, from a FEN. */
export function materialBalance(fen: string): number {
  let bal = 0;
  for (const ch of fen.split(" ")[0]!) {
    const v = pieceValue[ch.toLowerCase()];
    if (v === undefined) continue;
    bal += ch === ch.toUpperCase() ? v : -v;
  }
  return bal;
}

/** Does the side to move in `fen` have a mate in one? */
export function hasMateInOne(fen: string): boolean {
  const chess = new Chess(fen);
  for (const m of chess.moves({ verbose: true })) {
    chess.move(m);
    const mate = chess.isCheckmate();
    chess.undo();
    if (mate) return true;
  }
  return false;
}

const expected = (wdl: [number, number, number]) => wdl[0] + wdl[1] / 2;

export interface GameQuality {
  /** Engine moves with a known one-ply drop (both evaluations available). */
  scoredMoves: number;
  /** Count of moves whose drop reached each of `blunderDrops`. */
  blunders: number[];
  /** Moves after which the opponent had a mate in one. */
  allowedMateInOne: number;
  /** Moves that missed an available mate in one. */
  missedMateInOne: number;
  /** A side kept a lead of `materialLead`+ for `materialStablePlies` before `earlyPly`. */
  earlyMaterialLead: boolean;
  /** Largest absolute material balance at any point. */
  maxMaterialLead: number;
}

/**
 * Quality of one game. The drop of a move is the mover's expected score
 * before it minus (1 − the opponent's expected score right after it), both
 * from Maia's WDL. It needs two consecutive engine moves, so book moves and
 * the last move are not scored.
 */
export function gameQuality(
  record: Pick<GameRecord, "moves">,
  thresholds = qualityThresholds,
  startFen = new Chess().fen(),
): GameQuality {
  const moves: PlayedMove[] = record.moves;
  const blunders = thresholds.blunderDrops.map(() => 0);
  let scoredMoves = 0;
  let allowedMateInOne = 0;
  let missedMateInOne = 0;

  for (let i = 0; i < moves.length; i++) {
    const m = moves[i]!;
    const next = moves[i + 1];
    if (m.wdl && next?.wdl) {
      scoredMoves++;
      const drop = expected(m.wdl) - (1 - expected(next.wdl));
      thresholds.blunderDrops.forEach((t, k) => {
        if (drop >= t) blunders[k]!++;
      });
    }
    if (m.source === "engine") {
      const before = i === 0 ? startFen : moves[i - 1]!.fenAfter;
      const after = new Chess(m.fenAfter);
      if (hasMateInOne(before) && !after.isCheckmate()) missedMateInOne++;
      if (!after.isGameOver() && hasMateInOne(m.fenAfter)) allowedMateInOne++;
    }
  }

  let earlyMaterialLead = false;
  let maxMaterialLead = 0;
  let streak = 0;
  let streakSign = 0;
  for (const m of moves) {
    const bal = materialBalance(m.fenAfter);
    maxMaterialLead = Math.max(maxMaterialLead, Math.abs(bal));
    const sign = Math.abs(bal) >= thresholds.materialLead ? Math.sign(bal) : 0;
    streak = sign !== 0 && sign === streakSign ? streak + 1 : sign !== 0 ? 1 : 0;
    streakSign = sign;
    if (streak >= thresholds.materialStablePlies && m.ply < thresholds.earlyPly) {
      earlyMaterialLead = true;
    }
  }

  return {
    scoredMoves,
    blunders,
    allowedMateInOne,
    missedMateInOne,
    earlyMaterialLead,
    maxMaterialLead,
  };
}

/** Lichess move classification by winning-chances drop (scale −1…1). */
export const lichessThresholds = { inaccuracy: 0.1, mistake: 0.2, blunder: 0.3 };
/** Centipawn cap for ACPL, as on Lichess. */
const CP_CAP = 1000;

export interface LichessQuality {
  /** Engine moves classified (book moves are skipped). */
  moves: number;
  inaccuracies: number;
  mistakes: number;
  blunders: number;
  /** Sum of centipawn losses, capped at ±1000 per evaluation. */
  cpLoss: number;
}

const cpOf = (s: Score) =>
  "mate" in s ? (s.mate > 0 ? CP_CAP : -CP_CAP) : Math.max(-CP_CAP, Math.min(CP_CAP, s.cp));

/**
 * Lichess-style analysis of a game with a deep Stockfish search per position:
 * each engine move is classified by the drop in winning chances between the
 * position before it (mover's view) and after it (negated opponent's view).
 */
export async function lichessQuality(
  record: Pick<GameRecord, "moves">,
  evaluator: PositionEvaluator,
  nodes: number,
  k: number,
  startFen = new Chess().fen(),
): Promise<LichessQuality> {
  const fens = [startFen, ...record.moves.map((m) => m.fenAfter)];
  const scores: Score[] = [];
  for (const f of fens) {
    const c = new Chess(f);
    if (c.isCheckmate()) scores.push({ mate: 0 });
    else if (c.isGameOver()) scores.push({ cp: 0 });
    else scores.push((await evaluator.analyse(f, { nodes })).score);
  }
  const q: LichessQuality = { moves: 0, inaccuracies: 0, mistakes: 0, blunders: 0, cpLoss: 0 };
  record.moves.forEach((m, i) => {
    if (m.source !== "engine") return;
    const before = scores[i]!;
    const after = scores[i + 1]!;
    const drop = winChances(before, k) + winChances(after, k);
    q.moves++;
    if (drop >= lichessThresholds.blunder) q.blunders++;
    else if (drop >= lichessThresholds.mistake) q.mistakes++;
    else if (drop >= lichessThresholds.inaccuracy) q.inaccuracies++;
    q.cpLoss += Math.max(0, cpOf(before) + cpOf(after));
  });
  return q;
}
