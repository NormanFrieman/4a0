/**
 * Reads `Mannschaftsaufstellungen der Schacholympiade {year}` (de.wikipedia):
 * one `=== {rank}. {team} ===` section per team, with a wikitable holding the
 * team row (Platz, Land, G, R, V, Brettp., Mannschaftsp.) and one row per
 * player (Brett, Spieler, G, R, V, Punkte, Partien).
 */
import {
  firstTemplate,
  linkTarget,
  parseGermanNumber,
  parseTables,
  plainText,
  type WikiRow,
} from "./wikitext.ts";

export type Board = 1 | 2 | 3 | 4 | 5 | 6 | "R";

export interface LineupPlayer {
  board: Board;
  /** Name as shown on the page (German transliteration). */
  name: string;
  /** de.wikipedia article, or null for unlinked players. */
  wikiTitle: string | null;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  games: number;
}

export interface LineupTeam {
  /** Position of the section on the page, from 1. */
  order: number;
  /** Section heading without the rank, e.g. "Sowjetunion", "Ungarn B". */
  name: string;
  /** Final rank; null for teams out of competition. */
  rank: number | null;
  /**
   * Flag template without the year suffix, e.g. "SUN" from `{{SUN-1980}}`;
   * null for teams without a flag (e.g. Palestine, IBCA, ICSC, IPCA).
   */
  countryTemplate: string | null;
  /** Board points; 1970–1974: preliminaries + final, which repeat carried-over matches. */
  boardPoints: number;
  players: LineupPlayer[];
}

function columnIndex(headers: string[], name: string): number {
  const i = headers.findIndex((h) => h.replace(/\s/g, "") === name);
  if (i < 0) throw new Error(`Column "${name}" not found in [${headers.join(", ")}]`);
  return i;
}

function num(s: string | undefined, what: string): number {
  const n = parseGermanNumber(s ?? "");
  if (n === null) throw new Error(`${what}: not a number: "${s}"`);
  return n;
}

/** Teams per edition that enter the dataset (plano-dados.md, user decision). */
export const TOP_TEAMS = 20;

/** The first `TOP_TEAMS` ranked teams, in rank order (unranked teams left out). */
export function topTeams<T extends { rank: number | null; order: number }>(teams: T[]): T[] {
  return teams
    .filter((t) => t.rank !== null)
    .sort((a, b) => a.rank! - b.rank! || a.order - b.order)
    .slice(0, TOP_TEAMS);
}

/** Card players of a team: boards 1–4 (GDD §4: reserves stay out). */
export const isCardBoard = (board: Board) => board !== "R" && board <= 4;

function playerHeaderIdxOf(rows: WikiRow[], teamHeaderIdx: number): number {
  return rows.findIndex((r, i) => i > teamHeaderIdx && r[0]?.header);
}

export function parseLineups(text: string): LineupTeam[] {
  const headings = [...text.matchAll(/^===\s*(.+?)\s*===\s*$/gm)].map((m) => ({
    offset: m.index,
    title: m[1]!,
  }));
  const tables = parseTables(text);
  const teams: LineupTeam[] = [];

  headings.forEach((h, idx) => {
    const end = headings[idx + 1]?.offset ?? text.length;
    const table = tables.find((t) => t.offset > h.offset && t.offset < end);
    if (!table) return;
    const name = h.title.replace(/^\d+\.\s*/, "").trim();
    const where = `team "${h.title}"`;

    // Rows: [team header, team row, player header, player rows…].
    const headerIdx = table.rows.findIndex((r) => r[0]?.header);
    const teamHeaders = table.rows[headerIdx]!.map((c) => plainText(c.raw));
    const teamRow = table.rows[headerIdx + 1]!.map((c) => c.raw);
    // 1970–1974: a second row with the final stage (rowspan cells left out).
    const finalRow =
      playerHeaderIdxOf(table.rows, headerIdx) === headerIdx + 3
        ? table.rows[headerIdx + 2]!.map((c) => c.raw)
        : null;
    const playerHeaderIdx = playerHeaderIdxOf(table.rows, headerIdx);
    const playerHeaders = table.rows[playerHeaderIdx]!.map((c) => plainText(c.raw));

    const tpl = firstTemplate(teamRow[columnIndex(teamHeaders, "Land")]!);
    // "1" or, 1970–1974, "1 (A)" (rank and final group).
    const rankMatch = /^(\d+)/.exec(plainText(teamRow[columnIndex(teamHeaders, "Platz")] ?? ""));
    const rank = rankMatch ? Number(rankMatch[1]) : null;
    const bp = columnIndex(teamHeaders, "Brettp.");
    let boardPoints = num(teamRow[bp], `${where} Brettp.`);
    // The final row lacks the two rowspan cells (Platz, Land).
    // 1972–1974 put some final-stage points in parentheses: "(19)".
    if (finalRow)
      boardPoints += num(finalRow[bp - 2]?.replace(/[()]/g, ""), `${where} Brettp. (final)`);

    const col = {
      board: columnIndex(playerHeaders, "Brett"),
      player: columnIndex(playerHeaders, "Spieler"),
      w: columnIndex(playerHeaders, "G"),
      d: columnIndex(playerHeaders, "R"),
      l: columnIndex(playerHeaders, "V"),
      points: columnIndex(playerHeaders, "Punkte"),
      games: columnIndex(playerHeaders, "Partien"),
    };
    const players = table.rows.slice(playerHeaderIdx + 1).map((row): LineupPlayer => {
      const cell = (i: number) => row[i]?.raw ?? "";
      const boardText = plainText(cell(col.board));
      const board = boardText === "R" ? "R" : (Number(boardText) as Board);
      if (board !== "R" && !(board >= 1 && board <= 6))
        throw new Error(`${where}: bad board "${boardText}"`);
      const name = plainText(cell(col.player));
      const what = `${where}, ${name}`;
      return {
        board,
        name,
        wikiTitle: linkTarget(cell(col.player)),
        wins: num(cell(col.w), what),
        draws: num(cell(col.d), what),
        losses: num(cell(col.l), what),
        points: num(cell(col.points), what),
        games: num(cell(col.games), what),
      };
    });

    teams.push({
      order: teams.length + 1,
      name,
      rank,
      countryTemplate: tpl ? tpl.name.replace(/-\d{4}$/, "") : null,
      boardPoints,
      players,
    });
  });
  return teams;
}
