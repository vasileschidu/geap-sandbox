// Open screens → „Instance switcher” State=Open with the menu composed in its slot. Needs prelude.js + compose.js.
// CFG.jobs: [{ screen, raw?, ctx: "FO"|"BO", spec, trigger: { name, detail, avatar }, mobile?, base?, replace? }]
//  - desktop: the switcher instance already in the screen (direct or nested in a header instance) → State Open
//  - mobile (base + replace): clone the closed mobile page of the same step (base), put it where the old mobile screen
//    was (replace), hide the header avatar, put a FO/Mobile/Open switcher over it (absolute in the screen)
//  - raw = the captured menu frame: connectors that end inside it are re-pointed to the same item in the new menu, then it is removed
// Before/after: connector count per page; screen grows when the menu would be cut (screens clip).
const TS = holder.children.find(n => n.type === "COMPONENT_SET" && n.name === "Instance switcher");
const pageOf = n => { let p = n; while (p && p.type !== "PAGE") p = p.parent; return p; };
const within = (n, root) => { let p = n; while (p) { if (p === root) return true; p = p.parent; } return false; };
const texts = n => n.type === "TEXT" ? [n.characters] : ("findAll" in n ? n.findAll(t => t.type === "TEXT").map(t => t.characters) : []);
const topHost = (n, screen) => { let p = n, host = null; while (p && p !== screen) { if (p.type === "INSTANCE") host = p; p = p.parent; } return host || n; };
const res = [];
for (const job of CFG.jobs) {
  const r = { job: job.screen };
  try {
    let screen = await figma.getNodeByIdAsync(job.screen);
    const pg = pageOf(screen); await figma.setCurrentPageAsync(pg);
    const conns = pg.findAllWithCriteria({ types: ["CONNECTOR"] });
    r.connBefore = conns.length;
    const repoint = []; // [connector, "start"|"end", old endpoint node]
    const collect = async root => { for (const c of conns) for (const end of ["connectorStart", "connectorEnd"]) { const e = c[end]; if (!e || !e.endpointNodeId) continue; const n = await figma.getNodeByIdAsync(e.endpointNodeId); if (n && within(n, root)) repoint.push([c, end, texts(n).join(" "), n]); } };
    if (job.replace) { // mobile rebuild
      const old = await figma.getNodeByIdAsync(job.replace), base = await figma.getNodeByIdAsync(job.base);
      if (old !== base) {
        await collect(old);
        const cl = base.clone(); const par = old.parent; par.insertChild(par.children.indexOf(old), cl);
        if (!par.layoutMode || par.layoutMode === "NONE") { cl.x = old.x; cl.y = old.y; }
        cl.name = old.name; screen = cl;
        for (const [c, end] of repoint) { const e = c[end]; c[end] = { endpointNodeId: cl.id, magnet: e.magnet || "AUTO" }; }
        repoint.length = 0; old.remove(); r.rebuilt = cl.id;
      }
    }
    let trig;
    if (job.mobile) {
      const sb = screen.absoluteBoundingBox;
      const av = screen.findAll(n => n.type === "INSTANCE" && /avatar/i.test(n.name) && Math.round(n.width) === 32 && n.absoluteBoundingBox && n.absoluteBoundingBox.y - sb.y < 80 && n.absoluteBoundingBox.x - sb.x > 250)[0];
      const ax = av ? av.absoluteBoundingBox.x - sb.x : 327, ay = av ? av.absoluteBoundingBox.y - sb.y : 16;
      if (av) av.visible = false;
      trig = vp(TS, { Context: "FO", Type: "Mobile", State: "Open" }).createInstance(); trig.name = "Instance switcher · open";
      screen.appendChild(trig); if (screen.layoutMode && screen.layoutMode !== "NONE") trig.layoutPositioning = "ABSOLUTE";
      trig.x = ax; trig.y = ay; trig.constraints = { horizontal: "MAX", vertical: "MIN" };
    } else {
      trig = screen.findOne(n => n.type === "INSTANCE" && n.mainComponent && n.mainComponent.parent === TS);
      const k = Object.keys(trig.componentProperties).find(x => x === "State");
      trig.setProperties({ [k]: "Open" });
    }
    setProps(trig, { Name: job.trigger.name, Detail: job.trigger.detail, "Show menu": true });
    if (job.trigger.avatar) await styleAvatar(trig.findOne(n => n.type === "INSTANCE" && n.name === "Avatar"), job.trigger.avatar);
    const menu = trig.findOne(n => n.type === "INSTANCE" && n.name === "Menu");
    const slot = menu.findOne(n => n.type === "SLOT");
    if (job.ctx === "BO") await composeBO(slot, job.spec); else await composeFO(slot, job.spec);
    // raw captured menu → connectors to the same item in the new menu, then remove
    if (job.raw) {
      const raw = await figma.getNodeByIdAsync(job.raw);
      if (raw) {
        await collect(raw);
        for (const [c, end, label] of repoint) {
          const words = label.split(" ").filter(w => w.length > 3);
          const hit = slot.findAll(n => n.type === "TEXT" && words.some(w => n.characters.includes(w)))[0];
          const host = topHost(trig, screen); const hb = host.absoluteBoundingBox;
          const tb = (hit || menu).absoluteBoundingBox, mb = menu.absoluteBoundingBox;
          c[end] = { endpointNodeId: host.id, position: { x: mb.x + mb.width - hb.x, y: tb.y + tb.height / 2 - hb.y } };
        }
        r.repointed = repoint.length;
        raw.remove();
      }
    }
    // the header branch must not clip and must paint above the content below it (code: header z 30)
    let p = trig, child = null; r.raised = 0; r.unclipped = 0;
    while (p && p !== screen) {
      const inInstance = (() => { let q = p.parent; while (q && q !== screen) { if (q.type === "INSTANCE") return true; q = q.parent; } return false; })();
      if (!inInstance && p !== trig && "clipsContent" in p && p.type === "FRAME" && p.clipsContent) { p.clipsContent = false; r.unclipped++; }
      if (!inInstance && child && p.type === "FRAME" && p.layoutMode && p.layoutMode !== "NONE") {
        // raise the header branch when it is the first visible flow child (hidden / absolute earlier siblings don't count)
        const i = p.children.indexOf(child), flow = k => k.visible && k.layoutPositioning !== "ABSOLUTE";
        const before = p.children.slice(0, i).filter(flow).length, after = p.children.slice(i + 1).filter(flow).length;
        if (after && !before && !p.itemReverseZIndex) { p.itemReverseZIndex = true; r.raised++; }
        else if (after && before) r.zWarn = (r.zWarn || []).concat(p.name + " " + p.id);
      }
      child = p; p = p.parent;
    }
    // grow the screen if the menu would be cut by the screen clip
    const sb = screen.absoluteBoundingBox, mb = menu.absoluteBoundingBox, need = Math.ceil(mb.y + mb.height + 24 - sb.y);
    if (need > sb.height) {
      if (screen.layoutMode && screen.layoutMode !== "NONE" && screen.primaryAxisSizingMode === "AUTO") screen.minHeight = need; else screen.resize(screen.width, need);
      r.grew = [Math.round(sb.height), need];
    }
    r.trig = trig.id; r.menu = [Math.round(mb.x - sb.x), Math.round(mb.y - sb.y), Math.round(mb.width), Math.round(mb.height)];
    r.connAfter = pg.findAllWithCriteria({ types: ["CONNECTOR"] }).length;
  } catch (e) { r.error = e.message.slice(0, 200); }
  res.push(r);
}
probe.remove();
return res;
