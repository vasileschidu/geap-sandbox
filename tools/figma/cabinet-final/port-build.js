// Cross-file component port, step 2 (in the TARGET file): rebuild dumped components (port-dump.js format).
// Stored in figma.root shared plugin data „mdport”/„build”. Run: await (eval("(" + src + ")"))({ dump: [...], parent: "<section id>", x, y })
// Needs „mdocs”/„local” {vars: name→id, ts: name→id} for "m:" variables and "s:MDocs / …" styles. Remote refs import by key.
// Keeps a GEAP-id → new-id map in „mdport”/„map” so later dumps (modules, templates) resolve instances of earlier components.
async (ARGS) => {
  const LOC = JSON.parse(figma.root.getSharedPluginData("mdocs", "local"));
  const MAP = JSON.parse(figma.root.getSharedPluginData("mdport", "map") || "{}");
  const VC = {}; const V = async (ref) => {
    if (!ref) return null; if (VC[ref]) return VC[ref];
    let v = null;
    if (ref.startsWith("k:")) v = await figma.variables.importVariableByKeyAsync(ref.slice(2));
    else if (ref.startsWith("m:")) v = await figma.variables.getVariableByIdAsync(LOC.vars[ref.slice(2)]);
    else if (ref.startsWith("VariableID:")) { const n = { "13148:509644": "color/accent/1", "13148:509645": "color/accent/2", "13148:509646": "color/accent/3", "13148:509647": "color/accent/4" }[ref.slice(11)]; if (n) v = await figma.variables.getVariableByIdAsync(LOC.vars[n]); }
    if (!v) throw new Error("var " + ref);
    return (VC[ref] = v);
  };
  const SC = {}; const S = async (ref) => {
    if (!ref) return null; if (SC[ref]) return SC[ref];
    let id = null;
    if (ref.startsWith("s:MDocs / ")) id = LOC.ts[ref.slice(10)];
    else if (ref.startsWith("sk:")) id = (await figma.importStyleByKeyAsync(ref.slice(3))).id;
    else if (ref.startsWith("s:")) { const st = (await figma.getLocalTextStylesAsync()).find(x => x.name === ref.slice(2)); id = st && st.id; }
    if (!id) throw new Error("style " + ref);
    return (SC[ref] = id);
  };
  const CC = {}; const MAIN = async (ref) => {
    if (CC[ref]) return CC[ref];
    let m = ref.startsWith("k:") ? await figma.importComponentByKeyAsync(ref.slice(2)) : await figma.getNodeByIdAsync(MAP[ref]);
    if (!m) throw new Error("main " + ref);
    return (CC[ref] = m);
  };
  const paints = async (arr) => {
    if (!arr) return [];
    const out = [];
    for (const p of arr) {
      const q = JSON.parse(JSON.stringify(p)); const bv = q.bv; delete q.bv;
      if (q.type === "SOLID") { if (!q.color) q.color = { r: 0, g: 0, b: 0 }; out.push(bv ? figma.variables.setBoundVariableForPaint(q, "color", await V(bv)) : q); }
      else if (q.gradientStops) { const stops = []; for (const s of q.gradientStops) { const bvid = s.bvid; delete s.bvid; const st = { ...s }; if (bvid) st.boundVariables = { color: figma.variables.createVariableAlias(await V(bvid)) }; stops.push(st); } q.gradientStops = stops; out.push(q); }
      else out.push(q);
    }
    return out;
  };
  for (const st of ["Regular", "Medium", "SemiBold"]) await figma.loadFontAsync({ family: "Onest", style: st });
  const refsToBind = []; // [node, cr]
  const sizing = []; // deferred sizing
  async function make(d, parent, isVariant) {
    let n;
    if (d.t === "COMPONENT") n = figma.createComponent();
    else if (d.t === "FRAME" || d.t === "COMPONENT_SET") n = figma.createFrame();
    else if (d.t === "TEXT") n = figma.createText();
    else if (d.t === "RECTANGLE") n = figma.createRectangle();
    else if (d.t === "ELLIPSE") n = figma.createEllipse();
    else if (d.t === "VECTOR") n = figma.createVector();
    else if (d.t === "LINE") n = figma.createLine();
    else if (d.t === "SLOT") { n = parent.createSlot(); }
    else if (d.t === "INSTANCE") { n = (await MAIN(d.main)).createInstance(); }
    else throw new Error("type " + d.t);
    n.name = d.n;
    if (d.t !== "SLOT" && parent && d.t !== "COMPONENT_SET") parent.appendChild(n);
    if (d.t === "TEXT") {
      if (d.ts) await n.setTextStyleIdAsync(await S(d.ts)); else { await figma.loadFontAsync(d.fn); n.fontName = d.fn; n.fontSize = d.fs; if (d.lh) n.lineHeight = d.lh; if (d.ls) n.letterSpacing = d.ls; if (d.tc) n.textCase = d.tc; }
      n.characters = d.c || " ";
      if (d.segs) for (const s of d.segs) { if (s.ts) await n.setRangeTextStyleIdAsync(s.a, s.b, await S(s.ts)); else if (s.fn) { await figma.loadFontAsync(s.fn); n.setRangeFontName(s.a, s.b, s.fn); n.setRangeFontSize(s.a, s.b, s.fs); } if (s.f) n.setRangeFills(s.a, s.b, await paints(s.f)); if (s.td && s.td !== "NONE") n.setRangeTextDecoration(s.a, s.b, s.td); }
      if (d.f) n.fills = await paints(d.f);
      if (d.ta) n.textAlignHorizontal = d.ta; if (d.tav) n.textAlignVertical = d.tav;
      if (d.td) n.textDecoration = d.td; if (d.psp) n.paragraphSpacing = d.psp;
      if (d.tt) { n.textTruncation = "ENDING"; if (d.ml) n.maxLines = d.ml; }
    }
    if (d.t === "VECTOR" && d.vp) n.vectorPaths = d.vp;
    if (d.t !== "INSTANCE" && d.t !== "TEXT") {
      if ("fills" in n) n.fills = await paints(d.f);
      if (d.s && d.s.length) { n.strokes = await paints(d.s); n.strokeAlign = d.sa || "INSIDE"; if (Array.isArray(d.sw)) { n.strokeTopWeight = d.sw[0]; n.strokeRightWeight = d.sw[1]; n.strokeBottomWeight = d.sw[2]; n.strokeLeftWeight = d.sw[3]; } else if (d.sw !== undefined) n.strokeWeight = d.sw; if (d.dash) n.dashPattern = d.dash; }
      if (d.r && "topLeftRadius" in n) { n.topLeftRadius = d.r[0]; n.topRightRadius = d.r[1]; n.bottomRightRadius = d.r[2]; n.bottomLeftRadius = d.r[3]; }
      if (d.e) n.effects = d.e;
      if (d.lm && d.lm !== "NONE" && "layoutMode" in n) {
        n.layoutMode = d.lm; if (d.wr) n.layoutWrap = d.wr; n.itemSpacing = d.g || 0; if (d.wr === "WRAP") n.counterAxisSpacing = d.cg || 0;
        const p = d.p || [0, 0, 0, 0]; n.paddingTop = p[0]; n.paddingRight = p[1]; n.paddingBottom = p[2]; n.paddingLeft = p[3];
        n.primaryAxisAlignItems = d.pa || "MIN"; n.counterAxisAlignItems = d.ca || "MIN";
        if (d.sil) n.strokesIncludedInLayout = true; if (d.rev) n.itemReverseZIndex = true;
      }
      if ("clipsContent" in n) n.clipsContent = !!d.clip;
      if (d.bv) for (const [k, ref] of Object.entries(d.bv)) { if (k === "width" || k === "height") continue; try { n.setBoundVariable(k, await V(ref)); } catch (e) {} }
    }
    if (d.o !== undefined) n.opacity = d.o;
    if (d.t !== "TEXT" && d.t !== "SLOT" && d.w && d.h) { try { n.resize(d.w, d.h); } catch (e) {} }
    if (d.t === "TEXT" && d.w) { try { n.resize(d.w, n.height); } catch (e) {} }
    if (d.k && d.t !== "INSTANCE") for (const c of d.k) await make(c, n, d.t === "COMPONENT_SET");
    if (d.t === "INSTANCE") {
      const pr = {}; const defs = n.componentProperties;
      for (const [name, [type, val]] of Object.entries(d.props || {})) { if (type === "VARIANT") continue; const key = Object.keys(defs).find(k => k.split("#")[0] === name); if (key && type !== "INSTANCE_SWAP") pr[key] = val; }
      if (Object.keys(pr).length) try { n.setProperties(pr); } catch (e) {}
      for (const o of d.ov || []) { let t = n; for (const i of o.p) t = t && t.children ? t.children[i] : null; if (!t) continue; if (o.c !== undefined && t.type === "TEXT") { for (const s of t.getStyledTextSegments(["fontName"])) await figma.loadFontAsync(s.fontName); t.characters = o.c; } if (o.f) t.fills = await paints(o.f); if (o.s) t.strokes = await paints(o.s); if (o.v !== undefined) t.visible = o.v; if (o.ts && t.type === "TEXT") await t.setTextStyleIdAsync(await S(o.ts)); }
      if (d.exp) refsToBind.push([n, null, "exp"]);
      if (d.slots) for (const sl of d.slots) { let t = n; for (const i of sl.p) t = t.children[i]; for (const c of [...t.children]) c.remove(); for (const c of sl.k) await make(c, t, false); }
    }
    sizing.push([n, d, parent]);
    if (d.v === 0) n.visible = false;
    if (d.cr) refsToBind.push([n, d.cr]);
    if (d.t === "COMPONENT" || d.t === "COMPONENT_SET") MAP[d.id] = n.id;
    return n;
  }
  const out = [];
  const host = ARGS.parent ? await figma.getNodeByIdAsync(ARGS.parent) : figma.currentPage;
  let x = ARGS.x || 0, y = ARGS.y || 0;
  for (const d of ARGS.dump) {
    let top;
    if (d.t === "COMPONENT_SET") {
      const vars = []; for (const c of d.k) vars.push(await make(c, host, true));
      top = figma.combineAsVariants(vars, host);
      top.name = d.n; MAP[d.id] = top.id;
      top.layoutMode = d.lm || "VERTICAL"; if (d.wr) top.layoutWrap = d.wr; top.itemSpacing = d.g || 24; if (d.wr === "WRAP") top.counterAxisSpacing = d.cg || 24;
      const p = d.p || [24, 24, 24, 24]; top.paddingTop = p[0]; top.paddingRight = p[1]; top.paddingBottom = p[2]; top.paddingLeft = p[3];
      top.primaryAxisSizingMode = "AUTO"; top.counterAxisSizingMode = "AUTO";
    } else top = await make(d, host, false);
    // component properties (non-variant), then references
    const owner = top;
    const keyOf = {};
    for (const [k, def] of Object.entries(d.defs || {})) {
      if (def.type === "VARIANT") continue;
      const nk = owner.addComponentProperty(k.split("#")[0], def.type, def.def);
      keyOf[k] = nk;
    }
    for (const [node, cr, kind] of refsToBind.splice(0)) {
      if (kind === "exp") { try { node.isExposedInstance = true; } catch (e) {} continue; }
      const m = {}; for (const [f, k] of Object.entries(cr)) { if (keyOf[k]) m[f] = keyOf[k]; }
      if (Object.keys(m).length) try { node.componentPropertyReferences = m; } catch (e) { out.push("ref " + node.name + ": " + String(e).slice(0, 60)); }
    }
    // sizing pass (after everything is in the tree)
    for (const [n, dd, parent] of sizing.splice(0)) {
      try {
        if (n.type === "TEXT") { if (dd.tar) n.textAutoResize = dd.tar; }
        const inAL = n.parent && "layoutMode" in n.parent && n.parent.layoutMode && n.parent.layoutMode !== "NONE";
        if (inAL && dd.abs) n.layoutPositioning = "ABSOLUTE";
        if (inAL && !dd.abs) { if (dd.sh) n.layoutSizingHorizontal = dd.sh; if (dd.sv) n.layoutSizingVertical = dd.sv; }
        else if (n.type !== "TEXT" && "primaryAxisSizingMode" in n && n.layoutMode && n.layoutMode !== "NONE") { if (dd.ps) n.primaryAxisSizingMode = dd.ps; if (dd.cs) n.counterAxisSizingMode = dd.cs; }
        if (dd.minW) n.minWidth = dd.minW; if (dd.maxW) n.maxWidth = dd.maxW; if (dd.minH) n.minHeight = dd.minH;
        if ((dd.abs || !inAL) && dd.x !== undefined && n !== top && n.parent && n.parent.type !== "COMPONENT_SET") { n.x = dd.x; n.y = dd.y; }
        if (dd.cons && "constraints" in n) n.constraints = dd.cons;
        if (dd.bv) for (const k of ["width", "height", "minWidth", "maxWidth"]) if (dd.bv[k]) try { n.setBoundVariable(k, await V(dd.bv[k])); } catch (e) {}
      } catch (e) { out.push("size " + n.name + ": " + String(e).slice(0, 60)); }
    }
    if (d.qr) { // regenerate the QR-like vector (25 × 25 modules, deterministic)
      const q = figma.createVector(); q.name = "Code"; top.appendChild(q); let path = ""; let seed = 3948; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280; const m = 68 / 25;
      const finder = (r, c) => [[0, 0], [0, 18], [18, 0]].some(([fr, fc]) => r >= fr && r < fr + 7 && c >= fc && c < fc + 7 && (r === fr || r === fr + 6 || c === fc || c === fc + 6 || (r >= fr + 2 && r <= fr + 4 && c >= fc + 2 && c <= fc + 4)));
      const inF = (r, c) => [[0, 0], [0, 18], [18, 0]].some(([fr, fc]) => r >= fr && r < fr + 8 && c >= fc && c < fc + 8);
      for (let r = 0; r < 25; r++) for (let c = 0; c < 25; c++) { const on = inF(r, c) ? finder(r, c) : rnd() > 0.5; if (on) { const x0 = +(c * m).toFixed(2), y0 = +(r * m).toFixed(2), x1 = +((c + 1) * m).toFixed(2), y1 = +((r + 1) * m).toFixed(2); path += `M ${x0} ${y0} L ${x1} ${y0} L ${x1} ${y1} L ${x0} ${y1} Z `; } }
      q.vectorPaths = [{ windingRule: "NONZERO", data: path.trim() }]; q.fills = await paints([{ type: "SOLID", bv: "m:color/ink" }]); q.constraints = { horizontal: "SCALE", vertical: "SCALE" }; q.x = 0; q.y = 0;
    }
    if (d.desc) top.description = d.desc;
    top.x = x; top.y = y; y += top.height + 80;
    out.push(d.n + " → " + top.id);
  }
  figma.root.setSharedPluginData("mdport", "map", JSON.stringify(MAP));
  return out;
}
