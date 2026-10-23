// Read-only: describe given connectors (owner chain resolved) + page layout (section children boxes).
// Stored as barrows/describe; run: new Function("figma", src + "\nreturn DESCRIBE;")(figma)(PAGE_ID, [ids], { layout: true })
const DESCRIBE = async (P, IDS, OPT = {}) => {
  const page = await figma.getNodeByIdAsync(P); await figma.setCurrentPageAsync(page);
  const r = (b) => b ? [b.x, b.y, b.width, b.height].map(Math.round) : null;
  const out = [];
  for (const id of IDS) {
    const c = await figma.getNodeByIdAsync(id); if (!c) { out.push([id, "missing"]); continue; }
    const d = c.getSharedPluginData("barrows", "lane"); const j = d ? JSON.parse(d) : null;
    const s = await figma.getNodeByIdAsync(c.connectorStart.endpointNodeId);
    const eid = j ? j.end.endpointNodeId : c.connectorEnd.endpointNodeId; const e = await figma.getNodeByIdAsync(eid);
    out.push({ id, name: c.name.slice(0, 40), label: j ? j.label : c.text.characters, role: c.getSharedPluginData("barrows", "role"),
      s: [s.name.slice(0, 30), s.type, c.connectorStart.magnet || JSON.stringify(c.connectorStart.position), r(s.absoluteBoundingBox)],
      e: [e.name.slice(0, 30), e.type, j ? (j.end.magnet || JSON.stringify(j.end.position)) : (c.connectorEnd.magnet || JSON.stringify(c.connectorEnd.position)), r(e.absoluteBoundingBox)], box: r(c.absoluteBoundingBox) });
  }
  let layout = null;
  if (OPT.layout) { layout = []; for (const s of page.children) { layout.push([s.id, s.type, s.name.slice(0, 28), ...r(s.absoluteBoundingBox)]);
    if (s.type === "SECTION") for (const k of s.children) if (k.type !== "CONNECTOR" && !(k.type === "INSTANCE" && k.width <= 4)) layout.push(["  " + k.id, k.type, k.name.slice(0, 28), ...r(k.absoluteBoundingBox)]); } }
  return { out, layout };
};
