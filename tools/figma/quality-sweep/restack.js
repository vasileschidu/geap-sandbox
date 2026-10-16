// Quality sweep · Ghișeu (2026-10-16) — restack every column of the column board after height changes:
// blocks in a column keep their order (sorted by y), first block = stage bar bottom + 244, then 240 apart; section refit (80 pad).
const RESTACK = async () => {
  const sec = await figma.getNodeByIdAsync("11818:21092");
  const bars = sec.children.filter((c) => /^Stage \d+ · /.test(c.name));
  const out = [];
  for (const bar of bars) {
    const col = sec.children.filter((c) => /^Block · /.test(c.name) && Math.abs(c.x - bar.x) < 2).sort((a, b) => a.y - b.y);
    let y = bar.y + bar.height + 244; let moved = 0;
    for (const b of col) { if (b.y !== y) { b.y = y; moved++; } y += b.height + 240; }
    out.push(`${bar.name.slice(0, 8)} ${col.length} moved ${moved}`);
  }
  let maxR = 0, maxB = 0;
  for (const c of sec.children) { if (c.type === "CONNECTOR") continue; maxR = Math.max(maxR, c.x + c.width); maxB = Math.max(maxB, c.y + c.height); }
  sec.resizeWithoutConstraints(Math.round(maxR + 80), Math.round(maxB + 80));
  return { out, sec: [sec.width, sec.height] };
};
