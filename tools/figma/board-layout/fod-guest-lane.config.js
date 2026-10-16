// FOD-Components-flow (pvDAJPXKyUuJgz3P921Ye8) · ↳ Requestor · „Guest lane · without account” 756:25760.
// Used with row-lane-layout.js (2026-10-16). Revert: revert-snapshot.js + fod-guest-lane.snapshot-2026-10-16.json.
const CFG = {
  pageId: "265:14041", sectionId: "756:25760",
  sectionX: 18394,                       // = left edge of the Requestor columns / „How to read” above
  pad: 80, gutterW: 720, colW: 1895, colGap: 240, rowGap: 396, firstRowY: 440, headerW: 560,
  title: { id: "756:25761", descId: "756:25765", descW: 560 },
  headerTpl: "756:25262",                // „Stage 05 · Applicant data” of the authenticated lane
  rows: [
    { key: "A · Access", header: { chip: "02", title: "Access", desc: "G0 · sign in with MPass (→ 03) or continue without an account." },
      cells: [[0, "756:27566"]], markers: [[1, "756:27558", "756:27566"]] },
    { key: "B · Who can apply", header: { chip: "05", title: "Who can apply", desc: "auth.availableFor → G1 PF + PJ (G1b legal entity) · G2 PF only · G3 PJ only." },
      gutter: ["756:25766"], cells: [[0, "756:25770"], [1, "756:26375"], [2, "756:25964"], [3, "756:26150"]] },
    { key: "C · IDNO lookup", header: { chip: "05", title: "Company IDNO lookup", desc: "G1b IDNO complete → G1c searching → G1d company found · G1e unknown IDNO." },
      cells: [[1, "756:27634"], [2, "756:27867"], [3, "756:28100"]] },
    { key: "D · For another person", header: { chip: "05", title: "For another person", desc: "G4 power of attorney · G4a file added · G5 company → G7 guest wizard." },
      gutter: ["756:27554"], cells: [[0, "756:26608"], [1, "756:28333"], [2, "756:26853"]], markers: [[3, "756:30451", "756:26853"]] },
    { key: "E · Validation and leaving", header: { chip: "05", title: "Validation and leaving", desc: "G6 empty fields · G6a wrong formats · G6b unknown IDNO · G8 leave the application." },
      cells: [[0, "756:27085"], [1, "756:28586"], [2, "756:28780"], [3, "756:27338"]], markers: [[4, "756:30443", "756:27338"]] },
    { key: "F · Guest wizard", header: { chip: "2–7", title: "Guest wizard", desc: "G7 service details → G7a documents → G7b review + MSign → G7c delivery → G7d completion." },
      gutter: ["756:27562"], cells: [[0, "756:29013"], [1, "756:29236"], [2, "756:29510"], [3, "756:29861"], [4, "756:30027"]], markers: [[5, "756:30447", "756:30027"]] },
  ],
  connectors: [
    // downward: leave the block's LEFT edge at the clicked control, run in the gutter strip, enter the target's left edge
    { id: "756:30455", s: { n: "756:27566", edge: "LEFT", at: "756:27596" }, e: { n: "756:25770", p: [0, 120] } },          // G0 → G1
    { id: "756:30459", s: { n: "756:25770", edge: "LEFT", at: "756:25886" }, e: { n: "756:27554", p: [400, 0] } },          // G1 → d For whom (right of the row headers)
    { id: "756:30474", e: { n: "756:25766", p: [400, 0] } },                                                                 // A2 → d availableFor
    // downward on the RIGHT side of the column (the left gap carries the row's incoming arrow)
    { id: "756:30461", e: { n: "756:27634", p: [1895, 120] } },                                                               // G1b → G1c
    { id: "756:30465", e: { n: "756:27085", p: [1895, 120] } },                                                               // G4 → G6
    // same-row steps: straight horizontal (end on the target's left edge at the start's y)
    { id: "756:30457", e: { n: "756:25770", straight: true } },
    { id: "756:30460", e: { n: "756:26608", straight: true } },
    { id: "756:30458", e: { n: "756:26375", straight: true } },
    { id: "756:30462", s: { n: "756:27634", p: [1895, 1100] }, e: { n: "756:27867", straight: true } },
    { id: "756:30464", e: { n: "756:28333", straight: true } },
    { id: "756:30467", e: { n: "756:27338", straight: true } },
    { id: "756:30469", e: { n: "756:29236", straight: true } },
    { id: "756:30470", e: { n: "756:29510", straight: true } },
    { id: "756:30471", e: { n: "756:29861", straight: true } },
    { id: "756:30472", e: { n: "756:30027", straight: true } },
  ],
};
