// RAP board — block assembly + column layout (stored as "rap"/"blocks"; body of an async function receiving L).
// block(colKey, B, desktop, mobile): label (Board / Block label) → Screens · desktop + mobile (gap 80) → Note.
// layout(colKey, order): stage header at 80/80, blocks from y 440, 240 apart, section fitted (80 padding).
const SANDBOX = "https://vasileschidu.github.io/geap-sandbox/rap-evo/index.html";
const block = async (colKey, B, desktop, mobile) => {
  const col = await L.getL(colKey);
  const old = col.children.find(c => c.name === "Block · " + B.id); if (old) old.remove();
  const b = await L.AL("Block · " + B.id, "VERTICAL", { gap: 16 }); col.appendChild(b);
  const lset = await L.getL("label");
  const lb = lset.children.find(c => c.name === "Status=" + (B.status || "Figma aligned")).createInstance(); lb.name = "Screen label · " + B.id;
  L.setP(lb, { ID: B.id, Title: B.title }); b.appendChild(lb);
  const sc = await L.AL("Screens · desktop + mobile", "HORIZONTAL", { gap: 80 }); sc.counterAxisAlignItems = "MIN"; b.appendChild(sc);
  if (desktop) sc.appendChild(desktop); if (mobile) sc.appendChild(mobile);
  const nm = await L.getL("note"); const n = nm.createInstance(); n.name = "Note · " + B.id; b.appendChild(n); n.layoutSizingHorizontal = "FILL";
  const link = B.link || (SANDBOX + "?state=" + B.id);
  L.setP(n, { Title: B.noteTitle || B.title, Text: B.note, Link: "Prototype ↗  " + link.replace("https://", "") });
  const lt = n.findOne(x => x.type === "TEXT" && x.name === "Link · prototype"); await figma.loadFontAsync(lt.fontName); lt.setRangeHyperlink(0, lt.characters.length, { type: "URL", value: link });
  return b;
};
const layout = async (colKey, order, stage) => {
  const col = await L.getL(colKey);
  let st = col.children.find(c => c.name.startsWith("Stage · "));
  if (stage) { if (!st) { st = (await L.getL("stage")).createInstance(); col.appendChild(st); } st.name = "Stage · " + stage.id; L.setP(st, { ID: stage.id, Title: stage.title, Line: stage.line }); }
  if (st) { st.x = 80; st.y = 80; }
  let y = 440, w = 0;
  const blocks = order.map(id => col.children.find(c => c.name === "Block · " + id)).filter(Boolean);
  for (const b of blocks) { b.x = 80; b.y = y; y += Math.round(b.height) + 240; w = Math.max(w, Math.round(b.width)); }
  if (st) { st.resize(Math.max(w, 1895), st.height); w = Math.max(w, st.width); }
  const H = Math.max(y - 240 + 80, 600);
  col.resizeWithoutConstraints(Math.max(w + 400, 600), H); // 80 left + 320 marker gutter
  return { blocks: blocks.length, H };
};
const restackBoard = async () => {
  // page-level column sections (2026-10-17 split, like the GEAP Ghișeu board): 00 start · 01 list · 02 filter · 03 profile ·
  // 04 modal · 05 company, 80 apart from (10989, -103); column = 80 | block 1895 | 320 gutter for jump markers (x 1911) = 2295
  let x = 10989; const out = [];
  for (const k of ["start", "col01", "colF", "col02", "col04", "col03"]) { const s = await L.getL(k); if (!s) continue; s.x = x; s.y = -103; x += Math.round(s.width) + 80; out.push([s.name.slice(0, 2), s.id, s.x]); }
  return out;
};
return { block, layout, restackBoard, SANDBOX };
