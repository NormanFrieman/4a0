# Dados de teste: licença e origem

Os arquivos desta pasta são **dados de teste**, usados até a chegada dos dados definitivos (`docs/plano-dados.md`).

- **Escalações:** seleções reais das Olimpíadas de 1970 a 1984. Ratings, pontuações, colocações e taxa de decisão são **aproximados**, digitados à mão em `tools/data/sample/source.ts`. Não use estes números como referência histórica.
- **Licença:** [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), a mesma dos dados definitivos. Atribuição: "4 a 0, dados de teste".
- **Livros de abertura (`books/`):** não fazem parte do repositório. Eles são gerados localmente a partir de coleções PGN públicas, usadas só no desenvolvimento:

  ```sh
  pnpm data:pgn     # baixa as coleções para tools/data/sample/pgn/
  pnpm data:sample  # gera index.json, olympiads/, persons.json e books/
  ```

  Sem `books/`, o jogo para com erro na primeira rodada. Os livros definitivos virão do Lichess (`docs/plano-livros.md`).

Nomes de pessoas reais aparecem como fato histórico. O jogo não tem ligação com a FIDE nem com os jogadores.
