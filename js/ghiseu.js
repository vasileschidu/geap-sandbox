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
    { id: "solicitant", label: "Date solicitant" },
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
  const actsOf = (d) => (S.data.acts?.[holderCode(d)] || []).filter((a) => a.service === d.service);
  const actById = (d, id) => (S.data.acts?.[holderCode(d)] || []).find((a) => a.id === id) || null;
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
      service: "", requestType: "Emitere primară", process: "primar", act: null,
      personType: "", applicant: { idnp: "", nume: "", prenume: "", state: "" }, company: { idno: "", denumire: "", state: "" },
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
    d.process = seed.act ? "post" : "primar"; d.act = seed.act || null;
    d.by = seed.by === "self" ? userName() : seed.by;
    d.createdAt = dayAt(seed.createdDays, seed.createdTime);
    const upd = new Date(Date.now() + seed.updatedHours * 3600000);
    d.updatedAt = isoOf(upd < new Date(d.createdAt) ? new Date(d.createdAt) : upd);
    const p = person(seed.applicant);
    d.applicant = { idnp: seed.applicant, nume: p?.nume || "", prenume: p?.prenume || "", state: "found" };
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
    if (upTo > STEP_INDEX.solicitant && !d.contact.phone) {
      const c = mn[holderCode(d)] || mn[d.applicant.idnp] || {};
      d.contact = { phone: c.phone || "69000111", email: c.email || "", phoneSrc: c.phone ? "mnotify" : "manual", emailSrc: c.email ? "mnotify" : "manual" };
    } else if (upTo >= STEP_INDEX.solicitant && !d.contact.phoneSrc) {
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
    tip: d.requestType,
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
        nr: { label: "Număr cerere", width: 168, sortable: true },
        serviciu: { label: "Denumirea serviciului", width: 240, fill: true, sortable: true },
        solicitant: { label: "Nume solicitant", width: 180, sortable: true },
        companie: { label: "Compania", width: 168, sortable: true },
        substatut: { label: "Substatut", width: 136, sortable: true },
        creat: { label: "Data creării", width: 168, sortable: true },
        modificat: { label: "Data ultimei modificări", width: 184, sortable: true },
        expirareNota: { label: "Data expirării notei de plată", width: 196, sortable: true },
        eliminare: { label: "Data eliminării automate", width: 184, sortable: true },
        actiuni: { label: "", width: 152 }
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
        case "solicitant": return `
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
  const roleTitle = (label) => `<div class="e-permits-fo-form__role-title"><h2>${esc(label)}</h2></div>`;
  const roleCard = ({ name, idLabel, idValue, pj = false, tag = "" }) => {
    const initials = name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    return `
      <div class="e-permits-fo-selected-role">
        <span class="e-permits-fo-selected-role__inner">
          ${pj
            ? `<span class="e-permits-fo-selected-role__avatar e-permits-fo-selected-role__avatar--icon e-permits-fo-selected-role__avatar--brand" aria-hidden="true">${icon("suitcase-2")}</span>`
            : `<span class="e-permits-fo-selected-role__avatar e-permits-fo-selected-role__avatar--initials e-permits-fo-selected-role__avatar--brand" aria-hidden="true">${esc(initials)}</span>`}
          <span class="e-permits-fo-selected-role__copy">
            <strong>${esc(name)}</strong>
            <span class="e-permits-fo-selected-role__meta">
              <span class="e-permits-fo-selected-role__id">
                <span class="e-permits-fo-selected-role__id-label">${esc(idLabel)}</span>
                ${R().copyValueHtml?.(idValue, { ariaLabel: `Copiază ${idLabel} ${idValue}`, className: "e-permits-fo-selected-role__copy-id" }) || esc(idValue)}
              </span>
              ${tag}
            </span>
          </span>
        </span>
      </div>`;
  };
  const readonlyField = ({ id = "", label, value, span = 6, hint = "", required = false, check = true }) => `
    <div class="e-permits-fo-field e-permits-fo-field--span-${span}">
      <label${id ? ` id="${id}-label"` : ""}>${esc(label)}${required ? ` ${req()}` : ""}</label>
      <div class="e-permits-fo-input is-filled is-readonly">
        <span class="e-permits-fo-input__value"${id ? ` id="${id}" role="textbox" aria-readonly="true" aria-labelledby="${id}-label"` : ""} title="${esc(value)}">${esc(value)}</span>
        ${check ? icon("checkmark-small") : ""}
      </div>
      ${hint ? `<p class="e-permits-fo-field__hint"${id ? ` id="${id}-hint"` : ""}>${esc(hint)}</p>` : ""}
    </div>`;
  const section = (title, body, { id = "", desc = "", attrs = "" } = {}) => `
    <section class="e-permits-fo-form__section"${id ? ` aria-labelledby="${id}"` : ""} ${attrs}>
      ${desc ? `<div class="e-permits-fo-section-header"><h2${id ? ` id="${id}"` : ""}>${esc(title)}</h2><p class="e-permits-fo-section-header__desc">${desc}</p></div>` : `<h2${id ? ` id="${id}"` : ""}>${esc(title)}</h2>`}
      ${body}
    </section>`;

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
          <div class="modal--footer e-permits-gh-sheet__footer" data-gh-footer></div>
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
    const menu = d.id && !isSubmitted(d) ? (A().renderStackMenu?.([
      { label: "Istoricul cererii", icon: "history", attrs: "data-gh-history" },
      { label: "Elimină schița", icon: "delete", danger: true, attrs: `data-gh-remove="${esc(d.id)}"${removable ? "" : ' aria-disabled="true" data-tooltip-reason="Nota de plată este achitată: schița nu se mai poate elimina."'}` }
    ], d.nr) || "").replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>") : "";
    const statusTags = `${tagHtml(d.status, d.status === "În procesare" ? "info" : d.status === "Respins formal" ? "danger" : "neutral")}${d.substatus && d.substatus !== d.status ? ` ${tagHtml(d.substatus, SUB_TONE[d.substatus] || "neutral")}` : ""}`;
    const meta = [d.nr || "Nesalvat", holderName(d), d.requestType, "Ghișeu"].filter(Boolean).map((x) => `<span class="e-permits-gh-sheet__meta-part">${esc(x)}</span>`).join("");
    const saved = isSubmitted(d) ? `Depus la ${stamp(d.submittedAt)}` : d.updatedAt && d.id ? `Salvat la ${stamp(d.updatedAt)} · eliminare automată la ${longDate(retentionEnd(d))}` : "Nesalvat";
    return `
      <div class="e-permits-gh-sheet__title">
        <h2 class="modal--header-title" id="gh-sheet-title" title="${esc(svc?.title || "")}">${esc(svc?.title || "Dosar nou")}</h2>
        <div class="e-permits-gh-sheet__meta">${meta}<span class="e-permits-gh__tags">${statusTags}</span></div>
        <p class="e-permits-gh-sheet__saved" aria-live="polite">${esc(saved)}</p>
      </div>
      <div class="e-permits-gh-sheet__actions">
        ${isSubmitted(d) ? "" : `<button class="btn btn-neutral btn-sm" type="button" data-gh-save><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg?v=draft-icons-v1#icon-cloud-upload-draft"></use></svg><span>Salvează schița</span></button>`}
        ${menu}
      </div>`;
  }
  function stepperHtml(d) {
    const steps = visibleSteps(d).filter((s) => s.id !== "initiere");
    const reach = Math.max(d.maxStep || 0, S.step);
    return `
      <nav class="e-permits-fo-stepper" aria-label="Pașii cererii">
        <ol>
          ${steps.map((step, n) => {
            const i = STEP_INDEX[step.id];
            const active = i === S.step;
            const done = !active && (i < S.step || i < reach);
            /* US-237 AC-14: once paid, the request's fields are closed — only the note and the confirmation stay open */
            const open = !active && i <= reach && !isSubmitted(d) && !(isPaid(d) && i < STEP_INDEX.plata);
            return `
              <li class="e-permits-fo-stepper__item${active ? " is-active" : ""}${done || (isSubmitted(d) && !active) ? " is-completed" : ""}"${active ? ' aria-current="step"' : ""} data-gh-step="${i}">
                <span class="e-permits-fo-stepper__connector" aria-hidden="true"></span>
                <span class="e-permits-fo-stepper__row" ${open ? `role="button" tabindex="0" aria-label="Deschide pasul ${n + 1}: ${esc(step.label)}" data-gh-goto="${i}"` : 'aria-disabled="true"'}>
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
    const steps = visibleSteps(d).filter((s) => s.id !== "initiere");
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
  /* a step names its footer (sticky in the sheet): Înapoi · Continuă, or its own buttons */
  function footerHtml(d, opts = {}) { S.footer = opts; return ""; }
  function sheetFooterHtml(d) {
    const o = S.footer || {};
    if (o.custom) return `<div class="modal-buttons e-permits-gh-sheet__buttons">${o.custom}</div>`;
    const { next = "Continuă", nextAttrs = "data-gh-next", nextDisabled = false, back = true, hint = "" } = o;
    const prevIndex = prevStepIndex(d, S.step);
    const prev = S.step > 0 && back ? STEPS[prevIndex] : null;
    return `
      <div class="modal-buttons e-permits-gh-sheet__buttons">
        ${prev ? `<button class="btn btn-neutral btn-rounded" type="button" aria-label="Înapoi la ${esc(prev.label)}" ${prevIndex === 0 ? 'data-gh-goto="0"' : "data-gh-prev"}>${icon("arrow-left", 20, "icon small")}<span>Înapoi</span></button>` : ""}
        ${hint ? `<p class="e-permits-gh-sheet__hint">${esc(hint)}</p>` : ""}
        ${next ? `<button class="btn btn-primary btn-rounded" type="button" ${nextAttrs}${nextDisabled ? " disabled" : ""}>${esc(next)}</button>` : ""}
      </div>`;
  }
  function render({ focusTitle = true } = {}) {
    const d = S.cur;
    if (!d) return;
    if (S.step === 0) { closeSheet(); renderStart(); return; }
    const ov = ensureSheet();
    S.page = ov;
    if (d.step < S.step && !isSubmitted(d)) d.step = S.step;
    S.footer = null;
    const panel = STEP_RENDER[STEPS[S.step].id](d);
    ov.querySelector("[data-gh-header]").innerHTML = sheetHeaderHtml(d);
    ov.querySelector("[data-gh-body]").innerHTML = `
      ${progressHtml(d)}
      <div class="e-permits-fo-request__inner e-permits-gh__inner">
        <aside class="e-permits-fo-request__sidebar e-permits-gh__sidebar" aria-label="Pașii cererii">${stepperHtml(d)}</aside>
        <form class="e-permits-fo-form e-permits-gh__form" novalidate data-gh-form>
          <div class="e-permits-fo-step-panel" data-gh-panel="${STEPS[S.step].id}">${panel}</div>
        </form>
      </div>`;
    ov.querySelector("[data-gh-footer]").innerHTML = sheetFooterHtml(d);
    openSheet();
    bindPanel();
    setHash(`#ghiseu/${encodeURIComponent(d.id)}/${STEPS[S.step].id}`);
    ov.querySelector("[data-gh-body]").scrollTop = 0;
    if (focusTitle) requestAnimationFrame(() => ov.querySelector("[data-gh-panel] h2[tabindex]")?.focus({ preventScroll: true }));
  }
  /* the picker (US-233): service, applicant, representative + basis, process — Continuă creates the draft */
  function renderStart() {
    const d = S.cur;
    const ov = ensureStart();
    S.page = ov;
    S.startFrom = d.id ? "sheet" : "list";
    ov.querySelector("[data-gh-start-title]").textContent = d.id ? `Inițiere cerere · ${d.nr}` : "Dosar nou";
    const sub = ov.querySelector("[data-gh-start-subtitle]");
    sub.hidden = false;
    sub.textContent = d.id ? "Solicitantul, reprezentantul și procesul se modifică doar aici." : "Alegeți serviciul, identificați solicitantul și procesul. Cererea se deschide după „Continuă”.";
    ov.querySelector("[data-gh-start-body]").innerHTML = `<div class="e-permits-gh-start__form" data-gh-panel="initiere">${STEP_RENDER.initiere(d)}</div>`;
    ov.querySelector("[data-gh-start-footer]").innerHTML = '<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-gh-start-cancel>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-gh-start-next disabled>Continuă</button></div>';
    if (!ov.classList.contains("is-active")) { S.startHandled = false; window.__modal?.open?.(`#${START_ID}`); }
    bindPanel();
    syncStart();
    setHash(d.id ? `#ghiseu/${encodeURIComponent(d.id)}/initiere` : "#ghiseu/nou");
  }
  /* Continuă is enabled once US-233's choices are complete (the errors sit under the fields) */
  function syncStart() {
    if (S.step !== 0 || !S.cur) return;
    const btn = document.querySelector(`#${START_ID} [data-gh-start-next]`);
    if (!btn) return;
    collectInitiere();
    btn.disabled = dataCheckInitiere(S.cur).length > 0;
  }
  function continueStart() {
    const errs = validateInitiere();
    if (errs.length) { showErrors(errs); return; }
    voidIfChanged();
    S.startHandled = true;
    closeStart();
    S.step = 1;
    persist();
    render();
  }
  /* partial redraws keep the rest of the step (and its typed values) */
  function redrawBlock(name) {
    const block = S.page?.querySelector(`[data-gh-block="${name}"]`);
    if (!block) return;
    const html = BLOCK_RENDER[name](S.cur);
    const holder = document.createElement("div");
    holder.innerHTML = html;
    const next = holder.firstElementChild;
    block.replaceWith(next);
    R().bind?.(next);
    BLOCK_BIND[name]?.(next);
    syncStart();
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
    ov.querySelector("[data-gh-footer]").innerHTML = sheetFooterHtml(d);
  };
  const stepHeader = (title, lead = "") => `
    <header class="e-permits-fo-form__header e-permits-gh__step-header">
      <h2 tabindex="-1">${esc(title)}</h2>
      ${lead ? `<p class="e-permits-gh__lead">${lead}</p>` : ""}
    </header>`;

  /* ================================================================ step 1 · Inițiere (US-233) */
  const DOWN_MSG = "Registrul de stat nu răspunde acum. Completați datele manual.";
  const NOT_FOUND_MSG = "Persoana nu a fost găsită în registrul de stat.";
  const mconnectDown = () => params.get("mconnect") === "0";

  function codeGroupHtml(kind, d) {
    const conf = {
      company: { code: "IDNO", value: d.company.idno, state: d.company.state, targets: [["name", "Denumirea companiei", 8, d.company.denumire, "Se completează din RSUD după IDNO"]] },
      applicant: { code: "IDNP", value: d.applicant.idnp, state: d.applicant.state, targets: [["last", "Nume", 4, d.applicant.nume, "Din RSP, după IDNP"], ["first", "Prenume", 4, d.applicant.prenume, "Din RSP, după IDNP"]] },
      rep: { code: "IDNP", value: d.rep.idnp, state: d.rep.state, targets: [["last", "Nume reprezentant", 4, d.rep.nume, "Din RSP, după IDNP"], ["first", "Prenume reprezentant", 4, d.rep.prenume, "Din RSP, după IDNP"]] }
    }[kind];
    const id = `gh-${kind}`;
    const label = kind === "company" ? "IDNO" : kind === "rep" || d.personType === "PJ" ? "IDNP reprezentant" : "IDNP";
    const found = conf.state === "found";
    const manual = conf.state === "manual";
    const codeLocked = found || manual;
    return `
      <div class="e-permits-fo-field-group" data-gh-lookup="${kind}">
        <div class="e-permits-fo-field e-permits-fo-field--span-4">
          <div class="e-permits-fo-field__label-counter"><label for="${id}">${esc(label)} ${req()}</label><span class="e-permits-fo-field__counter" data-fo-digits-counter>${(conf.value || "").length}/13</span></div>
          <div class="e-permits-fo-input${codeLocked ? " is-filled is-readonly has-value" : ""}">
            <input id="${id}" type="text" inputmode="numeric" maxlength="13" placeholder="Introdu ${conf.code}" autocomplete="off" aria-describedby="${id}-hint" aria-required="true" value="${esc(conf.value || "")}"${codeLocked ? " readonly" : ""} data-fo-digits data-fo-registry-code data-gh-code="${kind}">
            ${codeLocked ? `<button type="button" class="btn-icon clear" aria-label="Schimbă ${esc(conf.code)}-ul" data-gh-reset="${kind}">${icon("cross-small", 20, "icon small")}</button>` : ""}
          </div>
          <p class="e-permits-fo-field__hint" id="${id}-hint" data-fo-field-hint>${found ? `Preluat din ${kind === "company" ? "RSUD" : "RSP"} prin MConnect` : manual ? "Registrul nu a răspuns · introdus manual" : "13 cifre"}</p>
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
    const b = basisOf(d);
    if (!b || b.kind === "self") return '<div data-gh-block="basis" class="e-permits-gh__basis" hidden></div>';
    const filer = d.personType === "PJ" ? fullName(d.applicant) : fullName(d.rep);
    const holder = holderName(d);
    let body = "";
    if (b.kind === "rsud") body = U().renderNotice?.("success", `<strong>Temeiul reprezentării: Administrator în RSUD.</strong> ${esc(filer)} este administratorul ${esc(holder)}, fără procură.`) || "";
    else if (b.kind === "mpower") body = U().renderNotice?.("success", `<strong>Temeiul reprezentării: Împuternicire MPower</strong> nr. ${esc(b.nr)}, valabilă până la ${esc(longDate(b.until))}. ${esc(filer)} reprezintă ${esc(holder)}, fără procură.`) || "";
    else {
      body = `
        ${U().renderNotice?.("warning", b.manual
          ? "<strong>Legătura nu se poate confirma electronic</strong> cât timp registrul de stat nu răspunde. Verificați procura pe hârtie prezentată de reprezentant."
          : `<strong>Legătura nu este confirmată electronic.</strong> ${esc(filer)} nu este ${d.personType === "PJ" ? "administrator în RSUD și nu are" : "împuternicit în MPower de"} ${d.personType === "PJ" ? `împuternicire MPower pentru ${esc(holder)}` : esc(holder)}. Verificați procura pe hârtie prezentată de reprezentant.`) || ""}
        <div class="e-permits-check-options e-permits-gh__procura">
          ${U().renderCheckOption?.({ label: "Prin procură", required: true, checked: d.procura, attrs: 'data-gh-procura aria-describedby="gh-err-procura"' }) || ""}
        </div>
        ${d.procura ? errSlot("procura") : `<span class="message message--inline message--error e-permits-fo-field__error" id="gh-err-procura" data-gh-err="procura" role="alert">${ERR_ICON}<span>Legătura nu este confirmată electronic. Bifați «Prin procură», după verificarea procurii pe hârtie.</span></span>`}
        ${d.procura ? `<p class="e-permits-fo-field__hint">Temeiul reprezentării: Procură. Copia scanată a procurii se atașează la pasul „Documente însoțitoare”.</p>` : ""}`;
    }
    return `<div data-gh-block="basis" class="e-permits-gh__basis">${body}</div>`;
  }
  function applicantBlockHtml(d) {
    if (!d.service) {
      return `<div data-gh-block="applicant">${section("Solicitantul", `<div class="e-permits-fo-form__section-body e-permits-fo-form__section-body--single">${U().renderInfoNote?.("Alegeți serviciul: tipul de persoană și actele titularului depind de el.") || ""}</div>`, { id: "gh-applicant-title" })}</div>`;
    }
    const types = applicantTypesOf(d.service);
    const typeField = types.length > 1
      ? R().fieldHtml({ id: "gh-tip", type: "segment", label: "Tip persoană", required: true, span: 12, value: d.personType, options: [{ value: "PF", label: "Persoană fizică" }, { value: "PJ", label: "Persoană juridică" }] }).replace("data-fo-segment", "data-fo-segment data-gh-type") + errSlot("tip")
      : readonlyField({ id: "gh-tip-fix", label: "Tip persoană", value: types[0] === "PJ" ? "Persoană juridică" : "Persoană fizică", span: 6, hint: "Singurul tip de solicitant configurat pentru serviciu." });
    let rows = "";
    if (d.personType === "PJ") {
      rows = `${codeGroupHtml("company", d)}${codeGroupHtml("applicant", d)}`;
    } else if (d.personType === "PF") {
      rows = `${codeGroupHtml("applicant", d)}
        <div class="e-permits-fo-field e-permits-fo-field--span-12">
          <div class="e-permits-check-options">${U().renderCheckOption?.({ label: "Cererea se depune de un reprezentant", checked: d.rep.on, attrs: "data-gh-rep-toggle" }) || ""}</div>
        </div>
        ${d.rep.on ? codeGroupHtml("rep", d) : ""}`;
    }
    return `
      <div data-gh-block="applicant">
        ${section("Solicitantul", `
          <div class="e-permits-fo-form__section-body">
            ${typeField}
            ${rows}
          </div>
          ${basisHtml(d)}`, { id: "gh-applicant-title", desc: d.personType === "PJ" ? "Verificați actul de identitate al persoanei care depune. Datele se preiau din RSUD și RSP prin MConnect." : d.personType ? "Verificați actul de identitate al solicitantului. Datele se preiau din RSP prin MConnect." : "" })}
      </div>`;
  }
  const PP_ICONS = { "Prelungire": "rotate-arrow", "Reperfectare": "edit", "Emitere duplicat": "copy", "Suspendare valabilitate": "pause", "Reluarea valabilității": "rotate-arrow", "Retragere": "cross-small", "Contestație": "flag" };
  function processBlockHtml(d) {
    const identified = d.service && d.personType && (d.personType === "PJ" ? d.company.state : d.applicant.state);
    const radio = (value, title, descText) => `
      <label class="e-permits-fo-radio e-permits-fo-radio--option e-permits-fo-radio--span-6">
        <input type="radio" name="gh-proces" value="${value}"${d.process === value ? " checked" : ""} data-gh-process>
        <span class="e-permits-fo-radio__control" aria-hidden="true"></span>
        <span class="e-permits-fo-radio__copy"><strong>${esc(title)}</strong><span class="e-permits-fo-radio__copy-desc">${esc(descText)}</span></span>
      </label>`;
    let list = "";
    if (d.process === "post") {
      if (!identified) list = U().renderInfoNote?.("Identificați solicitantul: lista arată actele permisive și deciziile titularului pentru serviciul ales.") || "";
      else {
        const acts = actsOf(d);
        list = acts.length ? `
          <div class="e-permits-stack e-permits-gh__acts">
            <ul class="e-permits-stack__list" role="list" aria-label="Actele permisive și deciziile titularului">
              ${acts.map((act) => {
                const [label, tone] = ACT_TONE[act.status] || [act.status, "neutral"];
                const chosen = d.act === act.id;
                const pps = postprocessesOf(d, act);
                const meta = act.kind === "decizie"
                  ? [esc(act.nr), `${esc(act.decizie)} · emisă acum ${plural(act.emisZileInUrma, "zi", "zile")}`, esc(act.subdiviziune)]
                  : [esc(act.nr), `valabil până la ${esc(longDate(act.valabilPana))}`, esc(act.subdiviziune)];
                return A().renderStackItem?.({
                  leadHtml: R().docIconHtml?.({ sursa: "mdocs" }, "e-permits-fo-lib-item__icon") || "",
                  title: esc(act.name),
                  plainTitle: act.name,
                  badges: [tagHtml(label, tone), chosen ? tagHtml(`Ales: ${d.requestType}`, "brand") : ""].filter(Boolean),
                  meta: [...meta, pps.length ? "" : "fără postprocese disponibile"].filter(Boolean),
                  actionsHtml: pps.length ? (A().renderStackMenu?.(pps.map((pp) => ({ label: pp, icon: PP_ICONS[pp] || "arrow-right", attrs: `data-gh-pp="${esc(act.id)}" data-gh-pp-type="${esc(pp)}"` })), `postprocese ${act.nr}`) || "").replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>") : ""
                }) || "";
              }).join("")}
            </ul>
          </div>
          ${errSlot("act")}
          ${d.act ? U().renderInfoNote?.(`Tipul solicitării: <strong>${esc(d.requestType)}</strong> · ${esc(actById(d, d.act)?.nr || "")}. Datele actului se precompletează în „Detalii serviciu”.`) || "" : ""}`
          : `${window.GEAPEmptyState?.render({ title: "Titularul nu are acte permisive sau decizii pentru acest serviciu.", text: "Alegeți „Emitere primară” sau verificați serviciul și codul titularului.", icon: "page-text", compact: true }) || ""}${errSlot("act")}`;
      }
    }
    return `
      <div data-gh-block="process">
        ${section("Procesul", `
          <div class="e-permits-fo-form__section-body e-permits-fo-form__section-body--single">
            <fieldset class="e-permits-fo-radio-group">
              <legend class="u-visually-hidden">Procesul</legend>
              ${radio("primar", "Emitere primară", "Cerere pentru un act permisiv nou")}
              ${radio("post", "Postproces", "Pe un act permisiv sau o decizie a titularului")}
            </fieldset>
            ${list}
          </div>`, { id: "gh-process-title" })}
      </div>`;
  }
  function stepInitiere(d) {
    const services = deskServices();
    const svcField = R().fieldHtml({
      id: "gh-serviciu", type: "combobox", label: "Denumirea serviciului", required: true, span: 12,
      placeholder: "Alege serviciul", searchLabel: "Caută după denumire",
      emptyTitle: "Nu există servicii care să corespundă căutării.", emptyText: "Caută după o parte din denumire.",
      options: services.map((s) => ({ code: s.code, label: s.title }))
    });
    return `
      ${section("Serviciul", `<div class="e-permits-fo-form__section-body" data-gh-service>${svcField}${errSlot("serviciu")}</div>`, { id: "gh-service-title" })}
      ${applicantBlockHtml(d)}
      ${processBlockHtml(d)}
      ${footerHtml(d)}`;
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
      collectInitiere();
      d.service = code;
      const types = applicantTypesOf(code);
      if (types.length === 1) d.personType = types[0];
      else if (!types.includes(d.personType)) d.personType = "";
      if (d.process === "post") { d.act = null; d.requestType = "Emitere primară"; }
      clearErr("serviciu");
      S.dirty = true;
      redrawBlock("applicant"); redrawBlock("process"); refreshChrome();
    });
    BLOCK_BIND.applicant(panel.querySelector('[data-gh-block="applicant"]'));
  }
  const BLOCK_RENDER = { applicant: applicantBlockHtml, process: processBlockHtml, basis: basisHtml };
  const BLOCK_BIND = {
    applicant(block) {
      if (!block) return;
      block.querySelectorAll("[data-gh-lookup]").forEach((group) => bindLookup(group));
      block.querySelector("[data-gh-type]")?.addEventListener("change", (event) => {
        const v = event.currentTarget.querySelector(".segment-item.is-selected")?.dataset.value || "";
        if (v === S.cur.personType) return;
        collectInitiere();
        S.cur.personType = v; S.cur.rep.on = false; S.cur.procura = false;
        if (S.cur.process === "post") { S.cur.act = null; S.cur.requestType = "Emitere primară"; }
        S.dirty = true;
        redrawBlock("applicant"); redrawBlock("process"); refreshChrome();
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
      hintText: "13 cifre",
      targets: [...group.querySelectorAll("[data-fo-registry-target]")].map((target) => ({ input: target, value: (record) => record[target.dataset.foRegistryTarget] || "" })),
      live: group.querySelector("[data-fo-registry-live]"),
      find: (code) => {
        if (mconnectDown()) return null;
        if (isCompany) { const c = company(code); return c ? { name: c.denumire } : null; }
        const p = person(code); return p ? { last: p.nume, first: p.prenume } : null;
      },
      loadingText: isCompany ? "Se caută compania în RSUD prin MConnect…" : "Se caută persoana în RSP prin MConnect…",
      notFound: NOT_FOUND_MSG,
      foundText: (record) => (isCompany ? `Denumirea companiei a fost preluată din RSUD: ${record.name}.` : `Numele a fost preluat din RSP: ${record.last} ${record.first}.`),
      setError: (inp, msg) => R().setFieldError?.(inp, msg && mconnectDown() ? DOWN_MSG : msg)
    });
    S.lookups[kind] = lookup;
    input.addEventListener("input", () => {
      if (input.getAttribute("aria-invalid") === "true") R().setFieldError?.(input, "");
      const before = lookup.code;
      lookup.onInput();
      if (lookup.pending && lookup.code !== before) {
        audit("Solicitare date MConnect", S.cur, `${isCompany ? "RSUD · IDNO" : "RSP · IDNP"} ${lookup.code}`, { persoana: lookup.code });
        const asked = lookup.code;
        lookup.pending.then(() => { if (lookup.code === asked) afterLookup(kind, lookup); });
      }
    });
  }
  function afterLookup(kind, lookup) {
    const d = S.cur;
    const slot = kind === "company" ? d.company : kind === "rep" ? d.rep : d.applicant;
    if (kind === "company") slot.idno = lookup.code; else slot.idnp = lookup.code;
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
    redrawBlock("process");
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
  function validateInitiere() {
    collectInitiere();
    const d = S.cur;
    const errs = [];
    if (!d.service) errs.push({ key: "serviciu", focus: "#fo-gh-serviciu", msg: REQUIRED });
    else {
      if (!d.personType) errs.push({ key: "tip", focus: "[data-gh-type] .segment-item", msg: REQUIRED });
      const codeErr = (kind, value, state, len = 13) => {
        if (!value) return REQUIRED;
        if (value.length !== len) return `${kind === "company" ? "IDNO" : "IDNP"}-ul are 13 cifre.`;
        if (!state) return mconnectDown() ? DOWN_MSG : NOT_FOUND_MSG;
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
      if (d.personType === "PJ") { check("company", d.company, d.company.idno); check("applicant", d.applicant, d.applicant.idnp); }
      if (d.personType === "PF") { check("applicant", d.applicant, d.applicant.idnp); if (d.rep.on) check("rep", d.rep, d.rep.idnp); }
      /* AC-21: no electronic link and no „Prin procură” */
      if (!errs.length && needsProcura(d) && !d.procura) errs.push({ key: "procura", focus: "[data-gh-procura]", msg: "Legătura nu este confirmată electronic. Bifați «Prin procură», după verificarea procurii pe hârtie." });
      if (d.process === "post" && !d.act) errs.push({ key: "act", focus: ".e-permits-gh__acts [data-stack-menu-trigger]", msg: "Alegeți actul permisiv sau decizia și postprocesul din meniul «⋮»." });
    }
    return errs;
  }

  /* ================================================================ step 2 · Date solicitant (US-234) */
  function stepSolicitant(d) {
    const phoneRO = d.contact.phoneSrc === "mnotify";
    const emailRO = d.contact.emailSrc === "mnotify";
    const holderCard = d.personType === "PJ"
      ? roleCard({ name: d.company.denumire, idLabel: "IDNO", idValue: d.company.idno, pj: true, tag: d.company.state === "manual" ? tagHtml("Introdus manual", "warning") : "" })
      : roleCard({ name: fullName(d.applicant), idLabel: "IDNP", idValue: d.applicant.idnp, tag: d.applicant.state === "manual" ? tagHtml("Introdus manual", "warning") : "" });
    const repPerson = d.personType === "PJ" ? d.applicant : d.rep.on ? d.rep : null;
    const repCard = repPerson ? roleCard({ name: fullName(repPerson), idLabel: "IDNP", idValue: repPerson.idnp, tag: [basisLabel(d) ? tagHtml(basisLabel(d), basisLabel(d) === "Procură" ? "warning" : "success") : "", repPerson.state === "manual" ? tagHtml("Introdus manual", "warning") : ""].join("") }) : "";
    const phoneField = phoneRO
      ? `<div class="e-permits-fo-field e-permits-fo-field--span-6"><label>Telefon</label>${`<div class="e-permits-fo-phone e-permits-fo-phone--readonly is-filled"><span class="e-permits-fo-phone__value" id="gh-phone">+373 ${esc(formatPhone(d.contact.phone))}</span>${icon("checkmark-small")}</div>`}<p class="e-permits-fo-field__hint">Preluat din MNotify</p></div>`
      : R().fieldHtml({ id: "gh-phone", type: "phone", label: "Telefon", required: true, span: 6, value: d.contact.phone ? formatPhone(d.contact.phone) : "", placeholder: "60 000 000", hint: "Mobil +373 60 000 000 sau fix +373 22 000 000" });
    const emailField = emailRO
      ? readonlyField({ id: "fo-gh-email", label: "Email", value: d.contact.email, span: 6, hint: "Preluat din MNotify" })
      : R().fieldHtml({ id: "gh-email", type: "email", label: "Email", span: 6, value: d.contact.email, placeholder: "nume@exemplu.md", hint: "Opțional · fără domeniul .ru" });
    const note = phoneRO && emailRO
      ? "Datele de contact sunt preluate din MNotify și se modifică doar de solicitant, în MNotify."
      : phoneRO || emailRO
      ? "MNotify nu are toate datele de contact ale solicitantului: completați câmpul lipsă. Datele din MNotify se modifică doar de solicitant."
      : "Solicitantul nu are date de contact în MNotify: completați-le. Notificările despre dosar se trimit la aceste date.";
    return `
      ${stepHeader("Date solicitant", "Solicitantul și reprezentantul se modifică doar în pasul „Inițiere cerere”.")}
      <section class="e-permits-fo-form__roles" aria-label="Solicitant și reprezentant">
        <div class="e-permits-fo-form__role-group">${roleTitle("Solicitant")}${holderCard}</div>
        ${repCard ? `<div class="e-permits-fo-form__role-group">${roleTitle(d.personType === "PJ" ? "Persoana care depune" : "Reprezentant")}${repCard}</div>` : ""}
      </section>
      ${section("Date de contact pentru notificări", `
        <div class="e-permits-fo-form__section-body">${phoneField}${emailField}</div>
        ${U().renderInfoNote?.(note) || ""}`, { id: "gh-contact-title" })}
      ${footerHtml(d)}`;
  }
  const formatPhone = (raw) => { const v = String(raw || "").replace(/\D/g, "").replace(/^373/, ""); return v.length === 8 ? `${v.slice(0, 2)} ${v.slice(2, 5)} ${v.slice(5)}` : v; };
  function collectSolicitant() {
    const d = S.cur;
    const before = JSON.stringify(d.contact);
    if (d.contact.phoneSrc !== "mnotify") { const v = S.page.querySelector("#fo-gh-phone")?.value || ""; d.contact.phone = v.replace(/\s+/g, ""); d.contact.phoneSrc = "manual"; }
    if (d.contact.emailSrc !== "mnotify") { d.contact.email = (S.page.querySelector("#fo-gh-email")?.value || "").trim(); d.contact.emailSrc = "manual"; }
    if (JSON.stringify(d.contact) !== before) audit("Modificare date de contact", d, "Telefon / email pentru notificări");
  }
  function validateSolicitant() {
    collectSolicitant();
    const d = S.cur;
    const errs = [];
    if (d.contact.phoneSrc !== "mnotify") {
      const digits = d.contact.phone.replace(/\D/g, "").replace(/^373/, "");
      if (!digits) errs.push({ input: "#fo-gh-phone", msg: REQUIRED });
      else if (!/^(6|7)\d{7}$|^2\d{7}$/.test(digits)) errs.push({ input: "#fo-gh-phone", msg: "Se va indica număr telefon mobil +37300000000 sau fix +373(cod regiune)000000." });
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
      ${stepHeader("Detalii serviciu", act ? `Postproces „${esc(d.requestType)}” pe ${esc(act.nr)}: datele actului sunt precompletate.` : "Formularul tipului de solicitare, completat după actele prezentate de solicitant.")}
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
        <div class="e-permits-fo-doc-field__files" data-fo-doc-field-files></div>
      </div>`;
  }
  function stepDocumente(d) {
    return `
      ${stepHeader("Documente însoțitoare", d.procura ? "Procura pe hârtie a fost verificată la inițiere: atașați copia ei scanată." : "Documentele prezentate de solicitant, scanate la ghișeu sau preluate din MDocs.")}
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
  const summaryRow = (label, values) => `<div class="e-permits-fo-summary-row"><span class="e-permits-fo-summary-row__label" title="${esc(label)}">${esc(label)}</span><div class="e-permits-fo-summary-row__value">${values.map((v) => `<span>${v}</span>`).join("")}</div></div>`;
  const summarySection = (title, rowsHtml, step = null, extraClass = "") => `
    <div class="e-permits-fo-summary-section${extraClass}">
      <div class="e-permits-fo-summary-section__header">
        <h3 class="e-permits-fo-summary-section__heading">${esc(title)}</h3>
        ${step != null && !locked(S.cur) ? `<button class="e-permits-fo-summary-section__edit" type="button" aria-label="Corectează: ${esc(title)}" data-tooltip-label="Corectează" data-gh-goto="${step}">${icon("edit")}</button>` : ""}
      </div>
      <div class="e-permits-fo-summary-card">${rowsHtml}</div>
    </div>`;
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
    /* AC-04: the predefined documents with Atașat Da / Nu; extras only when attached */
    const attachments = [
      ...docsOf(d).map((doc) => {
        const files = d.docs[doc.id] || [];
        return summaryRow(doc.label, [files.length ? `${tagHtml("Atașat: Da", "success")} ${esc(files.map((f) => f.fisier || f.tip).join(", "))}` : tagHtml(`Atașat: Nu${doc.required ? " · obligatoriu" : ""}`, doc.required ? "danger" : "neutral")]);
      }),
      ...(d.docs.alte || []).map((f) => summaryRow("Document suplimentar", [`${tagHtml("Atașat: Da", "success")} ${esc(f.fisier || f.tip)}`]))
    ].join("");
    return `
      <div class="e-permits-fo-review-sections e-permits-gh__review">
        ${summarySection("Date generale ale solicitării", general, 0)}
        ${summarySection("Date despre solicitant", applicant, 1)}
        ${summarySection("Date despre cerere", request, 2)}
        ${summarySection("Atașamente", attachments, 3)}
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
      ${stepHeader("Verificare", "")}
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
  function stepLivrare(d) {
    const st = settingsOf(d.service);
    const options = [
      ["evo", "Livrare electronică (EVO Cabinet)", "Actul semnat electronic apare în EVO Cabinet al solicitantului. Implicit, fără date suplimentare."],
      st.paperRelease ? ["ghiseu", "Pe hârtie la instituția emitentă", "Solicitantul ridică actul pe hârtie de la ghișeul autorității."] : null,
      st.mdelivery ? ["mdelivery", "Pe hârtie prin MDelivery", `Actul se livrează la adresa indicată. Taxa MDelivery (${mdl(S.data.mdelivery.amount)}) se adaugă pe nota de plată.`] : null
    ].filter(Boolean);
    const address = d.delivery.mode === "mdelivery" ? `
      <div class="e-permits-gh__delivery-address" data-gh-delivery-address>
        ${R().fieldHtml({ id: "gh-livrare-adresa", type: "cascade-address", span: 12, districts: R().districts?.() || [], cadastral: { visible: false } })}
        ${errSlot("livrare")}
      </div>` : "";
    return `
      ${stepHeader("Livrare", "Cum primește solicitantul actul permisiv.")}
      ${section("Modul de livrare", `
        <div class="e-permits-fo-form__section-body e-permits-fo-form__section-body--single">
          <fieldset class="e-permits-fo-radio-group">
            <legend class="u-visually-hidden">Modul de livrare</legend>
            ${options.map(([value, title, desc]) => `
              <label class="e-permits-fo-radio e-permits-fo-radio--option">
                <input type="radio" name="gh-livrare" value="${value}"${d.delivery.mode === value ? " checked" : ""} data-gh-delivery>
                <span class="e-permits-fo-radio__control" aria-hidden="true"></span>
                <span class="e-permits-fo-radio__copy"><strong>${esc(title)}</strong><span class="e-permits-fo-radio__copy-desc">${esc(desc)}</span></span>
              </label>`).join("")}
          </fieldset>
          ${address}
        </div>`, { id: "gh-delivery-title" })}
      ${footerHtml(d)}`;
  }
  function bindLivrare(panel) {
    const cascade = panel.querySelector("[data-gh-delivery-address] [data-fo-cascade-address]");
    const a = S.cur.delivery.addressParts;
    if (cascade && a?.district) requestAnimationFrame(() => cascade.querySelector("[data-fo-address-search]")?.foCascadeAddressFill?.(a));
  }
  function collectLivrare() {
    const d = S.cur;
    const mode = S.page.querySelector("[data-gh-delivery]:checked")?.value;
    if (mode) d.delivery.mode = mode;
    const cascade = S.page.querySelector("[data-gh-delivery-address] [data-fo-cascade-address]");
    if (cascade) { d.delivery.addressParts = readAddress(cascade); d.delivery.address = addressText(d.delivery.addressParts); }
    refreshPayment(d);
  }
  function checkLivrare(d) {
    if (d.delivery.mode !== "mdelivery") return [];
    const a = d.delivery.addressParts || {};
    if (!a.district) return [{ input: "[data-gh-delivery-address] [data-fo-cascade-raion] .e-permits-fo-select__button", select: true, msg: REQUIRED }];
    if (!a.locality) return [{ input: "[data-gh-delivery-address] [data-fo-cascade-localitate] .e-permits-fo-select__button", select: true, msg: REQUIRED }];
    if (!a.postalCode) return [{ input: "[data-gh-delivery-address] [data-fo-address-part='postalCode']", msg: REQUIRED }];
    if (!/^MD-\d{4}$/.test(a.postalCode)) return [{ input: "[data-gh-delivery-address] [data-fo-address-part='postalCode']", msg: "Codul poștal are formatul MD-0000." }];
    return [];
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
  function invoiceHtml(p) {
    const incomplete = p.lines.some((l) => !l.account);
    return `
      <section class="e-permits-fo-payment-invoice" aria-label="Notă de plată ${esc(p.nr)}">
        <div class="e-permits-fo-payment-invoice__card">
          <header class="e-permits-fo-payment-invoice__header">
            <div class="e-permits-fo-payment-invoice__caption">
              <span class="e-permits-fo-payment-invoice__label">Notă de plată ${esc(p.nr)}</span>
              <span class="status-tag status-tag--${NOTE_TONE[p.status] === "warning" ? "accent" : NOTE_TONE[p.status] || "neutral"} is-strong e-permits-fo-payment-invoice__status">${esc(p.status)}</span>
            </div>
            <p class="e-permits-fo-payment-invoice__amount">${esc(mdl(p.total))}</p>
          </header>
          <div class="e-permits-fo-payment-table">
            <table>
              <thead><tr><th scope="col">Element de plată</th><th class="e-permits-fo-payment-table__amount" scope="col">Sumă</th></tr></thead>
              <tbody>
                ${p.lines.map((l) => `
                  <tr class="e-permits-fo-payment-table__row">
                    <td>
                      <span class="e-permits-gh__fee-name">${esc(l.name)}</span>
                      <span class="e-permits-gh__fee-meta">Cont bancar ${l.account ? esc(l.account) : `${tagHtml("Lipsește", "danger")}`}</span>
                      ${l.reductions.length ? `<span class="e-permits-gh__fee-meta">Reduceri: ${l.reductions.map(esc).join("; ")} · tarif ${esc(mdl(l.base))}</span>` : ""}
                    </td>
                    <td class="e-permits-fo-payment-table__amount">${esc(mdl(l.amount))}</td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>
          <div class="e-permits-fo-payment-totals"><table><tbody><tr class="is-strong"><th scope="row">Total de plată</th><td class="e-permits-fo-payment-table__amount">${esc(mdl(p.total))}</td></tr></tbody></table></div>
        </div>
        <div class="e-permits-fo-payment-invoice__edge" aria-hidden="true"></div>
      </section>
      ${incomplete ? U().renderNotice?.("error", "Configurarea taxei este incompletă. Pentru asistență, contactați autoritatea emitentă.", { role: "alert" }) || "" : ""}`;
  }
  function stepPlata(d) {
    const p = d.payment;
    if (!p) return `${stepHeader("Notă de plată")}${U().renderInfoNote?.("Cererea nu are taxe de achitat: treceți la confirmarea depunerii.") || ""}${footerHtml(d)}`;
    const svc = serviceOf(d.service);
    const summary = `
      <section class="e-permits-fo-payment-summary" aria-label="Detaliile notei de plată">
        ${summaryRow("Numărul cererii", [esc(d.nr)])}
        ${summaryRow("Serviciul", [esc(svc?.title || "")])}
        ${summaryRow("Data emiterii", [esc(longDate(p.issued))])}
        ${summaryRow("Termen de achitare", [esc(longDate(p.due))])}
        ${p.paid ? summaryRow("Achitată", [esc(stamp(p.paid)), esc(`ID tranzacție MPay ${p.txn}`)]) : ""}
      </section>`;
    const state = p.status === "Achitată"
      ? U().renderNotice?.("success", `<strong>Nota de plată a fost achitată</strong> prin MPay la ${esc(stamp(p.paid))}. Câmpurile cererii nu se mai pot modifica, iar schița nu se mai poate elimina.`)
      : p.status === "Expirată"
      ? `${U().renderNotice?.("error", `<strong>Nota de plată a expirat</strong> la ${esc(longDate(p.due))}. Cererea are statutul „Respins formal”, substatutul „Plată expirată”, și nu se poate depune până la regenerarea notei.`, { role: "alert" })}`
      : U().renderNotice?.("info", `Solicitantul achită nota prin MPay: linkul de achitare a fost trimis prin MNotify${d.contact.email ? ` la ${esc(d.contact.email)}` : ""} și în EVO Cabinet. Statutul se actualizează automat după confirmarea MPay.`);
    const history = (p.history || []).filter((h) => h.nr).map((h) => summaryRow(`Nota ${h.nr}`, [tagHtml(h.status, NOTE_TONE[h.status] || "neutral"), esc(mdl(h.total))])).join("");
    const actions = `
      <div class="e-permits-fo-payment-actions e-permits-gh__pay-actions">
        <button class="btn btn-outline-primary e-permits-fo-payment-actions__download" type="button" data-gh-download="note">${icon("page-download")}<span>Descarcă nota de plată</span></button>
        ${p.status === "Expirată"
          ? `<button class="btn btn-primary" type="button" data-gh-regenerate>${icon("rotate-arrow")}<span>Regenerează nota de plată</span></button>`
          : p.status === "Emisă" ? `<button class="btn btn-neutral" type="button" data-gh-mpay>${icon("rotate-arrow")}<span>Verifică achitarea în MPay</span></button>` : ""}
      </div>`;
    const blocked = p.status !== "Achitată" || p.lines.some((l) => !l.account);
    return `
      ${stepHeader("Notă de plată", "Generată automat din taxele serviciului, după detaliile cererii, termenul și reducerile alese. Nota și tarifele nu se editează.")}
      ${state}
      ${summary}
      ${invoiceHtml(p)}
      ${history ? summarySection("Note de plată anterioare", history) : ""}
      ${actions}
      ${footerHtml(d, { nextDisabled: blocked, back: !isPaid(d), hint: blocked ? "Confirmarea se deblochează după statutul „Achitată”." : "" })}`;
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
    const all = [0, 1, 2, 3].flatMap((i) => CHECK[i](d));
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
      ${stepHeader("Confirmarea depunerii", "Verificați condițiile depunerii. După confirmare, cererea nu se mai poate modifica, iar dosarul se trimite la distribuire.")}
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
      ? `<div class="e-permits-fo-finish-doc is-error" role="alert">
          <span class="e-permits-fo-finish-doc__icon" aria-hidden="true"><img src="assets/images/document-illustration.svg" alt=""></span>
          <div class="e-permits-fo-finish-doc__copy"><p class="e-permits-fo-finish-doc__title">Certificatul constatator</p><p class="e-permits-fo-finish-doc__text e-permits-fo-finish-doc__error">Certificatul constatator nu a putut fi generat.</p></div>
          <button class="btn btn-neutral btn-sm e-permits-fo-finish-doc__action" type="button" data-gh-cert-retry>${icon("rotate-arrow", 20, "icon small")}<span>Reîncercați</span></button>
        </div>`
      : `<div class="e-permits-fo-finish-doc">
          <span class="e-permits-fo-finish-doc__icon" aria-hidden="true"><img src="assets/images/document-illustration.svg" alt=""></span>
          <div class="e-permits-fo-finish-doc__copy"><p class="e-permits-fo-finish-doc__title">Certificatul constatator</p><p class="e-permits-fo-finish-doc__text">Dovada depunerii, pentru solicitant. Disponibil și în EVO Cabinet.</p></div>
          <button class="btn btn-outline-primary btn-sm e-permits-fo-finish-doc__action" type="button" data-gh-preview="cert">${icon("eye-open", 20, "icon small")}<span>Vezi documentul</span></button>
        </div>`;
    return `
      <div class="e-permits-gh__finish">
        <header class="e-permits-fo-finish__hero">
          ${icon("circle-checkmark-filled", 32, "icon e-permits-fo-finish__hero-icon")}
          <div class="e-permits-fo-form__header e-permits-fo-finish__header"><h2 tabindex="-1">Dosarul a fost depus cu succes.</h2></div>
          <p class="e-permits-fo-finish__lead">Solicitantul îl urmărește în EVO Cabinet → Solicitările mele și a primit notificarea de depunere prin MNotify.</p>
        </header>
        <div class="e-permits-fo-finish__content">
          ${cert}
          <section class="e-permits-fo-payment-summary" aria-label="Dosarul depus">
            ${summaryRow("Numărul dosarului", [R().copyValueHtml?.(d.nr, { ariaLabel: `Copiază numărul dosarului ${d.nr}` }) || esc(d.nr)])}
            ${summaryRow("Data depunerii", [esc(stamp(d.submittedAt))])}
            ${summaryRow("Termen de examinare", [esc(longDate(d.examDeadline)), esc(termOf(d)?.label || "")])}
            ${summaryRow("Statut", [`${tagHtml("În procesare", "info")} ${tagHtml("Spre distribuire", "info")}`])}
            ${summaryRow("Canal de depunere", ["Ghișeu"])}
          </section>
          ${U().renderInfoNote?.("Dosarul a fost trimis la distribuire și apare în „Dosare noi” › „Dosare nedistribuite”. Evenimentul depunerii a fost publicat în MConnect Event Bus.") || ""}
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

  const STEP_RENDER = { initiere: stepInitiere, solicitant: stepSolicitant, detalii: stepDetalii, documente: stepDocumente, verificare: stepVerificare, livrare: stepLivrare, plata: stepPlata, confirmare: stepConfirmare };
  const STEP_BIND = { initiere: bindInitiere, detalii: bindDetalii, documente: bindDocumente, verificare: bindVerificare, livrare: bindLivrare };
  const COLLECT = { initiere: collectInitiere, solicitant: collectSolicitant, detalii: collectDetalii, documente: collectDocumente, livrare: collectLivrare };
  /* data checks per step index (validate = collect + check) */
  const CHECK = [
    (d) => { const keep = S.page; return dataCheckInitiere(d, keep); },
    (d) => checkContact(d),
    checkDetalii,
    checkDocumente,
    checkVerificare,
    checkLivrare,
    () => [],
    () => []
  ];
  function dataCheckInitiere(d) {
    const errs = [];
    if (!d.service) errs.push({ key: "serviciu", focus: "#fo-gh-serviciu", msg: REQUIRED });
    if (!d.personType || !(d.personType === "PJ" ? d.company.state && d.applicant.state : d.applicant.state && (!d.rep.on || d.rep.state))) errs.push({ key: "tip", msg: "Identificați solicitantul.", step: 0 });
    const manualEmpty = (slot, keys) => slot.state === "manual" && keys.some((k) => !slot[k]);
    if (manualEmpty(d.company, ["denumire"]) || manualEmpty(d.applicant, ["nume", "prenume"]) || (d.rep.on && manualEmpty(d.rep, ["nume", "prenume"]))) errs.push({ key: "tip", msg: REQUIRED });
    if (needsProcura(d) && !d.procura) errs.push({ key: "procura", msg: "Legătura nu este confirmată electronic. Bifați «Prin procură», după verificarea procurii pe hârtie." });
    if (d.process === "post" && !d.act) errs.push({ key: "act", msg: "Alegeți actul permisiv sau decizia și postprocesul din meniul «⋮»." });
    return errs;
  }
  function checkContact(d) {
    if (d.contact.phoneSrc === "mnotify") return [];
    const digits = String(d.contact.phone || "").replace(/\D/g, "").replace(/^373/, "");
    return digits && /^(6|7)\d{7}$|^2\d{7}$/.test(digits) ? [] : [{ input: "#fo-gh-phone", msg: REQUIRED }];
  }
  /* the current step: collect + full checks (the DOM-level validators of steps 1–2) */
  function validateStep(i) {
    const id = STEPS[i].id;
    if (id === "initiere") return validateInitiere();
    if (id === "solicitant") return validateSolicitant();
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
    } else if (STEPS[from].id === "initiere") collectInitiere();
    else if (STEPS[from].id === "solicitant") collectSolicitant();
    else COLLECT[STEPS[from].id]?.();
    voidIfChanged();
    /* AC-08 / AC-09: Verificare (and after) only with every earlier step valid */
    if (target >= STEP_INDEX.verificare) {
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
  const ERR_FIELD = { serviciu: "[data-gh-service] .e-permits-fo-caem", procura: ".e-permits-gh__procura", tip: "[data-gh-type]", subdiv: "#fo-gh-subdiv", term: "#fo-gh-term" };
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
    if (t.closest("[data-gh-start-next]")) { continueStart(); return; }
    if (t.closest("[data-gh-start-cancel]")) { closeStart(); return; }
    if (t.closest("[data-gh-sheet-close]")) { requestCloseSheet(); return; }
    if (t.closest("[data-gh-close-sheet]")) { leave(); return; }
    if (t.closest("[data-gh-next]")) { go(nextStepIndex(d, S.step)); return; }
    if (t.closest("[data-gh-prev]")) { go(prevStepIndex(d, S.step), { validate: false }); return; }
    const goto = t.closest("[data-gh-goto]");
    if (goto) { event.preventDefault(); const target = Number(goto.dataset.ghGoto); go(target, { validate: target > S.step }); return; }
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
      if (d.process === "post") { d.act = null; d.requestType = "Emitere primară"; }
      S.dirty = true;
      redrawBlock("applicant"); redrawBlock("process"); refreshChrome();
      S.page.querySelector(`[data-gh-code="${kind}"]`)?.focus();
      return;
    }
    const pp = t.closest("[data-gh-pp]");
    if (pp) {
      closeMenus();
      d.process = "post"; d.act = pp.dataset.ghPp; d.requestType = pp.dataset.ghPpType;
      d.details.addressChanged = false;
      S.dirty = true;
      redrawBlock("process"); refreshChrome();
      S.page.querySelector('[data-gh-block="process"] .e-permits-info-note')?.scrollIntoView({ block: "nearest" });
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
    if (t.matches("[data-gh-process]")) {
      collectInitiere();
      d.process = t.value;
      if (t.value === "primar") { d.act = null; d.requestType = "Emitere primară"; }
      S.dirty = true;
      redrawBlock("process"); refreshChrome();
      S.page.querySelector(`[data-gh-process][value="${t.value}"]`)?.focus();
      return;
    }
    if (t.matches("[data-gh-reduction]")) { collectDetalii(); S.dirty = true; return; }
    if (t.matches("[data-gh-delivery]")) {
      collectLivrare();
      S.dirty = true;
      render({ focusTitle: false });
      S.page.querySelector(`[data-gh-delivery][value="${t.value}"]`)?.focus();
    }
  }
  function onInput(event) {
    S.dirty = true;
    if (S.step === 0) queueMicrotask(syncStart);
    const t = event.target;
    if (t.getAttribute?.("aria-invalid") === "true" && !t.matches("[data-fo-registry-code]")) R().setFieldError?.(t, "");
  }
  function onKeydown(event) {
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
