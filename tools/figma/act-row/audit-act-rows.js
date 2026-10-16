// AUDIT(PAGE, EXTRA) — figma-audit.js rules scoped to the act-row job + extras: line-start meta dots that stay visible
// (orphan dot), IMAGE fills, non-auto-layout frames, wrapped titles inside every „Act row” instance / variant on PAGE.
// Roots = EXTRA ids + the parents of „Act row · …” / „New request card” instances. READ-ONLY.
// Use: paste, then `return await AUDIT("<page id>", ["<holder id>"]);`
const AUDIT = async (PAGE, EXTRA) => {
// act-row job: roots = given ids + the lists / bodies holding Act row / New request card instances on PAGE
await figma.setCurrentPageAsync(await figma.getNodeByIdAsync(PAGE));
const __ids = new Set(EXTRA);
for (const n of figma.currentPage.findAll(n => n.type === "INSTANCE" && /^(Act row · |New request card)/.test(n.name))) { const p = n.parent; __ids.add(/New request/.test(n.name) ? p.id : p.id); }
const ROOTS = [...__ids];
const SPACING = [0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 120, 160, 200, 240]; // 1 removed 2026-10-15: 1 px padding = border artifact
const TOKENS = [2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80, 96, 120]; // Foundations › 3. Sizes spacings/*
const RADIUS = [0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 999, 9999];
const onScale = (v, s) => s.some((x) => Math.abs(v - x) < 0.6);
const CONTROL = /^(Button\b|Button - |Text Input|Input\b|Select\b|Checkbox|Tag$|Chip\b|Tab$|Badge\b)/;
const MENU_RX = /(\bmenu\b|dropdown|drop-down|popover|listbox|list ?box|\boptions\b|select list|combobox|picker|flyout|suggestions?\b|autocomplete|contextual-menu|selection-menu)/i;
const MENU_EXCL = /(menu[ -]?item|\bitems?\b|· action|button|btn|trigger|anchor|show menu|\bicon|chevron|caret|label|wrap\b|wrapper|\btabs?\b|sidebar|navigation|\bnav\b|header|\boption\b|· (profile|role|more)( \/|$)|kbd|badge|separator|divider|title|tooltip|toast|modal|drawer|scrim|overlay|backdrop|\bscreen|\bblock\b|\bnote\b|stage|flow|connector|arrow|marker|search|input|cell|container|collapsed|expanded)/i;
const styleNames = {};
const effectStyleName = async (id) => { if (!id || typeof id !== "string") return ""; if (!(id in styleNames)) { const st = await figma.getStyleByIdAsync(id); styleNames[id] = st ? st.name : ""; } return styleNames[id]; };
const findings = [];
const counts = {};
const add = (rule, n, detail) => { counts[rule] = (counts[rule] || 0) + 1; if (findings.length < 60) findings.push({ rule, id: n.id, name: n.name.slice(0, 50), detail }); };
const insideInstance = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const paintBound = (n, key) => {
  const paints = n[key];
  if (!Array.isArray(paints)) return true;
  const styleId = key === "fills" ? n.fillStyleId : n.strokeStyleId;
  if (styleId && typeof styleId === "string" && styleId.length) return true;
  return paints.every((p) => p.type !== "SOLID" || p.visible === false || (p.boundVariables && p.boundVariables.color));
};
for (const rid of ROOTS) {
  const root = await figma.getNodeByIdAsync(rid);
  if (!root) { findings.push({ rule: "missing-root", id: rid }); continue; }
  const nodes = root.findAll ? [root, ...root.findAll(() => true)] : [root];
  for (const n of nodes) {
    const inInst = insideInstance(n);
    if (n.type === "FRAME" && !inInst) {
      if (CONTROL.test(n.name)) add("raw-control", n, "frame named like a control — use the library instance");
      if (n.layoutMode && n.layoutMode !== "NONE") {
        for (const k of ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "itemSpacing"]) {
          if (k === "itemSpacing" && n.primaryAxisAlignItems === "SPACE_BETWEEN") continue;
          const v = n[k]; if (typeof v === "number" && v && !onScale(v, SPACING) && !(n.boundVariables && n.boundVariables[k])) add("spacing-off-scale", n, `${k} ${v}`);
          if (typeof v === "number" && v && TOKENS.includes(v) && !(n.boundVariables && n.boundVariables[k])) add("spacing-unbound", n, `${k} ${v}`);
        }
        const ins = Array.isArray(n.strokes) && n.strokes.some((s) => s.visible !== false) && n.strokeAlign === "INSIDE" && n.strokesIncludedInLayout;
        if (ins) for (const [k, w] of [["paddingTop", "strokeTopWeight"], ["paddingRight", "strokeRightWeight"], ["paddingBottom", "strokeBottomWeight"], ["paddingLeft", "strokeLeftWeight"]]) {
          const v = n[k], sw = n[w] || 0; if (sw > 0 && v >= sw && !onScale(v, SPACING) && onScale(v - sw, SPACING)) add("border-padding", n, `${k} ${v} = ${v - sw} + ${sw}px stroke`);
        }
      } else if ("children" in n && n.children.length > 1 && n.parent && n.parent.type !== "SECTION" && n.parent.type !== "PAGE" && !/^(Overlay|Block|Screen)/.test(n.name)) {
        add("not-auto-layout", n, `${n.children.length} children positioned absolutely`);
        const kids = n.children.filter((k) => k.visible !== false);
        for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
          const a = kids[i], b = kids[j];
          const ox = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x), oy = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
          if (ox > 2 && oy > 2 && !/scrim|overlay/i.test(a.name + b.name)) add("sibling-overlap", a, `overlaps ${b.name.slice(0, 30)} (${b.id})`);
        }
      }
      if (n.clipsContent && "children" in n) for (const k of n.children) {
        if (k.visible === false || k.layoutPositioning === "ABSOLUTE") continue;
        if (k.x < -1 || k.y < -1 || k.x + k.width > n.width + 1 || k.y + k.height > n.height + 1) add("clipped-content", k, `cut by ${n.name.slice(0, 30)} (${n.id})`);
      }
      const r = n.cornerRadius; if (typeof r === "number" && r && !onScale(r, RADIUS) && !(n.boundVariables && n.boundVariables.topLeftRadius)) add("radius-off-scale", n, `radius ${r}`);
    }
    if (!inInst && "fills" in n && n.type !== "INSTANCE" && n.type !== "SECTION") {
      if (!paintBound(n, "fills")) add("unbound-colour", n, "fill");
      if ("strokes" in n && n.strokes.length && !paintBound(n, "strokes")) add("unbound-colour", n, "stroke");
    }
    if ((n.type === "FRAME" || n.type === "COMPONENT" || n.type === "INSTANCE") && MENU_RX.test(n.name) && !MENU_EXCL.test(n.name.replace(MENU_RX, "")) &&
        n.width <= 1100 && n.width >= 80 && n.height <= 1200 && "children" in n && n.children.some((k) => k.visible !== false)) {
      const white = Array.isArray(n.fills) && n.fills.some((p) => p.visible !== false && p.type === "SOLID" && p.color.r > 0.96 && p.color.g > 0.96 && p.color.b > 0.96);
      const shadowed = !!n.effectStyleId || n.effects.some((e) => e.visible !== false);
      if ((n.type === "INSTANCE" && shadowed) || (n.type !== "INSTANCE" && white && (shadowed || n.layoutPositioning === "ABSOLUTE" || n.type === "COMPONENT"))) {
        const miss = [];
        if ((await effectStyleName(n.effectStyleId)) !== "dropdown-effect") miss.push(n.effectStyleId ? `effect „${await effectStyleName(n.effectStyleId)}”` : n.effects.length ? "raw effects" : "no effect");
        if (!n.clipsContent) miss.push("clip off");
        if (!(n.boundVariables && n.boundVariables.topLeftRadius)) miss.push(`radius ${typeof n.cornerRadius === "number" ? n.cornerRadius : "mixed"} unbound`);
        if (Array.isArray(n.strokes) && n.strokes.some((p) => p.visible !== false)) miss.push("border stroke");
        if (miss.length) {
          let lib = false; if (n.type === "INSTANCE") { const m = await n.getMainComponentAsync(); lib = !!(m && m.remote && (await effectStyleName(m.effectStyleId)) !== "dropdown-effect"); }
          add("dropdown-effect", n, miss.join(", ") + (lib ? " (library main — report, don't detach)" : ""));
        }
      }
    }
    if (n.type === "TEXT" && !inInst) {
      if (!n.textStyleId && !(n.boundVariables && n.boundVariables.fontSize)) add("no-text-style", n, `"${n.characters.slice(0, 30)}"`);
      const fam = n.fontName === figma.mixed ? "mixed" : n.fontName.family;
      const codeCtx = (() => { for (let p = n.parent, i = 0; p && i < 4; p = p.parent, i++) if (/code|kw|token|Combinarea|Combining/i.test(p.name)) return true; return false; })();
      if (fam !== "Onest" && !(fam === "JetBrains Mono" && codeCtx)) add("font-not-onest", n, fam);
    }
    /* a field instance (select-input / text-input) with its own label switched off and a
       hand-built label / hint next to it — use the component's Label, Mandatory Star, Assistive Text */
    if (n.type === "INSTANCE" && n.componentProperties && n.componentProperties["👁️ Label#132:24"] && n.componentProperties["👁️ Label#132:24"].value === false && n.parent && "children" in n.parent) {
      const sib = n.parent.children, i = sib.indexOf(n);
      const prev = sib.slice(0, i).reverse().find((k) => k.type === "FRAME" && k.findOne && k.findOne((t) => t.type === "TEXT"));
      if (prev && /^(Label|Text)$/.test(prev.name)) add("field-label-outside", n, `hand-built label „${prev.findOne((t) => t.type === "TEXT").characters.slice(0, 30)}” (${prev.id})`);
    }
    if (n.type === "INSTANCE" && /btn|button/i.test(n.name + " " + ((n.mainComponent && n.mainComponent.parent && n.mainComponent.parent.name) || ""))) {
      const label = n.findOne((k) => k.type === "TEXT" && k.visible !== false);
      const icon = n.findOne((k) => k.type === "INSTANCE" && /^\d+\//.test(k.name) && k.visible !== false);
      const vec = icon && icon.findOne((k) => "fills" in k && Array.isArray(k.fills) && k.fills.length && k.fills[0].type === "SOLID");
      if (label && vec && Array.isArray(label.fills) && label.fills[0] && label.fills[0].type === "SOLID") {
        const a = label.fills[0].color, b = vec.fills[0].color;
        if (Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) > 0.05) add("icon-colour-override", n, "icon fill ≠ label fill");
      }
    }
  }
}

// extra (act-row job): orphan leading dots, image fills, raw frames inside rows
const __x = { rows: 0, leadingDotVisible: [], imageFills: [], notAutoLayout: [], titleWrapped: [] };
for (const n of figma.currentPage.findAll(n => (n.type === "INSTANCE" && /^Act row · /.test(n.name)) || (n.type === "COMPONENT" && n.parent && n.parent.name === "Act row"))) {
  __x.rows++;
  const meta = n.findOne(x => x.name === "Meta"); const mb = meta.absoluteBoundingBox;
  const first = meta.findOne(x => x.name === "Rows").children.find(p => p.visible);
  const dot = first.findOne(x => x.name === "Dot"); const db = dot.absoluteBoundingBox;
  if (db.x + db.width > mb.x + 0.5) __x.leadingDotVisible.push(n.id);
  // a part that starts a new line: its dot must be left of Meta too
  for (const p of meta.findOne(x => x.name === "Rows").children.filter(p => p.visible)) { const pb = p.absoluteBoundingBox; if (Math.abs(pb.x - mb.x) < 1 && p !== first) { const d2 = p.findOne(x => x.name === "Dot").absoluteBoundingBox; if (d2.x + d2.width > mb.x + 0.5) __x.leadingDotVisible.push(n.id + " line-start " + p.name); } }
  for (const x of [n, ...n.findAll(() => true)]) { if (x.fills && x.fills !== figma.mixed && x.fills.some(f => f.type === "IMAGE")) __x.imageFills.push(x.id); if ((x.type === "FRAME" || x.type === "COMPONENT") && x.children && x.children.length > 1 && x.layoutMode === "NONE") __x.notAutoLayout.push(x.id + " " + x.name); }
  const t = n.findOne(x => x.name === "Title"); if (t.height > 20.5) __x.titleWrapped.push(n.id);
}
return { roots: ROOTS.length, counts, findings, extra: __x };

};
