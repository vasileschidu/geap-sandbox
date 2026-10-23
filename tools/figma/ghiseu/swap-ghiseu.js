// Ghișeu (2026-10-16) · raw capture of the Ghișeu dialogs (small modal „Dosar nou”, request sheet, confirms) → GEAP
// library instances. Based on tools/figma/swap-fo-guest.js (same FO renderer) + desk parts. Paste as use_figma code with
// ROOTS = dialog roots (or whole capture roots) and OPT = { mobile }. Retry-safe: only raw frames outside instances.
// Then run tools/figma/tokenize.js on the same roots (text styles + spacing tokens).
const ROOTS = ["PUT:ROOT-IDS"];
const OPT = { mobile: false };
figma.skipInvisibleInstanceChildren = false;
const g = (id) => figma.getNodeByIdAsync(id);
for (const f of [["Onest", "Regular"], ["Onest", "Medium"], ["Onest", "SemiBold"], ["Onest", "Bold"]]) { try { await figma.loadFontAsync({ family: f[0], style: f[1] }); } catch (e) {} }
const KS = { text: "f035f11544e0883bc29ca99b48309238db82edf8", phone: "f2ba725de62bbecd5bd84870a1e6b7bb1eb5adfe", seg: "eae5f7ebab22bf81c20c791f38f0baecfd3f8eb2",
  radio: "513e56108ce8f11caec41350386e3662ac05d004", chk: "3cf40c11a574bcefcc4f9daf0f93322f77a627a1", rect: "2cbe2c350e7c6b3948dc449660ede8355511c384",
  textRect: "4ad2518c34b8b51d5113119316eac5934c1eb9fb", outRect: "4ca8aa0074c54a1d27230b1cd03785b5f788af96", outCirc: "d7a0779b1fb70ccfc95c66ab762d577273913015",
  circ: "fcf938f6ce9e31ae7f0f11838ee889335b4b7728", badge: "a2f454750a16ce898460c188b119ee6dcd5835e8", sel: "24351877baeb81b99cceea90d885b3455191ac62",
  tag: "a97109f9ebf668fb7616cb37e46929fc75ed9070", spin: "d38a117c520f1f18cf1e41292733a77a29b8148e", search: "a27b4efaed053f6cd4a57411a032d7391174c425", textCirc: "a97526693c2d549c3c72e7ce70b4f2bf037a411e" };
const C = {}; for (const [k, key] of Object.entries(KS)) C[k] = await figma.importComponentSetByKeyAsync(key);
const IK = { right: "d4bcc2d06aae1f996b75052e41d3755a1c1e4978", left: "f9c5634defdccc7ae2468696b4dc02438da46658", upload: "e72e41aa51a34c586d0e3e31309dc738551e1ba8",
  edit: "bef76865a142fa255aebe7a98f7a0411943e8c29", cross: "3ccb9372951f0b3c922b004d8966a680404cd11f", eye: "faa2ea508755b47b8354bf6bb7d659776a525294", copy: "89c577ec6b8f893a92741093af50a237eb383016",
  more: "8eeb6ea4a1096422cb88f9859ed243e6ec189d4d", cloud: "3bb5a1c5474e5d56ba94ac947efbeda648098ae5", refresh: "8cdf3361fae3b611bc79a0ff4be5e664909d1ea5", download: "e6dd0e9760c7ba23fc5b98fd6153954b6fbbbf3e",
  pagedl: "e3e697ed3e9c62e2f019121e9fe64c0ceff99730", chev: "ec31e2fd59c87fcf1bb6eb4ccfdde10307f56ce0", plus: "b270f954e420ff6e2abdedbaf9ce0834e7eb428d", plusL: "52d7f8d8fc6f085581c901fdf6ca49b994735246",
  trash: "c4be563fbf9791c2c506e3834143eed94b1b6d7d", page: "09d6b2a320b8eb226c9f39b76db062daf4c18845", swap: "d21b8aced86e79e7b2d09fb38dfb564542bf595c", flag: "74d5fd818c70fb62cb47c276e710570948800897",
  check: "ebea9f11db46308470d328092590727874dbec88", info: "d896f991e4a2c724279ad692e990e1b74de0ebeb", ext: "8df5d4b1610d9e9457096f9f2f5bc2ec864c5275",
  /* 2026-10-17: download / export = central „arrow-inbox, download” filled=on stroke 1.5 r2 (follows the button colour); print = central „printer, print” filled=off stroke 1.5 r2 */
  export: "e41040cad8f8622843fba350661894ea6c4823d6", print: "f519c646b673822c2c07d0b279efefb62ac08840" };
const ICC = {}; const ic = async (k) => (ICC[k] ||= await figma.importComponentByKeyAsync(IK[k]));
/* label → icon (leading unless noted) — from tools/figma/ghiseu/buttons.json (code icons per label) */
const ICON_BY_LABEL = [[/^Înainte|^Continuă$|^Caută /, "right"], [/^Înapoi/, "left"], [/^Salvează schița/, "cloud"], [/^Inițiază un postproces/, "chev"], [/^Schimbă$/, "swap"],
  [/^Detalii$|^Vezi /, "eye"], [/^Adaugă fișier/, "upload"], [/^Descarcă din MDocs|^Importă/, "upload"], [/^Descarcă/, "export"], [/^Printează/, "print"], [/^Verifică achitarea|^Reîncercați$|^Regenerează/, "refresh"], [/^Generează cererea/, "page"],
  [/^Elimină schița/, "trash"], [/^Dosar nou/, "plus"], [/^Adaugă document/, "plus"], [/^Exportă/, "export"], [/^Copiază/, "copy"], [/^Modifică datele/, "ext"], [/^Mergi la /, "right"]];
const iconFor = (label) => { for (const [re, k] of ICON_BY_LABEL) if (re.test(label)) return k; return null; };
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
const isLightBlue = (c) => c && c.b > 0.9 && c.r > 0.85 && c.r < 0.95 && c.b - c.r > 0.03;
const isDark = (c) => c && c.r < 0.2 && c.g < 0.2 && c.b < 0.2;
const isWhite = (c) => c && c.r > 0.97 && c.g > 0.97 && c.b > 0.97;
const isGrey = (c) => c && !isWhite(c) && Math.abs(c.r - c.g) < 0.03 && Math.abs(c.g - c.b) < 0.03 && c.r > 0.85;
const isPlaceholder = (t) => { const c = fillC(t); return c && c.r > 0.4 && c.r < 0.55; };
const inInst = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const inSkip = (n) => { for (let p = n; p; p = p.parent) if (/^(Navigation - Pași|Stepper · |Opțiune radio|Option · radio)/.test(p.name || "")) return true; return false; };
const R = (n) => (n.cornerRadius === figma.mixed ? n.topLeftRadius : n.cornerRadius || 0);
const cbox = (n) => { let c = n.children && n.children[0]; if (!c || c.type !== "FRAME") return null; if (/:margin$/.test(c.name) && c.children && c.children[0] && c.children[0].type === "FRAME") c = c.children[0]; return Math.round(c.width) === 20 && Math.round(c.height) === 20 && R(c) >= 3 && R(c) <= 7 && (((c.strokes || []).length) || isBlue(fillC(c))) ? c : null; };
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
const ungrid = (f) => {
  if (f.layoutMode !== "GRID") return false;
  const kids = f.children.filter((k) => k.layoutPositioning !== "ABSOLUTE" && k.visible !== false).map((k) => ({ k, x: Math.round(k.x), y: Math.round(k.y), w: k.width, h: k.height }));
  const ys = []; for (const y of kids.map((k) => k.y).sort((a, b) => a - b)) if (!ys.length || y - ys[ys.length - 1] > 8) ys.push(y);
  const rows = ys.map((y, i) => kids.filter((k) => k.y >= y && (i + 1 >= ys.length || k.y < ys[i + 1])).sort((a, b) => a.x - b.x));
  const pt = f.paddingTop, pb = f.paddingBottom, pl = f.paddingLeft, pr = f.paddingRight;
  const rowGap = rows.length > 1 ? Math.max(0, Math.round(rows[1][0].y - (rows[0][0].y + Math.max(...rows[0].map((k) => k.h))))) : 24;
  const W0 = f.width;
  f.layoutMode = "VERTICAL"; f.itemSpacing = rowGap; f.paddingTop = pt; f.paddingBottom = pb; f.paddingLeft = pl; f.paddingRight = pr; f.counterAxisAlignItems = "MIN";
  f.primaryAxisSizingMode = "AUTO"; if (f.layoutSizingHorizontal !== "FILL") { f.counterAxisSizingMode = "FIXED"; f.resize(W0, f.height); }
  for (const [ri, row] of rows.entries()) {
    if (row.length === 1 && Math.abs(row[0].w - (W0 - pl - pr)) < 2) { f.appendChild(row[0].k); try { row[0].k.layoutSizingHorizontal = "FILL"; } catch (e) {} continue; }
    const r = figma.createAutoLayout("HORIZONTAL", { name: "Row " + (ri + 1) }); r.fills = []; r.clipsContent = false; r.counterAxisAlignItems = "MIN";
    r.itemSpacing = row.length > 1 ? Math.max(0, Math.round(row[1].x - row[0].x - row[0].w)) : 32;
    f.appendChild(r); r.layoutSizingHorizontal = "FILL"; r.layoutSizingVertical = "HUG";
    const inner = W0 - pl - pr; const full = row.reduce((s, it) => s + it.w, 0) + r.itemSpacing * (row.length - 1) >= inner - 2;
    for (const it of row) { r.appendChild(it.k); try { if (full) it.k.layoutSizingHorizontal = "FILL"; else { it.k.layoutSizingHorizontal = "FIXED"; it.k.resize(it.w, it.k.height); } } catch (e) {} }
  }
  return true;
};
const autoRow = (f) => {
  if (f.layoutMode && f.layoutMode !== "NONE") return false;
  const kids = f.children.filter((k) => k.visible !== false && k.layoutPositioning !== "ABSOLUTE"); if (kids.length < 2) return false;
  const sameY = kids.every((k) => Math.abs(k.y - kids[0].y) < 4), sameX = kids.every((k) => Math.abs(k.x - kids[0].x) < 4);
  if (!sameY && !sameX) return false;
  const s = [...kids].sort((a, b) => (sameY ? a.x - b.x : a.y - b.y));
  const gap = sameY ? Math.round(s[1].x - s[0].x - s[0].width) : Math.round(s[1].y - s[0].y - s[0].height);
  const w = f.width;
  f.layoutMode = sameY ? "HORIZONTAL" : "VERTICAL"; f.itemSpacing = Math.max(0, gap); f.counterAxisAlignItems = sameY ? "CENTER" : "MIN";
  for (const k of s) f.appendChild(k);
  f.primaryAxisSizingMode = "FIXED"; f.counterAxisSizingMode = "AUTO"; f.resize(w, f.height);
  return true;
};
const labelInfo = (lf) => {
  const lab = lf.name === "Label" ? lf : lf.children && lf.children.find((k) => k.name === "Label");
  if (!lab) return null;
  const t = lab.findOne((x) => x.type === "TEXT"); if (!t) return null;
  const counter = lf.findOne((x) => x.type === "TEXT" && /^\d+\/\d+$/.test(x.characters));
  return { label: t.characters.trim(), star: Boolean(lab.findOne((x) => /obligatoriu|^\*$/.test(x.name) || (x.type === "TEXT" && x.characters.trim() === "*"))), counter };
};
const boxKind = (b) => {
  if (b.type !== "FRAME" || b.height < 36 || b.height > 56 || R(b) < 5.5 || R(b) > 12.5) return null;
  const f0 = b.fills && b.fills !== figma.mixed && b.fills.find((p) => p.visible !== false);
  if (f0 && f0.type !== "SOLID" && !b.findOne((x) => x.type === "TEXT")) return "skeleton";
  if (!b.findOne((x) => x.type === "TEXT")) return null;
  if (b.findOne((x) => /^Button - Caută /.test(x.name))) return "lookup";
  const greenCheck = b.findOne((x) => x.type === "VECTOR" && (() => { const c = fillC(x) || strokeC(x); return c && c.g > 0.45 && c.r < 0.3 && c.b < 0.5; })()); if (isGrey(fillC(b)) && greenCheck) return "readonly";
  if (isGrey(fillC(b)) && !b.findOne((x) => /Combobox|Select|^Listbox/.test(x.name)) && !(b.children.length && b.children[b.children.length - 1].name === "Icon")) return "readonly";
  if (b.findOne((x) => x.name === "Phone Input") || /^🇲🇩|\+373/.test(textOf(b))) return "phone";
  if (b.findOne((x) => /Combobox|Select|^Listbox/.test(x.name)) || (b.children.length && b.children[b.children.length - 1].name === "Icon" && !b.findOne((x) => /Input$/.test(x.name)))) return "select";
  if (isGrey(fillC(b))) return "readonly";
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
  const im = inst.findOne((n) => n.type === "INSTANCE" && /^(inline-message|Assistive text)$/i.test(n.name)); if (!im || !m) return;
  setP(im, { "🖌️ Style": m.tone === "error" ? "Error" : "Default", "⌨️ Message": m.text, "📍 Icon": m.tone !== "hint" });
  if (m.tone === "loading") { const icn = im.children.find((c) => c.type === "INSTANCE"); if (icn) { const sp = V(C.spin, { "Size": "Extra Small", "Style": "Brand" }) || V(C.spin, { "Style": "Brand" }) || C.spin.children[0]; const s = icn.width; icn.swapComponent(sp); icn.resize(s, s); } }
  try { im.layoutSizingHorizontal = "FILL"; const tx = im.findOne((n) => n.type === "TEXT"); if (tx) { tx.layoutSizingHorizontal = "FILL"; tx.textAutoResize = "HEIGHT"; } } catch (e) {}
};
const buildField = async (kind, info, b, msg, size) => {
  const vt = b.findAll((x) => x.type === "TEXT").filter((t) => !/^\+373$|🇲🇩|^\d+\/\d+$/.test(t.characters.trim()));
  const valT = vt[0]; const raw = valT ? valT.characters.trim() : "";
  const has = Boolean(valT) && !isPlaceholder(valT) && kind !== "skeleton";
  const err = isRed(strokeC(b)) || (msg && msg.tone === "error");
  const set = kind === "phone" ? C.phone : kind === "select" ? C.sel : kind === "lookup" ? C.search : C.text;
  const state = kind === "readonly" || kind === "skeleton" ? "Read Only" : has ? "Filled" : "Default";
  const want = { "🎚️ State": state, "🎚️ Size": size };
  if (kind === "phone") want["🎚️ Type"] = "International";
  if (kind !== "lookup") want["🖌️ Style"] = err ? "Destructive" : "Default";
  let v = set.children.find((c) => Object.entries(want).every(([k, val]) => c.name.includes(`${k.replace(/^\S+ /, "")}=${val}`)));
  if (!v && kind === "lookup") v = V(set, { "State": "Filled", "Size": size }) || set.children[0];
  if (!v) v = V(set, { "State": state, "Size": size }) || set.children[0];
  const i = v.createInstance();
  setP(i, { "👁️ Label": true, "👁️ Mandatory Star": info.star, "👁️ Assistive Text": Boolean(msg), "👁️ Clear Button": kind === "lookup" ? Boolean(b.findOne((x) => /^Button - Schimbă/.test(x.name))) : false, "👁️ Leading Icon": false, "👁️ Trailing Icon": false, "⌨️ Placeholder": kind === "skeleton" ? " " : raw || " " });
  const okV = b.findOne((x) => x.type === "VECTOR" && (() => { const c = fillC(x) || strokeC(x); return c && c.g > 0.45 && c.r < 0.3 && c.b < 0.5; })());
  if (okV) { setP(i, { "👁️ Trailing Icon": true }); const sl = prop(i, "🔄 Trailing Icon: " + (size === "Large" ? "24" : "20")) || prop(i, "🔄 Trailing Icon: 20"); if (sl) i.setProperties({ [sl]: (await ic("check")).id }); }
  await setText(i, "Label", info.label);
  if (msg) await message(i, msg);
  i.name = `${kind} · ${info.label}`;
  return i;
};
const btnInst = async (b, label) => {
  const fc = fillC(b), sc = strokeC(b), tc = fillC(texts(b)[0]); const round = R(b) >= 15;
  const sz = b.height >= 46 ? "Large" : b.height >= 38 ? "Medium" : "Small";
  if (/msign|mpass|mpay/i.test(label) && (b.findOne((x) => x.name === "Image") || /badge/i.test(b.name))) return V(C.badge, { "Type": /msign/i.test(label) ? "MSign" : /mpay/i.test(label) ? "MPay" : "MPass", "Style": "Primary", "State": "Default" }).createInstance();
  const kids = b.children.filter((k) => k.visible !== false); const lead = kids[0] && /^Icon/.test(kids[0].name) && kids.length > 1; const trail = !lead && kids.length > 1 && /^Icon/.test(kids[kids.length - 1].name);
  let set, style;
  if (/^Schimbă$|^Modifică datele|^Mergi la /.test(label)) { set = C.textRect; style = "Primary"; }
  else if (isRed(fc)) { set = round ? C.circ : C.rect; style = "Destructive"; }
  else if (isBlue(fc)) { set = round ? C.circ : C.rect; style = "Primary"; }
  else if (isDark(fc)) { set = round ? C.circ : C.rect; style = "Strict"; }
  else if (isLightBlue(fc)) { set = round ? C.circ : C.rect; style = "Secondary"; }
  else if (isGrey(fc)) { set = round ? C.circ : C.rect; style = "Neutral"; }
  else if (sc && !isGrey(sc)) { set = round ? C.outCirc : C.outRect; style = isBlue(sc) || isBlue(tc) ? "Primary" : "Strict"; }
  else { set = round ? C.textCirc : C.textRect; style = isBlue(tc) ? "Primary" : "Strict"; }
  const mode = lead ? "Leading" : trail ? "Trailing" : "None";
  const v = V(set, { "Style": style, "Icon": mode, "Size": sz, "State": "Default" }) || V(set, { "Style": style, "Icon": "None", "Size": sz, "State": "Default" }) || V(set, { "Style": style, "Size": sz });
  if (!v) return null;
  const i = v.createInstance(); setP(i, { "⌨️ Label": label });
  const ik = iconFor(label);
  if ((lead || trail) && ik) { const px = sz === "Small" ? "16" : "20"; const slot = prop(i, (lead ? "🔄 Leading Icon: " : "🔄 Trailing Icon: ") + px) || prop(i, (lead ? "🔄 Leading Icon: " : "🔄 Trailing Icon: ")); if (slot) i.setProperties({ [slot]: (await ic(ik)).id }); }
  else if (lead || trail) report.__iconless = (report.__iconless || []).concat(label.slice(0, 30));
  return i;
};

for (const rid of ROOTS) {
  const root = await g(rid); if (!root) { report[rid] = "missing"; continue; }
  const done = []; const push = (k) => done.push(k);
  const size = OPT.mobile ? "Large" : "Medium";
  for (const f of ra(root, (n) => n.type === "FRAME" && n.layoutMode === "GRID")) if (ungrid(f)) push("grid");
  // fields (label row + box [+ status]) — also the lookup groups (box with the search arrow)
  for (const f of ra(root, (n) => n.type === "FRAME" && n.layoutMode === "VERTICAL" && n.children.length >= 2)) {
    if (f.removed) continue;
    const info = labelInfo(f.children[0]); if (!info) continue;
    const bi = f.children.findIndex((k, idx) => idx > 0 && boxKind(k)); if (bi < 0) continue;
    const b = f.children[bi]; const kind = boxKind(b);
    const after = f.children.slice(bi + 1).filter((k) => k.visible !== false && texts(k).length);
    const msg = after.length ? msgOf(after[0]) : null;
    const w = f.width; const counter = info.counter ? { fontName: info.counter.fontName, fontSize: info.counter.fontSize, characters: info.counter.characters, fills: JSON.parse(JSON.stringify(info.counter.fills)) } : null;
    const inst = await buildField(kind, info, b, msg, b.height >= 46 ? "Large" : size);
    if (counter) {
      const wrap = figma.createAutoLayout("VERTICAL", { name: `Field · ${info.label} (counter)` }); wrap.fills = []; wrap.clipsContent = false;
      place(f, wrap, w); wrap.appendChild(inst); inst.layoutSizingHorizontal = "FILL";
      const ct = figma.createText(); await figma.loadFontAsync(counter.fontName); ct.fontName = counter.fontName; ct.fontSize = counter.fontSize; ct.characters = counter.characters; ct.fills = counter.fills; ct.name = "Counter";
      wrap.appendChild(ct); ct.layoutPositioning = "ABSOLUTE"; ct.x = wrap.width - ct.width; ct.y = 2; ct.constraints = { horizontal: "MAX", vertical: "MIN" };
      push("field+counter");
    } else { place(f, inst, w); push("field:" + kind); }
  }
  // segmented control (Tip persoană) with PF / PJ icons
  for (const f of ra(root, (n) => n.type === "FRAME" && R(n) >= 20 && n.children.filter((k) => /^(Radio Button|Radio|Segment)/.test(k.name) || (k.type === "FRAME" && R(k) >= 16 && texts(k).length === 1)).length >= 2 && /Persoană|PF|PJ/.test(textOf(n)) && n.height <= 60)) {
    if (f.removed) continue; const segs = f.children.filter((k) => texts(k).length);
    const v = V(C.seg, { "Segment Count": String(segs.length), "Breakpoint": OPT.mobile ? "Mobile" : "Desktop" }); const i = v.createInstance();
    const ctrls = i.children.filter((c) => c.type === "INSTANCE");
    for (const [k, s] of segs.entries()) { const c = ctrls[k]; if (!c) continue; const t = texts(s)[0]; setP(c, { "⌨️ Label": t.characters, "🎚️ Mode": isWhite(fillC(t)) ? "On" : "Off", "Leading Icon": true });
      const ico = c.findOne((x) => x.type === "INSTANCE"); if (ico) { const pj = /juridic|PJ/.test(t.characters); const m = await g(pj ? "11972:38938" : "6502:74649"); const w = ico.width; ico.swapComponent(m); ico.resize(16, 16); } }
    i.name = "segmented-control · Tip persoană"; place(f, i); push("segmented");
  }
  // checkbox (box 20 + text) → checkbox-label Small
  for (const f of ra(root, (n) => n.type === "FRAME" && n.children.length >= 2 && cbox(n))) {
    if (f.removed) continue; const box = cbox(f); const tx = texts(f.children[1]);
    const on = isBlue(fillC(box)); const err = isRed(strokeC(box));
    const v = V(C.chk, { "Mode": on ? "Checked" : "Unchecked", "State": err ? "Error" : "Default", "Size": "Small", "Supporting Text": tx.length > 1 ? "True" : "False" }) || V(C.chk, { "Mode": on ? "Checked" : "Unchecked", "Size": "Small" });
    const i = v.createInstance(); const label = tx[0] ? tx[0].characters : "";
    setP(i, { "⌨️ Label": label, "⌨️ Supporting Text": tx.slice(1).map((t) => t.characters).join(" "), "👁️ Error Message": false });
    i.name = "checkbox-label"; const w = f.width; place(f, i, w); try { i.layoutSizingHorizontal = "FILL"; } catch (e) {}
    for (const t of i.findAll((x) => x.type === "FRAME" && x.name === "Container")) { try { t.layoutSizingHorizontal = "FILL"; } catch (e) {} }
    for (const t of i.findAll((x) => x.type === "TEXT")) { try { t.layoutSizingHorizontal = "FILL"; t.textAutoResize = "HEIGHT"; } catch (e) {} }
    push("checkbox");
  }
  // icon-only buttons by aria name
  for (const b of ra(root, (n) => n.type === "FRAME" && /^Button - /.test(n.name) && n.width <= 56 && !texts(n).length)) {
    if (b.removed) continue; const a = b.name;
    const k = /Mai multe acțiuni/.test(a) ? "more" : /Elimin|Șterge|Închide|Anuleaz|Schimbă ID/.test(a) ? "cross" : /Editeaz|Modific|Corecteaz/.test(a) ? "edit" : /Înapoi|Pasul anterior/.test(a) ? "left" : /Copiaz/.test(a) ? "copy" : /Detalii despre/.test(a) ? "info" : /Vezi|Previzual/.test(a) ? "eye" : /Caută /.test(a) ? "right" : /Salvează schița/.test(a) ? "cloud" : null;
    if (!k) { push("icon-btn?:" + a.slice(9, 40)); continue; }
    const fc = fillC(b); const round = R(b) >= b.height / 2 - 1; const sz = b.height >= 46 ? "Large" : b.height >= 38 ? "Medium" : "Small";
    let set, style;
    if (isBlue(fc)) { set = round ? C.circ : C.rect; style = "Primary"; } else if (isGrey(fc)) { set = round ? C.circ : C.rect; style = "Neutral"; } else { set = round ? C.textCirc : C.textRect; style = "Strict"; }
    const v = V(set, { "Style": style, "Icon": "Only", "Size": sz, "State": "Default" }) || V(set, { "Style": style, "Icon": "Only", "State": "Default" }); if (!v) { push("icon-btn-novariant:" + a.slice(9, 30)); continue; }
    const i = v.createInstance();
    const slot = prop(i, "🔄 Leading Icon: " + (sz === "Small" ? "16" : "20")) || prop(i, "🔄 Leading Icon"); if (slot) i.setProperties({ [slot]: (await ic(k)).id });
    i.name = "btn · " + a.slice(9, 50); place(b, i); push("icon-btn");
  }
  // labelled buttons
  for (const b of ra(root, (n) => n.type === "FRAME" && /^(Button|Link|Button - .+)$/.test(n.name) && n.height >= 28 && n.height <= 56 && texts(n).length && R(n) >= 4)) {
    if (b.removed) continue; const label = textOf(b); if (!label || label.length > 50) continue;
    const i = await btnInst(b, label); if (!i) { push("no-variant:" + label.slice(0, 16)); continue; }
    i.name = "btn · " + label.slice(0, 40); const fill = b.layoutSizingHorizontal === "FILL" || b.width > 400 || (OPT.mobile && b.width >= 150);
    place(b, i); if (fill) { try { i.layoutSizingHorizontal = "FILL"; } catch (e) {} } push("btn");
  }
  // small status tags (Schiță, Valabil, Suspendat …)
  for (const f of ra(root, (n) => n.type === "FRAME" && Math.abs(R(n) - 4) < 1.1 && n.height >= 16 && n.height <= 26 && n.width < 160 && texts(n).length === 1 && !n.findOne((x) => x.type === "FRAME" && x.width > 20 && x.height > 20))) {
    if (f.removed) continue; const label = textOf(f); const c = fillC(f) || { r: 1, g: 1, b: 1 };
    const style = isBlue(c) ? "Brand" : (c.g > c.r + 0.05 && c.g > c.b) ? "Success" : (c.r > 0.95 && c.g > 0.85 && c.b < 0.85) ? "Accent" : (c.r > 0.95 && c.g < 0.92) ? "Danger" : (c.b > c.r + 0.03) ? "Brand" : "Neutral";
    const v = V(C.tag, { "Type": "Subtle", "Style": style, "Icon": "None", "Size": "Small" }) || V(C.tag, { "Type": "Subtle", "Style": "Neutral", "Size": "Small" });
    const i = v.createInstance(); setP(i, { "⌨️ Label": label }); i.name = "tag · " + label; place(f, i); push("tag");
  }
  for (const f of ra(root, (n) => "effects" in n && n.effects.some(insetDivider))) if (fixInsetDivider(f)) push("inset-divider");
  // spacers + non-auto-layout rows
  for (const f of ra(root, (n) => n.type === "FRAME" && !n.children.length && !(n.fills && n.fills.length) && !(n.strokes && n.strokes.length) && n.width > 300 && n.height <= 24)) { f.remove(); push("spacer"); }
  for (const f of ra(root, (n) => n.type === "FRAME" && (!n.layoutMode || n.layoutMode === "NONE") && n.children && n.children.length >= 2 && !/^(Body|cap ·|Overlay|Container$)/.test(n.name))) if (autoRow(f)) push("auto-row");
  const left = ra(root, (n) => n.type === "FRAME" && /^(Button$|Button - |Link$|Radio Button|Text Input|Email Input|Phone Input)/.test(n.name)).map((n) => `${n.name.slice(0, 30)} ${Math.round(n.width)}x${Math.round(n.height)} (${n.id})`);
  const counts = {}; done.forEach((d) => { counts[d] = (counts[d] || 0) + 1; });
  report[rid] = { counts, unmapped: left.slice(0, 12), more: Math.max(0, left.length - 12), h: Math.round(root.height) };
}
return report;
