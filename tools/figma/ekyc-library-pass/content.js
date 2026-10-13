// __content-ekyc: raw tags → tag-filled Small, raw initials avatars → avatar Initials Extra Small,
// raw text / copy / empty / single-tag table cells → table-cell, raw breadcrumbs → breadcrumbs.  Args: FROM, COUNT (screens on the current page)
const inI = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const TAG = await figma.importComponentSetByKeyAsync("a97109f9ebf668fb7616cb37e46929fc75ed9070");
const AV = await figma.importComponentSetByKeyAsync("c622e4206c2a122385a0a1b0089b7e1c75fe7574");
const TC = await figma.importComponentSetByKeyAsync("86cc7c4081411f58b3894c27d40b1cecf845efd3");
const BC = await figma.importComponentSetByKeyAsync("cafee05e281722e69edb99b00d68c0e1fd48daa8");
const IK = { check: "ebea9f11db46308470d328092590727874dbec88", warn: "f0fd12f9274960c8f03a9818bde28167380f2b26", cross: "3ccb9372951f0b3c922b004d8966a680404cd11f", signal: "56740247169b62107fa91c7629f2f00f6e14ac21" };
const IC = {}; for (const [k, v] of Object.entries(IK)) IC[k] = await figma.importComponentByKeyAsync(v);
const STY = [[[241,241,241],"Neutral"],[[254,239,198],"Accent"],[[230,245,238],"Success"],[[232,240,251],"Brand"],[[254,228,226],"Danger"]];
const styleOf = (c) => { const r = [c.r*255, c.g*255, c.b*255]; let best = null, bd = 1e9; for (const [v, s] of STY) { const d = Math.abs(v[0]-r[0]) + Math.abs(v[1]-r[1]) + Math.abs(v[2]-r[2]); if (d < bd) { bd = d; best = s; } } return bd < 30 ? best : null; };
const pk = (i, s) => Object.keys(i.componentProperties).find((k) => k.startsWith(s));
const place = (old, i) => { const p = old.parent; const idx = p.children.indexOf(old); const grid = p.layoutMode === "GRID" ? [old.gridRowAnchorIndex, old.gridColumnAnchorIndex] : null; const abs = old.layoutPositioning === "ABSOLUTE"; const auto = p.layoutMode && p.layoutMode !== "NONE"; const sz = [old.layoutSizingHorizontal, old.layoutSizingVertical, old.width, old.height, old.x, old.y];
  p.insertChild(idx, i); if (grid) { old.remove(); try { i.setGridChildPosition(grid[0], grid[1]); } catch (e) {} } else { if (abs) { i.layoutPositioning = "ABSOLUTE"; } if (!auto || abs) { i.x = sz[4]; i.y = sz[5]; } old.remove(); } return sz; };
const st = { tag: 0, avatar: 0, cell: 0, crumb: 0, skip: 0 };
const screens = figma.currentPage.findAll(n => n.type === "FRAME" && /^Ecran · /.test(n.name)).slice(FROM, FROM + COUNT);
for (const scr of screens) {
  // tags
  for (const f of scr.findAll(n => n.type === "FRAME" && !inI(n) && n.cornerRadius === 4 && n.height <= 24 && Array.isArray(n.fills) && n.fills.length && n.fills[0].type === "SOLID")) {
    if (f.removed) continue; const tx = f.findAll(t => t.type === "TEXT" && t.visible); if (tx.length !== 1) continue; if (f.findOne(n => n.type === "INSTANCE")) continue;
    const s = styleOf(f.fills[0].color); if (!s) continue; const hasIcon = !!f.findOne(n => n.name === "Icon" || /svg/.test(n.name));
    const label = tx[0].characters.trim();
    const v = TAG.children.find(c => c.name.includes("Type=Subtle") && c.name.includes("Style=" + s) && c.name.includes("Size=Small") && c.name.includes("Icon=" + (hasIcon ? "Leading" : "None"))); if (!v) continue;
    const i = v.createInstance(); const pp = { [pk(i, "⌨️ Label")]: label };
    if (hasIcon) { const ic = /Operațional|Degradat|Indisponibil/.test(label) ? IC.signal : s === "Success" ? IC.check : s === "Accent" ? IC.warn : s === "Danger" ? IC.cross : null; if (ic) pp[pk(i, "🔄 Leading Icon")] = ic.id; }
    i.setProperties(pp); i.name = "tag · " + label.slice(0, 30); place(f, i); st.tag++;
  }
  // avatars
  for (const f of scr.findAll(n => n.type === "FRAME" && !inI(n) && Math.abs(n.width - n.height) < 1 && n.width >= 20 && n.width <= 40 && n.cornerRadius !== figma.mixed && n.cornerRadius >= n.width / 2 - 1 && n.children.length === 1 && n.children[0].type === "TEXT" && /^[A-ZĂÂÎȘȚ]{1,2}$/.test(n.children[0].characters.trim()))) {
    const ini = f.children[0].characters.trim(); const size = f.width <= 26 ? "Extra Small" : f.width <= 34 ? "Small" : "Medium";
    const v = AV.children.find(c => c.name === "🎚️ Type=Initials, 🎚️ Size=" + size + ", 🎚️ State=Default"); const i = v.createInstance();
    const nk = pk(i, "👁️ Notification"); if (nk) i.setProperties({ [nk]: false });
    const t = i.findOne(n => n.type === "TEXT"); if (t) { await figma.loadFontAsync(t.fontName); t.characters = ini; }
    i.name = "avatar · " + ini; place(f, i); st.avatar++;
  }
  // table cells
  for (const cell of scr.findAll(n => n.type === "FRAME" && !inI(n) && n.name === "Table Cell")) {
    if (cell.removed) continue;
    const ins = cell.findAll(n => n.type === "INSTANCE" && !inI(n)); const tx = cell.findAll(n => n.type === "TEXT" && !inI(n) && n.visible !== false && n.characters.trim());
    const vec = cell.findAll(n => n.type === "VECTOR" || n.type === "RECTANGLE" || n.type === "ELLIPSE").length;
    let kind = null;
    if (!ins.length && !vec && tx.length <= 2) kind = tx.length === 1 && /^[\d\s.,%:+\-−–]+$/.test(tx[0].characters.trim()) ? "Number" : "Text";
    else if (ins.length === 1 && /^tag · /.test(ins[0].name) && !tx.length) kind = "Tag";
    if (!kind) { st.skip++; continue; }
    const v = TC.children.find(c => c.name.includes("Breakpoint=Desktop") && c.name.includes("Data Type=" + kind)); const i = v.createInstance();
    const pp = {}; const icon = pk(i, "📍 Icon"); if (icon) pp[icon] = false;
    if (kind !== "Tag") { pp[pk(i, "⌨️ Data")] = tx.length ? tx[0].characters.trim() : " "; const sk = pk(i, "Secondary Text"); if (sk) pp[sk] = tx.length > 1; if (tx.length > 1) pp[pk(i, "Secondary Data")] = tx[1].characters.trim(); }
    i.setProperties(pp);
    if (kind === "Tag") { const nt = i.findOne(n => n.type === "INSTANCE" && n.name === "tag-filled"); if (nt) { const o = {}; for (const [k, val] of Object.entries(ins[0].componentProperties)) { const kk = Object.keys(nt.componentProperties).find(x => x.split("#")[0] === k.split("#")[0]); if (kk) o[kk] = val.value; } try { nt.setProperties(o); } catch (e) {} } }
    const nm = "cell · " + (kind === "Tag" ? ins[0].name.replace(/^tag · /, "") : tx.length ? tx[0].characters.trim() : "—").slice(0, 30);
    const sz = place(cell, i); try { i.resize(sz[2], Math.max(sz[3], 40)); } catch (e) {} try { if (sz[0] === "FILL") i.layoutSizingHorizontal = "FILL"; if (sz[1] === "FILL") i.layoutSizingVertical = "FILL"; } catch (e) {}
    i.name = nm; st.cell++;
  }
  // breadcrumbs
  for (const nav of scr.findAll(n => n.type === "FRAME" && !inI(n) && /^Navigation/.test(n.name) && n.findOne(k => k.name === "Numbered List"))) {
    const list = nav.findOne(k => k.name === "Numbered List");
    const items = list.children.map(k => k.type === "TEXT" ? k.characters.trim() : (k.findAll(t => t.type === "TEXT").map(t => t.characters.trim()).filter(Boolean)[0] || "")).filter(Boolean);
    if (items.length < 2 || items.length > 6) continue;
    const i = BC.children.find(c => c.name === "📏 Breakpoint=Desktop").createInstance();
    const lv = ["Level 1", "Level 2", "Level 3", "Level 4", "Level 5"]; const parents = items.slice(0, -1); const pp = {};
    for (let k = 0; k < 5; k++) { const key = pk(i, "👁️ Level " + (k + 1)); if (key) pp[key] = k < parents.length; }
    const ak = pk(i, "👁️ Active Level"); if (ak) pp[ak] = true; i.setProperties(pp);
    for (let k = 0; k < parents.length; k++) { const n = i.findOne(x => x.name === lv[k]); if (n) n.setProperties({ [pk(n, "⌨️ Label")]: parents[k] }); }
    const a = i.findOne(x => x.name === "Active Level"); if (a) a.setProperties({ [pk(a, "⌨️ Label")]: items[items.length - 1] });
    i.name = "breadcrumbs"; place(nav, i); st.crumb++;
  }
}
return st;
