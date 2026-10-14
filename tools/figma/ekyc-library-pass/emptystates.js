// eKYC icon pass (2026-10-14) · captured empty states (.e-permits-empty → raw „Status” frame with a h2d-svg icon) →
// local „Stare goală (gap bibliotecă)” 10698:119653 instances. Content comes from the CODE, not from the capture:
// SPEC[state] = [Tip, title, text, sprite icon, [button labels]] (probe of the rendered prototype, see icon-map.json).
// Icon = Foundations 24 px glyph via the Iconiță INSTANCE_SWAP (key from icon-map.json glyphs); the action button is the
// exposed nested „Acțiune”, swapped to the captured library button's variant + its properties (label, icon slots).
// Connectors attached inside the old frame are re-pointed to a „Flow anchor” (10527:118227) placed over the new button.
// Run per page: new AF("SPEC", "ICONS", "PAGE_ID", code)(spec, icons, pageId) — ICONS = { sprite id: 24 px key }.
const page = await figma.getNodeByIdAsync(PAGE_ID); await figma.setCurrentPageAsync(page);
const EMPTY = ["bci7wb", "1ebkwij", "1ctb1ep", "4hd3y0", "1hwbl5i", "g1whow", "hslksm", "2xhrg1", "11wmoew", "1ck28qk", "j6x3f9", "1a66xu7", "195a77o", "hmiuv4", "6ftudh"];
const H = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };
const sigOf = (top) => { const vs = top.type === "VECTOR" ? [top] : top.findAll(x => x.type === "VECTOR" || x.type === "ELLIPSE" || x.type === "RECTANGLE" || x.type === "BOOLEAN_OPERATION"); return H(vs.map(v => v.type + (v.vectorPaths ? v.vectorPaths.map(d => d.data).join("|") : "") + Math.round(v.width) + "x" + Math.round(v.height)).join("#")); };
const screenOf = (n) => { for (let q = n; q && q.type !== "PAGE"; q = q.parent) if (/^Ecran · /.test(q.name)) return q; return null; };
const inInst = (n) => { for (let q = n.parent; q && q.type !== "PAGE"; q = q.parent) if (q.type === "INSTANCE") return true; return false; };
for (const s of ["Regular", "Medium", "SemiBold", "Semi Bold"]) { try { await figma.loadFontAsync({ family: "Onest", style: s }); } catch (e) {} }
const set = await figma.getNodeByIdAsync("10698:119653");
const variant = (tip) => set.children.find(v => v.name === "Tip=" + tip);
const anchorMain = await figma.getNodeByIdAsync("10527:118227");
const cache = {}; const icon = async (id) => (cache[id] = cache[id] || await figma.importComponentByKeyAsync(ICONS[id]));
const res = { page: page.name, replaced: 0, anchors: 0, missingSpec: [], screens: [] };
const targets = new Map();
for (const sv of page.findAll(x => /^h2d-svg/.test(x.name) && !x.id.includes(";"))) {
  const scr = screenOf(sv); if (!scr || inInst(sv)) continue;
  let top = sv; while (top.parent && top.parent.type === "FRAME" && top.parent.width <= 48 && top.parent.height <= 48) top = top.parent;
  if (!EMPTY.includes(sigOf(top))) continue;
  let st = top; while (st && st.name !== "Status" && st !== scr) st = st.parent;
  if (!st || st === scr) continue; // list-item face-id (ek-14a) is not an empty state
  targets.set(st.id, { st, scr });
}
const conns = page.findAllWithCriteria({ types: ["CONNECTOR"] });
for (const { st, scr } of targets.values()) {
  const state = scr.name.split(" · ")[2]; const sp = SPEC[state]; if (!sp) { res.missingSpec.push(state); continue; }
  const [tip, title, text, ic, btns] = sp;
  const h0 = scr.height;
  const capBtn = st.findAll(x => x.type === "INSTANCE" && x.mainComponent && /^button-/.test(x.mainComponent.parent ? x.mainComponent.parent.name : ""))[0];
  const capMain = capBtn && capBtn.mainComponent;
  const capProps = capBtn ? Object.fromEntries(Object.entries(capBtn.componentProperties).filter(([k, v]) => v.type !== "VARIANT").map(([k, v]) => [k, v.value])) : null;
  const inside = new Set([st.id, ...st.findAll(() => true).map(x => x.id)]);
  const attached = []; for (const cn of conns) for (const end of ["connectorStart", "connectorEnd"]) { const e = cn[end]; if (e && inside.has(e.endpointNodeId)) attached.push([cn, end, e.magnet || "RIGHT"]); }
  const inst = variant(tip).createInstance();
  const par = st.parent, idx = par.children.indexOf(st);
  par.insertChild(idx, inst);
  if (par.layoutMode && par.layoutMode !== "NONE") { inst.layoutSizingHorizontal = "FILL"; inst.layoutSizingVertical = "HUG"; } else { inst.x = st.x; inst.y = st.y; inst.resize(st.width, inst.height); }
  const K = (p) => Object.keys(inst.componentProperties).find(k => k.split("#")[0] === p);
  const props = { [K("Titlu")]: title, [K("Arată text")]: !!text, [K("Acțiune")]: btns.length > 0, [K("Iconiță")]: (await icon(ic)).id };
  if (text) props[K("Text")] = text;
  inst.setProperties(props);
  inst.name = "Stare goală · " + title;
  { const gi = inst.findOne(n => n.name === "Iconiță · cerc"); const g = gi && gi.children[0]; if (g && (Math.round(g.width) !== 24 || Math.round(g.height) !== 24)) g.resize(24, 24);
    if (g) { const tv = await figma.variables.getVariableByIdAsync("VariableID:92561cad5e44e57b4b03dc6f532d609662b02711/1296:255"); /* icon/base/tertiary = .e-permits-empty__icon colour */ for (const n of g.findAll(x => (x.type === "VECTOR" || x.type === "BOOLEAN_OPERATION") && Array.isArray(x.fills) && x.fills.length)) n.fills = n.fills.map(pt => pt.type === "SOLID" ? figma.variables.setBoundVariableForPaint(pt, "color", tv) : pt); } } // 16/time has no 24 → scaled (declared gap)
  if (btns.length) {
    const b = inst.findOne(n => n.name === "Acțiune" && n.type === "INSTANCE");
    if (capMain && b.mainComponent.id !== capMain.id) b.swapComponent(capMain);
    if (capProps) b.setProperties(capProps);
    const lk = Object.keys(b.componentProperties).find(k => k.startsWith("⌨️ Label")); if (lk) b.setProperties({ [lk]: btns[0] });
    if (attached.length) {
      const a = anchorMain.createInstance(); scr.appendChild(a); a.layoutPositioning = "ABSOLUTE"; a.name = "anchor · " + btns[0];
      const sb = scr.absoluteBoundingBox, bb = b.absoluteBoundingBox; a.resize(bb.width, bb.height); a.x = bb.x - sb.x; a.y = bb.y - sb.y;
      for (const [cn, end, magnet] of attached) cn[end] = { endpointNodeId: a.id, magnet };
      res.anchors++;
    }
  }
  st.remove(); res.replaced++;
  res.screens.push(state + " " + Math.round(h0) + "→" + Math.round(scr.height));
}
res.connectors = page.findAllWithCriteria({ types: ["CONNECTOR"] }).length;
return res;
