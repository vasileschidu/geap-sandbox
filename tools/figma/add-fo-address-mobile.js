// Add the MOBILE 375 screen to an existing desktop-only US-54 address block (board 11224:39519).
// Rule (memory feedback_figma_mobile_screens): clone the real mobile of the step and swap only the state
// parts — here the „Address · fields” frame, rebuilt from the 375 DOM spec with Large library inputs.
// 1. Spec: node --experimental-websocket --no-warnings tools/figma/extract-fo-address.mjs <state> 375 > spec.json
// 2. Compact the spec (drop false / null / empty keys — zeros too, x defaults to 0) and run as use_figma code with JOBS = [{ id: "C05", block: "<block id>", spec }] (or store this text in
//    figma.root shared plugin data and run new AsyncFunction("JOBS", text)(JOBS)). Idempotent: skips blocks
//    that already have a mobile. Builder functions are the same as tools/figma/build-fo-address.js.
const g = (id) => figma.getNodeByIdAsync(id);
/* English layer names (2026-10-15): labels stay Romanian on screen, layer names are English */
const EN_MAP = { "Cod cadastral": "Cadastral code", "Țara": "Country", "Raionul/Municipiul": "District/Municipality", "Orașul/Comuna": "City/Commune", "Sector": "Sector", "Strada": "Street", "Codul Poștal": "Postal code", "Casa": "House", "Blocul": "Block", "Scara": "Staircase", "Etajul": "Floor", "Apartamentul": "Apartment", "Telefonul unității": "Unit phone", "Email unității": "Unit email" };
const EN = (l) => EN_MAP[l] || l;
const C = { search: await g("9285:37474"), text: await g("6490:68585"), select: await g("8344:81663"), phone: await figma.importComponentSetByKeyAsync("f2ba725de62bbecd5bd84870a1e6b7bb1eb5adfe"),
  item: await g("1138:13821"), skel: await g("11229:290552"), home: await figma.importComponentSetByKeyAsync("a5d81e73003c9eb1ac7779d8433e470ab438f371"), spin: await figma.importComponentSetByKeyAsync("d38a117c520f1f18cf1e41292733a77a29b8148e"), flag: await g("2171:6978"),
  menuTpl: await g("2623:45122") };
const SP = {}; const spv = async (v) => SP[v] ||= await figma.variables.importVariableByKeyAsync({ 4: "983c5b4d9a4e5fa988f0154c9bf4290c7aec9635", 8: "69ac88e41c0fea695fc5c4fd33f0188d1172dc59", 16: "22028a118574e28e30382d57efffac20e14398f0", 24: "49c6a5e43fd55f8fa058dfc13851df2854db5d83", 32: "d1bd20c7a50c986d517b076fed38101f5b33c1ff" }[v]);
const V = (set, want) => set.children.find((c) => Object.entries(want).every(([k, v]) => c.name.includes(`${k}=${v}`)));
const homeIcon = C.home.children.find((c) => c.name === "filled=off, stroke=1.5, radius=2, join=round") || C.home.children[0];
const searchIcon = (() => { const v = V(C.search, { "State": "Default", "Size": "Medium" }); const i = v.findOne((n) => n.type === "INSTANCE" && /search/.test(n.name)); return i.mainComponent; })();
const loadAll = async (t) => { for (const s of t.getStyledTextSegments(["fontName"])) await figma.loadFontAsync(s.fontName); };
const setText = async (inst, name, text) => { const t = inst.findOne((n) => n.type === "TEXT" && n.name === name); if (t) { await loadAll(t); t.characters = text; } return t; };
const propKey = (inst, prefix) => Object.keys(inst.componentProperties).find((k) => k.startsWith(prefix));
const setP = (inst, map) => { const out = {}; for (const [p, v] of Object.entries(map)) { const k = propKey(inst, p); if (!k) continue; const ty = inst.componentProperties[k].type; if (v === undefined || v === null) { if (ty === "BOOLEAN") out[k] = false; continue; } out[k] = ty === "BOOLEAN" ? Boolean(v) : v; } inst.setProperties(out); };
const gap = async (f, v) => { f.itemSpacing = v; if (v) f.setBoundVariable("itemSpacing", await spv(v)); };
const message = async (inst, m) => {
  const im = inst.findOne((n) => n.type === "INSTANCE" && n.name === "inline-message"); if (!im || !m) return;
  const style = { success: "Success", error: "Error", warning: "Warning" }[m.tone] || "Default";
  setP(im, { "🖌️ Style": style, "⌨️ Message": m.text, "📍 Icon": m.tone !== "hint" });
  if (m.tone === "loading") { const ic = im.children.find((c) => c.type === "INSTANCE"); if (ic) { const s = Math.round(ic.width); const sp = V(C.spin, { "Size": s <= 16 ? "Extra Small" : "Small", "Style": "Brand" }); ic.swapComponent(sp); } }
};
const buildSearch = async (s, size) => {
  let inst;
  if (s.error) {
    inst = V(C.text, { "Style": "Destructive", "State": s.focus ? "Focus" : "Filled", "Size": size }).createInstance();
    setP(inst, { "👁️ Label": true, "👁️ Mandatory Star": s.req, "👁️ Assistive Text": Boolean(s.message), "👁️ Clear Button": s.clear, "👁️ Leading Icon": true, "⌨️ Placeholder": s.value || s.placeholder, "🔄 Leading Icon: 20": searchIcon.id, "🔄 Leading Icon: 24": searchIcon.id });
  } else {
    inst = V(C.search, { "State": s.focus ? "Focus" : s.value ? "Filled" : "Default", "Size": size, "Button": "False" }).createInstance();
    setP(inst, { "👁️ Label": true, "👁️ Mandatory Star": s.req, "👁️ Assistive Text": Boolean(s.message), "👁️ Clear Button": s.clear, "⌨️ Placeholder": s.value || s.placeholder });
  }
  await setText(inst, "Label", s.label);
  await message(inst, s.message);
  /* long hints wrap to the field width, as in code */
  const imx = inst.findOne((n) => n.type === "INSTANCE" && n.name === "inline-message"); if (imx && imx.visible) { try { imx.layoutSizingHorizontal = "FILL"; const tx = imx.findOne((n) => n.type === "TEXT"); if (tx) { tx.layoutSizingHorizontal = "FILL"; tx.textAutoResize = "HEIGHT"; } } catch (e) {} }
  inst.name = "Search address · " + (s.error ? "error" : s.focus ? "focus" : s.value ? "filled" : "default");
  return inst;
};
const flagIn = (inst, size) => {
  const slot = inst.findOne((n) => n.type === "INSTANCE" && /search|credit-card|^Icon$/.test(n.name) && n.parent && n.parent.name === "Input");
  if (slot) { slot.swapComponent(C.flag); const d = size === "Large" ? 24 : 20; slot.resize(d, d); slot.name = "flag · MD"; }
};
const buildField = async (f, size) => {
  let inst;
  if (f.kind === "skeleton") { inst = V(C.skel, { "Size": size }).createInstance(); setP(inst, { "Label": f.label, "Star": f.req }); inst.name = "skeleton · " + EN(f.label); return inst; }
  if (f.kind === "readonly") {
    inst = V(C.text, { "Style": "Default", "State": "Read Only", "Size": size }).createInstance();
    setP(inst, { "👁️ Label": true, "👁️ Mandatory Star": f.req, "👁️ Assistive Text": false, "👁️ Clear Button": false, "👁️ Trailing Icon": Boolean(f.check), "👁️ Leading Icon": Boolean(f.flag), "⌨️ Placeholder": f.value || f.placeholder || "—" });
    if (f.flag) { setP(inst, { "🔄 Leading Icon: 20": C.flag.id, "🔄 Leading Icon: 24": C.flag.id }); }
  } else if (f.kind === "select") {
    inst = V(C.select, { "Style": "Default", "State": f.disabled ? "Disabled" : f.placeholder ? "Default" : "Filled", "Size": size }).createInstance();
    setP(inst, { "👁️ Label": true, "👁️ Mandatory Star": f.req, "👁️ Assistive Text": false, "👁️ Leading Icon": Boolean(f.flag), "⌨️ Placeholder": f.value });
    if (f.flag) flagIn(inst, size);
  } else if (f.kind === "search") {
    /* „Cod cadastral” since 2026-10-13: library search-input with the submit button (Button=True);
       Loading = inline spinner; submit Disabled until a code is typed; error = Input stroke border/danger/default
       (the library search-input has no error style) */
    /* the library has no Default / Hover / Disabled with Button=True → an empty field = Filled + Button
       with the Default variant's placeholder colour (token-bound) */
    const btnOn = f.button !== false; const stt = f.loading ? "Loading" : f.focus ? "Focus" : (f.value || btnOn) ? "Filled" : "Default";
    inst = V(C.search, { "State": stt, "Size": size, "Button": btnOn ? "True" : "False" }).createInstance();
    setP(inst, { "👁️ Label": true, "👁️ Mandatory Star": f.req, "👁️ Assistive Text": Boolean(f.message), "👁️ Clear Button": Boolean(f.clear), "⌨️ Placeholder": f.value || f.placeholder });
    const btn = inst.findOne((n) => n.type === "INSTANCE" && n.name === "button-filled-rectangular");
    if (btn) { const k = Object.keys(btn.componentProperties).find((x) => x.includes("State")); if (k) btn.setProperties({ [k]: f.submitDisabled ? "Disabled" : "Default" }); }
    if (btnOn && !f.value && !f.loading) { const ph = inst.findOne((n) => n.type === "TEXT" && n.name === "Placeholder"); const ref = V(C.search, { "State": "Default", "Size": size, "Button": "False" }).findOne((n) => n.type === "TEXT" && n.name === "Placeholder"); if (ph && ref) ph.fills = JSON.parse(JSON.stringify(ref.fills)); }
    if (f.error) { const box = inst.findOne((n) => n.name === "Input"); const vD = await figma.variables.importVariableByKeyAsync("bc39b7f802d29cfe2fd078820b6f65ee3939fa45"); if (box) { box.strokes = [figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0.85, g: 0.18, b: 0.13 } }, "color", vD)]; box.strokeWeight = 1; } }
  } else if (f.kind === "phone") {
    inst = V(C.phone, { "Style": "Default", "State": f.value ? "Filled" : "Default", "Size": size, "Type": "International" }).createInstance();
    setP(inst, { "👁️ Label": true, "👁️ Mandatory Star": f.req, "👁️ Assistive Text": false, "👁️ Clear Button": false, "⌨️ Placeholder": f.value || f.placeholder });
  } else {
    /* editable parts (incl. „Cod cadastral” since 2026-10-13): state, × and their own message slot */
    inst = V(C.text, { "Style": f.error ? "Destructive" : "Default", "State": f.disabled ? "Disabled" : f.focus ? "Focus" : f.value ? "Filled" : "Default", "Size": size }).createInstance();
    setP(inst, { "👁️ Label": true, "👁️ Mandatory Star": f.req, "👁️ Assistive Text": Boolean(f.message), "👁️ Clear Button": Boolean(f.clear), "👁️ Leading Icon": false, "👁️ Trailing Icon": false, "⌨️ Placeholder": f.value || f.placeholder || " " });
  }
  await setText(inst, "Label", f.label);
  if (f.message) { await message(inst, f.message); const imx = inst.findOne((n) => n.type === "INSTANCE" && n.name === "inline-message"); if (imx && imx.visible) { try { imx.layoutSizingHorizontal = "FILL"; const tx = imx.findOne((n) => n.type === "TEXT"); if (tx) { tx.layoutSizingHorizontal = "FILL"; tx.textAutoResize = "HEIGHT"; } } catch (e) {} } }
  inst.name = f.kind + " · " + EN(f.label);
  return inst;
};
const buildMenu = async (opts, width) => {
  const menu = C.menuTpl.clone(); menu.name = "selection-menu · saved codes";
  for (const k of [...menu.children]) k.remove();
  menu.layoutSizingHorizontal = "FIXED"; menu.resize(width, menu.height); menu.primaryAxisSizingMode = "AUTO";
  for (const [i, o] of opts.entries()) {
    const it = V(C.item, { "State": o.empty ? "Disabled" : o.hl ? "Hover" : "Default" }).createInstance();
    setP(it, { "Option Label": o.title, "Description": o.meta || "", "Icon": !o.empty, "Supporting text": Boolean(o.meta) && !o.empty, "Badge": false });
    if (!o.empty) { const ic = it.findOne((n) => n.type === "INSTANCE" && /plus|home/.test(n.name)); if (ic) { const srch = o.icon === "search"; ic.swapComponent(srch ? searchIcon : homeIcon); ic.resize(20, 20); ic.name = srch ? "20/search" : "home-line"; } }
    it.name = o.empty ? "empty · " + o.title : (o.icon === "search" ? "search · " : "code · ") + o.title;
    menu.appendChild(it); it.layoutSizingHorizontal = "FILL"; it.layoutSizingVertical = "HUG";
  }
  return menu;
};
/* ---- mobile assembly: clone the real mobile screen of step 2 (C04 „Mobile · C04” 11276:13017),
   swap only its „Address · fields” for the 375 build, add it beside the desktop in the block ---- */
const TPL_MOBILE = "11276:13017";
const out = [];
for (const J of JOBS) {
  const block = await g(J.block); const spec = J.spec; const size = "Large";
  const wrapper = block.children.find((n) => n.name === "Screens · desktop + mobile");
  if (wrapper.children.some((n) => /^Mobile/.test(n.name))) { out.push({ id: J.id, skipped: "has mobile" }); continue; }
  const mob = (await g(TPL_MOBILE)).clone(); wrapper.appendChild(mob); mob.name = `Mobile · ${J.id}`;
  const old = mob.findOne((n) => n.type === "FRAME" && n.name === "Address · fields"); const parent = old.parent; const idx = parent.children.indexOf(old);
  const root = figma.createAutoLayout("VERTICAL", { name: "Address · fields" }); root.fills = []; root.clipsContent = false;
  await gap(root, 24); root.itemReverseZIndex = true;
  parent.insertChild(idx, root); old.remove();
  root.layoutSizingHorizontal = "FILL"; root.layoutSizingVertical = "HUG";
  const wrap = figma.createAutoLayout("VERTICAL", { name: "Dropdown wrap · Search address" }); wrap.fills = []; wrap.clipsContent = false;
  if (spec.search) {
    root.appendChild(wrap); wrap.layoutSizingHorizontal = "FILL";
    const si = await buildSearch(spec.search, size); wrap.appendChild(si); si.layoutSizingHorizontal = "FILL";
    if (spec.search.listOpen && spec.search.options && spec.search.options.length) {
      const menu = await buildMenu(spec.search.options, spec.rootW);
      wrap.appendChild(menu); menu.layoutPositioning = "ABSOLUTE";
      const box = si.findOne((n) => n.name === "Input"); const by = box ? box.absoluteTransform[1][2] - si.absoluteTransform[1][2] + box.height : 76;
      menu.x = 0; menu.y = by + 4;
    }
  }
  for (const f of spec.fields) f.x = f.x || 0; /* compact specs drop zeros */
  const rows = {}; for (const f of spec.fields) (rows[f.y] ||= []).push(f);
  let ri = 0;
  for (const y of Object.keys(rows).map(Number).sort((a, b) => a - b)) {
    const fs = rows[y].sort((a, b) => a.x - b.x); ri++;
    const row = figma.createAutoLayout("HORIZONTAL", { name: "Row " + ri }); row.fills = []; row.clipsContent = false;
    root.appendChild(row); row.layoutSizingHorizontal = "FILL";
    /* 375: side-by-side parts share the row equally (code: 1fr columns, gap 16) */
    await gap(row, 16);
    for (const f of fs) { const inst = await buildField(f, size); row.appendChild(inst); inst.layoutSizingHorizontal = "FILL"; }
  }
  /* the screen hugs its content: every auto-layout ancestor up to the screen grows */
  for (let p = root.parent; p && p !== mob; p = p.parent) { if (p.layoutMode && p.layoutMode !== "NONE") { try { p.layoutSizingVertical = "HUG"; } catch (e) {} } }
  out.push({ id: J.id, mob: mob.id, fields: root.id, h: Math.round(mob.height), bw: Math.round(block.width) });
}
return out;
