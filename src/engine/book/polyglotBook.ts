import type { BookEntry, OpeningBook } from "../game.ts";
import { polyglotKey } from "./polyglotKey.ts";
import { decodePolyglotMove } from "./polyglotMove.ts";

/** Polyglot entries are 16 bytes: key u64, move u16, weight u16, learn u32 (big-endian). */
export const POLYGLOT_ENTRY_BYTES = 16;

/**
 * Read-only Polyglot book over raw bytes (GDD §7.1). No upfront parsing:
 * `probe` binary-searches the key-sorted entries.
 */
export class PolyglotBook implements OpeningBook {
  private readonly view: DataView;
  readonly size: number;

  constructor(bytes: Uint8Array) {
    if (bytes.byteLength % POLYGLOT_ENTRY_BYTES !== 0) {
      throw new Error(`polyglot: size ${bytes.byteLength} is not a multiple of 16`);
    }
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.size = bytes.byteLength / POLYGLOT_ENTRY_BYTES;
  }

  private keyAt(i: number): bigint {
    return this.view.getBigUint64(i * POLYGLOT_ENTRY_BYTES);
  }

  /** Weighted moves for `fen`, in file order (deterministic), or null if out of book. */
  probe(fen: string): BookEntry | null {
    const key = polyglotKey(fen);
    let lo = 0;
    let hi = this.size;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.keyAt(mid) < key) lo = mid + 1;
      else hi = mid;
    }
    const moves: Array<readonly [string, number]> = [];
    for (let i = lo; i < this.size && this.keyAt(i) === key; i++) {
      const offset = i * POLYGLOT_ENTRY_BYTES;
      const weight = this.view.getUint16(offset + 10);
      if (weight > 0) {
        moves.push([decodePolyglotMove(this.view.getUint16(offset + 8), fen), weight]);
      }
    }
    return moves.length > 0 ? moves : null;
  }
}
