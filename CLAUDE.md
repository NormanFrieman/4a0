# 4 a 0

Jogo de navegador: o usuário monta uma equipe de 4 enxadristas históricos e disputa uma Olimpíada de Xadrez simulada pelo Maia-3. A fonte de verdade é [docs/GDD.md](docs/GDD.md). Leia a seção relevante antes de implementar.

- Medições de desempenho e calibração da engine: [docs/benchmarks.md](docs/benchmarks.md).
- **Calibração pendente:** `engineCalibration` foi medido sem o filtro do Stockfish e está desatualizado. A escada será refeita uma vez só, num computador com mais capacidade, depois de fixar as regras de fim de partida.
- Caminho até o lançamento e ordem dos planos: [docs/plano-lancamento.md](docs/plano-lancamento.md) (dados do top 20 por Wikipedia/Wikidata, livros do Lichess, código aberto AGPL, partes que faltam do MVP).
- Calibração (fica para depois dos dados): [docs/plano-calibracao.md](docs/plano-calibracao.md) (Fase A: regras de fim de partida; Fase B: escada única; Fase C: escala, `quickSim` e validação).
- `pnpm engine:quality` mede a qualidade dos lances (`--analyse-nodes 100000` faz a análise no padrão do Lichess).
- Design system (direção "Almanaque histórico", tokens e componentes em `src/app/ui/`): [docs/design.md](docs/design.md). Use os tokens do Tailwind, nunca cores literais.
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

## Git

- **O jogo está em produção: nunca commitar direto na `main`.** Todo trabalho novo vai numa branch a partir da `main` (`feat/…`, `fix/…`, `docs/…`, `ci/…`) e entra por PR (`gh pr create`).
- O merge na `main` publica em produção (Cloudflare Workers Builds). Quem faz o merge é o usuário, depois do CI verde (`.github/workflows/ci.yml`: lint, testes e build) e da revisão do Claude (`claude-code-review.yml`).
- Os testes que dependem de arquivos fora do git (livros de abertura, modelo) devem pular quando o arquivo faltar, senão quebram o CI.

## Estado atual

Fatia jogável da Fase 1 em `/`: draft → confirmação → campo (por faixas de força, §5.1) → 7 rodadas (Maia nos 4 tabuleiros do usuário, simulação rápida no resto) → resultado, com os **dados `v1`** (`public/data/v1`, gerados por `pnpm data:olympiads --publish`: 518 seleções das 20 primeiras de cada Olimpíada de 1970 a 2026; 24 equipes no torneio). Campeões mundiais (linha clássica, `Person.worldChampion`, lista em `tools/data/olympiads/worldChampions.ts`) têm o nome em dourado (`ChampionName`) em todas as telas e, como piloto do livro por carta, livro de abertura próprio (`public/data/v1/books/`, do PGN Mentor). As outras cartas não têm livro (`bookFile: null`): o Maia joga desde o primeiro lance. A amostra (`public/data/sample`) ficou só para os testes. Licença AGPL-3.0-or-later; o rodapé linka o commit do build e o Início abre a tela Sobre (`phase: "about"`). `?seed=` reproduz a sessão; `?rapido=1` simula as partidas do usuário sem o Maia (e sem Replay). Replay e PGN (`phase: "replay"`): abre de cada tabuleiro na rodada encerrada e das mesas da campanha no Resultado final; baixa a partida ou a campanha inteira. Modo Mestre (`?modo=mestre`, escolhido no Início): `useShowStrength()` (`src/app/state/mode.ts`) oculta a força em todas as telas até o Resultado final; `src/app/screens/masterMode.test.tsx` renderiza as telas no servidor para conferir. Compartilhamento no Resultado final (`src/share/`): "Copiar resultado" (texto estilo Wordle com o link `?seed=`) e "Compartilhar imagem" (`ShareCard` 1080 × 1350 exportado com html-to-image). Prêmios por mesa no Resultado final (`src/tournament/boardPrizes.ts`, GDD §5.3). O Resultado final organiza a coluna da direita em abas Campanha | Classificação | Prêmios (`src/app/screens/FinalStandings.tsx`), com a classificação final das equipes. No modo Clássico, a Rodada e o Replay mostram a barra de avaliação (GDD §8.6, `src/sim/evalBar.ts`, `EvalBar`), reaproveitando as buscas do filtro do Stockfish, sem buscas novas; o Mestre mostra só o tabuleiro. Não há marcas de lance (`!`/`?`/`??`): foram descartadas. Critérios de aceite do MVP (GDD §13.2) todos marcados, com a evidência em [docs/plano-mvp-aceite.md](docs/plano-mvp-aceite.md).

## Comandos

- `pnpm install`
- `pnpm test` — Vitest
- `pnpm typecheck` / `pnpm lint`
- `pnpm dev` — app (Vite); `/spike` é a página de teste da engine no navegador; `/dev/ui` é o catálogo do design system (as duas só existem no `dev`)
- `pnpm build` — gera `dist/` para o Cloudflare Pages (cabeçalhos em `public/_headers`; o `.wasm` do ORT vem do jsDelivr e fica fora do build; o modelo Maia-3 5m e o Stockfish são servidos do próprio domínio, em `/models/` e `/stockfish/`)
- `pnpm data:pgn` — baixa as coleções PGN de `tools/data/sample/pgnSources.ts` (PGN Mentor, só para desenvolvimento) para `tools/data/sample/pgn/`, fora do git. Com `--champions`, baixa as dos campeões mundiais para `tools/data/cache/pgn/` (precisa antes do `data:olympiads`)
- `pnpm data:sample` — gera `public/data/sample` a partir de `tools/data/sample/source.ts`, com os livros de abertura (precisa do `data:pgn` antes). Os livros (`public/data/sample/books/`) ficam fora do git: num clone novo, rode os dois comandos antes de jogar
- `pnpm data:fetch [--years 1980,2024]` — baixa da de.wikipedia e do Wikidata as fontes dos dados olímpicos para `tools/data/cache/`, fora do git (`revid` fixados em `tools/data/olympiads/sources.json`; `--update` pega revisões novas)
- `pnpm data:olympiads [--years 1980,2024]` — gera os dados a partir do cache, sem rede, em `tools/data/olympiads/out/` (fora do git) e o relatório `tools/data/olympiads/report.md`; com `--publish` (todas as edições), grava em `public/data/v1/`
- `pnpm engine:play ... --white-book <arquivo.bin>` — partida com livro Polyglot
- `pnpm engine:play --white 1500 --black 1600 --seed 42`
- `pnpm engine:validate --game --bands 1000,1400,1800` — valida a escala calibrada
- `pnpm engine:ladder` — mede a curva de força do Maia (gera `engineCalibration`)
- `pnpm engine:endrules` — joga as células sem regras de fim de partida e varre abandono/acordo offline (`--from <json>` reaproveita as partidas)
- `pnpm engine:bench`
- `pnpm seo:images` — regera `public/og-image.png` e `public/apple-touch-icon.png` a partir de `tools/seo/*.html` (precisa do Chromium; `CHROME=` muda o binário). SEO fica no `index.html` (meta, Open Graph, JSON-LD, texto estático em `#root`), com `robots.txt` e `sitemap.xml` em `public/`; o domínio canônico é `https://4a0chess.com.br/`
