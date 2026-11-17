import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { balance } from "../../config/balance.ts";
import { USER_ID } from "../../tournament/tournament.ts";
import { archiveKey } from "../../sim/gameArchive.ts";
import { firstIsWhite } from "../../sim/match.ts";
import {
  BoardCard,
  Button,
  Flag,
  Masthead,
  MatchScore,
  Rule,
  ScreenLayout,
  formatPoints,
  outcomeOf,
} from "../ui/index.ts";
import { roundDone, useSession, type LiveBoard } from "../state/session.ts";
import { cardView, teamLabel } from "./helpers.ts";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/** User's score on a board (null while live). */
function userScore(b: LiveBoard, userWhite: boolean): number | null {
  if (!b.result || (!b.simulated && b.shown < b.moves.length)) return null;
  return userWhite ? b.result.score : 1 - b.result.score;
}

export function Round() {
  const { t } = useTranslation();
  const {
    dataset: ds,
    tournament,
    live,
    games,
    speed,
    setSpeed,
    tick,
    finishRound,
    openReplay,
  } = useSession();

  // Playback clock: one half-move per tick per board; tick is a no-op when the
  // board has shown everything computed so far.
  useEffect(() => {
    const ms =
      speed === "instant" ? balance.playback.instantPollMs : balance.playback.msPerPly[speed];
    const id = setInterval(tick, ms);
    return () => clearInterval(id);
  }, [speed, tick]);

  if (!ds || !tournament || !live) return null;
  // By board, not by card: the same card can play for both teams (GDD §5.1).
  const userWhite = (b: LiveBoard) =>
    (live.pairing.first === USER_ID) === firstIsWhite(b.game.board);
  const oppId = live.pairing.first === USER_ID ? live.pairing.second : live.pairing.first;
  const opp = teamLabel(ds, oppId, t("round.you"));
  const scores = live.boards.map((b) => userScore(b, userWhite(b)));
  const mine = scores.reduce<number>((a, p) => a + (p ?? 0), 0);
  const theirs = scores.reduce<number>((a, p) => a + (p === null ? 0 : 1 - p), 0);
  const liveCount = scores.filter((s) => s === null).length;
  const done = roundDone(live);

  const footer = (
    <>
      <Rule className="my-4 lg:my-3" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-wrap items-start gap-2 text-sm">
          {done ? (
            <Button variant="primary" className="px-6 py-2" onClick={finishRound}>
              {t("round.standings")}
            </Button>
          ) : (
            <>
              {(["normal", "fast", "instant"] as const).map((sp) => (
                <Button
                  key={sp}
                  variant="toggle"
                  aria-pressed={speed === sp}
                  onClick={() => setSpeed(sp)}
                >
                  {t(
                    sp === "normal"
                      ? "round.speed1"
                      : sp === "fast"
                        ? "round.speed4"
                        : "round.instant",
                  )}
                </Button>
              ))}
              <Button variant="link" onClick={() => setSpeed("instant")}>
                {t("round.skip")}
              </Button>
            </>
          )}
        </div>
        {done && (
          <div>
            <h3 className="font-display font-bold italic">{t("round.others")}</h3>
            <ul className="mt-1 space-y-1 text-sm lg:max-h-24 lg:overflow-y-auto">
              {live.field.map((m) => {
                const a = teamLabel(ds, m.first, t("round.you"));
                const b = teamLabel(ds, m.second, t("round.you"));
                return (
                  <li key={m.first} className="flex flex-wrap items-center gap-x-1.5">
                    {a.countryCode && <Flag code={a.countryCode} className="w-4" />}
                    {a.name}
                    <b className="tabular-nums">
                      {formatPoints(m.firstPoints)}–{formatPoints(m.secondPoints)}
                    </b>
                    {b.name}
                    {b.countryCode && <Flag code={b.countryCode} className="w-4" />}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </>
  );

  return (
    <ScreenLayout
      width="max-w-6xl"
      header={
        <>
          <Masthead
            compact
            title={t("app.title")}
            kicker={t("app.kicker")}
            section={t("round.section", { n: live.round, total: balance.tournament.rounds })}
          />
          <div className="mt-6 lg:mt-3">
            <MatchScore
              home={t("round.you")}
              away={opp.name}
              homePoints={mine}
              awayPoints={theirs}
              className="lg:text-4xl"
            />
          </div>
          <p className="mt-1 text-center text-muted italic">
            {done ? t("round.done") : t("round.live", { count: liveCount })}
          </p>
          <Rule className="my-4 lg:my-3" />
        </>
      }
      footer={footer}
    >
      {/* On desktop the grid is a size container: each board is capped by the
          available height (minus its label and caption) so all four keep the
          same size and the screen never scrolls. */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 lg:min-h-0 lg:flex-1 lg:grid-cols-4 lg:[container-type:size]">
        {live.boards.map((b, i) => {
          const s = scores[i]!;
          const shownMove = b.moves[b.shown - 1];
          const white = cardView(ds, b.game.whiteCardId);
          const black = cardView(ds, b.game.blackCardId);
          const status =
            s !== null
              ? `${b.result!.score === 1 ? "1-0" : b.result!.score === 0 ? "0-1" : "½-½"} · ${t(`round.outcome_${outcomeOf(s)}`)}${b.simulated ? ` · ${t("round.simulated")}` : ""}`
              : b.moves.length === 0
                ? t("round.computing")
                : t("round.moveStatus", { n: Math.max(1, Math.ceil(b.shown / 2)) });
          return (
            <BoardCard
              key={b.game.board}
              boardLabel={t("slots.board", { n: b.game.board })}
              status={status}
              outcome={s === null ? null : outcomeOf(s)}
              fen={shownMove?.fenAfter ?? START_FEN}
              lastMove={
                shownMove ? [shownMove.uci.slice(0, 2), shownMove.uci.slice(2, 4)] : undefined
              }
              white={{
                name: white.name,
                strength: white.card.strength,
                isUser: userWhite(b),
              }}
              black={{
                name: black.name,
                strength: black.card.strength,
                isUser: !userWhite(b),
              }}
              {...(done && games[archiveKey(live.round, b.game.board)]
                ? {
                    onOpen: () => openReplay(live.round, b.game.board),
                    openLabel: t("replay.openBoard", { n: b.game.board }),
                  }
                : {})}
              className="lg:mx-auto lg:w-[min(100%,calc(100cqh-5rem))]"
            />
          );
        })}
      </div>
    </ScreenLayout>
  );
}
