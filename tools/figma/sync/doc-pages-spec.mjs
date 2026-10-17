// Document preview A4 pages → JSON spec for the Figma page builder (doc-pages-build.js), 2026-10-17.
// node --experimental-websocket --no-warnings tools/figma/sync/doc-pages-spec.mjs <state> <out.json>
// Reads every `.e-permits-doc-page` in the open preview at REAL size (zoom 1): blocks in order
// (cont line, p, h1, table rows: group heading / label + value with measured row height, tail p, footer) + page height.
import { spawn } from "node:child_process";
const [state, OUT, W = "1440"] = process.argv.slice(2);
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9700 + Math.floor(Math.random() * 200);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/msr-${port}`, "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target; for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === "page"); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener("open", r));
let seq = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++seq; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }))?.result?.value;
await send("Runtime.enable"); await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: +W, height: 900, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: `http://localhost:8935/e-permits-acte-permisive.html?state=${state}` });
for (let i = 0; i < 100; i++) { await sleep(120); if (await evaluate("document.documentElement.dataset.demoState")) break; }
await sleep(1500);
await sleep(1500);
const SPEC = await evaluate(`(() => {
  const pages = [...document.querySelectorAll("#dosar-detail-modal .e-permits-doc-page")];
  pages.forEach((p) => p.style.setProperty("zoom", "1", "important"));
  return JSON.stringify(pages.map((pg) => {
    const s = pg.querySelector(".e-permits-doc-page__surface"); const blocks = [];
    for (const el of s.children) {
      const t = (x) => x.textContent.replace(/\\s+/g, " ").trim();
      if (el.matches(".e-permits-doc-page__cont")) blocks.push({ k: "cont", t: t(el) });
      else if (el.tagName === "H1") blocks.push({ k: "h1", t: t(el) });
      else if (el.tagName === "P" && el.matches(".e-permits-doc-page__footer")) blocks.push({ k: "footer", t: t(el) });
      else if (el.tagName === "P") blocks.push({ k: "p", t: t(el) });
      else if (el.tagName === "TABLE") blocks.push({ k: "table", rows: [...el.querySelectorAll("tr")].map((tr) => tr.matches(".e-permits-doc-page__group") ? { g: t(tr) } : { l: t(tr.cells[0]), v: t(tr.cells[1]), h: Math.round(tr.getBoundingClientRect().height) }) });
      else if (el.matches(".e-permits-doc-page__tail")) for (const p of el.querySelectorAll("p")) blocks.push({ k: "tail", t: t(p) });
    }
    return { h: Math.round(pg.getBoundingClientRect().height), w: Math.round(pg.getBoundingClientRect().width), blocks };
  }));
})()`);
(await import("node:fs")).writeFileSync(OUT, SPEC);
console.log(SPEC.length, JSON.parse(SPEC).map((p) => p.w + "x" + p.h + " " + p.blocks.map((b) => b.k + (b.rows ? b.rows.length : "")).join(",")).join(" | "));
ws.close(); chrome.kill(); process.exit(0);
