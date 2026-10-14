// eKYC library pass round 3 (2026-10-14) · rows-only fit: every row = max(natural cell height, 50), header untouched; Cell Container FILL; resizers FIXED 0 as the LAST step.
// Run on the current page: new AF(code)()
const inI = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const nat = (c) => { if (c.type === "INSTANCE") { const cc = c.findOne(n => n.name === "Cell Container"); if (!cc) return c.height; const d = cc.children.filter(k => k.visible); return d.reduce((m, k) => Math.max(m, k.height), 0) + cc.paddingTop + cc.paddingBottom; }
  const d = c.children.filter(k => k.visible !== false && k.layoutPositioning !== "ABSOLUTE"); if (!d.length) return 0; return (c.layoutMode === "VERTICAL" ? d.reduce((s, k) => s + k.height, 0) + (c.itemSpacing || 0) * (d.length - 1) : d.reduce((m, k) => Math.max(m, k.height), 0)) + (c.paddingTop || 0) + (c.paddingBottom || 0); };
let rows = 0, rz = 0;
for (const t of figma.currentPage.findAll(n => n.type === "FRAME" && n.layoutMode === "GRID" && !inI(n) && /^Table/.test(n.name))) {
  const R = {}; for (const c of t.children) if ((c.gridRowSpan || 1) === 1 && c.layoutPositioning !== "ABSOLUTE") (R[c.gridRowAnchorIndex] = R[c.gridRowAnchorIndex] || []).push(c);
  for (const [r, cells] of Object.entries(R)) { if (r === "0") continue; const H = Math.max(50, Math.ceil(Math.max(...cells.map(nat)))); if (cells.every(c => Math.abs(c.height - H) < 1)) continue;
    for (const c of cells) { try { c.layoutSizingVertical = "FIXED"; if (c.type === "FRAME") { c.minHeight = null; c.maxHeight = null; } c.resize(c.width, H); } catch (e) {} } rows++; }
  for (const c of t.children) if (c.type === "INSTANCE") { const cc = c.findOne(n => n.name === "Cell Container"); if (cc && cc.layoutSizingVertical !== "FILL") { try { cc.layoutSizingVertical = "FILL"; } catch (e) {} } for (const k of c.children.filter(k => /Resizer/.test(k.name))) if (k.height > 0.5) { k.layoutSizingVertical = "FIXED"; k.resize(k.width, 0); rz++; } } }
return { rows, rz };
