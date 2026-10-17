// RAP board connector audit — adapted from tools/figma/ghiseu/arrows/connector-audit.js (file EVO-WEB-3.0 YrIzksVgFqtPqDd5z9zY5h,
// page 20304:64765). Differences: markers sit at block x 1911 (block 1895 + 16, in the 320 px right gutter). Rules (2026-10-17):
//  dangling      — an end node is missing / removed / hidden / inside a „Page · …” list that sits behind a scrim / dialog / sheet
//  start-on-block — the arrow starts on a Block / Screen frame instead of the clicked element
//  stale-route   — the connector's box does not touch its start and end blocks (cached geometry, not re-routed)
//  wrong-parent  — same-column arrow outside its column section, or a cross-column arrow inside a section
//  crossing-block — the routed path (approximated by magnet: side lane = vertical 32 px outside the target block's side;
//                   BOTTOM→TOP vertical at the control x; RIGHT→LEFT jog in the gap between the two blocks) hits another block
//                   or a marker chip
//  duplicate     — two connectors with the same start + end
//  label-overlap — two labels (middle of the main segment, ~7 px / char) closer than 28 px
//  marker-off-grid — marker not at x MARK_X (block + 16) in its block, outside its section, outside the screen's
//                    height, overlapping another marker, or its hyperlink target missing
const CONNECTOR_AUDIT = async (PAGE_ID, MARK_X = 1911) => {
  const page = await figma.getNodeByIdAsync(PAGE_ID); await figma.setCurrentPageAsync(page);
  const F = []; const add = (rule, id, msg) => F.push([rule, id, msg]);
  const secOf = (n) => { let p = n; while (p && p.type !== "SECTION") p = p.parent; return p; };
  const blockOf = (n) => { let p = n; while (p && !/^Block · /.test(p.name)) p = p.parent; return p; };
  const box = (n) => n.absoluteBoundingBox;
  const hit = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  const blocks = page.findAll((n) => /^Block · /.test(n.name) && n.type === "FRAME");
  const markers = page.findAll((n) => n.type === "INSTANCE" && /^Marker · /.test(n.name));
  const conns = page.findAll((n) => n.type === "CONNECTOR");
  const seen = {}; const labels = [];
  for (const c of conns) {
    const s = c.connectorStart.endpointNodeId && await figma.getNodeByIdAsync(c.connectorStart.endpointNodeId);
    const e = c.connectorEnd.endpointNodeId && await figma.getNodeByIdAsync(c.connectorEnd.endpointNodeId);
    if (!s || !e || s.removed || e.removed) { add("dangling", c.id, c.name); continue; }
    for (const n of [s, e]) { let p = n; while (p && p.type !== "PAGE") { if (p.visible === false || (/^Page · /.test(p.name) && p.parent.children.slice(p.parent.children.indexOf(p) + 1).some((k) => /scrim|overlay|modal|dialog|sheet|backdrop/i.test(k.name)))) { add("dangling", c.id, "end in hidden/background: " + n.name); break; } p = p.parent; } }
    if (/^(Block|Screen) · /.test(s.name) || s.type === "SECTION") add("start-on-block", c.id, c.name);
    const key = s.id + ">" + e.id; if (seen[key]) add("duplicate", c.id, "same as " + seen[key]); seen[key] = c.id;
    const sb = blockOf(s), eb = blockOf(e); const ss = secOf(s), es = secOf(e);
    if (ss === es && c.parent !== ss) add("wrong-parent", c.id, "same column, parent " + c.parent.name.slice(0, 20));
    if (ss !== es && c.parent.type !== "PAGE") add("wrong-parent", c.id, "cross column inside " + c.parent.name.slice(0, 20));
    const cb = box(c), grow = (b, d) => ({ x: b.x - d, y: b.y - d, width: b.width + 2 * d, height: b.height + 2 * d });
    if (!hit(cb, grow(box(sb), 60)) || !hit(cb, grow(box(eb), 60))) { add("stale-route", c.id, c.name + " box " + [cb.x, cb.y].map(Math.round)); continue; }
    const sB = box(s), eB = box(eb); const segs = [];
    const sm = c.connectorStart.magnet, em = c.connectorEnd.magnet;
    if (sm && sm === em && (sm === "LEFT" || sm === "RIGHT")) { // side lane, 32 px outside the target block
      const lx = sm === "LEFT" ? eB.x - 34 : eB.x + eB.width + 30, y0 = sB.y + sB.height / 2, y1 = eB.y + eB.height / 2;
      segs.push({ x: lx, y: Math.min(y0, y1), width: 4, height: Math.abs(y1 - y0) }); }
    else if (sm === "BOTTOM" && em === "TOP") segs.push({ x: sB.x + sB.width / 2 - 2, y: sB.y + sB.height, width: 4, height: eB.y - (sB.y + sB.height) });
    else if (sm === "LEFT") { const y0 = sB.y + sB.height / 2, y1 = eB.y + (c.connectorEnd.position ? c.connectorEnd.position.y : eB.height / 2);
      segs.push({ x: Math.min(cb.x + 8, eB.x - 4), y: Math.min(y0, y1), width: 4, height: Math.abs(y1 - y0) }); }
    else if (sm === "RIGHT") { const sBl = box(sb); segs.push({ x: sBl.x + sBl.width + 1, y: cb.y, width: eB.x - (sBl.x + sBl.width) - 2, height: cb.height }); }
    for (const g of segs) labels.push([c, g.x + g.width / 2, g.y + g.height / 2, c.text.characters.length * 7 + 16]);
    for (const g of segs) {
      for (const b of blocks) { if (b === sb || b === eb) continue; if (hit(g, box(b))) add("crossing-block", c.id, c.name + " × " + b.name); }
      for (const m of markers) if (hit(g, box(m))) add("crossing-block", c.id, c.name + " × " + m.name);
    }
  }
  // label-overlap: labels sit at the middle of the main segment; two labels closer than 28 px vertically and overlapping
  // horizontally (estimated width 7 px / char) collide
  for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
    const [a, ax, ay, aw] = labels[i], [b, bx, by, bw] = labels[j];
    if (Math.abs(ay - by) < 28 && Math.abs(ax - bx) < (aw + bw) / 2) add("label-overlap", a.id, a.name + " ↔ " + b.name);
  }
  for (const [a, ax, ay, aw] of labels) for (const m of markers) if (hit({ x: ax - aw / 2, y: ay - 10, width: aw, height: 20 }, box(m))) add("label-overlap", a.id, a.name + " label × " + m.name);
  for (const m of markers) {
    const b = m.parent, s = secOf(m), mb = box(m), sbx = box(s);
    const scr = b.children.find((k) => k.type !== "TEXT" && /Screen|desktop/i.test(k.name) && !/label/i.test(k.name)) || b;
    if (Math.round(m.x) !== MARK_X) add("marker-off-grid", m.id, m.name + " x " + m.x);
    if (mb.x + mb.width > sbx.x + sbx.width || mb.x < sbx.x) add("marker-off-grid", m.id, m.name + " outside section");
    if (m.y < scr.y || m.y + m.height > scr.y + scr.height) add("marker-off-grid", m.id, m.name + " outside screen rows");
    for (const o of markers) if (o !== m && o.id < m.id && hit(mb, box(o))) add("marker-off-grid", m.id, "overlaps " + o.name);
    const t = m.findOne((n) => n.type === "TEXT"); const h = t && t.hyperlink;
    if (!h || h.type !== "NODE" || !(await figma.getNodeByIdAsync(h.value))) add("marker-off-grid", m.id, m.name + " no / broken link");
  }
  const per = {}; for (const c of conns) { const p = c.parent.type === "SECTION" ? c.parent.name.slice(0, 2) : "page"; per[p] = (per[p] || 0) + 1; }
  return { connectors: conns.length, markers: markers.length, perParent: per, findings: F };
};
