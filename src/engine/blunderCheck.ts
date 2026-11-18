/**
 * Blunder check (GDD §8.1): Maia picks the move, Stockfish vetoes it when it
 * throws away too much. Maia keeps the human style; the check removes the
 * tactical oversights that a master would not make.
 */
import { Chess } from "chess.js";
import { balance, type BlunderTolerancePoint } from "../config/balance.ts";
import { sampleMove } from "./sampling.ts";
import { interpolate } from "./strength.ts";
import type {
  Analysis,
  ChessAI,
  MoveCheck,
  MoveRequest,
  MoveResult,
  PositionEvaluator,
  Score,
} from "./types.ts";

export interface BlunderCheckConfig {
  nodes: number;
  maxTries: number;
  winChanceK: number;
  tolerance: readonly BlunderTolerancePoint[];
}

/**
 * Winning chances (−1…1) of a score, Lichess formula; mates are ±1. "Mate 0"
 * (side to move is checkmated) counts as lost.
 */
export function winChances(score: Score, k: number): number {
  if ("mate" in score) return score.mate > 0 ? 1 : -1;
  return 2 / (1 + Math.exp(-k * score.cp)) - 1;
}

/** Allowed drop in winning chances for a selfElo. */
export function toleranceFor(selfElo: number, cfg: BlunderCheckConfig): number {
  return interpolate(
    cfg.tolerance.map((p) => [p.selfElo, p.maxDrop] as const),
    selfElo,
  );
}

/** Analyses kept per checker; a game only needs the last couple of positions. */
const CACHE_SIZE = 64;

/**
 * `ChessAI` decorator. If the inner AI's move loses more winning chances
 * than the tolerance (compared with Stockfish's best move), the move leaves
 * the policy and another one is sampled with the request's seeded RNG, up to
 * `maxTries` moves; then Stockfish's best move is played. The returned
 * policy and WDL are the inner AI's, unchanged.
 *
 * Cost: a move is judged by searching the position after it, which is also
 * the next ply's position, so each analysis is cached by FEN and a game
 * needs about one search per move. Searches are deterministic, so the cache
 * never changes a result.
 */
export class BlunderCheckedAI implements ChessAI {
  private readonly cache = new Map<string, Analysis>();

  constructor(
    private readonly inner: ChessAI,
    private readonly evaluator: PositionEvaluator,
    private readonly cfg: BlunderCheckConfig = balance.blunderCheck,
  ) {}

  private async analyse(fen: string): Promise<Analysis> {
    const hit = this.cache.get(fen);
    if (hit) return hit;
    const a = await this.evaluator.analyse(fen, { nodes: this.cfg.nodes });
    this.cache.set(fen, a);
    if (this.cache.size > CACHE_SIZE) this.cache.delete(this.cache.keys().next().value!);
    return a;
  }

  async chooseMove(req: MoveRequest): Promise<MoveResult> {
    const res = await this.inner.chooseMove(req);
    const maxDrop = toleranceFor(req.selfElo, this.cfg);
    if (maxDrop >= 2) return res;

    const k = this.cfg.winChanceK;
    const root = await this.analyse(req.fen);
    const bestChances = winChances(root.score, k);
    const policy = { ...res.policy };
    const best: MoveCheck = {
      scoreBefore: root.score,
      scoreAfter: root.score,
      best: true,
      drop: 0,
    };
    let move = res.move;
    for (let i = 0; i < this.cfg.maxTries; i++) {
      if (move === root.bestMove) return { ...res, move, check: best };
      const after = new Chess(req.fen);
      after.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] });
      // The position after the move is scored for the opponent.
      const raw = (await this.analyse(after.fen())).score;
      const drop = bestChances + winChances(raw, k);
      if (drop <= maxDrop) {
        // A checkmate scores "mate 0" for the mated side, which negates to
        // itself; consumers read mates from the move (GDD §8.6).
        const scoreAfter = negateScore(raw);
        return {
          ...res,
          move,
          check: { scoreBefore: root.score, scoreAfter, best: false, drop: Math.max(0, drop) },
        };
      }
      delete policy[move];
      if (Object.keys(policy).length === 0) break;
      move = sampleMove(policy, { temperature: req.temperature, topP: req.topP, rng: req.rng });
    }
    return root.bestMove ? { ...res, move: root.bestMove, check: best } : { ...res, move };
  }
}

/** The same score from the other side's point of view. */
export function negateScore(score: Score): Score {
  return "mate" in score ? { mate: -score.mate } : { cp: -score.cp };
}
