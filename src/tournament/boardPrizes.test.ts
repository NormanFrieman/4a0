import { describe, expect, it } from "vitest";
import { balance } from "../config/balance.ts";
import { sampleDataset } from "../data/testing.ts";
import { boardsFor, matchFromBoards } from "../sim/match.ts";
import { boardPrizes } from "./boardPrizes.ts";
import type { RoundState, TournamentState } from "./tournament.ts";
import type { Entrant, GameScore } from "./types.ts";

const ds = sampleDataset();
const [tx, ty, tz] = ds.teams;
const entrant = (id: string, cardIds: string[]): Entrant => ({
  id,
  isUser: false,
  cardIds,
  avgStrength: 0,
});
const X = entrant("x", tx!.cardIds);
const Y = entrant("y", ty!.cardIds);
const Z = entrant("z", tz!.cardIds);
const X2 = entrant("x2", tx!.cardIds); // the same cards for another team (GDD §5.1)

/** A round where `first` meets `second`, with white's score on boards 1–4. */
function round(n: number, first: Entrant, second: Entrant, white: GameScore[]): RoundState {
  const pairing = { first: first.id, second: second.id };
  const boards = boardsFor(first.cardIds, second.cardIds).map((g, i) => ({
    ...g,
    score: white[i]!,
  }));
  return { round: n, pairings: [pairing], results: [matchFromBoards(n, pairing, boards)] };
}

const state = (entrants: Entrant[], rounds: RoundState[]): TournamentState => ({
  seed: "prizes",
  totalRounds: rounds.length,
  entrants,
  rounds,
});

describe("boardPrizes (GDD §5.3)", () => {
  // X is white on boards 1 and 3, Y on 2 and 4. X wins board 1 every time and
  // Y wins board 4; then Z beats Y twice on every board, too few games to count.
  const xy = Array.from({ length: 5 }, (_, i) => round(i + 1, X, Y, [1, 0.5, 1, 1]));
  const zy = [6, 7].map((n) => round(n, Z, Y, [1, 0, 1, 0]));
  const t = state([X, Y, Z], [...xy, ...zy]);

  it("gives each board to its best performance", () => {
    const prizes = boardPrizes(ds, t);
    expect(prizes.map((p) => p.board)).toEqual([1, 2, 3, 4]);
    const b1 = prizes[0]!;
    expect([b1.entrantId, b1.cardId, b1.points, b1.games]).toEqual(["x", tx!.cardIds[0], 5, 5]);
    expect(b1.avgOpponent).toBe(ds.card(ty!.cardIds[0]!).strength);
    expect(b1.performance).toBe(b1.avgOpponent + 800);
    const b4 = prizes[3]!;
    expect([b4.entrantId, b4.points, b4.games]).toEqual(["y", 5, 7]);
  });

  it("leaves out cards under the minimum of games", () => {
    expect(2).toBeLessThan(balance.tournament.boardPrizeMinGames);
    expect(boardPrizes(ds, t).some((p) => p.entrantId === "z")).toBe(false);
    // Only Z's two games: nobody qualifies.
    expect(boardPrizes(ds, state([Y, Z], zy))).toEqual([]);
  });

  it("breaks a full tie deterministically, without a draw", () => {
    // The same cards on both sides and every game drawn: identical lines.
    const draws = Array.from({ length: 5 }, (_, i) => round(i + 1, X2, X, [0.5, 0.5, 0.5, 0.5]));
    const a = boardPrizes(ds, state([X, X2], draws));
    const b = boardPrizes(ds, state([X2, X], [...draws].reverse()));
    expect(a).toEqual(b);
    expect(a.every((p) => p.entrantId === "x")).toBe(true);
  });
});
