// STEER (stored as barrows/steer) — one connector per arrow (user rule 2026-10-23): no waypoints, no pieces. For every arrow
// that overlaps another arrow, crosses a block or has its label on a block, try every start side × end side (magnets on the
// clicked element / its start anchor and on the target; position endpoints are kept as one option) and keep the combination
// with the lowest cost, measured on Figma's REAL elbow route (SVG export). Cost: overlap 1000 · crossing a block 300 ·
// label on a block 200 · arrowheads touching 300 · length / 100. Two passes.
// Run: new Function("figma", ANALYZE + STEER + "\nreturn STEER;")(figma)(PAGE_ID, { ids?, passes?, max? })
const STEER = async (P, OPT = {}) => {
  const page = await figma.getNodeByIdAsync(P); await figma.setCurrentPageAsync(page);
  const hit = (a, b, d = 0) => a.x < b.x + b.width - d && b.x < a.x + a.width - d && a.y < b.y + b.height - d && b.y < a.y + a.height - d;
  const geo = await ANALYZE(P, { segs: true });
  const obst = []; for (const id of geo.obst) { const n = await figma.getNodeByIdAsync(id); if (n) obst.push(n); }
  const obsOf = (n) => { let p = n; while (p && p.type !== "PAGE") { if (obst.includes(p)) return p; p = p.parent; } const nb = n.absoluteBoundingBox;
    return obst.find((o) => { const b = o.absoluteBoundingBox; return b && nb && nb.x >= b.x - 2 && nb.y >= b.y - 2 && nb.x + nb.width <= b.x + b.width + 2 && nb.y + nb.height <= b.y + b.height + 2; }) || null; };
  const parse = async (c) => {
    let svg; try { svg = await c.exportAsync({ format: "SVG_STRING" }); } catch (e) { return null; }
    const segs = [], hs = []; let lab = null;
    const rm = svg.match(/<rect width="([\d.]+)" height="([\d.]+)"(?: rx="[\d.]+")?(?: transform="translate\(([\d.\-]+)(?:[ ,]([\d.\-]+))?\)")?/);
    if (rm) lab = { x: +(rm[3] || 0), y: +(rm[4] || 0), width: +rm[1], height: +rm[2] };
    const dm = svg.match(/<path d="([^"]+)"/); if (!dm) return null;
    const toks = dm[1].match(/[MLHVCZQ]|-?\d*\.?\d+(?:e-?\d+)?/gi); const strokeMode = /<path d="[^"]+" stroke=/.test(svg);
    let i = 0, cmd = "", cx = 0, cy = 0, pts = [], hasC = false; const sub = [], lines = [];
    const flush = () => { if (pts.length) sub.push({ pts, hasC }); pts = []; hasC = false; };
    while (i < toks.length) { const t = toks[i];
      if (/[A-Za-z]/.test(t)) { cmd = t; i++; if (cmd === "Z" || cmd === "z") flush(); continue; }
      if (cmd === "M") { flush(); cx = +toks[i]; cy = +toks[i + 1]; i += 2; pts.push([cx, cy]); cmd = "L"; }
      else if (cmd === "L") { lines.push([cx, cy, +toks[i], +toks[i + 1]]); cx = +toks[i]; cy = +toks[i + 1]; i += 2; pts.push([cx, cy]); }
      else if (cmd === "H") { lines.push([cx, cy, +toks[i], cy]); cx = +toks[i]; i++; pts.push([cx, cy]); }
      else if (cmd === "V") { lines.push([cx, cy, cx, +toks[i]]); cy = +toks[i]; i++; pts.push([cx, cy]); }
      else if (cmd === "C") { cx = +toks[i + 4]; cy = +toks[i + 5]; i += 6; pts.push([cx, cy]); hasC = true; }
      else if (cmd === "Q") { cx = +toks[i + 2]; cy = +toks[i + 3]; i += 4; pts.push([cx, cy]); hasC = true; }
      else i++; }
    flush();
    if (strokeMode) { for (const [x1, y1, x2, y2] of lines) { if (Math.abs(y1 - y2) < 1 && Math.abs(x2 - x1) > 6) segs.push({ o: "h", c: y1, a: Math.min(x1, x2), b: Math.max(x1, x2) }); else if (Math.abs(x1 - x2) < 1 && Math.abs(y2 - y1) > 6) segs.push({ o: "v", c: x1, a: Math.min(y1, y2), b: Math.max(y1, y2) }); } }
    else for (const sp of sub) { const xs = sp.pts.map((p) => p[0]), ys = sp.pts.map((p) => p[1]);
      const b = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
      if (b.height <= 4 && b.width > 6) segs.push({ o: "h", c: b.y + b.height / 2, a: b.x, b: b.x + b.width });
      else if (b.width <= 4 && b.height > 6) segs.push({ o: "v", c: b.x + b.width / 2, a: b.y, b: b.y + b.height });
      else if (!sp.hasC && b.width < 40 && b.height < 40) hs.push(b); }
    let ux0 = Infinity, uy0 = Infinity;
    for (const g of segs) { if (g.o === "h") { ux0 = Math.min(ux0, g.a); uy0 = Math.min(uy0, g.c); } else { ux0 = Math.min(ux0, g.c); uy0 = Math.min(uy0, g.a); } }
    if (lab) { ux0 = Math.min(ux0, lab.x); uy0 = Math.min(uy0, lab.y); }
    const bb = c.absoluteBoundingBox; const ox = bb.x - ux0, oy = bb.y - uy0;
    return { segs: segs.map((g) => g.o === "h" ? { o: "h", c: g.c + oy, a: g.a + ox, b: g.b + ox, id: c.id } : { o: "v", c: g.c + ox, a: g.a + oy, b: g.b + oy, id: c.id }),
      heads: hs.map((h) => ({ x: h.x + ox, y: h.y + oy, width: h.width, height: h.height })), lab: lab && c.text.characters.trim() ? { x: lab.x + ox, y: lab.y + oy, width: lab.width, height: lab.height } : null };
  };
  const all = page.findAllWithCriteria({ types: ["CONNECTOR"] });
  const cur = {}; for (const g of geo.segs) (cur[g.id] = cur[g.id] || { segs: [], heads: [] }).segs.push(g);
  const cost = (c, r, sb, eb) => {
    if (!r) return 1e9; let k = 0, len = 0;
    for (const A of r.segs) { len += A.b - A.a;
      for (const [id, o] of Object.entries(cur)) { if (id === c.id) continue; for (const B of o.segs) if (A.o === B.o && Math.abs(A.c - B.c) < 8 && Math.min(A.b, B.b) - Math.max(A.a, B.a) > 16) k += 1000; }
      const box = A.o === "h" ? { x: A.a, y: A.c - 1, width: A.b - A.a, height: 2 } : { x: A.c - 1, y: A.a, width: 2, height: A.b - A.a };
      for (const o of obst) { if (o === sb || o === eb) continue; const ob = o.absoluteBoundingBox; if (ob && hit(box, ob, 4)) k += 300; } }
    if (r.lab) for (const o of obst) { if (sb === eb && o === sb) continue; const ob = o.absoluteBoundingBox; if (ob && hit(r.lab, ob, 2)) k += 200; }
    for (const h of r.heads) for (const [id, o] of Object.entries(cur)) if (id !== c.id) for (const g of o.heads || []) if (hit({ x: h.x - 8, y: h.y - 8, width: h.width + 16, height: h.height + 16 }, g)) k += 300;
    return k + len / 100;
  };
  // which arrows to steer
  let ids = OPT.ids;
  if (!ids) { const an = await ANALYZE(P, { full: true }); ids = [...new Set(an.findings.filter((f) => f[0] !== "detached" && f[0] !== "export").flatMap((f) => f[0] === "overlap" ? [f[1], f[2].split(" ")[0]] : [f[1]]))]; }
  for (const id of ids) { const c = await figma.getNodeByIdAsync(id); if (c) { const r = await parse(c); if (r) cur[id] = r; } }
  const M = ["RIGHT", "LEFT", "BOTTOM", "TOP"]; const log = [];
  for (let pass = 0; pass < (OPT.passes || 2); pass++) {
    for (const id of ids.slice(0, OPT.max || 400)) {
      const c = await figma.getNodeByIdAsync(id); if (!c || c.type !== "CONNECTOR") continue;
      const s0 = c.connectorStart, e0 = c.connectorEnd;
      const S = await figma.getNodeByIdAsync(s0.endpointNodeId), E = await figma.getNodeByIdAsync(e0.endpointNodeId); if (!S || !E) continue;
      const sb = obsOf(S), eb = obsOf(E); if (sb && sb === eb && !OPT.intra) continue;
      const sBox = S.absoluteBoundingBox; const smallS = sBox.width <= 600 && sBox.height <= 200;
      const sOpts = s0.position && !smallS ? [s0] : M.map((m) => ({ endpointNodeId: S.id, magnet: m }));
      const eOpts = M.map((m) => ({ endpointNodeId: E.id, magnet: m })); if (e0.position) eOpts.unshift(e0);
      // anchor placement on the target: its label row / screens are valid ends too (arrow lands on the same block)
      const T = /^Block · /.test(E.name) ? E : (E.parent && /^Block · /.test(E.parent.name) ? E.parent : null);
      if (T && OPT.children !== false) for (const k of T.children) if (k.visible && (k.type === "FRAME" || k.type === "INSTANCE") && k.id !== E.id && k.width > 100) for (const m of M) eOpts.push({ endpointNodeId: k.id, magnet: m });
      let best = { k: cost(c, cur[id], sb, eb), s: s0, e: e0, r: cur[id] }; const k0 = best.k;
      for (const so of sOpts) for (const eo of eOpts) {
        try { c.connectorStart = so; c.connectorEnd = eo; } catch (err) { continue; }
        const r = await parse(c); const k = cost(c, r, sb, eb); if (k < best.k - 0.5) best = { k, s: so, e: eo, r }; }
      c.connectorStart = best.s; c.connectorEnd = best.e; cur[id] = best.r;
      if (best.k < k0 - 0.5) log.push([id, Math.round(k0), Math.round(best.k), (best.s.magnet || "pos") + "→" + (best.e.magnet || "pos")]);
    }
  }
  return { steered: log.length, log: log.slice(0, 60) };
};
