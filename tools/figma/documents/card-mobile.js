// Document · card — mobile layout + separators (code e9858260, components.md „Documents — one pattern everywhere”).
// Params (prepend): const SET_ID = "11364:7441"; const ONLY = null | ["variantId", …] | ((variant) => bool);
// Per variant (idempotent — skips a Meta that already has „Rânduri”):
//  • Meta = clip frame around „Rânduri”; every item is a „Parte · X” = text + an ABSOLUTE 4px „Punct” at x −10, y 8
//    (parts 16 apart = 6 · dot 4 · 6). The part that starts a line has its dot left of Meta → clipped, so no dot ever
//    starts or ends a line (= the code's clip-path). Negative gaps / paddings don't work: Figma clamps children at the
//    padding edge.
//    Desktop: one WRAP row (parts in order). Mobil: the same WRAP row with forced breaks „Rând nou” (FIXED 1000 × 0.01, empty,
//    = the code's zero-height 100% `__break`): [Număr] br(← Arată număr) [Fișier · Dimensiune] br [Data · De]. Line FRAMES
//    don't work: a hug frame whose children are all hidden keeps its last height, and „file OR size” has no boolean.
//  • Mobil card: padding 12, items top, gap 12; Conținut paddingTop 2 (title line centre = icon centre = 24);
//    × ABSOLUTE top-right at y 8 (centre 24), check at y padTop+2; title FILL, 2 lines, ellipsis; tags wrap gap 4;
//    labelled actions (Cabinet „Detalii ⋮”, Act anterior „Descarcă”) under the text in „Coloană” (gap 12).
const set = await figma.getNodeByIdAsync(SET_ID);
figma.skipInvisibleInstanceChildren = false;
const fonts = new Set(); for (const t of set.findAll((n) => n.type === "TEXT")) for (const s of t.getStyledTextSegments(["fontName"])) fonts.add(JSON.stringify(s.fontName));
for (const f of fonts) await figma.loadFontAsync(JSON.parse(f));
const out = [];
const DEF = Object.fromEntries(Object.entries(set.componentPropertyDefinitions).map(([k, v]) => [k, v.defaultValue]));
const ORDER = ["Număr", "Fișier", "Dimensiune", "Data", "De"];
const frame = (name, dir) => { const f = figma.createFrame(); f.name = name; f.layoutMode = dir; f.fills = []; f.clipsContent = false; f.itemSpacing = 0; f.counterAxisSizingMode = "AUTO"; f.primaryAxisSizingMode = "AUTO"; return f; };
for (const v of set.children) {
  if (ONLY && !(typeof ONLY === "function" ? ONLY(v) : ONLY.includes(v.id))) continue;
  const mobile = v.variantProperties.Ecran === "Mobil";
  const ctx = v.variantProperties.Context;
  const meta = v.findOne((n) => n.name === "Meta" && n.type === "FRAME");
  const log = { id: v.id, ctx, mobile };
  // reparenting drops componentPropertyReferences → snapshot by node id now, re-apply at the end (texts keep ids)
  const REFS = new Map(); for (const n of v.findAll(() => true)) { const r = n.componentPropertyReferences; if (r && Object.keys(r).length) REFS.set(n.id, { ...r }); }
  const restore = () => { for (const [id, r] of REFS) { const n = v.findOne((k) => k.id === id); if (!n) continue; let r2 = { ...r };
    if (n.type === "TEXT" && /^(Număr|Fișier|Dimensiune|Data|De)$/.test(n.name) && n.parent && /^Parte · /.test(n.parent.name)) { if (r2.visible) { n.parent.componentPropertyReferences = { visible: r2.visible }; delete r2.visible; } }
    if (/^Punct/.test(n.name) && n.parent && /^Parte · /.test(n.parent.name)) r2 = {};
    const cur = n.componentPropertyReferences || {}; if (JSON.stringify(cur) !== JSON.stringify(r2)) n.componentPropertyReferences = r2; }
    const K = (name) => Object.keys(set.componentPropertyDefinitions).find((k) => k.split("#")[0] === name);
    const b1 = v.findOne((n) => n.name === "Rând nou · după număr");
    if (b1) b1.componentPropertyReferences = { visible: K("Arată număr") }; };
  if (!meta) { log.err = "no Meta"; out.push(log); continue; }
  const cont = meta.parent; // Conținut
  // ---------- card shell (mobile) ----------
  if (mobile) {
    v.counterAxisAlignItems = "MIN"; v.itemSpacing = 12;
    v.paddingTop = v.paddingBottom = v.paddingLeft = v.paddingRight = 12;
    const sw = v.strokes.length && v.strokesIncludedInLayout ? v.strokeWeight : 0;
    cont.paddingTop = 2;
    let host = cont; // where the content column lives (Conținut or Coloană)
    const act = v.children.find((n) => n.name === "Descarcă" && n.type === "INSTANCE");
    let col = v.children.find((n) => n.name === "Coloană");
    if (act && !col) { // Act anterior: Descarcă under the text
      col = frame("Coloană", "VERTICAL"); col.itemSpacing = 12; v.insertChild(v.children.indexOf(cont), col);
      col.appendChild(cont); const acts = frame("Acțiuni", "HORIZONTAL"); acts.itemSpacing = 8; acts.counterAxisAlignItems = "CENTER"; col.appendChild(acts); acts.appendChild(act);
      col.layoutSizingHorizontal = "FILL"; col.layoutSizingVertical = "HUG"; acts.layoutSizingHorizontal = "HUG"; acts.layoutSizingVertical = "HUG";
    }
    if (col) { col.itemSpacing = 12; col.counterAxisAlignItems = "MIN"; col.layoutSizingHorizontal = "FILL"; col.layoutSizingVertical = "HUG"; cont.layoutSizingHorizontal = "FILL"; cont.layoutSizingVertical = "HUG"; host = col; }
    else { cont.layoutSizingHorizontal = "FILL"; cont.layoutSizingVertical = "HUG"; }
    const x = v.children.find((n) => /^Elimină/.test(n.name) && n.type === "INSTANCE");
    const chk = v.children.find((n) => /^Bifă/.test(n.name) && n.type === "INSTANCE");
    let side = 0;
    if (x) { x.layoutPositioning = "ABSOLUTE"; x.constraints = { horizontal: "MAX", vertical: "MIN" }; x.x = v.width - 12 - sw - x.width; x.y = 12 + sw - 4; side = x.width + 12; }
    if (chk) { chk.layoutPositioning = "ABSOLUTE"; chk.constraints = { horizontal: "MAX", vertical: "MIN" }; chk.x = v.width - 12 - sw - chk.width; chk.y = 12 + sw + 2; side = chk.width + 12; }
    host.paddingRight = side;
    const te = cont.findOne((n) => n.name === "Titlu și etichete");
    const title = te && te.findOne((n) => n.name === "Titlu" && n.type === "TEXT");
    if (te && !te.findOne((n) => n.name === "Etichete")) { // title + tags in one wrap row (Cabinet copy) → tags get their own row
      const tg = frame("Etichete", "HORIZONTAL"); const ins = te.children.filter((n) => n.type === "INSTANCE"); te.appendChild(tg); for (const n of ins) tg.appendChild(n); }
    if (te) { te.layoutMode = "VERTICAL"; te.layoutWrap = "NO_WRAP"; te.itemSpacing = 4; te.counterAxisAlignItems = "MIN"; te.layoutSizingHorizontal = "FILL"; te.layoutSizingVertical = "HUG"; }
    if (title) { title.layoutSizingHorizontal = "FILL"; title.textAutoResize = "HEIGHT"; title.textTruncation = "ENDING"; title.maxLines = 2; }
    const tags = te && te.findOne((n) => n.name === "Etichete" && n.type === "FRAME");
    if (tags) { tags.layoutWrap = "WRAP"; tags.itemSpacing = 4; tags.counterAxisSpacing = 4; tags.layoutSizingHorizontal = "FILL"; tags.layoutSizingVertical = "HUG"; }
    log.side = side;
  }
  // ---------- meta ----------
  const brk = (name) => { const b = figma.createFrame(); b.name = name; b.fills = []; b.clipsContent = false; b.resize(1000, 0.01); return b; };
  const flat = (rows) => { // mobile: one WRAP row with forced breaks (also migrates the first build's line frames)
    const P = (n) => rows.findOne((k) => k.name === "Parte · " + n);
    const seq = [P("Număr"), rows.findOne((k) => k.name === "Rând nou · după număr") || brk("Rând nou · după număr"), P("Fișier"), P("Dimensiune"), rows.findOne((k) => k.name === "Rând nou · înainte de dată") || brk("Rând nou · înainte de dată"), P("Data"), P("De")];
    for (const k of seq) rows.appendChild(k);
    for (const k of [...rows.children]) if (/^Rând · /.test(k.name)) k.remove();
    rows.layoutMode = "HORIZONTAL"; rows.layoutWrap = "WRAP"; rows.itemSpacing = 16; rows.counterAxisSpacing = 0; rows.counterAxisAlignItems = "MIN";
    rows.layoutSizingHorizontal = "FILL"; rows.layoutSizingVertical = "HUG"; // VERTICAL → HORIZONTAL swaps the axes: hug height became FIXED
    for (const k of seq) if (/^Rând nou/.test(k.name)) { k.layoutSizingHorizontal = "FIXED"; k.layoutSizingVertical = "FIXED"; }
  };
  const norm = () => { // idempotent geometry of the meta (also repairs an earlier spacer build)
    const sp = meta.findOne((n) => n.name === "Decalaj punct"); if (sp) sp.remove();
    const rw = meta.findOne((n) => n.name === "Rânduri"); if (mobile && rw) flat(rw);
    meta.layoutMode = "HORIZONTAL"; meta.layoutWrap = "NO_WRAP"; meta.itemSpacing = 0; meta.clipsContent = true; meta.fills = [];
    for (const r of meta.findAll((n) => n.name === "Rânduri")) r.itemSpacing = 16;
    for (const p of meta.findAll((n) => /^Parte · /.test(n.name))) { p.itemSpacing = 0; p.clipsContent = false; const d = p.findOne((n) => n.name === "Punct"); if (d) { if (d.layoutPositioning !== "ABSOLUTE") d.layoutPositioning = "ABSOLUTE"; d.constraints = { horizontal: "MIN", vertical: "MIN" }; d.x = -10; d.y = 8; } }
  };
  if (meta.findOne((n) => n.name === "Rânduri")) { norm(); if (mobile) { const C = meta.width; const f = meta.findOne((n) => n.name === "Fișier" && n.type === "TEXT"); f.maxWidth = C - 64; for (const n of ["Număr", "Data", "De"]) meta.findOne((k) => k.name === n && k.type === "TEXT").maxWidth = C; } restore(); log.meta = "normalised"; log.h = Math.round(v.height); out.push(log); continue; }
  const T = {}, D = {};
  for (const n of ORDER) T[n] = meta.findOne((k) => k.name === n && k.type === "TEXT");
  for (const d of meta.findAll((k) => /^Punct · /.test(k.name))) D[d.name.replace("Punct · ", "")] = d;
  const tpl = Object.values(D)[0];
  if (!tpl || ORDER.some((n) => !T[n])) { log.err = "missing texts/dots"; out.push(log); continue; }
  const gapRow = meta.counterAxisSpacing ?? 0;
  const parts = {};
  for (const n of ORDER) {
    const t = T[n];
    const p = frame("Parte · " + n, "HORIZONTAL"); p.itemSpacing = 6; p.counterAxisAlignItems = "CENTER";
    let d = D[n]; if (!d) { d = tpl.clone(); }
    meta.appendChild(p); p.appendChild(d); p.appendChild(t);
    d.name = "Punct"; d.visible = true; t.visible = true;
    parts[n] = p;
  }
  for (const d of Object.values(D)) if (!d.removed && d.parent === meta) d.remove();
  const rows = frame("Rânduri", "HORIZONTAL");
  rows.layoutWrap = "WRAP"; rows.itemSpacing = 16; rows.counterAxisSpacing = mobile ? 0 : gapRow; for (const n of ORDER) rows.appendChild(parts[n]);
  // meta = clip frame; norm() puts each dot at x −10 of its part (clipped when the part starts a line)
  meta.counterAxisAlignItems = "MIN"; meta.primaryAxisAlignItems = "MIN";
  meta.appendChild(rows); rows.layoutSizingHorizontal = "FILL"; rows.layoutSizingVertical = "HUG";
  meta.layoutSizingHorizontal = "FILL"; meta.layoutSizingVertical = "HUG";
  for (const n of ORDER) { parts[n].layoutSizingHorizontal = "HUG"; parts[n].layoutSizingVertical = "HUG"; }
  norm();
  if (mobile) {
    const C = meta.width; // content column width
    for (const n of ["Număr", "Data", "De"]) { T[n].textAutoResize = "WIDTH_AND_HEIGHT"; T[n].maxWidth = C; }
    const f = T["Fișier"]; f.textAutoResize = "WIDTH_AND_HEIGHT"; f.maxWidth = C - 64; f.textTruncation = "ENDING"; f.maxLines = 1;
    T["Dimensiune"].maxWidth = null;
    log.C = Math.round(C);
  } else { for (const n of ORDER) { T[n].textAutoResize = "WIDTH_AND_HEIGHT"; T[n].maxWidth = null; } }
  restore();
  log.refs = v.findAll((n) => n.componentPropertyReferences && Object.keys(n.componentPropertyReferences).length).length;
  log.h = Math.round(v.height); out.push(log);
}
// binding a „visible” ref rewrites the property DEFAULT from the bound layer (Arată număr went false → true once) → restore
for (const [k, d] of Object.entries(DEF)) { const def = set.componentPropertyDefinitions[k]; if (def && def.type === "BOOLEAN" && def.defaultValue !== d) set.editComponentProperty(k, { defaultValue: d }); }
return out;
