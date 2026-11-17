// Form Designer — WYSIWYG parity check (fb-wysiwyg-v1, 2026-11-17).
// The edit canvas (Editare) and the Preview (Previzualizare) draw a step with ONE renderer (js/form-builder.js
// `stepPageHtml`). This script proves the two layouts are the same: for a form step it measures, in both modes,
// the rect of every page element (step header, section headers / bodies, every field and every element inside
// a field) RELATIVE to the page body, and reports every difference above the tolerance.
//
// The two modes only match when the form column has the same width. The sheet's column is capped at the Preview's
// (944), so it does at ≥ 1680 as is, and at 1440 with the two floating cards collapsed (`--collapse`, default on
// when the widths differ). A run that cannot get equal widths fails with „width differs”.
//
// Usage: node --experimental-websocket --no-warnings tools/ui-qa/fb-parity.mjs [--state fb-w01] [--width 1440]
//          [--height 900] [--tol 1] [--query "&formular=form-sanitary-09"] [--no-collapse] [--base http://localhost:8935]
//          [--out tools/ui-qa/out/fb-parity]
// Exit code 0 = identical within the tolerance, 1 = differences (listed), 2 = could not measure.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const arg = (name, def) => { const i = process.argv.indexOf("--" + name); return i > -1 ? process.argv[i + 1] : def; };
const has = (name) => process.argv.includes("--" + name);
const BASE = arg("base", "http://localhost:8935");
const STATE = arg("state", "fb-w01");
const WIDTH = Number(arg("width", 1440));
const HEIGHT = Number(arg("height", 900));
const TOL = Number(arg("tol", 1));
const OUT = arg("out", "tools/ui-qa/out/fb-parity");
const CHROME = arg("chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");

const port = 9100 + Math.floor(Math.random() * 400);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/fb-parity-${port}`, "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const done = (code) => { try { chrome.kill(); } catch { /* gone */ } process.exit(code); };
let target;
for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === "page"); } catch { /* starting */ } }
if (!target) { console.error("Chrome did not start"); done(2); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let seq = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || { error: m.error }); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++seq; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r?.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r?.result?.value; };
await send("Runtime.enable"); await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: `${BASE}/e-permits-acte-permisive.html?state=${STATE}${arg("query", "")}` });
let ready = false;
for (let i = 0; i < 200 && !ready; i++) { await sleep(150); ready = !!(await ev("document.documentElement.dataset.demoState")); }
if (!ready) { console.error("state not ready:", STATE); done(2); }
await sleep(900);
await ev(`(() => { const s = document.head.appendChild(document.createElement("style")); s.textContent = "*,*::before,*::after{transition:none!important;animation:none!important}"; })()`);

// rects of the page elements, relative to the page body. `mode` = "build" | "preview".
// Elements the editor adds inside the FO markup (the text span of a label, `data-fb-wrap`) are skipped; an element
// hidden in the Preview by a display rule (the editor shows every field) is reported as skipped, not as a difference.
const MEASURE = (mode) => `(() => {
  const body = document.querySelector(${mode === "build" ? '"[data-fb-canvas-body]"' : '"[data-fb-preview-body]"'});
  if (!body) return null;
  const o = body.getBoundingClientRect();
  const rect = (el) => { const r = el.getBoundingClientRect(); return [r.left - o.left, r.top - o.top, r.width, r.height].map((v) => Math.round(v * 100) / 100); };
  const name = (el) => el.tagName.toLowerCase() + (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\\s+/).filter((c) => !/^is-|^has-/.test(c)).slice(0, 2).join(".") : "");
  const out = { width: Math.round(o.width * 100) / 100, items: [], skipped: [] };
  const add = (key, el) => out.items.push({ key, el: name(el), rect: rect(el) });
  const head = body.querySelector(":scope > header");
  if (head) { add("step", head); [...head.children].forEach((c, i) => add("step/" + i, c)); }
  body.querySelectorAll(":scope > section").forEach((section) => {
    const sid = section.dataset.fbSection;
    add("section:" + sid, section);
    const sh = section.querySelector(":scope > .e-permits-fo-section-header");
    if (sh) { add("section:" + sid + "/header", sh); [...sh.children].forEach((c, i) => add("section:" + sid + "/header/" + i, c)); }
    const grid = section.querySelector(":scope > .e-permits-fo-form__section-body");
    if (!grid) return;
    add("section:" + sid + "/body", grid);
    [...grid.children].forEach((field) => {
      const id = field.dataset.id || field.dataset.fbField;
      if (!id) return;
      if (field.hidden || getComputedStyle(field).display === "none") { out.skipped.push(id); return; }
      add("field:" + id, field);
      let n = 0;
      field.querySelectorAll("*").forEach((el) => {
        if (el.hasAttribute("data-fb-wrap") || el.closest("svg") && el.tagName.toLowerCase() !== "svg") return;
        const cs = getComputedStyle(el);
        if (cs.display === "none" || el.closest("[hidden]")) return;
        /* not rendered (inside a closed part): no box to compare */
        const box = el.getBoundingClientRect();
        if (!box.width && !box.height) return;
        add("field:" + id + "/" + (n++) + ":" + name(el), el);
      });
    });
  });
  return out;
})()`;

const widths = async () => ev(`(() => ({ build: document.querySelector("[data-fb-canvas-body]")?.getBoundingClientRect().width || 0 }))()`);
const toMode = async (mode) => { await ev(`window.GEAPFormBuilder.setMode(${JSON.stringify(mode)})`); await sleep(500); };

// Previzualizare first: its width is the reference
await ev(`window.GEAPFormBuilder.select("form")`);
await toMode("preview");
const preview = await ev(MEASURE("preview"));
await toMode("build");
let collapsed = false;
let build = await ev(MEASURE("build"));
if (preview && build && Math.abs(preview.width - build.width) > 0.5 && !has("no-collapse")) {
  // give the page the room of the two floating cards (their rails stay)
  await ev(`(() => { document.querySelector("[data-fb-library-head] [data-fb-rail-toggle]")?.click(); document.querySelector("[data-fb-panel] [data-fb-props-toggle]")?.click(); })()`);
  await sleep(500);
  collapsed = true;
  build = await ev(MEASURE("build"));
}
if (!preview || !build) { console.error("could not measure (no page body)"); done(2); }

const report = { state: STATE, viewport: [WIDTH, HEIGHT], tolerance: TOL, collapsed, width: { build: build.width, preview: preview.width }, compared: 0, differences: [], missing: [], skipped: preview.skipped };
if (Math.abs(preview.width - build.width) > 0.5) {
  console.log(`fb-parity ${STATE} @${WIDTH}: width differs — Editare ${build.width} vs Previzualizare ${preview.width}${collapsed ? " (cards collapsed)" : ""}. Use a wider viewport.`);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${STATE}-${WIDTH}.json`), JSON.stringify(report, null, 1));
  done(2);
}
const pv = new Map(preview.items.map((item) => [item.key, item]));
const skip = new Set(preview.skipped);
for (const item of build.items) {
  const fieldId = (item.key.match(/^field:([^/]+)/) || [])[1];
  if (fieldId && skip.has(fieldId)) continue;
  const other = pv.get(item.key);
  if (!other) { report.missing.push({ key: item.key, in: "Previzualizare" }); continue; }
  pv.delete(item.key);
  report.compared += 1;
  const delta = item.rect.map((v, i) => Math.round((v - other.rect[i]) * 100) / 100);
  if (delta.some((d) => Math.abs(d) > TOL)) report.differences.push({ key: item.key, build: item.rect, preview: other.rect, delta });
}
for (const key of pv.keys()) report.missing.push({ key, in: "Editare" });

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, `${STATE}-${WIDTH}.json`), JSON.stringify(report, null, 1));
const ok = !report.differences.length && !report.missing.length;
console.log(`fb-parity ${STATE} @${WIDTH}${collapsed ? " (cards collapsed)" : ""}: form column ${build.width}px in both modes · ${report.compared} elements compared · ${report.differences.length} differ > ${TOL}px · ${report.missing.length} without a pair${report.skipped.length ? ` · ${report.skipped.length} field(s) hidden by a rule in Previzualizare (skipped)` : ""} → ${ok ? "PASS" : "FAIL"}`);
report.differences.slice(0, 25).forEach((d) => console.log("  ≠", d.key, "Δ", JSON.stringify(d.delta), "edit", JSON.stringify(d.build), "preview", JSON.stringify(d.preview)));
report.missing.slice(0, 25).forEach((m) => console.log("  ∅ only one side (missing in " + m.in + "):", m.key));
console.log("report:", path.join(OUT, `${STATE}-${WIDTH}.json`));
ws.close();
done(ok ? 0 : 1);
