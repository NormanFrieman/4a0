import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Cross-origin isolation enables multi-threaded WASM in onnxruntime-web.
// "credentialless" still lets us fetch the model (Hugging Face) and the
// ORT wasm files (jsDelivr) via CORS.
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

// Stockfish (blunder check, GDD §8.1) runs as a classic Worker that finds its
// .wasm next to its script, so both files are served as-is from /stockfish/
// (same origin; the .wasm is ~7 MB, under the 25 MiB Pages limit).
const stockfishDir = dirname(createRequire(import.meta.url).resolve("stockfish/package.json"));
const stockfishFiles = ["stockfish-18-lite-single.js", "stockfish-18-lite-single.wasm"];

function serveStockfish(): Plugin {
  return {
    name: "serve-stockfish",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = req.url?.split("?")[0]?.replace(/^\/stockfish\//, "");
        if (!req.url?.startsWith("/stockfish/") || !name || !stockfishFiles.includes(name)) {
          return next();
        }
        // Our middleware answers before Vite adds `server.headers`; a worker
        // started from an isolated page needs the same policy.
        for (const [k, v] of Object.entries(isolation)) res.setHeader(k, v);
        res.setHeader(
          "Content-Type",
          name.endsWith(".wasm") ? "application/wasm" : "text/javascript",
        );
        res.end(readFileSync(join(stockfishDir, "bin", name)));
      });
    },
    generateBundle() {
      for (const name of stockfishFiles) {
        this.emitFile({
          type: "asset",
          fileName: `stockfish/${name}`,
          source: readFileSync(join(stockfishDir, "bin", name)),
        });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), dropOrtWasm(), serveStockfish()],
  server: { headers: isolation },
  preview: { headers: isolation },
  optimizeDeps: { exclude: ["onnxruntime-web"] },
});
