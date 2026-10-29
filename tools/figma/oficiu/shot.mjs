// Prototype screenshots for the Figma comparison (oficiu-board-v1, 2026-10-26).
// node --experimental-websocket --no-warnings tools/figma/oficiu/shot.mjs --out <dir> [--fit] [--width 1440] ofc-01 ofc-02 …
// One headless Chrome, one PNG per demo state (<dir>/<state>.png); --fit grows the viewport like capture-to-figma.mjs.
import { spawn } from "node:child_process"; import fs from "node:fs"; import path from "node:path";
const argv = process.argv.slice(2); const opt = (n, d) => { const i = argv.indexOf("--" + n); if (i < 0) return d; const v = argv[i + 1]; argv.splice(i, (v && !v.startsWith("--")) ? 2 : 1); return (v && !v.startsWith("--")) ? v : true; };
const OUT = opt("out", "/tmp/ofc-shots"); const FIT = Boolean(opt("fit", false)); const W = Number(opt("width", 1440)); const SETTLE = Number(opt("settle", 2500));
const FIT_SEL = ".e-permits-gh-sheet__body,.e-permits-gh-start__body,.e-permits-shell__canvas-surface,.e-permits-workplace__table-wrap,.modal-content";
const STATES = argv.filter((a) => !a.startsWith("--")); fs.mkdirSync(OUT, { recursive: true });
const port = 9300 + Math.floor(Math.random() * 200);
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/ofc-shot-${port}`, "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target; for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === "page"); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener("open", r));
let seq = 0; const pending = new Map(); ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || { error: m.error }); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++seq; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (x) => (await send("Runtime.evaluate", { expression: x, awaitPromise: true, returnByValue: true }))?.result?.value;
await send("Runtime.enable"); await send("Page.enable");
for (const st of STATES) {
  let H = 900; await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: `http://localhost:8935/e-permits-acte-permisive.html?state=${st}` });
  for (let i = 0; i < 120; i++) { await sleep(150); if (await ev("document.documentElement.dataset.demoState")) break; }
  await sleep(SETTLE);
  await ev(`(()=>{const s=document.head.appendChild(document.createElement("style"));s.textContent="*,*::before,*::after{transition:none!important;animation:none!important} .e-permits-fo-testcfg,.msup-bubble{display:none!important}";})()`);
  if (FIT) for (let k = 0; k < 4; k++) { const d = await ev(`Math.max(0,...[...document.querySelectorAll(${JSON.stringify(FIT_SEL)})].filter(e=>e.getClientRects().length).map(e=>e.scrollHeight-e.clientHeight))`); if (!d || d < 3) break; H += d; await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false }); await sleep(500); }
  const shot = await send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(path.join(OUT, st + ".png"), Buffer.from(shot.data, "base64"));
  console.log(st, H, await ev("document.documentElement.dataset.demoState"));
}
ws.close(); chrome.kill(); process.exit(0);
