// eKYC BO QA (2026-10-16) — builds the 4 local components for library gaps found by the QA, on „🧩 Local components”
// (section „Components · eKYC BO (local)” 10158:671, group „Group · Form, filter and media pieces (library gaps)” at y 6453).
// Sources = captured nodes that already matched the code (styles / variables copied from them). Created 2026-10-16:
//   Switch · label (library gap)          10775:1049  — code A.renderToggle (switch + label + supporting text, gap 12)
//   Filter option · tag (library gap)     10775:1055  — status facet option: checkbox + tag-filled Small, p 8/12, gap 12, r 8
//   Media badge · duration (library gap)  10775:1059  — .e-permits-ekyc-evidence__play: play 16 + „N s”, p 2/8/2/4, gap 4, r full
//   Field label (library gap)             10775:1063  — field() label + required mark (12/asterisk, icon/danger/default) + hint--top
// Nested switch / checkbox / tag are exposed instances (set Mode / Checked / Style / label per screen). Already run — kept as the
// record of how they were built (re-running creates duplicates).
const sec = await figma.getNodeByIdAsync("10158:671");
await figma.setCurrentPageAsync(await figma.getNodeByIdAsync("10687:2071"));
const g = (id) => figma.getNodeByIdAsync(id);
const V = async (k) => figma.variables.importVariableByKeyAsync(k);
const SP = { 2: "4e3c603781105ce160a1dc8d8ea7e97128057074", 4: "983c5b4d9a4e5fa988f0154c9bf4290c7aec9635", 8: "69ac88e41c0fea695fc5c4fd33f0188d1172dc59", 12: "ee4801fea560b76dffab59bd8ee6e31e3b636570" };
const RD = { 8: "dc82cc9d79935ad111db3189faf87c70772bed75", full: "cd76e9200ec61264fe73c9484085ef475ac6c345" };
const DANGER_ICON = "d3dd654ebc0bf68a448c59b2f8c71cb3c407c079"; // icon/danger/default (the text-input mandatory star)
const bindPad = async (f, t, r, b, l) => { const m = { paddingTop: t, paddingRight: r, paddingBottom: b, paddingLeft: l }; for (const [k, v] of Object.entries(m)) { f[k] = v; if (SP[v]) f.setBoundVariable(k, await V(SP[v])); } };
const bindGap = async (f, v) => { f.itemSpacing = v; if (SP[v]) f.setBoundVariable("itemSpacing", await V(SP[v])); };
const bindR = async (f, key, v) => { f.cornerRadius = v; const vv = await V(RD[key]); for (const k of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) f.setBoundVariable(k, vv); };
// sources (captured, code-matching): switch, checkbox, tag, play icon, asterisk, texts, pill, option row
const sw = await g("10282:29372"), cb = await g("10436:13588"), tag = await g("10436:13592"), play = await g("10718:10789"), star = await g("10705:16788");
const tTitle = await g("10276:8839"), tDesc = await g("10276:8841"), tCap = await g("10177:1875"), tLab = await g("10262:4846"), pill = await g("10177:1871"), opt = await g("10430:12923");
for (const t of [tTitle, tDesc, tCap, tLab]) await figma.loadFontAsync(t.fontName);
const mkText = async (src, name, chars) => { const t = figma.createText(); t.fontName = src.fontName; t.characters = chars; await t.setTextStyleIdAsync(src.textStyleId); t.fills = JSON.parse(JSON.stringify(src.fills)); t.name = name; return t; };
const Y0 = 6453, created = {};
// A · Switch · label
{ const c = figma.createComponent(); c.name = "Switch · label (library gap)"; sec.appendChild(c); c.x = 80; c.y = Y0 + 50;
  c.layoutMode = "HORIZONTAL"; c.counterAxisAlignItems = "CENTER"; await bindGap(c, 12); c.fills = [];
  const s = sw.mainComponent.createInstance(); c.appendChild(s); s.name = "switch";
  const col = figma.createFrame(); col.name = "Text"; col.fills = []; c.appendChild(col); col.layoutMode = "VERTICAL"; col.itemSpacing = 0;
  const l = await mkText(tTitle, "Label", "Label"); col.appendChild(l); const d = await mkText(tDesc, "Supporting text", "Supporting text"); col.appendChild(d);
  c.resize(480, 40); c.primaryAxisSizingMode = "FIXED"; c.counterAxisSizingMode = "AUTO";
  col.layoutSizingHorizontal = "FILL"; col.layoutSizingVertical = "HUG"; l.layoutSizingHorizontal = "FILL"; l.textAutoResize = "HEIGHT"; d.layoutSizingHorizontal = "FILL"; d.textAutoResize = "HEIGHT";
  const pL = c.addComponentProperty("Label", "TEXT", "Label"), pD = c.addComponentProperty("Supporting text", "TEXT", "Supporting text"), pS = c.addComponentProperty("Show supporting text", "BOOLEAN", true);
  l.componentPropertyReferences = { characters: pL }; d.componentPropertyReferences = { characters: pD, visible: pS }; s.isExposedInstance = true;
  created.switchLabel = c.id; }
// B · Filter option · tag
{ const c = figma.createComponent(); c.name = "Filter option · tag (library gap)"; sec.appendChild(c); c.x = 640; c.y = Y0 + 50;
  c.layoutMode = "HORIZONTAL"; c.counterAxisAlignItems = "CENTER"; await bindGap(c, 12); await bindPad(c, 8, 12, 8, 12);
  c.fills = JSON.parse(JSON.stringify(opt.fills)); await bindR(c, 8, 8);
  const k = cb.mainComponent.createInstance(); c.appendChild(k); k.name = "checkbox";
  const t = tag.mainComponent.createInstance(); c.appendChild(t); t.name = "tag";
  c.resize(254, 40); c.primaryAxisSizingMode = "FIXED"; c.counterAxisSizingMode = "AUTO"; k.isExposedInstance = true; t.isExposedInstance = true;
  created.filterOption = c.id; }
// C · Media badge · duration
{ const c = figma.createComponent(); c.name = "Media badge · duration (library gap)"; sec.appendChild(c); c.x = 960; c.y = Y0 + 50;
  c.layoutMode = "HORIZONTAL"; c.counterAxisAlignItems = "CENTER"; await bindGap(c, 4); await bindPad(c, 2, 8, 2, 4);
  c.fills = JSON.parse(JSON.stringify(pill.fills)); await bindR(c, "full", 999);
  const p = play.mainComponent.createInstance(); c.appendChild(p); p.name = "play";
  const t = await mkText(tCap, "Duration", "3,8 s"); c.appendChild(t);
  c.primaryAxisSizingMode = "AUTO"; c.counterAxisSizingMode = "AUTO";
  t.componentPropertyReferences = { characters: c.addComponentProperty("Duration", "TEXT", "3,8 s") };
  created.mediaBadge = c.id; }
// D · Field label
{ const c = figma.createComponent(); c.name = "Field label (library gap)"; sec.appendChild(c); c.x = 1160; c.y = Y0 + 50;
  c.layoutMode = "VERTICAL"; await bindGap(c, 8); c.fills = [];
  const row = figma.createFrame(); row.name = "Label row"; row.fills = []; c.appendChild(row); row.layoutMode = "HORIZONTAL"; row.counterAxisAlignItems = "CENTER"; await bindGap(row, 4);
  const l = await mkText(tLab, "Label", "Label"); row.appendChild(l);
  const s = star.mainComponent.createInstance(); row.appendChild(s); s.name = "Mandatory star";
  const vec = s.findOne((n) => n.type === "VECTOR" || (n.type !== "INSTANCE" && "fills" in n && n.fills.length)); const dv = await V(DANGER_ICON); const val = dv.resolveForConsumer(vec).value;
  vec.fills = [figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: val.r, g: val.g, b: val.b } }, "color", dv)];
  const h = await mkText(tLab, "Hint", "Hint"); c.appendChild(h);
  c.resize(480, 48); c.primaryAxisSizingMode = "AUTO"; c.counterAxisSizingMode = "FIXED";
  row.layoutSizingHorizontal = "FILL"; row.layoutSizingVertical = "HUG"; h.layoutSizingHorizontal = "FILL"; h.textAutoResize = "HEIGHT";
  const pL = c.addComponentProperty("Label", "TEXT", "Label"), pS = c.addComponentProperty("Show mandatory star", "BOOLEAN", true), pH = c.addComponentProperty("Hint", "TEXT", "Hint"), pHS = c.addComponentProperty("Show hint", "BOOLEAN", false);
  l.componentPropertyReferences = { characters: pL }; s.componentPropertyReferences = { visible: pS }; h.componentPropertyReferences = { characters: pH, visible: pHS };
  created.fieldLabel = c.id; }
sec.resize(sec.width, Y0 + 50 + 120 + 80);
return created;
