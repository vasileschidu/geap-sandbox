// Section header with an action — ONE pattern (code a89b5c0b, components.md „Section header with an action”).
// Normalises every BO section-heading row that carries an action (button / ⋮ menu button / segmented, ± meta) on one page:
//   row      HORIZONTAL, padding 0 / 12 (right, spacings/12) / 0 / 0, gap 12, counter CENTER, height = the title's 48
//            (rows with a 52 segmented control: FIXED 48, the control overflows ±2 like the code)
//   title    frame: padding 0 / 12 / 0 / 12, minHeight 48 (spacings/48), text = Desktop/Heading/H5 (18/26 600)
//            svc/section-heading instance: the main carries minHeight 48 + H5 (fixed 2026-10-16)
//            bare TEXT first child (NT „Previzualizare”): row paddingLeft 12
//   tools    padding 0, gap 12, CENTER, HUG; meta wrappers padding 0 (meta → button = the tools' 12 gap)
// Skips: link-only rows (Ultimele modificări = link flush right, as in code), list toolbars (pay__toolbar),
// rows inside instances. Flow anchors over a moved action are shifted by the action's delta.
// Snapshot per row: shared plugin data geapqa / sh-20261016 (JSON of the old values) — MODE "revert" restores.
// Run: use_figma with OPT = { page: "<page id>", mode: "dry" | "apply" | "revert", file: "geap" | "ekyc" }.
const OPT = { page: "PAGE_ID", mode: "dry" };
const KEY = "sh-20261016";
const SP = { 0: "09bbd3605451b3c79ea224d8e2e42a6830817f77", 12: "ee4801fea560b76dffab59bd8ee6e31e3b636570", 48: "2a030f2d03121ff975816aa58b5b51e550b62df9" };
const H5 = "75e7dfdca13a793cb25b8e6cb5949ad59c850c85";
const pg = await figma.getNodeByIdAsync(OPT.page); await figma.setCurrentPageAsync(pg);
const V = {}; for (const k of Object.keys(SP)) V[k] = await figma.variables.importVariableByKeyAsync(SP[k]);
const h5 = await figma.importStyleByKeyAsync(H5); await figma.loadFontAsync(h5.fontName);
const setName = (i) => { const mc = i.mainComponent; if (!mc) return "?"; return mc.parent && mc.parent.type === "COMPONENT_SET" ? mc.parent.name : mc.name; };
const isAction = (n) => n.type === "INSTANCE" && /button|link|segmented/i.test(setName(n));
const inInst = (n) => { let p = n.parent; while (p && p.type !== "PAGE") { if (p.type === "INSTANCE") return true; p = p.parent; } return false; };
const PADS = ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"];
const bind = (n, f, v) => { n.setBoundVariable(f, null); n[f] = v; if (V[v]) n.setBoundVariable(f, V[v]); };
const snapOf = (n) => n && ({ id: n.id, pad: PADS.map((p) => n[p]), padBV: PADS.map((p) => (n.boundVariables && n.boundVariables[p] ? n.boundVariables[p].id : null)), gap: n.itemSpacing,
  gapBV: n.boundVariables && n.boundVariables.itemSpacing ? n.boundVariables.itemSpacing.id : null, ca: n.counterAxisAlignItems, sh: n.layoutSizingHorizontal, sv: n.layoutSizingVertical,
  h: n.height, minH: n.minHeight, clip: n.clipsContent });

if (OPT.mode === "revert") {
  let n = 0;
  for (const r of pg.findAll((x) => !x.id.includes(";") && x.getSharedPluginData && x.getSharedPluginData("geapqa", KEY))) {
    const s = JSON.parse(r.getSharedPluginData("geapqa", KEY));
    for (const o of s.nodes) { const x = await figma.getNodeByIdAsync(o.id); if (!x) continue;
      for (let i = 0; i < 4; i++) { const p = PADS[i]; x.setBoundVariable(p, null); x[p] = o.pad[i]; if (o.padBV[i]) x.setBoundVariable(p, await figma.variables.getVariableByIdAsync(o.padBV[i])); }
      x.setBoundVariable("itemSpacing", null); x.itemSpacing = o.gap; if (o.gapBV) x.setBoundVariable("itemSpacing", await figma.variables.getVariableByIdAsync(o.gapBV));
      x.counterAxisAlignItems = o.ca; x.setBoundVariable("minHeight", null); x.minHeight = o.minH; x.layoutSizingHorizontal = o.sh; x.layoutSizingVertical = o.sv;
      if (o.sv === "FIXED") x.resize(x.width, o.h); x.clipsContent = o.clip; }
    for (const t of s.texts || []) { const x = await figma.getNodeByIdAsync(t.id); if (x && t.style) { await figma.loadFontAsync(x.fontName); await x.setTextStyleIdAsync(t.style); } }
    r.setSharedPluginData("geapqa", KEY, ""); n++;
  }
  return { reverted: n };
}

// 1 · find the rows (same logic as the census)
const texts = pg.findAllWithCriteria({ types: ["TEXT"] }).filter((t) => (t.fontSize === 18 || t.fontSize === 20) && t.fontWeight >= 500 && t.characters.length < 60);
const rows = new Map();
for (const t of texts) {
  let p = t.parent, row = null;
  for (let k = 0; k < 5 && p && p.type !== "PAGE" && p.type !== "SECTION"; k++) {
    if ((p.type === "FRAME" || p.type === "INSTANCE") && p.layoutMode === "HORIZONTAL" && p.height >= 36 && p.height <= 64 && p.width >= 300 && p.findAll(isAction).length) { row = p; break; }
    p = p.parent;
  }
  if (!row || rows.has(row.id) || row.type !== "FRAME" || inInst(row)) continue;
  if (/toolbar|Text Container|^Head$/.test(row.name)) continue;
  const acts = row.findAll(isAction);
  if (acts.every((a) => setName(a) === "link")) continue;               // link-only = not this pattern
  rows.set(row.id, { row, text: t });
}
const anchors = pg.findAll((n) => /^anchor · /.test(n.name));
const res = { page: pg.name, rows: rows.size, changed: 0, anchorsMoved: 0, list: {} };
for (const { row, text } of rows.values()) {
  const kids = row.children.filter((c) => c.visible);
  const T = kids[0];
  const tools = kids.slice(1).filter((c) => c.type === "FRAME");
  const acts = row.findAll(isAction);
  const tall = acts.some((a) => a.height > 48);
  const key = text.characters + " | " + (T.type === "INSTANCE" ? "I:" + setName(T) : T.type) + " | " + row.name;
  res.list[key] = (res.list[key] || 0) + 1;
  if (OPT.mode !== "apply") continue;
  if (row.getSharedPluginData("geapqa", KEY)) continue;                  // already normalised
  const before = acts.map((a) => a.absoluteBoundingBox);
  const snapNodes = [row, T.type === "FRAME" ? T : null, ...tools, ...tools.flatMap((f) => f.children.filter((c) => c.type === "FRAME"))].filter(Boolean);
  row.setSharedPluginData("geapqa", KEY, JSON.stringify({ nodes: snapNodes.map(snapOf), texts: [{ id: text.id, style: text.textStyleId }] }));
  // row
  bind(row, "paddingTop", 0); bind(row, "paddingBottom", 0); bind(row, "paddingRight", 12);
  bind(row, "paddingLeft", T.type === "TEXT" ? 12 : 0);
  const metaInHeading = T.type === "INSTANCE" && Object.entries(T.componentProperties).some(([k, v]) => /^Show meta/.test(k) && v.value === true);
  bind(row, "itemSpacing", metaInHeading ? 0 : 12);
  row.counterAxisAlignItems = "CENTER";
  if (row.parent && row.parent.layoutMode === "VERTICAL") row.layoutSizingHorizontal = "FILL";
  // title
  if (T.type === "FRAME") {
    bind(T, "paddingTop", 0); bind(T, "paddingBottom", 0); bind(T, "paddingLeft", 12); bind(T, "paddingRight", 12);
    T.minHeight = 48; T.setBoundVariable("minHeight", V[48]);
    T.counterAxisAlignItems = "CENTER"; T.layoutSizingHorizontal = "FILL"; T.layoutSizingVertical = "HUG";
  } else if (T.type === "INSTANCE") { T.layoutSizingHorizontal = "FILL"; T.layoutSizingVertical = "HUG"; }
  else if (T.type === "TEXT") { T.layoutGrow = 1; }
  if (text.textStyleId !== h5.id && !inInst(text)) await text.setTextStyleIdAsync(h5.id);
  // tools
  for (const f of tools) {
    for (const p of PADS) bind(f, p, 0);
    bind(f, "itemSpacing", 12); f.counterAxisAlignItems = "CENTER"; f.layoutSizingHorizontal = "HUG"; f.layoutSizingVertical = "HUG";
    for (const m of f.children.filter((c) => c.type === "FRAME" && c.findAll((x) => x.type === "INSTANCE").length === 0)) { for (const p of PADS) bind(m, p, 0); m.layoutSizingVertical = "HUG"; }
  }
  // height: the title's 48; a 52 segmented overflows like the code
  if (tall) { row.layoutSizingVertical = "FIXED"; row.resize(row.width, 48); row.clipsContent = false; }
  else row.layoutSizingVertical = "HUG";
  // anchors over an action follow it
  acts.forEach((a, i) => { const b0 = before[i], b1 = a.absoluteBoundingBox; const dx = b1.x - b0.x, dy = b1.y - b0.y; if (!dx && !dy) return;
    for (const an of anchors) { const ab = an.absoluteBoundingBox; const cx = ab.x + ab.width / 2, cy = ab.y + ab.height / 2;
      if (cx >= b0.x && cx <= b0.x + b0.width && cy >= b0.y && cy <= b0.y + b0.height) { an.x += dx; an.y += dy; res.anchorsMoved++; } } });
  res.changed++;
}
res.list = Object.entries(res.list).map(([k, v]) => v + " × " + k);
return res;
