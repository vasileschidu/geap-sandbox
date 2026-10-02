// Run: node test/classifiers-lifecycle.test.mjs
// Back Office Clasificatoare module — lifecycle, hierarchy, sync and CSV rules (doc §5–§8).
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const cl = require("../core/classifiers.js");
let passed = 0;
const check = (name, fn) => { fn(); passed += 1; console.log(`  ✓ ${name}`); };

const base = () => ({ id: "a", status: "published", versiune: "3.4", valori: [{ cod: "1", denRo: "Unu", activ: true }, { cod: "2", denRo: "Doi", activ: true }], campuriExtra: [], parintId: null });

check("§5 editing a published classifier opens a draft over a snapshot", () => {
  const d = cl.beginDraft(base());
  assert.equal(d.status, "draft");
  assert.equal(d.publishedSnapshot.versiune, "3.4");
  assert.equal(cl.beginDraft(d), d, "a draft stays as it is");
});

check("§5 Renunță la ciornă restores the published snapshot", () => {
  const d = cl.beginDraft(base());
  d.valori.push({ cod: "3", denRo: "Trei", activ: true });
  const back = cl.transition(d, "renuntaClas");
  assert.equal(back.status, "published");
  assert.equal(back.valori.length, 2);
  assert.equal(back.publishedSnapshot, null);
});

check("§5 a never-published draft cannot be reverted (delete path instead)", () => {
  assert.equal(cl.transition({ ...base(), status: "draft", publishedSnapshot: null }, "renuntaClas"), null);
});

check("§5 publishing bumps the published version; first publish is 1.0", () => {
  const d = cl.beginDraft(base());
  assert.equal(cl.transition(d, "publicaClas").versiune, "3.5");
  const fresh = { ...base(), status: "draft", everPublished: false, versiune: "0.1", publishedSnapshot: null };
  const pub = cl.transition(fresh, "publicaClas");
  assert.equal(pub.versiune, "1.0");
  assert.equal(pub.everPublished, true);
});

check("§5 archiving a draft withdraws the published version, not the draft", () => {
  const d = cl.beginDraft(base());
  d.valori = [];
  const arch = cl.transition(d, "arhiveazaClas");
  assert.equal(arch.status, "archived");
  assert.equal(arch.valori.length, 2);
  assert.equal(cl.transition(arch, "republicaClas").status, "published");
});

check("publish summary counts added / changed / deactivated values", () => {
  const d = cl.beginDraft(base());
  d.valori[0].activ = false;
  d.valori[1].denRo = "Doi (nou)";
  d.valori.push({ cod: "3", denRo: "Trei", activ: true });
  assert.deepEqual(cl.draftChanges(d), { added: 1, changed: 1, deactivated: 1, structure: false, first: false });
});

check("§8 renaming a code cascades to children's parinte and moves them to draft", () => {
  const all = [base(), { id: "b", status: "published", versiune: "1.2", parintId: "a", valori: [{ cod: "x", parinte: "1", activ: true }] }, { id: "c", status: "published", parintId: "a", valori: [{ cod: "y", parinte: "2" }] }];
  const r = cl.renameValueCode(all, "a", "1", "01");
  assert.deepEqual(r.affected, ["b"]);
  const b = r.classifiers.find((x) => x.id === "b");
  assert.equal(b.valori[0].parinte, "01");
  assert.equal(b.status, "draft");
  assert.equal(r.classifiers.find((x) => x.id === "c").status, "published");
  assert.equal(r.classifiers.find((x) => x.id === "a").valori[0].cod, "01");
});

check("hierarchy: ancestors chain and descendants (3 levels)", () => {
  const all = [{ id: "p" }, { id: "c", parintId: "p" }, { id: "g", parintId: "c" }];
  assert.deepEqual(cl.ancestorsOf(all, all[2]).map((x) => x.id), ["p", "c"]);
  assert.deepEqual(cl.descendantIds(all, "p"), ["c", "g"]);
});

check("§6 sync: absent values are deactivated automatically (DIV-C7)", () => {
  const c = base();
  const incoming = [{ cod: "1", denRo: "Unu" }, { cod: "9", denRo: "Nouă" }];
  assert.deepEqual(cl.syncPlan(c, incoming), { added: ["9"], updated: [], deactivated: ["2"] });
  const after = cl.applySync(c, incoming, "2026-10-01");
  assert.equal(after.valori.find((v) => v.cod === "2").activ, false);
  assert.equal(after.valori.find((v) => v.cod === "2").autoInactivat, true);
  assert.equal(after.valori.length, 3);
});

check("§6 CSV: unknown columns are named, required ones reported, ; or , accepted", () => {
  const r = cl.parseCsv('cod;denRo;culoare\n"10";"Zece; zece";rosu\n', ["cod", "denRo", "denRu"]);
  assert.deepEqual(r.unknownColumns, ["culoare"]);
  assert.deepEqual(r.missing, []);
  assert.deepEqual(r.rows, [{ cod: "10", denRo: "Zece; zece" }]);
  assert.deepEqual(cl.parseCsv("denRu\nx", ["cod", "denRo", "denRu"]).missing, ["cod", "denRo"]);
});

console.log(`\n${passed} checks passed`);
