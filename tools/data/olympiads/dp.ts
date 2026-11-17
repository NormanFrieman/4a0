/**
 * FIDE conversion table p → dp (FIDE Rating Regulations, table 8.1a): the
 * rating difference that corresponds to a score fraction p, for p ≥ 0.50.
 * A constant of the FIDE formula, not a game balance number.
 */
// prettier-ignore
const DP_FROM_50: readonly number[] = [
  0, 7, 14, 21, 29, 36, 43, 50, 57, 65, // .50–.59
  72, 80, 87, 95, 102, 110, 117, 125, 133, 141, // .60–.69
  149, 158, 166, 175, 184, 193, 202, 211, 220, 230, // .70–.79
  240, 251, 262, 273, 284, 296, 309, 322, 336, 351, // .80–.89
  366, 383, 401, 422, 444, 470, 501, 538, 589, 677, // .90–.99
  800, // 1.00
];

/** dp for a score fraction p in [0, 1], p rounded to two decimals. */
export function dp(p: number): number {
  if (!(p >= 0 && p <= 1)) throw new Error(`dp: p out of range: ${p}`);
  const hundredths = Math.round(p * 100);
  if (hundredths >= 50) return DP_FROM_50[hundredths - 50]!;
  return -DP_FROM_50[50 - hundredths]!;
}
