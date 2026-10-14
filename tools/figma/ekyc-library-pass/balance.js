// eKYC library pass round 6 (2026-10-14) · column balance v3 (replaces the round-3 text-only balance).
// Run on the current page: new AF(code)(). Then rows.js (natural heights, resizers last) and sweep.js.
// balance v3: hard need = non-text content (buttons, tags, icons, header labels) + padding — always met.
// soft need = full one-line text width — met when the table has room; otherwise text columns give down to
// max(hard, 80% soft) and their body texts wrap (FILL + HEIGHT) instead of being cut. Long text (> 40 chars) keeps ≥ 170 (Descriere ≥ 200).
const inI = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const cache = {};
const measure = async (t) => { const key = (t.fontName && t.fontName.style) + t.fontSize + "|" + t.characters; if (cache[key] !== undefined) return cache[key]; const m = figma.createText(); let w = 0; try { await figma.loadFontAsync(t.fontName); m.fontName = t.fontName; m.fontSize = t.fontSize; m.characters = t.characters; m.textAutoResize = "WIDTH_AND_HEIGHT"; w = m.width; } catch (e) {} m.remove(); cache[key] = w; return w; };
const LONG = 40;
let TXT = true;
const natW = async (n) => {
  if (n.visible === false || n.layoutPositioning === "ABSOLUTE") return 0;
  if (n.type === "TEXT") { if (!TXT) return 0; const s = n.characters.trim(); if (/:\/\/|^[{\[]/.test(s)) return 0; return s && s.length <= LONG ? await measure(n) : 0; }
  if (n.type === "INSTANCE") { if (n.name === "Cell Container" || /^cell · /.test(n.name)) {} else return n.width; }
  if (!("children" in n)) return n.width;
  const kids = n.children.filter(k => k.visible !== false && k.layoutPositioning !== "ABSOLUTE");
  const pad = (n.paddingLeft || 0) + (n.paddingRight || 0);
  if (n.layoutMode === "HORIZONTAL") { let s = 0; for (const k of kids) s += await natW(k); return s + (n.itemSpacing || 0) * Math.max(0, kids.length - 1) + pad; }
  if (n.layoutMode === "VERTICAL" || n.layoutMode === "GRID" || n.type === "INSTANCE") { let m = 0; for (const k of kids) m = Math.max(m, await natW(k)); return m + pad; }
  return n.width;
};
const cellW = async (c) => { if (c.type === "INSTANCE") { const cc = c.findOne(n => n.name === "Cell Container"); if (cc) return await natW(cc); let m = 0; for (const k of c.children.filter(k => k.visible)) m = Math.max(m, k.type === "FRAME" ? await natW(k) : k.width); return m + (c.paddingLeft || 0) + (c.paddingRight || 0); } return await natW(c); };
const plainIn = (n, c) => { for (let p = n.parent; p && p !== c; p = p.parent) if (p.type === "INSTANCE" && p.name !== "Cell Container") return false; return true; };
const isLong = (c) => c.findAll(n => n.type === "TEXT" && n.visible && n.characters.trim().length > LONG).length > 0;
const res = { tables: 0, cols: 0, wrapped: 0, short: [] };
for (const t of figma.currentPage.findAll(n => n.type === "FRAME" && n.layoutMode === "GRID" && !inI(n) && /^Table/.test(n.name))) {
  const cols = t.gridColumnSizes.map(x => ({ ...x })); if (cols.some(c => c.type !== "FIXED")) continue;
  const soft = cols.map(() => 0), hard = cols.map(() => 0), longCol = cols.map(() => false);
  for (const c of t.children) { if ((c.gridColumnSpan || 1) !== 1) continue; const i = c.gridColumnAnchorIndex;
    TXT = true; const s = Math.ceil(await cellW(c) + 1); soft[i] = Math.max(soft[i], s);
    if (c.gridRowAnchorIndex === 0) hard[i] = Math.max(hard[i], s); else { TXT = false; hard[i] = Math.max(hard[i], Math.ceil(await cellW(c) + 1)); if (isLong(c)) longCol[i] = true; } }
  TXT = true;
  const hdrTxt = (i) => { const h = t.children.find(c => c.gridRowAnchorIndex === 0 && c.gridColumnAnchorIndex === i); return h ? h.findAll(x => x.type === "TEXT").map(x => x.characters).join(" ") : ""; };
  const floor = (i) => longCol[i] ? (/Descriere/.test(hdrTxt(i)) ? 200 : 170) : 40;
  const H = hard.map((h, i) => Math.max(h, floor(i))), S = soft.map((s, i) => Math.max(s, H[i]));
  const M = S.map((s, i) => Math.max(H[i], Math.ceil(s * 0.8)));
  let changed = false;
  const take = (i, deficit, lim) => { const donors = cols.map((c, j) => j).filter(j => j !== i && cols[j].value - lim[j] > 0).sort((a, b) => (cols[b].value - lim[b]) - (cols[a].value - lim[a]));
    for (const j of donors) { const give = Math.min(deficit, Math.floor(cols[j].value - lim[j])); if (give <= 0) continue; cols[j].value -= give; cols[i].value += give; deficit -= give; changed = true; if (deficit <= 0) break; } return deficit; };
  // 1. hard needs (non-text) first: from soft slack, then from wrap slack, then down to hard
  for (let i = 0; i < cols.length; i++) { if (H[i] <= cols[i].value + 0.5) continue; let d = Math.ceil(H[i] - cols[i].value); res.cols++;
    for (const lim of [S, M, H]) { if (d > 0) d = take(i, d, lim); }
    if (d > 0) { let s = t; while (s && !/^Ecran/.test(s.name)) s = s.parent; res.short.push((s ? s.name.slice(7, 13) : "?") + " col" + i + " -" + d); } }
  // 2. soft needs (one-line text) from soft slack only
  for (let i = 0; i < cols.length; i++) { if (S[i] <= cols[i].value + 0.5) continue; let d = Math.ceil(S[i] - cols[i].value); res.cols++; d = take(i, d, S); }
  if (changed) { res.tables++; t.gridColumnSizes = cols;
    for (const c of t.children) { const w = cols.slice(c.gridColumnAnchorIndex, c.gridColumnAnchorIndex + (c.gridColumnSpan || 1)).reduce((s, x) => s + x.value, 0); if (Math.abs(c.width - w) < 1) continue; if (c.type === "FRAME") { c.maxWidth = null; c.minWidth = null; } try { c.resize(w, c.height); } catch (e) {} } }
  // 3. columns still below one-line width: body texts wrap inside the cell instead of being cut
  for (let i = 0; i < cols.length; i++) { if (S[i] <= cols[i].value + 0.5) continue;
    for (const c of t.children) { if (c.gridRowAnchorIndex === 0 || c.gridColumnAnchorIndex !== i) continue;
      for (const x of c.findAll(n => n.type === "TEXT" && n.visible && plainIn(n, c))) {
        try { if (x.characters.trim() && (x.textAutoResize === "WIDTH_AND_HEIGHT" || x.layoutSizingHorizontal !== "FILL")) { await figma.loadFontAsync(x.fontName); if (x.parent.layoutMode && x.parent.layoutMode !== "NONE") x.layoutSizingHorizontal = "FILL"; x.textAutoResize = "HEIGHT"; res.wrapped++; } } catch (e) {} } } }
}
res.short = res.short.slice(0, 15); return res;
