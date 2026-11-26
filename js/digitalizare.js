/* ==========================================================================================================
   GEAPDigitalizare — „Digitalizarea actelor permisive emise pe suport de hârtie” (dig-v1, 2026-11-26; Feature 97576:
   US-414 97577 activarea pe serviciu, US-415 97578 FrontOffice, US-416 97579 ghișeu, US-417 97580 examinarea).
   ONE rule set for every side (as GEAPContestatie / GEAPRetragere):
     allowed(code, cfg)      «Digitalizare permisă» of a service (Admin › Serviciu › Setări › «Digitalizarea actelor»;
                             the BO passes the saved setting, the other pages read the seed) — US-414 AC-03…05
     serviceOf(code | name)  the service record: issuing subdivisions + the act types issued through the service
     fields(service, values) the request's act fields for GEAPFormRender.fieldHtml (FO + Ghișeu, US-415 / US-416)
     validate(values, docs)  „Câmpul este obligatoriu.” · „Data nu poate fi anterioară datei emiterii.” (US-415 AC-10/11/13)
   BackOffice (US-417): five generated dossiers of CSP Chișinău become digitization dossiers (decorate, never new rows),
   the read-only „Actul declarat” card (AC-04), the result card, the RAP duplicate check (Constraints), onDecision =
   the confirmation enters the act in the Registrul actelor permisive (registre.js attach, AC-12…17) / the rejection
   creates nothing (AC-20). Cabinet + FO: demoRequests / holderAct (a paper act only after the confirmation, AC-11) (?dig-cerere=depusa|respinsa|confirmata).
   Demo overrides (every page, ?state= links): dig-permisa=0 (no service allows it) · dig-permisa=<code,…> (only those).
   ========================================================================================================== */
(function () {
  "use strict";
  if (window.GEAPDigitalizare) return;

  const params = new URLSearchParams(window.location.search);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const tag = (label, tone, opts) => window.GEAPTag?.html(label, tone, opts) || esc(label);

  const REQUIRED = "Câmpul este obligatoriu.";
  const DATE_ERROR = "Data nu poate fi anterioară datei emiterii.";
  const SOURCE = "Digitalizat la cererea titularului";
  const PROCESS = "Digitalizarea actului emis pe hârtie";
  const TYPE = "Digitalizare";
  const ACTION = "Digitalizează un act istoric";

  /* the services — one record across the FO / Cabinet codes, the desk codes and the BO service names */
  const SERVICES = [
    { codes: ["09", "003000118"], match: /^Autoriza[țt]i[ae] sanitar[ăa] (de|pentru) func/i, title: "Autorizația sanitară de funcționare",
      authority: "ANSP", authorityName: "Agenția Națională pentru Sănătate Publică", allowed: true,
      subdivisions: ["CSP Chișinău", "CSP Bălți", "CSP Orhei"],
      types: ["Autorizație sanitară de funcționare", "Autorizație sanitară de funcționare provizorie"],
      specific: [["activitate", "Tipul activității"], ["suprafata", "Suprafața încăperilor"], ["capacitate", "Capacitatea"]] },
    { codes: ["003000519"], match: /biocid/i, title: "Înregistrarea produselor biocide",
      authority: "ANSP", authorityName: "Agenția Națională pentru Sănătate Publică", allowed: true,
      subdivisions: ["Direcția autorizare produse biocide"],
      types: ["Certificat de înregistrare a produsului biocid"],
      specific: [["produs", "Denumirea produsului biocid"], ["substanta", "Substanța activă"]] },
    { codes: ["10"], match: /stupefiante/i, title: "Autorizația pentru substanțe stupefiante și psihotrope",
      authority: "AMDM", authorityName: "Agenția Medicamentului și Dispozitivelor Medicale", allowed: true,
      subdivisions: ["Comitetul permanent de control asupra drogurilor"],
      types: ["Autorizație de activitate cu substanțe stupefiante, psihotrope și precursori"],
      specific: [["obiectiv", "Obiectivul autorizat"]] },
    { codes: ["618"], match: /transportul rutier/i, title: "Licența pentru transportul rutier de mărfuri",
      authority: "ANTA", authorityName: "Agenția Națională Transport Auto", allowed: false,
      subdivisions: ["Direcția licențiere"], types: ["Licență pentru transportul rutier de mărfuri"], specific: [] }
  ];
  const serviceOf = (key) => {
    const k = String(key || "");
    return SERVICES.find((s) => s.codes.includes(k)) || SERVICES.find((s) => s.match.test(k)) || null;
  };
  /* US-414 AC-03…05: implicit «Nu»; the seed services that have it on; the BO passes its saved setting */
  function allowed(code, cfgValue) {
    const p = params.get("dig-permisa");
    if (p === "0") return false;
    const s = serviceOf(code);
    if (p && p !== "1") return p.split(",").some((c) => c === String(code) || Boolean(s?.codes.includes(c)));
    if (typeof cfgValue === "boolean") return cfgValue;
    return Boolean(s?.allowed);
  }
  const seedAllowed = (code) => Boolean(serviceOf(code)?.allowed);
  const allowedServices = () => SERVICES.filter((s) => allowed(s.codes[0]));

  /* ---------------------------------------------------------------- the request form (FO + Ghișeu) */
  const isoOf = (v) => {
    const t = String(v || "").trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
    const m = t.match(/^(\d{2})[./](\d{2})[./](\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
  };
  const MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
  const longDate = (v) => { const iso = isoOf(v); if (!iso) return ""; const [y, m, d] = iso.split("-").map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };
  /* the act fields of the request (US-415 / US-416 data model), for GEAPFormRender.fieldHtml; prefix = the field ids'
     prefix (FO „dig-…”, Ghișeu „gh-dig-…”) — one subdivision = prefilled and read-only (AC-07 / AC-05) */
  function fields(service, values = {}, { prefix = "dig" } = {}) {
    if (!service) return [];
    const one = service.subdivisions.length === 1;
    return [
      one
        ? { id: `${prefix}-subdiviziune`, type: "text", label: "Subdiviziunea emitentă", value: service.subdivisions[0], readOnly: true, span: 6, hint: "Serviciul are o singură subdiviziune de emitere." }
        : { id: `${prefix}-subdiviziune`, type: "select", label: "Subdiviziunea emitentă", value: values.subdiviziune || "", options: service.subdivisions, placeholder: "Alege subdiviziunea", span: 6, hint: "Subdiviziunea care a emis actul. Autoritatea o verifică la examinare." },
      { id: `${prefix}-tip`, type: "select", label: "Tipul actului", required: true, value: values.tip || "", options: service.types, placeholder: "Alege tipul actului", span: 6 },
      { id: `${prefix}-serie`, type: "text", label: "Seria actului", value: values.serie || "", maxLength: 10, span: 6, hint: "Doar dacă actul are serie." },
      { id: `${prefix}-numar`, type: "text", label: "Numărul actului", required: true, value: values.numar || "", maxLength: 30, span: 6 },
      { id: `${prefix}-emitere`, type: "date", label: "Data emiterii", required: true, value: values.dataEmiterii || "", span: 6 },
      { id: `${prefix}-valabil`, type: "date", label: "Valabil până la", value: values.valabilPana || "", span: 6, hint: "Lasă gol dacă actul nu are termen de valabilitate." }
    ];
  }
  /* the field key → its id suffix (the callers read the values back from the DOM) */
  const KEYS = { subdiviziune: "subdiviziune", tip: "tip", serie: "serie", numar: "numar", dataEmiterii: "emitere", valabilPana: "valabil" };
  /* US-415 AC-10 / AC-11 / AC-13 (US-416 AC-07): [{ key, msg }] — the copy is required, the annexes optional */
  function validate(values = {}, { scan = true, service = null } = {}) {
    const out = [];
    if (!values.tip) out.push({ key: "tip", msg: REQUIRED });
    if (!String(values.numar || "").trim()) out.push({ key: "numar", msg: REQUIRED });
    if (!values.dataEmiterii) out.push({ key: "dataEmiterii", msg: REQUIRED });
    if (values.valabilPana && values.dataEmiterii && values.valabilPana < values.dataEmiterii) out.push({ key: "valabilPana", msg: DATE_ERROR });
    if (service && service.subdivisions.length > 1 && values.subdiviziuneRequired && !values.subdiviziune) out.push({ key: "subdiviziune", msg: REQUIRED });
    if (!scan) out.push({ key: "scan", msg: REQUIRED });
    return out;
  }
  /* the read-only summary (Verificare / Finalizare / BO card) */
  function summaryRows(service, values = {}) {
    return [
      ["Serviciul", service?.title || "—"],
      ["Autoritatea emitentă", service?.authorityName || "—"],
      ["Subdiviziunea emitentă", values.subdiviziune || (service?.subdivisions.length === 1 ? service.subdivisions[0] : "") || "Nespecificată"],
      ["Tipul actului", values.tip || "—"],
      ["Seria actului", values.serie || "—"],
      ["Numărul actului", values.numar || "—"],
      ["Data emiterii", longDate(values.dataEmiterii) || "—"],
      ["Valabil până la", values.valabilPana ? longDate(values.valabilPana) : "Fără termen de valabilitate"]
    ];
  }
  /* the document fields of the request (US-20): the scanned copy (required) + the annexes (optional) */
  const DOCS = [
    { id: "dig-copie", label: "Copia scanată a actului", description: "Toate paginile actului emis pe hârtie, lizibile. JPG, PNG, PDF · maximum 60 MB.", required: true },
    { id: "dig-anexe", label: "Anexele actului", description: "Anexele actului, dacă există. JPG, PNG, PDF · maximum 60 MB fiecare.", required: false, maxFiles: 5 }
  ];
  /* the new dossier's number (FO / desk) */
  const newNumber = (seed = 0) => `GEAP-2026-009-${String(4880 + (Number(seed) % 90)).padStart(5, "0")}`;

  /* ---------------------------------------------------------------- the Registrul actelor permisive (registre.js) */
  let rapData = null;
  const holderGT = { kind: "PJ", name: "SRL Global Trader", idno: "1012600000002", representative: "Anastasia Cojocaru", address: "mun. Chișinău, str. Ismail 88", phone: "+373 60 999 999", email: "office@globaltrader.md" };
  /* the act entered when the seed dossier D-2026-004653 was confirmed (AC-12…17): same structure as a GEAP act, origin
     „Digitalizare”, source „Digitalizat la cererea titularului”, the scanned copy attached, dates unchanged */
  const SEED_ACT = {
    id: "act-dig-001", nr: "AS-2019-0412", series: "AS", name: "Autorizație sanitară de funcționare", type: "Autorizație", authority: "ANSP", subdivision: "CSP Chișinău",
    service: "Autorizația sanitară de funcționare", beneficiary: holderGT, place: "Cofetăria „Dulce”, mun. Chișinău", dossier: "D-2026-004653",
    status: "Valabil", tacit: false, issued: "2019-11-21T00:00:00", validUntil: "2029-11-21", statusChange: null,
    versions: [{ v: 1, event: "Înscriere prin digitalizare", at: "2026-07-03T11:40:00", reason: "Act emis pe hârtie, înscris la confirmarea cererii de digitalizare (dosarul D-2026-004653)." }],
    fields: [["Tipul activității", "Producerea produselor de patiserie"], ["Suprafața încăperilor", "86 m²"], ["Capacitatea", "24 locuri"]],
    origin: "Digitalizare", source: SOURCE, legal: "Legea nr. 10/2009 privind supravegherea de stat a sănătății publice, art. 21",
    scan: { fisier: "copia-AS-2019-0412.pdf", kb: 1840, at: "2026-06-24T10:12:00" },
    dossiers: [{ nr: "D-2026-004653", process: TYPE, status: "finalizat", submitted: "2026-06-24T10:12:00", specialist: "Elena Caragia" }]
  };
  /* registre.js load(): the digitized acts join its acts (the confirmed ones of this page view too) */
  function attach(data) {
    if (!data || !Array.isArray(data.acts)) return;
    rapData = data;
    if (!data.acts.some((a) => a.id === SEED_ACT.id)) data.acts.push(JSON.parse(JSON.stringify(SEED_ACT)));
    pendingActs.forEach((a) => { if (!data.acts.some((x) => x.id === a.id)) data.acts.push(a); });
  }
  const pendingActs = [];
  const norm = (v) => String(v || "").replace(/\s+/g, "").toUpperCase();
  /* Constraints: one act number per issuing authority in the registry */
  const inRap = (nr, authority) => (rapData?.acts || []).find((a) => norm(a.nr) === norm(nr) && (!authority || a.authority === authority)) || null;
  const isDigitized = (act) => act?.source === SOURCE;

  /* ---------------------------------------------------------------- BackOffice: the digitization dossiers (US-417) */
  const SEED = [
    /* filed online, waiting for the distribution (AC-02 / AC-03) */
    { id: "D-2026-004468", status: "depus", channel: "Online", filedAt: "2026-07-09T10:20:00",
      holder: { kind: "PJ", name: "SRL Patiseria Dulce", idno: "1018600044127", representative: "Ion Ceban" },
      act: { subdiviziune: "CSP Chișinău", tip: "Autorizație sanitară de funcționare", serie: "AS", numar: "ASF-0640/2021", dataEmiterii: "2021-11-02", valabilPana: "2026-11-01" }, annexes: 1 },
    /* under examination at the specialist (me): the copy matches; the subdivision was not declared */
    { id: "D-2026-004560", status: "inExaminare", channel: "Online", filedAt: "2026-07-02T09:40:00", holder: holderGT,
      act: { subdiviziune: "", tip: "Autorizație sanitară de funcționare", serie: "AS", numar: "ASF-0315/2020", dataEmiterii: "2020-05-18", valabilPana: "2026-12-17" }, annexes: 2,
      object: "Cofetăria „Bomboana”, mun. Chișinău" },
    /* filed at the desk: the act is ALREADY in the register (AUT-2024-001200, ANSP) — the examiner rejects it */
    { id: "D-2026-004542", status: "inExaminare", channel: "Ghișeu", filedAt: "2026-06-30T14:05:00",
      holder: { kind: "PJ", name: "SRL Agrotehnica", idno: "1009227656586", representative: "Ion Rusu" },
      act: { subdiviziune: "CSP Chișinău", tip: "Autorizație sanitară de funcționare", serie: "", numar: "AUT-2024-001200", dataEmiterii: "2024-05-06", valabilPana: "2029-05-05" }, annexes: 0 },
    /* confirmed → the act AS-2019-0412 in the register (SEED_ACT) and in the holder's EVO Cabinet */
    { id: "D-2026-004653", status: "finalizat", decision: "confirmare", channel: "Online", filedAt: "2026-06-24T10:12:00", decidedAt: "2026-07-03T11:40:00", holder: holderGT,
      act: { subdiviziune: "CSP Chișinău", tip: "Autorizație sanitară de funcționare", serie: "AS", numar: "AS-2019-0412", dataEmiterii: "2019-11-21", valabilPana: "2029-11-21" }, annexes: 1,
      legal: SEED_ACT.legal, actId: SEED_ACT.id, object: "Cofetăria „Dulce”, mun. Chișinău" },
    /* rejected: the copy is not readable — the reason goes to the holder (MNotify + Solicitările mele) */
    { id: "D-2026-004691", status: "finalizat", decision: "respingere", channel: "Ghișeu", filedAt: "2026-06-19T11:30:00", decidedAt: "2026-06-27T15:05:00", holder: holderGT,
      act: { subdiviziune: "CSP Bălți", tip: "Autorizație sanitară de funcționare", serie: "", numar: "112/2018", dataEmiterii: "2018-04-10", valabilPana: "" }, annexes: 0,
      reason: "Copia scanată nu este lizibilă: numărul și data emiterii nu se pot verifica. Depune o cerere nouă cu o copie clară a tuturor paginilor actului." }
  ];
  const SERVICE_NAME = "Autorizație sanitară de funcționare";
  const addDays = (iso, n) => { const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  let rowsRef = [];
  function decorate(rows) {
    rowsRef = rows || [];
    SEED.forEach((s) => {
      const row = rowsRef.find((r) => r.id === s.id);
      if (!row || row.digitalizare) return;
      const confirmed = s.decision === "confirmare";
      Object.assign(row, {
        tipDosar: TYPE,
        serviciu: SERVICE_NAME,
        numeSolicitant: s.holder.representative || s.holder.name,
        companie: s.holder.kind === "PJ" ? s.holder.name : null,
        subdiviziune: "CSP Chișinău",
        sursa: s.channel === "Online" ? "FO" : "BO",
        dataDepunerii: s.filedAt.slice(0, 10),
        /* the service's examination term for the digitization (Feature 90575) */
        termenExaminare: addDays(s.filedAt, 15),
        termenZile: 10,
        status: s.status,
        decizia: s.status === "finalizat" ? (confirmed ? "aprobare" : "respingere") : "none",
        nrActEmis: confirmed ? s.act.numar : null,
        dataSemnarii: s.decidedAt ? s.decidedAt.slice(0, 10) : null,
        alerte: [],
        nedistribuit: s.status === "depus",
        digitalizare: {
          channel: s.channel, filedAt: s.filedAt, holder: s.holder, declared: { ...s.act }, act: { ...s.act }, annexes: s.annexes, object: s.object || "",
          decision: s.decision || null, decidedAt: s.decidedAt || null, reason: s.reason || "", legal: s.legal || "", actId: s.actId || null, specific: {}
        }
      });
      if (s.status === "depus") { row.specialist = null; row.repartizatDe = null; }
    });
    /* the duplicate check reads the register: load it now (registre.js) */
    window.GEAPRegistre?.load?.();
  }
  const isDig = (row) => Boolean(row?.digitalizare);
  const rowOf = (id) => rowsRef.find((r) => r.id === id) || null;

  /* AC-01: a digitization dossier under examination opens only for the specialist it was assigned to */
  function deniedFor(row, { meId = "", mySub = "", role = "" } = {}) {
    if (!isDig(row) || role !== "specialist" || !row.specialist) return false;
    return row.specialist.id !== meId || (Boolean(mySub) && row.subdiviziune !== mySub);
  }

  /* the documents filed with the request (Acte necesare): the scanned copy + the annexes (US-20) */
  function documents(row) {
    const d = row?.digitalizare;
    if (!d) return null;
    const nr = String(d.declared.numar || "act").replace(/[^\w-]+/g, "-");
    const day = d.filedAt.slice(0, 10);
    const list = [{ tip: DOCS[0].label, fisier: `copia-${nr}.pdf`, kb: 1460 + (nr.length * 37) % 600, obligatoriu: true, sursa: "upload", semnat: false, at: `${day}T${d.filedAt.slice(11, 16)}:00` }];
    for (let i = 1; i <= d.annexes; i += 1) list.push({ tip: DOCS[1].label, fisier: `anexa-${i}-${nr}.pdf`, kb: 380 + i * 112, obligatoriu: false, sursa: "upload", semnat: false, at: `${day}T${d.filedAt.slice(11, 16)}:00` });
    return list;
  }

  /* AC-04: „Actul declarat” (read-only, as filed) + the register check; after the result: „Rezultatul examinării” */
  function cardsHtml(row, renderCard, { copy, link, stamp } = {}) {
    const d = row?.digitalizare;
    if (!d || !renderCard) return "";
    const s = serviceOf(row.serviciu);
    const cp = copy || ((v) => esc(v));
    const at = stamp || ((v) => esc(v));
    const v = d.declared;
    const dup = row.status !== "finalizat" ? inRap(v.numar, s?.authority) : null;
    const h = d.holder || {};
    const cards = renderCard("Actul declarat", [
      ["Tip solicitare", esc(PROCESS)],
      ["Autoritatea emitentă", esc(s?.authorityName || "—")],
      ["Subdiviziunea emitentă", v.subdiviziune ? esc(v.subdiviziune) : `<span class="e-permits-dosar-profil__termen-meta">Nedeclarată · se verifică la examinare</span>`],
      ["Tipul actului", esc(v.tip)],
      ["Seria actului", esc(v.serie || "—")],
      ["Numărul actului", cp(v.numar)],
      ["Data emiterii", esc(longDate(v.dataEmiterii))],
      ["Valabil până la", esc(v.valabilPana ? longDate(v.valabilPana) : "Fără termen de valabilitate")],
      ["Titularul", esc([h.name, h.idno ? `IDNO ${h.idno}` : h.idnp ? `IDNP ${h.idnp}` : ""].filter(Boolean).join(" · "))],
      ...(h.representative && h.kind === "PJ" ? [["Reprezentantul", esc(`${h.representative} · împuternicire verificată în MPower`)]] : []),
      ["Copia scanată și anexele", esc(`${1 + d.annexes} ${1 + d.annexes === 1 ? "document" : "documente"} · fila Acte necesare`)],
      ["Canalul depunerii", esc(d.channel)],
      ["Data depunerii", at(d.filedAt)],
      ...(row.status !== "finalizat" ? [["Registrul actelor permisive", dup
        ? `<span>${tag("Deja înscris", "danger")} <span class="e-permits-dosar-profil__termen-meta">${esc(`act ${dup.nr} · ${dup.beneficiary?.name || ""}`)}</span></span>`
        : `<span>${tag("Neînscris", "neutral")} <span class="e-permits-dosar-profil__termen-meta">numărul nu există pentru ${esc(s?.authority || "autoritate")}</span></span>`]] : [])
    ]);
    if (row.status !== "finalizat" || !d.decision) return cards;
    const ok = d.decision === "confirmare";
    const a = d.act;
    return cards + renderCard("Rezultatul examinării", [
      ["Rezultatul", tag(ok ? "Digitalizare confirmată" : "Digitalizare respinsă", ok ? "success" : "danger")],
      ["Data deciziei", at(d.decidedAt)],
      ...(ok ? [
        ["Actul înscris", link ? link(d.actId, a.numar) : cp(a.numar)],
        ["Subdiviziunea emitentă", esc(a.subdiviziune || "—")],
        ["Tipul actului", esc(a.tip)],
        ["Temeiul legal", `<span>${esc(d.legal || "—")}</span>`],
        ["Sursa înregistrării", esc(SOURCE)],
        ["Decizie semnată", esc("Nu se emite: rezultatul este confirmarea digitalizării")]
      ] : [
        ["Motivul respingerii", `<span>${esc(d.reason)}</span>`],
        ["Înscriere în registru", esc("Nu: cererea respinsă nu creează nicio înregistrare")]
      ])
    ]);
  }

  /* AC-12…AC-20: the result. Confirmation → the act (with the corrected data) enters the register as the INITIAL version
     (AC-14), source „Digitalizat la cererea titularului”, the scanned copy attached, dates unchanged; rejection → nothing */
  let seq = 1;
  function onDecision(row, decision, values = {}, { at = "", by = "" } = {}) {
    const d = row?.digitalizare;
    if (!d) return null;
    d.decision = decision;
    d.decidedAt = at;
    if (decision !== "confirmare") { d.reason = values.motiv || ""; return { act: null }; }
    d.act = { subdiviziune: values.subdiviziune || d.act.subdiviziune, tip: values.tip || d.act.tip, serie: values.serie ?? d.act.serie, numar: values.numar || d.act.numar, dataEmiterii: values.dataEmiterii || d.act.dataEmiterii, valabilPana: values.valabilPana ?? d.act.valabilPana };
    d.legal = values.temei || "";
    d.specific = Object.fromEntries(Object.entries(values).filter(([k]) => k.startsWith("sp-")).map(([k, v]) => [k.slice(3), v]));
    const s = serviceOf(row.serviciu);
    const h = d.holder || {};
    const docs = documents(row) || [];
    const act = {
      id: `act-dig-${String(100 + seq++)}`, nr: d.act.numar, series: d.act.serie || "", name: d.act.tip, type: "Autorizație", authority: s?.authority || "ANSP", subdivision: d.act.subdiviziune,
      service: s?.title || row.serviciu, beneficiary: { kind: h.kind || "PJ", name: h.name || row.companie || row.numeSolicitant, idno: h.idno, idnp: h.idnp, representative: h.representative },
      place: d.object || "", dossier: row.id, status: d.act.valabilPana && d.act.valabilPana < (at || "").slice(0, 10) ? "Expirat" : "Valabil", tacit: false,
      issued: `${d.act.dataEmiterii}T00:00:00`, validUntil: d.act.valabilPana || "", statusChange: null,
      versions: [{ v: 1, event: "Înscriere prin digitalizare", at, reason: `Act emis pe hârtie, înscris la confirmarea cererii de digitalizare (dosarul ${row.id}).` }],
      fields: (s?.specific || []).map(([k, label]) => [label, d.specific[k] || "—"]).filter(([, v]) => v !== "—"),
      origin: "Digitalizare", source: SOURCE, legal: d.legal, scan: { fisier: docs[0]?.fisier || "copia-actului.pdf", kb: docs[0]?.kb || 1500, at: d.filedAt },
      dossiers: [{ nr: row.id, process: TYPE, status: "finalizat", submitted: d.filedAt, specialist: by || row.specialist?.nume || "" }]
    };
    d.actId = act.id;
    pendingActs.push(act);
    if (rapData?.acts && !rapData.acts.some((x) => x.id === act.id)) rapData.acts.push(act);
    return { act };
  }

  /* ---------------------------------------------------------------- Cabinet + FO demo (?dig-cerere=…) */
  /* the holder's digitization requests in „Solicitările mele” (US-415 AC-17, US-417 AC-22) and the act it produced in
     „Acte permisive” (AC-18) — added by URL switch, never as seed rows (the Cabinet pages keep their pagination) */
  const cabinetMode = () => params.get("dig-cerere") || "";
  function demoRequests(today = "2026-10-15") {
    const mode = cabinetMode();
    const out = [];
    if (mode === "depusa" || mode === "toate") out.push({ id: "d-dig-depusa", nr: "GEAP-2026-009-04902", service: "09", tip: TYPE, pp: "digitalizare", object: "Cofetăria „Bomboana”, mun. Chișinău",
      subdivision: "CSP Chișinău", status: "derulare", submitted: "2026-07-02T09:40", examTerm: addDays(today, 6), digitalizare: { numar: "ASF-0315/2020", tip: "Autorizație sanitară de funcționare" } });
    if (mode === "respinsa" || mode === "toate") out.push({ id: "d-dig-respinsa", nr: "GEAP-2026-009-04873", service: "09", tip: TYPE, pp: "digitalizare", object: "",
      subdivision: "CSP Bălți", status: "finalizat", result: "respins", submitted: "2026-06-19T11:30", examTerm: "2026-07-04", finalized: "2026-06-27",
      decision: { nr: "", signedBy: "Elena Caragia", reason: SEED[4].reason }, digitalizare: { numar: "112/2018", tip: "Autorizație sanitară de funcționare", rejected: true } });
    if (mode === "confirmata" || mode === "toate") out.push({ id: "d-dig-confirmata", nr: "GEAP-2026-009-04861", service: "09", tip: TYPE, pp: "digitalizare", object: "Cofetăria „Dulce”, mun. Chișinău",
      subdivision: "CSP Chișinău", status: "finalizat", result: "aprobat", submitted: "2026-06-24T10:12", examTerm: "2026-07-09", finalized: "2026-07-03", actId: CONFIRMED_PAPER,
      digitalizare: { numar: "AS-2019-0412", tip: "Autorizație sanitară de funcționare" } });
    return out;
  }
  /* US-417 AC-11 (PO 2026-11-26): a paper act is NOT the holder's act in EVO Cabinet / FO until the BO confirms its
     digitization — the paper act of the seed (act-cofetaria) is hidden, and appears as a digitized act (source, post-
     processes) only after the confirmation (demo ?dig-cerere=confirmata|toate); FO / Cabinet acts shape */
  const CONFIRMED_PAPER = "act-cofetaria";
  function holderAct(act) {
    if (!act?.paper) return act;
    if (act.id !== CONFIRMED_PAPER || !["confirmata", "toate"].includes(cabinetMode())) return null;
    return { ...act, paper: false, digitized: true, source: SOURCE };
  }

  /* the shell may have built its dossiers before this deferred module ran: decorate them now (idempotent) */
  const early = window.GEAPShellApi?.dossierStore?.();
  if (early?.runtimeRows) decorate(early.runtimeRows);

  window.GEAPDigitalizare = {
    REQUIRED, DATE_ERROR, SOURCE, PROCESS, TYPE, ACTION, SERVICES, DOCS, KEYS,
    serviceOf, allowed, seedAllowed, allowedServices, fields, validate, summaryRows, longDate, isoOf, newNumber,
    attach, inRap, isDigitized, decorate, isDig, rowOf, deniedFor, documents, cardsHtml, onDecision, demoRequests, holderAct, SEED, SEED_ACT
  };
})();
