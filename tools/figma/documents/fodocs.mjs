import { spawn } from "node:child_process";
const [W, SETTLE, ...STATES] = process.argv.slice(2);
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9400 + Math.floor(Math.random() * 90);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/fd-${port}`, "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target; for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === "page"); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener("open", r));
let seq = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || { error: m.error }); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++seq; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }))?.result?.value;
await send("Runtime.enable"); await send("Page.enable");
const out = {};
for (const it of STATES) {
  const [st, page = "e-permits-acte-permisive.html"] = it.split("@");
  await send("Emulation.setDeviceMetricsOverride", { width: Number(W), height: 1024, deviceScaleFactor: 1, mobile: Number(W) < 600 });
  await send("Page.navigate", { url: `http://localhost:8935/${page}?state=${st}&r=${Math.random()}` });
  for (let i = 0; i < 100; i++) { await sleep(150); if (await evaluate("document.documentElement.dataset.demoState")) break; }
  await sleep(Number(SETTLE));
  out[st] = await evaluate(`(() => {
    const T = (e) => e ? e.textContent.replace(/\\s+/g, " ").trim() : "";
    const cards = [...document.querySelectorAll(".e-permits-fo-lib-item, .e-permits-fo-confirm-file--doc, .e-permits-fo-mdocs__attachment, .e-permits-fo-doc-attached-item, .cab-doc")].filter(e => !e.closest("[hidden]")).filter(e => e.getClientRects().length);
    return cards.map(c => ({ cls: c.className.split(" ").slice(0, 3).join("."), sel: c.classList.contains("is-selected"), icon: (c.querySelector("img")?.getAttribute("src") || "").replace(/.*\\//, ""), title: T(c.querySelector(".e-permits-fo-lib-item__title")), tags: [...c.querySelectorAll(".status-tag, .e-permits-fo-lib-item__badge")].map(T), meta: [...c.querySelectorAll(".e-permits-fo-lib-item__meta > span:not(.e-permits-fo-lib-item__dot)")].map(T), acts: [...c.querySelectorAll("button, a.btn")].map(b => T(b) || b.getAttribute("aria-label")) }));
  })()`);
}
console.log(JSON.stringify(out));
ws.close(); chrome.kill(); process.exit(0);
