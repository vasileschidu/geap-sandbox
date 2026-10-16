// Ghișeu (2026-10-16) · per demo state: every visible button / link-button with label (or aria-label), btn classes and icon id
// → buttons.json; used to map captured buttons to library variants + icons (swap-ghiseu.js ICON map).
// Usage: node --experimental-websocket --no-warnings tools/figma/ghiseu/collect-buttons.mjs states.txt out.json [width]
import { spawn } from "node:child_process";
import fs from "node:fs";
const states = fs.readFileSync(process.argv[2], "utf8").split(/\s+/).filter(Boolean);
const W = Number(process.argv[4] || 1440);
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9300 + Math.floor(Math.random() * 300);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/ghb-${port}`, "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target; for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === "page"); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener("open", r));
let seq = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++seq; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }))?.result?.value;
await send("Runtime.enable"); await send("Page.enable");
const out = {};
for (const state of states) {
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: 900, deviceScaleFactor: 1, mobile: W < 600 });
  await send("Page.navigate", { url: `http://localhost:8935/e-permits-acte-permisive.html?state=${state}` });
  for (let i = 0; i < 120; i++) { await sleep(150); if (await evaluate("document.documentElement.dataset.demoState")) break; }
  await sleep(1200);
  out[state] = await evaluate(`(() => {
    const vis = (e) => e.getClientRects().length && getComputedStyle(e).visibility !== "hidden" && !e.closest("[hidden]");
    const icon = (e) => { const u = e.querySelector("use"); if (u) return (u.getAttribute("href") || u.getAttribute("xlink:href") || "").split("#").pop(); const m = [...e.querySelectorAll("[class*=icon-]")].map(x => [...x.classList].find(c => c.startsWith("icon-"))).filter(Boolean)[0]; return m || ""; };
    return [...document.querySelectorAll("button, a.btn, .btn, a.link")].filter(vis).map(e => ({
      t: (e.innerText || "").trim().replace(/\\s+/g, " ").slice(0, 60), a: e.getAttribute("aria-label") || "", c: [...e.classList].filter(c => /^btn|^link|modal-close|segment/.test(c)).join(" "), i: icon(e), d: e.disabled || e.getAttribute("aria-disabled") === "true" ? 1 : 0, x: e.getAttribute("aria-expanded") === "true" ? 1 : 0
    }));
  })()`);
  process.stderr.write(".");
}
fs.writeFileSync(process.argv[3], JSON.stringify(out));
ws.close(); chrome.kill(); process.exit(0);
