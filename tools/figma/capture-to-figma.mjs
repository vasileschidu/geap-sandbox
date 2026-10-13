// Capture a prototype demo state (or one element of it) into Figma as a pixel-accurate layout,
// through Figma's html-to-design capture. Used by the figma-designer agent.
//
// 1. Get a capture id: mcp__figma-a__generate_figma_design { fileKey, nodeId? } (one id per capture).
// 2. node --experimental-websocket --no-warnings tools/figma/capture-to-figma.mjs \
//      --state svc-02h --capture <id> [--selector "[data-rt-drawer] .e-permits-tariff__panel"] [--full] [--height 1024] [--width 1440] [--page cabinet-evo/index.html]
//    --hide "<css>"  elements to hide (default ".e-permits-fo-testcfg,.msup-bubble"; pass ".msup-bubble" to keep the config panel)
//    --css "<css>"   extra CSS injected before the capture (unclip scrolling panels)
//    --keep-focus    do not blur the focused element (open lists / focus rings, e.g. adr-02a)
//    --full     lets drawers grow to their content (no inner scroll → nothing clipped in Figma)
//    --fit      grows the viewport height until the inner scrollers (--fit-sel, default: BO canvas, table wrap,
//               modal content, drawer body) no longer scroll vertically → a full-height screen (eKYC BO, 2026-10-13)
//    --selector captures only that element (a section, a drawer aside, a modal) — preferred
// 3. Poll: mcp__figma-a__generate_figma_design { fileKey, captureId } until it returns the node URL.
//    The script itself always ends with "timeout (submitted?)" — that is normal: the upload is done.
// Needs the prototype on http://localhost:8935 and Google Chrome. The Figma capture script is
// downloaded once to tools/figma/.capture.js (gitignored).
import { spawn, execSync } from "node:child_process";
import fs from "node:fs";

const arg = (name, def) => { const i = process.argv.indexOf("--" + name); return i > -1 ? (process.argv[i + 1]?.startsWith("--") || process.argv[i + 1] === undefined ? true : process.argv[i + 1]) : def; };
const BASE = arg("base", "http://localhost:8935");
const PAGE = arg("page", "e-permits-acte-permisive.html");
const STATE = arg("state", "");
const CID = arg("capture", "");
const SEL = arg("selector", "body");
const FULL = Boolean(arg("full", false));
const HIDE = arg("hide", ".e-permits-fo-testcfg,.msup-bubble");   // --hide ".msup-bubble" keeps the „Configurare flux” panel (adr-11)
const KEEP_FOCUS = Boolean(arg("keep-focus", false));                 // keep the focused field (open lists, focus rings: adr-02a…)
const CSS = arg("css", "");                                           // extra CSS, e.g. unclip a scrolling panel
let H = Number(arg("height", 1024));
const FIT = Boolean(arg("fit", false));
const FIT_SEL = arg("fit-sel", ".e-permits-shell__canvas-surface,.e-permits-workplace__table-wrap,.modal-content,.e-permits-user-create__body,.e-permits-shell__nav");
const W = Number(arg("width", 1920));   // 1440 for FO / EVO Cabinet pages, 375 for mobile
const MOBILE = W < 600;
const CHROME = arg("chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
if (!STATE || !CID) { console.error("usage: --state <demo-state> --capture <capture-id> [--selector css] [--full]"); process.exit(1); }
const CAPJS = "tools/figma/.capture.js";
if (!fs.existsSync(CAPJS)) execSync(`curl -s https://mcp.figma.com/mcp/html-to-design/capture.js -o ${CAPJS}`);

const port = 9600 + Math.floor(Math.random() * 300);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/figma-cap-${port}`, "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === "page"); } catch {} }
if (!target) { console.error("Chrome did not start"); process.exit(1); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let seq = 0; const pending = new Map(); const errors = [];
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || { error: m.error }); pending.delete(m.id); } if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.text); });
const send = (method, params = {}) => new Promise((r) => { const i = ++seq; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }))?.result?.value;
await send("Runtime.enable"); await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: MOBILE });
await send("Page.navigate", { url: `${BASE}/${PAGE}?state=${STATE}` });
for (let i = 0; i < 100; i++) { await sleep(150); if (await evaluate("document.documentElement.dataset.demoState")) break; }
const st = await evaluate("document.documentElement.dataset.demoState");
if (String(st).endsWith(":error")) console.error(`demo state ${STATE} stopped with an error — check js/demo-states.js`);
await sleep(900);
await evaluate(`(() => { const s = document.head.appendChild(document.createElement("style")); s.textContent = "*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important} ${HIDE}{display:none!important} ${CSS.replace(/"/g, '\\"')}${FULL ? " .e-permits-user-create__drawer{height:auto!important;max-height:none!important} .e-permits-user-create__body{overflow:visible!important;flex:none!important;max-height:none!important}" : ""}"; ${KEEP_FOCUS ? "" : "document.activeElement?.blur?.();"} })()`);
await sleep(300);
if (FIT) for (let k = 0; k < 4; k++) {
  const d = await evaluate(`Math.max(0, ...[...document.querySelectorAll(${JSON.stringify(FIT_SEL)})].filter((e) => e.getClientRects().length && !e.closest("[hidden],.e-permits-builder")).map((e) => e.scrollHeight - e.clientHeight))`);
  if (!d || d < 3) break; H += d; await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: MOBILE }); await sleep(500);
}
if (FIT) console.log("fit height", H);
const found = await evaluate(`Boolean(document.querySelector(${JSON.stringify(SEL)}))`);
if (!found) { console.error(`selector not found: ${SEL}`); ws.close(); chrome.kill(); process.exit(1); }
await evaluate(`document.title = ${JSON.stringify("cap · " + STATE)}`); // the Figma root frame takes the document title → capture ↔ state mapping survives parallel uploads
await evaluate(fs.readFileSync(CAPJS, "utf8"));
await sleep(600);
const res = await Promise.race([sleep(Number(arg("wait", 25000))).then(() => "timeout (submitted?)"), evaluate(`(async () => { const r = await window.figma.captureForDesign({ captureId: ${JSON.stringify(CID)}, endpoint: "https://mcp.figma.com/mcp/capture/${CID}/submit?bindVariables=true", selector: ${JSON.stringify(SEL)} }); return JSON.stringify(r).slice(0, 200); })()`)]);
console.log(STATE, st, res, errors.slice(0, 2));
ws.close(); chrome.kill(); process.exit(0);
