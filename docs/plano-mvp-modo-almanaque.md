# Plano: modo Almanaque (GDD §4.2, §10)

**Situação:** planejado em 2026-11-16.

**Critério de aceite (§13.2):** "O modo Almanaque oculta a força em todas as telas até o fim do torneio."

Não confundir com a **direção visual** "Almanaque histórico" (§10.1), que vale para todos os modos.

## Regras

- O usuário escolhe no Início: **Clássico** (força visível) ou **Almanaque** (força oculta). O Desafio diário sempre usa o Almanaque (§11).
- Fica oculto: a força de cada carta e a força média das seleções (draft, confirmação, campo, pré-rodada, rodada).
- Fica visível: nome, país, ano, título, mesa, pontuação real na edição, medalhas, colocação final da seleção e traço de estilo. São dados históricos, não a força do jogo.
- No Resultado final, a força aparece: a revelação é parte da graça.

## Hoje

A força aparece em `Draft`, `Confirm`, `Field`, `PreRound`, `Round`, `LineupRow` e `BoardCard`, além do catálogo `UiCatalog`.

## Passos

1. **Modo na sessão:** `mode: "classic" | "almanac" | "daily"` em `session.ts`, gravado na URL (`?modo=almanaque`) para que `?seed=` continue reproduzindo a sessão.
2. **Uma regra só:** um hook `useShowStrength()` que devolve `false` quando o modo é `almanac` ou `daily` e o torneio não terminou. Os componentes de `src/app/ui/` (`LineupRow`, `BoardCard`) recebem `showStrength`; as telas não decidem por conta própria.
3. **Ordem das listas:** onde a ordem entrega a força (lista do campo ordenada por `avgStrength`), ordenar por ano e país no modo Almanaque. A lógica interna (emparelhamento por força, §5.2) não muda.
4. **Início:** dois botões, Jogar (Clássico) e Almanaque, com uma linha explicando cada um. Textos via i18n.
5. **Final:** coluna de força revelada na campanha e nas escalações.
6. **Testes:**
   - unidade: `useShowStrength` por modo e fase;
   - teste de render das telas no modo Almanaque: nenhum número de força aparece. Exige `@testing-library/react` e `jsdom` (dependências novas de desenvolvimento). A alternativa sem dependência nova é testar as funções de visualização (`cardView` em `screens/helpers.ts`) com a opção de ocultar.
7. Catálogo `/dev/ui`: variantes com e sem força.
