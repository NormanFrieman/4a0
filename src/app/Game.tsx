import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "./state/session.ts";
import { Confirm } from "./screens/Confirm.tsx";
import { Draft } from "./screens/Draft.tsx";
import { Field } from "./screens/Field.tsx";
import { Final } from "./screens/Final.tsx";
import { Home } from "./screens/Home.tsx";
import { PreRound } from "./screens/PreRound.tsx";
import { Round } from "./screens/Round.tsx";
import { Standings } from "./screens/Standings.tsx";

/** The game: one screen per session phase (GDD §3, §10). */
export function Game() {
  const { t } = useTranslation();
  const { phase, error, seed, fastMode, init } = useSession();

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [phase]);

  return (
    // Desktop (≥ lg): the app is exactly one viewport tall and never scrolls
    // (docs/design.md); screens lay themselves out with <ScreenLayout>.
    <div className="lg:flex lg:h-dvh lg:flex-col lg:overflow-hidden">
      <main className="min-h-[calc(100vh-3rem)] lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        {phase === "loading" && (
          <p className="p-8 text-center text-muted italic">{t("app.loading")}</p>
        )}
        {phase === "error" && (
          <p className="p-8 text-center text-loss">{t("app.loadError", { error })}</p>
        )}
        {phase === "home" && <Home />}
        {phase === "draft" && <Draft />}
        {phase === "confirm" && <Confirm />}
        {phase === "field" && <Field />}
        {phase === "preRound" && <PreRound />}
        {phase === "playing" && <Round />}
        {phase === "standings" && <Standings />}
        {phase === "final" && <Final />}
      </main>
      <footer className="py-3 text-center text-xs text-muted lg:shrink-0 lg:py-1.5">
        {seed && t("app.seed", { seed })}
        {fastMode && ` · ${t("app.fastMode")}`}
      </footer>
    </div>
  );
}
