// Quality sweep · Ghișeu (2026-10-16) — local BO shell components built from the CODE geometry
// (measure.mjs gh-01 ".e-permits-shell__topbar" / ".e-permits-shell__header"):
//   Shell / Gov bar (desktop)      1440×32, pad 6/24/0/24, SPACE_BETWEEN, bottom border inside (not in layout),
//                                  gov link = crest 18×21 + gap 4 + label (pad-top 2 → text y 8 as the code), language switcher
//   Shell / Header (BO desktop)    the captured header (auto-layout already) + notification button 36×36 (capture had 36×20),
//                                  TEXT property „Title”, exposed nested Instance switcher (Detail / Name / State)
// Run once via use_figma (BUILD). Sources = the captured frames in Block · gh-01 (ids below). Then SWAP per column.
const BUILD = async () => {
  const SP = { 2: "4e3c603781105ce160a1dc8d8ea7e97128057074", 4: "983c5b4d9a4e5fa988f0154c9bf4290c7aec9635", 6: "82d50194c1a9db8a29ad3e4b6e7eb2af1ff0cc39", 24: "49c6a5e43fd55f8fa058dfc13851df2854db5d83", 80: "6b41a484af89fb00350dc4422ac7fb5e7cf8687a" };
  const V = {}; const sp = async (n) => (V[n] = V[n] || (await figma.variables.importVariableByKeyAsync(SP[n])));
  const bind = async (node, prop, n) => { node[prop] = n; if (n) node.setBoundVariable(prop, await sp(n)); };
  const lp = await figma.getNodeByIdAsync("10566:10080"); await figma.setCurrentPageAsync(lp);
  const capTop = await figma.getNodeByIdAsync("11860:24416"); // .top-section (gh-01)
  const capHdr = await figma.getNodeByIdAsync("11860:24430"); // Shell header (gh-01)
  const holder = figma.createFrame(); lp.appendChild(holder);
  holder.name = "Ghișeu · BO shell components"; holder.x = 101296; holder.y = 1700; holder.fills = [];
  holder.layoutMode = "VERTICAL"; holder.primaryAxisSizingMode = "AUTO"; holder.counterAxisSizingMode = "AUTO";
  for (const p of ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "itemSpacing"]) await bind(holder, p, 80);
  // ── Gov bar
  const gov = figma.createComponent(); holder.appendChild(gov);
  gov.name = "Shell / Gov bar (desktop)";
  gov.description = "BO shell top bar (code .e-permits-shell__topbar): 32 high, border-bottom inside, gov link (crest 18×21 + 4 + label) left, language switcher right. Text colour = code var(--black) (primitive), kept as captured.";
  gov.layoutMode = "HORIZONTAL"; gov.primaryAxisSizingMode = "FIXED"; gov.counterAxisSizingMode = "FIXED"; gov.resize(1440, 32);
  gov.primaryAxisAlignItems = "SPACE_BETWEEN"; gov.counterAxisAlignItems = "MIN";
  await bind(gov, "paddingTop", 6); await bind(gov, "paddingLeft", 24); await bind(gov, "paddingRight", 24); gov.paddingBottom = 0;
  gov.fills = capTop.fills; gov.strokes = capTop.strokes; gov.strokeAlign = "INSIDE";
  gov.strokeTopWeight = 0; gov.strokeLeftWeight = 0; gov.strokeRightWeight = 0; gov.strokeBottomWeight = 1; gov.strokesIncludedInLayout = false;
  gov.clipsContent = true;
  const link = figma.createFrame(); gov.appendChild(link); link.name = "Gov link"; link.fills = [];
  link.layoutMode = "HORIZONTAL"; link.primaryAxisSizingMode = "AUTO"; link.counterAxisSizingMode = "AUTO"; link.counterAxisAlignItems = "MIN"; await bind(link, "itemSpacing", 4);
  const crest = capTop.findOne((n) => n.name === "government-logo").clone(); link.appendChild(crest); crest.name = "government-logo";
  const lab = figma.createFrame(); link.appendChild(lab); lab.name = "Label"; lab.fills = [];
  lab.layoutMode = "HORIZONTAL"; lab.primaryAxisSizingMode = "AUTO"; lab.counterAxisSizingMode = "AUTO"; await bind(lab, "paddingTop", 2);
  const t = capTop.findOne((n) => n.type === "TEXT" && /Guvernul/.test(n.characters)).clone(); lab.appendChild(t);
  await figma.loadFontAsync(t.fontName); t.textAutoResize = "WIDTH_AND_HEIGHT";
  const lang = capTop.findOne((n) => n.name === "Language Selector").clone(); gov.appendChild(lang);
  lang.layoutSizingVertical = "HUG";
  // ── Shell header
  const hc = capHdr.clone(); holder.appendChild(hc);
  const nb = hc.findAll((n) => n.name === "shell__icon-button").find((n) => n.height < 36);
  if (nb) { nb.layoutSizingVertical = "FIXED"; nb.resize(36, 36); }
  const hdr = figma.createComponentFromNode(hc);
  hdr.name = "Shell / Header (BO desktop)";
  hdr.description = "BO shell header (code .e-permits-shell__header, 1184×66 next to the sidebar): page title + Actualizează, help / notifications, Instance switcher (exposed: Detail / Name / State).";
  const title = hdr.findOne((n) => n.type === "TEXT" && n.name === "Dosare noi");
  title.name = "Title";
  await figma.loadFontAsync(title.fontName);
  const pk = hdr.addComponentProperty("Title", "TEXT", title.characters);
  title.componentPropertyReferences = { characters: pk };
  const sw = hdr.findOne((n) => n.type === "INSTANCE" && n.name === "Instance switcher"); sw.isExposedInstance = true;
  return { holder: holder.id, gov: gov.id, govKey: gov.key, hdr: hdr.id, hdrKey: hdr.key, govH: gov.height, hdrH: hdr.height, linkX: link.x, textX: t.absoluteTransform[0][2] - gov.absoluteTransform[0][2], langX: lang.x, nb: !!nb };
};

// SWAP — per column (block ids). Gov bar frame → Shell / Gov bar instance (FILL); Shell header frame → Shell / Header instance
// (Title + Instance switcher props carried over). Absolute full-screen overlays are resized to the new screen height.
const SWAP_SHELL = async (BLOCKS) => {
  const page = await figma.getNodeByIdAsync("11589:327039"); await figma.setCurrentPageAsync(page);
  const gov = await figma.getNodeByIdAsync("11903:7111"), hdr = await figma.getNodeByIdAsync("11903:7155");
  const sec = await figma.getNodeByIdAsync("11818:21092");
  const nConn0 = sec.children.filter((c) => c.type === "CONNECTOR").length;
  const out = [];
  const put = (old, inst) => {
    const p = old.parent, idx = p.children.indexOf(old), al = p.layoutMode && p.layoutMode !== "NONE", abs = old.layoutPositioning === "ABSOLUTE";
    const x = old.x, y = old.y; p.insertChild(idx, inst);
    if (al && !abs) inst.layoutSizingHorizontal = "FILL"; else { if (abs) inst.layoutPositioning = "ABSOLUTE"; inst.x = x; inst.y = y; }
    old.remove();
  };
  for (const id of BLOCKS) {
    const b = await figma.getNodeByIdAsync(id); const scr = b.children.find((c) => /^Desktop · /.test(c.name));
    const oldH = scr.height; const r = { b: b.name.slice(8) };
    const g = scr.findOne((n) => n.type === "FRAME" && n.name === "header-evo-desktop");
    if (g) { put(g, gov.createInstance()); r.gov = 1; }
    const h = scr.findOne((n) => n.type === "FRAME" && n.name === "Shell header");
    if (h) {
      const tt0 = h.findOne((n) => n.type === "TEXT" && n.parent.name === "e-permits-workplace__title"); const ttc = tt0 ? tt0.characters : null;
      const osw = h.findOne((n) => n.type === "INSTANCE" && n.name === "Instance switcher");
      const props = osw ? Object.fromEntries(Object.entries(osw.componentProperties).map(([k, v]) => [k, v.value])) : null;
      const hi = hdr.createInstance(); put(h, hi);
      if (ttc && ttc !== "Dosare noi") { const k = Object.keys(hi.componentProperties).find((k) => k.startsWith("Title")); hi.setProperties({ [k]: ttc }); r.title = ttc; }
      const nsw = hi.findOne((n) => n.type === "INSTANCE" && n.name === "Instance switcher");
      if (props && nsw) { const cur = Object.fromEntries(Object.entries(nsw.componentProperties).map(([k, v]) => [k, v.value])); const diff = {}; for (const k in props) if (props[k] !== cur[k]) diff[k] = props[k]; if (Object.keys(diff).length) { nsw.setProperties(diff); r.sw = diff; } }
      r.hdr = 1;
    }
    const newH = scr.height; r.h = `${oldH}→${newH}`;
    for (const c of scr.children) if (c.layoutPositioning === "ABSOLUTE" && c.width === scr.width && Math.abs(c.height - oldH) <= 2 && newH !== oldH) { c.resize(c.width, newH); r.ov = (r.ov || 0) + 1; }
    out.push(r);
  }
  const nConn1 = sec.children.filter((c) => c.type === "CONNECTOR").length;
  return { conns: `${nConn0}→${nConn1}`, out };
};
