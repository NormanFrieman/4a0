/**
 * Game modes (GDD §4.2, §10): Clássico shows playing strength; Almanaque hides
 * it until the tournament is over. The mode never enters a draw: the same
 * `?seed=` gives the same draft and field in both modes.
 */
export type Mode = "classic" | "almanac";

const ALMANAC_PARAM = "almanaque";

/** Mode from the `?modo=` URL parameter. */
export const parseMode = (param: string | null): Mode =>
  param === ALMANAC_PARAM ? "almanac" : "classic";

/** Value of `?modo=`; null means no parameter (Clássico). */
export const modeParam = (mode: Mode): string | null => (mode === "almanac" ? ALMANAC_PARAM : null);

/**
 * Whether screens may show playing strength. The one rule for every screen:
 * always in Clássico; in Almanaque only on the final result and on replays
 * opened from it.
 */
export function showStrength(mode: Mode, phase: string, replayFrom: string | null): boolean {
  if (mode === "classic") return true;
  return phase === "final" || (phase === "replay" && replayFrom === "final");
}
