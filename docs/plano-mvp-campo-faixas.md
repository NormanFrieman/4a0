# Plano: campo por faixas de força (GDD §5.1)

**Situação:** planejado em 2026-11-16. Depende do [plano-dados.md](plano-dados.md): com 10 seleções de amostra não há como formar faixas.

**Critério de aceite (§13.2):** "O campo tem 23 seleções nas faixas configuradas, com pelo menos 3 campeãs e no máximo 2 por país."

## Hoje

`buildField` (`src/tournament/field.ts`) embaralha as seleções com a semente e aplica só o limite por país. Há um `TODO(Phase 2)` para `fieldTiers` e `fieldMinChampions`, que já estão em `balance.tournament`.

## Regras

- **Faixas:** ordenar todas as seleções do conjunto por `avgStrength` e cortar em três grupos pelos quantis `fieldTierQuantiles` (novo em `balance.tournament`; valor inicial: terços). A elite é o grupo de cima.
- **Quantidades:** `fieldTiers` = 6 elite, 9 intermediárias, 8 mais fracas.
- **Campeãs:** pelo menos `fieldMinChampions` (3) seleções com `finalRank === 1`, contadas dentro das 6 vagas de elite. Uma campeã fraca demais para a elite (comum nos anos 70) entra na faixa dela e conta mesmo assim.
- **País:** no máximo `fieldMaxPerCountry` (2), contando as três faixas juntas.
- **Equipe do usuário:** nada muda (§5.1, DECIDIDO): uma seleção do campo mantém o jogador que o usuário escolheu.

## Algoritmo (determinístico, `deriveRng(seed, "field")`)

1. Sortear as campeãs: embaralhar as seleções com `finalRank === 1` e pegar as primeiras `fieldMinChampions` que respeitem o limite por país. Cada uma ocupa uma vaga da sua faixa.
2. Completar cada faixa, de cima para baixo, com as seleções restantes daquela faixa, em ordem embaralhada, respeitando o limite por país.
3. Se uma faixa não tiver seleções suficientes (só com conjuntos pequenos), completar com a faixa vizinha e registrar um aviso. Nunca lançar erro com o conjunto completo.

Sortear com peso (`rollWeight`) não está no GDD para o campo. Fica uniforme dentro da faixa.

## Passos

1. Adicionar `fieldTierQuantiles` a `balance.ts` e ao GDD §5.5.
2. Reescrever `buildField` com as regras acima; o `TODO` sai.
3. Testes (`field.test.ts`), com o conjunto `v1` ou um conjunto sintético de ~500 seleções:
   - para 1 000 sementes: 23 seleções, contagem por faixa, ≥ 3 campeãs, ≤ 2 por país, sem repetir seleção;
   - mesma semente → mesmo campo;
   - conjunto pequeno → completa pela faixa vizinha, sem erro.
4. Conferir que o emparelhamento da rodada 1 (§5.2, por força média) continua coerente.
5. Remover `balance.sampleTournament` do app (fica só nos testes) quando o `v1` for o padrão.
