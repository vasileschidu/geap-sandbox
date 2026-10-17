// RAP board (EVO-WEB-3.0 ecosystem, YrIzksVgFqtPqDd5z9zY5h) — shared prelude for every use_figma call.
// Paste this first, then the job code. Library keys: Components lk-03f6…, Foundations lk-e9e8…, EVO DS (filter-chip).
const KV = { // Foundations › 1. Semantic Colors / 3. Sizes (variable keys)
  "text/base/default": "c37576ba1791b00ac80a9a55579913b69d0b8b8f", "text/base/secondary": "5d1a031c4c310a753a2c49f91c89db7ddb8a2287",
  "text/base/tertiary": "9d5ad1d87c1c1e2a9f94a242896a7882a20eda3f", "text/brand/default": "0e3dbef907f67c87aa26db90914a7a9fe1a60591",
  "text/base-inverse/default": "c6263eb190b34c3063061b7cfb0f8e516bdb4be5",
  "text/positive/on-secondary": "099fd46f02d886349a4765ce529778ae5f5af60e", "text/warning/on-secondary": "44efc36845a3a6bb850a3078688fc678d0fe7281",
  "text/danger/on-secondary": "e99e47b27e328ecbcadf4c846b66dd8219e1d499", "text/danger/default": "eb442fe677918b2aa5fdff0afbb9563f4878ec7e",
  "text/warning/default": "52bf55058705256a75d0c0d929bd3ff023bd9639",
  "background/base/default": "ec2921da40a6853a80b0d299be5bc8b1a11fcc89", "background/base/secondary": "2099ba93803f67f67cdcf9153fc08965f5e32f65",
  "background/base/tertiary": "7e60b930dcc5feaf713899211d4a85039e5249a9", "background/base-inverse/default": "6da1572edba387103df19dfec7d7d9b38bc60a08",
  "background/positive/secondary": "a28363c1c96bb3971225372ac624383427c498f5", "background/warning/secondary": "fb9cc0558a93036ba669b0fa0e07ce709ad96f42",
  "background/danger/secondary": "ba49183e1a1e783484904fcabacb499f5013cc6b", "background/brand/secondary": "c81449a9deab3e4126ba5f4387aa99e3f25234ef",
  "background/brand/default": "7104dc11afe3b34f5529876133c95b3be65ee87e", "background/warning/subtle": "fc1ea032bd8f9b78b08efdc0fa27e2a1a22ff923",
  "border/base/default": "9fa253aab4b44e39a049a0cbbd163e4c61e129b6", "border/base/secondary": "32b34126b96bf88c9e83f7be0b676749597308f1",
  "border/positive/secondary": "f07d7cfef9f354ae0c9ea133f8a160078e579273", "border/warning/secondary": "d2aecdddaffbd38f905ae2e30cf4b640ff0d6041",
  "border/danger/secondary": "54d53daa0e9bd08ae76f94a3699d428702b6615d", "border/brand/default": "a0e96ec6ed3e49300298bc9a0b2c879a3b402a87",
  "icon/base/default": "d3eb48f11a0d6190109fbfce85fe29c503086178", "icon/base/secondary": "e7458e4cc347c80122945d7b91d52d42a4c15c8c",
  "icon/base/tertiary": "92561cad5e44e57b4b03dc6f532d609662b02711", "icon/brand/default": "bc354272b09686be692277e55a28ed354a1e50a9",
  "icon/danger/default": "d3dd654ebc0bf68a448c59b2f8c71cb3c407c079", "icon/warning/default": "02e41e6c5aa509880130cf4479a40cca996d9087",
  "icon/positive/default": "df73407830c1b40dfa7e2a708a1b0b5db9ba2032",
  s0: "09bbd3605451b3c79ea224d8e2e42a6830817f77", s2: "4e3c603781105ce160a1dc8d8ea7e97128057074", s4: "983c5b4d9a4e5fa988f0154c9bf4290c7aec9635",
  s6: "82d50194c1a9db8a29ad3e4b6e7eb2af1ff0cc39", s8: "69ac88e41c0fea695fc5c4fd33f0188d1172dc59", s12: "ee4801fea560b76dffab59bd8ee6e31e3b636570",
  s16: "22028a118574e28e30382d57efffac20e14398f0", s20: "8bad70ea75e00f6c6994b2793ccf4c1ee91d0e8c", s24: "49c6a5e43fd55f8fa058dfc13851df2854db5d83",
  s32: "d1bd20c7a50c986d517b076fed38101f5b33c1ff", s40: "7cafa764a9b0b1eb7a8fe2bec67721b5c331cf83", s48: "2a030f2d03121ff975816aa58b5b51e550b62df9",
  s56: "f3817bc19ba08eb020f2f88300b05dacbfa26b49", s64: "43464c51e14946ad337f86a0c002e2db5a167fd7", s80: "6b41a484af89fb00350dc4422ac7fb5e7cf8687a",
  s96: "1cf54ac625fd82238d651a7306f641a7b8f7cdbf", s120: "3a33dc48c02f36d1cb1d21d2cf090ee088049a91",
  r4: "b97e6e89291836739ca83aa5578665f22d96eaa5", r6: "5c211831294ec4aee7827d006133784193921c22", r8: "dc82cc9d79935ad111db3189faf87c70772bed75",
  r12: "1f2268059644ae4bb07e70b94fc8ee2bafcf952e", r16: "5e0761c5c01bfd401113f4132cbbf4b3fb30c7d0", r24: "79848dbe4107a9babdbb8d1861d66890fc200d53",
  r32: "7fe31186bdd3aa604d46343b43be4b8c45c08f25", rfull: "cd76e9200ec61264fe73c9484085ef475ac6c345", b1: "e06116ffefa61d661228f8951cb103076fb97e25"
};
const KT = { // Foundations text styles
  h1: "3a7a84f17af9b1b17bb6b59d7e5f389216e347ac", h3: "baf5f0238882e79bcbabaffcb185862f572c5bcf", h4: "6437d48337bf6d1b766873db20b097b9b08cabf4",
  h5: "75e7dfdca13a793cb25b8e6cb5949ad59c850c85", mh1: "67a58071b24c3d987cfa512cd21ea553b94fb1fe", mh3: "922cb277740e44493176f9044fe3465b237c95b5",
  mh5: "275607150544ddbd2d097c727da7f0baaaf7d7fe", bodyL: "ead7c03fa8d45f21306e772b0576a2c3df1d7237", body: "392200dc0245a58de37af35126f75e6aba9c1fd7",
  body500: "e069d3c303536b6b965b5e68074b3200d638b7b3", small: "1f35541006807f80d766d8eb6ef5ae95d4f5cf6e", small500: "057521fde838188af42abf69eb3789f676421047",
  cap: "8d8e3878d547d107cf6de81a24255f71485db63f", cap500: "f28b7696292db20f926d7897d94e584ceb392ceb", capS: "3ab233d194ba36d0b9986734fdb9d55967dd1448",
  msmall: "31408dc630683e4ead17570ae28301d6e0bf58c5"
};
const KC = { // components (sets / single) by key
  hdrD: "ef41893a2f6488bb4b264a219fa31a8ec9f562a8", hdrM: "e0e8b8368ae9c8967e1ddbfb27434abd0f894ecd", crumbs: "cafee05e281722e69edb99b00d68c0e1fd48daa8",
  search: "a27b4efaed053f6cd4a57411a032d7391174c425", btnFR: "2cbe2c350e7c6b3948dc449660ede8355511c384", btnFC: "fcf938f6ce9e31ae7f0f11838ee889335b4b7728",
  btnTC: "a97526693c2d549c3c72e7ce70b4f2bf037a411e", link: "34f60bd2296ecc1f3301dba795e1c2109b659902", chip: "a2731000280087a1f254d5ad13d3725966c8181a",
  checkbox: "e915a93ec9c4b91546cfb5788ededa656f98069a", avatar: "c622e4206c2a122385a0a1b0089b7e1c75fe7574", pagination: "f7149ae3d1e133f687b1677ac366006e73ad89b3",
  select: "24351877baeb81b99cceea90d885b3455191ac62"
};
const KI = { // Foundations icons (component keys)
  search20: "e0e0159cf2a72d132f613b33d183287e05fb0e5d", filter20: "d7ef1839769646e2b2d27b2a54d4b38787bcd775", eye20: "faa2ea508755b47b8354bf6bb7d659776a525294",
  chevL20: "ab64d0faf05f5d237524e6d64a20387f826382b5", chevR20: "d5d6c61279d8018dd0bd8c4015a52d2a394d5324", chevB20: "ec31e2fd59c87fcf1bb6eb4ccfdde10307f56ce0",
  chevB16: "a9d10e062692212dde688d564b091a62be22d2f7", cross20: "3ccb9372951f0b3c922b004d8966a680404cd11f", cross16: "3f8e0ba57dfa5f76123ad5a4285b9172f3562f41",
  person20: "4559c5554720e8594551a8bef25d9982aa3f9f76", suitcase20: "13c704752d82ff4667a4a021d2f4b93fa9168ec6" /* PJ = 20/business (2026-10-17) */, suitcase24: "b135d6dcb6dab0384a09075067785932030ef967" /* PJ = 24/business */,
  arrowR16: "47f9a6b88b7db7d2f0c5fa812189354725863438", arrowR20: "d4bcc2d06aae1f996b75052e41d3755a1c1e4978", copy20: "89c577ec6b8f893a92741093af50a237eb383016",
  copy16: "19019692df35555b898043170eaafa8fb684829e", chevR16: "25b51b97af76249c74d1ec6461b9f0e5a231ed86", search24: "2ade55700102fbdb99f3d00cc239f1292cb985e8"
};
const DROP_FX = "S:fc1dad56be71b69894b7f3586befb682c9a2f5fc,5088:9"; // „dropdown-effect” (GEAP style, resolves by id here)
const _v = {}, _t = {}, _c = {}, _i = {};
const vr = async (n) => _v[n] || (_v[n] = await figma.variables.importVariableByKeyAsync(KV[n]));
const ts = async (n) => _t[n] || (_t[n] = await figma.importStyleByKeyAsync(KT[n]));
const cset = async (n) => _c[n] || (_c[n] = await figma.importComponentSetByKeyAsync(KC[n]));
const icon = async (n) => _i[n] || (_i[n] = await figma.importComponentByKeyAsync(KI[n]));
const paint = async (node, name) => { const v = await vr(name); let p = figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", v); try { const val = v.resolveForConsumer(node).value; p = figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: val.r, g: val.g, b: val.b }, opacity: val.a ?? 1 }, "color", v); } catch (e) {} return p; };
const fillV = async (node, name) => { node.fills = [await paint(node, name)]; };
const strokeV = async (node, name, w = 1, align = "INSIDE") => { node.strokes = [await paint(node, name)]; node.strokeWeight = w; node.strokeAlign = align; try { node.setBoundVariable("strokeWeight", await vr("b1")); } catch (e) {} };
const sp = async (node, field, val) => { node[field] = val; if (val === 0) return; const k = "s" + val; if (KV[k]) node.setBoundVariable(field, await vr(k)); };
const pad = async (node, t, r = t, b = t, l = r) => { await sp(node, "paddingTop", t); await sp(node, "paddingRight", r); await sp(node, "paddingBottom", b); await sp(node, "paddingLeft", l); };
const rad = async (node, r) => { for (const f of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) { node[f] = r === "full" ? 9999 : r; const k = r === "full" ? "rfull" : "r" + r; if (r && KV[k]) node.setBoundVariable(f, await vr(k)); } };
const AL = async (name, dir = "VERTICAL", o = {}) => { const f = figma.createFrame(); f.name = name; f.layoutMode = dir; f.fills = []; f.clipsContent = false; f.primaryAxisSizingMode = "AUTO"; f.counterAxisSizingMode = "AUTO"; if (o.gap != null) await sp(f, "itemSpacing", o.gap); if (o.pad) await pad(f, ...o.pad); if (o.fill) await fillV(f, o.fill); if (o.r != null) await rad(f, o.r); if (o.align) f.counterAxisAlignItems = o.align; if (o.main) f.primaryAxisAlignItems = o.main; return f; };
const TX = async (chars, style, color, o = {}) => { const t = figma.createText(); const st = await ts(style); await figma.loadFontAsync(st.fontName); await t.setTextStyleIdAsync(st.id); t.characters = chars; await fillV(t, color); t.name = o.name || "Text"; if (o.w) { t.textAutoResize = "HEIGHT"; t.resize(o.w, t.height); } else t.textAutoResize = "WIDTH_AND_HEIGHT"; return t; };
const put = (parent, child, o = {}) => { parent.appendChild(child); if (o.fillW) child.layoutSizingHorizontal = "FILL"; if (o.fillH) child.layoutSizingVertical = "FILL"; if (o.hugW) child.layoutSizingHorizontal = "HUG"; if (o.grow) child.layoutGrow = 1; return child; };
const variant = (set, props) => set.children.find(c => Object.entries(props).every(([k, v]) => c.variantProperties && c.variantProperties[k] === v));
const inst = async (setKey, props = {}) => { const s = await cset(setKey); const comp = variant(s, props) || s.defaultVariant; return comp.createInstance(); };
const setP = (instance, props) => { const defs = instance.componentProperties; const o = {}; for (const [k, v] of Object.entries(props)) { const key = Object.keys(defs).find(d => d === k || d.split("#")[0] === k || d.split("#")[0].replace(/^[^A-Za-z]+/, "").trim() === k); if (key) o[key] = v; } instance.setProperties(o); return instance; };
const iconInst = async (n, color) => { const c = await icon(n); const i = c.createInstance(); if (color) { for (const v of i.findAll(x => "fills" in x && x.type === "VECTOR" || x.type === "BOOLEAN_OPERATION")) { if (v.fills && v.fills.length) v.fills = [await paint(v, color)]; } } return i; };
const RAPID = JSON.parse(figma.root.getSharedPluginData("rap", "ids") || "{}");
const saveId = (k, id) => { RAPID[k] = id; figma.root.setSharedPluginData("rap", "ids", JSON.stringify(RAPID)); };
const getL = async (k) => RAPID[k] ? await figma.getNodeByIdAsync(RAPID[k]) : null;
return { vr, ts, cset, icon, paint, fillV, strokeV, sp, pad, rad, AL, TX, put, variant, inst, setP, iconInst, RAPID, saveId, getL, KV, KT, KC, KI, DROP_FX };
