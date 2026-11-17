/** Final standings and the tabs of the Final screen's right column (GDD §5.3, §10). */
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Medal } from "../../data/types.ts";
import { USER_ID, currentStandings, entrant } from "../../tournament/tournament.ts";
import { Button, Flag, ResultBadge, formatPoints, outcomeOf } from "../ui/index.ts";
import { useSession } from "../state/session.ts";
import { opponentIn, teamLabel, userMatches, userPointsIn } from "./helpers.ts";

export const medalColor: Record<Medal, string> = {
  gold: "text-medal-gold",
  silver: "text-medal-silver",
  bronze: "text-medal-bronze",
};

interface Row {
  teamId: string;
  rank: number;
  name: string;
  countryCode: string | null;
  isUser: boolean;
  medal: Medal | null;
  matchPoints: number;
  gamePoints: number;
  buchholz: number;
  avgStrength: number;
  /** The user's match against this team, if they met. */
  faced: { round: number; points: number } | null;
}

function useRows(): Row[] | null {
  const { t } = useTranslation();
  const { dataset: ds, tournament } = useSession();
  if (!ds || !tournament) return null;
  const faced = new Map(
    userMatches(tournament).map((m) => [
      opponentIn(m),
      { round: m.round, points: userPointsIn(m)! },
    ]),
  );
  return currentStandings(tournament).map((r) => {
    const team = teamLabel(ds, r.teamId, t("round.you"));
    return {
      teamId: r.teamId,
      rank: r.rank,
      name: team.name,
      countryCode: team.countryCode,
      isUser: r.teamId === USER_ID,
      medal: r.medal,
      matchPoints: r.matchPoints,
      gamePoints: r.gamePoints,
      buchholz: r.buchholz,
      avgStrength: entrant(tournament, r.teamId).avgStrength,
      faced: faced.get(r.teamId) ?? null,
    };
  });
}

/** The user's score against this team ("3ª 2½–1½"), coloured by result. */
function Faced({ faced }: { faced: NonNullable<Row["faced"]> }) {
  const { t } = useTranslation();
  return (
    <ResultBadge outcome={outcomeOf(faced.points / 4)} className="text-xs font-normal">
      {t("final.roundShort", { n: faced.round })} {formatPoints(faced.points)}–
      {formatPoints(4 - faced.points)}
    </ResultBadge>
  );
}

/**
 * Final standings of every team. Below `sm` the Buchholz column is hidden and
 * the user's score against each team moves under its name.
 */
export function StandingsTable() {
  const { t } = useTranslation();
  const rows = useRows();
  if (!rows) return null;
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-ink text-[11px] tracking-[0.2em] text-muted uppercase">
          <th className="py-1 pr-2 font-normal">{t("standings.rank")}</th>
          <th className="py-1 font-normal">{t("standings.team")}</th>
          <th className="hidden py-1 pr-2 font-normal sm:table-cell" />
          <th className="py-1 text-right font-normal" title={t("standings.mpTitle")}>
            {t("standings.mp")}
          </th>
          <th className="py-1 pl-2 text-right font-normal" title={t("standings.gpTitle")}>
            {t("standings.gp")}
          </th>
          <th
            className="hidden py-1 pl-2 text-right font-normal sm:table-cell"
            title={t("standings.buchholzTitle")}
          >
            {t("standings.buchholz")}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr
            key={r.teamId}
            aria-current={r.isUser ? "true" : undefined}
            className={`border-b border-dotted border-line ${r.isUser ? "bg-surface font-bold" : ""}`}
          >
            <td
              className={`py-1.5 pr-2 tabular-nums ${r.medal ? `font-bold ${medalColor[r.medal]}` : "text-muted"}`}
              title={r.medal ? t(`final.medal_${r.medal}`) : undefined}
            >
              {r.rank}
            </td>
            <td className="w-full py-1.5">
              <span className="flex items-center gap-2">
                {r.countryCode ? (
                  <Flag code={r.countryCode} className="w-5 shrink-0" />
                ) : (
                  <span className="inline-block w-5 shrink-0 text-center text-accent">★</span>
                )}
                <span className={r.isUser ? "" : "italic"}>{r.name}</span>
              </span>
              {(!r.isUser || r.faced) && (
                <span className="block pl-7 text-xs font-normal text-muted italic">
                  {!r.isUser && t("final.opponentAvg", { avg: r.avgStrength })}
                  {r.faced && (
                    <span className="not-italic sm:hidden">
                      {" · "}
                      <Faced faced={r.faced} />
                    </span>
                  )}
                </span>
              )}
            </td>
            <td className="hidden py-1.5 pr-2 text-right whitespace-nowrap sm:table-cell">
              {r.faced && <Faced faced={r.faced} />}
            </td>
            <td className="py-1.5 text-right font-display font-bold tabular-nums">
              {r.matchPoints}
            </td>
            <td className="py-1.5 pl-2 text-right tabular-nums">{formatPoints(r.gamePoints)}</td>
            <td className="hidden py-1.5 pl-2 text-right text-muted tabular-nums sm:table-cell">
              {r.buchholz}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const TABS = ["campaign", "standings", "prizes"] as const;
type Tab = (typeof TABS)[number];
const tabLabel = {
  campaign: "final.tabCampaign",
  standings: "final.tabStandings",
  prizes: "final.tabPrizes",
} as const;

/** Right column of the Final screen: Campanha | Classificação | Prêmios. */
export function FinalTabs({ campaign, prizes }: { campaign: ReactNode; prizes: ReactNode }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("campaign");
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (TABS.indexOf(tab) + step + TABS.length) % TABS.length;
    setTab(TABS[next]!);
    buttons.current[next]?.focus();
  };

  return (
    <div className="mt-8 lg:mt-0 lg:flex lg:min-h-0 lg:flex-col">
      <div role="tablist" aria-label={t("final.section")} className="flex lg:shrink-0">
        {TABS.map((id, i) => (
          <Button
            key={id}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            variant="toggle"
            role="tab"
            id={`final-tab-${id}`}
            aria-selected={tab === id}
            aria-controls="final-tabpanel"
            tabIndex={tab === id ? 0 : -1}
            className="flex-1 text-sm"
            onClick={() => setTab(id)}
            onKeyDown={onKeyDown}
          >
            {t(tabLabel[id])}
          </Button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="final-tabpanel"
        aria-labelledby={`final-tab-${tab}`}
        className="mt-4 space-y-8 lg:min-h-0 lg:space-y-5 lg:overflow-y-auto"
      >
        {tab === "campaign" && campaign}
        {tab === "standings" && <StandingsTable />}
        {tab === "prizes" && prizes}
      </div>
    </div>
  );
}
