import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Spike } from "./dev/Spike.tsx";
import "./styles.css";

function App() {
  // No router yet: only the engine dev page exists until Phase 1.
  if (location.pathname.startsWith("/spike")) return <Spike />;
  return (
    <main className="page">
      <h1>4 a 0</h1>
      <p>Em migração — Fase 0.</p>
      <a href="/spike">Abrir spike da engine no navegador →</a>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
