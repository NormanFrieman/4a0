import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/fraunces/400.css";
import "@fontsource/fraunces/400-italic.css";
import "@fontsource/fraunces/700.css";
import "@fontsource/fraunces/700-italic.css";
import "@fontsource/fraunces/900.css";
import "../i18n/index.ts";
import "./styles.css";
import { Spike } from "./dev/Spike.tsx";
import { UiCatalog } from "./dev/UiCatalog.tsx";
import { Game } from "./Game.tsx";

function App() {
  // No router: the game lives at "/", dev pages at their own paths.
  if (location.pathname.startsWith("/spike")) return <Spike />;
  if (location.pathname.startsWith("/dev/ui")) return <UiCatalog />;
  return <Game />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
