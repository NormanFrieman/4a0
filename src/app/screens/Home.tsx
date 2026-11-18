import { useTranslation } from "react-i18next";
import { balance } from "../../config/balance.ts";
import { Button, Masthead, Rule } from "../ui/index.ts";
import { useSession } from "../state/session.ts";

export function Home() {
  const { t } = useTranslation();
  const { dataset, fastMode, mode, setMode, startDraft, openAbout } = useSession();
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 text-center lg:flex lg:flex-1 lg:flex-col lg:justify-center">
      <Masthead title={t("app.title")} kicker={t("app.kicker")} section={t("home.section")} />
      <p className="mt-8 text-lg">{t("home.pitch", { rounds: balance.tournament.rounds })}</p>
      {dataset?.index.note && (
        <p className="mt-3 text-sm text-muted italic">{dataset.index.note}</p>
      )}
      {fastMode && <p className="mt-3 text-sm text-accent italic">{t("home.fastNote")}</p>}
      <Rule className="my-8" />
      {/* Full column width on every screen (a flex item on desktop, a block below). */}
      <Button variant="primary" className="w-full px-8 py-3 text-lg" onClick={startDraft}>
        {t("home.play")}
      </Button>
      <div className="mt-6 flex flex-col items-center">
        <div role="group" aria-label={t("home.mode")} className="flex">
          {(["classic", "master"] as const).map((m) => (
            <Button
              key={m}
              variant="toggle"
              aria-pressed={m === mode}
              className="px-5 py-1.5"
              onClick={() => setMode(m)}
            >
              {t(`home.mode_${m}`)}
            </Button>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted italic">{t(`home.hint_${mode}`)}</p>
      </div>
      <div className="mt-6">
        <Button variant="link" onClick={openAbout}>
          {t("home.about")}
        </Button>
      </div>
    </div>
  );
}
