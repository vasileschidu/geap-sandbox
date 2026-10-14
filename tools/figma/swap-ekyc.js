// eKYC back office captures → GEAP-style screens with library instances, for the eKYC file
// (SqMGpRKEppJLcvn7HMzOPR). Written 2026-10-13 by the figma-designer agent.
//
// Input: full-page captures of e-permits-acte-permisive.html?state=ek-… at 1440 (capture-to-figma.mjs
// --width 1440 --height 1024 [--fit]). Stored in Figma as the hidden text node „__swap-ekyc” (frame
// „Componente · eKYC BO (local)”, page ↳ BO -> Application Shell); run it with
//   const AF = Object.getPrototypeOf(async function () {}).constructor;
//   return await new AF("ROOTS", "OPT", (await figma.getNodeByIdAsync("<text id>")).characters)(ids, opt);
// ROOTS = capture root ids. OPT = { names: { <capId>: "R02 · Coada de revizie" } }.
// Returns { <capId>: { screen, role, nav, counts, unmapped } }. The capture root is consumed (removed).
//
// Builds: Screen (1440, VERTICAL, white, 1px border/base/default, r12) = top bar (clone of the eKYC
// header-evo-desktop frame) + Body (Sidebar · eKYC instance, role from the user menu, active item from
// the brand-blue nav text) + Main (Antet · eKYC instance — Titlu / Înapoi — + the captured content).
// Dialogs → Overlay (scrim) + local Modal (Confirmare when the body is one paragraph, else Conținut with
// a „Modal conținut / <state>” component built from the swapped body).
// Swaps in the content (raw, non-instance frames only): page tabs → .tab-item-md (+ numbered badge),
// search → search-input-rectangular, „Filtrare avansată” → filter-chip, buttons → button-filled-
// rectangular / -circular / button-text-* (style from fill, size from height, icon by label or a local
// „Icon / eKYC / …” component made from the captured svg), fields (Label + control + messages) →
// text-input / select-input / text-area with Label, Mandatory Star, Assistive Text, Destructive style,
// tags → tag-filled Small (style from fill), checkboxes → checkbox, table header cells → table-header,
// pager → pagination + select-input (rows per page), copy buttons → hug row + 16/copy.
// Then TOKENIZE (tools/figma/tokenize.js is pasted at //TOKENIZE by the loader below).
//
// Synced 2026-10-13 from the stored Figma text node __swap-ekyc (10161:916) — the stored copy was patched
// in place during the job; this file is now its exact swap part (the stored node prepends tokenize.js,
// which defines TOKENIZE, gvar and SP; paste tokenize.js above this body when re-storing).
// Later additions: drawers (right-anchored, h ≥ 500) → Overlay + raw drawer; popovers (dialog without a
// close button) stay absolute; toasts → toast; open menus → contextual-menu (trigger State Focus);
// segmented radio groups → segmented-control; white bordered buttons with a trailing chevron →
// select-input; label rows with an i button → library field + absolute 16/circle-info („info · tooltip”);
// read-only inputs (grey + lock) → text-input State Read Only; input + buttons rows → field + btn-wrap
// (padding 32); „Alege data” rows → date-input; Afișează/Ascunde → trailing eye; long hints wrap
// (inline-message FILL); local icons get their frame fills cleared.
// Second pass: tools/figma/fix-ekyc.js (__fix-ekyc 10261:24458). Board: tools/figma/board-ekyc.js.
    const g = (id) => figma.getNodeByIdAsync(id);
    for (const f of ["Regular", "Medium", "SemiBold", "Bold"]) {try {await figma.loadFontAsync({ family: "Onest", style: f });} catch (e) {}}
    const L = { sidebar: "10158:5826", antet: "10158:848", modal: "10158:1757", topbar: "10024:8782", tabmd: "644:7172", nbadge: "42:3769", chip: "1157:29905", section: "10158:671" };
    const KS = { tag: "a97109f9ebf668fb7616cb37e46929fc75ed9070", rect: "2cbe2c350e7c6b3948dc449660ede8355511c384", textRect: "4ad2518c34b8b51d5113119316eac5934c1eb9fb",
      textCirc: "a97526693c2d549c3c72e7ce70b4f2bf037a411e", circ: "fcf938f6ce9e31ae7f0f11838ee889335b4b7728", outRect: "4ca8aa0074c54a1d27230b1cd03785b5f788af96",
      search: "a27b4efaed053f6cd4a57411a032d7391174c425", sel: "24351877baeb81b99cceea90d885b3455191ac62", text: "f035f11544e0883bc29ca99b48309238db82edf8",
      area: "b9326acb41b6b6cdb42bbbab753e2c0279107520", chk: "e915a93ec9c4b91546cfb5788ededa656f98069a", th: "658ba90a316248aef802c0f9ec3c004694afaaba",
      pag: "f7149ae3d1e133f687b1677ac366006e73ad89b3", info: "9d92b96ae3d6764970e5e09dcf0715b138d35fb3", toast: "8324658cfa795f1cd94cd83fad8e23193f4e4d5a" };
    const C = {};for (const [k, key] of Object.entries(KS)) C[k] = await figma.importComponentSetByKeyAsync(key);
    C.tabmd = await g(L.tabmd);C.nbadge = await g(L.nbadge);C.chip = await g(L.chip);
    const MENU = await figma.importComponentByKeyAsync("eca4c78b40aec0ddac890e7f006907d81868c1ab");
    const IK = { filter: "d7ef1839769646e2b2d27b2a54d4b38787bcd775", more: "8eeb6ea4a1096422cb88f9859ed243e6ec189d4d", download: "e6dd0e9760c7ba23fc5b98fd6153954b6fbbbf3e",
      cross: "3ccb9372951f0b3c922b004d8966a680404cd11f", left: "ab64d0faf05f5d237524e6d64a20387f826382b5", right: "d5d6c61279d8018dd0bd8c4015a52d2a394d5324",
      arrowLeft: "f9c5634defdccc7ae2468696b4dc02438da46658", check: "ebea9f11db46308470d328092590727874dbec88", refresh: "8cdf3361fae3b611bc79a0ff4be5e664909d1ea5",
      eye: "faa2ea508755b47b8354bf6bb7d659776a525294", edit: "bef76865a142fa255aebe7a98f7a0411943e8c29", plus: "b270f954e420ff6e2abdedbaf9ce0834e7eb428d",
      copy: "89c577ec6b8f893a92741093af50a237eb383016", lock: "fbeb6d2d8c3e69de17f8bd7272cfaee829cf2ed2", down: "a9d10e062692212dde688d564b091a62be22d2f7" };
    const ICC = {};const ic = async (k) => ICC[k] ||= await figma.importComponentByKeyAsync(IK[k]);
    const VK = { bg: "ec2921da40a6853a80b0d299be5bc8b1a11fcc89", border: "9fa253aab4b44e39a049a0cbbd163e4c61e129b6", scrim: "75e94de048cf1e8f0ef4f93f6bb9eb52519686ec" };
    const VAR = {};for (const [k, key] of Object.entries(VK)) VAR[k] = await figma.variables.importVariableByKeyAsync(key);
    const paintV = (v) => figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 1, g: 1, b: 1 } }, "color", v);
    const V = (set, want) => set.children.find((c) => Object.entries(want).every(([k, v]) => c.name.includes(`${k}=${v}`)));
    const prop = (i, s) => Object.keys(i.componentProperties).find((k) => k.startsWith(s));
    const setP = (i, map) => {const o = {};for (const [p, v] of Object.entries(map)) {const k = prop(i, p);if (!k) continue;const ty = i.componentProperties[k].type;if (v === undefined || v === null) {if (ty === "BOOLEAN") o[k] = false;continue;}o[k] = ty === "BOOLEAN" ? Boolean(v) : v;}i.setProperties(o);};
    const loadAll = async (t) => {for (const s of t.getStyledTextSegments(["fontName"])) await figma.loadFontAsync(s.fontName);};
    const texts = (n) => n.type === "TEXT" ? [n] : n.findAll ? n.findAll((x) => x.type === "TEXT" && x.visible !== false) : [];
    const textOf = (n) => texts(n).map((x) => x.characters).join(" ").replace(/\s+/g, " ").trim();
    const solid = (paints) => Array.isArray(paints) ? paints.find((p) => p.visible !== false && p.type === "SOLID") : null;
    const fillC = (n) => {const p = n && solid(n.fills);return p ? p.color : null;};
    const strokeC = (n) => {const p = n && solid(n.strokes);return p ? p.color : null;};
    const isBlue = (c) => c && c.b > 0.6 && c.r < 0.3;
    const isRed = (c) => c && c.r > 0.75 && c.g < 0.35 && c.b < 0.35;
    const isDark = (c) => c && c.r < 0.25 && c.g < 0.25 && c.b < 0.25;
    const isWhite = (c) => c && c.r > 0.97 && c.g > 0.97 && c.b > 0.97;
    const isGreyBtn = (c) => c && Math.abs(c.r - c.g) < 0.02 && Math.abs(c.g - c.b) < 0.02 && c.r > 0.9 && c.r < 0.97;
    const R = (n) => n.cornerRadius === figma.mixed ? n.topLeftRadius : n.cornerRadius || 0;
    const inI = (n) => {for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true;return false;};
    const place = (old, inst, w) => {
      const p = old.parent, i = p.children.indexOf(old); const gr = p.layoutMode === "GRID" ? [old.gridRowAnchorIndex, old.gridColumnAnchorIndex, old.gridRowSpan, old.gridColumnSpan] : null; p.insertChild(i, inst); if (gr) { old.remove(); try { inst.setGridChildPosition(gr[0], gr[1]); } catch (e) { try { inst.gridRowSpan = 1; inst.gridColumnSpan = 1; inst.setGridChildPosition(gr[0], gr[1]); } catch (e2) {} } try { inst.gridRowSpan = gr[2]; inst.gridColumnSpan = gr[3]; } catch (e) {} return inst; }if (!p.layoutMode || p.layoutMode === "NONE") {inst.x = old.x;inst.y = old.y;} else
      if (old.layoutSizingHorizontal === "FILL") {try {inst.layoutSizingHorizontal = "FILL";} catch (e) {}} else
      if (w) {try {inst.layoutSizingHorizontal = "FIXED";inst.resize(w, inst.height);} catch (e) {}}
      if (old.layoutPositioning === "ABSOLUTE") {inst.layoutPositioning = "ABSOLUTE";inst.x = old.x;inst.y = old.y;}
      old.remove();return inst;
    };
    const SEGSET = await figma.importComponentSetByKeyAsync("eae5f7ebab22bf81c20c791f38f0baecfd3f8eb2");
// 2026-10-14: a captured 40px track (dashboard / report period filters, .e-permits-ekyc-dash__period) → local „Segmented · 40 (gap bibliotecă)” 10666:2009 (library has only 52); separators off next to the selected item
const SEG40 = await figma.getNodeByIdAsync("10666:2009");
const segSwap = (g0) => { const kids = g0.children; const fills = kids.map((k) => fillC(k)); const onIdx = fills.findIndex((f) => f && !isWhite(f)) >= 0 ? fills.findIndex((f) => f && !isWhite(f)) : fills.findIndex((f) => f); const small = SEG40 && Math.round(g0.height) <= 44; const v = small ? SEG40.children.find((c) => c.name === "🧮 Segment Count=" + kids.length) : SEGSET.children.find((c) => c.name.includes("Segment Count=" + kids.length) && c.name.includes("Desktop")); if (!v) return null; const i = v.createInstance(); const ctr = i.children.filter((c) => c.type === "INSTANCE"); kids.forEach((k, j) => { if (ctr[j]) setP(ctr[j], Object.assign({ "⌨️ Label": textOf(k), "🎚️ Mode": j === onIdx ? "On" : "Off" }, small ? { "👁️ Separator": j < kids.length - 1 && j !== onIdx && j + 1 !== onIdx } : {})); }); i.name = "segmented · " + kids.map((k) => textOf(k)).join(" / "); return i; };
const SEC = await g(L.section);let ICONS = SEC.findOne((n) => n.type === "FRAME" && n.name === "Icons · eKYC (din cod)");
    if (!ICONS) {ICONS = figma.createAutoLayout("HORIZONTAL", { name: "Icons · eKYC (din cod)" });ICONS.layoutWrap = "WRAP";ICONS.itemSpacing = 16;ICONS.counterAxisSpacing = 16;ICONS.fills = [];SEC.appendChild(ICONS);ICONS.x = 80;ICONS.y = 1400;ICONS.resize(1200, 40);ICONS.counterAxisSizingMode = "AUTO";}
    const localIcon = (frame, label) => {
      const name = "Icon / eKYC / " + label.slice(0, 40);
      let comp = ICONS.findOne((n) => n.type === "COMPONENT" && n.name === name);
      if (!comp) {const cl = frame.clone();ICONS.appendChild(cl);comp = figma.createComponentFromNode(cl);comp.name = name;comp.fills = []; /*ICONFILL*/ for (const fr of comp.findAll((x) => x.type === "FRAME")) fr.fills = [];}
      return comp;
    };
    const ICON_BY_LABEL = (l) => /^Filtrare/.test(l) ? "filter" : /^Exportă|^Descarcă/.test(l) ? "download" : /^(Acceptă|Preia|Confirmă|Salvează)/.test(l) ? "check" : /^Respinge$|^Închide|^Anulează filtr/.test(l) ? "cross" :
    /^Actualizează/.test(l) ? "refresh" : /^Înapoi/.test(l) ? "arrowLeft" : /^(Adaugă|Nou|Încarcă)/.test(l) ? "plus" : /^(Editează)/.test(l) ? "edit" : /^(Vezi|Deschide)/.test(l) ? "eye" : /^Solicită acces/.test(l) ? "lock" : null;
    const setIcon = async (i, slot, comp, size) => {const k = prop(i, slot + size);if (!k) return false;i.setProperties({ [k]: comp.id });if (size === "16") for (const n of i.findAll((x) => x.type === "INSTANCE" && x.mainComponent && x.mainComponent.id === comp.id)) n.resize(16, 16);return true;};
    const tagStyle = (c) => {if (!c) return "Neutral";const { r, g: gg, b } = c;if (isGreyBtn(c) || Math.abs(r - gg) < 0.03 && Math.abs(gg - b) < 0.03) return "Neutral";if (b > r && b > gg && r < 0.95) return r > 0.9 && gg < 0.93 ? "Muted" : "Brand";if (gg > r && gg > b) return "Success";if (r > gg && gg > b + 0.05) return "Accent";if (r > gg && r > b) return "Danger";return "Neutral";};
    const isTagFrame = (n) => n.type === "FRAME" && R(n) >= 3 && R(n) <= 6 && Math.round(n.height) >= 18 && Math.round(n.height) <= 26 && n.children && n.children.length === 1 && n.children[0].type === "TEXT" && fillC(n);
    const report = {};
    for (const rid of ROOTS) {
      const cap = await g(rid);if (!cap) {report[rid] = "missing";continue;}
      const done = [];const push = (k) => done.push(k);
      const own = (n) => !inI(n);
      const ra = (root, pred) => root.findAll((n) => !n.removed && own(n) && pred(n));
      const sideCap = cap.findOne((n) => n.type === "FRAME" && /^Sidebar - /.test(n.name));
      const hdr = cap.findOne((n) => n.type === "FRAME" && n.name === "Header" && Math.round(n.height) === 66);
      const content = cap.findOne((n) => n.type === "FRAME" && /^Section - Conținut principal/.test(n.name));
      const dialogs = cap.findAll((n) => n.type === "FRAME" && /^(Dialog|Alert Dialog)/.test(n.name) && n.visible !== false);
      const um = hdr && hdr.findOne((n) => /^Button - Meniu utilizator/.test(n.name));const umT = um ? texts(um).map((t) => t.characters.trim()) : [];
      const roleTxt = umT[umT.length - 1] || "";const role = /Operator/.test(roleTxt) ? "Operator" : /Supervizor/.test(roleTxt) ? "Supervizor" : /Auditor/.test(roleTxt) ? "Auditor" : "Administrator";
      const navT = sideCap ? texts(sideCap).find((t) => isBlue(fillC(t)) && t.characters.length > 3) : null;const nav = navT ? navT.characters.trim() : null;
      const screen = figma.createAutoLayout("VERTICAL", { name: OPT.names && OPT.names[rid] || cap.name.replace(/^cap · /, "") });
      cap.parent.appendChild(screen);screen.x = cap.x;screen.y = cap.y + cap.height + 200;
      screen.fills = [paintV(VAR.bg)];screen.strokes = [paintV(VAR.border)];screen.strokeWeight = 1;screen.strokeAlign = "INSIDE";screen.cornerRadius = 12;screen.clipsContent = true; screen.strokesIncludedInLayout = false;
      screen.counterAxisSizingMode = "FIXED";screen.resize(1440, 100);screen.primaryAxisSizingMode = "AUTO";
      const top = (await g(L.topbar)).clone();screen.appendChild(top);top.layoutSizingHorizontal = "FILL";
      const body = figma.createAutoLayout("HORIZONTAL", { name: "Body" });body.fills = [];screen.appendChild(body);body.layoutSizingHorizontal = "FILL"; body.minHeight = 992;
      const sbSet = await g(L.sidebar);const sb = V(sbSet, { Rol: role }).createInstance();sb.name = "Sidebar · eKYC";body.appendChild(sb);sb.layoutSizingVertical = "FILL";
      if (nav) {const it = sb.findOne((n) => n.type === "INSTANCE" && n.name === "nav · " + nav);if (it) setP(it, { "🎚️ State": "Active" });}
      const main = figma.createAutoLayout("VERTICAL", { name: "Main" });main.fills = [];body.appendChild(main);main.layoutSizingHorizontal = "FILL";main.layoutSizingVertical = "HUG";
      const back = hdr && hdr.findAll((n) => n.type === "TEXT").find((t) => /^Înapoi/.test(t.characters.trim()));
      const h1 = hdr && hdr.findOne((n) => /^Heading 1/.test(n.name));
      const refresh = hdr && hdr.findAll((n) => n.type === "TEXT").some((t) => /^Actualizează/.test(t.characters.trim()));
      const anSet = await g(L.antet);const an = V(anSet, { Tip: back ? "Înapoi" : "Titlu" }).createInstance();an.name = "Antet · eKYC";main.appendChild(an);an.layoutSizingHorizontal = "FILL";
      if (back) {const b = an.findOne((n) => n.type === "INSTANCE" && n.name === "btn · Înapoi");if (b) setP(b, { "⌨️ Label": back.characters.trim() });} else
      {setP(an, { "Titlu": h1 ? textOf(h1) : "", "Actualizează": refresh });}
      const rs = an.findOne((n) => n.type === "INSTANCE" && n.name === "Meniu utilizator");
      if (rs && umT.length >= 3) {const tx = rs.findAll((n) => n.type === "TEXT");for (const t of tx) {await loadAll(t);if (t.name === "OP") t.characters = umT[0];else if (/Representative/.test(t.name)) t.characters = umT[2];else t.characters = umT[1];}}
      const al = hdr && hdr.findOne((n) => /^Button - Alerte active/.test(n.name)); const alN = al ? (al.name.match(/\d+/) || [""])[0] : ""; const bell = an.findOne((n) => n.type === "INSTANCE" && n.name === "Alerte"); if (bell) { const bt = bell.findAll((n) => n.type === "TEXT")[0]; if (alN && bt) { await loadAll(bt); bt.characters = alN; } else if (!alN) setP(bell, { "👁️ Notification Badge": false }); }
  push("shell");
      if (content) {main.appendChild(content);content.layoutPositioning = "AUTO";content.layoutSizingHorizontal = "FILL"; content.layoutSizingVertical = "HUG";content.name = "Conținut";}
      const dlgs = dialogs.map((d) => {const a = d.absoluteTransform;const c = cap.absoluteTransform;return { d, x: Math.round(a[0][2] - c[0][2]), y: Math.round(a[1][2] - c[1][2]) };});
      const drawers = dlgs.filter((o) => o.x + o.d.width >= 1425 && o.d.height >= 500);
  for (const o of drawers) { const ovD = figma.createFrame(); ovD.name = "Overlay"; ovD.fills = [paintV(VAR.scrim)]; ovD.clipsContent = false; screen.appendChild(ovD); ovD.layoutPositioning = "ABSOLUTE"; ovD.x = 0; ovD.y = 0; ovD.resize(1440, 1024); ovD.constraints = { horizontal: "STRETCH", vertical: "STRETCH" }; ovD.appendChild(o.d); o.d.x = o.x; o.d.y = 0; o.d.name = "Drawer · " + textOf(o.d.children[0] || o.d).slice(0, 40); push("drawer"); }
  const pops = dlgs.filter((o) => !drawers.includes(o) && !o.d.findOne((n) => /^Button - Închide/.test(n.name)));for (const o of pops) { screen.appendChild(o.d); o.d.layoutPositioning = "ABSOLUTE"; o.d.x = o.x; o.d.y = o.y; o.d.name = "Popover · " + o.d.name; }
  for (const tf of cap.findAll((n) => n.type === "FRAME" && n.name === "Status" && n.findOne((x) => /^Button - Închide notificarea/.test(x.name)))) { const a = tf.absoluteTransform, cc = cap.absoluteTransform; const ps = tf.findAll((x) => x.type === "TEXT").map((x) => x.characters.trim()).filter(Boolean); const vec = tf.findOne((x) => x.type === "VECTOR"); const col = vec && (fillC(vec) || strokeC(vec)); const style = col && col.g > col.r + 0.1 && col.g > col.b ? "Success" : isRed(col) ? "Error" : col && col.r > 0.8 && col.g > 0.45 && col.b < 0.3 ? "Warning" : "Info"; const v = V(C.toast, { "🖌️ Style": style, "🎚️ Content": ps.length > 1 ? "w/ Heading" : "Text-only" }) || C.toast.children[0]; const ti = v.createInstance(); setP(ti, { "⌨️ Heading": ps[0] || "", "⌨️ Message": ps.slice(1).join(" ") || ps[0] || "", "👁️ Close": true, "👁️ Link": false }); screen.appendChild(ti); ti.layoutPositioning = "ABSOLUTE"; ti.x = Math.round(a[0][2] - cc[0][2]); ti.y = Math.round(a[1][2] - cc[1][2]); ti.name = "Toast · " + (ps[0] || ""); push("toast"); }
  const roots = [content, ...dlgs.map((o) => o.d)].filter(Boolean);for (const root of roots) {
        for (const tl of ra(root, (n) => n.type === "FRAME" && /^Tab List/.test(n.name))) {
          for (const tb of tl.findAll((n) => n.type === "FRAME" && n.name === "Tab" && own(n))) {
            const tx = texts(tb).map((t) => t.characters.trim());const label = tx[0] || "";const num = tx.find((s, k) => k > 0 && /^\d+$/.test(s));
            const on = isBlue(strokeC(tb)) || isBlue(fillC(texts(tb)[0]));
            const i = V(C.tabmd, { "🎚️ Mode": on ? "On" : "Off", "🎚️ State": "Default" }).createInstance();
            const hasIc = tb.children[0] && tb.children[0].name === "Icon";
            setP(i, { "⌨️ Label": label, "👁️ Badge": Boolean(num), "📍 Icon": hasIc });
            if (num) {const nb = i.findOne((n) => n.type === "INSTANCE" && /badge/i.test(n.name));if (nb) {setP(nb, { "⌨️ Counter Value": num });const red = texts(tb).find((t) => t.characters.trim() === num);const bf = red && fillC(red.parent);if (bf && bf.r > 0.95 && bf.g < 0.92) setP(nb, { "🖌️ Style": "Accent" });}}
            if (hasIc) {const slot = i.findOne((n) => n.type === "INSTANCE" && n !== i && !/badge/i.test(n.name));if (slot) {const comp = localIcon(tb.children[0], "tab " + label);try {slot.swapComponent(comp);} catch (e) {}}}
            i.name = "tab · " + label;place(tb, i);push("tab");
          }
        }
        for (const g0 of ra(root, (n) => n.type === "FRAME" && R(n) >= 999 && n.children && n.children.length >= 2 && n.children.length <= 5 && n.children.every((k) => k.type === "FRAME" && /^Radio Button/.test(k.name)))) { const si = segSwap(g0); if (si) { place(g0, si); push("segmented"); } }
    for (const mf of ra(root, (n) => n.type === "FRAME" && /^Menu - /.test(n.name))) {
      const items = mf.children.filter((k) => /^Menu Item/.test(k.name)); const a = mf.absoluteTransform, sc = screen.absoluteTransform; const mx = Math.round(a[0][2] - sc[0][2]), my = Math.round(a[1][2] - sc[1][2]);
      const trig = mf.parent && mf.parent.children.find((k) => k !== mf && k.type === "FRAME" && /^Button/.test(k.name)); if (trig) trig.name = trig.name + " (deschis)";
      const inst = MENU.createInstance(); const keys = Object.keys(inst.componentProperties); const pp = {};
      for (let k = 1; k <= 6; k++) { const kk = keys.find((p) => p.startsWith("👁️ Option " + k + "#")); if (kk) pp[kk] = k <= items.length; }
      const sh = keys.find((p) => p.startsWith("👁️ Section Heading")); if (sh) pp[sh] = false; inst.setProperties(pp);
      for (let k = 0; k < Math.min(6, items.length); k++) { const opt = inst.findOne((c) => c.type === "INSTANCE" && c.name === "Option " + (k + 1)); if (!opt) continue; const hasIc = items[k].children[0] && items[k].children[0].name === "Icon"; const vI = opt.mainComponent.parent.children.find((c) => c.name.includes("Leading Element=" + (hasIc ? "Icon" : "None")) && c.name.includes("State=Default")); if (vI) opt.swapComponent(vI); setP(opt, { "Option Label": textOf(items[k]) }); if (hasIc) { const kk = prop(opt, "🔄 Leading Icon"); if (kk) opt.setProperties({ [kk]: localIcon(items[k].children[0], "menu " + textOf(items[k])).id }); } }
      screen.appendChild(inst); inst.layoutPositioning = "ABSOLUTE"; inst.x = mx; inst.y = my; inst.name = "Meniu · " + mf.name.replace(/^Menu - /, ""); inst.resize(Math.round(mf.width), inst.height); try { inst.layoutSizingVertical = "HUG"; } catch (e) {} mf.remove(); push("menu");
    }
    for (const s of ra(root, (n) => n.type === "FRAME" && /^Search Input/.test(n.name))) {const w = Math.round(s.width);const t = texts(s)[0];const val = t ? t.characters : "";const filled = t && isDark(fillC(t));
          const i = V(C.search, { "🎚️ State": filled ? "Filled" : "Default", "🎚️ Size": "Medium", "👁️ Button": "False" }).createInstance();
          setP(i, { "⌨️ Placeholder": val || "Caută", "👁️ Label": false, "👁️ Clear Button": filled, "👁️ Assistive Text": false });
          i.name = "search";place(s, i, w);push("search");
        }
        const INFO = new Map(); /*INFO_ROWS*/ for (const tf of ra(root, (n) => n.type === "FRAME" && n.layoutMode === "HORIZONTAL" && n.children.some((k) => /^Button - Despre/.test(k.name)))) { const bt = tf.children.find((k) => /^Button - Despre/.test(k.name)); bt.remove(); const inner = tf.children.length === 1 && tf.children[0].type === "FRAME" && /^(Label|Etichetă)$/.test(tf.children[0].name) ? tf.children[0] : null; if (inner) { const pp = tf.parent; pp.insertChild(pp.children.indexOf(tf), inner); tf.remove(); INFO.set(inner.id, 1); } else { tf.name = "Label"; INFO.set(tf.id, 1); } }
 for (const lab of ra(root, (n) => n.type === "FRAME" && /^(Label|Etichetă)$/.test(n.name) && n.parent && n.parent.layoutMode)) {if (lab.removed) continue;const p = lab.parent;const sib = p.children;const i0 = sib.indexOf(lab);
          let ctl = sib[i0 + 1];if (!ctl) continue;
          const isArea = (n) => n.name === "Text Area" || n.findOne && n.findOne((x) => x.name === "Text Area");
          const isSel = (n) => n.type === "FRAME" && /^(Button|Combobox|Select)/.test(n.name) && n.height >= 36 && n.height <= 50 && n.children.length && n.children[n.children.length - 1].name === "Icon" && !isBlue(fillC(n));
          const isInp = (n) => n.type === "FRAME" && (/Input$|^Text Input|^Textbox/.test(n.name) || n.height >= 36 && n.height <= 50 && R(n) >= 6 && strokeC(n) && n.findOne && (n.findOne((x) => x.type === "TEXT") || n.findOne((x) => /Input|Textbox/.test(x.name))));
          const hasInfo = INFO.has(lab.id); let extraBtn = null; if (ctl.type === "FRAME" && ctl.layoutMode === "HORIZONTAL" && ctl.children.length >= 2 && ctl.children.slice(1).every((c) => /^(Button|Link)/.test(c.name)) && isInp(ctl.children[0])) { extraBtn = ctl; ctl = ctl.children[0]; }
 const isDate = Boolean(extraBtn && extraBtn.children.some((c) => /^Button - Alege data/.test(c.name))); if (isDate) { ctl = extraBtn; extraBtn = null; }
 const kind = isDate ? "date" : isArea(ctl) ? "area" : isSel(ctl) ? "sel" : isInp(ctl) ? "text" : null;if (!kind) continue;
          const msgs = [];for (let k = i0 + 2; k < sib.length; k++) {const m = sib[k];if (m.name === "Label" || m.type === "INSTANCE" || m.findOne && m.findOne((x) => x.name === "Label" || /^Button/.test(x.name))) break;if (!texts(m).length) break;msgs.push(m);}
          const label = texts(lab).map((t) => t.characters).join("").replace(/\*$/, "").trim();const star = Boolean(lab.findOne((x) => x.name === "obligatoriu"));
          const box = kind === "area" ? ctl.name === "Text Area" ? ctl : ctl.findOne((x) => x.name === "Text Area") : ctl;
          const boxFrame = kind === "area" && ctl.name === "Text Area" ? ctl.parent : ctl;
          const err = isRed(strokeC(boxFrame)) || isRed(strokeC(box)) || msgs.some((m) => isRed(fillC(texts(m)[0])));
          const vt = texts(ctl);const valT = vt[0];const val = valT ? valT.characters.trim() : "";const hasVal = valT && isDark(fillC(valT));
          const errMsg = msgs.find((m) => isRed(fillC(texts(m)[0])));const hint = msgs.find((m) => !isRed(fillC(texts(m)[0])));
          const assist = errMsg ? textOf(errMsg) : hint ? textOf(hint) : null;const counter = hint && /\d+\/\d+/.test(textOf(hint)) ? textOf(hint).match(/\d+\/\d+/)[0] : null;
          const set = kind === "date" ? (C.date ||= await figma.importComponentSetByKeyAsync("4449e61e554888eb4357b4f2e6e16dacf738fda3")) : kind === "sel" ? C.sel : kind === "area" ? C.area : C.text;const ro = kind === "text" && fillC(ctl) && !isWhite(fillC(ctl)) && Boolean(ctl.findOne && ctl.findOne((x) => x.name === "Icon")); const st2 = ro ? "Read Only" : hasVal ? "Filled" : "Default";const v = V(set, { "🖌️ Style": err ? "Destructive" : "Default", "🎚️ State": st2, "🎚️ Size": "Medium" }) || V(set, { "🎚️ Style": err ? "Destructive" : "Default", "🎚️ State": st2, "🎚️ Size": "Medium" }) || V(set, { "🖌️ Style": "Default", "🎚️ State": "Default", "🎚️ Size": "Medium" }) || V(set, { "🎚️ Style": "Default", "🎚️ State": "Default", "🎚️ Size": "Medium" });
          if (!v) {push("field-no-variant:" + label);continue;}
          const w = Math.round(Math.max(lab.width, ctl.width));const i = v.createInstance();
          setP(i, { "👁️ Label": true, "👁️ Mandatory Star": star, "⌨️ Placeholder": val || " ", "👁️ Assistive Text": Boolean(assist && !(kind === "area" && counter && !errMsg)), "👁️ Character Counter": Boolean(counter), "⌨️ Character Counter": counter || "0/500" });
          const lt = i.findAll((n) => n.type === "TEXT").find((t) => /^Label$/i.test(t.name) || t.characters === "Label");if (lt) {await loadAll(lt);lt.characters = label;}
          if (assist) {const im = i.findOne((n) => n.type === "INSTANCE" && /^(inline-message|Assistive text)$/i.test(n.name));if (im) setP(im, { "🖌️ Style": errMsg ? "Error" : "Default", "⌨️ Message": assist.replace(/\s*·?\s*\d+\/\d+$/, ""), "📍 Icon": Boolean(errMsg) });}
          if (extraBtn) { extraBtn.insertChild(0, i); extraBtn.counterAxisAlignItems = "MIN"; const bw = figma.createAutoLayout("HORIZONTAL", { name: "btn-wrap" }); bw.fills = []; bw.itemSpacing = 8; bw.counterAxisAlignItems = "CENTER"; const bws = extraBtn.children.filter((c) => c !== i && c !== ctl && /^(Button|Link)/.test(c.name)); extraBtn.appendChild(bw); for (const c of bws) bw.appendChild(c); bw.setBoundVariable("paddingTop", await gvar(32)); } else p.insertChild(i0, i);try {i.layoutSizingHorizontal = lab.layoutSizingHorizontal === "FILL" || ctl.layoutSizingHorizontal === "FILL" ? "FILL" : "FIXED";if (i.layoutSizingHorizontal === "FIXED") i.resize(w, i.height);} catch (e) {}
          i.name = "field · " + label; if (kind === "date") setP(i, { "👁️ Trailing Icon": true });if (ctl.findOne && ctl.findOne((x) => /^Button/.test(x.name) && /^(Afișează|Ascunde)/.test(textOf(x)))) { setP(i, { "👁️ Trailing Icon": true }); await setIcon(i, "🔄 Trailing Icon: ", await ic("eye"), "20"); } if (extraBtn) { try { i.layoutSizingHorizontal = "FILL"; } catch (e) {} } { const im0 = i.findOne((n) => n.type === "INSTANCE" && n.name === "inline-message"); if (im0) try { im0.layoutSizingHorizontal = "FILL"; } catch (e) {} } if (hasInfo) { const ico = (await figma.importComponentByKeyAsync("c85edce9215a5467b91c19e054378528a8fd0168")).createInstance(); const hp = i.parent; hp.appendChild(ico); ico.layoutPositioning = "ABSOLUTE"; const lf = i.children.find((c) => c.name === "Label"); const vis = lf ? lf.children.filter((c) => c.visible) : []; const w2 = vis.reduce((a, c) => a + c.width, 0) + (lf ? lf.itemSpacing * Math.max(0, vis.length - 1) : 0); ico.x = i.x + w2 + 4; ico.y = i.y + 2; ico.name = "info · tooltip"; }lab.remove();ctl.remove();for (const m of msgs) m.remove();push("field-" + kind);
        }
        for (const b of ra(root, (n) => n.type === "FRAME" && /^Button/.test(n.name) && /^Filtrare avansată/.test(textOf(n)))) {
          const on = isBlue(fillC(texts(b)[0])) || isBlue(strokeC(b));
          const i = (V(C.chip, { "🎚️ State": on ? "Selected" : "Unselected", "🎚️ Type": "Mono Selection", "📍 Icon": "Leading" }) || V(C.chip, { "🎚️ State": "Unselected", "🎚️ Type": "Mono Selection", "📍 Icon": "Leading" })).createInstance();
          setP(i, { "⌨️ Label": "Filtrare avansată", "👁️ Counter Badge": false }); const fi = i.findOne((x) => x.type === "INSTANCE"); if (fi) fi.swapComponent(await ic("filter"));i.name = "chip · Filtrare avansată";place(b, i);push("chip");
        }
        for (const b of ra(root, (n) => n.type === "FRAME" && /^Button/.test(n.name) && !/^Button - (Copiază|Sortează)/.test(n.name) && !(/^Button - Închide/.test(n.name) && n.width > 60) && Math.abs(n.width - n.height) < 2 && n.height >= 24 && n.height <= 44 && !textOf(n))) {
          if (b.removed) continue;const more = /acțiuni|Acțiuni|Mai multe/.test(b.name); const close = /^Button - Închide/.test(b.name);const exp = /Export|Descarc/.test(b.name);
          const size = b.height >= 38 ? "Medium" : "Small";const px = size === "Small" ? "16" : "20";const open = more && isBlue(strokeC(b)) && (b.strokeWeight === figma.mixed || b.strokeWeight >= 1.5);
          const set = more || close ? C.textRect : C.rect; const want = more || close ? { "🖌️ Style": "Strict", "📍 Icon": "Only", "🎚️ Size": size, "🎚️ State": open ? "Focus" : "Default" } : { "🖌️ Style": "Neutral", "📍 Icon": "Only", "🎚️ Size": size, "🎚️ State": "Default" };
          const v = V(set, want) || V(set, { ...want, "🎚️ State": "Default" });if (!v) {push("iconbtn-no-variant");continue;}
          const i = v.createInstance();const comp = more ? await ic("more") : close ? await ic("cross") : exp ? await ic("download") : b.children[0] ? localIcon(b.children[0], b.name.replace(/^Button - /, "")) : null;
          if (comp) await setIcon(i, "🔄 Leading Icon: ", comp, px);i.name = "btn · " + (more ? "⋮" : b.name.replace(/^Button - /, "").slice(0, 30));place(b, i);push(more ? "more" : "iconbtn");
        }
        for (const b of ra(root, (n) => n.type === "FRAME" && /^(Button|Link)/.test(n.name) && !/^Button - (Copiază|Sortează|Închide)/.test(n.name) && n.height >= 28 && n.height <= 52 && textOf(n) && textOf(n).length <= 60 && !/^\d+$/.test(textOf(n)))) {
          if (b.removed) continue;const label = textOf(b);const kids = b.children;const hasIc = kids[0] && kids[0].name === "Icon";const trailing = !hasIc && kids.length > 1 && kids[kids.length - 1].name === "Icon";
          const fc = fillC(b);const tc = fillC(texts(b)[0]);const round = R(b) >= 999;const size = b.height >= 46 ? "Large" : b.height >= 38 ? "Medium" : "Small";const px = size === "Small" ? "16" : "20";
          if (fc && isWhite(fc) && strokeC(b) && trailing) { const w0 = Math.round(b.width); const tv = texts(b)[0]; const has = tv && isDark(fillC(tv)); const si = V(C.sel, { "🖌️ Style": "Default", "🎚️ State": has ? "Filled" : "Default", "🎚️ Size": b.height >= 46 ? "Large" : "Medium" }).createInstance(); setP(si, { "👁️ Label": false, "👁️ Assistive Text": false, "👁️ Mandatory Star": false, "⌨️ Placeholder": label }); si.name = "select · " + label.slice(0, 30); place(b, si); try { si.layoutSizingHorizontal = "FIXED"; si.resize(w0, si.height); } catch (e) {} push("select"); continue; }let set, style;if (isBlue(fc)) {set = round ? C.circ : C.rect;style = "Primary";} else if (isRed(fc)) {set = round ? C.circ : C.rect;style = "Destructive";} else if (isGreyBtn(fc)) {set = round ? C.circ : C.rect;style = "Neutral";} else
          {set = round ? C.textCirc : C.textRect;style = isBlue(tc) ? "Primary" : isRed(tc) ? "Destructive" : "Strict";}
          const mode = hasIc ? "Leading" : trailing ? "Trailing" : "None";
          const v = V(set, { "🖌️ Style": style, "📍 Icon": mode, "🎚️ Size": size, "🎚️ State": /\(deschis\)/.test(b.name) ? "Focus" : "Default" }) || V(set, { "🖌️ Style": style, "📍 Icon": "None", "🎚️ Size": size, "🎚️ State": "Default" });if (!v) {push("no-variant:" + label.slice(0, 20));continue;}
          const i = v.createInstance();setP(i, { "⌨️ Label": label });
          if (hasIc || trailing) {const k = ICON_BY_LABEL(label);const comp = trailing && /^(Exportă|Acțiuni|Mai mult)/.test(label) ? await ic("down") : k ? await ic(k) : localIcon(hasIc ? kids[0] : kids[kids.length - 1], label);await setIcon(i, hasIc ? "🔄 Leading Icon: " : "🔄 Trailing Icon: ", comp, px);}
          i.name = "btn · " + label.slice(0, 40);place(b, i);push("btn");
        }
        for (const b of ra(root, (n) => n.type === "FRAME" && /^Button - Copiază/.test(n.name))) {
          b.layoutMode = "HORIZONTAL";b.itemSpacing = 4;b.counterAxisAlignItems = "CENTER";b.primaryAxisSizingMode = "AUTO";b.counterAxisSizingMode = "AUTO";
          const icn = b.children.find((k) => k.name === "Icon");if (icn) {const ci = (await ic("copy")).createInstance();ci.resize(16, 16);ci.name = "icon · copiază";b.insertChild(b.children.indexOf(icn), ci);icn.remove();}
          b.name = "Copiază (copy)";push("copy");
        }
        for (const f of ra(root, (n) => n.type === "FRAME" && Math.round(n.width) >= 16 && Math.round(n.width) <= 22 && Math.abs(n.width - n.height) < 1 && R(n) >= 3 && R(n) <= 6 && (strokeC(n) || isBlue(fillC(n))) && !textOf(n))) { if (f.removed) continue; const on = isBlue(fillC(f)); const par = f.parent; const i = V(C.chk, { "🎚️ Mode": on ? "Checked" : "Unchecked", "🎚️ State": "Default", "🎚️ Size": f.width <= 17 ? "Small" : "Medium" }).createInstance(); i.name = "checkbox"; place(f, i); if (par && par.name === "Label") par.name = "Opțiune · " + textOf(par).slice(0, 30); push("checkbox"); }
    for (const f of ra(root, isTagFrame)) {if (f.removed) continue;const label = textOf(f);const t = V(C.tag, { "🎚️ Type": "Subtle", "🖌️ Style": tagStyle(fillC(f)), "📍 Icon": "None", "🎚️ Size": "Small" }).createInstance();setP(t, { "⌨️ Label": label });t.name = "tag · " + label;place(f, t);push("tag");}
        for (const f of ra(root, (n) => n.type === "FRAME" && /^Checkbox/.test(n.name) && n.height <= 22)) {const on = isBlue(fillC(f));const i = V(C.chk, { "🎚️ Mode": on ? "Checked" : "Unchecked", "🎚️ State": "Default", "🎚️ Size": f.height <= 17 ? "Small" : "Medium" }).createInstance();i.name = "checkbox";place(f, i);push("checkbox");}
        for (const hc of ra(root, (n) => n.type === "FRAME" && n.name === "Header Cell")) {
          const w = Math.round(hc.width),h = Math.round(hc.height);const label = textOf(hc);const sort = Boolean(hc.findOne((x) => /^Button - Sortează/.test(x.name)));
          const i = (V(C.th, { "📏 Breakpoint": "Mobile", "🎚️ Type": "Subtle" })|| C.th.children[0]).createInstance();setP(i, { "⌨️ Title": label || " ", "📍 Sort Icon": sort, "👁️ Header": true });
          i.name = "th · " + label;place(hc, i);try {i.layoutSizingHorizontal = "FIXED";i.resize(w, h);} catch (e) {i.resize(w, h);}push("th");
        }
        for (const pg of ra(root, (n) => n.type === "FRAME" && n.name === "Pagination")) {const nums = pg.findAll((x) => (x.type === "FRAME") && /^\d+$/.test(textOf(x)) && x.children.length <= 2 && x.height >= 30).map((x) => ({ n: textOf(x), on: isBlue(fillC(x)) })); const i = V(C.pag, { "📏 Breakpoint": "Desktop" }).createInstance(); i.name = "pagination";
      const items = i.findAll((x) => x.type === "INSTANCE" && /pagination-item/.test((x.mainComponent && x.mainComponent.parent ? x.mainComponent.parent.name : "") + x.name)); const sel = Math.max(0, nums.findIndex((x) => x.on));
      for (let k = 0; k < items.length; k++) { if (k >= nums.length) { items[k].visible = false; continue; } const it = items[k]; const vv = it.mainComponent.parent.children.find((c) => c.name.includes("Type=" + (k === sel ? "Selected" : "Unselected")) && c.name.includes("State=Default") && c.name.includes("Desktop")); if (vv) it.swapComponent(vv); const tx = it.findOne((x) => x.type === "TEXT"); if (tx) { await loadAll(tx); tx.characters = nums[k].n; } }
      const pb = i.children.filter((x) => x.type === "INSTANCE"); if (pb[0] && sel === 0) setP(pb[0], { "🎚️ State": "Disabled" }); if (pb[1] && sel === nums.length - 1) setP(pb[1], { "🎚️ State": "Disabled" });
      place(pg, i); push("pager");}
        for (const dd of ra(root, (n) => n.type === "FRAME" && /^Dropdown - Rows per page/.test(n.name))) {const w = Math.round(dd.width);const val = textOf(dd);const i = V(C.sel, { "🖌️ Style": "Default", "🎚️ State": "Filled", "🎚️ Size": "Medium" }).createInstance();setP(i, { "👁️ Label": false, "👁️ Assistive Text": false, "👁️ Mandatory Star": false, "⌨️ Placeholder": val });i.name = "select · rânduri pe pagină"; const box = dd.parent && strokeC(dd.parent) && dd.parent.children.length <= 3 ? dd.parent : dd; place(box, i);i.layoutSizingHorizontal = "FIXED"; i.resize(Math.max(w, 88), i.height);push("rows");}
      }
      for (const f of screen.findAll((n) => n.type === "FRAME" && /^Button - (Deschide|Redă)/.test(n.name) && n.height > 100)) f.name = f.name.replace(/^Button - /, "Miniatură · ");
  const mSet = await g(L.modal);for (const o of dlgs.filter((q) => !pops.includes(q) && !drawers.includes(q))) {const d = o.d;const hd = d.children[0];const bodyD = d.children[1];const ft = d.children[2];
        const ttl = hd ? texts(hd)[0] : null;const sub = hd ? texts(hd)[1] : null;
        const onlyText = bodyD && bodyD.children.length <= 2 && bodyD.children.every((k) => k.type === "TEXT" || k.type === "FRAME" && k.children.every((x) => x.type === "TEXT"));
        const tip = onlyText ? "Confirmare" : "Conținut";
        const m = V(mSet, { Tip: tip }).createInstance();m.name = "Modal · " + (ttl ? ttl.characters : "");
        setP(m, { "Titlu": ttl ? ttl.characters : "", "Subtitlu": sub ? sub.characters : "", "Mesaj": onlyText && bodyD ? textOf(bodyD) : "" });
        if (tip === "Conținut" && bodyD) {const cc = bodyD.clone();SEC.appendChild(cc);cc.x = 1600;cc.y = 1700 + SEC.children.length * 10;const comp = figma.createComponentFromNode(cc);comp.name = "Modal conținut / " + (OPT.names && OPT.names[rid] || rid);comp.fills = []; comp.paddingLeft = 0; comp.paddingRight = 0; comp.paddingTop = 0; comp.paddingBottom = 0; comp.counterAxisSizingMode = "FIXED"; comp.resize(Math.round(d.width) - 40, comp.height);comp.primaryAxisSizingMode = "AUTO"; setP(m, { "Conținut": comp.id });const ci = m.children.find((n) => n.name === "modal-content").children[0];if (ci) {ci.layoutSizingHorizontal = "FILL";}if (!sub || !sub.characters) {const s2 = m.children.find((n) => n.name === "modal--header").children.find((n) => n.name === "Subtitlu");if (s2) s2.visible = false;}}
        const fb = ft ? ft.findAll((n) => (n.type === "FRAME" || n.type === "INSTANCE") && /^(Button|btn ·)/.test(n.name)) : [];const mft = m.children.find((n) => n.name === "modal--footer");const mb = mft.children.filter((n) => n.type === "INSTANCE" && /^btn · /.test(n.name)); if (!fb.length) mft.visible = false;for (let k = 0; k < mb.length; k++) {const src = fb[k];if (!src) {mb[k].visible = false;continue;}const label = src.type === "INSTANCE" ? src.componentProperties[prop(src, "⌨️ Label")].value : textOf(src);const fc = src.type === "INSTANCE" ? null : fillC(src);const style = src.type === "INSTANCE" ? /Primary/.test(src.mainComponent ? src.mainComponent.name : "") ? "Primary" : /Destructive/.test(src.mainComponent ? src.mainComponent.name : "") ? "Destructive" : "Neutral" : isBlue(fc) ? "Primary" : isRed(fc) ? "Destructive" : "Neutral";const size = src.height >= 46 ? "Large" : "Medium";setP(mb[k], { "⌨️ Label": label, "🖌️ Style": style, "🎚️ Size": size });mb[k].name = "btn · " + label;}
        const ov = figma.createFrame();ov.name = "Overlay";ov.fills = [paintV(VAR.scrim)];ov.clipsContent = false;screen.appendChild(ov);ov.layoutPositioning = "ABSOLUTE";ov.x = 0;ov.y = 0;ov.resize(1440, 1024);ov.constraints = { horizontal: "STRETCH", vertical: "STRETCH" };
        ov.appendChild(m); if (Math.abs(d.width - 590) > 4) m.resize(Math.round(d.width), m.height);m.x = o.x;m.y = o.y;push("modal-" + tip);
      }
      const mc = SEC.findAll((n) => n.type === "COMPONENT" && n.name === "Modal conținut / " + (OPT.names && OPT.names[rid] || rid));
      
  { const TXTV = await figma.variables.importVariableByKeyAsync("c37576ba1791b00ac80a9a55579913b69d0b8b8f"); const ICOV = await figma.variables.importVariableByKeyAsync("d3eb48f11a0d6190109fbfce85fe29c503086178");
    for (const n of screen.findAll((x) => !inI(x) && x.type !== "INSTANCE" && "fills" in x)) { for (const key of ["fills", "strokes"]) { const ps = n[key]; if (!Array.isArray(ps) || !ps.length) continue; let ch = false; const np = [];
      for (const p of ps) { if (p.type === "SOLID" && !(p.boundVariables && p.boundVariables.color)) { if (p.opacity !== undefined && p.opacity < 0.01) { ch = true; continue; } const c = p.color; const blk = c.r < 0.1 && c.g < 0.1 && c.b < 0.1; if (blk && n.type === "TEXT") { np.push(figma.variables.setBoundVariableForPaint(p, "color", TXTV)); ch = true; continue; } if (blk && (n.type === "VECTOR" || n.type === "BOOLEAN_OPERATION")) { np.push(figma.variables.setBoundVariableForPaint(p, "color", ICOV)); ch = true; continue; } } np.push(p); }
      if (ch) n[key] = np; } }
    for (const f of screen.findAll((x) => x.type === "FRAME" && x.name === "egov-logo" && x.layoutMode === "NONE" && !inI(x))) { const kids = [...f.children].sort((a, b) => a.x - b.x); f.layoutMode = "HORIZONTAL"; f.itemSpacing = 4; f.counterAxisAlignItems = "CENTER"; f.primaryAxisSizingMode = "AUTO"; f.counterAxisSizingMode = "AUTO"; kids.forEach((k) => f.appendChild(k)); }
    for (const tl of screen.findAll((x) => x.type === "FRAME" && /^Tab List/.test(x.name) && !inI(x))) { tl.clipsContent = false; if (tl.layoutMode && tl.layoutMode !== "NONE") tl.counterAxisSizingMode = "AUTO"; let p = tl.parent; for (let i = 0; i < 2 && p; i++, p = p.parent) { if (p.clipsContent && p !== screen) { p.clipsContent = false; if (p.layoutMode === "VERTICAL") p.primaryAxisSizingMode = "AUTO"; else if (p.layoutMode === "HORIZONTAL") p.counterAxisSizingMode = "AUTO"; } } }
    for (const f of screen.findAll((x) => x.type === "FRAME" && x.layoutMode === "NONE" && !inI(x) && /^(Filtre|List)$/.test(x.name) && x.children.length >= 2)) { try { const W0 = f.width; const kids = f.children.filter((k) => k.visible !== false && k.layoutPositioning !== "ABSOLUTE").map((k) => ({ k, x: k.x, y: k.y, w: k.width, h: k.height })); const ys = []; for (const y of kids.map((k) => k.y).sort((a, b) => a - b)) if (!ys.length || y - ys[ys.length - 1] > 8) ys.push(y); const rows = ys.map((y, i) => kids.filter((k) => k.y >= y - 0.5 && (i + 1 >= ys.length || k.y < ys[i + 1] - 0.5)).sort((a, b) => a.x - b.x)); const rowGap = rows.length > 1 ? Math.max(0, Math.round(rows[1][0].y - (rows[0][0].y + Math.max(...rows[0].map((k) => k.h))))) : 0; const left = Math.round(Math.min(...kids.map((k) => k.x)));
      f.layoutMode = "VERTICAL"; f.itemSpacing = rowGap; f.paddingLeft = left; f.counterAxisAlignItems = "MIN"; f.primaryAxisSizingMode = "AUTO"; f.counterAxisSizingMode = "FIXED"; f.resize(W0, f.height);
      rows.forEach((row, ri) => { const r = figma.createAutoLayout("HORIZONTAL", { name: "Rând " + (ri + 1) }); r.fills = []; r.clipsContent = false; r.counterAxisAlignItems = "CENTER"; f.appendChild(r); r.layoutSizingHorizontal = "FILL"; const gaps = row.slice(1).map((k, i) => k.x - row[i].x - row[i].w); if (row.length === 2 && gaps[0] > 48) r.primaryAxisAlignItems = "SPACE_BETWEEN"; else { const gg = Math.max(0, Math.round(gaps[0] || 0)); r.itemSpacing = gg === 15 ? 16 : gg; } for (const it of row) r.appendChild(it.k); }); } catch (e) {} }
  }
  for (const f of screen.findAll((x) => x.type === "FRAME" && /^Button - .*:margin$/.test(x.name))) f.name = "Acțiune:margin";
  for (const f of screen.findAll((x) => x.type === "FRAME" && x.name === "Label" && x.findOne((y) => y.type === "INSTANCE" && y.name === "select · rânduri pe pagină"))) f.name = "Rânduri pe pagină";
  const tok = await TOKENIZE([screen, ...mc]);for (const ov of screen.children.filter((n) => n.name === "Overlay")) { ov.resize(1440, screen.height); for (const dr of ov.children.filter((k) => k.name.startsWith("Drawer · "))) { if (dr.height < screen.height) dr.resize(dr.width, screen.height); } }const left = screen.findAll((n) => n.type === "FRAME" && !inI(n) && /^(Button\b|Button - |Search Input|Tab$|Dialog|Label$|Text Area|Checkbox)/.test(n.name)).map((n) => `${n.name.slice(0, 36)} ${Math.round(n.width)}x${Math.round(n.height)} (${n.id})`);
      cap.remove();
      const counts = {};done.forEach((d) => {counts[d] = (counts[d] || 0) + 1;});
      report[rid] = { screen: screen.id, h: Math.round(screen.height), role, nav, counts, unmapped: left.slice(0, 15), more: Math.max(0, left.length - 15) };
    }
    return report;
  