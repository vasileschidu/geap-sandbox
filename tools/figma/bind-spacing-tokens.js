// bind-spacing-tokens.js — bind local auto-layout spacing, corner radius (and plain colours) to the
// published Foundations variables (2026-10-15). Run as the `code` of use_figma, one page per call.
//   OPT.mode   "dry"    → counts (bound / already bound / off-scale / colour) + samples, nothing changes
//              "apply"  → binds and stores a snapshot on the page
//                         (sharedPluginData "geapqa" / "bindtok-<stamp>-<chunk>": "id:prop,prop;…")
//              "revert" → unbinds everything in OPT.stamp's snapshot (values stay)
//   OPT.from / OPT.to   slice of page.children (big pages: run in slices, apply appends to the snapshot)
//   OPT.colour          also bind SOLID frame fills / strokes whose hex matches exactly one token
//   OPT.zeros           also bind 0 values (default false: 0 = no value, left unbound and counted)
// Run tools/figma/border-padding.js first — it strips the +1 border artifacts so they land on the scale.
// Never touches nodes inside instances (library internals). A LOCAL instance's own padding / gap / radius is
// bound only when it differs from its main component (= a local override). Remote instances are skipped.
// Off-scale values are never snapped — they are listed (offscale histogram + samples with node ids).
const OPT = { page: "PAGE_ID", mode: "dry", stamp: "20261015", from: 0, to: 1e9, colour: true, zeros: false };

// Foundations › 3. Sizes (lk e9e8…), keys verified 2026-10-15
const SP = { 0: "09bbd3605451b3c79ea224d8e2e42a6830817f77", 2: "4e3c603781105ce160a1dc8d8ea7e97128057074", 4: "983c5b4d9a4e5fa988f0154c9bf4290c7aec9635", 6: "82d50194c1a9db8a29ad3e4b6e7eb2af1ff0cc39", 8: "69ac88e41c0fea695fc5c4fd33f0188d1172dc59", 12: "ee4801fea560b76dffab59bd8ee6e31e3b636570", 16: "22028a118574e28e30382d57efffac20e14398f0", 20: "8bad70ea75e00f6c6994b2793ccf4c1ee91d0e8c", 24: "49c6a5e43fd55f8fa058dfc13851df2854db5d83", 32: "d1bd20c7a50c986d517b076fed38101f5b33c1ff", 40: "7cafa764a9b0b1eb7a8fe2bec67721b5c331cf83", 48: "2a030f2d03121ff975816aa58b5b51e550b62df9", 56: "f3817bc19ba08eb020f2f88300b05dacbfa26b49", 64: "43464c51e14946ad337f86a0c002e2db5a167fd7", 80: "6b41a484af89fb00350dc4422ac7fb5e7cf8687a", 96: "1cf54ac625fd82238d651a7306f641a7b8f7cdbf", 120: "3a33dc48c02f36d1cb1d21d2cf090ee088049a91" };
const RD = { 0: "a3519aaba95f60ecf5f06ef367e635925c6fdcdf", 4: "b97e6e89291836739ca83aa5578665f22d96eaa5", 6: "5c211831294ec4aee7827d006133784193921c22", 8: "dc82cc9d79935ad111db3189faf87c70772bed75", 12: "1f2268059644ae4bb07e70b94fc8ee2bafcf952e", 16: "5e0761c5c01bfd401113f4132cbbf4b3fb30c7d0", 24: "79848dbe4107a9babdbb8d1861d66890fc200d53", 32: "7fe31186bdd3aa604d46343b43be4b8c45c08f25", full: "cd76e9200ec61264fe73c9484085ef475ac6c345" };
// Foundations › 1. Semantic Colors — opaque hex → the one non-state token with the right scope
const CF = { "#ffffff": "ec2921da40a6853a80b0d299be5bc8b1a11fcc89", "#f5f5f5": "2099ba93803f67f67cdcf9153fc08965f5e32f65", "#f1f1f1": "7e60b930dcc5feaf713899211d4a85039e5249a9", "#f7f7f7": "83539917c466aeae74fcac6a1e52fc83d1e797e7", "#1e1e1e": "6da1572edba387103df19dfec7d7d9b38bc60a08", "#0058d2": "7104dc11afe3b34f5529876133c95b3be65ee87e", "#e8f0fb": "c81449a9deab3e4126ba5f4387aa99e3f25234ef", "#f1f6fd": "e7c28f3c39586783751ecc339b096704a1591449", "#00295a": "f31fb6a315ca2bb2b5fd658ef55ed0f0db3f07e2", "#d92d20": "1222f60d579f36d791b5e9c0061c7bc8045a186c", "#fee4e2": "ba49183e1a1e783484904fcabacb499f5013cc6b", "#fefafa": "3664ab02c71996d3eed8b74fe7b55d9ad8eed502", "#039855": "c29791d44ebbf419276590e7f8f6966193230f78", "#e6f5ee": "a28363c1c96bb3971225372ac624383427c498f5", "#f0f9f4": "fe31ec552c743322b74eeb0ea4a93cc2abade706", "#fdb022": "76c9ad875d98898691c4c7d29a2cf75aabc45c2b", "#feefc6": "fb9cc0558a93036ba669b0fa0e07ce709ad96f42", "#fefbf4": "fc1ea032bd8f9b78b08efdc0fa27e2a1a22ff923", "#fec84b": "069907079d6e7e3477b06600e75638ba36584730" };
const CS = { "#d9d9d9": "9fa253aab4b44e39a049a0cbbd163e4c61e129b6", "#b2b2b2": "32b34126b96bf88c9e83f7be0b676749597308f1", "#444444": "7c840683c367deef3603adf2ebb456635572640c", "#121212": "1763f43d71104f755212a416cd61c86279182ed2", "#ffffff": "0c03e562df806934e8c73cf7906828917b4cd8d8", "#0058d2": "a0e96ec6ed3e49300298bc9a0b2c879a3b402a87", "#ccdef6": "f4f8e8a306c5fa8a1a95b9e160714fda6d5bd0d2", "#027948": "a2c2323d9f6a7d88bebcc9d36ae8d8d5d31df4ac", "#cdeadd": "f07d7cfef9f354ae0c9ea133f8a160078e579273", "#d92d20": "bc39b7f802d29cfe2fd078820b6f65ee3939fa45", "#fecdc9": "54d53daa0e9bd08ae76f94a3699d428702b6615d", "#dc6803": "57f0fadaff608653ab84c5a9afb9ec0dacb64719", "#fedf89": "d2aecdddaffbd38f905ae2e30cf4b640ff0d6041" };
// fills that match only state tokens (hover / active / disabled) → ambiguous, reported: #d9d9d9 #b2b2b2 #444444 #383838 …

const PAD = ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"];
const RAD = ["topLeftRadius", "topRightRadius", "bottomRightRadius", "bottomLeftRadius"];
const page = await figma.getNodeByIdAsync(OPT.page);
await figma.setCurrentPageAsync(page);
const PFX = "bindtok-" + OPT.stamp + "-";

if (OPT.mode === "revert") {
  let n = 0, miss = 0;
  for (const k of page.getSharedPluginDataKeys("geapqa").filter((k) => k.startsWith(PFX))) {
    for (const rec of page.getSharedPluginData("geapqa", k).split(";").filter(Boolean)) {
      const [id, props] = rec.split(":");
      const node = await figma.getNodeByIdAsync(id);
      if (!node) { miss++; continue; }
      for (const p of props.split(",")) {
        if (p.startsWith("fills") || p.startsWith("strokes")) {
          const [key, i] = p.split("."); const arr = JSON.parse(JSON.stringify(node[key]));
          if (arr[+i]) { arr[+i] = figma.variables.setBoundVariableForPaint(arr[+i], "color", null); node[key] = arr; }
        } else node.setBoundVariable(p, null);
        n++;
      }
    }
    page.setSharedPluginData("geapqa", k, "");
  }
  return { unbound: n, missing: miss };
}

const cache = {};
async function V(key) { if (!cache[key]) cache[key] = await figma.variables.importVariableByKeyAsync(key); return cache[key]; }
const hex = (c) => "#" + [c.r, c.g, c.b].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
const res = { frames: 0, bound: { padding: 0, gap: 0, radius: 0, colour: 0 }, already: { padding: 0, gap: 0, radius: 0, colour: 0 },
  zeros: 0, offscale: {}, offSamples: [], colourUnmatched: {}, colourSamples: [], localOverrides: 0, skippedRemoteInst: 0, errors: [] };
const snap = [];
const off = (n, p, v, cat) => { const k = cat + " " + v;
  res.offscale[k] = (res.offscale[k] || 0) + 1; if (res.offSamples.length < 40) res.offSamples.push(n.id + " " + n.name.slice(0, 22) + " " + p + "=" + v); };

async function bindNum(n, p, cat, map, rec, main) {
  const v = n[p];
  if (typeof v !== "number") return;
  if (main && main[p] === v) return; // instance value = component value → not a local override
  const bv = n.boundVariables || {};
  if (bv[p]) { res.already[cat]++; return; }
  if (v === 0 && !OPT.zeros) { res.zeros++; return; }
  const key = cat === "radius" ? (v >= 999 ? map.full : map[Math.round(v * 100) / 100]) : map[Math.round(v * 100) / 100];
  if (!key) { off(n, p, v, cat); return; }
  if (main) res.localOverrides++;
  res.bound[cat]++;
  if (OPT.mode !== "apply") return;
  try { n.setBoundVariable(p, await V(key)); rec.push(p); } catch (e) { if (res.errors.length < 10) res.errors.push(n.id + " " + p + " " + e.message); }
}

async function bindColour(n, key, rec) {
  if (!Array.isArray(n[key]) || !n[key].length) return;
  const arr = JSON.parse(JSON.stringify(n[key])); let changed = false;
  for (let i = 0; i < arr.length; i++) {
    const p = arr[i];
    if (p.type !== "SOLID" || p.visible === false) continue;
    if (p.boundVariables && p.boundVariables.color) { res.already.colour++; continue; }
    const h = hex(p.color) + ((p.opacity ?? 1) < 1 ? "@" + Math.round(p.opacity * 100) : "");
    const k = (p.opacity ?? 1) < 1 ? null : (key === "fills" ? CF : CS)[h];
    if (!k) { const t = key[0] + " " + h; res.colourUnmatched[t] = (res.colourUnmatched[t] || 0) + 1; if (res.colourSamples.length < 20) res.colourSamples.push(n.id + " " + n.name.slice(0, 20) + " " + t); continue; }
    res.bound.colour++;
    if (OPT.mode !== "apply") continue;
    arr[i] = figma.variables.setBoundVariableForPaint(p, "color", await V(k)); changed = true; rec.push(key + "." + i);
  }
  if (changed) n[key] = arr;
}

async function visit(n) {
  const rec = [];
  const isInst = n.type === "INSTANCE";
  let main = null;
  if (isInst) {
    main = await n.getMainComponentAsync();
    if (!main || main.remote) { res.skippedRemoteInst++; return; }
  }
  res.frames++;
  const al = n.layoutMode && n.layoutMode !== "NONE";
  if (al) {
    for (const p of PAD) await bindNum(n, p, "padding", SP, rec, main);
    if (n.layoutMode !== "GRID" && n.primaryAxisAlignItems !== "SPACE_BETWEEN") await bindNum(n, "itemSpacing", "gap", SP, rec, main);
    if (n.layoutWrap === "WRAP" && n.counterAxisAlignContent !== "SPACE_BETWEEN" && typeof n.counterAxisSpacing === "number") await bindNum(n, "counterAxisSpacing", "gap", SP, rec, main);
    if (n.layoutMode === "GRID") { await bindNum(n, "gridRowGap", "gap", SP, rec, main); await bindNum(n, "gridColumnGap", "gap", SP, rec, main); }
  }
  for (const p of RAD) await bindNum(n, p, "radius", RD, rec, main);
  if (OPT.colour && !isInst) { await bindColour(n, "fills", rec); await bindColour(n, "strokes", rec); }
  if (rec.length) snap.push(n.id + ":" + rec.join(","));
}

const list = [];
(function walk(arr) {
  for (const n of arr) {
    if (n.type === "INSTANCE") { list.push(n); continue; } // own props only, never inside
    if (n.type === "FRAME" || n.type === "COMPONENT" || n.type === "COMPONENT_SET") list.push(n);
    if ("children" in n) walk(n.children);
  }
})(page.children.slice(OPT.from, OPT.to));
for (const n of list) await visit(n);

if (OPT.mode === "apply" && snap.length) {
  const keys = page.getSharedPluginDataKeys("geapqa").filter((k) => k.startsWith(PFX));
  let s = "", i = keys.length;
  for (const r of snap) { if (s.length + r.length > 90000) { page.setSharedPluginData("geapqa", PFX + i++, s); s = ""; } s += r + ";"; }
  if (s) page.setSharedPluginData("geapqa", PFX + i, s);
}
res.snapNodes = snap.length;
res.offscale = Object.entries(res.offscale).sort((a, b) => b[1] - a[1]).slice(0, 30);
res.colourUnmatched = Object.entries(res.colourUnmatched).sort((a, b) => b[1] - a[1]).slice(0, 20);
res.children = page.children.length;
return res;
