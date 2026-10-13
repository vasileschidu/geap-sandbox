// EVO Cabinet captures → library instances, for the FOD-Components-flow file (pvDAJPXKyUuJgz3P921Ye8).
// The GEAP 2.0 scripts (swap-cabinet.js, swap-cabinet-overlays.js) use node ids that exist only in the
// GEAP 2.0 file; this one imports every library component BY KEY (library „Components” lk-03f…, icons
// „Foundations” lk-e9e8…) and uses the local header set „Cabinet / Antet” 649:7540 (frame
// „Componente · EVO Cabinet (local)” 649:7396, page ↳ Requestor). Paste as the `code` of use_figma after
// setting ROOTS, then paste tools/figma/tokenize.js at //TOKENIZE. Retry-safe (only raw frames are touched).
//
// Maps: Header → Cabinet / Antet (Sesiune, Titlu, Nume, Rol) · Search Input → search-input-rectangular ·
// status/category chips (Tab, 40px, round) → filter-chip (Mode On = dark) · buttons by fill/radius/height →
// button-filled-rectangular / -circular / button-text-rectangular (+ icons by label) · ⋮ → text-rect Strict
// Icon=Only (State=Focus while its menu is open) · open ⋮ menu → contextual-menu (Leading Element=Icon) ·
// pager → .pagination-item + chevron buttons · status tags → tag-filled Small · copy-number → hug + 20/copy ·
// mask icons that capture as black squares (authority) → local „Icon / Cabinet / autoritate”.
const ROOTS = ["PUT:CAPTURE-ROOT-IDS"];
const page = figma.currentPage;
const g = (id) => figma.getNodeByIdAsync(id);
for (const f of [["Onest", "Regular"], ["Onest", "Medium"], ["Onest", "SemiBold"]]) await figma.loadFontAsync({ family: f[0], style: f[1] });
const KS = { tag: "a97109f9ebf668fb7616cb37e46929fc75ed9070", rect: "2cbe2c350e7c6b3948dc449660ede8355511c384", textRect: "4ad2518c34b8b51d5113119316eac5934c1eb9fb", circ: "fcf938f6ce9e31ae7f0f11838ee889335b4b7728", search: "a27b4efaed053f6cd4a57411a032d7391174c425", chip: "9901c4588e6e177c05302554597d7b4324d9fdc1", pagination: "f7149ae3d1e133f687b1677ac366006e73ad89b3" };
const C = {}; for (const [k, key] of Object.entries(KS)) C[k] = await figma.importComponentSetByKeyAsync(key);
const MENU = await figma.importComponentByKeyAsync("eca4c78b40aec0ddac890e7f006907d81868c1ab");
const IK = { filter: "d7ef1839769646e2b2d27b2a54d4b38787bcd775", more: "8eeb6ea4a1096422cb88f9859ed243e6ec189d4d", ext: "8df5d4b1610d9e9457096f9f2f5bc2ec864c5275", edit: "bef76865a142fa255aebe7a98f7a0411943e8c29", card: "aca711a43986722b21edbab93c36fc4a14991ba4", download: "e6dd0e9760c7ba23fc5b98fd6153954b6fbbbf3e", copy: "89c577ec6b8f893a92741093af50a237eb383016", eye: "faa2ea508755b47b8354bf6bb7d659776a525294", cross: "3ccb9372951f0b3c922b004d8966a680404cd11f", left: "ab64d0faf05f5d237524e6d64a20387f826382b5", right: "d5d6c61279d8018dd0bd8c4015a52d2a394d5324", down: "a9d10e062692212dde688d564b091a62be22d2f7" };
const ICC = {}; const ic = async (k) => (ICC[k] ||= await figma.importComponentByKeyAsync(IK[k]));
const ANTET = await g("649:7540");
const V = (set, want) => set.children.find((c) => Object.entries(want).every(([k, v]) => c.name.includes(`${k}=${v}`)));
const prop = (i, s) => Object.keys(i.componentProperties).find((k) => k.startsWith(s));
const textOf = (n) => (n.type === "TEXT" ? n.characters : n.findAll ? n.findAll((x) => x.type === "TEXT").map((x) => x.characters).join(" ").trim() : "");
const fill0 = (n) => { const f = n.fills && n.fills !== figma.mixed && n.fills.find((p) => p.visible !== false && p.type === "SOLID"); return f ? f.color : null; };
const isDark = (c) => c && c.r < 0.25 && c.g < 0.25 && c.b < 0.25;
const isBlue = (c) => c && c.b > 0.6 && c.r < 0.3;
const place = (old, inst, fill) => { const p = old.parent, i = p.children.indexOf(old); p.insertChild(i, inst); if (p.layoutMode && p.layoutMode !== "NONE") { if (fill) { try { inst.layoutSizingHorizontal = "FILL"; } catch (e) {} } } else { inst.x = old.x; inst.y = old.y; } old.remove(); return inst; };
const tagStyle = (label) => /^(Spre achitare|Informații suplimentare|Necesită atenție|Suspendat)$/.test(label) ? ["Strong", "Accent"]
  : /^(În derulare|Depusă|În examinare)$/.test(label) ? ["Subtle", "Brand"]
  : /^(Finalizat|Online|Achitat|Valabil|Aprobat|Emis)$/.test(label) ? ["Subtle", "Success"]
  : /^(Respins|Anulat|Retras|Eroare)$/.test(label) ? ["Subtle", "Danger"]
  : /^Obligatoriu$/.test(label) ? ["Strong", "Neutral"] : ["Subtle", "Neutral"];
const mkTag = (label) => { const [t, s] = tagStyle(label); const i = (V(C.tag, { "Type": t, "Style": s, "Icon": "None", "Size": "Small" }) || V(C.tag, { "Type": "Subtle", "Style": "Neutral", "Icon": "None", "Size": "Small" })).createInstance(); i.setProperties({ [prop(i, "⌨️ Label")]: label }); i.name = "tag · " + label; return i; };
const isTagFrame = (n) => n.type === "FRAME" && n.cornerRadius === 4 && Math.round(n.height) >= 18 && Math.round(n.height) <= 26 && n.children && n.children.length === 1 && (n.children[0].type === "TEXT" || (n.children[0].children && n.children[0].children.length === 1 && n.children[0].children[0].type === "TEXT"));
const setIcon = async (i, slot, key, size) => { const k = prop(i, slot + size); if (!k) return false; const comp = await ic(key); i.setProperties({ [k]: comp.id }); if (size === "16") for (const n of i.findAll((x) => x.type === "INSTANCE" && x.mainComponent && x.mainComponent.id === comp.id)) n.resize(16, 16); return true; };
const iconFor = (label) => /^Filtre$/.test(label) ? "filter" : /^Sortează$|pe pagină$/.test(label) ? "down" : /^Solicită online$/.test(label) ? "ext" : /^(Continuă|Suplinire|Suplinește|Completează)/.test(label) ? "edit" : /^Achit/.test(label) ? "card" : /^Descarcă/.test(label) ? "download" : /^Vezi/.test(label) ? "eye" : null;
// local authority icon (CSS mask in code → black square in the capture)
let AUTH = page.findOne((n) => n.type === "COMPONENT" && n.name === "Icon / Cabinet / autoritate");
if (!AUTH) { const holder = await g("649:7396"); const svg = figma.createNodeFromSvg('<svg width="16" height="16" viewBox="-0.7 -1.9 20 17.4" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.75 12.8333H1.58333M17.8333 12.8333H17M17 12.8333V6.08333C17 4.97876 16.1046 4.08333 15 4.08333H13.6667M17 12.8333H13.6667M13.6667 4.08333V12.8333M13.6667 4.08333V2.75C13.6667 1.64543 12.7712 0.75 11.6667 0.75H6.91667C5.8121 0.75 4.91667 1.64543 4.91667 2.75V4.08333M13.6667 12.8333H11.1667M4.91667 12.8333V4.08333M4.91667 12.8333H1.58333M4.91667 12.8333H7.41667M4.91667 4.08333H3.58333C2.47876 4.08333 1.58333 4.97876 1.58333 6.08333V12.8333M7.41667 12.8333V10.9583C7.41667 9.9228 8.25613 9.08333 9.29167 9.08333C10.3272 9.08333 11.1667 9.9228 11.1667 10.9583V12.8333M7.41667 12.8333H11.1667" stroke="#121212" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'); holder.appendChild(svg); svg.resize(16, 16); AUTH = figma.createComponentFromNode(svg); AUTH.name = "Icon / Cabinet / autoritate"; AUTH.fills = []; }
const pagItemSet = (() => { const p0 = C.pagination.children[0].createInstance(); const pi = p0.findOne((n) => n.type === "INSTANCE" && /pagination-item/.test(n.mainComponent.name + (n.mainComponent.parent ? n.mainComponent.parent.name : ""))); const s = pi ? (pi.mainComponent.parent.type === "COMPONENT_SET" ? pi.mainComponent.parent : pi.mainComponent) : null; p0.remove(); return s; })();
const report = {};
for (const rid of ROOTS) {
  const root = await g(rid); const done = []; const push = (k) => done.push(k);
  const own = (n) => { let q = n.parent; while (q && q !== root) { if (q.type === "INSTANCE") return false; q = q.parent; } return true; };
  const ra = (pred) => root.findAll((n) => pred(n) && own(n));
  const absOf = (n) => ({ x: n.absoluteTransform[0][2] - root.absoluteTransform[0][2], y: n.absoluteTransform[1][2] - root.absoluteTransform[1][2] });
  // 0 · open ⋮ menu → contextual-menu, absolute on the root (the capture clips it inside the card)
  let openNr = null;
  for (const m of ra((n) => n.type === "FRAME" && /^Menu - /.test(n.name))) {
    const items = m.findAll((k) => /^Menu Item/.test(k.name)); const pos = absOf(m);
    const inst = MENU.createInstance(); const keys = Object.keys(inst.componentProperties); const pp = {};
    for (let k = 1; k <= 6; k++) pp[keys.find((p) => p.startsWith("👁️ Option " + k + "#"))] = k <= items.length;
    pp[keys.find((p) => p.startsWith("👁️ Section Heading"))] = false; inst.setProperties(pp);
    for (let k = 0; k < Math.min(6, items.length); k++) {
      const opt = inst.findOne((c) => c.type === "INSTANCE" && c.name === "Option " + (k + 1)); const label = textOf(items[k]);
      const vI = opt.mainComponent.parent.children.find((c) => c.name.includes("Leading Element=Icon") && c.name.includes("State=Default")); if (vI) opt.swapComponent(vI);
      opt.setProperties({ [prop(opt, "Option Label")]: label });
      const key = /^Vezi/.test(label) ? "eye" : /^Descarcă/.test(label) ? "download" : /^Reperfect|^Prelung|^Duplicat/.test(label) ? "edit" : /^Retrag|^Anul|^Suspend/.test(label) ? "cross" : null;
      if (key) { const kk = prop(opt, "🔄 Leading Icon: 20"); if (kk) opt.setProperties({ [kk]: (await ic(key)).id }); }
    }
    openNr = m.name.replace(/^Menu - Acțiuni pentru /, "");
    root.appendChild(inst); inst.layoutPositioning = "ABSOLUTE"; inst.x = Math.round(pos.x); inst.y = Math.round(pos.y); inst.name = "Meniu ⋮ · " + openNr.slice(0, 40); m.remove(); push("menu");
  }
  // 1 · header → Cabinet / Antet
  for (const hdr of ra((n) => n.type === "FRAME" && n.name === "Header" && Math.round(n.height) === 104)) {
    const prof = hdr.findOne((n) => /^Button - Deschide meniul profilului/.test(n.name));
    const v = ANTET.children.find((c) => c.name === "Sesiune=" + (prof ? "Autentificat" : "Vizitator")); const i = v.createInstance();
    const title = hdr.findAll((n) => n.type === "TEXT").find((t) => /^(Solicitările mele|Catalogul serviciilor|Actele mele permisive)$/.test(t.characters));
    const pp = { [prop(i, "Titlu")]: title ? title.characters : "" };
    if (prof) { const tx = prof.findAll((n) => n.type === "TEXT").map((t) => t.characters).filter((s) => s.length > 3); if (tx[0]) pp[prop(i, "Nume")] = tx[0]; if (tx[1]) pp[prop(i, "Rol")] = tx[1]; }
    i.setProperties(pp); i.name = "Cabinet / Antet"; place(hdr, i, true); push("antet");
  }
  // 2 · search
  for (const s of ra((n) => n.type === "FRAME" && /^Search Input/.test(n.name))) {
    if (s.removed) continue; const w = Math.round(s.width); const t = s.findOne((x) => x.type === "TEXT"); const val = t ? t.characters : ""; const filled = t && isDark(fill0(t));
    const i = V(C.search, { "State": filled ? "Filled" : "Default", "Size": "Medium", "Button": "False" }).createInstance();
    i.setProperties({ [prop(i, "⌨️ Placeholder")]: val || "Caută", [prop(i, "👁️ Label")]: false, [prop(i, "👁️ Clear Button")]: false, [prop(i, "👁️ Assistive Text")]: false });
    i.name = "search"; place(s, i); try { i.layoutSizingHorizontal = "FIXED"; } catch (e) {} i.resize(w, i.height); push("search");
  }
  // 3 · chips (status / category filters)
  for (const b of ra((n) => n.type === "FRAME" && n.name === "Tab" && Math.round(n.height) === 40 && n.cornerRadius >= 999)) {
    if (b.removed) continue; const tx = b.findAll((t) => t.type === "TEXT").map((t) => t.characters.trim()).filter(Boolean); const label = tx[0] || ""; const num = tx.find((s, k) => k > 0 && /^\d+$/.test(s));
    const on = isDark(fill0(b)); const i = V(C.chip, { "Mode": on ? "On" : "Off", "State": "Default", "Icon": "None" }).createInstance();
    i.setProperties({ [prop(i, "⌨️ Label")]: label, [prop(i, "👁️ Counter Badge")]: Boolean(num) });
    if (num) { const bt = i.findAll((n) => n.type === "TEXT" && n.visible).filter((t) => t.characters !== label).pop(); if (bt) { await figma.loadFontAsync(bt.fontName); bt.characters = num; } }
    i.name = "chip · " + label; place(b, i); push("chip");
  }
  // 4 · pager
  const pager = root.findOne((n) => /^Navigation - Paginarea/.test(n.name) && own(n));
  if (pager) for (const k of [...pager.children]) {
    if (/^Button - Pagina (anterioară|următoare)/.test(k.name)) {
      const prev = /anterioară/.test(k.name); const i = V(C.textRect, { "Style": "Strict", "Icon": "Only", "Size": "Medium", "State": prev ? "Disabled" : "Default" }) ? V(C.textRect, { "Style": "Strict", "Icon": "Only", "Size": "Medium", "State": prev ? "Disabled" : "Default" }).createInstance() : V(C.textRect, { "Style": "Strict", "Icon": "Only", "Size": "Medium", "State": "Default" }).createInstance();
      await setIcon(i, "🔄 Leading Icon: ", prev ? "left" : "right", "20"); i.name = prev ? "btn · pagina anterioară" : "btn · pagina următoare"; place(k, i); push("pager-btn");
    } else if (k.type === "FRAME" && /^\d+$/.test(textOf(k)) && pagItemSet) {
      const on = isBlue(fill0(k)); const v = pagItemSet.type === "COMPONENT_SET" ? (pagItemSet.children.find((c) => c.name.includes(on ? "Type=Selected" : "Type=Unselected") && /State=Default/.test(c.name)) || pagItemSet.children[0]) : pagItemSet;
      const i = v.createInstance(); const t = i.findOne((x) => x.type === "TEXT"); if (t) { await figma.loadFontAsync(t.fontName); t.characters = textOf(k); } i.name = "page · " + textOf(k); place(k, i); push("pager-item");
    }
  }
  // 5 · ⋮ triggers
  for (const b of ra((n) => n.type === "FRAME" && /^Button - Acțiuni/.test(n.name) && Math.round(n.width) === 32)) {
    if (b.removed) continue; const open = Boolean(openNr && b.name.includes(openNr.slice(0, 20))); // captured ⋮ all carry a stroke — only the menu's own trigger is open
    const v = V(C.textRect, { "Style": "Strict", "Icon": "Only", "Size": "Small", "State": open ? "Focus" : "Default" }) || V(C.textRect, { "Style": "Strict", "Icon": "Only", "Size": "Small", "State": "Default" });
    const i = v.createInstance(); await setIcon(i, "🔄 Leading Icon: ", "more", "16"); i.name = open ? "btn · ⋮ (meniu deschis)" : "btn · ⋮"; place(b, i); push(open ? "more-open" : "more");
  }
  // 6 · buttons / button-links
  for (const b of ra((n) => n.type === "FRAME" && /^(Button|Link)$/.test(n.name) && n.height >= 30 && n.height <= 52 && n.cornerRadius >= 4 && n.findOne && n.findOne((t) => t.type === "TEXT"))) {
    if (b.removed) continue; const label = textOf(b); if (!label || label.length > 60 || /^\d+$/.test(label)) continue;
    const kids = b.children; const hasIc = kids[0] && kids[0].name === "Icon"; const trailing = !hasIc && kids.length > 1 && kids[kids.length - 1].name === "Icon";
    const fc = fill0(b); const tc = fill0(b.findOne((t) => t.type === "TEXT")); const round = b.cornerRadius >= 999;
    const size = b.height >= 46 ? "Large" : b.height >= 38 ? "Medium" : "Small"; const px = size === "Small" ? "16" : "20";
    let set, style; if (isBlue(fc)) { set = round ? C.circ : C.rect; style = "Primary"; } else if (fc && fc.r > 0.8 && fc.r < 0.99) { set = round ? C.circ : C.rect; style = "Neutral"; } else { set = C.textRect; style = isBlue(tc) ? "Primary" : "Strict"; }
    const ik = (hasIc || trailing) ? iconFor(label) : null; const mode = ik ? (hasIc ? "Leading" : "Trailing") : "None";
    const v = V(set, { "Style": style, "Icon": mode, "Size": size, "State": "Default" }) || V(set, { "Style": style, "Icon": "None", "Size": size, "State": "Default" }); if (!v) { push("no-variant:" + label.slice(0, 20)); continue; }
    const i = v.createInstance(); i.setProperties({ [prop(i, "⌨️ Label")]: label });
    if (ik) await setIcon(i, hasIc ? "🔄 Leading Icon: " : "🔄 Trailing Icon: ", ik, px); else if (hasIc || trailing) push("icon-missing:" + label.slice(0, 24));
    i.name = "btn · " + label.slice(0, 40); place(b, i); push("btn");
  }
  // 7 · copy-number buttons → hug row + 20/copy at 16
  for (const b of ra((n) => n.type === "FRAME" && /^Button - Copiază/.test(n.name))) {
    if (b.removed) continue; b.layoutMode = "HORIZONTAL"; b.itemSpacing = 4; b.counterAxisAlignItems = "CENTER"; b.primaryAxisSizingMode = "AUTO"; b.counterAxisSizingMode = "AUTO";
    const icn = b.children.find((k) => k.name === "Icon"); if (icn) { const ci = (await ic("copy")).createInstance(); ci.resize(16, 16); ci.name = "icon · copiază"; b.insertChild(b.children.indexOf(icn), ci); icn.remove(); }
    for (const k of b.children) { if (k.type === "FRAME") { try { k.layoutSizingHorizontal = "HUG"; } catch (e) {} } } b.name = "Număr (copiază)"; push("copy");
  }
  // 8 · status tags
  for (const f of ra(isTagFrame)) { if (f.removed) continue; place(f, mkTag(textOf(f))); push("tag"); }
  // 9 · mask icons captured as black squares
  for (const f of ra((n) => (n.type === "FRAME" || n.type === "RECTANGLE") && Math.round(n.width) === Math.round(n.height) && n.width >= 14 && n.width <= 20 && fill0(n) && fill0(n).r < 0.35 && fill0(n).g < 0.35 && !(n.children && n.children.length))) { // captured as #444 (currentColor), not #000
    if (f.removed) continue; const i = AUTH.createInstance(); i.resize(Math.round(f.width), Math.round(f.height)); i.name = "icon · autoritate"; place(f, i); push("authority-icon");
  }
  const left = ra((n) => n.type === "FRAME" && /^(Button\b|Button - |Search Input|Link\b|Tab\b|Menu|Dialog)/.test(n.name) && n.height > 24).map((n) => `${n.name.slice(0, 36)} ${Math.round(n.width)}x${Math.round(n.height)} (${n.id})`);
  const counts = {}; done.forEach((d) => { counts[d] = (counts[d] || 0) + 1; });
  report[rid] = { counts, unmapped: left.slice(0, 20), more: Math.max(0, left.length - 20) };
}
//TOKENIZE
const __roots = []; for (const r of ROOTS) __roots.push(await g(r));
const __tok = typeof TOKENIZE === "function" ? await TOKENIZE(__roots) : null;
return { swap: report, tokens: __tok };
