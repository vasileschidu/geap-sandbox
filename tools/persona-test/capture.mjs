// Persona review — evidence capture.
// For every demo state, at desktop (1440) and mobile (375): full-page screenshot, visible texts,
// headings, controls without an accessible name, tab order, horizontal overflow and console errors.
//
// Usage: node --experimental-websocket tools/persona-test/capture.mjs --prefix fo- [--states fo-01,fo-02] [--out dir] [--base http://localhost:8935]
// Needs the prototype served locally (any static server on the repo root) and Google Chrome.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const arg = (name, def) => { const i = process.argv.indexOf("--" + name); return i > -1 ? process.argv[i + 1] : def; };
const BASE = arg("base", "http://localhost:8935");
const PAGE = arg("page", "e-permits-acte-permisive.html");
const OUT = arg("out", path.join("tools/persona-test/out", new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")));
const CHROME = arg("chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
const HIDE = arg("hide", ".e-permits-fo-testcfg, .msup-bubble");
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900, mobile: false, scale: 1 },
  { name: "mobile", width: 375, height: 812, mobile: true, scale: 2 },
];

// states: explicit list, or every key in js/demo-states.js with the prefix
let states = (arg("states", "") || "").split(",").filter(Boolean);
if (!states.length) {
  const src = fs.readFileSync("js/demo-states.js", "utf8");
  const prefix = arg("prefix", "fo-");
  states = [...new Set([...src.matchAll(/"([a-z]+-[0-9a-z]+)":/g)].map(m => m[1]).filter(s => s.startsWith(prefix)))];
}
fs.mkdirSync(OUT, { recursive: true });

const port = 9600 + Math.floor(Math.random() * 300);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/persona-cdp-${port}`, "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let target;
for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(x => x.type === "page"); } catch {} }
if (!target) { console.error("Chrome did not start"); process.exit(1); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener("open", r));
let seq = 0; const pending = new Map(); let consoleErrors = [];
ws.addEventListener("message", e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || { error: m.error }); pending.delete(m.id); }
  if (m.method === "Runtime.exceptionThrown") consoleErrors.push(m.params.exceptionDetails.exception?.description?.slice(0, 300) || m.params.exceptionDetails.text);
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") consoleErrors.push(m.params.args.map(a => a.value ?? a.description).join(" ").slice(0, 300));
});
const send = (method, params = {}) => new Promise(r => { const i = ++seq; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async expr => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }))?.result?.value;
await send("Runtime.enable"); await send("Page.enable");

// Runs in the page: everything a reviewer needs besides the picture
const COLLECT = `(() => {
  const vis = el => { if (!el.isConnected) return false; const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden") return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest("[hidden],[aria-hidden=true]"); };
  const name = el => (el.getAttribute("aria-label") || (el.getAttribute("aria-labelledby") && document.getElementById(el.getAttribute("aria-labelledby"))?.innerText) || (el.labels && el.labels[0]?.innerText) || el.innerText || el.value || el.getAttribute("title") || el.getAttribute("placeholder") || "").trim().replace(/\\s+/g, " ").slice(0, 80);
  const root = document.querySelector("main") || document.body;
  const headings = [...document.querySelectorAll("h1,h2,h3,h4,[role=heading]")].filter(vis).map(h => (h.tagName.match(/H\\d/) ? h.tagName : "h?") + " " + h.innerText.trim().replace(/\\s+/g, " ").slice(0, 100));
  const controls = [...document.querySelectorAll("a[href],button,input:not([type=hidden]),select,textarea,[role=button],[role=link],[role=checkbox],[role=radio],[role=switch],[role=tab],[role=menuitem]")].filter(vis);
  const unnamed = controls.filter(c => !name(c)).map(c => c.tagName.toLowerCase() + (c.className ? "." + String(c.className).split(" ").slice(0, 2).join(".") : "")).slice(0, 30);
  const tabOrder = controls.filter(c => c.tabIndex >= 0 && !c.disabled).slice(0, 60).map(c => c.tagName.toLowerCase() + ": " + name(c));
  const vw = document.documentElement.clientWidth;
  const overflow = [...root.querySelectorAll("*")].filter(el => { if (!vis(el)) return false; const r = el.getBoundingClientRect(); return r.right > vw + 1 && getComputedStyle(el).position !== "fixed"; }).slice(0, 15).map(el => el.tagName.toLowerCase() + "." + String(el.className).split(" ")[0] + " right=" + Math.round(el.getBoundingClientRect().right));
  const messages = [...document.querySelectorAll("[role=alert],[role=status],.message,.banner,.inline-message,.toast")].filter(vis).map(m => m.innerText.trim().replace(/\\s+/g, " ").slice(0, 200));
  const dialogs = [...document.querySelectorAll("[role=dialog],.modal-overlay.is-active")].filter(vis).map(d => (d.getAttribute("aria-label") || d.querySelector("h1,h2,h3")?.innerText || "dialog").trim());
  // only text that is actually rendered, in reading order
  const lines = []; const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = tw.nextNode());) { const t = n.nodeValue.trim().replace(/\\s+/g, " "); if (!t || !n.parentElement || !vis(n.parentElement)) continue; const cs = getComputedStyle(n.parentElement); if (cs.opacity === "0" || cs.clipPath === "inset(50%)" || n.parentElement.closest(".sr-only,.visually-hidden")) continue; if (lines[lines.length - 1] !== t) lines.push(t); }
  const text = lines.join("\\n").slice(0, 12000);
  return { url: location.href, title: document.title, lang: document.documentElement.lang, headings, messages, dialogs, unnamedControls: unnamed, tabOrder, horizontalOverflow: overflow, pageWidth: document.documentElement.scrollWidth, viewport: vw, text };
})()`;

const index = [];
for (const st of states) {
  for (const vp of VIEWPORTS) {
    consoleErrors = [];
    await send("Emulation.setDeviceMetricsOverride", { width: vp.width, height: vp.height, deviceScaleFactor: vp.scale, mobile: vp.mobile });
    await send("Emulation.setTouchEmulationEnabled", { enabled: vp.mobile });
    await send("Page.navigate", { url: `${BASE}/${PAGE}?state=${st}` });
    let ready = false;
    for (let i = 0; i < 100 && !ready; i++) { await sleep(150); ready = !!(await evaluate("document.documentElement.dataset.demoState")); }
    await sleep(900);
    // no motion; prototype-only overlays (flow config tool, support greeting bubble) are hidden so they don't cover the screen
    await evaluate(`(() => { const s = document.getElementById("__pt") || document.head.appendChild(Object.assign(document.createElement("style"), { id: "__pt" })); s.textContent = "*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important} ${HIDE}{display:none!important}"; })()`);
    await sleep(150);
    const info = await evaluate(COLLECT);
    const metrics = await send("Page.getLayoutMetrics");
    const h = Math.min(Math.ceil(metrics.cssContentSize?.height || vp.height), 8000);
    const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: vp.width, height: h, scale: 1 } });
    const dir = path.join(OUT, st); fs.mkdirSync(dir, { recursive: true });
    const png = path.join(dir, vp.name + ".png");
    if (shot.data) fs.writeFileSync(png, Buffer.from(shot.data, "base64"));
    const rec = { state: st, viewport: vp.name, ready, consoleErrors, screenshot: png, ...info };
    fs.writeFileSync(path.join(dir, vp.name + ".json"), JSON.stringify(rec, null, 1));
    index.push({ state: st, viewport: vp.name, ready, title: info?.headings?.[0] || "", errors: consoleErrors.length, unnamed: info?.unnamedControls?.length || 0, overflow: info?.horizontalOverflow?.length || 0, screenshot: png });
    console.log(`${st} ${vp.name} ${ready ? "ok" : "NOT READY"} errors=${consoleErrors.length} overflow=${info?.horizontalOverflow?.length ?? "?"} unnamed=${info?.unnamedControls?.length ?? "?"}`);
  }
}
fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify({ base: BASE, page: PAGE, captured: new Date().toISOString(), states, items: index }, null, 1));
console.log("OUT", OUT);
ws.close(); chrome.kill();
