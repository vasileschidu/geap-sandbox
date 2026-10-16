// eKYC BO QA — whole-pixel pass 2: fractional POSITIONS produced by auto-layout (2026-10-16). Run per page:
//   new AF("__OPT", code)({ page, mode: "dry" | "apply" | "revert" })
// Causes found (Audit & Reports census: 112 children of stroked parents, 128 centring offsets):
//   A · a parent whose stroke is included in layout with a fractional side (0.5 px table-cell dividers) or whose stroke makes
//       the centring space odd (1 px footer border, 64-high pager with a 46 control → y 9.5): strokesIncludedInLayout = false
//       when that makes every flow child whole — the stroke still paints on the edge (INSIDE), content keeps its place ±0.5.
//   B · a centred child whose free space on that axis is odd and ≤ 2 px (a 124-wide hug text in a 125 box → x 0.5): the parent
//       aligns that axis to MIN (visual change ≤ 1 px; the code left-aligns these texts).
//   C · anything else is listed (left), not forced.
// Snapshot: page shared plugin data ekqa/wholepos-20261016 = JSON [{id, k, v}] → revert restores.
const OPT = typeof __OPT !== "undefined" ? __OPT : { page: "PAGE_ID", mode: "dry" };
const page = await figma.getNodeByIdAsync(OPT.page);
await figma.setCurrentPageAsync(page);
const KEY = "wholepos-20261016";
const fr = (v) => Math.abs(v - Math.round(v)) > 0.01;
if (OPT.mode === "revert") { const s = JSON.parse(page.getSharedPluginData("ekqa", KEY) || "[]"); let n = 0; for (const r of s.reverse()) { const f = await figma.getNodeByIdAsync(r.id); if (f) { f[r.k] = r.v; n++; } } page.setSharedPluginData("ekqa", KEY, ""); return { reverted: n }; }
const apply = OPT.mode === "apply";
const snap = JSON.parse(page.getSharedPluginData("ekqa", KEY) || "[]");
const set = (n, k, v) => { snap.push({ id: n.id, k, v: n[k] }); n[k] = v; };
const res = { A: 0, B: 0, left: 0, leftSample: [] };
const flowKids = (p) => p.children.filter((k) => k.visible !== false && k.layoutPositioning !== "ABSOLUTE");
const anyFrac = (p) => flowKids(p).some((k) => fr(k.x) || fr(k.y));
async function fixParent(p) {
  if (!p.layoutMode || p.layoutMode === "NONE" || p.layoutMode === "GRID" || !anyFrac(p)) return;
  // A
  if (!/^Screen · /.test(p.name) && p.strokesIncludedInLayout && Array.isArray(p.strokes) && p.strokes.some((s) => s.visible !== false)) {
    if (!apply) { res.A++; return; }
    set(p, "strokesIncludedInLayout", false);
    if (!anyFrac(p)) { res.A++; return; }
    p.strokesIncludedInLayout = true; snap.pop();
  }
  // B
  const hor = p.layoutMode === "HORIZONTAL";
  for (const k of flowKids(p)) {
    for (const axis of ["x", "y"]) {
      if (!fr(k[axis])) continue;
      const counter = (axis === "y") === hor; // the axis the parent aligns with counterAxisAlignItems
      const size = axis === "x" ? "width" : "height";
      const inner = p[size] - (axis === "x" ? p.paddingLeft + p.paddingRight : p.paddingTop + p.paddingBottom);
      const free = inner - (counter ? k[size] : flowKids(p).reduce((a, c) => a + c[size], 0) + p.itemSpacing * (flowKids(p).length - 1));
      const prop = counter ? "counterAxisAlignItems" : "primaryAxisAlignItems";
      if (p[prop] === "CENTER" && free > 0 && free <= 2.01) { res.B++; if (apply) set(p, prop, "MIN"); }
      else { res.left++; if (res.leftSample.length < 6) res.leftSample.push(k.id + " " + k.name.slice(0, 16) + " " + axis + "=" + k[axis] + " in " + p.id + " " + p[prop] + " free " + Math.round(free * 100) / 100); }
    }
  }
}
const inI = (n) => { for (let q = n.parent; q; q = q.parent) if (q.type === "INSTANCE") return true; return false; };
const screens = [];
for (const s of page.children.filter((s) => s.type === "SECTION")) for (const b of s.children.filter((c) => c.type === "FRAME" && /^Block · /.test(c.name)))
  for (const c of b.children) { if (/^Screens · /.test(c.name)) screens.push(...c.children); else if (/^Screen · /.test(c.name)) screens.push(c); }
for (const sc of screens) { const frames = [sc, ...sc.findAll((n) => n.type === "FRAME" && n.visible !== false && !inI(n))]; for (const f of frames) await fixParent(f); }
if (apply) page.setSharedPluginData("ekqa", KEY, JSON.stringify(snap));
return res;
