// Row-lane board layout pass (re-runnable, positions / containers only).
// Run via use_figma: paste this file, then `return await LAYOUT(CFG)` with a config such as
// tools/figma/board-layout/fod-guest-lane.config.js.
//
// Board rules it applies (derived 2026-10-16 from the Requestor authenticated lane, US-54 and the GEAP FO boards):
//  - section padding PAD (80); lane title at (PAD, PAD), lane description 8 below it, first row at FIRST_ROW_Y (440)
//  - one ROW per stage, rows top → bottom in flow order; inside a row, left → right = steps, columns on a fixed grid:
//    col x = COL_X0 + k * (COL_W + COL_GAP), COL_GAP 240; all items of a row share the row top
//  - a GUTTER column (GUTTER_W, left of the grid, 240 before the first column) holds the row header (stage card,
//    narrow, left-aligned) and, under it (240 gap), the row's decision / doc cards right-aligned to the gutter edge
//    so every gutter card sits 240 from the blocks; inter-row arrows run in the free strip right of the headers
//  - markers (jump cards) go in the next free grid column at source.y + 44 (aligned with the screens)
//  - next row top = tallest item of the row + ROW_GAP (396)
//  - section resized to content + PAD; section x/y optional
//  - connectors: specs {id, s?, e?}; endpoint spec = {n, m} (magnet) | {n, p:[x,y]} (position) |
//    {n, straight:true} (end on the LEFT edge at the start's y when it fits, else magnet LEFT) |
//    {n, edge:"LEFT"|"RIGHT", at:"<nodeId>"} (block edge at the centre y of a control inside it)
// Returns counts + every row's band; never trees.
const LAYOUT = async (CFG) => {
  const page = await figma.getNodeByIdAsync(CFG.pageId);
  await figma.setCurrentPageAsync(page);
  const sec = await figma.getNodeByIdAsync(CFG.sectionId);
  const N = async (id) => { const n = await figma.getNodeByIdAsync(id); if (!n) throw new Error("missing " + id); return n; };
  const PAD = CFG.pad ?? 80, GW = CFG.gutterW ?? 720, GAP = CFG.colGap ?? 240, COLW = CFG.colW;
  const X0 = PAD + GW + GAP, ROWGAP = CFG.rowGap ?? 396;
  const colX = (k) => X0 + k * (COLW + GAP);
  let moved = 0, created = 0;
  const mv = (n, x, y) => { x = Math.round(x); y = Math.round(y); if (Math.round(n.x) !== x || Math.round(n.y) !== y) { n.x = x; n.y = y; moved++; } };

  // lane title + description
  if (CFG.title) {
    const t = await N(CFG.title.id); mv(t, PAD, PAD);
    if (CFG.title.descId) {
      const d = await N(CFG.title.descId);
      for (const sg of d.getStyledTextSegments(["fontName"])) await figma.loadFontAsync(sg.fontName);
      if (CFG.title.descW && Math.round(d.width) !== CFG.title.descW) { d.textAutoResize = "HEIGHT"; d.resize(CFG.title.descW, d.height); }
      mv(d, PAD, PAD + t.height + 8);
    }
  }

  // row headers (clone of a stage header, idempotent by name)
  const tpl = CFG.headerTpl ? await N(CFG.headerTpl) : null;
  const header = async (row) => {
    const name = "Row header · " + row.key;
    let h = sec.children.find((c) => c.name === name);
    if (!h) { h = tpl.clone(); sec.appendChild(h); h.name = name; created++; }
    const texts = h.findAll((n) => n.type === "TEXT");
    for (const t of texts) {
      const segs = t.getStyledTextSegments(["fontName"]);
      for (const s of segs) await figma.loadFontAsync(s.fontName);
    }
    const chip = h.findOne((n) => n.name === "ID").findOne((n) => n.type === "TEXT");
    const title = h.findOne((n) => n.name === "Title").children.find((n) => n.type === "TEXT");
    const desc = h.children.find((n) => n.type === "TEXT");
    if (chip.characters !== row.header.chip) chip.characters = row.header.chip;
    if (title.characters !== row.header.title) { title.characters = row.header.title; title.name = row.header.title; }
    if (desc.characters !== row.header.desc) { desc.characters = row.header.desc; desc.name = row.header.desc.slice(0, 40); }
    const w = CFG.headerW ?? 560;
    if (Math.round(h.width) !== w) h.resize(w, h.height);
    h.primaryAxisSizingMode = "AUTO";
    desc.layoutSizingHorizontal = "FILL"; desc.textAutoResize = "HEIGHT";
    return h;
  };

  let y = CFG.firstRowY ?? 440;
  const bands = [];
  for (const row of CFG.rows) {
    let bottom = y;
    const keep = (n) => { bottom = Math.max(bottom, n.y + n.height); };
    let gy = y;
    if (row.header) { const h = await header(row); mv(h, PAD, y); keep(h); gy = y + h.height + GAP; }
    for (const id of row.gutter || []) { const g = await N(id); mv(g, PAD + GW - g.width, gy); keep(g); gy += g.height + GAP; }
    for (const [k, id] of row.cells || []) { const b = await N(id); mv(b, colX(k), y); keep(b); }
    for (const [k, id, src] of row.markers || []) { const m = await N(id); const s = await N(src); mv(m, colX(k), s.y + 44); keep(m); }
    bands.push([row.key, Math.round(y), Math.round(bottom)]);
    y = bottom + ROWGAP;
  }

  // section bounds
  let maxR = 0, maxB = 0;
  for (const c of sec.children) { if (c.type === "CONNECTOR") continue; maxR = Math.max(maxR, c.x + c.width); maxB = Math.max(maxB, c.y + c.height); }
  if (CFG.sectionX != null) sec.x = CFG.sectionX;
  if (CFG.sectionY != null) sec.y = CFG.sectionY;
  sec.resizeWithoutConstraints(Math.round(maxR + PAD), Math.round(maxB + PAD));

  // connectors
  const abs = (n) => n.absoluteBoundingBox;
  const startY = async (c) => {
    const s = c.connectorStart; const n = await N(s.endpointNodeId); const b = abs(n);
    if (s.position) return b.y + s.position.y;
    if (s.magnet === "TOP") return b.y; if (s.magnet === "BOTTOM") return b.y + b.height;
    return b.y + b.height / 2;
  };
  const ep = async (spec, c, isEnd) => {
    if (spec.m) return { endpointNodeId: spec.n, magnet: spec.m };
    if (spec.p) return { endpointNodeId: spec.n, position: { x: spec.p[0], y: spec.p[1] } };
    const n = await N(spec.n); const b = abs(n);
    if (spec.edge) {
      const ctl = abs(await N(spec.at)); const yy = ctl.y + ctl.height / 2 - b.y;
      return { endpointNodeId: spec.n, position: { x: spec.edge === "LEFT" ? 0 : b.width, y: Math.round(yy) } };
    }
    if (spec.straight) {
      const sy = await startY(c); const yy = Math.round(sy - b.y);
      const lo = spec.min ?? 60, hi = b.height - (spec.maxOff ?? 60);
      if (yy >= lo && yy <= hi) return { endpointNodeId: spec.n, position: { x: spec.side === "RIGHT" ? b.width : 0, y: yy } };
      return { endpointNodeId: spec.n, magnet: spec.side || "LEFT" };
    }
    throw new Error("bad spec " + JSON.stringify(spec));
  };
  let rewired = 0; const straight = [];
  for (const cs of CFG.connectors || []) {
    const c = await N(cs.id);
    if (cs.s) { c.connectorStart = await ep(cs.s, c, false); rewired++; }
    if (cs.e) { const e = await ep(cs.e, c, true); c.connectorEnd = e; rewired++; if (cs.e.straight) straight.push(c.name.split(" · ")[0] + (e.position ? " =" : " ~")); }
  }
  return { moved, created, rewired, straight, bands, section: [Math.round(sec.x), Math.round(sec.y), Math.round(sec.width), Math.round(sec.height)] };
};
