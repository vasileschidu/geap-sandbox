// __fix-ekyc — second pass after __swap-ekyc (eKYC file SqMGpRKEppJLcvn7HMzOPR, stored text node 10261:24458).
// Run: new AF("ROOTS", code)(screenIds). Idempotent. Synced 2026-10-13 from the stored copy.
// (a) checkbox + text rows → checkbox-label · (a2) 44×24 pill toggles → switch · (b) removable chips → input-chip
// (c0) GRID rows → HUG · (c) overflowing FIXED vertical frames → hug · (d) leftover „Label” → „Etichetă”
// (e) bare bordered „Text Input” boxes (repeatable rows) → text-input without label
// (f) local „Icon / eKYC / …” icons inside library buttons take the label paint
// (g) raw „Button - Șterge căutarea” next to a library search → removed
// (h) raw „Table Cell” frames → library table-cell (Text / Number / Tag); mixed cells stay frames of instances (library gap).
const inI = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const prop = (i, s) => Object.keys(i.componentProperties).find((k) => k.startsWith(s));
const CL = await figma.importComponentSetByKeyAsync("3cf40c11a574bcefcc4f9daf0f93322f77a627a1");
const IC = await figma.importComponentSetByKeyAsync("3168d84c4883c991b5643e4feab97de2cfe8fb7e");
const texts = (n) => n.findAll ? n.findAll((x) => x.type === "TEXT" && x.visible !== false) : [];
const st = { chkRow: 0, chip: 0, hug: 0, label: 0 };
for (const id of ROOTS) {
  const root = await figma.getNodeByIdAsync(id); if (!root) continue;
  // (a) checkbox + text rows → checkbox-label
  for (const cb of root.findAll((n) => n.type === "INSTANCE" && n.name === "checkbox" && !inI(n))) {
    const row = cb.parent; if (!row || row.type !== "FRAME" || row === root) continue;
    const others = row.children.filter((k) => k !== cb);
    if (!others.length || others.some((k) => k.type === "INSTANCE" && k.name !== "checkbox")) continue;
    const tx = texts(row); if (!tx.length || tx.length > 3) continue;
    const label = tx.map((t) => t.characters.trim()).join(" · ").replace(/\s+/g, " ");
    const on = /Checked/.test(cb.mainComponent.name) && !/Unchecked/.test(cb.mainComponent.name);
    const size = cb.height <= 18 ? "Small" : "Medium";
    const v = CL.children.find((c) => c.name.includes("Mode=" + (on ? "Checked" : "Unchecked")) && c.name.includes("State=Default") && c.name.includes("Size=" + size) && c.name.includes("Supporting Text=False"));
    if (!v) continue; const i = v.createInstance(); i.setProperties({ [prop(i, "⌨️ Label")]: label }); i.name = "checkbox-label · " + label.slice(0, 30);
    const p = row.parent; const idx = p.children.indexOf(row); const w = row.width; p.insertChild(idx, i);
    if (p.layoutMode && p.layoutMode !== "NONE") { if (row.layoutSizingHorizontal === "FILL") i.layoutSizingHorizontal = "FILL"; } else { i.x = row.x; i.y = row.y; }
    row.remove(); st.chkRow++;
  }
  // (a2) toggles (44×24 pill with a knob) → library switch
  { const SWS = await figma.importComponentSetByKeyAsync("5a669ca263b399adc9c78a5000130c5b19ce8a32");
    for (const f of root.findAll((n) => n.type === "FRAME" && !inI(n) && n.width >= 36 && n.width <= 52 && n.height >= 18 && n.height <= 28 && (n.cornerRadius !== figma.mixed && n.cornerRadius >= 999) && n.children && n.children.length <= 2 && !n.findOne((x) => x.type === "TEXT"))) {
      const fl = Array.isArray(f.fills) && f.fills.find((p) => p.visible !== false && p.type === "SOLID"); const on = fl && fl.color.b > 0.6 && fl.color.r < 0.3;
      const i = SWS.children.find((c) => c.name.includes("State=Default") && c.name.includes("Checked=" + (on ? "True" : "False"))).createInstance(); i.name = "switch"; const p = f.parent; p.insertChild(p.children.indexOf(f), i); if (!(p.layoutMode && p.layoutMode !== "NONE")) { i.x = f.x; i.y = f.y; } f.remove(); st.sw = (st.sw || 0) + 1; } }
  // (b) removable chips → input-chip
  for (const f of root.findAll((n) => n.type === "FRAME" && !inI(n) && (n.cornerRadius === figma.mixed || n.cornerRadius >= 999) && n.children && n.findOne((x) => x.type === "FRAME" && /^Button - Elimină/.test(x.name)))) {
    if (f.removed) continue; const t = texts(f).map((x) => x.characters.trim()).filter(Boolean)[0]; if (!t) continue;
    const i = IC.children.find((c) => c.name.includes("Type=Simple") && c.name.includes("State=Default")).createInstance(); i.setProperties({ [prop(i, "⌨️ Label")]: t }); i.name = "chip · " + t;
    const p = f.parent; p.insertChild(p.children.indexOf(f), i); if (!(p.layoutMode && p.layoutMode !== "NONE")) { i.x = f.x; i.y = f.y; } f.remove(); st.chip++;
  }
  // (c0) GRID frames: rows hug their content (captured rows are FIXED), frame hugs
  for (const f of root.findAll((n) => n.type === "FRAME" && !inI(n) && n.layoutMode === "GRID")) { try { f.gridRowSizes = f.gridRowSizes.map(() => ({ type: "HUG" })); } catch (e) { st.gridErr = (st.gridErr || 0) + 1; } try { f.layoutSizingVertical = "HUG"; } catch (e) {} st.grid = (st.grid || 0) + 1; }
  // (c) fixed-height vertical frames whose content overflows → hug
  for (const f of root.findAll((n) => n.type === "FRAME" && !inI(n) && n.layoutMode === "VERTICAL" && n.primaryAxisSizingMode === "FIXED").reverse()) {
    const kids = f.children.filter((k) => k.visible !== false && k.layoutPositioning !== "ABSOLUTE"); if (!kids.length) continue;
    const need = kids.reduce((a, k) => a + k.height, 0) + f.itemSpacing * (kids.length - 1) + f.paddingTop + f.paddingBottom;
    if (need > f.height + 1) { try { f.primaryAxisSizingMode = "AUTO"; st.hug++; } catch (e) { try { f.layoutSizingVertical = "HUG"; st.hug++; } catch (e2) {} } }
  }
  // (d) leftover group labels
  for (const f of root.findAll((n) => n.type === "FRAME" && !inI(n) && n.name === "Label")) { f.name = "Etichetă"; st.label++; }
  // (e) bare captured text inputs (repeatable rows, no label) → text-input without label
  { const TI = await figma.importComponentSetByKeyAsync("f035f11544e0883bc29ca99b48309238db82edf8"); const done = new Set();
    for (const f0 of root.findAll((n) => n.type === "FRAME" && !inI(n) && /^Text Input/.test(n.name))) {
      if (f0.removed) continue; const f = f0.height >= 36 ? f0 : f0.parent; if (!f || f.type !== "FRAME" || done.has(f.id) || f.height < 36 || f.height > 50) continue;
      const sp = f.strokes && f.strokes.find((p) => p.visible !== false && p.type === "SOLID"); if (!sp) continue; done.add(f.id);
      const t0 = texts(f)[0]; const c0 = t0 && t0.fills && t0.fills[0] && t0.fills[0].color; const dark = Boolean(c0 && c0.r < 0.3 && c0.g < 0.3);
      const red = sp.color.r > 0.75 && sp.color.g < 0.35;
      const v = TI.children.find((c) => c.name.includes("Style=" + (red ? "Destructive" : "Default")) && c.name.includes("State=" + (dark ? "Filled" : "Default")) && c.name.includes("Size=Medium")); if (!v) continue;
      const i = v.createInstance(); const pp = {}; for (const [k, val] of [["👁️ Label", false], ["👁️ Assistive Text", false], ["👁️ Mandatory Star", false], ["⌨️ Placeholder", t0 ? t0.characters : " "]]) { const kk = prop(i, k); if (kk) pp[kk] = val; } i.setProperties(pp);
      const p = f.parent; p.insertChild(p.children.indexOf(f), i);
      if (p.layoutMode && p.layoutMode !== "NONE") { try { i.layoutSizingHorizontal = f.layoutSizingHorizontal === "FILL" ? "FILL" : "FIXED"; if (i.layoutSizingHorizontal === "FIXED") i.resize(f.width, i.height); } catch (e) {} } else { i.x = f.x; i.y = f.y; i.resize(f.width, i.height); }
      i.name = "input · " + (t0 ? t0.characters.slice(0, 30) : ""); f.remove(); st.input = (st.input || 0) + 1; } }
  // (f) local icons inside library buttons take the label colour
  for (const b of root.findAll((n) => n.type === "INSTANCE" && /^btn · /.test(n.name))) {
    const ic = b.children && b.children.find((c) => c.type === "INSTANCE" && c.mainComponent && /^Icon \/ eKYC/.test(c.mainComponent.name)); if (!ic) continue;
    const lab = b.children.find((c) => c.type === "TEXT" && c.visible); const lp = lab && lab.fills && lab.fills[0]; if (!lp) continue;
    for (const v of ic.findAll((x) => ["VECTOR", "BOOLEAN_OPERATION", "ELLIPSE", "RECTANGLE", "LINE"].includes(x.type))) { if (Array.isArray(v.fills) && v.fills.length) v.fills = [lp]; if (Array.isArray(v.strokes) && v.strokes.length) v.strokes = [lp]; }
    st.icon = (st.icon || 0) + 1; }

  // (g) raw search-clear buttons next to a library search (the instance shows its own clear button)
  for (const b of root.findAll((n) => n.type === "FRAME" && !inI(n) && /^Button - Șterge căutarea/.test(n.name))) { const p = b.parent; b.remove(); if (p && p.type === "FRAME" && p.children.length === 0) p.remove(); st.clear = (st.clear || 0) + 1; }

  // (h) table cells → library table-cell (Text / Number / Tag); mixed cells stay as frames of instances (gap)
  { const TC = await figma.importComponentSetByKeyAsync("86cc7c4081411f58b3894c27d40b1cecf845efd3");
    const tv = (t) => TC.children.find((c) => c.name.includes("Breakpoint=Desktop") && c.name.includes("Data Type=" + t));
    const pk = (i, s) => Object.keys(i.componentProperties).find((k) => k.startsWith(s));
    for (const cell of root.findAll((n) => n.type === "FRAME" && !inI(n) && n.name === "Table Cell")) {
      if (cell.removed) continue;
      const ins = cell.findAll((n) => n.type === "INSTANCE" && !inI(n));
      const tx = cell.findAll((n) => n.type === "TEXT" && !inI(n) && n.visible !== false && n.characters.trim());
      const hasCopy = Boolean(cell.findOne((n) => /^Copiază/.test(n.name)));
      let kind = null;
      if (!ins.length && !hasCopy && tx.length >= 1 && tx.length <= 2 && cell.findAll((n) => n.type === "VECTOR" || n.type === "RECTANGLE" || n.type === "ELLIPSE").length === 0) kind = tx.length === 1 && /^[\d\s.,%:+\-−–]+$/.test(tx[0].characters.trim()) ? "Number" : "Text";
      else if (ins.length === 1 && /^tag · /.test(ins[0].name) && !tx.length) kind = "Tag";
      if (!kind) { st.cellRaw = (st.cellRaw || 0) + 1; continue; }
      const v = tv(kind); if (!v) continue; const i = v.createInstance();
      const icon = pk(i, "📍 Icon"); const pp = {}; if (icon) pp[icon] = false;
      if (kind !== "Tag") { pp[pk(i, "⌨️ Data")] = tx[0].characters.trim(); const sk = pk(i, "Secondary Text"); if (sk) pp[sk] = tx.length > 1; if (tx.length > 1) pp[pk(i, "Secondary Data")] = tx[1].characters.trim(); }
      i.setProperties(pp);
      if (kind === "Tag") { const nt = i.findOne((n) => n.type === "INSTANCE" && n.name === "tag-filled"); const src = ins[0]; if (nt) { const o = {}; for (const [k, val] of Object.entries(src.componentProperties)) { const kk = Object.keys(nt.componentProperties).find((x) => x.split("#")[0] === k.split("#")[0]); if (kk) o[kk] = val.value; } try { nt.setProperties(o); } catch (e) {} } }
      const nm = "cell · " + (kind === "Tag" ? ins[0].name.replace(/^tag · /, "") : tx[0].characters.trim()).slice(0, 30); const p = cell.parent; const w = cell.width, h = cell.height; const idx = p.children.indexOf(cell);
      const gr = p.layoutMode === "GRID" ? [cell.gridRowAnchorIndex, cell.gridColumnAnchorIndex, cell.gridRowSpan, cell.gridColumnSpan] : null;
      const sizing = [cell.layoutSizingHorizontal, cell.layoutSizingVertical];
      p.insertChild(idx, i);
      if (gr) { cell.remove(); try { i.setGridChildPosition(gr[0], gr[1]); } catch (e) {} }
      else { if (!(p.layoutMode && p.layoutMode !== "NONE")) { i.x = cell.x; i.y = cell.y; } cell.remove(); }
      try { i.resize(w, Math.max(h, 40)); } catch (e) {}
      try { if (sizing[0] === "FILL") i.layoutSizingHorizontal = "FILL"; if (sizing[1] === "FILL") i.layoutSizingVertical = "FILL"; } catch (e) {}
      i.name = nm; st.cell = (st.cell || 0) + 1;
    } }

}
return st;
