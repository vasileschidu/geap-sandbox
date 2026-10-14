// Document · rând (BO) — separators between items only (code `:is(part, break) + part::before`, no dot at a line start/end).
// Params (prepend): const SET_ID = "11362:7113";
// Meta = clip frame around „Rânduri” (WRAP, gap 18); each item = „Parte · X” (HUG) with an ABSOLUTE 2px „Punct” at x −10
// (8 · dot 2 · 8), y centred on the 16px text → the dot of a part that starts a line falls left of Meta and is clipped.
// Reparenting drops componentPropertyReferences → snapshot by id, re-apply after (the text's „visible” moves to its part).
const set = await figma.getNodeByIdAsync(SET_ID);
figma.skipInvisibleInstanceChildren = false;
const ORDER = ["Număr", "Fișier", "Dimensiune", "Data", "De", "Semnat de"];
const DEF = Object.fromEntries(Object.entries(set.componentPropertyDefinitions).map(([k, v]) => [k, v.defaultValue]));
const out = [];
for (const v of set.children) {
  const meta = v.findOne((n) => n.name === "Meta" && n.type === "FRAME"); const h0 = Math.round(v.height);
  if (!meta || meta.findOne((n) => n.name === "Rânduri")) { out.push(v.id + (meta ? " already" : " no meta")); continue; }
  const REFS = new Map(); for (const n of v.findAll(() => true)) { const r = n.componentPropertyReferences; if (r && Object.keys(r).length) REFS.set(n.id, { ...r }); }
  const T = {}, D = {};
  for (const n of ORDER) T[n] = meta.findOne((k) => k.name === n && k.type === "TEXT");
  for (const d of meta.findAll((k) => /^Punct · /.test(k.name))) D[d.name.replace("Punct · ", "")] = d;
  const tpl = Object.values(D)[0], gap = meta.itemSpacing, rowGap = meta.counterAxisSpacing || 0, dw = tpl.width;
  const rows = figma.createFrame(); rows.name = "Rânduri"; rows.layoutMode = "HORIZONTAL"; rows.layoutWrap = "WRAP"; rows.fills = []; rows.clipsContent = false;
  rows.itemSpacing = gap * 2 + dw; rows.counterAxisSpacing = rowGap; rows.counterAxisAlignItems = "CENTER";
  meta.appendChild(rows);
  const vis = {};
  for (const n of ORDER) {
    const t = T[n]; if (!t) continue; vis[n] = t.visible;
    const p = figma.createFrame(); p.name = "Parte · " + n; p.layoutMode = "HORIZONTAL"; p.fills = []; p.clipsContent = false; p.primaryAxisSizingMode = "AUTO"; p.counterAxisSizingMode = "AUTO";
    rows.appendChild(p); p.appendChild(t); t.visible = true;
    const d = D[n] || tpl.clone(); p.appendChild(d); d.name = "Punct"; d.visible = true;
    d.layoutPositioning = "ABSOLUTE"; d.constraints = { horizontal: "MIN", vertical: "MIN" }; d.x = -(gap + dw); d.y = Math.round((t.height - d.height) / 2);
    p.visible = vis[n];
  }
  for (const d of Object.values(D)) if (!d.removed && d.parent === meta) d.remove();
  meta.layoutMode = "HORIZONTAL"; meta.layoutWrap = "NO_WRAP"; meta.itemSpacing = 0; meta.clipsContent = true; meta.counterAxisAlignItems = "CENTER";
  rows.layoutSizingHorizontal = "FILL"; rows.layoutSizingVertical = "HUG";
  for (const [id, r] of REFS) { const n = v.findOne((k) => k.id === id); if (!n) continue; let r2 = { ...r };
    if (n.type === "TEXT" && ORDER.includes(n.name) && /^Parte · /.test(n.parent.name) && r2.visible) { n.parent.componentPropertyReferences = { visible: r2.visible }; delete r2.visible; }
    if (/^Punct$/.test(n.name)) r2 = {};
    if (JSON.stringify(n.componentPropertyReferences || {}) !== JSON.stringify(r2)) n.componentPropertyReferences = r2; }
  out.push(v.id + " " + h0 + "→" + Math.round(v.height));
}
// binding a ref can rewrite the property default from the bound layer's visibility → put the defaults back
for (const [k, d] of Object.entries(DEF)) if (set.componentPropertyDefinitions[k] && set.componentPropertyDefinitions[k].type === "BOOLEAN" && set.componentPropertyDefinitions[k].defaultValue !== d) set.editComponentProperty(k, { defaultValue: d });
return out;
