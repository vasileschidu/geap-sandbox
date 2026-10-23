// In-flow column frames (old BO registries: `Frame 1261156219` first, `…228` / `…236` last, `Vertical Frame` empty headers) that
// carried the 8 % divider stroke → a `Table / Pinned column` instance (Side from the stroke side, State=No shadow) at the same
// index, the column's cells moved into its Cells slot, instance HUG height. Run per page (big pages drop the transport — the
// call still completes: re-check before retrying). Stored in figma.root shared plugin data „pinc”/„colframes” (GEAP).
// AsyncFunction("PAGE_ID", "LIMIT", body)(pageId, 40). STYLE = the (now deleted) „Table / Pinned divider 8%” paint style id.
figma.skipInvisibleInstanceChildren = false;
const STYLE = "S:ee24779473d7bfbc7cf46d3d57e9d17c849aadd6,";
const set = await figma.getNodeByIdAsync("12619:61500");
const v = side => set.children.find(c => c.name === "Side=" + side + ", State=No shadow");
const page = figma.root.children.find(p => p.id === PAGE_ID);
await figma.setCurrentPageAsync(page);
const nodes = page.findAll(n => n.type === "FRAME" && !n.id.includes(";") && n.strokeStyleId === STYLE).slice(0, LIMIT);
let n = 0; const bad = [];
for (const f of nodes) {
  const p = f.parent, idx = p.children.indexOf(f), side = f.strokeLeftWeight > 0 ? "End" : "Start";
  const w = f.width, h = f.height, sh = f.layoutSizingHorizontal;
  const inst = v(side).createInstance();
  p.insertChild(idx, inst);
  const slot = inst.findChild(c => c.type === "SLOT");
  if (!slot) { bad.push("noslot " + f.id); inst.remove(); continue; }
  inst.name = "Pinned column · " + side.toLowerCase();
  for (const c of [...f.children]) {
    const ch = c.height, sv = c.layoutSizingVertical;
    slot.appendChild(c);
    if (sv === "FILL") c.layoutSizingVertical = "FIXED";
    c.resize(c.width, ch); c.layoutSizingHorizontal = "FILL";
    if (typeof c.strokeLeftWeight === "number") { c.strokeLeftWeight = 0; c.strokeRightWeight = 0; }
  }
  inst.resize(w, inst.height);
  inst.layoutSizingHorizontal = sh === "FILL" ? "FILL" : "FIXED";
  inst.layoutSizingVertical = "HUG";
  if (Math.abs(inst.height - h) > 1) bad.push(inst.id + " " + h + "->" + inst.height);
  f.remove(); n++;
}
return { n, bad, left: page.findAll(x => x.type === "FRAME" && !x.id.includes(";") && x.strokeStyleId === STYLE).length };
