// Act post-process sheet (phones ≤760) — builds three local components in the current file from library parts:
//   „Act post-process sheet · row”     set State=Default / Hover / Disabled (48 / 88 with reason), props Label, Reason, Show reason, Icon
//   „Act post-process sheet · content” header (title + act name + ×) + list of 7 exposed rows (rows 3–7 hidden)
//   „Act post-process sheet”           library bottom-sheet (Header off, Drag Handle on, Action Button off) with the content in its slot
// Code: js/act-row.js + css/facet-filter.css (.e-permits-filter-sheet--actions); components.md „Act post-process menu on phones”.
// Run via use_figma with CFG = { holderId } (the target section on the local components page — GEAP: „Modals, sheets & drawers”
// 12645:8487; the old holder frame 11844:198504 was removed 2026-10-24). Idempotent: removes an older copy.
// Returns ids. Measured at 375 (pp-02a / gh-02j / pp-01a / pp-01q): handle block 36, header 12/16 (title 16/24 600, gap 2, act name 14/20
// secondary), × 32, list inset 0 8, rows 48 (12 8, gap 10, r8, icon 24, text 2/0, 14/20 regular), reason 14/20 secondary, bottom 16.
const RUN = async (CFG) => {
  figma.skipInvisibleInstanceChildren = false;
  const SIZES = "8ee1cae7f6a1ffaa46863d26583e97be34627f73", COLORS = "723ad7975012d44e7cc92ace2fc1aa4bc7db576a";
  const lib = {};
  for (const k of [SIZES, COLORS]) for (const v of await figma.teamLibrary.getVariablesInLibraryCollectionAsync(k)) lib[v.name] = v.key;
  const V = {};
  for (const n of ["spacings/spacing-2", "spacings/spacing-8", "spacings/spacing-12", "spacings/spacing-16", "border-radius/radius-8",
    "border-radius/radius-16", "text/base/default", "text/base/secondary", "text/disabled/default", "icon/disabled/default",
    "background/base/default", "background/base/tertiary"]) V[n] = await figma.variables.importVariableByKeyAsync(lib[n]);
  const ST = { small: await figma.importStyleByKeyAsync("1f35541006807f80d766d8eb6ef5ae95d4f5cf6e"),
    h5: await figma.importStyleByKeyAsync("275607150544ddbd2d097c727da7f0baaaf7d7fe") };
  await figma.loadFontAsync(ST.small.fontName); await figma.loadFontAsync(ST.h5.fontName);
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  const IK = { edit: "bdc07bbf7ee601e4fc07ef48d4553df6fae78b4c", cross: "853596113599256e1bc27084e24ab89a02ebf340",
    rotate: "bc246977fd0bae99b85550d5f43c6fe062b9ef02", copy: "b1676048ffc178ba6e3fec021fa909d635ee18d4",
    pause: "3db9e42c1922d440a45fd45e29b7de6419f7a681", flag: "d3e319c07904d3f07c5c941efb87550930fb3bcb",
    error: "7400f1d5a050a936658edcdf534e38132918d816" };
  const IC = {}; for (const k in IK) IC[k] = await figma.importComponentByKeyAsync(IK[k]);
  const fill = (n, v, prop = "fills") => { n[prop] = [figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", v)];
    const r = v.resolveForConsumer(n).value; n[prop] = [figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: r.r, g: r.g, b: r.b } }, "color", v)]; };
  const pad = (n, t, r, b, l) => { const m = { 2: "spacings/spacing-2", 8: "spacings/spacing-8", 12: "spacings/spacing-12", 16: "spacings/spacing-16" };
    [["paddingTop", t], ["paddingRight", r], ["paddingBottom", b], ["paddingLeft", l]].forEach(([k, x]) => { n[k] = x; if (m[x]) n.setBoundVariable(k, V[m[x]]); }); };
  const rad = (n, v, corners = ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) => corners.forEach(k => n.setBoundVariable(k, v));
  const txt = async (name, chars, style, color) => { const t = figma.createText(); t.name = name; await t.setTextStyleIdAsync(style.id); t.characters = chars; fill(t, color); return t; };
  const holder = await figma.getNodeByIdAsync(CFG.holderId);
  // remove an older copy
  for (const n of holder.children.filter(c => /^Act post-process sheet/.test(c.name))) n.remove();

  // 1 · row set
  const rows = [];
  for (const state of ["Default", "Hover", "Disabled"]) {
    const c = figma.createComponent(); c.name = "State=" + state;
    c.layoutMode = "HORIZONTAL"; c.resize(359, 48); c.itemSpacing = 10; pad(c, 12, 8, 12, 8); rad(c, V["border-radius/radius-8"]);
    c.counterAxisAlignItems = "MIN"; c.primaryAxisSizingMode = "FIXED"; c.counterAxisSizingMode = "AUTO";
    fill(c, state === "Hover" ? V["background/base/tertiary"] : V["background/base/default"]);
    const ic = IC.edit.createInstance(); ic.name = "Icon"; c.appendChild(ic);
    if (state === "Disabled") for (const vec of ic.findAll(n => n.type === "VECTOR")) fill(vec, V["icon/disabled/default"]);
    const tx = figma.createFrame(); tx.name = "Text"; tx.layoutMode = "VERTICAL"; tx.fills = []; c.appendChild(tx);
    tx.layoutSizingHorizontal = "FILL"; tx.layoutSizingVertical = "HUG"; pad(tx, 2, 0, 2, 0);
    const lb = await txt("Label", "Reperfectare", ST.small, state === "Disabled" ? V["text/disabled/default"] : V["text/base/default"]);
    tx.appendChild(lb); lb.layoutSizingHorizontal = "FILL"; lb.textAutoResize = "HEIGHT";
    const rs = await txt("Reason", "Nu se inițiază pentru un act cu statutul „Suspendat”.", ST.small, V["text/base/secondary"]);
    tx.appendChild(rs); rs.layoutSizingHorizontal = "FILL"; rs.textAutoResize = "HEIGHT"; rs.visible = state === "Disabled";
    holder.appendChild(c); rows.push(c);
  }
  const set = figma.combineAsVariants(rows, holder); set.name = "Act post-process sheet · row";
  set.layoutMode = "VERTICAL"; set.itemSpacing = 16; pad(set, 16, 16, 16, 16); set.primaryAxisSizingMode = "AUTO"; set.counterAxisSizingMode = "AUTO";
  set.description = "Phone action-sheet row (≤760) — code js/act-row.js, css/facet-filter.css .e-permits-filter-sheet__action: 48 high, padding 12 8, gap 10, radius 8, icon 24, 14/20 regular; Hover = background tertiary; Disabled = label + icon disabled colour + reason line 14/20 secondary (88 high with a 2-line reason at 375). Icon colour comes from the variant — swap it through the Icon property only.";
  const pL = set.addComponentProperty("Label", "TEXT", "Reperfectare");
  const pR = set.addComponentProperty("Reason", "TEXT", "Nu se inițiază pentru un act cu statutul „Suspendat”.");
  const pS = set.addComponentProperty("Show reason", "BOOLEAN", true);
  const pI = set.addComponentProperty("Icon", "INSTANCE_SWAP", IC.edit.id, { preferredValues: Object.values(IK).map(key => ({ type: "COMPONENT", key })) });
  for (const v of set.children) {
    const ic = v.children[0], tx = v.children[1];
    ic.componentPropertyReferences = { mainComponent: pI };
    tx.children[0].componentPropertyReferences = { characters: pL };
    tx.children[1].componentPropertyReferences = /Disabled/.test(v.name) ? { characters: pR, visible: pS } : { characters: pR };
  }
  const rowDefault = set.children.find(v => /Default/.test(v.name));

  // 2 · content
  const ct = figma.createComponent(); ct.name = "Act post-process sheet · content"; holder.appendChild(ct);
  ct.layoutMode = "VERTICAL"; ct.resize(375, 100); ct.fills = []; pad(ct, 0, 0, 16, 0);
  const hd = figma.createFrame(); hd.name = "Header"; hd.layoutMode = "HORIZONTAL"; hd.fills = []; ct.appendChild(hd);
  hd.layoutSizingHorizontal = "FILL"; hd.layoutSizingVertical = "HUG"; pad(hd, 12, 16, 12, 16); hd.itemSpacing = 12; hd.setBoundVariable("itemSpacing", V["spacings/spacing-12"]); hd.counterAxisAlignItems = "MIN";
  const hg = figma.createFrame(); hg.name = "Heading"; hg.layoutMode = "VERTICAL"; hg.fills = []; hd.appendChild(hg);
  hg.layoutSizingHorizontal = "FILL"; hg.layoutSizingVertical = "HUG"; hg.itemSpacing = 2; hg.setBoundVariable("itemSpacing", V["spacings/spacing-2"]);
  const ti = await txt("Title", "Inițiază un postproces", ST.h5, V["text/base/default"]); hg.appendChild(ti); ti.layoutSizingHorizontal = "FILL"; ti.textAutoResize = "HEIGHT";
  const su = await txt("Act name", "Cafeneaua „Izvoraș”, mun. Bălți", ST.small, V["text/base/secondary"]); hg.appendChild(su); su.layoutSizingHorizontal = "FILL"; su.textAutoResize = "HEIGHT";
  const closeMain = await figma.importComponentByKeyAsync("75b4a0af7e74a50fdf81c4760885754d4571b512");
  const x16 = await figma.importComponentByKeyAsync("3f8e0ba57dfa5f76123ad5a4285b9172f3562f41");
  const cl = closeMain.createInstance(); cl.name = "Close"; hd.appendChild(cl);
  const lk = Object.keys(cl.componentProperties).find(k => /^🔄 Leading Icon: 16/.test(k)); if (lk) cl.setProperties({ [lk]: x16.id });
  const ls = figma.createFrame(); ls.name = "List"; ls.layoutMode = "VERTICAL"; ls.fills = []; ct.appendChild(ls);
  ls.layoutSizingHorizontal = "FILL"; ls.layoutSizingVertical = "HUG"; pad(ls, 0, 8, 0, 8); ls.itemSpacing = 0;
  const DEF = [["Reperfectare", "edit"], ["Retragere act permisiv", "cross"]];
  for (let i = 1; i <= 7; i++) {
    const r = rowDefault.createInstance(); r.name = "Row " + i; ls.appendChild(r); r.layoutSizingHorizontal = "FILL";
    const d = DEF[i - 1] || ["Acțiune", "edit"];
    const pk = Object.keys(r.componentProperties);
    r.setProperties({ [pk.find(k => /^Label/.test(k))]: d[0], [pk.find(k => /^Icon/.test(k))]: IC[d[1]].id });
    r.visible = i <= 2; r.isExposedInstance = true;
  }
  ct.primaryAxisSizingMode = "AUTO"; ct.counterAxisSizingMode = "FIXED";
  const cT = ct.addComponentProperty("Title", "TEXT", "Inițiază un postproces");
  const cA = ct.addComponentProperty("Act name", "TEXT", "Cafeneaua „Izvoraș”, mun. Bălți");
  ti.componentPropertyReferences = { characters: cT }; su.componentPropertyReferences = { characters: cA };
  ct.description = "Content of the act post-process action sheet (phones ≤760): title „Inițiază un postproces” + act NAME (wraps, never the act number) + × (button-filled-circular Neutral Small, top-aligned), list inset 0 8 of up to 7 exposed rows (hide the unused ones), bottom 16, no footer.";

  // 3 · sheet = library bottom-sheet with the content in its slot
  const sh = figma.createComponent(); sh.name = "Act post-process sheet"; holder.appendChild(sh);
  sh.layoutMode = "VERTICAL"; sh.resize(375, 100); sh.fills = []; sh.itemSpacing = 0; pad(sh, 0, 0, 0, 0);
  const bsMain = await figma.importComponentByKeyAsync("8dc0c5b27b4148e09b959ff486cc6b7104e89482");
  const bs = bsMain.createInstance(); bs.name = "Bottom sheet"; sh.appendChild(bs); bs.layoutSizingHorizontal = "FILL";
  const bp = Object.keys(bs.componentProperties), prop = re => bp.find(k => re.test(k));
  bs.setProperties({ [prop(/Header/)]: false, [prop(/Drag Handle/)]: true, [prop(/Action Button/)]: false });
  rad(bs, V["border-radius/radius-16"], ["topLeftRadius", "topRightRadius"]);
  const slot = bs.children.find(n => n.name === "Content Slot"); slot.swapComponent(ct); slot.layoutSizingHorizontal = "FILL";
  try { slot.layoutSizingVertical = "HUG"; } catch (e) {}
  sh.primaryAxisSizingMode = "AUTO"; sh.counterAxisSizingMode = "FIXED";
  sh.description = "Act post-process menu on phones (≤760) = the facet-filter bottom sheet used as an action sheet (code js/act-row.js + window.GEAPSheet). Library bottom-sheet (Header off, Drag Handle on, no Action Button), top radius 16, slot = Act post-process sheet · content. Place it in an `Overlay · bottom sheet` (scrim) at the bottom of the 375 × 812 viewport — it hugs its rows, max height 100% − 16. The trigger behind the scrim shows Act row State=Menu open (focus ring). Desktop keeps the Post-process menu dropdown.";
  return { set: set.id, variants: set.children.map(v => v.id + " " + v.name), content: ct.id, sheet: sh.id, h: Math.round(sh.height), h5: ST.h5.fontSize + "/" + JSON.stringify(ST.h5.lineHeight) + " " + ST.h5.fontName.style };
};
