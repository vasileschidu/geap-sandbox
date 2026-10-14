// Replace FO / Cabinet document nodes with „Document · card” instances.
// CJOBS = [{ replace: id | {block, find: "<regex on frame name>", text?: "<text inside>"}, ctx, cards: [{icon, title, tags, meta, sel}] }]
await figma.setCurrentPageAsync(await figma.getNodeByIdAsync(PAGE_ID));
figma.skipInvisibleInstanceChildren = false;
const CARDSET = await figma.getNodeByIdAsync(CARDSET_ID);
await figma.loadFontAsync({ family: "Onest", style: "Regular" }); await figma.loadFontAsync({ family: "Onest", style: "Medium" });
const pk = (inst, n) => Object.keys(inst.componentProperties).find((k) => k.split("#")[0] === n);
const setP = (inst, obj) => { const s = {}; for (const [n, v] of Object.entries(obj)) { const k = pk(inst, n); if (k) s[k] = v; } inst.setProperties(s); };
const isDesc = (n, root) => { for (let p = n; p; p = p.parent) if (p.id === root.id) return true; return false; };
const conns = figma.currentPage.findAllWithCriteria({ types: ["CONNECTOR"] });
const before = conns.length, report = [];
const mk = (spec, ctx) => {
  const t0 = spec.tags[0] || "";
  const src = ["Încărcat", "MDocs", "Generat"].includes(t0) ? t0 : /generated/.test(spec.icon) ? "Generat" : "Încărcat";
  const st = spec.hover ? "Hover" : "Default";
  const v = CARDSET.children.find((c) => c.variantProperties.Context === (spec.sel ? "Selectat" : ctx) && c.variantProperties.Source === src && c.variantProperties.State === st) || CARDSET.children.find((c) => c.variantProperties.Context === (spec.sel ? "Selectat" : ctx) && c.variantProperties.Source === src);
  const inst = v.createInstance();
  const m = { "Număr": null, "Fișier": null, "Dimensiune": null, "Data": null, "De": null };
  for (const p of spec.meta) {
    if (/^\d+([.,]\d+)? (KB|MB)$/.test(p)) m["Dimensiune"] = p;
    else if (/^de /.test(p)) m["De"] = p;
    else if (/^(Încărcat|Atașat|Preluat|Emis|Generat) /.test(p)) m["Data"] = p;
    else if (/\.(pdf|docx?|xlsx?|png|jpe?g|zip)$/i.test(p)) m["Fișier"] = p;
    else m["Număr"] = p;
  }
  const props = { "Titlu": spec.title, "Semnat": spec.tags.includes("Semnat electronic"), "Etichetă valabilitate": spec.tags.includes("Activă"), "Arată număr": !!m["Număr"], "Arată fișier": !!m["Fișier"], "Arată dimensiune": !!m["Dimensiune"], "Arată „de …”": !!m["De"] };
  for (const k of Object.keys(m)) if (m[k]) props[k] = m[k];
  setP(inst, props);
  if (!m["Data"]) { const d = inst.findOne((x) => x.name === "Data" && x.type === "TEXT"); if (d) d.visible = false; }
  inst.name = "Document · " + spec.title;
  return inst;
};
for (const job of CJOBS) {
  let node = typeof job.replace === "string" ? await figma.getNodeByIdAsync(job.replace) : null;
  if (!node) { const b = await figma.getNodeByIdAsync(job.replace.block); node = b.findOne((n) => n.type === "FRAME" && new RegExp(job.replace.find).test(n.name) && (!job.replace.text || n.findOne((t) => t.type === "TEXT" && t.characters.includes(job.replace.text)))); }
  if (!node) { report.push({ err: "not found", job: JSON.stringify(job.replace).slice(0, 80) }); continue; }
  const parent = node.parent, idx = parent.children.indexOf(node);
  for (const c of conns) for (const end of ["connectorStart", "connectorEnd"]) { const e = c[end]; if (!e.endpointNodeId) continue; const n = await figma.getNodeByIdAsync(e.endpointNodeId); if (n && isDesc(n, node)) c[end] = { endpointNodeId: parent.id, magnet: e.magnet && e.magnet !== "NONE" ? e.magnet : "RIGHT" }; }
  const w = node.width, abs = node.layoutPositioning === "ABSOLUTE";
  let put;
  if (job.cards.length === 1 && !job.list) { put = mk(job.cards[0], job.ctx); }
  else { put = figma.createAutoLayout("VERTICAL", { name: job.listName || "Documente", itemSpacing: job.gap ?? 8 }); put.fills = []; put.clipsContent = false; for (const s of job.cards) { const i = mk(s, job.ctx); put.appendChild(i); i.layoutSizingHorizontal = "FILL"; } }
  parent.insertChild(idx, put);
  if (parent.layoutMode && parent.layoutMode !== "NONE" && !abs) { try { put.layoutSizingHorizontal = "FILL"; } catch (e) { put.resize(w, put.height); } } else { put.resize(w, put.height); put.x = node.x; put.y = node.y; }
  if (put.type === "FRAME") for (const i of put.children) i.layoutSizingHorizontal = "FILL";
  node.remove();
  report.push({ put: put.id, w: Math.round(put.width), h: Math.round(put.height) });
}
return { report, before, after: figma.currentPage.findAllWithCriteria({ types: ["CONNECTOR"] }).length };
