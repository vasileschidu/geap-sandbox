// eKYC BO QA — READ-ONLY census of ABSOLUTE children inside block screens (2026-10-16): grouped by parent name → child name /
// type / size, so the allowed overlays (modals, drawers, popovers / menus, toasts, tooltips, flow anchors, the code's
// ::before / ::after decorations) can be told apart from layout that should be auto-layout. Run: new AF("__OPT", code)({ page }).
const OPT = typeof __OPT !== "undefined" ? __OPT : { page: "PAGE_ID" };
const page = await figma.getNodeByIdAsync(OPT.page);
await figma.setCurrentPageAsync(page);
const inI = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const H = {};
const screens = [];
for (const s of page.children.filter((s) => s.type === "SECTION")) for (const b of s.children.filter((c) => c.type === "FRAME" && /^Block · /.test(c.name)))
  for (const c of b.children) { if (/^Screens · /.test(c.name)) screens.push(...c.children); else if (/^Screen · /.test(c.name)) screens.push(c); }
for (const sc of screens) for (const n of sc.findAll((x) => x.layoutPositioning === "ABSOLUTE" && x.visible !== false && !inI(x))) {
  const k = n.type[0] + ":" + n.name.replace(/\d+/g, "#").slice(0, 26) + " " + (n.width <= 2 || n.height <= 2 ? "line" : n.width <= 24 && n.height <= 24 ? "small" : "box") + " ⊂ " + n.parent.name.replace(/\d+/g, "#").slice(0, 22);
  const e = (H[k] = H[k] || { n: 0, id: n.id }); e.n++;
}
return { page: page.name, total: Object.values(H).reduce((a, e) => a + e.n, 0), groups: Object.entries(H).sort((a, b) => b[1].n - a[1].n).slice(0, 40).map(([k, e]) => e.n + " " + k + " ← " + e.id) };
