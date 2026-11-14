import { POLYGLOT_RANDOM } from "./polyglotRandom.ts";

/**
 * Polyglot position key (GDD §7.1), computed straight from a FEN so book
 * files stay compatible with standard Polyglot tools.
 */

const PIECE_ORDER = "pnbrqk";
const CASTLING_OFFSET = 768;
const EN_PASSANT_OFFSET = 772;
const TURN_OFFSET = 780;

/** Board from a FEN as 64 cells, index = 8 × rank + file (a1 = 0), or null when empty. */
export function fenBoard(fen: string): (string | null)[] {
  const placement = fen.split(" ")[0] ?? "";
  const board: (string | null)[] = new Array<string | null>(64).fill(null);
  const rows = placement.split("/");
  if (rows.length !== 8) throw new Error(`polyglot: invalid FEN ${fen}`);
  rows.forEach((row, i) => {
    const rank = 7 - i;
    let file = 0;
    for (const ch of row) {
      if (ch >= "1" && ch <= "8") file += Number(ch);
      else board[8 * rank + file++] = ch;
    }
  });
  return board;
}

/** Square index (a1 = 0) from algebraic notation. */
export const squareIndex = (sq: string): number =>
  8 * (sq.charCodeAt(1) - 49) + (sq.charCodeAt(0) - 97);

export function polyglotKey(fen: string): bigint {
  const [, turn = "w", castling = "-", ep = "-"] = fen.split(" ");
  const board = fenBoard(fen);
  let key = 0n;

  board.forEach((piece, sq) => {
    if (!piece) return;
    const lower = piece.toLowerCase();
    const white = piece !== lower ? 1 : 0;
    const kind = 2 * PIECE_ORDER.indexOf(lower) + white;
    key ^= POLYGLOT_RANDOM[64 * kind + sq]!;
  });

  if (castling.includes("K")) key ^= POLYGLOT_RANDOM[CASTLING_OFFSET]!;
  if (castling.includes("Q")) key ^= POLYGLOT_RANDOM[CASTLING_OFFSET + 1]!;
  if (castling.includes("k")) key ^= POLYGLOT_RANDOM[CASTLING_OFFSET + 2]!;
  if (castling.includes("q")) key ^= POLYGLOT_RANDOM[CASTLING_OFFSET + 3]!;

  // En passant counts only if a pawn of the side to move can actually capture.
  if (ep !== "-") {
    const file = ep.charCodeAt(0) - 97;
    const rank = turn === "w" ? 4 : 3;
    const pawn = turn === "w" ? "P" : "p";
    const canCapture = [file - 1, file + 1].some(
      (f) => f >= 0 && f < 8 && board[8 * rank + f] === pawn,
    );
    if (canCapture) key ^= POLYGLOT_RANDOM[EN_PASSANT_OFFSET + file]!;
  }

  if (turn === "w") key ^= POLYGLOT_RANDOM[TURN_OFFSET]!;
  return key;
}
