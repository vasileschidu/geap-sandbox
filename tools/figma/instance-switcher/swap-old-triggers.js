// GEAP 2.0 — swap every instance of the old trigger set „.role-switch-item/general” (5384:49488) to „Instance switcher”.
// Run after prelude.js + compose.js (stored lib). CFG.pages = page ids to process (direct instances only; the one nested
// in the „.temp” FO header main is handled with CFG.includeMains). Snapshot per page → root shared plugin data
// isw/snap-<pageId> (JSON: id, old variant, name, detail, avatar type, initials, size) BEFORE anything changes.
// Mapping: Context = BO on „↳ BO …” pages else FO; Type=Desktop; State Default/Hover/Focus → Default/Hover/Open
// (Open gets Show menu = false here — open screens get their menu composed by fill-open-menus.js).
const OLD = await figma.getNodeByIdAsync("5384:49488");
const TS = holder.children.find(n => n.type === "COMPONENT_SET" && n.name === "Instance switcher");
const pageOf = n => { let p = n; while (p && p.type !== "PAGE") p = p.parent; return p; };
const inMain = n => { let p = n.parent; while (p && p.type !== "PAGE") { if (p.type === "COMPONENT") return p; p = p.parent; } return null; };
const todo = [];
for (const v of OLD.children) for (const i of await v.getInstancesAsync()) {
  const pg = pageOf(i); if (!pg) continue;
  const m = inMain(i);
  if (m ? !CFG.includeMains : !(CFG.pages || []).includes(pg.id)) continue;
  todo.push([i, v, pg]);
}
const snaps = {}, res = { swapped: 0, byPage: {}, errors: [] };
for (const [i, v, pg] of todo) {
  try {
    const o = v.variantProperties;
    const copy = i.findOne(n => n.type === "FRAME" && n.children && n.children.some(c => c.name === "Representative ID Info Frame"));
    const nameT = copy && copy.children.find(c => c.type === "TEXT");
    const det = i.findOne(n => n.type === "TEXT" && n.name === "Representative ID Label");
    const av = i.findOne(n => n.type === "INSTANCE" && n.name === "avatar");
    const avType = av && av.mainComponent ? ((av.mainComponent.name.match(/Type=(\w+)/) || [])[1] || "Initials") : "Initials";
    const iniT = av && av.findOne(n => n.type === "TEXT");
    const s = { id: i.id, v: v.name, name: nameT ? nameT.characters : "", detail: det ? det.characters : "", avType, ini: iniT ? iniT.characters : "AC", w: Math.round(i.width), h: Math.round(i.height) };
    (snaps[pg.id] = snaps[pg.id] || []).push(s);
    const ctx = /^↳ BO/.test(pg.name) ? "BO" : "FO";
    const state = o.Type === "Hover" ? "Hover" : o.Type === "Focus" ? "Open" : "Default";
    i.swapComponent(vp(TS, { Context: ctx, Type: "Desktop", State: state }));
    // nested instances: the swap is an override — resetOverrides() would undo it (GEAP was saved by the .temp main swap)
    if (!i.id.includes(";")) i.resetOverrides();
    setProps(i, { Name: s.name || "Anastasia Cojocaru", Detail: s.detail, "Show menu": false });
    const tone = o.MPower === "True" ? "warning" : "brand";
    if (avType === "Icon" || s.ini !== "AC" || tone !== "brand")
      await styleAvatar(i.findOne(n => n.type === "INSTANCE" && n.name === "Avatar"), { type: avType === "Icon" ? "Icon" : "Initials", initials: s.ini, tone });
    res.swapped++; res.byPage[pg.name] = (res.byPage[pg.name] || 0) + 1;
  } catch (e) { res.errors.push(i.id + " " + e.message.slice(0, 120)); }
}
for (const [pid, arr] of Object.entries(snaps)) {
  const key = "snap-" + pid + (CFG.includeMains ? "-mains" : "");
  const prev = figma.root.getSharedPluginData("isw", key);
  figma.root.setSharedPluginData("isw", key, JSON.stringify((prev ? JSON.parse(prev) : []).concat(arr)));
}
probe.remove();
return res;
