// Ghișeu board · arrows after the section split (2026-10-17). Run the steps via use_figma, one per call, in order.
// Page „↳ BO -> Ghișeu · Desk filing” 11589:327039; sections 00 11933:28964, 01…11 = 11933:28965…28975.
// Snapshot (revert data): tools/figma/ghiseu/arrows/snapshot-2026-10-17-before.json (+ figma.root ghconn/snap-20261017).
//
// Diagnosis: split-sections.js moved the 59 connectors to the PAGE without re-routing them. Figma kept their cached
// geometry in the old SECTION space → 45 same-column arrows rendered 3–20 k px away from their columns (x 0–1400, over
// / under „00 · How to read”), and nothing showed inside the columns. The 9 „Board marker · jump” chips sat at block
// x 1460 (20 px off the screen) and ran up to 91 px past the 1600 section edge into the gap.
//
// Layout after the fix (column board):
//  - column section = 80 | block 1440 | 240 right gutter (markers) ; sections 80 apart → pitch 1840 (01 at x 3360).
//  - markers: block-relative x 1456 (screen + 16), y = trigger centre − 14; triggers on the same row stack 36 apart.
//  - same-column arrows live INSIDE their column section (section screenshots show them, moves carry them);
//    adjacent = control BOTTOM → target TOP; further down = control LEFT → target LEFT (0, 200 + 32k) (left lane).
//  - next-column arrows stay on the page: control RIGHT → target LEFT at the trigger's height (straight), clamped to
//    [120, h − 120] of the target; when the jog would be > 650 px (trigger deep in the column, target at the top) the
//    arrow becomes a marker chip next to the trigger (hyperlink NODE → target block).
//  - backward jumps (target above the source) = markers.
//  - after ANY move of endpoints (sections, blocks, reparenting): re-route every connector (toggle the end magnet /
//    position) — Figma does not re-route connectors moved by the plugin API.

const PAGE = "11589:327039";
const COL_SECTIONS = ["11933:28965", "11933:28966", "11933:28967", "11933:28968", "11933:28969", "11933:28970",
  "11933:28971", "11933:28972", "11933:28973", "11933:28974", "11933:28975"];
const BUILD_ASSETS = "11819:282647";
const X0 = 3360, SEC_W = 1760, SEC_GAP = 80, MARK_X = 1456, MARK_H = 28, STACK = 36;
const MARKER_MAIN = "11881:355015", MARKER_PROP = "Label#11881:0";

// marker id or new spec → trigger node (row alignment). Order inside a block = stacking order on a shared row.
const MARKERS = [
  // existing
  { id: "11882:1924", trigger: "11860:26498" },            // gh-01 row 1 Continuă → GH-02x
  { id: "11882:1926", trigger: "11860:26463" },            // gh-01 row 2 ⋮ → GH-11 · Elimină
  { id: "11882:1922", trigger: "11860:26510" },            // gh-01 row 4 Continuă → GH-13
  { id: "11882:2171", trigger: "11865:361169" },           // gh-01d menu item Elimină schița → GH-11a
  { id: "11882:2591", trigger: "11881:268841" },           // gh-03f Salvează schița → GH-01
  { id: "11882:2593", trigger: "11881:268825" },           // gh-03f header ⋮ → GH-02w (Schimbă procesul)
  { id: "11882:2595", trigger: "11881:268837" },           // gh-03f × → GH-02o
  { id: "11882:2597", trigger: "11881:272060" },           // gh-03f identity card Schimbă → GH-02p
  { id: "11882:3020", trigger: "11865:351124" },           // gh-03k Înainte → GH-03l
  // new (replace connectors)
  { block: "11818:21269", trigger: "11607:9589", target: "11818:21445", label: "→ GH-02i · Continuă", replaces: "11823:20251" },
  { block: "11818:21285", trigger: "11637:10736", target: "11818:21445", label: "→ GH-02i · Continuă", replaces: "11819:20484" },
  { block: "11818:21557", trigger: "11865:360853", target: "11818:21605", label: "→ GH-03 · Solicitare nouă", replaces: "11823:20271" },
  { block: "11818:22005", trigger: "11738:266369", target: "11818:22117", label: "→ GH-08 · Înainte", replaces: "11819:20504" },
  { block: "11818:22165", trigger: "11767:179342", target: "11818:22229", label: "→ GH-10 · Înainte", replaces: "11819:20512" },
  // 11823:20275 gh-03a „Prin procură” → gh-03f (backward, same trigger + label as 11882:347458 → gh-03j): removed;
  // gh-03f = procură + „Salvează schița” (demo state) → the jump starts on gh-03j's Salvează schița.
  { block: "11881:353332", trigger: "11865:351632", target: "11818:21717", label: "→ GH-03f · Salvează", replaces: "11823:20275" },
];

// STEP 1 · widen + re-space the column sections; move the build-assets section after them.
const STEP1_SECTIONS = async () => {
  const page = await figma.getNodeByIdAsync(PAGE); await figma.setCurrentPageAsync(page);
  const out = [];
  for (let k = 0; k < COL_SECTIONS.length; k++) {
    const s = await figma.getNodeByIdAsync(COL_SECTIONS[k]);
    s.x = X0 + k * (SEC_W + SEC_GAP); s.resizeWithoutConstraints(SEC_W, s.height); out.push([s.name.slice(0, 2), s.x]);
  }
  const ba = await figma.getNodeByIdAsync(BUILD_ASSETS); ba.x = X0 + COL_SECTIONS.length * (SEC_W + SEC_GAP);
  return out;
};

// STEP 2 · markers: place existing, create new (+ remove the connectors they replace), stack shared rows.
const STEP2_MARKERS = async () => {
  const page = await figma.getNodeByIdAsync(PAGE); await figma.setCurrentPageAsync(page);
  const main = await figma.getNodeByIdAsync(MARKER_MAIN);
  const removed = [], created = [], placed = [];
  const rows = {}; // block id → [[y, node]]
  for (const m of MARKERS) {
    let node;
    if (m.id) node = await figma.getNodeByIdAsync(m.id);
    else {
      const block = await figma.getNodeByIdAsync(m.block);
      node = block.children.find((c) => c.type === "INSTANCE" && c.name === "Marker · " + m.label);
      if (!node) {
        node = main.createInstance(); block.appendChild(node); node.layoutPositioning = "ABSOLUTE";
        node.setProperties({ [MARKER_PROP]: m.label }); node.name = "Marker · " + m.label;
        const t = node.findOne((n) => n.type === "TEXT"); await figma.loadFontAsync(t.fontName);
        t.hyperlink = { type: "NODE", value: m.target }; created.push(node.id);
      }
      if (m.replaces) { const c = await figma.getNodeByIdAsync(m.replaces); if (c) { removed.push([c.id, c.name]); c.remove(); } }
    }
    const block = node.parent, trg = await figma.getNodeByIdAsync(m.trigger);
    const cy = trg.absoluteBoundingBox.y + trg.absoluteBoundingBox.height / 2 - block.absoluteBoundingBox.y;
    (rows[block.id] = rows[block.id] || []).push([Math.round(cy - MARK_H / 2), node, trg.absoluteBoundingBox.x]);
  }
  for (const list of Object.values(rows)) {
    list.sort((a, b) => a[0] - b[0] || a[2] - b[2]); let last = -1e9;
    for (const [y, n] of list) { const yy = Math.max(y, last + STACK); n.x = MARK_X; n.y = yy; last = yy; placed.push([n.name, yy]); }
  }
  return { created, removed, placed };
};

// STEP 3 · re-route: same-column arrows into their section, next-column arrows straight, re-anchor block starts.
const STEP3_ROUTE = async () => {
  const page = await figma.getNodeByIdAsync(PAGE); await figma.setCurrentPageAsync(page);
  const secOf = (n) => { let p = n; while (p && p.type !== "SECTION") p = p.parent; return p; };
  const blockOf = (n) => { let p = n; while (p && !/^Block · /.test(p.name)) p = p.parent; return p; };
  const RE_ANCHOR = { "11882:347454": { endpointNodeId: "11860:26483", magnet: "LEFT" } }; // gh-01 → gh-01d: row 6 ⋮
  const conns = page.findAll((n) => n.type === "CONNECTOR");
  const out = { moved: 0, straight: [], reanchored: [], rerouted: 0 };
  for (const c of conns) {
    if (RE_ANCHOR[c.id]) { c.connectorStart = RE_ANCHOR[c.id]; out.reanchored.push(c.id); }
    const s = await figma.getNodeByIdAsync(c.connectorStart.endpointNodeId), e = await figma.getNodeByIdAsync(c.connectorEnd.endpointNodeId);
    const ss = secOf(s), es = secOf(e);
    if (ss && ss === es) { if (c.parent !== ss) { ss.appendChild(c); out.moved++; } }
    else if (c.parent !== page) page.appendChild(c);
    const end = { ...c.connectorEnd };
    if (ss !== es && c.connectorStart.magnet === "RIGHT") {
      const sb = s.absoluteBoundingBox, eb = e.absoluteBoundingBox; const cy = sb.y + sb.height / 2 - eb.y;
      let y = Math.min(Math.max(cy, 120), eb.height - 120);
      if (c.id === "11819:20496") y = 1000; // gh-05 → gh-06: stay above gh-06's own left-lane stub (Înainte at 1081)
      end.position = { x: 0, y: Math.round(y) }; delete end.magnet; out.straight.push([c.name, Math.round(cy), Math.round(y)]);
    }
    // force the re-route: flip the end to another magnet, then set the real end
    c.connectorEnd = { endpointNodeId: end.endpointNodeId, magnet: end.magnet === "BOTTOM" ? "TOP" : "BOTTOM" };
    c.connectorEnd = end; out.rerouted++;
  }
  return out;
};

// STEP 4 (supersedes the lane part of STEP 3, after screenshots) · side lanes outside the screens.
// Position endpoints ON a block edge have no outward stub → Figma drew the lane ON the screen border, and a LEFT start
// on a right-side control struck through the whole table row. Magnet ends get a 32 px stub → real lanes.
//  - same column: start = nearest side of the trigger (centre x < 720 → LEFT, else RIGHT), end = the target block's
//    SAME side magnet (middle of the edge). Lanes: block.x − 32 (left) / block right + 32 (right).
//  - markers move to block x 1512 (+72, clear of the right lane); column section = 80 | 1440 | 280 → width 1800,
//    pitch 1880; the build-assets section follows the last column.
const LANE_SEC_W = 1800, LANE_MARK_X = 1512;
const STEP4_LANES = async () => {
  const page = await figma.getNodeByIdAsync(PAGE); await figma.setCurrentPageAsync(page);
  for (let k = COL_SECTIONS.length - 1; k >= 0; k--) {
    const s = await figma.getNodeByIdAsync(COL_SECTIONS[k]); s.x = X0 + k * (LANE_SEC_W + SEC_GAP); s.resizeWithoutConstraints(LANE_SEC_W, s.height);
  }
  (await figma.getNodeByIdAsync(BUILD_ASSETS)).x = X0 + COL_SECTIONS.length * (LANE_SEC_W + SEC_GAP);
  for (const m of page.findAll((n) => n.type === "INSTANCE" && /^Marker · /.test(n.name))) m.x = LANE_MARK_X;
  const secOf = (n) => { let p = n; while (p && p.type !== "SECTION") p = p.parent; return p; };
  const blockOf = (n) => { let p = n; while (p && !/^Block · /.test(p.name)) p = p.parent; return p; };
  const out = { side: [], cross: 0 };
  for (const c of page.findAll((n) => n.type === "CONNECTOR")) {
    const s = await figma.getNodeByIdAsync(c.connectorStart.endpointNodeId), e = await figma.getNodeByIdAsync(c.connectorEnd.endpointNodeId);
    if (secOf(s) !== secOf(e)) { // next column: RIGHT → LEFT at the trigger height (re-route after the section move)
      const end = { endpointNodeId: e.id, position: { ...c.connectorEnd.position } };
      c.connectorEnd = { endpointNodeId: e.id, magnet: "TOP" }; c.connectorEnd = end; out.cross++; continue;
    }
    const sb = blockOf(s), a = s.absoluteBoundingBox, b = sb.absoluteBoundingBox;
    const side = a.x + a.width / 2 - b.x < 720 ? "LEFT" : "RIGHT";
    c.connectorStart = { endpointNodeId: s.id, magnet: side };
    c.connectorEnd = { endpointNodeId: e.id, magnet: "TOP" }; c.connectorEnd = { endpointNodeId: e.id, magnet: side };
    out.side.push(c.name.split(" · ")[0] + " " + side[0]);
  }
  return out;
};
