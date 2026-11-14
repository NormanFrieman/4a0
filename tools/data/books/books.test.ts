import { describe, expect, it } from "vitest";
import { PolyglotBook } from "../../../src/engine/book/polyglotBook.ts";
import {
  buildBooks,
  dedupeGames,
  matchesName,
  type BookCard,
  type NameMatcher,
} from "./buildBooks.ts";
import { pgnYear, readPgnGames, sanTokens, type BookGame } from "./pgnReader.ts";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("pgnReader", () => {
  it("drops comments, variations, NAGs and numbers", () => {
    expect(
      sanTokens("1. e4 {best by test} e5 (1... c5 2. Nf3) 2. Nf3!? $1 Nc6 ; rest\n3. 0-0 1-0"),
    ).toEqual(["e4", "e5", "Nf3", "Nc6", "O-O"]);
    expect(sanTokens("1.d4 Nf6 2.c4 e6 1/2-1/2")).toEqual(["d4", "Nf6", "c4", "e6"]);
  });

  it("reads the year of a PGN date", () => {
    expect(pgnYear("1974.??.??")).toBe(1974);
    expect(pgnYear("????.??.??")).toBeNull();
  });

  it("reads several games, keeping the first plies and skipping bad ones", () => {
    const pgn = `[Event "A"]
[White "Karpov, Anatoly"]
[Black "Spassky, Boris"]
[Date "1974.04.11"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0

[White "Tal, Mikhail"]
[Black "X"]
[Date "????.??.??"]
[Result "*"]

1. e4 *

[White "Y"]
[Black "Z"]
[Date "1980.01.01"]
[Result "*"]

1. e4 e4 *

[White "Y"]
[Black "Z"]
[Date "1980.01.01"]
[SetUp "1"]
[FEN "8/8/8/8/8/8/8/K6k w - - 0 1"]

1. Kb1 *
`;
    const { games, stats } = readPgnGames(pgn, 4);
    expect(stats).toEqual({ read: 4, noYear: 1, illegal: 1, nonStandardStart: 1 });
    expect(games).toHaveLength(1);
    const g = games[0]!;
    expect(g).toMatchObject({ white: "Karpov, Anatoly", year: 1974, result: "1-0" });
    expect(g.plies.map((p) => p.uci)).toEqual(["e2e4", "e7e5", "g1f3", "b8c6"]);
    expect(g.plies[0]!.fen).toBe(START);
  });
});

describe("matchesName", () => {
  const byrne: NameMatcher = { surnames: ["byrne"], initial: "r" };
  it.each([
    ["Byrne, Robert", true],
    ["Byrne,R", true],
    ["Robert Byrne", true],
    ["Byrne", true],
    ["Byrne, Donald", false],
    ["Byrnes, R", false],
  ])("%s → %s", (name, expected) => {
    expect(matchesName(name, byrne)).toBe(expected);
  });

  it("ignores accents", () => {
    expect(matchesName("Ljubojević, Ljubomir", { surnames: ["ljubojevic"] })).toBe(true);
  });
});

/** A game from UCI moves (FENs computed by the reader). */
function game(white: string, black: string, year: number, moves: string): BookGame {
  const pgn = `[White "${white}"]\n[Black "${black}"]\n[Date "${year}.01.01"]\n\n${moves} *\n`;
  return readPgnGames(pgn, 16).games[0]!;
}

describe("buildBooks", () => {
  const karpov: NameMatcher = { surnames: ["karpov"] };
  const games = [
    game("Karpov", "A", 1970, "1. e4 c5 2. Nf3"),
    game("Karpov", "B", 1972, "1. e4 e5 2. Nf3"),
    game("C", "Karpov", 1973, "1. d4 Nf6 2. c4"),
    game("Karpov", "D", 1979, "1. c4 e5"),
  ];
  const cards: BookCard[] = [
    { id: "su-1974-1", personId: "anatoly-karpov", year: 1974 },
    { id: "su-1980-1", personId: "anatoly-karpov", year: 1980 },
    { id: "hu-1978-9", personId: "nobody", year: 1978 },
  ];
  const built = buildBooks(cards, new Map([["anatoly-karpov", { games, matcher: karpov }]]), {
    maxPlies: 16,
    minGames: 3,
  });
  const book = (file: string) => new PolyglotBook(built.files.get(file)!);

  it("gives each card a book of the person's games up to its year", () => {
    expect(built.cards).toEqual([
      { cardId: "su-1974-1", bookFile: "books/su-1974-1.bin", games: 3 },
      { cardId: "su-1980-1", bookFile: "books/su-1980-1.bin", games: 4 },
      { cardId: "hu-1978-9", bookFile: "books/decade-1970.bin", games: 0 },
    ]);
    expect(book("books/su-1974-1.bin").probe(START)).toEqual([["e2e4", 2]]);
    expect(book("books/su-1980-1.bin").probe(START)).toEqual([
      ["e2e4", 2],
      ["c2c4", 1],
    ]);
  });

  it("keeps only the person's own moves", () => {
    const b = book("books/su-1974-1.bin");
    // Black's replies to Karpov's 1.e4 were the opponents' moves.
    const fenAfterE4 = game("x", "y", 1970, "1. e4 c5").plies[1]!.fen;
    expect(b.probe(fenAfterE4)).toBeNull();
    // As Black, Karpov's 1...Nf6 is in.
    const fenAfterD4 = game("x", "y", 1970, "1. d4 Nf6").plies[1]!.fen;
    expect(b.probe(fenAfterD4)).toEqual([["g8f6", 1]]);
  });

  it("falls back to a decade book with both sides' moves below bookMinGames", () => {
    const b = book("books/decade-1970.bin");
    expect(b.probe(START)).toEqual([
      ["e2e4", 2],
      ["c2c4", 1],
      ["d2d4", 1],
    ]);
    const fenAfterE4 = game("x", "y", 1970, "1. e4 c5").plies[1]!.fen;
    expect(b.probe(fenAfterE4)).toEqual([
      ["c7c5", 1],
      ["e7e5", 1],
    ]);
  });

  it("respects maxPlies", () => {
    const short = buildBooks(
      [cards[1]!],
      new Map([["anatoly-karpov", { games, matcher: karpov }]]),
      { maxPlies: 1, minGames: 1 },
    );
    const b = new PolyglotBook(short.files.get("books/su-1980-1.bin")!);
    const fenAfterE4E5 = game("x", "y", 1970, "1. e4 e5 2. Nf3").plies[2]!.fen;
    expect(b.probe(fenAfterE4E5)).toBeNull();
    expect(b.probe(START)).not.toBeNull();
  });

  it("dedupes the same game seen in two collections", () => {
    const g = game("Karpov, A", "Kasparov, G", 1985, "1. e4 c5");
    const copy = { ...g, white: "Karpov,A", black: "Kasparov,G" };
    expect(dedupeGames([g, copy])).toHaveLength(1);
  });
});
