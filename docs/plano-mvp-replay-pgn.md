# Plano: Replay e PGN (GDD §3.8, §10)

**Situação:** planejado em 2026-11-16.

**Critério de aceite (§13.2):** "Qualquer partida pode ser revista e baixada em PGN."

**Escopo:** só as partidas da equipe do usuário têm lances. Os matches do campo usam a simulação rápida (§6.3), que sorteia só o resultado, sem lances. No Replay, "qualquer partida" quer dizer qualquer partida do usuário; os jogos do campo mostram só o resultado.

## Hoje

- `playGame` já devolve `GameRecord` com `moves` (SAN, UCI, FEN depois do lance, origem livro/engine) e `pgn` (`src/engine/game.ts`).
- A sessão (`src/app/state/session.ts`) guarda os lances só da rodada atual (`LiveRound.boards[].moves`). Na rodada seguinte eles se perdem.
- `?rapido=1` não gera lances (resultado sorteado). Nesse modo o Replay não existe.

## Passos

1. **Guardar as partidas.** Na sessão, um `games: GameArchive` com uma entrada por (rodada, mesa): cartas, cores, resultado, término e lista de lances (SAN). Preenchido em `finishRound`. O tamanho é pequeno (~28 partidas × ~1 kB) e entra também no salvamento local ([plano-mvp-persistencia.md](plano-mvp-persistencia.md)).
2. **PGN** (`src/share/pgn.ts` ou `src/sim/pgn.ts`, função pura):
   - cabeçalhos: `Event` ("4 a 0 — Olimpíada simulada"), `Site` (URL com `?seed=`), `Date`, `Round`, `Board`, `White`/`Black` (nome + ano da carta, ex.: "Karpov (1980)"), `WhiteTeam`/`BlackTeam`, `Result`, `Termination` (texto do motivo: mate, abandono, acordo…), `Annotator` ("Maia-3"), `Seed`;
   - comentário `{livro}` no último lance de livro (opcional);
   - teste: o PGN gerado é lido pelo chess.js e chega à mesma posição final.
3. **Tela Replay** (`src/app/screens/Replay.tsx`, nova fase `replay` com a tela de origem guardada para o "Voltar"):
   - chessground no `BoardFrame` do design system, só leitura;
   - navegação: início, anterior, próximo, fim; setas do teclado; clicar num lance da lista vai até ele;
   - lista de lances em SAN, nomes, mesa, resultado e motivo do término;
   - ações: **Baixar PGN** (Blob + `<a download>`, nome `4a0-{semente}-r{rodada}-m{mesa}.pgn`), **Baixar a campanha** (todas as partidas num arquivo) e **Voltar**.
4. **Entradas:**
   - Rodada, depois de terminada: cada tabuleiro abre o Replay daquela partida;
   - Resultado final: a campanha rodada a rodada, com link para cada partida, e "Baixar a campanha".
5. **i18n:** textos novos em `src/i18n/pt-BR.ts`.
6. Verificação: `pnpm test`, `pnpm typecheck`, `pnpm lint` e uma sessão completa no navegador abrindo partidas de rodadas diferentes.
