// eKYC icon pass (2026-10-14) · captured raw h2d-svg icons in block screens → Foundations icon instances.
// Deterministic: path signature of the raw wrapper → code sprite id (icon-map.json „signatures”, verified per instance
// against the rendered prototype) → key by the rendered size (icon-map.json „glyphs”; missing size = nearest, scaled).
// The captured `Icon` frame (= the code's <svg> box) is replaced in place by the instance at the same size; the code's
// wrapper (marker / callout tile) stays. Icon colour = the variable the captured vector was bound to (= code colour).
// Empty-state signatures are skipped (emptystates.js). Connectors ending on a replaced node are re-pointed to its parent.
// Run on one page: new AF("MAP", "PAGE_ID", "DRY", code)(map, pageId, dry)  — MAP = { glyphs, signatures, empty: [...] }
const page = await figma.getNodeByIdAsync(PAGE_ID); await figma.setCurrentPageAsync(page);
const H = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };
const sigOf = (top) => { const vs = top.type === "VECTOR" ? [top] : top.findAll(x => x.type === "VECTOR" || x.type === "ELLIPSE" || x.type === "RECTANGLE" || x.type === "BOOLEAN_OPERATION"); return [H(vs.map(v => v.type + (v.vectorPaths ? v.vectorPaths.map(d => d.data).join("|") : "") + Math.round(v.width) + "x" + Math.round(v.height)).join("#")), vs]; };
const inScreen = (n) => { for (let q = n; q && q.type !== "PAGE"; q = q.parent) if (/^Ecran · /.test(q.name)) return true; return false; };
const inInst = (n) => { for (let q = n.parent; q && q.type !== "PAGE"; q = q.parent) if (q.type === "INSTANCE") return true; return false; };
const cache = {};
const comp = async (key) => (cache[key] = cache[key] || await figma.importComponentByKeyAsync(key));
const pick = (glyph, size) => { const g = MAP.glyphs[glyph]; if (!g) return null; if (g[size]) return [g[size], false]; const ks = Object.keys(g).map(Number).sort((a, b) => Math.abs(a - size) - Math.abs(b - size)); return [g[ks[0]], true]; };
const res = { page: page.name, swapped: 0, scaled: 0, skippedEmpty: 0, unknown: [], byGlyph: {}, repointed: 0 };
const seen = new Set(); const jobs = [];
for (const sv of page.findAll(x => /^h2d-svg/.test(x.name) && !x.id.includes(";"))) {
  if (!inScreen(sv) || inInst(sv)) continue;
  let top = sv; while (top.parent && top.parent.type === "FRAME" && top.parent.width <= 48 && top.parent.height <= 48) top = top.parent;
  if (seen.has(top.id)) continue; seen.add(top.id);
  const [sig, vs] = sigOf(top);
  // the svg box: the frame that directly holds the h2d-svg (named „Icon” by the capture), else the h2d node itself
  const box = sv.parent && sv.parent.name === "Icon" ? sv.parent : sv;
  if (MAP.empty.includes(sig) || (sig === "6ftudh" && top.width >= 48)) { res.skippedEmpty++; continue; }
  const glyph = MAP.signatures[sig];
  if (!glyph) { res.unknown.push(sig + " " + top.id); continue; }
  const fv = vs.map(v => Array.isArray(v.fills) && v.fills[0] && v.fills[0].boundVariables && v.fills[0].boundVariables.color ? v.fills[0].boundVariables.color.id : "").find(Boolean) || "";
  jobs.push({ top, box, glyph, fv });
}
// a raw wrapper can hold two signatures (id-card clip group) — dedupe by box
const byBox = new Map(); for (const j of jobs) if (!byBox.has(j.box.id)) byBox.set(j.box.id, j);
const conns = page.findAllWithCriteria({ types: ["CONNECTOR"] });
for (const j of byBox.values()) {
  const { box, glyph, fv } = j; if (box.removed) continue;
  const size = Math.round(Math.max(box.width, box.height));
  const [key, scaled] = pick(glyph, size);
  res.byGlyph[glyph + "@" + size] = (res.byGlyph[glyph + "@" + size] || 0) + 1;
  if (DRY) continue;
  const c = await comp(key); const inst = c.createInstance();
  const par = box.parent, idx = par.children.indexOf(box);
  par.insertChild(idx, inst);
  if (par.layoutMode && par.layoutMode !== "NONE") { inst.layoutPositioning = box.layoutPositioning; }
  if (!par.layoutMode || par.layoutMode === "NONE" || box.layoutPositioning === "ABSOLUTE") { inst.x = box.x; inst.y = box.y; }
  try { inst.constraints = box.constraints; } catch (e) {}
  inst.resize(box.width, box.height);
  if (par.layoutMode && par.layoutMode !== "NONE" && inst.layoutPositioning !== "ABSOLUTE") { inst.layoutSizingHorizontal = "FIXED"; inst.layoutSizingVertical = "FIXED"; }
  if (scaled) res.scaled++;
  if (fv) { const v = await figma.variables.getVariableByIdAsync(fv); if (v) for (const n of inst.findAll(x => (x.type === "VECTOR" || x.type === "BOOLEAN_OPERATION" || x.type === "ELLIPSE" || x.type === "RECTANGLE") && Array.isArray(x.fills) && x.fills.length)) n.fills = n.fills.map(p => p.type === "SOLID" ? figma.variables.setBoundVariableForPaint(p, "color", v) : p); }
  const gone = new Set([box.id, ...("findAll" in box ? box.findAll(() => true).map(x => x.id) : [])]);
  for (const cn of conns) { for (const end of ["connectorStart", "connectorEnd"]) { const e = cn[end]; if (e && gone.has(e.endpointNodeId)) { cn[end] = { endpointNodeId: par.id, magnet: e.magnet || "AUTO" }; res.repointed++; } } }
  box.remove(); res.swapped++;
}
res.connectors = page.findAllWithCriteria({ types: ["CONNECTOR"] }).length;
return res;
