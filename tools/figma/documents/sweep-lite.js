// sweep.js rules that apply outside eKYC (screens = direct screen frames of „Block · …”) + deep descendant overflow.
// Params: SECTION_ID, BLOCK_RX (string) — prepend: const SECTION_ID = "…", BLOCK_RX = "^Block · 0[12]";
const sec = await figma.getNodeByIdAsync(SECTION_ID); let pg = sec; while (pg.type !== "PAGE") pg = pg.parent; await figma.setCurrentPageAsync(pg);
const rx = new RegExp(BLOCK_RX);
const r = { blocks: 0, screens: 0, deepCut: 0, childOverflow: 0, emptyGridRows: 0, iconImageFills: 0, rawSvgIcons: 0, monoText: 0, ex: [] };
const push = (s) => { if (r.ex.length < 25) r.ex.push(s); };
const hasContent = (n) => { if (n.type === "TEXT") return !!n.characters.trim(); if (["INSTANCE","VECTOR","BOOLEAN_OPERATION","ELLIPSE","RECTANGLE"].includes(n.type)) return true; if (Array.isArray(n.fills) && n.fills.some(f => f.visible !== false && (f.opacity ?? 1) > 0)) return true; return "children" in n && n.children.some(k => k.visible !== false && hasContent(k)); };
for (const b of sec.children.filter(c => c.type === "FRAME" && /^Block · /.test(c.name) && rx.test(c.name))) {
  r.blocks++;
  const wrap = b.children.find(c => /^Ecrane/.test(c.name));
  const screens = wrap ? wrap.children : b.children.filter(c => c.type === "FRAME" && !/^(Screen label|Note)/.test(c.name));
  for (const s of screens) { r.screens++;
    const walk = (n, clip) => { if (n.visible === false) return; const bb = n.absoluteRenderBounds || n.absoluteBoundingBox;
      if (n !== s && bb && bb.width > 0 && hasContent(n)) { const d = Math.max(bb.y + bb.height - clip.y - clip.height, bb.x + bb.width - clip.x - clip.width, clip.x - bb.x, clip.y - bb.y); if (d > 1.5 && n.layoutPositioning !== "ABSOLUTE") { r.deepCut++; push("cut " + b.name.split(" · ")[1] + " " + n.id + " " + n.name.slice(0, 20) + " " + Math.round(d)); return; } }
      if (n.type === "INSTANCE" || !("children" in n)) return;
      const nc = n.clipsContent ? n.absoluteBoundingBox : clip;
      for (const k of n.children) {
        if (k.visible !== false && k.layoutPositioning !== "ABSOLUTE" && n.layoutMode && n.layoutMode !== "NONE" && n.layoutMode !== "GRID" && !n.clipsContent && hasContent(k)) { const pb = n.absoluteBoundingBox, kb = k.absoluteBoundingBox; if (pb && kb && kb.width > 0) { const d = Math.max(pb.x - kb.x, kb.x + kb.width - pb.x - pb.width, pb.y - kb.y, kb.y + kb.height - pb.y - pb.height); if (d > 1) { r.childOverflow++; push("overflow " + b.name.split(" · ")[1] + " " + k.id + " in " + n.name.slice(0, 14) + " " + Math.round(d)); } } }
        walk(k, nc); } };
    walk(s, s.absoluteBoundingBox);
    for (const g of s.findAll(n => n.type === "FRAME" && n.layoutMode === "GRID")) { const used = new Set(); for (const c of g.children) for (let k = c.gridRowAnchorIndex; k < c.gridRowAnchorIndex + (c.gridRowSpan || 1); k++) used.add(k); if (used.size < g.gridRowCount) { r.emptyGridRows++; push("emptyrow " + g.id); } }
  }
  for (const n of b.findAll(x => !x.id.includes(";") && x.type !== "INSTANCE" && !/logo/i.test(x.name) && "fills" in x && Array.isArray(x.fills) && x.fills.some(f => f.type === "IMAGE" && f.visible !== false) && x.width <= 48 && x.height <= 48)) { r.iconImageFills++; push("img " + n.id); }
  r.rawSvgIcons += b.findAll(x => /^h2d-svg/.test(x.name) && !x.id.includes(";")).length;
  for (const t of b.findAll(x => x.type === "TEXT" && x.visible && x.fontName !== figma.mixed && /Mono/.test(x.fontName.family))) { r.monoText++; push("mono " + t.id + " " + t.characters.slice(0, 16)); }
}
r.connectors = pg.findAllWithCriteria({ types: ["CONNECTOR"] }).length;
return r;
