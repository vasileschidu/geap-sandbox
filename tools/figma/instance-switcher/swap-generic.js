// Generic switcher swap for files that consume GEAP's published „.role-switch-item/general” / „.temp” / „Header” (EVO Cabinet,
// any FO file): every instance of the old trigger (direct or nested) → this file's local „Instance switcher” (Context FO,
// Type Desktop, State from the old Type: Default/Hover/Focus → Default/Hover/Open, menu hidden); name / detail / avatar carried.
// Direct instances get resetOverrides(); nested ones NOT (the swap is an override — a reset undoes it). „.temp” headers are
// raised (itemReverseZIndex) for an open menu. Mobile: every visible 32px avatar in the top-right header zone of a 375 screen
// gets a closed FO/Mobile/Default switcher on top (absolute in the screen) and is hidden. Snapshot → isw/snap-generic-<pageId>.
// Needs prelude.js + compose.js. CFG.pages = page ids.
const TS = holder.children.find(n => n.type === "COMPONENT_SET" && n.name === "Instance switcher");
const res = {};
for (const pid of CFG.pages) {
  const pg = await figma.getNodeByIdAsync(pid); await figma.setCurrentPageAsync(pg);
  const r = { direct: 0, nested: 0, mobile: 0, errors: [] }, snap = [];
  const olds = pg.findAll(n => n.type === "INSTANCE" && n.mainComponent && n.mainComponent.parent && n.mainComponent.parent.name === ".role-switch-item/general");
  for (const old of olds) {
    try {
      const vpOld = old.mainComponent.variantProperties || {};
      const tx = old.findAll(x => x.type === "TEXT").map(x => x.characters);
      const av = old.findOne(n => n.type === "INSTANCE" && n.name === "avatar");
      const avType = av && av.mainComponent ? ((av.mainComponent.name.match(/Type=(\w+)/) || [])[1] || "Initials") : "Initials";
      const ini = (av && (av.findOne(n => n.type === "TEXT") || {}).characters) || "AC";
      const rest = tx.filter(x => x !== ini);
      const nested = old.id.includes(";");
      snap.push({ id: old.id, v: old.mainComponent.name, tx, avType, ini });
      const state = vpOld.Type === "Hover" ? "Hover" : vpOld.Type === "Focus" ? "Open" : "Default";
      old.swapComponent(vp(TS, { Context: "FO", Type: "Desktop", State: state }));
      if (!nested) old.resetOverrides();
      setProps(old, { Name: rest[0] || "Anastasia Cojocaru", Detail: rest[1] || "Persoană fizică", "Show menu": false });
      const tone = vpOld.MPower === "True" ? "warning" : "brand";
      if (avType === "Icon" || ini !== "AC" || tone !== "brand") await styleAvatar(old.findOne(n => n.type === "INSTANCE" && n.name === "Avatar"), { type: avType === "Icon" ? "Icon" : "Initials", initials: ini, tone });
      r[nested ? "nested" : "direct"]++;
    } catch (e) { r.errors.push(old.id + " " + e.message.slice(0, 100)); }
  }
  for (const t of pg.findAll(n => n.type === "INSTANCE" && !n.id.includes(";") && n.mainComponent && n.mainComponent.name === ".temp")) { t.itemReverseZIndex = true; t.clipsContent = false; }
  const screens = pg.findAll(n => n.type === "FRAME" && Math.round(n.width) === 375 && n.parent && Math.round(n.parent.width) !== 375);
  for (const s of screens) {
    const sb = s.absoluteBoundingBox;
    for (const a of s.findAll(n => n.type === "INSTANCE" && n.visible && /avatar/i.test(n.name) && Math.round(n.width) === 32 && Math.round(n.height) === 32)) {
      const b = a.absoluteBoundingBox; if (!(b.y - sb.y < 80 && b.x - sb.x > 250)) continue;
      let q = a.parent, inSwitcher = false; while (q && q !== s) { if (q.type === "INSTANCE" && q.mainComponent && q.mainComponent.parent === TS) inSwitcher = true; q = q.parent; }
      if (inSwitcher) continue;
      try {
        const ini = (a.findOne(n => n.type === "TEXT") || {}).characters || "AC";
        const sw = vp(TS, { Context: "FO", Type: "Mobile", State: "Default" }).createInstance(); sw.name = "Instance switcher";
        s.appendChild(sw); if (s.layoutMode && s.layoutMode !== "NONE") sw.layoutPositioning = "ABSOLUTE";
        sw.x = b.x - sb.x; sw.y = b.y - sb.y; sw.constraints = { horizontal: "MAX", vertical: "MIN" };
        if (ini !== "AC") await styleAvatar(sw.findOne(n => n.type === "INSTANCE" && n.name === "Avatar"), { type: "Initials", initials: ini });
        a.visible = false; snap.push({ mobileAvatar: a.id, screen: s.id, ini }); r.mobile++;
      } catch (e) { r.errors.push(a.id + " " + e.message.slice(0, 100)); }
    }
  }
  figma.root.setSharedPluginData("isw", "snap-generic-" + pid, JSON.stringify(snap));
  res[pg.name] = r;
}
probe.remove();
return res;
