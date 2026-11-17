import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { playGame, type SideConfig } from "../engine/game.ts";
import { ScriptedAI, UniformAI } from "../engine/testing/fakeAi.ts";
import { archiveGame, replayPositions, type ArchivedGame } from "./gameArchive.ts";
import { campaignPgn, gamePgn, type PgnContext } from "./pgn.ts";

const side = (ai: SideConfig["ai"]): SideConfig => ({ ai, elo: 1500, temperature: 1, topP: 1 });
const pairing = { first: "user", second: "team-x" };

const ctx: PgnContext = {
  event: "4 a 0 — Olimpíada simulada",
  site: "https://example.org/?seed=abc",
  date: new Date(2026, 10, 17),
  seed: "abc",
  playerName: (id) => `Player ${id}`,
  teamName: (id) => `Team ${id}`,
  terminationLabel: (t) => `T:${t}`,
  bookComment: "livro",
};

async function randomGame(seed: number, board = 1): Promise<ArchivedGame> {
  const rec = await playGame({
    white: side(new UniformAI()),
    black: side(new UniformAI()),
    seed,
    maxPlies: 80,
  });
  return archiveGame(2, pairing, { board, whiteCardId: "a", blackCardId: "b" }, rec);
}

describe("gamePgn", () => {
  it("is read back by chess.js and reaches the same final position", async () => {
    const g = await randomGame(7);
    const pgn = gamePgn(g, ctx);
    const chess = new Chess();
    chess.loadPgn(pgn);
    expect(chess.fen()).toBe(replayPositions(g.san).at(-1)!.fen);
    const h = chess.getHeaders();
    expect(h.Result).toBe(g.result);
    expect(h.White).toBe("Player a");
    expect(h.WhiteTeam).toBe("Team user");
    expect(h.BlackTeam).toBe("Team team-x");
    expect(h.Date).toBe("2026.11.17");
    expect(h.Round).toBe("2");
    expect(h.Termination).toBe(`T:${g.termination}`);
    expect(pgn.trimEnd().endsWith(g.result)).toBe(true);
  });

  it("writes the result of a checkmate once", async () => {
    const ai = new ScriptedAI(["f2f3", "e7e5", "g2g4", "d8h4"]);
    const rec = await playGame({ white: side(ai), black: side(ai), seed: 1 });
    const g = archiveGame(1, pairing, { board: 1, whiteCardId: "a", blackCardId: "b" }, rec);
    const pgn = gamePgn(g, ctx);
    expect(pgn.match(/0-1/g)).toHaveLength(2); // header + movetext
  });

  it("comments the last book move", async () => {
    const g = { ...(await randomGame(3)), bookPlies: 2 };
    expect(gamePgn(g, ctx)).toMatch(/^1\. \S+ \S+ \{livro\}/m);
  });

  it("puts every game of the campaign in one file", async () => {
    const games = [await randomGame(1, 1), await randomGame(2, 2), await randomGame(3, 3)];
    expect(campaignPgn(games, ctx).match(/\[Event /g)).toHaveLength(3);
  });
});

describe("archiveGame", () => {
  it("assigns teams by board", async () => {
    const rec = await playGame({
      white: side(new UniformAI()),
      black: side(new UniformAI()),
      seed: 5,
      maxPlies: 10,
    });
    // Same card on both sides: only the board tells the teams apart (GDD §5.1).
    const b1 = archiveGame(1, pairing, { board: 1, whiteCardId: "c", blackCardId: "c" }, rec);
    const b2 = archiveGame(1, pairing, { board: 2, whiteCardId: "c", blackCardId: "c" }, rec);
    expect([b1.whiteTeamId, b1.blackTeamId]).toEqual(["user", "team-x"]);
    expect([b2.whiteTeamId, b2.blackTeamId]).toEqual(["team-x", "user"]);
    expect(b1.san).toHaveLength(rec.moves.length);
    expect(b1.bookPlies).toBe(0);
  });
});

describe("replayPositions", () => {
  it("handles castling and promotion", () => {
    const san = [
      "e4",
      "d5",
      "exd5",
      "c6",
      "dxc6",
      "Nf6",
      "cxb7",
      "Bd7",
      "bxa8=Q",
      "e6",
      "Nf3",
      "Be7",
      "Be2",
      "O-O",
    ];
    const pos = replayPositions(san);
    expect(pos).toHaveLength(san.length + 1);
    expect(pos[0]!.san).toBeUndefined();
    expect(pos[9]).toMatchObject({ san: "bxa8=Q", from: "b7", to: "a8" });
    expect(pos.at(-1)).toMatchObject({ san: "O-O", from: "e8", to: "g8" });
  });
});
