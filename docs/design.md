# Decisões de design

Registro das decisões tomadas a partir do [design brief](design-brief.md). A fonte de verdade das regras continua sendo o [GDD](GDD.md).

## Referências

| O quê | Onde |
| --- | --- |
| Direções visuais exploradas (A clássico, B transmissão, C 8 bits) | https://claude.ai/artifact/82DVfiE8XQynPP6EdCCHnX |
| Design System (tokens, componentes, prévias) | https://claude.ai/artifact/4AGbz9CstJVvTcMKpdCD1E |

Os dois artifacts são privados e precisam ser compartilhados para outras pessoas abrirem.

## 2026-11-12: Direção visual

**Decisão:** a estrutura vem da **Transmissão** (B) e as peças e avatares, do **8 bits** (C).

- A base é uma transmissão de torneio: azul-marinho de estúdio, placar com as faixas das equipes, Barlow Condensed (display) e Barlow (texto).
- Equipes: atacante `attacker` (azul) e defensor `defender` (laranja). Azul × laranja continua distinguível para daltônicos.
- A pixel art fica restrita a **peças, ícones e avatares**, todos numa grade 8×8 (avatares 7×7) e desenhados para o projeto. Texto e números nunca usam fonte pixel.
- O tema escuro "Estúdio" é o padrão. O tema claro "Dia" existe para quem joga com luz forte.
- O Clube clássico (A) foi descartado.

## 2026-11-12: Acessibilidade de estados

- O resultado tem forma e símbolo: vitória = círculo com ✓, empate = losango com ½, derrota = quadrado com ✗. O texto vem sempre junto.
- Relógio: parado → ativo (placa clara) → baixo (< 60 s, ampulheta) → crítico (< 10 s, bandeira + anel piscando). Os limites devem ir para `balance.ts` quando o relógio for implementado.
- Xeque: casa vermelha **com moldura escura**, legível também em escala de cinza.
- Contraste conferido por script (fórmula WCAG) em todos os pares de texto, borda, ícone e foco, nos dois temas: **0 falhas**. Cinco pares do tema claro foram ajustados para passar (`on-accent` passou a ser branco no claro; `win`, `defender` e `coins` escureceram).
- Animações (pensando…, anel crítico, spinner) param com `prefers-reduced-motion`.

## Componentes definidos

**Base:**
- Button
- RatingBadge
- ProgressBar (XP, cansaço, espectro de estilo)
- Modal
- Toast
- ServerState (aguardando, reconectando com 60 s, erro)

**Domínio:**
- ResultBadge
- Clock
- Scoreboard
- Board (tema + peças pixel)
- PlayerStrip
- TableMini
- Avatar
- PlayerCard
- LineupRow
- ResourceCounter
- BuildingCard
- Icons

## Pendências

- Implementar os tokens no código (`apps/web/src/design/`) e o tema do chessground com as peças pixel exportadas como SVG.
- Entrada de lance por teclado na partida ao vivo.
- Celular: os componentes já quebram linha, mas nenhuma tela foi desenhada para telas pequenas (GDD §13).
- Rating e espectro de estilo podem mudar de escala depois da calibração. O formato visual continua.
