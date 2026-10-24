// NO INNER_SHADOW anywhere (user 2026-10-24, inner-shadow-sweep-v2: „again this inner shadow — remove ALL inner shadows”).
// Sweeps pages (component mains, plain nodes, instance overrides) + local effect styles and removes EVERY INNER_SHADOW:
//   divider  (visible, offset ±1 on one axis, radius 0, spread 0) → single-side stroke weight 1 on that side
//            (y −1 bottom · y +1 top · x −1 right · x +1 left), INSIDE, strokesIncludedInLayout false
//   outline  (visible, offset 0/0, radius 0, spread ≥ 1)          → INSIDE stroke, weight = spread, all sides
//   other    (blurred / hidden / odd offsets)                      → just removed
// Stroke colour = the effect's bound colour variable, else a border/* variable with the same colour, else
// border/base/default. A node that already has strokes only loses the effect (its strokes / strokeAlign are never touched).
// Nodes without stroke support (GROUP, TEXT…) only lose the effect.
// Run via use_figma; prepend the config:
//   const CFG = { pages: ["<page id>", …] | null (= all pages), skip: "archive", apply: false, limit: 400, styles: true, deep: false };
// Dry run (apply false) returns counts per page / kind / scope + samples. Apply fixes ≤ limit nodes per call (mains and
// non-instance nodes first, then instance sublayers = overrides); re-run until `left` is 0.
// Reusable step for capture / swap scripts: NO_INNER_SHADOW(roots) at the bottom (same rules, roots only).
const NIS_kind = (e) => {
  const r = e.radius || 0, s = e.spread || 0, ox = e.offset ? e.offset.x : 0, oy = e.offset ? e.offset.y : 0;
  if (e.visible === false) return "other";
  // ±1 usually (±2 = 2 px line; ±0.5 hairlines → 1 px); |offset| < 0.5 = a bevel highlight on a mockup / icon → other
  if (r === 0 && s === 0 && ((Math.abs(oy) >= 0.5 && ox === 0) || (Math.abs(ox) >= 0.5 && oy === 0))) return "divider";
  if (r === 0 && s > 0 && ox === 0 && oy === 0) return "outline";
  return "other";
};
const NIS_hex = (c) => "#" + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("") + (c.a < 1 ? "@" + Math.round(c.a * 100) : "");
let NIS_BORDERS = null; // border/* colour variables (local + every enabled library), resolved per consumer node
const NIS_borders = async () => {
  if (NIS_BORDERS) return NIS_BORDERS;
  NIS_BORDERS = [];
  const add = (v) => { if (v && !NIS_BORDERS.some((b) => b.id === v.id || b.name === v.name)) NIS_BORDERS.push(v); };
  for (const v of await figma.variables.getLocalVariablesAsync("COLOR")) if (/^border\//.test(v.name)) add(v);
  try {
    for (const c of await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync())
      for (const lv of await figma.teamLibrary.getVariablesInLibraryCollectionAsync(c.key))
        if (lv.resolvedType === "COLOR" && /^border\//.test(lv.name) && !NIS_BORDERS.some((b) => b.name === lv.name)) { try { add(await figma.variables.importVariableByKeyAsync(lv.key)); } catch (e) {} }
  } catch (e) {}
  if (!NIS_BORDERS.some((b) => b.name === "border/base/default")) {
    let v = null; try { v = await figma.variables.importVariableByKeyAsync("9fa253aab4b44e39a049a0cbbd163e4c61e129b6"); } catch (e) {}
    if (!v) v = await figma.variables.getVariableByIdAsync("VariableID:9fa253aab4b44e39a049a0cbbd163e4c61e129b6/1296:283"); // GEAP
    add(v);
  }
  return NIS_BORDERS;
};
const NIS_var = async (e, node) => {
  const b = e.boundVariables && e.boundVariables.color;
  if (b && b.id) { const v = await figma.variables.getVariableByIdAsync(b.id); if (v) return v; }
  const list = await NIS_borders(); const hex = NIS_hex(e.color);
  const rank = (v) => (v.name === "border/base/default" ? 0 : /^border\/base\//.test(v.name) ? 1 : /disabled/.test(v.name) ? 3 : 2); // same colour: base/default wins (disabled/default = #d9d9d9 too)
  for (const v of [...list].sort((a, b) => rank(a) - rank(b))) { try { const r = v.resolveForConsumer(node); const c = r && r.value; if (c && "r" in c && NIS_hex({ r: c.r, g: c.g, b: c.b, a: c.a == null ? 1 : c.a }) === hex) return v; } catch (x) {} }
  return list.find((v) => v.name === "border/base/default") || list[0] || null;
};
const NIS_canStroke = (n) => "strokes" in n && "strokeTopWeight" in n && n.type !== "TEXT";
// Fix one node: returns the action taken. A divider / outline ALWAYS keeps its line: a node that already has strokes only
// loses the effect when its stroke already draws that side; otherwise the side weight is added to the existing stroke
// (alignment untouched) or, for nodes without per-side strokes, reported as "manual".
const NIS_side = (e) => (e.offset.y < 0 ? "Bottom" : e.offset.y > 0 ? "Top" : e.offset.x < 0 ? "Right" : "Left");
const NIS_drawn = (n, side) => n.strokes.some((p) => p.visible !== false && (p.opacity == null || p.opacity > 0)) &&
  (side ? (n.strokeWeight !== figma.mixed && n.strokeWeight > 0) || n["stroke" + side + "Weight"] > 0
        : n.strokeWeight !== figma.mixed ? n.strokeWeight > 0 : ["Top", "Right", "Bottom", "Left"].every((s) => n["stroke" + s + "Weight"] > 0));
const NIS_fix = async (n) => {
  const effs = n.effects; const inner = effs.filter((e) => e.type === "INNER_SHADOW"); if (!inner.length) return null;
  const main = inner.find((e) => NIS_kind(e) !== "other");
  const k = main ? NIS_kind(main) : "other";
  if (k !== "other" && !NIS_canStroke(n)) return k + " MANUAL (no stroke support, kept)";
  if (k !== "other" && n.strokes && n.strokes.length) {
    const side = k === "divider" ? NIS_side(main) : null;
    if (!NIS_drawn(n, side)) {
      if (k === "divider" && n.strokeWeight === figma.mixed || (k === "divider" && n.strokeWeight === 0)) {
        n["stroke" + side + "Weight"] = Math.max(1, Math.round(Math.abs(main.offset.x || main.offset.y))); // add the side to the existing (per-side) stroke
        n.effects = effs.filter((e) => e.type !== "INNER_SHADOW"); return k + "→side added to existing stroke";
      }
      return k + " MANUAL (stroke does not draw it, kept)";
    }
    if (k === "outline") { // same-colour INSIDE stroke + inset ring = one thicker stroke (e.g. selected card 1 + 1 = 2)
      const p0 = n.strokes.find((p) => p.visible !== false && p.type === "SOLID");
      if (p0 && n.strokeWeight !== figma.mixed && n.strokeAlign === "INSIDE" && NIS_hex({ ...p0.color, a: 1 }) === NIS_hex({ ...main.color, a: 1 })) {
        // keep the box: a weight bound to a variable is rebound to its „…2” sibling; stroke leaves the layout; HUG axes stay at the old size
        const w0 = n.width, h0 = n.height, al = n.layoutMode && n.layoutMode !== "NONE", bw = n.boundVariables && n.boundVariables.strokeTopWeight;
        const w = n.strokeWeight + Math.max(1, Math.round(main.spread)); n.strokeWeight = w;
        if (bw) { try { const v1 = await figma.variables.getVariableByIdAsync(bw.id); const nm = v1.name.replace(/\d+$/, String(w)); let v2 = (await figma.variables.getLocalVariablesAsync("FLOAT")).find((v) => v.name === nm);
          if (!v2) for (const c of await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync()) for (const lv of await figma.teamLibrary.getVariablesInLibraryCollectionAsync(c.key)) if (!v2 && lv.name === nm) v2 = await figma.variables.importVariableByKeyAsync(lv.key);
          if (v2) for (const sd of ["Top", "Right", "Bottom", "Left"]) n.setBoundVariable("stroke" + sd + "Weight", v2); } catch (x) {} }
        if (al) { n.strokesIncludedInLayout = false;
          if (n.layoutSizingHorizontal === "HUG" && n.width !== w0) { n.layoutSizingHorizontal = "FIXED"; n.resize(w0, n.height); }
          if (n.layoutSizingVertical === "HUG" && n.height !== h0) { n.layoutSizingVertical = "FIXED"; n.resize(n.width, h0); } }
        n.effects = effs.filter((e) => e.type !== "INNER_SHADOW"); return "outline→merged into stroke";
      }
      return "outline MANUAL (stroke differs in colour / align / weights, kept)";
    }
    n.effects = effs.filter((e) => e.type !== "INNER_SHADOW"); return k + "→removed (stroke already draws it)";
  }
  if (k === "other") { n.effects = effs.filter((e) => e.type !== "INNER_SHADOW"); return "removed"; }
  const v = await NIS_var(main, n); if (!v) return k + " MANUAL (no border variable, kept)";
  n.effects = effs.filter((e) => e.type !== "INNER_SHADOW");
  n.strokes = [figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: main.color.r, g: main.color.g, b: main.color.b }, opacity: 1 }, "color", v)];
  n.strokeAlign = "INSIDE";
  if (k === "divider") {
    const side = NIS_side(main), w = Math.max(1, Math.round(Math.abs(main.offset.x || main.offset.y)));
    for (const s of ["Top", "Right", "Bottom", "Left"]) n["stroke" + s + "Weight"] = s === side ? w : 0;
  } else n.strokeWeight = Math.max(1, Math.round(main.spread));
  if ("strokesIncludedInLayout" in n && n.layoutMode && n.layoutMode !== "NONE") n.strokesIncludedInLayout = false;
  return k + "→stroke " + v.name;
};
const NO_INNER_SHADOW = async (roots) => {
  const out = {};
  for (const r of roots) for (const n of [r, ...(r.findAll ? r.findAll((x) => "effects" in x && x.effects.some((e) => e.type === "INNER_SHADOW")) : [])]) {
    if (!("effects" in n) || !n.effects.some((e) => e.type === "INNER_SHADOW")) continue;
    const a = await NIS_fix(n); if (a) out[a] = (out[a] || 0) + 1;
  }
  return out;
};
// ---- sweep (only when CFG is defined) ----
if (typeof CFG !== "undefined") {
  figma.skipInvisibleInstanceChildren = !CFG.deep; // deep: also hidden instance sublayers (slow on big pages — use per page)
  const res = { file: figma.root.name, styles: {}, pages: {}, actions: {}, samples: [], left: 0 };
  if (CFG.styles) for (const s of await figma.getLocalEffectStylesAsync()) {
    const inner = s.effects.filter((e) => e.type === "INNER_SHADOW"); if (!inner.length) continue;
    const consumers = (await s.getStyleConsumersAsync()).length;
    res.styles[s.name] = { id: s.id, kinds: inner.map((e) => NIS_kind(e) + " " + NIS_hex(e.color) + " " + (e.offset ? e.offset.x + "/" + e.offset.y : "") + " r" + (e.radius || 0) + " s" + (e.spread || 0)), consumers, left: s.effects.length - inner.length };
    if (CFG.apply) { s.effects = s.effects.filter((e) => e.type !== "INNER_SHADOW"); res.styles[s.name].edited = true; }
  }
  const skip = new RegExp(CFG.skip || "archive", "i");
  const pages = CFG.pages ? await Promise.all(CFG.pages.map((id) => figma.getNodeByIdAsync(id))) : figma.root.children;
  let budget = CFG.limit || 400;
  for (const p of pages) {
    if (!p || skip.test(p.name)) continue;
    await p.loadAsync();
    const hits = p.findAll((n) => "effects" in n && Array.isArray(n.effects) && n.effects.some((e) => e.type === "INNER_SHADOW"));
    if (!hits.length) continue;
    const isSub = (n) => n.id.startsWith("I");
    const inMain = (n) => { for (let q = n; q && q.type !== "PAGE"; q = q.parent) if (q.type === "COMPONENT" || q.type === "COMPONENT_SET") return true; return false; };
    const st = { total: hits.length, main: 0, plain: 0, sub: 0, kinds: {}, styled: 0 };
    for (const n of hits) {
      const sc = isSub(n) ? "sub" : inMain(n) ? "main" : "plain"; st[sc]++;
      if (n.effectStyleId) st.styled++;
      for (const e of n.effects) if (e.type === "INNER_SHADOW") { const k = NIS_kind(e) + " " + NIS_hex(e.color) + (e.boundVariables && e.boundVariables.color ? " (var)" : ""); st.kinds[k] = (st.kinds[k] || 0) + 1; }
      if (res.samples.length < 12 && !CFG.apply) res.samples.push(sc + " " + n.id + " " + n.type + " " + n.name.slice(0, 40));
    }
    res.pages[p.name.slice(0, 40)] = st;
    if (!CFG.apply) continue;
    const order = hits.filter((n) => !isSub(n) && inMain(n)).concat(hits.filter((n) => !isSub(n) && !inMain(n)), hits.filter(isSub));
    for (const n of order) {
      if (budget <= 0) { res.left++; continue; }
      if (n.removed || !n.effects.some((e) => e.type === "INNER_SHADOW")) continue; // fixed through its main
      const a = await NIS_fix(n); budget--;
      if (a) { res.actions[a] = (res.actions[a] || 0) + 1; if (res.samples.length < 12) res.samples.push(a + " " + n.id + " " + n.name.slice(0, 30)); }
    }
  }
  return res;
}
