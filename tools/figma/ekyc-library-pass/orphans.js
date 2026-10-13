// eKYC library pass (2026-10-14) · orphaned local avatar / .role-switch-item / filter-chip → published library sets (swapComponent keeps props).
// Stored copy: text node „__orphans-ekyc” in „Componente · eKYC BO (local)” (eKYC file SqMGpRKEppJLcvn7HMzOPR).
// Run: new AF("ROOTS", code)(…) on the current page.
const antet = await figma.getNodeByIdAsync("10158:848");
let roleSet = null;
for (const i of antet.findAll(n => n.type === "INSTANCE")) { const mc = await i.getMainComponentAsync(); if (mc && mc.remote && mc.parent && mc.parent.name === ".role-switch-item/general") { roleSet = mc.parent; break; } }
const av = await figma.importComponentSetByKeyAsync("c622e4206c2a122385a0a1b0089b7e1c75fe7574");
const chip = await figma.importComponentSetByKeyAsync("9901c4588e6e177c05302554597d7b4324d9fdc1");
const pick = (set, name) => set.children.find(c => c.name === name);
const map = (sid, mc) => {
  if (sid === "5402:26521") return pick(av, mc.name);
  if (sid === "5384:49488") return roleSet && pick(roleSet, mc.name);
  if (sid === "1157:29905") { const st = /State=Selected/.test(mc.name) ? "On" : "Off"; const dis = /Disabled/.test(mc.name); const ic = /Icon=(Leading|Both)/.test(mc.name) ? "Leading" : "None"; return pick(chip, "🎚️ Mode=" + st + ", 🎚️ State=" + (dis ? "Disabled" : "Default") + ", 📍 Icon=" + ic); }
  return null; };
const SIDS = ["5402:26521", "5384:49488", "1157:29905"];
const res = { swapped: 0, miss: [] };
const roots = ROOTS.length ? ROOTS : [figma.currentPage];
for (const r0 of roots) { const root = typeof r0 === "string" ? await figma.getNodeByIdAsync(r0) : r0;
  const todo = [];
  for (const i of root.findAll(n => n.type === "INSTANCE")) { let mc; try { mc = await i.getMainComponentAsync(); } catch (e) { continue; } if (mc && mc.parent && SIDS.includes(mc.parent.id)) todo.push([i.id, mc.parent.id, mc.name]); }
  for (const [id, sid, nm] of todo) { const i = await figma.getNodeByIdAsync(id); if (!i) continue; const mc = { name: nm }; const v = map(sid, mc); if (!v) { res.miss.push(sid + " " + nm); continue; } try { i.swapComponent(v); res.swapped++; } catch (e) { res.miss.push("err " + e.message.slice(0, 40)); } }
}
res.miss = [...new Set(res.miss)].slice(0, 6); return res;
