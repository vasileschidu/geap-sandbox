// RAP staging review — capture the developers' staging build (READ-ONLY) per Figma block, at 1440 and 375.
//
//   node --experimental-websocket --no-warnings tools/figma/rap-staging-review/shots.mjs [--only rap-01,rap-01q] [--vp 1440|375]
//        [--out tools/ui-qa/out/rap-staging-review] [--sheet | --sheet-only]
//
// Every shot goes through tools/ui-qa/staging-compare/run.mjs probe mode, so the read-only guard applies (only GET / HEAD /
// OPTIONS + the register's search POST leave the browser; write-like clicks throw; the cookie banner is hidden by CSS).
// Output: <out>/<block>-<vp>.png (git-ignored). Page states = the whole page; overlay states (menus, sheets, panels) =
// the viewport only (1440 × 900 / 375 × 812). Phones: staging's page is 1236 px wide at 375 (horizontal overflow, pin #1
// on every phone row) → the shot is clipped to the left 375 px, as a phone shows it.
// Blocks with staging „no” are not captured (the review row gets the „Not reachable on staging” placeholder); „data”
// blocks reuse the nearest staging shot (`same`) and get the „Different data” tag.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const arg = (n, d) => { const i = process.argv.indexOf("--" + n); return i > -1 ? process.argv[i + 1] : d; };
const OUT = arg("out", "tools/ui-qa/out/rap-staging-review");
const ONLY = (arg("only", "") || "").split(",").filter(Boolean);
const VPS = (arg("vp", "1440,375")).split(",").map(Number);
const RUN = "tools/ui-qa/staging-compare/run.mjs";
const SPEC = "tools/ui-qa/staging-compare/rap.json";
const SEARCH = "input[placeholder^='Caută după']";

/* block → staging url + read-only steps. mode: page (whole page) | viewport. same: reuse another block's shot. */
export const BLOCKS = [
  // 01 · Registry list
  { block: "rap-01", url: "/", mode: "page" },
  { block: "rap-01e", staging: "no" },
  { block: "rap-01f", same: "rap-01", staging: "data" },
  { block: "rap-01q", url: "/registry?q=147-2026", mode: "page", staging: "data" },
  { block: "rap-s01", url: "/", mode: "page", steps: [{ click: SEARCH, after: 600 }, { type: "alcool", after: 1200 }] },
  // 02 · Filtre (steps copied from rap.json; rff-03…10 still to write — see README „What's left”)
  { block: "rff-01", url: "/", mode: "page", steps: [{ click: "text:Filtru", after: 1500 }] },
  { block: "rff-02", url: "/", mode: "viewport", steps: [{ click: "text:Filtru", after: 1200 }, { click: "text:Statut", after: 1000, vp: "desktop" }] },
  { block: "rff-12", url: "/", mode: "viewport", steps: [{ click: "text:Filtru", after: 1500 }], vps: [375] },
  // 03 · Act profile
  { block: "rap-02b", url: "/registry/147-2026-00005?authority=33", mode: "page", steps: [{ waitFor: "text:Vizualizare act" }] },
  { block: "rap-02c", url: "/registry/NU-EXISTA-0000?authority=33", mode: "page", steps: [{ waitFor: "text:Actul nu a fost găsit." }] },
  // 06 · Act data
  { block: "rap-03x", url: "/registry/147-2026-00005?authority=33", mode: "viewport", steps: [{ click: "text:Vizualizare act", after: 2000 }, { waitFor: "text:Date generale" }] },
  // Not in Figma (staging only)
  { block: "nf-search-empty", url: "/registry?q=zzzzqq", mode: "page" },
  { block: "nf-page-size", url: "/", mode: "viewport", steps: [{ click: ".rap-pager__size-select", after: 1200, optional: true }] },
];

/* crop.swift keeps the top-left w × h (sips can't crop from 0,0) and trims the empty bottom (never below the viewport height) */
const CROP = path.join(OUT, ".crop-bin");
const crop = (file, w, vpH, mode) => {
  if (!fs.existsSync(CROP)) execFileSync("swiftc", ["-O", "tools/figma/rap-staging-review/crop.swift", "-o", CROP]);
  const r = execFileSync(CROP, [file, file, String(w), String(mode === "viewport" ? vpH : 0), "trim", String(vpH)]).toString().trim();
  const m = /(\d+)x(\d+) from (\d+)x(\d+)/.exec(r);
  return { W: m[1], H: m[2], from: m[1] + "x" + m[2] === m[3] + "x" + m[4] ? "" : `${m[3]}×${m[4]}` };
};

fs.mkdirSync(OUT, { recursive: true });
const done = [];
const SHEET_ONLY = process.argv.includes("--sheet-only");
for (const b of SHEET_ONLY ? [] : BLOCKS) {
  if (ONLY.length && !ONLY.includes(b.block)) continue;
  if (b.staging === "no" || b.same) { done.push(`${b.block}: ${b.staging === "no" ? "not reachable" : "uses " + b.same}`); continue; }
  for (const vp of b.vps || VPS) {
    if (!VPS.includes(vp)) continue;
    const png = path.join(OUT, `${b.block}-${vp}.png`);
    const steps = (b.steps || []).filter((s) => !s.vp || (s.vp === "phone") === (vp <= 760));
    try {
      execFileSync("node", ["--experimental-websocket", "--no-warnings", RUN, "--spec", SPEC, "--probe", `staging:${b.url}`,
        "--viewports", String(vp), "--steps", JSON.stringify(steps), "--png", png], { stdio: ["ignore", "pipe", "pipe"], timeout: 180000 });
      const r = crop(png, vp, vp > 760 ? 900 : 812, b.mode);
      done.push(`${b.block}-${vp}: ${r.W}×${r.H}${r.from ? " (cut from " + r.from + ")" : ""}`);
    } catch (e) { done.push(`${b.block}-${vp}: FAILED ${String(e.stderr || e.message).slice(0, 200)}`); }
    await new Promise((r) => setTimeout(r, 1000));   // one browser at a time, 1 s apart (staging etiquette)
  }
}
console.log(done.join("\n"));

/* --sheet: one HTML page with every shot of this run (natural size, stacked, 40 apart) → captured into Figma with
   tools/figma/capture-to-figma.mjs --page <sheet> (the capture turns each <img> into an image fill; alt = layer name). */
if (process.argv.includes("--sheet") || SHEET_ONLY) {
  const files = fs.readdirSync(OUT).filter((f) => f.endsWith(".png") && (!ONLY.length || ONLY.some((b) => f.startsWith(b + "-")))).sort();
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>staging shots</title><style>body{margin:0;background:#fff}
main{display:flex;flex-direction:column;gap:40px;align-items:flex-start;padding:0} img{display:block}</style></head><body><main id="sheet">
${files.map((f) => `<img src="${f}" alt="staging · ${f.replace(".png", "")}">`).join("\n")}
</main><script>document.documentElement.dataset.demoState = "sheet";</script></body></html>`;
  fs.writeFileSync(path.join(OUT, "sheet.html"), html);
  console.log("sheet", path.join(OUT, "sheet.html"), files.length, "shots");
}
