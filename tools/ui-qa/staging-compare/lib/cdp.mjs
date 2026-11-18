// Minimal Chrome DevTools Protocol session (headless Chrome, one page) — the same approach as
// tools/ui-qa/compare-styles.mjs / hover-audit.mjs, packaged for staging-compare.
import { spawn } from "node:child_process";
import fs from "node:fs";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch({ chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", port } = {}) {
  port = port || 9700 + Math.floor(Math.random() * 250);
  const dir = `/tmp/staging-compare-cdp-${port}`;
  const proc = spawn(chrome, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, "--hide-scrollbars", "--no-first-run", "--no-default-browser-check", "about:blank"], { stdio: "ignore" });
  let target;
  for (let i = 0; i < 80 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === "page"); } catch {} }
  if (!target) { proc.kill(); throw new Error("Chrome did not start"); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.addEventListener("open", r); ws.addEventListener("error", j); });
  let seq = 0; const pending = new Map(); const listeners = [];
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || { error: m.error }); pending.delete(m.id); }
    else if (m.method) for (const l of listeners) l(m);
  });
  const send = (method, params = {}, ms = 30000) => Promise.race([
    new Promise((r) => { const i = ++seq; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); }),
    sleep(ms).then(() => ({ error: "timeout " + method }))
  ]);
  const evaluate = async (expr) => {
    const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r?.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r?.result?.value;
  };
  await send("Runtime.enable"); await send("Page.enable"); await send("Network.enable");
  const consoleErrors = [];
  listeners.push((m) => {
    if (m.method === "Runtime.exceptionThrown") consoleErrors.push(m.params.exceptionDetails?.exception?.description?.slice(0, 200) || "exception");
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") consoleErrors.push(m.params.args?.map((a) => a.value ?? a.description).join(" ").slice(0, 200));
  });
  /* request log: lets the runner prove it stayed read-only (no POST / PUT / DELETE except the Blazor circuit) */
  const requests = [];
  listeners.push((m) => { if (m.method === "Network.requestWillBeSent") requests.push({ method: m.params.request.method, url: m.params.request.url }); });
  const api = {
    port, send, evaluate, consoleErrors, requests,
    on: (fn) => listeners.push(fn),
    viewport: async (vp) => {
      await send("Emulation.setDeviceMetricsOverride", { width: vp.width, height: vp.height, deviceScaleFactor: vp.scale || 1, mobile: !!vp.mobile });
      await send("Emulation.setTouchEmulationEnabled", { enabled: !!vp.mobile });
    },
    navigate: async (url) => {
      await send("Page.navigate", { url: "about:blank" });
      for (let i = 0; i < 40 && (await evaluate("location.href").catch(() => "")) !== "about:blank"; i++) await sleep(50);
      await send("Page.navigate", { url });
    },
    mouse: (type, x, y) => send("Input.dispatchMouseEvent", { type, x, y, button: type === "mouseMoved" ? "none" : "left", clickCount: type === "mouseMoved" ? 0 : 1 }),
    click: async (x, y) => { await api.mouse("mouseMoved", x, y); await api.mouse("mousePressed", x, y); await api.mouse("mouseReleased", x, y); },
    key: async (key, code = key, vk = 0, modifiers = 0) => {
      await send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: vk, modifiers });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: vk, modifiers });
    },
    type: async (text) => { for (const ch of text) { await send("Input.dispatchKeyEvent", { type: "char", text: ch }); await sleep(25); } },
    /* PNG of a page region (CSS px, document coordinates) */
    shot: async (file, clip) => {
      const params = { format: "png", captureBeyondViewport: true };
      if (clip) params.clip = { ...clip, scale: 1 };
      const r = await send("Page.captureScreenshot", params, 60000);
      if (r?.data) fs.writeFileSync(file, Buffer.from(r.data, "base64"));
      return !!r?.data;
    },
    close: () => { try { ws.close(); } catch {} proc.kill(); }
  };
  return api;
}
