import { spawn } from "node:child_process";
const [STATE, SEL, W="1920", SETTLE="1500", PAGE="e-permits-acte-permisive.html"] = process.argv.slice(2);
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9100 + Math.floor(Math.random() * 200);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/rs-${port}`, "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target; for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === "page"); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener("open", r));
let seq = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || { error: m.error }); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++seq; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }))?.result?.value;
await send("Runtime.enable"); await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: Number(W), height: 1024, deviceScaleFactor: 1, mobile: Number(W) < 600 });
await send("Page.navigate", { url: `http://localhost:8935/${PAGE}?state=${STATE}` });
for (let i = 0; i < 100; i++) { await sleep(150); if (await evaluate("document.documentElement.dataset.demoState")) break; }
await sleep(Number(SETTLE));
const r = await evaluate(`(() => {
  const root = document.querySelector(${JSON.stringify(SEL)}); if (!root) return "nf";
  const rr = root.getBoundingClientRect();
  const out = [];
  const walk = (e, d) => { if (d > 9) return; const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); if (!r.width) return;
    const own = [...e.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(" ").slice(0, 60);
    out.push("  ".repeat(d) + e.tagName.toLowerCase() + "." + [...e.classList].slice(0,3).join(".") + " " + [r.x - rr.x, r.y - rr.y, r.width, r.height].map(Math.round).join(",") +
      " p" + [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(parseFloat).join("/") + " gap" + cs.gap + " " + cs.display + (cs.flexWrap==="wrap"?" wrap":"") +
      (own ? " f" + cs.fontSize + "/" + cs.lineHeight + " w" + cs.fontWeight + " c" + cs.color + ' "' + own + '"' : "") + (cs.backgroundColor !== "rgba(0, 0, 0, 0)" ? " bg" + cs.backgroundColor : "") + (cs.borderTopWidth !== "0px" ? " bt" + cs.borderTopWidth + cs.borderTopColor : "") + (cs.borderRadius !== "0px" ? " r" + cs.borderRadius : "") + (cs.whiteSpace!=="normal"?" ws"+cs.whiteSpace:"") + (cs.textOverflow==="ellipsis"?" ELL":""));
    for (const c of e.children) walk(c, d + 1); };
  walk(root, 0); return out.join("\\n");
})()`);
console.log(r);
ws.close(); chrome.kill(); process.exit(0);
