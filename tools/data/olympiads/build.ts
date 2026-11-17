/**
 * Builds the Olympiad dataset from the cached sources (`pnpm data:fetch`
 * first), without network access. `pnpm data:olympiads [--years 1980,2024]`.
 *
 * Writes tools/data/olympiads/out/ in the published layout (GDD §9.3:
 * index.json, persons.json, olympiads/{year}.json; no books yet) and the
 * validation report tools/data/olympiads/report.md.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { balance } from "../../../src/config/balance.ts";
import { avgStrength, cardStrength, rollWeight } from "../../../src/data/cardStrength.ts";
import type {
  DatasetIndex,
  NationalTeam,
  OlympiadFile,
  Person,
  PlayerCard,
} from "../../../src/data/types.ts";
import {
  OUT_DIR,
  REPORT_FILE,
  crosstablePage,
  lineupsPage,
  readEntity,
  readPage,
  readQids,
  readSearch,
} from "./cache.ts";
import { approxPerformance, decisiveness, eloAt, opponentRating, titleAt } from "./compute.ts";
import { countryOf, teamSuffix, type Country } from "./countries.ts";
import { parseCrosstable, type CrosstableTeam } from "./crosstable.ts";
import { edition, yearsFromArgs, type Edition } from "./editions.ts";
import {
  isCardBoard,
  parseLineups,
  topTeams,
  type LineupPlayer,
  type LineupTeam,
} from "./lineups.ts";
import { overrideFor } from "./overrides.ts";
import { renderReport } from "./report.ts";
import { TITLE_RANK, type EloEntry, type PersonEntity } from "./wikidata.ts";

/**
 * A QID found by name search is taken only if the person has a FIDE list
 * at most this many months before the edition (guards against namesakes).
 */
const SEARCH_MAX_ELO_AGE_MONTHS = 72;

export type QidSource = "link" | "override" | "search";

export interface ResolvedPlayer extends LineupPlayer {
  qid: string | null;
  qidSource: QidSource | null;
  /** Name search: chess players found when none could be taken. */
  candidates: string[];
  personId: string;
  entity: PersonEntity | null;
  elo: EloEntry | null;
}

export interface ResolvedTeam extends Omit<LineupTeam, "players"> {
  players: ResolvedPlayer[];
  /** FIDE ratings of boards 1–4 (null: unrated or no QID). */
  boardRatings: (number | null)[];
}

export interface CardResult {
  card: PlayerCard;
  player: ResolvedPlayer;
  /** Rounds with a rated opponent / rounds of the team in the crosstable. */
  ratedRounds: number;
  rounds: number;
}

export interface TeamResult {
  lineup: ResolvedTeam;
  country: Country;
  team: NationalTeam;
  cards: CardResult[];
  /** Reason the team is left out (GDD §4.1), or null. */
  excluded: string | null;
}

export interface EditionResult {
  edition: Edition;
  revids: { lineups: number; crosstable: number };
  teamsParsed: number;
  crosstableFound: boolean;
  /** Crosstable rows that matched no lineup team. */
  unmatched: string[];
  /** Mean rating of every rated board 1–4 player of the edition. */
  fieldMean: number;
  top: TeamResult[];
  unknownTitles: string[];
}

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const normName = (s: string) => s.toLowerCase().replace(/\s+/g, "");

let qidsCache: Record<string, string | null> | undefined;
let searchCache: Record<string, string[]> | undefined;
const entityCache = new Map<string, PersonEntity>();

function entity(qid: string): PersonEntity {
  const e = entityCache.get(qid) ?? readEntity(qid);
  if (e) entityCache.set(qid, e);
  if (!e) throw new Error(`${qid} not cached: run \`pnpm data:fetch\``);
  return e;
}

/** ISO date `months` before `date`. */
function monthsBefore(date: string, months: number): string {
  const [y, m] = date.split("-").map(Number) as [number, number];
  const total = y * 12 + (m - 1) - months;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}-01`;
}

function resolveQid(
  year: number,
  start: string,
  team: string,
  p: LineupPlayer,
  searchable: boolean,
): { qid: string | null; qidSource: QidSource | null; candidates: string[] } {
  const ov = typeof p.board === "number" ? overrideFor(year, team, p.board) : undefined;
  if (ov?.qid) return { qid: ov.qid, qidSource: "override", candidates: [] };
  const linked = p.wikiTitle ? ((qidsCache ??= readQids())[p.wikiTitle] ?? null) : null;
  if (linked) return { qid: linked, qidSource: "link", candidates: [] };
  if (!searchable) return { qid: null, qidSource: null, candidates: [] };
  const found = (searchCache ??= readSearch())[p.name] ?? [];
  const oldest = monthsBefore(start, SEARCH_MAX_ELO_AGE_MONTHS);
  const inEra = found.filter((q) => {
    const elo = eloAt(entity(q).elo, start);
    return elo !== null && elo.date >= oldest;
  });
  if (inEra.length === 1) return { qid: inEra[0]!, qidSource: "search", candidates: [] };
  return { qid: null, qidSource: null, candidates: found };
}

function resolveTeams(year: number, start: string, lineups: LineupTeam[]): ResolvedTeam[] {
  // Name search only for the cards (fetch.ts searches nothing else), so the
  // opponents' ratings do not depend on what happens to be cached.
  const top = new Set(topTeams(lineups));
  return lineups.map((t) => {
    const players = t.players.map((p): ResolvedPlayer => {
      const searchable = top.has(t) && isCardBoard(p.board);
      const { qid, qidSource, candidates } = resolveQid(year, start, t.name, p, searchable);
      const e = qid ? entity(qid) : null;
      return {
        ...p,
        qid,
        qidSource,
        candidates,
        personId: qid ?? `nq-${slug(p.name)}`,
        entity: e,
        elo: e ? eloAt(e.elo, start) : null,
      };
    });
    const boardRatings = [1, 2, 3, 4].map(
      (b) => players.find((p) => p.board === b)?.elo?.rating ?? null,
    );
    return { ...t, players, boardRatings };
  });
}

function matchCrosstable(
  teams: ResolvedTeam[],
  rows: CrosstableTeam[],
): {
  byCode: Map<string, ResolvedTeam>;
  rowOf: Map<ResolvedTeam, CrosstableTeam>;
  unmatched: string[];
} {
  const byName = new Map(teams.map((t) => [normName(t.name), t]));
  const byCode = new Map<string, ResolvedTeam>();
  const rowOf = new Map<ResolvedTeam, CrosstableTeam>();
  const unmatched: string[] = [];
  for (const row of rows) {
    let team = byName.get(normName(row.name));
    if (!team) {
      const sameRank = teams.filter((t) => t.rank === row.rank);
      if (sameRank.length === 1) team = sameRank[0];
    }
    if (!team) {
      unmatched.push(`${row.rank}. ${row.name} (${row.code})`);
      continue;
    }
    byCode.set(row.code, team);
    rowOf.set(team, row);
  }
  return { byCode, rowOf, unmatched };
}

export function buildEdition(year: number): EditionResult {
  const ed = edition(year);
  const lineupsSrc = readPage(lineupsPage(year));
  const crossSrc = readPage(crosstablePage(year));
  if (!lineupsSrc?.content)
    throw new Error(`${year}: lineup page not cached: run \`pnpm data:fetch\``);

  const teams = resolveTeams(year, ed.start, parseLineups(lineupsSrc.content));
  const cross = crossSrc?.content ? parseCrosstable(crossSrc.content) : null;
  const { byCode, rowOf, unmatched } = cross
    ? matchCrosstable(teams, cross)
    : {
        byCode: new Map<string, ResolvedTeam>(),
        rowOf: new Map<ResolvedTeam, CrosstableTeam>(),
        unmatched: [],
      };

  const allRated = teams.flatMap((t) => t.boardRatings).filter((r): r is number => r != null);
  const fieldMean = Math.round(allRated.reduce((a, b) => a + b, 0) / allRated.length);

  const knownTitles = new Set(TITLE_RANK.map((t) => t.qid));
  const unknownTitles = new Set<string>();

  const ranked = topTeams(teams);

  const top = ranked.map((t): TeamResult => {
    const country = countryOf(t.countryTemplate, year, teamSuffix(t.name));
    const suffix = teamSuffix(t.name);
    const teamId = `${country.code}${suffix ? { B: "2", C: "3" }[suffix] : ""}-${year}`;
    const row = rowOf.get(t);
    const problems: string[] = [];

    const cards = [1, 2, 3, 4].flatMap((board): CardResult[] => {
      const p = t.players.find((x) => x.board === board);
      if (!p) {
        problems.push(`sem jogador na mesa ${board}`);
        return [];
      }
      for (const ti of p.entity?.titles ?? [])
        if (!knownTitles.has(ti.qid)) unknownTitles.add(ti.qid);

      // Opponent ratings, one per round (plano-dados.md: approximate P).
      let ratings: number[];
      let rounds: number;
      if (row) {
        rounds = row.opponents.filter((c) => c !== null).length;
        ratings = row.opponents.flatMap((code) => {
          const opp = code ? byCode.get(code) : undefined;
          const r = opp ? opponentRating(opp.boardRatings, board) : null;
          return r === null ? [] : [r];
        });
      } else {
        rounds = 0;
        ratings = [fieldMean];
      }
      const performance = approxPerformance(ratings, p.points, p.games);
      const fide = p.elo?.rating ?? null;
      if (p.games <= 0) problems.push(`${p.name}: sem partidas`);
      if (performance === null && fide === null)
        problems.push(`${p.name}: sem Elo nem performance`);
      const strength = cardStrength(fide, performance ?? fide ?? 0);

      const card: PlayerCard = {
        id: `${teamId}-${board}`,
        personId: p.personId,
        year,
        teamId,
        board,
        title: p.entity ? titleAt(p.entity.titles, year) : "",
        fideRating: fide ?? 0,
        performance: performance ?? fide ?? 0,
        strength,
        score: p.points,
        games: p.games,
        medals: [],
        bookFile: "",
      };
      return [{ card, player: p, ratedRounds: ratings.length, rounds }];
    });

    const team: NationalTeam = {
      id: teamId,
      year,
      countryCode: country.code,
      countryName: country.name,
      finalRank: t.rank!,
      avgStrength: cards.length ? avgStrength(cards.map((c) => c.card.strength)) : 0,
      rollWeight: rollWeight(t.rank!),
      cardIds: cards.map((c) => c.card.id),
    };
    return {
      lineup: t,
      country,
      team,
      cards,
      excluded: problems.length ? problems.join("; ") : null,
    };
  });

  return {
    edition: ed,
    revids: { lineups: lineupsSrc.revid, crosstable: crossSrc?.revid ?? 0 },
    teamsParsed: teams.length,
    crosstableFound: !!cross,
    unmatched,
    fieldMean,
    top,
    unknownTitles: [...unknownTitles].sort(),
  };
}

/** Persons of the published cards, decisiveness over every parsed participation. */
export function buildPersons(results: EditionResult[], allTeams: ResolvedPlayer[]): Person[] {
  const wdl = new Map<string, { w: number; d: number; l: number }>();
  for (const p of allTeams) {
    const s = wdl.get(p.personId) ?? { w: 0, d: 0, l: 0 };
    s.w += p.wins;
    s.d += p.draws;
    s.l += p.losses;
    wdl.set(p.personId, s);
  }
  const persons = new Map<string, Person>();
  for (const r of results)
    for (const t of r.top) {
      if (t.excluded) continue;
      for (const { player: p } of t.cards) {
        const prev = persons.get(p.personId);
        const s = wdl.get(p.personId)!;
        persons.set(p.personId, {
          id: p.personId,
          name: p.entity?.labels.pt ?? p.entity?.labels.en ?? p.name,
          countryCodes: [...new Set([...(prev?.countryCodes ?? []), t.country.code])],
          maxTitle: p.entity ? titleAt(p.entity.titles, null) : "",
          decisiveness: decisiveness(s.w, s.d, s.l) ?? 0,
        });
      }
    }
  return [...persons.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function main() {
  const years = yearsFromArgs(process.argv.slice(2));
  const results = years.map(buildEdition);

  // Every participation (all teams, reserves included) for decisiveness.
  const everyPlayer = years.flatMap((y) => {
    const page = readPage(lineupsPage(y))!;
    return resolveTeams(y, edition(y).start, parseLineups(page.content)).flatMap((t) => t.players);
  });
  const persons = buildPersons(results, everyPlayer);

  const kept = results.map((r) => ({ r, teams: r.top.filter((t) => !t.excluded) }));
  const index: DatasetIndex = {
    version: "v1-poc",
    dataset: "v1",
    olympiads: results.map((r) => {
      const { year, city, country, rounds, teamsCount } = r.edition;
      return { year, city, country, rounds, boards: balance.draft.slots, teamsCount };
    }),
    teams: kept.flatMap((k) => k.teams.map((t) => t.team)),
  };

  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(join(OUT_DIR, "olympiads"), { recursive: true });
  const write = (file: string, data: unknown) =>
    writeFileSync(join(OUT_DIR, file), JSON.stringify(data, null, 2) + "\n");
  write("index.json", index);
  write("persons.json", persons);
  for (const { r, teams } of kept) {
    const file: OlympiadFile = {
      olympiad: index.olympiads.find((o) => o.year === r.edition.year)!,
      cards: teams.flatMap((t) => t.cards.map((c) => c.card)),
    };
    write(`olympiads/${r.edition.year}.json`, file);
  }
  writeFileSync(REPORT_FILE, renderReport(results, persons));

  for (const r of results) {
    const excl = r.top.filter((t) => t.excluded).length;
    console.log(
      `${r.edition.year}: ${r.teamsParsed} teams parsed, top ${r.top.length}` +
        (excl ? ` (${excl} excluded)` : "") +
        `, crosstable ${r.crosstableFound ? "ok" : "missing"}`,
    );
  }
  console.log(`${persons.length} persons → ${OUT_DIR}; report → ${REPORT_FILE}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
