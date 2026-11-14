# 4 a 0

Jogo de navegador: o usuário monta uma equipe de 5 enxadristas históricos e disputa uma Olimpíada de Xadrez simulada pelo Maia-3. A fonte de verdade é [docs/GDD.md](docs/GDD.md). Leia a seção relevante antes de implementar.

- Medições de desempenho e calibração da engine: [docs/benchmarks.md](docs/benchmarks.md).
- O projeto antigo (cidade estilo Clash of Clans, "Xadrez de Cidades") foi descartado. Não reintroduzir cidade, recursos, servidor, relógios ou captura.

## Regras (GDD §0)

- Decisões marcadas como **DECIDIDO** não mudam sem pedido explícito. Itens em **Questões em aberto** (GDD §14.2) devem ser perguntados, não presumidos.
- **Todo número de balanceamento** vem de `src/config/balance.ts`. Nunca hardcoded na lógica.
- **Código em inglês, interface em português (pt-BR)** via i18n. Use os identificadores da coluna "Nome no código" do glossário (GDD §2).
- **100% estático no navegador** (GDD §12). Sem backend no MVP.
- **Implementar por fases** (GDD §13). Não antecipar funcionalidades pós-MVP.
- **Reutilizar bibliotecas** (chess.js, chessground, maia3-js) em vez de reimplementar.
- Lógica de jogo depende das interfaces `ChessAI` / `GameSimulator` / `QuickSimulator` (`src/engine/types.ts`), nunca do Maia diretamente.
- Todo sorteio usa o `rng` com semente (`src/rng/rng.ts`). Nunca `Math.random()` nem argmax.
- Força de jogo nunca vai direto para `selfElo`: converta com `toEngineParams` (`src/engine/strength.ts`), que passa pela escala calibrada (GDD §6.2).
- Se o modelo ou o sorteio mudarem, meça de novo com `pnpm engine:ladder` e atualize `engineCalibration`.

## Estado atual

Migração do projeto antigo para o 4 a 0 (plano em 7 etapas: docs → estrutura → engine §8 → força/estilo → worker → recalibração → dados de amostra). Depois: Fase 1 do GDD.

## Comandos

- `pnpm install`
- `pnpm test` — Vitest
- `pnpm typecheck` / `pnpm lint`
- `pnpm dev` — app (Vite); `/spike` é a página de teste da engine no navegador
- `pnpm engine:play --white 1500 --black 1600 --seed 42`
- `pnpm engine:validate --game --bands 1000,1400,1800` — valida a escala calibrada
- `pnpm engine:ladder` — mede a curva de força do Maia (gera `engineCalibration`)
- `pnpm engine:bench`
