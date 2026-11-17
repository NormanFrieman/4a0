/**
 * Share image (GDD §11): the final certificate at a fixed 1080 × 1350 (4:5),
 * exported to PNG by `src/share/image.ts`. Fixed pixel sizes, so it looks the
 * same whatever the viewport. Playing strength never appears.
 */
import type { Medal } from "../../data/types.ts";
import type { SharePlayer, ShareRound } from "../../share/text.ts";
import { roundOutcome, roundScore } from "../../share/text.ts";
import { ChampionName } from "./ChampionName.tsx";
import { Flag } from "./Flag.tsx";
import { ResultBadge } from "./ResultBadge.tsx";

export const SHARE_CARD_SIZE = { width: 1080, height: 1350 };

const medalColor: Record<Medal, string> = {
  gold: "text-medal-gold",
  silver: "text-medal-silver",
  bronze: "text-medal-bronze",
};

export interface ShareCardLabels {
  title: string;
  kicker: string;
  mode: string;
  certifies: string;
  /** "conquistou a" / "terminou em". */
  verb: string;
  /** Medal or place. */
  headline: string;
  /** Place (when there is a medal) and points. */
  detail: string;
  board: (n: number) => string;
  round: (n: number) => string;
  /** World champion label, the mark's accessible name. */
  champion: string;
  footer: string;
}

export function ShareCard({
  medal,
  players,
  rounds,
  labels,
}: {
  medal: Medal | null;
  players: SharePlayer[];
  rounds: ShareRound[];
  labels: ShareCardLabels;
}) {
  return (
    <div
      className="flex h-[1350px] w-[1080px] flex-col bg-paper px-[72px] py-[64px] font-body text-ink"
      style={{ fontVariantNumeric: "lining-nums" }}
    >
      <header className="border-b-[6px] border-double border-ink pb-[20px] text-center">
        <div className="text-[22px] tracking-[0.3em] text-muted uppercase">{labels.kicker}</div>
        <div className="font-display text-[132px] leading-none font-black tracking-tight">
          {labels.title}
        </div>
        <div className="mt-[12px] flex items-center justify-center gap-[20px] text-[30px] text-muted italic">
          <span className="h-px w-[80px] bg-line" />
          {labels.mode}
          <span className="h-px w-[80px] bg-line" />
        </div>
      </header>

      <section
        className={`mt-[48px] border-[6px] border-double bg-surface px-[40px] py-[36px] text-center ${medal ? "border-accent" : "border-line"}`}
      >
        <div className="text-[20px] tracking-[0.3em] text-muted uppercase">{labels.certifies}</div>
        <div className="mt-[8px] text-[28px] text-muted">{labels.verb}</div>
        <div
          className={`font-display text-[80px] leading-tight font-black whitespace-nowrap ${medal ? medalColor[medal] : ""}`}
        >
          {labels.headline}
        </div>
        <div className="mt-[4px] text-[32px] italic">{labels.detail}</div>
      </section>

      <ul className="mt-[48px] space-y-[22px]">
        {players.map((p) => (
          <li key={p.board} className="flex items-center gap-[24px]">
            <span className="w-[130px] shrink-0 text-[20px] tracking-[0.2em] text-muted uppercase">
              {labels.board(p.board)}
            </span>
            <Flag code={p.countryCode} label={p.countryName} className="w-[60px]" />
            <ChampionName
              name={p.name}
              champion={p.champion ? labels.champion : undefined}
              className="font-display text-[40px] font-bold"
            />
            <span className="flex-1 border-b-2 border-dotted border-line" />
            <span className="text-[28px] text-muted italic">
              {p.countryName} {p.year}
            </span>
          </li>
        ))}
      </ul>

      <div
        className="mt-auto grid border-t-2 border-line pt-[28px] text-center"
        style={{ gridTemplateColumns: `repeat(${rounds.length}, minmax(0, 1fr))` }}
      >
        {rounds.map((r) => (
          <div key={r.round}>
            <div className="text-[20px] tracking-[0.2em] text-muted uppercase">
              {labels.round(r.round)}
            </div>
            <ResultBadge outcome={roundOutcome(r)} className="text-[32px]">
              {roundScore(r)}
            </ResultBadge>
          </div>
        ))}
      </div>

      <div className="mt-[32px] text-center text-[24px] text-muted italic">{labels.footer}</div>
    </div>
  );
}
