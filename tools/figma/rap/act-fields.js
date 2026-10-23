// RAP board — configured act fields: groups + tables (2026-10-19, code 135c5d05, Figma comment 1968940910).
// Stored as "rap"/"af" in figma.root shared plugin data; body of an async function receiving L (the "rap"/"lib" prelude).
// NO template literals in this file (it is stored through a String.raw literal).
// - tableComp(label, T, n, mobile): local component „Act fields table · <label> · Desktop|Mobile · <n> rows”
//   Desktop = white box (1px border, r12, clip = the code's own sideways scroll) > Table: header row of library
//   table-header (658ba90a, Subtle, overridden to the BO registry th: 38, 8/12, 12/16 medium secondary on
//   background/base/secondary) + body rows of library table-cell (86cc7c40, Text; 8/12, min 50, 14/20 secondary,
//   numbers right-aligned, first column pinned = right divider, last row no divider).
//   Mobile = stacked „Act fields / Row card” instances (first cell = label over value, then label | value lines).
// - fillContent(C, D, mobile, T): (re)builds a „Data modal content · <state> · <bp>” component IN PLACE (same id).
// - a4 grid: „A4 act page · row” gets Kind=Grid label; „A4 act page · grid row” (Kind Header / Body, 5 columns
//   3·2·2·2·2 units, columns 4–5 numbers); a4PageG(P, name, x, y) = the stored a4Page + grid rows + list values.
// - docCanvas(id, pages, mobile, offsets): „Doc canvas · <id> · <bp>” (offsets = scrolled view: fixed + absolute pages).
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

// ---- table component (T = { cols: [[label, width, isNumber]], rows: [[cells]] })
const tableComp = async (label, T, n, mobile) => {
  const key = "tbl:" + label + ":" + (mobile ? "M" : "D") + ":" + n;
  const ex = await getAF(key); if (ex) return ex;
  const idx = Object.keys(AFID).filter(k => k.indexOf("tbl:") === 0).length;
  const c = figma.createComponent(); sec.appendChild(c); c.name = "Act fields table · " + label + " · " + (mobile ? "Mobile" : "Desktop") + " · " + n + " rows";
  c.x = mobile ? 2600 + 400 * idx : 800 + 0 * idx; c.y = mobile ? Y0 : Y0 + 700 * idx;
  c.layoutMode = "VERTICAL"; c.counterAxisSizingMode = "FIXED"; c.resize(mobile ? 258 : 510, 100); c.primaryAxisSizingMode = "AUTO";
  if (!mobile) {
    c.x = 800; await fillV(c, "background/base/default"); await sideStroke(c, 1, 1, 1, 1); await rad(c, 12); c.strokesIncludedInLayout = true; c.clipsContent = true;
    const tb = await AL("Table", "VERTICAL"); c.appendChild(tb);
    const hr = await AL("Header row", "HORIZONTAL"); tb.appendChild(hr);
    for (let j = 0; j < T.cols.length; j++) { const col = T.cols[j]; const h = await headCell(col[0], col[1], col[2], j === 0); hr.appendChild(h); h.layoutSizingVertical = "FILL"; }
    for (let r = 0; r < n; r++) {
      const row = await AL("Row " + (r + 1), "HORIZONTAL"); tb.appendChild(row);
      for (let j = 0; j < T.cols.length; j++) { const col = T.cols[j]; const ce = await bodyCell(T.rows[r][j], col[1], col[2], j === 0, r === n - 1); row.appendChild(ce); ce.layoutSizingVertical = "FILL"; }
    }
    c.description = "Configured act table „" + label + "” (" + n + " rows) as the code's .e-permits-act-fields__table-wrap: white box, 1 px border, r12, its own sideways scroll (clip = the scrolled-out columns). Header = library table-header, cells = library table-cell, with the BO registry overrides (th 38 · 8/12 · 12/16 medium secondary; td min 50 · 8/12 · 14/20 secondary; numbers right; first column pinned with a divider; long headers wrap at 160).";
  } else {
    c.fills = []; await sp(c, "itemSpacing", 8);
    const card = await ensureRowCard();
    for (let r = 0; r < n; r++) {
      const ci = card.createInstance(); ci.name = "Row card " + (r + 1); put(c, ci, { fillW: true });
      setP(ci, { "Title label": T.cols[0][0], "Title value": T.rows[r][0] });
      const lines = ci.children.filter(x => x.name.indexOf("Line ") === 0);
      for (let k = 0; k < lines.length; k++) { if (k + 1 < T.cols.length) setP(lines[k], { Label: T.cols[k + 1][0], Value: T.rows[r][k + 1] }); else lines[k].visible = false; }
    }
    c.description = "Configured act table „" + label + "” (" + n + " rows) on phones (≤ 760): stacked „Act fields / Row card” mini-cards, 8 apart.";
  }
  saveAF(key, c.id); return c;
};

// modal-name-expand-end-v1 (2026-10-23): the subtitle toggle sits at the END of the name — collapsed desktop: right
// after the ellipsis (1 line, gap 4); collapsed phones: own line under the 2 clamped lines (gap 2); expanded: the name's
// first lines + a „Last line” row (last-line words · 4 · toggle), split where the text wraps at the frame's width
// (Chrome keeps the toggle with the last word: if it does not fit, the last word moves down with it).
const nameEnd = async (nmw, nm, more, expanded, mobile) => {
  await figma.loadFontAsync(nm.fontName);
  const row0 = nmw.children.find(c => c.name === "Last line");
  if (row0) { const lt = row0.children.find(c => c.type === "TEXT"); nm.characters = nm.characters + " " + lt.characters; nmw.appendChild(more); row0.remove(); nm.visible = true; }
  nmw.layoutWrap = "NO_WRAP";
  if (!expanded) {
    nmw.layoutMode = mobile ? "VERTICAL" : "HORIZONTAL"; nmw.itemSpacing = mobile ? 2 : 4;
    nmw.counterAxisAlignItems = mobile ? "MIN" : "CENTER"; nmw.layoutSizingHorizontal = "FILL"; nmw.layoutSizingVertical = "HUG";
    nm.layoutSizingHorizontal = "FILL"; nm.textAutoResize = "HEIGHT"; nm.layoutSizingVertical = "HUG";
    nm.textTruncation = "ENDING"; nm.maxLines = mobile ? 2 : 1; // order: auto-resize → truncation → maxLines
    more.layoutSizingHorizontal = "HUG"; more.layoutSizingVertical = "HUG";
    return { lines: mobile ? 2 : 1 };
  }
  nmw.layoutMode = "VERTICAL"; nmw.itemSpacing = 0; nmw.counterAxisAlignItems = "MIN";
  nmw.layoutSizingHorizontal = "FILL"; nmw.layoutSizingVertical = "HUG";
  nm.layoutSizingHorizontal = "FILL"; nm.textAutoResize = "HEIGHT"; nm.layoutSizingVertical = "HUG";
  nm.textTruncation = "DISABLED"; nm.maxLines = null;
  const W = nmw.width, full = nm.characters, words = full.split(" ");
  const pr = nm.clone(); figma.currentPage.appendChild(pr); pr.textTruncation = "DISABLED"; pr.maxLines = null; pr.resize(W, 20); pr.textAutoResize = "HEIGHT"; // resize() makes it FIXED — auto-resize after
  const lh = (s) => { pr.characters = s; return pr.height; };
  const H = lh(full), line = lh(words[0]), L = Math.round(H / line);
  let k = 0;
  if (L > 1) { let lo = 1, hi = words.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (lh(words.slice(0, mid + 1).join(" ")) > (L - 1) * line + 1) hi = mid; else lo = mid + 1; } k = lo; }
  pr.textAutoResize = "WIDTH_AND_HEIGHT"; pr.characters = words.slice(k).join(" ");
  if (pr.width + 4 + more.width > W) k = words.length - 1;
  pr.remove();
  const row = figma.createFrame(); row.name = "Last line"; row.fills = []; row.clipsContent = false;
  row.layoutMode = "HORIZONTAL"; row.itemSpacing = 4; row.counterAxisAlignItems = "CENTER";
  nmw.appendChild(row); row.layoutSizingHorizontal = "HUG"; row.layoutSizingVertical = "HUG";
  const lt = nm.clone(); lt.name = "Name · last line"; row.appendChild(lt); lt.characters = words.slice(k).join(" "); lt.textAutoResize = "WIDTH_AND_HEIGHT"; lt.layoutSizingHorizontal = "HUG";
  row.appendChild(more); more.layoutSizingHorizontal = "HUG"; more.layoutSizingVertical = "HUG";
  if (k > 0) nm.characters = words.slice(0, k).join(" "); else nm.visible = false;
  return { lines: L, k, last: lt.characters };
};
// tokens for the gaps nameEnd sets (4 = name end padding, 2 = phone stack, 0 = expanded lines)
const nameEndTokens = async nmw => { await sp(nmw, "itemSpacing", nmw.itemSpacing); const row = nmw.children.find(c => c.name === "Last line"); if (row) await sp(row, "itemSpacing", 4); };

// ---- the data modal content, rebuilt in place
const TONE = { success: "Success", warning: "Warning", neutral: "Neutral", danger: "Danger", info: "Info" };
const fillContent = async (C, D, mobile, TABLES) => {
  for (const ch of [...C.children]) ch.remove();
  const W = mobile ? 338 : 588;
  C.layoutMode = "VERTICAL"; C.counterAxisSizingMode = "FIXED"; C.resize(W, Math.max(C.height, 10)); C.primaryAxisSizingMode = "AUTO"; C.fills = [];
  await pad(C, 4, mobile ? 16 : 20, 24, mobile ? 16 : 20);
  const sub = await AL("Subtitle", mobile ? "VERTICAL" : "HORIZONTAL", { gap: mobile ? 2 : 8, align: mobile ? "MIN" : "CENTER", pad: [0, mobile ? 40 : 32, 8, mobile ? 0 : 12] }); put(C, sub, { fillW: true });
  const nmw = await AL("Act name", "HORIZONTAL", { gap: 4, pad: [0, mobile ? 8 : 12, 0, 0] }); put(sub, nmw, { fillW: true }); // × column: Subtitle pR 32 / 40 (× size) + 12 / 8 clearance
  const nm = await TX(D.name, "small", "text/base/tertiary", { name: "Name" }); put(nmw, nm, { fillW: true });
  nm.textAutoResize = "HEIGHT";
  // toggle at the END of the name (modal-name-expand-end-v1): collapsed desktop after the ellipsis, phones under the
  // 2 clamped lines, expanded right after the last word (split into first lines + „Last line” row) — never next to ×
  if (D.clamp) { const more = await inst("link", { Style: "Primary", Size: "14: Small", State: "Default" }); setP(more, { Link: D.more, Underline: false }); more.name = "Mai mult"; nmw.appendChild(more); await nameEnd(nmw, nm, more, D.clamp === "true", mobile); await nameEndTokens(nmw); }
  const stl = await getL("secTitle"), rows = await getL("detRow"), tags = await getL("tag");
  for (const se of D.sections) {
    const box = await AL("Section · " + se.title, "VERTICAL", { pad: [0, 0, 16, 0] }); put(C, box, { fillW: true });
    const ti = stl.createInstance(); put(box, ti, { fillW: true }); setP(ti, { Title: se.title });
    const card = await AL("Card", "VERTICAL", { pad: [8, 20, 8, 20], r: mobile ? 16 : 24, fill: "background/base/secondary" }); put(box, card, { fillW: true });
    const items = se.items;
    for (let i = 0; i < items.length; i++) {
      const r = items[i]; const last = i === items.length - 1;
      if (r.table) {
        const tf = await AL("Table field · " + r.table, "VERTICAL", { gap: 8, pad: [8, 0, 8, 0] }); put(card, tf, { fillW: true });
        if (!last) await sideStroke(tf, 0, 0, 1, 0);
        const lt = await TX(r.table, "small", "text/base/secondary", { name: "Label" }); put(tf, lt, { fillW: true }); lt.textAutoResize = "HEIGHT";
        const ti2 = (await tableComp(r.table, TABLES[r.table], r.n, mobile)).createInstance(); ti2.name = "Table · " + r.table; put(tf, ti2, { fillW: true });
        if (r.toggle) { const tw = await AL("Toggle", "HORIZONTAL"); put(tf, tw, { fillW: true }); const b = await inst("btnTC", { Style: "Primary", Icon: "None", Size: "Small", State: "Default" }); setP(b, { Label: r.toggle }); b.name = r.toggle; tw.appendChild(b); }
        continue;
      }
      if (r.toggle) { const tw = await AL("Toggle", "HORIZONTAL", { pad: [8, 0, 8, 0] }); put(card, tw, { fillW: true }); const b = await inst("btnTC", { Style: "Primary", Icon: "None", Size: "Small", State: "Default" }); setP(b, { Label: r.toggle }); b.name = r.toggle; tw.appendChild(b); continue; }
      const nextToggle = !last && items[i + 1].toggle && !items[i + 1].table;
      const tagged = r.tag && r.tag.length; const kind = r.copy ? "Copy" : tagged ? "Tag" : "Text";
      const v = rows.children.find(x => x.name === "Breakpoint=" + (mobile ? "Mobile" : "Desktop") + ", Value=" + kind + ", Divider=" + (last ? "Off" : "On"));
      const ri = v.createInstance(); ri.name = "Row · " + r.label; put(card, ri, { fillW: true });
      const val = Array.isArray(r.value) ? r.value.join("\n") : r.value;
      setP(ri, { Label: r.label, Value: val, "Tacit badge": false });
      if (Array.isArray(r.value)) { const vt = ri.findOne(n => n.type === "TEXT" && n.name === "Value text"); if (vt) { await figma.loadFontAsync(vt.fontName); vt.paragraphSpacing = 4; } }
      if (r.top && !mobile) ri.counterAxisAlignItems = "MIN";
      if (r.copy) setP(ri.findOne(n => n.type === "INSTANCE" && n.name === "Copy"), { Value: r.value, "Show icon": true });
      if (tagged) { const tg = ri.findOne(n => n.type === "INSTANCE" && n.name === "Status"); tg.swapComponent(tags.children.find(x => x.name === "Tone=" + (TONE[r.tag[0][1]] || "Neutral"))); setP(tg, { Label: r.tag[0][0] }); }
    }
  }
  const note = (await getL("roNote")).createInstance(); note.name = "Read-only note"; put(C, note, { fillW: true }); setP(note, { Text: D.note });
  C.description = "„Vizualizare act” data modal content (GEAPActView.fieldsHtml, 2026-10-19): subtitle = act name only (clamp + „Mai mult” when long), Date generale, then one BO section per configured group (> 10 items → first 8 + „Arată toate câmpurile (N)”; grids = „Act fields table · …”, > 5 rows → first 5 + „Arată toate (N)”), read-only note. In code the modal body scrolls inside min(90vh); Figma shows the whole content.";
  return C;
};
const newContent = async (name, mobile) => {
  let c = sec.children.find(x => x.name === name && x.type === "COMPONENT");
  if (!c) { c = figma.createComponent(); sec.appendChild(c); c.name = name; c.x = mobile ? 7700 : 7100; c.y = Y0; }
  return c;
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

// ---- A4 page with grids (the stored a4Page + rows of kind gridLabel / grid; values with \n = list lines)
const a4PageG = async (P, name, x, y) => {
  let c = sec.children.find(n => n.name === name && n.type === "COMPONENT");
  if (c) { for (const ch of [...c.children]) ch.remove(); } else { c = figma.createComponent(); sec.appendChild(c); c.name = name; }
  c.x = x; c.y = y;
  c.layoutMode = "VERTICAL"; c.primaryAxisSizingMode = "FIXED"; c.counterAxisSizingMode = "FIXED"; c.resize(794, 1123); await fillV(c, "background/base/default");
  c.paddingTop = 68; c.paddingBottom = 68; c.paddingLeft = 60; c.paddingRight = 60; c.clipsContent = true;
  try { const fx = await figma.importStyleByKeyAsync("31092db557fca92f0a227cb1b1ee8dbaa703e17a"); await c.setEffectStyleIdAsync(fx.id); } catch (e) {}
  const W = 674;
  if (P.cont) { const ct = await AL("Continuation", "VERTICAL", { pad: [0, 0, 8, 0] }); put(c, ct, { fillW: true }); await sideStroke(ct, 0, 0, 1, 0); const t = await TX(P.cont, "cap", "text/base/tertiary"); put(ct, t, { fillW: true }); t.textAutoResize = "HEIGHT"; }
  if (P.authority) {
    const hd = await AL("Head", "VERTICAL", { gap: 2, pad: [0, 0, 16, 0], align: "CENTER" }); put(c, hd, { fillW: true }); await sideStroke(hd, 0, 0, 1, 0);
    const gs = await figma.importComponentSetByKeyAsync("3d0facf597c6961a599c09eb57f2fa8668f32df3"); const arms = variant(gs, { Style: "Blue", Logomark: "False", Language: "Ro" }).createInstance(); arms.name = "Arms"; const aw = await AL("Arms box", "VERTICAL", { pad: [0, 0, 8, 0] }); aw.appendChild(arms); hd.appendChild(aw);
    const ctry = await TX(P.country, "cap", "text/base/tertiary", { name: "Country" }); ctry.textCase = "UPPER"; ctry.letterSpacing = { unit: "PERCENT", value: 8 }; hd.appendChild(ctry);
    hd.appendChild(await TX(P.authority, "mh5", "text/base/default", { name: "Authority" }));
    if (P.office) hd.appendChild(await TX(P.office, "small", "text/base/secondary", { name: "Office" }));
    const h = await AL("Title", "VERTICAL", { gap: 8, pad: [24, 0, 16, 0], align: "CENTER" }); put(c, h, { fillW: true });
    const h1 = await TX(P.h1, "h5", "text/base/default", { name: "Act name", w: W }); h1.textAlignHorizontal = "CENTER"; put(h, h1, { fillW: true });
    const nr = await TX(P.number, "small", "text/base/secondary", { name: "Number" }); nr.textAlignHorizontal = "CENTER"; h.appendChild(nr);
    // odd free space centres a hugging text at .5 → FILL + centre alignment (whole pixels)
    for (const t of [...hd.children.filter(n => n.type === "TEXT"), nr]) { t.layoutSizingHorizontal = "FILL"; t.textAutoResize = "HEIGHT"; t.textAlignHorizontal = "CENTER"; }
  }
  const rowSet = await getL("a4row"); await ensureGridLabel(); const gset = await ensureGridRow();
  const tb = await AL("Table", "VERTICAL"); put(c, tb, { fillW: true }); await sideStroke(tb, 1, 0, 0, 1);
  const tw = await AL("Table margin", "VERTICAL", { pad: [12, 0, 12, 0] }); c.insertChild(c.children.indexOf(tb), tw); put(tw, tb, { fillW: true }); tw.layoutSizingHorizontal = "FILL";
  for (const r of P.rows) {
    if (Array.isArray(r)) { const i = rowSet.children.find(v => v.name === "Kind=Field").createInstance(); put(tb, i, { fillW: true }); setP(i, { Label: r[0], Value: r[1] }); if (r[1].indexOf("\n") > -1) { const vt = i.findOne(n => n.type === "TEXT" && n.name === "Value"); if (vt) { await figma.loadFontAsync(vt.fontName); vt.paragraphSpacing = 0; } } continue; }
    if (r.group) { const i = rowSet.children.find(v => v.name === "Kind=Group").createInstance(); put(tb, i, { fillW: true }); setP(i, { Label: r.group }); continue; }
    if (r.gridLabel) { const i = rowSet.children.find(v => v.name === "Kind=Grid label").createInstance(); i.name = "Grid label · " + r.gridLabel; put(tb, i, { fillW: true }); setP(i, { Label: r.gridLabel }); continue; }
    if (r.grid) { const i = gset.children.find(v => v.name === "Kind=" + (r.head ? "Header" : "Body")).createInstance(); i.name = (r.head ? (r.repeat ? "Grid header (repeated)" : "Grid header") : "Grid row · " + r.grid[0].slice(0, 24)); put(tb, i, { fillW: true }); const o = {}; for (let j = 0; j < 5; j++) o["C" + (j + 1)] = r.grid[j]; setP(i, o); continue; }
  }
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
  const fl = await AL("Footer line", "VERTICAL", { pad: [8, 0, 0, 0] }); put(c, fl, { fillW: true }); await sideStroke(fl, 1, 0, 0, 0);
  const flm = await AL("Footer margin", "VERTICAL", { pad: [16, 0, 0, 0] }); c.insertChild(c.children.indexOf(fl), flm); put(flm, fl, { fillW: true }); flm.layoutSizingHorizontal = "FILL";
  const ftx = await TX(P.footer, "cap", "text/base/tertiary", { name: "Footer" }); ftx.textAlignHorizontal = "CENTER"; put(fl, ftx, { fillW: true }); ftx.textAutoResize = "HEIGHT";
  c.description = "MDocs A4 act page (real size 794 × 1123) with configured groups and grids (2026-10-19): group heading rows, grid = label row + header row + one bordered row per data row (A4 act page · grid row), the header repeated on a continuation page; every row printed (no „Arată toate”).";
  return c;
};

// ---- doc canvas (scaled pages); offsets = [y per page] → fixed scrolled view (clip + absolute pages)
const docCanvas = async (id, pages, mobile, offsets) => {
  const zoomW = mobile ? 311 : 624; const name = "Doc canvas · " + id + " · " + (mobile ? "Mobile" : "Desktop");
  let c = sec.children.find(n => n.name === name && n.type === "COMPONENT");
  if (c) { for (const ch of [...c.children]) ch.remove(); } else { c = figma.createComponent(); sec.appendChild(c); c.name = name; c.x = mobile ? 6500 : 5500; c.y = Y0; }
  c.fills = [];
  if (!offsets) {
    c.layoutMode = "VERTICAL"; c.counterAxisSizingMode = "FIXED"; c.resize(zoomW, 100); c.primaryAxisSizingMode = "AUTO"; await sp(c, "itemSpacing", 24); c.counterAxisAlignItems = "CENTER";
    for (let k = 0; k < pages.length; k++) { const i = pages[k].createInstance(); c.appendChild(i); i.rescale(zoomW / 794); i.name = "A4 page " + (k + 1) + "/" + pages.length; }
  } else {
    // a NONE-layout component keeps the slot's 100 px height override in the modal (resize is ignored on that nested
    // instance) → HUG wrapper + a fixed clipped „Viewport (scrolled)” frame holding the absolute pages
    c.layoutMode = "VERTICAL"; c.counterAxisSizingMode = "FIXED"; c.resize(zoomW, 100); c.primaryAxisSizingMode = "AUTO"; c.clipsContent = false;
    const vpf = figma.createFrame(); vpf.name = "Viewport (scrolled)"; vpf.fills = []; vpf.clipsContent = true; vpf.resize(zoomW, mobile ? 503 : 531); c.appendChild(vpf);
    for (let k = 0; k < pages.length; k++) { const i = pages[k].createInstance(); vpf.appendChild(i); i.rescale(zoomW / 794); i.x = 0; i.y = offsets[k]; i.name = "A4 page " + (k + 1) + "/" + pages.length; }
    c.description = "Scrolled canvas: the pages sit where the code's canvas scroll puts them (scrollTop of the demo state).";
  }
  return c;
};
return { tableComp, fillContent, newContent, ensureRowCard, ensureCardLine, ensureGridRow, ensureGridLabel, a4PageG, docCanvas, AFID, saveAF, getAF, sec, Y0 };
