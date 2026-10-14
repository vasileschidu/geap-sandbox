// eKYC „+N” tag cells (code 8493a239, renderUserRoles + fitTagRows): one line of WHOLE tags + „+N” (12/16 medium,
// gap 4) in Clienți › Cazuri de utilizare and Utilizatori › Roluri. Run per page in use_figma with
// const HEAD = /^(Cazuri de utilizare|Roluri)$/, FULL = { Roluri: [...all roles of the old „+N” cell] }, WIDEN = { Roluri: [368, 380, "Login-uri eșuate", 168] }.
// Every table whose header matches: (optional) widen the track, then per body cell: tags (tag-filled) in the cell's
// „Text” frame → HORIZONTAL gap 4 NO_WRAP, missing tags created from FULL (cells that showed the old „+N”), keep as
// many whole tags as fit the cell's inner width (at least 1), hide the rest, „+N” text = hidden count, named with the
// tooltip text („Toate rolurile: …”). Returns counts.
// Usage (per page): const PAGE = "<page id>", ROOT = null | "<block id>", SRC_PLUS = "10344:312" (a 12/16 medium „+N” text to clone).
figma.skipInvisibleInstanceChildren = false;
const inI = (n) => { for (let q = n.parent; q; q = q.parent) if (q.type === "INSTANCE") return true; return false; };
const lbl = (g) => g.componentProperties[Object.keys(g.componentProperties).find((k) => k.startsWith("⌨️ Label"))].value;
const src = await figma.getNodeByIdAsync(SRC_PLUS);
const p = await figma.getNodeByIdAsync(PAGE); await figma.setCurrentPageAsync(p);
const root = ROOT ? await figma.getNodeByIdAsync(ROOT) : p; const st = { tables: 0, cells: 0, plus: 0, created: 0 };
for (const t of root.findAll((n) => n.type === "FRAME" && n.layoutMode === "GRID" && !inI(n) && /^Table/.test(n.name))) {
  const hdr = t.gridColumnSizes.map((_, i) => { const h = t.children.find((c) => c.gridRowAnchorIndex === 0 && c.gridColumnAnchorIndex === i); return h ? h.findAll((x) => x.type === "TEXT" && x.visible).map((x) => x.characters).join("").trim() : ""; });
  const ci = hdr.findIndex((h) => HEAD.test(h)); if (ci < 0) continue; st.tables++;
  if (WIDEN && WIDEN[hdr[ci]]) { const [from, to, donor, dfrom] = WIDEN[hdr[ci]]; const di = hdr.indexOf(donor); const cs = t.gridColumnSizes.map((c) => ({ ...c }));
    if (Math.round(cs[ci].value) === from && di >= 0 && Math.round(cs[di].value) === dfrom) { cs[ci].value += to - from; cs[di].value -= to - from; t.gridColumnSizes = cs;
      for (const c of t.children.filter((c) => c.gridColumnAnchorIndex === ci || c.gridColumnAnchorIndex === di)) { try { c.layoutSizingHorizontal = "FILL"; } catch (e) {} const w = t.gridColumnSizes[c.gridColumnAnchorIndex].value; if (Math.abs(c.width - w) > 0.5) c.resize(w, c.height); } } }
  for (const c of t.children.filter((c) => c.gridColumnAnchorIndex === ci && c.gridRowAnchorIndex > 0 && c.type === "FRAME")) {
    const box = c.children.find((k) => k.name === "Text"); if (!box) continue;
    const tags = box.children.filter((k) => k.type === "INSTANCE" && k.mainComponent?.parent?.name === "tag-filled");
    const old = box.children.filter((k) => k.type === "TEXT");
    if (old.length && FULL[hdr[ci]]) { const have = tags.map(lbl); for (const v of FULL[hdr[ci]]) if (!have.includes(v)) { const g = tags[tags.length - 1].clone(); box.insertChild(box.children.indexOf(tags[tags.length - 1]) + 1, g); g.setProperties({ [Object.keys(g.componentProperties).find((k) => k.startsWith("⌨️ Label"))]: v }); g.name = "tag · " + v; tags.push(g); st.created++; } }
    for (const o of old) o.remove(); if (tags.length < 2) continue; st.cells++;
    box.layoutMode = "HORIZONTAL"; box.itemSpacing = 4; box.layoutWrap = "NO_WRAP"; box.counterAxisAlignItems = "CENTER"; box.primaryAxisSizingMode = "AUTO"; box.counterAxisSizingMode = "AUTO";
    const plus = src.clone(); box.appendChild(plus); await figma.loadFontAsync(plus.fontName); plus.visible = true;
    const inner = c.width - c.paddingLeft - c.paddingRight; for (const g of tags) g.visible = true;
    const wsum = (n) => tags.slice(0, n).reduce((a, g) => a + g.width, 0) + 4 * (n - 1); const pw = (n) => { plus.characters = "+" + n; return plus.width; };
    let k = tags.length; while (k > 1 && wsum(k) + (k < tags.length ? 4 + pw(tags.length - k) : 0) > inner) k--;   // exact „+N” width, not a placeholder
    tags.forEach((g, i) => (g.visible = i < k));
    if (k < tags.length) { plus.characters = "+" + (tags.length - k); plus.name = (hdr[ci] === "Roluri" ? "Toate rolurile: " : "Toate cazurile: ") + tags.map(lbl).join(", "); st.plus++; } else plus.remove();
    c.primaryAxisAlignItems = "CENTER"; } }
return st;
