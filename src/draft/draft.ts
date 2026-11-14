/**
 * Draft (GDD §4): 5 weighted rolls, one card per roll into the slot of the
 * board it played in the real edition, limited rerolls. Pure and
 * deterministic: roll n uses deriveRng(seed, "draft/roll/n").
 */
import { balance } from "../config/balance.ts";
import type { Dataset } from "../data/dataset.ts";
import { deriveRng, type Rng } from "../rng/rng.ts";

export interface DraftState {
  seed: string;
  /** Rolls drawn so far (including rerolled ones). */
  rollsDrawn: number;
  /** Teams already shown in this draft: never shown again (GDD §4.1). */
  seenTeamIds: string[];
  /** Team of the current roll, or null when the draft is complete. */
  currentTeamId: string | null;
  rerollsLeft: number;
  /** Card id per slot (boards 1–4, then reserve). */
  slots: (string | null)[];
}

export interface DraftOptions {
  rerolls?: number;
}

function pickWeighted<T>(items: readonly T[], weight: (t: T) => number, rng: Rng): T {
  const total = items.reduce((s, t) => s + weight(t), 0);
  let r = rng() * total;
  for (const t of items) {
    r -= weight(t);
    if (r < 0) return t;
  }
  return items[items.length - 1]!;
}

const takenPersons = (ds: Dataset, s: DraftState) =>
  new Set(s.slots.filter((c): c is string => c !== null).map((c) => ds.card(c).personId));

/**
 * The only slot a card can take (GDD §4.3): the board it played in the real
 * edition; real reserves (board 5+) go to the reserve slot.
 */
export const slotForCard = (ds: Dataset, cardId: string): number =>
  Math.min(ds.card(cardId).board, balance.draft.slots) - 1;

/** Person not on the team yet and the card's slot still free. */
function canPick(ds: Dataset, s: DraftState, taken: Set<string>, cardId: string): boolean {
  return !taken.has(ds.card(cardId).personId) && s.slots[slotForCard(ds, cardId)] === null;
}

/** Cards of the current roll that can still be picked. */
export function pickableCards(ds: Dataset, s: DraftState): string[] {
  if (!s.currentTeamId) return [];
  const taken = takenPersons(ds, s);
  return ds.team(s.currentTeamId).cardIds.filter((id) => canPick(ds, s, taken, id));
}

function drawRoll(ds: Dataset, s: DraftState): DraftState {
  const taken = takenPersons(ds, s);
  const candidates = ds.teams.filter(
    (t) => !s.seenTeamIds.includes(t.id) && t.cardIds.some((id) => canPick(ds, s, taken, id)),
  );
  if (candidates.length === 0) throw new Error("Draft: no teams left to roll");
  const team = pickWeighted(
    candidates,
    (t) => t.rollWeight,
    deriveRng(s.seed, `draft/roll/${s.rollsDrawn}`),
  );
  return {
    ...s,
    rollsDrawn: s.rollsDrawn + 1,
    seenTeamIds: [...s.seenTeamIds, team.id],
    currentTeamId: team.id,
  };
}

export function createDraft(ds: Dataset, seed: string, opts: DraftOptions = {}): DraftState {
  return drawRoll(ds, {
    seed,
    rollsDrawn: 0,
    seenTeamIds: [],
    currentTeamId: null,
    rerollsLeft: opts.rerolls ?? balance.draft.rerollsPerDraft,
    slots: Array.from({ length: balance.draft.slots }, () => null),
  });
}

export const isDraftComplete = (s: DraftState) => s.slots.every((c) => c !== null);

/** Puts a card of the current roll into its slot, then rolls again. */
export function pick(ds: Dataset, s: DraftState, cardId: string, slot: number): DraftState {
  if (!pickableCards(ds, s).includes(cardId)) throw new Error("Draft: card not pickable");
  if (slot !== slotForCard(ds, cardId)) throw new Error("Draft: card belongs to another slot");
  const next = { ...s, slots: s.slots.map((c, i) => (i === slot ? cardId : c)) };
  return isDraftComplete(next) ? { ...next, currentTeamId: null } : drawRoll(ds, next);
}

export function reroll(ds: Dataset, s: DraftState): DraftState {
  if (s.rerollsLeft <= 0 || !s.currentTeamId) throw new Error("Draft: no rerolls left");
  return drawRoll(ds, { ...s, rerollsLeft: s.rerollsLeft - 1 });
}
