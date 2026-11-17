import { describe, expect, it } from "vitest";
import i18n from "../i18n/index.ts";
import { shareText, type ShareSummary } from "./text.ts";

const t = i18n.t.bind(i18n);

const base: ShareSummary = {
  mode: "master",
  medal: "silver",
  place: 2,
  matchPoints: 11,
  gamePoints: 18.5,
  players: [
    {
      board: 1,
      name: "Garry Kasparov",
      countryCode: "su",
      countryName: "URSS",
      year: 1980,
      champion: true,
    },
    {
      board: 2,
      name: "Anatoly Karpov",
      countryCode: "su",
      countryName: "URSS",
      year: 1974,
      champion: true,
    },
    {
      board: 3,
      name: "Mikhail Tal",
      countryCode: "su",
      countryName: "URSS",
      year: 1972,
      champion: true,
    },
    {
      board: 4,
      name: "Robert James Fischer",
      countryCode: "us",
      countryName: "EUA",
      year: 1970,
      champion: false,
    },
  ],
  rounds: [
    { round: 1, own: 3.5, other: 0.5 },
    { round: 2, own: 3, other: 1 },
    { round: 3, own: 2, other: 2 },
    { round: 4, own: 1.5, other: 2.5 },
    { round: 5, own: 0, other: 4 },
  ],
  url: "https://4a0.example/?seed=abc&modo=mestre",
};

describe("shareText", () => {
  it("writes mode, medal, players, one mark per round and the link", () => {
    expect(shareText(base, t)).toBe(
      [
        "4 a 0 · Modo Mestre",
        "🥈 Medalha de Prata · 2º lugar · 11 pts de match",
        "Kasparov, Karpov, Tal, Fischer",
        "🟩 3½–½  🟩 3–1  🟨 2–2  🟥 1½–2½  🟥 0–4",
        "https://4a0.example/?seed=abc&modo=mestre",
      ].join("\n"),
    );
  });

  it("shows only the place without a medal, and the Clássico mode", () => {
    const lines = shareText(
      { ...base, mode: "classic", medal: null, place: 7, url: "https://4a0.example/?seed=abc" },
      t,
    ).split("\n");
    expect(lines[0]).toBe("4 a 0 · Modo Clássico");
    expect(lines[1]).toBe("7º lugar · 11 pts de match");
    expect(lines[4]).toBe("https://4a0.example/?seed=abc");
  });
});
