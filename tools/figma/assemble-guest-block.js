// Assemble one Guest-lane block (FOD-Components-flow, section „Guest lane · without account”) from a
// swapped desktop capture + its 375 mobile capture. Paste as the body of use_figma with B = [{…}] set.
// B item: { block?: existing block id (rebuilt in place) | tpl: template block id (cloned), id: "G1",
//           title, state: "fo-g1", desk: capture root id, mob: capture root id, noteTitle, note }
// Block = VERTICAL hug, gap 16: Screen label (ID chip, title, „Prototype ↗” link) · „Ecrane · desktop +
// mobil” (HORIZONTAL, gap 80, tops aligned) · Note (FILL). Screens: 3px outline, radius 12, hug height.
const B = ["PUT:ITEMS"];
const g = (id) => figma.getNodeByIdAsync(id);
const loadAll = async (t) => { for (const s of t.getStyledTextSegments(["fontName"])) await figma.loadFontAsync(s.fontName); };
const setT = async (t, s) => { await loadAll(t); t.characters = s; };
const brand = await figma.variables.getVariableByIdAsync("VariableID:a43e80333d72e54c8262d9afa675e746afadaea1/1296:127");
const sp80 = await figma.variables.importVariableByKeyAsync("6b41a484af89fb00350dc4422ac7fb5e7cf8687a");
const SANDBOX = "https://vasileschidu.github.io/geap-sandbox/e-permits-acte-permisive.html?state=";
const out = [];
for (const it of B) {
  let b = it.block ? await g(it.block) : null;
  if (!b) { const tpl = await g(it.tpl); b = tpl.clone(); tpl.parent.appendChild(b); b.x = tpl.x; b.y = tpl.y + tpl.height + 400; }
  b.name = `Block · ${it.id} · ${it.title}`;
  const [lab, oldScreen, note] = b.children;
  const outline = oldScreen.strokes && oldScreen.strokes.length ? JSON.parse(JSON.stringify(oldScreen.strokes)) : null;
  // screens row
  const row = figma.createAutoLayout("HORIZONTAL", { name: `Screens · desktop + mobile · ${it.id}` }); row.fills = []; row.clipsContent = false; row.counterAxisAlignItems = "MIN";
  row.itemSpacing = 80; row.setBoundVariable("itemSpacing", sp80);
  b.insertChild(1, row); oldScreen.remove();
  for (const [id, nm] of [[it.desk, `Desktop · ${it.id}`], [it.mob, `Mobil · ${it.id}`]]) {
    if (!id) continue; const s = await g(id); row.appendChild(s); s.name = nm;
    if (outline) { s.strokes = outline; s.strokeWeight = 3; s.strokeAlign = "OUTSIDE"; }
    s.cornerRadius = 12; s.clipsContent = true; try { s.layoutSizingVertical = "HUG"; } catch (e) {}
  }
  // label
  lab.name = `Screen label · ${it.id}`;
  await setT(lab.children.find((c) => c.name === "ID").findOne((n) => n.type === "TEXT"), it.id);
  const title = lab.children.find((c) => c.type === "TEXT" && c.name !== "Link · prototype"); await setT(title, it.title); title.name = it.title;
  let link = lab.children.find((c) => c.name === "Link · prototype");
  if (!link) { link = figma.createText(); await figma.loadFontAsync({ family: "Onest", style: "Medium" }); link.fontName = { family: "Onest", style: "Medium" }; link.fontSize = 16; link.name = "Link · prototype"; lab.appendChild(link); }
  await setT(link, "Prototype ↗"); link.fills = [figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0, g: 0.35, b: 0.82 } }, "color", brand)];
  link.setRangeHyperlink(0, link.characters.length, { type: "URL", value: SANDBOX + it.state }); link.setRangeTextDecoration(0, link.characters.length, "UNDERLINE");
  lab.counterAxisAlignItems = "CENTER";
  // note
  note.name = `Note · ${it.id}`; const nt = note.children.filter((n) => n.type === "TEXT");
  await setT(nt[0], it.noteTitle); nt[0].name = it.noteTitle; await setT(nt[1], it.note);
  b.layoutMode = "VERTICAL"; b.primaryAxisSizingMode = "AUTO"; b.counterAxisSizingMode = "AUTO"; try { note.layoutSizingHorizontal = "FILL"; } catch (e) {}
  out.push({ id: it.id, block: b.id, w: Math.round(b.width), h: Math.round(b.height) });
}
return out;
