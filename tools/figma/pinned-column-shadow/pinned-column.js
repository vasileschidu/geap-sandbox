// Pinned column = ONE absolute `Table / Pinned column` instance (Side Start/End × State Shadow/No shadow) per pinned column,
// the column's cells moved INTO its `Cells` slot (user reference GEAP 12615:79800, 2026-10-23). Effect styles
// „Table / Pinned column – end / – start” = 8 % ring (0 0 0 1) + X ∓4 b6 s−2 5 % + X ∓4 b15 s−3 10 %; „– ring” = ring only.
// Markers from the previous passes tell where the pinned columns are: `Pinned divider · start|end` lines (edge x), absolute
// end cells (Ghișeu), `Pinned column shadow · start|end` helpers (= that side shows the shadow). Cells that were in flow
// (grid / tr row) leave an empty `Sticky placeholder – Table Cell` of the same size so the other columns do not move.
// Usage: set SET_ID + HOSTS (tables; empty = every host that has a marker on PAGE_ID), DRY, LIMIT.
const SET_ID = "12619:61500", PAGE_ID = "11589:327039", DRY = true, LIMIT = 10, HOSTS = [];
const set = await figma.getNodeByIdAsync(SET_ID);
const variant = (side, shadow) => set.children.find(c => c.name === `Side=${side}, State=${shadow ? "Shadow" : "No shadow"}`);
const page = figma.root.children.find(p => p.id === PAGE_ID);
await figma.setCurrentPageAsync(page);
const isMarker = n => /^(Pinned divider|Pinned column shadow) · (start|end)$/.test(n.name);
let hosts = HOSTS.length ? await Promise.all(HOSTS.map(id => figma.getNodeByIdAsync(id)))
  : [...new Set(page.findAll(n => isMarker(n) && !n.id.includes(";")).map(n => n.parent))];
hosts = hosts.concat(page.findAll(n => n.type === "FRAME" && n.layoutMode === "GRID" && /^Table/.test(n.name) && !n.id.includes(";") && !hosts.includes(n)
  && n.children.some(c => c.layoutPositioning === "ABSOLUTE" && /^(Header Cell|Table Cell)$/.test(c.name))));
const out = { hosts: hosts.length, done: [], skipped: [] };
const rel = (n, host) => { const a = n.absoluteTransform, h = host.absoluteTransform; return { x: Math.round(a[0][2] - h[0][2]), y: Math.round(a[1][2] - h[1][2]), w: Math.round(n.width), h: Math.round(n.height) }; };
const ROW_RX = /^(tr|Row \d+|Row|Header row|is-inactive)\b/;
const cellLike = (n, host) => n.visible !== false && !isMarker(n) && !/^(Pinned column|Sticky placeholder)/.test(n.name) && n.height < 240 &&
  (host.layoutMode === "GRID" ? n.parent === host : (ROW_RX.test(n.parent.name) && (n.parent.parent === host || n.parent.parent.parent === host)));
for (const host of hosts) {
  if (out.done.length >= LIMIT) break;
  const kids = host.layoutMode === "GRID" ? host.children.filter(n => cellLike(n, host)) : host.findAll(n => cellLike(n, host));
  const markers = host.children.filter(isMarker);
  const groups = [];
  // end: absolute end cells (Ghișeu) or the end divider's x
  const absAll = host.children.filter(c => c.layoutPositioning === "ABSOLUTE" && /^(Header Cell|Table Cell)$/.test(c.name));
  const maxX = Math.max(...absAll.map(c => Math.round(c.x)));
  const absEnd = absAll.filter(c => Math.round(c.x) === maxX); // scrolled drawings also hold absolute START clones further left
  const dEnd = markers.find(m => m.name === "Pinned divider · end");
  const dStart = markers.filter(m => m.name === "Pinned divider · start").sort((a, b) => a.x - b.x)[0]; // leftmost = the pinned one (stale captures carry a 2nd border)
  if (absEnd.length) groups.push({ side: "End", cells: absEnd });
  else if (dEnd) { const x = Math.round(dEnd.x); groups.push({ side: "End", cells: kids.filter(k => rel(k, host).x === x) }); }
  if (dStart) { const e = Math.round(dStart.x) + 1; groups.push({ side: "Start", cells: kids.filter(k => { const r = rel(k, host); return r.x + r.w === e; }) }); }
  const valid = groups.filter(g => g.cells.length);
  if (!valid.length) { out.skipped.push(host.id); continue; }
  for (const g of valid) {
    g.cells.sort((a, b) => rel(a, host).y - rel(b, host).y);
    const r0 = rel(g.cells[0], host), rl = rel(g.cells[g.cells.length - 1], host);
    g.x = r0.x; g.y = r0.y; g.w = r0.w; g.h = rl.y + rl.h - r0.y;
    g.shadow = markers.some(m => m.name === "Pinned column shadow · " + g.side.toLowerCase());
  }
  if (DRY) { out.done.push(`${host.id} ${valid.map(g => `${g.side}${g.shadow ? "*" : ""} x${g.x} w${g.w} h${g.h} n${g.cells.length}`).join(" | ")}`); continue; }
  const isGrid = host.layoutMode === "GRID";
  const rows = host.gridRowCount, cols = host.gridColumnCount, h0 = host.height;
  const restore = () => { if (!isGrid) return; if (host.gridRowCount !== rows) host.gridRowCount = rows; if (host.gridColumnCount !== cols) host.gridColumnCount = cols; if (Math.abs(host.height - h0) > 0.5) host.resize(host.width, h0); };
  for (const g of valid) {
    const inst = variant(g.side, g.shadow).createInstance();
    host.appendChild(inst); inst.layoutPositioning = "ABSOLUTE"; restore();
    inst.name = "Pinned column · " + g.side.toLowerCase();
    inst.resize(g.w, g.h); inst.x = g.x; inst.y = g.y;
    inst.constraints = { horizontal: g.side === "End" && !isGrid ? "MAX" : "MIN", vertical: "MIN" };
    const slot = inst.children.find(c => c.type === "SLOT");
    let bottom = g.y;
    for (const c of g.cells) {
      const p = c.parent, w = c.width, h = c.height, cy = rel(c, host).y;
      if (cy - bottom > 0.5) { const gap = figma.createFrame(); gap.name = "Gap"; gap.fills = []; slot.appendChild(gap); gap.resize(g.w, cy - bottom); gap.layoutSizingHorizontal = "FILL"; } // colspan rows between edge cells
      bottom = cy + h;
      const inFlow = c.layoutPositioning !== "ABSOLUTE" && p.layoutMode && p.layoutMode !== "NONE";
      const rr = c.gridRowAnchorIndex, cc = c.gridColumnAnchorIndex, idx = p.children.indexOf(c), fillV = c.layoutSizingVertical === "FILL";
      slot.appendChild(c); restore();
      if (inFlow) { // leave an empty placeholder in the flow (after the move: the grid cell must be free first)
        const ph = figma.createFrame(); ph.name = "Sticky placeholder – Table Cell"; ph.fills = [];
        if (p.layoutMode === "GRID") { p.appendChild(ph); ph.resize(w, h); ph.setGridChildPosition(rr, cc); restore(); }
        else { p.insertChild(idx, ph); ph.resize(w, h); ph.layoutSizingHorizontal = "FIXED"; ph.layoutSizingVertical = fillV ? "FILL" : "FIXED"; }
      }
      if (c.layoutPositioning === "ABSOLUTE") c.layoutPositioning = "AUTO";
      if (c.layoutSizingVertical === "FILL") c.layoutSizingVertical = "FIXED";
      c.resize(c.width, h); c.layoutSizingHorizontal = "FILL"; // resize() after an auto sizing mode would make it FIXED
      if ("strokeLeftWeight" in c) { c.strokeLeftWeight = 0; c.strokeRightWeight = 0; }
    }
    if (Math.abs(inst.y + inst.height - h0) < 1 && inst.y === 0) inst.constraints = { horizontal: inst.constraints.horizontal, vertical: "STRETCH" };
  }
  for (const m of markers) m.remove();
  restore();
  out.done.push(`${host.id} → ${valid.map(g => g.side + (g.shadow ? "*" : "")).join(",")} h${Math.round(host.height)}`);
}
return out;
