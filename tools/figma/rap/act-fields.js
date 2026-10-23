// RAP board — configured act fields: groups + tables (2026-10-19, code 135c5d05, Figma comment 1968940910).
// Stored as "rap"/"af" in figma.root shared plugin data; body of an async function receiving L (the "rap"/"lib" prelude).
// NO template literals in this file (it is stored through a String.raw literal).
// rap-components-cleanup-v1 (2026-10-23): NO per-state components. Every state is an instance of a consolidated
// component whose native SLOT holds the state's content (frames of library / local instances):
// - tableInst(T, n, mobile): „RAP / Modal / Act fields table” (ids „afTable”) Breakpoint=Desktop (bordered box that scrolls
//   sideways; header row + body rows of library table-header 658ba90a / table-cell 86cc7c40 in the Rows slot) or Mobile
//   (Act fields / Row card instances in the Rows slot).
// - fillContent(ci, D, mobile, TABLES): swaps the library modal's .content-slot instance ci to „RAP / Modal / Data modal
//   content” (ids „dmContent”: Breakpoint × Subtitle Plain / Collapsed / Expanded; TEXT Act name / Last line) and builds the
//   section cards INTO its Sections slot.
// - a4Inst(P, scale): „RAP / Document / A4 act page” (ids „a4”: Page=First / Continuation; Show closing / signature /
//   watermark; the rows — Field / Group / Grid label rows of „A4 act page · row” + „A4 act page · grid row” — in its Rows
//   slot), rescaled to the canvas AFTER the slot is filled (rows cloned from a scaled page would be scaled twice).
// - fillCanvas(cc, pages, mobile, offsets): swaps the Document modal's canvas instance to „RAP / Document / Doc canvas”
//   (ids „canvas”) Pages and puts the page instances in its Pages slot (offsets = scrolled view: a fixed clipped
//   „Viewport (scrolled)” frame with the pages at the code's scroll offsets).
const { AL, TX, put, fillV, strokeV, pad, sp, rad, inst, setP, getL, variant } = L;
const AFID = JSON.parse(figma.root.getSharedPluginData("rap", "afids") || "{}");
const saveAF = (k, id) => { AFID[k] = id; figma.root.setSharedPluginData("rap", "afids", JSON.stringify(AFID)); };
const getAF = async k => AFID[k] ? await figma.getNodeByIdAsync(AFID[k]) : null;
const sec = await getL("compSection");
const own = (n, f) => n.findOne(x => !x.id.startsWith("I") && f(x));
if (!AFID.y0) saveAF("y0", Math.ceil((Math.max(...sec.children.map(c => c.y + c.height)) + 200) / 100) * 100);
const Y0 = AFID.y0;
const LIB = { th: "658ba90a316248aef802c0f9ec3c004694afaaba", tc: "86cc7c4081411f58b3894c27d40b1cecf845efd3" };
let _th = null, _tc = null;
const thVar = async () => _th || (_th = (await figma.importComponentSetByKeyAsync(LIB.th)).children.find(v => v.name === "📏 Breakpoint=Desktop, 🎚️ Type=Subtle"));
const tcVar = async () => _tc || (_tc = (await figma.importComponentSetByKeyAsync(LIB.tc)).children.find(v => v.name === "📏 Breakpoint=Desktop, 🎚️ Data Type=Text"));
const styleText = async (t, style, color) => { const st = await L.ts(style); await figma.loadFontAsync(t.fontName); await figma.loadFontAsync(st.fontName); await t.setTextStyleIdAsync(st.id); await fillV(t, color); };
const sideStroke = async (n, top, right, bottom, left) => { await strokeV(n, "border/base/default"); n.strokeTopWeight = top; n.strokeRightWeight = right; n.strokeBottomWeight = bottom; n.strokeLeftWeight = left; n.strokesIncludedInLayout = false; };

// ---- desktop table cells (library instances + BO overrides)
const headCell = async (label, w, num, pinned) => {
  const i = (await thVar()).createInstance(); i.name = "Header cell · " + label;
  setP(i, { Title: label, "Sort Icon": false });
  i.resize(w, 38); await pad(i, 8, 12, 8, 12); i.minHeight = 38; i.layoutSizingVertical = "HUG";
  await fillV(i, "background/base/secondary"); await sideStroke(i, 0, pinned ? 1 : 0, 1, 0);
  if (num) i.primaryAxisAlignItems = "MAX";
  const hd = i.children.find(c => c.name === "Header"); hd.layoutSizingHorizontal = "FILL";
  const ti = hd.children.find(c => c.name === "Title"); ti.layoutSizingHorizontal = "FILL"; ti.layoutSizingVertical = "HUG";
  const tx = ti.children.find(c => c.type === "TEXT"); await styleText(tx, "cap500", "text/base/secondary");
  tx.layoutSizingHorizontal = "FILL"; tx.textAutoResize = "HEIGHT"; if (num) tx.textAlignHorizontal = "RIGHT";
  return i;
};
const bodyCell = async (val, w, num, pinned, last) => {
  const i = (await tcVar()).createInstance(); i.name = "Cell · " + val.slice(0, 32);
  setP(i, { Data: val });
  i.resize(w, 50); i.layoutSizingVertical = "HUG"; i.minHeight = 50;
  i.strokeBottomWeight = last ? 0 : 0.5; i.strokeRightWeight = pinned ? 1 : 0;
  const cc = i.children.find(c => c.name === "Cell Container"); cc.layoutSizingVertical = "HUG"; await pad(cc, 8, 12, 8, 12);
  const tx = cc.findOne(c => c.type === "TEXT" && c.visible); await styleText(tx, "small", "text/base/secondary");
  tx.layoutSizingHorizontal = "FILL"; tx.textAutoResize = "HEIGHT"; if (num) tx.textAlignHorizontal = "RIGHT";
  for (const r of i.children.filter(c => c.name.indexOf("Resizer") > -1)) { r.layoutSizingVertical = "FIXED"; r.resize(r.width, 0.01); r.resize(r.width, 0); }
  return i;
};

// ---- mobile mini-card pieces (local)
const ensureCardLine = async () => {
  const ex = await getAF("cardLine"); if (ex) return ex;
  const c = figma.createComponent(); sec.appendChild(c); c.name = "Act fields / Card line"; c.x = 100; c.y = Y0;
  c.layoutMode = "HORIZONTAL"; c.primaryAxisSizingMode = "FIXED"; c.counterAxisSizingMode = "AUTO"; c.resize(226, 20); c.counterAxisSizingMode = "AUTO"; c.fills = []; await sp(c, "itemSpacing", 16); c.counterAxisAlignItems = "MIN";
  const l = await TX("Cod CAS", "small", "text/base/secondary", { name: "Label" }); put(c, l, { fillW: true }); l.textAutoResize = "HEIGHT";
  const v = await TX("75-45-6", "small500", "text/base/default", { name: "Value" }); put(c, v, { fillW: true }); v.textAutoResize = "HEIGHT";
  const pl = c.addComponentProperty("Label", "TEXT", "Cod CAS"), pv = c.addComponentProperty("Value", "TEXT", "75-45-6");
  l.componentPropertyReferences = { characters: pl }; v.componentPropertyReferences = { characters: pv };
  c.description = "Phone mini-card line of a configured act table (≤ 760, css/act-view.css): column label 14/20 secondary | value 14/20 medium default, two equal columns, gap 16 (the code's 2-column grid of the card).";
  saveAF("cardLine", c.id); return c;
};
const ensureRowCard = async () => {
  const ex = await getAF("rowCard"); if (ex) return ex;
  const line = await ensureCardLine();
  const c = figma.createComponent(); sec.appendChild(c); c.name = "Act fields / Row card"; c.x = 400; c.y = Y0;
  c.layoutMode = "VERTICAL"; c.primaryAxisSizingMode = "AUTO"; c.counterAxisSizingMode = "FIXED"; c.resize(258, 100); c.primaryAxisSizingMode = "AUTO"; await pad(c, 12, 16, 12, 16); await sp(c, "itemSpacing", 8);
  await fillV(c, "background/base/default"); await sideStroke(c, 1, 1, 1, 1); await rad(c, 12); c.strokesIncludedInLayout = true;
  const tt = await AL("Title", "VERTICAL", { gap: 4 }); put(c, tt, { fillW: true });
  const l = await TX("Denumirea substanței", "small", "text/base/secondary", { name: "Title label" }); put(tt, l, { fillW: true }); l.textAutoResize = "HEIGHT";
  const v = await TX("HCFC-22 (clorodifluorometan)", "small500", "text/base/default", { name: "Title value" }); put(tt, v, { fillW: true }); v.textAutoResize = "HEIGHT";
  const pl = c.addComponentProperty("Title label", "TEXT", l.characters), pv = c.addComponentProperty("Title value", "TEXT", v.characters);
  l.componentPropertyReferences = { characters: pl }; v.componentPropertyReferences = { characters: pv };
  for (let k = 1; k <= 4; k++) { const li = line.createInstance(); li.name = "Line " + k; put(c, li, { fillW: true }); li.isExposedInstance = true; }
  c.description = "Phone row of a configured act table (≤ 760, css/act-view.css): white card r12, 1 px border, 12/16 padding, gap 8; the first cell = column label over the value (gap 4), the other cells = „Act fields / Card line” (label | value). Lines are exposed instances.";
  saveAF("rowCard", c.id); return c;
};

// ---- table instance (T = { cols: [[label, width, isNumber]], rows: [[cells]] }) — rows in the slot, never an N-rows component
const clearSlot = (i) => { const s = i.findOne(x => x.type === "SLOT"); for (const ch of [].concat(s.children)) ch.remove(); return s; };
const tableInst = async (T, n, mobile) => {
  const set = await getL("afTable");
  const i = set.children.find(v => v.name === "Breakpoint=" + (mobile ? "Mobile" : "Desktop")).createInstance();
  figma.currentPage.appendChild(i); const slot = clearSlot(i);
  if (!mobile) {
    const hr = await AL("Header row", "HORIZONTAL"); slot.appendChild(hr);
    for (let j = 0; j < T.cols.length; j++) { const col = T.cols[j]; const h = await headCell(col[0], col[1], col[2], j === 0); hr.appendChild(h); h.layoutSizingVertical = "FILL"; }
    for (let r = 0; r < n; r++) {
      const row = await AL("Row " + (r + 1), "HORIZONTAL"); slot.appendChild(row);
      for (let j = 0; j < T.cols.length; j++) { const col = T.cols[j]; const ce = await bodyCell(T.rows[r][j], col[1], col[2], j === 0, r === n - 1); row.appendChild(ce); ce.layoutSizingVertical = "FILL"; }
    }
  } else {
    const card = await ensureRowCard();
    for (let r = 0; r < n; r++) {
      const ci = card.createInstance(); ci.name = "Row card " + (r + 1); slot.appendChild(ci); ci.layoutSizingHorizontal = "FILL";
      setP(ci, { "Title label": T.cols[0][0], "Title value": T.rows[r][0] });
      const lines = ci.children.filter(x => x.name.indexOf("Line ") === 0);
      for (let k = 0; k < lines.length; k++) { if (k + 1 < T.cols.length) setP(lines[k], { Label: T.cols[k + 1][0], Value: T.rows[r][k + 1] }); else lines[k].visible = false; }
    }
  }
  return i;
};

// modal-name-expand-end-v1 (2026-10-23): the subtitle toggle sits at the END of the name — collapsed desktop: right after
// the ellipsis; collapsed phones: own line under the 2 clamped lines; expanded: first lines (TEXT „Act name”) + a „Last line”
// row (TEXT „Last line” · 4 · „Mai puțin”). The variant carries the layout; splitName measures where the text wraps at the
// Name width (Chrome keeps the toggle with the last word: if it does not fit, the last word moves down with it).
const subtitleVariant = (set, D, mobile) => set.children.find(v => v.name === "Breakpoint=" + (mobile ? "Mobile" : "Desktop") + ", Subtitle=" + (!D.clamp ? "Plain" : D.clamp === "true" ? "Expanded" : "Collapsed"));
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
const setSubtitle = async (ci, D) => {
  if (D.clamp === "true") { const s = await splitName(ci, D.name); setP(ci, { "Act name": s.first || " ", "Last line": s.last }); if (!s.first) ci.findOne(x => x.type === "TEXT" && x.name === "Name").visible = false; }
  else setP(ci, { "Act name": D.name });
};

// ---- the data modal content: consolidated component + the state's section cards in its Sections slot
const TONE = { success: "Success", warning: "Warning", neutral: "Neutral", danger: "Danger", info: "Info" };
const fillContent = async (ci, D, mobile, TABLES) => {
  const set = await getL("dmContent");
  ci.swapComponent(subtitleVariant(set, D, mobile)); ci.name = "Data modal content";
  await setSubtitle(ci, D);
  const slot = clearSlot(ci);
  const stl = await getL("secTitle"), rows = await getL("detRow"), tags = await getL("tag");
  for (const se of D.sections) {
    const box = await AL("Section · " + se.title, "VERTICAL", { pad: [0, 0, 16, 0] }); slot.appendChild(box); box.layoutSizingHorizontal = "FILL";
    const ti = stl.createInstance(); put(box, ti, { fillW: true }); setP(ti, { Title: se.title });
    if (mobile) { const tt = ti.findOne(x => x.type === "TEXT" && x.name === "Title"); const st = await L.ts("mh5"); await figma.loadFontAsync(tt.fontName); await figma.loadFontAsync(st.fontName); await tt.setTextStyleIdAsync(st.id); } // phone section heading = Mobile H5
    const card = await AL("Card", "VERTICAL", { pad: [8, 20, 8, 20], r: mobile ? 16 : 24, fill: "background/base/secondary" }); put(box, card, { fillW: true });
    const items = se.items;
    for (let i = 0; i < items.length; i++) {
      const r = items[i]; const last = i === items.length - 1;
      if (r.table) {
        const tf = await AL("Table field · " + r.table, "VERTICAL", { gap: 8, pad: [8, 0, 8, 0] }); put(card, tf, { fillW: true });
        if (!last) await sideStroke(tf, 0, 0, 1, 0);
        const lt = await TX(r.table, "small", "text/base/secondary", { name: "Label" }); put(tf, lt, { fillW: true }); lt.textAutoResize = "HEIGHT";
        const ti2 = await tableInst(TABLES[r.table], r.n, mobile); ti2.name = "Table · " + r.table; put(tf, ti2, { fillW: true });
        if (r.toggle) { const tw = await AL("Toggle", "HORIZONTAL"); put(tf, tw, { fillW: true }); const b = await inst("btnTC", { Style: "Primary", Icon: "None", Size: "Small", State: "Default" }); setP(b, { Label: r.toggle }); b.name = r.toggle; tw.appendChild(b); }
        continue;
      }
      if (r.toggle) { const tw = await AL("Toggle", "HORIZONTAL", { pad: [8, 0, 8, 0] }); put(card, tw, { fillW: true }); const b = await inst("btnTC", { Style: "Primary", Icon: "None", Size: "Small", State: "Default" }); setP(b, { Label: r.toggle }); b.name = r.toggle; tw.appendChild(b); continue; }
      const tagged = r.tag && r.tag.length; const kind = r.copy ? "Copy" : tagged ? "Tag" : "Text";
      const v = rows.children.find(x => x.name === "Breakpoint=" + (mobile ? "Mobile" : "Desktop") + ", Value=" + kind + ", Divider=" + (last ? "Off" : "On"));
      const ri = v.createInstance(); ri.name = "Row · " + r.label; put(card, ri, { fillW: true });
      const val = Array.isArray(r.value) ? r.value.join("\n") : r.value;
      setP(ri, { Label: r.label, Value: val, "Tacit badge": false });
      if (Array.isArray(r.value)) { const vt = ri.findOne(x => x.type === "TEXT" && x.name === "Value text"); if (vt) { await figma.loadFontAsync(vt.fontName); vt.paragraphSpacing = 4; } }
      if (r.top && !mobile) ri.counterAxisAlignItems = "MIN";
      if (r.copy) setP(ri.findOne(x => x.type === "INSTANCE" && x.name === "Copy"), { Value: r.value, "Show icon": true });
      if (tagged) { const tg = ri.findOne(x => x.type === "INSTANCE" && x.name === "Status"); tg.swapComponent(tags.children.find(x => x.name === "Tone=" + (TONE[r.tag[0][1]] || "Neutral"))); setP(tg, { Label: r.tag[0][0] }); }
    }
  }
  const note = ci.findOne(x => x.type === "INSTANCE" && x.name === "Read-only note"); if (note && D.note) setP(note, { Text: D.note });
  return ci;
};

// ---- A4 grid rows
const ensureGridLabel = async () => {
  const set = await getL("a4row");
  let v = set.children.find(x => x.name === "Kind=Grid label"); if (v) return v;
  const c = figma.createComponent(); c.name = "Kind=Grid label"; c.layoutMode = "HORIZONTAL"; c.primaryAxisSizingMode = "FIXED"; c.counterAxisSizingMode = "AUTO"; c.resize(674, 33); c.counterAxisSizingMode = "AUTO"; c.fills = [];
  const f = await AL("Label cell", "HORIZONTAL", { pad: [6, 8, 6, 8] }); c.appendChild(f); f.layoutSizingHorizontal = "FILL"; f.layoutSizingVertical = "FILL"; await sideStroke(f, 0, 1, 1, 0);
  const t = await TX("Substanțe autorizate", "small", "text/base/secondary", { name: "Label" }); put(f, t, { fillW: true }); t.textAutoResize = "HEIGHT";
  set.appendChild(c);
  const pl = Object.keys(set.componentPropertyDefinitions).find(k => k.indexOf("Label#") === 0);
  t.componentPropertyReferences = { characters: pl };
  set.description = (set.description || "") + " Kind=Grid label (2026-10-19) = the label row of a configured grid (.e-permits-doc-page__grid-label, full width, 14/20 secondary).";
  return c;
};
const GW = [184, 122, 122, 123, 123];
const ensureGridRow = async () => {
  const ex = await getAF("gridRow"); if (ex) return ex;
  const comps = [];
  for (const kind of ["Header", "Body"]) {
    const c = figma.createComponent(); c.name = "Kind=" + kind; sec.appendChild(c);
    c.layoutMode = "HORIZONTAL"; c.primaryAxisSizingMode = "FIXED"; c.counterAxisSizingMode = "AUTO"; c.resize(674, 33); c.counterAxisSizingMode = "AUTO"; c.fills = [];
    for (let j = 0; j < 5; j++) {
      const f = await AL("Cell " + (j + 1), "HORIZONTAL", { pad: [6, 8, 6, 8] }); c.appendChild(f); f.resize(GW[j], 20); f.primaryAxisSizingMode = "FIXED"; f.layoutSizingVertical = "FILL";
      await sideStroke(f, 0, 1, 1, 0); if (kind === "Header") await fillV(f, "background/base/secondary");
      const t = await TX(kind === "Header" ? "Coloana " + (j + 1) : "Valoare", kind === "Header" ? "cap500" : "small", "text/base/default", { name: "C" + (j + 1) }); put(f, t, { fillW: true }); t.textAutoResize = "HEIGHT";
      if (j >= 3) t.textAlignHorizontal = "RIGHT";
    }
    comps.push(c);
  }
  const set = figma.combineAsVariants(comps, sec); set.name = "A4 act page · grid row"; set.layoutMode = "VERTICAL"; set.itemSpacing = 16; await pad(set, 16); set.primaryAxisSizingMode = "AUTO"; set.counterAxisSizingMode = "AUTO"; set.x = 1500; set.y = Y0;
  const ids = []; for (let j = 0; j < 5; j++) ids.push(set.addComponentProperty("C" + (j + 1), "TEXT", "Valoare"));
  for (const v of set.children) for (let j = 0; j < 5; j++) { const t = v.findOne(n => n.type === "TEXT" && n.name === "C" + (j + 1)); t.componentPropertyReferences = { characters: ids[j] }; }
  set.description = "A row of a configured grid on the MDocs A4 act page (.e-permits-doc-page__grid, 2026-10-19): each data row is a one-row bordered table with the same column units (first column 3, the others 2 → 184 · 122 · 122 · 123 · 123 of 674), so the grid breaks across pages; Header = 12/16 on background/base/secondary (code 600 → Caption/Medium 500, no 12 semibold style), Body = 14/20; columns 4–5 = numbers, right-aligned. The header row repeats on a continuation page.";
  saveAF("gridRow", set.id); return set;
};

// ---- A4 page instance with grids (rows of kind gridLabel / grid; values with \n = list lines) — one consolidated page
const WM = { SUSPENDAT: "Suspended", RETRAS: "Withdrawn" };
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
  const rowSet = await getL("a4row"); await ensureGridLabel(); const gset = await ensureGridRow();
  const tb = clearSlot(NP);
  for (const r of P.rows) {
    if (Array.isArray(r)) { const i = rowSet.children.find(v => v.name === "Kind=Field").createInstance(); put(tb, i, { fillW: true }); setP(i, { Label: r[0], Value: r[1] }); if (r[1].indexOf("\n") > -1) { const vt = i.findOne(x => x.type === "TEXT" && x.name === "Value"); if (vt) { await figma.loadFontAsync(vt.fontName); vt.paragraphSpacing = 0; } } continue; }
    if (r.group) { const i = rowSet.children.find(v => v.name === "Kind=Group").createInstance(); put(tb, i, { fillW: true }); setP(i, { Label: r.group }); continue; }
    if (r.gridLabel) { const i = rowSet.children.find(v => v.name === "Kind=Grid label").createInstance(); i.name = "Grid label · " + r.gridLabel; put(tb, i, { fillW: true }); setP(i, { Label: r.gridLabel }); continue; }
    if (r.grid) { const i = gset.children.find(v => v.name === "Kind=" + (r.head ? "Header" : "Body")).createInstance(); i.name = (r.head ? (r.repeat ? "Grid header (repeated)" : "Grid header") : "Grid row · " + r.grid[0].slice(0, 24)); put(tb, i, { fillW: true }); const o = {}; for (let j = 0; j < 5; j++) o["C" + (j + 1)] = r.grid[j]; setP(i, o); continue; }
  }
  if (scale && scale !== 1) NP.rescale(scale); // after the slot is filled
  return NP;
};

// ---- doc canvas: the Document modal's canvas instance → „RAP / Document / Doc canvas” Pages, pages in its slot
const fillCanvas = async (cc, pages, mobile, offsets) => {
  const set = await getL("canvas"); const W = mobile ? 359 : 624;
  cc.swapComponent(set.children.find(v => v.name === "Breakpoint=" + (mobile ? "Mobile" : "Desktop") + ", State=Pages")); cc.name = "Canvas content";
  const slot = clearSlot(cc);
  const made = []; for (let k = 0; k < pages.length; k++) { const p = await a4Inst(pages[k], W / 794); p.name = "A4 page " + (k + 1) + "/" + pages.length; made.push(p); }
  if (!offsets) { for (const p of made) slot.appendChild(p); return cc; }
  // scrolled view (scrollTop of the demo state): a fixed clipped viewport holding the absolute pages
  const vpf = figma.createFrame(); vpf.name = "Viewport (scrolled)"; vpf.fills = []; vpf.clipsContent = true; vpf.resize(W, mobile ? 612 : 531); slot.appendChild(vpf);
  for (let k = 0; k < made.length; k++) { vpf.appendChild(made[k]); made[k].x = 0; made[k].y = offsets[k]; }
  return cc;
};
return { tableInst, fillContent, ensureRowCard, ensureCardLine, ensureGridRow, ensureGridLabel, a4Inst, fillCanvas, splitName, AFID, saveAF, getAF, sec, Y0 };
