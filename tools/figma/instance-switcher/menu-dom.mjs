// usage: node --experimental-websocket tools/figma/instance-switcher/menu-dom.mjs <state> [width] [page]
// Dumps the open header instance-switcher (trigger + menu) as a compact box/style tree, for building the Figma components.
import { spawn } from "node:child_process";
const [st, wArg, pageArg] = process.argv.slice(2);
const W = Number(wArg || 1440), mob = W < 721;
const page = pageArg || "e-permits-acte-permisive.html";
const port = 9500 + Math.floor(Math.random() * 300);
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/isw-cdp-${port}`, "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let t; for (let i = 0; i < 60 && !t; i++) { await sleep(250); try { t = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(x => x.type === "page"); } catch {} }
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener("open", r));
let seq = 0; const pend = new Map();
ws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || { error: m.error }); pend.delete(m.id); } });
const send = (method, params = {}) => new Promise(r => { const i = ++seq; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async x => (await send("Runtime.evaluate", { expression: x, awaitPromise: true, returnByValue: true }))?.result?.value;
await send("Runtime.enable"); await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: 900, deviceScaleFactor: 1, mobile: mob });
await send("Page.navigate", { url: `http://localhost:8935/${page}?state=${st}` });
for (let i = 0; i < 100; i++) { await sleep(150); if (await ev("document.documentElement.dataset.demoState")) break; }
await sleep(1200);
const out = await ev(`(() => {
  const vis = el => el && el.getBoundingClientRect().width > 0;
  const trig = [...document.querySelectorAll("[data-fo-avatar-trigger], [data-user-trigger], .e-permits-shell__user-trigger, .e-permits-fo-auth__avatar")].find(vis);
  const menu = [...document.querySelectorAll("[data-fo-avatar-dropdown], [data-user-panel], .e-permits-shell__profile-menu, .e-permits-fo-avatar-menu")].find(vis);
  const o = trig.getBoundingClientRect();
  const lines = [];
  const walk = (el, d) => {
    if (!vis(el)) return;
    const b = el.getBoundingClientRect(), c = getComputedStyle(el);
    const own = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(" ");
    const bits = [el.tagName.toLowerCase() + "." + [...el.classList].map(x => x.replace(/^e-permits-/, "")).join(".")];
    bits.push(Math.round(b.left - o.left) + "," + Math.round(b.top - o.top) + " " + Math.round(b.width) + "x" + Math.round(b.height));
    if (c.backgroundColor !== "rgba(0, 0, 0, 0)") bits.push("bg=" + c.backgroundColor);
    if (parseFloat(c.borderTopWidth) || parseFloat(c.borderBottomWidth)) bits.push("bd=" + [c.borderTopWidth, c.borderRightWidth, c.borderBottomWidth, c.borderLeftWidth].join("/") + " " + c.borderTopColor + "|" + c.borderBottomColor);
    if (c.borderRadius !== "0px") bits.push("r=" + c.borderRadius);
    if (c.padding !== "0px") bits.push("p=" + c.padding);
    if (c.display.includes("flex") && c.gap !== "normal") bits.push("gap=" + c.gap + " " + c.flexDirection);
    if (c.boxShadow !== "none") bits.push("sh=" + c.boxShadow.slice(0, 90));
    if (own) bits.push("txt='" + own.slice(0, 40) + "' " + c.fontSize + "/" + c.lineHeight + " w" + c.fontWeight + " " + c.color);
    lines.push("  ".repeat(d) + bits.join(" "));
    for (const ch of el.children) walk(ch, d + 1);
  };
  walk(trig, 0); lines.push("--- menu"); walk(menu, 0);
  return lines.join("\\n");
})()`);
console.log(out);
ws.close(); chrome.kill(); process.exit(0);
