/**
 * Opening books of the world champions' cards (GDD §7.1, pilot of the
 * per-card book; user decision, 2026-11-17). Each card gets the person's own
 * moves from their PGN Mentor games up to the card's year
 * (`tools/data/books/buildBooks.ts`). Cards with fewer than `bookMinGames`
 * games, and every other card, stay without a book (`bookFile: null`).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildBooks, personGames, type BuiltBooks, type NameMatcher } from "../books/buildBooks.ts";
import { readPgnGames, type BookGame } from "../books/pgnReader.ts";
import { worldChampions } from "./worldChampions.ts";

export interface ChampionBookRow {
  cardId: string;
  name: string;
  year: number;
  /** The person's games up to the card's year. */
  games: number;
  /** Book file, or null with too few games. */
  bookFile: string | null;
  entries: number;
  bytes: number;
  /** Most played first moves with White, e.g. "e4 62%". */
  asWhite: string[];
  /** Most played replies to 1.e4 and 1.d4. */
  vsE4: string[];
  vsD4: string[];
}

export interface ChampionBooks extends BuiltBooks {
  rows: ChampionBookRow[];
  /** PGN collection → games read / kept. */
  pgnStats: Array<{ file: string; read: number; kept: number }>;
}

interface CardLike {
  id: string;
  personId: string;
  year: number;
}

/** Most frequent `pick` values, with their share: ["e4 62%", "d4 30%"]. */
function top<T>(items: T[], pick: (t: T) => string | null, n = 3): string[] {
  const counts = new Map<string, number>();
  let total = 0;
  for (const it of items) {
    const k = pick(it);
    if (k === null) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
    total++;
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([k, c]) => `${k} ${Math.round((100 * c) / total)}%`);
}

/** Common first moves in SAN ("e2e4" → "e4", "g1f3" → "Nf3"); other moves stay in UCI. */
const FIRST_MOVES: Record<string, string> = {
  e2e4: "e4",
  d2d4: "d4",
  c2c4: "c4",
  g1f3: "Nf3",
  e7e5: "e5",
  c7c5: "c5",
  e7e6: "e6",
  c7c6: "c6",
  d7d5: "d5",
  g8f6: "Nf6",
  d7d6: "d6",
  g7g6: "g6",
  f7f5: "f5",
  b7b6: "b6",
};
const label = (uci: string) => FIRST_MOVES[uci] ?? uci;

export function buildChampionBooks(
  cards: readonly CardLike[],
  pgnDir: string,
  opts: { maxPlies: number; minGames: number },
): ChampionBooks {
  const champCards = cards.filter((c) => worldChampions[c.personId]);
  const gamesByPerson = new Map<string, { games: BookGame[]; matcher: NameMatcher }>();
  const pgnStats: ChampionBooks["pgnStats"] = [];
  for (const personId of new Set(champCards.map((c) => c.personId))) {
    const { pgn } = worldChampions[personId]!;
    const file = join(pgnDir, `${pgn.file}.pgn`);
    if (!existsSync(file))
      throw new Error(`${file} missing: run \`pnpm data:pgn --champions\` first.`);
    const { games, stats } = readPgnGames(readFileSync(file, "latin1"), opts.maxPlies);
    gamesByPerson.set(personId, { games, matcher: pgn });
    pgnStats.push({ file: pgn.file, read: stats.read, kept: games.length });
  }

  const built = buildBooks(champCards, gamesByPerson, { ...opts, fallback: "none" });
  const plans = new Map(built.cards.map((p) => [p.cardId, p] as const));

  const rows = champCards.map((card): ChampionBookRow => {
    const src = gamesByPerson.get(card.personId)!;
    const own = personGames(src.games, src.matcher).filter(({ game }) => game.year <= card.year);
    const white = own.filter((o) => o.white).map((o) => o.game);
    const black = own.filter((o) => !o.white).map((o) => o.game);
    const reply = (first: string) => (g: BookGame) =>
      g.plies[0]?.uci === first && g.plies[1] ? label(g.plies[1].uci) : null;
    const plan = plans.get(card.id)!;
    const bytes = plan.bookFile ? built.files.get(plan.bookFile)!.length : 0;
    return {
      cardId: card.id,
      name: worldChampions[card.personId]!.name,
      year: card.year,
      games: plan.games,
      bookFile: plan.bookFile,
      // Polyglot entries are 16 bytes each.
      entries: bytes / 16,
      bytes,
      asWhite: top(white, (g) => (g.plies[0] ? label(g.plies[0].uci) : null)),
      vsE4: top(black, reply("e2e4")),
      vsD4: top(black, reply("d2d4")),
    };
  });
  rows.sort((a, b) => a.name.localeCompare(b.name) || a.year - b.year);
  return { ...built, rows, pgnStats };
}
