#!/usr/bin/env node
/* Chart palette check (chart-palette-v1, 2026-11-09): prints, for the widget / KPI chart palette in css/widget.css, the
   contrast of every token against white (marks need ≥ 3:1, WCAG 1.4.11) and between neighbouring series, plus the CIELAB
   lightness step (ΔL*) between neighbours — the colour-blind-safe cue (lightness, not hue alone).
   Usage: node tools/ui-qa/chart-palette.mjs [--try token,token,…]   (hex values are read from css/main.css) */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const css = readFileSync(join(root, "css/main.css"), "utf8");
const hexOf = (token) => {
  const m = css.match(new RegExp(`--${token}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`token --${token} not found in css/main.css`);
  return m[1].toUpperCase();
};
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const Lstar = (hex) => { const Y = lum(hex); return Y > 216 / 24389 ? 116 * Math.cbrt(Y) - 16 : (24389 / 27) * Y; };

const groups = {
  "Series (s1…s6)": ["blue-sky-600", "lavender-400", "blue-sky-800", "blue-sky-500", "purple-700", "gray-400"],
  "KPI zones (favorabil · avertizare · critic)": ["green-400", "apricot-300", "red-400"],
  "Heat map ramp (l1…l5)": ["blue-sky-150", "blue-sky-300", "blue-sky-400", "blue-sky-600", "blue-sky-800"]
};
const tryArg = process.argv.indexOf("--try");
if (tryArg > -1) { groups["--try"] = process.argv[tryArg + 1].split(","); }

let fail = 0;
for (const [name, tokens] of Object.entries(groups)) {
  console.log(`\n${name}`);
  tokens.forEach((t, i) => {
    const hex = hexOf(t);
    const w = contrast(hex, "#FFFFFF");
    const prev = i ? hexOf(tokens[i - 1]) : null;
    const nb = prev ? `  vs prev ${contrast(hex, prev).toFixed(2)}:1  ΔL* ${Math.abs(Lstar(hex) - Lstar(prev)).toFixed(0)}` : "";
    const markRule = name.startsWith("Series") && w < 3;
    if (markRule) fail += 1;
    console.log(`  --${t.padEnd(14)} ${hex}  vs white ${w.toFixed(2)}:1${markRule ? " (< 3:1)" : ""}  L* ${Lstar(hex).toFixed(0)}${nb}`);
  });
}
/* text drawn on a mark: treemap labels (`--wid-series-on`) and heat-map cell values */
const INK = "#121212";
const WHITE = "#FFFFFF";
console.log("\nText on marks (treemap labels, heat cells)");
[["blue-sky-600", WHITE], ["lavender-400", INK], ["blue-sky-800", WHITE], ["blue-sky-500", WHITE], ["purple-700", WHITE], ["gray-400", WHITE],
  ["blue-sky-150", INK], ["blue-sky-300", INK], ["blue-sky-400", INK]].forEach(([t, ink]) => {
  console.log(`  --${t.padEnd(14)} ${ink === WHITE ? "white" : "ink  "} text ${contrast(hexOf(t), ink).toFixed(2)}:1`);
});
process.exitCode = fail ? 1 : 0;
