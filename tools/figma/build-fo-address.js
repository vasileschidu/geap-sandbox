// Build the FO cascade address („Caută adresa” + address grid, US-54) in Figma from a DOM spec,
// with library instances only. Used by the figma-designer agent for the adr-* blocks.
//
// 1. Spec: node --experimental-websocket tools/figma/extract-fo-address.mjs --state adr-04 [--width 375]
//    [--root "<css>"] → JSON { rootW, search{…}, fields[{label, req, x, y, w, kind, value, …}] }.
// 2. Paste this file as the `code` of mcp__figma-a__use_figma after replacing the SPECS line with
//    [{ name, parent?: "<frame id>", spec }] (several specs per call are fine, ~3 KB each).
// 3. Returns the created frame ids („Adresă · câmpuri · <name>”, VERTICAL auto-layout, rows = HORIZONTAL).
//
// Mapping (components.md › Address by cadastral code — US-54):
//   „Caută adresa”      → search-input-rectangular 9285:37474 (State Default/Focus/Filled, Size, Label,
//                          Clear Button, inline-message Default/Success/Warning; loading = spinner icon)
//                          error (.search-input.is-error) → text-input Style=Destructive + 20/search
//                          (the library search input has no error style)
//   open saved-codes list → „selection-menu” frame (clone of the F3a Smart Input menu) with local
//                          .menu-item-selection 1138:13821 (Icon home-line + Description = saved address)
//   SRRE skeleton        → local „FO / Câmp · skeleton” 11229:290552 (Label, Star, Size)
//   SRRE read-only part  → text-input State=Read Only (+ 20/checkmark-small trailing, flag leading for Țara)
//   selects              → select-input 8344:81663 (Default / Disabled / Filled; flag in the leading slot)
//   text parts / email   → text-input 6490:68585 · phone → phone-number-input (lib key f2ba725d…, International)
const SPECS = ["PUT:SPECS"];
const g = (id) => figma.getNodeByIdAsync(id);
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
  inst.name = "Caută adresa · " + (s.error ? "eroare" : s.focus ? "focus" : s.value ? "completat" : "implicit");
  return inst;
};
const flagIn = (inst, size) => {
  const slot = inst.findOne((n) => n.type === "INSTANCE" && /search|credit-card|^Icon$/.test(n.name) && n.parent && n.parent.name === "Input");
  if (slot) { slot.swapComponent(C.flag); const d = size === "Large" ? 24 : 20; slot.resize(d, d); slot.name = "flag · MD"; }
};
const buildField = async (f, size) => {
  let inst;
  if (f.kind === "skeleton") { inst = V(C.skel, { "Size": size }).createInstance(); setP(inst, { "Label": f.label, "Star": f.req }); inst.name = "skeleton · " + f.label; return inst; }
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
  inst.name = f.kind + " · " + f.label;
  return inst;
};
const buildMenu = async (opts, width) => {
  const menu = C.menuTpl.clone(); menu.name = "selection-menu · coduri salvate";
  for (const k of [...menu.children]) k.remove();
  menu.layoutSizingHorizontal = "FIXED"; menu.resize(width, menu.height); menu.primaryAxisSizingMode = "AUTO";
  for (const [i, o] of opts.entries()) {
    const it = V(C.item, { "State": o.empty ? "Disabled" : o.hl ? "Hover" : "Default" }).createInstance();
    setP(it, { "Option Label": o.title, "Description": o.meta || "", "Icon": !o.empty, "Supporting text": Boolean(o.meta) && !o.empty, "Badge": false });
    if (!o.empty) { const ic = it.findOne((n) => n.type === "INSTANCE" && /plus|home/.test(n.name)); if (ic) { const srch = o.icon === "search"; ic.swapComponent(srch ? searchIcon : homeIcon); ic.resize(20, 20); ic.name = srch ? "20/search" : "home-line"; } }
    it.name = o.empty ? "gol · " + o.title : (o.icon === "search" ? "caută · " : "cod · ") + o.title;
    menu.appendChild(it); it.layoutSizingHorizontal = "FILL"; it.layoutSizingVertical = "HUG";
  }
  return menu;
};
const out = [];
for (const { name, parent, spec, mobile } of SPECS) {
  const size = spec.search.size || (mobile ? "Large" : "Medium");
  const root = figma.createAutoLayout("VERTICAL", { name: "Adresă · câmpuri · " + name }); root.fills = []; root.clipsContent = false;
  await gap(root, 24); root.itemReverseZIndex = true; // the open list paints over the rows below (code: absolute dropdown)
  (parent ? await g(parent) : figma.currentPage).appendChild(root);
  root.layoutSizingHorizontal = "FIXED"; root.resize(spec.rootW, root.height); root.counterAxisSizingMode = "FIXED";
  // „Caută adresa” (+ open list, absolute like the code's dropdown)
  const wrap = figma.createAutoLayout("VERTICAL", { name: "Dropdown wrap · Caută adresa" }); wrap.fills = []; wrap.clipsContent = false;
  root.appendChild(wrap); wrap.layoutSizingHorizontal = "FILL";
  const si = await buildSearch(spec.search, size); wrap.appendChild(si); si.layoutSizingHorizontal = "FILL";
  if (spec.search.listOpen && spec.search.options.length) {
    const menu = await buildMenu(spec.search.options, spec.rootW);
    wrap.appendChild(menu); menu.layoutPositioning = "ABSOLUTE";
    const box = si.findOne((n) => n.name === "Input"); const by = box ? box.absoluteTransform[1][2] - si.absoluteTransform[1][2] + box.height : 68;
    menu.x = 0; menu.y = by + 4;
  }
  // grid rows
  const rows = {}; for (const f of spec.fields) (rows[f.y] ||= []).push(f);
  let ri = 0;
  for (const y of Object.keys(rows).map(Number).sort((a, b) => a - b)) {
    const fs = rows[y].sort((a, b) => a.x - b.x); ri++;
    const row = figma.createAutoLayout("HORIZONTAL", { name: "Rând " + ri }); row.fills = []; row.clipsContent = false;
    root.appendChild(row); row.layoutSizingHorizontal = "FILL";
    await gap(row, fs.length > 1 ? Math.round(fs[1].x - fs[0].x - fs[0].w) : (mobile ? 16 : 32));
    for (const f of fs) { const inst = await buildField(f, size); row.appendChild(inst); inst.layoutSizingHorizontal = "FIXED"; inst.resize(f.w, inst.height); }
  }
  out.push({ name, id: root.id, h: Math.round(root.height) });
}
return out;
