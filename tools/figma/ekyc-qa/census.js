// eKYC BO QA — READ-ONLY census of control-like RAW frames + orphan instances (2026-10-16).
// Raw control-like = a FRAME outside instances that is painted (fill / stroke), rounded, ≤ 64 high, ≤ 640 wide, holds a
// short text and ≤ 8 descendants — i.e. something that looks like a button / input / tag / chip / pill / badge / tab.
// Orphan = an INSTANCE whose main is a LOCAL component that is not on the „🧩 Local components” page (captured copies).
// Run: new AF("__OPT", code)({ page, ex }) — returns histograms (name × size) with sample ids.
const OPT = typeof __OPT !== "undefined" ? __OPT : { page: "PAGE_ID", ex: 2 };
const page = await figma.getNodeByIdAsync(OPT.page);
await figma.setCurrentPageAsync(page);
const LOCAL_PAGE = "10687:2071";
const vis = (k) => k.visible !== false;
const pageOf = (n) => { let p = n; while (p && p.type !== "PAGE") p = p.parent; return p; };
const H = {}, O = {};
const hit = (map, key, id) => { const e = (map[key] = map[key] || { n: 0, ids: [] }); e.n++; if (e.ids.length < (OPT.ex || 2)) e.ids.push(id); };
const painted = (n) => (Array.isArray(n.fills) && n.fills.some((p) => vis(p) && p.type === "SOLID" && (p.opacity === undefined || p.opacity > 0.05))) || (Array.isArray(n.strokes) && n.strokes.some(vis) && (typeof n.strokeWeight === "number" ? n.strokeWeight : 1) > 0);
const secs = page.children.filter((s) => s.type === "SECTION" && !/How to read|Contents/i.test(s.name));
const screens = [];
for (const s of secs) for (const b of s.children.filter((c) => c.type === "FRAME" && /^Block · /.test(c.name)))
  for (const c of b.children) { if (/^Screens · /.test(c.name)) screens.push(...c.children.filter((k) => k.type === "FRAME")); else if (/^Screen · /.test(c.name)) screens.push(c); }
async function walk(n) {
  if (!vis(n)) return;
  if (n.type === "INSTANCE") {
    const m = await n.getMainComponentAsync();
    if (m && !m.remote) { const pg = pageOf(m); if (!pg || pg.id !== LOCAL_PAGE) { const set = m.parent && m.parent.type === "COMPONENT_SET" ? m.parent.name : m.name; hit(O, set.slice(0, 40) + " @" + (pg ? pg.name.slice(0, 18) : "?"), n.id); } }
    return;
  }
  if (n.type === "FRAME" && painted(n)) {
    const r = typeof n.cornerRadius === "number" ? n.cornerRadius : 1;
    if (r > 0 && n.height <= 64 && n.width <= 640 && n.height >= 14) {
      const all = n.findAll(() => true);
      const texts = all.filter((k) => k.type === "TEXT" && vis(k));
      if (all.length <= 8 && texts.length >= 1 && texts.length <= 2 && texts.every((t) => t.characters.length <= 60)) {
        const inst = all.some((k) => k.type === "INSTANCE");
        hit(H, n.name.replace(/\d+/g, "#").slice(0, 30) + " · h" + Math.round(n.height) + " r" + r + (inst ? " +inst" : ""), n.id + " „" + texts[0].characters.slice(0, 18) + "”");
      }
    }
  }
  if ("children" in n) for (const k of n.children) await walk(k);
}
for (const s of screens) for (const k of s.children) await walk(k);
const top = (m, k) => Object.entries(m).sort((a, b) => b[1].n - a[1].n).slice(0, k).map(([name, e]) => e.n + " " + name + " ← " + e.ids.join(" | "));
return { page: page.name, screens: screens.length, rawControlLike: Object.values(H).reduce((a, e) => a + e.n, 0), orphans: Object.values(O).reduce((a, e) => a + e.n, 0), raw: top(H, 30), orph: top(O, 15) };
