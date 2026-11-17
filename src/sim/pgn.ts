/**
 * PGN export of the user's games (GDD §3.8, §10). Pure: texts, names and the
 * site URL come from the caller (i18n, dataset, location).
 */
import { Chess } from "chess.js";
import type { Termination } from "../engine/game.ts";
import type { ArchivedGame } from "./gameArchive.ts";

export interface PgnContext {
  event: string;
  /** URL that reproduces the session (`?seed=`). */
  site: string;
  date: Date;
  seed: string;
  /** Player label, e.g. "Karpov (1980)". */
  playerName(cardId: string): string;
  teamName(teamId: string): string;
  terminationLabel(t: Termination): string;
  /** Comment placed after the last book move. */
  bookComment: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
export const pgnDate = (d: Date) =>
  `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;

export function gamePgn(g: ArchivedGame, ctx: PgnContext): string {
  const chess = new Chess();
  const headers: [string, string][] = [
    ["Event", ctx.event],
    ["Site", ctx.site],
    ["Date", pgnDate(ctx.date)],
    ["Round", String(g.round)],
    ["Board", String(g.board)],
    ["White", ctx.playerName(g.whiteCardId)],
    ["Black", ctx.playerName(g.blackCardId)],
    ["WhiteTeam", ctx.teamName(g.whiteTeamId)],
    ["BlackTeam", ctx.teamName(g.blackTeamId)],
    ["Result", g.result],
    ["Termination", ctx.terminationLabel(g.termination)],
    ["Annotator", "Maia-3"],
    ["Seed", ctx.seed],
  ];
  for (const [k, v] of headers) chess.setHeader(k, v);
  g.san.forEach((s, i) => {
    chess.move(s);
    if (i === g.bookPlies - 1) chess.setComment(ctx.bookComment);
  });
  // chess.js only writes the result when the game ended on the board.
  const pgn = chess.pgn();
  return pgn.trimEnd().endsWith(g.result) ? pgn : `${pgn.trimEnd()} ${g.result}`;
}

/** All games in one file, one after the other. */
export const campaignPgn = (games: readonly ArchivedGame[], ctx: PgnContext) =>
  games.map((g) => gamePgn(g, ctx)).join("\n\n") + "\n";
