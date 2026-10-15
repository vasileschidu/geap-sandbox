// rename-to-english.js — rename every LOCAL Figma name to English (names only, never characters / layout / fills).
// Run with mcp use_figma (skillNames resource:figma-use). Glossary: tools/figma/naming-glossary.json.
//
// The glossary is too big for one call, so the part a file needs lives in its root shared plugin data:
//   figma.root.setSharedPluginData("geapen", "dict0" | "dict1" …, JSON.stringify({ro: en}))  segment glossary
//   figma.root.setSharedPluginData("geapen", "head", JSON.stringify({ T, P, V, PR }))
//     T  = structural text-layer names {old: new}, P = variant property names, V = variant values,
//     PR = TEXT / BOOLEAN / INSTANCE_SWAP property names (without #id).
//   Print those calls with: node tools/figma/rename-to-english-store.mjs GEAP|FOD|EKYC|CAB (from naming-glossary.json).
//   The translator below splits a
//   name on its separators (" · ", " — ", " → ", " / ", "(", "„”" …) and translates each segment, plus
//   rules: dates (13 octombrie 2026 → 13 October 2026), "Head 12" / "12 head", "C07 head", "C02·head".
//   It was verified offline to give exactly the reviewed name map (0 differences on 10,402 names).
// Then this script, with MODE = "dry" (counts only, no writes) or "apply". Clear the keys when done.
//
// Rules it enforces:
//   - never descends into instances (instance sublayers keep their main component's names);
//   - remote library instances whose name is the library default are left alone;
//   - text layers: only when the name is not a copy of the content (characters do not start with it);
//   - variant property / value renames only when the new variant names stay unique (instances keep
//     their variant because they point at the variant component, not at its name);
//   - every renamed node keeps its old name in shared plugin data: ("geapen", "old") on layers / instances /
//     pages, ("geapen", "oldMain") on components and component sets → revert below;
//   - component property renames are logged on the set / component ("geapen", "props").
// REVERT: walk the same way; components / sets: name = getSharedPluginData("geapen","oldMain"); other nodes:
//   name = getSharedPluginData("geapen","old") — but for an INSTANCE only when that value differs from its main
//   component's value (instances inherit plugin data). Props: editComponentProperty(newKey, {name: old}) from
//   the "props" log on the set / component.

const MODE = "dry";            // "dry" (counts only, no writes) | "apply"
const PAGE_IDS = null;         // null = every page; or ["10566:10080", …] — big files: one group per call
const ROOT_IDS = null;         // null = whole pages; or ["10132:764"] = only inside these nodes (no page names)
const NS = "geapen";
const D = {};
for (const k of figma.root.getSharedPluginDataKeys(NS)) if (k.startsWith("dict")) Object.assign(D, JSON.parse(figma.root.getSharedPluginData(NS, k)));
const M = JSON.parse(figma.root.getSharedPluginData(NS, "head"));
const SPLIT = /(\s+[·—→←↔\/+×]\s+|\s+-\s+|\s*->\s*|,\s+|:\s+|\s*\(\s*|\s*\)\s*|[„”«»"“]|\s*\/\s*|\s+–\s+|\s+&\s+|=)/;
const MONTHS = { ianuarie: "January", februarie: "February", martie: "March", aprilie: "April", mai: "May", iunie: "June", iulie: "July", august: "August", septembrie: "September", octombrie: "October", noiembrie: "November", decembrie: "December" };
const DATE = /^(\d{1,2})(\s)(ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie)(\s)(\d{4})$/;
const NUMTAIL = /^(.*?)\s+([#\d][\w#,.%:\/()+-]*)$/;
const NUMHEAD = /^(\d+[,.]?\d*)\s+(.*)$/;
const IDHEAD = /^([A-Z]\d{1,2}[a-z]?\d?[a-z]?)\s+(.*)$/;
const DOTJOIN = /^(\w+)·(.*)$/;
const SUFFIX = /^(.*?)(:margin|:align|:transform|:scroll-content)$/;
function makeTranslator(G) {
  const has = (k) => Object.prototype.hasOwnProperty.call(G, k);
  function tseg(s) {
    if (has(s)) return G[s];
    let m = DATE.exec(s); if (m) return m[1] + m[2] + MONTHS[m[3]] + m[4] + m[5];
    m = NUMTAIL.exec(s); if (m && has(m[1])) return G[m[1]] + " " + m[2];
    m = NUMHEAD.exec(s); if (m && has(m[2])) return m[1] + " " + G[m[2]];
    m = IDHEAD.exec(s); if (m) { const t = tseg(m[2]); if (t != null) return m[1] + " " + t; }
    m = DOTJOIN.exec(s); if (m) { const a = tseg(m[1]), b = tseg(m[2].trim()); if (a != null || b != null) return (a == null ? m[1] : a) + "·" + (b == null ? m[2].trim() : b); }
    m = SUFFIX.exec(s); if (m) { const t = tseg(m[1]); if (t != null) return t + m[2]; }
    return null;
  }
  return function translate(name) {
    if (has(name)) return G[name];
    const parts = name.split(SPLIT); let out = "";
    for (let i = 0; i < parts.length; i++) { const p = parts[i]; if (i % 2 === 1 || !p.trim()) { out += p; continue; } const lead = p.slice(0, p.length - p.trimStart().length), trail = p.slice(p.trimEnd().length); const t = tseg(p.trim()); out += t == null ? p : lead + t + trail; }
    return out;
  };
}
const translate = makeTranslator(D);
const cache = new Map();
const tx = (name) => { if (cache.has(name)) return cache.get(name); const t = translate(name); const r = t !== name ? t : null; cache.set(name, r); return r; };
const apply = MODE === "apply";
const cnt = { pages: 0, frames: 0, sections: 0, components: 0, sets: 0, instances: 0, texts: 0, other: 0, variantNames: 0, props: 0 };
const skipped = []; const errors = []; const perPage = {}; const logs = [];
let curPage = "";
// components / sets keep their snapshot under "oldMain": instances inherit a main component's plugin data,
// so an "old" key on a component would show up (wrongly) on every instance.
const isMain = (n) => n.type === "COMPONENT" || n.type === "COMPONENT_SET";
const ownOld = (n) => { const v = n.getSharedPluginData(NS, "old"); if (!v) return ""; if (n.type === "INSTANCE") { const mc = n.mainComponent; if (mc && mc.getSharedPluginData(NS, "old") === v) return ""; } return v; };
const snap = (n) => { if (isMain(n)) { if (!n.getSharedPluginData(NS, "oldMain")) n.setSharedPluginData(NS, "oldMain", n.name); } else if (!ownOld(n)) n.setSharedPluginData(NS, "old", n.name); };
const migrate = (n) => { if (apply && isMain(n)) { const v = n.getSharedPluginData(NS, "old"); if (v) { if (!n.getSharedPluginData(NS, "oldMain")) n.setSharedPluginData(NS, "oldMain", v); n.setSharedPluginData(NS, "old", ""); } } };
const rename = (n, to, kind) => { cnt[kind]++; perPage[curPage] = (perPage[curPage] || 0) + 1; if (!apply) return; try { snap(n); n.name = to; } catch (e) { errors.push(n.id + " " + String(e).slice(0, 80)); } };
const kindOf = (n) => n.type === "FRAME" ? "frames" : n.type === "SECTION" ? "sections" : n.type === "COMPONENT" ? "components" : n.type === "COMPONENT_SET" ? "sets" : "other";
function doProps(owner) {
  const defs = owner.componentPropertyDefinitions; const log = [];
  if (owner.type === "COMPONENT_SET") {
    const variants = owner.children.filter((c) => c.type === "COMPONENT");
    const keyMap = {}; const oldKeys = Object.keys(defs).filter((k) => defs[k].type === "VARIANT");
    for (const k of oldKeys) keyMap[k] = M.P[k] || k;
    const newKeys = Object.values(keyMap);
    if (new Set(newKeys).size !== newKeys.length) { skipped.push(owner.id + " key collision " + owner.name); return; }
    const plan = variants.map((v) => [v, v.name.split(/,\s*/).map((part) => { const i = part.indexOf("="); if (i < 0) return part; const k = part.slice(0, i).trim(), val = part.slice(i + 1).trim(); return (keyMap[k] || M.P[k] || k) + "=" + (M.V[val] || val); }).join(", ")]);
    const outNames = plan.map((p) => p[1]);
    if (new Set(outNames).size !== outNames.length) { skipped.push(owner.id + " value collision " + owner.name + " :: " + plan.filter(([v,to]) => outNames.indexOf(to) !== outNames.lastIndexOf(to)).map(([v,to]) => v.name).slice(0,4).join(" | ")); return; }
    const changed = plan.filter(([v, to]) => v.name !== to);
    cnt.variantNames += changed.length;
    if (apply && changed.length) {
      for (const k of oldKeys) if (keyMap[k] !== k) { try { owner.editComponentProperty(k, { name: keyMap[k] }); log.push(["VARIANT", k, keyMap[k]]); } catch (e) { log.push(["VARIANT-by-name", k, keyMap[k]]); } }
      for (const [v, to] of plan) if (v.name !== to) { try { snap(v); v.name = to; } catch (e) { errors.push(v.id + " " + String(e).slice(0, 80)); } }
    }
  }
  const cur = owner.componentPropertyDefinitions;
  const bases = Object.keys(cur).filter((k) => cur[k].type !== "VARIANT").map((k) => k.replace(/#[^#]*$/, ""));
  for (const key of Object.keys(cur)) {
    if (cur[key].type === "VARIANT") continue;
    const base = key.replace(/#[^#]*$/, ""); const to = M.PR[base];
    if (!to || to === base) continue;
    if (bases.includes(to)) { skipped.push(owner.id + " prop exists " + to + " in " + owner.name); continue; }
    cnt.props++;
    if (apply) { try { owner.editComponentProperty(key, { name: to }); log.push([cur[key].type, base, to]); } catch (e) { errors.push(owner.id + " prop " + base + " " + String(e).slice(0, 60)); } }
  }
  if (apply && log.length) { logs.push(owner.id); const prev = owner.getSharedPluginData(NS, "props"); owner.setSharedPluginData(NS, "props", JSON.stringify((prev ? JSON.parse(prev) : []).concat(log))); }
}
function walk(n) {
  const t = n.type;
  if (t === "TEXT") { const to = M.T[n.name]; if (to && !n.autoRename) { const chars = n.characters.replace(/ /g, " "), nm = n.name.replace(/ /g, " ").replace(/…$/, ""); if (!chars.startsWith(nm)) rename(n, to, "texts"); } return; }
  if (t === "INSTANCE") { const to = tx(n.name); if (to) { const mc = n.mainComponent; const set = mc && mc.parent && mc.parent.type === "COMPONENT_SET" ? mc.parent : null; const libDefault = mc && mc.remote && (n.name === mc.name || (set && n.name === set.name)); if (!libDefault) rename(n, to, "instances"); } return; }
  migrate(n);
  if (t === "COMPONENT_SET" || (t === "COMPONENT" && n.parent.type !== "COMPONENT_SET")) { if (!n.remote) doProps(n); }
  if (!(t === "COMPONENT" && n.parent.type === "COMPONENT_SET")) { const to = tx(n.name); if (to) rename(n, to, kindOf(n)); }
  if ("children" in n) for (const c of n.children) walk(c);
}
const t0 = Date.now();
if (ROOT_IDS) { for (const id of ROOT_IDS) { const r = await figma.getNodeByIdAsync(id); if (r) { let pg = r; while (pg.type !== "PAGE") pg = pg.parent; await pg.loadAsync(); curPage = pg.id; walk(r); } } }
else for (const p of figma.root.children) { if (PAGE_IDS && !PAGE_IDS.includes(p.id)) continue; curPage = p.id; { const to = tx(p.name); if (to) rename(p, to, "pages"); } await p.loadAsync(); for (const c of p.children) walk(c); }
return { mode: MODE, ms: Date.now() - t0, cnt, total: Object.values(perPage).reduce((a,b)=>a+b,0), perPage, skipped, errors: errors.slice(0, 30), errorCount: errors.length, propOwners: logs.length };
