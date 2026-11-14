import { fenBoard, squareIndex } from "./polyglotKey.ts";

/**
 * Polyglot move encoding: to-file bits 0–2, to-rank 3–5, from-file 6–8,
 * from-rank 9–11, promotion 12–14 (none, n, b, r, q). Castling is stored as
 * "king takes own rook" (e1h1), so the board is needed to convert to UCI.
 */

const PROMOTIONS = ["", "n", "b", "r", "q"];

/** UCI castling ↔ Polyglot castling, for a king on its home square. */
const CASTLING: ReadonlyArray<{ king: string; uci: string; polyglot: string }> = [
  { king: "K", uci: "e1g1", polyglot: "e1h1" },
  { king: "K", uci: "e1c1", polyglot: "e1a1" },
  { king: "k", uci: "e8g8", polyglot: "e8h8" },
  { king: "k", uci: "e8c8", polyglot: "e8a8" },
];

const squareName = (idx: number) => String.fromCharCode(97 + (idx % 8), 49 + Math.floor(idx / 8));

/** Encode a UCI move played from `fen`. */
export function encodePolyglotMove(uci: string, fen: string): number {
  const board = fenBoard(fen);
  const castle = CASTLING.find(
    (c) => c.uci === uci && board[squareIndex(uci.slice(0, 2))] === c.king,
  );
  const move = castle ? castle.polyglot : uci;
  const from = squareIndex(move.slice(0, 2));
  const to = squareIndex(move.slice(2, 4));
  const promo = move.length > 4 ? PROMOTIONS.indexOf(move[4]!) : 0;
  if (promo < 0) throw new Error(`polyglot: invalid promotion in ${uci}`);
  return (promo << 12) | (from << 6) | to;
}

/** Decode a Polyglot move for the position `fen` into UCI. */
export function decodePolyglotMove(code: number, fen: string): string {
  const to = code & 0x3f;
  const from = (code >> 6) & 0x3f;
  const promo = PROMOTIONS[(code >> 12) & 0x7] ?? "";
  const raw = squareName(from) + squareName(to) + promo;
  const board = fenBoard(fen);
  const castle = CASTLING.find((c) => c.polyglot === raw && board[from] === c.king);
  return castle ? castle.uci : raw;
}
