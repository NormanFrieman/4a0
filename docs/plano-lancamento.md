# Plano: caminho até o lançamento

**Situação:** planejado em 2026-11-16, depois da revisão "a versão atual já pode ir para produção?". Resposta: tecnicamente publicável, mas faltavam dados reais, fonte dos livros, calibração, partes do MVP e licença.

## Decisões do usuário (2026-11-16)

1. Dados: as **20 melhores seleções** de cada Olimpíada, de fontes gratuitas e de uso livre, sem o OlimpBase.
2. Livros de abertura: **Lichess**.
3. Nova calibração: **depois** ([plano-calibracao.md](plano-calibracao.md), fases B e C).
4. Um plano para cada parte que falta.
5. **Código aberto, jogo gratuito.**

**Removido do roadmap (2026-11-17):** retomar sessão e histórico local de campanhas, e o Desafio diário. O usuário considerou essas funcionalidades desnecessárias.

## Planos e ordem sugerida

| #   | Plano                                                                                                  | Depende de                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| 1   | ✅ [Código aberto e jogo gratuito](plano-codigo-aberto.md)                                             | —                                                                                                       |
| 2   | ✅ [Dados: 20 melhores seleções](plano-dados.md) (parcial: 46 cartas sem Elo e medalhas pendentes)     | —                                                                                                       |
| 3   | [Livros de abertura do Lichess](plano-livros.md)                                                       | 2 (anos das edições); livro por carta em aberto, com o piloto dos campeões mundiais feito em 2026-11-17 |
| 4   | ✅ [Campo por faixas de força](plano-mvp-campo-faixas.md)                                              | 2                                                                                                       |
| 5   | ✅ [Replay e PGN](plano-mvp-replay-pgn.md)                                                             | —                                                                                                       |
| 6   | ✅ [Modo Mestre](plano-mvp-modo-mestre.md)                                                             | —                                                                                                       |
| 7   | ✅ [Compartilhamento](plano-mvp-compartilhamento.md)                                                   | —                                                                                                       |
| 8   | [Calibração, fases B e C](plano-calibracao.md)                                                         | 2, 3 (a escala precisa da faixa real de forças)                                                         |
| 9   | ✅ [Fechar o MVP: critérios de aceite](plano-mvp-aceite.md)                                            | —                                                                                                       |
| 10  | [Desempenho no celular](plano-desempenho-celular.md) (despriorizado, decisão do usuário em 2026-11-17) | —                                                                                                       |

Os itens 5 e 6 não dependem dos dados e podem andar em paralelo com 2 e 3.

## Antes de publicar

- ✅ Todos os critérios de aceite do GDD §13.2 marcados (2026-11-17).
- ✅ Nome definitivo: "4 a 0" (2026-11-16).
- ✅ `pnpm test`, `pnpm typecheck`, `pnpm lint` e `pnpm build` passando (2026-11-17).
- ✅ Publicado em <https://4a0chess.com.br/> (Cloudflare Worker com assets estáticos, 2026-11-17).
- Meta de < 10 s por rodada no `/spike` (GDD §8.3): atingida no desktop a partir da 2ª rodada (7,9–8,2 s; 11,1 s na 1ª). Falta medir num notebook médio e num celular médio; no celular as partidas já se mostraram lentas ([plano-desempenho-celular.md](plano-desempenho-celular.md)). A medição no celular foi despriorizada (2026-11-17).

## Pendências depois do lançamento

Em ordem de prioridade (2026-11-17):

1. **Dados (plano 2):** corrigir as 46 cartas sem QID ou sem Elo em `overrides.ts`, devolvendo as 42 seleções ao `v1`, e ler as medalhas individuais (hoje `medals: []`).
2. **Livro por carta (plano 3, GDD §14.2):** decidir, a partir do piloto dos campeões mundiais, como levar livros às outras cartas.
3. **Calibração, fases B e C (plano 8):** depende de um computador mais potente.
4. **Desempenho no celular (plano 10):** despriorizado pelo usuário.
