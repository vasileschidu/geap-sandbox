// UI QA — code. Opens demo states in headless Chrome and measures what the browser renders:
// spacing / radius / font-size off the token scale, colours that are not design tokens, non-Onest
// fonts, clipped text without a tooltip, overlapping controls, button icons that differ from
// their label colour, buttons that are not library buttons, open menus / listboxes without the dropdown
// surface (shadow, radius 12, clip), and horizontal overflow.
// Also scans the given source files for hard-coded hex / px outside var().
//
// Usage: node --experimental-websocket --no-warnings tools/ui-qa/code-audit.mjs \
//          --states svc-06d,svc-02h [--scope "[data-doc-drawer] aside"] [--out dir] [--files css/x.css,js/y.js]
// Needs the prototype served on http://localhost:8935 and Google Chrome.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const arg = (name, def) => { const i = process.argv.indexOf("--" + name); return i > -1 ? process.argv[i + 1] : def; };
const BASE = arg("base", "http://localhost:8935");
const PAGE = arg("page", "e-permits-acte-permisive.html");
const OUT = arg("out", "tools/ui-qa/out/code");
const SCOPE = arg("scope", "");
const STATES = (arg("states", "") || "").split(",").filter(Boolean);
const FILES = (arg("files", "") || "").split(",").filter(Boolean);
const CHROME = arg("chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
fs.mkdirSync(OUT, { recursive: true });

/* the token scales (design-system.md); anything else is a finding */
const SPACING = [0, 1, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96];
const RADIUS = [0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 999, 9999];
const FONT = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48];

// ---- static scan --------------------------------------------------------------------------
const staticFindings = [];
/* only the lines this change added (git diff against HEAD, staged + unstaged); --all-lines scans everything */
import { execSync } from "node:child_process";
const addedLines = (f) => {
  if (process.argv.includes("--all-lines")) return null;
  try {
    const diff = execSync(`git diff -U0 HEAD -- "${f}"`, { encoding: "utf8" });
    const set = new Set(); let n = 0;
    for (const l of diff.split("\n")) { const m = l.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/); if (m) { n = Number(m[1]); const c = m[2] === undefined ? 1 : Number(m[2]); for (let k = 0; k < c; k++) set.add(n + k); } }
    return set;
  } catch (e) { return null; }
};
for (const f of FILES) {
  if (!fs.existsSync(f)) continue;
  const only = addedLines(f);
  fs.readFileSync(f, "utf8").split("\n").forEach((line, i) => {
    if (only && !only.has(i + 1)) return;
    const code = line.replace(/var\([^)]*\)/g, "").replace(/\/\*.*?\*\//g, "");
    if (/#[0-9a-fA-F]{3,8}\b/.test(code) && !/url\(|sprite\.svg|href=|&#/.test(code)) staticFindings.push({ file: f, line: i + 1, rule: "hex-outside-token", text: line.trim().slice(0, 160) });
    if (/\.css$/.test(f) && /:\s*[^;]*\b\d+px/.test(code) && !/^\s*(\/\/|\*|@media|--)/.test(line) && !/(1px|0px)/.test(code.match(/\b\d+px/)?.[0] || "")) staticFindings.push({ file: f, line: i + 1, rule: "px-outside-token", text: line.trim().slice(0, 160) });
  });
}

// ---- browser ------------------------------------------------------------------------------
const AUDIT = (scope, SPACING, RADIUS, FONT) => {
  const vis = (el) => { const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  /* the first VISIBLE match of the scope list (a hidden drawer earlier in the DOM is skipped) */
  /* no scope: the first VISIBLE <main> (2026-10-16: the hidden flow-home <main> comes first in the DOM and made
     every unscoped run measure nothing — „{}” on every state) */
  const root = (scope && [...document.querySelectorAll(scope)].find((n) => vis(n))) || [...document.querySelectorAll("main")].find((n) => vis(n)) || document.body;
  const sel = (el) => { const parts = []; let n = el; for (let i = 0; n && n !== document.body && i < 4; i++, n = n.parentElement) { let s = n.tagName.toLowerCase(); const c = [...n.classList].filter((x) => !/^is-|^has-/.test(x)).slice(0, 2).join("."); if (c) s += "." + c; parts.unshift(s); } return parts.join(" > "); };
  const txt = (el) => (el.innerText || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 40);
  // the token colours actually defined on :root
  const tokens = new Set();
  for (const sheet of [...document.styleSheets]) { let rules; try { rules = sheet.cssRules; } catch (e) { continue; } for (const r of rules) { if (r.selectorText && /:root/.test(r.selectorText)) for (const p of r.style) if (p.startsWith("--")) { const v = getComputedStyle(document.documentElement).getPropertyValue(p).trim(); const probe = document.createElement("span"); probe.style.color = v; document.body.appendChild(probe); const c = getComputedStyle(probe).color; probe.remove(); if (c) tokens.add(c.replace(/\s/g, "")); } } }
  const onScale = (v, scale) => scale.some((s) => Math.abs(v - s) < 0.6);
  const findings = [];
  const add = (rule, el, detail) => { if (findings.length < 400) findings.push({ rule, el: sel(el), text: txt(el), detail }); };
  const els = [...root.querySelectorAll("*")].filter(vis);
  for (const el of els) {
    const cs = getComputedStyle(el);
    for (const p of ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "rowGap", "columnGap"]) { const v = parseFloat(cs[p]); if (v && !onScale(v, SPACING)) add("spacing-off-scale", el, `${p} ${v}px`); }
    const rad = parseFloat(cs.borderTopLeftRadius); if (rad && !onScale(rad, RADIUS) && !cs.borderTopLeftRadius.includes("%")) add("radius-off-scale", el, `radius ${cs.borderTopLeftRadius}`);
    if (el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) {
      const fs = parseFloat(cs.fontSize); if (!onScale(fs, FONT)) add("font-size-off-scale", el, `${fs}px`);
      const fam = cs.fontFamily.toLowerCase();
      if (!fam.includes("onest") && !el.closest("code.e-permits-doc-kw, .e-permits-doc-kwselect")) add("font-not-onest", el, cs.fontFamily.slice(0, 60));
      if (tokens.size && !tokens.has(cs.color.replace(/\s/g, ""))) add("text-colour-not-token", el, cs.color);
      // clipped text without a way to read it
      /* the ONE tooltip runtime (js/icon-tooltip.js, tooltip-one-v1) shows the full text of ANY clipped text inside a table
         cell, and of every [data-cell-tooltip] that is cut (on it, its clipping parent or a part inside it) */
      const tipRuntime = document.querySelector("script[src*='icon-tooltip.js']");
      const cellTip = (tipRuntime && (el.closest("[data-cell-tooltip]") || el.querySelector("[data-cell-tooltip]") || el.closest("td, th, [role=cell], [role=gridcell]")));
      if (el.scrollWidth > el.clientWidth + 1 && cs.overflow !== "visible" && !el.title && !el.closest("[data-tooltip-label],[data-tooltip-text],[data-tooltip-hint],[title]") && !cellTip) add("clipped-text-no-tooltip", el, `${el.scrollWidth} > ${el.clientWidth}`);
    }
    const bg = cs.backgroundColor; if (bg && bg !== "rgba(0, 0, 0, 0)" && tokens.size && !tokens.has(bg.replace(/\s/g, ""))) add("background-not-token", el, bg);
    if (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== "none" && !/rgba\([^)]*,\s*0\)$/.test(cs.borderTopColor) && tokens.size && !tokens.has(cs.borderTopColor.replace(/\s/g, ""))) add("border-not-token", el, cs.borderTopColor);
  }
  // buttons: library classes, icon colour = label colour
  for (const b of root.querySelectorAll("button")) {
    if (!vis(b)) continue;
    const lib = /\b(btn|chip|chip__label|chip__close|segment-item|tab-button|e-permits-fo-select__button|checkbox|modal-close|e-permits-user-create__close|e-permits-fo-subgen-select__button|e-permits-fo-intent-menu__item|btn-icon|e-permits-timeline__link|e-permits-stack__menu-trigger|e-permits-fo-subgen-chip__remove|e-permits-cfg-num-token|copy-value__button)\b/.test(b.className) || b.closest(".e-permits-fo-select__list, .sidebar, header, nav, .tabs, .e-permits-fo-testcfg");
    if (!lib) add("button-not-library", b, b.className.slice(0, 80));
    // the label = the text next to the icon in its own group (a „Mai mult ⌄” part inside a bigger button), else the button's
    const icon = b.querySelector("svg"); const group = icon && icon.parentElement !== b && [...icon.parentElement.childNodes].some((n) => n !== icon && n.textContent.trim()) ? icon.parentElement : b;
    const label = [...group.childNodes].find((n) => (n.nodeType === 3 && n.textContent.trim()) || (n.nodeType === 1 && n.tagName === "SPAN" && n.textContent.trim()));
    if (icon && label) { const ic = getComputedStyle(icon).fill === "none" ? getComputedStyle(icon).color : getComputedStyle(icon).fill; const lc = getComputedStyle(label.nodeType === 1 ? label : group).color; if (ic && lc && ic.replace(/\s/g, "") !== lc.replace(/\s/g, "") && !/currentcolor/i.test(ic)) add("button-icon-colour-differs", b, `icon ${ic} vs label ${lc}`); }
  }
  // overlapping interactive controls
  /* each control's rect clipped to its scroll containers: what is scrolled away does not count */
  const clipped = (el) => {
    let r = el.getBoundingClientRect(), box = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
      const o = getComputedStyle(n); if (o.overflowX === "visible" && o.overflowY === "visible") continue;
      const c = n.getBoundingClientRect();
      box = { left: Math.max(box.left, c.left), top: Math.max(box.top, c.top), right: Math.min(box.right, c.right), bottom: Math.min(box.bottom, c.bottom) };
    }
    return box;
  };
  const ctrls = [...root.querySelectorAll("button, input, select, a[href], [role=checkbox], label.checkbox")].filter(vis).map((el) => [el, clipped(el)]).filter(([, r]) => r.right - r.left > 1 && r.bottom - r.top > 1);
  for (let i = 0; i < ctrls.length; i++) for (let j = i + 1; j < ctrls.length; j++) {
    const [a, ra] = ctrls[i], [b, rb] = ctrls[j];
    if (a.contains(b) || b.contains(a)) continue;
    /* content scrolling under a sticky / fixed bar (drawer footer, header) is not an overlap */
    const pinned = (el) => { for (let n = el; n && n !== document.body; n = n.parentElement) { const p = getComputedStyle(n).position; if (p === "sticky" || p === "fixed") return n; } return null; };
    if (pinned(a) !== pinned(b)) continue;
    const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (ox > 2 && oy > 2) add("controls-overlap", a, `overlaps ${sel(b)} by ${Math.round(ox)}×${Math.round(oy)}`);
  }
  /* tight-gap (2026-10-16, user: „leave nice space”): an alert / notice / loose explanatory paragraph closer than
     8px (vertically) to the block above or below it — a sibling, or the parent's sibling when the box is the
     first / last child of a wrapper without its own padding or border. Field hints / errors under their control
     (the FO field rule, 4) and text inside components (titles, meta, descriptions, a card's `__heading` group:
     title + subtitle, 2026-10-17) are not counted. */
  const BOXES = ".message, .info-box, .e-permits-fo-notice, .e-permits-fo-infobox, .e-permits-fo-mnotify-info, .e-permits-info-note";
  const looseText = (el) => (el.matches(BOXES) && !el.matches(".message--inline")) || (el.tagName === "P" && !el.closest(BOXES) && !el.matches(".e-permits-fo-field__hint, .e-permits-fo-field__error, .u-visually-hidden, [class*='__meta'], [class*='__desc'], [class*='__text'], [class*='__title'], [class*='__label'], [class*='__saved'], [class*='__status']") && !el.parentElement?.closest(".e-permits-fo-field, label, button, .e-permits-fo-lib-item, .e-permits-stack__item, table, header, nav, .modal--header, [class*='__copy'], [class*='__content'], [class*='__heading']"));
  const flat = (n) => { const c = getComputedStyle(n); return !parseFloat(c.paddingTop) && !parseFloat(c.paddingBottom) && !parseFloat(c.borderTopWidth) && !parseFloat(c.borderBottomWidth); };
  const neighbour = (el, dir) => {
    for (let n = el, depth = 0; n && n !== root && depth < 3; n = n.parentElement, depth += 1) {
      let s = dir < 0 ? n.previousElementSibling : n.nextElementSibling;
      while (s && !vis(s)) s = dir < 0 ? s.previousElementSibling : s.nextElementSibling;
      if (s) return s;
      if (!n.parentElement || !flat(n.parentElement)) return null;
    }
    return null;
  };
  for (const el of els.filter(looseText)) {
    const r = el.getBoundingClientRect();
    for (const dir of [-1, 1]) {
      const nb = neighbour(el, dir); if (!nb || el.contains(nb) || nb.contains(el)) continue;
      const q = nb.getBoundingClientRect();
      if (Math.min(r.right, q.right) - Math.max(r.left, q.left) < 8) continue;
      /* the visible distance: a neighbour without a border / background on the facing side starts at its padding */
      const side = dir < 0 ? "Bottom" : "Top";
      /* unpainted wrappers on the facing side count their padding, down to the first painted box (3 levels) */
      let inset = 0;
      for (let n = nb, depth = 0; n && depth < 4; depth += 1) {
        const nc = getComputedStyle(n);
        if (parseFloat(nc[`border${side}Width`]) > 0 || (nc.backgroundColor !== "rgba(0, 0, 0, 0)" && nc.backgroundColor !== "transparent")) break;
        inset += parseFloat(nc[`padding${side}`]) || 0;
        let c = dir < 0 ? n.lastElementChild : n.firstElementChild;
        while (c && !vis(c)) c = dir < 0 ? c.previousElementSibling : c.nextElementSibling;
        n = c;
      }
      const gap = (dir < 0 ? r.top - q.bottom : q.top - r.bottom) + inset;
      /* alert + alert (2026-10-16): two notices in a row must not touch — the generic „Alert stack” rule gives 12 */
      const stack = nb.matches(BOXES) && !nb.matches(".message--inline") ? "alert + alert: " : "";
      if (gap > -0.5 && gap < 7.5 && !(stack && dir < 0)) add("tight-gap", el, `${stack}${Math.round(gap)}px ${dir < 0 ? "below" : "above"} ${sel(nb)}`);
    }
  }
  /* dropdown-surface (2026-10-16, user: „all dropdown menus get the dropdown effect + clip content”): every
     open role=menu / role=listbox / known dropdown surface class (filter popovers are role=dialog) that floats (itself or a positioned ancestor up to 3 levels = its surface) must
     have the dropdown surface of components.md › „Dropdown surface”: the „dropdown-effect” shadow, radius 12, no border,
     a painted background and a non-visible overflow (clip / hidden / auto), so row backgrounds and the scrollbar
     stay inside the rounded corners. Checked document-wide (menus are often appended to <body> / fixed). */
  {
    const probe = document.body.appendChild(document.createElement("div"));
    /* Figma effect style „dropdown-effect” (no CSS token exists — the value lives once in the „Dropdown surface” rule) */
    probe.style.boxShadow = "0 0 0 1px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.1)";
    const WANT = getComputedStyle(probe).boxShadow; probe.remove();
    const seen = new Set();
    for (const list of document.querySelectorAll("[role=menu], [role=listbox], .e-permits-dropdown, .e-permits-fo-intent-menu, .e-permits-fo-caem__menu, .e-permits-fo-subgen-select__menu, .e-permits-fo-mdocs__menu, .date-picker-panel .date-picker")) {
      if (!vis(list)) continue;
      if (list.closest(".date-picker__field.is-mobile")) continue; /* phones: the library date picker is a bottom sheet */
      /* a known surface class is its own surface (the date picker sits in an unpainted positioned panel) */
      let surface = list.matches(".e-permits-dropdown, .e-permits-fo-intent-menu, .e-permits-fo-caem__menu, .e-permits-fo-subgen-select__menu, .e-permits-fo-mdocs__menu, .date-picker") ? list : null;
      for (let n = list, d = 0; !surface && n && n !== document.body && d < 4; n = n.parentElement, d += 1) { if (/absolute|fixed/.test(getComputedStyle(n).position)) { surface = n; break; } }
      if (!surface || seen.has(surface)) continue;
      seen.add(surface);
      const c = getComputedStyle(surface), bad = [];
      if (c.boxShadow !== WANT) bad.push(`shadow ${c.boxShadow.slice(0, 60)}`);
      /* phones (≤760): a row action menu (act / request rows, act profile) is the touch popover with radius 16
         (action-menu-v1, 2026-10-20, user ref Telegram — components.md „Row action menu on phones”) */
      const wantRadius = innerWidth <= 760 && surface.matches(".e-permits-fo-intent-act__action > .e-permits-fo-intent-menu") ? 16 : 12;
      if (Math.abs(parseFloat(c.borderTopLeftRadius) - wantRadius) > 0.5) bad.push(`radius ${c.borderTopLeftRadius}`);
      if (parseFloat(c.borderTopWidth) > 0) bad.push(`border ${c.borderTopWidth}`);
      if (c.overflowX === "visible" || c.overflowY === "visible") bad.push(`overflow ${c.overflowX}/${c.overflowY}`);
      if (c.backgroundColor === "rgba(0, 0, 0, 0)") bad.push("no background");
      if (bad.length) add("dropdown-surface", surface, bad.join(" · "));
    }
  }
  // horizontal overflow of the page
  if (document.documentElement.scrollWidth > window.innerWidth + 1) findings.push({ rule: "page-horizontal-overflow", el: "html", text: "", detail: `${document.documentElement.scrollWidth} > ${window.innerWidth}` });
  // summarise: same rule + same element pattern once, with a count
  const groups = new Map();
  for (const f of findings) { const k = f.rule + "|" + f.el.replace(/:nth.*$/, "") + "|" + f.detail; const g = groups.get(k); if (g) g.count++; else groups.set(k, { ...f, count: 1 }); }
  return JSON.stringify({ scope: scope || "main", tokens: tokens.size, findings: [...groups.values()] });
};

const port = 9300 + Math.floor(Math.random() * 300);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/ui-qa-cdp-${port}`, "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === "page"); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let seq = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || { error: m.error }); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++seq; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }))?.result?.value;
await send("Runtime.enable"); await send("Page.enable");

const report = { generated: new Date().toISOString(), static: staticFindings, states: {} };
for (const st of STATES) {
  for (const [vp, w, h, mobile] of [["desktop", 1440, 900, false], ["mobile", 375, 812, true]]) {
    await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile });
    await send("Page.navigate", { url: `${BASE}/${PAGE}?state=${st}` });
    for (let i = 0; i < 100; i++) { await sleep(150); if (await evaluate("document.documentElement.dataset.demoState")) break; }
    await sleep(800);
    await evaluate(`(() => { const s = document.head.appendChild(document.createElement("style")); s.textContent = "*,*::before,*::after{transition:none!important;animation:none!important} .e-permits-fo-testcfg,.msup-bubble{display:none!important}"; })()`);
    const res = JSON.parse(await evaluate(`(${AUDIT.toString()})(${JSON.stringify(SCOPE)}, ${JSON.stringify(SPACING)}, ${JSON.stringify(RADIUS)}, ${JSON.stringify(FONT)})`));
    const shot = await send("Page.captureScreenshot", { format: "png" });
    const dir = path.join(OUT, st); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, vp + ".png"), Buffer.from(shot.data, "base64"));
    report.states[`${st}/${vp}`] = res;
    const byRule = {}; res.findings.forEach((f) => { byRule[f.rule] = (byRule[f.rule] || 0) + f.count; });
    console.log(st, vp, JSON.stringify(byRule));
  }
}
fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 1));
console.log("static findings:", staticFindings.length, "→", path.join(OUT, "report.json"));
ws.close(); chrome.kill(); process.exit(0);
