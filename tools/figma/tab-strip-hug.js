// Page-header tab strip hugs its tabs (code a89b5c0b, components.md „Tab strip hugs its tabs”).
// The strip (`tab-buttons` / `tabs`) = HUG, no stroke; the full-width 1px track line is drawn by the CONTAINER as a
// „Track line” child (ABSOLUTE, index 0 = under the tabs so the active tab's 2px underline covers it, constraints
// STRETCH / MAX, 1px top stroke bound to border/base/default). A frame stroke can't do it: Figma paints a frame's
// stroke ABOVE its children (tested 2026-10-16), so it cut 1px off the active underline.
// Optional per container: inset (template sheet = 24: container padding-inline 24, line 24 … W − 24) and tab items
// 40 high / 12 side padding (tab-item-s default, = code `.e-permits-page-header__tabs .tab-button`).
// JOBS = [{ id: <container id>, strip: "<strip name>", inset: 0 | 24, tabs40: bool, bodyId?: <header body id> }]
// Snapshot: shared plugin data geapqa / tabs-20261016 on each container.
// After it: zero any ANCESTOR bottom stroke whose bottom edge coincides with the container's (header frames / header
// components carried one — duplicate line, full width in the 24-inset sheet, and painted over the active underline);
// old weight in geapqa / hdrstroke-20261016. Run 2026-10-16 on: Profile / Tabs 10132:2285 (8 variants, 39 instances),
// Notification template / Header 10008:1624 (inset 24, tabs 40, body 24), Main Navigation 9442:44686 › 8993:39381
// (line only, tabs stay 48 — open question), 17 ntpl „Service Tabs” frames on ↳ BO -> Notification templates.
const KEY = "tabs-20261016";
const BORDER = await figma.variables.importVariableByKeyAsync("9fa253aab4b44e39a049a0cbbd163e4c61e129b6"); // border/base/default
const SPK = { 12: "ee4801fea560b76dffab59bd8ee6e31e3b636570", 24: "49c6a5e43fd55f8fa058dfc13851df2854db5d83" };
const SPV = {}; for (const k in SPK) SPV[k] = await figma.variables.importVariableByKeyAsync(SPK[k]);
const pb = (n, f, v) => { n.setBoundVariable(f, null); n[f] = v; if (SPV[v]) n.setBoundVariable(f, SPV[v]); };
const res = [];
for (const J of JOBS) {
  const c = await figma.getNodeByIdAsync(J.id); if (!c) { res.push(J.id + " missing"); continue; }
  const strip = c.children.find((x) => x.name === J.strip); if (!strip) { res.push(J.id + " no strip"); continue; }
  if (c.getSharedPluginData("geapqa", KEY)) { res.push(J.id + " already"); continue; }
  const items = strip.children.filter((x) => x.type === "INSTANCE");
  c.setSharedPluginData("geapqa", KEY, JSON.stringify({ cStrokes: c.strokes.length, cSB: c.strokeBottomWeight, sStrokes: strip.strokes.length, sSizing: strip.layoutSizingHorizontal,
    pad: [c.paddingLeft, c.paddingRight], items: items.map((i) => [i.id, i.height, i.paddingLeft, i.paddingRight]) }));
  const paint = figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0.85, g: 0.85, b: 0.85 } }, "color", BORDER);
  c.strokes = []; strip.strokes = [];
  strip.layoutSizingHorizontal = "HUG";
  if (J.inset) { pb(c, "paddingLeft", J.inset); pb(c, "paddingRight", J.inset); }
  if (J.tabs40) for (const i of items) { i.layoutSizingVertical = "FIXED"; i.resize(i.width, 40); pb(i, "paddingLeft", 12); pb(i, "paddingRight", 12); i.layoutSizingHorizontal = "HUG"; }
  if (strip.layoutSizingVertical !== "HUG") strip.layoutSizingVertical = "HUG";
  if (c.layoutMode !== "NONE" && c.layoutSizingVertical === "FIXED") c.layoutSizingVertical = "HUG";
  let line = c.children.find((x) => x.name === "Track line");
  if (!line) { line = figma.createFrame(); line.name = "Track line"; c.insertChild(0, line); }
  line.fills = []; line.layoutPositioning = "ABSOLUTE"; line.clipsContent = false;
  line.strokes = [paint]; line.strokeAlign = "INSIDE"; line.strokeTopWeight = 1; line.strokeBottomWeight = 0; line.strokeLeftWeight = 0; line.strokeRightWeight = 0;
  const inset = J.inset || 0;
  line.resize(c.width - 2 * inset, 1); line.x = inset; line.y = c.height - 1;
  line.constraints = { horizontal: "STRETCH", vertical: "MAX" };
  if (J.bodyId) { const b = await figma.getNodeByIdAsync(J.bodyId); if (b) { pb(b, "paddingLeft", 24); pb(b, "paddingRight", 24); } }
  res.push(J.id + " ok h" + Math.round(c.height) + " strip " + Math.round(strip.x) + "+" + Math.round(strip.width) + " line " + line.x + "+" + Math.round(line.width));
}
return res;
