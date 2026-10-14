// eKYC Dashboard › Alerte active → local „Alertă · eKYC (gap bibliotecă)” instances (2026-10-14).
// Run in use_figma (file SqMGpRKEppJLcvn7HMzOPR) on the Dashboard page with JOBS = [{ block, cards, count, bell, empty }].
// cards: [{ k: "A1" | …, st: "Default" | "Hover" | "Focus", act: "on" | "off", label?: "Vezi coada →" }]
// Replaces the captured list container of the „Alerte active” section with „Alerte · stivă” (list gap 8 + peek
// layers), updates the meta „N alerte”, „Arată toate (N)”, the bell badge, and re-points connectors that started
// inside the removed list to the first card (magnet RIGHT). Empty → „Stare goală · compactă”.
const SET = "10678:2177", PEEK = "10678:2186", EMPTY = "10678:2187";
const A = {
  A1: ["Critică", "Furnizor indisponibil: Vonage Verify — SMS OTP", "8 verificări de disponibilitate eșuate consecutiv. Pasul „Verificare telefon” este omis în TELCO_SIM_SUBSTANTIAL.", "acum 11 min", "Deschide furnizorul →"],
  A2: ["Avertisment", "Furnizor degradat: FaceTec — 3D Face Match", "Latența p95 a depășit 4,2 s față de pragul de 2,5 s în ultimele 30 de minute.", "acum 44 min", "Deschide furnizorul →"],
  A3: ["Avertisment", "Rată de respingere peste prag — MICB Web Onboarding", "22% respingeri în ultimele 7 zile (2 din 9 decizii), peste pragul de 20% configurat pentru client.", "acum 50 min", "Vezi sesiunile →"],
  A6: ["Avertisment", "Revizie manuală peste termen: KYC-47073", "Termenul de 8 ore a expirat azi la 10:42, iar sesiunea este încă în lucru. Alte 2 sesiuni așteaptă alocarea.", "acum 4 h", "Vezi coada →"],
  A7: ["Avertisment", "Certificat root CA expiră în 48 de zile: AGE Clients mTLS CA G1", "Valabil până la 30 noiembrie 2026. După expirare, clienții cu mTLS emis de G1 nu se mai pot conecta.", "acum 6 h", "Vezi certificatul →"],
  A4: ["Informativ", "Flux fără pași configurați: Confirmarea identității pensionarilor", "Cazul de utilizare PENSION_CONFIRM_SUBST are 0 pași. Nu poate fi rulat de niciun client.", "acum 3 h", "Vezi cazul →"],
  A5: ["Informativ", "Versiuni SDK ieșite din suport încă în uz", "4.0.3 (iOS), 3.8.5 (Android) și 2.2.0 (Web) au generat 41 de sesiuni în ultimele 7 zile.", "acum 5 h", "Vezi versiunile →"]
};
figma.skipInvisibleInstanceChildren = false;
const set = await figma.getNodeByIdAsync(SET), peek = await figma.getNodeByIdAsync(PEEK), empty = await figma.getNodeByIdAsync(EMPTY);
const variant = (sev, st, act) => set.children.find((c) => c.variantProperties["Severitate"] === sev && c.variantProperties["Stare"] === st && c.variantProperties["Acțiune"] === act);
const pk = (inst, name) => Object.keys(inst.componentProperties).find((k) => k.split("#")[0] === name);
const card = (c) => { const d = A[c.k]; const i = variant(d[0], c.st || "Default", c.act || "on").createInstance(); i.name = "Alertă · " + d[1].slice(0, 40);
  i.setProperties({ [pk(i, "Titlu")]: d[1], [pk(i, "Text")]: d[2], [pk(i, "Timp")]: d[3], [pk(i, "Acțiune")]: c.label || d[4] }); return i; };
const cons = figma.currentPage.findAll((n) => n.type === "CONNECTOR");
const out = [];
for (const J of JOBS) {
  const b = await figma.getNodeByIdAsync(J.block); const scr = b.children.find((c) => /^Ecran/.test(c.name));
  const head = scr.findAll((n) => n.type === "TEXT" && n.characters === "Alerte active" && !n.id.includes(";")).find((t) => { for (let q = t.parent; q && q !== scr; q = q.parent) if (q.name === "Overlay") return false; return true; });
  let sec = head; while (sec && sec.name !== "Section") sec = sec.parent;
  const kids = sec.children; const list = kids[1]; const headRow = kids[0]; const more = kids[2];
  const idx = sec.children.indexOf(list);
  let first = null, repl;
  if (J.empty) { repl = empty.createInstance(); repl.name = "Stare goală · Nicio alertă activă"; }
  else { repl = figma.createFrame(); repl.name = "Alerte · stivă"; repl.layoutMode = "VERTICAL"; repl.fills = []; repl.itemSpacing = 0; repl.clipsContent = false;
    const L = figma.createFrame(); L.name = "Listă alerte"; L.layoutMode = "VERTICAL"; L.fills = []; L.itemSpacing = 8; L.clipsContent = false; repl.appendChild(L);
    for (const c of J.cards) { const i = card(c); L.appendChild(i); i.layoutSizingHorizontal = "FILL"; if (!first) first = i; }
    L.layoutSizingHorizontal = "FILL"; L.layoutSizingVertical = "HUG";
    const layers = Math.min(2, Math.max(0, J.count - J.cards.length));
    if (layers) { const p = peek.children.find((c) => c.variantProperties["Straturi"] === String(layers)).createInstance(); p.name = "Alerte · straturi peek"; repl.appendChild(p); p.layoutSizingHorizontal = "FILL"; } }
  sec.insertChild(idx, repl); repl.layoutSizingHorizontal = "FILL"; if (repl.type === "FRAME") repl.layoutSizingVertical = "HUG";
  let moved = 0;
  for (const c of cons) { for (const end of ["connectorStart", "connectorEnd"]) { const e = c[end]; if (e.endpointNodeId && (e.endpointNodeId === list.id || list.findOne((x) => x.id === e.endpointNodeId))) { c[end] = { endpointNodeId: (first || repl).id, magnet: "RIGHT" }; moved++; } } }
  list.remove();
  // meta „N alerte” + Arată toate
  const meta = headRow.type === "FRAME" ? headRow.findAll((n) => n.type === "TEXT" && /alert/.test(n.characters) && n.characters !== "Alerte active")[0] : null;
  if (meta) { await figma.loadFontAsync(meta.fontName); meta.characters = J.count === 1 ? "1 alertă" : J.count + " alerte"; meta.parent.visible = !J.empty; }
  if (more && more.type === "FRAME") { const btn = more.findOne((n) => n.type === "INSTANCE"); if (btn) { const k = pk(btn, "⌨️ Label"); btn.setProperties({ [k]: `Arată toate (${J.count})` }); btn.name = `btn · Arată toate (${J.count})`; } more.visible = !J.empty && J.count > J.cards.length; }
  // bell
  const hdr = scr.findOne((n) => n.type === "INSTANCE" && n.name === "Antet · eKYC");
  if (hdr) { const a = hdr.findOne((n) => n.name === "Alerte" && n.type === "INSTANCE"); if (a) { const bk = pk(a, "👁️ Notification Badge"); a.setProperties({ [bk]: J.bell > 0 }); const bd = a.children.find((k) => k.name === "notification-badge"); if (bd && J.bell > 0) bd.setProperties({ [pk(bd, "⌨️ Counter Value")]: String(J.bell) }); } }
  out.push(`${J.block} ${repl.id} cards=${J.cards.length} moved=${moved} h=${Math.round(repl.height)}`);
}
return out;
