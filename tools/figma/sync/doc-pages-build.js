// Build the A4 document-preview pages as GEAP local components (2026-10-17, code 496e4de1 js/doc-preview.js).
// use_figma: replace the SPEC placeholder with doc-pages-spec-20261017.json (from doc-pages-spec.mjs). Real size 794 × 1123 (A4 at 96 dpi),
// padding 18mm/16mm = 68/60 (print units, declared off-scale), blocks with the CSS margins as paddings (flex column → no
// collapse), 2-column table 40 % / 60 % with collapsed 1 px borders, grey group rows, footer pinned to the bottom.
// Screens place instances rescaled to the canvas (632 / 794, as the code's zoom). Idempotent: replaces components by name.
const SPEC = __SPEC__;
const page = await figma.getNodeByIdAsync("10566:10080"); await figma.setCurrentPageAsync(page);
const V = async (k) => figma.variables.importVariableByKeyAsync(k);
const C = { txt: await V("c37576ba1791b00ac80a9a55579913b69d0b8b8f"), txt2: await V("5d1a031c4c310a753a2c49f91c89db7ddb8a2287"), txt3: await V("9d5ad1d87c1c1e2a9f94a242896a7882a20eda3f"),
  border: await V("9fa253aab4b44e39a049a0cbbd163e4c61e129b6"), bg2: await V("2099ba93803f67f67cdcf9153fc08965f5e32f65"), bg: await V("ec2921da40a6853a80b0d299be5bc8b1a11fcc89") };
const TS = { body: await figma.importStyleByKeyAsync("1f35541006807f80d766d8eb6ef5ae95d4f5cf6e"), bold: await figma.importStyleByKeyAsync("057521fde838188af42abf69eb3789f676421047"),
  h: await figma.importStyleByKeyAsync("75e7dfdca13a793cb25b8e6cb5949ad59c850c85"), cap: await figma.importStyleByKeyAsync("8d8e3878d547d107cf6de81a24255f71485db63f") };
for (const s of Object.values(TS)) await figma.loadFontAsync(s.fontName);
const paint = (v) => figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", v);
const frame = (name, dir = "VERTICAL") => { const f = figma.createFrame(); f.name = name; f.layoutMode = dir; f.fills = []; f.itemSpacing = 0; f.clipsContent = false; return f; };
const text = async (s, style, col, name) => { const t = figma.createText(); await t.setTextStyleIdAsync(style.id); t.characters = s; t.fills = [paint(col)]; t.name = name || s.slice(0, 40); return t; };
const fill = (n) => { n.layoutSizingHorizontal = "FILL"; };
const stroke = (n, sides) => { n.strokes = [paint(C.border)]; n.strokeAlign = "INSIDE"; n.strokeTopWeight = sides.t || 0; n.strokeRightWeight = sides.r || 0; n.strokeBottomWeight = sides.b || 0; n.strokeLeftWeight = sides.l || 0; n.strokesIncludedInLayout = true; };
let holder = page.children.find((n) => n.name === "Components · Document preview pages (A4)");
if (!holder) { holder = frame("Components · Document preview pages (A4)", "HORIZONTAL"); page.appendChild(holder); const maxX = Math.max(...page.children.filter((n) => n !== holder).map((n) => n.x + n.width)); holder.x = Math.round(maxX + 400); holder.y = 0; holder.itemSpacing = 80; holder.paddingTop = holder.paddingBottom = holder.paddingLeft = holder.paddingRight = 80; holder.fills = [paint(C.bg)]; holder.primaryAxisSizingMode = "AUTO"; holder.counterAxisSizingMode = "AUTO"; }
const out = {};
for (const [name, pg] of Object.entries(SPEC)) {
  const full = "Document page · " + name;
  const old = holder.children.find((n) => n.name === full);
  const comp = figma.createComponent(); comp.name = full; comp.layoutMode = "VERTICAL"; comp.resize(794, 1123);
  comp.primaryAxisSizingMode = "FIXED"; comp.counterAxisSizingMode = "FIXED"; comp.paddingTop = comp.paddingBottom = 68; comp.paddingLeft = comp.paddingRight = 60; comp.itemSpacing = 0;
  comp.fills = [paint(C.bg)]; comp.clipsContent = true;
  comp.description = "A4 page of the shared document preview (js/doc-preview.js, components.md › Document preview). Real size; screens place it rescaled to the canvas width. Padding 18mm / 16mm = 68 / 60 (print units). Group rows 600 in code → Desktop/Body/Small 500 (no 14 semibold style); title 18/24 in code → H5 18/26.";
  const content = frame("Content"); comp.appendChild(content); fill(content); content.layoutGrow = 1;
  for (const b of pg.blocks) {
    if (b.k === "footer") continue;
    if (b.k === "table") {
      const wrap = frame("Block · table"); content.appendChild(wrap); fill(wrap); wrap.paddingTop = 12; wrap.paddingBottom = 12;
      const tb = frame("Table"); wrap.appendChild(tb); fill(tb); stroke(tb, { t: 1, l: 1 });
      for (const r of b.rows) {
        const row = frame(r.g ? "Group · " + r.g : "Row · " + r.l.slice(0, 30), "HORIZONTAL"); tb.appendChild(row); fill(row);
        const cell = (w) => { const c = frame("Cell"); row.appendChild(c); c.paddingTop = c.paddingBottom = 6; c.paddingLeft = c.paddingRight = 8; stroke(c, { r: 1, b: 1 }); if (w) { c.resize(w, 33); c.layoutSizingHorizontal = "FIXED"; } else c.layoutGrow = 1; c.layoutSizingVertical = "FILL"; return c; };
        if (r.g) { const c = cell(0); c.fills = [paint(C.bg2)]; const t = await text(r.g, TS.bold, C.txt); c.appendChild(t); fill(t); t.textAutoResize = "HEIGHT"; }
        else { const a = cell(Math.round(674 * 0.4) - 1); const t1 = await text(r.l, TS.body, C.txt2, "Label"); a.appendChild(t1); fill(t1); t1.textAutoResize = "HEIGHT";
          const v = cell(0); const t2 = await text(r.v, TS.body, C.txt, "Value"); v.appendChild(t2); fill(t2); t2.textAutoResize = "HEIGHT"; }
        row.layoutSizingVertical = "HUG"; row.counterAxisAlignItems = "MIN";
      }
      continue;
    }
    const blk = frame("Block · " + b.k); content.appendChild(blk); fill(blk);
    const st = b.k === "h1" ? TS.h : b.k === "cont" ? TS.cap : TS.body;
    const t = await text(b.t, st, b.k === "cont" ? C.txt3 : C.txt); blk.appendChild(t); fill(t); t.textAutoResize = "HEIGHT";
    if (b.k === "h1") { blk.paddingTop = 16; blk.paddingBottom = 8; t.textAlignHorizontal = "CENTER"; }
    else if (b.k === "cont") { blk.paddingBottom = 8; stroke(blk, { b: 1 }); blk.setSharedPluginData("geap", "cont", "1"); }
    else if (b.k === "tail") { blk.paddingBottom = 8; }
    else blk.paddingBottom = 8;
  }
  // the continuation line's own margin-bottom 8 adds to the next block's top
  const ci = content.children.findIndex((n) => n.getSharedPluginData("geap", "cont") === "1"); if (ci > -1 && content.children[ci + 1]) content.children[ci + 1].paddingTop += 8;
  // tail block padding-bottom 16 after the last tail paragraph
  const tails = content.children.filter((n) => n.name === "Block · tail"); if (tails.length) tails[tails.length - 1].paddingBottom = 24;
  const f = pg.blocks.find((b) => b.k === "footer");
  const foot = frame("Footer"); comp.appendChild(foot); fill(foot); foot.paddingTop = 8; stroke(foot, { t: 1 });
  const ft = await text(f.t, TS.cap, C.txt3, "Footer text"); foot.appendChild(ft); fill(ft); ft.textAutoResize = "HEIGHT"; ft.textAlignHorizontal = "CENTER";
  // bound paints carry the resolved colour (a placeholder colour shows in screenshots / thumbnails)
  for (const n of [comp, ...comp.findAll(() => true)]) for (const key of ["fills", "strokes"]) {
    const ps = n[key]; if (!Array.isArray(ps) || !ps.length) continue;
    const np = []; for (const q of ps) { const b = q.boundVariables && q.boundVariables.color; if (!b) { np.push(q); continue; } const v = await figma.variables.getVariableByIdAsync(b.id); const val = v.resolveForConsumer(n).value; np.push(figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: val.r, g: val.g, b: val.b } }, "color", v)); }
    n[key] = np;
  }
  if (old) { const idx = holder.children.indexOf(old); holder.insertChild(idx, comp); for (const i of await old.getInstancesAsync()) i.swapComponent(comp); old.remove(); } else holder.appendChild(comp);
  out[name] = comp.id + " h" + Math.round(content.height);
}
return out;
