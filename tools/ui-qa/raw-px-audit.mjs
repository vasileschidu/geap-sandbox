// Raw px audit — lists every px number written OUTSIDE a `var(--token, fallback)` in the project CSS,
// grouped by property family, and says whether a design token matches it exactly.
//
//   node tools/ui-qa/raw-px-audit.mjs                      summary per file × family
//   node tools/ui-qa/raw-px-audit.mjs --list               + every finding (file:line · selector · prop · value)
//   node tools/ui-qa/raw-px-audit.mjs --list --family spacing,radius
//   node tools/ui-qa/raw-px-audit.mjs --json out.json      machine-readable findings
//   node tools/ui-qa/raw-px-audit.mjs css/form-builder.css only these files
//   node tools/ui-qa/raw-px-audit.mjs --strict             exit 1 when a token-able px is left in a fixed family
//
// Families: spacing (padding*, margin*, gap, row-gap, column-gap), radius (border-*radius),
// border-width (border*, outline*, width part only), font-size, line-height, layout (width/height/min/max,
// top/right/bottom/left, inset, flex-basis) and other (anything else with px, incl. custom properties).
// The FIXED families (spacing, radius, border-width, font-size, line-height) must stay at 0 token-able px;
// what is left there is off-scale on purpose (listed so the PO decides). `0px`/`0` is never counted.
// Not scanned: css/main.css + Components/* (library), msupport/ (vendor widget), worktrees.
import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const flag = (n) => argv.includes("--" + n);
const opt = (n, d) => { const i = argv.indexOf("--" + n); return i > -1 ? argv[i + 1] : d; };
const optValues = new Set(["family", "json"].flatMap((n) => { const i = argv.indexOf("--" + n); return i > -1 ? [argv[i + 1]] : []; }));
const DEFAULT_FILES = [
  "css/e-permits-acte-permisive.css", "css/e-permits-shell.css", "css/form-builder.css", "css/process-designer.css",
  "css/page-reveal.css", "css/empty-state.css", "css/clasificatoare.css", "css/bo-login.css", "css/mpass-test.css",
  "cabinet-evo/cabinet-evo.css", "rap-evo/rap-evo.css", "solicitant-sandbox/sandbox.css",
];
const files = argv.filter((a) => !a.startsWith("--") && !optValues.has(a));
const FILES = files.length ? files : DEFAULT_FILES;
const FAMILIES = (opt("family", "") || "").split(",").filter(Boolean);

// Design tokens (design-system.md + css/main.css). Line-height tokens run on their fallbacks.
export const TOKENS = {
  spacing: { values: [2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 72, 80], name: (v) => `--spacing-${v}` },
  radius: { values: [4, 6, 8, 12, 16, 32], name: (v) => `--border-radius-${v}` },
  "border-width": { values: [1, 1.5, 2, 3, 4, 6, 8], name: (v) => `--border-width-${String(v).replace(".", "-")}` },
  "font-size": { values: [12, 14, 16, 18, 20, 24, 32, 56], name: (v) => `--font-size-fs-${v}` },
  "line-height": { values: [16, 20, 24, 26, 28, 32, 40, 64], name: (v) => `--line-height-lh-${v}` },
};
export const FIXED = ["spacing", "radius", "border-width", "font-size", "line-height"];

export function familyOf(prop) {
  const p = prop.toLowerCase();
  if (/^(padding|margin)(-|$)/.test(p) || /^(grid-)?(row-|column-)?gap$/.test(p)) return "spacing";
  if (/radius/.test(p)) return "radius";
  if (/^(border|outline)(-(top|right|bottom|left|inline|block)(-(start|end))?)?(-width)?$/.test(p)) return "border-width";
  if (p === "font-size") return "font-size";
  if (p === "line-height") return "line-height";
  if (/^(min-|max-)?(width|height|inline-size|block-size)$/.test(p) || /^(top|right|bottom|left|inset(-.*)?|flex-basis)$/.test(p)) return "layout";
  return "other";
}

// Exact-match token for a px value in a family. A 1 / 1.5 px term in spacing (or inside a calc() of a
// radius, e.g. `calc(12px - 1px)` for an inner corner) is a border compensation → --border-width-*.
export function tokenFor(family, px, inMath = false) {
  const n = Math.abs(px);
  if (family === "radius" && n >= 999) return "--border-radius-full";
  const t = TOKENS[family];
  if (t && t.values.includes(n)) return t.name(n);
  if ((n === 1 || n === 1.5) && (family === "spacing" || (family === "radius" && inMath))) return TOKENS["border-width"].name(n);
  return null;
}
// Is offset `i` of a (var-masked) value inside calc() / min() / max() / clamp()?
export function inMathAt(v, i) {
  const open = [];
  for (let k = 0; k < i; k++) {
    if (v[k] === "(") open.push(/(calc|min|max|clamp)$/.test(v.slice(Math.max(0, k - 5), k)));
    else if (v[k] === ")") open.pop();
  }
  return open.includes(true);
}

// Blank a range (keep newlines so offsets and line numbers stay valid).
const blank = (s) => s.replace(/[^\n]/g, " ");
function mask(src) {
  let out = src.replace(/\/\*[\s\S]*?\*\//g, blank);
  out = out.replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, (m) => m[0] + blank(m.slice(1, -1)) + m[0]);
  out = out.replace(/url\([^)]*\)/g, (m) => "url(" + blank(m.slice(4, -1)) + ")");
  return out;
}
// Blank every var(...) (balanced, incl. nested fallbacks) in a value.
export function maskVars(v) {
  let out = v; let i;
  while ((i = out.search(/var\(/)) > -1) {
    let depth = 0, j = i + 3;
    for (; j < out.length; j++) { if (out[j] === "(") depth++; else if (out[j] === ")" && --depth === 0) break; }
    out = out.slice(0, i) + "\u0000".repeat(j + 1 - i) + out.slice(j + 1);
  }
  return out;
}
export const PX_RE = /(?<![\w.#-])(-?)(\d*\.?\d+)px\b/g;

// Walks the CSS and yields every declaration with its absolute value range and selector.
export function* declarations(src) {
  const m = mask(src);
  const stack = []; let buf = ""; let start = 0; let depth = 0;
  for (let k = 0; k < m.length; k++) {
    const c = m[k];
    if (c === "(") depth++; else if (c === ")") depth--;
    if (depth > 0) { buf += c; continue; }
    if (c === "{") { stack.push(src.slice(start, k).replace(/\/\*[\s\S]*?\*\//g, "").trim().replace(/\s+/g, " ")); buf = ""; start = k + 1; continue; }
    if (c === ";" || c === "}") {
      const colon = buf.indexOf(":");
      if (colon > -1 && stack.length && !stack[stack.length - 1].startsWith("@font-face")) {
        const lead = buf.length - buf.trimStart().length;
        const prop = buf.slice(lead, colon).trim();
        if (/^-?-?[a-zA-Z][\w-]*$/.test(prop) && !/^@/.test(prop)) {
          const vStart = start + colon + 1; const vEnd = start + buf.length;
          yield { prop, selector: stack.join(" › "), vStart, vEnd, masked: m.slice(vStart, vEnd), declStart: start + lead };
        }
      }
      if (c === "}") stack.pop();
      buf = ""; start = k + 1; continue;
    }
    buf += c;
  }
}

export function audit(file) {
  const src = fs.readFileSync(file, "utf8");
  const lineAt = (() => { const nl = []; for (let i = 0; i < src.length; i++) if (src[i] === "\n") nl.push(i); return (off) => { let lo = 0, hi = nl.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (nl[mid] < off) lo = mid + 1; else hi = mid; } return lo + 1; }; })();
  const out = [];
  for (const d of declarations(src)) {
    const family = d.prop.startsWith("--") ? "other" : familyOf(d.prop);
    const v = maskVars(d.masked);
    for (const mm of v.matchAll(PX_RE)) {
      const px = parseFloat(mm[1] + mm[2]);
      if (px === 0) continue;
      const tok = tokenFor(family, px, inMathAt(v, mm.index));
      out.push({ file, line: lineAt(d.vStart + mm.index), selector: d.selector.slice(0, 140), prop: d.prop, value: src.slice(d.vStart, d.vEnd).trim().slice(0, 160), px, family, token: tok, offset: d.vStart + mm.index, length: mm[0].length });
    }
  }
  return out;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const all = FILES.flatMap((f) => (fs.existsSync(f) ? audit(f) : (console.error("missing " + f), [])));
  const fams = ["spacing", "radius", "border-width", "font-size", "line-height", "layout", "other"];
  const pad = (s, n) => String(s).padEnd(n);
  console.log(pad("file", 36) + fams.map((f) => pad(f, 13)).join("") + "  (n = raw px · t = token matches exactly)");
  for (const f of FILES) {
    const rows = all.filter((r) => r.file === f);
    console.log(pad(f, 36) + fams.map((fam) => { const r = rows.filter((x) => x.family === fam); return pad(r.length ? `${r.length} t${r.filter((x) => x.token).length}` : "0", 13); }).join(""));
  }
  const left = all.filter((r) => FIXED.includes(r.family) && r.token);
  console.log(`\nfixed families (${FIXED.join(", ")}): ${all.filter((r) => FIXED.includes(r.family)).length} raw px, ${left.length} with an exact token (should be 0)`);
  if (flag("list")) {
    const shown = all.filter((r) => (FAMILIES.length ? FAMILIES.includes(r.family) : FIXED.includes(r.family)));
    for (const r of shown) console.log(`${r.file}:${r.line}\t${r.family}\t${r.px}px\t${r.token ? "→ " + r.token : "OFF-SCALE"}\t${r.selector}\t{ ${r.prop}: ${r.value} }`);
  }
  if (opt("json")) fs.writeFileSync(opt("json"), JSON.stringify(all, null, 1));
  if (flag("strict") && left.length) process.exit(1);
}
