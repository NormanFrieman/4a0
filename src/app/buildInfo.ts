/**
 * Where the published source code lives (AGPL §13): injected at build time by
 * `define` in vite.config.ts. See docs/plano-codigo-aberto.md.
 */
declare const __SOURCE_URL__: string;
declare const __COMMIT__: string;

export const SOURCE_URL = typeof __SOURCE_URL__ === "string" ? __SOURCE_URL__ : "";
export const COMMIT = typeof __COMMIT__ === "string" ? __COMMIT__ : "";

/** Link to the exact commit of this build, or to the repository if unknown. */
export function sourceLink(url = SOURCE_URL, commit = COMMIT): string {
  return commit ? `${url}/tree/${commit}` : url;
}
