// RAP filters · final (EVO-WEB YrIzksVgFqtPqDd5z9zY5h, 2026-11-05, code 5bd56c53).
// Stored in figma.root shared plugin data „rapff”/„lib”; specs (probe of the prototype, scratch probe.js) in „rapff”/„specs”,
// default table rows in „rapff”/„rows”. Run: const AF = Object.getPrototypeOf(async function(){}).constructor;
// const L = await new AF(figma.root.getSharedPluginData("rapff","lib"))(); await L.block({...}).
const ID = {
  page: "20304:64765", oldSec: "22101:35849", tplBlock: "22082:18848", stage: "22101:35850",
  chipSet: "22078:12451", chipGroup: "22622:26715", filtruSet: "22269:233965",
  popMain: "22068:187098", optSet: "22064:6908", btnPrimary: "22068:187129", btnText: "22082:17154", xBtn: "22622:26719",
  dateInputSet: "key:4449e61e554888eb4357b4f2e6e16dacf738fda3", pickerSet: "key:2e58b2b40d26e63b685c327bd9369702cbedbbd5", radioSet: "key:513e56108ce8f11caec41350386e3662ac05d004", chevTop: "22422:3905", sheetTplBlock: "22082:199970",
};
const get = (id) => figma.getNodeByIdAsync(id);
const J = (k) => JSON.parse(figma.root.getSharedPluginData("rapff", k) || "null");
const S = (k, v) => figma.root.setSharedPluginData("rapff", k, JSON.stringify(v));
const fontsDone = new Set();
async function loadFonts(root) {
  const texts = root.type === "TEXT" ? [root] : root.findAllWithCriteria({ types: ["TEXT"] });
  for (const t of texts) {
    const fs = t.fontName === figma.mixed ? t.getStyledTextSegments(["fontName"]).map((s) => s.fontName) : [t.fontName];
    for (const f of fs) { const k = f.family + "|" + f.style; if (!fontsDone.has(k)) { fontsDone.add(k); await figma.loadFontAsync(f); } }
  }
}
const prop = (inst, re) => Object.keys(inst.componentProperties).find((k) => re.test(k));
function setP(inst, map) { const o = {}; for (const [re, v] of map) { const k = prop(inst, re); if (k !== undefined) o[k] = v; } if (Object.keys(o).length) inst.setProperties(o); }
async function variantOf(setId, want) {
  const set = setId.startsWith("key:") ? await figma.importComponentSetByKeyAsync(setId.slice(4)) : await get(setId);
  return set.children.find((v) => Object.entries(want).every(([k, val]) => v.name.includes(k + "=" + val)));
}
// library variables by name (Foundations), cached
const VC = {};
async function V(name) {
  if (VC[name]) return VC[name];
  const cols = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
  for (const c of cols) {
    const vars = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(c.key);
    const hit = vars.find((v) => v.name === name || v.name.endsWith("/" + name));
    if (hit) { VC[name] = await figma.variables.importVariableByKeyAsync(hit.key); return VC[name]; }
  }
  VC[name] = null; return null;
}
async function pad(f, t, r, b, l) {
  for (const [k, v] of [["paddingTop", t], ["paddingRight", r], ["paddingBottom", b], ["paddingLeft", l]]) { f[k] = v; const vv = v ? await V("spacing-" + v) : null; if (vv) f.setBoundVariable(k, vv); }
}
async function gap(f, v) { f.itemSpacing = v; const vv = v ? await V("spacing-" + v) : null; if (vv) f.setBoundVariable("itemSpacing", vv); }
async function surface(f) {
  // white menu surface: fill + radius-12 + dropdown-effect + clip, no stroke (copied from the Facet popover main)
  const m = await get(ID.popMain);
  f.fills = m.fills; f.strokes = []; f.clipsContent = true;
  if (m.effectStyleId) await f.setEffectStyleIdAsync(m.effectStyleId);
  for (const k of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) {
    const b = m.boundVariables && m.boundVariables[k]; if (b) f.setBoundVariable(k, await figma.variables.getVariableByIdAsync(b.id)); else f[k] = 12;
  }
}
async function al(name, dir) { const f = figma.createFrame(); f.name = name; f.layoutMode = dir; f.fills = []; f.primaryAxisSizingMode = "AUTO"; f.counterAxisSizingMode = "AUTO"; return f; }
async function textStyle14() { const o = (await get(ID.optSet)).children[0].findOne((n) => n.type === "TEXT"); return o.textStyleId; }

// ---------- chips ----------
let CROSS = null, CHEV_TOP = null, OPEN = null;
async function icons() {
  if (!CROSS) { const x = await get(ID.xBtn); const ic = x.findOne((n) => n.type === "INSTANCE"); CROSS = await ic.getMainComponentAsync(); }
  if (!CHEV_TOP) CHEV_TOP = await (await get(ID.chevTop)).getMainComponentAsync();
}
function trailingIcon(chip) { const ins = chip.findAll((n) => n.type === "INSTANCE" && /chevron|arrow|caret|icon/i.test(n.name)); return ins[ins.length - 1]; }
async function focusRing(node) {
  const styles = await figma.getLocalEffectStylesAsync();
  let st = styles.find((s) => /focus ring\/medium/i.test(s.name));
  if (!st) { const f = await get(ID.filtruSet); const v = f.children.find((c) => c.name.includes("State=Focus")); if (v.effectStyleId) { await node.setEffectStyleIdAsync(v.effectStyleId); return; } node.effects = v.effects; return; }
  await node.setEffectStyleIdAsync(st.id);
}
async function chip(c) {
  await icons();
  const v = await variantOf(ID.chipSet, { State: c.sel || c.b ? "Selected" : "Unselected", Icon: c.reset ? "Leading" : "Trailing" });
  const i = v.createInstance(); i.name = "Chip · " + c.l;
  await loadFonts(i);
  setP(i, [[/^⌨️ Label/, c.l], [/Counter Badge/, !!c.b]]);
  if (c.b) { const t = i.findAll((n) => n.type === "TEXT").find((n) => /^\d+$/.test(n.characters)); if (t) { await loadFonts(t); t.characters = c.b; } }
  if (c.reset) { const ic = i.findAll((n) => n.type === "INSTANCE")[0]; if (ic) ic.swapComponent(CROSS); } // „Resetează” = × first (2026-11-05)
  if (c.o) { OPEN = i; const ic = trailingIcon(i); if (ic) ic.swapComponent(CHEV_TOP); i.clipsContent = true; await focusRing(i); }
  return i;
}
async function group(c) {
  const g = (await get(ID.chipGroup)).clone(); g.name = "Filter group · " + c.l;
  const old = g.children[0]; const n = await chip({ l: c.l, b: c.b, sel: true, o: c.o }); g.insertChild(0, n); old.remove();
  return g;
}
async function button(kind, label) {
  const src = await get(kind === "primary" ? ID.btnPrimary : ID.btnText); const m = await src.getMainComponentAsync();
  const i = m.createInstance(); await loadFonts(i); setP(i, [[/^⌨️ Label/, label]]); i.name = label; return i;
}

// ---------- screen ----------
async function fillRows(d, rows) {
  const reg = d.findOne((n) => n.name === "Register"); const table = reg.findOne((n) => n.name === "Table");
  const rs = table.children.filter((n) => n.type === "INSTANCE" && n.name.startsWith("Row"));
  while (rs.length > rows.length) rs.pop().remove();
  const toneOf = async (inst, t) => {
    const st = inst.exposedInstances.find((e) => e.name === "Status"); const m = await st.getMainComponentAsync();
    const opts = m.parent.componentPropertyDefinitions[Object.keys(m.parent.componentPropertyDefinitions).find((k) => /Tone/.test(k))].variantOptions;
    const want = { success: /success/i, danger: /danger|error/i, accent: /warning|accent/i, warning: /warning/i, brand: /brand|info/i }[t] || /neutral/i;
    return [st, opts.find((o) => want.test(o)) || opts[0]];
  };
  for (let k = 0; k < rows.length; k++) {
    const r = rows[k], inst = rs[k]; await loadFonts(inst);
    inst.name = "Row · " + r[5];
    setP(inst, [[/^Name#/, r[0]], [/^Act#/, r[3]], [/^Authority code/, r[4]], [/^Dossier/, r[6]], [/^Valid until/, r[7]], [/^Issued/, r[8]], [/^Last row/, k === rows.length - 1 ? "True" : "False"], [/^Tacit badge/, false]]);
    const ex = (n) => inst.exposedInstances.find((e) => e.name === n);
    const idn = ex("Identifier"); await loadFonts(idn); setP(idn, [[/^Value/, r[1]]]);
    const nr = ex("Number"); await loadFonts(nr); setP(nr, [[/^Value/, r[5]]]);
    const av = ex("Avatar"); if (av) setP(av, [[/^Type/, r[2] ? "Person" : "Company"]]);
    const [st, tone] = await toneOf(inst, r[10]); await loadFonts(st); setP(st, [[/^Label/, r[9]], [/Tone/, tone]]);
  }
}
async function fillPager(d, pager) {
  const pg = d.findOne((n) => n.name === "Pagination");
  if (!pager) { if (pg) pg.visible = false; return; }
  const ins = pg.findOne((n) => n.type === "INSTANCE"); await loadFonts(ins);
  const range = ins.findOne((n) => n.type === "TEXT" && n.name === "Range"); if (range) range.characters = pager[0];
  const dates = ins.findAll((n) => n.type === "TEXT" && n.name === "Date");
  dates.forEach((t, i) => { if (pager[1][i] !== undefined) t.characters = pager[1][i]; });
}
async function toolbar(d, sp) {
  const tb = d.findOne((n) => n.name === "Toolbar");
  const s = tb.findOne((n) => n.name === "Search"); await loadFonts(s);
  setP(s, [[/Placeholder/, sp.s || "Caută după nr. act, IDNO, companie sau adresă"]]);
  if (sp.s) { setP(s, [[/^🎚️ State/, "Focus"], [/Clear Button/, true]]); }
  s.resize(520, s.height);
  // Filtru = local „RAP / Filter / Filter trigger” 22707:8213 (button radius 8, 40; user 2026-11-05: never the round pill)
  const f = tb.findOne((n) => /^(Filter (chip|trigger)|filter-chip)/.test(n.name));
  const ts = await get("22707:8213"); const st = sp.t[0] ? (sp.t[1] ? "Active open" : "Active") : (sp.t[1] ? "Open" : "Rest");
  f.swapComponent(ts.children.find((c) => c.name === "Type=Label, State=" + st)); f.name = "Filter trigger"; await loadFonts(f);
  const dfs = ts.componentPropertyDefinitions; f.setProperties({ [Object.keys(dfs).find((k) => k.startsWith("Label"))]: "Filtru", [Object.keys(dfs).find((k) => k.startsWith("Show badge"))]: !!sp.t[0] });
  if (sp.t[0]) { const nb = f.findOne((x) => x.type === "INSTANCE" && x.name === "Count"); await loadFonts(nb); nb.setProperties({ [Object.keys(nb.componentProperties).find((k) => /Counter Value/.test(k))]: String(sp.t[0]) }); }
}
async function filterBar(d, sp) {
  const inset = d.findOne((n) => n.name === "Filter bar inset");
  if (!sp.bar) { inset.remove(); return; }
  const bar = inset.findOne((n) => n.name === "Facet filter bar");
  const meta = bar.findOne((n) => n.name === "Meta"); if (meta) meta.remove();
  const chips = bar.findOne((n) => n.name === "Chips");
  for (const c of [...chips.children]) c.remove();
  for (const c of sp.chips) {
    const n = c.k === "grp" ? await group(c) : c.k === "btn" ? await button("primary", c.l) : await chip(c);
    chips.appendChild(n);
  }
  chips.layoutSizingHorizontal = "HUG"; chips.counterAxisAlignItems = "CENTER";
}

// ---------- popovers ----------
async function popTitle(title) {
  const f = await al("Title", "HORIZONTAL"); await pad(f, 12, 16, 0, 16);
  const t = figma.createText(); const ts = await figma.getStyleByIdAsync(await textStyle14()); await figma.loadFontAsync(ts.fontName);
  await t.setTextStyleIdAsync(ts.id); t.characters = title; t.name = "Title";
  const opt = (await get(ID.optSet)).children[0].findOne((n) => n.type === "TEXT"); t.fills = opt.fills;
  f.appendChild(t); return f;
}
async function popFooter() {
  const m = await get(ID.popMain); const f = m.findOne((n) => n.name === "Footer").clone(); f.name = "Footer";
  for (const c of [...f.children]) c.remove();
  f.primaryAxisAlignItems = "MAX"; f.appendChild(await button("text", "Resetează"));
  return f;
}
async function checklist(sp, p) {
  const m = await get(ID.popMain); const i = m.createInstance(); i.name = "Popover · " + (p.title || "Statut");
  const isTag = p.items.some((x) => x !== "---" && x[2]);
  setP(i, [[/Show search/, !!p.search]]);
  await loadFonts(i);
  if (p.search) { const s = i.findOne((n) => n.name === "Search"); await loadFonts(s); setP(s, [[/Placeholder/, p.search.ph]]); }
  const slot = i.findOne((n) => n.name === "Options");
  for (const c of [...slot.children]) c.remove();
  for (const it of p.items.slice(0, 12)) {
    if (it === "---") { const sep = await al("Separator", "VERTICAL"); await pad(sep, 4, 0, 4, 0); const line = figma.createFrame(); line.name = "Line"; line.resize(10, 1); line.fills = (await get(ID.popMain)).findOne((n) => n.name === "Footer").strokes; sep.appendChild(line); slot.appendChild(sep); line.layoutSizingHorizontal = "FILL"; sep.layoutSizingHorizontal = "FILL"; continue; }
    const v = await variantOf(ID.optSet, { Content: isTag ? "Tag" : "Text", State: "Default", Size: "Desktop" });
    const o = v.createInstance(); o.name = "Option · " + it[0]; slot.appendChild(o); o.layoutSizingHorizontal = "FILL";
    await loadFonts(o);
    if (isTag) {
      const tag = o.findOne((n) => n.type === "INSTANCE" && !/checkbox/i.test(n.name));
      await loadFonts(tag); const tm = await tag.getMainComponentAsync();
      const defs = (tm.parent.type === "COMPONENT_SET" ? tm.parent : tm).componentPropertyDefinitions;
      const tk = Object.keys(defs).find((k) => /Tone|Style|Color/.test(k) && defs[k].type === "VARIANT");
      const want = { success: /success/i, danger: /danger|error/i, accent: /warning|accent/i, brand: /brand|info/i }[it[2]];
      const o2 = {}; const lk = Object.keys(tag.componentProperties).find((k) => /Label/.test(k)); if (lk) o2[lk] = it[0];
      if (tk && want) { const opt = defs[tk].variantOptions.find((x) => want.test(x)); if (opt) o2[tk] = opt; }
      tag.setProperties(o2);
    } else setP(o, [[/^Value/, it[0]]]);
    if (it[1]) { const cb = o.findOne((n) => n.type === "INSTANCE" && /checkbox/i.test(n.name)); setP(cb, [[/Mode/, "Checked"]]); }
  }
  i.resize(p.r[2], i.height);
  { const sl = i.findOne((n) => n.name === "Options"); while (i.height > p.r[3] && sl.children.length > 1) sl.children[sl.children.length - 1].remove(); }
  return i;
}
async function dateInput(label, value, focus) {
  const v = await variantOf(ID.dateInputSet, { Style: "Default", State: focus ? "Focus" : value ? "Filled" : "Default", Size: "Medium" });
  const i = v.createInstance(); i.name = "Date · " + label; await loadFonts(i);
  setP(i, [[/👁️ Label/, true], [/Assistive/, false], [/Mandatory/, false], [/Placeholder/, value || "ZZ/LL/AAAA"]]);
  const lab = i.findAll((n) => n.type === "TEXT").find((n) => /label/i.test(n.name) || /^Label/.test(n.characters)); if (lab) lab.characters = label;
  return i;
}
async function datePop(p) {
  const f = await al("Popover · " + p.title, "VERTICAL"); await surface(f);
  f.appendChild(await popTitle(p.title));
  const row = await al("Range", "HORIZONTAL"); await pad(row, 16, 16, 16, 16); await gap(row, 12);
  f.appendChild(row);
  for (const [lab, val, foc] of p.dates) { const di = await dateInput(lab, val, foc || (p.picker && lab === "De la")); row.appendChild(di); di.layoutSizingHorizontal = "FILL"; }
  f.appendChild(await popFooter());
  f.counterAxisSizingMode = "FIXED"; f.resize(p.r[2], f.height);
  for (const c of f.children) c.layoutSizingHorizontal = "FILL";
  return f;
}
async function picker(p) {
  // library date-picker: the Month Picker variant has no header → the Year Picker shell (header + 3×4 cells) for both grids
  const v = await variantOf(ID.pickerSet, { Type: "Year Picker" });
  const i = v.createInstance(); i.name = "Date picker · " + p.picker.title; await loadFonts(i);
  const hdr = i.findOne((n) => n.name === ".picker-header"); const ht = hdr.findAll((n) => n.type === "TEXT" && n.visible); if (ht[0]) ht[0].characters = p.picker.title;
  let cells = i.findAll((n) => n.type === "INSTANCE" && n.name === ".day-cell");
  p.picker.grid.forEach((g, k) => { if (cells[k]) setP(cells[k], [[/State/, /is-today/.test(g) ? "Current" : "Default"]]); });
  cells = i.findAll((n) => n.type === "INSTANCE" && n.name === ".day-cell");
  for (let k = 0; k < cells.length; k++) { const t = cells[k].findOne((n) => n.type === "TEXT"); if (!t || p.picker.grid[k] === undefined) continue; await loadFonts(t); t.characters = p.picker.grid[k].replace(/is-\w+/g, ""); }
  return i;
}
async function menu(p) {
  const f = await al("Popover · Mai multe", "VERTICAL"); await surface(f); await pad(f, 4, 4, 4, 4); await gap(f, 2);
  for (const [t] of p.items) {
    const v = await variantOf(ID.optSet, { Content: "Text", State: "Default", Size: "Desktop" });
    const o = v.createInstance(); o.name = "Item · " + t; f.appendChild(o); o.layoutSizingHorizontal = "FILL"; await loadFonts(o); setP(o, [[/^Value/, t]]);
    const cb = o.findOne((n) => n.type === "INSTANCE" && /checkbox/i.test(n.name)); if (cb) cb.visible = false;
  }
  f.counterAxisSizingMode = "FIXED"; f.resize(p.r[2], f.height);
  return f;
}
async function pathPop(p) {
  const f = await al("Popover · Adresă", "VERTICAL"); await surface(f);
  f.appendChild(await popTitle(p.title));
  const cr = await al("Crumbs", "HORIZONTAL"); await pad(cr, 12, 12, 4, 12); f.appendChild(cr);
  const bcSrc = (await figma.getNodeByIdAsync(ID.tplBlock)).findOne((n) => n.name === "Breadcrumbs");
  const bc = (await bcSrc.getMainComponentAsync()).createInstance(); cr.appendChild(bc); await loadFonts(bc);
  const lv = Object.keys(bc.componentProperties); const o = {};
  for (const k of lv) { const m = /Level (\d)/.exec(k); if (m && bc.componentProperties[k].type === "BOOLEAN") o[k] = Number(m[1]) <= p.crumbs.length - 1; if (/Active Level/.test(k) && bc.componentProperties[k].type === "BOOLEAN") o[k] = true; }
  bc.setProperties(o);
  const labs = bc.findAll((n) => n.type === "TEXT" && n.visible);
  labs.forEach((t, k) => { if (p.crumbs[k] !== undefined) t.characters = p.crumbs[k]; });
  const m = await get(ID.popMain); const sh = m.findOne((n) => n.name === "Search head").clone(); f.appendChild(sh); try { sh.componentPropertyReferences = {}; } catch (e) {} sh.visible = true;
  const s = sh.findOne((n) => n.name === "Search"); await loadFonts(s); setP(s, [[/Placeholder/, p.search.ph]]);
  const list = await al("Options", "VERTICAL"); await pad(list, 4, 4, 4, 4); await gap(list, 2); f.appendChild(list);
  for (const [t] of p.items) {
    const w = await al("Option · " + t, "HORIZONTAL"); await pad(w, 6, 12, 6, 8); w.minHeight = 40; { const v40 = await V("spacing-40"); if (v40) w.setBoundVariable("minHeight", v40); } w.counterAxisAlignItems = "CENTER"; list.appendChild(w); w.layoutSizingHorizontal = "FILL";
    const v = await variantOf(ID.radioSet, { Mode: "Unselected", State: "Default", Size: "Small", "Supporting Text": "False" });
    const r = v.createInstance(); w.appendChild(r); await loadFonts(r); setP(r, [[/^⌨️ Label/, t]]);
  }
  f.appendChild(await popFooter());
  f.counterAxisSizingMode = "FIXED"; f.resize(p.r[2], f.height);
  for (const c of f.children) c.layoutSizingHorizontal = "FILL";
  return f;
}

// ---------- mains (2026-11-05): dropdown items 40 desktop; popover footer = only „Resetează” (masterApply, no Confirm) ----------
async function mains() {
  const set = await get(ID.optSet); const changed = [];
  for (const v of set.children) if (/Size=Desktop/.test(v.name)) { await pad(v, 6, 12, 6, 8); v.minHeight = 40; const v40 = await V("spacing-40"); if (v40) v.setBoundVariable("minHeight", v40); v.counterAxisAlignItems = "CENTER"; changed.push(v.id); }
  const m = await get(ID.popMain); const f = m.findOne((n) => n.name === "Footer");
  const conf = f.findOne((n) => n.name === "Confirm"); if (conf) conf.visible = false;
  const clr = f.findOne((n) => n.name === "Clear");
  if (clr) { const tm = await (await get(ID.btnText)).getMainComponentAsync(); clr.swapComponent(tm); clr.name = "Reset"; await loadFonts(clr); setP(clr, [[/^⌨️ Label/, "Resetează"]]); }
  f.primaryAxisAlignItems = "MAX";
  return { changed, sp10: !!(await V("spacing-10")), footerStroke: f.strokes.length };
}

// ---------- block ----------
async function section() {
  const ids = J("ids") || {};
  let sec = ids.sec && (await get(ids.sec));
  if (!sec) {
    const old = await get(ID.oldSec);
    sec = figma.createSection(); sec.name = "02b · Filtre RAP · final (US-141, 2026-11-05)";
    old.parent.appendChild(sec); sec.x = old.x; sec.y = old.y + old.height + 160; sec.resizeWithoutConstraints(2295, 2000);
    const st = (await get(ID.stage)).clone(); sec.appendChild(st); st.x = 80; st.y = 80;
    ids.sec = sec.id; ids.stage = st.id; S("ids", ids);
  }
  return sec;
}
async function block(cfg) {
  // cfg: { key, state, title, note, spec (state id in specs), y }
  const specs = J("specs"); const sp = specs[cfg.spec]; const sec = await section();
  const b = (await get(ID.tplBlock)).clone(); sec.appendChild(b); b.x = 80; b.y = cfg.y || 440; b.name = "Block · " + cfg.key;
  await loadFonts(b);
  const scr = b.findOne((n) => n.name === "Screens · desktop + mobile");
  const mob = scr.children.find((n) => /^Mobile/.test(n.name)); if (mob) mob.remove();
  const d = scr.children.find((n) => /^Desktop/.test(n.name)); d.name = "Desktop · " + cfg.key;
  // label + note = Board instances (props ID / Title / Status, note Title / Text)
  const lab = b.children.find((n) => /^Screen label/.test(n.name)); lab.name = "Screen label · " + cfg.key;
  await loadFonts(lab); setP(lab, [[/^ID#/, cfg.key], [/^Title#/, cfg.title]]);
  const link = lab.findOne((n) => n.type === "TEXT" && n.name === "Link · prototype");
  if (link) { await loadFonts(link); link.hyperlink = { type: "URL", value: "https://vasileschidu.github.io/geap-sandbox/rap-evo/index.html?state=" + cfg.state }; }
  const note = b.children.find((n) => /^Note/.test(n.name)); note.name = "Note · " + cfg.key;
  await loadFonts(note); setP(note, [[/^Title#/, cfg.key + " · " + cfg.title], [/^Text#/, cfg.note]]);
  await toolbar(d, sp);
  await filterBar(d, sp);
  await fillRows(d, sp.rows || J("rows"));
  await fillPager(d, sp.pager);
  const ids = J("ids"); ids[cfg.key] = { block: b.id, screen: d.id }; S("ids", ids);
  // popover at screen level, absolute, at the code's position
  const out = { block: b.id, screen: d.id };
  if (sp.pop) {
    const p = sp.pop;
    const pop = p.kind === "menu" ? await menu(p) : p.dates ? await datePop(p) : p.crumbs ? await pathPop(p) : await checklist(sp, p);
    d.appendChild(pop); pop.layoutPositioning = "ABSOLUTE"; pop.x = p.r[0]; pop.y = p.r[1]; if (OPEN) { const bb = OPEN.absoluteBoundingBox, sb = d.absoluteBoundingBox; pop.x = Math.round(bb.x - sb.x); pop.y = Math.round(bb.y - sb.y + bb.height + 8); } out.pop = pop.id;
    if (p.picker) { const pk = await picker(p); d.appendChild(pk); pk.layoutPositioning = "ABSOLUTE"; pk.x = pop.x + p.picker.r[0] - p.r[0]; pk.y = pop.y + p.picker.r[1] - p.r[1]; out.picker = pk.id; }
  }
  return out;
}
async function restack(order) {
  const ids = J("ids"); const sec = await get(ids.sec); let y = 440;
  for (const k of order) { if (!ids[k]) continue; const b = await get(ids[k].block); if (!b) continue; b.x = 80; b.y = y; y += Math.round(b.height) + 240; }
  const st = await get(ids.stage);
  let w = 0; for (const c of sec.children) if (c.type !== "CONNECTOR") w = Math.max(w, c.x + c.width);
  sec.resizeWithoutConstraints(Math.round(w + 80), y - 240 + 80);
  return { h: y };
}
return { fillRows, fillPager, toolbar, filterBar, mains, ID, J, S, V, loadFonts, setP, variantOf, chip, group, button, section, block, restack, checklist, datePop, picker, menu, pathPop, surface, pad, gap, al };
