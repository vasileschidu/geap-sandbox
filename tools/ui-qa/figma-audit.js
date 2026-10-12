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
const ROOTS = ["PUT:NODE-IDS-HERE"];
const SPACING = [0, 1, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 120, 160, 200, 240];
const RADIUS = [0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 999, 9999];
const onScale = (v, s) => s.some((x) => Math.abs(v - x) < 0.6);
const CONTROL = /^(Button\b|Button - |Text Input|Input\b|Select\b|Checkbox|Tag$|Chip\b|Tab$|Badge\b)/;
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
    if (n.type === "TEXT" && !inInst) {
      if (!n.textStyleId && !(n.boundVariables && n.boundVariables.fontSize)) add("no-text-style", n, `"${n.characters.slice(0, 30)}"`);
      const fam = n.fontName === figma.mixed ? "mixed" : n.fontName.family;
      const codeCtx = (() => { for (let p = n.parent, i = 0; p && i < 4; p = p.parent, i++) if (/code|kw|token|Combinarea/i.test(p.name)) return true; return false; })();
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
return { roots: ROOTS, counts, findings };
