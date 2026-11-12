import { sampleMove } from "./sampling.ts";
import type { ChessAI, MoveRequest, MoveResult } from "./types.ts";

/**
 * Structural subset of maia3-js `Maia3` (Node and web builds share it), so
 * this adapter stays isomorphic and testable without loading a model.
 */
export interface Maia3Predictor {
  predict(input: {
    fen: string;
    selfElo: number;
    oppoElo?: number;
    priorMoves?: string[];
    baseFen?: string;
    temperature?: number;
    topP?: number;
    topK?: number;
  }): Promise<{
    moves: Map<string, number>;
    wdl: { win: number; draw: number; loss: number };
  }>;
}

/**
 * `ChessAI` backed by Maia-3. maia3-js samples with an unseeded
 * `Math.random()`, so we ask it for argmax only (temperature 0, no top-K
 * look-ahead) and do the sampling ourselves with the request's seeded RNG.
 */
export class Maia3Engine implements ChessAI {
  constructor(private readonly maia: Maia3Predictor) {}

  async chooseMove(req: MoveRequest): Promise<MoveResult> {
    const prior = req.priorMoves.slice(-8);
    const out = await this.maia.predict({
      fen: req.fen,
      selfElo: Math.round(req.selfElo),
      oppoElo: Math.round(req.oppoElo),
      ...(prior.length > 0 ? { priorMoves: prior, baseFen: req.baseFen } : {}),
      temperature: 0,
      topK: 0,
    });
    const policy = Object.fromEntries(out.moves);
    const move = sampleMove(policy, { temperature: req.temperature, topP: req.topP, rng: req.rng });
    return { move, policy, wdl: [out.wdl.win, out.wdl.draw, out.wdl.loss] };
  }
}
