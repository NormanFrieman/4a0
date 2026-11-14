/**
 * Phase 0 validation (GDD §12.1): does Maia-3's rating translate into
 * strength the way the Elo curve predicts?
 *
 *   pnpm engine:validate                       # full matrix (200 games/cell)
 *   pnpm engine:validate --bands 1500 --games 50
 *   pnpm engine:validate --style --games 100   # temperature (Style) experiment
 *   pnpm engine:validate --game --bands 1000,1400,1800   # game ratings via engineCalibration
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { balance } from "../../../src/config/balance.ts";
import { engineParamsForRating } from "../../../src/engine/engineParams.ts";
import { expectedScore } from "../../../src/sim/elo.ts";
import type { Maia3Variant } from "../node.ts";
import { defaultWorkers, runGames } from "./pool.ts";
import type { ValidateJob, ValidateJobResult } from "./validateWorker.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

const { values } = parseArgs({
  options: {
    bands: { type: "string", default: "900,1500,2100" },
    diffs: { type: "string", default: "0,100,200,400" },
    games: { type: "string", default: "200" },
    temp: { type: "string", default: "1" },
    "top-p": { type: "string", default: String(balance.game.topP) },
    style: { type: "boolean", default: false },
    /** Disable draw by agreement and resignation. */
    pure: { type: "boolean", default: false },
    /** Interpret ratings as game ratings and convert with engineCalibration. */
    game: { type: "boolean", default: false },
    workers: { type: "string", default: String(defaultWorkers()) },
    variant: { type: "string", default: "5m" },
    out: { type: "string", default: join(repoRoot, "bench-results") },
  },
});

const bands = values.bands.split(",").map(Number);
const diffs = values.diffs.split(",").map(Number);
const gamesPerCell = Number(values.games);
const temp = Number(values.temp);
const topP = Number(values["top-p"]);
const nWorkers = Number(values.workers);

/** A cell compares "A" (stronger, or solid in style mode) against "B". */
interface Cell {
  key: string;
  band: number;
  diff: number;
  a: { elo: number; temperature: number };
  b: { elo: number; temperature: number };
  /** Ratings used for the Elo expectation (game ratings in --game mode). */
  ra: number;
  rb: number;
}

const sideFor = (rating: number) => {
  if (!values.game) return { elo: rating, temperature: temp };
  const p = engineParamsForRating(rating);
  return { elo: p.selfElo, temperature: p.temperature };
};

const cells: Cell[] = [];
for (const band of bands) {
  if (values.style) {
    cells.push({
      key: `style@${band}`,
      band,
      diff: 0,
      a: { elo: band, temperature: balance.style.temperatureMin },
      b: { elo: band, temperature: balance.style.temperatureMax },
      ra: band,
      rb: band,
    });
  } else {
    for (const diff of diffs) {
      cells.push({
        key: `${band}+${diff}`,
        band,
        diff,
        a: sideFor(band + diff / 2),
        b: sideFor(band - diff / 2),
        ra: band + diff / 2,
        rb: band - diff / 2,
      });
    }
  }
}

interface JobMeta {
  cell: Cell;
  aIsWhite: boolean;
}
const jobs: ValidateJob[] = [];
const meta = new Map<number, JobMeta>();
for (const cell of cells) {
  for (let g = 0; g < gamesPerCell; g++) {
    const aIsWhite = g % 2 === 0;
    const id = jobs.length;
    jobs.push({
      id,
      seed: `validate/${values.game ? "game/" : ""}${cell.key}/t${temp}/${g}`,
      white: aIsWhite ? cell.a : cell.b,
      black: aIsWhite ? cell.b : cell.a,
      topP,
      pure: values.pure,
    });
    meta.set(id, { cell, aIsWhite });
  }
}

console.error(
  `${cells.length} cells × ${gamesPerCell} games = ${jobs.length} games on ${nWorkers} workers (variant ${values.variant})`,
);

const t0 = performance.now();
const results = await runGames(jobs, {
  variant: values.variant as Maia3Variant,
  workers: nWorkers,
});

// ---- Aggregate -------------------------------------------------------------

const scoreForA = (r: ValidateJobResult, aIsWhite: boolean): number =>
  r.result === "1/2-1/2" ? 0.5 : (r.result === "1-0") === aIsWhite ? 1 : 0;

interface Row {
  cell: string;
  band: number;
  diff: number;
  games: number;
  scoreA: number;
  ci95: number;
  expected: number;
  impliedDiff: number;
  drawRate: number;
  avgPlies: number;
  adjudicated: number;
}

const rows: Row[] = cells.map((cell) => {
  const rs = results.filter((r) => meta.get(r.id)!.cell === cell);
  const scores = rs.map((r) => scoreForA(r, meta.get(r.id)!.aIsWhite));
  const n = scores.length;
  const mean = scores.reduce((a, b) => a + b, 0) / n;
  const variance = scores.reduce((a, s) => a + (s - mean) ** 2, 0) / Math.max(1, n - 1);
  const clamped = Math.min(0.999, Math.max(0.001, mean));
  return {
    cell: cell.key,
    band: cell.band,
    diff: cell.diff,
    games: n,
    scoreA: mean,
    ci95: 1.96 * Math.sqrt(variance / n),
    expected: expectedScore(cell.ra, cell.rb),
    impliedDiff: -400 * Math.log10(1 / clamped - 1),
    drawRate: rs.filter((r) => r.result === "1/2-1/2").length / n,
    avgPlies: rs.reduce((a, r) => a + r.plies, 0) / n,
    adjudicated: rs.filter((r) => r.termination === "adjudication").length,
  };
});

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
console.log(
  values.style
    ? `\nStyle: solid (T=${balance.style.temperatureMin}) vs combative (T=${balance.style.temperatureMax}), same rating. Score = solid.\n`
    : values.game
      ? `\nGame ratings via engineCalibration (top-p ${topP}). Score of the stronger side vs Elo expectation.\n`
      : `\nScore of the stronger side vs Elo expectation (temperature ${temp}, top-p ${topP}).\n`,
);
console.log(
  "cell".padEnd(14) +
    "games".padStart(6) +
    "score".padStart(9) +
    "±95%".padStart(8) +
    "expected".padStart(10) +
    "implied Δ".padStart(11) +
    "draws".padStart(8) +
    "plies".padStart(7) +
    "adj".padStart(5),
);
for (const r of rows) {
  console.log(
    r.cell.padEnd(14) +
      String(r.games).padStart(6) +
      pct(r.scoreA).padStart(9) +
      pct(r.ci95).padStart(8) +
      pct(r.expected).padStart(10) +
      r.impliedDiff.toFixed(0).padStart(11) +
      pct(r.drawRate).padStart(8) +
      r.avgPlies.toFixed(0).padStart(7) +
      String(r.adjudicated).padStart(5),
  );
}
const totalS = (performance.now() - t0) / 1000;
console.log(`\n${results.length} games in ${totalS.toFixed(0)}s`);

mkdirSync(values.out, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const base = join(values.out, `validate${values.style ? "-style" : ""}-${stamp}`);
writeFileSync(
  `${base}.json`,
  JSON.stringify(
    {
      args: values,
      rows,
      games: results.map((r) => ({ ...r, ...meta.get(r.id), cell: meta.get(r.id)!.cell.key })),
    },
    null,
    2,
  ),
);
writeFileSync(
  `${base}.csv`,
  [Object.keys(rows[0]!).join(","), ...rows.map((r) => Object.values(r).join(","))].join("\n"),
);
console.log(`results: ${base}.json / .csv`);
