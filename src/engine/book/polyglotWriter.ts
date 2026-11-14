import { POLYGLOT_ENTRY_BYTES } from "./polyglotBook.ts";

export interface PolyglotEntry {
  key: bigint;
  /** Polyglot-encoded move (see `encodePolyglotMove`). */
  move: number;
  /** Any positive weight, e.g. a frequency; scaled to u16 per position. */
  weight: number;
}

const MAX_WEIGHT = 0xffff;

/**
 * Serialize entries as a Polyglot book: sorted by key, then weight desc, then
 * move. Weights are scaled per position only if they overflow u16, keeping
 * their proportions (a move never drops to 0).
 */
export function writePolyglot(entries: readonly PolyglotEntry[]): Uint8Array {
  const byKey = new Map<bigint, PolyglotEntry[]>();
  for (const e of entries) {
    if (!(e.weight > 0)) continue;
    const list = byKey.get(e.key);
    if (list) list.push(e);
    else byKey.set(e.key, [e]);
  }

  const rows: PolyglotEntry[] = [];
  for (const list of byKey.values()) {
    const max = Math.max(...list.map((e) => e.weight));
    const scale = max > MAX_WEIGHT ? MAX_WEIGHT / max : 1;
    for (const e of list) {
      rows.push({ ...e, weight: Math.max(1, Math.round(e.weight * scale)) });
    }
  }
  rows.sort((a, b) =>
    a.key !== b.key ? (a.key < b.key ? -1 : 1) : b.weight - a.weight || a.move - b.move,
  );

  const bytes = new Uint8Array(rows.length * POLYGLOT_ENTRY_BYTES);
  const view = new DataView(bytes.buffer);
  rows.forEach((r, i) => {
    const o = i * POLYGLOT_ENTRY_BYTES;
    view.setBigUint64(o, r.key);
    view.setUint16(o + 8, r.move);
    view.setUint16(o + 10, r.weight);
    view.setUint32(o + 12, 0);
  });
  return bytes;
}
