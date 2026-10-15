// Document · row v3 — code 9804960e: BO stack row keeps the stack meta (12 / lh 20, text-base-tertiary, 8 · 2px dot · 8),
// title one line (ending ellipsis) with the tags right after it (gap 8, 4 between tags), no forced breaks.
// Params (prepend): const SET_ID = "11362:7113"; const K = { sp2, sp4, sp8, textTertiary };
const set = await figma.getNodeByIdAsync(SET_ID);
figma.skipInvisibleInstanceChildren = false;
const V = {}; for (const k of ["sp2", "sp4", "sp8", "textTertiary"]) V[k] = await figma.variables.importVariableByKeyAsync(K[k]);
const fonts = new Set(); for (const t of set.findAll((n) => n.type === "TEXT")) for (const s of t.getStyledTextSegments(["fontName"])) fonts.add(JSON.stringify(s.fontName));
for (const f of fonts) await figma.loadFontAsync(JSON.parse(f));
const DEF = Object.fromEntries(Object.entries(set.componentPropertyDefinitions).map(([k, v]) => [k, v.defaultValue]));
const own = (n) => !n.id.includes(";");
const paint = (variable, node) => { const c = variable.resolveForConsumer(node).value; return figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: c.r, g: c.g, b: c.b } }, "color", variable); };
const out = [];
for (const v of set.children) {
  const tr = v.findOne((n) => own(n) && n.name === "Title and tags");
  const title = tr.children.find((n) => n.type === "TEXT");
  const tags = tr.children.find((n) => n.name === "Tags");
  const meta = v.findOne((n) => own(n) && n.name === "Meta" && n.type === "FRAME");
  const rows = meta.findOne((n) => n.name === "Rows");
  tr.setBoundVariable("itemSpacing", V.sp8); tr.setBoundVariable("counterAxisSpacing", V.sp4); tr.counterAxisAlignItems = "CENTER";
  if (tags) { tags.setBoundVariable("itemSpacing", V.sp4); tags.layoutWrap = "WRAP"; tags.setBoundVariable("counterAxisSpacing", V.sp4); }
  title.textTruncation = "ENDING"; title.maxLines = 1;
  meta.counterAxisAlignItems = "MIN"; meta.layoutSizingVertical = "HUG"; meta.clipsContent = true;
  rows.counterAxisAlignItems = "MIN"; rows.counterAxisSpacing = 0; rows.layoutSizingVertical = "HUG";
  for (const n of rows.children.slice()) if (/^New row|break/i.test(n.name)) n.remove();
  for (const p of rows.children.filter((n) => /^Part · /.test(n.name))) {
    p.setBoundVariable("paddingTop", V.sp2); p.setBoundVariable("paddingBottom", V.sp2); p.counterAxisAlignItems = "CENTER";
    p.layoutSizingVertical = "HUG";
    const t = p.children.find((n) => n.type === "TEXT"); const dot = p.children.find((n) => n.type === "ELLIPSE");
    t.fills = [paint(V.textTertiary, t)]; t.textTruncation = "ENDING"; t.maxLines = 1;
    if (dot) { dot.name = "Dot"; dot.resize(2, 2); dot.x = -10; dot.y = 9; dot.fills = [paint(V.textTertiary, t)]; }
  }
  out.push(Math.round(v.height));
}
const fixed = [];
for (const [k, d] of Object.entries(DEF)) { const cur = set.componentPropertyDefinitions[k]; if (!cur || cur.type === "VARIANT") continue; if (cur.defaultValue !== d) { set.editComponentProperty(k, { defaultValue: d }); fixed.push(k); } }
return { n: out.length, heights: [...new Set(out)], fixed };
