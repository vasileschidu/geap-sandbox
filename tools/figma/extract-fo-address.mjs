// Extract the FO cascade-address spec (US-54) from a prototype demo state, for
// tools/figma/build-fo-address.js. Usage:
//   node --experimental-websocket --no-warnings tools/figma/extract-fo-address.mjs <state> [width=1440] [rootSelector]
// width 375 = mobile (Large fields). rootSelector default "[data-fo-step-panel='2'] [data-fo-cascade-address]"
// (Form Designer preview: "[data-builder-preview-grid] [data-fo-cascade-address]"). Prints JSON.
// Needs the prototype on http://localhost:8935 and Google Chrome.
import { spawn } from "node:child_process";
const [state, width, rootSel] = process.argv.slice(2); const page = "e-permits-acte-permisive.html";
const EXTRACT = String.raw`(() => {
  const ROOTSEL = window.__ROOTSEL || "[data-fo-step-panel='2'] [data-fo-cascade-address]";
  const root = document.querySelector(ROOTSEL);
  if (!root) return { error: "no root" };
  const vis = (el) => el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden" && !el.closest("[hidden]");
  const t = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");
  const rb = root.getBoundingClientRect();
  const lab = (f) => { const l = f.querySelector(":scope > label"); if (!l) return { label: "", req: false }; const c = l.cloneNode(true); c.querySelectorAll(".e-permits-fo-required").forEach((x) => x.remove()); return { label: t(c), req: Boolean(l.querySelector(".e-permits-fo-required")) }; };
  // search
  const sf = root.querySelector(".e-permits-fo-cascade-address__search")?.closest(".e-permits-fo-field") || root.querySelector(".e-permits-fo-field");
  const si = sf.querySelector("input.input");
  const sbox = sf.querySelector(".search-input");
  const msg = sf.querySelector("[data-fo-cadastral-search-hint]") || sf.querySelector(".e-permits-fo-field__hint");
  const mc = msg ? msg.className : "";
  const tone = !msg ? null : /__loading/.test(mc) ? "loading" : /message--success/.test(mc) ? "success" : /message--error/.test(mc) ? "error" : /message--warning/.test(mc) ? "warning" : "hint";
  const list = sf.querySelector(".e-permits-fo-address-search__list");
  const listOpen = vis(list);
  const options = listOpen ? [...list.querySelectorAll("li")].filter(vis).map((li) => ({ title: t(li.querySelector(".e-permits-fo-address-search__title, strong, [class*='title']")) || t(li), meta: t(li.querySelector("[class*='meta'], small, span + span")), empty: li.matches(".e-permits-fo-caem__empty"), hl: li.matches(".is-active,[aria-selected='true']"), icon: (li.querySelector("use") || { getAttribute: () => "" }).getAttribute("href").includes("search") ? "search" : "home" })) : [];
  const search = { ...lab(sf), value: si.value, placeholder: si.placeholder, focus: document.activeElement === si, error: sbox.classList.contains("is-error"), clear: vis(sf.querySelector(".btn-icon.clear")), size: sbox.classList.contains("large") ? "Large" : "Medium",
    message: msg && vis(msg) ? { tone, text: t(msg) } : null, listOpen, options, w: Math.round(sf.getBoundingClientRect().width) };
  // grid fields
  const grid = root.querySelector(".e-permits-fo-cascade-address__grid") || root;
  const fields = [...grid.querySelectorAll(".e-permits-fo-field")].filter((f) => f !== sf && !sf.contains(f) && vis(f) && f.querySelector(":scope > label"));
  const out = fields.map((f) => {
    const r = f.getBoundingClientRect(); const L = lab(f);
    const o = { ...L, x: Math.round(r.x - rb.x), y: Math.round(r.y - rb.y), w: Math.round(r.width) };
    if (f.classList.contains("is-srre-loading")) return { ...o, kind: "skeleton" };
    const sbx = f.querySelector(".search-input");
    if (sbx && vis(sbx) && f !== sf) {
      const si2 = sbx.querySelector("input"); const pm = [...f.querySelectorAll(":scope > p")].find((p) => vis(p) && !p.classList.contains("u-visually-hidden") && t(p)); const pc = pm ? pm.className : "";
      const msg = pm ? { tone: /__loading/.test(pc) ? "loading" : /message--success/.test(pc) ? "success" : /message--error/.test(pc) ? "error" : /message--warning/.test(pc) ? "warning" : "hint", text: t(pm) } : null;
      const sub = sbx.querySelector("[data-fo-cadastral-submit], .btn-search");
      return { ...o, kind: "search", value: si2.value, placeholder: si2.placeholder, focus: document.activeElement === si2, loading: sbx.classList.contains("loading"), clear: sbx.classList.contains("has-value") && !sbx.classList.contains("loading"), error: sbx.classList.contains("is-error"), button: Boolean(sub), submitDisabled: Boolean(sub && sub.disabled), message: msg };
    }
    const srre = [...f.querySelectorAll("[data-fo-srre-value]")].find(vis);
    if (srre) { const box = srre.closest(".e-permits-fo-input") || srre; const inp = box.querySelector("input") || srre; return { ...o, kind: "readonly", value: inp.value || t(box), flag: Boolean(box.querySelector(".e-permits-fo-country-flag")) || /Republica Moldova/.test(inp.value), check: Boolean([...box.querySelectorAll("svg use")].find((u) => /checkmark/.test(u.getAttribute("href")))) }; }
    const phone = f.querySelector(".e-permits-fo-phone"); if (phone && vis(phone)) { const inp = phone.querySelector("input"); return { ...o, kind: "phone", value: inp.value, placeholder: inp.placeholder, prefix: t(phone.querySelector("button")) }; }
    const sel = [...f.querySelectorAll(".e-permits-fo-select")].find(vis);
    if (sel) { const v = sel.querySelector("[data-fo-select-value]"); return { ...o, kind: "select", value: t(v), placeholder: v.classList.contains("e-permits-fo-select__value--placeholder"), disabled: sel.classList.contains("is-disabled"), flag: Boolean(sel.querySelector(".e-permits-fo-country-flag")) }; }
    const box = [...f.querySelectorAll(".e-permits-fo-input")].find(vis); const inp = box && box.querySelector("input");
    if (inp) { const ro = box.classList.contains("is-readonly") || inp.readOnly;
      const pm = [...f.querySelectorAll(":scope > p")].find((p) => vis(p) && !p.classList.contains("u-visually-hidden") && t(p));
      const pc = pm ? pm.className : "";
      const msg = pm ? { tone: /__loading/.test(pc) ? "loading" : /message--success/.test(pc) ? "success" : /message--error/.test(pc) ? "error" : /message--warning/.test(pc) ? "warning" : "hint", text: t(pm) } : null;
      return { ...o, kind: ro ? "readonly" : "text", value: inp.value, placeholder: inp.placeholder, disabled: inp.disabled || box.classList.contains("is-disabled"), check: Boolean([...box.querySelectorAll("svg use")].find((u) => /checkmark/.test(u.getAttribute("href")) && vis(u.closest("svg")))), email: inp.type === "email", error: box.classList.contains("is-error"), clear: vis(box.querySelector(".btn-icon.clear")), focus: document.activeElement === inp, message: msg }; }
    return { ...o, kind: "unknown", html: f.innerHTML.slice(0, 200) };
  });
  return { rootW: Math.round(rb.width), search, fields: out };
})()
`;
const W = Number(width || 1440);
const port = 9300 + Math.floor(Math.random() * 300);
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/cdp-x-${port}`, "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target; for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === "page"); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener("open", r));
let seq = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || { error: m.error }); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++seq; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }))?.result?.value;
await send("Runtime.enable"); await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: 900, deviceScaleFactor: 1, mobile: W < 600 });
await send("Page.navigate", { url: `http://localhost:8935/${page}?state=${state}` });
for (let i = 0; i < 120; i++) { await sleep(150); if (await evaluate("document.documentElement.dataset.demoState")) break; }
await sleep(900);
const out = await evaluate((rootSel ? `window.__ROOTSEL=${JSON.stringify(rootSel)};` : "") + EXTRACT);
console.log(typeof out === "string" ? out : JSON.stringify(out, null, 1));
ws.close(); chrome.kill(); process.exit(0);
