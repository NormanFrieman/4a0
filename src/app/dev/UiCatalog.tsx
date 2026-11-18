/**
 * Dev page: catalog of the design system components (docs/design.md) in all
 * their states. Sample data is illustrative. Not part of the game.
 */
import { useState } from "react";
import {
  BoardCard,
  BoardFrame,
  Button,
  EvalBar,
  Flag,
  Kicker,
  LineupRow,
  Masthead,
  MatchScore,
  MoveMark,
  ResultBadge,
  Rule,
  ShareCard,
  StyleTrait,
  TeamSlot,
  type Trait,
} from "../ui/index.ts";

const traitLabel: Record<Trait, string> = {
  solid: "Sólido",
  balanced: "Equilibrado",
  combative: "Combativo",
};

const CHAMPION = "Campeão mundial";

const lineup: {
  name: string;
  board: string;
  strength: number;
  trait: Trait;
  details: string;
  champion?: boolean;
}[] = [
  {
    name: "Anatoly Karpov",
    board: "1ª",
    strength: 2725,
    trait: "solid",
    details: "6½/9",
    champion: true,
  },
  {
    name: "Mikhail Tal",
    champion: true,
    board: "3ª",
    strength: 2705,
    trait: "combative",
    details: "7½/11 · medalha de prata",
  },
  { name: "Lev Polugaevsky", board: "2ª", strength: 2620, trait: "balanced", details: "6/10" },
];

const games = [
  {
    board: 1,
    status: "lance 23…",
    outcome: null,
    fen: "r2q1rk1/pp2bppp/2n1bn2/2pp4/3P4/2PBPN2/PP1N1PPP/R1BQ1RK1 w - - 0 10",
    lastMove: ["c8", "e6"] as const,
    white: { name: "Mikhail Tal", strength: 2705, isUser: true, champion: CHAMPION },
    black: { name: "Svetozar Gligorić", strength: 2575, isUser: false },
  },
  {
    board: 2,
    status: "½-½ · empate",
    outcome: "draw" as const,
    fen: "8/5pk1/6p1/3R4/5P2/6PK/r7/8 w - - 0 41",
    lastMove: ["a7", "a2"] as const,
    white: { name: "Ljubomir Ljubojević", strength: 2600, isUser: false },
    black: { name: "Lajos Portisch", strength: 2620, isUser: true },
  },
  {
    board: 3,
    status: "1-0 · vitória",
    outcome: "win" as const,
    fen: "r5k1/5ppp/8/3Q4/8/6P1/5P1P/6K1 b - - 0 34",
    lastMove: ["d1", "d5"] as const,
    white: { name: "Bent Larsen", strength: 2610, isUser: true },
    black: { name: "Borislav Ivkov", strength: 2545, isUser: false },
  },
  {
    board: 4,
    status: "1-0 · derrota",
    outcome: "loss" as const,
    fen: "r1bqkb1r/pp2pppp/2np1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 2 6",
    lastMove: ["b8", "c6"] as const,
    white: { name: "Albin Planinc", strength: 2520, isUser: false },
    black: { name: "Lubomir Kavalek", strength: 2555, isUser: true },
  },
];

const sharePlayers = [
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
    name: "Svetozar Gligorić",
    countryCode: "yu",
    countryName: "Iugoslávia",
    year: 1972,
    champion: false,
  },
];

const shareRounds = [
  [3.5, 0.5],
  [3, 1],
  [2, 2],
  [2.5, 1.5],
  [1.5, 2.5],
  [4, 0],
  [3, 1],
].map(([own, other], i) => ({ round: i + 1, own: own!, other: other! }));

const shareLabels = (medal: boolean) => ({
  title: "4 a 0",
  kicker: "Olimpíadas de Xadrez",
  mode: "Modo Mestre",
  certifies: "Certifica-se que a seleção de",
  verb: medal ? "conquistou a" : "terminou em",
  headline: medal ? "Medalha de Bronze" : "5º lugar",
  detail: medal
    ? "3º lugar · 11 pontos de match · 19½ de partida"
    : "9 pontos de match · 16½ de partida",
  board: (n: number) => `Mesa ${n}`,
  round: (n: number) => `${n}ª`,
  champion: CHAMPION,
  footer: "Jogue a mesma semente em 4a0.example/?seed=abc&modo=mestre",
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-bold italic">{title}</h2>
      <Rule className="mt-1 mb-4" />
      {children}
    </section>
  );
}

const swatches = [
  "paper",
  "surface",
  "ink",
  "muted",
  "accent",
  "line",
  "win",
  "draw",
  "loss",
  "medal-gold",
  "medal-silver",
  "medal-bronze",
];

export function UiCatalog() {
  const [master, setMaster] = useState(false);
  const [selected, setSelected] = useState<string | null>("Mikhail Tal");
  const [speed, setSpeed] = useState("1×");
  const hide = (n: number) => (master ? null : n);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <Masthead title="4 a 0" kicker="Design system" section="Catálogo de componentes" />
      <div className="mt-4 flex justify-center">
        <Button variant="toggle" aria-pressed={master} onClick={() => setMaster((a) => !a)}>
          Modo Mestre (força oculta)
        </Button>
      </div>

      <Section title="Cores">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {swatches.map((s) => (
            <div key={s}>
              <div
                className="h-12 border border-line"
                style={{ background: `var(--color-${s})` }}
              />
              <code className="text-xs">{s}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tipografia">
        <p className="font-display text-5xl font-black">Fraunces 900 · 1½ × ½</p>
        <p className="font-display text-3xl font-bold">Fraunces 700 · títulos</p>
        <p className="text-lg">Fraunces 400 · texto corrido, com acentos: ção, ê, ć, ž, ő.</p>
        <p className="text-muted italic">Fraunces itálico · legendas e textos secundários</p>
        <p>
          <Kicker>Kicker · mesa 1</Kicker>
        </p>
      </Section>

      <Section title="Masthead compacto (telas internas, desktop)">
        <Masthead compact title="4 a 0" kicker="Design system" section="Rodada 3 de 7" />
      </Section>

      <Section title="Botões">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Confirmar equipe</Button>
          <Button>Copiar texto</Button>
          <Button variant="link">Ver a partida</Button>
          <Button variant="primary" disabled>
            Desabilitado
          </Button>
          <span className="flex gap-1">
            {["1×", "4×", "Sem pausa"].map((s) => (
              <Button
                key={s}
                variant="toggle"
                aria-pressed={speed === s}
                onClick={() => setSpeed(s)}
              >
                {s}
              </Button>
            ))}
          </span>
        </div>
      </Section>

      <Section title="Bandeiras">
        <div className="flex flex-wrap items-end gap-4 text-sm">
          {[
            ["su", "URSS"],
            ["yu", "Iugoslávia"],
            ["cs", "Tchecoslováquia"],
            ["dd", "Alemanha Oriental"],
            ["hu", "Hungria"],
            ["us", "EUA"],
            ["gb-eng", "Inglaterra"],
            ["ar", "Argentina"],
            ["zz", "Desconhecido"],
          ].map(([c, n]) => (
            <figure key={c} className="text-center">
              <Flag code={c!} label={n} className="w-12" />
              <figcaption className="text-xs text-muted">{n}</figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <Section title="Traços de estilo e resultados">
        <div className="flex flex-wrap gap-6">
          {(Object.keys(traitLabel) as Trait[]).map((t) => (
            <StyleTrait key={t} trait={t} label={traitLabel[t]} />
          ))}
          <ResultBadge outcome="win">vitória</ResultBadge>
          <ResultBadge outcome="draw">empate</ResultBadge>
          <ResultBadge outcome="loss">derrota</ResultBadge>
          <ResultBadge outcome={null}>lance 23…</ResultBadge>
        </div>
      </Section>

      <Section title="Draft: escalação e vagas">
        <div className="grid gap-8 md:grid-cols-[1fr_280px]">
          <ol className="divide-y divide-dotted divide-line">
            {lineup.map((c) => (
              <li key={c.name}>
                <LineupRow
                  boardLabel={c.board}
                  name={c.name}
                  title="GM"
                  trait={c.trait}
                  traitLabel={traitLabel[c.trait]}
                  details={c.details}
                  strength={hide(c.strength)}
                  {...(c.champion ? { champion: CHAMPION } : {})}
                  selected={selected === c.name}
                  onSelect={() => setSelected((s) => (s === c.name ? null : c.name))}
                />
              </li>
            ))}
            <li>
              <LineupRow
                boardLabel="res."
                name="Garry Kasparov (já na equipe)"
                champion={CHAMPION}
                title="GM"
                trait="combative"
                traitLabel={traitLabel.combative}
                details="9½/12 · medalha de ouro"
                strength={hide(2595)}
                disabled
              />
            </li>
          </ol>
          <div className="space-y-2">
            <TeamSlot label="Mesa 1" emptyText="vaga em aberto" awaiting={!!selected} />
            <TeamSlot
              label="Mesa 3"
              emptyText="vaga em aberto"
              card={{
                name: "Mikhail Tal",
                countryCode: "su",
                countryName: "URSS",
                year: 1972,
                champion: CHAMPION,
              }}
            />
            <TeamSlot
              label="Mesa 2"
              emptyText="vaga em aberto"
              card={{
                name: "Bent Larsen",
                countryCode: "dk",
                countryName: "Dinamarca",
                year: 1968,
              }}
            />
          </div>
        </div>
      </Section>

      <Section title="Rodada: placar e 4 tabuleiros iguais">
        <MatchScore home="Sua seleção" away="Iugoslávia 1974" homePoints={1.5} awayPoints={1.5} />
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-4">
          {games.map((g, i) => (
            <BoardCard
              key={g.board}
              boardLabel={`Mesa ${g.board}`}
              status={g.status}
              outcome={g.outcome}
              fen={g.fen}
              lastMove={g.lastMove}
              white={{ ...g.white, strength: hide(g.white.strength) }}
              black={{ ...g.black, strength: hide(g.black.strength) }}
              {...(i < 2 && !master
                ? {
                    evaluation: {
                      chances: i === 0 ? 0.35 : -0.6,
                      label: `Avaliação: ${i === 0 ? "+0,8" : "−2,1"}`,
                    },
                    mark:
                      i === 0
                        ? { mark: "great" as const, label: "Lance ótimo" }
                        : { mark: "blunder" as const, label: "Erro grave" },
                  }
                : {})}
            />
          ))}
        </div>
        <p className="mt-2 text-sm text-muted italic">
          Mesas 1 e 2 com barra de avaliação e marca de lance (só no Clássico, GDD §8.6).
        </p>
      </Section>

      <Section title="Avaliação e marcas de lance">
        <div className="flex items-stretch gap-6">
          {[1, 0.4, 0, -0.5, -1].map((c) => (
            <EvalBar
              key={c}
              chances={c}
              label={`Chances das brancas ${c}`}
              text={c >= 0 ? `+${c}` : `−${-c}`}
              className="h-32 w-4"
            />
          ))}
          <p className="self-center text-lg">
            Cxe5
            <MoveMark mark="great" label="Lance ótimo" /> · Dh4
            <MoveMark mark="mistake" label="Erro" /> · Bxf7
            <MoveMark mark="blunder" label="Erro grave" />
          </p>
        </div>
        <div className="mt-4 grid max-w-3xl grid-cols-3 gap-4">
          {(["great", "mistake", "blunder"] as const).map((m) => (
            <BoardFrame
              key={m}
              fen="r5k1/1p2qpbp/p1pprnp1/4n1B1/2P1P3/2N2P2/PP1QB1PP/3R1R1K w - - 0 16"
              lastMove={["c7", "c6"]}
              annotation={{ square: "c6", mark: m }}
            />
          ))}
        </div>
      </Section>

      <Section title="Imagem de compartilhamento (1080 × 1350, em 35%)">
        <div className="flex flex-wrap gap-6">
          {[true, false].map((medal) => (
            <div
              key={String(medal)}
              className="h-[473px] w-[378px] overflow-hidden border border-line"
            >
              <div className="origin-top-left scale-[0.35]">
                <ShareCard
                  medal={medal ? "bronze" : null}
                  players={sharePlayers}
                  rounds={shareRounds}
                  labels={shareLabels(medal)}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>
    </main>
  );
}
