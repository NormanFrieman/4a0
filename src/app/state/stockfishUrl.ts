/**
 * Absolute URL of the Stockfish worker script served from /stockfish/
 * (vite.config.ts). Absolute because the Maia worker, which starts it,
 * lives under /assets/.
 */
export const stockfishUrl = () =>
  new URL(`${import.meta.env.BASE_URL}stockfish/stockfish-18-lite-single.js`, location.href).href;
