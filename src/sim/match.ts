/**
 * Matches (GDD §5.2, §6.3, §8): board assignment, engine jobs for the user's
 * games and quick simulation for the rest. Never talks to Maia directly: the
 * caller passes the jobs to a `GameSimulator`.
 */
import { balance } from "../config/balance.ts";
import type { Dataset } from "../data/dataset.ts";
import type { GameResult } from "../engine/game.ts";
import { toEngineParams } from "../engine/strength.ts";
import type { GameJob, GameSide } from "../engine/types.ts";
import { deriveRng } from "../rng/rng.ts";
import type { BoardResult, GameScore, MatchResult, Pairing } from "../tournament/types.ts";
import { eloQuickSimulator } from "./quickSim.ts";

export interface BoardGame {
  board: number;
  whiteCardId: string;
  blackCardId: string;
}

/** The team listed first plays white on boards 1 and 3 (GDD §5.2). */
export function boardsFor(
  firstLineup: readonly string[],
  secondLineup: readonly string[],
): BoardGame[] {
  return [0, 1, 2, 3].map((i) => {
    const firstWhite = i % 2 === 0;
    const a = firstLineup[i]!;
    const b = secondLineup[i]!;
    return { board: i + 1, whiteCardId: firstWhite ? a : b, blackCardId: firstWhite ? b : a };
  });
}

/** GDD §8.4: game seed = hash(session seed, round, board). */
export const gameSeed = (seed: string, round: number, board: number) =>
  `${seed}/r${round}/b${board}`;

export function scoreOf(result: GameResult): GameScore {
  return result === "1-0" ? 1 : result === "0-1" ? 0 : 0.5;
}

/** First team's points on a board. */
function firstPoints(b: BoardResult, firstCardIds: ReadonlySet<string>): number {
  return firstCardIds.has(b.whiteCardId) ? b.score : 1 - b.score;
}

export function matchFromBoards(
  round: number,
  pairing: Pairing,
  firstLineup: readonly string[],
  boards: BoardResult[],
): MatchResult {
  const firstIds = new Set(firstLineup);
  const fp = boards.reduce((s, b) => s + firstPoints(b, firstIds), 0);
  return {
    round,
    first: pairing.first,
    second: pairing.second,
    boards,
    firstPoints: fp,
    secondPoints: boards.length - fp,
  };
}

/** One game drawn from Elo probabilities (GDD §6.3). */
export function quickGame(
  ds: Dataset,
  game: BoardGame,
  rngLabel: string,
  seed: string,
): BoardResult {
  const score = eloQuickSimulator.sampleResult(
    ds.card(game.whiteCardId),
    ds.card(game.blackCardId),
    deriveRng(seed, rngLabel),
  );
  return { ...game, score };
}

/** A whole match by quick simulation (field matches, and the user's in fast mode). */
export function quickMatch(
  ds: Dataset,
  seed: string,
  round: number,
  pairing: Pairing,
  firstLineup: readonly string[],
  secondLineup: readonly string[],
): MatchResult {
  const boards = boardsFor(firstLineup, secondLineup).map((g) =>
    quickGame(ds, g, `quick/r${round}/${pairing.first}-${pairing.second}/b${g.board}`, seed),
  );
  return matchFromBoards(round, pairing, firstLineup, boards);
}

function sideFor(ds: Dataset, cardId: string): GameSide {
  const card = ds.card(cardId);
  const person = ds.person(card.personId);
  const p = toEngineParams(card.strength, person.decisiveness);
  return {
    name: person.name,
    selfElo: p.selfElo,
    temperature: p.temperature,
    topP: balance.game.topP,
  };
}

/** Engine job for one of the user's games (GDD §8). */
export function gameJobFor(ds: Dataset, seed: string, round: number, game: BoardGame): GameJob {
  return {
    white: sideFor(ds, game.whiteCardId),
    black: sideFor(ds, game.blackCardId),
    seed: gameSeed(seed, round, game.board),
    headers: { Event: "4 a 0", Round: String(round), Board: String(game.board) },
  };
}
