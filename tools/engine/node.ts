import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureModelNode, getVariant, Maia3 } from "maia3-js";
import { Maia3Engine } from "../../src/engine/maia3.ts";

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
}

/** Load Maia-3 with onnxruntime-node and wrap it as a `ChessAI`. */
export async function createNodeMaia3Engine(opts: NodeEngineOptions = {}) {
  const modelPath = opts.modelPath ?? (await ensureModel(opts.variant ?? "5m"));
  const maia = new Maia3({
    modelPath,
    ...(opts.intraOpNumThreads ? { intraOpNumThreads: opts.intraOpNumThreads } : {}),
  });
  await maia.load();
  return { engine: new Maia3Engine(maia), close: () => maia.close() };
}
