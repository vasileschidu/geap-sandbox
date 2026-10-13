// eKYC library pass (2026-10-14) · fit-tables v2: widen columns for raw cells, one-line dates and tags in table-cells; grow / shrink rows (min 50).
const pg = figma.currentPage;
const inI = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const st = { tables: 0, cols: 0, rows: 0, wide: [] };
const contentH = (c) => {
  if (c.type === "INSTANCE") { const cc = c.findOne(n => n.name === "Cell Container"); if (!cc) return c.height; const d = cc.children.filter(k => k.visible !== false); return d.reduce((s, k) => Math.max(s, k.height), 0) + cc.paddingTop + cc.paddingBottom; }
  const d = c.children.filter(k => k.visible !== false && k.layoutPositioning !== "ABSOLUTE");
  if (!d.length) return 0;
  if (c.layoutMode === "VERTICAL") return d.reduce((s, k) => s + k.height, 0) + (c.itemSpacing || 0) * (d.length - 1) + c.paddingTop + c.paddingBottom;
  return d.reduce((s, k) => Math.max(s, k.height), 0) + (c.paddingTop || 0) + (c.paddingBottom || 0);
};
await figma.loadFontAsync({ family: "Onest", style: "Regular" }); await figma.loadFontAsync({ family: "Onest", style: "Medium" });
const measure = async (t) => { const m = figma.createText(); try { await figma.loadFontAsync(t.fontName); m.fontName = t.fontName; m.fontSize = t.fontSize; if (t.letterSpacing !== figma.mixed) m.letterSpacing = t.letterSpacing; m.characters = t.characters; m.textAutoResize = "WIDTH_AND_HEIGHT"; return m.width; } catch (e) { return 0; } finally { m.remove(); } };
const DATE = /^\d{1,2}\s\S+\s\d{4}$/;
const instW = async (c) => { const cc = c.findOne(n => n.name === "Cell Container"); if (!cc) return 0; const pad = (cc.paddingLeft || 0) + (cc.paddingRight || 0); let w = 0;
  for (const t of c.findAll(n => n.type === "TEXT" && n.visible && DATE.test(n.characters.trim()))) w = Math.max(w, (await measure(t)) + 2);
  for (const g of c.findAll(n => n.type === "INSTANCE" && /tag/.test(n.name) && n.visible)) { const lt = g.findOne(n => n.type === "TEXT"); const ic = g.findAll(n => n.type === "INSTANCE" && n.visible); if (lt) w = Math.max(w, (await measure(lt)) + 8 + 8 + (ic.length ? 20 : 0) + 2); }
  return w ? w + pad : 0; };
const contentW = (c) => { if (c.type !== "FRAME") return 0; const d = c.children.filter(k => k.visible !== false && k.layoutPositioning !== "ABSOLUTE"); if (!d.length) return 0;
  const one = (k) => (k.type === "FRAME" && k.layoutMode === "HORIZONTAL") ? k.children.filter(x => x.visible !== false).reduce((s, x) => s + x.width, 0) + (k.itemSpacing || 0) * Math.max(0, k.children.filter(x => x.visible !== false).length - 1) + (k.paddingLeft || 0) + (k.paddingRight || 0) : (k.type === "TEXT" ? 0 : k.width);
  return (c.layoutMode === "HORIZONTAL" ? d.reduce((s, k) => s + one(k), 0) + (c.itemSpacing || 0) * (d.length - 1) : d.reduce((s, k) => Math.max(s, one(k)), 0)) + (c.paddingLeft || 0) + (c.paddingRight || 0); };
for (const t of pg.findAll(n => n.type === "FRAME" && n.layoutMode === "GRID" && !inI(n) && /^Table/.test(n.name))) {
  st.tables++;
  const cols = t.gridColumnSizes.map(x => ({ ...x })); let colChanged = false;
  for (let ci = 0; ci < cols.length; ci++) { if (cols[ci].type !== "FIXED") continue;
    let need = 0; for (const c of t.children.filter(c => c.gridColumnAnchorIndex === ci && c.gridColumnSpan === 1 && c.gridRowAnchorIndex > 0)) need = Math.max(need, c.type === "INSTANCE" ? await instW(c) : contentW(c));
    if (need > cols[ci].value + 1) { cols[ci].value = Math.ceil(need); colChanged = true; st.cols++; } }
  if (colChanged) { t.gridColumnSizes = cols; for (const c of t.children) { if (c.gridColumnSpan !== 1) continue; const w = cols[c.gridColumnAnchorIndex].value; if (Math.abs(c.width - w) > 1) { if (c.type === "FRAME") { c.maxWidth = null; c.minWidth = null; } try { c.resize(w, c.height); } catch (e) {} } }
    const W = cols.reduce((s, c) => s + (c.value || 0), 0); if (t.layoutSizingHorizontal === "FIXED" && W > t.width) t.resize(W, t.height);
    if (t.width > t.parent.width + 1) st.wide.push(t.id + " " + Math.round(t.width) + ">" + Math.round(t.parent.width)); }
  const rows = {}; for (const c of t.children) (rows[c.gridRowAnchorIndex] = rows[c.gridRowAnchorIndex] || []).push(c);
  for (const [r, cells] of Object.entries(rows)) {
    if (r === "0") continue;
    const cur = cells.reduce((m, c) => Math.max(m, c.height), 0);
    const nat = cells.reduce((m, c) => Math.max(m, contentH(c)), 0);
    const H0 = Math.max(Math.ceil(nat), 50); if (!(nat > cur + 1 || (cur > 56 && H0 < cur - 4))) continue;
    const H = H0;
    for (const c of cells) { try { c.layoutSizingVertical = "FIXED"; if (c.type === "FRAME") { c.maxHeight = null; c.minHeight = null; } c.resize(c.width, H); if (c.type === "INSTANCE") { const cc = c.findOne(n => n.name === "Cell Container"); if (cc) cc.layoutSizingVertical = "FILL"; } } catch (e) {} }
    st.rows++;
  }
}
// keep the table-cell „↔️ Resizer” frames at FIXED 0 (they grow to HUG 16 and squeeze the Cell Container)
for (const c of pg.findAll(x => x.type === "INSTANCE" && /^cell · /.test(x.name))) for (const r of c.children.filter(k => /Resizer/.test(k.name))) if (r.height > 0.5) { try { r.layoutSizingVertical = "FIXED"; r.resize(r.width, 0); } catch (e) {} }
return st;
