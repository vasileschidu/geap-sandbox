// eKYC BO QA — captured SVG graphics → auto-layout (2026-10-16). Run per page as use_figma code:
//   new AF("__OPT", code)({ page, mode: "dry" | "apply" | "revert", from, to })
// Meters (`.e-permits-meter` svg: track rect + fill rects + 2px cut lines, 6 / 12 high) and column charts
// (`.e-permits-chart__plot`, 160 high, rx-4 head rect + square lower segments per bucket) were captured as absolute
// VECTOR children of a layout-less frame. They become:
//   Meter  → the same frame, HORIZONTAL auto-layout, whole-pixel FIXED segments (FILL height). One segment: frame fill =
//            the track token (background/base/default-active, as the code), segment fill = its tone. Stacked: no frame fill,
//            gap 2 (spacing-2 = the code's 2px card-colour cut lines), segment widths from the cut positions minus 1px each side.
//   Chart  → the same frame, HORIZONTAL auto-layout, align bottom; one `Bucket` per interval (cumulative-rounded widths,
//            VERTICAL, align bottom + centre) holding a `Bar` (VERTICAL) of segments, head segment top radius 4 (radius-4).
//            n = round(0.56 · W / barWidth) (code: bar = 56 % of the bucket); bar width keeps the bucket's parity so it
//            centres on whole pixels.
// Data widths cannot be instance overrides (nested FIXED sizes snap back on instances — tested), so these are not
// components: they are auto-layout graphics with token colours.
// Backup (apply): every original is cloned into frame „QA backup · ekyc-qa · 2026-10-16” on „🗄 Archive — old versions”
// (10392:2) with shared plugin data ekqa/orig = "<id>|<parentId>|<index>". revert: replaces the converted node by its backup.
const OPT = typeof __OPT !== "undefined" ? __OPT : { page: "PAGE_ID", mode: "dry", from: 0, to: 1e9 };
const AR = "10392:2", BK = "QA backup · ekyc-qa · 2026-10-16";
const page = await figma.getNodeByIdAsync(OPT.page);
await figma.setCurrentPageAsync(page);
const inI = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const res = { meters: 0, charts: 0, skipped: [], done: [], errors: [] };

// variables (captured hex-matched names → the code's token names)
const KEY = { "background/base/default-active": "1f03b84bd3f9df8d4d7c78b2cca39f4c1d598562", "icon/positive/default": "df73407830c1b40dfa7e2a708a1b0b5db9ba2032",
  sp2: "4e3c603781105ce160a1dc8d8ea7e97128057074", r4: "b97e6e89291836739ca83aa5578665f22d96eaa5" };
const REMAP = { "background/disabled/secondary": "background/base/default-active", "background/positive/default": "icon/positive/default", "text/positive/default": "icon/positive/default" };
const vc = {}; const V = async (k) => (vc[k] = vc[k] || (await figma.variables.importVariableByKeyAsync(k)));
const vname = async (p) => { const id = p && p.boundVariables && p.boundVariables.color && p.boundVariables.color.id; if (!id) return null; const v = await figma.variables.getVariableByIdAsync(id); return v ? v.name : null; };
async function paintOf(vec) {
  const p = vec.fills && vec.fills[0]; if (!p) return [];
  const nm = await vname(p); const to = nm && REMAP[nm];
  const base = { type: "SOLID", color: p.color, opacity: p.opacity === undefined ? 1 : p.opacity };
  if (to) { const v = await V(KEY[to]); const val = v.resolveForConsumer(vec).value; return [figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: val.r, g: val.g, b: val.b } }, "color", v)]; }
  return [JSON.parse(JSON.stringify(p))];
}

const isMeter = (n) => n.type === "FRAME" && (!n.layoutMode || n.layoutMode === "NONE") && n.height <= 16 && n.children.length >= 2 &&
  n.children.every((k) => k.type === "VECTOR" && Math.abs(k.height - n.height) < 0.6) && Math.abs(n.children[0].width - n.width) < 1 && Math.abs(n.children[0].x) < 0.5;
const isChart = (n) => n.type === "FRAME" && (!n.layoutMode || n.layoutMode === "NONE") && n.height >= 100 && n.children.length >= 1 &&
  n.children.every((k) => k.type === "VECTOR") && /^Image - Sessions per interval/.test(n.name);

async function backupOf(n) {
  const ar = await figma.getNodeByIdAsync(AR); await ar.loadAsync();
  let bk = ar.children.find((c) => c.name === BK);
  if (!bk) { bk = figma.createFrame(); bk.name = BK; ar.appendChild(bk); bk.layoutMode = "VERTICAL"; bk.itemSpacing = 16; bk.primaryAxisSizingMode = "AUTO"; bk.counterAxisSizingMode = "AUTO"; bk.fills = []; bk.x = -40000; bk.y = 0; bk.visible = false; }
  const c = n.clone(); bk.appendChild(c);
  c.setSharedPluginData("ekqa", "orig", n.id + "|" + n.parent.id + "|" + n.parent.children.indexOf(n));
}

async function meter(n) {
  const W = Math.round(n.width), H = Math.round(n.height);
  const track = n.children[0];
  const segs = n.children.slice(1).filter((k) => k.width > 0.5).sort((a, b) => a.x - b.x);
  const trackPaint = await paintOf(track);
  const paints = []; for (const s of segs) paints.push(await paintOf(s));
  const multi = segs.length > 1;
  // cut positions → whole-pixel widths (stacked: 1px off each inner side = the 2px cut line)
  const edges = segs.map((s) => [s.x, s.x + s.width]);
  const widths = edges.map(([a, b], i) => { const L = Math.round(a) + (multi && i > 0 ? 1 : 0), R = Math.round(b) - (multi && i < segs.length - 1 ? 1 : 0); return Math.max(1, R - L); });
  for (const k of [...n.children]) k.remove();
  n.layoutMode = "HORIZONTAL"; n.primaryAxisSizingMode = "FIXED"; n.counterAxisSizingMode = "FIXED";
  n.resize(W, H); n.paddingLeft = n.paddingRight = n.paddingTop = n.paddingBottom = 0;
  n.itemSpacing = multi ? 2 : 0; if (multi) n.setBoundVariable("itemSpacing", await V(KEY.sp2));
  n.fills = multi ? [] : trackPaint; n.clipsContent = true; n.name = "Meter";
  segs.forEach((s, i) => { const f = figma.createFrame(); f.name = "Segment"; n.appendChild(f); f.resize(widths[i], H); f.layoutSizingHorizontal = "FIXED"; f.layoutSizingVertical = "FILL"; f.fills = paints[i]; });
  res.meters++;
}

async function chart(n) {
  const W = Math.round(n.width), H = Math.round(n.height);
  const vecs = n.children.filter((k) => k.width > 0.5);
  const barW = Math.min(...vecs.map((v) => v.width));
  const N = Math.max(1, Math.round((0.56 * W) / barW));
  const pitch = W / N;
  const groups = {};
  for (const v of vecs) { const i = Math.min(N - 1, Math.max(0, Math.floor((v.x + v.width / 2) / pitch))); (groups[i] = groups[i] || []).push(v); }
  const data = {}; const bottom = H - (n.strokes.length ? n.strokeBottomWeight || 0 : 0); // plot border-bottom 1px (inside) — bars end above it
  for (const [i, g] of Object.entries(groups)) {
    const head = g.reduce((a, b) => (b.height > a.height ? b : a));
    const rest = g.filter((v) => v !== head).sort((a, b) => a.y - b.y);
    const bounds = [head.y, ...rest.map((r) => r.y), bottom];
    const rb = bounds.map((b) => Math.round(Math.min(bottom, Math.max(0, b))));
    const segs = []; const all = [head, ...rest];
    for (let k = 0; k < all.length; k++) segs.push({ h: Math.max(1, rb[k + 1] - rb[k]), paint: await paintOf(all[k]), head: k === 0 });
    data[i] = segs;
  }
  const strokes = JSON.parse(JSON.stringify(n.strokes));
  for (const k of [...n.children]) k.remove();
  n.layoutMode = "HORIZONTAL"; n.primaryAxisSizingMode = "FIXED"; n.counterAxisSizingMode = "FIXED"; n.resize(W, H);
  n.itemSpacing = 0; n.paddingLeft = n.paddingRight = n.paddingTop = n.paddingBottom = 0; n.counterAxisAlignItems = "MAX"; n.clipsContent = true; n.name = "Chart · sessions per interval";
  n.strokes = strokes; n.strokesIncludedInLayout = true;
  const target = (0.56 * W) / N;
  for (let i = 0; i < N; i++) {
    const bw = Math.floor(((i + 1) * W) / N) - Math.floor((i * W) / N);
    const b = figma.createFrame(); b.name = "Bucket"; n.appendChild(b); b.fills = [];
    b.layoutMode = "VERTICAL"; b.primaryAxisAlignItems = "MAX"; b.counterAxisAlignItems = "CENTER"; b.itemSpacing = 0;
    b.resize(bw, H); b.layoutSizingHorizontal = "FIXED"; b.layoutSizingVertical = "FILL";
    const segs = data[i]; if (!segs) continue;
    let bar = Math.round(target); if ((bw - bar) % 2) bar += (target > bar ? 1 : -1);
    const col = figma.createFrame(); col.name = "Bar"; b.appendChild(col); col.fills = []; col.layoutMode = "VERTICAL"; col.itemSpacing = 0;
    col.primaryAxisSizingMode = "AUTO"; col.counterAxisSizingMode = "FIXED"; col.resize(bar, 1); col.layoutSizingVertical = "HUG"; col.clipsContent = true;
    for (const s of segs) {
      const f = figma.createFrame(); f.name = s.head ? "Segment · top" : "Segment"; col.appendChild(f); f.resize(bar, s.h); f.layoutSizingHorizontal = "FILL"; f.layoutSizingVertical = "FIXED"; f.fills = s.paint;
      if (s.head) { const r4 = await V(KEY.r4); f.topLeftRadius = 4; f.topRightRadius = 4; f.setBoundVariable("topLeftRadius", r4); f.setBoundVariable("topRightRadius", r4); }
    }
  }
  res.charts++;
}

if (OPT.mode === "revert") {
  const ar = await figma.getNodeByIdAsync(AR); await ar.loadAsync(); const bk = ar.children.find((c) => c.name === BK);
  if (!bk) return "no backup";
  let n = 0;
  for (const c of [...bk.children]) {
    const [id, pid, idx] = c.getSharedPluginData("ekqa", "orig").split("|");
    const cur = await figma.getNodeByIdAsync(id); const par = await figma.getNodeByIdAsync(pid);
    if (!cur || !par || cur.parent.type === "PAGE") continue; const pg = (() => { let p = par; while (p && p.type !== "PAGE") p = p.parent; return p; })();
    if (pg.id !== page.id) continue;
    const i = par.children.indexOf(cur); par.insertChild(i, c); c.visible = true; cur.remove(); n++;
  }
  return { reverted: n };
}

const roots = [];
for (const s of page.children.filter((s) => s.type === "SECTION")) for (const b of s.children.filter((c) => c.type === "FRAME" && /^Block · /.test(c.name))) roots.push(b);
const list = [];
for (const b of roots.slice(OPT.from || 0, OPT.to || 1e9)) for (const n of b.findAll((x) => x.type === "FRAME" && !inI(x) && (isMeter(x) || isChart(x)))) list.push(n);
if (OPT.mode !== "apply") return { blocks: roots.length, meters: list.filter(isMeter).length, charts: list.filter(isChart).length, sample: list.slice(0, 4).map((n) => n.id + " " + n.name.slice(0, 30)) };
for (const n of list) {
  try { const m = isMeter(n); await backupOf(n); if (m) await meter(n); else await chart(n); if (res.done.length < 6) res.done.push(n.id); }
  catch (e) { res.errors.push(n.id + " " + e.message); if (res.errors.length > 8) break; }
}
return res;
