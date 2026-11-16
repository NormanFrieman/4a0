# Plano: próximas calibrações (pós-filtro do Stockfish)

**Situação:** replanejado em 2026-11-15, depois do filtro de blunders (GDD §8.1). **Fase A concluída em 2026-11-15** (resultados em `benchmarks.md`, "Regras de fim de partida"); Fases B e C pendentes. Substitui o plano de 2026-11-14 e junta os antigos itens de escada com o filtro, topo da escala, acordo, abandono, simulação rápida e livros de "Benchmarks futuros" em [benchmarks.md](benchmarks.md). Ao concluir cada fase, registre os resultados em `benchmarks.md` e marque a fase como concluída aqui.

## Contexto

Havia três frentes pendentes, em lugares diferentes e numa ordem que deixou de funcionar:

- **Escada com o filtro:** a `engineCalibration` foi medida sem o filtro do Stockfish, que deixa o Maia mais forte.
- **Topo da escala:** em `selfElo` 2600 com T < 1, a força está superestimada (lendas vencem 97–99% com +400).
- **Regras de fim de partida:** abandono, acordo e `quickSim`. O plano anterior foi escrito antes do filtro e também terminava com uma escada nova.

Problemas da ordem antiga:

1. **A escada é o passo mais caro.** Com o filtro, o custo por lance dobra e as partidas ficam ~50% mais longas: as 17 600 partidas levariam ~6–7 h no i7-1165G7. Refazer a escada agora e de novo depois das regras de fim de partida dobraria esse custo.
2. **A varredura antiga dependia da calibração velha.** As células eram cartas convertidas por `toEngineParams`, e o critério era "±3 p.p. da fórmula Elo". As duas coisas dependem da `engineCalibration` desatualizada.
3. **As premissas mudaram.** Com o filtro, os empates já estão em 30–46% e 90–100% das decisivas terminam em mate. O problema principal agora é o **abandono**, não o acordo.

**Objetivo:** rodar a escada **uma vez só**, no fim, com todas as regras que afetam a força já fixadas.

### Sessão de referência

Sessão de teste com a semente `18ya360`, medida antes do filtro (equipe Karpov, Unzicker, Ftáčnik, Tarjan e Velimirović; 28 partidas do usuário, reconstruídas em Node):

| Fim               | Partidas |
| ----------------- | -------- |
| Xeque-mate        | 16       |
| Abandono          | 7        |
| Afogamento        | 3        |
| Tripla repetição  | 2        |
| Empate por acordo | 0        |

Houve abandono na abertura (Bobotsov no 6º lance contra Karpov, Gligorić no 11º), porque a regra de abandono não tem lance mínimo. Mates e afogamentos aparecem em finais que um mestre teria abandonado.

## Decisões do usuário (2026-11-14)

- **Alvo de empates:** curva estimada por força de carta: ~30% em 2400, ~40% em 2550 e ~50% a partir de 2700. Será refinada com dados reais de Olimpíadas na Fase 2 do GDD.
- **Regra nova aprovada:** `resignFromMove`, um lance mínimo para abandonar (GDD §8.2).
- **Não aprovadas por enquanto:** acordo pela probabilidade de empate do Maia (`wdl[1]`) e acordo dependente do estilo. O critério de acordo continua o atual, com a expectativa perto de 0,5; só os números dele podem ser varridos.
- **Compressão da `strengthScale`:** já aprovada (GDD §6).

## Fase A: regras de fim de partida (máquina atual) — CONCLUÍDA

**Resultado:** `resignFromMove` 30, `resignProb` 0,10, `resignStableMoves` 6; acordo mantido (lance 30, faixa 0,08, 10 lances), porque o alvo de empates vale para jogadores de mesma força (decisão do usuário, 2026-11-15). Livro de abertura sem efeito além da margem: a escada roda sem livro. Execução real: ~1h35 (3 600 + 1 200 partidas), com a varredura offline descrita no passo 2.

Pendente desta fase: rodar de novo a sessão `18ya360` e medir a rodada no `/spike` (vão junto com o passo 12).

Não depende da calibração.

1. **Regra e alvo no código e no GDD.**
   - `balance.game.resignFromMove`: ninguém abandona antes desse lance. O valor sai da varredura (expectativa: ~20). A checagem entra em `playGame` (`src/engine/game.ts`), com teste em `game.test.ts`.
   - `balance.game.drawTarget`: a curva de alvo, marcada como estimativa.
   - GDD §8.2 e §8.5: registrar `resignFromMove` como DECIDIDO e a curva como valor inicial.
2. **Ferramenta `pnpm engine:endrules`** (`tools/engine/cli/endrules.ts`), reaproveitando `cli/pool.ts`, `validateWorker.ts` e `blunderCheckOptions` / `blunderCheckFromArgs` (`tools/engine/node.ts`).
   - **Células em parâmetros de engine**, não em cartas: `selfElo` 1800, 2200 e 2600 a T 1, mais 2600 a T 0,8, com diferenças de 0, +200 e +400 de `selfElo`. Assim a varredura não depende da `engineCalibration` velha.
   - **Critério de força relativo:** a pontuação do lado mais forte deve ficar a ±3 p.p. da **mesma célula com as regras atuais** (linha de base medida uma vez, com 400 partidas), em vez da fórmula Elo.
   - **Métricas por célula:** empates por tipo (acordo, repetição, afogamento, material), abandono, mate, duração média, lance do abandono e pontuação do lado mais forte.
   - **Saída:** JSON em `bench-results/`.
3. **Varredura do abandono primeiro:** `resignFromMove`, `resignProb` e `resignStableMoves`, com o acordo fixo. Critérios: nenhum abandono na abertura, mates de final perdido raros, duração média menor (o que ajuda a meta de < 10 s da rodada) e força dentro de ±3 p.p. da linha de base.
4. **Acordo só se necessário:** comparar os empates por nível com o `drawTarget`. Se estiverem a até ~5 p.p. do alvo, não mexer no acordo. Se faltar, varrer `drawOfferFromMove`, `drawBand` e `drawStableMoves`. Se nem assim chegar ao alvo, parar e retomar com o usuário a proposta de acordo por `wdl[1]`.
5. **Livros de abertura (carona):** repetir as células da linha de base com um livro de década (`--white-book` / `--black-book`). Se o livro mudar a força ou os empates além da margem, a escada da Fase B roda com livro.

Triagem com 100 partidas por célula; as 2 ou 3 melhores configurações são confirmadas com 400.

## Fase B: escada única (computador mais potente)

6. **Passo menor entre 1200 e 2000:** com o filtro, a força fica íngreme nessa faixa (1800 vence 1600 por 94,7%). A escada hoje só aceita passo uniforme (`--min/--max/--step`); acrescentar nós a cada 100 nessa faixa.
7. **Cobrir o topo na mesma execução:** `--top-temps` de 1,0 a 0,6 em passos de 0,05 em `selfElo` 2600, encadeados também com 2200 e 2400 a T 1. A opção `--top-temps` já existe em `tools/engine/cli/ladder.ts`; falta conferir se o encadeamento com 2200 e 2400 precisa de código novo.
8. **Rodar** `pnpm engine:ladder --style-temps 0.7,0.9,1.1 --top-temps 1,0.95,0.9,0.85,0.8,0.75,0.7,0.65,0.6` com o filtro, as regras finais da Fase A sem livro (passo 5). Atualizar `balance.engineCalibration` e remover o aviso de desatualizada.

## Fase C: escala, simulação rápida e validação

9. **Comprimir a `strengthScale`:** novos extremos a partir da faixa real medida, para que as cartas fortes não caiam acima do último nó confiável.
10. **Simulação rápida no rating do jogo:** a `quickSim` passa a usar o rating do jogo, e `drawBase`, `drawSlope`, `drawMin` e `drawMax` são ajustados até reproduzir a distribuição vitória/empate/derrota das partidas Maia × Maia do mesmo nível (GDD §6.3).
11. **Validação:** `pnpm engine:validate --game --bands 1000,1400,1800` e `--bands 1800,1900,2000`, com e sem `--styles`. Repetir com sementes novas as células suspeitas (1400+0 sem estilo e 1000+0 combativo).
12. **Navegador:** rodada de 4 partidas no `/spike` com a tolerância e as regras finais (meta < 10 s, GDD §8.3).

## Verificação

- `pnpm test`, `pnpm typecheck` e `pnpm lint` depois de cada mudança de código.
- Fase A: todas as células dentro de ±3 p.p. da linha de base. Rodar de novo a sessão `18ya360` em Node e comparar com a tabela acima.
- Fase C: todas as células do `validate --game` dentro da margem da curva Elo, e as lendas (≥ 1900) sem os 97–99% de antes.
- Resultados de cada fase numa seção nova de `benchmarks.md`, com os dados brutos em `bench-results/`.
