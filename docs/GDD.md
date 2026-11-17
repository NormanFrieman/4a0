# 4 a 0 — Documento de Definição

Nov 14, 2026 · @Norman

## 0. Como usar este documento

Este documento é a fonte de verdade do projeto para o Claude Code. Exporte como Markdown, salve em `docs/GDD.md` e referencie no `CLAUDE.md` da raiz. Ele substitui a versão anterior (cidade estilo Clash of Clans), que foi descartada.

- **DECIDIDO** não muda sem pedido explícito. **Questões em aberto** devem ser perguntadas, não presumidas.
- **Todo número de balanceamento é configurável**, centralizado em `src/config/balance.ts`.
- **Código em inglês, interface em português (pt-BR)**, com estrutura pronta para outros idiomas. Use os nomes da coluna "Nome no código" do glossário.
- **Determinismo:** todo sorteio (draft, emparelhamento, lances) usa um gerador com semente. Mesma semente = mesma sessão.
- **Implementar por fases** (seção 13). Não antecipar funcionalidades pós-MVP.
- **Reutilizar bibliotecas prontas** (seção 12) em vez de reimplementar regras de xadrez, tabuleiro ou inferência.

## 1. Visão geral e pilares

**4 a 0** (o placar perfeito de um match olímpico) é um jogo de navegador em que o jogador monta uma equipe de 5 enxadristas históricos e disputa uma Olimpíada de Xadrez contra seleções reais de várias épocas. As partidas são jogadas lance a lance pelo Maia-3, uma IA que joga como humanos de cada nível.

**Inspiração:** o jogo "7 a 0" e similares (38 a 0, 82 a 0), em que o usuário sorteia seleções históricas da Copa do Mundo, escolhe um jogador de cada uma e o jogo simula o torneio.

**A pergunta que o jogo responde:** "e se Tal, Kasparov e Carlsen jogassem na mesma equipe, venceriam a URSS de 1980?"

**Pilares (DECIDIDO):**

1. **Sessão curta e completa.** Montar a equipe em cerca de 2 minutos; torneio inteiro em menos de 15 (com opção de acelerar).
2. **História real.** Jogadores, escalações e seleções vêm de Olimpíadas reais.
3. **Partidas de verdade, não dados.** Os resultados saem de partidas jogadas pelo Maia, que podem ser assistidas e revistas.
4. **Decisões que importam:** quem escolher em cada sorteio, sabendo que cada jogador só ocupa a mesa em que jogou.
5. **Feito para compartilhar.** Texto e imagem de resultado, e `?seed=` para um amigo tentar a mesma sessão.

**Fora do escopo (DECIDIDO):** cidade, economia, recursos, contas de usuário obrigatórias e multiplayer em tempo real.

## 2. Glossário

| Termo | Nome no código | Definição |
| --- | --- | --- |
| Edição | `Olympiad` | Uma Olimpíada real (ano, cidade-sede, formato). |
| Seleção | `NationalTeam` | A equipe de um país numa edição, com sua escalação real. |
| Pessoa | `Person` | Um enxadrista real, único em todas as edições. |
| Carta | `PlayerCard` | Uma pessoa numa edição específica (ex.: Kasparov 1980). É o que o usuário escolhe. |
| Sorteio | `Roll` | Um país + edição sorteados, mostrando a escalação daquela seleção. |
| Re-sorteio | `Reroll` | Descartar o sorteio atual e sortear outro. Limitado. |
| Draft | `Draft` | A fase de montar a equipe: 4 sorteios, 4 escolhas. |
| Equipe do usuário | `UserTeam` | As 4 cartas escolhidas, uma por mesa. |
| Mesa | `Board` | Posição 1 a 4 na equipe. Mesa 1 é a mais forte. |
| Campo | `Field` | Todas as seleções históricas que disputam o torneio contra o usuário. |
| Rodada | `Round` | Uma rodada do suíço: todas as equipes jogam um match. |
| Match | `Match` | Confronto de 4 partidas entre duas equipes. |
| Partida | `Game` | Uma partida de xadrez numa mesa. |
| Força de jogo | `strength` | Número que representa a força de uma carta na escala do jogo (seção 6). |
| Elo do Maia | `maiaElo` | Valor passado ao Maia-3 (600–2600), derivado da força de jogo. |
| Semente | `seed` | Número que torna uma sessão reproduzível. |

## 3. Fluxo de uma sessão

Uma sessão vai do primeiro sorteio à medalha, sem interrupção, em cerca de 15 minutos.

1. **Início:** o usuário escolhe o modo (Clássico ou Mestre). O jogo gera a semente da sessão.
2. **Draft (4 sorteios):** a cada sorteio aparece uma seleção histórica; o usuário escolhe um jogador, que vai para a vaga da mesa em que jogou na edição real.
3. **Confirmação:** revisão das mesas e confirmação da equipe.
4. **Sorteio do campo:** o jogo monta as seleções adversárias e mostra a lista de participantes.
5. **Rodadas (7 no MVP):** em cada uma, o usuário vê o adversário e assiste ao match. Os outros matches são simulados em segundo plano.
6. **Classificação:** atualizada após cada rodada.
7. **Resultado final:** colocação, medalha, destaques individuais e imagem para compartilhar.
8. **Replay:** qualquer partida pode ser revista e baixada em PGN.

## 4. Draft

O usuário monta uma equipe de 4 cartas em 4 sorteios, uma por mesa (1 a 4).

**DECIDIDO (nov/2026): não há reserva.** Sem cansaço nem outro efeito, escolher quem descansa não era uma decisão de verdade. O jogo só usa os jogadores das mesas 1 a 4 de cada seleção; os reservas reais (5º e 6º tabuleiro) ficam fora dos dados.

### 4.1 Sorteio

- Cada sorteio escolhe uma `NationalTeam` (uma seleção numa edição) do conjunto de dados. Em geral é país + edição; o país-sede pode ter uma segunda equipe (ex.: "Rússia 2" em 1994), que conta como outra seleção.
- **Peso do sorteio:** seleções que terminaram entre as 10 primeiras da sua edição têm peso `rollWeightTop10`; as demais, peso 1. Assim, equipes fortes aparecem com frequência suficiente sem dominar.
- Só entram seleções com os 4 jogadores das mesas 1 a 4 com dados completos (nome, força, partidas).
- Uma mesma seleção não aparece duas vezes no mesmo draft. **DECIDIDO (2026-11-17):** a equipe principal e a segunda equipe do país-sede são seleções diferentes e podem sair no mesmo draft.

### 4.2 O que o sorteio mostra

- Bandeira, país, ano, cidade-sede e colocação final da seleção naquela edição.
- A escalação das mesas 1 a 4, cada jogador com: nome, título, mesa em que jogou, força de jogo, pontuação real naquela edição (ex.: 8½/11) e medalhas.
- No modo **Mestre**, a força de jogo fica oculta: o usuário decide pelo conhecimento histórico.

### 4.3 Escolha e vagas

- O usuário escolhe **um** jogador do sorteio. **Cada jogador só ocupa a vaga da mesa em que jogou na edição real:** quem foi mesa 1 só entra na vaga 1, e assim por diante.
- Jogadores cuja vaga já está ocupada não podem ser escolhidos. O sorteio só oferece seleções com pelo menos um jogador escolhível.
- A mesma pessoa não pode entrar duas vezes, mesmo de edições diferentes.
- **Ordem fixa durante o torneio:** as 4 cartas jogam todas as rodadas, cada uma na sua mesa.

### 4.4 Re-sorteios

- O usuário pode descartar um sorteio e pedir outro, até `rerollsPerDraft` vezes por draft.

### 4.5 Configuração inicial

| Chave | Valor inicial |
| --- | --- |
| `draftSlots` | 4 (uma vaga por mesa) |
| `rerollsPerDraft` | 3 |
| `rollWeightTop10` | 3 |

## 5. Torneio

O torneio é um suíço por pontos de match, como a Olimpíada real, encurtado para caber numa sessão: 7 rodadas contra um campo de 23 seleções históricas (24 equipes no total) no MVP.

### 5.1 Montagem do campo

- O campo é sorteado com a semente da sessão, em três faixas de força média: `fieldTiers` define quantas seleções de elite, intermediárias e mais fracas entram.
- As faixas são os terços do conjunto ordenado por força média (`fieldTierQuantiles`); dentro de cada faixa o sorteio é uniforme.
- A faixa de elite sempre inclui pelo menos `fieldMinChampions` seleções campeãs da sua edição. Só contam as campeãs que estão na elite; uma campeã de faixa mais baixa pode sair pelo sorteio normal da faixa dela.
- No máximo `fieldMaxPerCountry` seleções do mesmo país (ex.: URSS 1980 e URSS 1970 podem coexistir; três URSS não).
- **Jogador escolhido pelo usuário (DECIDIDO, nov/2026):** se a pessoa estiver numa seleção do campo, essa seleção continua com ela. A mesma carta pode jogar pelos dois lados; por isso o lado de cada partida é identificado pela mesa, nunca pela carta.
- Cada seleção do campo usa suas 4 mesas reais, na ordem real, em todas as rodadas.

### 5.2 Emparelhamento

- Rodada 1: campo ordenado por força média; metade de cima contra metade de baixo.
- Rodadas seguintes: grupos de mesma pontuação de match, metade de cima contra metade de baixo dentro do grupo, sem repetir confrontos. Desce-se um flutuante para o grupo seguinte quando necessário: entre os emparelhamentos sem repetição, vale o que atravessa menos grupos (2026-11-17).
- Não é preciso seguir à risca o sistema holandês da FIDE. O importante é ser determinístico e sem repetições.
- **Cores:** a equipe listada primeiro joga de brancas nas mesas 1 e 3; a outra, nas mesas 2 e 4. Alternância por rodada, buscando equilíbrio.

### 5.3 Pontuação e desempates

- Partida: 1, ½ ou 0. Match: vitória (mais de 2 pontos) = 2 pontos de match; empate (2 a 2) = 1; derrota = 0.
- Classificação: pontos de match → pontos de partida → soma dos pontos de match dos adversários (Buchholz) → confronto direto.
- **Medalhas por equipe:** 1º ouro, 2º prata, 3º bronze.
- **Prêmios individuais:** melhor desempenho em cada mesa, entre todas as cartas do torneio com pelo menos `boardPrizeMinGames` partidas nela. Desempenho = força média dos adversários + dp(pontuação), com a tabela da FIDE. Desempate: pontos → força média dos adversários → pessoa. Aparecem no Resultado final.

### 5.4 Antes de cada rodada

- O usuário vê as duas escalações (mesas, traços e forças) e inicia o match. Não há decisão por rodada.

### 5.5 Configuração inicial

| Chave | Valor inicial |
| --- | --- |
| `rounds` | 7 |
| `fieldSize` | 23 (+ usuário = 24) |
| `fieldTiers` | 6 elite, 9 intermediárias, 8 mais fracas |
| `fieldTierQuantiles` | terços (1/3, 2/3) do conjunto ordenado por força média |
| `fieldMinChampions` | 3 |
| `fieldMaxPerCountry` | 2 |
| `matchPoints` | vitória 2, empate 1, derrota 0 |
| `boardPrizeMinGames` | 5 (partidas numa mesa para concorrer ao prêmio individual) |

## 6. Força dos jogadores

**DECIDIDO: o jogo simula força relativa, não o nível absoluto dos lances.** O Maia-3 cobre de 600 a 2600 na escala blitz do Lichess, e os jogadores olímpicos vão além disso na escala FIDE. Por isso cada carta tem uma força de jogo, que é convertida para o Elo do Maia preservando a ordem e as diferenças.

### 6.1 Força de jogo de uma carta

```latex
\text{strength} = R + k \cdot (P - R)
```

Onde R é o rating FIDE do jogador naquela edição, P é a performance dele na edição e k = `performanceWeight` (0,25 inicial). Assim, uma campanha histórica rende um pouco mais de força, sem apagar o rating.

- Sem rating FIDE (comum em seleções pequenas): usar a performance com k = 1, limitada por `unratedCap`.
  - **Nos dados olímpicos (decisão do usuário, 2026-11-16):** uma carta do top 20 sem rating deixa a seleção de fora, em vez de usar a performance limitada. Quase sempre é um jogador com rating que as fontes não identificaram. Os casos ficam listados em "Correções pendentes" no relatório (`tools/data/olympiads/report.md`), para corrigir depois em `overrides.ts`.
- Edições anteriores a 1970 (sem Elo FIDE) ficam fora do MVP. Depois, usar estimativas históricas, a definir.
- A força é calculada no pipeline de dados (seção 9), não no navegador.
- **Fontes livres (2026-11-16, [plano-dados.md](plano-dados.md)):** P é **aproximada**: média do rating dos adversários da mesma mesa, rodada a rodada, + dp(pontuação). Nas edições sem tabela de progresso (1970–1978, 1994–2006), não há P e a força é o próprio R. R é a lista FIDE do Wikidata mais recente até o início, até 24 meses antes; sem ela, a primeira até 24 meses depois (as listas do Wikidata começam em julho de 1971).

### 6.2 Conversão para o Elo do Maia

**DECIDIDO (nov/2026, a partir das medições da fase 0 em `docs/benchmarks.md`):** o Maia-3 comprime as diferenças de Elo (os 2000 pontos nominais de 600–2600 valem ~900 pontos reais a T=1). Por isso a conversão é feita em duas etapas, ambas por pontos em `balance.ts` com interpolação linear:

1. `toGameRating(strength)`: força de jogo → **escala calibrada do jogo** (força real medida, ~770–2065). Ponto de partida: linear de \[1400, 2850\] para \[800, 2050\] (`strengthScale`).
2. `engineParams(rating, temperature)`: escala calibrada → `selfElo` (e, no topo, temperatura), pela grade medida `engineCalibration` (`pnpm engine:ladder`). Acima de `selfElo` 2600 a força só cresce baixando a temperatura.

- O `oppoElo` passado ao Maia é o `selfElo` do adversário.
- **Validação:** partidas com diferenças de força conhecidas devem produzir aproximadamente a pontuação da fórmula Elo (a escala calibrada já atende: ver `docs/benchmarks.md`).

### 6.3 Simulação rápida (matches sem o usuário)

Os matches entre seleções do campo não são jogados lance a lance. Cada partida é sorteada por probabilidade:

```latex
E = \frac{1}{1 + 10^{-d/400}}
```

- d = diferença de força de jogo (brancas − pretas + `whiteAdvantage`).
- Probabilidade de empate: `drawBase` + `drawSlope` × (força média − `drawPivot`) / 100, limitada a \[`drawMin`, `drawMax`\] e a 2 × min(E, 1 − E).
- Vitória das brancas = E − empate / 2. O resto é vitória das pretas.
- Os parâmetros devem ser ajustados para que a taxa de empates simulada fique próxima da taxa observada nas partidas Maia contra Maia do mesmo nível, para que os dois modos de simulação sejam coerentes.

### 6.4 Configuração inicial

| Chave | Valor inicial |
| --- | --- |
| `performanceWeight` | 0,25 |
| `unratedCap` | 2200 |
| `maiaEloRange` | 1000–2600 |
| `whiteAdvantage` | 35 |
| `drawBase` / `drawSlope` / `drawPivot` | 0,30 / 0,03 / 2000 |
| `drawMin` / `drawMax` | 0,10 / 0,60 |

## 7. Personalidade

O Maia-3 só recebe o rating; dois jogadores de mesma força jogariam igual. A personalidade vem de duas camadas: repertório real de aberturas (MVP) e estilo derivado das estatísticas (MVP).

### 7.1 Repertório de aberturas (MVP)

- **Um livro por carta**, montado com as partidas da carreira da pessoa até o ano da carta, inclusive. O Karpov de 1974 abre como o Karpov de 1974.
- Profundidade máxima: `bookMaxPlies` meios-lances da partida. Só os lances da própria pessoa entram, com peso proporcional à frequência com que ela os jogou na posição. Um mesmo arquivo serve às duas cores, porque a chave inclui o lado que joga.
- Na partida, enquanto a posição estiver no livro, o lance é sorteado do livro (com a semente). Ao sair do livro, o Maia assume e não volta ao livro.
- Cartas com menos de `bookMinGames` partidas nesse recorte usam um livro genérico da década da edição. Enquanto não houver os PGNs das Olimpíadas (9.1), o livro da década é montado com todas as partidas coletadas daquela década, com os lances dos dois lados.
- Formato: arquivo binário Polyglot por carta (chave = hash Zobrist da posição), carregado antes do torneio.
- **Fonte provisória:** coleções PGN públicas por jogador (PGN Mentor), só para desenvolvimento. Ver 14.1.
- **DECIDIDO (2026-11-16): os livros vêm do Lichess** (explorador "masters"), substituindo o PGN Mentor. O Lichess não filtra partidas de mestres por jogador; o livro por carta está em aberto (§14.2). Plano: [plano-livros.md](plano-livros.md).
- **Provisório (2026-11-16, decisão do usuário):** os dados `v1` saem **sem livros** (`bookFile: null`) e o Maia joga desde o primeiro lance. Os livros ficam para depois.

### 7.2 Estilo (MVP)

- **Decisividade** = 1 − taxa de empates da pessoa em todas as suas partidas no conjunto de dados.
- Mapeada para a temperatura do sorteio de lances do Maia, entre `temperatureMin` (jogadores sólidos, muitos empates) e `temperatureMax` (jogadores agressivos).
- **DECIDIDO: temperatura compensada.** A temperatura sozinha muda a força (0,6 vs 1,1 vale ~250 pontos, ver `docs/benchmarks.md`). O `selfElo` é escolhido na grade de calibração (selfElo × temperatura) para que a força real da carta não mude com o estilo.
- **Limite no topo:** se a força da carta não é alcançável com a temperatura do estilo (acima de `selfElo` 2600), a temperatura é reduzida até o mínimo necessário. Nas lendas, a força prevalece sobre o estilo.
- Exibida na carta como um traço: Sólido, Equilibrado ou Combativo.

### 7.3 Futuro (pós-MVP)

- Modelos personalizados para lendas, ajustados com as partidas reais de cada uma, seguindo a pesquisa do projeto Maia sobre comportamento individual.
- Desempenho por fase da partida (abertura, meio-jogo, final) como bônus de força.

### 7.4 Configuração inicial

| Chave | Valor inicial |
| --- | --- |
| `bookMaxPlies` | 16 |
| `bookMinGames` | 20 |
| `temperatureMin` / `temperatureMax` | 0,7 / 1,1 |

## 8. Simulação das partidas

**DECIDIDO: as partidas do usuário são jogadas pelo Maia-3 no navegador**, dentro de um Web Worker, com o pacote maia3-js e ONNX Runtime Web. Não há servidor de engine.

### 8.1 Escolha de cada lance

1. Se a posição está no livro do jogador (seção 7.1), sortear o lance do livro.
2. Senão, chamar o Maia-3 com a posição, até 8 lances anteriores, `selfElo` e `oppoElo` (seção 6.2).
3. Sortear o lance a partir da distribuição `moves` devolvida, com a temperatura do jogador e top-p = `topP`, usando o gerador com semente da partida. Não usar o sorteio interno do maia3-js: ele usa `Math.random()` sem semente.
4. **Filtro de blunders (Stockfish).** O Stockfish avalia a posição e o lance sorteado com uma busca curta (número fixo de nós). Se o lance perde mais chances de vitória que a tolerância do jogador, ele sai da distribuição e outro é sorteado com o mesmo gerador. Depois de `maxTries` lances recusados, joga-se o melhor lance do Stockfish.
5. Validar e aplicar o lance com chess.js.

**DECIDIDO (nov/2026): o Maia escolhe, o Stockfish veta.** O Maia imita jogadores de blitz e entrega peças até no `selfElo` 2600: na medição de `docs/benchmarks.md`, ~30% das partidas tinham peça a mais antes do lance 30. Um filtro com a avaliação do próprio Maia não resolveu, porque ele não calcula variantes. O Stockfish só recusa lances, nunca escolhe, então o estilo humano do Maia se mantém.

- **Chances de vitória:** fórmula do Lichess, 2 / (1 + e^(−k·cp)) − 1, entre −1 e 1. Pela classificação do Lichess, uma queda de 0,1 é imprecisão, 0,2 é erro e 0,3 é blunder.
- **Tolerância:** curva por `selfElo` em `balance.blunderCheck.tolerance`, menor para os mais fortes. Como depende só do `selfElo`, a grade de calibração (§6.2) continua valendo, medida com o filtro ligado.
- **Determinismo:** uma thread, hash limpo antes de cada busca e limite por nós, não por tempo.
- **Navegador:** build lite single-thread do stockfish.js (~7 MB), num Worker aberto pelo worker do Maia e servido pelo próprio site.

### 8.2 Fim de partida

- Regras do chess.js: xeque-mate, afogamento, tripla repetição, 50 lances, material insuficiente.
- **Empate por acordo:** a partir do lance `drawOfferFromMove`, se a avaliação WDL do Maia ficar com probabilidade de vitória entre 0,5 ± `drawBand` por `drawStableMoves` lances seguidos, a partida termina empatada. Esse é o principal ajuste para aproximar a taxa de empates da realidade.
- **Abandono:** se a probabilidade de vitória de um lado ficar abaixo de `resignProb` por `resignStableMoves` lances seguidos, ele abandona.
- **DECIDIDO (nov/2026):** ninguém abandona antes do lance `resignFromMove`. A sequência de lances perdidos continua contando antes dele. Evita abandonos na abertura quando a diferença de força é grande.
- **Limite:** ao atingir `maxPlies`, decide-se pela avaliação WDL (vitória acima de 0,85; senão, empate).
- Sem relógio no MVP. Relógios simulados são pós-MVP.

### 8.3 Ritmo e exibição

- Ao iniciar a rodada, o worker calcula as 4 partidas o mais rápido possível; a interface reproduz os lances no ritmo escolhido (1×, 4×, sem pausa). "Sem pausa" mostra cada lance assim que é calculado: a partida acaba quando o cálculo acaba, não na hora.
- Os matches do campo usam a simulação rápida (seção 6.3) e ficam prontos em milissegundos.
- Meta de desempenho: uma rodada completa (4 partidas) calculada em menos de 10 s num notebook comum com o modelo de 5M. Medir na fase 0.

### 8.4 Determinismo

- Semente de cada partida = hash(semente da sessão, rodada, mesa).
- Mesma semente + mesma versão de dados + mesma versão do modelo = mesmas partidas. A versão do modelo e dos dados é salva com cada sessão.
- Pequenas diferenças numéricas entre navegadores (WebGPU vs WASM) podem mudar um lance. O app sempre força o backend WASM, para que `?seed=` reproduza as partidas em qualquer máquina.

### 8.5 Configuração inicial

| Chave | Valor inicial |
| --- | --- |
| `topP` | 0,95 |
| `drawOfferFromMove` | 30 |
| `drawBand` / `drawStableMoves` | 0,08 / 10 |
| `resignProb` / `resignStableMoves` | 0,10 / 6 (varredura de nov/2026) |
| `resignFromMove` | 30 (varredura de nov/2026) |
| `drawTarget` (empates entre jogadores de mesma força, estimativa) | ~30% em 2400, ~40% em 2550, ~50% a partir de 2700 (força de carta) |
| `maxPlies` | 250 |
| `maiaModelVariant` | 5m (testar 23m) |

## 9. Dados

Os dados históricos são processados offline por scripts e publicados como arquivos estáticos. O navegador nunca acessa fontes externas.

### 9.1 Escopo e fontes

- **MVP:** Olimpíadas abertas (open) de 1970 em diante, que têm rating FIDE.
- **Depois:** Olimpíadas femininas (modo próprio) e edições de 1927 a 1968.
- **DECIDIDO (2026-11-16): as 20 primeiras seleções de cada edição**, de fontes gratuitas e de uso livre, sem o OlimpBase: escalações e resultados da de.wikipedia (CC BY-SA 4.0), identidade, Elo histórico e títulos do Wikidata (CC0). Antecipa parte da Fase 2 (§13). Plano: [plano-dados.md](plano-dados.md).
- Até o pipeline ficar pronto, o app usa o **conjunto de amostra** montado manualmente, no mesmo formato.

### 9.2 Pipeline (`tools/data/`)

1. **Importar:** ler as fontes brutas (tabelas e PGNs) para um formato intermediário.
2. **Normalizar:** unificar pessoas entre edições (um `personId` estável), países históricos (URSS, Iugoslávia, Tchecoslováquia, Alemanha Ocidental e Oriental) e títulos.
3. **Calcular:** performance por edição, força de jogo (seção 6.1), decisividade (7.2), colocação das seleções.
4. **Livros:** gerar o livro de aberturas por carta e por década (7.1).
5. **Validar:** relatório de dados faltantes; excluir seleções que não atendem aos requisitos mínimos (4.1).
6. **Publicar:** escrever os arquivos em `public/data/v{N}/`, com versão.

### 9.3 Arquivos publicados

| Arquivo | Conteúdo | Carregamento |
| --- | --- | --- |
| `index.json` | Lista de edições, países, seleções com força média e peso de sorteio | No início |
| `olympiads/{ano}.json` | Escalações, cartas e resultados reais de uma edição | Sob demanda |
| `persons.json` | Nome, país, título máximo, decisividade de cada pessoa | No início |
| `books/{cardId}.bin` | Livro de aberturas da carta | Antes do torneio, só para as cartas em jogo |
| `books/decade-{década}.bin` | Livro genérico por década | Antes do torneio, se alguma carta em jogo usa |

### 9.4 Esquema das entidades

| Entidade | Campos principais |
| --- | --- |
| `Olympiad` | year, city, country, rounds, boards, teamsCount |
| `NationalTeam` | id, year, countryCode, countryName, finalRank, avgStrength, rollWeight, cardIds (na ordem real) |
| `Person` | id, name, countryCodes, maxTitle, decisiveness |
| `PlayerCard` | id, personId, year, teamId, board, title, fideRating, performance, strength, score, games, medals, bookFile |

## 10. Telas

Sete telas cobrem o MVP. Layout pensado primeiro para desktop, mas utilizável no celular (o draft e o resultado são as telas mais compartilhadas e precisam funcionar bem no celular).

| Tela | Conteúdo | Ações |
| --- | --- | --- |
| Início | Nome do jogo, modos | Jogar (Clássico ou Mestre), Como jogar |
| Draft | Cartão do sorteio (bandeira, ano, sede, colocação), escalação com as cartas, as 4 vagas, contador de re-sorteios | Escolher carta, escolher vaga, re-sortear |
| Confirmação | As 4 cartas na ordem, força média, traços de estilo | Confirmar |
| Rodada | As duas escalações, depois 4 tabuleiros do mesmo tamanho, placar parcial, outros resultados | Jogar, mudar velocidade |
| Classificação | Tabela após cada rodada, com pontos de match, de partida e desempate | Próxima rodada |
| Resultado final | Colocação, medalha, campanha rodada a rodada, destaque individual por mesa | Compartilhar imagem, copiar texto, jogar de novo |
| Replay | Tabuleiro com navegação pelos lances, nomes, resultado | Baixar PGN, voltar |

O tabuleiro usa chessground. As cartas mostram nome, país, ano, título, força (exceto no modo Mestre), traço de estilo e campanha real. Não usar fotos de jogadores reais.

### 10.1 Direção visual (DECIDIDO)

**Almanaque histórico:** o jogo tem cara de almanaque esportivo ou enciclopédia antiga. Papel envelhecido, tipografia serifada (Fraunces), filetes e linhas pontilhadas, escalações como listas tipográficas, Rodada com legenda de jornal, Resultado como certificado. Tokens, componentes e regras ficam em [docs/design.md](design.md).

- **Rodada:** os 4 tabuleiros têm o mesmo tamanho, para o usuário acompanhar todos os resultados ao mesmo tempo (4 em linha no desktop, 2 × 2 no celular). Não há mesa ampliada.
- Escolhida entre 5 direções comparadas num protótipo (Almanaque, Transmissão esportiva, Draft viral, Construtivismo soviético, Pixel art), guardado no branch `prototype/design-system`.

## 11. Compartilhamento

**DECIDIDO (2026-11-17): sem Desafio diário.** O usuário removeu o diário do roadmap.

- **Texto para compartilhar**, no estilo Wordle: modo, medalha e uma linha por rodada (vitória, empate ou derrota), mais o link com `?seed=` para um amigo tentar a mesma sessão.
- **Imagem para compartilhar:** a equipe escolhida, a colocação e o placar de cada rodada, gerada no navegador.

## 12. Arquitetura técnica

**DECIDIDO: aplicação 100% estática no navegador**, sem backend no MVP. Toda a lógica, os dados e a IA rodam no cliente; a hospedagem pode ser qualquer serviço de site estático.

### 12.1 Stack (PROPOSTO)

| Camada | Tecnologia | Motivo |
| --- | --- | --- |
| Base | TypeScript + React + Vite | Ecossistema maduro, build estático |
| Estado | Zustand | Simples, sem boilerplate |
| Tabuleiro | chessground | Tabuleiro do Lichess, pronto |
| Regras | chess.js | Lances, FEN, PGN, fim de partida |
| IA | maia3-js + onnxruntime-web, num Web Worker | Maia-3 no navegador sem travar a interface |
| Filtro de blunders | stockfish.js 18 (lite, single-thread, WASM) | Veta lances que perdem material (§8.1) |
| Aleatoriedade | Gerador com semente (biblioteca pronta, ex.: pure-rand) | Determinismo |
| Imagem | html-to-image | Imagem de resultado |
| i18n | i18next | pt-BR primeiro, outros idiomas depois |
| Testes | Vitest + Playwright | Unidade e ponta a ponta |
| Pipeline de dados | Node + TypeScript em `tools/data/` | Mesmos tipos do app |

### 12.2 Estrutura do repositório

```
src/
  app/            # telas e componentes React (inclui app/dev/Spike, rota de desenvolvimento)
  config/         # balance.ts
  data/           # carregamento e tipos dos arquivos publicados
  draft/          # sorteio, escolha, re-sorteios
  tournament/     # campo, emparelhamento, pontuação, desempates
  sim/            # simulação rápida (Elo) e orquestração das partidas
  engine/         # interface ChessAI, adaptador Maia-3, livros, worker
  share/          # texto e imagem de compartilhamento
  rng/            # gerador com semente e derivação de sementes
tools/engine/     # CLIs Node: play, bench, validate, ladder (calibração), quality (qualidade dos lances)
tools/data/       # pipeline offline
public/data/      # dados publicados, por versão
docs/GDD.md       # este documento
```

### 12.3 Interfaces principais

A lógica de torneio não conhece o Maia; depende apenas destas interfaces. Isso permite testar tudo com uma IA falsa e trocar o modelo depois.

```ts
interface MoveRequest {
  fen: string;
  priorMoves: string[];      // até 8 lances UCI
  selfElo: number;           // Elo do Maia (seção 6.2)
  oppoElo: number;
  temperature: number;       // estilo (seção 7.2)
  rng: () => number;
}

interface ChessAI {
  chooseMove(req: MoveRequest): Promise<{ move: string; wdl: [number, number, number] }>;
}

interface GameSimulator {
  playGame(white: PlayerCard, black: PlayerCard, seed: number): Promise<GameRecord>;
}

interface QuickSimulator {
  sampleResult(white: PlayerCard, black: PlayerCard, rng: () => number): 1 | 0.5 | 0;
}
```

### 12.4 Persistência

- **DECIDIDO (2026-11-17): sem retomar sessão e sem histórico de campanhas.** Fechar a aba encerra a campanha; `?seed=` continua reproduzindo a sessão do início.
- O jogo não guarda nada no `localStorage`.

## 13. MVP, fases e critérios de aceite

O MVP valida uma pergunta: montar uma seleção histórica e vê-la jogar uma Olimpíada com partidas reais do Maia é divertido e dá vontade de compartilhar?

| Fase | Conteúdo | Sai quando |
| --- | --- | --- |
| 0. Fundação | Projeto Vite, worker com Maia-3, IA falsa para testes, conjunto de amostra de dados, benchmark e calibração | Uma rodada roda no navegador dentro da meta de desempenho; curva de calibração definida |
| 1. MVP | Draft, torneio suíço, simulação, livros e estilo, 7 telas, compartilhamento | Critérios de aceite abaixo |
| 2. Dados completos | Pipeline com a fonte autorizada, todas as edições desde 1970 | Permissão obtida e relatório de validação limpo |
| 3. Expansão | Olimpíadas femininas, edições anteriores a 1970, relógios simulados, modo "jogar uma mesa" | A definir |

### 13.1 Calibração da fase 0

- Rodar Maia contra Maia em 3 níveis (Elo do Maia 1200, 1800, 2400), com diferenças de 0, 100, 200 e 400, pelo menos 200 partidas por combinação. Pode rodar em Node com onnxruntime-node, usando o mesmo código do worker.
- Registrar pontuação e taxa de empates; ajustar `toMaiaElo`, os parâmetros de empate por acordo (8.2) e os da simulação rápida (6.3).
- Resultado esperado: diferenças de força produzem aproximadamente a pontuação da fórmula Elo (cerca de 64% com +100, 76% com +200).

### 13.2 Critérios de aceite do MVP

- [x] Um draft completo tem 4 sorteios, permite até 3 re-sorteios e impede a mesma pessoa duas vezes.
- [x] O sorteio respeita os pesos e nunca repete a mesma seleção no mesmo draft (4.1).
- [x] O modo Mestre oculta a força em todas as telas até o fim do torneio.
- [x] O campo tem 23 seleções nas faixas configuradas, com pelo menos 3 campeãs e no máximo 2 por país.
- [x] O emparelhamento nunca repete confrontos e segue os grupos de pontuação.
- [x] Cada carta só ocupa a mesa em que jogou e joga nela todas as rodadas (4.3).
- [x] As partidas do usuário são jogadas pelo Maia-3 no worker, usando livro quando disponível (os dados `v1` ainda não têm livros, 7.1).
- [x] A mesma semente reproduz exatamente o mesmo draft, campo, emparelhamentos e partidas (backend WASM).
- [x] Classificação, desempates, medalhas e prêmios por mesa estão corretos (testes com torneios de exemplo).
- [x] Texto e imagem de compartilhamento são gerados no navegador.
- [x] Qualquer partida pode ser revista e baixada em PGN.
- [x] Todos os valores de balanceamento vêm de `balance.ts`.

Evidência de cada critério: [plano-mvp-aceite.md](plano-mvp-aceite.md) (2026-11-17).

## 14. Licenças, direitos e questões em aberto

### 14.1 Licenças e direitos

| Item | Situação | Observação |
| --- | --- | --- |
| Pesos do Maia-3 | AGPLv3 | Distribuídos ao navegador do usuário; avaliar obrigações |
| maia3-js | MIT | Permissiva |
| chessground | GPL-3.0 | O código do frontend distribuído fica sujeito à GPL |
| chess.js | BSD-2 | Permissiva |
| stockfish.js | GPL-3.0 | Distribuído ao navegador (filtro de blunders, §8.1); compatível com a GPL/AGPL já presentes |
| Escalações e resultados (de.wikipedia) | CC BY-SA 4.0 | Os dados publicados herdam a CC BY-SA, com atribuição |
| Pessoas, Elo e títulos (Wikidata) | CC0 | Atribuição por cortesia |
| Livros de abertura (Lichess masters) | Estatística agregada de lances | Atribuição ao Lichess; a API exige token pessoal, usado só na ferramenta offline |
| PGNs do PGN Mentor | Coleções gratuitas por jogador; licença não declarada | Só no desenvolvimento; os livros gerados ficam fora do git; saem quando os livros do Lichess entrarem (7.1) |
| Nomes de jogadores reais | Pessoas reais, muitas vivas | Jogo gratuito; nomes usados como fato histórico; não usar fotos |

**DECIDIDO (2026-11-16): código aberto (AGPL-3.0-or-later) e jogo gratuito**, sem anúncios nem pagamentos. Plano: [plano-codigo-aberto.md](plano-codigo-aberto.md). Este documento não é aconselhamento jurídico.

### 14.2 Questões em aberto

- [x] **Nome definitivo.** DECIDIDO (2026-11-16): **4 a 0**.
- [x] **Permissão de dados:** resolvido em 2026-11-16 (Wikipedia + Wikidata, §9.1).
- [x] **Fonte dos PGNs dos livros:** resolvido em 2026-11-16 (Lichess, §7.1).
- [ ] **Livro por carta (§7.1):** o Lichess não filtra por jogador. Usar livro por edição, por década, ou outra fonte por jogador? Ver [plano-livros.md](plano-livros.md).
- [ ] **Edições anteriores a 1970:** qual estimativa de força usar.
- [ ] **Normalização entre épocas:** compensar a inflação de rating ao longo das décadas, ou usar o rating da época como está?
- [ ] **Formato do torneio:** manter suíço puro ou testar grupos + mata-mata como alternativa.
- [ ] **Jogar uma mesa:** o usuário poderá assumir uma mesa e jogar ele mesmo? (pós-MVP)
- [ ] **Nacionalidade da equipe do usuário:** sem bandeira, bandeira escolhida, ou bônus por equipe de um só país?
- [ ] **Teto de 2600 do Maia:** a escala relativa é suficiente para as lendas parecerem lendas?

## Fontes

- [Maia-3: anúncio do lançamento como código aberto (Lichess)](https://lichess.org/@/ashtonanderson/blog/introducing-maia-3-free-and-open-source/vCPPRtX3)
- [Anúncio do maiachess.com: Maia-3 de 600 a 2600](https://lichess.org/@/ashtonanderson/blog/announcing-maiachesscom/DWhVq7m0)
- [maia3-js: API, variantes e licença](https://huggingface.co/cemoss17/maia3-onnx)
- [Maia3 ONNX: tamanhos e licença AGPLv3](https://huggingface.co/bqrio/maia3-onnx)
- [Maia Platform: Maia e Stockfish no navegador](https://github.com/CSSLab/maia-platform-frontend)
- [OlimpBase: resultados das Olimpíadas](https://www.olimpbase.org/olympiads/men_results.html)
- [OlimpBase: perguntas frequentes](https://olimpbase.org/utils/faq.html)
- [Como funciona o 7 a 0 (Critical Hits)](https://criticalhits.com.br/dicas/como-ganhar-7-a-0-guia-completo/)
- [O que é o 7 a 0 (O Povo)](https://www.opovo.com.br/esportes/futebol/copa-do-mundo/2026/06/08/7-a-0-veja-o-que-e-o-jogo-da-copa-do-mundo-que-tem-viralizado.html)
