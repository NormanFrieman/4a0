# Avisos de terceiros

O código do 4 a 0 é distribuído sob a [AGPL-3.0-or-later](LICENSE). O jogo entrega ao navegador as obras de terceiros abaixo, cada uma com a sua licença. Ferramentas de desenvolvimento (Vite, TypeScript, Vitest, ESLint, onnxruntime-node etc.) não são distribuídas com o jogo e ficam fora desta lista.

Lista gerada com `pnpm licenses list --prod` e revisada à mão. Revise ao adicionar ou atualizar dependências.

## Entregues ao navegador

| Obra | Versão | Licença | Código-fonte |
| --- | --- | --- | --- |
| Pesos do Maia-3 (ONNX), baixados em tempo de execução | — | AGPL-3.0 | https://huggingface.co/cemoss17/maia3-onnx · projeto Maia: https://github.com/CSSLab |
| maia3-js | 0.2.0 | MIT | https://www.npmjs.com/package/maia3-js |
| onnxruntime-web (inclui o `.wasm`, servido pelo jsDelivr) | 1.31.1 | MIT | https://github.com/microsoft/onnxruntime |
| onnxruntime-common | 1.31.1 | MIT | https://github.com/microsoft/onnxruntime |
| flatbuffers | — | Apache-2.0 | https://github.com/google/flatbuffers |
| long | — | Apache-2.0 | https://github.com/dcodeIO/long.js |
| protobufjs e @protobufjs/* | — | BSD-3-Clause | https://github.com/protobufjs/protobuf.js |
| guid-typescript | — | ISC | https://github.com/NicolasDeveloper/guid-typescript |
| platform | — | MIT | https://github.com/bestiejs/platform.js |
| Stockfish (stockfish.js, build `stockfish-18-lite-single`) | 18.0.8 | GPL-3.0 | https://github.com/nmrugg/stockfish.js · https://github.com/official-stockfish/Stockfish |
| chessground | 9.2.1 | GPL-3.0-or-later | https://github.com/lichess-org/chessground |
| chess.js | 1.4.0 | BSD-2-Clause | https://github.com/jhlywa/chess.js |
| React e React DOM | 19.3.1 | MIT | https://github.com/facebook/react |
| i18next | 27.1.1 | MIT | https://github.com/i18next/i18next |
| react-i18next | 18.0.1 | MIT | https://github.com/i18next/react-i18next |
| zustand | 5.1.0 | MIT | https://github.com/pmndrs/zustand |
| flag-icons | 7.6.0 | MIT | https://github.com/lipis/flag-icons |
| Fonte Fraunces (@fontsource/fraunces) | 5.3.0 | SIL OFL 1.1 | https://github.com/undercasetype/Fraunces |

O texto completo de cada licença está no pacote correspondente em `node_modules/` e nos repositórios acima. GPL-3.0 e GPL-3.0-or-later são compatíveis com a AGPL-3.0, sob a qual o conjunto é distribuído.

## Dados

- Dados de teste (`public/data/sample/`): ver [public/data/sample/LICENSE.md](public/data/sample/LICENSE.md).
- Os dados definitivos, derivados da Wikipedia (CC BY-SA 4.0) e do Wikidata (CC0), e os livros de abertura do Lichess terão a sua licença e as suas fontes em `public/data/v1/LICENSE.md` (ver `docs/plano-dados.md` e `docs/plano-livros.md`).
