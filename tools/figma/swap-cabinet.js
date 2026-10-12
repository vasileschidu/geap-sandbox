// EVO Cabinet (front office) captures → library + local instances. Companion of swap-to-instances.js
// (that one maps BO controls). Paste this whole file as the `code` of mcp__figma-a__use_figma
// (fileKey aHgwVwiNCOSOqbMhMjjUOj) after replacing ROOTS, then paste tools/figma/tokenize.js below it
// and end with `return { swap: report, tokens: await TOKENIZE(roots, { mobile: MOBILE_ROOT }) }` — or
// run TOKENIZE in a second call. Returns per-root counts + the raw controls it could not map.
//
// Captures come from tools/figma/capture-to-figma.mjs --page cabinet-evo/index.html --width 1440.
// Layer names = accessible names of cabinet-evo (solicitari.js / catalog.js / cabinet-evo.js).
// Local components (page „↳ FO -> Full Flows - 09”, frame „Componente · EVO Cabinet (local)”):
//   Cabinet / Antet 11100:289066 · Cabinet / Dosar card 11100:289564 · Cabinet / Marcaj 11100:289209
//   Cabinet / Serviciu card 11105:290265 (catalog) · Cabinet / Dosar card mobil 11155:50155 · Cabinet / Dosar card · static 11152:303548 (sm-07b, by hand)
//   Cabinet / Antet mobil 11153:262259 (mobile header — replace the captured Header + nav by hand before this script)
// Run tools/figma/swap-cabinet-overlays.js FIRST (menus, tooltips, toasts, dialogs). The Figma text node
// „__swap-cabinet (builder, do not edit)” 11105:34597 holds this body (without the header) for
// `new AsyncFunction("ROOTS","MOBILE_ROOT","TOKEN", body.replace("//TOKENIZE", tokenizeText))(ids, false, true)`;
// tokenize v2 lives in „__tokenize v2 (builder, do not edit)” 11105:34598.
//   Icon / Cabinet / clock · avertizare 11100:289178 · clock · info 11100:289182 · card 11100:289186 · triangle 11100:289190
const ROOTS = ["PUT:CAPTURE-ROOT-IDS"];
const MOBILE_ROOT = false;   // true for 375 captures: mobile card set + Mobile heading styles
const TOKEN = true;          // run TOKENIZE (paste tools/figma/tokenize.js at //TOKENIZE below)
const g = (id) => figma.getNodeByIdAsync(id);
const L = {
  antet: await g("11100:289066"), card: await g("11100:289564"), marcaj: await g("11100:289209"),
  icW: await g("11100:289178"), icI: await g("11100:289182"), icCard: await g("11100:289186"), icTri: await g("11100:289190"),
};
const C = {
  tag: await g("10602:106194"),         // tag-filled (Small everywhere)
  chip: await g("1244:34029"),          // filter-chip
  search: await g("9285:37474"),        // search-input-rectangular
  textRect: await g("5749:34743"),      // button-text-rectangular (pager arrows, „10 pe pagină”, back link)
  rect: await g("5611:63230"),          // button-filled-rectangular
  more: await g("5611:63305"),          // ⋮ = filled-rectangular Neutral Icon=Only Medium (as Cabinet / Act card)
  moreIcon: await g("9521:7912"),       // 20/more-vertical
  pagItem: null,
};
const filterIcon = await figma.importComponentByKeyAsync("d7ef1839769646e2b2d27b2a54d4b38787bcd775"); // 20/filter
const pagSet = await g("9443:51201"); const CH = {};
{ const p0 = pagSet.children[0]; const pi = p0.findOne((n) => n.type === "INSTANCE" && n.name === ".pagination-item"); C.pagItem = pi.mainComponent.parent || pi.mainComponent;
  for (const n of p0.findAll((x) => x.type === "INSTANCE" && /^20\/chevron-(left|right)$/.test(x.mainComponent.name))) CH[n.mainComponent.name.endsWith("left") ? "left" : "right"] = n.mainComponent; }
for (const f of [["Onest", "Regular"], ["Onest", "Medium"], ["Onest", "SemiBold"]]) await figma.loadFontAsync({ family: f[0], style: f[1] });
const V = (set, want) => set.children.find((c) => Object.entries(want).every(([k, v]) => c.name.includes(`${k}=${v}`)));
const textOf = (n) => (n.type === "TEXT" ? n.characters : n.findAll ? n.findAll((x) => x.type === "TEXT").map((x) => x.characters).join(" ").trim() : "");
const loadAll = async (t) => { for (const s of t.getStyledTextSegments(["fontName"])) await figma.loadFontAsync(s.fontName); };
const texts = (n) => n.findAll((x) => x.type === "TEXT");
const fill0 = (n) => { const f = n.fills && n.fills !== figma.mixed && n.fills.find((p) => p.visible !== false && p.type === "SOLID"); return f ? f.color : null; };
const isDark = (c) => c && c.r < 0.25 && c.g < 0.25 && c.b < 0.25;
const isBlue = (c) => c && c.b > 0.6 && c.r < 0.3;
const isYellow = (c) => c && c.r > 0.9 && c.g > 0.8 && c.b < 0.8;
const prop = (i, start) => Object.keys(i.componentProperties).find((k) => k.startsWith(start));
const place = (old, inst, fill) => {
  const p = old.parent, i = p.children.indexOf(old); p.insertChild(i, inst);
  if (p.layoutMode && p.layoutMode !== "NONE") { if (fill) { try { inst.layoutSizingHorizontal = "FILL"; } catch (e) {} } } else { inst.x = old.x; inst.y = old.y; }
  old.remove(); return inst;
};
const tagStyle = (label) => /^(Spre achitare|Informații suplimentare|Necesită atenție)$/.test(label) ? ["Strong", "Accent"]
  : /^(În derulare|Depusă|În examinare)$/.test(label) ? ["Subtle", "Brand"]
  : /^(Finalizat|Online|Achitat|Valabil|Aprobat|Emis)$/.test(label) ? ["Subtle", "Success"]
  : /^(Respins|Anulat|Retras|Eroare)$/.test(label) ? ["Subtle", "Danger"]
  : /^Obligatoriu$/.test(label) ? ["Strong", "Neutral"] : ["Subtle", "Neutral"];
const mkTag = (label) => { const [t, s] = tagStyle(label); const i = V(C.tag, { "Type": t, "Style": s, "Icon": "None", "Size": "Small" }).createInstance(); i.setProperties({ "⌨️ Label#387:32": label }); i.name = "tag · " + label; return i; };
const isTagFrame = (n) => n.type === "FRAME" && n.cornerRadius === 4 && Math.round(n.height) >= 20 && Math.round(n.height) <= 26 && n.children && n.children.length === 1 && n.children[0].type === "TEXT";
const copySegments = async (from, to) => {
  // same text, same bold ranges (the deadline date is bold)
  for (const s of from.getStyledTextSegments(["fontName"])) { await figma.loadFontAsync(s.fontName); if (s.end <= to.characters.length) to.setRangeFontName(s.start, s.end, s.fontName); }
};
const report = {};
for (const rid of ROOTS) {
  const root = await g(rid); const done = [];
  const push = (k) => done.push(k);
  // never match layers inside instances we already placed (Cabinet / Antet has its own „Header”)
  const own = (n) => { let q = n.parent; while (q && q !== root) { if (q.type === "INSTANCE") return false; q = q.parent; } return n.type !== "INSTANCE" || true; };
  const rf = (pred) => root.findOne((n) => pred(n) && own(n));
  const ra = (pred) => root.findAll((n) => pred(n) && own(n));
  // 1 · header + compartment tabs → Cabinet / Antet
  const hdr = rf((n) => n.name === "Header" && n.type === "FRAME");
  const nav = rf((n) => /^Navigation - Compartimentele/.test(n.name));
  if (hdr) {
    const visitor = /Autentifică-te/.test(textOf(hdr));
    let tab = "Catalog";
    if (nav && !visitor) { const links = nav.findAll((n) => n.name === "Link"); const sel = links.find((l) => { const t = l.findOne((x) => x.type === "TEXT"); return t && isBlue(fill0(t)); }); const lt = sel ? textOf(sel) : ""; tab = /^Solicit/.test(lt) ? "Solicitări" : /^Actele/.test(lt) ? "Acte" : "Catalog"; }
    const v = L.antet.children.find((c) => c.name === `Sesiune=${visitor ? "Vizitator" : "Autentificat"}, Tab=${tab}`);
    const inst = v.createInstance(); inst.name = "Cabinet / Antet";
    const title = hdr.findOne((n) => n.name === "Heading 1"); if (title) inst.setProperties({ [prop(inst, "Titlu")]: textOf(title) });
    if (!visitor) {
      const prof = hdr.findOne((n) => /^Button - Deschide meniul profilului/.test(n.name));
      const pt = prof ? texts(prof).map((t) => t.characters).filter((s) => s.length > 3) : [];
      const rs = inst.findOne((n) => n.name === "Profil (role switch)");
      if (rs && pt.length) {
        const pf = /Persoană fizică/.test(pt.join(" ")); const mp = /MPower|Reprezentant|împuternicit/i.test(pt.join(" "));
        const want = rs.mainComponent.parent.children.find((c) => c.name.includes(`State=${pf ? "PF" : "PJ"}`) && c.name.includes("Type=Default") && c.name.includes(`MPower=${mp ? "True" : "False"}`));
        if (want) rs.swapComponent(want);
        const tt = texts(rs).filter((t) => t.visible && t.characters.length > 3).sort((a, b) => a.absoluteTransform[1][2] - b.absoluteTransform[1][2]);
        for (let k = 0; k < Math.min(tt.length, pt.length); k++) { await loadAll(tt[k]); tt[k].characters = pt[k]; }
      }
    }
    const p = hdr.parent; p.insertChild(p.children.indexOf(hdr), inst); try { inst.layoutSizingHorizontal = "FILL"; } catch (e) {}
    hdr.remove(); if (nav) nav.remove(); push("antet");
  }
  // 2 · search
  for (const s of ra((n) => n.type === "FRAME" && /^Search Input/.test(n.name))) {
    if (s.removed) continue;
    const wrap = s.parent && s.parent.children.length <= 3 && Math.round(s.parent.height) <= 44 ? s.parent : s; const w = Math.round(wrap.width); const hasClear = wrap.children && wrap.children.some((k) => /Șterge căutarea/.test(k.name));
    const t = s.findOne((x) => x.type === "TEXT"); const val = t ? t.characters : ""; const filled = t && isDark(fill0(t));
    const i = V(C.search, { "State": filled ? "Filled" : "Default", "Size": "Medium", "Button": "False" }).createInstance();
    i.setProperties({ [prop(i, "⌨️ Placeholder")]: val || "Caută", [prop(i, "👁️ Label")]: false, [prop(i, "👁️ Clear Button")]: Boolean(hasClear) });
    i.name = "search"; place(wrap, i); i.layoutSizingHorizontal = "FIXED"; i.resize(w, i.height); push("search");
  }
  // 3 · toolbar chips (Filtre / Sortează) and status chips
  for (const b of ra((n) => n.type === "FRAME" && (n.name === "Button" || n.name === "Tab") && Math.round(n.height) === 40)) {
    if (b.removed) continue;
    const tx = texts(b).map((t) => t.characters.trim()).filter(Boolean); const label = tx[0] || ""; const num = tx.find((s, k) => k > 0 && /^\d+$/.test(s));
    const isFilter = b.name === "Button" && /^Filtre$/.test(label), isSort = b.name === "Button" && /^Sortează$/.test(label), isTab = b.name === "Tab";
    if (!isFilter && !isSort && !isTab) continue;
    const sel = isDark(fill0(b));
    const i = V(C.chip, { "State": sel ? "Selected" : "Unselected", "Type": "Mono Selection", "Icon": isFilter ? "Leading" : isSort ? "Trailing" : "None" }).createInstance();
    const pp = { [prop(i, "⌨️ Label")]: label, [prop(i, "👁️ Counter Badge")]: Boolean(num) };
    i.setProperties(pp);
    if (num) { const bt = i.findOne((n) => n.name === "Badge label"); if (bt) { await loadAll(bt); bt.characters = num; } }
    if (isFilter) { const li = i.findAll((n) => n.type === "INSTANCE" && /^(20|16)\//.test(n.mainComponent.name))[0]; if (li) li.swapComponent(filterIcon); }
    i.name = "chip · " + label; place(b, i); push("chip");
  }
  // 4 · dosar cards
  for (const a of ra((n) => n.type === "FRAME" && /^Article - /.test(n.name))) {
    const nrT = a.findOne((n) => n.type === "TEXT" && /^GEAP-\d{4}-/.test(n.characters));
    if (a.removed || !nrT || !a.findOne((n) => n.name === "Heading 2")) continue; // dosar cards only (catalog cards have no GEAP nr)
    const head = a.findOne((n) => n.name === "Heading 2"); const title = textOf(head);
    const para = head.parent.children.find((k) => k.name === "Paragraph"); const svc = para ? textOf(para) : "";
    // meta row: authority · Depusă/Creată date · nr (the copy button is flattened when the row wraps)
    const dateT = a.findOne((n) => n.type === "TEXT" && /^(Depusă|Creată|Depus|Creat) /.test(n.characters));
    const meta = dateT ? dateT.parent.parent : nrT.parent.parent;
    const authT = meta.children[0] && meta.children[0].findOne ? meta.children[0].findOne((x) => x.type === "TEXT") : null;
    const mtexts = [authT ? authT.characters : "", dateT ? dateT.characters : ""];
    const nr = nrT.characters;
    const tagF = a.findOne(isTagFrame) || a.findOne((n) => n.type === "INSTANCE" && /^tag · /.test(n.name)); const status = tagF ? textOf(tagF) : "";
    const strip = a.findOne((n) => n.type === "FRAME" && n.cornerRadius === 8 && n.layoutMode === "HORIZONTAL" && n.paddingLeft === 12 && n !== a);
    const mark = a.findOne((n) => n.type === "FRAME" && n.children && n.children.length === 2 && n.children[0].name === "Icon" && n.children[1].type === "TEXT" && /^(Aprobat|Respins|Disponibilă aprobarea tacită)$/.test(n.children[1].characters));
    const warn = strip && isYellow(fill0(strip));
    const variant = strip ? (warn ? "Tip=Termen · avertizare" : "Tip=Termen · info") : "Tip=Finalizat";
    const i = (MOBILE_ROOT ? await g("11155:50155") : L.card).children.find((c) => c.name === variant).createInstance();
    i.setProperties({ [prop(i, "Titlu")]: title, [prop(i, "Serviciu")]: svc, [prop(i, "Autoritate")]: mtexts[0] || "", [prop(i, "Data")]: mtexts[1] || "", [prop(i, "Număr")]: nr, [prop(i, "Marcaj")]: Boolean(mark) });
    const st = i.findOne((n) => n.name === "Statut"); const [tt, ss] = tagStyle(status); st.swapComponent(V(C.tag, { "Type": tt, "Style": ss, "Icon": "None", "Size": "Small" })); st.setProperties({ "⌨️ Label#387:32": status });
    if (mark) { const mt = mark.children[1].characters; i.findOne((n) => n.name === "Marcaj").swapComponent(L.marcaj.children.find((c) => c.name === "Tip=" + (/Respins/.test(mt) ? "Respins" : /tacit/.test(mt) ? "Tacit" : "Aprobat"))); }
    if (strip) {
      const src = strip.findOne((x) => x.type === "TEXT"); const dst = i.findOne((n) => n.name === "Termen text");
      await loadAll(dst); dst.characters = src.characters; await copySegments(src, dst);
      const ic = i.findOne((n) => n.name === "icon · termen"); const s = src.characters;
      ic.swapComponent(/^Achitați/.test(s) ? L.icCard : /^Trimiteți/.test(s) ? L.icTri : warn ? L.icW : L.icI);
    }
    if (a.strokes && a.strokes.length && isBlue(a.strokes[0].color)) { i.strokes = JSON.parse(JSON.stringify(a.strokes)); i.strokeWeight = a.strokeWeight; i.name = "Dosar card · nou"; } else i.name = "Dosar card · " + title.slice(0, 30);
    place(a, i, true); push("card");
    // the card whose ⋮ menu is open (overlays pass named it „Meniu ⋮ · <nr>”) keeps the focus ring
    if (root.findOne((n) => n.type === "INSTANCE" && n.name === "Meniu ⋮ · " + nr)) { const mo = i.findOne((n) => n.name === "More (⋮)"); const fv = mo.mainComponent.parent.children.find((c) => c.name === mo.mainComponent.name.replace(/State=\w+/, "State=Focus")); if (fv) mo.swapComponent(fv); push("menu-open"); }
  }
  // 4b · catalog service cards (no GEAP nr) → Cabinet / Serviciu card
  for (const a of ra((n) => n.type === "FRAME" && /^Article - /.test(n.name))) {
    if (a.removed || a.findOne((n) => n.type === "TEXT" && /^GEAP-\d{4}-/.test(n.characters)) || !a.findOne((n) => n.name === "Heading 2")) continue;
    const SVC = await g("11105:290265");
    const tt = a.findAll((n) => n.type === "TEXT" && own(n)).map((t) => t.characters);
    const online = Boolean(a.findOne((n) => n.type === "INSTANCE" && /^tag · Online/.test(n.name)) || a.findOne((n) => isTagFrame(n) && /Online/.test(textOf(n))));
    const i = SVC.createInstance(); const vals = { "Titlu": tt[0], "Instituție": tt[1], "Tip act": tt[2], "Termen": tt[3], "Cost": tt[4] }; const pp = {};
    for (const [k, v] of Object.entries(vals)) if (v) pp[prop(i, k)] = v; pp[prop(i, "Online")] = online; i.setProperties(pp);
    i.name = "Serviciu card · " + (tt[0] || "").slice(0, 30); place(a, i, true); push("svc-card");
  }
  // 5 · pager
  const pager = rf((n) => /^Navigation - Paginarea/.test(n.name));
  if (pager) {
    for (const k of [...pager.children]) {
      if (/^Button - Pagina (anterioară|următoare)/.test(k.name)) {
        const i = V(C.textRect, { "Style": "Strict", "Icon": "Only", "Size": "Medium", "State": "Default" }).createInstance();
        const prev = /anterioară/.test(k.name); const ic = i.findOne((n) => n.type === "INSTANCE" && /^20\//.test(n.mainComponent.name));
        const chev = prev ? CH.left : CH.right;
        if (chev) i.setProperties({ [prop(i, "🔄 Leading Icon: 20")]: chev.id }); // swapComponent on a parentless instance does not stick
        i.name = prev ? "btn · pagina anterioară" : "btn · pagina următoare"; place(k, i); push("pager-btn");
      } else if (k.type === "FRAME" && /^\d+$/.test(textOf(k))) {
        const on = isBlue(fill0(k)); const set = C.pagItem.type === "COMPONENT_SET" ? C.pagItem : null;
        const v = set ? (set.children.find((c) => c.name.includes("Desktop") && c.name.includes("State=Default") && c.name.includes(on ? "Type=Selected" : "Type=Unselected"))) : C.pagItem;
        const i = v.createInstance(); const t = i.findOne((x) => x.type === "TEXT"); await loadAll(t); t.characters = textOf(k); i.name = "page · " + textOf(k); place(k, i); push("pager-item");
      }
    }
    const size = rf((n) => n.name === "Button" && /pe pagină/.test(textOf(n)));
    if (size) { const i = V(C.textRect, { "Style": "Strict", "Icon": "Trailing", "Size": "Medium", "State": "Default" }).createInstance(); i.setProperties({ [prop(i, "⌨️ Label")]: textOf(size) }); i.name = "btn · " + textOf(size); place(size, i); push("per-page"); }
  }
  // 5b · buttons / button-links (back link, „Solicită online”, Descarcă, profile actions) → library buttons
  // fill blue = filled Primary · grey = filled Neutral (Destructive for Elimină/Șterge) · none = text button
  // (Primary when the label is blue, Strict otherwise). Icons: known labels only (ICK); unknown → Icon=None
  // and reported as icon-missing:<label> — add the icon key + label rule here when it shows up.
  const ICK = { download: "e6dd0e9760c7ba23fc5b98fd6153954b6fbbbf3e", back: "f9c5634defdccc7ae2468696b4dc02438da46658", ext: "8df5d4b1610d9e9457096f9f2f5bc2ec864c5275", edit: "bef76865a142fa255aebe7a98f7a0411943e8c29", trash: "set:b5e9b87b18af497ebc71fea18f72e47f32d892bb", file: "set:032cdf84d842e4f5ed26cbf419a9f1e7a3a29456", card: "aca711a43986722b21edbab93c36fc4a14991ba4", refresh: "caca3c5fe61759c63af80da429f022ab02abb418", upload: "e72e41aa51a34c586d0e3e31309dc738551e1ba8" };
  const ICC = {}; const iconComp = async (k) => { if (ICC[k]) return ICC[k]; const key = ICK[k]; let c; if (key.startsWith("set:")) { const st = await figma.importComponentSetByKeyAsync(key.slice(4)); c = st.children.find((v) => /filled=off/.test(v.name) && /stroke=1.5/.test(v.name)) || st.children[0]; } else c = await figma.importComponentByKeyAsync(key); return (ICC[k] = c); };
  const iconFor = (label) => /^(Solicitările mele|Catalogul serviciilor|Actele mele permisive|Înapoi)$/.test(label) ? "back" : /^Descarcă/.test(label) ? "download" : /^(Solicită online)$/.test(label) ? "ext" : /^(Continuă|Suplinește|Completează|Depune contestație)/.test(label) ? "edit" : /^(Elimină|Șterge)/.test(label) ? "trash" : /^Vezi (actul|solicitarea|decizia)/.test(label) ? "file" : /^Achită/.test(label) ? "card" : /^Încercați din nou|^Reîncearcă/.test(label) ? "refresh" : undefined;
  for (const b of ra((n) => n.type === "FRAME" && (/^(Button|Link)$/.test(n.name) || /^Button - (Descarcă|Continuă|Elimină|Achită|Suplinește|Vezi|Depune|Încercați|Anulează|Mergi)/.test(n.name)) && n.cornerRadius >= 6 && n.height >= 30 && n.height <= 52 && n.findOne && n.findOne((t) => t.type === "TEXT"))) {
    if (b.removed) continue; const label = textOf(b); if (!label || /^\d+$/.test(label) || label.length > 60) continue;
    const hasIc = b.children[0] && b.children[0].name === "Icon"; const trailing = !hasIc && b.children.length > 1 && b.children[b.children.length - 1].name === "Icon";
    const fc = fill0(b); const tc = fill0(b.findOne((t) => t.type === "TEXT"));
    const primary = isBlue(fc); const grey = fc && !primary && fc.r < 0.97 && fc.r > 0.8 && Math.abs(fc.r - fc.b) < 0.05;
    const size = b.height >= 46 ? "Large" : b.height >= 38 ? "Medium" : "Small";
    const destr = Boolean(fc && fc.r > 0.75 && fc.g < 0.4 && fc.b < 0.4); // only a red fill — „Elimină schița” is Neutral in code
    let set, style; if (primary) { set = C.rect; style = "Primary"; } else if (grey) { set = C.rect; style = destr ? "Destructive" : "Neutral"; } else { set = C.textRect; style = destr ? "Destructive" : isBlue(tc) ? "Primary" : "Strict"; }
    const ik = (hasIc || trailing) ? iconFor(label) : null;
    const iconMode = ik ? (hasIc ? "Leading" : "Trailing") : (trailing && /Sortează|pe pagină|Mai mult/.test(label) ? "Trailing" : "None");
    const v = V(set, { "Style": style, "Icon": iconMode, "Size": size, "State": "Default" }) || V(set, { "Style": style, "Icon": "None", "Size": size, "State": "Default" });
    const i = v.createInstance(); i.setProperties({ [prop(i, "⌨️ Label")]: label });
    if (ik && ICK[ik]) { const comp = await iconComp(ik); const px = size === "Small" ? "16" : "20"; const k = prop(i, (hasIc ? "🔄 Leading Icon: " : "🔄 Trailing Icon: ") + px); if (k) i.setProperties({ [k]: comp.id }); if (px === "16") { for (const n of i.findAll((x) => x.type === "INSTANCE" && x.mainComponent && x.mainComponent.id === comp.id)) n.resize(16, 16); } }
    if ((hasIc || trailing) && !ik) push("icon-missing:" + label.slice(0, 30));
    i.name = "btn · " + label.slice(0, 40); place(b, i); push("btn");
  }
  // 5c · copy-number buttons → hug auto-layout + 16px copy icon (the fixed-width capture truncates the nr after TOKENIZE)
  const COPY = await g("10272:5884");
  for (const b of ra((n) => n.type === "FRAME" && /^Button - Copiază/.test(n.name))) { if (b.removed) continue; b.layoutMode = "HORIZONTAL"; b.itemSpacing = 4; b.counterAxisAlignItems = "CENTER"; b.primaryAxisSizingMode = "AUTO"; b.counterAxisSizingMode = "AUTO"; const ic = b.children.find((k) => k.name === "Icon"); if (ic) { const ci = COPY.createInstance(); ci.resize(16, 16); ci.name = "icon · copiază"; b.insertChild(b.children.indexOf(ic), ci); ic.remove(); } for (const k of b.children) { if (k.type === "FRAME") { try { k.layoutSizingHorizontal = "HUG"; } catch (e) {} } } b.name = "Număr (copiază)"; push("copy"); }
  // 5d · marks outside cards (profile head) → Cabinet / Marcaj
  for (const mk of ra((n) => n.type === "FRAME" && ((/^Button - Disponibilă aprobarea tacită/.test(n.name)) || (n.children && n.children.length === 2 && n.children[0].name === "Icon" && n.children[1].type === "TEXT" && /^(Aprobat|Respins|Disponibilă aprobarea tacită)$/.test(n.children[1].characters))))) {
    if (mk.removed) continue; const t = textOf(mk); const v = L.marcaj.children.find((c) => c.name === "Tip=" + (/Respins/.test(t) ? "Respins" : /tacit/.test(t) ? "Tacit" : "Aprobat")); const i = v.createInstance(); i.name = "Marcaj · " + t.slice(0, 30); place(mk, i); push("mark"); }
  // wrappers named „Button - …” that now only hold an instance → plain containers (QA reads names)
  for (const w of ra((n) => n.type === "FRAME" && /^Button - /.test(n.name) && n.children && n.children.length && n.children.every((k) => k.type === "INSTANCE"))) w.name = "Container";
  // 6 · any other status tag (profile head, Taxe, catalog Online, Obligatoriu/Opțional)
  for (const f of ra(isTagFrame)) { if (f.removed) continue; if (f.parent && f.parent.type === "INSTANCE") continue; place(f, mkTag(textOf(f))); push("tag"); }
  const left = ra((n) => n.type === "FRAME" && /^(Button\b|Button - |Search Input|Link\b|Tab\b|Menu|Dialog)/.test(n.name)).map((n) => `${n.name.slice(0, 40)} (${n.id})`);
  const counts = {}; done.forEach((d) => { counts[d] = (counts[d] || 0) + 1; });
  report[rid] = { counts, unmapped: left.slice(0, 25), more: Math.max(0, left.length - 25) };
}
//TOKENIZE  ← paste tools/figma/tokenize.js here
// single-line captured texts: let them grow (Foundations text styles are wider than the browser metrics)
for (const r of ROOTS) { const root = await g(r); for (const t of root.findAll((n) => n.type === "TEXT" && n.textAutoResize !== "WIDTH_AND_HEIGHT" && n.height <= 28 && !/\n/.test(n.characters))) { let q = t.parent, inInst = false; while (q && q !== root) { if (q.type === "INSTANCE") { inInst = true; break; } q = q.parent; } if (inInst || t.layoutSizingHorizontal === "FILL") continue; try { t.textAutoResize = "WIDTH_AND_HEIGHT"; } catch (e) {} } }
const __roots = []; for (const r of ROOTS) __roots.push(await g(r));
const __tok = TOKEN && typeof TOKENIZE === "function" ? await TOKENIZE(__roots, { mobile: MOBILE_ROOT }) : null;
return { swap: report, tokens: __tok };
