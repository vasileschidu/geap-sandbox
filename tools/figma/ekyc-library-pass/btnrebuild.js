// eKYC library pass (2026-10-14) · buttons whose mode-resolved icon colour ≠ label colour → fresh instance (copy props / texts / sizing / grid / connectors). resetOverrides leaves swapped icons dark; only a fresh instance gets the component's icon colour.
// Stored copy: text node „__btnrebuild-ekyc” in „Componente · eKYC BO (local)” (eKYC file SqMGpRKEppJLcvn7HMzOPR).
// Run: new AF("FROM", "COUNT", code)(…) on the current page.
const isBtn = (n) => n.type === "INSTANCE" && n.componentProperties && Object.keys(n.componentProperties).some(k => k.startsWith("🖌️ Style")) && n.mainComponent && n.mainComponent.parent && /^button/.test(n.mainComponent.parent.name);
const inI = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const VC = {}; const rv = async (node) => { const p = node.fills && node.fills[0]; if (!p || p.type !== "SOLID") return null; const b = p.boundVariables && p.boundVariables.color; if (!b) return p.color; let v = VC[b.id]; if (!v) { v = await figma.variables.getVariableByIdAsync(b.id); VC[b.id] = v; } const r = v.resolveForConsumer(node).value; return r && r.r !== undefined ? r : p.color; };
const same = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) < 0.06;
const bad = async (b) => { const l = b.findOne(k => k.type === "TEXT" && k.visible); const ic = b.findOne(k => k.type === "INSTANCE" && k.visible); const v = ic && ic.findOne(k => (k.type === "VECTOR" || k.type === "BOOLEAN_OPERATION") && k.visible && k.fills && k.fills.length && k.fills[0].type === "SOLID"); if (!l || !v) return false; const a = await rv(l), c = await rv(v); return a && c && !same(a, c); };
const conns = figma.currentPage.findAll(n => n.type === "CONNECTOR");
const res = { rebuilt: 0, nested: 0, still: 0, ids: [] };
const list = figma.currentPage.findAll(isBtn).slice(FROM, FROM + COUNT);
for (const b of list) {
  if (b.removed || /MPass/.test(b.mainComponent ? b.mainComponent.name : "")) continue;
  if (!(await bad(b))) continue;
  if (inI(b)) { res.nested++; continue; }
  const props = {}; for (const [k, v] of Object.entries(b.componentProperties)) if (v.type !== "VARIANT") props[k] = v.value;
  const txt = b.findAll(k => k.type === "TEXT").map(t => t.characters);
  const ic = b.findOne(k => k.type === "INSTANCE"); const icSz = ic ? [ic.width, ic.height] : null;
  const p = b.parent; const idx = p.children.indexOf(b); const grid = p.layoutMode === "GRID" ? [b.gridRowAnchorIndex, b.gridColumnAnchorIndex] : null;
  const st = { h: b.layoutSizingHorizontal, v: b.layoutSizingVertical, w: b.width, hh: b.height, x: b.x, y: b.y, abs: b.layoutPositioning === "ABSOLUTE", name: b.name, vis: b.visible, cons: b.constraints, grow: b.layoutGrow, align: b.layoutAlign };
  const n = b.mainComponent.createInstance(); p.insertChild(idx, n);
  try { n.setProperties(props); } catch (e) {}
  const t2 = n.findAll(k => k.type === "TEXT"); for (let i = 0; i < t2.length; i++) if (txt[i] !== undefined && t2[i].characters !== txt[i]) { await figma.loadFontAsync(t2[i].fontName); t2[i].characters = txt[i]; }
  const ic2 = n.findOne(k => k.type === "INSTANCE"); if (ic2 && icSz && Math.abs(ic2.width - icSz[0]) > .5) { try { ic2.resize(icSz[0], icSz[1]); } catch (e) {} }
  const auto = p.layoutMode && p.layoutMode !== "NONE" && p.layoutMode !== "GRID";
  if (grid) { try { n.setGridChildPosition(grid[0], grid[1]); } catch (e) {} }
  if (st.abs) { n.layoutPositioning = "ABSOLUTE"; n.x = st.x; n.y = st.y; n.constraints = st.cons; }
  else if (auto) { try { n.layoutSizingHorizontal = st.h; n.layoutSizingVertical = st.v; if (st.h === "FIXED" || st.v === "FIXED") n.resize(st.w, st.hh); n.layoutGrow = st.grow; n.layoutAlign = st.align; } catch (e) {} }
  else if (!grid) { n.x = st.x; n.y = st.y; if (st.h === "FIXED") n.resize(st.w, st.hh); }
  n.name = st.name; n.visible = st.vis;
  for (const c of conns) { if (c.connectorStart.endpointNodeId === b.id) c.connectorStart = { endpointNodeId: n.id, magnet: c.connectorStart.magnet }; if (c.connectorEnd.endpointNodeId === b.id) c.connectorEnd = { endpointNodeId: n.id, magnet: c.connectorEnd.magnet }; }
  b.remove(); res.rebuilt++; if (await bad(n)) { res.still++; if (res.ids.length < 6) res.ids.push(n.id + " " + n.name.slice(0, 24)); }
}
return res;
