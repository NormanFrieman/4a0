import { useTranslation } from "react-i18next";
import {
  USER_ID,
  currentRound,
  currentStandings,
  isFinished,
} from "../../tournament/tournament.ts";
import { Button, Flag, Masthead, Rule, formatPoints } from "../ui/index.ts";
import { useSession } from "../state/session.ts";
import { teamLabel } from "./helpers.ts";

export function Standings() {
  const { t } = useTranslation();
  const { dataset: ds, tournament, next } = useSession();
  if (!ds || !tournament) return null;
  const rows = currentStandings(tournament);
  const round = currentRound(tournament)!.round;
  const finished = isFinished(tournament);
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Masthead
        title={t("app.title")}
        kicker={t("app.kicker")}
        section={t("standings.section", { n: round })}
      />
      <table className="mt-6 w-full text-left">
        <thead>
          <tr className="border-b border-ink text-[11px] tracking-[0.2em] text-muted uppercase">
            <th className="py-1 pr-2 font-normal">{t("standings.rank")}</th>
            <th className="py-1 font-normal">{t("standings.team")}</th>
            <th className="py-1 text-right font-normal" title={t("standings.mpTitle")}>
              {t("standings.mp")}
            </th>
            <th className="py-1 text-right font-normal" title={t("standings.gpTitle")}>
              {t("standings.gp")}
            </th>
            <th className="py-1 pl-2 text-right font-normal" title={t("standings.buchholzTitle")}>
              {t("standings.buchholz")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const team = teamLabel(ds, r.teamId, t("round.you"));
            const isUser = r.teamId === USER_ID;
            return (
              <tr
                key={r.teamId}
                className={`border-b border-dotted border-line ${isUser ? "bg-surface font-bold" : ""}`}
              >
                <td className="py-2 pr-2 text-muted tabular-nums">{r.rank}</td>
                <td className="py-2">
                  <span className="flex items-center gap-2">
                    {team.countryCode ? (
                      <Flag code={team.countryCode} className="w-6" />
                    ) : (
                      <span className="inline-block w-6 text-center text-accent">★</span>
                    )}
                    <span className={isUser ? "" : "italic"}>{team.name}</span>
                  </span>
                </td>
                <td className="py-2 text-right font-display text-lg font-bold tabular-nums">
                  {r.matchPoints}
                </td>
                <td className="py-2 text-right tabular-nums">{formatPoints(r.gamePoints)}</td>
                <td className="py-2 pl-2 text-right text-muted tabular-nums">{r.buchholz}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Rule />
      <div className="text-center">
        <Button variant="primary" className="px-8 py-3" onClick={next}>
          {finished ? t("standings.final") : t("standings.next")}
        </Button>
      </div>
    </div>
  );
}
