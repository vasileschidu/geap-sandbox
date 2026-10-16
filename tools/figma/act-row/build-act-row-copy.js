// BUILD_ACT_ROW_COPY(STEP, OPT) — rebuilds the GEAP „Act row” family in another file (FOD, EVO Cabinet) from
// LIBRARY keys only (files don't share local components). Same geometry / tokens as GEAP 🧩 Local components:
//   Post-process menu · item 11844:198541, Post-process menu 11844:340693, Act row 11846:340996,
//   New request card 11848:340913 (+ a local „Message · subtle” Tone=Warning when the file has none).
// Steps (one use_figma call each, ids passed between calls via OPT):
//   "holder"  → OPT { page, x, y }                         → { holder }
//   "menu"    → OPT { holder, dropdownStyleId }            → { itemSet, menu }
//   "message" → OPT { holder }                             → { message }   (Tone=Warning component)
//   "row"     → OPT { holder, menu, message }              → { set }       (8 variants: State × Screen)
//   "card"    → OPT { holder }                             → { card }
const K = {
  menuItemSet: "8eee001b6ad1adbc443f5f8bbe377d99b734b317", tagSet: "a97109f9ebf668fb7616cb37e46929fc75ed9070",
  buttonSet: "fcf938f6ce9e31ae7f0f11838ee889335b4b7728", docIconGenerated: "e0b9de2ba823d1cd34fc5b296ba84a18a024632e",
  avatarSet: "c622e4206c2a122385a0a1b0089b7e1c75fe7574", contextualMenu: "eca4c78b40aec0ddac890e7f006907d81868c1ab",
  i16edit: "900108c640ea6ddb92fc6a9ac05ac67392d8f310", i16cross: "3f8e0ba57dfa5f76123ad5a4285b9172f3562f41",
  i16time: "0c1fa876fe12e72dc2bc2841c8ac83d44d937d4e", i20chevTop: "0e1e17107763411570b607bddc5de7061afdcb15",
  i20plus: "b270f954e420ff6e2abdedbaf9ce0834e7eb428d", i20chevRight: "d5d6c61279d8018dd0bd8c4015a52d2a394d5324",
  tsBody500: "057521fde838188af42abf69eb3789f676421047", tsBody: "1f35541006807f80d766d8eb6ef5ae95d4f5cf6e", tsCaption: "8d8e3878d547d107cf6de81a24255f71485db63f",
  fxFocus: "97cdddcd09b08677bf21762cd132d69bb276e9c8"
};
const BUILD_ACT_ROW_COPY = async (STEP, OPT = {}) => {
  figma.skipInvisibleInstanceChildren = false;
  const cols = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync(); const VC = {};
  const V = async name => { if (VC[name]) return VC[name]; for (const c of cols) { if (!/Foundations/.test(c.libraryName)) continue; const vs = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(c.key); const f = vs.find(v => v.name === name); if (f) return VC[name] = await figma.variables.importVariableByKeyAsync(f.key); } throw new Error("var " + name); };
  const B = async (n, props, name) => { const v = await V(name); for (const p of props) n.setBoundVariable(p, v); };
  const paint = async (name, node) => { const v = await V(name); const val = node ? v.resolveForConsumer(node).value : { r: .5, g: .5, b: .5 }; return figma.variables.setBoundVariableForPaint(figma.util.solidPaint({ r: val.r, g: val.g, b: val.b }), "color", v); };
  const PAD = ["paddingLeft", "paddingRight", "paddingTop", "paddingBottom"], RAD = ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"];
  const TS = {}; const ts = async k => TS[k] ||= await figma.importStyleByKeyAsync(K[k]);
  await figma.loadFontAsync({ family: "Onest", style: "Regular" }); await figma.loadFontAsync({ family: "Onest", style: "Medium" });
  const text = async (parent, chars, styleKey, colorVar, name) => { const t = figma.createText(); parent.appendChild(t); await t.setTextStyleIdAsync((await ts(styleKey)).id); t.characters = chars; t.name = name; t.fills = [await paint(colorVar, t)]; return t; };
  const frame = (parent, name, mode) => { const f = figma.createFrame(); f.name = name; f.fills = []; f.clipsContent = false; if (mode) f.layoutMode = mode; parent.appendChild(f); return f; };
  const holder = OPT.holder ? await figma.getNodeByIdAsync(OPT.holder) : null;

  if (STEP === "holder") {
    const page = await figma.getNodeByIdAsync(OPT.page); await figma.setCurrentPageAsync(page);
    const h = figma.createFrame(); page.appendChild(h); h.name = "🧩 Local components · Act row (intent)"; h.x = OPT.x; h.y = OPT.y;
    h.layoutMode = "HORIZONTAL"; h.layoutWrap = "WRAP"; h.itemSpacing = 80; h.counterAxisSpacing = 80; for (const p of PAD) h[p] = 80;
    h.resize(2400, 400); h.primaryAxisSizingMode = "FIXED"; h.counterAxisSizingMode = "AUTO"; h.fills = [await paint("background/base/default", h)];
    return { holder: h.id };
  }
  if (STEP === "menu") {
    let lib; try { lib = await figma.importComponentSetByKeyAsync(K.menuItemSet); } catch (e) { // other files: reach .menu-item-action through the library contextual-menu
      const cm = await figma.importComponentByKeyAsync(K.contextualMenu); const it = cm.findOne(n => n.type === "INSTANCE" && /Leading Element/.test(n.mainComponent ? n.mainComponent.name : "")); lib = (await it.getMainComponentAsync()).parent; } const ic16 = await figma.importComponentByKeyAsync(K.i16edit);
    const comps = [];
    for (const st of ["Default", "Hover", "Disabled"]) {
      const v = lib.children.find(c => c.name === `📍 Leading Element=Icon, 🎚️ State=${st}`);
      const fr = v.createInstance().detachInstance(); holder.appendChild(fr);
      const old = fr.children.find(c => c.type === "INSTANCE"); const ov = old.findOne(n => n.type === "VECTOR" || n.type === "BOOLEAN_OPERATION"); const ip = ov && ov.fills.length ? ov.fills[0] : null;
      const ni = ic16.createInstance(); fr.insertChild(fr.children.indexOf(old), ni); old.remove(); ni.name = "Icon"; if (ip) for (const x of ni.findAll(n => n.type === "VECTOR" || n.type === "BOOLEAN_OPERATION")) x.fills = [ip];
      const c = figma.createComponentFromNode(fr); c.name = "State=" + st; c.layoutMode = "HORIZONTAL"; c.counterAxisAlignItems = "CENTER"; c.paddingTop = c.paddingBottom = 0;
      await B(c, ["paddingLeft", "itemSpacing"], "spacings/spacing-8"); await B(c, ["paddingRight"], "spacings/spacing-12"); await B(c, RAD, "border-radius/radius-6");
      c.resize(195, 32); c.primaryAxisSizingMode = "FIXED"; c.counterAxisSizingMode = "FIXED"; await B(c, ["height"], "spacings/spacing-32");
      if (st === "Hover") c.fills = [await paint("background/base/tertiary", c)];
      const t = c.children.find(x => x.type === "TEXT"); await t.setTextStyleIdAsync((await ts("tsBody500")).id); t.name = "Label"; t.characters = "Reperfectare"; t.textAutoResize = "WIDTH_AND_HEIGHT";
      comps.push(c);
    }
    const set = figma.combineAsVariants(comps, holder); set.name = "Post-process menu · item"; set.layoutMode = "VERTICAL"; set.itemSpacing = 16; for (const p of PAD) set[p] = 16; set.primaryAxisSizingMode = "AUTO"; set.counterAxisSizingMode = "AUTO";
    const kL = set.addComponentProperty("Label", "TEXT", "Reperfectare"), kI = set.addComponentProperty("Icon", "INSTANCE_SWAP", ic16.id);
    for (const c of set.children) { c.children.find(x => x.name === "Label").componentPropertyReferences = { characters: kL }; c.children.find(x => x.name === "Icon").componentPropertyReferences = { mainComponent: kI }; }
    set.description = "Copy of GEAP 2.0 „Post-process menu · item” (11844:198541): 32 high, 14/20 medium, padding 0 12 0 8, radius 6, 16 icon, gap 8 — library .menu-item-action is 44 / 20 (gap).";
    const m = figma.createComponent(); holder.appendChild(m); m.name = "Post-process menu"; m.layoutMode = "VERTICAL"; m.primaryAxisSizingMode = "AUTO";
    await B(m, PAD, "spacings/spacing-4"); await B(m, ["itemSpacing"], "spacings/spacing-2"); await B(m, RAD, "border-radius/radius-12");
    m.fills = [await paint("background/base/default", m)]; m.strokes = []; if (OPT.dropdownStyleId) await m.setEffectStyleIdAsync(OPT.dropdownStyleId); m.clipsContent = true;
    const def = set.children.find(c => c.name === "State=Default"); const xIc = await figma.importComponentByKeyAsync(K.i16cross);
    for (let n = 1; n <= 7; n++) { const i = def.createInstance(); m.appendChild(i); i.name = "Item " + n; i.layoutSizingHorizontal = "FILL"; i.setProperties({ [kL]: n === 2 ? "Retragere act permisiv" : n === 1 ? "Reperfectare" : "Item " + n, [kI]: n === 2 ? xIc.id : ic16.id }); i.visible = n <= 2; i.isExposedInstance = true; }
    m.resize(203, m.height); m.counterAxisSizingMode = "FIXED"; m.primaryAxisSizingMode = "AUTO"; m.minWidth = 180;
    m.description = "Copy of GEAP 2.0 „Post-process menu” (11844:340693): padding 4, gap 2, radius 12, dropdown-effect, clip; 7 exposed item slots; width = longest item (min 180).";
    return { itemSet: set.id, menu: m.id };
  }
  if (STEP === "message") {
    const c = figma.createComponent(); holder.appendChild(c); c.name = "Tone=Warning";
    c.layoutMode = "HORIZONTAL"; c.counterAxisAlignItems = "MIN"; await B(c, ["paddingTop", "paddingBottom", "itemSpacing"], "spacings/spacing-12"); await B(c, ["paddingLeft", "paddingRight"], "spacings/spacing-16"); await B(c, RAD, "border-radius/radius-12");
    c.fills = [await paint("background/warning/secondary", c)];
    const ic = (await figma.importComponentByKeyAsync(K.i16time)).createInstance(); c.appendChild(ic); ic.name = "Icon"; ic.resize(20, 20);
    for (const v of ic.findAll(n => n.type === "VECTOR")) v.fills = [await paint("icon/warning/default", v)];
    const t = await text(c, "Mesaj", "tsBody", "text/base/default", "Text"); t.layoutSizingHorizontal = "FILL"; t.textAutoResize = "HEIGHT";
    c.resize(550, 44); c.primaryAxisSizingMode = "FIXED"; c.counterAxisSizingMode = "AUTO";
    const set = figma.combineAsVariants([c], holder); set.name = "Message · subtle";
    const kT = set.addComponentProperty("Text", "TEXT", "Mesaj"); set.children[0].children.find(x => x.name === "Text").componentPropertyReferences = { characters: kT };
    set.description = "Copy of GEAP 2.0 „Message · subtle” (9845:17951, Tone=Warning only): padding 12/16, gap 12, radius 12, 20 icon in the tone colour, 14/20 text.";
    return { message: set.id, warning: set.children[0].id };
  }
  if (STEP === "row") {
    const tagSet = await figma.importComponentSetByKeyAsync(K.tagSet), bset = await figma.importComponentSetByKeyAsync(K.buttonSet);
    const doc = await figma.importComponentByKeyAsync(K.docIconGenerated), menuMain = await figma.getNodeByIdAsync(OPT.menu), msg = await figma.getNodeByIdAsync(OPT.message);
    const bvar = st => bset.children.find(x => x.name === `🖌️ Style=Neutral, 📍 Icon=Trailing, 🎚️ Size=Small, 🎚️ State=${st}`);
    const chevUp = await figma.importComponentByKeyAsync(K.i20chevTop);
    const made = [];
    for (const sc of ["Desktop", "Mobile"]) for (const st of ["Default", "Hover", "Menu open", "Locked"]) {
      const mob = sc === "Mobile"; const c = figma.createComponent(); holder.appendChild(c); c.name = `State=${st}, Screen=${sc}`;
      c.layoutMode = "VERTICAL"; await B(c, PAD, "spacings/spacing-12"); await B(c, ["itemSpacing"], "spacings/spacing-12"); await B(c, RAD, "border-radius/radius-12");
      c.fills = [await paint(st === "Hover" ? "background/base/tertiary" : "background/base/default", c)];
      c.strokes = [await paint("border/base/default", c)]; c.strokeWeight = 1; c.strokeAlign = "INSIDE"; c.strokesIncludedInLayout = true;
      c.resize(mob ? 343 : 768, 70); c.primaryAxisSizingMode = "AUTO"; c.counterAxisSizingMode = "FIXED";
      const row = frame(c, "Row", "HORIZONTAL"); row.layoutSizingHorizontal = "FILL"; row.layoutSizingVertical = "HUG"; row.counterAxisAlignItems = "CENTER"; await B(row, ["itemSpacing"], "spacings/spacing-12");
      const ic = doc.createInstance(); row.appendChild(ic); ic.name = "Icon";
      const content = frame(row, "Content", "VERTICAL"); content.layoutSizingHorizontal = "FILL"; content.layoutSizingVertical = "HUG"; await B(content, ["itemSpacing"], "spacings/spacing-4");
      const tr = frame(content, "Title and tag", "HORIZONTAL"); tr.layoutSizingHorizontal = "FILL"; tr.layoutSizingVertical = "HUG"; tr.counterAxisAlignItems = "CENTER"; await B(tr, ["itemSpacing"], "spacings/spacing-8");
      const title = await text(tr, "Cafeneaua „Izvoraș”, mun. Bălți", "tsBody500", "text/base/default", "Title"); title.textAutoResize = "WIDTH_AND_HEIGHT";
      const tag = tagSet.children.find(x => x.name === "🎚️ Type=Subtle, 🖌️ Style=Success, 📍 Icon=None, 🎚️ Size=Small").createInstance(); tr.appendChild(tag); tag.name = "Status";
      tag.setProperties({ [Object.keys(tag.componentProperties).find(k => k.startsWith("⌨️ Label"))]: "Valabil" }); tag.isExposedInstance = true;
      const meta = frame(content, "Meta", "HORIZONTAL"); meta.clipsContent = true; meta.layoutSizingHorizontal = "FILL"; meta.layoutSizingVertical = "HUG";
      const rows = frame(meta, "Rows", "HORIZONTAL"); rows.layoutWrap = "WRAP"; rows.itemSpacing = 18; rows.layoutSizingHorizontal = "FILL"; rows.layoutSizingVertical = "HUG";
      const parts = [];
      for (const [nm, val] of [["Number", "ASF-2026-04521"], ["Validity", "valabil până la 15 septembrie 2028"], ["Authority", "CSP Bălți"]]) {
        const p = frame(rows, "Part · " + nm, "HORIZONTAL"); p.layoutSizingHorizontal = "HUG"; p.layoutSizingVertical = "HUG"; await B(p, ["paddingTop", "paddingBottom"], "spacings/spacing-2");
        const dot = figma.createEllipse(); p.appendChild(dot); dot.name = "Dot"; dot.resize(2, 2); dot.layoutPositioning = "ABSOLUTE"; dot.x = -10; dot.y = 9; dot.fills = [await paint("text/base/tertiary", dot)];
        parts.push([nm, p, await text(p, val, "tsCaption", "text/base/tertiary", nm)]);
      }
      const btnV = bvar(st === "Menu open" ? "Focus" : st === "Locked" ? "Disabled" : "Default"); const btn = btnV.createInstance(); btn.name = "Action"; btn.setProperties({ "⌨️ Label#156:0": "Inițiază un postproces" });
      if (st === "Menu open") btn.setProperties({ [Object.keys(btn.componentProperties).find(k => k.startsWith("🔄 Trailing Icon: 16"))]: chevUp.id });
      let host = row;
      if (mob) { host = frame(c, "Actions", "HORIZONTAL"); host.layoutSizingHorizontal = "FILL"; host.layoutSizingVertical = "HUG"; host.paddingLeft = 36; }
      host.appendChild(btn); btn.isExposedInstance = true;
      if (st === "Menu open") {
        const layer = frame(host, "Menu layer", "HORIZONTAL"); layer.layoutPositioning = "ABSOLUTE"; layer.primaryAxisAlignItems = mob ? "MIN" : "MAX"; if (mob) layer.paddingLeft = 36;
        layer.resize(host.width, 74); layer.primaryAxisSizingMode = "FIXED"; layer.counterAxisSizingMode = "AUTO"; layer.x = 0; layer.y = (mob ? 0 : 6) + 32 + 6; layer.constraints = { horizontal: "STRETCH", vertical: "MIN" };
        const mi = menuMain.createInstance(); layer.appendChild(mi); mi.name = "Menu"; mi.isExposedInstance = true;
      }
      if (st === "Locked") {
        const n = msg.children[0].createInstance(); c.appendChild(n); n.name = "Notice"; n.layoutSizingHorizontal = "FILL"; n.isExposedInstance = true;
        const nt = n.findOne(x => x.type === "TEXT"); const T1 = "Reperfectare în curs", T2 = " · dosar C-2026-004733. Un alt postproces se inițiază după finalizarea acestuia.";
        nt.characters = T1 + T2; nt.setRangeFontName(0, T1.length, { family: "Onest", style: "Medium" });
      }
      c.__parts = parts; c.__title = title; made.push(c);
    }
    const set = figma.combineAsVariants(made, holder); set.name = "Act row";
    set.layoutMode = "HORIZONTAL"; set.layoutWrap = "WRAP"; set.itemSpacing = 40; set.counterAxisSpacing = 120; for (const p of PAD) set[p] = 40; set.resize(1700, 100); set.primaryAxisSizingMode = "FIXED"; set.counterAxisSizingMode = "AUTO";
    const kT = set.addComponentProperty("Title", "TEXT", "Cafeneaua „Izvoraș”, mun. Bălți"), kN = set.addComponentProperty("Number", "TEXT", "ASF-2026-04521"), kV = set.addComponentProperty("Validity", "TEXT", "valabil până la 15 septembrie 2028"), kA = set.addComponentProperty("Authority", "TEXT", "CSP Bălți"), kSV = set.addComponentProperty("Show validity", "BOOLEAN", true), kSA = set.addComponentProperty("Show authority", "BOOLEAN", true);
    for (const c of set.children) {
      if (Math.round(c.width) !== (/Mobile/.test(c.name) ? 343 : 768)) c.resize(/Mobile/.test(c.name) ? 343 : 768, c.height); c.counterAxisSizingMode = "FIXED"; c.primaryAxisSizingMode = "AUTO";
      c.findOne(n => n.name === "Title").componentPropertyReferences = { characters: kT };
      c.findOne(n => n.name === "Number" && n.type === "TEXT").componentPropertyReferences = { characters: kN };
      c.findOne(n => n.name === "Validity" && n.type === "TEXT").componentPropertyReferences = { characters: kV };
      c.findOne(n => n.name === "Authority" && n.type === "TEXT").componentPropertyReferences = { characters: kA };
      c.findOne(n => n.name === "Part · Validity").componentPropertyReferences = { visible: kSV };
      c.findOne(n => n.name === "Part · Authority").componentPropertyReferences = { visible: kSA };
    }
    set.description = "Copy of GEAP 2.0 „Act row” (11846:340996) — foActRowHtml (FO „Ce vrei să soliciți?”, Ghișeu „Ce se solicită?”). See the GEAP description for the rules.";
    return { set: set.id, variants: set.children.map(c => c.id + " " + c.name + " " + Math.round(c.height)) };
  }
  if (STEP === "card") {
    const avS = await figma.importComponentSetByKeyAsync(K.avatarSet); const avV = avS.children.find(c => c.name === "🎚️ Type=Icon, 🎚️ Size=Small, 🎚️ State=Default");
    const plus = await figma.importComponentByKeyAsync(K.i20plus), chev = await figma.importComponentByKeyAsync(K.i20chevRight); const fx = await figma.importStyleByKeyAsync(K.fxFocus);
    const comps = [];
    for (const st of ["Default", "Hover", "Focus"]) {
      const c = figma.createComponent(); holder.appendChild(c); c.name = "State=" + st; c.layoutMode = "HORIZONTAL"; c.counterAxisAlignItems = "CENTER";
      await B(c, [...PAD, "itemSpacing"], "spacings/spacing-16"); await B(c, RAD, "border-radius/radius-12"); c.resize(768, 78); c.primaryAxisSizingMode = "FIXED"; c.counterAxisSizingMode = "AUTO";
      c.fills = [await paint(st === "Hover" ? "background/brand/secondary-hover" : "background/brand/secondary", c)];
      const av = avV.createInstance(); c.appendChild(av); av.name = "Avatar"; av.fills = [await paint("background/brand/default", av)];
      const pi = av.children.find(n => n.type === "INSTANCE" && n.name === "20/person"); pi.swapComponent(plus); for (const v of pi.findAll(n => n.type === "VECTOR")) v.fills = [await paint("icon/base-inverse/on-color", v)];
      const copy = frame(c, "Copy", "VERTICAL"); copy.layoutSizingHorizontal = "FILL"; copy.layoutSizingVertical = "HUG"; await B(copy, ["itemSpacing"], "spacings/spacing-6");
      const t1 = await text(copy, "Solicitare nouă", "tsBody500", "text/base/default", "Title"); t1.layoutSizingHorizontal = "FILL"; t1.textAutoResize = "HEIGHT";
      const t2 = await text(copy, "Depui o cerere pentru un act nou", "tsBody", "text/base/secondary", "Text"); t2.layoutSizingHorizontal = "FILL"; t2.textAutoResize = "HEIGHT";
      const aw = frame(c, "Arrow", "HORIZONTAL"); aw.layoutSizingHorizontal = "HUG"; aw.layoutSizingVertical = "HUG"; await B(aw, [st === "Hover" ? "paddingLeft" : "paddingRight"], "spacings/spacing-4");
      const ar = chev.createInstance(); aw.appendChild(ar); ar.name = "Chevron"; for (const v of ar.findAll(n => n.type === "VECTOR")) v.fills = [await paint("icon/brand/default", v)];
      if (st === "Focus") { await c.setEffectStyleIdAsync(fx.id); c.clipsContent = true; }
      comps.push(c);
    }
    const set = figma.combineAsVariants(comps, holder); set.name = "New request card"; set.layoutMode = "VERTICAL"; set.itemSpacing = 24; for (const p of PAD) set[p] = 24; set.primaryAxisSizingMode = "AUTO"; set.counterAxisSizingMode = "AUTO";
    const kT = set.addComponentProperty("Title", "TEXT", "Solicitare nouă"), kX = set.addComponentProperty("Text", "TEXT", "Depui o cerere pentru un act nou");
    for (const c of set.children) { if (Math.round(c.width) !== 768) c.resize(768, c.height); c.findOne(n => n.name === "Title").componentPropertyReferences = { characters: kT }; c.findOne(n => n.name === "Text").componentPropertyReferences = { characters: kX }; }
    set.description = "Copy of GEAP 2.0 „New request card” (11848:340913) — foIntentNewHtml (.e-permits-fo-intent-new).";
    return { card: set.id };
  }
  throw new Error("unknown step " + STEP);
};
