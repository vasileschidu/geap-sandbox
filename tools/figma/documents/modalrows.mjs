import { spawn } from "node:child_process";
const [W="1920", SETTLE="2500", ...STATES] = process.argv.slice(2);
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9000 + Math.floor(Math.random() * 90);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/mr-${port}`, "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target; for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === "page"); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener("open", r));
let seq = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || { error: m.error }); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++seq; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }))?.result?.value;
await send("Runtime.enable"); await send("Page.enable");
for (const st of STATES) {
await send("Emulation.setDeviceMetricsOverride", { width: Number(W), height: 1024, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: `http://localhost:8935/e-permits-acte-permisive.html?state=${st}&r=${Math.random()}` });
for (let i = 0; i < 100; i++) { await sleep(150); if (await evaluate("document.documentElement.dataset.demoState")) break; }
await sleep(Number(SETTLE));
const r = await evaluate(`(() => {
  const T = (e) => e ? e.textContent.replace(/\\s+/g, " ").trim() : "";
  const dlg = [...document.querySelectorAll("#dosar-detail-modal .modal, #dosar-detail-modal [role=dialog], #dosar-detail-modal")].filter(m => m.getClientRects().length && m.getBoundingClientRect().width > 300 && getComputedStyle(m).visibility!=="hidden");
  const m = dlg[dlg.length-1]; if (!m) return {st: ${JSON.stringify(st)}, none: true};
  const rect = m.getBoundingClientRect();
  const rows = [...m.querySelectorAll(".e-permits-dosar-profil__card .e-permits-dosar-profil__row")].map(r => ({ l: T(r.firstElementChild), v: T(r.lastElementChild).replace(/\\s*Copiază.*$/, ""), tags: [...r.querySelectorAll("[class*=tag]")].map(T) }));
  return { st: ${JSON.stringify(st)}, w: Math.round(rect.width), h: Math.round(rect.height), title: T(m.querySelector("h2, .modal-title, [class*=title]")), sub: T(m.querySelector("[class*=subtitle], .modal-header p")), headings: [...m.querySelectorAll("h3, h4")].map(T), rows, footer: [...m.querySelectorAll("footer button, .modal-footer button, [class*=footer] button")].map(T), page: T(m.querySelector(".e-permits-dtpl__page")).slice(0, 400) };
})()`);
console.log(JSON.stringify(r));
}
ws.close(); chrome.kill(); process.exit(0);
