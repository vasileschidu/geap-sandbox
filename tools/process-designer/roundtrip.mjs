// Process Designer — data-model checks (US-52 AC-07 / AC-09, TC 91070, spec § C.2 / I).
// Run: node tools/process-designer/roundtrip.mjs
//  1. every data/flows/*.json opens and saves back BYTE-IDENTICAL (serialize(parse(text)) === text);
//  2. a structural edit + undo (JSON snapshot) is byte-identical again;
//  3. unknown keys survive (an extra key at every level comes back in place);
//  4. the seed validates without save-blocking errors; geometry / routing sanity;
//  5. new / step-only definitions serialise and re-parse to the same text.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pm = require(path.join(ROOT, "core/process-model.js"));

let passed = 0;
const check = (name, fn) => { fn(); passed += 1; console.log(`  ✓ ${name}`); };
const firstDiff = (a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i += 1; return i; };
const same = (a, b, what) => {
  if (a === b) return;
  const i = firstDiff(a, b);
  assert.fail(`${what}: first difference at byte ${i}\n  expected …${JSON.stringify(a.slice(Math.max(0, i - 60), i + 60))}\n  actual   …${JSON.stringify(b.slice(Math.max(0, i - 60), i + 60))}`);
};

const dir = path.join(ROOT, "data/flows");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
assert.ok(files.length > 0, "no flow definitions in data/flows");

console.log("Round-trip (open → save without edits)");
for (const file of files) {
  const text = fs.readFileSync(path.join(dir, file), "utf8");
  check(`${file}: ${Buffer.byteLength(text)} bytes byte-identical`, () => same(text, pm.serialize(pm.parse(text)), file));
  check(`${file}: deep-equal after a second pass`, () => assert.deepEqual(pm.parse(pm.serialize(pm.parse(text))), JSON.parse(text)));
}

const seedText = fs.readFileSync(path.join(dir, "ProcesFluxSimplificatFaraSupervizor.json"), "utf8");

console.log("Edit → undo");
check("move a node, rename, add a connection, then restore the snapshot: identical", () => {
  const def = pm.parse(seedText);
  const snapshot = JSON.stringify(def);
  const n = def.states.find((s) => s.id === "node6");
  n.properties.x = 400; n.title = "Verifică datele";
  n.transitions.push({ event: "next", target: "end" });
  assert.notEqual(pm.serialize(def), seedText);
  same(seedText, pm.serialize(JSON.parse(snapshot)), "after undo");
});
check("an edit changes only the edited line", () => {
  const def = pm.parse(seedText);
  def.states.find((s) => s.id === "node16").properties.x = 1140;
  const a = seedText.split("\n"), b = pm.serialize(def).split("\n");
  assert.equal(a.length, b.length);
  const changed = a.filter((line, i) => line !== b[i]);
  assert.equal(changed.length, 1);
  assert.match(changed[0], /"x": 1130/);
});

console.log("Unknown keys are kept");
check("extra keys at root, state, transition, properties and lane survive", () => {
  const def = JSON.parse(seedText);
  def.futureRoot = { a: 1 };
  def.states[0].futureState = [1, 2];
  def.states[0].transitions[0].futureEdge = "x";
  def.states[0].properties.futureProp = true;
  def.lanes[0].futureLane = null;
  const text = pm.serialize(def);
  const back = pm.parse(text);
  assert.deepEqual(back, def);
  same(text, pm.serialize(back), "second save");
});

console.log("Model");
check("element types of the seed: 1 start, 1 end, 10 activities, 6 decisions, 27 events, 5 sub-processes", () => {
  const def = pm.parse(seedText);
  const count = {};
  def.states.forEach((s) => { const t = pm.typeOf(s, def); count[t] = (count[t] || 0) + 1; });
  assert.deepEqual(count, { start: 1, end: 1, activity: 10, decision: 6, event: 27, subprocess: 5 });
});
check("64 connections, 7 lanes, total lane height 1610", () => {
  const def = pm.parse(seedText);
  assert.equal(def.states.reduce((n, s) => n + (s.transitions || []).length, 0), 64);
  const lanes = pm.lanesLayout(def);
  assert.equal(lanes.length, 7);
  assert.equal(lanes.at(-1).top + lanes.at(-1).height, 1610);
});
check("every node sits inside its lane (laneAt(centre) === laneId)", () => {
  const def = pm.parse(seedText);
  const wrong = def.states.filter((s) => pm.laneAt(def, pm.center(pm.box(s, def)).y)?.id !== s.properties.laneId).map((s) => s.id);
  assert.deepEqual(wrong, []);
});
check("routes are orthogonal, start at the source port and end at the target port", () => {
  const def = pm.parse(seedText);
  const byId = Object.fromEntries(def.states.map((s) => [s.id, s]));
  def.states.forEach((s) => (s.transitions || []).forEach((t) => {
    const a = pm.box(s, def), b = pm.box(byId[t.target], def);
    const auto = pm.facingPorts(a, b);
    const sp = pm.normalPort(a.type, t.sourcePort) || auto.source;
    const tp = pm.normalPort(b.type, t.targetPort) || auto.target;
    const from = pm.portPoint(a, sp), to = pm.portPoint(b, tp);
    const pts = pm.route(from, to, [], t.waypoints);
    assert.deepEqual([pts[0].x, pts[0].y], [from.x, from.y]);
    assert.deepEqual([pts.at(-1).x, pts.at(-1).y], [to.x, to.y]);
    for (let i = 0; i < pts.length - 1; i += 1) assert.ok(pts[i].x === pts[i + 1].x || pts[i].y === pts[i + 1].y, `${s.id}→${t.target} not orthogonal`);
  }));
});
check("the seed has no save-blocking errors (sub-processes known)", () => {
  const def = pm.parse(seedText);
  const refs = def.states.map((s) => s.properties?.processRef).filter(Boolean);
  const issues = pm.validate(def, { processes: [def.name, ...refs], self: def.name });
  const blocking = issues.filter(pm.blocksSave);
  assert.deepEqual(blocking.map((i) => `${i.code} ${i.message}`), []);
});
check("validation codes: E1 unconnected, E2 decision exit without target, E3 unknown sub-process, E4 empty name, E8 one exit, E10 edge into Start", () => {
  const def = pm.parse(seedText);
  def.states.push({ id: "lonely", title: "", kind: "Human", roles: [], transitions: [], properties: { x: 0, y: 0, elementType: "stare", laneId: "lane5" } });
  def.states.find((s) => s.id === "node3").transitions[1].target = "missing";
  def.states.find((s) => s.id === "node44").transitions.pop();
  def.states.find((s) => s.id === "node45").transitions.push({ event: "next", target: "start" });
  const codes = new Set(pm.validate(def, { processes: [], self: def.name }).map((i) => i.code));
  ["E1", "E2", "E3", "E4", "E8", "E10"].forEach((c) => assert.ok(codes.has(c), `${c} missing`));
});
check("Salvează bumps the patch version (1.0.0 → 1.0.1)", () => assert.equal(pm.bumpPatch("1.0.0"), "1.0.1"));
check("a new process = Start + Sfârșit; serialise → parse → serialise is stable", () => {
  const def = pm.newDefinition({ name: "ProcesTest", title: "Proces test" });
  assert.deepEqual(def.states.map((s) => pm.typeOf(s, def)), ["start", "end"]);
  const t = pm.serialize(def);
  same(t, pm.serialize(pm.parse(t)), "new definition");
});
check("a flow known only by its steps becomes Start → steps → Sfârșit", () => {
  const services = JSON.parse(fs.readFileSync(path.join(ROOT, "data/e-permits-services.json"), "utf8"));
  services.flows.filter((f) => !f.definitionUrl).forEach((flow) => {
    const def = pm.fromFlowSteps(flow);
    assert.equal(def.states.length, (flow.steps || []).length + 2);
    const issues = pm.validate(def, { processes: [], self: def.name }).filter((i) => i.code === "E1" || i.code === "E6" || i.code === "E7");
    assert.deepEqual(issues, [], flow.id);
  });
});

console.log(`\n${passed} checks passed`);
