// De-emphasize everything on a board screen that is NOT the subject (user direction 2026-10-13,
// US-54: „skeleton do entire block, not just input — also title as well”).
// Stored in Figma as the hidden text node „__deemphasize-context (builder, do not edit)” on
// ↳ Address Pattens; run with new AF("A", text)(A).
// A = { screens: [ids], keepIds?: [ids], keepNames?: [names], mode: "skeleton" | "opacity" }
// skeleton: every non-kept block becomes „FO / Context · skeleton” (11258:17226):
//   section titles → Title bar (20 px) · text → Bar lines (12 px, gap 8, last 60 %) ·
//   fields → Field (label bar + input 40 / 48) · buttons, radios, chips, tags, icons → Box ·
//   vectors → 35 % opacity. Kept real: keepIds / keepNames subtrees, the page header,
//   the stepper (.step-*), the page title (H1 ≥ 24 px) and Flow anchors („anchor · …”, they carry
//   connectors). Re-runnable: existing skeleton instances are skipped, dimmed nodes are restored.
// opacity: every top-level region off the keep path → 35 % (test panels).
const SK = await figma.getNodeByIdAsync("11258:17226");
const VAR = (t, s = "Medium") => SK.children.find((c) => c.name === `Type=${t}, Size=${s}`);
const V8 = await figma.variables.importVariableByKeyAsync("69ac88e41c0fea695fc5c4fd33f0188d1172dc59");
const KEEP_NAMES = A.keepNames || ["Address section", "Details Container", "Frame 1261156062"];
const keep = new Set(A.keepIds || []);
const isKeep = (n) => keep.has(n.id) || KEEP_NAMES.includes(n.name);
const hasKeep = (n) => isKeep(n) || ("findOne" in n && n.findOne && Boolean(n.findOne((x) => isKeep(x))));
const mainName = (n) => (n.mainComponent && (n.mainComponent.parent && n.mainComponent.parent.type === "COMPONENT_SET" ? n.mainComponent.parent.name : n.mainComponent.name)) || n.name;
const fieldRe = /^(text-input|select-input|phone-number-input|text-area|date-input|search-input|\.city|\.strada|\.Orașul|\.\[abstract-level\])/;
const st = { title: 0, text: 0, field: 0, box: 0, kept: 0, dim: 0 };
/* natural, non-uniform widths: a stable pseudo-random 0…1 per node id */
const rnd = (id) => { let h = 7; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 9973; return (h % 1000) / 1000; };
const pw = (n) => (n.parent && n.parent.width) || n.width;
const put = (old, nu) => {
  const p = old.parent;
  p.insertChild(p.children.indexOf(old), nu);
  if (old.layoutPositioning === "ABSOLUTE" || !p.layoutMode || p.layoutMode === "NONE") { if (p.layoutMode && p.layoutMode !== "NONE") nu.layoutPositioning = "ABSOLUTE"; nu.x = old.x; nu.y = old.y; }
  if (old.layoutSizingHorizontal === "FILL") { try { nu.layoutSizingHorizontal = "FILL"; } catch (e) {} }
  nu.name = "skeleton · " + old.name.slice(0, 40);
  old.remove();
};
const inst = (t, w, h) => { const i = VAR(t).createInstance(); i.resize(Math.max(8, Math.round(w)), Math.max(8, Math.round(h))); return i; };
const textBars = (t) => {
  const lines = Math.max(1, Math.round(t.height / 22)); const r = rnd(t.id);
  const w = Math.round(Math.max(24, t.width < 200 && lines === 1 ? t.width * (0.8 + 0.2 * r) : Math.min(Math.max(t.width, pw(t)), 640) * (0.6 + 0.2 * r)));
  const f = figma.createAutoLayout("VERTICAL"); f.fills = []; f.setBoundVariable("itemSpacing", V8); f.paddingTop = f.paddingBottom = 4;
  for (let i = 0; i < lines; i++) f.appendChild(inst("Bar", i === lines - 1 && lines > 1 ? w * 0.6 : w, 12));
  return f;
};
const walk = (n) => {
  if (n.removed || n.visible === false || /^anchor · /.test(n.name)) return;
  if (isKeep(n)) { st.kept++; return; }
  if (n.opacity < 1) n.opacity = 1;
  if (n.type === "TEXT") {
    const fs = n.fontSize === figma.mixed ? 14 : n.fontSize;
    if (fs >= 24) return;                                               // page title (H1) stays
    if (fs >= 16 && (fs >= 18 || /Supporting-text|title|Heading/i.test(n.name))) { const w = Math.round(Math.min(Math.max(pw(n) * (0.35 + 0.1 * rnd(n.id)), 120), 360)); const tb = inst("Title", w, 20); put(n, tb); try { tb.layoutSizingHorizontal = "FIXED"; tb.resize(w, 20); const pp = tb.parent; if (pp.layoutMode === "HORIZONTAL") pp.primaryAxisAlignItems = "MIN"; else if (pp.layoutMode === "VERTICAL") pp.counterAxisAlignItems = "MIN"; } catch (e) {} st.title++; return; }
    put(n, textBars(n)); st.text++; return;
  }
  if (n.type === "INSTANCE") {
    const mn = mainName(n);
    if (mn === "FO / Context · skeleton") return;                       // already skeleton
    if (/^\.step-/.test(mn) || /^\.step-/.test(n.name)) { n.opacity = 1; return; } // stepper = page shell
    if (fieldRe.test(mn) || fieldRe.test(n.name)) { const nw = n.width, q = rnd(n.id); const f = VAR("Field", n.height >= 76 ? "Large" : "Medium").createInstance(); f.resize(nw, f.height); put(n, f); const lb = f.children[0]; lb.resize(Math.round(Math.max(60, nw * (0.25 + 0.1 * q))), lb.height); st.field++; return; }
    if (/radio|avatar/i.test(mn + " " + n.name) && n.width <= 40) { put(n, inst("Round", n.width, n.height)); st.box++; return; }
    put(n, inst(n.width > 4 * n.height || n.height <= 6 ? "Bar" : "Box", n.width, Math.min(n.height, 48))); st.box++; return;
  }
  if ("children" in n) {
    /* GRID cells size to their content → a skeleton would collapse: make the wrapper flex first */
    if (n.type === "FRAME" && n.layoutMode === "GRID") { const cols = n.gridColumnCount || 1; const gap = n.gridColumnGap || 32; n.layoutMode = cols > 1 ? "HORIZONTAL" : "VERTICAL"; n.itemSpacing = cols > 1 ? gap : (n.gridRowGap || 8); n.counterAxisSizingMode = "AUTO"; n.primaryAxisSizingMode = "FIXED"; }
    for (const k of [...n.children]) walk(k); return;
  }
  n.opacity = 0.35; st.dim++;
};
const dimOff = (n) => { if (n.removed || isKeep(n)) return; if (hasKeep(n) && "children" in n) { for (const k of [...n.children]) dimOff(k); return; } n.opacity = 0.35; st.dim++; };
for (const id of A.screens) {
  const s = await figma.getNodeByIdAsync(id); if (!s) continue;
  if (A.mode === "opacity") { for (const k of [...s.children]) dimOff(k); }
  else { for (const k of [...s.children]) walk(k); }
}
return st;
