// Swap captured raw BO document rows („List Item” with a 24px „Image” lead) for „Document · rând” instances.
// ROOTS = block ids. Keeps connectors (parked on the list, re-attached by index).
await figma.setCurrentPageAsync(await figma.getNodeByIdAsync(PAGE_ID));
figma.skipInvisibleInstanceChildren = false;
const ROWSET = await figma.getNodeByIdAsync("11362:7113");
await figma.loadFontAsync({ family: "Onest", style: "Regular" }); await figma.loadFontAsync({ family: "Onest", style: "Medium" });
const pick = (q) => ROWSET.children.find((c) => Object.entries(q).every(([k, v]) => c.variantProperties[k] === v));
const propKey = (inst, name) => Object.keys(inst.componentProperties).find((k) => k.split("#")[0] === name);
const setP = (inst, obj) => { const s = {}; for (const [n, v] of Object.entries(obj)) { const k = propKey(inst, n); if (k) s[k] = v; } inst.setProperties(s); };
const tagSet = (tag, label, style) => { const s = {}; for (const k of Object.keys(tag.componentProperties)) { if (k.startsWith("⌨️ Label")) s[k] = label; if (k === "🖌️ Style" && style) s[k] = style; } tag.setProperties(s); };
const isDesc = (n, root) => { for (let p = n; p; p = p.parent) if (p.id === root.id) return true; return false; };
const blueish = (n) => n.findAll ? n.findAll((x) => "fills" in x && Array.isArray(x.fills) && x.fills.some((f) => f.type === "SOLID" && f.color.b > 0.6 && f.color.r < 0.4) || (x.fills && Array.isArray(x.fills) && x.fills.some((f) => f.type === "GRADIENT_LINEAR"))).length > 0 : false;
const conns = figma.currentPage.findAllWithCriteria({ types: ["CONNECTOR"] });
const before = conns.length; const report = [];
for (const rid of ROOTS) {
  const root = await figma.getNodeByIdAsync(rid);
  const items = root.findAll((n) => n.type === "FRAME" && n.name === "List Item" && n.children[0]?.name === "Image" && Math.round(n.children[0].width) === 24);
  let swapped = 0;
  const lists = new Set(items.map((i) => i.parent));
  for (const list of lists) {
    const rows = list.children.filter((c) => items.includes(c));
    const parked = [];
    for (const c of conns) for (const end of ["connectorStart", "connectorEnd"]) { const e = c[end]; if (!e.endpointNodeId) continue; const n = await figma.getNodeByIdAsync(e.endpointNodeId); if (!n) continue; const idx = rows.findIndex((r) => isDesc(n, r)); if (idx < 0) continue; parked.push({ c, end, idx, magnet: e.magnet, position: e.position }); c[end] = { endpointNodeId: list.id, magnet: "RIGHT" }; }
    const made = [];
    rows.forEach((li, ri) => {
      const main = li.children[1];
      const head = main.children[0], metaC = main.children[1];
      const title = head.findOne((n) => n.type === "TEXT").characters;
      const tags = head.findAll((n) => n.type === "INSTANCE" && n.mainComponent?.parent?.name === "tag-filled").map((t) => ({ label: t.findOne((x) => x.type === "TEXT")?.characters || "", style: t.componentProperties["🖌️ Style"]?.value }));
      const meta = metaC ? metaC.findAll((n) => n.type === "TEXT" && n.visible).map((t) => t.characters.trim()).filter(Boolean) : [];
      const btns = li.findAll((n) => n.type === "INSTANCE" && /^button/.test(n.mainComponent?.parent?.name || "") && n.visible);
      const labels = btns.map((b) => { const k = Object.keys(b.componentProperties).find((p) => p.startsWith("⌨️ Label")); return b.componentProperties["📍 Icon"]?.value === "Only" ? "⋮" : (k ? b.componentProperties[k].value : ""); });
      const hasMenu = labels.includes("⋮"), edit = labels.includes("Editează"), det = labels.some((l) => /Detalii|Vezi|Previzualizează/.test(l));
      const ac = det ? "Detalii + ⋮" : edit ? (hasMenu ? "Editează + ⋮" : "Editează") : "⋮";
      const t0 = tags[0]?.label || "";
      const src = ["Încărcat", "MDocs", "Generat"].includes(t0) ? t0 : blueish(li.children[0]) ? "Generat" : "Încărcat";
      const inst = pick({ Source: src, State: "Default", "Acțiune": ac }).createInstance();
      list.insertChild(list.children.indexOf(li), inst); inst.layoutSizingHorizontal = "FILL"; inst.name = "Document · " + title;
      const signed = tags.some((t) => t.label === "Semnat electronic");
      const status = tags.slice(1).filter((t) => t.label !== "Semnat electronic");
      const slots = ["Număr", "Fișier", "Dimensiune", "Data", "De", "Semnat de"];
      const props = { "Titlu": title, "Semnat": signed, "Etichetă stare": status.length > 0, "Etichetă stare 2": status.length > 1, "Linie sus": ri > 0, "Arată număr": meta.length > 0, "Arată fișier": meta.length > 1, "Arată „de …”": meta.length > 4, "Arată „semnat de …”": meta.length > 5 };
      meta.forEach((m, i) => { if (slots[i]) props[slots[i]] = m; });
      setP(inst, props);
      if (meta.length < 3) for (const n of ["Dimensiune", "Data"]) { inst.findOne((x) => x.name === n && x.type === "TEXT").visible = false; inst.findOne((x) => x.name === "Punct · " + n).visible = false; }
      else if (meta.length < 4) { inst.findOne((x) => x.name === "Data" && x.type === "TEXT").visible = false; inst.findOne((x) => x.name === "Punct · Data").visible = false; }
      if (t0 && t0 !== src) tagSet(inst.findOne((n) => n.name === "Etichetă · sursă"), t0, tags[0].style);
      if (status[0]) tagSet(inst.findOne((n) => n.name === "Etichetă · stare"), status[0].label, status[0].style);
      if (status[1]) tagSet(inst.findOne((n) => n.name === "Etichetă · stare 2"), status[1].label, status[1].style);
      made.push(inst); li.remove(); swapped++;
    });
    list.paddingLeft = 0; list.paddingRight = 0; list.itemSpacing = 0;
    for (const p of parked) { const nr = made[p.idx]; if (nr) p.c[p.end] = p.position ? { endpointNodeId: nr.id, position: p.position } : { endpointNodeId: nr.id, magnet: p.magnet && p.magnet !== "NONE" ? p.magnet : "RIGHT" }; }
  }
  report.push({ root: root.name.slice(8, 40), swapped });
}
return { report, before, after: figma.currentPage.findAllWithCriteria({ types: ["CONNECTOR"] }).length };
