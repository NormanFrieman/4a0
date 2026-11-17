/**
 * Downloads PGN collections from PGN Mentor. Files are only read as text by
 * the book pipeline, never executed. Existing files are kept; pass --force to
 * download again.
 *
 * - `pnpm data:pgn`: tools/data/sample/pgnSources.ts → tools/data/sample/pgn/
 * - `pnpm data:pgn --champions`: the world champions of
 *   tools/data/olympiads/worldChampions.ts → tools/data/cache/pgn/
 *
 * Both folders are git-ignored.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { unzipSync } from "fflate";
import { CHAMPIONS_PGN_DIR } from "./olympiads/cache.ts";
import { worldChampions } from "./olympiads/worldChampions.ts";
import { PGN_BASE_URL, pgnSources } from "./sample/pgnSources.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
export const PGN_DIR = resolve(HERE, "sample/pgn");

async function main() {
  const force = process.argv.includes("--force");
  const champions = process.argv.includes("--champions");
  const dir = champions ? CHAMPIONS_PGN_DIR : PGN_DIR;
  const sources = champions
    ? Object.values(worldChampions).map((c) => c.pgn)
    : Object.values(pgnSources);
  mkdirSync(dir, { recursive: true });
  const files = [...new Set(sources.map((s) => s.file))];
  for (const file of files) {
    const out = join(dir, `${file}.pgn`);
    if (!force && existsSync(out)) {
      console.log(`${file}: already downloaded`);
      continue;
    }
    const res = await fetch(`${PGN_BASE_URL}${file}.zip`);
    if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
    const entries = unzipSync(new Uint8Array(await res.arrayBuffer()), {
      filter: (f) => f.name.toLowerCase().endsWith(".pgn"),
    });
    const pgns = Object.values(entries);
    if (pgns.length === 0) throw new Error(`${file}: no .pgn in the archive`);
    // Concatenate in case the archive holds several files.
    const total = pgns.reduce((s, p) => s + p.length + 1, 0);
    const joined = new Uint8Array(total);
    let offset = 0;
    for (const p of pgns) {
      joined.set(p, offset);
      joined[offset + p.length] = 10;
      offset += p.length + 1;
    }
    writeFileSync(out, joined);
    console.log(`${file}: ${(joined.length / 1e6).toFixed(1)} MB`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
