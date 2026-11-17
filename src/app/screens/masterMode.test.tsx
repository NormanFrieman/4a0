/**
 * GDD §13.2: "O modo Mestre oculta a força em todas as telas até o fim do
 * torneio." Renders each screen on the server (no DOM: chessground only runs
 * in effects) and looks for every strength number the screen could show.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";
import "../../i18n/index.ts";
import { avgStrength } from "../../data/cardStrength.ts";
import { sampleDataset } from "../../data/testing.ts";
import { balance } from "../../config/balance.ts";
import { createDraft, isDraftComplete, pick, pickableCards } from "../../draft/draft.ts";
import { boardsFor, matchFromBoards, quickGame } from "../../sim/match.ts";
import { fieldConfig } from "../../tournament/field.ts";
import {
  fieldResults,
  lineups,
  pairNextRound,
  startTournament,
  userPairing,
} from "../../tournament/tournament.ts";
import { useSession, type Phase } from "../state/session.ts";
import type { Mode } from "../state/mode.ts";
import { Confirm } from "./Confirm.tsx";
import { Draft } from "./Draft.tsx";
import { Field } from "./Field.tsx";
import { Final } from "./Final.tsx";
import { PreRound } from "./PreRound.tsx";
import { Round } from "./Round.tsx";

const ds = sampleDataset();
const seed = "master-test";
const field = fieldConfig({ ...balance.tournament, ...balance.sampleTournament });

/** Draft with every slot but the last filled, and the completed draft. */
function drafts() {
  let s = createDraft(ds, seed);
  let before = s;
  while (!isDraftComplete(s)) {
    before = s;
    s = pick(ds, s, pickableCards(ds, s)[0]!, s.slots.indexOf(null));
  }
  return { open: before, done: s };
}

const { open, done } = drafts();
const userCards = done.slots as string[];
const started = startTournament(ds, seed, userCards, field, balance.tournament.rounds);
const paired = pairNextRound(started);

function liveRound() {
  const pairing = userPairing(paired);
  const l = lineups(paired, pairing);
  const boards = boardsFor(l.first, l.second).map((g) => {
    const result = quickGame(ds, g, `user/r1/b${g.board}`, seed);
    return { game: g, moves: [], shown: 0, result, termination: null, simulated: true };
  });
  return {
    round: 1,
    pairing,
    boards,
    userMatch: matchFromBoards(
      1,
      pairing,
      boards.map((b) => b.result),
    ),
    field: fieldResults(ds, paired),
  };
}

/** Every strength number the screens could show: cards and team averages. */
const strengths = new Set<number>([
  ...ds.teams.flatMap((t) => t.cardIds.map((id) => ds.card(id).strength)),
  ...started.entrants.map((e) => e.avgStrength),
  avgStrength(userCards.map((id) => ds.card(id).strength)),
]);

function shownStrengths(html: string): number[] {
  const text = html.replace(/<[^>]*>/g, " ");
  const numbers = new Set((text.match(/\d+/g) ?? []).map(Number));
  return [...strengths].filter((n) => numbers.has(n));
}

const screens: { name: string; phase: Phase; render: () => React.ReactElement }[] = [
  { name: "Draft", phase: "draft", render: () => <Draft /> },
  { name: "Confirm", phase: "confirm", render: () => <Confirm /> },
  { name: "Field", phase: "field", render: () => <Field /> },
  { name: "PreRound", phase: "preRound", render: () => <PreRound /> },
  { name: "Round", phase: "playing", render: () => <Round /> },
];

/**
 * On the server, zustand renders the store's *initial* state
 * (`getServerSnapshot`), so the test writes the session into that object.
 */
function renderIn(mode: Mode, phase: Phase, el: () => React.ReactElement) {
  Object.assign(useSession.getInitialState(), {
    dataset: ds,
    seed,
    fastMode: true,
    mode,
    phase,
    draft: phase === "draft" ? open : done,
    tournament: phase === "field" ? started : paired,
    live: phase === "playing" ? liveRound() : null,
    replay: null,
    games: {},
  });
  return renderToStaticMarkup(el());
}

beforeAll(() => {
  // Strengths are 4-digit ratings, years are 1970–2026: no overlap with years.
  for (const n of strengths) expect(n < 1900 || n > 2100).toBe(true);
});

describe("Mestre mode", () => {
  for (const s of screens) {
    it(`hides strength in ${s.name}`, () => {
      expect(shownStrengths(renderIn("master", s.phase, s.render))).toEqual([]);
    });

    it(`shows strength in ${s.name} in Clássico`, () => {
      expect(shownStrengths(renderIn("classic", s.phase, s.render)).length).toBeGreaterThan(0);
    });
  }

  it("reveals strength on the final result", () => {
    expect(shownStrengths(renderIn("master", "final", () => <Final />)).length).toBeGreaterThan(0);
  });
});
