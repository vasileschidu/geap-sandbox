// RAP board — act modals (stored as "rap"/"modals"; body of an async function receiving L and SC (screens)).
// NO template literals (stored through a String.raw literal). rap-components-cleanup-v1 (2026-10-23): NO per-state
// components — the states are instances of the consolidated mains (ids in "rap"/"ids") with the content in their slots:
// dataModalScreen: the profile page + scrim + library modal (Medium) whose .content-slot is swapped to „RAP / Modal / Data
// modal content” (dmContent: Breakpoint × Subtitle Plain / Collapsed / Expanded) with the section cards in its Sections slot.
// docModalScreen: the profile page + scrim + „RAP / Document / Document modal” whose canvas instance is swapped to „RAP /
// Document / Doc canvas” (canvas: Pages with „RAP / Document / A4 act page” instances in the Pages slot, or Loading / Error).
const { AL, TX, put, fillV, strokeV, pad, sp, rad, inst, setP, getL } = L;
const nested = (i, f) => i.findOne(f);
const sec = async () => await getL("compSection");
const upsertComp = async (name, x, y) => { const s = await sec(); const old = s.children.find(c => c.name === name); if (old) old.remove(); const c = figma.createComponent(); c.name = name; s.appendChild(c); c.x = x; c.y = y; return c; };
const TONE = { success: "Success", warning: "Warning", neutral: "Neutral", danger: "Danger", info: "Info" };

// ---- shared pieces (built once)
const ensureNote = async () => {
  if (L.RAPID.roNote) { const n = await figma.getNodeByIdAsync(L.RAPID.roNote); if (n) return n; }
  const c = await upsertComp("Read-only note", 2400, 80); c.layoutMode = "HORIZONTAL"; c.primaryAxisSizingMode = "FIXED"; c.counterAxisSizingMode = "AUTO"; c.resize(550, 52);
  await pad(c, 12, 16, 12, 12); await sp(c, "itemSpacing", 8); await rad(c, 8); await fillV(c, "background/base/secondary"); c.counterAxisAlignItems = "MIN";
  const shield = await figma.importComponentByKeyAsync("56a6470f06c73f19b34a5124033455c9d680821f").catch(() => null);
  if (shield) { const i = shield.createInstance(); i.name = "Icon"; c.appendChild(i); for (const v of i.findAll(x => x.type === "VECTOR")) if (v.fills.length) v.fills = [await L.paint(v, "icon/base/tertiary")]; }
  const t = await TX("Datele personale sunt mascate conform legislației. Sunt afișate doar câmpurile publice ale actului.", "small", "text/base/secondary", { name: "Text" }); put(c, t, { fillW: true }); t.textAutoResize = "HEIGHT";
  const p = c.addComponentProperty("Text", "TEXT", t.characters); t.componentPropertyReferences = { characters: p };
  c.description = "Read-only note of the BO detail modal (.info-box--neutral.e-permits-readonly-note): grey card, 20 shield, 14/20 secondary. The library info-box has no neutral tone (Info / Error / Warning only) — library gap.";
  L.saveId("roNote", c.id); return c;
};
const ensureA4Row = async () => {
  if (L.RAPID.a4row) { const n = await figma.getNodeByIdAsync(L.RAPID.a4row); if (n) return n; }
  const s = await sec(); const comps = [];
  for (const kind of ["Field", "Group"]) {
    const c = figma.createComponent(); c.name = "Kind=" + kind; c.layoutMode = "HORIZONTAL"; c.primaryAxisSizingMode = "FIXED"; c.counterAxisSizingMode = "AUTO"; c.resize(674, 33); c.fills = []; s.appendChild(c);
    const cell = async (name, w, style, color, txt) => { const f = await AL(name, "HORIZONTAL", { pad: [6, 8, 6, 8] }); await strokeV(f, "border/base/default"); f.strokeTopWeight = 0; f.strokeLeftWeight = 0; f.strokeRightWeight = 1; f.strokeBottomWeight = 1; f.strokesIncludedInLayout = false; c.appendChild(f); if (w) { f.resize(w, f.height); f.primaryAxisSizingMode = "FIXED"; } else f.layoutSizingHorizontal = "FILL"; f.layoutSizingVertical = "FILL"; const t = await TX(txt, style, color, { name: name === "Label cell" ? "Label" : "Value" }); put(f, t, { fillW: true }); t.textAutoResize = "HEIGHT"; return f; };
    if (kind === "Field") { await cell("Label cell", 270, "small", "text/base/secondary", "Beneficiar"); await cell("Value cell", 0, "small", "text/base/default", "MOLDAGROTEH S.R.L."); }
    else { const g = await cell("Group cell", 0, "small500", "text/base/default", "Datele economice ale unității"); await fillV(g, "background/base/secondary"); }
    comps.push(c);
  }
  const set = figma.combineAsVariants(comps, s); set.name = "A4 act page · row"; set.layoutMode = "VERTICAL"; set.itemSpacing = 16; await pad(set, 16); set.primaryAxisSizingMode = "AUTO"; set.counterAxisSizingMode = "AUTO"; set.x = 2400; set.y = 240;
  const pl = set.addComponentProperty("Label", "TEXT", "Beneficiar"), pv = set.addComponentProperty("Value", "TEXT", "MOLDAGROTEH S.R.L.");
  for (const v of set.children) { const l = v.findOne(n => n.name === "Label" && n.type === "TEXT"); const vv = v.findOne(n => n.name === "Value" && n.type === "TEXT"); if (l) l.componentPropertyReferences = { characters: pl }; if (vv) vv.componentPropertyReferences = { characters: v.name.includes("Group") ? pl : pv }; }
  set.description = "Table row of the MDocs A4 act page (.rap-act-doc table): collapsed 1 px borders (each cell draws right + bottom, the table draws top + left), label 40 % 14/20 secondary, value 14/20; Group = the form-section heading row (grey, code 600 → Body/Small 500, no 14 semibold style).";
  L.saveId("a4row", set.id); return set;
};

// ---- A4 page instance (real size 794 × 1123, rows in the Rows slot, rescaled AFTER filling)
const WM = { SUSPENDAT: "Suspended", RETRAS: "Withdrawn" };
const clearSlot = (i) => { const s = i.findOne(x => x.type === "SLOT"); for (const ch of [].concat(s.children)) ch.remove(); return s; };
const a4Inst = async (P, scale) => {
  const set = await getL("a4"), wms = await getL("a4wm");
  const NP = set.children.find(v => v.name === "Page=" + (P.authority ? "First" : "Continuation")).createInstance(); figma.currentPage.appendChild(NP);
  const pr = { "Show closing": !!P.closing, "Show signature": !!P.sign, "Show watermark": !!P.wm };
  if (P.authority) { pr.Authority = P.authority; pr.Office = P.office || ""; pr["Act name"] = P.h1; pr.Number = P.number; }
  else if (P.sign) pr.Authority = P.sign[1];
  if (P.cont) pr.Continuation = P.cont;
  if (P.sign) pr.Signed = P.sign[2];
  if (P.footer) pr.Footer = P.footer;
  setP(NP, pr);
  if (P.authority && !P.office) { const o = NP.findOne(x => x.type === "TEXT" && x.name === "Office"); if (o) o.visible = false; }
  if (P.closing) { const t = NP.findOne(x => x.type === "TEXT" && x.name === "Closing"); await figma.loadFontAsync(t.fontName); if (t.characters !== P.closing) t.characters = P.closing; }
  if (P.wm) { const w = NP.children.find(x => x.name === "Watermark"); const v = wms.children.find(x => x.name === "Status=" + (WM[P.wm] || "Suspended")); if (v) w.swapComponent(v); }
  const rowSet = await ensureA4Row(); const tb = clearSlot(NP);
  for (const r of P.rows) { const g = !Array.isArray(r); const i = rowSet.children.find(v => v.name === "Kind=" + (g ? "Group" : "Field")).createInstance(); put(tb, i, { fillW: true }); setP(i, g ? { Label: r.group } : { Label: r[0], Value: r[1] }); }
  if (scale && scale !== 1) NP.rescale(scale);
  return NP;
};

// ---- doc modal canvas: swap the modal's canvas instance to „RAP / Document / Doc canvas” and fill it
const docCanvas = async (cc, S, mobile) => {
  const set = await getL("canvas"); const W = mobile ? 359 : 624;
  const V = (st) => set.children.find(v => v.name === "Breakpoint=" + (mobile ? "Mobile" : "Desktop") + ", State=" + st);
  if (S.doc.loading) { cc.swapComponent(V("Loading")); cc.name = "Canvas content"; return cc; }
  if (S.doc.state) {
    cc.swapComponent(V("Error")); cc.name = "Canvas content";
    const es = cc.findOne(n => n.type === "INSTANCE" && n.name === "Canvas state"); // exposed Empty state
    setP(es, { Title: S.doc.state.title || "", Text: S.doc.state.text || "", "Show text": !!S.doc.state.text });
    return cc;
  }
  cc.swapComponent(V("Pages")); cc.name = "Canvas content";
  const slot = clearSlot(cc); const n = S.doc.pages.length;
  for (let k = 0; k < n; k++) { const p = await a4Inst(S.doc.pages[k], W / 794); p.name = "A4 page " + (k + 1) + "/" + n; slot.appendChild(p); }
  return cc;
};
const ensureDocModal = async () => {
  if (L.RAPID.docModal) { const n = await figma.getNodeByIdAsync(L.RAPID.docModal); if (n) return n; }
  const s = await sec(); const comps = [];
  const cvs = await getL("canvas"); const ph = cvs.children.find(v => v.name === "Breakpoint=Desktop, State=Pages"), phM = cvs.children.find(v => v.name === "Breakpoint=Mobile, State=Pages"); // default canvas = the consolidated Doc canvas (no placeholder)
  for (const bp of ["Desktop", "Mobile"]) {
    const m = bp === "Mobile"; const c = figma.createComponent(); c.name = "Breakpoint=" + bp; s.appendChild(c);
    c.layoutMode = "VERTICAL"; c.primaryAxisSizingMode = "FIXED"; c.counterAxisSizingMode = "FIXED"; c.resize(m ? 375 : 720, m ? 788 : 800); await fillV(c, "background/base/default"); c.clipsContent = true;
    if (m) { c.topLeftRadius = 16; c.topRightRadius = 16; c.bottomLeftRadius = 0; c.bottomRightRadius = 0; for (const f of ["topLeftRadius", "topRightRadius"]) c.setBoundVariable(f, await L.vr("r16")); } else await rad(c, 12);
    try { const fx = await figma.importStyleByKeyAsync("0f8db7d3be943869e9b2fd420fb6036884b875ba"); await c.setEffectStyleIdAsync(fx.id); } catch (e) {}
    const hd = await AL("Header", "HORIZONTAL", { gap: 12, pad: m ? [16, 16, 16, 16] : [24, 24, 24, 24] }); put(c, hd, { fillW: true }); hd.counterAxisAlignItems = "MIN";
    const tx = await AL("Header text", "VERTICAL", { gap: 8 }); put(hd, tx, { fillW: true });
    tx.appendChild(await TX("Forma de tipar a actului", "h3", "text/base/default", { name: "Title" }));
    const sub = await AL("Subtitle", m ? "VERTICAL" : "HORIZONTAL", { gap: m ? 2 : 4, align: m ? "MIN" : "CENTER" }); put(tx, sub, { fillW: true });
    // name → „Mai mult” = 4 (the name's end padding); the live set also has Name=Expanded variants (first lines + „Last line”
    // row with „Mai puțin” after the last word, TEXT prop „Last line”) added in place 2026-10-23 — split the name with splitName's measure
    // no act number in the header subtitle (code 5b15f948) — the name only
    const nm = await TX("Autorizație de funcționare – comerț", "small", "text/base/tertiary", { name: "Act name" }); put(sub, nm, { fillW: true }); nm.textTruncation = "ENDING"; nm.maxLines = m ? 2 : 1; nm.layoutSizingVertical = "HUG";
    const cl = await inst("btnFC", { Style: "Neutral", Icon: "Only", Size: "Small", State: "Default" }); setP(cl, { "Leading Icon: 16": (await L.icon("cross16")).id }); cl.name = "Close"; hd.appendChild(cl);
    const body = await AL("Body", "VERTICAL", { pad: m ? [0, 16, 16, 16] : [0, 24, 24, 24] }); put(c, body, { fillW: true }); body.layoutGrow = 1;
    const cv = await AL("Canvas · scroll", "VERTICAL", { pad: m ? [16, 16, 16, 16] : [24, 24, 24, 24], r: 8, fill: "background/base/secondary", align: "CENTER" }); put(body, cv, { fillW: true, fillH: true }); cv.clipsContent = true;
    const slot = (m ? phM : ph).createInstance(); slot.name = "Canvas content"; cv.appendChild(slot); if (m) slot.layoutSizingHorizontal = "FILL";
    const ft = await AL("Footer", "HORIZONTAL", { gap: 8, pad: m ? [16, 16, 16, 16] : [16, 20, 24, 20], main: "MAX", align: "CENTER", fill: "background/base/default" }); put(c, ft, { fillW: true }); await strokeV(ft, "border/base/default"); ft.strokeTopWeight = 1; ft.strokeBottomWeight = 0; ft.strokeLeftWeight = 0; ft.strokeRightWeight = 0; ft.strokesIncludedInLayout = false;
    const pr = await inst("btnFC", { Style: "Neutral", Icon: "Leading", Size: "Large", State: "Default" }); setP(pr, { Label: "Imprimă" }); pr.name = "Print"; ft.appendChild(pr);
    const ps = await figma.importComponentSetByKeyAsync("29847f4c815da9a161be01caea836af418804cae").catch(() => null); const pv = ps && (ps.children.find(x => /filled=on/.test(x.name)) || ps.defaultVariant); if (pv) setP(pr, { "Leading Icon: 20": pv.id, "Leading Icon: 16": pv.id });
    const ok = await inst("btnFC", { Style: "Primary", Icon: "None", Size: "Large", State: "Default" }); setP(ok, { Label: "Închide" }); ok.name = "Close button"; ft.appendChild(ok);
    if (m) { pr.layoutGrow = 1; ok.layoutGrow = 1; }
    comps.push(c);
  }
  const set = figma.combineAsVariants(comps, s); set.name = "Document modal (MDocs act)"; set.layoutMode = "HORIZONTAL"; set.itemSpacing = 40; await pad(set, 16); set.primaryAxisSizingMode = "AUTO"; set.counterAxisSizingMode = "AUTO"; set.counterAxisAlignItems = "MIN"; set.x = 4000; set.y = 80;
  const pT = set.addComponentProperty("Title", "TEXT", "Forma de tipar a actului"), pN = set.addComponentProperty("Act name", "TEXT", "Autorizație de funcționare – comerț"), pP = set.addComponentProperty("Show print", "BOOLEAN", true);
  for (const v of set.children) { v.findOne(n => n.name === "Title" && n.type === "TEXT" && !n.id.startsWith("I")).componentPropertyReferences = { characters: pT }; v.findOne(n => n.name === "Act name" && !n.id.startsWith("I")).componentPropertyReferences = { characters: pN }; v.findOne(n => n.name === "Print" && !n.id.startsWith("I")).componentPropertyReferences = { visible: pP }; }
  const pC = set.addComponentProperty("Canvas", "INSTANCE_SWAP", ph.id, [{ type: "COMPONENT_SET", key: cvs.key }]);
  for (const v of set.children) { const cc = v.findOne(n => n.type === "INSTANCE" && n.name === "Canvas content" && !n.id.startsWith("I")); if (cc) cc.componentPropertyReferences = { mainComponent: pC }; for (const nm of ["Number", "Close", "Print", "Close button"]) { const x = v.findOne(n => n.type === "INSTANCE" && n.name === nm && !n.id.startsWith("I")); if (x) x.isExposedInstance = true; } }
  set.description = "„Forma de tipar a actului” modal: act name, the document canvas, signature tray, print and close.";
  L.saveId("docModal", set.id); return set;
};

// ---- data modal content: the library modal's .content-slot instance → „RAP / Modal / Data modal content”, the state's
// section cards built INTO its Sections slot (Date generale, Câmpuri specifice actului, …) — no component per state
const subtitleVariant = (set, D, mobile) => set.children.find(v => v.name === "Breakpoint=" + (mobile ? "Mobile" : "Desktop") + ", Subtitle=" + (!D.clamp ? "Plain" : D.clamp === "true" ? "Expanded" : "Collapsed"));
// expanded name: first lines (TEXT „Act name”) + „Last line” row (TEXT „Last line” · „Mai puțin”), split where Chrome wraps
const splitName = async (ci, full) => {
  const nmw = ci.findOne(x => x.type === "FRAME" && x.name === "Act name");
  const nm = nmw.findOne(x => x.type === "TEXT" && x.name === "Name"), tg = nmw.findOne(x => x.type === "INSTANCE");
  await figma.loadFontAsync(nm.fontName);
  const W = nm.width, words = full.split(" ");
  const pr = nm.clone(); figma.currentPage.appendChild(pr); pr.textTruncation = "DISABLED"; pr.maxLines = null; pr.resize(W, 20); pr.textAutoResize = "HEIGHT"; // resize() makes it FIXED — auto-resize after
  const lh = (s) => { pr.characters = s; return pr.height; };
  const H = lh(full), line = lh(words[0]), Ln = Math.round(H / line);
  let k = 0;
  if (Ln > 1) { let lo = 1, hi = words.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (lh(words.slice(0, mid + 1).join(" ")) > (Ln - 1) * line + 1) hi = mid; else lo = mid + 1; } k = lo; }
  pr.textAutoResize = "WIDTH_AND_HEIGHT"; pr.characters = words.slice(k).join(" ");
  if (pr.width + 4 + (tg ? tg.width : 60) > W) k = words.length - 1;
  pr.remove();
  return { first: words.slice(0, k).join(" "), last: words.slice(k).join(" ") };
};
const dataContent = async (ci, S, mobile) => {
  const D = S.data; const set = await getL("dmContent");
  ci.swapComponent(subtitleVariant(set, D, mobile)); ci.name = "Data modal content";
  // no act number in the header subtitle (code 5b15f948) — the name only
  if (D.clamp === "true") { const sp2 = await splitName(ci, D.name); setP(ci, { "Act name": sp2.first || " ", "Last line": sp2.last }); if (!sp2.first) ci.findOne(x => x.type === "TEXT" && x.name === "Name").visible = false; }
  else setP(ci, { "Act name": D.name });
  const slot = clearSlot(ci);
  const stl = await getL("secTitle"), rows = await getL("detRow"), tags = await getL("tag");
  for (const se of D.sections) {
    const box = await AL("Section · " + se.title, "VERTICAL", { pad: [0, 0, 16, 0] }); slot.appendChild(box); box.layoutSizingHorizontal = "FILL";
    const ti = stl.createInstance(); put(box, ti, { fillW: true }); setP(ti, { Title: se.title });
    if (mobile) { const tt = ti.findOne(x => x.type === "TEXT" && x.name === "Title"); const st = await L.ts("mh5"); await figma.loadFontAsync(tt.fontName); await figma.loadFontAsync(st.fontName); await tt.setTextStyleIdAsync(st.id); } // phone section heading = Mobile H5
    const card = await AL("Card", "VERTICAL", { pad: [8, 20, 8, 20], r: mobile ? 16 : 24, fill: "background/base/secondary" }); put(box, card, { fillW: true });
    const items = se.items.filter(x => !x.toggle); const tog = se.items.find(x => x.toggle);
    for (let i = 0; i < items.length; i++) {
      const r = items[i]; const last = i === items.length - 1 && !tog;
      if (r.group) { const g = await AL("Group heading", "VERTICAL", { pad: [i ? 16 : 8, 0, 8, 0] }); put(card, g, { fillW: true }); await strokeV(g, "border/base/default"); g.strokeTopWeight = 0; g.strokeLeftWeight = 0; g.strokeRightWeight = 0; g.strokeBottomWeight = 1; g.strokesIncludedInLayout = false; const t = await TX(r.group, "small500", "text/base/default"); put(g, t, { fillW: true }); t.textAutoResize = "HEIGHT"; continue; }
      const tagged = r.tag && r.tag.length && !r.tacit; const kind = r.copy ? "Copy" : tagged ? "Tag" : "Text";
      const v = rows.children.find(x => x.name === "Breakpoint=" + (mobile ? "Mobile" : "Desktop") + ", Value=" + kind + ", Divider=" + (last ? "Off" : "On"));
      const ri = v.createInstance(); ri.name = "Row · " + r.label; put(card, ri, { fillW: true });
      setP(ri, { Label: r.label, Value: r.value, "Tacit badge": !!r.tacit });
      if (r.tacit) { const vt = nested(ri, n => n.type === "TEXT" && n.name === "Value text"); if (vt) vt.layoutSizingHorizontal = "HUG"; }
      if (r.copy) setP(nested(ri, n => n.type === "INSTANCE" && n.name === "Copy"), { Value: r.value, "Show icon": true });
      if (tagged) { const tg = nested(ri, n => n.type === "INSTANCE" && n.name === "Status"); tg.swapComponent(tags.children.find(x => x.name === "Tone=" + (TONE[r.tag[0][1]] || "Neutral"))); setP(tg, { Label: r.tag[0][0] }); }
    }
    if (tog) { const tw = await AL("Toggle", "HORIZONTAL", { pad: [8, 0, 8, 0] }); put(card, tw, { fillW: true }); const b = await inst("btnTC", { Style: "Primary", Icon: "None", Size: "Small", State: "Default" }); setP(b, { Label: tog.toggle }); b.name = tog.toggle; tw.appendChild(b); }
  }
  const note = ci.findOne(x => x.type === "INSTANCE" && x.name === "Read-only note"); if (note && D.note) setP(note, { Text: D.note });
  return ci;
};

// ---- screens
const overlayOn = async (s, mobile) => { const ov = await AL("Overlay · modal", "VERTICAL"); s.appendChild(ov); ov.layoutPositioning = "ABSOLUTE"; ov.x = 0; ov.y = 0; ov.resize(s.width, s.height); ov.constraints = { horizontal: "STRETCH", vertical: "STRETCH" }; await fillV(ov, "background/alpha/overlay-dark"); ov.layoutMode = "NONE"; return ov; };
const fitScreen = (s, h, mobile) => { s.primaryAxisSizingMode = "FIXED"; s.minHeight = null; s.resize(s.width, h); };
const dataModalScreen = async (S, mobile) => {
  const base = await SC.profileScreen(S.profile, mobile);
  const s = base.s; s.name = (mobile ? "Mobile · " : "Desktop · ") + S.id;
  const ms = await L.cset("modal"); const m = L.variant(ms, { Breakpoint: mobile ? "Mobile" : "Desktop", Type: "Default", Size: "Medium" }).createInstance(); m.name = "Modal · Vizualizare act";
  const hdr = m.children.find(c => c.name === ".modal-header"); setP(hdr, { Title: S.data.title });
  const slot = m.children.find(c => c.name === ".content-slot"); await dataContent(slot, S, mobile);
  const ft = m.children.find(c => c.name === "Footer"); const sec2 = ft.children.find(c => c.name === "Secondary Button"), pri = ft.children.find(c => c.name === "Primary Button");
  const dl = await figma.importComponentSetByKeyAsync("80dbbcd5d8e044b2c1c89202f2f083fb89485ac6").catch(() => null); const dlv = dl ? (dl.children.find(c => /filled=on/.test(c.name)) || dl.defaultVariant) : await L.icon("copy20");
  sec2.swapComponent(L.variant(await L.cset("btnFC"), { Style: "Neutral", Icon: "Leading", Size: "Large", State: "Default" })); setP(sec2, { Label: "Descarcă", "Leading Icon: 20": dlv.id, "Leading Icon: 16": dlv.id }); setP(pri, { Label: "Închide" });
  const W = mobile ? 338 : 590; m.resize(W, m.height);
  const viewport = mobile ? 812 : 1024; const H = Math.max(viewport, Math.round(m.height) + 64);
  fitScreen(s, H, mobile); const ov = await overlayOn(s, mobile); ov.appendChild(m); m.x = Math.round((s.width - W) / 2); m.y = Math.max(32, Math.round((Math.min(H, viewport) - m.height) / 2));
  return { s, modal: m, download: sec2 };
};
const docModalScreen = async (S, mobile) => {
  const base = await SC.profileScreen(S.profile, mobile);
  const s = base.s; s.name = (mobile ? "Mobile · " : "Desktop · ") + S.id;
  const set = await ensureDocModal(); const m = (L.variant(set, { Breakpoint: mobile ? "Mobile" : "Desktop", Name: S.doc.expanded ? "Expanded" : "Collapsed" }) || set.children.find(c => c.name === "Breakpoint=" + (mobile ? "Mobile" : "Desktop"))).createInstance(); m.name = "Document modal · " + S.doc.number;
  setP(m, { Title: S.doc.title, "Act name": S.doc.name, "Show print": !S.doc.loading && !S.doc.state });
  setP(nested(m, n => n.type === "INSTANCE" && n.name === "Number"), { Value: S.doc.number, "Show icon": true });
  const slot = nested(m, n => n.type === "INSTANCE" && n.name === "Canvas content"); await docCanvas(slot, S, mobile);
  const H = mobile ? 812 : 1024; fitScreen(s, H, mobile); const ov = await overlayOn(s, mobile); ov.appendChild(m);
  m.x = mobile ? 0 : Math.round((1440 - 720) / 2); m.y = mobile ? 24 : Math.round((H - 800) / 2);
  return { s, modal: m };
};
return { dataModalScreen, docModalScreen, a4Inst, docCanvas, ensureDocModal, dataContent };
