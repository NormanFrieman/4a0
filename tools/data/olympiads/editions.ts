/**
 * Open Chess Olympiads in the dataset (plano-dados.md, "Edições"), typed by
 * hand from de.wikipedia (revisions pinned in sources.json):
 * - city, host country and `start` (first day): `Schacholympiade {year}`;
 * - teams and rounds: the introduction of
 *   `Mannschaftsaufstellungen der Schacholympiade {year}`.
 *
 * `start` picks the FIDE list of each card: the latest one dated on or before
 * it. The online events of 2020 and 2021 stay out.
 */
export interface Edition {
  year: number;
  /** City and host country, pt-BR. */
  city: string;
  country: string;
  /** ISO date of the first day. */
  start: string;
  /**
   * Rounds of the Swiss system. 1970–1974 had preliminary groups and finals:
   * the most games played by one player in that edition.
   */
  rounds: number;
  /** Teams in the open section, B/C teams of the host included. */
  teamsCount: number;
}

const e = (
  year: number,
  city: string,
  country: string,
  start: string,
  rounds: number,
  teamsCount: number,
): Edition => ({ year, city, country, start, rounds, teamsCount });

export const editions: Edition[] = [
  e(1970, "Siegen", "Alemanha Ocidental", "1970-09-05", 19, 60),
  e(1972, "Skopje", "Iugoslávia", "1972-09-18", 22, 63),
  e(1974, "Nice", "França", "1974-06-06", 22, 75),
  e(1976, "Haifa", "Israel", "1976-10-26", 13, 48),
  e(1978, "Buenos Aires", "Argentina", "1978-10-25", 14, 66),
  e(1980, "La Valletta", "Malta", "1980-11-20", 14, 82),
  e(1982, "Lucerna", "Suíça", "1982-10-29", 14, 92),
  e(1984, "Salônica", "Grécia", "1984-11-18", 14, 88),
  e(1986, "Dubai", "Emirados Árabes Unidos", "1986-11-14", 14, 108),
  e(1988, "Salônica", "Grécia", "1988-11-12", 14, 107),
  e(1990, "Novi Sad", "Iugoslávia", "1990-11-16", 14, 108),
  e(1992, "Manila", "Filipinas", "1992-06-07", 14, 102),
  e(1994, "Moscou", "Rússia", "1994-11-30", 14, 124),
  e(1996, "Erevan", "Armênia", "1996-09-15", 14, 114),
  e(1998, "Elista", "Rússia", "1998-09-26", 13, 110),
  e(2000, "Istambul", "Turquia", "2000-10-28", 14, 126),
  e(2002, "Bled", "Eslovênia", "2002-10-25", 14, 135),
  e(2004, "Calvià", "Espanha", "2004-10-14", 14, 129),
  e(2006, "Turim", "Itália", "2006-05-20", 13, 148),
  e(2008, "Dresden", "Alemanha", "2008-11-12", 11, 146),
  e(2010, "Khanty-Mansiysk", "Rússia", "2010-09-20", 11, 148),
  e(2012, "Istambul", "Turquia", "2012-08-27", 11, 156),
  e(2014, "Tromsø", "Noruega", "2014-08-01", 11, 172),
  e(2016, "Baku", "Azerbaijão", "2016-09-01", 11, 170),
  e(2018, "Batumi", "Geórgia", "2018-09-23", 11, 184),
  e(2022, "Mamallapuram", "Índia", "2022-07-28", 11, 186),
  e(2024, "Budapeste", "Hungria", "2024-09-10", 11, 188),
  e(2026, "Samarcanda", "Uzbequistão", "2026-09-15", 11, 206),
];

export const EDITION_YEARS: readonly number[] = editions.map((x) => x.year);

export function edition(year: number): Edition {
  const found = editions.find((x) => x.year === year);
  if (!found) throw new Error(`No edition ${year} in editions.ts`);
  return found;
}

/** `--years 1980,2024`, or every edition. */
export function yearsFromArgs(argv: readonly string[]): number[] {
  const i = argv.indexOf("--years");
  if (i < 0) return [...EDITION_YEARS];
  return (argv[i + 1] ?? "").split(",").map((y) => edition(Number(y)).year);
}
