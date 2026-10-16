// eKYC BO QA audit (2026-10-16) — READ-ONLY. Paste as the `code` of use_figma (fileKey SqMGpRKEppJLcvn7HMzOPR) after
// setting OPT. One page per call (pages are heavy). Roots = every screen of every `Block · …` in the page's BO sections
// (a block's direct `Screen …` children, or the children of a `Screens · …` wrapper). Notes / labels / TOC are not audited.
// Extends tools/ui-qa/figma-audit.js with: image-fill, raw-vector (glyph-sized vectors outside instances), fractional
// (FIXED / FILL / absolute), fractional-hug (derived from text metrics — informative), tight-gap, not-auto-layout-1
// (single-child container without auto-layout), radius-unbound, screen-frame. Walk never descends into instances
// (library internals) except to read button label / icon colours.
// OPT.page   page id · OPT.sections optional list of section ids · OPT.ex examples per rule (default 3)
// OPT.names  true → per-rule histogram of node names (top 10), to plan fixes
// Stored run: figma.root shared plugin data ("ekqa","audit") = this file without the comment lines; run with
//   new (Object.getPrototypeOf(async function(){}).constructor)("__OPT", code)(OPT)
const OPT = typeof __OPT !== "undefined" ? __OPT : { page: "PAGE_ID", sections: null, ex: 3, names: true };

const page = await figma.getNodeByIdAsync(OPT.page);
await figma.setCurrentPageAsync(page);
const SPACING = [0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80, 96, 120];
const RADIUS = [0, 4, 6, 8, 12, 16, 24, 32];
const onS = (v, s) => s.some((x) => Math.abs(v - x) < 0.01);
const CONTROL = /^(Button\b|Button - |Text Input|Input\b|Select\b|Checkbox|Radio|Switch|Toggle|Tag$|Chip\b|Tab$|Tab - |Badge\b|Link - |Pagination|Breadcrumb|Avatar\b|Segmented|Search\b)/i;
const MENU_RX = /(\bmenu\b|dropdown|drop-down|popover|listbox|list ?box|\boptions\b|select list|combobox|picker|flyout|suggestions?\b|autocomplete|contextual-menu|selection-menu)/i;
const MENU_EXCL = /(menu[ -]?item|\bitems?\b|· action|button|btn|trigger|anchor|show menu|\bicon|chevron|caret|label|wrap\b|wrapper|\btabs?\b|sidebar|navigation|\bnav\b|header|\boption\b|· (profile|role|more)( \/|$)|kbd|badge|separator|divider|title|tooltip|toast|modal|drawer|scrim|overlay|backdrop|\bscreen|\bblock\b|\bnote\b|stage|flow|connector|arrow|marker|search|input|cell|container|collapsed|expanded)/i;
const NOTICE = /(alert|notice|info-note|info-box|banner|message|callout|inline-message|toast)/i;
const CTRL_SET = /^(button-|text-input|select-input|search-input|date-input|checkbox|radio|switch|segmented|Segmented|filter-chip|tag-filled|tabs|tab-item)/i;
const counts = {}, ex = {}, hist = {};
const add = (rule, n, d) => {
  counts[rule] = (counts[rule] || 0) + 1;
  (ex[rule] = ex[rule] || []).length < (OPT.ex || 3) && ex[rule].push(n.id + " " + n.name.slice(0, 28) + (d ? " · " + d : ""));
  if (OPT.names) { const h = (hist[rule] = hist[rule] || {}); const k = n.name.replace(/\d+/g, "#").slice(0, 34); h[k] = (h[k] || 0) + 1; }
};
const fr = (v) => Math.abs(v - Math.round(v)) > 0.01;
const paintOk = (n, key) => {
  const ps = n[key]; if (!Array.isArray(ps)) return true;
  const sid = key === "fills" ? n.fillStyleId : n.strokeStyleId; if (typeof sid === "string" && sid) return true;
  return ps.every((p) => p.type !== "SOLID" || p.visible === false || (p.boundVariables && p.boundVariables.color));
};
const setName = (i) => { const m = i.mainComponent; if (!m) return ""; return m.parent && m.parent.type === "COMPONENT_SET" ? m.parent.name : m.name; };
const fxName = {}; const effName = async (id) => { if (!id || typeof id !== "string") return ""; if (!(id in fxName)) { const s = await figma.getStyleByIdAsync(id); fxName[id] = s ? s.name : ""; } return fxName[id]; };
const vis = (k) => k.visible !== false;
// resolved colour (variable value for the consumer, else raw) — Figma lists a swapped icon's variant colour as a „fills” override, so compare values
const rgb = async (node, p) => { if (!p || p.type !== "SOLID") return null; let c = p.color; const b = p.boundVariables && p.boundVariables.color; if (b) { const v = await figma.variables.getVariableByIdAsync(b.id); if (v) c = v.resolveForConsumer(node).value; } return [c.r, c.g, c.b].map((x) => Math.round(x * 255)).join(","); };

// roots
const secs = page.children.filter((s) => s.type === "SECTION" && (!OPT.sections || OPT.sections.includes(s.id)) && !/How to read|Contents|Cuprins/i.test(s.name));
const screens = [];
for (const s of secs) for (const b of s.children.filter((c) => c.type === "FRAME" && /^Block · /.test(c.name))) {
  for (const c of b.children) {
    if (/^Screens · /.test(c.name) && "children" in c) screens.push(...c.children.filter((k) => k.type === "FRAME"));
    else if (/^Screen · /.test(c.name) && c.type === "FRAME") screens.push(c);
  }
}

async function visit(n, screen, isScreen) {
  if (!vis(n)) return;
  const T = n.type;
  if (T === "INSTANCE") {
    const set = setName(n);
    // fractional: own box (instances are leaves for layout)
    if (!isScreen) fracCheck(n);
    if (MENU_RX.test(n.name) && !MENU_EXCL.test(n.name.replace(MENU_RX, "")) && n.width <= 1100) await menuCheck(n);
    if (/^button-/.test(set)) {
      const label = n.findOne((k) => k.type === "TEXT" && vis(k));
      const ic = n.findOne((k) => k.type === "INSTANCE" && /^\d+\//.test(k.name) && vis(k));
      const vec = ic && ic.findOne((v) => (v.type === "VECTOR" || v.type === "BOOLEAN_OPERATION") && Array.isArray(v.fills) && v.fills.length);
      if (label && vec) { const a = await rgb(label, label.fills[0]), c = await rgb(vec, vec.fills[0]); if (a && c && a !== c) add("icon-colour-override", n, "icon " + c + " ≠ label " + a); }
    }
    return;
  }
  if (T === "TEXT") {
    if (!n.textStyleId && !(n.boundVariables && n.boundVariables.fontSize)) add("no-text-style", n, JSON.stringify(n.characters.slice(0, 24)));
    const fam = n.fontName === figma.mixed ? "mixed" : n.fontName.family;
    if (fam !== "Onest" && fam !== "mixed") add("font-not-onest", n, fam);
    if (!paintOk(n, "fills")) add("unbound-colour", n, "text fill");
    fracCheck(n);
    if (n.characters.length >= 40) tightText(n);
    return;
  }
  if (T === "VECTOR" || T === "BOOLEAN_OPERATION" || T === "STAR" || T === "POLYGON") {
    if (n.width <= 32 && n.height <= 32) add("raw-vector", n, Math.round(n.width) + "×" + Math.round(n.height));
    if (!paintOk(n, "fills")) add("unbound-colour", n, "vector fill");
    return;
  }
  if ("fills" in n && Array.isArray(n.fills) && n.fills.some((p) => p.type === "IMAGE" && vis(p))) add("image-fill", n, Math.round(n.width) + "×" + Math.round(n.height));
  if (T === "RECTANGLE" || T === "ELLIPSE" || T === "LINE") {
    if (!paintOk(n, "fills")) add("unbound-colour", n, "shape fill");
    if (!paintOk(n, "strokes")) add("unbound-colour", n, "shape stroke");
    fracCheck(n);
    return;
  }
  if (T !== "FRAME" && T !== "GROUP") { if ("children" in n) for (const k of n.children) await visit(k, screen, false); return; }
  if (T === "GROUP") add("group", n, n.children.length + " children");
  const kids = "children" in n ? n.children.filter(vis) : [];
  if (T === "FRAME") {
    if (CONTROL.test(n.name)) add("raw-control", n, "frame named like a control");
    if (!isScreen) fracCheck(n);
    const al = n.layoutMode && n.layoutMode !== "NONE";
    if (al) {
      for (const k of ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "itemSpacing", "counterAxisSpacing"]) {
        if (k === "itemSpacing" && (n.primaryAxisAlignItems === "SPACE_BETWEEN" || n.layoutMode === "GRID" || kids.filter((c) => c.layoutPositioning !== "ABSOLUTE").length < 2)) continue;
        if (k === "counterAxisSpacing" && n.layoutWrap !== "WRAP") continue;
        const v = n[k]; if (typeof v !== "number" || !v) continue;
        const b = n.boundVariables && n.boundVariables[k];
        if (!onS(v, SPACING)) { if (!b) add("spacing-off-scale", n, k + " " + v); }
        else if (!b) add("spacing-unbound", n, k + " " + v);
      }
      if (n.layoutMode === "GRID") for (const k of ["gridRowGap", "gridColumnGap"]) { const v = n[k]; if (v && !(n.boundVariables && n.boundVariables[k])) add(onS(v, SPACING) ? "spacing-unbound" : "spacing-off-scale", n, k + " " + v); }
      tightGap(n, kids);
      const ins = Array.isArray(n.strokes) && n.strokes.some(vis) && n.strokeAlign === "INSIDE" && n.strokesIncludedInLayout;
      if (ins) for (const [k, w] of [["paddingTop", "strokeTopWeight"], ["paddingRight", "strokeRightWeight"], ["paddingBottom", "strokeBottomWeight"], ["paddingLeft", "strokeLeftWeight"]]) { const v = n[k], sw = n[w] || 0; if (sw > 0 && v >= sw && !onS(v, SPACING) && onS(v - sw, SPACING)) add("border-padding", n, k + " " + v); }
    } else if (!isScreen && !/^(Overlay|Scrim)/.test(n.name)) {
      const flow = kids.filter((k) => k.layoutPositioning !== "ABSOLUTE");
      if (flow.length > 1) {
        add("not-auto-layout", n, flow.length + " children");
        for (let i = 0; i < flow.length; i++) for (let j = i + 1; j < flow.length; j++) { const a = flow[i], b = flow[j];
          const ox = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x), oy = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
          if (ox > 2 && oy > 2) { add("sibling-overlap", a, "with " + b.id); } }
      } else if (flow.length === 1 && flow[0].type !== "VECTOR") add("not-auto-layout-1", n, flow[0].type);
    }
    if (n.clipsContent && !isScreen) for (const k of kids) { if (k.layoutPositioning === "ABSOLUTE") continue; if (k.x < -1 || k.y < -1 || k.x + k.width > n.width + 1 || k.y + k.height > n.height + 1) add("clipped-content", k, "cut by " + n.id); }
    if (isScreen) {
      const ok = n.clipsContent && n.cornerRadius === (n.width <= 430 ? 24 : 16) && n.strokeWeight === 4 && n.strokeAlign === "OUTSIDE" && n.strokes.length && n.strokes[0].boundVariables && n.strokes[0].boundVariables.color;
      if (!ok) add("screen-frame", n, "clip/radius/4px outside border");
      for (const k of kids) { if (k.layoutPositioning === "ABSOLUTE") continue; if (k.y + k.height > n.height + 1 || k.x + k.width > n.width + 1) add("clipped-content", k, "cut by screen " + n.id); }
    } else {
      const r = n.cornerRadius;
      if (r !== figma.mixed && typeof r === "number" && r > 0 && r < 999) { const b = n.boundVariables && n.boundVariables.topLeftRadius; if (!onS(r, RADIUS)) { if (!b) add("radius-off-scale", n, "radius " + r); } else if (!b) add("radius-unbound", n, "radius " + r); }
      if (typeof r === "number" && r >= 999 && !(n.boundVariables && n.boundVariables.topLeftRadius)) add("radius-unbound", n, "full");
    }
    if (!paintOk(n, "fills")) add("unbound-colour", n, "fill");
    if (n.strokes && n.strokes.length && !paintOk(n, "strokes")) add("unbound-colour", n, "stroke");
    if (MENU_RX.test(n.name) && !MENU_EXCL.test(n.name.replace(MENU_RX, "")) && n.width <= 1100 && n.width >= 80) await menuCheck(n);
  }
  for (const k of kids) await visit(k, screen, false);
}
function fracCheck(n) {
  const p = n.parent; const al = p && p.layoutMode && p.layoutMode !== "NONE";
  const abs = !al || n.layoutPositioning === "ABSOLUTE";
  const hugW = n.type === "TEXT" ? n.textAutoResize === "WIDTH_AND_HEIGHT" : n.layoutSizingHorizontal === "HUG";
  const hugH = n.type === "TEXT" ? n.textAutoResize !== "NONE" && n.textAutoResize !== "TRUNCATE" : n.layoutSizingVertical === "HUG";
  const bad = [];
  if (fr(n.width) && !hugW) bad.push("w " + n.width.toFixed(2));
  if (fr(n.height) && !hugH) bad.push("h " + n.height.toFixed(2));
  if (abs && (fr(n.x) || fr(n.y))) bad.push("pos " + n.x.toFixed(1) + "," + n.y.toFixed(1));
  if (bad.length) add("fractional", n, bad.join(" ") + " " + (n.layoutSizingHorizontal || ""));
  else if ((fr(n.width) && hugW) || (fr(n.height) && hugH)) add("fractional-hug", n, n.width.toFixed(2) + "×" + n.height.toFixed(2));
}
// notices = component instances only; peek layers are part of the stacked-cards pattern (gap 0 by design)
function noticeLike(k) { return k.type === "INSTANCE" && !/peek/i.test(k.name + " " + setName(k)) && NOTICE.test(setName(k)); }
function controlLike(k) { return k.type === "INSTANCE" && CTRL_SET.test(setName(k)); }
function tightGap(n, kids) {
  if (n.layoutMode === "GRID") return;
  const flow = kids.filter((k) => k.layoutPositioning !== "ABSOLUTE");
  const gap = n.primaryAxisAlignItems === "SPACE_BETWEEN" ? 99 : n.itemSpacing;
  const painted = (Array.isArray(n.fills) && n.fills.some((p) => vis(p) && (p.opacity === undefined || p.opacity > 0))) || (Array.isArray(n.strokes) && n.strokes.some(vis));
  for (let i = 0; i < flow.length; i++) {
    const k = flow[i]; if (!noticeLike(k)) continue;
    if (n.layoutMode === "VERTICAL") {
      if (i > 0 && gap < 8 && !/peek/i.test(flow[i - 1].name)) add("tight-gap", k, gap + "px after " + flow[i - 1].name.slice(0, 20));
      if (i < flow.length - 1 && gap < 8 && !/peek/i.test(flow[i + 1].name)) add("tight-gap", k, gap + "px before " + flow[i + 1].name.slice(0, 20));
      if (painted && i === 0 && n.paddingTop < 8) add("tight-gap", k, "padTop " + n.paddingTop);
      if (painted && i === flow.length - 1 && n.paddingBottom < 8) add("tight-gap", k, "padBottom " + n.paddingBottom);
    }
  }
}
function tightText(t) {
  const p = t.parent; if (!p || p.layoutMode !== "VERTICAL") return;
  const flow = p.children.filter((k) => vis(k) && k.layoutPositioning !== "ABSOLUTE"); const i = flow.indexOf(t);
  const nb = [flow[i - 1], flow[i + 1]].filter(Boolean);
  if (p.itemSpacing < 8 && p.primaryAxisAlignItems !== "SPACE_BETWEEN" && nb.some((k) => controlLike(k) || noticeLike(k))) add("tight-gap", t, "text " + p.itemSpacing + "px to a control");
}
async function menuCheck(n) {
  const white = Array.isArray(n.fills) && n.fills.some((p) => vis(p) && p.type === "SOLID" && p.color.r > 0.96 && p.color.g > 0.96 && p.color.b > 0.96);
  const shadowed = !!n.effectStyleId || n.effects.some(vis);
  if (!((n.type === "INSTANCE" && shadowed) || (n.type !== "INSTANCE" && white && (shadowed || n.layoutPositioning === "ABSOLUTE")))) return;
  const miss = [];
  if ((await effName(n.effectStyleId)) !== "dropdown-effect") miss.push("effect");
  if (!n.clipsContent) miss.push("clip");
  if (!(n.boundVariables && n.boundVariables.topLeftRadius)) miss.push("radius");
  if (Array.isArray(n.strokes) && n.strokes.some(vis)) miss.push("stroke");
  if (miss.length) { let lib = false; if (n.type === "INSTANCE") { const m = await n.getMainComponentAsync(); lib = !!(m && m.remote); } add(lib ? "dropdown-effect-libmain" : "dropdown-effect", n, miss.join(",")); }
}

for (const s of screens) await visit(s, s, true);
const top = {}; if (OPT.names) for (const [r, h] of Object.entries(hist)) top[r] = Object.entries(h).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => v + " " + k);
return { page: page.name, sections: secs.length, screens: screens.length, counts, ex, top };
