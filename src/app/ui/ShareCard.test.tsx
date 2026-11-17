import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import i18n from "../../i18n/index.ts";
import { shareCardLabels, type ShareSummary } from "../../share/text.ts";
import { ShareCard } from "./ShareCard.tsx";

const t = i18n.t.bind(i18n);

const summary: ShareSummary = {
  mode: "master",
  medal: "gold",
  place: 1,
  matchPoints: 13,
  gamePoints: 21.5,
  players: [
    {
      board: 1,
      name: "Anatoly Karpov",
      countryCode: "su",
      countryName: "URSS",
      year: 1974,
      champion: true,
    },
    {
      board: 2,
      name: "Bent Larsen",
      countryCode: "dk",
      countryName: "Dinamarca",
      year: 1970,
      champion: false,
    },
    {
      board: 3,
      name: "Lajos Portisch",
      countryCode: "hu",
      countryName: "Hungria",
      year: 1978,
      champion: false,
    },
    {
      board: 4,
      name: "Judit Polgár",
      countryCode: "hu",
      countryName: "Hungria",
      year: 2002,
      champion: false,
    },
  ],
  rounds: [
    { round: 1, own: 3.5, other: 0.5 },
    { round: 2, own: 3, other: 1 },
    { round: 3, own: 2, other: 2 },
    { round: 4, own: 2.5, other: 1.5 },
    { round: 5, own: 1.5, other: 2.5 },
    { round: 6, own: 4, other: 0 },
    { round: 7, own: 3, other: 1 },
  ],
  url: "https://4a0.test/?seed=abc&modo=mestre",
};

const text = (html: string) => html.replace(/<[^>]*>/g, " ");

describe("ShareCard", () => {
  it("shows the players, the medal and every round score", () => {
    const html = text(
      renderToStaticMarkup(
        <ShareCard
          medal={summary.medal}
          players={summary.players}
          rounds={summary.rounds}
          labels={shareCardLabels(summary, t)}
        />,
      ),
    );
    for (const p of summary.players) expect(html).toContain(p.name);
    expect(html).toContain("Medalha de Ouro");
    expect(html).toContain("Modo Mestre");
    for (const score of ["3½–½", "3–1", "2–2", "2½–1½", "1½–2½", "4–0"])
      expect(html).toContain(score);
    expect(html).toContain("4a0.test/?seed=abc&amp;modo=mestre");
  });

  it("marks the world champions only", () => {
    const html = renderToStaticMarkup(
      <ShareCard
        medal={summary.medal}
        players={summary.players}
        rounds={summary.rounds}
        labels={shareCardLabels(summary, t)}
      />,
    );
    // Karpov is the only world champion of the summary.
    expect(html.match(/aria-label="Campeão mundial"/g)).toHaveLength(1);
  });

  it("shows the place without a medal", () => {
    const s = { ...summary, medal: null, place: 9 };
    const html = text(
      renderToStaticMarkup(
        <ShareCard
          medal={null}
          players={s.players}
          rounds={s.rounds}
          labels={shareCardLabels(s, t)}
        />,
      ),
    );
    expect(html).toContain("terminou em");
    expect(html).toContain("9º lugar");
    expect(html).not.toContain("Medalha");
  });
});
