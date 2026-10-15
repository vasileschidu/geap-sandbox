// Document · card v3 — code 9804960e (components.md „Card layout” / „Meta = the stack meta” / „One card surface”).
// Params (prepend): const SET_ID = "11364:7441"; const ONLY = null | ["variantId", …];
//   const K = { caption: "<Desktop/Caption/Medium key>", title: "<Desktop/Body/Small 500 key>",
//               sp2, sp4, sp8, sp12, sp32, r12, bgSecondary, textTertiary }
//   Foundations lk-e9e8 keys: caption 8d8e3878…, title 057521fd…, sp2 4e3c6037…, sp4 983c5b4d…, sp8 69ac88e4…, sp12 ee4801fe…,
//   sp32 d1bd20c7…, r12 1f226805…, bgSecondary 2099ba93…, textTertiary 9d5ad1d8… (same keys in GEAP, FOD, Cabinet)   // library keys (variables / styles)
// Per variant (idempotent):
//  • shell: padding 12, gap 12, radius 12 (variables); fill = background/base/secondary for Field value / Summary /
//    Previous permit / Cabinet Default (picker Selector / Selected and the hover fills stay).
//  • icon centred on title + meta (card counterAxis CENTER); mobile cards with labelled actions = VERTICAL card
//    [Top (icon + content, centred) / Actions (paddingLeft 36 = icon 24 + gap 12)].
//  • Content: VERTICAL gap 4 = [Title and tags, Meta]. Title and tags = WRAP row gap 4 / row gap 4:
//    „Title box” (HUG, paddingRight 4 → title·8·tag) > Title (1 line, ending ellipsis) · tags (4 apart).
//    paddingRight 44 with × (32 + 12), 32 with the picker check (20 + 12).
//  • × ABSOLUTE top-right, y 6 (centre = title centre 22); check ABSOLUTE y 12.
//  • Meta = stack meta: Desktop/Caption/Medium 12 text/base/tertiary; parts HUG with padding 2/0/2/0 (20 high lines),
//    2px dot ABSOLUTE at x −10 / y 9; Rows WRAP gap 18 (8 · 2 · 8) / 0; Meta clips the dot of the part that starts a
//    line. No forced line breaks (the „New row” frames are removed).
const set = await figma.getNodeByIdAsync(SET_ID);
figma.skipInvisibleInstanceChildren = false;
const V = {}; for (const k of ["sp2", "sp4", "sp8", "sp12", "sp32", "r12", "bgSecondary", "textTertiary"]) V[k] = await figma.variables.importVariableByKeyAsync(K[k]);
const capStyle = await figma.importStyleByKeyAsync(K.caption); const titleStyle = await figma.importStyleByKeyAsync(K.title);
await figma.loadFontAsync(capStyle.fontName); await figma.loadFontAsync(titleStyle.fontName);
const fonts = new Set(); for (const t of set.findAll((n) => n.type === "TEXT")) for (const s of t.getStyledTextSegments(["fontName"])) fonts.add(JSON.stringify(s.fontName));
for (const f of fonts) await figma.loadFontAsync(JSON.parse(f));
const DEF = Object.fromEntries(Object.entries(set.componentPropertyDefinitions).map(([k, v]) => [k, v.defaultValue]));
const setNum = (n, p, val) => { if (val && typeof val === "object") { if (val.v) { n.setBoundVariable(p, val.v); return; } val = val.n; }
  try { n.setBoundVariable(p, null); } catch (e) {} n[p] = val || 0; };
const bindPad = (n, top, right, bottom, left) => { setNum(n, "paddingTop", top); setNum(n, "paddingRight", right); setNum(n, "paddingBottom", bottom); setNum(n, "paddingLeft", left); };
const bindGap = (n, val, cross) => { setNum(n, "itemSpacing", val); if (cross !== undefined && n.layoutWrap === "WRAP") setNum(n, "counterAxisSpacing", cross); };
const S = (v, n) => ({ v, n }); // bound value (v = variable or null, n = number)
const sp2 = S(V.sp2, 2), sp4 = S(V.sp4, 4), sp8 = S(V.sp8, 8), sp12 = S(V.sp12, 12), sp32 = S(V.sp32, 32);
// raw colour = the variable's resolved value (a 0.5 grey placeholder renders as-is in screenshots / thumbnails)
const paint = (variable, node) => { const c = variable.resolveForConsumer(node).value; return figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: c.r, g: c.g, b: c.b } }, "color", variable); };
const own = (n) => !n.id.includes(";");
const ORDER = ["Number", "File", "Size", "Data", "By"];
const out = [];
for (const v of set.children) {
  if (ONLY && !ONLY.includes(v.id)) continue;
  const vp = v.variantProperties; const mobile = vp.Screen === "Mobile"; const ctx = vp.Context;
  const log = { id: v.id, k: `${ctx}/${vp.Source}/${vp.State}/${vp.Screen}` };
  const REFS = new Map(); for (const n of v.findAll(own)) { const r = n.componentPropertyReferences; if (r && Object.keys(r).length) REFS.set(n.id, { ...r }); }
  const W = v.width;
  const find = (pred) => v.findOne((n) => own(n) && pred(n));
  const icon = find((n) => n.name === "Icon" && n.type === "INSTANCE");
  const content = find((n) => n.name === "Content" && n.type === "FRAME");
  const titleRow = content.findOne((n) => n.name === "Title and tags");
  const title = titleRow.findOne((n) => n.type === "TEXT" && own(n));
  const tags = titleRow.findAll((n) => n.type === "INSTANCE" && own(n) && /^Tag · /.test(n.name));
  const meta = content.findOne((n) => n.name === "Meta" && n.type === "FRAME");
  const rows = meta.findOne((n) => n.name === "Rows");
  const x = find((n) => n.type === "INSTANCE" && /^Remove/.test(n.name));
  const chk = find((n) => n.type === "INSTANCE" && /^Checkmark/.test(n.name));
  let acts = find((n) => n.name === "Actions" && n.type === "FRAME");
  const dl = find((n) => n.type === "INSTANCE" && n.name === "Download");
  const col = v.children.find((n) => n.name === "Column");
  let top = v.children.find((n) => n.name === "Top");
  const hasActs = !!(acts || dl);
  // ---- shell
  if (mobile && hasActs) {
    if (!top) { top = figma.createAutoLayout("HORIZONTAL"); top.name = "Top"; top.fills = []; v.insertChild(0, top); }
    top.appendChild(icon); top.appendChild(content);
    if (!acts) { acts = figma.createAutoLayout("HORIZONTAL"); acts.name = "Actions"; acts.fills = []; }
    if (dl && dl.parent !== acts) acts.appendChild(dl);
    v.appendChild(acts);
    if (col && !col.removed && col.children.length === 0) col.remove(); else if (col && !col.removed) { log.colLeft = col.children.map((c) => c.name); }
    v.layoutMode = "VERTICAL"; v.resize(W, v.height); v.counterAxisSizingMode = "FIXED"; v.primaryAxisSizingMode = "AUTO";
    v.counterAxisAlignItems = "MIN";
    top.counterAxisAlignItems = "CENTER"; bindGap(top, sp12); bindPad(top, 0, 0, 0, 0); top.clipsContent = false;
    top.layoutSizingHorizontal = "FILL"; top.layoutSizingVertical = "HUG";
    acts.counterAxisAlignItems = "CENTER"; bindGap(acts, sp8); bindPad(acts, 0, 0, 0, 36); acts.clipsContent = false;
    acts.layoutSizingHorizontal = "HUG"; acts.layoutSizingVertical = "HUG";
    content.layoutSizingHorizontal = "FILL"; content.layoutSizingVertical = "HUG";
  } else {
    v.layoutMode = "HORIZONTAL"; v.resize(W, v.height); v.primaryAxisSizingMode = "FIXED"; v.counterAxisSizingMode = "AUTO";
    v.counterAxisAlignItems = "CENTER";
    if (icon.parent !== v) v.insertChild(0, icon);
    if (content.parent !== v) v.insertChild(1, content);
    if (acts && acts.parent !== v) v.appendChild(acts);
    if (dl && dl.parent !== v && !acts) v.appendChild(dl);
    content.layoutSizingHorizontal = "FILL"; content.layoutSizingVertical = "HUG";
    if (acts) { acts.layoutSizingHorizontal = "HUG"; acts.layoutSizingVertical = "HUG"; bindPad(acts, 0, 0, 0, 0); }
    if (col && !col.removed && col.children.length === 0) col.remove();
  }
  bindPad(v, sp12, sp12, sp12, sp12); bindGap(v, sp12); v.clipsContent = false;
  for (const c of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) v.setBoundVariable(c, V.r12);
  const surface = ["Field value", "Summary", "Previous permit"].includes(ctx) || (ctx === "Cabinet" && (vp.State || "Default") === "Default");
  if (surface) v.fills = [paint(V.bgSecondary, v)];
  icon.layoutSizingHorizontal = "FIXED"; icon.layoutSizingVertical = "FIXED";
  // ---- content
  content.layoutMode = "VERTICAL"; bindGap(content, sp4); bindPad(content, 0, 0, 0, 0); content.counterAxisAlignItems = "MIN"; content.clipsContent = false;
  // title row: Title box + tags as direct children
  let box = titleRow.children.find((n) => n.name === "Title box");
  if (!box) { box = figma.createAutoLayout("HORIZONTAL"); box.name = "Title box"; box.fills = []; titleRow.insertChild(0, box); }
  box.appendChild(title);
  const tagOrder = ["Tag · source", "Tag · Signed electronically", "Tag · validity"];
  const sorted = tags.slice().sort((a, b) => tagOrder.indexOf(a.name) - tagOrder.indexOf(b.name));
  for (const t of sorted) titleRow.appendChild(t);
  for (const n of titleRow.children.slice()) if (n.type === "FRAME" && n !== box && n.children.length === 0) n.remove();
  titleRow.layoutMode = "HORIZONTAL"; titleRow.layoutWrap = "WRAP"; titleRow.counterAxisAlignItems = "CENTER";
  titleRow.layoutSizingHorizontal = "FILL"; titleRow.layoutSizingVertical = "HUG";
  bindGap(titleRow, sp4, sp4);
  bindPad(titleRow, 0, x ? S(null, 44) : chk ? sp32 : 0, 0, 0);
  box.counterAxisAlignItems = "CENTER"; bindGap(box, 0); bindPad(box, 0, sp4, 0, 0); box.clipsContent = false;
  box.layoutSizingHorizontal = "HUG"; box.layoutSizingVertical = "HUG";
  await title.setTextStyleIdAsync(titleStyle.id);
  title.textAutoResize = "WIDTH_AND_HEIGHT"; title.textTruncation = "ENDING"; title.maxLines = 1;
  title.layoutSizingHorizontal = "HUG"; title.layoutSizingVertical = "HUG"; // vertical FILL made the box 2 lines tall in instances
  box.minWidth = mobile ? 68 : null; // = the code's flex-basis 64 (+ 4 box padding): below it the tags wrap under the title (instances can't override min)
  for (const t of sorted) { t.layoutSizingHorizontal = "HUG"; }
  // ---- meta
  for (const n of rows.children.slice()) if (/^New row/.test(n.name)) n.remove();
  meta.layoutMode = "HORIZONTAL"; meta.layoutWrap = "NO_WRAP"; meta.clipsContent = true; bindPad(meta, 0, 0, 0, 0); bindGap(meta, 0);
  meta.layoutSizingHorizontal = "FILL"; meta.layoutSizingVertical = "HUG"; meta.counterAxisAlignItems = "MIN";
  rows.layoutMode = "HORIZONTAL"; rows.layoutWrap = "WRAP"; bindGap(rows, S(null, 18), 0); rows.counterAxisAlignItems = "MIN";
  rows.layoutSizingHorizontal = "FILL"; rows.layoutSizingVertical = "HUG"; bindPad(rows, 0, 0, 0, 0);
  const parts = rows.children.filter((n) => /^Part · /.test(n.name));
  parts.sort((a, b) => ORDER.indexOf(a.name.slice(7)) - ORDER.indexOf(b.name.slice(7)));
  for (const p of parts) rows.appendChild(p);
  const metaW = content.width;
  for (const p of parts) {
    p.layoutMode = "HORIZONTAL"; bindPad(p, sp2, 0, sp2, 0); bindGap(p, 0); p.counterAxisAlignItems = "CENTER"; p.clipsContent = false;
    p.layoutSizingHorizontal = "HUG"; p.layoutSizingVertical = "HUG"; p.maxWidth = null;
    const t = p.children.find((n) => n.type === "TEXT"); const dot = p.children.find((n) => n.type === "ELLIPSE" || n.name === "Punct" || n.name === "Dot");
    await t.setTextStyleIdAsync(capStyle.id); t.fills = [paint(V.textTertiary, t)];
    t.textAutoResize = "WIDTH_AND_HEIGHT"; t.textTruncation = "ENDING"; t.maxLines = 1; t.maxWidth = metaW; t.layoutSizingHorizontal = "HUG";
    if (dot) { dot.name = "Dot"; dot.layoutPositioning = "ABSOLUTE"; dot.resize(2, 2); dot.x = -10; dot.y = 9; dot.fills = [paint(V.textTertiary, t)]; }
  }
  // ---- × / check
  if (x) { x.layoutPositioning = "ABSOLUTE"; x.constraints = { horizontal: "MAX", vertical: "MIN" }; x.x = v.width - 12 - x.width; x.y = 6; }
  if (chk) { chk.layoutPositioning = "ABSOLUTE"; chk.constraints = { horizontal: "MAX", vertical: "MIN" }; chk.x = v.width - 12 - chk.width; chk.y = 12; }
  // title max width = the title line (so a default instance truncates instead of overflowing)
  // no maxWidth on the title: it can't be overridden on instances. Instance text / frame resize() is ignored too (the width
  // snaps back to the main's) → card-fit.js switches Title box + title to FILL when title + tags overflow the line.
  title.maxWidth = null;
  // ---- restore property references (reparenting drops them)
  for (const [id, r] of REFS) { const n = v.findOne((k) => k.id === id); if (!n) { continue; } const cur = n.componentPropertyReferences || {}; if (JSON.stringify(cur) !== JSON.stringify(r)) n.componentPropertyReferences = r; }
  log.h = Math.round(v.height); out.push(log);
}
// restore boolean / text defaults (binding refs can rewrite them)
const fixed = [];
for (const [k, d] of Object.entries(DEF)) { const cur = set.componentPropertyDefinitions[k]; if (!cur || cur.type === "VARIANT") continue; if (cur.defaultValue !== d) { set.editComponentProperty(k, { defaultValue: d }); fixed.push(k); } }
return { n: out.length, out, fixedDefaults: fixed };
