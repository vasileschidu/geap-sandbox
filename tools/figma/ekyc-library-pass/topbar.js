// eKYC library pass (2026-10-14) · raw „header-evo-desktop” gov bar → library .top-section (from header-evo-desktop set ef41893a).
// Stored copy: text node „__topbar-ekyc” in „Componente · eKYC BO (local)” (eKYC file SqMGpRKEppJLcvn7HMzOPR).
// Run: new AF("IDS", code)(…) on the current page.
const H = await figma.importComponentSetByKeyAsync("ef41893a2f6488bb4b264a219fa31a8ec9f562a8");
const TS = await H.children[0].findOne(n => n.name === ".top-section").getMainComponentAsync();
const inI = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const res = { done: 0, err: [] };
const roots = IDS.length ? await Promise.all(IDS.map(i => figma.getNodeByIdAsync(i))) : [figma.currentPage];
for (const root of roots) for (const f of root.findAll(n => n.type === "FRAME" && n.name === "header-evo-desktop" && !inI(n))) {
  try { const p = f.parent; const idx = p.children.indexOf(f); const i = TS.createInstance(); p.insertChild(idx, i);
    const auto = p.layoutMode && p.layoutMode !== "NONE";
    if (auto && f.layoutPositioning !== "ABSOLUTE") { i.layoutSizingHorizontal = f.layoutSizingHorizontal === "FIXED" ? "FIXED" : "FILL"; if (i.layoutSizingHorizontal === "FIXED") i.resize(f.width, i.height); } else { if (f.layoutPositioning === "ABSOLUTE") i.layoutPositioning = "ABSOLUTE"; i.x = f.x; i.y = f.y; i.resize(f.width, i.height); }
    i.name = "gov top bar"; f.remove(); res.done++; } catch (e) { res.err.push(e.message.slice(0, 60)); } }
return res;
