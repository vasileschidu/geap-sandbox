// UI QA — components only (2026-10-18, user: „use only components, do an audit; I need an agent to verify”;
// v2 2026-10-21, user: „use only our components, and add it in skills / agents so we don't get back to this again”).
//
// RUNTIME (headless Chrome, demo states at 1440 + 375 with touch emulation, like capture.mjs):
//   1. non-library-control — a visible control (input, select, textarea, button, painted link, role=button|combobox|
//      switch|checkbox|radio|tab|menuitem…) that is not a library primitive, a listed product root, or a class documented
//      in the Component Inventory of .claude/skills/components.md. v2: a BEM part of a documented block passes ONLY when
//      the part itself is documented (short `__part` names resolve against their block), when it is internal anatomy of a
//      listed `product` root it sits in, or when spec.partAllow lists it. Struck-through / removed inventory rows document
//      nothing.
//   1b. button-paint (v2, major) — any control (or [tabindex=0] / [onclick] element) that paints like a button (fill /
//      box border / inset ring + radius or side padding, at a button size) without the library `.btn`; documented
//      exceptions = spec.buttonPaint.allow (with a reason).
//   2. sizes — fields: phones (≤760) 48 high with 16/24 text, desktop 40, icons inside a field at the library size
//      (48 → 24, 40 → 20); v2 buttons: `.btn` 32 / 40 / 48 high, own icon 16 (Small) / 20 (Medium, Large) as in
//      css/button-icons.css; tags: Small (20) everywhere.
//   3. look-alike (minor) — styled like a control (pointer + paint, or border + radius + padding) without a control
//      role or a known class; clickable-non-control (minor, v2) — [tabindex=0] / [onclick] without a control role.
//   4. copy — copy-variant / copy-in-list / missing-copy (spec.copy).
//   5. back navigation — crumb-trail / back-link (spec.backNav).
//   6. action icons — action-icon / action-icon-colour (spec.actionIcons).
//   8. tooltips — tooltip-private / tooltip-title (spec.tooltip): ONE runtime, js/icon-tooltip.js (tooltip-one-v1).
//   9. drawers — drawer-private (spec.drawer): ONE drawer, .drawer-overlay > aside.drawer (drawer-v1).
//   10. skeletons — skeleton-private (spec.skeleton): ONE .skeleton + --text / --input / --block / --circle (skeleton-v1).
//   11. radios — radio-private / radio-size / radio-colour / radio-text (spec.radio): ONE radio = Figma Components 13:34
//      / 13:41 (css/radio.css, radio-v1): label.radio.radio--{medium|small} > input.radio-input + span.radio-custom
//      (+ .radio-texts), Medium 24 · dot 12 · 16/24 500, Small 20 · dot 10 · 14/20 500, ring 2, gap 12, state colours.
//   7. converge (v2, minor) — a non-canonical implementation of a pattern family (spec.families: pager, stepper,
//      close ×, notice, tag, switch, back, menu item, dialog shell, key-value list).
//   + interactions (v2): per state, opens up to N visible menu / drawer / disclosure triggers (aria-haspopup,
//     aria-expanded=false, stack / cab menu triggers) and hovers tooltip triggers (desktop), and audits what opened.
//   + desktop-only states (spec.desktopOnly: Ghișeu, srv-, svc-10…, trf-, pd-) are SKIPPED on phone viewports.
//
// STATIC (--static): product sources (js/, css/, cabinet-evo/, rap-evo/, the root HTML pages; never Components/* or
//   css/main.css): library-restyle, hardcoded-colour, private-token, private-palette, inline-svg-icon, role-button,
//   native-title, monospace, converge (spec.static + spec.families › static), radio-restyle (major, rule 11: a rule
//   outside css/radio.css that repaints .radio-custom / .radio-label / .radio-description or a private radio circle).

//
// Output (incremental, resumable): <out>/report*.ndjson (one line per state × viewport, appended as measured) →
//   aggregated into <out>/report.json + <out>/summary.md; static → <out>/static.json + <out>/static.md.
//
// Usage (from anywhere; paths are resolved from the repo root):
//   node --experimental-websocket --no-warnings tools/ui-qa/component-audit.mjs \
//     --states fo-02,pp-01 | --prefix fo-,sm- | --all | --pages
//     [--viewports desktop,mobile[,edge|<width>]] [--scope "<css>"] [--no-interactions] [--max-triggers 8]
//     [--out tools/ui-qa/out/components] [--resume] [--workers 4] [--baseline <older report.json>]
//     [--spec tools/ui-qa/specs/component-audit.json]
//   … --static [--out <dir>]          static rules over the source tree (can be combined with a runtime selection)
//   … --summary --out <dir>           re-aggregate the ndjson of an (interrupted) run into report.json + summary.md
//   Full project sweep: … --all --resume --workers 4 --out tools/ui-qa/out/components/sweep   +   … --static
// Needs the prototype served on http://localhost:8935 and Google Chrome.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SELF = fileURLToPath(import.meta.url);
process.chdir(path.resolve(path.dirname(SELF), "../.."));
const ARGV = process.argv.slice(2);
const has = (name) => ARGV.includes("--" + name);
const arg = (name, def) => { const i = ARGV.indexOf("--" + name); return i > -1 && ARGV[i + 1] !== undefined && !/^--[a-z]/.test(ARGV[i + 1]) ? ARGV[i + 1] : def; };
const BASE = arg("base", "http://localhost:8935");
const PAGE = arg("page", "e-permits-acte-permisive.html");
const OUT = arg("out", "tools/ui-qa/out/components");
const SCOPE = arg("scope", "");
const SPEC_PATH = arg("spec", "tools/ui-qa/specs/component-audit.json");
const BASELINE = arg("baseline", "");
const CHROME = arg("chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
const VPS = (arg("viewports", "desktop,mobile")).split(",").filter(Boolean);
const PART = arg("part", "");
const WORKERS = Math.max(1, Number(arg("workers", "1")) || 1);
const INTERACT = !has("no-interactions");
const spec = JSON.parse(fs.readFileSync(SPEC_PATH, "utf8"));
if (arg("max-triggers")) spec.interactions.maxTriggers = Number(arg("max-triggers"));
fs.mkdirSync(OUT, { recursive: true });

/* ------------------------------------------------------------------------------- inventory (components.md § 2) */
/* every backticked `.class` in a row of the Component Inventory documents that class (a modifier `x--y` documents its
   block `x` too). v2: short names (`__node`, `button.__lane-rail`, `__primary--danger`) resolve against the block of
   the last full class in the same cell; rows whose first cell is struck through (`~~…~~`) or says „removed” document
   nothing, and struck spans inside a cell are ignored. */
const parseInventory = () => {
  const md = fs.readFileSync(".claude/skills/components.md", "utf8");
  const inv = md.slice(md.indexOf("## 2. Component Inventory"), md.indexOf("## 3. Library component contracts"));
  const documented = new Set(); const removed = new Set(); let removedRows = 0, shortResolved = 0;
  const addClass = (set, c) => { if (/^(is|has)-/.test(c) || c.length < 4) return; set.add(c); if (c.includes("--")) set.add(c.split("--")[0]); };
  for (const line of inv.split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line.split(/(?<!\\)\|/).slice(1, -1);
    if (!cells.length || /^\s*-{3}/.test(cells[0])) continue;
    const gone = /^\s*~~/.test(cells[0]) || /\(removed\b/i.test(cells[0]);
    if (gone) removedRows++;
    for (const cell of cells) {
      let block = "";
      for (const tick of cell.replace(/~~[^~]+~~/g, "").matchAll(/`([^`]+)`/g)) {
        for (const m of tick[1].matchAll(/(?:\.([a-zA-Z][\w-]*))|(?:(?:^|[\s.>(,+~])(__[a-zA-Z][\w-]*))/g)) {
          let c = m[1];
          if (c) { if (!/^(is|has|js|u)-/.test(c)) block = c.split("__")[0].split("--")[0]; }
          else if (block) { c = block + m[2]; shortResolved++; }
          else continue;
          addClass(gone ? removed : documented, c);
        }
      }
    }
  }
  for (const c of documented) removed.delete(c);
  return { documented, removed, removedRows, shortResolved };
};
const INV = parseInventory();
const documented = INV.documented;

/* the menu-item family's canonical list = the item selectors of css/dropdown.css (the ONE dropdown item) */
for (const F of Object.values(spec.families || {})) {
  if (!F || !F.canonicalFrom || !fs.existsSync(F.canonicalFrom.file)) continue;
  const css = fs.readFileSync(F.canonicalFrom.file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of css.matchAll(/([^{}]+)\{/g)) if (m[1].includes(F.canonicalFrom.contains)) {
    for (const s of m[1].split(",").map((x) => x.trim()).filter((x) => /^\.[\w-]+$/.test(x))) if (!F.canonical.includes(s)) F.canonical.push(s);
    break;
  }
}

/* =========================================================================================== STATIC (--static) */
const runStatic = () => {
  const S = spec.static;
  const ls = (d, re) => fs.existsSync(d) ? fs.readdirSync(d).filter((f) => re.test(f)).map((f) => (d === "." ? f : `${d}/${f}`)).sort() : [];
  const excluded = (f) => S.exclude.some((p) => new RegExp(p).test(f));
  const internal = (f) => S.internal.some((p) => new RegExp(p).test(f));
  const CSS = [...ls("css", /\.css$/), ...ls("cabinet-evo", /\.css$/), ...ls("rap-evo", /\.css$/)].filter((f) => !excluded(f));
  const JS = [...ls("js", /\.js$/), ...ls("cabinet-evo", /\.js$/), ...ls("rap-evo", /\.js$/)].filter((f) => !excluded(f));
  const HTML = [...ls(".", /\.html$/), ...ls("cabinet-evo", /\.html$/), ...ls("rap-evo", /\.html$/)].filter((f) => !excluded(f));

  /* Foundations tokens (css/main.css): name → value, colour value → token names */
  const main = fs.readFileSync("css/main.css", "utf8");
  const defs = new Map();
  for (const m of main.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+);/g)) if (!defs.has(m[1])) defs.set(m[1], m[2].trim());
  const resolve = (v, d = 0) => { const m = v.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/); if (!m || d > 12) return v; return defs.has(m[1]) ? resolve(defs.get(m[1]), d + 1) : m[2] ? resolve(m[2].trim(), d + 1) : v; };
  const norm = (c) => {
    c = c.trim().toLowerCase();
    let m = c.match(/^#([0-9a-f]{3,8})$/);
    if (m) { let h = m[1]; if (h.length === 3 || h.length === 4) h = [...h].map((x) => x + x).join(""); if (h.length === 8 && h.endsWith("ff")) h = h.slice(0, 6); return "#" + h; }
    m = c.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+%?))?\s*\)$/);
    if (m) { const hex = "#" + [m[1], m[2], m[3]].map((x) => (+x).toString(16).padStart(2, "0")).join(""); let a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : +m[4]; return a >= 1 ? hex : `${hex}/${Math.round(a * 100)}`; }
    return c;
  };
  const colourTokens = new Map(); const shadowTokens = new Map();
  for (const [name] of defs) {
    const v = resolve(`var(${name})`);
    if (/^(#[0-9a-f]{3,8}|rgba?\([^)]*\))$/i.test(v)) { const k = norm(v); const list = colourTokens.get(k) || []; list.push(name); colourTokens.set(k, list); }
    if (/^--shadow/.test(name)) shadowTokens.set(v.replace(/\s+/g, " ").toLowerCase(), name);
  }
  /* the token family follows the property: color → text, background → background, border / outline → border, fill → icon */
  const FAMILY = [[/^(color|caret-color|text-decoration-color)$/, "--color-text-"], [/^background/, "--color-background-"], [/^(border|outline)/, "--color-border-"], [/^(fill|stroke)$/, "--color-icon-"]];
  const bestToken = (k, prop = "") => { const l = colourTokens.get(k) || []; const fam = (FAMILY.find(([re]) => re.test(prop)) || [])[1]; return (fam && l.find((n) => n.startsWith(fam))) || l.find((n) => n.startsWith("--color-")) || l[0] || ""; };
  /* Foundations COLOUR tokens (resolved value is a colour): redefining one in product CSS = private-token */
  const baseTokens = new Set(defs.keys());
  const colourTokenNames = new Set([...defs.keys()].filter((n) => /^(#[0-9a-f]{3,8}|rgba?\([^)]*\))$/i.test(resolve(`var(${n})`))));

  const findings = []; const allowed = { restyle: {}, mono: 0 };
  const add = (rule, severity, file, line, what, expected, extra = {}) => findings.push({ rule, severity: internal(file) ? "minor" : severity, file, line, what, expected, ...(internal(file) ? { internal: true } : {}), ...extra });
  const blank = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  const lineAt = (src, i) => src.slice(0, i).split("\n").length;
  /* removes var(--x, fallback) (balanced) and url(…) so only literal colours stay */
  const stripVars = (v) => { let out = "", i = 0; while (i < v.length) { const at = v.slice(i).search(/var\(|url\(/); if (at < 0) { out += v.slice(i); break; } out += v.slice(i, i + at); let j = i + at + 4, depth = 1; while (j < v.length && depth) { if (v[j] === "(") depth++; else if (v[j] === ")") depth--; j++; } i = j; out += " "; } return out; };
  const COLOUR = /#[0-9a-fA-F]{3,8}\b|rgba?\([^()]*\)|hsla?\([^()]*\)/g;
  const MONO = /monospace|ui-monospace|SFMono|Menlo|Consolas|Courier|JetBrains/i;
  const monoAllow = new RegExp(S.monoAllow);
  const restyleProps = new RegExp(S.restyleProps);
  const LIBC = new Set(S.libraryClasses);
  const restyleAllow = (S.restyleAllow || []).map((r) => ({ re: new RegExp(r.selector || r), file: r.file ? new RegExp(r.file) : null, reason: r.reason || "" }));
  const classDefs = new Map();

  const colourCheck = (file, line, prop, value, where) => {
    if (/^(mask|mask-image|-webkit-mask|-webkit-mask-image)$/.test(prop)) return;
    const lit = stripVars(value);
    if (prop === "box-shadow") { const sh = shadowTokens.get(value.replace(/\s+/g, " ").trim().toLowerCase()); if (sh) { add("hardcoded-colour", "major", file, line, `${where}box-shadow literal = ${sh}`, `var(${sh})`); return; } }
    for (const m of lit.matchAll(COLOUR)) {
      const k = norm(m[0]); const tok = bestToken(k, prop);
      if (tok) add("hardcoded-colour", "major", file, line, `${where}${prop}: ${m[0]}`, `var(${tok}, ${m[0]})`, { token: tok });
      else add("hardcoded-colour", "minor", file, line, `${where}${prop}: ${m[0]}`, /shadow/.test(prop) ? "a --shadow-* token" : "no Foundations token with this value — PO question", { token: "" });
    }
  };
  const cssRules = (file, src, offset = 0) => {
    src = blank(src);
    for (const m of src.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selText = m[1].trim(); if (!selText || selText.startsWith("@") || /^(from|to|\d+(\.\d+)?%)(\s*,|$)/.test(selText)) continue;
      const line = offset + lineAt(src, m.index + m[1].search(/\S/));
      const decls = m[2].split(";").map((d) => { const i = d.indexOf(":"); return i < 0 ? null : [d.slice(0, i).trim().toLowerCase(), d.slice(i + 1).trim()]; }).filter((d) => d && d[0]);
      const sels = selText.split(/,(?![^(]*\))/).map((s) => s.trim().replace(/\s+/g, " ")).filter(Boolean);
      for (const s of sels) for (const c of s.matchAll(/\.([a-zA-Z][\w-]*)/g)) if (!classDefs.has(c[1])) classDefs.set(c[1], `${file}:${line}`);
      for (const [prop, value] of decls) {
        if (prop.startsWith("--")) {
          if (colourTokenNames.has(prop) && !(S.tokenAllow || []).includes(prop)) add("private-token", "major", file, line, `${sels[0]} { ${prop}: ${value.slice(0, 60)} } redefines a Foundations token`, "the token from css/main.css as is");
          else if (!baseTokens.has(prop)) { const lit = stripVars(value).match(COLOUR); if (lit) { const tok = bestToken(norm(lit[0]), "color"); add("private-palette", "minor", file, line, `${prop}: ${lit[0]} (private colour variable)`, tok ? `${prop}: var(${tok})` : "a Foundations colour token (PO: no token has this value)"); } }
          continue;
        }
        if ((prop === "font-family" || prop === "font") && MONO.test(value)) { if (monoAllow.test(selText)) allowed.mono++; else add("monospace", "major", file, line, `${sels[0].slice(0, 90)} { font-family: ${value.slice(0, 50)} }`, "Onest (var(--font-family-primary-font))"); }
        colourCheck(file, line, prop, value, "");
      }
      const props = decls.map((d) => d[0]).filter((p) => restyleProps.test(p));
      if (!props.length) continue;
      for (const sel of sels) {
        if (sel.startsWith(":where")) continue;
        const comps = sel.split(/\s*[>+~\s]\s*(?![^(]*\))/).filter(Boolean); const last = comps[comps.length - 1] || "";
        /* 11. radio-restyle (radio-v1): the ONE radio is painted only by css/radio.css — a product rule may place it
           (flex, margin, cursor, position) but never repaint the circle, the dot or the text */
        const RS = spec.radio?.static;
        if (RS && !new RegExp(RS.files).test(file) && new RegExp(RS.selector).test(last.replace(/:(?:is|not|has|where)\([^)]*\)/g, ""))) {
          const paint = props.filter((p) => new RegExp(RS.props).test(p));
          if (paint.length) { add("radio-restyle", "major", file, line, `${sel.slice(0, 140)} { ${[...new Set(paint)].join(", ")} }`, "only css/radio.css paints the radio (components.md › Radio — the ONE radio component)", { selector: sel }); continue; }
        }
        const classes = [...last.replace(/:(?:is|not|has|where)\([^)]*\)/g, "").matchAll(/\.([\w-]+)/g)].map((x) => x[1]);
        const lib = classes.filter((c) => LIBC.has(c)); if (!lib.length) continue;
        const prod = classes.filter((c) => !LIBC.has(c) && !/^(is|has)-/.test(c));
        const global = comps.length === 1 && !prod.length;
        if (S.restyleAllowFiles[file]) { allowed.restyle[file] = (allowed.restyle[file] || 0) + 1; continue; }
        const al = restyleAllow.find((r) => r.re.test(sel) && (!r.file || r.file.test(file))); if (al) { allowed.restyle[al.reason || sel] = (allowed.restyle[al.reason || sel] || 0) + 1; continue; }
        add("library-restyle", global ? "major" : "minor", file, line, `${global ? "GLOBAL " : ""}${sel.slice(0, 140)} { ${[...new Set(props)].join(", ")} }`, `the library .${lib.join(".")} contract (variant / size class)`, { selector: sel, scope: global ? "global" : "scoped" });
      }
    }
  };
  for (const f of CSS) cssRules(f, fs.readFileSync(f, "utf8"));

  for (const f of [...JS, ...HTML]) {
    const src = fs.readFileSync(f, "utf8");
    if (f.endsWith(".html")) for (const m of src.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) cssRules(f, m[1], lineAt(src, m.index) - 1);
    const lines = src.split("\n");
    lines.forEach((l, i) => {
      const t = l.trim(); if (/^(\/\/|\*|\/\*|<!--)/.test(t)) return;
      if (/<(?!button\b)([a-z][a-z0-9]*)\b[^<>]*\brole=\\?["']button\\?["']/i.test(l) || /setAttribute\(\s*["']role["']\s*,\s*["']button["']/.test(l)) add("role-button", "major", f, i + 1, t.slice(0, 150), "<button type=\"button\">");
      if (/<(button|a)\b[^<>]*\stitle=/i.test(l) || /<[a-z]+\b[^<>]*\b(class=\\?["'][^"'<>]*\bbtn\b|role=\\?["']button)[^<>]*\stitle=/i.test(l)) add("native-title", "minor", f, i + 1, t.slice(0, 150), "data-tooltip-label (library tooltip) / a visible label");
      for (const sm of l.matchAll(/style=\\?["']([^"'\\]*)/g)) for (const d of sm[1].split(";")) { const k = d.indexOf(":"); if (k < 0) continue; const prop = d.slice(0, k).trim().toLowerCase(), value = d.slice(k + 1).trim(); if ((prop === "font-family" || prop === "font") && MONO.test(value)) add("monospace", "major", f, i + 1, `style="${sm[1].slice(0, 60)}"`, "Onest"); else if (!prop.startsWith("--")) colourCheck(f, i + 1, prop, value, "style=\" "); }
      const js = l.match(/\.style\.([a-zA-Z]+)\s*=\s*["'`](#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))/); if (js) colourCheck(f, i + 1, js[1], js[2], ".style.");
    });
    /* inline icons: an <svg> with shapes and no <use>, icon-sized (viewBox / width ≤ 32 or class icon) */
    const blocks = [];
    for (const m of src.matchAll(/<svg\b([^>]*)>([\s\S]{0,6000}?)<\/svg>/g)) {
      const attrs = m[1], body = m[2];
      if (/<use\b|<symbol\b/.test(body) || !/<(path|circle|rect|polyline|polygon|line|ellipse)\b/.test(body)) continue;
      const vb = attrs.match(/viewBox=\\?["']\s*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)/); const w = attrs.match(/\bwidth=\\?["']?(\d+)/);
      const small = (vb && +vb[1] <= 32 && +vb[2] <= 32) || (w && +w[1] <= 32) || /class=\\?["'][^"']*\bicon\b/.test(attrs);
      if (!small) continue;
      blocks.push([m.index, m.index + m[0].length]);
      add("inline-svg-icon", "minor", f, lineAt(src, m.index), `<svg${attrs.slice(0, 70)}> with ${(body.match(/<(path|circle|rect|polyline|polygon|line|ellipse)\b/g) || []).length} shape(s)`, "<svg class=\"icon\"><use href=\"…#icon-…\"></use></svg> (sprite)");
    }
    for (const m of src.matchAll(/["'`]\s*<path\s+[^>]*\bd=\\?["'][MmLlHhVvCcSsQqTtAaZz0-9 .,-]{12,}\\?["']/g)) {
      if (blocks.some(([a, z]) => m.index >= a && m.index < z)) continue;
      add("inline-svg-icon", "minor", f, lineAt(src, m.index), `icon path string ${m[0].slice(0, 60)}…`, "a sprite symbol + <use>");
    }
  }

  /* converge (static): classes defined in product CSS that implement a family without being the canonical one */
  const fam = {};
  for (const [name, F] of Object.entries(spec.families || {})) {
    if (!F || !F.static) continue;
    const re = new RegExp(F.static.pattern); const canon = F.static.canonical; const allowC = F.static.allow || [];
    for (const [c, where] of classDefs) {
      if (c.includes("--") || /^(is|has|js)-/.test(c) || !re.test(c) || (F.excludePattern && new RegExp(F.excludePattern).test(c))) continue;
      if (canon.some((p) => c === p || c.startsWith(p + "__") || c.startsWith(p + "-"))) continue;
      if (allowC.some((p) => c === p || c.startsWith(p))) continue;
      const [block, part = ""] = c.split("__");
      /* group: the block when it is the family (`rap-pagination`), else the part up to the family word
         (`e-permits-workplace__pagination-item` → `e-permits-workplace__pagination`) */
      const pm = part.match(re);
      const key = re.test(block) || !part ? block : pm ? `${block}__${part.slice(0, pm.index + pm[0].length).replace(/[-_]$/, "")}` : c;
      const g = (fam[`${name}|${key}`] ||= { name, key, classes: [], where });
      g.classes.push(c);
    }
  }
  for (const g of Object.values(fam)) { const [file, line] = g.where.split(":"); add("converge", "minor", file, +line, `${g.name}: .${g.key}* (${g.classes.slice(0, 6).map((c) => "." + c).join(" ")}${g.classes.length > 6 ? ` +${g.classes.length - 6}` : ""})`, spec.families[g.name].canonical.slice(0, 3).join(" / "), { family: g.name }); }

  const res = { generated: new Date().toISOString(), files: { css: CSS.length, js: JS.length, html: HTML.length }, allowed, inventory: { documented: documented.size, removedRows: INV.removedRows, onlyInRemovedRows: [...INV.removed].sort(), shortNamesResolved: INV.shortResolved, documentedClasses: [...documented].sort() }, findings };
  fs.writeFileSync(path.join(OUT, "static.json"), JSON.stringify(res, null, 1));
  const byRule = {}; for (const f of findings) { const k = `${f.rule}|${f.severity}`; byRule[k] = (byRule[k] || 0) + 1; }
  const byFile = {}; for (const f of findings) { const r = (byFile[f.file] ||= { major: 0, minor: 0 }); r[f.severity]++; }
  const L = [`# Component audit — static — ${res.generated.slice(0, 16)}`, "", `${CSS.length} CSS · ${JS.length} JS · ${HTML.length} HTML files (Components/* and css/main.css excluded) · ${findings.length} findings · major ${findings.filter((f) => f.severity === "major").length} · minor ${findings.filter((f) => f.severity === "minor").length}`, "", "| rule | severity | count |", "|---|---|---|", ...Object.entries(byRule).sort().map(([k, n]) => `| ${k.split("|")[0]} | ${k.split("|")[1]} | ${n} |`), "", `Allowed (documented): library restyles ${JSON.stringify(allowed.restyle)} · monospace ${allowed.mono}`, "", "| file | major | minor |", "|---|---|---|", ...Object.entries(byFile).sort((a, b) => b[1].major - a[1].major || b[1].minor - a[1].minor).map(([f, r]) => `| ${f} | ${r.major} | ${r.minor} |`)];
  for (const rule of [...new Set(findings.map((f) => f.rule))].sort()) {
    const list = findings.filter((f) => f.rule === rule).sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "major" ? -1 : 1));
    L.push("", `## ${rule} (${list.length})`, "", "| sev | where | what | expected |", "|---|---|---|---|", ...list.slice(0, 150).map((f) => `| ${f.severity} | ${f.file}:${f.line} | ${String(f.what).replace(/\|/g, "/").replace(/`/g, "'")} | ${String(f.expected).replace(/\|/g, "/")} |`));
    if (list.length > 150) L.push(`| … | ${list.length - 150} more in static.json | | |`);
  }
  L.push("", "## Fix hints", "", ...["library-restyle", "radio-restyle", "hardcoded-colour", "private-token", "private-palette", "inline-svg-icon", "role-button", "native-title", "monospace", "converge"].map((r) => `- **${r}** — ${spec.fixHints[r] || ""}`));
  fs.writeFileSync(path.join(OUT, "static.md"), L.join("\n") + "\n");
  console.log(`static: ${findings.length} findings (${Object.entries(byRule).map(([k, n]) => `${k.replace("|", " ")} ${n}`).join(" · ")})`);
  console.log("→", path.join(OUT, "static.json"), "+ static.md");
};

/* ========================================================================================= PAGE LIBRARY (in page) */
const PAGE_LIB = (spec, documentedList) => {
  const documented = new Set(documentedList);
  const vis = (el) => { if (!el || !el.isConnected) return false; const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1 && !el.closest("[hidden]") && (el instanceof SVGElement || !el.closest("[aria-hidden=true]")); };
  const shown = (el) => vis(el) && (!el.checkVisibility || el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }));
  const ignored = (el) => spec.ignoreWithin.some((s) => { try { return el.closest(s); } catch (e) { return false; } });
  const sel = (el) => { const parts = []; let n = el; for (let i = 0; n && n !== document.body && i < 4; i++, n = n.parentElement) { let s = n.tagName.toLowerCase(); if (n.id && i === 0) s += "#" + n.id; const c = [...n.classList].filter((x) => !/^(is|has)-/.test(x)).slice(0, 2).join("."); if (c) s += "." + c; parts.unshift(s); } return parts.join(" > "); };
  const txt = (el) => (el.getAttribute("aria-label") || el.innerText || el.value || el.getAttribute("placeholder") || "").trim().replace(/\s+/g, " ").slice(0, 50);
  const any = (el, list) => (list || []).find((s) => { try { return el.matches(s); } catch (e) { return false; } });
  const within = (el, list) => (list || []).find((s) => { try { return el.closest(s); } catch (e) { return false; } });
  const ownClasses = (el) => [...el.classList].filter((c) => !/^(is|has|js)-/.test(c));
  /* a list entry matches the element; „x *” = anywhere inside x */
  const inList = (el, list) => (list || []).some((s) => { s = s.selector || s; try { return s.endsWith(" *") ? !!el.closest(s.slice(0, -2)) : el.matches(s); } catch (e) { return false; } });
  const sig = (el) => el.tagName.toLowerCase() + ownClasses(el).sort().map((c) => "." + c).join("") + (el.getAttribute("role") ? `[role=${el.getAttribute("role")}]` : "") + (el.hasAttribute("aria-haspopup") ? "[aria-haspopup]" : "");
  const LIB = spec.library, PROD = spec.product, STATIC = spec.libraryStatic || [], PART_ALLOW = spec.partAllow || [];
  /* bare product roots (`.e-permits-fo-select`): their own parts inside them are internal anatomy */
  const prodBlocks = new Set(PROD.map((s) => (s.match(/^\.([\w-]+)$/) || [])[1]).filter((c) => c && !c.includes("__")));
  const docBlocks = new Set([...documented].map((c) => c.split("__")[0].split("--")[0]));
  const CONTROL_ROLES = /^(button|link|combobox|switch|checkbox|radio|tab|menuitem|menuitemradio|menuitemcheckbox|option|slider|spinbutton|textbox|searchbox|listbox|menu)$/;
  const transparent = (c) => c === "rgba(0, 0, 0, 0)" || c === "transparent";
  const bgOf = (el) => { for (let n = el.parentElement; n; n = n.parentElement) { const b = getComputedStyle(n).backgroundColor; if (!transparent(b)) return b; } return "rgb(255, 255, 255)"; };
  const borderSides = (cs) => ["Top", "Right", "Bottom", "Left"].filter((d) => parseFloat(cs[`border${d}Width`]) > 0 && cs[`border${d}Style`] !== "none" && !/rgba\([^)]*,\s*0\)$/.test(cs[`border${d}Color`])).length;
  const painted = (cs) => !transparent(cs.backgroundColor) || borderSides(cs) > 0 || /inset/.test(cs.boxShadow);

  /* tier of a control (v2): own match first; parts only when documented / internal / allowed */
  const tier = (el) => {
    const own = ownClasses(el);
    let m = any(el, LIB); if (m) return { tier: "library", by: m };
    m = any(el, PROD); if (m) return { tier: "product", by: m };
    const d = own.find((c) => documented.has(c)); if (d) return { tier: "documented", by: "." + d };
    m = any(el, PART_ALLOW); if (m) return { tier: "part", by: m };
    const ip = own.find((c) => c.includes("__") && prodBlocks.has(c.split("__")[0]) && el.closest("." + c.split("__")[0])); if (ip) return { tier: "part", by: "." + ip };
    const native = /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) || /^(option|menuitem|menuitemradio|menuitemcheckbox)$/.test(el.getAttribute("role") || "") || !own.length;
    if (native) for (let n = el.parentElement, i = 0; n && i < spec.ancestorDepth; n = n.parentElement, i++) {
      m = any(n, LIB) || any(n, PROD); if (m) return { tier: "inside", by: m };
      const dc = [...n.classList].find((c) => documented.has(c)); if (dc) return { tier: "inside", by: "." + dc };
    }
    const partOf = own.map((c) => c.split("__")[0]).find((b) => docBlocks.has(b) || prodBlocks.has(b));
    return { tier: "none", by: own.join(".") || el.tagName.toLowerCase(), partOf };
  };
  const BP = spec.buttonPaint || {};
  /* families whose canonical members may paint (the ONE dropdown item: hover / active fill) */
  const BP_ALLOW = [...(BP.allow || []).map((a) => a.selector || a), ...(BP.allowFamilies || []).flatMap((f) => (spec.families[f] || {}).canonical || [])];
  const FIELD_NATIVE = "input:not([type=button]):not([type=submit]):not([type=reset]), select, textarea, [role=combobox], [role=textbox], [role=searchbox]";
  /* v2 button-paint: a control that looks like a button without being the library .btn */
  const paintsLikeButton = (el) => {
    if (!BP.maxHeight || el.matches(".btn") || any(el, LIB) || any(el, BP_ALLOW) || within(el, BP.allowWithin)) return null;
    /* a selected / current / open / focused control shows its state fill — that is not a button look */
    if (el.matches(BP.stateSkip || "[aria-current]:not([aria-current=false]), [aria-selected=true], [aria-pressed=true], [aria-expanded=true], .is-active, .is-selected, .active, :focus")) return null;
    /* fields, and buttons that are anatomy of a field (phone prefix, clear ×, in-field action) */
    if (el.matches(FIELD_NATIVE) || any(el, spec.fieldBoxes) || (el.parentElement && el.parentElement.closest(spec.fieldBoxes.join(",")))) return null;
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    if (r.height < BP.minHeight || r.height > BP.maxHeight || r.width > BP.maxWidth || r.width < BP.minWidth) return null;
    const fill = !transparent(cs.backgroundColor) && cs.backgroundColor !== bgOf(el);
    const sides = borderSides(cs); const ring = /inset/.test(cs.boxShadow);
    if (!(fill || sides >= 3 || ring)) return null;
    const radius = parseFloat(cs.borderTopLeftRadius) || 0; const padX = Math.min(parseFloat(cs.paddingLeft) || 0, parseFloat(cs.paddingRight) || 0);
    if (!(radius >= BP.minRadius || padX >= BP.minPaddingX)) return null;
    return [fill ? `fill ${cs.backgroundColor}` : "", sides >= 3 ? `border ${cs.borderTopWidth} ${cs.borderTopColor}` : "", ring ? "inset ring" : "", `radius ${cs.borderTopLeftRadius}`, `${Math.round(r.height)}px high`].filter(Boolean).join(" · ");
  };

  const audit = (scope, tag) => {
    const phone = window.innerWidth <= spec.size.phoneMaxWidth;
    const roots = scope ? [...document.querySelectorAll(scope)].filter(vis) : [document.body];
    const counts = { controls: 0, library: 0, product: 0, documented: 0, part: 0, inside: 0, none: 0, buttonPaint: 0, fields: 0, buttons: 0, tags: 0, lookAlikes: 0, clickables: 0, converge: 0 };
    const findings = [];
    if (!roots.length) return { viewport: `${window.innerWidth}`, phone, counts, findings, noScope: true };
    const qsa = (s) => { const out = [], seen = new Set(); for (const r of roots) { try { if (r.matches(s) && !seen.has(r)) { seen.add(r); out.push(r); } for (const e of r.querySelectorAll(s)) if (!seen.has(e)) { seen.add(e); out.push(e); } } catch (e) { /* bad selector */ } } return out; };
    const add = (severity, rule, el, measured, expected, extra) => findings.push({ severity, rule, selector: sel(el), text: txt(el), measured, expected, fix: spec.fixHints[rule] || "", ...(tag ? { interaction: tag } : {}), ...(extra || {}) });

    /* 1. controls (+ 1b. button-paint) */
    const controls = qsa(spec.controls).filter((el) => vis(el) && !ignored(el));
    for (const el of controls) {
      if (el.tagName === "A" && !el.matches(".btn, .chip, [role=button], [role=tab], [role=menuitem], [role=option]")) {
        /* a plain text link is a link; only links painted like a button are controls here */
        const cs = getComputedStyle(el); if (!(painted(cs) && parseFloat(cs.paddingLeft) >= 6)) continue;
      }
      counts.controls++;
      const bp = paintsLikeButton(el);
      if (bp) { counts.buttonPaint++; add("major", "button-paint", el, `<${el.tagName.toLowerCase()}> .${ownClasses(el).join(".") || "(no class)"} paints like a button: ${bp}`, "`.btn` + variant + size (or a documented exception in spec buttonPaint.allow)"); continue; }
      const t = tier(el); counts[t.tier]++;
      if (t.tier === "none") add("major", "non-library-control", el, `<${el.tagName.toLowerCase()}${el.getAttribute("role") ? ` role=${el.getAttribute("role")}` : ""}> .${t.by}${t.partOf ? ` — a part of .${t.partOf}, the part itself is not documented` : ""}`, "a library class or a documented product component");
    }

    /* 2. sizes — fields */
    const exempt = (el) => (spec.sizeExempt || []).some((s) => { try { return el.matches(s) || (s.endsWith(" *") && el.closest(s.slice(0, -2))); } catch (e) { return false; } });
    const boxes = new Set();
    for (const s of spec.fieldBoxes) for (const b of qsa(s)) if (vis(b) && !ignored(b)) {
      /* nested boxes (an .input inside a .search-input / .e-permits-fo-input) count once, on the outer box */
      const outer = b.parentElement && b.parentElement.closest(spec.fieldBoxes.join(","));
      if (outer && vis(outer) && outer.getBoundingClientRect().height >= b.getBoundingClientRect().height - 1) continue;
      boxes.add(b);
    }
    for (const f of qsa("input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([type=submit]):not([type=button]), select, textarea, [role=combobox]")) {
      if (!vis(f) || ignored(f) || f.closest(spec.fieldBoxes.join(","))) continue;
      /* the field's frame: the first box with a border (any side) or an inset ring, up to 3 levels */
      const framed = (cs) => borderSides(cs) > 0 || /inset/.test(cs.boxShadow);
      let b = f; for (let i = 0; b && i < 3 && !framed(getComputedStyle(b)); i++) b = b.parentElement;
      if (!b || !framed(getComputedStyle(b))) { b = f; for (let i = 0; b && i < 3 && !painted(getComputedStyle(b)); i++) b = b.parentElement; }
      if (b && vis(b)) boxes.add(b);
    }
    const iconWant = (h) => { const keys = Object.keys(spec.size.icon).map(Number).sort((a, z) => Math.abs(a - h) - Math.abs(z - h)); return spec.size.icon[keys[0]]; };
    const chev = new RegExp(spec.size.chevronPattern, "i");
    for (const b of boxes) {
      const r = b.getBoundingClientRect(); const h = Math.round(r.height * 10) / 10;
      const isArea = b.matches("textarea, .e-permits-fo-textarea, .textarea") || !!b.querySelector("textarea");
      counts.fields++;
      if (exempt(b)) continue;
      const vp = phone ? "phone" : "desktop";
      if (isArea) { if (h < spec.size.textareaMin[vp] - 0.5) add(phone ? "major" : "minor", phone ? "field-height-phone" : "field-height-desktop", b, `${h}px`, `≥ ${spec.size.textareaMin[vp]}px`); }
      else if (h > 72) continue; /* a multi-line value box (wrapped chips…) is not a one-line field */
      else if (Math.abs(h - spec.size[vp].height) > 0.5) add(phone ? "major" : "minor", phone ? "field-height-phone" : "field-height-desktop", b, `${h}px high`, `${spec.size[vp].height}px`);
      const t = [...b.querySelectorAll(spec.fieldText)].find(vis) || (b.matches("input, select, textarea") ? b : null);
      if (t && phone) {
        const cs = getComputedStyle(t); const fs = parseFloat(cs.fontSize); const lh = cs.lineHeight === "normal" ? null : parseFloat(cs.lineHeight);
        if (Math.abs(fs - spec.size.phone.font) > 0.5) add("major", "field-text-phone", t, `${fs}px${lh ? "/" + lh : ""}`, `${spec.size.phone.font}/${spec.size.phone.line}`);
        else if (lh && t.tagName !== "INPUT" && Math.abs(lh - spec.size.phone.line) > 0.5) add("minor", "field-text-phone", t, `${fs}/${lh}`, `${spec.size.phone.font}/${spec.size.phone.line}`);
        if (t.matches("input, textarea") && t.placeholder) { const p = parseFloat(getComputedStyle(t, "::placeholder").fontSize); if (Math.abs(p - spec.size.phone.font) > 0.5) add("major", "field-text-phone", t, `placeholder ${p}px`, `${spec.size.phone.font}px`); }
      }
      /* icons: decoration icons of the field, not those of a nested button (prefix, clear ×, submit) or a spinner */
      const want = iconWant(h);
      for (const svg of b.querySelectorAll("svg")) {
        if (!vis(svg) || isArea) continue;
        const btn = svg.closest("button, [role=button], .btn-group, .spinner"); if (btn && btn !== b && b.contains(btn)) continue;
        const ir = svg.getBoundingClientRect(); const size = Math.round(Math.min(ir.width, ir.height) * 10) / 10;
        const href = svg.querySelector("use")?.getAttribute("href") || "";
        const isChev = chev.test(href);
        const min = isChev ? spec.size.chevronMin : want;
        if (size + 0.5 < min) add(phone && !isChev ? "major" : "minor", "field-icon-size", svg, `${size}px (${href.split("#")[1] || "svg"}) in a ${h}px field`, `${min}px`);
      }
    }
    /* 2b. sizes — library buttons 32 / 40 / 48, own icon 16 / 20 (css/button-icons.css) */
    const BS = spec.buttons;
    if (BS) for (const b of qsa(BS.selector)) {
      if (!vis(b) || ignored(b) || inList(b, BS.exempt)) continue;
      counts.buttons++;
      const h = Math.round(b.getBoundingClientRect().height * 10) / 10;
      const near = BS.heights.find((x) => Math.abs(x - h) <= 0.5);
      if (!near) { add("major", "button-size", b, `${h}px high`, `${BS.heights.join(" / ")}px (.btn-sm / .btn-md / .btn-lg)`); continue; }
      if (inList(b, BS.iconExempt)) continue;
      const icon = [...b.children].find((c) => c.tagName.toLowerCase() === "svg" && vis(c));
      if (!icon) continue;
      const ir = icon.getBoundingClientRect(); const size = Math.round(Math.max(ir.width, ir.height) * 10) / 10; const want = BS.icon[String(near)];
      if (Math.abs(size - want) > 0.5) add("major", "button-icon-size", b, `icon ${size}px in a ${near}px button`, `${want}px`);
    }
    /* 2c. sizes — tags Small */
    const TG = spec.tags;
    if (TG) for (const t of qsa(TG.selector)) {
      if (!vis(t) || ignored(t) || inList(t, TG.exempt)) continue;
      counts.tags++;
      const h = Math.round(t.getBoundingClientRect().height * 10) / 10;
      if (Math.abs(h - TG.height) > 0.5) add("major", "tag-size", t, `${h}px high`, `${TG.height}px (Tag · Small)`);
    }

    /* 3. look-alikes + clickable non-controls (v2: elements that hold a control or carry a non-control role are no
       longer skipped; [tabindex=0] / [onclick] without a control role is always reported) */
    const L = spec.lookAlike; let la = 0;
    const known = (el) => any(el, LIB) || any(el, PROD) || any(el, STATIC) || any(el, PART_ALLOW) || ownClasses(el).some((c) => documented.has(c));
    const flagged = [];
    for (const el of qsa("div, span, li, label, p, a:not([href]), article, section, tr, td, img, dt, dd, h2, h3, h4")) {
      if (la >= 80) break;
      const role = el.getAttribute("role") || "";
      if (CONTROL_ROLES.test(role) || !vis(el) || ignored(el)) continue;
      const host = el.parentElement && el.parentElement.closest(spec.controls); if (host) continue;
      const clickable = el.getAttribute("tabindex") === "0" || el.hasAttribute("onclick");
      if (clickable) {
        const bp = paintsLikeButton(el);
        if (bp) { counts.buttonPaint++; add("major", "button-paint", el, `<${el.tagName.toLowerCase()} tabindex=0> .${ownClasses(el).join(".") || "(no class)"} paints like a button: ${bp}`, "`<button class=\"btn …\">`"); }
        else { counts.clickables++; add("minor", "clickable-non-control", el, `<${el.tagName.toLowerCase()}${el.getAttribute("tabindex") === "0" ? " tabindex=0" : ""}${el.hasAttribute("onclick") ? " onclick" : ""}${role ? ` role=${role}` : ""}> without a control role`, "a real <a> / <button> inside, or the control role + keyboard"); }
        flagged.push(el); la++; continue;
      }
      if (flagged.some((f) => f.contains(el))) continue;
      const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
      if (r.height < L.minHeight || r.height > L.maxHeight || r.width > L.maxWidth) continue;
      if (el.querySelector(spec.controls)) continue;
      const pointer = cs.cursor === "pointer" && el.parentElement && getComputedStyle(el.parentElement).cursor !== "pointer" && painted(cs);
      const boxy = parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== "none" && parseFloat(cs.borderTopLeftRadius) > 0 && parseFloat(cs.paddingLeft) >= 8 && parseFloat(cs.paddingRight) >= 8 && /flex|inline/.test(cs.display) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!(pointer || boxy) || known(el)) continue;
      la++; counts.lookAlikes++; flagged.push(el);
      add("minor", "look-alike", el, pointer ? "cursor pointer + paint" : `border ${cs.borderTopWidth} · radius ${cs.borderTopLeftRadius} · padding ${cs.paddingLeft}`, "a library control, or no control look");
    }

    /* 4. copy — one component, never in list views */
    const C = spec.copy;
    if (C) {
      counts.copies = 0;
      const labelRe = new RegExp(C.labelPattern, "i");
      const visibleText = (el) => [...el.childNodes].some((n) => (n.nodeType === 3 && n.textContent.trim()) || (n.nodeType === 1 && !n.matches("svg, [aria-hidden=true], .u-visually-hidden") && vis(n) && n.textContent.trim()));
      const seen = new Set();
      for (const s of C.legacy) for (const el of qsa(s)) {
        if (!vis(el) || ignored(el) || seen.has(el) || el.closest(C.component)) continue;
        seen.add(el); add("major", "copy-variant", el, `legacy copy markup ${s}`, `${C.component} (GEAPCopyValue.html)`);
      }
      for (const el of qsa("button, [role=button], a[href]")) {
        if (!vis(el) || ignored(el) || seen.has(el) || el.closest(C.button)) continue;
        const label = el.getAttribute("aria-label") || el.dataset.tooltipLabel || "";
        if (!labelRe.test(label) || visibleText(el) || /menuitem/.test(el.getAttribute("role") || "")) continue;
        seen.add(el); add("major", "copy-variant", el, `icon-only „${label.slice(0, 40)}” outside ${C.component}`, `${C.component} (GEAPCopyValue.html)`);
      }
      for (const el of qsa(C.component)) {
        if (!vis(el) || ignored(el)) continue;
        counts.copies++;
        if (C.listExempt.some((s) => el.closest(s)) || el.matches(C.compact)) continue;
        const ctx = C.listContexts.find((s) => el.closest(s));
        if (ctx) add("major", "copy-in-list", el, `copy value with its icon inside ${ctx}`, `${C.compact} (GEAPCopyValue.html(value, { compact: true }) / shell renderListCode)`);
      }
      if (C.candidates) {
        counts.copyCandidates = 0;
        const res = C.candidates.map((p) => new RegExp(p));
        const flaggedC = new Set();
        for (const root of roots) {
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
          for (let n; (n = walker.nextNode());) {
            const t = n.nodeValue.trim(); const el = n.parentElement;
            if (!t || !el || flaggedC.has(el) || !res.some((re) => re.test(t))) continue;
            if (!vis(el) || ignored(el) || el.closest(C.component) || (C.candidateExempt || []).some((s) => el.closest(s))) continue;
            const ctx = C.listContexts.find((s) => el.closest(s));
            if (!ctx) continue;
            counts.copyCandidates++; flaggedC.add(el);
            add("major", "missing-copy", el, `plain „${t.slice(0, 30)}” inside ${ctx}`, `${C.compact} (shell renderListCode / act-row metaParts / GEAPCopyValue.html(value, { compact: true }))`);
          }
        }
      }
    }
    /* 5. back navigation: ONLY the library breadcrumb (.breadcrumbs through js/breadcrumbs.js) */
    const B = spec.backNav;
    if (B) {
      counts.breadcrumbs = 0;
      const textRe = new RegExp(B.backText, "i"); const hookRe = new RegExp(B.backHook, "i");
      const bex = (el) => B.exempt.some((s) => el.closest(s));
      for (const el of qsa(B.component)) if (vis(el)) counts.breadcrumbs++;
      const seen = new Set();
      for (const el of qsa(B.trail)) {
        if (!vis(el) || ignored(el) || el.closest(B.component) || el.querySelector(B.component) || bex(el)) continue;
        seen.add(el);
        add("major", "crumb-trail", el, `hand-made trail ${[...el.classList].slice(0, 2).join(".") || el.tagName.toLowerCase()}`, `${B.component} (GEAPBreadcrumbs.html / shell renderBreadcrumbs / CabEvo.pageHeader({ back }))`);
      }
      for (const el of qsa("a[href], button, [role=button], [role=link]")) {
        if (!vis(el) || ignored(el) || seen.has(el) || el.closest(B.component) || [...seen].some((t) => t.contains(el)) || bex(el)) continue;
        const text = (el.textContent || "").trim().replace(/\s+/g, " "); const label = el.getAttribute("aria-label") || "";
        const hooks = [...el.classList, ...[...el.attributes].map((a) => a.name)].filter((n) => hookRe.test(n));
        if (!(textRe.test(text) || textRe.test(label) || hooks.length)) continue;
        add("major", "back-link", el, hooks.length ? `back hook ${hooks.join(" ")}` : `„${(text || label).slice(0, 40)}”`, `${B.component} (the page header breadcrumb; phones = .breadcrumbs--mobile)`);
      }
    }
    /* 8. tooltips (tooltip-one-v1): ONE runtime — the library .tooltip from js/icon-tooltip.js (+ the copy-value
       tooltip). tooltip-private (major): a painted element whose class names a tooltip outside spec.tooltip.allow;
       tooltip-title (major): a native title= on an interactive element (use data-tooltip-label / -text / -hint /
       data-cell-tooltip, or nothing when it repeats the visible text / aria-label) */
    const TT = spec.tooltip;
    if (TT) {
      const allowTip = TT.allow.join(", ");
      for (const el of qsa("[class*='tooltip']")) {
        if (!vis(el) || ignored(el) || el.matches(allowTip) || el.closest(allowTip)) continue;
        add("major", "tooltip-private", el, [...el.classList].filter((c) => /tooltip/.test(c)).join("."), "the library .tooltip via js/icon-tooltip.js (data-tooltip-label / -text / -hint / -reason, data-cell-tooltip)");
      }
      for (const el of qsa(TT.interactive)) {
        if (!el.hasAttribute("title") || !el.getAttribute("title").trim() || ignored(el) || !vis(el) || TT.titleExempt.some((s) => el.matches(s))) continue;
        add("major", "tooltip-title", el, `title="${el.getAttribute("title").slice(0, 40)}"`, "data-tooltip-label / data-tooltip-text / data-cell-tooltip (js/icon-tooltip.js) — or no title when it repeats the visible text / aria-label");
      }
    }
    /* 9. drawers (drawer-v1): ONE right-hand panel — .drawer-overlay > aside.drawer (css/drawer.css, js/drawer.js).
       drawer-private (major): a visible dialog / aside that is a right-hand full-height panel (touches the right and top
       edges, ≥ 90 % of the viewport high, narrower than the viewport) or whose class names a drawer, and is not .drawer */
    const DR = spec.drawer;
    if (DR) {
      const allowDr = DR.allow.join(", ");
      const vw = window.innerWidth, vh = window.innerHeight;
      for (const el of qsa(DR.candidates)) {
        if (!vis(el) || ignored(el) || el.matches(DR.canonical) || el.closest(allowDr)) continue;
        const r = el.getBoundingClientRect();
        const panel = r.right >= vw - 1 && r.top <= 1 && r.height >= vh * 0.9 && r.width < vw - 40;
        const named = el !== document.body && [...el.classList].some((c) => /drawer/i.test(c) && !/^(is|has)-/.test(c));
        if (panel || named) add("major", "drawer-private", el, `${[...el.classList].slice(0, 2).join(".") || el.tagName.toLowerCase()} ${Math.round(r.width)}×${Math.round(r.height)}`, `${DR.canonical} (components.md › Drawer)`);
      }
    }
    /* 10. skeletons (skeleton-v1): ONE loading placeholder — .skeleton + --text / --input / --block / --circle
       (css/skeleton.css). skeleton-private (major): a visible element whose class names a skeleton / shimmer /
       placeholder shape and that PAINTS one (a gradient background or a running animation) without .skeleton */
    const SK = spec.skeleton;
    if (SK) {
      const nameRe = new RegExp(SK.namePattern, "i");
      for (const el of qsa("[class]")) {
        if (el.matches(SK.canonical) || !ownClasses(el).some((c) => nameRe.test(c)) || ignored(el)) continue;
        /* skeletons are aria-hidden by design: visible = painted, not „exposed” */
        if (!el.getClientRects().length || getComputedStyle(el).visibility === "hidden" || el.closest("[hidden]")) continue;
        const cs = getComputedStyle(el);
        if (!/gradient/.test(cs.backgroundImage) && cs.animationName === "none") continue;
        add("major", "skeleton-private", el, ownClasses(el).filter((c) => nameRe.test(c)).join("."), `${SK.canonical} + --text / --input / --block / --circle (components.md › Skeleton)`);
      }
    }
    /* 11. radios (radio-v1): ONE radio = Figma Components 13:34 (circle) / 13:41 (label), painted by css/radio.css.
       radio-private (major): a radio input that paints natively (a browser radio on screen) and is not
       `input.radio-input` + `span.radio-custom` inside `.radio`, or a round bordered circle whose class names a radio
       outside `.radio-custom` (a hidden input in a selectable card without any circle — the delivery „check” card — is
       a card, not a radio). radio-size (major): no size class, circle ≠ 24 / 20, ring ≠ 2, dot ≠ 12 / 10. radio-colour
       (major): ring / fill not the state's token (default, selected, disabled, error; hovered radios are skipped).
       radio-text (major): label / supporting text not 16/24 / 14/20 500 (Medium) or 14/20 / 12/16 (Small), gap ≠ 12.
       Decorative radios are aria-hidden by design → visible = painted. */
    const RD = spec.radio;
    if (RD) {
      counts.radios = 0;
      const allowRd = (RD.allow || []).join(", ");
      const paintedEl = (el) => el.getClientRects().length && el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
      const near = (a, b) => Math.abs(a - b) <= 0.6;
      const px = (v) => parseFloat(v) || 0;
      for (const inp of qsa('input[type="radio"]')) {
        if (ignored(inp) || (allowRd && inp.closest(allowRd))) continue;
        const host = inp.closest("label") || inp.parentElement;
        if (!host || !paintedEl(host)) continue;
        const canonical = inp.matches(".radio-input") && inp.parentElement?.matches(".radio") && inp.nextElementSibling?.matches(".radio-custom");
        if (canonical) continue;
        const ics = getComputedStyle(inp), ir = inp.getBoundingClientRect();
        const native = ics.appearance !== "none" && parseFloat(ics.opacity) > 0.1 && ir.width >= 8 && ir.height >= 8 && ics.visibility !== "hidden";
        if (native) add("major", "radio-private", host, `native radio in .${ownClasses(host).join(".") || host.tagName.toLowerCase()} (${Math.round(ir.width)}×${Math.round(ir.height)}) — not the ONE radio`, RD.markup);
      }
      for (const el of qsa(RD.privateCandidates)) {
        if (ignored(el) || el.matches(".radio, .radio-custom, .radio-input, .radio-group, .radio-texts, .radio-label, .radio-description") || (allowRd && el.closest(allowRd)) || !paintedEl(el)) continue;
        if (!ownClasses(el).some((c) => /radio/i.test(c))) continue;
        const cs = getComputedStyle(el), r = el.getBoundingClientRect();
        if (r.width >= 12 && r.width <= 32 && near(r.width, r.height) && px(cs.borderTopLeftRadius) >= r.width / 2 - 1 && px(cs.borderTopWidth) > 0) add("major", "radio-private", el, `private radio circle .${ownClasses(el).join(".")} ${Math.round(r.width)}×${Math.round(r.height)}`, RD.markup);
      }
      for (const c of qsa(".radio-custom")) {
        if (ignored(c) || !paintedEl(c)) continue;
        counts.radios++;
        const radio = c.closest(".radio");
        if (!radio) { add("major", "radio-private", c, ".radio-custom outside .radio", RD.markup); continue; }
        const small = radio.classList.contains("radio--small");
        const S = small ? RD.sizes.small : RD.sizes.medium;
        const cs = getComputedStyle(c), as = getComputedStyle(c, "::after"), r = c.getBoundingClientRect();
        const issues = [];
        if (!radio.matches(".radio--medium, .radio--small")) issues.push("no size class (.radio--medium / .radio--small)");
        if (!near(r.width, S.circle) || !near(r.height, S.circle)) issues.push(`circle ${Math.round(r.width * 10) / 10}×${Math.round(r.height * 10) / 10} (expected ${S.circle})`);
        if (!near(px(cs.borderTopWidth), RD.ring)) issues.push(`ring ${cs.borderTopWidth} (expected ${RD.ring})`);
        if (!near(px(as.width), S.dot) || !near(px(as.height), S.dot)) issues.push(`dot ${as.width}×${as.height} (expected ${S.dot})`);
        if (issues.length) add("major", "radio-size", c, issues.join(" · "), `${small ? "Small" : "Medium"}: ${S.circle} circle, ring ${RD.ring}, dot ${S.dot} (css/radio.css)`);
        const inp = radio.querySelector(".radio-input");
        const owner = radio.parentElement;
        const hovered = c.matches(":hover") || radio.matches(":hover") || owner?.matches(":hover");
        if (!hovered) {
          const checked = inp ? inp.checked : radio.classList.contains("is-checked") || owner?.matches('[aria-checked="true"], .is-selected');
          const disabled = inp ? inp.disabled : radio.classList.contains("is-disabled");
          const error = radio.classList.contains("radio--error") || inp?.getAttribute("aria-invalid") === "true";
          const st = error ? "error" : disabled ? "disabled" : checked ? "selected" : "default";
          const want = RD.colours[st];
          const fill = cs.backgroundColor === "rgba(0, 0, 0, 0)" ? "transparent" : cs.backgroundColor;
          if (cs.borderTopColor !== want.ring || fill !== want.fill) add("major", "radio-colour", c, `${st}: ring ${cs.borderTopColor} · fill ${fill}`, `ring ${want.ring} · fill ${want.fill} (${want.token})`);
        }
        const texts = radio.querySelector(":scope > .radio-texts");
        if (texts) {
          const label = texts.querySelector(".radio-label"), desc = texts.querySelector(".radio-description");
          const tIssues = [];
          const gap = texts.getBoundingClientRect().left - r.right;
          if (!near(gap, RD.gap)) tIssues.push(`gap ${Math.round(gap * 10) / 10} (expected ${RD.gap})`);
          const font = (el, w) => { const s = getComputedStyle(el); return `${s.fontSize}/${s.lineHeight} ${s.fontWeight}` === w ? "" : `${el.className} ${s.fontSize}/${s.lineHeight} ${s.fontWeight} (expected ${w})`; };
          if (label) { const f = font(label, S.label); if (f) tIssues.push(f); }
          if (desc) { const f = font(desc, S.description); if (f) tIssues.push(f); }
          if (tIssues.length) add("major", "radio-text", radio, tIssues.join(" · "), `Figma radio-label ${small ? "Small" : "Medium"}`);
        }
      }
    }
    /* 6. action icons: „Editează…” = icon-edit, „Elimină… / Șterge…” = icon-delete, icon = label colour */
    const AI = spec.actionIcons;
    if (AI) {
      counts.actions = 0;
      const clearRe = new RegExp(AI.clearLabels, "i");
      const rules = AI.rules.map((r) => ({ re: new RegExp(r.label), icon: r.icon }));
      const aex = (el) => AI.exempt.some((s) => { try { return el.closest(s); } catch (e) { return false; } });
      for (const el of qsa(AI.controls)) {
        if (ignored(el) || aex(el)) continue;
        const text = (el.textContent || "").trim().replace(/\s+/g, " ");
        const label = text || el.getAttribute("aria-label") || el.dataset.tooltipLabel || "";
        const rule = rules.find((r) => r.re.test(label));
        if (!rule || clearRe.test(label)) continue;
        let closed = false;
        if (!shown(el)) {
          const menu = el.closest(AI.menus);
          const trigger = menu && ((menu.id && document.querySelector(`[aria-controls="${CSS.escape(menu.id)}"]`)) || [...(menu.parentElement?.querySelectorAll("[aria-haspopup]") || [])].find((b) => !menu.contains(b)));
          if (!trigger || !shown(trigger)) continue;
          closed = true;
        }
        counts.actions++;
        const uses = [...el.querySelectorAll("use")];
        const icons = uses.map((u) => (u.getAttribute("href") || "").split("#")[1]).filter(Boolean);
        const short = label.slice(0, 40);
        if (!icons.includes(rule.icon)) { add("major", "action-icon", el, `„${short}”${closed ? " (closed menu)" : ""} ${icons.length ? `with ${icons.join(", ")}` : "without an icon"}`, `${rule.icon} before the label`); continue; }
        if (closed) continue;
        const svg = uses[icons.indexOf(rule.icon)].closest("svg");
        const ic = getComputedStyle(svg).fill, tc = getComputedStyle(el).color;
        if (ic !== "none" && ic !== tc) add("major", "action-icon-colour", el, `„${short}” icon ${ic} · label ${tc}`, "the label colour (fill: currentColor)");
      }
    }
    /* 7. converge: one canonical implementation per pattern family */
    const byOrder = (a, b) => (a === b ? 0 : a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
    let classed = null;
    for (const [name, F] of Object.entries(spec.families || {})) {
      if (!F || typeof F !== "object" || !F.canonical) continue;
      const canon = F.canonical.join(", "); const allow = (F.allow || []).map((a) => a.selector || a).join(", ");
      const set = new Set(F.selector ? qsa(F.selector) : []);
      /* excludePattern: containers of the family (`…tag-list`, `…badge-row`) are not implementations */
      if (F.classPattern) { const re = new RegExp(F.classPattern); const ex = F.excludePattern ? new RegExp(F.excludePattern) : null; classed ||= qsa("[class]"); for (const el of classed) if (ownClasses(el).some((c) => re.test(c) && !(ex && ex.test(c)))) set.add(el); }
      const cands = [...set].sort(byOrder); const tops = []; const groups = new Map();
      for (const el of cands) {
        if (F.tags && !el.matches(F.tags)) continue;
        if (tops.some((t) => t.contains(el))) continue;
        if (!vis(el) || ignored(el)) continue;
        try { if (el.closest(canon) || (allow && el.closest(allow))) continue; } catch (e) { continue; }
        tops.push(el);
        const k = sig(el); const g = groups.get(k); if (g) g.n++; else groups.set(k, { el, n: 1 });
      }
      for (const [k, { el, n }] of groups) { counts.converge++; add("minor", "converge", el, `${name}: ${k.slice(0, 120)}${n > 1 ? ` ×${n}` : ""}`, `${F.canonical.slice(0, 3).join(" / ")} — ${F.fix || ""}`, { family: name }); }
    }
    return { viewport: `${window.innerWidth}`, phone, counts, findings };
  };

  /* interactions: the triggers to open, then mark → open → find the surface → audit → close */
  const T = spec.interactions || {};
  const locate = (selector, s) => [...document.querySelectorAll(selector)].find((el) => vis(el) && sig(el) === s);
  const triggers = (hover) => {
    const list = []; const seen = new Set();
    const pick = (selector, kind, max) => {
      let n = 0;
      for (const el of document.querySelectorAll(selector)) {
        if (n >= max) break;
        if (!vis(el) || ignored(el) || el.disabled || el.getAttribute("aria-disabled") === "true" || el.getAttribute("aria-expanded") === "true") continue;
        if (T.skipWithin && el.closest(T.skipWithin)) continue;
        if (el.matches("a[href]") && !/^#/.test(el.getAttribute("href") || "")) continue;
        const s = sig(el); if (seen.has(kind + s)) continue; seen.add(kind + s);
        list.push({ kind, sig: s, selector }); n++;
      }
    };
    pick(T.triggers, "click", T.maxTriggers || 8);
    if (hover) pick(T.tooltips, "hover", T.maxTooltips || 3);
    return list;
  };
  const prep = (selector, s) => {
    const el = locate(selector, s); if (!el) return null;
    el.scrollIntoView({ block: "center", inline: "center" });
    for (const x of document.querySelectorAll(T.surfaces)) if (vis(x)) x.setAttribute("data-ca-pre", "");
    el.setAttribute("data-ca-trigger", "");
    const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    return { x, y, ok: !!hit && (el === hit || el.contains(hit)), href: location.href };
  };
  const clickTrigger = () => { const t = document.querySelector("[data-ca-trigger]"); if (t) t.click(); return !!t; };
  const find = () => {
    const trig = document.querySelector("[data-ca-trigger]");
    /* never the page itself (a `has-sheet-open`-like state class on <html> / <body>) or a wrapper of the trigger */
    const out = [...document.querySelectorAll(T.surfaces)].filter((e) => e !== document.documentElement && e !== document.body && vis(e) && !e.hasAttribute("data-ca-pre") && !ignored(e) && !(trig && e.contains(trig)));
    const ctl = trig && trig.getAttribute("aria-controls") && document.getElementById(trig.getAttribute("aria-controls"));
    if (ctl && vis(ctl) && !out.includes(ctl) && !ctl.contains(trig)) out.push(ctl);
    const tops = out.filter((s) => !out.some((o) => o !== s && o.contains(s)));
    tops.forEach((s) => s.setAttribute("data-ca-scope", ""));
    return { n: tops.length, surface: tops.slice(0, 2).map(sig).join(" + ").slice(0, 160) };
  };
  const close = () => {
    const t = document.querySelector("[data-ca-trigger]");
    if (t && t.getAttribute("aria-expanded") === "true") t.click();
    let open = [...document.querySelectorAll("[data-ca-scope]")].filter(vis);
    for (const s of open) { const x = s.querySelector(".modal-close, .bottom-sheet__close, [data-close], [aria-label^='Închide']"); if (x && vis(x)) x.click(); }
    return [...document.querySelectorAll("[data-ca-scope]")].filter(vis).length;
  };
  const cleanup = () => { for (const a of ["data-ca-pre", "data-ca-scope", "data-ca-trigger"]) for (const e of document.querySelectorAll(`[${a}]`)) e.removeAttribute(a); return true; };
  window.__ca = { audit, triggers, prep, clickTrigger, find, close, cleanup };
  return true;
};

/* ============================================================================================= AGGREGATOR */
const readRecords = () => {
  const recs = new Map();
  for (const f of fs.readdirSync(OUT).filter((x) => /^report.*\.ndjson$/.test(x)).sort()) {
    for (const line of fs.readFileSync(path.join(OUT, f), "utf8").split("\n")) { if (!line.trim()) continue; try { const r = JSON.parse(line); if (r.key) recs.set(r.key, r); } catch { /* a torn last line */ } }
  }
  return recs;
};
const aggregate = () => {
  const recs = readRecords();
  const report = { generated: new Date().toISOString(), spec: SPEC_PATH, documentedClasses: documented.size, inventory: { removedRows: INV.removedRows, shortNamesResolved: INV.shortResolved }, states: Object.fromEntries(recs) };
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 1));
  const all = [...recs.values()]; const runs = all.filter((r) => !r.skipped);
  const skipped = all.filter((r) => r.skipped); const errs = runs.filter((r) => r.demoError);
  const errBy = {}; for (const r of errs) (errBy[r.viewport] ||= []).push(r.state);
  const base = BASELINE && fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, "utf8")).states : null;
  const cnt = (rec, sev) => rec && rec.findings ? rec.findings.filter((f) => f.severity === sev).length : null;
  const byRule = {}; const distinct = new Map();
  for (const r of runs) for (const f of r.findings || []) {
    const rk = `${f.rule}|${f.severity}`; (byRule[rk] ||= { n: 0, states: new Set() }).n++; byRule[rk].states.add(r.state);
    const tail = f.selector.split(" > ").slice(-2).join(" > ");
    const dk = `${f.severity}|${f.rule}|${tail}|${f.rule === "converge" ? f.measured.replace(/ ×\d+$/, "") : ""}`;
    const d = distinct.get(dk) || { f, tail, n: 0, states: new Set(), vps: new Set(), interaction: 0 };
    d.n++; d.states.add(r.state); d.vps.add(r.viewport); if (f.interaction) d.interaction++; distinct.set(dk, d);
  }
  const L = [`# Component audit — ${new Date().toISOString().slice(0, 16)}`, "",
    `spec \`${SPEC_PATH}\` · ${documented.size} classes documented in the Component Inventory (${INV.removedRows} removed rows ignored, ${INV.shortResolved} short \`__part\` names resolved)`, "",
    `**${runs.length} runs** (${new Set(runs.map((r) => r.state)).size} states) · ${skipped.length} skipped (desktop-only on phones) · demo errors: ${errs.length ? Object.entries(errBy).map(([vp, l]) => `${vp} ${l.length} (${l.slice(0, 12).join(", ")}${l.length > 12 ? "…" : ""})`).join(" · ") : "none"} · console exceptions in ${runs.filter((r) => (r.consoleErrors || []).length).length} runs · surfaces opened by interactions: ${runs.reduce((s, r) => s + (r.interactions || []).filter((i) => i.surfaces).length, 0)}`, "",
    "| rule | severity | instances | states |", "|---|---|---|---|",
    ...Object.entries(byRule).sort((a, b) => (a[0].endsWith("major") === b[0].endsWith("major") ? b[1].n - a[1].n : a[0].endsWith("major") ? -1 : 1)).map(([k, v]) => `| ${k.split("|")[0]} | ${k.split("|")[1]} | ${v.n} | ${v.states.size} |`), "",
    "## Distinct findings", "", "| sev | rule | where (last 2 parts) | text | measured | states | vp | example states |", "|---|---|---|---|---|---|---|---|"];
  const dl = [...distinct.values()].sort((a, b) => (a.f.severity === b.f.severity ? b.states.size - a.states.size : a.f.severity === "major" ? -1 : 1));
  for (const d of dl.slice(0, 400)) L.push(`| ${d.f.severity} | ${d.f.rule}${d.interaction ? " (opened)" : ""} | \`${d.tail}\` | ${(d.f.text || "").replace(/\|/g, "/")} | ${String(d.f.measured).replace(/\|/g, "/").slice(0, 140)} | ${d.states.size} | ${[...d.vps].join("/")} | ${[...d.states].slice(0, 3).join(", ")} |`);
  if (dl.length > 400) L.push(`| … | ${dl.length - 400} more in report.json | | | | | | |`);
  L.push("", "## Runs", "", `| state | viewport | controls | non-library | button-paint | fields | opened | major | minor${base ? " | major before → after" : ""} |`, `|---|---|---|---|---|---|---|---|---|${base ? "---|" : ""}`);
  for (const r of all) {
    if (r.skipped) { L.push(`| ${r.state} | ${r.viewport} | skipped: ${r.skipped} | | | | | | |${base ? " |" : ""}`); continue; }
    const c = r.counts || {};
    L.push(`| ${r.state}${r.demoError ? " ⚠ demo error" : ""} | ${r.viewport} | ${c.controls ?? "?"} | ${c.none ?? "?"} | ${c.buttonPaint ?? "?"} | ${c.fields ?? "?"} | ${(r.interactions || []).filter((i) => i.surfaces).length} | ${cnt(r, "major")} | ${cnt(r, "minor")}${base ? ` | ${base[r.key] ? cnt(base[r.key], "major") : "–"} → ${cnt(r, "major")}` : ""} |`);
  }
  if (runs.length <= 60) for (const r of runs) {
    if (!(r.findings || []).length) continue;
    L.push("", `## ${r.key}`, "", "| sev | rule | selector | text | measured | expected |", "|---|---|---|---|---|---|");
    const seen = new Map();
    for (const f of r.findings) { const key = [f.severity, f.rule, f.selector, f.measured, f.interaction || ""].join("|"); seen.set(key, { ...f, n: (seen.get(key)?.n || 0) + 1 }); }
    for (const f of seen.values()) L.push(`| ${f.severity} | ${f.rule}${f.interaction ? ` (opened: ${f.interaction.slice(0, 60)})` : ""} | \`${f.selector}\`${f.n > 1 ? ` ×${f.n}` : ""} | ${(f.text || "").replace(/\|/g, "/")} | ${String(f.measured).replace(/\|/g, "/")} | ${String(f.expected).replace(/\|/g, "/")} |`);
  }
  L.push("", "## Fix hints", "", ...Object.entries(spec.fixHints).map(([r, h]) => `- **${r}** — ${h}`));
  fs.writeFileSync(path.join(OUT, "summary.md"), L.join("\n") + "\n");
  console.log(`→ ${path.join(OUT, "report.json")} + summary.md (${runs.length} runs, ${skipped.length} skipped, ${errs.length} demo errors)`);
};

/* ============================================================================================= SELECTION */
const demoIds = () => [...new Set([...fs.readFileSync("js/demo-states.js", "utf8").matchAll(/^\s*"([a-z][a-z0-9]*(?:-[0-9a-z]+)+)"\s*:/gm)].map((m) => m[1]))];
let STATES = [];
if (has("all")) STATES = [...demoIds(), ...(spec.pages || []).map((p) => "page:" + p)];
else {
  if (arg("states")) STATES.push(...arg("states").split(",").filter(Boolean));
  if (arg("prefix")) { const pre = arg("prefix").split(",").filter(Boolean); STATES.push(...demoIds().filter((s) => pre.some((p) => s.startsWith(p)))); }
  if (has("pages")) STATES.push(...(spec.pages || []).map((p) => "page:" + p));
}
STATES = [...new Set(STATES)];

if (has("summary")) { aggregate(); process.exit(0); }
if (has("static")) { runStatic(); if (!STATES.length) process.exit(0); }
if (!STATES.length) { console.error("give --states a,b | --prefix fo-,sm- | --all | --pages (and/or --static, --summary)"); process.exit(2); }

const VIEW = { desktop: [1440, 900, false], mobile: [375, 812, true], edge: [760, 900, true] };
for (const v of VPS) if (/^\d+$/.test(v)) VIEW[v] = [Number(v), 900, Number(v) <= spec.size.phoneMaxWidth];
const phoneVp = (vp) => VIEW[vp][0] <= spec.size.phoneMaxWidth;
const desktopOnly = (st) => (spec.desktopOnly?.patterns || []).some((p) => new RegExp(p).test(st.replace(/^page:/, "")));
const runsFor = (states) => states.flatMap((st) => VPS.map((vp) => ({ st, vp, key: `${st}/${vp}` })));

/* one writer per --out: a second run into the same folder would interleave its ndjson with ours (seen 2026-10-21) */
if (!PART) {
  const LOCK = path.join(OUT, ".lock");
  if (fs.existsSync(LOCK)) { const pid = Number(fs.readFileSync(LOCK, "utf8")); let alive = false; try { process.kill(pid, 0); alive = pid !== process.pid; } catch { /* stale */ } if (alive) { console.error(`component-audit: another run (pid ${pid}) is writing to ${OUT} — use another --out`); process.exit(5); } }
  fs.writeFileSync(LOCK, String(process.pid));
  process.on("exit", () => { try { if (fs.readFileSync(LOCK, "utf8") === String(process.pid)) fs.rmSync(LOCK); } catch { /* gone */ } });
}
/* fresh run (parent, no --resume): clear the previous ndjson in this --out */
if (!PART && !has("resume")) for (const f of fs.readdirSync(OUT).filter((x) => /^report.*\.ndjson$/.test(x))) fs.rmSync(path.join(OUT, f));

/* ============================================================================================= WORKERS */
if (!PART && WORKERS > 1) {
  const pass = []; for (const k of ["base", "page", "scope", "spec", "chrome", "viewports", "max-triggers"]) if (arg(k)) pass.push("--" + k, arg(k)); if (!INTERACT) pass.push("--no-interactions");
  for (let round = 1; round <= 3; round++) {
    const done = new Set(readRecords().keys());
    const pendingStates = STATES.filter((st) => VPS.some((vp) => !done.has(`${st}/${vp}`)));
    if (!pendingStates.length) break;
    console.log(`round ${round}: ${pendingStates.length} states over ${WORKERS} workers`);
    const chunks = Array.from({ length: WORKERS }, () => []); pendingStates.forEach((s, i) => chunks[i % WORKERS].push(s));
    const children = [];
    /* a stopped parent stops its workers (each closes its own Chrome); --resume continues later */
    const stop = () => { for (const c of children) c.kill("SIGTERM"); process.exit(130); };
    process.once("SIGTERM", stop); process.once("SIGINT", stop);
    await Promise.all(chunks.filter((c) => c.length).map((c, i) => new Promise((res) => {
      const child = spawn(process.execPath, ["--experimental-websocket", "--no-warnings", SELF, "--states", c.join(","), "--part", `w${i}`, "--resume", "--out", OUT, ...pass], { stdio: ["ignore", "inherit", "inherit"] });
      children.push(child); child.on("exit", res);
    })));
    process.removeListener("SIGTERM", stop); process.removeListener("SIGINT", stop);
    const after = readRecords().size; if (after === done.size) { console.error("no progress in this round — stopping"); break; }
  }
  aggregate();
  process.exit(0);
}

/* ============================================================================================= CDP RUN */
const NDJSON = path.join(OUT, PART ? `report.part-${PART}.ndjson` : "report.ndjson");
const doneKeys = has("resume") ? new Set(readRecords().keys()) : new Set();
const pending = runsFor(STATES).filter((r) => !doneKeys.has(r.key));
const write = (rec) => fs.appendFileSync(NDJSON, JSON.stringify(rec) + "\n");
for (const r of pending.filter((r) => phoneVp(r.vp) && desktopOnly(r.st))) { write({ key: r.key, state: r.st, viewport: r.vp, skipped: "desktop-only" }); console.log(`${r.st} ${r.vp} skipped (desktop-only)`); }
const todo = pending.filter((r) => !(phoneVp(r.vp) && desktopOnly(r.st)));
if (!todo.length) { if (!PART) aggregate(); process.exit(0); }

setTimeout(() => { console.error("component-audit: global timeout — re-run with --resume"); process.exit(3); }, Math.max(180000, todo.length * 90000));
const port = 9300 + Math.floor(Math.random() * 600);
const udd = `/tmp/ui-qa-components-${port}`;
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${udd}`, "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const quit = (code) => { try { chrome.kill(); fs.rmSync(udd, { recursive: true, force: true }); } catch { /* gone */ } process.exit(code); };
/* stopped (Ctrl-C, kill, a parent's stop): close Chrome; every finished state is already in the ndjson */
process.once("SIGTERM", () => quit(143)); process.once("SIGINT", () => quit(130));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 80 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === "page"); } catch { /* starting */ } }
if (!target) { console.error("Chrome did not start"); quit(1); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let seq = 0; const waiting = new Map(); let consoleErrors = []; let timeouts = 0;
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m.result || { error: m.error }); waiting.delete(m.id); }
  if (m.method === "Runtime.exceptionThrown") consoleErrors.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || "").slice(0, 200));
});
const send = async (method, params = {}) => {
  const r = await Promise.race([new Promise((res) => { const i = ++seq; waiting.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); }), sleep(20000).then(() => ({ error: "timeout " + method }))]);
  if (r && r.error === "timeout " + method) { if (++timeouts >= 3) { console.error("component-audit: Chrome stopped answering — re-run with --resume"); quit(4); } } else timeouts = 0;
  return r;
};
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }))?.result?.value;
await send("Runtime.enable"); await send("Page.enable");
const LIB_SRC = `(${PAGE_LIB.toString()})(${JSON.stringify(spec)}, ${JSON.stringify([...documented])})`;

/* a slow machine (other agents' sweeps: load 40) can need > 18 s for a state — wait up to 36 s, then reload once */
const load = async (st, retry = true) => {
  const isPage = st.startsWith("page:");
  /* through about:blank: the previous page (or the same state before a reload) must never answer for this one */
  await send("Page.navigate", { url: "about:blank" });
  for (let i = 0; i < 40 && (await evaluate("location.href")) !== "about:blank"; i++) await sleep(50);
  await send("Page.navigate", { url: isPage ? `${BASE}/${st.slice(5)}` : `${BASE}/${PAGE}?state=${st}` });
  let ds = "";
  if (isPage) { for (let i = 0; i < 80; i++) { await sleep(150); if ((await evaluate(`location.href !== "about:blank" && document.readyState`)) === "complete") break; } await sleep(900); ds = "page"; }
  else {
    /* the exact id (or id:error) — demo-links.js writes it when the run ends (also after a cross-page hop) */
    for (let i = 0; i < 240; i++) { await sleep(150); const v = await evaluate("document.documentElement.dataset.demoState || ''"); if (v === st || v === `${st}:error`) { ds = v; break; } }
    if (!ds && retry) return load(st, false);
    await sleep(900);
  }
  await evaluate(`(() => { const s = document.head.appendChild(document.createElement("style")); s.textContent = "*,*::before,*::after{transition:none!important;animation:none!important}"; return true; })()`);
  await sleep(100);
  await evaluate(LIB_SRC);
  return ds;
};
const mouse = async (type, x, y) => send("Input.dispatchMouseEvent", { type, x, y, button: type === "mouseMoved" ? "none" : "left", clickCount: type === "mouseMoved" ? 0 : 1 });

for (const { st, vp, key } of todo) {
  const [w, h, mobile] = VIEW[vp];
  const t0 = Date.now(); consoleErrors = [];
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile });
  await send("Emulation.setTouchEmulationEnabled", { enabled: mobile });
  const ds = await load(st);
  const res = await evaluate(`window.__ca.audit(${JSON.stringify(SCOPE)}, "")`);
  const rec = { key, state: st, viewport: vp, ...(res || { counts: {}, findings: [], error: "audit failed" }) };
  rec.demoState = ds; rec.demoError = !ds || /:error/.test(ds); rec.interactions = [];
  /* interactions: open what the state left closed and audit it */
  if (INTERACT && res && !rec.demoError) {
    const seenF = new Set(rec.findings.map((f) => `${f.rule}|${f.selector}|${f.measured}`));
    const list = (await evaluate(`window.__ca.triggers(${JSON.stringify(!mobile)})`)) || [];
    for (const t of list) {
      const p = await evaluate(`window.__ca.prep(${JSON.stringify(t.selector)}, ${JSON.stringify(t.sig)})`);
      if (!p) { rec.interactions.push({ ...t, selector: undefined, surfaces: 0, note: "trigger gone" }); continue; }
      if (t.kind === "hover") { await mouse("mouseMoved", p.x, p.y); await sleep(spec.interactions.hoverWait || 450); }
      else if (!mobile && p.ok) { await mouse("mouseMoved", p.x, p.y); await mouse("mousePressed", p.x, p.y); await mouse("mouseReleased", p.x, p.y); await sleep(spec.interactions.openWait || 350); }
      else { await evaluate("window.__ca.clickTrigger()"); await sleep(spec.interactions.openWait || 350); }
      const found = (await evaluate("window.__ca.find()")) || { n: 0 };
      let added = 0;
      if (found.n) {
        const sub = await evaluate(`window.__ca.audit("[data-ca-scope]", ${JSON.stringify(`${t.kind} ${t.sig}`.slice(0, 160))})`);
        for (const f of sub?.findings || []) { const k = `${f.rule}|${f.selector}|${f.measured}`; if (seenF.has(k)) continue; seenF.add(k); rec.findings.push(f); added++; }
      }
      rec.interactions.push({ kind: t.kind, trigger: t.sig.slice(0, 160), surfaces: found.n, surface: found.surface || "", findings: added });
      if (t.kind === "hover") { await mouse("mouseMoved", 1, 1); await sleep(150); }
      else { await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }); await sleep(150); }
      const stillOpen = await evaluate("window.__ca.close()");
      const href = await evaluate("location.href");
      await evaluate("window.__ca && window.__ca.cleanup()");
      if (stillOpen || href !== p.href || !(await evaluate("!!window.__ca"))) await load(st);
    }
  }
  rec.consoleErrors = consoleErrors; rec.ms = Date.now() - t0;
  write(rec);
  const maj = rec.findings.filter((f) => f.severity === "major").length, min = rec.findings.length - maj;
  console.log(`${st} ${vp} ${rec.demoError ? "DEMO-ERROR " : ""}controls=${rec.counts.controls ?? "?"} non-library=${rec.counts.none ?? "?"} button-paint=${rec.counts.buttonPaint ?? "?"} fields=${rec.counts.fields ?? "?"} opened=${rec.interactions.filter((i) => i.surfaces).length}/${rec.interactions.length} major=${maj} minor=${min}`);
}
ws.close();
if (!PART) aggregate();
quit(0);
