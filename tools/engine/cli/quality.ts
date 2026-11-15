/**
 * Move quality of Maia-vs-Maia games (docs/benchmarks.md, "Qualidade dos
 * lances"): mates, blunders by Maia's WDL, mates in one allowed or missed,
 * and early material leads.
 *
 *   pnpm engine:quality                                  # cards 2400–2850 (toEngineParams)
 *   pnpm engine:quality --cards 2400 --diffs 0 --games 50
 *   pnpm engine:quality --elos 1800,2200,2600 --temp 1   # raw selfElo, no scale
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { balance } from "../../../src/config/balance.ts";
import { toEngineParams } from "../../../src/engine/strength.ts";
import { type Maia3Variant, blunderCheckFromArgs, blunderCheckOptions } from "../node.ts";
import { qualityThresholds } from "../quality.ts";
import { defaultWorkers, runGames } from "./pool.ts";
import type { ValidateJob, ValidateJobResult } from "./validateWorker.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

const { values } = parseArgs({
  options: {
    /** Card strengths (FIDE-like), converted with toEngineParams. */
    cards: { type: "string", default: "2400,2550,2700,2850" },
    /** Raw Maia selfElo values instead of cards (overrides --cards). */
    elos: { type: "string", default: "" },
    diffs: { type: "string", default: "0,200" },
    /** Card decisiveness (GDD §7.2) for --cards. */
    decisiveness: { type: "string", default: "0.5" },
    /** Temperature for --elos. */
    temp: { type: "string", default: "1" },
    games: { type: "string", default: "100" },
    "top-p": { type: "string", default: String(balance.game.topP) },
    /** Lichess-style deep analysis: Stockfish nodes per position (0 = off). */
    "analyse-nodes": { type: "string", default: "0" },
    pure: { type: "boolean", default: false },
    ...blunderCheckOptions,
    workers: { type: "string", default: String(defaultWorkers()) },
    variant: { type: "string", default: "5m" },
    label: { type: "string", default: "" },
    out: { type: "string", default: join(repoRoot, "bench-results") },
  },
});

const check = blunderCheckFromArgs(values);

const useElos = values.elos !== "";
const levels = (useElos ? values.elos : values.cards).split(",").map(Number);
const diffs = values.diffs.split(",").map(Number);
const gamesPerCell = Number(values.games);
const topP = Number(values["top-p"]);
const decisiveness = Number(values.decisiveness);
const temp = Number(values.temp);

interface Side {
  elo: number;
  temperature: number;
}
interface Cell {
  key: string;
  level: number;
  diff: number;
  a: Side;
  b: Side;
}

const sideFor = (level: number): Side => {
  if (useElos) return { elo: Math.round(level), temperature: temp };
  const p = toEngineParams(level, decisiveness);
  return { elo: p.selfElo, temperature: p.temperature };
};

const cells: Cell[] = [];
for (const level of levels) {
  for (const diff of diffs) {
    cells.push({
      key: `${useElos ? "elo" : "card"}${level}+${diff}`,
      level,
      diff,
      a: sideFor(level + diff / 2),
      b: sideFor(level - diff / 2),
    });
  }
}

const jobs: ValidateJob[] = [];
const meta = new Map<number, { cell: Cell; aIsWhite: boolean }>();
for (const cell of cells) {
  for (let g = 0; g < gamesPerCell; g++) {
    const aIsWhite = g % 2 === 0;
    const id = jobs.length;
    jobs.push({
      id,
      seed: `quality/${cell.key}/${g}`,
      white: aIsWhite ? cell.a : cell.b,
      black: aIsWhite ? cell.b : cell.a,
      topP,
      pure: values.pure,
      check,
      quality: true,
      analyseNodes: Number(values["analyse-nodes"]),
    });
    meta.set(id, { cell, aIsWhite });
  }
}

console.error(
  `${cells.length} cells × ${gamesPerCell} games = ${jobs.length} games on ${values.workers} workers`,
);
for (const c of cells) {
  console.error(
    `  ${c.key}: A selfElo ${c.a.elo} T ${c.a.temperature} · B selfElo ${c.b.elo} T ${c.b.temperature}`,
  );
}

const t0 = performance.now();
const results = await runGames(jobs, {
  variant: values.variant as Maia3Variant,
  workers: Number(values.workers),
});

const [lowDrop, highDrop] = qualityThresholds.blunderDrops;

/** Per player-game counts and ACPL from the Lichess-style analysis, if run. */
function lichessRow(rs: ValidateJobResult[]) {
  const ls = rs.flatMap((r) => (r.lichess ? [r.lichess] : []));
  if (ls.length === 0) return {};
  const players = 2 * ls.length;
  const sum = (f: (l: (typeof ls)[number]) => number) => ls.reduce((a, l) => a + f(l), 0);
  return {
    inaccuraciesPerPlayer: sum((l) => l.inaccuracies) / players,
    mistakesPerPlayer: sum((l) => l.mistakes) / players,
    blundersPerPlayer: sum((l) => l.blunders) / players,
    acpl:
      sum((l) => l.cpLoss) /
      Math.max(
        1,
        sum((l) => l.moves),
      ),
  };
}
const rows = cells.map((cell) => {
  const rs = results.filter((r) => meta.get(r.id)!.cell === cell);
  const n = rs.length;
  const sum = (f: (r: ValidateJobResult) => number) => rs.reduce((a, r) => a + f(r), 0);
  const decisive = rs.filter((r) => r.result !== "1/2-1/2").length;
  const mates = rs.filter((r) => r.termination === "checkmate").length;
  const scored = sum((r) => r.quality!.scoredMoves);
  const scoreA = sum((r) => {
    if (r.result === "1/2-1/2") return 0.5;
    return (r.result === "1-0") === meta.get(r.id)!.aIsWhite ? 1 : 0;
  });
  return {
    cell: cell.key,
    selfEloA: cell.a.elo,
    tempA: cell.a.temperature,
    selfEloB: cell.b.elo,
    tempB: cell.b.temperature,
    games: n,
    scoreA: scoreA / n,
    draws: (n - decisive) / n,
    resignations: rs.filter((r) => r.termination === "resignation").length / n,
    mates: mates / n,
    matesOfDecisive: decisive ? mates / decisive : 0,
    avgPlies: sum((r) => r.plies) / n,
    blundersLowPer100: (100 * sum((r) => r.quality!.blunders[0]!)) / Math.max(1, scored),
    blundersHighPer100: (100 * sum((r) => r.quality!.blunders[1]!)) / Math.max(1, scored),
    allowedMateInOnePerGame: sum((r) => r.quality!.allowedMateInOne) / n,
    missedMateInOnePerGame: sum((r) => r.quality!.missedMateInOne) / n,
    earlyMaterialLead: rs.filter((r) => r.quality!.earlyMaterialLead).length / n,
    ...lichessRow(rs),
  };
});

const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
const cols: Array<[string, (r: (typeof rows)[number]) => string]> = [
  ["cell", (r) => r.cell],
  ["games", (r) => String(r.games)],
  ["scoreA", (r) => pct(r.scoreA)],
  ["draws", (r) => pct(r.draws)],
  ["resign", (r) => pct(r.resignations)],
  ["mate", (r) => pct(r.mates)],
  ["mate/dec", (r) => pct(r.matesOfDecisive)],
  ["plies", (r) => r.avgPlies.toFixed(0)],
  [`bl≥${lowDrop}`, (r) => r.blundersLowPer100.toFixed(1)],
  [`bl≥${highDrop}`, (r) => r.blundersHighPer100.toFixed(1)],
  ["M1 allowed/g", (r) => r.allowedMateInOnePerGame.toFixed(2)],
  ["M1 missed/g", (r) => r.missedMateInOnePerGame.toFixed(2)],
  ["+3 early", (r) => pct(r.earlyMaterialLead)],
];
if (Number(values["analyse-nodes"]) > 0) {
  cols.push(
    ["?!/pl", (r) => (r.inaccuraciesPerPlayer ?? 0).toFixed(2)],
    ["?/pl", (r) => (r.mistakesPerPlayer ?? 0).toFixed(2)],
    ["??/pl", (r) => (r.blundersPerPlayer ?? 0).toFixed(2)],
    ["ACPL", (r) => (r.acpl ?? 0).toFixed(0)],
  );
}
console.log(
  `\nMove quality (top-p ${topP}${values.pure ? ", pure" : ""}). Blunders per 100 scored moves.\n`,
);
const widths = cols.map(([h, f]) => Math.max(h.length, ...rows.map((r) => f(r).length)) + 2);
console.log(cols.map(([h], i) => h.padStart(widths[i]!)).join(""));
for (const r of rows) console.log(cols.map(([, f], i) => f(r).padStart(widths[i]!)).join(""));
console.log(`\n${results.length} games in ${((performance.now() - t0) / 1000).toFixed(0)}s`);

mkdirSync(values.out, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const file = join(values.out, `quality${values.label ? `-${values.label}` : ""}-${stamp}.json`);
writeFileSync(
  file,
  JSON.stringify(
    {
      args: values,
      thresholds: qualityThresholds,
      rows,
      games: results.map((r) => ({ ...r, cell: meta.get(r.id)!.cell.key })),
    },
    null,
    2,
  ),
);
console.log(`results: ${file}`);
