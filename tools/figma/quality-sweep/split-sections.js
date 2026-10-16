// Quality sweep · Ghișeu (2026-10-16, user change) — one Figma SECTION per stage column + a start section.
// Old section 11818:21092 („Ghișeu · Desk filing”) → „00 · How to read · Contents” (board title, contents, questions for PO)
// + „NN · <English> (<bar title>)” per Stage bar, side by side 80 apart, tops aligned, padding 80 (bar at 80,80, blocks keep
// their offsets under the bar). Connectors move to the page (endpoints are node ids, so they stay attached). Old section removed.
const SPLIT = async () => {
  const EN = { "01": "New cases", "02": "New case · small window", "03": "What is requested?", "04": "Applicant data", "05": "Service details", "06": "Supporting documents", "07": "Review", "08": "Delivery", "09": "Payment note", "10": "Submission confirmation", "11": "Drafts: save, resume, delete" };
  const page = await figma.getNodeByIdAsync("11589:327039"); await figma.setCurrentPageAsync(page);
  const S = await figma.getNodeByIdAsync("11818:21092"); const sx = S.x, sy = S.y, PAD = 80, GAP = 80;
  const by = (n) => S.children.find((c) => c.name === n);
  const conns = S.children.filter((c) => c.type === "CONNECTOR");
  const out = { sections: [] };
  // start section
  const title = by("Board title · Ghișeu"), toc = by("How to read · Contents"), q = by("Questions for PO");
  const st = figma.createSection(); page.appendChild(st); st.name = "00 · How to read · Contents";
  const items0 = [title, toc, q]; const minX = Math.min(...items0.map((n) => n.x)), minY = Math.min(...items0.map((n) => n.y));
  const w0 = Math.max(...items0.map((n) => n.x + n.width)) - minX + 2 * PAD, h0 = Math.max(...items0.map((n) => n.y + n.height)) - minY + 2 * PAD;
  st.x = sx; st.y = sy; st.resizeWithoutConstraints(Math.round(w0), Math.round(h0));
  for (const n of items0) { const x = n.x - minX + PAD, y = n.y - minY + PAD; st.appendChild(n); n.x = x; n.y = y; }
  out.sections.push([st.name, st.id]);
  let x = sx + st.width + GAP;
  const bars = S.children.filter((c) => /^Stage \d+ · /.test(c.name)).sort((a, b) => a.x - b.x);
  for (const bar of bars) {
    const chip = bar.name.match(/^Stage (\d+)/)[1]; const ro = bar.name.replace(/^Stage \d+ · /, "");
    const col = S.children.filter((c) => /^Block · /.test(c.name) && Math.abs(c.x - bar.x) < 2);
    const sc = figma.createSection(); page.appendChild(sc); sc.name = `${chip} · ${EN[chip] || ro} (${ro})`;
    const bx = bar.x, by0 = bar.y; const bottom = Math.max(bar.y + bar.height, ...col.map((b) => b.y + b.height));
    sc.x = x; sc.y = sy; sc.resizeWithoutConstraints(bar.width + 2 * PAD, Math.round(bottom - by0 + 2 * PAD));
    for (const n of [bar, ...col]) { const nx = n.x - bx + PAD, ny = n.y - by0 + PAD; sc.appendChild(n); n.x = nx; n.y = ny; }
    out.sections.push([sc.name, sc.id, col.length]);
    x += sc.width + GAP;
  }
  for (const c of conns) page.appendChild(c);
  out.left = S.children.map((c) => c.name);
  if (!S.children.length) S.remove();
  out.conns = page.children.filter((c) => c.type === "CONNECTOR").length;
  return out;
};
