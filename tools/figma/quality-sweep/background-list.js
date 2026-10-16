// Quality sweep · Ghișeu (2026-10-16) — background „Dosare noi” list under dialogs = the code's list with the pinned actions
// column (code 086ca562). Source = Block · gh-01's `Page · Dosare noi` (recaptured + library-passed: sticky „Continuă” + ⋮ cells
// absolute at x 1016, in-grid placeholders). For each block: clone the source page into the block's Main at the old page's
// index (FILL / FILL), carry connectors whose endpoint was inside the old page to the same-named node of the clone, remove the
// old page (kept nowhere — the old capture was stale). Returns per block + connector count before / after.
const BG_LIST = async (BLOCKS) => {
  const page = await figma.getNodeByIdAsync("11589:327039"); await figma.setCurrentPageAsync(page);
  const src = await figma.getNodeByIdAsync("11853:23301");
  const sec = await figma.getNodeByIdAsync("11818:21092");
  const conns = sec.children.filter((c) => c.type === "CONNECTOR");
  const n0 = conns.length; const out = [];
  for (const id of BLOCKS) {
    const b = await figma.getNodeByIdAsync(id); const old = b.findOne((n) => n.type === "FRAME" && /^Page · Dosare noi/.test(n.name));
    if (!old) { out.push(b.name + " no page"); continue; }
    const p = old.parent, idx = p.children.indexOf(old);
    const cl = src.clone(); p.insertChild(idx, cl);
    cl.layoutSizingHorizontal = old.layoutSizingHorizontal; cl.layoutSizingVertical = old.layoutSizingVertical;
    const ids = new Set([old.id, ...old.findAll(() => true).map((n) => n.id)]);
    let moved = 0;
    for (const c of conns) for (const end of ["connectorStart", "connectorEnd"]) {
      const e = c[end]; if (!e.endpointNodeId || !ids.has(e.endpointNodeId)) continue;
      const on = await figma.getNodeByIdAsync(e.endpointNodeId); const nn = cl.findOne((n) => n.name === on.name);
      if (nn) { const ne = { endpointNodeId: nn.id }; if (e.magnet) ne.magnet = e.magnet; else ne.position = e.position; c[end] = ne; moved++; }
    }
    old.remove();
    out.push(`${b.name.slice(8)} ok conn-moved ${moved}`);
  }
  return { conns: `${n0}→${sec.children.filter((c) => c.type === "CONNECTOR").length}`, out };
};
