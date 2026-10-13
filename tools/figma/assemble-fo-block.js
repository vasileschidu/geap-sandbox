// Assemble a FO step-2 block (label + desktop [+ mobile] + note) from the F3 template block and the
// address frames made by tools/figma/build-fo-address.js. Stored in Figma as the hidden text node
// „__assemble-fo-block (builder, do not edit)” on ↳ Address Pattens; run it with
//   new (Object.getPrototypeOf(async function(){}).constructor)("B", text)(B)
// B = { tpl, section, id, title, state, status, note, desk, mob?, x, y }
//   tpl   = template block (clone of FO 09 „Block · F3 · Adresa — implicit” 10815:25688)
//   desk / mob = „Adresă · câmpuri · …” frames (desktop 768 / mobile 343) — moved into the screens
const g = (id) => figma.getNodeByIdAsync(id);
const tpl = await g(B.tpl), sec = await g(B.section), desk = await g(B.desk), mob = B.mob ? await g(B.mob) : null;
const loadAll = async (t) => { for (const s of t.getStyledTextSegments(["fontName"])) await figma.loadFontAsync(s.fontName); };
const setT = async (t, s) => { await loadAll(t); t.characters = s; };
const b = tpl.clone(); sec.appendChild(b); b.x = B.x; b.y = B.y; b.name = `Block · ${B.id} · ${B.title}`;
// label
const lab = b.children[0]; lab.name = `Screen label · ${B.id}`;
await setT(lab.findOne((n) => n.name === "ID").findOne((n) => n.type === "TEXT"), B.id);
const ttl = lab.children.find((n) => n.type === "TEXT" && n.name !== "Link · prototip"); await setT(ttl, B.title); ttl.name = B.title;
const st = lab.findOne((n) => n.type === "INSTANCE" && n.name === "Status"); st.swapComponent(st.mainComponent.parent.children.find((c) => c.name === "Status=" + (B.status || "Figma aligned")));
const link = lab.findOne((n) => n.name === "Link · prototip"); await loadAll(link);
link.hyperlink = { type: "URL", value: "https://vasileschidu.github.io/geap-sandbox/e-permits-acte-permisive.html?state=" + B.state };
// screens
const ecr = b.children[1];
const [dsk, mbl] = ecr.children;
dsk.name = `Desktop · ${B.id}`;
const inInst = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const hug = (n, stop) => { for (let p = n.parent; p && p !== stop; p = p.parent) { if (p.layoutMode && p.layoutMode !== "NONE") { try { p.layoutSizingVertical = "HUG"; } catch (e) {} p.clipsContent = false; } } };
const swapIn = (screen, frame) => {
  const old = screen.findOne((n) => n.name === "Main Frame"); const parent = old.parent; const i = parent.children.indexOf(old);
  parent.insertChild(i, frame); old.remove(); frame.name = "Adresă · câmpuri"; hug(frame, b);
};
for (const t of dsk.findAll((n) => n.type === "TEXT" && n.name === "Section title" && n.characters === "Detalii solicitare" && !inInst(n))) await setT(t, "Detalii serviciu");
for (const t of dsk.findAll((n) => n.type === "TEXT" && /^Selectarea unei adrese existente/.test(n.characters) && !inInst(n))) t.remove();
swapIn(dsk, desk);
if (mob) {
  mbl.name = `Mobil · ${B.id}`;
  for (const t of mbl.findAll((n) => n.type === "TEXT" && n.characters === "Detalii solicitare" && n.fontSize >= 24 && !inInst(n))) await setT(t, "Detalii serviciu");
  swapIn(mbl, mob);
} else { mbl.remove(); }
// note
const note = b.children[2]; note.name = `Note · ${B.id}`;
const nt = note.children.filter((n) => n.type === "TEXT");
await setT(nt[0], `${B.id} · ${B.title}`); nt[0].name = `${B.id} · ${B.title}`;
await setT(nt[1], B.note);
return { block: b.id, h: Math.round(b.height), w: Math.round(b.width), desk: dsk.id, mob: mob ? mbl.id : null, note: note.id };
