/**
 * Field draw (GDD §5.1), simplified for small datasets: teams are drawn in
 * seeded random order, at most `fieldMaxPerCountry` per country. A field team
 * never fields a person the user picked: their real reserve plays instead.
 * TODO(Phase 2): strength tiers and minimum champions once the full dataset
 * exists (fieldTiers, fieldMinChampions).
 */
import { balance } from "../config/balance.ts";
import { avgStrength } from "../data/cardStrength.ts";
import type { Dataset } from "../data/dataset.ts";
import { deriveRng } from "../rng/rng.ts";
import type { Entrant } from "./types.ts";

export function buildField(
  ds: Dataset,
  seed: string,
  userCardIds: readonly string[],
  size: number,
): Entrant[] {
  const userPersons = new Set(userCardIds.map((id) => ds.card(id).personId));
  const rng = deriveRng(seed, "field");
  const order = ds.teams
    .map((t) => ({ t, key: rng() }))
    .sort((a, b) => a.key - b.key)
    .map(({ t }) => t);

  const perCountry = new Map<string, number>();
  const field: Entrant[] = [];
  for (const t of order) {
    if (field.length === size) break;
    if ((perCountry.get(t.countryCode) ?? 0) >= balance.tournament.fieldMaxPerCountry) continue;
    const cardIds = t.cardIds.filter((id) => !userPersons.has(ds.card(id).personId));
    if (cardIds.length < 4) continue;
    perCountry.set(t.countryCode, (perCountry.get(t.countryCode) ?? 0) + 1);
    field.push({
      id: t.id,
      isUser: false,
      cardIds,
      avgStrength: avgStrength(cardIds.map((id) => ds.card(id).strength)),
    });
  }
  if (field.length < size) throw new Error(`Field: only ${field.length} of ${size} teams`);
  return field;
}
