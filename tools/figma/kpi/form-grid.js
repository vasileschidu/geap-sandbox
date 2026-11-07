// KPI form grid (2026-11-07, user: „forms = the code's 12-track grid”). Code `.e-permits-user-create__grid` (12 tracks,
// field--6 = half, field--12 = full, gap 24) → Figma auto-layout GRID 2 × 1fr, row + column gap 24 bound (spacing var
// taken from the container's bound gap), every item FILL. Half items = labels in SPAN1 (from the code's field--6 list:
// tools/figma/kpi … shotspec dump); rows (HORIZONTAL of field wrappers) are flattened; notes, check groups, rule builders,
// empty states, switches = span 2. Stored as `kpi`/`formgrid`: `await new AF("ROOTS","APPLY", src)(screenIds, true)`.
const SPAN1 = new Set(["Domeniu", "Cod", "Denumire (RU)", "Denumire (EN)", "Ce se calculează", "Coloana", "Data de referință", "Tip de valoare", "Format", "Unitatea duratei", "Direcție", "Ținta", "Pragul de apropiere", "Subdiviziune", "Rol"]);
const FIELD = /^(text-input|select-input|text-area|textarea|date-input)/i;
const ins = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const setName = (n) => (n.mainComponent && n.mainComponent.parent && n.mainComponent.parent.type === "COMPONENT_SET" ? n.mainComponent.parent.name : (n.mainComponent && n.mainComponent.name) || "");
const isField = (n) => n.type === "INSTANCE" && FIELD.test(setName(n));
const flow = (p) => p.children.filter((k) => k.visible !== false && k.layoutPositioning !== "ABSOLUTE");
const fieldsIn = (n) => isField(n) ? [n] : ("findAll" in n && n.type !== "INSTANCE" ? n.findAll((x) => isField(x) && x.visible !== false) : []);
const labelOf = (f) => { const p = f.componentProperties || {}; for (const k in p) if (p[k].type === "TEXT" && /Label/i.test(k)) return String(p[k].value).trim(); const t = f.findOne((x) => x.type === "TEXT" && /label/i.test(x.name)); return t ? t.characters.trim() : ""; };
const heading = (n) => n.type === "INSTANCE" ? /Section header|section-heading/i.test(setName(n) + n.name) : n.type === "TEXT" ? (n.fontSize !== figma.mixed && n.fontSize >= 16) : ("children" in n && n.children.some(heading));
const isRow = (c) => c.type === "FRAME" && c.layoutMode === "HORIZONTAL" && flow(c).length >= 2 && flow(c).every((k) => fieldsIn(k).length === 1);
const out = { grids: [], skipped: [] };
for (const rid of ROOTS) {
  const root = await figma.getNodeByIdAsync(rid); if (!root) continue;
  const fields = root.findAll((n) => isField(n) && n.visible !== false && !ins(n));
  const cand = new Map();
  for (const f of fields) {
    let item = f.parent && f.parent.type === "FRAME" && flow(f.parent).length === 1 ? f.parent : f;
    let p = item.parent; if (p && isRow(p)) p = p.parent;
    if (p && p.type === "FRAME" && !ins(p)) cand.set(p.id, p);
  }
  for (const o of root.findAll((n) => n.type === "INSTANCE" && /Document option/i.test(setName(n) + " " + n.name) && !ins(n))) { const g = o.parent && o.parent.parent; const p = g && g.parent; if (p && p.type === "FRAME" && !ins(p)) cand.set(p.id, p); }
  for (const p of cand.values()) {
    if (/Rule row/i.test(p.name) || (p.layoutMode === "HORIZONTAL" && flow(p).length > 1)) { out.skipped.push(p.id + " row " + p.name); continue; }
    if (p.layoutMode === "GRID") { out.skipped.push(p.id + " grid"); continue; }
    const ks = flow(p);
    if (ks.some(heading) || !ks.length) { out.skipped.push(p.id + " heading " + p.name); continue; }
    const items = [];
    for (const c of ks) {
      if (isRow(c)) for (const k of flow(c)) items.push({ n: k, span: SPAN1.has(labelOf(fieldsIn(k)[0])) ? 1 : 2, from: c });
      else { const fs = fieldsIn(c); items.push({ n: c, span: fs.length === 1 && SPAN1.has(labelOf(fs[0])) ? 1 : 2 }); }
    }
    let r = 0, col = 0; for (const it of items) { if (it.span === 2 && col === 1) { r++; col = 0; } it.r = r; it.c = col; col += it.span; if (col >= 2) { r++; col = 0; } }
    const rows = col === 0 ? r : r + 1;
    out.grids.push(p.id + " " + p.name + " rows " + rows + " [" + items.map((it) => (it.span === 1 ? "½" : "1") + ":" + (fieldsIn(it.n)[0] ? labelOf(fieldsIn(it.n)[0]) : it.n.name).slice(0, 14)).join(", ") + "]");
    if (!APPLY) continue;
    /* in-place VERTICAL → GRID throws „Cannot delete occupied row/column” → build a new GRID frame at p's place */
    const gapVar = p.boundVariables && p.boundVariables.itemSpacing ? await figma.variables.getVariableByIdAsync(p.boundVariables.itemSpacing.id) : null;
    const par = p.parent, G = figma.createFrame();
    G.name = p.name; G.clipsContent = false;
    // keep the container's card look (fills, border, radius) — a padded form container is often the card itself
    G.fills = p.fills; G.strokes = p.strokes; G.strokeWeight = p.strokeWeight; G.strokeAlign = p.strokeAlign; G.cornerRadius = p.cornerRadius === figma.mixed ? 0 : p.cornerRadius; G.effects = p.effects;
    for (const k of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) { const b = p.boundVariables && p.boundVariables[k]; if (b) G.setBoundVariable(k, await figma.variables.getVariableByIdAsync(b.id)); }
    par.insertChild(par.children.indexOf(p), G);
    G.layoutMode = "GRID"; G.gridColumnCount = 2; G.gridRowCount = rows + 2 * items.length + 2;
    G.gridColumnSizes = [{ type: "FLEX", value: 1 }, { type: "FLEX", value: 1 }];
    for (const k of ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"]) { G[k] = p[k]; const b = p.boundVariables && p.boundVariables[k]; if (b) G.setBoundVariable(k, await figma.variables.getVariableByIdAsync(b.id)); }
    G.gridRowGap = 24; G.gridColumnGap = 24;
    if (gapVar) { G.setBoundVariable("gridRowGap", gapVar); G.setBoundVariable("gridColumnGap", gapVar); }
    G.layoutSizingHorizontal = p.layoutSizingHorizontal === "HUG" ? "FILL" : p.layoutSizingHorizontal; if (par.layoutMode === "HORIZONTAL") G.layoutGrow = p.layoutGrow;
    G.layoutSizingVertical = "HUG";
    // appending auto-places (and may add up to 12 columns) → park each item far below right away, then place
    items.forEach((it, i) => { it.from0 = it.n.parent; G.appendChild(it.n); it.n.gridColumnSpan = 1; it.n.setGridChildPosition(rows + items.length + 1 + i, 0); });
    for (const it of items) { const from = it.from0; it.n.setGridChildPosition(it.r, it.c); it.n.gridColumnSpan = it.span; it.n.layoutSizingHorizontal = "FILL"; if (it.n.type !== "TEXT") it.n.layoutSizingVertical = "HUG"; for (const f of fieldsIn(it.n)) if (f !== it.n && f.parent.layoutMode && f.parent.layoutMode !== "GRID") f.layoutSizingHorizontal = "FILL"; if (from !== p && !from.removed && from.children.length === 0) from.remove(); }
    G.gridColumnCount = 2; { const inner = Math.round(G.width - G.paddingLeft - G.paddingRight - 24); const h = Math.floor(inner / 2); G.gridColumnSizes = [{ type: "FLEX", value: inner - h }, { type: "FLEX", value: h }]; }
    for (const n of G.findAll((n) => n.layoutSizingHorizontal === "FILL" && n.parent && n.parent.layoutMode === "VERTICAL")) { const pw = n.parent.width - n.parent.paddingLeft - n.parent.paddingRight; if (Math.abs(n.width - pw) > 1) { n.layoutSizingHorizontal = "FIXED"; n.resize(pw, n.height); n.layoutSizingHorizontal = "FILL"; } }
    G.gridRowCount = Math.max(1, rows);
    G.gridRowSizes = Array.from({ length: Math.max(1, rows) }, () => ({ type: "HUG" }));
    const left = p.children.length; p.remove(); if (left) out.grids.push("  dropped " + left + " hidden from " + G.id);
    out.ids = (out.ids || []).concat(G.id);
    if (!gapVar) out.grids.push("  ! no gap var on " + G.id);
  }
}
return out;
