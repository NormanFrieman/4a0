/**
 * Wikidata (CC0): de.wikipedia article → QID, and per QID the label, the
 * FIDE rating history (P1087 with point in time P585) and the chess titles
 * (P2962 with start time P580). Network access lives in fetch.ts; this module
 * only shapes the API answers into the cached form.
 */

export interface EloEntry {
  /** ISO date (YYYY-MM-DD) of the FIDE list. */
  date: string;
  rating: number;
}

export interface TitleEntry {
  qid: string;
  /** Year the title was awarded, when known. */
  year: number | null;
}

/** Cached form of one person (`tools/data/cache/entities/{qid}.json`). */
export interface PersonEntity {
  qid: string;
  lastrevid: number;
  labels: { pt?: string; en?: string };
  /** Occupation (P106) includes chess player. */
  chessPlayer: boolean;
  elo: EloEntry[];
  titles: TitleEntry[];
}

/** Occupation "chess player" (P106). */
export const CHESS_PLAYER = "Q10873124";

/** Chess titles (P2962) that a card can show, strongest first. */
export const TITLE_RANK: readonly { qid: string; title: string }[] = [
  { qid: "Q105269", title: "GM" }, // Grandmaster
  { qid: "Q752119", title: "IM" }, // International Master
  { qid: "Q1049520", title: "FM" }, // FIDE Master
  { qid: "Q1973600", title: "CM" }, // Candidate Master
];

interface Snak {
  snaktype: string;
  datavalue?: { value: unknown };
}
interface Claim {
  mainsnak: Snak;
  rank: string;
  qualifiers?: Record<string, Snak[]>;
}
export interface ApiEntity {
  id: string;
  lastrevid: number;
  missing?: string;
  labels?: Record<string, { value: string }>;
  claims?: Record<string, Claim[]>;
}

/** `+1980-07-01T00:00:00Z` → `1980-07-01`; `+1970-00-00…` → `1970-01-01`. */
function isoDate(time: string): string {
  const m = /^\+(\d{4})-(\d{2})-(\d{2})/.exec(time);
  if (!m) throw new Error(`Bad Wikidata time ${time}`);
  return `${m[1]}-${m[2] === "00" ? "01" : m[2]}-${m[3] === "00" ? "01" : m[3]}`;
}

function qualifierTime(c: Claim, prop: string): string | null {
  const v = c.qualifiers?.[prop]?.[0]?.datavalue?.value as { time?: string } | undefined;
  return v?.time ?? null;
}

export function toPersonEntity(e: ApiEntity): PersonEntity {
  const claims = (p: string) =>
    (e.claims?.[p] ?? []).filter((c) => c.rank !== "deprecated" && c.mainsnak.datavalue);
  const elo = claims("P1087").flatMap((c): EloEntry[] => {
    const time = qualifierTime(c, "P585");
    if (!time) return [];
    const { amount } = c.mainsnak.datavalue!.value as { amount: string };
    return [{ date: isoDate(time), rating: Number(amount) }];
  });
  elo.sort((a, b) => a.date.localeCompare(b.date));
  const titles = claims("P2962").map((c): TitleEntry => {
    const time = qualifierTime(c, "P580");
    return {
      qid: (c.mainsnak.datavalue!.value as { id: string }).id,
      year: time ? Number(time.slice(1, 5)) : null,
    };
  });
  const chessPlayer = claims("P106").some(
    (c) => (c.mainsnak.datavalue!.value as { id: string }).id === CHESS_PLAYER,
  );
  const label = (lang: string) => e.labels?.[lang]?.value;
  return {
    qid: e.id,
    lastrevid: e.lastrevid,
    labels: {
      ...(label("pt") ? { pt: label("pt") } : {}),
      ...(label("en") ? { en: label("en") } : {}),
    },
    chessPlayer,
    elo,
    titles,
  };
}
