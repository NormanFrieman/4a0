/**
 * The Maia worker pool for the session (GDD §8): created once, loaded in the
 * background as soon as the draft starts, so round 1 doesn't wait for the
 * model download.
 */
import { balance } from "../../config/balance.ts";
import { MaiaWorkerPool } from "../../engine/workerPool.ts";
import type { MaiaVariant } from "../../engine/workerProtocol.ts";

const ORT_WASM_CDN = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/";

export type EngineStatus =
  | { state: "idle" }
  | { state: "loading"; progress: number | null }
  | { state: "ready" }
  | { state: "error"; error: string };

let pool: MaiaWorkerPool | null = null;
let loading: Promise<MaiaWorkerPool> | null = null;

export function loadEngine(onStatus: (s: EngineStatus) => void): Promise<MaiaWorkerPool> {
  if (loading) return loading;
  const p = new MaiaWorkerPool();
  onStatus({ state: "loading", progress: null });
  loading = p
    .init(
      // WASM for determinism across machines (GDD §8.4).
      {
        variant: balance.game.maiaModelVariant as MaiaVariant,
        forceWasm: true,
        wasmPaths: ORT_WASM_CDN,
      },
      (loaded, total) => onStatus({ state: "loading", progress: total ? loaded / total : null }),
    )
    .then(() => {
      pool = p;
      onStatus({ state: "ready" });
      return p;
    })
    .catch((err: unknown) => {
      loading = null;
      p.dispose();
      onStatus({ state: "error", error: err instanceof Error ? err.message : String(err) });
      throw err;
    });
  return loading;
}

export const enginePool = () => pool;
