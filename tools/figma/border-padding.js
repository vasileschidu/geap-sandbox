// border-padding.js — strip the captured „border in padding” artifact (2026-10-15).
// Run as the `code` of use_figma, one page per call; edit the OPT line first.
//   OPT.mode "dry"    → counts + samples, nothing changes
//            "apply"  → fixes A, C, D and stores a snapshot on the page
//                       (sharedPluginData "geapqa" / "borderpad-<stamp>": [[id, t, r, b, l, inc, boundVars]])
//            "revert" → restores OPT.stamp's snapshot
// Why: html→Figma captures turn a CSS border into an INSIDE stroke with strokesIncludedInLayout
// (= box-sizing border-box) AND add the border width to the padding → content 1 px too far in
// (13 instead of 12, 9 instead of 8, 1 instead of 0). Older blocks did the same by hand: padding bound to
// border-width/border-1 with strokesIncludedInLayout false; screens later got the 4 px OUTSIDE frame and
// kept that padding → a 1 px ring inside the screen.
// Per side, auto-layout FRAME / COMPONENT / COMPONENT_SET only, never inside instances:
//   A  INSIDE stroke on that side, included in layout, p off-scale, p − w on scale        → p − w
//   C  same but strokesIncludedInLayout false → inc = true + p − w on every stroked side (no visual change);
//      blocked when a stroked side doesn't qualify
//   D  p === 1 under a visible OUTSIDE/CENTER stroke (old 1 px border replaced by the screen frame) → 0
//      (p 1 with an invisible stroke = a transparent CSS border → real geometry, kept)
//   B  anything else with p off-scale and p − 1 on scale → reported only (real CSS values such as 11/12 titles,
//      UA button padding 1/6)
// Padding bound to border-width/* is unbound when fixed; bound to any other variable → skipped (res.bound).
const OPT = { page: "PAGE_ID", mode: "dry", stamp: "20261015" };

const SCALE = [0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 120, 160, 200, 240];
const on = (v) => SCALE.some((x) => Math.abs(v - x) < 0.01);
const SIDES = [["paddingTop", "strokeTopWeight"], ["paddingRight", "strokeRightWeight"], ["paddingBottom", "strokeBottomWeight"], ["paddingLeft", "strokeLeftWeight"]];
const page = await figma.getNodeByIdAsync(OPT.page);
await figma.setCurrentPageAsync(page);
const KEY = "borderpad-" + OPT.stamp;

if (OPT.mode === "revert") {
  const snap = JSON.parse(page.getSharedPluginData("geapqa", KEY) || "[]");
  let ok = 0; const miss = [];
  for (const [id, t, r, b, l, inc, vars] of snap) {
    const n = await figma.getNodeByIdAsync(id);
    if (!n) { miss.push(id); continue; }
    n.strokesIncludedInLayout = inc;
    Object.assign(n, { paddingTop: t, paddingRight: r, paddingBottom: b, paddingLeft: l });
    if (vars) for (const kv of vars) { const [pk, vid] = kv.split("="); n.setBoundVariable(pk, await figma.variables.getVariableByIdAsync(vid)); }
    ok++;
  }
  return { reverted: ok, missing: miss };
}

const VN = {};
const vis = (n) => Array.isArray(n.strokes) && n.strokes.some((s) => s.visible !== false && (s.opacity ?? 1) > 0);
const res = { A: 0, C: 0, D: 0, B: 0, Cblocked: 0, bound: 0, fixed: 0, sA: [], sC: [], sD: [], sB: [] };
const snap = [];
const nodes = [];
(function walk(list) {
  for (const n of list) {
    if (n.type === "INSTANCE") continue;
    if ((n.type === "FRAME" || n.type === "COMPONENT" || n.type === "COMPONENT_SET") && n.layoutMode && n.layoutMode !== "NONE") nodes.push(n);
    if ("children" in n) walk(n.children);
  }
})(page.children);
for (const n of nodes) { const bv = n.boundVariables || {}; for (const [pk] of SIDES) if (bv[pk] && !(bv[pk].id in VN)) { const v = await figma.variables.getVariableByIdAsync(bv[pk].id); VN[bv[pk].id] = v ? v.name : ""; } }
const isBW = (bv, pk) => bv[pk] && (VN[bv[pk].id] || "").startsWith("border-width");
const sample = (k, n, x) => { if (res["s" + k].length < 12) res["s" + k].push(n.id + " " + n.name.slice(0, 26) + " " + x); };

for (const n of nodes) {
  const inside = vis(n) && n.strokeAlign === "INSIDE", outside = vis(n) && n.strokeAlign !== "INSIDE";
  const bv = n.boundVariables || {};
  const fix = {}; let kind = "", blocked = false; const b = [];
  for (const [pk, wk] of SIDES) {
    const p = n[pk], w = inside ? (n[wk] || 0) : 0;
    if (typeof p !== "number") continue;
    if (w > 0) {
      const good = !on(p) && p >= w && on(p - w);
      if (good) { fix[pk] = p - w; kind = n.strokesIncludedInLayout ? "A" : "C"; }
      else if (!n.strokesIncludedInLayout) blocked = true;
    } else if (p === 1 && outside) { fix[pk] = 0; kind = kind || "D"; }
    else if (p > 0 && !on(p) && on(p - 1)) b.push(pk[7] + p);
  }
  if (b.length) { res.B++; sample("B", n, b.join(",")); }
  if (!Object.keys(fix).length) continue;
  if (kind === "C" && blocked) { res.Cblocked++; continue; }
  const bk = SIDES.map(([pk]) => pk).filter((pk) => bv[pk] && pk in fix);
  if (bk.some((pk) => !isBW(bv, pk))) { res.bound++; continue; }
  res[kind]++; sample(kind, n, JSON.stringify(fix));
  if (OPT.mode !== "apply") continue;
  snap.push([n.id, n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft, n.strokesIncludedInLayout, bk.length ? bk.map((pk) => pk + "=" + bv[pk].id) : 0]);
  for (const pk of bk) n.setBoundVariable(pk, null);
  if (kind === "C") n.strokesIncludedInLayout = true;
  Object.assign(n, fix);
  res.fixed++;
}
if (OPT.mode === "apply" && snap.length) {
  const prev = JSON.parse(page.getSharedPluginData("geapqa", KEY) || "[]");
  page.setSharedPluginData("geapqa", KEY, JSON.stringify(prev.concat(snap)));
}
res.key = KEY;
return res;
