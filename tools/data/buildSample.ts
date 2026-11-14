/**
 * Builds the TEST dataset in public/data/sample from tools/data/sample/source.ts
 * (GDD §9.3 file layout), plus the opening books from the PGN collections
 * downloaded by `pnpm data:pgn` (GDD §7.1). `pnpm data:sample`.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { balance } from "../../src/config/balance.ts";
import { avgStrength, cardStrength, rollWeight } from "../../src/data/cardStrength.ts";
import type {
  DatasetIndex,
  NationalTeam,
  OlympiadFile,
  Person,
  PlayerCard,
} from "../../src/data/types.ts";
import { buildBooks, dedupeGames, type NameMatcher } from "./books/buildBooks.ts";
import { readPgnGames, type BookGame } from "./books/pgnReader.ts";
import { PGN_DIR } from "./fetchPgn.ts";
import { pgnSources } from "./sample/pgnSources.ts";
import { olympiads, teams } from "./sample/source.ts";

/**
 * Approximate performance from the score percentage only (no opponent
 * ratings in the test source): P ≈ R + spread·(pct − 0.5).
 */
const APPROX_PERFORMANCE_SPREAD = 700;

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../../public/data/sample");

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const persons = new Map<string, Person>();
const cardsByYear = new Map<number, PlayerCard[]>();
const nationalTeams: NationalTeam[] = [];

for (const t of teams) {
  const teamId = `${t.countryCode}-${t.year}`;
  const cards = t.players.map((pl, i): PlayerCard => {
    const personId = slug(pl.name);
    const prev = persons.get(personId);
    persons.set(personId, {
      id: personId,
      name: pl.name,
      countryCodes: [...new Set([...(prev?.countryCodes ?? []), t.countryCode])],
      maxTitle: pl.title,
      decisiveness: pl.decisiveness,
    });
    const performance = Math.round(
      pl.fide + APPROX_PERFORMANCE_SPREAD * (pl.points / pl.games - 0.5),
    );
    return {
      id: `${teamId}-${i + 1}`,
      personId,
      year: t.year,
      teamId,
      board: i + 1,
      title: pl.title,
      fideRating: pl.fide,
      performance,
      strength: cardStrength(pl.fide, performance),
      score: pl.points,
      games: pl.games,
      medals: pl.medal ? [pl.medal] : [],
      bookFile: "", // filled in by the opening books below
    };
  });
  if (cards.length < 4) throw new Error(`${teamId}: needs at least 4 cards`);
  cardsByYear.set(t.year, [...(cardsByYear.get(t.year) ?? []), ...cards]);
  nationalTeams.push({
    id: teamId,
    year: t.year,
    countryCode: t.countryCode,
    countryName: t.countryName,
    finalRank: t.finalRank,
    avgStrength: avgStrength(cards.map((c) => c.strength)),
    rollWeight: rollWeight(t.finalRank),
    cardIds: cards.map((c) => c.id),
  });
}

// Opening books (GDD §7.1).
if (!existsSync(PGN_DIR)) {
  throw new Error(`No PGN collections in ${PGN_DIR}: run \`pnpm data:pgn\` first.`);
}
const { bookMaxPlies, bookMinGames } = balance.style;
const gamesByPerson = new Map<string, { games: BookGame[]; matcher: NameMatcher }>();
for (const [personId, source] of Object.entries(pgnSources)) {
  if (!persons.has(personId)) throw new Error(`pgnSources: unknown person ${personId}`);
  const text = readFileSync(join(PGN_DIR, `${source.file}.pgn`), "latin1");
  const { games, stats } = readPgnGames(text, bookMaxPlies);
  const skipped = stats.read - games.length;
  console.log(
    `pgn ${source.file}: ${games.length}/${stats.read} games` +
      (skipped
        ? ` (no year ${stats.noYear}, illegal ${stats.illegal}, set-up ${stats.nonStandardStart})`
        : ""),
  );
  gamesByPerson.set(personId, { games: dedupeGames(games), matcher: source });
}
const allCards = [...cardsByYear.values()].flat();
const books = buildBooks(allCards, gamesByPerson, {
  maxPlies: bookMaxPlies,
  minGames: bookMinGames,
});
const bookPlans = new Map(books.cards.map((b) => [b.cardId, b] as const));
for (const card of allCards) card.bookFile = bookPlans.get(card.id)!.bookFile;

const usedYears = olympiads.filter((o) => cardsByYear.has(o.year));
const index: DatasetIndex = {
  version: "sample-2",
  dataset: "sample",
  note: "Dados de teste, aproximados: escalações reais, números aproximados.",
  olympiads: usedYears.map((o) => ({ ...o, boards: 4 })),
  teams: nationalTeams,
};

mkdirSync(join(OUT, "olympiads"), { recursive: true });
const write = (file: string, data: unknown) =>
  writeFileSync(join(OUT, file), JSON.stringify(data, null, 2) + "\n");

write("index.json", index);
write("persons.json", [...persons.values()]);
for (const o of index.olympiads) {
  const file: OlympiadFile = { olympiad: o, cards: cardsByYear.get(o.year)! };
  write(`olympiads/${o.year}.json`, file);
}
rmSync(join(OUT, "books"), { recursive: true, force: true });
mkdirSync(join(OUT, "books"), { recursive: true });
let bookBytes = 0;
for (const [file, bytes] of books.files) {
  writeFileSync(join(OUT, file), bytes);
  bookBytes += bytes.length;
}
const own = books.cards.filter((b) => !b.bookFile.includes("decade-"));
console.log(
  `books: ${own.length} cards with their own book, ${books.cards.length - own.length} on a decade book; ` +
    `${books.files.size} files, ${(bookBytes / 1e6).toFixed(2)} MB`,
);
for (const b of [...own].sort((a, c) => c.games - a.games)) {
  console.log(`  ${b.cardId}: ${b.games} games`);
}
console.log(
  `sample: ${nationalTeams.length} teams, ${persons.size} persons, ${index.olympiads.length} olympiads → ${OUT}`,
);
