# Design Brief — Xadrez de Cidades

Ponto de partida para o design system e os protótipos do MVP. A fonte de verdade das regras continua sendo o [GDD](GDD.md); este brief só destaca o que importa para a interface. Decisões de design tomadas a partir daqui devem ser registradas em `docs/design.md`.

## 1. O produto em uma frase

Um jogo de navegador em que você administra uma cidade, forma uma equipe de 4 enxadristas de IA com comportamento humano e ataca outras cidades em matches de 4 tabuleiros, **jogando você mesmo uma das mesas ao vivo**.

A pergunta que o MVP precisa responder (GDD §12): *atacar uma cidade jogando uma mesa ao lado de 3 IAs é divertido?* O design deve servir principalmente a esse momento.

## 2. Público e contexto

- Jogadores de xadrez online (Lichess, Chess.com), de iniciantes (~600) a fortes (~2400). Conhecem relógio, PGN e rating.
- Também atrai fãs de jogos de gestão de base, mas o pilar nº 1 é: **o xadrez é o centro**.
- Sessões curtas: um ataque dura ~10–15 min (controle de tempo 5+3).

## 3. Restrições

| Tema | Regra |
| --- | --- |
| Idioma | Interface em **pt-BR**. Código e identificadores em inglês. |
| Plataforma | MVP **desktop-first** (navegador). Celular é questão em aberto (GDD §13); não bloquear a adaptação futura. |
| Tabuleiro | **chessground** (biblioteca do Lichess, GPL-3.0). Temas de casas e peças são trocáveis via CSS; o spike usa marrom + cburnett. O design pode propor tema próprio. |
| Originalidade | Inspirações (Clash of Clans, Olimpíada de Xadrez, Lichess) são de **gênero e mecânica**. Não copiar identidade visual, personagens, ícones ou layout de nenhum desses produtos. |
| Servidor autoritativo | O cliente envia intenções e espera confirmação. Prever estados de **aguardando servidor**, **reconexão** e **erro** em ações que gastam recursos e na partida ao vivo. |
| Sem timers agressivos | Construir é instantâneo (ou poucos segundos). Não desenhar filas de construção com contagem regressiva longa nem atalhos pagos para pular espera. |
| Acessibilidade | Contraste AA, foco visível, cores de resultado (vitória/empate/derrota) e de relógio que não dependam só de cor. |

## 4. Vocabulário da interface

Use sempre estes termos (GDD §2):

| Termo na UI | Conceito |
| --- | --- |
| Cidade | Base do jogador |
| Enxadrista | Personagem de IA |
| Elenco | Todos os enxadristas da cidade |
| Equipe titular | Os 4 que defendem, ordenados por mesa |
| Mesa 1–4 | Posição na equipe; mesa 1 é a mais forte |
| Match | Confronto de 4 partidas |
| Partida | Um jogo numa mesa |
| Ataque / Defesa | Match iniciado por você / contra você |
| Saque | Recursos tomados do defensor |
| Escudo | Período em que a cidade não pode ser atacada |
| Rating | Força numa escala tipo Elo, para enxadristas (800–2050) e para o jogador (sem teto) |

Recursos: **Moedas** (`coins`) e **Conhecimento** (`knowledge`). Prestígio é pós-MVP.

## 5. Telas do MVP

Derivadas dos critérios de aceite (GDD §12.2). Em ordem de prioridade para o protótipo:

### 5.1 Ataque ao vivo ★ (tela mais importante)
- **Sua mesa em destaque:** tabuleiro grande e jogável, relógios (o seu e o do adversário), nome e rating do adversário, botão de abandonar com confirmação.
- **As outras 3 mesas em miniatura**, atualizando em tempo real, cada uma com relógios, nomes e ratings. Clicar numa miniatura deve permitir espiá-la sem perder a sua partida de vista.
- **Placar parcial do match** (ex.: 1½ – ½), com as mesas terminadas marcadas.
- Indicação de cores por mesa: o atacante tem brancas nas mesas 1 e 3.
- Estados: conexão perdida (o servidor dá 60 s antes de declarar derrota por tempo), sua partida terminou enquanto as outras seguem, e o fim do match.

### 5.2 Resultado do match
- Placar final e veredito (vitória: 2½ ou mais; empate: 2; derrota: menos de 2).
- Resultado de cada mesa, com acesso ao replay.
- Saque obtido, XP e cansaço de cada enxadrista, e a **variação do seu rating**.
- Momento de celebração (ou de consolo) sem exagero. O pilar 5 diz: perder dói, mas não destrói.

### 5.3 Escolha de alvo (matchmaking)
- Até 3 cidades candidatas. Cada uma mostra a escalação adversária (4 nomes e ratings, por mesa), a média da equipe e o **saque estimado**.
- Comparação mesa a mesa com a **sua escalação**, já com você inserido na mesa definida pelo seu rating. Mostrar qual titular fica de fora.
- Ações: atacar (com o custo do ataque) e pedir nova lista (custa moedas).

### 5.4 Cidade (hub)
- 7 prédios: Prefeitura, Escola de Xadrez, Centro de Treinamento, Clube, Biblioteca, Armazém e Alojamento. Cada um com nível e ação de melhorar (custo e nível máximo limitado pela Prefeitura).
- Recursos no topo, com estoque e limite do Armazém, e coleta da produção acumulada do Clube e da Biblioteca.
- Status do escudo e atalho para **Atacar**.
- Formato livre: mapa ilustrado, grade ou painel. É uma decisão de design a explorar; não precisa ser isométrico.

### 5.5 Elenco e enxadrista
- Lista do elenco com a equipe titular destacada (mesas 1–4) e a capacidade do Alojamento (ex.: 6/8).
- **Card de enxadrista**, componente central do jogo, usado em várias telas:
  - nome, nacionalidade fictícia e aparência procedural (avatar gerado);
  - rating;
  - potencial: **oculto ("?")** até certo XP, ou uma estimativa em faixa dependendo do Centro de Treinamento;
  - barra de XP;
  - cansaço (0–100), que reduz a força; deixar claro que ele se recupera com o tempo;
  - estilo, num espectro de sólido a criativo.
- No MVP, a escalação é **automática** (por rating). Não desenhar arrastar e soltar de escalação.

### 5.6 Escola de Xadrez (recrutamento)
- Candidatos gerados, com faixa de rating e de potencial conforme o nível da Escola (GDD §8.4), e o custo de recrutar.
- Bloqueio quando o Alojamento está cheio.

### 5.7 Centro de Treinamento
- Montar uma sessão de treino (enxadristas da cidade entre si ou contra sparrings), com custo em Conhecimento.
- Acompanhar o treino rodando e ver o resultado: XP ganho e cansaço gerado.

### 5.8 Relatório de defesa
- Lista de ataques sofridos enquanto você estava offline: quem atacou, placar, recursos perdidos e escudo ganho.
- Replay das 4 partidas.

### 5.9 Conta e calibração
- Cadastro e login.
- **Calibração inicial:** o jogador informa um rating aproximado (ou "não sei"); em seguida vêm 5 partidas de calibração contra IA, sem recursos em jogo, com progresso visível (ex.: 2/5).

### 5.10 Replay de partida (componente)
- Tabuleiro com navegação lance a lance, lista de lances (SAN), relógios por lance e resultado e motivo do fim.
- Usado no resultado do match, no relatório de defesa e no treino.

## 6. Momentos-chave de experiência

1. **"Eu faço parte do time":** na escolha de alvo e no início do ataque, deixar claro em qual mesa você joga e por quê (o seu rating).
2. **Tensão coletiva:** durante o ataque, perceber como estão as outras mesas sem tirar o foco da sua. Exemplo: uma miniatura sinaliza quando uma mesa termina ou quando alguém está mal no relógio.
3. **IA que joga como gente:** as IAs pensam em ritmo humano (rápido na abertura, mais lento em posições difíceis). A interface pode reforçar isso, por exemplo com um indicador de "pensando…".
4. **Progresso tangível:** depois de cada match, ver claramente quem evoluiu (XP → rating) e o que dá para construir com o saque.

## 7. Entregáveis esperados

1. **Design system:** tokens (cores, tipografia, espaçamento, raios, sombras, modo claro e escuro), escala de cores para estados de partida (vitória, empate, derrota; relógio normal, baixo e crítico), iconografia de recursos e prédios, e componentes base (botões, cards, barras de progresso, badges de rating, modais, toasts).
2. **Componentes de domínio:** card de enxadrista, miniatura de mesa, relógio, placar de match, linha de escalação (mesa · nome · rating), contador de recursos e card de prédio.
3. **Protótipos das telas**, na ordem de prioridade da seção 5, começando pelo **Ataque ao vivo**.
4. Tema do tabuleiro (casas e destaques de último lance e xeque) coerente com o design system.

## 8. Fora do escopo (pós-MVP)

Não desenhar agora, mas não fechar portas: captura e resgate de enxadristas (reféns), especialidades, moral, repertório, Centro de Descanso e outros prédios pós-MVP, escalação manual, torneios, temporadas e ligas, federações, prestígio e ranking, e monetização.

## 9. Pontos em aberto que afetam o design

- **Nome do jogo:** "Xadrez de Cidades" é provisório. Evitar um logotipo definitivo.
- **Celular:** quando a interface precisará funcionar em telas pequenas (GDD §13).
- **Escala de rating (decidida na Fase 0):** enxadristas vão de 800 a 2050, numa escala comparável ao Lichess no meio da faixa. O rating do jogador humano pode passar de 2050. Prever números de 3 e 4 dígitos.
- **Atributo Estilo:** a temperatura afeta a força muito mais do que o previsto, e a faixa sólido ↔ criativo será rebalanceada. A apresentação visual (um espectro) continua válida.
- **Carregamento da IA no navegador:** ~7 s na primeira vez (download de 22 MB + inicialização). Vale apenas para replay, análise e treino livre, que precisam de um estado de carregamento. Partidas de ataque rodam no servidor e não têm essa espera.
