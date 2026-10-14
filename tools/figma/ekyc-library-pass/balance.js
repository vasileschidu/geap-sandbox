// eKYC library pass round 3 (2026-10-14) · column balance: short values (≤ 34 chars: dates, „hh:mm · acum …”, numbers, codes) get their measured one-line width, taken from columns with slack (long-text columns keep ≥ 200).
// Run on the current page: new AF(code)()
const inI = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const cache = {};
const measure = async (t) => { const key = (t.fontName && t.fontName.family) + (t.fontName && t.fontName.style) + t.fontSize + "|" + t.characters; if (cache[key] !== undefined) return cache[key]; const m = figma.createText(); let w = 0; try { await figma.loadFontAsync(t.fontName); m.fontName = t.fontName; m.fontSize = t.fontSize; m.characters = t.characters; m.textAutoResize = "WIDTH_AND_HEIGHT"; w = m.width; } catch (e) {} m.remove(); cache[key] = w; return w; };
const res = { tables: 0, widened: 0, short: 0 };
for (const t of figma.currentPage.findAll(n => n.type === "FRAME" && n.layoutMode === "GRID" && !inI(n) && /^Table/.test(n.name))) {
  const cols = t.gridColumnSizes.map(x => ({ ...x })); if (cols.some(c => c.type !== "FIXED")) continue;
  const need = cols.map(() => 0), longCol = cols.map(() => false);
  for (const c of t.children) { if (c.gridRowAnchorIndex === 0 || (c.gridColumnSpan || 1) !== 1) continue; const i = c.gridColumnAnchorIndex;
    let pad = 32; const cc = c.type === "INSTANCE" ? c.findOne(n => n.name === "Cell Container") : c; if (cc) pad = (cc.paddingLeft || 0) + (cc.paddingRight || 0) + 4;
    for (const x of c.findAll(n => n.type === "TEXT" && n.visible)) { const s = x.characters.trim(); if (!s) continue; if (s.length > 34) { longCol[i] = true; continue; } let extra = 0; const tagP = x.parent && x.parent.type === "INSTANCE" ? 0 : 0; const w = await measure(x) + pad + extra + 2; if (w > need[i]) need[i] = w; } }
  // tags / buttons inside raw cells keep their own HUG width (contentW of fit-tables handles them)
  let changed = false;
  for (let i = 0; i < cols.length; i++) { if (need[i] <= cols[i].value + 1) continue; let deficit = Math.ceil(need[i] - cols[i].value);
    const donors = cols.map((c, j) => j).filter(j => j !== i && cols[j].value - Math.max(need[j], longCol[j] ? 200 : 64) > 0).sort((a, b) => (cols[b].value - need[b]) - (cols[a].value - need[a]));
    for (const j of donors) { const give = Math.min(deficit, Math.floor(cols[j].value - Math.max(need[j], longCol[j] ? 200 : 64))); if (give <= 0) continue; cols[j].value -= give; cols[i].value += give; deficit -= give; changed = true; if (deficit <= 0) break; }
    if (deficit > 0) res.short++; else res.widened++; }
  if (!changed) continue; t.gridColumnSizes = cols; res.tables++;
  for (const c of t.children) { const w = cols.slice(c.gridColumnAnchorIndex, c.gridColumnAnchorIndex + (c.gridColumnSpan || 1)).reduce((s, x) => s + x.value, 0); if (Math.abs(c.width - w) < 1) continue; if (c.type === "FRAME") { c.maxWidth = null; c.minWidth = null; } try { c.resize(w, c.height); } catch (e) {} } }
return res;
