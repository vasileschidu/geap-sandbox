// Build the Form Designer context pieces (grey skeleton = not the subject of the US-54 board; user rule 2026-10-13):
//   `Form Designer / Library · context`  — left palette 322 (code .e-permits-builder__library: head 20 / gap 16 + list)
//   `Form Designer / Stage header · context` — service header (16/24, gap 12) + step chips row (12/16, gap 10), 736 FILL
// Skeleton pieces = instances of `FO / Context · skeleton` 11258:17226 (Bar / Title / Box / Round). Needs fd-lib.js.
// Holder: section „Form & Process Designer” 12645:8499 on 🧩 Local components (the old section 12282:434927 was removed 2026-10-24).
const holder = await node("12645:8499"); await figma.setCurrentPageAsync(holder.parent);
const SK = await node("11258:17226");
const sk = async (type, w, h, name) => { const i = (pick(SK, { Type: type })).createInstance(); i.resize(w, h); i.name = name || `skeleton · ${type}`; return i; };
// ---- Library · context
const lib = figma.createComponent(); lib.name = "Form Designer / Library · context";
lib.layoutMode = "VERTICAL"; lib.primaryAxisSizingMode = "AUTO"; lib.counterAxisSizingMode = "FIXED"; lib.resize(322, 100);
await fill(lib, K.bgDefault); await stroke(lib, K.border, { r: 1 });
const head = await frame("Head", "V", { gap: 16, pad: [20, 20, 20, 20] }); append(lib, head, { h: "FILL" }); await stroke(head, K.border, { b: 1 });
append(head, await sk("Title", 100, 20, "skeleton · Bibliotecă"));
append(head, await sk("Box", 281, 40, "skeleton · Caută componente"), { h: "FILL" });
const list = await frame("List", "V", { gap: 0, pad: [8, 20, 24, 20] }); append(lib, list, { h: "FILL" });
const widths = [[150, 110], [120, 130], [110, 150], null, [130, 170], [170, 150], [70, 140], [150, 120], [110, 150], null, [100, 170], [110, 150]];
for (const w of widths) {
  if (!w) { const g = await frame("Group label", "H", { pad: [16, 0, 8, 0] }); append(list, g, { h: "FILL" }); append(g, await sk("Bar", 120, 16)); continue; }
  const row = await frame("Item", "H", { gap: 12, pad: [8, 0, 8, 0], align: "CENTER" }); append(list, row, { h: "FILL" });
  append(row, await sk("Box", 36, 36, "skeleton · icon"));
  const col = await frame("Text", "V", { gap: 6 }); append(row, col);
  append(col, await sk("Bar", w[0], 16, "skeleton · name")); append(col, await sk("Bar", w[1], 12, "skeleton · hint"));
}
holder.appendChild(lib); lib.x = 80; lib.y = 800;
lib.description = "Form Designer left palette as grey context (the board is about the Address pattern). Code: .e-permits-builder__library.";
// ---- Stage header · context
const st = figma.createComponent(); st.name = "Form Designer / Stage header · context";
st.layoutMode = "VERTICAL"; st.primaryAxisSizingMode = "AUTO"; st.counterAxisSizingMode = "FIXED"; st.resize(736, 100);
const sh = await frame("Service header", "V", { gap: 12, pad: [16, 24, 16, 24], fill: K.bgDefault }); append(st, sh, { h: "FILL" }); await stroke(sh, K.border, { b: 1 });
append(sh, await sk("Bar", 154, 16, "skeleton · breadcrumb"));
const tr = await frame("Title row", "H", { gap: 16, align: "CENTER" }); append(sh, tr); append(tr, await sk("Title", 340, 24, "skeleton · service title")); append(tr, await sk("Box", 52, 20, "skeleton · status"));
const mr = await frame("Meta row", "H", { gap: 12, align: "CENTER" }); append(sh, mr);
append(mr, await sk("Box", 76, 24, "skeleton · type")); append(mr, await sk("Box", 104, 24, "skeleton · type")); append(mr, await sk("Bar", 420, 16, "skeleton · meta"));
const steps = await frame("Steps", "H", { gap: 10, pad: [12, 16, 12, 16], fill: K.bgDefault, align: "CENTER" }); append(st, steps, { h: "FILL" }); await stroke(steps, K.border, { b: 1 });
for (const w of [170, 162, 150, 182]) append(steps, await sk("Box", w, 32, "skeleton · step"));
holder.appendChild(st); st.x = 500; st.y = 800;
st.description = "Form Designer service header + step chips as grey context. Code: .e-permits-builder__service-header + __steps.";
// round all skeleton boxes used as pills
for (const n of steps.children) { n.topLeftRadius = n.topRightRadius = n.bottomLeftRadius = n.bottomRightRadius = 999; await bindNum(n, "topLeftRadius", K.rFull); await bindNum(n, "topRightRadius", K.rFull); await bindNum(n, "bottomLeftRadius", K.rFull); await bindNum(n, "bottomRightRadius", K.rFull); }
return { lib: lib.id + " " + lib.width + "x" + lib.height, stage: st.id + " " + st.width + "x" + st.height };
