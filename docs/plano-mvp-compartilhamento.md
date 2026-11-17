# Plano: compartilhamento (GDD §11)

**Situação:** planejado em 2026-11-16. O texto do diário depende de [plano-mvp-desafio-diario.md](plano-mvp-desafio-diario.md); o do modo Clássico pode vir antes.

**Critério de aceite (§13.2):** "Texto e imagem de compartilhamento são gerados no navegador."

## Texto (estilo Wordle)

Função pura em `src/share/text.ts`:

```
4 a 0 · Desafio nº 42
🥈 2º lugar · 11 pts de match
🟩 3½–½  🟩 3–1  🟨 2–2  🟩 2½–1½  🟥 1½–2½  🟩 3–1  🟩 4–0
https://…/
```

- Uma marca por rodada (🟩 vitória, 🟨 empate, 🟥 derrota) com o placar do match. Medalha ou colocação.
- **Clássico/Almanaque:** cabeçalho com o modo e o link com `?seed=` (e `?modo=`), para um amigo tentar a mesma semente.
- **Diário:** número do desafio e link sem semente (o diário usa a do dia). Sem nomes das cartas, para não entregar o draft de quem ainda não jogou.
- **Copiar:** `navigator.clipboard.writeText`, com retorno visual ("Copiado"). Se falhar, mostrar o texto selecionável.
- Testes: texto de uma campanha de exemplo (vitórias, empates, derrotas, meio ponto), por modo.

## Imagem

- Biblioteca: **html-to-image** (GDD §12.1), dependência nova.
- Componente `ShareCard` (`src/app/ui/`) no estilo "certificado" do Resultado (§10.1): título, modo/número, as 4 cartas (nome, país, ano, mesa), colocação, medalha e placar por rodada. Usa os tokens do design system, nunca cores literais.
- Tamanho fixo 1080 × 1350 (4:5, bom para redes e celular), renderizado fora da tela e exportado em PNG com `pixelRatio` 1.
- **Fontes e bandeiras:** a Fraunces (fontsource) e os SVGs do flag-icons precisam entrar embutidos na imagem. Testar no Chrome, Firefox e Safari, porque html-to-image falha em silêncio com fontes externas.
- **Compartilhar:** no celular, `navigator.share({ files })` quando `navigator.canShare` aceitar o arquivo. No desktop (ou se falhar), baixar `4a0-{semente ou desafio}.png`.
- No diário, a imagem segue a regra do texto: sem nomes das cartas.

## Passos

1. `src/share/text.ts` com testes.
2. Botões no Resultado final: **Copiar texto** e **Compartilhar imagem** (textos via i18n).
3. `ShareCard` + exportação, com variante no catálogo `/dev/ui`.
4. Verificação manual em celular (Android e iOS) e desktop.
