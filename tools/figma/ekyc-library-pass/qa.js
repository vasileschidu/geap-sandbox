// eKYC library pass (2026-10-14) · targeted QA counters (raw controls, button overrides, orphans, local icons, active sidebar icon colour).
// Stored copy: text node „__qa-ekyc” in „Componente · eKYC BO (local)” (eKYC file SqMGpRKEppJLcvn7HMzOPR).
// Run: new AF((none), code)(…) on the current page.
const inI = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const isBtn = (n) => n.type === "INSTANCE" && n.componentProperties && Object.keys(n.componentProperties).some(k => k.startsWith("🖌️ Style"));
const ORPH = ["6347:28130", "5402:26521", "5384:49488", "1157:29905"];
const r = { rawTag: 0, rawAvatarOrNum: 0, cellText: 0, cellProgress: 0, cellAction: 0, cellOther: 0, rawCrumb: 0, rawLink: 0, rawTabList: 0, rawTopBar: 0, btnOv: 0, orphan: 0, localIcon: 0, activeBad: 0, activeCount: 0, sidebars: 0 };
const pg = figma.currentPage;
for (const f of pg.findAll(n => n.type === "FRAME" && !inI(n))) {
  if (f.name === "header-evo-desktop") r.rawTopBar++;
  if (/^Tab List/.test(f.name)) r.rawTabList++;
  if (/^Navigation/.test(f.name) && f.findOne(k => k.name === "Numbered List")) r.rawCrumb++;
  if (f.name === "Link") r.rawLink++;
  if (f.cornerRadius === 4 && f.height <= 24 && Array.isArray(f.fills) && f.fills.length && f.fills[0].type === "SOLID" && f.children.length >= 1 && f.findAll(t => t.type === "TEXT").length === 1 && !f.findOne(k => k.type === "INSTANCE")) { const c = f.fills[0].color; if (!(c.r > 0.99 && c.g > 0.99 && c.b > 0.99)) r.rawTag++; }
  if (Math.abs(f.width - f.height) < 1 && f.width <= 40 && f.cornerRadius !== figma.mixed && f.cornerRadius >= f.width / 2 - 1 && f.children.length === 1 && f.children[0].type === "TEXT") r.rawAvatarOrNum++;
  if (/^Table Cell/.test(f.name) && !/Placeholder/.test(f.name)) { if (f.findOne(n => isBtn(n))) r.cellAction++; else if (f.findOne(n => n.type === "FRAME" && n.height <= 8 && /pași|Contribuție|Icon/.test(n.name))) r.cellProgress++; else if (!f.findOne(n => n.type === "INSTANCE")) r.cellText++; else r.cellOther++; }
}
for (const i of pg.findAll(n => n.type === "INSTANCE")) {
  let mc; try { mc = await i.getMainComponentAsync(); } catch (e) { continue; } if (!mc) continue;
  if (mc.parent && ORPH.includes(mc.parent.id)) r.orphan++;
  if (/^Icon \/ eKYC/.test(mc.name)) r.localIcon++;
  if (isBtn(i) && !/MPass/.test(mc.name)) { for (const o of i.overrides) { if (o.id === i.id) continue; if (!o.overriddenFields.some(f => f === "fills" || f === "strokes")) continue; const n = await figma.getNodeByIdAsync(o.id); if (n && n.type !== "TEXT") { r.btnOv++; break; } } }
  if (i.name === "Sidebar · eKYC") { r.sidebars++; const act = i.findAll(x => x.type === "INSTANCE" && x.componentProperties && x.componentProperties["🎚️ State"] && x.componentProperties["🎚️ State"].value === "Active" && Object.keys(x.componentProperties).some(k => k.startsWith("⌨️ Primary"))); r.activeCount += act.length ? 1 : 0; for (const a of act) { const t = a.findOne(k => k.type === "TEXT"); const vs = a.findAll(k => k.type === "VECTOR" && k.visible); if (!vs.length || vs.some(v => !v.fills[0] || Math.abs(v.fills[0].color.b - t.fills[0].color.b) > 0.05 || v.strokes.length)) r.activeBad++; } }
}
return r;
