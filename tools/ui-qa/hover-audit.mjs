// UI QA — hover. Opens demo states in headless Chrome, moves a REAL mouse (CDP Input events) onto
// every visible interactive element in the scope and compares its computed style before / after.
// Reports elements whose hover changes nothing visible (background, border, colour, shadow,
// outline, text-decoration, opacity, transform — on the element or its ::before / ::after), and
// elements covered by something else at their centre (an invisible layer eats the hover).
// Project rule (memory „Hover everywhere”): every interactive element has a visible hover.
// Not counted (listed): the focused element (focus wins over hover), read-only fields, an open
// (aria-expanded) button, a drawer scrim, elements under an open menu / dialog or its VISIBLE
// backdrop (use --scope for those states); hidden since collection = skipped. Coverage is
// measured with the mouse parked away from the previous element.
//
// Usage: node --experimental-websocket --no-warnings tools/ui-qa/hover-audit.mjs \
//          --states fb-05,fb-10 [--scope "#form-builder-modal"] [--max 120] [--out dir]
// Needs the prototype on http://localhost:8935 and Google Chrome. Exit code 1 when findings exist.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const arg = (name, def) => { const i = process.argv.indexOf("--" + name); return i > -1 ? process.argv[i + 1] : def; };
const BASE = arg("base", "http://localhost:8935");
const PAGE = arg("page", "e-permits-acte-permisive.html");
const OUT = arg("out", "tools/ui-qa/out/hover");
const SCOPE = arg("scope", "body");
const MAX = Number(arg("max", "150"));
const STATES = (arg("states", "") || "").split(",").filter(Boolean);
const CHROME = arg("chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
if (!STATES.length) { console.error("--states is required"); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });

const PORT = 9400 + Math.floor(Math.random() * 400);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/ui-qa-hover-${PORT}`, "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target = null;
for (let i = 0; i < 40 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === "page"); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl);
let seq = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (pending.has(m.id)) { pending.get(m.id)(m.result || {}); pending.delete(m.id); } };
await new Promise((r) => (ws.onopen = r));
const send = (method, params = {}) => new Promise((r) => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.value;
await send("Page.enable"); await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

/* interactive = native controls, roles, and anything with cursor:pointer; skip invisible / disabled / inert */
const COLLECT = (scope, max) => `(() => {
  const root = document.querySelector(${JSON.stringify(scope)}) || document.body;
  const sel = 'a[href], button, [role=button], [role=tab], [role=option], [role=menuitem], [role=radio], [role=checkbox], [role=switch], summary, label, input:not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"])';
  const seen = new Set(); const out = [];
  const all = [...root.querySelectorAll(sel), ...[...root.querySelectorAll('*')].filter((n) => getComputedStyle(n).cursor === 'pointer')];
  for (const el of all) {
    if (seen.has(el) || out.length >= ${max}) continue; seen.add(el);
    if (el.closest('[inert], [hidden], [aria-hidden=true]')) continue;
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') continue;
    /* a plain field label is text, not a target; option labels (radio / checkbox rows) are */
    if (el.tagName === 'LABEL' && !el.querySelector('input')) continue;
    /* count a child inside an already-collected interactive parent once (the parent) */
    /* …except a link / button inside an option label (consent text „legii nr. 133”): its own target */
    const parentHit = out.find((o) => o.el !== el && o.el.contains(el));
    if (parentHit && !(parentHit.el.tagName === 'LABEL' && el.matches('a[href], button'))) continue;
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    if (r.width < 8 || r.height < 8 || cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
    if (r.bottom < 0 || r.top > innerHeight * 3) continue;
    out.push({ el });
  }
  window.__hoverTargets = out.map((o) => o.el);
  return out.length;
})()`;

const STYLE = `(el) => { const pick = (cs) => [cs.backgroundColor, cs.backgroundImage.slice(0, 60), cs.borderColor, cs.color, cs.boxShadow, cs.outlineStyle + cs.outlineColor, cs.textDecorationLine, cs.textDecorationThickness, cs.textDecorationColor, cs.opacity, cs.transform, cs.fill].join('|');
  const deep = (n) => pick(getComputedStyle(n)) + pick(getComputedStyle(n, '::before')) + pick(getComputedStyle(n, '::after'));
  /* the visible hover may sit on the first child (icon wrapper, card inside a button) */
  /* …or on the wrapper (library inputs: .e-permits-fo-input / .search-input own the border) */
  /* …or two levels up (value groups: mode select + input share one bordered box) */
  const field = /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && el.parentElement;
  const wrap = field ? deep(el.parentElement) + (el.parentElement.parentElement ? deep(el.parentElement.parentElement) : '') : '';
  /* …or on the parent's ::before (the sliding thumb of an animated segmented control) */
  const thumb = el.parentElement ? pick(getComputedStyle(el.parentElement, '::before')) : '';
  return deep(el) + wrap + thumb + [...el.children].slice(0, 3).map(deep).join(''); }`;

const report = [];
for (const state of STATES) {
  await send("Page.navigate", { url: `${BASE}/${PAGE}?state=${encodeURIComponent(state)}` });
  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) { await sleep(500); ready = Boolean(await ev("document.documentElement.dataset.demoState || ''")); }
  await sleep(1200);
  const count = await ev(COLLECT(SCOPE, MAX));
  const findings = [];
  const focusedSkipped = [];
  for (let i = 0; i < count; i++) {
    /* mouse away first: the previous element's hover (tooltip, expanded cell) must not count as a cover */
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 2, y: 2 });
    await sleep(60);
    /* scroll first, then let scroll listeners run (tab-strip arrows hide on `scroll`) before measuring */
    await ev(`window.__hoverTargets[${i}]?.isConnected && window.__hoverTargets[${i}].scrollIntoView({ block: 'center', inline: 'nearest' })`);
    await sleep(150);
    const info = await ev(`(() => { const el = window.__hoverTargets[${i}]; if (!el || !el.isConnected) return null;
      const r = el.getBoundingClientRect();
      /* hidden since collection (a tab-strip arrow at the end of its scroll) */
      if (r.width < 1 || r.height < 1) return null;
      /* focused: the focus style wins over hover by design (inputs: focus-within on the box) */
      const focused = el.matches(':focus') || (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && el.parentElement && el.parentElement.matches(':focus-within'));
      /* by design without hover: read-only fields (library Read Only state) and an open button,
         which keeps its pressed fill (memory „Open button focus”) */
      const byDesign = el.readOnly ? 'read-only' : el.getAttribute('aria-expanded') === 'true' ? 'open, keeps pressed' : /scrim/.test(String(el.className)) ? 'backdrop (closes the drawer)' : '';
      const x = r.left + Math.min(r.width / 2, 24), y = r.top + r.height / 2;
      const top = document.elementFromPoint(x, y);
      const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || '').trim().replace(/\\s+/g, ' ').slice(0, 40);
      const id = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '');
      const cover = top && !el.contains(top) && !top.contains(el) ? top : null;
      /* an open menu / listbox / dialog lies over the page by design */
      /* …and so does a VISIBLE backdrop (scrim / modal overlay). An invisible one (opacity 0, a closed
         modal left in the hit-test) stays a finding — that is the bug this audit exists for. */
      const shown = (n) => { for (let p = n; p && p !== document.body; p = p.parentElement) { const c = getComputedStyle(p); if (Number(c.opacity) < 0.05 || c.visibility === 'hidden') return false; } return true; };
      const backdrop = cover && cover.matches('.modal-overlay, [class*="scrim"], [class*="overlay"]') && shown(cover);
      const overlay = cover && cover.closest('[role=menu], [role=listbox], [role=dialog], [aria-modal=true]') ? 'under an open menu / dialog' : backdrop ? 'under an open dialog backdrop' : '';
      return { focused, byDesign: byDesign || overlay, x, y, name, id, covered: cover && !overlay ? (cover.tagName.toLowerCase() + '.' + String(cover.className).trim().split(/\\s+/)[0]) : '' }; })()`);
    if (!info) continue;
    const before = await ev(`(${STYLE})(window.__hoverTargets[${i}])`);
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: info.x, y: info.y });
    await sleep(260); // transitions
    const after = await ev(`(${STYLE})(window.__hoverTargets[${i}])`);
    if (info.covered) findings.push({ kind: "covered", ...info });
    else if (before === after && info.focused) focusedSkipped.push("focused · " + info.id + " „" + info.name + "”");
    else if (info.byDesign && (before === after || info.byDesign.startsWith("under"))) focusedSkipped.push(info.byDesign + " · " + info.id + " „" + info.name + "”");
    else if (before === after) findings.push({ kind: "no-hover", ...info });
  }
  report.push({ state, checked: count, findings });
  console.log(`${state}: ${count} interactive · ${findings.filter((f) => f.kind === "no-hover").length} without hover · ${findings.filter((f) => f.kind === "covered").length} covered`);
  for (const f of findings) console.log(`   ${f.kind.padEnd(8)} ${f.id}  „${f.name}”${f.covered ? "  ← under " + f.covered : ""}`);
  const under = focusedSkipped.filter((f) => f.startsWith("under"));
  for (const f of focusedSkipped.filter((x) => !x.startsWith("under"))) console.log(`   (not counted: ${f})`);
  if (under.length) console.log(`   (not counted: ${under.length} elements under an open menu / dialog / backdrop — scope the state to the dialog)`);
}
fs.writeFileSync(path.join(OUT, "hover-report.json"), JSON.stringify(report, null, 2));
chrome.kill();
process.exit(report.some((r) => r.findings.length) ? 1 : 0);
