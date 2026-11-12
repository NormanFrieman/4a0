# Xadrez de Cidades

A fonte de verdade do projeto é [docs/GDD.md](docs/GDD.md). Leia a seção relevante antes de implementar.

- Trabalho de design/UI: comece por [docs/design-brief.md](docs/design-brief.md); registre decisões em `docs/design.md`.
- Medições de desempenho e validação da engine: [docs/benchmarks.md](docs/benchmarks.md).

## Regras (GDD seção 0)

- Decisões marcadas como **DECIDIDO** não mudam sem pedido explícito. Itens em **Questões em aberto** (GDD §13) devem ser perguntados, não presumidos.
- **Todo número de balanceamento** vem de `packages/shared/src/config/balance.ts`. Nunca hardcoded na lógica.
- **Código em inglês, interface em português (pt-BR).** Use os identificadores da coluna "Nome no código" do glossário (GDD §2).
- **Servidor autoritativo.** Regras que afetam recursos, rating ou captura rodam no servidor; o cliente só exibe e envia intenções.
- **Implementar por fases** (GDD §12). Não antecipar funcionalidades pós-MVP.
- **Reutilizar bibliotecas** (chess.js, chessground, maia3-js, Glicko-2) em vez de reimplementar.
- Código de jogo depende da interface `ChessAI` (`packages/engine/src/types.ts`), nunca do Maia diretamente.
- O sorteio de lances usa sempre o `rng` com semente (`packages/shared/src/rng.ts`). Nunca `Math.random()` nem argmax.

## Estado atual

Fase 0 — Fundação: **critério de saída atendido** (nov/2026). Pacotes: `packages/shared`, `packages/engine`, `apps/web` (spike no navegador). Próximo: Fase 1.

- Ratings do jogo estão na escala calibrada (800–2050). Nunca passe um rating do jogo direto como `selfElo`: converta com `engineParamsForRating` (`packages/shared/src/engineParams.ts`).
- Se o modelo ou o sorteio mudarem, meça de novo com `pnpm engine:ladder` e atualize `engineCalibration`.

## Comandos

- `pnpm install`
- `pnpm test` — Vitest em todos os pacotes
- `pnpm typecheck` / `pnpm lint`
- `pnpm engine:play --white 1500 --black 1600 --seed 42`
- `pnpm engine:validate --bands 1500 --games 50`
- `pnpm engine:validate --game --bands 1000,1400,1800` — valida a escala calibrada
- `pnpm engine:ladder` — mede a curva de força do Maia (gera os dados de `engineCalibration`)
- `pnpm engine:bench`
- `pnpm --filter @chesscity/web dev` — página `/spike`
