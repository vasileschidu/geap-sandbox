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

console.log("Batch 2 — configuration keys (edit + reverse = same bytes)");
const reversible = (name, edit, reverse) => check(name, () => {
  const def = pm.parse(seedText);
  edit(def);
  const edited = pm.serialize(def);
  assert.notEqual(edited, seedText, "the edit changed nothing");
  same(edited, pm.serialize(pm.parse(edited)), "edited re-save");
  reverse(def);
  same(seedText, pm.serialize(def), "after the reverse edit");
});
const st = (def, id) => def.states.find((s) => s.id === id);
reversible("decision guard: add a condition (AND) and an OR group, then remove them", (def) => {
  const g = st(def, "node3").transitions[0].guard;
  g.groups[0].conditions.push({ sourceField: "WithPayment", operator: "isFalse", valueKind: "static" });
  g.groups.push({ conditions: [{ sourceField: "CaseDecisionId", operator: "eq", valueKind: "static", value: "1" }] });
}, (def) => { const g = st(def, "node3").transitions[0].guard; g.groups.pop(); g.groups[0].conditions.pop(); });
reversible("decision: default branch toggled (guard removed / restored)", (def) => {
  const t = st(def, "node3").transitions[0];
  def.__g = t.guard; delete t.guard;
}, (def) => {
  /* the guard goes back in its export place (before sourcePort): PM.putKey */
  pm.putKey(st(def, "node3").transitions[0], "guard", def.__g, "transition");
  delete def.__g;
});
reversible("connection colour + width (US-51 AC-06), then back to implicit", (def) => {
  Object.assign(st(def, "node6").transitions[0], { color: "brand", width: 3 });
}, (def) => { const t = st(def, "node6").transitions[0]; delete t.color; delete t.width; });
reversible("activity: own roles, field assignment, a term, a form on an action", (def) => {
  const n = st(def, "node6");
  n.roles.push("0c849b78-8e11-4763-bf9f-dc36ed598f9f");
  n.fieldAssignments.push({ name: "TeamId", value: "T-01" });
  n.properties.terms.push({ term: "RaspunsSolicitant", action: "pause" });
  pm.setKey(n.transitions[0], "formName", "", "transition");
  pm.setKey(n, "description", "", "state");
}, (def) => {
  const n = st(def, "node6");
  n.roles.pop(); n.fieldAssignments.pop(); n.properties.terms.pop();
  pm.setKey(n.transitions[0], "formName", "SuspendareTermen", "transition");
  pm.setKey(n, "description", "Verifică date", "state");
});
reversible("every key the panels remove comes back in its export place (putKey)", (def) => {
  def.__saved = def.states.map((s) => s.transitions.map((t) => ({ ...t })));
  def.states.forEach((s) => s.transitions.forEach((t) => ["guard", "formName", "labelDx", "labelDy", "sourcePort", "targetPort", "waypoints"].forEach((k) => delete t[k])));
}, (def) => {
  def.states.forEach((s, si) => s.transitions.forEach((t, ti) => {
    const was = def.__saved[si][ti];
    ["targetPort", "guard", "waypoints", "sourcePort", "labelDy", "formName", "labelDx"].forEach((k) => { if (k in was) pm.putKey(t, k, was[k], "transition"); });
  }));
  delete def.__saved;
});
reversible("event: processor parameters (templates, audit code, object type, moment)", (def) => {
  st(def, "node41").properties.templateCodes.push("Case.Coordinated");
  st(def, "node29").properties.auditCode = "GEAP.CASE.CLOSED";
  st(def, "RecordState2").properties.objectType = "Permit";
}, (def) => {
  st(def, "node41").properties.templateCodes.pop();
  st(def, "node29").properties.auditCode = "GEAP.CASE.DISTRIBUTED";
  st(def, "RecordState2").properties.objectType = "Case";
});
reversible("lanes: reorder, then the original order", (def) => pm.reorderLanes(def, ["lane2", "lane1", ...def.lanes.slice(2).map((l) => l.id)]), (def) => pm.reorderLanes(def, ["lane1", "lane2", ...def.lanes.slice(2).map((l) => l.id)]));
reversible("lanes: resize +40, then −40 (nodes below follow)", (def) => pm.resizeLane(def, "lane2", 240), (def) => pm.resizeLane(def, "lane2", 200));
check("lane resize never cuts a node out of its lane; reorder keeps every node in its lane", () => {
  const def = pm.parse(seedText);
  const h = pm.resizeLane(def, "lane5", 120);
  assert.ok(h >= pm.laneMinHeight(def, "lane5"));
  pm.reorderLanes(def, [...def.lanes.map((l) => l.id)].reverse());
  const wrong = def.states.filter((s) => pm.laneAt(def, pm.center(pm.box(s, def)).y)?.id !== s.properties.laneId).map((s) => s.id);
  assert.deepEqual(wrong, []);
});
check("lane remove with move-to: nodes land in the target lane, lanes below move up, nothing else changes", () => {
  const def = pm.parse(seedText);
  const moved = def.states.filter((s) => s.properties.laneId === "lane3").map((s) => s.id);
  pm.removeLane(def, "lane3", "lane2");
  assert.equal(def.lanes.length, 6);
  moved.forEach((id) => assert.equal(st(def, id).properties.laneId, "lane2"));
  const wrong = def.states.filter((s) => pm.laneAt(def, pm.center(pm.box(s, def)).y)?.id !== s.properties.laneId).map((s) => s.id);
  assert.deepEqual(wrong, []);
});
check("split a connection with an event (US-188 AC-02): A → E → B, label / guard / port stay on the first part, undo = same bytes", () => {
  const def = pm.parse(seedText);
  const snap = JSON.stringify(def);
  const before = { ...st(def, "node3").transitions[0] };
  pm.splitEdge(def, "node3", 0, { id: "eveniment_1", title: "Notificare", kind: "Server", roles: [], transitions: [], properties: { x: 0, y: 0, elementType: "eveniment", laneId: "lane2" } });
  const t = st(def, "node3").transitions[0];
  assert.equal(t.target, "eveniment_1");
  assert.equal(t.event, before.event);
  assert.deepEqual(t.guard, before.guard);
  assert.equal(st(def, "eveniment_1").transitions[0].target, before.target);
  same(pm.serialize(def), pm.serialize(pm.parse(pm.serialize(def))), "split re-save");
  same(seedText, pm.serialize(JSON.parse(snap)), "undo");
});
check("validation: incomplete condition / undeclared variable (E8), draft sub-process (E9, publish), unknown template (W2), lost avizare + notification step (W3)", () => {
  const def = pm.parse(seedText);
  const base = pm.parse(seedText);
  st(def, "node3").transitions[0].guard.groups[0].conditions.push({ sourceField: "", operator: "", valueKind: "static" });
  st(def, "node7").transitions[0].guard.groups[0].conditions[0].sourceField = "NuExista";
  def.states = def.states.filter((s) => s.id !== "node27" && s.id !== "node13");
  def.states.forEach((s) => { s.transitions = (s.transitions || []).filter((t) => t.target !== "node27" && t.target !== "node13" && !/aviz/i.test(t.event)); s.title = String(s.title).replace(/aviz/ig, "x"); });
  const refs = def.states.map((s) => s.properties?.processRef).filter(Boolean);
  const issues = pm.validate(def, { processes: [def.name, ...refs], self: def.name, published: [], templates: ["Case.Assigned"], base, usedBy: 2 });
  const has = (code, re) => assert.ok(issues.some((i) => i.code === code && re.test(i.message)), `${code} ${re}`);
  has("E8", /nu are câmp/); has("E8", /nu este în Variabilele/); has("E9", /nu este publicat/); has("W2", /Șablonul/); has("W3", /avizare/); has("W3", /notificare/);
  assert.ok(issues.filter((i) => i.code === "E9").every((i) => i.blocks === "publish"));
});
check("the seed with the catalogues: no errors; warnings = the unknown template Permit.ToPrint and the 2 unused variables", () => {
  const def = pm.parse(seedText);
  const services = JSON.parse(fs.readFileSync(path.join(ROOT, "data/e-permits-services.json"), "utf8"));
  const refs = def.states.map((s) => s.properties?.processRef).filter(Boolean);
  const issues = pm.validate(def, { processes: [def.name, ...refs], published: refs, self: def.name, templates: services.notificationTemplates.map((t) => t.code), forms: [...services.processForms.map((f) => f.id), ...def.states.flatMap((s) => s.transitions.map((t) => t.formName).filter(Boolean))], base: pm.parse(seedText) });
  assert.deepEqual(issues.filter((i) => i.level === "error").map((i) => i.message), []);
  assert.deepEqual(issues.filter((i) => i.code !== "W1").map((i) => i.code + " " + i.message).sort(), [
    "W2 Variabila de context «SecondaryApproval» nu este folosită în nicio condiție.",
    "W2 Variabila de context «WithPayment» nu este folosită în nicio condiție.",
    "W2 Șablonul «Permit.ToPrint» nu există sau este inactiv — notificarea nu se trimite.",
  ]);
});

console.log("Batch 3 — JSON export / import");
check("export → import → export is byte-identical (the file the designer downloads)", () => {
  const exported = pm.serialize(pm.parse(seedText));
  same(exported, pm.serialize(pm.parse(exported)), "import of the export");
});
check("a minified / reordered import is normalised to the GEAP layout once, then stable", () => {
  const min = JSON.stringify(JSON.parse(seedText));
  const once = pm.serialize(pm.parse(min));
  same(seedText, once, "minified import → GEAP layout");
  same(once, pm.serialize(pm.parse(once)), "second pass");
});
check("an import that is not a process is refused with a readable message", () => {
  assert.throws(() => pm.parse("[1,2]"), /nu este un obiect/);
  assert.throws(() => pm.parse("{ nope"));
});

console.log("Batch 4 — auto-layout, case path");
check("auto-layout: only x / y, lane heights and waypoints change; every node inside its lane; no two shapes overlap", () => {
  const def = pm.parse(seedText);
  const strip = (d) => JSON.stringify({ ...d, lanes: d.lanes.map(({ height, ...l }) => l), states: d.states.map((s) => ({ ...s, transitions: s.transitions.map(({ waypoints, ...t }) => t), properties: { ...s.properties, x: 0, y: 0, laneId: s.properties.laneId } })) });
  const before = strip(def);
  pm.autoLayout(def);
  assert.equal(strip(def), before);
  const wrong = def.states.filter((s) => pm.laneAt(def, pm.center(pm.box(s, def)).y)?.id !== s.properties.laneId).map((s) => s.id);
  assert.deepEqual(wrong, []);
  const boxes = def.states.map((s) => ({ id: s.id, ...pm.box(s, def) }));
  const hits = [];
  boxes.forEach((a, i) => boxes.slice(i + 1).forEach((b) => { if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) hits.push(`${a.id}×${b.id}`); }));
  assert.deepEqual(hits, []);
  const text = pm.serialize(def);
  same(text, pm.serialize(pm.parse(text)), "laid-out re-save");
});
check("auto-layout is idempotent (a second run changes nothing)", () => {
  const def = pm.autoLayout(pm.parse(seedText));
  const once = pm.serialize(def);
  same(once, pm.serialize(pm.autoLayout(pm.parse(once))), "second layout");
});
check("case path: Start → … through the visited steps to the current one, as connected edges", () => {
  const def = pm.parse(seedText);
  const p = pm.pathThrough(def, ["node5", "node6"]);
  assert.equal(p.nodes[0], "start");
  assert.equal(p.nodes.at(-1), "node6");
  p.edges.forEach((k) => { const [src, i] = k.split(":"); assert.ok(st(def, src).transitions[Number(i)], k); });
});

console.log(`\n${passed} checks passed`);
