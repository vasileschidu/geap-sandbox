// Ghișeu (2026-10-16) · compose a block screen from a full-page capture („cap · <state>” root in Captures · holding):
// clone the base list screen (desktop 11595:321749 / mobile 11595:322693), move the capture's ABSOLUTE layers (overlay +
// dialog / sheet / menus / toasts) into it at the same position, grow the screen to the capture height, swap the
// dialogs with the stored swap-ghiseu RUN (figma.root shared plugin data ghs/swap), delete the capture.
// LIST states (no overlay; the page itself changed) replace the base Page with the captured page content instead.
// JOBS = [{ cap: "<root id>", state: "gh-02c", mobile: false, list: false }]
const COMPOSE = async (JOBS) => {
  figma.skipInvisibleInstanceChildren = false;
  const g = (id) => figma.getNodeByIdAsync(id);
  const page = await g("11589:327039"); await figma.setCurrentPageAsync(page);
  const SWAP = new Function("return " + figma.root.getSharedPluginData("ghs", "swap"))();
  const out = [];
  for (const j of JOBS) {
    const cap = await g(j.cap); if (!cap) { out.push({ state: j.state, err: "missing" }); continue; }
    const base = await g(j.mobile ? "11595:322693" : "11595:321749");
    const scr = base.clone(); page.appendChild(scr); scr.name = (j.mobile ? "Mobile · " : "Desktop · ") + j.state;
    scr.x = cap.x; scr.y = cap.y + cap.height + 200; scr.itemReverseZIndex = false;
    const H = Math.round(cap.height);
    if (j.list) {
      // replace the base page with the captured page content
      const sec = cap.findOne((n) => n.name === "Section - Conținut principal");
      const old = scr.findOne((n) => /^Page · /.test(n.name)); const par = old.parent; const idx = par.children.indexOf(old);
      const content = sec.children[0]; par.insertChild(idx, content); content.name = "Page · Dosare noi"; old.remove();
      content.layoutSizingHorizontal = "FILL"; if (!j.mobile) content.layoutSizingVertical = "FILL"; else { content.layoutSizingVertical = "HUG"; content.clipsContent = false; }
    }
    // absolute layers of the capture (desktop: root children; mobile: Body children) except the shell
    const body = cap.children.find((c) => c.name === "Body");
    const layers = [...cap.children.filter((c) => c !== body && c.visible !== false), ...(body ? body.children.filter((c) => c.layoutPositioning === "ABSOLUTE" && !/^(Header|Container)$/.test(c.name) && c.visible !== false) : [])];
    const moved = [];
    for (const o of layers) { const x = o.x, y = o.y; scr.appendChild(o); o.layoutPositioning = "ABSOLUTE"; o.x = x; o.y = y; moved.push(o); }
    // grow to the capture height
    if (scr.height < H) {
      if (j.mobile) { const pg = scr.children.find((c) => /^Page · /.test(c.name)); pg.minHeight = H - (scr.height - pg.height); }
      else { const b = scr.children.find((c) => c.name === "Body"); b.minHeight = H - (scr.height - b.height); }
    }
    for (const o of moved) { if (/^(Container|Overlay)/.test(o.name) && Math.abs(o.width - scr.width) < 60) { o.name = "Overlay"; o.resize(scr.width, Math.max(scr.height, o.height)); o.constraints = { horizontal: "STRETCH", vertical: "STRETCH" }; } }
    let rep = null; if (moved.length) rep = await SWAP(moved.map((m) => m.id), { mobile: j.mobile });
    cap.remove();
    out.push({ state: j.state, mobile: j.mobile, scr: scr.id, h: Math.round(scr.height), layers: moved.map((m) => m.name).join(","), swap: rep && Object.values(rep).map((r) => r.unmapped ? r.unmapped.length + (r.more || 0) : r).join("/"), iconless: rep && rep.__iconless });
  }
  return out;
};
