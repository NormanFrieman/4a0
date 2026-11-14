# Plano: calibração das regras de fim de partida

**Situação:** planejado em 2026-11-14, ainda não iniciado. Cobre os itens 2, 3 e 4 de "Benchmarks futuros" em [benchmarks.md](benchmarks.md). Ao concluir, registre os resultados em `benchmarks.md` e marque este plano como concluído.

## Contexto

As partidas do Maia não se parecem com xadrez olímpico. Na sessão de teste com a semente `18ya360` (equipe Karpov, Unzicker, Ftáčnik, Tarjan e Velimirović; 28 partidas do usuário, reconstruídas em Node), os finais foram:

| Fim               | Partidas |
| ----------------- | -------- |
| Xeque-mate        | 16       |
| Abandono          | 7        |
| Afogamento        | 3        |
| Tripla repetição  | 2        |
| Empate por acordo | 0        |

- Só 18% de empates, contra perto de metade no topo das Olimpíadas reais. A escada de nov/2026 já mostrava 10–18% de empates e 1–3% de acordos.
- Houve abandono na abertura: Bobotsov abandonou no 6º lance contra Karpov, e Gligorić no 11º. Com diferença grande de força, o Maia já prevê a derrota desde o início, e a regra de abandono não tem lance mínimo.
- Mates e afogamentos aparecem em finais que um mestre teria abandonado.

**Objetivo:** chegar a taxas de empate, abandono e duração plausíveis **sem mudar a força medida** das cartas.

## Decisões do usuário (2026-11-14)

- **Alvo de empates:** uma curva estimada agora, por força de carta: ~30% em 2400, ~40% em 2550 e ~50% a partir de 2700. Será refinada com dados reais de Olimpíadas na Fase 2.
- **Regra nova aprovada:** `resignFromMove`, um lance mínimo para abandonar (GDD §8.2).
- **Não aprovadas por enquanto:** acordo pela probabilidade de empate do Maia (`wdl[1]`) e acordo dependente do estilo. O critério de acordo continua o atual, com a expectativa perto de 0,5; só os números dele são varridos.

## Etapas

### 1. Regra e alvo no código e no GDD

- `balance.game.resignFromMove`: ninguém abandona antes desse lance. O valor sai da varredura (expectativa: ~20). A checagem entra em `playGame` (`src/engine/game.ts`), com teste em `game.test.ts`.
- `balance.game.drawTarget`: a curva de alvo por força de carta, marcada como estimativa.
- GDD §8.2 e §8.5: registrar `resignFromMove` como DECIDIDO e a curva como valor inicial.

### 2. Ferramenta de varredura: `pnpm engine:endrules`

Novo CLI em `tools/engine/cli/endrules.ts`, que reaproveita o pool de workers (`cli/pool.ts`) e a estrutura de `validate.ts`.

- **Células:** as forças que o jogo usa, com cartas de ~2400 a ~2750 convertidas por `toEngineParams` (inclui temperatura abaixo de 1 no topo). Diferenças de 0, 100 e 200.
- **Métricas por célula:** empates (acordo, repetição, afogamento), abandono, mate, duração média, lance do abandono e pontuação do lado mais forte.
- **Saída:** JSON em `bench-results/`.

### 3. Varredura em duas etapas

- **A, abandono:** varrer `resignFromMove`, `resignProb` e `resignStableMoves`, com o acordo fixo. Critérios: nenhum abandono na abertura, afogamentos e mates de final perdido raros, e a pontuação do mais forte dentro de ±3 p.p. da fórmula Elo.
- **B, acordo:** com o abandono escolhido, varrer `drawOfferFromMove`, `drawBand` e `drawStableMoves`, minimizando a distância até a curva de alvo, com o mesmo limite de ±3 p.p. na força.
- Cada etapa roda com 100 partidas por célula; as 2 ou 3 melhores configurações são confirmadas com 400.
- **Se só os números não alcançarem o alvo:** parar, apresentar os dados e retomar com o usuário a proposta de acordo pela probabilidade de empate.

### 4. Recalibração obrigatória

Acordo frequente comprime a escala de força, então:

- `pnpm engine:ladder --style-temps 0.7,0.9,1.1` para nova `engineCalibration` (~2h20 nesta máquina).
- `pnpm engine:validate --game --bands 1000,1400,1800` e uma célula no topo.
- `balance.quickSim` (`drawBase`, `drawSlope`, `drawMin`, `drawMax`): a simulação rápida do campo deve reproduzir as taxas de empate do Maia no mesmo nível (GDD §6.3).

### 5. Verificação

- `pnpm test`, `pnpm typecheck` e `pnpm lint`.
- Rodar de novo a sessão `18ya360` em Node e comparar com a tabela do contexto.
- Medir o tempo da rodada no `/spike`, com meta de menos de 10 s (GDD §8.3). Partidas mais curtas devem ajudar.
- Registrar os resultados numa seção nova de `benchmarks.md`.

**Tempo de máquina estimado:** ~4–5 h (varreduras ~2 h, escada ~2h20, validação ~30 min), em segundo plano.
