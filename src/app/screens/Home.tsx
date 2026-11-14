import { useTranslation } from "react-i18next";
import { balance } from "../../config/balance.ts";
import { Button, Masthead, Rule } from "../ui/index.ts";
import { useSession } from "../state/session.ts";

export function Home() {
  const { t } = useTranslation();
  const { dataset, fastMode, startDraft } = useSession();
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 text-center">
      <Masthead title={t("app.title")} kicker={t("app.kicker")} section={t("home.section")} />
      <p className="mt-8 text-lg">{t("home.pitch", { rounds: balance.tournament.rounds })}</p>
      {dataset?.index.note && (
        <p className="mt-3 text-sm text-muted italic">{dataset.index.note}</p>
      )}
      {fastMode && <p className="mt-3 text-sm text-accent italic">{t("home.fastNote")}</p>}
      <Rule className="my-8" />
      <Button variant="primary" className="px-8 py-3 text-lg" onClick={startDraft}>
        {t("home.play")}
      </Button>
    </div>
  );
}
