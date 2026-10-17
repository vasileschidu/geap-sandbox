// UI QA — compare the rendered style of „the same component” on two screens (reference vs copy).
// For every pair of selectors it reads getComputedStyle + getBoundingClientRect on both sides and prints
// a diff table of every property that differs (±0.5px tolerance on numbers). It also compares the design
// tokens (custom properties on :root) that both pages define.
//
// Usage:
//   node --experimental-websocket --no-warnings tools/ui-qa/compare-styles.mjs \
//     --a svc-01 --b rap-02 --spec tools/ui-qa/specs/rap-profile-vs-bo.json [--viewports 1440,375] [--out dir] [--json]
//   --dump "<selector>" --a <state>   prints a compact DOM tree (classes + size) of the first visible match,
//                                     to choose selectors.
//   --trace "<selector>" --a <state> [--props font-size,color]   prints the element and its ancestors with the
//                                     given computed properties (where does an inherited value come from?).
// Spec file: { "pairs": [ { "name": "row label", "a": "<css>", "b": "<css>", "aSide"?: "dos-01",
//              "rel"?: "card", "props"?: [...], "ignore"?: [...], "nth"?: 0, "nthA"?: 1, "nthB"?: 0,
//              "pseudo"?: "::before" } ],
//              "tokens"?: ["--color-", "--font-", …]  (prefixes of custom properties to compare) }
//   a / b       selectors on the two states (first VISIBLE match, or the nth visible one);
//   rel         name of another pair: x / y are then measured from that element's box (inset);
//   props       replace the default property list; ignore = drop properties from it.
//   A pair may set "states": { "a": "dos-01" } to read its reference side from another state.
//   "expected": [ { "viewport": 375, "name": "card", "prop": "rect.width", "why": "…" } ] lists page-level
//   differences that are intended; they print in their own table and are not counted.
// Needs the prototype served on http://localhost:8935 and Google Chrome.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const arg = (name, def) => { const i = process.argv.indexOf("--" + name); return i > -1 ? process.argv[i + 1] : def; };
const BASE = arg("base", "http://localhost:8935");
const PAGE = arg("page", "e-permits-acte-permisive.html");
const CHROME = arg("chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
const A = arg("a", ""); const B = arg("b", "");
const DUMP = arg("dump", "");
const TRACE = arg("trace", "");
const TRACE_PROPS = (arg("props", "font-family,font-size,line-height,color,letter-spacing")).split(",");
const SPEC = arg("spec", "");
const OUT = arg("out", "");
const TOL = Number(arg("tol", "0.5"));
const VIEWPORTS = (arg("viewports", "1440,375")).split(",").map(Number).map((w) => ({ width: w, height: w > 760 ? 900 : 812, mobile: w <= 760, scale: w <= 760 ? 2 : 1 }));

const DEFAULT_PROPS = [
  "display", "flex-direction", "flex-wrap", "align-items", "justify-content", "flex-grow", "flex-shrink", "flex-basis",
  "gap", "row-gap", "column-gap", "grid-template-columns",
  "font-family", "font-size", "line-height", "font-weight", "font-style", "letter-spacing", "text-transform", "text-decoration-line",
  "-webkit-font-smoothing", "text-rendering", "font-kerning", "font-synthesis", "font-feature-settings", "font-variant-numeric",
  "color", "background-color", "box-shadow", "opacity",
  "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
  "border-top-style", "border-bottom-style", "border-top-color", "border-bottom-color", "border-left-color", "border-right-color",
  "border-top-left-radius", "border-top-right-radius", "border-bottom-left-radius", "border-bottom-right-radius",
  "padding-top", "padding-right", "padding-bottom", "padding-left",
  "margin-top", "margin-right", "margin-bottom", "margin-left",
  "min-height", "max-width", "white-space", "overflow-x", "text-overflow", "vertical-align", "fill", "stroke"
];
const RECT_PROPS = ["width", "height", "x", "y"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
setTimeout(() => { console.error("compare-styles: global timeout"); process.exit(2); }, 10 * 60 * 1000).unref();

const port = 9300 + Math.floor(Math.random() * 300);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/cmpstyles-cdp-${port}`, "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
let target;
for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === "page"); } catch {} }
if (!target) { console.error("Chrome did not start"); process.exit(1); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let seq = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || { error: m.error }); pending.delete(m.id); } });
const send = (method, params = {}) => Promise.race([
  new Promise((r) => { const i = ++seq; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); }),
  sleep(30000).then(() => ({ error: "timeout " + method }))
]);
const evaluate = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r?.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r?.result?.value; };
await send("Runtime.enable"); await send("Page.enable");

const open = async (state, vp) => {
  await send("Emulation.setDeviceMetricsOverride", { width: vp.width, height: vp.height, deviceScaleFactor: vp.scale, mobile: vp.mobile });
  await send("Emulation.setTouchEmulationEnabled", { enabled: vp.mobile });
  await send("Page.navigate", { url: `${BASE}/${PAGE}?state=${state}` });
  let ds = "";
  for (let i = 0; i < 120 && !ds; i++) { await sleep(150); ds = await evaluate("document.documentElement.dataset.demoState || ''").catch(() => ""); }
  if (!ds || /:error/.test(ds)) throw new Error(`state ${state} @${vp.width}: ${ds || "not ready"}`);
  await sleep(700);
  await evaluate(`(() => { const s = document.head.appendChild(document.createElement("style")); s.textContent = "*,*::before,*::after{transition:none!important;animation:none!important} .msup-bubble,.e-permits-fo-testcfg{display:none!important}"; document.activeElement?.blur?.(); })()`);
  await sleep(150);
};

/* runs in the page */
const MEASURE = (pairs, side, props, rectProps, tokenPrefixes) => {
  const vis = (el) => { const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden") return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const pick = (sel, nth = 0) => { try { return [...document.querySelectorAll(sel)].filter(vis)[nth] || null; } catch (e) { return null; } };
  const found = {};
  for (const p of pairs) found[p.name] = pick(p[side], p[side === "a" ? "nthA" : "nthB"] ?? p.nth ?? 0);
  const out = {};
  for (const p of pairs) {
    const el = found[p.name];
    if (!el) { out[p.name] = null; continue; }
    const cs = getComputedStyle(el, p.pseudo || null);
    const list = (p.props || props).filter((x) => !(p.ignore || []).includes(x));
    const v = {};
    for (const k of list.filter((x) => !x.startsWith("rect."))) v[k] = cs.getPropertyValue(k).trim();
    const r = el.getBoundingClientRect();
    const rel = p.rel && found[p.rel] ? found[p.rel].getBoundingClientRect() : null;
    const rect = { width: r.width, height: r.height, x: rel ? r.x - rel.x : null, y: rel ? r.y - rel.y : null, right: rel ? rel.right - r.right : null };
    /* box geometry: not for pseudo elements (the rect is the host's); with an explicit props list only the
       rect.* keys it names */
    const wantRect = (k) => !p.pseudo && !(p.ignore || []).includes("rect." + k) && (!p.props || p.props.includes("rect." + k));
    for (const k of [...rectProps, "right"]) if (wantRect(k) && rect[k] !== null && rect[k] !== undefined) v["rect." + k] = Math.round(rect[k] * 100) / 100;
    if (!p.pseudo) v["text"] = (el.innerText || "").trim().replace(/\s+/g, " ").slice(0, 40);
    out[p.name] = v;
  }
  const tokens = {};
  if (tokenPrefixes?.length) {
    const rs = getComputedStyle(document.documentElement);
    for (let i = 0; i < rs.length; i++) { const k = rs[i]; if (k.startsWith("--") && tokenPrefixes.some((t) => k.startsWith(t))) tokens[k] = rs.getPropertyValue(k).trim(); }
  }
  return { out, tokens };
};

const DUMPFN = (sel) => {
  const vis = (el) => { const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden") return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const root = [...document.querySelectorAll(sel)].find(vis);
  if (!root) return "no visible match for " + sel;
  const lines = [];
  const walk = (el, d) => {
    if (d > 9) return;
    if (!vis(el)) { if (getComputedStyle(el).display === "contents") [...el.children].forEach((c) => walk(c, d)); return; }
    const r = el.getBoundingClientRect();
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue.trim()).join(" ").slice(0, 40);
    lines.push(`${"  ".repeat(d)}${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${el.classList.length ? "." + [...el.classList].join(".") : ""} ${Math.round(r.width)}×${Math.round(r.height)}${own ? "  «" + own + "»" : ""}`);
    if (lines.length > 400) return;
    [...el.children].forEach((c) => walk(c, d + 1));
  };
  walk(root, 0);
  return lines.join("\n");
};

const num = (s) => { const m = String(s).match(/^-?\d+(\.\d+)?(px)?$/); return m ? parseFloat(s) : null; };
const same = (x, y) => {
  if (x === y) return true;
  if (x == null || y == null) return false;
  const nx = typeof x === "number" ? x : num(x); const ny = typeof y === "number" ? y : num(y);
  if (nx !== null && ny !== null) return Math.abs(nx - ny) <= TOL;
  /* compound values (e.g. "8px 20px", radius 9999 vs 999) — compare number by number */
  const tx = String(x).split(/(-?\d*\.?\d+)/); const ty = String(y).split(/(-?\d*\.?\d+)/);
  if (tx.length !== ty.length) return false;
  return tx.every((t, i) => (i % 2 ? Math.abs(parseFloat(t) - parseFloat(ty[i])) <= TOL || (parseFloat(t) >= 999 && parseFloat(ty[i]) >= 999) : t === ty[i]));
};

try {
  if (TRACE) {
    for (const vp of VIEWPORTS) {
      await open(A, vp);
      const lines = await evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(TRACE)})].find((n) => n.getBoundingClientRect().width > 0); if (!el) return ["no visible match"]; const out = []; for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const cs = getComputedStyle(n); out.push(n.tagName.toLowerCase() + (n.id ? "#" + n.id : "") + (n.classList.length ? "." + [...n.classList].slice(0, 3).join(".") : "") + "  " + ${JSON.stringify(TRACE_PROPS)}.map((k) => k + ": " + cs.getPropertyValue(k)).join(" · ")); } return out; })()`);
      console.log(`## ${A} @${vp.width}  ${TRACE}\n` + lines.join("\n"));
    }
  } else if (DUMP) {
    for (const vp of VIEWPORTS) {
      await open(A, vp);
      console.log(`## ${A} @${vp.width}  ${DUMP}\n` + await evaluate(`(${DUMPFN})(${JSON.stringify(DUMP)})`));
    }
  } else {
    const spec = JSON.parse(fs.readFileSync(SPEC, "utf8"));
    const report = [];
    let totalDiffs = 0;
    for (const vp of VIEWPORTS) {
      /* group pairs by the reference state they read (default --a) */
      const bySide = { a: {}, b: {} };
      const statesA = [...new Set(spec.pairs.map((p) => p.states?.a || A))];
      const statesB = [...new Set(spec.pairs.map((p) => p.states?.b || B))];
      const tokens = {};
      for (const [side, list] of [["a", statesA], ["b", statesB]]) {
        for (const st of list) {
          await open(st, vp);
          const pairs = spec.pairs.filter((p) => (p.states?.[side] || (side === "a" ? A : B)) === st);
          /* rel targets must be measured in the same page → include them */
          const names = new Set(pairs.map((p) => p.name)); pairs.forEach((p) => p.rel && names.add(p.rel));
          const use = spec.pairs.filter((p) => names.has(p.name));
          const res = await evaluate(`(${MEASURE})(${JSON.stringify(use)}, ${JSON.stringify(side)}, ${JSON.stringify(DEFAULT_PROPS)}, ${JSON.stringify(RECT_PROPS)}, ${JSON.stringify(spec.tokens || [])})`);
          for (const p of pairs) bySide[side][p.name] = res.out[p.name];
          tokens[side] = { ...(tokens[side] || {}), ...res.tokens };
        }
      }
      const rows = [];
      for (const p of spec.pairs) {
        const a = bySide.a[p.name]; const b = bySide.b[p.name];
        if (!a || !b) { rows.push([p.name, "(element)", a ? "found" : "MISSING", b ? "found" : "MISSING"]); continue; }
        for (const k of Object.keys(a)) {
          if (k === "text") continue;
          if ((p.ignore || []).includes(k)) continue;
          if (!same(a[k], b[k])) rows.push([p.name, k, a[k], b[k]]);
        }
      }
      const tokRows = [];
      if (spec.tokens?.length) for (const k of Object.keys(tokens.a || {})) if (k in (tokens.b || {}) && !same(tokens.a[k], tokens.b[k])) tokRows.push(["token", k, tokens.a[k], tokens.b[k]]);
      /* documented, page-level differences (spec.expected: { viewport?, name, prop, why }) are listed apart
         and not counted — every one needs a reason in the spec */
      const isExpected = (r) => (spec.expected || []).find((e) => (!e.viewport || e.viewport === vp.width) && e.name === r[0] && e.prop === r[1]);
      const expectedRows = rows.filter(isExpected).map((r) => [...r, isExpected(r).why]);
      const all = [...rows.filter((r) => !isExpected(r)), ...tokRows];
      totalDiffs += all.length;
      const table = all.length ? ["| element | property | reference (a) | copy (b) |", "|---|---|---|---|", ...all.map((r) => `| ${r.map((c) => String(c).replace(/\|/g, "\\|")).join(" | ")} |`)].join("\n") : "(no differences)";
      const head = `## ${vp.width}px — a: ${statesA.join(", ")} · b: ${statesB.join(", ")} — ${all.length} difference(s)`;
      const expTable = expectedRows.length ? "\nDocumented differences (not counted):\n" + ["| element | property | reference (a) | copy (b) | why |", "|---|---|---|---|---|", ...expectedRows.map((r) => `| ${r.map((c) => String(c).replace(/\|/g, "\\|")).join(" | ")} |`)].join("\n") : "";
      console.log(head + "\n" + table + expTable + "\n");
      report.push({ viewport: vp.width, a: bySide.a, b: bySide.b, diffs: all, expected: expectedRows });
    }
    if (OUT) { fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(report, null, 1)); }
    console.log(`TOTAL ${totalDiffs} difference(s)`);
  }
} catch (e) {
  console.error("compare-styles:", e.message);
  process.exitCode = 1;
}
ws.close(); chrome.kill();
process.exit(process.exitCode || 0);
