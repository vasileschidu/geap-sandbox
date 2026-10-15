// bind-spacing-tokens.dry.js — compact read-only counter for bind-spacing-tokens.js (same rules, no keys).
// Returns per page: bindable / already bound / zeros / off-scale (histogram + samples) for padding, gap, radius,
// and for frame colours: bindable (exact unique token hex) / already bound / unmatched.
const PID = "PAGE_ID";
const SP = [2,4,6,8,12,16,20,24,32,40,48,56,64,80,96,120], RD = [4,6,8,12,16,24,32];
const CF = "ffffff f5f5f5 f1f1f1 f7f7f7 1e1e1e 0058d2 e8f0fb f1f6fd 00295a d92d20 fee4e2 fefafa 039855 e6f5ee f0f9f4 fdb022 feefc6 fefbf4 fec84b".split(" ");
const CS = "d9d9d9 b2b2b2 444444 121212 ffffff 0058d2 ccdef6 027948 cdeadd d92d20 fecdc9 dc6803 fedf89".split(" ");
const page = await figma.getNodeByIdAsync(PID); await figma.setCurrentPageAsync(page);
const r = { frames: 0, inst: 0, bindable: { padding: 0, gap: 0, radius: 0, colour: 0 }, already: { padding: 0, gap: 0, radius: 0, colour: 0 }, zeros: 0, off: {}, offS: [], colUn: {}, colS: [] };
const hx = (c) => [c.r, c.g, c.b].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
function num(n, p, cat, ok) { const v = n[p]; if (typeof v !== "number") return; const bv = n.boundVariables || {};
  if (bv[p]) { r.already[cat]++; return; } if (v === 0) { r.zeros++; return; }
  if (ok(v)) { r.bindable[cat]++; return; } const k = cat + " " + v; r.off[k] = (r.off[k] || 0) + 1; if (r.offS.length < 30) r.offS.push(n.id + " " + n.name.slice(0, 20) + " " + p + "=" + v); }
function col(n, key, list) { if (!Array.isArray(n[key])) return; for (const p of n[key]) { if (p.type !== "SOLID" || p.visible === false) continue;
  if (p.boundVariables && p.boundVariables.color) { r.already.colour++; continue; } const h = hx(p.color) + ((p.opacity ?? 1) < 1 ? "@" + Math.round(p.opacity * 100) : "");
  if (list.includes(h)) r.bindable.colour++; else { const k = key[0] + " #" + h; r.colUn[k] = (r.colUn[k] || 0) + 1; if (r.colS.length < 15) r.colS.push(n.id + " " + n.name.slice(0, 18) + " " + k); } } }
const spOk = (v) => SP.includes(v), rdOk = (v) => RD.includes(v) || v >= 999;
(function w(l) { for (const n of l) {
  if (n.type === "INSTANCE") { r.inst++; continue; }
  if (n.type === "FRAME" || n.type === "COMPONENT" || n.type === "COMPONENT_SET") { r.frames++;
    if (n.layoutMode && n.layoutMode !== "NONE") { for (const p of ["paddingTop","paddingRight","paddingBottom","paddingLeft"]) num(n, p, "padding", spOk);
      if (n.layoutMode !== "GRID" && n.primaryAxisAlignItems !== "SPACE_BETWEEN") num(n, "itemSpacing", "gap", spOk);
      if (n.layoutWrap === "WRAP" && n.counterAxisAlignContent !== "SPACE_BETWEEN") num(n, "counterAxisSpacing", "gap", spOk);
      if (n.layoutMode === "GRID") { num(n, "gridRowGap", "gap", spOk); num(n, "gridColumnGap", "gap", spOk); } }
    for (const p of ["topLeftRadius","topRightRadius","bottomRightRadius","bottomLeftRadius"]) num(n, p, "radius", rdOk);
    col(n, "fills", CF); col(n, "strokes", CS); }
  if ("children" in n) w(n.children); } })(page.children);
r.off = Object.entries(r.off).sort((a, b) => b[1] - a[1]).slice(0, 25); r.colUn = Object.entries(r.colUn).sort((a, b) => b[1] - a[1]).slice(0, 12);
return r;
