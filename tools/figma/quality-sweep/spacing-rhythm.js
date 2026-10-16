// Quality sweep · Ghișeu (2026-10-16) — off-scale spacing → the code's rhythm (measured with tools/figma/ghiseu/measure.mjs):
//  A  „Heading 2” section titles with padding 11 / 11 (FO summary / delivery / payment headings, 48 high in code):
//     padding-top / bottom 0, minHeight 48 (spacings/48), content centred → text stays at y 11, no 11 in the file
//  B  stack meta rows (.e-permits-stack__meta: text · 8 · 2px dot · 8 · text; the capture lost the ::before dot and kept a
//     gap 18): gap 8 (spacings/8) + a 2×2 „Dot” (radius full, fill = the meta text colour) between parts
//  C  status tag pairs in summary rows (code: two tags separated by a space = 4): gap 15 → 4 (spacings/4)
//  D  „Cont bancar ” + tag (code: inline text, space, tag): trailing space trimmed, gap 3 → 4 (spacings/4)
// Snapshot per node: shared plugin data qsweep/rhythm (old values). Run per block list.
const RHYTHM = async (BLOCKS) => {
  const SP = { 4: "983c5b4d9a4e5fa988f0154c9bf4290c7aec9635", 8: "69ac88e41c0fea695fc5c4fd33f0188d1172dc59", 48: "2a030f2d03121ff975816aa58b5b51e550b62df9" };
  const RFULL = "cd76e9200ec61264fe73c9484085ef475ac6c345";
  const V = {}; const v = async (k) => (V[k] = V[k] || (await figma.variables.importVariableByKeyAsync(k)));
  const bind = async (n, prop, val) => { n[prop] = val; n.setBoundVariable(prop, await v(SP[val])); };
  const snap = (n, o) => { if (!n.getSharedPluginData("qsweep", "rhythm")) n.setSharedPluginData("qsweep", "rhythm", JSON.stringify(o)); };
  const cnt = { A: 0, B: 0, C: 0, D: 0 };
  const isTag = (k) => k.type === "INSTANCE" && /^tag/i.test(k.name);
  for (const id of BLOCKS) {
    const b = await figma.getNodeByIdAsync(id);
    const frames = b.findAll((n) => n.type === "FRAME" && n.layoutMode && n.layoutMode !== "NONE");
    for (const n of frames) {
      if (n.name === "Heading 2" && n.paddingTop === 11 && n.paddingBottom === 11) {
        snap(n, { pt: 11, pb: 11, h: n.height, sv: n.layoutSizingVertical, pa: n.primaryAxisAlignItems });
        n.paddingTop = 0; n.paddingBottom = 0; n.layoutSizingVertical = "HUG"; n.minHeight = 48; n.setBoundVariable("minHeight", await v(SP[48]));
        if (n.layoutMode === "VERTICAL") n.primaryAxisAlignItems = "CENTER"; else n.counterAxisAlignItems = "CENTER";
        cnt.A++; continue;
      }
      if (n.layoutMode === "HORIZONTAL" && n.itemSpacing === 18 && !(n.boundVariables && n.boundVariables.itemSpacing)) {
        const parts = n.children.filter((k) => k.visible !== false);
        const t = n.findOne((k) => k.type === "TEXT"); if (!t) continue;
        snap(n, { gap: 18 });
        await bind(n, "itemSpacing", 8);
        for (let i = parts.length - 1; i > 0; i--) {
          const d = figma.createFrame(); d.name = "Dot"; d.resize(2, 2); d.fills = JSON.parse(JSON.stringify(t.fills));
          if (t.fills[0] && t.fills[0].boundVariables && t.fills[0].boundVariables.color) d.fills = [figma.variables.setBoundVariableForPaint(d.fills[0], "color", await figma.variables.getVariableByIdAsync(t.fills[0].boundVariables.color.id))];
          d.cornerRadius = 999; for (const c of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) d.setBoundVariable(c, await v(RFULL));
          n.insertChild(n.children.indexOf(parts[i]), d);
        }
        n.counterAxisAlignItems = "CENTER";
        if (n.parent && /:margin$/.test(n.parent.name) && n.parent.layoutMode) { n.layoutSizingHorizontal = "FILL"; }
        cnt.B++; continue;
      }
      if (n.layoutMode === "HORIZONTAL" && n.itemSpacing === 15 && n.children.filter(isTag).length >= 2) { snap(n, { gap: 15 }); await bind(n, "itemSpacing", 4); cnt.C++; continue; }
      if (n.layoutMode === "HORIZONTAL" && n.itemSpacing === 3 && n.children.some(isTag)) {
        const t = n.children.find((k) => k.type === "TEXT" && / $/.test(k.characters));
        snap(n, { gap: 3, text: t ? t.characters : null });
        if (t) { await figma.loadFontAsync(t.fontName); t.characters = t.characters.replace(/\s+$/, ""); }
        await bind(n, "itemSpacing", 4); cnt.D++;
      }
    }
  }
  return cnt;
};
