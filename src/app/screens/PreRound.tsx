import { useTranslation } from "react-i18next";
import { balance } from "../../config/balance.ts";
import type { Dataset } from "../../data/dataset.ts";
import {
  USER_ID,
  currentRound,
  entrant,
  opponentOf,
  userPairing,
} from "../../tournament/tournament.ts";
import {
  Button,
  ChampionName,
  Flag,
  Kicker,
  Masthead,
  Rule,
  ScreenLayout,
  StyleTrait,
} from "../ui/index.ts";
import { useSession, useShowStrength } from "../state/session.ts";
import { cardView } from "./helpers.ts";

export function PreRound() {
  const { t } = useTranslation();
  const { dataset: ds, tournament, playRound } = useSession();
  const show = useShowStrength();
  if (!ds || !tournament) return null;
  const round = currentRound(tournament)!.round;
  const oppId = opponentOf(userPairing(tournament));
  const opp = ds.team(oppId);
  const user = entrant(tournament, USER_ID);

  return (
    <ScreenLayout
      width="max-w-5xl"
      header={
        <>
          <Masthead
            compact
            title={t("app.title")}
            kicker={t("app.kicker")}
            section={t("round.section", { n: round, total: balance.tournament.rounds })}
          />
          <h2 className="mt-6 flex flex-wrap items-center justify-center gap-x-3 text-center font-display text-3xl font-black sm:text-5xl lg:mt-4 lg:text-4xl">
            {t("round.you")} <span className="text-muted">×</span>
            <span className="inline-flex items-center gap-3 whitespace-nowrap">
              <Flag code={opp.countryCode} label={opp.countryName} className="w-12 lg:w-10" />
              {opp.countryName} {opp.year}
            </span>
          </h2>
          <Rule className="my-4 lg:my-3" />
        </>
      }
      footer={
        <>
          <Rule className="my-4 lg:my-3" />
          <div className="text-center">
            <Button variant="primary" className="px-8 py-3" onClick={playRound}>
              {t("round.play")}
            </Button>
          </div>
        </>
      }
    >
      <div className="grid gap-8 md:grid-cols-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        <LineupList
          ds={ds}
          title={t("round.yourLineup")}
          cardIds={user.cardIds}
          showStrength={show}
        />
        <LineupList
          ds={ds}
          title={t("round.opponentLineup")}
          cardIds={opp.cardIds}
          showStrength={show}
        />
      </div>
    </ScreenLayout>
  );
}

/** A team's 4 cards in board order, with trait and strength. */
function LineupList({
  ds,
  title,
  cardIds,
  showStrength,
}: {
  ds: Dataset;
  title: string;
  cardIds: readonly string[];
  showStrength: boolean;
}) {
  const { t } = useTranslation();
  return (
    <section>
      <h3 className="font-display text-xl font-bold italic">{title}</h3>
      <ul className="mt-2 divide-y divide-dotted divide-line">
        {cardIds.map((id, i) => {
          const v = cardView(ds, id);
          return (
            <li key={id} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2 py-2">
              <Kicker>{t("slots.board", { n: i + 1 })}</Kicker>
              <span className="min-w-0">
                <ChampionName
                  name={v.name}
                  champion={v.champion ? t("champion.label") : undefined}
                  className="block truncate font-bold"
                />
                <span className="text-sm">
                  <StyleTrait trait={v.trait} label={t(`trait.${v.trait}`)} />
                </span>
              </span>
              <span className="font-display text-xl font-bold tabular-nums">
                {showStrength ? v.card.strength : "?"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
