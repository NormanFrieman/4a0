/**
 * Game modes (GDD §4.2, §10): Clássico shows playing strength; Mestre hides
 * it until the tournament is over. The mode never enters a draw: the same
 * `?seed=` gives the same draft and field in both modes.
 */
export type Mode = "classic" | "master";

const MASTER_PARAM = "mestre";

/** Mode from the `?modo=` URL parameter. */
export const parseMode = (param: string | null): Mode =>
  param === MASTER_PARAM ? "master" : "classic";

/** Value of `?modo=`; null means no parameter (Clássico). */
export const modeParam = (mode: Mode): string | null => (mode === "master" ? MASTER_PARAM : null);

/**
 * Whether screens may show playing strength. The one rule for every screen:
 * always in Clássico; in Mestre only on the final result and on replays
 * opened from it.
 */
export function showStrength(mode: Mode, phase: string, replayFrom: string | null): boolean {
  if (mode === "classic") return true;
  return phase === "final" || (phase === "replay" && replayFrom === "final");
}

/**
 * Whether screens may show the evaluation bar and move marks (GDD §8.6):
 * only in Clássico. Mestre shows just the board, even after the tournament.
 */
export const showAnalysis = (mode: Mode): boolean => mode === "classic";
