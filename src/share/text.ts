/**
 * Share text (GDD §11), Wordle style: mode, medal or place, the user's four
 * players, one mark per round with the match score, and the `?seed=` link so
 * a friend can try the same session. Playing strength never appears.
 */
import type { TFunction } from "i18next";
import type { Medal } from "../data/types.ts";
import type { Mode } from "../app/state/mode.ts";
import type { ShareCardLabels } from "../app/ui/ShareCard.tsx";
import { formatPoints, outcomeOf, type Outcome } from "../app/ui/format.ts";

export interface SharePlayer {
  board: number;
  name: string;
  countryCode: string;
  countryName: string;
  year: number;
}

export interface ShareRound {
  round: number;
  /** The user's game points in the match. */
  own: number;
  other: number;
}

/** What the share text and image show about a finished tournament. */
export interface ShareSummary {
  mode: Mode;
  medal: Medal | null;
  place: number;
  matchPoints: number;
  gamePoints: number;
  players: SharePlayer[];
  rounds: ShareRound[];
  /** Link that reproduces the session (`?seed=`, `?modo=`). */
  url: string;
}

const medalEmoji: Record<Medal, string> = { gold: "🥇", silver: "🥈", bronze: "🥉" };
const outcomeEmoji: Record<Outcome, string> = { win: "🟩", draw: "🟨", loss: "🟥" };

export const roundOutcome = (r: ShareRound): Outcome => outcomeOf(r.own / (r.own + r.other));

export const roundScore = (r: ShareRound) => `${formatPoints(r.own)}–${formatPoints(r.other)}`;

/** Last word of the name, as on the final certificate. */
export const surname = (name: string) => name.split(" ").at(-1) ?? name;

/** Medal or place headline, e.g. "Medalha de Prata" or "5º lugar". */
export const shareHeadline = (s: ShareSummary, t: TFunction) =>
  s.medal ? t(`final.medal_${s.medal}`) : t("final.place", { place: s.place });

export function shareText(s: ShareSummary, t: TFunction): string {
  const place = t("final.place", { place: s.place });
  const points = t("share.matchPoints", { mp: s.matchPoints });
  const result = s.medal
    ? `${medalEmoji[s.medal]} ${shareHeadline(s, t)} · ${place} · ${points}`
    : `${place} · ${points}`;
  return [
    `${t("app.title")} · ${t(`share.mode_${s.mode}`)}`,
    result,
    s.players.map((p) => surname(p.name)).join(", "),
    s.rounds.map((r) => `${outcomeEmoji[roundOutcome(r)]} ${roundScore(r)}`).join("  "),
    s.url,
  ].join("\n");
}

/** Texts of the `ShareCard`, from i18n. */
export function shareCardLabels(s: ShareSummary, t: TFunction): ShareCardLabels {
  const summary = t("final.summary", {
    mp: s.matchPoints,
    gp: formatPoints(s.gamePoints),
  });
  return {
    title: t("app.title"),
    kicker: t("app.kicker"),
    mode: t(`share.mode_${s.mode}`),
    certifies: t("final.certifies"),
    verb: s.medal ? t("final.won") : t("final.placed"),
    headline: shareHeadline(s, t),
    detail: s.medal ? `${t("final.place", { place: s.place })} · ${summary}` : summary,
    board: (n) => t("slots.board", { n }),
    round: (n) => t("final.roundShort", { n }),
    footer: t("share.footer", { url: s.url.replace(/^https?:\/\//, "") }),
  };
}
