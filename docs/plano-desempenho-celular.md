# Plano: desempenho no celular

**Status:** tarefas 1 e 2 feitas em 2026-11-17 (medição em [benchmarks.md](benchmarks.md), "Celular Android"). Próxima: tarefa 3.

## Problema

No celular, as partidas da rodada andam muito mais devagar que no desktop: os tabuleiros param esperando o próximo lance.

Na rodada, o celular calcula cada meio-lance dos 4 tabuleiros: uma inferência do Maia-3 5M (ONNX em WASM) e uma busca do Stockfish de 5 000 nós (filtro de blunders, GDD §8.1, ~2× o custo do lance). No desktop (Ryzen 5 PRO 4650G), a rodada leva ~8 s, cerca de 10 meios-lances/s por tabuleiro ([benchmarks.md](benchmarks.md)). O replay a 1× consome ~1,4 meio-lance/s (`balance.playback.msPerPly.normal = 700`). Num celular médio, 5–10× mais lento nessa carga, o cálculo fica atrás do replay.

## Causas prováveis (não medidas)

1. ~~**Excesso de threads**~~ **descartada pela medição:** o Stockfish roda entre as inferências do Maia, nunca junto, e 4 × 1 foi ~23% mais lento que 4 × 2. Texto original: (`src/engine/workerPool.ts`): com `hardwareConcurrency = 8`, o pool abre 4 workers × 2 threads do ORT, e cada worker ainda abre o seu Stockfish (`src/engine/maia.worker.ts`). São 12 threads para 8 núcleos, metade deles núcleos "LITTLE", mais lentos. A divisão das partidas entre os workers é fixa, então o worker mais lento atrasa a rodada.
2. **Aquecimento térmico:** com CPU cheia por minutos, o celular baixa o clock, e as rodadas seguintes ficam mais lentas que a primeira.
3. **iPhone/iPad:** o isolamento cross-origin depende de `COEP: credentialless` (`public/_headers`), que o Safari provavelmente não implementa. Sem isolamento, o ORT roda numa thread só por worker. Conferir `crossOriginIsolated` no `ready` do worker.
4. **Thread principal** (`src/app/state/session.ts`, `startRound`): cada lance recebido gera um `set` que copia o array e re-renderiza 4 tabuleiros.
5. **Aba em segundo plano ou tela apagada:** o navegador congela os workers.

## Restrição

O `?seed=` precisa reproduzir a mesma partida em qualquer aparelho, e a calibração depende do filtro como está. Por isso, **nada pode mudar a escolha dos lances**: menos nós no Stockfish só no celular, desligar o filtro, WebGPU e outro modelo estão fora. Só entram agendamento e interface.

## Tarefas

1. ✅ **Medir:** `pnpm dev --host`, abrir `/spike` num celular Android médio e num iPhone pela rede local e preencher a linha "Celular médio" de [benchmarks.md](benchmarks.md) (incluindo `crossOriginIsolated`). Usar a depuração remota do Chrome para o perfil dos workers.
2. ✅ **Dimensionar o pool sem excesso de threads** (resultado: o padrão 4 × 2 já está certo; o `/spike` ganhou `?workers=` e `?threads=` para comparar configurações): contar o Stockfish no orçamento de núcleos e usar 1 thread do ORT por worker quando houver poucos núcleos ou não houver isolamento (por exemplo, 2 workers × 1 thread no celular). O determinismo com contagens de threads diferentes já foi conferido; repetir o hash dos PGNs.
3. **Começar o cálculo antes:** iniciar as partidas assim que o emparelhamento for conhecido, enquanto o usuário ainda está na tela anterior.
4. **Agrupar as atualizações da interface:** acumular os lances recebidos e aplicá-los no `tick` do replay, em vez de um `set` por lance.
5. **Interface:** ✅ Wake Lock da tela enquanto a rodada não termina (`src/app/wakeLock.ts`, 2026-11-17). Falta indicar "calculando…" no tabuleiro que espera lance.

Ordem sugerida: 1 e 2 primeiro (baratos; a medição diz quanto vale o resto).

**Depois da medição:** num Android de 8 núcleos o cálculo sai a ~1,46 meio-lance/s por tabuleiro, praticamente o ritmo do replay a 1× (1,43/s). Não há folga, então a tarefa 3 (começar antes e formar um estoque de lances) é a que mais rende, seguida da 5 (indicar a espera).
