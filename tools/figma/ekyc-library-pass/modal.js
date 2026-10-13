// eKYC library pass (2026-10-14) · local „Modal” (Confirmare / Conținut) → library modal 750e0da7 (Confirmare = content-slot Text; Conținut = content-slot swapped to the local content component, subtitle prepended).
// Stored copy: text node „__modal-ekyc” in „Componente · eKYC BO (local)” (eKYC file SqMGpRKEppJLcvn7HMzOPR).
// Run: new AF("IDS", code)(…) on the current page.
const LM = await figma.importComponentSetByKeyAsync("750e0da77c5805380edb349faa4dbc37757aa082");
const LV = LM.children.find(c => c.name === "📏 Breakpoint=Desktop, 🎚️ Type=Default, 🎚️ Size=Medium");
const T2 = await figma.variables.importVariableByKeyAsync("5d1a031c4c310a753a2c49f91c89db7ddb8a2287");
const BS = await figma.importStyleByKeyAsync("1f35541006807f80d766d8eb6ef5ae95d4f5cf6e"); await figma.loadFontAsync(BS.fontName);
const pk = (i, s) => Object.keys(i.componentProperties).find(k => k.startsWith(s));
const isBtn = (n) => n.type === "INSTANCE" && n.componentProperties && Object.keys(n.componentProperties).some(k => k.startsWith("🖌️ Style"));
const res = { done: 0, err: [] };
const list = IDS.length ? await Promise.all(IDS.map(id => figma.getNodeByIdAsync(id))) : figma.currentPage.findAll(n => n.type === "INSTANCE" && n.mainComponent && n.mainComponent.parent && n.mainComponent.parent.id === "10158:1757");
const conns = figma.currentPage.findAll(n => n.type === "CONNECTOR");
for (const m of list) {
  if (!m || m.removed) continue;
  try {
  const P = Object.fromEntries(Object.entries(m.componentProperties).map(([k, v]) => [k.split("#")[0], v.value]));
  const foot = m.findOne(n => n.name === "modal--footer");
  const fb = foot ? foot.children.filter(b => isBtn(b) && b.visible).map(b => ({ label: b.componentProperties[pk(b, "⌨️ Label")].value, style: b.componentProperties[pk(b, "🖌️ Style")].value })) : [];
  const L = LV.createInstance(); L.name = "Modal · " + P.Titlu;
  const hd = L.findOne(n => n.name === ".modal-header"); hd.setProperties({ [pk(hd, "⌨️ Title")]: P.Titlu });
  const slot = L.findOne(n => n.name === ".content-slot");
  if (P.Tip === "Confirmare") { slot.setProperties({ [pk(slot, "👁️ Title")]: false, [pk(slot, "⌨️ Body")]: P.Mesaj }); }
  else { const cc = await figma.getNodeByIdAsync(P["Conținut"]);
    if (P.Subtitlu && cc && cc.type === "COMPONENT" && !cc.findChild(n => n.name === "Subtitlu")) { const t = figma.createText(); await t.setTextStyleIdAsync(BS.id); t.characters = P.Subtitlu; t.fills = [figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0.4, g: 0.4, b: 0.4 } }, "color", T2)]; t.name = "Subtitlu"; cc.insertChild(0, t); if (cc.layoutMode && cc.layoutMode !== "NONE") { t.layoutSizingHorizontal = "FILL"; t.textAutoResize = "HEIGHT"; } }
    slot.setProperties({ "🎚️ Type": "Slot" }); const s2 = L.findOne(n => n.name === ".content-slot"); if (cc) s2.swapComponent(cc); }
  const F = L.findOne(n => n.name === "Footer");
  if (fb.length === 0) F.visible = false; else {
    F.setProperties({ [pk(F, "🎚️ # of actions")]: String(Math.min(fb.length, 2)) });
    const prim = F.findOne(n => n.name === "Primary Button"), sec = F.findOne(n => n.name === "Secondary Button");
    const last = fb[fb.length - 1]; if (prim) prim.setProperties({ [pk(prim, "⌨️ Label")]: last.label, [pk(prim, "🖌️ Style")]: last.style === "Destructive" ? "Destructive" : "Primary" });
    if (fb.length > 1 && sec) sec.setProperties({ [pk(sec, "⌨️ Label")]: fb[0].label });
    if (fb.length === 1 && sec && !prim) sec.setProperties({ [pk(sec, "⌨️ Label")]: last.label }); }
  const p = m.parent; const idx = p.children.indexOf(m); p.insertChild(idx, L);
  const abs = m.layoutPositioning === "ABSOLUTE", auto = p.layoutMode && p.layoutMode !== "NONE";
  if (abs) L.layoutPositioning = "ABSOLUTE"; L.resize(m.width, L.height);
  if (!auto || abs) { L.x = m.x + (m.width - L.width) / 2; L.y = m.y + (m.height - L.height) / 2; L.constraints = m.constraints; }
  const inside = new Set([m.id, ...m.findAll(() => true).map(n => n.id)]);
  for (const c of conns) { if (inside.has(c.connectorStart.endpointNodeId)) c.connectorStart = { endpointNodeId: L.id, magnet: c.connectorStart.magnet || "AUTO" }; if (inside.has(c.connectorEnd.endpointNodeId)) c.connectorEnd = { endpointNodeId: L.id, magnet: c.connectorEnd.magnet || "AUTO" }; }
  m.remove(); res.done++;
  } catch (e) { res.err.push(m.id + " " + e.message.slice(0, 60)); }
}
return res;
