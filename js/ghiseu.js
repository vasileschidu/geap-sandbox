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

   Din oficiu — Inițierea dosarelor în BackOffice din inițiativa autorității (Feature 95769, 2026-10-26):
   US-242 inițiere (actul + postprocesul) · US-243 date titular · US-244 detalii + decizia autorității ·
   US-245 verificare · US-246 confirmare · US-247 schiță · US-248 eliminare · US-249 lista schițelor.
   The SAME wizard in a second mode, not a fork: a draft with `channel: "Din oficiu"` (isOfc) runs the same
   window, steps, autosave, documents, Verificare, Livrare and confirmation; only the entry and a few step bodies
   branch (`ofc*` functions, „Din oficiu” section below). Entry: «Dosare inițiate din oficiu» (US-65; registry kind
   `oficiu`, nav id `office`, route #oficiu/nou · #oficiu/<id>[/<step>]) → „Nou” → the window opens on the act
   search (no small modal, no applicant: the holder of the chosen act is the subject) → a post-process from the
   act's ⋮ starts the draft at „Date titular”. Only post-processes (no Emitere primară), no MSign, no payment
   note; on submit the dossier goes „În procesare” · „Proiect act” (Prelungire) / „Proiect decizie”, is
   distributed to the initiator and joins the shell's dossiers („Dosarele mele”, origin „Din oficiu”). Data:
   data/ghiseu.json › oficiu (the per-status post-processes = US-221 stand-in, terms, documents, seeded drafts).
   Permission (Feature 95769 assumptions): Administrator central by default, Specialist / Supervizor as granted
   in the demo roles; anyone else gets the no-rights state. Demo: the same params (gol=1, depunere=eroare, ghseed=1).
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
    { id: "documente", label: "Acte necesare" },
    { id: "verificare", label: "Verificare" },
    { id: "livrare", label: "Livrare" },
    { id: "plata", label: "Notă de plată" },
    { id: "confirmare", label: "Confirmarea depunerii" }
  ];
  const STEP_INDEX = Object.fromEntries(STEPS.map((step, index) => [step.id, index]));
  /* Din oficiu (Feature 95769): the same steps; two read differently (the Feature's UX description) */
  const OFC = "Din oficiu";
  const isOfc = (d) => d?.channel === OFC;
  const OFC_LABELS = { intent: "Inițiere", identificare: "Date titular" };
  const stepLabel = (d, id) => (isOfc(d) && OFC_LABELS[id]) || STEPS[STEP_INDEX[id]].label;

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
  /* mode = the list the window belongs to: "ghiseu" («Dosare noi») | "oficiu" («Dosare inițiate din oficiu») */
  const S = { data: null, drafts: [], audit: [], seq: 4900, loading: null, page: null, cur: null, step: 0, errors: {}, notice: null, lookups: {}, mode: "ghiseu" };
  /* ghiseu-autosave-csv-v1 (user decision 2026-10-23, Galina on the Ghișeu board): the draft saves itself, as the FO
     shows it („Salvat ca schiță · 14:32”) — every `S.dirty = true` (an edit anywhere in the window) schedules an
     autosave AUTOSAVE_MS after the last change; a step change, „Salvează schița”, × / Esc and leaving the page save at
     once. So there is never an unsaved change to ask about on close. `dirty` stays a plain flag for the readers. */
  const AUTOSAVE_MS = 1000;
  let dirtyFlag = false;
  let autosaveTimer = 0;
  Object.defineProperty(S, "dirty", {
    enumerable: true,
    get: () => dirtyFlag,
    set: (value) => {
      dirtyFlag = Boolean(value);
      clearTimeout(autosaveTimer);
      if (dirtyFlag) autosaveTimer = setTimeout(() => autosave(), AUTOSAVE_MS);
    }
  });

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
    const ofcSeeds = () => (params.get("gol") === "1" ? [] : (S.data.oficiu?.drafts || []).map(seedOfcDraft).filter(Boolean));
    if (saved?.drafts) {
      S.drafts = saved.drafts; S.audit = saved.audit || []; S.seq = saved.seq || S.seq;
      /* a store written before «Dosare inițiate din oficiu» existed gets its seeded drafts once */
      if (!saved.ofcSeeded) { S.drafts = [...S.drafts, ...ofcSeeds()]; writeStore(); }
      return;
    }
    S.drafts = params.get("gol") === "1" ? [] : (S.data.drafts || []).map(seedDraft);
    S.drafts = [...S.drafts, ...ofcSeeds()];
    S.audit = [];
    writeStore();
  }
  function writeStore() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ drafts: S.drafts, audit: S.audit, seq: S.seq, ofcSeeded: true })); } catch { /* private mode: the session keeps working */ }
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
    /* demo only (?acte=multe, as the Cabinet acts list): + two numbered copies of every act → the picker's search */
    if (seeded.length && params.get("acte") === "multe") {
      return [...seeded, ...seeded.flatMap((act) => [1, 2].map((n) => ({ ...act, id: `${act.id}-${n}`, nr: `${act.nr}/${n}`, name: act.name.replace(/,/, ` ${n + 1},`), pending: null })))];
    }
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
    /* Din oficiu: no payment note (Feature 95769 AC: „fără notă de plată”) → the „Notă de plată” step never shows */
    if (isOfc(d)) return [];
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
    /* US-247 AC-07: an ex-officio draft is „Schiță” · „Schiță” at every step (no signing, no payment) */
    if (isOfc(d)) { d.status = "Schiță"; d.substatus = "Schiță"; return; }
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
        /* US-247 AC-09 (din oficiu): the initiator, through MNotify and the internal SIA GEAP notification */
        audit("Notificare eliminare schiță", d, isOfc(d)
          ? `MNotify și notificare internă SIA GEAP utilizatorului care a inițiat dosarul: eliminare la ${longDate(retentionEnd(d))}; schița se poate finaliza până atunci`
          : `MNotify solicitantului și utilizatorului: eliminare la ${longDate(retentionEnd(d))}`, { system: true });
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
    if (isOfc(d)) { fillDemoOfc(d, upTo); return; }
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
    if (upTo > STEP_INDEX.documente && !Object.keys(d.docs).filter((key) => key !== "procura").length) {
      const at = stamp(d.createdAt);
      docsOf(d).filter((doc) => doc.required && !(d.docs[doc.id] || []).length).forEach((doc, i) => {
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
    /* Din oficiu: the documents of the authority's own dossier (data/ghiseu.json › oficiu.docs), never the holder's */
    if (isOfc(d)) return S.data?.oficiu?.docs || [];
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
  const SUB_TONE = { "Schiță": "neutral", "Spre semnare": "brand", "Spre achitare": "warning", "Achitat": "success", "Plată expirată": "danger", "Spre distribuire": "info", "Proiect act": "info", "Proiect decizie": "info" };
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
    const rows = S.drafts.filter((d) => !d.removed && !isOfc(d)).map(regRow);
    return {
      kind: "ghiseu",
      fieldCount: 9,
      defaultSort: "modificat",
      columns: {
        /* widths = the one-line header (label + sort icon) or the longest date; names ellipsize with a
           tooltip; the ⋮ stays pinned right while the dates scroll. The ROW is the action (no-continue-btn-v1, user on
           GEAP 11862:24338 / 11914:29753): a draft row continues the request, a submitted row opens it — no „Continuă” /
           „Detalii” button that would repeat the click */
        nr: { label: "Număr cerere", width: 144, sortable: true },
        serviciu: { label: "Denumirea serviciului", width: 184, fill: true, sortable: true },
        solicitant: { label: "Nume solicitant", width: 152, sortable: true },
        companie: { label: "Compania", width: 144, sortable: true },
        substatut: { label: "Substatut", width: 120, sortable: true },
        creat: { label: "Data creării", width: 152, sortable: true },
        modificat: { label: "Data ultimei modificări", width: 180, sortable: true },
        expirareNota: { label: "Data expirării notei de plată", width: 212, sortable: true },
        eliminare: { label: "Data eliminării automate", width: 192, sortable: true },
        actiuni: { label: "", width: 56, pin: "end" }
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
          primaryAction: can() ? { id: "gh-new", label: "Dosar nou" } : null,
          /* CSV only (gh-01e, user 2026-10-23): one format → the button is named „Exportă CSV” and opens the
             export dialog without a format choice (export-modal-csv-v1) */
          exportLabel: "Exportă CSV"
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
          if (row.submitted) return "";
          /* lone-trash-v1 (user 2026-10-23): „Elimină schița” is the row's ONLY action → no ⋮ and no ×: ONE grey icon-only
             trash (library Neutral · Icon Only · Small, the ⋮ size; deliberately NOT red — exception to destructive-red for a
             lone row icon), tooltip „Elimină schița”, the same confirm (its button stays red). A paid draft can't be
             removed → nothing (row-menu-no-disabled-only-v1). */
          if (!row.paid) return `<span class="e-permits-workplace__row-actions"><button class="btn btn-neutral btn-sm btn-icon-only e-permits-gh-row-remove" type="button" aria-label="Elimină schița ${esc(row.nr)}" data-tooltip-label="Elimină schița" data-gh-remove="${esc(row.id)}"><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-delete"></use></svg></button></span>`;
          const menu = [
            { label: "Elimină schița", icon: "delete", danger: true, attrs: `data-gh-remove="${esc(row.id)}"${row.paid ? ' aria-disabled="true" data-tooltip-reason="Nota de plată este achitată: schița nu se mai poate elimina."' : ""}` }
          ];
          return `<span class="e-permits-workplace__row-actions">${(U().renderRowActions?.({
            menu,
            label: row.nr
          }) || "").replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>")}</span>`;
        }
        default: return esc(String(row[key] ?? "—"));
      }
    },
    /* the row = the old „Continuă” / „Detalii”: same hash route (Back returns to the list) */
    openRow: (id) => openDraftFromList(id),
    rowLabel: (row) => `${row.nr}, ${row.serviciu}${row.solicitant ? `, ${row.solicitant}` : ""} — ${row.submitted ? "dosar depus, deschide detaliile" : "schiță, continuă completarea"}`,
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
  const refreshRegistry = (mode = "ghiseu") => {
    updateBadge();
    const list = listOf(mode);
    const reg = document.querySelector(`[data-registry-kind="${list.kind}"]`);
    if (!reg || reg.closest("[hidden]") || (S.page && !S.page.hidden)) return;
    document.querySelector(`[data-nav-item][data-nav-id="${list.nav}"]`)?.click();
  };
  /* the menu badges: drafts in «Dosare noi» (US-68 AC-02) and the user's drafts in «Dosare inițiate din oficiu» (US-65 AC-09) */
  const updateBadge = () => {
    const n = S.drafts.filter((d) => !d.removed && !isSubmitted(d) && !isOfc(d)).length;
    document.querySelectorAll('[data-nav-item][data-nav-id="dosare-noi"] .e-permits-shell__nav-badge').forEach((b) => { b.textContent = String(n); });
    if (!S.data) return;
    const o = ofcDrafts().length;
    document.querySelectorAll(`[data-nav-item][data-nav-id="${OFC_NAV}"] .e-permits-shell__nav-badge`).forEach((b) => { b.textContent = String(o); });
    syncOfcBell();
  };

  /* ---------------------------------------------------------------- registry „Dosare suspendate” (US-255, Azure 95793)
     The cases of the user's subdivision with statut „Suspendat” · substatut „Suplinire info”, filed online or at the
     desk, whoever supplements them (BO or EVO Cabinet). Read-only list on the shell's registry engine: AC-02 columns,
     AC-04 search (număr, solicitant, companie), AC-05 facets (serviciu, data depunerii, termen de suplinire), AC-06
     sorted by the nearest supplement term, AC-07 / AC-11 the CSV export dialog + an audit entry with the personal-
     data mark, AC-08 / AC-09 the two empty states, AC-01 no rights. The suspension record (reason, term) is the
     shell's `dosarSuspension(row)` — the same one the BO profile and the applicant's S4 show. AC-10: a click opens
     the case (US-250 — the BO supplement flow — is not built; reported). Demo: ?suspendate=0 = none. */
  const SUSP_KIND = "ghsusp";
  const suspDays = (iso) => {
    const today = new Date(`${A().dossierStore?.()?.today || nowIso().slice(0, 10)}T00:00:00`);
    return Math.round((new Date(`${iso}T00:00:00`) - today) / 86400000);
  };
  function suspRows() {
    const db = A().dossierStore?.();
    if (!db || params.get("suspendate") === "0") return [];
    return (db.runtimeRows || [])
      .filter((row) => row.status === "inExaminare" && row.alerte.includes("suspendat") && ["FO", "BO"].includes(row.sursa) && row.subdiviziune === db.mySubdiviziune)
      .map((row) => {
        const s = A().dosarSuspension?.(row);
        const minute = (row.id.charCodeAt(row.id.length - 1) * 7) % 60;
        return s && {
          /* own id: the shell's getDosarById looks in the open registry's rows first — a dossier id here would hand
             this list row (not the case) to the profile */
          id: `susp:${row.id}`,
          dosarId: row.id,
          nr: row.nrDosar,
          tip: row.tipDosar,
          serviciu: row.serviciu,
          solicitant: row.numeSolicitant,
          companie: row.companie || "",
          canal: row.sursa === "FO" ? "Depus online" : "Depus la ghișeu",
          online: s.online,
          depus: `${row.dataDepunerii}T${pad(9 + (minute % 8))}:${pad(minute)}:00`,
          termen: s.termen,
          ramase: s.ramase
        };
      })
      .filter(Boolean);
  }
  function suspRegistryDb() {
    const rows = can() ? suspRows() : [];
    return {
      kind: SUSP_KIND,
      fieldCount: 6,
      defaultSort: "termen",
      defaultSortDirection: "asc",
      columns: {
        nr: { label: "Număr dosar", width: 160, sortable: true },
        serviciu: { label: "Denumirea serviciului", width: 220, fill: true, sortable: true },
        solicitant: { label: "Nume solicitant", width: 168, sortable: true },
        companie: { label: "Compania", width: 168, sortable: true },
        depus: { label: "Data depunerii", width: 152, sortable: true },
        termen: { label: "Termen de suplinire", width: 168, sortable: true }
      },
      views: {
        [SUSP_KIND]: {
          title: "Dosare suspendate",
          selectable: false,
          searchPlaceholder: "Caută după numărul dosarului, solicitant sau companie",
          columns: ["nr", "serviciu", "solicitant", "companie", "depus", "termen"],
          exportLabel: "Exportă CSV"
        }
      },
      runtimeRows: rows
    };
  }
  window.GEAPShellRegistries[SUSP_KIND] = {
    build: suspRegistryDb,
    facets: [
      { key: "serviciu", label: "Denumirea serviciului", get: (r) => r.serviciu },
      { key: "depus", label: "Data depunerii", get: (r) => { const n = -suspDays(r.depus.slice(0, 10)); return n <= 7 ? "Ultimele 7 zile" : n <= 30 ? "Ultimele 30 de zile" : "Mai vechi de 30 de zile"; } },
      { key: "termen", label: "Termen de suplinire", get: (r) => (r.ramase <= 3 ? "În următoarele 3 zile" : r.ramase <= 7 ? "În 4–7 zile" : r.ramase <= 30 ? "În 8–30 de zile" : "Peste 30 de zile") }
    ],
    searchText: (row) => [row.nr, row.solicitant, row.companie].filter(Boolean).join(" "),
    sortValue: (row, key) => (key === "depus" || key === "termen" ? row[key] : undefined),
    renderCell: (row, key) => {
      switch (key) {
        case "nr": return `
          <div class="e-permits-workplace__case-cell">
            <span class="e-permits-passport__name" data-cell-tooltip="${esc(row.nr)}">${esc(row.nr)}</span>
            <span class="e-permits-workplace__source"><span data-cell-tooltip="${esc(`${row.canal}${row.online ? " · suplinire începută online" : ""}`)}">${esc(row.online ? "Suplinire începută online" : row.canal)}</span></span>
          </div>`;
        case "serviciu": return `<span data-cell-tooltip="${esc(row.serviciu)}">${esc(row.serviciu)}</span>`;
        case "solicitant": return `<span data-cell-tooltip="${esc(row.solicitant)}">${esc(row.solicitant)}</span>`;
        case "companie": return row.companie ? `<span data-cell-tooltip="${esc(row.companie)}">${esc(row.companie)}</span>` : '<span class="e-permits-workplace__dash">—</span>';
        case "depus": return U().renderDateTime?.(row.depus) || esc(stamp(row.depus));
        case "termen": {
          const n = row.ramase;
          return dateCell(row.termen, n < 0 ? "depășit" : inDays(n), n < 0 ? "danger" : n <= 3 ? "warning" : "");
        }
        default: return esc(String(row[key] ?? "—"));
      }
    },
    /* AC-10: the row opens the case (the BO supplement flow of US-250 starts from there) */
    openRow: (id) => { window.location.hash = `#dosar/${encodeURIComponent(String(id).replace(/^susp:/, ""))}/general`; },
    rowLabel: (row) => `${row.nr}, ${row.serviciu}, ${row.solicitant}${row.companie ? `, ${row.companie}` : ""} — termen de suplinire ${longDate(row.termen)}, deschide dosarul`,
    rowClass: () => "",
    emptyHtml: ({ query, filtered }) => {
      const E = window.GEAPEmptyState;
      if (!can()) return E?.render({ title: NO_RIGHTS, text: "Dosarele suspendate sunt disponibile utilizatorilor cu permisiunea de inițiere a cererilor la ghișeu.", icon: "lock", bare: true });
      if (query || filtered) return E?.noResults?.("Nicio înregistrare nu corespunde criteriului de căutare", { text: "Caută după numărul dosarului, numele solicitantului sau companie.", bare: true });
      return E?.render({ title: "Nu sunt dosare suspendate.", text: "Dosarele suspendate pentru suplinirea informațiilor apar aici până la reluarea examinării.", icon: "pause", bare: true });
    },
    exportRows: (rows) => openExport(rows, "susp")
  };
  /* AC-01: a role without the permission that opens #dosare-suspendate directly gets the list's no-rights state */
  window.GEAPShellRoutes = window.GEAPShellRoutes || [];
  window.GEAPShellRoutes.push((hash) => {
    if (hash !== "#dosare-suspendate" || document.querySelector('[data-nav-item][data-nav-id="dosare-suspendate"]')) return false;
    A().showRegistry?.(suspRegistryDb());
    return true;
  });

  /* ================================================================ Din oficiu (Feature 95769) — model + list
     The authority's acts (US-242 AC-04/05), the ex-officio post-processes per act status (AC-07…09), one active
     post-process per act (Feature assumptions), the drafts list «Dosare inițiate din oficiu» (US-249) and the
     submitted dossier joining the shell's dossiers (US-246 AC-06/07). */
  const OFC_KIND = "oficiu";
  const OFC_NAV = "office";
  const OFC_PHONE_MSG = "Se va indica număr telefon mobil +37300000000 sau fix +373(cod regiune)000000.";
  const LISTS = {
    ghiseu: { kind: "ghiseu", nav: "dosare-noi", hash: "#dosare-noi", name: "Dosare noi" },
    oficiu: { kind: OFC_KIND, nav: OFC_NAV, hash: `#${OFC_NAV}`, name: "Dosare inițiate din oficiu" }
  };
  const listOf = (mode = S.mode) => LISTS[mode] || LISTS.ghiseu;
  /* every act of every holder (seeds look acts up by id, whatever the signed-in authority) */
  const allActs = () => Object.entries(S.data?.acts || {}).flatMap(([code, acts]) => acts.filter((a) => a.kind === "act").map((a) => ({ ...a, holder: code })));
  /* AC-04: only the acts issued by the user's authority — every role, the Administrator central too (its assignment
     belongs to one authority: „Administrator central • ANSP”); services = active with a published passport. The
     authority = the assignment's own (`authority`) or its group (the id prefix: ansp-…, anta-…) */
  const ofcAuthority = () => { const a = A().currentAssignment?.(); return `aut-${a?.authority || String(a?.id || "ansp").split("-")[0]}`; };
  function ofcActs() {
    const auth = ofcAuthority();
    const all = A().servicesStore?.()?.services || [];
    const services = new Set(all.filter((s) => s.authorityId === auth && s.status === "Publicat" && (s.rssp?.rsspStatus || "Publicat") === "Publicat" && deskOf(s.code)).map((s) => s.code));
    return allActs().filter((a) => services.has(a.service));
  }
  const ofcActOf = (d) => allActs().find((a) => a.id === d.act) || null;
  /* the holder of an act = the RSUD company (an IDNO starts with 1) or the RSP person of its code */
  const holderOf = (code) => (/^1/.test(code) ? { type: "PJ", company: registryCompany(code) } : { type: "PF", person: registryPerson(code) });
  const holderLine = (code) => { const h = holderOf(code); return h.type === "PJ" ? `${h.company?.denumire || ""} · IDNO ${code}` : `${fullName(h.person)} · IDNP ${code}`; };
  /* AC-07/08: the ex-officio types configured for the act's service with its current status in „Statute din care se
     inițiază” (stand-in: data/ghiseu.json › oficiu.postprocese) */
  const ofcTypes = (act) => S.data?.oficiu?.postprocese?.[act.service]?.[act.status] || [];
  /* one active post-process per act (Feature 95769): a dossier in progress on it — a filed one (act.pending) or an
     ex-officio dossier submitted from here. A draft does not lock the act (as at the desk: drafts are work in
     progress; the second submission is the one the processing flow refuses) */
  function ofcBusy(act, exceptId = "") {
    if (act.pending) return { type: act.pending.type, nr: act.pending.dossier };
    const other = S.drafts.find((x) => isOfc(x) && !x.removed && isSubmitted(x) && x.act === act.id && x.id !== exceptId);
    return other ? { type: other.requestType, nr: other.nr } : null;
  }
  /* AC-08 (US-244): the initiator's subdivision at initiation */
  const ofcSubdivision = () => A().currentAssignment?.()?.instanceLabel || "CSP Chișinău";
  const blankOfc = () => ({ decision: { mode: "form", nr: "", date: "", temei: "", content: "", file: null }, fields: { until: "", from: "", reason: "" } });
  const ofcTermDays = (d) => Number(S.data?.oficiu?.termene?.[d.requestType]) || 10;
  const ofcTermLabel = (d) => `${plural(ofcTermDays(d), "zi lucrătoare", "zile lucrătoare")} de la depunere`;
  /* the dossier type the shell's dossiers know (data/e-permits-workplace.json › tipDosar) */
  const OFC_DOSSIER_TYPE = { Prelungire: "Prelungire", "Suspendare valabilitate": "Suspendare", "Reluare valabilitate": "Reluare", "Retragere act permisiv": "Retragere" };
  /* the chosen act fills the draft: service, process, holder (read-only, US-243 AC-02), the holder's contacts from
     the act (the MNotify mock, editable — AC-03), the initiator's subdivision (US-244 AC-08) */
  function ofcApplyAct(d, act, type) {
    const h = holderOf(act.holder);
    d.service = act.service; d.act = act.id; d.process = "post"; d.requestType = type;
    if (h.type === "PJ") {
      const adminCode = h.company?.administratori?.[0] || "";
      const admin = adminCode ? registryPerson(adminCode) : null;
      d.personType = "PJ";
      d.company = { idno: act.holder, denumire: h.company?.denumire || "", state: "found" };
      d.applicant = admin ? { idnp: admin.idnp, nume: admin.nume, prenume: admin.prenume, state: "found" } : { idnp: "", nume: "", prenume: "", state: "" };
    } else {
      d.personType = "PF";
      d.applicant = { idnp: act.holder, nume: h.person?.nume || "", prenume: h.person?.prenume || "", state: "found" };
      d.company = { idno: "", denumire: "", state: "" };
    }
    d.rep = { on: false, idnp: "", nume: "", prenume: "", state: "" };
    d.procura = false;
    const c = (S.data.mnotify || {})[act.holder] || {};
    d.contact = { phone: c.phone || "", email: c.email || "", phoneSrc: "manual", emailSrc: "manual" };
    d.details = { values: {}, address: {}, subdivision: ofcSubdivision(), term: "", reductions: [] };
    d.ofc = blankOfc();
    d.docs = {};
    d.review = { paper: null, olograf: null, signed: null, voided: [] };
    d.payment = null;
  }
  const isoDay = (offset) => dayAt(offset).slice(0, 10);
  const plusYears = (iso, n) => { const [y, m, day] = String(iso || isoDay(0)).split("-"); return `${Number(y) + n}-${m}-${day}`; };
  /* plausible answers before `upTo` (seed + the demo prefill, as fillDemo for the desk) */
  function fillDemoOfc(d, upTo) {
    const act = ofcActOf(d);
    if (upTo > STEP_INDEX.identificare && !d.contact.phone) d.contact = { ...d.contact, phone: "69000111", phoneSrc: "manual" };
    if (upTo > STEP_INDEX.detalii && !d.ofc?.decision?.nr) {
      d.ofc = d.ofc || blankOfc();
      const tail = String(d.nr || "C-2026-004800").slice(-3);
      d.ofc.decision = { mode: "form", nr: `DA-2026-0${tail}`, date: isoDay(-1), temei: "Decizie administrativă a autorității", content: OFC_DEMO_CONTENT[d.requestType] || "", file: null };
      d.ofc.fields = {
        until: d.requestType === "Prelungire" ? plusYears(act?.valabilPana, 5) : d.requestType === "Suspendare valabilitate" ? isoDay(30) : "",
        from: ["Reluare valabilitate", "Retragere act permisiv"].includes(d.requestType) ? isoDay(1) : "",
        reason: OFC_DEMO_REASON[d.requestType] || ""
      };
    }
    if (upTo > STEP_INDEX.documente && !Object.keys(d.docs).length) {
      docsOf(d).filter((doc) => doc.required).forEach((doc) => {
        d.docs[doc.id] = [{ sursa: "upload", tip: doc.label, fisier: "proces-verbal-control.pdf", size: "860 KB", at: stamp(d.createdAt || nowIso()), verb: "Încărcat" }];
      });
    }
  }
  const OFC_DEMO_CONTENT = {
    Prelungire: "Se prelungește valabilitatea actului permisiv, la inițiativa autorității, conform prevederilor legale în vigoare.",
    "Suspendare valabilitate": "Se suspendă valabilitatea actului permisiv până la înlăturarea neconformităților constatate la control.",
    "Reluare valabilitate": "Se reia valabilitatea actului permisiv: neconformitățile care au stat la baza suspendării au fost înlăturate.",
    "Retragere act permisiv": "Se retrage actul permisiv: titularul nu a înlăturat în termen neconformitățile constatate."
  };
  const OFC_DEMO_REASON = {
    "Suspendare valabilitate": "Neconformități sanitare constatate la controlul din data de referință (proces-verbal anexat).",
    "Retragere act permisiv": "Neînlăturarea neconformităților în termenul de suspendare."
  };
  /* a seeded ex-officio draft (data/ghiseu.json › oficiu.drafts), filled up to its step */
  function seedOfcDraft(seed) {
    const act = allActs().find((a) => a.id === seed.act);
    if (!act) return null;
    const d = blankDraft();
    d.channel = OFC;
    d.id = seed.id; d.nr = seed.nr; d.uid = `uid-${seed.id}`;
    ofcApplyAct(d, act, seed.requestType);
    /* the seed's own drafts were started by the demo specialist (CSP Chișinău); others' by their act's subdivision */
    d.details.subdivision = seed.by === "self" ? "CSP Chișinău" : act.subdiviziune || "CSP Chișinău";
    d.by = seed.by === "self" ? userName() : seed.by;
    d.createdAt = dayAt(seed.createdDays, seed.createdTime);
    const upd = new Date(Date.now() + seed.updatedHours * 3600000);
    d.updatedAt = isoOf(upd < new Date(d.createdAt) ? new Date(d.createdAt) : upd);
    d.step = seed.step; d.maxStep = seed.step;
    fillDemoOfc(d, d.step);
    syncSubstatus(d);
    return d;
  }
  /* permission (Feature 95769 assumptions): Administrator central by default; Specialist / Supervizor = granted in the
     demo roles (Feature 89940); separate from the desk permission (`can`) */
  function canOfc() {
    const role = A().currentAssignment?.()?.roleId;
    return ["central-admin", "specialist", "supervisor"].includes(role);
  }

  /* «Dosare inițiate din oficiu» (US-249): the user's own ex-officio drafts (AC-04) on the shell's registry engine */
  const ofcRow = (d) => {
    const act = ofcActOf(d);
    return {
      id: d.id, nr: d.nr, tip: d.requestType || "—", act: act?.nr || "",
      serviciu: serviceOf(d.service)?.title || d.service,
      titular: fullName(d.applicant), companie: d.personType === "PJ" ? d.company.denumire : "",
      creat: d.createdAt, modificat: d.updatedAt, eliminare: retentionEnd(d), notificat: Boolean(d.notified)
    };
  };
  const ofcDrafts = () => S.drafts.filter((d) => isOfc(d) && !d.removed && !isSubmitted(d) && d.by === userName());
  function ofcRegistryDb() {
    if (!S.data) { load().then(() => refreshRegistry(OFC_KIND)); }
    const allowed = canOfc();
    return {
      kind: OFC_KIND,
      fieldCount: 7,
      defaultSort: "modificat",
      fixedWidths: true,
      columns: {
        nr: { label: "Număr cerere", width: 168, sortable: true },
        serviciu: { label: "Denumirea serviciului", width: 200, fill: true, sortable: true },
        titular: { label: "Nume titular", width: 160, sortable: true },
        companie: { label: "Compania", width: 152, sortable: true },
        creat: { label: "Data creării", width: 152, sortable: true },
        modificat: { label: "Data ultimei modificări", width: 180, sortable: true },
        eliminare: { label: "Data eliminării automate", width: 192, sortable: true },
        actiuni: { label: "", width: 56, pin: "end" }
      },
      views: {
        [OFC_KIND]: {
          title: LISTS.oficiu.name,
          selectable: false,
          searchPlaceholder: "Caută după numărul cererii, titular sau companie",
          columns: ["nr", "serviciu", "titular", "companie", "creat", "modificat", "eliminare", "actiuni"],
          primaryAction: allowed ? { id: "ofc-new", label: "Nou" } : null,
          exportLabel: "Exportă CSV"
        }
      },
      runtimeRows: allowed && S.data ? ofcDrafts().map(ofcRow) : []
    };
  }
  window.GEAPShellRegistries[OFC_KIND] = {
    build: ofcRegistryDb,
    /* AC-06 */
    facets: [
      { key: "serviciu", label: "Denumirea serviciului", get: (r) => r.serviciu },
      { key: "creat", label: "Data creării", get: (r) => DATE_FACETS.past(r.creat) },
      { key: "modificat", label: "Data ultimei modificări", get: (r) => DATE_FACETS.past(r.modificat) },
      { key: "eliminare", label: "Data eliminării automate", get: (r) => DATE_FACETS.future(r.eliminare) }
    ],
    /* AC-05: număr, nume titular, companie */
    searchText: (row) => [row.nr, row.titular, row.companie].filter(Boolean).join(" "),
    sortValue: (row, key) => (["creat", "modificat", "eliminare"].includes(key) ? row[key] || "" : undefined),
    renderCell: (row, key) => {
      switch (key) {
        case "nr": {
          /* the post-process under the number (the act's number is in the window header and Verificare) */
          const sub = row.tip;
          /* the number = the list's compact copy (copy-wrap-v1: no icon in lists, the number copies) */
          return `
          <div class="e-permits-workplace__case-cell">
            ${A().renderListCode?.(row.nr) || `<span class="e-permits-passport__name" data-cell-tooltip="${esc(row.nr)}">${esc(row.nr)}</span>`}
            <span class="e-permits-workplace__source"><span data-cell-tooltip="${esc(sub)}">${esc(sub)}</span></span>
          </div>`;
        }
        case "serviciu": return `<span data-cell-tooltip="${esc(row.serviciu)}">${esc(row.serviciu)}</span>`;
        case "titular": return row.titular ? `<span data-cell-tooltip="${esc(row.titular)}">${esc(row.titular)}</span>` : '<span class="e-permits-workplace__dash">—</span>';
        case "companie": return row.companie ? `<span data-cell-tooltip="${esc(row.companie)}">${esc(row.companie)}</span>` : '<span class="e-permits-workplace__dash">—</span>';
        case "creat": return U().renderDateTime?.(row.creat) || esc(longDate(row.creat));
        case "modificat": return U().renderDateTime?.(row.modificat) || esc(longDate(row.modificat));
        case "eliminare": {
          const n = daysUntil(row.eliminare);
          return dateCell(row.eliminare, row.notificat ? `${inDays(n)} · notificare trimisă` : inDays(n), n <= NOTIFY_BEFORE_DAYS ? "warning" : "");
        }
        /* „Elimină schița” is the row's only action (US-248 AC-06: every row is a draft) → the lone grey trash
           (lone-trash-v1, Row actions rule 10) */
        case "actiuni": return `<span class="e-permits-workplace__row-actions"><button class="btn btn-neutral btn-sm btn-icon-only e-permits-gh-row-remove" type="button" aria-label="Elimină schița ${esc(row.nr)}" data-tooltip-label="Elimină schița" data-gh-remove="${esc(row.id)}"><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-delete"></use></svg></button></span>`;
        default: return esc(String(row[key] ?? "—"));
      }
    },
    /* AC-11: a click opens the draft at its last saved step */
    openRow: (id) => { window.location.hash = `#oficiu/${encodeURIComponent(id)}`; },
    rowLabel: (row) => `${row.nr}, ${row.tip}, ${row.serviciu}${row.titular ? `, ${row.titular}` : ""} — schiță, continuă completarea`,
    rowClass: () => "",
    emptyHtml: ({ query, filtered }) => {
      const E = window.GEAPEmptyState;
      if (!canOfc()) return E?.render({ title: NO_RIGHTS, text: "Dosarele din oficiu sunt disponibile utilizatorilor cu permisiunea de inițiere a dosarelor din oficiu.", icon: "lock", bare: true });
      if (!S.data) return E?.render({ title: "Se încarcă schițele…", loading: true, bare: true });
      /* AC-10 / AC-09 */
      if (query || filtered) return E?.noResults?.("Nicio înregistrare nu corespunde criteriului de căutare", { text: "Caută după numărul cererii, numele titularului sau companie.", bare: true });
      return E?.render({ title: "Nu sunt schițe înregistrate.", text: "Dosarele inițiate din oficiu apar aici ca schițe până la confirmarea depunerii.", icon: "page-text", bare: true, actionHtml: '<button class="btn btn-primary btn-sm" type="button" data-workplace-add-product="ofc-new">Nou</button>' });
    },
    exportRows: (rows) => openExport(rows, OFC_KIND)
  };
  window.GEAPShellRoutes.push((hash) => {
    const m = hash.match(/^#oficiu\/([^/]+)(?:\/([^/]+))?$/);
    if (!m) return false;
    route(decodeURIComponent(m[1]), m[2], OFC_KIND);
    return true;
  });
  /* AC-01 (US-249): a role without the item that opens #office directly gets the list's no-rights state */
  window.GEAPShellRoutes.push((hash) => {
    if (hash !== LISTS.oficiu.hash || document.querySelector(`[data-nav-item][data-nav-id="${OFC_NAV}"]`)) return false;
    A().showRegistry?.(ofcRegistryDb());
    return true;
  });

  /* US-247 AC-09 (oficiu-v2): before the retention period ends the initiator gets the removal warning through MNotify
     AND as an internal SIA GEAP notification = the BO header bell. The bell opens an anchored dropdown (the header
     „Ajutor” menu surface) with one two-line item per warned draft: the exact removal date + the way to finish it
     (the item opens the draft at its last saved step). The dot counts the warnings. Demo: ofc-11, ofc-11a. */
  const NOTIF_ID = "gh-ofc-notif";
  const ofcNotices = () => (S.data && canOfc() ? ofcDrafts().filter((d) => d.notified) : []);
  const bellBtn = () => document.querySelector(".e-permits-shell__icon-button--notification");
  function syncOfcBell() {
    const bell = bellBtn();
    if (!bell || document.querySelector('[data-nav-id="ek-dashboard"]')) return; /* the eKYC product owns its bell */
    const n = ofcNotices().length;
    if (!n) return;
    const dot = bell.querySelector(".e-permits-shell__notification-dot");
    if (dot) { dot.textContent = String(n); dot.hidden = false; }
    bell.setAttribute("aria-label", `Notificări: ${n} ${n === 1 ? "nouă" : "noi"}`);
    bell.setAttribute("aria-haspopup", "menu");
    bell.setAttribute("aria-controls", NOTIF_ID);
    if (!bell.hasAttribute("aria-expanded")) bell.setAttribute("aria-expanded", "false");
  }
  function ofcNoticeItemHtml(d) {
    const end = longDate(retentionEnd(d));
    return `
      <li role="none">
        <a class="select-option e-permits-shell__help-link e-permits-gh-notif__item" role="menuitem" href="#oficiu/${encodeURIComponent(d.id)}" aria-label="Schița ${esc(d.nr)} se elimină automat la ${esc(end)}. Deschide schița pentru a o finaliza." data-gh-notif-open="${esc(d.id)}">
          <svg class="icon e-permits-gh-notif__icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-time"></use></svg>
          <span class="e-permits-gh-notif__text">
            <span class="e-permits-gh-notif__title">Schița ${esc(d.nr)} se elimină automat la ${esc(end)}</span>
            <span class="e-permits-gh-notif__meta">${esc(d.requestType)} · finalizați schița până atunci · trimisă și prin MNotify</span>
          </span>
        </a>
      </li>`;
  }
  function toggleOfcBell(open) {
    const bell = bellBtn();
    if (!bell) return;
    let panel = document.getElementById(NOTIF_ID);
    if (!open) { if (panel && !panel.hidden) { panel.hidden = true; bell.setAttribute("aria-expanded", "false"); } return; }
    if (!panel) {
      /* the bell gets the header tool wrapper (position: relative) of the „Ajutor” menu, so the dropdown anchors to it */
      if (!bell.parentElement.matches(".e-permits-shell__header-tool-menu")) {
        const wrap = document.createElement("div");
        wrap.className = "e-permits-shell__header-tool-menu";
        bell.replaceWith(wrap);
        wrap.append(bell);
      }
      panel = document.createElement("div");
      panel.id = NOTIF_ID;
      panel.className = "select-dropdown e-permits-shell__help-menu e-permits-gh-notif";
      panel.setAttribute("role", "presentation");
      bell.after(panel);
    }
    const items = ofcNotices();
    panel.innerHTML = `
      <p class="e-permits-gh-notif__heading" id="${NOTIF_ID}-title">Notificări</p>
      <ul class="select-list e-permits-shell__help-list" role="menu" aria-labelledby="${NOTIF_ID}-title">${items.map(ofcNoticeItemHtml).join("")}</ul>`;
    panel.hidden = false;
    bell.setAttribute("aria-expanded", "true");
    panel.querySelector('[role="menuitem"]')?.focus();
  }
  document.addEventListener("click", (event) => {
    const bell = event.target.closest?.(".e-permits-shell__icon-button--notification");
    if (bell && ofcNotices().length && !document.querySelector('[data-nav-id="ek-dashboard"]')) {
      toggleOfcBell(bell.getAttribute("aria-expanded") !== "true");
      return;
    }
    const item = event.target.closest?.("[data-gh-notif-open]");
    if (item) { event.preventDefault(); toggleOfcBell(false); window.location.hash = `#oficiu/${encodeURIComponent(item.dataset.ghNotifOpen)}`; return; }
    if (!event.target.closest?.(`#${NOTIF_ID}`)) toggleOfcBell(false);
  });
  document.addEventListener("keydown", (event) => {
    const panel = document.getElementById(NOTIF_ID);
    if (!panel || panel.hidden) return;
    if (event.key === "Escape") { toggleOfcBell(false); bellBtn()?.focus(); return; }
    if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
    const items = [...panel.querySelectorAll('[role="menuitem"]')];
    const i = items.indexOf(document.activeElement);
    if (i < 0) return;
    event.preventDefault();
    items[(i + (event.key === "ArrowDown" ? 1 : items.length - 1)) % items.length].focus();
  });

  /* US-246 AC-06/07: the submitted dossier joins the shell's dossiers — „În examinare” with the project stage
     („Proiect”), distributed to the initiator (the signed-in specialist of the dossier seed), origin „Din oficiu”
     (sursa OFICIU: the BO profile shows „Inițiat · Din oficiu”, the holder and the base act). Kept in the desk store
     and put back after every page load (the shell rebuilds its seed rows). */
  function ofcDossierRow(d, db) {
    const me = (db.specialisti || []).find((s) => s.id === db.meSpecialistId) || db.specialisti?.[0] || null;
    const act = ofcActOf(d);
    const titular = fullName(d.applicant) || holderName(d);
    const companie = d.personType === "PJ" ? d.company.denumire : "";
    return {
      id: d.nr, nrDosar: d.nr, status: "inExaminare", alerte: [], decizia: "proiect",
      tipDosar: OFC_DOSSIER_TYPE[d.requestType] || d.requestType,
      serviciu: serviceOf(d.service)?.title || d.service,
      numeSolicitant: titular, companie, specialist: me, repartizatDe: me, subdiviziune: db.mySubdiviziune,
      dataDepunerii: d.submittedAt.slice(0, 10), termenExaminare: d.examDeadline.slice(0, 10), termenZile: ofcTermDays(d),
      dataSemnarii: null, modLivrare: d.delivery.mode === "ghiseu" ? "Ghișeu" : "Electronic", nedistribuit: false,
      sursa: "OFICIU",
      actBaza: { nr: act?.nr || "", denumire: serviceOf(d.service)?.title || "", titular, companie },
      nrActEmis: null,
      motivOficiu: [d.ofc?.decision?.temei, d.ofc?.decision?.nr ? `nr. ${d.ofc.decision.nr} din ${longDate(d.ofc.decision.date)}` : ""].filter(Boolean).join(", "),
      dataInitierii: d.createdAt.slice(0, 10), initiatDe: me
    };
  }
  function syncOfcDossiers({ redraw = false } = {}) {
    const db = A().dossierStore?.();
    if (!db?.runtimeRows || !S.data) return false;
    const have = new Set(db.runtimeRows.map((row) => row.id));
    const added = S.drafts.filter((d) => isOfc(d) && isSubmitted(d) && !have.has(d.nr)).map((d) => ofcDossierRow(d, db));
    if (!added.length) return true;
    db.runtimeRows.unshift(...added);
    /* the dossiers list on screen (e.g. „Dosarele mele” after a reload) shows them at once */
    if (redraw && A().els?.workplacePanel?.dataset.registryKind === "dossiers" && !A().els.workplacePanel.hidden) A().renderWorkplace?.();
    return true;
  }

  /* ---------------------------------------------------------------- permission (Feature AC-02, every story AC-01) */
  function can() {
    const role = A().currentAssignment?.()?.roleId;
    return role === "operator-ghiseu" || role === "central-admin";
  }

  /* ================================================================ the wizard page */
  const ERR_ICON = icon("circle-error-filled");
  const errSlot = (key) => `<span class="message message--inline message--error e-permits-fo-field__error" id="gh-err-${key}" data-gh-err="${key}" hidden></span>`;
  /* a document field's error = the FO document field error (GEAPFormRender.docFieldErrorHtml), never inside the label
     column: last in the field, 8 under the button row (`inField`), or right after a boxed field, like an input's
     message (doc-error-outside-v1) */
  const docErrSlot = (key, { inField = true } = {}) => R().docFieldErrorHtml?.(`gh-err-${key}`, "", ` data-gh-err="${key}"${inField ? " data-fo-doc-required-error" : ""} hidden`) || errSlot(key);
  /* the document field that owns an error slot (inside it, or the boxed field right before it) */
  const docFieldOfSlot = (slot) => slot.closest(".e-permits-fo-doc-field") || (slot.previousElementSibling?.matches(".e-permits-fo-doc-field") ? slot.previousElementSibling : null);
  /* its buttons are described by the error while it shows */
  function syncDocErr(slot) {
    const field = docFieldOfSlot(slot);
    if (!field) return;
    if (field.matches("[data-fo-doc-field]")) { R().docSyncDescribedBy?.(field); return; }
    field.querySelectorAll("[data-gh-paper]").forEach((btn) => { if (slot.hidden) btn.removeAttribute("aria-describedby"); else btn.setAttribute("aria-describedby", slot.id); });
  }
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
    /* a dossier submitted in this window (user 2026-10-23 on GEAP 11595:321749): back over «Dosare noi» the library
       success toast says it once (auto-dismiss, as every success toast); the window itself showed it in place */
    if (S.submittedNr) {
      const nr = S.submittedNr;
      S.submittedNr = null;
      /* din oficiu (US-246 AC-07): distributed to the initiator at once */
      const text = S.mode === OFC_KIND ? `Dosarul ${nr} a fost depus și distribuit către dvs.` : `Dosarul ${nr} a fost depus și trimis la distribuire.`;
      setTimeout(() => U().showShellToast?.(text, "success"), 0);
    }
  }
  /* × / Esc / scrim: the pending autosave runs now, then the window closes — no „Salvați schița?” dialog any more
     (ghiseu-autosave-csv-v1: with autosave there is nothing unsaved to lose) */
  function requestCloseSheet() {
    autosave();
    leave();
  }
  function leave() {
    S.cur = null; S.dirty = false;
    closeSheet();
    toList();
  }
  /* the window's list behind the dialogs («Dosare noi» / «Dosare inițiate din oficiu», S.mode): drawn when it is
     not the page already, refreshed otherwise */
  function toList() {
    const list = listOf();
    const nav = document.querySelector(`[data-nav-item][data-nav-id="${list.nav}"]`);
    if (nav) nav.click(); else setHash(list.hash);
    updateBadge();
  }
  function ensureListBehind() {
    const list = listOf();
    const reg = document.querySelector(`[data-registry-kind="${list.kind}"]`);
    if (reg && !reg.hidden && !reg.closest("[hidden]")) return;
    document.querySelector(`[data-nav-item][data-nav-id="${list.nav}"]`)?.click();
  }
  const setHash = (hash) => { if (window.location.hash !== hash) history.replaceState(null, "", `${window.location.pathname}${window.location.search}${hash}`); };

  /* ---------------------------------------------------------------- open */
  const shellReady = () => new Promise((resolve) => {
    let tries = 0;
    const tick = () => { if ((window.GEAPShellApi && A().servicesStore?.() && window.GEAPFormRender) || tries > 100) resolve(); else { tries += 1; setTimeout(tick, 60); } };
    tick();
  });
  async function route(id, stepId, mode = "ghiseu") {
    await load();
    await shellReady();
    await R().schemaReady?.();
    S.mode = mode === OFC_KIND ? OFC_KIND : "ghiseu";
    const allowed = S.mode === OFC_KIND ? canOfc() : can();
    if (allowed) ensureListBehind();
    if (!allowed) {
      renderMessage({ title: NO_RIGHTS, icon: "lock", text: S.mode === OFC_KIND
        ? "Dosarele din oficiu se inițiază doar de utilizatorii cu permisiunea de inițiere a dosarelor din oficiu (Administrator central sau un rol căruia i-a fost acordată)."
        : "Cererile la ghișeu se inițiază doar de utilizatorii cu permisiunea de inițiere a cererilor la ghișeu (Specialist ghișeu, Administrator central)." });
      return;
    }
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
    ov.querySelector("[data-gh-start-title]").textContent = crumb || (S.mode === OFC_KIND ? "Dosar nou din oficiu" : "Dosar nou");
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
    /* din oficiu (US-242 AC-02): „Nou” opens the window straight on the act search — no small modal, no applicant */
    if (S.mode === OFC_KIND) {
      S.cur.channel = OFC;
      S.step = STEP_INDEX.intent;
      S.actsQuery = ""; S.ofcService = ""; S.actCleared = false;
      document.getElementById(START_ID)?.classList.contains("is-active") && closeStart();
    }
    closeSheet();
    render();
  }
  function openDraft(id, stepId) {
    const saved = S.drafts.find((d) => d.id === id || d.nr === id);
    const ofc = S.mode === OFC_KIND;
    /* a draft opens in its own list's window (a desk request under #oficiu/… or the other way round = not found);
       an ex-officio draft is the initiator's own (US-249 AC-04) */
    if (!saved || isOfc(saved) !== ofc || (ofc && saved.by !== userName())) { renderMessage({ title: "Cererea nu a fost găsită", text: `Verificați numărul cererii în lista ${listOf().name}.`, icon: "search" }); return; }
    if (saved.removed) {
      renderMessage({
        /* no numbers in a dialog header (product rule): the ex-officio window names the list instead */
        crumb: ofc ? "Dosar din oficiu" : saved.nr,
        title: saved.removed.auto ? "Schița a fost eliminată automat" : "Schița a fost eliminată",
        text: `${saved.removed.auto ? `La ${longDate(saved.removed.at)}, după perioada de retenție de ${settingsOf(saved.service).retentie} de zile.` : `La ${stamp(saved.removed.at)}, de ${saved.removed.by}.`}${saved.removed.reason ? ` Motivul eliminării: ${saved.removed.reason}.` : ""} Accesul la schiță este dezactivat, iar depunerea pe baza ei nu mai este posibilă.`,
        icon: "delete",
        actionHtml: ofc ? '<button class="btn btn-primary btn-rounded" type="button" data-ofc-new>Dosar nou din oficiu</button>' : '<button class="btn btn-primary btn-rounded" type="button" data-gh-new>Dosar nou</button>'
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
    /* US-245 AC-11 (din oficiu): a draft reopened at Verificare is an entry into the step too */
    if (ofc && S.step === STEP_INDEX.verificare && !isSubmitted(saved)) { audit("Intrare în pasul Verificare", S.cur, "Rezumatul dosarului afișat · reușită"); writeStore(); }
    render();
  }
  const openDraftFromList = (id) => { window.location.hash = `#ghiseu/${encodeURIComponent(id)}`; };
  /* the window's address: #ghiseu/<id>/<step> · #oficiu/<id>/<step> (#oficiu/nou before the first save) */
  const hashFor = (d, stepId) => (isOfc(d)
    ? `#oficiu/${d.id ? `${encodeURIComponent(d.id)}/${stepId}` : "nou"}`
    : `#ghiseu/${encodeURIComponent(d.id)}/${stepId}`);

  /* ---------------------------------------------------------------- render */
  /* the FO header draft status „Salvat ca schiță · 14:32” (today: the time only, as the FO; an older save: the date
     too) + the desk retention date (US-239) */
  function savedStatusHtml(d) {
    if (isSubmitted(d)) return esc(`Depus la ${stamp(d.submittedAt)}`);
    if (!d.updatedAt || !d.id) return "Nesalvat";
    const at = new Date(d.updatedAt);
    const hm = `${pad(at.getHours())}:${pad(at.getMinutes())}`;
    const time = at.toDateString() === new Date().toDateString() ? hm : `${longDate(d.updatedAt)}, ${hm}`;
    return R().draftStatusHtml?.({ time, datetime: d.updatedAt, extraHtml: `<span class="e-permits-fo-draft-status__dot" aria-hidden="true"></span><span class="e-permits-fo-draft-status__time">eliminare automată la ${esc(longDate(retentionEnd(d)))}</span>` }) || "";
  }
  /* after an autosave only the status line changes (an open ⋮ / the focus in the header stay); the live region
     speaks only when the text changes — at most once a minute */
  function syncSavedStatus() {
    const line = document.querySelector(`#${SHEET_ID} [data-gh-saved]`);
    if (!line || !S.cur) return;
    const next = savedStatusHtml(S.cur);
    const probe = document.createElement("p");
    probe.innerHTML = next;
    if (probe.textContent.replace(/\s+/g, " ").trim() !== line.textContent.replace(/\s+/g, " ").trim()) line.innerHTML = next;
  }
  /* ghiseu-autosave-csv-v1: the step's current values into the draft, saved without validation (a draft is work in
     progress; „Înainte” and the submit still validate). Nothing to do outside the request window, before the request
     exists (the small „Dosar nou” modal saves on „Continuă”), on „Ce se solicită?” or once the dossier is filed. */
  function autosave({ explicit = false } = {}) {
    clearTimeout(autosaveTimer);
    const d = S.cur;
    if (!d || !d.id || d.removed || isSubmitted(d) || S.step <= STEP_INDEX.intent || !sheetOpen()) return false;
    if (!S.dirty && !explicit) return false;
    /* din oficiu (US-247 AC-03 / AC-06, oficiu-v2): a draft is saved only with the current step valid — the quiet
       autosave skips an invalid step (no errors shown; „Salvează schița” shows them) */
    if (isOfc(d) && validateStep(S.step).length) return false;
    COLLECT[STEPS[S.step].id]?.();
    voidIfChanged();
    if (S.step < STEP_INDEX.verificare) S.sigAtEntry = sig(d);
    persist({ auto: !explicit });
    syncSavedStatus();
    return true;
  }
  window.addEventListener("pagehide", () => { if (S.dirty) autosave(); });

  function sheetHeaderHtml(d) {
    const svc = serviceOf(d.service);
    const removable = d.id && !isSubmitted(d) && !isPaid(d);
    const onIntent = STEPS[S.step]?.id === "intent";
    const ofc = isOfc(d);
    const menu = d.id && !isSubmitted(d) ? (A().renderStackMenu?.([
      /* din oficiu: the holder comes with the act, so both change on the act search (US-243 constraints) */
      ...(d.process && !onIntent ? [{ label: ofc ? "Schimbă actul sau postprocesul" : "Schimbă procesul", icon: "reorder", attrs: `data-gh-change-process${isPaid(d) ? ' aria-disabled="true" data-tooltip-reason="Nota de plată este achitată: procesul nu se mai poate schimba."' : ""}` }] : []),
      { label: "Istoricul cererii", icon: "history", attrs: "data-gh-history" },
      { label: "Elimină schița", icon: "delete", danger: true, attrs: `data-gh-remove="${esc(d.id)}"${removable ? "" : ' aria-disabled="true" data-tooltip-reason="Nota de plată este achitată: schița nu se mai poate elimina."'}` }
    ], d.nr) || "").replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>") : "";
    const statusTags = `${tagHtml(d.status, d.status === "În procesare" ? "info" : d.status === "Respins formal" ? "danger" : "neutral")}${d.substatus && d.substatus !== d.status ? ` ${tagHtml(d.substatus, SUB_TONE[d.substatus] || "neutral")}` : ""}`;
    const processMeta = d.process === "post" ? `${d.requestType} · ${(ofc ? ofcActOf(d) : actById(d, d.act))?.nr || ""}` : d.requestType;
    /* din oficiu before the first save (the act search): no number and no status yet — the draft line says „Nesalvat” */
    const meta = [d.nr || (ofc ? "" : "Nesalvat"), holderName(d), processMeta, ofc ? OFC : "Ghișeu"].filter(Boolean).map((x) => `<span class="e-permits-gh-sheet__meta-part">${esc(x)}</span>`).join("");
    const tags = ofc && !d.id ? "" : `<span class="e-permits-gh__tags">${statusTags}</span>`;
    return `
      <div class="e-permits-gh-sheet__title">
        <h2 class="modal--header-title" id="gh-sheet-title" data-cell-tooltip>${esc(svc?.title || (ofc ? "Dosar nou din oficiu" : "Dosar nou"))}</h2>
        <div class="e-permits-gh-sheet__meta">${meta}${tags}</div>
        <p class="e-permits-fo-draft-status e-permits-gh-sheet__saved" aria-live="polite" data-gh-saved>${savedStatusHtml(d)}</p>
      </div>
      <div class="e-permits-gh-sheet__actions">
        ${isSubmitted(d) || isPaid(d) || !d.id ? "" : `<button class="btn btn-neutral btn-sm e-permits-gh-sheet__save" type="button" aria-label="Salvează schița" data-tooltip-label="Salvează schița" data-gh-save><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg?v=draft-icons-v1#icon-cloud-upload-draft"></use></svg><span class="e-permits-gh-sheet__save-label">Salvează schița</span></button>`}
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
                <span class="e-permits-fo-stepper__row" ${open ? `role="button" tabindex="0" aria-label="Deschide pasul ${n + 1}: ${esc(stepLabel(d, step.id))}" data-gh-goto="${i}" data-gh-free` : 'aria-disabled="true"'}>
                  <span class="e-permits-fo-stepper__number">
                    <span class="e-permits-fo-stepper__number-text">${n + 1}</span>
                    ${icon("checkmark-small", 16, "icon e-permits-fo-stepper__check")}
                  </span>
                  <span class="e-permits-fo-stepper__label">${esc(stepLabel(d, step.id))}</span>
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
          <span class="e-permits-fo-mobile-progress__label">${esc(stepLabel(d, STEPS[S.step].id))}</span>
          <span class="e-permits-fo-mobile-progress__count">Pasul ${n} din ${steps.length}</span>
        </div>
        <div class="e-permits-fo-mobile-progress__bar" aria-hidden="true"><svg class="e-permits-gh__progress-bar" width="100%" height="4" preserveAspectRatio="none"><rect class="e-permits-gh__progress-fill" width="${Math.round((n / steps.length) * 100)}%" height="4" rx="2"></rect></svg></div>
      </div>`;
  }
  /* the FO step footer (GEAPFormRender.stepFooterHtml, fo-02…fo-06): „Salvează ca schiță” left, the round
     back arrow + „Înainte →” right, at the end of the step content as in FO; the first step has no back */
  function footerHtml(d, opts = {}) {
    if (S.step <= STEP_INDEX.intent) return ""; /* the small modal, „Ce se solicită?” and the ex-officio act search have none */
    if (opts.custom) return R().stepFooterHtml?.({ customHtml: opts.custom }) || "";
    const { next = "Înainte", nextAttrs = "data-gh-next", nextDisabled = false, back = true, hint = "" } = opts;
    const prevIndex = prevStepIndex(d, S.step);
    const prev = S.step > STEP_INDEX.identificare && back && prevIndex > STEP_INDEX.intent ? STEPS[prevIndex] : null;
    return `
      ${hint ? U().renderInfoNote?.(esc(hint)) || "" : ""}
      ${R().stepFooterHtml?.({
        /* „Salvează schița” lives in the window header (user 2026-10-16): the footer is back + „Înainte →” */
        backAttrs: prev ? "data-gh-prev" : "",
        backLabel: prev ? `Înapoi la ${stepLabel(d, prev.id)}` : "",
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
    setHash(hashFor(d, STEPS[S.step].id));
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
  /* the act rows' „Postprocese ⌄” menus (FO markup; the open trigger keeps its ring) */
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
    if (isOfc(S.cur)) { ofcConfirmStart(row.dataset.foIntentAct, item.dataset.foIntentPostprocess); return; }
    deskConfirmStart(row.dataset.foIntentAct, item.dataset.foIntentPostprocess);
  }
  /* start-dialog-v1/v2 (2026-10-29, user): the desk ⋮ › a post-process asks the shared „Before you start” dialog
     (js/start-dialog.js) — the act's name, one sentence (or the consequence notice for Suspendare / Retragere), fee ·
     term · signing from the desk config (data/ghiseu.json › services: the request type's terms + fees, olograf / MSign);
     „Începe” = startProcess (the process saved on the desk draft, step „Identificare”), „Anulează” / × / Esc → the ⋮. */
  function deskConfirmStart(actId, type) {
    const d = S.cur;
    const act = actById(d, actId);
    if (!act) return;
    const trigger = S.page?.querySelector(`[data-fo-intent-act="${CSS.escape(actId)}"] [data-fo-intent-trigger]`);
    closeIntentMenus();
    const desk = deskOf(d.service) || {};
    const terms = typeCfg({ ...d, requestType: type }).terms || [];
    const fee = (terms[0]?.fees || []).reduce((sum, k) => sum + (desk.fees?.[k]?.amount || 0), 0);
    const st = settingsOf(d.service);
    const sign = [st.olograf ? "olograf" : "", st.msign ? "MSign" : ""].filter(Boolean).join(" sau ");
    const SD = window.GEAPStartDialog;
    const consequence = SD.consequenceFor(type);
    SD.open({
      title: SD.titleFor(type),
      subtitle: act.name || "",
      text: SD.summaryFor(type),
      consequence, tone: SD.toneFor(type),
      facts: SD.facts({ fee, term: terms.map((t) => t.label).join(" sau "), sign: sign ? `Semnare ${sign}` : "" }),
      trigger,
      onStart: () => startProcess("post", actId, type)
    });
  }
  /* din oficiu (US-242 AC-10/11, oficiu-v3 — user 2026-10-29: „a ⋮ item is a command”): ⋮ › a post-process asks the
     library confirm dialog „Inițiezi <Postproces>?” (the act's summary + „Se creează o schiță de dosar din oficiu.”);
     „Anulează” closes with nothing saved (focus back on the ⋮), „Inițiază” = the AC-11 moment: ofcStart creates the
     draft (first save: nr + UID, „Schiță” · „Schiță”, canal „Din oficiu”, audit) and opens „Date titular”. A busy act
     has no ⋮ (one active post-process), so no dialog. */
  function ofcConfirmStart(actId, type) {
    const act = ofcActs().find((a) => a.id === actId);
    if (!act || ofcBusy(act, S.cur?.id || "") || !ofcTypes(act).includes(type)) return;
    const trigger = S.page?.querySelector(`[data-fo-intent-act="${CSS.escape(actId)}"] [data-fo-intent-trigger]`);
    closeIntentMenus();
    const SD = window.GEAPStartDialog;
    /* start-dialog-v1/v2 (2026-10-29): the shared „Before you start” dialog replaces the oficiu-v3 „Inițiezi <X>?” — the
       act's name, one sentence (or the consequence notice), fee · term (data/ghiseu.json › oficiu.termene; no signing
       for din oficiu); „Începe” = the AC-11 moment (ofcStart: the draft, „Date titular”) */
    SD.open({
      title: SD.titleFor(type),
      subtitle: act.name || "",
      text: SD.summaryFor(type),
      consequence: SD.consequenceFor(type), tone: SD.toneFor(type),
      facts: SD.facts({ fee: 0, term: Number(S.data?.oficiu?.termene?.[type]) || 10 }),
      trigger,
      onStart: () => ofcStart(actId, type)
    });
  }
  function ofcStart(actId, type) {
    const d = S.cur;
    const act = ofcActs().find((a) => a.id === actId);
    if (!act || ofcBusy(act, d.id) || !ofcTypes(act).includes(type)) return;
    ofcApplyAct(d, act, type);
    S.actCleared = false;
    /* demo prefill (as the desk): the decision and the documents filled, so „Înainte” passes up to Verificare;
       ?prefill=0 starts empty */
    if (params.get("prefill") !== "0") fillDemoOfc(d, STEP_INDEX.verificare);
    audit("Alegerea actului și a postprocesului", d, `${type} · ${act.nr} · ${serviceOf(act.service)?.title || ""}`);
    S.step = STEP_INDEX.identificare;
    persist();
    render();
  }
  /* header ⋮ „Schimbă procesul”: back to the intent screen; what depends on the process is cleared
     (form, documents, verification) — asked first when there is any */
  function changeProcess() {
    const d = S.cur;
    const ofc = isOfc(d);
    const doIt = () => {
      COLLECT[STEPS[S.step].id]?.();
      d.process = ""; d.act = null; d.requestType = "";
      if (ofc) d.ofc = blankOfc();
      d.details = { values: {}, address: {}, subdivision: ofc ? d.details.subdivision : "", term: "", reductions: [] };
      d.docs = {}; d.review = { paper: null, olograf: null, signed: null, voided: [] }; d.payment = null;
      d.maxStep = STEP_INDEX.intent;
      audit("Schimbarea procesului", d, "Procesul anterior a fost anulat");
      S.step = STEP_INDEX.intent;
      persist();
      render();
    };
    if ((d.maxStep || 0) <= STEP_INDEX.identificare && !Object.keys(d.docs || {}).length) { doIt(); return; }
    U().askConfirm?.(ofc ? {
      title: "Schimbați actul sau postprocesul?",
      text: `Detaliile, decizia autorității și documentele pentru „${d.requestType}” se pierd. Titularul se preia din actul ales.`,
      confirmLabel: "Schimbă actul",
      destructive: true
    } : {
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
  const NOT_FOUND_MSG = "Persoana nu a fost găsită în registrul de stat.";
  const mconnectDown = () => params.get("mconnect") === "0";
  /* MConnect down (user 2026-10-23, GEAP 11850:301832): ONE warning notice above the lookups says it once —
     no red error on the code, no „introdus manual” hint under every field. It shows once a lookup could not
     reach the registry (a slot in the „manual” state) and only while the registry is down; the manual values
     keep their „Introdus manual” tag on the role cards / Verificare for the specialist. */
  const DOWN_NOTICE = "<strong>Registrul de stat nu răspunde acum.</strong> Completați datele manual. Datele introduse manual se verifică la examinare.";
  const downNoticeHtml = (slots) => (mconnectDown() && slots.some((slot) => slot?.state === "manual")
    ? U().renderNotice?.("warning", DOWN_NOTICE, { className: "e-permits-gh__down-notice" }) || ""
    : "");

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
          <p class="e-permits-fo-field__hint" id="${id}-hint" data-fo-field-hint>${found ? `Preluat din ${kind === "company" ? "RSUD" : "RSP"} prin MConnect` : ""}</p>
        </div>
        ${conf.targets.map(([key, tLabel, span, value, ph]) => `
          <div class="e-permits-fo-field e-permits-fo-field--span-${span}">
            <label for="${id}-${key}">${esc(tLabel)}${manual ? ` ${req()}` : ""}</label>
            <div class="e-permits-fo-input${manual ? "" : " is-filled is-readonly"}">
              <input id="${id}-${key}" type="text"${manual ? ` placeholder="${key === "name" ? "Introdu denumirea" : key === "last" ? "Introdu numele" : "Introdu prenumele"}" aria-required="true"` : ` readonly tabindex="-1" placeholder="${esc(ph)}"`} value="${esc(value || "")}" data-fo-registry-target="${key}" data-gh-target="${kind}:${key}">
              ${found && value ? icon("checkmark-small") : ""}
            </div>
          </div>`).join("")}
        <p class="u-visually-hidden" role="status" aria-live="polite" data-fo-registry-live></p>
      </div>`;
  }
  function basisHtml(d) {
    const b = S.step === 0 ? null : basisOf(d);
    if (!b || b.kind === "self") return '<div data-gh-block="basis" class="e-permits-fo-form__role-group e-permits-fo-form__basis e-permits-gh__basis" hidden></div>';
    const filer = d.personType === "PJ" ? fullName(d.applicant) : fullName(d.rep);
    const holder = holderName(d);
    let body = "";
    /* ghiseu-roles-as-fo-v1 (user 2026-10-23, on Alexandru's „unde verificăm MPower? cum le selectăm?”): the FO
       „Temeiul reprezentării” role group (`representationBasisHtml`: small title + „ⓘ”, then the card) — the „ⓘ”
       says RSUD / MPower are checked automatically, nothing to select; the desk adds the paper procură fallback */
    /* the FO full-flow layouts (user 2026-10-16, Figma 11685:13047): MPower = the FO „Împuternicire MPower
       aplicată” card (fo-02, the same renderer); RSUD administrator = the same card (the FO has no RSUD
       card: an MPass administrator files as himself) with the RSUD source; Procură = the warning + the
       FO check option, and once ticked the FO boxed procură upload of the guest „pentru altcineva” flow */
    if (b.kind === "rsud") {
      body = R().authorizationCardHtml?.({ title: "Administrator în RSUD", status: "Confirmat", icon: "icon-business", details: [{ label: "Administrator al", value: holder }, { label: "Sursa", value: "RSUD prin MConnect" }] }) || "";
    } else if (b.kind === "mpower") {
      body = R().authorizationCardHtml?.({ title: "Împuternicire MPower aplicată", status: "Activă", grantedBy: holder, validUntil: longDate(b.until), code: b.nr }) || "";
    } else {
      /* AC-21 error = the FO way: message under the group, only the checkbox control in the library error
         style (checkbox--error) — no border around the option */
      const option = U().renderCheckOption?.({ label: "Prin procură", required: true, checked: d.procura, attrs: 'data-gh-procura aria-describedby="gh-err-procura"' }) || "";
      const procuraOption = d.procura ? option : option.replace('class="checkbox ', 'class="checkbox checkbox--error ');
      body = `<div class="e-permits-gh__basis-body">
        ${U().renderNotice?.("warning", b.manual
          ? "<strong>Legătura nu se poate confirma electronic</strong> cât timp registrul de stat nu răspunde. Verificați procura pe hârtie prezentată de reprezentant."
          : `<strong>Legătura nu este confirmată electronic.</strong> ${esc(filer)} nu este ${d.personType === "PJ" ? "administrator în RSUD și nu are" : "împuternicit în MPower de"} ${d.personType === "PJ" ? `împuternicire MPower pentru ${esc(holder)}` : esc(holder)}. Verificați procura pe hârtie prezentată de reprezentant.`) || ""}
        <div class="e-permits-check-options e-permits-gh__procura">
          ${procuraOption}
        </div>
        ${d.procura ? errSlot("procura") : `<span class="message message--inline message--error e-permits-fo-field__error" id="gh-err-procura" data-gh-err="procura" role="alert">${ERR_ICON}<span>Legătura nu este confirmată electronic. Bifați «Prin procură», după verificarea procurii pe hârtie.</span></span>`}
        ${d.procura ? procuraUploadHtml() : ""}
      </div>`;
    }
    const hints = R().roleGroupHints || {};
    const hint = hints["Temeiul reprezentării"] ? `${hints["Temeiul reprezentării"]} Altfel, se verifică procura pe hârtie.` : undefined;
    return `<div data-gh-block="basis" class="e-permits-fo-form__role-group e-permits-fo-form__basis e-permits-gh__basis">${R().roleGroupTitleHtml?.("Temeiul reprezentării", { hint }) || ""}${body}</div>`;
  }
  /* „Prin procură” ticked: the scanned copy can be attached right here — the FO boxed upload of the guest
     „pentru altcineva” flow (dashed block, black Strict „Adaugă fișier”). It is the same document as
     Documente însoțitoare › „Procură (copia scanată)” (d.docs.procura), which stays the required check
     (US-233: „procura se atașează la documentele însoțitoare”). */
  function procuraUploadHtml() {
    return `
      <div class="e-permits-fo-doc-field e-permits-fo-doc-field--boxed" data-fo-doc-field="gh-procura-basis" data-gh-procura-doc data-fo-upload-only data-fo-doc-accept=".jpg,.jpeg,.png,.pdf" data-fo-doc-max="1" data-fo-doc-limits="JPG, PNG, PDF|60 MB">
        <div class="e-permits-fo-doc-field__row">
          <div class="e-permits-fo-doc-field__info">
            <span class="e-permits-fo-doc-field__label">${esc(PROCURA_DOC.label)} ${req()}</span>
            <p class="e-permits-fo-doc-field__desc">Atașați-o aici sau la pasul „Acte necesare”.</p>
          </div>
          <button class="btn btn-strict btn-md" type="button" data-fo-open-doc-modal data-fo-doc-label="${esc(PROCURA_DOC.label)}">${icon("upload", 20, "icon medium")}<span>Adaugă fișier</span></button>
        </div>
        <div class="e-permits-fo-doc-field__files" data-fo-doc-field-files></div>
      </div>`;
  }
  function bindProcuraDoc(root) {
    const field = root?.querySelector("[data-gh-procura-doc]");
    if (!field) return;
    const box = field.querySelector("[data-fo-doc-field-files]");
    (S.cur.docs.procura || []).slice(0, 1).forEach((doc) => attachTo(box, doc));
    new MutationObserver(() => {
      const el = box.querySelector("[data-fo-doc]");
      let doc = null;
      try { doc = el ? JSON.parse(el.dataset.foDoc) : null; } catch { doc = null; }
      const next = doc ? [{ ...doc, tip: PROCURA_DOC.label }] : [];
      if (JSON.stringify(next) === JSON.stringify(S.cur.docs.procura || [])) return;
      if (next.length) S.cur.docs.procura = next; else delete S.cur.docs.procura;
      S.dirty = true;
      clearErr("doc-procura");
    }).observe(box, { childList: true, subtree: true });
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
      ? R().fieldHtml({ id: "gh-tip", type: "segment", label: "Tip persoană", span: 12, value: d.personType, options: [{ value: "PF", label: "Persoană fizică", icon: "icon-person-filled" }, { value: "PJ", label: "Persoană juridică", icon: "icon-business-filled" }] }).replace("data-fo-segment", "data-fo-segment data-gh-type")
      : readonlyField({ id: "gh-tip-fix", label: "Tip persoană", value: types[0] === "PJ" ? "Persoană juridică" : "Persoană fizică", span: 6, hint: "Singurul tip de solicitant configurat pentru serviciu." });
    const rows = d.personType === "PJ" ? `${codeGroupHtml("company", d)}${codeGroupHtml("applicant", d)}` : codeGroupHtml("applicant", d);
    const down = downNoticeHtml(d.personType === "PJ" ? [d.company, d.applicant] : [d.applicant]);
    return `
      <div data-gh-block="applicant">
        ${section("Solicitantul", `<div class="e-permits-fo-form__section-body">${typeField}${down}${rows}</div>`, { id: "gh-applicant-title" })}
      </div>`;
  }
  /* the request's first step: the identity as FO role cards („Schimbă” = the picker), the representative
     and the basis (AC-15…22) */
  function applicantFlowHtml(d) {
    const manualTag = (slot) => (slot.state === "manual" ? tagHtml("Introdus manual", "warning") : "");
    const holder = d.personType === "PJ"
      ? roleCard({ name: d.company.denumire, idLabel: "IDNO", idValue: d.company.idno, pj: true, tag: manualTag(d.company), change: 'data-gh-goto="0" aria-label="Schimbă solicitantul"' })
      : roleCard({ name: fullName(d.applicant), idLabel: "IDNP", idValue: d.applicant.idnp, tag: manualTag(d.applicant), change: 'data-gh-goto="0" aria-label="Schimbă solicitantul"' });
    /* ghiseu-roles-as-fo-v1 (user 2026-10-23): the FO „Date solicitant” roles as they are — „Solicitant” +
       „Reprezentant” role groups (title + „ⓘ” + identity card), then the „Temeiul reprezentării” group (basisHtml).
       PJ: the person at the desk is the company's Reprezentant (was „Persoana care depune”). PF: the Reprezentant
       group holds the desk's „Cererea se depune de un reprezentant” option + the IDNP lookup; a person found in RSP
       becomes the FO identity card („Schimbă” = a new IDNP); manual values (registry down) stay editable fields. */
    const filer = d.personType === "PJ" ? roleCard({ name: fullName(d.applicant), idLabel: "IDNP", idValue: d.applicant.idnp, tag: manualTag(d.applicant) }) : "";
    const repFound = d.personType === "PF" && d.rep.on && d.rep.state === "found";
    const rep = d.personType === "PF" ? `
      <div class="e-permits-fo-form__role-group e-permits-gh__rep">
        ${roleTitle("Reprezentant")}
        <div class="e-permits-gh__rep-body">
          <div class="e-permits-check-options">${U().renderCheckOption?.({ label: "Cererea se depune de un reprezentant", checked: d.rep.on, attrs: "data-gh-rep-toggle" }) || ""}</div>
          ${repFound
            ? roleCard({ name: fullName(d.rep), idLabel: "IDNP", idValue: d.rep.idnp, change: `data-gh-reset="rep" aria-label="Schimbă reprezentantul ${esc(fullName(d.rep))}"` })
            : d.rep.on ? `<div class="e-permits-fo-form__section-body e-permits-gh__rep-lookup">${downNoticeHtml([d.rep])}${codeGroupHtml("rep", d)}</div>` : ""}
        </div>
      </div>` : "";
    return `
      <div data-gh-block="applicant">
        <section class="e-permits-fo-form__roles${filer ? "" : " is-single"}" aria-label="Solicitant și reprezentare">
          <div class="e-permits-fo-form__roles-grid">
            <div class="e-permits-fo-form__role-group">${roleTitle("Solicitant")}${holder}</div>
            ${filer ? `<div class="e-permits-fo-form__role-group">${roleTitle("Reprezentant")}${filer}</div>` : ""}
          </div>
          ${rep}
          ${basisHtml(d)}
        </section>
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
  /* = GEAPActRow.ppIcon (js/act-row.js, act-icons-v1), which wins in the menu */
  const PP_ICON = { Prelungire: "icon-calendar-add", Reperfectare: "icon-edit", "Emitere duplicat": "icon-copy", "Suspendare valabilitate": "icon-lock", "Reluarea valabilității": "icon-rotate-arrow", Retragere: "icon-circle-x", "Contestație": "icon-judge-gavel" };
  /* one act / decision = the shared act row (GEAPFormRender.actRowHtml → js/act-row.js) as in Cabinet „Actele mele
     permisive” (ghiseu-picker-toast-v1, user 2026-10-23 on GEAP 11850:27348: „same components, only the accent is the
     location; remove the icon; the action fixed and square as in Solicitări”): no lead icon · title = the object /
     location + the Small status tag · line 2 = the act type (no pin) · the Cabinet meta slots (number · authority ·
     subdivision · the key date) · the square ⋮ in the corner with every post-process of the service, the ones the
     status / term does not allow disabled with the reason (AC-28/31/32); no ⋮ when nothing can start (a locked row,
     or every item unavailable — row-menu-no-disabled-only-v1). The row itself is not clickable (as before). */
  const actTypeOf = (d, act) => (act.kind === "decizie" ? act.decizie : serviceOf(d.service)?.title || "");
  const authorityCodeOf = (d) => { const a = A().getAuthorityById?.(serviceOf(d.service)?.authorityId); return a?.shortName || a?.code || ""; };
  function actRowHtml(d, act, attrs = "") {
    const allowed = postprocessesOf(d, act);
    const items = serviceTypes(d).map((t) => ({ id: t, label: t, icon: PP_ICON[t], disabled: !allowed.includes(t), reason: allowed.includes(t) ? "" : ineligibleReason(d, act, t) }));
    const date = act.kind === "decizie" ? `emisă acum ${plural(act.emisZileInUrma, "zi", "zile")}`
      : act.status === "expirat" ? `expirat la ${longDate(act.valabilPana)}` : `valabil până la ${longDate(act.valabilPana)}`;
    return R().actRowHtml?.({
      id: act.id, name: act.name, status: act.status, statusLabel: (ACT_TONE[act.status] || [act.status])[0], tacit: act.tacit
    }, {
      menuId: `gh-act-menu-${act.id}`, items, attrs,
      place: actTypeOf(d, act), placeIcon: false, actionIcon: "icon-more-vertical",
      metaSlots: { number: act.nr, numberLabel: `Copiază numărul actului ${act.nr}`, authority: authorityCodeOf(d), subdivision: act.subdiviziune, date },
      pendingTitle: act.pending ? `${act.pending.type} în curs` : "",
      pendingText: act.pending ? `· dosar ${act.pending.dossier}. Un alt postproces se inițiază după finalizarea acestuia.` : ""
    }) || "";
  }
  /* many acts → the library search above the list (from 8 = the facet-filter SEARCH_MIN, js/facet-filter.js), live,
     case- and diacritics-insensitive (= its `fold`) over location · type · number · subdivision; „Niciun rezultat” = the
     shared empty state (bare + compact); the count is announced. The query survives a redraw (S.actsQuery). */
  const ACTS_SEARCH_MIN = 8;
  const fold = (text) => String(text ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("ro").trim();
  const actSearchText = (d, act) => fold([act.name, actTypeOf(d, act), act.nr, act.subdiviziune].join(" "));
  function actsSearchHtml(query) {
    const label = "Caută după locație, tip sau număr";
    return `
          <div class="e-permits-gh-acts-search">
            <div class="search-input medium rectangular e-permits-workplace__search e-permits-list-search e-permits-list-search--fill${query ? " has-value is-ready" : ""}">
              <span class="icon-search" aria-hidden="true">${icon("search")}</span>
              <input class="input" type="search" placeholder="${label}" aria-label="${label}" autocomplete="off" value="${esc(query)}" data-gh-acts-search>
              <div class="btn-group"><span class="spinner spinner--extra-small spinner--brand" aria-hidden="true"></span><button type="button" class="btn-icon clear" aria-label="Șterge căutarea"><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-cross-small"></use></svg></button></div>
            </div>
            <div data-gh-acts-none${query && !S.actsMatches ? "" : " hidden"}>${window.GEAPEmptyState?.noResults?.("Niciun rezultat", { text: "", bare: true, compact: true }) || "Niciun rezultat"}</div>
            <p class="u-visually-hidden" role="status" aria-live="polite" data-gh-acts-live></p>
          </div>`;
  }
  /* live filter: rows hidden in place (no redraw, the field keeps its focus) */
  let actsLiveTimer = 0;
  function filterActs(input) {
    S.actsQuery = input.value;
    const q = fold(input.value);
    const rows = [...(S.page?.querySelectorAll("[data-gh-act-text]") || [])];
    rows.forEach((row) => { row.hidden = Boolean(q) && !row.dataset.ghActText.includes(q); });
    const shown = rows.filter((row) => !row.hidden).length;
    const box = input.closest(".e-permits-gh-acts-search");
    box?.querySelector("[data-gh-acts-none]")?.toggleAttribute("hidden", shown > 0);
    window.clearTimeout(actsLiveTimer);
    actsLiveTimer = window.setTimeout(() => {
      const live = box?.querySelector("[data-gh-acts-live]");
      if (live) live.textContent = !q ? "" : shown ? `${plural(shown, "act găsit", "acte găsite")}.` : "Niciun rezultat.";
    }, 500);
  }
  /* the request window's first screen (US-233 AC-24…32, user 2026-10-15) = the FO „Ce vrei să soliciți?”
     (GEAPFormRender.intentHtml, shared with FO #intent): „Solicitant <name> · Schimbă” (the small modal),
     „Solicitare nouă”, „sau”, the holder's acts for the service with the post-process menus; no stepper */
  function stepIntent(d) {
    if (isOfc(d)) return ofcIntentHtml(d);
    normalizeProcess(d);
    const acts = actsOf(d);
    const searchable = acts.length >= ACTS_SEARCH_MIN;
    const q = searchable ? fold(S.actsQuery || "") : "";
    const matches = (act) => !q || actSearchText(d, act).includes(q);
    S.actsMatches = acts.filter(matches).length;
    const rowAttrs = (act) => (searchable ? `data-gh-act-text="${esc(actSearchText(d, act))}"${matches(act) ? "" : " hidden"}` : "");
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
          listHeadHtml: searchable ? actsSearchHtml(S.actsQuery || "") : "",
          rowsHtml: acts.map((act) => actRowHtml(d, act, rowAttrs(act))).join(""),
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
    if (isOfc(d)) return ofcTitularHtml(d);
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
        value.textContent = `${opt.dataset.code} • ${opt.dataset.label}`; value.setAttribute("data-cell-tooltip", "");
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
    basis: bindProcuraDoc,
    applicant(block) {
      if (!block) return;
      bindProcuraDoc(block);
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
      /* registry down: no field error and nothing in the live region — the notice above the lookups speaks */
      notFound: mconnectDown() ? "" : NOT_FOUND_MSG,
      foundText: (record) => (isCompany ? `Denumirea companiei a fost preluată din RSUD: ${record.name}.` : `Numele a fost preluat din RSP: ${record.last} ${record.first}.`),
      setError: (inp, msg) => R().setFieldError?.(inp, msg)
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
    const hadDownNotice = Boolean(S.page.querySelector(".e-permits-gh__down-notice"));
    redrawBlock("applicant");
    refreshChrome();
    if (slot.state === "found" && kind === "rep" && d.personType === "PF") {
      /* ghiseu-roles-as-fo-v1: the found representative is the FO identity card now — the focus goes to its
         „Schimbă” (where the code box was), the name is in its accessible name */
      S.page.querySelector('[data-gh-reset="rep"]')?.focus();
    } else if (slot.state === "found") {
      const group = S.page.querySelector(`[data-gh-lookup="${kind}"]`);
      group?.querySelectorAll(".e-permits-fo-input.is-readonly").forEach((wrap) => { void wrap.offsetWidth; wrap.classList.add("is-srre-new"); wrap.addEventListener("animationend", () => wrap.classList.remove("is-srre-new"), { once: true }); });
    } else {
      S.page.querySelector(`[data-gh-target="${kind}:${kind === "company" ? "name" : "last"}"]`)?.focus();
      /* the notice came in with the redraw: refill it once so its role="status" is announced (a live region
         inserted with its text is not read); a notice already on screen is not read again. Focus stays on the name field. */
      const notice = S.page.querySelector(`[data-gh-lookup="${kind}"]`)?.closest(".e-permits-fo-form__section-body")?.querySelector(".e-permits-gh__down-notice");
      if (notice && !hadDownNotice) {
        const text = notice.querySelector(".banner__text");
        const html = text.innerHTML;
        text.innerHTML = "";
        window.setTimeout(() => { text.innerHTML = html; }, 60);
      }
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
        if (!state) return S.lookups[kind]?.code === value && !mconnectDown() ? NOT_FOUND_MSG : `Căutați ${kind === "company" ? "IDNO" : "IDNP"}-ul în registru.`;
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
    if (isOfc(d)) return ofcDetaliiHtml(d);
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
    if (isOfc(d)) { bindDetaliiOfc(panel); return; }
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
    if (isOfc(d)) { collectDetaliiOfc(); return; }
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
    if (isOfc(d)) return checkDetaliiOfc(d);
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
          </div>
          <button class="btn btn-secondary btn-md e-permits-fo-doc-field__add" type="button" data-fo-open-doc-modal data-fo-doc-label="${esc(doc.label)}">${icon("plus-large")}Adaugă fișier</button>
        </div>
        ${doc.id === "procura" && !(S.cur?.docs?.procura || []).length ? U().renderNotice?.("info", "<strong>Procura pe hârtie a fost verificată la inițiere.</strong> Atașați copia ei scanată.") || "" : ""}
        <div class="e-permits-fo-doc-field__files" data-fo-doc-field-files></div>
        ${docErrSlot(`doc-${doc.id}`)}
      </div>`;
  }
  function stepDocumente(d) {
    return `
      ${stepHeader("Acte necesare")}
      <section class="e-permits-fo-documents" aria-label="Acte necesare" data-gh-docs>
        ${docsOf(d).map(docFieldHtml).join("")}
        <hr class="e-permits-fo-documents__separator">
        <div class="e-permits-fo-other-docs">
          <div class="e-permits-fo-other-docs__header">
            <div class="e-permits-fo-other-docs__heading-row">
              <h2 class="e-permits-fo-other-docs__heading">Alte documente</h2>
              <span class="status-tag status-tag--neutral is-subtle status-tag--small e-permits-fo-doc-tag e-permits-fo-optional-tag">Opțional</span>
            </div>
            <p class="e-permits-fo-other-docs__desc">${isOfc(d) ? "Opțional — orice document suplimentar al dosarului." : "Opțional — orice document suplimentar prezentat de solicitant."}</p>
          </div>
          <div class="e-permits-fo-other-docs__body">
            <div data-fo-other-doc-list></div>
            <button class="btn btn-secondary btn-md e-permits-fo-add-doc-button" type="button" data-fo-add-other-doc>${icon("plus-large")}<span>Adaugă document</span></button>
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
    /* other-doc-saved-v1: an „Alte documente” entry keeps its card's name / description / saved look */
    const others = [...root.querySelectorAll("[data-fo-other-doc-list] [data-fo-doc]")].map((el) => {
      let doc = null;
      try { doc = JSON.parse(el.dataset.foDoc); } catch { return null; }
      const card = el.closest("[data-fo-other-doc-card]");
      return card ? { ...doc, denumire: card.querySelector("[data-fo-other-doc-name]")?.value.trim() || "", descriere: card.querySelector("[data-fo-other-doc-desc]")?.value.trim() || "", salvat: card.classList.contains("is-saved") } : doc;
    }).filter(Boolean);
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
        const card = cards[cards.length - 1];
        const { denumire = "", descriere = "", salvat = false, ...file } = doc;
        const name = card?.querySelector("[data-fo-other-doc-name]");
        const desc = card?.querySelector("[data-fo-other-doc-desc]");
        if (name) name.value = denumire;
        if (desc) desc.value = descriere;
        attachTo(card?.querySelector("[data-fo-doc-field-files]"), file);
        /* other-doc-saved-v1: a saved one comes back saved (the shared FO lifecycle) */
        if (card && salvat) R().otherDocSave?.(card, { focus: false });
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
  /* details-wrap-align-v1 (2026-10-23, user on GEAP 2.0 11757:25390 / 11768:27325 / 11777:28273): EVERY Ghișeu details
     box = the canonical BO details card (.e-permits-dosar-profil__card + __row / __row-label / __row-value, components.md
     „Details card”); several values = the BO one-value-per-line list (.e-permits-passport__row-lines). valueHtml = markup */
  const detailRow = (label, valueHtml) => `<div class="e-permits-dosar-profil__row"><span class="e-permits-dosar-profil__row-label" data-cell-tooltip>${esc(label)}</span><span class="e-permits-dosar-profil__row-value">${valueHtml}</span></div>`;
  const summaryRow = (label, values) => {
    const list = (Array.isArray(values) ? values : [values]).filter((v) => v !== "" && v != null);
    return detailRow(label, list.length > 1 ? `<span class="e-permits-passport__row-lines">${list.map((v) => `<span class="e-permits-passport__row-line">${v}</span>`).join("")}</span>` : list[0] ?? "—");
  };
  /* the FO Verificare section heading (GEAPFormRender.summarySectionHtml) over the canonical card, with the desk's edit pen */
  const summarySection = (title, rowsHtml, step = null, extraClass = "") => R().summarySectionHtml?.({
    title, bodyHtml: rowsHtml, extraClass: extraClass.trim(), card: "profile",
    editHtml: step != null && !locked(S.cur) ? `<button class="e-permits-fo-summary-section__edit" type="button" aria-label="Corectează: ${esc(title)}" data-tooltip-label="Corectează" data-gh-goto="${step}">${icon("edit")}</button>` : ""
  }) || "";
  const addressText = (a) => [a?.street && a?.house ? `${a.street} ${a.house}` : a?.street, a?.locality, a?.district, a?.postalCode].filter(Boolean).join(", ");
  const paperDoc = (d) => ({ sursa: "generat", tip: "Cererea pe hârtie", nr: d.nr, fisier: `cerere-${d.nr}.pdf`, size: "184 KB", at: stamp(d.review.paper.at), verb: "Generat", de: "MDocs" });
  const signedDoc = (d) => ({ sursa: "generat", tip: "Cererea semnată MSign", nr: d.nr, fisier: `cerere-${d.nr}.json`, size: "6 KB", at: stamp(d.review.signed.at), verb: "Semnat", de: d.review.signed.by, semnat: true });
  /* doc-name-open-v1 (2026-10-25, GEAP 2.0 11818:21893): the document NAME opens the viewer (`openAttrs` = the
     desk's own preview, else the attached document's shape → `data-fo-doc-open`); the lone „👁 Detalii” is gone */
  const docCard = (doc, openAttrs = "") => `
    <div class="e-permits-fo-confirm-file e-permits-fo-confirm-file--doc e-permits-fo-confirm-file--${doc.sursa === "upload" ? "uploaded" : "system"}">
      ${R().docIconHtml?.(doc, "e-permits-fo-confirm-file__icon") || ""}
      ${R().docContentHtml?.(doc, openAttrs ? { openAttrs } : { open: true }) || esc(doc.tip)}
    </div>`;
  function reviewSummaryHtml(d, moreHtml = "") {
    if (isOfc(d)) return ofcReviewHtml(d);
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
      /* ghiseu-roles-as-fo-v1: the FO review rows „Solicitant” / „Reprezentant” (fo-05); the desk adds the basis as
         its own row, named as the step's group (the FO review has none — its basis is always electronic) */
      repPerson ? summaryRow("Reprezentant", [esc(fullName(repPerson)), esc(`IDNP ${repPerson.idnp}`)]) : "",
      repPerson ? summaryRow("Temeiul reprezentării", basisOf(d)?.kind === "mpower"
        ? [esc(basisLabel(d)), esc(`Cod ${basisOf(d).nr}`), esc(`Valabilă până la ${longDate(basisOf(d).until)}`)]
        : [esc(basisLabel(d) || "—")]) : "",
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
    const attachments = `${attachedCards || window.GEAPEmptyState?.render({ title: "Nu au fost atașate documente", text: "Se atașează la pasul „Acte necesare”.", icon: "document", compact: true }) || ""}${missing.length ? U().renderNotice?.("warning", `<strong>Lipsesc documente obligatorii.</strong> ${missing.map(esc).join("; ")}.`) || "" : ""}`;
    return `
      <div class="e-permits-fo-review e-permits-gh__review">
        ${summarySection("Date generale ale solicitării", general, STEP_INDEX.identificare)}
        ${summarySection("Date despre solicitant", applicant, STEP_INDEX.identificare)}
        ${summarySection("Date despre cerere", request, STEP_INDEX.detalii)}
        ${R().summarySectionHtml?.({ title: "Atașamente", bodyHtml: attachments, docs: true, editHtml: locked(d) ? "" : `<button class="e-permits-fo-summary-section__edit" type="button" aria-label="Corectează: Atașamente" data-tooltip-label="Corectează" data-gh-goto="${STEP_INDEX.documente}">${icon("edit")}</button>` }) || ""}
        ${moreHtml}
      </div>`;
  }
  function stepVerificare(d) {
    /* din oficiu (US-245): the summary only — no paper request, no MSign (US-246 AC-02) — with the permanent hint (AC-05) */
    if (isOfc(d)) {
      return `
        ${stepHeader("Verificare")}
        <div class="e-permits-gh__notices">${U().renderInfoNote?.("Pentru corecții, navigați la pasul corespunzător din bara de progres.") || ""}</div>
        ${ofcReviewHtml(d)}
        ${footerHtml(d)}`;
    }
    const st = settingsOf(d.service);
    const voided = d.review.voided || [];
    const notices = [
      voided.includes("sign") ? U().renderNotice?.("warning", "Semnătura a fost anulată. Resemnați cererea pentru a continua.") : "",
      voided.includes("olograf") ? U().renderNotice?.("warning", "Cererea semnată olograf a fost anulată. Atașați din nou cererea semnată olograf pentru a continua.") : ""
    ].filter(Boolean).join("");
    const paper = d.review.paper
      ? docCard(paperDoc(d), 'data-gh-preview="paper"')
      : S.notice === "mdocs-error"
      ? `<div class="e-permits-gh__retry">${U().renderNotice?.("error", "<strong>Nu s-a putut genera formularul.</strong> MDocs nu a răspuns; datele cererii nu s-au pierdut.", { role: "alert" })}<button class="btn btn-strict btn-sm" type="button" data-gh-paper>${icon("rotate-arrow", 20, "icon small")}<span>Reîncercați</span></button></div>`
      : `<div class="e-permits-fo-doc-field">
          <div class="e-permits-fo-doc-field__row">
            <div class="e-permits-fo-doc-field__info">
              <span class="e-permits-fo-doc-field__label">Formularul de tipar al cererii</span>
              <p class="e-permits-fo-doc-field__desc">Se generează prin MDocs după șablonul serviciului, cu datele de mai sus și textul consimțământului. Tipăriți-l și dați-l solicitantului spre semnare.</p>
            </div>
            <button class="btn btn-secondary btn-md e-permits-fo-doc-field__add" type="button" data-gh-paper>${icon("page-text")}Generează cererea pe hârtie</button>
          </div>
          ${docErrSlot("paper")}
        </div>`;
    const olograf = st.olograf ? `
      <div class="e-permits-fo-field e-permits-fo-field--span-12">
        <div class="e-permits-fo-doc-field e-permits-fo-doc-field--boxed" data-fo-doc-field="gh-olograf" data-gh-olograf data-fo-upload-only data-fo-doc-accept=".jpg,.jpeg,.png,.pdf" data-fo-doc-max="1" data-fo-doc-limits="JPG, PNG, PDF|60 MB">
          <div class="e-permits-fo-doc-field__row">
            <div class="e-permits-fo-doc-field__info">
              <span class="e-permits-fo-doc-field__label">Cererea semnată olograf ${req()}</span>
              <p class="e-permits-fo-doc-field__desc">Copia scanată a cererii pe hârtie, semnată de solicitant. JPG, PNG, PDF · maximum 60 MB.</p>
            </div>
            <button class="btn btn-strict btn-md" type="button" data-fo-open-doc-modal data-fo-doc-label="Cererea semnată olograf">${icon("upload", 20, "icon medium")}<span>Adaugă fișier</span></button>
          </div>
          <div class="e-permits-fo-doc-field__files" data-fo-doc-field-files></div>
        </div>
        ${docErrSlot("olograf", { inField: false })}
      </div>` : "";
    const sign = st.msign ? (d.review.signed
      ? `${U().renderNotice?.("success", "Cererea a fost semnată.") || ""}${docCard(signedDoc(d), 'data-gh-preview="signed"')}`
      : `${S.notice === "msign-error" ? `${U().renderNotice?.("error", "<strong>MSign nu răspunde acum.</strong> Cererea nu a fost semnată, datele ei rămân neschimbate.", { role: "alert" }) || ""}` : S.notice === "msign-cancel" ? U().renderNotice?.("warning", "Semnarea a fost anulată în MSign: cererea rămâne nesemnată.") || "" : ""}
        <div class="e-permits-gh__sign">
          <p class="e-permits-fo-doc-field__desc">Semnați cererea validată cu semnătura dvs., în numele solicitantului. MSign semnează documentul cererii în format JSON.</p>
          <button class="btn btn-badge btn-badge--primary btn-badge--msign" type="button" data-gh-msign>
            <span class="btn-badge__logo" aria-hidden="true"><img src="assets/logos/m-platforms/m-sign.svg" alt=""></span>
            <span class="btn-badge__label">${S.notice === "msign-error" ? "Reîncercați semnarea prin msign" : "Semnează prin msign"}</span>
          </button>
        </div>
        ${errSlot("msign")}`) : "";
    /* gh-verificare-spacing-v1 (user 2026-10-24 on GEAP 11801:30527: „too much space — see the FO full flow”): the paper
       and signing blocks are FO Verificare summary sections too (heading 48, the content right under it; no divider, no
       24 body inset) inside the review, so the whole step keeps the FO summary rhythm: 32 between sections, 8 between the
       items of a section, 32 above the footer */
    const signDesc = [st.olograf ? "atașați cererea semnată de solicitant" : "", st.msign ? "semnați cererea prin MSign" : ""].filter(Boolean).join(" și ").replace(/^./, (c) => c.toUpperCase()) + " — cerute de setările serviciului.";
    const block = (title, bodyHtml) => R().summarySectionHtml?.({ title, bodyHtml, docs: true }) || "";
    return `
      ${stepHeader("Verificare")}
      ${notices ? `<div class="e-permits-gh__notices">${notices}</div>` : ""}
      ${reviewSummaryHtml(d, `
        ${block("Cererea pe hârtie", paper)}
        ${st.olograf || st.msign ? block("Semnarea cererii", `<p class="e-permits-fo-section-header__desc">${signDesc}</p>${olograf}${sign}`) : U().renderInfoNote?.("Setările serviciului nu cer cererea semnată olograf și nici semnarea prin MSign la ghișeu.") || ""}`)}
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
    if (isOfc(d)) return [];
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
    /* din oficiu: the holder receives the result; no MDelivery (its fee would need a payment note, Feature 95769) */
    const ofc = isOfc(d);
    const who = ofc ? "Titularul" : "Solicitantul";
    const methods = [
      st.paperRelease ? { id: "pickup", title: "Ridicare de la ghișeul autorității", description: `${who} ridică actul pe hârtie de la ghișeul autorității emitente.`, icon: "icon-store", selected: d.delivery.mode === "ghiseu", badges: [{ label: "Gratuit", tone: "outline" }] } : null,
      st.mdelivery && !ofc ? {
        id: "courier", title: "Livrare prin MDelivery", description: `Actul pe hârtie se livrează la adresa indicată. Taxa MDelivery (${mdl(S.data.mdelivery.amount)}) se adaugă pe nota de plată.`, icon: "icon-car", selected: d.delivery.mode === "mdelivery", badges: [{ label: "Cu plată", tone: "warning" }],
        address: { title: "Adresa livrării", required: true, icon: "icon-map-pin", label: "Adresa de livrare", value: d.delivery.address || addressText(d.details.address) || "Adăugați adresa livrării", editLabel: "Editează adresa livrării", cancelLabel: "Anulează", saveLabel: "Salvează", form: { id: "gh-delivery-address", type: "cascade-address", span: 12, cadastral: { visible: false } } }
      } : null
    ].filter(Boolean);
    return {
      title: "Livrare",
      sectionTitle: `Cum primește ${who.toLocaleLowerCase("ro")} rezultatul?`,
      options: [{ id: "evo-cabinet", title: "Livrare electronică (EVO Cabinet)", description: `Actul semnat electronic apare în EVO Cabinet al ${ofc ? "titularului" : "solicitantului"}.`, logo: "assets/logos/evo-logo.svg", selected: true, badges: [{ label: "Gratuit", tone: "outline" }, { label: "100% digital", tone: "positive" }] }],
      paperCopy: methods.length ? { label: `${who} are nevoie și de o copie pe hârtie`, description: "Opțional. Varianta electronică are aceeași valoare juridică.", selected: d.delivery.mode !== "evo", methods } : null
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
      actions: { download: { label: "Descarcă nota de plată", icon: "icon-export" } }
    };
    const state = p.status === "Achitată"
      ? U().renderNotice?.("success", `<strong>Nota de plată a fost achitată.</strong> Prin MPay la ${esc(stamp(p.paid))}. Câmpurile cererii nu se mai pot modifica, iar schița nu se mai poate elimina.`)
      : p.status === "Expirată"
      ? U().renderNotice?.("error", `<strong>Nota de plată a expirat.</strong> Termenul a fost ${esc(longDate(p.due))}. Cererea are statutul „Respins formal”, substatutul „Plată expirată”, și nu se poate depune până la regenerarea notei.`, { role: "alert" })
      : U().renderNotice?.("info", `<strong>Solicitantul achită nota prin MPay.</strong> Linkul de achitare a fost trimis prin MNotify${d.contact.email ? ` la ${esc(d.contact.email)}` : ""} și în EVO Cabinet. Statutul se actualizează automat după confirmarea MPay.`);
    const extra = p.status === "Expirată"
      ? `<button class="btn btn-primary" type="button" data-gh-regenerate>${icon("rotate-arrow")}<span>Regenerează nota de plată</span></button>`
      : p.status === "Emisă" ? `<button class="btn btn-neutral" type="button" data-gh-mpay>${icon("rotate-arrow")}<span>Verifică achitarea în MPay</span></button>` : "";
    const history = (p.history || []).filter((h) => h.nr).map((h) => detailRow(`Nota ${h.nr}`, `${esc(mdl(h.total))}${tagHtml(h.status, NOTE_TONE[h.status] || "neutral")}`)).join("");
    const blocked = p.status !== "Achitată" || incomplete;
    return `
      ${stepHeader("Notă de plată")}
      <div class="e-permits-fo-payment__body">
        ${state || ""}
        ${incomplete ? U().renderNotice?.("error", "<strong>Configurarea taxei este incompletă.</strong> Pentru asistență, contactați autoritatea emitentă.", { role: "alert" }) || "" : ""}
        ${R().paymentStepBodyHtml?.(step, { downloadAttrs: 'data-gh-download="note"', extraActionsHtml: extra, summaryLabel: "Detaliile notei de plată", summaryVariant: "profile" }) || ""}
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
    /* din oficiu (US-246 AC-02/03): straight from Livrare to the confirmation — no MSign, no payment note */
    if (isOfc(d)) return [{ label: "Datele dosarului sunt validate", ok: !all.length }, { label: "Fără semnarea cererii prin MSign", ok: true }, { label: "Fără notă de plată", ok: true }];
    return [
      { label: "Datele cererii sunt validate", ok: !all.length },
      st.olograf ? { label: "Cererea semnată olograf este atașată", ok: Boolean(d.review.olograf) } : null,
      st.msign ? { label: "Cererea este semnată prin MSign", ok: Boolean(d.review.signed) } : null,
      hasFee(d) || d.payment ? { label: "Nota de plată este achitată", ok: isPaid(d) } : { label: "Fără notă de plată", ok: true }
    ].filter(Boolean);
  }
  /* gh-verificare-spacing-v1: the two summary sections sit in the FO review wrapper (as Verificare) — 32 between them and
     above the footer, headings inset 12; they touched each other and the footer before */
  function stepConfirmare(d) {
    if (isSubmitted(d)) return confirmedHtml(d);
    const list = readiness(d);
    const ok = list.every((x) => x.ok);
    return `
      ${stepHeader("Confirmarea depunerii")}
      ${S.notice === "submit-error" ? `<div class="e-permits-gh__notices">${U().renderNotice?.("error", "A apărut o eroare. Depunerea nu a putut fi finalizată. Încercați din nou.", { role: "alert" }) || ""}</div>` : ""}
      <div class="e-permits-fo-review e-permits-gh__review">
      ${summarySection("Condițiile depunerii", list.map((x) => detailRow(x.label, tagHtml(x.ok ? "Îndeplinită" : "Neîndeplinită", x.ok ? "success" : "danger"))).join(""))}
      ${summarySection(isOfc(d) ? "Dosarul" : "Cererea", [
        detailRow("Numărul cererii", R().copyValueHtml?.(d.nr, { ariaLabel: `Copiază numărul cererii ${d.nr}` }) || esc(d.nr)),
        detailRow(isOfc(d) ? "Titular" : "Solicitant", esc(holderName(d))),
        detailRow("Tipul solicitării", esc(isOfc(d) ? `${d.requestType} · ${ofcActOf(d)?.nr || ""}` : d.requestType)),
        detailRow("Livrare", esc({ evo: "Electronic, în EVO Cabinet", ghiseu: "Pe hârtie, la instituția emitentă", mdelivery: `Prin MDelivery · ${d.delivery.address || ""}` }[d.delivery.mode])),
        detailRow("Termen de examinare", esc(isOfc(d) ? ofcTermLabel(d) : termOf(d)?.label || "—"))
      ].join(""))}
      </div>
      ${footerHtml(d, { next: S.notice === "submit-error" ? "Reîncercați" : "Confirmă depunerea", nextAttrs: "data-gh-submit", nextDisabled: !ok })}`;
  }
  function confirmedHtml(d) {
    if (isOfc(d)) return ofcConfirmedHtml(d);
    const st = settingsOf(d.service);
    const cert = !st.certificat ? "" : d.certError
      ? R().finishDocHtml?.({ title: "Certificatul constatator", error: "Nu a putut fi generat.", actionAttrs: "data-gh-cert-retry" }) || ""
      : R().finishDocHtml?.({ title: "Certificatul constatator", textHtml: "Dovada depunerii, pentru solicitant. Disponibil și în EVO Cabinet.", actionAttrs: 'data-gh-preview="cert"' }) || "";
    return `
      <div class="e-permits-gh__finish">
        ${R().finishHeroHtml?.({ title: "Dosarul a fost depus cu succes.", leadHtml: '<p class="e-permits-fo-finish__lead">Solicitantul îl urmărește în EVO Cabinet → Solicitările mele și a primit notificarea de depunere prin MNotify.</p>' }) || ""}
        <div class="e-permits-fo-finish__content">
          ${cert}
          <section class="e-permits-dosar-profil__card" aria-label="Dosarul depus">
            ${detailRow("Numărul dosarului", R().copyValueHtml?.(d.nr, { ariaLabel: `Copiază numărul dosarului ${d.nr}` }) || esc(d.nr))}
            ${detailRow("Data depunerii", esc(stamp(d.submittedAt)))}
            ${detailRow("Termen de examinare", `${esc(longDate(d.examDeadline))}${termOf(d)?.label ? ` (${esc(termOf(d).label)})` : ""}`)}
            ${detailRow("Statut", `${tagHtml("În procesare", "info")}${tagHtml("Spre distribuire", "info")}`)}
            ${detailRow("Canal de depunere", "Ghișeu")}
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
      /* US-246 AC-10 (din oficiu): the failed submission with the act, the channel and the result */
      audit(isOfc(d) ? "Depunere dosar din oficiu" : "Depunere cerere", d, isOfc(d) ? `Act ${ofcActOf(d)?.nr || ""} · canal ${OFC} · eșuată · dosarul rămâne Schiță` : "Eșuată · cererea rămâne Schiță");
      render();
      return;
    }
    S.notice = null;
    if (isOfc(d)) { ofcSubmit(d); return; }
    d.status = "În procesare"; d.substatus = "Spre distribuire";
    d.submittedAt = nowIso();
    d.examDeadline = addDays(d.submittedAt, Number((termOf(d)?.label || "").match(/\d+/)?.[0] || 15) + 6);
    d.step = STEP_INDEX.confirmare; d.maxStep = d.step;
    d.certError = settingsOf(d.service).certificat && params.get("certerr") === "1";
    audit("Depunere cerere", d, `Dosar ${d.nr} · canal Ghișeu · trimis la distribuire`);
    audit("Publicare eveniment MConnect Event Bus", d, "cerere.depusa", { system: true });
    audit("Notificare MNotify: depunere", d, `Identificator ${d.nr}, termen ${longDate(d.examDeadline)}`, { system: true });
    persist({ silent: true });
    /* no toast here: the confirmation is shown in place (US-238 AC-04); the success toast comes when the window
       closes over «Dosare noi» (closeSheet, ghiseu-picker-toast-v1) */
    S.submittedNr = d.nr;
    render();
  }

  /* ================================================================ Din oficiu (Feature 95769) — the step bodies
     The window, stepper, footer, autosave, documents, Livrare and the confirmation readiness are the desk's; these
     are the parts that read differently: the act search (US-242), „Date titular” (US-243), „Detalii serviciu” with
     the decision (US-244), the Verificare summary (US-245) and the submitted dossier (US-246). */
  const dmyToIso = (value) => {
    const m = String(value || "").trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    if (!m) return "";
    const dt = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    return dt.getDate() === Number(m[1]) && dt.getMonth() === Number(m[2]) - 1 ? `${m[3]}-${pad(m[2])}-${pad(m[1])}` : "";
  };
  const DATE_MSG = "Introduceți data în formatul ZZ/LL/AAAA.";
  const OFC_TEMEI = ["Decizie administrativă a autorității", "Hotărâre judecătorească"];
  /* the post-process's own data (the published form of each ex-officio type, US-244 AC-02) */
  const OFC_FIELDS = {
    Prelungire: [{ key: "until", type: "date", label: "Valabil până la (termenul nou)", span: 6 }],
    "Suspendare valabilitate": [{ key: "until", type: "date", label: "Suspendat până la", span: 6 }, { key: "reason", type: "textarea", label: "Motivul suspendării", span: 12 }],
    "Reluare valabilitate": [{ key: "from", type: "date", label: "Valabilitatea se reia de la", span: 6 }],
    "Retragere act permisiv": [{ key: "from", type: "date", label: "Data retragerii", span: 6 }, { key: "reason", type: "textarea", label: "Motivul retragerii", span: 12 }]
  };
  const OFC_DECISION_TITLE = {
    Prelungire: "Decizie privind prelungirea actului permisiv",
    "Suspendare valabilitate": "Decizie privind suspendarea valabilității actului permisiv",
    "Reluare valabilitate": "Decizie privind reluarea valabilității actului permisiv",
    "Retragere act permisiv": "Decizie privind retragerea actului permisiv"
  };
  const actStatusLabel = (act) => (ACT_TONE[act?.status] || [act?.status || ""])[0];

  /* ---- US-242: the act search = the desk's „Ce se solicită?” vocabulary (FO intent header, the shared act rows with
     the square ⋮, the live search) without an applicant: the service filter + one search over the act number, the
     holder's IDNP / IDNO, the holder and the object (AC-03); every act of the authority is listed (AC-04/05) */
  const ofcActText = (act) => { const h = holderOf(act.holder); return fold([act.nr, act.name, act.holder, h.type === "PJ" ? h.company?.denumire : fullName(h.person), serviceOf(act.service)?.title].join(" ")); };
  function ofcActRowHtml(act, attrs = "") {
    const busy = ofcBusy(act, S.cur?.id || "");
    const date = act.status === "expirat" ? `expirat la ${longDate(act.valabilPana)}` : act.status === "retras" ? "" : `valabil până la ${longDate(act.valabilPana)}`;
    return R().actRowHtml?.({ id: act.id, name: act.name, status: act.status, statusLabel: actStatusLabel(act) }, {
      menuId: `gh-ofc-menu-${act.id}`,
      /* AC-07…09: only the configured types for the act's status; none → no ⋮; one active post-process per act */
      items: busy ? [] : ofcTypes(act).map((t) => ({ id: t, label: t })),
      attrs,
      actionLabel: "Postprocese din oficiu",
      place: holderLine(act.holder), placeIcon: false, actionIcon: "icon-more-vertical",
      metaSlots: { number: act.nr, numberLabel: `Copiază numărul actului ${act.nr}`, what: serviceOf(act.service)?.title || "", authority: act.emis ? `emis la ${longDate(act.emis)}` : "", date },
      pendingTitle: busy ? `${busy.type} în curs` : "",
      pendingText: busy ? `· dosar ${busy.nr}. Un alt postproces se inițiază după finalizarea acestuia.` : ""
    }) || "";
  }
  function ofcIntentHtml(d) {
    const all = ofcActs();
    const titles = [...new Map(all.map((a) => [a.service, serviceOf(a.service)?.title || a.service])).entries()];
    const svcTitle = titles.find(([code]) => code === S.ofcService)?.[1] || "";
    const acts = all.filter((a) => !S.ofcService || a.service === S.ofcService);
    const q = fold(S.actsQuery || "");
    const matches = (act) => !q || ofcActText(act).includes(q);
    S.actsMatches = acts.filter(matches).length;
    const select = R().fieldHtml({ id: "gh-ofc-service", type: "select", label: "Denumirea serviciului", span: 6, value: svcTitle || "Toate serviciile", options: ["Toate serviciile", ...titles.map(([, title]) => title)] });
    const search = `
      <div class="e-permits-fo-field e-permits-fo-field--span-6">
        <label for="gh-ofc-q">Numărul actului, IDNP sau IDNO</label>
        <div class="search-input ${searchSize()} rectangular e-permits-workplace__search e-permits-list-search e-permits-list-search--fill${S.actsQuery ? " has-value is-ready" : ""}">
          <span class="icon-search" aria-hidden="true">${icon("search")}</span>
          <input class="input" id="gh-ofc-q" type="search" placeholder="De ex. ASF-2025-03318 sau 1008600031457" autocomplete="off" value="${esc(S.actsQuery || "")}" data-gh-acts-search>
          <div class="btn-group"><span class="spinner spinner--extra-small spinner--brand" aria-hidden="true"></span><button type="button" class="btn-icon clear" aria-label="Șterge căutarea"><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-cross-small"></use></svg></button></div>
        </div>
      </div>`;
    const rows = acts.map((act) => ofcActRowHtml(act, `data-gh-act-text="${esc(ofcActText(act))}"${matches(act) ? "" : " hidden"}`)).join("");
    const E = window.GEAPEmptyState;
    return `
      <div class="e-permits-fo-intent__inner e-permits-gh-intent" data-gh-intent>
        <header class="e-permits-fo-intent__header">
          <h1 id="gh-intent-title" tabindex="-1">Inițiere dosar din oficiu</h1>
          <p class="e-permits-fo-intent__subject"><span class="e-permits-fo-intent__subject-label">Găsiți actul permisiv și alegeți din meniul lui postprocesul hotărât de autoritate.</span></p>
        </header>
        ${S.actCleared ? U().renderNotice?.("info", "Actul sau postprocesul ales anterior a fost anulat. Alegeți din nou.") || "" : ""}
        <div class="e-permits-gh-acts-search e-permits-gh-ofc">
          <div class="e-permits-fo-form__section-body e-permits-gh-ofc__filters">${select}${search}</div>
          <section class="e-permits-fo-intent__acts" aria-labelledby="gh-acts-title">
            <p class="e-permits-fo-intent__acts-title" id="gh-acts-title">Acte permisive emise de autoritate</p>
            ${rows ? `<ul class="e-permits-fo-intent__list">${rows}</ul>` : ""}
            <div data-gh-acts-none${!rows || (q && !S.actsMatches) ? "" : " hidden"}>${!rows
              ? E?.render({ title: "Nu există acte permisive emise", text: "Actele emise de autoritate pentru serviciile cu pașaport publicat apar aici.", icon: "permission", compact: true }) || ""
              /* AC-06 */
              : E?.noResults?.("Nu există acte permisive care să corespundă căutării.", { text: "Caută după numărul actului, IDNP-ul sau IDNO-ul titularului.", bare: true, compact: true }) || ""}</div>
          </section>
          <p class="u-visually-hidden" role="status" aria-live="polite" data-gh-acts-live></p>
        </div>
      </div>`;
  }

  /* ---- US-243 „Date titular”: the holder of the act (the FO identity card, read-only — AC-02) + Telefon / Email
     prefilled from the act and editable (AC-03), validated as at the desk (AC-04…07) */
  function ofcTitularHtml(d) {
    const pj = d.personType === "PJ";
    const card = roleCard(pj
      ? { name: d.company.denumire, idLabel: "IDNO", idValue: d.company.idno, pj: true }
      : { name: fullName(d.applicant), idLabel: "IDNP", idValue: d.applicant.idnp });
    const phone = R().fieldHtml({ id: "gh-phone", type: "phone", label: "Telefon", required: true, span: 6, value: d.contact.phone ? formatPhone(d.contact.phone) : "", placeholder: "60 999 999" });
    const email = R().fieldHtml({ id: "gh-email", type: "email", label: "Email", span: 6, value: d.contact.email, placeholder: "office@companie.md" });
    return `
      ${stepHeader("Date titular")}
      <section class="e-permits-fo-form__roles is-single" aria-label="Titularul actului permisiv">
        <div class="e-permits-fo-form__roles-grid">
          <div class="e-permits-fo-form__role-group">${R().roleGroupTitleHtml?.("Titular", { hint: "Titularul actului permisiv ales, preluat din act. Se schimbă doar alegând alt act: ⋮ › „Schimbă actul sau postprocesul”." }) || ""}${card}</div>
        </div>
      </section>
      ${section("Date de contact", `<div class="e-permits-fo-form__section-body">${phone}${email}</div>`, { id: "gh-contact-title", desc: "Preluate din actul permisiv. Actualizați-le dacă s-au schimbat." })}
      ${footerHtml(d)}`;
  }
  function checkContactOfc(d) {
    const errs = [];
    const raw = String(d.contact.phone || "").replace(/\D/g, "");
    const digits = raw.length === 11 && raw.startsWith("373") ? raw.slice(3) : raw.length === 9 && raw.startsWith("0") ? raw.slice(1) : raw;
    if (!digits) errs.push({ input: "#fo-gh-phone", msg: REQUIRED, step: STEP_INDEX.identificare });
    else if (!/^\d{8}$/.test(digits)) errs.push({ input: "#fo-gh-phone", msg: OFC_PHONE_MSG, step: STEP_INDEX.identificare });
    const email = String(d.contact.email || "").trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) errs.push({ input: "#fo-gh-email", msg: "Adresa email nu este validă.", step: STEP_INDEX.identificare });
    else if (/\.ru$/i.test(email)) errs.push({ input: "#fo-gh-email", msg: "Adresele de email cu domeniul .ru nu sunt acceptate.", step: STEP_INDEX.identificare });
    return errs;
  }

  /* ---- US-244 „Detalii serviciu”: the act's data prefilled read-only (AC-02), the post-process's own fields, the
     authority's decision as an electronic form (MDocs print version, AC-03) or an attached PDF (AC-04), the
     initiator's subdivision read-only (AC-08) */
  function ofcDecisionHtml(d) {
    const dec = (d.ofc || blankOfc()).decision;
    const mode = R().fieldHtml({ id: "gh-ofc-mode", type: "segment", label: "Forma deciziei", span: 12, value: dec.mode, options: [{ value: "form", label: "Formular electronic" }, { value: "pdf", label: "Fișier PDF" }] }).replace("data-fo-segment", "data-fo-segment data-gh-ofc-mode");
    const nr = R().fieldHtml({ id: "gh-ofc-dec-nr", type: "text", label: "Numărul deciziei", required: true, span: 6, value: dec.nr, placeholder: "De ex. DA-2026-0412", maxLength: 40 });
    const date = R().fieldHtml({ id: "gh-ofc-dec-date", type: "date", label: "Data deciziei", required: true, span: 6, value: dec.date });
    const temei = R().fieldHtml({ id: "gh-ofc-temei", type: "select", label: "Temeiul", required: true, span: 12, placeholder: "Selectează temeiul", value: dec.temei, options: OFC_TEMEI });
    const body = dec.mode === "pdf" ? `
      <div class="e-permits-fo-field e-permits-fo-field--span-12">
        <div class="e-permits-fo-doc-field e-permits-fo-doc-field--boxed" data-fo-doc-field="gh-ofc-pdf" data-gh-ofc-pdf data-fo-upload-only data-fo-doc-accept=".pdf" data-fo-doc-max="1" data-fo-doc-limits="PDF|60 MB">
          <div class="e-permits-fo-doc-field__row">
            <div class="e-permits-fo-doc-field__info">
              <span class="e-permits-fo-doc-field__label">Decizia autorității (PDF) ${req()}</span>
              <p class="e-permits-fo-doc-field__desc">Decizia pregătită în afara SIA GEAP. Doar PDF · maximum 60 MB.</p>
            </div>
            <button class="btn btn-strict btn-md" type="button" data-fo-open-doc-modal data-fo-doc-label="Decizia autorității (PDF)">${icon("upload", 20, "icon medium")}<span>Adaugă fișier</span></button>
          </div>
          <div class="e-permits-fo-doc-field__files" data-fo-doc-field-files></div>
        </div>
        ${docErrSlot("ofc-pdf", { inField: false })}
      </div>` : `
      ${R().fieldHtml({ id: "gh-ofc-content", type: "textarea", label: "Conținutul deciziei", required: true, span: 12, rows: 4, maxLength: 2000, charCounter: true, value: dec.content, placeholder: "Dispozitivul deciziei: ce hotărăște autoritatea și pe ce temei" })}
      <div class="e-permits-fo-field e-permits-fo-field--span-12">${U().renderInfoNote?.("La confirmarea depunerii, MDocs generează versiunea de tipar a deciziei din acest formular.") || ""}</div>`;
    return `<div data-gh-block="ofc-decision">${section("Decizia autorității", `<div class="e-permits-fo-form__section-body">${mode}${nr}${date}${temei}${body}</div>`, { id: "gh-ofc-dec-title", desc: "Decizia administrativă a autorității sau hotărârea instanței care stă la baza postprocesului." })}</div>`;
  }
  function ofcDetaliiHtml(d) {
    const act = ofcActOf(d);
    const o = d.ofc || (d.ofc = blankOfc());
    const actFields = [
      readonlyField({ id: "gh-ofc-act-nr", label: "Numărul actului permisiv", value: act?.nr || "", span: 6 }),
      readonlyField({ id: "gh-ofc-act-status", label: "Statutul actului", value: actStatusLabel(act), span: 6 }),
      readonlyField({ id: "gh-ofc-act-name", label: "Obiectul autorizat", value: act?.name || "", span: 12 }),
      readonlyField({ id: "gh-ofc-act-emis", label: "Data emiterii", value: longDate(act?.emis), span: 6 }),
      readonlyField({ id: "gh-ofc-act-until", label: act?.status === "expirat" ? "Expirat la" : "Valabil până la", value: longDate(act?.valabilPana), span: 6 })
    ].join("");
    const hint = (f) => (f.key === "until" && d.requestType === "Prelungire" ? `După ${longDate(act?.valabilPana)}, data actuală de expirare.` : f.key === "until" ? "Data până la care actul permisiv nu este valabil." : "");
    const typeFields = (OFC_FIELDS[d.requestType] || []).map((f) => R().fieldHtml({
      id: `gh-ofc-${f.key}`, type: f.type, label: f.label, required: true, span: f.span, value: o.fields[f.key] || "", hint: hint(f),
      ...(f.type === "textarea" ? { rows: 3, maxLength: 500, charCounter: true, placeholder: "Descrieți pe scurt motivul" } : {})
    })).join("");
    return `
      ${stepHeader("Detalii serviciu")}${U().renderInfoNote?.(`Postproces din oficiu „${esc(d.requestType)}” pe ${esc(act?.nr || "")}: datele actului sunt precompletate.`) || ""}
      ${section("Datele actului permisiv", `<div class="e-permits-fo-form__section-body">${actFields}</div>`, { id: "gh-ofc-act-title" })}
      ${section("Detaliile postprocesului", `<div class="e-permits-fo-form__section-body">${typeFields}</div>`, { id: "gh-ofc-pp-title" })}
      ${ofcDecisionHtml(d)}
      ${section("Examinare", `<div class="e-permits-fo-form__section-body">${readonlyField({ id: "gh-subdiv", label: "Procesat de subdiviziunea", value: d.details.subdivision || ofcSubdivision(), span: 12, hint: "Subdiviziunea dvs. la inițierea dosarului." })}</div>`, { id: "gh-exam-title" })}
      ${footerHtml(d)}`;
  }
  function bindOfcDecision(block) {
    if (!block) return;
    block.querySelector("[data-gh-ofc-mode]")?.addEventListener("change", (event) => {
      const value = event.currentTarget.querySelector(".segment-item.is-selected")?.dataset.value || "form";
      const dec = S.cur.ofc.decision;
      if (value === dec.mode) return;
      collectDetaliiOfc();
      dec.mode = value;
      S.dirty = true;
      redrawBlock("ofc-decision");
      S.page.querySelector("[data-gh-ofc-mode] .segment-item.is-selected")?.focus();
    });
    /* the PDF (AC-04): the FO boxed upload, validated on upload, kept in the draft */
    const field = block.querySelector("[data-gh-ofc-pdf]");
    if (!field) return;
    const box = field.querySelector("[data-fo-doc-field-files]");
    if (S.cur.ofc.decision.file) attachTo(box, S.cur.ofc.decision.file);
    const obs = new MutationObserver(() => {
      const el = box.querySelector("[data-fo-doc]");
      let doc = null;
      try { doc = el ? JSON.parse(el.dataset.foDoc) : null; } catch { doc = null; }
      const dec = S.cur.ofc.decision;
      if (!doc) { if (dec.file) { dec.file = null; S.dirty = true; } return; }
      if (JSON.stringify({ ...doc, tip: "Decizia autorității" }) === JSON.stringify(dec.file)) return;
      const name = doc.fisier || doc.tip || "";
      const error = !/\.pdf$/i.test(name) ? "Nu puteți atașa fișierul. Se permite doar formatul PDF." : sizeMb(doc.size) > 60 ? "Nu puteți atașa fișiere mai mari decât 60Mb." : "";
      if (error) { obs.disconnect(); el.remove(); obs.observe(box, { childList: true, subtree: true }); setErr("ofc-pdf", error, field); return; }
      dec.file = { ...doc, tip: "Decizia autorității" };
      S.dirty = true;
      clearErr("ofc-pdf");
      audit("Atașare decizie PDF", S.cur, name);
    });
    obs.observe(box, { childList: true, subtree: true });
  }
  BLOCK_RENDER["ofc-decision"] = ofcDecisionHtml;
  BLOCK_BIND["ofc-decision"] = bindOfcDecision;
  function bindDetaliiOfc(panel) {
    bindOfcDecision(panel.querySelector('[data-gh-block="ofc-decision"]'));
  }
  function collectDetaliiOfc() {
    const d = S.cur;
    const o = d.ofc || (d.ofc = blankOfc());
    const before = JSON.stringify(o);
    const el = (sel) => S.page?.querySelector(sel);
    (OFC_FIELDS[d.requestType] || []).forEach((f) => {
      const input = el(`#fo-gh-ofc-${f.key}`);
      if (input) o.fields[f.key] = f.type === "date" ? dmyToIso(input.value) : input.value.trim();
    });
    const nr = el("#fo-gh-ofc-dec-nr");
    if (nr) o.decision.nr = nr.value.trim();
    const date = el("#fo-gh-ofc-dec-date");
    if (date) o.decision.date = dmyToIso(date.value);
    const temei = el("#fo-gh-ofc-temei")?.closest("[data-fo-select]")?.querySelector(".e-permits-fo-select__option.is-selected")?.dataset.value;
    if (temei !== undefined) o.decision.temei = temei;
    const content = el("#fo-gh-ofc-content");
    if (content) o.decision.content = content.value.trim();
    /* AC-09: every change of the dossier's details is logged — one entry per editing run (its time moves) */
    if (JSON.stringify(o) !== before && d.id) {
      const last = S.audit[0];
      if (last?.action === "Modificare detalii dosar" && last.cerere === d.nr) last.at = nowIso();
      else audit("Modificare detalii dosar", d, `${d.requestType}: detaliile postprocesului și decizia autorității`);
    }
  }
  function checkDetaliiOfc(d) {
    const o = d.ofc || blankOfc();
    const act = ofcActOf(d);
    const step = STEP_INDEX.detalii;
    const today = isoDay(0);
    const errs = [];
    /* a typed date that is not a date (only while the step is on screen) */
    const badDate = (id) => { const input = S.page?.querySelector(`[data-gh-panel="detalii"] #fo-${id}`); return Boolean(input && input.value.trim() && !dmyToIso(input.value)); };
    (OFC_FIELDS[d.requestType] || []).forEach((f) => {
      const input = `#fo-gh-ofc-${f.key}`;
      const v = o.fields[f.key];
      if (f.type === "date" && badDate(`gh-ofc-${f.key}`)) errs.push({ input, msg: DATE_MSG, step });
      else if (!v) errs.push({ input, msg: REQUIRED, step });
      else if (f.key === "until" && d.requestType === "Prelungire" && act?.valabilPana && v <= act.valabilPana) errs.push({ input, msg: `Termenul nou trebuie să fie după ${longDate(act.valabilPana)}.`, step });
      else if (f.key === "until" && v <= today) errs.push({ input, msg: "Data trebuie să fie după data de azi.", step });
    });
    if (!o.decision.nr) errs.push({ input: "#fo-gh-ofc-dec-nr", msg: REQUIRED, step });
    if (badDate("gh-ofc-dec-date")) errs.push({ input: "#fo-gh-ofc-dec-date", msg: DATE_MSG, step });
    else if (!o.decision.date) errs.push({ input: "#fo-gh-ofc-dec-date", msg: REQUIRED, step });
    else if (o.decision.date > today) errs.push({ input: "#fo-gh-ofc-dec-date", msg: "Data deciziei nu poate fi în viitor.", step });
    if (!o.decision.temei) errs.push({ input: "#fo-gh-ofc-temei", select: true, msg: REQUIRED, step });
    if (o.decision.mode === "pdf" && !o.decision.file) errs.push({ key: "ofc-pdf", focus: "[data-gh-ofc-pdf] [data-fo-open-doc-modal]", msg: "Atașați decizia în format PDF.", field: "[data-gh-ofc-pdf]", step });
    if (o.decision.mode !== "pdf" && !o.decision.content) errs.push({ input: "#fo-gh-ofc-content", msg: REQUIRED, step });
    return errs;
  }

  /* ---- US-245 Verificare: the four sections of AC-02 (no edit pen on „Date generale”: the act and the type change
     through „Schimbă actul sau postprocesul”), the decision first among the attachments */
  function ofcReviewHtml(d) {
    const svc = serviceOf(d.service);
    const act = ofcActOf(d);
    const o = d.ofc || blankOfc();
    const authority = A().getAuthorityById?.(svc?.authorityId)?.name || "Agenția Națională pentru Sănătate Publică";
    const general = [
      summaryRow("Numărul cererii", [esc(d.nr || "—")]),
      summaryRow("Serviciul", [esc(svc?.title || "")]),
      summaryRow("Actul permisiv", [esc(act?.nr || "—"), esc(act?.name || "")]),
      summaryRow("Autoritatea", [esc(authority)]),
      summaryRow("Subdiviziunea de procesare", [esc(d.details.subdivision || "—")]),
      summaryRow("Tipul solicitării", [esc(d.requestType)]),
      summaryRow("Canal de depunere", [OFC])
    ].join("");
    const titular = [
      summaryRow("Titular", [esc(holderName(d)), esc(d.personType === "PJ" ? `IDNO ${d.company.idno}` : `IDNP ${d.applicant.idnp}`)]),
      summaryRow("Date de contact", [esc(d.contact.phone ? `+373 ${formatPhone(d.contact.phone)}` : "—"), esc(d.contact.email || "fără email")])
    ].join("");
    const request = [
      summaryRow("Decizia autorității", [esc(`Nr. ${o.decision.nr || "—"} din ${o.decision.date ? longDate(o.decision.date) : "—"}`), esc(o.decision.temei || "—"), esc(o.decision.mode === "pdf" ? "Atașată ca fișier PDF" : "Formular electronic · versiunea de tipar se generează prin MDocs")]),
      ...(OFC_FIELDS[d.requestType] || []).map((f) => summaryRow(f.label, [esc(f.type === "date" ? longDate(o.fields[f.key]) : o.fields[f.key]) || "—"]))
    ].join("");
    const decision = o.decision.mode === "pdf"
      ? (o.decision.file ? docCard({ ...o.decision.file, tip: "Decizia autorității" }) : "")
      : docCard({ sursa: "generat", tip: "Decizia autorității", fisier: `decizie-${o.decision.nr || d.nr}.pdf`, verb: "Versiunea de tipar", de: "MDocs" }, 'data-gh-preview="decizie"');
    const attached = [
      decision,
      ...docsOf(d).flatMap((doc) => (d.docs[doc.id] || []).map((f) => docCard({ ...f, tip: doc.label, fisier: f.fisier || f.tip }))),
      ...(d.docs.alte || []).map((f) => docCard({ ...f, tip: "Document suplimentar", fisier: f.fisier || f.tip }))
    ].join("");
    const missing = docsOf(d).filter((doc) => doc.required && !(d.docs[doc.id] || []).length).map((doc) => doc.label);
    if (o.decision.mode === "pdf" && !o.decision.file) missing.unshift("Decizia autorității (PDF)");
    /* US-245 AC-04 (oficiu-v2): the PREDEFINED documents (data/ghiseu.json › oficiu.docs) with «Atașat» Da / Nu; a
       required one not attached = danger tag + „obligatoriu”; supplementary documents only as cards, when attached */
    const predefined = docsOf(d).map((doc) => {
      const has = (d.docs[doc.id] || []).length > 0;
      const tag = tagHtml(has ? "Da" : "Nu", has ? "success" : doc.required ? "danger" : "neutral");
      return summaryRow(doc.label, [`Atașat: ${tag}${doc.required ? " · obligatoriu" : ""}`]);
    }).join("");
    const attachments = `<div class="e-permits-dosar-profil__card" role="group" aria-label="Documente predefinite">${predefined}</div>${attached || window.GEAPEmptyState?.render({ title: "Nu au fost atașate documente", text: "Se atașează la pasul „Acte necesare”.", icon: "document", compact: true }) || ""}${missing.length ? U().renderNotice?.("warning", `<strong>Lipsesc documente obligatorii.</strong> ${missing.map(esc).join("; ")}.`) || "" : ""}`;
    return `
      <div class="e-permits-fo-review e-permits-gh__review">
        ${summarySection("Date generale ale solicitării", general)}
        ${summarySection("Date despre titular", titular, STEP_INDEX.identificare)}
        ${summarySection("Date despre cerere", request, STEP_INDEX.detalii)}
        ${R().summarySectionHtml?.({ title: "Atașamente", bodyHtml: attachments, docs: true, editHtml: locked(d) ? "" : `<button class="e-permits-fo-summary-section__edit" type="button" aria-label="Corectează: Atașamente" data-tooltip-label="Corectează" data-gh-goto="${STEP_INDEX.documente}">${icon("edit")}</button>` }) || ""}
      </div>`;
  }

  /* ---- US-246: submitted = „În procesare” · „Proiect act” (Prelungire) / „Proiect decizie” (AC-04), the number of
     the dossier = the number of the request, distributed to the initiator (AC-07), the confirmation in place (AC-05) */
  function ofcSubmit(d) {
    const act = ofcActOf(d);
    d.status = "În procesare";
    d.substatus = d.requestType === "Prelungire" ? "Proiect act" : "Proiect decizie";
    d.submittedAt = nowIso();
    const wd = window.GEAPWorkingDays;
    const day = d.submittedAt.slice(0, 10);
    d.examDeadline = typeof wd?.addWorkingDays === "function" ? `${wd.addWorkingDays(day, ofcTermDays(d), "ANSP")}T23:59:00` : addDays(d.submittedAt, Math.round((ofcTermDays(d) * 7) / 5));
    d.assignee = userName();
    d.step = STEP_INDEX.confirmare; d.maxStep = d.step;
    audit("Depunere dosar din oficiu", d, `Dosar ${d.nr} · act ${act?.nr || ""} · canal ${OFC} · În procesare / ${d.substatus} · reușită`);
    audit("Distribuire automată", d, `Dosarul ${d.nr} a fost distribuit utilizatorului care l-a inițiat (${userName()})`, { system: true });
    if (d.ofc?.decision?.mode === "form") audit("Generare decizie MDocs", d, `Versiunea de tipar a deciziei ${d.ofc.decision.nr}`, { system: true });
    persist({ silent: true });
    syncOfcDossiers();
    /* the success toast comes when the window closes over the list (as the desk, ghiseu-picker-toast-v1) */
    S.submittedNr = d.nr;
    render();
  }
  function ofcConfirmedHtml(d) {
    const act = ofcActOf(d);
    return `
      <div class="e-permits-gh__finish">
        ${R().finishHeroHtml?.({ title: "Dosarul a fost depus cu succes.", leadHtml: '<p class="e-permits-fo-finish__lead">Dosarul a fost transmis spre procesare și distribuit automat către dvs. Îl găsiți în „Dosarele mele”.</p>' }) || ""}
        <div class="e-permits-fo-finish__content">
          <section class="e-permits-dosar-profil__card" aria-label="Dosarul depus">
            ${detailRow("Numărul dosarului", R().copyValueHtml?.(d.nr, { ariaLabel: `Copiază numărul dosarului ${d.nr}` }) || esc(d.nr))}
            ${detailRow("Data depunerii", esc(stamp(d.submittedAt)))}
            ${detailRow("Termen de examinare", `${esc(longDate(d.examDeadline))} (${esc(plural(ofcTermDays(d), "zi lucrătoare", "zile lucrătoare"))})`)}
            ${detailRow("Statut", `${tagHtml("În procesare", "info")}${tagHtml(d.substatus, "info")}`)}
            ${detailRow("Postproces", esc(`${d.requestType} · ${act?.nr || ""}`))}
            ${detailRow("Canal de depunere", OFC)}
            ${detailRow("Responsabil", esc(d.assignee || userName()))}
          </section>
        </div>
      </div>${footerHtml(d, { custom: `<button class="btn btn-neutral btn-rounded" type="button" data-gh-close-sheet>Înapoi la Dosare inițiate din oficiu</button><button class="btn btn-primary btn-rounded" type="button" data-ofc-open-dossier="${esc(d.nr)}">Deschide dosarul</button>` })}`;
  }
  /* US-244 AC-03: the decision's print version (MDocs standard template, „Decizie privind …”) */
  function ofcDecisionPage(d, authority) {
    const act = ofcActOf(d);
    const o = d.ofc || blankOfc();
    const svc = serviceOf(d.service);
    return window.GEAPDocPreview?.mdocsHtml?.({
      type: "notificare", title: OFC_DECISION_TITLE[d.requestType] || "Decizia autorității", overline: "",
      authority, office: d.details.subdivision, number: o.decision.nr || d.nr, date: o.decision.date || d.createdAt,
      intro: o.decision.content ? [o.decision.content] : null,
      groups: [
        { title: "Actul permisiv", rows: [["Numărul actului", act?.nr || ""], ["Serviciul", svc?.title || ""], ["Obiectul", act?.name || ""], ["Titular", `${holderName(d)} · ${d.personType === "PJ" ? `IDNO ${d.company.idno}` : `IDNP ${d.applicant.idnp}`}`]] },
        { title: "Decizia", rows: [["Temeiul", o.decision.temei || "—"], ...(OFC_FIELDS[d.requestType] || []).map((f) => [f.label, f.type === "date" ? longDate(o.fields[f.key]) : o.fields[f.key] || "—"]), ["Dosarul din oficiu", d.nr]] }
      ]
    }) || "";
  }

  const STEP_RENDER = { initiere: stepInitiere, intent: stepIntent, identificare: stepIdentificare, detalii: stepDetalii, documente: stepDocumente, verificare: stepVerificare, livrare: stepLivrare, plata: stepPlata, confirmare: stepConfirmare };
  const STEP_BIND = { initiere: bindInitiere, identificare: bindIdentificare, detalii: bindDetalii, documente: bindDocumente, verificare: bindVerificare, livrare: bindLivrare };
  const COLLECT = { identificare: () => { collectInitiere(); collectSolicitant(); }, detalii: collectDetalii, documente: collectDocumente, livrare: collectLivrare };
  /* data checks per step index (validate = collect + check) */
  /* din oficiu: no picker (the act's holder is the subject), „Date titular” = the contact checks of US-243 */
  const CHECKS = { initiere: (d) => (isOfc(d) ? [] : checkPicker(d)), intent: (d) => (isOfc(d) ? checkOfcAct(d) : checkProcess(d)), identificare: (d) => (isOfc(d) ? checkContactOfc(d) : [...dataCheckInitiere(d), ...checkContact(d)]), detalii: checkDetalii, documente: checkDocumente, verificare: checkVerificare, livrare: checkLivrare, plata: () => [], confirmare: () => [] };
  const CHECK = STEPS.map((step) => CHECKS[step.id]);
  /* the picker: a service, and a process (Emitere primară is preselected) */
  const PROCESS_MSG = "Alegeți „Solicitare nouă” sau un postproces pe un act emis.";
  /* din oficiu, the act search (US-242): an act and its post-process must be chosen before „Înainte” / „Salvează schița” */
  const checkOfcAct = (d) => (!d.act || !d.requestType ? [{ key: "ofc-act", focus: "#gh-ofc-q", msg: "Alegeți actul permisiv și, din meniul ⋮ al actului, postprocesul." }] : []);
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
    if (id === "identificare" && isOfc(S.cur)) { collectSolicitant(); return checkContactOfc(S.cur); }
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
  function persist({ auto = false } = {}) {
    const d = S.cur;
    const last = S.audit[0];
    if (auto && d.id && last?.action === "Salvare automată schiță" && last.cerere === d.nr && last.step === S.step) {
      /* one audit entry per autosave run on a step (the time moves), not one per typing pause */
      last.at = nowIso();
    } else if (auto && d.id) {
      audit("Salvare automată schiță", d, `Pasul „${stepLabel(d, STEPS[S.step].id)}”`, { step: S.step });
    } else if (!d.id) {
      d.nr = nextRequestNumber();
      d.id = `${isOfc(d) ? "ofc" : "gh"}-${d.nr.slice(-4)}-${Date.now().toString(36).slice(-4)}`;
      d.uid = `uid-${d.id}`;
      d.createdAt = nowIso();
      d.by = userName();
      /* the MConnect lookups made before the first save belong to the request too (AC-36) */
      S.audit.forEach((e) => { if (e.tmp && e.tmp === d.tmp) { e.cerere = d.nr; delete e.tmp; } });
      /* US-242 AC-14 (din oficiu): + the permit, the person concerned (the holder) and the personal-data mark */
      audit("Prima salvare a schiței", d, `${serviceOf(d.service)?.title || ""} · ${d.requestType}${isOfc(d) ? ` · act ${ofcActOf(d)?.nr || ""}` : ""} · statut Schiță · canal ${isOfc(d) ? OFC : "Ghișeu"}`);
    } else {
      audit("Salvare schiță", d, `Pasul „${stepLabel(d, STEPS[S.step].id)}”`);
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
  }
  function go(target, { validate = true } = {}) {
    const d = S.cur;
    const from = S.step;
    if (target === from || !d) return;
    /* din oficiu has no picker: the act search („Schimbă actul sau postprocesul”) is the way back */
    if (target === 0 && isOfc(d)) return;
    /* back to the picker (US-233: applicant and process change only there) */
    if (target === 0) {
      autosave(); /* the window's last edits are kept even when the picker is cancelled (it reopens the saved draft) */
      COLLECT[STEPS[from].id]?.();
      S.returnStep = from;
      S.step = 0;
      render();
      return;
    }
    /* US-247 AC-06 (din oficiu, oficiu-v2): the step change saves the draft only AFTER the step left validates
       (mandatory fields, formats, files). Back / a free stepper jump from an incomplete step still moves (US-245
       AC-06: the typed values stay in the window), but nothing is saved until the step is valid */
    let saveIt = true;
    if (validate && target > from) {
      const errs = validateStep(from);
      if (errs.length) { showErrors(errs); return; }
    } else if (isOfc(d)) saveIt = !validateStep(from).length;
    else if (STEPS[from].id === "identificare") { collectInitiere(); collectSolicitant(); }
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
    S.step = target;
    if (target === STEP_INDEX.plata) ensurePayment(d);
    /* US-245 AC-11 (din oficiu): EVERY entry into Verificare is logged, with its result */
    if (target === STEP_INDEX.verificare && (from < target || isOfc(d))) audit("Intrare în pasul Verificare", d, isOfc(d) ? "Rezumatul dosarului afișat · reușită" : "Rezumatul cererii afișat");
    /* AC-06: saved on every step change (the first one creates the draft) — ghiseu-autosave-csv-v1: also when the step
       left is incomplete, as its edits were autosaved anyway (a draft is work in progress); din oficiu only when valid */
    if (!isSubmitted(d) && saveIt) persist();
    else d.maxStep = Math.max(d.maxStep || 0, target);
    S.notice = null;
    render();
  }

  function clearErrors() {
    if (!S.page) return;
    S.page.querySelectorAll("[aria-invalid='true']").forEach((el) => { if (el.matches("input, textarea")) R().setFieldError?.(el, ""); else el.removeAttribute("aria-invalid"); });
    S.page.querySelectorAll("[data-gh-err]").forEach((slot) => { const was = !slot.hidden; slot.hidden = true; slot.innerHTML = ""; if (was) syncDocErr(slot); });
    S.page.querySelectorAll("[data-gh-select-err]").forEach((el) => el.remove());
    S.page.querySelectorAll(".is-error").forEach((el) => { if (el.matches(".e-permits-fo-select, .e-permits-fo-caem, .e-permits-fo-doc-field, .e-permits-check-options, .segmented-control, .e-permits-fo-textarea")) el.classList.remove("is-error"); });
  }
  function setErr(key, msg, fieldEl = null) {
    const slot = S.page?.querySelector(`[data-gh-err="${key}"]`);
    if (!slot) return;
    slot.innerHTML = `${ERR_ICON}<span>${esc(msg)}</span>`;
    slot.hidden = false;
    fieldEl?.classList.add("is-error");
    syncDocErr(slot);
  }
  function clearErr(key) {
    const slot = S.page?.querySelector(`[data-gh-err="${key}"]`);
    if (!slot || slot.hidden) return;
    slot.hidden = true; slot.innerHTML = "";
    docFieldOfSlot(slot)?.classList.remove("is-error");
    syncDocErr(slot);
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
        } else {
          R().setFieldError?.(el, e.msg);
          /* the FO error helper colours inputs; a textarea's frame gets its error look here (as „Motivul eliminării”) */
          el.closest(".e-permits-fo-textarea")?.classList.add("is-error");
        }
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
      /* din oficiu, the act search: the service filter redraws the list (not an edit of the draft) */
      if (button.id === "fo-gh-ofc-service") {
        const title = select.querySelector(".e-permits-fo-select__option.is-selected")?.dataset.value || "";
        S.ofcService = ofcActs().find((a) => serviceOf(a.service)?.title === title)?.service || "";
        render({ focusTitle: false });
        S.page.querySelector("#fo-gh-ofc-service")?.focus();
        return;
      }
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
    /* din oficiu, after submission: the dossier itself (US-246 AC-06 — it lives in „Dosarele mele” now) */
    const dossier = t.closest("[data-ofc-open-dossier]");
    if (dossier) { const nr = dossier.dataset.ofcOpenDossier; S.cur = null; S.dirty = false; closeSheet(); window.location.hash = `#dosar/${encodeURIComponent(nr)}/general`; return; }
    if (t.closest("[data-gh-next]")) { go(nextStepIndex(d, S.step)); return; }
    if (t.closest("[data-gh-prev]")) { go(prevStepIndex(d, S.step), { validate: false }); return; }
    const goto = t.closest("[data-gh-goto]");
    if (goto) { event.preventDefault(); const target = Number(goto.dataset.ghGoto); go(target, { validate: !goto.hasAttribute("data-gh-free") && target > S.step }); return; }
    if (t.closest("[data-gh-save]")) {
      /* the FO listens for its draft button on the document — this one is the desk's. Kept next to the autosave as
         in the FO (fo-02…fo-06 „Salvează ca schiță”): saves now + the FO confirmation, no validation (the autosave
         keeps incomplete steps too) */
      event.stopPropagation();
      /* din oficiu (US-247 AC-02…04, oficiu-v2): on every step, the act search included; saved only when the step
         validates — otherwise every error shows at once and nothing is saved; the success text is the AC's */
      if (isOfc(d)) {
        const errs = validateStep(S.step);
        if (errs.length) { showErrors(errs); return; }
        clearErrors();
        if (!autosave({ explicit: true })) persist();
        U().showShellToast?.("Datele au fost salvate cu succes.", "success");
        refreshChrome();
        setHash(hashFor(d, STEPS[S.step].id));
        return;
      }
      if (!autosave({ explicit: true }) && d.id) persist();
      /* the FO draft button's confirmation (US-239 „afișează confirmarea”) */
      U().showShellToast?.("Schița a fost salvată.", "success");
      refreshChrome();
      setHash(hashFor(d, STEPS[S.step].id));
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
    /* doc-name-open-v1: an attached document's name → the desk's document viewer (the FO one stays out) */
    const docOpen = t.closest("[data-fo-doc-open]");
    if (docOpen) {
      event.preventDefault();
      try { S.docView = JSON.parse(docOpen.dataset.foDocOpen || "null"); } catch { S.docView = null; }
      if (S.docView) openPreview("doc", docOpen);
      return;
    }
    const preview = t.closest("[data-gh-preview]");
    if (preview) { openPreview(preview.dataset.ghPreview, preview); return; }
    const dl = t.closest("[data-gh-download]");
    if (dl) { closeMenus(); download(dl.dataset.ghDownload); return; }
    if (t.closest("[data-gh-msign]")) { startMsign(); return; }
    if (t.closest("[data-gh-mpay]")) { mpayCallback(); return; }
    if (t.closest("[data-gh-regenerate]")) { regeneratePayment(d); render({ focusTitle: false }); U().showShellToast?.(`Nota de plată ${d.payment.nr} a fost generată și trimisă solicitantului.`, "success"); return; }
    if (t.closest("[data-gh-submit]")) { submit(); return; }
    if (t.closest("[data-gh-cert-retry]")) { d.certError = false; audit("Generare certificat constatator", d, "Reușită la reîncercare"); persist({ silent: true }); render({ focusTitle: false }); document.querySelector('[data-gh-preview="cert"]')?.focus(); return; }
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
    /* the acts search filters the picker; it is not a change of the draft */
    if (event.target.matches?.("[data-gh-acts-search]")) { filterActs(event.target); return; }
    S.dirty = true;

    const t = event.target;
    if (t.getAttribute?.("aria-invalid") === "true" && !t.matches("[data-fo-registry-code]")) { R().setFieldError?.(t, ""); t.closest(".e-permits-fo-textarea")?.classList.remove("is-error"); }
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
  /* MDocs generates the form on demand: the preview opens loading, then shows the page or the MDocs error
     (the step keeps its inline error + „Reîncercați” after the dialog is closed) */
  function generatePaper() {
    const d = S.cur;
    const run = (S.paperRun || 0) + 1;
    S.paperRun = run;
    openPreview("paper", null, "loading");
    if (params.get("mdocs") === "incarcare") return;
    window.setTimeout(() => {
      if (run !== S.paperRun || S.cur !== d) return;
      const shown = previewModal()?.classList.contains("is-active");
      if (params.get("mdocs") === "0" && !S.paperRetried) {
        S.paperRetried = true;
        S.notice = "mdocs-error";
        audit("Generare cerere pe hârtie", d, "Eșuată · MDocs indisponibil");
        render({ focusTitle: false });
        if (shown) { renderPreview("paper", "error"); previewModal().querySelector("[data-gh-paper-retry]")?.focus(); }
        return;
      }
      S.notice = null;
      d.review.paper = { at: nowIso() };
      S.dirty = true;
      audit("Generare cerere pe hârtie", d, "MDocs · șablonul de tipar al serviciului");
      render({ focusTitle: false });
      if (shown) renderPreview("paper", "ready");
    }, MDOCS_DELAY);
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
        <div class="e-permits-dosar-profil__card">
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
    if (t.closest("[data-gh-export-confirm]")) { exportCsv(exportRowsCache); return; }
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
    /* US-248 (din oficiu): the confirmation AC-02 asks, no reason field; the button stays red */
    if (isOfc(d)) {
      U().askConfirm?.({
        title: "Sigur doriți să eliminați schița dosarului?",
        text: `Schița ${d.nr} dispare din „Dosare inițiate din oficiu”, iar cererea primește statutul „Schiță”, substatutul „Eliminat”.`,
        confirmLabel: "Elimină schița",
        destructive: true
      }, () => removeDraft(d, ""));
      return;
    }
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
    removeDraft(d, reason);
  }
  /* US-240 / US-248: statut „Schiță” · substatut „Eliminat”, the previous and new status in the audit (AC-07) */
  function removeDraft(d, reason) {
    const id = d.id;
    const before = `${d.status} / ${d.substatus}`;
    d.removed = { at: nowIso(), by: userName(), reason, auto: false };
    d.status = "Schiță"; d.substatus = "Eliminat";
    if (d.payment && d.payment.status !== "Achitată") d.payment.status = "Anulată";
    audit("Eliminare schiță", d, `${reason ? `Motiv: ${reason} · ` : ""}${before} → Schiță / Eliminat`);
    writeStore();
    updateBadge();
    closeModal();
    U().showShellToast?.(`Schița ${d.nr} a fost eliminată.`, "success");
    const mode = isOfc(d) ? OFC_KIND : "ghiseu";
    if (S.cur?.id === id) { S.cur = null; S.dirty = false; closeSheet(); document.querySelector(`[data-nav-item][data-nav-id="${listOf(mode).nav}"]`)?.click(); }
    else refreshRegistry(mode);
  }

  /* US-241 AC-09 / AC-14 — export with the applied filters and the shown columns. ghiseu-autosave-csv-v1 (user
     decision 2026-10-23, gh-01e): CSV only. export-modal-csv-v1 (user 2026-10-23: „still show the modal — it has
     nice info about personal data”): the toolbar button („Exportă CSV”) opens the library dialog again — record
     count + scope, the CSV hint and the personal-data note, NO format choice; „Exportă CSV” downloads.
     Excel-friendly CSV (BOM + semicolons, as the BO tariffs export). */
  let exportRowsCache = [];
  let exportKind = "noi";
  function openExport(list, kind = "noi") {
    exportRowsCache = list;
    exportKind = kind;
    openModal({
      kind: "export",
      title: "Exportă dosarele",
      subtitle: `${plural(list.length, "înregistrare", "înregistrări")} · filtrele aplicate și coloanele afișate`,
      body: `
        <p class="e-permits-passport__lead">Fișierul se descarcă în format CSV.</p>
        ${U().renderInfoNote?.("Lista conține date cu caracter personal: exportul se înregistrează în Jurnalul de audit.") || ""}`,
      footer: `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-gh-export-confirm>${icon("export", 20, "icon small")}<span>Exportă CSV</span></button></div>`
    });
  }
  function exportCsv(list) {
    /* US-255 AC-07: „Dosare suspendate” exports its own six columns */
    const susp = exportKind === "susp";
    /* US-249 AC-08 (din oficiu): the list's seven columns */
    const ofc = exportKind === OFC_KIND;
    const head = susp
      ? ["Număr dosar", "Denumirea serviciului", "Nume solicitant", "Compania", "Data depunerii", "Termen de suplinire"]
      : ofc ? ["Număr cerere", "Denumirea serviciului", "Nume titular", "Compania", "Data creării", "Data ultimei modificări", "Data eliminării automate"]
      : ["Număr cerere", "Denumirea serviciului", "Nume solicitant", "Compania", "Substatut", "Data creării", "Data ultimei modificări", "Data expirării notei de plată", "Data eliminării automate"];
    const rows = susp
      ? list.map((r) => [r.nr, r.serviciu, r.solicitant, r.companie, stamp(r.depus), longDate(r.termen)])
      : ofc ? list.map((r) => [r.nr, r.serviciu, r.titular, r.companie, stamp(r.creat), stamp(r.modificat), longDate(r.eliminare)])
      : list.map((r) => [r.nr, r.serviciu, r.solicitant, r.companie, r.substatut, stamp(r.creat), stamp(r.modificat), longDate(r.expirareNota), longDate(r.eliminare)]);
    const name = susp ? "dosare-suspendate.csv" : ofc ? "dosare-din-oficiu.csv" : "dosare-noi.csv";
    const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const blob = new Blob(["\ufeff" + [head, ...rows].map((line) => line.map(cell).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    /* US-255 AC-11: user, action, record count, result, the personal-data mark, timestamp */
    S.audit.unshift({ at: nowIso(), user: userName(), action: susp ? "Export listă Dosare suspendate" : ofc ? "Export listă Dosare inițiate din oficiu" : "Export listă Dosare noi", detail: `${rows.length} înregistrări · CSV · reușit`, personal: true });
    writeStore();
    closeModal();
    /* the dialog already says the export goes to the audit log → the toast names only the result */
    U().showShellToast?.(`Am exportat ${plural(rows.length, "înregistrare", "înregistrări")} în ${name}.`, "success");
  }

  /* „Istoricul cererii” — the request's audit entries, newest first */
  function openHistory() {
    const d = S.cur;
    const items = S.audit.filter((e) => e.cerere && e.cerere === d.nr);
    openModal({
      kind: "history",
      title: "Istoricul cererii",
      /* no request number in a dialog header (product rule) — the entries carry it */
      subtitle: "Jurnalul de audit",
      body: items.length ? `
        <div class="e-permits-stack"><ul class="e-permits-stack__list" role="list">
          ${items.map((e) => A().renderStackItem?.({ title: esc(e.action), meta: [esc(stamp(e.at)), esc(e.user)], meta2: [e.detail, e.step != null && STEPS[e.step] && !String(e.detail).includes("Pasul") ? `Pasul „${stepLabel(d, STEPS[e.step].id)}”` : "", e.persoana ? `Persoana vizată: ${e.persoana}` : ""].filter(Boolean).map(esc), badges: e.personal ? [tagHtml("Date personale", "neutral")] : [] }) || "").join("")}
        </ul></div>`
        : window.GEAPEmptyState?.render({ title: "Nicio acțiune înregistrată în această sesiune", text: "Acțiunile seed-ului au fost înregistrate înainte de prototip.", icon: "history", compact: true }) || "",
      footer: '<div class="modal-buttons"><button class="btn btn-primary btn-rounded" type="button" data-case-close>Închide</button></div>'
    });
  }

  /* ---------------------------------------------------------------- document previews
     The BO detail modal (#dosar-detail-modal) as the document viewer = components.md › „Document preview”
     (2026-10-17, user: „do this nicer”): library modal--lg, title + subtitle (what produced it · when — the
     request number lives on the page), the grey canvas with the A4 page(s) of GEAPDocPreview (js/doc-preview.js:
     2-column table that fits the page, continuation pages „Pagina k din n”, zoom to the canvas width, print =
     the pages only), „Printează” (printer icon) + „Descarcă” (icon-export). The paper request is generated by
     MDocs on demand: loading → ready, or the MDocs error with „Reîncercați” (?mdocs=0 fails once,
     ?mdocs=incarcare stays loading). */
  const MDOCS_DELAY = 900;
  const docRow = ([label, value]) => `<tr><td>${esc(label)}</td><td>${esc(value || "—")}</td></tr>`;
  const docGroup = (title, pairs) => (pairs.length ? `<tr class="e-permits-doc-page__group"><th colspan="2" scope="colgroup">${esc(title)}</th></tr>${pairs.map(docRow).join("")}` : "");
  const docPage = ({ cont, head, rows, tail = "", footer }) => `
    <div class="e-permits-dtpl__page e-permits-doc-peek__page e-permits-doc-page" data-doc-cont="${esc(cont)}">
      <div class="e-permits-dtpl__surface e-permits-doc-page__surface">
        ${head}
        <table><colgroup><col class="e-permits-doc-page__label-col"><col></colgroup><tbody>${rows}</tbody></table>
        ${tail ? `<div class="e-permits-doc-page__tail">${tail}</div>` : ""}
        <p class="e-permits-doc-page__footer">${esc(footer)} · <span data-doc-page-label>Pagina 1 din 1</span></p>
      </div>
    </div>`;
  function previewPage(kind) {
    const d = S.cur;
    const svc = serviceOf(d.service);
    const authority = A().getAuthorityById?.(svc?.authorityId)?.name || "Agenția Națională pentru Sănătate Publică";
    const repPerson = d.personType === "PJ" ? d.applicant : d.rep.on ? d.rep : null;
    if (kind === "paper") {
      const at = d.review.paper?.at || nowIso();
      const form = formOf(d);
      const attached = docsOf(d).filter((doc) => (d.docs[doc.id] || []).length).map((doc) => [doc.label, (d.docs[doc.id] || []).map((f) => f.fisier || f.tip || "").filter(Boolean).join("; ") || "Atașat"]);
      return docPage({
        cont: `Cerere nr. ${d.nr} · continuare`,
        head: `<p>Către: ${esc(authority)}</p><h1>Cerere</h1><p>nr. ${esc(d.nr)} din ${esc(longDate(at))} · depusă la ghișeu</p>`,
        rows: [
          docGroup("Serviciul solicitat", [["Serviciul", svc?.title || ""], ["Tipul solicitării", d.requestType], ["Subdiviziunea de procesare", d.details.subdivision], ["Termen de examinare", termOf(d)?.label]]),
          docGroup("Solicitantul", [[d.personType === "PJ" ? "Denumirea" : "Nume, prenume", holderName(d)], ["Cod de identificare", d.personType === "PJ" ? `IDNO ${d.company.idno}` : `IDNP ${d.applicant.idnp}`]]),
          repPerson ? docGroup("Reprezentantul", [["Nume, prenume", fullName(repPerson)], ["IDNP", repPerson.idnp], ["Temeiul reprezentării", basisLabel(d)]]) : "",
          docGroup("Date de contact", [["Telefon", d.contact.phone ? `+373 ${formatPhone(d.contact.phone)}` : ""], ["Email", d.contact.email]]),
          docGroup("Detalii serviciu", [...form.fields.map((f) => [f.label, d.details.values[f.key]]), ...(form.address ? [["Adresa obiectului", addressText(d.details.address)]] : [])]),
          docGroup("Documente anexate", attached.length ? attached : [["Documente", "—"]])
        ].join(""),
        tail: `<p>Declar pe propria răspundere că datele din cerere și documentele anexate sunt veridice.</p>
          <p>Consimțământ: în conformitate cu Legea nr. 133 din 08.07.2011, sunt de acord cu prelucrarea datelor mele cu caracter personal pentru examinarea cererii și cu primirea notificărilor despre dosar prin MNotify, la datele de contact indicate.</p>
          <p>Semnătura solicitantului: ______________________ &nbsp; Data: ____________</p>`,
        footer: `Generat prin MDocs la ${stamp(at)} · ${d.nr}`
      });
    }
    if (kind === "signed") {
      return docPage({
        cont: `Cererea semnată ${d.nr} · continuare`,
        head: `<h1>Cererea semnată MSign</h1><p>Documentul cererii ${esc(d.nr)} în format JSON, returnat de MSign</p>`,
        rows: [
          docGroup("Documentul cererii", [["Număr cerere", d.nr], ["UID", d.uid], ["Serviciul", svc?.title || ""], ["Tipul solicitării", d.requestType], ["Solicitant", holderName(d)], ["Canal de depunere", "Ghișeu"]]),
          docGroup("Semnătura", [["Semnat de", d.review.signed?.by], ["Data semnării", stamp(d.review.signed?.at)], ["Verificarea semnăturii", "Validă"]])
        ].join(""),
        footer: `Semnat electronic prin MSign · ${d.nr}`
      });
    }
    /* doc-name-open-v1: an attached document (its name on the card) = the shared FO document page */
    if (kind === "doc") return R().docPageHtml?.(S.docView || {}) || "";
    /* din oficiu (US-244 AC-03): the decision filled as an electronic form = the MDocs print version (preview) */
    if (kind === "decizie") return ofcDecisionPage(d, authority);
    /* machete-mdocs-v1 (2026-10-25, US-311): the certificate = the MDocs standard template */
    if (window.GEAPDocPreview?.mdocsHtml) {
      return window.GEAPDocPreview.mdocsHtml({
        type: "certificat",
        authority,
        office: d.details.subdivision,
        number: d.nr,
        date: d.submittedAt,
        groups: [{ rows: [["Serviciul", svc?.title || ""], ["Tipul solicitării", d.requestType], ["Solicitant", holderName(d)], ["Data și ora depunerii", stamp(d.submittedAt)], ["Canal de depunere", "Ghișeu"], ["Termen de examinare", longDate(d.examDeadline)]] }]
      });
    }
    return docPage({
      cont: `Certificat constatator ${d.nr} · continuare`,
      head: `<h1>Certificat constatator</h1><p>Confirmă depunerea cererii în SIA GEAP</p>`,
      rows: [["Numărul dosarului", d.nr], ["Serviciul", svc?.title || ""], ["Solicitant", holderName(d)], ["Data depunerii", stamp(d.submittedAt)], ["Termen de examinare", longDate(d.examDeadline)], ["Canal de depunere", "Ghișeu"]].map(docRow).join(""),
      tail: `<p>Semnat electronic · MSign · SIA GEAP · ${esc(longDate(d.submittedAt))}</p>`,
      footer: `Generat de SIA GEAP la depunere · ${d.nr}`
    });
  }
  const previewTitles = (d) => ({
    paper: ["Cererea pe hârtie", `Generată prin MDocs · ${stamp(d.review.paper?.at)}`],
    /* doc-viewer-v1: who signed + when live in the signature tray under the page, not in the subtitle */
    signed: ["Cererea semnată MSign", "Documentul cererii în format JSON"],
    cert: ["Certificatul constatator", "Generat de SIA GEAP la depunere"],
    decizie: ["Decizia autorității", "Versiunea de tipar MDocs · formular electronic"],
    /* doc-name-open-v1: title = the document type, subtitle = how it came + when (no numbers in the header) */
    doc: [S.docView?.tip || "Document", [S.docView?.sursa === "mdocs" ? "Din MDocs" : S.docView?.sursa === "generat" ? "Generat" : "Încărcat la ghișeu", S.docView?.at].filter(Boolean).join(" · ")]
  });
  const previewModal = () => document.querySelector("#dosar-detail-modal");
  /* doc-viewer-v1 (2026-10-21, GEAP 2.0 11366:6892): generated documents = the page + ONE signature tray under it
     (badge above „MSign · <signer> · <date, time>”); the paper request is signed by hand → no tray */
  const previewSignature = (kind) => {
    const d = S.cur;
    const sig = kind === "cert" ? { by: "SIA GEAP", at: stamp(d.submittedAt) }
      : kind === "signed" && d.review.signed ? { by: d.review.signed.by, at: stamp(d.review.signed.at) }
      : kind === "doc" && S.docView?.semnat ? { by: S.docView.de || "MSign", at: S.docView.at || "" } : null;
    return sig ? window.GEAPDocPreview?.signatureHtml(sig) || "" : "";
  };
  /* view = loading | error | ready */
  function renderPreview(kind, view = "ready") {
    const d = S.cur;
    const m = previewModal();
    if (!m || !d) return;
    const [title, subtitle] = previewTitles(d)[kind];
    m.querySelector("[data-dosar-detail-title]").textContent = title;
    m.querySelector("[data-dosar-detail-subtitle]").textContent = view === "ready" ? subtitle : "Formularul de tipar al cererii";
    const body = m.querySelector("[data-dosar-detail-body]");
    body.setAttribute("aria-busy", String(view === "loading"));
    body.innerHTML = view === "ready"
      ? `<div class="e-permits-doc-peek__canvas e-permits-detail-modal__preview" data-dosar-doc-canvas role="document" aria-label="${esc(title)}">${previewPage(kind)}</div>${previewSignature(kind)}`
      : `<div class="e-permits-doc-peek__canvas e-permits-detail-modal__preview e-permits-doc-peek__canvas--state">${view === "loading"
        ? window.GEAPEmptyState?.render({ loading: true, bare: true, title: "Se generează cererea", text: "MDocs completează formularul de tipar cu datele cererii. Poate dura câteva secunde." }) || ""
        : window.GEAPEmptyState?.render({ bare: true, icon: "circle-error", title: "Nu s-a putut genera cererea", text: "MDocs nu a răspuns. Datele cererii nu s-au pierdut.", actionHtml: `<button class="btn btn-strict btn-sm" type="button" data-gh-paper-retry>${icon("rotate-arrow", 20, "icon small")}<span>Reîncercați</span></button>` }) || ""}</div>`;
    m.querySelector("[data-dosar-detail-buttons]").innerHTML = view === "ready"
      ? `${kind === "paper" ? `<button class="btn btn-neutral btn-rounded" type="button" data-gh-print>${window.GEAPDocPreview?.printIcon() || ""}<span>Printează</span></button>` : ""}
        <button class="btn btn-primary btn-rounded" type="button" data-gh-download="${kind}">${icon("export", 20, "icon small")}<span>Descarcă</span></button>`
      : '<button class="btn btn-primary btn-rounded" type="button" data-dosar-detail-close>Închide</button>';
    if (view === "ready") {
      const canvas = body.querySelector("[data-dosar-doc-canvas]");
      window.GEAPDocPreview?.paginate(canvas);
      window.GEAPDocPreview?.fit(canvas);
    }
  }
  function openPreview(kind, trigger = null, view = "ready") {
    const m = previewModal();
    if (!m || !S.cur) return;
    const dialog = m.querySelector(".modal");
    dialog.classList.remove("modal--md");
    dialog.classList.add("modal--lg", "e-permits-detail-modal--doc");
    if (!m.dataset.ghBound) {
      m.dataset.ghBound = "1";
      m.addEventListener("click", (event) => {
        const dl = event.target.closest("[data-gh-download]");
        if (dl) { download(dl.dataset.ghDownload); return; }
        if (event.target.closest("[data-gh-paper-retry]")) { generatePaper(); return; }
        if (event.target.closest("[data-gh-print]")) { audit("Tipărire cerere pe hârtie", S.cur, ""); window.GEAPDocPreview?.print(m.querySelector("[data-dosar-doc-canvas]")); }
      });
      /* the shell's own detail views (payment note, documents) use the md size: back to it on close */
      new MutationObserver(() => {
        if (m.classList.contains("is-active")) return;
        dialog.classList.remove("modal--lg", "e-permits-detail-modal--doc");
        dialog.classList.add("modal--md");
      }).observe(m, { attributes: true, attributeFilter: ["class"] });
    }
    const open = m.classList.contains("is-active");
    renderPreview(kind, view);
    if (!open) window.__modal?.open?.("#dosar-detail-modal");
    window.GEAPDocPreview?.fit(m.querySelector("[data-dosar-doc-canvas]"));
    if (trigger) trigger.setAttribute("aria-expanded", "true");
  }
  function download(kind) {
    const d = S.cur;
    if (!d) return;
    const names = { paper: `cerere-${d.nr}.pdf`, signed: `cerere-${d.nr}.json`, cert: `certificat-constatator-${d.nr}.pdf`, decizie: `decizie-${d.ofc?.decision?.nr || d.nr}.pdf`, note: `nota-de-plata-${d.payment?.nr}.pdf`, doc: S.docView?.fisier || "document.pdf" };
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
    /* «Dosare inițiate din oficiu» › „Nou” (US-242 AC-02) */
    if (t.closest('[data-workplace-add-product="ofc-new"], [data-ofc-new]')) { event.preventDefault(); history.pushState(null, "", `${window.location.pathname}${window.location.search}#oficiu/nou`); route("nou", null, OFC_KIND); return; }
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
    /* submitted ex-officio dossiers back among the shell's dossiers once both stores are loaded (US-246 AC-06) */
    load().then(() => {
      let tries = 0;
      const tick = () => { if (syncOfcDossiers({ redraw: true }) || tries > 150) return; tries += 1; setTimeout(tick, 100); };
      tick();
    });
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
