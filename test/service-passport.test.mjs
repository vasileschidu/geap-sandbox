// Run: node test/service-passport.test.mjs
// One check per rule in US-111 (RSSP sync), Feature 93591 (payments) and the
// revised Taxe model (tax = tariff + application rule, 2026-10-02).
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

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
  assert.deepEqual(r.events.map((e) => e.type), ["Sincronizare serviciu finalizată cu succes", "Creare serviciu nou", "Creare autoritate nouă"]);
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
  assert.deepEqual(r.events.map((e) => e.type), ["Sincronizare serviciu finalizată cu succes", "Actualizare serviciu existent", "Legare cu autoritate existentă"]);
  assert.equal(services[0].title, "Vechi", "inputs are not mutated");
});

console.log("Flow definitions (designer JSON)");
const def = JSON.parse(readFileSync(new URL("../data/flows/ProcesFluxSimplificatFaraSupervizor.json", import.meta.url)));
const steps = sp.stepsFromDefinition(def);
check("Human + Hybrid states are the steps, in process order", () => {
  assert.equal(steps.length, 16);
  assert.equal(steps.reduce((n, st) => n + st.actions.length, 0), 29);
  assert.equal(steps[0].name, "Distribuire automată?");
  assert.equal(steps[0].auto, true);
  assert.equal(steps[0].lane, "Asistent tehnic");
});
check("transitions become actions; formName is the default form; next = Continuă", () => {
  const reject = steps.find((st) => st.id === "node14");
  assert.deepEqual(reject.actions.map((a) => [a.id, a.name, a.defaultForm]),
    [["next", "Continuă", "DecizieRespingere"], ["cerere-incompleta", "Cerere incompletă", "DecizieRespingere"]]);
  const sign = steps.find((st) => st.id === "node10");
  assert.equal(sign.actions[0].name, "Returnează la Specialist", "double spaces collapsed");
});
check("form names used by the definition", () => {
  assert.deepEqual(sp.definitionForms(def).sort(),
    ["DecizieRespingere", "DistribuireDosar", "ProiectActPermisiv", "ReturnareLaSemnare", "ReturnareLaSpecialist", "SuspendareTermen"]);
});

console.log("Request types / payments");
check("request type state: one electronic form", () => {
  assert.equal(sp.requestTypeState({ flow: null }).label, "Fără flux");
  assert.equal(sp.requestTypeState({ flow: "f", form: null }).label, "Fără formular");
  assert.equal(sp.requestTypeState({ flow: "f", form: "a" }).label, "Configurat");
});
const flow = { steps: [
  { id: "verifica", actions: [{ id: "suspendare", defaultForm: "SuspendareTermen" }, { id: "examinat", defaultForm: null }] },
  { id: "semneaza", actions: [{ id: "returneaza", defaultForm: "ReturnareLaSpecialist" }] }
] };
const [verifica, semneaza] = flow.steps;
check("action form: process default unless overridden; explicit none", () => {
  assert.deepEqual(sp.actionForm(verifica, verifica.actions[0], {}), { form: "SuspendareTermen", overridden: false });
  assert.deepEqual(sp.actionForm(verifica, verifica.actions[1], {}), { form: null, overridden: false });
  assert.deepEqual(sp.actionForm(verifica, verifica.actions[0], { "verifica/suspendare": sp.NO_FORM }), { form: null, overridden: true });
});
check("setting the default back removes the override", () => {
  let o = sp.setActionForm({}, semneaza, semneaza.actions[0], "Generic.ReturneazaLaSupervizor");
  assert.deepEqual(o, { "semneaza/returneaza": "Generic.ReturneazaLaSupervizor" });
  assert.deepEqual(sp.setActionForm(o, semneaza, semneaza.actions[0], "ReturnareLaSpecialist"), {});
  assert.deepEqual(sp.setActionForm(o, semneaza, semneaza.actions[0], ""), {});
  assert.deepEqual(sp.setActionForm({}, verifica, verifica.actions[1], sp.NO_FORM), {}, "none is already the default");
});
check("override count ignores keys from another flow", () => {
  const rt = { actions: { "semneaza/returneaza": "X", "old-step/x": "Y" } };
  assert.equal(sp.overrideCount(rt, flow), 1);
  assert.equal(sp.flowActions(flow).length, 3);
});
check("imported request types: one form slot, term from RSSP duration", () => {
  const r = sp.syncService({ ...base, code: "003000333", lookup: ok(rssp()) });
  const rt = r.service.geap.requestTypes[0];
  assert.equal(rt.form, null);
  assert.deepEqual(rt.term, { value: 15, unit: "zile lucrătoare" });
  assert.deepEqual(rt.actions, {});
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

console.log("eAPL sync");
const svc = { code: "003000023", title: "Notificare", lastSync: "2026-01-01T00:00:00" };
const eaplOk = () => ({ status: "ok", data: { localAuthority: { name: "Primăria Chișinău" }, localFee: { amount: 100, currency: "MDL" }, localTerm: { value: 5, unit: "zile lucrătoare" } } });
check("eAPL enriches an existing service; logged Reușit", () => {
  const r = sp.syncFromEapl({ ...base, code: "003000023", service: svc, lookup: eaplOk });
  assert.equal(r.ok, true);
  assert.equal(r.service.eapl.authority.name, "Primăria Chișinău");
  assert.equal(r.service.lastSync, base.now);
  assert.equal(r.events[0].status, "Reușit");
  assert.equal(svc.eapl, undefined, "input not mutated");
});
check("eAPL cannot create a service; unavailable / not found are explicit and logged", () => {
  assert.equal(sp.syncFromEapl({ ...base, code: "1", service: null, lookup: eaplOk }).reason, "newService");
  const down = sp.syncFromEapl({ ...base, code: "1", service: svc, lookup: () => ({ status: "unavailable" }) });
  assert.equal(down.message, sp.EAPL_MESSAGES.unavailable);
  assert.equal(down.events[0].status, "Eșuat");
  assert.ok(sp.syncFromEapl({ ...base, code: "9", service: svc, lookup: () => ({ status: "notFound" }) }).message.includes("nu a fost găsit în eAPL"));
});

console.log("Payment editor rules");
const flowStd = { name: "Flux standard", paymentMoments: ["La examinare", "La luarea deciziei"] };
check("moment needs a payment branch in the flow; initiation always allowed", () => {
  assert.equal(sp.momentAllowed(flowStd, "La examinare"), true);
  assert.equal(sp.momentAllowed(flowStd, "La avizare"), false);
  assert.equal(sp.momentAllowed(null, "La inițierea solicitării"), true);
  assert.equal(sp.momentAllowed(null, "La examinare"), false);
});
check("designer JSON: momentId marks the payment steps", () => {
  assert.deepEqual(sp.momentsFromDefinition(def), ["La examinare"]);
});
check("tariffs: published + active + global/own; automatic excludes user-variable formulas", () => {
  const base = { scope: "global", state: "Publicat", active: true, userVariables: false };
  assert.equal(sp.tariffEligibility(base, "S1", "Automat").ok, true);
  assert.equal(sp.tariffEligibility({ ...base, scope: "S2" }, "S1", "Manual").ok, false);
  assert.equal(sp.tariffEligibility({ ...base, state: "Schiță" }, "S1", "Manual").ok, false);
  assert.equal(sp.tariffEligibility({ ...base, active: false }, "S1", "Manual").ok, false);
  assert.equal(sp.tariffEligibility({ ...base, userVariables: true }, "S1", "Automat").ok, false);
  assert.equal(sp.tariffEligibility({ ...base, userVariables: true }, "S1", "Manual").ok, true);
});
const draft = { requestType: "Emitere primară", moment: "La examinare", generation: "Manual", tariffs: [], term: "10", exemptions: [], recurring: null };
check("validation: valid manual draft; initiation forces automatic; no exemptions on automatic", () => {
  assert.deepEqual(sp.validatePayment(draft, { flow: flowStd }), {});
  assert.ok(sp.validatePayment({ ...draft, moment: "La avizare" }, { flow: flowStd }).moment.includes("nu are ramificație"));
  assert.ok(sp.validatePayment({ ...draft, moment: "La inițierea solicitării" }, { flow: flowStd }).generation);
  assert.ok(sp.validatePayment({ ...draft, generation: "Automat", exemptions: ["Fără scutire"] }, { flow: flowStd }).exemptions);
  assert.ok(sp.validatePayment({ ...draft, term: "0" }, { flow: flowStd }).term);
});
check("validation: recurrence needs frequency (+ months for Interval) and notice days", () => {
  const e = sp.validatePayment({ ...draft, recurring: { frequency: "Interval", months: "", noticeDays: "" } }, { flow: flowStd });
  assert.ok(e.frequency && e.noticeDays);
  assert.deepEqual(sp.validatePayment({ ...draft, recurring: { frequency: "Anual", noticeDays: "15" } }, { flow: flowStd }), {});
});
check("publish: automatic needs ≥ 1 tariff; manual publishes without", () => {
  assert.ok(sp.validatePayment({ ...draft, generation: "Automat" }, { flow: flowStd, publish: true }).tariffs);
  assert.deepEqual(sp.validatePayment(draft, { flow: flowStd, publish: true }), {});
});
check("save: new = v1 draft or published; editing a published payment bumps the version", () => {
  const meta = { at: "2026-09-29T10:00:00", user: "A" };
  assert.deepEqual([sp.applyPaymentEdit(null, draft, meta).state, sp.applyPaymentEdit(null, draft, meta).version], ["Schiță", 1]);
  assert.equal(sp.applyPaymentEdit(null, draft, { ...meta, publish: true }).state, "Publicat");
  const pub = { ...draft, state: "Publicat", version: 3, active: true };
  const next = sp.applyPaymentEdit(pub, { term: "12" }, meta);
  assert.deepEqual([next.version, next.state, next.active, next.term], [4, "Publicat", true, "12"]);
});

console.log("Tariff classifier");
const tf = { scope: "global", name: "Taxă de stat", type: "Taxă de stat", amount: "50", currency: "MDL", validFrom: "2026-01-01", formula: false };
check("validation: required fields; service tariffs need request + person type", () => {
  assert.deepEqual(sp.validateTariff(tf), {});
  const e = sp.validateTariff({ ...tf, scope: "S1", name: "", amount: "5,555", validTo: "2025-01-01" });
  assert.ok(e.name && e.amount && e.requestType && e.personType && e.validTo);
  assert.ok(sp.validateTariff({ ...tf, iban: "MD12" }).iban);
});
check("formula: variables, safe evaluation, rounding", () => {
  assert.deepEqual(sp.formulaVariables("{suprafata} * 2 + {a}"), ["suprafata", "a"]);
  assert.deepEqual(sp.evaluateFormula("{s} * 2.345", { s: 10 }, "2 zecimale"), { ok: true, value: 23.45 });
  assert.equal(sp.evaluateFormula("{s} / 3", { s: 10 }, "Rotunjire în sus la leu").value, 4);
  assert.equal(sp.evaluateFormula("{s} * 2", {}, "2 zecimale").ok, false);
  assert.equal(sp.evaluateFormula("alert(1)", {}, "2 zecimale").ok, false);
  assert.ok(sp.validateTariff({ ...tf, formula: true, expression: "", rounding: "2 zecimale" }).expression);
  assert.equal(sp.validateTariff({ ...tf, amount: "", formula: true, expression: "{suprafata_m2} * 2", rounding: "2 zecimale" }).amount, undefined, "a formula tariff has no amount to fill");
  const vars = { variables: ["suprafata_m2"] };
  assert.deepEqual(sp.validateTariff({ ...tf, amount: "", formula: true, expression: "{suprafata_m2} * 2", rounding: "2 zecimale" }, vars), {}, "a catalogue variable is accepted");
  assert.match(sp.validateTariff({ ...tf, amount: "", formula: true, expression: "{suprafata} * 2", rounding: "2 zecimale" }, vars).expression, /nu există în catalog/, "a variable outside the catalogue is rejected");
});
check("RSSP / eAPL tariffs lock the registry fields", () => {
  assert.equal(sp.tariffLocked({ source: "RSSP" }, "amount"), true);
  assert.equal(sp.tariffLocked({ source: "eAPL" }, "type"), false);
  assert.equal(sp.tariffLocked({ source: "GEAP" }, "amount"), false);
});
check("versioning: editing a published tariff adds a version with what changed", () => {
  const meta = { at: "2026-09-30T10:00:00", user: "A" };
  const created = sp.applyTariffEdit(null, tf, { ...meta, publish: true });
  assert.deepEqual([created.state, created.version, created.active], ["Publicat", 1, true]);
  const edited = sp.applyTariffEdit(created, { amount: "60" }, meta);
  assert.equal(edited.version, 2);
  assert.equal(edited.versions[1].note, "Sumă 50 → 60");
  assert.equal(sp.applyTariffEdit(edited, { amount: "60" }, meta).version, 2, "no change → same version");
  const draft = sp.applyTariffEdit(null, tf, meta);
  assert.equal(sp.applyTariffEdit(draft, { amount: "70" }, meta).version, 1, "drafts are not versioned");
});
check("lifecycle actions; delete only when unused", () => {
  assert.deepEqual(sp.tariffActions({ state: "Schiță", active: true }, 0), ["publish", "deactivate", "delete"]);
  assert.deepEqual(sp.tariffActions({ state: "Publicat", active: false }, 3), ["activate"]);
});
check("payment account: own IBAN → principal active → any active", () => {
  const acc = [{ authorityId: "A", iban: "MD1", principal: false, active: true }, { authorityId: "A", iban: "MD2", principal: true, active: true }];
  assert.equal(sp.tariffPayAccount({ iban: "MDX" }, acc, "A").source, "tarif");
  assert.equal(sp.tariffPayAccount({ iban: "" }, acc, "A").iban, "MD2");
  assert.equal(sp.tariffPayAccount({ iban: "" }, [acc[0]], "A").source, "activ");
  assert.equal(sp.tariffPayAccount({ iban: "" }, [], "A").iban, null);
});
check("sync: creates, updates (new version) and leaves unchanged", () => {
  const base = { serviceCode: "S1", source: "RSSP", now: "2026-09-30T10:00:00", today: "2026-09-30" };
  const first = sp.syncServiceTariffs({ ...base, tariffs: [], incoming: [{ externalId: "sub-1", name: "Emitere", amount: 50 }] });
  assert.equal(first.created, 1);
  const again = sp.syncServiceTariffs({ ...base, tariffs: first.tariffs, incoming: [{ externalId: "sub-1", name: "Emitere", amount: 50 }] });
  assert.equal(again.unchanged, 1);
  const changed = sp.syncServiceTariffs({ ...base, tariffs: first.tariffs, incoming: [{ externalId: "sub-1", name: "Emitere", amount: 75 }] });
  assert.equal(changed.updated, 1);
  assert.equal(changed.tariffs[0].version, 2);
  const kept = sp.syncServiceTariffs({ ...base, tariffs: [{ ...first.tariffs[0], iban: "MD00KEEP" }], incoming: [{ externalId: "sub-1", name: "Emitere", amount: 50 }] });
  assert.equal(kept.tariffs[0].iban, "MD00KEEP", "fields the registry does not send are kept");
});
check("sync (US-206): failed items counted and skipped, lastSync stamped, new amount starts on the sync date", () => {
  const base = { serviceCode: "S1", source: "RSSP", now: "2026-10-09T06:00:00", today: "2026-10-09" };
  const first = sp.syncServiceTariffs({ ...base, now: "2026-09-30T10:00:00", today: "2026-09-30", tariffs: [], incoming: [{ externalId: "sub-1", name: "Emitere", amount: 50 }] });
  assert.equal(first.tariffs[0].lastSync, "2026-09-30T10:00:00");
  const res = sp.syncServiceTariffs({ ...base, tariffs: first.tariffs, incoming: [{ externalId: "sub-1", name: "Emitere", amount: 75 }, { externalId: "sub-2", name: "", amount: 10 }, { externalId: "sub-3", name: "Fără sumă", amount: "" }] });
  assert.equal(res.failed, 2);
  assert.equal(res.updated, 1);
  assert.equal(res.tariffs.length, 1, "failed items are not created");
  assert.equal(res.tariffs[0].lastSync, "2026-10-09T06:00:00");
  assert.equal(res.tariffs[0].validFrom, "2026-10-09", "an amount change starts the new version on the sync date");
  const same = sp.syncServiceTariffs({ ...base, now: "2026-10-10T06:00:00", tariffs: res.tariffs, incoming: [{ externalId: "sub-1", name: "Emitere", amount: 75 }] });
  assert.equal(same.unchanged, 1);
  assert.equal(same.tariffs[0].lastSync, "2026-10-10T06:00:00", "an unchanged sync still updates lastSync");
  assert.equal(same.tariffs[0].version, 2, "no new version without a change");
});

/* ---- Taxe = tariff + application rule (feedback G. Roșca / O. Luchian, 2026-10-02) ----
   Olesea's case: Înregistrarea produselor biocide, reperfectare at initiation —
   7743 MDL for a minor/major change, 1292 MDL for an administrative one. */
const T = {
  bio: { id: "t-bio", amount: 9252, currency: "MDL", scope: "B", state: "Publicat", active: true, requestType: "Emitere primară", source: "RSSP" },
  mod: { id: "t-mod", amount: 7743, currency: "MDL", scope: "B", state: "Publicat", active: true, requestType: "Reperfectare", source: "RSSP" },
  adm: { id: "t-adm", amount: 1292, currency: "MDL", scope: "B", state: "Publicat", active: true, requestType: "Reperfectare", source: "GEAP" },
  free: { id: "t-free", amount: 300, currency: "MDL", scope: "B", state: "Publicat", active: true, requestType: "Reperfectare", source: "eAPL" }
};
const INIT = "La inițierea solicitării";
const tax = (over) => ({ state: "Publicat", active: true, moment: INIT, generation: "Automat", condition: null, calc: { mode: "tarif" }, term: 5, exemptions: [], recurring: null, ...over });
const reason = (...values) => ({ classifier: "CLS-BIO-01", values });
const bioTaxes = [
  tax({ id: "x1", tariffId: "t-bio", requestType: "Emitere primară" }),
  tax({ id: "x2", tariffId: "t-mod", requestType: "Reperfectare", condition: reason("minora", "majora") }),
  tax({ id: "x3", tariffId: "t-adm", requestType: "Reperfectare", condition: reason("administrativa") })
];

check("taxe: a condition applies only for the chosen classifier values; none = always", () => {
  assert.equal(sp.conditionApplies(null, {}), true);
  assert.equal(sp.conditionApplies(reason("minora"), { "CLS-BIO-01": "minora" }), true);
  assert.equal(sp.conditionApplies(reason("minora"), { "CLS-BIO-01": "administrativa" }), false);
  assert.equal(sp.conditionApplies(reason("minora"), {}), false, "no answer yet = not applied");
});

check("taxe: the same tariff cannot be charged twice when conditions overlap", () => {
  const a = tax({ id: "a", tariffId: "t-mod", requestType: "Reperfectare", condition: reason("minora") });
  assert.equal(sp.taxConflict([a], tax({ id: "b", tariffId: "t-mod", requestType: "Reperfectare", condition: reason("majora") })), null, "disjoint values");
  assert.equal(sp.taxConflict([a], tax({ id: "b", tariffId: "t-mod", requestType: "Reperfectare", condition: reason("minora", "majora") })).id, "a");
  assert.equal(sp.taxConflict([a], tax({ id: "b", tariffId: "t-mod", requestType: "Reperfectare" })).id, "a", "always overlaps any condition");
  assert.equal(sp.taxConflict([a], tax({ id: "b", tariffId: "t-adm", requestType: "Reperfectare" })), null, "different tariffs may stack on one note");
  assert.equal(sp.taxConflict([a], tax({ id: "b", tariffId: "t-mod", requestType: "Reperfectare", moment: "La examinare" })), null);
});

check("taxe: calculation — the tariff's sum (its amount or its own formula), optionally reduced", () => {
  const area = { id: "t-area", formula: true, expression: "{suprafata_m2} * 2", rounding: "2 zecimale", amount: "", currency: "MDL" };
  assert.deepEqual(sp.TAX_CALC, ["tarif", "reducere"], "a formula belongs to the tariff, not to the tax");
  assert.deepEqual(sp.taxAmount(tax({ calc: { mode: "tarif" } }), T.mod), { ok: true, value: 7743 });
  assert.deepEqual(sp.taxAmount(tax({ calc: { mode: "reducere", percent: 50 } }), T.adm), { ok: true, value: 646 });
  assert.deepEqual(sp.taxAmount(tax({ calc: { mode: "tarif" } }), area, { suprafata_m2: 120 }), { ok: true, value: 240 }, "the tariff's own formula");
  assert.deepEqual(sp.taxAmount(tax({ calc: { mode: "reducere", percent: 50 } }), area, { suprafata_m2: 120 }), { ok: true, value: 120 }, "the reduction applies to the formula result, not to a base amount");
  assert.equal(sp.taxAmount(tax({ calc: { mode: "tarif" } }), area, {}).ok, false, "values completed when the note is generated");
});

check("taxe: tariffs without a rule wait to be configured; 'Aplică ca atare' = automatic at initiation", () => {
  assert.deepEqual(sp.unconfiguredTariffs(Object.values(T), bioTaxes, "B").map((t) => t.id), ["t-free"]);
  const asIs = sp.defaultTaxForTariff(T.free, { term: 5 });
  assert.deepEqual([asIs.requestType, asIs.moment, asIs.generation, asIs.calc.mode, asIs.condition], ["Reperfectare", INIT, "Automat", "tarif", null]);
  assert.deepEqual(sp.validateTax(asIs, { tariff: T.free, serviceCode: "B" }), {});
});

check("taxe: validation — tariff, condition values, reduction range, no formula on the tax", () => {
  const base = { ...sp.defaultTaxForTariff(T.mod, { term: 5 }) };
  assert.ok(sp.validateTax({ ...base, tariffId: "" }).tariffId);
  assert.ok(sp.validateTax({ ...base, condition: { classifier: "", values: [] } }).conditionClassifier);
  assert.ok(sp.validateTax({ ...base, condition: { classifier: "CLS-BIO-01", values: [] } }).conditionValues);
  assert.ok(sp.validateTax({ ...base, calc: { mode: "reducere", percent: "0" } }).percent);
  assert.ok(sp.validateTax({ ...base, calc: { mode: "formula", expression: "{tarif} * 1.2" } }).calc, "a formula is set on the tariff, not on the tax");
  assert.deepEqual(sp.validateTax({ ...base, calc: { mode: "reducere", percent: "25" } }), {});
  assert.ok(sp.validateTax({ ...base, tariffId: "t-x" }, { tariff: { ...T.mod, active: false }, serviceCode: "B" }).tariffId, "an inactive tariff cannot be charged");
});

// Figma 04h (user, 2026-10-08): several classifiers (AND), multi-select values,
// one amount and one reduction per scenario (= one checked value of each classifier)
const who = (...values) => ({ classifier: "CLS-BIO-02", values });
check("taxe: several classifiers apply together (AND); legacy single condition still read", () => {
  const multi = { conditions: [reason("minora", "majora"), who("imm")] };
  assert.equal(sp.conditionApplies(multi, { "CLS-BIO-01": "majora", "CLS-BIO-02": "imm" }), true);
  assert.equal(sp.conditionApplies(multi, { "CLS-BIO-01": "majora", "CLS-BIO-02": "mare" }), false);
  assert.equal(sp.conditionApplies(multi, { "CLS-BIO-01": "majora" }), false, "every classifier needs an answer");
  assert.deepEqual(sp.taxConditions({ condition: reason("minora") }), [reason("minora")]);
  assert.deepEqual(sp.taxConditions({ conditions: [] }), [], "no conditions = always");
  assert.equal(sp.conditionApplies({ conditions: [] }, {}), true);
});

check("taxe: overlap across classifiers — disjoint on any shared classifier = no conflict", () => {
  const a = tax({ id: "a", tariffId: "t-mod", requestType: "Reperfectare", condition: null, conditions: [reason("minora"), who("imm")] });
  const b = (conditions) => tax({ id: "b", tariffId: "t-mod", requestType: "Reperfectare", condition: null, conditions });
  assert.equal(sp.taxConflict([a], b([reason("minora"), who("mare")])), null, "same reason, other applicant type");
  assert.equal(sp.taxConflict([a], b([reason("minora")])).id, "a", "a wider condition overlaps");
  assert.equal(sp.taxConflict([a], b([who("imm"), reason("minora", "majora")])).id, "a", "order of classifiers does not matter");
});

check("taxe: scenarios = cartesian product of checked values, keyed classifier=value", () => {
  const t = { conditions: [reason("minora", "majora"), who("imm", "mare")] };
  const scn = sp.taxScenarios(t);
  assert.equal(scn.length, 4);
  assert.deepEqual(scn.map((s) => s.key), [
    "CLS-BIO-01=minora&CLS-BIO-02=imm", "CLS-BIO-01=minora&CLS-BIO-02=mare",
    "CLS-BIO-01=majora&CLS-BIO-02=imm", "CLS-BIO-01=majora&CLS-BIO-02=mare"
  ]);
  assert.deepEqual(sp.taxScenarios({ conditions: [] }), [], "unconditional = no scenarios");
  assert.equal(sp.scenarioFor(t, { "CLS-BIO-01": "majora", "CLS-BIO-02": "imm" }).key, "CLS-BIO-01=majora&CLS-BIO-02=imm");
  assert.equal(sp.scenarioFor(t, { "CLS-BIO-01": "administrativa", "CLS-BIO-02": "imm" }), null);
});

check("taxe: each scenario has its own amount — reduction only where it is set", () => {
  const t = { conditions: [reason("minora", "majora"), who("imm", "mare")], scenarioCalc: {
    "CLS-BIO-01=minora&CLS-BIO-02=imm": { mode: "reducere", percent: 50 },
    "CLS-BIO-01=majora&CLS-BIO-02=imm": { mode: "reducere", percent: 25 }
  } };
  const amount = (answers) => sp.taxAmount(t, T.mod, {}, { answers }).value;
  assert.equal(amount({ "CLS-BIO-01": "minora", "CLS-BIO-02": "imm" }), 3871.5);
  assert.equal(amount({ "CLS-BIO-01": "majora", "CLS-BIO-02": "imm" }), 5807.25);
  assert.equal(amount({ "CLS-BIO-01": "minora", "CLS-BIO-02": "mare" }), 7743, "a scenario without a reduction = the tariff");
  assert.equal(sp.taxAmount(t, T.mod, {}, { scenario: "CLS-BIO-01=minora&CLS-BIO-02=imm" }).value, 3871.5, "by scenario key");
  const area = { id: "t-area", formula: true, expression: "{{suprafata_m2}} * 2", rounding: "2 zecimale", amount: "", currency: "MDL" };
  assert.deepEqual(sp.taxAmount(t, area, { suprafata_m2: 100 }, { answers: { "CLS-BIO-01": "minora", "CLS-BIO-02": "imm" } }), { ok: true, value: 100 }, "per-scenario reduction on a formula tariff");
});

check("taxe: validation per condition and per scenario; at most 24 scenarios", () => {
  const base = { ...sp.defaultTaxForTariff(T.mod, { term: 5 }), condition: null };
  const two = [reason("minora"), who("imm", "mare")];
  assert.deepEqual(sp.validateTax({ ...base, conditions: two }), {});
  const e1 = sp.validateTax({ ...base, conditions: [reason("minora"), { classifier: "", values: [] }] });
  assert.ok(e1["conditionClassifier:1"], "errors keyed by the condition's index");
  assert.ok(sp.validateTax({ ...base, conditions: [reason("minora"), reason("majora")] })["conditionClassifier:1"], "a classifier only once");
  assert.ok(sp.validateTax({ ...base, conditions: [reason("minora"), who()] })["conditionValues:1"]);
  const e2 = sp.validateTax({ ...base, conditions: two, scenarioCalc: { "CLS-BIO-01=minora&CLS-BIO-02=mare": { mode: "reducere", percent: "" } } });
  assert.deepEqual(Object.keys(e2), ["percent:CLS-BIO-01=minora&CLS-BIO-02=mare"], "only the scenario with the empty reduction");
  const many = (code, n) => ({ classifier: code, values: Array.from({ length: n }, (_, i) => `v${i}`) });
  assert.equal(sp.taxScenarios({ conditions: [many("A", 5), many("B", 5)] }).length, 25);
  assert.ok(sp.validateTax({ ...base, conditions: [many("A", 5), many("B", 5)] }).scenarios, "25 > 24");
  assert.equal(sp.validateTax({ ...base, conditions: [many("A", 4), many("B", 6)] }).scenarios, undefined, "24 is fine");
});

// Hierarchical classifier (CAEM G ⊃ 47 ⊃ 47.3): a checked value covers what is under it,
// a checked child is an exception, the most specific scenario wins (2026-10-08)
const CAEM = [{ code: "CAEM", values: [
  { code: "G" }, { code: "46", parent: "G" }, { code: "47", parent: "G" },
  { code: "47.1", parent: "47" }, { code: "47.3", parent: "47" }, { code: "I" }, { code: "56", parent: "I" }
] }];
const tree = sp.classifierTree(CAEM);
check("taxe: hierarchy — a checked parent covers its children; ancestors from the tree", () => {
  assert.deepEqual(sp.valueAncestors(tree, "CAEM", "47.3"), ["47", "G"]);
  assert.deepEqual(sp.valueAncestors(tree, "CAEM", "G"), []);
  const g = { conditions: [{ classifier: "CAEM", values: ["G"] }] };
  assert.equal(sp.conditionApplies(g, { CAEM: "47.1" }, tree), true, "47.1 is under G");
  assert.equal(sp.conditionApplies(g, { CAEM: "56" }, tree), false);
  assert.equal(sp.conditionApplies(g, { CAEM: "47.1" }), false, "without a tree the classifier is flat");
});

check("taxe: hierarchy — the most specific checked value decides the amount", () => {
  const t = { conditions: [{ classifier: "CAEM", values: ["G", "47", "47.3"] }], scenarioCalc: { "CAEM=47": { mode: "reducere", percent: 50 } } };
  const pay = (code) => sp.taxAmount(t, T.mod, {}, { answers: { CAEM: code }, tree }).value;
  assert.equal(pay("46"), 7743, "46 → G (full tariff)");
  assert.equal(pay("47.1"), 3871.5, "47.1 → 47 (−50%)");
  assert.equal(pay("47.3"), 7743, "47.3 → its own row (exception of the exception)");
  assert.equal(sp.scenarioFor(t, { CAEM: "56" }, tree), null, "outside G = the tax does not apply");
});

check("taxe: hierarchy — G and 47 overlap (same tariff twice is a conflict); G and I do not", () => {
  const mk = (id, values) => tax({ id, tariffId: "t-com", requestType: "Emitere", condition: null, conditions: [{ classifier: "CAEM", values }] });
  assert.equal(sp.taxConflict([mk("a", ["G"])], mk("b", ["47"]), tree).id, "a");
  assert.equal(sp.taxConflict([mk("a", ["G"])], mk("b", ["I"]), tree), null);
  assert.equal(sp.taxConflict([mk("a", ["G"])], mk("b", ["47"])), null, "flat: different codes");
});

// Tariff formula: variables written {{nume}} like the templates (user, 2026-10-08)
check("formula: {{nume}} variables, spaces inside allowed; legacy {nume} still parsed", () => {
  assert.deepEqual(sp.formulaVariables("{{suprafata_m2}} * 2 + {{ taxa }} - {vechi}"), ["suprafata_m2", "taxa", "vechi"]);
  const r = sp.evaluateFormula("{{a}} * 2 + {b}", { a: 3, b: 1 }, "2 zecimale");
  assert.equal(r.ok, true); assert.equal(r.value, 7);
  assert.equal(sp.evaluateFormula("{{lipsa}} * 2", {}, "2 zecimale").ok, false, "a value is needed for every variable");
  const tf = { name: "T", amount: "", currency: "MDL", scope: "global", formula: true, expression: "{{necunoscut}} * 2", rounding: "2 zecimale" };
  assert.match(sp.validateTariff(tf, { variables: ["suprafata_m2"] }).expression, /\{\{necunoscut\}\}/, "the catalog error names the variable as written");
  assert.equal(sp.validateTariff({ ...tf, expression: "{{ suprafata_m2 }} * 2" }, { variables: ["suprafata_m2"] }).expression, undefined);
});

// Request type › Documente generate / Notificări: one row per flow step (US-222, US-223)
check("documentSteps: one row per document kind, keyed by step id, in flow order", () => {
  const flow = { definition: JSON.parse(readFileSync(new URL("../data/flows/ProcesFluxSimplificatFaraSupervizor.json", import.meta.url), "utf8")) };
  const docs = sp.documentSteps(flow);
  assert.deepEqual(docs.map((d) => d.docType), ["Decizie", "Notă de plată", "Act permisiv"]);
  assert.ok(docs.every((d) => d.key && d.stepName), "every row has a step id and name");
  assert.equal(new Set(docs.map((d) => d.kind)).size, docs.length, "each kind appears once");
});

check("documentSteps / notificationSteps: inline flows (steps only) and no flow", () => {
  assert.deepEqual(sp.documentSteps(null), []);
  assert.deepEqual(sp.notificationSteps(null), []);
  const inline = { steps: [{ id: "s1", name: "Creează proiectul actului" }, { id: "s2", name: "Examinare" }] };
  assert.deepEqual(sp.documentSteps(inline).map((d) => [d.key, d.kind]), [["s1", "act"]]);
  assert.deepEqual(sp.notificationSteps(inline), [], "inline flows carry no notify steps");
});

check("notificationSteps: one row per (notify step, event), key = stepId|event", () => {
  const flow = { definition: { states: [
    { id: "n1", title: "Notifică solicitantul", componentType: "notify", properties: { templateCodes: ["E1", "E2"] } },
    { id: "x", title: "Examinare", componentType: "task", properties: { templateCodes: ["E9"] } }
  ] } };
  assert.deepEqual(sp.notificationSteps(flow).map((n) => n.key), ["n1|E1", "n1|E2"]);
});

console.log(`\n${passed} checks passed`);
