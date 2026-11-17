/**
 * Renders public/og-image.png and public/apple-touch-icon.png from the HTML
 * sources next to this file, with headless Chromium (`CHROME` overrides the
 * binary). Run `pnpm seo:images` after changing them.
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const chrome = process.env.CHROME ?? "chromium";

const images = [
  { source: "tools/seo/og-image.html", out: "public/og-image.png", size: "1200,630" },
  { source: "tools/seo/icon.html", out: "public/apple-touch-icon.png", size: "180,180" },
];

for (const { source, out, size } of images) {
  execFileSync(chrome, [
    "--headless",
    "--disable-gpu",
    "--hide-scrollbars",
    "--allow-file-access-from-files",
    `--window-size=${size}`,
    `--screenshot=${root}${out}`,
    `file://${root}${source}`,
  ]);
  console.log(`wrote ${out}`);
}
