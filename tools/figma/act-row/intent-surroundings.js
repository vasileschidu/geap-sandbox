// SURROUND(BLOCKS, OPT) — the „Ce vrei să soliciți?” / „Ce se solicită?” body around the act rows, per block:
//  1. the captured „Solicitare nouă” card → local „New request card” (State=Default) instance, Title / Text props
//     from the captured texts, same index, FILL;
//  2. the „sau” divider: the two 1px line frames FILL + border/base/default, the row counter-aligned CENTER;
//  3. every text outside instances in the body → Foundations text style by size / weight (TOKENIZE rule; mobile
//     bodies < 400 wide use the Mobile headings);
//  4. reports raw vectors left outside instances (must be 0) and IMAGE fills (must be 0).
// OPT = { dry: true } → counts only. Run per page (one use_figma call): paste + `return await SURROUND([...], {})`.
const TSK = { cm: "8d8e3878d547d107cf6de81a24255f71485db63f", cm5: "f28b7696292db20f926d7897d94e584ceb392ceb", bs: "1f35541006807f80d766d8eb6ef5ae95d4f5cf6e", bs5: "057521fde838188af42abf69eb3789f676421047", bd: "392200dc0245a58de37af35126f75e6aba9c1fd7", bd5: "e069d3c303536b6b965b5e68074b3200d638b7b3", h5: "75e7dfdca13a793cb25b8e6cb5949ad59c850c85", h4: "6437d48337bf6d1b766873db20b097b9b08cabf4", h3: "baf5f0238882e79bcbabaffcb185862f572c5bcf", h2: "5efe3a2cf8678d3a30f6fd88b1af8e7343507863", mh1: "67a58071b24c3d987cfa512cd21ea553b94fb1fe", mh4: "47680a7a1dbc31b424527363885d6fcaec37c88e", mh5: "275607150544ddbd2d097c727da7f0baaaf7d7fe" };
const SURROUND = async (BLOCKS, OPT = {}) => {
  figma.skipInvisibleInstanceChildren = false;
  const cardSet = await figma.getNodeByIdAsync(OPT.card || "11848:340913");
  const cardV = cardSet.children.find(c => c.name === "State=Default");
  const cdefs = cardSet.componentPropertyDefinitions; const CK = n => Object.keys(cdefs).find(k => k.split("#")[0] === n);
  const SS = {}; const gst = async k => SS[k] ||= await figma.importStyleByKeyAsync(TSK[k]);
  const W = s => /Bold|SemiBold|Semi Bold/.test(s) ? 600 : /Medium/.test(s) ? 500 : 400;
  const styleFor = (size, wt, mob) => mob && wt >= 600 && size >= 16 ? (size >= 30 ? "mh1" : size >= 17 ? "mh4" : "mh5") : size <= 12 ? (wt >= 500 ? "cm5" : "cm") : size <= 14 ? (wt >= 500 ? "bs5" : "bs") : size <= 16 ? (wt >= 600 ? "h5" : wt >= 500 ? "bd5" : "bd") : size <= 20 ? "h4" : size <= 24 ? "h3" : size <= 32 ? "h2" : null;
  const cols = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync(); let borderVar = null;
  for (const c of cols) { if (borderVar || !/Foundations/.test(c.libraryName)) continue; const vs = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(c.key); const f = vs.find(v => v.name === "border/base/default"); if (f) borderVar = await figma.variables.importVariableByKeyAsync(f.key); }
  const res = [];
  for (const id of BLOCKS) {
    const block = await figma.getNodeByIdAsync(id); const out = { block: block.name, cards: 0, lines: 0, texts: 0, rawVectors: [], images: 0 };
    const inInst = n => { let p = n.parent; while (p && p !== block) { if (p.type === "INSTANCE") return true; p = p.parent; } return false; };
    const h1s = block.findAll(n => n.type === "TEXT" && /^Ce (vrei să soliciți|se solicită)\?$/.test(n.characters) && !inInst(n));
    for (const h1 of h1s) {
      // body = the nearest ancestor that also holds the „Acte emise …” title
      let body = h1.parent; while (body && body !== block && !body.findOne(n => n.type === "TEXT" && /^Acte emise pentru/.test(n.characters))) body = body.parent;
      if (!body || body === block) { out.warn = "no body"; continue; }
      const mob = body.width < 400;
      // 1. card
      for (const t of body.findAll(n => n.type === "TEXT" && n.characters === "Solicitare nouă" && !inInst(n))) {
        let card = t.parent; while (card && card !== body && !(card.width >= 300 && card.height >= 56 && card.height <= 120 && card.fills && card.fills.length && card.fills[0].type === "SOLID")) card = card.parent;
        if (!card || card === body) continue;
        const txts = card.findAll(n => n.type === "TEXT").map(n => n.characters);
        const text = txts.find(x => x !== "Solicitare nouă") || "Depui o cerere pentru un act nou";
        out.cards++; if (OPT.dry) continue;
        const inst = cardV.createInstance(); const par = card.parent; par.insertChild(par.children.indexOf(card), inst);
        if (par.layoutMode && par.layoutMode !== "NONE") inst.layoutSizingHorizontal = "FILL"; else { inst.x = card.x; inst.y = card.y; inst.resize(card.width, inst.height); }
        inst.setProperties({ [CK("Title")]: "Solicitare nouă", [CK("Text")]: text }); inst.name = "New request card";
        // connectors attached to the card (or inside it) → the instance, BEFORE removing (Figma deletes them otherwise)
        const desc = new Set([card.id, ...card.findAll(() => true).map(n => n.id)]);
        let pg = block; while (pg.type !== "PAGE") pg = pg.parent;
        for (const c of pg.findAllWithCriteria({ types: ["CONNECTOR"] })) for (const end of ["connectorStart", "connectorEnd"]) {
          const e = c[end]; if (!e || !e.endpointNodeId || !desc.has(e.endpointNodeId)) continue;
          c[end] = e.magnet && e.magnet !== "NONE" ? { endpointNodeId: inst.id, magnet: e.magnet } : { endpointNodeId: inst.id, position: { x: inst.width, y: inst.height / 2 } }; out.reattached = (out.reattached || 0) + 1;
        }
        card.remove();
      }
      // 2. divider
      for (const t of body.findAll(n => n.type === "TEXT" && n.characters === "sau" && !inInst(n))) {
        let row = t.parent; while (row && row !== body && !(row.layoutMode === "HORIZONTAL" && row.width >= 300)) row = row.parent;
        if (!row || row === body) continue;
        for (const l of row.children.filter(c => c.type !== "TEXT" && c.height <= 1.5 && !(c.findOne && c.findOne(n => n.type === "TEXT")))) {
          out.lines++; if (OPT.dry) continue;
          l.layoutSizingHorizontal = "FILL"; l.name = "Line";
          if (borderVar) l.fills = [figma.variables.setBoundVariableForPaint(figma.util.solidPaint("#D9D9D9"), "color", borderVar)];
        }
        if (!OPT.dry) {
          row.counterAxisAlignItems = "CENTER"; row.name = "Divider · sau";
          // older captures: a bare „sau” row without the two ::before / ::after lines → add them (gap 20, 1px, FILL)
          if (!row.children.some(c => c.name === "Line") && borderVar) {
            const g20 = await figma.variables.importVariableByKeyAsync("8bad70ea75e00f6c6994b2793ccf4c1ee91d0e8c"); row.setBoundVariable("itemSpacing", g20);
            const mk = i => { const l = figma.createFrame(); l.name = "Line"; row.insertChild(i, l); l.resize(10, 1); l.layoutSizingHorizontal = "FILL"; l.layoutSizingVertical = "FIXED"; l.fills = [figma.variables.setBoundVariableForPaint(figma.util.solidPaint("#D9D9D9"), "color", borderVar)]; };
            mk(0); mk(row.children.length); t.layoutSizingHorizontal = "HUG"; out.lines += 2;
          }
        }
      }
      // 3. texts
      for (const t of body.findAll(n => n.type === "TEXT" && !inInst(n))) {
        const segs = t.getStyledTextSegments(["fontSize", "fontName", "textStyleId"]);
        for (const s of segs) { if (s.textStyleId) continue; const k = styleFor(s.fontSize, W(s.fontName.style), mob); if (!k) continue; out.texts++; if (OPT.dry) continue;
          const st = await gst(k); await figma.loadFontAsync(st.fontName); await t.setRangeTextStyleIdAsync(s.start, s.end, st.id); }
      }
      // 4. leftovers
      for (const v of body.findAll(n => (n.type === "VECTOR" || n.type === "BOOLEAN_OPERATION") && !inInst(n))) out.rawVectors.push(v.id + " " + v.parent.name);
      out.images += body.findAll(n => !inInst(n) && n.fills && n.fills !== figma.mixed && n.fills.some(f => f.type === "IMAGE")).length;
    }
    res.push(out);
  }
  return res;
};
