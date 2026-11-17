/**
 * Session store (GDD §3): one session from the first roll to the medal.
 * Phases: home → draft → confirm → field → (preRound → playing → standings)×N → final.
 * `replay` opens over `playing` or `final` and returns to it.
 * Game logic lives in src/draft, src/tournament and src/sim; this store only
 * sequences it and holds UI state. `?seed=` reproduces a session; `?rapido=1`
 * simulates the user's games instantly (test mode).
 */
import { create } from "zustand";
import { balance } from "../../config/balance.ts";
import { loadBooks, type BookSet } from "../../data/books.ts";
import { loadDataset, type Dataset } from "../../data/dataset.ts";
import { createDraft, isDraftComplete, pick, reroll, type DraftState } from "../../draft/draft.ts";
import type { PlayedMove, Termination } from "../../engine/game.ts";
import { archiveGame, archiveKey, type ArchivedGame } from "../../sim/gameArchive.ts";
import {
  boardsFor,
  gameJobFor,
  matchFromBoards,
  quickGame,
  scoreOf,
  type BoardGame,
} from "../../sim/match.ts";
import {
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
import { fieldConfig } from "../../tournament/field.ts";
import type { BoardResult, MatchResult, Pairing } from "../../tournament/types.ts";
import { enginePool, loadEngine, type EngineStatus } from "./engine.ts";

export type Phase =
  | "loading"
  | "error"
  | "home"
  | "about"
  | "draft"
  | "confirm"
  | "field"
  | "preRound"
  | "playing"
  | "standings"
  | "final"
  | "replay";

export type Speed = "normal" | "fast" | "instant";

export interface LiveBoard {
  game: BoardGame;
  /** Moves computed so far by the worker. */
  moves: PlayedMove[];
  /** Moves shown on the board (playback position). */
  shown: number;
  result: BoardResult | null;
  termination: Termination | null;
  /** Fast mode: no moves, result drawn by quick simulation. */
  simulated: boolean;
}

export interface LiveRound {
  round: number;
  pairing: Pairing;
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
  live: LiveRound | null;
  speed: Speed;
  /** The user's games with moves, by `archiveKey` (empty in fast mode). */
  games: Record<string, ArchivedGame>;
  /** Game open in the Replay screen and the phase to return to. */
  replay: { key: string; from: Phase } | null;

  init(): Promise<void>;
  startDraft(): void;
  openAbout(): void;
  closeAbout(): void;
  selectCard(id: string): void;
  placeCard(slot: number): void;
  rerollDraft(): void;
  confirmTeam(): void;
  startRound(): void;
  playRound(): void;
  setSpeed(speed: Speed): void;
  tick(): void;
  finishRound(): void;
  next(): void;
  playAgain(): void;
  openReplay(round: number, board: number): void;
  closeReplay(): void;
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

/** Opening books of the cards in the current tournament, loading since `confirmTeam`. */
let books: Promise<BookSet> | null = null;

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
  live: null,
  speed: "normal",
  games: {},
  replay: null,

  async init() {
    const p = new URLSearchParams(location.search);
    const seed = p.get("seed") || newSeed();
    const fastMode = p.get("rapido") === "1";
    writeUrl(seed, fastMode);
    set({ seed, fastMode });
    try {
      const dataset = await loadDataset("v1");
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
      fieldConfig(),
      balance.tournament.rounds,
    );
    // Books are only needed for engine games (GDD §9.3: before the tournament).
    if (!get().fastMode) {
      books = loadBooks(
        dataset,
        tournament.entrants.flatMap((e) => e.cardIds),
      );
      books.catch(() => {}); // reported when a round awaits it
    }
    set({ tournament, phase: "field" });
  },

  startRound() {
    const { tournament } = get();
    if (!tournament) return;
    const t = pairNextRound(tournament);
    set({ tournament: t, live: null, phase: "preRound" });
  },

  playRound() {
    const { dataset, tournament: t, fastMode, seed } = get();
    if (!dataset || !t) return;
    const gen = ++generation;
    const round = currentRound(t)!.round;
    const pairing = userPairing(t);
    const l = lineups(t, pairing);
    const games = boardsFor(l.first, l.second);
    const field = fieldResults(dataset, t);

    if (fastMode) {
      const boards = games.map((g) => {
        const result = quickGame(dataset, g, `user/r${round}/b${g.board}`, seed);
        return { game: g, moves: [], shown: 0, result, termination: null, simulated: true };
      });
      const userMatch = matchFromBoards(
        round,
        pairing,
        boards.map((b) => b.result),
      );
      set({
        live: { round, pairing, boards, userMatch, field },
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
        boards: games.map((g) => ({
          game: g,
          moves: [],
          shown: 0,
          result: null,
          termination: null,
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
              boards.map((b) => b.result!),
            )
          : null;
        return { live: { ...s.live, boards, userMatch } };
      });
    };

    const fail = (err: unknown) =>
      set({ phase: "error", error: err instanceof Error ? err.message : String(err) });
    if (!books) return fail(new Error("Opening books were not loaded"));
    books.then((bookSet) => {
      if (gen !== generation) return;
      games.forEach((g, i) => {
        pool
          .playGame(gameJobFor(dataset, seed, round, g, bookSet), (mv) =>
            update(i, (b) => ({ ...b, moves: [...b.moves, mv] })),
          )
          .then((rec) => {
            if (gen !== generation) return;
            set((s) => ({
              games: {
                ...s.games,
                [archiveKey(round, g.board)]: archiveGame(round, pairing, g, rec),
              },
            }));
            update(i, (b) => ({
              ...b,
              result: { ...g, score: scoreOf(rec.result) },
              termination: rec.termination,
            }));
          })
          .catch(fail);
      });
    }, fail);
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

  openAbout() {
    if (get().phase === "home") set({ phase: "about" });
  },

  closeAbout() {
    if (get().phase === "about") set({ phase: "home" });
  },

  openReplay(round, board) {
    const { phase, games } = get();
    const key = archiveKey(round, board);
    if (phase === "replay" || !games[key]) return;
    set({ replay: { key, from: phase }, phase: "replay" });
  },

  closeReplay() {
    const { replay } = get();
    if (replay) set({ phase: replay.from, replay: null });
  },

  playAgain() {
    generation++;
    const seed = newSeed();
    writeUrl(seed, get().fastMode);
    set({ seed, tournament: null, live: null, draft: null, games: {}, replay: null });
    get().startDraft();
  },
}));

/** True when the user's match is computed and fully shown. */
export const roundDone = (live: LiveRound | null) =>
  !!live?.userMatch && live.boards.every((b) => b.simulated || b.shown >= b.moves.length);
