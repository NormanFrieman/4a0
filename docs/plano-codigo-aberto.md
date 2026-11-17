# Plano: código aberto e jogo gratuito

**Situação:** passos 1 a 4 e 6 feitos em 2026-11-16; o passo 5 (histórico e branch) está em andamento, e falta você tornar o repositório público.

## Decisão do usuário (2026-11-16)

- O **código será aberto** e o **jogo será gratuito**: sem anúncios, pagamentos nem contas.

## Licenças (o que cada parte exige)

| Parte                                   | Licença                        | Consequência                                                                                   |
| --------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------- |
| Pesos do Maia-3 (enviados ao navegador) | AGPLv3                         | O jogo é distribuído pela rede; o código-fonte precisa estar disponível a quem joga (AGPL §13) |
| chessground, stockfish.js               | GPL-3.0                        | Compatível com AGPLv3                                                                          |
| maia3-js, flag-icons                    | MIT                            | Permissiva; manter o aviso                                                                     |
| chess.js                                | BSD-2                          | Permissiva; manter o aviso                                                                     |
| Fonte Fraunces                          | SIL OFL 1.1                    | Manter o aviso                                                                                 |
| Dados derivados da Wikipedia            | CC BY-SA 4.0                   | Os arquivos de `public/data/` herdam a CC BY-SA; exigem atribuição                             |
| Dados do Wikidata                       | CC0                            | Sem exigência; atribuir por cortesia                                                           |
| Livros de abertura (Lichess masters)    | Estatística agregada de lances | Atribuição ao Lichess                                                                          |

**Licença do projeto:** **AGPL-3.0-or-later** para o código, que é o caminho mais simples com os pesos do Maia (GDD §14.1), e **CC BY-SA 4.0** para os dados publicados. Este plano não é aconselhamento jurídico.

## Decisões da execução (2026-11-16)

- **URL do código-fonte:** `https://github.com/NormanFrieman/4a0` (padrão em `vite.config.ts`, com override por `SOURCE_URL`). O commit vem do `git rev-parse HEAD` ou do `CF_PAGES_COMMIT_SHA`.
- **Livros de amostra:** gerados de PGNs do PGN Mentor (licença não declarada), saem do git **e do histórico**. Ficam em `.gitignore` e são gerados com `pnpm data:pgn && pnpm data:sample`.
- **Consequência para o deploy:** resolvida com os dados `v1` (2026-11-16), que não usam livros: um build feito direto do repositório joga o torneio inteiro.
- **Branch `feat/blunder-check`:** removido do remoto. O `prototype/design-system`, citado abaixo, já não existia.
- **Dados:** o `LICENSE.md` dos dados de teste está em `public/data/sample/`. O de `public/data/v1/` foi criado com o plano 2 (CC BY-SA 4.0, atribuição à Wikipedia e ao Wikidata).

## Passos

1. ✅ **Arquivos de licença**
   - `LICENSE` na raiz: texto integral da AGPLv3.
   - `package.json`: `"license": "AGPL-3.0-or-later"`. O `"private": true` fica, porque só impede publicar no npm.
   - `public/data/v1/LICENSE.md`: CC BY-SA 4.0, com as fontes (páginas da de.wikipedia com `revid`, Wikidata, Lichess).
   - `THIRD_PARTY_NOTICES.md`: dependências distribuídas ao navegador, com licença e link para o código-fonte. Gerar com `pnpm licenses list --prod` e revisar à mão: os pesos do Maia e o build do Stockfish não aparecem como dependências comuns.
2. ✅ **README.md** em pt-BR: o que é o jogo, como rodar (`pnpm install`, `pnpm dev`), estrutura, licenças, link para o GDD.
3. ✅ **Link para o código-fonte no app (AGPL §13)**: `src/app/buildInfo.ts`, rodapé em `src/app/Game.tsx`
   - URL do repositório e hash do commit injetados no build (`define` do Vite: `__SOURCE_URL__`, `__COMMIT__`).
   - Rodapé discreto em todas as telas: "Código-fonte", que aponta para o commit publicado.
4. ✅ **Tela "Sobre / Créditos"** (`src/app/screens/About.tsx`, fase `about`), acessível pelo Início (textos via i18n, design `src/app/ui/`):
   - fontes dos dados e dos livros, com as licenças;
   - Maia-3 (projeto Maia, Universidade de Toronto) e Stockfish;
   - aviso: jogo sem fins lucrativos, sem ligação com a FIDE nem com os jogadores. Nomes de pessoas reais usados como fato histórico, sem fotos (GDD §10).
5. **Repositório público**
   - Antes de abrir o repositório, revisar o histórico: segredos, arquivos grandes e PGNs. Em 2026-11-16, `git log --all -- '*.pgn'` não encontrou nada, e `models/`, `*.onnx` e `bench-results/` já estão no `.gitignore`.
   - O branch `prototype/design-system` pode ir junto ou ser removido do remoto; decisão do usuário na hora de publicar.
   - Criar o repositório (ex.: GitHub) é uma ação do usuário, que define nome e conta.
6. ✅ **GDD:** registrar a decisão em §14.1 e tirar a ressalva de "uso comercial".

## Pendências

- **Nome definitivo** (GDD §14.2): verificar se "4 a 0" já é usado antes de publicar o repositório com esse nome.
- **Domínio e hospedagem:** Cloudflare Pages já está configurado (`public/_headers`); falta o domínio.
