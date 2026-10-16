// Revert a board-layout pass from a snapshot (positions, section box, connector ends).
// Paste into use_figma with SNAP = the JSON of <board>.snapshot-<date>.json (or read it from the section's
// shared plugin data: sec.getSharedPluginData("geap", "layoutSnapshot20261016")). Row headers created by the pass
// („Row header · …”) are removed when REMOVE_CREATED is true.
const REVERT = async (SNAP, REMOVE_CREATED = true) => {
  const page = await figma.getNodeByIdAsync(SNAP.page);
  await figma.setCurrentPageAsync(page);
  const sec = await figma.getNodeByIdAsync(SNAP.section.id);
  if (REMOVE_CREATED) for (const c of [...sec.children]) if (c.name.startsWith("Row header · ")) c.remove();
  sec.x = SNAP.section.x; sec.y = SNAP.section.y;
  sec.resizeWithoutConstraints(SNAP.section.w, SNAP.section.h);
  let n = 0;
  for (const s of SNAP.nodes) {
    const node = await figma.getNodeByIdAsync(s.id); if (!node) continue;
    if (node.type === "TEXT" && Math.round(node.width) !== Math.round(s.w)) {
      for (const sg of node.getStyledTextSegments(["fontName"])) await figma.loadFontAsync(sg.fontName);
      node.resize(s.w, node.height);
    }
    node.x = s.x; node.y = s.y; n++;
  }
  const ep = (e) => e.m ? { endpointNodeId: e.n, magnet: e.m } : { endpointNodeId: e.n, position: { x: e.p[0], y: e.p[1] } };
  let c = 0;
  for (const k of SNAP.conns) {
    const con = await figma.getNodeByIdAsync(k.id); if (!con) continue;
    con.connectorStart = ep(k.s); con.connectorEnd = ep(k.e); c++;
  }
  return { nodes: n, connectors: c };
};
