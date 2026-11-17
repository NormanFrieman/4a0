# Plano: Desafio diário (GDD §11)

**Situação:** planejado em 2026-11-16. Depende de [plano-mvp-modo-almanaque.md](plano-mvp-modo-almanaque.md) e [plano-mvp-persistencia.md](plano-mvp-persistencia.md). O compartilhamento vem depois ([plano-mvp-compartilhamento.md](plano-mvp-compartilhamento.md)).

**Critério de aceite (§13.2):** "O Desafio diário gera o mesmo conteúdo para todos no mesmo dia e permite uma tentativa."

## Regras (GDD §11)

- **Semente do dia** = hash(data em UTC `AAAA-MM-DD`, versão dos dados).
- **Número do desafio** = dias desde a data de lançamento + 1. A data de lançamento fica numa constante de configuração (não é balanceamento), definida quando o jogo for publicado.
- Modo Almanaque e **sem re-sorteios** (`createDraft(ds, seed, { rerolls: 0 })` já aceita isso).
- **Uma tentativa por dia por navegador**, guardada no `localStorage`.
- **Backend WASM forçado** (§8.4): o worker já tem `forceWasm` (`src/engine/maia.worker.ts`); o diário sempre o liga.

"Mesmo conteúdo para todos" vale para os **sorteios e o campo**, que dependem só da semente. As partidas dependem das escolhas de cada usuário.

## Decisões de comportamento (propostas)

- **Quando a tentativa conta:** ao revelar o primeiro sorteio. Fechar a aba não dá uma tentativa nova: a sessão do diário é retomada (persistência).
- **Virada do dia durante a partida:** a tentativa continua com a semente do dia em que começou.
- **`?rapido=1`** não vale no diário (o resultado tem que ser comparável). **`?seed=`** também não: o diário ignora a URL.
- **Já jogou hoje:** o Início mostra o resultado do dia, o botão de compartilhar e a contagem até o próximo desafio (meia-noite UTC).

## Passos

1. `src/daily/daily.ts` (funções puras): `dailySeed(dateUtc, dataVersion)`, `dailyNumber(dateUtc, launchDate)`, `todayUtc(now)`. Testes: a mesma data dá a mesma semente; datas vizinhas diferem; o número é estável; fuso local não muda nada.
2. **Sessão:** modo `daily` define a semente, o Almanaque, zero re-sorteios e o WASM, e ignora `?seed=`/`?rapido=`.
3. **Registro** `4a0:daily`: `{ number, state: "playing" | "done", result }`, gravado ao revelar o primeiro sorteio e ao terminar.
4. **Início:** botão "Desafio diário nº N", com estado (disponível, em andamento, feito), resultado do dia e contagem.
5. **Teste de reprodutibilidade:** para uma data fixa, os 4 sorteios e o campo são iguais em duas execuções independentes (draft e campo não dependem do engine).
6. Verificação manual: duas abas (uma anônima) na mesma data mostram os mesmos sorteios e o mesmo campo.

## Fora do escopo

Ranking global do dia (pós-MVP, exige backend; §11).
