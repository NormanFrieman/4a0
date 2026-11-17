# Plano: caminho até o lançamento

**Situação:** planejado em 2026-11-16, depois da revisão "a versão atual já pode ir para produção?". Resposta: tecnicamente publicável, mas faltavam dados reais, fonte dos livros, calibração, partes do MVP e licença.

## Decisões do usuário (2026-11-16)

1. Dados: as **20 melhores seleções** de cada Olimpíada, de fontes gratuitas e de uso livre, sem o OlimpBase.
2. Livros de abertura: **Lichess**.
3. Nova calibração: **depois** ([plano-calibracao.md](plano-calibracao.md), fases B e C).
4. Um plano para cada parte que falta.
5. **Código aberto, jogo gratuito.**

## Planos e ordem sugerida

| #   | Plano                                                         | Depende de                                                         |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | [Código aberto e jogo gratuito](plano-codigo-aberto.md)       | —                                                                  |
| 2   | [Dados: 20 melhores seleções](plano-dados.md)                 | —                                                                  |
| 3   | [Livros de abertura do Lichess](plano-livros.md)              | 2 (anos das edições); **decisão pendente sobre o livro por carta** |
| 4   | [Campo por faixas de força](plano-mvp-campo-faixas.md)        | 2                                                                  |
| 5   | [Replay e PGN](plano-mvp-replay-pgn.md)                       | —                                                                  |
| 6   | [Retomar sessão e histórico local](plano-mvp-persistencia.md) | 5 (as partidas entram no salvamento)                               |
| 7   | [Modo Almanaque](plano-mvp-modo-almanaque.md)                 | —                                                                  |
| 8   | [Desafio diário](plano-mvp-desafio-diario.md)                 | 6, 7                                                               |
| 9   | [Compartilhamento](plano-mvp-compartilhamento.md)             | 8 (texto do diário)                                                |
| 10  | [Calibração, fases B e C](plano-calibracao.md)                | 2, 3 (a escala precisa da faixa real de forças)                    |

Os itens 5 e 7 não dependem dos dados e podem andar em paralelo com 2 e 3.

## Antes de publicar

- Todos os critérios de aceite do GDD §13.2 marcados.
- ✅ Nome definitivo: "4 a 0" (2026-11-16).
- `pnpm test`, `pnpm typecheck`, `pnpm lint` e `pnpm build` passando, e a meta de < 10 s por rodada medida no `/spike` (GDD §8.3).
