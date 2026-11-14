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

export const balance = {
  // GDD §4.5 — draft
  draft: {
    /** 4 boards + 1 reserve. */
    slots: 5,
    rerollsPerDraft: 3,
    rollWeightTop10: 3,
    allowFinalReorder: true,
  },

  // GDD §5.5 — tournament
  tournament: {
    rounds: 7,
    /** Historical teams besides the user's. */
    fieldSize: 23,
    fieldTiers: { elite: 6, middle: 9, weak: 8 },
    fieldMinChampions: 3,
    fieldMaxPerCountry: 2,
    matchPoints: { win: 2, draw: 1, loss: 0 },
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
  },

  // GDD §8.5 — game simulation
  game: {
    /**
     * NOTE: engineCalibration was measured with top-p 1.0. Re-measure with
     * `pnpm engine:ladder` after changing this (migration step 6).
     */
    topP: 0.95,
    /** Full move number from which a draw by agreement is possible. */
    drawOfferFromMove: 30,
    /** Draw when the mover's expected score (win + draw/2) stays within 0.5 ± drawBand… */
    drawBand: 0.08,
    /** …for this many consecutive engine evaluations (plies). */
    drawStableMoves: 10,
    /** A side resigns when its expected score stays below resignProb… */
    resignProb: 0.05,
    /** …for this many of its own consecutive moves. */
    resignStableMoves: 6,
    maxPlies: 250,
    /** At maxPlies, a side wins if its win probability is above this; otherwise draw. */
    adjudicateWinProb: 0.85,
    maiaModelVariant: "5m",
  },

  /**
   * Game rating → Maia-3 parameters, measured by the 5M calibration ladder
   * (pnpm engine:ladder, 5000 games, top-p 1.0, 2026-11-12). Piecewise-linear
   * between points. Below selfElo 600 and above 2600 strength comes from
   * temperature. Re-measure if the model or sampling changes.
   */
  engineCalibration: [
    { rating: 770, selfElo: 600, temperature: 1.3 },
    { rating: 965, selfElo: 600, temperature: 1.0 },
    { rating: 1125, selfElo: 800, temperature: 1.0 },
    { rating: 1255, selfElo: 1000, temperature: 1.0 },
    { rating: 1370, selfElo: 1200, temperature: 1.0 },
    { rating: 1465, selfElo: 1400, temperature: 1.0 },
    { rating: 1535, selfElo: 1600, temperature: 1.0 },
    { rating: 1630, selfElo: 1800, temperature: 1.0 },
    { rating: 1710, selfElo: 2000, temperature: 1.0 },
    { rating: 1780, selfElo: 2200, temperature: 1.0 },
    { rating: 1850, selfElo: 2400, temperature: 1.0 },
    { rating: 1870, selfElo: 2600, temperature: 1.0 },
    { rating: 1995, selfElo: 2600, temperature: 0.8 },
    { rating: 2065, selfElo: 2600, temperature: 0.6 },
  ] satisfies EngineCalibrationPoint[],
} as const;

export type Balance = typeof balance;
