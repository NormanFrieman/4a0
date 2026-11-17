import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { renderShareImage, shareImage } from "../../share/image.ts";
import { shareCardLabels, shareText } from "../../share/text.ts";
import { archiveKey } from "../../sim/gameArchive.ts";
import { boardPrizes } from "../../tournament/boardPrizes.ts";
import { USER_ID, currentStandings, entrant } from "../../tournament/tournament.ts";
import {
  Button,
  ChampionName,
  Flag,
  Kicker,
  Masthead,
  ResultBadge,
  ScreenLayout,
  ShareCard,
  formatPoints,
  outcomeOf,
} from "../ui/index.ts";
import { useSession } from "../state/session.ts";
import { FinalTabs, medalColor } from "./FinalStandings.tsx";
import {
  cardTotals,
  cardView,
  downloadCampaign,
  opponentIn,
  sessionUrl,
  shareSummary,
  teamLabel,
  userMatches,
  userPointsIn,
} from "./helpers.ts";

type CopyState = "idle" | "copied" | "failed";
type ImageState = "idle" | "busy" | "failed";

/** Share buttons and the off-screen `ShareCard` they export (GDD §11). */
function SharePanel() {
  const { t } = useTranslation();
  const { dataset: ds, tournament, seed, mode } = useSession();
  const card = useRef<HTMLDivElement>(null);
  const failedText = useRef<HTMLTextAreaElement>(null);
  const [copy, setCopy] = useState<CopyState>("idle");
  const [image, setImage] = useState<ImageState>("idle");

  useEffect(() => {
    if (copy !== "copied") return;
    const id = setTimeout(() => setCopy("idle"), 2000);
    return () => clearTimeout(id);
  }, [copy]);
  useEffect(() => {
    if (copy === "failed") failedText.current?.select();
  }, [copy]);

  if (!ds || !tournament) return null;
  const summary = shareSummary(ds, tournament, mode, sessionUrl(seed, mode));
  const text = shareText(summary, t);

  const copyText = () =>
    navigator.clipboard.writeText(text).then(
      () => setCopy("copied"),
      () => setCopy("failed"),
    );

  const exportImage = async () => {
    if (!card.current) return;
    setImage("busy");
    try {
      await shareImage(await renderShareImage(card.current), `4a0-${seed}.png`);
      setImage("idle");
    } catch {
      setImage("failed");
    }
  };

  return (
    <>
      <Button onClick={copyText}>{copy === "copied" ? t("share.copied") : t("share.copy")}</Button>
      <Button onClick={exportImage} disabled={image === "busy"}>
        {image === "busy" ? t("share.imageBusy") : t("share.image")}
      </Button>
      {image === "failed" && (
        <p role="alert" className="basis-full text-center text-sm text-loss italic">
          {t("share.imageFailed")}
        </p>
      )}
      {copy === "failed" && (
        <label className="block basis-full text-left text-sm text-muted italic">
          {t("share.copyFailed")}
          <textarea
            ref={failedText}
            readOnly
            rows={5}
            value={text}
            className="mt-1 block w-full border border-line bg-surface p-2 font-body text-ink not-italic"
          />
        </label>
      )}
      {/* Off-screen, always mounted so the flags are loaded before the export. */}
      <div aria-hidden className="pointer-events-none fixed top-0 -left-[10000px]">
        <div ref={card}>
          <ShareCard
            medal={summary.medal}
            players={summary.players}
            rounds={summary.rounds}
            labels={shareCardLabels(summary, t)}
          />
        </div>
      </div>
    </>
  );
}

/** Individual prizes: the best performance on each board (GDD §5.3). */
function BoardPrizes() {
  const { t } = useTranslation();
  const { dataset: ds, tournament } = useSession();
  if (!ds || !tournament) return null;
  const prizes = boardPrizes(ds, tournament);
  if (prizes.length === 0) return null;
  return (
    <section>
      <h3 className="font-display text-xl font-bold italic">{t("final.prizes")}</h3>
      <ul className="mt-2 space-y-2 text-sm">
        {prizes.map((p) => {
          const v = cardView(ds, p.cardId);
          const team = teamLabel(ds, p.entrantId, t("round.you"));
          return (
            <li key={p.board} className="flex items-baseline gap-2">
              <span className="w-16 shrink-0">
                <Kicker>{t("slots.board", { n: p.board })}</Kicker>
              </span>
              <span className="min-w-0">
                <span className={team.isUser ? "font-bold text-accent" : ""}>
                  <Flag
                    code={v.team.countryCode}
                    className="mr-1.5 inline-block w-4 align-baseline"
                  />
                  <ChampionName
                    name={v.name}
                    champion={v.champion ? t("champion.label") : undefined}
                  />
                </span>
                <span className="block text-xs text-muted italic">
                  {team.name} · {t("final.prizePerformance", { perf: p.performance })}
                </span>
              </span>
              <span className="flex-1 border-b border-dotted border-line" />
              <span className="tabular-nums">
                {formatPoints(p.points)}/{p.games}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Final() {
  const { t } = useTranslation();
  const { dataset: ds, tournament, seed, games, playAgain, openReplay } = useSession();
  if (!ds || !tournament) return null;
  const row = currentStandings(tournament).find((r) => r.teamId === USER_ID)!;
  const user = entrant(tournament, USER_ID);
  const totals = cardTotals(tournament);
  const hasGames = Object.keys(games).length > 0;
  const best = [...totals.entries()]
    .filter(([, v]) => v.games > 0)
    .sort((a, b) => b[1].points / b[1].games - a[1].points / a[1].games)[0]?.[0];

  const campaignAndBoards = (
    <>
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
                      <span className="text-xs text-muted italic">
                        {t("final.opponentAvg", {
                          avg: entrant(tournament, opponentIn(m)).avgStrength,
                        })}
                      </span>
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
                  {hasGames && (
                    <td className="py-1.5 pl-3 text-right whitespace-nowrap">
                      <span
                        role="group"
                        aria-label={t("final.games", { n: m.round })}
                        className="inline-flex gap-1"
                      >
                        {m.boards.map((b) => {
                          const g = games[archiveKey(m.round, b.board)];
                          if (!g) return null;
                          const white = g.whiteTeamId === USER_ID;
                          const o = outcomeOf(white ? b.score : 1 - b.score);
                          return (
                            <button
                              key={b.board}
                              type="button"
                              title={t("replay.openBoard", { n: b.board })}
                              aria-label={t("replay.openBoard", { n: b.board })}
                              onClick={() => openReplay(m.round, b.board)}
                              className="cursor-pointer border border-line px-1 text-xs hover:border-ink"
                            >
                              <ResultBadge outcome={o} className="font-normal">
                                {b.board}
                              </ResultBadge>
                            </button>
                          );
                        })}
                      </span>
                    </td>
                  )}
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
                  <Kicker>{t("slots.board", { n: i + 1 })}</Kicker>
                </span>
                <ChampionName
                  name={v.name}
                  champion={v.champion ? t("champion.label") : undefined}
                  className={id === best ? "font-bold" : ""}
                />
                <span className="text-muted tabular-nums">{v.card.strength}</span>
                <span className="flex-1 border-b border-dotted border-line" />
                <span className="tabular-nums">
                  {formatPoints(s.points)}/{s.games}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );

  return (
    <ScreenLayout
      width="max-w-4xl"
      // Desktop: certificate on the left, campaign and boards on the right.
      className="lg:mt-4 lg:grid lg:grid-cols-2 lg:gap-8"
      header={
        <Masthead
          compact
          title={t("app.title")}
          kicker={t("app.kicker")}
          section={t("final.section")}
        />
      }
      footer={
        <div className="mt-6 flex flex-wrap justify-center gap-3 lg:mt-3">
          <Button variant="primary" onClick={playAgain}>
            {t("final.playAgain")}
          </Button>
          {hasGames && (
            <Button onClick={() => downloadCampaign(ds, seed, t, games)}>
              {t("replay.downloadCampaign")}
            </Button>
          )}
          <SharePanel />
        </div>
      }
    >
      <section
        className={`mx-auto mt-6 w-full max-w-xl border-4 border-double bg-surface px-6 py-8 text-center lg:mt-0 lg:self-center ${row.medal ? "border-accent" : "border-line"}`}
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

      <FinalTabs campaign={campaignAndBoards} prizes={<BoardPrizes />} />
    </ScreenLayout>
  );
}
