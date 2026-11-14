import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Spike } from "./dev/Spike.tsx";
import "./styles.css";

function App() {
  // No router yet (Phase 0): only the engine spike page exists.
  if (location.pathname.startsWith("/spike")) return <Spike />;
  return (
    <main className="page">
      <h1>Xadrez de Cidades</h1>
      <p>Fase 0 — Fundação.</p>
      <a href="/spike">Abrir spike da engine no navegador →</a>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
