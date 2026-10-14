// eKYC library pass round 9 (2026-10-14) · collect visible button label → icon id per demo state from the rendered prototype → glyph-map.json (for sweep.js glyph check).
// Usage: node --experimental-websocket --no-warnings tools/figma/ekyc-library-pass/collect-code-glyphs.mjs jobs.json out.json  (jobs = [["ek-29",1920],…])
import { spawn } from "node:child_process";
import fs from "node:fs";
const jobs = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9400 + Math.floor(Math.random() * 300);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/ekg-${port}`, "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target; for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === "page"); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener("open", r));
let seq = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++seq; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }))?.result?.value;
await send("Runtime.enable"); await send("Page.enable");
const map = {};
for (const [state, W] of jobs) {
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: 1024, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: `http://localhost:8935/e-permits-acte-permisive.html?state=${state}` });
  for (let i = 0; i < 100; i++) { await sleep(120); if (await evaluate("document.documentElement.dataset.demoState")) break; }
  await sleep(700);
  const r = await evaluate(`[...document.querySelectorAll("button, a.btn, .btn")].filter(e => e.getClientRects().length && e.innerText.trim()).map(e => { const u = e.querySelector("use"); const h = u ? (u.getAttribute("href") || u.getAttribute("xlink:href") || "") : ""; return [e.innerText.trim().replace(/\\s+/g, " ").slice(0, 60), h ? h.split("#icon-").pop() : "none"]; })`);
  for (const [l, ic] of r || []) { (map[l] = map[l] || {}); map[l][ic] = (map[l][ic] || 0) + 1; }
  process.stderr.write(".");
}
fs.writeFileSync(process.argv[3], JSON.stringify(map, null, 0));
ws.close(); chrome.kill(); process.exit(0);
