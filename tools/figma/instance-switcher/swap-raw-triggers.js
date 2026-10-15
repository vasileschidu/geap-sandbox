// Replace captured raw BO triggers (FRAME „shell__user-trigger”: avatar initials + name + „Rol • Instanță” + chevron)
// with „Instance switcher” Context=BO Type=Desktop (State Open when the capture carries the focus-ring shadow).
// Needs prelude.js + compose.js. CFG.pages = page ids. Connectors that end on the raw frame move to the instance.
const TS = holder.children.find(n => n.type === "COMPONENT_SET" && n.name === "Instance switcher");
const res = { byPage: {}, errors: [] };
for (const pid of CFG.pages) {
  const pg = await figma.getNodeByIdAsync(pid); await figma.setCurrentPageAsync(pg);
  const conns = pg.findAllWithCriteria({ types: ["CONNECTOR"] });
  const raws = pg.findAll(n => n.type === "FRAME" && n.name === "shell__user-trigger");
  let n = 0;
  for (const f of raws) {
    try {
      const ts = f.findAll(t => t.type === "TEXT").map(t => t.characters);
      const ini = ts.find(t => /^[A-ZĂÂÎȘȚ]{2}$/.test(t)) || "AC";
      const rest = ts.filter(t => t !== ini);
      const open = f.effects.some(e => e.type === "DROP_SHADOW" && e.spread >= 2);
      const inst = vp(TS, { Context: "BO", Type: "Desktop", State: open ? "Open" : "Default" }).createInstance();
      const par = f.parent, idx = par.children.indexOf(f);
      par.insertChild(idx, inst);
      if (par.layoutMode && par.layoutMode !== "NONE") {
        if (f.layoutPositioning === "ABSOLUTE") { inst.layoutPositioning = "ABSOLUTE"; inst.x = f.x; inst.y = f.y; }
        inst.layoutAlign = f.layoutAlign === "STRETCH" ? "INHERIT" : f.layoutAlign;
      } else { inst.x = f.x; inst.y = f.y; }
      inst.name = "Instance switcher";
      setProps(inst, { Name: rest[0] || "Anastasia Cojocaru", Detail: rest[1] || "", "Show menu": false });
      if (ini !== "AC") await styleAvatar(inst.findOne(x => x.type === "INSTANCE" && x.name === "Avatar"), { type: "Initials", initials: ini });
      for (const c of conns) for (const end of ["connectorStart", "connectorEnd"]) {
        const e = c[end]; if (e && e.endpointNodeId === f.id) c[end] = Object.assign({}, e, { endpointNodeId: inst.id });
      }
      f.remove(); n++;
    } catch (e) { res.errors.push(f.id + " " + e.message.slice(0, 120)); }
  }
  res.byPage[pg.name] = { swapped: n, connectors: [conns.length, pg.findAllWithCriteria({ types: ["CONNECTOR"] }).length] };
}
probe.remove();
return res;
