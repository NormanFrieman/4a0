import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Spike } from "./dev/Spike.tsx";
import { UiCatalog } from "./dev/UiCatalog.tsx";
import "@fontsource/fraunces/400.css";
import "@fontsource/fraunces/400-italic.css";
import "@fontsource/fraunces/700.css";
import "@fontsource/fraunces/700-italic.css";
import "@fontsource/fraunces/900.css";
import "./styles.css";


function App() {
  // No router yet: only the engine dev page exists until Phase 1.
  if (location.pathname.startsWith("/spike")) return <Spike />;
  if (location.pathname.startsWith("/dev/ui")) return <UiCatalog />;
  return (
    <main className="page">
      <h1>4 a 0</h1>
      <p>Em migração — Fase 0.</p>
      <p>
        <a href="/spike">Abrir spike da engine no navegador →</a>
      </p>
      <p>
        <a href="/dev/ui">Catálogo do design system →</a>
      </p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
