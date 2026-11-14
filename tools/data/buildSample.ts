/**
 * Builds the TEST dataset in public/data/sample from tools/data/sample/source.ts
 * (GDD §9.3 file layout). `pnpm data:sample`.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { avgStrength, cardStrength, rollWeight } from "../../src/data/cardStrength.ts";
import type {
  DatasetIndex,
  NationalTeam,
  OlympiadFile,
  Person,
  PlayerCard,
} from "../../src/data/types.ts";
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
      hasBook: false,
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

const usedYears = olympiads.filter((o) => cardsByYear.has(o.year));
const index: DatasetIndex = {
  version: "sample-1",
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
console.log(
  `sample: ${nationalTeams.length} teams, ${persons.size} persons, ${index.olympiads.length} olympiads → ${OUT}`,
);
