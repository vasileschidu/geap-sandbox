// eKYC library pass round 3 (2026-10-14) · trim tables wider than their container (widest column), Cell Container FILL, resizers FIXED 0.
// Run on the current page: new AF(code)()
const inI = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
let cc0 = 0, rz = 0, trim = 0;
for (const t of figma.currentPage.findAll(n => n.type === "FRAME" && n.layoutMode === "GRID" && !inI(n) && /^Table/.test(n.name))) {
  const p = t.parent; const avail = /scroll-content/.test(p.name) ? p.width : p.width - (p.paddingLeft || 0) - (p.paddingRight || 0); const over = Math.ceil(t.width - avail);
  if (over > 0 && t.gridColumnSizes.every(c => c.type === "FIXED")) { const cols = t.gridColumnSizes.map(x => ({ ...x })); let gi = 0; cols.forEach((c, i) => { if (c.value > cols[gi].value) gi = i; }); cols[gi].value -= over; t.gridColumnSizes = cols; for (const c of t.children) { const w = cols.slice(c.gridColumnAnchorIndex, c.gridColumnAnchorIndex + (c.gridColumnSpan || 1)).reduce((s, x) => s + x.value, 0); if (Math.abs(c.width - w) < 1) continue; if (c.type === "FRAME") { c.maxWidth = null; c.minWidth = null; } try { c.resize(w, c.height); } catch (e) {} } if (t.layoutSizingHorizontal === "FIXED") t.resize(t.width - over, t.height); trim++; }
  for (const c of t.children) { if (c.type !== "INSTANCE") continue; const cc = c.findOne(n => n.name === "Cell Container"); if (cc && cc.layoutSizingVertical !== "FILL") { try { cc.layoutSizingVertical = "FILL"; cc0++; } catch (e) {} }
    for (const k of c.children.filter(k => /Resizer/.test(k.name))) if (k.height > 0.5 || k.layoutSizingVertical !== "FIXED") { try { k.layoutSizingVertical = "FIXED"; k.resize(k.width, 0); rz++; } catch (e) {} } } }
return { cc0, rz, trim };
