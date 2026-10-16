// Ghișeu board — COLUMN layout pass (GEAP boards are vertical; user correction 2026-10-16) + arrows.
// Run via use_figma (positions / connectors only, re-runnable). Section „Ghișeu · Desk filing” 11818:21092 on
// page 11589:327039. One column per stage: `Stage NN · …` bar (column wide) at Y0, blocks 244 below, stacked 240
// apart (default → filled → errors); columns 1440 + 240; title (80, 80); TOC + Questions for PO at y 440 over
// columns 1–2; Y0 = 440 + their height + 396.
// Arrows (connector style cloned from an existing board arrow 10952:283686, label = the trigger):
//  - next column  → start = the clicked control (top-level instance in the screen) magnet RIGHT, end = the next
//                   column's first block at position (0, 120): the vertical runs in the 240 gap, never over a block;
//  - same column, adjacent → control BOTTOM → target TOP;
//  - same column, further down / up → control LEFT → target LEFT at (0, 200 + 32·k) (left lane).
//  Never pick a control outside the visible screen (background list rows behind sheets are clipped at x > 1440).
const COLS = [
  ["01", "Dosare noi", ["gh-01", "gh-01c", "gh-01f", "gh-01d", "gh-01e", "gh-01a", "gh-01b", "gh-01g"]],
  ["02", "Dosar nou · fereastra mică", ["gh-02", "gh-02q", "gh-02b", "gh-02c", "gh-02d", "gh-02m", "gh-02v", "gh-02g", "gh-02p", "gh-02a", "gh-02s", "gh-02h", "gh-02e", "gh-02f"]],
  ["03", "Ce se solicită?", ["gh-02i", "gh-02j", "gh-02t", "gh-02r", "gh-02k", "gh-02w", "gh-02x", "gh-02l", "gh-02u", "gh-02n"]],
  ["04", "Date solicitant", ["gh-03", "gh-03b", "gh-03c", "gh-03h", "gh-03i", "gh-04", "gh-04b", "gh-03f", "gh-03g", "gh-03a", "gh-03e", "gh-03d", "gh-04a"]],
  ["05", "Detalii serviciu", ["gh-05", "gh-05b", "gh-05d", "gh-05c", "gh-05a"]],
  ["06", "Documente însoțitoare", ["gh-06", "gh-06b", "gh-06a"]],
  ["07", "Verificare", ["gh-07", "gh-07j", "gh-07a", "gh-07b", "gh-07c", "gh-07f", "gh-07d", "gh-07e", "gh-07g", "gh-07h", "gh-07i"]],
  ["08", "Livrare", ["gh-08", "gh-08a"]],
  ["09", "Notă de plată", ["gh-09", "gh-09a", "gh-09b", "gh-09c", "gh-09d"]],
  ["10", "Confirmarea depunerii", ["gh-10", "gh-10a", "gh-10d", "gh-10e", "gh-10b", "gh-10c"]],
  ["11", "Schițe: salvare, reluare, eliminare", ["gh-13", "gh-11c", "gh-11d", "gh-02o", "gh-11", "gh-11b", "gh-11a", "gh-12"]],
];
const COLUMN_LAYOUT = async () => {
  const page = await figma.getNodeByIdAsync("11589:327039"); await figma.setCurrentPageAsync(page);
  const sec = page.children.find((n) => n.type === "SECTION" && n.name === "Ghișeu · Desk filing");
  const PAD = 80, COLW = 1440, GAP = 240, BAR_GAP = 244;
  const by = (n) => sec.children.find((c) => c.name === n);
  const blk = (st) => by("Block · " + st);
  const title = by("Board title · Ghișeu"); title.x = PAD; title.y = PAD;
  const toc = by("How to read · Contents"), q = by("Questions for PO");
  toc.x = PAD; toc.y = 440; q.x = PAD + COLW + GAP; q.y = 440;
  const Y0 = 440 + Math.max(toc.height, q.height) + 396;
  for (let k = 0; k < COLS.length; k++) {
    const [chip, name, states] = COLS[k]; const x = PAD + k * (COLW + GAP);
    const bar = sec.children.find((c) => c.name.startsWith(`Stage ${chip} · `));
    bar.resize(COLW, bar.height); bar.primaryAxisSizingMode = "AUTO"; bar.x = x; bar.y = Y0;
    let y = Y0 + bar.height + BAR_GAP;
    for (const st of states) { const b = blk(st); b.x = x; b.y = y; y += b.height + GAP; }
  }
  let maxR = 0, maxB = 0;
  for (const c of sec.children) { if (c.type === "CONNECTOR") continue; maxR = Math.max(maxR, c.x + c.width); maxB = Math.max(maxB, c.y + c.height); }
  sec.resizeWithoutConstraints(Math.round(maxR + PAD), Math.round(maxB + PAD));
  return [sec.width, sec.height];
};
