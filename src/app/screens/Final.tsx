import { useTranslation } from "react-i18next";
import { USER_ID, currentStandings, entrant } from "../../tournament/tournament.ts";
import {
  Button,
  Flag,
  Kicker,
  Masthead,
  ResultBadge,
  formatPoints,
  outcomeOf,
} from "../ui/index.ts";
import { useSession } from "../state/session.ts";
import {
  cardTotals,
  cardView,
  opponentIn,
  teamLabel,
  userMatches,
  userPointsIn,
} from "./helpers.ts";

const medalColor = {
  gold: "text-medal-gold",
  silver: "text-medal-silver",
  bronze: "text-medal-bronze",
};

export function Final() {
  const { t } = useTranslation();
  const { dataset: ds, tournament, playAgain } = useSession();
  if (!ds || !tournament) return null;
  const row = currentStandings(tournament).find((r) => r.teamId === USER_ID)!;
  const user = entrant(tournament, USER_ID);
  const totals = cardTotals(tournament);
  const best = [...totals.entries()]
    .filter(([, v]) => v.games > 0)
    .sort((a, b) => b[1].points / b[1].games - a[1].points / a[1].games)[0]?.[0];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Masthead title={t("app.title")} kicker={t("app.kicker")} section={t("final.section")} />
      <section
        className={`mx-auto mt-6 max-w-xl border-4 border-double bg-surface px-6 py-8 text-center ${row.medal ? "border-accent" : "border-line"}`}
      >
        <div className="text-xs tracking-[0.3em] text-muted uppercase">{t("final.certifies")}</div>
        <div className="mt-2 font-display text-lg italic">
          {user.cardIds.map((id) => cardView(ds, id).name.split(" ").at(-1)).join(", ")}
        </div>
        <div className="mt-3 text-sm text-muted">
          {row.medal ? t("final.won") : t("final.placed")}
        </div>
        <div
          className={`font-display text-5xl font-black sm:text-6xl ${row.medal ? medalColor[row.medal] : ""}`}
        >
          {row.medal ? t(`final.medal_${row.medal}`) : t("final.place", { place: row.rank })}
        </div>
        <div className="mt-2 italic">
          {row.medal && `${t("final.place", { place: row.rank })} · `}
          {t("final.summary", { mp: row.matchPoints, gp: formatPoints(row.gamePoints) })}
        </div>
      </section>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <section>
          <h3 className="font-display text-xl font-bold italic">{t("final.campaign")}</h3>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {userMatches(tournament).map((m) => {
                const mine = userPointsIn(m)!;
                const opp = teamLabel(ds, opponentIn(m), t("round.you"));
                const outcome = outcomeOf(mine / 4);
                return (
                  <tr key={m.round} className="border-b border-dotted border-line">
                    <td className="py-1.5 pr-2 text-muted tabular-nums">
                      {t("final.roundShort", { n: m.round })}
                    </td>
                    <td className="py-1.5">
                      <span className="flex items-center gap-2">
                        {opp.countryCode && <Flag code={opp.countryCode} className="w-5" />}
                        {opp.name}
                      </span>
                    </td>
                    <td className="py-1.5 text-right font-bold tabular-nums">
                      {formatPoints(mine)}–{formatPoints(4 - mine)}
                    </td>
                    <td className="py-1.5 pl-3 text-right italic">
                      <ResultBadge outcome={outcome} className="font-normal">
                        {t(`round.outcome_${outcome}`)}
                      </ResultBadge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
        <section>
          <h3 className="font-display text-xl font-bold italic">{t("final.boards")}</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {user.cardIds.map((id, i) => {
              const v = cardView(ds, id);
              const s = totals.get(id)!;
              return (
                <li key={id} className="flex items-baseline gap-2">
                  <span className="w-16 shrink-0">
                    <Kicker>{i < 4 ? t("slots.board", { n: i + 1 }) : t("slots.reserve")}</Kicker>
                  </span>
                  <span className={id === best ? "font-bold" : ""}>{v.name}</span>
                  <span className="flex-1 border-b border-dotted border-line" />
                  <span className="tabular-nums">
                    {formatPoints(s.points)}/{s.games}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-6">
            <Button variant="primary" onClick={playAgain}>
              {t("final.playAgain")}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
