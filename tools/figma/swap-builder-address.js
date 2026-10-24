// Swap the controls of a Form Designer (builder) full-page capture to library instances —
// the Address pattern inspector (US-54 adr-01…, adr-12…). Paste as the `code` of use_figma after
// replacing ROOTS. Builder-only pieces (canvas cards, field chips, drag handles, the Build/Preview/
// Schema mode switch) have no library component and stay as captured layout (tokenized).
//   checkbox (20px, blue = checked)          → checkbox (lib key e915a93e…) Size Medium
//   switch (48×28 pill, blue = on)            → switch 2009:19057
//   type tags „text / număr / dropdown”       → tag-filled Subtle Neutral Small
//   „Publică”                                 → button-filled-circular Primary Medium
//   „Șterge câmpul”                           → button-outlined-rectangular Destructive Leading Medium + trash
//   tabs „General / Data”                     → tab-item-s (Selected = brand label)
//   „Search Input - Caută în librărie”        → search-input-rectangular Medium
const ROOTS = ["PUT:CAPTURE-ROOT-IDS"];
const g = (id) => figma.getNodeByIdAsync(id);
const V = (set, want) => set.children.find((c) => Object.entries(want).every(([k, v]) => c.name.includes(`${k}=${v}`)));
const CB = await figma.importComponentSetByKeyAsync("e915a93ec9c4b91546cfb5788ededa656f98069a");
const BO = await figma.importComponentSetByKeyAsync("4ca8aa0074c54a1d27230b1cd03785b5f788af96");
const TAB = await figma.importComponentSetByKeyAsync("0294516b83af6616fbab5bb29510032a2ef03d80");
const TRASH = await figma.importComponentSetByKeyAsync("b5e9b87b18af497ebc71fea18f72e47f32d892bb");
const SW = await g("2009:19057"), TAG = await g("10602:106194"), CIRC = await g("8382:91415"), SEARCH = await g("9285:37474");
const trash = TRASH.children.find((c) => /filled=off/.test(c.name) && /stroke=1.5/.test(c.name)) || TRASH.children[0];
const blue = (n) => { const f = n && n.fills && n.fills !== figma.mixed && n.fills[0]; return Boolean(f && f.type === "SOLID" && f.color.b > 0.6 && f.color.r < 0.2); };
const txt = (n) => (n.findAll ? n.findAll((x) => x.type === "TEXT").map((x) => x.characters).join(" ").trim() : "");
const propKey = (inst, prefix) => Object.keys(inst.componentProperties).find((k) => k.startsWith(prefix));
const setP = (inst, map) => { const o = {}; for (const [p, v] of Object.entries(map)) { const k = propKey(inst, p); if (k) o[k] = v; } inst.setProperties(o); };
const place = (old, inst) => { const p = old.parent, i = p.children.indexOf(old); p.insertChild(i, inst); if (!p.layoutMode || p.layoutMode === "NONE") { inst.x = old.x; inst.y = old.y; } old.remove(); return inst; };
const report = {};
// >>> no-inner-shadow step (2026-10-24) — copy of tools/figma/quality-sweep/no-inner-shadow.js (lib part); re-sync with
// `python3 tools/figma/quality-sweep/sync-no-inner-shadow.py`. Captures turn CSS inset box-shadows into INNER_SHADOW effects:
// dividers → one-side stroke, rings → INSIDE stroke, the rest removed. Guarded so two pasted copies never clash.
globalThis.NO_INNER_SHADOW = globalThis.NO_INNER_SHADOW || (() => {
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
return NO_INNER_SHADOW;
})();
// <<< no-inner-shadow step
for (const rid of ROOTS) {
  const root = await g(rid); const c = {};
  const bump = (k) => { c[k] = (c[k] || 0) + 1; };
  for (const f of root.findAll((n) => n.type === "FRAME")) {
    if (f.removed) continue;
    const name = f.name, w = Math.round(f.width), h = Math.round(f.height), t = txt(f);
    if (/^Label - Vizibilitate/.test(name) && f.children[0] && Math.round(f.children[0].width) === 20) {
      const i = V(CB, { "Mode": blue(f.children[0]) ? "Checked" : "Unchecked", "State": "Default", "Size": "Medium" }).createInstance(); i.name = "checkbox · vizibil"; place(f, i); bump("checkbox"); continue;
    }
    if (name === "Text" && w === 48 && h === 28 && f.children.length === 1) {
      const i = V(SW, { "State": "Default", "Checked": blue(f) ? "True" : "False" }).createInstance(); i.name = "switch"; place(f, i); bump("switch"); continue;
    }
    if (name === "Italic Text" && /^(text|număr|dropdown|dată|email|telefon)$/.test(t)) {
      const i = V(TAG, { "Type": "Subtle", "Style": "Neutral", "Icon": "None", "Size": "Small" }).createInstance(); setP(i, { "⌨️ Label": t }); i.name = "tag · " + t; place(f, i); bump("tag"); continue;
    }
    if (name === "Button" && t === "Publică") { const i = V(CIRC, { "Style": "Primary", "Icon": "None", "Size": "Medium", "State": "Default" }).createInstance(); setP(i, { "⌨️ Label": t }); i.name = "btn · Publică"; place(f, i); bump("btn"); continue; }
    if (name === "Button" && t === "Șterge câmpul") {
      const i = V(BO, { "Style": "Destructive", "Icon": "Leading", "Size": "Medium", "State": "Default" }).createInstance(); setP(i, { "⌨️ Label": t, "🔄 Leading Icon: 20": trash.id });
      i.name = "btn · Șterge câmpul"; place(f, i); try { i.layoutSizingHorizontal = "FILL"; } catch (e) {} bump("btn"); continue;
    }
    if (name === "Tab" && f.parent && /Secțiuni proprietăți/.test(f.parent.name)) {
      const sel = /Data/.test(t); const i = V(TAB, { "Type": sel ? "Selected" : "Unselected" }).createInstance(); setP(i, { "⌨️ Label": t }); i.name = "tab · " + t; place(f, i); bump("tab"); continue;
    }
    if (/^Search Input - Caută în librărie/.test(name)) {
      const i = V(SEARCH, { "State": "Default", "Size": "Medium", "Button": "False" }).createInstance(); setP(i, { "👁️ Label": false, "👁️ Assistive Text": false, "⌨️ Placeholder": "Search..." });
      i.name = "search · librărie"; place(f, i); try { i.layoutSizingHorizontal = "FILL"; } catch (e) {} bump("search"); continue;
    }
  }
  c.innerShadow = await globalThis.NO_INNER_SHADOW([root]); // no INNER_SHADOW anywhere (2026-10-24)
  report[rid] = c;
}
return report;
