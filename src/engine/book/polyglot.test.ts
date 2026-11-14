import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { PolyglotBook } from "./polyglotBook.ts";
import { polyglotKey } from "./polyglotKey.ts";
import { decodePolyglotMove, encodePolyglotMove } from "./polyglotMove.ts";
import { writePolyglot } from "./polyglotWriter.ts";

const START = new Chess().fen();

function fenAfter(...ucis: string[]): string {
  const chess = new Chess();
  for (const u of ucis) {
    chess.move({ from: u.slice(0, 2), to: u.slice(2, 4), ...(u[4] ? { promotion: u[4] } : {}) });
  }
  return chess.fen();
}

describe("polyglotKey", () => {
  // Reference vectors from the Polyglot book format specification.
  const vectors: Array<[string[], string]> = [
    [[], "463b96181691fc9c"],
    [["e2e4"], "823c9b50fd114196"],
    [["e2e4", "d7d5"], "0756b94461c50fb0"],
    [["e2e4", "d7d5", "e4e5"], "662fafb965db29d4"],
    [["e2e4", "d7d5", "e4e5", "f7f5"], "22a48b5a8e47ff78"],
    [["e2e4", "d7d5", "e4e5", "f7f5", "e1e2"], "652a607ca3f242c1"],
    [["e2e4", "d7d5", "e4e5", "f7f5", "e1e2", "e8f7"], "00fdd303c946bdd9"],
    [["a2a4", "b7b5", "h2h4", "b5b4", "c2c4"], "3c8123ea7b067637"],
    [["a2a4", "b7b5", "h2h4", "b5b4", "c2c4", "b4c3", "a1a3"], "5c3f9b829b279560"],
  ];
  it.each(vectors)("matches the spec after %j", (moves, hex) => {
    expect(
      polyglotKey(fenAfter(...moves))
        .toString(16)
        .padStart(16, "0"),
    ).toBe(hex);
  });

  it("ignores an en passant square nobody can capture on", () => {
    expect(polyglotKey("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1")).toBe(
      polyglotKey("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"),
    );
  });
});

describe("polyglot moves", () => {
  const castlingFen = "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1";
  const blackCastlingFen = "r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1";

  it.each([
    ["e1g1", "e1h1", castlingFen],
    ["e1c1", "e1a1", castlingFen],
    ["e8g8", "e8h8", blackCastlingFen],
    ["e8c8", "e8a8", blackCastlingFen],
  ])("stores castling %s as king-takes-rook %s", (uci, polyglot, fen) => {
    const code = encodePolyglotMove(uci, fen);
    expect(code).toBe(encodePolyglotMove(polyglot, "8/8/8/8/8/8/8/8 w - - 0 1"));
    expect(decodePolyglotMove(code, fen)).toBe(uci);
  });

  it("does not treat a rook move e1h1 as castling", () => {
    const fen = "4k3/8/8/8/8/8/8/4R2K w - - 0 1";
    expect(decodePolyglotMove(encodePolyglotMove("e1h1", fen), fen)).toBe("e1h1");
  });

  it.each(["a7a8q", "b7b8n", "c7c8b", "d7d8r", "e2e4", "g1f3"])("round-trips %s", (uci) => {
    expect(decodePolyglotMove(encodePolyglotMove(uci, START), START)).toBe(uci);
  });

  it("encodes e2e4 as in the spec", () => {
    // from e2 = 12, to e4 = 28 → (12 << 6) | 28
    expect(encodePolyglotMove("e2e4", START)).toBe((12 << 6) | 28);
  });
});

describe("PolyglotBook", () => {
  const afterE4 = fenAfter("e2e4");
  const book = new PolyglotBook(
    writePolyglot([
      { key: polyglotKey(START), move: encodePolyglotMove("d2d4", START), weight: 1 },
      { key: polyglotKey(START), move: encodePolyglotMove("e2e4", START), weight: 3 },
      { key: polyglotKey(afterE4), move: encodePolyglotMove("c7c6", afterE4), weight: 5 },
      { key: polyglotKey(afterE4), move: encodePolyglotMove("e7e5", afterE4), weight: 0 },
    ]),
  );

  it("returns every move of a position, heaviest first", () => {
    expect(book.probe(START)).toEqual([
      ["e2e4", 3],
      ["d2d4", 1],
    ]);
    expect(book.probe(afterE4)).toEqual([["c7c6", 5]]);
  });

  it("returns null out of book", () => {
    expect(book.probe(fenAfter("g1f3"))).toBeNull();
    expect(new PolyglotBook(new Uint8Array(0)).probe(START)).toBeNull();
  });

  it("scales weights that overflow u16, keeping proportions", () => {
    const big = new PolyglotBook(
      writePolyglot([
        { key: 1n, move: encodePolyglotMove("e2e4", START), weight: 200_000 },
        { key: polyglotKey(START), move: encodePolyglotMove("e2e4", START), weight: 200_000 },
        { key: polyglotKey(START), move: encodePolyglotMove("d2d4", START), weight: 100_000 },
      ]),
    );
    expect(big.size).toBe(3);
    expect(big.probe(START)).toEqual([
      ["e2e4", 65535],
      ["d2d4", 32768],
    ]);
  });

  it("rejects truncated files", () => {
    expect(() => new PolyglotBook(new Uint8Array(15))).toThrow();
  });
});
