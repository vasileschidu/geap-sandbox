// New EVO Cabinet act-profile blocks for act-alert-card-v1 (clone of pp-01j 1069:11393, header + body from the code probe).
// Run: (fn)(SPEC) — SPEC = { id, title, note, label, src, section, h: {title, loc, acts: ["post"|"req"], num, stare, tone, m3: [label, value], auth},
//        ben: [name, idLabel, id], rows: [[label, value, kind]], authRows: [[label, value, kind]] }
async (SPEC) => {
  figma.skipInvisibleInstanceChildren = false;
  const src = await figma.getNodeByIdAsync(SPEC.src);
  const sec = await figma.getNodeByIdAsync(SPEC.section);
  const b = src.clone(); sec.appendChild(b); b.name = "Block · " + SPEC.id; b.x = src.x; b.y = 20000;
  const P = (i, name) => Object.keys(i.componentProperties).find(k => k.split("#")[0] === name);
  const lab = b.children[0], note = b.children[b.children.length - 1];
  lab.setProperties({ [P(lab, "ID")]: SPEC.id, [P(lab, "Title")]: SPEC.label });
  const link = lab.findOne(n => n.name === "Link · prototype");
  link.hyperlink = { type: "URL", value: "https://vasileschidu.github.io/geap-sandbox/cabinet-evo/index.html?state=" + SPEC.id };
  note.setProperties({ [P(note, "Title")]: SPEC.id + " · " + SPEC.label, [P(note, "Text")]: SPEC.note });
  lab.name = "Screen label · " + SPEC.id; note.name = "Note · " + SPEC.id;
  const fonts = new Set();
  for (const t of b.findAll(n => n.type === "TEXT" && !n.id.startsWith("I"))) fonts.add(JSON.stringify(t.fontName));
  for (const f of fonts) if (f && f !== "null") { try { await figma.loadFontAsync(JSON.parse(f)); } catch (e) {} }
  const H = SPEC.h;
  for (const scr of b.children.find(c => c.name.startsWith("Screens")).children) {
    const mob = scr.name.startsWith("Mobile");
    scr.name = (mob ? "Mobile · " : "Desktop · ") + SPEC.id;
    const ph = scr.findOne(n => n.name === "Page header");
    const tb = ph.findOne(n => n.name === "Title block");
    tb.children.find(c => c.name === "Title").characters = H.title;
    tb.findOne(n => n.name === "Location text").characters = H.loc;
    // actions
    const acts = ph.children.find(c => c.name === "Actions");
    const view = acts.children.find(c => c.name === "Vezi act permisiv");
    const second = acts.children.find(c => c !== view);
    const lbl = "⌨️ Label#156:0";
    if (H.acts.length === 0) second.remove();
    else {
      const k = H.acts[0];
      second.setProperties({ "📍 Icon": k === "post" ? "Trailing" : "None", [lbl]: k === "post" ? "Postprocese" : "Vezi solicitarea" });
      second.name = k === "post" ? "Postprocese" : "Vezi solicitarea";
      second.layoutSizingVertical = "FIXED"; second.resize(second.width, 40); second.layoutSizingHorizontal = "HUG";
    }
    if (mob) view.layoutSizingHorizontal = "FILL";
    // meta
    const meta = ph.children.find(c => c.name === "Meta");
    const items = meta.children.filter(c => c.name.startsWith("Meta · "));
    const num = items[0], st = items[1], m3 = items[2], au = items[3];
    const cv = num.findOne(n => n.name === "Copy value"); cv.setProperties({ [P(cv, "Value")]: H.num });
    const tag = st.findOne(n => n.name === "Tag"); tag.setProperties({ [P(tag, "⌨️ Label")]: H.stare, [P(tag, "🖌️ Style")]: H.tone });
    m3.setProperties({ [P(m3, "Label")]: H.m3[0], [P(m3, "Value")]: H.m3[1] }); m3.name = "Meta · " + H.m3[0];
    au.setProperties({ [P(au, "Value")]: H.auth });
    // body
    const panel = scr.findOne(n => n.name === "Panel");
    const ben = panel.findOne(n => n.name === "Beneficiary");
    ben.setProperties({ [P(ben, "Name")]: SPEC.ben[0], [P(ben, "ID label")]: SPEC.ben[1], [P(ben, "ID")]: SPEC.ben[2] });
    const fill = (section, spec) => {
      const rows = section.findAll(n => n.type === "INSTANCE" && n.name.startsWith("Row · "));
      rows.forEach((r, i) => {
        if (i >= spec.length) { r.visible = false; return; }
        const [l, v, kind] = spec[i];
        r.setProperties({ Kind: kind || "Text", Last: i === spec.length - 1 ? "Yes" : "No" });
        const p = { [P(r, "Label")]: l, [P(r, "Show tag")]: false };
        if ((kind || "Text") !== "Copy") p[P(r, "Value")] = v;
        r.setProperties(p); r.name = "Row · " + l; r.visible = true;
        if (kind === "Copy") { const c = r.findOne(n => n.name === "Copy value"); if (c) c.setProperties({ [P(c, "Value")]: v }); }
      });
    };
    fill(panel.children.find(c => c.name === "Section · Detalii act"), SPEC.rows);
    fill(panel.children.find(c => c.name === "Section · Autoritatea emitentă"), SPEC.authRows);
  }
  return b.id;
}
