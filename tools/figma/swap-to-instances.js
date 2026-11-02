// Turn a prototype capture (raw frames from capture-to-figma.mjs) into library instances.
// Paste the whole file as the `code` of mcp__figma-a__use_figma (fileKey aHgwVwiNCOSOqbMhMjjUOj)
// after replacing the ROOTS line. Comment lines may stay. Returns per-root swap counts and the
// raw controls it could NOT map (fix those by hand or extend RULES + the playbook).
//
// Matching is by the capture's layer names (= accessible names: "Button - Operator", "Label",
// "Text Input", "Code") and shape (40px selects/inputs, 32px checkbox labels). Component ids are
// the GEAP library ones — keep them in sync with .claude/playbooks/figma-designer.md.
// FO / EVO Cabinet captures (cabinet-evo/index.html) use tools/figma/swap-cabinet-overlays.js then
// tools/figma/swap-cabinet.js (header, search, chips, dosar / service cards, pager, buttons, tags, marks,
// menus, tooltips, toasts, modals) + tools/figma/tokenize.js — not this file.
// Library-only controls mapped by hand on the eKYC board (2026-10-14) live in tools/figma/ekyc-library-pass/
// (keys, not GEAP node ids — work in any file that enables the „Components” + „Foundations” libraries):
//   content.js  raw status tags (r4 + fill + text) → tag-filled Subtle Small (Neutral/Accent/Success/Brand/Danger by bg),
//               initials circles → avatar Initials (Extra Small for 24px), text / copy / empty / single-tag cells →
//               table-cell, „Navigation - … › Numbered List” → breadcrumbs (Level 1–5 + Active Level)
//               captured `nav.breadcrumbs` frames (list › item › link/current) anywhere → tools/figma/breadcrumbs/replace.js (2026-10-21)
//   tabs.js     raw „Tab List” of .tab-item-md → library tabs (Tabs Count 2–8)
//   topbar.js   raw gov bar „header-evo-desktop” → library .top-section
//   modal.js    local Modal → library modal (content-slot Text / swapped content)
//   side.js / orphans.js / icons.js / btnrebuild.js — sidebar items, orphaned local copies, captured icons, button icons
// Document rows / cards / document modal (2026-10-14): tools/figma/documents/ (swap-raw-rows.js for captured
// „List Item” doc rows with a 24px „Image” lead → local „Document · rând” 11362:7113; place-cards.js for FO / Cabinet
// doc cards → „Document · card” 11364:7441; imgicons.js for icon-sized IMAGE fills → library icons). Never keep a
// captured <img> icon as an image fill.
// Finish-step certificate (2026-10-23, `.e-permits-fo-finish-doc-card`, FO Finalizare + Ghișeu Confirmarea depunerii):
// captured card / old green banner / pink error row / library system-files-item → „Document · card” Context=Certificate
// (State Default / Error × Screen) via tools/figma/documents/finish-card-mobile.js (variants: certificate-card-set.js).
// Ghișeu registry down (`.e-permits-gh__down-notice`) = Message · subtle Warning above the first lookup (bold lead), never
// a field error. Ghișeu act picker rows = „Act row” with Show icon off · Show line 2 (act type) · Show authority · Show more
// (square ⋮, exposed `More`) instead of the pill (stored runner figma.root „ghb”/„actRowPass”). Lone „Elimină schița” row
// action = the same Neutral Icon=Only Small button with 20/delete (489:3163) in the 16 slot — grey, never red.
// Act rows + „Solicitare nouă” (2026-10-16, FO „Ce vrei să soliciți?” / Ghișeu „Ce se solicită?”, foActRowHtml): captured
// „List Item” / „fo-intent-act” / „.role-switch-item” cards with an „Inițiază un postproces” pill → local „Act row” 11846:340996
// (+ „Post-process menu” 11844:340693, „New request card” 11848:340913) via tools/figma/act-row/ (measure-act-rows.mjs →
// build-spec.py → swap-act-rows.js; intent-surroundings.js for the card / „sau” divider / text styles; build-act-row-copy.js
// rebuilds the family in FOD / EVO Cabinet from library keys). Never leave the captured 24px „Image” doc icon (PNG fill).
// Event / activity logs (2026-10-25, US-262, GEAPEventTimeline.listHtml): captured „timeline__item · clickable” frames
// (rail marker + title + tab / Eșuat tags + stamp + context „… · ID corelare …” + text) → local `svc/timeline-step` 9573:19035
// (Status Success / Failed; Context + Show context, Show tab tag, Failed's exposed Status tag for „Eșuat” / „Refuzat”; clickable
// titles underlined) via tools/figma/audit-context/ (probe.mjs → rebuild-list.js). Event-detail dialogs → build-detail.js
// (Modal content / Body Spacing=24 slot: svc/section-heading + action, svc/field-row Modal rows in grey r20 cards, svc/info-note + 20/lock).
// BO workplace registries (2026-10-15, `.e-permits-workplace`: toolbar search / Filtrare avansată / export / primary,
// status tabs, sortable headers, status tags, „Editează” + ⋮, pager, rows-per-page, mobile avatar):
// tools/figma/swap-workplace-registry.js (protos from the Classifiers board; export = local 20/export 10784:265036).
// Registre board (2026-10-24, registre-board-v1): BO register lists, record cards, drawers, dialogs and the AdminPortal
// register editor are swapped by the passes in tools/figma/registre/ (stored in figma.root „reg”: post = grid → editorbtns
// → chain[profile, journal, form, swap, pager, filterbar, empty, dialog, toast, left, styles, fit] → grouphead → wrapchecks
// → editorfix → grid → styles → fit → drawerfit; then polish). New hand mappings there:
//   labelled chip group (Perimetru, Aliniere)            → local „Field · choice chips” 12779:12771 (EVO filter-chip, ✓ on selected)
//   editor field-picker group head („Solicitant 1 ⌃”)    → local „Field group header” 12803:399802 (numbered-badge + chevron)
//   editor field-picker item („Button - Adaugă coloana”) → local „Field picker · item” 12850:41161
//   „Button - Mută … mai sus/jos” / „Button - Elimină …” → button-text-rectangular 4ad2518c… Strict / Destructive Icon=Only
//                                                          Small + 20/arrow-up 18dd8655… / 20/arrow-down 93c5997e… / 20/delete 489:3163 @16
//   „Button - Retrage accesul …”                         → button-filled-rectangular Neutral Icon=Only Small + 20/delete @16
//   rule builder „Button - Coloana/Operatorul regulii”, „Button - Valoare” → select-input (Label off, Filled);
//   „Text Input - Valoare” box (+ error line)            → text-input (Label off, Destructive + assistive text)
//   icon picker „Radio Button - <name>” (Pictogramă)     → button-filled-rectangular Neutral / Secondary (selected) Icon=Only
//                                                          Small + the Foundations glyph of data/registre.json admin.icons @16
//   captured CSS grids (12-col forms, 1-col stacks, one-row rows) → auto-layout (never leave HUG/FIXED-1 grid tracks)
const ROOTS = ["PUT:CAPTURE-ROOT-IDS"];
const g = (id) => figma.getNodeByIdAsync(id);
const C = {
  select: await g("8344:81663"),        // select-input (Style × State × Size)
  input: await g("6490:68585"),         // text-input
  check: await g("10507:44447"),        // Opțiune document · checkbox (Label, Asterisc, Iconiță, Iconiță · glif)
  tag: await g("10602:106194"),         // tag-filled
  rect: await g("5611:63230"),          // button-filled-rectangular (parameter tokens)
  textCirc: await g("5919:31320"),      // button-text-circular (text buttons: Elimină, Adaugă condiție)
  circ: await g("8382:91415"),          // button-filled-circular (drawer/modal footer Large)
  // destructive-red-v1 (2026-10-21): imported by key so the sets exist in any file
  outRect: await figma.importComponentSetByKeyAsync("4ca8aa0074c54a1d27230b1cd03785b5f788af96"), // button-outlined-rectangular (Destructive = page / row / card / drawer, BO Small)
  outCirc: await figma.importComponentSetByKeyAsync("d7a0779b1fb70ccfc95c66ab762d577273913015"), // button-outlined-circular (Destructive pill = Cabinet Medium, secondary destructive in a dialog footer)
  textRect: await figma.importComponentSetByKeyAsync("4ad2518c34b8b51d5113119316eac5934c1eb9fb"), // button-text-rectangular (Destructive Icon=Only = inline remove ×)
  sw: await g("2009:19057"),            // switch (inner of svc/switch-label)
  msg: await g("9845:17951"),           // Message · subtle (Tone Success/Info/Warning/Error; Text#9845:5) — every in-page notice
  status: await g("12241:493506"),      // Header status (State Default/Hover/Focus × Size Caption/Inline; Text) — 2026-10-21
};
const SMALL_500 = await figma.importStyleByKeyAsync("057521fde838188af42abf69eb3789f676421047"); // Desktop/Body/Small 500 (bold lead)
const P = {
  edit: await g("10317:33373"),         // „Editează” Neutral Small with pen
  menu: await g("10317:33419"),         // ⋮ = button-filled-rectangular Neutral Icon-only Small, grey (no-continue-btn-v1, 2026-10-21; was Strict)
  xBtn: await g("5749:34790"),          // × = button-text-rectangular Strict Icon-only Small (component; icon swapped to 20/cross-small)
  add: await g("10316:33412"),          // Secondary Small + plus („Adaugă …”)
  cross: await g("242:12038"),          // 20/cross-small
  switchLabel: await g("9563:18803"),   // svc/switch-label
  infoNote: await g("9624:13362"),      // svc/info-note
  danger: await g("12268:364506"),      // Post-process menu · item State=Danger, Size=Desktop — every destructive dropdown item (2026-10-21)
  person: "6502:74649", suitcase: "11972:38938", // PJ glyph = Foundations 24/business-filled (c477fc69…), 2026-10-17 — never the luggage / suitcase-2 glyphs
};
const V = (set, want) => set.children.find((c) => Object.entries(want).every(([k, v]) => c.name.includes(`${k}=${v}`)));
for (const f of [["Onest", "Regular"], ["Onest", "Medium"], ["JetBrains Mono", "Regular"]]) await figma.loadFontAsync({ family: f[0], style: f[1] }).catch(() => {});
const loadAll = async (t) => { for (const s of t.getStyledTextSegments(["fontName"])) await figma.loadFontAsync(s.fontName); };
const textOf = (n) => (n.findAll ? n.findAll((x) => x.type === "TEXT").map((x) => x.characters).join(" ").trim() : "");
const isErr = (f) => { const s = f.strokes && f.strokes[0]; return Boolean(s && s.type === "SOLID" && s.color.r > 0.7 && s.color.g < 0.4); };
const setLabel = (i, t) => { const k = Object.keys(i.componentProperties).find((x) => x.startsWith("⌨️ Label")); if (k) i.setProperties({ [k]: t }); };
const place = (old, inst, fill) => {
  const parent = old.parent, i = parent.children.indexOf(old);
  parent.insertChild(i, inst);
  if (parent.layoutMode && parent.layoutMode !== "NONE") { if (fill) { try { inst.layoutSizingHorizontal = "FILL"; } catch (e) {} } }
  else { inst.x = old.x; inst.y = old.y; }
  if (parent.layoutMode === "GRID") { try { inst.setGridChildPosition(old.gridRowAnchorIndex ?? 0, old.gridColumnAnchorIndex ?? 0); } catch (e) {} }
  old.remove(); return inst;
};
/* a field = [Label frame?] + control + [hint / error frame?] → ONE component with its own
   Label, Mandatory Star and Assistive Text (never a hand-built label beside it) */
const absorbField = async (inst) => {
  const parent = inst.parent; if (!parent || !("children" in parent)) return;
  const kids = parent.children, i = kids.indexOf(inst);
  const lbl = kids.slice(0, i).reverse().find((k) => k.type === "FRAME" && /^(Label|Text)$/.test(k.name) && k.findOne && k.findOne((t) => t.type === "TEXT"));
  /* only the plain text right after the control (hint / error paragraphs); stop at anything
     interactive (a row of buttons, chips, tokens…) — never absorb or delete controls */
  const after = [];
  for (const k of kids.slice(i + 1)) {
    const interactive = k.type === "INSTANCE" || (k.findOne && k.findOne((x) => x.type === "INSTANCE" || /^Button\b|^Button - /.test(x.name))) || /^Button/.test(k.name);
    if (interactive) break;
    if (k.findAll && k.findAll((t) => t.type === "TEXT").length) after.push(k);
  }
  const afterText = after.map((k) => textOf(k)).join(" ").trim();
  if (!lbl && !afterText) return;
  if (/obligatoriu\.|Introdu|Adaugă cel puțin|Șablonul|Parametru necunoscut/.test(afterText) && inst.mainComponent.name.includes("Style=Default")) {
    const t = inst.mainComponent.parent.children.find((c) => c.name === inst.mainComponent.name.replace("Style=Default", "Style=Destructive"));
    if (t) inst.swapComponent(t);
  }
  const hasAssist = inst.mainComponent.children.some((c) => /inline-message|Assistive/i.test(c.name));
  inst.setProperties({ "👁️ Label#132:24": Boolean(lbl), "👁️ Mandatory Star#316:0": Boolean(lbl && lbl.findOne((x) => /obligatoriu/i.test(x.name))), "👁️ Assistive Text#143:22": Boolean(afterText && hasAssist) });
  if (lbl) { const lt = inst.findOne((t) => t.type === "TEXT" && t.name === "Label"); if (lt) { await loadAll(lt); lt.characters = textOf(lbl); } lbl.remove(); }
  if (afterText && hasAssist) { const msg = inst.children.find((c) => /inline-message|Assistive/i.test(c.name)); const mt = msg && msg.findOne((t) => t.type === "TEXT"); if (mt) { await loadAll(mt); mt.characters = afterText; } for (const a of after) a.remove(); }
};
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
  const root = await g(rid); const done = []; const fields = [];
  for (const f of root.findAll((n) => n.type === "FRAME")) {
    if (f.removed) continue;
    const name = f.name, txt = textOf(f), h = Math.round(f.height), w = Math.round(f.width);
    // switch row: [Text 44×24 (switch), Text (label + description)]
    if (f.children?.length === 2 && f.children[0].name === "Text" && Math.round(f.children[0].width) === 44) {
      const parts = f.children[1].findAll((x) => x.type === "TEXT").map((x) => x.characters);
      const i = P.switchLabel.createInstance();
      i.setProperties({ "Label#9563:0": parts[0] || "", "Supporting Text#9563:1": parts[1] || "", "Show supporting text#9563:2": Boolean(parts[1]) });
      const on = Boolean(f.children[0].findOne((x) => x.name === "Icon")) || /trec prin|activ/i.test(parts[1] || "");
      const off = /nu conține|nu trec/i.test(parts[1] || "");
      i.children.find((c) => c.name === "switch").swapComponent(V(C.sw, { "State": /nu conține/i.test(parts[1] || "") ? "Disabled" : "Default", "Checked": on && !off ? "True" : "False" }));
      i.name = "switch · " + (parts[0] || ""); place(f, i, true); done.push("switch"); continue;
    }
    // info note: icon + paragraph in a grey box
    if (name === "Container" && f.children?.length === 2 && f.children[0].name === "Icon" && f.fills?.length && txt.length > 20) {
      const i = P.infoNote.createInstance(); i.setProperties({ "Text#9624:0": txt }); i.name = "info-note"; place(f, i, true); done.push("info-note"); continue;
    }
    // header / save-bar draft status (2026-10-21, code .e-permits-page-header__status[--button]): an 8×8 dot + one
    // 12/16 or 14/20 medium text („● N modificări nesalvate / nepublicate”) → Header status (Caption 12, Inline 14).
    // It is a BUTTON that opens the „Modificări nesalvate” review (Unsaved changes review 12241:529090).
    /* 2026-10-26 (calendar-filter-chip-v1, user): the toolbar „Filtrare” trigger (`.chip.e-permits-filter-trigger`) and the
       facet chips of the filter bar (`.chip.e-permits-workplace__filter-chip`, parent frame „Filtre”) are the LIBRARY
       filter-chip 1244:34029 — never button-filled-rectangular Neutral. Trigger = Mono · Icon Leading + 20/filter, label
       „Filtrare” (fb4fa697), Selected + Counter Badge when a count is shown; BO 36 → height 36 + radius-6, else 40 + radius-8.
       Facets = Mono · Icon Trailing (chevron), Selected + badge when dark / counted, library radius. Bar keeps no fill / stroke. */
    {
      const isTrig = /^(Filtre|Filtrare( avansată)?)(\s*\d+)?$/.test(txt.trim()) && h >= 32 && h <= 48 && w <= 240 && !/^(Text|Label|Paragraph)$/.test(name);
      const inBar = f.parent && (f.parent.name === "Filtre" || (f.parent.parent && f.parent.parent.name === "Filtre"));
      const isFacet = !isTrig && inBar && /^Button/.test(name) && h >= 32 && h <= 48 && !/^(Renunță|Aplică|Șterge|Mai multe)/.test(txt.trim()) && txt.trim().length > 0;
      if (isTrig || isFacet) {
        const FC = await g("1244:34029"); const dark = Array.isArray(f.fills) && f.fills.some((p) => p.visible !== false && p.type === "SOLID" && p.color.r < 0.3);
        const cnt = (txt.match(/(\d+)\s*$/) || [])[1]; const on = dark || Boolean(cnt);
        const v = FC.children.find((c) => c.name === "🎚️ State=" + (on ? "Selected" : "Unselected") + ", 🎚️ Type=Mono Selection, 📍 Icon=" + (isTrig ? "Leading" : "Trailing"));
        const i = v.createInstance(); for (const t of i.findAll((x) => x.type === "TEXT")) await loadAll(t);
        const label = isTrig ? "Filtrare" : txt.replace(/\s*\d+\s*$/, "").trim();
        i.setProperties({ "⌨️ Label#217:90": label, "👁️ Counter Badge#439:0": Boolean(cnt) }); if (cnt) i.findOne((x) => x.name === "Badge label").characters = cnt;
        if (isTrig) { const ic = i.children.find((x) => x.type === "INSTANCE" && /^\d+\//.test(x.name)); ic.swapComponent(await figma.importComponentByKeyAsync("d7ef1839769646e2b2d27b2a54d4b38787bcd775"));
          const bo = h <= 37; if (bo) ic.resize(16, 16); i.layoutSizingVertical = "FIXED"; i.resize(i.width, bo ? 36 : 40);
          const rv = await figma.variables.importVariableByKeyAsync(bo ? "5c211831294ec4aee7827d006133784193921c22" : "dc82cc9d79935ad111db3189faf87c70772bed75");
          for (const k of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) i.setBoundVariable(k, rv); }
        i.name = "filter chip · " + label; place(f, i); done.push(isTrig ? "filter-trigger" : "filter-facet"); continue;
      }
    }
    /* 2026-10-25 (bo-dossier-flows): passport „Examinare și distribuire” captures (svc-10dp*) */
    if (f.name === "Label" && f.children?.length === 2 && Math.round(f.children[0].width) === 48 && Math.round(f.children[0].height) === 28) { // 48×28 toggle + label/description
      const texts = f.children[1].findAll((x) => x.type === "TEXT").map((x) => x.characters); const fc = f.children[0].fills?.[0]?.color; const on = Boolean(fc && fc.b > 0.6 && fc.r < 0.3);
      const i = P.switchLabel.createInstance(); i.setProperties({ "Label#9563:0": texts[0] || "", "Supporting Text#9563:1": texts[1] || "", "Show supporting text#9563:2": Boolean(texts[1]) });
      i.children.find((c) => c.name === "switch").swapComponent(V(C.sw, { "State": "Default", "Checked": on ? "True" : "False" })); i.name = "switch · " + (texts[0] || ""); place(f, i, true); done.push("switch-48"); continue;
    }
    if (f.children?.length === 2 && f.children[0].name === "Text" && f.children[0].findOne?.((x) => x.name === "Icon") && f.children[1].name === "Paragraph") { // grey info note inside a grey group
      const i = P.infoNote.createInstance(); i.setProperties({ "Text#9624:0": f.children[1].findOne((x) => x.type === "TEXT").characters }); i.name = "info-note"; place(f, i, true); done.push("info-note-2"); continue;
    }
    if (f.children?.length === 1 && f.children[0].type === "TEXT" && h <= 22 && f.fills?.length && /^(Moștenit|Suprascris|Necompletat)/.test(f.children[0].characters)) { // inherited / overridden / empty tag
      const t = f.children[0].characters; const i = V(C.tag, { "Type": "Subtle", "Style": /^Suprascris/.test(t) ? "Brand" : /^Necompletat/.test(t) ? "Accent" : "Neutral", "Icon": "None", "Size": "Small" }).createInstance();
      i.setProperties({ "⌨️ Label#387:32": t }); i.name = "tag · " + t; place(f, i); done.push("tag-inherit"); continue;
    }
    if (f.children?.length === 2 && f.children[0].name === "Text" && f.children[0].findOne?.((x) => x.type === "TEXT" && /^Luna \d$/.test(x.characters)) && f.children[1].findOne?.((x) => /^Text Input - Rampa/.test(x.name))) { // novice ramp month (parent GRID → make it HORIZONTAL gap 16 afterwards)
      const lab = f.children[0].findOne((x) => x.type === "TEXT").characters, vt = f.children[1].findOne((x) => x.type === "TEXT"), ph = vt?.fills?.[0]?.color?.r > 0.4;
      const i = V(C.input, { "Style": isErr(f.children[1]) ? "Destructive" : "Default", "State": ph ? "Default" : "Filled", "Size": "Medium" }).createInstance();
      i.setProperties({ "👁️ Label#132:24": true, "⌨️ Placeholder#215:38": vt ? vt.characters : "", "👁️ Assistive Text#143:22": false }); const lt = i.findOne((x) => x.type === "TEXT" && x.name === "Label"); await loadAll(lt); lt.characters = lab;
      i.name = "text-input · " + lab; place(f, i, true); done.push("ramp-input"); continue;
    }
    if (f.children?.length === 2 && /^Button - Elimină /.test(f.children[1].name) && h === 36) { // removable selection chip (Subdiviziuni de examinare)
      const chip = (await g("10666:66361")).findOne((n) => n.type === "INSTANCE" && n.name.startsWith("chip · ")); if (chip) { const i = chip.clone(); const k = Object.keys(i.componentProperties).find((x) => x.startsWith("⌨️ Label")); if (k) i.setProperties({ [k]: textOf(f.children[0]) }); i.name = "chip · " + textOf(f.children[0]); place(f, i); done.push("input-chip"); continue; }
    }
    if (f.children?.length === 2 && Math.round(f.children[0].width) === 8 && Math.round(f.children[0].height) === 8 && f.children[1].type === "TEXT" && /modific(are|ări) ne(salvat|publicat)/.test(f.children[1].characters)) {
      const t = f.children[1], size = t.fontSize >= 14 ? "Inline" : "Caption";
      const i = V(C.status, { "State": "Default", "Size": size }).createInstance();
      i.setProperties({ [Object.keys(i.componentProperties).find((k) => k.startsWith("Text"))]: t.characters });
      i.name = "Status"; place(f, i, false); done.push("header-status"); continue;
    }
    // in-page notice (renderNotice: `.message.message--subtle` = „message” > banner__icon + banner__content [+ banner__close])
    // → Message · subtle, tone from the captured icon, bold lead (<strong>, captured as Onest Medium) → Body/Small 500.
    // FILL × HUG, icon colour from the variant (never override). The library notice has no × (code has none since 2026-10-16).
    if (name === "message" && f.children?.some((c) => c.name === "banner__icon") && f.children?.some((c) => c.name === "banner__content")) {
      const ic = (f.findOne((x) => x.type === "INSTANCE" && /^\d+\//.test(x.name)) || {}).name || "";
      const tone = /warning/.test(ic) ? "Warning" : /error|danger/.test(ic) ? "Error" : /check|success/.test(ic) ? "Success" : "Info";
      const tn = f.children.find((c) => c.name === "banner__content").findOne((x) => x.type === "TEXT");
      const body = tn ? tn.characters : txt;
      const lead = tn ? tn.getStyledTextSegments(["fontName"]).find((s) => s.start === 0 && /Medium|Semi|Bold/.test(s.fontName.style)) : null;
      const i = V(C.msg, { "Tone": tone }).createInstance();
      i.setProperties({ "Text#9845:5": body }); i.name = "notice · " + body.slice(0, 30); place(f, i, true);
      try { i.layoutSizingVertical = "HUG"; } catch (e) {}
      if (lead) { const t = i.children.find((c) => c.type === "TEXT"); await t.setRangeTextStyleIdAsync(0, lead.end, SMALL_500.id); }
      done.push("notice"); continue;
    }
    // selects (40px, chevron) — named by accessible name or plain "Button" with an Icon
    if ((/^Button - (Tipul regulii|Câmp din cerere|Operator)/.test(name) || (name === "Button" && f.findOne((x) => x.name === "Icon"))) && h === 40 && !/^(Anulează|Salvează|Adaugă|Închide)/.test(txt)) {
      const placeholder = /^(Câmp din cerere|Operator|Tipul regulii|Alege)/.test(txt);
      const disabled = /întâi/.test(txt);
      const i = V(C.select, { "Style": isErr(f) ? "Destructive" : "Default", "State": disabled ? "Disabled" : placeholder ? "Default" : "Filled", "Size": "Medium" }).createInstance();
      i.setProperties({ "👁️ Label#132:24": false, "⌨️ Placeholder#215:38": txt || "Alege" });
      i.name = "select · " + (name.replace("Button - ", "") || txt).slice(0, 40); place(f, i, true); fields.push(i); done.push("select"); continue;
    }
    /* 2026-10-27 (dist-actions pre-check, ref-04): dialog fields of the BO case-action modals.
       Captured textarea = `Container` (stroke) › `Text Area` → library text-area b9326acb… (label + star absorbed, the
       „0/5000” paragraph after it = Character Counter, never an assistive text). Read-only field = `Container` 40 (stroke) ›
       `Text Input - <label>` + 24 `Icon` (lock) → text-input State=Read Only with the local 20/lock 12268:364500 shown. */
    if (f.children?.length === 1 && f.children[0].name === "Text Area") {
      const TA = await figma.importComponentSetByKeyAsync("b9326acb41b6b6cdb42bbbab753e2c0279107520");
      const parent = f.parent, kids = parent.children, k = kids.indexOf(f);
      const lbl = kids.slice(0, k).reverse().find((x) => x.type === "FRAME" && x.name === "Label");
      const cnt = kids.slice(k + 1).find((x) => x.type === "FRAME" && /^\d+\/\d+$/.test(textOf(x)));
      const err = kids.slice(k + 1).find((x) => x.type === "FRAME" && x !== cnt && textOf(x) && !/^\d+\/\d+$/.test(textOf(x)));
      const i = V(TA, { "Style": isErr(f) || err ? "Destructive" : "Default", "State": txt ? "Filled" : "Default", "Size": "Medium" }).createInstance();
      const pk = (pre) => Object.keys(i.componentProperties).find((x) => x.startsWith(pre));
      i.setProperties({ [pk("👁️ Label")]: Boolean(lbl), [pk("👁️ Mandatory Star")]: Boolean(lbl && lbl.findOne((x) => /obligatoriu/i.test(x.name))), [pk("⌨️ Placeholder")]: txt || "", [pk("👁️ Character Counter")]: Boolean(cnt), ...(cnt ? { [pk("⌨️ Character Counter")]: textOf(cnt) } : {}), [pk("👁️ Assistive Text")]: Boolean(err) });
      if (lbl) { const lt = i.findOne((t) => t.type === "TEXT" && t.name === "Label"); if (lt) { await loadAll(lt); lt.characters = textOf(lbl); } lbl.remove(); }
      if (err) { const m = i.findOne((x) => x.type === "INSTANCE" && /inline-message|Assistive/i.test(x.name)); const mt = m && m.findOne((t) => t.type === "TEXT"); if (mt) { await loadAll(mt); mt.characters = textOf(err); } err.remove(); }
      if (cnt) cnt.remove();
      i.name = "text-area" + (lbl ? " · " + textOf(i.findOne((t) => t.type === "TEXT" && t.name === "Label") || i) : ""); place(f, i, true); done.push("text-area"); continue;
    }
    if (h === 40 && f.children?.length === 2 && /^Text Input - /.test(f.children[0].name) && f.children[1].name === "Icon" && Math.round(f.children[1].width) === 24) {
      const i = V(C.input, { "Style": "Default", "State": "Read Only", "Size": "Medium" }).createInstance();
      i.setProperties({ "👁️ Label#132:24": false, "⌨️ Placeholder#215:38": txt || " " });
      const ck = i.findOne((x) => x.type === "INSTANCE" && x.name === "20/checkmark-small"); if (ck) { ck.swapComponent(await g("12268:364500")); ck.visible = true; }
      i.name = "text-input · read-only"; place(f, i, true); fields.push(i); done.push("input-readonly"); continue;
    }
    if (f.children?.length === 1 && f.children[0].name === "Text Input" && h === 40) {
      const i = V(C.input, { "Style": isErr(f) ? "Destructive" : "Default", "State": txt ? "Filled" : "Default", "Size": "Medium" }).createInstance();
      i.setProperties({ "👁️ Label#132:24": false, "⌨️ Placeholder#215:38": txt || " " }); i.name = "text-input"; place(f, i, true); fields.push(i); done.push("input"); continue;
    }
    // checkbox options (32px label with a 20px box); PF/PJ get the optional glyph
    if (name === "Label" && h === 32 && f.children?.[0]?.name === "Text" && Math.round(f.children[0].width) === 20) {
      const checked = Boolean(f.children[0].findOne((x) => x.name === "Icon"));
      const i = V(C.check, { "State": "Default", "Checked": checked ? "True" : "False" }).createInstance();
      const glyph = /Persoană juridică/.test(txt) ? P.suitcase : /Persoană fizică/.test(txt) ? P.person : null;
      i.setProperties({ "Label#10507:0": txt, "Asterisc#10507:9": txt === "Obligatoriu", "Iconiță#11007:0": Boolean(glyph), ...(glyph ? { "Iconiță · glif#11007:9": glyph } : {}) });
      i.name = "check · " + txt; place(f, i); done.push("check"); continue;
    }
    if (/^Button - Elimină/.test(name) && w > 32) { const i = V(C.textCirc, { "Style": "Destructive", "Icon": "None", "Size": "Small", "State": "Default" }).createInstance(); setLabel(i, "Elimină"); i.name = "btn · Elimină"; place(f, i); done.push("btn-remove"); continue; }
    // inline remove (rule-builder condition, FO grid row, repeat / activity / „Alt document” card, combination card) = code
    // `btn btn-text-destructive btn-sm btn-icon-only` + icon-delete (destructive-red-v1) → text-rect Destructive Icon=Only Small, 20/delete in the 16 slot
    if (/^Button - (Elimină|Șterge)/.test(name) && w === 32) { const i = V(C.textRect, { "Style": "Destructive", "Icon": "Only", "Size": "Small", "State": "Default" }).createInstance(); const pr = i.componentProperties; for (const k of Object.keys(pr).filter((k) => /Leading Icon/.test(k))) i.setProperties({ [k]: "489:3163" }); i.name = "btn · " + name.replace(/^Button - /, ""); place(f, i); done.push("btn-x-destructive"); continue; }
    if (name === "Button" && /^Adaugă (condiție)$/.test(txt)) { const i = V(C.textCirc, { "Style": "Primary", "Icon": "Leading", "Size": "Small", "State": "Default" }).createInstance(); setLabel(i, txt); i.name = "btn · " + txt; place(f, i); done.push("btn-text"); continue; }
    if (name === "Button" && /^Adaugă /.test(txt) && h <= 32) { const i = P.add.clone(); setLabel(i, txt); i.name = "btn · " + txt; place(f, i); done.push("btn-add"); continue; }
    /* footer buttons: size follows the capture (40 = Medium: desktop modal / dialog footers, user 2026-10-23; 48 = Large);
       „Refuză …” (US-296 case refusal) and every other destructive confirm = Destructive (2026-10-27) */
    if (name === "Button" && (h === 40 || h === 48) && /^(Anulează|Salvează|Închide|Aplică|Renunță|Dezactivează|Elimină|Activează|Adaugă \S+|Refuză( \S+)?|Redistribuie( \S+)?|Confirmă)$/.test(txt)) {
      const st = /^(Anulează|Închide|Renunță)$/.test(txt) ? "Neutral" : /^(Dezactivează|Elimină|Refuză)/.test(txt) ? "Destructive" : "Primary";
      const i = V(C.circ, { "Style": st, "Icon": "None", "Size": h === 40 ? "Medium" : "Large", "State": "Default" }).createInstance(); setLabel(i, txt); i.name = "btn · " + txt; place(f, i); done.push("btn-footer"); continue;
    }
    // 2026-10-17 · footer „Descarcă …” / „Exportă …” (export glyph = central „arrow-inbox, download” filled=on stroke 1.5 r2,
    // follows the button colour) and „Printează” (central „printer, print” filled=off stroke 1.5 r2) — never Icon=None, never
    // 20/download / page-download. Neutral when the captured fill is grey, Primary otherwise. „Descarcă din MDocs” = an import → 20/upload.
    if (name === "Button" && h === 40 && /^(Descarcă|Exportă|Printează)/.test(txt)) {
      const grey = f.fills?.[0]?.type === "SOLID" && f.fills[0].color.r > 0.85 && f.fills[0].color.r < 0.99;
      const i = V(C.circ, { "Style": /^Printează/.test(txt) || grey ? "Neutral" : "Primary", "Icon": "Leading", "Size": "Large", "State": "Default" }).createInstance(); setLabel(i, txt);
      const glyph = await figma.importComponentByKeyAsync(/^Printează/.test(txt) ? "f519c646b673822c2c07d0b279efefb62ac08840" : /din MDocs/.test(txt) ? "e72e41aa51a34c586d0e3e31309dc738551e1ba8" : "e41040cad8f8622843fba350661894ea6c4823d6");
      const pr = i.componentProperties; for (const k of Object.keys(pr).filter((k) => /Leading Icon/.test(k))) i.setProperties({ [k]: glyph.id });
      i.name = "btn · " + txt; place(f, i); done.push("btn-footer-icon"); continue;
    }
    // parameter tokens ({NR:4}, {YYYY}…) = Neutral Small button with a code (mono) label
    if (/^Button - Inserează/.test(name)) { const i = V(C.rect, { "Style": "Neutral", "Icon": "None", "Size": "Small", "State": "Default" }).createInstance(); setLabel(i, txt); for (const t of i.findAll((x) => x.type === "TEXT")) { await figma.loadFontAsync(t.fontName); t.fontName = { family: "JetBrains Mono", style: "Regular" }; } i.name = "btn · " + txt; place(f, i); done.push("btn-token"); continue; }
    if (name === "Button" && txt === "Elimină" && h <= 32) { const i = V(C.textCirc, { "Style": "Destructive", "Icon": "None", "Size": "Small", "State": "Default" }).createInstance(); setLabel(i, txt); i.name = "btn · Elimină"; place(f, i); done.push("btn-remove"); continue; }
    // destructive-red-v1 (2026-10-21) · page / header / row / card / drawer button with a destructive label (code isDestructiveLabel →
    // `btn-outline-destructive btn-sm`) = outlined Destructive Small (trash for Șterge / Elimină …, pause kept from the code's icon);
    // „Închide fără salvare” in a dialog footer (40) = outlined-circular Destructive. Clearing („Șterge filtrele / căutarea”) is not destructive.
    // (a confirm button at 40 — „Șterge”, „Dezactivează” … — is the FILLED Destructive of the footer rule above, not this one)
    if (name === "Button" && (h <= 32 || /^(Închide fără salvare|Dezactivează în schimb)$/.test(txt)) && /^(Elimină|Șterge|Dezactivează|Inactivează|Suspendă|Revocă|Retrage|Anulează programarea|Arhivează|Închide fără salvare)/.test(txt) && !/^Șterge (filtrele|filtrul|căutarea|formatarea)/.test(txt)) {
      const footer = h > 32;
      const i = V(footer ? C.outCirc : C.outRect, { "Style": "Destructive", "Icon": /^(Șterge|Elimină)/.test(txt) && !footer ? "Leading" : "None", "Size": footer ? "Large" : "Small", "State": "Default" }).createInstance();
      setLabel(i, txt); if (/^(Șterge|Elimină)/.test(txt) && !footer) { const pr = i.componentProperties; for (const k of Object.keys(pr).filter((k) => /Leading Icon/.test(k))) i.setProperties({ [k]: "489:3163" }); }
      i.name = "btn · " + txt; place(f, i); done.push("btn-destructive"); continue;
    }
    if (name === "Button" && txt === "Editează") { const i = P.edit.clone(); i.name = "btn · Editează"; place(f, i); done.push("btn-edit"); continue; }
    // 2026-10-21 · destructive dropdown items (code `.is-danger`: Elimină…, Șterge…, Retragere, Anulare, Dezactivează (fees / eKYC),
    // Inactivează, Revocă) → the local item's State=Danger: red label + red icon (icon/danger/default bound on every vector after the
    // icon swap — the swap drops the variant's fill). Disabled destructive items stay the library Disabled (grey, as the code).
    if ((/fo-intent-menu__item|menuitem|menu-item/i.test(name)) && /^(Elimin[ăa](\s|$)|Șterge|Retrag|Anulare|Anulează programarea|Dezactivează|Inactivează|Revocă|Suspendă contul)/.test(txt) && h <= 48) {
      const i = P.danger.createInstance();
      const pr = i.componentProperties; const kL = Object.keys(pr).find((k) => k.startsWith("Label#")); const kI = Object.keys(pr).find((k) => k.startsWith("Icon#"));
      i.setProperties({ [kL]: txt, [kI]: /^Retrag/.test(txt) ? "12268:364503" : /^(Dezactivează|Inactivează|Suspendă)/.test(txt) ? "211:5345" : /^Anulează programarea/.test(txt) ? "10438:35230" : "489:3163" });
      const touch = await g("12268:364528"); const vId = touch.findAll((x) => x.type === "VECTOR")[0].fills[0].boundVariables.color.id; const v = await figma.variables.getVariableByIdAsync(vId);
      for (const vec of i.findAll((x) => /VECTOR|BOOLEAN_OPERATION/.test(x.type))) { const r = v.resolveForConsumer(vec).value; const paint = figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: r.r, g: r.g, b: r.b } }, "color", v); if (vec.fills.length) vec.fills = [paint]; if (vec.strokes.length) vec.strokes = [paint]; }
      i.name = "Item · " + txt + " (danger)"; place(f, i, true); done.push("menu-danger"); continue;
    }
    if (/^Button - Mai multe acțiuni/.test(name)) { const i = P.menu.clone(); i.name = "btn · ⋮"; place(f, i); done.push("btn-menu"); continue; }
    // 2026-10-25 (fo-qa-1440-v1) · rule-builder join switch „și ⌄ / sau ⌄” (code .e-permits-doc-kwselect: grey mono code token
    // + 16 chevron, 24 high, r4, 0 4 0 8, gap 4) → local „Rule builder / Combinator” 12957:2889 (State Default / Hover, TEXT Keyword)
    // 2026-10-25 (doc-pattern-v2) · FO / Ghișeu document field add buttons „Adaugă fișier” / „Adaugă document” (code
    // .e-permits-fo-doc-field__add / .e-permits-fo-add-doc-button = btn-secondary btn-md + icon-plus-large) → library
    // button-filled-rectangular Secondary Leading Medium 11607:4183 — its DEFAULT icon is already 20/plus-large: set only the
    // label (setting the Leading Icon prop to the local 5:930 glyph paints it black; a swap from Primary keeps a dark icon
    // override that resetOverrides() does not clear → always a fresh createInstance()).
    if ((/fo-doc-field__add|fo-add-doc-button/.test(name) || (/^Button - Adaugă (fișier|document)$/.test(name))) && /^Adaugă (fișier|document)$/.test(txt.trim()) && h <= 48) {
      const i = (await g("11607:4183")).createInstance(); setLabel(i, txt.trim()); i.name = "btn · " + txt.trim(); place(f, i); done.push("btn-add-doc"); continue;
    }
    // 2026-10-26 (calendar-views-board-v1) · BO registry „Listă / Calendar” view switch (code GEAPViewSwitch, radiogroup
    // „Mod de afișare a calendarului” > „Radio Button - Listă / Calendar”, track 40) → local „View switch” (id in root
    // plugin data calv/ids.viewSwitch; exposed „Item · Listă” / „Item · Calendar”, State Selected = the dark item).
    if (/^Mod de afișare/.test(name) && h <= 48 && f.children && f.children.some((x) => /^Radio Button - /.test(x.name))) {
      const cv = JSON.parse(figma.root.getSharedPluginData("calv", "ids") || "{}"); const vs = cv.viewSwitch && (await g(cv.viewSwitch));
      if (vs) { const sel = f.children.find((x) => /^Radio Button - /.test(x.name) && Array.isArray(x.fills) && x.fills.some((p) => p.visible !== false && p.type === "SOLID" && p.color.r < 0.3));
        const i = vs.createInstance(); i.name = "View switch"; place(f, i);
        const cal = sel && /Calendar/.test(sel.name); i.findOne((x) => x.name === "Item · Listă").setProperties({ State: cal ? "Default" : "Selected" }); i.findOne((x) => x.name === "Item · Calendar").setProperties({ State: cal ? "Selected" : "Default" });
        done.push("view-switch"); continue; }
    }
    if (/^Button - Combin/.test(name) && h <= 28) { const set = await g("12957:2889"); const i = set.children.find((c) => c.name === "State=Default").createInstance(); const k = Object.keys(set.componentPropertyDefinitions).find((x) => x.startsWith("Keyword")); i.setProperties({ [k]: txt.replace(/\s+/g, " ").trim() || "și" }); i.name = "Combinator"; place(f, i); done.push("combinator"); continue; }
    // 2026-10-25 (pd-board-v2) · Process Designer segmented controls (local, the library has one size): the toolbar view
    // switch (3 icon-only „Button - Diagramă / Doar vizualizare / Vizualizare listă”, track 40) → „Segmented control ·
    // View switch” (set id in root plugin data pdv2/ids.viewSwitch; View = the item with the dark fill), and the header mode
    // switch (Editare / Schemă JSON / Setări generale, track 32) → „Segmented control · Compact”. Run pdv2/segfix after.
    {
      const kidNames = (f.children || []).map((x) => x.name.replace(/^Button - /, ""));
      const pdIds = JSON.parse(figma.root.getSharedPluginData("pdv2", "ids") || "{}");
      if (pdIds.viewSwitch && kidNames.join("|") === "Diagramă|Doar vizualizare|Vizualizare listă") {
        const dark = (f.children || []).findIndex((x) => Array.isArray(x.fills) && x.fills[0] && x.fills[0].color && x.fills[0].color.r < 0.2);
        const set = await g(pdIds.viewSwitch); const view = ["Diagram", "Read-only", "List"][Math.max(0, dark)];
        const i = set.children.find((c) => c.name === "View=" + view).createInstance(); i.name = "View switch"; place(f, i); done.push("pd-view-switch"); continue;
      }
      if (pdIds.segCompact && kidNames.join("|") === "Editare|Schemă JSON|Setări generale") {
        const i = (await g(pdIds.segCompact)).createInstance(); i.name = "Mode"; place(f, i); done.push("pd-modes"); continue;
      }
    }
    if (/^(RSSP|SIA GEAP|Inactiv|Nepublicat|Tabel|Configurat)$/.test(txt) && h <= 24 && f.children?.length === 1 && f.children[0].type === "TEXT") {
      const i = V(C.tag, { "Type": "Subtle", "Style": txt === "SIA GEAP" ? "Brand" : "Neutral", "Icon": "None", "Size": "Small" }).createInstance();
      i.setProperties({ "⌨️ Label#387:32": txt }); i.name = "tag · " + txt; place(f, i); done.push("tag"); continue;
    }
  }
  for (const i of fields) await absorbField(i);
  // code tokens: the capture brings the system mono font → the design system's JetBrains Mono
  for (const t of root.findAll((x) => x.type === "TEXT")) { const segs = t.getStyledTextSegments(["fontName"]); if (segs.some((s) => /Mono|Menlo|Consolas/.test(s.fontName.family) && s.fontName.family !== "JetBrains Mono")) { t.fontName = { family: "JetBrains Mono", style: "Regular" }; done.push("mono"); } }
  const left = root.findAll((n) => n.type === "FRAME" && (/^(Button\b|Button - |Text Input)/.test(n.name) || (n.name === "message" && n.findOne((x) => x.name === "banner__icon")))).map((n) => `${n.name.slice(0, 40)} (${n.id})`);
  const counts = {}; done.forEach((d) => { counts[d] = (counts[d] || 0) + 1; });
  report[rid] = { counts, unmapped: left.slice(0, 20), innerShadow: await globalThis.NO_INNER_SHADOW([root]) }; // no INNER_SHADOW anywhere (2026-10-24)
}
return report;
