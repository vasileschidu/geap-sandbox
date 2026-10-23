// swap-workplace-registry.js (2026-10-15) — raw capture of a BO workplace registry (`.e-permits-workplace`:
// toolbar · status tabs · table · footer pager) → GEAP library instances. First used on „Fluxuri de lucru” (pd-35,
// block W01, ↳ BO -> Process Designer). Paste as the `code` of use_figma (fileKey aHgwVwiNCOSOqbMhMjjUOj) after
// setting ROOTS (capture content roots). Idempotent: only raw frames are matched (never inside instances).
// Protos are the Classifiers board instances (same registry engine) — keep in sync with the playbook.
// Cells stay raw frames (same as the Classifiers / Tariffs boards); every control in them becomes an instance.
const ROOTS = ["PUT:ROOT-IDS"];
const OPT = { tagStyle: { Publicat: "Success", Schiță: "Neutral", Arhivat: "Neutral" } };
figma.skipInvisibleInstanceChildren = false;
const g = (id) => figma.getNodeByIdAsync(id);
const PR = {
  search: await g("10226:9637"),   // search-input-rectangular Default Medium
  filter: await g("10179:11150"),  // btn · Advanced filtering (Neutral Leading Small, 20/filter)
  exp: await g("10179:11162"),     // export icon-only (Neutral Only Small, local 20/export = central arrow-inbox)
  primary: await g("10179:11166"), // Primary Leading Small + plus
  chev: await g("10179:11197"),    // 20/chevron-bottom (sort)
  tag: await g("10179:11273"),     // tag-filled Subtle Success Small
  edit: await g("10317:33373"),    // „Editează” Neutral Small + pen
  menu: await g("10317:33419"),    // ⋮ Strict Only Small
  left: await g("10179:11737"),    // 20/chevron-left-small
  right: await g("10179:11747"),   // 20/chevron-right-small
  update: await g("10178:11127"),  // „Actualizează” Strict Leading Small
};
const PAG = await g("212:7429");   // .pagination-item
const BTC = await g("5919:31320"); // button-text-circular
const SEL = await g("8344:81663"); // select-input
const TAB = await figma.importComponentSetByKeyAsync("0294516b83af6616fbab5bb29510032a2ef03d80"); // tab-item-s (40 px, Badge)
const inI = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const T = (n) => ("findAll" in n ? n.findAll((t) => t.type === "TEXT").map((t) => t.characters).join(" ").replace(/\s+/g, " ").trim() : "");
const key = (inst, name) => Object.keys(inst.componentProperties).find((k) => k.split("#")[0] === name);
const variant = (set, pick) => set.children.find((c) => Object.entries(pick).every(([k, v]) => c.name.includes(`${k}=${v}`)));
const loadAll = async (n) => { for (const t of n.findAll((x) => x.type === "TEXT")) for (const s of t.getStyledTextSegments(["fontName"])) await figma.loadFontAsync(s.fontName); };
const res = { swapped: {}, left: [] };
// Inset box-shadow dividers (2026-10-23): the capture turns CSS `box-shadow: inset 0 -1px 0 var(--color-border-…)` into an
// INNER_SHADOW effect (offset ±1, radius 0) = a fake 1 px line. Replace it with a one-side stroke on border/base/default
// (INSIDE, not in layout → same size). Rings (offset 0, spread ≥ 1) are left alone. Sweep tool: tools/figma/quality-sweep/inner-shadow-dividers.js
const insetDivider = (e) => e.type === "INNER_SHADOW" && e.visible !== false && (e.radius || 0) === 0 && (e.spread || 0) === 0 &&
  ((Math.abs(e.offset.y) === 1 && e.offset.x === 0) || (Math.abs(e.offset.x) === 1 && e.offset.y === 0));
let BORDER_DEFAULT = (await figma.variables.getLocalVariablesAsync("COLOR")).find((v) => v.name === "border/base/default") || null;
if (!BORDER_DEFAULT) { try { BORDER_DEFAULT = await figma.variables.importVariableByKeyAsync("9fa253aab4b44e39a049a0cbbd163e4c61e129b6"); } catch (e) {} }
if (!BORDER_DEFAULT) BORDER_DEFAULT = await figma.variables.getVariableByIdAsync("VariableID:9fa253aab4b44e39a049a0cbbd163e4c61e129b6/1296:283"); // GEAP
const fixInsetDivider = (n) => {
  const e = n.effects.find(insetDivider); if (!e) return false;
  n.effects = n.effects.filter((x) => !insetDivider(x));
  if (n.strokes && n.strokes.length) return true; // already has a real border — the shadow was a duplicate
  const side = e.offset.y === -1 ? "Bottom" : e.offset.y === 1 ? "Top" : e.offset.x === -1 ? "Right" : "Left";
  n.strokes = [figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0.851, g: 0.851, b: 0.851 } }, "color", BORDER_DEFAULT)];
  n.strokeAlign = "INSIDE"; for (const s of ["Top", "Right", "Bottom", "Left"]) n["stroke" + s + "Weight"] = s === side ? 1 : 0;
  if ("strokesIncludedInLayout" in n) n.strokesIncludedInLayout = false; return true;
};
const count = (k) => (res.swapped[k] = (res.swapped[k] || 0) + 1);
const put = (old, inst, fill) => {
  const p = old.parent; p.insertChild(p.children.indexOf(old), inst);
  if (old.layoutPositioning === "ABSOLUTE") { inst.layoutPositioning = "ABSOLUTE"; inst.x = old.x; inst.y = old.y; }
  else if (!p.layoutMode || p.layoutMode === "NONE") { inst.x = old.x; inst.y = old.y; }
  if (fill && p.layoutMode && p.layoutMode !== "NONE") try { inst.layoutSizingHorizontal = "FILL"; } catch (e) {}
  inst.name = inst.name; old.remove();
};
for (const rid of ROOTS) {
  const root = await g(rid); if (!root) { res.left.push("missing " + rid); continue; }
  const raw = (re) => root.findAll((n) => n.type === "FRAME" && re.test(n.name) && !inI(n));
  for (const f of root.findAll((n) => "effects" in n && n.effects.some(insetDivider) && !inI(n))) if (fixInsetDivider(f)) count("inset-divider");
  // toolbar
  for (const f of raw(/^Container$/)) if (f.children.some((c) => c.name === "Search Input")) {
    const ph = T(f); const i = PR.search.clone(); const k = key(i, "⌨️ Placeholder"); if (k) i.setProperties({ [k]: ph });
    i.name = "search"; const w = f.width; put(f, i); try { i.layoutSizingHorizontal = "FIXED"; i.resize(w, i.height); } catch (e) {} count("search");
  }
  for (const f of raw(/^Button$/)) {
    if (f.removed) continue; const t = T(f);
    if (t === "Filtrare avansată") {
      // disabled in code = faded label (opacity on the button or a light text colour)
      const tx = f.findOne((x) => x.type === "TEXT"); const c = tx && tx.fills[0] && tx.fills[0].color; const lum = c ? 0.3 * c.r + 0.59 * c.g + 0.11 * c.b : 0;
      const dis = f.opacity < 1 || lum > 0.55; // read BEFORE put() removes f
      const i = PR.filter.clone(); i.setProperties({ "🎚️ State": dis ? "Disabled" : "Default" }); i.name = "btn · Advanced filtering"; put(f, i); count("filter");
    }
    else if (t === "Previous" || t === "Next") {
      const prev = t === "Previous"; const v = variant(BTC, { "🖌️ Style": "Strict", "📍 Icon": prev ? "Leading" : "Trailing", "🎚️ Size": "Medium", "🎚️ State": "Disabled" });
      const i = v.createInstance(); i.setProperties({ [key(i, "⌨️ Label")]: t, [key(i, prev ? "🔄 Leading Icon: 20" : "🔄 Trailing Icon: 20")]: (prev ? PR.left : PR.right).mainComponent.id });
      i.name = "btn · " + (prev ? "Previous" : "Next"); put(f, i); count("pager-arrow");
    }
    else if (t === "Actualizează") { const i = PR.update.clone(); put(f, i); count("update"); }
    else if (t) { const i = PR.primary.clone(); i.setProperties({ [key(i, "⌨️ Label")]: t }); i.name = "btn · " + t; put(f, i); count("primary"); }
  }
  for (const f of raw(/^Button - Export/)) { const i = PR.exp.clone(); i.name = "btn · Export"; put(f, i); count("export"); }
  // status tabs → tab-item-s
  for (const tl of raw(/^Tab List/)) {
    for (const f of tl.children.filter((c) => c.type === "FRAME" && /^Tab$/.test(c.name))) {
      const texts = f.findAll((x) => x.type === "TEXT"); const label = texts[0] ? texts[0].characters : ""; const cnt = texts[1] ? texts[1].characters : null;
      const fill = texts[0] && texts[0].fills[0]; const active = fill && fill.color && fill.color.b > 0.6 && fill.color.r < 0.2;
      const i = variant(TAB, { "🎚️ Type": active ? "Selected" : "Unselected", "🎚️ State": "Default" }).createInstance();
      i.setProperties({ [key(i, "⌨️ Label")]: label, [key(i, "👁️ Badge")]: cnt !== null });
      if (cnt !== null) { const bt = i.findAll((x) => x.type === "TEXT").filter((x) => x.characters !== label); if (bt[0]) { await figma.loadFontAsync(bt[0].fontName); bt[0].characters = cnt; } }
      i.name = "tab · " + label; put(f, i); count("tab");
    }
    tl.name = "Tabs · status";
  }
  // table
  for (const f of raw(/^Button - Sortează după /)) {
    f.name = "Sort · " + f.name.replace(/^Button - Sortează după /, "");
    for (const ic of f.findAll((x) => x.type === "FRAME" && x.name === "Icon")) { if (ic.removed) continue; const i = PR.chev.clone(); put(ic, i); count("sort-icon"); }
  }
  for (const f of raw(/^Text$/)) {
    if (f.removed) continue; const t = T(f);
    if (OPT.tagStyle[t] && f.parent && /Cell/.test(f.parent.name) && f.children.length === 1) { const i = PR.tag.clone(); await loadAll(i); i.setProperties({ [key(i, "⌨️ Label")]: t }); if (OPT.tagStyle[t] !== "Success") i.setProperties({ "🖌️ Style": OPT.tagStyle[t] }); i.name = "tag · " + t; put(f, i); count("tag"); }
  }
  for (const f of raw(/^Button - Editează/)) { const i = PR.edit.clone(); put(f, i); count("edit"); }
  for (const f of raw(/^Button - Mai multe acțiuni/)) { const i = PR.menu.clone(); i.name = "btn · More actions"; put(f, i); count("more"); }
  // mobile shell header: the user menu collapses to the initials circle → library avatar Initials Medium (40)
  for (const f of raw(/^Button - Meniu utilizator$/)) {
    const ini = T(f); if (!/^[A-ZĂÂÎȘȚ]{1,3}$/.test(ini)) continue; // desktop trigger (name + role) stays as on the other BO boards
    const A = await g("5383:28521"); const i = variant(A, { "🎚️ Type": "Initials", "🎚️ Size": "Medium", "🎚️ State": "Default" }).createInstance();
    const tx = i.findOne((x) => x.type === "TEXT"); if (tx) { await figma.loadFontAsync(tx.fontName); tx.characters = ini; }
    i.name = "avatar · user menu"; put(f, i); count("avatar");
  }
  for (const f of raw(/^Button - Copiază /)) { f.name = "Identifier · " + f.name.replace(/^Button - Copiază /, ""); count("identifier-renamed"); }
  // footer
  for (const f of raw(/^Text$/)) {
    if (f.removed) continue;
    if (f.parent && f.parent.name === "Pagination" && /^\d+$/.test(T(f))) { const v = variant(PAG, { "📏 Breakpoint": "Desktop", "🎚️ State": "Default", "🎚️ Type": "Selected" }); const i = v.createInstance(); const tx = i.findOne((x) => x.type === "TEXT"); await figma.loadFontAsync(tx.fontName); const val = T(f); tx.characters = val; i.name = "page · " + val; put(f, i); count("page"); }
    else if (f.children.some((c) => /^Dropdown - /.test(c.name))) {
      const v = variant(SEL, { "🖌️ Style": "Default", "🎚️ State": "Filled", "🎚️ Size": "Medium" }); const i = v.createInstance(); const val = T(f);
      i.setProperties({ [key(i, "👁️ Label")]: false, [key(i, "👁️ Assistive Text")]: false, [key(i, "⌨️ Placeholder")]: val || "16" });
      const w = f.width; i.name = "select · rows per page"; put(f, i); try { i.layoutSizingHorizontal = "FIXED"; i.resize(Math.max(w, 72), i.height); } catch (e) {} count("rows-select");
    }
  }
  res.left.push(...root.findAll((n) => n.type === "FRAME" && /^(Button|h2d-svg)/.test(n.name) && !inI(n)).slice(0, 12).map((n) => n.id + " " + n.name.slice(0, 30)));
}
return res;
