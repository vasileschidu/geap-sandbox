// FO guest / wizard captures → library instances, for the FOD-Components-flow file (pvDAJPXKyUuJgz3P921Ye8).
// Used by the figma-designer agent for the „Guest lane · without account” blocks (G0–G8, 2026-10-13).
// Input: full-page captures of e-permits-acte-permisive.html?state=fo-g… (capture-to-figma.mjs --width 1440
// [--height <page height>]; 375 for mobile). Paste as the `code` of use_figma after setting ROOTS (+ OPT),
// then paste tools/figma/tokenize.js at //TOKENIZE. Retry-safe: only raw (non-instance) frames are touched.
//
// Maps (library „Components” lk-03f…, icons „Foundations” lk-e9e8…, all imported BY KEY):
//   field (label row + 40/48 box [+ hint / error / loading paragraph]) → text-input / phone-number-input
//     (Label, Mandatory Star, Placeholder = value or placeholder, Assistive Text = inline-message
//     Default / Error / spinner for loading; Style=Destructive on a red box; grey box → Read Only;
//     skeleton box → Read Only with an empty value). The „0/13” counter has no slot in the library →
//     wrapper „Câmp · <label> (contor)” with the counter text ABSOLUTE top-right (library gap).
//   select box (chevron) → select-input · search box (magnifier) → search-input-rectangular
//   CSS GRID field containers → VERTICAL + HORIZONTAL rows (gaps measured)
//   segmented PF / PJ → segmented-control (Mode On = selected) · radio options → radio-label wrapped in
//   „Opțiune radio” (padding 12/16, radius 12 = the full-row hit area; hover = background/base/tertiary)
//   consent / options checkbox → checkbox-label Size=Small (Error state + error message)
//   buttons → button-filled-rectangular (Primary / Secondary / Neutral / Strict) / -circular /
//     button-outlined-* / button-text-rectangular (icon-only by aria name) / button-badge-filled (MPass,
//     MSign) — icons by label, never recoloured · tags → tag-filled Small · Header → clone of the board's
//     „.temp” EVO header instance (OPT.header).
const ROOTS = ["PUT:CAPTURE-ROOT-IDS"];
const OPT = { header: "302:6020", mobile: false };
const g = (id) => figma.getNodeByIdAsync(id);
for (const f of [["Onest", "Regular"], ["Onest", "Medium"], ["Onest", "SemiBold"], ["Onest", "Bold"]]) { try { await figma.loadFontAsync({ family: f[0], style: f[1] }); } catch (e) {} }
const KS = { text: "f035f11544e0883bc29ca99b48309238db82edf8", phone: "f2ba725de62bbecd5bd84870a1e6b7bb1eb5adfe", seg: "eae5f7ebab22bf81c20c791f38f0baecfd3f8eb2",
  radio: "513e56108ce8f11caec41350386e3662ac05d004", chk: "3cf40c11a574bcefcc4f9daf0f93322f77a627a1", rect: "2cbe2c350e7c6b3948dc449660ede8355511c384",
  textRect: "4ad2518c34b8b51d5113119316eac5934c1eb9fb", outRect: "4ca8aa0074c54a1d27230b1cd03785b5f788af96", outCirc: "d7a0779b1fb70ccfc95c66ab762d577273913015",
  circ: "fcf938f6ce9e31ae7f0f11838ee889335b4b7728", badge: "a2f454750a16ce898460c188b119ee6dcd5835e8", sel: "24351877baeb81b99cceea90d885b3455191ac62",
  tag: "a97109f9ebf668fb7616cb37e46929fc75ed9070", spin: "d38a117c520f1f18cf1e41292733a77a29b8148e", search: "a27b4efaed053f6cd4a57411a032d7391174c425" };
const C = {}; for (const [k, key] of Object.entries(KS)) C[k] = await figma.importComponentSetByKeyAsync(key);
const IK = { right: "d4bcc2d06aae1f996b75052e41d3755a1c1e4978", left: "f9c5634defdccc7ae2468696b4dc02438da46658", upload: "e72e41aa51a34c586d0e3e31309dc738551e1ba8",
  edit: "bef76865a142fa255aebe7a98f7a0411943e8c29", cross: "3ccb9372951f0b3c922b004d8966a680404cd11f", eye: "faa2ea508755b47b8354bf6bb7d659776a525294", copy: "89c577ec6b8f893a92741093af50a237eb383016" };
const ICC = {}; const ic = async (k) => (ICC[k] ||= await figma.importComponentByKeyAsync(IK[k]));
const HEADER = OPT.header ? await g(OPT.header) : null;
const V = (set, want) => set.children.find((c) => Object.entries(want).every(([k, v]) => c.name.includes(`${k}=${v}`)));
const prop = (i, s) => Object.keys(i.componentProperties).find((k) => k.startsWith(s));
const setP = (i, map) => { const o = {}; for (const [p, v] of Object.entries(map)) { const k = prop(i, p); if (!k) continue; const ty = i.componentProperties[k].type; if (v === undefined || v === null) { if (ty === "BOOLEAN") o[k] = false; continue; } o[k] = ty === "BOOLEAN" ? Boolean(v) : v; } i.setProperties(o); };
const loadAll = async (t) => { for (const s of t.getStyledTextSegments(["fontName"])) await figma.loadFontAsync(s.fontName); };
const setText = async (i, name, s) => { const t = i.findOne((n) => n.type === "TEXT" && n.name === name); if (t) { await loadAll(t); t.characters = s; } return t; };
const texts = (n) => (n.type === "TEXT" ? [n] : n.findAll ? n.findAll((x) => x.type === "TEXT" && x.visible !== false) : []);
const textOf = (n) => texts(n).map((x) => x.characters).join(" ").replace(/\s+/g, " ").trim();
const solid = (paints) => (Array.isArray(paints) ? paints.find((p) => p.visible !== false && p.type === "SOLID") : null);
const fillC = (n) => { const p = n && solid(n.fills); return p ? p.color : null; };
const strokeC = (n) => { const p = n && solid(n.strokes); return p ? p.color : null; };
const isRed = (c) => c && c.r > 0.7 && c.g < 0.35 && c.b < 0.35;
const isBlue = (c) => c && c.b > 0.6 && c.r < 0.3;
const isLightBlue = (c) => c && c.b > 0.9 && c.r > 0.85 && c.r < 0.95;
const isDark = (c) => c && c.r < 0.2 && c.g < 0.2 && c.b < 0.2;
const isWhite = (c) => c && c.r > 0.97 && c.g > 0.97 && c.b > 0.97;
const isGrey = (c) => c && !isWhite(c) && Math.abs(c.r - c.g) < 0.03 && Math.abs(c.g - c.b) < 0.03 && c.r > 0.85;
const isPlaceholder = (t) => { const c = fillC(t); return c && c.r > 0.4 && c.r < 0.55; };
const inInst = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const inSkip = (n) => { for (let p = n; p; p = p.parent) if (/^(Navigation - Pași|Header)$/.test(p.name) || (p.name || "").startsWith("Opțiune radio")) return true; return false; };
const R = (n) => (n.cornerRadius === figma.mixed ? n.topLeftRadius : n.cornerRadius || 0);
const place = (old, inst, w) => {
  const p = old.parent, i = p.children.indexOf(old); p.insertChild(i, inst);
  if (!p.layoutMode || p.layoutMode === "NONE") { inst.x = old.x; inst.y = old.y; }
  else if (old.layoutSizingHorizontal === "FILL") { try { inst.layoutSizingHorizontal = "FILL"; } catch (e) {} }
  else if (w) { try { inst.layoutSizingHorizontal = "FIXED"; inst.resize(w, inst.height); } catch (e) {} }
  if (old.layoutPositioning === "ABSOLUTE") { inst.layoutPositioning = "ABSOLUTE"; inst.x = old.x; inst.y = old.y; }
  old.remove(); return inst;
};
const report = {};
const ra = (root, pred) => root.findAll((n) => !n.removed && !inInst(n) && !inSkip(n) && pred(n));

/* GRID → VERTICAL + HORIZONTAL rows (row gap / column gap measured) */
const ungrid = (f) => {
  if (f.layoutMode !== "GRID") return false;
  const kids = f.children.filter((k) => k.layoutPositioning !== "ABSOLUTE").map((k) => ({ k, x: Math.round(k.x), y: Math.round(k.y), w: k.width, h: k.height }));
  const ys = [...new Set(kids.map((k) => k.y))].sort((a, b) => a - b);
  const rows = ys.map((y) => kids.filter((k) => k.y === y).sort((a, b) => a.x - b.x));
  const pt = f.paddingTop, pb = f.paddingBottom, pl = f.paddingLeft, pr = f.paddingRight;
  const rowGap = rows.length > 1 ? Math.max(0, Math.round(rows[1][0].y - (rows[0][0].y + Math.max(...rows[0].map((k) => k.h))))) : 24;
  f.layoutMode = "VERTICAL"; f.itemSpacing = rowGap; f.paddingTop = pt; f.paddingBottom = pb; f.paddingLeft = pl; f.paddingRight = pr; f.counterAxisAlignItems = "MIN";
  f.primaryAxisSizingMode = "AUTO";
  for (const [ri, row] of rows.entries()) {
    if (row.length === 1 && Math.abs(row[0].w - (f.width - pl - pr)) < 2) { f.appendChild(row[0].k); try { row[0].k.layoutSizingHorizontal = "FILL"; } catch (e) {} continue; }
    const r = figma.createAutoLayout("HORIZONTAL", { name: "Rând " + (ri + 1) }); r.fills = []; r.clipsContent = false; r.counterAxisAlignItems = "MIN";
    r.itemSpacing = row.length > 1 ? Math.max(0, Math.round(row[1].x - row[0].x - row[0].w)) : 32;
    f.appendChild(r); r.layoutSizingHorizontal = "FILL"; r.layoutSizingVertical = "HUG";
    for (const it of row) { r.appendChild(it.k); try { it.k.layoutSizingHorizontal = "FIXED"; it.k.resize(it.w, it.k.height); } catch (e) {} }
  }
  return true;
};
/* any non-auto-layout frame whose children sit in one row / one column → auto-layout */
const autoRow = (f) => {
  if (f.layoutMode && f.layoutMode !== "NONE") return false;
  const kids = f.children.filter((k) => k.visible !== false); if (kids.length < 2) return false;
  const sameY = kids.every((k) => Math.abs(k.y - kids[0].y) < 4), sameX = kids.every((k) => Math.abs(k.x - kids[0].x) < 4);
  if (!sameY && !sameX) return false;
  const s = [...kids].sort((a, b) => (sameY ? a.x - b.x : a.y - b.y));
  const gap = sameY ? Math.round(s[1].x - s[0].x - s[0].width) : Math.round(s[1].y - s[0].y - s[0].height);
  const w = f.width, h = f.height;
  f.layoutMode = sameY ? "HORIZONTAL" : "VERTICAL"; f.itemSpacing = Math.max(0, gap); f.counterAxisAlignItems = "MIN";
  for (const k of s) f.appendChild(k);
  f.primaryAxisSizingMode = "FIXED"; f.counterAxisSizingMode = "AUTO"; f.resize(w, f.height);
  return true;
};

const labelInfo = (lf) => {
  const lab = lf.name === "Label" ? lf : lf.children && lf.children.find((k) => k.name === "Label");
  if (!lab) return null;
  const t = lab.findOne((x) => x.type === "TEXT"); if (!t) return null;
  const counter = lf.findOne((x) => x.type === "TEXT" && /^\d+\/\d+$/.test(x.characters));
  return { label: t.characters.trim(), star: Boolean(lab.findOne((x) => x.name === "obligatoriu")), counter };
};
const boxKind = (b) => {
  if (b.type !== "FRAME" || b.height < 36 || b.height > 52 || Math.abs(R(b) - 8) > 0.6) return null;
  const f0 = b.fills && b.fills !== figma.mixed && b.fills.find((p) => p.visible !== false);
  if (f0 && f0.type !== "SOLID" && !b.findOne((x) => x.type === "TEXT")) return "skeleton";
  if (!b.findOne((x) => x.type === "TEXT")) return null;
  if (b.findOne((x) => x.name === "Phone Input") || /\+373/.test(textOf(b))) return "phone";
  if (b.findOne((x) => /Search|Căutare/.test(x.name)) || (b.children[0] && b.children[0].name === "Icon" && /Caută|Ex\.:/.test(textOf(b)))) return "search";
  if (b.findOne((x) => /Combobox|Select|^Listbox/.test(x.name)) || (b.children.length && b.children[b.children.length - 1].name === "Icon" && !b.findOne((x) => /Input$/.test(x.name)))) return "select";
  if (isGrey(fillC(b))) return "readonly"; // read-only (registry / SRRE) boxes are grey, with or without a hairline
  if (b.findOne((x) => /Input$/.test(x.name)) || (b.strokes && b.strokes.length)) return "text";
  return null;
};
const msgOf = (p) => {
  const tx = texts(p); if (!tx.length) return null; const text = tx.map((t) => t.characters).join(" ").replace(/\s+/g, " ").trim();
  const spin = p.findOne((x) => x.type === "FRAME" && x.width <= 20 && x.width >= 12 && isBlue(strokeC(x)));
  const tone = spin ? "loading" : isRed(fillC(tx[0])) ? "error" : "hint";
  return { tone, text };
};
const message = async (inst, m) => {
  const im = inst.findOne((n) => n.type === "INSTANCE" && n.name === "inline-message"); if (!im || !m) return;
  setP(im, { "🖌️ Style": m.tone === "error" ? "Error" : "Default", "⌨️ Message": m.text, "📍 Icon": m.tone !== "hint" });
  if (m.tone === "loading") { const icn = im.children.find((c) => c.type === "INSTANCE"); if (icn) { const sp = V(C.spin, { "Size": "Extra Small", "Style": "Brand" }) || V(C.spin, { "Style": "Brand" }) || C.spin.children[0]; const s = icn.width; icn.swapComponent(sp); icn.resize(s, s); } }
  try { im.layoutSizingHorizontal = "FILL"; const tx = im.findOne((n) => n.type === "TEXT"); if (tx) { tx.layoutSizingHorizontal = "FILL"; tx.textAutoResize = "HEIGHT"; } } catch (e) {}
};
const buildField = async (kind, info, b, msg, size) => {
  const vt = b.findAll((x) => x.type === "TEXT").filter((t) => !/^\+373$|🇲🇩/.test(t.characters.trim()));
  const valT = vt[vt.length - 1]; const raw = valT ? valT.characters.trim() : "";
  const has = Boolean(valT) && !isPlaceholder(valT) && kind !== "skeleton";
  const err = isRed(strokeC(b)) || (msg && msg.tone === "error");
  let set = kind === "phone" ? C.phone : kind === "select" ? C.sel : kind === "search" ? C.search : C.text;
  const state = kind === "readonly" || kind === "skeleton" ? "Read Only" : kind === "select" && isGrey(fillC(b)) ? "Disabled" : has ? "Filled" : "Default";
  const want = { "🎚️ State": state, "🎚️ Size": size };
  if (kind === "phone") want["🎚️ Type"] = "International";
  if (kind !== "search") want["🖌️ Style"] = err ? "Destructive" : "Default";
  let v = set.children.find((c) => Object.entries(want).every(([k, val]) => c.name.includes(`${k.replace(/^\S+ /, "")}=${val}`)));
  if (!v) v = V(set, { "State": state === "Disabled" ? "Default" : state, "Size": size }) || set.children[0];
  const i = v.createInstance();
  setP(i, { "👁️ Label": true, "👁️ Mandatory Star": info.star, "👁️ Assistive Text": Boolean(msg), "👁️ Clear Button": false, "👁️ Leading Icon": false, "👁️ Trailing Icon": false, "⌨️ Placeholder": kind === "skeleton" ? " " : raw || " " });
  if (kind === "search") setP(i, { "👁️ Leading Icon": true });
  /* green check inside the box (value confirmed by a registry) → trailing 20/checkmark-small */
  const okV = b.findOne((x) => x.type === "VECTOR" && (() => { const c = fillC(x) || strokeC(x); return c && c.g > 0.45 && c.r < 0.3 && c.b < 0.5; })());
  if (okV) { setP(i, { "👁️ Trailing Icon": true }); const ck = await figma.importComponentByKeyAsync("ebea9f11db46308470d328092590727874dbec88"); const sl = prop(i, "🔄 Trailing Icon: " + (size === "Large" ? "24" : "20")) || prop(i, "🔄 Trailing Icon: 20"); if (sl) i.setProperties({ [sl]: ck.id }); }
  await setText(i, "Label", info.label);
  if (msg) await message(i, msg);
  i.name = `${kind} · ${info.label}`;
  return i;
};

for (const rid of ROOTS) {
  const root = await g(rid); if (!root) { report[rid] = "missing"; continue; }
  const done = []; const push = (k) => done.push(k);
  const size = OPT.mobile ? "Large" : "Medium";
  // 0 · header
  const hdr = root.findOne((n) => n.name === "Header" && n.type === "FRAME" && n.width > 1000 && !inInst(n));
  if (hdr && HEADER && !OPT.mobile) { const h = HEADER.clone(); h.name = "Antet serviciu (EVO)"; place(hdr, h); try { h.layoutSizingHorizontal = "FILL"; } catch (e) {} push("header"); }
  // 1 · grids first (positions are read before anything moves)
  for (const f of ra(root, (n) => n.type === "FRAME" && n.layoutMode === "GRID")) if (ungrid(f)) push("grid");
  // 2 · fields
  for (const f of ra(root, (n) => n.type === "FRAME" && n.layoutMode === "VERTICAL" && n.children.length >= 2)) {
    if (f.removed) continue;
    const info = labelInfo(f.children[0]); if (!info) continue;
    const bi = f.children.findIndex((k, idx) => idx > 0 && boxKind(k)); if (bi < 0) continue;
    const b = f.children[bi]; const kind = boxKind(b);
    const after = f.children.slice(bi + 1).filter((k) => k.visible !== false && texts(k).length);
    const msg = after.length ? msgOf(after[0]) : null;
    const w = f.width; const inst = await buildField(kind, info, b, msg, b.height >= 46 ? "Large" : size);
    if (info.counter) {
      const wrap = figma.createAutoLayout("VERTICAL", { name: `Câmp · ${info.label} (contor)` }); wrap.fills = []; wrap.clipsContent = false;
      const ct = figma.createText(); await figma.loadFontAsync(info.counter.fontName); ct.fontName = info.counter.fontName; ct.fontSize = info.counter.fontSize; ct.characters = info.counter.characters; ct.fills = JSON.parse(JSON.stringify(info.counter.fills)); ct.name = "Contor";
      place(f, wrap, w); wrap.appendChild(inst); inst.layoutSizingHorizontal = "FILL"; // read the counter BEFORE place() removes the captured field
      wrap.appendChild(ct); ct.layoutPositioning = "ABSOLUTE"; const lbT = inst.findOne((x) => x.type === "TEXT" && x.name === "Label"); ct.x = wrap.width - ct.width; ct.y = lbT ? Math.round((lbT.height - ct.height) / 2 + (lbT.absoluteTransform[1][2] - inst.absoluteTransform[1][2])) : 0; ct.constraints = { horizontal: "MAX", vertical: "MIN" };
      push("field+counter");
    } else { place(f, inst, w); push("field:" + kind); }
  }
  // 3 · segmented control
  for (const f of ra(root, (n) => n.type === "FRAME" && R(n) >= 999 && n.children.filter((k) => k.name === "Radio Button").length >= 2)) {
    if (f.removed) continue; const segs = f.children.filter((k) => k.name === "Radio Button");
    const v = V(C.seg, { "Segment Count": String(segs.length), "Breakpoint": OPT.mobile ? "Mobile" : "Desktop" }); const i = v.createInstance();
    const ctrls = i.children.filter((c) => c.type === "INSTANCE");
    segs.forEach((s, k) => { const c = ctrls[k]; if (!c) return; const t = s.findOne((x) => x.type === "TEXT"); setP(c, { "⌨️ Label": t.characters, "🎚️ Mode": isWhite(fillC(t)) ? "On" : "Off", "Leading Icon": false }); });
    i.name = "segmented-control · Soliciți în numele"; place(f, i); push("segmented");
  }
  // 4 · radio options (circle 24 + text column) — full-row wrapper with the code's padding / radius
  for (const f of ra(root, (n) => n.type === "FRAME" && n.children.length >= 2 && n.children[0].type === "FRAME" && Math.round(n.children[0].width) === 24 && Math.round(n.children[0].height) === 24 && R(n.children[0]) >= 12 && (n.children[0].strokes || []).length)) {
    if (f.removed) continue; const circ = f.children[0]; const col = f.children[1]; const tx = texts(col);
    const sel = Boolean(circ.findOne((x) => isBlue(fillC(x)))) || isBlue(strokeC(circ));
    const p = f.parent; if (p && (!p.layoutMode || p.layoutMode === "NONE")) autoRow(p);
    const wrap = figma.createAutoLayout("HORIZONTAL", { name: "Opțiune radio · " + (tx[0] ? tx[0].characters : "") }); wrap.fills = []; wrap.clipsContent = false;
    wrap.paddingTop = wrap.paddingBottom = f.paddingTop || 12; wrap.paddingLeft = wrap.paddingRight = f.paddingLeft || 16; wrap.cornerRadius = 12;
    const v = V(C.radio, { "Mode": sel ? "Selected" : "Unselected", "State": "Default", "Size": "Medium", "Supporting Text": tx.length > 1 ? "True" : "False" });
    const i = v.createInstance(); setP(i, { "⌨️ Label": tx[0] ? tx[0].characters : "", "⌨️ Supporting Text": tx[1] ? tx[1].characters : "", "👁️ Error Message": false });
    i.name = "radio-label"; const w = f.width; place(f, wrap, w); wrap.appendChild(i); i.layoutSizingHorizontal = "FILL"; push("radio");
  }
  // 5 · checkbox (box 20 + text) → checkbox-label Small
  for (const f of ra(root, (n) => n.type === "FRAME" && n.children.length >= 2 && n.children[0].type === "FRAME" && Math.round(n.children[0].width) === 20 && Math.round(n.children[0].height) === 20 && Math.abs(R(n.children[0]) - 6) < 1 && (((n.children[0].strokes || []).length) || isBlue(fillC(n.children[0]))))) {
    if (f.removed) continue; const box = f.children[0]; const tx = texts(f.children[1]);
    const on = isBlue(fillC(box)); const err = isRed(strokeC(box));
    const p = f.parent, idx = p.children.indexOf(f); const nxt = p.children[idx + 1];
    const em = nxt && texts(nxt).length && isRed(fillC(texts(nxt)[0])) ? textOf(nxt) : null;
    const v = V(C.chk, { "Mode": on ? "Checked" : "Unchecked", "State": err ? "Error" : "Default", "Size": "Small", "Supporting Text": tx.length > 1 ? "True" : "False" });
    const i = v.createInstance(); const label = tx[0] ? tx[0].characters : "";
    setP(i, { "⌨️ Label": label, "⌨️ Supporting Text": tx[1] ? tx[1].characters : "", "👁️ Error Message": Boolean(em) });
    if (em) { const et = i.findAll((x) => x.type === "TEXT").find((x) => x.characters !== label && !/Supporting/.test(x.name)); if (et) { await loadAll(et); et.characters = em; } nxt.remove(); }
    const lt = i.findAll((x) => x.type === "TEXT").find((x) => x.characters === label); const m = /legii nr\.\s?133 din 08\.07\.2011/.exec(label);
    if (lt && m) { await loadAll(lt); lt.setRangeTextDecoration(m.index, m.index + m[0].length, "UNDERLINE"); }
    i.name = "checkbox-label"; const keep = (f.paddingTop || f.paddingBottom) && f.layoutMode && f.layoutMode !== "NONE"; // keep the padded row (footer consent = 24 / 24)
    if (keep) { for (const k of [...f.children]) k.remove(); f.appendChild(i); f.name = "Checkbox · rând"; f.counterAxisAlignItems = "MIN"; try { i.layoutSizingHorizontal = "FILL"; } catch (e) {} } else { const w = f.width; place(f, i, w); try { i.layoutSizingHorizontal = "FILL"; } catch (e) {} }
    for (const t of i.findAll((x) => x.type === "TEXT")) { try { t.layoutSizingHorizontal = "FILL"; t.textAutoResize = "HEIGHT"; } catch (e) {} } // long consent text wraps
    push("checkbox");
  }
  // 6 · icon-only buttons by aria name („Button - Elimină …”)
  for (const b of ra(root, (n) => n.type === "FRAME" && /^Button - /.test(n.name) && n.width <= 52 && !texts(n).length)) {
    if (b.removed) continue; const a = b.name;
    const k = /Elimin|Șterge|Închide|Anuleaz/.test(a) ? "cross" : /Editeaz|Modific/.test(a) ? "edit" : /Înapoi|Pasul anterior/.test(a) ? "left" : /Copiaz/.test(a) ? "copy" : /Vezi|Previzual/.test(a) ? "eye" : null;
    if (!k) { push("icon-btn?:" + a.slice(9, 30)); continue; }
    const filled = isGrey(fillC(b)) && b.width >= 40;
    const set = filled ? C.rect : C.textRect; const sz = b.height >= 46 ? "Large" : b.height >= 38 ? "Medium" : "Small";
    const v = V(set, { "Style": filled ? "Neutral" : "Strict", "Icon": "Only", "Size": sz, "State": "Default" }); const i = v.createInstance();
    const slot = prop(i, "🔄 Leading Icon: " + (sz === "Small" ? "16" : "20")) || prop(i, "🔄 Leading Icon: 20"); if (slot) i.setProperties({ [slot]: (await ic(k)).id });
    i.name = "btn · " + a.slice(9); place(b, i); push("icon-btn");
  }
  // 7 · labelled buttons
  for (const b of ra(root, (n) => n.type === "FRAME" && /^(Button|Link|Button - .+)$/.test(n.name) && n.height >= 30 && n.height <= 56 && texts(n).length && R(n) >= 4)) {
    if (b.removed) continue; const label = textOf(b); if (!label || label.length > 50) continue;
    const fc = fillC(b), sc = strokeC(b), tc = fillC(texts(b)[0]); const round = R(b) >= 999;
    const sz = b.height >= 46 ? "Large" : b.height >= 38 ? "Medium" : "Small";
    let i;
    if (/mpass|msign|mpay/i.test(label) && b.findOne((x) => x.name === "Image")) {
      i = V(C.badge, { "Type": /msign/i.test(label) ? "MSign" : /mpay/i.test(label) ? "MPay" : "MPass", "Style": "Primary", "State": "Default" }).createInstance();
    } else {
      const kids = b.children; const lead = kids[0] && /^Icon/.test(kids[0].name); const trail = !lead && kids.length > 1 && /^Icon/.test(kids[kids.length - 1].name);
      let set, style;
      if (isBlue(fc)) { set = round ? C.circ : C.rect; style = "Primary"; }
      else if (isDark(fc)) { set = round ? C.circ : C.rect; style = "Strict"; }
      else if (isLightBlue(fc)) { set = round ? C.circ : C.rect; style = "Secondary"; }
      else if (isGrey(fc)) { set = round ? C.circ : C.rect; style = "Neutral"; }
      else if (sc) { set = round ? C.outCirc : C.outRect; style = isBlue(sc) || isBlue(tc) ? "Primary" : "Neutral"; }
      else { set = C.textRect; style = isBlue(tc) ? "Primary" : "Strict"; }
      const mode = lead ? "Leading" : trail ? "Trailing" : "None";
      const v = V(set, { "Style": style, "Icon": mode, "Size": sz, "State": "Default" }) || V(set, { "Style": style, "Icon": "None", "Size": sz, "State": "Default" }) || V(set, { "Style": style, "Size": sz });
      if (!v) { push("no-variant:" + style + "/" + label.slice(0, 16)); continue; }
      i = v.createInstance(); setP(i, { "⌨️ Label": label });
      const ik = /^Înainte|Continuă$|Trimite/.test(label) ? "right" : /^Adaugă fișier/.test(label) && style === "Strict" ? "upload" : /^Vezi/.test(label) ? "eye" : /^Înapoi/.test(label) ? "left" : null;
      if ((lead || trail) && ik) { const px = sz === "Small" ? "16" : "20"; const slot = prop(i, (lead ? "🔄 Leading Icon: " : "🔄 Trailing Icon: ") + px); if (slot) i.setProperties({ [slot]: (await ic(ik)).id }); }
    }
    i.name = "btn · " + label.slice(0, 40); const fill = b.width > 400; place(b, i); if (fill) { try { i.layoutSizingHorizontal = "FILL"; } catch (e) {} } push("btn");
  }
  // 8 · small tags (Opțional, Gratuit, Acum, #1)
  for (const f of ra(root, (n) => n.type === "FRAME" && Math.abs(R(n) - 4) < 1 && n.height >= 16 && n.height <= 26 && n.width < 120 && texts(n).length === 1 && !n.findOne((x) => x.type === "FRAME" && x.width > 20 && x.height > 20))) {
    if (f.removed) continue; const label = textOf(f); const strong = isBlue(fillC(f));
    const v = V(C.tag, { "Type": strong ? "Strong" : "Subtle", "Style": strong ? "Brand" : "Neutral", "Icon": "None", "Size": "Small" }) || V(C.tag, { "Type": "Subtle", "Style": "Neutral", "Size": "Small" });
    const i = v.createInstance(); setP(i, { "⌨️ Label": label }); i.name = "tag · " + label; place(f, i); push("tag");
  }
  // 9 · leftover spacer frames + non-auto-layout rows
  for (const f of ra(root, (n) => n.type === "FRAME" && !n.children.length && !(n.fills && n.fills.length) && !(n.strokes && n.strokes.length) && n.width > 300 && n.height <= 24)) { f.remove(); push("spacer"); }
  for (const f of ra(root, (n) => n.type === "FRAME" && (!n.layoutMode || n.layoutMode === "NONE") && n.children && n.children.length >= 2 && !/^(Body|cap ·)/.test(n.name))) if (autoRow(f)) push("auto-row");
  const left = ra(root, (n) => n.type === "FRAME" && /^(Button$|Button - |Link$|Radio Button|Text Input|Email Input|Phone Input|Dialog)/.test(n.name)).map((n) => `${n.name.slice(0, 30)} ${Math.round(n.width)}x${Math.round(n.height)} (${n.id})`);
  const counts = {}; done.forEach((d) => { counts[d] = (counts[d] || 0) + 1; });
  report[rid] = { counts, unmapped: left.slice(0, 15), more: Math.max(0, left.length - 15), h: Math.round(root.height) };
}
//TOKENIZE
const __roots = []; for (const r of ROOTS) __roots.push(await g(r));
const __tok = typeof TOKENIZE === "function" ? await TOKENIZE(__roots, { mobile: OPT.mobile }) : null;
return { swap: report, tokens: __tok };
