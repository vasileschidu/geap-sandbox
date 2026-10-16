// Quality-sweep gate audit (2026-10-16). READ-ONLY. Same rules as tools/ui-qa/figma-audit.js, but:
//  - per BLOCK counts (Block · <id> children of a section), so a whole board column fits in one call;
//  - walks without descending into instances (instances are checked as a unit: dropdown-effect, icon colour);
//  - findings filtered by OPT.rules / OPT.max; each finding carries the block id.
// Usage (use_figma): store once → figma.root.setSharedPluginData("qsweep", "audit", GATE_AUDIT.toString());
// then: const A = new Function("return " + figma.root.getSharedPluginData("qsweep","audit"))(); return await A(["<block ids>"], {rules:["not-auto-layout"], max:80});
const GATE_AUDIT = async (ROOTS, OPT) => {
  OPT = OPT || {};
  const SPACING = [0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 120, 160, 200, 240];
  const RADIUS = [0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 999, 9999];
  const onScale = (v, s) => s.some((x) => Math.abs(v - x) < 0.6);
  const CONTROL = /^(Button\b|Button - |Text Input|Input\b|Select\b|Checkbox|Tag$|Chip\b|Tab$|Badge\b)/;
  const MENU_RX = /(\bmenu\b|dropdown|drop-down|popover|listbox|list ?box|\boptions\b|select list|combobox|picker|flyout|suggestions?\b|autocomplete|contextual-menu|selection-menu)/i;
  const MENU_EXCL = /(menu[ -]?item|\bitems?\b|· action|button|btn|trigger|anchor|show menu|\bicon|chevron|caret|label|wrap\b|wrapper|\btabs?\b|sidebar|navigation|\bnav\b|header|\boption\b|· (profile|role|more)( \/|$)|kbd|badge|separator|divider|title|tooltip|toast|modal|drawer|scrim|overlay|backdrop|\bscreen|\bblock\b|\bnote\b|stage|flow|connector|arrow|marker|search|input|cell|container|collapsed|expanded)/i;
  const styleNames = {};
  const esn = async (id) => { if (!id || typeof id !== "string") return ""; if (!(id in styleNames)) { const st = await figma.getStyleByIdAsync(id); styleNames[id] = st ? st.name : ""; } return styleNames[id]; };
  const rgbOf = async (node, p) => { if (!p || p.type !== "SOLID") return null; let c = p.color; const bv = p.boundVariables && p.boundVariables.color; if (bv) { const v = await figma.variables.getVariableByIdAsync(bv.id); if (v) c = v.resolveForConsumer(node).value; } return [c.r, c.g, c.b].map((x) => Math.round(x * 255)).join(","); };
  const paintBound = (n, key) => { const paints = n[key]; if (!Array.isArray(paints)) return true; const sid = key === "fills" ? n.fillStyleId : n.strokeStyleId; if (sid && typeof sid === "string" && sid.length) return true; return paints.every((p) => p.type !== "SOLID" || p.visible === false || (p.boundVariables && p.boundVariables.color)); };
  const per = {}, tot = {}, findings = [];
  const want = (r) => !OPT.rules || OPT.rules.includes(r);
  const MAX = OPT.max || 60;
  let blk = "";
  const add = (rule, n, detail) => { per[blk][rule] = (per[blk][rule] || 0) + 1; tot[rule] = (tot[rule] || 0) + 1; if (want(rule) && findings.length < MAX) findings.push([blk, rule, n.id, n.name.slice(0, 40), detail]); };
  const walk = (n, f) => { f(n); if (n.type !== "INSTANCE" && "children" in n) for (const k of n.children) walk(k, f); };
  for (const rid of ROOTS) {
    const root = await figma.getNodeByIdAsync(rid); if (!root) continue;
    blk = root.name.replace(/^Block · /, ""); per[blk] = {};
    const nodes = []; walk(root, (n) => nodes.push(n));
    for (const n of nodes) {
      if (n.visible === false) continue;
      if (n.type === "FRAME") {
        if (CONTROL.test(n.name)) add("raw-control", n, "frame named like a control");
        if (n.layoutMode && n.layoutMode !== "NONE") {
          for (const k of ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "itemSpacing", "counterAxisSpacing"]) {
            if (k === "itemSpacing" && n.primaryAxisAlignItems === "SPACE_BETWEEN") continue;
            if (k === "counterAxisSpacing" && n.layoutWrap !== "WRAP") continue;
            const v = n[k]; if (typeof v === "number" && v && !onScale(v, SPACING) && !(n.boundVariables && n.boundVariables[k])) add("spacing-off-scale", n, `${k} ${v}`);
          }
        } else if ("children" in n && n.children.length > 1 && n.parent && n.parent.type !== "SECTION" && n.parent.type !== "PAGE" && !/^(Overlay|Block|Screen)/.test(n.name)) {
          add("not-auto-layout", n, `${n.children.length} ch; parent ${n.parent.name.slice(0, 24)}`);
          const kids = n.children.filter((k) => k.visible !== false);
          for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
            const a = kids[i], b = kids[j];
            const ox = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x), oy = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
            if (ox > 2 && oy > 2 && !/scrim|overlay/i.test(a.name + b.name)) add("sibling-overlap", a, `overlaps ${b.name.slice(0, 30)} (${b.id}) in ${n.name.slice(0, 20)} ${n.id}`);
          }
        }
        if (n.clipsContent && "children" in n) for (const k of n.children) {
          if (k.visible === false || k.layoutPositioning === "ABSOLUTE") continue;
          if (k.x < -1 || k.y < -1 || k.x + k.width > n.width + 1 || k.y + k.height > n.height + 1) add("clipped-content", k, `cut by ${n.name.slice(0, 30)} (${n.id})`);
        }
        const r = n.cornerRadius; if (typeof r === "number" && r && !onScale(r, RADIUS) && !(n.boundVariables && n.boundVariables.topLeftRadius)) add("radius-off-scale", n, `radius ${r}`);
        if (n.layoutMode === "VERTICAL" && n.itemSpacing < 8 && n.primaryAxisAlignItems !== "SPACE_BETWEEN") {
          const kids = n.children.filter((k) => k.visible !== false && k.layoutPositioning !== "ABSOLUTE");
          const blocky = (k) => (k.type === "INSTANCE" && /message|info-note|inline-message|Document|Identity card|Authorization card|New request|Act row|lookup|select|text-input|search/i.test(k.name)) || (k.type === "FRAME" && typeof k.cornerRadius === "number" && k.cornerRadius >= 8 && ((Array.isArray(k.fills) && k.fills.some((p) => p.visible !== false)) || (Array.isArray(k.strokes) && k.strokes.some((p) => p.visible !== false))));
          if (kids.length > 1 && kids.some(blocky)) add("tight-gap", n, `gap ${n.itemSpacing}`);
        }
      }
      if ((n.type === "FRAME" || n.type === "INSTANCE" || n.type === "TEXT") && ["x", "y", "width", "height"].some((k) => Math.abs(n[k] - Math.round(n[k])) > 0.01)) add("fractional", n, ["x", "y", "width", "height"].map((k) => Math.round(n[k] * 100) / 100).join(",") + ` p:${n.parent.name.slice(0, 16)} ${n.parent.layoutMode || ""}/${n.layoutSizingHorizontal || ""}`);
      if ((n.type === "FRAME" && /^h2d-svg/.test(n.name)) || (n.type !== "INSTANCE" && "fills" in n && Array.isArray(n.fills) && n.width <= 64 && n.height <= 64 && n.fills.some((p) => p.type === "IMAGE" && p.visible !== false))) add("image-fill-icon", n, n.type);
      if (n.type !== "INSTANCE" && "fills" in n && n.type !== "SECTION") {
        const hx = (ps) => { const p = ps.find((q) => q.type === "SOLID" && q.visible !== false && !(q.boundVariables && q.boundVariables.color)); return p ? "#" + [p.color.r, p.color.g, p.color.b].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("") + "@" + Math.round((p.opacity == null ? 1 : p.opacity) * 100) : ""; };
        if (!paintBound(n, "fills")) add("unbound-colour", n, "fill " + hx(n.fills) + " " + n.type);
        if ("strokes" in n && n.strokes.length && !paintBound(n, "strokes")) add("unbound-colour", n, "stroke " + hx(n.strokes));
      }
      if ((n.type === "FRAME" || n.type === "INSTANCE") && MENU_RX.test(n.name) && !MENU_EXCL.test(n.name.replace(MENU_RX, "")) && n.width <= 1100 && n.width >= 80 && n.height <= 1200 && "children" in n && n.children.some((k) => k.visible !== false)) {
        const white = Array.isArray(n.fills) && n.fills.some((p) => p.visible !== false && p.type === "SOLID" && p.color.r > 0.96 && p.color.g > 0.96 && p.color.b > 0.96);
        const shadowed = !!n.effectStyleId || n.effects.some((e) => e.visible !== false);
        if ((n.type === "INSTANCE" && shadowed) || (n.type !== "INSTANCE" && white && (shadowed || n.layoutPositioning === "ABSOLUTE"))) {
          const miss = [];
          if ((await esn(n.effectStyleId)) !== "dropdown-effect") miss.push("effect");
          if (!n.clipsContent) miss.push("clip off");
          if (!(n.boundVariables && n.boundVariables.topLeftRadius)) miss.push("radius unbound");
          if (Array.isArray(n.strokes) && n.strokes.some((p) => p.visible !== false)) miss.push("border stroke");
          if (miss.length) add("dropdown-effect", n, miss.join(", "));
        }
      }
      if (n.type === "TEXT") {
        if (!n.textStyleId && !(n.boundVariables && n.boundVariables.fontSize)) add("no-text-style", n, `"${n.characters.slice(0, 30)}"`);
        const fam = n.fontName === figma.mixed ? "mixed" : n.fontName.family;
        if (fam !== "Onest" && fam !== "mixed") add("font-not-onest", n, fam);
      }
      if (n.type === "INSTANCE" && /btn|button/i.test(n.name)) {
        const label = n.findOne((k) => k.type === "TEXT" && k.visible !== false);
        const icon = n.findOne((k) => k.type === "INSTANCE" && /^\d+\//.test(k.name) && k.visible !== false);
        const vec = icon && icon.findOne((k) => "fills" in k && Array.isArray(k.fills) && k.fills.length && k.fills[0].type === "SOLID");
        if (label && vec && Array.isArray(label.fills) && label.fills[0] && label.fills[0].type === "SOLID") {
          const a = await rgbOf(label, label.fills[0]), b = await rgbOf(vec, vec.fills[0]);
          if (a && b && a !== b) add("icon-colour-override", n, `icon ${b} ≠ label ${a}`);
        }
      }
    }
  }
  return { tot, per: OPT.perBlock === false ? undefined : Object.fromEntries(Object.entries(per).map(([k, v]) => [k, Object.entries(v).map(([r, c]) => r.replace(/-.*/, "").slice(0, 6) + c).join(" ")])), findings };
};
