// fit-tables — after the table-cell swap: widen GRID columns whose raw cells overflow and grow rows whose cells overflow
// (library table-cell: „Cell Container” HUG → measure → every cell in the row FIXED to the tallest, Cell Container FILL).
// Captured frames carry min/max width + height — clear them before resizing. Header row (0) is left alone.
// Run in use_figma with PID = page id; returns { tables, cols, rows, wide } (wide = tables now wider than their parent).
const PID = typeof PAGE_ID === "string" ? PAGE_ID : figma.currentPage.id;
const pg = await figma.getNodeByIdAsync(PID); await figma.setCurrentPageAsync(pg);
const inI = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const st = { tables: 0, cols: 0, rows: 0, wide: [] };
const contentH = (c) => {
  if (c.type === "INSTANCE") { const cc = c.findOne(n => n.name === "Cell Container"); if (!cc) return c.height; const d = cc.children.filter(k => k.visible !== false); return d.reduce((s, k) => Math.max(s, k.height), 0) + cc.paddingTop + cc.paddingBottom; }
  const d = c.children.filter(k => k.visible !== false && k.layoutPositioning !== "ABSOLUTE");
  if (!d.length) return 0;
  if (c.layoutMode === "VERTICAL") return d.reduce((s, k) => s + k.height, 0) + (c.itemSpacing || 0) * (d.length - 1) + c.paddingTop + c.paddingBottom;
  return d.reduce((s, k) => Math.max(s, k.height), 0) + (c.paddingTop || 0) + (c.paddingBottom || 0);
};
const contentW = (c) => { if (c.type !== "FRAME") return 0; const d = c.children.filter(k => k.visible !== false && k.layoutPositioning !== "ABSOLUTE"); if (!d.length) return 0;
  const one = (k) => (k.type === "FRAME" && k.layoutMode === "HORIZONTAL") ? k.children.filter(x => x.visible !== false).reduce((s, x) => s + x.width, 0) + (k.itemSpacing || 0) * Math.max(0, k.children.filter(x => x.visible !== false).length - 1) + (k.paddingLeft || 0) + (k.paddingRight || 0) : (k.type === "TEXT" ? 0 : k.width);
  return (c.layoutMode === "HORIZONTAL" ? d.reduce((s, k) => s + one(k), 0) + (c.itemSpacing || 0) * (d.length - 1) : d.reduce((s, k) => Math.max(s, one(k)), 0)) + (c.paddingLeft || 0) + (c.paddingRight || 0); };
for (const t of pg.findAll(n => n.type === "FRAME" && n.layoutMode === "GRID" && !inI(n) && /^Table/.test(n.name))) {
  st.tables++;
  const cols = t.gridColumnSizes.map(x => ({ ...x })); let colChanged = false;
  for (let ci = 0; ci < cols.length; ci++) { if (cols[ci].type !== "FIXED") continue;
    const need = t.children.filter(c => c.gridColumnAnchorIndex === ci && c.gridColumnSpan === 1).reduce((m, c) => Math.max(m, contentW(c)), 0);
    if (need > cols[ci].value + 1) { cols[ci].value = Math.ceil(need); colChanged = true; st.cols++; } }
  if (colChanged) { t.gridColumnSizes = cols; for (const c of t.children) { if (c.gridColumnSpan !== 1) continue; const w = cols[c.gridColumnAnchorIndex].value; if (Math.abs(c.width - w) > 1) { if (c.type === "FRAME") { c.maxWidth = null; c.minWidth = null; } try { c.resize(w, c.height); } catch (e) {} } }
    const W = cols.reduce((s, c) => s + (c.value || 0), 0); if (t.layoutSizingHorizontal === "FIXED" && W > t.width) t.resize(W, t.height);
    if (t.width > t.parent.width + 1) st.wide.push(t.id + " " + Math.round(t.width) + ">" + Math.round(t.parent.width)); }
  const rows = {}; for (const c of t.children) (rows[c.gridRowAnchorIndex] = rows[c.gridRowAnchorIndex] || []).push(c);
  for (const [r, cells] of Object.entries(rows)) {
    if (r === "0") continue;
    const cur = cells.reduce((m, c) => Math.max(m, c.height), 0);
    const nat = cells.reduce((m, c) => Math.max(m, contentH(c)), 0);
    if (nat <= cur + 1) continue;
    const H = Math.ceil(nat);
    for (const c of cells) { try { c.layoutSizingVertical = "FIXED"; if (c.type === "FRAME") { c.maxHeight = null; c.minHeight = null; } c.resize(c.width, H); if (c.type === "INSTANCE") { const cc = c.findOne(n => n.name === "Cell Container"); if (cc) cc.layoutSizingVertical = "FILL"; } } catch (e) {} }
    st.rows++;
  }
}
return st;
