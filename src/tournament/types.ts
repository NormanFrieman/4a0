/** Tournament entities (GDD §5). */

/** A team in the tournament: the user's or a historical field team. */
export interface Entrant {
  id: string;
  isUser: boolean;
  /** Card ids in fixed board order. User: 5 (4 play each round); field: the first 4 play. */
  cardIds: string[];
  /** Mean strength of the 4 regular boards (round 1 pairing, tiebreak). */
  avgStrength: number;
}

/** One match of a round. `first` is listed first: white on boards 1 and 3 (GDD §5.2). */
export interface Pairing {
  first: string;
  second: string;
}

export type GameScore = 1 | 0.5 | 0;

export interface BoardResult {
  board: number;
  whiteCardId: string;
  blackCardId: string;
  /** White's score. */
  score: GameScore;
}

export interface MatchResult {
  round: number;
  first: string;
  second: string;
  boards: BoardResult[];
  firstPoints: number;
  secondPoints: number;
}
