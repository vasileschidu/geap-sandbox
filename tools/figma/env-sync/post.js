// env-sync post pass (2026-11-18, key-based). Stored in figma.root shared plugin data „envs”/„post”.
// Run: const POST = new Function("return " + figma.root.getSharedPluginData("envs","post"))(); await POST(OP, ARGS)
//   "pre"  {cap}     BEFORE LIB("screen"): radio labels → library radio-label (the screen op would read the 20 px circle as
//                    a checkbox and drop the text), textarea field → library text-area (label, star, hint, counter), inline
//                    step inputs → library text-input (label off)
//   "post" {screen}  AFTER LIB("screen"): dialog → GEAP Modal Type=Content (content cloned into the Body slot, footer
//                    buttons Medium), scrim bound to overlay-dark, sort header labels, „Vezi în Audit & Logging” → Neutral
//                    Small button, activity object names → links, batch toggles → svc/stack-group-header (+ meta lines),
//                    GRID tracks rounded (whole px)
async (OP, A = {}) => {
  figma.skipInvisibleInstanceChildren = false;
  const g = (id) => figma.getNodeByIdAsync(id);
  const KS = {}, KC = {}, VV = {}, SS = {};
  const ks = async (k) => (KS[k] = KS[k] || (await figma.importComponentSetByKeyAsync(k)));
  const kc = async (k) => (KC[k] = KC[k] || (await figma.importComponentByKeyAsync(k)));
  const vk = async (k) => (VV[k] = VV[k] || (await figma.variables.importVariableByKeyAsync(k)));
  const sk = async (k) => (SS[k] = SS[k] || (await figma.importStyleByKeyAsync(k)));
  const K = { radio: "513e56108ce8f11caec41350386e3662ac05d004", area: "b9326acb41b6b6cdb42bbbab753e2c0279107520", input: "f035f11544e0883bc29ca99b48309238db82edf8", modal: "9e3894b2f7144351f232578666c651c7b97660fa", rect: "2cbe2c350e7c6b3948dc449660ede8355511c384", group: "d8b1af4ecb4c21c15f176242197659e554a8a4f9", tag: "a97109f9ebf668fb7616cb37e46929fc75ed9070" };
  const VAR = { scrim: "7d8a710deec8a41a491fdcfc27dbc6f88701213d", overlay: "75e94de048cf1e8f0ef4f93f6bb9eb52519686ec", brand: "0e3dbef907f67c87aa26db90914a7a9fe1a60591" };
  const BS5 = "057521fde838188af42abf69eb3789f676421047";
  const V = (set, want) => set.children.find((c) => Object.entries(want).every(([k, v]) => c.name.includes(`${k}=${v}`)));
  const pk = (i, pre) => Object.keys(i.componentProperties).find((k) => k.startsWith(pre));
  const setP = (i, pre, val) => { const k = pk(i, pre); if (k) { try { i.setProperties({ [k]: val }); } catch (e) {} } return k; };
  const inInst = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
  const texts = (n) => (!n || n.removed ? [] : n.type === "TEXT" ? [n] : n.findAll ? n.findAll((x) => x.type === "TEXT" && x.visible !== false) : []);
  const textOf = (n) => texts(n).filter((x) => !x.removed).map((x) => x.characters).join(" ").replace(/\s+/g, " ").trim();
  const lf = async (t) => { for (const s of t.getStyledTextSegments(["fontName"])) await figma.loadFontAsync(s.fontName); };
  const setText = async (t, s) => { await lf(t); t.characters = s; };
  const paint = async (k) => [figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", await vk(k))];
  const place = (old, inst, fill) => { const p = old.parent, i = p.children.indexOf(old); p.insertChild(i, inst); if (p.layoutMode && p.layoutMode !== "NONE" && old.layoutPositioning !== "ABSOLUTE") { if (fill) { try { inst.layoutSizingHorizontal = "FILL"; } catch (e) {} } } else { inst.x = old.x; inst.y = old.y; } if (p.layoutMode === "GRID") { try { inst.setGridChildPosition(old.gridRowAnchorIndex, old.gridColumnAnchorIndex); } catch (e) {} } old.remove(); return inst; };
  const light = (t) => { const f = t && t.fills && t.fills[0]; return f && f.color && f.color.r > 0.55 && f.color.g > 0.55; };
  const done = {}; const D = (k) => (done[k] = (done[k] || 0) + 1); const un = [];
  if (OP === "pre") {
    const cap = await g(A.cap);
    // radio labels (circle 20 = r10, text = label + description)
    for (const lab of cap.findAll((n) => n.type === "FRAME" && /^Label/.test(n.name) && n.children.length === 2 && Math.round(n.children[0].width) === 20 && Math.round(n.children[0].height) === 20 && n.children[0].cornerRadius >= 9)) {
      const box = lab.children[0]; const tx = texts(lab.children[1]); const on = box.findAll((x) => x.type !== "TEXT").some((x) => x.width <= 12 && x.width >= 6) || (box.strokeWeight >= 5);
      const dis = light(tx[0]) || (lab.opacity < 1);
      const set = await ks(K.radio); const v = V(set, { Mode: on ? "Selected" : "Unselected", State: dis ? "Disabled" : "Default", Size: "Small", "Supporting Text": tx.length > 1 ? "True" : "False" }) || V(set, { Mode: on ? "Selected" : "Unselected", Size: "Small" });
      const i = v.createInstance(); setP(i, "⌨️ Label", tx[0] ? tx[0].characters : ""); if (tx[1]) setP(i, "⌨️ Supporting Text", tx[1].characters); i.name = "radio · " + (tx[0] ? tx[0].characters : ""); place(lab, i); D("radio");
    }
    // textarea field: Container(Label row · Container(Text Area) · hint row) → library text-area
    for (const ta of cap.findAll((n) => n.type === "FRAME" && /^Text Area/.test(n.name))) {
      let field = ta; for (let k = 0; k < 3 && field.parent; k++) { field = field.parent; if (field.children.length >= 2 && /^Label/.test(field.children[0].name)) break; }
      if (!/^Label/.test(field.children[0].name)) { un.push("textarea field " + ta.id); continue; }
      const labT = texts(field.children[0])[0]; const star = !!field.children[0].findOne((x) => /obligatoriu|Icon/.test(x.name)); const hintRow = field.children[field.children.length - 1]; const ht = texts(hintRow);
      const val = textOf(ta); const red = (n) => n && (n.strokes || []).some((s) => s.color && s.color.r > 0.7 && s.color.g < 0.4); const err = red(ta) || red(ta.parent) || field.children.length > 3;
      const set = await ks(K.area); const v = V(set, { Style: err ? "Destructive" : "Default", State: val ? "Filled" : "Default", Size: "Medium" }) || V(set, { Style: "Default", State: "Default" });
      const i = v.createInstance(); setP(i, "👁️ Label", true); setP(i, "👁️ Mandatory Star", star); setP(i, "⌨️ Placeholder", val || ""); setP(i, "👁️ Assistive Text", ht.length > 0); setP(i, "👁️ Character Counter", ht.length > 1); if (ht.length > 1) setP(i, "⌨️ Character Counter", ht[ht.length - 1].characters);
      const iT = i.findAll((x) => x.type === "TEXT"); const lt = iT.find((x) => /label/i.test(x.name) || /^Label$/.test(x.characters)); if (lt && labT) await setText(lt, labT.characters);
      const at = iT.find((x) => /assistive|helper|hint/i.test(x.name) || /^Assistive/.test(x.characters)); if (at && ht[0]) await setText(at, ht[0].characters);
      i.name = "textarea · " + (labT ? labT.characters : ""); place(field, i, true); D("textarea");
    }
    // inline inputs (table step reason) → text-input, label + hint off
    for (const ti of cap.findAll((n) => n.type === "FRAME" && /^Text Input/.test(n.name))) {
      if (ti.removed) continue; const wrap = ti.parent && ti.parent.strokes && ti.parent.strokes.length && ti.parent.children.length === 1 ? ti.parent : ti; const ph = textOf(ti);
      const set = await ks(K.input); const v = V(set, { State: "Default", Size: "Medium" }) || set.defaultVariant; const i = v.createInstance();
      setP(i, "👁️ Label", false); setP(i, "👁️ Assistive Text", false); setP(i, "👁️ Mandatory Star", false); setP(i, "⌨️ Placeholder", ph); i.name = "input · " + ph.slice(0, 30); place(wrap, i, true); D("input");
    }
    return { done, un };
  }
  if (OP === "post") {
    const scr = await g(A.screen); const rect = await ks(K.rect);
    // dialog → GEAP Modal Type=Content
    const ov = scr.findOne((n) => n.name === "Overlay");
    if (ov) {
      ov.fills = await paint(VAR.scrim); D("scrim");
      const dl = ov.findOne((n) => n.name === "Dialog");
      if (dl) {
        const head = dl.children.find((c) => /^Heading/.test(c.name)); const bodyC = dl.children.find((c) => c.name === "Container" && c.height > 100); const foot = dl.children.filter((c) => c.name === "Container" && c !== bodyC).pop();
        const ms = await ks(K.modal); const m = V(ms, { Type: "Content" }).createInstance(); ov.appendChild(m);
        const ht = head ? texts(head) : []; setP(m, "Title", ht[0] ? ht[0].characters : ""); if (ht[1]) setP(m, "Subtitle", ht[1].characters); else { const st = m.findOne((x) => x.type === "TEXT" && x.name === "Subtitlu"); if (st) st.visible = false; }
        m.resize(Math.round(dl.width), m.height);
        const content = m.findOne((x) => x.type === "INSTANCE" && x.name === "Content"); setP(content, "Spacing", "0");
        const slot = content && content.findOne((x) => x.type === "SLOT");
        const inner = bodyC && bodyC.children.length === 1 ? bodyC.children[0] : bodyC;
        if (slot && inner) { const cl = inner.clone(); slot.appendChild(cl); try { cl.layoutSizingHorizontal = "FILL"; } catch (e) {} D("modal-content"); } else un.push("modal slot");
        const fb = foot ? foot.findAll((x) => x.type === "FRAME" && /^Button/.test(x.name)).map(textOf) : [];
        const mb = m.findAll((x) => x.type === "INSTANCE" && /^btn · /.test(x.name));
        mb.forEach((b, k) => { const label = fb[k] || fb[fb.length - 1]; if (!label) { b.visible = false; return; } try { b.setProperties({ "🎚️ Size": "Medium" }); } catch (e) {} setP(b, "⌨️ Label", label); });
        if (fb.length === 1 && mb.length > 1) { mb[0].visible = false; setP(mb[1], "⌨️ Label", fb[0]); }
        ov.layoutMode = "HORIZONTAL"; ov.primaryAxisAlignItems = "CENTER"; ov.counterAxisAlignItems = "CENTER"; ov.primaryAxisSizingMode = "FIXED"; ov.counterAxisSizingMode = "FIXED"; ov.resize(1440, 900);
        m.name = "Dialog · " + (ht[0] ? ht[0].characters : ""); dl.remove(); D("modal");
      }
    }
    // sort headers are labels, not buttons
    for (const b of scr.findAll((n) => n.type === "FRAME" && /^Button - Sortează după /.test(n.name) && !inInst(n))) { b.name = "Sort header label · " + b.name.replace("Button - Sortează după ", ""); D("sort-label"); }
    // „Vezi în Audit & Logging” → Neutral Small
    for (const b of scr.findAll((n) => n.type === "FRAME" && /^Button/.test(n.name) && /^Vezi în Audit/.test(textOf(n)) && !inInst(n))) { const i = V(rect, { Style: "Neutral", Icon: "None", Size: "Small", State: "Default" }).createInstance(); setP(i, "⌨️ Label", textOf(b)); i.name = "btn · " + textOf(b); place(b, i); D("btn-audit"); }
    // batch toggles (Heading 3 › Button „Lotul …”) → svc/stack-group-header + meta lines
    const gs = await ks(K.group); const tags = await ks(K.tag);
    for (const b of scr.findAll((n) => n.type === "FRAME" && /^Button/.test(n.name) && /^Lotul /.test(textOf(n)) && !inInst(n))) {
      if (b.removed) continue;
      const lines = b.children[0] && b.children[0].children ? [...b.children[0].children] : []; const top = lines[0]; const topT = top ? texts(top).map((x) => x.characters.trim()).filter(Boolean) : [];
      const sec = b.parent && b.parent.parent; const open = !!(sec && sec.children.some((c) => c !== b.parent && c.visible !== false && c.findOne && c.findOne((x) => /^Table/.test(x.name))));
      const i = V(gs, { State: open ? "Open" : "Default" }).createInstance(); setP(i, "Label", topT[0] || "Lot"); setP(i, "Show count", false); setP(i, "Show chevron", true); setP(i, "Chevron down", !open); setP(i, "Chevron up", open);
      const tg = topT.slice(1); setP(i, "Show tag", tg.length > 0); setP(i, "Show tag 2", tg.length > 1);
      for (const [nm, s] of [["Tag", tg[0]], ["Tag 2", tg[1]]]) { if (!s) continue; const t = i.findOne((x) => x.type === "INSTANCE" && x.name === nm); if (t) { try { t.setProperties({ "🖌️ Style": /omis|eșuat|refuz/.test(s) ? "Accent" : "Neutral" }); } catch (e) {} setP(t, "⌨️ Label", s); } }
      const wrap = figma.createFrame(); wrap.name = "Batch header"; wrap.fills = []; wrap.layoutMode = "VERTICAL"; wrap.primaryAxisSizingMode = "AUTO"; wrap.counterAxisSizingMode = "AUTO"; wrap.itemSpacing = 0;
      const p = b.parent, ix = p.children.indexOf(b); p.insertChild(ix, wrap); try { wrap.layoutSizingHorizontal = "FILL"; } catch (e) {}
      wrap.appendChild(i); i.layoutSizingHorizontal = "FILL";
      const meta = figma.createFrame(); meta.name = "Meta"; meta.fills = []; meta.layoutMode = "VERTICAL"; meta.primaryAxisSizingMode = "AUTO"; meta.counterAxisSizingMode = "AUTO"; meta.itemSpacing = 4; meta.paddingLeft = meta.paddingRight = 16; meta.paddingBottom = 12; wrap.appendChild(meta); meta.layoutSizingHorizontal = "FILL";
      for (const ln of lines.slice(1)) { meta.appendChild(ln); try { ln.layoutSizingHorizontal = "FILL"; } catch (e) {} }
      b.remove(); D("batch-header");
    }
    // activity object names (link buttons in table cells) → brand links
    const bs5 = await sk(BS5);
    for (const b of scr.findAll((n) => n.type === "FRAME" && /^Button/.test(n.name) && !inInst(n) && n.parent && /Text|Table Cell/.test(n.parent.name) && n.children.length === 1 && n.children[0].type === "TEXT")) {
      if (b.removed) continue; const t = b.children[0]; const p = b.parent, ix = p.children.indexOf(b); p.insertChild(ix, t); await lf(t); await figma.loadFontAsync(bs5.fontName); await t.setTextStyleIdAsync(bs5.id); t.fills = await paint(VAR.brand); t.name = "link · " + t.characters.slice(0, 30); b.remove(); D("link");
    }
    // GRID tracks → whole px
    for (const t of scr.findAll((n) => n.type === "FRAME" && n.layoutMode === "GRID" && !inInst(n))) {
      for (const key of ["gridColumnSizes", "gridRowSizes"]) { try { const s = t[key]; if (Array.isArray(s) && s.some((x) => x.type === "FIXED" && Math.abs(x.value - Math.round(x.value)) > 0.01)) { t[key] = s.map((x) => (x.type === "FIXED" ? { type: "FIXED", value: Math.round(x.value) } : x)); D("grid-px"); } } catch (e) { un.push("grid " + key + " " + e.message.slice(0, 40)); break; } }
    }
    const left = scr.findAll((n) => n.type === "FRAME" && /^(Button\b|Button - |Text Input|Text Area|Tab$)/.test(n.name) && !inInst(n)).map((n) => n.name.slice(0, 30) + " " + n.id);
    return { done, un: un.slice(0, 10), raw: left.slice(0, 12) };
  }
  return "unknown op";
}
