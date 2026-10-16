// Quality sweep · Ghișeu (2026-10-16) — list states gh-01c / gh-01f / gh-01a / gh-01b rebuilt on gh-01's recaptured table
// (code 086ca562: config column widths 144/184/152/144/120/152/180/212/192, actions pinned right = absolute cells at x 1016
// + grid placeholders; empty state centred in the visible area of the scrolled table).
//   gh-01c  table ← gh-01 table; „Filtrare avansată” State=Focus (open panel keeps the ring, as the code)
//   gh-01f  table ← gh-01 table, 1 row; cells ← the old row's contents (column order unchanged); pinned cell = „👁 Detalii”
//           (lone view action, no ⋮) as the code
//   gh-01a/b table ← gh-01 header (+ pinned header cell), body = the old empty-state cell spanning all columns, its content
//           wrapped in a 1152 frame (= visible 1184 − 2×16) so it centres in the visible area like the code
//   gh-01b  „Filtrare avansată” Disabled, empty-state „Dosar nou” without icon (code); gh-01a search = Focus + clear (code)
const LIST_STATES = async () => {
  const page = await figma.getNodeByIdAsync("11589:327039"); await figma.setCurrentPageAsync(page);
  const SRC = await figma.getNodeByIdAsync("11853:23351"); // gh-01 table
  const out = [];
  const tableOf = (bid) => figma.getNodeByIdAsync(bid).then((b) => b.findOne((n) => n.type === "FRAME" && /^Table - Dosare noi/.test(n.name)));
  const swapTable = (old) => { const p = old.parent, i = p.children.indexOf(old); const t = SRC.clone(); p.insertChild(i, t); t.name = old.name; return t; };
  const cut = (t, keepRows) => {
    for (const k of [...t.children]) {
      const r = k.layoutPositioning === "ABSOLUTE" ? (k.y < 38 ? 0 : 1 + Math.round((k.y - 38) / 50)) : k.gridRowAnchorIndex;
      if (r >= keepRows) k.remove();
    }
    t.gridRowCount = keepRows;
  };
  const btnSet = async (inst, props) => { const o = {}; for (const [k, v] of Object.entries(props)) { const key = Object.keys(inst.componentProperties).find((x) => x.split("#")[0] === k); if (key) o[key] = v; } inst.setProperties(o); };
  // gh-01c
  { const old = await tableOf("11818:21109"); swapTable(old); old.remove();
    const fb = (await figma.getNodeByIdAsync("11818:21109")).findOne((n) => n.type === "INSTANCE" && n.name === "btn · Advanced filtering"); await btnSet(fb, { "🎚️ State": "Focus" }); out.push("gh-01c ok"); }
  // gh-01f
  { const old = await tableOf("11818:21125"); const t = swapTable(old); cut(t, 2);
    const oc = old.children.filter((k) => k.gridRowAnchorIndex === 1 && k.layoutPositioning !== "ABSOLUTE");
    const nc = t.children.filter((k) => k.gridRowAnchorIndex === 1 && k.layoutPositioning !== "ABSOLUTE" && !/placeholder/i.test(k.name));
    for (let c = 0; c < nc.length; c++) { const o = oc.find((k) => k.gridColumnAnchorIndex === c); if (!o) continue; for (const k of [...nc[c].children]) k.remove(); for (const k of o.children) nc[c].appendChild(k.clone()); }
    const sticky = t.children.find((k) => k.layoutPositioning === "ABSOLUTE" && k.y >= 38);
    const cont = sticky.findOne((n) => n.type === "INSTANCE" && n.name === "btn · Continuă");
    await btnSet(cont, { "⌨️ Label": "Detalii", "🔄 Leading Icon: 16": "464:24533" }); cont.name = "btn · Detalii";
    for (const k of sticky.findAll((n) => n.type === "INSTANCE" && /Mai multe|More actions|⋮/.test(n.name))) k.remove();
    old.remove(); out.push("gh-01f ok cells " + nc.length); }
  // gh-01a / gh-01b
  for (const bid of ["11818:21173", "11818:21189"]) {
    const old = await tableOf(bid); const t = swapTable(old); cut(t, 1);
    const empty = old.children.find((k) => k.gridRowAnchorIndex === 1);
    t.gridRowCount = 2; t.appendChild(empty); empty.setGridChildPosition(1, 0); empty.gridColumnSpan = t.gridColumnCount;
    empty.layoutSizingHorizontal = "FILL"; empty.counterAxisAlignItems = "MIN";
    const wrap = figma.createFrame(); wrap.name = "Empty state · visible area"; wrap.fills = [];
    wrap.layoutMode = "VERTICAL"; wrap.counterAxisAlignItems = "CENTER"; wrap.primaryAxisSizingMode = "AUTO"; wrap.itemSpacing = empty.itemSpacing;
    if (empty.boundVariables && empty.boundVariables.itemSpacing) wrap.setBoundVariable("itemSpacing", await figma.variables.getVariableByIdAsync(empty.boundVariables.itemSpacing.id));
    const kids = [...empty.children]; empty.appendChild(wrap); wrap.layoutSizingHorizontal = "FIXED"; wrap.resize(1152, wrap.height);
    for (const k of kids) wrap.appendChild(k);
    empty.itemSpacing = 0; old.remove();
    out.push(`${bid} empty ${empty.width}x${empty.height}`);
  }
  const b01b = await figma.getNodeByIdAsync("11818:21189");
  await btnSet(b01b.findOne((n) => n.type === "INSTANCE" && n.name === "btn · Advanced filtering"), { "🎚️ State": "Disabled" });
  const eb = b01b.findOne((n) => n.type === "INSTANCE" && /Dosar nou/.test(n.name) && n.parent && /Empty|empty|visible/.test(n.parent.name + n.parent.parent.name));
  if (eb) { const opts = (await eb.getMainComponentAsync()).parent.componentPropertyDefinitions["📍 Icon"].variantOptions; out.push("icon opts " + opts.join("/")); const none = opts.find((o) => /None|False|Off/i.test(o)); if (none) await btnSet(eb, { "📍 Icon": none }); }
  const s = (await figma.getNodeByIdAsync("11818:21173")).findOne((n) => n.type === "INSTANCE" && n.name === "search");
  out.push("search " + JSON.stringify(Object.fromEntries(Object.entries(s.componentProperties).map(([k, v]) => [k.slice(0, 16), v.value]))));
  return out;
};
