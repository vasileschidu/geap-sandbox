// LABELS (stored as barrows/labels) — board arrow label = blue pill + white text (user 2026-10-23).
// Connector built-in label: textBackground = background/brand/default (Foundations lk-e9e8, key 7104dc11…) or, when the stroke
// is bound to another blue variable (FOD Address: main-color/600), that same variable; text = text/base-inverse/default
// (c6263eb1…), Onest Medium 14/20 (= Desktop/Body/Small 500 values — the API cannot bind a text style to a connector label).
// Pill = corner radii 999 on textBackground (radius-full; cornerRadius / padding are not settable). Empty labels lose the background. Labelled connectors
// are brought to the front so other lines pass under the pills.
const LABELS = async (PAGE_ID, OPT = {}) => {
  const page = await figma.getNodeByIdAsync(PAGE_ID); await figma.setCurrentPageAsync(page);
  const bg = await figma.variables.importVariableByKeyAsync("7104dc11afe3b34f5529876133c95b3be65ee87e");
  const tx = await figma.variables.importVariableByKeyAsync("c6263eb190b34c3063061b7cfb0f8e516bdb4be5");
  const brandStroke = "VariableID:a0e96ec6ed3e49300298bc9a0b2c879a3b402a87/1296:125";
  await figma.loadFontAsync({ family: "Onest", style: "Medium" });
  const bgP = figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0, g: 0.345, b: 0.824 } }, "color", bg);
  const txP = figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 1, g: 1, b: 1 } }, "color", tx);
  const conns = page.findAllWithCriteria({ types: ["CONNECTOR"] });
  let done = 0, cleared = 0, already = 0; const odd = []; const front = [];
  for (const c of conns) {
    const t = c.text.characters;
    if (!t.trim()) { if (c.textBackground.fills.length) { c.textBackground.fills = []; cleared++; } continue; }
    const f = c.text.fontName; if (f !== figma.mixed) await figma.loadFontAsync(f);
    const sp = c.strokes[0]; const sv = sp && sp.boundVariables && sp.boundVariables.color ? sp.boundVariables.color.id : null;
    if (sv !== brandStroke) odd.push([c.id, sv || (sp ? JSON.stringify(sp.color) : "none")]);
    const curBg = c.textBackground.fills[0];
    if (curBg && curBg.boundVariables && curBg.boundVariables.color && curBg.boundVariables.color.id === bg.id) already++;
    c.text.fontName = { family: "Onest", style: "Medium" }; c.text.fontSize = 14; c.text.lineHeight = { unit: "PIXELS", value: 20 }; c.text.letterSpacing = { unit: "PIXELS", value: 0 };
    let ownBg = bgP; if (sv && sv !== brandStroke) { const ov = await figma.variables.getVariableByIdAsync(sv); if (ov) ownBg = figma.variables.setBoundVariableForPaint({ type: "SOLID", color: sp.color }, "color", ov); }
    c.text.fills = [txP]; c.textBackground.fills = [ownBg]; const tb = c.textBackground; tb.topLeftRadius = tb.topRightRadius = tb.bottomLeftRadius = tb.bottomRightRadius = 999; done++; front.push(c);
  }
  for (const c of front) { const par = c.parent; if (par && par.children[par.children.length - 1] !== c) par.appendChild(c); }
  return { connectors: conns.length, labels: done, wereBlue: already, clearedEmpty: cleared, nonBrandStroke: odd.slice(0, 20), nonBrandCount: odd.length };
};
