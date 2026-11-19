// Role-context board — „Schimbă rolul” dialog block (ctx-02 / ctx-02g / ctx-05), library Modal Type=Content + Modal content / Body slot.
// Stored in figma.root shared plugin data „rctx”/„dialog” as a function source; run:
//   const F=Object.getPrototypeOf(async function(){}).constructor; const src=figma.root.getSharedPluginData("rctx","dialog");
//   return await new F("ARGS","return ("+src+")(ARGS)")(ARGS)
// ARGS = { id, title, state, note, x, y, mode: "open"|"collapsed"|"revoked" }  (clones the ctx-01 block 14607:21039 as the shell)
async function body(ARGS) {
  const g = (id) => figma.getNodeByIdAsync(id);
  await figma.setCurrentPageAsync(await g("574:29429"));
  for (const st of ["Regular", "Medium", "SemiBold"]) await figma.loadFontAsync({ family: "Onest", style: st });
  const loadText = async (n) => { for (const t of n.type === "TEXT" ? [n] : n.findAll((x) => x.type === "TEXT")) for (const s of t.getStyledTextSegments(["fontName"])) await figma.loadFontAsync(s.fontName); };
  const P = (inst, prefix) => Object.keys(inst.componentProperties).find((k) => k.split("#")[0] === prefix);
  const setP = (inst, obj) => { const o = {}; for (const [k, v] of Object.entries(obj)) { const kk = P(inst, k); if (kk) o[kk] = v; } inst.setProperties(o); };
  const IK = { "shield-user": "894e5d8993cbd24a6d987d18b565c321769d061b", "user-account": "5e99cb24765b2e7774952fc552328bf495713f9e", stamp: "e6f92697593c69faae4a0f0e46e4b55e56e57b26",
    store: "0477b91fc56e3cea293d23d0af31309aed7d6f35", people: "c1dd8806d9f0880b97d69c3b0a27b990745f8054", checklist: "d46ff3a227d4ad7b8ea3d59143af59d47fe869bf" };
  const icons = {}; const ic = async (k) => (icons[k] = icons[k] || await figma.importComponentByKeyAsync(IK[k]));
  const swapGlyph = async (av, key) => { const gl = av && av.children[0]; if (gl && gl.type === "INSTANCE") { gl.swapComponent(await ic(key)); gl.resize(20, 20); } };
  const C = { card: await g("14603:16075"), cardCur: await g("14603:16390"), togC: await g("14603:16614"), togO: await g("14603:16646"), search: await g("9285:37474"), msg: await g("9845:17947") };
  const VAR = (set, want) => set.children.find((c) => Object.entries(want).every(([k, v]) => c.name.includes(k + "=" + v)));
  const sec = await g("14595:11636");
  const blk = (await g("14607:21039")).clone(); sec.appendChild(blk); blk.name = "Block · " + ARGS.id + " · " + ARGS.title; blk.x = ARGS.x; blk.y = ARGS.y;
  const lab = blk.children[0]; lab.name = "Screen label · " + ARGS.id; await loadText(lab);
  const lt = lab.findAll((n) => n.type === "TEXT"); lt[0].characters = ARGS.id; lt[1].characters = ARGS.title;
  const link = lt.find((t) => t.name === "Link · prototype");
  if (link) link.setRangeHyperlink(0, link.characters.length, { type: "URL", value: "https://vasileschidu.github.io/geap-sandbox/e-permits-acte-permisive.html?state=" + ARGS.state });
  const note = blk.children[2]; await loadText(note); note.name = "Note · " + ARGS.id;
  const nt = note.findAll((n) => n.type === "TEXT"); nt[1].characters = ARGS.id + " · " + ARGS.title; nt[2].characters = ARGS.note;
  const scr = blk.children[1]; scr.name = "Screen · " + ARGS.id + " · desktop";
  const anc = scr.children.find((c) => /^anchor/.test(c.name)); if (anc) anc.remove();
  const menu = scr.findOne((n) => n.name === "Menu" && n.type === "INSTANCE" && n.layoutPositioning === "ABSOLUTE"); if (menu) menu.visible = false;
  const sw = scr.findOne((n) => n.name === "Instance switcher" && n.type === "INSTANCE");
  if (sw) { const k = Object.keys(sw.componentProperties).find((x) => /State/.test(x)); if (k) { try { sw.setProperties({ [k]: "Default" }); } catch (e) {} } }
  // modal
  const mset = await g("10136:657"); const mv = mset.children.find((c) => c.name === "Type=Content");
  const modal = mv.createInstance(); modal.name = "Modal · Schimbă rolul";
  setP(modal, { Title: "Schimbă rolul", Subtitle: "Alegeți rolul și subdiviziunea cu care lucrați. Drepturile din toate rolurile rămân active." });
  const footer = modal.findOne((n) => n.name === "modal--footer"); if (footer) footer.visible = false;
  const mc = modal.findOne((n) => n.name === "modal-content");
  const bodyI = mc.children.find((n) => n.type === "INSTANCE");
  try { setP(bodyI, { Spacing: "16" }); } catch (e) {}
  const slot = bodyI.findOne((n) => n.type === "SLOT");
  const add = (n) => { slot.appendChild(n); try { n.layoutSizingHorizontal = "FILL"; } catch (e) {} return n; };
  if (ARGS.mode === "revoked") {
    const m = add(C.msg.createInstance()); m.name = "Alert · revoked";
    setP(m, { Text: "Acces interzis. Combinația aleasă nu vă mai este atribuită. Lista a fost actualizată." });
  }
  // current role line: clone of a card Meta text
  const probe = C.card.createInstance(); slot.appendChild(probe);
  const metaT = probe.findAll((n) => n.type === "TEXT").find((t) => /meta/i.test(t.name) || t.characters === "Meta");
  const lineT = (metaT || probe.findAll((n) => n.type === "TEXT")[1]).clone(); await loadText(lineT);
  probe.remove(); slot.appendChild(lineT); lineT.characters = "Rol curent: Specialist · ANSP · CSP Chișinău"; lineT.name = "Current role"; lineT.layoutSizingHorizontal = "FILL";
  if (ARGS.mode !== "revoked") { const s = add(VAR(C.search, { "🎚️ State": "Default", "🎚️ Size": "Medium", "👁️ Button": "False" }).createInstance()); s.name = "Search"; setP(s, { "⌨️ Placeholder": "Caută după rol, autoritate sau subdiviziune", "👁️ Clear Button": false }); }
  const ANSP = "Agenția Națională pentru Sănătate Publică (ANSP)";
  const spec = ["user-account", "Specialist"];
  let groups;
  if (ARGS.mode === "revoked") groups = [{ title: ANSP, open: true, cards: [["Specialist ghișeu", "CSP Cahul", "store"], ["Specialist", "CSP Chișinău", "user-account", true]] }, { title: "Delegări", icon: true, open: false, cards: [["Supervizor", "x", "people"], ["Director", "x", "stamp"]] }];
  else groups = [{ title: ANSP, open: ARGS.mode === "open", current: ARGS.mode === "collapsed", cards: [["Administrator local", "", "shield-user"], ["Administrator central", "Administrația centrală", "shield-user"], ["Specialist", "CSP Bălți", "user-account"], ["Director", "CSP Chișinău", "stamp"], ["Specialist", "CSP Chișinău", "user-account", true], ["Specialist ghișeu", "CSP Chișinău", "store"], ["Supervizor", "CSP Chișinău", "people"]] },
    { title: "Agenția Națională Transport Auto (ANTA)", open: false, cards: [["Specialist", "x", "user-account"]] }]; /* ANTA = 1 role (data/bo-context.json, user „activ”) */
  const list = figma.createFrame(); list.name = "Role list"; list.layoutMode = "VERTICAL"; list.itemSpacing = 16; list.fills = []; add(list); list.layoutSizingVertical = "HUG";
  for (const gr of groups) {
    const gf = figma.createFrame(); gf.name = "Group · " + gr.title; gf.layoutMode = "VERTICAL"; gf.itemSpacing = 12; gf.fills = []; list.appendChild(gf); gf.layoutSizingHorizontal = "FILL"; gf.layoutSizingVertical = "HUG";
    const t = (gr.open ? C.togO : C.togC).createInstance(); gf.appendChild(t); t.layoutSizingHorizontal = "FILL"; t.name = "Group toggle";
    setP(t, { Title: gr.title, "Show icon": gr.icon !== false, "Show current tag": Boolean(gr.current) });
    if (!gr.open) {
      const stack = t.findOne((n) => n.name === "Stack"); const avs = stack.children.filter((n) => n.name === "Avatar"); const cnt = stack.findOne((n) => n.name === "Counter"); const n = gr.cards.length;
      for (let i = 0; i < avs.length; i++) { avs[i].visible = i < Math.min(n, 3); if (i < n) await swapGlyph(avs[i], gr.cards[i][2]); }
      cnt.visible = n > 3; if (n > 3) { const ct = cnt.findOne((x) => x.type === "TEXT"); if (ct) { await loadText(ct); ct.characters = "+" + (n - 3); } }
    } else for (const cd of gr.cards) {
      const c = (cd[3] ? C.cardCur : C.card).createInstance(); gf.appendChild(c); c.layoutSizingHorizontal = "FILL"; c.name = "Role card · " + cd[0];
      setP(c, { Role: cd[0], Meta: cd[1] || "", "Show meta": Boolean(cd[1]), "Show current tag": Boolean(cd[3]) });
      await swapGlyph(c.findOne((x) => x.type === "INSTANCE" && x.name === "avatar"), cd[2]);
    }
  }
  // overlay + fit
  const ov = figma.createFrame(); ov.name = "Overlay"; ov.layoutMode = "HORIZONTAL"; ov.primaryAxisAlignItems = "CENTER"; ov.counterAxisAlignItems = "CENTER"; ov.clipsContent = false;
  scr.appendChild(ov); ov.layoutPositioning = "ABSOLUTE"; ov.x = 0; ov.y = 0;
  const vr = await figma.variables.importVariableByKeyAsync("75e94de048cf1e8f0ef4f93f6bb9eb52519686ec");
  ov.fills = [figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", vr)];
  ov.appendChild(modal);
  const H = Math.max(900, Math.round(modal.height) + 48);
  scr.counterAxisSizingMode = "FIXED"; scr.resize(1600, H); scr.clipsContent = true;
  ov.resize(1600, H); ov.constraints = { horizontal: "STRETCH", vertical: "STRETCH" };
  return { block: blk.id, screen: scr.id, modal: modal.id, modalH: Math.round(modal.height), H, size: [Math.round(blk.width), Math.round(blk.height)], cur: P(bodyI, "Spacing") };
}
