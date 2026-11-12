export interface SampleOptions {
  temperature: number;
  topP: number;
  rng: () => number;
}

/**
 * Turn a raw policy into the distribution actually sampled from:
 * p_i^(1/T), renormalized, then truncated to the smallest top set whose mass
 * reaches `topP`. Entries are ordered by probability desc, UCI asc, so the
 * result never depends on object key order.
 */
export function shapePolicy(
  policy: Record<string, number>,
  temperature: number,
  topP: number,
): Array<[string, number]> {
  const entries = Object.entries(policy)
    .filter(([, p]) => p > 0 && Number.isFinite(p))
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  if (entries.length === 0) throw new Error("shapePolicy: empty policy");

  // Temperature → 0 degenerates to the top move.
  if (temperature <= 1e-6) return [[entries[0]![0], 1]];

  // Work in log space to avoid underflow at low temperatures.
  const invT = 1 / temperature;
  const maxLog = Math.log(entries[0]![1]);
  let weighted = entries.map(([m, p]): [string, number] => [m, Math.exp((Math.log(p) - maxLog) * invT)]);
  let total = weighted.reduce((s, [, w]) => s + w, 0);
  weighted = weighted.map(([m, w]) => [m, w / total]);

  if (topP < 1) {
    const kept: Array<[string, number]> = [];
    let cum = 0;
    for (const e of weighted) {
      kept.push(e);
      cum += e[1];
      if (cum >= topP - 1e-9) break;
    }
    total = cum;
    weighted = kept.map(([m, w]) => [m, w / total]);
  }
  return weighted;
}

/** Sample a move from the policy with the given seeded RNG. */
export function sampleMove(policy: Record<string, number>, opts: SampleOptions): string {
  const dist = shapePolicy(policy, opts.temperature, opts.topP);
  const r = opts.rng();
  let cum = 0;
  for (const [move, p] of dist) {
    cum += p;
    if (r < cum) return move;
  }
  return dist[dist.length - 1]![0];
}
