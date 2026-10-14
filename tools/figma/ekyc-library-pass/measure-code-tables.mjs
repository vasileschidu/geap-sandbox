// eKYC library pass round 7 (2026-10-14) · measure the RENDERED code tables per demo state (header labels + column widths, row heights) → CODE for balance.js.
// Usage: node --experimental-websocket --no-warnings tools/figma/ekyc-library-pass/measure-code-tables.mjs jobs.json out.json   (jobs = [["ek-04",1920],…]; prototype on :8935)
import { spawn } from "node:child_process";
import fs from "node:fs";
const jobs = JSON.parse(fs.readFileSync(process.argv[2], "utf8")); // [[state,width],...]
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9300 + Math.floor(Math.random() * 300);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/ekm-${port}`, "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target; for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === "page"); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener("open", r));
let seq = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || { error: m.error }); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++seq; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }))?.result?.value;
await send("Runtime.enable"); await send("Page.enable");
const out = {};
for (const [state, W] of jobs) {
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: 1024, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: `http://localhost:8935/e-permits-acte-permisive.html?state=${state}` });
  for (let i = 0; i < 100; i++) { await sleep(150); if (await evaluate("document.documentElement.dataset.demoState")) break; }
  await sleep(900);
  out[state] = await evaluate(`[...document.querySelectorAll("table")].filter(t => t.getClientRects().length).map(t => {
    const ths = [...t.querySelectorAll("thead th")].filter(th => th.getClientRects().length);
    const rows = [...t.querySelectorAll("tbody tr")].filter(r => r.getClientRects().length);
    const wrap = t.parentElement;
    return { w: Math.round(t.getBoundingClientRect().width), vis: wrap.clientWidth, cols: ths.map(th => [th.textContent.trim(), Math.round(th.getBoundingClientRect().width*10)/10]), rowH: rows.map(r => Math.round(r.getBoundingClientRect().height)), headH: t.querySelector("thead tr") ? Math.round(t.querySelector("thead tr").getBoundingClientRect().height) : 0 };
  })`);
  process.stderr.write(state + " ");
}
fs.writeFileSync(process.argv[3], JSON.stringify(out));
ws.close(); chrome.kill(); process.exit(0);
