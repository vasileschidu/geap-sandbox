// usage: node --experimental-websocket docrows.mjs OUT.json WIDTH SETTLE state[@sectionSelector] ...
import { spawn } from "node:child_process";
import fs from "node:fs";
const [OUT, W, SETTLE, ...ITEMS] = process.argv.slice(2);
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9700 + Math.floor(Math.random() * 200);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/dr-${port}`, "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target; for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === "page"); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener("open", r));
let seq = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || { error: m.error }); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++seq; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }))?.result?.value;
await send("Runtime.enable"); await send("Page.enable");
const all = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
for (const it of ITEMS) {
  const [st, sel = ".e-permits-stack-section"] = it.split("@");
  await send("Emulation.setDeviceMetricsOverride", { width: Number(W), height: 1024, deviceScaleFactor: 1, mobile: Number(W) < 600 });
  await send("Page.navigate", { url: `http://localhost:8935/e-permits-acte-permisive.html?state=${st}&r=${Math.random()}` });
  for (let i = 0; i < 100; i++) { await sleep(150); if (await evaluate("document.documentElement.dataset.demoState")) break; }
  await sleep(Number(SETTLE));
  all[st] = await evaluate(`(() => {
    const T = (e) => e ? e.textContent.replace(/\\s+/g, " ").trim() : "";
    const secs = [...document.querySelectorAll(${JSON.stringify(sel)})].filter(s => s.getClientRects().length);
    return secs.map(sec => ({
      title: T(sec.querySelector("h2, h3, .e-permits-stack-section__title")),
      meta: T(sec.querySelector(".e-permits-stack-section__meta, [class*=section-meta]")),
      groups: [...sec.querySelectorAll(".e-permits-stack__group")].map(g => ({
        label: T(g.querySelector(".e-permits-stack__group-label, .e-permits-stack__group-header, header")).replace(/\\s*\\d+$/, ""),
        count: T(g.querySelector("[class*=count], .badge")),
        rows: [...g.querySelectorAll(".e-permits-stack__item")].map(li => {
          const img = li.querySelector("img, .e-permits-stack__lead svg use");
          const icon = img ? (img.getAttribute("src") || img.getAttribute("href") || "") : "";
          const tags = [...li.querySelectorAll(".e-permits-stack__title-row .e-permits-workplace__tag, .e-permits-stack__title-row .status-tag")].map(t => ({ label: T(t), tone: (t.className.match(/--(neutral|brand|success|danger|warning|accent|muted)/) || [])[1] || "neutral", icon: !!t.querySelector("svg") }));
          const parts = [...li.querySelectorAll(".e-permits-stack__meta")].map(m => [...m.querySelectorAll(":scope > .e-permits-stack__part")].map(p => T(p).replace(/\\s*Copiază.*$/, ""))).filter(a => a.length);
          const acts = [...li.querySelectorAll(".e-permits-stack__actions button")].map(b => ({ label: T(b) || b.getAttribute("aria-label"), cls: b.className, exp: b.getAttribute("aria-expanded") }));
          return { icon: /uploaded/.test(icon) ? "up" : /generated/.test(icon) ? "gen" : icon ? "other:" + icon.slice(-30) : "", title: T(li.querySelector(".e-permits-stack__title")), tags, parts, acts, hover: li.matches(":hover"), open: !!li.querySelector('[aria-expanded="true"]') };
        })
      }))
    }));
  })()`);
  console.log(st, JSON.stringify(all[st]).length);
}
fs.writeFileSync(OUT, JSON.stringify(all, null, 1));
ws.close(); chrome.kill(); process.exit(0);
