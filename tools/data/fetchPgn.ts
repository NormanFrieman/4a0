/**
 * Downloads the PGN collections of tools/data/sample/pgnSources.ts into
 * tools/data/sample/pgn/ (git-ignored). `pnpm data:pgn`. Files are only read
 * as text by the book pipeline, never executed. Existing files are kept;
 * pass --force to download again.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { unzipSync } from "fflate";
import { PGN_BASE_URL, pgnSources } from "./sample/pgnSources.ts";

export const PGN_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "sample/pgn");

async function main() {
  const force = process.argv.includes("--force");
  mkdirSync(PGN_DIR, { recursive: true });
  const files = [...new Set(Object.values(pgnSources).map((s) => s.file))];
  for (const file of files) {
    const out = join(PGN_DIR, `${file}.pgn`);
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
