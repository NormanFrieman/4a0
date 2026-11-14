import { useTranslation } from "react-i18next";
import { Button, Flag, Masthead, Rule } from "../ui/index.ts";
import { useSession } from "../state/session.ts";

export function Field() {
  const { t } = useTranslation();
  const { dataset: ds, tournament, engine, fastMode, startRound } = useSession();
  if (!ds || !tournament) return null;
  const field = tournament.entrants.filter((e) => !e.isUser);
  const ready = fastMode || engine.state === "ready";
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Masthead title={t("app.title")} kicker={t("app.kicker")} section={t("field.section")} />
      <h2 className="mt-6 text-center font-display text-3xl font-black">{t("field.title")}</h2>
      <Rule />
      <ul className="divide-y divide-dotted divide-line">
        {field.map((e) => {
          const team = ds.team(e.id);
          return (
            <li key={e.id} className="flex items-center gap-3 py-2">
              <Flag code={team.countryCode} label={team.countryName} className="w-8" />
              <span className="text-lg font-bold">
                {team.countryName} {team.year}
              </span>
              <span className="ml-auto text-right text-sm text-muted italic">
                {t("field.rank", { rank: team.finalRank, year: team.year })} ·{" "}
                {t("field.avg", { avg: e.avgStrength })}
              </span>
            </li>
          );
        })}
      </ul>
      <Rule />
      {!fastMode && (
        <p className="mb-4 text-center text-sm text-muted italic">
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
    </div>
  );
}
