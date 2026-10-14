// eKYC library pass round 3 (2026-10-14) · screens: frames whose content outgrew a fixed height → HUG. Skips layers INSIDE instances (round-3 root cause: it HUG-ed table-cell Resizers).
// Run on the current page: new AF(code)()
const inI = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };

const list = [];
for (const scr of figma.currentPage.findAll(n => n.type === "FRAME" && /^Ecran · /.test(n.name))) {
  let changed = false;
  const cands = scr.findAll(n => n.type === "FRAME" && !inI(n) && n.clipsContent && n.layoutMode && n.layoutMode !== "NONE" && n.layoutMode !== "GRID" && n.layoutSizingVertical !== "HUG" && n.layoutPositioning !== "ABSOLUTE" && !/scroll-content|Overlay|Drawer|Modal/.test(n.name));
  for (const f of cands.reverse()) {
    let inOv = false; for (let p = f; p && p !== scr; p = p.parent) if (/Overlay/.test(p.name)) { inOv = true; break; } if (inOv) continue;
    const kids = f.children.filter(k => k.visible && k.layoutPositioning !== "ABSOLUTE"); if (!kids.length) continue;
    const need = f.layoutMode === "VERTICAL" ? kids.reduce((s, k) => s + k.height, 0) + f.itemSpacing * (kids.length - 1) + f.paddingTop + f.paddingBottom : Math.max(...kids.map(k => k.height)) + f.paddingTop + f.paddingBottom;
    if (need > f.height + 2) { try { f.layoutSizingVertical = "HUG"; changed = true; } catch (e) {} }
  }
  if (scr.layoutMode && scr.layoutSizingVertical === "FIXED") { const kids = scr.children.filter(k => k.visible && k.layoutPositioning !== "ABSOLUTE"); const need = kids.reduce((s, k) => s + k.height, 0) + scr.itemSpacing * Math.max(0, kids.length - 1); if (need > scr.height + 2) { scr.resize(scr.width, need); changed = true; } }
  if (changed) { for (const ov of scr.children.filter(k => k.name === "Overlay" && k.layoutPositioning === "ABSOLUTE")) ov.resize(ov.width, Math.max(ov.height, scr.height)); list.push(scr.name.slice(7, 13)); }
}
return list.join(",");
