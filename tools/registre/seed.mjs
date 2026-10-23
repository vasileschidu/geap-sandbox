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
    actions: []
  },
  {
    id: "reg-note", code: "Invoice.Global.RegistruNotePlata", name: "Registru note de plată", object: "Invoice", objectLabel: "Note de plată", scope: "Global",
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

const out = {
  _comment: "Registers module, phase 1 (registre-v1). Generated by tools/registre/seed.mjs — do not edit by hand.",
  today: iso(TODAY),
  registers,
  authorities: Object.values(AUTHORITIES).map(({ code, name, subdivisions }) => ({ code, name, subdivisions })),
  acts,
  notes,
  avize
};
fs.writeFileSync(path.join(ROOT, "data/registre.json"), `${JSON.stringify(out, null, 1)}\n`);
console.log(`acts ${acts.length} · notes ${notes.length} · avize ${avize.length}`);
