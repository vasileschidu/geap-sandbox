// FOD (pvDAJPXKyUuJgz3P921Ye8) / any file that consumes GEAP's published „.temp” header: the header is REMOTE, so its nested
// old trigger („.role-switch-item/general”) is swapped per instance (instance-swap override) to this file's local
// „Instance switcher” FO/Desktop/Default; name / detail / avatar carried over; header root itemReverseZIndex = true and
// unclipped (overridable on instances) so an Open menu paints above the banner and the page.
// Mobile: library header-evo-mobile avatars (32, top-right) get a closed FO/Mobile/Default switcher on top (absolute in the
// screen) and the library avatar is hidden. Snapshot → root shared plugin data isw/snap-fod-<pageId>.
// Needs prelude.js + compose.js. CFG.pages = page ids.
const TS = holder.children.find(n => n.type === "COMPONENT_SET" && n.name === "Instance switcher");
const res = {};
for (const pid of CFG.pages) {
  const pg = await figma.getNodeByIdAsync(pid); await figma.setCurrentPageAsync(pg);
  const r = { desktop: 0, mobile: 0, errors: [] }; const snap = [];
  const temps = pg.findAll(n => n.type === "INSTANCE" && !n.id.includes(";") && n.mainComponent && n.mainComponent.name === ".temp");
  for (const t of temps) {
    try {
      const old = t.findOne(n => n.type === "INSTANCE" && n.mainComponent && n.mainComponent.parent && n.mainComponent.parent.name === ".role-switch-item/general");
      if (!old) continue;
      const tx = old.findAll(x => x.type === "TEXT").map(x => x.characters);
      const av = old.findOne(n => n.type === "INSTANCE" && n.name === "avatar");
      const avType = av && av.mainComponent ? ((av.mainComponent.name.match(/Type=(\w+)/) || [])[1] || "Initials") : "Initials";
      const ini = (av && (av.findOne(n => n.type === "TEXT") || {}).characters) || "AC";
      const rest = tx.filter(x => x !== ini);
      snap.push({ temp: t.id, old: old.mainComponent.name, tx, avType, ini });
      old.swapComponent(vp(TS, { Context: "FO", Type: "Desktop", State: "Default" }));
      // NEVER resetOverrides() on a nested instance: the swap itself is an override and would be undone
      if (!old.id.includes(";")) old.resetOverrides();
      setProps(old, { Name: rest[0] || "Anastasia Cojocaru", Detail: rest[1] || "Persoană fizică", "Show menu": false });
      if (avType === "Icon" || ini !== "AC") await styleAvatar(old.findOne(n => n.type === "INSTANCE" && n.name === "Avatar"), { type: avType === "Icon" ? "Icon" : "Initials", initials: ini });
      t.itemReverseZIndex = true; t.clipsContent = false;
      r.desktop++;
    } catch (e) { r.errors.push(t.id + " " + e.message.slice(0, 100)); }
  }
  for (const h of pg.findAll(n => n.type === "INSTANCE" && !n.id.includes(";") && n.mainComponent && n.mainComponent.parent && n.mainComponent.parent.name === "header-evo-mobile")) {
    try {
      if (!h.visible) continue;
      const av = h.findOne(n => n.type === "INSTANCE" && /avatar/i.test(n.name) && Math.round(n.width) === 32 && n.visible);
      if (!av) continue;
      let scr = h; while (scr.parent && scr.parent.type === "FRAME" && Math.round(scr.parent.width) === Math.round(h.width)) scr = scr.parent;
      const ab = av.absoluteBoundingBox, sb = scr.absoluteBoundingBox;
      const ini = (av.findOne(n => n.type === "TEXT") || {}).characters || "AC";
      const sw = vp(TS, { Context: "FO", Type: "Mobile", State: "Default" }).createInstance(); sw.name = "Instance switcher";
      scr.appendChild(sw); if (scr.layoutMode && scr.layoutMode !== "NONE") sw.layoutPositioning = "ABSOLUTE";
      sw.x = ab.x - sb.x; sw.y = ab.y - sb.y; sw.constraints = { horizontal: "MAX", vertical: "MIN" };
      if (ini !== "AC") await styleAvatar(sw.findOne(n => n.type === "INSTANCE" && n.name === "Avatar"), { type: "Initials", initials: ini });
      av.visible = false; snap.push({ mobileHeader: h.id, screen: scr.id, ini });
      r.mobile++;
    } catch (e) { r.errors.push(h.id + " " + e.message.slice(0, 100)); }
  }
  figma.root.setSharedPluginData("isw", "snap-fod-" + pid, JSON.stringify(snap));
  res[pg.name] = r;
}
probe.remove();
return res;
