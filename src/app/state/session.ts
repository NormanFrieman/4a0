/**
 * Session store (GDD §3): one session from the first roll to the medal.
 * Phases: home → draft → confirm → field → (preRound → playing → standings)×N → final.
 * Game logic lives in src/draft, src/tournament and src/sim; this store only
 * sequences it and holds UI state. `?seed=` reproduces a session; `?rapido=1`
 * simulates the user's games instantly (test mode).
 */
import { create } from "zustand";
import { balance } from "../../config/balance.ts";
import { loadDataset, type Dataset } from "../../data/dataset.ts";
import { createDraft, isDraftComplete, pick, reroll, type DraftState } from "../../draft/draft.ts";
import type { PlayedMove } from "../../engine/game.ts";
import {
  boardsFor,
  gameJobFor,
  matchFromBoards,
  quickGame,
  scoreOf,
  type BoardGame,
} from "../../sim/match.ts";
import { defaultResting } from "../../tournament/lineup.ts";
import {
  USER_ID,
  currentRound,
  fieldResults,
  isFinished,
  lineups,
  pairNextRound,
  recordRound,
  startTournament,
  userPairing,
  type TournamentState,
} from "../../tournament/tournament.ts";
import type { BoardResult, MatchResult, Pairing } from "../../tournament/types.ts";
import { enginePool, loadEngine, type EngineStatus } from "./engine.ts";

export type Phase =
  | "loading"
  | "error"
  | "home"
  | "draft"
  | "confirm"
  | "field"
  | "preRound"
  | "playing"
  | "standings"
  | "final";

export type Speed = "normal" | "fast" | "instant";

export interface LiveBoard {
  game: BoardGame;
  /** Moves computed so far by the worker. */
  moves: PlayedMove[];
  /** Moves shown on the board (playback position). */
  shown: number;
  result: BoardResult | null;
  /** Fast mode: no moves, result drawn by quick simulation. */
  simulated: boolean;
}

export interface LiveRound {
  round: number;
  pairing: Pairing;
  firstLineup: string[];
  boards: LiveBoard[];
  userMatch: MatchResult | null;
  field: MatchResult[];
}

interface SessionState {
  phase: Phase;
  error: string | null;
  dataset: Dataset | null;
  seed: string;
  fastMode: boolean;
  engine: EngineStatus;
  draft: DraftState | null;
  selectedCardId: string | null;
  tournament: TournamentState | null;
  resting: string | null;
  live: LiveRound | null;
  speed: Speed;

  init(): Promise<void>;
  startDraft(): void;
  selectCard(id: string): void;
  placeCard(slot: number): void;
  rerollDraft(): void;
  confirmTeam(): void;
  startRound(): void;
  setResting(cardId: string): void;
  playRound(): void;
  setSpeed(speed: Speed): void;
  tick(): void;
  finishRound(): void;
  next(): void;
  playAgain(): void;
}

function newSeed(): string {
  return crypto.getRandomValues(new Uint32Array(1))[0]!.toString(36);
}

function writeUrl(seed: string, fast: boolean) {
  const p = new URLSearchParams(location.search);
  p.set("seed", seed);
  if (fast) p.set("rapido", "1");
  history.replaceState(null, "", `${location.pathname}?${p}`);
}

/** Bumped on every new round/session so late worker callbacks are ignored. */
let generation = 0;

export const useSession = create<SessionState>()((set, get) => ({
  phase: "loading",
  error: null,
  dataset: null,
  seed: "",
  fastMode: false,
  engine: { state: "idle" },
  draft: null,
  selectedCardId: null,
  tournament: null,
  resting: null,
  live: null,
  speed: "normal",

  async init() {
    const p = new URLSearchParams(location.search);
    const seed = p.get("seed") || newSeed();
    const fastMode = p.get("rapido") === "1";
    writeUrl(seed, fastMode);
    set({ seed, fastMode });
    try {
      const dataset = await loadDataset("sample");
      set({ dataset, phase: "home" });
    } catch (err) {
      set({ phase: "error", error: err instanceof Error ? err.message : String(err) });
    }
  },

  startDraft() {
    const { dataset, seed, fastMode } = get();
    if (!dataset) return;
    set({ draft: createDraft(dataset, seed), selectedCardId: null, phase: "draft" });
    if (!fastMode) loadEngine((engine) => set({ engine })).catch(() => {});
  },

  selectCard(id) {
    set((s) => ({ selectedCardId: s.selectedCardId === id ? null : id }));
  },

  placeCard(slot) {
    const { dataset, draft, selectedCardId } = get();
    if (!dataset || !draft || !selectedCardId) return;
    const next = pick(dataset, draft, selectedCardId, slot);
    if (isDraftComplete(next)) set({ draft: next, selectedCardId: null, phase: "confirm" });
    else set({ draft: next, selectedCardId: null });
  },

  rerollDraft() {
    const { dataset, draft } = get();
    if (!dataset || !draft) return;
    set({ draft: reroll(dataset, draft), selectedCardId: null });
  },

  confirmTeam() {
    const { dataset, draft, seed } = get();
    if (!dataset || !draft) return;
    const tournament = startTournament(
      dataset,
      seed,
      draft.slots as string[],
      balance.sampleTournament.fieldSize,
      balance.tournament.rounds,
    );
    set({ tournament, phase: "field" });
  },

  startRound() {
    const { tournament } = get();
    if (!tournament) return;
    const t = pairNextRound(tournament);
    const user = t.entrants.find((e) => e.id === USER_ID)!;
    set({ tournament: t, resting: defaultResting(user.cardIds), live: null, phase: "preRound" });
  },

  setResting(cardId) {
    set({ resting: cardId });
  },

  playRound() {
    const { dataset, tournament: t, resting, fastMode, seed } = get();
    if (!dataset || !t) return;
    const gen = ++generation;
    const round = currentRound(t)!.round;
    const pairing = userPairing(t);
    const l = lineups(t, pairing, resting);
    const games = boardsFor(l.first, l.second);
    const field = fieldResults(dataset, t);

    if (fastMode) {
      const boards = games.map((g) => {
        const result = quickGame(dataset, g, `user/r${round}/b${g.board}`, seed);
        return { game: g, moves: [], shown: 0, result, simulated: true };
      });
      const userMatch = matchFromBoards(
        round,
        pairing,
        l.first,
        boards.map((b) => b.result),
      );
      set({
        live: { round, pairing, firstLineup: l.first, boards, userMatch, field },
        phase: "playing",
      });
      return;
    }

    const pool = enginePool();
    if (!pool) return;
    set({
      live: {
        round,
        pairing,
        firstLineup: l.first,
        boards: games.map((g) => ({
          game: g,
          moves: [],
          shown: 0,
          result: null,
          simulated: false,
        })),
        userMatch: null,
        field,
      },
      phase: "playing",
    });

    const update = (i: number, fn: (b: LiveBoard) => LiveBoard) => {
      if (gen !== generation) return;
      set((s) => {
        if (!s.live) return {};
        const boards = s.live.boards.map((b, k) => (k === i ? fn(b) : b));
        const done = boards.every((b) => b.result);
        const userMatch = done
          ? matchFromBoards(
              round,
              pairing,
              l.first,
              boards.map((b) => b.result!),
            )
          : null;
        return { live: { ...s.live, boards, userMatch } };
      });
    };

    games.forEach((g, i) => {
      pool
        .playGame(gameJobFor(dataset, seed, round, g), (mv) =>
          update(i, (b) => ({ ...b, moves: [...b.moves, mv] })),
        )
        .then((rec) => update(i, (b) => ({ ...b, result: { ...g, score: scoreOf(rec.result) } })))
        .catch((err: unknown) =>
          set({ phase: "error", error: err instanceof Error ? err.message : String(err) }),
        );
    });
  },

  setSpeed(speed) {
    set({ speed });
    if (speed === "instant") get().tick();
  },

  tick() {
    set((s) => {
      if (!s.live) return {};
      const instant = s.speed === "instant";
      const boards = s.live.boards.map((b) =>
        b.shown < b.moves.length ? { ...b, shown: instant ? b.moves.length : b.shown + 1 } : b,
      );
      return { live: { ...s.live, boards } };
    });
  },

  finishRound() {
    const { tournament, live } = get();
    if (!tournament || !live?.userMatch) return;
    set({
      tournament: recordRound(tournament, [live.userMatch, ...live.field]),
      phase: "standings",
    });
  },

  next() {
    const { tournament } = get();
    if (!tournament) return;
    if (isFinished(tournament)) set({ phase: "final" });
    else get().startRound();
  },

  playAgain() {
    generation++;
    const seed = newSeed();
    writeUrl(seed, get().fastMode);
    set({ seed, tournament: null, live: null, draft: null, resting: null });
    get().startDraft();
  },
}));

/** True when the user's match is computed and fully shown. */
export const roundDone = (live: LiveRound | null) =>
  !!live?.userMatch && live.boards.every((b) => b.simulated || b.shown >= b.moves.length);
