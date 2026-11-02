// UI QA — Figma. READ-ONLY. Paste this whole file as the `code` of a use_figma call
// (fileKey aHgwVwiNCOSOqbMhMjjUOj) after replacing the ROOTS line with the node ids to audit
// (blocks, screens or components). Returns a JSON summary: counts per rule + up to 60 findings
// with node ids, so each one can be opened and fixed.
//
// Rules (from .claude/skills/components.md + design-system.md + the PO's feedback memory):
//  raw-control          a frame that looks like a library control (button / input / select / textarea —
//                       by name, by captured class name, or by field shape /
//                       checkbox / tag / chip / tab) but is not an INSTANCE
//  gradient-fill        (2026-10-30) any visible GRADIENT_* fill on a node = major, unless the name contains shadow / fade / scrim
//                       (captured CSS linear-gradient dividers became gradient fills — rebuild as a 1 px stroke)
//  unbound-colour       a SOLID fill or stroke with no variable binding and no paint style
//  no-text-style        a TEXT with no text style and no bound font-size variable
//  font-not-onest       a font other than Onest (JetBrains Mono allowed only inside code tokens)
//  spacing-off-scale    auto-layout padding / item spacing not on the spacing scale
//  radius-off-scale     corner radius not on the radius scale
//  not-auto-layout      a frame with 2+ children and no auto-layout (absolute positioning)
//  clipped-content      a child extends outside a frame that clips content (a table wider than its scroll box
//                       = intended, like GEAP 12593:37279; vertical cuts are real)
//  table-clip (2026-10-24) a table frame (GRID of Header / Table cells, thead / tbody, or named „Table …”) or its
//                       scroll box with clipsContent OFF — every table container clips; open menus / tooltips live
//                       OUTSIDE it at screen level (tools/figma/table-clip/table-clip.js)
//  sibling-overlap      two siblings overlap in a frame without auto-layout
//  icon-colour-override an icon inside a button instance whose fill differs from the label's
//  field-label-outside  a select / text-input with its label off and a hand-built label beside it
//  border-padding       (2026-10-15) padding = CSS padding + border width under an INSIDE stroke included in layout
//                       (13 / 9 / 1) — fix with tools/figma/border-padding.js
//  spacing-unbound      (2026-10-15, minor) padding / gap on the token scale but not bound to spacings/* — fix with
//                       tools/figma/bind-spacing-tokens.js
//  band-stroke-inside   (2026-10-22) a >= 4 px stroke in the fill colour set INSIDE — it is a box-shadow spread band
//                       (current step) and must be OUTSIDE; never flip strokeAlign in bulk
//  dropdown-effect      (2026-10-16) a menu-like surface (menu / dropdown / popover / listbox / picker / selection- or
//                       contextual-menu: white, shadowed or absolute, ≤ 1100 wide) without the „dropdown-effect” effect style,
//                       without clip content, with an unbound radius or with a border stroke (the effect's 1 px ring is
//                       the border). Library instances whose main lacks it are reported as „(library main)” — minor.
//                       Fix with tools/figma/dropdown-effect/dropdown-effect.js
//  fractional           (2026-10-16) a frame / instance / text (outside instances) with a non-whole x, y, width or height
//                       (user rule: whole pixels only) — fix the cause (odd centring space, FILL split, captured fractions)
//  tight-gap            (2026-10-16) a vertical auto-layout gap < 8 next to a block-like child (notice / message / card /
//                       field / document / identity / authorization card, or a filled / stroked frame with radius ≥ 8)
//  filter-icon-sliders  (2026-11-02, user: „again wrong icon”) a „20/filter” (SLIDERS glyph) inside a chip / button whose
//                       name or label says Filtr* — must be Foundations „filter-2, sort” 9644:319 (= code icon-filter-lines);
//                       swapComponent the nested icon, keep the colour binding
//  redundant-heading-border (2026-11-02, user, whole project) a heading / section-header / section title whose BOTTOM border is
//                       on while the block right under it (next sibling, or its first child) has its own border or fill (bordered
//                       card / wrap, grey card, upload box, code block). Two lines for one edge: turn the border Off (component
//                       property, or remove the raw stroke) and bind the gap (16 FO / 8 drawer). Alerts keep the border (exempt)
//  image-fill-icon      (2026-10-16) an IMAGE fill on an icon-sized node (≤ 64 px) or a captured raw h2d-svg icon — must be 0
//  image-fill-photo     (2026-10-16, minor) an IMAGE fill larger than 64 px outside instances — real photos / document
//                       scans are allowed; listed with their size so they can be confirmed (icon-sized ones = image-fill-icon)
//  message-fixed-height (2026-10-16) a message / notice / alert / info-note / inline-message / toast / banner instance (or its
//                       parent stack) with a FIXED height — must HUG its text (FILL width + auto height), never clip or leave blank
//  icon-colour-vs-code  (2026-10-16) an icon („NN/…” instance) whose resolved fill differs from its context: (a) nested in a
//                       component instance and ≠ the slot's default in the governing variant (= a fill override → reset it);
//                       (b) a glyph inside an avatar / tile with a saturated or dark fill whose colour is not light (code: white
//                       on-colour). Loose icons elsewhere: compare with the code (tools/figma/quality-sweep/icon-colours.js)
//  icon-colour-override compares the RESOLVED colours (variable value for the node) of the label and the icon — Figma
//                       records a swapped icon's own variant colour as a „fills” override, so raw / override checks lie
//  viewport-fit         (2026-10-25, user: „when modals fit, do fix screen height”) a screen with an open dialog / drawer /
//                       sheet that fits the viewport (desktop 900, phone ≤ 500 wide 812; centred dialog h + 48, phone sheet
//                       nat + 16, drawer nat) must be FIXED at that height with clip on — the page behind is cut at the
//                       viewport bottom (that cut is NOT a clipped-content finding). Fix: tools/figma/viewport-fit/fit.js
//  screen-hug           (2026-10-26, user: „screens reduce height till container wrap, check all”) a page screen WITHOUT an
//                       open overlay is ≥ 8 px taller than max(viewport 900 / 812, its auto-layout content, lowest open menu /
//                       popover + 24) = empty space at the bottom. Fix: tools/figma/viewport-fit/hug.js (stored „vfit”/„hug”)
//  ring-no-clip         (2026-10-26) an open / focused control with the focus-ring effect but clip content OFF (ring invisible)
//  nav-active-icon-colour (2026-10-24) an Active sidebar-list-item whose icon (masked slot „Icon colour”, or the glyph's own
//                       paint) resolves to a different colour than its label — code: active icon = label = brand
const ROOTS = ["PUT:NODE-IDS-HERE"];
const SPACING = [0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 120, 160, 200, 240]; // 1 removed 2026-10-15: 1 px padding = border artifact
const TOKENS = [2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80, 96, 120]; // Foundations › 3. Sizes spacings/*
const RADIUS = [0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 999, 9999];
const onScale = (v, s) => s.some((x) => Math.abs(v - x) < 0.6);
const CONTROL = /^(Button\b|Button - |Text Input|Input\b|Select\b|Checkbox|Tag$|Chip\b|Tab$|Badge\b)/;
// captured controls keep their HTML/class names (textarea, e-permits-fo-input, select…) — 2026-10-30, a raw
// „Textul mesajului” textarea passed the audit
const CAPTURED_CONTROL = /(^|[\s_-])(textarea|text-area|fo-input|fo-select|fo-textarea|input|select|checkbox|radio|switch|toggle)($|[\s_-])/i;
// shape of an input / textarea drawn by hand: bordered, rounded 4–16, ≥ 32 high, holds text, no auto-sized label row
const looksLikeField = (n) => Array.isArray(n.strokes) && n.strokes.some((s) => s.visible !== false) && typeof n.cornerRadius === "number" && n.cornerRadius >= 4 && n.cornerRadius <= 16 && n.height >= 32 && n.width >= 120 && n.width <= 1000 && !/^(Band|Block|Note|Screen|Stage)/.test(n.name) && "children" in n && n.children.some((c) => c.type === "TEXT") && n.children.length <= 4;
const MENU_RX = /(\bmenu\b|dropdown|drop-down|popover|listbox|list ?box|\boptions\b|select list|combobox|picker|flyout|suggestions?\b|autocomplete|contextual-menu|selection-menu)/i;
const MENU_EXCL = /(menu[ -]?item|\bitems?\b|· action|button|btn|trigger|anchor|show menu|\bicon|chevron|caret|label|wrap\b|wrapper|\btabs?\b|sidebar|navigation|\bnav\b|header|\boption\b|· (profile|role|more)( \/|$)|kbd|badge|separator|divider|title|tooltip|toast|modal|drawer|scrim|overlay|backdrop|\bscreen|\bblock\b|\bnote\b|stage|flow|connector|arrow|marker|search|input|cell|container|collapsed|expanded)/i;
const styleNames = {};
const effectStyleName = async (id) => { if (!id || typeof id !== "string") return ""; if (!(id in styleNames)) { const st = await figma.getStyleByIdAsync(id); styleNames[id] = st ? st.name : ""; } return styleNames[id]; };
const findings = [];
const counts = {};
const add = (rule, n, detail) => { counts[rule] = (counts[rule] || 0) + 1; if (findings.length < 60) findings.push({ rule, id: n.id, name: n.name.slice(0, 50), detail }); };
const rgbOf = async (node, p) => { if (!p || p.type !== "SOLID") return null; let c = p.color; const bv = p.boundVariables && p.boundVariables.color; if (bv) { const v = await figma.variables.getVariableByIdAsync(bv.id); if (v) c = v.resolveForConsumer(node).value; } return [c.r, c.g, c.b].map((x) => Math.round(x * 255)).join(","); };
const insideInstance = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const paintBound = (n, key) => {
  const paints = n[key];
  if (!Array.isArray(paints)) return true;
  const styleId = key === "fills" ? n.fillStyleId : n.strokeStyleId;
  if (styleId && typeof styleId === "string" && styleId.length) return true;
  return paints.every((p) => p.type !== "SOLID" || p.visible === false || (p.boundVariables && p.boundVariables.color));
};
// viewport-fit (2026-10-25): screens that show an open overlay
const VF_OVL = /overlay|scrim|backdrop/i, VF_DLG = /modal|dialog|drawer|sheet|popup|viewer/i;
const vfLayers = (s) => {
  if (s.type !== "FRAME" || !("children" in s) || s.width < 300 || s.height < 400) return null;
  const abs = s.children.filter((c) => c.visible !== false && (c.layoutPositioning === "ABSOLUTE" || !s.layoutMode || s.layoutMode === "NONE"));
  const full = abs.filter((c) => c.width >= s.width * 0.9 && c.height >= 300 && Math.abs(c.y) <= 1 && (VF_OVL.test(c.name) || VF_DLG.test(c.name) || (c.type === "FRAME" && c.children.some((k) => k.visible !== false && VF_DLG.test(k.name) && k.width < c.width - 2))));
  const dl = [];
  for (const o of full) if (o.type === "FRAME") { let best = null; for (const c of o.children) { if (c.visible === false || c.height < 120 || (c.width >= o.width - 1 && c.height >= o.height - 1 && !VF_DLG.test(c.name))) continue; if (!best || c.width * c.height > best.width * best.height) best = c; } if (best) dl.push(best); }
  for (const c of abs) if (!full.includes(c) && VF_DLG.test(c.name) && c.height >= 120 && c.width >= 240) dl.push(c);
  return dl.length ? { full, dl } : null;
};
const vfScreens = new Set();
for (const rid of ROOTS) {
  const root = await figma.getNodeByIdAsync(rid);
  if (!root) { findings.push({ rule: "missing-root", id: rid }); continue; }
  const nodes = root.findAll ? [root, ...root.findAll(() => true)] : [root];
  for (const sc of nodes) {
    if (sc.type !== "FRAME" || insideInstance(sc) || VF_OVL.test(sc.name) || VF_DLG.test(sc.name)) continue; // an overlay layer is not a screen
    const L = vfLayers(sc); if (!L) continue;
    vfScreens.add(sc.id);
    const VH = sc.width <= 500 ? 812 : 900;
    const relY = (n) => { let y = 0, p = n; while (p && p !== sc) { y += p.y; p = p.parent; } return y; };
    const natH = (n, d = 0) => { if (d > 8 || !("children" in n) || !n.layoutMode || n.layoutMode === "NONE" || n.layoutMode === "GRID") return n.height; const ks = n.children.filter((k) => k.visible !== false && k.layoutPositioning !== "ABSOLUTE"); if (!ks.length) return n.height; const h = (k) => (k.layoutSizingVertical === "FILL" || (k.clipsContent && k.layoutSizingVertical === "FIXED" && "children" in k)) ? natH(k, d + 1) : k.height; const pad = (n.paddingTop || 0) + (n.paddingBottom || 0); return n.layoutMode === "VERTICAL" ? pad + ks.reduce((a, k) => a + h(k), 0) + (n.itemSpacing || 0) * (ks.length - 1) : pad + Math.max(...ks.map(h)); };
    const fits = L.dl.every((d) => { const y = relY(d), H = sc.height; if (d.width >= sc.width - 2 && d.height >= H - 2) return false; if (y <= 2 && d.width < sc.width - 2 && d.height >= Math.min(H, VH) - 30) return natH(d) <= VH; if (Math.round(y + d.height) >= Math.round(H) - 2 && d.width >= sc.width - 2) return natH(d) + (sc.width <= 500 ? 16 : Math.round(y)) <= VH; return d.height + 48 <= VH; });
    if (fits && (Math.round(sc.height) !== VH || !sc.clipsContent)) add("viewport-fit", sc, `open overlay fits ${sc.width <= 500 ? "375×812" : "the 900 viewport"} — screen is ${Math.round(sc.height)}${sc.clipsContent ? "" : ", clip off"}: set FIXED ${VH} + clip (tools/figma/viewport-fit/fit.js)`);
  }
  // screen-hug (2026-10-26): page screens without an open overlay end at their content (same measure as viewport-fit/hug.js)
  const shAL = (n) => n.type !== "INSTANCE" && (n.layoutMode === "VERTICAL" || n.layoutMode === "HORIZONTAL");
  const shFlow = (n) => n.children.filter((k) => k.visible !== false && k.type !== "CONNECTOR" && k.layoutPositioning !== "ABSOLUTE");
  const shAny = (n, d) => { if (d > 12 || !("children" in n) || !(n.layoutMode === "VERTICAL" || n.layoutMode === "HORIZONTAL")) return n.height; const ks = shFlow(n); if (!ks.length) return n.height; const pad = (n.paddingTop || 0) + (n.paddingBottom || 0); const ch = (k) => (k.layoutSizingVertical === "FILL" || (k.layoutSizingVertical === "FIXED" && shAL(k))) ? Math.min(k.height, shAny(k, d + 1)) : k.height; const h = n.layoutMode === "VERTICAL" ? pad + ks.reduce((a, k) => a + ch(k), 0) + (n.primaryAxisAlignItems === "SPACE_BETWEEN" ? 0 : (n.itemSpacing || 0) * (ks.length - 1)) : pad + Math.max(...ks.map(ch)); return Math.max(h, n.minHeight || 0); };
  let shVH = 900;
  const shNat = (n, d) => { if (d > 14 || !("children" in n) || !shAL(n)) return n.height; const ks = shFlow(n); if (!ks.length) return n.height; const pad = (n.paddingTop || 0) + (n.paddingBottom || 0); const h = n.layoutMode === "VERTICAL" ? pad + ks.reduce((a, k) => a + shChild(k, n, d), 0) + (n.primaryAxisAlignItems === "SPACE_BETWEEN" ? 0 : (n.itemSpacing || 0) * (ks.length - 1)) : pad + Math.max(0, ...ks.map((k) => shChild(k, n, d))); const mn = n.minHeight && n.minHeight <= shVH - 40 ? n.minHeight : 0; return Math.max(h, mn); };
  const shChild = (k, p, d) => { const sv = k.layoutSizingVertical; if (k.type === "INSTANCE") return (sv === "FILL" && p.layoutMode === "HORIZONTAL") ? Math.min(k.height, shAny(k, 0)) : k.height; if (sv === "HUG" || !shAL(k)) return k.height; if (sv === "FIXED" && k.height < 300) return k.height; return Math.min(k.height, shNat(k, d + 1)); };
  for (const sc of nodes) {
    if (sc.type !== "FRAME" || insideInstance(sc) || vfScreens.has(sc.id) || sc.width < 300 || sc.height < 400 || !sc.parent) continue;
    const par = sc.parent, isScreen = /^Block\s*[·-]/.test(par.name || "") || (/^(Screens|Ecrane|Screen pair|Row)/i.test(par.name || "") && par.parent && /^Block\s*[·-]/.test(par.parent.name || ""));
    if (!isScreen || /^(Screen label|Note|Label|Screens)/i.test(sc.name) || VF_OVL.test(sc.name) || VF_DLG.test(sc.name)) continue;
    shVH = sc.width <= 500 ? 812 : 900;
    if (sc.height <= shVH + 8) continue;
    let content = 0;
    if (shAL(sc)) { const ks = shFlow(sc), pad = (sc.paddingTop || 0) + (sc.paddingBottom || 0); content = sc.layoutMode === "VERTICAL" ? pad + ks.reduce((a, k) => a + shChild(k, sc, 0), 0) + (sc.itemSpacing || 0) * (ks.length - 1) : pad + Math.max(0, ...ks.map((k) => shChild(k, sc, 0))); }
    else for (const c of sc.children) { if (c.visible === false || c.type === "CONNECTOR" || /anchor/i.test(c.name)) continue; content = Math.max(content, c.y + (shAL(c) && c.layoutSizingVertical !== "HUG" ? Math.min(c.height, shNat(c, 1)) : c.height)); }
    const sy = sc.absoluteTransform[1][2]; let ab = 0;
    const walk = (n, d) => { if (d > 10 || !("children" in n)) return; for (const c of n.children) { if (c.visible === false || c.type === "CONNECTOR") continue; if (c.layoutPositioning === "ABSOLUTE" && !/anchor/i.test(c.name) && c.height > 8 && c.width > 8) { const bb = c.absoluteBoundingBox; if (!(bb.width >= sc.width * 0.9 && bb.y - sy <= 2)) ab = Math.max(ab, bb.y + bb.height - sy + 24); } walk(c, d + 1); } };
    walk(sc, 0);
    const want = Math.round(Math.max(shVH, content, ab));
    if (sc.height - want >= 8) add("screen-hug", sc, `page screen ${Math.round(sc.height)} tall, content ends at ${want} — ${Math.round(sc.height - want)} px empty at the bottom: hug the content (tools/figma/viewport-fit/hug.js)`);
  }
  for (const n of nodes) {
    const inInst = insideInstance(n);
    if (n.visible !== false && "fills" in n && Array.isArray(n.fills) && !/shadow|fade|scrim/i.test(n.name) && n.fills.some((p) => p.visible !== false && String(p.type).startsWith("GRADIENT"))) add("gradient-fill", n, "gradient fill — remove; draw dividers as a 1 px stroke");
    if (n.type === "FRAME" && !inInst) {
      if (CONTROL.test(n.name)) add("raw-control", n, "frame named like a control — use the library instance");
      else if (CAPTURED_CONTROL.test(n.name)) add("raw-control", n, "captured control (textarea / input / select…) — swap for the library instance");
      else if (looksLikeField(n)) add("raw-control", n, "bordered rounded frame with text = a hand-drawn field/textarea — use the library input / text area");
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
      if (!n.clipsContent && !/cell|pinned|scroll edge|placeholder|row|toolbar|pager|pagination|header/i.test(n.name) && "children" in n &&
          (/^(table\b|table -|table ·|tabel\b)/i.test(n.name) || (n.layoutMode === "GRID" && n.children.filter((k) => /cell/i.test(k.name)).length >= 4)))
        add("table-clip", n, "table container must clip content (GEAP 12593:37279); move open menus out first");
      if (n.clipsContent && "children" in n) for (const k of n.children) {
        if (k.visible === false || k.layoutPositioning === "ABSOLUTE") continue;
        if (k.x < -1 || k.y < -1 || k.x + k.width > n.width + 1 || k.y + k.height > n.height + 1) {
          // page behind an open overlay, cut at the viewport bottom = intended (viewport-fit 2026-10-25)
          let behind = false; for (let p = n; p; p = p.parent) if (vfScreens.has(p.id)) { behind = !/overlay|scrim|modal|dialog|drawer|sheet/i.test(n.name) && k.y >= -1 && k.x >= -1 && k.x + k.width <= n.width + 1; break; }
          if (!behind) add("clipped-content", k, `cut by ${n.name.slice(0, 30)} (${n.id})`);
        }
      }
      const r = n.cornerRadius; if (typeof r === "number" && r && !onScale(r, RADIUS) && !(n.boundVariables && n.boundVariables.topLeftRadius)) add("radius-off-scale", n, `radius ${r}`);
    }
    // spread band (2026-10-22): a stroke painted in the fill colour, >= 4 wide = the code's box-shadow 0 0 0 Npx band
    // (current step of .step-desktop / FO stepper). It must be OUTSIDE; INSIDE hides it (a 2026-10-04 sweep flipped it).
    if (!inInst && (n.type === "FRAME" || n.type === "COMPONENT") && Array.isArray(n.strokes) && Array.isArray(n.fills) && n.strokeAlign === "INSIDE") {
      const s0 = n.strokes.find((p) => p.type === "SOLID" && p.visible !== false), f0 = n.fills.find((p) => p.type === "SOLID" && p.visible !== false);
      const sw = typeof n.strokeWeight === "number" ? n.strokeWeight : 0;
      if (s0 && f0 && sw >= 4 && ["r", "g", "b"].every((c) => Math.abs(s0.color[c] - f0.color[c]) < 0.01)) add("band-stroke-inside", n, `${sw}px stroke in the fill colour is INSIDE — set OUTSIDE (band)`);
    }
    // whole pixels (2026-10-16)
    if (!inInst && (n.type === "FRAME" || n.type === "INSTANCE" || n.type === "TEXT") && ["x", "y", "width", "height"].some((k) => Math.abs(n[k] - Math.round(n[k])) > 0.01)) add("fractional", n, ["x", "y", "width", "height"].map((k) => Math.round(n[k] * 100) / 100).join(","));
    // tight gap next to a block-like child (2026-10-16)
    if (!inInst && n.type === "FRAME" && n.layoutMode === "VERTICAL" && n.itemSpacing < 8 && n.primaryAxisAlignItems !== "SPACE_BETWEEN") {
      const kids = n.children.filter((k) => k.visible !== false && k.layoutPositioning !== "ABSOLUTE");
      const blocky = (k) => (k.type === "INSTANCE" && /message|info-note|inline-message|Document|Identity card|Authorization card|New request|Act row|lookup|select|text-input|search/i.test(k.name)) || (k.type === "FRAME" && typeof k.cornerRadius === "number" && k.cornerRadius >= 8 && ((Array.isArray(k.fills) && k.fills.some((p) => p.visible !== false)) || (Array.isArray(k.strokes) && k.strokes.some((p) => p.visible !== false))));
      if (kids.length > 1 && kids.some(blocky)) add("tight-gap", n, `gap ${n.itemSpacing} [${kids.map((k) => k.name.slice(0, 14)).join(", ").slice(0, 80)}]`);
    }
    // Filtre / Filtrare chip icon = filter-2 (lines), never 20/filter (sliders) (2026-10-30 / 2026-11-02)
    if (n.type === "INSTANCE" && n.name === "20/filter") {
      let host = n.parent, hit = false;
      for (let i = 0; i < 3 && host && !hit; i++, host = host.parent) hit = /filtr/i.test(host.name || "") || ("findOne" in host && !!host.findOne((t) => t.type === "TEXT" && /^Filtr/i.test(t.characters || "")));
      if (hit) add("filter-icon-sliders", n, "Filtre chip uses 20/filter (sliders) — swap to Foundations filter-2, sort 9644:319");
    }
    // heading border is a toggle: OFF when the block under it is boxed (2026-11-02)
    if ((n.type === "FRAME" || n.type === "INSTANCE") && /section.?(title|header)|heading|^title$/i.test(n.name) && !/page-header|modal|drawer|sheet|header cell|shell|top[- ]?bar|nav/i.test(n.name) &&
        (n.strokeBottomWeight || 0) > 0 && !n.strokeTopWeight && !n.strokeLeftWeight && Array.isArray(n.strokes) && n.strokes.some((p) => p.visible !== false) && n.parent && n.parent.children) {
      const ALERT = /info-box|info-note|alert|message|notice|banner|toast/i, sv = (a) => Array.isArray(a) && a.some((p) => p.visible !== false);
      const boxedN = (k) => k.type !== "TEXT" && !ALERT.test(k.name) && ((sv(k.strokes) && (k.strokeLeftWeight || 0) > 0 && (k.strokeRightWeight || 0) > 0) ||
        (sv(k.fills) && (k.cornerRadius === figma.mixed || k.cornerRadius > 0) && k.fills.some((p) => p.visible !== false && p.type === "SOLID" && !(p.color.r > 0.99 && p.color.g > 0.99 && p.color.b > 0.99))));
      const firstBoxed = (k, d) => boxedN(k) ? k : (ALERT.test(k.name) || d > 3 || k.type === "INSTANCE" || !("children" in k)) ? null : (() => { const c = k.children.find((x) => x.visible !== false); return c ? firstBoxed(c, d + 1) : null; })();
      const sibs = n.parent.children; let at = -1; for (let i = 0; i < sibs.length; i++) if (sibs[i].id === n.id) at = i;
      const nx = at >= 0 ? sibs.slice(at + 1).find((x) => x.visible !== false && x.layoutPositioning !== "ABSOLUTE") : null;
      const b = nx && firstBoxed(nx, 0);
      if (b) add("redundant-heading-border", n, `bottom border on, next block „${b.name.slice(0, 24)}” (${b.id}) is boxed — border Off + gap 16 / 8`);
    }
    // icons as images / raw captured svg (2026-10-16)
    if (!inInst && ((n.type === "FRAME" && /^h2d-svg/.test(n.name)) || ("fills" in n && Array.isArray(n.fills) && n.width <= 64 && n.height <= 64 && n.fills.some((p) => p.type === "IMAGE" && p.visible !== false)))) add("image-fill-icon", n, n.type);
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
    if (!inInst && "fills" in n && Array.isArray(n.fills) && (n.width > 64 || n.height > 64) && n.fills.some((p) => p.type === "IMAGE" && p.visible !== false)) add("image-fill-photo", n, `${Math.round(n.width)}×${Math.round(n.height)} — photo / scan? confirm`);
    // ring-no-clip (2026-10-26, open-menu-anchor-v1): a focus ring (0-blur DROP_SHADOW spread) only renders when the node clips
    if ((n.type === "INSTANCE" || n.type === "FRAME") && !inInst && !n.clipsContent && Array.isArray(n.effects) &&
        n.effects.some((e) => e.type === "DROP_SHADOW" && e.visible !== false && e.radius === 0 && e.spread > 0) && !n.effects.some((e) => e.radius > 0))
      add("ring-no-clip", n, "focus ring set but clip content OFF — the ring does not render; set clipsContent = true");
    if (n.type === "INSTANCE" && !inInst && /message|notice|alert|info-note|inline-message|toast|banner|info-box/i.test(n.name) && n.layoutSizingVertical === "FIXED") add("message-fixed-height", n, `${Math.round(n.height)} high, FIXED — set HUG`);
    if (n.type === "INSTANCE" && /^\d+\//.test(n.name) && n.visible !== false) {
      const vec = n.findOne((k) => (k.type === "VECTOR" || k.type === "BOOLEAN_OPERATION") && Array.isArray(k.fills) && k.fills.length && k.fills[0].type === "SOLID");
      if (vec) {
        const got = await rgbOf(vec, vec.fills[0]);
        if (n.id.startsWith("I")) {
          const slot = await figma.getNodeByIdAsync(n.id.split(";").pop());
          const sv = slot && "findOne" in slot && slot.findOne((k) => (k.type === "VECTOR" || k.type === "BOOLEAN_OPERATION") && Array.isArray(k.fills) && k.fills.length && k.fills[0].type === "SOLID");
          const want = sv && (await rgbOf(sv, sv.fills[0]));
          if (want && got && want !== got && !/^Avatar$/i.test(n.parent.name)) add("icon-colour-vs-code", n, `icon ${got} ≠ variant default ${want} — reset the override`);
        }
        const host = n.parent && /avatar|icon tile|tile/i.test(n.parent.name) ? n.parent : null;
        const hf = host && Array.isArray(host.fills) && host.fills.find((p) => p.type === "SOLID" && p.visible !== false);
        if (hf) { const bg = (await rgbOf(host, hf)).split(",").map(Number), fg = got.split(",").map(Number); const L = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; const sat = Math.max(...bg) - Math.min(...bg); if ((sat > 80 || L(bg) < 110) && L(fg) < 170) add("icon-colour-vs-code", n, `dark glyph ${got} on filled ${host.name} ${bg.join(",")} — code: white on-colour`); }
      }
    }
    if (n.type === "TEXT" && !inInst) {
      if (!n.textStyleId && !(n.boundVariables && n.boundVariables.fontSize)) add("no-text-style", n, `"${n.characters.slice(0, 30)}"`);
      const fam = n.fontName === figma.mixed ? "mixed" : n.fontName.family;
      const codeCtx = (() => { for (let p = n.parent, i = 0; p && i < 4; p = p.parent, i++) if (/code|kw|token|Combinarea|Combining|Combinator/i.test(p.name)) return true; return false; })();
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
        const a = await rgbOf(label, label.fills[0]), b = await rgbOf(vec, vec.fills[0]);
        if (a && b && a !== b) add("icon-colour-override", n, `icon ${b} ≠ label ${a} (resolved)`);
      }
    }
    /* side-menu item (2026-10-24, sidebar-active-icon-v1): an Active item's icon = its label colour (brand).
       GEAP sidebar-list-item 6347:28130 colours the glyph through a masked slot: Icon › Glyph (mask) + „Icon colour” rect. */
    if (n.type === "INSTANCE" && /State=Active/.test(n.name + " " + ((n.mainComponent && n.mainComponent.name) || "")) && n.mainComponent && n.mainComponent.parent && /sidebar-list-item/.test(n.mainComponent.parent.name)) {
      const label = n.findOne((k) => k.type === "TEXT" && k.name === "Primary Label");
      const slot = n.children.find((k) => k.name === "Icon" && k.type === "FRAME");
      const rect = slot && slot.children.find((k) => k.name === "Icon colour");
      const glyph = !rect && n.children.find((k) => k.type === "INSTANCE" && k.visible !== false);
      const vec = glyph && glyph.findOne((k) => k.type === "VECTOR" || k.type === "BOOLEAN_OPERATION");
      const paintNode = rect || vec, paint = rect ? rect.fills[0] : vec && ((vec.fills.length && vec.fills[0]) || vec.strokes[0]);
      if (label && paintNode && paint) {
        const a = await rgbOf(label, label.fills[0]), b = await rgbOf(paintNode, paint);
        if (a && b && a !== b) add("nav-active-icon-colour", n, `icon ${b} ≠ label ${a}`);
      }
    }
  }
}
return { roots: ROOTS, counts, findings };
