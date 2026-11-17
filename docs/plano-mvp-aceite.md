# Plano: fechar o MVP (critérios de aceite do GDD §13.2)

**Situação:** planejado em 2026-11-17; não iniciado.

## Decisões do usuário (2026-11-17)

- Próxima etapa: fechar o MVP, antes dos livros do Lichess e da calibração B/C.
- Prêmios individuais por mesa (GDD §5.3) entram agora.

## Contexto

No roadmap (`docs/plano-lancamento.md`), os planos 1, 2 e 4–7 estão feitos. Os livros do Lichess estão adiados, com uma decisão pendente, e a calibração B/C vai rodar em outro computador. O que pode ser feito nesta máquina, sem decisão de design pendente, é **fechar o MVP**: 9 dos 12 critérios do §13.2 continuam sem marcar. A maioria parece implementada, mas sem um teste que prove cada critério. O §5.3 prevê **prêmios individuais por mesa**, que não existem no código; o usuário decidiu implementá-los agora (2026-11-17).

Resultado esperado: todos os critérios marcados no GDD, cada um com a evidência registrada (teste ou medição); prêmios individuais no Resultado final; e o checklist "Antes de publicar" executado, com os números anotados.

Novo documento `docs/plano-mvp-aceite.md` (este plano em pt-BR), com uma linha na tabela de `plano-lancamento.md`.

## 1. Critérios: evidência e lacunas

| Critério §13.2                                                     | Já existe                                                                                   | Falta                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Draft: 4 vagas, até 3 re-sorteios, sem repetir pessoa              | `src/draft/draft.test.ts` ("fills… slots", "limits rerolls")                                | Renomear o teste "fills 5 slots" (são `balance.draft.slots` = 4). Testar a mesma pessoa vinda de **outra edição** (§4.3), não só de seleções diferentes                                                                                                                                                           |
| Sorteio por pesos, sem repetir país + edição                       | "favours top teams by roll weight", "never shows a team twice"                              | Confirmar em `draft.ts` que a chave é país + edição (e não só `teamId`). Se for só `teamId`, testar que `teamId` ⇔ país + edição no `v1` (`src/data/v1.test.ts`)                                                                                                                                                  |
| Emparelhamento sem repetição, por grupos de pontuação              | `pairing.test.ts` (sem repetições, 24 × 7)                                                  | Teste de **grupos de pontuação**: depois da rodada 1, cada confronto junta equipes do mesmo grupo de match, ou um flutuante do grupo vizinho (§5.2)                                                                                                                                                               |
| Cada carta na sua mesa, em todas as rodadas                        | draft: "only in the slot of its real board"                                                 | Teste em `tournament.test.ts`: em todas as 7 rodadas, `lineups()`/`boardsFor()` põem a carta da vaga _n_ na mesa _n_, para o usuário e para o campo                                                                                                                                                               |
| Partidas do usuário pelo Maia-3 no worker, com livro quando houver | `localSimulator.test.ts` (livro → engine), `tournament.test.ts` ("through a GameSimulator") | Conferir em `src/app/state/engine.ts` que o app usa `workerPool` e passa `bookFile` quando não é `null`. O `v1` não tem livros: marcar com a nota "caminho do livro testado; dados `v1` sem livros (decisão provisória)"                                                                                          |
| Mesma semente reproduz tudo (WASM)                                 | draft/field/torneio reproduzíveis; `game.test.ts` (seed); `forceWasm` no worker             | Teste de ponta a ponta com a IA falsa: duas sessões `?seed=x` completas (draft automático → campo → 7 rodadas) produzem as mesmas classificações e os mesmos PGNs. Conferir que o app sempre cria o pool com `forceWasm: true`. Checagem manual: o mesmo `?seed=` em dois navegadores dá a mesma primeira partida |
| Classificação, desempates e medalhas                               | `tournament.test.ts` "standings"                                                            | Teste de cada desempate isolado (pontos de partida, Buchholz, confronto direto) com um torneio de exemplo à mão; medalhas só nos 3 primeiros; **prêmios individuais** (seção 2)                                                                                                                                   |
| Todos os valores de balanceamento em `balance.ts`                  | —                                                                                           | Auditoria (seção 3)                                                                                                                                                                                                                                                                                               |

Os critérios já marcados (Mestre, campo, compartilhamento, replay) não mudam.

## 2. Prêmios individuais por mesa (§5.3)

- **Cálculo:** `src/tournament/boardPrizes.ts`, função pura `boardPrizes(ds, state)`. Para cada mesa 1–4, entre todas as cartas que jogaram nela (usuário e campo), o melhor desempenho entre as que têm pelo menos `balance.tournament.boardPrizeMinGames` partidas. Com 7 rodadas e escalação fixa, todas jogam 7. Mesmo assim, o mínimo fica configurável.
- **Desempenho:** mover `approxPerformance` e `dp` de `tools/data/olympiads/compute.ts` para `src/sim/elo.ts` e importar nos dois lugares. O rating do adversário é a força da carta (`cardStrength`, §6.1), a mesma que o jogo mostra.
- **Desempate:** pontos → maior força média dos adversários → `personId`, para que o resultado seja determinístico. Sem sorteio.
- **Balance:** `boardPrizeMinGames` (valor inicial 5), com a linha na tabela do GDD §5.5.
- **Tela:** no `Final.tsx`, uma seção "Melhores por mesa" com nome, bandeira, seleção, pontos/partidas e desempenho. No modo Mestre, o desempenho só aparece no Resultado final, que já é a tela onde a força volta a aparecer. Destacar quando o premiado é do usuário. Textos em `src/i18n/pt-BR.ts`; tokens do Tailwind (`docs/design.md`), reaproveitando `LineupRow`/`Flag`.
- **Testes:** `boardPrizes.test.ts` com um torneio pequeno feito à mão (empate em pontos resolvido pelo desempate, carta abaixo do mínimo excluída). `masterMode.test.tsx` continua passando.
- Compartilhamento: fora deste plano (o §11 não pede).

## 3. Auditoria de números fora do `balance.ts`

- Procurar literais numéricos em `src/` fora de `config/`, testes, `ui/` e `i18n/` (`rg "[^\w.][0-9]+(\.[0-9]+)?" src --glob '!*.test.*'`) e classificar cada um: estrutural (índices, 0/1, tamanho de tabuleiro, formato Polyglot), de layout ou **de balanceamento**. Os de balanceamento vão para `balance.ts`.
- Candidatos já vistos: nenhum confirmado. Atenção a `src/sim/match.ts`, `src/engine/game.ts`, `endRules.ts`, `sampling.ts`, `quickSim.ts` e `field.ts`.
- Registrar o resultado na seção de evidências do `plano-mvp-aceite.md`.

## 4. Checklist "Antes de publicar"

1. `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`.
2. **Rodada no `/spike`** (pendência da Fase A, `docs/benchmarks.md` item 2): medir a rodada de 4 partidas nesta máquina, sem carga paralela, e anotar em `benchmarks.md`. Se ficar acima de 10 s, **registrar e perguntar ao usuário**, sem mudar regras nem `balance`. Ajustar regras só com pedido explícito.
3. **Sessão `18ya360`** de novo (outra pendência da Fase A): finais por tipo, comparados com a tabela de `plano-calibracao.md`, anotados em `benchmarks.md`.
4. Fluxo completo no navegador com `?seed=` fixo, por `pnpm dev` (skill `run`/webapp-testing): draft → resultado, Replay, PGN, compartilhamento e prêmios por mesa.

## 5. Fechamento

- Marcar os critérios no GDD §13.2, cada um com a referência ao teste ou à medição em `plano-mvp-aceite.md`.
- `plano-lancamento.md`: linha 9 "✅ Critérios de aceite do MVP"; `CLAUDE.md` "Estado atual": prêmios por mesa.
- Commits pequenos direto na `main` (testes; prêmios; auditoria; docs).

## Arquivos principais

- Testes: `src/draft/draft.test.ts`, `src/tournament/pairing.test.ts`, `src/tournament/tournament.test.ts`, novo `src/tournament/boardPrizes.test.ts`
- Código: novo `src/tournament/boardPrizes.ts`, `src/sim/elo.ts`, `tools/data/olympiads/compute.ts`, `src/config/balance.ts`, `src/app/screens/Final.tsx`, `src/i18n/pt-BR.ts`
- Docs: `docs/GDD.md` (§5.5, §13.2), `docs/plano-mvp-aceite.md`, `docs/plano-lancamento.md`, `docs/benchmarks.md`, `CLAUDE.md`

## Verificação

- `pnpm test && pnpm typecheck && pnpm lint && pnpm build` passando.
- O teste de ponta a ponta da semente roda duas vezes com o mesmo resultado, e com outra semente o resultado muda.
- No navegador, `/?seed=teste&rapido=1` até o fim mostra os 4 premiados por mesa. Com `?modo=mestre`, a força não aparece antes do Resultado final.
- Tempo de rodada e sessão `18ya360` anotados em `benchmarks.md`.
