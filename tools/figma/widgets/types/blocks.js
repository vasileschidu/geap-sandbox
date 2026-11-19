// Section 06 · Widget types — block builder (stored in root shared plugin data „w06”/„block”).
// new AF("SPEC", src)(spec) → { block, full, narrow }. spec = { state, id, title, note, type, link?, ann: [[where, cat, text]] }
const AF = Object.getPrototypeOf(async function(){}).constructor;
const L = await new AF(figma.root.getSharedPluginData("w06","lib"))();
const ids = JSON.parse(figma.root.getSharedPluginData("w06","ids"));
const N = async (id) => figma.getNodeByIdAsync(id);
const page = await N("14861:56367"); await figma.setCurrentPageAsync(page);
const sec = await N(ids.section);
const setP = (inst, map) => { const p = {}; for (const k of Object.keys(inst.componentProperties)) { const base = k.split("#")[0]; if (base in map) p[k] = map[base]; } inst.setProperties(p); };
const variant = async (setId, name) => (await N(setId)).children.find(c => c.name === name);
const itemSet = await N(ids.legendItem);
const item = (key, layout) => itemSet.children.find(c => c.name === `Key=${key}, Layout=${layout}`);
const slotOf = (inst) => inst.findOne(n => n.type === "SLOT");
const legend = async (items, list = false) => {
  const lg = (await N(list ? ids.legendList : ids.legend)).createInstance(); const s = slotOf(lg); for (const k of [...s.children]) k.remove();
  for (const it of items) {
    if (it === "heat") { s.appendChild((await N(ids.heatScale)).createInstance()); continue; }
    const [key, label, value, pct] = it; const i = item(key, list ? "List" : "Inline").createInstance(); s.appendChild(i); if (list) i.layoutSizingHorizontal = "FILL";
    setP(i, { Label: label, Value: value || "", Pct: pct || "", "Show value": Boolean(value), "Show pct": Boolean(pct) });
  }
  return lg;
};
const W = (narrow) => (narrow ? 328 : 632);
const rowsFrame = async () => { const f = await L.frame("Rows", "VERTICAL"); await L.gap(f, 4); return f; };
const fitRow = async (r, narrow) => { if (!narrow) return; r.layoutSizingVertical = "HUG"; await L.pad(r, 4, 0, 4, 0); const lab = r.children.find(n => n.name === "Label"); lab.maxLines = 2; lab.textAutoResize = "HEIGHT"; };
const BODY = {
  async bars(narrow, stacked) {
    const D = stacked
      ? [["Autorizație sanitară de funcționare", "1.998", [18.18, 10.52, 10.59, 4.65, 23.22, 10.95]], ["Autorizarea produselor biocide", "2.070", [1.76, 10.99, 21.70, 12.31, 11.18, 22.99]], ["Certificat de conformitate igienică", "2.558", [17.87, 21.46, 23.42, 18.10, 14.78, 4.38]]]
      : [["Autorizație sanitară de funcționare", "532", [100]], ["Autorizarea produselor biocide", "136", [25.56]], ["Certificat de conformitate igienică", "268", [50.38]]];
    const Lw = narrow ? 164 : 236, Vw = stacked ? 40 : 28, Tw = W(narrow) - 24 - Lw - Vw;
    const f = await rowsFrame(); const main = await variant(ids.stacked === "14917:29029" ? "14917:29037" : ids.stacked, stacked ? "Type=Stacked" : "Type=Single");
    for (const [lab, val, segs] of D) {
      const r = main.createInstance(); f.appendChild(r); r.layoutSizingHorizontal = "FILL"; setP(r, { Label: lab, Value: val });
      const F = (nm) => { const st = [...r.children]; while (st.length) { const n = st.shift(); if (n.name === nm) return n; if (n.children) st.push(...n.children); } return null; };
      F("Label").layoutGrow = Lw; F("Track").layoutGrow = Tw; F("Value").layoutSizingHorizontal = "FILL"; F("Value").layoutGrow = Vw; F("Value").textAlignHorizontal = "RIGHT";
      let used = 0, acc = 0; const segN = F("Track").children.map(n => n.name).filter(n => /^(Seg|Bar)/.test(n));
      for (const [i, nm] of segN.entries()) { if (i >= segs.length) { if (F(nm).visible) F(nm).visible = false; continue; } acc += segs[i]; const px = Math.round(acc / 100 * Tw) - used; used += px; if (!F(nm).visible) F(nm).visible = true; F(nm).layoutGrow = Math.max(px, 1); }
      F("Space").layoutGrow = Math.max(Tw - used, 1); if (Tw - used <= 0) F("Space").visible = false;
      await fitRow(r, narrow);
    }
    const lg = stacked ? await legend([["S1", "Depus"], ["S2", "În examinare"], ["S3", "Suspendat"], ["S4", "Finalizat"], ["S5", "Respins"], ["S6", "Retras"]]) : await legend([["S1", "Număr de înregistrări"]]);
    return [f, lg];
  },
  async stacked(narrow) { return BODY.bars(narrow, true); },
  async line(narrow, control) {
    const i = (await variant(ids.line, control ? "Type=Control" : "Type=Area")).createInstance();
    if (narrow) { const ax = i.findOne(n => n.name === "Axis"); ax.children.forEach((t, k) => { const tx = t.children[0]; if (tx && k % 4 !== 0) tx.visible = false; }); }
    const lg = control ? await legend([["S1", "Număr de înregistrări"], ["Mean", "Media 337"], ["Limit", "Limitele de control 226 – 448"], ["Out", "1 valoare în afara limitelor"]]) : await legend([["S1", "Număr de înregistrări"]]);
    return [i, lg];
  },
  async control(narrow) { return BODY.line(narrow, true); },
  async pie(narrow) { return [(await variant(ids.donut, narrow ? "Layout=Stacked" : "Layout=Side")).createInstance()]; },
  async heatmap(narrow) {
    const h = (await N(ids.heatmap)).createInstance();
    if (narrow) { h.findOne(n => n.name === "Labels").layoutGrow = 88; h.findOne(n => n.name === "Grid").layoutGrow = 232; }
    return [h, await legend(["heat"])];
  },
  async funnel(narrow) {
    const D = [["Autorizație sanitară de funcționare", "532", "100%", 100], ["Autorizarea produselor biocide", "346", "65%", 65.04], ["Certificat de conformitate igienică", "253", "48%", 47.56]];
    const Lw = narrow ? 164 : 236, Tw = W(narrow) - 24 - Lw - 66; const f = await rowsFrame(); const m = await N(ids.funnelRow);
    for (const [lab, val, pct, w] of D) {
      const r = m.createInstance(); f.appendChild(r); r.layoutSizingHorizontal = "FILL"; setP(r, { Label: lab, Value: val, Pct: pct });
      const F = (nm) => { const st = [...r.children]; while (st.length) { const n = st.shift(); if (n.name === nm) return n; if (n.children) st.push(...n.children); } return null; };
      F("Label").layoutGrow = Lw; F("Track").layoutGrow = Tw;
      const bar = Math.round(w / 100 * Tw), side = Math.round((Tw - bar) / 2);
      F("Before").layoutGrow = Math.max(side, 1); F("Bar").layoutGrow = bar; F("After").layoutGrow = Math.max(Tw - bar - side, 1); if (side <= 0) F("Before").visible = false; if (Tw - bar - side <= 0) F("After").visible = false;
      await fitRow(r, narrow);
    }
    return [f, await legend([["S1", "Procentul față de prima etapă (Autorizație sanitară de funcționare)"]])];
  },
  async treemap(narrow) {
    const t = (await N(ids.treemap)).createInstance();
    return [t, await legend([["S1", "Autorizație sanitară de funcționare", "532"], ["S2", "Autorizarea produselor biocide", "136"], ["S3", "Certificat de conformitate igienică", "268"]], true)];
  },
  async tile() { const t = (await N("14919:42901")).createInstance(); setP(t, { Value: "263" }); t.children[1].visible = false; return [t]; },
  async aggTable(narrow) { return [await table(narrow, ["Serviciu", "Număr de înregistrări"], [["Autorizație sanitară de funcționare", "532"], ["Autorizarea produselor biocide", "136"], ["Certificat de conformitate igienică", "268"]], narrow ? [178, 148] : [378, 252], { agg: true })]; },
  async rowTable(narrow) { return [await table(narrow, ["Nr. dosar", "Statut dosar", "Serviciu", "Autoritate", "Data depunerii"], [["D2026-10-04940", "Suspendat", "Autorizarea produselor biocide", "AMDM", "8 octombrie 2026"], ["D2026-11-04759", "Suspendat", "Certificat de conformitate igienică", "AM", "16 noiembrie 2026"], ["D2026-10-04578", "Suspendat", "Autorizație sanitară de funcționare", "ANSP", "19 octombrie 2026"], ["D2026-11-04397", "Suspendat", "Autorizarea produselor biocide", "ANTA", "27 noiembrie 2026"]], [140, 96, 251, 84, 140], { link0: true })]; }
};
const LINK = "d9a1fd02b0554673fcb7442d47d7a3bba526fd0d";
async function table(narrow, heads, rows, widths, o) {
  const wrap = await L.frame("Table", "VERTICAL"); await L.fill(wrap, "bgDef"); await L.stroke(wrap, "bordDef", 1); await L.rad(wrap, "r16"); wrap.clipsContent = true;
  const hdrSet = await figma.importComponentSetByKeyAsync("8c5bbdd495af7c0d6db337e962749c6cbd71cb03");
  const hdr = hdrSet.children.find(c => c.name === `📏 Breakpoint=Desktop, 🎚️ Columns=${heads.length}, 🎚️ Type=Subtle`).createInstance(); wrap.appendChild(hdr); hdr.layoutSizingHorizontal = o.link0 ? "HUG" : "FILL";
  const hc = hdr.children.filter(n => n.name === "Cell");
  hc.forEach((c, i) => { const t = c.findOne(n => n.type === "TEXT" && n.visible); if (t) t.characters = heads[i]; c.layoutSizingHorizontal = o.link0 ? "FIXED" : "FILL"; if (o.link0) c.resize(widths[i], c.height); else c.layoutGrow = widths[i]; if (o.agg && i) { const tt = c.findOne(n => n.type === "FRAME" && n.layoutMode === "HORIZONTAL"); if (tt) tt.primaryAxisAlignItems = "MAX"; } });
  const cellT = await N("708:59486"); const link = await figma.importComponentByKeyAsync(LINK);
  for (const [ri, r] of rows.entries()) {
    const row = await L.frame(`Row ${ri + 1}`, "HORIZONTAL"); wrap.appendChild(row); row.layoutSizingHorizontal = o.link0 ? "HUG" : "FILL";
    for (const [ci, val] of r.entries()) {
      const isLink = (o.agg && ci === 1) || (o.link0 && ci === 0); let cell;
      if (isLink) { cell = await L.frame("Cell · link", "HORIZONTAL"); cell.counterAxisAlignItems = "CENTER"; await L.pad(cell, 8, 16, 8, 16); cell.primaryAxisAlignItems = o.agg ? "MAX" : "MIN"; await L.stroke(cell, "bordDef", 1, [0, 0, ri === rows.length - 1 ? 0 : 1, 0]); const l = link.createInstance(); setP(l, { "⌨️ Link": val, "👁️ Underline": true }); cell.appendChild(l); row.appendChild(cell); cell.layoutSizingVertical = "FILL"; }
      else { cell = cellT.createInstance(); row.appendChild(cell); setP(cell, { "⌨️ Data": val }); if (ri === rows.length - 1) cell.strokeBottomWeight = 0; if (o.agg && ci === 0) await L.fill(cell, "bgSec"); }
      if (o.link0) { cell.layoutSizingHorizontal = "FIXED"; cell.resize(widths[ci], cell.height); } else { cell.layoutSizingHorizontal = "FILL"; cell.layoutGrow = widths[ci]; }
      if (!isLink) { const t = cell.findOne(n => n.type === "TEXT" && n.visible); if (t && narrow && o.agg) { t.textAutoResize = "HEIGHT"; t.maxLines = 2; } }
    }
  }
  if (o.link0) { wrap.layoutSizingHorizontal = "FIXED"; }
  return wrap;
}
async function card(spec, narrow) {
  const c = (await N(ids.card)).createInstance(); c.name = `Card · ${narrow ? "one third" : "full row"}`; c.resize(narrow ? 376 : 680, c.height);
  setP(c, { Title: "Dosare pe servicii", "Show foot": spec.type !== "rowTableEmpty" });
  const s = slotOf(c); for (const k of [...s.children]) k.remove();
  for (const n of await BODY[spec.type](narrow)) { s.appendChild(n); n.layoutSizingHorizontal = "FILL"; }
  return c;
}
// ---- block
const tpl = await N("14945:33547");
const blk = tpl.clone(); sec.appendChild(blk); blk.name = `Block · ${spec.state}`; blk.x = 80; blk.y = spec.y || 440;
await L.loadAll(blk);
blk.children[1].remove();
const lbl = blk.children[0]; lbl.name = `Screen label · ${spec.state}`;
lbl.findOne(n => n.name === "ID text").characters = spec.state.toUpperCase();
lbl.findOne(n => n.name === "Title").characters = spec.title;
const lk = lbl.findOne(n => n.name === "Link · prototype"); lk.hyperlink = { type: "URL", value: `https://vasileschidu.github.io/geap-sandbox/e-permits-acte-permisive.html?state=${spec.link || spec.state}` };
const note = blk.children[1]; note.name = `Note · ${spec.state}`;
note.findOne(n => n.name === "Note title").characters = `${spec.state.toUpperCase()} · ${spec.title}`;
note.findOne(n => n.name === "Note text").characters = spec.note;
const cards = await L.frame(`Cards · ${spec.state}`, "VERTICAL"); await L.gap(cards, 32); blk.insertChild(1, cards); cards.layoutSizingHorizontal = "FILL";
const group = async (t, narrowCard) => { const g = await L.frame(narrowCard ? "Width · one third" : "Width · full row", "VERTICAL"); await L.gap(g, 8); cards.appendChild(g); const x = await L.text(t, "small5", "txSec", "Caption"); g.appendChild(x); const c = await card(spec, narrowCard); g.appendChild(c); return c; };
const full = await group("Full row · 680", false);
const narrow = await group("One third of a dashboard row · 376 (narrow)", true);
const cats = await figma.annotations.getAnnotationCategoriesAsync();
for (const [where, cat, txt] of spec.ann || []) { const n = where === "narrow" ? narrow : full; const cid = (cats.find(c => c.label.toLowerCase().startsWith(cat.toLowerCase())) || {}).id; try { n.annotations = [...(n.annotations || []), cid ? { label: txt, categoryId: cid } : { label: txt }]; } catch (e) { try { n.annotations = [...(n.annotations || []), { label: txt }]; } catch (e2) {} } }
blk.counterAxisSizingMode = "FIXED"; blk.resize(1440, blk.height);
return { block: blk.id, full: full.id, narrow: narrow.id, h: Math.round(blk.height) };
