// Act row („Ce vrei să soliciți?” / Ghișeu „Dosar nou”) — measures the rendered code per demo state:
// row box + paddings + colours, icon, title, tag, meta parts, pending notice, trigger, open menu (items,
// disabled, reason), „Solicitare nouă” card, „sau” separator, acts title, subject line. + element PNGs.
// Usage: node --experimental-websocket --no-warnings tools/figma/act-row/measure-act-rows.mjs \
//   --states pp-02,pp-02a,gh-02i [--widths 1440,375] [--out dir]
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const arg = (n, d) => { const i = process.argv.indexOf("--" + n); return i > -1 ? process.argv[i + 1] : d; };
const BASE = arg("base", "http://localhost:8935");
const states = arg("states", "pp-02").split(",");
const widths = arg("widths", "1440").split(",").map(Number);
const OUT = arg("out", "/tmp/act-row-measure");
fs.mkdirSync(OUT, { recursive: true });
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9300 + Math.floor(Math.random() * 300);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/actrow-cdp-${port}`, "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let target;
for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(x => x.type === "page"); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener("open", r));
let seq = 0; const pend = new Map();
ws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || { error: m.error }); pend.delete(m.id); } });
const send = (method, params = {}) => new Promise(r => { const i = ++seq; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async x => (await send("Runtime.evaluate", { expression: x, awaitPromise: true, returnByValue: true }))?.result?.value;
await send("Runtime.enable"); await send("Page.enable");
const COLLECT = `(() => {
  const R = el => { if (!el) return null; const r = el.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width*10)/10, Math.round(r.height*10)/10]; };
  const S = (el, keys) => { if (!el) return null; const c = getComputedStyle(el); const o = {}; for (const k of keys) o[k] = c[k]; return o; };
  const box = ["padding","gap","rowGap","borderTop","borderRadius","backgroundColor","boxShadow","display","gridTemplateColumns","flexDirection","alignItems"];
  const txt = ["fontSize","lineHeight","fontWeight","color"];
  const rows = [...document.querySelectorAll(".e-permits-fo-intent-act")].filter(r => r.getBoundingClientRect().width > 0).map(row => {
    const q = s => row.querySelector(s);
    const trig = q("[data-fo-intent-trigger]"); const menu = q(".e-permits-fo-intent-menu");
    const pendEl = q(".e-permits-fo-intent-act__pending");
    return {
      id: row.dataset.foIntentAct, cls: row.className, rect: R(row), style: S(row, box), hover: row.matches(":hover"),
      icon: R(q(".e-permits-fo-lib-item__icon")), content: [R(q(".e-permits-fo-lib-item__content")), S(q(".e-permits-fo-lib-item__content"), box)],
      title: [q(".e-permits-fo-lib-item__title")?.textContent, R(q(".e-permits-fo-lib-item__title")), S(q(".e-permits-fo-lib-item__title"), txt)],
      titleRow: [R(q(".e-permits-fo-doc-title-row")), S(q(".e-permits-fo-doc-title-row"), box)],
      tag: [q(".status-tag")?.textContent, q(".status-tag")?.className, R(q(".status-tag"))],
      meta: [R(q(".e-permits-fo-doc-meta")), [...row.querySelectorAll(".e-permits-fo-doc-meta__part")].map(p => [p.textContent, R(p)]), S(q(".e-permits-fo-doc-meta__part"), txt)],
      pending: pendEl ? [pendEl.textContent.trim(), R(pendEl), S(pendEl, [...box, ...txt]), pendEl.parentElement.className] : null,
      trigger: trig ? [trig.textContent.trim(), R(trig), trig.disabled, trig.getAttribute("aria-expanded"), S(trig, [...box, ...txt]), trig.matches(":hover")] : null,
      menu: menu && !menu.hidden ? [R(menu), S(menu, box), [...menu.querySelectorAll(".e-permits-fo-intent-menu__item")].map(it => [it.textContent.trim(), it.querySelector("use")?.getAttribute("href")?.split("#")[1], it.getAttribute("aria-disabled"), it.dataset.tooltipReason || "", R(it), it.matches(":hover"), S(it, txt).color])] : null,
    };
  });
  const nw = document.querySelector(".e-permits-fo-intent-new");
  const sep = document.querySelector(".e-permits-fo-intent__separator");
  const at = document.querySelector(".e-permits-fo-intent__acts-title");
  const sub = document.querySelector(".e-permits-fo-intent__subject");
  const tip = [...document.querySelectorAll("[role=tooltip], .tooltip")].filter(t => t.getBoundingClientRect().width > 0).map(t => [t.textContent.trim(), R(t)]);
  return { rows, newCard: nw ? [R(nw), S(nw, box), nw.innerText, nw.matches(":hover"), nw.className] : null, sep: sep ? [R(sep), sep.innerText] : null, actsTitle: at ? [R(at), at.innerText, S(at, txt)] : null, subject: sub ? [R(sub), sub.innerText] : null, list: R(document.querySelector(".e-permits-fo-intent__list")), tips: tip };
})()`;
const all = {};
for (const st of states) for (const w of widths) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: w < 500 ? 812 : 900, deviceScaleFactor: 2, mobile: w < 500 });
  await send("Page.navigate", { url: `${BASE}/e-permits-acte-permisive.html?state=${st}` });
  for (let i = 0; i < 120; i++) { await sleep(150); if (await ev("document.documentElement.dataset.demoState")) break; }
  await sleep(1200);
  const info = await ev(COLLECT);
  all[`${st}@${w}`] = info;
  // element screenshot of the rows area (list) incl. the open menu
  const r = await ev(`(() => { const l = document.querySelector('.e-permits-fo-intent__acts') || document.querySelector('.e-permits-fo-intent-act'); if (!l) return null; const b = l.getBoundingClientRect(); const m = document.querySelector('.e-permits-fo-intent-menu:not([hidden])'); const mb = m ? m.getBoundingClientRect() : b; const top = Math.min(b.top, mb.top) + scrollY - 8; return { x: Math.max(0, b.left - 8), y: Math.max(0, top), w: b.width + 16, h: Math.max(b.bottom, mb.bottom) - Math.min(b.top, mb.top) + 16 }; })()`);
  if (r) { const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: r.x, y: r.y, width: r.w, height: r.h, scale: 1 } }); if (shot.data) fs.writeFileSync(path.join(OUT, `${st}@${w}.png`), Buffer.from(shot.data, "base64")); }
  console.log(st, w, info?.rows?.length, "rows");
}
fs.writeFileSync(path.join(OUT, "measure.json"), JSON.stringify(all, null, 1));
console.log("OUT", OUT); ws.close(); chrome.kill();
