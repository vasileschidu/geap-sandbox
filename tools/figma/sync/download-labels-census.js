// Read-only: every visible TEXT starting with „Descarcă” / „Exportă” / „Importă” → the icon next to it
// (first INSTANCE ≤ 32 px in the host instance / parent row). Aggregated per page | label | icon | host.
// Also catches labelled buttons with NO icon or a raw (non-instance) glyph. PAGES = page ids.
const PAGES = __PAGES__;
const LRE = /^(Descarc|Export|Import|Download)/i;
const out = [];
for (const pid of PAGES) {
  const page = await figma.getNodeByIdAsync(pid);
  await figma.setCurrentPageAsync(page);
  const agg = {};
  for (const t of page.findAllWithCriteria({ types: ["TEXT"] })) {
    if (!t.visible || !LRE.test(t.characters.trim())) continue;
    let host = t.parent, hostInst = null, d = 0;
    while (host && host.type !== "PAGE" && d < 4) { if (host.type === "INSTANCE") { hostInst = host; break; } host = host.parent; d++; }
    const scope = hostInst || t.parent;
    const ic = scope.findOne ? scope.findOne((n) => n.type === "INSTANCE" && n.visible && n.width <= 32 && n.height <= 32) : null;
    const raw = !ic && scope.findOne ? scope.findOne((n) => (n.type === "VECTOR" || n.type === "FRAME") && n.width <= 24 && n.height <= 24 && n.width >= 12) : null;
    const k = [t.characters.trim().slice(0, 34), ic ? ic.name.slice(0, 30) : raw ? "RAW:" + raw.name.slice(0, 20) : "NO-ICON", hostInst ? hostInst.name.slice(0, 30) : "(frame)"].join(" | ");
    (agg[k] = agg[k] || { n: 0, id: t.id }).n++;
  }
  for (const [k, v] of Object.entries(agg)) out.push(page.name.slice(0, 14) + " | " + k + " → " + v.n + " " + v.id);
}
return out;
