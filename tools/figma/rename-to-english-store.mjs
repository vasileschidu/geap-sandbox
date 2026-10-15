// Prints the use_figma "store" calls for tools/figma/rename-to-english.js from naming-glossary.json.
//   node tools/figma/rename-to-english-store.mjs GEAP|FOD|EKYC|CAB > /tmp/store.txt
// Each printed block (separated by a line "// ---") is the `code` of one use_figma call on that file:
// it writes dict0…dictN (segment glossary, ≤ 30 000 chars each) and head ({T,P,V,PR}) into the root's
// shared plugin data (namespace "geapen"). Run rename-to-english.js (dry, then apply), then clear the keys:
//   for (const k of figma.root.getSharedPluginDataKeys("geapen")) figma.root.setSharedPluginData("geapen", k, "");
import fs from "node:fs";
const g = JSON.parse(fs.readFileSync(new URL("./naming-glossary.json", import.meta.url)));
const f = process.argv[2]; const pf = g.perFile[f];
if (!pf) { console.error("file id: " + Object.keys(g.perFile).join(" | ")); process.exit(1); }
const entries = Object.entries(g.segments); const chunks = []; let cur = {}, size = 0;
for (const [k, v] of entries) { const l = JSON.stringify(k).length + JSON.stringify(v).length + 2; if (size + l > 30000) { chunks.push(cur); cur = {}; size = 0; } cur[k] = v; size += l; }
chunks.push(cur);
const head = { T: pf.textLayers, P: pf.variantProperties, V: pf.variantValues, PR: pf.componentProperties };
const ret = 'return figma.root.getSharedPluginDataKeys("geapen").map(k=>k+":"+figma.root.getSharedPluginData("geapen",k).length);';
chunks.forEach((c, i) => {
  let code = `figma.root.setSharedPluginData("geapen","dict${i}",JSON.stringify(${JSON.stringify(c)}));\n`;
  if (i === chunks.length - 1) code += `figma.root.setSharedPluginData("geapen","head",JSON.stringify(${JSON.stringify(head)}));\n`;
  console.log(code + ret + "\n// ---");
});
