// Dropdown surfaces → „dropdown-effect” effect style + clip content + radius token (2026-10-16).
// Reference: GEAP 2.0 9632:3226 „Field picker” (↳ BO -> Notification templates): effect style „dropdown-effect”
// (3 drop shadows: 0 0 0 1 @8 % ring, 0 4 6 −2 @5 %, 0 10 15 −3 @10 % = the code's menu box-shadow), clipsContent = true,
// radius bound to border-radius/radius-12, fill background/base/default, NO stroke (the 1 px ring is in the effect).
//
// Run as the `code` of use_figma after editing OPT. A few pages per call (GEAP: ≤ 6 small pages, big pages alone).
//   mode "dry"    read-only census per page: found / ok / toFix / skipped (overflow) / lib (library mains lacking the style)
//   mode "apply"  snapshot (page shared plugin data geapqa / OPT.SNAP: id, effectStyleId, effects, clip, radius, bound) then fix:
//                 local mains first (instances follow), source nodes of frames nested in local instances, raw frames,
//                 then instance overrides. Library instances whose main lacks the style are only REPORTED (never detached).
//   mode "revert" restore effect style / effects / clip / radius from the snapshot of the listed pages
// Style per file: the LOCAL effect style named „dropdown-effect” (GEAP fc1dad56…, eKYC 2c6b167d…). GEAP's style is not
// published, but FOD and EVO Cabinet already hold it as a remote style (copied nodes) → pass
// OPT.styleId = "S:fc1dad56be71b69894b7f3586befb682c9a2f5fc,5088:9" there (resolves with getStyleByIdAsync; importStyleByKeyAsync
// fails while it is unpublished). OPT.createStyle makes a local copy only for a file where neither works.
// Radius: the menu's current on-scale radius is bound to its Foundations token (12 = BO stack menus / reference,
// 16 = FO intent menu + profile / instance-switcher menu in code). Off-scale or mixed radii are reported, never snapped.
// Stroke: a visible border stroke is removed (OPT.dropStroke) — the effect's 1 px ring is the border; snapshot keeps it.
// Clip: turned on only when no visible descendant sticks out of the surface (submenu / tooltip) → else SKIP + report.
// Never touches OPT.skipPages (GEAP Ghișeu page 11589:327039 is being built by another job).
const OPT = { mode: "dry", pages: [], skipPages: ["11589:327039"], styleId: null, createStyle: false, dropStroke: true, SNAP: "dropfx-20261016" };

const NAME_RX = /(\bmenu\b|\bmeniu\b|dropdown|drop-down|popover|listbox|list ?box|\boptions\b|option list|select list|combobox|picker|flyout|suggestions?\b|autocomplete|contextual-menu|selection-menu)/i;
const EXCL_RX = /(menu[ -]?item|\bitems?\b|· action|button|btn|trigger|anchor|show menu|\bicon|chevron|caret|label|wrap\b|wrapper|\btabs?\b|sidebar|navigation|\bnav\b|header|\boption\b|· (profile|role|more)( /|$)|kbd|badge|separator|divider|title|tooltip|toast|modal|drawer|scrim|overlay|backdrop|\bscreen|\bblock\b|\bnote\b|stage|flow|connector|arrow|marker|search|input|cell|container|collapsed|expanded)/i;
const RADIUS_KEYS = { 4: "b97e6e89291836739ca83aa5578665f22d96eaa5", 6: "5c211831294ec4aee7827d006133784193921c22", 8: "dc82cc9d79935ad111db3189faf87c70772bed75", 12: "1f2268059644ae4bb07e70b94fc8ee2bafcf952e", 16: "5e0761c5c01bfd401113f4132cbbf4b3fb30c7d0", 24: "79848dbe4107a9babdbb8d1861d66890fc200d53" };
const REF_EFFECTS = [
  { type: "DROP_SHADOW", visible: true, radius: 0, color: { r: 0, g: 0, b: 0, a: 0.08 }, offset: { x: 0, y: 0 }, spread: 1, blendMode: "NORMAL", showShadowBehindNode: true },
  { type: "DROP_SHADOW", visible: true, radius: 6, color: { r: 0, g: 0, b: 0, a: 0.05 }, offset: { x: 0, y: 4 }, spread: -2, blendMode: "NORMAL", showShadowBehindNode: true },
  { type: "DROP_SHADOW", visible: true, radius: 15, color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 10 }, spread: -3, blendMode: "NORMAL", showShadowBehindNode: true },
];
const CORNERS = ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"];

figma.skipInvisibleInstanceChildren = true;
let style = OPT.styleId ? await figma.getStyleByIdAsync(OPT.styleId) : (await figma.getLocalEffectStylesAsync()).find((s) => s.name === "dropdown-effect");
if (!style && OPT.createStyle && OPT.mode === "apply") {
  style = figma.createEffectStyle(); style.name = "dropdown-effect";
  style.description = "Dropdown / menu / popover surface — code box-shadow 0 10 15 −3 @10 %, 0 4 6 −2 @5 %, 0 0 0 1 @8 % (ring = border). Use with clip content on. Copy of GEAP 2.0 „dropdown-effect” (not published yet).";
  style.effects = REF_EFFECTS;
}
if (!style && OPT.mode === "apply") return { error: "no local dropdown-effect style — run with createStyle: true" };
const STYLE_ID = style ? style.id : null;

const isWhite = (n) => Array.isArray(n.fills) && n.fills.some((p) => p.visible !== false && p.type === "SOLID" && (p.opacity == null || p.opacity > 0.9) && p.color.r > 0.96 && p.color.g > 0.96 && p.color.b > 0.96);
const hasFx = (n) => !!n.effectStyleId || n.effects.some((e) => e.visible !== false);
const inInstance = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const nameOf = (n) => (n.type === "COMPONENT" && n.parent && n.parent.type === "COMPONENT_SET" ? n.parent.name + " / " + n.name : n.name);
const menuName = (s) => NAME_RX.test(s) && !EXCL_RX.test(s.replace(NAME_RX, ""));
const radiusInfo = (n) => { const r = n.cornerRadius; return { r: typeof r === "number" ? r : "mixed", bound: !!(n.boundVariables && n.boundVariables.topLeftRadius) }; };
const overflow = (n) => {
  const b = n.absoluteBoundingBox; if (!b) return null;
  const kids = n.findAll ? n.findAll((k) => k.visible !== false && k.type !== "SLOT") : [];
  for (const k of kids.slice(0, 800)) {
    const kb = k.absoluteBoundingBox; if (!kb || kb.width === 0 || kb.height === 0) continue;
    if (kb.x < b.x - 1 || kb.y < b.y - 1 || kb.x + kb.width > b.x + b.width + 1 || kb.y + kb.height > b.y + b.height + 1) return `${k.name.slice(0, 24)} (${k.id})`;
  }
  return null;
};
const isCandidate = async (n) => {
  if (!menuName(nameOf(n))) return false;
  if (n.width > 1100 || n.height > 1200 || n.width < 80) return false;
  if (!("children" in n) || !n.children.some((k) => k.visible !== false)) return false;
  if (n.type === "INSTANCE") { const m = await n.getMainComponentAsync(); return !!m && (menuName(nameOf(m)) || hasFx(n)); }
  if (!isWhite(n)) return false;
  if (n.type === "FRAME" && n.parent && (n.parent.type === "SECTION" || n.parent.type === "PAGE")) return false;
  return hasFx(n) || n.layoutPositioning === "ABSOLUTE" || n.type === "COMPONENT";
};
const state = async (n) => {
  const es = n.effectStyleId ? await figma.getStyleByIdAsync(n.effectStyleId) : null; const ri = radiusInfo(n);
  const strokes = Array.isArray(n.strokes) ? n.strokes.filter((s) => s.visible !== false).length : 0;
  return { es: es ? es.name : n.effects.length ? `raw×${n.effects.length}` : "none", clip: n.clipsContent, ...ri, strokes, ok: !!STYLE_ID && n.effectStyleId === STYLE_ID && n.clipsContent === true && ri.bound && !(OPT.dropStroke && strokes) };
};
const issuesOf = (s) => `${s.es}${s.clip ? "" : " clip:off"}${s.bound ? "" : ` r:${s.r}`}${s.strokes ? ` stroke×${s.strokes}` : ""}`;
const radiusVar = {};
const bindRadius = async (n, r) => {
  if (!RADIUS_KEYS[r]) return false;
  if (!radiusVar[r]) radiusVar[r] = await figma.variables.importVariableByKeyAsync(RADIUS_KEYS[r]);
  for (const c of CORNERS) n.setBoundVariable(c, radiusVar[r]);
  return true;
};
const snapRow = (n) => [n.id, n.effectStyleId || "", JSON.parse(JSON.stringify(n.effects)), n.clipsContent, typeof n.cornerRadius === "number" ? n.cornerRadius : null, !!(n.boundVariables && n.boundVariables.topLeftRadius), JSON.parse(JSON.stringify(n.strokes || []))];
const pageOf = (n) => { let p = n; while (p && p.type !== "PAGE") p = p.parent; return p; };
const snaps = new Map(); // page id → { page, rows, ids }
const snapFor = (n) => {
  const pg = pageOf(n); if (!snaps.has(pg.id)) { const rows = JSON.parse(pg.getSharedPluginData("geapqa", OPT.SNAP) || "[]"); snaps.set(pg.id, { pg, rows, ids: new Set(rows.map((r) => r[0])) }); }
  return snaps.get(pg.id);
};
const fixOne = async (x) => {
  const S = snapFor(x); if (!S.ids.has(x.id)) { S.rows.push(snapRow(x)); S.ids.add(x.id); }
  if (x.effectStyleId !== STYLE_ID) await x.setEffectStyleIdAsync(STYLE_ID);
  if (!x.clipsContent) x.clipsContent = true;
  const ri = radiusInfo(x);
  if (!ri.bound && typeof ri.r === "number" && x.type !== "INSTANCE" && !x.id.includes(";")) await bindRadius(x, ri.r);
  // a 1 px border stroke doubles the effect's own 1 px ring (reference has no stroke) → remove it
  if (OPT.dropStroke && Array.isArray(x.strokes) && x.strokes.some((p) => p.visible !== false)) x.strokes = [];
};

const pages = OPT.pages.length ? OPT.pages : figma.root.children.map((p) => p.id);
const out = { file: figma.root.name, style: style ? [style.id, style.key] : null, mode: OPT.mode, pages: [] };
for (const pid of pages) {
  if (OPT.skipPages.includes(pid)) continue;
  const page = await figma.getNodeByIdAsync(pid); if (!page || page.type !== "PAGE") continue;
  await figma.setCurrentPageAsync(page);
  if (OPT.mode === "revert") {
    const snap = JSON.parse(page.getSharedPluginData("geapqa", OPT.SNAP) || "[]"); let k = 0;
    for (const [id, esid, fx, clip, r, bound, strokes] of snap) {
      const n = await figma.getNodeByIdAsync(id); if (!n) continue;
      if (strokes && strokes.length) n.strokes = strokes;
      if (esid) await n.setEffectStyleIdAsync(esid); else { await n.setEffectStyleIdAsync(""); n.effects = fx; }
      n.clipsContent = clip;
      if (!bound && r != null) { for (const c of CORNERS) n.setBoundVariable(c, null); n.cornerRadius = r; }
      k++;
    }
    out.pages.push({ id: pid, name: page.name, reverted: k }); continue;
  }
  const P = { id: pid, name: page.name.slice(0, 32), found: 0, ok: 0, toFix: 0, fixed: 0, skipped: 0, lib: {}, groups: {}, notes: [] };
  const all = page.findAll((n) => n.type === "FRAME" || n.type === "COMPONENT" || n.type === "INSTANCE");
  const cands = []; for (const n of all) if (await isCandidate(n)) cands.push(n);
  const ids = new Set(cands.map((n) => n.id));
  for (const n of cands) {
    let par = n.parent, nested = false; for (let i = 0; par && i < 3; par = par.parent, i++) if (ids.has(par.id)) nested = true;
    if (nested) continue; // inner list of a surface already counted
    P.found++;
    const s = await state(n);
    const main = n.type === "INSTANCE" ? await n.getMainComponentAsync() : null;
    const nest = inInstance(n);
    const kind = (n.type === "COMPONENT" ? "component" : n.type === "INSTANCE" ? (main.remote ? "lib" : "loc") : "frame") + (nest ? "·nest" : "");
    if (s.ok) { P.ok++; continue; }
    if (main && main.remote) {
      const ms = await state(main);
      if (!ms.ok) { const k = main.parent && main.parent.type === "COMPONENT_SET" ? main.parent.name : main.name; const e = P.lib[k] || (P.lib[k] = { n: 0, sample: n.id, main: issuesOf(ms) }); e.n++; P.skipped++; continue; }
    }
    // where the fix belongs: a local main, or the source node of a frame nested in a local instance
    let source = null;
    if (main && !main.remote) source = main;
    else if (nest && n.id.includes(";")) { const src = await figma.getNodeByIdAsync(n.id.split(";").pop()); if (src && !src.removed && !(src.remote)) source = src; }
    const ov = n.clipsContent ? null : overflow(n);
    const g = `${nameOf(n).slice(0, 30)} | ${kind} | ${issuesOf(s)}${ov ? " | OVERFLOW " + ov : ""}${source ? " | src " + source.id : ""}`;
    const G = P.groups[g] || (P.groups[g] = { n: 0, sample: n.id }); G.n++;
    if (ov) { P.skipped++; continue; }
    if (OPT.mode === "dry") { P.toFix++; continue; }
    if (source && !(await state(source)).ok) await fixOne(source);
    if (!(await state(n)).ok) await fixOne(n);
    const fin = await state(n);
    if (!fin.ok) P.notes.push(`${n.id} still ${issuesOf(fin)}`);
    if (fin.strokes) P.notes.push(`${n.id} keeps stroke×${fin.strokes}`);
    P.fixed++;
  }
  if (OPT.mode === "apply") for (const S of snaps.values()) S.pg.setSharedPluginData("geapqa", OPT.SNAP, JSON.stringify(S.rows));
  P.notes = P.notes.slice(0, 20);
  out.pages.push(P);
}
out.snapshot = [...snaps.values()].map((S) => [S.pg.name.slice(0, 24), S.rows.length]);
return out;
