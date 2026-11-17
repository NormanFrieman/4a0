# Plano: dados completos (20 melhores seleções de cada Olimpíada)

**Situação:** planejado em 2026-11-16. Antecipa parte da Fase 2 do GDD (§13) a pedido do usuário. Substitui a dependência do OlimpBase (§9.1, §14.2).

## Decisões do usuário (2026-11-16)

- **Escopo:** as **20 primeiras seleções** de cada Olimpíada aberta, de 1970 em diante. As demais seleções ficam fora dos dados.
- **Fontes gratuitas e de uso livre**, sem depender do OlimpBase.

## Fontes

Verificadas em 2026-11-16:

| Dado                                                                              | Fonte                                                                      | Licença      | Observação                                                                              |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------- |
| Colocação, escalação na ordem das mesas, V/E/D, pontos e partidas de cada jogador | de.wikipedia, páginas `Mannschaftsaufstellungen der Schacholympiade {ano}` | CC BY-SA 4.0 | Formato uniforme de 1970 a 2026 (as 28 páginas existem). Reservas aparecem com mesa `R` |
| Identidade da pessoa (`personId`)                                                 | Wikidata: o link do jogador na página → QID (`pageprops.wikibase_item`)    | CC0          | O QID é o `personId` estável entre edições                                              |
| Elo FIDE histórico                                                                | Wikidata P1087 com qualificador de data P585                               | CC0          | Karpov tem as listas desde 1971. A lista de 1980-07 tem 1 769 jogadores no Wikidata     |
| Título                                                                            | Wikidata P2962 (título de xadrez), com datas quando houver                 | CC0          | Sem data, usar o título mais alto conhecido até o ano da carta                          |
| Nome exibido                                                                      | Wikidata: rótulo em `pt`, senão em `en`                                    | CC0          | A de.wikipedia usa transliteração alemã ("Karpow"), por isso o nome não sai dela        |
| Edição (cidade, país-sede, rodadas, nº de equipes)                                | de.wikipedia `Schacholympiade {ano}` ou digitação manual (28 linhas)       | CC BY-SA 4.0 | Arquivo-fonte com a referência de cada linha                                            |
| Confrontos por rodada (para a performance)                                        | de.wikipedia `Schacholympiade {ano}/Tabelle`                               | CC BY-SA 4.0 | Confirmar que existe para todas as edições (passo 2)                                    |
| Medalhas individuais por mesa                                                     | en.wikipedia, seção "Individual medals" de cada edição                     | CC BY-SA 4.0 | Lista curta (até 3 por mesa); dá para digitar à mão se o parser não compensar           |

Consequência da CC BY-SA: os arquivos de `public/data/` derivados da Wikipedia são publicados sob **CC BY-SA 4.0**, com atribuição (ver [plano-codigo-aberto.md](plano-codigo-aberto.md)).

## Edições

1970, 1972, …, 2018 (de 2 em 2 anos), 2022, 2024 e 2026: **28 edições**, ~560 seleções e ~2 240 cartas. As Olimpíadas online de 2020 e 2021 ficam fora.

Casos especiais que o pipeline precisa tratar:

- **Equipes B e C do país-sede** (ex.: Índia 2, bronze em 2022). Entram, com o nome real ("Índia 2"), e contam para `fieldMaxPerCountry`.
- **Rodadas e mesas:** até 2006 havia 2 reservas; de 2008 em diante, 1. Só as mesas 1 a 4 entram, como hoje (GDD §4).
- **Desde 2008 a classificação é por pontos de match.** A colocação vem pronta da coluna `Platz`; o pipeline não recalcula.
- **Países históricos:** as predefinições da de.wikipedia (`{{SUN-1980}}`, `{{YUG}}`, `{{CSK}}`, `{{FRG}}`, `{{GDR}}`…) são mapeadas numa tabela manual para `countryCode` e nome em pt-BR (a mesma convenção da amostra, ex.: `su`, `yu`).

## Força de jogo sem performance oficial

A fórmula do GDD §6.1 usa a performance P. As páginas não trazem o adversário de cada partida, só o confronto entre equipes por rodada. Proposta:

- **P aproximada** = média de rating dos adversários + dp(pontuação), em que a média é a das 4 mesas das equipes enfrentadas em todas as rodadas (sem saber em quais rodadas o jogador descansou).
- Se a página `/Tabelle` faltar em alguma edição, usar a média de rating do campo inteiro daquela edição.
- **Sem Elo** (raro no top 20): a regra atual do GDD (performance com k = 1, limitada por `unratedCap`).
- Registrar no GDD §6.1 que P é aproximada.

## Decisividade

O GDD §7.2 usa a taxa de empates da pessoa "em todas as suas partidas no conjunto de dados". As tabelas trazem V/E/D por jogador, então soma-se V/E/D de **todas as participações olímpicas da pessoa**. Isso inclui as edições em que a seleção dela ficou fora do top 20 e as partidas como reserva: mais partidas, menos ruído.

## Pipeline (`tools/data/olympiads/`)

Segue as etapas do GDD §9.2.

1. **Buscar** (`pnpm data:fetch`): baixa o wikitext das páginas (`action=raw`) e as consultas SPARQL do Wikidata para `tools/data/cache/`, fora do git. Grava o **`revid`** de cada página da Wikipedia num manifesto versionado (`tools/data/olympiads/sources.json`). Com o `revid`, uma nova execução reproduz exatamente os mesmos dados. Usa um User-Agent genérico do projeto, uma requisição por vez e respeita o `Retry-After`.
2. **Ler**: um parser do wikitext das tabelas `wikitable` (cabeçalho da seleção + linhas `Brett`). Testado com recortes reais salvos como fixture.
3. **Normalizar**: link → QID; QID → nome, títulos e série de Elo. Para cada carta, usar a lista FIDE mais recente **até o início** da Olimpíada.
4. **Calcular**: performance aproximada, força (§6.1, com `performanceWeight` e `unratedCap` de `balance.ts`), decisividade, `avgStrength`, `rollWeight`.
5. **Validar** (relatório em `tools/data/olympiads/report.md`):
   - jogadores sem QID (link vermelho), sem Elo ou sem título;
   - soma dos pontos das mesas = `Brettp.` da seleção (a soma inclui os reservas);
   - partidas ≤ rodadas;
   - 20 seleções por edição;
   - seleções excluídas por dados incompletos (GDD §4.1).
6. **Publicar** em `public/data/v1/` (`index.json`, `olympiads/{ano}.json`, `persons.json`, `books/`), no formato atual de `src/data/types.ts`. O `note` de "dados de teste" sai.

Correções manuais (nome errado, QID ausente, mesa trocada) ficam em `tools/data/olympiads/overrides.ts`, cada uma com o motivo. O parser nunca é ajustado caso a caso.

## App

- `loadDataset("v1")` no lugar de `"sample"`. A amostra continua como fixture dos testes.
- O torneio volta a usar `balance.tournament.fieldSize` (23). `balance.sampleTournament` passa a ser só dos testes, ou é removido.
- O campo por faixas entra junto: [plano-mvp-campo-faixas.md](plano-mvp-campo-faixas.md).
- Carregamento: `index.json` e `persons.json` no início (~560 seleções e ~1 500 pessoas, algumas centenas de kB). Os arquivos por edição continuam sob demanda.

## Passos

1. Registrar as decisões no GDD (§9.1, §14.1, §14.2) e esta fonte.
2. Prova de conceito com 1980 e 2024: parser, QIDs, Elo e performance. Conferir à mão as 4 primeiras seleções contra a amostra atual.
3. Rodar as 28 edições e revisar o relatório de validação.
4. Publicar `v1`, trocar o app e rodar `pnpm test`, `pnpm typecheck` e `pnpm lint`.
5. Jogar 3 sessões com sementes diferentes e conferir nomes, bandeiras, mesas e forças.

## Fora deste plano

- Livros de abertura: [plano-livros.md](plano-livros.md).
- Olimpíadas femininas e edições anteriores a 1970 (Fase 3).
- Normalização entre épocas (questão em aberto, GDD §14.2).
