// Role-context board (US-81 / US-82) — block builder for GEAP ↳ BO -> Application Shell, section „Context de lucru · US-81 / US-82”.
// Stored in figma.root shared plugin data „rctx”/„lib”; run: const F=Object.getPrototypeOf(async function(){}).constructor;
//   return await new F("ARGS", figma.root.getSharedPluginData("rctx","lib"))(ARGS)
// ARGS = { id, title, note, x, y, section, desktop:true, phone:bool, search:null|{state,value}, groups:[{title,icon,open,current,cards:[[role,meta,icon,current?]]}],
//          empty:bool, tooltip:null|{text} }
const g = (id) => figma.getNodeByIdAsync(id);
const page = await g("574:29429"); await figma.setCurrentPageAsync(page);
const IK = { "shield-user": "894e5d8993cbd24a6d987d18b565c321769d061b", "user-account": "5e99cb24765b2e7774952fc552328bf495713f9e", stamp: "e6f92697593c69faae4a0f0e46e4b55e56e57b26",
  store: "0477b91fc56e3cea293d23d0af31309aed7d6f35", people: "c1dd8806d9f0880b97d69c3b0a27b990745f8054", checklist: "d46ff3a227d4ad7b8ea3d59143af59d47fe869bf", logout: "832a84dbc3632827096e73dcc7557d1b08527461" };
const icons = {}; const ic = async (k) => (icons[k] = icons[k] || await figma.importComponentByKeyAsync(IK[k]));
const loadText = async (n) => { for (const t of n.type === "TEXT" ? [n] : n.findAll((x) => x.type === "TEXT")) for (const s of t.getStyledTextSegments(["fontName"])) await figma.loadFontAsync(s.fontName); };
for (const st of ["Regular", "Medium", "SemiBold"]) await figma.loadFontAsync({ family: "Onest", style: st });
const P = (inst, prefix) => Object.keys(inst.componentProperties).find((k) => k.split("#")[0] === prefix);
const setP = (inst, obj) => { const o = {}; for (const [k, v] of Object.entries(obj)) { const kk = P(inst, k); if (kk) o[kk] = v; } inst.setProperties(o); };
const C = { card: await g("14603:16075"), cardCur: await g("14603:16390"), togC: await g("14603:16614"), togO: await g("14603:16646"),
  search: await g("9285:37474"), circ: await g("8382:91415"), empty: await g("10703:1516") };
const VAR = (set, want) => set.children.find((c) => Object.entries(want).every(([k, v]) => c.name.includes(`${k}=${v}`)));
const swapGlyph = async (av, key) => { const gl = av.children[0]; if (gl && gl.type === "INSTANCE") { gl.swapComponent(await ic(key)); gl.resize(20, 20); } };
const capD = await g("14596:11237"), capP = await g("14597:11237");
const shell = (src, name) => { const f = src.clone(); for (const k of [...f.children]) k.remove(); f.name = name; try { f.minHeight = null; f.maxHeight = null; } catch (e) {} return f; };
async function screen(phone) {
  const cap = phone ? capP : capD; const W = phone ? 375 : 1440;
  const ref = await g("10256:4862");
  const scr = figma.createFrame(); scr.name = `Screen · ${ARGS.id} · ${phone ? "phone" : "desktop"}`;
  scr.layoutMode = "VERTICAL"; scr.resize(W, 100); scr.primaryAxisSizingMode = "AUTO"; scr.counterAxisSizingMode = "FIXED";
  for (const k of ["fills", "strokes", "strokeWeight", "strokeAlign", "cornerRadius", "clipsContent", "effects"]) { try { scr[k] = ref[k]; } catch (e) {} }
  if (phone) scr.cornerRadius = 24;
  // header
  if (!phone) { const h = (await g("10256:4863")).clone(); scr.appendChild(h); h.layoutSizingHorizontal = "FILL"; }
  else {
    const dh = await g("10256:4863"); const div = await g("14596:11420");
    const hdr = figma.createFrame(); hdr.name = "Header · phone"; hdr.layoutMode = "VERTICAL"; hdr.fills = JSON.parse(JSON.stringify(cap.findOne((n) => n.name === "Section").fills)); scr.appendChild(hdr); hdr.layoutSizingHorizontal = "FILL"; hdr.layoutSizingVertical = "HUG";
    const row = (n) => { const r = figma.createFrame(); r.name = n; r.layoutMode = "HORIZONTAL"; r.counterAxisAlignItems = "CENTER"; r.paddingLeft = r.paddingRight = 16; r.paddingTop = r.paddingBottom = 10; r.fills = [];
      r.strokes = JSON.parse(JSON.stringify(div.fills)); r.strokeTopWeight = r.strokeLeftWeight = r.strokeRightWeight = 0; r.strokeBottomWeight = 1; r.strokeAlign = "INSIDE"; hdr.appendChild(r); r.layoutSizingHorizontal = "FILL"; r.layoutSizingVertical = "HUG"; return r; };
    const r1 = row("Logo"); const logo = dh.findOne((n) => n.name === "-EVO-Main-Logo").clone(); r1.appendChild(logo); logo.resize(40, 40);
    const r2 = row("Product"); const pt = dh.findOne((n) => n.type === "TEXT" && n.name === "Product").clone(); await loadText(pt); r2.appendChild(pt); pt.layoutSizingHorizontal = "FILL";
  }
  const main = shell(cap.findOne((n) => n.name === "Main Content"), "Main"); scr.appendChild(main); main.layoutSizingHorizontal = "FILL"; main.layoutSizingVertical = "HUG";
  main.layoutMode = "VERTICAL"; main.counterAxisAlignItems = "CENTER"; main.primaryAxisAlignItems = "CENTER";
  const card = shell(cap.findOne((n) => n.name === "Section"), "Card"); main.appendChild(card); card.layoutSizingHorizontal = phone ? "FILL" : "FIXED"; card.layoutSizingVertical = "HUG"; card.itemSpacing = 24;
  const h1 = cap.findOne((n) => n.type === "TEXT" && /^Cu ce rol/.test(n.characters)).clone(); await loadText(h1); card.appendChild(h1);
  if (!phone) await h1.setTextStyleIdAsync("S:3a7a84f17af9b1b17bb6b59d7e5f389216e347ac,1308:639");
  if (ARGS.search) {
    const s = VAR(C.search, { "🎚️ State": ARGS.search.state || "Default", "🎚️ Size": phone ? "Large" : "Medium", "👁️ Button": "False" }).createInstance();
    card.appendChild(s); s.layoutSizingHorizontal = "FILL"; s.name = "Search";
    setP(s, { "⌨️ Placeholder": ARGS.search.value || "Caută după rol, autoritate sau subdiviziune", "👁️ Clear Button": Boolean(ARGS.search.value) });
  }
  if (ARGS.empty) { const e = C.empty.createInstance(); card.appendChild(e); e.layoutSizingHorizontal = "FILL"; setP(e, { Title: "Nicio potrivire", "Show action": false });
    const tx = e.findAll((n) => n.type === "TEXT"); for (const t of tx) if (t.characters !== "Nicio potrivire") t.visible = false; }
  if (ARGS.groups && ARGS.groups.length) {
    const list = figma.createFrame(); list.name = "Role list"; list.layoutMode = "VERTICAL"; list.itemSpacing = 16; list.fills = []; card.appendChild(list); list.layoutSizingHorizontal = "FILL"; list.layoutSizingVertical = "HUG";
    for (const gr of ARGS.groups) {
      const gf = figma.createFrame(); gf.name = "Group · " + gr.title; gf.layoutMode = "VERTICAL"; gf.itemSpacing = 12; gf.fills = []; list.appendChild(gf); gf.layoutSizingHorizontal = "FILL"; gf.layoutSizingVertical = "HUG";
      const t = (gr.open ? C.togO : C.togC).createInstance(); gf.appendChild(t); t.layoutSizingHorizontal = "FILL"; t.name = "Group toggle";
      setP(t, { Title: gr.title, "Show icon": gr.icon !== false, "Show current tag": Boolean(gr.current) });
      if (!gr.open) {
        const stack = t.findOne((n) => n.name === "Stack"); const avs = stack.children.filter((n) => n.name === "Avatar"); const cnt = stack.findOne((n) => n.name === "Counter");
        const n = gr.cards.length; for (let i = 0; i < avs.length; i++) { avs[i].visible = i < Math.min(n, 3); if (i < n) await swapGlyph(avs[i], gr.cards[i][2]); }
        cnt.visible = n > 3; if (n > 3) { const ct = cnt.findOne((x) => x.type === "TEXT"); if (ct) { await loadText(ct); ct.characters = "+" + (n - 3); } }
      } else for (const cd of gr.cards) {
        const c = (cd[3] ? C.cardCur : C.card).createInstance(); gf.appendChild(c); c.layoutSizingHorizontal = "FILL"; c.name = "Role card · " + cd[0];
        setP(c, { Role: cd[0], Meta: cd[1] || "", "Show meta": Boolean(cd[1]), "Show current tag": Boolean(cd[3]) });
        await swapGlyph(c.findOne((x) => x.type === "INSTANCE" && x.name === "avatar"), cd[2]);
      }
    }
  }
  if (ARGS.exit !== false) {
    const dv = (await g("14596:11419")).clone(); card.appendChild(dv); dv.name = "Divider"; dv.layoutSizingHorizontal = "FILL"; dv.children[0].layoutSizingHorizontal = "FILL";
    const b = VAR(C.circ, { "🖌️ Style": "Neutral", "📍 Icon": "Trailing", "🎚️ Size": "Large", "🎚️ State": "Default" }).createInstance(); card.appendChild(b); b.name = "Ieșire";
    setP(b, { "⌨️ Label": "Ieșire", "🔄 Trailing Icon: 20": (await ic("logout")).id });
  }
  return scr;
}
// block
const sec = await g(ARGS.section);
const blk = figma.createFrame(); blk.name = `Block · ${ARGS.id} · ${ARGS.name}`; blk.layoutMode = "VERTICAL"; blk.itemSpacing = 16; blk.fills = []; sec.appendChild(blk);
blk.primaryAxisSizingMode = "AUTO"; blk.counterAxisSizingMode = "AUTO"; blk.x = ARGS.x; blk.y = ARGS.y;
const lab = (await g("10256:94842")).clone(); blk.appendChild(lab); lab.name = "Screen label · " + ARGS.id; await loadText(lab);
const lt = lab.findAll((n) => n.type === "TEXT"); lt[0].characters = ARGS.id; lt[1].characters = ARGS.title;
const link = lt.find((t) => t.name === "Link · prototype"); if (link) { const url = "https://vasileschidu.github.io/geap-sandbox/e-permits-acte-permisive.html?state=" + (ARGS.state || ARGS.id); link.setRangeHyperlink(0, link.characters.length, { type: "URL", value: url }); }
const stI = lab.findOne((n) => n.name === "Status"); if (stI && stI.type === "INSTANCE") { const sset = await g("10169:188209"); stI.swapComponent(sset.children[0]); }
const row = figma.createFrame(); row.name = "Screens"; row.layoutMode = "HORIZONTAL"; row.itemSpacing = 120; row.fills = []; blk.appendChild(row); row.layoutSizingHorizontal = "HUG"; row.layoutSizingVertical = "HUG";
const out = {};
if (ARGS.desktop !== false) { const d = await screen(false); row.appendChild(d); out.desktop = d.id; }
if (ARGS.phone) { const p = await screen(true); row.appendChild(p); out.phone = p.id; }
// min heights (hug content, never shorter than the viewport)
for (const s of row.children) { const min = s.width > 600 ? 900 : 812; if (s.height < min) { s.primaryAxisSizingMode = "FIXED"; s.resize(s.width, min); const m = s.findOne((n) => n.name === "Main"); m.layoutSizingVertical = "FILL"; } }
if (ARGS.tooltip && out.desktop) {
  const d = await g(out.desktop); const first = d.findOne((n) => n.type === "INSTANCE" && /^Role card/.test(n.name));
  const tset = await g("275:24285"); const tv = tset.type === "COMPONENT_SET" ? (tset.children.find((c) => /Small/.test(c.name)) || tset.children[0]) : tset; const tip = tv.createInstance();
  d.appendChild(tip); tip.layoutPositioning = "ABSOLUTE"; const tx = tip.findOne((n) => n.type === "TEXT"); await loadText(tx); tx.characters = ARGS.tooltip.text;
  const bb = first.absoluteBoundingBox, db = d.absoluteBoundingBox; tip.x = Math.round(bb.x - db.x + 64); tip.y = Math.round(bb.y - db.y - tip.height - 4); out.tooltip = tip.id;
}
const note = (await g("10256:94850")).clone(); blk.appendChild(note); note.name = "Note · " + ARGS.id; await loadText(note); note.layoutSizingHorizontal = "FILL";
const nt = note.findAll((n) => n.type === "TEXT"); nt[0].characters = ARGS.us || "US-81"; nt[1].characters = ARGS.id + " · " + ARGS.title; nt[2].characters = ARGS.note; for (const t of nt.slice(3)) t.visible = false;
out.block = blk.id; out.size = [Math.round(blk.width), Math.round(blk.height)];
return out;
