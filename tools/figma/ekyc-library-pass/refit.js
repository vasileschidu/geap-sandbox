// eKYC library pass round 2 (2026-10-14) · after any width / column change: fit-tables v2 (stored __fit-ekyc) + Resizer reset + row equalise + unclip (stored __unclip-ekyc). Run on the current page: new AF(code)()
// NOTE (round 3): the stored Figma script nodes were deleted (QA o06). Paste fit-tables-v2.js and unclip.js inline instead of reading them by node id.
const AF = Object.getPrototypeOf(async function () {}).constructor;
const fit = (await figma.getNodeByIdAsync("10508:269")).characters, unclip = (await figma.getNodeByIdAsync("10513:242")).characters;
const inI = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const r = await new AF(fit)();
for (const c of figma.currentPage.findAll(x => x.type === "INSTANCE" && /^cell · /.test(x.name))) for (const z of c.children.filter(k => /Resizer/.test(k.name))) if (z.height > 0.5) { try { z.layoutSizingVertical = "FIXED"; z.resize(z.width, 0); } catch (e) {} }
let eq = 0; for (const t of figma.currentPage.findAll(n => n.type === "FRAME" && n.layoutMode === "GRID" && !inI(n) && /^Table/.test(n.name))) { const rows = {}; for (const c of t.children) if (c.layoutPositioning !== "ABSOLUTE" && (c.gridRowSpan || 1) === 1) (rows[c.gridRowAnchorIndex] = rows[c.gridRowAnchorIndex] || []).push(c);
  for (const cells of Object.values(rows)) { const H = Math.max(...cells.map(c => c.height)); if (cells.every(c => Math.abs(c.height - H) < 1)) continue; for (const c of cells) { try { c.layoutSizingVertical = "FIXED"; c.resize(c.width, H); if (c.type === "INSTANCE") { const cc = c.findOne(n => n.name === "Cell Container"); if (cc) cc.layoutSizingVertical = "FILL"; } } catch (e) {} } eq++; } }
const u = await new AF(unclip)();
return [r.cols, r.rows, eq, u ? u.split(",").length : 0];
