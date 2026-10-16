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
//   tabs.js     raw „Tab List” of .tab-item-md → library tabs (Tabs Count 2–8)
//   topbar.js   raw gov bar „header-evo-desktop” → library .top-section
//   modal.js    local Modal → library modal (content-slot Text / swapped content)
//   side.js / orphans.js / icons.js / btnrebuild.js — sidebar items, orphaned local copies, captured icons, button icons
// Document rows / cards / document modal (2026-10-14): tools/figma/documents/ (swap-raw-rows.js for captured
// „List Item” doc rows with a 24px „Image” lead → local „Document · rând” 11362:7113; place-cards.js for FO / Cabinet
// doc cards → „Document · card” 11364:7441; imgicons.js for icon-sized IMAGE fills → library icons). Never keep a
// captured <img> icon as an image fill.
// Act rows + „Solicitare nouă” (2026-10-16, FO „Ce vrei să soliciți?” / Ghișeu „Ce se solicită?”, foActRowHtml): captured
// „List Item” / „fo-intent-act” / „.role-switch-item” cards with an „Inițiază un postproces” pill → local „Act row” 11846:340996
// (+ „Post-process menu” 11844:340693, „New request card” 11848:340913) via tools/figma/act-row/ (measure-act-rows.mjs →
// build-spec.py → swap-act-rows.js; intent-surroundings.js for the card / „sau” divider / text styles; build-act-row-copy.js
// rebuilds the family in FOD / EVO Cabinet from library keys). Never leave the captured 24px „Image” doc icon (PNG fill).
// BO workplace registries (2026-10-15, `.e-permits-workplace`: toolbar search / Filtrare avansată / export / primary,
// status tabs, sortable headers, status tags, „Editează” + ⋮, pager, rows-per-page, mobile avatar):
// tools/figma/swap-workplace-registry.js (protos from the Classifiers board; export = local 20/export 10784:265036).
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
  sw: await g("2009:19057"),            // switch (inner of svc/switch-label)
  msg: await g("9845:17951"),           // Message · subtle (Tone Success/Info/Warning/Error; Text#9845:5) — every in-page notice
};
const SMALL_500 = await figma.importStyleByKeyAsync("057521fde838188af42abf69eb3789f676421047"); // Desktop/Body/Small 500 (bold lead)
const P = {
  edit: await g("10317:33373"),         // „Editează” Neutral Small with pen
  menu: await g("10317:33419"),         // ⋮ Strict Icon-only Small (also × after icon swap)
  add: await g("10316:33412"),          // Secondary Small + plus („Adaugă …”)
  cross: await g("242:12038"),          // 20/cross-small
  switchLabel: await g("9563:18803"),   // svc/switch-label
  infoNote: await g("9624:13362"),      // svc/info-note
  person: "6502:74649", suitcase: "10641:1308",
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
    if (/^Button - Elimină/.test(name) && w === 32) { const i = P.menu.clone(); i.children[0]?.swapComponent(P.cross); i.name = "btn · ×"; place(f, i); done.push("btn-x"); continue; }
    if (name === "Button" && /^Adaugă (condiție)$/.test(txt)) { const i = V(C.textCirc, { "Style": "Primary", "Icon": "Leading", "Size": "Small", "State": "Default" }).createInstance(); setLabel(i, txt); i.name = "btn · " + txt; place(f, i); done.push("btn-text"); continue; }
    if (name === "Button" && /^Adaugă /.test(txt) && h <= 32) { const i = P.add.clone(); setLabel(i, txt); i.name = "btn · " + txt; place(f, i); done.push("btn-add"); continue; }
    if (name === "Button" && h === 40 && /^(Anulează|Salvează|Închide|Aplică|Renunță|Dezactivează|Elimină|Activează|Adaugă \S+)$/.test(txt)) {
      const st = /^(Anulează|Închide|Renunță)$/.test(txt) ? "Neutral" : /^(Dezactivează|Elimină)$/.test(txt) ? "Destructive" : "Primary";
      const i = V(C.circ, { "Style": st, "Icon": "None", "Size": "Large", "State": "Default" }).createInstance(); setLabel(i, txt); i.name = "btn · " + txt; place(f, i); done.push("btn-footer"); continue;
    }
    // parameter tokens ({NR:4}, {YYYY}…) = Neutral Small button with a code (mono) label
    if (/^Button - Inserează/.test(name)) { const i = V(C.rect, { "Style": "Neutral", "Icon": "None", "Size": "Small", "State": "Default" }).createInstance(); setLabel(i, txt); for (const t of i.findAll((x) => x.type === "TEXT")) { await figma.loadFontAsync(t.fontName); t.fontName = { family: "JetBrains Mono", style: "Regular" }; } i.name = "btn · " + txt; place(f, i); done.push("btn-token"); continue; }
    if (name === "Button" && txt === "Elimină" && h <= 32) { const i = V(C.textCirc, { "Style": "Destructive", "Icon": "None", "Size": "Small", "State": "Default" }).createInstance(); setLabel(i, txt); i.name = "btn · Elimină"; place(f, i); done.push("btn-remove"); continue; }
    if (name === "Button" && txt === "Editează") { const i = P.edit.clone(); i.name = "btn · Editează"; place(f, i); done.push("btn-edit"); continue; }
    if (/^Button - Mai multe acțiuni/.test(name)) { const i = P.menu.clone(); i.name = "btn · ⋮"; place(f, i); done.push("btn-menu"); continue; }
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
  report[rid] = { counts, unmapped: left.slice(0, 20) };
}
return report;
