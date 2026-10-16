// UI QA — Figma. READ-ONLY. Paste this whole file as the `code` of a use_figma call
// (fileKey aHgwVwiNCOSOqbMhMjjUOj) after replacing the ROOTS line with the node ids to audit
// (blocks, screens or components). Returns a JSON summary: counts per rule + up to 60 findings
// with node ids, so each one can be opened and fixed.
//
// Rules (from .claude/skills/components.md + design-system.md + the PO's feedback memory):
//  raw-control          a frame that looks like a library control (button / input / select /
//                       checkbox / tag / chip / tab) but is not an INSTANCE
//  unbound-colour       a SOLID fill or stroke with no variable binding and no paint style
//  no-text-style        a TEXT with no text style and no bound font-size variable
//  font-not-onest       a font other than Onest (JetBrains Mono allowed only inside code tokens)
//  spacing-off-scale    auto-layout padding / item spacing not on the spacing scale
//  radius-off-scale     corner radius not on the radius scale
//  not-auto-layout      a frame with 2+ children and no auto-layout (absolute positioning)
//  clipped-content      a child extends outside a frame that clips content
//  sibling-overlap      two siblings overlap in a frame without auto-layout
//  icon-colour-override an icon inside a button instance whose fill differs from the label's
//  field-label-outside  a select / text-input with its label off and a hand-built label beside it
//  border-padding       (2026-10-15) padding = CSS padding + border width under an INSIDE stroke included in layout
//                       (13 / 9 / 1) — fix with tools/figma/border-padding.js
//  spacing-unbound      (2026-10-15, minor) padding / gap on the token scale but not bound to spacings/* — fix with
//                       tools/figma/bind-spacing-tokens.js
//  dropdown-effect      (2026-10-16) a menu-like surface (menu / dropdown / popover / listbox / picker / selection- or
//                       contextual-menu: white, shadowed or absolute, ≤ 1100 wide) without the „dropdown-effect” effect style,
//                       without clip content, with an unbound radius or with a border stroke (the effect's 1 px ring is
//                       the border). Library instances whose main lacks it are reported as „(library main)” — minor.
//                       Fix with tools/figma/dropdown-effect/dropdown-effect.js
//  fractional           (2026-10-16) a frame / instance / text (outside instances) with a non-whole x, y, width or height
//                       (user rule: whole pixels only) — fix the cause (odd centring space, FILL split, captured fractions)
//  tight-gap            (2026-10-16) a vertical auto-layout gap < 8 next to a block-like child (notice / message / card /
//                       field / document / identity / authorization card, or a filled / stroked frame with radius ≥ 8)
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
const ROOTS = ["PUT:NODE-IDS-HERE"];
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
const rgbOf = async (node, p) => { if (!p || p.type !== "SOLID") return null; let c = p.color; const bv = p.boundVariables && p.boundVariables.color; if (bv) { const v = await figma.variables.getVariableByIdAsync(bv.id); if (v) c = v.resolveForConsumer(node).value; } return [c.r, c.g, c.b].map((x) => Math.round(x * 255)).join(","); };
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
    // whole pixels (2026-10-16)
    if (!inInst && (n.type === "FRAME" || n.type === "INSTANCE" || n.type === "TEXT") && ["x", "y", "width", "height"].some((k) => Math.abs(n[k] - Math.round(n[k])) > 0.01)) add("fractional", n, ["x", "y", "width", "height"].map((k) => Math.round(n[k] * 100) / 100).join(","));
    // tight gap next to a block-like child (2026-10-16)
    if (!inInst && n.type === "FRAME" && n.layoutMode === "VERTICAL" && n.itemSpacing < 8 && n.primaryAxisAlignItems !== "SPACE_BETWEEN") {
      const kids = n.children.filter((k) => k.visible !== false && k.layoutPositioning !== "ABSOLUTE");
      const blocky = (k) => (k.type === "INSTANCE" && /message|info-note|inline-message|Document|Identity card|Authorization card|New request|Act row|lookup|select|text-input|search/i.test(k.name)) || (k.type === "FRAME" && typeof k.cornerRadius === "number" && k.cornerRadius >= 8 && ((Array.isArray(k.fills) && k.fills.some((p) => p.visible !== false)) || (Array.isArray(k.strokes) && k.strokes.some((p) => p.visible !== false))));
      if (kids.length > 1 && kids.some(blocky)) add("tight-gap", n, `gap ${n.itemSpacing} [${kids.map((k) => k.name.slice(0, 14)).join(", ").slice(0, 80)}]`);
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
        const a = await rgbOf(label, label.fills[0]), b = await rgbOf(vec, vec.fills[0]);
        if (a && b && a !== b) add("icon-colour-override", n, `icon ${b} ≠ label ${a} (resolved)`);
      }
    }
  }
}
return { roots: ROOTS, counts, findings };
