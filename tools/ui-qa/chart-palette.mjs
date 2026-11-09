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

/* chart-palette-v2: every „Culori” palette is read from css/widget.css (`.e-permits-wid--pal-<key>` blocks: --wid-pal-N,
   --wid-pal-N-on, --wid-heat-N); s6 „Altele” (gray-400) is appended to each series */
const wcss = readFileSync(join(root, "css/widget.css"), "utf8");
const palettes = [...wcss.matchAll(/\.e-permits-wid--pal-([a-z]+) \{([^}]*)\}/g)].map(([, key, body]) => {
  const tok = (name) => body.match(new RegExp(`--${name}:\\s*var\\(--([a-z0-9-]+)`))?.[1];
  const n = [1, 2, 3, 4, 5];
  return {
    key,
    series: n.map((i) => tok(`wid-pal-${i}`)),
    on: n.map((i) => (tok(`wid-pal-${i}-on`) === "color-text-base-default" ? "ink" : "white")),
    heat: n.map((i) => tok(`wid-heat-${i}`))
  };
});
if (!palettes.length) throw new Error("no .e-permits-wid--pal-* blocks in css/widget.css");
const groups = { "KPI zones (favorabil · avertizare · critic) — never part of a palette": ["green-400", "apricot-300", "red-400"] };
palettes.forEach((p) => {
  groups[`Series · ${p.key} (s1…s5 + s6 Altele)`] = [...p.series, "gray-400"];
  groups[`Heat ramp · ${p.key} (l1…l5)`] = p.heat;
});
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
    /* marks ≥ 3:1 on white (exempt by design: the light „Cer” palette, Neutru's light grey s2 — no lighter grey reaches 3:1); series neighbours ≥ 1.6:1 */
    const markRule = name.startsWith("Series") && !name.includes("· sky") && !(name.includes("· neutral") && ["gray-300", "blue-sky-300"].includes(t)) && w < 3;
    const nbRule = name.startsWith("Series") && prev && contrast(hex, prev) < 1.6;
    if (markRule || nbRule) fail += 1;
    console.log(`  --${t.padEnd(14)} ${hex}  vs white ${w.toFixed(2)}:1${markRule ? " (< 3:1)" : ""}  L* ${Lstar(hex).toFixed(0)}${nb}${nbRule ? " (neighbours < 1.6:1)" : ""}`);
  });
}
/* text drawn on a mark: treemap labels (`--wid-pal-N-on`) and heat-map cell values (ink on l1…l3, white on l4…l5);
   ≥ 4.5:1 for 12–14 px labels, ≥ 3:1 accepted (marked „large only”) */
const INK = "#121212";
const WHITE = "#FFFFFF";
palettes.forEach((p) => {
  console.log(`\nText on marks · ${p.key}`);
  const rows = [...p.series.map((t, i) => [t, p.on[i] === "ink" ? INK : WHITE, `s${i + 1}`]), ...p.heat.map((t, i) => [t, i < 3 ? INK : WHITE, `l${i + 1}`])];
  rows.forEach(([t, ink, where]) => {
    const c = contrast(hexOf(t), ink);
    if (c < 3) fail += 1;
    console.log(`  ${where} --${t.padEnd(14)} ${ink === WHITE ? "white" : "ink  "} text ${c.toFixed(2)}:1${c < 3 ? " (< 3:1)" : c < 4.5 ? " (large only)" : ""}`);
  });
});
process.exitCode = fail ? 1 : 0;
