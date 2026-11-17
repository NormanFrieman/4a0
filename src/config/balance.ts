/**
 * All balancing numbers live here (GDD §0). Game logic must read from this
 * object, never hardcode values. Initial values come from the GDD tables.
 */

/** One point of the game-rating → engine-parameters curve. */
export interface EngineCalibrationPoint {
  /** Game rating (calibrated real-strength scale). */
  rating: number;
  /** Maia-3 selfElo input (600–2600). */
  selfElo: number;
  /** Sampling temperature. */
  temperature: number;
}

/** One point of the card strength (FIDE-like) → game rating curve (GDD §6.2). */
export interface StrengthScalePoint {
  strength: number;
  rating: number;
}

/** One point of the selfElo → blunder tolerance curve (GDD §8.1). */
export interface DrawTargetPoint {
  /** Card strength (GDD §6). */
  strength: number;
  /** Share of drawn games. */
  rate: number;
}

export interface BlunderTolerancePoint {
  selfElo: number;
  /** Largest allowed drop in winning chances (scale −1…1); 2 or more = no check. */
  maxDrop: number;
}

export const balance = {
  // GDD §4.5 — draft
  draft: {
    /** One slot per board; no reserve. */
    slots: 4,
    rerollsPerDraft: 3,
    /** Roll weight of teams that finished within `rollTopRank` of their edition. */
    rollWeightTop10: 3,
    rollTopRank: 10,
  },

  // GDD §5.5 — tournament
  tournament: {
    rounds: 7,
    /** Historical teams besides the user's. */
    fieldSize: 23,
    /** Teams per strength tier (sum = fieldSize). */
    fieldTiers: { elite: 6, middle: 9, weak: 8 },
    /** Cuts elite/middle and middle/weak, as fractions of all teams sorted by strength. */
    fieldTierQuantiles: [1 / 3, 2 / 3],
    /** Edition winners guaranteed in the elite tier. */
    fieldMinChampions: 3,
    fieldMaxPerCountry: 2,
    matchPoints: { win: 2, draw: 1, loss: 0 },
    /** Teams in a final standings that get a medal (gold, silver, bronze). */
    medalPlaces: 3,
  },

  /**
   * Tournament with the hand-written sample dataset (public/data/sample),
   * used by the tests only: 7 field teams + the user = 8 teams; 7 rounds =
   * everyone meets once.
   */
  sampleTournament: {
    fieldSize: 7,
    fieldTiers: { elite: 2, middle: 3, weak: 2 },
    fieldMinChampions: 1,
  },

  // GDD §6.1 — card strength
  strength: {
    performanceWeight: 0.25,
    unratedCap: 2200,
  },

  /**
   * GDD §6.2 step 1 — card strength → game rating (calibrated real-strength
   * scale). Piecewise-linear, clamped at the ends.
   */
  strengthScale: [
    { strength: 1400, rating: 800 },
    { strength: 2850, rating: 2050 },
  ] satisfies StrengthScalePoint[],

  /** Range of the calibrated game-rating scale (docs/benchmarks.md). */
  ratingMin: 800,
  ratingMax: 2050,

  // GDD §6.3 — quick simulation (field matches)
  quickSim: {
    whiteAdvantage: 35,
    drawBase: 0.3,
    drawSlope: 0.03,
    drawMin: 0.1,
    drawMax: 0.6,
  },

  // GDD §7.4 — personality
  style: {
    bookMaxPlies: 16,
    bookMinGames: 20,
    /** Solid players (many draws). */
    temperatureMin: 0.7,
    /** Combative players. */
    temperatureMax: 1.1,
    /** Trait shown on the card (GDD §7.2): decisiveness below → Sólido… */
    traitSolidBelow: 0.45,
    /** …at or above → Combativo; in between → Equilibrado. */
    traitCombativeFrom: 0.6,
  },

  // GDD §8.5 — game simulation. End rules chosen by `pnpm engine:endrules`
  // (docs/benchmarks.md, 2026-11-15): change them → re-measure engineCalibration.
  game: {
    /** engineCalibration was measured with this value: re-measure if it changes. */
    topP: 0.95,
    /** Full move number from which a draw by agreement is possible. */
    drawOfferFromMove: 30,
    /** Draw when the mover's expected score (win + draw/2) stays within 0.5 ± drawBand… */
    drawBand: 0.08,
    /** …for this many consecutive engine evaluations (plies). */
    drawStableMoves: 10,
    /** A side resigns when its expected score stays below resignProb… */
    resignProb: 0.1,
    /** …for this many of its own consecutive moves. */
    resignStableMoves: 6,
    /** Full move number before which nobody resigns (GDD §8.2); the streak still counts. */
    resignFromMove: 30,
    /**
     * Target draw rate between players of equal strength, by card strength,
     * piecewise-linear (GDD §8.5). ESTIMATE (user, 2026-11-14), to refine with
     * real Olympiad data in Phase 2. Used by `pnpm engine:endrules`.
     */
    drawTarget: [
      { strength: 2400, rate: 0.3 },
      { strength: 2550, rate: 0.4 },
      { strength: 2700, rate: 0.5 },
    ] satisfies DrawTargetPoint[],
    maxPlies: 250,
    /** At maxPlies, a side wins if its win probability is above this; otherwise draw. */
    adjudicateWinProb: 0.85,
    maiaModelVariant: "5m",
  },

  /**
   * GDD §8.1 — blunder check: Stockfish vetoes a sampled Maia move that
   * loses more winning chances than the tolerance for the mover's selfElo,
   * and the move is sampled again. Changes strength: re-measure
   * engineCalibration if any value changes.
   */
  blunderCheck: {
    /** Stockfish nodes per search (deterministic, one thread). */
    nodes: 5000,
    /** Samples checked before falling back to Stockfish's best move. */
    maxTries: 4,
    /**
     * Winning chances from centipawns, as on Lichess: 2 / (1 + e^(−k·cp)) − 1.
     * Lichess calls a drop of 0.1 an inaccuracy, 0.2 a mistake and 0.3 a blunder.
     */
    winChanceK: 0.00368208,
    /**
     * Tolerance by selfElo, piecewise-linear, clamped at the ends. Measured
     * with `engine:quality --analyse-nodes 100000` (docs/benchmarks.md):
     * 0.2 → ~0.5 blunders per player-game, ACPL ~28; 0.1 → ~0.4, ACPL ~22.
     */
    tolerance: [
      { selfElo: 600, maxDrop: 2 },
      { selfElo: 1800, maxDrop: 0.2 },
      { selfElo: 2600, maxDrop: 0.1 },
    ] satisfies BlunderTolerancePoint[],
  },

  /** GDD §8.3 — replay pace of the user's games in the Round screen. */
  playback: {
    /** Milliseconds per half-move at 1× and 4×; "instant" shows everything computed. */
    msPerPly: { normal: 700, fast: 175 },
    /** "Instant": how often to catch up with the moves computed by the worker. */
    instantPollMs: 50,
  },

  /**
   * Calibration grid: real strength (game rating) of Maia-3 5M per
   * (selfElo, temperature), measured by `pnpm engine:ladder --style-temps
   * 0.7,0.9,1.1` (17 600 games, top-p 0.95, draw/resign rules on,
   * 2026-11-14). Anchored so Maia 1500 at T=1 = 1500. Used by
   * engineParamsForRating (strength path) and engineParamsForStyle (style
   * compensation, GDD §7.2). Re-measure if the model or sampling changes.
   *
   * OUTDATED: measured without the Stockfish blunder check (blunderCheck
   * above), which makes the engine stronger. Re-run the ladder on a faster
   * machine, once, after the end-of-game rules (docs/plano-calibracao.md, Fase B).
   */
  engineCalibration: [
    { rating: 735, selfElo: 600, temperature: 1.3 },
    { rating: 885, selfElo: 600, temperature: 1.1 },
    { rating: 1075, selfElo: 800, temperature: 1.1 },
    { rating: 1200, selfElo: 1000, temperature: 1.1 },
    { rating: 1285, selfElo: 1200, temperature: 1.1 },
    { rating: 1405, selfElo: 1400, temperature: 1.1 },
    { rating: 1510, selfElo: 1600, temperature: 1.1 },
    { rating: 1585, selfElo: 1800, temperature: 1.1 },
    { rating: 1690, selfElo: 2000, temperature: 1.1 },
    { rating: 1745, selfElo: 2200, temperature: 1.1 },
    { rating: 1800, selfElo: 2400, temperature: 1.1 },
    { rating: 1840, selfElo: 2600, temperature: 1.1 },
    { rating: 940, selfElo: 600, temperature: 1 },
    { rating: 1125, selfElo: 800, temperature: 1 },
    { rating: 1250, selfElo: 1000, temperature: 1 },
    { rating: 1355, selfElo: 1200, temperature: 1 },
    { rating: 1445, selfElo: 1400, temperature: 1 },
    { rating: 1555, selfElo: 1600, temperature: 1 },
    { rating: 1645, selfElo: 1800, temperature: 1 },
    { rating: 1725, selfElo: 2000, temperature: 1 },
    { rating: 1790, selfElo: 2200, temperature: 1 },
    { rating: 1840, selfElo: 2400, temperature: 1 },
    { rating: 1885, selfElo: 2600, temperature: 1 },
    { rating: 980, selfElo: 600, temperature: 0.9 },
    { rating: 1155, selfElo: 800, temperature: 0.9 },
    { rating: 1310, selfElo: 1000, temperature: 0.9 },
    { rating: 1390, selfElo: 1200, temperature: 0.9 },
    { rating: 1495, selfElo: 1400, temperature: 0.9 },
    { rating: 1620, selfElo: 1600, temperature: 0.9 },
    { rating: 1670, selfElo: 1800, temperature: 0.9 },
    { rating: 1780, selfElo: 2000, temperature: 0.9 },
    { rating: 1855, selfElo: 2200, temperature: 0.9 },
    { rating: 1890, selfElo: 2400, temperature: 0.9 },
    { rating: 1930, selfElo: 2600, temperature: 0.9 },
    { rating: 1980, selfElo: 2600, temperature: 0.8 },
    { rating: 1070, selfElo: 600, temperature: 0.7 },
    { rating: 1265, selfElo: 800, temperature: 0.7 },
    { rating: 1375, selfElo: 1000, temperature: 0.7 },
    { rating: 1480, selfElo: 1200, temperature: 0.7 },
    { rating: 1595, selfElo: 1400, temperature: 0.7 },
    { rating: 1695, selfElo: 1600, temperature: 0.7 },
    { rating: 1760, selfElo: 1800, temperature: 0.7 },
    { rating: 1870, selfElo: 2000, temperature: 0.7 },
    { rating: 1885, selfElo: 2200, temperature: 0.7 },
    { rating: 1945, selfElo: 2400, temperature: 0.7 },
    { rating: 2005, selfElo: 2600, temperature: 0.7 },
    { rating: 2065, selfElo: 2600, temperature: 0.6 },
  ] satisfies EngineCalibrationPoint[],
} as const;

export type Balance = typeof balance;
