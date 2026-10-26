// EVO Cabinet: build a document-viewer block (desktop 1440×900 + phone 375×812) on top of a cloned profile block.
// Stored in „cfin”/„viewer”. ARGS = { src, id, title, note, state, parent, x, y, modalTitle, size: "Act"|"Generated", name, sig, sigMeta,
//   pages: [[module spec…], …], watermark: "SUSPENDAT"|null, wide }
async (ARGS) => {
  const CL = eval("(" + figma.root.getSharedPluginData("cfin", "clone") + ")");
  const F = eval("(" + figma.root.getSharedPluginData("mdocs", "fill") + ")");
  const MAP = JSON.parse(figma.root.getSharedPluginData("mdport", "map"));
  const pageSet = await figma.getNodeByIdAsync(MAP["cab:page"]);
  const viewerSet = await figma.getNodeByIdAsync(figma.root.getSharedPluginData("cfin", "viewer"));
  const res = await CL({ src: ARGS.src, id: ARGS.id, title: ARGS.title, note: ARGS.note, state: ARGS.state || ARGS.id, parent: ARGS.parent, x: ARGS.x, y: ARGS.y });
  const pk = (i, p) => Object.keys(i.componentProperties).find(k => k.split("#")[0] === p);
  const lf = async t => { for (const s of t.getStyledTextSegments(["fontName"])) await figma.loadFontAsync(s.fontName); };
  const out = { block: res.block };
  const srcScreens = { D: await figma.getNodeByIdAsync("1211:44951"), M: await figma.getNodeByIdAsync("1071:8543") };
  const newScreens = [];
  for (const sid0 of res.screens) {
    const old = await figma.getNodeByIdAsync(sid0); const mob = old.width < 500; const H = mob ? 812 : 900;
    const sc = srcScreens[mob ? "M" : "D"].clone(); old.parent.insertChild(old.parent.children.indexOf(old), sc); sc.name = old.name;
    const bg = old.findChild(n => n.name === "Main"); const m0 = sc.findChild(n => n.name === "Main"); sc.insertChild(sc.children.indexOf(m0), bg); bg.layoutSizingHorizontal = "FILL"; m0.remove();
    old.remove(); newScreens.push(sc.id);
    const ov = sc.findChild(n => n.name.startsWith("Overlay"));
    const modal = ov.children[0];
    const ttl = modal.findAll(n => n.type === "TEXT").find(t => t.characters === "Vizualizare act");
    if (ttl && ARGS.modalTitle) { await lf(ttl); ttl.characters = ARGS.modalTitle; }
    const content = modal.findAll(n => n.type === "INSTANCE").find(n => n.mainComponent && n.mainComponent.parent === viewerSet);
    const size = mob ? "Act · Mobile" : ARGS.size === "Generated" ? "Generated · Desktop" : "Act · Desktop";
    content.setProperties({ Size: size });
    content.setProperties({ [pk(content, "Name")]: ARGS.name, [pk(content, "Show signature")]: !!ARGS.sig });
    if (!mob && ARGS.size === "Generated") { modal.resize(560, modal.height); modal.x = Math.round((sc.width - 560) / 2); }
    if (ARGS.sig && ARGS.sigMeta) { const tray = content.findAll(n => n.type === "INSTANCE" && n.name === "Signature")[0]; if (tray) { const k = pk(tray, "Meta"); if (k) tray.setProperties({ [k]: ARGS.sigMeta }); } }
    const slot = content.findAll(n => n.type === "SLOT")[0];
    for (const c of [...slot.children]) c.remove();
    const w = mob ? 359 : ARGS.size === "Generated" ? 464 : 624;
    let i = 0;
    for (const spec of ARGS.pages) {
      const kind = spec[0].m === "continuation" ? "Continuation" : "First";
      const pg = pageSet.children.find(c => c.name === "Kind=" + kind).createInstance(); slot.appendChild(pg); pg.name = "Page " + (++i);
      await F({ mode: "fill", inst: pg.id, spec, wide: !!ARGS.wide });
      if (ARGS.watermark) pg.setProperties({ [pk(pg, "Show watermark")]: true, [pk(pg, "Watermark")]: ARGS.watermark });
      pg.rescale(w / 794);
    }
    out[mob ? "mobile" : "desktop"] = { modal: modal.id, content: content.id, slot: slot.children.length };
  }
  out.screens = newScreens;
  return out;
}
