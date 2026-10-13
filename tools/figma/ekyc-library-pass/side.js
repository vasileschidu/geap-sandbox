// eKYC library pass (2026-10-14) · Sidebar · eKYC items → library sidebar-list-item (lk-03f6 66c046a8), no overrides, Foundations fill icons, active state kept (ek-02e → Dashboard).
// Stored copy: text node „__side-ekyc” in „Componente · eKYC BO (local)” (eKYC file SqMGpRKEppJLcvn7HMzOPR).
// Run: new AF("PID", "FROM", "COUNT", code)(…) on the current page.
const K = { "Dashboard": "00471b4faabb4c1d791c5a39d869f141451c82ff", "Sesiuni active": "deb2a7ef902d794512ca427183a5b4d89e9618ec", "Sesiuni istorice": "9ab6104c6f2a8b379928144a885a86c3f6ef41aa", "Rapoarte": "09d6b2a320b8eb226c9f39b76db062daf4c18845", "Organizații": "005c4c4c69dda9913a5160e190e24173c0b852a2", "Clienți": "0e94d9c836777dcf92b6f63b9cb60df4d1610e2c", "Cazuri de utilizare": "44a5aaa56749f7d01597f1c47080d9ec10c9817f", "Furnizori de verificare": "56a6470f06c73f19b34a5124033455c9d680821f", "Configurări scoring": "56740247169b62107fa91c7629f2f00f6e14ac21", "Parametri platformă": "ee36462d693e2b0bc822c45dfcf46ee091d0b844", "Versiuni SDK": "174b3b722c360d29a78bd6d31bc37c298f585a6d", "Certificate root CA": "6f6bfacd6207cd49b3a5438002837d257ffa43e1", "Utilizatori": "4559c5554720e8594551a8bef25d9982aa3f9f76", "Sesiunile mele de revizie": "a6c00702d212b64d0813007911de4a2bf25324db", "Coada de revizie": "b2f947c57cb4579d7901f889bd97d88ca951de29", "Jurnal de acces": "fbeb6d2d8c3e69de17f8bd7272cfaee829cf2ed2" };
const C = {}; for (const [l, k] of Object.entries(K)) C[l] = (await figma.importComponentByKeyAsync(k)).id;
const lib = await figma.importComponentSetByKeyAsync("66c046a8f2e5b5c0b5e87d25aace43b176ad018f");
const isItem = (x) => x.type === "INSTANCE" && x.componentProperties && x.componentProperties["🎚️ State"] && Object.keys(x.componentProperties).some(k => k.startsWith("⌨️ Primary Label"));
const lab = (i) => i.componentProperties[Object.keys(i.componentProperties).find(k => k.startsWith("⌨️ Primary"))].value;
const ik = (i) => Object.keys(i.componentProperties).find(k => k.startsWith("🔄 Icon"));
const pg = await figma.getNodeByIdAsync(PID); await figma.setCurrentPageAsync(pg);
let sbs = 0, items = 0, bad = 0; const none = [];
const all = pg.findAll(n => n.type === "INSTANCE" && n.name === "Sidebar · eKYC").slice(FROM, FROM + COUNT);
for (const sb of all) {
  sbs++; let scr = sb; while (scr && !/^Ecran · /.test(scr.name)) scr = scr.parent;
  const forceDash = scr && /ek-02e$/.test(scr.name);
  const recs = []; for (const it of sb.findAll(isItem)) { const mc = await it.getMainComponentAsync(); recs.push({ id: it.id, rem: mc.remote, st: (forceDash && lab(it) === "Dashboard") ? "Active" : it.componentProperties["🎚️ State"].value, vis: it.visible, l: lab(it) }); }
  if (!recs.some(r => r.st === "Active")) none.push(scr && scr.name);
  for (const r of recs) { const it = await figma.getNodeByIdAsync(r.id); if (!it) continue; if (!r.rem) it.swapComponent(lib.children.find(c => c.name === "🎚️ State=" + r.st)); it.resetOverrides(); const p = { "🎚️ State": r.st }; if (C[r.l]) p[ik(it)] = C[r.l]; it.setProperties(p); if (!r.vis) it.visible = false; items++;
    if (r.st === "Active") { const v = it.findOne(k => k.type === "VECTOR"); const t = it.findOne(k => k.type === "TEXT"); if (!v || !v.fills[0] || Math.abs(v.fills[0].color.b - t.fills[0].color.b) > 0.05) bad++; } }
}
return { sbs, items, bad, none };
