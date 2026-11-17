import type { Dataset } from "./dataset.ts";

/** Opening book bytes by `PlayerCard.bookFile` (GDD §7.1). */
export type BookSet = ReadonlyMap<string, Uint8Array>;

/** Distinct book files of the given cards (cards without a book are skipped). */
export function bookFilesFor(ds: Dataset, cardIds: Iterable<string>): string[] {
  const files = [...cardIds].map((id) => ds.card(id).bookFile);
  return [...new Set(files.filter((f): f is string => f !== null))].sort();
}

/**
 * Fetches the books of the cards in play, before the tournament (GDD §9.3).
 * A missing file is an error: silently playing without a book would make the
 * same `?seed=` produce different games.
 */
export async function loadBooks(
  ds: Dataset,
  cardIds: Iterable<string>,
  fetchFn: typeof fetch = fetch,
): Promise<BookSet> {
  const files = bookFilesFor(ds, cardIds);
  const entries = await Promise.all(
    files.map(async (file) => {
      const res = await fetchFn(ds.root + file);
      if (!res.ok) throw new Error(`Dataset: ${file} → HTTP ${res.status}`);
      return [file, new Uint8Array(await res.arrayBuffer())] as const;
    }),
  );
  return new Map(entries);
}
