import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PolyglotBook } from "../../../src/engine/book/polyglotBook.ts";
import { gameJobFor } from "../../../src/sim/match.ts";
import { bookFilesFor, loadBooks } from "../../../src/data/books.ts";
import { sampleDataset } from "../../../src/data/testing.ts";

const ds = sampleDataset();
/** The books are built locally (`pnpm data:pgn && pnpm data:sample`) and kept out of git, so CI skips these. */
const hasBooks = existsSync(new URL("../../../public/data/sample/books/", import.meta.url));
const itWithBooks = it.skipIf(!hasBooks);
const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/** Serves files from public/data/sample/. */
const fakeFetch = (async (url: string | URL | Request) => {
  try {
    const bytes = readFileSync(
      new URL(`../../../public/data/sample/${String(url)}`, import.meta.url),
    );
    return new Response(bytes);
  } catch {
    return new Response(null, { status: 404 });
  }
}) as typeof fetch;

describe("sample opening books", () => {
  const allCards = ds.teams.flatMap((t) => t.cardIds);

  itWithBooks("every card points to a published, readable book", () => {
    for (const file of bookFilesFor(ds, allCards)) {
      const book = new PolyglotBook(
        new Uint8Array(
          readFileSync(new URL(`../../../public/data/sample/${file}`, import.meta.url)),
        ),
      );
      expect(book.size, file).toBeGreaterThan(0);
      expect(book.probe(START), file).not.toBeNull();
    }
  });

  itWithBooks("loads each distinct file once", async () => {
    const files = bookFilesFor(ds, allCards);
    expect(new Set(files).size).toBe(files.length);
    const books = await loadBooks(ds, allCards, fakeFetch);
    expect([...books.keys()]).toEqual(files);
  });

  it("fails on a missing file", async () => {
    const notFound = (async () => new Response(null, { status: 404 })) as typeof fetch;
    await expect(loadBooks(ds, allCards.slice(0, 1), notFound)).rejects.toThrow(/HTTP 404/);
  });
});

describe("gameJobFor with books", () => {
  const [a, b] = ds.teams[0]!.cardIds;
  const game = { board: 1, whiteCardId: a!, blackCardId: b! };

  itWithBooks("gives each side its card's book", async () => {
    const books = await loadBooks(ds, [a!, b!], fakeFetch);
    const job = gameJobFor(ds, "s", 1, game, books);
    expect(job.white.book).toBe(books.get(ds.card(a!).bookFile!));
    expect(job.black.book).toBe(books.get(ds.card(b!).bookFile!));
  });

  it("plays without books when none are given, and refuses a missing one", () => {
    expect(gameJobFor(ds, "s", 1, game).white.book).toBeUndefined();
    expect(() => gameJobFor(ds, "s", 1, game, new Map())).toThrow(/not loaded/);
  });
});
