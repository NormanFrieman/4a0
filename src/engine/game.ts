import { Chess } from "chess.js";
import { balance } from "../config/balance.ts";
import { deriveRng } from "../rng/rng.ts";
import { thinkTimeMs } from "./thinkTime.ts";
import type { ChessAI } from "./types.ts";

export type Color = "white" | "black";
export type GameResult = "1-0" | "0-1" | "1/2-1/2";
export type Termination =
  | "checkmate"
  | "stalemate"
  | "threefoldRepetition"
  | "fiftyMoves"
  | "insufficientMaterial"
  | "timeout"
  | "adjudication";

export interface SideConfig {
  ai: ChessAI;
  name?: string;
  /** Effective rating used as selfElo for this game. */
  elo: number;
  temperature: number;
  topP: number;
}

export interface TimeControl {
  baseSeconds: number;
  incrementSeconds: number;
}

export interface PlayedMove {
  ply: number;
  color: Color;
  uci: string;
  san: string;
  fenAfter: string;
  /** Simulated think time. */
  thinkMs: number;
  /** Clocks after the move (increment included). */
  clocksMs: { white: number; black: number };
  /** Raw policy probability of the chosen move. */
  moveProb: number;
  /** Mover's WDL for the position before the move. */
  wdl: [number, number, number];
}

export interface PlayGameOptions {
  white: SideConfig;
  black: SideConfig;
  seed: string | number;
  timeControl?: TimeControl;
  maxPlies?: number;
  adjudicateWinProb?: number;
  /** Called after each move, e.g. to stream it to clients. */
  onMove?: (move: PlayedMove) => void | Promise<void>;
}

export interface GameRecord {
  result: GameResult;
  termination: Termination;
  moves: PlayedMove[];
  pgn: string;
  finalFen: string;
  /** For adjudication: the side-to-move WDL used to decide. */
  adjudicationWdl?: [number, number, number];
}

function parseUci(uci: string): { from: string; to: string; promotion?: string } {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    ...(uci.length > 4 ? { promotion: uci[4] } : {}),
  };
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function naturalEnd(chess: Chess): { result: GameResult; termination: Termination } | null {
  if (chess.isCheckmate()) {
    return { result: chess.turn() === "w" ? "0-1" : "1-0", termination: "checkmate" };
  }
  if (chess.isStalemate()) return { result: "1/2-1/2", termination: "stalemate" };
  if (chess.isInsufficientMaterial()) {
    return { result: "1/2-1/2", termination: "insufficientMaterial" };
  }
  if (chess.isThreefoldRepetition()) {
    return { result: "1/2-1/2", termination: "threefoldRepetition" };
  }
  if (chess.isDrawByFiftyMoves()) return { result: "1/2-1/2", termination: "fiftyMoves" };
  return null;
}

/**
 * Play a full AI-vs-AI game with simulated clocks (GDD §6.4). Deterministic
 * for a given seed and deterministic `ChessAI`s.
 */
export async function playGame(opts: PlayGameOptions): Promise<GameRecord> {
  const tc = opts.timeControl ?? balance.timeControl;
  const maxPlies = opts.maxPlies ?? balance.maxPlies;
  const adjudicateWinProb = opts.adjudicateWinProb ?? balance.adjudicateWinProb;

  const rngs = {
    white: deriveRng(opts.seed, "white"),
    black: deriveRng(opts.seed, "black"),
    clock: deriveRng(opts.seed, "clock"),
    adjudication: deriveRng(opts.seed, "adjudication"),
  };

  const chess = new Chess();
  const fens: string[] = [chess.fen()];
  const ucis: string[] = [];
  const moves: PlayedMove[] = [];
  const clocks = { white: tc.baseSeconds * 1000, black: tc.baseSeconds * 1000 };

  const finish = (
    result: GameResult,
    termination: Termination,
    adjudicationWdl?: [number, number, number],
  ): GameRecord => {
    chess.setHeader("White", opts.white.name ?? `AI ${opts.white.elo}`);
    chess.setHeader("Black", opts.black.name ?? `AI ${opts.black.elo}`);
    chess.setHeader("WhiteElo", String(Math.round(opts.white.elo)));
    chess.setHeader("BlackElo", String(Math.round(opts.black.elo)));
    chess.setHeader("TimeControl", `${tc.baseSeconds}+${tc.incrementSeconds}`);
    chess.setHeader("Result", result);
    chess.setHeader("Termination", termination);
    return {
      result,
      termination,
      moves,
      pgn: chess.pgn(),
      finalFen: chess.fen(),
      ...(adjudicationWdl ? { adjudicationWdl } : {}),
    };
  };

  for (;;) {
    const end = naturalEnd(chess);
    if (end) return finish(end.result, end.termination);

    const ply = ucis.length;
    const color: Color = chess.turn() === "w" ? "white" : "black";
    const side = color === "white" ? opts.white : opts.black;
    const other = color === "white" ? opts.black : opts.white;
    const window = ucis.slice(-8);
    const baseFen = fens[fens.length - 1 - window.length]!;

    if (ply >= maxPlies) {
      // Adjudication by Maia's WDL, from the side to move's point of view.
      const evalRes = await side.ai.chooseMove({
        fen: chess.fen(),
        priorMoves: window,
        baseFen,
        selfElo: side.elo,
        oppoElo: other.elo,
        temperature: side.temperature,
        topP: side.topP,
        rng: rngs.adjudication,
      });
      const [win, , loss] = evalRes.wdl;
      let result: GameResult = "1/2-1/2";
      if (win > adjudicateWinProb) result = color === "white" ? "1-0" : "0-1";
      else if (loss > adjudicateWinProb) result = color === "white" ? "0-1" : "1-0";
      return finish(result, "adjudication", evalRes.wdl);
    }

    const res = await side.ai.chooseMove({
      fen: chess.fen(),
      priorMoves: window,
      baseFen,
      selfElo: side.elo,
      oppoElo: other.elo,
      temperature: side.temperature,
      topP: side.topP,
      rng: rngs[color],
    });

    const topMoveProb = Math.max(...Object.values(res.policy));
    const thinkMs = thinkTimeMs({ ply, topMoveProb, remainingMs: clocks[color], rng: rngs.clock });
    if (thinkMs >= clocks[color]) {
      clocks[color] = 0;
      return finish(color === "white" ? "0-1" : "1-0", "timeout");
    }
    clocks[color] = clocks[color] - thinkMs + tc.incrementSeconds * 1000;

    const played = chess.move(parseUci(res.move));
    chess.setComment(`[%clk ${formatClock(clocks[color])}]`);
    ucis.push(res.move);
    fens.push(chess.fen());

    const record: PlayedMove = {
      ply,
      color,
      uci: res.move,
      san: played.san,
      fenAfter: chess.fen(),
      thinkMs,
      clocksMs: { ...clocks },
      moveProb: res.policy[res.move] ?? 0,
      wdl: res.wdl,
    };
    moves.push(record);
    await opts.onMove?.(record);
  }
}
