/**
 * Open Chess Olympiads in the dataset (plano-dados.md, "Edições"), typed by
 * hand. `start` (first round) picks the FIDE list used for each card's rating:
 * the latest list dated on or before it. Each line cites its source.
 *
 * Proof of concept: only 1980 and 2024 so far. The other 26 editions come
 * with step 3 of plano-dados.md.
 */
export interface Edition {
  year: number;
  /** City and host country, pt-BR. */
  city: string;
  country: string;
  /** ISO date of the first round. */
  start: string;
  rounds: number;
  /** Teams in the open section, B/C teams of the host included. */
  teamsCount: number;
  source: string;
}

export const editions: Edition[] = [
  {
    year: 1980,
    city: "La Valletta",
    country: "Malta",
    start: "1980-11-20",
    rounds: 14,
    teamsCount: 82,
    source:
      "de.wikipedia: Schacholympiade 1980/Tabelle (20 Nov – 6 Dez 1980) e Mannschaftsaufstellungen der Schacholympiade 1980 (82 Mannschaften, 14 Runden)",
  },
  {
    year: 2024,
    city: "Budapeste",
    country: "Hungria",
    start: "2024-09-11",
    rounds: 11,
    teamsCount: 188,
    source:
      "de.wikipedia: Schacholympiade 2024/Tabelle (188 Teams, elf Runden); en.wikipedia: 45th Chess Olympiad (rounds 11–22 September 2024)",
  },
];

export function edition(year: number): Edition {
  const e = editions.find((x) => x.year === year);
  if (!e) throw new Error(`No edition ${year} in editions.ts`);
  return e;
}

/** `--years 1980,2024`, or every edition. */
export function yearsFromArgs(argv: readonly string[]): number[] {
  const i = argv.indexOf("--years");
  if (i < 0) return editions.map((e) => e.year);
  return (argv[i + 1] ?? "").split(",").map((y) => edition(Number(y)).year);
}
