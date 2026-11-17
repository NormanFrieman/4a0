import { useTranslation } from "react-i18next";
import { Button, Flag, Masthead, Rule, ScreenLayout } from "../ui/index.ts";
import { useSession, useShowStrength } from "../state/session.ts";

export function Field() {
  const { t } = useTranslation();
  const { dataset: ds, tournament, engine, fastMode, startRound } = useSession();
  const show = useShowStrength();
  if (!ds || !tournament) return null;
  // Entrants come in tier order (strongest first); without strength, list them
  // by year and country so the order does not give it away.
  const entrants = tournament.entrants.filter((e) => !e.isUser);
  const field = show
    ? entrants
    : [...entrants].sort((a, b) => {
        const x = ds.team(a.id);
        const y = ds.team(b.id);
        return x.year - y.year || x.countryName.localeCompare(y.countryName, "pt-BR");
      });
  const ready = fastMode || engine.state === "ready";
  return (
    <ScreenLayout
      width="max-w-3xl"
      header={
        <>
          <Masthead
            compact
            title={t("app.title")}
            kicker={t("app.kicker")}
            section={t("field.section")}
          />
          <h2 className="mt-6 text-center font-display text-3xl font-black lg:mt-4">
            {t("field.title")}
          </h2>
          <Rule className="my-4 lg:my-3" />
        </>
      }
      footer={
        <>
          <Rule className="my-4 lg:my-3" />
          {!fastMode && (
            <p className="mb-4 text-center text-sm text-muted italic lg:mb-3">
              {engine.state === "loading" &&
                (engine.progress === null
                  ? t("field.engineStarting")
                  : t("field.engineLoading", { pct: Math.round(engine.progress * 100) }))}
              {engine.state === "ready" && t("field.engineReady")}
              {engine.state === "error" && t("field.engineError", { error: engine.error })}
            </p>
          )}
          <div className="text-center">
            <Button variant="primary" className="px-8 py-3" disabled={!ready} onClick={startRound}>
              {t("field.start")}
            </Button>
          </div>
        </>
      }
    >
      <ul className="divide-y divide-dotted divide-line lg:min-h-0 lg:overflow-y-auto">
        {field.map((e) => {
          const team = ds.team(e.id);
          return (
            <li key={e.id} className="flex items-center gap-3 py-2">
              <Flag code={team.countryCode} label={team.countryName} className="w-8" />
              <span className="text-lg font-bold">
                {team.countryName} {team.year}
              </span>
              <span className="ml-auto text-right text-sm text-muted italic">
                {t("field.rank", { rank: team.finalRank, year: team.year })}
                {show && ` · ${t("field.avg", { avg: e.avgStrength })}`}
              </span>
            </li>
          );
        })}
      </ul>
    </ScreenLayout>
  );
}
