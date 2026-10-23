// Board arrow analyzer (read-only, board-arrows-v2 2026-10-23).
// (outlined stroke → thin bands = segments) and reports:
//   overlap   — two connectors run along the same line (parallel, < 8 px apart, > 16 px shared)
//   cross     — a segment runs through a block / screen that is neither the start nor the end block
//   head      — two arrowheads closer than 16 px
//   label     — two labels overlap, or a label sits on a block
//   detached  — an endpoint is missing
// Stored in figma.root shared plugin data „barrows” / „analyze”; run:
//   const src = figma.root.getSharedPluginData("barrows","analyze");
//   return await new Function("figma", src + "\nreturn ANALYZE;")(figma)(PAGE_ID, { only: [...ids] , scope: SECTION_ID });
const ANALYZE = async (PAGE_ID, OPT = {}) => {
  const page = await figma.getNodeByIdAsync(PAGE_ID); await figma.setCurrentPageAsync(page);
  const root = OPT.scope ? await figma.getNodeByIdAsync(OPT.scope) : page;
  const conns = root.findAllWithCriteria({ types: ["CONNECTOR"] }).filter((c) => !OPT.only || OPT.only.includes(c.id));
  const hit = (a, b, d = 0) => a.x < b.x + b.width - d && b.x < a.x + a.width - d && a.y < b.y + b.height - d && b.y < a.y + a.height - d;
  // obstacles: blocks (or section children) + their screens
  const secs = page.children.filter((k) => k.type === "SECTION");
  const obst = [];
  const isObs = (k) => k.visible && (k.type === "FRAME" || k.type === "INSTANCE" || k.type === "GROUP" || k.type === "COMPONENT" || k.type === "COMPONENT_SET") && k.width >= 120 && k.height >= 60 && !/^(anchor|lane|Flow anchor)/i.test(k.name);
  const pushSec = (s) => { for (const k of s.children) { if (k.type === "SECTION") { pushSec(k); continue; } if (isObs(k)) obst.push(k); } };
  for (const s of secs) pushSec(s);
  for (const k of page.children) if (k.type !== "SECTION" && isObs(k)) obst.push(k);
  const obsOf = (n) => { let p = n; while (p && p.type !== "PAGE") { if (obst.includes(p)) return p; p = p.parent; } return null; };
  const R = []; const segsAll = []; const heads = []; const labels = [];
  const num = /-?\d*\.?\d+(?:e-?\d+)?/g;
  for (const c of conns) {
    const sId = c.connectorStart.endpointNodeId, eId = c.connectorEnd.endpointNodeId;
    const s = sId && await figma.getNodeByIdAsync(sId), e = eId && await figma.getNodeByIdAsync(eId);
    if (!s || !e || s.removed || e.removed) { R.push(["detached", c.id, c.name]); continue; }
    let svg; try { svg = await c.exportAsync({ format: "SVG_STRING" }); } catch (err) { R.push(["export", c.id, String(err).slice(0, 60)]); continue; }
    const segs = [], hs = []; let lab = null;
    const rm = svg.match(/<rect width="([\d.]+)" height="([\d.]+)"(?: rx="[\d.]+")?(?: transform="translate\(([\d.\-]+)(?:[ ,]([\d.\-]+))?\)")?/);
    if (rm) lab = { x: +(rm[3] || 0), y: +(rm[4] || 0), width: +rm[1], height: +rm[2] };
    const dm = svg.match(/<path d="([^"]+)"/); // first path = the line (+ caps); later paths = label glyphs
    if (dm) {
      const toks = dm[1].match(/[MLHVCZQ]|-?\d*\.?\d+(?:e-?\d+)?/gi);
      let i = 0, cmd = "", cx = 0, cy = 0, pts = [], hasC = false; const sub = [], lines = []; const strokeMode = /<path d="[^"]+" stroke=/.test(svg);
      const flush = () => { if (pts.length) sub.push({ pts, hasC }); pts = []; hasC = false; };
      while (i < toks.length) {
        const t = toks[i];
        if (/[A-Za-z]/.test(t)) { cmd = t; i++; if (cmd === "Z" || cmd === "z") { flush(); } continue; }
        if (cmd === "M") { flush(); cx = +toks[i]; cy = +toks[i + 1]; i += 2; pts.push([cx, cy]); cmd = "L"; }
        else if (cmd === "L") { lines.push([cx, cy, +toks[i], +toks[i + 1]]); cx = +toks[i]; cy = +toks[i + 1]; i += 2; pts.push([cx, cy]); }
        else if (cmd === "H") { lines.push([cx, cy, +toks[i], cy]); cx = +toks[i]; i++; pts.push([cx, cy]); }
        else if (cmd === "V") { lines.push([cx, cy, cx, +toks[i]]); cy = +toks[i]; i++; pts.push([cx, cy]); }
        else if (cmd === "C") { cx = +toks[i + 4]; cy = +toks[i + 5]; i += 6; pts.push([cx, cy]); hasC = true; }
        else if (cmd === "Q") { cx = +toks[i + 2]; cy = +toks[i + 3]; i += 4; pts.push([cx, cy]); hasC = true; }
        else i++;
      }
      flush();
      if (strokeMode) { // un-outlined stroke (pieces without caps): every straight command is a segment
        for (const [x1, y1, x2, y2] of lines) { if (Math.abs(y1 - y2) < 1 && Math.abs(x2 - x1) > 6) segs.push({ o: "h", c: y1, a: Math.min(x1, x2), b: Math.max(x1, x2) });
          else if (Math.abs(x1 - x2) < 1 && Math.abs(y2 - y1) > 6) segs.push({ o: "v", c: x1, a: Math.min(y1, y2), b: Math.max(y1, y2) }); }
        sub.length = 0; }
      for (const sp of sub) {
        const xs = sp.pts.map((p) => p[0]), ys = sp.pts.map((p) => p[1]);
        const b = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
        if (b.height <= 4 && b.width > 6) segs.push({ o: "h", c: b.y + b.height / 2, a: b.x, b: b.x + b.width });
        else if (b.width <= 4 && b.height > 6) segs.push({ o: "v", c: b.x + b.width / 2, a: b.y, b: b.y + b.height });
        else if (!sp.hasC && b.width < 40 && b.height < 40) hs.push(b);
      }
    }
    // offset svg → absolute: connector bbox = union(centre line, label)
    let ux0 = Infinity, uy0 = Infinity;
    for (const g of segs) { if (g.o === "h") { ux0 = Math.min(ux0, g.a); uy0 = Math.min(uy0, g.c); } else { ux0 = Math.min(ux0, g.c); uy0 = Math.min(uy0, g.a); } }
    if (lab) { ux0 = Math.min(ux0, lab.x); uy0 = Math.min(uy0, lab.y); }
    const bb = c.absoluteBoundingBox; const ox = bb.x - ux0, oy = bb.y - uy0;
    const inside = (n) => { const nb = n.absoluteBoundingBox; return obst.find((o) => { const b = o.absoluteBoundingBox; return b && nb && nb.x >= b.x - 2 && nb.y >= b.y - 2 && nb.x + nb.width <= b.x + b.width + 2 && nb.y + nb.height <= b.y + b.height + 2; }) || null; };
    const sb = obsOf(s) || inside(s), eb = obsOf(e) || inside(e); // start anchors sit over their block (section child)
    for (const g of segs) {
      const A = g.o === "h" ? { o: "h", c: g.c + oy, a: g.a + ox, b: g.b + ox } : { o: "v", c: g.c + ox, a: g.a + oy, b: g.b + oy };
      A.id = c.id; segsAll.push(A);
      const box = A.o === "h" ? { x: A.a, y: A.c - 1, width: A.b - A.a, height: 2 } : { x: A.c - 1, y: A.a, width: 2, height: A.b - A.a };
      for (const o of obst) { if (o === sb || o === eb) continue; if (o.parent && (o.parent === sb || o.parent === eb)) continue; const ob = o.absoluteBoundingBox; if (ob && hit(box, ob, 4)) R.push(["cross", c.id, o.name.slice(0, 40)]); }
    }
    for (const h of hs) heads.push({ id: c.id, x: h.x + ox, y: h.y + oy, width: h.width, height: h.height });
    if (lab && c.text.characters.trim()) { const L = { id: c.id, x: lab.x + ox, y: lab.y + oy, width: lab.width, height: lab.height }; labels.push(L);
      for (const o of obst) { if (sb === eb && o === sb) continue; const ob = o.absoluteBoundingBox; if (ob && hit(L, ob, 2)) R.push(["label-on-block", c.id, o.name.slice(0, 40)]); } }
  }
  if (OPT.segs) return { segs: segsAll, labels, obst: obst.map((o) => o.id) };
  for (let i = 0; i < segsAll.length; i++) for (let j = i + 1; j < segsAll.length; j++) {
    const A = segsAll[i], B = segsAll[j]; if (A.id === B.id || A.o !== B.o) continue;
    if (Math.abs(A.c - B.c) < 8 && Math.min(A.b, B.b) - Math.max(A.a, B.a) > 16) R.push(["overlap", A.id, B.id + " " + A.o + "@" + Math.round(A.c)]);
  }
  // arrowhead boxes: only the end heads (ARROW_LINES); a start cap NONE has none
  for (let i = 0; i < heads.length; i++) for (let j = i + 1; j < heads.length; j++) { const A = heads[i], B = heads[j]; if (A.id !== B.id && hit({ x: A.x - 8, y: A.y - 8, width: A.width + 16, height: A.height + 16 }, B)) R.push(["head", A.id, B.id]); }
  for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) if (hit(labels[i], labels[j], -4)) R.push(["label", labels[i].id, labels[j].id]);
  // dedupe
  const seen = new Set(); const out = R.filter((r) => { const k = r.join("|"); if (seen.has(k)) return false; seen.add(k); return true; });
  const by = {}; for (const r of out) by[r[0]] = (by[r[0]] || 0) + 1;
  return { connectors: conns.length, obstacles: obst.length, counts: by, findings: OPT.full ? out : out.slice(0, OPT.max || 80) };
};
