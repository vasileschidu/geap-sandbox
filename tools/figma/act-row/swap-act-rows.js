// SWAP_ACT_ROWS(JOBS, SPEC, OPT) — replaces captured act rows („Inițiază un postproces” cards) with the local
// „Act row” component (GEAP 🧩 Local components). Run inside use_figma: paste this file, then
//   return await SWAP_ACT_ROWS([{ block: "<Block id>", state: "gh-02j" }], SPEC, { set: "11846:340996" });
// SPEC = tools/figma/act-row/spec.json (build-spec.py from measure-act-rows.mjs) — code truth per demo state.
// Per row: variant (State Default / Menu open / Locked, Screen by width), Title / Number / Validity / Authority,
// exposed Status tag (label + Style), exposed Notice text (bold „… în curs”), exposed Menu (width, items: label,
// icon, Disabled). Rows are matched in screen order (top → bottom) per screen (Desktop / Mobile frames).
// Connectors attached inside an old row → re-pointed (menu item → a Flow anchor over the new item; button → the
// row instance with a position at the button). Returns counts + ids; never touches anything outside the rows.
const ICON16 = {
  "icon-edit": "900108c640ea6ddb92fc6a9ac05ac67392d8f310", "icon-cross-small": "3f8e0ba57dfa5f76123ad5a4285b9172f3562f41",
  "icon-copy": "19019692df35555b898043170eaafa8fb684829e", "icon-rotate-arrow": "8cdf3361fae3b611bc79a0ff4be5e664909d1ea5",
  "icon-pause": "3db9e42c1922d440a45fd45e29b7de6419f7a681", "icon-flag": "74d5fd818c70fb62cb47c276e710570948800897"
};
const SWAP_ACT_ROWS = async (JOBS, SPEC, OPT = {}) => {
  figma.skipInvisibleInstanceChildren = false;
  const set = await figma.getNodeByIdAsync(OPT.set || "11846:340996");
  const anchorMain = OPT.anchor ? await figma.getNodeByIdAsync(OPT.anchor) : null;
  const variant = (st, sc) => set.children.find(c => c.name === "State=" + st + ", Screen=" + sc);
  const defs = set.componentPropertyDefinitions; const K = n => Object.keys(defs).find(k => k.split("#")[0] === n);
  const iconCache = {}; const icon = async k => iconCache[k] ||= await figma.importComponentByKeyAsync(ICON16[k] || ICON16["icon-edit"]);
  await figma.loadFontAsync({ family: "Onest", style: "Regular" }); await figma.loadFontAsync({ family: "Onest", style: "Medium" });
  const res = [];
  for (const job of JOBS) {
    const block = await figma.getNodeByIdAsync(job.block); if (!block) { res.push({ block: job.block, err: "missing" }); continue; }
    let pg = block; while (pg.type !== "PAGE") pg = pg.parent;
    const spec = SPEC[job.state]; if (!spec) { res.push({ block: job.block, err: "no spec " + job.state }); continue; }
    const inInst = n => { let p = n.parent; while (p && p !== block) { if (p.type === "INSTANCE") return true; p = p.parent; } return false; };
    // captured rows: the stroked ≥ 330 wide ancestor of each „Inițiază un postproces” button (not inside Act row instances)
    const texts = block.findAll(n => n.type === "TEXT" && n.characters === "Inițiază un postproces");
    const rows = [];
    for (const t of texts) {
      let b = t.parent; while (b && b.type !== "INSTANCE") b = b.parent; if (!b || inInst(b)) continue;
      let r = b.parent; for (let i = 0; i < 6 && r && r !== block; i++) { if (r.width >= 330 && r.strokes && r.strokes.length) break; r = r.parent; }
      if (!r || r === block || rows.includes(r)) continue; rows.push(r);
    }
    const screenOf = r => { let p = r; while (p && p.parent !== block && !/^Screens · /.test(p.parent.name) && !/^(Desktop|Mobile)\b/.test(p.name)) p = p.parent; return p; };
    const groups = new Map(); for (const r of rows) { const s = screenOf(r); if (!groups.has(s)) groups.set(s, []); groups.get(s).push(r); }
    const conns = pg.findAllWithCriteria({ types: ["CONNECTOR"] });
    const out = { block: block.name, state: job.state, swapped: [], reattached: 0, warn: [] };
    for (const [scr, list] of groups) {
      list.sort((a, b) => a.absoluteBoundingBox.y - b.absoluteBoundingBox.y);
      for (let i = 0; i < list.length; i++) {
        const old = list[i]; const s = spec.rows[i]; if (!s) { out.warn.push("no spec row " + i); continue; }
        const [title, tagLabel, tone, meta, notice, menuSpec] = s;
        const mobile = old.width < 400;
        const st = menuSpec ? "Menu open" : notice ? "Locked" : "Default";
        const inst = variant(st, mobile ? "Mobile" : "Desktop").createInstance();
        const parent = old.parent, idx = parent.children.indexOf(old);
        // connectors attached inside the old row: remember the absolute point of their node
        const desc = new Set([old.id, ...old.findAll(() => true).map(n => n.id)]);
        const att = [];
        for (const c of conns) for (const end of ["connectorStart", "connectorEnd"]) {
          const e = c[end]; if (!e || !e.endpointNodeId || !desc.has(e.endpointNodeId)) continue;
          const n = await figma.getNodeByIdAsync(e.endpointNodeId); const bb = n.absoluteBoundingBox;
          att.push({ c, end, magnet: e.magnet, text: (n.type === "TEXT" ? n.characters : (n.findOne && (n.findOne(x => x.type === "TEXT") || {}).characters)) || "", bb });
        }
        parent.insertChild(idx, inst);
        if (parent.layoutMode && parent.layoutMode !== "NONE") inst.layoutSizingHorizontal = "FILL"; else { inst.x = old.x; inst.y = old.y; inst.resize(old.width, inst.height); }
        inst.name = "Act row · " + title;
        const p = { [K("Title")]: title, [K("Number")]: meta[0] || "", [K("Validity")]: meta[1] || "", [K("Authority")]: meta[2] || "", [K("Show validity")]: meta.length > 1, [K("Show authority")]: meta.length > 2 };
        inst.setProperties(p);
        const tag = inst.findOne(n => n.name === "Status" && n.type === "INSTANCE");
        const tl = Object.keys(tag.componentProperties).find(k => k.startsWith("⌨️ Label"));
        tag.setProperties({ "🖌️ Style": tone, [tl]: tagLabel });
        if (notice) {
          const nt = inst.findOne(n => n.name === "Notice").findOne(n => n.type === "TEXT");
          nt.characters = notice[0] + notice[1];
          nt.setRangeFontName(0, nt.characters.length, { family: "Onest", style: "Regular" });
          if (notice[0]) nt.setRangeFontName(0, notice[0].length, { family: "Onest", style: "Medium" });
        }
        let menu = null;
        if (menuSpec) {
          menu = inst.findOne(n => n.name === "Menu" && n.type === "INSTANCE");
          const items = menu.children.filter(n => /^Item \d/.test(n.name));
          for (let k = 0; k < items.length; k++) {
            const it = items[k], sp = menuSpec[1][k];
            it.visible = !!sp; if (!sp) continue;
            const ik = Object.keys(it.componentProperties);
            it.setProperties({ [ik.find(x => x.startsWith("Label"))]: sp[0], [ik.find(x => x.startsWith("Icon"))]: (await icon(sp[1])).id, "State": sp[2] ? "Disabled" : "Default" });
            const ic = it.findOne(n => n.name === "Icon"); if (ic && ic.width !== 16) ic.resize(16, 16);
          }
          // width = the longest item (code: max-content, min 180); Figma text runs a few px wider than the browser
          let need = 0;
          for (const it of menu.children) { if (!it.visible) continue; const t = it.findOne(n => n.type === "TEXT"); const ic = it.children.find(n => n.type === "INSTANCE"); need = Math.max(need, it.paddingLeft + (ic ? ic.width : 16) + it.itemSpacing + t.width + it.paddingRight); }
          menu.resize(Math.max(180, menuSpec[0], Math.ceil(need + menu.paddingLeft + menu.paddingRight)), menu.height);
          // the menu sits in the variant's auto-layout „Menu layer” (right-aligned to the pill; mobile: left) — never move it
          if (parent.layoutMode === "VERTICAL") parent.itemReverseZIndex = true;
        }
        // long titles: ellipsis with the tag right after it (title FILL) when title + 8 + tag > the title row
        const tr = inst.findOne(n => n.name === "Title and tag"), tt = tr.findOne(n => n.name === "Title");
        if (tt.width + 8 + tag.width > tr.width + 0.5) { tt.layoutSizingHorizontal = "FILL"; tt.textTruncation = "ENDING"; tt.maxLines = 1; tt.layoutSizingVertical = "HUG"; }
        // re-attach
        for (const a of att) {
          let ep = null;
          if (menu && a.text) {
            const item = menu.children.find(n => n.visible && n.findOne && (n.findOne(x => x.type === "TEXT") || {}).characters === a.text);
            if (item && anchorMain) {
              const scrNode = screenOf(inst); const anc = anchorMain.createInstance(); scrNode.appendChild(anc);
              anc.layoutPositioning = "ABSOLUTE"; anc.name = "anchor · " + a.text;
              const ib = item.absoluteBoundingBox, sb = scrNode.absoluteBoundingBox;
              anc.resize(ib.width, ib.height); anc.x = ib.x - sb.x; anc.y = ib.y - sb.y;
              ep = { endpointNodeId: anc.id, magnet: a.magnet || "LEFT" };
            }
          }
          if (!ep) { const ib = inst.absoluteBoundingBox; ep = { endpointNodeId: inst.id, position: { x: Math.min(ib.width, Math.max(0, a.bb.x + a.bb.width / 2 - ib.x)), y: Math.min(ib.height, Math.max(0, a.bb.y + a.bb.height / 2 - ib.y)) } }; }
          a.c[a.end] = ep; out.reattached++;
        }
        old.remove(); // AFTER re-pointing: Figma deletes connectors whose endpoint node is removed
        out.swapped.push([inst.id, st, mobile ? "M" : "D", Math.round(inst.height)]);
      }
    }
    res.push(out);
  }
  return res;
};
