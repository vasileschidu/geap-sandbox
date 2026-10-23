// UNSPLIT (stored as barrows/unsplit) — user rule 2026-10-23: every arrow = ONE connector. Merges arrows that route.js split
// into pieces + lane waypoints back into a single ELBOWED connector: original end restored, label + pill kept, pieces and lane
// anchors removed. Start: a start anchor at the clicked element (s0) is kept (anchor placement is allowed); a whole-block
// position start goes back to a side magnet.
const UNSPLIT = async (P) => {
  const page = await figma.getNodeByIdAsync(P); await figma.setCurrentPageAsync(page);
  await figma.loadFontAsync({ family: "Onest", style: "Medium" });
  const done = []; const removed = { pieces: 0, anchors: 0 };
  for (const c of page.findAllWithCriteria({ types: ["CONNECTOR"] })) {
    if (c.removed) continue; const d = c.getSharedPluginData("barrows", "lane"); if (!d) continue; const j = JSON.parse(d);
    c.connectorEnd = j.end; c.connectorEndStrokeCap = j.cap || "ARROW_LINES"; c.connectorLineType = "ELBOWED";
    if (j.opt && j.opt.bs && c.connectorStart.position) { const s = await figma.getNodeByIdAsync(c.connectorStart.endpointNodeId);
      c.connectorStart = { endpointNodeId: s.id, magnet: c.connectorStart.position.x < s.width / 2 ? "LEFT" : "RIGHT" }; }
    if (j.s0) { const a = await figma.getNodeByIdAsync(j.s0); if (a) a.name = "anchor · " + (j.label || c.name).slice(0, 40); }
    await figma.loadFontAsync(c.text.fontName); c.text.characters = j.label || "";
    for (const k of ["b", "m", "v", "v2"]) if (j[k]) { const o = await figma.getNodeByIdAsync(j[k]); if (o && !o.removed) { o.remove(); removed.pieces++; } }
    for (const k of ["w", "w0", "w2", "w3"]) if (j[k]) { const o = await figma.getNodeByIdAsync(j[k]); if (o && !o.removed) { o.remove(); removed.anchors++; } }
    c.setSharedPluginData("barrows", "lane", ""); if (j.s0) c.setSharedPluginData("barrows", "s0", j.s0);
    done.push(c.id);
  }
  // stray pieces / lane anchors left by failed runs
  for (const n of page.findAllWithCriteria({ types: ["CONNECTOR"] })) if (!n.removed && n.getSharedPluginData("barrows", "role") === "piece") { n.remove(); removed.pieces++; }
  const used = new Set(); for (const c of page.findAllWithCriteria({ types: ["CONNECTOR"] })) { used.add(c.connectorStart.endpointNodeId); used.add(c.connectorEnd.endpointNodeId); }
  for (const n of page.findAllWithCriteria({ types: ["INSTANCE"] })) if (!n.removed && n.getSharedPluginData("barrows", "role") === "W") { if (used.has(n.id)) n.setSharedPluginData("barrows", "role", "start"); else { n.remove(); removed.anchors++; } }
  return { merged: done.length, removed };
};
