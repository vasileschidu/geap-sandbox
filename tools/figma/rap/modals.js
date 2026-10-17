// RAP board — act modals (stored as "rap"/"modals"; body of an async function receiving L and SC (screens)).
// dataModalScreen: the profile page + scrim + library modal (Medium) whose .content-slot is swapped to a local
// „Data modal content · <id>” component (Date generale + Câmpuri specifice actului + read-only note).
// docModalScreen: the profile page + scrim + the local „Document modal (MDocs act)” whose canvas slot is swapped
// to „Doc canvas · <id>” (scaled A4 pages, or the loading / error empty state).
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

// ---- A4 page component (real size 794 × 1123, Desktop text styles)
const a4Page = async (P, act, k, n, x, y) => {
  const c = await upsertComp(`A4 act page · ${act} · ${k}/${n}`, x, y);
  c.layoutMode = "VERTICAL"; c.primaryAxisSizingMode = "FIXED"; c.counterAxisSizingMode = "FIXED"; c.resize(794, 1123); await fillV(c, "background/base/default");
  c.paddingTop = 68; c.paddingBottom = 68; c.paddingLeft = 60; c.paddingRight = 60; c.clipsContent = true;
  try { const fx = await figma.importStyleByKeyAsync("31092db557fca92f0a227cb1b1ee8dbaa703e17a"); await c.setEffectStyleIdAsync(fx.id); } catch (e) {}
  const W = 674;
  if (P.cont) { const ct = await AL("Continuation", "VERTICAL", { pad: [0, 0, 8, 0] }); put(c, ct, { fillW: true }); await strokeV(ct, "border/base/default"); ct.strokeTopWeight = 0; ct.strokeLeftWeight = 0; ct.strokeRightWeight = 0; ct.strokeBottomWeight = 1; ct.strokesIncludedInLayout = false; const t = await TX(P.cont, "cap", "text/base/tertiary"); put(ct, t, { fillW: true }); t.textAutoResize = "HEIGHT"; }
  if (P.authority) {
    const hd = await AL("Head", "VERTICAL", { gap: 2, pad: [0, 0, 16, 0], align: "CENTER" }); put(c, hd, { fillW: true }); await strokeV(hd, "border/base/default"); hd.strokeTopWeight = 0; hd.strokeLeftWeight = 0; hd.strokeRightWeight = 0; hd.strokeBottomWeight = 1; hd.strokesIncludedInLayout = false;
    const gs = await figma.importComponentSetByKeyAsync("3d0facf597c6961a599c09eb57f2fa8668f32df3"); const arms = L.variant(gs, { Style: "Blue", Logomark: "False", Language: "Ro" }).createInstance(); arms.name = "Arms"; const aw = await AL("Arms box", "VERTICAL", { pad: [0, 0, 8, 0] }); aw.appendChild(arms); hd.appendChild(aw);
    const ctry = await TX(P.country, "cap", "text/base/tertiary", { name: "Country" }); ctry.textCase = "UPPER"; ctry.letterSpacing = { unit: "PERCENT", value: 8 }; hd.appendChild(ctry);
    hd.appendChild(await TX(P.authority, "mh5", "text/base/default", { name: "Authority" }));
    if (P.office) hd.appendChild(await TX(P.office, "small", "text/base/secondary", { name: "Office" }));
    const h = await AL("Title", "VERTICAL", { gap: 8, pad: [24, 0, 16, 0], align: "CENTER" }); put(c, h, { fillW: true });
    const h1 = await TX(P.h1, "h5", "text/base/default", { name: "Act name", w: W }); h1.textAlignHorizontal = "CENTER"; put(h, h1, { fillW: true });
    const nr = await TX(P.number, "small", "text/base/secondary", { name: "Number" }); nr.textAlignHorizontal = "CENTER"; h.appendChild(nr);
  }
  const rowSet = await ensureA4Row();
  const tb = await AL("Table", "VERTICAL", { pad: [0, 0, 0, 0] }); put(c, tb, { fillW: true }); await strokeV(tb, "border/base/default"); tb.strokeTopWeight = 1; tb.strokeLeftWeight = 1; tb.strokeRightWeight = 0; tb.strokeBottomWeight = 0; tb.strokesIncludedInLayout = false;
  const tw = await AL("Table margin", "VERTICAL", { pad: [12, 0, 12, 0] }); c.insertChild(c.children.indexOf(tb), tw); put(tw, tb, { fillW: true }); tw.layoutSizingHorizontal = "FILL";
  for (const r of P.rows) { const g = !Array.isArray(r); const i = rowSet.children.find(v => v.name === "Kind=" + (g ? "Group" : "Field")).createInstance(); put(tb, i, { fillW: true }); setP(i, g ? { Label: r.group } : { Label: r[0], Value: r[1] }); }
  if (P.closing) { const t = await TX(P.closing, "small", "text/base/default", { name: "Closing" }); put(c, t, { fillW: true }); t.textAutoResize = "HEIGHT"; }
  const grow = await AL("Spacer", "VERTICAL"); put(c, grow, { fillW: true }); grow.layoutGrow = 1;
  if (P.sign) {
    const ft = await AL("Foot", "HORIZONTAL", { gap: 24, pad: [24, 0, 0, 0] }); put(c, ft, { fillW: true }); ft.counterAxisAlignItems = "MAX";
    const sg = await AL("Sign", "VERTICAL"); put(ft, sg, { fillW: true });
    sg.appendChild(await TX(P.sign[0], "cap", "text/base/tertiary", { name: "Label" }));
    const st = await AL("Strong", "VERTICAL", { pad: [4, 0, 0, 0] }); st.appendChild(await TX(P.sign[1], "small500", "text/base/default", { name: "Authority" })); sg.appendChild(st);
    const sd = await AL("Signed", "HORIZONTAL", { gap: 6, align: "CENTER", pad: [8, 0, 0, 0] });
    const sig = await figma.importComponentByKeyAsync("76db9b9b257f155ae5860ca608d7964cf5a72d1d"); const si = sig.createInstance(); si.name = "Icon"; for (const v of si.findAll(x => x.type === "VECTOR")) if (v.fills.length) v.fills = [await L.paint(v, "icon/brand/default")]; sd.appendChild(si);
    sd.appendChild(await TX(P.sign[2], "small", "text/brand/default", { name: "Text" })); sg.appendChild(sd);
    const qr = await AL("QR", "HORIZONTAL", { gap: 12, align: "CENTER" }); ft.appendChild(qr);
    const box = await AL("QR code", "HORIZONTAL", { pad: [4, 4, 4, 4], r: 4 }); await strokeV(box, "border/base/default"); const q = (await figma.importComponentByKeyAsync("2aafc1d569aff667e5e71d8ee8070871322edfae")).createInstance(); q.resize(80, 80); for (const v of q.findAll(x => x.type === "VECTOR")) if (v.fills.length) v.fills = [await L.paint(v, "icon/base/default")]; box.appendChild(q); qr.appendChild(box);
    const qt = await AL("QR text", "VERTICAL", { gap: 2 }); qr.appendChild(qt); qt.maxWidth = 184;
    const parts = P.qr.split(/(?<=autenticitatea)\s*/); qt.appendChild(await TX(parts[0], "cap500", "text/base/default", { name: "Title" }));
    if (parts[1]) { const u = await TX(parts[1], "cap", "text/base/tertiary", { name: "Url" }); put(qt, u, { fillW: true }); u.textAutoResize = "HEIGHT"; u.resize(184, u.height); }
  }
  const fl = await AL("Footer line", "VERTICAL", { pad: [8, 0, 0, 0] }); put(c, fl, { fillW: true }); await strokeV(fl, "border/base/default"); fl.strokeTopWeight = 1; fl.strokeLeftWeight = 0; fl.strokeRightWeight = 0; fl.strokeBottomWeight = 0; fl.strokesIncludedInLayout = false;
  const flm = await AL("Footer margin", "VERTICAL", { pad: [16, 0, 0, 0] }); c.insertChild(c.children.indexOf(fl), flm); put(flm, fl, { fillW: true }); flm.layoutSizingHorizontal = "FILL";
  const ftx = await TX(P.footer, "cap", "text/base/tertiary", { name: "Footer" }); ftx.textAlignHorizontal = "CENTER"; put(fl, ftx, { fillW: true }); ftx.textAutoResize = "HEIGHT";
  if (P.wm) {
    const wm = await AL("Watermark", "HORIZONTAL", { align: "CENTER", main: "CENTER" }); c.appendChild(wm); wm.layoutPositioning = "ABSOLUTE"; wm.resize(794, 1123); wm.primaryAxisSizingMode = "FIXED"; wm.counterAxisSizingMode = "FIXED"; wm.x = 0; wm.y = 0; wm.constraints = { horizontal: "STRETCH", vertical: "STRETCH" };
    const t = await TX(P.wm, "h1", P.wmTone === "warning" ? "text/warning/default" : P.wmTone === "danger" ? "text/danger/default" : "text/base/tertiary", { name: "Status word" });
    t.fontSize = 96; t.lineHeight = { unit: "PERCENT", value: 100 }; t.opacity = 0.16; wm.appendChild(t); t.layoutPositioning = "ABSOLUTE"; t.rotation = 35; t.x = Math.round((794 - t.width * 0.82) / 2 - 40); t.y = Math.round(1123 / 2 + t.width * 0.28);
    c.description = "Watermark = the status word across the page at 96 px / opacity 16 % / −35° in the status tone (AC-14): the Desktop/Heading/H1 style with a size override (no 96 px style) — declared.";
  }
  return c;
};

// ---- doc modal canvas (scaled pages / loading / error)
const docCanvas = async (S, mobile) => {
  const zoomW = mobile ? 311 : 624;
  const c = await upsertComp(`Doc canvas · ${S.id} · ${mobile ? "Mobile" : "Desktop"}`, mobile ? 6400 : 5400, 80);
  c.layoutMode = "VERTICAL"; c.primaryAxisSizingMode = "AUTO"; c.counterAxisSizingMode = "FIXED"; c.resize(zoomW, 100); await sp(c, "itemSpacing", 24); c.fills = []; c.counterAxisAlignItems = "CENTER";
  if (S.doc.loading || S.doc.state) {
    const es = (await getL("empty")).children.find(v => v.name === "Style=Bare").createInstance(); es.name = "Canvas state"; put(c, es, { fillW: true });
    setP(es, { Title: (S.doc.state && S.doc.state.title) || "Se generează documentul", Text: (S.doc.state && S.doc.state.text) || "", "Show text": !!(S.doc.state && S.doc.state.text), "Show action": false });
    if (S.doc.loading) { const g = es.findOne(n => n.name === "Icon" && n.type === "FRAME"); if (g) g.visible = false; const spn = await inst("spinner", { Size: "Medium", Style: "Brand" }); spn.name = "Spinner"; c.insertChild(0, spn); await sp(c, "itemSpacing", 0); }
    else { const err = await figma.importComponentByKeyAsync("7400f1d5a050a936658edcdf534e38132918d816").catch(() => null); if (err) setP(es, { Icon: err.id }); }
    c.minHeight = mobile ? 568 : 531; c.primaryAxisAlignItems = "CENTER";
    return c;
  }
  const n = S.doc.pages.length;
  for (let k = 0; k < n; k++) {
    const pname = `A4 act page · ${S.doc.number}${S.doc.pageSet ? " · " + S.doc.pageSet : ""} · ${k + 1}/${n}`; let pc = (await sec()).children.find(x => x.name === pname); if (!pc) { pc = await a4Page(S.doc.pages[k], S.doc.number + (S.doc.pageSet ? " · " + S.doc.pageSet : ""), k + 1, n, 3000 + 900 * k, 1400 + 1300 * (S.doc.row || 0)); }
    const i = pc.createInstance(); c.appendChild(i); i.rescale(zoomW / 794); i.name = "A4 page " + (k + 1) + "/" + n;
  }
  return c;
};
const ensureDocModal = async () => {
  if (L.RAPID.docModal) { const n = await figma.getNodeByIdAsync(L.RAPID.docModal); if (n) return n; }
  const s = await sec(); const comps = [];
  const ph = await upsertComp("Doc canvas · placeholder", 5400, 0); ph.resize(624, 100); await fillV(ph, "background/base/secondary");
  for (const bp of ["Desktop", "Mobile"]) {
    const m = bp === "Mobile"; const c = figma.createComponent(); c.name = "Breakpoint=" + bp; s.appendChild(c);
    c.layoutMode = "VERTICAL"; c.primaryAxisSizingMode = "FIXED"; c.counterAxisSizingMode = "FIXED"; c.resize(m ? 375 : 720, m ? 788 : 800); await fillV(c, "background/base/default"); c.clipsContent = true;
    if (m) { c.topLeftRadius = 16; c.topRightRadius = 16; c.bottomLeftRadius = 0; c.bottomRightRadius = 0; for (const f of ["topLeftRadius", "topRightRadius"]) c.setBoundVariable(f, await L.vr("r16")); } else await rad(c, 12);
    try { const fx = await figma.importStyleByKeyAsync("0f8db7d3be943869e9b2fd420fb6036884b875ba"); await c.setEffectStyleIdAsync(fx.id); } catch (e) {}
    const hd = await AL("Header", "HORIZONTAL", { gap: 12, pad: m ? [16, 16, 16, 16] : [24, 24, 24, 24] }); put(c, hd, { fillW: true }); hd.counterAxisAlignItems = "MIN";
    const tx = await AL("Header text", "VERTICAL", { gap: 8 }); put(hd, tx, { fillW: true });
    tx.appendChild(await TX("Forma de tipar a actului", "h3", "text/base/default", { name: "Title" }));
    const sub = await AL("Subtitle", m ? "VERTICAL" : "HORIZONTAL", { gap: m ? 2 : 8, align: m ? "MIN" : "CENTER" }); put(tx, sub, { fillW: true });
    // no act number in the header subtitle (code 5b15f948) — the name only
    const nm = await TX("Autorizație de funcționare – comerț", "small", "text/base/tertiary", { name: "Act name" }); put(sub, nm, { fillW: true }); nm.textTruncation = "ENDING"; nm.maxLines = m ? 2 : 1; nm.layoutSizingVertical = "HUG";
    const cl = await inst("btnFC", { Style: "Neutral", Icon: "Only", Size: "Small", State: "Default" }); setP(cl, { "Leading Icon: 16": (await L.icon("cross16")).id }); cl.name = "Close"; hd.appendChild(cl);
    const body = await AL("Body", "VERTICAL", { pad: m ? [0, 16, 16, 16] : [0, 24, 24, 24] }); put(c, body, { fillW: true }); body.layoutGrow = 1;
    const cv = await AL("Canvas · scroll", "VERTICAL", { pad: m ? [16, 16, 16, 16] : [24, 24, 24, 24], r: 8, fill: "background/base/secondary", align: "CENTER" }); put(body, cv, { fillW: true, fillH: true }); cv.clipsContent = true;
    const slot = ph.createInstance(); slot.name = "Canvas content"; cv.appendChild(slot); slot.resize(m ? 311 : 624, 100);
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
  const pC = set.addComponentProperty("Canvas", "INSTANCE_SWAP", ph.id);
  for (const v of set.children) { const cc = v.findOne(n => n.type === "INSTANCE" && n.name === "Canvas content" && !n.id.startsWith("I")); if (cc) cc.componentPropertyReferences = { mainComponent: pC }; for (const nm of ["Number", "Close", "Print", "Close button"]) { const x = v.findOne(n => n.type === "INSTANCE" && n.name === nm && !n.id.startsWith("I")); if (x) x.isExposedInstance = true; } }
  set.description = "The FO / Cabinet document modal (.e-permits-fo-doc-modal.rap-act-modal, css/doc-modal-parts.css): 720 × min(800, 90vh), r12; header title 24/32 + subtitle = act name only (1 line; 2 on phones), close 32; grey canvas (r8, 24 inset, scrolls) holding the A4 pages zoomed to the canvas width (Canvas content = „Doc canvas · <state>”: rescaled A4 act page instances, or the loading / error empty state); footer top divider: „Imprimă” (neutral, printer) · „Închide” (primary). Phones ≤600: full-height sheet 24 from the top, radius 16 top. Behind „Descarcă” of the data modal (US-143).";
  L.saveId("docModal", set.id); return set;
};

// ---- data modal content (library modal .content-slot replacement)
const dataContent = async (S, mobile) => {
  const W = mobile ? 338 : 588; const D = S.data;
  const c = await upsertComp(`Data modal content · ${S.id} · ${mobile ? "Mobile" : "Desktop"}`, mobile ? 7600 : 7000, 80);
  c.layoutMode = "VERTICAL"; c.primaryAxisSizingMode = "AUTO"; c.counterAxisSizingMode = "FIXED"; c.resize(W, 100); c.fills = []; await pad(c, 4, mobile ? 16 : 20, 24, mobile ? 16 : 20);
  const sub = await AL("Subtitle", mobile ? "VERTICAL" : "HORIZONTAL", { gap: mobile ? 2 : 8, align: mobile ? "MIN" : "CENTER", pad: [0, 0, 8, mobile ? 0 : 12] }); put(c, sub, { fillW: true });
  // no act number in the header subtitle (code 5b15f948) — the name only
  const nmw = await AL("Act name", "HORIZONTAL", { gap: 4 }); nmw.layoutWrap = "WRAP"; put(sub, nmw, { fillW: true });
  const nm = await TX(D.name, "small", "text/base/tertiary", { name: "Name" }); put(nmw, nm, { fillW: true });
  if (D.clamp === "false") { nm.textTruncation = "ENDING"; nm.maxLines = mobile ? 2 : 1; nm.layoutSizingVertical = "HUG"; } else nm.textAutoResize = "HEIGHT";
  if (D.clamp) { const more = await inst("link", { Style: "Primary", Size: "14: Small", State: "Default" }); setP(more, { Link: D.more, Underline: false }); more.name = "Mai mult"; nmw.appendChild(more); if (D.clamp === "false") nm.layoutSizingHorizontal = "FILL"; }
  const stl = await getL("secTitle"), rows = await getL("detRow"), tags = await getL("tag");
  for (const se of D.sections) {
    const box = await AL("Section · " + se.title, "VERTICAL", { pad: [0, 0, 16, 0] }); put(c, box, { fillW: true });
    const ti = stl.createInstance(); put(box, ti, { fillW: true }); setP(ti, { Title: se.title });
    const card = await AL("Card", "VERTICAL", { pad: [8, 20, 8, 20], r: mobile ? 16 : 24, fill: "background/base/secondary" }); put(box, card, { fillW: true });
    const items = se.items.filter(x => !x.toggle); const tog = se.items.find(x => x.toggle);
    for (let i = 0; i < items.length; i++) {
      const r = items[i]; const last = i === items.length - 1 && !tog;
      if (r.group) { const g = await AL("Group heading", "VERTICAL", { pad: [i ? 16 : 8, 0, 8, 0] }); put(card, g, { fillW: true }); await strokeV(g, "border/base/default"); g.strokeTopWeight = 0; g.strokeLeftWeight = 0; g.strokeRightWeight = 0; g.strokeBottomWeight = 1; g.strokesIncludedInLayout = false; const t = await TX(r.group, "small500", "text/base/default"); put(g, t, { fillW: true }); t.textAutoResize = "HEIGHT"; continue; }
      const tagged = r.tag && r.tag.length && !r.tacit; const kind = r.copy ? "Copy" : tagged ? "Tag" : "Text";
      const v = rows.children.find(x => x.name === `Breakpoint=${mobile ? "Mobile" : "Desktop"}, Value=${kind}, Divider=${last ? "Off" : "On"}`);
      const ri = v.createInstance(); ri.name = "Row · " + r.label; put(card, ri, { fillW: true });
      setP(ri, { Label: r.label, Value: r.value, "Tacit badge": !!r.tacit });
      if (r.tacit) { const vt = nested(ri, n => n.type === "TEXT" && n.name === "Value text"); if (vt) vt.layoutSizingHorizontal = "HUG"; }
      if (r.copy) setP(nested(ri, n => n.type === "INSTANCE" && n.name === "Copy"), { Value: r.value, "Show icon": true });
      if (tagged) { const tg = nested(ri, n => n.type === "INSTANCE" && n.name === "Status"); tg.swapComponent(tags.children.find(x => x.name === "Tone=" + (TONE[r.tag[0][1]] || "Neutral"))); setP(tg, { Label: r.tag[0][0] }); }
    }
    if (tog) { const tw = await AL("Toggle", "HORIZONTAL", { pad: [8, 0, 8, 0] }); put(card, tw, { fillW: true }); const b = await inst("btnTC", { Style: "Primary", Icon: "None", Size: "Small", State: "Default" }); setP(b, { Label: tog.toggle }); b.name = tog.toggle; tw.appendChild(b); }
  }
  const note = (await ensureNote()).createInstance(); note.name = "Read-only note"; put(c, note, { fillW: true }); setP(note, { Text: D.note });
  c.description = "„Vizualizare act” data modal content for " + S.id + " (renderActData): subtitle = act name only (clamp + „Mai mult” when long), Date generale card, Câmpuri specifice actului card (form-section headings, first 8 + „Arată toate câmpurile (N)”), read-only note. In code the modal body scrolls inside min(90vh); Figma shows the whole content.";
  return c;
};

// ---- screens
const overlayOn = async (s, mobile) => { const ov = await AL("Overlay · modal", "VERTICAL"); s.appendChild(ov); ov.layoutPositioning = "ABSOLUTE"; ov.x = 0; ov.y = 0; ov.resize(s.width, s.height); ov.constraints = { horizontal: "STRETCH", vertical: "STRETCH" }; await fillV(ov, "background/alpha/overlay-dark"); ov.layoutMode = "NONE"; return ov; };
const fitScreen = (s, h, mobile) => { s.primaryAxisSizingMode = "FIXED"; s.minHeight = null; s.resize(s.width, h); };
const dataModalScreen = async (S, mobile) => {
  const base = await SC.profileScreen(S.profile, mobile);
  const s = base.s; s.name = (mobile ? "Mobile · " : "Desktop · ") + S.id;
  const ms = await L.cset("modal"); const m = L.variant(ms, { Breakpoint: mobile ? "Mobile" : "Desktop", Type: "Default", Size: "Medium" }).createInstance(); m.name = "Modal · Vizualizare act";
  const hdr = m.children.find(c => c.name === ".modal-header"); setP(hdr, { Title: S.data.title });
  const slot = m.children.find(c => c.name === ".content-slot"); slot.swapComponent(await dataContent(S, mobile));
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
  const set = await ensureDocModal(); const m = set.children.find(c => c.name === "Breakpoint=" + (mobile ? "Mobile" : "Desktop")).createInstance(); m.name = "Document modal · " + S.doc.number;
  setP(m, { Title: S.doc.title, "Act name": S.doc.name, "Show print": !S.doc.loading && !S.doc.state });
  setP(nested(m, n => n.type === "INSTANCE" && n.name === "Number"), { Value: S.doc.number, "Show icon": true });
  const canvas = await docCanvas(S, mobile); const slot = nested(m, n => n.type === "INSTANCE" && n.name === "Canvas content"); slot.swapComponent(canvas);
  const H = mobile ? 812 : 1024; fitScreen(s, H, mobile); const ov = await overlayOn(s, mobile); ov.appendChild(m);
  m.x = mobile ? 0 : Math.round((1440 - 720) / 2); m.y = mobile ? 24 : Math.round((H - 800) / 2);
  return { s, modal: m };
};
return { dataModalScreen, docModalScreen, a4Page, ensureDocModal, dataContent };
