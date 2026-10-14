// eKYC library pass round 3/4 (2026-10-14) · READ-ONLY table sweep: column-track sum ≤ table inner width (round 4), resizers > 0, squeezed Cell Container, text outside its cell, rows misaligned, table wider than its container.
// Run on the current page: new AF(code)()
const inI = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const r = { tables: 0, cells: 0, resizer: 0, squeezed: 0, textCut: 0, rowMisaligned: 0, tableOverflow: 0, colSumOver: 0, ex: [] };
for (const t of figma.currentPage.findAll(n => n.type === "FRAME" && n.layoutMode === "GRID" && !inI(n) && /^Table/.test(n.name))) {
  r.tables++; const p = t.parent; const avail = /scroll-content/.test(p.name) ? p.width : p.width - (p.paddingLeft || 0) - (p.paddingRight || 0); if (t.width > avail + 1) { r.tableOverflow++; if (r.ex.length < 12) r.ex.push("overflow " + t.id); }
  const cs = t.gridColumnSizes; if (cs.every(c => c.type === "FIXED")) { const sum = cs.reduce((a, c) => a + c.value, 0) + (t.gridColumnGap || 0) * (cs.length - 1); const inner = t.width - (t.paddingLeft || 0) - (t.paddingRight || 0); if (sum > inner + 0.5) { r.colSumOver++; if (r.ex.length < 12) r.ex.push("colsum " + t.id + " " + Math.round(sum) + ">" + Math.round(inner)); } }
  const rows = {};
  for (const c of t.children) { r.cells++; if ((c.gridRowSpan || 1) === 1) (rows[c.gridRowAnchorIndex] = rows[c.gridRowAnchorIndex] || []).push(c);
    const cb = c.absoluteBoundingBox;
    if (c.type === "INSTANCE") { if (c.children.some(k => /Resizer/.test(k.name) && k.height > 0.5)) r.resizer++; const cc = c.findOne(n => n.name === "Cell Container"); if (cc) { const kids = cc.children.filter(k => k.visible); const need = kids.reduce((m, k) => Math.max(m, k.height), 0) + cc.paddingTop + cc.paddingBottom; if (cc.height + 1 < need) { r.squeezed++; if (r.ex.length < 12) r.ex.push("squeezed " + c.id); } } }
    for (const x of c.findAll(n => n.type === "TEXT" && n.visible)) { const b = x.absoluteRenderBounds || x.absoluteBoundingBox; if (!b) continue; if (b.y + b.height > cb.y + cb.height + 1 || b.y < cb.y - 1 || b.x + b.width > cb.x + cb.width + 1) { r.textCut++; if (r.ex.length < 12) r.ex.push("cut " + c.id + " " + x.characters.slice(0, 16)); break; } } }
  for (const cells of Object.values(rows)) { const hs = cells.map(c => Math.round(c.height)), ys = cells.map(c => Math.round(c.y)); if (Math.max(...hs) - Math.min(...hs) > 1 || Math.max(...ys) - Math.min(...ys) > 1) r.rowMisaligned++; } }
return r;
