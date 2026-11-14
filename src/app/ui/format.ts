/** Chess points with the half sign: 1.5 → "1½", 0.5 → "½". */
export function formatPoints(n: number): string {
  const whole = Math.floor(n);
  if (n - whole < 0.5) return String(whole);
  return whole === 0 ? "½" : `${whole}½`;
}

export type Outcome = "win" | "draw" | "loss";

/** Outcome from the user's points in a game or match share (1, ½, 0). */
export function outcomeOf(userShare: number): Outcome {
  return userShare > 0.5 ? "win" : userShare < 0.5 ? "loss" : "draw";
}
