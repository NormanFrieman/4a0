/**
 * Validation report (plano-dados.md, pipeline step 5), in pt-BR, written to
 * tools/data/olympiads/report.md by `pnpm data:olympiads`.
 */
import type { Person } from "../../../src/data/types.ts";
import { teams as sampleTeams } from "../sample/source.ts";
import type { EditionResult, TeamResult } from "./build.ts";
import type { ChampionBooks } from "./championBooks.ts";
import { crosstablePage, lineupsPage } from "./cache.ts";

/** A FIDE list older than this before the edition is flagged. */
const STALE_ELO_MONTHS = 12;

const fmt = (n: number) => String(n).replace(".", ",");
const pageLink = (title: string, revid: number) =>
  `[${title}](https://de.wikipedia.org/w/index.php?oldid=${revid}) (revid ${revid})`;

function monthsBetween(a: string, b: string): number {
  const [ay, am] = a.split("-").map(Number) as [number, number];
  const [by, bm] = b.split("-").map(Number) as [number, number];
  return (by - ay) * 12 + (bm - am);
}

function list(title: string, items: string[]): string {
  if (items.length === 0) return `- ${title}: nenhum\n`;
  return `- ${title}: **${items.length}**\n${items.map((i) => `  - ${i}`).join("\n")}\n`;
}

function teamLabel(t: TeamResult) {
  return `${t.team.finalRank}. ${t.country.name}`;
}

function editionSection(r: EditionResult): string {
  const { year, start, rounds } = r.edition;
  const where = (t: TeamResult, board: number | string, name: string) =>
    `${teamLabel(t)}, mesa ${board}: ${name}`;
  const cards = r.top.flatMap((t) => t.cards.map((c) => ({ t, c })));

  const wd = (q: string) => `[${q}](https://www.wikidata.org/wiki/${q})`;
  const noQid = cards
    .filter(({ c }) => !c.player.qid)
    .map(({ t, c }) =>
      where(
        t,
        c.card.board,
        c.player.name +
          (c.player.candidates.length
            ? ` (busca: ${c.player.candidates.map(wd).join(", ")}, nenhum com Elo da época ou mais de um)`
            : ""),
      ),
    );
  const bySearch = cards
    .filter(({ c }) => c.player.qidSource === "search")
    .map(({ t, c }) => {
      const e = c.player.entity!;
      const label = e.labels.pt ?? e.labels.en ?? "?";
      return where(
        t,
        c.card.board,
        `${c.player.name} → ${wd(e.qid)} ${label}, Elo ${c.player.elo!.rating} (${c.player.elo!.date.slice(0, 7)})`,
      );
    });
  const noElo = cards
    .filter(({ c }) => c.player.qid && !c.player.elo)
    .map(({ t, c }) => where(t, c.card.board, `${c.player.name} (${c.player.qid})`));
  const stale = cards
    .filter(({ c }) => c.player.elo && monthsBetween(c.player.elo.date, start) > STALE_ELO_MONTHS)
    .map(({ t, c }) => where(t, c.card.board, `${c.player.name}: lista de ${c.player.elo!.date}`));
  const noTitle = cards
    .filter(({ c }) => c.player.qid && !c.card.title)
    .map(({ t, c }) => where(t, c.card.board, c.player.name));
  const sums = r.top.flatMap((t) => {
    const sum = t.lineup.players.reduce((s, p) => s + p.points, 0);
    return sum === t.lineup.boardPoints
      ? []
      : [`${teamLabel(t)}: soma ${fmt(sum)}, Brettp. ${fmt(t.lineup.boardPoints)}`];
  });
  const tooMany = r.top.flatMap((t) =>
    t.lineup.players
      .filter((p) => p.games > rounds || p.wins + p.draws + p.losses !== p.games)
      .map((p) =>
        where(t, p.board, `${p.name}: ${p.games} partidas, V/E/D ${p.wins}/${p.draws}/${p.losses}`),
      ),
  );
  const excluded = r.top.filter((t) => t.excluded).map((t) => `${teamLabel(t)}: ${t.excluded}`);
  const roundsTotal = cards.reduce((s, { c }) => s + c.rounds, 0);
  const ratedTotal = cards.reduce((s, { c }) => s + c.ratedRounds, 0);

  const rows = r.top.flatMap((t) =>
    t.cards.map(({ card, player }) => {
      const elo = player.elo ? `${player.elo.rating} (${player.elo.date.slice(0, 7)})` : "—";
      const qid = player.qid ? `[${player.qid}](https://www.wikidata.org/wiki/${player.qid})` : "—";
      return (
        `| ${card.board === 1 ? teamLabel(t) : ""} | ${card.board} | ${player.name} | ${qid} | ${elo} | ` +
        `${card.title || "—"} | ${fmt(card.score)}/${card.games} | ${card.performance} | **${card.strength}** |`
      );
    }),
  );

  return `## ${year} — ${r.edition.city}

- Fontes: ${pageLink(lineupsPage(year), r.revids.lineups)}; ${
    r.crosstableFound
      ? pageLink(crosstablePage(year), r.revids.crosstable)
      : `**${crosstablePage(year)} não existe**: sem performance, força = Elo`
  }
- Seleções lidas: ${r.teamsParsed}. Início: ${start}. Média de rating do campo (mesas 1 a 4 com Elo): ${r.fieldMean}.
- Rodadas com adversário de rating conhecido: ${ratedTotal}/${roundsTotal}${
    roundsTotal ? ` (${Math.round((100 * ratedTotal) / roundsTotal)}%)` : ""
  }

### Verificações

${list("Seleções no top 20 excluídas (carta sem Elo ou sem partidas)", excluded)}${list("Soma dos pontos ≠ Brettp.", sums)}${list(
    `Partidas > ${rounds} rodadas ou V+E+D ≠ partidas`,
    tooMany,
  )}${list("QID achado pela busca de nome (conferir)", bySearch)}${list("Cartas sem QID", noQid)}${list(
    "Cartas sem Elo no Wikidata (até o início)",
    noElo,
  )}${list(`Elo de lista com mais de ${STALE_ELO_MONTHS} meses`, stale)}${list(
    "Cartas sem título no Wikidata",
    noTitle,
  )}${list("Linhas da tabela de progresso sem seleção correspondente", r.unmatched)}
### Cartas

| Seleção | Mesa | Jogador (de.wikipedia) | QID | Elo (lista) | Título | Pontos | P aprox. | Força |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${rows.join("\n")}
`;
}

function sampleComparison(results: EditionResult[], persons: Person[]): string {
  const name = (id: string) => persons.find((p) => p.id === id)?.name ?? id;
  const out: string[] = [];
  for (const s of sampleTeams) {
    const r = results.find((x) => x.edition.year === s.year);
    if (!r) continue;
    const t = r.top.find((x) => x.team.countryCode === s.countryCode);
    out.push(`### ${s.countryName} ${s.year}\n`);
    if (!t) {
      out.push(`Fora do top 20 de ${s.year} (amostra: ${s.finalRank}º).\n`);
      continue;
    }
    out.push(`Colocação: amostra ${s.finalRank}º, Wikipedia ${t.team.finalRank}º.\n`);
    out.push("| Mesa | Amostra | Elo | Pontos | Dados | Elo | Pontos |");
    out.push("| --- | --- | --- | --- | --- | --- | --- |");
    s.players.forEach((sp, i) => {
      const c = t.cards[i]?.card;
      out.push(
        `| ${i + 1} | ${sp.name} | ${sp.fide} | ${fmt(sp.points)}/${sp.games} | ` +
          (c
            ? `${name(c.personId)} | ${c.fideRating || "—"} | ${fmt(c.score)}/${c.games} |`
            : "— | — | — |"),
      );
    });
    out.push("");
  }
  return out.length ? out.join("\n") : "Nenhuma seleção da amostra nestas edições.\n";
}

/**
 * Every card without a FIDE rating: each one leaves its team out of the
 * dataset until fixed in overrides.ts (user decision, 2026-11-16).
 */
function pendingFixes(results: EditionResult[]): string {
  const wd = (q: string) => `[${q}](https://www.wikidata.org/wiki/${q})`;
  const rows = results.flatMap((r) =>
    r.top.flatMap((t) =>
      t.cards
        .filter((c) => !c.player.elo)
        .map(({ card, player: p }) => {
          const why = !p.qid
            ? p.candidates.length
              ? `sem QID; busca: ${p.candidates.map(wd).join(", ")} (nenhum com lista na janela, ou mais de um)`
              : "sem QID; busca sem enxadrista"
            : p.entity!.elo.length
              ? `${wd(p.qid)}: nenhuma lista FIDE na janela de 24 meses`
              : `${wd(p.qid)}: o Wikidata não tem o histórico de Elo`;
          return `| ${r.edition.year} | ${teamLabel(t)} | ${card.board} | ${p.name} | ${why} |`;
        }),
    ),
  );
  if (rows.length === 0) return "Nenhuma.\n";
  return `${rows.length} cartas sem Elo; cada uma deixa a sua seleção de fora. Corrigir em \`overrides.ts\` (QID, ou o Elo de uma fonte livre).

| Edição | Seleção | Mesa | Jogador | Situação |
| --- | --- | --- | --- | --- |
${rows.join("\n")}
`;
}

/** Opening books of the world champions (GDD §7.1, pilot of the per-card book). */
function championBooksSection(books: ChampionBooks): string {
  const withBook = books.rows.filter((r) => r.bookFile);
  const bytes = withBook.reduce((s, r) => s + r.bytes, 0);
  const rows = books.rows.map(
    (r) =>
      `| ${r.name} | ${r.cardId} | ${r.games} | ${r.bookFile ? r.entries : "sem livro"} | ` +
      `${r.asWhite.join(", ")} | ${r.vsE4.join(", ")} | ${r.vsD4.join(", ")} |`,
  );
  const pgn = books.pgnStats.map((p) => `${p.file} ${p.kept}/${p.read}`).join(", ");
  return `## Livros de abertura dos campeões mundiais

Piloto do livro por carta (GDD §7.1): as partidas de cada campeão no PGN Mentor até o ano da carta, só os lances dele, até \`bookMaxPlies\` meios-lances. Carta com menos de \`bookMinGames\` partidas fica sem livro.

**Cartas:** ${books.rows.length}, ${withBook.length} com livro. **Tamanho:** ${fmt(Math.round(bytes / 100) / 10)} kB. **Partidas lidas** (aproveitadas/lidas): ${pgn}.

| Campeão | Carta | Partidas | Entradas | De brancas | Contra 1.e4 | Contra 1.d4 |
| --- | --- | --- | --- | --- | --- | --- |
${rows.join("\n")}
`;
}

export function renderReport(
  results: EditionResult[],
  persons: Person[],
  books: ChampionBooks,
): string {
  const unknown = [...new Set(results.flatMap((r) => r.unknownTitles))];
  const cards = results.flatMap((r) => r.top.flatMap((t) => t.cards));
  const pct = (n: number) =>
    `${n}/${cards.length} (${Math.round((100 * n) / (cards.length || 1))}%)`;
  return `# Relatório de validação dos dados olímpicos

Gerado por \`pnpm data:olympiads\` a partir do cache de \`pnpm data:fetch\`. Não editar à mão.

**Edições:** ${results.map((r) => r.edition.year).join(", ")}. **Cartas:** ${cards.length}. Com QID: ${pct(
    cards.filter((c) => c.player.qid).length,
  )}. Com Elo: ${pct(cards.filter((c) => c.player.elo).length)}. Com título: ${pct(
    cards.filter((c) => c.card.title).length,
  )}. **Pessoas:** ${persons.length}.

**Identidade:** o QID vem do link da de.wikipedia; sem link (ou link vermelho), de uma busca do nome no Wikidata, aceita só se exatamente um enxadrista (P106) dos resultados tiver lista FIDE na janela da edição.

**Elo:** a lista FIDE do Wikidata mais recente até o início, até 24 meses antes; sem ela, a primeira até 24 meses depois. **Carta sem Elo deixa a seleção de fora** (ver "Correções pendentes"). Sem tabela de progresso, não há performance e a força é o Elo.

**Performance aproximada:** média, rodada a rodada, do rating do adversário na mesma mesa (ou da média das mesas com Elo da seleção adversária, se esse não tiver Elo) + dp(pontuação). Inclui as rodadas em que o jogador descansou, que a fonte não identifica.

## Correções pendentes

${pendingFixes(results)}
${results.map(editionSection).join("\n")}
## Títulos do Wikidata não reconhecidos (P2962)

${unknown.length ? unknown.map((q) => `- [${q}](https://www.wikidata.org/wiki/${q})`).join("\n") : "Nenhum."}
Fora da tabela \`TITLE_RANK\` (\`wikidata.ts\`): ignorados no título da carta.

${championBooksSection(books)}
## Comparação com a amostra (\`tools/data/sample/source.ts\`)

A amostra foi digitada de memória; em caso de diferença, as fontes prevalecem.

${sampleComparison(results, persons)}`;
}
