/* =====================================================================================
   Ghișeu — Depunerea cererilor la ghișeu în BackOffice (Feature 95768, 2026-10-15)
   US-233 inițiere · US-234 date solicitant · US-235 detalii · US-236 verificare + cererea pe
   hârtie + MSign · US-237 nota de plată · US-238 confirmare · US-239 schiță · US-240 eliminare ·
   US-241 lista schițelor (+ US-256 regenerarea notei expirate).

   A module on the permits back office (no product mode): it plugs into the shell through
     · window.GEAPShellRegistries.ghiseu — „Dosare noi” on the shell's registry engine
       (toolbar, tabs, sort, pagination, Filtrare avansată, export);
     · window.GEAPShellRoutes — #ghiseu/nou · #ghiseu/<id>[/<step>] (the wizard page);
     · window.GEAPShellApi — page header, stacked lists, row actions, toasts, confirms, the
       service passport and its settings (US-221);
     · window.GEAPFormRender — the FO renderer: fields, registry lookup (skeleton + flash),
       searchable list, document fields + the FO document modal, document cards.
   Every control is an FO / BO component (components.md › „Ghișeu — depunere la ghișeu”); the
   only new CSS is the page glue in css/ghiseu.css.
   Data: data/ghiseu.json (RSP / RSUD / MPower / MNotify mocks, the holders' acts, the desk
   settings per service, seeded drafts). Drafts live in localStorage (`geap-ghiseu-v1`);
   `?ghseed=1` restores the seed. Demo switches: ?mconnect=0 (registries down), ?mdocs=0
   (paper request fails), ?msign=0|1 / ?olograf=0|1 / ?cert=0|1 (service settings),
   ?msignerr=1 (MSign down), ?taxa=incompleta, ?depunere=eroare, ?certerr=1, ?gol=1 (no drafts).
   Demo prefill (user, 2026-10-16): a request started from „Ce se solicită?” comes with the contact, the
   service details and the required documents filled (?prefill=0 = empty); the stepper opens any step.
   Demo contact rule (user, 2026-10-16): any phone with ≥ 6 digits passes (spaces, +, -, () ignored; no +373
   format, no MNotify match); empty / non-numeric = „Introdu un număr de telefon valid.”. There is no phone
   OTP step at the desk.
   Demo data rule (user, 2026-10-15) — RSP / RSUD lookups in the picker and the flow:
     · any valid 13-digit IDNP / IDNO is found: the seed person / company when it exists, else a
       deterministic fake (name from a small pool indexed by the last two digits; „SRL Demo <last 4>”);
     · 9999999999999 = not found (the reserved code); ?mconnect=0 = the registry does not answer;
       fewer than 13 digits = „IDNP-ul / IDNO-ul are 13 cifre.”;
     · the holder's acts for the chosen service: a code starting with 0 has none (Solicitare nouă
       only + the empty state); any other code has the seed acts when defined for the service, else
       2–3 generated ones (valabil, suspendat, a decision when the last digit is even), numbers
       derived from the code.
   ===================================================================================== */
(function () {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const STORE_KEY = "e-permits-ghiseu-v1";
  const DATA_URL = "data/ghiseu.json";
  const LOOKUP_MS = 900;
  const NOTIFY_BEFORE_DAYS = 7;
  const NO_RIGHTS = "Nu aveți permisiunea de a accesa această pagină.";
  const REQUIRED = "Câmpul este obligatoriu.";

  /* the steps, in the order of the stories (Feature 95768 § User Flow) */
  const STEPS = [
    { id: "initiere", label: "Inițiere cerere" },
    /* user 2026-10-15: the request window opens on the FO „Ce vrei să soliciți?” screen (no stepper, as
       in FO); choosing „Solicitare nouă” or a post-process starts the request at „Solicitant” */
    { id: "intent", label: "Ce se solicită" },
    /* design decision (user, 2026-10-15): US-233 is split — the picker holds service + process, the
       request's first step identifies the applicant (and, for a post-process, the permit) */
    /* user 2026-10-15: identity, representation and contact on ONE step, as FO fo-01 „Date solicitant” */
    { id: "identificare", label: "Date solicitant" },
    { id: "detalii", label: "Detalii serviciu" },
    { id: "documente", label: "Documente însoțitoare" },
    { id: "verificare", label: "Verificare" },
    { id: "livrare", label: "Livrare" },
    { id: "plata", label: "Notă de plată" },
    { id: "confirmare", label: "Confirmarea depunerii" }
  ];
  const STEP_INDEX = Object.fromEntries(STEPS.map((step, index) => [step.id, index]));

  /* the request form of each service (the published form of the request type; the fields a
     service story describes — here two demo forms drawn by the FO renderer) */
  const FORMS = {
    obiect: {
      fields: [
        { id: "gh-obiect", key: "obiect", type: "text", label: "Denumirea obiectului", required: true, span: 12, placeholder: "De ex. Cafeneaua „La Izvor”", maxLength: 120 }
      ],
      address: true,
      docs: [
        { id: "property-deed", label: "Copia actului de proprietate / contractului de locațiune", description: "Actul ce confirmă dreptul asupra imobilului unde se desfășoară activitatea.", required: true },
        { id: "floor-plan", label: "Schița spațiului / planul încăperilor", description: "Plan cu amplasarea încăperilor și destinația lor.", required: true },
        { id: "state-registry-extract", label: "Extras din Registrul de Stat al persoanelor juridice", description: "Confirmă înregistrarea companiei. Se caută în MDocs după IDNO.", required: true, onlyPJ: true },
        { id: "hygiene-certificates", label: "Certificate de instruire igienică ale personalului", description: "Opțional la depunere — poate fi solicitat ulterior.", required: false }
      ]
    },
    biocid: {
      fields: [
        { id: "gh-produs", key: "obiect", type: "text", label: "Denumirea produsului biocid", required: true, span: 12, placeholder: "De ex. Dezinfectant „EcoClean 5L”", maxLength: 120 },
        { id: "gh-tip-produs", key: "tipProdus", type: "select", label: "Tipul de produs", required: true, span: 6, placeholder: "Selectează tipul", options: ["TP1 · Igiena umană", "TP2 · Dezinfectante pentru suprafețe", "TP4 · Suprafețe în contact cu alimente", "TP18 · Insecticide"] },
        { id: "gh-substanta", key: "substanta", type: "text", label: "Substanța activă", required: true, span: 6, placeholder: "De ex. Clorură de benzalconiu" }
      ],
      address: false,
      docs: [
        { id: "bio-tech", label: "Fișa tehnică a produsului", description: "Compoziția, concentrația substanței active, modul de utilizare.", required: true },
        { id: "bio-sds", label: "Fișa cu date de securitate", description: "Conform Regulamentului REACH, în limba română.", required: true },
        { id: "bio-label", label: "Proiectul etichetei", description: "Eticheta în limba română, cu instrucțiunile de utilizare.", required: false }
      ]
    }
  };
  const PROCURA_DOC = { id: "procura", label: "Procură (copia scanată)", description: "Procura pe hârtie prezentată de reprezentant, verificată la ghișeu.", required: true };
  const OTHER_DOC = { id: "alte", label: "Alte documente", description: "Opțional — orice document suplimentar prezentat de solicitant.", required: false };

  /* ---------------------------------------------------------------- tiny helpers */
  const A = () => window.GEAPShellApi || {};
  const U = () => window.GEAPUi || {};
  const R = () => window.GEAPFormRender || {};
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (name, size = 20, cls = "icon") => `<svg class="${cls}" width="${size}" height="${size}" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${name}"></use></svg>`;
  const pad = (n) => String(n).padStart(2, "0");
  const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const nowIso = () => isoOf(new Date());
  const dayAt = (offset, time = "12:00") => { const d = new Date(); d.setDate(d.getDate() + offset); const [h, m] = time.split(":"); d.setHours(Number(h), Number(m), 0, 0); return isoOf(d); };
  const addDays = (iso, n) => { const d = new Date(iso); d.setDate(d.getDate() + n); return isoOf(d); };
  const daysUntil = (iso) => { const a = new Date(); a.setHours(0, 0, 0, 0); const b = new Date(iso); b.setHours(0, 0, 0, 0); return Math.round((b - a) / 86400000); };
  const RO_MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
  const longDate = (iso) => { if (!iso) return ""; const d = new Date(iso); return `${d.getDate()} ${RO_MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
  const stamp = (iso) => (iso ? `${longDate(iso)}, ${pad(new Date(iso).getHours())}:${pad(new Date(iso).getMinutes())}` : "");
  const mdl = (n) => `${Number(n).toLocaleString("ro-RO")} MDL`;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : n % 100 >= 20 || (n % 100 === 0 && n) ? `de ${many}` : many}`;
  const flag = (name, def = null) => (params.has(name) ? params.get(name) !== "0" : def);
  const tagHtml = (label, tone = "neutral") => U().renderTag?.(label, tone) || esc(label);
  const userName = () => A().currentUserName?.() || "Anastasia Cojocaru";

  /* ---------------------------------------------------------------- data + store */
  const S = { data: null, drafts: [], audit: [], seq: 4900, loading: null, page: null, cur: null, step: 0, errors: {}, notice: null, lookups: {} };

  function load() {
    if (S.data) return Promise.resolve(S.data);
    if (S.loading) return S.loading;
    S.loading = fetch(DATA_URL, { cache: "no-store" }).then((r) => r.json()).then((data) => {
      S.data = data;
      readStore();
      runRetention();
      return data;
    });
    return S.loading;
  }
  function readStore() {
    let saved = null;
    if (!params.has("ghseed")) { try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null"); } catch { saved = null; } }
    if (saved?.drafts) { S.drafts = saved.drafts; S.audit = saved.audit || []; S.seq = saved.seq || S.seq; return; }
    S.drafts = params.get("gol") === "1" ? [] : (S.data.drafts || []).map(seedDraft);
    S.audit = [];
    writeStore();
  }
  function writeStore() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ drafts: S.drafts, audit: S.audit, seq: S.seq })); } catch { /* private mode: the session keeps working */ }
  }
  const audit = (action, draft, detail = "", extra = {}) => {
    S.audit.unshift({ at: nowIso(), user: extra.system ? "SIA GEAP" : userName(), action, cerere: draft?.nr || "", tmp: draft && !draft.nr ? draft.tmp : undefined, persoana: draft ? holderCode(draft) : "", detail, personal: true, ...extra });
  };

  /* ---------------------------------------------------------------- model */
  const serviceOf = (code) => A().getServiceByCode?.(code) || null;
  const deskOf = (code) => S.data?.services?.[code] || null;
  const formOf = (draft) => FORMS[deskOf(draft.service)?.form] || FORMS.obiect;
  const person = (idnp) => (S.data?.people || []).find((p) => p.idnp === idnp) || null;
  const company = (idno) => (S.data?.companies || []).find((c) => c.idno === idno) || null;
  /* the demo data rule (header): any 13 digits answer, 9999999999999 does not */
  const NOT_FOUND_CODE = "9999999999999";
  const DEMO_FIRST = ["Ion", "Maria", "Andrei", "Elena", "Victor", "Natalia", "Sergiu", "Ana", "Mihai", "Cristina"];
  const DEMO_LAST = ["Popescu", "Rusu", "Ceban", "Munteanu", "Lungu", "Cojocaru", "Țurcanu", "Rotaru", "Moraru", "Bălan"];
  const registryPerson = (code) => (code === NOT_FOUND_CODE ? null : person(code) || { idnp: code, prenume: DEMO_FIRST[Number(code[11])], nume: DEMO_LAST[Number(code[12])] });
  const registryCompany = (code) => (code === NOT_FOUND_CODE ? null : company(code) || { idno: code, denumire: `SRL Demo ${code.slice(-4)}`, administratori: [] });
  /* 2–3 deterministic acts for a holder without seed acts for the service */
  function generatedActs(code, service) {
    const desk = deskOf(service) || {};
    const subs = (desk.subdiviziuni || []).map((x) => x.name);
    const sub = (i) => (subs.length ? subs[(Number(code[10]) + i) % subs.length] : "Subdiviziunea teritorială");
    const tail = code.slice(-4);
    const biocid = desk.form === "biocid";
    const prefix = biocid ? "BIO" : "ASF";
    const day = pad(1 + (Number(code.slice(-2)) % 28));
    const month = pad(1 + (Number(code[9]) % 12));
    const name1 = biocid ? `Dezinfectant „Demo ${tail}”` : `Cafeneaua „Demo ${tail}”`;
    const name2 = biocid ? `Antiseptic „Demo ${tail}”` : `Magazinul „Demo ${tail}”`;
    const acts = [
      { id: `gen-${code}-1`, kind: "act", service, name: name1, nr: `${prefix}-2025-${code.slice(-5)}`, status: "valabil", valabilPana: `2028-${month}-${day}`, subdiviziune: sub(0), object: { name: name1 } },
      { id: `gen-${code}-2`, kind: "act", service, name: name2, nr: `${prefix}-2024-${code.slice(4, 9)}`, status: "suspendat", valabilPana: `2027-${month}-${day}`, subdiviziune: sub(1), object: { name: name2 } }
    ];
    if (desk.contestabil && Number(code[12]) % 2 === 0) {
      acts.push({ id: `gen-${code}-3`, kind: "decizie", service, name: biocid ? `Biocid „Demo ${tail}-R”` : `Terasa „Demo ${tail}”`, nr: `DR-2026-${code.slice(-5)}`, status: "respins", emisZileInUrma: 3 + (Number(tail) % 20), subdiviziune: sub(2), decizie: "Decizie de respingere" });
    }
    return acts;
  }
  const fullName = (p) => [p?.prenume, p?.nume].filter(Boolean).join(" ");
  const holderCode = (d) => (d.personType === "PJ" ? d.company.idno : d.applicant.idnp);
  const holderName = (d) => (d.personType === "PJ" ? d.company.denumire : fullName(d.applicant));
  /* the person at the desk: the applicant (PF), the representative (PF + reprezentant), the person filing (PJ) */
  const filerName = (d) => (d.personType === "PF" && d.rep.on ? fullName(d.rep) : fullName(d.applicant));

  /* the service settings: MSign at the desk + retention from Setări (US-221), the rest from the desk data */
  function settingsOf(code) {
    const service = serviceOf(code);
    const cfg = service && A().serviceConfig ? A().serviceConfig(service) : {};
    const desk = deskOf(code) || {};
    return {
      msign: flag("msign", cfg.signCounter !== false),
      olograf: flag("olograf", desk.olograf !== false),
      certificat: flag("cert", desk.certificat !== false),
      retentie: Number(cfg.draftDays) || 90,
      payTerm: Number(cfg.payTerm) || 30,
      mdelivery: cfg.mdelivery !== false && (service?.rssp?.delivery || []).includes("MDelivery"),
      paperRelease: true
    };
  }
  const applicantTypesOf = (code) => {
    const types = serviceOf(code)?.rssp?.applicantTypes || ["Persoană fizică", "Persoană juridică"];
    return types.map((t) => (/juridic/i.test(t) ? "PJ" : "PF"));
  };
  /* the desk's services: the authority's, published, active in RSSP (US-233 AC-03/04) */
  function deskServices() {
    const assignment = A().currentAssignment?.();
    const all = A().servicesStore?.()?.services || [];
    const authority = assignment?.roleId === "central-admin" ? null : "aut-ansp";
    return all.filter((s) => (!authority || s.authorityId === authority) && s.status === "Publicat" && (s.rssp?.rsspStatus || "Publicat") === "Publicat" && deskOf(s.code));
  }

  /* the electronic link between the person filing and the applicant (US-233 AC-15…22) */
  function basisOf(d) {
    if (d.personType === "PJ") {
      if (!d.company.idno || !d.applicant.idnp || d.company.state !== "found" || d.applicant.state !== "found") return d.company.state === "manual" || d.applicant.state === "manual" ? { kind: null, manual: true } : null;
      if (company(d.company.idno)?.administratori?.includes(d.applicant.idnp)) return { kind: "rsud", label: "Administrator în RSUD" };
      const m = (S.data.mpower || []).find((x) => x.from === d.company.idno && x.to === d.applicant.idnp);
      return m ? { kind: "mpower", label: "Împuternicire MPower", nr: m.nr, until: m.valabilPana } : { kind: null };
    }
    if (!d.rep.on) return d.applicant.state ? { kind: "self" } : null;
    if (!d.rep.idnp || !d.rep.state) return null;
    if (d.rep.state === "manual" || d.applicant.state === "manual") return { kind: null, manual: true };
    const m = (S.data.mpower || []).find((x) => x.from === d.applicant.idnp && x.to === d.rep.idnp);
    return m ? { kind: "mpower", label: "Împuternicire MPower", nr: m.nr, until: m.valabilPana } : { kind: null };
  }
  const basisLabel = (d) => { const b = basisOf(d); return b?.kind === "rsud" || b?.kind === "mpower" ? b.label : d.procura ? "Procură" : b?.kind === "self" ? "" : "—"; };
  const needsProcura = (d) => { const b = basisOf(d); return Boolean(b) && b.kind === null; };

  /* holder's acts + decisions for the chosen service (US-233 AC-26/30) */
  const actsOf = (d) => {
    const code = holderCode(d);
    if (!code || code === NOT_FOUND_CODE || !d.service) return [];
    const seeded = (S.data.acts?.[code] || []).filter((a) => a.service === d.service);
    if (seeded.length) return seeded;
    return code.startsWith("0") ? [] : generatedActs(code, d.service);
  };
  const actById = (d, id) => actsOf(d).find((a) => a.id === id) || null;
  /* the post-processes an act's status allows (AC-28) + Contestație on decisions in the term (AC-31/32) */
  function postprocessesOf(d, act) {
    const desk = deskOf(d.service) || {};
    if (act.kind === "decizie") {
      const within = (act.emisZileInUrma ?? 999) <= (desk.termenContestare || 0);
      return desk.contestabil && within ? ["Contestație"] : [];
    }
    return [...(desk.postprocese?.[act.status] || []), ...(desk.contestabil && act.status === "valabil" && (act.emisZileInUrma ?? 999) <= (desk.termenContestare || 0) ? ["Contestație"] : [])];
  }
  const ACT_TONE = { valabil: ["Valabil", "success"], suspendat: ["Suspendat", "warning"], expirat: ["Expirat", "neutral"], retras: ["Retras", "neutral"], respins: ["Respinsă", "danger"] };

  /* request type → terms → fees (US-235 AC-14/15, US-237 AC-03) */
  const typeCfg = (d) => deskOf(d.service)?.requestTypes?.[d.requestType] || { terms: [{ id: "standard", label: serviceOf(d.service)?.geap?.requestTypes?.[0]?.term ? `${serviceOf(d.service).geap.requestTypes[0].term.value} ${serviceOf(d.service).geap.requestTypes[0].term.unit}` : "30 de zile", fees: [] }] };
  const termsOf = (d) => typeCfg(d).terms || [];
  const termOf = (d) => termsOf(d).find((t) => t.id === d.details.term) || (termsOf(d).length === 1 ? termsOf(d)[0] : null);
  const reductionsOf = (d) => deskOf(d.service)?.reductions || [];
  /* the payment note's lines: the term's fees with the chosen reductions, + MDelivery */
  function feeLines(d) {
    const desk = deskOf(d.service) || {};
    const term = termOf(d);
    const lines = (term?.fees || []).map((key) => {
      const fee = desk.fees?.[key];
      if (!fee) return null;
      const reds = reductionsOf(d).filter((r) => r.fee === key && d.details.reductions.includes(r.id));
      const off = reds.reduce((sum, r) => sum + (r.type === "procent" ? Math.round(fee.amount * r.value / 100) : r.value), 0);
      return { name: fee.name, account: fee.account, base: fee.amount, reductions: reds.map((r) => `${r.label} (−${r.type === "procent" ? `${r.value}%` : mdl(r.value)})`), amount: Math.max(0, fee.amount - off) };
    }).filter(Boolean);
    if (d.delivery.mode === "mdelivery") {
      const m = S.data.mdelivery;
      lines.push({ name: m.name, account: params.get("taxa") === "incompleta" ? "" : m.account, base: m.amount, reductions: [], amount: m.amount, mdelivery: true });
    }
    return lines;
  }
  const hasFee = (d) => feeLines(d).length > 0;
  const visibleSteps = (d) => STEPS.filter((s) => s.id !== "plata" || hasFee(d) || (d.payment && d.payment.status === "Achitată"));
  const nextStepIndex = (d, i) => { const ids = visibleSteps(d).map((s) => STEP_INDEX[s.id]); return ids.find((x) => x > i) ?? i; };
  const prevStepIndex = (d, i) => { const ids = visibleSteps(d).map((s) => STEP_INDEX[s.id]); return [...ids].reverse().find((x) => x < i) ?? 0; };

  /* substatut after the step reached (US-239 AC-09) */
  function syncSubstatus(d) {
    if (d.status === "În procesare" || d.removed) return;
    if (d.payment?.status === "Expirată") { d.status = "Respins formal"; d.substatus = "Plată expirată"; return; }
    d.status = "Schiță";
    if (d.payment?.status === "Achitată") d.substatus = "Achitat";
    else if (d.payment && d.payment.status === "Emisă") d.substatus = "Spre achitare";
    else if (d.step >= STEP_INDEX.verificare) d.substatus = "Spre semnare";
    else d.substatus = "Schiță";
  }
  const retentionEnd = (d) => addDays(d.createdAt, settingsOf(d.service).retentie);
  const isPaid = (d) => d.payment?.status === "Achitată";
  const isSubmitted = (d) => d.status === "În procesare";
  const locked = (d) => isPaid(d) || isSubmitted(d);

  /* auto-removal after the retention period (US-239 AC-07, US-240 data model) */
  function runRetention() {
    let changed = false;
    S.drafts.forEach((d) => {
      if (d.removed || isSubmitted(d) || isPaid(d)) return;
      if (daysUntil(retentionEnd(d)) < 0) {
        d.removed = { at: retentionEnd(d), by: "SIA GEAP", reason: "Expirarea perioadei de retenție", auto: true };
        d.status = "Schiță"; d.substatus = "Eliminat";
        if (d.payment && d.payment.status !== "Achitată") d.payment.status = "Anulată";
        audit("Eliminare automată schiță", d, "Expirarea perioadei de retenție", { system: true });
        changed = true;
      } else if (!d.notified && daysUntil(retentionEnd(d)) <= NOTIFY_BEFORE_DAYS) {
        d.notified = addDays(retentionEnd(d), -NOTIFY_BEFORE_DAYS);
        audit("Notificare eliminare schiță", d, `MNotify solicitantului și utilizatorului: eliminare la ${longDate(retentionEnd(d))}`, { system: true });
        changed = true;
      }
    });
    if (changed) writeStore();
  }

  function blankDraft() {
    return {
      id: "", nr: "", uid: "", tmp: `tmp-${Date.now().toString(36)}`, status: "Schiță", substatus: "Schiță", channel: "Ghișeu", step: 0, maxStep: 0,
      service: "", requestType: "", process: "", act: null,
      personType: "PF", applicant: { idnp: "", nume: "", prenume: "", state: "" }, company: { idno: "", denumire: "", state: "" },
      rep: { on: false, idnp: "", nume: "", prenume: "", state: "" }, procura: false,
      contact: { phone: "", email: "", phoneSrc: "", emailSrc: "" },
      details: { values: {}, address: {}, subdivision: "", term: "", reductions: [] },
      docs: {}, review: { paper: null, olograf: null, signed: null, voided: [] },
      delivery: { mode: "evo", address: "" }, payment: null,
      createdAt: "", updatedAt: "", by: "", subdiviziune: "CSP Chișinău", removed: null, submittedAt: "", examDeadline: ""
    };
  }
  /* a seeded draft, filled up to the step it was saved at */
  function seedDraft(seed) {
    const d = blankDraft();
    d.id = seed.id; d.nr = seed.nr; d.uid = `uid-${seed.id}`;
    d.service = seed.service; d.requestType = seed.requestType; d.personType = seed.personType;
    d.process = seed.act ? "post" : seed.requestType ? "primar" : ""; d.act = seed.act || null; d.requestType = seed.requestType || "";
    d.by = seed.by === "self" ? userName() : seed.by;
    d.createdAt = dayAt(seed.createdDays, seed.createdTime);
    const upd = new Date(Date.now() + seed.updatedHours * 3600000);
    d.updatedAt = isoOf(upd < new Date(d.createdAt) ? new Date(d.createdAt) : upd);
    /* a draft can exist before identification (the picker saved it; „—” in the list) */
    const p = seed.applicant ? person(seed.applicant) : null;
    if (seed.applicant) d.applicant = { idnp: seed.applicant, nume: p?.nume || "", prenume: p?.prenume || "", state: "found" };
    d.personType = seed.personType || (applicantTypesOf(seed.service).length === 1 ? applicantTypesOf(seed.service)[0] : "");
    if (seed.personType === "PJ") { const c = company(seed.company); d.company = { idno: seed.company, denumire: c?.denumire || "", state: "found" }; }
    if (needsProcura(d)) d.procura = true;
    d.step = Math.min(seed.step, STEP_INDEX.plata);
    d.maxStep = d.step;
    fillDemo(d, d.step);
    if (seed.payment) {
      d.payment = makePayment(d, { issued: addDays(dayAt(seed.paymentDueDays, "10:00"), -settingsOf(d.service).payTerm), due: dayAt(seed.paymentDueDays, "23:59") });
      d.payment.status = seed.payment;
      if (seed.payment === "Achitată") { d.payment.paid = dayAt(-1, "16:20"); d.payment.txn = "MPAY-2026-7781203"; }
    }
    if (seed.submittedDays != null) {
      d.status = "În procesare"; d.substatus = "Spre distribuire"; d.step = STEP_INDEX.confirmare;
      d.submittedAt = dayAt(seed.submittedDays, seed.submittedTime);
      d.examDeadline = addDays(d.submittedAt, 21);
    }
    syncSubstatus(d);
    return d;
  }
  /* plausible answers for every step before `upTo` (seed + demo states) */
  function fillDemo(d, upTo) {
    const desk = deskOf(d.service) || {};
    const mn = S.data.mnotify || {};
    if (upTo > STEP_INDEX.identificare && !d.contact.phone) {
      const c = mn[holderCode(d)] || mn[d.applicant.idnp] || {};
      d.contact = { phone: c.phone || "69000111", email: c.email || "", phoneSrc: c.phone ? "mnotify" : "manual", emailSrc: c.email ? "mnotify" : "manual" };
    } else if (upTo >= STEP_INDEX.identificare && !d.contact.phoneSrc) {
      const c = mn[holderCode(d)] || mn[d.applicant.idnp] || {};
      d.contact = { phone: c.phone || "", email: c.email || "", phoneSrc: c.phone ? "mnotify" : "", emailSrc: c.email ? "mnotify" : "" };
    }
    if (upTo > STEP_INDEX.detalii && !d.details.values.obiect) {
      const act = d.act ? actById(d, d.act) : null;
      if (desk.form === "biocid") d.details.values = { obiect: act?.object?.name || "Dezinfectant „AquaPur 1L”", tipProdus: "TP2 · Dezinfectante pentru suprafețe", substanta: "Clorură de benzalconiu" };
      else {
        d.details.values = { obiect: act?.object?.name || "Cafeneaua „La Izvor”" };
        d.details.address = act?.object?.district ? { ...act.object } : { district: "Municipiul Chișinău", locality: "Chișinău", sector: "Centru", street: "bd. Ștefan cel Mare și Sfânt", house: "12", postalCode: "MD-2001" };
      }
      d.details.subdivision = act ? act.subdiviziune : subdivisionFor(d) || desk.subdiviziuni?.[0]?.name || "";
      d.details.term = termsOf(d)[0]?.id || "";
    }
    if (upTo > STEP_INDEX.documente && !Object.keys(d.docs).length) {
      const at = stamp(d.createdAt);
      docsOf(d).filter((doc) => doc.required).forEach((doc, i) => {
        d.docs[doc.id] = [doc.id === "state-registry-extract"
          ? { sursa: "mdocs", tip: doc.label, fisier: `extras-registru-${d.company.idno}.pdf`, size: "310 KB", at: "12 martie 2026, 10:14", verb: "Emis", de: "ASP", semnat: true }
          : { sursa: "upload", tip: doc.label, fisier: ["contract-locatiune-scan.pdf", "planul-incaperilor.pdf", "procura-scan.pdf", "fisa-tehnica.pdf", "fisa-securitate.pdf"][i % 5], size: ["1.8 MB", "2.7 MB", "640 KB", "1.1 MB", "820 KB"][i % 5], at, verb: "Încărcat" }];
      });
    }
    if (upTo > STEP_INDEX.verificare) {
      const st = settingsOf(d.service);
      d.review.paper = d.review.paper || { at: d.createdAt };
      if (st.olograf && !d.review.olograf) d.review.olograf = { sursa: "upload", tip: "Cererea semnată olograf", fisier: `cerere-${d.nr || "ghiseu"}-semnata.pdf`, size: "1.2 MB", at: stamp(d.createdAt), verb: "Încărcat" };
      if (st.msign && !d.review.signed) d.review.signed = { at: d.createdAt, by: userName() };
    }
  }

  /* ---------------------------------------------------------------- documents (US-20) */
  function docsOf(d) {
    const form = formOf(d);
    const list = form.docs.filter((doc) => !doc.onlyPJ || d.personType === "PJ");
    return d.procura ? [PROCURA_DOC, ...list] : list;
  }

  /* ---------------------------------------------------------------- subdivision (US-235 AC-07…13) */
  function subdivisionFor(d) {
    const subs = deskOf(d.service)?.subdiviziuni || [];
    if (subs.length === 1) return subs[0].name;
    const raion = d.details.address?.district;
    return subs.find((s) => s.raioane.includes(raion))?.name || "";
  }

  /* ---------------------------------------------------------------- payment note (US-237) */
  function nextNoteNumber() { S.seq += 1; return `NP-2026-${String(S.seq).padStart(6, "0")}`; }
  function makePayment(d, { issued = nowIso(), due = null } = {}) {
    const lines = feeLines(d);
    return { nr: nextNoteNumber(), status: "Emisă", issued, due: due || addDays(issued, settingsOf(d.service).payTerm), paid: "", txn: "", lines, total: lines.reduce((s, l) => s + l.amount, 0), history: [] };
  }
  /* the note follows the request until it is paid (AC-13/17/21) */
  function refreshPayment(d) {
    if (!d.payment || isPaid(d) || d.payment.status === "Expirată") return;
    const lines = feeLines(d);
    if (!lines.length) { d.payment.status = "Anulată"; d.payment.history.push({ at: nowIso(), status: "Anulată" }); audit("Anulare notă de plată", d, `${d.payment.nr}: nu mai există taxe de achitat`); d.payment = null; return; }
    const total = lines.reduce((s, l) => s + l.amount, 0);
    if (total !== d.payment.total || lines.length !== d.payment.lines.length) {
      d.payment.lines = lines; d.payment.total = total;
      audit("Actualizare notă de plată", d, `${d.payment.nr}: ${mdl(total)}`);
    }
  }

  /* ---------------------------------------------------------------- registry „Dosare noi” (US-241) */
  const DATE_FACETS = {
    past: (iso) => { if (!iso) return ""; const n = -daysUntil(iso); return n <= 0 ? "Azi" : n <= 7 ? "Ultimele 7 zile" : n <= 30 ? "Ultimele 30 de zile" : "Mai vechi de 30 de zile"; },
    future: (iso) => { if (!iso) return ""; const n = daysUntil(iso); return n < 0 ? "Depășită" : n <= 7 ? "În următoarele 7 zile" : n <= 30 ? "În 8–30 de zile" : "Peste 30 de zile"; }
  };
  const SUB_TONE = { "Schiță": "neutral", "Spre semnare": "brand", "Spre achitare": "warning", "Achitat": "success", "Plată expirată": "danger", "Spre distribuire": "info" };
  const regRow = (d) => ({
    id: d.id,
    nr: d.nr,
    serviciu: serviceOf(d.service)?.title || d.service,
    tip: d.requestType || "—",
    solicitant: filerName(d) || holderName(d),
    reprezentant: d.personType === "PF" && d.rep.on ? fullName(d.applicant) : "",
    companie: d.personType === "PJ" ? d.company.denumire : "",
    substatut: d.substatus,
    status: d.status,
    creat: d.createdAt,
    creatDe: d.by,
    modificat: d.updatedAt,
    expirareNota: d.payment && ["Emisă", "Expirată"].includes(d.payment.status) ? d.payment.due : d.payment?.status === "Achitată" ? d.payment.due : "",
    notaStatus: d.payment?.status || "",
    eliminare: isSubmitted(d) ? "" : retentionEnd(d),
    notificat: Boolean(d.notified),
    depus: d.submittedAt,
    termen: d.examDeadline,
    submitted: isSubmitted(d),
    paid: isPaid(d)
  });
  function registryDb() {
    if (!S.data) { load().then(refreshRegistry); }
    const rows = S.drafts.filter((d) => !d.removed).map(regRow);
    return {
      kind: "ghiseu",
      fieldCount: 9,
      defaultSort: "modificat",
      columns: {
        /* widths = the one-line header (label + sort icon) or the longest date; names ellipsize with a
           tooltip; the actions („Continuă” + ⋮) stay pinned right while the dates scroll */
        nr: { label: "Număr cerere", width: 144, sortable: true },
        serviciu: { label: "Denumirea serviciului", width: 184, fill: true, sortable: true },
        solicitant: { label: "Nume solicitant", width: 152, sortable: true },
        companie: { label: "Compania", width: 144, sortable: true },
        substatut: { label: "Substatut", width: 120, sortable: true },
        creat: { label: "Data creării", width: 152, sortable: true },
        modificat: { label: "Data ultimei modificări", width: 180, sortable: true },
        expirareNota: { label: "Data expirării notei de plată", width: 212, sortable: true },
        eliminare: { label: "Data eliminării automate", width: 192, sortable: true },
        actiuni: { label: "", width: 168, pin: "end" }
      },
      views: {
        ghiseu: {
          title: "Dosare noi",
          selectable: false,
          searchPlaceholder: "Caută după numărul cererii, solicitant sau companie",
          columns: ["nr", "serviciu", "solicitant", "companie", "substatut", "creat", "modificat", "expirareNota", "eliminare", "actiuni"],
          tabs: [
            { id: "drafts", label: "Schițe", filter: "gh:draft" },
            { id: "submitted", label: "Dosare nedistribuite", filter: "gh:submitted" }
          ],
          primaryAction: can() ? { id: "gh-new", label: "Dosar nou" } : null
        }
      },
      runtimeRows: can() ? rows : []
    };
  }
  const dateCell = (iso, meta = "", tone = "") => (iso ? `
    <span class="e-permits-workplace__date-stack">
      <span>${esc(longDate(iso))}</span>
      ${meta ? `<span class="e-permits-workplace__date-meta${tone ? ` e-permits-gh__meta--${tone}` : ""}">${esc(meta)}</span>` : ""}
    </span>` : '<span class="e-permits-workplace__dash">—</span>');
  const inDays = (n) => (n === 0 ? "azi" : n === 1 ? "mâine" : n > 0 ? `în ${plural(n, "zi", "zile")}` : `acum ${plural(-n, "zi", "zile")}`);
  window.GEAPShellRegistries = window.GEAPShellRegistries || {};
  window.GEAPShellRegistries.ghiseu = {
    build: registryDb,
    facets: [
      { key: "serviciu", label: "Denumirea serviciului", get: (r) => r.serviciu },
      { key: "substatut", label: "Substatut", get: (r) => r.substatut },
      { key: "creat", label: "Data creării", get: (r) => DATE_FACETS.past(r.creat) },
      { key: "modificat", label: "Data ultimei modificări", get: (r) => DATE_FACETS.past(r.modificat) },
      { key: "expirareNota", label: "Data expirării notei de plată", get: (r) => DATE_FACETS.future(r.expirareNota) || "Fără notă de plată" },
      { key: "eliminare", label: "Data eliminării automate", get: (r) => DATE_FACETS.future(r.eliminare) }
    ],
    /* AC-06: număr, nume solicitant, companie */
    searchText: (row) => [row.nr, row.solicitant, row.reprezentant, row.companie].filter(Boolean).join(" "),
    sortValue: (row, key) => (["creat", "modificat", "expirareNota", "eliminare"].includes(key) ? row[key] || "" : undefined),
    filterToken: (row, token) => (token === "gh:draft" ? !row.submitted : token === "gh:submitted" ? row.submitted : true),
    renderCell: (row, key) => {
      switch (key) {
        case "nr": return `
          <div class="e-permits-workplace__case-cell">
            <span class="e-permits-passport__name" data-cell-tooltip="${esc(row.nr)}">${esc(row.nr)}</span>
            <span class="e-permits-workplace__source"><span>${esc(row.tip)}</span></span>
          </div>`;
        case "serviciu": return `<span data-cell-tooltip="${esc(row.serviciu)}">${esc(row.serviciu)}</span>`;
        case "solicitant": return !row.solicitant ? '<span class="e-permits-workplace__dash">—</span>' : `
          <div class="e-permits-workplace__case-cell">
            <span data-cell-tooltip="${esc(row.solicitant)}">${esc(row.solicitant)}</span>
            ${row.reprezentant ? `<span class="e-permits-workplace__source"><span data-cell-tooltip="${esc(`pentru ${row.reprezentant}`)}">pentru ${esc(row.reprezentant)}</span></span>` : ""}
          </div>`;
        case "companie": return row.companie ? `<span data-cell-tooltip="${esc(row.companie)}">${esc(row.companie)}</span>` : '<span class="e-permits-workplace__dash">—</span>';
        case "substatut": return tagHtml(row.substatut, SUB_TONE[row.substatut] || "neutral");
        case "creat": return U().renderDateTime?.(row.creat, row.creatDe, { short: true }) || esc(longDate(row.creat));
        case "modificat": return U().renderDateTime?.(row.modificat) || esc(longDate(row.modificat));
        case "expirareNota": {
          if (!row.expirareNota) return '<span class="e-permits-workplace__dash">—</span>';
          if (row.paid) return dateCell(row.expirareNota, "achitată");
          const n = daysUntil(row.expirareNota);
          return dateCell(row.expirareNota, n < 0 ? "expirată" : inDays(n), n < 0 ? "danger" : n <= 3 ? "warning" : "");
        }
        case "eliminare": {
          if (row.submitted) return '<span class="e-permits-workplace__dash">—</span>';
          const n = daysUntil(row.eliminare);
          return dateCell(row.eliminare, row.notificat ? `${inDays(n)} · notificare trimisă` : inDays(n), n <= NOTIFY_BEFORE_DAYS ? "warning" : "");
        }
        case "actiuni": {
          if (row.submitted) {
            return `<span class="e-permits-workplace__row-actions">${U().renderRowActions?.({ preview: `data-gh-open="${esc(row.id)}"`, label: row.nr }) || ""}</span>`;
          }
          const menu = [
            { label: "Elimină schița", icon: "delete", danger: true, attrs: `data-gh-remove="${esc(row.id)}"${row.paid ? ' aria-disabled="true" data-tooltip-reason="Nota de plată este achitată: schița nu se mai poate elimina."' : ""}` }
          ];
          return `<span class="e-permits-workplace__row-actions">${(U().renderRowActions?.({
            primary: { label: "Continuă", attrs: `data-gh-open="${esc(row.id)}" aria-label="Continuă ${esc(row.nr)}"` },
            menu,
            label: row.nr
          }) || "").replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>")}</span>`;
        }
        default: return esc(String(row[key] ?? "—"));
      }
    },
    openRow: (id) => openDraft(id),
    rowClass: () => "",
    emptyHtml: ({ query, filtered }) => {
      const E = window.GEAPEmptyState;
      if (!can()) return E?.render({ title: NO_RIGHTS, text: "Dosarele noi sunt disponibile utilizatorilor cu permisiunea de inițiere a cererilor la ghișeu.", icon: "lock", bare: true });
      if (!S.data) return E?.render({ title: "Se încarcă schițele…", loading: true, bare: true });
      if (query || filtered) return E?.noResults?.("Nicio înregistrare nu corespunde criteriului de căutare", { text: "Caută după numărul cererii, numele solicitantului sau companie.", bare: true });
      return E?.render({ title: "Nu sunt schițe înregistrate.", text: "Cererile începute la ghișeu apar aici până la confirmarea depunerii.", icon: "page-text", bare: true, actionHtml: '<button class="btn btn-primary btn-sm" type="button" data-workplace-add-product="gh-new">Dosar nou</button>' });
    },
    exportRows: (rows) => openExport(rows)
  };
  /* the open registry draws its rows again (the nav item re-shows it), never over the wizard */
  const refreshRegistry = () => {
    updateBadge();
    const reg = document.querySelector('[data-registry-kind="ghiseu"]');
    if (!reg || reg.closest("[hidden]") || (S.page && !S.page.hidden)) return;
    document.querySelector('[data-nav-item][data-nav-id="dosare-noi"]')?.click();
  };
  const updateBadge = () => {
    const n = S.drafts.filter((d) => !d.removed && !isSubmitted(d)).length;
    document.querySelectorAll('[data-nav-item][data-nav-id="dosare-noi"] .e-permits-shell__nav-badge').forEach((b) => { b.textContent = String(n); });
  };

  /* ---------------------------------------------------------------- permission (Feature AC-02, every story AC-01) */
  function can() {
    const role = A().currentAssignment?.()?.roleId;
    return role === "operator-ghiseu" || role === "central-admin";
  }

  /* ================================================================ the wizard page */
  const ERR_ICON = icon("circle-error-filled");
  const errSlot = (key) => `<span class="message message--inline message--error e-permits-fo-field__error" id="gh-err-${key}" data-gh-err="${key}" hidden></span>`;
  const req = () => U().requiredMark?.() || "";
  /* the FO „Date solicitant” identity card + group title (GEAPFormRender.roleCardHtml / roleGroupTitleHtml) */
  const roleTitle = (label) => R().roleGroupTitleHtml?.(label) || "";
  const roleCard = ({ name, idLabel, idValue, pj = false, tag = "", change = "" }) => R().roleCardHtml?.(
    { name, type: pj ? "PJ" : "PF", idLabel, idValue },
    { changeable: Boolean(change), changeAttrs: change, extraHtml: tag }
  ) || "";
  /* the FO read-only field (GEAPFormRender.readonlyFieldHtml: value + green check, optional hint) */
  const readonlyField = ({ id = "", label, value, span = 6, hint = "", required = false }) => R().readonlyFieldHtml?.({ id, label, value, span, hint, required }) || "";
  const section = (title, body, { id = "", desc = "", attrs = "", num = "" } = {}) => {
    const h = `<h2${id ? ` id="${id}"` : ""}>${num ? `<span class="e-permits-gh-start__num" aria-hidden="true">${num}</span>` : ""}${esc(title)}</h2>`;
    return `
    <section class="e-permits-fo-form__section${num ? " e-permits-gh-start__section" : ""}"${id ? ` aria-labelledby="${id}"` : ""} ${attrs}>
      ${desc ? `<div class="e-permits-fo-section-header">${h}<p class="e-permits-fo-section-header__desc">${desc}</p></div>` : h}
      ${body}
    </section>`;
  };

  /* ---- the two containers (user, 2026-10-15): „Dosar nou” opens the PICKER (library modal--md,
     #gh-start-modal — US-233's choices; a bottom sheet on phones); „Continuă” opens the REQUEST in a
     full-screen library modal used as a sheet (#gh-request-modal: modal--fullscreen, 24 from the top,
     rounded top corners = the Form Builder sheet radius 16, the scrim behind) with the stepper and the
     steps US-234 … US-238. Closing either returns to «Dosare noi». */
  const START_ID = "gh-start-modal";
  const SHEET_ID = "gh-request-modal";
  const bindContainer = (el) => {
    el.addEventListener("click", onClick);
    el.addEventListener("change", onChange);
    el.addEventListener("input", onInput);
    el.addEventListener("keydown", onKeydown);
  };
  function ensureStart() {
    let ov = document.getElementById(START_ID);
    if (ov) return ov;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="modal-overlay e-permits-gh-start" id="${START_ID}" aria-hidden="true">
        <div class="modal modal--lg e-permits-passport__modal e-permits-gh e-permits-gh-start__modal" role="dialog" aria-modal="true" aria-labelledby="gh-start-title" tabindex="-1">
          <button type="button" class="modal-close" aria-label="Închide" data-gh-start-cancel><span class="d-inline-flex">${icon("cross-large", 20, "icon small")}</span></button>
          <div class="modal--header">
            <h2 class="modal--header-title" id="gh-start-title" data-gh-start-title>Dosar nou</h2>
            <p class="e-permits-passport__modal-subtitle" data-gh-start-subtitle></p>
          </div>
          <div class="modal-content e-permits-gh-start__body" data-gh-start-body></div>
          <div class="modal--footer" data-gh-start-footer></div>
        </div>
      </div>`);
    ov = document.getElementById(START_ID);
    bindContainer(ov);
    ov.addEventListener("click", (event) => { if (event.target === ov) closeStart(); });
    /* Esc on an open post-process menu closes the menu only (js/modal.js listens on the document) */
    window.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !ov.classList.contains("is-active")) return;
      const open = ov.querySelector("[data-fo-intent-trigger][aria-expanded='true']");
      if (!open) return;
      event.preventDefault(); event.stopImmediatePropagation();
      closeIntentMenus();
      open.focus();
    }, true);
    /* Esc (js/modal.js) or × / Anulează: back where the picker was opened from */
    new MutationObserver(() => {
      if (ov.getAttribute("aria-hidden") !== "true") return;
      if (S.startHandled) { S.startHandled = false; return; }
      afterStartClosed();
    }).observe(ov, { attributes: true, attributeFilter: ["aria-hidden"] });
    return ov;
  }
  const closeStart = () => window.__modal?.close?.(`#${START_ID}`);
  function afterStartClosed() {
    if (S.cur?.id && S.startFrom === "sheet") { openDraft(S.cur.id, STEPS[Math.max(1, S.returnStep || 1)].id); return; }
    S.cur = null; S.dirty = false;
    toList();
  }
  function ensureSheet() {
    let ov = document.getElementById(SHEET_ID);
    if (ov) return ov;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="modal-overlay e-permits-gh-sheet-overlay" id="${SHEET_ID}" aria-hidden="true">
        <div class="modal modal--fullscreen e-permits-gh e-permits-gh-sheet" role="dialog" aria-modal="true" aria-labelledby="gh-sheet-title" tabindex="-1">
          <button type="button" class="modal-close" aria-label="Închide cererea" data-gh-sheet-close><span class="d-inline-flex">${icon("cross-large", 20, "icon small")}</span></button>
          <div class="modal--header e-permits-gh-sheet__header" data-gh-header></div>
          <div class="modal-content e-permits-gh-sheet__body" data-gh-body></div>
        </div>
      </div>`);
    ov = document.getElementById(SHEET_ID);
    bindContainer(ov);
    ov.addEventListener("click", (event) => { if (event.target === ov) requestCloseSheet(); });
    /* Esc closes the sheet (asking first when there is unsaved data) unless a dialog sits above it */
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !ov.classList.contains("is-active")) return;
      if (document.querySelector(`.modal-overlay.is-active:not(#${SHEET_ID}), .e-permits-fo-doc-modal-overlay:not([hidden]), [data-stack-menu]:not([hidden])`)) return;
      event.preventDefault();
      requestCloseSheet();
    });
    return ov;
  }
  const sheetOpen = () => document.getElementById(SHEET_ID)?.classList.contains("is-active");
  function openSheet() {
    const ov = ensureSheet();
    if (sheetOpen()) return;
    ov.__lastFocused = document.activeElement;
    ov.classList.add("is-active");
    ov.querySelector(".modal").classList.add("is-active");
    ov.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }
  function closeSheet() {
    const ov = document.getElementById(SHEET_ID);
    if (!ov || !sheetOpen()) return;
    ov.classList.remove("is-active");
    ov.querySelector(".modal").classList.remove("is-active");
    ov.setAttribute("aria-hidden", "true");
    setTimeout(() => { if (!document.querySelector(".modal-overlay.is-active")) document.body.classList.remove("modal-open"); }, 0);
  }
  /* × / Esc / scrim: unsaved data → „Salvați schița?” (Rămâi · Închide fără salvare · Salvează și închide) */
  function requestCloseSheet() {
    if (S.cur && S.dirty && !isSubmitted(S.cur) && !S.cur.removed) {
      openModal({
        kind: "leave",
        title: "Salvați schița înainte de a închide?",
        subtitle: S.cur.nr || "Dosar nou",
        body: '<p class="e-permits-passport__lead">Modificările făcute după ultima salvare se pierd dacă închideți cererea fără să o salvați.</p>',
        footer: '<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Rămâi în cerere</button><button class="btn btn-neutral btn-rounded" type="button" data-gh-leave-discard>Închide fără salvare</button><button class="btn btn-primary btn-rounded" type="button" data-gh-leave-save>Salvează și închide</button></div>'
      });
      return;
    }
    leave();
  }
  function leave() {
    S.cur = null; S.dirty = false;
    closeSheet();
    toList();
  }
  /* «Dosare noi» behind the dialogs: drawn when it is not the page already, refreshed otherwise */
  function toList() {
    const nav = document.querySelector('[data-nav-item][data-nav-id="dosare-noi"]');
    if (nav) nav.click(); else setHash("#dosare-noi");
    updateBadge();
  }
  function ensureListBehind() {
    const reg = document.querySelector('[data-registry-kind="ghiseu"]');
    if (reg && !reg.hidden && !reg.closest("[hidden]")) return;
    document.querySelector('[data-nav-item][data-nav-id="dosare-noi"]')?.click();
  }
  const setHash = (hash) => { if (window.location.hash !== hash) history.replaceState(null, "", `${window.location.pathname}${window.location.search}${hash}`); };

  /* ---------------------------------------------------------------- open */
  const shellReady = () => new Promise((resolve) => {
    let tries = 0;
    const tick = () => { if ((window.GEAPShellApi && A().servicesStore?.() && window.GEAPFormRender) || tries > 100) resolve(); else { tries += 1; setTimeout(tick, 60); } };
    tick();
  });
  async function route(id, stepId) {
    await load();
    await shellReady();
    await R().schemaReady?.();
    if (can()) ensureListBehind();
    if (!can()) { renderMessage({ title: NO_RIGHTS, text: "Cererile la ghișeu se inițiază doar de utilizatorii cu permisiunea de inițiere a cererilor la ghișeu (Specialist ghișeu, Administrator central).", icon: "lock" }); return; }
    if (id === "nou") { startNew(); return; }
    openDraft(id, stepId);
  }
  window.GEAPShellRoutes = window.GEAPShellRoutes || [];
  window.GEAPShellRoutes.push((hash) => {
    const m = hash.match(/^#ghiseu\/([^/]+)(?:\/([^/]+))?$/);
    if (!m) return false;
    route(decodeURIComponent(m[1]), m[2]);
    return true;
  });

  /* no rights / not found / removed: the picker-sized modal with the shared empty state */
  function renderMessage({ title, text, icon: ic = "page-text", crumb = "", actionHtml = "" }) {
    closeSheet();
    S.cur = null;
    const ov = ensureStart();
    S.page = ov;
    ov.querySelector("[data-gh-start-title]").textContent = crumb || "Dosar nou";
    const sub = ov.querySelector("[data-gh-start-subtitle]");
    sub.textContent = ""; sub.hidden = true;
    ov.querySelector("[data-gh-start-body]").innerHTML = window.GEAPEmptyState?.render({ title, text, icon: ic, compact: true }) || esc(title);
    ov.querySelector("[data-gh-start-footer]").innerHTML = `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-gh-start-cancel>Închide</button>${actionHtml}</div>`;
    if (!ov.classList.contains("is-active")) window.__modal?.open?.(`#${START_ID}`);
  }
  function startNew() {
    S.cur = blankDraft();
    S.cur.by = userName();
    S.step = 0; S.errors = {}; S.notice = null; S.dirty = false;
    closeSheet();
    render();
  }
  function openDraft(id, stepId) {
    const saved = S.drafts.find((d) => d.id === id || d.nr === id);
    if (!saved) { renderMessage({ title: "Cererea nu a fost găsită", text: "Verificați numărul cererii în lista Dosare noi.", icon: "search" }); return; }
    if (saved.removed) {
      renderMessage({
        crumb: saved.nr,
        title: saved.removed.auto ? "Schița a fost eliminată automat" : "Schița a fost eliminată",
        text: `${saved.removed.auto ? `La ${longDate(saved.removed.at)}, după perioada de retenție de ${settingsOf(saved.service).retentie} de zile.` : `La ${stamp(saved.removed.at)}, de ${saved.removed.by}.`} Motivul eliminării: ${saved.removed.reason}. Accesul la schiță este dezactivat, iar depunerea pe baza ei nu mai este posibilă.`,
        icon: "delete",
        actionHtml: '<button class="btn btn-primary btn-rounded" type="button" data-gh-new>Dosar nou</button>'
      });
      return;
    }
    S.cur = JSON.parse(JSON.stringify(saved));
    S.errors = {}; S.notice = null; S.dirty = false;
    const wanted = stepId && STEP_INDEX[stepId] != null ? STEP_INDEX[stepId] : saved.step;
    S.step = isSubmitted(saved) ? STEP_INDEX.confirmare : Math.min(wanted, saved.maxStep ?? saved.step);
    if (S.step === STEP_INDEX.plata && !visibleSteps(S.cur).some((s) => s.id === "plata")) S.step = STEP_INDEX.livrare;
    /* US-239 AC-05: a draft opens in the request itself, at its last step (the picker only on demand) */
    if (S.step === 0 && !stepId) S.step = 1;
    render();
  }
  const openDraftFromList = (id) => { window.location.hash = `#ghiseu/${encodeURIComponent(id)}`; };

  /* ---------------------------------------------------------------- render */
  function sheetHeaderHtml(d) {
    const svc = serviceOf(d.service);
    const removable = d.id && !isSubmitted(d) && !isPaid(d);
    const onIntent = STEPS[S.step]?.id === "intent";
    const menu = d.id && !isSubmitted(d) ? (A().renderStackMenu?.([
      ...(d.process && !onIntent ? [{ label: "Schimbă procesul", icon: "reorder", attrs: `data-gh-change-process${isPaid(d) ? ' aria-disabled="true" data-tooltip-reason="Nota de plată este achitată: procesul nu se mai poate schimba."' : ""}` }] : []),
      { label: "Istoricul cererii", icon: "history", attrs: "data-gh-history" },
      { label: "Elimină schița", icon: "delete", danger: true, attrs: `data-gh-remove="${esc(d.id)}"${removable ? "" : ' aria-disabled="true" data-tooltip-reason="Nota de plată este achitată: schița nu se mai poate elimina."'}` }
    ], d.nr) || "").replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>") : "";
    const statusTags = `${tagHtml(d.status, d.status === "În procesare" ? "info" : d.status === "Respins formal" ? "danger" : "neutral")}${d.substatus && d.substatus !== d.status ? ` ${tagHtml(d.substatus, SUB_TONE[d.substatus] || "neutral")}` : ""}`;
    const processMeta = d.process === "post" ? `${d.requestType} · ${actById(d, d.act)?.nr || ""}` : d.requestType;
    const meta = [d.nr || "Nesalvat", holderName(d), processMeta, "Ghișeu"].filter(Boolean).map((x) => `<span class="e-permits-gh-sheet__meta-part">${esc(x)}</span>`).join("");
    /* FO header draft status „Salvat ca schiță · hh:mm” (+ the desk retention date) */
    const savedHtml = isSubmitted(d) ? esc(`Depus la ${stamp(d.submittedAt)}`) : d.updatedAt && d.id
      ? R().draftStatusHtml?.({ time: `${longDate(d.updatedAt)}, ${pad(new Date(d.updatedAt).getHours())}:${pad(new Date(d.updatedAt).getMinutes())}`, datetime: d.updatedAt, extraHtml: `<span class="e-permits-fo-draft-status__dot" aria-hidden="true"></span><span class="e-permits-fo-draft-status__time">eliminare automată la ${esc(longDate(retentionEnd(d)))}</span>` }) || ""
      : "Nesalvat";
    return `
      <div class="e-permits-gh-sheet__title">
        <h2 class="modal--header-title" id="gh-sheet-title" title="${esc(svc?.title || "")}">${esc(svc?.title || "Dosar nou")}</h2>
        <div class="e-permits-gh-sheet__meta">${meta}<span class="e-permits-gh__tags">${statusTags}</span></div>
        <p class="e-permits-fo-draft-status e-permits-gh-sheet__saved" aria-live="polite">${savedHtml}</p>
      </div>
      <div class="e-permits-gh-sheet__actions">
        ${isSubmitted(d) || isPaid(d) ? "" : `<button class="btn btn-neutral btn-sm e-permits-gh-sheet__save" type="button" aria-label="Salvează schița" data-tooltip-label="Salvează schița" data-gh-save><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg?v=draft-icons-v1#icon-cloud-upload-draft"></use></svg><span class="e-permits-gh-sheet__save-label">Salvează schița</span></button>`}
        ${menu}
      </div>`;
  }
  function stepperHtml(d) {
    const steps = visibleSteps(d).filter((s) => s.id !== "initiere" && s.id !== "intent");
    const reach = Math.max(d.maxStep || 0, S.step);
    return `
      <nav class="e-permits-fo-stepper" aria-label="Pașii cererii">
        <ol>
          ${steps.map((step, n) => {
            const i = STEP_INDEX[step.id];
            const active = i === S.step;
            /* completed = reached and its checks pass (the FO vertical stepper check) */
            const done = !active && i <= reach && !CHECK[i](d).length;
            /* demo (user 2026-10-16, as the FO): every step is reachable from the stepper, forward or back —
               validation shows on „Înainte”; US-237 AC-14: once paid, only the note and the confirmation stay open */
            const open = !active && !isSubmitted(d) && !(isPaid(d) && i < STEP_INDEX.plata);
            return `
              <li class="e-permits-fo-stepper__item${active ? " is-active" : ""}${done || (isSubmitted(d) && !active) ? " is-completed" : ""}"${active ? ' aria-current="step"' : ""} data-gh-step="${i}">
                <span class="e-permits-fo-stepper__connector" aria-hidden="true"></span>
                <span class="e-permits-fo-stepper__row" ${open ? `role="button" tabindex="0" aria-label="Deschide pasul ${n + 1}: ${esc(step.label)}" data-gh-goto="${i}" data-gh-free` : 'aria-disabled="true"'}>
                  <span class="e-permits-fo-stepper__number">
                    <span class="e-permits-fo-stepper__number-text">${n + 1}</span>
                    ${icon("checkmark-small", 16, "icon e-permits-fo-stepper__check")}
                  </span>
                  <span class="e-permits-fo-stepper__label">${esc(step.label)}</span>
                </span>
              </li>`;
          }).join("")}
        </ol>
      </nav>`;
  }
  function progressHtml(d) {
    const steps = visibleSteps(d).filter((s) => s.id !== "initiere" && s.id !== "intent");
    const n = steps.findIndex((s) => STEP_INDEX[s.id] === S.step) + 1;
    return `
      <div class="e-permits-fo-mobile-progress e-permits-gh__progress" aria-live="polite">
        <div class="e-permits-fo-mobile-progress__row">
          <span class="e-permits-fo-mobile-progress__label">${esc(STEPS[S.step].label)}</span>
          <span class="e-permits-fo-mobile-progress__count">Pasul ${n} din ${steps.length}</span>
        </div>
        <div class="e-permits-fo-mobile-progress__bar" aria-hidden="true"><svg class="e-permits-gh__progress-bar" width="100%" height="4" preserveAspectRatio="none"><rect class="e-permits-gh__progress-fill" width="${Math.round((n / steps.length) * 100)}%" height="4" rx="2"></rect></svg></div>
      </div>`;
  }
  /* the FO step footer (GEAPFormRender.stepFooterHtml, fo-02…fo-06): „Salvează ca schiță” left, the round
     back arrow + „Înainte →” right, at the end of the step content as in FO; the first step has no back */
  function footerHtml(d, opts = {}) {
    if (S.step <= STEP_INDEX.intent) return ""; /* the small modal and „Ce se solicită?” have none (as FO #intent) */
    if (opts.custom) return R().stepFooterHtml?.({ customHtml: opts.custom }) || "";
    const { next = "Înainte", nextAttrs = "data-gh-next", nextDisabled = false, back = true, hint = "" } = opts;
    const prevIndex = prevStepIndex(d, S.step);
    const prev = S.step > STEP_INDEX.identificare && back && prevIndex > STEP_INDEX.intent ? STEPS[prevIndex] : null;
    return `
      ${hint ? U().renderInfoNote?.(esc(hint)) || "" : ""}
      ${R().stepFooterHtml?.({
        /* „Salvează schița” lives in the window header (user 2026-10-16): the footer is back + „Înainte →” */
        backAttrs: prev ? "data-gh-prev" : "",
        backLabel: prev ? `Înapoi la ${prev.label}` : "",
        nextLabel: next, nextAttrs, nextDisabled, nextArrow: next === "Înainte"
      }) || ""}`;
  }
  function render({ focusTitle = true } = {}) {
    const d = S.cur;
    if (!d) return;
    if (S.step === 0) { closeSheet(); renderStart(); return; }
    const ov = ensureSheet();
    S.page = ov;
    if (d.step < S.step && !isSubmitted(d)) d.step = S.step;
    const panel = STEP_RENDER[STEPS[S.step].id](d);
    ov.querySelector("[data-gh-header]").innerHTML = sheetHeaderHtml(d);
    const intent = STEPS[S.step].id === "intent";
    ov.classList.toggle("is-intent", intent);
    ov.querySelector("[data-gh-body]").innerHTML = intent ? `
      <div class="e-permits-fo-intent e-permits-gh-intent__screen" data-gh-panel="intent">${panel}</div>` : `
      ${progressHtml(d)}
      <div class="e-permits-fo-request__inner e-permits-gh__inner">
        <aside class="e-permits-fo-request__sidebar e-permits-gh__sidebar" aria-label="Pașii cererii">${stepperHtml(d)}</aside>
        <form class="e-permits-fo-form e-permits-gh__form" novalidate data-gh-form>
          <div class="e-permits-fo-step-panel" data-gh-panel="${STEPS[S.step].id}">${panel}</div>
        </form>
      </div>`;
    openSheet();
    bindPanel();
    setHash(`#ghiseu/${encodeURIComponent(d.id)}/${STEPS[S.step].id}`);
    ov.querySelector("[data-gh-body]").scrollTop = 0;
    if (focusTitle) requestAnimationFrame(() => ov.querySelector("[data-gh-panel] h2[tabindex], [data-gh-panel] h1[tabindex]")?.focus({ preventScroll: true }));
  }
  /* the picker (US-233), two steps in the create-drawer step strip: 1 „Serviciu și solicitant” · 2
     „Procesul” — Continuă / Creează cererea creates the draft. The dialog keeps one height (no jump). */
  function renderStart({ focus = true } = {}) {
    const d = S.cur;
    const ov = ensureStart();
    S.page = ov;
    S.startFrom = d.id ? "sheet" : "list";
    const opening = !ov.classList.contains("is-active");
    ov.querySelector("[data-gh-start-title]").textContent = d.id ? `Inițiere cerere · ${d.nr}` : "Dosar nou";
    const sub = ov.querySelector("[data-gh-start-subtitle]");
    sub.hidden = false;
    sub.textContent = "Serviciul și solicitantul. Restul datelor se completează în cerere.";
    const body = ov.querySelector("[data-gh-start-body]");
    body.innerHTML = `<div class="e-permits-gh-start__form" data-gh-panel="initiere">${STEP_RENDER.initiere(d)}</div>`;
    body.scrollTop = 0;
    ov.querySelector("[data-gh-start-footer]").innerHTML = '<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-gh-start-cancel>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-gh-start-next>Continuă</button></div>';
    if (opening) { S.startHandled = false; window.__modal?.open?.(`#${START_ID}`); }
    bindPanel();
    setHash(d.id ? `#ghiseu/${encodeURIComponent(d.id)}/initiere` : "#ghiseu/nou");
    if (!focus) return;
    /* keyboard-first at the counter: the first empty choice gets the focus */
    requestAnimationFrame(() => {
      const target = d.service ? ov.querySelector("[data-gh-code]:not([readonly])") || ov.querySelector("[data-gh-start-next]") : ov.querySelector("#fo-gh-serviciu");
      target?.focus({ preventScroll: true });
    });
  }
  /* Continuă: the draft is created (or updated) and the request window opens — on „Ce vrei să soliciți?”
     while no process is chosen (or the holder changed), else back where the clerk came from */
  function continueStart() {
    const errs = validateInitiere({ picker: true });
    if (errs.length) { showErrors(errs); return; }
    voidIfChanged();
    S.startHandled = true;
    closeStart();
    S.step = S.cur.process ? Math.max(STEP_INDEX.identificare, S.returnStep || STEP_INDEX.identificare) : STEP_INDEX.intent;
    persist();
    render();
  }
  /* the act rows' „Inițiază un postproces ⌄” menus (FO markup; the open trigger keeps its ring) */
  function closeIntentMenus(except = null) {
    S.page?.querySelectorAll("[data-fo-intent-trigger][aria-expanded='true']").forEach((trigger) => {
      const menu = document.getElementById(trigger.getAttribute("aria-controls"));
      if (menu === except) return;
      trigger.setAttribute("aria-expanded", "false");
      if (menu) { menu.hidden = true; menu.classList.remove("is-open-up"); }
    });
  }
  function toggleIntentMenu(trigger) {
    const menu = document.getElementById(trigger.getAttribute("aria-controls"));
    if (!menu) return;
    const open = menu.hidden;
    closeIntentMenus(menu);
    menu.hidden = !open;
    menu.classList.remove("is-open-up");
    trigger.setAttribute("aria-expanded", String(open));
    if (!open) return;
    /* opens up when the scrolling body has no room below it */
    const box = trigger.closest(".modal-content, [data-gh-body]")?.getBoundingClientRect();
    const t = trigger.getBoundingClientRect();
    const h = menu.getBoundingClientRect().height;
    if (box && t.bottom + h > box.bottom && t.top - h > box.top) menu.classList.add("is-open-up");
    else menu.scrollIntoView({ block: "nearest" });
    menu.querySelector("[role='menuitem']:not([aria-disabled='true'])")?.focus({ preventScroll: true });
  }
  /* a choice on the intent screen starts the request at once (no intermediate selected state) */
  function startProcess(process, actId = null, type = "Emitere primară") {
    const d = S.cur;
    closeIntentMenus();
    d.process = process; d.act = actId; d.requestType = type;
    d.details.addressChanged = false;
    S.actCleared = false; S.dirty = true;
    /* demo prefill (user 2026-10-16): contact from MNotify, the service details, the required documents — the
       tester clicks „Înainte” up to Verificare (paper, olograf, MSign and the payment are one click each);
       ?prefill=0 starts empty */
    if (params.get("prefill") !== "0") fillDemo(d, STEP_INDEX.verificare);
    audit("Alegerea procesului", d, process === "post" ? `${type} · ${actById(d, actId)?.nr || ""}` : type);
    S.step = STEP_INDEX.identificare;
    persist();
    render();
  }
  function choosePostprocess(item) {
    const row = item.closest("[data-fo-intent-act]");
    if (!row || item.getAttribute("aria-disabled") === "true") return;
    startProcess("post", row.dataset.foIntentAct, item.dataset.foIntentPostprocess);
  }
  /* header ⋮ „Schimbă procesul”: back to the intent screen; what depends on the process is cleared
     (form, documents, verification) — asked first when there is any */
  function changeProcess() {
    const d = S.cur;
    const doIt = () => {
      COLLECT[STEPS[S.step].id]?.();
      d.process = ""; d.act = null; d.requestType = "";
      d.details = { values: {}, address: {}, subdivision: "", term: "", reductions: [] };
      d.docs = {}; d.review = { paper: null, olograf: null, signed: null, voided: [] }; d.payment = null;
      d.maxStep = STEP_INDEX.intent;
      audit("Schimbarea procesului", d, "Procesul anterior a fost anulat");
      S.step = STEP_INDEX.intent;
      persist();
      render();
    };
    if ((d.maxStep || 0) <= STEP_INDEX.identificare && !Object.keys(d.docs || {}).length) { doIt(); return; }
    U().askConfirm?.({
      title: "Schimbați procesul?",
      text: `Datele din „Detalii serviciu”, documentele și verificarea pentru „${d.requestType}” se pierd. Solicitantul și datele de contact rămân.`,
      confirmLabel: "Schimbă procesul",
      destructive: true
    }, doIt);
  }
  /* the picker hugs its content (max = viewport − 2 × 24): a change of height glides from the old one
     (Web Animations, nothing left inline; none with reduced motion) */
  function animateStartHeight(change) {
    const box = S.step === 0 ? document.querySelector(`#${START_ID}.is-active .modal`) : null;
    const before = box?.getBoundingClientRect().height || 0;
    change();
    if (!box || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const after = box.getBoundingClientRect().height;
    if (Math.abs(after - before) < 2) return;
    box.animate([{ height: `${before}px` }, { height: `${after}px` }], { duration: 220, easing: "cubic-bezier(0, 0, 0.2, 1)" });
  }
  /* partial redraws keep the rest of the step (and its typed values) */
  function redrawBlock(name) {
    const block = S.page?.querySelector(`[data-gh-block="${name}"]`);
    if (!block) return;
    const html = BLOCK_RENDER[name](S.cur);
    const holder = document.createElement("div");
    holder.innerHTML = html;
    const next = holder.firstElementChild;
    if (block.hidden && !next.hidden) next.classList.add("e-permits-gh__reveal");
    animateStartHeight(() => block.replaceWith(next));
    R().bind?.(next);
    BLOCK_BIND[name]?.(next);
  }
  const refreshChrome = () => {
    const d = S.cur;
    if (!d || S.step === 0) return;
    const ov = document.getElementById(SHEET_ID);
    if (!ov) return;
    ov.querySelector("[data-gh-header]").innerHTML = sheetHeaderHtml(d);
    const side = ov.querySelector(".e-permits-gh__sidebar");
    if (side) side.innerHTML = stepperHtml(d);
    const prog = ov.querySelector(".e-permits-gh__progress");
    if (prog) prog.outerHTML = progressHtml(d);
  };
  /* the FO step header (fo-02 „Date solicitant”: h1 only, no lead — desk notes go in an FO info note) */
  const stepHeader = (title) => `
    <header class="e-permits-fo-form__header">
      <h1 tabindex="-1">${esc(title)}</h1>
    </header>`;

  /* ================================================================ step 1 · Inițiere (US-233) */
  const DOWN_MSG = "Registrul de stat nu răspunde acum. Completați datele manual.";
  const NOT_FOUND_MSG = "Persoana nu a fost găsită în registrul de stat.";
  const mconnectDown = () => params.get("mconnect") === "0";

  /* the FO search sizes: library Search input Medium (40) on desktop, Large (48) at ≤720 */
  const searchSize = () => (window.matchMedia("(max-width: 720px)").matches ? "large" : "medium");
  /* IDNP / IDNO = the „Cod cadastral” search input with its submit, without the leading magnifier (user
     2026-10-15: plain code inputs, not search fields): the arrow asks
     MConnect (disabled until 13 digits; Enter = the arrow, js/search.js), the spinner while it answers,
     then the search clear × alone (= change the code). Never on typing or blur. */
  function codeGroupHtml(kind, d) {
    const conf = {
      company: { code: "IDNO", value: d.company.idno, state: d.company.state, targets: [["name", "Denumirea companiei", 6, d.company.denumire, "Se completează din RSUD după IDNO"]] },
      applicant: { code: "IDNP", value: d.applicant.idnp, state: d.applicant.state, targets: [["last", "Nume", 3, d.applicant.nume, "Din RSP, după IDNP"], ["first", "Prenume", 3, d.applicant.prenume, "Din RSP, după IDNP"]] },
      rep: { code: "IDNP", value: d.rep.idnp, state: d.rep.state, targets: [["last", "Nume reprezentant", 3, d.rep.nume, "Din RSP, după IDNP"], ["first", "Prenume reprezentant", 3, d.rep.prenume, "Din RSP, după IDNP"]] }
    }[kind];
    const id = `gh-${kind}`;
    const label = kind === "company" ? "IDNO" : kind === "rep" || d.personType === "PJ" ? "IDNP reprezentant" : "IDNP";
    const found = conf.state === "found";
    const manual = conf.state === "manual";
    const codeLocked = found || manual;
    return `
      <div class="e-permits-fo-field-group" data-gh-lookup="${kind}">
        <div class="e-permits-fo-field e-permits-fo-field--span-6">
          <div class="e-permits-fo-field__label-counter"><label for="${id}">${esc(label)} ${req()}</label><span class="e-permits-fo-field__counter" data-fo-digits-counter>${(conf.value || "").length}/13</span></div>
          <div class="search-input ${searchSize()} rectangular e-permits-workplace__search e-permits-list-search e-permits-list-search--fill e-permits-fo-cadastral-search e-permits-gh-lookup${codeLocked ? " has-value is-ready is-locked" : ""}" data-fo-search-size data-gh-lookup-box>
            <input class="input" id="${id}" type="text" inputmode="numeric" maxlength="13" placeholder="Introdu ${conf.code}" autocomplete="off" aria-describedby="${id}-hint" aria-required="true" value="${esc(conf.value || "")}"${codeLocked ? " readonly" : ""} data-fo-digits data-fo-registry-code data-gh-code="${kind}">
            <div class="btn-group">
              <span class="spinner spinner--extra-small spinner--brand" aria-hidden="true"></span>
              ${codeLocked
                ? `<button type="button" class="btn-icon clear" aria-label="Schimbă ${esc(conf.code)}-ul" data-tooltip-label="Schimbă ${esc(conf.code)}-ul" data-gh-reset="${kind}"><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-cross-small"></use></svg></button>`
                : `<button type="button" class="btn btn-primary btn-search" aria-label="Caută ${esc(conf.code)}-ul în registru" data-tooltip-label="Caută ${esc(conf.code)}-ul în registru"${(conf.value || "").length === 13 ? "" : " disabled"} data-gh-search="${kind}"><svg class="icon medium" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-arrow-left"></use></svg></button>`}
            </div>
          </div>
          <p class="e-permits-fo-field__hint" id="${id}-hint" data-fo-field-hint>${found ? `Preluat din ${kind === "company" ? "RSUD" : "RSP"} prin MConnect` : manual ? "Registrul nu a răspuns · introdus manual" : ""}</p>
        </div>
        ${conf.targets.map(([key, tLabel, span, value, ph]) => `
          <div class="e-permits-fo-field e-permits-fo-field--span-${span}">
            <label for="${id}-${key}">${esc(tLabel)}${manual ? ` ${req()}` : ""}</label>
            <div class="e-permits-fo-input${manual ? "" : " is-filled is-readonly"}">
              <input id="${id}-${key}" type="text"${manual ? ` placeholder="${key === "name" ? "Introdu denumirea" : key === "last" ? "Introdu numele" : "Introdu prenumele"}" aria-required="true"` : ` readonly tabindex="-1" placeholder="${esc(ph)}"`} value="${esc(value || "")}" data-fo-registry-target="${key}" data-gh-target="${kind}:${key}">
              ${found && value ? icon("checkmark-small") : ""}
            </div>
            ${manual ? `<p class="e-permits-fo-field__hint">Introdus manual · se verifică la examinare</p>` : ""}
          </div>`).join("")}
        <p class="u-visually-hidden" role="status" aria-live="polite" data-fo-registry-live></p>
      </div>`;
  }
  function basisHtml(d) {
    const b = S.step === 0 ? null : basisOf(d);
    if (!b || b.kind === "self") return '<div data-gh-block="basis" class="e-permits-gh__basis" hidden></div>';
    const filer = d.personType === "PJ" ? fullName(d.applicant) : fullName(d.rep);
    const holder = holderName(d);
    let body = "";
    /* one notice per outcome (user 2026-10-16): title + text in the library notice; RSUD / MPower = success,
       Procură = info */
    if (b.kind === "rsud") body = U().renderNotice?.("success", `<strong>Temeiul reprezentării: administrator în RSUD.</strong> ${esc(filer)} este administratorul ${esc(holder)}, fără procură. Sursa: RSUD prin MConnect.`) || "";
    else if (b.kind === "mpower") body = U().renderNotice?.("success", `<strong>Temeiul reprezentării: împuternicire MPower.</strong> Nr. ${esc(b.nr)}, valabilă până la ${esc(longDate(b.until))}. ${esc(filer)} reprezintă ${esc(holder)}, fără procură.`) || "";
    else {
      /* AC-21 error = the FO way: message under the group, only the checkbox control in the library error
         style (checkbox--error) — no border around the option */
      const option = U().renderCheckOption?.({ label: "Prin procură", required: true, checked: d.procura, attrs: 'data-gh-procura aria-describedby="gh-err-procura"' }) || "";
      const procuraOption = d.procura ? option : option.replace('class="checkbox ', 'class="checkbox checkbox--error ');
      body = `
        ${U().renderNotice?.("warning", b.manual
          ? "<strong>Legătura nu se poate confirma electronic</strong> cât timp registrul de stat nu răspunde. Verificați procura pe hârtie prezentată de reprezentant."
          : `<strong>Legătura nu este confirmată electronic.</strong> ${esc(filer)} nu este ${d.personType === "PJ" ? "administrator în RSUD și nu are" : "împuternicit în MPower de"} ${d.personType === "PJ" ? `împuternicire MPower pentru ${esc(holder)}` : esc(holder)}. Verificați procura pe hârtie prezentată de reprezentant.`) || ""}
        <div class="e-permits-check-options e-permits-gh__procura">
          ${procuraOption}
        </div>
        ${d.procura ? errSlot("procura") : `<span class="message message--inline message--error e-permits-fo-field__error" id="gh-err-procura" data-gh-err="procura" role="alert">${ERR_ICON}<span>Legătura nu este confirmată electronic. Bifați «Prin procură», după verificarea procurii pe hârtie.</span></span>`}
        ${d.procura ? U().renderNotice?.("info", `<strong>Temeiul reprezentării: Procură.</strong> Copia scanată a procurii se atașează la pasul «Documente însoțitoare».${(d.maxStep || 0) >= STEP_INDEX.documente ? ` <a class="link link-primary link-sm" href="#" data-gh-goto="${STEP_INDEX.documente}">Mergi la Documente însoțitoare&nbsp;→</a>` : ""}`) || "" : ""}`;
    }
    return `<div data-gh-block="basis" class="e-permits-gh__basis">${body}</div>`;
  }
  /* user rule: „Tip persoană” is never empty — PF by default, else what the service allows */
  function normalizeType(d) {
    const types = applicantTypesOf(d.service);
    if (!types.includes(d.personType)) d.personType = types.includes("PF") ? "PF" : types[0] || "PF";
  }
  const filled = (slot, keys) => Boolean(slot.state) && (slot.state !== "manual" || keys.every((k) => slot[k]));
  const isIdentified = (d) => (d.personType === "PJ" ? filled(d.company, ["denumire"]) && filled(d.applicant, ["nume", "prenume"]) : filled(d.applicant, ["nume", "prenume"]));
  function applicantBlockHtml(d) {
    return S.step === 0 ? applicantPickerHtml(d) : applicantFlowHtml(d);
  }
  /* the picker: who (US-233 AC-07…14) — type, then the codes with the inline MConnect lookup; the
     FO lookup row is the result card (skeleton while MConnect answers, read-only names, one flash) */
  function applicantPickerHtml(d) {
    if (!d.service) return '<div data-gh-block="applicant" hidden></div>';
    normalizeType(d);
    const types = applicantTypesOf(d.service);
    const typeField = types.length > 1
      ? R().fieldHtml({ id: "gh-tip", type: "segment", label: "Tip persoană", span: 12, value: d.personType, options: [{ value: "PF", label: "Persoană fizică", icon: "icon-person-filled" }, { value: "PJ", label: "Persoană juridică", icon: "icon-suitcase-filled" }] }).replace("data-fo-segment", "data-fo-segment data-gh-type")
      : readonlyField({ id: "gh-tip-fix", label: "Tip persoană", value: types[0] === "PJ" ? "Persoană juridică" : "Persoană fizică", span: 6, hint: "Singurul tip de solicitant configurat pentru serviciu." });
    const rows = d.personType === "PJ" ? `${codeGroupHtml("company", d)}${codeGroupHtml("applicant", d)}` : codeGroupHtml("applicant", d);
    return `
      <div data-gh-block="applicant">
        ${section("Solicitantul", `<div class="e-permits-fo-form__section-body">${typeField}${rows}</div>`, { id: "gh-applicant-title" })}
      </div>`;
  }
  /* the request's first step: the identity as FO role cards („Schimbă” = the picker), the representative
     and the basis (AC-15…22) */
  function applicantFlowHtml(d) {
    const manualTag = (slot) => (slot.state === "manual" ? tagHtml("Introdus manual", "warning") : "");
    const holder = d.personType === "PJ"
      ? roleCard({ name: d.company.denumire, idLabel: "IDNO", idValue: d.company.idno, pj: true, tag: manualTag(d.company), change: 'data-gh-goto="0" aria-label="Schimbă solicitantul"' })
      : roleCard({ name: fullName(d.applicant), idLabel: "IDNP", idValue: d.applicant.idnp, tag: manualTag(d.applicant), change: 'data-gh-goto="0" aria-label="Schimbă solicitantul"' });
    const filer = d.personType === "PJ" ? roleCard({ name: fullName(d.applicant), idLabel: "IDNP", idValue: d.applicant.idnp, tag: manualTag(d.applicant) }) : "";
    const rep = d.personType === "PF" ? `
      <div class="e-permits-fo-form__section-body">
        <div class="e-permits-fo-field e-permits-fo-field--span-12">
          <div class="e-permits-check-options">${U().renderCheckOption?.({ label: "Cererea se depune de un reprezentant", checked: d.rep.on, attrs: "data-gh-rep-toggle" }) || ""}</div>
        </div>
        ${d.rep.on ? codeGroupHtml("rep", d) : ""}
      </div>` : "";
    return `
      <div data-gh-block="applicant">
        <section class="e-permits-fo-form__roles${filer ? "" : " is-single"}" aria-label="Solicitant">
          <div class="e-permits-fo-form__roles-grid">
            <div class="e-permits-fo-form__role-group">${roleTitle("Solicitant")}${holder}</div>
            ${filer ? `<div class="e-permits-fo-form__role-group">${roleTitle("Persoana care depune")}${filer}</div>` : ""}
          </div>
        </section>
        ${section(d.personType === "PJ" ? "Temeiul reprezentării" : "Reprezentantul", `${rep}${basisHtml(d)}`, { id: "gh-rep-title", desc: d.personType === "PJ" ? "Legătura dintre persoana care depune și companie: RSUD, MPower sau procură verificată la ghișeu." : "Doar dacă cererea se depune printr-un reprezentant al solicitantului." })}
      </div>`;
  }
  /* every post-process the service knows (Setări › Postprocese pe acte permisive + Contestație) */
  function serviceTypes(d) {
    const desk = deskOf(d.service) || {};
    const all = [...new Set(Object.values(desk.postprocese || {}).flat())];
    if (desk.contestabil) all.push("Contestație");
    return all;
  }
  /* why a post-process is not offered for this permit (tooltip of the disabled option, AC-28/31/32) */
  function ineligibleReason(d, act, type) {
    const desk = deskOf(d.service) || {};
    if (type === "Contestație") {
      if (!desk.contestabil) return "Serviciul nu este contestabil.";
      if (act.kind === "act" && act.status !== "valabil") return "Contestația se inițiază din decizie sau din actul valabil.";
      return `Termenul admisibil de contestare (${desk.termenContestare} de zile) a expirat.`;
    }
    if (act.kind === "decizie") return "Din decizie se inițiază doar contestația.";
    return `Nu se inițiază pentru un act cu statutul „${(ACT_TONE[act.status] || [act.status])[0]}”.`;
  }
  /* a permit stays chosen only while it is still the holder's (holder / service changed → voided) */
  function normalizeProcess(d) {
    if (d.process === "post" && (!d.act || !actById(d, d.act))) { d.process = ""; d.requestType = ""; d.act = null; }
  }
  const PP_ICON = { Prelungire: "icon-rotate-arrow", Reperfectare: "icon-edit", "Emitere duplicat": "icon-copy", "Suspendare valabilitate": "icon-pause", "Reluarea valabilității": "icon-rotate-arrow", Retragere: "icon-cross-small", "Contestație": "icon-flag" };
  /* one act / decision = the shared FO act row (GEAPFormRender.actRowHtml): every post-process of the
     service in its menu, the ones the status / term does not allow disabled with the reason (AC-28/31/32) */
  function actRowHtml(d, act) {
    const allowed = postprocessesOf(d, act);
    const items = serviceTypes(d).map((t) => ({ id: t, label: t, icon: PP_ICON[t], disabled: !allowed.includes(t), reason: allowed.includes(t) ? "" : ineligibleReason(d, act, t) }));
    return R().actRowHtml?.({
      id: act.id, name: act.name, number: act.nr, status: act.status, statusLabel: (ACT_TONE[act.status] || [act.status])[0],
      validUntil: act.valabilPana, subdivision: act.subdiviziune,
      meta: act.kind === "decizie" ? [act.nr, `${act.decizie} · emisă acum ${plural(act.emisZileInUrma, "zi", "zile")}`, act.subdiviziune] : undefined
    }, {
      menuId: `gh-act-menu-${act.id}`, items,
      pendingTitle: act.pending ? `${act.pending.type} în curs` : "",
      pendingText: act.pending ? `· dosar ${act.pending.dossier}. Un alt postproces se inițiază după finalizarea acestuia.` : ""
    }) || "";
  }
  /* the request window's first screen (US-233 AC-24…32, user 2026-10-15) = the FO „Ce vrei să soliciți?”
     (GEAPFormRender.intentHtml, shared with FO #intent): „Solicitant <name> · Schimbă” (the small modal),
     „Solicitare nouă”, „sau”, the holder's acts for the service with the post-process menus; no stepper */
  function stepIntent(d) {
    normalizeProcess(d);
    const acts = actsOf(d);
    return `
      <div class="e-permits-fo-intent__inner e-permits-gh-intent" data-gh-intent>
        ${R().intentHtml?.({
          title: "Ce se solicită?",
          titleId: "gh-intent-title",
          subjectLabel: "Solicitant",
          subjectName: holderName(d),
          changeAttrs: 'data-gh-goto="0" aria-label="Schimbă solicitantul sau serviciul"',
          noticeHtml: S.actCleared ? U().renderNotice?.("info", "Serviciul sau solicitantul s-a schimbat: procesul ales anterior a fost anulat. Alegeți din nou.") || "" : "",
          newRequest: { title: "Solicitare nouă", text: "Cerere pentru un act permisiv nou (emitere primară)" },
          newAttrs: "data-gh-intent-new",
          actsTitle: "Acte emise pentru acest serviciu",
          actsId: "gh-acts-title",
          rowsHtml: acts.map((act) => actRowHtml(d, act)).join(""),
          emptyTitle: "Solicitantul nu are acte emise pentru acest serviciu",
          emptyAttrs: "data-gh-acts-empty"
        }) || ""}
      </div>`;
  }
  /* the small „Dosar nou” modal (user 2026-10-15): one screen — service + applicant */
  function stepInitiere(d) {
    const services = deskServices();
    const svcField = R().fieldHtml({
      id: "gh-serviciu", type: "combobox", label: "Denumirea serviciului", required: true, span: 12,
      placeholder: "Alege serviciul", searchLabel: "Caută după denumire",
      emptyTitle: "Nu există servicii care să corespundă căutării.", emptyText: "Caută după o parte din denumire.",
      options: services.map((s) => ({ code: s.code, label: s.title })),
      float: true
    });
    return `
      <section class="e-permits-fo-form__section" aria-label="Serviciul">
        <div class="e-permits-fo-form__section-body" data-gh-service>${svcField}${errSlot("serviciu")}</div>
      </section>
      ${applicantBlockHtml(d)}`;
  }
  /* the request's first step „Solicitant” (US-233 identification part) */
  function stepIdentificare(d) {
    normalizeType(d);
    return `
      ${stepHeader("Date solicitant")}
      ${applicantBlockHtml(d)}
      ${contactSectionHtml(d)}
      ${footerHtml(d)}`;
  }
  function bindIdentificare(panel) {
    BLOCK_BIND.applicant(panel.querySelector('[data-gh-block="applicant"]'));
  }
  /* a new holder voids the permit + post-process chosen for the previous one */
  function holderTouched(kind) {
    const d = S.cur;
    const holderKind = d.personType === "PJ" ? "company" : "applicant";
    if (kind !== holderKind && kind !== "type") return;
    clearChoice(d);
  }
  /* the step-2 choice belongs to one service + holder: a change voids it (notice in step 2) */
  function clearChoice(d) {
    if (d.process) S.actCleared = true;
    d.process = ""; d.requestType = ""; d.act = null;
  }
  function bindInitiere(panel) {
    const d = S.cur;
    const root = panel.querySelector("[data-fo-caem]");
    if (root && d.service) {
      const opt = root.querySelector(`.e-permits-fo-caem__option[data-code="${d.service}"]`);
      const value = root.querySelector("[data-fo-caem-value]");
      if (opt && value) {
        opt.classList.add("is-selected"); opt.setAttribute("aria-selected", "true");
        value.textContent = `${opt.dataset.code} • ${opt.dataset.label}`; value.title = value.textContent;
        value.classList.remove("e-permits-fo-caem__value--placeholder");
      }
    }
    root?.addEventListener("change", () => {
      const code = root.querySelector(".e-permits-fo-caem__option.is-selected")?.dataset.code || "";
      if (code === d.service) return;
      d.service = code;
      normalizeType(d);
      clearChoice(d);
      clearErr("serviciu");
      S.dirty = true;
      redrawBlock("applicant");
      requestAnimationFrame(() => S.page.querySelector('[data-gh-block="applicant"] [data-gh-code]:not([readonly])')?.focus());
    });
  }
  const BLOCK_RENDER = { applicant: applicantBlockHtml, basis: basisHtml };
  const BLOCK_BIND = {
    applicant(block) {
      if (!block) return;
      block.querySelectorAll("[data-gh-lookup]").forEach((group) => bindLookup(group));
      block.querySelector("[data-gh-type]")?.addEventListener("change", (event) => {
        const v = event.currentTarget.querySelector(".segment-item.is-selected")?.dataset.value || "";
        if (v === S.cur.personType) return;
        collectInitiere();
        S.cur.personType = v; S.cur.rep.on = false; S.cur.procura = false;
        holderTouched("type");
        S.dirty = true;
        redrawBlock("applicant"); refreshChrome();
        S.page.querySelector("[data-gh-type] .segment-item.is-selected")?.focus();
      });
    }
  };

  /* registry lookups: the FO helper (skeleton → read-only fill + flash; not found → field error) */
  function bindLookup(group) {
    const kind = group.dataset.ghLookup;
    const input = group.querySelector("[data-fo-registry-code]");
    if (!input || input.readOnly || !R().createRegistryLookup) return;
    const isCompany = kind === "company";
    const lookup = R().createRegistryLookup({
      input,
      hint: group.querySelector("[data-fo-field-hint]"),
      hintText: "",
      targets: [...group.querySelectorAll("[data-fo-registry-target]")].map((target) => ({ input: target, value: (record) => record[target.dataset.foRegistryTarget] || "" })),
      live: group.querySelector("[data-fo-registry-live]"),
      find: (code) => {
        if (mconnectDown()) return null;
        if (isCompany) { const c = registryCompany(code); return c ? { name: c.denumire } : null; }
        const p = registryPerson(code); return p ? { last: p.nume, first: p.prenume } : null;
      },
      loadingText: isCompany ? "Se caută compania în RSUD prin MConnect…" : "Se caută persoana în RSP prin MConnect…",
      notFound: NOT_FOUND_MSG,
      foundText: (record) => (isCompany ? `Denumirea companiei a fost preluată din RSUD: ${record.name}.` : `Numele a fost preluat din RSP: ${record.last} ${record.first}.`),
      setError: (inp, msg) => R().setFieldError?.(inp, msg && mconnectDown() ? DOWN_MSG : msg)
    });
    S.lookups[kind] = lookup;
    const box = group.querySelector("[data-gh-lookup-box]");
    const submit = group.querySelector("[data-gh-search]");
    /* typing only edits the code: the arrow is enabled at 13 digits; a shorter code drops an answer */
    input.addEventListener("input", () => {
      if (input.getAttribute("aria-invalid") === "true") R().setFieldError?.(input, "");
      const digits = input.value.replace(/\D/g, "").slice(0, 13);
      if (digits !== input.value) input.value = digits;
      if (lookup.code && digits !== lookup.code) lookup.cancel();
      if (submit) submit.disabled = digits.length !== 13 || Boolean(lookup.pending);
    });
    /* the explicit search (the arrow, or Enter → js/search.js clicks it) */
    submit?.addEventListener("click", () => {
      const code = input.value.replace(/\D/g, "");
      if (code.length !== 13 || lookup.pending) return;
      lookup.run(code);
      audit("Solicitare date MConnect", S.cur, `${isCompany ? "RSUD · IDNO" : "RSP · IDNP"} ${code}`, { persoana: code });
      box?.classList.add("loading");
      submit.disabled = true;
      lookup.pending.then(() => {
        box?.classList.remove("loading");
        submit.disabled = false;
        if (lookup.code === code) afterLookup(kind, lookup);
      });
    });
  }
  function afterLookup(kind, lookup) {
    const d = S.cur;
    const slot = kind === "company" ? d.company : kind === "rep" ? d.rep : d.applicant;
    if (kind === "company") slot.idno = lookup.code; else slot.idnp = lookup.code;
    holderTouched(kind);
    if (lookup.record) {
      slot.state = "found";
      if (kind === "company") slot.denumire = lookup.record.name;
      else { slot.nume = lookup.record.last; slot.prenume = lookup.record.first; }
    } else if (mconnectDown()) {
      slot.state = "manual";
    } else {
      slot.state = "";
      return;
    }
    S.dirty = true;
    if (needsProcura(d) === false) d.procura = false;
    /* lock the code (and open the names when the registry did not answer) */
    redrawBlock("applicant");
    refreshChrome();
    if (slot.state === "found") {
      const group = S.page.querySelector(`[data-gh-lookup="${kind}"]`);
      group?.querySelectorAll(".e-permits-fo-input.is-readonly").forEach((wrap) => { void wrap.offsetWidth; wrap.classList.add("is-srre-new"); wrap.addEventListener("animationend", () => wrap.classList.remove("is-srre-new"), { once: true }); });
    } else {
      S.page.querySelector(`[data-gh-target="${kind}:${kind === "company" ? "name" : "last"}"]`)?.focus();
      const code = S.page.querySelector(`[data-gh-code="${kind}"]`);
      if (code) R().setFieldError?.(code, DOWN_MSG);
    }
  }
  function collectInitiere() {
    const d = S.cur;
    ["company", "applicant", "rep"].forEach((kind) => {
      const slot = kind === "company" ? d.company : kind === "rep" ? d.rep : d.applicant;
      const code = S.page.querySelector(`[data-gh-code="${kind}"]`);
      if (!code) return;
      if (!slot.state) { if (kind === "company") slot.idno = code.value; else slot.idnp = code.value; }
      if (slot.state === "manual") {
        if (kind === "company") slot.denumire = S.page.querySelector('[data-gh-target="company:name"]')?.value.trim() || "";
        else { slot.nume = S.page.querySelector(`[data-gh-target="${kind}:last"]`)?.value.trim() || ""; slot.prenume = S.page.querySelector(`[data-gh-target="${kind}:first"]`)?.value.trim() || ""; }
      }
    });
  }
  function validateInitiere({ picker = S.step === 0 } = {}) {
    collectInitiere();
    const d = S.cur;
    const errs = [];
    if (picker && !d.service) errs.push({ key: "serviciu", focus: "#fo-gh-serviciu", msg: REQUIRED });
    {
      const codeErr = (kind, value, state, len = 13) => {
        if (!value) return REQUIRED;
        if (value.length !== len) return `${kind === "company" ? "IDNO" : "IDNP"}-ul are 13 cifre.`;
        if (!state) return S.lookups[kind]?.code === value ? (mconnectDown() ? DOWN_MSG : NOT_FOUND_MSG) : `Căutați ${kind === "company" ? "IDNO" : "IDNP"}-ul în registru.`;
        return "";
      };
      const check = (kind, slot, code) => {
        const msg = codeErr(kind, code, slot.state);
        if (msg) { errs.push({ input: `[data-gh-code="${kind}"]`, msg }); return; }
        if (slot.state === "manual") {
          const keys = kind === "company" ? [["name", slot.denumire]] : [["last", slot.nume], ["first", slot.prenume]];
          keys.forEach(([key, v]) => { if (!v) errs.push({ input: `[data-gh-target="${kind}:${key}"]`, msg: REQUIRED }); });
        }
      };
      if (picker && d.service) {
        if (d.personType === "PJ") { check("company", d.company, d.company.idno); check("applicant", d.applicant, d.applicant.idnp); }
        else check("applicant", d.applicant, d.applicant.idnp);
      }
      if (!picker && d.personType === "PF" && d.rep.on) check("rep", d.rep, d.rep.idnp);
      /* AC-21: no electronic link and no „Prin procură” (in the request's first step) */
      if (!picker && !errs.length && needsProcura(d) && !d.procura) errs.push({ key: "procura", focus: "[data-gh-procura]", msg: "Legătura nu este confirmată electronic. Bifați «Prin procură», după verificarea procurii pe hârtie." });
    }
    return errs;
  }

  /* ================================================================ step 2 · Date solicitant (US-234) */
  /* fo-01 „Date de contact” (US-234): MNotify values = the FO verified read-only fields + the FO MNotify
     notice; a missing value = the FO editable field (guest-form placeholders, no hint) */
  function loadContact(d) {
    if (d.contact.phoneSrc) return;
    const mn = S.data.mnotify || {};
    const c = mn[holderCode(d)] || mn[d.applicant.idnp] || {};
    d.contact = { phone: c.phone || "", email: c.email || "", phoneSrc: c.phone ? "mnotify" : "", emailSrc: c.email ? "mnotify" : "" };
  }
  function contactSectionHtml(d) {
    loadContact(d);
    const phoneRO = d.contact.phoneSrc === "mnotify";
    const emailRO = d.contact.emailSrc === "mnotify";
    const phoneField = phoneRO
      ? `<div class="e-permits-fo-field e-permits-fo-field--span-6"><label>Telefon</label>${R().verifiedPhoneHtml?.(formatPhone(d.contact.phone)) || ""}</div>`
      : R().fieldHtml({ id: "gh-phone", type: "phone", label: "Telefon", required: true, span: 6, value: d.contact.phone ? formatPhone(d.contact.phone) : "", placeholder: "60 999 999" });
    const emailField = emailRO
      ? `<div class="e-permits-fo-field e-permits-fo-field--span-6"><label>Email</label>${R().verifiedValueHtml?.(d.contact.email) || ""}</div>`
      : R().fieldHtml({ id: "gh-email", type: "email", label: "Email", span: 6, value: d.contact.email, placeholder: "ion.popescu@mnotify.gov.md" });
    return `
      <section class="e-permits-fo-form__section" aria-labelledby="gh-contact-title">
        <h2 id="gh-contact-title">Date de contact</h2>
        <div class="e-permits-fo-form__section-body">${phoneField}${emailField}</div>
        ${phoneRO || emailRO ? R().mnotifyInfoHtml?.() || "" : ""}
      </section>`;
  }
  const formatPhone = (raw) => { const v = String(raw || "").replace(/\D/g, "").replace(/^373/, ""); return v.length === 8 ? `${v.slice(0, 2)} ${v.slice(2, 5)} ${v.slice(5)}` : v; };
  function collectSolicitant() {
    const d = S.cur;
    const before = JSON.stringify(d.contact);
    if (d.contact.phoneSrc !== "mnotify") { const v = S.page.querySelector("#fo-gh-phone")?.value || ""; d.contact.phone = v.replace(/\D/g, ""); d.contact.phoneSrc = "manual"; }
    if (d.contact.emailSrc !== "mnotify") { d.contact.email = (S.page.querySelector("#fo-gh-email")?.value || "").trim(); d.contact.emailSrc = "manual"; }
    if (JSON.stringify(d.contact) !== before) audit("Modificare date de contact", d, "Telefon / email pentru notificări");
  }
  function validateSolicitant() {
    collectSolicitant();
    const d = S.cur;
    const errs = [];
    if (d.contact.phoneSrc !== "mnotify") {
      /* demo rule (user 2026-10-16, easy testing): any number with ≥ 6 digits passes (spaces, +, -, () ignored);
         empty or non-numeric = the FO error */
      const raw = d.contact.phone.trim();
      const digits = raw.replace(/[\s+\-()]/g, "");
      if (!raw) errs.push({ input: "#fo-gh-phone", msg: REQUIRED });
      else if (!/^\d{6,}$/.test(digits)) errs.push({ input: "#fo-gh-phone", msg: "Introdu un număr de telefon valid." });
    }
    if (d.contact.emailSrc !== "mnotify" && d.contact.email) {
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(d.contact.email)) errs.push({ input: "#fo-gh-email", msg: "Adresa email nu este validă." });
      else if (/\.ru$/i.test(d.contact.email)) errs.push({ input: "#fo-gh-email", msg: "Adresele de email cu domeniul .ru nu sunt acceptate." });
    }
    return errs;
  }

  /* ================================================================ step 3 · Detalii serviciu (US-235) */
  function subdivisionBlockHtml(d) {
    const subs = deskOf(d.service)?.subdiviziuni || [];
    const form = formOf(d);
    if (subs.length <= 1) return '<div data-gh-block="subdivision" hidden></div>'; /* AC-07: one subdivision → filled, not shown */
    const act = d.act ? actById(d, d.act) : null;
    const raion = d.details.address?.district || "";
    let field;
    if (act && !d.details.addressChanged) {
      field = readonlyField({ id: "gh-subdiv", label: "Procesat de subdiviziunea", value: act.subdiviziune, span: 12, required: true, hint: `Subdiviziunea care a emis ${act.kind === "decizie" ? "decizia" : "actul permisiv"} ${act.nr}.` });
    } else if (form.address && raion && subdivisionFor(d)) {
      field = readonlyField({ id: "gh-subdiv", label: "Procesat de subdiviziunea", value: subdivisionFor(d), span: 12, required: true, hint: `Completată după raionul adresei obiectului autorizat (${raion}).` });
    } else {
      const hint = raion ? `Raionul ${raion} nu se află în localitățile subordonate ale niciunei subdiviziuni: alegeți subdiviziunea.` : "Obiectul nu are adresă: alegeți subdiviziunea de examinare.";
      field = R().fieldHtml({ id: "gh-subdiv", type: "select", label: "Procesat de subdiviziunea", required: true, span: 12, placeholder: "Selectează subdiviziunea", value: subs.some((s) => s.name === d.details.subdivision) ? d.details.subdivision : "", options: subs.map((s) => s.name), hint }) + errSlot("subdiv");
    }
    return `<div data-gh-block="subdivision" class="e-permits-gh__block">${field}</div>`;
  }
  function termBlockHtml(d) {
    const terms = termsOf(d);
    const desk = deskOf(d.service) || {};
    if (terms.length <= 1) return '<div data-gh-block="term" hidden></div>'; /* AC-15: one term → applied, not shown */
    const feeOf = (t) => (t.fees || []).reduce((s, k) => s + (desk.fees?.[k]?.amount || 0), 0);
    const cur = termOf(d);
    return `
      <div data-gh-block="term" class="e-permits-gh__block">
        ${R().fieldHtml({ id: "gh-term", type: "select", label: "Termen de examinare", required: true, span: 12, placeholder: "Selectează termenul", value: cur?.label || "", options: terms.map((t) => t.label), hint: terms.map((t) => `${t.label}: ${feeOf(t) ? mdl(feeOf(t)) : "fără taxă"}`).join(" · ") })}
        ${errSlot("term")}
      </div>`;
  }
  function stepDetalii(d) {
    const form = formOf(d);
    const act = d.act ? actById(d, d.act) : null;
    const desk = deskOf(d.service) || {};
    const fields = form.fields.map((f) => R().fieldHtml({ ...f, value: d.details.values[f.key] || "" })).join("");
    const address = form.address ? R().fieldHtml({ id: "gh-adresa", type: "cascade-address", span: 12, districts: R().districts?.() || [], cadastral: { visible: false } }) : "";
    const reds = reductionsOf(d);
    const redHtml = reds.length ? section("Reduceri aplicate", `
      <div class="e-permits-fo-form__section-body e-permits-fo-form__section-body--single">
        <div class="e-permits-check-options e-permits-gh__reductions" role="group" aria-label="Reduceri aplicate">
          ${reds.map((r) => U().renderCheckOption?.({ label: `${r.label} — ${r.type === "procent" ? `${r.value}%` : mdl(r.value)} din „${desk.fees?.[r.fee]?.name || ""}”`, checked: d.details.reductions.includes(r.id), attrs: `data-gh-reduction="${esc(r.id)}"` }) || "").join("")}
        </div>
        <p class="e-permits-fo-field__hint">Fără bifă = „Fără reduceri”. Valoarea și tipul reducerii vin din tarif și nu se modifică; bifați doar reducerile confirmate de documentele prezentate.</p>
      </div>`, { id: "gh-red-title" }) : "";
    return `
      ${stepHeader("Detalii serviciu")}${act ? U().renderInfoNote?.(`Postproces „${esc(d.requestType)}” pe ${esc(act.nr)}: datele actului sunt precompletate.`) || "" : ""}
      ${section(form.address ? "Obiectul autorizat" : "Produsul", `<div class="e-permits-fo-form__section-body">${fields}${form.address ? address : ""}</div>`, { id: "gh-obj-title" })}
      ${section("Examinare", `<div class="e-permits-fo-form__section-body">${subdivisionBlockHtml(d)}${termBlockHtml(d)}${(desk.subdiviziuni || []).length <= 1 && termsOf(d).length <= 1 ? `<div class="e-permits-fo-field e-permits-fo-field--span-12">${U().renderInfoNote?.(`Serviciul se examinează de ${esc(desk.subdiviziuni?.[0]?.name || "subdiviziunea autorității")}, în termenul unic de ${esc(termsOf(d)[0]?.label || "—")}.`) || ""}</div>` : ""}</div>`, { id: "gh-exam-title" })}
      ${redHtml}
      ${footerHtml(d)}`;
  }
  function bindDetalii(panel) {
    const d = S.cur;
    const cascade = panel.querySelector("[data-fo-cascade-address]");
    const fillAddress = () => {
      const a = d.details.address || {};
      const search = cascade?.querySelector("[data-fo-address-search]");
      if (search?.foCascadeAddressFill && a.district) search.foCascadeAddressFill(a);
    };
    if (cascade) requestAnimationFrame(fillAddress);
    const onRaion = (event) => {
      if (!S.page?.contains(cascade) || !cascade?.isConnected) { document.removeEventListener("fo:raion-changed", onRaion); return; }
      const raion = event.detail?.raion || "";
      if (raion === (d.details.address?.district || "")) return;
      d.details.address = { ...(d.details.address || {}), district: raion };
      if (d.act) d.details.addressChanged = true; /* AC-13 */
      d.details.subdivision = subdivisionFor(d) || "";
      redrawBlock("subdivision");
    };
    document.addEventListener("fo:raion-changed", onRaion);
  }
  BLOCK_RENDER.subdivision = subdivisionBlockHtml;
  BLOCK_RENDER.term = termBlockHtml;
  function readAddress(root) {
    const out = {};
    root?.querySelectorAll("[data-fo-address-part]").forEach((el) => {
      const key = el.dataset.foAddressPart;
      const v = el.matches("input") ? el.value.trim() : el.classList.contains("e-permits-fo-select__value--placeholder") ? "" : el.textContent.trim();
      if (v && v !== el.dataset.placeholder) out[key] = v;
    });
    const sel = (attr) => root?.querySelector(`${attr} .e-permits-fo-select__value`);
    const val = (el) => (el && !el.classList.contains("e-permits-fo-select__value--placeholder") && !/^Selectează/.test(el.textContent.trim()) ? el.textContent.trim() : "");
    out.district = val(sel("[data-fo-cascade-raion]")) || out.district || "";
    out.locality = val(sel("[data-fo-cascade-localitate]")) || out.locality || "";
    out.street = val(sel("[data-fo-cascade-strada]")) || out.street || "";
    out.sector = val(sel("[data-fo-cascade-sector]")) || out.sector || "";
    return out;
  }
  function collectDetalii() {
    const d = S.cur;
    const form = formOf(d);
    form.fields.forEach((f) => {
      const id = `#fo-${f.id}`;
      if (f.type === "select") {
        const v = S.page.querySelector(`${id}`)?.closest("[data-fo-select]")?.querySelector(".e-permits-fo-select__option.is-selected")?.dataset.value;
        if (v !== undefined) d.details.values[f.key] = v;
      } else {
        const el = S.page.querySelector(id);
        if (el) d.details.values[f.key] = el.value.trim();
      }
    });
    const cascade = S.page.querySelector("[data-fo-cascade-address]");
    if (cascade) d.details.address = { ...d.details.address, ...readAddress(cascade) };
    const sub = S.page.querySelector("#fo-gh-subdiv")?.closest("[data-fo-select]")?.querySelector(".e-permits-fo-select__option.is-selected")?.dataset.value;
    if (sub) d.details.subdivision = sub;
    else if (!S.page.querySelector("#fo-gh-subdiv[aria-haspopup]")) d.details.subdivision = d.act && !d.details.addressChanged ? actById(d, d.act)?.subdiviziune || "" : subdivisionFor(d) || d.details.subdivision;
    const termLabel = S.page.querySelector("#fo-gh-term")?.closest("[data-fo-select]")?.querySelector(".e-permits-fo-select__option.is-selected")?.dataset.value;
    if (termLabel) d.details.term = termsOf(d).find((t) => t.label === termLabel)?.id || "";
    if (termsOf(d).length === 1) d.details.term = termsOf(d)[0].id;
    const reds = [...S.page.querySelectorAll("[data-gh-reduction]")];
    if (reds.length) d.details.reductions = reds.filter((r) => r.checked).map((r) => r.dataset.ghReduction);
    refreshPayment(d);
  }
  function checkDetalii(d) {
    const errs = [];
    const form = formOf(d);
    form.fields.forEach((f) => { if (f.required && !d.details.values[f.key]) errs.push({ input: `#fo-${f.id}`, select: f.type === "select", msg: REQUIRED, step: STEP_INDEX.detalii }); });
    if (form.address) {
      if (!d.details.address?.district) errs.push({ input: "[data-fo-cascade-raion] .e-permits-fo-select__button", select: true, msg: REQUIRED, step: STEP_INDEX.detalii });
      else if (!d.details.address?.locality) errs.push({ input: "[data-fo-cascade-localitate] .e-permits-fo-select__button", select: true, msg: REQUIRED, step: STEP_INDEX.detalii });
    }
    if ((deskOf(d.service)?.subdiviziuni || []).length > 1 && !d.details.subdivision) errs.push({ key: "subdiv", focus: "#fo-gh-subdiv", msg: REQUIRED, step: STEP_INDEX.detalii });
    if (termsOf(d).length > 1 && !termOf(d)) errs.push({ key: "term", focus: "#fo-gh-term", msg: REQUIRED, step: STEP_INDEX.detalii });
    return errs;
  }

  /* ================================================================ step 4 · Documente însoțitoare (US-20) */
  function docFieldHtml(doc) {
    const required = doc.required
      ? req()
      : '<span class="status-tag status-tag--neutral is-subtle status-tag--small e-permits-fo-doc-tag e-permits-fo-optional-tag">Opțional</span>';
    return `
      <div class="e-permits-fo-doc-field" data-fo-doc-field="gh-${esc(doc.id)}" data-gh-doc="${esc(doc.id)}">
        <div class="e-permits-fo-doc-field__row">
          <div class="e-permits-fo-doc-field__info">
            <span class="e-permits-fo-doc-field__label">${esc(doc.label)} ${required}</span>
            ${doc.description ? `<p class="e-permits-fo-doc-field__desc">${esc(doc.description)}</p>` : ""}
            ${errSlot(`doc-${doc.id}`)}
          </div>
          <button class="e-permits-fo-doc-field__add" type="button" data-fo-open-doc-modal data-fo-doc-label="${esc(doc.label)}">${icon("plus-large")}Adaugă fișier</button>
        </div>
        ${doc.id === "procura" ? U().renderNotice?.("info", "<strong>Procura pe hârtie a fost verificată la inițiere.</strong> Atașați copia ei scanată.") || "" : ""}
        <div class="e-permits-fo-doc-field__files" data-fo-doc-field-files></div>
      </div>`;
  }
  function stepDocumente(d) {
    return `
      ${stepHeader("Documente însoțitoare")}
      <section class="e-permits-fo-documents" aria-label="Documente însoțitoare" data-gh-docs>
        ${docsOf(d).map(docFieldHtml).join("")}
        <hr class="e-permits-fo-documents__separator">
        <div class="e-permits-fo-other-docs">
          <div class="e-permits-fo-other-docs__header">
            <div class="e-permits-fo-other-docs__heading-row">
              <h2 class="e-permits-fo-other-docs__heading">Alte documente</h2>
              <span class="status-tag status-tag--neutral is-subtle status-tag--small e-permits-fo-doc-tag e-permits-fo-optional-tag">Opțional</span>
            </div>
            <p class="e-permits-fo-other-docs__desc">Opțional — orice document suplimentar prezentat de solicitant.</p>
          </div>
          <div class="e-permits-fo-other-docs__body">
            <div data-fo-other-doc-list></div>
            <button class="e-permits-fo-add-doc-button" type="button" data-fo-add-other-doc>${icon("plus-small")}<span>Adaugă document</span></button>
          </div>
        </div>
      </section>
      ${footerHtml(d)}`;
  }
  /* restore saved files with the FO card helpers; watch the fields for new / removed files */
  function restoreDocs(root, docs) {
    root.querySelectorAll("[data-gh-doc]").forEach((field) => {
      const box = field.querySelector("[data-fo-doc-field-files]");
      (docs[field.dataset.ghDoc] || []).forEach((doc) => attachTo(box, doc));
    });
  }
  function attachTo(box, doc) {
    if (!box || !doc) return;
    if (doc.sursa === "upload") R().attachFileItem?.(box, doc.fisier || doc.tip, doc.size, { tip: doc.tip, at: doc.at });
    else R().attachMdocsItem?.(box, doc);
  }
  function watchDocs(root, onChange) {
    const obs = new MutationObserver(() => onChange());
    root.querySelectorAll("[data-fo-doc-field-files], [data-fo-other-doc-list]").forEach((box) => obs.observe(box, { childList: true, subtree: true }));
    return obs;
  }
  function readDocs(root) {
    const out = {};
    root.querySelectorAll("[data-gh-doc]").forEach((field) => {
      out[field.dataset.ghDoc] = [...field.querySelectorAll("[data-fo-doc]")].map((el) => { try { return JSON.parse(el.dataset.foDoc); } catch { return null; } }).filter(Boolean);
    });
    const others = [...root.querySelectorAll("[data-fo-other-doc-list] [data-fo-doc]")].map((el) => { try { return JSON.parse(el.dataset.foDoc); } catch { return null; } }).filter(Boolean);
    if (others.length) out.alte = others;
    return out;
  }
  function bindDocumente(panel) {
    restoreDocs(panel, S.cur.docs);
    const others = S.cur.docs.alte || [];
    if (others.length) {
      const add = panel.querySelector("[data-fo-add-other-doc]");
      others.forEach((doc) => {
        add?.click();
        const cards = panel.querySelectorAll("[data-fo-other-doc-list] [data-fo-other-doc-card]");
        attachTo(cards[cards.length - 1]?.querySelector("[data-fo-doc-field-files]"), doc);
      });
    }
    S.docsObserver?.disconnect();
    S.docsObserver = watchDocs(panel, () => {
      const before = JSON.stringify(S.cur.docs);
      S.cur.docs = readDocs(panel);
      if (JSON.stringify(S.cur.docs) !== before) {
        S.dirty = true;
        Object.keys(S.cur.docs).forEach((key) => { if (S.cur.docs[key].length) clearErr(`doc-${key}`); });
      }
      /* new „Alte documente” cards are watched too */
      S.docsObserver && panel.querySelectorAll("[data-fo-doc-field-files]").forEach((box) => S.docsObserver.observe(box, { childList: true, subtree: true }));
    });
  }
  function collectDocumente() { const panel = S.page.querySelector("[data-gh-docs]"); if (panel) S.cur.docs = readDocs(panel); }
  function checkDocumente(d) {
    return docsOf(d).filter((doc) => doc.required && !(d.docs[doc.id] || []).length).map((doc) => ({ key: `doc-${doc.id}`, focus: `[data-gh-doc="${doc.id}"] [data-fo-open-doc-modal]`, msg: "Documentul este obligatoriu.", step: STEP_INDEX.documente, field: `[data-gh-doc="${doc.id}"]` }));
  }

  /* ================================================================ step 5 · Verificare (US-236) */
  const summaryRow = (label, values) => R().summaryRowHtml?.(label, values) || "";
  /* the FO Verificare summary section (GEAPFormRender.summarySectionHtml) with the desk's edit pen */
  const summarySection = (title, rowsHtml, step = null, extraClass = "") => R().summarySectionHtml?.({
    title, bodyHtml: rowsHtml, extraClass: extraClass.trim(),
    editHtml: step != null && !locked(S.cur) ? `<button class="e-permits-fo-summary-section__edit" type="button" aria-label="Corectează: ${esc(title)}" data-tooltip-label="Corectează" data-gh-goto="${step}">${icon("edit")}</button>` : ""
  }) || "";
  const addressText = (a) => [a?.street && a?.house ? `${a.street} ${a.house}` : a?.street, a?.locality, a?.district, a?.postalCode].filter(Boolean).join(", ");
  const paperDoc = (d) => ({ sursa: "generat", tip: "Cererea pe hârtie", nr: d.nr, fisier: `cerere-${d.nr}.pdf`, size: "184 KB", at: stamp(d.review.paper.at), verb: "Generat", de: "MDocs" });
  const signedDoc = (d) => ({ sursa: "generat", tip: "Cererea semnată MSign", nr: d.nr, fisier: `cerere-${d.nr}.json`, size: "6 KB", at: stamp(d.review.signed.at), verb: "Semnat", de: d.review.signed.by, semnat: true });
  const docCard = (doc, actions = "") => `
    <div class="e-permits-fo-confirm-file e-permits-fo-confirm-file--doc e-permits-fo-confirm-file--${doc.sursa === "upload" ? "uploaded" : "system"}${actions ? " e-permits-gh__doc" : ""}">
      ${R().docIconHtml?.(doc, "e-permits-fo-confirm-file__icon") || ""}
      ${R().docContentHtml?.(doc) || esc(doc.tip)}
      ${actions ? `<div class="e-permits-gh__doc-actions">${actions}</div>` : ""}
    </div>`;
  const detailsBtn = (attrs, label) => `<button class="btn btn-neutral btn-sm" type="button" aria-label="Detalii: ${esc(label)}" ${attrs}>${icon("eye-open", 20, "icon small")}<span>Detalii</span></button>`;
  function reviewSummaryHtml(d) {
    const svc = serviceOf(d.service);
    const authority = A().getAuthorityById?.(svc?.authorityId)?.name || "Agenția Națională pentru Sănătate Publică";
    const act = d.act ? actById(d, d.act) : null;
    const general = [
      summaryRow("Numărul cererii", [esc(d.nr || "—")]),
      summaryRow("Serviciul", [esc(svc?.title || "")]),
      summaryRow("Autoritatea", [esc(authority)]),
      summaryRow("Subdiviziunea de procesare", [esc(d.details.subdivision || subdivisionFor(d) || "—")]),
      summaryRow("Tipul solicitării", [esc(d.requestType), act ? esc(`pe ${act.nr}`) : ""].filter(Boolean)),
      summaryRow("Termen de examinare", [esc(termOf(d)?.label || "—")])
    ].join("");
    const manual = [d.company.state, d.applicant.state, d.rep.state].includes("manual") ? ` ${tagHtml("Introdus manual", "warning")}` : "";
    const repPerson = d.personType === "PJ" ? d.applicant : d.rep.on ? d.rep : null;
    const applicant = [
      summaryRow("Solicitant", [esc(holderName(d)) + manual, esc(d.personType === "PJ" ? `IDNO ${d.company.idno}` : `IDNP ${d.applicant.idnp}`)]),
      repPerson ? summaryRow(d.personType === "PJ" ? "Persoana care depune" : "Reprezentant", [esc(fullName(repPerson)), esc(`IDNP ${repPerson.idnp}`), esc(`Temei: ${basisLabel(d) || "—"}`)]) : "",
      summaryRow("Date de contact pentru notificări", [esc(d.contact.phone ? `+373 ${formatPhone(d.contact.phone)}` : "—"), esc(d.contact.email || "fără email")])
    ].join("");
    const form = formOf(d);
    const request = [
      ...form.fields.map((f) => summaryRow(f.label, [esc(d.details.values[f.key] || "—")])),
      form.address ? summaryRow("Adresa obiectului", [esc(addressText(d.details.address) || "—")]) : "",
      reductionsOf(d).length ? summaryRow("Reduceri aplicate", d.details.reductions.length ? reductionsOf(d).filter((r) => d.details.reductions.includes(r.id)).map((r) => esc(r.label)) : ["Fără reduceri"]) : ""
    ].join("");
    /* AC-04 (user 2026-10-16: no „Atașat: Da” badge): every attached document as the shared document card titled by
       the type it was asked as (the FO Verificare list); missing required types = one warning notice under it */
    const attachedCards = [
      ...docsOf(d).flatMap((doc) => (d.docs[doc.id] || []).map((f) => docCard({ ...f, tip: doc.label, fisier: f.fisier || f.tip }))),
      ...(d.docs.alte || []).map((f) => docCard({ ...f, tip: "Document suplimentar", fisier: f.fisier || f.tip }))
    ].join("");
    const missing = docsOf(d).filter((doc) => doc.required && !(d.docs[doc.id] || []).length).map((doc) => doc.label);
    const attachments = `${attachedCards || window.GEAPEmptyState?.render({ title: "Nu au fost atașate documente", text: "Se atașează la pasul „Documente însoțitoare”.", icon: "document", compact: true }) || ""}${missing.length ? U().renderNotice?.("warning", `<strong>Lipsesc documente obligatorii.</strong> ${missing.map(esc).join("; ")}.`) || "" : ""}`;
    return `
      <div class="e-permits-fo-review e-permits-gh__review">
        ${summarySection("Date generale ale solicitării", general, STEP_INDEX.identificare)}
        ${summarySection("Date despre solicitant", applicant, STEP_INDEX.identificare)}
        ${summarySection("Date despre cerere", request, STEP_INDEX.detalii)}
        ${R().summarySectionHtml?.({ title: "Atașamente", bodyHtml: attachments, docs: true, editHtml: locked(d) ? "" : `<button class="e-permits-fo-summary-section__edit" type="button" aria-label="Corectează: Atașamente" data-tooltip-label="Corectează" data-gh-goto="${STEP_INDEX.documente}">${icon("edit")}</button>` }) || ""}
      </div>`;
  }
  function stepVerificare(d) {
    const st = settingsOf(d.service);
    const voided = d.review.voided || [];
    const notices = [
      voided.includes("sign") ? U().renderNotice?.("warning", "Semnătura a fost anulată. Resemnați cererea pentru a continua.") : "",
      voided.includes("olograf") ? U().renderNotice?.("warning", "Cererea semnată olograf a fost anulată. Atașați din nou cererea semnată olograf pentru a continua.") : ""
    ].filter(Boolean).join("");
    const paper = d.review.paper
      ? docCard(paperDoc(d), detailsBtn("data-gh-preview=\"paper\"", "Cererea pe hârtie"))
      : S.notice === "mdocs-error"
      ? `<div class="e-permits-gh__retry">${U().renderNotice?.("error", "<strong>Nu s-a putut genera formularul.</strong> MDocs nu a răspuns; datele cererii nu s-au pierdut.", { role: "alert" })}<button class="btn btn-neutral btn-sm" type="button" data-gh-paper>${icon("rotate-arrow", 20, "icon small")}<span>Reîncercați</span></button></div>`
      : `<div class="e-permits-fo-doc-field">
          <div class="e-permits-fo-doc-field__row">
            <div class="e-permits-fo-doc-field__info">
              <span class="e-permits-fo-doc-field__label">Formularul de tipar al cererii</span>
              <p class="e-permits-fo-doc-field__desc">Se generează prin MDocs după șablonul serviciului, cu datele de mai sus și textul consimțământului. Tipăriți-l și dați-l solicitantului spre semnare.</p>
              ${errSlot("paper")}
            </div>
            <button class="e-permits-fo-doc-field__add" type="button" data-gh-paper>${icon("page-text")}Generează cererea pe hârtie</button>
          </div>
        </div>`;
    const olograf = st.olograf ? `
      <div class="e-permits-fo-field e-permits-fo-field--span-12">
        <div class="e-permits-fo-doc-field e-permits-fo-doc-field--boxed" data-fo-doc-field="gh-olograf" data-gh-olograf data-fo-upload-only data-fo-doc-accept=".jpg,.jpeg,.png,.pdf" data-fo-doc-max="1" data-fo-doc-limits="JPG, PNG, PDF|60 MB">
          <div class="e-permits-fo-doc-field__row">
            <div class="e-permits-fo-doc-field__info">
              <span class="e-permits-fo-doc-field__label">Cererea semnată olograf ${req()}</span>
              <p class="e-permits-fo-doc-field__desc">Copia scanată a cererii pe hârtie, semnată de solicitant. JPG, PNG, PDF · maximum 60 MB.</p>
              ${errSlot("olograf")}
            </div>
            <button class="btn btn-strict btn-md" type="button" data-fo-open-doc-modal data-fo-doc-label="Cererea semnată olograf">${icon("upload", 20, "icon medium")}<span>Adaugă fișier</span></button>
          </div>
          <div class="e-permits-fo-doc-field__files" data-fo-doc-field-files></div>
        </div>
      </div>` : "";
    const sign = st.msign ? (d.review.signed
      ? `${U().renderNotice?.("success", "Cererea a fost semnată.") || ""}${docCard(signedDoc(d), `${detailsBtn("data-gh-preview=\"signed\"", "Cererea semnată MSign")}${A().renderStackMenu?.([{ label: "Descarcă", icon: "page-download", attrs: "data-gh-download=\"signed\"" }], "Cererea semnată MSign") || ""}`)}`
      : `${S.notice === "msign-error" ? `${U().renderNotice?.("error", "<strong>MSign nu răspunde acum.</strong> Cererea nu a fost semnată, datele ei rămân neschimbate.", { role: "alert" }) || ""}` : S.notice === "msign-cancel" ? U().renderNotice?.("warning", "Semnarea a fost anulată în MSign: cererea rămâne nesemnată.") || "" : ""}
        <div class="e-permits-gh__sign">
          <p class="e-permits-fo-doc-field__desc">Semnați cererea validată cu semnătura dvs., în numele solicitantului. MSign semnează documentul cererii în format JSON.</p>
          <button class="btn btn-badge btn-badge--primary btn-badge--msign" type="button" data-gh-msign>
            <span class="btn-badge__logo" aria-hidden="true"><img src="assets/logos/m-platforms/m-sign.svg" alt=""></span>
            <span class="btn-badge__label">${S.notice === "msign-error" ? "Reîncercați semnarea prin msign" : "Semnează prin msign"}</span>
          </button>
        </div>
        ${errSlot("msign")}`) : "";
    return `
      ${stepHeader("Verificare")}
      ${U().renderInfoNote?.("Pentru corecții, navigați la pasul corespunzător din bara de progres.") || ""}
      ${notices ? `<div class="e-permits-gh__notices">${notices}</div>` : ""}
      ${reviewSummaryHtml(d)}
      ${section("Cererea pe hârtie", `<div class="e-permits-fo-form__section-body e-permits-fo-form__section-body--single">${paper}</div>`, { id: "gh-paper-title" })}
      ${st.olograf || st.msign ? section("Semnarea cererii", `<div class="e-permits-fo-form__section-body e-permits-fo-form__section-body--single">${olograf}${sign}</div>`, { id: "gh-sign-title", desc: [st.olograf ? "atașați cererea semnată de solicitant" : "", st.msign ? "semnați cererea prin MSign" : ""].filter(Boolean).join(" și ").replace(/^./, (c) => c.toUpperCase()) + " — cerute de setările serviciului." }) : U().renderInfoNote?.("Setările serviciului nu cer cererea semnată olograf și nici semnarea prin MSign la ghișeu.") || ""}
      ${footerHtml(d)}`;
  }
  const OLOGRAF_EXT = /\.(jpe?g|png|pdf)$/i;
  const sizeMb = (label) => { const m = String(label || "").match(/([\d.,]+)\s*(KB|MB|GB|B)/i); if (!m) return 0; const n = Number(m[1].replace(",", ".")); return m[2].toUpperCase() === "GB" ? n * 1024 : m[2].toUpperCase() === "MB" ? n : m[2].toUpperCase() === "KB" ? n / 1024 : n / 1048576; };
  function bindVerificare(panel) {
    const field = panel.querySelector("[data-gh-olograf]");
    if (!field) return;
    const box = field.querySelector("[data-fo-doc-field-files]");
    if (S.cur.review.olograf) attachTo(box, S.cur.review.olograf);
    const obs = new MutationObserver(() => {
      const el = box.querySelector("[data-fo-doc]");
      let doc = null;
      try { doc = el ? JSON.parse(el.dataset.foDoc) : null; } catch { doc = null; }
      if (!doc) { if (S.cur.review.olograf) { S.cur.review.olograf = null; S.dirty = true; } return; }
      if (JSON.stringify(doc) === JSON.stringify(S.cur.review.olograf)) return;
      /* AC-15 / AC-16: validated on upload, the file is not kept */
      const name = doc.fisier || doc.tip || "";
      const error = !OLOGRAF_EXT.test(name) ? "Nu puteți atașa fișierul. Se permit doar extensiile JPG, PNG, PDF." : sizeMb(doc.size) > 60 ? "Nu puteți atașa fișiere mai mari decât 60Mb." : "";
      if (error) { obs.disconnect(); el.remove(); obs.observe(box, { childList: true, subtree: true }); setErr("olograf", error, field); return; }
      S.cur.review.olograf = { ...doc, tip: "Cererea semnată olograf" };
      S.cur.review.voided = (S.cur.review.voided || []).filter((x) => x !== "olograf");
      S.dirty = true;
      clearErr("olograf");
      audit("Atașare cerere semnată olograf", S.cur, name);
    });
    obs.observe(box, { childList: true, subtree: true });
  }
  function checkVerificare(d) {
    const st = settingsOf(d.service);
    const errs = [];
    if (!d.review.paper) errs.push({ key: "paper", focus: "[data-gh-paper]", msg: "Generați cererea pe hârtie: solicitantul o semnează olograf." });
    if (st.olograf && !d.review.olograf) errs.push({ key: "olograf", focus: "[data-gh-olograf] [data-fo-open-doc-modal]", msg: REQUIRED, field: "[data-gh-olograf]" });
    if (st.msign && !d.review.signed) errs.push({ key: "msign", focus: "[data-gh-msign]", msg: "Nu puteți continua fără a semna cererea." });
    return errs;
  }

  /* ================================================================ step 6 · Livrare (US-16) */
  /* the FO „Livrare” step (fo-06) as is (GEAPFormRender.deliveryStepHtml + renderDeliveryStep): EVO Cabinet
     always; „copie pe hârtie” with the desk's methods — at the authority's desk (paperRelease) and MDelivery
     (mdelivery: the FO courier address card, fee on the note). mode: evo · ghiseu · mdelivery */
  const DELIVERY_METHOD = { ghiseu: "pickup", mdelivery: "courier" };
  function deliveryConfig(d) {
    const st = settingsOf(d.service);
    const methods = [
      st.paperRelease ? { id: "pickup", title: "Ridicare de la ghișeul autorității", description: "Solicitantul ridică actul pe hârtie de la ghișeul autorității emitente.", icon: "icon-store", selected: d.delivery.mode === "ghiseu", badges: [{ label: "Gratuit", tone: "outline" }] } : null,
      st.mdelivery ? {
        id: "courier", title: "Livrare prin MDelivery", description: `Actul pe hârtie se livrează la adresa indicată. Taxa MDelivery (${mdl(S.data.mdelivery.amount)}) se adaugă pe nota de plată.`, icon: "icon-car", selected: d.delivery.mode === "mdelivery", badges: [{ label: "Cu plată", tone: "warning" }],
        address: { title: "Adresa livrării", required: true, icon: "icon-map-pin", label: "Adresa de livrare", value: d.delivery.address || addressText(d.details.address) || "Adăugați adresa livrării", editLabel: "Editează adresa livrării", cancelLabel: "Anulează", saveLabel: "Salvează", form: { id: "gh-delivery-address", type: "cascade-address", span: 12, cadastral: { visible: false } } }
      } : null
    ].filter(Boolean);
    return {
      title: "Livrare",
      sectionTitle: "Cum primește solicitantul rezultatul?",
      options: [{ id: "evo-cabinet", title: "Livrare electronică (EVO Cabinet)", description: "Actul semnat electronic apare în EVO Cabinet al solicitantului.", logo: "assets/logos/evo-logo.svg", selected: true, badges: [{ label: "Gratuit", tone: "outline" }, { label: "100% digital", tone: "positive" }] }],
      paperCopy: methods.length ? { label: "Solicitantul are nevoie și de o copie pe hârtie", description: "Opțional. Varianta electronică are aceeași valoare juridică.", selected: d.delivery.mode !== "evo", methods } : null
    };
  }
  function stepLivrare(d) {
    return `
      ${R().deliveryStepHtml?.({ title: "Livrare", sectionTitle: deliveryConfig(d).sectionTitle, titleId: "gh-delivery-title", headingId: "gh-delivery-heading" }) || ""}
      ${errSlot("livrare")}
      ${footerHtml(d)}`;
  }
  function bindLivrare(panel) {
    const cfg = deliveryConfig(S.cur);
    if (!cfg.paperCopy) cfg.paperCopy = { methods: [] };
    R().renderDeliveryStep?.(panel.querySelector(".e-permits-fo-delivery"), cfg, { districts: R().districts?.() || [] });
    if (!deliveryConfig(S.cur).paperCopy) panel.querySelector("[data-fo-delivery-paper]")?.replaceChildren();
    const cascade = panel.querySelector("#gh-delivery-address, [data-fo-delivery-address] [data-fo-cascade-address]");
    const a = S.cur.delivery.addressParts;
    if (cascade && a?.district) requestAnimationFrame(() => cascade.querySelector?.("[data-fo-address-search]")?.foCascadeAddressFill?.(a));
  }
  function collectLivrare() {
    const d = S.cur;
    const root = S.page.querySelector('[data-gh-panel="livrare"]');
    if (!root) return;
    const paper = root.querySelector("[data-fo-delivery-paper-toggle]")?.checked;
    const method = root.querySelector("input[name='fo-delivery-paper-method']:checked")?.value;
    d.delivery.mode = paper && method === "pickup" ? "ghiseu" : paper && method === "courier" ? "mdelivery" : "evo";
    const value = root.querySelector("[data-fo-delivery-address-value]")?.textContent.trim() || "";
    d.delivery.address = value && value !== "Adăugați adresa livrării" ? value : "";
    const cascade = root.querySelector("[data-fo-delivery-address] [data-fo-cascade-address]");
    const parts = cascade ? readAddress(cascade) : null;
    if (parts?.district) d.delivery.addressParts = parts;
    refreshPayment(d);
  }
  function checkLivrare(d) {
    if (d.delivery.mode !== "mdelivery" || d.delivery.address) return [];
    return [{ key: "livrare", focus: "[data-fo-delivery-address-edit]", msg: "Adăugați adresa livrării MDelivery." }];
  }

  /* ================================================================ step 7 · Notă de plată (US-237) */
  const NOTE_TONE = { "Emisă": "warning", "Achitată": "success", "Expirată": "danger", "Anulată": "neutral" };
  function ensurePayment(d) {
    if (d.payment && d.payment.status !== "Anulată") { refreshPayment(d); return; }
    if (!hasFee(d)) return;
    d.payment = makePayment(d);
    audit("Generare notă de plată", d, `${d.payment.nr} · ${mdl(d.payment.total)} · statut Emisă`);
    audit("Notificare MNotify: notă de plată", d, `Link de achitare MPay trimis la ${d.contact.email || "EVO Cabinet"}`, { system: true });
    syncSubstatus(d);
    persist({ silent: true });
  }
  /* „Notă de plată” = the FO „Plată” body (GEAPFormRender.paymentStepBodyHtml: summary rows, the note card,
     the actions) inside the FO body column (32 between blocks); desk-only parts are notices in that rhythm: the
     MPay status (US-237), the expired note + „Regenerează” (US-256), an incomplete fee setup, earlier notes */
  const NOTE_TAG = { "Emisă": "accent", "Achitată": "success", "Expirată": "danger", "Anulată": "neutral" };
  function stepPlata(d) {
    const p = d.payment;
    if (!p) return `${stepHeader("Notă de plată")}<div class="e-permits-fo-payment__body">${U().renderNotice?.("info", "<strong>Cererea nu are taxe de achitat.</strong> Treceți la confirmarea depunerii.") || ""}</div>${footerHtml(d)}`;
    const svc = serviceOf(d.service);
    const incomplete = p.lines.some((l) => !l.account);
    const step = {
      summary: { rows: [
        { label: "Numărul cererii", value: d.nr, copy: true },
        { label: "Serviciul", value: svc?.title || "" },
        { label: "Data emiterii", value: longDate(p.issued) },
        { label: "Termen de achitare", value: longDate(p.due) },
        p.paid ? { label: "Achitată", value: `${stamp(p.paid)} · ID tranzacție MPay ${p.txn}` } : null
      ].filter(Boolean) },
      invoice: {
        label: `Notă de plată ${p.nr}`, status: { label: p.status, tone: NOTE_TAG[p.status] || "neutral" }, amount: mdl(p.total),
        columns: ["Element de plată", "Sumă"],
        items: p.lines.map((l) => ({ span: true, description: l.name, total: mdl(l.amount), metaHtml: [
          `Cont bancar ${l.account ? esc(l.account) : tagHtml("Lipsește", "danger")}`,
          ...(l.reductions.length ? [`Reduceri: ${l.reductions.map(esc).join("; ")} · tarif ${esc(mdl(l.base))}`] : [])
        ] })),
        totals: [{ label: "Total de plată", value: mdl(p.total), strong: true }]
      },
      actions: { download: { label: "Descarcă nota de plată", icon: "icon-page-download" } }
    };
    const state = p.status === "Achitată"
      ? U().renderNotice?.("success", `<strong>Nota de plată a fost achitată.</strong> Prin MPay la ${esc(stamp(p.paid))}. Câmpurile cererii nu se mai pot modifica, iar schița nu se mai poate elimina.`)
      : p.status === "Expirată"
      ? U().renderNotice?.("error", `<strong>Nota de plată a expirat.</strong> Termenul a fost ${esc(longDate(p.due))}. Cererea are statutul „Respins formal”, substatutul „Plată expirată”, și nu se poate depune până la regenerarea notei.`, { role: "alert" })
      : U().renderNotice?.("info", `<strong>Solicitantul achită nota prin MPay.</strong> Linkul de achitare a fost trimis prin MNotify${d.contact.email ? ` la ${esc(d.contact.email)}` : ""} și în EVO Cabinet. Statutul se actualizează automat după confirmarea MPay.`);
    const extra = p.status === "Expirată"
      ? `<button class="btn btn-primary" type="button" data-gh-regenerate>${icon("rotate-arrow")}<span>Regenerează nota de plată</span></button>`
      : p.status === "Emisă" ? `<button class="btn btn-neutral" type="button" data-gh-mpay>${icon("rotate-arrow")}<span>Verifică achitarea în MPay</span></button>` : "";
    const history = (p.history || []).filter((h) => h.nr).map((h) => summaryRow(`Nota ${h.nr}`, [tagHtml(h.status, NOTE_TONE[h.status] || "neutral"), esc(mdl(h.total))])).join("");
    const blocked = p.status !== "Achitată" || incomplete;
    return `
      ${stepHeader("Notă de plată")}
      <div class="e-permits-fo-payment__body">
        ${state || ""}
        ${incomplete ? U().renderNotice?.("error", "<strong>Configurarea taxei este incompletă.</strong> Pentru asistență, contactați autoritatea emitentă.", { role: "alert" }) || "" : ""}
        ${R().paymentStepBodyHtml?.(step, { downloadAttrs: 'data-gh-download="note"', extraActionsHtml: extra, summaryLabel: "Detaliile notei de plată" }) || ""}
        ${history ? summarySection("Note de plată anterioare", history) : ""}
        ${blocked ? U().renderNotice?.("info", "<strong>Confirmarea depunerii se deblochează după statutul „Achitată”.</strong>") || "" : ""}
      </div>
      ${footerHtml(d, { nextDisabled: blocked, back: !isPaid(d) })}`;
  }
  function regeneratePayment(d) {
    const old = d.payment;
    d.payment = makePayment(d);
    d.payment.lines = old.lines; d.payment.total = old.total; /* AC-05: same tariffs, reductions and sums */
    d.payment.history = [...(old.history || []), { nr: old.nr, status: "Expirată", total: old.total }];
    d.status = "Schiță"; d.substatus = "Spre achitare";
    audit("Regenerare notă de plată", d, `${old.nr} (Expirată) → ${d.payment.nr} · ${mdl(d.payment.total)}`);
    audit("Notificare MNotify: notă de plată nouă", d, "Link de achitare MPay", { system: true });
    persist({ silent: true });
  }

  /* ================================================================ step 8 · Confirmarea depunerii (US-238) */
  function readiness(d) {
    const st = settingsOf(d.service);
    const all = STEPS.filter((s, i) => i < STEP_INDEX.verificare).flatMap((s) => CHECKS[s.id](d));
    return [
      { label: "Datele cererii sunt validate", ok: !all.length },
      st.olograf ? { label: "Cererea semnată olograf este atașată", ok: Boolean(d.review.olograf) } : null,
      st.msign ? { label: "Cererea este semnată prin MSign", ok: Boolean(d.review.signed) } : null,
      hasFee(d) || d.payment ? { label: "Nota de plată este achitată", ok: isPaid(d) } : { label: "Fără notă de plată", ok: true }
    ].filter(Boolean);
  }
  function stepConfirmare(d) {
    if (isSubmitted(d)) return confirmedHtml(d);
    const list = readiness(d);
    const ok = list.every((x) => x.ok);
    return `
      ${stepHeader("Confirmarea depunerii")}
      ${S.notice === "submit-error" ? U().renderNotice?.("error", "A apărut o eroare. Depunerea nu a putut fi finalizată. Încercați din nou.", { role: "alert" }) || "" : ""}
      ${summarySection("Condițiile depunerii", list.map((x) => summaryRow(x.label, [tagHtml(x.ok ? "Îndeplinită" : "Neîndeplinită", x.ok ? "success" : "danger")])).join(""))}
      ${summarySection("Cererea", [
        summaryRow("Numărul cererii", [esc(d.nr)]),
        summaryRow("Solicitant", [esc(holderName(d))]),
        summaryRow("Tipul solicitării", [esc(d.requestType)]),
        summaryRow("Livrare", [esc({ evo: "Electronic, în EVO Cabinet", ghiseu: "Pe hârtie, la instituția emitentă", mdelivery: `Prin MDelivery · ${d.delivery.address || ""}` }[d.delivery.mode])]),
        summaryRow("Termen de examinare", [esc(termOf(d)?.label || "—")])
      ].join(""))}
      ${footerHtml(d, { next: S.notice === "submit-error" ? "Reîncercați" : "Confirmă depunerea", nextAttrs: "data-gh-submit", nextDisabled: !ok })}`;
  }
  function confirmedHtml(d) {
    const st = settingsOf(d.service);
    const cert = !st.certificat ? "" : d.certError
      ? R().finishDocHtml?.({ title: "Certificatul constatator", error: "Certificatul constatator nu a putut fi generat.", actionAttrs: "data-gh-cert-retry" }) || ""
      : R().finishDocHtml?.({ title: "Certificatul constatator", textHtml: "Dovada depunerii, pentru solicitant. Disponibil și în EVO Cabinet.", actionAttrs: 'data-gh-preview="cert"' }) || "";
    return `
      <div class="e-permits-gh__finish">
        ${R().finishHeroHtml?.({ title: "Dosarul a fost depus cu succes.", leadHtml: '<p class="e-permits-fo-finish__lead">Solicitantul îl urmărește în EVO Cabinet → Solicitările mele și a primit notificarea de depunere prin MNotify.</p>' }) || ""}
        <div class="e-permits-fo-finish__content">
          ${cert}
          <section class="e-permits-fo-payment-summary" aria-label="Dosarul depus">
            ${summaryRow("Numărul dosarului", [R().copyValueHtml?.(d.nr, { ariaLabel: `Copiază numărul dosarului ${d.nr}` }) || esc(d.nr)])}
            ${summaryRow("Data depunerii", [esc(stamp(d.submittedAt))])}
            ${summaryRow("Termen de examinare", [esc(longDate(d.examDeadline)), esc(termOf(d)?.label || "")])}
            ${summaryRow("Statut", [`${tagHtml("În procesare", "info")} ${tagHtml("Spre distribuire", "info")}`])}
            ${summaryRow("Canal de depunere", ["Ghișeu"])}
          </section>
          ${U().renderNotice?.("info", "<strong>Dosarul a fost trimis la distribuire.</strong> Apare în „Dosare noi” › „Dosare nedistribuite”; evenimentul depunerii a fost publicat în MConnect Event Bus.") || ""}
        </div>
      </div>${footerHtml(d, { custom: `<button class="btn btn-neutral btn-rounded" type="button" data-gh-close-sheet>Înapoi la Dosare noi</button><button class="btn btn-primary btn-rounded" type="button" data-gh-new>${icon("plus-small", 20, "icon small")}<span>Dosar nou</span></button>` })}`;
  }
  function submit() {
    const d = S.cur;
    if (!readiness(d).every((x) => x.ok)) return;
    if (params.get("depunere") === "eroare" && S.notice !== "submit-error" && !S.submitRetried) {
      S.notice = "submit-error"; S.submitRetried = true;
      audit("Depunere cerere", d, "Eșuată · cererea rămâne Schiță");
      render();
      return;
    }
    S.notice = null;
    d.status = "În procesare"; d.substatus = "Spre distribuire";
    d.submittedAt = nowIso();
    d.examDeadline = addDays(d.submittedAt, Number((termOf(d)?.label || "").match(/\d+/)?.[0] || 15) + 6);
    d.step = STEP_INDEX.confirmare; d.maxStep = d.step;
    d.certError = settingsOf(d.service).certificat && params.get("certerr") === "1";
    audit("Depunere cerere", d, `Dosar ${d.nr} · canal Ghișeu · trimis la distribuire`);
    audit("Publicare eveniment MConnect Event Bus", d, "cerere.depusa", { system: true });
    audit("Notificare MNotify: depunere", d, `Identificator ${d.nr}, termen ${longDate(d.examDeadline)}`, { system: true });
    persist({ silent: true });
    /* no toast: the confirmation is shown in place (US-238 AC-04) */
    render();
  }

  const STEP_RENDER = { initiere: stepInitiere, intent: stepIntent, identificare: stepIdentificare, detalii: stepDetalii, documente: stepDocumente, verificare: stepVerificare, livrare: stepLivrare, plata: stepPlata, confirmare: stepConfirmare };
  const STEP_BIND = { initiere: bindInitiere, identificare: bindIdentificare, detalii: bindDetalii, documente: bindDocumente, verificare: bindVerificare, livrare: bindLivrare };
  const COLLECT = { identificare: () => { collectInitiere(); collectSolicitant(); }, detalii: collectDetalii, documente: collectDocumente, livrare: collectLivrare };
  /* data checks per step index (validate = collect + check) */
  const CHECKS = { initiere: (d) => checkPicker(d), intent: (d) => checkProcess(d), identificare: (d) => [...dataCheckInitiere(d), ...checkContact(d)], detalii: checkDetalii, documente: checkDocumente, verificare: checkVerificare, livrare: checkLivrare, plata: () => [], confirmare: () => [] };
  const CHECK = STEPS.map((step) => CHECKS[step.id]);
  /* the picker: a service, and a process (Emitere primară is preselected) */
  const PROCESS_MSG = "Alegeți „Solicitare nouă” sau un postproces pe un act emis.";
  const checkProcess = (d) => (!d.process || (d.process === "post" && (!d.act || !d.requestType)) ? [{ key: "process", focus: "[data-gh-intent-new]", msg: PROCESS_MSG }] : []);
  function checkPicker(d) {
    if (!d.service) return [{ key: "serviciu", focus: "#fo-gh-serviciu", msg: REQUIRED }];
    if (!isIdentified(d)) return [{ input: '[data-gh-code]:not([readonly])', msg: REQUIRED }];
    return checkProcess(d);
  }
  function dataCheckInitiere(d) {
    const errs = [];
    if (!isIdentified(d)) errs.push({ key: "process", msg: "Identificați solicitantul în „Inițiere cerere”.", toast: true });
    if (d.rep.on && d.personType === "PF" && !filled(d.rep, ["nume", "prenume"])) errs.push({ input: '[data-gh-code="rep"]', msg: REQUIRED });
    if (needsProcura(d) && !d.procura) errs.push({ key: "procura", msg: "Legătura nu este confirmată electronic. Bifați «Prin procură», după verificarea procurii pe hârtie." });
    if (checkProcess(d).length) errs.push({ key: "process", msg: `${PROCESS_MSG.replace(/\.$/, "")} în „Inițiere cerere”.`, toast: true });
    return errs;
  }
  function checkContact(d) {
    if (d.contact.phoneSrc === "mnotify") return [];
    const digits = String(d.contact.phone || "").replace(/[\s+\-()]/g, "");
    return /^\d{6,}$/.test(digits) ? [] : [{ input: "#fo-gh-phone", msg: digits ? "Introdu un număr de telefon valid." : REQUIRED }];
  }
  /* the current step: collect + full checks (the DOM-level validators of steps 1–2) */
  function validateStep(i) {
    const id = STEPS[i].id;
    if (id === "initiere") return validateInitiere({ picker: true });
    if (id === "identificare") return [...validateInitiere(), ...validateSolicitant()];
    COLLECT[id]?.();
    return CHECK[i](S.cur);
  }

  /* ================================================================ navigation, save, errors */
  const sig = (d) => JSON.stringify([d.service, d.personType, d.applicant, d.company, d.rep, d.procura, d.contact, d.details, d.docs, d.process, d.act, d.requestType]);
  /* AC-22 / AC-23 (US-236): an edit in an earlier step voids the signature and the signed scan */
  function voidIfChanged() {
    const d = S.cur;
    if (S.step >= STEP_INDEX.verificare || !S.sigAtEntry || sig(d) === S.sigAtEntry) return;
    const voided = [];
    if (d.review.signed) voided.push("sign");
    if (d.review.olograf) voided.push("olograf");
    if (voided.length || d.review.paper) {
      d.review = { paper: null, olograf: null, signed: null, voided };
      audit("Anulare semnătură / cerere semnată", d, "Datele cererii au fost modificate după semnare");
    }
  }
  function nextRequestNumber() {
    const max = S.drafts.reduce((m, x) => Math.max(m, Number(String(x.nr).match(/(\d+)$/)?.[1] || 0)), 4812);
    return `C-2026-${String(max + 1).padStart(6, "0")}`;
  }
  /* US-239: first save creates the draft (nr + UID, statut Schiță, canal Ghișeu); every save keeps the step */
  function persist({ explicit = false } = {}) {
    const d = S.cur;
    if (!d.id) {
      d.nr = nextRequestNumber();
      d.id = `gh-${d.nr.slice(-4)}-${Date.now().toString(36).slice(-4)}`;
      d.uid = `uid-${d.id}`;
      d.createdAt = nowIso();
      d.by = userName();
      /* the MConnect lookups made before the first save belong to the request too (AC-36) */
      S.audit.forEach((e) => { if (e.tmp && e.tmp === d.tmp) { e.cerere = d.nr; delete e.tmp; } });
      audit("Prima salvare a schiței", d, `${serviceOf(d.service)?.title || ""} · ${d.requestType} · statut Schiță · canal Ghișeu`);
    } else {
      audit("Salvare schiță", d, `Pasul „${STEPS[S.step].label}”`);
    }
    if (!isSubmitted(d)) { d.step = S.step; d.maxStep = Math.max(d.maxStep || 0, S.step); }
    d.updatedAt = nowIso();
    syncSubstatus(d);
    const copy = JSON.parse(JSON.stringify(d));
    const i = S.drafts.findIndex((x) => x.id === d.id);
    if (i >= 0) S.drafts[i] = copy; else S.drafts.unshift(copy);
    writeStore();
    updateBadge();
    S.dirty = false;
    if (explicit) U().showShellToast?.("Datele au fost salvate cu succes.", "success");
  }
  function go(target, { validate = true } = {}) {
    const d = S.cur;
    const from = S.step;
    if (target === from || !d) return;
    /* back to the picker (US-233: applicant and process change only there) */
    if (target === 0) {
      COLLECT[STEPS[from].id]?.();
      S.returnStep = from;
      S.step = 0;
      render();
      return;
    }
    if (validate && target > from) {
      const errs = validateStep(from);
      if (errs.length) { showErrors(errs); return; }
    } else if (STEPS[from].id === "identificare") { collectInitiere(); collectSolicitant(); }
    else COLLECT[STEPS[from].id]?.();
    voidIfChanged();
    /* AC-08 / AC-09: Verificare (and after) only with every earlier step valid */
    if (validate && target >= STEP_INDEX.verificare) {
      for (let i = 0; i < STEP_INDEX.verificare; i += 1) {
        const errs = i === from ? [] : CHECK[i](d);
        if (errs.length) {
          U().showShellToast?.("Completați câmpurile obligatorii înainte de a reveni la verificare.", "error");
          S.step = i; d.maxStep = Math.max(d.maxStep || 0, i);
          render();
          showErrors(validateStep(i), { focus: true });
          return;
        }
      }
    }
    const valid = !CHECK[from](d).length;
    S.step = target;
    if (target === STEP_INDEX.plata) ensurePayment(d);
    if (target === STEP_INDEX.verificare && from < target) audit("Intrare în pasul Verificare", d, "Rezumatul cererii afișat");
    /* AC-06: saved on every step change once the step left is valid (the first one creates the draft) */
    if (valid && !isSubmitted(d)) persist();
    else d.maxStep = Math.max(d.maxStep || 0, target);
    S.notice = null;
    render();
  }

  function clearErrors() {
    if (!S.page) return;
    S.page.querySelectorAll("[aria-invalid='true']").forEach((el) => { if (el.matches("input, textarea")) R().setFieldError?.(el, ""); else el.removeAttribute("aria-invalid"); });
    S.page.querySelectorAll("[data-gh-err]").forEach((slot) => { slot.hidden = true; slot.innerHTML = ""; });
    S.page.querySelectorAll("[data-gh-select-err]").forEach((el) => el.remove());
    S.page.querySelectorAll(".is-error").forEach((el) => { if (el.matches(".e-permits-fo-select, .e-permits-fo-caem, .e-permits-fo-doc-field, .e-permits-check-options, .segmented-control")) el.classList.remove("is-error"); });
  }
  function setErr(key, msg, fieldEl = null) {
    const slot = S.page?.querySelector(`[data-gh-err="${key}"]`);
    if (!slot) return;
    slot.innerHTML = `${ERR_ICON}<span>${esc(msg)}</span>`;
    slot.hidden = false;
    fieldEl?.classList.add("is-error");
  }
  function clearErr(key) {
    const slot = S.page?.querySelector(`[data-gh-err="${key}"]`);
    if (!slot || slot.hidden) return;
    slot.hidden = true; slot.innerHTML = "";
    slot.closest(".e-permits-fo-doc-field")?.classList.remove("is-error");
    S.page.querySelector(key === "serviciu" ? "[data-gh-service] .e-permits-fo-caem" : key === "procura" ? ".e-permits-gh__procura" : "x-none")?.classList.remove("is-error");
  }
  const ERR_FIELD = { livrare: "[data-fo-delivery-address-card]", serviciu: "[data-gh-service] .e-permits-fo-caem", procura: ".e-permits-gh__procura", tip: "[data-gh-type]", subdiv: "#fo-gh-subdiv", term: "#fo-gh-term" };
  function showErrors(errs, { focus = true } = {}) {
    clearErrors();
    errs.forEach((e) => {
      if (e.input) {
        const el = S.page.querySelector(e.input);
        if (!el) return;
        if (e.select) {
          el.closest(".e-permits-fo-select")?.classList.add("is-error");
          el.setAttribute("aria-invalid", "true");
          el.closest(".e-permits-fo-field")?.insertAdjacentHTML("beforeend", `<span class="message message--inline message--error e-permits-fo-field__error" data-gh-select-err>${ERR_ICON}<span>${esc(e.msg)}</span></span>`);
        } else R().setFieldError?.(el, e.msg);
      } else {
        const sel = e.field || ERR_FIELD[e.key];
        const target = sel ? S.page.querySelector(sel) : null;
        setErr(e.key, e.msg, target?.closest(".e-permits-fo-select, .e-permits-fo-caem, .e-permits-fo-doc-field, .e-permits-check-options, .segmented-control") || target);
        if (e.key === "subdiv" || e.key === "term") { const btn = S.page.querySelector(ERR_FIELD[e.key]); btn?.closest(".e-permits-fo-select")?.classList.add("is-error"); btn?.setAttribute("aria-invalid", "true"); }
      }
    });
    const first = errs[0];
    if (focus && first) {
      const el = S.page.querySelector(first.input || first.focus || `[data-gh-err="${first.key}"]`);
      el?.scrollIntoView({ block: "center" });
      el?.focus?.({ preventScroll: true });
    }
    if (errs.some((e) => e.toast)) U().showShellToast?.(errs.find((e) => e.toast).msg, "error");
  }

  function bindPanel() {
    const panel = S.page.querySelector("[data-gh-panel]");
    if (!panel) return;
    R().bind?.(panel);
    const id = STEPS[S.step].id;
    STEP_BIND[id]?.(panel);
    if (S.step < STEP_INDEX.verificare) S.sigAtEntry = sig(S.cur);
    panel.addEventListener("fo-select-change", (event) => {
      const select = event.target.closest?.("[data-fo-select]");
      const button = select?.querySelector(".e-permits-fo-select__button");
      if (!button) return;
      S.dirty = true;
      if (button.getAttribute("aria-invalid") === "true") { select.classList.remove("is-error"); button.removeAttribute("aria-invalid"); select.closest(".e-permits-fo-field")?.querySelector("[data-gh-select-err]")?.remove(); }
      if (button.id === "fo-gh-subdiv") clearErr("subdiv");
      if (button.id === "fo-gh-term") { clearErr("term"); collectDetalii(); refreshChrome(); }
    });
  }

  /* ---------------------------------------------------------------- events inside the page */
  function closeMenus() {
    document.querySelectorAll("[data-stack-menu]:not([hidden])").forEach((menu) => { menu.hidden = true; menu.closest(".e-permits-stack__menu-wrap")?.querySelector("[data-stack-menu-trigger]")?.setAttribute("aria-expanded", "false"); });
  }
  function onClick(event) {
    const t = event.target;
    const d = S.cur;
    if (t.closest("[data-gh-start-cancel]") && !d) { closeStart(); return; }
    if (!d) return;
    /* the intent screen: the post-process menus + „Solicitare nouă” (a choice starts the request) */
    const trigger = t.closest("[data-fo-intent-trigger]");
    if (trigger) { toggleIntentMenu(trigger); return; }
    const ppItem = t.closest("[data-fo-intent-postprocess]");
    if (ppItem) { choosePostprocess(ppItem); return; }
    if (!t.closest(".e-permits-fo-intent-menu")) closeIntentMenus();
    if (t.closest("[data-gh-intent-new]")) { startProcess("primar"); return; }
    if (t.closest("[data-gh-change-process]")) { closeMenus(); changeProcess(); return; }
    if (t.closest("[data-gh-start-next]")) { continueStart(); return; }
    if (t.closest("[data-gh-start-cancel]")) { closeStart(); return; }
    if (t.closest("[data-gh-sheet-close]")) { requestCloseSheet(); return; }
    if (t.closest("[data-gh-close-sheet]")) { leave(); return; }
    if (t.closest("[data-gh-next]")) { go(nextStepIndex(d, S.step)); return; }
    if (t.closest("[data-gh-prev]")) { go(prevStepIndex(d, S.step), { validate: false }); return; }
    const goto = t.closest("[data-gh-goto]");
    if (goto) { event.preventDefault(); const target = Number(goto.dataset.ghGoto); go(target, { validate: !goto.hasAttribute("data-gh-free") && target > S.step }); return; }
    if (t.closest("[data-gh-save]")) {
      /* the FO listens for its draft button on the document — this one is the desk's */
      event.stopPropagation();
      const errs = validateStep(S.step);
      if (errs.length) { showErrors(errs); return; }
      persist({ explicit: true });
      refreshChrome();
      setHash(`#ghiseu/${encodeURIComponent(d.id)}/${STEPS[S.step].id}`);
      return;
    }
    const reset = t.closest("[data-gh-reset]");
    if (reset) {
      const kind = reset.dataset.ghReset;
      collectInitiere();
      const slot = kind === "company" ? d.company : kind === "rep" ? d.rep : d.applicant;
      Object.assign(slot, kind === "company" ? { idno: "", denumire: "", state: "" } : { idnp: "", nume: "", prenume: "", state: "" });
      d.procura = false;
      holderTouched(kind);
      S.dirty = true;
      redrawBlock("applicant"); refreshChrome();
      S.page.querySelector(`[data-gh-code="${kind}"]`)?.focus();
      return;
    }
    if (t.closest("[data-gh-paper]")) { generatePaper(); return; }
    const preview = t.closest("[data-gh-preview]");
    if (preview) { openPreview(preview.dataset.ghPreview, preview); return; }
    const dl = t.closest("[data-gh-download]");
    if (dl) { closeMenus(); download(dl.dataset.ghDownload); return; }
    if (t.closest("[data-gh-msign]")) { startMsign(); return; }
    if (t.closest("[data-gh-mpay]")) { mpayCallback(); return; }
    if (t.closest("[data-gh-regenerate]")) { regeneratePayment(d); render({ focusTitle: false }); U().showShellToast?.(`Nota de plată ${d.payment.nr} a fost generată și trimisă solicitantului.`, "success"); return; }
    if (t.closest("[data-gh-submit]")) { submit(); return; }
    if (t.closest("[data-gh-cert-retry]")) { d.certError = false; audit("Generare certificat constatator", d, "Reușită la reîncercare"); persist({ silent: true }); render({ focusTitle: false }); return; }
    if (t.closest("[data-gh-history]")) { closeMenus(); openHistory(); }
  }
  function onChange(event) {
    const t = event.target;
    const d = S.cur;
    if (!d) return;
    if (t.matches("[data-gh-rep-toggle]")) {
      collectInitiere();
      d.rep = t.checked ? { ...d.rep, on: true } : { on: false, idnp: "", nume: "", prenume: "", state: "" };
      d.procura = false;
      S.dirty = true;
      redrawBlock("applicant"); refreshChrome();
      (S.page.querySelector('[data-gh-code="rep"]') || S.page.querySelector("[data-gh-rep-toggle]"))?.focus();
      return;
    }
    if (t.matches("[data-gh-procura]")) {
      d.procura = t.checked;
      S.dirty = true;
      redrawBlock("basis");
      S.page.querySelector("[data-gh-procura]")?.focus();
      return;
    }
    if (t.matches("[data-gh-reduction]")) { collectDetalii(); S.dirty = true; return; }
    if (t.matches('input[name="gh-livrare"]')) {
      collectLivrare();
      S.dirty = true;
      render({ focusTitle: false });
      S.page.querySelector(`input[name="gh-livrare"][value="${t.value}"]`)?.focus();
    }
  }
  function onInput(event) {
    S.dirty = true;

    const t = event.target;
    if (t.getAttribute?.("aria-invalid") === "true" && !t.matches("[data-fo-registry-code]")) R().setFieldError?.(t, "");
  }
  function onKeydown(event) {
    const t = event.target;
    /* the post-process menu: arrows move between the items (the disabled ones too: they carry the reason) */
    const menu = t.closest?.(".e-permits-fo-intent-menu");
    if (menu && ["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      const items = [...menu.querySelectorAll("[role='menuitem']")];
      const i = items.indexOf(document.activeElement);
      items[event.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length]?.focus();
      return;
    }
    /* Enter in a code: short → the 13-digit error; a full code → the search (js/search.js clicks the arrow);
       a code already answered → Continuă */
    if (event.key === "Enter" && t.matches?.("[data-gh-code]")) {
      event.preventDefault();
      const v = t.value.replace(/\D/g, "");
      if (v.length && v.length < 13) { R().setFieldError?.(t, `${t.dataset.ghCode === "company" ? "IDNO" : "IDNP"}-ul are 13 cifre.`); return; }
      if (t.readOnly && S.step === 0 && !Object.values(S.lookups).some((l) => l?.pending)) continueStart();
      return;
    }
    /* picker step 1: Enter in a field = Continuă (the searchable list keeps its own Enter) */
    if (event.key === "Enter" && S.step === 0 && t.matches?.("input:not([data-fo-caem-search])")) {
      event.preventDefault();
      if (!Object.values(S.lookups).some((l) => l?.pending)) continueStart();
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && event.target.matches?.("[data-gh-goto][role=button]")) { event.preventDefault(); event.target.click(); }
  }

  /* ---------------------------------------------------------------- Verificare actions */
  function generatePaper() {
    const d = S.cur;
    if (params.get("mdocs") === "0" && !S.paperRetried) {
      S.paperRetried = true;
      S.notice = "mdocs-error";
      audit("Generare cerere pe hârtie", d, "Eșuată · MDocs indisponibil");
      render({ focusTitle: false });
      S.page.querySelector("[data-gh-paper]")?.focus();
      return;
    }
    S.notice = null;
    d.review.paper = { at: nowIso() };
    S.dirty = true;
    audit("Generare cerere pe hârtie", d, "MDocs · șablonul de tipar al serviciului");
    render({ focusTitle: false });
    openPreview("paper");
  }
  function startMsign() {
    const d = S.cur;
    if (params.get("msignerr") === "1" && !S.msignRetried) {
      S.msignRetried = true;
      S.notice = "msign-error";
      audit("Semnare MSign", d, "Eșuată · MSign nu răspunde");
      render({ focusTitle: false });
      return;
    }
    openModal({
      kind: "msign",
      title: "Semnare prin MSign",
      subtitle: `${d.nr} · documentul cererii în format JSON`,
      body: `
        <p class="e-permits-passport__lead">Semnați cererea cu semnătura dvs. electronică, în numele solicitantului ${esc(holderName(d))}. SIA GEAP verifică semnătura după întoarcerea din MSign.</p>
        <div class="e-permits-fo-summary-card">
          ${summaryRow("Document", [esc(`cerere-${d.nr}.json`), "6 KB"])}
          ${summaryRow("Semnatar", [esc(userName()), "Specialist ghișeu · CSP Chișinău"])}
        </div>`,
      footer: `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-gh-msign-cancel>Renunță la semnare</button><button class="btn btn-badge btn-badge--primary btn-badge--msign" type="button" data-gh-msign-ok><span class="btn-badge__logo" aria-hidden="true"><img src="assets/logos/m-platforms/m-sign.svg" alt=""></span><span class="btn-badge__label">Semnează prin msign</span></button></div>`
    });
  }
  function mpayCallback() {
    const d = S.cur;
    if (!d.payment) return;
    d.payment.status = "Achitată";
    d.payment.paid = nowIso();
    d.payment.txn = `MPAY-2026-${String(7781200 + Math.floor(Math.random() * 90)).padStart(7, "0")}`;
    audit("Confirmare achitare MPay", d, `${d.payment.nr} · ${mdl(d.payment.total)} · ${d.payment.txn}`);
    audit("Notificare MNotify: plată confirmată", d, d.payment.txn, { system: true });
    persist({ silent: true });
    render({ focusTitle: false });
  }

  /* ---------------------------------------------------------------- modals (library #case-action-modal) */
  let modalClass = "";
  function openModal({ title, subtitle = "", body, footer, kind = "" }) {
    const overlay = document.querySelector("#case-action-modal");
    if (!overlay) return;
    const box = overlay.querySelector(".modal");
    if (!modalClass) modalClass = box.className;
    box.className = `${modalClass} e-permits-gh-modal${kind ? ` e-permits-gh-modal--${kind}` : ""}`;
    overlay.querySelector("[data-case-modal-title]").textContent = title;
    const sub = overlay.querySelector("[data-case-modal-subtitle]");
    sub.textContent = subtitle; sub.hidden = !subtitle;
    overlay.querySelector("[data-case-modal-body]").innerHTML = body;
    overlay.querySelector("[data-case-modal-footer]").innerHTML = footer;
    R().bind?.(overlay.querySelector("[data-case-modal-body]"));
    if (!overlay.dataset.ghBound) {
      overlay.dataset.ghBound = "1";
      overlay.addEventListener("click", onModalClick);
      new MutationObserver(() => { if (overlay.getAttribute("aria-hidden") === "true" && modalClass) { overlay.querySelector(".modal").className = modalClass; } }).observe(overlay, { attributes: true, attributeFilter: ["aria-hidden"] });
    }
    if (!overlay.classList.contains("is-active")) window.__modal?.open?.("#case-action-modal");
  }
  const closeModal = () => window.__modal?.close?.("#case-action-modal");
  function onModalClick(event) {
    const t = event.target;
    const ok = t.closest("[data-gh-remove-confirm]");
    if (ok) { confirmRemove(ok.dataset.ghRemoveConfirm); return; }
    if (t.closest("[data-gh-export-confirm]")) { runExport(); return; }
    if (t.closest("[data-gh-leave-discard]")) { closeModal(); leave(); return; }
    if (t.closest("[data-gh-leave-save]")) {
      closeModal();
      const errs = validateStep(S.step);
      if (errs.length) { showErrors(errs); return; }
      persist({ explicit: true });
      leave();
      return;
    }
    if (t.closest("[data-gh-msign-ok]")) {
      const d = S.cur;
      closeModal();
      d.review.signed = { at: nowIso(), by: userName() };
      d.review.voided = (d.review.voided || []).filter((x) => x !== "sign");
      S.notice = null;
      audit("Semnare MSign", d, "Semnătură verificată · cererea JSON returnată de MSign");
      persist({ silent: true });
      render({ focusTitle: false });
      return;
    }
    if (t.closest("[data-gh-msign-cancel]")) {
      closeModal();
      S.notice = "msign-cancel";
      audit("Semnare MSign", S.cur, "Renunțat de utilizator · cererea rămâne nesemnată");
      render({ focusTitle: false });
    }
  }

  /* US-240 — Elimină schița: confirm + required reason */
  function openRemove(id) {
    const d = S.drafts.find((x) => x.id === id);
    if (!d || isPaid(d) || isSubmitted(d)) return;
    closeMenus();
    const note = d.payment && d.payment.status !== "Achitată" && d.payment.status !== "Anulată"
      ? U().renderNotice?.("warning", `Nota de plată ${esc(d.payment.nr)} (${esc(d.payment.status)}) primește statutul „Anulată”.`) || "" : "";
    openModal({
      kind: "remove",
      title: "Sigur doriți să eliminați schița cererii?",
      subtitle: `${d.nr} · ${serviceOf(d.service)?.title || ""}`,
      body: `
        <p class="e-permits-passport__lead">Schița dispare din „Dosare noi”, iar cererea primește statutul „Schiță”, substatutul „Eliminat”. Eliminarea se înregistrează în Jurnalul de audit.</p>
        ${note}
        ${R().fieldHtml?.({ id: "gh-remove-reason", type: "textarea", label: "Motivul eliminării", required: true, rows: 3, maxLength: 300, charCounter: true, placeholder: "De ex. solicitantul a renunțat la cerere" }) || ""}`,
      footer: `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-destructive btn-rounded" type="button" data-gh-remove-confirm="${esc(id)}">Elimină schița</button></div>`
    });
    requestAnimationFrame(() => document.querySelector("#fo-gh-remove-reason")?.focus());
  }
  function confirmRemove(id) {
    const d = S.drafts.find((x) => x.id === id);
    const field = document.querySelector("#fo-gh-remove-reason");
    const reason = field?.value.trim() || "";
    if (!reason) {
      R().setFieldError?.(field, REQUIRED);
      field?.closest(".e-permits-fo-textarea")?.classList.add("is-error");
      field?.focus();
      field?.addEventListener("input", () => { R().setFieldError?.(field, ""); field.closest(".e-permits-fo-textarea")?.classList.remove("is-error"); }, { once: true });
      return;
    }
    if (!d) return;
    const before = `${d.status} / ${d.substatus}`;
    d.removed = { at: nowIso(), by: userName(), reason, auto: false };
    d.status = "Schiță"; d.substatus = "Eliminat";
    if (d.payment && d.payment.status !== "Achitată") d.payment.status = "Anulată";
    audit("Eliminare schiță", d, `Motiv: ${reason} · ${before} → Schiță / Eliminat`);
    writeStore();
    updateBadge();
    closeModal();
    U().showShellToast?.(`Schița ${d.nr} a fost eliminată.`, "success");
    if (S.cur?.id === id) { S.cur = null; S.dirty = false; document.querySelector('[data-nav-item][data-nav-id="dosare-noi"]')?.click(); }
    else refreshRegistry();
  }

  /* US-241 AC-09 / AC-14 — export with the applied filters and the shown columns */
  let exportRowsCache = [];
  function openExport(rows) {
    exportRowsCache = rows;
    openModal({
      kind: "export",
      title: "Exportă lista",
      subtitle: `${plural(rows.length, "înregistrare", "înregistrări")} · filtrele aplicate și coloanele afișate`,
      body: `
        <div class="e-permits-fo-field">
          <label id="gh-export-format-label">Format</label>
          <div class="segmented-control is-animated" role="radiogroup" aria-labelledby="gh-export-format-label" data-fo-segment data-gh-export-format>
            <button class="segment-item is-selected" type="button" role="radio" aria-checked="true" tabindex="0" data-value="xlsx">Excel</button>
            <button class="segment-item" type="button" role="radio" aria-checked="false" tabindex="-1" data-value="csv">CSV</button>
          </div>
        </div>
        ${U().renderInfoNote?.("Lista conține date cu caracter personal: exportul se înregistrează în Jurnalul de audit.") || ""}`,
      footer: `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-gh-export-confirm>${icon("export", 20, "icon small")}<span>Exportă</span></button></div>`
    });
  }
  function runExport() {
    const format = document.querySelector("[data-gh-export-format] .segment-item.is-selected")?.dataset.value || "xlsx";
    const head = ["Număr cerere", "Denumirea serviciului", "Nume solicitant", "Compania", "Substatut", "Data creării", "Data ultimei modificări", "Data expirării notei de plată", "Data eliminării automate"];
    const rows = exportRowsCache.map((r) => [r.nr, r.serviciu, r.solicitant, r.companie, r.substatut, stamp(r.creat), stamp(r.modificat), longDate(r.expirareNota), longDate(r.eliminare)]);
    const name = `dosare-noi.${format === "csv" ? "csv" : "xls"}`;
    let blob;
    if (format === "csv") {
      const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      blob = new Blob(["﻿" + [head, ...rows].map((line) => line.map(cell).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    } else {
      blob = new Blob([`﻿<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((line) => `<tr>${line.map((v) => `<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>`], { type: "application/vnd.ms-excel;charset=utf-8" });
    }
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    S.audit.unshift({ at: nowIso(), user: userName(), action: "Export listă Dosare noi", detail: `${rows.length} înregistrări · ${format.toUpperCase()} · reușit`, personal: true });
    writeStore();
    closeModal();
    U().showShellToast?.(`Am exportat ${plural(rows.length, "înregistrare", "înregistrări")} în ${name}.`, "success");
  }

  /* „Istoricul cererii” — the request's audit entries, newest first */
  function openHistory() {
    const d = S.cur;
    const items = S.audit.filter((e) => e.cerere && e.cerere === d.nr);
    openModal({
      kind: "history",
      title: "Istoricul cererii",
      subtitle: `${d.nr} · Jurnalul de audit`,
      body: items.length ? `
        <div class="e-permits-stack"><ul class="e-permits-stack__list" role="list">
          ${items.map((e) => A().renderStackItem?.({ title: esc(e.action), meta: [esc(stamp(e.at)), esc(e.user)], meta2: e.detail ? [esc(e.detail)] : null, badges: e.personal ? [tagHtml("Date personale", "neutral")] : [] }) || "").join("")}
        </ul></div>`
        : window.GEAPEmptyState?.render({ title: "Nicio acțiune înregistrată în această sesiune", text: "Acțiunile seed-ului au fost înregistrate înainte de prototip.", icon: "history", compact: true }) || "",
      footer: '<div class="modal-buttons"><button class="btn btn-primary btn-rounded" type="button" data-case-close>Închide</button></div>'
    });
  }

  /* ---------------------------------------------------------------- document previews (#dosar-detail-modal, the A4 page) */
  const table = (pairs) => `<table><tbody>${pairs.map(([l, v]) => `<tr><td>${esc(l)}</td><td>${esc(v)}</td></tr>`).join("")}</tbody></table>`;
  function previewPage(kind) {
    const d = S.cur;
    const svc = serviceOf(d.service);
    const repPerson = d.personType === "PJ" ? d.applicant : d.rep.on ? d.rep : null;
    if (kind === "paper") {
      return `<h1>Cerere</h1><p>nr. ${esc(d.nr)} din ${esc(longDate(d.review.paper?.at || nowIso()))} · depusă la ghișeu</p>
        ${table([["Serviciul", svc?.title || ""], ["Tipul solicitării", d.requestType], ["Solicitant", holderName(d)], ["Cod de identificare", d.personType === "PJ" ? `IDNO ${d.company.idno}` : `IDNP ${d.applicant.idnp}`], ...(repPerson ? [[d.personType === "PJ" ? "Persoana care depune" : "Reprezentant", `${fullName(repPerson)}, IDNP ${repPerson.idnp}`], ["Temeiul reprezentării", basisLabel(d)]] : []), ["Telefon / email", [d.contact.phone ? `+373 ${formatPhone(d.contact.phone)}` : "", d.contact.email].filter(Boolean).join(" · ")], ...formOf(d).fields.map((f) => [f.label, d.details.values[f.key] || "—"]), ...(formOf(d).address ? [["Adresa obiectului", addressText(d.details.address) || "—"]] : []), ["Subdiviziunea de procesare", d.details.subdivision || "—"], ["Termen de examinare", termOf(d)?.label || "—"]])}
        <p>Documente anexate: ${esc(docsOf(d).filter((doc) => (d.docs[doc.id] || []).length).map((doc) => doc.label).join("; ") || "—")}.</p>
        <p>Consimțământ: în conformitate cu Legea nr. 133 din 08.07.2011, sunt de acord cu prelucrarea datelor mele cu caracter personal pentru examinarea cererii și cu primirea notificărilor despre dosar prin MNotify, la datele de contact indicate.</p>
        <p>Semnătura solicitantului: ______________________ &nbsp; Data: ____________</p>`;
    }
    if (kind === "signed") {
      return `<h1>Cererea semnată MSign</h1><p>Documentul cererii ${esc(d.nr)} în format JSON, returnat de MSign</p>
        ${table([["Număr cerere", d.nr], ["UID", d.uid], ["Serviciul", svc?.title || ""], ["Tipul solicitării", d.requestType], ["Solicitant", holderName(d)], ["Canal de depunere", "Ghișeu"], ["Semnat de", d.review.signed?.by || ""], ["Data semnării", stamp(d.review.signed?.at)], ["Verificarea semnăturii", "Validă"]])}`;
    }
    return `<h1>Certificat constatator</h1><p>Confirmă depunerea cererii în SIA GEAP</p>
      ${table([["Numărul dosarului", d.nr], ["Serviciul", svc?.title || ""], ["Solicitant", holderName(d)], ["Data depunerii", stamp(d.submittedAt)], ["Termen de examinare", longDate(d.examDeadline)], ["Canal de depunere", "Ghișeu"]])}
      <p>Semnat electronic · MSign · SIA GEAP · ${esc(longDate(d.submittedAt))}</p>`;
  }
  function openPreview(kind, trigger = null) {
    const d = S.cur;
    const m = document.querySelector("#dosar-detail-modal");
    if (!m || !d) return;
    const titles = { paper: ["Cererea pe hârtie", `${d.nr} · generată prin MDocs · ${stamp(d.review.paper?.at)}`], signed: ["Cererea semnată MSign", `${d.nr} · JSON · semnată ${stamp(d.review.signed?.at)}`], cert: ["Certificatul constatator", `${d.nr} · generat la depunere`] };
    const [title, subtitle] = titles[kind];
    m.querySelector("[data-dosar-detail-title]").textContent = title;
    m.querySelector("[data-dosar-detail-subtitle]").textContent = subtitle;
    m.querySelector("[data-dosar-detail-body]").innerHTML = `
      <div class="e-permits-doc-peek__canvas e-permits-detail-modal__preview" data-dosar-doc-canvas role="img" aria-label="Previzualizare: ${esc(title)}">
        <div class="e-permits-dtpl__page e-permits-doc-peek__page"><div class="e-permits-dtpl__surface">${previewPage(kind)}</div></div>
      </div>`;
    m.querySelector("[data-dosar-detail-buttons]").innerHTML = `
      ${kind === "paper" ? '<button class="btn btn-neutral btn-rounded" type="button" data-gh-print>Printează</button>' : ""}
      <button class="btn btn-primary btn-rounded" type="button" data-gh-download="${kind}">${icon("page-download", 20, "icon small")}<span>Descarcă</span></button>`;
    if (!m.dataset.ghBound) {
      m.dataset.ghBound = "1";
      m.addEventListener("click", (event) => {
        const dl = event.target.closest("[data-gh-download]");
        if (dl) { download(dl.dataset.ghDownload); return; }
        if (event.target.closest("[data-gh-print]")) { audit("Tipărire cerere pe hârtie", S.cur, ""); U().showShellToast?.("Cererea a fost trimisă la imprimantă.", "success"); }
      });
    }
    window.__modal?.open?.("#dosar-detail-modal");
    if (trigger) trigger.setAttribute("aria-expanded", "true");
  }
  function download(kind) {
    const d = S.cur;
    if (!d) return;
    const names = { paper: `cerere-${d.nr}.pdf`, signed: `cerere-${d.nr}.json`, cert: `certificat-constatator-${d.nr}.pdf`, note: `nota-de-plata-${d.payment?.nr}.pdf` };
    const text = kind === "signed"
      ? JSON.stringify({ numarCerere: d.nr, uid: d.uid, serviciu: d.service, tipSolicitare: d.requestType, canal: "Ghișeu", solicitant: holderCode(d), semnatura: { semnatar: d.review.signed?.by, data: d.review.signed?.at, valida: true } }, null, 2)
      : kind === "note"
      ? [`Nota de plată ${d.payment?.nr}`, `Cererea ${d.nr}`, ...(d.payment?.lines || []).map((l) => `${l.name} · ${l.account} · ${mdl(l.amount)}`), `Total: ${mdl(d.payment?.total || 0)}`, `Termen de achitare: ${longDate(d.payment?.due)}`, "Achitare prin MPay: mpay.gov.md"].join("\n")
      : document.createElement("div").appendChild(Object.assign(document.createElement("div"), { innerHTML: previewPage(kind) })).textContent;
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" })), download: names[kind] });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    audit(kind === "note" ? "Descărcare formă de tipar notă de plată" : "Descărcare document", d, names[kind]);
    writeStore();
  }

  /* ---------------------------------------------------------------- page-wide hooks */
  document.addEventListener("click", (event) => {
    const t = event.target;
    if (t.closest('[data-workplace-add-product="gh-new"], [data-gh-new]')) { event.preventDefault(); history.pushState(null, "", `${window.location.pathname}${window.location.search}#ghiseu/nou`); route("nou"); return; }
    const open = t.closest("[data-gh-open]");
    if (open) { event.preventDefault(); event.stopPropagation(); openDraftFromList(open.dataset.ghOpen); return; }
    const rm = t.closest("[data-gh-remove]");
    if (rm) { event.preventDefault(); if (rm.getAttribute("aria-disabled") === "true") return; openRemove(rm.dataset.ghRemove); return; }
  }, true);
  /* the menu badge = drafts in Dosare noi (US-68 AC-02) */
  document.addEventListener("DOMContentLoaded", () => {
    load().then(updateBadge);
    const nav = document.querySelector("[data-shell-nav]");
    if (nav) new MutationObserver(updateBadge).observe(nav, { childList: true });
  });

  /* for demo states and checks */
  window.GEAPGhiseu = {
    get state() { return S; },
    load,
    route,
    go: (stepId) => go(STEP_INDEX[stepId], { validate: false }),
    next: () => go(nextStepIndex(S.cur, S.step)),
    fill: (stepId) => { fillDemo(S.cur, STEP_INDEX[stepId] + 1); render({ focusTitle: false }); },
    save: () => S.page.querySelector("[data-gh-save]")?.click(),
    paid: () => mpayCallback(),
    expire: () => { if (S.cur?.payment) { S.cur.payment.status = "Expirată"; syncSubstatus(S.cur); persist({ silent: true }); render({ focusTitle: false }); } },
    steps: STEPS.map((s) => s.id)
  };
})();
