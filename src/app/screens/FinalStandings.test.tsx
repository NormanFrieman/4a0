/**
 * Final standings on the Final screen (GDD §3 item 7, §5.3). Rendered on the
 * server like `masterMode.test.tsx`.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import "../../i18n/index.ts";
import { balance } from "../../config/balance.ts";
import { sampleDataset } from "../../data/testing.ts";
import { createDraft, isDraftComplete, pick, pickableCards } from "../../draft/draft.ts";
import { quickMatch } from "../../sim/match.ts";
import { fieldConfig } from "../../tournament/field.ts";
import {
  USER_ID,
  currentRound,
  currentStandings,
  fieldResults,
  isFinished,
  lineups,
  pairNextRound,
  recordRound,
  startTournament,
  userPairing,
} from "../../tournament/tournament.ts";
import { useSession } from "../state/session.ts";
import { Final } from "./Final.tsx";
import { StandingsTable } from "./FinalStandings.tsx";
import { userMatches } from "./helpers.ts";

const ds = sampleDataset();
const seed = "final-standings";
const field = fieldConfig({ ...balance.tournament, ...balance.sampleTournament });

function playAll() {
  let d = createDraft(ds, seed);
  while (!isDraftComplete(d)) d = pick(ds, d, pickableCards(ds, d)[0]!, d.slots.indexOf(null));
  let t = startTournament(ds, seed, d.slots as string[], field, balance.tournament.rounds);
  while (!isFinished(t)) {
    t = pairNextRound(t);
    const p = userPairing(t);
    const l = lineups(t, p);
    const user = quickMatch(ds, seed, currentRound(t)!.round, p, l.first, l.second);
    t = recordRound(t, [user, ...fieldResults(ds, t)]);
  }
  return t;
}

const tournament = playAll();

/** On the server, zustand renders the store's initial state. */
function render(el: React.ReactElement) {
  Object.assign(useSession.getInitialState(), {
    dataset: ds,
    seed,
    mode: "classic",
    phase: "final",
    tournament,
    games: {},
  });
  return renderToStaticMarkup(el);
}

const rowsOf = (html: string) => html.split("<tr").slice(2); // drop "" and the header

describe("final standings", () => {
  const html = render(<StandingsTable />);
  const rows = rowsOf(html);
  const expected = currentStandings(tournament);

  it("lists every team in standings order", () => {
    expect(rows).toHaveLength(tournament.entrants.length);
    expected.forEach((r, i) => {
      if (r.teamId === USER_ID) return;
      const team = ds.team(r.teamId);
      expect(rows[i]).toContain(`${team.countryName} ${team.year}`);
    });
  });

  it("marks only the user's row", () => {
    const marked = rows.flatMap((r, i) => (r.includes('aria-current="true"') ? [i] : []));
    expect(marked).toEqual([expected.findIndex((r) => r.teamId === USER_ID)]);
  });

  it("colours the medal places", () => {
    expect(rows[0]).toContain("text-medal-gold");
    expect(rows[1]).toContain("text-medal-silver");
    expect(rows[2]).toContain("text-medal-bronze");
    expect(rows.slice(3).join("")).not.toMatch(/text-medal-/);
  });

  it("shows the user's score against every opponent", () => {
    for (const m of userMatches(tournament)) {
      const opp = m.first === USER_ID ? m.second : m.first;
      const row = rows[expected.findIndex((r) => r.teamId === opp)]!;
      // Twice: the desktop column and the mobile line under the name.
      expect(row.match(new RegExp(`${m.round}ª`, "g"))).toHaveLength(2);
    }
  });

  it("opens the Final on the Campanha tab", () => {
    // The Final builds the share link from `location` (no DOM on the server).
    vi.stubGlobal("location", new URL("https://4a0.test/"));
    const final = render(<Final />);
    expect(final).toMatch(/aria-selected="true"[^>]*>Campanha</);
    expect(final).not.toContain('aria-current="true"');
  });
});
