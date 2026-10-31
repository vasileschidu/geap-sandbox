/* Seed for the Registers module, phase 1 (registre-v1, 2026-10-23) → data/registre.json
   node tools/registre/seed.mjs   (deterministic: same output on every run)

   Register definitions (what the AdminPortal builder — US-146…150, phase 2 — would publish) + the records of the three
   source objects the BO page does not already have: Acte permisive (Feature 91139 / US-196), Note de plată (94155 /
   US-197), Avize (94526 / US-198). Dosare come from the BO dossier seed (data/e-permits-workplace.json, built by the
   shell). Names reuse the workplace seed (solicitanți, servicii, specialiști) so the same people appear everywhere. */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const workplace = JSON.parse(fs.readFileSync(path.join(ROOT, "data/e-permits-workplace.json"), "utf8"));

let seed = 20261023;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = (list) => list[Math.floor(rnd() * list.length)];
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pad = (n, w = 2) => String(n).padStart(w, "0");
const TODAY = new Date("2026-10-23T12:00:00");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isoT = (d) => `${iso(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
const daysFrom = (base, n, h = int(8, 17), m = int(0, 59)) => { const d = new Date(base); d.setDate(d.getDate() + n); d.setHours(h, m, 0, 0); return d; };
const digits = (first, n = 13) => first + Array.from({ length: n - first.length }, () => int(0, 9)).join("");

const AUTHORITIES = {
  ANSP: { code: "ANSP", name: "Agenția Națională pentru Sănătate Publică", subdivisions: ["CSP Chișinău", "CSP Bălți", "CSP Cahul", "CSP Comrat", "CSP Orhei"] },
  ANSA: { code: "ANSA", name: "Agenția Națională pentru Siguranța Alimentelor", subdivisions: ["DT ANSA Chișinău", "DT ANSA Bălți", "DT ANSA Cahul"] },
  ANTA: { code: "ANTA", name: "Agenția Națională Transport Auto", subdivisions: ["Oficiul Chișinău", "Oficiul Bălți"] },
  AM: { code: "AM", name: "Agenția de Mediu", subdivisions: ["Direcția autorizări de mediu"] },
  ASP: { code: "ASP", name: "Agenția Servicii Publice", subdivisions: ["Direcția licențiere"] }
};

/* act types per authority + their specific fields (Date specifice actului) */
const ACT_TYPES = [
  { auth: "ANSP", prefix: "AUT", name: "Autorizație sanitară de funcționare", place: true, fields: () => [["Tipul activității", pick(["Alimentație publică", "Comerț cu produse alimentare", "Prestări servicii de înfrumusețare", "Instituție de învățământ preșcolar"])], ["Suprafața încăperilor", `${int(40, 620)} m²`], ["Capacitatea", `${int(12, 180)} locuri`]] },
  { auth: "ANSP", prefix: "AVZ", name: "Aviz sanitar privind atribuirea terenului pentru construcție", place: true, fields: () => [["Numărul cadastral", `${int(100, 999)}${int(1000, 9999)}.${int(100, 999)}`], ["Destinația terenului", pick(["Construcție locativă", "Obiectiv comercial", "Depozit"])]] },
  { auth: "ANSA", prefix: "AUT", name: "Autorizație sanitar-veterinară pentru exploatații zootehnice", place: true, fields: () => [["Specia", pick(["Bovine", "Ovine", "Păsări", "Porcine"])], ["Efectivul maxim", `${int(40, 2400)} capete`], ["Cod exploatație", `MD${int(100000, 999999)}`]] },
  { auth: "ANSA", prefix: "CRT", name: "Certificat de conformitate pentru produse alimentare", place: false, fields: () => [["Produsul", pick(["Lapte pasteurizat 2,5 %", "Pâine albă de grâu", "Vin sec alb", "Brânză de vaci"])], ["Lotul", `L-${int(1000, 9999)}/${int(23, 26)}`]] },
  { auth: "ANSA", prefix: "AUT", name: "Autorizație pentru activitate de alimentație publică", place: true, fields: () => [["Tipul unității", pick(["Cafenea", "Restaurant", "Cantină", "Bar"])], ["Numărul de locuri", `${int(16, 140)}`]] },
  { auth: "ANTA", prefix: "LIC", name: "Licență de transport rutier de persoane", place: false, fields: () => [["Numărul de autovehicule", `${int(2, 38)}`], ["Tipul transportului", pick(["Regulat interraional", "Ocazional", "Regulat suburban"])]] },
  { auth: "ANTA", prefix: "AUT", name: "Autorizație pentru activitatea de taxi", place: false, fields: () => [["Numărul de înmatriculare", `${pick(["C", "B", "K"])}${pick(["AA", "BC", "TX"])} ${int(100, 999)}`], ["Marca autovehiculului", pick(["Toyota Prius", "Škoda Octavia", "Hyundai Ioniq"])]] },
  { auth: "AM", prefix: "AUT", name: "Autorizație de mediu pentru folosința specială a apei", place: true, fields: () => [["Sursa de apă", pick(["Fântână arteziană nr. 2", "Râul Bâc", "Lacul Ghidighici"])], ["Volumul anual", `${int(2, 90)} 000 m³`]] },
  { auth: "AM", prefix: "AUT", name: "Autorizație de gestionare a deșeurilor", place: true, fields: () => [["Categoria deșeurilor", pick(["Nepericuloase", "Deșeuri de ambalaje", "Deșeuri de construcții"])], ["Cantitatea anuală", `${int(20, 900)} t`]] },
  { auth: "ASP", prefix: "LIC", name: "Licență pentru producerea alcoolului etilic", place: true, fields: () => [["Capacitatea de producție", `${int(10, 160)} 000 dal / an`], ["Depozit autorizat", "da"]] },
  { auth: "ASP", prefix: "AUT", name: "Autorizație de comerț cu produse alcoolice", place: true, fields: () => [["Tipul comerțului", pick(["Cu amănuntul", "Cu ridicata"])], ["Suprafața comercială", `${int(30, 400)} m²`]] }
];
const PLACES = ["mun. Chișinău, str. Alba Iulia 20", "mun. Bălți, str. Independenței 14", "or. Cahul, str. Republicii 8", "or. Orhei, str. Vasile Lupu 33", "mun. Comrat, str. Lenin 102", "s. Lăpușna, r-nul Hîncești", "or. Ungheni, str. Națională 5", "mun. Chișinău, bd. Dacia 47", "or. Soroca, str. Ștefan cel Mare 12"];
const PEOPLE = workplace.solicitanti;
const REPRESENTATIVES = ["Ion Rusu", "Maria Ceban", "Andrei Lupu", "Elena Bivol", "Victor Grosu", "Natalia Cojocaru"];

const acts = [];
const STATUS_PLAN = [
  ...Array(44).fill("Valabil"), ...Array(8).fill("Suspendat"), ...Array(9).fill("Expirat"), ...Array(6).fill("Retras"), ...Array(5).fill("Anulat")
];
const SUSPEND_REASONS = ["Neconformități constatate la controlul din teren", "Lipsa contractului de colectare a deșeurilor", "Cererea titularului — renovarea spațiului"];
const WITHDRAW_REASONS = ["Încălcarea repetată a condițiilor actului", "Cererea titularului de încetare a activității", "Lichidarea întreprinderii"];
const CANCEL_REASONS = ["Date false în documentele depuse", "Hotărâre judecătorească definitivă"];
STATUS_PLAN.forEach((status, i) => {
  const type = ACT_TYPES[i % ACT_TYPES.length];
  const auth = AUTHORITIES[type.auth];
  /* every 3rd ANSP act lands in CSP Chișinău (the demo specialist's subdivision) */
  const subdivision = type.auth === "ANSP" && i % 3 === 0 ? "CSP Chișinău" : pick(auth.subdivisions);
  const person = PEOPLE[(i * 7) % PEOPLE.length];
  const pj = Boolean(person.companie);
  const issuedDays = status === "Expirat" ? -int(800, 1500) : -int(10, 900);
  const issued = daysFrom(TODAY, issuedDays);
  const years = status === "Expirat" ? int(1, 2) : int(1, 5);
  const until = new Date(issued); until.setFullYear(until.getFullYear() + years); until.setDate(until.getDate() - 1);
  if (status === "Expirat" && until > TODAY) until.setTime(daysFrom(TODAY, -int(5, 120)).getTime());
  /* an act that is not Expirat still runs: its end lies after today */
  while (status !== "Expirat" && until <= TODAY) until.setFullYear(until.getFullYear() + 1);
  const nr = `${type.prefix}-${issued.getFullYear()}-${pad(1200 + i * 37, 6)}`;
  const versions = [{ v: 1, event: "Emitere", at: isoT(issued), reason: "Act emis la finalizarea examinării dosarului." }];
  if (i % 5 === 1) { const d = daysFrom(issued, int(60, 300)); if (d < TODAY) versions.push({ v: 2, event: "Reperfectare", at: isoT(d), reason: "Schimbarea adresei juridice a titularului." }); }
  const last = new Date(versions[versions.length - 1].at);
  const after = (lo, hi) => { const d = daysFrom(last, int(lo, hi)); return d < TODAY ? d : daysFrom(TODAY, -int(2, 30)); };
  let statusChange = null;
  /* a suspension still running: it ends after today (else the act would be Valabil again) */
  if (status === "Suspendat") { const d = after(20, 200); const end = daysFrom(d, int(30, 90)); statusChange = { at: isoT(d), reason: pick(SUSPEND_REASONS), until: iso(end > TODAY ? end : daysFrom(TODAY, int(10, 75))) }; versions.push({ v: versions.length + 1, event: "Suspendare", at: statusChange.at, reason: statusChange.reason }); }
  if (status === "Retras") { const d = after(30, 300); statusChange = { at: isoT(d), reason: pick(WITHDRAW_REASONS) }; versions.push({ v: versions.length + 1, event: "Retragere", at: statusChange.at, reason: statusChange.reason }); }
  if (status === "Anulat") { const d = after(10, 120); statusChange = { at: isoT(d), reason: pick(CANCEL_REASONS) }; versions.push({ v: versions.length + 1, event: "Anulare", at: statusChange.at, reason: statusChange.reason }); }
  if (status === "Expirat") versions.push({ v: versions.length + 1, event: "Expirare", at: `${iso(daysFrom(until, 1))}T00:05:00`, reason: "Termenul de valabilitate a expirat.", system: true });
  acts.push({
    id: `act-${pad(i + 1, 3)}`,
    nr,
    name: type.name,
    type: type.name.split(" ")[0],
    authority: auth.code,
    subdivision,
    beneficiary: pj
      ? { kind: "PJ", name: person.companie, idno: digits("100"), representative: person.nume, address: pick(PLACES), phone: `+373 ${int(60, 79)} ${int(100, 999)} ${int(100, 999)}`, email: `office@${person.companie.toLowerCase().replace(/^(srl|sa|îi)\s+/u, "").replace(/[^a-z]+/g, "")}.md` }
      : { kind: "PF", name: person.nume, idnp: digits("200"), address: pick(PLACES), phone: `+373 ${int(60, 79)} ${int(100, 999)} ${int(100, 999)}`, email: `${person.nume.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/g, ".")}@mail.md` },
    place: type.place ? pick(PLACES) : "",
    dossier: `D-${issued.getFullYear()}-${pad(int(1000, 4800), 6)}`,
    status,
    tacit: status === "Valabil" && i % 11 === 4,
    issued: isoT(issued),
    validUntil: iso(until),
    statusChange,
    versions,
    fields: type.fields()
  });
});

/* payment notes: one per examination dossier fee (ANSP mostly) + recurring annual fees on acts */
const NOTE_STATUS = [
  ...Array(22).fill("Achitată"), ...Array(9).fill("Emisă"), ...Array(4).fill("Parțial achitată"), ...Array(6).fill("Neachitată"),
  ...Array(6).fill("Expirată"), ...Array(4).fill("Anulată"), ...Array(3).fill("Rambursată")
];
const FEES = [["Taxă de examinare", 560], ["Taxă de eliberare a actului", 460], ["Taxă pentru eliberarea duplicatului", 230], ["Taxă anuală de licență", 1800], ["Taxă de reperfectare", 290]];
const METHODS = ["Card bancar", "Card bancar", "Transfer bancar", "Numerar (ghișeu)"];
const SPECIALISTS = workplace.specialisti.map((s) => s.nume);
const notes = NOTE_STATUS.map((status, i) => {
  const recurring = i % 6 === 5;
  const act = recurring ? acts[(i * 5) % acts.length] : null;
  const auth = act ? AUTHORITIES[act.authority] : AUTHORITIES[i % 7 === 3 ? "ANSA" : i % 9 === 4 ? "ANTA" : "ANSP"];
  const subdivision = act ? act.subdivision : auth.code === "ANSP" && i % 2 === 0 ? "CSP Chișinău" : pick(auth.subdivisions);
  const person = PEOPLE[(i * 5 + 3) % PEOPLE.length];
  /* the service matches the authority that examines it */
  const service = act ? act.name : pick(ACT_TYPES.filter((t) => t.auth === auth.code).map((t) => t.name));
  const lines = recurring ? [FEES[3]] : i % 4 === 2 ? [FEES[2]] : i % 5 === 1 ? [FEES[0], FEES[1]] : [FEES[0]];
  const total = lines.reduce((s, [, a]) => s + a, 0);
  const issued = daysFrom(TODAY, -int(1, 160));
  const due = daysFrom(issued, recurring ? 30 : 10, 23, 59);
  const paidAt = ["Achitată", "Parțial achitată", "Rambursată"].includes(status) ? daysFrom(issued, int(0, 8)) : null;
  const paid = status === "Achitată" || status === "Rambursată" ? total : status === "Parțial achitată" ? Math.round(total * 0.5) : 0;
  const txStatus = { "Achitată": "Finalizată cu succes", "Parțial achitată": "Finalizată cu succes", "Rambursată": "Finalizată cu succes", "Emisă": i % 3 === 0 ? "În așteptare" : "", "Neachitată": "Eșuată", "Expirată": i % 2 ? "Eșuată" : "", "Anulată": "Anulată" }[status];
  const fixedDue = status === "Emisă" && due < TODAY ? daysFrom(TODAY, int(2, 9), 23, 59) : status === "Expirată" && due > TODAY ? daysFrom(TODAY, -int(2, 30), 23, 59) : due;
  return {
    id: `np-${pad(i + 1, 3)}`,
    nr: `NP-2026-${pad(4100 + i * 13, 6)}`,
    ref: act ? { kind: "act", nr: act.nr } : { kind: "dosar", nr: `D-2026-${pad(4400 + i * 7, 6)}` },
    service,
    authority: auth.code,
    subdivision,
    payer: person.companie ? { kind: "PJ", name: person.companie, id: digits("100") } : { kind: "PF", name: person.nume, id: digits("200") },
    lines: lines.map(([label, amount]) => ({ label, amount })),
    total,
    paid,
    currency: "MDL",
    method: txStatus ? pick(METHODS) : "",
    confirmedBy: pick(SPECIALISTS),
    issued: isoT(issued),
    due: isoT(fixedDue),
    paidAt: paidAt ? isoT(paidAt) : "",
    status,
    mpay: txStatus ? { id: `MPAY-2026-${pad(7700000 + i * 131, 7)}`, status: txStatus, at: isoT(paidAt || daysFrom(issued, int(0, 6))) } : null,
    refund: status === "Rambursată" ? { at: isoT(daysFrom(paidAt, int(3, 20))), reason: "Cererea a fost retrasă înainte de examinare." } : null
  };
});

/* avize (Expertise): asked during examination, from the reviewing authority */
const AVIZ_TYPES = [
  { tip: "Aviz sanitar", auth: "ANSP" },
  { tip: "Aviz sanitar-veterinar", auth: "ANSA" },
  { tip: "Aviz de mediu", auth: "AM" },
  { tip: "Aviz al Serviciului Pompieri și Salvatori", auth: "IGSU" },
  { tip: "Expertiză tehnică a proiectului", auth: "ANSP" }
];
AUTHORITIES.IGSU = { code: "IGSU", name: "Inspectoratul General pentru Situații de Urgență", subdivisions: ["DSE Chișinău", "DSE Bălți"] };
const AVIZ_STATUS = [...Array(16).fill("Favorabil"), ...Array(5).fill("Nefavorabil"), ...Array(8).fill("În lucru"), ...Array(4).fill("Expirat"), ...Array(3).fill("Retras")];
const avize = AVIZ_STATUS.map((status, i) => {
  const t = AVIZ_TYPES[i % AVIZ_TYPES.length];
  const auth = AUTHORITIES[t.auth];
  const person = PEOPLE[(i * 11 + 1) % PEOPLE.length];
  const asked = daysFrom(TODAY, -int(5, 300));
  const issued = status === "În lucru" ? null : daysFrom(asked, int(2, 14));
  return {
    id: `av-${pad(i + 1, 3)}`,
    nr: `AV-2026-${pad(2300 + i * 17, 6)}`,
    tip: t.tip,
    authority: auth.code,
    subdivision: auth.code === "ANSP" && i % 2 === 0 ? "CSP Chișinău" : pick(auth.subdivisions),
    dossier: `D-2026-${pad(4400 + i * 9, 6)}`,
    service: pick(workplace.servicii.slice(0, 8)),
    applicant: person.companie || person.nume,
    status,
    asked: isoT(asked),
    issued: issued ? isoT(issued) : "",
    validUntil: issued ? iso(daysFrom(issued, status === "Expirat" ? -1 : 365)) : "",
    expert: pick(["Lilia Popa", "Sergiu Ciobanu", "Doina Rusnac", "Ghenadie Vrabie"]),
    conclusion: { "Favorabil": "Obiectivul corespunde cerințelor; se avizează favorabil.", "Nefavorabil": "Neconformități nerezolvate: lipsa sistemului de ventilare.", "În lucru": "", "Expirat": "Avizul a expirat înainte de emiterea actului.", "Retras": "Avizul a fost retras la cererea autorității solicitante." }[status]
  };
});
avize.filter((a) => a.status === "Expirat").forEach((a, k) => { const d = daysFrom(TODAY, -int(400, 600)); a.issued = isoT(d); a.validUntil = iso(daysFrom(d, 365)); a.asked = isoT(daysFrom(d, -5)); });

/* Register definitions = what the AdminPortal builder publishes (Feature 94523 data model: code, name, source object,
   scope, version, columns {key, label, width, align, visible, sortable, filter}, predefined filter, row actions
   {key, type, label, icon, roles}). The BO renders ONLY what is here (US-194 AC-02 „fără elemente fixe suplimentare”).
   filter: "text" (search) · "single" / "multi" (checklist facet) · "date" (period facet) · null.
   Action types (94523): open · form · process-start · process-advance · custom (Control personalizat).
   Roles = BO role ids (Feature 89940); grants = who sees the register at all (Register Grant). */
const col = (key, label, width, o = {}) => ({ key, label, width, align: o.align || "left", visible: o.visible !== false, sortable: Boolean(o.sortable), filter: o.filter || null });
const registers = [
  {
    id: "reg-dosare", code: "Case.Global.RegistruDosare", name: "Registru Dosare", object: "Case", objectLabel: "Dosare", scope: "Global",
    category: "Procesarea dosarelor", icon: "document", version: "v1.2.0", status: "Publicat", publishedAt: "2026-10-02T10:15:00",
    description: "Toate dosarele depuse, cu statutul, etapa și actorul responsabil — fără a căuta dosarul în listele de lucru.",
    grants: ["central-admin", "supervisor", "director", "specialist"],
    predefinedFilter: { label: "Doar dosarele depuse (fără schițe)", rules: [{ field: "status", op: "≠", value: "schita" }] },
    defaultSort: { key: "depus", dir: "desc" },
    columns: [
      col("nr", "Nr. dosar", 168, { sortable: true, filter: "text" }),
      col("solicitant", "Solicitant", 208, { sortable: true, filter: "text" }),
      col("serviciu", "Serviciu", 232, { sortable: true, filter: "multi" }),
      col("subdiviziune", "Autoritate / Subdiviziune", 196, { sortable: true, filter: "multi" }),
      col("statut", "Statut dosar", 152, { sortable: true, filter: "multi" }),
      col("actor", "Actor responsabil", 176, { sortable: true, filter: "multi" }),
      col("modDistribuire", "Mod distribuire", 140, { visible: false, filter: "multi" }),
      col("depus", "Data depunerii", 160, { sortable: true, filter: "date" }),
      col("termen", "Termen de examinare", 176, { sortable: true, filter: "date" }),
      col("tip", "Tip solicitare", 140, { visible: false, filter: "multi" })
    ],
    actions: [
      { key: "open", type: "open", label: "Deschide dosarul", icon: "document", roles: [] },
      { key: "push", type: "custom", control: "PushCase", label: "Transfer administrativ", icon: "direction", roles: ["central-admin"], permission: "Cases.Case.Push" },
      { key: "archive", type: "custom", control: "ArchiveRecord", label: "Arhivează dosarul", icon: "page-text-lock", roles: ["central-admin", "supervisor"] },
      { key: "strike", type: "custom", control: "StrikeCase", label: "Radiază dosarul", icon: "circle-x", roles: ["central-admin"], danger: true },
      { key: "anonymize", type: "custom", control: "Anonymize", label: "Anonimizează datele personale", icon: "shield-keyhole", roles: ["central-admin"], danger: true }
    ]
  },
  {
    id: "reg-acte", code: "Permit.Global.RegistrulActelorPermisive", name: "Registrul actelor permisive", object: "Permit", objectLabel: "Acte permisive", scope: "Global",
    category: "Acte permisive", icon: "permission", version: "v2.0.1", status: "Publicat", publishedAt: "2026-09-30T16:40:00",
    description: "Actele permisive emise de autoritățile din perimetrul tău: statutul, valabilitatea și lanțul de versiuni.",
    grants: ["central-admin", "local-admin", "supervisor", "director", "specialist"],
    predefinedFilter: null,
    exportNeedsCriteria: true,
    defaultSort: { key: "emis", dir: "desc" },
    columns: [
      col("nr", "Nr. act", 168, { sortable: true, filter: "text" }),
      col("denumire", "Denumire act", 264, { sortable: true, filter: "multi" }),
      col("autoritate", "Autoritate emitentă", 168, { sortable: true, filter: "multi" }),
      col("beneficiar", "Beneficiar", 208, { sortable: true, filter: "text" }),
      col("status", "Status", 144, { sortable: true, filter: "multi" }),
      col("emis", "Data emiterii", 160, { sortable: true, filter: "date" }),
      col("valabil", "Valabil până la", 168, { sortable: true, filter: "date" }),
      col("dosar", "Nr. dosar", 160, { visible: false, filter: "text" }),
      col("tip", "Tip act", 140, { visible: false, filter: "multi" })
    ],
    /* US-317 AC-03: «Vizualizare detalii» opens the act card (configured in the builder, Feature 94523) */
    actions: [{ key: "open", type: "open", label: "Vizualizare detalii", icon: "eye-open", roles: [] }]
  },
  {
    id: "reg-note", code: "PaymentOrder.Global.RegistruNotePlata", name: "Registru note de plată", object: "Invoice", objectLabel: "Note de plată", scope: "Global",
    category: "Plăți", icon: "receipt-bill", version: "v1.0.3", status: "Publicat", publishedAt: "2026-10-01T09:05:00",
    description: "Notele de plată și tranzacțiile MPay corelate: suma, metoda de plată și cele două statuturi.",
    grants: ["central-admin", "local-admin", "supervisor", "director", "specialist"],
    predefinedFilter: null,
    defaultSort: { key: "emisa", dir: "desc" },
    columns: [
      col("nr", "Nr. notă de plată", 176, { sortable: true, filter: "text" }),
      col("referinta", "Dosar / Act permisiv", 176, { sortable: true, filter: "text" }),
      col("solicitant", "Solicitant", 200, { sortable: true, filter: "text" }),
      col("serviciu", "Serviciu", 224, { sortable: true, filter: "multi" }),
      col("suma", "Sumă", 136, { align: "right", sortable: true, filter: null }),
      col("statutNota", "Statut notă", 152, { sortable: true, filter: "multi" }),
      col("statutMpay", "Tranzacție MPay", 176, { sortable: true, filter: "multi" }),
      col("metoda", "Metodă de plată", 160, { sortable: true, filter: "multi" }),
      col("autoritate", "Autoritate / Subdiviziune", 196, { sortable: true, filter: "multi" }),
      col("emisa", "Data emiterii", 160, { sortable: true, filter: "date" }),
      col("termen", "Termen de achitare", 168, { sortable: true, filter: "date" }),
      col("confirmatDe", "Confirmat de", 168, { sortable: true, filter: "multi" }),
      col("mpay", "Nr. MPay", 160, { visible: false, filter: "text" })
    ],
    actions: []
  },
  {
    id: "reg-avize", code: "Expertise.Global.RegistruAvize", name: "Registru Avize", object: "Expertise", objectLabel: "Avize", scope: "Global",
    category: "Avizare", icon: "stamp", version: "v1.0.0", status: "Publicat", publishedAt: "2026-10-02T14:20:00",
    description: "Avizele și expertizele cerute în examinarea dosarelor: tipul, autoritatea avizatoare și concluzia.",
    grants: ["central-admin", "supervisor", "director", "specialist"],
    predefinedFilter: null,
    defaultSort: { key: "emis", dir: "desc" },
    columns: [
      col("nr", "Nr. aviz", 160, { sortable: true, filter: "text" }),
      col("tip", "Tip aviz", 232, { sortable: true, filter: "multi" }),
      col("dosar", "Dosar", 160, { sortable: true, filter: "text" }),
      col("solicitant", "Solicitant", 192, { sortable: true, filter: "text" }),
      col("autoritate", "Autoritate / Subdiviziune", 196, { sortable: true, filter: "multi" }),
      col("statut", "Statut aviz", 140, { sortable: true, filter: "multi" }),
      col("emis", "Data emiterii", 160, { sortable: true, filter: "date" }),
      col("valabil", "Valabil până la", 168, { sortable: true, filter: "date" })
    ],
    actions: []
  },
  {
    id: "reg-solicitanti", code: "Applicant.Global.RegistruSolicitanti", name: "Registru solicitanți", object: "Applicant", objectLabel: "Solicitanți", scope: "Global",
    category: "Solicitanți", icon: "people", version: "", status: "În curând",
    description: "Persoanele fizice și juridice care au interacționat cu GEAP, cu cererile și actele lor.",
    grants: ["central-admin", "local-admin", "supervisor", "director", "specialist"], soon: true, columns: [], actions: []
  }
];

/* „Poziția în listă” (US-146 / US-148): the order of the registers inside their perimeter tab and of the BO menu */
registers.filter((r) => !r.soon).forEach((r, i) => { r.position = i + 1; });

/* ---------------------------------------------------------------- phase 2 (registre-v2): the AdminPortal builder
   US-146 creare · US-147 listă · US-148 editare · US-149 configurare · US-150 publicare + istoric versiuni · US-193
   depreciere / reactivare · US-215 acces. Deterministic data only (no rnd() — every record above stays byte-identical).
   js/registre.js builds the builder catalog from `registers` (the published definitions) + `admin.registers` (the
   builder's own data: names RU / EN, editors, the published version history, the access grants) + `admin.extra`
   (registers that exist only in the AdminPortal: drafts, perimeter Autoritate / Serviciu, a deprecated one). */
const USERS = ["Anastasia Cojocaru", "Vasile Schidu", "Ion Popescu", "Mariana Rusu"];
const by = (i) => USERS[i % USERS.length];
const grant = (role, authority, at, who, extra = {}) => ({ role, authority: authority || null, at, by: who, ...extra });
const ver = (version, at, note, who, o = {}) => ({ version, at, note, by: who, type: o.type || "Publicare", drop: { columns: o.columns || [], actions: o.actions || [] } });
const DOSARE_LATER = ["push", "archive", "strike", "anonymize"];
/* [id, object, scope, authority, name, description, predefined rules [column, op, value][], logic, roles with the grant] */
const LOCAL_ROLES = ["specialist", "supervisor", "director"];
const SCALE = [
  ["reg-acteansp", "Permit", "Authority", "ANSP", "Autorizații sanitare ANSP", "Autorizațiile sanitare de funcționare și avizele sanitare emise de ANSP.", null, null, LOCAL_ROLES],
  ["reg-acteansa", "Permit", "Authority", "ANSA", "Acte permisive ANSA", "Autorizațiile sanitar-veterinare, certificatele de conformitate și avizele emise de ANSA."],
  ["reg-licenteanta", "Permit", "Authority", "ANTA", "Licențe și autorizații de transport ANTA", "Licențele de transport rutier de persoane și autorizațiile de taxi emise de ANTA.", null, null, ["specialist"]],
  ["reg-acteam", "Permit", "Authority", "AM", "Autorizații de mediu", "Autorizațiile pentru folosința specială a apei și gestionarea deșeurilor, emise de Agenția de Mediu."],
  ["reg-licenteasp", "Permit", "Authority", "ASP", "Licențe pentru alcool ASP", "Licențele pentru producerea alcoolului etilic și autorizațiile de comerț cu produse alcoolice."],
  ["reg-licente", "Permit", "Global", null, "Licențe", "Toate licențele emise, de la toate autoritățile, cu titularul și termenul de valabilitate.", [["tip", "is", "Licență"]]],
  ["reg-certificate", "Permit", "Global", null, "Certificate de conformitate", "Certificatele de conformitate pentru produse alimentare și titularii lor.", [["tip", "is", "Certificat"]]],
  ["reg-actesuspendate", "Permit", "Global", null, "Acte suspendate", "Actele permisive cu valabilitatea suspendată, pentru urmărirea reluării sau a retragerii.", [["status", "is", "Suspendat"]]],
  ["reg-acteexpirate", "Permit", "Global", null, "Acte expirate", "Actele permisive expirate, pentru notificarea titularilor și reînnoire.", [["status", "is", "Expirat"]]],
  ["reg-acteretrase", "Permit", "Global", null, "Acte retrase și anulate", "Actele permisive retrase sau anulate, cu temeiul și data deciziei.", [["status", "is", "Retras"], ["status", "is", "Anulat"]], "or"],
  ["reg-noteansp", "Invoice", "Authority", "ANSP", "Note de plată ANSP", "Notele de plată emise de ANSP și subdiviziunile ei, cu statutul plății MPay.", null, null, LOCAL_ROLES],
  ["reg-noteansa", "Invoice", "Authority", "ANSA", "Note de plată ANSA", "Notele de plată emise de ANSA pentru autorizări și certificări."],
  ["reg-noteanta", "Invoice", "Authority", "ANTA", "Note de plată ANTA", "Notele de plată pentru licențele și autorizațiile de transport ANTA.", null, null, ["specialist"]],
  ["reg-noteneachitate", "Invoice", "Global", null, "Note de plată neachitate", "Notele de plată neachitate sau achitate parțial, pentru notificarea solicitanților.", [["statutNota", "is", "Neachitată"], ["statutNota", "is", "Parțial achitată"]], "or"],
  ["reg-rambursari", "Invoice", "Global", null, "Rambursări", "Notele de plată rambursate, cu tranzacția MPay și motivul rambursării.", [["statutNota", "is", "Rambursată"]]],
  ["reg-noteexpirate", "Invoice", "Global", null, "Note de plată expirate", "Notele de plată al căror termen de achitare a trecut fără plată.", [["statutNota", "is", "Expirată"]]],
  ["reg-avizeansp", "Expertise", "Authority", "ANSP", "Avize sanitare ANSP", "Avizele sanitare cerute ANSP în examinarea dosarelor altor autorități.", null, null, LOCAL_ROLES],
  ["reg-avizeansa", "Expertise", "Authority", "ANSA", "Avize ANSA", "Avizele sanitar-veterinare eliberate de ANSA pentru dosarele în examinare."],
  ["reg-avizeam", "Expertise", "Authority", "AM", "Avize de mediu", "Avizele de mediu cerute Agenției de Mediu, cu concluzia și termenul de valabilitate."],
  ["reg-avizeinlucru", "Expertise", "Global", null, "Avize în lucru", "Avizele cerute și încă nefinalizate, pentru urmărirea termenelor de răspuns.", [["statut", "is", "În lucru"]]],
  ["reg-avizenefavorabile", "Expertise", "Global", null, "Avize nefavorabile", "Avizele nefavorabile, cu autoritatea avizatoare și dosarul afectat.", [["statut", "is", "Nefavorabil"]]],
  ["reg-expertize", "Expertise", "Global", null, "Expertize tehnice ale proiectelor", "Expertizele tehnice ale proiectelor cerute în procedura de autorizare a construcțiilor.", [["tip", "contains", "Expertiză"]]],
  ["reg-dosarerespinse", "Case", "Global", null, "Dosare respinse", "Dosarele respinse, cu motivul respingerii, pentru contestații și statistică.", [["statut", "is", "Respins"]]],
  ["reg-dosaresemnare", "Case", "Global", null, "Dosare spre semnare", "Dosarele care așteaptă semnătura conducătorului, din toate subdiviziunile.", [["statut", "is", "Spre semnare"]]],
  ["reg-dosareeliberate", "Case", "Global", null, "Dosare eliberate", "Dosarele finalizate cu actul eliberat, pentru arhivare și raportare.", [["statut", "is", "Eliberat"]]]
];
const admin = {
  /* the BO roles a register can be granted to (Feature 89940; local = visible to an Administrator local, AC-07) */
  roles: [
    { id: "central-admin", label: "Administrator central", local: false },
    { id: "local-admin", label: "Administrator local", local: true },
    { id: "specialist", label: "Specialist", local: true },
    { id: "supervisor", label: "Supervizor", local: true },
    { id: "director", label: "Director", local: true },
    { id: "operator-ghiseu", label: "Specialist ghișeu", local: true },
    { id: "expert", label: "Expert", local: false },
    { id: "auditor", label: "Auditor", local: false }
  ],
  /* the Serviciu perimeter (Feature 94523: „Serviciu necesar pentru Registrul medicamentelor / NIAC”) */
  services: [
    { code: "003000118", name: "Autorizație sanitară de funcționare", authority: "ANSP" },
    { code: "003000519", name: "Înregistrarea produselor biocide", authority: "ANSP" },
    { code: "003000402", name: "Aviz sanitar-veterinar pentru unitățile de producție", authority: "ANSA" },
    { code: "003000312", name: "Autorizație de mediu pentru emisii", authority: "AM" }
  ],
  /* action targets (US-149 AC-20): Form Designer forms, processes (Epic 85371), custom controls */
  targets: {
    forms: [
      { id: "f-notificare-comert", label: "Cerere de notificare în comerț" },
      { id: "f-autorizatie-sanitara", label: "Cerere de eliberare a autorizației sanitare de funcționare" },
      { id: "f-constatare-control", label: "Proces-verbal de constatare la control" },
      { id: "f-corectare-date", label: "Cerere de corectare a datelor dosarului" }
    ],
    processes: [
      { id: "p-autorizare", label: "Flux standard de autorizare", version: "v3.2.0" },
      { id: "p-simplificat", label: "Flux simplificat fără supervizor", version: "v1.4.0" },
      { id: "p-suspendare", label: "Suspendarea actului permisiv", version: "v1.1.0" },
      { id: "p-reperfectare", label: "Reperfectarea actului permisiv", version: "v2.0.0" }
    ],
    /* controls written in code (Feature 94523 comments: Anonimizare, Arhivare, Radiere dosar, Modificare statut act,
       Modificare punct proces); objects = the source objects the control works on */
    controls: [
      { id: "PushCase", label: "Transfer administrativ (Push Case)", objects: ["Case"], danger: false },
      { id: "ArchiveRecord", label: "Arhivare", objects: ["Case"], danger: false },
      { id: "StrikeCase", label: "Radiere dosar", objects: ["Case"], danger: true },
      { id: "Anonymize", label: "Anonimizare date personale", objects: ["Case"], danger: true },
      { id: "ChangePermitStatus", label: "Modificare statut act", objects: ["Permit"], danger: false },
      { id: "MarkPaid", label: "Confirmare plată manuală", objects: ["Invoice"], danger: false },
      { id: "WithdrawExpertise", label: "Retragere aviz", objects: ["Expertise"], danger: true }
    ]
  },
  /* the fixed set of 20 row-action icons (Feature 94523) */
  icons: [
    ["document", "Document"], ["page-text", "Pagină"], ["edit", "Editare"], ["direction", "Direcție"], ["page-text-lock", "Arhivă"],
    ["circle-x", "Anulare"], ["shield-keyhole", "Protecție"], ["delete", "Ștergere"], ["eye-open", "Vizualizare"], ["export", "Export"],
    ["stamp", "Ștampilă"], ["permission", "Act permisiv"], ["receipt-bill", "Notă de plată"], ["people", "Persoane"], ["history", "Istoric"],
    ["rotate-arrow", "Reluare"], ["pause", "Suspendare"], ["checkmark-large", "Confirmare"], ["settings", "Setări"], ["tree", "Proces"]
  ],
  categories: { Case: "Procesarea dosarelor", Permit: "Acte permisive", Invoice: "Plăți", Expertise: "Avizare" },
  /* the builder's data of the four published registers above (id → names, editors, history, grants) */
  registers: {
    "reg-dosare": {
      names: { ru: "Реестр дел", en: "Case register" }, createdAt: "2026-05-28T11:20:00", createdBy: by(0), editedAt: "2026-10-02T10:15:00", editedBy: by(0),
      versions: [
        ver("v1.0.0", "2026-06-02T09:40:00", "Registrul dosarelor din toate autoritățile: număr, solicitant, serviciu, statut.", by(0), { type: "Prima publicare", columns: ["actor", "termen", "tip"], actions: DOSARE_LATER }),
        ver("v1.0.1", "2026-06-10T14:05:00", "Coloana „Actor responsabil”, filtrabilă.", by(1), { columns: ["termen", "tip"], actions: DOSARE_LATER }),
        ver("v1.0.2", "2026-06-24T10:30:00", "Coloana „Termen de examinare” cu filtru pe perioadă.", by(0), { columns: ["tip"], actions: DOSARE_LATER }),
        ver("v1.0.3", "2026-07-08T16:12:00", "Filtru predefinit: fără schițe.", by(2), { columns: ["tip"], actions: DOSARE_LATER }),
        ver("v1.0.4", "2026-07-21T11:48:00", "Acțiunea „Arhivează dosarul” pentru Supervizor.", by(1), { columns: ["tip"], actions: ["push", "strike", "anonymize"] }),
        ver("v1.0.5", "2026-08-04T09:15:00", "Lățimi ajustate pentru coloanele de dată.", by(3), { columns: ["tip"], actions: ["push", "strike", "anonymize"] }),
        ver("v1.1.0", "2026-08-19T15:30:00", "Acțiunea „Radiază dosarul” (Administrator central).", by(0), { columns: ["tip"], actions: ["push", "anonymize"] }),
        ver("v1.1.1", "2026-08-28T10:02:00", "Coloana ascunsă „Tip solicitare”, filtrabilă.", by(2), { actions: ["push", "anonymize"] }),
        ver("v1.1.2", "2026-09-09T13:40:00", "Acțiunea „Transfer administrativ” (Push Case).", by(1), { actions: ["anonymize"] }),
        ver("v1.1.3", "2026-09-17T17:20:00", "Antetele RU și EN pentru toate coloanele.", by(3), { actions: ["anonymize"] }),
        ver("v1.1.4", "2026-09-22T09:05:00", "Revenire la v1.1.2: antetele RU conțineau erori de traducere.", by(0), { type: "Restaurare (din v1.1.2)", actions: ["anonymize"] }),
        ver("v1.2.0", "2026-10-02T10:15:00", "Acțiunea „Anonimizează datele personale” (Legea nr. 175/2025).", by(0))
      ],
      grants: [
        grant("central-admin", null, "2026-06-02T09:45:00", by(0)), grant("supervisor", null, "2026-06-02T09:46:00", by(0)),
        grant("director", null, "2026-06-11T08:30:00", by(1)), grant("specialist", null, "2026-06-11T08:31:00", by(1)),
        grant("expert", null, "2026-07-02T12:00:00", by(2), { revokedAt: "2026-08-14T10:20:00", revokedBy: by(0) })
      ]
    },
    "reg-acte": {
      names: { ru: "Реестр разрешительных актов", en: "Register of permits" }, createdAt: "2026-05-14T10:00:00", createdBy: by(1), editedAt: "2026-09-30T16:40:00", editedBy: by(1),
      versions: [
        ver("v1.0.0", "2026-05-20T12:00:00", "Actele emise: număr, denumire, autoritate, beneficiar, status.", by(1), { type: "Prima publicare", columns: ["emis", "valabil", "dosar", "tip"] }),
        ver("v1.1.0", "2026-06-30T09:30:00", "Coloana „Data emiterii” și căutarea după numărul dosarului.", by(1), { columns: ["valabil", "tip"] }),
        ver("v2.0.0", "2026-08-12T11:10:00", "Coloana „Valabil până la”; exportul cere o căutare sau un filtru.", by(0), { columns: ["tip"] }),
        ver("v2.0.1", "2026-09-30T16:40:00", "Coloana ascunsă „Tip act”, filtrabilă.", by(1))
      ],
      grants: [
        grant("central-admin", null, "2026-05-20T12:05:00", by(1)), grant("local-admin", null, "2026-05-20T12:06:00", by(1)),
        grant("supervisor", null, "2026-05-21T08:10:00", by(1)), grant("director", null, "2026-05-21T08:11:00", by(1)),
        grant("specialist", null, "2026-05-21T08:12:00", by(1))
      ]
    },
    "reg-note": {
      names: { ru: "Реестр платёжных поручений", en: "Payment order register" }, createdAt: "2026-06-18T09:00:00", createdBy: by(2), editedAt: "2026-10-01T09:05:00", editedBy: by(2),
      versions: [
        ver("v1.0.0", "2026-07-01T10:00:00", "Notele de plată cu statutul notei și al tranzacției MPay.", by(2), { type: "Prima publicare", columns: ["metoda", "confirmatDe", "mpay"] }),
        ver("v1.0.1", "2026-07-29T14:25:00", "Coloana „Metodă de plată”.", by(2), { columns: ["confirmatDe", "mpay"] }),
        ver("v1.0.2", "2026-09-03T11:00:00", "Coloana „Confirmat de”.", by(3), { columns: ["mpay"] }),
        ver("v1.0.3", "2026-10-01T09:05:00", "Căutarea după numărul tranzacției MPay.", by(2))
      ],
      grants: [
        grant("central-admin", null, "2026-07-01T10:05:00", by(2)), grant("local-admin", "ANSP", "2026-07-01T10:06:00", by(2)),
        grant("supervisor", null, "2026-07-02T09:00:00", by(2)), grant("director", null, "2026-07-02T09:01:00", by(2)),
        grant("specialist", null, "2026-07-02T09:02:00", by(2))
      ]
    },
    "reg-avize": {
      names: { ru: "Реестр заключений", en: "Expertise register" }, createdAt: "2026-09-25T15:00:00", createdBy: by(3), editedAt: "2026-10-02T14:20:00", editedBy: by(3),
      versions: [ver("v1.0.0", "2026-10-02T14:20:00", "Avizele cerute în examinarea dosarelor.", by(3), { type: "Prima publicare" })],
      grants: [
        grant("central-admin", null, "2026-10-02T14:22:00", by(3)), grant("supervisor", null, "2026-10-02T14:23:00", by(3)),
        grant("director", null, "2026-10-02T14:24:00", by(3)), grant("specialist", null, "2026-10-02T14:25:00", by(3))
      ]
    }
  },
  /* registers that exist only in the AdminPortal (config = the same shape the BO definition carries) */
  extra: [
    {
      id: "reg-dosareplata", code: "Case.Authority.DosareInAsteptareaPlatii", object: "Case", scope: "Authority", authority: "ANSP", service: null, parent: "reg-dosare",
      names: { ro: "Dosare în așteptarea plății", ru: "Дела в ожидании оплаты", en: "" }, description: "Dosarele ANSP care așteaptă achitarea taxelor, pentru verificarea zilnică a plăților.",
      position: 1, status: "Schiță", version: "v1.0.0", publishedVersion: null, createdAt: "2026-10-20T10:12:00", createdBy: by(0), editedAt: "2026-10-21T15:40:00", editedBy: by(0),
      config: { copyColumnsOf: "reg-dosare", copyActionsOf: "reg-dosare", predefinedFilter: { logic: "and", rules: [{ column: "statut", op: "is", value: "Așteaptă plata" }] } },
      versions: [], grants: []
    },
    {
      id: "reg-acteanta", code: "Permit.Authority.ActePermisiveANTA", object: "Permit", scope: "Authority", authority: "ANTA", service: null, parent: "reg-acte",
      names: { ro: "Acte permisive ANTA", ru: "Разрешительные акты ANTA", en: "ANTA permits" }, description: "Licențele și autorizațiile de transport emise de ANTA. Înlocuit de Registrul actelor permisive.",
      position: 2, status: "Depreciat", version: "v1.0.0", publishedVersion: "v1.0.0", createdAt: "2026-06-05T09:00:00", createdBy: by(1), editedAt: "2026-09-12T11:30:00", editedBy: by(0),
      config: { copyColumnsOf: "reg-acte", dropColumns: ["dosar", "tip"], predefinedFilter: null },
      versions: [ver("v1.0.0", "2026-06-12T10:00:00", "Actele emise de ANTA.", by(1), { type: "Prima publicare" })],
      grants: [grant("specialist", "ANTA", "2026-06-12T10:05:00", by(1))]
    },
    {
      id: "reg-avizeigsu", code: "Expertise.Authority.AvizeIGSU", object: "Expertise", scope: "Authority", authority: "IGSU", service: null, parent: null,
      names: { ro: "Avize IGSU", ru: "Заключения ГИЧС", en: "" }, description: "Avizele Serviciului Pompieri și Salvatori pentru dosarele în examinare.",
      position: 3, status: "Schiță", unpublished: true, version: "v1.0.0", publishedVersion: "v1.0.0", createdAt: "2026-09-02T13:00:00", createdBy: by(3), editedAt: "2026-10-22T16:05:00", editedBy: by(3),
      config: { copyColumnsOf: "reg-avize", predefinedFilter: { logic: "and", rules: [{ column: "autoritate", op: "contains", value: "IGSU" }] } },
      published: { dropColumns: ["valabil", "emis"] },
      versions: [ver("v1.0.0", "2026-09-04T10:00:00", "Avizele IGSU: număr, tip, dosar, solicitant, statut.", by(3), { type: "Prima publicare" })],
      grants: [grant("expert", "IGSU", "2026-09-04T10:10:00", by(3))]
    },
    {
      id: "reg-dosaresanitar", code: "Case.Service.DosareAutorizatieSanitara", object: "Case", scope: "Service", authority: "ANSP", service: "003000118", parent: null,
      names: { ro: "Dosare autorizație sanitară", ru: "", en: "" }, description: "Dosarele serviciului „Autorizație sanitară de funcționare”, cu câmpurile proprii ale cererii.",
      position: 1, status: "Schiță", version: "v1.0.0", publishedVersion: null, createdAt: "2026-10-22T09:30:00", createdBy: by(0), editedAt: "2026-10-23T11:10:00", editedBy: by(0),
      config: { columns: ["nr", "solicitant", "statut", "svc:activitate", "svc:suprafata", "depus"], predefinedFilter: null },
      versions: [], grants: []
    },
    {
      id: "reg-platisanitar", code: "PaymentOrder.Service.PlatiAutorizatieSanitara", object: "Invoice", scope: "Service", authority: "ANSP", service: "003000118", parent: "reg-note",
      names: { ro: "Plăți autorizație sanitară", ru: "Платежи за санитарное разрешение", en: "Sanitary permit payments" }, description: "Notele de plată ale serviciului „Autorizație sanitară de funcționare”.",
      position: 2, status: "Publicat", version: "v1.0.0", publishedVersion: "v1.0.0", createdAt: "2026-10-09T10:00:00", createdBy: by(2), editedAt: "2026-10-15T12:00:00", editedBy: by(2),
      config: { copyColumnsOf: "reg-note", dropColumns: ["serviciu", "mpay"], predefinedFilter: null },
      versions: [ver("v1.0.0", "2026-10-15T12:00:00", "Notele de plată ale serviciului, fără coloana „Serviciu”.", by(2), { type: "Prima publicare" })],
      grants: []
    },
    {
      id: "reg-noterestante", code: "PaymentOrder.Global.NoteDePlataRestante", object: "Invoice", scope: "Global", authority: null, service: null, parent: null,
      names: { ro: "Note de plată restante", ru: "", en: "" }, description: "Notele de plată neachitate după termen, pentru notificarea solicitanților.",
      position: 5, status: "Schiță", version: "v1.0.0", publishedVersion: null, createdAt: "2026-10-23T08:45:00", createdBy: by(1), editedAt: "2026-10-23T08:45:00", editedBy: by(1),
      config: { columns: [], predefinedFilter: null }, versions: [], grants: []
    },
    {
      id: "reg-avizeexpirate", code: "Expertise.Global.AvizeExpirate", object: "Expertise", scope: "Global", authority: null, service: null, parent: null,
      names: { ro: "Avize expirate", ru: "", en: "" }, description: "Proiect abandonat: avizele expirate se văd în Registru Avize, cu filtrul de statut.",
      position: 6, status: "Depreciat", version: "v1.0.0", publishedVersion: null, createdAt: "2026-08-01T10:00:00", createdBy: by(2), editedAt: "2026-08-20T09:30:00", editedBy: by(2),
      config: { columns: [], predefinedFilter: null }, versions: [], grants: []
    },
    /* registers-30-v1 (2026-10-31, Figma comment GEAP 2.0 12701:424523 „we can have 30 accessible registers”): 25 published
       registers on the same four source objects, so the BO menu (pins / recents), the catalog „Toate registrele” (search,
       object chips, groups) and the header switcher are tested at scale. Deterministic, appended at the end. */
    ...SCALE.map(([id, object, scope, authority, ro, description, rules, logic, roles], i) => {
      const base = { Case: "reg-dosare", Permit: "reg-acte", Invoice: "reg-note", Expertise: "reg-avize" }[object];
      const code = `${{ Case: "Case", Permit: "Permit", Invoice: "PaymentOrder", Expertise: "Expertise" }[object]}.${scope}.${ro.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9 ]/g, "").split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("")}`;
      const at = `2026-${pad(7 + (i % 3), 2)}-${pad(3 + ((i * 5) % 24), 2)}T${pad(9 + (i % 7), 2)}:${pad((i * 13) % 60, 2)}:00`;
      return {
        id, code, object, scope, authority, service: null, parent: base,
        names: { ro, ru: "", en: "" }, description,
        position: 10 + i, status: "Publicat", version: "v1.0.0", publishedVersion: "v1.0.0", createdAt: at, createdBy: by(i), editedAt: at, editedBy: by(i),
        config: { copyColumnsOf: base, predefinedFilter: rules ? { logic: logic || "and", rules: rules.map(([column, op, value]) => ({ column, op, value })) } : null },
        versions: [ver("v1.0.0", at, description, by(i), { type: "Prima publicare" })],
        grants: [grant("central-admin", null, at, by(i)), ...(roles || []).map((role) => grant(role, authority, at, by(i)))]
      };
    })
  ]
};

/* act-card-tabs-v1 (2026-10-30, Feature 96367 · US-318…322) — appended AFTER every random draw (no rnd() below), so the
   records above stay byte-identical. Adds: the printed document (US-318 AC-12) on every 4th act; the act's dossiers
   (US-320: the issuing one + post-processes, at most one active); the chain of acts generated one from another (US-322:
   `origin` = the process that generated the act, `prev` = the act it was generated from); recurring notes (US-321). */
const PROCESS_OF_VERSION = { Reperfectare: "Reperfectare", Suspendare: "Suspendare valabilitate", Retragere: "Retragere act permisiv" };
const shift = (isoValue, days, h = 10, m = 15) => isoT(daysFrom(new Date(isoValue), days, h, m));
const dossierNr = (year, n) => `D-${year}-${pad(5000 + n, 6)}`;
const chainAct = (id, nr, extra) => ({
  id, nr, name: "Autorizație sanitară de funcționare", type: "Autorizație", authority: "ANSP", subdivision: "CSP Chișinău",
  beneficiary: { kind: "PJ", name: "SRL Lactis", idno: "1007600412377", representative: "Natalia Cojocaru", address: "mun. Chișinău, str. Alba Iulia 20", phone: "+373 69 214 530", email: "office@lactis.md" },
  place: "mun. Chișinău, str. Alba Iulia 20", tacit: false, statusChange: null,
  fields: [["Tipul activității", "Comerț cu produse alimentare"], ["Suprafața încăperilor", "186 m²"], ["Capacitatea", "24 locuri"]],
  ...extra
});
/* SRL Lactis: emitere 2019 → reperfectare 2021 → prelungire 2024 → duplicat 2025 → reperfectare 2026 (US-322 AC-03) */
const CHAIN = [
  chainAct("act-073", "AUT-2019-000412", { origin: "Emitere primară", dossier: dossierNr(2019, 412), status: "Anulat", issued: "2019-04-11T11:20:00", validUntil: "2024-04-10", statusChange: { at: "2021-09-02T14:05:00", reason: "Înlocuit prin reperfectare de actul AUT-2021-001377" } }),
  chainAct("act-074", "AUT-2021-001377", { origin: "Reperfectare", prev: "act-073", dossier: dossierNr(2021, 1377), status: "Expirat", issued: "2021-09-02T14:05:00", validUntil: "2024-04-10" }),
  chainAct("act-075", "AUT-2024-000988", { origin: "Prelungire", prev: "act-074", dossier: dossierNr(2024, 988), status: "Anulat", issued: "2024-03-28T09:40:00", validUntil: "2029-03-27", printed: { series: "AS", number: "0412988" }, statusChange: { at: "2025-06-17T15:30:00", reason: "Înlocuit prin duplicat de actul AUT-2025-003310" } }),
  chainAct("act-076", "AUT-2025-003310", { origin: "Emitere duplicat", prev: "act-075", dossier: dossierNr(2025, 3310), status: "Anulat", issued: "2025-06-17T15:30:00", validUntil: "2029-03-27", statusChange: { at: "2026-05-12T10:10:00", reason: "Înlocuit prin reperfectare de actul AUT-2026-001144" } }),
  chainAct("act-077", "AUT-2026-001144", { origin: "Reperfectare", prev: "act-076", dossier: dossierNr(2026, 1144), status: "Valabil", issued: "2026-05-12T10:10:00", validUntil: "2029-03-27" }),
  /* no subdivision + unlimited validity + PF holder + tacit approval (US-318 AC-08 / AC-09 / AC-11 / AC-14) */
  {
    id: "act-078", nr: "LIC-2026-000207", name: "Licență pentru producerea alcoolului etilic", type: "Licență", authority: "ASP", subdivision: "",
    beneficiary: { kind: "PF", name: "Sergiu Moraru", idnp: "2003501207714", address: "or. Soroca, str. Ștefan cel Mare 12", phone: "+373 68 402 117", email: "sergiu.moraru@mail.md" },
    place: "or. Soroca, str. Ștefan cel Mare 12", origin: "Emitere primară", dossier: dossierNr(2026, 207), status: "Valabil", tacit: true,
    issued: "2026-03-03T16:00:00", validUntil: "", statusChange: null, fields: [["Capacitatea de producție", "40 000 dal / an"], ["Depozit autorizat", "da"]]
  }
];
CHAIN.forEach((act) => {
  const versions = [{ v: 1, event: "Emitere", at: act.issued, reason: act.origin === "Emitere primară" ? "Act emis la finalizarea examinării dosarului." : `Act generat prin ${act.origin.toLocaleLowerCase("ro")} din actul anterior.` }];
  if (act.status === "Anulat") versions.push({ v: 2, event: "Anulare", at: act.statusChange.at, reason: act.statusChange.reason });
  if (act.status === "Expirat") versions.push({ v: 2, event: "Expirare", at: `${act.validUntil}T00:05:00`.replace(/^(\d{4}-\d{2}-)(\d{2})/, (s, ym, d) => `${ym}${pad(Number(d) + 1)}`), reason: "Termenul de valabilitate a expirat.", system: true });
  acts.push({ ...act, versions });
});
acts.forEach((act, i) => {
  if (i % 4 === 0 && !act.printed && i < 72) act.printed = { series: "AS", number: pad(300000 + i * 4111, 7) };
  act.origin ||= "Emitere primară";
  /* the issuing dossier (finalised, Eliberat) + one dossier per post-process of the act's versions */
  const sp = (k) => SPECIALISTS[(i + k) % SPECIALISTS.length];
  const list = [{ nr: act.dossier, process: act.origin, status: "eliberat", submitted: shift(act.issued, -18 - (i % 9), 9, 30 + (i % 20)), specialist: sp(0) }];
  act.versions.slice(1).forEach((v, k) => {
    const process = PROCESS_OF_VERSION[v.event];
    if (process) list.push({ nr: dossierNr(new Date(v.at).getFullYear(), 600 + i * 7 + k), process, status: "eliberat", submitted: shift(v.at, -6 - (i % 5), 11, 10 + k), specialist: sp(k + 1) });
  });
  /* demo act-045 (Suspendat): a rejected appeal + the active resumption request; every 7th running act: a renewal in examination */
  if (act.id === "act-045") {
    list.push({ nr: dossierNr(2025, 1450), process: "Contestație", status: "respins", submitted: "2025-09-22T13:40:00", specialist: "Elena Caragia" });
    list.push({ nr: dossierNr(2026, 1451), process: "Reluare valabilitate", status: "inExaminare", submitted: "2026-10-14T10:25:00", specialist: "Stela Bradu" });
  } else if (act.status === "Valabil" && i % 7 === 3) {
    list.push({ nr: dossierNr(2026, 2000 + i), process: "Prelungire", status: "inExaminare", submitted: shift("2026-10-20T10:00:00", -(i % 12), 10, 5), specialist: sp(2) });
  }
  act.dossiers = list;
});
/* US-321: the payment notes of act-045 (the issuing dossier's fee + two annual fees) and of the chain's current act */
const act045 = acts.find((a) => a.id === "act-045");
const extraNote = (id, nr, ref, act, fee, status, issued, paidAt, extra = {}) => ({
  id, nr, ref, service: act.name, authority: act.authority, subdivision: act.subdivision,
  payer: act.beneficiary.kind === "PJ" ? { kind: "PJ", name: act.beneficiary.name, id: act.beneficiary.idno } : { kind: "PF", name: act.beneficiary.name, id: act.beneficiary.idnp },
  lines: [{ label: fee[0], amount: fee[1] }], total: fee[1], paid: paidAt ? fee[1] : 0, currency: "MDL",
  method: paidAt ? "Card bancar" : "", confirmedBy: "Mihai Grosu", issued, due: shift(issued, 30, 23, 59), paidAt: paidAt || "", status,
  mpay: paidAt ? { id: `MPAY-${issued.slice(0, 4)}-${pad(7790000 + Number(id.slice(3)), 7)}`, status: "Finalizată cu succes", at: paidAt } : null, refund: null, ...extra
});
notes.push(
  extraNote("np-055", "NP-2025-000981", { kind: "dosar", nr: act045.dossier }, act045, FEES[0], "Achitată", "2025-02-10T09:12:00", "2025-02-11T18:40:00"),
  extraNote("np-056", "NP-2026-001310", { kind: "act", nr: act045.nr }, act045, FEES[3], "Achitată", "2026-02-24T08:00:00", "2026-03-02T12:15:00"),
  extraNote("np-057", "NP-2026-004902", { kind: "act", nr: act045.nr }, act045, FEES[3], "Neachitată", "2026-09-24T08:00:00", "", { due: "2026-10-24T23:59:00" })
);

const out = {
  _comment: "Registers module, phase 1 (registre-v1) + the AdminPortal builder data (registre-v2). Generated by tools/registre/seed.mjs — do not edit by hand.",
  today: iso(TODAY),
  registers,
  admin,
  authorities: Object.values(AUTHORITIES).map(({ code, name, subdivisions }) => ({ code, name, subdivisions })),
  acts,
  notes,
  avize
};
fs.writeFileSync(path.join(ROOT, "data/registre.json"), `${JSON.stringify(out, null, 1)}\n`);
console.log(`acts ${acts.length} · notes ${notes.length} · avize ${avize.length}`);
