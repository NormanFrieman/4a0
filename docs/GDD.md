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

**4 a 0** (nome provisório, o placar perfeito de um match olímpico) é um jogo de navegador em que o jogador monta uma equipe de 5 enxadristas históricos e disputa uma Olimpíada de Xadrez contra seleções reais de várias épocas. As partidas são jogadas lance a lance pelo Maia-3, uma IA que joga como humanos de cada nível.

**Inspiração:** o jogo "7 a 0" e similares (38 a 0, 82 a 0), em que o usuário sorteia seleções históricas da Copa do Mundo, escolhe um jogador de cada uma e o jogo simula o torneio.

**A pergunta que o jogo responde:** "e se Tal, Kasparov e Carlsen jogassem na mesma equipe, venceriam a URSS de 1980?"

**Pilares (DECIDIDO):**

1. **Sessão curta e completa.** Montar a equipe em cerca de 2 minutos; torneio inteiro em menos de 15 (com opção de acelerar).
2. **História real.** Jogadores, escalações e seleções vêm de Olimpíadas reais.
3. **Partidas de verdade, não dados.** Os resultados saem de partidas jogadas pelo Maia, que podem ser assistidas e revistas.
4. **Decisões que importam:** quem escolher, em qual mesa colocar e quem descansa em cada rodada.
5. **Feito para compartilhar.** Desafio diário igual para todos e imagem de resultado.

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
| Draft | `Draft` | A fase de montar a equipe: 5 sorteios, 5 escolhas. |
| Equipe do usuário | `UserTeam` | As 5 cartas escolhidas, com mesa atribuída. |
| Mesa | `Board` | Posição 1 a 4 na equipe. Mesa 1 é a mais forte. |
| Reserva | `Reserve` | A 5ª carta; entra no lugar de um titular quando o usuário decide. |
| Campo | `Field` | Todas as seleções históricas que disputam o torneio contra o usuário. |
| Rodada | `Round` | Uma rodada do suíço: todas as equipes jogam um match. |
| Match | `Match` | Confronto de 4 partidas entre duas equipes. |
| Partida | `Game` | Uma partida de xadrez numa mesa. |
| Força de jogo | `strength` | Número que representa a força de uma carta na escala do jogo (seção 6). |
| Elo do Maia | `maiaElo` | Valor passado ao Maia-3 (600–2600), derivado da força de jogo. |
| Semente | `seed` | Número que torna uma sessão reproduzível. |

## 3. Fluxo de uma sessão

Uma sessão vai do primeiro sorteio à medalha, sem interrupção, em cerca de 15 minutos.

1. **Início:** o usuário escolhe o modo (Clássico ou Desafio diário). O jogo gera a semente da sessão.
2. **Draft (5 sorteios):** a cada sorteio aparece uma seleção histórica; o usuário escolhe um jogador, que vai para a vaga da mesa em que jogou na edição real.
3. **Confirmação:** revisão das mesas e confirmação da equipe.
4. **Sorteio do campo:** o jogo monta as seleções adversárias e mostra a lista de participantes.
5. **Rodadas (7 no MVP):** em cada uma, o usuário vê o adversário, escolhe quem descansa e assiste ao match. Os outros matches são simulados em segundo plano.
6. **Classificação:** atualizada após cada rodada.
7. **Resultado final:** colocação, medalha, destaques individuais e imagem para compartilhar.
8. **Replay:** qualquer partida pode ser revista e baixada em PGN.

## 4. Draft

O usuário monta uma equipe de 5 cartas em 5 sorteios: 4 titulares (mesas 1 a 4) e 1 reserva, como no formato atual da Olimpíada.

### 4.1 Sorteio

- Cada sorteio escolhe uma `NationalTeam` (país + edição) do conjunto de dados.
- **Peso do sorteio:** seleções que terminaram entre as 10 primeiras da sua edição têm peso `rollWeightTop10`; as demais, peso 1. Assim, equipes fortes aparecem com frequência suficiente sem dominar.
- Só entram seleções com pelo menos 4 jogadores com dados completos (nome, força, partidas).
- Um mesmo país + edição não aparece duas vezes no mesmo draft.

### 4.2 O que o sorteio mostra

- Bandeira, país, ano, cidade-sede e colocação final da seleção naquela edição.
- A escalação completa (4 a 6 jogadores), cada um com: nome, título, mesa em que jogou, força de jogo, pontuação real naquela edição (ex.: 8½/11) e medalhas.
- No modo **Almanaque**, a força de jogo fica oculta: o usuário decide pelo conhecimento histórico.

### 4.3 Escolha e vagas

- O usuário escolhe **um** jogador do sorteio. **Cada jogador só ocupa a vaga da mesa em que jogou na edição real:** quem foi mesa 1 só entra na vaga 1, e assim por diante; reservas reais (5º ou 6º tabuleiro) só entram na vaga Reserva.
- Jogadores cuja vaga já está ocupada não podem ser escolhidos. O sorteio só oferece seleções com pelo menos um jogador escolhível.
- A mesma pessoa não pode entrar duas vezes, mesmo de edições diferentes.
- **Ordem fixa durante o torneio (regra real da Olimpíada):** a ordem das 5 cartas é definida antes da 1ª rodada. Em cada rodada jogam 4 delas, na mesma ordem relativa. Ex.: ordem A, B, C, D, R; se B descansa, as mesas ficam A, C, D, R.

### 4.4 Re-sorteios

- O usuário pode descartar um sorteio e pedir outro, até `rerollsPerDraft` vezes por draft.
- No Desafio diário não há re-sorteios.

### 4.5 Configuração inicial

| Chave | Valor inicial |
| --- | --- |
| `draftSlots` | 5 (4 mesas + 1 reserva) |
| `rerollsPerDraft` | 3 |
| `rollWeightTop10` | 3 |

## 5. Torneio

O torneio é um suíço por pontos de match, como a Olimpíada real, encurtado para caber numa sessão: 7 rodadas contra um campo de 23 seleções históricas (24 equipes no total) no MVP.

### 5.1 Montagem do campo

- O campo é sorteado com a semente da sessão, em três faixas de força média: `fieldTiers` define quantas seleções de elite, intermediárias e mais fracas entram.
- A faixa de elite sempre inclui pelo menos `fieldMinChampions` seleções campeãs da sua edição.
- No máximo `fieldMaxPerCountry` seleções do mesmo país (ex.: URSS 1980 e URSS 1970 podem coexistir; três URSS não).
- **Jogador escolhido pelo usuário:** se a pessoa estiver numa seleção do campo, essa seleção usa o seu reserva real no lugar dela.
- Cada seleção do campo usa sua escalação real, na ordem de mesas real. Os 4 primeiros jogam todas as rodadas (sem rodízio no MVP).

### 5.2 Emparelhamento

- Rodada 1: campo ordenado por força média; metade de cima contra metade de baixo.
- Rodadas seguintes: grupos de mesma pontuação de match, metade de cima contra metade de baixo dentro do grupo, sem repetir confrontos. Desce-se um flutuante para o grupo seguinte quando necessário.
- Não é preciso seguir à risca o sistema holandês da FIDE. O importante é ser determinístico e sem repetições.
- **Cores:** a equipe listada primeiro joga de brancas nas mesas 1 e 3; a outra, nas mesas 2 e 4. Alternância por rodada, buscando equilíbrio.

### 5.3 Pontuação e desempates

- Partida: 1, ½ ou 0. Match: vitória (mais de 2 pontos) = 2 pontos de match; empate (2 a 2) = 1; derrota = 0.
- Classificação: pontos de match → pontos de partida → soma dos pontos de match dos adversários (Buchholz) → confronto direto.
- **Medalhas por equipe:** 1º ouro, 2º prata, 3º bronze.
- **Prêmios individuais:** melhor desempenho em cada mesa (mínimo de partidas jogadas).

### 5.4 Decisão por rodada

- Antes de cada rodada, o usuário vê o adversário (escalação e forças) e escolhe qual das 5 cartas descansa.
- Padrão: o reserva descansa. O usuário pode confirmar com um clique.

### 5.5 Configuração inicial

| Chave | Valor inicial |
| --- | --- |
| `rounds` | 7 |
| `fieldSize` | 23 (+ usuário = 24) |
| `fieldTiers` | 6 elite, 9 intermediárias, 8 mais fracas |
| `fieldMinChampions` | 3 |
| `fieldMaxPerCountry` | 2 |
| `matchPoints` | vitória 2, empate 1, derrota 0 |

## 6. Força dos jogadores

**DECIDIDO: o jogo simula força relativa, não o nível absoluto dos lances.** O Maia-3 cobre de 600 a 2600 na escala blitz do Lichess, e os jogadores olímpicos vão além disso na escala FIDE. Por isso cada carta tem uma força de jogo, que é convertida para o Elo do Maia preservando a ordem e as diferenças.

### 6.1 Força de jogo de uma carta

```latex
\text{strength} = R + k \cdot (P - R)
```

Onde R é o rating FIDE do jogador naquela edição, P é a performance dele na edição e k = `performanceWeight` (0,25 inicial). Assim, uma campanha histórica rende um pouco mais de força, sem apagar o rating.

- Sem rating FIDE (comum em seleções pequenas): usar a performance com k = 1, limitada por `unratedCap`.
- Edições anteriores a 1970 (sem Elo FIDE) ficam fora do MVP. Depois, usar estimativas históricas, a definir.
- A força é calculada no pipeline de dados (seção 9), não no navegador.

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
- Probabilidade de empate: `drawBase` + `drawSlope` × (força média − 2000) / 100, limitada a \[`drawMin`, `drawMax`\] e a 2 × min(E, 1 − E).
- Vitória das brancas = E − empate / 2. O resto é vitória das pretas.
- Os parâmetros devem ser ajustados para que a taxa de empates simulada fique próxima da taxa observada nas partidas Maia contra Maia do mesmo nível, para que os dois modos de simulação sejam coerentes.

### 6.4 Configuração inicial

| Chave | Valor inicial |
| --- | --- |
| `performanceWeight` | 0,25 |
| `unratedCap` | 2200 |
| `maiaEloRange` | 1000–2600 |
| `whiteAdvantage` | 35 |
| `drawBase` / `drawSlope` | 0,30 / 0,03 |
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
4. Validar e aplicar o lance com chess.js.

### 8.2 Fim de partida

- Regras do chess.js: xeque-mate, afogamento, tripla repetição, 50 lances, material insuficiente.
- **Empate por acordo:** a partir do lance `drawOfferFromMove`, se a avaliação WDL do Maia ficar com probabilidade de vitória entre 0,5 ± `drawBand` por `drawStableMoves` lances seguidos, a partida termina empatada. Esse é o principal ajuste para aproximar a taxa de empates da realidade.
- **Abandono:** se a probabilidade de vitória de um lado ficar abaixo de `resignProb` por `resignStableMoves` lances seguidos, ele abandona.
- **Limite:** ao atingir `maxPlies`, decide-se pela avaliação WDL (vitória acima de 0,85; senão, empate).
- Sem relógio no MVP. Relógios simulados são pós-MVP.

### 8.3 Ritmo e exibição

- Ao iniciar a rodada, o worker calcula as 4 partidas o mais rápido possível; a interface reproduz os lances no ritmo escolhido (1×, 4×, instantâneo).
- "Pular" mostra o resultado assim que o cálculo termina.
- Os matches do campo usam a simulação rápida (seção 6.3) e ficam prontos em milissegundos.
- Meta de desempenho: uma rodada completa (4 partidas) calculada em menos de 10 s num notebook comum com o modelo de 5M. Medir na fase 0.

### 8.4 Determinismo

- Semente de cada partida = hash(semente da sessão, rodada, mesa).
- Mesma semente + mesma versão de dados + mesma versão do modelo = mesmas partidas. A versão do modelo e dos dados é salva com cada sessão.
- Pequenas diferenças numéricas entre navegadores (WebGPU vs WASM) podem mudar um lance. Para o Desafio diário, forçar o backend WASM.

### 8.5 Configuração inicial

| Chave | Valor inicial |
| --- | --- |
| `topP` | 0,95 |
| `drawOfferFromMove` | 30 |
| `drawBand` / `drawStableMoves` | 0,08 / 10 |
| `resignProb` / `resignStableMoves` | 0,05 / 6 |
| `maxPlies` | 250 |
| `maiaModelVariant` | 5m (testar 23m) |

## 9. Dados

Os dados históricos são processados offline por scripts e publicados como arquivos estáticos. O navegador nunca acessa fontes externas.

### 9.1 Escopo e fontes

- **MVP:** Olimpíadas abertas (open) de 1970 em diante, que têm rating FIDE.
- **Depois:** Olimpíadas femininas (modo próprio) e edições de 1927 a 1968.
- **Fonte principal candidata:** OlimpBase, que reúne resultados, escalações, ratings e PGNs de todas as edições, com nomes padronizados. **É preciso obter permissão** antes de usar os dados (seção 14).
- Enquanto a permissão não vier, desenvolver com um **conjunto de amostra** pequeno, montado manualmente (3 a 4 edições), no mesmo formato.

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
| Início | Nome do jogo, modos, histórico local de campanhas | Jogar (Clássico ou Almanaque), Desafio diário, Como jogar |
| Draft | Cartão do sorteio (bandeira, ano, sede, colocação), escalação com as cartas, as 5 vagas, contador de re-sorteios | Escolher carta, escolher vaga, re-sortear |
| Confirmação | As 5 cartas na ordem, força média, traços de estilo | Confirmar |
| Rodada | Adversário e suas cartas, escolha de quem descansa, depois 4 tabuleiros do mesmo tamanho, placar parcial, outros resultados | Escolher descanso, mudar velocidade, pular |
| Classificação | Tabela após cada rodada, com pontos de match, de partida e desempate | Próxima rodada |
| Resultado final | Colocação, medalha, campanha rodada a rodada, destaque individual por mesa | Compartilhar imagem, copiar texto, jogar de novo |
| Replay | Tabuleiro com navegação pelos lances, nomes, resultado | Baixar PGN, voltar |

O tabuleiro usa chessground. As cartas mostram nome, país, ano, título, força (exceto no Almanaque), traço de estilo e campanha real. Não usar fotos de jogadores reais.

### 10.1 Direção visual (DECIDIDO)

**Almanaque histórico:** o jogo tem cara de almanaque esportivo ou enciclopédia antiga. Papel envelhecido, tipografia serifada (Fraunces), filetes e linhas pontilhadas, escalações como listas tipográficas, Rodada com legenda de jornal, Resultado como certificado. Tokens, componentes e regras ficam em [docs/design.md](design.md).

- Não confundir com o **modo Almanaque** (força oculta, §4.2): a direção visual vale para todos os modos.
- **Rodada:** os 4 tabuleiros têm o mesmo tamanho, para o usuário acompanhar todos os resultados ao mesmo tempo (4 em linha no desktop, 2 × 2 no celular). Não há mesa ampliada.
- Escolhida entre 5 direções comparadas num protótipo (Almanaque, Transmissão esportiva, Draft viral, Construtivismo soviético, Pixel art), guardado no branch `prototype/design-system`.

## 11. Desafio diário e compartilhamento

O Desafio diário dá a todos os usuários os mesmos sorteios e o mesmo campo no mesmo dia, para que os resultados sejam comparáveis.

- **Semente do dia** = hash(data em UTC, versão dos dados). Um desafio por dia, numerado a partir do lançamento.
- **Regras do diário:** modo Almanaque (força oculta) e sem re-sorteios.
- **Uma tentativa por dia** por navegador (guardado em `localStorage`; sem contas no MVP).
- **Texto para compartilhar**, no estilo Wordle: número do desafio, medalha e uma linha por rodada (vitória, empate ou derrota), mais o link do jogo.
- **Imagem para compartilhar:** a equipe escolhida, a colocação e o placar de cada rodada, gerada no navegador.
- **Pós-MVP:** ranking global do dia, que exigirá um backend mínimo para receber resultados e validar a semente.

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
tools/engine/     # CLIs Node: play, bench, validate, ladder (calibração)
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

- Sessão em andamento e histórico de campanhas no `localStorage`, com try/catch (pode estar indisponível).
- Fechar a aba no meio do torneio permite retomar: a sessão guarda semente, equipe e resultados já jogados; partidas são recalculadas pela semente.

## 13. MVP, fases e critérios de aceite

O MVP valida uma pergunta: montar uma seleção histórica e vê-la jogar uma Olimpíada com partidas reais do Maia é divertido e dá vontade de compartilhar?

| Fase | Conteúdo | Sai quando |
| --- | --- | --- |
| 0. Fundação | Projeto Vite, worker com Maia-3, IA falsa para testes, conjunto de amostra de dados, benchmark e calibração | Uma rodada roda no navegador dentro da meta de desempenho; curva de calibração definida |
| 1. MVP | Draft, torneio suíço, simulação, livros e estilo, 7 telas, Desafio diário, compartilhamento | Critérios de aceite abaixo |
| 2. Dados completos | Pipeline com a fonte autorizada, todas as edições desde 1970 | Permissão obtida e relatório de validação limpo |
| 3. Expansão | Olimpíadas femininas, edições anteriores a 1970, relógios simulados, ranking do diário, modo "jogar uma mesa" | A definir |

### 13.1 Calibração da fase 0

- Rodar Maia contra Maia em 3 níveis (Elo do Maia 1200, 1800, 2400), com diferenças de 0, 100, 200 e 400, pelo menos 200 partidas por combinação. Pode rodar em Node com onnxruntime-node, usando o mesmo código do worker.
- Registrar pontuação e taxa de empates; ajustar `toMaiaElo`, os parâmetros de empate por acordo (8.2) e os da simulação rápida (6.3).
- Resultado esperado: diferenças de força produzem aproximadamente a pontuação da fórmula Elo (cerca de 64% com +100, 76% com +200).

### 13.2 Critérios de aceite do MVP

- [ ] Um draft completo tem 5 sorteios, permite até 3 re-sorteios e impede a mesma pessoa duas vezes.
- [ ] O sorteio respeita os pesos e nunca repete país + edição no mesmo draft.
- [ ] O modo Almanaque oculta a força em todas as telas até o fim do torneio.
- [ ] O campo tem 23 seleções nas faixas configuradas, com pelo menos 3 campeãs e no máximo 2 por país.
- [ ] O emparelhamento nunca repete confrontos e segue os grupos de pontuação.
- [ ] A ordem fixa das mesas e a regra do reserva funcionam como em 4.3.
- [ ] As partidas do usuário são jogadas pelo Maia-3 no worker, usando livro quando disponível.
- [ ] A mesma semente reproduz exatamente o mesmo draft, campo, emparelhamentos e partidas (backend WASM).
- [ ] Classificação, desempates e medalhas estão corretos (testes com torneios de exemplo).
- [ ] O Desafio diário gera o mesmo conteúdo para todos no mesmo dia e permite uma tentativa.
- [ ] Texto e imagem de compartilhamento são gerados no navegador.
- [ ] Qualquer partida pode ser revista e baixada em PGN.
- [ ] Todos os valores de balanceamento vêm de `balance.ts`.

## 14. Licenças, direitos e questões em aberto

### 14.1 Licenças e direitos

| Item | Situação | Observação |
| --- | --- | --- |
| Pesos do Maia-3 | AGPLv3 | Distribuídos ao navegador do usuário; avaliar obrigações |
| maia3-js | MIT | Permissiva |
| chessground | GPL-3.0 | O código do frontend distribuído fica sujeito à GPL |
| chess.js | BSD-2 | Permissiva |
| Dados do OlimpBase | Projeto independente mantido por voluntários | Pedir permissão expressa antes de usar |
| PGNs do PGN Mentor | Coleções gratuitas por jogador; licença não declarada | Só para desenvolvimento dos livros (7.1); confirmar ou trocar a fonte antes do lançamento |
| Nomes de jogadores reais | Pessoas reais, muitas vivas | Avaliar uso de nome em jogo, sobretudo se comercial; não usar fotos |

Com AGPL e GPL na base, publicar o jogo como código aberto é o caminho mais simples. Antes de qualquer uso comercial, é necessária uma análise jurídica. Este documento não é aconselhamento jurídico.

### 14.2 Questões em aberto

- [ ] **Nome definitivo.** "4 a 0" é provisório; verificar se já existe jogo ou marca com esse nome.
- [ ] **Permissão de dados:** contatar o OlimpBase ou definir outra fonte.
- [ ] **Fonte dos PGNs dos livros:** confirmar a licença do PGN Mentor ou definir outra fonte.
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
