import { parseArgs } from "node:util";
import { balance } from "../../../src/config/balance.ts";
import { playGame } from "../../../src/engine/game.ts";
import { createNodeMaia3Engine, type Maia3Variant } from "../node.ts";

const { values } = parseArgs({
  options: {
    white: { type: "string", default: "1500" },
    black: { type: "string", default: "1500" },
    seed: { type: "string", default: String(Date.now()) },
    temp: { type: "string", default: "1" },
    "top-p": { type: "string", default: String(balance.game.topP) },
    variant: { type: "string", default: "5m" },
    verbose: { type: "boolean", default: false },
    /** Disable draw by agreement and resignation. */
    pure: { type: "boolean", default: false },
  },
});

const t0 = performance.now();
const { engine, close } = await createNodeMaia3Engine({ variant: values.variant as Maia3Variant });
const loadMs = performance.now() - t0;

const temperature = Number(values.temp);
const topP = Number(values["top-p"]);
const side = (elo: number) => ({ ai: engine, elo, temperature, topP });

const t1 = performance.now();
const game = await playGame({
  white: side(Number(values.white)),
  black: side(Number(values.black)),
  seed: values.seed,
  ...(values.pure ? { endRules: false as const } : {}),
  onMove: values.verbose
    ? (m) =>
        console.log(
          `${String(m.ply + 1).padStart(3)} ${m.color.padEnd(5)} ${m.san.padEnd(7)} ${m.source === "book" ? "book" : `p=${m.moveProb!.toFixed(2)} E=${(m.wdl![0] + m.wdl![1] / 2).toFixed(2)}`}`,
        )
    : undefined,
});
const playMs = performance.now() - t1;
await close();

console.log(game.pgn);
console.log(
  `\nseed=${values.seed} result=${game.result} termination=${game.termination} plies=${game.moves.length}`,
);
console.log(
  `model load ${loadMs.toFixed(0)} ms · game ${playMs.toFixed(0)} ms · ${(playMs / Math.max(1, game.moves.length)).toFixed(1)} ms/ply`,
);
