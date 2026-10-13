// eKYC library pass (2026-10-14) · raw „Tab List” of .tab-item-md → library tabs (c9366d10) with the same tab properties (2–8 tabs; 9 = gap).
// Stored copy: text node „__tabs-ekyc” in „Componente · eKYC BO (local)” (eKYC file SqMGpRKEppJLcvn7HMzOPR).
// Run: new AF((none), code)(…) on the current page.
const T = await figma.importComponentSetByKeyAsync("c9366d10de0b15713352d8636fc76f0977f688a0");
const inI = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const res = { done: 0, skip: {} };
for (const tl of figma.currentPage.findAll(n => n.type === "FRAME" && /^Tab List/.test(n.name) && !inI(n))) {
  const items = tl.children.filter(k => k.type === "INSTANCE" && k.visible);
  const N = items.length; const v = T.children.find(c => c.name === "🧮 Tabs Count=" + N + ", 📏 Breakpoint=Desktop");
  if (!v || items.length !== tl.children.length) { res.skip[N] = (res.skip[N] || 0) + 1; continue; }
  let ok = true; for (const it of items) { const mc = await it.getMainComponentAsync(); if (!mc || !mc.parent || mc.parent.name !== ".tab-item-md") ok = false; } if (!ok) { res.skip.other = (res.skip.other || 0) + 1; continue; }
  const i = v.createInstance(); const ak = Object.keys(i.componentProperties).find(k => k.startsWith("👁️ Arrow")); if (ak) i.setProperties({ [ak]: false });
  for (let k = 0; k < N; k++) { const tab = i.findOne(n => n.name === "Tab " + (k + 1)); const old = items[k]; if (!tab) continue;
    const pp = {}; for (const [key, val] of Object.entries(old.componentProperties)) { const kk = Object.keys(tab.componentProperties).find(x => x.split("#")[0] === key.split("#")[0]); if (kk) pp[kk] = val.value; } tab.setProperties(pp);
    const ot = old.findAll(n => n.type === "TEXT"), nt = tab.findAll(n => n.type === "TEXT"); for (let j = 0; j < Math.min(ot.length, nt.length); j++) if (ot[j].characters !== nt[j].characters) { await figma.loadFontAsync(nt[j].fontName); nt[j].characters = ot[j].characters; } }
  const p = tl.parent; const idx = p.children.indexOf(tl); p.insertChild(idx, i);
  const auto = p.layoutMode && p.layoutMode !== "NONE";
  if (auto && tl.layoutPositioning !== "ABSOLUTE") { try { i.layoutSizingHorizontal = tl.layoutSizingHorizontal === "FILL" ? "FILL" : "HUG"; } catch (e) {} } else { if (tl.layoutPositioning === "ABSOLUTE") i.layoutPositioning = "ABSOLUTE"; i.x = tl.x; i.y = tl.y; }
  i.name = tl.name.replace("Tab List", "tabs"); tl.remove(); res.done++;
}
return res;
