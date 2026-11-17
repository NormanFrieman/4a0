import { useTranslation } from "react-i18next";
import { avgStrength } from "../../data/cardStrength.ts";
import {
  Button,
  ChampionMark,
  Flag,
  Kicker,
  Masthead,
  Rule,
  ScreenLayout,
  StyleTrait,
} from "../ui/index.ts";
import { useSession, useShowStrength } from "../state/session.ts";
import { cardView } from "./helpers.ts";

export function Confirm() {
  const { t } = useTranslation();
  const { dataset: ds, draft, confirmTeam } = useSession();
  const show = useShowStrength();
  if (!ds || !draft) return null;
  const order = draft.slots.filter((id): id is string => id !== null);
  const avg = avgStrength(order.map((id) => ds.card(id).strength));
  return (
    <ScreenLayout
      width="max-w-3xl"
      header={
        <>
          <Masthead
            compact
            title={t("app.title")}
            kicker={t("app.kicker")}
            section={t("confirm.section")}
          />
          <h2 className="mt-6 text-center font-display text-3xl font-black lg:mt-4">
            {t("confirm.title")}
          </h2>
          {show && <p className="text-center text-muted italic">{t("confirm.avg", { avg })}</p>}
          <Rule className="my-4 lg:my-3" />
          <p className="mb-3 text-sm text-muted">{t("confirm.boardsHint")}</p>
        </>
      }
      footer={
        <>
          <Rule className="my-4 lg:my-3" />
          <div className="text-center">
            <Button variant="primary" className="px-8 py-3" onClick={confirmTeam}>
              {t("confirm.confirm")}
            </Button>
          </div>
        </>
      }
    >
      <ol className="divide-y divide-dotted divide-line lg:min-h-0 lg:overflow-y-auto">
        {order.map((id, i) => {
          const v = cardView(ds, id);
          return (
            <li key={id} className="grid grid-cols-[4.5rem_1fr] items-center gap-3 py-2.5">
              <Kicker>{t("slots.board", { n: i + 1 })}</Kicker>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Flag code={v.team.countryCode} label={v.team.countryName} className="w-5" />
                  <span className="truncate text-lg font-bold">{v.name}</span>
                  {v.champion && <ChampionMark label={t("champion.label")} />}
                  <span className="text-sm text-muted italic">{v.team.year}</span>
                </div>
                <div className="text-sm">
                  <StyleTrait trait={v.trait} label={t(`trait.${v.trait}`)} />
                  {show && <span className="ml-2 font-bold tabular-nums">{v.card.strength}</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </ScreenLayout>
  );
}
