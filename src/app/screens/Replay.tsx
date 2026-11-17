import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { replayPositions } from "../../sim/gameArchive.ts";
import { scoreOf } from "../../sim/match.ts";
import { USER_ID } from "../../tournament/tournament.ts";
import {
  BoardFrame,
  Button,
  ChampionName,
  Masthead,
  ResultBadge,
  Rule,
  ScreenLayout,
  StyleTrait,
  outcomeOf,
} from "../ui/index.ts";
import { useSession, useShowStrength } from "../state/session.ts";
import { cardView, downloadCampaign, downloadGame, teamLabel } from "./helpers.ts";

const resultText = { "1-0": "1-0", "0-1": "0-1", "1/2-1/2": "½-½" } as const;

/** Replay of one of the user's games (GDD §3.8, §10): navigation and PGN download. */
export function Replay() {
  const { t } = useTranslation();
  const { dataset: ds, seed, games, replay, closeReplay } = useSession();
  const show = useShowStrength();
  const game = replay ? games[replay.key] : undefined;
  const positions = useMemo(() => (game ? replayPositions(game.san) : []), [game]);
  const last = Math.max(0, positions.length - 1);
  const [ply, setPly] = useState(last);
  const current = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const to =
        e.key === "ArrowLeft"
          ? (p: number) => p - 1
          : e.key === "ArrowRight"
            ? (p: number) => p + 1
            : e.key === "Home"
              ? () => 0
              : e.key === "End"
                ? () => last
                : null;
      if (!to) return;
      e.preventDefault();
      setPly((p) => Math.min(last, Math.max(0, to(p))));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last]);

  useEffect(() => {
    current.current?.scrollIntoView({ block: "nearest" });
  }, [ply]);

  if (!ds || !game) return null;
  const pos = positions[ply]!;
  const userWhite = game.whiteTeamId === USER_ID;
  const userShare = userWhite ? scoreOf(game.result) : 1 - scoreOf(game.result);
  const outcome = outcomeOf(userShare);

  const player = (cardId: string, teamId: string, color: "white" | "black") => {
    const v = cardView(ds, cardId);
    const team = teamLabel(ds, teamId, t("round.you"));
    return (
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span
          aria-hidden
          className={`inline-block size-2.5 border border-ink ${color === "white" ? "bg-white" : "bg-ink"}`}
        />
        <ChampionName
          name={v.name}
          champion={v.champion ? t("champion.label") : undefined}
          className={team.isUser ? "font-bold" : "italic"}
        />
        {show && <span className="text-muted tabular-nums">{v.card.strength}</span>}
        <StyleTrait trait={v.trait} label={t(`trait.${v.trait}`)} />
        <span className="w-full pl-4.5 text-sm text-muted">
          {team.isUser && `${team.name} · `}
          {v.team.countryName} {v.team.year}
        </span>
      </div>
    );
  };

  const pairs: number[] = [];
  for (let i = 1; i <= last; i += 2) pairs.push(i);

  return (
    <ScreenLayout
      width="max-w-5xl"
      className="lg:mt-3 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] lg:gap-8"
      header={
        <Masthead
          compact
          title={t("app.title")}
          kicker={t("app.kicker")}
          section={t("replay.section", { round: game.round, board: game.board })}
        />
      }
      actions={
        <>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button variant="primary" onClick={() => downloadGame(ds, seed, t, game)}>
              {t("replay.download")}
            </Button>
            <Button onClick={() => downloadCampaign(ds, seed, t, games)}>
              {t("replay.downloadCampaign")}
            </Button>
            <Button variant="link" onClick={closeReplay}>
              {t("replay.back")}
            </Button>
          </div>
        </>
      }
    >
      <div className="mt-6 lg:mt-0 lg:flex lg:min-h-0 lg:flex-col lg:[container-type:size]">
        <BoardFrame
          fen={pos.fen}
          lastMove={pos.from && pos.to ? [pos.from, pos.to] : undefined}
          orientation={userWhite ? "white" : "black"}
          coordinates
          className="mx-auto w-full max-w-xl lg:w-[min(100%,calc(100cqh-3rem))]"
        />
        <div className="mt-3 flex justify-center gap-2 lg:shrink-0">
          <Button onClick={() => setPly(0)} disabled={ply === 0} aria-label={t("replay.start")}>
            «
          </Button>
          <Button
            onClick={() => setPly((p) => Math.max(0, p - 1))}
            disabled={ply === 0}
            aria-label={t("replay.prev")}
          >
            ‹
          </Button>
          <Button
            onClick={() => setPly((p) => Math.min(last, p + 1))}
            disabled={ply === last}
            aria-label={t("replay.next")}
          >
            ›
          </Button>
          <Button onClick={() => setPly(last)} disabled={ply === last} aria-label={t("replay.end")}>
            »
          </Button>
        </div>
      </div>

      <div className="mt-6 lg:mt-0 lg:flex lg:min-h-0 lg:flex-col">
        <div className="space-y-2 lg:shrink-0">
          {player(game.blackCardId, game.blackTeamId, "black")}
          {player(game.whiteCardId, game.whiteTeamId, "white")}
          <p>
            <ResultBadge outcome={outcome}>{resultText[game.result]}</ResultBadge>
            <span className="text-muted italic">
              {" "}
              · {t(`round.outcome_${outcome}`)} · {t(`termination.${game.termination}`)}
            </span>
          </p>
        </div>
        <Rule className="my-3" />
        <h3 className="font-display font-bold italic lg:shrink-0">{t("replay.moves")}</h3>
        {last === 0 ? (
          <p className="text-sm text-muted italic">{t("replay.noMoves")}</p>
        ) : (
          <ol className="mt-1 grid max-h-64 grid-cols-[2.5rem_1fr_1fr] content-start overflow-y-auto text-sm tabular-nums lg:max-h-none lg:min-h-0 lg:flex-1">
            {pairs.map((i) => (
              <li key={i} className="contents">
                <span className="py-0.5 text-muted">{(i + 1) / 2}.</span>
                {[i, i + 1].map((p) =>
                  p <= last ? (
                    <button
                      key={p}
                      type="button"
                      ref={p === ply ? current : undefined}
                      aria-current={p === ply ? "step" : undefined}
                      onClick={() => setPly(p)}
                      className={`cursor-pointer px-1 py-0.5 text-left hover:text-accent ${p === ply ? "bg-ink text-paper hover:text-paper" : ""}`}
                    >
                      {positions[p]!.san}
                    </button>
                  ) : (
                    <span key={p} />
                  ),
                )}
              </li>
            ))}
          </ol>
        )}
        <p className="mt-2 hidden text-xs text-muted italic lg:block lg:shrink-0">
          {t("replay.keys")}
        </p>
      </div>
    </ScreenLayout>
  );
}
