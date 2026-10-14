// Rebuild a document stack (BO) from a prototype spec with „Document · rând” instances.
// JOBS = [{ stack: "<Stack frame id>", spec: <section spec from docrows.mjs>, headingMeta?: true }]
// Keeps connectors attached to rows (re-pointed by row index), returns a diff.
await figma.setCurrentPageAsync(await figma.getNodeByIdAsync(PAGE_ID));
figma.skipInvisibleInstanceChildren = false;
const ROWSET = await figma.getNodeByIdAsync("11362:7113");
const GH = await figma.getNodeByIdAsync("9521:8747"); // svc/stack-group-header
const tagSet = await figma.importComponentSetByKeyAsync("a97109f9ebf668fb7616cb37e46929fc75ed9070");
await figma.loadFontAsync({ family: "Onest", style: "Regular" }); await figma.loadFontAsync({ family: "Onest", style: "Medium" });
const STYLE = { neutral: "Neutral", brand: "Brand", success: "Success", danger: "Danger", warning: "Accent", accent: "Accent", muted: "Muted" };
const pick = (q) => ROWSET.children.find((c) => Object.entries(q).every(([k, v]) => c.variantProperties[k] === v));
const propKey = (inst, name) => Object.keys(inst.componentProperties).find((k) => k.split("#")[0] === name);
const setP = (inst, obj) => { const s = {}; for (const [n, v] of Object.entries(obj)) { const k = propKey(inst, n); if (k) s[k] = v; } inst.setProperties(s); };
const tagSetProps = (tag, label, tone) => { const s = {}; for (const k of Object.keys(tag.componentProperties)) { if (k.startsWith("⌨️ Label")) s[k] = label; if (k === "🖌️ Style" && tone) s[k] = STYLE[tone] || "Neutral"; } tag.setProperties(s); };
const isDesc = (n, root) => { for (let p = n; p; p = p.parent) if (p.id === root.id) return true; return false; };
const page = figma.currentPage;
const conns = page.findAllWithCriteria({ types: ["CONNECTOR"] });
const before = conns.length;
const report = [];
for (const job of JOBS) {
  const stack = await figma.getNodeByIdAsync(job.stack);
  const oldRows = stack.children.filter((c) => c.type === "INSTANCE" && c.mainComponent && (c.mainComponent.name === "svc/stack-item" || c.mainComponent.parent?.name === "Document · rând"));
  // 1. snapshot connector ends on rows → park them on the stack
  const parked = [];
  for (const c of conns) for (const end of ["connectorStart", "connectorEnd"]) {
    const e = c[end]; if (!e.endpointNodeId) continue;
    const n = await figma.getNodeByIdAsync(e.endpointNodeId); if (!n) continue;
    const idx = oldRows.findIndex((r) => isDesc(n, r)); if (idx < 0) continue;
    parked.push({ c, end, idx, magnet: e.magnet, position: e.position });
    c[end] = { endpointNodeId: stack.id, magnet: e.magnet && e.magnet !== "NONE" ? e.magnet : "RIGHT" };
  }
  const tplHeader = stack.children.find((c) => c.type === "INSTANCE" && c.mainComponent?.name === "svc/stack-group-header");
  for (const ch of [...stack.children]) ch.remove();
  const newRows = [];
  const groups = job.spec.groups;
  groups.forEach((g, gi) => {
    if (g.label) {
      const h = GH.createInstance(); stack.appendChild(h); h.layoutSizingHorizontal = "FILL";
      setP(h, { "Label": g.label, "Show count": true });
      const cnt = h.findOne((n) => n.name === "Count"); if (cnt) { const k = Object.keys(cnt.componentProperties).find((p) => cnt.componentProperties[p].type === "TEXT"); if (k) cnt.setProperties({ [k]: String(g.rows.length) }); else { const t = cnt.findOne((n) => n.type === "TEXT"); if (t) t.characters = String(g.rows.length); } }
      if (gi === 0) { h.topLeftRadius = 11; h.topRightRadius = 11; }
    }
    g.rows.forEach((r, ri) => {
      const t0 = r.tags[0]?.label || "";
      const src = ["Încărcat", "MDocs", "Generat"].includes(t0) ? t0 : r.icon === "gen" ? "Generat" : "Încărcat";
      const has = (l) => r.acts.some((a) => a.label === l);
      const menu = r.acts.some((a) => /menu-trigger/.test(a.cls));
      const ac = has("Detalii") ? "Detalii + ⋮" : has("Editează") ? (menu ? "Editează + ⋮" : "Editează") : "⋮";
      const st = r.open ? "Meniu deschis" : r.hover ? "Hover" : "Default";
      const v = pick({ Source: src, State: st, "Acțiune": ac }) || pick({ Source: src, State: "Default", "Acțiune": ac });
      const inst = v.createInstance(); stack.appendChild(inst); inst.layoutSizingHorizontal = "FILL"; inst.name = "Document · " + r.title;
      const signed = r.tags.some((t) => t.label === "Semnat electronic");
      const status = r.tags.slice(1).filter((t) => t.label !== "Semnat electronic");
      const parts = (r.parts[0] || []).concat(...r.parts.slice(1));
      const m = { "Număr": null, "Fișier": null, "Dimensiune": null, "Data": null, "De": null, "Semnat de": null };
      const docLike = parts.some((p) => /^\d+([.,]\d+)? (KB|MB)$/.test(p));
      if (docLike) {
        for (const p of parts) {
          if (/^\d+([.,]\d+)? (KB|MB)$/.test(p)) m["Dimensiune"] = p;
          else if (/^semnat de /i.test(p)) m["Semnat de"] = p;
          else if (/^de /.test(p)) m["De"] = p;
          else if (/^(Încărcat|Atașat|Preluat automat|Emis|Generat|Preluat) \d/.test(p)) m["Data"] = p;
          else if (/\.(pdf|docx?|xlsx?|png|jpe?g|zip)$/i.test(p)) m["Fișier"] = p;
          else m["Număr"] = p;
        }
      } else { const slots = ["Număr", "Fișier", "Dimensiune", "Data", "De", "Semnat de"]; parts.forEach((p, i) => { if (slots[i]) m[slots[i]] = p; }); }
      const props = { "Titlu": r.title, "Semnat": signed, "Etichetă stare": status.length > 0, "Etichetă stare 2": status.length > 1,
        "Arată număr": !!m["Număr"], "Arată fișier": !!m["Fișier"], "Arată „de …”": !!m["De"], "Arată „semnat de …”": !!m["Semnat de"],
        "Linie sus": !(ri === 0) && st === "Default" };
      for (const k of Object.keys(m)) if (m[k]) props[k] = m[k];
      // Dimensiune / Data always visible in the component: when absent (type lists) hide the layer
      setP(inst, props);
      const srcTag = inst.findOne((n) => n.name === "Etichetă · sursă"); if (srcTag && t0 && t0 !== src) tagSetProps(srcTag, t0, r.tags[0].tone);
      if (status[0]) tagSetProps(inst.findOne((n) => n.name === "Etichetă · stare"), status[0].label, status[0].tone);
      if (status[1]) tagSetProps(inst.findOne((n) => n.name === "Etichetă · stare 2"), status[1].label, status[1].tone);
      for (const n of ["Dimensiune", "Data"]) if (!m[n]) { const t = inst.findOne((x) => x.name === n && x.type === "TEXT"); if (t) t.visible = false; const d = inst.findOne((x) => x.name === "Punct · " + n); if (d) d.visible = false; }
      if (!m["Dimensiune"] && !m["Data"] && !docLike) { /* type list: dots before hidden slots already off */ }
      newRows.push(inst);
    });
  });
  // the row after a hover / open band loses its top line; first / last band rows round with the card
  newRows.forEach((r, i) => {
    const st = r.mainComponent.variantProperties.State;
    if (st !== "Default") {
      const nx = newRows[i + 1]; if (nx && stack.children.indexOf(nx) === stack.children.indexOf(r) + 1) setP(nx, { "Linie sus": false });
      if (stack.children[stack.children.length - 1] === r) { r.bottomLeftRadius = 11; r.bottomRightRadius = 11; }
      if (stack.children[0] === r) { r.topLeftRadius = 11; r.topRightRadius = 11; }
    }
  });
  stack.cornerRadius = 12; stack.clipsContent = true;
  // 2. re-attach parked connector ends to the new row with the same index
  let reattached = 0;
  for (const p of parked) { const nr = newRows[p.idx]; if (!nr) continue; p.c[p.end] = p.position ? { endpointNodeId: nr.id, position: p.position } : { endpointNodeId: nr.id, magnet: p.magnet && p.magnet !== "NONE" ? p.magnet : "RIGHT" }; reattached++; }
  if (job.meta !== undefined) { const sec = stack.parent; const h = sec.children.find((c) => c.type === "INSTANCE" && c.mainComponent?.name === "svc/section-heading"); if (h) setP(h, { "Meta": job.meta, "Show meta": !!job.meta }); }
  report.push({ stack: stack.id, rows: newRows.length, h: Math.round(stack.height), parked: parked.length, reattached });
}
return { report, before, after: page.findAllWithCriteria({ types: ["CONNECTOR"] }).length };
