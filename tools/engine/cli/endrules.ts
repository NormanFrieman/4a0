/**
 * End-rule sweep (docs/plano-calibracao.md, Fase A): resignation and draw by
 * agreement (GDD §8.2).
 *
 * Plays every cell once WITHOUT end rules, recording each engine evaluation,
 * then replays any number of rule sets offline (tools/engine/endRules.ts):
 * the result is exactly what `playGame` would give with those rules, and the
 * strength comparison between rule sets is paired (same games).
 *
 * Cells are in engine parameters (selfElo@T), not cards, so the sweep does
 * not depend on engineCalibration.
 *
 *   pnpm engine:endrules --games 200                       # play + sweep
 *   pnpm engine:endrules --from bench-results/endrules-….json --resign-from 1,20,25
 *   pnpm engine:endrules --book public/data/sample/books/decade-1980.bin
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { balance } from "../../../src/config/balance.ts";
import { defaultEndRules, type EndRules } from "../../../src/engine/endRules.ts";
import type { GameResult } from "../../../src/engine/game.ts";
import { interpolate } from "../../../src/engine/strength.ts";
import { type RecordedGame, type ReplayedGame, replayEndRules } from "../endRules.ts";
import { type Maia3Variant, blunderCheckFromArgs, blunderCheckOptions } from "../node.ts";
import { defaultWorkers, runGames } from "./pool.ts";
import type { ValidateJob } from "./validateWorker.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

const { values } = parseArgs({
  options: {
    /** Recorded games from a previous run: skip playing. */
    from: { type: "string" },
    games: { type: "string", default: "200" },
    /**
     * Cells "strong-weak;…", each side selfElo@T. Default: 1800, 2200 and 2600
     * at T 1, plus 2600 at T 0.8, each with differences 0, +200 and +400.
     */
    cells: { type: "string" },
    /**
     * Approximate card strength of each tier (strong side), for the draw
     * target. Rough: from the pre-filter calibration (docs/benchmarks.md).
     */
    tiers: { type: "string", default: "1800@1:2400,2200@1:2550,2600@1:2700,2600@0.8:2800" },
    /** Polyglot book for both sides. */
    book: { type: "string" },
    // Sweep grid (comma lists). Defaults = current balance.game values.
    "resign-from": { type: "string", default: "1,15,20,25,30" },
    "resign-prob": { type: "string", default: "0.03,0.05,0.1,0.15" },
    "resign-stable": { type: "string", default: "3,6,10" },
    "draw-from": { type: "string", default: String(balance.game.drawOfferFromMove) },
    "draw-band": { type: "string", default: String(balance.game.drawBand) },
    "draw-stable": { type: "string", default: String(balance.game.drawStableMoves) },
    /** Expected score below which a side is lost (for "lost ending played out"). */
    hopeless: { type: "string", default: "0.1" },
    /** Own moves below `hopeless` at the end that count as a lost ending played out. */
    "hopeless-moves": { type: "string", default: "8" },
    /** Move before which a resignation counts as "in the opening". */
    "early-move": { type: "string", default: "25" },
    /** Show per-cell detail for the best N rule sets. */
    detail: { type: "string", default: "3" },
    "top-p": { type: "string", default: String(balance.game.topP) },
    ...blunderCheckOptions,
    workers: { type: "string", default: String(defaultWorkers()) },
    variant: { type: "string", default: "5m" },
    out: { type: "string", default: join(repoRoot, "bench-results") },
  },
});

interface Side {
  elo: number;
  temperature: number;
}
interface Cell {
  key: string;
  tier: string;
  strong: Side;
  weak: Side;
}
interface StoredGame extends RecordedGame {
  cell: string;
  /** Stronger side had white. */
  strongWhite: boolean;
}

const parseSide = (s: string): Side => {
  const [elo, t] = s.split("@");
  return { elo: Number(elo), temperature: Number(t ?? 1) };
};
const sideKey = (s: Side) => `${s.elo}@${s.temperature}`;

function defaultCells(): string {
  const out: string[] = [];
  for (const [elo, t] of [
    [1800, 1],
    [2200, 1],
    [2600, 1],
  ] as const) {
    for (const d of [0, 200, 400]) out.push(`${elo}@${t}-${elo - d}@${t}`);
  }
  out.push("2600@0.8-2600@0.8", "2600@0.8-2600@1", "2600@0.8-2400@1");
  return out.join(";");
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
mkdirSync(values.out, { recursive: true });

let cells: Cell[];
let games: StoredGame[];

if (values.from) {
  const data = JSON.parse(readFileSync(values.from, "utf8")) as {
    cells: Cell[];
    games: StoredGame[];
  };
  cells = data.cells;
  games = data.games;
  console.error(`loaded ${games.length} games from ${values.from}`);
} else {
  cells = (values.cells ?? defaultCells()).split(";").map((c) => {
    const [a, b] = c.split("-").map(parseSide);
    return { key: `${sideKey(a!)} vs ${sideKey(b!)}`, tier: sideKey(a!), strong: a!, weak: b! };
  });
  const check = blunderCheckFromArgs(values);
  const n = Number(values.games);
  const topP = Number(values["top-p"]);
  const book = values.book ? resolve(values.book) : undefined;
  const jobs: ValidateJob[] = [];
  const meta = new Map<number, { cell: string; strongWhite: boolean }>();
  for (const c of cells) {
    for (let i = 0; i < n; i++) {
      const strongWhite = i % 2 === 0;
      const id = jobs.length;
      meta.set(id, { cell: c.key, strongWhite });
      jobs.push({
        id,
        seed: `endrules/${c.key}/${i}`,
        white: strongWhite ? c.strong : c.weak,
        black: strongWhite ? c.weak : c.strong,
        topP,
        check,
        pure: true,
        record: true,
        ...(book ? { whiteBook: book, blackBook: book } : {}),
      });
    }
  }
  console.error(`${cells.length} cells × ${n} games, ${values.workers} workers`);
  const t0 = performance.now();
  const results = await runGames(jobs, {
    variant: values.variant as Maia3Variant,
    workers: Number(values.workers),
  });
  console.error(`played in ${((performance.now() - t0) / 1000).toFixed(0)}s`);
  games = results
    .sort((a, b) => a.id - b.id)
    .map((r) => ({
      ...meta.get(r.id)!,
      result: r.result,
      termination: r.termination,
      evals: r.evals!,
    }));
  const file = join(values.out, `endrules-games-${stamp}.json`);
  writeFileSync(file, JSON.stringify({ args: values, cells, games }));
  console.error(`games: ${file}`);
}

// ---------------------------------------------------------------- sweep

const list = (s: string) => s.split(",").map(Number);
const ruleSets: Array<{ name: string; rules: EndRules | false }> = [
  { name: "pure", rules: false },
  { name: "current", rules: defaultEndRules() },
];
for (const resignFromMove of list(values["resign-from"]))
  for (const resignProb of list(values["resign-prob"]))
    for (const resignStableMoves of list(values["resign-stable"]))
      for (const drawOfferFromMove of list(values["draw-from"]))
        for (const drawBand of list(values["draw-band"]))
          for (const drawStableMoves of list(values["draw-stable"])) {
            const rules: EndRules = {
              resignFromMove,
              resignProb,
              resignStableMoves,
              drawOfferFromMove,
              drawBand,
              drawStableMoves,
            };
            ruleSets.push({
              name: `rF${resignFromMove} rP${resignProb} rS${resignStableMoves} dF${drawOfferFromMove} dB${drawBand} dS${drawStableMoves}`,
              rules,
            });
          }

const hopeless = Number(values.hopeless);
const hopelessMoves = Number(values["hopeless-moves"]);
const earlyMove = Number(values["early-move"]);
const tierStrength = new Map(
  values.tiers.split(",").map((t) => {
    const [k, v] = t.split(":");
    return [k!, Number(v)] as const;
  }),
);
const drawTarget = (tier: string) => {
  const s = tierStrength.get(tier);
  return s === undefined
    ? NaN
    : interpolate(
        balance.game.drawTarget.map((p) => [p.strength, p.rate] as const),
        s,
      );
};

const strongScore = (g: StoredGame, result: GameResult) =>
  result === "1/2-1/2" ? 0.5 : (result === "1-0") === g.strongWhite ? 1 : 0;

interface Stats {
  games: number;
  score: number;
  draws: number;
  agreement: number;
  repetition: number;
  stalemate: number;
  otherDraw: number;
  resign: number;
  earlyResign: number;
  mate: number;
  playedOut: number;
  plies: number;
  minResignMove: number;
}
const empty = (): Stats => ({
  games: 0,
  score: 0,
  draws: 0,
  agreement: 0,
  repetition: 0,
  stalemate: 0,
  otherDraw: 0,
  resign: 0,
  earlyResign: 0,
  mate: 0,
  playedOut: 0,
  plies: 0,
  minResignMove: Infinity,
});
function add(s: Stats, g: StoredGame, r: ReplayedGame) {
  s.games++;
  s.score += strongScore(g, r.result);
  s.plies += r.plies;
  if (r.result === "1/2-1/2") {
    s.draws++;
    if (r.termination === "agreement") s.agreement++;
    else if (r.termination === "threefoldRepetition") s.repetition++;
    else if (r.termination === "stalemate") s.stalemate++;
    else s.otherDraw++;
  }
  if (r.termination === "resignation") {
    s.resign++;
    if (r.resignMove! < earlyMove) s.earlyResign++;
    s.minResignMove = Math.min(s.minResignMove, r.resignMove!);
  }
  if (r.termination === "checkmate") s.mate++;
  if (
    ["checkmate", "stalemate", "adjudication"].includes(r.termination) &&
    r.hopelessTail >= hopelessMoves
  )
    s.playedOut++;
}

const tiers = [...new Set(cells.map((c) => c.tier))];
const cellTier = new Map(cells.map((c) => [c.key, c.tier]));

interface RuleRow {
  name: string;
  rules: EndRules | false;
  total: Stats;
  byCell: Map<string, Stats>;
  byTier: Map<string, Stats>;
  /** Paired score difference of the stronger side vs current rules, per cell (p.p.). */
  maxShift: number;
  meanShift: number;
  drawGap: number;
}
const rows: RuleRow[] = ruleSets.map(({ name, rules }) => {
  const total = empty();
  const byCell = new Map(cells.map((c) => [c.key, empty()]));
  const byTier = new Map(tiers.map((t) => [t, empty()]));
  for (const g of games) {
    const r = replayEndRules(g, rules, hopeless);
    add(total, g, r);
    add(byCell.get(g.cell)!, g, r);
    add(byTier.get(cellTier.get(g.cell)!)!, g, r);
  }
  return { name, rules, total, byCell, byTier, maxShift: 0, meanShift: 0, drawGap: 0 };
});
const baseline = rows.find((r) => r.name === "current")!;
for (const row of rows) {
  const shifts = cells.map((c) => {
    const a = row.byCell.get(c.key)!;
    const b = baseline.byCell.get(c.key)!;
    return ((a.score - b.score) / a.games) * 100;
  });
  row.maxShift = Math.max(...shifts.map(Math.abs));
  row.meanShift = shifts.reduce((s, x) => s + Math.abs(x), 0) / shifts.length;
  row.drawGap =
    tiers.reduce((s, t) => {
      const st = row.byTier.get(t)!;
      return s + Math.abs(st.draws / st.games - drawTarget(t));
    }, 0) / tiers.length;
}

const pct = (n: number, d: number) => `${((n / d) * 100).toFixed(1)}%`;
const pad = (s: string, n: number) => s.padStart(n);

console.log(
  `\n${games.length} games, ${cells.length} cells. Strength shift = paired score change of the stronger side vs current rules, max over cells.`,
);
console.log(
  `Played out = mate/stalemate/adjudication with ≥${hopelessMoves} own moves below ${hopeless} at the end. Early = resigned before move ${earlyMove}.\n`,
);
const tierHead = tiers.map((t) => pad(`D ${t}`, 11)).join("");
console.log(
  "rules".padEnd(42) +
    pad("resign", 8) +
    pad("early", 7) +
    pad("minMv", 6) +
    pad("mate", 7) +
    pad("playOut", 8) +
    pad("plies", 6) +
    pad("maxΔ", 6) +
    tierHead,
);
console.log(
  "draw target".padEnd(90) + tiers.map((t) => pad(pct(drawTarget(t), 1), 11)).join(""),
);
const sorted = [
  ...rows.slice(0, 2),
  ...rows.slice(2).sort((a, b) => a.total.playedOut - b.total.playedOut || a.maxShift - b.maxShift),
];
const line = (r: RuleRow) => {
  const t = r.total;
  console.log(
    r.name.padEnd(42) +
      pad(pct(t.resign, t.games), 8) +
      pad(pct(t.earlyResign, t.games), 7) +
      pad(Number.isFinite(t.minResignMove) ? String(t.minResignMove) : "-", 6) +
      pad(pct(t.mate, t.games), 7) +
      pad(pct(t.playedOut, t.games), 8) +
      pad((t.plies / t.games).toFixed(0), 6) +
      pad(r.maxShift.toFixed(1), 6) +
      tiers
        .map((tier) => {
          const s = r.byTier.get(tier)!;
          return pad(pct(s.draws, s.games), 11);
        })
        .join(""),
  );
};
for (const r of sorted) line(r);

const nDetail = Number(values.detail);
const detailRows = [
  ...rows.slice(0, 2),
  ...sorted
    .slice(2)
    .filter((r) => r.maxShift <= 3 && r.total.earlyResign === 0)
    .slice(0, nDetail),
];
for (const r of detailRows) {
  console.log(`\n${r.name}`);
  console.log(
    "cell".padEnd(24) +
      pad("score", 8) +
      pad("Δ", 6) +
      pad("draws", 8) +
      pad("agree", 7) +
      pad("rep", 7) +
      pad("stale", 7) +
      pad("resign", 8) +
      pad("mate", 7) +
      pad("playOut", 8) +
      pad("plies", 6),
  );
  for (const c of cells) {
    const s = r.byCell.get(c.key)!;
    const b = baseline.byCell.get(c.key)!;
    console.log(
      c.key.padEnd(24) +
        pad(pct(s.score, s.games), 8) +
        pad((((s.score - b.score) / s.games) * 100).toFixed(1), 6) +
        pad(pct(s.draws, s.games), 8) +
        pad(pct(s.agreement, s.games), 7) +
        pad(pct(s.repetition, s.games), 7) +
        pad(pct(s.stalemate, s.games), 7) +
        pad(pct(s.resign, s.games), 8) +
        pad(pct(s.mate, s.games), 7) +
        pad(pct(s.playedOut, s.games), 8) +
        pad((s.plies / s.games).toFixed(0), 6),
    );
  }
}

const file = join(values.out, `endrules-sweep-${stamp}.json`);
writeFileSync(
  file,
  JSON.stringify(
    {
      args: values,
      source: values.from ?? null,
      rows: rows.map((r) => ({
        name: r.name,
        rules: r.rules,
        total: r.total,
        maxShift: r.maxShift,
        meanShift: r.meanShift,
        drawGap: r.drawGap,
        byTier: Object.fromEntries(r.byTier),
        byCell: Object.fromEntries(r.byCell),
      })),
    },
    null,
    1,
  ),
);
console.log(`\nsweep: ${file}`);
