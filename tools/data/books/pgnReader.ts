/**
 * Minimal multi-game PGN reader for the opening books (GDD §7.1). Keeps only
 * what a book needs: players, year and the first plies (FEN before + UCI).
 * Comments, variations and NAGs are dropped; moves are replayed with chess.js.
 */
import { Chess } from "chess.js";

export interface BookPly {
  /** Position before the move. */
  fen: string;
  uci: string;
}

export interface BookGame {
  white: string;
  black: string;
  year: number;
  date: string;
  result: string;
  /** First plies of the game, at most `maxPlies`. */
  plies: BookPly[];
}

export interface PgnReadStats {
  read: number;
  noYear: number;
  illegal: number;
  nonStandardStart: number;
}

const HEADER = /^\[(\w+)\s+"(.*)"\]\s*$/;
const RESULT = /^(1-0|0-1|1\/2-1\/2|\*)$/;

/** Split movetext into SAN tokens, dropping comments, variations, NAGs and numbers. */
export function sanTokens(movetext: string): string[] {
  const out: string[] = [];
  let depth = 0;
  // Brace comments, rest-of-line comments, parentheses, or a whitespace-free run.
  const re = /\{[^}]*\}|;[^\n]*|\(|\)|[^\s(){};]+/g;
  for (const [tok] of movetext.matchAll(re)) {
    if (tok === "(") depth++;
    else if (tok === ")") depth = Math.max(0, depth - 1);
    else if (depth > 0 || tok.startsWith("{") || tok.startsWith(";") || tok.startsWith("$")) {
      continue;
    } else {
      const san = tok
        .replace(/^\d+\.+/, "")
        .replace(/[!?]+$/, "")
        .replace(/^0-0(-0)?/, (m) => m.replaceAll("0", "O"));
      if (san && !RESULT.test(san) && !/^\d+\.*$/.test(san)) out.push(san);
    }
  }
  return out;
}

/** Year from a PGN date ("1974.??.??"), or null if unknown. */
export function pgnYear(date: string | undefined): number | null {
  const m = /^(\d{4})/.exec(date ?? "");
  return m ? Number(m[1]) : null;
}

/** Parse every game in `text`, keeping the first `maxPlies` plies of each. */
export function readPgnGames(
  text: string,
  maxPlies: number,
): { games: BookGame[]; stats: PgnReadStats } {
  const games: BookGame[] = [];
  const stats: PgnReadStats = { read: 0, noYear: 0, illegal: 0, nonStandardStart: 0 };

  let headers: Record<string, string> = {};
  let movetext: string[] = [];

  const flush = () => {
    if (Object.keys(headers).length === 0 && movetext.length === 0) return;
    stats.read++;
    const game = toGame(headers, movetext.join("\n"), maxPlies, stats);
    if (game) games.push(game);
    headers = {};
    movetext = [];
  };

  for (const line of text.split(/\r?\n/)) {
    const h = HEADER.exec(line);
    if (h) {
      // A header after movetext starts a new game.
      if (movetext.some((l) => l.trim() !== "")) flush();
      headers[h[1]!] = h[2]!;
    } else {
      movetext.push(line);
    }
  }
  flush();
  return { games, stats };
}

function toGame(
  headers: Record<string, string>,
  movetext: string,
  maxPlies: number,
  stats: PgnReadStats,
): BookGame | null {
  if (headers.SetUp === "1" || headers.FEN) {
    stats.nonStandardStart++;
    return null;
  }
  const year = pgnYear(headers.Date);
  if (year === null) {
    stats.noYear++;
    return null;
  }
  const chess = new Chess();
  const plies: BookPly[] = [];
  for (const san of sanTokens(movetext).slice(0, maxPlies)) {
    const fen = chess.fen();
    let move;
    try {
      move = chess.move(san);
    } catch {
      stats.illegal++;
      return null;
    }
    plies.push({ fen, uci: move.from + move.to + (move.promotion ?? "") });
  }
  return {
    white: headers.White ?? "",
    black: headers.Black ?? "",
    year,
    date: headers.Date ?? "",
    result: headers.Result ?? "*",
    plies,
  };
}
