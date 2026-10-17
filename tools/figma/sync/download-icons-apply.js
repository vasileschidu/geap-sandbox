// Download / export / import icon sync (code b523060e, 2026-10-17) — use_figma, per file.
// MODE "dry" | "apply". PAGES = page ids. TARGETS = component ids/keys in THIS file:
//   EXPORT = central „arrow-inbox, download” filled=on, stroke=1.5, radius=2, join=round (key e41040ca…) —
//            filled=on so the glyph follows the button variant colour (the stroke-based GEAP 20/export stays dark on Primary)
//   UPLOAD = Foundations 20/upload (key e72e41aa…)
// Rules: icon name × host label → target. The icon is changed through the host's INSTANCE_SWAP property
// (the one whose value = the icon's current main); without such a property → swapComponent on the icon.
// Returns a snapshot (host, prop, old → new) for revert + counts. Labelled buttons with NO icon are listed (fix by hand).
const MODE = __MODE__;
const PAGES = __PAGES__;
const EXPORT = await figma.importComponentByKeyAsync("e41040cad8f8622843fba350661894ea6c4823d6");
const UPLOAD = await figma.importComponentByKeyAsync("e72e41aa51a34c586d0e3e31309dc738551e1ba8");
const RULES = [
  { icon: /^(\d+\/)?(download|page-download|circle-download|external-link)$/i, label: /^(Descarcă|Descarca|Exportă|Export)(?!.*din MDocs)/i, to: EXPORT },
  { icon: /^(\d+\/)?(download|page-download)$/i, label: /^(Importă din MDocs|Descarcă din MDocs)/i, to: UPLOAD },
  { icon: /^(\d+\/)?(external-link)$/i, label: /^@aria:Descarcă/i, to: EXPORT }
];
figma.skipInvisibleInstanceChildren = false;
const snap = [], skipped = [], counts = {};
for (const pid of PAGES) {
  const page = await figma.getNodeByIdAsync(pid); await figma.setCurrentPageAsync(page);
  for (const ic of page.findAllWithCriteria({ types: ["INSTANCE"] })) {
    const nm = ic.name.trim();
    if (!RULES.some((r) => r.icon.test(nm))) continue;
    let host = ic.parent; while (host && host.type !== "INSTANCE" && host.type !== "PAGE") host = host.parent;
    if (!host || host.type !== "INSTANCE") continue;
    const t = host.findOne((n) => n.type === "TEXT" && n.characters.trim());
    const label = t ? t.characters.trim() : "@aria:" + (host.name || "");
    const rule = RULES.find((r) => r.icon.test(nm) && r.label.test(label));
    if (!rule) continue;
    const cur = await ic.getMainComponentAsync();
    if (cur && cur.id === rule.to.id) continue;
    const props = host.componentProperties;
    // EVERY swap slot that holds the old glyph (Small buttons show the 16 slot, the 20 slot can hold the same glyph — 2026-10-17)
    const slots = Object.keys(props).filter((k) => props[k].type === "INSTANCE_SWAP" && props[k].value === (cur && cur.id));
    const prop = slots[0];
    const rec = { page: page.name.slice(0, 20), host: host.id, label: label.slice(0, 40), icon: ic.id, from: nm, to: rule.to.name.slice(0, 20), prop: slots.join(",") || null, old: cur && cur.id, w: ic.width };
    if (MODE === "apply") {
      try {
        if (prop) for (const k of slots) host.setProperties({ [k]: rule.to.id });
        else { const paints = JSON.parse(JSON.stringify((ic.findOne((n) => n.type === "VECTOR") || {}).fills || [])); ic.swapComponent(rule.to); if (paints.length) for (const v of ic.findAll((n) => n.type === "VECTOR")) v.fills = paints; rec.nested = true; }
      } catch (e) { rec.err = String(e).slice(0, 80); skipped.push(rec); continue; }
    }
    snap.push(rec);
    const ck = rec.page + " | " + rec.label.slice(0, 28) + " | " + nm + "→" + rec.to + (prop ? "" : " (nested)");
    counts[ck] = (counts[ck] || 0) + 1;
  }
}
return { counts, n: snap.length, skipped, snap: MODE === "apply" ? snap.map((s) => [s.host, s.prop, s.old, s.icon].join("|")) : undefined };
