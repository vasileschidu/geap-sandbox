// Ghișeu icon pass (2026-10-16, from the eKYC collector) — also <img src=*.svg> and CSS mask-image icons.
// eKYC icon pass (2026-10-14) · every visible sprite icon per demo state from the rendered prototype:
// [spriteId, w, h, computed colour, context text (nearest ancestor with text, 60 chars), parent class] → JSON.
// Used to map captured raw h2d-svg icons in Figma to the code's glyph (match by state + context + size).
// Usage: node --experimental-websocket --no-warnings tools/figma/ekyc-library-pass/collect-code-icons.mjs states.json out.json [width]
import { spawn } from "node:child_process";
import fs from "node:fs";
const states = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const W = Number(process.argv[4] || 1920);
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9400 + Math.floor(Math.random() * 300);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/ekc-${port}`, "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target; for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === "page"); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener("open", r));
let seq = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++seq; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }))?.result?.value;
await send("Runtime.enable"); await send("Page.enable");
const out = {};
const EXPR = `(() => { const r = []; for (const u of document.querySelectorAll("svg use")) { const s = u.closest("svg"); const b = s.getBoundingClientRect(); if (!b.width || !s.getClientRects().length) continue; const id = (u.getAttribute("href") || u.getAttribute("xlink:href") || "").split("#").pop().replace(/^icon-/, "");
  let a = s.parentElement, ctx = ""; for (let d = 0; a && d < 8; a = a.parentElement, d++) { const t = (a.innerText || "").trim(); if (t) { ctx = t.replace(/\\s+/g, " ").slice(0, 60); break; } }
  r.push([id, Math.round(b.width), Math.round(b.height), getComputedStyle(s).color, ctx, (s.parentElement.className && s.parentElement.className.baseVal === undefined ? s.parentElement.className : "").slice(0, 60), Math.round(b.x), Math.round(b.y)]); } for (const el of document.querySelectorAll("img, span, i, div, button, a")) { const cs = getComputedStyle(el); let id = ""; if (el.tagName === "IMG" && /\\.svg/.test(el.src)) id = "img:" + el.src.split("/").pop(); else if (cs.maskImage && cs.maskImage.includes("url(")) id = "mask:" + cs.maskImage.split("/").pop().replace(/[")]/g, ""); else if (cs.webkitMaskImage && cs.webkitMaskImage.includes("url(")) id = "mask:" + cs.webkitMaskImage.split("/").pop().replace(/[")]/g, ""); if (!id) continue; const b = el.getBoundingClientRect(); if (!b.width || !el.getClientRects().length || b.width > 64) continue;
  let a = el.parentElement, ctx = ""; for (let d = 0; a && d < 8; a = a.parentElement, d++) { const t = (a.innerText || "").trim(); if (t) { ctx = t.replace(/\\s+/g, " ").slice(0, 60); break; } }
  r.push([id, Math.round(b.width), Math.round(b.height), cs.color, ctx, String(el.className || "").slice(0, 60), Math.round(b.x), Math.round(b.y)]); } return r; })()`;
for (const st of states) {
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: 1024, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: `http://localhost:8935/e-permits-acte-permisive.html?state=${st}` });
  for (let i = 0; i < 100; i++) { await sleep(120); if (await evaluate("document.documentElement.dataset.demoState")) break; }
  await sleep(900);
  out[st] = await evaluate(EXPR);
  process.stderr.write(".");
}
fs.writeFileSync(process.argv[3], JSON.stringify(out));
ws.close(); chrome.kill(); process.exit(0);
