import { useTranslation } from "react-i18next";
import { avgStrength } from "../../data/cardStrength.ts";
import { Button, Flag, Kicker, Masthead, Rule, StyleTrait } from "../ui/index.ts";
import { useSession } from "../state/session.ts";
import { cardView } from "./helpers.ts";

export function Confirm() {
  const { t } = useTranslation();
  const { dataset: ds, draft, order, moveInOrder, confirmTeam } = useSession();
  if (!ds || !draft) return null;
  const locked = draft.reorderUsed;
  const avg = avgStrength(order.map((id) => ds.card(id).strength));
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Masthead title={t("app.title")} kicker={t("app.kicker")} section={t("confirm.section")} />
      <h2 className="mt-6 text-center font-display text-3xl font-black">{t("confirm.title")}</h2>
      <p className="text-center text-muted italic">{t("confirm.avg", { avg })}</p>
      <Rule />
      <p className="mb-3 text-sm text-muted">
        {locked ? t("confirm.reorderUsed") : t("confirm.reorderHint")}
      </p>
      <ol className="divide-y divide-dotted divide-line">
        {order.map((id, i) => {
          const v = cardView(ds, id);
          return (
            <li key={id} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 py-2.5">
              <Kicker>{i < 4 ? t("slots.board", { n: i + 1 }) : t("slots.reserve")}</Kicker>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Flag code={v.team.countryCode} label={v.team.countryName} className="w-5" />
                  <span className="truncate text-lg font-bold">{v.name}</span>
                  <span className="text-sm text-muted italic">{v.team.year}</span>
                </div>
                <div className="text-sm">
                  <StyleTrait trait={v.trait} label={t(`trait.${v.trait}`)} />
                  <span className="ml-2 font-bold tabular-nums">{v.card.strength}</span>
                </div>
              </div>
              {!locked && (
                <span className="flex gap-1">
                  <Button
                    variant="toggle"
                    aria-label={t("confirm.up")}
                    disabled={i === 0}
                    onClick={() => moveInOrder(i, -1)}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="toggle"
                    aria-label={t("confirm.down")}
                    disabled={i === order.length - 1}
                    onClick={() => moveInOrder(i, 1)}
                  >
                    ↓
                  </Button>
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <Rule />
      <div className="text-center">
        <Button variant="primary" className="px-8 py-3" onClick={confirmTeam}>
          {t("confirm.confirm")}
        </Button>
      </div>
    </div>
  );
}
