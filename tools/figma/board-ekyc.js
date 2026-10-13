// __board-ekyc — board builder for the eKYC file (stored text node 10169:964). Synced 2026-10-13 (PAD 80, page header title + stories, TOC 80).
// Run: new AF("MODE", "ARG", code)("block", { items: [{ screen, id, title, state, note, status, band }] })
//  or  new AF("MODE", "ARG", code)("layout", { title, stories, how, bands: [{ id, name, desc, cols: [[blockId…]…] }], x0, y0 }).

    // __board-ekyc (repo: tools/figma/board-ekyc.js). MODE "block": ARG = { items: [{ screen, id, title, state, note, status, band }] } → wraps each screen
    // into „Block · <id> · <title>” (Screen label: ID chip · title · Status · „Prototype ↗” + screen + Note) inside the band section.
    // MODE "layout": ARG = { bands: [{ id, name, desc, cols: [[blockId…]…] }], x0, y0 } → band sections (white, header, columns 240 apart,
    // blocks 240 apart), sections 400 apart in a row, then the „Cum se citește · Cuprins” TOC section left of them.
    const g = (id) => figma.getNodeByIdAsync(id);
    for (const f of ["Regular", "Medium", "SemiBold"]) await figma.loadFontAsync({ family: "Onest", style: f });
    const VK = { bg: "ec2921da40a6853a80b0d299be5bc8b1a11fcc89", border: "9fa253aab4b44e39a049a0cbbd163e4c61e129b6", brand: "7104dc11afe3b34f5529876133c95b3be65ee87e", inv: "c6263eb190b34c3063061b7cfb0f8e516bdb4be5", text: "c37576ba1791b00ac80a9a55579913b69d0b8b8f", text2: "5d1a031c4c310a753a2c49f91c89db7ddb8a2287", text3: "9d5ad1d87c1c1e2a9f94a242896a7882a20eda3f", bg2: "2099ba93803f67f67cdcf9153fc08965f5e32f65", tbrand: "0e3dbef907f67c87aa26db90914a7a9fe1a60591" };
    const V = {};for (const [k, key] of Object.entries(VK)) {try {V[k] = await figma.variables.importVariableByKeyAsync(key);} catch (e) {V[k] = null;}}
    const paint = (v, fb) => v ? figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 1, g: 1, b: 1 } }, "color", v) : { type: "SOLID", color: fb || { r: 0, g: 0.35, b: 0.82 } };
    const TSK = { h2: "5efe3a2cf8678d3a30f6fd88b1af8e7343507863", h4: "6437d48337bf6d1b766873db20b097b9b08cabf4", bs: "1f35541006807f80d766d8eb6ef5ae95d4f5cf6e", bs5: "057521fde838188af42abf69eb3789f676421047", bd: "392200dc0245a58de37af35126f75e6aba9c1fd7", bd5: "e069d3c303536b6b965b5e68074b3200d638b7b3" };
    const S = {};for (const [k, key] of Object.entries(TSK)) {S[k] = await figma.importStyleByKeyAsync(key);await figma.loadFontAsync(S[k].fontName);}
    const txt = async (s, st, v, name) => {const t = figma.createText();await t.setTextStyleIdAsync(S[st].id);t.characters = s;t.fills = [paint(V[v])];if (name) t.name = name;return t;};
    const URL = (st) => "https://vasileschidu.github.io/geap-sandbox/e-permits-acte-permisive.html?state=" + st;
    const STATUS = await g("10158:813");
    const TAG = await figma.importComponentSetByKeyAsync("a97109f9ebf668fb7616cb37e46929fc75ed9070");
    const page = figma.currentPage;
    const bandSec = (id) => page.children.find((n) => n.type === "SECTION" && n.name.startsWith(id + " · "));
    if (MODE === "block") {
      const out = [];
      for (const it of ARG.items) {
        const scr = await g(it.screen);if (!scr) {out.push(it.id + " missing");continue;}
        let blk = page.findOne((n) => n.type === "FRAME" && n.name.startsWith("Block · " + it.id + " · "));
        if (blk) {const old = blk.children.find((k) => k.name.startsWith("Ecran · "));if (old && old !== scr) old.remove();} else
        {
          blk = figma.createAutoLayout("VERTICAL", { name: "Block · " + it.id + " · " + it.title });blk.fills = [];blk.itemSpacing = 16;blk.clipsContent = false;
          const lab = figma.createAutoLayout("HORIZONTAL", { name: "Screen label · " + it.id });lab.fills = [];lab.itemSpacing = 12;lab.counterAxisAlignItems = "CENTER";blk.appendChild(lab);
          const chip = figma.createAutoLayout("HORIZONTAL", { name: "ID" });chip.fills = [paint(V.brand)];chip.cornerRadius = 8;chip.paddingTop = chip.paddingBottom = 4;chip.paddingLeft = chip.paddingRight = 12;lab.appendChild(chip);
          chip.appendChild(await txt(it.id, "bs5", "inv", it.id));
          lab.appendChild(await txt(it.title, "h4", "text", "Titlu"));
          const stv = STATUS.children.find((c) => c.name === "Status=" + (it.status || "In development")) || STATUS.children[0];const si = stv.createInstance();si.name = "Status";lab.appendChild(si);
          const link = await txt("Prototype ↗", "bs", "text3", "Link · prototip");lab.appendChild(link);
          const note = figma.createAutoLayout("VERTICAL", { name: "Note · " + it.id });note.fills = [paint(V.bg2)];note.cornerRadius = 16;note.paddingTop = note.paddingBottom = note.paddingLeft = note.paddingRight = 24;note.itemSpacing = 12;
          const tg = TAG.children.find((c) => /Type=Strong/.test(c.name) && /Style=Neutral/.test(c.name) && /Icon=None/.test(c.name) && /Size=Medium/.test(c.name)).createInstance();tg.setProperties({ [Object.keys(tg.componentProperties).find((k) => k.startsWith("⌨️ Label"))]: "NOTE DEV / PM" });note.appendChild(tg);
          const nt = await txt(it.id + " · " + it.title, "h4", "text", "Titlu notă");note.appendChild(nt);nt.layoutSizingHorizontal = "FILL";nt.textAutoResize = "HEIGHT";
          const nb = await txt(it.note || "", "bs", "text2", "Text notă");note.appendChild(nb);nb.layoutSizingHorizontal = "FILL";nb.textAutoResize = "HEIGHT";
          blk.appendChild(note);
        }
        const lab = blk.children[0];const note = blk.children[blk.children.length - 1];
        const tt = lab.findOne((n) => n.name === "Titlu");tt.characters = it.title;const idt = lab.findOne((n) => n.parent && n.parent.name === "ID" && n.type === "TEXT");idt.characters = it.id;
        const link = lab.findOne((n) => n.name === "Link · prototip");link.hyperlink = { type: "URL", value: URL(it.state) };
        const si = lab.findOne((n) => n.name === "Status");const stv = STATUS.children.find((c) => c.name === "Status=" + (it.status || "In development"));if (stv && si.mainComponent !== stv) si.swapComponent(stv);
        note.findOne((n) => n.name === "Titlu notă").characters = it.id + " · " + it.title;note.findOne((n) => n.name === "Text notă").characters = it.note || "";
        blk.insertChild(1, scr);scr.name = "Ecran · " + it.id + " · " + it.state;scr.layoutPositioning = "AUTO";
        note.layoutSizingHorizontal = "FIXED";note.resize(scr.width, note.height);
        blk.name = "Block · " + it.id + " · " + it.title;
        const sec = it.band ? bandSec(it.band) : null;if (sec && blk.parent !== sec) sec.appendChild(blk);
        out.push(it.id + " " + blk.id);
      }
      return out;
    }
    if (MODE === "layout") {
      const res = [];let x = ARG.x0 || 0;const y0 = ARG.y0 || 0;const PAD = 80, GAP = 240, HEAD = 122; /*PAGEHDR*/const blocks = page.findAll((n) => n.type === "FRAME" && n.name.startsWith("Block · "));
      const byId = (id) => blocks.find((b) => b.name.startsWith("Block · " + id + " · "));
      const toc = [];
      for (const band of ARG.bands) {
        let sec = bandSec(band.id);if (!sec) {sec = figma.createSection();page.appendChild(sec);}
        sec.name = band.id + " · " + band.name;sec.fills = [paint(V.bg)];
        let hd = sec.children.find((n) => n.name.startsWith("Band "));if (!hd) {
          hd = figma.createAutoLayout("VERTICAL", { name: "Band" });hd.fills = [paint(V.bg)];hd.strokes = [paint(V.border)];hd.strokeWeight = 1;hd.cornerRadius = 16;hd.paddingTop = hd.paddingBottom = 24;hd.paddingLeft = hd.paddingRight = 32;hd.itemSpacing = 8;sec.appendChild(hd);
          const row = figma.createAutoLayout("HORIZONTAL", { name: "Title" });row.fills = [];row.itemSpacing = 12;row.counterAxisAlignItems = "CENTER";hd.appendChild(row);
          const chip = figma.createAutoLayout("HORIZONTAL", { name: "ID" });chip.fills = [paint(V.brand)];chip.cornerRadius = 8;chip.paddingTop = chip.paddingBottom = 4;chip.paddingLeft = chip.paddingRight = 12;row.appendChild(chip);
          chip.appendChild(await txt(band.id, "bs5", "inv", "id"));row.appendChild(await txt(band.name, "h2", "text", "name"));hd.appendChild(await txt(band.desc || "", "bd", "text2", "desc"));}
        hd.name = "Band " + band.id + " · " + band.name;hd.findOne((n) => n.name === "id").characters = band.id;hd.findOne((n) => n.name === "name").characters = band.name;hd.findOne((n) => n.name === "desc").characters = band.desc || "";
        let cx = PAD,maxH = 0;const list = [];
        for (const col of band.cols) {let cy = PAD + HEAD + 120;let w = 0;for (const id of col) {const b = byId(id);if (!b) {res.push("missing " + id);continue;}if (b.parent !== sec) sec.appendChild(b);b.x = cx;b.y = cy;cy += b.height + GAP;w = Math.max(w, b.width);list.push({ id, b });}maxH = Math.max(maxH, cy - GAP);cx += w + GAP;}
        const W = Math.max(cx - GAP + PAD, 1600);hd.x = PAD;hd.y = PAD;hd.resize(W - 2 * PAD, hd.height);hd.primaryAxisSizingMode = "AUTO";
        for (const k of hd.children) {if (k.type === "TEXT") {k.layoutSizingHorizontal = "FILL";k.textAutoResize = "HEIGHT";}}
        sec.x = x;sec.y = y0;sec.resizeWithoutConstraints(W, maxH + PAD);
        x += W + 400;toc.push({ band, sec, hd, list });res.push(band.id + " " + sec.id);
      }
      // TOC
      let ts = page.children.find((n) => n.type === "SECTION" && n.name === "Cum se citește · Cuprins");if (!ts) {ts = figma.createSection();page.appendChild(ts);ts.name = "Cum se citește · Cuprins";}
      ts.fills = [paint(V.bg)];for (const k of [...ts.children]) k.remove();
      const how = figma.createAutoLayout("VERTICAL", { name: "How to read" });how.fills = [paint(V.bg)];how.strokes = [paint(V.border)];how.strokeWeight = 1;how.cornerRadius = 16;how.paddingTop = how.paddingBottom = 24;how.paddingLeft = how.paddingRight = 32;how.itemSpacing = 8;ts.appendChild(how);
      if (ARG.title) how.appendChild(await txt(ARG.title, "h2", "text", "Titlu pagină")); if (ARG.stories) how.appendChild(await txt("Stories acoperite: " + ARG.stories, "bd5", "tbrand", "Stories")); how.appendChild(await txt("Cum se citește", "h4", "text"));const ht = await txt(ARG.how || "", "bd", "text2");how.appendChild(ht);
      const cup = figma.createAutoLayout("VERTICAL", { name: "Cuprinsul paginii" });cup.fills = [paint(V.bg)];cup.strokes = [paint(V.border)];cup.strokeWeight = 1;cup.cornerRadius = 16;cup.paddingTop = cup.paddingBottom = cup.paddingLeft = cup.paddingRight = 24;cup.itemSpacing = 24;ts.appendChild(cup);
      cup.appendChild(await txt("Cuprinsul paginii", "h4", "text"));cup.appendChild(await txt("Clic pe o coloană sau pe un ecran ca să ajungi direct la el. Coloanele sunt în ordinea fluxului.", "bd", "text2"));
      const cols = figma.createAutoLayout("HORIZONTAL", { name: "Coloane" });cols.fills = [];cols.layoutWrap = "WRAP";cols.itemSpacing = 32;cols.counterAxisSpacing = 32;cup.appendChild(cols);
      for (const c of toc) {
        const cc = figma.createAutoLayout("VERTICAL", { name: "Coloana · " + c.band.id + " · " + c.band.name });cc.fills = [];cc.itemSpacing = 6;cols.appendChild(cc);cc.resize(340, cc.height);cc.counterAxisSizingMode = "FIXED";
        const h = await txt(c.band.id + " · " + c.band.name + "  ·  " + c.list.length + " ecrane", "bd5", "tbrand");h.hyperlink = { type: "NODE", value: c.hd.id };cc.appendChild(h);h.layoutSizingHorizontal = "FILL";h.textAutoResize = "HEIGHT";
        for (const it of c.list) {const nm = it.b.name.replace(/^Block · /, "");const t = await txt(nm, "bs", "tbrand");t.hyperlink = { type: "NODE", value: it.b.id };cc.appendChild(t);t.layoutSizingHorizontal = "FILL";t.textAutoResize = "HEIGHT";}
      }
      const TW = 340 * 5 + 32 * 4 + 48;how.resize(TW, how.height);how.primaryAxisSizingMode = "AUTO";for (const k of how.children) if (k.type === "TEXT") { k.layoutSizingHorizontal = "FILL"; k.textAutoResize = "HEIGHT"; }cup.resize(TW, cup.height);cup.primaryAxisSizingMode = "AUTO";cols.layoutSizingHorizontal = "FILL";for (const k of cup.children) if (k.type === "TEXT") {k.layoutSizingHorizontal = "FILL";k.textAutoResize = "HEIGHT";}
      how.x = 80; how.y = 80; cup.x = 80; cup.y = 80 + how.height + 40;ts.resizeWithoutConstraints(TW + 160, cup.y + cup.height + 80);ts.x = (ARG.x0 || 0) - ts.width - 400;ts.y = y0;
      res.push("toc " + ts.id);return res;
    }
