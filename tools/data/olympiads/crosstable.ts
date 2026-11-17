/**
 * Reads `Schacholympiade {year}/Tabelle` (de.wikipedia): the progress table
 * with, for each team and round, the opponent's code and the board points
 * scored (`VEN<br>2½`).
 */
import { parseGermanNumber, parseTables, plainText } from "./wikitext.ts";

export interface CrosstableTeam {
  /** null for a team out of competition (e.g. the host's extra team in 1980). */
  rank: number | null;
  /** German name, as in the lineup page headings. */
  name: string;
  /** Short code, e.g. "URS", "HUN-B". */
  code: string;
  /** Opponent code per round; null for a bye, forfeit or unreadable cell. */
  opponents: (string | null)[];
}

const norm = (s: string) => s.replace(/[()]/g, "").trim();

export function parseCrosstable(text: string): CrosstableTeam[] {
  for (const table of parseTables(text)) {
    const headerRow = table.rows.find((r) => r[0]?.header);
    if (!headerRow) continue;
    const headers = headerRow.map((c) => plainText(c.raw));
    const rg = headers.indexOf("Rg");
    const team = headers.indexOf("Mannschaft");
    const code = headers.indexOf("Code");
    if (rg < 0 || team < 0 || code < 0) continue;
    const roundCols = headers.flatMap((h, i) => (/^\d+$/.test(h) ? [i] : []));

    return table.rows
      .filter((r) => !r[0]?.header)
      .map((r): CrosstableTeam => {
        const cell = (i: number) => r[i]?.raw ?? "";
        const rankText = plainText(cell(rg)).replace(/\.$/, "");
        const rank = rankText ? parseGermanNumber(rankText) : null;
        if (rankText && rank === null) throw new Error(`crosstable: bad rank "${cell(rg)}"`);
        return {
          rank,
          name: plainText(cell(team)),
          code: norm(plainText(cell(code))),
          opponents: roundCols.map((i) => {
            const [opp] = cell(i).split(/<br\s*\/?>/i);
            const c = norm(plainText(opp ?? ""));
            return /^[A-Z][A-Z0-9-]*$/.test(c) ? c : null;
          }),
        };
      });
  }
  throw new Error("crosstable: no progress table (Rg, Mannschaft, Code) found");
}
