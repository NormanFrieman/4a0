import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureModelNode, getVariant, Maia3 } from "maia3-js";
import { balance } from "../../src/config/balance.ts";
import { BlunderCheckedAI, type BlunderCheckConfig } from "../../src/engine/blunderCheck.ts";
import { Maia3Engine } from "../../src/engine/maia3.ts";
import type { ChessAI } from "../../src/engine/types.ts";
import { createNodeStockfish } from "./stockfish.node.ts";

export type Maia3Variant = "5m" | "23m" | "79m";

/**
 * Stable cache for downloaded variants (23m/79m), outside node_modules so it
 * survives reinstalls. Gitignored. Override with MAIA3_MODEL_DIR.
 */
export const MODEL_DIR =
  process.env.MAIA3_MODEL_DIR ?? resolve(dirname(fileURLToPath(import.meta.url)), "../../models");

/**
 * Resolve the ONNX path for a variant, downloading it once if needed. The
 * download goes to a private temp dir and is renamed into place, so a crash
 * never leaves a partial file that looks cached. Call this from a single
 * process before spawning workers.
 */
export async function ensureModel(variant: Maia3Variant): Promise<string> {
  const cached = join(MODEL_DIR, getVariant(variant).onnxFile);
  if (existsSync(cached)) return cached;
  mkdirSync(MODEL_DIR, { recursive: true });
  const tmp = join(MODEL_DIR, `.download-${process.pid}-${Date.now()}`);
  try {
    const path = await ensureModelNode({ variant, modelDir: tmp });
    // Bundled (5m) or already cached elsewhere: use it as is.
    if (!path.startsWith(tmp)) return path;
    const final = join(MODEL_DIR, basename(path));
    if (!existsSync(final)) renameSync(path, final);
    return final;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

export interface NodeEngineOptions {
  variant?: Maia3Variant;
  /** Pre-resolved model path (e.g. from `ensureModel` in the parent process). */
  modelPath?: string;
  intraOpNumThreads?: number;
  /** Stockfish blunder check (GDD §8.1); default `balance.blunderCheck`, `false` = off. */
  blunderCheck?: BlunderCheckConfig | false;
}

/** Load Maia-3 with onnxruntime-node and wrap it as a `ChessAI`. */
export async function createNodeMaia3Engine(opts: NodeEngineOptions = {}) {
  const modelPath = opts.modelPath ?? (await ensureModel(opts.variant ?? "5m"));
  const maia = new Maia3({
    modelPath,
    ...(opts.intraOpNumThreads ? { intraOpNumThreads: opts.intraOpNumThreads } : {}),
  });
  await maia.load();
  const maiaEngine = new Maia3Engine(maia);
  const check = opts.blunderCheck ?? balance.blunderCheck;
  const stockfish = check ? await createNodeStockfish() : null;
  const engine: ChessAI =
    check && stockfish ? new BlunderCheckedAI(maiaEngine, stockfish.evaluator, check) : maiaEngine;
  return {
    engine,
    maiaEngine,
    close: async () => {
      stockfish?.close();
      await maia.close();
    },
  };
}

/**
 * Blunder-check override for the CLIs: `--no-check` turns it off; the
 * `--check-*` flags replace single values (a flat tolerance for every selfElo).
 */
export function blunderCheckFromArgs(args: {
  "no-check"?: boolean;
  "check-nodes"?: string;
  "check-drop"?: string;
  "check-tries"?: string;
}): BlunderCheckConfig | false {
  if (args["no-check"]) return false;
  const base = balance.blunderCheck;
  return {
    ...base,
    ...(args["check-nodes"] ? { nodes: Number(args["check-nodes"]) } : {}),
    ...(args["check-tries"] ? { maxTries: Number(args["check-tries"]) } : {}),
    ...(args["check-drop"]
      ? { tolerance: [{ selfElo: 600, maxDrop: Number(args["check-drop"]) }] }
      : {}),
  };
}

/** parseArgs options matching `blunderCheckFromArgs`. */
export const blunderCheckOptions = {
  "no-check": { type: "boolean", default: false },
  "check-nodes": { type: "string" },
  "check-drop": { type: "string" },
  "check-tries": { type: "string" },
} as const;
