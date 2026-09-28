// Run: node test/service-passport.test.mjs
// One check per rule in US-111 (RSSP sync) and Feature 93591 (payments).
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sp = require("../core/service-passport.js");

let passed = 0;
const check = (name, fn) => { fn(); passed += 1; console.log(`  ✓ ${name}`); };

const rssp = (over = {}) => ({
  code: "003000333",
  title: { ro: "  Autorizație   de funcționare\n a farmaciei ", ru: "…", en: "…" },
  objective: { ro: "<p>Eliberarea <b>autorizației</b> &amp; controlul&nbsp;conformității.</p>" },
  types: 3, isPermissiveAct: true, allowsMPay: true, allowsMDelivery: false, eService: true, allowsMPower: true,
  organization: { idno: "1006601000111", code: "AMDM", name: { ro: "Agenția Medicamentului și Dispozitivelor Medicale" } },
  subServices: [
    { title: { ro: "Emitere primară" }, subServiceType: { title: { ro: "Eliberare" } }, isDisabled: false,
      costs: [{ price: "0", durationValue: 0 }, { price: 250, currency: "MDL", durationValue: 14.2, durationUnit: "WorkDay" }] },
    { title: { ro: "Duplicat" }, isDisabled: true, costs: [] },
    { title: { ro: "Prelungire" }, isDisabled: false, costs: [{ price: "120.5", durationValue: 900, durationUnit: "CalendarDay" }] }
  ],
  documents: [{ title: { ro: "Copia actului de identitate" }, type: "required" }],
  ...over
});
const ok = (data) => () => ({ status: "ok", data });

console.log("RSSP mapping");
check("title: RO only, whitespace normalised", () => {
  assert.equal(sp.normalizeTitle(rssp().title), "Autorizație de funcționare a farmaciei");
});
check("title truncated to 250", () => {
  assert.equal(sp.normalizeTitle({ ro: "x".repeat(400) }).length, 250);
});
check("objective: HTML stripped, entities decoded, ≤ 350", () => {
  assert.equal(sp.plainObjective(rssp().objective), "Eliberarea autorizației & controlul conformității.");
  assert.equal(sp.plainObjective({ ro: "<p>" + "a".repeat(500) + "</p>" }).length, 350);
});
check("types bitmask → applicant types", () => {
  assert.deepEqual(sp.applicantTypes(1).map((t) => t.id), [1]);
  assert.deepEqual(sp.applicantTypes(2).map((t) => t.id), [2]);
  assert.deepEqual(sp.applicantTypes(3).map((t) => t.id), [1, 2]);
  assert.deepEqual(sp.applicantTypes(0), []);
});
check("sub-services: disabled ignored; duration = first cost > 0, ceil, cap 255; unit", () => {
  const { items, ignored } = sp.importSubServices(rssp().subServices);
  assert.equal(ignored, 1);
  assert.equal(items.length, 2);
  assert.deepEqual(items[0].duration, { value: 15, unit: "zile lucrătoare" });
  assert.deepEqual(items[1].duration, { value: 255, unit: "zile calendaristice" });
  assert.deepEqual(items[1].price, { amount: 120.5, currency: "MDL" });
});
check("delivery: eService → Electronic, allowsMDelivery → MDelivery", () => {
  assert.deepEqual(sp.mapRsspService(rssp()).delivery, ["Electronic"]);
  assert.deepEqual(sp.mapRsspService(rssp({ allowsMDelivery: true })).delivery, ["Electronic", "MDelivery"]);
});
check("MPower code = RSSP code only when allowsMPower", () => {
  assert.equal(sp.mapRsspService(rssp()).mpowerCode, "003000333");
  assert.equal(sp.mapRsspService(rssp({ allowsMPower: false })).mpowerCode, null);
});

console.log("US-111 sync");
const base = { now: "2026-09-25T10:00:00", user: "Anastasia Cojocaru", services: [], authorities: [] };
check("empty code: validation message, RSSP not called, nothing logged", () => {
  let called = false;
  const r = sp.syncService({ ...base, code: "   ", lookup: () => { called = true; } });
  assert.equal(r.ok, false);
  assert.equal(r.message, "Câmpul «Cod serviciu RSSP» este obligatoriu.");
  assert.equal(called, false);
  assert.equal(r.events.length, 0);
});
check("RSSP unavailable: explicit error, logged Eșuat", () => {
  const r = sp.syncService({ ...base, code: "1", lookup: () => ({ status: "unavailable" }) });
  assert.equal(r.message, "Serviciul RSSP este momentan indisponibil. Încercați mai târziu.");
  assert.equal(r.events[0].status, "Eșuat");
});
check("code not found: message names the code, logged Eșuat", () => {
  const r = sp.syncService({ ...base, code: "003999", lookup: () => ({ status: "notFound" }) });
  assert.equal(r.message, "Serviciul cu codul 003999 nu a fost găsit în RSSP.");
  assert.equal(r.events[0].status, "Eșuat");
});
check("invalid structure: error, logged Eșuat, nothing created", () => {
  const r = sp.syncService({ ...base, code: "003000333", lookup: ok({ code: "003000333" }) });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "invalid");
  assert.equal(r.service, undefined);
});
check("new code + unknown IDNO → service created, authority created", () => {
  const r = sp.syncService({ ...base, code: "003000333", lookup: ok(rssp()) });
  assert.equal(r.kind, "created");
  assert.equal(r.authorityCreated, true);
  assert.equal(r.authority.idno, "1006601000111");
  assert.deepEqual(r.events.map((e) => e.type), ["Sincronizare serviciu", "Creare serviciu", "Creare autoritate"]);
  assert.equal(r.service.geap.requestTypes.length, 2, "request types seeded from enabled sub-services");
  assert.equal(r.service.geap.requestTypes[0].flow, null);
});
check("existing code + known IDNO → service updated, linked to authority, GEAP config kept", () => {
  const services = [{ code: "003000333", title: "Vechi", geap: { version: "v2.0.0", forms: [{ id: "f1" }] } }];
  const authorities = [{ id: "aut-x", idno: "1006601000111", name: "AMDM" }];
  const r = sp.syncService({ ...base, services, authorities, code: " 003000333 ", lookup: ok(rssp()) });
  assert.equal(r.kind, "updated");
  assert.equal(r.authorityCreated, false);
  assert.equal(r.service.authorityId, "aut-x");
  assert.equal(r.service.title, "Autorizație de funcționare a farmaciei");
  assert.equal(r.service.geap.version, "v2.0.0");
  assert.equal(r.service.geap.forms.length, 1);
  assert.deepEqual(r.events.map((e) => e.type), ["Sincronizare serviciu", "Actualizare serviciu", "Legare cu autoritate"]);
  assert.equal(services[0].title, "Vechi", "inputs are not mutated");
});

console.log("Request types / payments");
check("request type state", () => {
  assert.equal(sp.requestTypeState({ flow: null }).label, "Fără flux");
  assert.equal(sp.requestTypeState({ flow: "f", forms: [] }).label, "Fără formulare");
  assert.equal(sp.requestTypeState({ flow: "f", forms: ["a"] }).label, "Configurat");
});
check("payment actions by state", () => {
  assert.deepEqual(sp.paymentActions({ state: "Schiță" }), ["publish", "delete"]);
  assert.deepEqual(sp.paymentActions({ state: "Publicat", active: true }), ["deactivate"]);
  assert.deepEqual(sp.paymentActions({ state: "Publicat", active: false, usage: 4 }), ["activate"]);
  assert.deepEqual(sp.paymentActions({ state: "Publicat", active: false, usage: 0 }), ["activate", "delete"]);
});
check("automatic payment needs ≥ 1 tariff to publish; manual does not", () => {
  assert.equal(sp.canPublish({ generation: "Automat", tariffs: [] }).ok, false);
  assert.equal(sp.canPublish({ generation: "Manual", tariffs: [] }).ok, true);
});
check("one active payment per Tip solicitare + Moment generare", () => {
  const list = [
    { id: "a", state: "Publicat", active: true, requestType: "Emitere primară", moment: "La examinare" },
    { id: "b", state: "Publicat", active: false, requestType: "Emitere primară", moment: "La examinare" },
    { id: "c", state: "Publicat", active: false, requestType: "Prelungire", moment: "La examinare" }
  ];
  assert.equal(sp.activationConflict(list, list[1]).id, "a");
  assert.equal(sp.activationConflict(list, list[2]), null);
});
check("delete only draft or never-used", () => {
  assert.equal(sp.canDelete({ state: "Schiță", usage: 3 }), true);
  assert.equal(sp.canDelete({ state: "Publicat", usage: 0 }), true);
  assert.equal(sp.canDelete({ state: "Publicat", usage: 2 }), false);
});

console.log(`\n${passed} checks passed`);
