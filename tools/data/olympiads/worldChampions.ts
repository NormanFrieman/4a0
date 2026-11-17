/**
 * World champions of the classical/unified line in the dataset (user decision,
 * 2026-11-17): they get a special look in the app and, as a pilot of the
 * per-card opening book (GDD §7.1), a book built from their own games.
 * The FIDE knockout champions (Khalifman, Ponomariov, Kasimdzhanov, Topalov)
 * are left out on purpose.
 *
 * Title years: https://en.wikipedia.org/wiki/World_Chess_Championship
 * PGN collections: PGN Mentor (https://www.pgnmentor.com/files.html), licence
 * not stated. The games stay out of git (`pnpm data:pgn --champions`); only
 * the aggregated move counts are published, in the books.
 */
import type { PgnSource } from "../sample/pgnSources.ts";

export interface WorldChampion {
  name: string;
  /** Years of the title, first and last (null: current champion). */
  reign: [number, number | null];
  pgn: PgnSource;
}

const champion = (
  name: string,
  reign: [number, number | null],
  file: string,
  initial?: string,
): WorldChampion => ({
  name,
  reign,
  pgn: { file, surnames: [file.toLowerCase()], ...(initial ? { initial } : {}) },
});

/** personId (Wikidata QID) → champion. */
export const worldChampions: Record<string, WorldChampion> = {
  Q104148: champion("Vasily Smyslov", [1957, 1958], "Smyslov", "v"),
  Q102664: champion("Mikhail Tal", [1960, 1961], "Tal", "m"),
  Q180636: champion("Tigran Petrosian", [1963, 1969], "Petrosian", "t"),
  Q177310: champion("Boris Spassky", [1969, 1972], "Spassky", "b"),
  Q131674: champion("Anatoly Karpov", [1975, 1985], "Karpov", "a"),
  Q28614: champion("Garry Kasparov", [1985, 2000], "Kasparov", "g"),
  Q161092: champion("Vladimir Kramnik", [2000, 2007], "Kramnik", "v"),
  Q45747: champion("Viswanathan Anand", [2007, 2013], "Anand", "v"),
  Q106807: champion("Magnus Carlsen", [2013, 2023], "Carlsen", "m"),
  Q1191198: champion("Ding Liren", [2023, 2024], "Ding", "l"),
  Q56026072: champion("Gukesh D", [2024, null], "Gukesh"),
};
