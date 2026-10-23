// Read-only census of board arrows on one page: connectors, built-in labels, label fills, stroke vars.
// Usage (use_figma): set PAGE_ID, paste.
const page = await figma.getNodeByIdAsync(PAGE_ID); await figma.setCurrentPageAsync(page);
const conns = page.findAllWithCriteria({ types: ["CONNECTOR"] });
const fonts = {}, strokes = {}, textFills = {}, parents = {};
let labelled = 0;
for (const c of conns) {
  const t = c.text.characters; if (t.trim()) labelled++;
  const f = c.text.fontName; const k = f === figma.mixed ? "mixed" : f.family + " " + f.style + " " + String(c.text.fontSize);
  fonts[k] = (fonts[k] || 0) + 1;
  const sp = c.strokes[0]; const sv = sp && sp.boundVariables && sp.boundVariables.color ? sp.boundVariables.color.id : (sp ? "raw" : "none");
  strokes[sv] = (strokes[sv] || 0) + 1;
  const tf = c.text.fills; const tk = tf === figma.mixed ? "mixed" : (tf[0] ? (tf[0].boundVariables && tf[0].boundVariables.color ? tf[0].boundVariables.color.id : JSON.stringify(tf[0].color)) : "none");
  textFills[tk] = (textFills[tk] || 0) + 1;
  const p = c.parent.type; parents[p] = (parents[p] || 0) + 1;
}
const lbl = page.findAll((n) => /arrow label|^Label · arrow|Flow label/i.test(n.name)).length;
return { page: page.name, connectors: conns.length, labelled, fonts, strokes, textFills, parents, otherLabelNodes: lbl, sample: conns.slice(0, 2).map((c) => c.id) };
