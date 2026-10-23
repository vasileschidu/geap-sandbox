// Document · card (GEAP 11364:7441) — Context=Certificate variants (ghiseu-bundle-figma-v1, 2026-10-23; code 36e31351
// finish-doc-error-filecard-v1 + „Vezi …” without icon). Proof-of-filing certificate on the FO Finalizare / Ghișeu
// Confirmarea depunerii step = the shared document card: 24 generated document icon · title 14/20 500 + Small neutral
// „Generat” tag · note 12/20 tertiary (TEXT prop `Note`) · Small Neutral „Vezi documentul” (label only). State=Error =
// library file-item Error look: 1.5 INSIDE border/danger/default, no tag, note in text/danger/on-secondary, Small outlined
// Strict „Reîncercați” + 20/rotate-arrow (16 slot). Desktop: action right, vertically centred; Mobile: action under the text.
// Run once via use_figma (idempotent: skips when the Certificate variants exist). Returns the new variant ids.
const set = await figma.getNodeByIdAsync("11364:7441");
if (set.children.some((c) => /Context=Certificate/.test(c.name))) return set.children.filter((c) => /Context=Certificate/.test(c.name)).map((c) => c.id + " " + c.name);
await figma.loadFontAsync({ family: "Onest", style: "Regular" });
await figma.loadFontAsync({ family: "Onest", style: "Medium" });
const V = async (key) => figma.variables.importVariableByKeyAsync(key);
const tert = await V("9d5ad1d87c1c1e2a9f94a242896a7882a20eda3f");      // text/base/tertiary
const dangerTxt = await V("e99e47b27e328ecbcadf4c846b66dd8219e1d499"); // text/danger/on-secondary
const dangerBorder = await V("bc39b7f802d29cfe2fd078820b6f65ee3939fa45"); // border/danger/default
const NEUTRAL = await figma.getNodeByIdAsync("5611:63247");   // button-filled-rectangular Neutral · Icon None · Small
const STRICT = await figma.getNodeByIdAsync("5674:53718");    // button-outlined-rectangular Strict · Leading · Small
const ROTATE = "367:16380";                                   // 20/rotate-arrow (Foundations)
const noteKey = set.addComponentProperty("Note", "TEXT", "Dovada depunerii, pentru solicitant. Disponibil și în EVO Cabinet.");
const paint = (v) => figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", v);
const copyRefs = (a, b) => { // clone() inside a set drops componentPropertyReferences — copy them by structure
  if (a.componentPropertyReferences && Object.keys(a.componentPropertyReferences).length && !b.id.includes(";")) { try { b.componentPropertyReferences = a.componentPropertyReferences; } catch (e) {} }
  if (a.type === "INSTANCE" || !("children" in a)) return;
  a.children.forEach((c, i) => b.children[i] && copyRefs(c, b.children[i]));
};
const P = (inst, p) => Object.keys(inst.componentProperties).find((k) => k.startsWith(p));
function build(src, state, screen) {
  const v = src.clone(); set.appendChild(v); copyRefs(src, v);
  v.name = `Context=Certificate, Source=Generated, State=${state}, Screen=${screen}`;
  const content = v.findOne((n) => n.name === "Content");
  content.findOne((n) => n.name === "Meta").remove();
  content.itemSpacing = 4;
  const note = figma.createText();
  note.fontName = { family: "Onest", style: "Regular" }; note.fontSize = 12; note.lineHeight = { value: 20, unit: "PIXELS" };
  note.characters = state === "Error" ? "Nu a putut fi generat." : "Dovada depunerii, pentru solicitant. Disponibil și în EVO Cabinet.";
  note.name = "Note"; note.fills = [paint(state === "Error" ? dangerTxt : tert)];
  content.appendChild(note); note.layoutSizingHorizontal = "FILL"; note.textAutoResize = "HEIGHT";
  note.componentPropertyReferences = { characters: noteKey };
  const tag = v.findOne((n) => n.name === "Tag · source");
  if (state === "Error") {
    tag.visible = false;
    v.strokes = [paint(dangerBorder)]; v.strokeWeight = 1.5; v.strokeAlign = "INSIDE";
  }
  const btn = v.findOne((n) => n.type === "INSTANCE" && n.name === "Details");
  btn.swapComponent(state === "Error" ? STRICT : NEUTRAL);
  btn.name = "Action";
  btn.setProperties({ [P(btn, "⌨️ Label")]: state === "Error" ? "Reîncercați" : "Vezi documentul" });
  if (state === "Error") btn.setProperties({ [P(btn, "🔄 Leading Icon: 16")]: ROTATE });
  btn.layoutSizingHorizontal = "HUG";
  return v;
}
const out = [];
for (const [srcId, screen] of [["11384:7101", "Desktop"], ["11387:41250", "Mobile"]]) {
  const src = await figma.getNodeByIdAsync(srcId);
  for (const st of ["Default", "Error"]) { const v = build(src, st, screen); out.push(v.id + " " + v.name + " " + Math.round(v.width) + "x" + Math.round(v.height)); }
}
return out;
