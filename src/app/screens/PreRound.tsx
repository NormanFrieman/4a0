import { useTranslation } from "react-i18next";
import { balance } from "../../config/balance.ts";
import { lineupFor } from "../../tournament/lineup.ts";
import {
  USER_ID,
  currentRound,
  entrant,
  opponentOf,
  userPairing,
} from "../../tournament/tournament.ts";
import { Button, Flag, Kicker, Masthead, Rule, StyleTrait } from "../ui/index.ts";
import { useSession } from "../state/session.ts";
import { cardView } from "./helpers.ts";

export function PreRound() {
  const { t } = useTranslation();
  const { dataset: ds, tournament, resting, setResting, playRound } = useSession();
  if (!ds || !tournament) return null;
  const round = currentRound(tournament)!.round;
  const oppId = opponentOf(userPairing(tournament));
  const opp = ds.team(oppId);
  const oppLineup = lineupFor(entrant(tournament, oppId).cardIds);
  const user = entrant(tournament, USER_ID);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Masthead
        title={t("app.title")}
        kicker={t("app.kicker")}
        section={t("round.section", { n: round, total: balance.tournament.rounds })}
      />
      <h2 className="mt-6 flex flex-wrap items-center justify-center gap-x-3 text-center font-display text-3xl font-black sm:text-5xl">
        {t("round.you")} <span className="text-muted">×</span>
        <span className="inline-flex items-center gap-3 whitespace-nowrap">
          <Flag code={opp.countryCode} label={opp.countryName} className="w-12" />
          {opp.countryName} {opp.year}
        </span>
      </h2>
      <Rule />
      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h3 className="font-display text-xl font-bold italic">{t("round.resting")}</h3>
          <p className="mb-2 text-sm text-muted">{t("round.restingHint")}</p>
          <ul className="divide-y divide-dotted divide-line">
            {user.cardIds.map((id, i) => {
              const v = cardView(ds, id);
              const rests = resting === id;
              return (
                <li key={id}>
                  <label
                    className={`grid cursor-pointer grid-cols-[1.5rem_4.5rem_1fr_auto] items-center gap-2 px-1 py-2 ${rests ? "bg-surface" : ""}`}
                  >
                    <input
                      type="radio"
                      name="resting"
                      checked={rests}
                      onChange={() => setResting(id)}
                      className="accent-accent"
                    />
                    <Kicker>{i < 4 ? t("slots.board", { n: i + 1 }) : t("slots.reserve")}</Kicker>
                    <span className={`truncate ${rests ? "text-muted line-through" : "font-bold"}`}>
                      {v.name}
                    </span>
                    <span className="text-sm tabular-nums">
                      {rests ? (
                        <i className="text-muted">{t("round.restsLabel")}</i>
                      ) : (
                        v.card.strength
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
        <section>
          <h3 className="font-display text-xl font-bold italic">{t("round.opponentLineup")}</h3>
          <ul className="mt-7 divide-y divide-dotted divide-line">
            {oppLineup.map((id, i) => {
              const v = cardView(ds, id);
              return (
                <li key={id} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2 py-2">
                  <Kicker>{t("slots.board", { n: i + 1 })}</Kicker>
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{v.name}</span>
                    <span className="text-sm">
                      <StyleTrait trait={v.trait} label={t(`trait.${v.trait}`)} />
                    </span>
                  </span>
                  <span className="font-display text-xl font-bold tabular-nums">
                    {v.card.strength}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
      <Rule />
      <div className="text-center">
        <Button variant="primary" className="px-8 py-3" onClick={playRound}>
          {t("round.play")}
        </Button>
      </div>
    </div>
  );
}
