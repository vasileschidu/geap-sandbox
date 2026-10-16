// eKYC BO QA — hand-built pieces → the new local components (2026-10-16). Run per page:
//   new AF("__OPT", code)({ page, mode: "dry" | "apply" })
// A  switch + label column (code A.renderToggle)          → „Switch · label (library gap)” 10775:1049
// B  „Option · …” rows: checkbox + status tag (facets)     → „Filter option · tag (library gap)” 10775:1055
// C  white pill with play 16 + „N s” on video thumbnails    → „Media badge · duration (library gap)” 10775:1059
// D  raw „Tag” label rows (label + 12/asterisk) [+ the „Paragraph” hint right after] → „Field label (library gap)” 10775:1063
// Variant / text / boolean values of the old nested switch / checkbox / tag are copied onto the exposed nested instances.
// Connectors whose start / end sits on a replaced node (or inside it) are re-pointed to the new instance.
// Snapshot (apply): page shared plugin data ekqa/pieces-20261016 = JSON [{old id, parent id, index, kind, texts}] (the old
// nodes are deleted; revert = rebuild from the Archive backup is not provided for these 4 small patterns — the snapshot lists
// what was replaced and with which values).
const OPT = typeof __OPT !== "undefined" ? __OPT : { page: "PAGE_ID", mode: "dry" };
const page = await figma.getNodeByIdAsync(OPT.page);
await figma.setCurrentPageAsync(page);
figma.skipInvisibleInstanceChildren = false;
const C = { A: "10775:1049", B: "10775:1055", C: "10775:1059", D: "10775:1063" };
const comp = {}; for (const [k, id] of Object.entries(C)) comp[k] = await figma.getNodeByIdAsync(id);
const inI = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const setName = (i) => { const m = i.mainComponent; if (!m) return ""; return m.parent && m.parent.type === "COMPONENT_SET" ? m.parent.name : m.name; };
const inBlock = (n) => { let p = n; while (p.parent && p.parent.type !== "SECTION" && p.parent.type !== "PAGE") p = p.parent; return /^Block · /.test(p.name); };
const key = (inst, name) => Object.keys(inst.componentProperties).find((k) => k.split("#")[0] === name);
const texts = (n) => (n.type === "TEXT" ? [n] : n.findAll((t) => t.type === "TEXT" && t.visible !== false));
const res = { A: 0, B: 0, C: 0, D: 0, hints: 0, conn: 0, errors: [], sample: [] };
const conns = page.findAll((n) => n.type === "CONNECTOR");
const snap = [];
const copyProps = (from, to) => { const p = {}; for (const [k, v] of Object.entries(from.componentProperties)) p[k] = v.value; for (const [k, v] of Object.entries(p)) { try { to.setProperties({ [k]: v }); } catch (e) {} } };
const put = (olds, inst, kind) => {
  const old = olds[0]; const p = old.parent; const idx = p.children.indexOf(old);
  const sh = old.layoutSizingHorizontal, grow = old.layoutGrow, abs = old.layoutPositioning === "ABSOLUTE", x = old.x, y = old.y;
  // GRID parent (2026-10-16 fix): an inserted child is auto-placed in a 1-column cell → copy span + anchor first
  const grid = p.layoutMode === "GRID" ? { r: old.gridRowAnchorIndex, c: old.gridColumnAnchorIndex, cs: old.gridColumnSpan || 1, rs: old.gridRowSpan || 1 } : null;
  const ids = new Set(); for (const o of olds) { ids.add(o.id); if ("findAll" in o) for (const d of o.findAll(() => true)) ids.add(d.id); }
  snap.push({ id: old.id, extra: olds.slice(1).map((o) => o.id), parent: p.id, idx, kind, t: olds.map((o) => texts(o).map((t) => t.characters).join("|")).join(" / ").slice(0, 120) });
  p.insertChild(idx, inst);
  if (abs) { inst.layoutPositioning = "ABSOLUTE"; inst.x = x; inst.y = y; }
  else if (p.layoutMode && p.layoutMode !== "NONE") { if (sh === "FILL" || grow === 1) inst.layoutSizingHorizontal = "FILL"; }
  else { inst.x = x; inst.y = y; }
  for (const c of conns) for (const end of ["connectorStart", "connectorEnd"]) { const e = c[end]; if (e.endpointNodeId && ids.has(e.endpointNodeId)) { const ne = { endpointNodeId: inst.id }; if (e.magnet) ne.magnet = e.magnet; else if (e.position) ne.position = e.position; c[end] = ne; res.conn++; } }
  for (const o of olds) o.remove();
  if (grid) { inst.gridColumnSpan = 1; inst.gridRowSpan = 1; inst.setGridChildPosition(grid.r, grid.c); inst.gridColumnSpan = grid.cs; inst.gridRowSpan = grid.rs; inst.layoutSizingHorizontal = "FILL"; }
};
const apply = OPT.mode === "apply";
const fontLoad = async (i) => { for (const t of i.findAll((x) => x.type === "TEXT")) await figma.loadFontAsync(t.fontName); };

// A · switch rows
for (const f of page.findAll((n) => n.type === "FRAME" && !inI(n) && n.children.some((k) => k.type === "INSTANCE" && setName(k) === "switch"))) {
  if (!inBlock(f)) continue;
  const sw = f.children.find((k) => k.type === "INSTANCE" && setName(k) === "switch");
  const tx = f.children.filter((k) => k !== sw && (k.type === "TEXT" || (k.type === "FRAME" && k.findOne((t) => t.type === "TEXT"))));
  if (tx.length !== 1 || f.children.length !== 2) { res.errors.push("A shape " + f.id); continue; }
  const ts = texts(tx[0]); const label = ts[0] ? ts[0].characters : "", desc = ts[1] ? ts[1].characters : "";
  res.A++; if (res.sample.length < 6) res.sample.push("A " + f.id + " " + label);
  if (!apply) continue;
  try { const i = comp.A.createInstance(); await fontLoad(i);
    i.setProperties({ [key(i, "Label")]: label, [key(i, "Supporting text")]: desc || " ", [key(i, "Show supporting text")]: !!desc });
    copyProps(sw, i.findOne((n) => n.name === "switch"));
    put([f], i, "A"); } catch (e) { res.errors.push("A " + f.id + " " + e.message); }
}
// B · filter options
for (const f of page.findAll((n) => n.type === "FRAME" && !inI(n) && /^Option · /.test(n.name))) {
  if (!inBlock(f)) continue;
  const cb = f.children.find((k) => k.type === "INSTANCE" && setName(k) === "checkbox"), tg = f.children.find((k) => k.type === "INSTANCE" && setName(k) === "tag-filled");
  if (!cb || !tg || f.children.length !== 2) { res.errors.push("B shape " + f.id); continue; }
  res.B++; if (!apply) continue;
  try { const i = comp.B.createInstance(); await fontLoad(i);
    copyProps(cb, i.findOne((n) => n.name === "checkbox")); const nt = i.findOne((n) => n.name === "tag"); await fontLoad(nt); copyProps(tg, nt);
    i.fills = JSON.parse(JSON.stringify(f.fills)); i.name = f.name;
    put([f], i, "B"); } catch (e) { res.errors.push("B " + f.id + " " + e.message); }
}
// C · media duration badge
for (const f of page.findAll((n) => n.type === "FRAME" && !inI(n) && typeof n.cornerRadius === "number" && n.cornerRadius >= 999 && n.children.some((k) => k.type === "INSTANCE" && /^play/.test(k.name)) && n.findOne((t) => t.type === "TEXT" && / s$/.test(t.characters)))) {
  if (!inBlock(f)) continue;
  const t = f.findOne((x) => x.type === "TEXT"); res.C++; if (!apply) continue;
  try { const i = comp.C.createInstance(); await fontLoad(i); i.setProperties({ [key(i, "Duration")]: t.characters }); put([f], i, "C"); } catch (e) { res.errors.push("C " + f.id + " " + e.message); }
}
// D · field labels („Tag” frames that are labels) + hint paragraph right after
for (const f of page.findAll((n) => n.type === "FRAME" && !inI(n) && n.name === "Tag")) {
  if (f.removed || !inBlock(f)) continue;
  const ts = texts(f); if (ts.length !== 1) { res.errors.push("D shape " + f.id); continue; }
  const star = !!f.findOne((x) => x.name === "mandatory" || /asterisk/.test(x.name));
  const sib = f.parent.children; const nx = sib[sib.indexOf(f) + 1];
  const hint = nx && nx.type === "FRAME" && nx.name === "Paragraph" && texts(nx).length === 1 ? nx : null;
  res.D++; if (hint) res.hints++; if (res.sample.length < 10) res.sample.push("D " + f.id + " " + ts[0].characters + (star ? " *" : "") + (hint ? " +hint" : ""));
  if (!apply) continue;
  try { const i = comp.D.createInstance(); await fontLoad(i);
    i.setProperties({ [key(i, "Label")]: ts[0].characters, [key(i, "Show mandatory star")]: star, [key(i, "Hint")]: hint ? texts(hint)[0].characters : " ", [key(i, "Show hint")]: !!hint });
    put(hint ? [f, hint] : [f], i, "D"); } catch (e) { res.errors.push("D " + f.id + " " + e.message); }
}
if (apply && snap.length) page.setSharedPluginData("ekqa", "pieces-20261016", JSON.stringify(snap));
return res;
