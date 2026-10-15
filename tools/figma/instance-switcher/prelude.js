// Shared prelude for the Instance switcher builders (run via use_figma; paste prelude + one builder).
// Library-only: every component, variable, style and icon is imported BY KEY, so the same code runs in
// GEAP 2.0, FOD-Components-flow and EVO Cabinet (files that don't share local components).
// CFG.pageId = the "Local components" page of the target file; CFG.frameName = holder frame.
const K = {
  v: {
    bgDefault: "ec2921da40a6853a80b0d299be5bc8b1a11fcc89", bgSecondary: "2099ba93803f67f67cdcf9153fc08965f5e32f65",
    bgTertiary: "7e60b930dcc5feaf713899211d4a85039e5249a9", bgTertiaryHover: "1ad66fae774ec211b38b0f056d3191b07e422144",
    bgBrand: "7104dc11afe3b34f5529876133c95b3be65ee87e", bgBrandSec: "c81449a9deab3e4126ba5f4387aa99e3f25234ef",
    bgBrandSecHover: "594cdd2eed518e0ae6f045cea623cbba88e992a1", bgWarning: "76c9ad875d98898691c4c7d29a2cf75aabc45c2b",
    borderBase: "9fa253aab4b44e39a049a0cbbd163e4c61e129b6", borderBrand: "a0e96ec6ed3e49300298bc9a0b2c879a3b402a87",
    borderSubtle: "0c03e562df806934e8c73cf7906828917b4cd8d8",
    textDefault: "c37576ba1791b00ac80a9a55579913b69d0b8b8f", textSecondary: "5d1a031c4c310a753a2c49f91c89db7ddb8a2287",
    textTertiary: "9d5ad1d87c1c1e2a9f94a242896a7882a20eda3f", textOnColor: "28c443b6ab4a96b13237b3b7cd110904a464a27f",
    iconDefault: "d3eb48f11a0d6190109fbfce85fe29c503086178", iconTertiary: "92561cad5e44e57b4b03dc6f532d609662b02711",
    iconBrand: "bc354272b09686be692277e55a28ed354a1e50a9", iconOnColor: "66d13a66c6483a80e5b443a15d49036d034b0879",
    s0: "09bbd3605451b3c79ea224d8e2e42a6830817f77", s2: "4e3c603781105ce160a1dc8d8ea7e97128057074",
    s4: "983c5b4d9a4e5fa988f0154c9bf4290c7aec9635", s6: "82d50194c1a9db8a29ad3e4b6e7eb2af1ff0cc39",
    s8: "69ac88e41c0fea695fc5c4fd33f0188d1172dc59", s12: "ee4801fea560b76dffab59bd8ee6e31e3b636570",
    s16: "22028a118574e28e30382d57efffac20e14398f0", s20: "8bad70ea75e00f6c6994b2793ccf4c1ee91d0e8c",
    s24: "49c6a5e43fd55f8fa058dfc13851df2854db5d83",
    r6: "5c211831294ec4aee7827d006133784193921c22", r8: "dc82cc9d79935ad111db3189faf87c70772bed75",
    r12: "1f2268059644ae4bb07e70b94fc8ee2bafcf952e", r16: "5e0761c5c01bfd401113f4132cbbf4b3fb30c7d0",
    rFull: "cd76e9200ec61264fe73c9484085ef475ac6c345",
    bw1: "e06116ffefa61d661228f8951cb103076fb97e25", bw2: "f3808d6079c62db4661156742c059b86345a0e86",
  },
  t: { small500: "057521fde838188af42abf69eb3789f676421047", small: "1f35541006807f80d766d8eb6ef5ae95d4f5cf6e",
       h4: "6437d48337bf6d1b766873db20b097b9b08cabf4", cap: "8d8e3878d547d107cf6de81a24255f71485db63f" },
  set: { avatar: "c622e4206c2a122385a0a1b0089b7e1c75fe7574", tagOutlined: "a097c75f623b0f38805804033a8c709e3e5d590b",
         btnFilledCirc: "fcf938f6ce9e31ae7f0f11838ee889335b4b7728", btnOutlinedCirc: "d7a0779b1fb70ccfc95c66ab762d577273913015",
         btnFilledRect: "2cbe2c350e7c6b3948dc449660ede8355511c384" },
  // .menu-item-action is not published on its own: take it from contextual-menu (component key eca4c78b40aec0ddac890e7f006907d81868c1ab)
  icon: { suitcase20: "0e94d9c836777dcf92b6f63b9cb60df4d1610e2c", suitcase24: "346d12c1c0389b5f098a3da215a8d6c707e0ff10",
          settings20: "ee36462d693e2b0bc822c45dfcf46ee091d0b844", logout20: "832a84dbc3632827096e73dcc7557d1b08527461",
          check20: "ebea9f11db46308470d328092590727874dbec88", chevB20: "ec31e2fd59c87fcf1bb6eb4ccfdde10307f56ce0",
          chevT20: "0e1e17107763411570b607bddc5de7061afdcb15", chevB16: "a9d10e062692212dde688d564b091a62be22d2f7" },
  fx: { menu: "2fb2f9a8e26281a682544001ffbcefa5cc980a70", ring: "97cdddcd09b08677bf21762cd132d69bb276e9c8" },
};
const page = await figma.getNodeByIdAsync(CFG.pageId);
await figma.setCurrentPageAsync(page);
const VAR = {};
for (const [k, key] of Object.entries(K.v)) VAR[k] = await figma.variables.importVariableByKeyAsync(key);
const ST = {};
for (const [k, key] of Object.entries(K.t)) { ST[k] = await figma.importStyleByKeyAsync(key); await figma.loadFontAsync(ST[k].fontName); }
const SET = {};
for (const [k, key] of Object.entries(K.set)) SET[k] = await figma.importComponentSetByKeyAsync(key);
const ICON = {};
for (const [k, key] of Object.entries(K.icon)) ICON[k] = await figma.importComponentByKeyAsync(key);
const FX = {};
for (const [k, key] of Object.entries(K.fx)) FX[k] = await figma.importStyleByKeyAsync(key);
const probe = figma.createRectangle(); page.appendChild(probe); probe.x = -99999;
const paint = name => {
  const v = VAR[name]; const val = v.resolveForConsumer(probe).value;
  return figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: val.r, g: val.g, b: val.b }, opacity: val.a === undefined ? 1 : val.a }, "color", v);
};
const fill = (n, name) => { n.fills = name ? [paint(name)] : []; };
const bindNum = (n, field, value, prefix) => { n[field] = value; const v = VAR[prefix + value]; if (v) n.setBoundVariable(field, v); };
const pad = (n, t, r, b, l) => { bindNum(n, "paddingTop", t, "s"); bindNum(n, "paddingRight", r, "s"); bindNum(n, "paddingBottom", b, "s"); bindNum(n, "paddingLeft", l, "s"); };
const gap = (n, g) => { n.itemSpacing = g; if (VAR["s" + g]) n.setBoundVariable("itemSpacing", VAR["s" + g]); };
const rad = (n, key) => { for (const f of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) n.setBoundVariable(f, VAR[key]); };
const stroke = (n, color, w, sides) => {
  n.strokes = [paint(color)]; n.strokeAlign = "INSIDE";
  const bw = VAR[w === 2 ? "bw2" : "bw1"];
  const all = ["strokeTopWeight", "strokeRightWeight", "strokeBottomWeight", "strokeLeftWeight"];
  for (const f of all) { const on = !sides || sides.includes(f); n[f] = on ? w : 0; if (on) n.setBoundVariable(f, bw); }
  if ("strokesIncludedInLayout" in n) n.strokesIncludedInLayout = true;
};
const al = (dir, name) => { const f = figma.createAutoLayout(dir, { name }); f.fills = []; f.clipsContent = false; return f; };
const txt = async (style, chars, color, name) => {
  const t = figma.createText(); await t.setTextStyleIdAsync(ST[style].id); t.characters = chars; t.fills = [paint(color)];
  t.name = name || chars; t.autoRename = false; return t;
};
const vp = (set, want) => set.children.find(ch => Object.entries(want).every(([k, v]) =>
  Object.entries(ch.variantProperties).some(([kk, vv]) => kk.replace(/^[^A-Za-z]+/, "") === k && vv === v)));
const propKey = (owner, re) => Object.keys(owner.componentPropertyDefinitions).find(k => re.test(k));
const recolorVectors = (n, color) => { for (const v of n.findAll(x => x.type === "VECTOR" || x.type === "BOOLEAN_OPERATION")) { if (Array.isArray(v.fills) && v.fills.length) v.fills = [paint(color)]; if (Array.isArray(v.strokes) && v.strokes.length) v.strokes = [paint(color)]; } };
// library avatar: type Initials | Icon; size Small 32 | Medium 40 | Large 48; tone brand | warning | soft | counter
const avatar = async (type, size, tone, initials) => {
  const a = vp(SET.avatar, { Type: type, Size: size, State: "Default" }).createInstance();
  a.name = "Avatar";
  const bg = { brand: "bgBrand", warning: "bgWarning", soft: "bgBrandSecHover", counter: "bgTertiary" }[tone];
  a.fills = [paint(bg)];
  const fg = tone === "soft" ? "iconBrand" : tone === "counter" ? "textSecondary" : "textOnColor";
  if (type === "Initials") {
    const t = a.children.find(c => c.type === "TEXT");
    for (const s of t.getStyledTextSegments(["fontName"])) await figma.loadFontAsync(s.fontName);
    t.characters = initials || "AC"; t.fills = [paint(fg)];
  } else {
    const ic = a.children.find(c => c.type === "INSTANCE" && /\d+\/person/.test(c.name));
    if (ic && tone !== "soft") { const w = ic.width; ic.swapComponent(w >= 24 ? ICON.suitcase24 : ICON.suitcase20); ic.resize(w, w); }
    if (ic) recolorVectors(ic, tone === "soft" ? "iconBrand" : "iconOnColor");
  }
  return a;
};
const icon = (comp, color, size) => { const i = comp.createInstance(); if (size) i.resize(size, size); recolorVectors(i, color); return i; };
// holder frame on the components page
let holder = page.children.find(n => n.type === "FRAME" && n.name === CFG.frameName);
if (!holder) {
  holder = figma.createAutoLayout("HORIZONTAL", { name: CFG.frameName });
  page.appendChild(holder); holder.x = CFG.x; holder.y = CFG.y;
  holder.layoutWrap = "WRAP"; holder.counterAxisSpacing = 80; holder.itemSpacing = 80; // board spacing (holder only)
  for (const f of ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"]) holder[f] = 80;
  fill(holder, "bgDefault"); holder.primaryAxisSizingMode = "FIXED"; holder.resize(4000, 400); holder.counterAxisSizingMode = "AUTO";
}
// lay variants of a set out in a grid (cols), 24 apart, and size the set to its content
const grid = (set, cols) => {
  let x = 24, y = 24, rowH = 0, i = 0, maxW = 0;
  for (const v of set.children) {
    v.x = x; v.y = y; rowH = Math.max(rowH, v.height); x += v.width + 24; maxW = Math.max(maxW, x);
    if (++i % cols === 0) { x = 24; y += rowH + 24; rowH = 0; }
  }
  set.resizeWithoutConstraints(Math.max(maxW, 100), (i % cols ? y + rowH + 24 : y));
  fill(set, "bgDefault"); set.strokes = [paint("borderBase")]; set.dashPattern = [6, 4]; set.cornerRadius = 16; rad(set, "r16");
};
