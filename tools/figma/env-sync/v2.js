// env-sync v2 alignment pass (2026-11-19, env-sync-align-v1 — code b35b938e: list layout, scope tabs and direction columns
// restored; kept from the round: dark selection bar + primary action, RAP-flat steps tables, framed STAGING column, panel
// CTAs). Stored in figma.root shared plugin data „envs”/„v2”:
//   const V2 = new Function("return " + figma.root.getSharedPluginData("envs","v2"))(); await V2(OP, ARGS)
// OPS
//   "flat"    {screens}  steps tables (activity batches, history drawer, dialog plans — also inside Modal slots) = the RAP
//             flat table: wrapper square, only a 1 px top border/base/default (= the line under the batch header), header
//             cells tertiary band, no bottom line, caption 12/16 500
//   "staging" {screens}  list table: one `STAGING column frame` (1 px border/brand/secondary left + right, full column
//             height) absolute in the table's scroll box over the STAGING column (tint stays on the cells)
//   "badge"   {}  Batch header 50:6639: step count = library numbered-badge Size=Large (exposed `Count`, after the title);
//             fills every instance on the board from its meta line („… · N modificări”)
//   "arrows"  {list}  re-route connectors: [{conn, from, to, edge?, end:{x,y}, startMagnet?, endMagnet}] — `from` = the
//             element (or its old anchor) whose bbox gives the start y; `edge` = k → a 2×2 gutter anchor in the source
//             block at x 1536 + 16k (lane outside the screens), otherwise the start anchor sits on the element; `end` =
//             an 8×8 anchor inside the target block (block-relative). Old anchors that no connector uses are removed.
async (OP, A = {}) => {
  figma.skipInvisibleInstanceChildren = false;
  const g = (id) => figma.getNodeByIdAsync(id);
  const KS = {}, VV = {}, SS = {};
  const ks = async (k) => (KS[k] = KS[k] || (await figma.importComponentSetByKeyAsync(k)));
  const vk = async (k) => (VV[k] = VV[k] || (await figma.variables.importVariableByKeyAsync(k)));
  const sk = async (k) => (SS[k] = SS[k] || (await figma.importStyleByKeyAsync(k)));
  // Foundations „1. Semantic Colors” 723ad797… (the library the board binds)
  const C = { border: "9fa253aab4b44e39a049a0cbbd163e4c61e129b6", brandBorderSec: "f4f8e8a306c5fa8a1a95b9e160714fda6d5bd0d2", tertiary: A.tertiary };
  const CM5 = "f28b7696292db20f926d7897d94e584ceb392ceb";
  const BADGE = "68a3732b7f9426c74b6c022887f0c7b9daca495d";
  const paint = async (k) => [figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", await vk(k))];
  const pk = (i, pre) => Object.keys(i.componentProperties).find((k) => k.startsWith(pre));
  const texts = (n) => (!n || n.removed ? [] : n.type === "TEXT" ? [n] : n.findAll ? n.findAll((x) => x.type === "TEXT" && x.visible !== false) : []);
  const textOf = (n) => texts(n).map((x) => x.characters).join(" ").replace(/\s+/g, " ").trim();
  const lf = async (t) => { for (const s of t.getStyledTextSegments(["fontName"])) await figma.loadFontAsync(s.fontName); };
  const unR = (p) => { for (const f of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) { try { p.setBoundVariable(f, null); } catch (e) {} } p.cornerRadius = 0; };
  const done = {}; const D = (k) => (done[k] = (done[k] || 0) + 1); const un = [];
  const isSteps = (tb) => { const h = tb.children.filter((k) => !k.gridRowAnchorIndex).map(textOf).join("|"); return /^Ce\|Sensul|Când\|Cine|Obiect\|Sensul|Ce\|Sens|^Nr\.\|Obiect\|Sens/.test(h) || (/Sensul|Versiunea/.test(h) && !/STAGING/.test(h)); };

  if (OP === "flat") {
    const st = await sk(CM5); await figma.loadFontAsync(st.fontName);
    for (const id of A.screens) {
      const scr = await g(id);
      for (const tb of scr.findAll((n) => n.type === "FRAME" && n.layoutMode === "GRID" && /^Table/.test(n.name))) {
        if (!isSteps(tb)) continue;
        // wrapper = the first framed ancestor (scroll box / card)
        let w = null; for (let p = tb.parent, k = 0; p && k < 3 && p.type === "FRAME"; p = p.parent, k++) if (p.strokes && p.strokes.length) { w = p; break; }
        if (w) { w.strokes = await paint(C.border); w.strokeWeight = 0; w.strokeTopWeight = 1; w.strokeAlign = "INSIDE"; unR(w); w.clipsContent = true; D("wrap"); }
        tb.strokes = []; unR(tb);
        for (const h of tb.children.filter((k) => !k.gridRowAnchorIndex && k.type === "FRAME")) {
          h.fills = await paint(C.tertiary); if ("strokeBottomWeight" in h) h.strokeBottomWeight = 0;
          for (const t of h.findAll((x) => x.type === "TEXT")) { await lf(t); await t.setTextStyleIdAsync(st.id); }
          D("head");
        }
      }
    }
    return { done };
  }

  if (OP === "staging") {
    for (const id of A.screens) {
      const scr = await g(id);
      for (const tb of scr.findAll((n) => n.type === "FRAME" && n.layoutMode === "GRID" && /^Table - /.test(n.name))) {
        const head = tb.children.find((k) => !k.gridRowAnchorIndex && /^STAGING( aici lucrezi)?$/.test(textOf(k)));
        const box = tb.parent; if (!head || !box) { un.push("no STAGING " + tb.id); continue; }
        let fr = box.findChild((x) => x.name === "STAGING column frame");
        if (!fr) { fr = figma.createFrame(); fr.name = "STAGING column frame"; box.appendChild(fr); }
        fr.fills = []; fr.strokes = await paint(C.brandBorderSec); fr.strokeWeight = 0; fr.strokeLeftWeight = 1; fr.strokeRightWeight = 1; fr.strokeAlign = "INSIDE";
        if (box.layoutMode && box.layoutMode !== "NONE") fr.layoutPositioning = "ABSOLUTE";
        const bb = head.absoluteBoundingBox, pb = box.absoluteBoundingBox, tbb = tb.absoluteBoundingBox;
        fr.x = Math.round(bb.x - pb.x); fr.y = Math.round(tbb.y - pb.y); fr.resize(Math.round(bb.width), Math.round(tb.height)); fr.constraints = { horizontal: "MIN", vertical: "STRETCH" }; D("frame");
      }
    }
    return { done, un };
  }

  if (OP === "badge") {
    const set = await g("50:6639"); const bs = await ks(BADGE);
    const v = bs.children.find((c) => /Size=(L|Large)\b/.test(c.name) && /Outlin/.test(c.name) && /Neutral/.test(c.name)) || bs.children.find((c) => /Size=(L|Large)\b/.test(c.name) && /Neutral/.test(c.name)) || bs.defaultVariant;
    for (const comp of set.children) {
      const row = comp.findOne((x) => x.name === "Title row"); if (!row || row.findChild((x) => x.name === "Count")) continue;
      const b = v.createInstance(); b.name = "Count"; const ti = row.children.findIndex((x) => x.name === "Title"); row.insertChild(ti + 1, b); b.isExposedInstance = true; D("main");
    }
    for (const i of figma.currentPage.findAll((n) => n.type === "INSTANCE" && n.mainComponent && n.mainComponent.parent && n.mainComponent.parent.id === set.id)) {
      const meta = (i.componentProperties[pk(i, "Meta line")] || {}).value || ""; const m = meta.match(/(\d+)\s+modific/); const b = i.findOne((x) => x.type === "INSTANCE" && x.name === "Count");
      const t = b && b.findOne((x) => x.type === "TEXT"); if (t && m) { await lf(t); t.characters = m[1]; D("count"); } else un.push(i.id + " " + meta.slice(-30));
    }
    return { done, variant: v.name, un: un.slice(0, 8) };
  }

  if (OP === "arrows") {
    const used = new Set(); const old = [];
    for (const a of A.list) {
      const c = await g(a.conn), el = await g(a.from), to = await g(a.to);
      let blk = el; while (blk.parent && !/^Block · /.test(blk.name)) blk = blk.parent; blk.clipsContent = false;
      let scr = el; while (scr.parent && !/^Desktop · /.test(scr.name)) scr = scr.parent;
      const eb = el.absoluteBoundingBox, bb = blk.absoluteBoundingBox;
      let start = el;
      if (a.edge != null) { const an = figma.createFrame(); an.name = "anchor · edge · " + a.label; an.fills = []; blk.appendChild(an); an.layoutPositioning = "ABSOLUTE"; an.resize(2, 2); an.x = 1536 + 16 * a.edge; an.y = Math.round(eb.y + eb.height / 2 - bb.y); start = an; if (/^anchor · /.test(el.name)) old.push(el); }
      to.clipsContent = false;
      const e = figma.createFrame(); e.name = "anchor · end · " + a.label; e.fills = []; to.appendChild(e); e.layoutPositioning = "ABSOLUTE"; e.resize(8, 8); e.x = a.end.x; e.y = a.end.y;
      const prevEnd = c.connectorEnd && c.connectorEnd.endpointNodeId; if (prevEnd) { const pe = await g(prevEnd); if (pe && /^anchor · end/.test(pe.name)) old.push(pe); }
      c.connectorStart = { endpointNodeId: start.id, magnet: a.startMagnet || "RIGHT" }; c.connectorEnd = { endpointNodeId: e.id, magnet: a.endMagnet || "RIGHT" }; c.connectorLineType = "ELBOWED";
      used.add(start.id); used.add(e.id); D("arrow");
    }
    for (const n of old) if (!n.removed && !used.has(n.id)) { n.remove(); D("old-anchor"); }
    return { done };
  }
  return "unknown op";
}
