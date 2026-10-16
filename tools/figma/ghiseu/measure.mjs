// Ghișeu (2026-10-16) · measure rendered DOM boxes for Figma comparison.
// node --experimental-websocket --no-warnings tools/figma/ghiseu/measure.mjs <state> "<css selector>" [width=1440] [depth=4] [max=3]
// Prints per matched element a compact tree: tag.class  x,y w×h  pad  gap  radius  border  font  text.
import { spawn } from "node:child_process";
const [state, sel, W = "1440", DEPTH = "4", MAX = "3"] = process.argv.slice(2);
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
await send("Emulation.setDeviceMetricsOverride", { width: +W, height: 1024, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: `http://localhost:8935/e-permits-acte-permisive.html?state=${state}` });
for (let i = 0; i < 100; i++) { await sleep(120); if (await evaluate("document.documentElement.dataset.demoState")) break; }
await sleep(1500);
const EXPR = `(() => { const out = []; const els = [...document.querySelectorAll(${JSON.stringify(sel)})].filter((e) => e.getClientRects().length).slice(0, ${+MAX});
  const f = (el, d, pre) => { const cs = getComputedStyle(el), b = el.getBoundingClientRect(); if (!b.width) return;
    const cls = (typeof el.className === "string" ? el.className : "").split(" ").filter(Boolean).slice(0, 2).join(".");
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").slice(0, 40);
    out.push(pre + el.tagName.toLowerCase() + (cls ? "." + cls : "") + "  " + Math.round(b.x) + "," + Math.round(b.y) + " " + Math.round(b.width) + "x" + Math.round(b.height) +
      "  p" + [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(parseFloat).join("/") + (cs.gap !== "normal" ? " gap" + cs.gap : "") + (parseFloat(cs.borderRadius) ? " r" + cs.borderRadius : "") +
      (parseFloat(cs.borderTopWidth) ? " b" + cs.borderTopWidth + " " + cs.borderTopColor : "") + (cs.backgroundColor !== "rgba(0, 0, 0, 0)" ? " bg" + cs.backgroundColor : "") +
      (parseFloat(cs.marginTop) || parseFloat(cs.marginBottom) ? " m" + cs.marginTop + "/" + cs.marginBottom : "") + (own ? "  f" + cs.fontSize + "/" + cs.lineHeight + " w" + cs.fontWeight + " " + cs.color + ' "' + own + '"' : ""));
    if (d < ${+DEPTH}) for (const c of el.children) f(c, d + 1, pre + "  "); };
  for (const e of els) { f(e, 0, ""); out.push("----"); } return out.join("\\n"); })()`;
console.log(await evaluate(EXPR));
ws.close(); chrome.kill(); process.exit(0);
