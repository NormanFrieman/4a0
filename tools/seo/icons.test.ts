import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(`../../${path}`, import.meta.url)), "utf8");

describe("favicon.svg", () => {
  const svg = read("public/favicon.svg");

  // Browsers drop a malformed SVG icon silently. The trap that bit us: a CSS
  // custom property (`--color-…`) in a comment, where XML forbids "--".
  it("has no '--' inside XML comments", () => {
    for (const [, body] of svg.matchAll(/<!--([\s\S]*?)-->/g)) {
      expect(body).not.toContain("--");
    }
  });

  it("is linked from index.html", () => {
    expect(read("index.html")).toContain('<link rel="icon" href="/favicon.svg"');
  });
});
