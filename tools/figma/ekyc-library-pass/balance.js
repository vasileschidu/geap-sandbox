// eKYC library pass round 8 (2026-10-14) · column balance v5 — replaces v4. Run: new AF("CODE", code)(CODE), CODE = { state: [{ c: [[header, code px, configured min]] }] } from measure-code-tables.mjs + the column defs.
// balance v5 (QA round 8, 2026-10-14). Figma cells pad 16 vs the code's 12 → code width + 8. Non-prose columns (ids, codes /
// keys, names, dates, tags, numbers) are always WHOLE: width = max(one-line content, hard content, configured min =
// max(128, column def width)). Prose columns (Descriere, Valoare, Pas curent, Operatori, Motiv, Ultima activitate,
// Condiție, Endpoint) start at code + 8, absorb extra width, and are the ONLY donors when the table is too narrow
// (floor = hard content; Descriere ≥ 280 except on the S01 / C06 families); only prose texts get an ending ellipsis.
const inI = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const cache = {};
const measure = async (t) => { const key = JSON.stringify(t.fontName) + t.fontSize + "|" + t.characters; if (cache[key] !== undefined) return cache[key]; const m = figma.createText(); let w = 0; try { const f = t.fontName === figma.mixed ? t.getRangeFontName(0, 1) : t.fontName; await figma.loadFontAsync(f); m.fontName = f; m.fontSize = t.fontSize === figma.mixed ? 14 : t.fontSize; m.characters = t.characters; m.textAutoResize = "WIDTH_AND_HEIGHT"; w = m.width; } catch (e) {} m.remove(); cache[key] = w; return w; };
let TXT = true;
// description lines (> 48 chars of prose under a name) ellipsize in the code (.e-permits-workplace__role-desc) → prose wherever they sit
const isDesc = (x) => { const s = x.characters.trim(); return s.length > 48 && / /.test(s) && !/:\/\//.test(s); };
const natW = async (n) => {
  if (n.visible === false || n.layoutPositioning === "ABSOLUTE") return 0;
  if (n.type === "TEXT") return TXT && n.characters.trim() && !isDesc(n) ? await measure(n) : 0;
  if (n.type === "INSTANCE") { if (n.name === "Cell Container" || /^cell · /.test(n.name)) {} else return n.width; }
  if (!("children" in n)) return n.width;
  const kids = n.children.filter(k => k.visible !== false && k.layoutPositioning !== "ABSOLUTE");
  const pad = (n.paddingLeft || 0) + (n.paddingRight || 0);
  if (n.layoutMode === "HORIZONTAL") { let s = 0; for (const k of kids) s += await natW(k); return s + (n.itemSpacing || 0) * Math.max(0, kids.length - 1) + pad; }
  if (n.layoutMode === "VERTICAL" || n.layoutMode === "GRID" || n.type === "INSTANCE") { let m = 0; for (const k of kids) m = Math.max(m, await natW(k)); return m + pad; }
  return n.width;
};
const hdrW = async (c) => { let m = 0; for (const k of c.children.filter(k => k.visible)) { if (k.type === "FRAME") { let s = 0; const kids = k.children.filter(q => q.visible); for (const q of kids) s += q.type === "TEXT" ? await measure(q) : q.width; s += (k.itemSpacing || 0) * Math.max(0, kids.length - 1) + (k.paddingLeft || 0) + (k.paddingRight || 0); m = Math.max(m, s); } else m = Math.max(m, k.width); } return m + (c.paddingLeft || 0) + (c.paddingRight || 0); };
const cellW = async (c) => { if (c.type === "INSTANCE") { const cc = c.findOne(n => n.name === "Cell Container"); if (cc) return await natW(cc); return await hdrW(c); } return await natW(c); };
const plainIn = (n, c) => { for (let p = n.parent; p && p !== c; p = p.parent) if (p.type === "INSTANCE" && p.name !== "Cell Container") return false; return true; };
const lines = (x) => { const lh = x.lineHeight && x.lineHeight.unit === "PIXELS" ? x.lineHeight.value : (x.fontSize === figma.mixed ? 20 : x.fontSize * 1.25); return Math.round(x.height / lh); };
const fonts = async (x) => { for (const f of x.getRangeAllFontNames(0, x.characters.length)) await figma.loadFontAsync(f); };
const oneLine = async (x, cell) => { const chain = []; for (let p = x; p && p !== cell; p = p.parent) chain.unshift(p);
  for (const n of chain) { const P = n.parent; if (P && P.layoutMode && P.layoutMode !== "NONE" && n.layoutPositioning !== "ABSOLUTE" && n.layoutSizingHorizontal !== "FILL") { try { n.layoutSizingHorizontal = "FILL"; } catch (e) {} } }
  await fonts(x); x.textAutoResize = "HEIGHT"; x.textTruncation = "ENDING"; x.maxLines = 1; };
const PROSE = /^(Descriere|Valoare|Pas curent|Operatori|Motiv \/ context|Ultima activitate|Condiție|Endpoint)$/;
const res = { tables: 0, matched: 0, changed: 0, truncated: 0, whole: 0, short: [], belowMin: [] };
for (const s of figma.currentPage.findAll(n => n.type === "FRAME" && /^Ecran · /.test(n.name))) {
  const st = s.name.split(" · ")[2]; const code = CODE[st]; const wideFam = /^ek-(04|27)/.test(st);
  for (const t of s.findAll(n => n.type === "FRAME" && n.layoutMode === "GRID" && !inI(n) && /^Table/.test(n.name))) { res.tables++;
    const cols = t.gridColumnSizes.map(x => ({ ...x })); const N = cols.length;
    const hdr = cols.map((_, i) => { const h = t.children.find(c => c.gridRowAnchorIndex === 0 && c.gridColumnAnchorIndex === i); return h ? h.findAll(x => x.type === "TEXT" && x.visible).map(x => x.characters).join("").trim() : ""; });
    const prose = hdr.map(h => PROSE.test(h));
    let best = null, bs = 0; for (const ct of code || []) { const L = ct.c.map(c => c[0]); const sc = hdr.filter(h => h && L.includes(h)).length; if (sc > bs) { bs = sc; best = ct; } }
    if (cols.every(c => c.type === "FIXED") && best && bs >= Math.max(2, hdr.filter(Boolean).length - 1)) { res.matched++;
      const soft = cols.map(() => 0), hard = cols.map(() => 0);
      for (const c of t.children) { if ((c.gridColumnSpan || 1) !== 1) continue; const i = c.gridColumnAnchorIndex;
        if (c.gridRowAnchorIndex === 0) { const h = Math.ceil(await hdrW(c) + 1); hard[i] = Math.max(hard[i], h); soft[i] = Math.max(soft[i], h); continue; }
        TXT = true; soft[i] = Math.max(soft[i], Math.ceil(await cellW(c) + 1)); TXT = false; hard[i] = Math.max(hard[i], Math.ceil(await cellW(c) + 1)); }
      TXT = true;
      const blanks = best.c.filter(c => c[0] === "");
      const def = hdr.map((h, i) => (h ? best.c.find(c => c[0] === h) : blanks[blanks.length - 1]) || [h, cols[i].value - 8, 0]);
      const minW = def.map(d => d[2]);
      const req = cols.map((_, i) => prose[i] ? Math.max(def[i][1] + 8, hard[i]) : Math.max(soft[i], hard[i], minW[i]));
      const floor = cols.map((_, i) => prose[i] ? Math.max(hard[i], /^Descriere$/.test(hdr[i]) && !wideFam ? Math.min(req[i], 280) : 0) : Math.max(soft[i], hard[i], minW[i]));
      const W = cols.reduce((a, c) => a + c.value, 0); let d = W - req.reduce((a, v) => a + v, 0);
      if (d > 0) { const pi = req.map((v, i) => i).filter(i => prose[i]); const tg = pi.length ? pi.sort((a, b) => def[b][1] - def[a][1])[0] : def.map(x => x[1]).indexOf(Math.max(...def.map(x => x[1]))); req[tg] += d; d = 0; }
      if (d < 0) { const order = req.map((v, i) => i).filter(i => prose[i] && req[i] > floor[i]).sort((a, b) => (req[b] - floor[b]) - (req[a] - floor[a]));
        while (d < -0.01) { let j = -1, sl = 0; for (const k of order) { const v = req[k] - floor[k]; if (v > sl) { sl = v; j = k; } } if (j < 0) break; const g = Math.min(-d, 1, sl); req[j] -= g; d += g; } }
      if (d < -0.01) { // last resort: non-prose down to whole content (below configured min), never below one-line content
        const lim = cols.map((_, i) => prose[i] ? floor[i] : Math.max(soft[i], hard[i]));
        while (d < -0.01) { let j = -1, sl = 0; for (let k = 0; k < N; k++) { const v = req[k] - lim[k]; if (v > sl) { sl = v; j = k; } } if (j < 0) break; const g = Math.min(-d, 1, sl); req[j] -= g; d += g; res.belowMin.push(st + " " + hdr[j]); } }
      if (d < -0.01) res.short.push(st + " " + Math.round(-d));
      const nv = req.map(v => Math.round(v * 10) / 10); const drift = W - nv.reduce((a, v) => a + v, 0); const pj = nv.map((v, i) => i).filter(i => prose[i]); nv[pj.length ? pj[0] : nv.indexOf(Math.max(...nv))] += drift;
      if (nv.some((v, i) => Math.abs(v - cols[i].value) > 0.5)) { res.changed++; nv.forEach((v, i) => cols[i].value = v); t.gridColumnSizes = cols;
        for (const c of t.children) { const w = cols.slice(c.gridColumnAnchorIndex, c.gridColumnAnchorIndex + (c.gridColumnSpan || 1)).reduce((a, x) => a + x.value, 0); if (Math.abs(c.width - w) < 0.5) continue; if (c.type === "FRAME") { c.maxWidth = null; c.minWidth = null; } try { c.resize(w, c.height); } catch (e) {} } } }
    for (const c of t.children) { if (c.gridRowAnchorIndex === 0 || (c.gridColumnSpan || 1) !== 1) continue; const i = c.gridColumnAnchorIndex; const box = c.type === "INSTANCE" ? c.findOne(n => n.name === "Cell Container") : c; if (!box) continue;
      for (const x of c.findAll(n => n.type === "TEXT" && n.visible && plainIn(n, c))) { if (!x.characters.trim()) continue;
        if (!prose[i] && !isDesc(x)) { if (x.textTruncation === "ENDING") { await fonts(x); x.textTruncation = "DISABLED"; x.maxLines = null; res.whole++; } continue; }
        const bb = box.absoluteBoundingBox, b = x.absoluteBoundingBox; const R = bb.x + bb.width - (box.paddingRight || 0) + 0.5;
        if (lines(x) > 1 || (b && b.x + b.width > R)) { try { await oneLine(x, c); res.truncated++; } catch (e) {} } } } } }
const u = [...new Set(res.belowMin)]; res.belowMin = u.slice(0, 12); res.short = res.short.slice(0, 10); return res;
