export interface PairResult {
  a: string;
  b: string;
  /** Score of `a`: 1, 0.5 or 0. */
  scoreA: number;
}

const expected = (ra: number, rb: number) => 1 / (1 + 10 ** ((rb - ra) / 400));

/**
 * Maximum-likelihood Elo ratings (Bradley–Terry on the Elo scale, draws as
 * half points) from a set of game results. One virtual draw per distinct
 * pair keeps ratings finite when a pair is 100%–0%.
 *
 * Ratings are only defined up to a constant; the result is shifted so the
 * mean over `anchorNodes` equals `anchorMean`.
 */
export function fitElo(
  games: PairResult[],
  anchor: { nodes: string[]; mean: number },
  iterations = 500,
): Record<string, number> {
  const nodes = new Set<string>();
  const pairs = new Set<string>();
  const data: PairResult[] = [...games];
  for (const g of games) {
    nodes.add(g.a);
    nodes.add(g.b);
    const key = [g.a, g.b].sort().join("|");
    if (!pairs.has(key)) {
      pairs.add(key);
      data.push({ a: g.a, b: g.b, scoreA: 0.5 });
    }
  }
  const r: Record<string, number> = {};
  for (const n of nodes) r[n] = 0;

  const k = Math.log(10) / 400;
  for (let it = 0; it < iterations; it++) {
    const grad: Record<string, number> = {};
    const hess: Record<string, number> = {};
    for (const n of nodes) grad[n] = hess[n] = 0;
    for (const g of data) {
      const e = expected(r[g.a]!, r[g.b]!);
      grad[g.a]! += g.scoreA - e;
      grad[g.b]! -= g.scoreA - e;
      hess[g.a]! += e * (1 - e);
      hess[g.b]! += e * (1 - e);
    }
    let maxStep = 0;
    for (const n of nodes) {
      // Diagonal Newton step, damped.
      const step = (0.5 * grad[n]!) / (k * Math.max(hess[n]!, 1e-9));
      r[n]! += step;
      maxStep = Math.max(maxStep, Math.abs(step));
    }
    if (maxStep < 1e-4) break;
  }

  const anchors = anchor.nodes.filter((n) => n in r);
  const shift =
    anchors.length > 0 ? anchor.mean - anchors.reduce((s, n) => s + r[n]!, 0) / anchors.length : 0;
  for (const n of nodes) r[n]! += shift;
  return r;
}
