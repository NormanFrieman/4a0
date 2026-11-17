# 4 a 0

Jogo de navegador, gratuito e de código aberto: você monta uma equipe de quatro enxadristas históricos, sorteados de seleções reais das Olimpíadas de Xadrez, e disputa um torneio contra outras seleções. As partidas são jogadas lance a lance pelo [Maia-3](https://github.com/CSSLab), uma IA treinada para jogar como pessoas de cada nível.

> **Estado:** em desenvolvimento (Fase 1 do [GDD](docs/GDD.md)), com os dados `v1`: as 20 primeiras seleções de cada Olimpíada de 1970 a 2026.

## Como rodar

Requisitos: Node.js 22 ou mais recente e [pnpm](https://pnpm.io/) 10.

```sh
pnpm install
pnpm data:pgn      # coleções PGN para os livros de abertura (só desenvolvimento)
pnpm data:sample   # gera os dados de teste e os livros em public/data/sample/
pnpm dev           # http://localhost:5173
```

Os livros de abertura (`public/data/sample/books/`) não fazem parte do repositório. Sem eles, o jogo para com erro na primeira rodada. O modelo do Maia-3 (variante de 5M parâmetros, cerca de 22 MB) é baixado pelo navegador na primeira partida.

Parâmetros úteis na URL: `?seed=123` reproduz uma sessão; `?rapido=1` simula as partidas sem o Maia.

## Comandos

| Comando                        | O que faz                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| `pnpm test`                    | Testes (Vitest)                                                                      |
| `pnpm typecheck` / `pnpm lint` | Tipos e lint                                                                         |
| `pnpm build`                   | Gera `dist/` para hospedagem estática (Cloudflare Pages)                             |
| `pnpm engine:*`                | Ferramentas da engine: partidas, calibração, benchmarks (ver [CLAUDE.md](CLAUDE.md)) |

## Estrutura

- `src/app/`: interface (React), telas e design system (`src/app/ui/`, ver [docs/design.md](docs/design.md))
- `src/engine/`: Maia-3 e Stockfish em Web Workers, simulação das partidas
- `src/draft/`, `src/tournament/`, `src/sim/`: regras do jogo
- `src/config/balance.ts`: todos os números de balanceamento
- `src/i18n/`: textos da interface (pt-BR)
- `tools/`: geração de dados e ferramentas de linha de comando da engine
- `docs/`: [GDD](docs/GDD.md) (fonte de verdade), planos e medições

## Licenças

- **Código:** [GNU AGPL-3.0-or-later](LICENSE). O jogo distribui os pesos do Maia-3 (AGPLv3) ao navegador. Por isso o código-fonte de cada versão publicada fica disponível: o link "Código-fonte" no rodapé do jogo leva ao commit exato.
- **Dados:** CC BY-SA 4.0 (ver [public/data/sample/LICENSE.md](public/data/sample/LICENSE.md)).
- **Terceiros:** [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

O jogo é gratuito, sem anúncios nem pagamentos, e não tem ligação com a FIDE nem com os jogadores. Nomes de pessoas reais aparecem como fato histórico, sem fotos.
