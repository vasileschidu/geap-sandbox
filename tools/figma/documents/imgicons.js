// Replace icon-sized IMAGE fills inside blocks with library icon instances (tinted with icon tokens).
// MAP: image-hash prefix → { key: component key, tok: variable key }
await figma.setCurrentPageAsync(await figma.getNodeByIdAsync(PAGE_ID));
figma.skipInvisibleInstanceChildren = true;
const MAP = {
  "8ad9": { key: "4b8c8df1ff190afdc8e36a9866dcd7147c365db8", tok: "92561cad5e44e57b4b03dc6f532d609662b02711" },
  "54a1": { key: "4b8c8df1ff190afdc8e36a9866dcd7147c365db8", tok: "bc354272b09686be692277e55a28ed354a1e50a9" },
  "846d": { key: "4b8c8df1ff190afdc8e36a9866dcd7147c365db8", tok: "bc354272b09686be692277e55a28ed354a1e50a9" },
  "42d3": { key: "25b51b97af76249c74d1ec6461b9f0e5a231ed86", tok: "92561cad5e44e57b4b03dc6f532d609662b02711" },
};
const inBlock = (n) => { for (let p = n.parent; p && p.type !== "PAGE"; p = p.parent) if (/^Block · |^Bloc /.test(p.name)) return true; return false; };
const comps = {}, toks = {};
const out = { replaced: 0, skipped: [] };
const nodes = figma.currentPage.findAll((x) => !x.id.includes(";") && "fills" in x && Array.isArray(x.fills) && x.fills.some((f) => f.type === "IMAGE" && f.visible !== false) && x.width <= 48 && x.height <= 48 && inBlock(x));
for (const n of nodes) {
  const h = n.fills.find((f) => f.type === "IMAGE").imageHash.slice(0, 4);
  const m = MAP[h]; if (!m) { out.skipped.push(`${n.id}:${h}`); continue; }
  comps[m.key] ||= await figma.importComponentByKeyAsync(m.key);
  toks[m.tok] ||= await figma.variables.importVariableByKeyAsync(m.tok);
  const inst = comps[m.key].createInstance();
  const size = Math.max(n.width, n.height) <= 16 ? 16 : n.width >= 24 || n.height >= 21 ? 24 : 20;
  inst.resize(size, size); inst.name = h === "42d3" ? "16/chevron-right" : "24/document-filled";
  for (const v of inst.findAll((x) => "fills" in x && x.type !== "INSTANCE" && Array.isArray(x.fills) && x.fills.length)) v.fills = [figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: .5, g: .5, b: .5 } }, "color", toks[m.tok])];
  const par = n.parent, i = par.children.indexOf(n);
  par.insertChild(i, inst);
  if (n.layoutPositioning === "ABSOLUTE" || !par.layoutMode || par.layoutMode === "NONE") { if (par.layoutMode && par.layoutMode !== "NONE") inst.layoutPositioning = "ABSOLUTE"; inst.x = n.x + (n.width - size) / 2; inst.y = n.y + (n.height - size) / 2; }
  n.remove(); out.replaced++;
}
return out;
