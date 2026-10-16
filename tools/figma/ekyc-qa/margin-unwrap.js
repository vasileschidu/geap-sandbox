// eKYC BO QA — negative CSS margins captured as „…:margin” wrappers (2026-10-16). Run per page:
//   new AF("__OPT", code)({ page, mode: "dry" | "apply" })
// html→Figma turns `margin-left: −8px` (tag after a code tag), `margin-top: −4px` (hint under a group label) and the chart axis
// `margin-top: −8px` into a flow wrapper „X:margin” whose only child is ABSOLUTE at the negative offset. Fix (geometry kept):
// the previous sibling + the child go into one auto-layout „Group” (same direction as the parent, gap = parent gap − margin,
// bound to the spacing token), the wrapper is deleted; any space the wrapper kept after the child (> 1 px) becomes the group's
// trailing padding. Snapshot: page shared plugin data ekqa/marginunwrap-20261016 = JSON [{wrapper, child, prev, parent, gap}].
const OPT = typeof __OPT !== "undefined" ? __OPT : { page: "PAGE_ID", mode: "dry" };
const page = await figma.getNodeByIdAsync(OPT.page);
await figma.setCurrentPageAsync(page);
const SP = { 2: "4e3c603781105ce160a1dc8d8ea7e97128057074", 4: "983c5b4d9a4e5fa988f0154c9bf4290c7aec9635", 6: "82d50194c1a9db8a29ad3e4b6e7eb2af1ff0cc39", 8: "69ac88e41c0fea695fc5c4fd33f0188d1172dc59", 12: "ee4801fea560b76dffab59bd8ee6e31e3b636570", 16: "22028a118574e28e30382d57efffac20e14398f0" };
const vc = {}; const V = async (k) => (vc[k] = vc[k] || (await figma.variables.importVariableByKeyAsync(SP[k])));
const inI = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const res = { found: 0, done: 0, skipped: [], errors: [], sample: [] };
const snap = [];
const list = page.findAll((n) => n.type === "FRAME" && !inI(n) && /:margin$/.test(n.name) && n.children.length === 1 && n.children[0].layoutPositioning === "ABSOLUTE" && (n.children[0].x < -0.5 || n.children[0].y < -0.5));
for (const w of list) {
  const p = w.parent; const c = w.children[0];
  if (!p || !p.layoutMode || p.layoutMode === "NONE" || p.layoutMode === "GRID") { res.skipped.push(w.id + " parent " + (p && p.layoutMode)); continue; }
  const hor = p.layoutMode === "HORIZONTAL"; const m = Math.round(hor ? -c.x : -c.y); const g = p.itemSpacing;
  const sib = p.children.filter((k) => k.visible !== false && k.layoutPositioning !== "ABSOLUTE"); const i = sib.indexOf(w); const prev = sib[i - 1];
  const gap = g - m;
  if (!prev || gap < 0 || (hor ? Math.abs(c.y) > 0.5 : Math.abs(c.x) > 0.5)) { res.skipped.push(w.id + " shape"); continue; }
  const trail = Math.round(hor ? w.width - (c.x + c.width) : w.height - (c.y + c.height));
  res.found++; if (res.sample.length < 6) res.sample.push(w.id + " " + c.name.slice(0, 20) + " gap " + gap + " trail " + trail);
  if (OPT.mode !== "apply") continue;
  try {
    if (prev.type === "FRAME" && prev.name === "Group" && prev.layoutMode === (hor ? "HORIZONTAL" : "VERTICAL") && prev.itemSpacing === gap) { prev.appendChild(c); c.layoutPositioning = "AUTO"; snap.push({ wrapper: w.id, child: c.id, prev: prev.id, parent: p.id, gap, trail, joined: true }); w.remove(); res.done++; continue; } // a run of margin items joins one group
    const prevSizing = [prev.layoutSizingHorizontal, prev.layoutSizingVertical], cSizing = [c.layoutSizingHorizontal, c.layoutSizingVertical];
    const grp = figma.createFrame(); grp.name = "Group"; grp.fills = []; p.insertChild(p.children.indexOf(prev), grp);
    grp.layoutMode = hor ? "HORIZONTAL" : "VERTICAL"; grp.counterAxisAlignItems = hor ? "CENTER" : "MIN"; grp.itemSpacing = gap; if (SP[gap]) grp.setBoundVariable("itemSpacing", await V(gap));
    if (trail > 1) { const k = hor ? "paddingRight" : "paddingBottom"; grp[k] = trail; if (SP[trail]) grp.setBoundVariable(k, await V(trail)); }
    grp.appendChild(prev); grp.appendChild(c); c.layoutPositioning = "AUTO";
    // sizing: vertical groups fill the parent's width (prev / child FILL as before); horizontal groups hug
    if (hor) { grp.layoutSizingHorizontal = "HUG"; grp.layoutSizingVertical = "HUG"; }
    else { grp.layoutSizingHorizontal = prevSizing[0] === "FILL" || cSizing[0] === "FILL" || w.layoutSizingHorizontal === "FILL" ? "FILL" : "HUG"; grp.layoutSizingVertical = "HUG"; try { if (prevSizing[0] === "FILL") prev.layoutSizingHorizontal = "FILL"; if (w.layoutSizingHorizontal === "FILL") c.layoutSizingHorizontal = "FILL"; } catch (e) {} }
    snap.push({ wrapper: w.id, child: c.id, prev: prev.id, parent: p.id, gap, trail });
    w.remove(); res.done++;
  } catch (e) { res.errors.push(w.id + " " + e.message); }
}
if (OPT.mode === "apply" && snap.length) { const old = JSON.parse(page.getSharedPluginData("ekqa", "marginunwrap-20261016") || "[]"); page.setSharedPluginData("ekqa", "marginunwrap-20261016", JSON.stringify(old.concat(snap))); }
return res;
