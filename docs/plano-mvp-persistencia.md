# Plano: retomar sessão e histórico local (GDD §10, §12.4)

**Situação:** planejado em 2026-11-16. O Desafio diário depende deste plano (uma tentativa por dia, retomável).

O GDD pede: "fechar a aba no meio do torneio permite retomar" (§12.4) e "histórico local de campanhas" na tela Início (§10). Não há critério de aceite explícito em §13.2, mas as duas coisas estão no escopo do MVP.

## O que salvar (`localStorage`, sempre com try/catch)

**`4a0:session`**: a sessão em andamento, gravada a cada mudança de fase.

- `schema` (versão deste formato), `dataVersion`, `modelVersion` (§8.4)
- `seed`, `mode`, `fastMode`
- estado do draft (`DraftState`, já serializável) ou equipe confirmada
- estado do torneio (`TournamentState`: emparelhamentos e resultados das rodadas fechadas)
- partidas já jogadas, para o Replay ([plano-mvp-replay-pgn.md](plano-mvp-replay-pgn.md))

A rodada em andamento **não** é salva: ao retomar, ela recomeça e é recalculada pela semente (§8.4), com as mesmas partidas.

**`4a0:history`**: as últimas `historyLimit` campanhas terminadas (data, modo, as 4 cartas, colocação, medalha, placar por rodada, semente). `historyLimit` não é balanceamento; fica numa constante de configuração do app.

## Passos

1. **Módulo `src/app/state/storage.ts`:** `loadSession`, `saveSession`, `clearSession`, `loadHistory`, `pushHistory`. Leitura com validação de forma; qualquer erro (indisponível, JSON corrompido, cota cheia) vira "sem dados", sem quebrar o jogo.
2. **Compatibilidade:** se `schema`, `dataVersion` ou `modelVersion` mudaram, a sessão salva é descartada, com um aviso no Início ("A campanha anterior não pode ser retomada após a atualização do jogo").
3. **Sessão:** salvar em `confirmTeam`, `finishRound`, `next` e nas ações do draft. Ao terminar o torneio, mover para o histórico e limpar a sessão.
4. **Início:**
   - "Continuar campanha" (equipe e rodada atual) quando houver sessão salva, com a opção de abandoná-la;
   - lista do histórico: data, modo, medalha/colocação; cada item permite "Jogar com a mesma semente".
5. **URL:** se a URL tem `?seed=` diferente da sessão salva, a URL vence e a sessão salva continua disponível no Início.
6. **Testes:** ida e volta da serialização; `localStorage` que lança exceção; JSON corrompido; versão diferente; retomar no meio do torneio produz os mesmos resultados de uma sessão sem interrupção (com a IA falsa).
