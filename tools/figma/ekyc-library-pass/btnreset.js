// eKYC library pass (2026-10-14) · button instances: reset icon fill/stroke overrides, re-apply properties/texts/sizing.
// Stored copy: text node „__btnreset-ekyc” in „Componente · eKYC BO (local)” (eKYC file SqMGpRKEppJLcvn7HMzOPR).
// Run: new AF("FROM", "COUNT", code)(…) on the current page.
const isBtn = (n) => n.type === "INSTANCE" && n.componentProperties && Object.keys(n.componentProperties).some(k => k.startsWith("🖌️ Style"));
const hasOv = async (b) => { for (const o of b.overrides) { if (o.id === b.id) continue; if (!o.overriddenFields.some(f => f === "fills" || f === "strokes")) continue; const n = await figma.getNodeByIdAsync(o.id); if (n && n.type !== "TEXT") return true; } return false; };
const same = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) < 0.05;
const res = { fixed: 0, still: 0, txt: 0, mismatch: [] };
const list = figma.currentPage.findAll(isBtn).slice(FROM, FROM + COUNT);
for (const b of list) {
  if (b.removed || /MPass/.test(b.mainComponent ? b.mainComponent.name : "")) continue;
  if (!(await hasOv(b))) continue;
  const props = {}; for (const [k, v] of Object.entries(b.componentProperties)) if (v.type !== "VARIANT") props[k] = v.value;
  const txt = b.findAll(k => k.type === "TEXT").map(t => t.characters);
  const sz = [b.layoutSizingHorizontal, b.layoutSizingVertical, b.width, b.height, b.name, b.visible];
  const ic = b.findOne(k => k.type === "INSTANCE"); const icSz = ic ? [ic.width, ic.height] : null;
  b.resetOverrides(); try { b.setProperties(props); } catch (e) {}
  const t2 = b.findAll(k => k.type === "TEXT"); for (let i = 0; i < t2.length; i++) { if (txt[i] !== undefined && t2[i].characters !== txt[i]) { await figma.loadFontAsync(t2[i].fontName); t2[i].characters = txt[i]; res.txt++; } }
  const ic2 = b.findOne(k => k.type === "INSTANCE"); if (ic2 && icSz && Math.abs(ic2.width - icSz[0]) > .5) { try { ic2.resize(icSz[0], icSz[1]); } catch (e) {} }
  try { if (sz[0] !== "HUG" || sz[1] !== "HUG") { b.layoutSizingHorizontal = sz[0]; b.layoutSizingVertical = sz[1]; if (sz[0] === "FIXED" || sz[1] === "FIXED") b.resize(sz[2], sz[3]); } } catch (e) {}
  b.name = sz[4]; b.visible = sz[5];
  if (await hasOv(b)) res.still++; else res.fixed++;
  const l = b.findOne(k => k.type === "TEXT" && k.visible); const v = ic2 && ic2.findOne(k => (k.type === "VECTOR" || k.type === "BOOLEAN_OPERATION") && k.visible && k.fills && k.fills.length && k.fills[0].type === "SOLID");
  if (l && v && l.fills[0] && l.fills[0].type === "SOLID" && !same(l.fills[0].color, v.fills[0].color)) res.mismatch.push(b.id + " " + b.name.slice(0, 20) + " " + ic2.name);
}
res.mismatch = res.mismatch.slice(0, 8); return res;
