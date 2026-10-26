// Cross-file component port, step 1 (read-only in the source file): dump local components / sets to compact JSON.
// Run in the SOURCE file (GEAP 2.0) via use_figma with ARGS = { ids: ["<node id>", …], key: "<store key>" }.
// Stores the dump in figma.root shared plugin data „mdport”/<key> and returns its length; read it back in ≤ 18 KB chunks
// with port-read.js. Variables: remote → "k:<key>", local → "l:<collection>/<name>". Text styles: "s:<name>" (local) or "sk:<key>".
async (ARGS) => {
  const VC = {}; const varRef = async (id) => {
    if (VC[id] !== undefined) return VC[id];
    const v = await figma.variables.getVariableByIdAsync(id); if (!v) return (VC[id] = null);
    if (v.remote) return (VC[id] = "k:" + v.key);
    const col = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
    return (VC[id] = "l:" + col.name + "/" + v.name);
  };
  const SC = {}; const styleRef = async (id) => {
    if (!id || typeof id !== "string") return null; if (SC[id] !== undefined) return SC[id];
    const s = await figma.getStyleByIdAsync(id); if (!s) return (SC[id] = null);
    return (SC[id] = s.remote ? "sk:" + s.key : "s:" + s.name);
  };
  const paints = async (arr) => {
    if (!arr || arr === figma.mixed) return undefined;
    const out = [];
    for (const p of arr) { const q = JSON.parse(JSON.stringify(p)); if (p.boundVariables && p.boundVariables.color) q.bv = await varRef(p.boundVariables.color.id); delete q.boundVariables; out.push(q); }
    return out;
  };
  const BVF = ["itemSpacing", "counterAxisSpacing", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius", "strokeWeight", "strokeTopWeight", "strokeRightWeight", "strokeBottomWeight", "strokeLeftWeight", "width", "height", "minWidth", "maxWidth", "opacity"];
  const path = (root, n) => { const p = []; while (n && n !== root) { p.unshift(n.parent.children.indexOf(n)); n = n.parent; } return p; };
  async function dump(n, inInst) {
    const d = { t: n.type, n: n.name, id: n.id, w: n.width, h: n.height, x: n.x, y: n.y };
    if (n.visible === false) d.v = 0;
    if ("opacity" in n && n.opacity !== 1) d.o = n.opacity;
    if ("layoutPositioning" in n && n.layoutPositioning === "ABSOLUTE") d.abs = 1;
    if ("layoutSizingHorizontal" in n && n.parent && n.parent.layoutMode && n.parent.layoutMode !== "NONE") { d.sh = n.layoutSizingHorizontal; d.sv = n.layoutSizingVertical; }
    if ("constraints" in n) d.cons = n.constraints;
    if ("layoutMode" in n && n.type !== "INSTANCE") {
      d.lm = n.layoutMode;
      if (n.layoutMode !== "NONE") Object.assign(d, { wr: n.layoutWrap, g: n.itemSpacing, cg: n.counterAxisSpacing, p: [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft], pa: n.primaryAxisAlignItems, ca: n.counterAxisAlignItems, ps: n.primaryAxisSizingMode, cs: n.counterAxisSizingMode, sil: n.strokesIncludedInLayout, rev: n.itemReverseZIndex });
      if (n.minWidth) d.minW = n.minWidth; if (n.maxWidth) d.maxW = n.maxWidth; if (n.minHeight) d.minH = n.minHeight;
      d.clip = n.clipsContent;
    }
    if (n.type !== "INSTANCE") {
      if ("fills" in n) d.f = await paints(n.fills);
      if ("strokes" in n) { d.s = await paints(n.strokes); if (d.s && d.s.length) { d.sa = n.strokeAlign; d.sw = n.strokeWeight === figma.mixed ? [n.strokeTopWeight, n.strokeRightWeight, n.strokeBottomWeight, n.strokeLeftWeight] : n.strokeWeight; if (n.dashPattern && n.dashPattern.length) d.dash = n.dashPattern; } }
      if ("topLeftRadius" in n) d.r = [n.topLeftRadius, n.topRightRadius, n.bottomRightRadius, n.bottomLeftRadius];
      if ("effects" in n && n.effects.length) d.e = n.effects;
      if (n.effectStyleId) d.es = await styleRef(n.effectStyleId);
      const bv = {}; for (const k of BVF) { const b = n.boundVariables && n.boundVariables[k]; if (b && b.id) bv[k] = await varRef(b.id); }
      if (Object.keys(bv).length) d.bv = bv;
    }
    if (n.componentPropertyReferences && Object.keys(n.componentPropertyReferences).length) d.cr = n.componentPropertyReferences;
    if (n.type === "TEXT") {
      d.c = n.characters; d.ts = await styleRef(n.textStyleId); d.ta = n.textAlignHorizontal; d.tav = n.textAlignVertical; d.tar = n.textAutoResize;
      if (n.textTruncation === "ENDING") { d.tt = 1; d.ml = n.maxLines; }
      if (!d.ts) { d.fn = n.fontName; d.fs = n.fontSize; d.lh = n.lineHeight; d.ls = n.letterSpacing; d.tc = n.textCase; }
      if (n.fontName === figma.mixed || n.textStyleId === figma.mixed) d.segs = await Promise.all(n.getStyledTextSegments(["fontName", "fontSize", "textStyleId", "fills", "textDecoration"]).map(async s => ({ a: s.start, b: s.end, ts: await styleRef(s.textStyleId), fn: s.fontName, fs: s.fontSize, f: await paints(s.fills), td: s.textDecoration })));
      if (n.textDecoration && n.textDecoration !== figma.mixed && n.textDecoration !== "NONE") d.td = n.textDecoration;
      if (n.paragraphSpacing) d.psp = n.paragraphSpacing;
    }
    if (n.type === "VECTOR") { d.vn = n.vectorNetwork; d.vp = n.vectorPaths; }
    if (n.type === "INSTANCE") {
      const m = await n.getMainComponentAsync();
      d.main = m.remote ? "k:" + m.key : m.id; d.mainSet = m.parent && m.parent.type === "COMPONENT_SET" ? (m.remote ? "k:" + m.parent.key : m.parent.id) : null;
      d.props = {}; for (const [k, v] of Object.entries(n.componentProperties)) d.props[k.split("#")[0]] = [v.type, v.value];
      if (n.isExposedInstance) d.exp = 1;
      // overrides beyond component properties: characters / fills / visible / strokes per sub-node path
      d.ov = [];
      for (const o of n.overrides || []) {
        const sub = await figma.getNodeByIdAsync(o.id); if (!sub || sub === n) { if (sub === n) { const own = {}; if (o.overriddenFields.includes("fills")) own.f = await paints(n.fills); if (o.overriddenFields.includes("strokes")) own.s = await paints(n.strokes); if (Object.keys(own).length) d.ov.push({ p: [], ...own }); } continue; }
        const rec = { p: path(n, sub) }; const F = o.overriddenFields;
        if (F.includes("characters") && sub.type === "TEXT") rec.c = sub.characters;
        if (F.includes("fills")) rec.f = await paints(sub.fills);
        if (F.includes("strokes")) rec.s = await paints(sub.strokes);
        if (F.includes("visible")) rec.v = sub.visible;
        if (F.includes("textStyleId") && sub.type === "TEXT") rec.ts = await styleRef(sub.textStyleId);
        if (Object.keys(rec).length > 1) d.ov.push(rec);
      }
      if (!d.ov.length) delete d.ov;
      // slot content inside the instance
      const slots = n.findAll(x => x.type === "SLOT");
      if (slots.length) d.slots = await Promise.all(slots.map(async s => ({ p: path(n, s), k: await Promise.all(s.children.map(c => dump(c, true))) })));
      return d;
    }
    if (n.type === "COMPONENT_SET" || (n.type === "COMPONENT" && (!n.parent || n.parent.type !== "COMPONENT_SET"))) {
      d.defs = {}; for (const [k, v] of Object.entries(n.componentPropertyDefinitions)) d.defs[k] = { type: v.type, def: v.defaultValue, opts: v.variantOptions, pref: v.preferredValues };
      d.desc = n.description;
    }
    if ("children" in n) d.k = await Promise.all(n.children.map(c => dump(c, inInst)));
    return d;
  }
  const out = []; for (const id of ARGS.ids) out.push(await dump(await figma.getNodeByIdAsync(id), false));
  const s = JSON.stringify(out); const N = Math.ceil(s.length / 90000);
  for (let i = 0; i < N; i++) figma.root.setSharedPluginData("mdport", ARGS.key + "." + i, s.slice(i * 90000, (i + 1) * 90000));
  figma.root.setSharedPluginData("mdport", ARGS.key + ".n", String(N));
  return { key: ARGS.key, len: s.length, parts: N };
}
