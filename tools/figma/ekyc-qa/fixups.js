// eKYC BO QA (2026-10-16) — the one-off fixes run during the job, kept as a record (each was a separate use_figma call).
// They are idempotent only where noted; read before re-running.

// 1 · Form layouts captured as absolute (C02k 10267:4718, C04-family 10474:32993): side nav + form + saving bar
//     → VERTICAL [„Form layout” HORIZONTAL gap 40 (nav, form), saving bar] gap 8 (both gaps from the captured positions).
//     Snapshot: node shared plugin data ekqa/formlayout = {id, w, h, kids: [[id, x, y]…]}.
export async function formLayout(ids /* [[pageId, nodeId]…] */) {
  const sp = { 8: await figma.variables.importVariableByKeyAsync("69ac88e41c0fea695fc5c4fd33f0188d1172dc59"), 40: await figma.variables.importVariableByKeyAsync("7cafa764a9b0b1eb7a8fe2bec67721b5c331cf83") };
  for (const [pid, id] of ids) {
    await (await figma.getNodeByIdAsync(pid)).loadAsync(); const c = await figma.getNodeByIdAsync(id); const [nav, form, saving] = c.children;
    c.setSharedPluginData("ekqa", "formlayout", JSON.stringify({ id, w: c.width, h: c.height, kids: c.children.map((k) => [k.id, k.x, k.y]) }));
    const gapRow = Math.round(form.x - nav.width), gapCol = Math.round(saving.y - (form.y + form.height));
    const row = figma.createFrame(); row.name = "Form layout"; row.fills = []; c.insertChild(0, row); row.layoutMode = "HORIZONTAL"; row.itemSpacing = gapRow; row.counterAxisAlignItems = "MIN";
    row.appendChild(nav); row.appendChild(form); c.layoutMode = "VERTICAL"; c.itemSpacing = gapCol; c.counterAxisAlignItems = "MIN";
    row.layoutSizingHorizontal = "FILL"; row.layoutSizingVertical = "HUG"; if (sp[gapRow]) row.setBoundVariable("itemSpacing", sp[gapRow]); if (sp[gapCol]) c.setBoundVariable("itemSpacing", sp[gapCol]);
    c.layoutSizingVertical = "HUG"; saving.layoutSizingHorizontal = "FILL";
  }
}
// 1b · C02k is a SCROLLED modal background (scroll-content at y −1512): the sticky section nav was captured at the viewport
//      top (y 1440 inside the form). Auto-layout keeps it there with a column [„Spacer · scroll offset” FIXED 1440, nav].
export async function stickyNav() {
  const c = await figma.getNodeByIdAsync("10267:4718"); const snap = JSON.parse(c.getSharedPluginData("ekqa", "formlayout"));
  const row = c.children.find((k) => k.name === "Form layout"); const nav = await figma.getNodeByIdAsync(snap.kids[0][0]);
  const col = figma.createFrame(); col.name = "Section nav · sticky (scrolled)"; col.fills = []; row.insertChild(row.children.indexOf(nav), col); col.layoutMode = "VERTICAL"; col.itemSpacing = 0;
  const sp = figma.createFrame(); sp.name = "Spacer · scroll offset"; sp.fills = []; col.appendChild(sp); sp.resize(Math.round(nav.width), Math.round(snap.kids[0][2])); col.appendChild(nav);
  col.layoutSizingHorizontal = "HUG"; col.layoutSizingVertical = "HUG"; sp.layoutSizingHorizontal = "FILL"; sp.layoutSizingVertical = "FIXED";
}
// 2 · Switch · label instances placed into GRID parents (pieces.js before its GRID fix): span the full row, first free row,
//     then drop trailing empty rows. (pieces.js now copies span + anchor itself.)
export async function gridSpan(pageIds) {
  const comp = await figma.getNodeByIdAsync("10775:1049");
  for (const pid of pageIds) { await (await figma.getNodeByIdAsync(pid)).loadAsync();
    for (const i of (await comp.getInstancesAsync())) { const g = i.parent; if (!g || g.layoutMode !== "GRID") continue;
      const used = new Set(); for (const c of g.children) if (c !== i) for (let r = c.gridRowAnchorIndex; r < c.gridRowAnchorIndex + (c.gridRowSpan || 1); r++) for (let k = c.gridColumnAnchorIndex; k < c.gridColumnAnchorIndex + (c.gridColumnSpan || 1); k++) used.add(r + ":" + k);
      let row = 0; while ([...Array(g.gridColumnCount).keys()].some((k) => used.has(row + ":" + k))) row++;
      if (row >= g.gridRowCount) g.gridRowCount = row + 1; i.gridColumnSpan = 1; i.setGridChildPosition(row, 0); i.gridColumnSpan = g.gridColumnCount; i.layoutSizingHorizontal = "FILL";
      const rows = new Set(); for (const c of g.children) for (let r = c.gridRowAnchorIndex; r < c.gridRowAnchorIndex + (c.gridRowSpan || 1); r++) rows.add(r);
      const max = Math.max(...rows); if (rows.size === max + 1 && g.gridRowCount > max + 1) g.gridRowCount = max + 1; } }
}
// 3 · Band cards after band-axis.js: the card was HUG (its old children were FIXED 974) → FILL; meter wrapper HUG height.
export async function bandCards() {
  const pg = await figma.getNodeByIdAsync("10480:303"); await figma.setCurrentPageAsync(pg);
  for (const b of pg.findAll((n) => n.type === "FRAME" && n.name === "Band" && n.children.some((k) => k.name === "Axis"))) {
    b.parent.layoutSizingHorizontal = "FILL"; const m = b.children[0]; m.layoutSizingVertical = "HUG"; if (m.children[0] && m.children[0].name === "Meter") m.children[0].layoutSizingHorizontal = "FILL"; }
}
// 4 · Restack: columns whose gap ≠ 240 after the passes (S01a +8, S01f +4, S02a +8, S02e +4, R05b +4, R06a +16, C06b/c +4) → 240;
//     section bottom padding 80 (R06 → 5182). Pages 6245:43756, 10480:302, 10480:304.
export async function restack(pageIds) {
  for (const pid of pageIds) { const p = await figma.getNodeByIdAsync(pid); await p.loadAsync();
    for (const s of p.children.filter((c) => c.type === "SECTION")) { const bl = s.children.filter((c) => c.type === "FRAME" && /^Block · /.test(c.name)); const cols = {};
      for (const b of bl) (cols[Math.round(b.x)] = cols[Math.round(b.x)] || []).push(b);
      for (const arr of Object.values(cols)) { arr.sort((a, b) => a.y - b.y); for (let i = 1; i < arr.length; i++) { const want = arr[i - 1].y + arr[i - 1].height + 240; if (Math.abs(arr[i].y - want) > 0.5) arr[i].y = want; } }
      const bottom = Math.max(0, ...s.children.filter((c) => c.type !== "CONNECTOR").map((c) => c.y + c.height)); if (bl.length && s.height < bottom + 80) s.resizeWithoutConstraints(s.width, bottom + 80); } }
}
// 5 · R05b: an empty 20×28 absolute frame over the search (leftover clear-button hit box; the library search shows its own
//     clear button) was deleted (10215:6850; record in its parent's shared plugin data ekqa/deleted-20261016).
