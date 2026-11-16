import { balance } from "../config/balance.ts";
import type {
  DatasetIndex,
  NationalTeam,
  Olympiad,
  OlympiadFile,
  Person,
  PlayerCard,
} from "./types.ts";

/** A loaded dataset with lookups by id. */
export interface Dataset {
  /** URL of the dataset folder (ends with "/"); relative files like `bookFile` resolve against it. */
  root: string;
  index: DatasetIndex;
  teams: NationalTeam[];
  team(id: string): NationalTeam;
  card(id: string): PlayerCard;
  person(id: string): Person;
  olympiad(year: number): Olympiad;
}

function lookup<T>(map: Map<string | number, T>, kind: string) {
  return (id: string | number): T => {
    const v = map.get(id);
    if (!v) throw new Error(`Dataset: unknown ${kind} ${id}`);
    return v;
  };
}

/** Builds lookups and checks references (GDD §4.1: one card per board, boards 1–4). */
export function assembleDataset(
  index: DatasetIndex,
  persons: Person[],
  files: OlympiadFile[],
  root = "",
): Dataset {
  const cards = new Map(files.flatMap((f) => f.cards).map((c) => [c.id, c] as const));
  const personMap = new Map(persons.map((p) => [p.id, p] as const));
  const olympiads = new Map(index.olympiads.map((o) => [o.year, o] as const));
  for (const t of index.teams) {
    if (t.cardIds.length !== balance.draft.slots)
      throw new Error(`Dataset: team ${t.id} needs ${balance.draft.slots} cards`);
    if (!olympiads.has(t.year)) throw new Error(`Dataset: team ${t.id} has no olympiad`);
    for (const id of t.cardIds) {
      const c = cards.get(id);
      if (!c) throw new Error(`Dataset: team ${t.id} references missing card ${id}`);
      if (!personMap.has(c.personId)) throw new Error(`Dataset: card ${id} has no person`);
    }
  }
  return {
    root,
    index,
    teams: index.teams,
    team: lookup(new Map(index.teams.map((t) => [t.id, t] as const)), "team"),
    card: lookup(cards, "card"),
    person: lookup(personMap, "person"),
    olympiad: lookup(olympiads, "olympiad"),
  };
}

/** Fetches a published dataset from `public/data/{name}/` (GDD §9.3). */
export async function loadDataset(name: string, base = import.meta.env.BASE_URL): Promise<Dataset> {
  const root = `${base}data/${name}/`;
  const get = async <T>(file: string): Promise<T> => {
    const res = await fetch(root + file);
    if (!res.ok) throw new Error(`Dataset: ${file} → HTTP ${res.status}`);
    return (await res.json()) as T;
  };
  const index = await get<DatasetIndex>("index.json");
  const [persons, files] = await Promise.all([
    get<Person[]>("persons.json"),
    Promise.all(index.olympiads.map((o) => get<OlympiadFile>(`olympiads/${o.year}.json`))),
  ]);
  return assembleDataset(index, persons, files, root);
}
