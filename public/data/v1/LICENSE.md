# Dados olímpicos (v1): licença e origem

Os arquivos desta pasta (`index.json`, `persons.json`, `olympiads/`) são gerados por `pnpm data:olympiads --publish` a partir das fontes abaixo. Não editar à mão: as correções ficam em `tools/data/olympiads/overrides.ts`.

- **Escalações, colocações, pontos e partidas:** Wikipedia em alemão, páginas `Mannschaftsaufstellungen der Schacholympiade {ano}` e `Schacholympiade {ano}/Tabelle`, sob [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). As revisões usadas estão fixadas em `tools/data/olympiads/sources.json`.
- **Identidade, nomes, títulos e Elo FIDE histórico:** [Wikidata](https://www.wikidata.org/), sob [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
- **Força de jogo, decisividade e pesos de sorteio:** calculados pelo 4 a 0 (GDD §6.1 e §7.2). A performance é aproximada (ver `docs/plano-dados.md`).

**Licença destes arquivos:** [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Atribuição: "4 a 0, a partir da Wikipedia (de.wikipedia.org, CC BY-SA 4.0) e do Wikidata (CC0)".

**Limitações desta versão:**

- As 20 primeiras seleções de cada Olimpíada aberta de 1970 a 2026 (sem 2020 e 2021). Seleções com alguma carta sem Elo ficam de fora (42 de 560; lista em `tools/data/olympiads/report.md`).
- Sem livros de abertura: as partidas começam do primeiro lance (`docs/plano-livros.md`).
- Sem medalhas individuais.

Nomes de pessoas reais aparecem como fato histórico. O jogo não tem ligação com a FIDE nem com os jogadores.
