// EVO Cabinet captures — overlays pass (run BEFORE swap-cabinet.js on the same roots).
// Open menus, tooltips, toasts and confirm dialogs → library / local instances, positioned absolutely
// on the screen root. Paste as the `code` of use_figma after setting ROOTS. Mirror of the Figma
// builder text node „__swap-cabinet-overlays (builder, do not edit)” (11118:39161, page FO Full Flows 09):
// the stored copy can be run with `new AsyncFunction("ROOTS", text)(ids)`.
//   ⋮ menus (Menu - Acțiuni pentru dosarul GEAP-…) → local „Cabinet / Meniu acțiuni” 11118:297930
//     (contextual-menu items Leading Element=Icon, Opțiune 1–6 + Separator 1–5 props; item icons become
//     local „Icon / Cabinet / meniu · <label>” components cloned from the capture)
//   radio menus (Sortează, rezultate pe pagină) → library selection-menu 9625:34945 (≤ 6 options;
//     7-option sort menu = local „Cabinet / Meniu · Sortează” 11118:293504, swap by hand)
//   Tooltip → library tooltip 275:24285 (Large, arrow Top/Bottom) · Status (toast) → library toast 10038:35031
//   Dialog without fieldsets → local Modal Tip=Confirmare 10136:657 inside the scrim (screen = 900 viewport)
//   Dialog with fieldsets (Filtre) → by hand: Modal Tip=Conținut + „Modal conținut / Filtre solicitări · …”
const ROOTS = ["PUT:CAPTURE-ROOT-IDS"];
const g = (id) => figma.getNodeByIdAsync(id);
for (const f of [["Onest","Regular"],["Onest","Medium"],["Onest","SemiBold"]]) await figma.loadFontAsync({ family: f[0], style: f[1] });
const loadAll = async (t) => { for (const s of t.getStyledTextSegments(["fontName"])) await figma.loadFontAsync(s.fontName); };
const textOf = (n) => (n.type === "TEXT" ? n.characters : n.findAll ? n.findAll((x) => x.type === "TEXT").map((x) => x.characters).join(" ").trim() : "");
const SM = await g("9625:34945"), TIP = await g("275:24285"), MIS = (await g("9625:34945")).children[0].mainComponent.parent;
const holder = (await g("11067:34873")).children.find((c) => c.name === "Componente · EVO Cabinet (local)");
const iconRow = holder.children.find((c) => c.name === "Iconițe · Cabinet (local)");
const iconFor = (label, src) => { const nm = "Icon / Cabinet / meniu · " + label.replace(/\d[\d.,]*\s*MDL/, "N MDL"); let c = iconRow.children.find((k) => k.name === nm); if (!c && src) { const cl = src.clone(); iconRow.appendChild(cl); c = figma.createComponentFromNode(cl); c.name = nm; } return c; };
const absOf = (n, root) => ({ x: n.absoluteTransform[0][2] - root.absoluteTransform[0][2], y: n.absoluteTransform[1][2] - root.absoluteTransform[1][2] });
const out = {};
for (const rid of ROOTS) {
  const root = await g(rid); const done = [];
  for (const m of root.findAll((n) => n.type === "FRAME" && /^Menu - /.test(n.name))) {
    const items = m.children.filter((k) => /^(Menu Item|Button|Menu Item Radio|Menu Item Checkbox)/.test(k.name) && k.findOne && k.findOne((t) => t.type === "TEXT"));
    const pos = absOf(m, root); const radio = /Sortează|pe pagină|Rezultate/.test(m.name) || items.some((k) => /Radio/.test(k.name));
    let inst;
    if (radio) {
      inst = SM.createInstance(); const props = {};
      for (let k = 1; k <= 6; k++) props[Object.keys(inst.componentProperties).find((p) => p.startsWith("👁️ Option " + k))] = k <= items.length;
      inst.setProperties(props);
      for (let k = 0; k < Math.min(6, items.length); k++) { const opt = inst.children.find((c) => c.name === "Option " + (k + 1)); const sel = Boolean(items[k].findOne((x) => x.name === "Icon")); const v = MIS.children.find((c) => c.name.includes(sel ? "State=Selected" : "State=Default")); if (v) opt.swapComponent(v); const lk = Object.keys(opt.componentProperties).find((p) => p.startsWith("Option Label")); if (lk) opt.setProperties({ [lk]: textOf(items[k]) }); else { const t = opt.findOne((x) => x.type === "TEXT"); await loadAll(t); t.characters = textOf(items[k]); } }
      if (items.length > 6) done.push("menu-overflow:" + items.length);
      inst.name = "Meniu · " + m.name.replace(/^Menu - /, "");
    } else {
      const MA = await g("11118:297930"); inst = MA.createInstance(); const props = {}; const keys = Object.keys(inst.componentProperties);
      const seq = m.children.filter((k) => k.visible !== false); let idx = 0; const sepAfter = new Set();
      for (const k of seq) { if (items.includes(k)) idx++; else if (/List Item|separator/i.test(k.name) && idx > 0) sepAfter.add(idx); }
      for (let k = 1; k <= 6; k++) props[keys.find((p) => p.startsWith("Opțiune " + k + "#"))] = k <= items.length;
      for (let k = 1; k <= 5; k++) props[keys.find((p) => p.startsWith("Separator " + k + "#"))] = sepAfter.has(k) && k < items.length;
      inst.setProperties(props);
      for (let k = 0; k < Math.min(6, items.length); k++) {
        const opt = inst.findOne((c) => c.type === "INSTANCE" && c.name === "Option " + (k + 1)); const label = textOf(items[k]);
        const lk = Object.keys(opt.componentProperties).find((p) => p.startsWith("Option Label")); opt.setProperties({ [lk]: label });
        const ic = items[k].findOne((x) => x.name === "Icon"); const comp = iconFor(label, ic);
        const slot = opt.findOne((x) => x.type === "INSTANCE"); if (comp && slot) slot.swapComponent(comp);
      }
      if (items.length > 6) done.push("menu-overflow:" + items.length);
      const nr = (m.name.match(/GEAP-[\d-]+/) || [""])[0]; inst.name = "Meniu ⋮ · " + nr; // swap-cabinet.js sets that card's ⋮ to State=Focus
    }
    root.appendChild(inst); inst.layoutPositioning = "ABSOLUTE"; inst.x = pos.x; inst.y = pos.y; m.remove(); done.push("menu");
  }
  for (const t of root.findAll((n) => n.type === "FRAME" && /^Tooltip/.test(n.name))) {
    const pos = absOf(t, root); const arrow = t.children.find((k) => k.layoutPositioning === "ABSOLUTE"); const below = arrow && arrow.y < t.height / 2;
    const v = TIP.children.find((c) => c.name.includes("Size=Large") && c.name.includes("Arrow Position=" + (below ? "Top" : "Bottom") + ",") && c.name.includes("Close Button=False"));
    const i = v.createInstance(); i.setProperties({ [Object.keys(i.componentProperties).find((p) => p.startsWith("⌨️ Text"))]: textOf(t) });
    root.appendChild(i); i.layoutPositioning = "ABSOLUTE"; i.x = pos.x; i.y = pos.y; i.name = "tooltip"; t.remove(); done.push("tooltip");
  }
  const TOAST = await g("10038:35031");
  for (const t of root.findAll((n) => n.type === "FRAME" && n.name === "Status" && n.layoutPositioning === "ABSOLUTE")) {
    const f = t.fills && t.fills[0] && t.fills[0].color; const style = f && f.g > 0.5 && f.r < 0.3 ? "Success" : f && f.r > 0.7 && f.g < 0.4 ? "Error" : f && f.r > 0.8 && f.g > 0.6 ? "Warning" : "Info";
    const v = TOAST.children.find((c) => c.name.includes("Style=" + style) && !/Heading/.test(c.name));
    const i = v.createInstance(); const k = Object.keys(i.componentProperties); i.setProperties({ [k.find((p) => p.startsWith("⌨️ Message"))]: textOf(t.findOne((x) => x.name === "Paragraph") || t), [k.find((p) => p.startsWith("👁️ Close"))]: Boolean(t.findOne((x) => /Închide/.test(x.name))), [k.find((p) => p.startsWith("👁️ Link"))]: false });
    const pos = absOf(t, root); root.appendChild(i); i.layoutPositioning = "ABSOLUTE"; i.x = pos.x; i.y = pos.y; i.name = "toast"; t.remove(); done.push("toast");
  }
  const MODAL = await g("10136:657");
  for (const d of root.findAll((n) => n.type === "FRAME" && n.name === "Dialog" && n.layoutPositioning === "ABSOLUTE")) {
    if (d.findOne((n) => n.name === "Field Set")) { done.push("dialog-content:manual"); continue; }
    const box = d.children[0]; const h = box.findOne((n) => n.name === "Heading 2"); const title = h ? textOf(h) : ""; const paras = box.findAll((n) => n.name === "Paragraph").map((p) => textOf(p));
    const btns = box.findAll((n) => n.type === "FRAME" && n.name === "Button" && n.height >= 40).map((b) => ({ label: textOf(b), fill: b.fills && b.fills[0] && b.fills[0].color }));
    const m = MODAL.children.find((c) => c.name === "Tip=Confirmare").createInstance(); const k = Object.keys(m.componentProperties);
    m.setProperties({ [k.find((p) => p.startsWith("Titlu"))]: title, [k.find((p) => p.startsWith("Mesaj"))]: paras.join("\n\n") });
    const mb = m.findAll((n) => n.type === "INSTANCE" && /^btn · /.test(n.name));
    for (let q = 0; q < Math.min(mb.length, btns.length); q++) { const b = btns[q]; const red = b.fill && b.fill.r > 0.7 && b.fill.g < 0.4; const blue = b.fill && b.fill.b > 0.6 && b.fill.r < 0.3; const st = red ? "Destructive" : blue ? "Primary" : "Neutral"; const vv = mb[q].mainComponent.parent.children.find((c) => c.name.includes("Style=" + st) && c.name.includes("Icon=None") && c.name.includes("Size=Large") && c.name.includes("State=Default")); if (vv) mb[q].swapComponent(vv); const lk = Object.keys(mb[q].componentProperties).find((p) => p.startsWith("⌨️ Label")); mb[q].setProperties({ [lk]: b.label }); mb[q].name = "btn · " + b.label; }
    d.appendChild(m); if (d.layoutMode && d.layoutMode !== "NONE") m.layoutPositioning = "ABSOLUTE"; m.x = Math.round((d.width - m.width) / 2); m.y = Math.round((d.height - m.height) / 2); box.remove(); m.name = "Modal · " + title;
    d.name = "Overlay"; root.resize(root.width, d.height); root.clipsContent = true; done.push("modal-confirm");
  }
  out[rid] = done;
}
return out;
