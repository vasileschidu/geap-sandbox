// UI QA — components only (2026-10-18, user: „use only components, do an audit; I need an agent to verify”).
// Opens demo states in headless Chrome at 1440 and 375 (touch emulation, like capture.mjs) and reports:
//   1. non-library-control — every visible interactive / form control (input, select, textarea, button, link
//      styled as a button, role=button|combobox|switch|checkbox|radio|tab|menuitem) that is not a library
//      component, a listed product component, or a class documented in the Component Inventory of
//      .claude/skills/components.md (allow-list: tools/ui-qa/specs/component-audit.json);
//   2. field sizes — input / select / search / phone / date / textarea boxes: phones (≤760) 48 high with 16/24
//      text, desktop 40; icons inside a field at the library icon size for that field (48 → 24, 40 → 20);
//   3. look-alike — an element styled as a control (pointer cursor + paint, or border + radius + padding at a
//      control height) without a control role and without a library / documented class;
//   4. copy (2026-10-20) — copy-variant: copy markup that is not the ONE `.copy-value` component (legacy classes /
//      data hooks, an icon-only control labelled „Copiază…”); copy-in-list: a `.copy-value` inside a list view
//      (table cell, stacked row, act / request row) — lists show plain numbers (spec.copy).
// Output: <out>/report.json + <out>/summary.md (selector, measured, expected, fix hint per finding).
//
// Usage: node --experimental-websocket --no-warnings tools/ui-qa/component-audit.mjs \
//          --states fo-02,pp-01 | --prefix fo-  [--viewports desktop,mobile[,edge|<width>]] [--scope "<css>"]
//          [--out tools/ui-qa/out/components] [--spec tools/ui-qa/specs/component-audit.json]
//          [--baseline <older report.json>]  (adds a before → after column to the summary)
// Needs the prototype served on http://localhost:8935 and Google Chrome.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const arg = (name, def) => { const i = process.argv.indexOf("--" + name); return i > -1 ? process.argv[i + 1] : def; };
const BASE = arg("base", "http://localhost:8935");
const PAGE = arg("page", "e-permits-acte-permisive.html");
const OUT = arg("out", "tools/ui-qa/out/components");
const SCOPE = arg("scope", "");
const SPEC_PATH = arg("spec", "tools/ui-qa/specs/component-audit.json");
const BASELINE = arg("baseline", "");
const CHROME = arg("chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
const VPS = (arg("viewports", "desktop,mobile")).split(",");
const spec = JSON.parse(fs.readFileSync(SPEC_PATH, "utf8"));

let STATES = (arg("states", "") || "").split(",").filter(Boolean);
if (!STATES.length && arg("prefix")) {
  const src = fs.readFileSync("js/demo-states.js", "utf8");
  STATES = [...new Set([...src.matchAll(/"([a-z]+-[0-9a-z]+)":/g)].map((m) => m[1]).filter((s) => s.startsWith(arg("prefix"))))];
}
if (!STATES.length) { console.error("give --states a,b or --prefix fo-"); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });

/* the classes documented in the Component Inventory (components.md § 2) — backticked `.class` names; a
   modifier (`x--y`) documents its block (`x`) too */
const md = fs.readFileSync(".claude/skills/components.md", "utf8");
const inv = md.slice(md.indexOf("## 2. Component Inventory"), md.indexOf("## 3. Library component contracts"));
const documented = new Set();
for (const tick of inv.matchAll(/`([^`]+)`/g)) for (const m of tick[1].matchAll(/\.([a-zA-Z][\w-]*)/g)) {
  const c = m[1]; if (/^(is|has)-/.test(c) || c.length < 4) continue;
  documented.add(c); if (c.includes("--")) documented.add(c.split("--")[0]);
}

/* ---------------------------------------------------------------------------------------- page */
const AUDIT = (spec, documentedList, scope) => {
  const documented = new Set(documentedList);
  const vis = (el) => { if (!el.isConnected) return false; const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1 && !el.closest("[hidden]") && (el instanceof SVGElement || !el.closest("[aria-hidden=true]")); };
  const phone = window.innerWidth <= spec.size.phoneMaxWidth;
  const root = (scope && [...document.querySelectorAll(scope)].find(vis)) || document.body;
  const ignored = (el) => spec.ignoreWithin.some((s) => { try { return el.closest(s); } catch (e) { return false; } });
  const sel = (el) => { const parts = []; let n = el; for (let i = 0; n && n !== document.body && i < 4; i++, n = n.parentElement) { let s = n.tagName.toLowerCase(); if (n.id && i === 0) s += "#" + n.id; const c = [...n.classList].filter((x) => !/^(is|has)-/.test(x)).slice(0, 2).join("."); if (c) s += "." + c; parts.unshift(s); } return parts.join(" > "); };
  const txt = (el) => (el.getAttribute("aria-label") || el.innerText || el.value || el.getAttribute("placeholder") || "").trim().replace(/\s+/g, " ").slice(0, 50);
  const any = (el, list) => list.find((s) => { try { return el.matches(s); } catch (e) { return false; } });
  const LIB = spec.library, PROD = spec.product, STATIC = spec.libraryStatic || [];
  const blocks = new Set([...LIB, ...PROD].map((s) => (s.match(/\.([\w-]+)$/) || [])[1]).filter(Boolean).map((c) => c.split("__")[0].split("--")[0]));
  /* tier of a control: own match first; ancestors only for native fields, menu items and class-less parts */
  const tier = (el) => {
    const own = [...el.classList].filter((c) => !/^(is|has|js)-/.test(c));
    let m = any(el, LIB); if (m) return { tier: "library", by: m };
    m = any(el, PROD); if (m) return { tier: "product", by: m };
    const d = own.find((c) => documented.has(c)); if (d) return { tier: "documented", by: "." + d };
    const part = own.find((c) => c.includes("__") && (blocks.has(c.split("__")[0]) || documented.has(c.split("__")[0]))); if (part) return { tier: "part", by: "." + part.split("__")[0] };
    const native = /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) || /^(option|menuitem|menuitemradio|menuitemcheckbox)$/.test(el.getAttribute("role") || "") || !own.length;
    if (native) for (let n = el.parentElement, i = 0; n && i < spec.ancestorDepth; n = n.parentElement, i++) {
      m = any(n, LIB) || any(n, PROD); if (m) return { tier: "inside", by: m };
      const dc = [...n.classList].find((c) => documented.has(c)); if (dc) return { tier: "inside", by: "." + dc };
    }
    return { tier: "none", by: own.join(".") || el.tagName.toLowerCase() };
  };
  const findings = []; const counts = { controls: 0, library: 0, product: 0, documented: 0, part: 0, inside: 0, none: 0, fields: 0, lookAlikes: 0 };
  const add = (severity, rule, el, measured, expected, extra) => findings.push({ severity, rule, selector: sel(el), text: txt(el), measured, expected, fix: spec.fixHints[rule] || "", ...(extra || {}) });

  /* 1. controls */
  /* a painted box: a background, a visible border on any side (a menu's search row has only a bottom line) or an inset ring */
  const painted = (cs) => (cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent") || ["Top", "Right", "Bottom", "Left"].some((d) => parseFloat(cs[`border${d}Width`]) > 0 && cs[`border${d}Style`] !== "none" && !/rgba\([^)]*,\s*0\)$/.test(cs[`border${d}Color`])) || /inset/.test(cs.boxShadow);
  const controls = [...root.querySelectorAll(spec.controls)].filter((el) => vis(el) && !ignored(el));
  for (const el of controls) {
    if (el.tagName === "A" && !el.matches(".btn, .chip, [role=button], [role=tab], [role=menuitem], [role=option]")) {
      /* a plain text link is a link; only links painted like a button are controls here */
      const cs = getComputedStyle(el); if (!(painted(cs) && parseFloat(cs.paddingLeft) >= 6)) continue;
    }
    counts.controls++;
    const t = tier(el); counts[t.tier]++;
    if (t.tier === "none") add("major", "non-library-control", el, `<${el.tagName.toLowerCase()}${el.getAttribute("role") ? ` role=${el.getAttribute("role")}` : ""}> .${t.by}`, "a library class or a documented product component");
  }

  /* 2. field sizes */
  const exempt = (el) => (spec.sizeExempt || []).some((s) => { try { return el.matches(s) || (s.endsWith(" *") && el.closest(s.slice(0, -2))); } catch (e) { return false; } });
  const boxes = new Set();
  for (const s of spec.fieldBoxes) for (const b of root.querySelectorAll(s)) if (vis(b) && !ignored(b)) {
    /* nested boxes (an .input inside a .search-input / .e-permits-fo-input) count once, on the outer box */
    const outer = b.parentElement && b.parentElement.closest(spec.fieldBoxes.join(","));
    if (outer && vis(outer) && outer.getBoundingClientRect().height >= b.getBoundingClientRect().height - 1) continue;
    boxes.add(b);
  }
  for (const f of root.querySelectorAll("input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([type=submit]):not([type=button]), select, textarea, [role=combobox]")) {
    if (!vis(f) || ignored(f) || f.closest([...boxes].length ? spec.fieldBoxes.join(",") : "#__none")) continue;
    /* the field's frame: the first box with a border (any side) or an inset ring, up to 3 levels — a bare white
       background is not a frame (a borderless <input> inside a menu's search row keeps the UA white) */
    const framed = (cs) => ["Top", "Right", "Bottom", "Left"].some((d) => parseFloat(cs[`border${d}Width`]) > 0 && cs[`border${d}Style`] !== "none" && !/rgba\([^)]*,\s*0\)$/.test(cs[`border${d}Color`])) || /inset/.test(cs.boxShadow);
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
    /* text */
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
      if (!vis(svg)) continue;
      const btn = svg.closest("button, [role=button], .btn-group, .spinner"); if (btn && btn !== b && b.contains(btn)) continue;
      const ir = svg.getBoundingClientRect(); const size = Math.round(Math.min(ir.width, ir.height) * 10) / 10;
      const href = svg.querySelector("use")?.getAttribute("href") || "";
      const isChev = chev.test(href);
      const min = isChev ? spec.size.chevronMin : want;
      if (isArea) continue;
      if (size + 0.5 < min) add(phone && !isChev ? "major" : "minor", "field-icon-size", svg, `${size}px (${href.split("#")[1] || "svg"}) in a ${h}px field`, `${min}px`);
    }
  }

  /* 3. look-alikes */
  const L = spec.lookAlike; let la = 0;
  const known = (el) => any(el, LIB) || any(el, PROD) || any(el, STATIC) || [...el.classList].some((c) => documented.has(c) || (c.includes("__") && (blocks.has(c.split("__")[0]) || documented.has(c.split("__")[0]))));
  for (const el of root.querySelectorAll("div, span, li, label, p, a:not([href])")) {
    if (la >= 60) break;
    if (!vis(el) || ignored(el) || el.closest(spec.controls) || el.querySelector(spec.controls) || el.matches("[role]")) continue;
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    if (r.height < L.minHeight || r.height > L.maxHeight || r.width > L.maxWidth) continue;
    const pointer = cs.cursor === "pointer" && getComputedStyle(el.parentElement).cursor !== "pointer" && painted(cs);
    const boxy = parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== "none" && parseFloat(cs.borderTopLeftRadius) > 0 && parseFloat(cs.paddingLeft) >= 8 && parseFloat(cs.paddingRight) >= 8 && /flex|inline/.test(cs.display) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!(pointer || boxy) || known(el)) continue;
    la++; counts.lookAlikes++;
    add("minor", "look-alike", el, pointer ? "cursor pointer + paint" : `border ${cs.borderTopWidth} · radius ${cs.borderTopLeftRadius} · padding ${cs.paddingLeft}`, "a library control, or no control look");
  }
  /* 4. copy — one component, never in list views */
  const C = spec.copy;
  if (C) {
    counts.copies = 0;
    const labelRe = new RegExp(C.labelPattern, "i");
    const visibleText = (el) => [...el.childNodes].some((n) => (n.nodeType === 3 && n.textContent.trim()) || (n.nodeType === 1 && !n.matches("svg, [aria-hidden=true], .u-visually-hidden") && vis(n) && n.textContent.trim()));
    const seen = new Set();
    for (const s of C.legacy) for (const el of root.querySelectorAll(s)) {
      if (!vis(el) || ignored(el) || seen.has(el) || el.closest(C.component)) continue;
      seen.add(el); add("major", "copy-variant", el, `legacy copy markup ${s}`, `${C.component} (GEAPCopyValue.html)`);
    }
    for (const el of root.querySelectorAll("button, [role=button], a[href]")) {
      if (!vis(el) || ignored(el) || seen.has(el) || el.closest(C.button)) continue;
      const label = el.getAttribute("aria-label") || el.dataset.tooltipLabel || "";
      if (!labelRe.test(label) || visibleText(el) || /menuitem/.test(el.getAttribute("role") || "")) continue;
      seen.add(el); add("major", "copy-variant", el, `icon-only „${label.slice(0, 40)}” outside ${C.component}`, `${C.component} (GEAPCopyValue.html)`);
    }
    for (const el of root.querySelectorAll(C.component)) {
      if (!vis(el) || ignored(el)) continue;
      counts.copies++;
      if (C.listExempt.some((s) => el.closest(s))) continue;
      const ctx = C.listContexts.find((s) => el.closest(s));
      if (ctx) add("major", "copy-in-list", el, `copy value inside ${ctx}`, "plain text in list views");
    }
  }
  return { viewport: `${window.innerWidth}`, phone, counts, findings };
};

/* ---------------------------------------------------------------------------------------- CDP */
setTimeout(() => { console.error("component-audit: global timeout"); process.exit(3); }, Math.max(120000, STATES.length * VPS.length * 30000));
const port = 9300 + Math.floor(Math.random() * 600);
const udd = `/tmp/ui-qa-components-${port}`;
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${udd}`, "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 80 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === "page"); } catch {} }
if (!target) { console.error("Chrome did not start"); process.exit(1); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let seq = 0; const pending = new Map(); let consoleErrors = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || { error: m.error }); pending.delete(m.id); }
  if (m.method === "Runtime.exceptionThrown") consoleErrors.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || "").slice(0, 200));
});
const send = (method, params = {}) => Promise.race([new Promise((r) => { const i = ++seq; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); }), sleep(20000).then(() => ({ error: "timeout " + method }))]);
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }))?.result?.value;
await send("Runtime.enable"); await send("Page.enable");

/* edge = the widest phone (the ≤760 rule); any number = that width (phone when ≤ 760) */
const VIEW = { desktop: [1440, 900, false], mobile: [375, 812, true], edge: [760, 900, true] };
for (const v of VPS) if (/^\d+$/.test(v)) VIEW[v] = [Number(v), 900, Number(v) <= spec.size.phoneMaxWidth];
const report = { generated: new Date().toISOString(), spec: SPEC_PATH, documentedClasses: documented.size, states: {} };
for (const st of STATES) for (const vp of VPS) {
  const [w, h, mobile] = VIEW[vp];
  consoleErrors = [];
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile });
  await send("Emulation.setTouchEmulationEnabled", { enabled: mobile });
  await send("Page.navigate", { url: `${BASE}/${PAGE}?state=${st}` });
  let ds = ""; for (let i = 0; i < 100 && !ds; i++) { await sleep(150); ds = await evaluate("document.documentElement.dataset.demoState || ''"); }
  await sleep(900);
  await evaluate(`(() => { const s = document.head.appendChild(document.createElement("style")); s.textContent = "*,*::before,*::after{transition:none!important;animation:none!important}"; })()`);
  await sleep(100);
  const res = await evaluate(`(${AUDIT.toString()})(${JSON.stringify(spec)}, ${JSON.stringify([...documented])}, ${JSON.stringify(SCOPE)})`);
  const rec = res || { counts: {}, findings: [], error: "audit failed" };
  rec.demoState = ds; rec.demoError = !ds || /:error/.test(ds); rec.consoleErrors = consoleErrors;
  report.states[`${st}/${vp}`] = rec;
  const maj = rec.findings.filter((f) => f.severity === "major").length, min = rec.findings.length - maj;
  console.log(`${st} ${vp} ${rec.demoError ? "DEMO-ERROR " : ""}controls=${rec.counts.controls ?? "?"} non-library=${rec.counts.none ?? "?"} fields=${rec.counts.fields ?? "?"} major=${maj} minor=${min}`);
}

/* ---------------------------------------------------------------------------------------- output */
fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 1));
const base = BASELINE && fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, "utf8")).states : null;
const cnt = (rec, sev) => rec ? rec.findings.filter((f) => f.severity === sev).length : null;
const lines = [`# Component audit — ${new Date().toISOString().slice(0, 16)}`, "", `spec \`${SPEC_PATH}\` · ${documented.size} classes documented in the Component Inventory`, "",
  `| state | viewport | controls | non-library | fields | major | minor${base ? " | major before → after" : ""} |`, `|---|---|---|---|---|---|---|${base ? "---|" : ""}`];
for (const [k, rec] of Object.entries(report.states)) {
  const [st, vp] = k.split("/");
  lines.push(`| ${st}${rec.demoError ? " ⚠ demo error" : ""} | ${vp} | ${rec.counts.controls ?? "?"} | ${rec.counts.none ?? "?"} | ${rec.counts.fields ?? "?"} | ${cnt(rec, "major")} | ${cnt(rec, "minor")}${base ? ` | ${base[k] ? cnt(base[k], "major") : "–"} → ${cnt(rec, "major")}` : ""} |`);
}
for (const [k, rec] of Object.entries(report.states)) {
  if (!rec.findings.length) continue;
  lines.push("", `## ${k}`, "", "| sev | rule | selector | text | measured | expected |", "|---|---|---|---|---|---|");
  const seen = new Map();
  for (const f of rec.findings) { const key = [f.severity, f.rule, f.selector, f.measured].join("|"); seen.set(key, { ...f, n: (seen.get(key)?.n || 0) + 1 }); }
  for (const f of seen.values()) lines.push(`| ${f.severity} | ${f.rule} | \`${f.selector}\`${f.n > 1 ? ` ×${f.n}` : ""} | ${(f.text || "").replace(/\|/g, "/")} | ${f.measured} | ${f.expected} |`);
}
lines.push("", "## Fix hints", "", ...Object.entries(spec.fixHints).map(([r, h]) => `- **${r}** — ${h}`));
fs.writeFileSync(path.join(OUT, "summary.md"), lines.join("\n") + "\n");
console.log("→", path.join(OUT, "report.json"), "+ summary.md");
ws.close(); chrome.kill(); try { fs.rmSync(udd, { recursive: true, force: true }); } catch {}
process.exit(0);
