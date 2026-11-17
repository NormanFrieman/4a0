/**
 * Minimal MediaWiki table parser for the de.wikipedia Olympiad pages. Pure
 * functions; only the subset of wikitext those pages use.
 */

export interface WikiCell {
  header: boolean;
  /** Cell content, attributes removed, markup kept. */
  raw: string;
}

export type WikiRow = WikiCell[];

/** Splits on `sep` outside [[…]] and {{…}}. */
function splitTopLevel(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const two = s.slice(i, i + 2);
    if (two === "[[" || two === "{{") {
      depth++;
      i++;
    } else if ((two === "]]" || two === "}}") && depth > 0) {
      depth--;
      i++;
    } else if (depth === 0 && s.startsWith(sep, i)) {
      out.push(s.slice(start, i));
      start = i + sep.length;
      i += sep.length - 1;
    }
  }
  out.push(s.slice(start));
  return out;
}

/** `style="…" | content` → `content` (a top-level single pipe ends the attributes). */
function dropAttributes(cell: string): string {
  const parts = splitTopLevel(cell, "|");
  return (parts.length > 1 ? parts.slice(1).join("|") : cell).trim();
}

/** Tables (`{| … |}`, not nested) in order of appearance. */
export function parseTables(text: string): { offset: number; rows: WikiRow[] }[] {
  const tables: { offset: number; rows: WikiRow[] }[] = [];
  const re = /^\{\|[^\n]*\n([\s\S]*?)^\|\}/gm;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const rows: WikiRow[] = [];
    for (const block of m[1]!.split(/^\|-[^\n]*$/m)) {
      const cells: WikiCell[] = [];
      for (const line of block.split("\n")) {
        const header = line.startsWith("!");
        if (!header && !line.startsWith("|")) continue;
        if (line.startsWith("|+")) continue; // caption
        // Split on the cell separators at the top level only.
        const body = line.slice(1);
        const pieces = header
          ? splitTopLevel(body, "!!").flatMap((p) => splitTopLevel(p, "||"))
          : splitTopLevel(body, "||");
        for (const p of pieces) cells.push({ header, raw: dropAttributes(p) });
      }
      if (cells.length) rows.push(cells);
    }
    tables.push({ offset: m.index, rows });
  }
  return tables;
}

/** Visible text: links → label, `{{0}}` padding and other templates removed, `<br>` → space. */
export function plainText(raw: string): string {
  return raw
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/'''?/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Target of the first internal link, `[[Target|label]]` → `Target`. */
export function linkTarget(raw: string): string | null {
  const m = /\[\[([^\]|#]+)/.exec(raw);
  return m ? m[1]!.trim().replace(/_/g, " ") : null;
}

/** First template, `{{SUN-1980}}` → `{ name: "SUN-1980", args: [] }`. */
export function firstTemplate(raw: string): { name: string; args: string[] } | null {
  const m = /\{\{([^{}]*)\}\}/.exec(raw);
  if (!m) return null;
  const [name, ...args] = m[1]!.split("|").map((s) => s.trim());
  return { name: name!, args };
}

/** German number: `3,5`, `3½`, `½`, `0,5` → 3.5 etc.; null when not a number. */
export function parseGermanNumber(s: string): number | null {
  const t = plainText(s).replace(/\s/g, "");
  const m = /^(\d*)(?:,(\d+)|(½))?$/.exec(t);
  if (!m || (!m[1] && !m[2] && !m[3])) return null;
  const whole = m[1] ? Number(m[1]) : 0;
  if (m[3]) return whole + 0.5;
  if (m[2]) return Number(`${whole}.${m[2]}`);
  return whole;
}
