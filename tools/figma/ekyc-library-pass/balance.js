// eKYC library pass round 7 (2026-10-14) · column balance v4 — replaces v3 (wrap) with the code rule: one line + ellipsis, code column widths.
// Measure the code first: node --experimental-websocket tools/figma/ekyc-library-pass/measure-code-tables.mjs jobs.json out.json → CODE.
// Run on the current page: new AF("CODE", code)(CODE). Then rows.js (natural heights, min 50, resizers last) and sweep.js.
// balance v4 (QA round 7, 2026-10-14) · code tracks + one line. The code never wraps a table cell (white-space: nowrap;
// text-overflow: ellipsis) and sizes columns clamp(one-line content, min, max) → copy the RENDERED code widths (CODE =
// { state: [{ v: visible width, c: [[header, px], …] }] }, measured in headless Chrome), keep hard content (buttons, tags)
// whole, fit the sum to the Figma table (extra → the widest code column; excess ← columns wider than their content,
// then down to the hard need, keeping ≥ 280 on Descriere / Caz de utilizare / Motiv), then every body text that would wrap
// or overflow becomes ONE line with an ending ellipsis (FILL chain + textTruncation ENDING, maxLines 1).
const inI = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const cache = {};
const measure = async (t) => { const key = JSON.stringify(t.fontName) + t.fontSize + "|" + t.characters; if (cache[key] !== undefined) return cache[key]; const m = figma.createText(); let w = 0; try { const f = t.fontName === figma.mixed ? t.getRangeFontName(0, 1) : t.fontName; await figma.loadFontAsync(f); m.fontName = f; m.fontSize = t.fontSize === figma.mixed ? 14 : t.fontSize; m.characters = t.characters; m.textAutoResize = "WIDTH_AND_HEIGHT"; w = m.width; } catch (e) {} m.remove(); cache[key] = w; return w; };
let TXT = true;
const natW = async (n) => {
  if (n.visible === false || n.layoutPositioning === "ABSOLUTE") return 0;
  if (n.type === "TEXT") return TXT && n.characters.trim() ? await measure(n) : 0;
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
const lines = (x) => { const lh = x.lineHeight && x.lineHeight.unit === "PIXELS" ? x.lineHeight.value : (x.fontSize === figma.mixed ? 20 : x.fontSize * 1.25); return Math.round(x.height / lh); };
const oneLine = async (x, cell) => { const chain = []; for (let p = x; p && p !== cell; p = p.parent) chain.unshift(p);
  for (const n of chain) { const P = n.parent; if (P && P.layoutMode && P.layoutMode !== "NONE" && n.layoutPositioning !== "ABSOLUTE" && n.layoutSizingHorizontal !== "FILL") { try { n.layoutSizingHorizontal = "FILL"; } catch (e) {} } }
  for (const f of x.getRangeAllFontNames(0, x.characters.length)) await figma.loadFontAsync(f);
  x.textAutoResize = "HEIGHT"; x.textTruncation = "ENDING"; x.maxLines = 1; };
const PROTECT = /^(Descriere|Caz de utilizare|Motiv \/ context|Cazuri de utilizare)$/;
const res = { tables: 0, matched: 0, changed: 0, truncated: 0, unmatched: [], short: [] };
for (const s of figma.currentPage.findAll(n => n.type === "FRAME" && /^Ecran · /.test(n.name))) {
  const st = s.name.split(" · ")[2]; const code = CODE[st];
  for (const t of s.findAll(n => n.type === "FRAME" && n.layoutMode === "GRID" && !inI(n) && /^Table/.test(n.name))) { res.tables++;
    const cols = t.gridColumnSizes.map(x => ({ ...x })); const N = cols.length;
    const hdr = cols.map((_, i) => { const h = t.children.find(c => c.gridRowAnchorIndex === 0 && c.gridColumnAnchorIndex === i); return h ? h.findAll(x => x.type === "TEXT" && x.visible).map(x => x.characters).join("").trim() : ""; });
    let best = null, bs = 0; for (const ct of code || []) { const L = ct.c.map(c => c[0]); const sc = hdr.filter(h => h && L.includes(h)).length; if (sc > bs) { bs = sc; best = ct; } }
    if (cols.every(c => c.type === "FIXED") && best && bs >= Math.max(2, hdr.filter(Boolean).length - 1)) { res.matched++;
      const soft = cols.map(() => 0), hard = cols.map(() => 0);
      for (const c of t.children) { if ((c.gridColumnSpan || 1) !== 1) continue; const i = c.gridColumnAnchorIndex;
        TXT = true; const sw = Math.ceil(await cellW(c) + 1); soft[i] = Math.max(soft[i], sw);
        if (c.gridRowAnchorIndex === 0) hard[i] = Math.max(hard[i], sw); else { TXT = false; hard[i] = Math.max(hard[i], Math.ceil(await cellW(c) + 1)); } }
      TXT = true;
      const blanks = best.c.filter(c => c[0] === "");
      const tgt = hdr.map((h, i) => { const m = h ? best.c.find(c => c[0] === h) : blanks[blanks.length - 1]; return m ? m[1] : cols[i].value; });
      const req = tgt.map((v, i) => Math.max(v, hard[i]));
      const W = cols.reduce((a, c) => a + c.value, 0); let d = Math.round((W - req.reduce((a, v) => a + v, 0)) * 10) / 10;
      if (d > 0) { const order = req.map((v, i) => i).sort((a, b) => (soft[b] - req[b]) - (soft[a] - req[a]));
        for (const i of order) { if (d <= 0) break; const g = Math.min(d, Math.max(0, soft[i] - req[i])); req[i] += g; d -= g; }
        if (d > 0) { const wi = tgt.indexOf(Math.max(...tgt)); req[wi] += d; d = 0; } }
      const floors = [req.map((v, i) => Math.max(hard[i], Math.min(v, soft[i]), PROTECT.test(hdr[i]) ? Math.min(v, 280) : 0)), req.map((v, i) => Math.max(hard[i], PROTECT.test(hdr[i]) ? Math.min(v, 280) : 0)), hard.map((h, i) => PROTECT.test(hdr[i]) ? Math.max(h, Math.min(req[i], 280)) : h), hard];
      for (const fl of floors) { if (d >= 0) break; const order = req.map((v, i) => i).filter(i => req[i] > fl[i]).sort((a, b) => (req[b] - fl[b]) - (req[a] - fl[a]));
        for (const i of order) { if (d >= 0) break; const g = Math.min(-d, req[i] - fl[i]); req[i] -= g; d += g; } }
      if (d < -0.5) res.short.push(st + " " + Math.round(-d));
      const nv = req.map(v => Math.round(v * 10) / 10); const drift = W - nv.reduce((a, v) => a + v, 0); nv[nv.indexOf(Math.max(...nv))] += drift;
      if (nv.some((v, i) => Math.abs(v - cols[i].value) > 0.5)) { res.changed++; nv.forEach((v, i) => cols[i].value = v); t.gridColumnSizes = cols;
        for (const c of t.children) { const w = cols.slice(c.gridColumnAnchorIndex, c.gridColumnAnchorIndex + (c.gridColumnSpan || 1)).reduce((a, x) => a + x.value, 0); if (Math.abs(c.width - w) < 0.5) continue; if (c.type === "FRAME") { c.maxWidth = null; c.minWidth = null; } try { c.resize(w, c.height); } catch (e) {} } }
    } else if (code) res.unmatched.push(st + ":" + hdr.join("/").slice(0, 40));
    for (const c of t.children) { if (c.gridRowAnchorIndex === 0) continue; const box = c.type === "INSTANCE" ? c.findOne(n => n.name === "Cell Container") : c; if (!box) continue;
      for (const x of c.findAll(n => n.type === "TEXT" && n.visible && plainIn(n, c))) { if (!x.characters.trim()) continue;
        const bb = box.absoluteBoundingBox, b = x.absoluteBoundingBox; const R = bb.x + bb.width - (box.paddingRight || 0) + 0.5;
        if (lines(x) > 1 || (b && b.x + b.width > R)) { try { await oneLine(x, c); res.truncated++; } catch (e) {} } } } } }
res.unmatched = res.unmatched.slice(0, 10); res.short = res.short.slice(0, 10); return res;
