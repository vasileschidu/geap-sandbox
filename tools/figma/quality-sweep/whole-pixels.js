// Quality sweep · Ghișeu (2026-10-16) — whole pixels: fix the CAUSE of each fraction family found by gate-audit:
//  1 empty-state „Status” wider than its visible-area wrapper (centred at −295.5)        → FILL the wrapper (1152)
//  2 a centred HUG text with an odd width in an even parent (gh-02a)                      → fixed even width, centred text
//  3 stacked second dialogs centred in an odd overlay height (gh-02w / gh-02o / gh-07a)   → absolute, y rounded
//  4 checkbox label instance 146.27 wide in a HUG „Label:margin” (gh-03a / gh-03e)        → wrapper FIXED ceil(width)
//  5 A4 preview page min-height 297mm = 1122.52 / cell padding 2.5mm-ish 9.58 / 7.58     → 1123 / 10 / 8; centred title even
//  (2026-10-16 fix) text rules skip instance internals (ids „I…”) — the first run broke badge digits / avatar initials
//  6 delivery options: 21 min-height title row + 71 min-height card (odd centring space)  → 20 / none
// Snapshot: shared plugin data qsweep/pix on each touched node.
const WHOLE = async (BLOCKS) => {
  const out = []; const fr = (v) => Math.abs(v - Math.round(v)) > 0.01;
  const snap = (n, o) => { if (!n.getSharedPluginData("qsweep", "pix")) n.setSharedPluginData("qsweep", "pix", JSON.stringify(o)); };
  for (const id of BLOCKS) {
    const b = await figma.getNodeByIdAsync(id); const bn = b.name.slice(8);
    for (const w of b.findAll((n) => n.name === "Empty state · visible area")) for (const s of w.children) if (s.width > w.width) { snap(s, { w: s.width, sh: s.layoutSizingHorizontal }); s.layoutSizingHorizontal = "FILL"; out.push(bn + " 1"); }
    for (const t of b.findAll((n) => n.type === "TEXT" && !n.id.startsWith("I") && fr(n.x) && n.parent.layoutMode === "VERTICAL" && n.parent.counterAxisAlignItems === "CENTER" && n.textAutoResize === "WIDTH_AND_HEIGHT")) { await figma.loadFontAsync(t.fontName); snap(t, { w: t.width, ar: t.textAutoResize }); const w = Math.ceil(t.width) + ((Math.ceil(t.width) + t.parent.width) % 2); t.textAutoResize = "HEIGHT"; t.resize(w, t.height); t.textAlignHorizontal = "CENTER"; out.push(bn + " 2 " + t.characters.slice(0, 20)); }
    for (const d of b.findAll((n) => n.name === "Dialog" && fr(n.y))) { snap(d, { y: d.y, pos: d.layoutPositioning }); const y = Math.round(d.y), x = Math.round(d.x); d.layoutPositioning = "ABSOLUTE"; d.x = x; d.y = y; d.constraints = { horizontal: "CENTER", vertical: "CENTER" }; out.push(bn + " 3"); }
    for (const l of b.findAll((n) => n.name === "Label:margin" && fr(n.width))) { snap(l, { w: l.width, sh: l.layoutSizingHorizontal }); const w = Math.ceil(l.width); l.layoutSizingHorizontal = "FIXED"; l.resize(w, l.height); out.push(bn + " 4"); }
    for (const c of b.findAll((n) => n.type === "FRAME" && fr(n.height) && /^Container/.test(n.name) && n.height > 1000)) { snap(c, { h: c.height }); if (c.layoutSizingVertical === "FIXED") c.resize(c.width, Math.round(c.height)); else c.minHeight = Math.round(c.height); out.push(bn + " 5h " + c.name); }
    for (const c of b.findAll((n) => n.type === "FRAME" && n.layoutMode && n.layoutMode !== "NONE" && [n.paddingTop, n.paddingLeft, n.paddingRight, n.paddingBottom].some(fr))) { snap(c, { p: [c.paddingTop, c.paddingRight, c.paddingBottom, c.paddingLeft] }); for (const k of ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"]) c[k] = Math.round(c[k]); out.push(bn + " 5p"); }
    for (const t of b.findAll((n) => n.type === "TEXT" && !n.id.startsWith("I") && fr(n.x) && n.parent.layoutMode && n.parent.layoutMode !== "NONE" && n.textAutoResize === "WIDTH_AND_HEIGHT")) { await figma.loadFontAsync(t.fontName); snap(t, { w: t.width }); const w = Math.ceil(t.width) + ((Math.ceil(t.width) + Math.round(t.parent.width - t.parent.paddingLeft - t.parent.paddingRight)) % 2); t.textAutoResize = "HEIGHT"; t.resize(w, t.height); t.textAlignHorizontal = "CENTER"; out.push(bn + " 5t"); }
    for (const f of b.findAll((n) => n.type === "FRAME" && (n.minHeight === 21 || n.minHeight === 71))) { snap(f, { min: f.minHeight }); f.minHeight = f.minHeight === 21 ? 20 : null; out.push(bn + " 6"); }
  }
  const cnt = {}; for (const o of out) { const k = o.split(" ").slice(0, 2).join(" "); cnt[k] = (cnt[k] || 0) + 1; } return cnt;
};
