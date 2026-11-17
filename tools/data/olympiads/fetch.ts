/**
 * Downloads the sources of the Olympiad dataset into tools/data/cache/
 * (git-ignored): de.wikipedia lineup and progress-table pages, article → QID,
 * the Wikidata entities of every linked player, and a Wikidata name search
 * for players without a QID (red or missing link). `pnpm data:fetch`.
 *
 *   --years 1980,2024  only these editions (default: all in editions.ts)
 *   --force            download again what is already cached
 *   --update           take the latest page revisions instead of the ones
 *                      pinned in sources.json (and pin the new ones)
 *
 * Without --force, cached files are never downloaded again.
 */
import { fileURLToPath } from "node:url";
import {
  crosstablePage,
  lineupsPage,
  readEntity,
  readPage,
  readQids,
  readSearch,
  readSources,
  writeEntity,
  writePage,
  writeQids,
  writeSearch,
  writeSources,
} from "./cache.ts";
import { yearsFromArgs } from "./editions.ts";
import { getJson, requestCount } from "./http.ts";
import { isCardBoard, parseLineups, topTeams } from "./lineups.ts";
import { overrides } from "./overrides.ts";
import { toPersonEntity, type ApiEntity } from "./wikidata.ts";

const DEWIKI_API = "https://de.wikipedia.org/w/api.php";
const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const BATCH = 50;

const api = (base: string, params: Record<string, string>) =>
  `${base}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`;

function chunks<T>(xs: readonly T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}

interface RevisionsAnswer {
  query: {
    pages: {
      title: string;
      missing?: boolean;
      revisions?: { revid: number; slots: { main: { content: string } } }[];
    }[];
  };
}

async function fetchPage(title: string, opts: { force: boolean; update: boolean }) {
  if (!opts.force && readPage(title)) return;
  const sources = readSources();
  const pinned = sources.dewiki[title]?.revid;
  const params: Record<string, string> = {
    action: "query",
    prop: "revisions",
    rvprop: "ids|content",
    rvslots: "main",
  };
  if (pinned && !opts.update) params.revids = String(pinned);
  else params.titles = title;
  const answer = await getJson<RevisionsAnswer>(api(DEWIKI_API, params));
  const page = answer.query.pages[0];
  const rev = page?.revisions?.[0];
  if (!page || page.missing || !rev) {
    console.warn(`dewiki: page missing: ${title}`);
    writePage({ title, revid: 0, content: "" });
    return;
  }
  writePage({ title, revid: rev.revid, content: rev.slots.main.content });
  sources.dewiki[title] = { revid: rev.revid };
  writeSources(sources);
  console.log(`dewiki: ${title} @${rev.revid}`);
}

interface PagepropsAnswer {
  query: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
    pages: { title: string; missing?: boolean; pageprops?: { wikibase_item?: string } }[];
  };
}

async function fetchQids(titles: string[], force: boolean) {
  const qids = readQids();
  const todo = [...new Set(titles)].filter((t) => force || !(t in qids));
  for (const batch of chunks(todo, BATCH)) {
    const a = await getJson<PagepropsAnswer>(
      api(DEWIKI_API, {
        action: "query",
        prop: "pageprops",
        ppprop: "wikibase_item",
        redirects: "1",
        titles: batch.join("|"),
      }),
    );
    const step = (from: string, list?: { from: string; to: string }[]) =>
      list?.find((x) => x.from === from)?.to ?? from;
    for (const t of batch) {
      const final = step(step(t, a.query.normalized), a.query.redirects);
      const page = a.query.pages.find((p) => p.title === final);
      qids[t] = page?.pageprops?.wikibase_item ?? null;
    }
    writeQids(qids);
  }
  if (todo.length) console.log(`qids: ${todo.length} articles looked up`);
  return qids;
}

async function fetchEntities(ids: string[], force: boolean) {
  const todo = [...new Set(ids)].filter((q) => force || !readEntity(q));
  for (const batch of chunks(todo, BATCH)) {
    const a = await getJson<{ entities: Record<string, ApiEntity> }>(
      api(WIKIDATA_API, {
        action: "wbgetentities",
        ids: batch.join("|"),
        props: "info|labels|claims",
        languages: "pt|en",
      }),
    );
    for (const e of Object.values(a.entities)) {
      if (e.missing !== undefined) throw new Error(`wikidata: ${e.id} missing`);
      writeEntity(toPersonEntity(e));
    }
  }
  if (todo.length > BATCH) console.log(`wikidata: ${todo.length} entities`);
}

const SEARCH_LIMIT = 7;

/**
 * Card players (boards 1–4 of the top 20) without a QID: search the name on Wikidata and keep the results
 * whose occupation is chess player. build.ts takes a single match only.
 */
async function searchNames(names: string[], force: boolean) {
  const search = readSearch();
  const todo = [...new Set(names)].filter((n) => force || !(n in search));
  const found = new Map<string, string[]>();
  for (const [i, name] of todo.entries()) {
    const a = await getJson<{ search: { id: string }[] }>(
      api(WIKIDATA_API, {
        action: "wbsearchentities",
        search: name,
        language: "en",
        type: "item",
        limit: String(SEARCH_LIMIT),
      }),
    );
    found.set(
      name,
      a.search.map((s) => s.id),
    );
    if ((i + 1) % 10 === 0 || i === todo.length - 1) console.log(`search: ${i + 1}/${todo.length}`);
  }
  // Entities of every result in batches, then keep the chess players.
  await fetchEntities([...found.values()].flat(), false);
  for (const [name, ids] of found) search[name] = ids.filter((q) => readEntity(q)!.chessPlayer);
  writeSearch(search);
}

async function main() {
  const argv = process.argv.slice(2);
  const opts = { force: argv.includes("--force"), update: argv.includes("--update") };
  const years = yearsFromArgs(argv);
  const titles: string[] = [];
  const cardPlayers: { name: string; wikiTitle: string | null }[] = [];
  for (const year of years) {
    await fetchPage(lineupsPage(year), opts);
    await fetchPage(crosstablePage(year), opts);
    const page = readPage(lineupsPage(year));
    if (!page?.content) throw new Error(`${year}: no lineup page`);
    const teams = parseLineups(page.content);
    for (const team of teams)
      for (const p of team.players) if (p.wikiTitle) titles.push(p.wikiTitle);
    for (const team of topTeams(teams))
      cardPlayers.push(...team.players.filter((p) => isCardBoard(p.board)));
  }
  const qids = await fetchQids(titles, opts.force);
  const ids = [
    ...titles.map((t) => qids[t]),
    ...overrides.filter((o) => years.includes(o.year)).map((o) => o.qid),
  ].filter((q): q is string => !!q);
  await fetchEntities(ids, opts.force);
  await searchNames(
    cardPlayers.filter((p) => !p.wikiTitle || !qids[p.wikiTitle]).map((p) => p.name),
    opts.force,
  );
  console.log(`done: ${requestCount()} requests`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
