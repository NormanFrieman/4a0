# Plano: livros de abertura a partir do Lichess

**Situação:** planejado em 2026-11-16; **adiado** pelo usuário no mesmo dia. Os dados `v1` saem sem livros (`bookFile: null`) e o Maia joga desde o primeiro lance. Troca a fonte provisória (PGN Mentor, GDD §7.1 e §14.1), cuja licença não está declarada.

## Decisão do usuário (2026-11-16)

- Os livros de abertura vêm do **lichess.org**.

## A fonte

**Explorador "masters" do Lichess** (`GET https://explorer.lichess.ovh/masters`): partidas presenciais de mestres, agregadas por posição.

- Parâmetros: `fen` ou `play` (lances UCI a partir da posição), `since` e `until` (ano ou `AAAA-MM`; o padrão começa em 1952), `moves` (quantos lances devolver) e `topGames` (0 a 15).
- Resposta: para cada lance, o número de partidas com vitória das brancas, empate e vitória das pretas.
- **Exige autenticação.** Em 2026-11-16, a chamada sem token devolveu 401. A ferramenta usa um token pessoal do Lichess (sem nenhum escopo), lido de `LICHESS_TOKEN`. O token nunca vai para o app nem para o git.
- **Não há filtro por jogador.** O explorador masters agrega todas as partidas; o filtro por jogador do Lichess só vale para as partidas jogadas no próprio site.
- **Direitos:** o livro guarda só estatísticas agregadas de lances (posição → lance → contagem), não as partidas. Atribuição ao Lichess na tela de créditos ([plano-codigo-aberto.md](plano-codigo-aberto.md)).

## Questão para o usuário: livro por carta

O GDD §7.1 pede **um livro por carta**, com a carreira da pessoa até o ano da carta. O Lichess não permite isso. Alternativas:

1. **Livro por edição (recomendado):** um livro por Olimpíada com as partidas de mestres de uma janela de anos até ela (ex.: `[ano − 4, ano]`), com os lances dos dois lados. Assim, um jogador de 1974 abre como se abria em 1970–74, e um de 2024 joga as aberturas modernas. O estilo pessoal continua vindo da decisividade (§7.2). São 28 livros.
2. **Livro por década:** o que já existe como reserva (`decade-1970.bin`). Mais barato (6 livros), mas 1980 e 1989 abririam igual.
3. **Manter livro por carta** com outra fonte de partidas por jogador. Não encontrei uma fonte gratuita com licença clara para partidas de 1970–2000.

Com 1 ou 2, `PlayerCard.bookFile` passa a apontar para o livro da época, e `bookMinGames` deixa de ser usado. O GDD §7.1 muda: precisa de pedido explícito, porque o "livro por carta" é parte do MVP.

## Construção do livro (`tools/data/books/lichessBooks.ts`)

1. **Percorrer a árvore** a partir da posição inicial, em largura, até `bookMaxPlies` (16).
2. Em cada posição, manter os lances com pelo menos `bookMinMoveGames` partidas **e** pelo menos `bookMinMoveShare` do total da posição. Os dois limites ficam em `balance.style`, porque mudam como as cartas jogam. Expandir só os lances mantidos.
3. **Peso** de cada lance no Polyglot = número de partidas (escalado para caber em 16 bits). A chave já inclui o lado que joga, então um arquivo serve às duas cores.
4. Escrever com o `polyglotWriter` que já existe (`src/engine/book/polyglotWriter.ts`). O formato e a leitura no app não mudam.
5. **Cache em disco** por (FEN, `since`, `until`) em `tools/data/cache/lichess/`, fora do git. Assim, uma nova execução não refaz requisições.
6. **Educação com a API:** uma requisição por vez. Em caso de 429, esperar 60 s antes de continuar. Mostrar progresso e o tempo estimado.

**Custo estimado:** com limites que deixem ~2–5 mil posições por livro, ~1 req/s, são 1–2 h por livro. Para 28 livros, uma noite. Janelas que se sobrepõem não reaproveitam o cache, porque `since`/`until` fazem parte da chave. Se o custo pesar, a alternativa 2 (décadas) cabe em poucas horas. O passo 1 abaixo mede o número real.

## Limpeza do PGN Mentor

Depois que os livros novos estiverem publicados:

- Remover `tools/data/sample/pgnSources.ts`, `tools/data/fetchPgn.ts` e o script `data:pgn`.
- Remover `pgnReader.ts`/`buildBooks.ts` se nada mais os usar. Os testes do formato Polyglot continuam.
- Regenerar os livros da amostra com a ferramenta nova, para que nenhum arquivo publicado venha do PGN Mentor.
- Atualizar o `CLAUDE.md` (comandos) e o GDD §7.1/§14.1.

## Passos

1. Protótipo: um livro (`1980`, janela 1976–1980) com dois conjuntos de limites. Medir o número de requisições, o tamanho do arquivo e a cobertura: em quantas partidas de teste a carta sai do livro antes do lance 8.
2. Fixar os limites em `balance.style`. Testes do percorrimento com um "fetcher" falso: limites, profundidade, determinismo da saída.
3. Gerar os livros de todas as edições e publicar em `public/data/v1/books/`.
4. Repetir a checagem da Fase A do plano de calibração (passo 5): o livro não pode mudar a força nem os empates além da margem.
5. Limpeza do PGN Mentor (acima).
