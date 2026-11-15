/**
 * Calibration ladder: measures Maia-3's *real* strength at each selfElo (and a
 * few temperatures) so game ratings can be mapped to engine parameters.
 *
 * Nodes are (selfElo, temperature). Each node plays its neighbours; ratings
 * are fitted by maximum likelihood (see calibration/fitElo.ts).
 *
 *   pnpm engine:ladder                    # 600..2600 step 200, 200 games/pair
 *   pnpm engine:ladder --games 50 --step 400
 *   pnpm engine:ladder --style-temps 0.7,0.9,1.1   # style grid (GDD §7.2)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { balance } from "../../../src/config/balance.ts";
import { fitElo, type PairResult } from "../calibration/fitElo.ts";
import { type Maia3Variant, blunderCheckFromArgs, blunderCheckOptions } from "../node.ts";
import { defaultWorkers, runGames } from "./pool.ts";
import type { ValidateJob } from "./validateWorker.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

const { values } = parseArgs({
  options: {
    /** Maia-3 selfElo input range. */
    min: { type: "string", default: "600" },
    max: { type: "string", default: "2600" },
    step: { type: "string", default: "200" },
    games: { type: "string", default: "200" },
    /** Temperatures explored at the top of the ladder (stronger than T=1). */
    "top-temps": { type: "string", default: "0.8,0.6" },
    /** Temperatures explored at the bottom of the ladder (weaker than T=1). */
    "bottom-temps": { type: "string", default: "1.3" },
    /**
     * Full parallel ladders at these temperatures, for the style grid
     * (selfElo × temperature, GDD §7.2). Each node also plays the T=1 node
     * of the same selfElo.
     */
    "style-temps": { type: "string", default: "" },
    variant: { type: "string", default: "5m" },
    "top-p": { type: "string", default: String(balance.game.topP) },
    /** Disable draw by agreement and resignation. */
    pure: { type: "boolean", default: false },
    ...blunderCheckOptions,
    workers: { type: "string", default: String(defaultWorkers()) },
    out: { type: "string", default: join(repoRoot, "bench-results") },
  },
});

const check = blunderCheckFromArgs(values);

interface Node {
  id: string;
  elo: number;
  temperature: number;
}
const node = (elo: number, temperature: number): Node => ({
  id: `${elo}@T${temperature}`,
  elo,
  temperature,
});

const min = Number(values.min);
const max = Number(values.max);
const step = Number(values.step);
const gamesPerPair = Number(values.games);

const base: Node[] = [];
for (let e = min; e <= max; e += step) base.push(node(e, 1));

const pairs: Array<[Node, Node]> = [];
// Neighbours at distance 1 and 2 on the T=1 ladder.
for (let i = 0; i < base.length; i++) {
  if (base[i + 1]) pairs.push([base[i]!, base[i + 1]!]);
  if (base[i + 2]) pairs.push([base[i]!, base[i + 2]!]);
}
// Temperature extensions at both ends, chained to the ladder.
const chain = (anchors: Node[], temps: number[], elo: number) => {
  let prev = anchors;
  for (const t of temps) {
    const n = node(elo, t);
    for (const a of prev) pairs.push([n, a]);
    prev = [n, prev[0]!];
  }
};
const topTemps = values["top-temps"] ? values["top-temps"].split(",").map(Number) : [];
const bottomTemps = values["bottom-temps"] ? values["bottom-temps"].split(",").map(Number) : [];
chain([base[base.length - 1]!, base[base.length - 2]!], topTemps, max);
chain([base[0]!, base[1]!], bottomTemps, min);
const styleTemps = values["style-temps"]
  ? values["style-temps"]
      .split(",")
      .map(Number)
      .filter((t) => t !== 1)
  : [];
for (const t of styleTemps) {
  const ladder = base.map((b) => node(b.elo, t));
  for (let i = 0; i < ladder.length; i++) {
    pairs.push([ladder[i]!, base[i]!]);
    if (ladder[i + 1]) pairs.push([ladder[i]!, ladder[i + 1]!]);
  }
}

const jobs: ValidateJob[] = [];
const jobPair = new Map<number, { a: Node; aIsWhite: boolean }>();
const pairOf = new Map<number, string>();
for (const [a, b] of pairs) {
  for (let g = 0; g < gamesPerPair; g++) {
    const aIsWhite = g % 2 === 0;
    const id = jobs.length;
    const side = (n: Node) => ({ elo: n.elo, temperature: n.temperature });
    jobs.push({
      id,
      seed: `ladder/${a.id}/${b.id}/${g}`,
      white: side(aIsWhite ? a : b),
      black: side(aIsWhite ? b : a),
      topP: Number(values["top-p"]),
      pure: values.pure,
      check,
    });
    jobPair.set(id, { a, aIsWhite });
    pairOf.set(id, `${a.id}|${b.id}`);
  }
}

console.error(
  `${pairs.length} pairs × ${gamesPerPair} games = ${jobs.length} games on ${values.workers} workers (variant ${values.variant})`,
);
const t0 = performance.now();
const results = await runGames(jobs, {
  variant: values.variant as Maia3Variant,
  workers: Number(values.workers),
});

// ---- Fit ---------------------------------------------------------------------
const pairResults: PairResult[] = results.map((r) => {
  const { aIsWhite } = jobPair.get(r.id)!;
  const [aId, bId] = pairOf.get(r.id)!.split("|") as [string, string];
  const scoreA = r.result === "1/2-1/2" ? 0.5 : (r.result === "1-0") === aIsWhite ? 1 : 0;
  return { a: aId, b: bId, scoreA };
});

// Anchor: the T=1 ladder keeps its nominal mean, so mid-ladder numbers stay familiar.
const anchorMean = base.reduce((s, n) => s + n.elo, 0) / base.length;
const fit = fitElo(pairResults, { nodes: base.map((n) => n.id), mean: anchorMean });

// Linear slope of real vs nominal on the T=1 ladder (1 = no compression).
const xs = base.map((n) => n.elo);
const ys = base.map((n) => fit[n.id]!);
const mx = xs.reduce((a, b) => a + b) / xs.length;
const my = ys.reduce((a, b) => a + b) / ys.length;
const slope =
  xs.reduce((s, x, i) => s + (x - mx) * (ys[i]! - my), 0) /
  xs.reduce((s, x) => s + (x - mx) ** 2, 0);

const allNodes = [...new Map(pairs.flat().map((n) => [n.id, n])).values()].sort(
  (a, b) => fit[a.id]! - fit[b.id]!,
);
console.log(`\nReal strength per (selfElo, temperature), anchored to mean ${anchorMean} on T=1.\n`);
console.log(
  "node".padEnd(14) +
    "selfElo".padStart(8) +
    "T".padStart(6) +
    "real".padStart(8) +
    "Δ prev".padStart(9),
);
let prev: number | null = null;
for (const n of allNodes) {
  const r = fit[n.id]!;
  console.log(
    n.id.padEnd(14) +
      String(n.elo).padStart(8) +
      String(n.temperature).padStart(6) +
      r.toFixed(0).padStart(8) +
      (prev === null ? "" : (r - prev).toFixed(0)).padStart(9),
  );
  prev = r;
}
console.log(
  `\nT=1 ladder: real range ${Math.min(...ys).toFixed(0)}–${Math.max(...ys).toFixed(0)} (nominal ${min}–${max}), slope ${slope.toFixed(2)}`,
);
console.log(
  `Overall real range: ${fit[allNodes[0]!.id]!.toFixed(0)}–${fit[allNodes[allNodes.length - 1]!.id]!.toFixed(0)}`,
);

// Draw rate and how games ended, per selfElo (both sides at that level ±1 step).
const byElo = new Map<
  number,
  { n: number; draws: number; agreement: number; resignation: number }
>();
for (const r of results) {
  const [aId, bId] = pairOf.get(r.id)!.split("|") as [string, string];
  const elo = Math.round((Number(aId.split("@")[0]) + Number(bId.split("@")[0])) / 2 / step) * step;
  const s = byElo.get(elo) ?? { n: 0, draws: 0, agreement: 0, resignation: 0 };
  s.n++;
  if (r.result === "1/2-1/2") s.draws++;
  if (r.termination === "agreement") s.agreement++;
  if (r.termination === "resignation") s.resignation++;
  byElo.set(elo, s);
}
const pct = (x: number, n: number) => `${((100 * x) / n).toFixed(0)}%`.padStart(8);
console.log(`
${"selfElo".padEnd(9)}${"games".padStart(7)}${"draws".padStart(8)}${"agreed".padStart(8)}${"resign".padStart(8)}`);
for (const [elo, s] of [...byElo.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(
    String(elo).padEnd(9) +
      String(s.n).padStart(7) +
      pct(s.draws, s.n) +
      pct(s.agreement, s.n) +
      pct(s.resignation, s.n),
  );
}
const avgPlies = results.reduce((a, r) => a + r.plies, 0) / results.length;
console.log(`Average length: ${avgPlies.toFixed(0)} plies`);
console.log(`${results.length} games in ${((performance.now() - t0) / 1000).toFixed(0)}s`);

mkdirSync(values.out, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const file = join(values.out, `ladder-${values.variant}-${stamp}.json`);
writeFileSync(
  file,
  JSON.stringify(
    {
      args: values,
      slope,
      nodes: allNodes.map((n) => ({ ...n, real: fit[n.id] })),
      games: pairResults,
    },
    null,
    2,
  ),
);
console.log(`results: ${file}`);
