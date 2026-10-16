// Ghișeu board — wrap every composed `Desktop · gh-XX` screen into `Block · gh-XX`
// (Screen label → desktop screen → Note, VERTICAL gap 16), inside the section „Ghișeu · Desk filing”.
// Desktop only (user 2026-10-16). Run via use_figma: blocks.config.js + this file +
// `return await BUILD(["gh-01", …])` (≤ 15 states per call). Idempotent: an existing block is refreshed.
const BUILD = async (LIST) => {
  const PAGE = "11589:327039", LABEL = "11527:1200", NOTE = "11527:1797";
  const SAND = "https://vasileschidu.github.io/geap-sandbox/e-permits-acte-permisive.html?state=";
  const V = {
    stroke: "VariableID:9fa253aab4b44e39a049a0cbbd163e4c61e129b6/1296:283",
    r16: "VariableID:5e0761c5c01bfd401113f4132cbbf4b3fb30c7d0/4433:90",
  };
  const page = await figma.getNodeByIdAsync(PAGE);
  await figma.setCurrentPageAsync(page);
  const labelTpl = await figma.getNodeByIdAsync(LABEL), noteTpl = await figma.getNodeByIdAsync(NOTE);
  const loadAll = async (root) => {
    for (const t of root.findAll((n) => n.type === "TEXT"))
      for (const s of t.getStyledTextSegments(["fontName"])) await figma.loadFontAsync(s.fontName);
  };
  await loadAll(labelTpl); await loadAll(noteTpl);
  const strokeVar = await figma.variables.getVariableByIdAsync(V.stroke);
  const r16 = await figma.variables.getVariableByIdAsync(V.r16);
  let sec = page.children.find((n) => n.type === "SECTION" && n.name === "Ghișeu · Desk filing");
  if (!sec) { sec = figma.createSection(); sec.name = "Ghișeu · Desk filing"; page.appendChild(sec); sec.x = 0; sec.y = 0; }
  const usOf = {}; for (const r of GH_ROWS) for (const s of r.states) usOf[s] = r.us;
  const out = [];
  for (const st of LIST) {
    const [title, text] = GH_STATES[st];
    let block = sec.children.find((n) => n.name === "Block · " + st);
    let scr = block ? block.children.find((n) => n.name.startsWith("Desktop · ")) : page.children.find((n) => n.name === "Desktop · " + st);
    if (!scr) { out.push(st + " MISSING"); continue; }
    if (!block) {
      block = figma.createFrame(); block.name = "Block · " + st; sec.appendChild(block);
      block.layoutMode = "VERTICAL"; block.itemSpacing = 16; block.fills = []; block.clipsContent = false;
      block.primaryAxisSizingMode = "AUTO"; block.counterAxisSizingMode = "AUTO";
      const lab = labelTpl.clone(); lab.name = "Screen label · " + st; block.appendChild(lab);
      block.appendChild(scr); scr.x = 0; scr.y = 0;
      const note = noteTpl.clone(); note.name = "Note · " + st; block.appendChild(note);
      note.layoutSizingHorizontal = "FILL";
    }
    const lab = block.children.find((n) => n.name.startsWith("Screen label"));
    const note = block.children.find((n) => n.name.startsWith("Note"));
    // label
    const idT = lab.findOne((n) => n.name === "ID").findOne((n) => n.type === "TEXT");
    idT.characters = st.replace("gh-", "GH-"); idT.name = idT.characters;
    const tT = lab.findOne((n) => n.name === "Title"); tT.characters = title;
    const link = lab.findOne((n) => n.name === "Link · prototype");
    link.characters = "Prototype ↗"; link.setRangeHyperlink(0, link.characters.length, { type: "URL", value: SAND + st });
    const status = lab.findOne((n) => n.name === "Status");
    try { status.setProperties({ Status: "Figma aligned" }); } catch (e) { /* keep the template value */ }
    // note
    note.findOne((n) => n.name === "Note title").characters = st.replace("gh-", "GH-") + " · " + title;
    note.findOne((n) => n.name === "Note text").characters = text;
    const tag = note.findOne((n) => n.name === "tag-filled");
    try { tag.setProperties({ "⌨️ Label#387:32": usOf[st] }); } catch (e) { out.push(st + " tag " + e.message); }
    // screen frame: clip + radius 16 + 4px outside border (only the screen frame)
    scr.clipsContent = true;
    for (const k of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) scr.setBoundVariable(k, r16);
    scr.strokes = [figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0.8, g: 0.8, b: 0.8 } }, "color", strokeVar)];
    scr.strokeWeight = 4; scr.strokeAlign = "OUTSIDE";
    out.push(st + " " + block.id + " h" + Math.round(block.height));
  }
  return out;
};
