// eKYC BO QA — whole-pixel pass (user hard rule 2026-10-16: no fractional sizes / positions). Run per page (slices of blocks):
//   new AF("__OPT", code)({ page, mode: "dry" | "apply" | "revert", from, to })
// Walks every block screen top-down, never inside instances:
//   • FIXED width / height (frames, instances, shapes; texts with a fixed box) → Math.round; the other axis keeps its
//     HUG / FILL mode (resize() resets both modes → they are restored);
//   • absolute children (or children of a layout-less frame) → x / y rounded;
//   • GRID: FIXED tracks → whole widths keeping their sum (cumulative rounding); FLEX tracks that split the inner width
//     into fractions → FIXED whole tracks (cumulative rounding of the equal / weighted share).
// Texts round UP (a one-line text never wraps by a lost fraction).
// HUG boxes whose fraction comes from text metrics (a hug label 74.4 wide) are left alone — „hug labels and buttons”.
// FILL children become whole once their parent is whole (top-down). Re-run the audit after a pass.
// Snapshot (apply): page shared plugin data ekqa/wholepx-20261016-<n> = "id:w,h,x,y,sh,sv[,G=json]" records; revert restores.
const OPT = typeof __OPT !== "undefined" ? __OPT : { page: "PAGE_ID", mode: "dry", from: 0, to: 1e9 };
const page = await figma.getNodeByIdAsync(OPT.page);
await figma.setCurrentPageAsync(page);
const PFX = "wholepx-20261016-";
const fr = (v) => Math.abs(v - Math.round(v)) > 0.01;
if (OPT.mode === "revert") {
  let n = 0;
  for (const k of page.getSharedPluginDataKeys("ekqa").filter((k) => k.startsWith(PFX))) {
    for (const rec of page.getSharedPluginData("ekqa", k).split(";;").filter(Boolean)) {
      const [id, rest] = rec.split("::"); const node = await figma.getNodeByIdAsync(id); if (!node) continue; const o = JSON.parse(rest);
      if (o.G) { node.gridColumnSizes = o.G; n++; continue; }
      if (o.x !== undefined) { node.x = o.x; node.y = o.y; }
      if (o.w !== undefined) { if (node.type === "TEXT") await figma.loadFontAsync(node.fontName); node.resize(o.w, o.h); try { if (o.sh) node.layoutSizingHorizontal = o.sh; if (o.sv) node.layoutSizingVertical = o.sv; } catch (e) {} if (o.ar) node.textAutoResize = o.ar; }
      n++;
    }
    page.setSharedPluginData("ekqa", k, "");
  }
  return { reverted: n };
}
const apply = OPT.mode === "apply";
const res = { size: 0, pos: 0, grid: 0, gridFlex: 0, errors: [], sample: [] };
const snap = [];
const rec = (n, o) => snap.push(n.id + "::" + JSON.stringify(o));
const loaded = new Set(); const loadF = async (t) => { const segs = t.characters.length ? t.getStyledTextSegments(["fontName"]) : [{ fontName: t.fontName }]; for (const s of segs) { const k = JSON.stringify(s.fontName); if (!loaded.has(k)) { await figma.loadFontAsync(s.fontName); loaded.add(k); } } };
async function fixNode(n) {
  const p = n.parent; const al = p && p.layoutMode && p.layoutMode !== "NONE"; const abs = !al || n.layoutPositioning === "ABSOLUTE";
  // position
  if (abs && (fr(n.x) || fr(n.y)) && !/^Screen · /.test(n.name)) { res.pos++; if (res.sample.length < 8) res.sample.push("pos " + n.id + " " + n.x.toFixed(1)); if (apply) { rec(n, { x: n.x, y: n.y }); n.x = Math.round(n.x); n.y = Math.round(n.y); } }
  // size
  const isT = n.type === "TEXT";
  const fixW = isT ? (n.textAutoResize !== "WIDTH_AND_HEIGHT") && n.layoutSizingHorizontal !== "FILL" : (abs || n.layoutSizingHorizontal === "FIXED");
  const fixH = isT ? (n.textAutoResize === "NONE" || n.textAutoResize === "TRUNCATE") && n.layoutSizingVertical !== "FILL" : (abs || n.layoutSizingVertical === "FIXED");
  const w = fixW && fr(n.width) ? (isT ? Math.ceil(n.width - 0.01) : Math.round(n.width)) : n.width, h = fixH && fr(n.height) ? Math.round(n.height) : n.height;
  if ((w !== n.width || h !== n.height) && !(n.type === "INSTANCE" && n.width === 0)) {
    res.size++; if (res.sample.length < 8) res.sample.push("size " + n.id + " " + n.name.slice(0, 16) + " " + n.width.toFixed(2) + "×" + n.height.toFixed(2));
    if (apply) { const sh = al && !abs ? n.layoutSizingHorizontal : null, sv = al && !abs ? n.layoutSizingVertical : null, ar = isT ? n.textAutoResize : null;
      rec(n, { w: n.width, h: n.height, sh, sv, ar });
      if (isT) await loadF(n);
      n.resize(Math.max(w, 0.01), Math.max(h, 0.01));
      try { if (sh && sh !== "FIXED") n.layoutSizingHorizontal = sh; if (sv && sv !== "FIXED") n.layoutSizingVertical = sv; } catch (e) {}
      if ("layoutMode" in n && n.layoutMode && n.layoutMode !== "NONE" && !abs) { /* keep a HUG frame hugging */ }
      if (isT && ar && ar !== "NONE" && n.textAutoResize !== ar) n.textAutoResize = ar; }
  }
  // grid tracks
  if (n.type === "FRAME" && n.layoutMode === "GRID") {
    const cols = n.gridColumnSizes; const gap = n.gridColumnGap || 0;
    const inner = n.width - (n.paddingLeft || 0) - (n.paddingRight || 0) - gap * (cols.length - 1);
    let target = null;
    if (cols.every((c) => c.type === "FIXED") && cols.some((c) => fr(c.value))) target = cols.map((c) => c.value);
    else if (cols.every((c) => c.type === "FLEX")) { const sum = cols.reduce((a, c) => a + (c.value || 1), 0); const share = cols.map((c) => (inner * (c.value || 1)) / sum); if (share.some(fr) && !fr(inner)) { target = share; res.gridFlex++; } }
    if (target) {
      const total = Math.round(target.reduce((a, b) => a + b, 0)); let acc = 0, prev = 0; const whole = target.map((v, i) => { acc += v; const e = i === target.length - 1 ? total : Math.round(acc); const w2 = e - prev; prev = e; return w2; });
      res.grid++; if (res.sample.length < 8) res.sample.push("grid " + n.id + " " + target.map((v) => v.toFixed(1)).join("/"));
      if (apply) { rec(n, { G: cols }); n.gridColumnSizes = whole.map((v) => ({ type: "FIXED", value: v })); }
    }
  }
}
async function walk(n) {
  if (n.visible === false) return;
  try { await fixNode(n); } catch (e) { if (res.errors.length < 8) res.errors.push(n.id + " " + e.message); }
  if (n.type === "INSTANCE" || !("children" in n)) return;
  for (const k of [...n.children]) await walk(k);
}
const blocks = [];
for (const s of page.children.filter((s) => s.type === "SECTION")) for (const b of s.children.filter((c) => c.type === "FRAME" && /^Block · /.test(c.name))) blocks.push(b);
for (const b of blocks.slice(OPT.from || 0, OPT.to || 1e9)) for (const c of b.children) {
  const screens = /^Screens · /.test(c.name) ? c.children : /^Screen · /.test(c.name) ? [c] : [];
  for (const s of screens) for (const k of [...s.children]) await walk(k);
}
if (apply && snap.length) { const keys = page.getSharedPluginDataKeys("ekqa").filter((k) => k.startsWith(PFX)); let i = keys.length, s = "";
  for (const r of snap) { if (s.length + r.length > 90000) { page.setSharedPluginData("ekqa", PFX + i++, s); s = ""; } s += r + ";;"; }
  if (s) page.setSharedPluginData("ekqa", PFX + i, s); }
res.blocks = blocks.length; res.snap = snap.length;
return res;
