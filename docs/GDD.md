# Xadrez de Cidades — Documento de Definição

Nov 12, 2026 · @Norman · Nome do jogo provisório

## 0. Como usar este documento

Este documento é a fonte de verdade do projeto para o Claude Code. Exporte-o como Markdown, salve em `docs/GDD.md` no repositório e referencie-o no `CLAUDE.md` da raiz.

Regras para quem implementa:

- **Decisões marcadas como DECIDIDO** não devem ser alteradas sem pedido explícito. **Itens em Questões em aberto** devem ser perguntados, não presumidos.
- **Todo número de balanceamento é configurável.** Valores das tabelas de configuração vão para `packages/shared/src/config/balance.ts`, nunca hardcoded na lógica.
- **Código em inglês, interface em português (pt-BR).** Use os identificadores da coluna "Nome no código" do glossário.
- **Servidor autoritativo.** Toda regra que afete recursos, rating ou captura roda no servidor. O cliente só exibe e envia intenções.
- **Implementar por fases** (seção 12). Não antecipar funcionalidades pós-MVP.
- **Reutilizar bibliotecas prontas** (seção 10) em vez de reimplementar regras de xadrez, tabuleiro ou inferência.

## 1. Visão geral e pilares

Jogo de navegador em que o jogador administra uma cidade e forma uma equipe de 4 enxadristas controlados por IA. A equipe defende a cidade e ataca outras cidades em matches de 4 tabuleiros, no formato da Olimpíada de Xadrez. Quando ataca, o próprio jogador entra na equipe e joga uma das mesas ao vivo.

**Inspirações:** gestão de base do Clash of Clans; formato de equipes da Olimpíada de Xadrez; IA humana do projeto Maia.

**Pilares de design (DECIDIDO):**

1. **O xadrez é o centro.** Toda progressão existe para formar enxadristas mais fortes e montar uma equipe melhor.
2. **IA que joga como gente.** Enxadristas usam o Maia, que erra de forma humana e plausível para o seu nível.
3. **O jogador faz parte do time.** Ele joga uma mesa no ataque, na posição definida pelo seu rating interno.
4. **Progresso por jogar, não por esperar.** Sem timers agressivos de construção e treinamento.
5. **Perder dói, mas não destrói.** Captura de enxadristas existe, com proteções e caminho de resgate.

## 2. Glossário

| Termo | Nome no código | Definição |
| --- | --- | --- |
| Jogador | `User` | A pessoa humana, dona de uma cidade. Tem rating interno próprio. |
| Cidade | `City` | Base do jogador: prédios, recursos e elenco. |
| Enxadrista | `ChessPlayer` | Personagem de IA que joga partidas. Pertence a uma cidade. |
| Elenco | `Roster` | Todos os enxadristas de uma cidade. |
| Equipe titular | `Lineup` | Os 4 enxadristas que defendem a cidade, ordenados por mesa. |
| Mesa | `Board` | Posição 1 a 4 na equipe. Mesa 1 é a mais forte. |
| Match | `Match` | Confronto de 4 partidas entre duas equipes (um ataque ou uma rodada de torneio). |
| Partida | `Game` | Uma partida de xadrez em uma mesa. |
| Ataque | `Attack` | Match iniciado por um jogador contra outra cidade. |
| Saque | `Loot` | Recursos tomados do defensor ao fim de um ataque. |
| Escudo | `Shield` | Período em que uma cidade não pode ser atacada. |
| Refém | `Captive` | Enxadrista capturado, mantido temporariamente pela cidade atacante. |
| Rating interno | `rating` (Glicko-2) | Força estimada do jogador humano, na mesma escala dos enxadristas. |
| Potencial | `potential` | Rating máximo que um enxadrista pode atingir com treino. |
| Federação | `Federation` | Aliança de cidades para torneios (pós-MVP). |

## 3. Loop central

O ciclo principal é construir, formar, competir e reinvestir. Cada volta deixa a equipe mais forte.

1. **Construir:** gastar recursos em prédios que destravam recrutamento, treino e produção.
2. **Formar:** recrutar enxadristas na Escola e treiná-los até o potencial.
3. **Competir:** atacar cidades (jogando uma mesa) e ser atacado (defesa 100% IA, com o dono offline).
4. **Reinvestir:** saque, recompensas e experiência das partidas voltam para o passo 1.

Loop secundário, do jogador humano: jogar ataques ajusta o rating interno, que define em qual mesa ele joga. Melhorar como enxadrista real é parte da progressão.

## 4. Enxadristas e a engine Maia

**DECIDIDO: a IA dos enxadristas é o Maia-3.** Lançado como código aberto em maio de 2026, ele é um modelo único que recebe o rating desejado como entrada e cobre de 600 a 2600 (escala blitz do Lichess). Isso permite que cada enxadrista tenha um rating contínuo, sem pular entre modelos fixos como no Maia-1 (1100 a 1900, um modelo por faixa).

**DECIDIDO (Fase 0, nov/2026): escala de rating calibrada.** A validação da Fase 0 mostrou que o `selfElo` do Maia-3 é comprimido: os 2 000 pontos nominais (600–2600) valem só ~900 pontos de força real (ver `docs/benchmarks.md`). Por isso o **rating do jogo é a força real medida**, numa escala tipo Elo ancorada em Maia 1500 (T=1) = 1500, e cobre **800–2050**. Uma tabela de calibração (`engineCalibration` em `balance.ts`) converte o rating do jogo em `selfElo` + temperatura; abaixo de `selfElo` 600 e acima de 2600, a força vem da temperatura. Nessa escala, 200 pontos de diferença valem ~76%, como no Elo.

### 4.1 Como um enxadrista escolhe o lance

1. O servidor converte o rating efetivo do enxadrista (e o do adversário) em parâmetros da engine via `engineCalibration` e chama o Maia-3 com a posição (FEN + até 8 posições anteriores) e os `selfElo` e `oppoElo` convertidos.
2. O modelo devolve a distribuição de probabilidade dos lances legais e a avaliação vitória/empate/derrota (WDL).
3. O jogo **sorteia** o lance a partir da distribuição, com a temperatura dada pela calibração e o top-p do enxadrista, usando um gerador aleatório com semente própria. Não usar o argmax: ele faz o enxadrista jogar sempre igual.
4. Antes de enviar o lance, aplica-se um tempo de reflexão simulado (seção 6.4).

Como os parâmetros são informados a cada lance, os atributos podem modular a força lance a lance (somando ao rating efetivo antes da conversão). Isso é a base dos atributos abaixo.

### 4.2 Atributos

| Atributo | Faixa | Efeito no jogo | Como vira parâmetro da engine | MVP |
| --- | --- | --- | --- | --- |
| Rating | 800–2050 | Força base | `selfElo` + temperatura via `engineCalibration` | Sim |
| Potencial | rating–2050 | Teto de evolução pelo treino | Nenhum (só limita o treino) | Sim |
| Experiência (XP) | 0+ | Acumula com partidas e treino; converte em rating | Nenhum | Sim |
| Cansaço | 0–100 | Reduz a força após muitas partidas seguidas | Rating efetivo − até `fatigueMaxPenalty` | Sim |
| Estilo | sólido ↔ criativo | Jogo consistente ou imprevisível | **Em revisão** (ver Questões em aberto): a temperatura agora codifica força | Sim |
| Especialidade | abertura, meio-jogo ou final | Bônus de força numa fase da partida | Rating efetivo + bônus quando a posição está naquela fase | Pós-MVP |
| Repertório | livros de abertura | Aberturas preferidas | Livro Polyglot consultado antes do Maia | Pós-MVP |
| Moral | −10 a +10 | Sequências de vitórias ou derrotas | Rating efetivo ± pequeno ajuste | Pós-MVP |

**Rating efetivo** (por lance) = rating + bônus de especialidade + moral − penalidade de cansaço, limitado a \[800, 2050\]. Os parâmetros da engine saem desse valor via `engineCalibration`.

### 4.3 Criação (recrutamento)

- A Escola de Xadrez gera candidatos. O nível da Escola define a faixa de rating inicial e de potencial.
- O potencial é sorteado e fica **oculto** até o enxadrista atingir certo XP. O nível do Centro de Treinamento revela uma estimativa antes.
- Nome, nacionalidade fictícia e aparência são gerados proceduralmente.
- O elenco tem capacidade limitada pelo Alojamento. A cidade nunca fica com menos de 4 enxadristas (seção 7).

### 4.4 Evolução

- Partidas de qualquer tipo (ataque, defesa, treino) dão XP. Vitórias contra adversários mais fortes dão mais.
- O XP converte em rating com retorno decrescente perto do potencial: quanto mais perto do teto, mais XP por ponto.
- Valores iniciais de configuração:

| Chave | Valor inicial |
| --- | --- |
| `fatigueMaxPenalty` | 100 pontos de rating |
| `fatiguePerGame` | 15 |
| `fatigueRecoveryPerHour` | 10 |
| `ratingMin` / `ratingMax` | 800 / 2050 |
| `temperatureSolid` / `temperatureCreative` | 0,6 / 1,1 |

## 5. Jogador humano: rating interno e mesa

**DECIDIDO: a mesa do jogador no ataque é definida pelo seu rating interno**, na mesma escala dos enxadristas (a escala calibrada da seção 4; enxadristas cobrem 800–2050, mas o rating do jogador humano não tem teto).

### 5.1 Rating interno

- Sistema **Glicko-2** (rating, desvio RD e volatilidade). Usar biblioteca pronta.
- Atualizado após cada partida do jogador. O adversário é um enxadrista de IA, cujo rating efetivo naquela partida é conhecido.
- **Calibração inicial:** o jogador informa um rating aproximado (ou "não sei" = 1200) e começa com RD alto. As 5 primeiras partidas são de calibração: treinos sem recursos em jogo contra IAs de rating próximo ao estimado.

### 5.2 Escalação no ataque

1. Ordenar os 4 titulares por rating, do maior para o menor.
2. Inserir o jogador na posição correspondente ao seu rating interno. Empate de rating: o jogador fica à frente.
3. O titular que ficar na 5ª posição fica de fora deste match.

Exemplo: titulares 1900, 1750, 1600, 1400 e jogador 1650 → mesas 1900, 1750, **jogador**, 1600. O de 1400 descansa.

O defensor escala sempre por ordem de rating, como na Olimpíada. Escalação manual fica para depois (Questões em aberto).

## 6. Ataque e defesa

Um ataque é um match de 4 mesas: o jogador joga a sua ao vivo e as outras 3 são IA contra IA, simuladas no servidor. O defensor está offline e não participa.

### 6.1 Matchmaking

- O atacante recebe até 3 cidades candidatas e escolhe uma (pode pedir nova lista pagando moedas).
- Critério: média de rating da equipe titular do defensor dentro de ±`matchmakingWindow` da equipe do atacante (já com o jogador escalado).
- Excluir cidades com escudo, cidades do mesmo dono e cidades atacadas pelo mesmo jogador nas últimas `sameTargetCooldownHours`.
- Antes de confirmar, o atacante vê a escalação adversária (nomes e ratings) e o saque estimado.

### 6.2 Fluxo de um ataque

1. O jogador confirma o alvo. O servidor congela as duas escalações e cria `Match` + 4 `Game`.
2. Cores: o atacante tem brancas nas mesas 1 e 3; o defensor nas mesas 2 e 4 (padrão da Olimpíada).
3. A mesa do jogador começa ao vivo via WebSocket, com relógio controlado pelo servidor.
4. As 3 mesas de IA são calculadas por um worker. Os lances são enviados ao cliente com o tempo simulado, para parecerem ao vivo. O cliente nunca recebe lances futuros.
5. Quando as 4 partidas terminam, o servidor calcula placar, saque, XP, cansaço, rating do jogador e captura, numa única transação.
6. O defensor recebe um relatório com as 4 partidas para rever.

Se o jogador abandonar ou desconectar por mais de `disconnectGraceSeconds`, a partida dele é perdida por tempo. As partidas de IA seguem normalmente.

### 6.3 Placar e saque

- Cada partida vale 1 (vitória), ½ (empate) ou 0. Match: 2,5 ou mais = vitória; 2 = empate; menos de 2 = derrota.
- **Saque** = recursos desprotegidos do defensor × `lootRate` × (pontos do atacante ÷ 4). Vitória no match soma `lootWinBonus`.
- O Armazém do defensor protege uma parte dos recursos, que nunca pode ser saqueada.
- Derrota do atacante não tira recursos dele. O custo do ataque é a taxa de entrada (`attackCost`) e o cansaço dos enxadristas.

### 6.4 Partidas de IA

- **Controle de tempo** padrão: 5+3 (configurável). Vale também para a mesa do jogador.
- **Tempo de reflexão simulado:** mais rápido na abertura, mais lento em posições com distribuição de lances dispersa (baixa probabilidade do lance principal), sempre respeitando o relógio.
- **Fim da partida:** xeque-mate, afogamento, tripla repetição, 50 lances, material insuficiente ou tempo (regras via chess.js).
- **Adjudicação:** se a partida passar de `maxPlies`, decide-se pela avaliação WDL do Maia. Vitória se a probabilidade passar de `adjudicateWinProb`; senão, empate.

### 6.5 Defesa e escudo

- Defesa é sempre 100% IA. O dono não precisa estar online.
- Após uma derrota na defesa, a cidade ganha escudo de `shieldHoursOnLoss` horas. Atacar outra cidade remove o escudo do atacante.
- Enxadristas do defensor também ganham XP e cansaço.

### 6.6 Configuração inicial

| Chave | Valor inicial |
| --- | --- |
| `matchmakingWindow` | 100 pontos de rating |
| `sameTargetCooldownHours` | 24 |
| `lootRate` | 0,20 |
| `lootWinBonus` | +25% |
| `timeControl` | 300 s + 3 s por lance |
| `maxPlies` | 300 |
| `adjudicateWinProb` | 0,90 |
| `disconnectGraceSeconds` | 60 |
| `shieldHoursOnLoss` | 12 |

## 7. Captura e resgate de enxadristas

A captura só acontece após uma vitória esmagadora e nunca é imediata: o enxadrista vira refém e o dono tem prazo para resgatá-lo.

### 7.1 Quando acontece

- Somente se o atacante fizer **4 a 0**.
- Rola-se a chance `captureChance`. Em caso de sucesso, um enxadrista do defensor que perdeu sua partida é sorteado.
- **Não podem ser capturados:** enxadristas protegidos pela Federação (prédio, pós-MVP); a cidade com escudo de captura ativo; um enxadrista se a cidade ficaria com menos de 4.
- O atacante precisa ter vaga livre no Alojamento. Sem vaga, não há captura e o atacante recebe moedas como compensação.

### 7.2 Ciclo do refém

1. O enxadrista fica como refém na cidade atacante por `captiveHours`. Ele não joga por nenhuma das duas cidades nesse período.
2. O dono original pode resgatá-lo de duas formas: **pagar resgate** (`ransomCost`, proporcional ao rating) ou **vencer uma revanche** (atacar a cidade captora e vencer o match).
3. Se o prazo vencer sem resgate, o captor escolhe: **recrutar** (o enxadrista entra no elenco dele, com moral reduzida) ou **libertar** em troca de recursos.
4. A cidade que perdeu um enxadrista ganha `captureShieldHours` de proteção contra novas capturas.

### 7.3 Configuração inicial

| Chave | Valor inicial |
| --- | --- |
| `captureChance` | 0,25 |
| `captiveHours` | 72 |
| `ransomCost` | 10 moedas × rating |
| `captureShieldHours` | 72 |
| `minRosterSize` | 4 |

No MVP, a captura fica atrás de uma flag de configuração (`features.capture`), desligada por padrão até a fase 2.

## 8. Cidade, prédios e economia

**DECIDIDO: sem timers agressivos.** O ritmo vem de recursos e do cansaço dos enxadristas, não de espera.

### 8.1 Princípios de progressão

- **Construir e melhorar prédios é instantâneo** ou leva no máximo `maxBuildSeconds`. O limite é o custo e o nível da Prefeitura.
- **Treinar é jogar.** Uma sessão de treino no Centro de Treinamento roda partidas de IA entre enxadristas da cidade (ou contra sparrings gerados) e dá XP. Custa Conhecimento e gera cansaço.
- **O cansaço é o freio natural.** Ele se recupera com o tempo, mas o jogador nunca fica bloqueado: sempre pode jogar com outros enxadristas ou treinar o próprio xadrez.
- **Produção passiva acumula** até o limite do Armazém e é coletada quando o jogador quiser. Não há penalidade por ficar offline.

### 8.2 Recursos

| Recurso | Nome no código | Fontes | Usos |
| --- | --- | --- | --- |
| Moedas | `coins` | Clube, saque, vitórias | Construir, recrutar, atacar, resgatar |
| Conhecimento | `knowledge` | Biblioteca, saque, partidas do jogador | Sessões de treino, revelar potencial |
| Prestígio | `prestige` | Vitórias em matches e torneios | Ranking; não é gasto (pós-MVP) |

### 8.3 Prédios

| Prédio | Nome no código | Função | MVP |
| --- | --- | --- | --- |
| Prefeitura | `town_hall` | Define o nível da cidade e o nível máximo dos outros prédios | Sim |
| Escola de Xadrez | `chess_school` | Recruta enxadristas; nível define faixa de rating inicial e potencial | Sim |
| Centro de Treinamento | `training_center` | Sessões de treino; multiplica XP; revela estimativa de potencial | Sim |
| Clube | `club` | Produz moedas | Sim |
| Biblioteca | `library` | Produz conhecimento | Sim |
| Armazém | `warehouse` | Limite de estoque e parte protegida contra saque | Sim |
| Alojamento | `lodging` | Capacidade do elenco e vagas para reféns | Sim |
| Centro de Descanso | `rest_center` | Acelera a recuperação de cansaço | Pós-MVP |
| Academia de Finais | `endgame_academy` | Concede especialidade em finais | Pós-MVP |
| Sala de Aberturas | `opening_room` | Destrava livros de abertura (repertório) | Pós-MVP |
| Sede da Federação | `federation_hq` | Protege enxadristas contra captura; acesso a federações | Pós-MVP |
| Estádio | `stadium` | Destrava torneios de maior nível | Pós-MVP |

### 8.4 Faixas de recrutamento por nível da Escola

| Nível da Escola | Rating inicial | Potencial |
| --- | --- | --- |
| 1 | 800–1000 | até 1250 |
| 2 | 925–1100 | até 1425 |
| 3 | 1050–1250 | até 1600 |
| 4 | 1175–1375 | até 1800 |
| 5 | 1300–1500 | até 2050 |

Valores iniciais, todos configuráveis. Os custos de prédios por nível ficam numa tabela em `balance.ts`, a ser ajustada em playtest. Uma cidade nova começa com Prefeitura 1, Escola 1, Clube 1 e 4 enxadristas de rating 850–1000. As faixas foram reescaladas linearmente da escala nominal (600–2600) para a calibrada (800–2050), preservando as proporções da progressão.

## 9. Torneios estilo Olimpíada (pós-MVP)

Os torneios são o objetivo de longo prazo do jogo. Eles reutilizam o mesmo `Match` de 4 mesas dos ataques, então o MVP já deve modelar o match de forma independente do ataque.

- **Torneio suíço entre cidades:** rodadas em horários fixos, emparelhamento por pontos de match, desempate por pontos de partida (como na Olimpíada).
- **Participação do jogador:** se estiver online no horário da rodada, joga sua mesa ao vivo. Se não, um enxadrista do elenco o substitui.
- **Temporadas e ligas:** bronze, prata, ouro e elite, com promoção e rebaixamento ao fim de cada temporada. Recompensas em prestígio e itens exclusivos.
- **Federações:** alianças de cidades, equivalentes aos clãs. Disputam a "Olimpíada" da temporada como países, somando os resultados das cidades membras.
- **Torneios sem perdas:** não há saque nem captura em torneios. Só recompensas.

## 10. Arquitetura técnica

Monorepo TypeScript com servidor autoritativo. As engines rodam no servidor (DECIDIDO para o MVP). Rodar no navegador é avaliado num spike (10.6), restrito a modos sem recursos em jogo.

&#91;embedded content: arquitetura do MVP · 5 componentes\]

O servidor enfileira as partidas de IA no Redis; o worker joga com o Maia-3 e publica cada lance de volta, e o servidor transmite ao cliente e grava no banco.

### 10.1 Stack (PROPOSTO)

| Camada | Tecnologia | Motivo |
| --- | --- | --- |
| Monorepo | pnpm workspaces + TypeScript | Tipos compartilhados entre cliente, servidor e worker |
| Frontend | React + Vite | Ecossistema maduro |
| Tabuleiro | chessground | Tabuleiro do Lichess, pronto e testado |
| Regras de xadrez | chess.js | Geração e validação de lances, FEN, PGN, fim de partida |
| API | Node.js + Fastify + Zod | Rápido, validação tipada |
| Tempo real | Socket.IO | Partida ao vivo e transmissão das mesas de IA |
| Banco | PostgreSQL + Prisma | Transações para economia e resultados |
| Fila | Redis + BullMQ | Partidas de IA e sessões de treino em workers |
| IA | maia3-js + onnxruntime-node (Maia-3) | Mesma biblioteca roda em Node e no navegador |
| Rating | biblioteca Glicko-2 do npm | Não reimplementar |
| Testes | Vitest + Playwright | Unidade e ponta a ponta |

O pacote maia3-js tem variantes de 5M (embutida, \~21 MB), 23M e 79M parâmetros, e cerca de 10 ms por inferência em CPU. Começar com a de 5M e medir as maiores no spike de desempenho.

### 10.2 Estrutura do repositório

```
apps/
  web/            # React + Vite + chessground
  server/         # Fastify API + Socket.IO
  worker/         # BullMQ: partidas de IA, treinos
packages/
  shared/         # tipos, regras de jogo, config/balance.ts
  engine/         # interface ChessAI + adaptador Maia-3
  db/             # schema Prisma e migrações
docs/
  GDD.md          # este documento
```

### 10.3 Interface da engine

Todo código de jogo depende desta interface, nunca do Maia diretamente. Isso permite trocar o modelo ou rodar no navegador sem mudar a lógica.

```ts
interface MoveRequest {
  fen: string;
  priorMoves: string[];   // até 8 lances UCI anteriores
  baseFen?: string;       // posição antes do 1º lance de priorMoves (adição da Fase 0)
  selfElo: number;        // parâmetro do Maia (600–2600), convertido do rating efetivo
  oppoElo: number;
  temperature: number;
  topP: number;
  rng: () => number;      // gerador com semente, para reprodutibilidade
}

interface MoveResult {
  move: string;           // UCI
  policy: Record<string, number>;
  wdl: [number, number, number];
}

interface ChessAI {
  chooseMove(req: MoveRequest): Promise<MoveResult>;
}
```

O sorteio do lance é feito pelo nosso código a partir de `policy`, usando `rng`. A versão atual do maia3-js sorteia com `Math.random()` sem semente, então não usar o sorteio interno dele.

### 10.4 Modelo de dados (resumo)

| Entidade | Campos principais |
| --- | --- |
| `User` | id, email, senhaHash, rating, ratingRd, ratingVol, calibrationGamesLeft |
| `City` | id, userId, nome, nível, coins, knowledge, prestige, shieldUntil, captureShieldUntil |
| `Building` | id, cityId, tipo, nível, últimaColeta |
| `ChessPlayer` | id, cityId, nome, rating, potential, xp, fatigue, fatigueUpdatedAt, style, isStarter, captiveOfCityId, captiveUntil |
| `Match` | id, tipo (attack, training, tournament), cidadeA, cidadeB, status, placarA, placarB, seed, criadoEm |
| `Game` | id, matchId, mesa, brancas, pretas (ChessPlayer ou User), pgn, resultado, clocks, terminouPor |
| `LootRecord` | matchId, coins, knowledge |
| `ResourceLedger` | cityId, delta, motivo, refId, criadoEm (toda mudança de recurso passa aqui) |

### 10.5 API e eventos

REST (prefixo `/api`):

- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`
- `GET /city` (cidade, prédios, recursos, elenco)
- `POST /buildings/:type/upgrade`, `POST /buildings/:id/collect`
- `POST /school/recruit`, `POST /training/sessions`
- `PUT /lineup` (pós-MVP; no MVP a escalação é automática)
- `GET /attacks/targets`, `POST /attacks` (cria o match)
- `GET /matches/:id` (resultado e PGNs), `GET /reports/defenses`

Socket.IO (namespace `/match`):

- Cliente → servidor: `join(matchId)`, `move(uci)`, `resign()`
- Servidor → cliente: `state` (FEN, relógios), `move` (mesa, lance, relógios), `gameOver` (mesa, resultado), `matchOver` (placar, saque, variação de rating)

O servidor valida cada lance com chess.js e controla os relógios. Horário do cliente nunca é confiado.

### 10.6 Spike: engine no navegador

O site do projeto Maia já roda Maia e Stockfish no navegador com ONNX Runtime Web e WebAssembly, e o maia3-js tem build para navegador. A viabilidade técnica é conhecida. A questão é de confiança e desempenho.

- **Regra:** qualquer partida que afete recursos, rating ou captura roda no servidor, porque o cliente pode ser adulterado.
- **Candidatos a rodar no navegador:** análise e replay de partidas, modo de treino livre do jogador contra a IA, pré-visualização de enxadristas.
- **Medir no spike:** tempo de download do modelo, latência por lance em notebook e celular médios, uso de memória, comparação 5M vs 23M.
- **Entregável:** página de teste em `apps/web` que joga uma partida completa IA contra IA no navegador e registra as métricas.

## 11. Anti-trapaça e licenças

### 11.1 Anti-trapaça (em definição)

O risco principal é o jogador usar uma engine externa na sua mesa. Não existe solução perfeita. O MVP implementa a coleta de dados e sinais simples; as punições ficam para depois.

- **Servidor autoritativo:** lances validados e relógios controlados no servidor. Tempo por lance registrado em cada `Game`.
- **Sinal de precisão via Maia:** após cada partida, calcular a probabilidade que o Maia dá a cada lance do jogador no seu rating. Lances consistentemente improváveis para humanos daquele nível, mas fortes, geram um alerta.
- **Sinais de comportamento:** tempo por lance muito regular; perda de foco da aba durante a partida (sinal fraco, apenas registrado).
- **Contexto que reduz o dano:** controle de tempo curto e o fato de que trapacear só afeta a economia do jogo, não outros humanos diretamente.
- **Pós-MVP:** análise offline com Stockfish (perda média em centipeões), revisão manual e penalidades.

### 11.2 Licenças

| Componente | Licença | Observação |
| --- | --- | --- |
| Pesos do Maia-3 | AGPLv3 | Ponto de atenção: a AGPL alcança uso via rede |
| maia3-js | MIT | Wrapper JavaScript |
| chessground | GPL-3.0 | Afeta o código do frontend distribuído |
| chess.js | BSD-2 | Permissiva |
| Stockfish (se usado) | GPL-3.0 | Só no servidor, para análise |

Antes de qualquer lançamento comercial, é preciso uma análise jurídica das licenças AGPL e GPL. Uma saída possível é publicar o jogo como código aberto. Este documento não é aconselhamento jurídico.

## 12. Escopo do MVP e fases

O MVP valida uma pergunta: atacar uma cidade jogando uma mesa ao lado de 3 IAs é divertido? Tudo que não serve a essa pergunta fica para depois.

| Fase | Conteúdo | Sai quando |
| --- | --- | --- |
| 0. Fundação | Monorepo, pacote `engine` com Maia-3, CLI que joga IA contra IA em ratings dados, benchmark de desempenho, spike no navegador | Uma partida completa roda e os ratings produzem resultados coerentes |
| 1. MVP | Contas, cidade, 7 prédios do MVP, recrutamento, treino, rating Glicko-2, ataque com mesa ao vivo + 3 mesas de IA, saque, escudo, relatório de defesa | Critérios de aceite abaixo |
| 2. Profundidade | Captura e resgate, especialidades, moral, Centro de Descanso, escalação manual, sinais anti-trapaça | Playtest com captura ligada |
| 3. Competição | Torneios suíços, temporadas e ligas, federações, Olimpíada da temporada | Primeira temporada completa |

### 12.1 Validação da fase 0

Antes de construir o jogo, confirmar que o rating do Maia-3 se traduz em força de forma previsível:

- Rodar 200 partidas IA contra IA para cada diferença de rating (0, 100, 200, 400 pontos) em 3 faixas (900, 1500, 2100).
- A pontuação do mais forte deve seguir aproximadamente a curva Elo esperada (cerca de 64% com +100 e 76% com +200).
- Medir o efeito da temperatura na força, para calibrar o atributo Estilo.

**Resultado (nov/2026):** o `selfElo` do Maia-3 se mostrou monotônico, mas comprimido (400 pontos nominais valem de 140 a 270 reais, conforme a faixa), em qualquer temperatura e também no modelo 23M. Solução adotada: escala calibrada (seção 4), com a tabela `engineCalibration` medida por `pnpm engine:ladder`. Na verificação com sementes independentes, a escala calibrada seguiu a curva Elo dentro da margem de erro em todas as células (por exemplo, +200 → 73–76% e +400 → 88–91%). Detalhes em `docs/benchmarks.md`.

### 12.2 Critérios de aceite do MVP

- [ ] Usuário cria conta, faz login e recebe uma cidade inicial com 4 enxadristas.
- [ ] Prédios podem ser construídos e melhorados, consumindo recursos via `ResourceLedger`.
- [ ] Clube e Biblioteca produzem recursos até o limite do Armazém; a coleta funciona.
- [ ] A Escola recruta enxadristas nas faixas da tabela 8.4; o Alojamento limita o elenco.
- [ ] Uma sessão de treino roda partidas de IA no worker, dá XP e gera cansaço.
- [ ] As 5 partidas de calibração ajustam o rating Glicko-2 do jogador.
- [ ] O jogador vê 3 alvos de matchmaking com escalação e saque estimado.
- [ ] No ataque, o jogador é escalado na mesa correta pelo rating e joga ao vivo com relógio do servidor.
- [ ] As outras 3 mesas aparecem em miniatura, com lances transmitidos em ritmo simulado.
- [ ] Ao fim, placar, saque, XP, cansaço e rating são aplicados numa única transação.
- [ ] O defensor recebe o relatório com as 4 partidas e o escudo é aplicado.
- [ ] Todos os valores de balanceamento vêm de `balance.ts`.
- [ ] Testes cobrem: escalação pelo rating, cálculo de saque, fim de partida e adjudicação, conversão de XP em rating.

## 13. Questões em aberto

- [ ] **Nome do jogo.** "Xadrez de Cidades" é provisório.
- [ ] **Licenças:** código aberto ou comercial fechado? Depende da análise da AGPL do Maia-3 (11.2).
- [ ] **Anti-trapaça:** quais punições aplicar e com qual limiar de alerta (11.1).
- [ ] **Estilo:** a temperatura agora codifica força (0,6 vs 1,1 = ~250 pontos). Como implementar sólido ↔ criativo sem mudar a força? Opções: faixa estreita de temperatura com compensação no rating efetivo, ou usar o top-p. Precisa de medição na Fase 1.
- [ ] **Teto de rating:** a escala calibrada vai até ~2050 (Maia 2600 com temperatura 0,6). Jogadores humanos fortes não terão IAs do seu nível. Haverá níveis acima disso (por exemplo, Maia com busca ou Stockfish para enxadristas "lendários")?
- [ ] **Escalação manual:** o defensor poderá reordenar as mesas, ou vale sempre a ordem por rating?
- [ ] **Controle de tempo:** 5+3 para tudo, ou opções por modo (ataque, torneio)?
- [ ] **Balanceamento da captura:** 25% após 4 a 0 é suficiente para ser empolgante sem frustrar?
- [ ] **Monetização:** se houver, não pode vender força direta de enxadristas.
- [ ] **Celular:** o MVP mira desktop. Quando a interface precisa funcionar bem em telas pequenas?

## Fontes

- [Maia-3: anúncio de lançamento como código aberto (Lichess)](https://lichess.org/@/ashtonanderson/blog/introducing-maia-3-free-and-open-source/vCPPRtX3)
- [Anúncio do maiachess.com: Maia-3, ratings de 600 a 2600](https://lichess.org/@/ashtonanderson/blog/announcing-maiachesscom/DWhVq7m0)
- [maia3-js: API, variantes e licença (Hugging Face)](https://huggingface.co/cemoss17/maia3-onnx)
- [Maia3 ONNX: tamanhos dos modelos e licença AGPLv3](https://huggingface.co/bqrio/maia3-onnx)
- [Maia Platform frontend: Maia e Stockfish no navegador](https://github.com/CSSLab/maia-platform-frontend)
- [Maia original (Maia-1): modelos de 1100 a 1900](https://github.com/CSSLab/maia-chess)
