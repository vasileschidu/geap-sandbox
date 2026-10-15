// Instance fit pass for Document · card (v3) and Document · row — run after card-v3.js / row-v3.js and after any
// instance resize or text change. Params (prepend): const SET_IDS = ["11364:7441", "11362:7113"]; const DRY = false;
// The code's title is `flex: 1 1 64; max-width: max-content` + one-line ellipsis with the tags right after it.
// Figma: resize() on instance sublayers is IGNORED (width snaps back to the main's), only sizing modes override. So:
//  • fits → title (and card „Title box”) HUG: tags right after the title;
//  • overflows → Title box FILL + title FILL (ending ellipsis): the title takes the room left, the tags follow it; in the
//    WRAP row the mobile box keeps min 64 (main), so tags that don't fit beside 64 px wrap under it, like the code;
//  • meta texts wider than the instance Meta → FILL in their part + part FILL (ending ellipsis = the file-name ellipsis);
//  • root height HUG.
figma.skipInvisibleInstanceChildren = false;
const fonts = new Set(); const todo = [];
for (const id of SET_IDS) { const set = await figma.getNodeByIdAsync(id); for (const v of set.children) for (const i of await v.getInstancesAsync()) todo.push(i); }
for (const i of todo) for (const t of i.findAll((n) => n.type === "TEXT")) { const f = t.fontName; if (f !== figma.mixed) fonts.add(JSON.stringify(f)); }
for (const f of fonts) await figma.loadFontAsync(JSON.parse(f));
const res = { n: todo.length, hug: 0, titleFill: 0, titleHug: 0, metaFill: 0, errs: [] };
const hug = (t) => { t.textAutoResize = "WIDTH_AND_HEIGHT"; t.layoutSizingHorizontal = "HUG"; t.layoutSizingVertical = "HUG"; };
const fill = (t) => { t.layoutSizingHorizontal = "FILL"; t.textTruncation = "ENDING"; t.maxLines = 1; t.layoutSizingVertical = "HUG"; };
for (const i of todo) {
  try {
    if (i.removed) continue;
    if (i.layoutSizingVertical !== "HUG") { if (!DRY) i.layoutSizingVertical = "HUG"; res.hug++; }
    const tr = i.findOne((n) => n.name === "Title and tags" && n.type === "FRAME");
    if (tr) {
      const box = tr.children.find((n) => n.name === "Title box");
      const title = box ? box.children.find((n) => n.type === "TEXT") : tr.children.find((n) => n.type === "TEXT");
      if (!DRY) { if (box) box.layoutSizingHorizontal = "HUG"; hug(title); }
      const W = tr.width - tr.paddingLeft - tr.paddingRight;
      let need;
      if (box) need = title.width + 4 + tr.children.filter((n) => n.type === "INSTANCE" && n.visible).reduce((a, t) => a + 4 + t.width, 0);
      else { const tg = tr.children.find((n) => n.name === "Tags" && n.visible); need = title.width + (tg ? tr.itemSpacing + tg.width : 0); }
      if (need > W + 0.5) { if (!DRY) { if (box) box.layoutSizingHorizontal = "FILL"; fill(title); } res.titleFill++; } else res.titleHug++;
    }
    const meta = i.findOne((n) => n.name === "Meta" && n.type === "FRAME");
    if (meta) for (const p of meta.findAll((n) => /^Part · /.test(n.name) && n.visible)) {
      const t = p.children.find((n) => n.type === "TEXT"); if (!t) continue;
      if (!DRY) { p.layoutSizingHorizontal = "HUG"; hug(t); }
      if (p.width > meta.width + 0.5) { if (!DRY) { p.layoutSizingHorizontal = "FILL"; fill(t); } res.metaFill++; }
    }
  } catch (e) { res.errs.push(i.id + " " + String(e).slice(0, 80)); }
}
return res;
