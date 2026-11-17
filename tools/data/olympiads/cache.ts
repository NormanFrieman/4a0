/**
 * Local cache of the downloaded sources (`tools/data/cache/`, git-ignored)
 * and the versioned manifest of page revisions (`sources.json`).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { PersonEntity } from "./wikidata.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const CACHE_DIR = resolve(HERE, "../cache");
export const SOURCES_FILE = join(HERE, "sources.json");
export const OUT_DIR = join(HERE, "out");
/** Published dataset (`pnpm data:olympiads --publish`). */
export const PUBLISH_DIR = resolve(HERE, "../../../public/data/v1");
export const REPORT_FILE = join(HERE, "report.md");

export const lineupsPage = (year: number) => `Mannschaftsaufstellungen der Schacholympiade ${year}`;
export const crosstablePage = (year: number) => `Schacholympiade ${year}/Tabelle`;
/** Main page of an edition: dates, city, rounds (source of editions.ts). */
export const editionPage = (year: number) => `Schacholympiade ${year}`;

export interface CachedPage {
  title: string;
  revid: number;
  content: string;
}

/** `sources.json`: pinned de.wikipedia revisions, so a rebuild reads the same text. */
export interface Sources {
  dewiki: Record<string, { revid: number }>;
}

const pageFile = (title: string) =>
  join(CACHE_DIR, "dewiki", `${title.replace(/[/ ]/g, "_")}.json`);
const entityFile = (qid: string) => join(CACHE_DIR, "entities", `${qid}.json`);
const QIDS_FILE = join(CACHE_DIR, "qids.json");

function readJson<T>(file: string): T | null {
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : null;
}
function writeJson(file: string, data: unknown) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

export const readSources = (): Sources => readJson<Sources>(SOURCES_FILE) ?? { dewiki: {} };
export const writeSources = (s: Sources) => {
  const sorted = Object.fromEntries(
    Object.entries(s.dewiki).sort(([a], [b]) => a.localeCompare(b)),
  );
  writeJson(SOURCES_FILE, { dewiki: sorted });
};

/** null when the page does not exist on de.wikipedia (recorded as revid 0). */
export const readPage = (title: string) => readJson<CachedPage>(pageFile(title));
export const writePage = (p: CachedPage) => writeJson(pageFile(p.title), p);

/** de.wikipedia article → QID (null: no Wikidata item). */
export const readQids = () => readJson<Record<string, string | null>>(QIDS_FILE) ?? {};
export const writeQids = (q: Record<string, string | null>) =>
  writeJson(
    QIDS_FILE,
    Object.fromEntries(Object.entries(q).sort(([a], [b]) => a.localeCompare(b))),
  );

/**
 * Name search for players without a QID: name → chess players (P106) among
 * the Wikidata search results. One match is taken; several are ambiguous.
 */
const SEARCH_FILE = join(CACHE_DIR, "search.json");
export const readSearch = () => readJson<Record<string, string[]>>(SEARCH_FILE) ?? {};
export const writeSearch = (s: Record<string, string[]>) =>
  writeJson(
    SEARCH_FILE,
    Object.fromEntries(Object.entries(s).sort(([a], [b]) => a.localeCompare(b))),
  );

export const readEntity = (qid: string) => readJson<PersonEntity>(entityFile(qid));
export const writeEntity = (e: PersonEntity) => writeJson(entityFile(e.qid), e);

export { writeJson };
