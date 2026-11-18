// env-sync board library (GEAP 2.0 · Admin rFoBKCqtBb0idERLS2RHE8, 2026-11-18). KEY-BASED: works in any file that enables
// the Components (lk-03f6) + Foundations (lk-e9e8) libraries — no GEAP node ids. Stored in figma.root shared plugin data
// „envs”/„lib” (paste this file once as `const LIB = <file>; figma.root.setSharedPluginData("envs","lib", LIB.toString())`).
// Run: const LIB = new Function("return " + figma.root.getSharedPluginData("envs","lib"))(); return await LIB(OP, ARGS);
// OPS
//   "shell"   → local mains `Sidebar · BO` (Central admin, Setări › Sincronizarea mediilor) + `Shell / Header (BO desktop)`
//   "screen"  {cap, state, active?}  captured page („cap · <state>”) → `Desktop · <state>` (gov bar · sidebar · header · page),
//             library swaps (notice, search, Filtrare chip, toolbar / direction buttons, tabs + track line, checkboxes, tags,
//             icons), GRID → auto-layout, table clip + last row no border, text styles + spacing tokens. Returns unmapped.
//   "block"   {screen, state, title, story, note, section}  → `Block · <state>` = Screen label · screen · Note, in the section
//   "tok"     {ids}  text styles + spacing tokens only
async (OP, A = {}) => {
  figma.skipInvisibleInstanceChildren = false;
  const ids = JSON.parse(figma.root.getSharedPluginData("envs", "ids") || "{}");
  const save = () => figma.root.setSharedPluginData("envs", "ids", JSON.stringify(ids));
  const g = (id) => figma.getNodeByIdAsync(id);
  const KC = {}, KS = {}, VV = {}, SS = {};
  const kc = async (k) => (KC[k] = KC[k] || (await figma.importComponentByKeyAsync(k)));
  const ks = async (k) => (KS[k] = KS[k] || (await figma.importComponentSetByKeyAsync(k)));
  const vk = async (k) => (VV[k] = VV[k] || (await figma.variables.importVariableByKeyAsync(k)));
  const sk = async (k) => (SS[k] = SS[k] || (await figma.importStyleByKeyAsync(k)));
  const SP = { 0: "09bbd3605451b3c79ea224d8e2e42a6830817f77", 2: "4e3c603781105ce160a1dc8d8ea7e97128057074", 4: "983c5b4d9a4e5fa988f0154c9bf4290c7aec9635", 6: "82d50194c1a9db8a29ad3e4b6e7eb2af1ff0cc39", 8: "69ac88e41c0fea695fc5c4fd33f0188d1172dc59", 12: "ee4801fea560b76dffab59bd8ee6e31e3b636570", 16: "22028a118574e28e30382d57efffac20e14398f0", 20: "8bad70ea75e00f6c6994b2793ccf4c1ee91d0e8c", 24: "49c6a5e43fd55f8fa058dfc13851df2854db5d83", 32: "d1bd20c7a50c986d517b076fed38101f5b33c1ff", 40: "7cafa764a9b0b1eb7a8fe2bec67721b5c331cf83", 48: "2a030f2d03121ff975816aa58b5b51e550b62df9", 56: "f3817bc19ba08eb020f2f88300b05dacbfa26b49", 64: "43464c51e14946ad337f86a0c002e2db5a167fd7", 80: "6b41a484af89fb00350dc4422ac7fb5e7cf8687a" };
  const TS = { cs: "3ab233d194ba36d0b9986734fdb9d55967dd1448", cm: "8d8e3878d547d107cf6de81a24255f71485db63f", cm5: "f28b7696292db20f926d7897d94e584ceb392ceb", bs: "1f35541006807f80d766d8eb6ef5ae95d4f5cf6e", bs5: "057521fde838188af42abf69eb3789f676421047", bd: "392200dc0245a58de37af35126f75e6aba9c1fd7", bd5: "e069d3c303536b6b965b5e68074b3200d638b7b3", bl: "ead7c03fa8d45f21306e772b0576a2c3df1d7237", bl5: "2c789c4dd09bd642000ba0e56c332dd666c211de", h5: "75e7dfdca13a793cb25b8e6cb5949ad59c850c85", h4: "6437d48337bf6d1b766873db20b097b9b08cabf4", h3: "baf5f0238882e79bcbabaffcb185862f572c5bcf", h2: "5efe3a2cf8678d3a30f6fd88b1af8e7343507863" };
  const styleFor = (size, wt) => size <= 10 ? "cs" : size <= 12 ? (wt >= 500 ? "cm5" : "cm") : size <= 14 ? (wt >= 500 ? "bs5" : "bs") : size <= 16 ? (wt >= 500 ? "bd5" : "bd") : size <= 18 ? (wt >= 600 ? "h5" : wt >= 500 ? "bl5" : "bl") : size <= 20 ? "h4" : size <= 24 ? "h3" : "h2";
  const COL = { text: "c37576ba1791b00ac80a9a55579913b69d0b8b8f", textTer: "9d5ad1d87c1c1e2a9f94a242896a7882a20eda3f", border: "9fa253aab4b44e39a049a0cbbd163e4c61e129b6", white: "ec2921da40a6853a80b0d299be5bc8b1a11fcc89", bgSec: "2099ba93803f67f67cdcf9153fc08965f5e32f65" };
  const RAD = { r8: "dc82cc9d79935ad111db3189faf87c70772bed75", r12: "1f2268059644ae4bb07e70b94fc8ee2bafcf952e", r16: "5e0761c5c01bfd401113f4132cbbf4b3fb30c7d0", r20: "67f239d0", full: "cd76e9200ec61264fe73c9484085ef475ac6c345" };
  const SET = { rect: "2cbe2c350e7c6b3948dc449660ede8355511c384", circ: "fcf938f6ce9e31ae7f0f11838ee889335b4b7728", textRect: "4ad2518c34b8b51d5113119316eac5934c1eb9fb", check: "e915a93ec9c4b91546cfb5788ededa656f98069a", tag: "a97109f9ebf668fb7616cb37e46929fc75ed9070", tab: "0294516b83af6616fbab5bb29510032a2ef03d80", badge: "68a3732b7f9426c74b6c022887f0c7b9daca495d", search: "a27b4efaed053f6cd4a57411a032d7391174c425", chip: "a2731000280087a1f254d5ad13d3725966c8181a", side: "66c046a8f2e5b5c0b5e87d25aace43b176ad018f", avatar: "c622e4206c2a122385a0a1b0089b7e1c75fe7574", top: "ef41893a2f6488bb4b264a219fa31a8ec9f562a8" };
  const IC = { rotate: "8cdf3361fae3b611bc79a0ff4be5e664909d1ea5", plus: "52d7f8d8fc6f085581c901fdf6ca49b994735246", upload: "e72e41aa51a34c586d0e3e31309dc738551e1ba8", help: "322822f38c7708c8bb66d137111569a4d7179790", bell: "4018a350ecbc8fe5cb522545f48f8c98ae664e64", chevD20: "ec31e2fd59c87fcf1bb6eb4ccfdde10307f56ce0", chevD16: "a9d10e062692212dde688d564b091a62be22d2f7", sidebar: "f8627c5d2b37adbd6e3016e332536ece3dd45c7a", logo: "21a565da48d438202874159adf9fb38be4adec65", filter: "7b2354831ab59c47c20f73c7e60b3e601c1460fb", check16: "65554871443479b94c3509571928faafcfa1767f", btnIconOnly: "5685a256320fe41e04e10cd9833f6f081d1f46f2", btnUpdate: "52f2bc3f1ec748d1badbd14cfd0e38c7458c2c24" };
  const V = (set, want) => set.children.find((c) => Object.entries(want).every(([k, v]) => c.name.includes(`${k}=${v}`)));
  const pk = (i, pre) => Object.keys(i.componentProperties).find((k) => k.startsWith(pre));
  const setP = (i, pre, val) => { const k = pk(i, pre); if (k) { try { i.setProperties({ [k]: val }); } catch (e) {} } return k; };
  const setIcons = async (i, key, which = /Leading Icon/) => { const c = await kc(key); for (const k of Object.keys(i.componentProperties).filter((k) => which.test(k))) { try { i.setProperties({ [k]: c.id }); } catch (e) {} } };
  const paint = async (k) => [figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", await vk(k))];
  const bindSp = async (n, fields, v) => { for (const f of fields) { try { n.setBoundVariable(f, await vk(SP[v])); } catch (e) {} } };
  const bindRad = async (n, key) => { for (const f of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) n.setBoundVariable(f, await vk(key)); };
  const loaded = new Set(); const lf = async (fn) => { const k = fn.family + "|" + fn.style; if (!loaded.has(k)) { loaded.add(k); try { await figma.loadFontAsync(fn); } catch (e) {} } };
  const styleText = async (t, key) => { const s = await sk(TS[key]); await lf(s.fontName); for (const seg of t.getStyledTextSegments(["fontName"])) await lf(seg.fontName); await t.setTextStyleIdAsync(s.id); };
  const txt = async (chars, key, colKey, name) => { await lf({ family: "Onest", style: "Regular" }); const t = figma.createText(); t.fontName = { family: "Onest", style: "Regular" }; t.characters = chars; await styleText(t, key); t.fills = await paint(colKey || COL.text); if (name) t.name = name; return t; };
  const frame = (name, mode, o = {}) => { const f = figma.createFrame(); f.name = name; f.fills = []; if (mode) { f.layoutMode = mode; f.primaryAxisSizingMode = "AUTO"; f.counterAxisSizingMode = "AUTO"; } Object.assign(f, o); return f; };
  const inInst = (n) => { for (let p = n.parent; p; p = p.parent) if (p.type === "INSTANCE") return true; return false; };
  const textOf = (n) => (n.type === "TEXT" ? n.characters : n.findAll ? n.findAll((x) => x.type === "TEXT").map((x) => x.characters).join(" ") : "").replace(/\s+/g, " ").trim();
  const solid = (n) => { const f = Array.isArray(n.fills) && n.fills.find((p) => p.type === "SOLID" && p.visible !== false && (p.opacity == null || p.opacity > 0.01)); return f ? f.color : null; };
  const place = (old, inst, fill) => { const p = old.parent, i = p.children.indexOf(old); p.insertChild(i, inst); const auto = p.layoutMode && p.layoutMode !== "NONE"; if (auto && old.layoutPositioning !== "ABSOLUTE") { if (fill) { try { inst.layoutSizingHorizontal = "FILL"; } catch (e) {} } } else { if (old.layoutPositioning === "ABSOLUTE") inst.layoutPositioning = "ABSOLUTE"; inst.x = old.x; inst.y = old.y; } if (p.layoutMode === "GRID") { try { inst.setGridChildPosition(old.gridRowAnchorIndex, old.gridColumnAnchorIndex); } catch (e) {} } old.remove(); return inst; };
  const wt = (style) => (/Black|Extra ?Bold/.test(style) ? 800 : /Semi ?Bold/.test(style) ? 600 : /Bold/.test(style) ? 700 : /Medium/.test(style) ? 500 : 400);
  // ---------------------------------------------------------------- text styles + spacing tokens (outside instances)
  const TOK = async (root) => {
    const st = { text: 0, sp: 0, off: [] };
    for (const t of root.findAll((n) => n.type === "TEXT" && !inInst(n))) {
      if (t.textStyleId && typeof t.textStyleId === "string" && t.textStyleId.length) continue;
      const segs = t.getStyledTextSegments(["fontName", "fontSize", "fills"]);
      for (const s of segs) await lf(s.fontName);
      for (const s of segs) { const key = styleFor(s.fontSize, wt(s.fontName.style)); const sty = await sk(TS[key]); await lf(sty.fontName); try { await t.setRangeTextStyleIdAsync(s.start, s.end, sty.id); t.setRangeFills(s.start, s.end, s.fills); st.text++; } catch (e) {} }
    }
    for (const f of [root, ...root.findAll((n) => (n.type === "FRAME" || n.type === "COMPONENT") && !inInst(n))]) {
      if (!f.layoutMode || f.layoutMode === "NONE") continue;
      for (const k of ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "itemSpacing"]) {
        if (f.layoutMode === "GRID" && k === "itemSpacing") continue;
        const v = Math.round(f[k]); if (f.boundVariables && f.boundVariables[k]) continue;
        if (SP[v] != null) { try { f.setBoundVariable(k, await vk(SP[v])); st.sp++; } catch (e) {} } else if (v > 0 && st.off.length < 12) st.off.push(f.name.slice(0, 20) + "." + k + "=" + v);
      }
    }
    return st;
  };
  // ---------------------------------------------------------------- shell mains
  if (OP === "shell") {
    const lib = await g(ids.lib); await figma.setCurrentPageAsync(lib);
    const rect = await ks(SET.rect);
    // Sidebar · BO
    if (!ids.sidebar || !(await g(ids.sidebar))) {
      const ITEMS = [["Locul de muncă", [["Dosare noi", "9f3bb37c051aec8956a702b408659e32b5f1ecc3"], ["Dosare suspendate", "4145428913a40b88d49131cf6823b6c893e44d8e"], ["Dosare inițiate din oficiu", "005c4c4c69dda9913a5160e190e24173c0b852a2"], ["Dosarele în lucru", "e24b5fb53126feecbf06c7af3e00245e40c4f241"], ["Dosare cu alerte", "70fe2a14b01c5a0d24ee2f0d09659c6687ef6147"], ["Dosare finalizate", "c97243cac03568489849f7903bdf58c4228af60f"]]],
        ["Registre", [["Registre", "a593fc5643b31ddf45ed4806e53c08e9a15c7727"]]],
        ["Administrare", [["Utilizatori", "6180ac4864359e35672111672334a8867c491549"], ["Absențe", "02529365c2a2f2c2562b4537f90fd28ba04472dd"], ["Roluri", "8abd0ed8367d9003615b66b82b2bd22bc860a1d2"], ["Autorități", "87d8604fb5990d3a18798cfcd6a9ac752df61375"], ["Subdiviziuni", "8caf9129c5173df08ac23e8e2ba58f24809c3f00"], ["Clasificatoare", "6f5efe15f436a2e5377c4554fe744a98be55aa63"], ["Formulare globale", "1480ef1a6c615c865305df4a6a795292e1e16f29"], ["Șabloane globale", "4e08d267f9edebfab3f8c649e30619b4ac3da37c"], ["Registre", "a593fc5643b31ddf45ed4806e53c08e9a15c7727"], ["Configurări servicii", "2e5df68892a374224dde7f0ae3d4ef698819d67f"], ["Fluxuri de lucru", "667d144d2807d6765c0815a0a4a35d460e2cd5d7"], ["Tarife", "8e7fa0a20d0e46609938dbcad31a9841a7fb369d"], ["Calendar", "d52f20dddb93eb0e2926910bf5325283fcc9a9ef"], ["Șabloane de notificare", "4018a350ecbc8fe5cb522545f48f8c98ae664e64"], ["Șabloane de jurnalizare", "d46ff3a227d4ad7b8ea3d59143af59d47fe869bf"], ["KPI", "00471b4faabb4c1d791c5a39d869f141451c82ff"], ["Widgete", "8d66d03b5a28bd78393ef547aac0387048e58e2d"], ["Rapoarte", "00471b4faabb4c1d791c5a39d869f141451c82ff"], ["Tablouri de bord", "de582b649cb8166403089b26c0313a48997ed712"]]],
        ["Setări", [["Distribuire", "ee36462d693e2b0bc822c45dfcf46ee091d0b844"], ["Reguli de numerotare", "336c86cc2139bc3408c459695062b90354b43760"], ["Sincronizarea mediilor", IC.rotate]]]];
      const sb = figma.createComponent(); sb.name = "Sidebar · BO"; sb.layoutMode = "VERTICAL"; sb.primaryAxisSizingMode = "AUTO"; sb.counterAxisSizingMode = "FIXED"; sb.resize(256, 100);
      sb.fills = await paint(COL.white); sb.strokes = await paint(COL.border); sb.strokeWeight = 0; sb.strokeRightWeight = 1; sb.strokeAlign = "INSIDE"; await bindSp(sb, ["paddingBottom"], 16);
      sb.description = "BO sidebar, Central admin (code e-permits-shell nav; = GEAP Sidebar · BO 12673:12268, Setări › Sincronizarea mediilor added). Items = library sidebar-list-item; set the active item's State per screen.";
      const head = frame("Header", "HORIZONTAL"); sb.appendChild(head); head.layoutSizingHorizontal = "FILL"; head.primaryAxisAlignItems = "SPACE_BETWEEN"; head.counterAxisAlignItems = "CENTER"; await bindSp(head, ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"], 12);
      const brand = frame("Brand", "HORIZONTAL"); head.appendChild(brand); brand.counterAxisAlignItems = "CENTER"; await bindSp(brand, ["itemSpacing"], 12);
      const logo = (await kc(IC.logo)).createInstance(); brand.appendChild(logo);
      const lt = frame("Logo Text", "VERTICAL"); brand.appendChild(lt); lt.appendChild(await txt("SIA GEAP", "h5", COL.text, "Title")); lt.appendChild(await txt("Back Office", "cm", COL.textTer, "Description"));
      const col = (await kc(IC.btnIconOnly)).createInstance(); col.name = "Collapse"; head.appendChild(col); await setIcons(col, IC.sidebar, /Icon/);
      const lsi = await ks(SET.side); const def = lsi.children.find((c) => /State=Default/.test(c.name)) || lsi.defaultVariant;
      let first = true;
      for (const [grp, items] of ITEMS) {
        const gf = frame("Group · " + grp, "VERTICAL"); sb.appendChild(gf); gf.layoutSizingHorizontal = "FILL"; if (first) await bindSp(gf, ["paddingTop"], 2); first = false;
        const gh = frame("Group header", "HORIZONTAL"); gf.appendChild(gh); gh.layoutSizingHorizontal = "FILL"; await bindSp(gh, ["paddingTop", "paddingRight", "paddingLeft"], 16); await bindSp(gh, ["paddingBottom"], 12);
        const gt = await txt(grp, "bs5", COL.textTer, "Title"); gh.appendChild(gt); gt.layoutSizingHorizontal = "FILL";
        for (const [label, key] of items) { const it = def.createInstance(); gf.appendChild(it); it.layoutSizingHorizontal = "FILL"; it.name = "Item · " + label; setP(it, "⌨️ Primary Label", label); try { const c = await kc(key); setP(it, "🔄 Icon", c.id); } catch (e) {} }
      }
      lib.appendChild(sb); sb.x = 0; sb.y = 800; ids.sidebar = sb.id;
    }
    // Shell / Header (BO desktop)
    if (!ids.header || !(await g(ids.header))) {
      const h = figma.createComponent(); h.name = "Shell / Header (BO desktop)"; h.layoutMode = "VERTICAL"; h.primaryAxisSizingMode = "AUTO"; h.counterAxisSizingMode = "FIXED"; h.resize(1184, 66);
      h.fills = await paint(COL.white); h.strokes = await paint(COL.border); h.strokeWeight = 0; h.strokeBottomWeight = 1; h.strokeAlign = "INSIDE";
      h.description = "BO top bar (code .e-permits-shell__header; = GEAP 11903:7155): page title + Actualizează, help, notifications, user menu.";
      const inner = frame("Header inner", "HORIZONTAL"); h.appendChild(inner); inner.layoutSizingHorizontal = "FILL"; inner.counterAxisSizingMode = "FIXED"; inner.resize(1184, 66); inner.primaryAxisAlignItems = "SPACE_BETWEEN"; inner.counterAxisAlignItems = "CENTER"; await bindSp(inner, ["paddingLeft", "paddingRight"], 16); await bindSp(inner, ["itemSpacing"], 24);
      const left = frame("Title row", "HORIZONTAL"); inner.appendChild(left); left.counterAxisAlignItems = "CENTER"; await bindSp(left, ["itemSpacing"], 24);
      const title = await txt("Sincronizarea mediilor", "h4", COL.text, "Title"); left.appendChild(title);
      const upd = (await kc(IC.btnUpdate)).createInstance(); upd.name = "Update"; left.appendChild(upd); setP(upd, "⌨️ Label", "Actualizează"); await setIcons(upd, IC.rotate);
      const right = frame("Actions", "HORIZONTAL"); inner.appendChild(right); right.counterAxisAlignItems = "CENTER"; await bindSp(right, ["itemSpacing"], 24);
      const tools = frame("Tools", "HORIZONTAL"); right.appendChild(tools); tools.counterAxisAlignItems = "CENTER"; await bindSp(tools, ["itemSpacing"], 4);
      for (const [name, key] of [["Help", IC.help], ["Notifications", IC.bell]]) {
        const b = frame(name, "HORIZONTAL"); b.primaryAxisSizingMode = "FIXED"; b.counterAxisSizingMode = "FIXED"; b.resize(36, 36); b.primaryAxisAlignItems = "CENTER"; b.counterAxisAlignItems = "CENTER"; await bindRad(b, RAD.full); tools.appendChild(b);
        const ic = (await kc(key)).createInstance(); b.appendChild(ic); ic.resize(20, 20);
        if (name === "Notifications") { const bs = await ks(SET.badge); const bv = bs.children.find((c) => /Danger|Error|Critical|Red/.test(c.name)) || bs.defaultVariant; const bd = bv.createInstance(); b.appendChild(bd); bd.layoutPositioning = "ABSOLUTE"; bd.x = 20; bd.y = 2; bd.name = "Badge"; setP(bd, "⌨️", "10"); }
      }
      const user = frame("User menu", "HORIZONTAL"); right.appendChild(user); user.counterAxisAlignItems = "CENTER"; await bindSp(user, ["paddingTop", "paddingBottom"], 6); await bindSp(user, ["paddingLeft", "paddingRight"], 8); await bindSp(user, ["itemSpacing"], 12); await bindRad(user, RAD.r12);
      const av = await ks(SET.avatar); const avv = av.children.find((c) => /Initials/.test(c.name) && /Medium|40/.test(c.name)) || av.children.find((c) => /Initials/.test(c.name)) || av.defaultVariant; const avi = avv.createInstance(); user.appendChild(avi); avi.name = "Avatar"; setP(avi, "⌨️", "AC");
      const who = frame("Who", "VERTICAL"); user.appendChild(who); await bindSp(who, ["itemSpacing"], 2);
      const nm = await txt("Anastasia Cojocaru", "bs5", COL.text, "Name"); who.appendChild(nm); const rl = await txt("Administrator central • ANSP", "cm", COL.textTer, "Role"); who.appendChild(rl);
      const ch = (await kc(IC.chevD20)).createInstance(); user.appendChild(ch);
      const pT = h.addComponentProperty("Title", "TEXT", "Sincronizarea mediilor"), pU = h.addComponentProperty("Show update", "BOOLEAN", true), pN = h.addComponentProperty("Name", "TEXT", "Anastasia Cojocaru"), pR = h.addComponentProperty("Role", "TEXT", "Administrator central • ANSP");
      title.componentPropertyReferences = { characters: pT }; upd.componentPropertyReferences = { visible: pU }; nm.componentPropertyReferences = { characters: pN }; rl.componentPropertyReferences = { characters: pR };
      lib.appendChild(h); h.x = 400; h.y = 800; ids.header = h.id;
    }
    // gov bar = library .top-section (from header-evo-desktop)
    const H = await ks(SET.top); const top = await H.children[0].findOne((n) => n.name === ".top-section").getMainComponentAsync(); ids.gov = top.id;
    save(); return { sidebar: ids.sidebar, header: ids.header, gov: ids.gov };
  }
  // ---------------------------------------------------------------- capture → screen
  if (OP === "screen") {
    const cap = await g(A.cap); let page = cap.parent; while (page.type !== "PAGE") page = page.parent;
    const un = []; const done = {}; const D = (k) => (done[k] = (done[k] || 0) + 1);
    const scr = frame("Desktop · " + A.state, "VERTICAL"); page.appendChild(scr); scr.x = cap.x + cap.width + 200; scr.y = cap.y;
    scr.counterAxisSizingMode = "FIXED"; scr.resize(1440, 900); scr.primaryAxisSizingMode = "AUTO"; scr.minHeight = 900; scr.clipsContent = true;
    scr.fills = await paint(COL.white); scr.strokes = await paint(COL.border); scr.strokeWeight = 4; scr.strokeAlign = "OUTSIDE"; await bindRad(scr, RAD.r16);
    const govMain = await (await ks(SET.top)).children[0].findOne((n) => n.name === ".top-section").getMainComponentAsync(); const gov = govMain.createInstance(); scr.appendChild(gov); gov.layoutSizingHorizontal = "FILL"; gov.name = "Gov bar";
    const body = frame("Body", "HORIZONTAL"); scr.appendChild(body); body.layoutSizingHorizontal = "FILL"; body.layoutSizingVertical = "HUG";
    // GEAP 2.0-local shell parts are not published yet (2026-11-18) → the captured sidebar / top bar stay as labelled
    // placeholders; swap them for `Sidebar · BO` (GEAP 12673:12268, Central admin) / `Shell / Header (BO desktop)` (11903:7155) once published.
    const sbCap = cap.findOne((n) => n.name === "Sidebar - Navigare principală"); body.appendChild(sbCap); sbCap.name = "PLACEHOLDER · Sidebar · BO (GEAP 12673:12268)"; sbCap.layoutSizingVertical = "FILL";
    const main = frame("Main", "VERTICAL"); body.appendChild(main); main.layoutSizingHorizontal = "FILL"; main.layoutSizingVertical = "HUG"; main.fills = await paint(COL.white);
    const hdCap = cap.findOne((n) => n.name === "Header" && n.parent === cap.children[0]); main.appendChild(hdCap); hdCap.layoutPositioning = "AUTO"; hdCap.name = "PLACEHOLDER · Shell / Header (BO desktop) (GEAP 11903:7155)"; hdCap.layoutSizingHorizontal = "FILL";
    const sec = cap.findOne((n) => n.name === "Section - Conținut principal");
    const pageC = sec.children[0]; main.appendChild(pageC); pageC.name = "Page"; pageC.layoutSizingHorizontal = "FILL"; pageC.layoutSizingVertical = "HUG";
    // overlays of the capture (dialog / drawer scrims) → screen level, same position
    for (const o of cap.children.filter((c) => c.layoutPositioning === "ABSOLUTE" && c.findOne && c.findOne((x) => x.name === "Dialog"))) { scr.appendChild(o); o.layoutPositioning = "ABSOLUTE"; o.x = 0; o.y = 0; o.name = "Overlay"; D("overlay"); }
    const root = scr;
    // GRID containers that hold one column → VERTICAL (tables keep their GRID)
    for (const f of root.findAll((n) => n.type === "FRAME" && n.layoutMode === "GRID" && !/^Table/.test(n.name))) {
      const kids = [...f.children].sort((a, b) => a.y - b.y || a.x - b.x); const oneCol = kids.every((k) => Math.abs(k.x - kids[0].x) < 2);
      if (!oneCol) { un.push("grid " + f.name + " " + f.id); continue; }
      f.layoutMode = "VERTICAL"; f.itemSpacing = 0; kids.forEach((k, i) => f.insertChild(i, k)); for (const k of kids) { try { k.layoutSizingHorizontal = "FILL"; } catch (e) {} } f.primaryAxisSizingMode = "AUTO"; D("grid→vertical");
    }
    const tags = await ks(SET.tag), rect = await ks(SET.rect);
    const tagOf = (style, label, type = "Subtle") => { const v = tags.children.find((c) => c.name.includes("Type=" + type) && c.name.includes("Style=" + style) && c.name.includes("Icon=None") && c.name.includes("Size=Small")); const i = v.createInstance(); setP(i, "⌨️ Label", label); i.name = "tag · " + label; return i; };
    for (const f of root.findAll((n) => n.type === "FRAME" && !inInst(n))) {
      if (f.removed) continue;
      const t = textOf(f), h = Math.round(f.height), w = Math.round(f.width), c = solid(f);
      // in-page notice (icon + paragraph on a tinted, rounded box)
      if (c && (f.cornerRadius === figma.mixed ? f.topLeftRadius : f.cornerRadius) >= 8 && f.children && f.children.length === 2 && f.children[0].findOne && f.children[0].findOne((x) => /h2d-svg/.test(x.name)) && /Paragraph/.test(f.children[1].name)) {
        const tone = c.g > c.r && c.g > c.b + 0.03 ? "Success" : c.r > 0.95 && c.g < 0.93 ? "Error" : c.r > 0.95 && c.b < 0.85 ? "Warning" : "Info";
        f.name = "PLACEHOLDER · Message · subtle Tone=" + tone + " (GEAP 9845:17951)"; f.layoutSizingHorizontal = "FILL";
        D("notice"); continue;
      }
      // search
      if (f.children && f.children.some((x) => x.name === "Search Input")) {
        const set = await ks(SET.search); const v = V(set, { State: "Default" }) || set.defaultVariant; const i = v.createInstance(); setP(i, "⌨️ Placeholder", t); setP(i, "👁️ Clear", false);
        place(f, i); i.resize(w, i.height); i.name = "search · " + t.slice(0, 20); D("search"); continue;
      }
      // Filtrare trigger → library filter chip (filter-2 icon)
      if (/^Button/.test(f.name) && /^Filtrare$/.test(t) && h >= 32 && h <= 48) {
        const set = await ks(SET.chip); const v = set.children.find((x) => x.name === "🎚️ State=Unselected, 🎚️ Type=Mono Selection, 📍 Icon=Leading"); const i = v.createInstance();
        setP(i, "⌨️ Label", "Filtrare"); setP(i, "👁️ Counter Badge", false); const ic = i.findOne((x) => x.type === "INSTANCE" && /^\d+\/|filter/.test(x.name)); if (ic) ic.swapComponent(await kc(IC.filter));
        place(f, i); i.layoutSizingVertical = "FIXED"; i.resize(i.width, h <= 37 ? 36 : 40); await bindRad(i, RAD.r8); i.name = "filter chip · Filtrare"; D("filter-chip"); continue;
      }
      // toolbar actions
      if (/^Button/.test(f.name) && /^Sincronizează (selecția|tot)/.test(t) && h <= 40) {
        const primary = /^Sincronizează tot/.test(t); const tc = (f.findOne((x) => x.type === "TEXT") || {}).fills; const dis = tc && tc[0] && tc[0].color && tc[0].color.r > 0.6 && !primary;
        const v = V(rect, { Style: primary ? "Primary" : "Secondary", Icon: "Leading", Size: h <= 32 ? "Small" : "Medium", State: dis ? "Disabled" : "Default" }); const i = v.createInstance(); setP(i, "⌨️ Label", t); await setIcons(i, primary ? IC.plus : IC.upload);
        place(f, i); i.name = "btn · " + t; D("btn-toolbar"); continue;
      }
      // direction cell button „SRC → TGT” (library Neutral Small); blocked = Disabled
      if (/^Button - [A-Z]+ → [A-Z]+/.test(f.name) && h <= 40) {
        const tc = (f.findOne((x) => x.type === "TEXT") || {}).fills; const dis = tc && tc[0] && tc[0].color && tc[0].color.r > 0.6;
        const v = V(rect, { Style: "Neutral", Icon: "None", Size: "Small", State: dis ? "Disabled" : "Default" }); const i = v.createInstance(); setP(i, "⌨️ Label", t); place(f, i); i.name = "btn · " + t; D("btn-direction"); continue;
      }
      // tabs → library tab-item-s + grey track line under the bar
      if (/^Tab List/.test(f.name)) {
        const set = await ks(SET.tab);
        for (const tb of f.children.filter((x) => x.name === "Tab")) {
          const label = (tb.children.find((x) => x.type === "TEXT") || {}).characters || textOf(tb); const cnt = tb.children.find((x) => x.type === "FRAME"); const sel = tb.strokes && tb.strokes.some((p) => p.color && p.color.b > 0.6 && p.color.r < 0.3) && tb.strokeBottomWeight >= 2;
          const v = V(set, { Type: sel ? "Selected" : "Unselected" }) || set.defaultVariant; const i = v.createInstance(); setP(i, "⌨️ Label", label);
          if (cnt) { setP(i, "👁️ Badge", true); const nb = i.findOne((x) => x.type === "INSTANCE" && x.componentProperties && Object.keys(x.componentProperties).some((k) => /Counter Value/.test(k))); if (nb) setP(nb, "⌨️ Counter Value", textOf(cnt)); } else setP(i, "👁️ Badge", false);
          place(tb, i); i.name = "tab · " + label; D("tab");
        }
        f.strokes = await paint(COL.border); f.strokeWeight = 0; f.strokeBottomWeight = 1; f.strokeAlign = "INSIDE"; f.name = "Tabs"; continue;
      }
      // checkbox (captured 20×20 box inside „Label:margin”)
      if (f.name === "Text" && w === 20 && h === 20 && f.parent && /^Label/.test(f.parent.name) && f.strokes && f.strokes.length) {
        const set = await ks(SET.check); const on = c && c.b > 0.6 && c.r < 0.3; const v = set.children.find((x) => /Size=Small|Small/.test(x.name) && new RegExp("(Checked|Selected|State)=(" + (on ? "True|On|Checked|Yes" : "False|Off|Unchecked|No") + ")").test(x.name) && !/Disabled|Hover|Focus|Indeterminate/.test(x.name)) || set.defaultVariant;
        const i = v.createInstance(); const lab = f.parent; place(lab, i); i.name = "checkbox"; D("checkbox"); continue;
      }
      // tags: „aici lucrezi” (brand), „schiță” (warning)
      if (f.children && f.children.length === 1 && f.children[0].type === "TEXT" && h <= 24 && c && /^(aici lucrezi|schiță)$/.test(t)) { place(f, tagOf(t === "schiță" ? "Accent" : "Brand", t)); D("tag"); continue; }
    }
    // icons left from the capture (h2d-svg): ✓ sincronizat 16, sort chevrons 20
    const inPh0 = (n) => { for (let p = n; p; p = p.parent) if (/^PLACEHOLDER/.test(p.name)) return true; return false; };
    for (const s of root.findAll((n) => /^h2d-svg/.test(n.name) && !inInst(n) && !inPh0(n))) {
      if (s.removed) continue; const box = s.parent && s.parent.name === "Icon" ? s.parent : s; const ctx = textOf(box.parent && box.parent.parent ? box.parent.parent : box.parent);
      const vec = s.findOne && s.findOne((x) => x.type === "VECTOR"); const bv = vec && vec.fills && vec.fills[0] && vec.fills[0].boundVariables && vec.fills[0].boundVariables.color;
      const key = /sincronizat/.test(ctx) ? IC.check16 : /^Button - Sortează/.test((box.parent && box.parent.parent && box.parent.parent.name) || "") ? IC.chevD20 : null;
      if (!key) { un.push("icon " + Math.round(box.width) + " in „" + ctx.slice(0, 24) + "” " + box.id); continue; }
      const i = (await kc(key)).createInstance(); const p = box.parent, ix = p.children.indexOf(box); p.insertChild(ix, i); i.resize(box.width, box.height);
      if (bv) { const v = await figma.variables.getVariableByIdAsync(bv.id); for (const x of i.findAll((n) => /VECTOR|BOOLEAN_OPERATION/.test(n.type) && Array.isArray(n.fills) && n.fills.length)) x.fills = x.fills.map((pp) => pp.type === "SOLID" ? figma.variables.setBoundVariableForPaint(pp, "color", v) : pp); }
      box.remove(); D("icon");
    }
    // tables: clip, last row without bottom border
    for (const tb of root.findAll((n) => n.type === "FRAME" && /^Table/.test(n.name) && n.layoutMode === "GRID")) {
      tb.clipsContent = true; if (tb.parent && tb.parent.type === "FRAME") tb.parent.clipsContent = true;
      const last = Math.max(...tb.children.map((k) => k.gridRowAnchorIndex || 0)); for (const k of tb.children) if ((k.gridRowAnchorIndex || 0) === last && "strokeBottomWeight" in k) k.strokeBottomWeight = 0; D("table");
    }
    const tok = await TOK(root);
    const inPh = (n) => { for (let p = n; p; p = p.parent) if (/^PLACEHOLDER/.test(p.name)) return true; return false; };
    for (const n of root.findAll((x) => x.type === "FRAME" && /^(Button\b|Button - |Text Input|Tab$|Search Input)/.test(x.name) && !inInst(x) && !inPh(x))) un.push("raw " + n.name.slice(0, 40) + " " + n.id);
    cap.remove(); ids["scr_" + A.state] = scr.id; save();
    return { screen: scr.id, h: Math.round(scr.height), done, tok: { text: tok.text, sp: tok.sp, off: tok.off.slice(0, 8) }, unmapped: un.slice(0, 25) };
  }
  if (OP === "tok") { const out = []; for (const id of A.ids) out.push(await TOK(await g(id))); return out; }
  // ---------------------------------------------------------------- block = label · screen · note in a section
  if (OP === "block") {
    const scr = await g(A.screen); const sec = await g(A.section);
    const blk = frame("Block · " + A.state, "VERTICAL"); sec.appendChild(blk); await bindSp(blk, ["itemSpacing"], 16);
    const lab = frame("Screen label · " + A.state, "HORIZONTAL"); blk.appendChild(lab); lab.counterAxisAlignItems = "CENTER"; await bindSp(lab, ["itemSpacing"], 12);
    const tags = await ks(SET.tag); const strong = tags.children.find((c) => c.name.includes("Type=Strong") && c.name.includes("Style=Brand") && c.name.includes("Icon=None") && c.name.includes("Size=Medium")) || tags.children.find((c) => c.name.includes("Style=Brand") && c.name.includes("Size=Medium"));
    const idc = strong.createInstance(); setP(idc, "⌨️ Label", A.state.toUpperCase()); idc.name = "ID chip"; lab.appendChild(idc);
    lab.appendChild(await txt(A.title, "h4", COL.text, "Title"));
    const stat = tags.children.find((c) => c.name.includes("Type=Subtle") && c.name.includes("Style=Brand") && c.name.includes("Icon=None") && c.name.includes("Size=Small")).createInstance(); setP(stat, "⌨️ Label", "In development"); stat.name = "PLACEHOLDER · Status (GEAP 10169:188209)"; lab.appendChild(stat);
    const story = tags.children.find((c) => c.name.includes("Type=Subtle") && c.name.includes("Style=Neutral") && c.name.includes("Icon=None") && c.name.includes("Size=Small")).createInstance(); setP(story, "⌨️ Label", A.story); story.name = "Story"; lab.appendChild(story);
    const link = await txt("Prototype ↗", "bs5", ids.brandVarKey || COL.text, "Link · prototype"); link.setRangeHyperlink(0, link.characters.length, { type: "URL", value: "https://vasileschidu.github.io/geap-sandbox/e-permits-acte-permisive.html?state=" + A.state }); link.setRangeTextDecoration(0, link.characters.length, "UNDERLINE"); lab.appendChild(link);
    blk.appendChild(scr);
    const note = frame("Note · " + A.state, "VERTICAL"); blk.appendChild(note); note.layoutSizingHorizontal = "FILL"; note.fills = await paint(COL.bgSec); await bindRad(note, RAD.r16); await bindSp(note, ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"], 16); await bindSp(note, ["itemSpacing"], 8);
    const nt = tags.children.find((c) => c.name.includes("Type=Subtle") && c.name.includes("Style=Neutral") && c.name.includes("Icon=None") && c.name.includes("Size=Small")).createInstance(); setP(nt, "⌨️ Label", "NOTE DEV / PM"); nt.name = "tag · note"; note.appendChild(nt);
    note.appendChild(await txt(A.state.toUpperCase() + " · " + A.title, "bs5", COL.text, "Note title"));
    const body = await txt(A.note, "bs", COL.text, "Note text"); note.appendChild(body); body.layoutSizingHorizontal = "FILL";
    ids["blk_" + A.state] = blk.id; save();
    return { block: blk.id };
  }
  return "unknown op";
}
