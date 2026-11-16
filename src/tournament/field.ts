/**
 * Field draw (GDD §5.1), simplified for small datasets: teams are drawn in
 * seeded random order, at most `fieldMaxPerCountry` per country. A field team
 * keeps a person the user picked: the same player can face themselves.
 * TODO(Phase 2): strength tiers and minimum champions once the full dataset
 * exists (fieldTiers, fieldMinChampions).
 */
import { balance } from "../config/balance.ts";
import type { Dataset } from "../data/dataset.ts";
import { deriveRng } from "../rng/rng.ts";
import type { Entrant } from "./types.ts";

export function buildField(ds: Dataset, seed: string, size: number): Entrant[] {
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
    perCountry.set(t.countryCode, (perCountry.get(t.countryCode) ?? 0) + 1);
    field.push({
      id: t.id,
      isUser: false,
      cardIds: [...t.cardIds],
      avgStrength: t.avgStrength,
    });
  }
  if (field.length < size) throw new Error(`Field: only ${field.length} of ${size} teams`);
  return field;
}
