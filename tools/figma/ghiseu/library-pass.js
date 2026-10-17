// Ghișeu board — library-instance pass (2026-10-16). Raw captured controls → library / local instances, per screen.
// Run via use_figma: define LIBPASS = <this function>, store LIBPASS.toString() in figma.root shared plugin data
// ("ghs", "libpass") once, then per slice: `new Function("return " + stored)()(ROOT_IDS, OPT)`.
// ROOT_IDS = `Desktop · gh-XX` screen ids. Idempotent: only raw frames (never inside instances) are matched.
// Steps (OPT.steps, default all): idcard, unwrap, copy, stepper, notice, intent, lookup, menu, buttons, rename.
// Local components (GEAP › Local components › „Ghișeu · FO local components”):
//   Identity card · selected (FO) 11848:340972 · FO stepper · step (vertical) 11849:7107 · Intent card · new request 11849:7127
// Library / existing: copy-block 1053:10780 · Message · subtle 9845:17951 · svc/info-note 9624:13362 ·
//   search-input-rectangular 9285:37474 · .menu-item-action 62:4943 · avatar 5383:28521 · button sets 5611:63230 / 5749:34743.
const LIBPASS = async (ROOTS, OPT) => {
  OPT = OPT || {};
  const STEPS = OPT.steps || ["idcard", "unwrap", "copy", "stepper", "notice", "intent", "lookup", "menu", "buttons", "rename"];
  figma.skipInvisibleInstanceChildren = false;
  const g = (id) => figma.getNodeByIdAsync(id);
  const inI = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
  const key = (inst, name) => Object.keys(inst.componentProperties).find((k) => k.split("#")[0] === name);
  const variant = (set, pick) => set.children.find((c) => Object.entries(pick).every(([k, v]) => c.name.includes(`${k}=${v}`)));
  const T = (n) => (n.type === "TEXT" ? n.characters : "findAll" in n ? n.findAll((t) => t.type === "TEXT" && t.visible).map((t) => t.characters).join(" ").replace(/\s+/g, " ").trim() : "");
  const lum = (c) => 0.3 * c.r + 0.59 * c.g + 0.11 * c.b;
  const res = { done: {}, left: [], err: [] };
  const cnt = (k) => (res.done[k] = (res.done[k] || 0) + 1);
  const vname = {}; const vn = async (p) => { const id = p && p.boundVariables && p.boundVariables.color && p.boundVariables.color.id; if (!id) return ""; if (!(id in vname)) { const v = await figma.variables.getVariableByIdAsync(id); vname[id] = v ? v.name : ""; } return vname[id]; };
  const fontsOf = async (n) => { for (const t of (n.type === "TEXT" ? [n] : n.findAll((x) => x.type === "TEXT"))) { if (t.characters.length === 0) { if (t.fontName !== figma.mixed) await figma.loadFontAsync(t.fontName); continue; } for (const s of t.getStyledTextSegments(["fontName"])) await figma.loadFontAsync(s.fontName); } };
  // connectors attached to a node (or its descendants) are re-pointed to the replacement
  const page = figma.currentPage;
  const sec = await g("11818:21092");
  const conns = sec.children.filter((c) => c.type === "CONNECTOR");
  const put = (old, inst, o = {}) => {
    const p = old.parent; const idx = p.children.indexOf(old);
    const abs = old.layoutPositioning === "ABSOLUTE"; const al = p.layoutMode && p.layoutMode !== "NONE";
    const sh = old.layoutSizingHorizontal, sv = old.layoutSizingVertical, grow = old.layoutGrow, w = old.width, x = old.x, y = old.y;
    const ids = new Set([old.id, ...("findAll" in old ? old.findAll(() => true).map((n) => n.id) : [])]);
    p.insertChild(idx, inst);
    if (abs) { inst.layoutPositioning = "ABSOLUTE"; inst.x = x; inst.y = y; } else if (!al) { inst.x = x; inst.y = y; }
    if (al && !abs) {
      if (o.fill || sh === "FILL" || grow === 1) { try { inst.layoutSizingHorizontal = "FILL"; } catch (e) {} }
      else if (o.keepW) { try { inst.layoutSizingHorizontal = "FIXED"; inst.resize(w, inst.height); } catch (e) {} }
    }
    for (const c of conns) {
      for (const end of ["connectorStart", "connectorEnd"]) { const e = c[end]; if (e.endpointNodeId && ids.has(e.endpointNodeId)) { const ne = { endpointNodeId: inst.id }; if (e.magnet) ne.magnet = e.magnet; else if (e.position) ne.position = e.position; try { c[end] = ne; cnt("connector-repointed"); } catch (er) { res.err.push("conn " + c.id); } } }
    }
    old.remove(); return inst;
  };
  const C = {
    idcard: await g("11848:340972"), step: await g("11849:7107"), intent: await g("11848:340913"), /* shared New request card (Act row job) */ copy: await g("1053:10780"),
    msg: await g("9845:17951"), info: await g("9624:13362"), search: await g("9285:37474"), item: await g("62:4943"),
    avatar: await g("5383:28521"), fRect: await g("5611:63230"), tRect: await g("5749:34743"),
  };
  const icon = async (k) => figma.importComponentByKeyAsync(k);
  const ICON = { suitcase20: "13c704752d82ff4667a4a021d2f4b93fa9168ec6" /* PJ = 20/business (2026-10-17) */, edit20: "bef76865a142fa255aebe7a98f7a0411943e8c29", eye20: "faa2ea508755b47b8354bf6bb7d659776a525294",
    trash20: "c4be563fbf9791c2c506e3834143eed94b1b6d7d", rotate20: "8cdf3361fae3b611bc79a0ff4be5e664909d1ea5", copy20: "89c577ec6b8f893a92741093af50a237eb383016",
    pause: "3db9e42c1922d440a45fd45e29b7de6419f7a681", cross20: "3ccb9372951f0b3c922b004d8966a680404cd11f", flag20: "74d5fd818c70fb62cb47c276e710570948800897",
    history20: null };
  const MENU_ICON = [[/^Elimin/, "trash20"], [/^Prelungire/, "rotate20"], [/^Reînnoire|^Reinnoire/, "rotate20"], [/^Reperfectare/, "edit20"], [/^Emitere duplicat/, "copy20"], [/^Suspendare/, "pause"], [/^Retragere|^Anulare/, "cross20"], [/^Contesta/, "flag20"]];
  const fx = (await figma.getLocalEffectStylesAsync()).find((s) => s.name === "dropdown-effect");
  const r12 = await figma.variables.importVariableByKeyAsync("1f2268059644ae4bb07e70b94fc8ee2bafcf952e");
  const sp8 = await figma.variables.importVariableByKeyAsync("69ac88e41c0fea695fc5c4fd33f0188d1172dc59");
  const sp4 = await figma.variables.importVariableByKeyAsync("983c5b4d9a4e5fa988f0154c9bf4290c7aec9635");
  const white = await figma.variables.importVariableByKeyAsync("ec2921da40a6853a80b0d299be5bc8b1a11fcc89");

  for (const rid of ROOTS) {
    const root = await g(rid); if (!root) { res.left.push("missing " + rid); continue; }
    const st = root.name.replace(/^Desktop · /, "");
    const raw = (fn) => root.findAll((n) => n.type === "FRAME" && !inI(n) && fn(n));
    try {
      // 1 · identity cards (FO selected role)
      if (STEPS.includes("idcard")) for (const f of raw((n) => n.cornerRadius === 12 && n.paddingLeft === 16 && n.paddingTop === 16 && n.height < 120 && n.findOne((x) => x.type === "FRAME" && Math.round(x.width) === 32 && Math.round(x.height) === 32 && x.cornerRadius >= 999) && n.findOne((x) => x.type === "TEXT" && /^(IDNP|IDNO)$/.test(x.characters)))) {
        if (f.removed) continue;
        const changeable = !!f.findOne((x) => x.type === "INSTANCE" && /Schimbă/.test(x.name));
        const av = f.findOne((x) => x.type === "FRAME" && Math.round(x.width) === 32 && x.cornerRadius >= 999);
        const ini = av.findOne((x) => x.type === "TEXT"); const iniT = ini ? ini.characters : null;
        const idLab = f.findOne((x) => x.type === "TEXT" && /^(IDNP|IDNO)$/.test(x.characters)).characters;
        const cp = f.findOne((x) => x.type === "FRAME" && /^Button - Copiaz/.test(x.name)); const idVal = cp ? T(cp) : "";
        const nameT = f.findAll((x) => x.type === "TEXT").find((x) => x !== ini && !/^(IDNP|IDNO)$/.test(x.characters) && x.characters !== idVal && !/Schimbă/.test(x.characters));
        const v = variant(C.idcard, { Mode: changeable ? "Changeable" : "Static" }); const i = v.createInstance();
        i.setProperties({ [key(i, "Name")]: nameT ? nameT.characters : "", [key(i, "ID label")]: idLab });
        const valT = i.findOne((x) => x.name === "ID value").findOne((x) => x.type === "TEXT"); await fontsOf(valT); valT.characters = idVal;
        const a = i.findOne((x) => x.name === "Avatar");
        if (iniT) { const t = a.findOne((x) => x.type === "TEXT"); await fontsOf(t); t.characters = iniT; }
        else { a.setProperties({ "🎚️ Type": "Icon" }); const ic = a.findOne((x) => x.type === "INSTANCE"); if (ic) { const s = await icon(ICON.suitcase20); ic.swapComponent(s); } }
        i.name = "Identity card · " + (nameT ? nameT.characters : idLab);
        put(f, i, { fill: true }); cnt("idcard");
      }
      // 2 · unwrap „Button - Schimbă solicitantul” / „Button:margin” wrappers that hold a library instance
      if (STEPS.includes("unwrap")) for (const f of raw((n) => /^Button( - Schimbă|:margin)/.test(n.name) && n.children.length === 1 && n.children[0].type === "INSTANCE")) {
        const inst = f.children[0]; const p = f.parent; const idx = p.children.indexOf(f);
        p.insertChild(idx, inst); if (f.layoutPositioning === "ABSOLUTE") { inst.layoutPositioning = "ABSOLUTE"; inst.x = f.x; inst.y = f.y; }
        const pl = f.paddingLeft; f.remove(); cnt("unwrap");
        if (pl && p.layoutMode === "HORIZONTAL" && p.itemSpacing < pl) { /* margin-left of the action → the row's gap (code: 8 / 4) */ }
      }
      // 3 · copy values → copy-block
      if (STEPS.includes("copy")) for (const f of raw((n) => /^Button - Copiaz/.test(n.name))) {
        if (f.removed) continue; const val = T(f); const vtxt = f.findOne((x) => x.type === "TEXT"); const big = vtxt && vtxt.fontSize > 14;
        const i = variant(C.copy, { State: "Default" }).createInstance(); const t = i.findOne((x) => x.type === "TEXT"); await fontsOf(t); t.characters = val;
        if (big && vtxt.textStyleId) { try { await fontsOf(vtxt); await t.setTextStyleIdAsync(vtxt.textStyleId); } catch (e) {} }
        i.name = "copy · " + val; put(f, i); cnt("copy");
      }
      // 4 · FO vertical stepper → local step instances
      if (STEPS.includes("stepper")) for (const nav of raw((n) => /^Navigation - Pași/.test(n.name))) {
        const items = nav.children.filter((c) => c.type === "FRAME" && (/^List Item/.test(c.name) || c === nav.children[0])); // the active first step is a bare „Text” frame in the capture
        for (let k = 0; k < items.length; k++) {
          const it = items[k];
          const texts = it.findAll((x) => x.type === "TEXT" && x.visible); const num = texts.find((x) => /^\d+$/.test(x.characters.trim())); const lab = texts.find((x) => !/^\d+$/.test(x.characters.trim()));
          const circ = it.findOne((x) => x.type === "FRAME" && Math.round(x.width) === 24 && Math.round(x.height) === 24 && x.cornerRadius >= 999);
          const rowFill = it.findOne((x) => x.type === "FRAME" && x.cornerRadius === 4 && x.fills && x.fills.length && x.fills[0].visible !== false);
          const labBlue = lab && lab.fills[0] && lab.fills[0].color && lab.fills[0].color.b > 0.6 && lab.fills[0].color.r < 0.2;
          const state = !num ? "Completed" : (rowFill || labBlue) ? "Active" : "Default";
          const i = variant(C.step, { State: state }).createInstance();
          const props = { [key(i, "Label")]: lab ? lab.characters : "", [key(i, "Show connector")]: nav.children.indexOf(it) > 0 };
          if (num) props[key(i, "Number")] = num.characters.trim();
          i.setProperties(props); i.name = "step · " + (lab ? lab.characters : k + 1);
          put(it, i, { fill: true }); cnt("step");
        }
        nav.name = "Stepper · request steps"; nav.itemSpacing = 8; nav.setBoundVariable("itemSpacing", sp8);
      }
      // 5 · notices → Message · subtle (tone by fill) / svc/info-note (grey)
      if (STEPS.includes("notice")) for (const f of raw((n) => n.layoutMode === "HORIZONTAL" && n.cornerRadius === 12 && n.paddingLeft === 16 && n.paddingTop === 12 && n.children.length === 2)) {
        if (f.removed) continue;
        const tone = await vn(f.fills && f.fills[0]);
        const map = { "blue-sky/100": "Info", "green/100": "Success", "apricot/100": "Warning", "red/100": "Error" };
        const isInfo = /base\/secondary/.test(tone); if (!map[tone] && !isInfo) continue;
        const src = f.findAll((x) => x.type === "TEXT" && x.visible); if (src.length !== 1) { res.left.push(st + " notice " + f.id + " texts " + src.length); continue; }
        const s = src[0]; await fontsOf(s); const segs = s.getStyledTextSegments(["fontName"]); const chars = s.characters;
        let i;
        if (isInfo) { i = C.info.createInstance(); } else { i = variant(C.msg, { Tone: map[tone] }).createInstance(); }
        const t = i.findAll((x) => x.type === "TEXT").pop(); await fontsOf(t); t.characters = chars;
        for (const sg of segs) if (sg.fontName.style !== "Regular") { await figma.loadFontAsync(sg.fontName); t.setRangeFontName(sg.start, sg.end, sg.fontName); }
        i.name = (isInfo ? "info-note · " : "message · " + map[tone].toLowerCase() + " · ") + chars.slice(0, 24);
        put(f, i, { fill: true });
        try { t.layoutSizingHorizontal = "FILL"; t.textAutoResize = "HEIGHT"; } catch (e) {}
        cnt("notice-" + (isInfo ? "info" : map[tone]));
      }
      // 6 · „Solicitare nouă” option card → local Intent card
      if (STEPS.includes("intent")) for (const f of raw((n) => n.name === "Button" && n.layoutMode === "HORIZONTAL" && n.cornerRadius === 12 && /^Solicitare nouă/.test(T(n)))) {
        const tx = f.findAll((x) => x.type === "TEXT"); const i = (C.intent.type === "COMPONENT_SET" ? C.intent.children.find((c) => /Default/.test(c.name)) : C.intent).createInstance();
        i.setProperties({ [key(i, "Title")]: tx[0].characters, [key(i, "Text")]: tx[1] ? tx[1].characters : "" });
        i.name = "New request card"; put(f, i, { fill: true }); cnt("intent");
      }
      // 7 · lookup fields (IDNP / IDNO) → search-input-rectangular with the trailing search button
      if (STEPS.includes("lookup")) for (const f of raw((n) => /^Field · .*\(counter\)$/.test(n.name))) {
        const old = f.children.find((c) => c.type === "INSTANCE"); if (!old) continue;
        const pr = old.componentProperties; const pv = (n) => { const k = Object.keys(pr).find((x) => x.split("#")[0].includes(n)); return k ? pr[k].value : undefined; };
        const label = T(old.findOne((x) => x.type === "TEXT")) || f.name.replace(/^Field · | \(counter\)$/g, "");
        const value = pv("Placeholder"); const msgs = old.findAll((x) => x.type === "TEXT" && x.visible).map((x) => x.characters); const msg = msgs.length > 2 ? msgs[msgs.length - 1] : "";
        const ctr = f.findOne((x) => x.type === "TEXT" && /\/13$/.test(x.characters)); const digits = ctr ? parseInt(ctr.characters) : 0;
        const readOnly = pv("State") === "Read Only"; const err = /găsită|13 cifre|nu răspunde/.test(msg) && !/Preluat/.test(msg) && !readOnly;
        const loading = /Se caută/.test(msg);
        const state = readOnly ? "Filled" : loading ? "Loading" : digits === 0 ? "Focus" : "Filled";
        const btn = !readOnly;
        const v = variant(C.search, { "🎚️ State": state, "🎚️ Size": "Medium", "👁️ Button": btn ? "True" : "False" }) || variant(C.search, { "🎚️ State": "Filled", "🎚️ Size": "Medium", "👁️ Button": btn ? "True" : "False" });
        const i = v.createInstance(); await fontsOf(i);
        const set = { [key(i, "👁️ Label")]: true, [key(i, "👁️ Mandatory Star")]: true, [key(i, "👁️ Leading Icon")]: false, [key(i, "⌨️ Placeholder")]: digits ? value : "Introdu " + (/IDNO/.test(label) ? "IDNO" : "IDNP"),
          [key(i, "👁️ Assistive Text")]: !!msg && !loading, [key(i, "👁️ Clear Button")]: readOnly };
        for (const k of Object.keys(set)) if (!k || set[k] === undefined) delete set[k];
        i.setProperties(set);
        const lt = i.findAll((x) => x.type === "TEXT").find((x) => x.name === "Label" || /Label/.test(x.parent.name)); if (lt) { await fontsOf(lt); lt.characters = label; }
        const im = i.findOne((x) => x.type === "INSTANCE" && /^(inline-message|Assistive text)$/i.test(x.name));
        if (im && msg && !loading) { const mk = Object.keys(im.componentProperties); const S = (n) => mk.find((k) => k.split("#")[0].includes(n)); const pp = {}; if (S("Message")) pp[S("Message")] = msg; if (S("Style")) pp[S("Style")] = err ? "Error" : "Default"; try { im.setProperties(pp); } catch (e) { res.err.push(st + " im " + e.message); } }
        const nb = i.findOne((x) => x.type === "INSTANCE" && /button-filled/.test(x.name)); if (nb && btn && !loading) { try { nb.setProperties({ "🎚️ State": digits === 13 && !err ? "Default" : digits === 13 ? "Default" : "Disabled" }); } catch (e) {} }
        i.name = "lookup · " + label; const w = f.width;
        // the counter (code: 12/20 right of the label) stays as a text over the label row
        put(old, i, { fill: true }); if (ctr) { ctr.layoutPositioning = "ABSOLUTE"; ctr.x = w - ctr.width; ctr.y = 0; }
        f.name = "Lookup · " + label; cnt("lookup");
      }
      // 8 · menus → dropdown surface (dropdown-effect, clip, r12, no border) + .menu-item-action instances
      if (STEPS.includes("menu")) for (const f of raw((n) => /^Menu - /.test(n.name))) {
        const items = f.children.filter((c) => c.type === "FRAME" && /Menu Item/.test(c.name));
        for (const it of items) {
          const lab = T(it); const tx = it.findOne((x) => x.type === "TEXT"); const dis = (it.opacity < 1) || (tx && tx.fills[0] && tx.fills[0].color && lum(tx.fills[0].color) > 0.55);
          const i = variant(C.item, { "📍 Leading Element": "Icon", "🎚️ State": dis ? "Disabled" : "Default" }).createInstance();
          i.setProperties({ [key(i, "Option Label")]: lab });
          const ik = (MENU_ICON.find(([re]) => re.test(lab)) || [])[1]; const ic = i.findOne((x) => x.type === "INSTANCE");
          if (ik && ICON[ik] && ic) ic.swapComponent(await icon(ICON[ik]));
          i.name = "item · " + lab; put(it, i, { fill: true }); cnt("menu-item");
        }
        f.name = "Menu · " + f.name.replace(/^Menu - /, ""); if (fx) await f.setEffectStyleIdAsync(fx.id); f.clipsContent = true; f.strokes = [];
        for (const k of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) f.setBoundVariable(k, r12);
        f.fills = [figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 1, g: 1, b: 1 } }, "color", white)];
        for (const p of ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight"]) { f[p] = 8; f.setBoundVariable(p, sp8); } f.itemSpacing = 4; f.setBoundVariable("itemSpacing", sp4);
        f.primaryAxisSizingMode = "AUTO"; f.counterAxisSizingMode = "FIXED"; f.resize(Math.max(256, f.width), f.height);
        cnt("menu");
      }
      // 9 · remaining raw buttons: icon-only „Corectează” (pen), „Detalii” (eye), labelled buttons = clone the board's instance with the same label
      if (STEPS.includes("buttons")) {
        for (const f of raw((n) => /^Button - Corectează/.test(n.name))) {
          const v = variant(C.tRect, { "🖌️ Style": "Strict", "📍 Icon": "Only", "🎚️ Size": "Medium", "🎚️ State": "Default" }); const i = v.createInstance();
          const k = key(i, "🔄 Leading Icon: 20"); if (k) i.setProperties({ [k]: (await icon(ICON.edit20)).id });
          i.name = "btn · Corectează"; put(f, i); cnt("btn-edit");
        }
        for (const f of raw((n) => /^Button - Detalii/.test(n.name))) {
          const v = variant(C.fRect, { "🖌️ Style": "Neutral", "📍 Icon": "Leading", "🎚️ Size": "Small", "🎚️ State": "Default" }); const i = v.createInstance();
          i.setProperties({ [key(i, "⌨️ Label")]: "Detalii" }); const k = key(i, "🔄 Leading Icon: 16"); if (k) i.setProperties({ [k]: (await icon(ICON.eye20)).id });
          const ic = i.findOne((x) => x.type === "INSTANCE" && /eye/.test(x.name)); if (ic) ic.resize(16, 16);
          i.name = "btn · Detalii"; put(f, i); cnt("btn-detalii");
        }
        if (OPT.protos) for (const f of raw((n) => /^Button( - |$)/.test(n.name) && !/Copiaz|Deschide pasul/.test(n.name))) {
          if (f.removed) continue; const lab = T(f) || f.name.replace(/^Button - /, "");
          const pid = OPT.protos[lab] || OPT.protos[f.name.replace(/^Button - /, "")]; if (!pid) { res.left.push(st + " btn " + f.id + " " + f.name.slice(0, 30) + " [" + lab.slice(0, 20) + "]"); continue; }
          const proto = await g(pid); const i = proto.clone(); put(f, i); cnt("btn-proto");
        }
      }
      // 10 · names that only look like controls
      if (STEPS.includes("rename")) for (const f of raw((n) => /^Button:margin$/.test(n.name))) { f.name = "Action:margin"; cnt("rename"); }
    } catch (e) { res.err.push(st + " " + e.message.slice(0, 160)); }
    res.left.push(...root.findAll((n) => n.type === "FRAME" && !inI(n) && /^(Button|Menu - |Field · .*counter|Navigation - Pași)/.test(n.name)).slice(0, 6).map((n) => st + " " + n.id + " " + n.name.slice(0, 30)));
  }
  return res;
};
