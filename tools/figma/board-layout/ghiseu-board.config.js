// GEAP 2.0 · ↳ BO -> Ghișeu · Desk filing 11589:327039 · section „Ghișeu · Desk filing”. Desktop-only blocks
// (user 2026-10-16) → colW 1440. Used with row-lane-layout.js (2026-10-16). Snapshot: page shared plugin data
// ghs/snapshot-20261016-layout (positions before the blocks were built).
// Rows / block ids come from tools/figma/ghiseu/blocks.config.js (GH_ROWS) — build the CFG at run time:
const ghBoardCfg = (sec, GH_ROWS) => {
  const blk = (st) => sec.children.find((n) => n.name === "Block · " + st).id;
  const by = (name) => sec.children.find((n) => n.name === name).id;
  return {
    pageId: "11589:327039", sectionId: sec.id, sectionX: 0, sectionY: 0,
    pad: 80, gutterW: 720, colW: 1440, colGap: 240, rowGap: 396, firstRowY: 440, headerW: 560,
    title: { id: by("Board title · Ghișeu") },
    headerTpl: "11350:129331",
    rows: [{ key: "00 · How to read", cells: [[0, by("How to read · Contents")], [1, by("Questions for PO")]] }]
      .concat(GH_ROWS.map((r) => ({ key: r.key, header: { chip: r.chip, title: r.title, desc: r.desc + " · " + r.us },
        cells: r.states.map((st, k) => [k, blk(st)]) }))),
  };
};
