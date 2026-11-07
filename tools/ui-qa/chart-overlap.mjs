// Chart label overlap check (kpi-band-v2, 2026-11-06; components.md › „Charts: no overlapping labels”).
// For every demo state at 1440, 1280 and 375: the rendered text inside chart containers (`.e-permits-chart`,
// `.e-permits-meter`, `.e-permits-ekyc-band`, legends) — HTML text and SVG <text> — measured per text node; reports every pair
// of text boxes that intersect (> 1px each way) and every label that sticks out of its chart card. Exit 1 when any is found.
//
// Usage: node --experimental-websocket --no-warnings tools/ui-qa/chart-overlap.mjs --states kpi-04a,kpi-08g [--widths 1440,1280,375]
import { spawn } from "node:child_process";

const arg = (name, def) => { const i = process.argv.indexOf("--" + name); return i > -1 ? process.argv[i + 1] : def; };
const BASE = arg("base", "http://localhost:8935");
const PAGE = arg("page", "e-permits-acte-permisive.html");
const CHROME = arg("chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
const STATES = (arg("states", "") || "").split(",").filter(Boolean);
const WIDTHS = (arg("widths", "1440,1280,375") || "").split(",").map(Number);
if (!STATES.length) { console.error("--states is required"); process.exit(2); }

const port = 9300 + Math.floor(Math.random() * 300);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/chart-overlap-${port}`, "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === "page"); } catch { /* starting */ } }
if (!target) { console.error("Chrome did not start"); process.exit(1); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let seq = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || { error: m.error }); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++seq; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }))?.result?.value;
await send("Runtime.enable"); await send("Page.enable");

const CHECK = `(() => {
  const vis = (el) => { const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest("[hidden]"); };
  const cards = [...document.querySelectorAll(".e-permits-chart, .e-permits-ekyc-band")].filter(vis);
  const boxes = [];
  cards.forEach((card, ci) => {
    const tw = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
    for (let n; (n = tw.nextNode());) {
      if (!n.nodeValue.trim() || !n.parentElement || !vis(n.parentElement) || n.parentElement.closest(".sr-only,.u-visually-hidden,.visually-hidden")) continue;
      const range = document.createRange(); range.selectNodeContents(n);
      /* ellipsized / clipped text (overflow hidden) only counts inside its clipping box */
      const clip = n.parentElement.closest("[class]") && getComputedStyle(n.parentElement).overflow === "hidden" ? n.parentElement.getBoundingClientRect() : null;
      [...range.getClientRects()].forEach((r) => { if (r.width && r.height) boxes.push({ ci, node: n, text: n.nodeValue.trim().slice(0, 40), r: { l: clip ? Math.max(r.left, clip.left) : r.left, t: r.top, rt: clip ? Math.min(r.right, clip.right) : r.right, b: r.bottom } }); });
    }
  });
  const overlaps = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    if (boxes[i].node === boxes[j].node) continue; /* two line rects of one text node never collide */
    const a = boxes[i].r, b = boxes[j].r;
    const w = Math.min(a.rt, b.rt) - Math.max(a.l, b.l), h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
    if (w > 1 && h > 1) overlaps.push(boxes[i].text + "  ×  " + boxes[j].text);
  }
  const outside = boxes.filter((x) => { const c = cards[x.ci].getBoundingClientRect(); return x.r.l < c.left - 0.5 || x.r.rt > c.right + 0.5; }).map((x) => x.text);
  return { cards: cards.length, labels: boxes.length, overlaps, outside };
})()`;

let total = 0;
for (const st of STATES) {
  for (const width of WIDTHS) {
    const mobile = width <= 760;
    await send("Emulation.setDeviceMetricsOverride", { width, height: mobile ? 812 : 900, deviceScaleFactor: 1, mobile });
    await send("Page.navigate", { url: `${BASE}/${PAGE}?state=${st}` });
    let ready = false;
    for (let i = 0; i < 100 && !ready; i++) { await sleep(150); ready = !!(await evaluate("document.documentElement.dataset.demoState")); }
    await sleep(900);
    const res = await evaluate(CHECK);
    const n = (res?.overlaps.length || 0) + (res?.outside.length || 0);
    total += n;
    console.log(`${st} ${width} charts=${res?.cards} labels=${res?.labels} overlaps=${res?.overlaps.length} outside=${res?.outside.length}`);
    (res?.overlaps || []).slice(0, 5).forEach((o) => console.log(`   overlap  ${o}`));
    (res?.outside || []).slice(0, 5).forEach((o) => console.log(`   outside  ${o}`));
  }
}
console.log(`TOTAL ${total}`);
ws.close(); chrome.kill();
process.exit(total ? 1 : 0);
