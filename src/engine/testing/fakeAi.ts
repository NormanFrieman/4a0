import { Chess } from "chess.js";
import { sampleMove } from "../sampling.ts";
import type { ChessAI, MoveRequest, MoveResult } from "../types.ts";

type Wdl = [number, number, number];

/**
 * Uniform policy over legal moves. WDL is fixed, or computed per request
 * (e.g. to script evaluations by side or move number). Deterministic given the rng.
 */
export class UniformAI implements ChessAI {
  constructor(private readonly wdl: Wdl | ((req: MoveRequest) => Wdl) = [0.33, 0.34, 0.33]) {}

  async chooseMove(req: MoveRequest): Promise<MoveResult> {
    const legal = new Chess(req.fen).moves({ verbose: true });
    const policy: Record<string, number> = {};
    for (const m of legal) policy[m.from + m.to + (m.promotion ?? "")] = 1 / legal.length;
    const move = sampleMove(policy, req);
    const wdl = typeof this.wdl === "function" ? this.wdl(req) : this.wdl;
    return { move, policy, wdl };
  }
}

/** Plays a fixed list of UCI moves, in order, regardless of color. */
export class ScriptedAI implements ChessAI {
  private i = 0;
  constructor(private readonly script: string[]) {}

  async chooseMove(): Promise<MoveResult> {
    const move = this.script[this.i++];
    if (!move) throw new Error("ScriptedAI: script exhausted");
    return { move, policy: { [move]: 1 }, wdl: [0.5, 0, 0.5] };
  }
}
