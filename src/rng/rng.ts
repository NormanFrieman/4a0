/** A random number generator returning floats in [0, 1). */
export type Rng = () => number;

/** Hash an arbitrary string or number into a 32-bit seed (FNV-1a). */
export function hashSeed(seed: string | number): number {
  const s = String(seed);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * sfc32 PRNG seeded from a string or number. Deterministic across platforms,
 * so the same seed always reproduces the same game.
 */
export function createRng(seed: string | number): Rng {
  let a = hashSeed(`${seed}:a`);
  let b = hashSeed(`${seed}:b`);
  let c = hashSeed(`${seed}:c`);
  let d = 1;
  const next = (): number => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
  // Discard the first outputs to mix the state.
  for (let i = 0; i < 12; i++) next();
  return next;
}

/** Derive an independent child RNG (e.g. one per board or per side). */
export function deriveRng(seed: string | number, label: string): Rng {
  return createRng(`${seed}/${label}`);
}
