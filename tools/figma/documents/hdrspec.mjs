import { spawn } from "node:child_process";
const STATES = process.argv.slice(2);
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9200 + Math.floor(Math.random() * 90);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/hs-${port}`, "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target; for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === "page"); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener("open", r));
let seq = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || { error: m.error }); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++seq; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }))?.result?.value;
await send("Runtime.enable"); await send("Page.enable");
const out = {};
for (const st of STATES) {
  await send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1024, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: `http://localhost:8935/e-permits-acte-permisive.html?state=${st}&r=${Math.random()}` });
  for (let i = 0; i < 100; i++) { await sleep(150); if (await evaluate("document.documentElement.dataset.demoState")) break; }
  await sleep(1200);
  out[st] = await evaluate(`(() => {
    const T = (e) => e ? e.textContent.replace(/\\s+/g, " ").trim() : "";
    const tabs = [...document.querySelectorAll("[data-dosar-tab]")].filter(t => t.getClientRects().length).map(t => ({ l: T(t).replace(/\\s*\\d+$/, ""), c: T(t.querySelector(".e-permits-page-header__tab-count")), w: !!t.querySelector("[class*=--warning]") || /warning/.test(t.innerHTML), a: t.getAttribute("aria-selected") === "true" || t.classList.contains("is-active") }));
    const hdr = document.querySelector(".e-permits-page-header") || document.body;
    const metaItems = [...hdr.querySelectorAll("[class*=meta-item], [class*=__meta] > div, dl > div")].map(d => T(d)).slice(0, 12);
    const btn = [...hdr.querySelectorAll("button.btn-primary, .btn-primary")].map(T).filter(Boolean)[0];
    const resp = [...hdr.querySelectorAll("*")].map(T).find(t => /^Responsabil/.test(t)) || "";
    const tags = [...hdr.querySelectorAll(".e-permits-workplace__tag, .status-tag")].map(t => T(t) + ":" + ((t.className.match(/--(success|danger|warning|brand|neutral|accent)/) || [])[1] || ""));
    const user = T(document.querySelector(".e-permits-shell__user-name, [class*=role-switch] [class*=name]"));
    return { title: T(hdr.querySelector("h1")), btn, resp, tags, metaItems, tabs, user };
  })()`);
}
console.log(JSON.stringify(out, null, 0));
ws.close(); chrome.kill(); process.exit(0);
