/**
 * Field draw (GDD §5.1). Teams are sorted by average strength and cut into
 * three tiers (elite, middle, weak) at `tierQuantiles`; each tier contributes
 * a fixed number of teams, drawn uniformly with the session seed. The elite
 * always holds at least `minChampions` teams that won their edition, and no
 * country has more than `maxPerCountry` teams in the whole field. A field team
 * keeps a person the user picked: the same player can face themselves.
 */
import { balance } from "../config/balance.ts";
import type { Dataset } from "../data/dataset.ts";
import type { NationalTeam as Team } from "../data/types.ts";
import { deriveRng, type Rng } from "../rng/rng.ts";
import type { Entrant } from "./types.ts";

export type Tier = "elite" | "middle" | "weak";

export interface FieldConfig {
  tiers: Readonly<Record<Tier, number>>;
  /** Cuts between elite/middle and middle/weak, as fractions of the sorted set. */
  tierQuantiles: readonly [number, number];
  minChampions: number;
  maxPerCountry: number;
}

type FieldBalance = {
  fieldTiers: Readonly<Record<Tier, number>>;
  fieldTierQuantiles: readonly [number, number];
  fieldMinChampions: number;
  fieldMaxPerCountry: number;
};

export function fieldConfig(b: FieldBalance = balance.tournament): FieldConfig {
  return {
    tiers: b.fieldTiers,
    tierQuantiles: b.fieldTierQuantiles,
    minChampions: b.fieldMinChampions,
    maxPerCountry: b.fieldMaxPerCountry,
  };
}

export const fieldSizeOf = (cfg: FieldConfig) =>
  cfg.tiers.elite + cfg.tiers.middle + cfg.tiers.weak;

/** Teams sorted strongest first (ties by id) and cut into tiers. */
export function tiersOf(
  teams: readonly Team[],
  quantiles: readonly [number, number],
): Record<Tier, Team[]> {
  const sorted = [...teams].sort(
    (a, b) => b.avgStrength - a.avgStrength || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  const cut1 = Math.floor(sorted.length * quantiles[0]);
  const cut2 = Math.floor(sorted.length * quantiles[1]);
  return {
    elite: sorted.slice(0, cut1),
    middle: sorted.slice(cut1, cut2),
    weak: sorted.slice(cut2),
  };
}

/** Where a tier borrows teams when it runs short (small datasets only). */
const FALLBACK: Record<Tier, Tier[]> = {
  elite: ["elite", "middle", "weak"],
  middle: ["middle", "elite", "weak"],
  weak: ["weak", "middle", "elite"],
};

function shuffled<T>(list: readonly T[], rng: Rng): T[] {
  return list
    .map((x) => ({ x, key: rng() }))
    .sort((a, b) => a.key - b.key)
    .map(({ x }) => x);
}

export function buildField(ds: Dataset, seed: string, cfg: FieldConfig): Entrant[] {
  const rng = deriveRng(seed, "field");
  const raw = tiersOf(ds.teams, cfg.tierQuantiles);
  const pools: Record<Tier, Team[]> = {
    elite: shuffled(raw.elite, rng),
    middle: shuffled(raw.middle, rng),
    weak: shuffled(raw.weak, rng),
  };

  const taken = new Set<string>();
  const perCountry = new Map<string, number>();
  const field: Team[] = [];
  const fits = (t: Team) =>
    !taken.has(t.id) && (perCountry.get(t.countryCode) ?? 0) < cfg.maxPerCountry;
  const take = (t: Team) => {
    taken.add(t.id);
    perCountry.set(t.countryCode, (perCountry.get(t.countryCode) ?? 0) + 1);
    field.push(t);
  };

  // Champions first: they take elite slots.
  let champions = 0;
  for (const t of pools.elite) {
    if (champions === Math.min(cfg.minChampions, cfg.tiers.elite)) break;
    if (t.finalRank === 1 && fits(t)) {
      take(t);
      champions++;
    }
  }
  if (champions < cfg.minChampions)
    throw new Error(`Field: only ${champions} of ${cfg.minChampions} champions in the elite`);

  const filled: Record<Tier, number> = { elite: champions, middle: 0, weak: 0 };
  for (const tier of ["elite", "middle", "weak"] as const)
    for (const source of FALLBACK[tier])
      for (const t of pools[source]) {
        if (filled[tier] === cfg.tiers[tier]) break;
        if (!fits(t)) continue;
        take(t);
        filled[tier]++;
      }

  const size = fieldSizeOf(cfg);
  if (field.length < size) throw new Error(`Field: only ${field.length} of ${size} teams`);
  return field.map((t) => ({
    id: t.id,
    isUser: false,
    cardIds: [...t.cardIds],
    avgStrength: t.avgStrength,
  }));
}
