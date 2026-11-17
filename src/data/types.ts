/**
 * Published data files (GDD §9.3) and entities (GDD §9.4). Names follow the
 * glossary (GDD §2).
 */

export type Medal = "gold" | "silver" | "bronze";

export interface Olympiad {
  year: number;
  city: string;
  country: string;
  rounds: number;
  boards: number;
  teamsCount: number;
}

export interface NationalTeam {
  id: string;
  year: number;
  countryCode: string;
  countryName: string;
  finalRank: number;
  /** Mean strength of the 4 cards. */
  avgStrength: number;
  rollWeight: number;
  /** Boards 1–4, in the real board order (reserves are not in the data). */
  cardIds: string[];
}

export interface Person {
  id: string;
  name: string;
  countryCodes: string[];
  maxTitle: string;
  /** 1 − draw rate (GDD §7.2). */
  decisiveness: number;
  /**
   * World champion of the classical/unified line, at any time (special look;
   * tools/data/olympiads/worldChampions.ts). Absent in the sample dataset.
   */
  worldChampion?: boolean;
}

export interface PlayerCard {
  id: string;
  personId: string;
  year: number;
  teamId: string;
  /** Board played in the real edition, 1–4. */
  board: number;
  title: string;
  fideRating: number;
  performance: number;
  /** Game strength (GDD §6.1), computed by the data pipeline. */
  strength: number;
  /** Points scored in the real edition. */
  score: number;
  games: number;
  medals: Medal[];
  /**
   * Opening book (GDD §7.1), relative to the dataset root: the card's own
   * book (`books/{cardId}.bin`) or its decade's (`books/decade-1970.bin`).
   * `null`: no book yet (dataset v1); the engine plays from move 1.
   */
  bookFile: string | null;
}

/** `index.json` */
export interface DatasetIndex {
  version: string;
  dataset: string;
  /** Shown to the user, e.g. test-data disclaimer. */
  note?: string;
  olympiads: Olympiad[];
  teams: NationalTeam[];
}

/** `olympiads/{year}.json` */
export interface OlympiadFile {
  olympiad: Olympiad;
  cards: PlayerCard[];
}
