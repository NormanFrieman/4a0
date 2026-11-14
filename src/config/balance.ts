/**
 * All balancing numbers live here (GDD §0). Game logic must read from this
 * object, never hardcode values. Initial values come from the GDD tables.
 */

export interface SchoolTier {
  level: number;
  startRatingMin: number;
  startRatingMax: number;
  potentialMax: number;
}

/** One point of the game-rating → engine-parameters curve. */
export interface EngineCalibrationPoint {
  /** Game rating (real strength, Elo-like scale). */
  rating: number;
  /** Maia-3 selfElo input (600–2600). */
  selfElo: number;
  /** Sampling temperature. */
  temperature: number;
}

export const balance = {
  // GDD §4.4 — chess players. Game ratings are on the calibrated real-strength
  // scale (Maia 1500 @ T=1 = 1500), see docs/benchmarks.md.
  ratingMin: 800,
  ratingMax: 2050,
  /** "Não sei" answer in the human calibration (GDD §5.1). */
  calibrationDefaultRating: 1200,
  fatigueMax: 100,
  fatigueMaxPenalty: 100,
  fatiguePerGame: 15,
  fatigueRecoveryPerHour: 10,
  /**
   * Style (GDD §4.2) — PENDING REBALANCE: temperature now encodes strength
   * (engineCalibration), and 0.6 vs 1.1 was worth ~250 rating points. Not
   * applied anywhere until the Style design is decided.
   */
  temperatureSolid: 0.6,
  temperatureCreative: 1.1,
  /** top-p used by the move sampler. Not in the GDD tables yet; 1.0 = disabled. */
  topPDefault: 1.0,

  // GDD §6.6 — attack and defense
  matchmakingWindow: 100,
  sameTargetCooldownHours: 24,
  lootRate: 0.2,
  lootWinBonus: 0.25,
  timeControl: { baseSeconds: 300, incrementSeconds: 3 },
  maxPlies: 300,
  adjudicateWinProb: 0.9,
  disconnectGraceSeconds: 60,
  shieldHoursOnLoss: 12,

  // GDD §7.3 — capture
  captureChance: 0.25,
  captiveHours: 72,
  ransomCoinsPerRating: 10,
  captureShieldHours: 72,
  minRosterSize: 4,

  // GDD §8.4 — recruitment ranges by Chess School level
  schoolTiers: [
    { level: 1, startRatingMin: 800, startRatingMax: 1000, potentialMax: 1250 },
    { level: 2, startRatingMin: 925, startRatingMax: 1100, potentialMax: 1425 },
    { level: 3, startRatingMin: 1050, startRatingMax: 1250, potentialMax: 1600 },
    { level: 4, startRatingMin: 1175, startRatingMax: 1375, potentialMax: 1800 },
    { level: 5, startRatingMin: 1300, startRatingMax: 1500, potentialMax: 2050 },
  ] satisfies SchoolTier[],

  // GDD §8.4 — starting city
  startingCity: {
    rosterSize: 4,
    rosterRatingMin: 850,
    rosterRatingMax: 1000,
  },

  /**
   * Game rating → Maia-3 parameters, measured by the 5M calibration ladder
   * (pnpm engine:ladder, 5000 games, 2026-11-12). Piecewise-linear between
   * points. Below selfElo 600 and above 2600 strength comes from temperature.
   * Re-measure if the model or sampling changes.
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

  // Simulated think time (GDD §6.4). Engine-side tuning, not in GDD tables.
  thinkTime: {
    /** Plies treated as "opening" (faster moves). */
    openingPlies: 16,
    openingSeconds: 1.5,
    baseSeconds: 4,
    /** Extra seconds when the top move probability is low (scattered policy). */
    uncertaintyExtraSeconds: 10,
    /** Never spend more than this fraction of the remaining clock on one move. */
    maxClockFraction: 0.1,
    /** Relative random jitter (± fraction). */
    jitter: 0.35,
    minSeconds: 0.3,
  },

  features: {
    capture: false,
  },
} as const;

export type Balance = typeof balance;
