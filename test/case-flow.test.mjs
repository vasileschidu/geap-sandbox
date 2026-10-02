// Run: node test/case-flow.test.mjs
// One check per rule in "Case (Dosar) logic and actions" (§ numbers in the names).
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const cf = require("../core/case-flow.js");

let passed = 0;
const check = (name, fn) => { fn(); passed += 1; console.log(`  ✓ ${name}`); };

const complex = cf.getFlow("complex");
const simple = cf.getFlow("simplified");
const vars = { IsAutoDistribution: false, SuspensionWithCoordination: true, SecondaryApproval: true, IsPaperPermit: false };
const at = (stateId, extra = {}) => ({ stateId, suspended: false, ...extra });
const ids = (r) => r.items.map((i) => i.id);

check("§1 statusId is derived from the resting node, not stored", () => {
  assert.equal(cf.statusId(complex, at("node6")), 2);
  assert.equal(cf.statusId(complex, at("node15")), 4);
  assert.equal(cf.statusId(complex, at("node6", { suspended: true })), 3);
  assert.equal(cf.statusId(complex, at("end")), 9);
});

check("§4 a case never rests on a decision or server node", () => {
  assert.deepEqual(cf.resolve(complex, "node3", vars), { stateId: "node5", suspended: false });
  assert.deepEqual(cf.resolve(complex, "node3", { ...vars, IsAutoDistribution: true }), { stateId: "node6", suspended: false });
  assert.equal(cf.resolve(complex, "RecordState8", vars).stateId, "RecordState2");
  assert.equal(cf.resolve(complex, "node18", vars).stateId, "node19");
  assert.equal(cf.resolve(complex, "node18", { ...vars, SecondaryApproval: false }).stateId, "node20");
});

check("§6 Verificarea datelor: advance first, then suspension, then the two operations", () => {
  const r = cf.available(complex, at("node6"), { role: "specialist", vars, pendingFees: 0, activeReviews: 0 });
  assert.deepEqual(ids(r), ["dosarExaminat", "suspendare", "taxaExaminare", "aviz"]);
  assert.equal(r.items[2].kind, "operation");
});

check("§6 Dosar examinat resolves to Setarea taxei (approve) or the rejection project", () => {
  assert.equal(cf.apply(complex, at("node6"), "dosarExaminat", { vars, choice: "aprobare" }).stateId, "node9");
  const rej = cf.apply(complex, at("node6"), "dosarExaminat", { vars, choice: "respingere" });
  assert.equal(rej.stateId, "node14");
  assert.equal(rej.decision, "respingere");
});

check("§6 operations do not move the case", () => {
  assert.equal(cf.apply(complex, at("node6"), "taxaExaminare", { vars }).stateId, "node6");
});

check("§7 pending fees or active reviews disable (not hide) Dosar examinat; others stay", () => {
  const r = cf.available(complex, at("node6"), { role: "specialist", vars, pendingFees: 1, activeReviews: 0 });
  const adv = r.items.find((i) => i.id === "dosarExaminat");
  assert.equal(adv.disabled, true);
  assert.match(adv.reason, /taxe în așteptare/);
  assert.equal(r.items.find((i) => i.id === "suspendare").disabled, false);
  const r2 = cf.available(complex, at("node6"), { role: "specialist", vars, pendingFees: 0, activeReviews: 2 });
  assert.match(r2.items[0].reason, /avize/);
});

check("§8 suspension variant A suspends at once; B goes Supervisor → Director (Complex)", () => {
  const a = cf.apply(complex, at("node8"), "confirmaSuspendarea", { vars: { ...vars, SuspensionWithCoordination: false } });
  assert.deepEqual([a.stateId, a.suspended], ["node6", true]);
  const b = cf.apply(complex, at("node8"), "confirmaSuspendarea", { vars });
  assert.equal(b.stateId, "RecordState1");
  assert.equal(cf.statusId(complex, b), 2);
  const d = cf.apply(complex, b, "coordoneaza", { vars });
  assert.equal(d.stateId, "node10");
  assert.equal(cf.statusId(complex, d), 3);
  const done = cf.apply(complex, d, "semneazaSuspendarea", { vars });
  assert.deepEqual([done.stateId, done.suspended], ["node6", true]);
});

check("§8 no suspension button while suspended; advancing blocked with the reason", () => {
  const r = cf.available(complex, at("node6", { suspended: true }), { role: "specialist", vars, pendingFees: 0, activeReviews: 0 });
  assert.ok(!ids(r).includes("suspendare"));
  assert.equal(r.items[0].disabled, true);
  assert.ok(ids(r).includes("reiaExaminarea"));
});

check("§9 lane gating: a Supervisor gets no actions on the Specialist's step, only the note", () => {
  const r = cf.available(complex, at("node6"), { role: "supervizor", vars, pendingFees: 0, activeReviews: 0 });
  assert.equal(r.items.length, 0);
  assert.match(r.note, /rolului Specialist/);
});

check("§9 role bans: the Director never examines; admins only view", () => {
  const r = cf.available(complex, at("node6"), { role: "director", vars, pendingFees: 0, activeReviews: 0 });
  assert.equal(r.items.length, 0);
  const s = cf.available(complex, at("node19"), { role: "director", vars, pendingFees: 0, activeReviews: 0 });
  assert.deepEqual(ids(s), ["semneazaDirector"]);
  const adm = cf.available(complex, at("node5"), { role: "adm-c", vars, pendingFees: 0, activeReviews: 0 });
  assert.equal(adm.items.length, 0);
});

check("§2 Simplified: the Specialist distributes and signs; no coordination steps", () => {
  assert.deepEqual(ids(cf.available(simple, at("node5"), { role: "specialist", vars, pendingFees: 0, activeReviews: 0 })), ["distribuie"]);
  assert.equal(cf.resolve(simple, "RecordState8", vars).stateId, "node19");
  assert.equal(cf.resolve(simple, "node18", { ...vars, SecondaryApproval: false }).stateId, "node20");
  assert.equal(cf.laneOf(simple, "node20").role, "specialist");
  assert.equal(cf.apply(simple, at("node8"), "confirmaSuspendarea", { vars }).stateId, "node10");
  assert.equal(simple.nodes.RecordState1, undefined);
});

check("§4 steps with two actions pair advance + return", () => {
  const r = cf.available(complex, at("node17"), { role: "specialist", vars, pendingFees: 0, activeReviews: 0 });
  assert.deepEqual(r.items.map((i) => i.kind), ["advance", "return"]);
  assert.equal(cf.apply(complex, at("node17"), "cerereIncompletaA", { vars }).stateId, "node6");
});

check("list status follows the resting node", () => {
  assert.equal(cf.listStatus(complex, at("node5")), "depus");
  assert.equal(cf.listStatus(complex, at("RecordState2")), "spreCoordonare");
  assert.equal(cf.listStatus(complex, at("node16")), "asteaptaPlata");
  assert.equal(cf.initialState(complex, "asteaptaPlata").stateId, "node16");
  assert.equal(cf.listStatus(complex, at("end", { decision: "respingere" })), "respins");
  assert.equal(cf.initialState(complex, "spreSemnare", { vars }).stateId, "node19");
});

console.log(`\n${passed} checks passed`);
