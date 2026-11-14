/**
 * Opening books per card (GDD §7.1): the person's own moves from their career
 * games up to the card's year. Cards with fewer than `bookMinGames` such games
 * fall back to a decade book built from every collected game of that decade.
 */
import { encodePolyglotMove } from "../../../src/engine/book/polyglotMove.ts";
import { polyglotKey } from "../../../src/engine/book/polyglotKey.ts";
import { writePolyglot, type PolyglotEntry } from "../../../src/engine/book/polyglotWriter.ts";
import type { BookGame } from "./pgnReader.ts";

/** How a person's name appears in PGN headers. */
export interface NameMatcher {
  /** Normalized surname spellings, e.g. ["huebner", "hubner"]. */
  surnames: string[];
  /** First-name initial, to tell apart namesakes in the same file (e.g. R. Byrne). */
  initial?: string;
}

export interface BookCard {
  id: string;
  personId: string;
  year: number;
}

export interface CardBookPlan {
  cardId: string;
  /** Path relative to the dataset root, e.g. `books/su-1980-1.bin`. */
  bookFile: string;
  /** Person's games up to the card year (0 without a PGN source). */
  games: number;
}

export interface BuiltBooks {
  /** Book path → Polyglot bytes. */
  files: Map<string, Uint8Array>;
  cards: CardBookPlan[];
}

export interface BookOptions {
  maxPlies: number;
  minGames: number;
}

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Whether a PGN player name ("Karpov, Anatoly", "Byrne,R") refers to `m`. */
export function matchesName(name: string, m: NameMatcher): boolean {
  const tokens = normalize(name)
    .split(/[^a-z]+/)
    .filter(Boolean);
  const i = tokens.findIndex((t) => m.surnames.includes(t));
  if (i < 0) return false;
  const others = tokens.filter((_, j) => j !== i);
  return !m.initial || others.length === 0 || others.some((t) => t.startsWith(m.initial!));
}

/** Same game seen in two collections (e.g. Karpov–Kasparov in both files). */
const gameKey = (g: BookGame) => `${g.date}|${g.result}|${g.plies.map((p) => p.uci).join(" ")}`;

export function dedupeGames(games: Iterable<BookGame>): BookGame[] {
  const seen = new Map<string, BookGame>();
  for (const g of games) if (!seen.has(gameKey(g))) seen.set(gameKey(g), g);
  return [...seen.values()];
}

/** Count (position, move) pairs into Polyglot entries, frequency as weight. */
export function countEntries(
  games: Iterable<BookGame>,
  maxPlies: number,
  keepPly: (game: BookGame, ply: number) => boolean,
): PolyglotEntry[] {
  const counts = new Map<string, PolyglotEntry>();
  for (const g of games) {
    g.plies.slice(0, maxPlies).forEach((p, ply) => {
      if (!keepPly(g, ply)) return;
      const key = polyglotKey(p.fen);
      const move = encodePolyglotMove(p.uci, p.fen);
      const id = `${key}:${move}`;
      const e = counts.get(id);
      if (e) e.weight++;
      else counts.set(id, { key, move, weight: 1 });
    });
  }
  return [...counts.values()];
}

/** The person's games with their color; games where both or neither side match are skipped. */
export function personGames(
  games: readonly BookGame[],
  m: NameMatcher,
): Array<{ game: BookGame; white: boolean }> {
  const out: Array<{ game: BookGame; white: boolean }> = [];
  for (const game of games) {
    const w = matchesName(game.white, m);
    const b = matchesName(game.black, m);
    if (w !== b) out.push({ game, white: w });
  }
  return out;
}

export const decadeOf = (year: number) => Math.floor(year / 10) * 10;

export function buildBooks(
  cards: readonly BookCard[],
  gamesByPerson: ReadonlyMap<string, { games: BookGame[]; matcher: NameMatcher }>,
  opts: BookOptions,
): BuiltBooks {
  const files = new Map<string, Uint8Array>();
  const plans: CardBookPlan[] = [];
  const decadesNeeded = new Set<number>();

  for (const card of cards) {
    const src = gamesByPerson.get(card.personId);
    const own = src
      ? personGames(src.games, src.matcher).filter(({ game }) => game.year <= card.year)
      : [];
    if (own.length >= opts.minGames) {
      const white = new Set(own.filter((o) => o.white).map((o) => o.game));
      const entries = countEntries(
        own.map((o) => o.game),
        opts.maxPlies,
        // Ply parity tells whose move it is: even plies are White's.
        (g, ply) => (ply % 2 === 0) === white.has(g),
      );
      const bookFile = `books/${card.id}.bin`;
      files.set(bookFile, writePolyglot(entries));
      plans.push({ cardId: card.id, bookFile, games: own.length });
    } else {
      const decade = decadeOf(card.year);
      decadesNeeded.add(decade);
      plans.push({ cardId: card.id, bookFile: `books/decade-${decade}.bin`, games: own.length });
    }
  }

  const all = dedupeGames([...gamesByPerson.values()].flatMap((s) => s.games));
  for (const decade of [...decadesNeeded].sort()) {
    const games = all.filter((g) => decadeOf(g.year) === decade);
    files.set(
      `books/decade-${decade}.bin`,
      writePolyglot(countEntries(games, opts.maxPlies, () => true)),
    );
  }
  return { files, cards: plans };
}
