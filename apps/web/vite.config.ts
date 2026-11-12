import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Cross-origin isolation enables multi-threaded WASM in onnxruntime-web.
// "credentialless" still lets us fetch the model (Hugging Face) and the
// ORT wasm files (jsDelivr) via CORS.
const isolation = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "credentialless",
};

export default defineConfig({
  plugins: [react()],
  server: { headers: isolation },
  preview: { headers: isolation },
  optimizeDeps: { exclude: ["onnxruntime-web"] },
});
