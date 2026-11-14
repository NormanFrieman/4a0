import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/fraunces/400.css";
import "@fontsource/fraunces/400-italic.css";
import "@fontsource/fraunces/700.css";
import "@fontsource/fraunces/700-italic.css";
import "@fontsource/fraunces/900.css";
import "../i18n/index.ts";
import "./styles.css";
import { Game } from "./Game.tsx";

// Dev pages exist only under `pnpm dev`; the production build drops them.
const Spike = import.meta.env.DEV
  ? lazy(() => import("./dev/Spike.tsx").then((m) => ({ default: m.Spike })))
  : null;
const UiCatalog = import.meta.env.DEV
  ? lazy(() => import("./dev/UiCatalog.tsx").then((m) => ({ default: m.UiCatalog })))
  : null;

function DevPage() {
  // No router: the game lives at "/", dev pages at their own paths.
  if (Spike && location.pathname.startsWith("/spike")) return <Spike />;
  if (UiCatalog && location.pathname.startsWith("/dev/ui")) return <UiCatalog />;
  return null;
}

function App() {
  const dev = DevPage();
  return dev ? <Suspense>{dev}</Suspense> : <Game />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
