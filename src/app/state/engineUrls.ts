/**
 * Absolute URLs of the engine files served from our own origin
 * (vite.config.ts). Absolute because the Maia worker, which uses them, lives
 * under /assets/.
 */
import type { MaiaVariant } from "../../engine/workerProtocol.ts";

const fromBase = (path: string) =>
  new URL(`${import.meta.env.BASE_URL}${path}`, location.href).href;

/** Stockfish worker script; its .wasm sits next to it. */
export const stockfishUrl = () => fromBase("stockfish/stockfish-18-lite-single.js");

/** Variants whose weights we serve ourselves (they ship inside maia3-js). */
const selfHosted: readonly MaiaVariant[] = ["5m"];

/**
 * Maia-3 weights from our origin, so loading doesn't depend on Hugging Face.
 * Undefined = maia3-js downloads from Hugging Face (dev-only variants).
 */
export const modelUrl = (variant: MaiaVariant) =>
  selfHosted.includes(variant) ? fromBase(`models/maia3_${variant}.onnx`) : undefined;
