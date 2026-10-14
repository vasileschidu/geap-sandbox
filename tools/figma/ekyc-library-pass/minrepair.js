// eKYC library pass round 8 (2026-10-14) · run after balance.js: new AF("MINS", code)(MINS), MINS = { state: { header: configured min } }.
// repair: every registry column ≥ its minimum (non-prose: max(128, configured min, whole content); prose: header width);
// width comes from columns above their own minimum, largest slack first.
const PROSE = /^(Descriere|Valoare|Pas curent|Operatori|Motiv \/ context|Ultima activitate|Condiție|Endpoint)$/;
const inI = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const measure = async (t) => { const m = figma.createText(); let w = 0; try { const f = t.fontName === figma.mixed ? t.getRangeFontName(0, 1) : t.fontName; await figma.loadFontAsync(f); m.fontName = f; m.fontSize = t.fontSize === figma.mixed ? 14 : t.fontSize; m.characters = t.characters; m.textAutoResize = "WIDTH_AND_HEIGHT"; w = m.width; } catch (e) {} m.remove(); return w; };
const isDesc = (x) => { const s = x.characters.trim(); return s.length > 48 && / /.test(s) && !/:\/\//.test(s); };
const natW = async (n) => { if (n.visible === false || n.layoutPositioning === "ABSOLUTE") return 0; if (n.type === "TEXT") return n.characters.trim() && !isDesc(n) ? await measure(n) : 0;
  if (n.type === "INSTANCE" && n.name !== "Cell Container" && !/^cell · /.test(n.name)) return n.width; if (!("children" in n)) return n.width;
  const kids = n.children.filter(k => k.visible !== false && k.layoutPositioning !== "ABSOLUTE"); const pad = (n.paddingLeft || 0) + (n.paddingRight || 0);
  if (n.layoutMode === "HORIZONTAL") { let s = 0; for (const k of kids) s += await natW(k); return s + (n.itemSpacing || 0) * Math.max(0, kids.length - 1) + pad; }
  let m = 0; for (const k of kids) m = Math.max(m, await natW(k)); return m + pad; };
const hdrW = async (c) => { let m = 0; for (const k of c.children.filter(k => k.visible)) { if (k.type === "FRAME") { let s = 0; const kids = k.children.filter(q => q.visible); for (const q of kids) s += q.type === "TEXT" ? await measure(q) : q.width; s += (k.itemSpacing || 0) * Math.max(0, kids.length - 1); m = Math.max(m, s); } else m = Math.max(m, k.width); } return m + (c.paddingLeft || 0) + (c.paddingRight || 0); };
const out = [];
for (const s of figma.currentPage.findAll(n => n.type === "FRAME" && /^Ecran · /.test(n.name))) { const st = s.name.split(" · ")[2]; const MN = MINS[st] || {};
  for (const t of s.findAll(n => n.type === "FRAME" && n.layoutMode === "GRID" && !inI(n) && /^Table - /.test(n.name))) {
    const cols = t.gridColumnSizes.map(x => ({ ...x })); const N = cols.length;
    const hdr = cols.map((_, i) => { const h = t.children.find(c => c.gridRowAnchorIndex === 0 && c.gridColumnAnchorIndex === i); return h ? h.findAll(x => x.type === "TEXT" && x.visible).map(x => x.characters).join("").trim() : ""; });
    const need = cols.map(() => 0), hw = cols.map(() => 0);
    for (const c of t.children) { if ((c.gridColumnSpan || 1) !== 1) continue; const i = c.gridColumnAnchorIndex; if (c.gridRowAnchorIndex === 0) { hw[i] = Math.ceil(await hdrW(c) + 1); need[i] = Math.max(need[i], hw[i]); continue; } need[i] = Math.max(need[i], Math.ceil(await natW(c.type === "INSTANCE" ? (c.findOne(n => n.name === "Cell Container") || c) : c) + 1)); }
    const mins = hdr.map((h, i) => PROSE.test(h) ? hw[i] : Math.max(h ? 128 : 0, MN[h] || 0, need[i]));
    let changed = false;
    for (let i = 0; i < N; i++) { let d = mins[i] - cols[i].value; if (d <= 0.5) continue;
      while (d > 0.01) { let j = -1, sl = 0; for (let k = 0; k < N; k++) { if (k === i) continue; const v = cols[k].value - mins[k]; if (v > sl) { sl = v; j = k; } } if (j < 0) break; const g = Math.min(d, 1, sl); cols[j].value -= g; cols[i].value += g; d -= g; changed = true; }
      if (d > 0.5) out.push(st + " " + hdr[i] + " still -" + Math.round(d)); }
    if (changed) { t.gridColumnSizes = cols; for (const c of t.children) { const w = cols.slice(c.gridColumnAnchorIndex, c.gridColumnAnchorIndex + (c.gridColumnSpan || 1)).reduce((a, x) => a + x.value, 0); if (Math.abs(c.width - w) >= 0.5) { if (c.type === "FRAME") { c.maxWidth = null; c.minWidth = null; } try { c.resize(w, c.height); } catch (e) {} } } out.push(st + " → " + cols.map(c => Math.round(c.value)).join(",")); } } }
return out;
