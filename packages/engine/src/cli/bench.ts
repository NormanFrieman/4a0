/**
 * Phase 0 performance benchmark (GDD §10.1 / §12): model load time, latency
 * per move (p50/p95), memory, for each Maia-3 variant.
 *
 *   pnpm engine:bench                       # 5m only
 *   pnpm engine:bench --variants 5m,23m,79m # downloads 23m/79m on first use
 */
import { parseArgs } from "node:util";
import { playGame } from "../game.ts";
import { createNodeMaia3Engine, type Maia3Variant } from "../node.ts";
import type { ChessAI } from "../types.ts";

const { values } = parseArgs({
  options: {
    variants: { type: "string", default: "5m" },
    games: { type: "string", default: "3" },
    threads: { type: "string", default: "" },
  },
});

const pct = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]!;
};
const mb = (b: number) => `${(b / 1024 / 1024).toFixed(0)} MB`;

for (const variant of values.variants.split(",") as Maia3Variant[]) {
  const rss0 = process.memoryUsage().rss;
  const t0 = performance.now();
  const { engine, close } = await createNodeMaia3Engine({
    variant,
    ...(values.threads ? { intraOpNumThreads: Number(values.threads) } : {}),
  });
  const loadMs = performance.now() - t0;
  const rssLoaded = process.memoryUsage().rss;

  const latencies: number[] = [];
  const timed: ChessAI = {
    async chooseMove(req) {
      const t = performance.now();
      const r = await engine.chooseMove(req);
      latencies.push(performance.now() - t);
      return r;
    },
  };

  let plies = 0;
  const tg = performance.now();
  for (let g = 0; g < Number(values.games); g++) {
    const res = await playGame({
      white: { ai: timed, elo: 1500, temperature: 1, topP: 1 },
      black: { ai: timed, elo: 1500, temperature: 1, topP: 1 },
      seed: `bench/${g}`,
    });
    plies += res.moves.length;
  }
  const gamesMs = performance.now() - tg;
  // Drop the first call (session warm-up) from latency stats.
  const warm = latencies.slice(1);
  console.log(
    [
      `variant ${variant}`,
      `load ${loadMs.toFixed(0)} ms`,
      `first move ${latencies[0]!.toFixed(1)} ms`,
      `p50 ${pct(warm, 50).toFixed(1)} ms`,
      `p95 ${pct(warm, 95).toFixed(1)} ms`,
      `max ${Math.max(...warm).toFixed(1)} ms`,
      `${plies} plies in ${(gamesMs / 1000).toFixed(1)} s`,
      `rss +${mb(rssLoaded - rss0)} after load, peak ${mb(process.memoryUsage().rss)}`,
    ].join(" · "),
  );
  await close();
}
