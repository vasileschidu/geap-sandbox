// EVO Cabinet final pass (2026-10-26): rebuild a profile screen's Panel sections from a code spec.
// Stored in figma.root shared plugin data „cfin”/„body”. Run: const B = eval("(" + src + ")"); await B(spec)
// spec = { screen, bp: "Desktop"|"Mobile", mode: "replace"|"insertAfter", after: "Date generale", secs: [
//   { t, rows: [[label, value, kind("Text"|"Copy"|"Link"|"Tag"), tagStyle?]] } | { t, ben: { name, idl, id, initials? } } |
//   { t, tl: [[status, title, stamp, detailText|null, link|null]] } ] }
async (spec) => {
  const V = JSON.parse(figma.root.getSharedPluginData("cfin", "vars"));
  const TL = JSON.parse(figma.root.getSharedPluginData("cfin", "tl"));
  const gv = async n => figma.variables.getVariableByIdAsync(V[n]);
  const sp = { 0: await gv("spacings/spacing-0"), 4: await gv("spacings/spacing-4"), 6: await gv("spacings/spacing-6"), 20: await gv("spacings/spacing-20") };
  await figma.loadFontAsync({ family: "Onest", style: "Regular" }); await figma.loadFontAsync({ family: "Onest", style: "Medium" });
  const screen = await figma.getNodeByIdAsync(spec.screen);
  const panel = screen.findOne(n => n.type === "FRAME" && n.name === "Panel");
  const rowSet = await figma.getNodeByIdAsync("1058:429");
  const tlSet = await figma.getNodeByIdAsync(TL.set);
  const old = panel.children.filter(c => c.name.startsWith("Section · "));
  const secProto = old[0];
  const titleProto = secProto.findChild(c => c.name === "Section title");
  let cardProto = null, benProto = null;
  for (const s of old) { const c = s.findChild(x => x.name === "Card"); if (c && !cardProto) cardProto = c; const b = s.findOne(x => x.type === "INSTANCE" && x.name === "Beneficiary"); if (b && !benProto) benProto = b; }
  if (!cardProto) cardProto = panel.findOne(n => n.type === "FRAME" && n.name === "Card" && n.cornerRadius === 20 && n.layoutMode === "VERTICAL");
  const keep = spec.mode === "insertAfter";
  const pk = (inst, pref) => Object.keys(inst.componentProperties).find(k => k.split("#")[0] === pref);
  const made = [];
  let anchorIdx = keep ? panel.children.findIndex(c => c.name === "Section · " + spec.after) + 1 : panel.children.indexOf(old[0]);
  for (const sec of spec.secs) {
    const s = secProto.clone(); s.name = "Section · " + sec.t;
    for (const c of [...s.children]) if (c.name !== "Section title") c.remove();
    panel.insertChild(anchorIdx++, s); s.layoutSizingHorizontal = "FILL";
    const st = s.findChild(c => c.name === "Section title"); st.setProperties({ [pk(st, "Title")]: sec.t });
    if (sec.rows) {
      const card = cardProto.clone(); for (const c of [...card.children]) c.remove(); s.appendChild(card); card.layoutSizingHorizontal = "FILL"; card.layoutSizingVertical = "HUG";
      sec.rows.forEach((r, i) => {
        const [l, v, kind] = r; const last = i === sec.rows.length - 1 ? "Yes" : "No";
        const variant = rowSet.children.find(c => c.name === `Kind=${kind}, Breakpoint=${spec.bp}, Last=${last}`);
        const ri = variant.createInstance(); ri.name = "Row · " + l; card.appendChild(ri); ri.layoutSizingHorizontal = "FILL";
        const props = { [pk(ri, "Label")]: l }; if (kind !== "Copy" && kind !== "Tag") props[pk(ri, "Value")] = v; ri.setProperties(props);
        if (kind === "Copy") { const cv = ri.exposedInstances.find(e => e.name === "Copy value"); cv.setProperties({ [pk(cv, "Value")]: v }); }
        if (kind === "Tag") { const tg = ri.exposedInstances.find(e => e.name === "Tag"); tg.setProperties({ [pk(tg, "⌨️ Label")]: v, ...(r[3] ? { [pk(tg, "🖌️ Style")]: r[3] } : {}) }); }
        if (kind === "Text" || kind === "Link") {
          const vt = ri.findOne(n => n.type === "TEXT" && n.name === "Value text");
          if (vt) { vt.layoutSizingHorizontal = "FILL"; vt.textAutoResize = "HEIGHT"; if (v.includes("\n")) { vt.paragraphSpacing = 4; ri.counterAxisAlignItems = "MIN"; } }
        }
      });
    }
    if (sec.ben) {
      const b = benProto.clone(); s.appendChild(b); b.layoutSizingHorizontal = "FILL";
      b.setProperties({ [pk(b, "Name")]: sec.ben.name, [pk(b, "ID label")]: sec.ben.idl, [pk(b, "ID")]: sec.ben.id });
      const cv = b.findOne(n => n.type === "INSTANCE" && n.name === "Copy value"); if (cv) cv.setProperties({ [pk(cv, "Value")]: sec.ben.id });
      if (sec.ben.initials) {
        const av = b.findOne(n => n.type === "INSTANCE" && n.name === "Avatar");
        const aset = av.mainComponent.parent; const iv = aset.children.find(c => /Type=Initials/.test(c.name) && /Size=Small/.test(c.name) && /State=Default/.test(c.name));
        if (iv) { const w = av.width, h = av.height; av.swapComponent(iv); av.resize(w, h); const t = av.findOne(n => n.type === "TEXT"); if (t) { await figma.loadFontAsync(t.fontName); t.characters = sec.ben.initials; } }
      }
    }
    if (sec.tl) {
      const card = cardProto.clone(); for (const c of [...card.children]) c.remove(); card.name = "Timeline"; s.appendChild(card);
      card.layoutSizingHorizontal = "FILL"; card.layoutSizingVertical = "HUG";
      for (const k of ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight"]) card.setBoundVariable(k, sp[20]);
      card.setBoundVariable("itemSpacing", sp[6]);
      sec.tl.forEach((e, i) => {
        const [status, title, stamp, dtext, link] = e; const last = i === sec.tl.length - 1;
        const variant = tlSet.children.find(c => c.name === "Status=" + status);
        const ti = variant.createInstance(); ti.name = "Event · " + title; card.appendChild(ti); ti.layoutSizingHorizontal = "FILL";
        const props = { [pk(ti, "Title")]: title, [pk(ti, "Stamp")]: stamp, [pk(ti, "Show detail")]: !!(dtext || link), [pk(ti, "Show detail text")]: !!dtext, [pk(ti, "Show link")]: !!link, [pk(ti, "Show rail")]: !last };
        if (dtext) props[pk(ti, "Detail")] = dtext; if (link) props[pk(ti, "Link")] = link;
        ti.setProperties(props);
        const ct = ti.findChild(n => n.name === "Content");
        if (last) { ct.setBoundVariable("paddingBottom", null); ct.paddingBottom = 0; }
        if (dtext && !link) { const tx = ti.findOne(n => n.name === "Text" && n.type === "TEXT"); tx.layoutSizingHorizontal = "FILL"; tx.textAutoResize = "HEIGHT"; }
      });
    }
    made.push(s.id);
  }
  if (!keep) for (const o of old) o.remove();
  return made;
}
