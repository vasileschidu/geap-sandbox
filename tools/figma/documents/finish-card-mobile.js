// FO Finalizare / Ghișeu Confirmarea depunerii — proof-of-filing certificate card → the shared `Document · card`
// Context=Certificate instance (ghiseu-bundle-figma-v1, 2026-10-23; code 36e31351 finish-doc-error-filecard-v1 +
// „Vezi …” label only). Replaces the old green banner / pink error row / captured phone card (`Completion · document
// (mobile)`, library system-files-item) in place, desktop AND phone (the file name is kept for history).
// Variants come from tools/figma/documents/certificate-card-set.js (run that first).
// Params (prepend): const CARDS = [{ id: "<old card>", state: "Default" | "Error", screen: "Desktop" | "Mobile",
//   title: "Certificatul Constatator", note: "Dovada depunerii cererii. Disponibil și în EVO Cabinet.", link: "EVO Cabinet" }, …];
// Connectors that start / end on the old card or anything inside it are re-pointed to the new instance at the
// action button (position = right edge on desktop, the button's centre on phones) BEFORE the old node is removed.
figma.skipInvisibleInstanceChildren = false;
const set = await figma.getNodeByIdAsync("11364:7441");
const K = (p) => Object.keys(set.componentPropertyDefinitions).find((k) => k.startsWith(p));
const variant = (st, sc) => set.children.find((c) => c.name === `Context=Certificate, Source=Generated, State=${st}, Screen=${sc}`);
await figma.loadFontAsync({ family: "Onest", style: "Regular" });
const conns = figma.currentPage.findAll((n) => n.type === "CONNECTOR");
const out = [];
for (const spec of CARDS) {
  const old = await figma.getNodeByIdAsync(spec.id); if (!old) { out.push(spec.id + " missing"); continue; }
  const inside = new Set([old.id, ...("findAll" in old ? old.findAll(() => true).map((n) => n.id) : [])]);
  const parent = old.parent, idx = parent.children.indexOf(old);
  const inst = variant(spec.state, spec.screen).createInstance();
  parent.insertChild(idx, inst);
  if (parent.layoutMode && parent.layoutMode !== "NONE") inst.layoutSizingHorizontal = "FILL"; else inst.resize(old.width, inst.height);
  inst.setProperties({ [K("Title#")]: spec.title, [K("Note#")]: spec.note });
  inst.name = "Document · card · " + spec.title;
  if (spec.link) { // the note's link (FO: „EVO Cabinet”) = underlined, same colour (code `.e-permits-fo-finish-doc-card__note a`)
    const t = inst.findOne((n) => n.type === "TEXT" && n.name === "Note"); const i = t.characters.indexOf(spec.link);
    if (i > -1) t.setRangeTextDecoration(i, i + spec.link.length, "UNDERLINE");
  }
  const a = inst.findOne((n) => n.name === "Action");
  const ab = a.absoluteBoundingBox, ib = inst.absoluteBoundingBox;
  const pos = spec.screen === "Desktop" ? { x: Math.round(ib.width), y: Math.round(ab.y - ib.y + ab.height / 2) } : { x: Math.round(ab.x - ib.x + ab.width), y: Math.round(ab.y - ib.y + ab.height / 2) };
  let moved = 0;
  for (const c of conns) {
    if (inside.has(c.connectorStart?.endpointNodeId)) { c.connectorStart = { endpointNodeId: inst.id, position: pos }; moved++; }
    if (inside.has(c.connectorEnd?.endpointNodeId)) { c.connectorEnd = { endpointNodeId: inst.id, position: pos }; moved++; }
  }
  const h0 = Math.round(old.height);
  old.remove();
  out.push(`${spec.id} → ${inst.id} ${spec.state}/${spec.screen} ${h0}→${Math.round(inst.height)} conns ${moved}`);
}
return out;
