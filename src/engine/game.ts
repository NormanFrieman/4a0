import { Chess } from "chess.js";
import { balance } from "../config/balance.ts";
import { deriveRng, type Rng } from "../rng/rng.ts";
import type { ChessAI } from "./types.ts";

export type Color = "white" | "black";
export type GameResult = "1-0" | "0-1" | "1/2-1/2";
export type Termination =
  | "checkmate"
  | "stalemate"
  | "threefoldRepetition"
  | "fiftyMoves"
  | "insufficientMaterial"
  | "agreement"
  | "resignation"
  | "adjudication";

/** Weighted candidate moves (UCI → weight) for a position (GDD §7.1). */
export type BookEntry = ReadonlyArray<readonly [uci: string, weight: number]>;

/** Opening repertoire of one side. Returns null when the position is out of book. */
export interface OpeningBook {
  probe(fen: string): BookEntry | null;
}

export interface SideConfig {
  ai: ChessAI;
  name?: string;
  /** Maia-3 selfElo for this side (already converted, GDD §6.2). */
  elo: number;
  temperature: number;
  topP: number;
  book?: OpeningBook;
}

/** Draw-by-agreement and resignation rules (GDD §8.2). */
export interface EndRules {
  drawOfferFromMove: number;
  drawBand: number;
  drawStableMoves: number;
  resignProb: number;
  resignStableMoves: number;
}

export interface PlayedMove {
  ply: number;
  color: Color;
  uci: string;
  san: string;
  fenAfter: string;
  source: "book" | "engine";
  /** Raw policy probability of the chosen move (engine moves only). */
  moveProb?: number;
  /** Mover's WDL for the position before the move (engine moves only). */
  wdl?: [number, number, number];
}

export interface PlayGameOptions {
  white: SideConfig;
  black: SideConfig;
  seed: string | number;
  maxPlies?: number;
  adjudicateWinProb?: number;
  /** Override draw/resign rules; `false` disables both (pure play, e.g. calibration). */
  endRules?: Partial<EndRules> | false;
  /** Extra PGN headers (Event, Round, Board…). */
  headers?: Record<string, string>;
  /** Called after each move. */
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

export function defaultEndRules(): EndRules {
  const g = balance.game;
  return {
    drawOfferFromMove: g.drawOfferFromMove,
    drawBand: g.drawBand,
    drawStableMoves: g.drawStableMoves,
    resignProb: g.resignProb,
    resignStableMoves: g.resignStableMoves,
  };
}

function parseUci(uci: string): { from: string; to: string; promotion?: string } {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    ...(uci.length > 4 ? { promotion: uci[4] } : {}),
  };
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

/** Sample a book move by weight. Returns null for an empty/invalid entry. */
function sampleBook(entry: BookEntry, rng: Rng): string | null {
  const total = entry.reduce((s, [, w]) => s + Math.max(0, w), 0);
  if (!(total > 0)) return null;
  let r = rng() * total;
  for (const [uci, w] of entry) {
    r -= Math.max(0, w);
    if (r < 0) return uci;
  }
  return entry[entry.length - 1]![0];
}

/** Mover's expected score from a WDL triple. */
const expected = ([win, draw]: [number, number, number]) => win + draw / 2;

/**
 * Play a full AI-vs-AI game (GDD §8). Book moves first, then the engine;
 * ends by chess rules, agreement, resignation or adjudication at maxPlies.
 * Deterministic for a given seed and deterministic `ChessAI`s.
 */
export async function playGame(opts: PlayGameOptions): Promise<GameRecord> {
  const maxPlies = opts.maxPlies ?? balance.game.maxPlies;
  const adjudicateWinProb = opts.adjudicateWinProb ?? balance.game.adjudicateWinProb;
  const rules = opts.endRules === false ? null : { ...defaultEndRules(), ...opts.endRules };

  const rngs = {
    white: deriveRng(opts.seed, "white"),
    black: deriveRng(opts.seed, "black"),
    adjudication: deriveRng(opts.seed, "adjudication"),
  };

  const chess = new Chess();
  const fens: string[] = [chess.fen()];
  const ucis: string[] = [];
  const moves: PlayedMove[] = [];
  /** Still following each side's book (once out, never back in). */
  const inBook = { white: !!opts.white.book, black: !!opts.black.book };
  let drawStreak = 0;
  const resignStreak = { white: 0, black: 0 };

  const finish = (
    result: GameResult,
    termination: Termination,
    adjudicationWdl?: [number, number, number],
  ): GameRecord => {
    for (const [k, v] of Object.entries(opts.headers ?? {})) chess.setHeader(k, v);
    chess.setHeader("White", opts.white.name ?? `AI ${opts.white.elo}`);
    chess.setHeader("Black", opts.black.name ?? `AI ${opts.black.elo}`);
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
    const request = {
      fen: chess.fen(),
      priorMoves: window,
      baseFen,
      selfElo: side.elo,
      oppoElo: other.elo,
      temperature: side.temperature,
      topP: side.topP,
    };

    if (ply >= maxPlies) {
      // Adjudication by Maia's WDL, from the side to move's point of view.
      const evalRes = await side.ai.chooseMove({ ...request, rng: rngs.adjudication });
      const [win, , loss] = evalRes.wdl;
      let result: GameResult = "1/2-1/2";
      if (win > adjudicateWinProb) result = color === "white" ? "1-0" : "0-1";
      else if (loss > adjudicateWinProb) result = color === "white" ? "0-1" : "1-0";
      return finish(result, "adjudication", evalRes.wdl);
    }

    // 1. Opening book (GDD §8.1 step 1).
    let record: PlayedMove | null = null;
    if (inBook[color]) {
      const entry = side.book!.probe(chess.fen());
      const uci = entry ? sampleBook(entry, rngs[color]) : null;
      let played: ReturnType<Chess["move"]> | null = null;
      if (uci) {
        try {
          played = chess.move(parseUci(uci));
        } catch {
          played = null; // Illegal book move (e.g. hash collision): leave the book.
        }
      }
      if (played && uci) {
        record = { ply, color, uci, san: played.san, fenAfter: chess.fen(), source: "book" };
      } else {
        inBook[color] = false;
      }
    }

    // 2. Engine move, plus agreement/resignation checks on its WDL (GDD §8.2).
    if (!record) {
      const res = await side.ai.chooseMove({ ...request, rng: rngs[color] });

      if (rules) {
        const score = expected(res.wdl);
        resignStreak[color] = score < rules.resignProb ? resignStreak[color] + 1 : 0;
        if (resignStreak[color] >= rules.resignStableMoves) {
          return finish(color === "white" ? "0-1" : "1-0", "resignation");
        }
        const drawable =
          chess.moveNumber() >= rules.drawOfferFromMove && Math.abs(score - 0.5) <= rules.drawBand;
        drawStreak = drawable ? drawStreak + 1 : 0;
        if (drawStreak >= rules.drawStableMoves) return finish("1/2-1/2", "agreement");
      }

      const played = chess.move(parseUci(res.move));
      record = {
        ply,
        color,
        uci: res.move,
        san: played.san,
        fenAfter: chess.fen(),
        source: "engine",
        moveProb: res.policy[res.move] ?? 0,
        wdl: res.wdl,
      };
    }

    ucis.push(record.uci);
    fens.push(chess.fen());
    moves.push(record);
    await opts.onMove?.(record);
  }
}
