// UI QA — icon stroke weight. Rasterises every <symbol> of an SVG sprite in headless Chrome and measures
// the line thickness of its ink (Euclidean distance transform → ridge pixels → 2 × distance). Works for
// stroked symbols AND outlined (filled-path) strokes, so a „bold” icon is caught even without a stroke attribute.
// Project rule (2026-11-13): every Central / Foundations line icon = stroke 1.5 · radius 2 on its own grid.
//
// Usage: node --experimental-websocket --no-warnings tools/ui-qa/icon-stroke-audit.mjs \
//          [--sprite assets/icons/sprite.svg] [--only icon-eye,icon-export] [--ref icon-export] \
//          [--min 1.4] [--max 1.6] [--out tools/ui-qa/out/icon-stroke]
// Output: report.json (per symbol: viewBox, thickness in grid units, class) + sheet.png (16 / 20 / 24 renders,
// sorted by thickness, with the reference icon on every row). Exit 1 when a line icon is outside [min, max].
// „thickness” = the median line width in px when the symbol is shown in a 20 px box (the box is fitted like <svg
// width=20 height=20>, i.e. scaled by 20 / max(viewBox w, h)). Calibrated: the Foundations exports (25×24) and
// icon-export (stroke 1.5 on 20) both read 1.5 here = the Central „stroke 1.5” look; a stroke-2 symbol on a 24 grid
// reads 1.67, a stroke-2 symbol on a 20 grid 2.0. „native” = the same in the symbol's own units.
// Classes: line (thickness ≤ 2.4), solid (filled glyph, logo, flag — out of scope), empty.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const arg = (name, def) => { const i = process.argv.indexOf("--" + name); return i > -1 ? process.argv[i + 1] : def; };
const SPRITE = arg("sprite", "assets/icons/sprite.svg");
const OUT = arg("out", "tools/ui-qa/out/icon-stroke");
const ONLY = (arg("only", "") || "").split(",").filter(Boolean);
const REF = arg("ref", "icon-export");
const MIN = Number(arg("min", "1.4")), MAX = Number(arg("max", "1.6"));
const CHROME = arg("chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
fs.mkdirSync(OUT, { recursive: true });
const spriteText = fs.readFileSync(SPRITE, "utf8");

const PORT = 9800 + Math.floor(Math.random() * 150);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/ui-qa-icons-${PORT}`, "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const done = (code) => { try { chrome.kill(); } catch {} process.exit(code); };
setTimeout(() => { console.error("timeout"); done(2); }, 180000);
let target = null;
for (let i = 0; i < 40 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page"); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl);
let seq = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (pending.has(m.id)) { pending.get(m.id)(m.result || {}); pending.delete(m.id); } };
await new Promise((r) => (ws.onopen = r));
const send = (method, params = {}) => new Promise((r) => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.value;
await send("Page.enable"); await send("Runtime.enable");

/* in the page: parse the sprite, render each symbol at K px per unit, distance transform, ridge widths */
const MEASURE = `(async () => {
  const K = 16;
  const doc = new DOMParser().parseFromString(${JSON.stringify(spriteText)}, "image/svg+xml");
  const only = ${JSON.stringify(ONLY)};
  const syms = [...doc.querySelectorAll("symbol[id]")].filter((s) => !only.length || only.includes(s.id));
  const edt1 = (f, n) => { const d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1); let k = 0; v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
    for (let q = 1; q < n; q++) { let s; do { const p = v[k]; s = ((f[q] + q * q) - (f[p] + p * p)) / (2 * q - 2 * p); if (s <= z[k]) k--; else break; } while (k >= 0); k++; v[k] = q; z[k] = s; z[k + 1] = Infinity; }
    k = 0; for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) ** 2 + f[v[k]]; } return d; };
  const out = [];
  for (const s of syms) {
    const vb = (s.getAttribute("viewBox") || "0 0 24 24").trim().split(/[\\s,]+/).map(Number);
    const S = (20 * K) / Math.max(vb[2], vb[3]); /* px per unit when the symbol fills a 20 px box at K× */
    const W = Math.round(vb[2] * S), H = Math.round(vb[3] * S);
    const attrs = [...s.attributes].filter((a) => !["id", "viewBox"].includes(a.name)).map((a) => a.name + '="' + a.value + '"').join(" ");
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="' + vb.join(" ") + '" width="' + W + '" height="' + H + '" style="color:#000" ' + attrs + '>' + s.innerHTML + '</svg>';
    const img = new Image(); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    try { await img.decode(); } catch { out.push({ id: s.id, viewBox: vb.join(" "), cls: "error" }); continue; }
    const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d"); g.drawImage(img, 0, 0, W, H);
    const a = g.getImageData(0, 0, W, H).data; const ink = new Uint8Array(W * H); let inkN = 0;
    for (let i = 0; i < W * H; i++) if (a[i * 4 + 3] > 127) { ink[i] = 1; inkN++; }
    if (!inkN) { out.push({ id: s.id, viewBox: vb.join(" "), cls: "empty" }); continue; }
    /* squared EDT to the nearest background pixel (2-pass Felzenszwalb) */
    const INF = 1e12, D = new Float64Array(W * H);
    for (let x = 0; x < W; x++) { const f = new Float64Array(H); for (let y = 0; y < H; y++) f[y] = ink[y * W + x] ? INF : 0; const d = edt1(f, H); for (let y = 0; y < H; y++) D[y * W + x] = d[y]; }
    for (let y = 0; y < H; y++) { const f = D.slice(y * W, y * W + W); const d = edt1(f, W); for (let x = 0; x < W; x++) D[y * W + x] = Math.sqrt(d[x]); }
    const widths = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; const v = D[i]; if (v < 2) continue; let max = true;
      for (let dy = -1; dy <= 1 && max; dy++) for (let dx = -1; dx <= 1; dx++) { if ((dx || dy) && D[i + dy * W + dx] > v) { max = false; break; } }
      if (max) widths.push((2 * v) / K); }
    widths.sort((p, q) => p - q);
    const q = (p) => widths.length ? widths[Math.min(widths.length - 1, Math.floor(p * widths.length))] : 0;
    const med = q(0.5);
    const strokeAttr = (s.outerHTML.match(/stroke-width="([\\d.]+)"/g) || []).map((m) => Number(m.match(/[\\d.]+/)[0]));
    out.push({ id: s.id, viewBox: vb.join(" "), thickness: +med.toFixed(2), native: +(med * K / S).toFixed(2), p25: +q(0.25).toFixed(2), p75: +q(0.75).toFixed(2),
      inkShare: +(inkN / (W * H)).toFixed(3), strokeAttr: [...new Set(strokeAttr)], cls: med > 2.4 ? "solid" : "line" });
  }
  return out;
})()`;
await send("Page.navigate", { url: "about:blank" }); await sleep(300);
const rows = await ev(MEASURE);
if (!Array.isArray(rows)) { console.error("measure failed", rows); done(2); }
const isSolidName = (id) => /-filled$|(^icon-|-)logo(-|$)|^icon-flag-|^icon-(mpass|mpay|msign|evo|govmd)(-|$)/.test(id);
for (const r of rows) { if (r.cls === "line" && isSolidName(r.id)) r.cls = "solid"; r.ok = r.cls !== "line" || (r.thickness >= MIN && r.thickness <= MAX); }
fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(rows, null, 1));

/* contact sheet: thickest first; each row = symbol at 16 / 20 / 24 next to the reference */
const lines = rows.filter((r) => r.cls === "line").sort((p, q) => q.thickness - p.thickness);
const cell = (id, sz) => `<svg width="${sz}" height="${sz}"><use href="#${id}"/></svg>`;
const html = `<!doctype html><meta charset="utf-8"><style>body{font:12px/16px -apple-system,sans-serif;margin:16px;color:#121212}
  .r{display:grid;grid-template-columns:200px 60px repeat(6,32px);align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid #eee}
  .bad{background:#fff1f0}.ref{color:#888}svg{color:#121212}</style>
  <div style="display:none">${spriteText}</div>
  <h3>Icon stroke audit · line icons, thickest first · reference ${REF} (grey cells)</h3>
  ${lines.map((r) => `<div class="r ${r.ok ? "" : "bad"}"><span>${r.id}</span><b>${r.thickness}</b>${cell(r.id, 16)}${cell(r.id, 20)}${cell(r.id, 24)}<span class="ref">${cell(REF, 16)}</span><span class="ref">${cell(REF, 20)}</span><span class="ref">${cell(REF, 24)}</span></div>`).join("")}`;
const sheet = path.resolve(OUT, "sheet.html"); fs.writeFileSync(sheet, html);
await send("Emulation.setDeviceMetricsOverride", { width: 760, height: 900, deviceScaleFactor: 2, mobile: false });
await send("Page.navigate", { url: "file://" + sheet }); await sleep(800);
const h = await ev("document.documentElement.scrollHeight");
await send("Emulation.setDeviceMetricsOverride", { width: 760, height: Math.min(h, 16000), deviceScaleFactor: 2, mobile: false }); await sleep(300);
const shot = await send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync(path.join(OUT, "sheet.png"), Buffer.from(shot.data, "base64"));

const bad = rows.filter((r) => !r.ok);
const ref = rows.find((r) => r.id === REF);
console.log(`symbols ${rows.length} · line ${lines.length} · solid ${rows.filter((r) => r.cls === "solid").length} · reference ${REF} = ${ref ? ref.thickness : "—"}`);
console.log(`outside [${MIN}, ${MAX}]: ${bad.length}`);
for (const r of bad.sort((p, q) => q.thickness - p.thickness)) console.log(`  ${r.id.padEnd(34)} ${String(r.thickness).padEnd(5)} native ${String(r.native).padEnd(5)} vb ${r.viewBox}${r.strokeAttr.length ? " · stroke-width " + r.strokeAttr.join("/") : ""}`);
console.log(`→ ${path.join(OUT, "report.json")} · ${path.join(OUT, "sheet.png")}`);
done(bad.length ? 1 : 0);
