async (ARGS) => {
// MDocs fill routine for EVO Cabinet (port of GEAP 2.0 tools/figma/mdocs/page.js „fill” mode, 2026-10-26).
const MAP = JSON.parse(figma.root.getSharedPluginData("mdport", "map"));
const GIDS = {"band": "13155:521113", "qr": "13155:521114", "chip": "13155:521126", "sectionTitle": "13155:521133", "kvRow": "13155:521146", "tableRow": "13155:521205", "para": "13155:521210", "point": "13155:521211", "party": "13155:521214", "signature": "13155:521235", "attRow": "13155:521244", "header": "13161:484267", "cont": "13161:484268", "title": "13161:484318", "parties": "13161:530893", "kv": "13161:530940", "table": "13161:531015", "text": "13161:531016", "outcome": "13161:531956", "signatures": "13161:531957", "attachments": "13161:531978", "footer": "13161:532002", "actRows": "13174:528244"};
const L = { ids: Object.fromEntries(Object.entries(GIDS).map(([k, g]) => [k, MAP[g]])), loc: JSON.parse(figma.root.getSharedPluginData("mdocs", "local")) };
for (const st of ["Regular", "Medium", "SemiBold"]) await figma.loadFontAsync({ family: "Onest", style: st });
const ids = L.ids;
const node = async (k) => await figma.getNodeByIdAsync(ids[k]);
const variant = async (k, props) => { const s = await node(k); return s.type === "COMPONENT_SET" ? s.children.find((c) => Object.entries(props).every(([p, v]) => c.name.split(", ").includes(`${p}=${v}`))) : s; };
const setP = (inst, map) => {
  const pr = {}; const defs = inst.componentProperties;
  for (const [name, val] of Object.entries(map)) { if (val === undefined) continue; const k = Object.keys(defs).find((x) => x.split("#")[0] === name); if (k) pr[k] = val; }
  if (Object.keys(pr).length) inst.setProperties(pr);
};
const kid = (inst, name) => inst.findOne((n) => n.name === name);
const slotOf = (inst) => inst.children.find((c) => c.type === "SLOT");
const FIX = new Set();
const TONE = { positive: "Approved", danger: "Refused", warning: "Suspended", info: "Info" };
const CHIP = { positive: "Positive", warning: "Warning", danger: "Danger", info: "Info", neutral: "Neutral" };
async function fillSlot(slot, items) { for (const c of [...slot.children]) c.remove(); for (const it of items) { slot.appendChild(it); try { it.layoutSizingHorizontal = FIX.has(it.id) ? "FIXED" : "FILL"; } catch (e) {} } }
// one module spec → one or more instances (not yet parented, except slot contents)
async function modules(m, ctx) {
  const out = [];
  const mk = async (k, props) => (await variant(k, props)).createInstance();
  if (m.m === "header") {
    const i = await mk("header", { Variant: { full: "Full", compact: "Compact", emblem: "Emblem" }[m.v] });
    setP(i, { Country: m.country, Authority: m.auth, Office: m.office || " ", "Show office": !!m.office, Address: m.contacts[0], Phone: m.contacts[1], Email: m.contacts[2], Web: m.contacts[3] });
    out.push(i);
  } else if (m.m === "continuation") {
    const i = await mk("cont", {}); setP(i, { Issuer: m.issuer, Document: m.doc }); out.push(i);
  } else if (m.m === "title") {
    const i = await mk("title", { Align: m.align === "center" ? "Center" : "Start" });
    const meta = m.meta || [];
    setP(i, { "Show top row": !!(m.over || m.chip), "Show overline": !!m.over, Overline: m.over || " ", "Show status": !!m.chip, Title: (m.titleLines || m.title), "Show decision line": !!m.sub, "Decision line": m.sub || " ",
      "Label 1": meta[0] ? meta[0][0] : " ", "Value 1": meta[0] ? meta[0][1] : " ", "Show pair 2": !!meta[1], "Label 2": meta[1] ? meta[1][0] : " ", "Value 2": meta[1] ? meta[1][1] : " ", "Show pair 3": !!meta[2], "Label 3": meta[2] ? meta[2][0] : " ", "Value 3": meta[2] ? meta[2][1] : " " });
    if (m.chip) { const st = kid(i, "Status"); const set = await node("chip"); st.swapComponent(set.children.find((c) => c.name === "Tone=" + CHIP[m.chip[1]])); setP(st, { Label: m.chip[0] }); }
    if (ctx.wide) { const t = i.findOne((n) => n.type === "TEXT" && n.name === "Title"); await t.setTextStyleIdAsync(L.loc.ts["Display · Wide"]); }
    out.push(i);
  } else if (m.m === "parties") {
    const n = Math.min(m.parties.length, 3);
    const i = await mk("parties", { Columns: n });
    m.parties.slice(0, 3).forEach((p, k) => { const pi = kid(i, "Party " + (k + 1)); setP(pi, { Role: p[0], Name: p[1], "Line 1": p[2] || " ", "Show line 1": !!p[2], "Line 2": p[3] || " ", "Show line 2": !!p[3] }); });
    out.push(i);
  } else if (m.m === "kv" && m.cols === "rows") {
    // act field rows: heading rows split the list into 1-column groups (same look as the code's rows module)
    const groups = []; let g = null;
    for (const r of m.rows) { if (r.length === 1) { g = { title: r[0], rows: [] }; groups.push(g); } else { if (!g) { g = { title: "", rows: [] }; groups.push(g); } g.rows.push(r); } }
    const i = (await node("actRows")).createInstance();
    const slot = slotOf(i); for (const c of [...slot.children]) c.remove();
    const ST = (await node("sectionTitle")).children.find((c) => c.name === "Rule=On");
    for (const gr of groups) {
      const f = figma.createFrame(); f.name = "Group"; f.fills = []; f.layoutMode = "VERTICAL"; slot.appendChild(f); f.layoutSizingHorizontal = "FILL"; f.layoutSizingVertical = "HUG";
      if (gr.title) { const h = ST.createInstance(); f.appendChild(h); h.layoutSizingHorizontal = "FILL"; setP(h, { Title: gr.title.replace(/ ?\(continuare\)$/, ""), Continued: /\(continuare\)$/.test(gr.title) || (!!m.cont && gr === groups[0]) }); }
      for (let k = 0; k < gr.rows.length; k++) { const r = gr.rows[k]; const ri = await mk("kvRow", { Layout: "Inline", Divider: k === gr.rows.length - 1 ? "Off" : "On" }); setP(ri, { Label: r[0], Value: r[1] || "—" }); f.appendChild(ri); ri.layoutSizingHorizontal = "FILL"; }
    }
    out.push(i);
  } else if (m.m === "kv") {
    const two = m.cols === 2;
    const i = await mk("kv", { Columns: two ? 2 : 1 });
    setP(i, { "Show title": !!m.title });
    if (m.title) setP(kid(i, "Section title"), { Title: m.title.replace(/ ?\(continuare\)$/, ""), Continued: /\(continuare\)$/.test(m.title) });
    const rows = [];
    for (let k = 0; k < m.rows.length; k++) { const r = m.rows[k]; const ri = await mk("kvRow", { Layout: two ? "Stacked" : "Inline", Divider: !two && k === m.rows.length - 1 ? "Off" : "On" }); setP(ri, { Label: r[0], Value: r[1] || "—" }); if (two) FIX.add(ri.id); rows.push(ri); }
    await fillSlot(slotOf(i), rows);
    out.push(i);
  } else if (m.m === "table") {
    const cols = m.cols.length >= 4 ? 4 : 3;
    const i = await mk("table", { Columns: cols });
    const cont = m.cont || /\(continuare\)/.test(m.title || "");
    setP(i, { "Show title": !!m.title, "Show total": !!m.total });
    if (m.title) setP(kid(i, "Section title"), { Title: m.title.replace(/ ?\(continuare\)$/, ""), Continued: cont });
    const cells = (arr) => Object.fromEntries(arr.map((v, k) => ["Cell " + (k + 1), v || " "]));
    setP(kid(i, "Header"), cells(m.head));
    if (m.total) setP(kid(i, "Total"), { "Cell 1": m.total[0], ["Cell " + cols]: m.total[m.total.length - 1] });
    const rows = [];
    for (let k = 0; k < m.rows.length; k++) { const ri = await mk("tableRow", { Columns: cols, Kind: m.total && k === m.rows.length - 1 ? "Body · no line" : "Body" }); setP(ri, cells(m.rows[k])); rows.push(ri); }
    await fillSlot(slotOf(i), rows);
    out.push(i);
  } else if (m.m === "text") {
    const i = await mk("text", {});
    setP(i, { "Show title": !!m.title });
    if (m.title) setP(kid(i, "Section title"), { Title: m.title.replace(/ ?\(continuare\)$/, ""), Continued: !!m.cont });
    const items = [];
    for (const it of m.items) {
      if (it[0] === "pt") { const p = (await node("point")).createInstance(); setP(p, { Number: it[1], Text: it[2] }); items.push(p); }
      else { const p = await mk("para", { Tone: m.closing ? "Closing" : "Default" }); setP(p, { Text: it[1] }); items.push(p); }
    }
    const slot = slotOf(i); for (const c of [...slot.children]) c.remove(); for (const it of items) slot.appendChild(it);
    out.push(i);
  } else if (m.m === "outcome") {
    const i = await mk("outcome", { Tone: TONE[m.tone] || "Info" }); setP(i, { Title: m.title, Text: m.text || " ", "Show text": !!m.text }); out.push(i);
  } else if (m.m === "signatures") {
    const i = await mk("signatures", {});
    const items = [];
    for (const s of m.signers) { const si = await mk("signature", { State: s[0] === "pending" ? "Pending" : "Signed" }); setP(si, { Role: s[2] || " ", "Show role": !!s[2], Name: s[3], Meta: s[4] }); items.push(si); }
    const slot = slotOf(i); for (const c of [...slot.children]) c.remove(); for (const it of items) slot.appendChild(it);
    out.push(i);
  } else if (m.m === "attachments") {
    const i = await mk("attachments", {});
    if (m.title) setP(kid(i, "Section title"), { Title: m.title });
    const rows = [];
    for (let k = 0; k < m.items.length; k++) { const a = m.items[k]; const ri = await mk("attRow", { Divider: k === m.items.length - 1 ? "Off" : "On" }); setP(ri, { Number: a[0], Name: a[1], Meta: a[2] || " " }); rows.push(ri); }
    await fillSlot(slotOf(i), rows);
    out.push(i);
  } else if (m.m === "footer") {
    const i = await mk("footer", {}); setP(i, { Link: m.link, "Legal 1": m.legal[0], "Legal 2": m.legal[1] || " ", "Legal 3": m.legal[2] || " ", Page: m.page }); out.push(i);
  }
  for (const o of out) o.name = o.name.replace(/^MDocs \/ /, "");
  return out;
}
async function flowItems(spec, ctx) { const items = []; for (const m of spec) if (!["header", "title", "continuation", "footer"].includes(m.m)) items.push(...(await modules(m, ctx))); return items; }
async function page(name, spec, ctx) {
  const cont = spec[0].m === "continuation";
  const c = figma.createComponent(); c.name = name; c.resize(794, 1123);
  c.layoutMode = "VERTICAL"; c.primaryAxisSizingMode = "FIXED"; c.counterAxisSizingMode = "FIXED"; c.itemSpacing = 0; c.clipsContent = false;
  await L.sp(c, "paddingTop", 57); await L.sp(c, "paddingRight", 68); await L.sp(c, "paddingBottom", 45); await L.sp(c, "paddingLeft", 68);
  c.fills = [await L.paint("background/base/default")];
  c.resize(794, 1123);
  const band = (await node("band")).createInstance(); c.appendChild(band); band.layoutPositioning = "ABSOLUTE"; band.x = 0; band.y = 0; band.constraints = { horizontal: "STRETCH", vertical: "MIN" }; band.name = "Band";
  for (const m of spec.filter((x) => ["header", "title", "continuation"].includes(x.m))) for (const i of await modules(m, ctx)) { c.appendChild(i); i.layoutSizingHorizontal = "FILL"; }
  const before = Object.keys(c.componentPropertyDefinitions);
  const slot = c.createSlot();
  const key = Object.keys(c.componentPropertyDefinitions).find((k) => !before.includes(k));
  c.editComponentProperty(key, { name: "Flow" });
  slot.name = "Flow"; slot.layoutMode = "VERTICAL"; await L.sp(slot, "itemSpacing", 23); await L.sp(slot, cont ? "paddingTop" : "paddingBottom", 26); if (cont) await L.sp(slot, "paddingBottom", 26);
  slot.layoutSizingHorizontal = "FILL"; slot.layoutSizingVertical = "FILL";
  for (const i of await flowItems(spec, ctx)) { slot.appendChild(i); i.layoutSizingHorizontal = "FILL"; }
  const f = spec.find((x) => x.m === "footer");
  if (f) for (const i of await modules(f, ctx)) { c.appendChild(i); i.layoutSizingHorizontal = "FILL"; }
  return c;
}
if (false) {
  const comps = [];
  for (const v of ARGS.variants) comps.push(await page(v.name, v.spec, { wide: !!v.wide }));
  const sec = await node("lcSection");
  let set;
  if (comps.length) {
    set = figma.combineAsVariants(comps, sec);
    set.name = ARGS.set; set.description = ARGS.desc || "";
    set.layoutMode = "HORIZONTAL"; set.itemSpacing = 80; set.paddingTop = set.paddingBottom = set.paddingLeft = set.paddingRight = 80; set.primaryAxisSizingMode = "AUTO"; set.counterAxisSizingMode = "AUTO";
    set.fills = [await L.paint("background/base/secondary")];
  }
  // overflow check: the flow must fit above the footer
  const fit = comps.map((c) => { const s = c.children.find((k) => k.type === "SLOT"); const used = s.children.reduce((a, k) => a + k.height, 0) + (s.children.length - 1) * 23 + s.paddingTop + s.paddingBottom; return [c.name, Math.round(s.height), Math.round(used)]; });
  return { set: set.id, variants: comps.map((c) => c.id), fit };
}
if (ARGS.mode === "fill") {
  const inst = await figma.getNodeByIdAsync(ARGS.inst);
  const ctx = { wide: !!ARGS.wide };
  // head + footer props from the spec
  for (const m of ARGS.spec) {
    if (["header", "continuation", "title", "footer"].includes(m.m)) {
      const target = inst.children.find((k) => k.type === "INSTANCE" && k.name === { header: "Header", continuation: "Continuation header", title: "Title block", footer: "Footer" }[m.m]);
      if (!target) continue;
      const tmp = (await modules(m, ctx))[0];
      // copy the new instance's main + property values onto the existing nested instance
      target.swapComponent(tmp.mainComponent);
      const vals = {}; for (const [k, v] of Object.entries(tmp.componentProperties)) if (v.type !== "VARIANT" && v.type !== "SLOT") vals[k] = v.value; try { target.setProperties(vals); } catch (e) {}
      if (m.m === "title" && m.chip) { const st = kid(target, "Status"); const set = await node("chip"); st.swapComponent(set.children.find((c) => c.name === "Tone=" + CHIP[m.chip[1]])); setP(st, { Label: m.chip[0] }); }
      if (m.m === "parties") {}
      tmp.remove();
    }
  }
  const slot = inst.children.find((k) => k.type === "SLOT");
  for (const c of [...slot.children]) c.remove();
  for (const i of await flowItems(ARGS.spec, ctx)) { slot.appendChild(i); i.layoutSizingHorizontal = "FILL"; }
  return { inst: inst.id, flow: slot.children.length };
}

}