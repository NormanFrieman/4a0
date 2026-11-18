# Design system — Almanaque histórico

Direção visual **DECIDIDA** em GDD §10.1: o jogo tem cara de almanaque esportivo ou enciclopédia antiga. Este documento é a referência para construir as telas da Fase 1.

- **Catálogo vivo:** `pnpm dev` → `/dev/ui` (todos os componentes e estados, com o modo Mestre).
- **Tokens:** `src/app/styles.css` (`@theme`). **Componentes:** `src/app/ui/`.
- **Protótipo das 5 direções** (descartado): branch `prototype/design-system`.

## Princípios

1. **Tipografia antes de ornamento.** Hierarquia vem de peso, itálico, versaletes e filetes, não de caixas, sombras ou ícones.
2. **Papel, não tela.** Fundo de papel envelhecido, tinta marrom-escura, um único acento (vermelho-tijolo). Nada de gradientes vivos nem cantos arredondados.
3. **Números são protagonistas.** Força, placares e pontuações usam `tabular-nums` e o peso display. Meio ponto sempre com `½` (`formatPoints`).
4. **A direção visual vale para todos os modos.** No modo Mestre (força oculta, GDD §4.2), componentes que mostram força recebem `null` e exibem `?` (ou omitem).

## Tokens

Use as utilidades do Tailwind geradas pelos tokens (`bg-paper`, `text-ink`, `border-line`, `font-display`, `text-win`…). Nunca cores literais em componentes.

| Token                                | Valor                             | Uso                                              | Contraste em `paper` |
| ------------------------------------ | --------------------------------- | ------------------------------------------------ | -------------------- |
| `paper`                              | `#f3ead7`                         | Fundo da página                                  | —                    |
| `surface`                            | `#fbf6ea`                         | Vagas preenchidas, moldura do tabuleiro, caixas  | —                    |
| `ink`                                | `#2b2118`                         | Texto principal, filetes fortes, botão ativo     | 13,2                 |
| `muted`                              | `#6e5d49`                         | Legendas, kickers, texto secundário              | 5,3                  |
| `accent`                             | `#7a2e1f`                         | Seleção, botão primário, destaques (um por tela) | 7,9                  |
| `accent-ink`                         | `#fbf6ea`                         | Texto sobre `accent`                             | 8,7                  |
| `line`                               | `#cdbb9b`                         | Filetes, pontilhados, bordas (decorativo)        | —                    |
| `win` / `draw` / `loss`              | `#3f6b3a` / `#735a26` / `#8e2b22` | Resultado do ponto de vista do usuário           | 5,2 / 5,5 / 7,0      |
| `medal-gold` / `-silver` / `-bronze` | `#7d6216` / `#5f6366` / `#87512a` | Medalhas (texto)                                 | 4,8 / 5,1 / 5,4      |
| `champion`                           | `#7d6216`                         | Campeões mundiais: nome em dourado               | 4,8                  |
| `board-light` / `board-dark`         | `#efe3c8` / `#b49a6e`             | Casas do tabuleiro (sépia)                       | —                    |

Todos os textos atendem WCAG AA (≥ 4,5) sobre `paper` e `surface`.

**Fonte:** Fraunces (servida localmente via `@fontsource/fraunces`, pesos 400, 400 itálico, 700, 700 itálico, 900). `font-display` = títulos e números; o corpo usa a mesma família.

| Papel                   | Estilo                                                                 |
| ----------------------- | ---------------------------------------------------------------------- |
| Título do jogo / placar | 900, `text-4xl`–`text-6xl`                                             |
| Título de seção         | 700 itálico, `text-xl`–`text-2xl`                                      |
| Texto                   | 400, `text-base`                                                       |
| Legenda                 | 400 itálico, `text-muted`                                              |
| Kicker (mesa, rótulos)  | `text-[11px]`, versaletes (`uppercase tracking-[0.2em]`), `text-muted` |

## Componentes (`src/app/ui/`)

Todo texto de interface entra por props (vem do i18n quando o i18next entrar na Fase 1). Componentes não têm strings fixas.

| Componente                   | Uso                                                                                                                                                                                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Masthead`, `Rule`, `Kicker` | Cabeçalho de página (kicker, título, linha de seção com filetes), filete horizontal, rótulo em versaletes. `compact`: no desktop vira uma faixa de uma linha (todas as telas menos o Início)                                                          |
| `ScreenLayout`               | Esqueleto de tela: `header`, `footer` e `actions` fixos, conteúdo ocupa o resto da altura no desktop (painéis rolam por dentro com `lg:overflow-y-auto`). `actions` (os botões da tela) fica na base no desktop e logo abaixo do cabeçalho no celular |
| `Button`                     | `primary` (uma por tela), `secondary`, `link` (baixa ênfase), `toggle` (escolhas segmentadas, com `aria-pressed`)                                                                                                                                     |
| `Flag`                       | Bandeira 3:2 por código ISO minúsculo. `flag-icons` para países atuais; URSS (`su`), Iugoslávia (`yu`), Tchecoslováquia (`cs`) e Alemanha Oriental (`dd`) são desenhadas no componente. Código desconhecido mostra o código                           |
| `StyleTrait`                 | Traço Sólido / Equilibrado / Combativo (GDD §7.2)                                                                                                                                                                                                     |
| `LineupRow`                  | Uma carta na escalação do sorteio (Draft), selecionável. `strength: null` no modo Mestre                                                                                                                                                              |
| `TeamSlot`                   | Uma das 4 vagas; tracejada quando vazia, realçada (`awaiting`) quando há carta selecionada                                                                                                                                                            |
| `ChampionName`               | Nome do jogador; campeões mundiais (`Person.worldChampion`, GDD §10) em `champion` (dourado), com o rótulo do i18n como dica e para leitores de tela. `inherit` mantém a cor do texto (linha selecionada)                                             |
| `MatchScore`                 | Placar-manchete do match                                                                                                                                                                                                                              |
| `BoardFrame`                 | Tabuleiro chessground só leitura, tema sépia, moldura de papel                                                                                                                                                                                        |
| `BoardCard`                  | Uma partida da Rodada: mesa, status colorido, tabuleiro e jogadores (o de cima do tabuleiro primeiro; o usuário em negrito, o adversário em itálico)                                                                                                  |
| `ResultBadge`                | Texto colorido por resultado (`win`/`draw`/`loss`/`null` = ao vivo)                                                                                                                                                                                   |
| `EvalBar` | Barra de avaliação de filete fino ao lado do tabuleiro (GDD §8.6): pretas em `ink`, brancas em `paper`, contorno de 1 px em `line` e traço `muted` no 0,0; o lado das brancas acompanha a orientação do tabuleiro; `text` mostra o valor na ponta de quem está melhor (só no Replay). Só no Clássico |
| `formatPoints`, `outcomeOf`  | `1.5 → "1½"`; parcela do usuário → resultado                                                                                                                                                                                                          |

## Regras por tela

- **Draft:** escalação como lista tipográfica com pontilhados (`divide-dotted divide-line`) e `LineupRow`; vagas numa coluna lateral com `TeamSlot` (abaixo da lista no celular). Re-sorteio como `Button variant="link"`.
- **Rodada:** `MatchScore` no topo; **os 4 tabuleiros têm o mesmo tamanho** (`grid grid-cols-2 lg:grid-cols-4` de `BoardCard`): 4 em linha no desktop, 2 × 2 no celular. Não há mesa ampliada. No desktop, a grade é um contêiner de tamanho e cada tabuleiro é limitado pela altura disponível (`w-[min(100%,calc(100cqh-5rem))]`), então os 4 encolhem juntos com a janela. Velocidade com `Button variant="toggle"`; outros resultados como lista de texto abaixo.
- **Resultado:** medalha em formato de certificado (borda dupla `accent`) e, ao lado, abas Campanha | Classificação | Prêmios (`Button variant="toggle"` com `role="tab"` e `aria-selected`; abre na Campanha). Campanha em tabela pontilhada, destaques por mesa com pontilhado entre nome e pontos. Classificação final com a linha do usuário em `bg-surface`, a posição nas cores das medalhas e o placar contra cada equipe enfrentada (`ResultBadge`); abaixo de `sm`, o Buchholz some e o placar vai para baixo do nome.
- **Desktop (≥ `lg`): nenhuma tela rola a página.** Alvo mínimo 1366×768. O app ocupa exatamente a altura da janela (`Game.tsx`) e cada tela usa `ScreenLayout`: cabeçalho e ação principal ficam sempre visíveis; se uma lista não couber, rola só aquele painel. Masthead `compact` em todas as telas menos o Início. Abaixo de `lg` vale o fluxo normal, com rolagem.
- **Celular:** Draft e Resultado precisam funcionar em 375 px sem rolagem horizontal (GDD §10). Gutter de 16 px (`px-4`). Os botões de cada tela (`ScreenLayout` `actions`) ficam logo abaixo do cabeçalho, visíveis sem rolar; o que não é ação (ex.: "Outros resultados" da Rodada) continua no `footer`, depois do conteúdo.
- **Botão de ação do Início:** "Jogar" ocupa a largura da coluna em todas as telas (`w-full`); os outros botões primários têm a largura do texto.
- **Barra de rolagem "filete"** (`styles.css`, global): fina, reta, polegar em `line` sobre trilho transparente com filete `line`; no Safari, `muted` ao passar o mouse e `ink` ao arrastar.
- **Sem fotos** de jogadores reais (GDD §10). Identidade visual de jogador = nome, bandeira, ano.
