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

export default defineConfig({
  plugins: [react(), tailwindcss(), dropOrtWasm()],
  server: { headers: isolation },
  preview: { headers: isolation },
  optimizeDeps: { exclude: ["onnxruntime-web"] },
});
