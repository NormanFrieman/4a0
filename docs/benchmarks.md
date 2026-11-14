# Benchmarks — Fase 0

Máquina de desenvolvimento: Windows 11, 12 núcleos lógicos, Node 22.17, onnxruntime-node 1.31.1, maia3-js 0.2.0.

## Servidor (Node) — `pnpm engine:bench`

Partidas Maia×Maia a 1500, temperatura 1. Latência = uma chamada `chooseMove` (inclui reconstrução do histórico pelo maia3-js e o nosso sorteio). O tempo de carga do 23M/79M inclui o download inicial do Hugging Face.

| Variante | Carga | p50/lance | p95/lance | RSS após carga |
| --- | --- | --- | --- | --- |
| 5M (embutida) | 0,5 s | 20 ms | 27 ms | +60 MB |
| 5M, 1 thread ORT | 0,5 s | 23 ms | 27 ms | +59 MB |
| 23M | 4,9 s* | 31 ms | 39 ms | +133 MB |
| 79M | 21 s* | 62 ms | 70 ms | +329 MB |

\* inclui download. Os modelos baixados ficam em cache em `models/` na raiz do repositório (ignorado pelo git; configurável com `MAIA3_MODEL_DIR`).

Vazão com paralelismo de partidas (10 workers, 1 thread ORT cada, 5M): ~0,7 s por partida completa → ~5 000 partidas/hora numa máquina de 12 núcleos.

Conclusões:

- O 5M é rápido o suficiente para o MVP com folga: uma partida inteira de IA (≈80 meios-lances) custa ~2 s de CPU, contra ~10 min de relógio simulado.
- Escalar por partidas paralelas (1 thread por worker) rende mais que dar várias threads a uma partida.

## Navegador — página `/spike`

`pnpm dev` e abrir `http://localhost:5173/spike`. Os números abaixo devem ser preenchidos em notebook e celular médios ("Copiar métricas").

| Dispositivo | Variante | Download | Init sessão | 1º lance | p50/lance | p95/lance | Heap JS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Desktop dev (12 núcleos, Chrome 157, isolado†) | 5M (22 MB) | 4,4 s | 3,0 s | 231 ms | 55 ms | 72 ms | 54 MB |
| Notebook médio | 5M | _a medir_ | | | | | |
| Celular médio | 5M | _a medir_ | | | | | |
| Desktop dev | 23M | _a medir_ | | | | | |

† Medido **enquanto a validação rodava em 10 workers** no mesmo PC: a latência provavelmente está inflada. Repetir com a máquina ociosa. A partida (134 meios-lances) levou 8,6 s.

Leitura inicial: no navegador, o 5M é ~2,7× mais lento por lance que no Node, mas ainda bem abaixo do necessário para replay, análise e treino livre (GDD §10.6). O custo real está na primeira carga (~7 s entre download e inicialização). Nas visitas seguintes, o download sai do Cache Storage.

## Navegador — workers, rodada de 4 partidas (GDD §8.3)

Página `/spike`, botão "Jogar rodada (4)": 4 partidas com sementes `<semente>/r1/b<mesa>`, ratings do jogo 1700×1650 descendo 50 por mesa, top-p 0,95, regras de acordo/abandono com os valores iniciais. Medido em 2026-11-14 com Chromium 156 headless (Linux), só WASM, isolado.

Máquina: notebook i7-1165G7 (4 núcleos / 8 threads), 32 GB.

| Configuração | Rodada (386 meios-lances) | p50/lance (partida isolada) | Init da sessão |
| --- | --- | --- | --- |
| 1 worker, threads padrão (4) | 12,1–14,5 s | 33 ms | 2,5 s |
| 4 workers × 1 thread | 12,7–14,1 s | 78 ms | 2,6 s |
| 4 workers × 2 threads (padrão atual do pool) | 12,4–14,5 s | 47 ms | 2,6 s |

- **Determinismo:** as 3 configurações produziram exatamente os mesmos 4 PGNs (mesmo hash), inclusive com contagens de threads diferentes.
- **Meta de < 10 s não atingida** nesta máquina. O custo é limitado pela CPU total (soma dos lances), não pelo paralelismo: paralelizar por partida não ganhou nada em 4 núcleos físicos. A rodada medida tem partidas longas (média de ~97 meios-lances); o ajuste do empate por acordo e do abandono (etapa 6) deve encurtá-las.
- Como a interface reproduz os lances num ritmo bem mais lento que o cálculo (§8.3), a espera só aparece em "instantâneo" e "Pular".
- Download do modelo: ~3 s (22 MB, primeira visita); depois vem do Cache Storage.

## Validação de força (GDD §12.1) — `pnpm engine:validate`

Maia-3 5M, 200 partidas por célula, cores alternadas, sementes `validate/<célula>/t<T>/<n>`. Margem de ~±6 p.p. por célula. Dados brutos em `bench-results/`.

### Rating vs força (temperatura 1, top-p 1)

| Faixa | +0 | +100 (esp. 64%) | +200 (esp. 76%) | +400 (esp. 91%) | Δ efetivo do +400 | Empates |
| --- | --- | --- | --- | --- | --- | --- |
| 900 | 45,3% | 54,5% | 68,3% | 82,8% | ~270 | ~11% |
| 1500 | 52,0% | 53,8% | 64,3% | 73,5% | ~180 | ~10% |
| 2100 | 53,5% | 54,0% | 58,5% | 69,3% | ~140 | ~11% |

Nenhuma partida chegou à adjudicação (média de 64 a 99 meios-lances).

**Conclusão:** o rating é monotônico (mais rating = mais pontos), mas a escala sai **comprimida**: só ~35–70% da diferença nominal aparece no resultado, e a compressão piora nas faixas altas. **Não atende** ao critério de saída da Fase 0 com T=1.

### Estilo: sólido (T=0,6) vs criativo (T=1,1), mesmo rating

| Faixa | Pontuação do sólido | Δ efetivo |
| --- | --- | --- |
| 900 | 80,5% | ~+250 |
| 1500 | 83,8% | ~+285 |
| 2100 | 78,0% | ~+220 |

**Conclusão:** a temperatura pesa mais que o próprio rating. Entre dois enxadristas de mesmo rating, a diferença de temperatura (0,6 vs 1,1) vale ~250 pontos, mais do que 400 pontos de rating nominal em 2100. Duas consequências:

1. **A compressão vem, pelo menos em boa parte, do sorteio com T=1.** O ruído dos lances improváveis nivela os jogadores. Hipótese a testar: com temperatura menor, a escala de rating se abre.
2. **O atributo Estilo, como está em `balance.ts`, quebra o balanceamento.** Um enxadrista "sólido" seria muito mais forte que um "criativo" do mesmo rating. A faixa de temperaturas precisa ser bem mais estreita, ou o Estilo precisa compensar no `selfElo`.

### Hipóteses testadas: temperatura e tamanho do modelo

Faixas 1500 e 2100, 150 partidas por célula (±7 p.p.). Pontuação do mais forte:

| Configuração | 1500 +200 | 1500 +400 | 2100 +200 | 2100 +400 |
| --- | --- | --- | --- | --- |
| Esperado (Elo) | 76% | 91% | 76% | 91% |
| 5M, T=1,0 | 64% | 74% | 59% | 69% |
| 5M, T=0,8 | 60% | 73% | 60% | 70% |
| 5M, T=0,6 | 53% | 73% | 54% | 64% |
| 23M, T=1,0 | 62% | 72% | 57% | 72% |

**Conclusão:** nem baixar a temperatura nem usar o modelo 23M abre a escala. A compressão é uma característica do condicionamento por rating do Maia-3. A temperatura desloca a força absoluta, mas não amplia as diferenças de rating. **Decisão: manter o 5M** (mais rápido e menor) e calibrar uma curva rating do jogo → parâmetros da engine (`pnpm engine:ladder`).

### Escada de calibração (5M) — força real por `selfElo` e temperatura

25 pares × 200 partidas (5 000 partidas). Ratings ajustados por máxima verossimilhança (`calibration/fitElo.ts`). A escala é relativa; aqui ancorada para que o Maia 1500 a T=1 valha **1500 real**.

| `selfElo` | T | Força real | Δ para o nível anterior |
| --- | --- | --- | --- |
| 600 | 1,3 | ~770 | — |
| 600 | 1,0 | ~965 | +195 |
| 800 | 1,0 | ~1125 | +158 |
| 1000 | 1,0 | ~1255 | +133 |
| 1200 | 1,0 | ~1370 | +116 |
| 1400 | 1,0 | ~1465 | +95 |
| 1600 | 1,0 | ~1535 | +67 |
| 1800 | 1,0 | ~1630 | +97 |
| 2000 | 1,0 | ~1710 | +78 |
| 2200 | 1,0 | ~1780 | +71 |
| 2400 | 1,0 | ~1850 | +71 |
| 2600 | 1,0 | ~1870 | +21 |
| 2600 | 0,8 | ~1995 | +124 |
| 2600 | 0,6 | ~2065 | +71 |

Leitura:

- No T=1, os 2 000 pontos nominais (600–2600) valem só **~900 pontos reais**. A compressão é suave embaixo (~80% abaixo de 1200) e forte em cima (~35% acima de 1600), com saturação entre 2400 e 2600.
- A temperatura estende a faixa: **+~200 no topo** (2600 a T=0,6) e **−~195 na base** (600 a T=1,3). A faixa total alcançável fica em **~770–2065, cerca de 1 300 pontos reais**.
- Não existe mapeamento que faça a faixa nominal de 2 000 pontos se comportar como Elo: falta alcance. **Decisão:** o rating do jogo passa a ser a força real (escala 800–2050), convertida em parâmetros da engine pela tabela `engineCalibration` (GDD §4).

### Verificação da escala calibrada — `pnpm engine:validate --game`

Ratings do jogo convertidos via `engineCalibration`, com sementes novas (independentes da escada), 200 partidas por célula:

| Faixa | +0 (esp. 50%) | +200 (esp. 76%) | +400 (esp. 91%) |
| --- | --- | --- | --- |
| 1000 | 54,0% | 73,5% | 90,5% |
| 1400 | 47,0% | 74,5% | 87,8% |
| 1800 | 49,0% | 76,0% | 88,0% |

**Todas as células estão dentro da margem de erro (±4–7 p.p.) da curva Elo.** O critério de saída da Fase 0 (GDD §12.1) é atendido com a escala calibrada.

## Recalibração com grade de estilo (migração 4 a 0, 2026-11-14)

`pnpm engine:ladder --style-temps 0.7,0.9,1.1`: 88 pares × 200 partidas = 17 600 partidas (2h17 em 6 workers, i7-1165G7), top-p 0,95, empate por acordo e abandono ligados (valores iniciais do GDD §8.5). Âncora mantida: Maia 1500 a T=1 = 1500 (deslocamento de −95 sobre a âncora pela média). Dados brutos: `bench-results/ladder-5m-2026-11-14T17-20-23-826Z.json`. A grade está em `balance.engineCalibration`.

### Força real por `selfElo` e temperatura

| `selfElo` | T 0,7 | T 0,9 | T 1,0 | T 1,1 |
| --- | --- | --- | --- | --- |
| 600 | 1070 | 980 | 940 | 885 |
| 1000 | 1375 | 1310 | 1250 | 1200 |
| 1400 | 1595 | 1495 | 1445 | 1405 |
| 1800 | 1760 | 1670 | 1645 | 1585 |
| 2200 | 1885 | 1855 | 1790 | 1745 |
| 2600 | 2005 | 1930 | 1885 | 1840 |

Extremos: 600 a T 1,3 = 735; 2600 a T 0,8 = 1980; 2600 a T 0,6 = 2065.

- **Estilo:** no mesmo `selfElo`, T 0,7 vale ~140–200 pontos a mais que T 1,1. A compensação (`engineParamsForStyle`) dá ao combativo 200 ou mais pontos de `selfElo` acima do sólido de mesmo rating.
- **Alcance por estilo:** T 1,1 chega no máximo a ~1840 (força de carta ~2650 pela `strengthScale`); T 0,7 começa em ~1070. Fora disso, a temperatura cede à força (GDD §7.2).
- **Fim das partidas por nível (`selfElo` 600 → 2600):** empates de 10% a 18%, acordo de 1% a 3%, abandono de 0% a 22%. Média de 84 meios-lances. **O empate por acordo quase não acontece com os valores iniciais**, e a taxa de empates fica bem abaixo da de xadrez de alto nível. Ajuste pendente: falta definir a taxa alvo.

### Validação — `pnpm engine:validate --game` (200 partidas por célula, ±4–7 p.p.)

Pontuação do lado mais forte. "Sólido" = T 0,7 e "combativo" = T 1,1, ambos com `selfElo` compensado.

| Célula | Esperado | Sem estilo | Sólido mais forte | Combativo mais forte |
| --- | --- | --- | --- | --- |
| 1000 +0 | 50% | 48,0% | 48,8% | 58,3% |
| 1000 +200 | 76% | 78,5% | 76,8% | 76,0% |
| 1000 +400 | 91% | 89,8% | 90,3% | 89,3% |
| 1400 +0 | 50% | 39,3% | 50,5% | 49,8% |
| 1400 +200 | 76% | 73,3% | 78,0% | 68,0% |
| 1400 +400 | 91% | 87,3% | 90,8% | 89,5% |
| 1800 +0 | 50% | 47,3% | 51,2% | 45,0% |
| 1800 +200 | 76% | 82,5% | 78,8% | **86,8%** |
| 1800 +400 | 91% | **98,8%** | **96,8%** | **94,8%** |

- **Até ~1850 a escala e a compensação de estilo funcionam:** quase todas as células estão dentro da margem, e sólido × combativo de mesmo rating fica perto de 50%. Os desvios isolados (1400+0 sem estilo; 1000+0 e 1400+200 combativo) estão perto do limite da margem e não seguem um padrão.
- **Acima de ~1885 (`selfElo` 2600, força vinda de T < 1) a força é superestimada:** quem está nessa região vence demais (97–99% com +400; 87% com +200 quando o combativo passa do seu teto). Essa parte da grade tem poucos nós medidos. **Pendente:** medir mais pontos de T entre 0,6 e 1,0 em `selfElo` 2600, ou comprimir a `strengthScale` para que menos cartas caiam nessa região.

## Benchmarks futuros (ideias anotadas)

Medições a fazer, em ordem aproximada de prioridade. Ao concluir uma, registre os resultados numa seção própria acima e remova o item daqui.

1. **Topo da escala (`selfElo` 2600, T < 1).** A validação mostrou força superestimada acima de ~1885 (lendas vencem demais). Medir temperaturas de 1,0 a 0,6 em passos de 0,05 em `selfElo` 2600, cada nó contra os vizinhos e contra o topo da curva T=1 (2200 e 2400). São ~20 pares × 200 partidas (~35 min nesta máquina). Depois, repetir `engine:validate --game --bands 1800,1900,2000` com e sem `--styles`.
2. **Taxa de empates e empate por acordo.** Plano detalhado (itens 2 a 4), com as decisões já tomadas: [calibracao-fim-de-partida.md](calibracao-fim-de-partida.md). Depende de definir a taxa alvo por nível (de preferência a partir de dados reais de Olimpíadas). Varrer `drawOfferFromMove`, `drawBand` e `drawStableMoves` e medir empates, acordos e duração. Depois, refazer a escada se a força mudar (acordo frequente comprime a escala).
3. **Abandono.** Conferir se `resignProb` 0,05 e `resignStableMoves` 6 deixam as partidas com duração plausível, e se o abandono não muda a força medida (comparar `--pure` com regras ligadas na mesma célula).
4. **Simulação rápida coerente com o Maia.** Com as taxas de empate do item 2, ajustar `drawBase`, `drawSlope`, `drawMin` e `drawMax` (`balance.quickSim`) até que a simulação por Elo reproduza a distribuição vitória/empate/derrota das partidas Maia × Maia do mesmo nível.
5. **Rodada no navegador < 10 s (GDD §8.3).** Repetir a rodada de 4 partidas depois dos itens 2 e 3 (partidas mais curtas). Medir num notebook médio e num celular médio (tabela "Navegador" acima), e no desktop sem carga paralela.
6. **Configuração do grupo de workers.** Comparar 1 × 4 threads, 2 × 2, 4 × 1 e 4 × 2 em máquinas com 4, 8 e 12+ núcleos, medindo tempo de rodada e memória (4 sessões ONNX). Definir `defaultPoolSize` e `defaultThreadsPerWorker` a partir disso.
7. **Determinismo entre navegadores e dispositivos (GDD §8.4).** Mesma semente em Chrome, Firefox e Safari, desktop e celular, e com contagens de threads diferentes: os PGNs devem ser idênticos no modo só WASM. Medir também o quanto a WebGPU diverge.
8. **Modelo 23M (`maiaModelVariant`, "testar 23m").** Repetir escada e validação com o 23M para ver se a compressão no topo diminui, e medir o custo no navegador (download, latência, rodada).
9. **Estilo com temperaturas intermediárias.** A grade tem T 0,7, 0,9, 1,0 e 1,1; T 0,8 e 1,0 são interpolados. Validar sólido × combativo com estilos intermediários (ex.: `--styles 0.8,1.0`) e, se necessário, medir T 0,8 em toda a escada.
10. **Livros de aberturas.** Quando houver livros (etapa 7), medir se partidas com livro mudam a força ou a taxa de empates em relação às sem livro, na mesma célula.
11. **Repetir células suspeitas.** 1400+0 sem estilo (39,3%) e 1000+0 combativo (58,3%) ficaram perto do limite da margem. Repetir com sementes novas para confirmar que foi flutuação estatística.
