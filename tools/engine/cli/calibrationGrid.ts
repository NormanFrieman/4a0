/**
 * Ladder result → `balance.engineCalibration` rows, anchored so that Maia
 * 1500 at T=1 is worth 1500 (docs/benchmarks.md), rounded to 5 points.
 *
 *   pnpm tsx tools/engine/cli/calibrationGrid.ts bench-results/ladder-5m-….json
 */
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) throw new Error("usage: calibrationGrid.ts <ladder.json> [anchorSelfElo=1500]");
const anchorElo = Number(process.argv[3] ?? 1500);

const { nodes } = JSON.parse(readFileSync(file, "utf8")) as {
  nodes: Array<{ elo: number; temperature: number; real: number }>;
};
const anchor = nodes.find((n) => n.elo === anchorElo && n.temperature === 1);
if (!anchor) throw new Error(`no node ${anchorElo}@1 in ${file}`);
const shift = anchorElo - anchor.real;

const rows = nodes
  .map((n) => ({
    rating: Math.round((n.real + shift) / 5) * 5,
    selfElo: n.elo,
    temperature: n.temperature,
  }))
  .sort((a, b) => b.temperature - a.temperature || a.selfElo - b.selfElo);

console.error(`shift ${shift.toFixed(0)} (anchor ${anchorElo}@T1)`);
console.log("  engineCalibration: [");
for (const r of rows) {
  console.log(
    `    { rating: ${r.rating}, selfElo: ${r.selfElo}, temperature: ${r.temperature} },`,
  );
}
console.log("  ] satisfies EngineCalibrationPoint[],");
