// UI QA — staging vs prototype, measured (not screenshots).
// For every screen pair in the spec it opens the developers' build (staging, READ-ONLY) and our demo state at each
// viewport, finds the same elements on both sides by role + accessible name / visible text (through shadow DOM),
// measures them (box, padding, border, radius, colours, type, icon, alignment, vertical rhythm), runs the design
// rules on staging alone (component-audit's own in-page rules via lib/ca-adapter.mjs + a shadow-aware size / icon
// / hover / focus / menu pass), moves a real mouse over every interactive element, walks the Tab order, measures
// open menus / dialogs / tooltips, and writes report.md + report.json + side-by-side crops per finding.
//
//   node --experimental-websocket --no-warnings tools/ui-qa/staging-compare/run.mjs \
//     --spec tools/ui-qa/staging-compare/rap.json [--viewports 1440,375] [--out tools/ui-qa/out/staging-compare/rap-<date>]
//     [--only list,search] [--baseline <previous report.json>] [--no-hover] [--no-focus] [--max-hover 40] [--note "<text>"]
//   Probe (to write a spec): … run.mjs --spec rap.json --probe staging:/registry/X | ours:rap-02 [--steps '<json>']
//     [--viewports 375] [--dump "<scope css>"]  → prints the collected keys (and a DOM tree with --dump), saves a PNG.
//
// READ-ONLY on staging: every non-GET request is blocked in the browser (Fetch domain) and listed in the report;
// clicks on controls whose name looks like a write (Trimite, Salvează, Șterge, Raportează, Permite toate…) are refused.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { launch, sleep } from "./lib/cdp.mjs";
import { PAGE_SC } from "./lib/page.mjs";
import { READ_TOKENS, tokenIndex, docScale } from "./lib/tokens.mjs";
import { componentAuditSource, auditSpecNumbers, PORTABLE_RULES } from "./lib/ca-adapter.mjs";

const SELF = fileURLToPath(import.meta.url);
process.chdir(path.resolve(path.dirname(SELF), "../../.."));
const ARGV = process.argv.slice(2);
const has = (n) => ARGV.includes("--" + n);
const arg = (n, d) => { const i = ARGV.indexOf("--" + n); return i > -1 && ARGV[i + 1] !== undefined && !/^--[a-z]/.test(ARGV[i + 1]) ? ARGV[i + 1] : d; };
const SPEC_PATH = arg("spec", "tools/ui-qa/staging-compare/rap.json");
const spec = JSON.parse(fs.readFileSync(SPEC_PATH, "utf8"));
const today = new Date().toISOString().slice(0, 10);
const OUT = arg("out", `tools/ui-qa/out/staging-compare/${spec.id || "run"}-${today}`);
const VIEWPORTS = (arg("viewports", (spec.viewports || [1440, 375]).join(","))).split(",").map(Number);
const ONLY = (arg("only", "") || "").split(",").filter(Boolean);
const BASELINE = arg("baseline", "");
const HOVER = !has("no-hover"); const FOCUS = !has("no-focus");
const MAX_HOVER = Number(arg("max-hover", "40"));
const TOL = 0.5;
const PROBE = arg("probe", "");
const DENY = new RegExp(spec.readOnly?.denyNames || "trimite|salveaz|sterge|șterge|elimin|raporteaz|semnaleaz|feedback|trimitere|plat|achit|permite toate|doar necesare|gestioneaz|accept|confirm|intra in cabinet|intră în cabinet|obtine semnatura|obține semnătura|autentific|login|logout|submit|send|delete|save", "i");
const vpOf = (w) => ({ width: w, height: w > 760 ? 900 : 812, mobile: w <= 760, scale: 1, phone: w <= 760 });
const NUM = auditSpecNumbers();
setTimeout(() => { console.error("staging-compare: global timeout (60 min)"); process.exit(3); }, 60 * 60 * 1000).unref();

/* ============================================================================================ browser */
const S = await launch();
const blocked = []; const allowedPosts = [];
/* read-only guard: only GET / HEAD / OPTIONS leave the browser, plus the read QUERIES the spec names
   (spec.readOnly.allowPost: URL substrings, e.g. the register's search endpoint, which is a POST that reads).
   A screen can set "blockQueries": true to cut those too (= the staging error state, nothing is written either way). */
let ALLOW_POST = spec.readOnly?.allowPost || [];
await S.send("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });
S.on((m) => {
  if (m.method !== "Fetch.requestPaused") return;
  const { requestId, request } = m.params;
  if (/^(GET|HEAD|OPTIONS)$/.test(request.method)) S.send("Fetch.continueRequest", { requestId });
  else if (request.method === "POST" && ALLOW_POST.some((u) => request.url.includes(u))) { allowedPosts.push(request.url.slice(0, 120)); S.send("Fetch.continueRequest", { requestId }); }
  else { blocked.push(`${request.method} ${request.url.slice(0, 160)}`); S.send("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" }); }
});
const ev = (expr) => S.evaluate(expr);
/* always the files on disk (ours changes between runs; never a cached pager.css) */
await S.send("Network.setCacheDisabled", { cacheDisabled: true });
const PAGE_SRC = `(${PAGE_SC.toString()})({})`;
const CA = { phone: componentAuditSource(spec.componentAudit || {}, true), desktop: componentAuditSource(spec.componentAudit || {}, false) };
let CUR_VP = null;
const STYLE_CSS = (extra) => `(() => { const s = document.head.appendChild(document.createElement("style")); s.id = "staging-compare-css"; s.textContent = ${JSON.stringify("*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important} " + (extra || ""))}; return true; })()`;

const waitStable = async (ms = 900, max = 15000) => {
  let last = -1, stableFor = 0; const t0 = Date.now();
  while (Date.now() - t0 < max) {
    const n = await ev("document.querySelectorAll('*').length + ':' + (document.body ? document.body.innerText.length : 0)").catch(() => "x");
    if (n === last) { stableFor += 250; if (stableFor >= ms) return true; } else { stableFor = 0; last = n; }
    await sleep(250);
  }
  return false;
};
const inject = async (side) => {
  await ev(STYLE_CSS(side === "staging" ? spec.staging.hideCss : spec.ours.hideCss));
  await ev(PAGE_SRC);
  await ev((CUR_VP && CUR_VP.phone ? CA.phone : CA.desktop).expr);
};
const stagingUrl = (u) => /^https?:/.test(u) ? u : spec.staging.base.replace(/\/$/, "") + (u.startsWith("/") ? u : "/" + u);
const loadStaging = async (url) => {
  await S.navigate(stagingUrl(url));
  const ready = spec.staging.ready || "main h1";
  let ok = false;
  for (let i = 0; i < 100 && !ok; i++) { await sleep(250); ok = await ev(`(() => { try { return !!document.querySelector(${JSON.stringify(ready)}) || !!document.querySelector("main .rap-page, main [class*=empty]"); } catch (e) { return false; } })()`).catch(() => false); }
  await waitStable(1200, 20000);
  await inject("staging");
  await sleep(spec.staging.settle || 400);
  return ok;
};
const loadOurs = async (state) => {
  await S.navigate(`${spec.ours.base}/${spec.ours.page}?state=${encodeURIComponent(state)}`);
  let ds = "";
  for (let i = 0; i < 240 && !ds; i++) { await sleep(150); const v = await ev("document.documentElement.dataset.demoState || ''").catch(() => ""); if (v === state || v === state + ":error") ds = v; }
  await sleep(900);
  await inject("ours");
  await ev(`(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); return true; })()`);
  await sleep(150);
  return ds && !/:error/.test(ds);
};

/* scripted, read-only steps: click / type / key / wait / waitFor / hover / scroll; `vp: "phone" | "desktop"` limits a step */
const runSteps = async (steps, vp, side) => {
  for (const st of steps || []) {
    if (st.vp === "phone" && !vp.phone) continue;
    if (st.vp === "desktop" && vp.phone) continue;
    if (st.wait) { await sleep(st.wait); continue; }
    if (st.waitFor) { let ok = false; for (let i = 0; i < (st.timeout || 12000) / 200 && !ok; i++) { ok = await ev(`!!window.__sc.$(${JSON.stringify(st.waitFor)})`); if (!ok) await sleep(200); } if (!ok) throw new Error(`${side}: waitFor ${st.waitFor} timed out`); continue; }
    /* keyboard focus: Tab until the focus is inside the target (real :focus-visible) */
    if (st.tabTo) {
      await ev("window.__sc.blur(); true"); await S.mouse("mousePressed", 1, 1); await S.mouse("mouseReleased", 1, 1);
      let ok = false;
      for (let i = 0; i < (st.max || 80) && !ok; i++) { await S.key("Tab", "Tab", 9); await sleep(80); ok = await ev(`(() => { const t = window.__sc.$(${JSON.stringify(st.tabTo)}); const f = window.__sc.focusedItem ? (() => { let a = document.activeElement; while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement; return a; })() : null; if (!t || !f) return false; for (let x = f; x; x = x.parentElement || (x.getRootNode() instanceof ShadowRoot ? x.getRootNode().host : null)) if (x === t) return true; return false; })()`); }
      if (!ok && !st.optional) throw new Error(`${side}: tabTo ${st.tabTo} never got the focus`);
      await sleep(st.after ?? 300); continue;
    }
    if (st.key) { await S.key(st.key, st.key, { Enter: 13, Escape: 27, Tab: 9, ArrowDown: 40, ArrowUp: 38 }[st.key] || 0); await sleep(st.after ?? 400); continue; }
    const sel = st.click || st.hover || st.scroll || st.into || st.focus;
    if (sel) {
      let p = null;
      for (let i = 0; i < (st.timeout || 12000) / 250 && !p; i++) {
        p = await ev(`(() => { const el = window.__sc.$(${JSON.stringify(sel)}); if (!el) return null; el.scrollIntoView({ block: "center", inline: "nearest" }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, name: window.__sc.accName(el).slice(0, 80) }; })()`);
        if (!p) await sleep(250);
      }
      if (!p && st.optional) continue;
      if (!p) throw new Error(`${side}: no visible element for ${sel}`);
      if (st.click && side === "staging" && DENY.test(p.name) && !st.allowName) throw new Error(`read-only guard: refused to click „${p.name}” (${sel})`);
      await sleep(80);
      if (st.click) await S.click(p.x, p.y);
      else if (st.hover) await S.mouse("mouseMoved", p.x, p.y);
      else if (st.into || st.focus) await S.click(p.x, p.y);
    }
    if (st.type !== undefined) { await S.send("Input.insertText", { text: st.type }); }
    await sleep(st.after ?? (st.click ? 700 : 300));
    if (side === "staging") await waitStable(600, 8000);
  }
  /* steps may navigate (Blazor routes keep the document; a reload drops the library) */
  if (!(await ev("!!window.__sc").catch(() => false))) await inject(side);
};

/* ============================================================================================ measuring one side */
const measureSide = async (side, screen, vp, shotDir) => {
  const cfg = screen[side];
  const scope = cfg.scope || spec[side].scope || "main";
  const ignore = [cfg.ignore, spec[side].ignore].filter(Boolean).join(", ");
  const items = await ev(`window.__sc.collect(${JSON.stringify(scope)}, ${JSON.stringify(ignore)})`) || [];
  /* per-pair overrides: { key, kind?, staging: css | "text:…", ours: … } → that element under that key (searched inside the scope) */
  for (const m of screen.match || []) {
    const sel = m[side]; if (!sel) continue;
    const i = await ev(`(() => { const el = window.__sc.pick(${JSON.stringify(sel)}, ${JSON.stringify(scope)}, ${JSON.stringify(m.kind || "control")}); if (!el) return -1; window.__scItems = window.__scItems.filter((x) => x.key !== ${JSON.stringify(m.key)} && x.el !== el); window.__scItems.push({ key: ${JSON.stringify(m.key)}, kind: ${JSON.stringify(m.kind || "control")}, el }); return window.__scItems.length - 1; })()`);
    if (i < 0) console.log(`   ${side}: match override „${m.key}” found nothing for ${sel}`);
  }
  const list = await ev(`window.__scItems.map((it, i) => ({ i, key: it.key, kind: it.kind }))`);
  const cl = await ev("window.__sc.contentLeft()");
  const measures = {};
  for (const it of list) { const m = await ev(`window.__sc.measure(${it.i}, ${cl})`).catch(() => null); if (m) measures[it.key] = { ...m, i: it.i }; }
  const scroll = await ev("window.__sc.scrollInfo()");
  const surfaces = await ev("window.__sc.surfaces()") || [];
  /* component-audit's own rules (portable subset), on the light DOM */
  const ca = await ev(`window.__ca ? window.__ca.audit(${JSON.stringify(scope)}, "") : null`).catch(() => null);
  const caFindings = (ca?.findings || []).filter((f) => PORTABLE_RULES.includes(f.rule));
  /* evidence: one crop per measured element (scrolled into view; inner scroll areas included) + the viewport */
  const dir = path.join(shotDir, `${screen.id}-${vp.width}-${side}`); fs.mkdirSync(dir, { recursive: true });
  const crops = {};
  const PAD = 12;
  const cropOf = async (file, rectExpr) => {
    const r = await ev(rectExpr); if (!r || r.w < 1 || r.h < 1) return null;
    const clip = { x: Math.max(0, r.x - PAD), y: Math.max(0, r.y - PAD), width: Math.min(r.w + PAD * 2, 1600), height: Math.min(r.h + PAD * 2, 1200) };
    return (await S.shot(file, clip)) ? { file: path.relative(OUT, file), hl: { x: r.x - clip.x, y: r.y - clip.y, w: r.w, h: r.h } } : null;
  };
  await ev("window.scrollTo(0, 0)");
  const shot = path.join(dir, "_viewport.png");
  await S.shot(shot, { x: 0, y: 0, width: vp.width, height: vp.height });
  let n = 0;
  for (const it of list.filter((x) => measures[x.key] && !/^(cell|icon|row)$/.test(x.kind)).slice(0, 160)) {
    crops[it.key] = await cropOf(path.join(dir, `${String(++n).padStart(3, "0")}.png`), `(() => { const it = window.__scItems[${it.i}]; if (!it || !it.el.isConnected) return null; it.el.scrollIntoView({ block: "center", inline: "nearest" }); const t = it.kind === "field" ? it.el : window.__sc.paintTarget(it.el); const r = t.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; })()`);
  }
  for (const [k, s] of surfaces.entries()) crops[`surface:${s.kind}${k ? k : ""}`] = await cropOf(path.join(dir, `surface-${k}.png`), `(() => { const r = ${JSON.stringify(s.rect)}; return { x: r.x, y: r.y, w: r.w, h: r.h }; })()`);
  await ev("window.scrollTo(0, 0)");
  /* hover: real mouse on every interactive element */
  const hover = {};
  /* hover is a desktop concept: phones (touch emulation) never hover — the pass runs on desktop viewports only */
  if (HOVER && !vp.mobile) {
    const targets = list.filter((it) => /^(control|option|field|crumb|row)$/.test(it.kind)).slice(0, MAX_HOVER);
    for (const it of targets) {
      await S.mouse("mouseMoved", 1, 1); await sleep(60);
      const c = await ev(`window.__sc.centre(${it.i})`); if (!c || c.disabled) continue;
      await sleep(120);
      const cover = await ev(`window.__sc.coverAt(${it.i}, ${c.x}, ${c.y})`);
      if (cover) { hover[it.key] = { covered: cover }; continue; }
      const before = await ev(`(() => { const it = window.__scItems[${it.i}]; return { snap: window.__sc.snap(it.el), look: window.__sc.look(it.el) }; })()`);
      await S.mouse("mouseMoved", c.x, c.y); await sleep(280);
      const after = await ev(`(() => { const it = window.__scItems[${it.i}]; return { snap: window.__sc.snap(it.el), look: window.__sc.look(it.el), cursor: window.__sc.cursorAt(${c.x}, ${c.y}) }; })()`);
      if (!before || !after) continue;
      const changed = Object.keys(after.look).filter((k) => k !== "cursor" && after.look[k] !== before.look[k]);
      hover[it.key] = { visible: before.snap !== after.snap, changed, before: before.look, after: after.look, cursor: after.cursor };
    }
    await S.mouse("mouseMoved", 1, 1);
  }
  /* focus: Tab through the page, record order + visible focus look */
  const focus = { order: [], items: {} };
  if (FOCUS) {
    const base = await ev(`(() => { const o = {}; window.__scItems.forEach((it, i) => { if (/^(control|field|crumb)$/.test(it.kind)) o[i] = window.__sc.snap(it.el); }); return o; })()`);
    await ev("window.__sc.blur(); window.scrollTo(0, 0); true");
    await S.mouse("mousePressed", 1, 1); await S.mouse("mouseReleased", 1, 1);
    let lastName = ""; let same = 0;
    for (let t = 0; t < (spec.maxTabs || 60); t++) {
      await S.key("Tab", "Tab", 9); await sleep(120);
      const f = await ev("window.__sc.focusedItem()");
      if (!f) continue;
      const sig = f.name + f.rect.x + f.rect.y; if (sig === lastName) { if (++same > 2) break; } else same = 0; lastName = sig;
      if (f.key && !focus.items[f.key]) {
        const look = await ev("window.__sc.focusLook()");
        const nowSnap = f.i > -1 ? await ev(`window.__sc.snap(window.__scItems[${f.i}].el)`) : "";
        focus.items[f.key] = { look, changed: base[f.i] !== undefined ? base[f.i] !== nowSnap : null };
        focus.order.push(f.key);
      }
    }
    await ev("window.__sc.blur()");
  }
  return { items: list, measures, scroll, surfaces, caFindings, shot, crops, hover, focus };
};

/* ============================================================================================ rules + diff */
const num = (s) => { const m = String(s).match(/^-?\d+(\.\d+)?(px)?$/); return m ? parseFloat(s) : null; };
const layers = (v) => String(v).split(/,(?![^(]*\))/).map((x) => x.trim()).sort().join(", ");
const same = (a, b) => {
  if (a === b) return true; if (a == null || b == null) return false;
  if (/\)\s*-?\d/.test(String(a)) && String(a).includes("rgba") && String(b).includes(",")) { const la = layers(a), lb = layers(b); if (la === lb) return true; if (la !== String(a) || lb !== String(b)) return same(la, lb); }
  const x = typeof a === "number" ? a : num(a), y = typeof b === "number" ? b : num(b);
  if (x !== null && y !== null) return Math.abs(x - y) <= TOL;
  const ta = String(a).replace(/\s+/g, " ").split(/(-?\d*\.?\d+)/), tb = String(b).replace(/\s+/g, " ").split(/(-?\d*\.?\d+)/);
  if (ta.length !== tb.length) return false;
  return ta.every((t, i) => (i % 2 ? Math.abs(parseFloat(t) - parseFloat(tb[i])) <= TOL || (parseFloat(t) >= 999 && parseFloat(tb[i]) >= 999) : t === tb[i]));
};
const painted = (m) => !!m.painted;
const hasText = (key) => !/@icon/.test(key);
/* fold per-side values into one property each (fewer, clearer rows); layout internals are dropped */
const pxs = (list) => { const v = list.map((x) => x ?? "0px"); return v.every((x) => x === v[0]) ? v[0] : v.join(" "); };
function normalise(m) {
  const v = m.v; if (v.__n) return; v.__n = true;
  if ("padding-top" in v) { v.padding = pxs([v["padding-top"], v["padding-right"], v["padding-bottom"], v["padding-left"]]); for (const k of ["padding-top", "padding-right", "padding-bottom", "padding-left"]) delete v[k]; }
  if ("border-top-left-radius" in v) { v.radius = pxs([v["border-top-left-radius"], v["border-bottom-right-radius"]]); delete v["border-top-left-radius"]; delete v["border-bottom-right-radius"]; }
  delete v["align-items"]; delete v["justify-content"];
  if (!(m.kind === "control" && v["icon.size"] && v["font-size"])) delete v.gap; /* gap = icon ↔ label only */
  delete v.__n; Object.defineProperty(v, "__n", { value: true, enumerable: false });
}
/* design rules on one measured element → list of { rule, prop, msg } */
const rulesFor = (m, vp, tokens) => {
  const out = []; const v = m.v; const phone = vp.phone;
  const H = Math.round((v.h || 0) * 10) / 10;
  if (m.kind === "field") {
    const want = phone ? NUM.size.phone.height : NUM.size.desktop.height;
    if (H <= 72 && Math.abs(H - want) > TOL) out.push({ rule: phone ? "field-height-phone" : "field-height-desktop", prop: "h", msg: `field ${H}px, rule ${want}px` });
    if (v["icon.size"]) { const s = parseFloat(v["icon.size"]); const iw = NUM.size.icon[String(H >= 46 ? 48 : H >= 38 ? 40 : 32)]; if (iw && Math.abs(s - iw) > TOL) out.push({ rule: "field-icon-size", prop: "icon.size", msg: `icon ${s}px in a ${H}px field, rule ${iw}px` }); }
  }
  if (m.kind === "fieldtext" && phone) {
    if (Math.abs(parseFloat(v["font-size"]) - NUM.size.phone.font) > TOL) out.push({ rule: "field-text-phone", prop: "font-size", msg: `${v["font-size"]}, rule ${NUM.size.phone.font}px on phones` });
    if (v["placeholder-size"] && Math.abs(parseFloat(v["placeholder-size"]) - NUM.size.phone.font) > TOL) out.push({ rule: "field-text-phone", prop: "placeholder-size", msg: `placeholder ${v["placeholder-size"]}, rule ${NUM.size.phone.font}px` });
  }
  if (m.kind === "control" && painted(m) && H < 60) {
    /* chips (filter / facet triggers): the documented chip heights (RAP compact chips 36 — components.md › Facet filter · RAP options) */
    const heights = m.chip ? (spec.rules?.chipHeights || [32, 36, 40, 48]) : NUM.buttons.heights;
    if (!heights.some((h) => Math.abs(h - H) <= TOL)) out.push({ rule: m.chip ? "chip-size" : "button-size", prop: "h", msg: `${H}px, rule ${heights.join(" / ")}` });
    else if (v["icon.size"]) { const s = Math.max(...v["icon.size"].split("×").map(Number)); const want = NUM.buttons.icon[String(NUM.buttons.heights.find((h) => Math.abs(h - H) <= TOL))]; if (want && Math.abs(s - want) > TOL) out.push({ rule: "button-icon-size", prop: "icon.size", msg: `icon ${s}px in a ${H}px button, rule ${want}px` }); }
  }
  if (m.kind === "tag" && Math.abs(H - NUM.tags.height) > TOL) out.push({ rule: "tag-size", prop: "h", msg: `${H}px, rule ${NUM.tags.height}px (Tag Small)` });
  if (v["icon.stroke"] != null && Math.abs(v["icon.stroke"] - 1.5) > 0.05 && v["icon.paint"] === "stroke") out.push({ rule: "icon-stroke", prop: "icon.stroke", msg: `stroke ${v["icon.stroke"]}, rule 1.5` });
  if (m.kind === "control" && hasText(m.key) && v["icon.colour"] && v.color && v["icon.paint"] !== "none" && v["icon.colour"].replace(/\s/g, "") !== v.color.replace(/\s/g, "")) out.push({ rule: "icon-colour", prop: "icon.colour", msg: `icon ${tokens.label("icon", v["icon.colour"])} ≠ label ${tokens.label("color", v.color)}` });
  /* tokens only: colours / spacing / radius / type that are not a Foundations value */
  const edgeColour = /(rgba?\([^)]*\))/.exec(v.edge || "");
  if (edgeColour && !tokens.lookup("border-color", edgeColour[1]).known) out.push({ rule: "off-token", prop: "edge", msg: `${edgeColour[1]} is not a Foundations colour` });
  for (const p of ["color", "background-color", "padding", "gap", "radius", "font-size", "line-height"]) {
    if (v[p] === undefined) continue;
    if (p === "gap" && v.gap === "normal") continue;
    const t = tokens.lookup(p, v[p]);
    if (!t.known) out.push({ rule: "off-token", prop: p, msg: `${v[p]} is not a Foundations token value` });
  }
  return out;
};
/* properties whose difference is data, not design */
const skipProp = (key, kind, prop, a, b) => {
  if (prop === "w" && (kind === "text" || kind === "value" || kind === "tag" || kind === "row" || /^cell:.*:(text|control)/.test(key) || (kind === "control" && hasText(key) && !/^control:/.test(key)))) return true;
  if (prop === "w" && kind === "control" && /^control:/.test(key) && hasText(key)) return false;
  if (prop === "h" && (kind === "value" || /^cell:[^:]+$/.test(key) || kind === "row") && Math.abs(a - b) > 12) return true; /* one vs two lines of data */
  if (prop === "x" && /^cell:/.test(key)) return false;
  if (prop === "centre-dy" && (kind === "text" || kind === "value")) return true;
  if (prop === "cursor") return true; /* reported by the hover pass (real pointer) */
  if (prop === "w" && /^(heading|table)$/.test(kind)) return true; /* a text block's width, not a box */
  if (prop === "x" && kind === "fieldtext") return true; /* → text-start */
  if (/^(h|w)$/.test(prop) && kind === "table") return true; /* data length */
  return false;
};

const fid = (...parts) => "SC-" + crypto.createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 8);

/* ============================================================================================ probe mode */
if (PROBE) {
  const vp = vpOf(VIEWPORTS[0]); CUR_VP = vp;
  await S.viewport(vp);
  const [side, target] = [PROBE.split(":")[0], PROBE.slice(PROBE.indexOf(":") + 1)];
  if (has("block-queries")) ALLOW_POST = [];
  if (side === "staging") await loadStaging(target); else await loadOurs(target);
  await runSteps(JSON.parse(arg("steps", "[]")), vp, side);
  const scope = arg("scope", spec[side].scope || "main");
  const items = await ev(`window.__sc.collect(${JSON.stringify(scope)}, ${JSON.stringify(spec[side].ignore || "")})`);
  console.log(`${side} ${target} @${vp.width} — ${items.length} items in ${scope}`);
  for (const it of items) console.log(`  ${it.kind.padEnd(9)} ${it.key}   «${it.name}»`);
  console.log("surfaces", JSON.stringify(await ev("window.__sc.surfaces()")));
  console.log("scroll", JSON.stringify(await ev("window.__sc.scrollInfo()")), "url", await ev("location.href"));
  const D = arg("dump", "");
  if (D) console.log(await ev(`(() => { const S = window.__sc; const root = S.$(${JSON.stringify(D)}); if (!root) return "no match"; const L = []; const walk = (el, d) => { if (d > 16 || L.length > 500) return; const kids = [...(el.shadowRoot ? el.shadowRoot.children : []), ...el.children].filter((c) => !/^(STYLE|SCRIPT)$/.test(c.tagName)); if (getComputedStyle(el).display === "contents") { kids.forEach((c) => walk(c, d)); return; } if (!S.vis(el)) return; const r = el.getBoundingClientRect(); const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue.trim()).join(" ").slice(0, 40); L.push("  ".repeat(d) + el.tagName.toLowerCase() + (el.classList.length ? "." + [...el.classList].slice(0, 3).join(".") : "") + (el.getAttribute("role") ? "[role=" + el.getAttribute("role") + "]" : "") + (el.getAttribute("aria-label") ? "[" + el.getAttribute("aria-label").slice(0, 30) + "]" : "") + " " + Math.round(r.x) + "," + Math.round(r.y) + " " + Math.round(r.width) + "x" + Math.round(r.height) + (own ? " «" + own + "»" : "")); if (el.tagName.toLowerCase() === "svg") return; kids.forEach((c) => walk(c, d + 1)); }; walk(root, 0); return L.join("\\n"); })()`));
  const png = arg("png", path.join("tools/ui-qa/out/staging-compare", `probe-${side}-${vp.width}.png`));
  fs.mkdirSync(path.dirname(png), { recursive: true });
  const sc = await ev("window.__sc.scrollInfo()");
  await S.shot(png, { x: 0, y: 0, width: Math.min(sc.sw, 2400), height: Math.min(sc.sh, 5000) });
  console.log("png", png, "blocked", blocked.length ? blocked : "none", "console errors", S.consoleErrors.length);
  S.close(); process.exit(0);
}

/* ============================================================================================ main run */
fs.mkdirSync(path.join(OUT, "shots"), { recursive: true });
fs.mkdirSync(path.join(OUT, "crops"), { recursive: true });
let tokens = null;
const results = [];
const screens = spec.screens.filter((s) => !ONLY.length || ONLY.includes(s.id));
for (const screen of screens) {
  for (const w of screen.viewports || VIEWPORTS) {
    if (!VIEWPORTS.includes(w)) continue;
    const vp = vpOf(w); CUR_VP = vp;
    await S.viewport(vp);
    const t0 = Date.now();
    const rec = { screen: screen.id, title: screen.title, viewport: w, errors: [] };
    try {
      const okO = await loadOurs(screen.ours.state);
      if (!okO) rec.errors.push(`ours: state ${screen.ours.state} not ready`);
      if (!tokens) { const t = await ev(`(${READ_TOKENS})()`); t.raw = { ...docScale(fs.readFileSync(".claude/skills/design-system.md", "utf8")), ...t.raw }; tokens = tokenIndex(t); }
      await runSteps(screen.ours.steps, vp, "ours");
      rec.ours = await measureSide("ours", screen, vp, path.join(OUT, "shots"));
      rec.ours.url = await ev("location.href");
    } catch (e) { rec.errors.push("ours: " + e.message); }
    ALLOW_POST = screen.staging.blockQueries ? [] : (spec.readOnly?.allowPost || []);
    try {
      const okS = await loadStaging(screen.staging.url);
      if (!okS) rec.errors.push("staging: ready selector not found");
      await runSteps(screen.staging.steps, vp, "staging");
      rec.staging = await measureSide("staging", screen, vp, path.join(OUT, "shots"));
      rec.staging.url = await ev("location.href");
      rec.staging.consoleErrors = S.consoleErrors.splice(0).slice(0, 5);
    } catch (e) { rec.errors.push("staging: " + e.message); }
    rec.ms = Date.now() - t0;
    results.push(rec);
    console.log(`${screen.id} @${w}: staging ${rec.staging ? Object.keys(rec.staging.measures).length : "—"} · ours ${rec.ours ? Object.keys(rec.ours.measures).length : "—"} elements${rec.errors.length ? " · " + rec.errors.join(" · ") : ""} (${Math.round(rec.ms / 1000)} s)`);
    await sleep(spec.staging.delay || 800); /* be gentle with staging */
  }
}

/* ------------------------------------------------------------------------------------ findings */
const findings = [];
const add = (f) => { f.id = fid(f.screen, f.viewport, f.key, f.prop, f.rule || ""); if (!findings.some((x) => x.id === f.id)) findings.push(f); };
const STRUCT = /^(control|option|field|heading|colheader|crumb|tag)$/;
const gaps = (measures, keys) => {
  /* vertical rhythm: the gap to the nearest element above that overlaps horizontally, among ALL measured elements of
     that side; only kept when that neighbour is a matched element (else something unmatched sits between) */
  const out = {};
  const tableish = (k) => /^(cell:|col:|row:)/.test(k) || /::/.test(k);
  const all = Object.keys(measures).filter((k) => measures[k].rect && !tableish(k) && measures[k].kind !== "value");
  for (const k of keys) {
    if (tableish(k) || !measures[k].rect || measures[k].kind === "value") continue;
    const a = measures[k].rect;
    let best = null;
    for (const o of all) { if (o === k) continue; const r = measures[o].rect; const bottom = r.y + r.h; if (bottom > a.y + 0.5) continue; if (r.x >= a.x + a.w || a.x >= r.x + r.w) continue; if (!best || bottom > best.bottom + 0.5 || (Math.abs(bottom - best.bottom) <= 0.5 && r.w < best.w)) best = { k: o, bottom, w: r.w }; }
    if (best && keys.includes(best.k)) out[k] = { from: best.k, gap: Math.round((a.y - best.bottom) * 100) / 100 };
  }
  return out;
};
for (const rec of results) {
  const base = { screen: rec.screen, viewport: rec.viewport };
  const vp = vpOf(rec.viewport);
  if (!rec.staging || !rec.ours) { add({ ...base, key: "(screen)", prop: "load", severity: "Must fix", where: "screen", staging: rec.staging ? "ok" : rec.errors.join("; "), ours: rec.ours ? "ok" : rec.errors.join("; "), note: "screen could not be measured" }); continue; }
  const sM = rec.staging.measures, oM = rec.ours.measures;
  for (const M of [sM, oM]) for (const m of Object.values(M)) normalise(m);
  const both = Object.keys(sM).filter((k) => oM[k]);
  /* left edges: x is compared only for the first element of its line (later ones move with their neighbours) */
  const firstInLine = (M, k) => { const r = M[k].rect; return !Object.keys(M).some((o) => o !== k && !/^(cell:|row:|table)/.test(o) && !/::/.test(o) && both.includes(o) && M[o].rect && M[o].rect.x + M[o].rect.w <= r.x + 0.5 && M[o].rect.y < r.y + r.h && r.y < M[o].rect.y + M[o].rect.h); };
  /* page-level: horizontal overflow */
  if (rec.staging.scroll.sw > vp.width + 1) add({ ...base, key: "(page)", prop: "horizontal-overflow", rule: "no-overflow", severity: "Must fix", staging: `page ${rec.staging.scroll.sw}px wide on a ${vp.width}px screen`, ours: `${rec.ours.scroll.sw}px`, note: "the page scrolls sideways (the content is wider than the screen)" });
  /* elements that sit beyond the right edge of the screen (cut by a sideways scroller) */
  const beyond = (M) => Object.keys(M).filter((k) => M[k].rect && M[k].rect.x >= vp.width - 1 && !/:(text|icon)\d/.test(k));
  const bS = beyond(sM), bO = beyond(oM);
  if (bS.length > bO.length) add({ ...base, key: "(page)", prop: "off-screen", severity: vp.phone ? "Must fix" : "Should fix", rule: "no-overflow", staging: `${bS.length} elements start beyond the ${vp.width}px edge: ${bS.slice(0, 6).join(", ")}${bS.length > 6 ? "…" : ""}`, ours: bO.length ? `${bO.length}: ${bO.slice(0, 4).join(", ")}` : "none", note: "content only reachable by scrolling sideways" });
  /* matched pairs: measured diff */
  for (const k of both) {
    const s = sM[k], o = oM[k];
    const sRules = rulesFor(s, vp, tokens), oRules = rulesFor(o, vp, tokens);
    for (const prop of Object.keys(s.v)) {
      if (!(prop in o.v)) continue;
      const a = s.v[prop], b = o.v[prop];
      if (same(a, b) || skipProp(k, s.kind, prop, a, b)) continue;
      if (prop === "x" && !/^cell:/.test(k) && !(firstInLine(sM, k) && firstInLine(oM, k))) continue;
      if (prop === "cursor" && (a === "auto" || b === "auto") && !/^(control|crumb)$/.test(s.kind)) continue;
      const sBad = sRules.find((r) => r.prop === prop), oBad = oRules.find((r) => r.prop === prop);
      const severity = sBad ? "Must fix" : oBad ? "Prototype behind" : "Should fix";
      add({ ...base, key: k, kind: s.kind, prop, severity, rule: sBad?.rule || oBad?.rule || "", staging: tokens.label(prop, a), ours: tokens.label(prop, b), note: sBad ? sBad.msg : oBad ? `ours breaks ${oBad.rule}: ${oBad.msg}` : "" });
    }
    /* rule breaks on staging that are NOT a difference (same on both sides) are still Must fix on staging */
    for (const r of sRules) { if (!findings.some((f) => f.screen === rec.screen && f.viewport === rec.viewport && f.key === k && f.prop === r.prop)) add({ ...base, key: k, kind: s.kind, prop: r.prop, rule: r.rule, severity: "Must fix", staging: tokens.label(r.prop, s.v[r.prop]), ours: tokens.label(r.prop, o.v[r.prop]) + (oRules.some((x) => x.rule === r.rule && x.prop === r.prop) ? " (ours too)" : ""), note: r.msg }); }
    /* the same rule hit with the same value in the prototype = probably the rule, not staging: listed apart */
    for (const f of findings) if (f.screen === rec.screen && f.viewport === rec.viewport && f.key === k && f.severity === "Must fix" && / \(ours too\)$/.test(f.ours)) { f.severity = "Both sides"; f.note = "same value in the prototype — check the rule (" + f.note + ")"; }
  }
  /* rhythm */
  const gS = gaps(sM, both), gO = gaps(oM, both);
  for (const k of Object.keys(gS)) { const a = gS[k], b = gO[k]; if (!b || a.from !== b.from || same(a.gap, b.gap)) continue; add({ ...base, key: k, kind: sM[k].kind, prop: `gap-above (from ${a.from})`, severity: "Should fix", rule: "", staging: tokens.label("gap", a.gap + "px"), ours: tokens.label("gap", b.gap + "px"), note: "" }); }
  /* staging-only elements: rules too */
  for (const k of Object.keys(sM).filter((x) => !oM[x])) for (const r of rulesFor(sM[k], vp, tokens)) add({ ...base, key: k, kind: sM[k].kind, prop: r.prop, rule: r.rule, severity: "Must fix", staging: tokens.label(r.prop, sM[k].v[r.prop]), ours: "(no match)", note: r.msg });
  /* unmatched structure */
  const struct = (M, k) => STRUCT.test(M[k].kind) && !/#/.test(k) && (!/^cell:/.test(k) || /:(control\d|tag)$/.test(k));
  for (const k of Object.keys(sM).filter((x) => !oM[x] && struct(sM, x))) add({ ...base, key: k, kind: sM[k].kind, prop: "presence", severity: "Prototype behind", staging: "present", ours: "missing", note: "only on staging — new on staging, or named differently (add a match override)" });
  for (const k of Object.keys(oM).filter((x) => !sM[x] && struct(oM, x))) add({ ...base, key: k, kind: oM[k].kind, prop: "presence", severity: "Should fix", staging: "missing", ours: "present", note: "only in the prototype — missing on staging, or named differently (add a match override)" });
  /* labels (a text with a value next to it) only on one side = content drift: one finding per screen */
  const labels = (M) => Object.keys(M).filter((k) => k.startsWith("value:")).map((k) => k.slice(6)).filter((t) => !/#/.test(t));
  const lS = labels(sM), lO = labels(oM);
  const onlyS = lS.filter((t) => !oM["text:" + t]), onlyO = lO.filter((t) => !sM["text:" + t]);
  if (onlyS.length || onlyO.length) add({ ...base, key: "(labels)", prop: "field labels", severity: "Should fix", staging: onlyS.length ? "only here: " + onlyS.join(" · ") : "—", ours: onlyO.length ? "only here: " + onlyO.join(" · ") : "—", note: "label wording / set differs (normalised text; data values ignored)" });
  /* component-audit rules on staging (light DOM) */
  for (const f of rec.staging.caFindings) add({ ...base, key: `ca:${f.selector}`, prop: f.rule, rule: f.rule, severity: f.severity === "major" ? "Must fix" : "Should fix", staging: f.measured, ours: "", note: `component-audit: expected ${f.expected}` });
  /* hover */
  const hs = rec.staging.hover, ho = rec.ours.hover;
  const surfOpen = rec.staging.surfaces.length > 0;
  for (const k of Object.keys(hs)) {
    const a = hs[k], b = ho[k];
    if (a.covered) { if (!surfOpen) add({ ...base, key: k, kind: sM[k]?.kind, prop: "hover", rule: "covered", severity: "Must fix", staging: `covered by ${a.covered}`, ours: b?.covered ? `covered by ${b.covered}` : "reachable", note: "an invisible layer sits on the element: the mouse never reaches it" }); continue; }
    if (b && b.covered) continue;
    if (!a.visible && !/^(text|value)$/.test(sM[k]?.kind)) add({ ...base, key: k, kind: sM[k]?.kind, prop: "hover", rule: "hover-visible", severity: "Must fix", staging: "no visible change", ours: b ? (b.visible ? "changes " + (b.changed.join(", ") || "inner paint") : "no visible change (ours too)") : "(no match)", note: "every interactive element shows a visible hover" });
    const clickable = /^(control|option|crumb|row)$/.test(sM[k]?.kind || "");
    if (clickable && a.cursor && !/^(pointer|text)$/.test(a.cursor)) add({ ...base, key: k, kind: sM[k]?.kind, prop: "hover cursor", rule: "pointer", severity: "Must fix", staging: a.cursor, ours: b?.cursor || "", note: "any clickable element = cursor: pointer" });
    if (a.visible && b && b.visible) {
      for (const p of ["bg", "color", "border", "deco"]) if (!same(a.after[p], b.after[p]) && (a.changed.includes(p) || b.changed.includes(p))) add({ ...base, key: k, kind: sM[k]?.kind, prop: `hover ${p}`, severity: "Should fix", staging: tokens.label(p === "bg" ? "background-color" : p === "border" ? "border-top-color" : "color", a.after[p]), ours: tokens.label(p === "bg" ? "background-color" : p === "border" ? "border-top-color" : "color", b.after[p]), note: "the hover look differs" });
    }
  }
  /* focus: visible + order */
  const fs_ = rec.staging.focus, fo = rec.ours.focus;
  for (const k of Object.keys(fs_.items)) { const a = fs_.items[k]; if (a.look && a.look.by === "none" && a.changed === false) add({ ...base, key: k, kind: sM[k]?.kind, prop: "focus", rule: "focus-visible", severity: "Must fix", staging: "no visible focus", ours: fo.items[k] ? (fo.items[k].look?.by !== "none" || fo.items[k].changed ? `${fo.items[k].look?.by} ${fo.items[k].look?.value || ""}`.trim() : "none (ours too)") : "(not reached)", note: "keyboard focus must be visible" }); else if (fo.items[k] && a.look && fo.items[k].look && a.look.by !== fo.items[k].look.by) add({ ...base, key: k, kind: sM[k]?.kind, prop: "focus look", severity: "Should fix", staging: `${a.look.by} ${a.look.value || ""}`.trim(), ours: `${fo.items[k].look.by} ${fo.items[k].look.value || ""}`.trim(), note: "" }); }
  const common = fs_.order.filter((k) => fo.order.includes(k)); const ocommon = fo.order.filter((k) => fs_.order.includes(k));
  if (common.join(">") !== ocommon.join(">")) add({ ...base, key: "(tab order)", prop: "tab order", severity: "Should fix", staging: common.slice(0, 10).join(" → "), ours: ocommon.slice(0, 10).join(" → "), note: "the keyboard order of the elements both sides have differs" });
  /* open surfaces (menus, dialogs, sheets, tooltips) */
  const sS = rec.staging.surfaces, sO = rec.ours.surfaces;
  sS.forEach((s, i) => {
    const o = sO.find((x) => x.kind === s.kind) || null;
    const key = `surface:${s.kind}${i ? i : ""}`;
    if (s.clipped) add({ ...base, key, kind: "surface", prop: "clipped", rule: "menu-not-cut", severity: "Must fix", staging: `cut by ${s.clipped}`, ours: o ? (o.clipped ? `cut by ${o.clipped}` : "not cut") : "(none open)", note: "menus / dropdowns are never cut" });
    if (s.kind === "menu" && s.items) { const want = vp.phone ? 48 : 40; const bad = s.itemHeights.filter((h) => Math.abs(h - want) > TOL); if (bad.length) add({ ...base, key, kind: "surface", prop: "item height", rule: "dropdown-item-size", severity: "Must fix", staging: s.itemHeights.join(" / ") + "px", ours: o ? o.itemHeights.join(" / ") + "px" : "(none open)", note: `menu items ${want}px on ${vp.phone ? "phones (16/24 text)" : "desktop"}` }); }
    if (o) for (const p of ["radius", "shadow", "bg", "padding", "itemFont"]) if (!same(s[p], o[p])) add({ ...base, key, kind: "surface", prop: p, severity: "Should fix", staging: tokens.label(p === "radius" ? "border-top-left-radius" : p === "bg" ? "background-color" : p === "shadow" ? "box-shadow" : p, s[p]), ours: tokens.label(p === "radius" ? "border-top-left-radius" : p === "bg" ? "background-color" : p === "shadow" ? "box-shadow" : p, o[p]), note: "" });
    if (o && !same(s.rect.w, o.rect.w)) add({ ...base, key, kind: "surface", prop: "width", severity: "Should fix", staging: s.rect.w + "px", ours: o.rect.w + "px", note: "" });
    if (!o) add({ ...base, key, kind: "surface", prop: "presence", severity: "Prototype behind", staging: `${s.kind} open (${s.name})`, ours: "none open", note: "" });
  });
  sO.forEach((o, i) => { if (!sS.some((s) => s.kind === o.kind)) add({ ...base, key: `surface:${o.kind}${i ? i : ""}`, kind: "surface", prop: "presence", severity: "Should fix", staging: "none open", ours: `${o.kind} open (${o.name})`, note: "the same steps open nothing on staging" }); });
}

/* ------------------------------------------------------------------------------------ merge table repeats */
/* the same difference on several cells / column headers of one table = one finding (key cell:{a|b|c}) */
{
  const groups = new Map();
  for (const f of findings) {
    const m = /^(cell|col):([^:]+)(.*)$/.exec(f.key); if (!m) continue;
    const g = [f.screen, f.viewport, f.prop, f.staging, f.ours, f.severity, m[1], m[3]].join("|");
    if (!groups.has(g)) groups.set(g, []); groups.get(g).push(f);
  }
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const m0 = /^(cell|col):([^:]+)(.*)$/.exec(list[0].key);
    const keep = list[0];
    keep.key = `${m0[1]}:{${list.map((f) => /^(?:cell|col):([^:]+)/.exec(f.key)[1]).join(" | ")}}${m0[3]}`;
    keep.id = fid(keep.screen, keep.viewport, `${m0[1]}:*${m0[3]}`, keep.prop, keep.rule || "");
    for (const f of list.slice(1)) f.__drop = true;
  }
  for (let i = findings.length - 1; i >= 0; i--) if (findings[i].__drop) findings.splice(i, 1);
}

/* ------------------------------------------------------------------------------------ baseline */
let baseline = null;
if (BASELINE && fs.existsSync(BASELINE)) baseline = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
const prevIds = new Map((baseline?.findings || []).map((f) => [f.id, f]));
for (const f of findings) f.status = !baseline ? "" : prevIds.has(f.id) ? (prevIds.get(f.id).staging === f.staging ? "still open" : "still open (value changed)") : "new";
const fixed = baseline ? [...prevIds.values()].filter((f) => !findings.some((x) => x.id === f.id) && results.some((r) => r.screen === f.screen && r.viewport === f.viewport)) : [];

/* ------------------------------------------------------------------------------------ crops (side by side) */
const ORDER = { "Must fix": 0, "Should fix": 1, "Prototype behind": 2, "Both sides": 3 };
const SCREEN_ORDER = (id) => spec.screens.findIndex((x) => x.id === id);
findings.sort((a, b) => SCREEN_ORDER(a.screen) - SCREEN_ORDER(b.screen) || a.viewport - b.viewport || ORDER[a.severity] - ORDER[b.severity] || a.key.localeCompare(b.key));
{
  const groups = new Map();
  for (const f of findings) { const g = `${f.screen}|${f.viewport}|${f.key}`; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(f); }
  const cards = []; let n = 0;
  for (const [g, list] of groups) {
    const [scr, vw, key] = g.split("|"); const rec = results.find((r) => r.screen === scr && String(r.viewport) === vw); if (!rec) continue;
    const a = rec.staging?.crops?.[key], b = rec.ours?.crops?.[key]; if (!a && !b) continue;
    const file = `crops/${scr}-${vw}-${String(++n).padStart(3, "0")}.png`;
    list.forEach((f) => (f.crop = file));
    cards.push({ id: "c" + n, file, title: `${scr} @${vw} › ${key} — ${list.map((f) => f.prop).slice(0, 4).join(", ")}`, a, b });
  }
  if (cards.length) {
    const MAXW = 560, MAXH = 320;
    const pane = (c, label) => {
      if (!c) return `<div class="pane"><b>${label}</b><div class="none">no match</div></div>`;
      const src = pathToFileURL(path.resolve(OUT, c.file)).href;
      return `<div class="pane"><b>${label}</b><div class="crop"><img src="${src}" onload="const k=Math.min(${c.hl.w < 80 && c.hl.h < 60 ? 2 : 1},${MAXW}/this.naturalWidth,${MAXH}/this.naturalHeight);this.style.width=this.naturalWidth*k+'px';const h=this.nextElementSibling;h.style.left=${c.hl.x}*k+'px';h.style.top=${c.hl.y}*k+'px';h.style.width=${c.hl.w}*k+'px';h.style.height=${c.hl.h}*k+'px'"><div class="hl"></div></div></div>`;
    };
    const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;font:12px/16px -apple-system,sans-serif;background:#fff}.card{display:inline-flex;flex-direction:column;gap:6px;padding:10px;background:#fff}.t{font-weight:600;color:#333;max-width:1150px}.row{display:flex;gap:16px;align-items:flex-start}.pane{display:flex;flex-direction:column;gap:4px}.crop{position:relative;border:1px solid #ddd;line-height:0}.hl{position:absolute;outline:1px dashed #e5484d}.none{color:#999;padding:20px;border:1px dashed #ccc}</style>` +
      cards.map((c) => `<div class="card" id="${c.id}"><div class="t">${c.title.replace(/</g, "&lt;")}</div><div class="row">${pane(c.a, "staging")}${pane(c.b, "ours")}</div></div><br>`).join("");
    const gallery = path.resolve(OUT, "crops", "_gallery.html");
    fs.writeFileSync(gallery, html);
    await S.viewport({ width: 1200, height: 900, mobile: false, scale: 1 });
    await S.navigate(pathToFileURL(gallery).href);
    await sleep(2000);
    for (const c of cards) {
      const r = await ev(`(() => { const e = document.getElementById(${JSON.stringify(c.id)}); const r = e.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, width: Math.ceil(r.width), height: Math.ceil(r.height) }; })()`);
      await S.shot(path.join(OUT, c.file), r);
    }
  }
}

/* ------------------------------------------------------------------------------------ report */
const sevs = ["Must fix", "Should fix", "Prototype behind"];
const esc = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
/* the same finding on several screens (the list layout repeats on search / filters / page-size) is shown once,
   on the first screen; later screens say „+N repeated” */
const sig = (f) => [f.viewport, f.key, f.prop, f.staging, f.ours, f.severity].join("|");
const firstSeen = new Map();
for (const f of findings) if (!firstSeen.has(sig(f))) firstSeen.set(sig(f), f);
for (const f of findings) { const first = firstSeen.get(sig(f)); if (first !== f) { f.repeatOf = first.id; (first.alsoOn = first.alsoOn || []).push(f.screen); } }
const uniq = findings.filter((f) => !f.repeatOf);
const L = [];
L.push(`# Staging vs prototype — ${spec.title || spec.id}`, "", `Run ${new Date().toISOString().replace("T", " ").slice(0, 16)} · staging ${spec.staging.base} · ours ${spec.ours.base} · viewports ${VIEWPORTS.join(", ")} · ±${TOL}px`, "");
if (arg("note", "")) L.push(`> ${arg("note", "")}`, "");
L.push("Severity: **Must fix** = staging breaks a library / design rule · **Should fix** = visual drift from the prototype · **Prototype behind** = staging has something we do not, or follows a rule ours breaks → update the prototype (a flag, not a verdict) · **Both sides** = a rule hit with the same value in the prototype (check the rule; not counted).", "");
L.push("## Summary", "", `Unique findings (a repeat on another screen counted once): ${sevs.map((s) => `**${s}** ${uniq.filter((f) => f.severity === s).length}`).join(" · ")} · Both sides ${uniq.filter((f) => f.severity === "Both sides").length}.`, "");
L.push("| screen | viewport | Must fix | Should fix | Prototype behind | of which new here | staging url |", "|---|---|---|---|---|---|---|");
for (const r of results) { const fl = findings.filter((f) => f.screen === r.screen && f.viewport === r.viewport); L.push(`| ${r.screen} | ${r.viewport} | ${sevs.map((s) => fl.filter((f) => f.severity === s).length).join(" | ")} | ${fl.filter((f) => !f.repeatOf && f.severity !== "Both sides").length} | ${esc(r.staging?.url || "")} |`); }
L.push(`| **total (all rows)** | | ${sevs.map((s) => findings.filter((f) => f.severity === s).length).join(" | ")} | ${uniq.filter((f) => f.severity !== "Both sides").length} | |`, "");
if (baseline) L.push(`Against baseline ${BASELINE}: ${findings.filter((f) => f.status === "new").length} new · ${findings.filter((f) => /still/.test(f.status)).length} still open · ${fixed.length} fixed.`, "");
if (spec.unmatchedScreens) { L.push("## Screens without a pair", ""); for (const [k, list] of Object.entries(spec.unmatchedScreens)) L.push(`- **${k}**: ${list.join(" · ")}`); L.push(""); }
L.push(`Read-only guard: ${blocked.length} non-GET request(s) blocked${blocked.length ? ` (${[...new Set(blocked)].slice(0, 5).join(", ")})` : ""}; ${allowedPosts.length} read-query POST(s) let through (${[...new Set(allowedPosts.map((u) => u.replace(/\?.*/, "")))].join(", ") || "none"} — spec.readOnly.allowPost).`, "");
for (const r of results) {
  const all = findings.filter((f) => f.screen === r.screen && f.viewport === r.viewport);
  const fl = all.filter((f) => !f.repeatOf).sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || a.key.localeCompare(b.key));
  const rep = all.length - fl.length;
  L.push(`## ${r.screen} @${r.viewport} — ${r.title || ""}`, "", `staging: ${r.staging?.url || "—"} · ours: \`${spec.screens.find((s) => s.id === r.screen).ours.state}\` · matched ${r.staging && r.ours ? Object.keys(r.staging.measures).filter((k) => r.ours.measures[k]).length : 0} elements (staging ${r.staging ? Object.keys(r.staging.measures).length : 0}, ours ${r.ours ? Object.keys(r.ours.measures).length : 0})${rep ? ` · +${rep} finding(s) repeated from an earlier screen (not listed again)` : ""}${r.errors.length ? " · ERRORS: " + r.errors.join("; ") : ""}`, "");
  if (!fl.length) { L.push("(no new findings)", ""); continue; }
  L.push("| id | severity | where | property | staging | ours | note | evidence |" + (baseline ? " status |" : ""), "|---|---|---|---|---|---|---|---|" + (baseline ? "---|" : ""));
  for (const f of fl) L.push(`| ${f.id} | ${f.severity} | ${esc(r.screen)} › ${esc(f.key)} | ${esc(f.prop)} | ${esc(f.staging)} | ${esc(f.ours)} | ${esc(f.note)}${f.alsoOn ? ` (also on ${[...new Set(f.alsoOn)].join(", ")})` : ""} | ${f.crop ? `[png](${f.crop})` : ""} |` + (baseline ? ` ${f.status} |` : ""));
  L.push("");
}
if (fixed.length) { L.push("## Fixed since the baseline", "", "| id | screen | where | property | was (staging) |", "|---|---|---|---|---|"); for (const f of fixed) L.push(`| ${f.id} | ${f.screen} @${f.viewport} | ${esc(f.key)} | ${esc(f.prop)} | ${esc(f.staging)} |`); L.push(""); }
fs.writeFileSync(path.join(OUT, "report.md"), L.join("\n") + "\n");
const slim = results.map((r) => ({ screen: r.screen, viewport: r.viewport, errors: r.errors, staging: r.staging && { url: r.staging.url, scroll: r.staging.scroll, surfaces: r.staging.surfaces, focusOrder: r.staging.focus.order, measures: r.staging.measures, hover: r.staging.hover, consoleErrors: r.staging.consoleErrors }, ours: r.ours && { url: r.ours.url, scroll: r.ours.scroll, surfaces: r.ours.surfaces, focusOrder: r.ours.focus.order, measures: r.ours.measures, hover: r.ours.hover } }));
fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify({ spec: SPEC_PATH, run: new Date().toISOString(), viewports: VIEWPORTS, blocked, allowedPosts: [...new Set(allowedPosts)], counts: Object.fromEntries([...sevs, "Both sides"].map((s) => [s, uniq.filter((f) => f.severity === s).length])), countsAllRows: Object.fromEntries(sevs.map((s) => [s, findings.filter((f) => f.severity === s).length])), findings, fixed, screens: slim }, null, 1));
console.log(`\n${uniq.length} unique findings (${findings.length} rows) — ${sevs.map((s) => `${s} ${uniq.filter((f) => f.severity === s).length}`).join(" · ")} · Both sides ${uniq.filter((f) => f.severity === "Both sides").length}${baseline ? ` · ${fixed.length} fixed since baseline` : ""}`);
console.log(`blocked non-GET: ${blocked.length} · read-query POSTs let through: ${allowedPosts.length}`);
console.log("→", path.join(OUT, "report.md"));
S.close();
process.exit(0);
