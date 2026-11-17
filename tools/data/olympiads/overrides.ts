/**
 * Manual corrections, each with its reason (plano-dados.md: the parser is
 * never patched case by case). Matched by edition, German team name (lineup
 * page heading) and board.
 */
export interface PlayerOverride {
  year: number;
  team: string;
  board: 1 | 2 | 3 | 4;
  /** Wikidata item when the page has no link or links the wrong article. */
  qid?: string;
  reason: string;
}

export const overrides: PlayerOverride[] = [];

export function overrideFor(year: number, team: string, board: number): PlayerOverride | undefined {
  return overrides.find((o) => o.year === year && o.team === team && o.board === board);
}
