import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Cross-origin isolation enables multi-threaded WASM in onnxruntime-web.
// "credentialless" still lets us fetch the ORT wasm files (jsDelivr) via CORS.
const isolation = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "credentialless",
};

// onnxruntime-web references its ~30 MB .wasm as a fallback asset, but the app
// always loads it from jsDelivr (`wasmPaths`), so the local copy is never
// fetched. Dropping it keeps every file under Cloudflare Pages' 25 MiB limit.
function dropOrtWasm(): Plugin {
  return {
    name: "drop-ort-wasm",
    apply: "build",
    generateBundle(_, bundle) {
      for (const file of Object.keys(bundle)) {
        if (/ort-wasm[^/]*\.wasm$/.test(file)) delete bundle[file];
      }
    },
  };
}

// Engine files served as-is from our own origin (same origin, so no CORS or
// third-party outage): Stockfish (blunder check, GDD §8.1) runs as a classic
// Worker that finds its .wasm next to its script (~7 MB), and the Maia-3 5m
// weights (~22 MB) ship inside maia3-js. All stay under the 25 MiB per-file
// limit of Cloudflare static assets.
// Both are direct dependencies, so pnpm links them at the top of
// node_modules (maia3-js only exports ESM entry points, which `require.resolve`
// can't find).
const pkgDir = (name: string) => fileURLToPath(new URL(`./node_modules/${name}/`, import.meta.url));
const staticFiles: Record<string, string> = {
  "stockfish/stockfish-18-lite-single.js": join(
    pkgDir("stockfish"),
    "bin",
    "stockfish-18-lite-single.js",
  ),
  "stockfish/stockfish-18-lite-single.wasm": join(
    pkgDir("stockfish"),
    "bin",
    "stockfish-18-lite-single.wasm",
  ),
  "models/maia3_5m.onnx": join(pkgDir("maia3-js"), "models", "maia3_5m.onnx"),
};

const contentType = (name: string) =>
  name.endsWith(".wasm")
    ? "application/wasm"
    : name.endsWith(".js")
      ? "text/javascript"
      : "application/octet-stream";

function serveEngineFiles(): Plugin {
  return {
    name: "serve-engine-files",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = req.url?.split("?")[0]?.replace(/^\//, "");
        const file = name ? staticFiles[name] : undefined;
        if (!name || !file) return next();
        // Our middleware answers before Vite adds `server.headers`; a worker
        // started from an isolated page needs the same policy.
        for (const [k, v] of Object.entries(isolation)) res.setHeader(k, v);
        res.setHeader("Content-Type", contentType(name));
        res.end(readFileSync(file));
      });
    },
    generateBundle() {
      for (const [fileName, file] of Object.entries(staticFiles)) {
        this.emitFile({ type: "asset", fileName, source: readFileSync(file) });
      }
    },
  };
}

// Link to the published source code (AGPL §13, docs/plano-codigo-aberto.md).
const sourceUrl = process.env.SOURCE_URL ?? "https://github.com/NormanFrieman/4a0";

function currentCommit(): string {
  const fromCi = process.env.CF_PAGES_COMMIT_SHA ?? process.env.WORKERS_CI_COMMIT_SHA;
  if (fromCi) return fromCi;
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

export default defineConfig({
  define: {
    __SOURCE_URL__: JSON.stringify(sourceUrl),
    __COMMIT__: JSON.stringify(currentCommit()),
  },
  plugins: [react(), tailwindcss(), dropOrtWasm(), serveEngineFiles()],
  server: { headers: isolation },
  preview: { headers: isolation },
  optimizeDeps: { exclude: ["onnxruntime-web"] },
});
