// READ-ONLY QA for Document · card / Document · row instances (code 9804960e rules). Params: const SET_IDS = [...];
// Per instance: inside nearest clipping ancestor; title line content within its row (no overflow); tags after the title
// (gap 8 card: box pad 4 + gap 4 / row: 8); meta parts inside Meta; meta texts 12 / tertiary; root fill = main fill;
// title one line (height 20). Returns counts + up to 30 examples.
figma.skipInvisibleInstanceChildren = false;
const r = { n: 0, cut: 0, titleOverflow: 0, tagGap: 0, metaOverflow: 0, metaStyle: 0, fillOverride: 0, titleLines: 0, ex: [] };
const push = (s) => { if (r.ex.length < 30) r.ex.push(s); };
const hidden = (n) => { for (let p = n; p && p.type !== "PAGE"; p = p.parent) if (p.visible === false) return true; return false; };
for (const id of SET_IDS) {
  const set = await figma.getNodeByIdAsync(id);
  for (const v of set.children) for (const i of await v.getInstancesAsync()) {
    if (hidden(i)) continue; r.n++;
    const bb = i.absoluteBoundingBox;
    for (let p = i.parent; p && p.type !== "PAGE" && p.type !== "SECTION"; p = p.parent) if (p.clipsContent && "absoluteBoundingBox" in p) {
      const c = p.absoluteBoundingBox; const d = Math.max(c.x - bb.x, bb.x + bb.width - c.x - c.width, c.y - bb.y, bb.y + bb.height - c.y - c.height);
      if (d > 1.5) { r.cut++; push("cut " + i.id + " by " + p.name.slice(0, 20) + " " + Math.round(d)); } break; }
    const tr = i.findOne((n) => n.name === "Title and tags" && n.type === "FRAME");
    if (tr) { const right = tr.width - tr.paddingRight; const kids = tr.children.filter((k) => k.visible);
      for (const k of kids) if (k.x + k.width > right + 1) { r.titleOverflow++; push("titleOverflow " + i.id + " " + k.name + " " + Math.round(k.x + k.width - right)); }
      const box = kids.find((k) => k.name === "Title box"); const t1 = kids[1];
      if (box && t1 && Math.abs(t1.y - box.y) < 2) { const g = t1.x - (box.x + box.width) + box.paddingRight; if (Math.abs(g - 8) > 0.6) { r.tagGap++; push("tagGap " + i.id + " " + g); } }
      const title = box ? box.children[0] : kids.find((k) => k.type === "TEXT"); if (title && title.height > 21) { r.titleLines++; push("titleLines " + i.id + " " + title.height); } }
    const meta = i.findOne((n) => n.name === "Meta" && n.type === "FRAME");
    if (meta) for (const p of meta.findAll((n) => /^Part · /.test(n.name) && n.visible)) {
      if (p.x + p.width > meta.width + 1) { r.metaOverflow++; push("metaOverflow " + i.id + " " + p.name); }
      const t = p.children.find((n) => n.type === "TEXT"); if (t && (t.fontSize !== 12)) { r.metaStyle++; push("metaStyle " + i.id + " " + t.fontSize); } }
    const mf = JSON.stringify(i.mainComponent.fills.map((f) => f.boundVariables)), f = JSON.stringify(i.fills.map((f) => f.boundVariables));
    if (mf !== f) { r.fillOverride++; push("fill " + i.id); }
  }
}
return r;
