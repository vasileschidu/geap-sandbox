// eKYC BO QA — redundant paint on search wrappers (2026-10-16). Captured `Container` (h40, r8, white fill) whose only child
// is the library search-input-rectangular of the same size: the wrapper painted a second background behind the control.
// apply: fills = [], radius 0 (radius variables unbound). Snapshot: page shared plugin data ekqa/searchwrap-20261016 =
// JSON [{id, fills, r}] (fills with their variable bindings) → revert restores. Run: new AF("__OPT", code)({ page, mode }).
const OPT = typeof __OPT !== "undefined" ? __OPT : { page: "PAGE_ID", mode: "dry" };
const page = await figma.getNodeByIdAsync(OPT.page);
await figma.setCurrentPageAsync(page);
const KEY = "searchwrap-20261016";
const RK = ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"];
if (OPT.mode === "revert") { const s = JSON.parse(page.getSharedPluginData("ekqa", KEY) || "[]"); let n = 0;
  for (const r of s) { const f = await figma.getNodeByIdAsync(r.id); if (!f) continue; f.fills = r.fills; f.cornerRadius = r.r; n++; } page.setSharedPluginData("ekqa", KEY, ""); return { reverted: n }; }
const inI = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const setName = (i) => { const m = i.mainComponent; if (!m) return ""; return m.parent && m.parent.type === "COMPONENT_SET" ? m.parent.name : m.name; };
const list = page.findAll((n) => n.type === "FRAME" && !inI(n) && n.children.length === 1 && n.children[0].type === "INSTANCE" && setName(n.children[0]) === "search-input-rectangular" &&
  Array.isArray(n.fills) && n.fills.some((p) => p.visible !== false) && Math.abs(n.height - n.children[0].height) < 1 && Math.abs(n.width - n.children[0].width) < 1);
if (OPT.mode !== "apply") return { found: list.length, sample: list.slice(0, 3).map((n) => n.id) };
const snap = JSON.parse(page.getSharedPluginData("ekqa", KEY) || "[]");
for (const n of list) { snap.push({ id: n.id, fills: JSON.parse(JSON.stringify(n.fills)), r: typeof n.cornerRadius === "number" ? n.cornerRadius : 0 });
  n.fills = []; for (const k of RK) if (n.boundVariables && n.boundVariables[k]) n.setBoundVariable(k, null); n.cornerRadius = 0; }
page.setSharedPluginData("ekqa", KEY, JSON.stringify(snap));
return { fixed: list.length };
