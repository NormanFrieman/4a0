/**
 * The 4 cards that play a round (GDD §4.3): fixed order, the resting card
 * leaves and the others keep their relative order.
 */
export function lineupFor(cardIds: readonly string[], restingId?: string | null): string[] {
  const playing = restingId ? cardIds.filter((id) => id !== restingId) : [...cardIds];
  if (playing.length < 4) throw new Error("Lineup: fewer than 4 cards");
  return playing.slice(0, 4);
}

/** Default resting card: the reserve, i.e. the 5th card (GDD §5.4). */
export const defaultResting = (cardIds: readonly string[]) => cardIds[4] ?? null;
