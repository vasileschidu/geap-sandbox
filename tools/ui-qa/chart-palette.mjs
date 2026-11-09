#!/usr/bin/env node
/* Chart palette check (chart-palette-v1, 2026-11-09; v4 categorical + colour-blind simulation, 2026-11-09): prints, for
   every „Culori” palette in css/widget.css, the contrast of each series token against white (marks need ≥ 3:1, WCAG
   1.4.11), the CIELAB lightness (L*) and the CIE76 colour distance (ΔE) between neighbouring series — normal vision and
   simulated deuteranopia / protanopia (Machado 2009, severity 1, applied in linear sRGB) — plus the closest pair of the
   whole set per vision; text on marks (treemap labels, heat-map values); heat ramps (one hue family, light → dark).
   Rules (exit 1 when broken): neighbours (s1…s5 + s6 „Altele”) ΔE ≥ 20 in all three visions and ΔL* ≥ 10; marks ≥ 3:1
   on white (exempt: the pastel „calm” palette and Neutru's light grey / light brand); text on marks ≥ 3:1; s1…s5 use
   five different hue families (gray counts once); heat ramp = one family, L* strictly falling.
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
const s2l = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const linRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255].map(s2l); };
const Yof = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const lum = (hex) => Yof(linRgb(hex));
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
/* colour-vision simulation (Machado, Oliveira & Fernandes 2009, severity 1.0) */
const SIM = {
  normal: null,
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]]
};
const simulate = (l, m) => (m ? m.map((r) => Math.min(1, Math.max(0, r[0] * l[0] + r[1] * l[1] + r[2] * l[2]))) : l);
const lab = ([r, g, b]) => {
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, Y = Yof([r, g, b]), Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
};
const dE = (a, b, vision) => { const [p, q] = [a, b].map((t) => lab(simulate(linRgb(hexOf(t)), SIM[vision]))); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
const Lstar = (t) => lab(linRgb(hexOf(t)))[0];
const family = (t) => t.replace(/-\d+$/, "");

/* every „Culori” palette is read from css/widget.css (`.e-permits-wid--pal-<key>` blocks: --wid-pal-N, --wid-pal-N-on,
   --wid-heat-N); s6 „Altele” (gray-400) is appended to each series */
const wcss = readFileSync(join(root, "css/widget.css"), "utf8");
const palettes = [...wcss.matchAll(/\.e-permits-wid--pal-([a-z]+) \{([^}]*)\}/g)].map(([, key, body]) => {
  const tok = (name) => body.match(new RegExp(`--${name}:\\s*var\\(--([a-z0-9-]+)`))?.[1];
  const n = [1, 2, 3, 4, 5];
  return { key, series: n.map((i) => tok(`wid-pal-${i}`)), on: n.map((i) => (tok(`wid-pal-${i}-on`) === "color-text-base-default" ? "ink" : "white")), heat: n.map((i) => tok(`wid-heat-${i}`)) };
});
if (!palettes.length) throw new Error("no .e-permits-wid--pal-* blocks in css/widget.css");
const tryArg = process.argv.indexOf("--try");
if (tryArg > -1) palettes.push({ key: "try", series: process.argv[tryArg + 1].split(","), on: [], heat: [] });
const EXEMPT = (key, t) => key === "calm" || key === "try-calm" || (key === "neutral" && ["gray-300", "blue-sky-300"].includes(t));
const VISIONS = Object.keys(SIM);

let fail = 0;
const bad = (msg) => { fail += 1; return ` ✗ ${msg}`; };
console.log("KPI zones (favorabil · avertizare · critic) — never part of a palette: green-400 · apricot-300 · red-400");
for (const p of palettes) {
  const tokens = [...p.series, "gray-400"];
  console.log(`\nSeries · ${p.key} (s1…s5 + s6 Altele)`);
  tokens.forEach((t, i) => {
    const w = contrast(hexOf(t), "#FFFFFF");
    let line = `  s${i + 1} --${t.padEnd(17)} ${hexOf(t)}  white ${w.toFixed(2)}:1  L* ${Lstar(t).toFixed(0)}`;
    if (i < 5 && w < 3 && !EXEMPT(p.key, t)) line += bad("mark < 3:1");
    if (i) {
      const prev = tokens[i - 1];
      const d = VISIONS.map((v) => dE(t, prev, v));
      const dl = Math.abs(Lstar(t) - Lstar(prev));
      line += `  | vs prev ΔE ${d.map((x, j) => `${VISIONS[j]} ${x.toFixed(0)}`).join(" · ")}  ΔL* ${dl.toFixed(0)}`;
      if (Math.min(...d) < 20) line += bad("neighbours ΔE < 20");
      if (dl < 10) line += bad("neighbours ΔL* < 10");
    }
    console.log(line);
  });
  const fams = new Set(p.series.map(family));
  if (fams.size < 5 && p.key !== "neutral") console.log(`  hue families ${[...fams].join(", ")}${bad("fewer than 5 hue families")}`);
  VISIONS.forEach((v) => {
    let min = Infinity, pair = "";
    tokens.forEach((a, i) => tokens.slice(i + 1).forEach((b) => { const d = dE(a, b, v); if (d < min) { min = d; pair = `${a} / ${b}`; } }));
    console.log(`  closest pair · ${v.padEnd(6)} ΔE ${min.toFixed(0)}  (${pair})${min < 10 ? " (info: < 10, not neighbours)" : ""}`);
  });
}
/* text drawn on a mark: treemap labels (`--wid-pal-N-on`) and heat-map cell values (ink on l1…l3, white on l4…l5);
   ≥ 4.5:1 for 12–14 px labels, ≥ 3:1 accepted (marked „large only”) */
const INK = "#121212";
const WHITE = "#FFFFFF";
palettes.filter((p) => p.heat.length).forEach((p) => {
  console.log(`\nText on marks + heat ramp · ${p.key}`);
  const rows = [...p.series.map((t, i) => [t, p.on[i] === "ink" ? INK : WHITE, `s${i + 1}`]), ...p.heat.map((t, i) => [t, i < 3 ? INK : WHITE, `l${i + 1}`])];
  rows.forEach(([t, ink, where]) => {
    const c = contrast(hexOf(t), ink);
    console.log(`  ${where} --${t.padEnd(17)} ${ink === WHITE ? "white" : "ink  "} text ${c.toFixed(2)}:1${c < 3 ? bad("< 3:1") : c < 4.5 ? " (large only)" : ""}`);
  });
  const hf = new Set(p.heat.map(family));
  if (hf.size !== 1) console.log(`  heat families ${[...hf].join(", ")}${bad("heat ramp must be one hue family")}`);
  if (p.heat.some((t, i) => i && Lstar(t) >= Lstar(p.heat[i - 1]))) console.log(`  heat L* ${p.heat.map((t) => Lstar(t).toFixed(0)).join(" → ")}${bad("heat ramp must get darker")}`);
});
/* chart-status-v1: the fixed status colours (js/widget-charts.js STATUS_COLOURS → css `.e-permits-wid-st-<tone>`), each
   dimension in its value order: neighbours ΔE ≥ 20 in all three visions (ΔL* printed; the meaning wins over lightness) */
const jsSrc = readFileSync(join(root, "js/widget-charts.js"), "utf8");
const mapTxt = jsSrc.match(/const STATUS_COLOURS = (\{[\s\S]*?\n  \});/)?.[1];
if (!mapTxt) throw new Error("STATUS_COLOURS not found in js/widget-charts.js");
const STATUS = Function(`return (${mapTxt});`)();
const stTok = Object.fromEntries([...wcss.matchAll(/\.e-permits-wid-st-([a-z-]+) \{ --wid-series: var\(--([a-z0-9-]+)/g)].map(([, tone, t]) => [tone, t]));
for (const [dim, values] of Object.entries(STATUS)) {
  console.log(`\nStatus colours · ${dim}`);
  Object.entries(values).forEach(([value, tone], i, arr) => {
    const t = stTok[tone];
    if (!t) { console.log(`  ${value} → ${tone}${bad("no .e-permits-wid-st-" + tone + " class")}`); return; }
    let line = `  ${value.padEnd(18)} ${tone.padEnd(14)} --${t.padEnd(14)} white ${contrast(hexOf(t), "#FFFFFF").toFixed(2)}:1`;
    if (i) {
      const prev = stTok[arr[i - 1][1]];
      const d = VISIONS.map((v) => dE(t, prev, v));
      line += `  | vs prev ΔE ${d.map((x) => x.toFixed(0)).join(" · ")}  ΔL* ${Math.abs(Lstar(t) - Lstar(prev)).toFixed(0)}`;
      if (Math.min(...d) < 20) line += bad("neighbours ΔE < 20");
    }
    console.log(line);
  });
}
console.log(fail ? `\n${fail} problem(s)` : "\nAll palettes pass.");
process.exitCode = fail ? 1 : 0;
