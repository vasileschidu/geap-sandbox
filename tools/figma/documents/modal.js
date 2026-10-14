// Replace / update the document modal in a block with Modal (Tip=Conținut) + „Modal conținut / Document · detalii”.
// MJOBS = [{ block, title, sub, page: "<page comp id>", pageTexts?: {nr, sig}, rows: [{l, v, tags?: [label], copy?}] }]
await figma.setCurrentPageAsync(await figma.getNodeByIdAsync(PAGE_ID));
figma.skipInvisibleInstanceChildren = false;
const MODAL = await figma.getNodeByIdAsync("10136:656");
const CONTENT = await figma.getNodeByIdAsync("11366:6892");
const dl = await figma.getNodeByIdAsync("6029:27187");
const sig = await figma.importComponentByKeyAsync("4ec9fd805e3a6c16f0d8c022c9b63f8eedfed58a");
const tagSet = await figma.importComponentSetByKeyAsync("a97109f9ebf668fb7616cb37e46929fc75ed9070");
for (const f of [["Onest", "Regular"], ["Onest", "Medium"], ["Onest", "SemiBold"]]) await figma.loadFontAsync({ family: f[0], style: f[1] }).catch(() => {});
const TONE = { "Semnat electronic": "Brand", Proiect: "Neutral", Aprobare: "Success", Respingere: "Danger", Da: "Neutral", "Nu": "Neutral" };
const propKey = (inst, name) => Object.keys(inst.componentProperties).find((k) => k.split("#")[0] === name);
const setP = (inst, obj) => { const s = {}; for (const [n, v] of Object.entries(obj)) { const k = propKey(inst, n); if (k !== undefined) s[k] = v; } if (Object.keys(s).length) inst.setProperties(s); };
const isDesc = (n, root) => { for (let p = n; p; p = p.parent) if (p.id === root.id) return true; return false; };
const conns = figma.currentPage.findAllWithCriteria({ types: ["CONNECTOR"] });
const before = conns.length; const report = [];
for (const job of MJOBS) {
  const blk = await figma.getNodeByIdAsync(job.block);
  let modal = blk.findOne((n) => n.type === "INSTANCE" && n.mainComponent?.parent?.id === "10136:657");
  if (!modal) {
    const raw = blk.findOne((n) => n.type === "FRAME" && /^Modal · /.test(n.name));
    if (!raw) { report.push({ block: blk.name, err: "no modal" }); continue; }
    const host = raw.parent, idx = host.children.indexOf(raw);
    for (const c of conns) for (const end of ["connectorStart", "connectorEnd"]) { const e = c[end]; if (!e.endpointNodeId) continue; const n = await figma.getNodeByIdAsync(e.endpointNodeId); if (n && isDesc(n, raw)) c[end] = { endpointNodeId: host.id, magnet: e.magnet && e.magnet !== "NONE" ? e.magnet : "RIGHT" }; }
    modal = MODAL.createInstance(); host.insertChild(idx, modal);
    if (raw.layoutPositioning === "ABSOLUTE") { modal.layoutPositioning = "ABSOLUTE"; modal.x = raw.x; modal.y = raw.y; }
    raw.remove();
  }
  modal.name = "Modal · " + job.title;
  setP(modal, { "Titlu": job.title, "Subtitlu": job.sub, "Conținut": CONTENT.id });
  const content = modal.findOne((n) => n.type === "INSTANCE" && n.mainComponent?.id === CONTENT.id);
  setP(content, { "Pagină": job.page });
  const pg = content.findOne((n) => n.name === "Pagină (zoom 0,632)") || content.findOne((n) => n.type === "INSTANCE" && /Pagină document/.test(n.mainComponent?.name || ""));
  if (pg && Math.abs(pg.width - 502) > 2) pg.rescale(502 / pg.width);
  if (pg && job.pageTexts) { const tt = pg.children.filter((n) => n.type === "TEXT"); for (const t of tt) for (const s of t.getStyledTextSegments(["fontName"])) await figma.loadFontAsync(s.fontName); if (job.pageTexts.nr) tt[1].characters = job.pageTexts.nr; if (job.pageTexts.sig) tt[tt.length - 1].characters = job.pageTexts.sig; }
  const card = content.findOne((n) => n.name === "Card · Date generale");
  const slots = card.children;
  slots.forEach((r, i) => {
    const spec = job.rows[i];
    if (!spec) { r.visible = false; return; }
    r.visible = true;
    const isTag = spec.tags && spec.tags.length && spec.l !== "Obligatoriu";
    const note = spec.l === "Semnătură" && spec.tags?.length ? spec.v.replace(/^Semnat electronic\s*/, "") : "";
    setP(r, { "Label": spec.l, "Value": isTag ? " " : spec.v, "Show value": !isTag, "Show tag 1": !!isTag, "Show tag 2": false, "Show tag 3": false, "Show copy": !!spec.copy, "Show check": false, "Show sub": !!note, "Sub": note || " ", "Arată text secundar": false, "Arată caption": false });
    if (isTag) {
      const t1 = r.findOne((n) => n.name === "Tag 1");
      const tone = TONE[spec.tags[0]] || "Neutral";
      const icon = spec.tags[0] === "Semnat electronic" ? "Leading" : "None";
      const v = tagSet.children.find((c) => c.variantProperties["🎚️ Type"] === "Subtle" && c.variantProperties["🖌️ Style"] === tone && c.variantProperties["📍 Icon"] === icon && c.variantProperties["🎚️ Size"] === "Small");
      if (t1.mainComponent.id !== v.id) t1.swapComponent(v);
      const s = {}; for (const k of Object.keys(t1.componentProperties)) { if (k.startsWith("⌨️ Label")) s[k] = spec.tags[0]; if (icon === "Leading" && k.startsWith("🔄 Leading Icon: 16")) s[k] = sig.id; } t1.setProperties(s);
    }
    const val = r.findOne((n) => n.type === "TEXT" && n.name === "Value");
    if (val) { if (spec.copy) { val.layoutSizingHorizontal = "HUG"; val.textAutoResize = "WIDTH_AND_HEIGHT"; } else { val.layoutSizingHorizontal = "FILL"; val.textAutoResize = "HEIGHT"; } }
    const sub = r.findOne((n) => n.type === "TEXT" && n.name === "Sub"); if (sub && note) { sub.layoutSizingHorizontal = "FILL"; sub.textAutoResize = "HEIGHT"; }
    r.strokeBottomWeight = i === job.rows.length - 1 ? 0 : 1;
  });
  // footer: Descarcă (Neutral, Leading download) · Închide (Primary), Medium as in code
  const btns = modal.findAll((n) => n.type === "INSTANCE" && n.mainComponent?.parent?.name === "button-filled-circular");
  const [b1, b2] = btns.slice(-2);
  if (b1) { setP(b1, { "🎚️ Size": "Medium", "📍 Icon": "Leading", "⌨️ Label": "Descarcă" }); if (dl) { const k = Object.keys(b1.componentProperties).find((p) => p.startsWith("🔄 Leading Icon: 20")); if (k) b1.setProperties({ [k]: dl.id }); } b1.name = "btn · Descarcă"; }
  if (b2) { setP(b2, { "🎚️ Size": "Medium", "⌨️ Label": "Închide" }); b2.name = "btn · Închide"; }
  report.push({ block: blk.name.slice(8, 40), modal: modal.id, h: Math.round(modal.height), pg: pg ? [Math.round(pg.width), Math.round(pg.height)] : null });
}
return { report, before, after: figma.currentPage.findAllWithCriteria({ types: ["CONNECTOR"] }).length };
