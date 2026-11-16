/**
 * Dev page: catalog of the design system components (docs/design.md) in all
 * their states. Sample data is illustrative. Not part of the game.
 */
import { useState } from "react";
import {
  BoardCard,
  Button,
  Flag,
  Kicker,
  LineupRow,
  Masthead,
  MatchScore,
  ResultBadge,
  Rule,
  StyleTrait,
  TeamSlot,
  type Trait,
} from "../ui/index.ts";

const traitLabel: Record<Trait, string> = {
  solid: "Sólido",
  balanced: "Equilibrado",
  combative: "Combativo",
};

const lineup: { name: string; board: string; strength: number; trait: Trait; details: string }[] = [
  { name: "Anatoly Karpov", board: "1ª", strength: 2725, trait: "solid", details: "6½/9" },
  {
    name: "Mikhail Tal",
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
    white: { name: "Mikhail Tal", strength: 2705, isUser: true },
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
  const [almanaque, setAlmanaque] = useState(false);
  const [selected, setSelected] = useState<string | null>("Mikhail Tal");
  const [speed, setSpeed] = useState("1×");
  const hide = (n: number) => (almanaque ? null : n);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <Masthead title="4 a 0" kicker="Design system" section="Catálogo de componentes" />
      <div className="mt-4 flex justify-center">
        <Button variant="toggle" aria-pressed={almanaque} onClick={() => setAlmanaque((a) => !a)}>
          Modo Almanaque (força oculta)
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
          <Button variant="link">Pular para o resultado</Button>
          <Button variant="primary" disabled>
            Desabilitado
          </Button>
          <span className="flex gap-1">
            {["1×", "4×", "Instantâneo"].map((s) => (
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
                  selected={selected === c.name}
                  onSelect={() => setSelected((s) => (s === c.name ? null : c.name))}
                />
              </li>
            ))}
            <li>
              <LineupRow
                boardLabel="res."
                name="Garry Kasparov (já na equipe)"
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
          {games.map((g) => (
            <BoardCard
              key={g.board}
              boardLabel={`Mesa ${g.board}`}
              status={g.status}
              outcome={g.outcome}
              fen={g.fen}
              lastMove={g.lastMove}
              white={{ ...g.white, strength: hide(g.white.strength) }}
              black={{ ...g.black, strength: hide(g.black.strength) }}
            />
          ))}
        </div>
      </Section>
    </main>
  );
}
