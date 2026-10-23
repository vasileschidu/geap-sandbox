// RAP board — screen builders (stored in figma.root shared plugin data "rap"/"screens"; body of an async
// function that receives L (the prelude, lib.js) and returns { listScreen, profileScreen, notFoundScreen,
// frameScreen }). Every control = library or local component instance; containers = auto-layout frames
// with token-bound spacing / colours / radii; texts = Foundations text styles.
const { AL, TX, put, fillV, strokeV, pad, sp, rad, inst, setP, getL, variant } = L;
const own = (v, f) => v.findOne(n => !n.id.startsWith("I") && f(n));
const nested = (i, f) => i.findOne(f);
const setText = async (t, s) => { await figma.loadFontAsync(t.fontName); t.characters = s; };
const lines = async (n, side) => { await strokeV(n, "border/base/default"); for (const k of ["Top", "Right", "Bottom", "Left"]) n["stroke" + k + "Weight"] = side.includes(k) ? 1 : 0; n.strokesIncludedInLayout = false; };

// ---- shell: screen frame + header
const frameScreen = async (name, mobile, minH) => {
  const s = await AL(name, "VERTICAL", { fill: "background/base/default" });
  s.resize(mobile ? 375 : 1440, minH); s.counterAxisSizingMode = "FIXED"; s.primaryAxisSizingMode = "AUTO"; s.minHeight = minH;
  s.clipsContent = true; await rad(s, mobile ? 24 : 16);
  await strokeV(s, "border/base/default", 4, "OUTSIDE"); s.strokeWeight = 4;
  if (!mobile) { const h = await inst("hdrD", { Breakpoints: "1248px", "User State": "Anonymous" }); h.name = "header-evo-desktop"; put(s, h, { fillW: true }); }
  else {
    const tmp = await inst("hdrD", { Breakpoints: "1248px", "User State": "Anonymous" });
    const top = tmp.children.find(c => c.type === "INSTANCE"); const set = (await top.getMainComponentAsync()).parent; tmp.remove();
    const g = set.children.find(c => /Mobile/.test(c.name)).createInstance(); g.name = ".top-section (gov bar)"; put(s, g, { fillW: true });
    const h = await inst("hdrM", { State: "Default", "User State": "Anonymous" }); h.name = "header-evo-mobile"; put(s, h, { fillW: true });
    const acts = h.findOne(n => n.name === "Actions" && n.type === "FRAME"); if (acts) acts.visible = false; // code ≤760: logo + „Intră în cabinet” only
    await lines(h, ["Bottom"]);
  }
  return s;
};
const crumbs = async (labels, mobile) => {
  if (mobile) { const c = await inst("crumbs", { Breakpoint: "Mobile" }); c.name = "Breadcrumbs"; const it = c.children.find(x => x.type === "INSTANCE" && x.name === ".breadcrumb-item"); setP(it, { Label: labels[labels.length - 1], Underline: false }); return c; }
  const c = await inst("crumbs", { Breakpoint: "Desktop" }); c.name = "Breadcrumbs";
  const p = {}; for (let i = 1; i <= 5; i++) p["Level " + i] = i <= labels.length; p["Active Level"] = false; setP(c, p);
  for (let i = 0; i < labels.length; i++) { const lv = c.children.find(x => x.name === "Level " + (i + 1)); setP(lv, { Label: labels[i], Underline: false }); }
  return c;
};

// ---- phone bottom sheet over the viewport (812): scrim + library bottom-sheet, content slot = „RAP / Filter / Filter sheet content”
const sheetOverlay = async (s, S) => {
  s.primaryAxisSizingMode = "FIXED"; s.resize(375, 812); s.minHeight = 812;
  const ov = await AL("Overlay · bottom sheet", "VERTICAL", { main: "MAX" }); s.appendChild(ov); ov.layoutPositioning = "ABSOLUTE"; ov.resize(375, 812); ov.primaryAxisSizingMode = "FIXED"; ov.counterAxisSizingMode = "FIXED"; ov.x = 0; ov.y = 0;
  await fillV(ov, "background/alpha/overlay-dark");
  const sheetMain = await figma.importComponentByKeyAsync("8dc0c5b27b4148e09b959ff486cc6b7104e89482");
  const bs = sheetMain.createInstance(); bs.name = "Bottom sheet · " + S.sheet.title; put(ov, bs, { fillW: true });
  setP(bs, { Header: false, "Drag Handle": true, "Action Button": true });
  await rad(bs, 24); bs.bottomLeftRadius = 0; bs.bottomRightRadius = 0; bs.clipsContent = true;
  const slot = bs.findOne(n => n.name === "Content Slot"); await sheetContent(slot, S);
  const act = bs.findOne(n => n.name === "Action Button"); await strokeV(act, "border/base/default"); act.strokeTopWeight = 1; act.strokeBottomWeight = 0; act.strokeLeftWeight = 0; act.strokeRightWeight = 0;
  await pad(act, 16, 16, 16, 16);
  const ab = act.findOne(n => n.type === "INSTANCE"); setP(ab, { Label: S.sheet.apply });
  return ov;
};
// rap-components-cleanup-v1 (2026-10-23): no „Filter sheet content · <state>” components — the bottom sheet's Content Slot is
// swapped to „RAP / Filter / Filter sheet content” (ids „fSheet”: Title, exposed Resetează / Close, Facets slot) and the
// state's facets are „RAP / Filter / Filter section” instances (ids „fSection”: State Closed / Open × Divider On / Off,
// Label / Summary / Show summary, Panel slot = search + options) in that slot.
const sheetContent = async (cs, S) => {
  cs.swapComponent(await getL("fSheet")); cs.name = "Content Slot";
  setP(cs, { Title: S.sheet.title });
  setP(cs.findOne(n => n.type === "INSTANCE" && n.name === "Resetează"), { Label: S.sheet.reset });
  const clear = (i) => { const sl = i.findOne(n => n.type === "SLOT"); for (const ch of [].concat(sl.children)) ch.remove(); return sl; };
  const facets = clear(cs);
  const opts = (await getL("facetOpt")); const tags = await getL("tag"); const secSet = await getL("fSection");
  const TONE = { success: "Success", warning: "Warning", neutral: "Neutral", danger: "Danger", info: "Info" };
  const optionRows = async (host, options) => { const list = await AL("Options", "VERTICAL", { pad: [0, 8, 0, 8] }); host.appendChild(list); list.layoutSizingHorizontal = "FILL";
    for (const o of options) { const v = opts.children.find(x => x.name === "Content=" + (o.tone ? "Tag" : "Text") + ", State=Default, Size=Touch"); const i = v.createInstance(); i.name = "Option · " + o.v; put(list, i, { fillW: true });
      setP(nested(i, n => n.type === "INSTANCE" && n.name === "Checkbox"), { Mode: o.checked ? "Checked" : "Unchecked" });
      if (o.tone) { const tg = nested(i, n => n.type === "INSTANCE" && n.name === "Status"); tg.swapComponent(tags.children.find(x => x.name === "Tone=" + (TONE[o.tone] || "Neutral"))); setP(tg, { Label: o.v }); } else setP(i, { Value: o.v }); }
    return list; };
  const searchRow = async (host) => { const sw = await AL("Search", "VERTICAL", { pad: [4, 16, 8, 16] }); host.appendChild(sw); sw.layoutSizingHorizontal = "FILL"; const se = await inst("search", { State: S.sheet.search.value ? "Filled" : "Default", Size: "Medium", Button: "False" }); setP(se, { "Clear Button": !!S.sheet.search.value, Placeholder: S.sheet.search.value || S.sheet.search.placeholder }); put(sw, se, { fillW: true }); };
  if (S.sheet.sections && S.sheet.sections.length) {
    for (let k = 0; k < S.sheet.sections.length; k++) { const se = S.sheet.sections[k];
      const i = secSet.children.find(v => v.name === "State=" + (se.open ? "Open" : "Closed") + ", Divider=" + (k ? "On" : "Off")).createInstance(); i.name = "Section · " + se.label;
      facets.appendChild(i); i.layoutSizingHorizontal = "FILL";
      setP(i, { Label: se.label, Summary: se.summary || "", "Show summary": !!se.summary });
      if (se.open) { const pn = clear(i); if (S.sheet.search) await searchRow(pn); await optionRows(pn, S.sheet.options); }
    }
  } else {
    if (S.sheet.search) await searchRow(facets);
    await optionRows(facets, S.sheet.options);
  }
  return cs;
};

// ---- list
const listScreen = async (S, mobile) => {
  const s = await frameScreen((mobile ? "Mobile · " : "Desktop · ") + S.id, mobile, mobile ? 812 : 900);
  const phone = mobile && S.bar && S.bar.sheets;
  const main = await AL("Main", "VERTICAL", { gap: phone ? 0 : 16, pad: mobile ? [24, 0, 24, 0] : [32, 80, 32, 80] }); put(s, main, { fillW: true });
  const inset = mobile ? await AL("Content inset", "VERTICAL", { gap: 16, pad: [0, 16, 0, 16] }) : main; if (mobile) put(main, inset, { fillW: true });
  inset.appendChild(await crumbs(["Acasă", "Resurse utile"], mobile));
  const intro = await AL("Intro", "VERTICAL", { gap: 6 }); put(inset, intro, { fillW: true }); if (!mobile) intro.maxWidth = 756;
  const h1 = await TX(S.h1, mobile ? "mh2" : "h2", "text/base/default", { name: "Title" }); put(intro, h1, { fillW: true }); h1.textAutoResize = "HEIGHT";
  const sub = await TX(S.sub, "small", "text/base/tertiary", { name: "Subtitle" }); put(intro, sub, { fillW: true }); sub.textAutoResize = "HEIGHT";
  // toolbar
  const tb = await AL("Toolbar", "HORIZONTAL", { gap: mobile ? 8 : 16, align: "CENTER" }); put(inset, tb, { fillW: true });
  const se = await inst("search", { State: S.search.value ? "Filled" : "Default", Size: "Medium", Button: "False" }); se.name = "Search";
  setP(se, { "Clear Button": !!S.search.value, Placeholder: S.search.value || S.search.placeholder }); tb.appendChild(se);
  if (mobile) se.layoutSizingHorizontal = "FILL"; else se.resize(387, se.height);
  let fb = null;
  if (!S.filter.hidden) { const fbSet = await getL("filterBtn");
  fb = fbSet.children.find(c => c.name === `Type=${mobile ? "Icon only" : "Label"}, State=${S.filter.expanded ? "Open" : "Default"}, Count=${S.filter.count ? "On" : "Off"}`).createInstance(); fb.name = "Filtru"; tb.appendChild(fb);
  if (S.filter.count) { const cnt = nested(fb, n => n.type === "INSTANCE" && n.name === "Count"); setP(cnt, { "Counter Value": String(S.filter.count) }); } }
  // facet bar
  let chipNodes = {};
  const chip = async (ch) => {
    const c = await inst("chip", { State: ch.sel ? "Selected" : "Unselected", Type: "Mono Selection", Icon: ch.all ? "Leading" : "Trailing" }); c.name = "Chip · " + ch.label;
    setP(c, { Label: ch.label, "Counter Badge": !!ch.n });
    if (ch.n) { const bl = nested(c, n => n.name === "Badge label" && n.type === "TEXT"); if (bl) await setText(bl, ch.n); }
    if (ch.all) { const ic = c.children.find(n => n.type === "INSTANCE" && n.name !== "numbered-badge" && n.name !== "notification-badge"); if (ic) { const g = await figma.importComponentByKeyAsync("7b2354831ab59c47c20f73c7e60b3e601c1460fb"); const keep = ic.findOne(x => x.type === "VECTOR"); const p = keep ? JSON.parse(JSON.stringify(keep.fills)) : null; ic.swapComponent(g); ic.resize(20, 20); if (p) for (const v of ic.findAll(x => x.type === "VECTOR")) { v.fills = p; } } }
    if (ch.open && L.KI.chevT20) { const cv = nested(c, n => n.type === "INSTANCE" && /chevron-bottom/.test(n.name)); if (cv) cv.swapComponent(await L.icon("chevT20")); }
    chipNodes[ch.label] = c; return c;
  };
  if (S.bar && S.bar.sheets) {
    const fr = await AL("Filter chips (phone)", "VERTICAL", { gap: 4, pad: [12, 0, 4, 0] }); put(main, fr, { fillW: true });
    const sc = await AL("Chip row · horizontal scroll", "HORIZONTAL", { pad: [0, 0, 0, 16] }); put(fr, sc, { fillW: true }); sc.clipsContent = true; sc.counterAxisSizingMode = "AUTO";
    const row = await AL("Chips", "HORIZONTAL", { gap: 8, align: "CENTER" }); sc.appendChild(row);
    for (const ch of S.bar.chips) row.appendChild(await chip(ch));
    if (S.bar.meta.length) { const meta = await AL("Meta", "HORIZONTAL", { gap: 8, align: "CENTER", pad: [0, 16, 0, 16] }); meta.minHeight = 32; put(fr, meta, { fillW: true });
      for (const m of S.bar.meta) { if (m.k === "text-span") meta.appendChild(await TX(m.t, "small", "text/base/tertiary", { name: "Meta text" })); else { const b = await inst("btnTC", { Style: "Strict", Icon: "None", Size: "Small", State: "Default" }); setP(b, { Label: m.t }); b.name = m.t; meta.appendChild(b); } } }
  } else if (S.bar) {
    const bar = await AL("Facet filter bar", mobile ? "VERTICAL" : "HORIZONTAL", { gap: 12, pad: [12, 16, 12, 16], r: 12, fill: "background/base/default" });
    await strokeV(bar, "border/base/default"); bar.strokesIncludedInLayout = false; put(inset, bar, { fillW: true });
    if (!mobile) { bar.primaryAxisAlignItems = "SPACE_BETWEEN"; bar.counterAxisAlignItems = "MIN"; }
    const chips = await AL("Chips", "HORIZONTAL", { gap: 8, align: "CENTER" }); chips.layoutWrap = "WRAP"; chips.counterAxisSpacing = 8; bar.appendChild(chips);
    if (mobile) chips.layoutSizingHorizontal = "FILL";
    for (const ch of S.bar.chips) chips.appendChild(await chip(ch));
    const meta = await AL("Meta", "HORIZONTAL", { gap: 8, align: "CENTER" }); meta.minHeight = 40; bar.appendChild(meta);
    for (const m of S.bar.meta) {
      if (m.k === "text-span") meta.appendChild(await TX(m.t, "small", "text/base/tertiary", { name: "Meta text" }));
      else { const b = await inst("btnTC", { Style: "Strict", Icon: "None", Size: "Small", State: "Default" }); setP(b, { Label: m.t }); b.name = m.t; meta.appendChild(b); }
    }
  }
  // company summary (two grey cards)
  if (S.company) {
    const csHost = mobile ? await AL("Company inset", "VERTICAL", { pad: [S.bar && S.bar.sheets ? 16 : 0, 16, 0, 16] }) : inset; if (mobile) put(main, csHost, { fillW: true });
    const cs = await AL("Company summary", mobile ? "VERTICAL" : "HORIZONTAL", { gap: 8 }); put(csHost, cs, { fillW: true });
    const card = await AL("Company", "HORIZONTAL", { gap: 16, align: "CENTER", pad: mobile ? [16, 16, 16, 16] : [16, 24, 16, 16], r: mobile ? 16 : 24, fill: "background/base/secondary" }); put(cs, card, { fillW: true }); card.minHeight = 50;
    if (!mobile) card.layoutGrow = 1;
    const av = (await getL("avatar")).children.find(c => c.name === "Type=Company, Size=40").createInstance(); av.name = "Avatar"; card.appendChild(av);
    const idn = await AL("Identity", "VERTICAL", { gap: 6 }); put(card, idn, { fillW: true });
    const nm = await TX(S.company.name, "body500", "text/base/default", { name: "Name" }); put(idn, nm, { fillW: true }); nm.textTruncation = "ENDING"; nm.maxLines = 1; nm.layoutSizingVertical = "HUG";
    const idr = await AL("Identifier row", "HORIZONTAL", { gap: 4, align: "CENTER" }); idn.appendChild(idr);
    idr.appendChild(await TX(S.company.idType, "small", "text/base/secondary", { name: "Identifier type" }));
    const cp = (await getL("copy")).children.find(c => c.name === "Kind=Profile").createInstance(); setP(cp, { Value: S.company.id, "Show icon": false }); cp.name = "Identifier"; idr.appendChild(cp);
    const mt = await AL("Metrics", "HORIZONTAL", { gap: mobile ? 16 : 32, align: "CENTER", pad: mobile ? [16, 16, 16, 16] : [16, 24, 16, 24], r: mobile ? 16 : 24, fill: "background/base/secondary" }); put(cs, mt, mobile ? { fillW: true } : {});
    if (mobile) mt.primaryAxisAlignItems = "SPACE_BETWEEN";
    const tones = ["text/base/default", "text/positive/default", "text/warning/default"];
    for (let i = 0; i < S.company.metrics.length; i++) {
      const [n, l] = S.company.metrics[i];
      const m = await AL("Metric · " + l, "VERTICAL", { gap: 2, align: "CENTER" }); m.minWidth = 41; mt.appendChild(m);
      m.appendChild(await TX(n, "h5", tones[i], { name: "Value" }));
      m.appendChild(await TX(l, "small", "text/base/tertiary", { name: "Label" }));
    }
  }
  // register / empty
  let rowsOut = [];
  if (S.rows && S.rows.length) {
    const reg = await AL("Register", "VERTICAL", { pad: [mobile && S.bar && S.bar.sheets ? 16 : 0, 0, 0, 0] }); put(main, reg, { fillW: true });
    const sc = await AL(mobile ? "Table · horizontal scroll" : "Table", "VERTICAL", { fill: "background/base/default" });
    put(reg, sc, { fillW: true }); sc.clipsContent = true;
    if (mobile) await lines(sc, ["Top", "Bottom"]); else { await strokeV(sc, "border/base/default"); sc.strokesIncludedInLayout = false; await rad(sc, 12); }
    const th = (await getL("thead")).children.find(c => c.name === "Breakpoint=" + (mobile ? "Mobile" : "Desktop")).createInstance(); th.name = "Head row"; sc.appendChild(th);
    const rowSet = await getL("trow"); const avSet = await getL("avatar"); const tagSet = await getL("tag");
    const TONE = { success: "Success", warning: "Warning", neutral: "Neutral", danger: "Danger", info: "Info" };
    for (let i = 0; i < S.rows.length; i++) {
      const r = S.rows[i]; const last = i === S.rows.length - 1;
      const v = rowSet.children.find(c => c.name === `Breakpoint=${mobile ? "Mobile" : "Desktop"}, State=${r.hover ? "Hover" : "Default"}, Last row=${last ? "True" : "False"}`);
      const ri = v.createInstance(); ri.name = "Row · " + r.nr; sc.appendChild(ri);
      setP(ri, { Name: r.name, Act: r.act, "Authority code": r.code, "Authority name": r.auth, Dossier: r.dosar, "Valid until": r.until, Issued: r.issued, "Tacit badge": !!r.tacit });
      const av = nested(ri, n => n.type === "INSTANCE" && n.name === "Avatar"); av.swapComponent(avSet.children.find(c => c.name === `Type=${r.person ? "Person" : "Company"}, Size=24`));
      const idc = nested(ri, n => n.type === "INSTANCE" && n.name === "Identifier"); setP(idc, { Value: r.ident, "Show icon": false });
      const nrc = nested(ri, n => n.type === "INSTANCE" && n.name === "Number"); setP(nrc, { Value: r.nr, "Show icon": false });
      const tg = nested(ri, n => n.type === "INSTANCE" && n.name === "Status"); const tv = tagSet.children.find(c => c.name === "Tone=" + (TONE[r.tone] || "Neutral")); if (tv) tg.swapComponent(tv); setP(tg, { Label: r.status });
      rowsOut.push(ri.id);
    }
    if (mobile) { sc.primaryAxisSizingMode = "AUTO"; }
    // pagination
    const pg = await AL("Pagination", "HORIZONTAL", { align: "CENTER", pad: mobile ? [16, 16, 16, 16] : [12, 16, 12, 16] }); put(reg, pg, { fillW: true }); pg.primaryAxisAlignItems = "SPACE_BETWEEN";
    if (!mobile) {
      const left = await AL("Summary", "HORIZONTAL", { gap: 24, align: "CENTER" }); pg.appendChild(left);
      const st = await TX(S.summary, "small", "text/base/secondary", { name: "Results" }); left.appendChild(st);
      const m = S.summary.match(/^Showing (\d+) to (\d+) of (\d+) results$/); if (m) { const s500 = await L.ts("small500"); await figma.loadFontAsync(s500.fontName); let pos = 0; for (const num of [m[1], m[2], m[3]]) { const at = S.summary.indexOf(" " + num, pos) + 1; await st.setRangeTextStyleIdAsync(at, at + num.length, s500.id); st.setRangeFills(at, at + num.length, [await L.paint(st, "text/base/default")]); pos = at + num.length; } }
      const size = await AL("Rows per page", "HORIZONTAL", { gap: 8, align: "CENTER" }); left.appendChild(size);
      size.appendChild(await TX("Rows per page:", "small", "text/base/secondary", { name: "Label" }));
      const sel = await inst("select", { Style: "Default", State: "Filled", Size: "Medium" }); setP(sel, { Label: false, Placeholder: S.pageSize || "16" }); sel.resize(69, sel.height); sel.name = "Rows per page select"; size.appendChild(sel);
    }
    const pgn = await inst("pagination", { Breakpoint: "Desktop" }); pgn.name = "Pager"; pg.appendChild(pgn);
    const cont = pgn.children.find(c => c.name === "Container");
    const pages = (S.pages || []).filter(p => /^\d+$/.test(p.t));
    if (mobile || !pages.length) { cont.visible = false; pgn.layoutSizingHorizontal = "FILL"; pgn.primaryAxisAlignItems = "SPACE_BETWEEN"; }
    else cont.children.forEach((it, i) => { it.visible = i < pages.length; if (i < pages.length) { setP(it, { Type: pages[i].active ? "Selected" : "Unselected" }); } });
    const prev = pgn.children[0], next = pgn.children[pgn.children.length - 1];
    const dir = (S.pages || []).filter(p => !/^\d+$/.test(p.t));
    if (dir[0] && dir[0].disabled) setP(prev, { State: "Disabled" });
    if (dir[1] && dir[1].disabled) setP(next, { State: "Disabled" });
  } else if (S.empty) {
    const eHost = mobile ? await AL("Empty inset", "VERTICAL", { pad: [S.bar && S.bar.sheets ? 16 : 0, 16, 0, 16] }) : inset; if (mobile) put(main, eHost, { fillW: true });
    const es = (await getL("empty")).children.find(c => c.name === "Style=Box").createInstance(); es.name = "Empty state"; put(eHost, es, { fillW: true });
    setP(es, { Title: S.empty.title, Text: S.empty.text || "", "Show text": !!S.empty.text, "Show action": !!S.empty.action });
    if (S.empty.action) { const b = nested(es, n => n.type === "INSTANCE" && n.name === "Action"); setP(b, { Label: S.empty.action }); }
  }
  let overlay = null;
  if (S.tooltip && !mobile) {
    const tp = await inst("tooltip", { Size: "Large", "Arrow Position": "Bottom Left", "Close Button": "False" }); tp.name = "Tooltip"; s.appendChild(tp); tp.layoutPositioning = "ABSOLUTE";
    setP(tp, { Text: S.tooltip.t }); tp.resize(S.tooltip.rect[2], tp.height); tp.x = S.tooltip.rect[0]; tp.y = S.tooltip.rect[1] + S.tooltip.rect[3] - Math.round(tp.height); overlay = tp;
  }
  if (S.pop && !mobile && S.pop.label !== "Filtru: Statut") {
    const sec = await getL("compSection"); const name = "Facet filter · popover · " + S.pop.label.replace("Filtru: ", "");
    let pc = sec.children.find(c => c.name === name);
    if (!pc) { const base = await getL("popover"); pc = base.clone(); sec.appendChild(pc); pc.name = name; pc.x = base.x + 320 * (sec.children.filter(c => c.name.startsWith("Facet filter · popover ·")).length); pc.y = base.y;
      const list = pc.children.find(c => c.name === "Options"); for (const c of [...list.children]) c.remove();
      if (S.pop.search) { const hd = await AL("Head", "VERTICAL", { pad: [8, 8, 0, 8] }); pc.insertChild(0, hd); hd.layoutSizingHorizontal = "FILL"; const se = await inst("search", { State: "Default", Size: "Medium", Button: "False" }); setP(se, { "Clear Button": false, Placeholder: S.pop.search }); put(hd, se, { fillW: true }); }
      const opts = await getL("facetOpt"); for (const o of S.pop.options) { const i = opts.children.find(x => x.name === "Content=Text, State=Default, Size=Popover").createInstance(); i.name = "Option · " + o.v; put(list, i, { fillW: true }); setP(i, { Value: o.v }); i.isExposedInstance = true; }
      pc.description = "Facet popover for " + S.pop.label + (S.pop.search ? " (search above the list: facet with > 7 values)" : "") + ". Same surface as Facet filter · popover."; }
    S.pop._comp = pc.id;
  }
  if (S.pop && !mobile) {
    const pp = (S.pop._comp ? await figma.getNodeByIdAsync(S.pop._comp) : await getL("popover")).createInstance(); pp.name = "Popover · " + S.pop.label; s.appendChild(pp); pp.layoutPositioning = "ABSOLUTE"; pp.x = S.pop.rect[0]; pp.y = S.pop.rect[1];
    for (const o of S.pop.options) { const oi = nested(pp, n => n.type === "INSTANCE" && n.name === "Option · " + o.v); if (oi) setP(nested(oi, n => n.type === "INSTANCE" && n.name === "Checkbox"), { Mode: o.checked ? "Checked" : "Unchecked" }); }
    overlay = pp;
  }
  if (S.sheet && mobile) overlay = await sheetOverlay(s, S);
  return { s, chips: chipNodes, fb, rows: rowsOut, overlay };
};
// ---- act profile (BO page header + sections over grey cards)
const profileScreen = async (S, mobile) => {
  const s = await frameScreen((mobile ? "Mobile · " : "Desktop · ") + S.id, mobile, mobile ? 812 : 900);
  const pr = await AL("Profile", "VERTICAL", { pad: mobile ? [0, 16, 48, 16] : [0, 24, 64, 24], align: "CENTER" }); put(s, pr, { fillW: true });
  const ct = await AL("Container", "VERTICAL"); pr.appendChild(ct); if (mobile) ct.layoutSizingHorizontal = "FILL"; else { ct.resize(1024, 100); ct.counterAxisSizingMode = "FIXED"; }
  if (S.view === "notfound") {
    await sp(ct, "paddingTop", 32);
    const es = (await getL("empty")).children.find(c => c.name === "Style=Box").createInstance(); es.name = "Empty state"; put(ct, es, { fillW: true });
    setP(es, { Title: S.empty.title, Text: S.empty.text, "Show text": true, "Show action": !!S.empty.action });
    const b = nested(es, n => n.type === "INSTANCE" && n.name === "Action"); setP(b, { Label: S.empty.action });
    return { s, back: b };
  }
  const hb = await AL("Page header", "VERTICAL", { pad: [16, 12, 0, 12] }); put(ct, hb, { fillW: true });
  const hd = await AL("Heading", "VERTICAL", { gap: 16 }); put(hb, hd, { fillW: true });
  const cr = await crumbs(S.crumbs, mobile); hd.appendChild(cr);
  const t = await TX(S.h1, "h3", "text/base/secondary", { name: "Title" }); put(hd, t, { fillW: true }); t.textAutoResize = "HEIGHT";
  // meta
  const mset = await getL("metaItem"), sep = await getL("metaSep");
  const mk = async (m) => { const kind = m.copy ? "Copy" : m.tag ? "Tag" : "Text"; const i = mset.children.find(c => c.name === "Value=" + kind).createInstance(); i.name = "Meta · " + m.label;
    setP(i, { Label: m.label, Value: m.value, "Tacit badge": !!m.tacit });
    if (m.copy) setP(nested(i, n => n.type === "INSTANCE" && n.name === "Copy"), { Value: m.value, "Show icon": true });
    if (m.tag) { const tg = nested(i, n => n.type === "INSTANCE" && n.name === "Status"); tg.swapComponent((await getL("tag")).children.find(c => c.name === "Tone=" + m.tone)); setP(tg, { Label: m.value }); }
    return i; };
  const meta = await AL("Meta", mobile ? "VERTICAL" : "HORIZONTAL", { gap: mobile ? 12 : 24, pad: [12, 0, 8, 0] }); put(hb, meta, { fillW: true });
  if (!mobile) { meta.counterAxisAlignItems = "CENTER"; meta.layoutWrap = "WRAP"; meta.counterAxisSpacing = 12; for (let i = 0; i < S.meta.length; i++) { if (i) { const sp1 = sep.createInstance(); sp1.name = "Separator"; meta.appendChild(sp1); } meta.appendChild(await mk(S.meta[i])); } }
  else { for (let i = 0; i < S.meta.length; i += 2) { const row = await AL("Meta row", "HORIZONTAL", { gap: 16 }); put(meta, row, { fillW: true }); for (const m of S.meta.slice(i, i + 2)) { const it = await mk(m); put(row, it, { fillW: true }); } } }
  const bw = await AL("Action", "HORIZONTAL", { pad: [8, 0, 0, 0] }); hb.appendChild(bw);
  const btn = await inst("btnFR", { Style: "Primary", Icon: "Leading", Size: "Medium", State: "Default" }); const eye = await L.icon("eye20"); setP(btn, { Label: S.button, "Leading Icon: 16": eye.id, "Leading Icon: 20": eye.id }); btn.name = "Vezi act permisiv"; bw.appendChild(btn);
  // sections
  const panel = await AL("Sections", "VERTICAL", { pad: [20, 0, 0, 0] }); put(ct, panel, { fillW: true });
  const stl = await getL("secTitle"), rows = await getL("detRow"), bset = await getL("benefCard"), avs = await getL("avatar");
  let actsLink = null;
  for (const sec of S.sections) {
    const se = await AL("Section · " + sec.title, "VERTICAL", { pad: [0, 0, 16, 0] }); put(panel, se, { fillW: true });
    const ti = stl.createInstance(); ti.name = "Section title"; put(se, ti, { fillW: true }); setP(ti, { Title: sec.title });
    if (sec.title === "Beneficiar") {
      const B = S.benef; const bc = bset.children.find(c => c.name === `Breakpoint=${mobile ? "Mobile" : "Desktop"}, Acts link=${B.acts ? "On" : "Off"}`).createInstance(); bc.name = "Beneficiary card"; put(se, bc, { fillW: true });
      setP(bc, { Name: B.name, "Identifier type": B.idType });
      nested(bc, n => n.type === "INSTANCE" && n.name === "Avatar").swapComponent(avs.children.find(c => c.name === `Type=${B.person ? "Person" : "Company"}, Size=40`));
      setP(nested(bc, n => n.type === "INSTANCE" && n.name === "Identifier"), { Value: B.id, "Show icon": !!B.copy });
      if (B.acts) { actsLink = nested(bc, n => n.type === "INSTANCE" && n.name === "Acts link"); setP(actsLink, { Link: B.acts }); }
      continue;
    }
    const card = await AL("Card", "VERTICAL", { pad: [8, 20, 8, 20], r: mobile ? 16 : 24, fill: "background/base/secondary" }); put(se, card, { fillW: true });
    for (let i = 0; i < sec.rows.length; i++) {
      const r = sec.rows[i]; const kind = r.copy ? "Copy" : r.tag ? "Tag" : r.link ? "Link" : "Text";
      const v = rows.children.find(c => c.name === `Breakpoint=${mobile ? "Mobile" : "Desktop"}, Value=${kind}, Divider=${i === sec.rows.length - 1 ? "Off" : "On"}`);
      const ri = v.createInstance(); ri.name = "Row · " + r.label; put(card, ri, { fillW: true });
      setP(ri, { Label: r.label, Value: r.value, "Tacit badge": !!r.tacit });
      if (r.tacit) { const vt = nested(ri, n => n.type === "TEXT" && n.name === "Value text"); if (vt) { vt.layoutSizingHorizontal = "HUG"; } }
      if (r.copy) setP(nested(ri, n => n.type === "INSTANCE" && n.name === "Copy"), { Value: r.value, "Show icon": true });
      if (r.tag) { const tg = nested(ri, n => n.type === "INSTANCE" && n.name === "Status"); tg.swapComponent((await getL("tag")).children.find(c => c.name === "Tone=" + r.tone)); setP(tg, { Label: r.value }); }
      if (r.link) setP(nested(ri, n => n.type === "INSTANCE" && n.name === "Link"), { Link: r.value, Underline: false });
    }
  }
  return { s, btn, actsLink, crumbs: cr };
};
return { listScreen, profileScreen, frameScreen, crumbs, lines, own, nested, setText };
