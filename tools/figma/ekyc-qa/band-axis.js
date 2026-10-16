// eKYC BO QA — decision-band axis → auto-layout (2026-10-16). Run per page: new AF("__OPT", code)({ page, mode: "dry" | "apply" })
// Code (ekyc-config.js band(), css .e-permits-ekyc-band__axis): an SVG 44 high, margin-top −8 under the 12px stacked meter;
// ticks 1×6 (border/base/default) at 0 / reject / accept / 1, labels 12px at baseline 22 anchored start / middle / middle / end,
// optional „Scor minim de încredere …” line at baseline 42. The capture left them as absolute vectors + texts in „Icon:margin”.
// New: „Band” (VERTICAL, gap 8 = 16 − 8) = [meter wrapper, „Axis” (VERTICAL, FIXED 44, gap 4)]; Axis = [„Ticks” row, extra
// texts]. Ticks row = tick groups (VERTICAL gap 4: tick frame 1×6 + label with a FIXED whole width; middle groups odd so the
// tick centres on a whole pixel) separated by FIXED „Spacer” frames whose widths put every tick on its data position.
// Backup: the original axis frame is cloned to the Archive backup frame (as graphics.js) before the change.
const OPT = typeof __OPT !== "undefined" ? __OPT : { page: "PAGE_ID", mode: "dry" };
const AR = "10392:2", BK = "QA backup · ekyc-qa · 2026-10-16";
const page = await figma.getNodeByIdAsync(OPT.page);
await figma.setCurrentPageAsync(page);
const inI = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
const V = async (k) => figma.variables.importVariableByKeyAsync(k);
const SP4 = "983c5b4d9a4e5fa988f0154c9bf4290c7aec9635", SP8 = "69ac88e41c0fea695fc5c4fd33f0188d1172dc59";
const res = { axes: 0, skipped: [], errors: [] };
const isAxis = (n) => n.type === "FRAME" && (!n.layoutMode || n.layoutMode === "NONE" || n.children.every((k) => k.layoutPositioning === "ABSOLUTE")) && n.children.length >= 4 &&
  n.children.some((k) => k.type === "VECTOR" && k.width < 0.5 && Math.round(k.height) === 6) && n.children.some((k) => k.type === "TEXT");
async function backupOf(n) {
  const ar = await figma.getNodeByIdAsync(AR); await ar.loadAsync(); const bk = ar.children.find((c) => c.name === BK);
  const c = n.clone(); bk.appendChild(c); c.setSharedPluginData("ekqa", "orig", n.id + "|" + n.parent.id + "|" + n.parent.children.indexOf(n));
}
async function convert(ax) {
  const card = ax.parent; const i = card.children.indexOf(ax); const meter = card.children[i - 1];
  if (!meter || card.layoutMode !== "VERTICAL") { res.skipped.push(ax.id + " no meter before"); return; }
  const W = Math.round(ax.width);
  const ticks = []; const extra = [];
  for (let k = 0; k < ax.children.length; k++) { const n = ax.children[k]; if (n.type === "VECTOR" && n.width < 0.5) { const t = ax.children[k + 1]; if (t && t.type === "TEXT") { ticks.push({ v: n, t }); k++; } } else if (n.type === "TEXT") extra.push(n); }
  if (ticks.length < 2) { res.skipped.push(ax.id + " ticks " + ticks.length); return; }
  for (const t of [...ticks.map((x) => x.t), ...extra]) await figma.loadFontAsync(t.fontName);
  // plan
  const plan = ticks.map((x, idx) => { const anchor = idx === 0 ? "start" : idx === ticks.length - 1 ? "end" : "middle"; let w = Math.ceil(x.t.width - 0.01); if (anchor === "middle" && w % 2 === 0) w += 1;
    const tick = anchor === "start" ? 0 : anchor === "end" ? W - 1 : Math.round(x.v.x); const gx = anchor === "start" ? 0 : anchor === "end" ? W - w : tick - (w - 1) / 2; return { ...x, anchor, w, gx }; });
  let cur = 0; for (const p of plan) { p.sp = p.gx - cur; cur = p.gx + p.w; }
  if (plan.some((p) => p.sp < 0) || cur > W) { res.skipped.push(ax.id + " overlap"); return; }
  if (OPT.mode !== "apply") { res.axes++; return; }
  await backupOf(ax);
  const strokePaint = JSON.parse(JSON.stringify(plan[0].v.strokes));
  // band wrapper
  const band = figma.createFrame(); band.name = "Band"; band.fills = []; card.insertChild(card.children.indexOf(meter), band);
  band.layoutMode = "VERTICAL"; band.itemSpacing = 8; band.setBoundVariable("itemSpacing", await V(SP8)); band.layoutSizingHorizontal = "FILL"; band.layoutSizingVertical = "HUG";
  band.appendChild(meter); meter.layoutSizingHorizontal = "FILL";
  band.appendChild(ax);
  for (const k of [...ax.children]) if (k.type !== "TEXT") k.remove();
  ax.layoutMode = "VERTICAL"; ax.itemSpacing = 4; ax.setBoundVariable("itemSpacing", await V(SP4)); ax.paddingTop = ax.paddingBottom = ax.paddingLeft = ax.paddingRight = 0;
  ax.resize(W, 44); ax.layoutSizingHorizontal = "FILL"; ax.layoutSizingVertical = "FIXED"; ax.clipsContent = false; ax.name = "Axis";
  const row = figma.createFrame(); row.name = "Ticks"; row.fills = []; ax.insertChild(0, row); row.layoutMode = "HORIZONTAL"; row.itemSpacing = 0; row.layoutSizingHorizontal = "FILL"; row.layoutSizingVertical = "HUG";
  for (const p of plan) {
    if (p.sp > 0) { const s = figma.createFrame(); s.name = "Spacer"; s.fills = []; row.appendChild(s); s.resize(p.sp, 1); s.layoutSizingHorizontal = "FIXED"; s.layoutSizingVertical = "FIXED"; }
    const g = figma.createFrame(); g.name = "Tick · " + p.t.characters; g.fills = []; row.appendChild(g); g.layoutMode = "VERTICAL"; g.itemSpacing = 4; g.setBoundVariable("itemSpacing", await V(SP4));
    g.counterAxisAlignItems = p.anchor === "start" ? "MIN" : p.anchor === "end" ? "MAX" : "CENTER"; g.resize(p.w, 26); g.layoutSizingHorizontal = "FIXED"; g.layoutSizingVertical = "HUG";
    const tk = figma.createFrame(); tk.name = "Tick"; g.appendChild(tk); tk.resize(1, 6); tk.fills = strokePaint; tk.strokes = [];
    g.appendChild(p.t); p.t.layoutPositioning = "AUTO"; p.t.textAutoResize = "HEIGHT"; p.t.layoutSizingHorizontal = "FILL"; p.t.textAlignHorizontal = p.anchor === "start" ? "LEFT" : p.anchor === "end" ? "RIGHT" : "CENTER";
  }
  for (const t of extra) { t.layoutPositioning = "AUTO"; t.layoutSizingHorizontal = "FILL"; t.textAutoResize = "HEIGHT"; }
  res.axes++;
}
const list = [];
for (const s of page.children.filter((s) => s.type === "SECTION")) for (const b of s.children.filter((c) => c.type === "FRAME" && /^Block · /.test(c.name))) for (const n of b.findAll((x) => x.type === "FRAME" && !inI(x) && isAxis(x))) list.push(n);
for (const n of list) { try { await convert(n); } catch (e) { res.errors.push(n.id + " " + e.message); if (res.errors.length > 5) break; } }
res.found = list.length;
return res;
