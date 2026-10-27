/* =====================================================================================
   Absențe + distribuire — BO module (absences-dist-v1, 2026-10-26)
   US-312 (96275) Absențele subdiviziunii · US-313 (96276) tabul „Absențe” · US-314 (96277) adăugare ·
   US-315 (96278) editare · US-316 (96279) ștergere · US-291 (96008) tabul „Distribuire” al utilizatorului ·
   US-289 (96006) politica de distribuire GEAP + autoritate · US-294 (96011) „Încărcarea echipei”.
   User decisions (2026-10-26, PO questions stay open): absences live ONLY in the user profile model (US-312…316);
   saving an absence for someone with open dossiers shows an alert with „Deleagă rol” / „Redistribuie”; the
   distribution excludes absent specialists (redistribution reads `GEAPAbsences.teamInfo`).

   Data: data/absences.json (people, absences, per-person distribution settings, the policy) — one store, kept in
   sessionStorage (`e-permits-absences`, cleared by demo links). Dates run on the dossiers' clock
   (e-permits-workplace.json › today). Every screen is an existing component:
     · profile tabs „Absențe” / „Distribuire” = the shell's user profile tabs (hook window.GEAPShellUserTabs) + the
       BO stacked list / passport block; „Profilul meu” = the shared profile panel (A().openProfilePanel);
     · „Adaugă absența” / „Modifică absența” / „Setări de distribuire” = the library dialog #case-action-modal
       (FO fields, library date picker, textarea with counter); delete = askConfirm (destructive);
     · the open-dossiers alert = the Alert card (js/alert-card.js);
     · „Absențe” (US-312) and „Încărcarea echipei” (US-294) = BO registries (window.GEAPShellRegistries);
     · „Setări › Distribuire” (US-289) = the profile panel with the US-290 field look (`.e-permits-cfg-dp__*`).
   Routes: #absente · #incarcarea-echipei · #distribuire/<tab> · #profilul-meu/<tab> · #utilizator/<id>/absences|distribution.
   Demo switches: ?fara=absente,distribuire,politica (permission off) · ?absente=eroare (AC-15 / AC-08 operation fails).
   Working days: js/working-days.js (window.GEAPWorkingDays) when present; else calendar days (TODO below).
   ===================================================================================== */
(function () {
  "use strict";

  const A = () => window.GEAPShellApi || {};
  const U = () => window.GEAPUi || {};
  const params = new URLSearchParams(window.location.search);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (name, cls = "icon small") => `<svg class="${cls}" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${name}"></use></svg>`;
  const tag = (label, tone = "neutral", attrs = "") => window.GEAPTag?.html(label, tone, attrs ? { attrs } : undefined) || esc(label);
  const dash = '<span class="e-permits-workplace__dash">—</span>';
  const DENIED = "Nu aveți permisiunea de a accesa această pagină.";
  const STORE = "e-permits-absences";
  const FAIL = "Operația nu a putut fi efectuată";
  const off = (key) => (params.get("fara") || "").split(",").map((k) => k.trim()).includes(key);
  const fails = () => params.get("absente") === "eroare";
  const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
  const req = () => U().requiredMark?.() || "";
  const MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];

  /* Romanian counts: 1 zi · 2–19 zile · 20+ „de zile” (last two digits 00 or ≥ 20) */
  const roCount = (n, one, many) => {
    if (n === 1) return `1 ${one}`;
    const tail = n % 100;
    return `${n}${n >= 20 && (tail === 0 || tail >= 20) ? " de" : ""} ${many}`;
  };
  const num = (value) => Number(String(value ?? "").replace(",", "."));
  const numText = (value) => (Number.isFinite(value) ? value.toLocaleString("ro-MD", { maximumFractionDigits: 2 }) : "—");

  /* ================================================================ store */
  const S = { data: null, loading: null, list: [], dist: {}, policy: null, audit: [], notice: null, users: new Map() };
  const persist = () => {
    try { window.sessionStorage.setItem(STORE, JSON.stringify({ list: S.list, dist: S.dist, policy: S.policy, audit: S.audit })); } catch { /* private mode: memory only */ }
  };
  function load() {
    if (S.data) return Promise.resolve(S.data);
    if (S.loading) return S.loading;
    S.loading = fetch("data/absences.json", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        S.data = data;
        let saved = null;
        try { saved = JSON.parse(window.sessionStorage.getItem(STORE) || "null"); } catch { saved = null; }
        /* the seed keeps its place around today: every date moves by (real today − seed today) */
        const shift = Math.round((new Date(`${realToday()}T00:00:00`) - new Date(`${data.today || realToday()}T00:00:00`)) / 86400000);
        const moved = (v) => (v ? `${addDays(v.slice(0, 10), shift)}${v.slice(10)}` : v);
        const seed = () => clone(data.absences || []).map((a) => ({ ...a, from: moved(a.from), to: moved(a.to), recordedAt: moved(a.recordedAt) }));
        S.list = (saved?.list || seed()).map((a) => (LEGACY_TYPES[a.type] ? { ...a, type: LEGACY_TYPES[a.type] } : a));
        S.dist = saved?.dist || clone(data.distribution || {});
        S.policy = saved?.policy || clone(data.policy || {});
        S.audit = saved?.audit || [];
        onLoaded();
        return data;
      })
      .catch(() => null);
    return S.loading;
  }

  /* calendar-views-v3 (user): „Azi” = the REAL date (or `?today=YYYY-MM-DD` for the demo states); the seed absences
     are shifted by (real today − seed today) on load, so they keep their place around today. The dossiers keep their
     own clock (e-permits-workplace.json › today) for deadlines, load windows and novice months: caseToday(). */
  const realToday = () => {
    const q = params.get("today") || "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(q)) return q;
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const today = realToday;
  const caseToday = () => A().dossierStore?.()?.today || S.data?.today || realToday();
  const nowIso = () => `${today()}T${new Date().toTimeString().slice(0, 8)}`;
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const dateOf = (s) => (s ? new Date(`${s.slice(0, 10)}T00:00:00`) : null);
  const addDays = (s, n) => { const d = dateOf(s); d.setDate(d.getDate() + n); return iso(d); };
  const addMonths = (s, n) => { const d = dateOf(s); d.setMonth(d.getMonth() + n); return iso(d); };
  const long = (s) => (s ? A().formatLongDate?.(s.slice(0, 10)) || s : "");
  const ddmmyyyy = (s) => (s ? s.slice(0, 10).split("-").reverse().join("/") : "");
  const parseTyped = (text) => {
    const m = String(text || "").trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    if (!m) return null;
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    return d.getDate() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 ? iso(d) : null;
  };
  /* „20 – 22 iulie 2026” · „28 iulie – 6 august 2026” · „din 27 iulie 2026” (no end date) */
  const periodText = (from, to) => {
    if (!from) return "—";
    if (!to) return `din ${long(from)}`;
    if (from === to) return long(from);
    const [fy, fm, fd] = from.split("-").map(Number);
    const [ty, tm] = to.split("-").map(Number);
    if (fy !== ty) return `${long(from)} – ${long(to)}`;
    return fm === tm ? `${fd} – ${long(to)}` : `${fd} ${MONTHS[fm - 1]} – ${long(to)}`;
  };
  /* working days = js/working-days.js (GEAPWorkingDays, the Calendar engine: d with a < d ≤ b, per authority); a page
     without it falls back to calendar days */
  const workingBetween = (a, b, authority) => {
    const n = typeof window.GEAPWorkingDays?.workingDaysBetween === "function" ? window.GEAPWorkingDays.workingDaysBetween(a, b, authority) : NaN;
    return Number.isFinite(n) ? n : null;
  };
  const durationText = (from, to, authority = "ANSP") => {
    if (!from || !to) return "fără dată de sfârșit";
    const n = workingBetween(addDays(from, -1), to, authority);
    return n != null ? roCount(n, "zi lucrătoare", "zile lucrătoare") : roCount(Math.round((dateOf(to) - dateOf(from)) / 86400000) + 1, "zi", "zile");
  };
  const daysUntil = (s, authority = "ANSP") => {
    const n = workingBetween(caseToday(), s, authority);
    return n != null ? n : Math.round((dateOf(s) - dateOf(caseToday())) / 86400000);
  };

  /* ================================================================ who is looking */
  function who() {
    const a = A().currentAssignment?.() || {};
    const roleId = a.roleId || "specialist";
    const authority = /^anta-/.test(a.id || "") ? "ANTA" : "ANSP";
    return {
      roleId,
      roleLabel: a.roleLabel || "Specialist",
      authority,
      subdivision: ["central-admin", "local-admin"].includes(roleId) ? null : a.instanceLabel || "CSP Chișinău",
      central: roleId === "central-admin",
      local: roleId === "local-admin",
      supervisor: roleId === "supervisor"
    };
  }
  /* „Gestionarea absențelor utilizatorilor” (name: PO question, US-316) — Central (all), Local (own authority),
     Supervisor (own subdivision) */
  const canAbsences = (w = who()) => !off("absente") && (w.central || w.local || w.supervisor);
  /* „Gestionarea datelor de distribuire ale specialiștilor” (US-291) — the same three roles */
  const canDistribution = (w = who()) => !off("distribuire") && (w.central || w.local || w.supervisor);
  /* „Gestionarea politicii de distribuire” (US-289): Central edits GEAP + every authority, Local edits its own authority
     (GEAP read-only), the Supervisor sees the effective policy of its subdivision */
  const canPolicy = (w = who()) => !off("politica") && (w.central || w.local || w.supervisor);
  const inScope = (person, w = who()) => Boolean(person) && (w.central
    || (w.local && person.authority === w.authority)
    || (w.supervisor && person.authority === w.authority && person.subdivision === w.subdivision));
  const perimeterText = (w = who()) => (w.central ? "toate autoritățile" : w.local ? `autoritatea ${w.authority}` : `subdiviziunea ${w.subdivision}`);

  /* ================================================================ people */
  const people = () => S.data?.people || [];
  const me = () => {
    const base = people().find((p) => p.me) || { id: "me", name: "Anastasia Cojocaru", authority: "ANSP" };
    const w = who();
    return { ...base, name: A().currentUserName?.() || base.name, role: w.roleLabel, subdivision: w.subdivision || base.subdivision, authority: w.authority };
  };
  const personById = (id) => (id === "me" ? me() : people().find((p) => p.id === id) || null);
  /* a user of Administrare › Utilizatori = a person by IDNP; users without a seed entry get one built from the record */
  const personOfUser = (user) => people().find((p) => p.idnp && p.idnp === user.idnp)
    || { id: `user:${user.idnp}`, name: user.numeComplet, idnp: user.idnp, authority: user.autoritateScurta || "ANSP", subdivision: user.subdiviziune || "—", role: (user.roluri || [])[0] || "Specialist", synthetic: true };
  const personBySpecialist = (spId) => people().find((p) => p.specialistId === spId) || null;
  /* the Utilizatori runtime id (`user-N` = order in data/e-permits-users.json › users) */
  const SEED_USER_IDS = { "2000002238471": "user-1", "2118421010044": "user-2", "2118421010045": "user-3", "2118421010046": "user-4" };
  const userIdOf = (person) => {
    if (!person?.idnp) return null;
    for (const [id, user] of S.users) if (user.idnp === person.idnp) return id;
    return SEED_USER_IDS[person.idnp] || null;
  };

  /* ================================================================ absences */
  const statusOf = (a, day = today()) => (a.from > day ? "future" : a.to && a.to < day ? "past" : "current");
  const absencesOf = (personId) => S.list.filter((a) => a.person === personId);
  const absentOn = (personId, day = today()) => absencesOf(personId).find((a) => statusOf(a, day) === "current") || null;
  const overlapOf = (draft) => absencesOf(draft.person).find((a) => a.id !== draft.id
    && a.from <= (draft.to || "9999-12-31") && draft.from <= (a.to || "9999-12-31")) || null;
  const absenceLine = (a) => `${a.type}, ${periodText(a.from, a.to)}`;
  /* calendar-views-v2 (user 2026-10-26: „the icons are important” — colour is never the only signal): every absence type
     = a tone + a sprite icon, the same in the list's type tag, the profile list, the timeline bar + legend and the
     calendar's absent list. Types = the stories: Concediu anual · Concediu medical · Concediu de maternitate · Delegație
     (US-283…286) + Suspendare (US-314 data model). Sick leave is amber (red = holidays / days off in the calendar). */
  const ABS_TYPES = {
    "Concediu anual": { tone: "brand", icon: "vacation" },
    "Concediu medical": { tone: "warning", icon: "health" },
    "Concediu de maternitate": { tone: "violet", icon: "child" },
    "Delegație": { tone: "success", icon: "suitcase" },
    Suspendare: { tone: "neutral", icon: "pause" }
  };
  /* seeds / session stores written before the story names */
  const LEGACY_TYPES = { Concediu: "Concediu anual" };
  const typeMeta = (type) => ABS_TYPES[type] || { tone: "neutral", icon: "calendar" };
  const typeIcon = (type) => icon(typeMeta(type).icon, "icon small");
  const typeTag = (type) => window.GEAPTag?.html(type, typeMeta(type).tone, { icon: typeMeta(type).icon }) || esc(type);

  /* the dossiers of a specialist (BO seed): the ones under examination = what „Dosarele subdiviziunii” lists and what
     a redistribution moves (US-295 AC-02) — one count everywhere */
  const dossiers = () => A().dossierStore?.()?.runtimeRows || [];
  const openCasesOf = (person) => (person?.specialistId ? dossiers().filter((row) => row.specialist?.id === person.specialistId && row.status === "inExaminare" && !row.nedistribuit && row.subdiviziune === person.subdivision) : []);

  function audit(person, type, detail, status = "Reușit") {
    S.audit.unshift({ at: nowIso(), user: A().currentUserName?.() || "Anastasia Cojocaru", type, status, detail, person: person?.id || "" });
    persist();
  }

  /* ================================================================ distribution settings (US-291) */
  const distOf = (person) => S.dist[person?.id] || { norm: "", normReason: "", start: "", competences: [] };
  const normOf = (person) => { const n = num(distOf(person).norm); return n >= 1 && n <= 100 ? n : 100; };
  /* AC-08: novice = less than 6 months since „Data începerii în distribuire” */
  const noviceMonth = (person, day = caseToday()) => {
    const start = distOf(person).start;
    if (!start || start > day || addMonths(start, 6) <= day) return 0;
    let m = 1;
    while (m < 6 && addMonths(start, m) <= day) m += 1;
    return m;
  };
  /* AC-11: no competences = competent everywhere; a pair without request type = every type of that service */
  const DOSSIER_RT = { Eliberare: "Emitere primară", Duplicat: "Duplicat" };
  const competentFor = (person, row) => {
    const list = distOf(person).competences || [];
    return !list.length || list.some((c) => c.service === row.serviciu && (!c.rt || c.rt === row.tipDosar));
  };

  /* ================================================================ policy (US-289) */
  const FACTORS = [
    ["doc", "Document atașat"], ["docReg", "Document din registru (reducere)"], ["aviz", "Subdiviziune de avizare"],
    ["pj", "Solicitant persoană juridică"], ["foreign", "Solicitant străin"], ["activity", "Fiecare activitate după prima"],
    ["row", "Fiecare rând de tabel după primul"], ["sign", "Fiecare semnătură după prima"], ["level", "Fiecare nivel de aprobare după primul"],
    ["tacit", "Aprobare tacită posibilă (reducere)"], ["min", "Complexitatea minimă a dosarului"]
  ];
  const PARAMS = [
    { key: "competent", label: "Doar competenți", kind: "yn", hint: "Doar specialiștii competenți pentru serviciu și tipul de solicitare." },
    { key: "noTwice", label: "Nu doi la rând", kind: "yn", hint: "Nu două dosare consecutive aceluiași specialist." },
    { key: "window", label: "Fereastra de încărcare (luni)", kind: "int1", hint: "Perioada de calcul a încărcării; număr întreg, cel puțin 1." },
    { key: "maxLoad", label: "Încărcarea maximă (normo-ore)", kind: "pos", hint: "Mai mare decât 0; gol înseamnă fără limită." },
    { key: "coef", label: "Coeficientul tipului de solicitare", kind: "num0", hint: "Înmulțește orele de bază ale serviciului; cel puțin 0." }
  ];
  const authCode = (idOrCode) => String(idOrCode || "").replace(/^aut-/i, "").toUpperCase();
  const filled = (v) => (Array.isArray(v) ? v.some((x) => String(x ?? "").trim() !== "") : String(v ?? "").trim() !== "");
  /* the shape the US-290 passport inherits from (js/e-permits-shell.js › distResolve) */
  const policyFor = (authorityIdOrCode, pol = S.policy) => {
    if (!pol) return null;
    const a = pol.authorities?.[authCode(authorityIdOrCode)] || { base: {}, rt: {} };
    return { geap: pol.geap || {}, geapRt: pol.geapRt || {}, authority: a.base || {}, authorityRt: a.rt || {}, code: authCode(authorityIdOrCode) };
  };
  const LEVEL_TEXT = { autRt: (c, rt) => `autoritatea ${c} · „${rt}”`, aut: (c) => `autoritatea ${c}`, geapRt: (c, rt) => `GEAP · „${rt}”`, geap: () => "GEAP" };
  /* AC-11 / AC-12: per parameter, autoritate + tip → autoritate → GEAP + tip → GEAP */
  const resolve = (pol, { level, authority, rt }, key) => {
    const p = policyFor(authority, pol);
    const chain = [
      ...(level === "aut" && rt ? [["autRt", p.authorityRt[rt]?.[key]]] : []),
      ...(level === "aut" ? [["aut", p.authority[key]]] : []),
      ...(rt ? [["geapRt", p.geapRt[rt]?.[key]]] : []),
      ["geap", p.geap[key]]
    ];
    const hit = chain.find(([, v]) => filled(v));
    return hit ? { level: hit[0], value: hit[1], text: LEVEL_TEXT[hit[0]](p.code, rt) } : { level: null, value: null, text: "" };
  };
  const showValue = (key, value) => {
    if (value == null || !filled(value)) return key === "maxLoad" ? "fără limită" : "necompletat";
    if (key === "ramp") return value.map((x) => `${x || "—"}%`).join(" · ");
    if (key === "competent" || key === "noTwice") return value === "da" ? "Da" : "Nu";
    if (key === "window") return roCount(num(value), "lună", "luni");
    if (key === "maxLoad") return `${value} normo-ore`;
    if (key === "coef") return `× ${value}`;
    return `${value} ore`;
  };

  /* load (US-293 stand-in, US-292 complexity stand-in): Σ complexity of the case's under examination in the window ÷ norm */
  /* dist-actions-v1 (US-325 AC-09): the same sum, kept by factor — the distribution report shows the parts */
  const complexityParts = (row, authority = "ANSP") => {
    const rt = DOSSIER_RT[row.tipDosar] || row.tipDosar;
    const scope = { level: "aut", authority, rt };
    const h = [...String(row.id)].reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 7);
    const get = (k) => num(resolve(S.policy, scope, k).value) || 0;
    const label = (id) => FACTORS.find(([key]) => key === id)?.[1] || id;
    const coef = num(resolve(S.policy, scope, "coef").value) || 1;
    const parts = [
      { label: "Orele de bază × coeficientul tipului de solicitare", qty: 1, unit: 4 * coef, hours: 4 * coef },
      { label: label("doc"), qty: 1 + (h % 4), unit: get("f_doc"), hours: (1 + (h % 4)) * get("f_doc") },
      { label: label("aviz"), qty: (h >> 3) % 2, unit: get("f_aviz"), hours: ((h >> 3) % 2) * get("f_aviz") },
      { label: label("pj"), qty: row.companie ? 1 : 0, unit: get("f_pj"), hours: row.companie ? get("f_pj") : 0 },
      { label: label("docReg"), qty: (h >> 5) % 2, unit: get("f_docReg"), hours: -((h >> 5) % 2) * get("f_docReg") }
    ].filter((part) => part.qty > 0);
    const sum = parts.reduce((s, part) => s + part.hours, 0);
    const floor = get("f_min") || 0.5;
    const total = Math.max(floor, Math.round(sum * 4) / 4);
    return { parts, total, sum, min: total === floor && sum < floor };
  };
  const complexityOf = (row, authority = "ANSP") => complexityParts(row, authority).total;
  const loadOf = (person) => {
    const scope = { level: "aut", authority: person.authority, rt: "" };
    const months = Math.max(1, num(resolve(S.policy, scope, "window").value) || 3);
    const since = addMonths(caseToday(), -months);
    const sum = openCasesOf(person).filter((row) => !row.dataDepunerii || row.dataDepunerii >= since).reduce((s, row) => s + complexityOf(row, person.authority), 0);
    return Math.round((sum / (normOf(person) / 100)) * 10) / 10;
  };

  /* ================================================================ public API (shell hooks) */
  window.GEAPAbsences = {
    load, ready: () => Boolean(S.data), today,
    absentOn: (personId, day) => absentOn(personId, day),
    /* US-295 / US-293 AC-03: the BO team member's subdivision, availability today and norm (shell redistTeam) */
    teamInfo: (specialistId) => {
      const person = personBySpecialist(specialistId);
      if (!person) return null;
      const a = absentOn(person.id);
      return { subdiviziune: person.subdivision, activ: !a, absenta: a ? `${a.type}${a.to ? ` până la ${long(a.to)}` : ", fără dată de sfârșit"}` : "", norma: normOf(person) };
    },
    competent: (specialistId, row) => { const person = personBySpecialist(specialistId); return person ? competentFor(person, row) : true; },
    /* the active specialists of a subdivision left out today because they are absent (redistribution hint) */
    absentNames: (subdivision) => people().filter((p) => p.subdivision === subdivision && p.role === "Specialist" && absentOn(p.id)).map((p) => p.name),
    policyFor, FACTORS,
    /* dist-actions-v1 (US-325): the report's snapshot — complexity by factor, the effective policy (name, version = its
       last change on or before that day, the rule parameters) and „Specialist nou” on that day */
    complexity: (row, authority) => complexityParts(row, authority),
    policyAt: (authority, rt, day) => {
      const code = authCode(authority);
      const scope = { level: "aut", authority: code, rt };
      const changes = (S.policy?.journal || []).map((e) => String(e.at).slice(0, 10)).filter((d) => !day || d <= day).sort();
      return {
        name: `Politica de distribuire ${code}`,
        version: changes.length ? `versiunea din ${long(changes[changes.length - 1])}` : "versiunea inițială",
        params: PARAMS.filter((p) => p.key !== "coef").map((p) => [p.label.replace(/ \(.*\)$/, ""), showValue(p.key, resolve(S.policy, scope, p.key).value)])
      };
    },
    novice: (specialistId, day) => { const person = personBySpecialist(specialistId); return person ? noviceMonth(person, day) > 0 : false; },
    /* calendar-views-v1 (Administrare › Calendar, layer „Absențe”): who may see them, the absences of the people this
       person manages that overlap [from, to] (ISO), and the existing „Modifică absența” dialog */
    canView: () => canAbsences(),
    between: (from, to) => {
      if (!S.data || !canAbsences()) return [];
      const w = who();
      return S.list.filter((a) => a.from <= to && (!a.to || a.to >= from)).map((a) => ({ a, p: personById(a.person) }))
        .filter(({ p }) => p && !p.me && inScope(p, w))
        .map(({ a, p }) => ({ id: a.id, person: p.id, name: p.name, type: a.type, tone: typeMeta(a.type).tone, icon: typeMeta(a.type).icon, from: a.from, to: a.to || "", period: periodText(a.from, a.to) }))
        .sort((x, y) => x.name.localeCompare(y.name, "ro"));
    },
    open: (id) => openAbsence({ id })
  };

  /* ================================================================ dialog (#case-action-modal) */
  let modalClass = "";
  let form = null; // { kind: "absence" | "dist", ... }
  function openModal({ title, subtitle = "", body, footer }) {
    const overlay = document.querySelector("#case-action-modal");
    if (!overlay) return;
    const box = overlay.querySelector(".modal");
    if (!modalClass) modalClass = box.className;
    box.className = `${modalClass} e-permits-abs-modal`;
    overlay.querySelector("[data-case-modal-title]").textContent = title;
    const sub = overlay.querySelector("[data-case-modal-subtitle]");
    sub.textContent = subtitle; sub.hidden = !subtitle;
    overlay.querySelector("[data-case-modal-body]").innerHTML = body;
    overlay.querySelector("[data-case-modal-footer]").innerHTML = footer;
    window.GEAPDatePicker?.init?.(overlay.querySelector("[data-case-modal-body]"));
    if (!overlay.dataset.absBound) {
      overlay.dataset.absBound = "1";
      new MutationObserver(() => {
        if (overlay.getAttribute("aria-hidden") !== "true") return;
        overlay.querySelector(".modal").classList.remove("e-permits-abs-modal");
        form = null;
      }).observe(overlay, { attributes: true, attributeFilter: ["aria-hidden"] });
    }
    if (!overlay.classList.contains("is-active")) window.__modal?.open?.("#case-action-modal");
  }
  const closeModal = () => window.__modal?.close?.("#case-action-modal");
  const fieldError = (msg) => (msg ? `<span class="message message--inline message--error e-permits-fo-field__error">${icon("circle-error-filled", "icon")}<span>${esc(msg)}</span></span>` : "");
  const fieldHint = (text) => (text ? `<p class="e-permits-fo-field__hint">${text}</p>` : "");
  const field = (id, label, control, { span = 12, required = false, error = "", hint = "", labelFor = true } = {}) => `
    <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}" data-abs-wrap="${esc(id)}">
      ${labelFor ? `<label for="${esc(id)}">${esc(label)}${required ? req() : ""}</label>` : `<span class="e-permits-cfg-ro__label">${esc(label)}${required ? req() : ""}</span>`}
      ${control}
      ${error ? fieldError(error) : fieldHint(hint)}
    </div>`;
  const select = (id, attrs, options, value, { placeholder = "", error = false, disabled = false } = {}) => U().renderFoSelectControl?.({
    id, attrs, error, disabled,
    optionsHtml: `${placeholder ? `<option value=""${value ? "" : " selected"} disabled>${esc(placeholder)}</option>` : ""}${options.map(([v, t]) => `<option value="${esc(v)}"${v === value ? " selected" : ""}>${esc(t)}</option>`).join("")}`
  }) || "";
  /* the library date picker in the FO field shell (components.md „Date field in app forms”) */
  const datePicker = (id, value, attrs, { error = false } = {}) => {
    const view = (value || today()).split("-");
    return `
      <div class="date-picker__field" data-date-picker data-type="default" data-locale="ro" data-selected="${esc(value || "")}" data-today="${esc(today())}" data-year="${Number(view[0])}" data-month="${Number(view[1]) - 1}">
        <div class="e-permits-fo-input e-permits-fo-input--with-action${error ? " is-error" : ""}">
          <input id="${esc(id)}" type="text" class="js-date-picker-input" value="${esc(ddmmyyyy(value))}" placeholder="ZZ/LL/AAAA" autocomplete="off" ${attrs}${error ? ' aria-invalid="true"' : ""}>
          <button type="button" class="e-permits-fo-input__icon-button js-date-picker-toggle" aria-label="Alege data" aria-controls="${esc(id)}-panel" aria-expanded="false">${icon("calendar", "icon")}</button>
        </div>
        <div id="${esc(id)}-panel" class="date-picker-panel" aria-hidden="true" hidden>
          <div class="date-picker" role="dialog" aria-label="Alege data">
            <div class="date-picker__header">
              <button class="date-picker__nav js-date-picker-prev" type="button" aria-label="Luna anterioară">${icon("chevron-left", "icon medium")}</button>
              <div class="date-picker__month js-date-picker-label"></div>
              <button class="date-picker__nav js-date-picker-next" type="button" aria-label="Luna următoare">${icon("chevron-right", "icon medium")}</button>
            </div>
            <div class="date-picker__grid date-picker__grid--days" data-view="day">
              <div class="date-picker__weekdays">${["L", "M", "M", "J", "V", "S", "D"].map((d) => `<div class="date-picker__weekday">${d}</div>`).join("")}</div>
              <div class="date-picker__days js-date-picker-days"></div>
            </div>
          </div>
        </div>
      </div>`;
  };
  const readDate = (id) => {
    const input = document.getElementById(id);
    if (!input) return { value: "", bad: false };
    const text = input.value.trim();
    if (!text) return { value: "", bad: false };
    const picked = input.closest("[data-date-picker]")?.dataset.selected || "";
    const value = picked && ddmmyyyy(picked) === text ? picked : parseTyped(text);
    return { value: value || "", bad: !value };
  };
  const textarea = (id, value, attrs, { max = 500, error = false, placeholder = "" } = {}) => `
    <div class="e-permits-fo-textarea${error ? " is-error" : ""}"><textarea id="${esc(id)}" rows="3" placeholder="${esc(placeholder)}" ${attrs}${error ? ' aria-invalid="true"' : ""}>${esc(value || "")}</textarea></div>`;
  const counterLabel = (id, label, value, max) => `
    <div class="e-permits-fo-field__label-counter"><label for="${esc(id)}">${esc(label)}</label><span class="e-permits-fo-field__counter" data-abs-counter="${esc(id)}" aria-live="polite">${String(value || "").length} / ${max}</span></div>`;
  const footer = (saveAttr, label = "Salvează") => `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" ${saveAttr}>${esc(label)}</button></div>`;

  /* ---------------------------------------------------------------- „Adaugă absența” / „Modifică absența” (US-314 / US-315) */
  const scopePeople = () => {
    const w = who();
    return people().filter((p) => !p.me && inScope(p, w)).sort((a, b) => a.name.localeCompare(b.name, "ro"));
  };
  function openAbsence({ id = "", person = "", from = "" } = {}) {
    const a = id ? S.list.find((x) => x.id === id) : null;
    const owner = personById(a?.person || person);
    if (a && !canManage(owner)) return;
    form = {
      kind: "absence", id: a?.id || "", pickPerson: !a && !person,
      v: { person: a?.person || person || "", type: a?.type || "", from: a?.from || from || "", to: a?.to || "", reason: a?.reason || "" },
      errors: {}
    };
    renderAbsence();
  }
  function renderAbsence(focus = "") {
    const f = form;
    const owner = personById(f.v.person);
    const a = f.id ? S.list.find((x) => x.id === f.id) : null;
    const types = (S.data?.absenceTypes || []).map((t) => [t, t]);
    openModal({
      title: f.id ? "Modifică absența" : "Adaugă absența",
      subtitle: f.pickPerson ? "" : owner?.name || "",
      body: `
        ${a ? `<p class="e-permits-passport__lead">Înregistrată de ${esc(a.recordedBy)}, ${esc(long(a.recordedAt))}. Modificarea se aplică doar distribuirilor de după salvare.</p>` : ""}
        <div class="e-permits-user-create__grid">
          ${f.pickPerson ? field("abs-person", "Utilizator", select("abs-person", 'data-abs-field="person"', scopePeople().map((p) => [p.id, `${p.name} · ${p.subdivision}`]), f.v.person, { placeholder: "Alege utilizatorul", error: Boolean(f.errors.person) }), { required: true, error: f.errors.person, hint: `Utilizatorii din ${esc(perimeterText())}.` }) : ""}
          ${field("abs-type", "Tipul absenței", select("abs-type", 'data-abs-field="type"', types, f.v.type, { placeholder: "Alege tipul", error: Boolean(f.errors.type) }), { required: true, error: f.errors.type })}
          ${field("abs-from", "De la", datePicker("abs-from", f.v.from, 'data-abs-date="from"', { error: Boolean(f.errors.from) }), { span: 6, required: true, error: f.errors.from })}
          ${field("abs-to", "Până la", datePicker("abs-to", f.v.to, 'data-abs-date="to"', { error: Boolean(f.errors.to) }), { span: 6, error: f.errors.to, hint: "Gol = fără dată de sfârșit." })}
          <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12" data-abs-wrap="abs-reason">
            ${counterLabel("abs-reason", "Motiv", f.v.reason, 500)}
            ${textarea("abs-reason", f.v.reason, 'data-abs-field="reason"', { error: Boolean(f.errors.reason), placeholder: "De ex. concediu anual de odihnă" })}
            ${f.errors.reason ? fieldError(f.errors.reason) : ""}
          </div>
          <div class="e-permits-user-create__field e-permits-user-create__field--12">
            ${U().renderInfoNote?.("În perioada absenței, utilizatorul nu primește dosare noi la distribuirea automată. Dosarele deschise rămân la el; le puteți delega sau redistribui.") || ""}
          </div>
        </div>`,
      footer: footer("data-abs-save")
    });
    if (focus) requestAnimationFrame(() => focusControl(focus));
  }
  /* a FO select's native <select> is hidden: focus its button (same id) */
  const focusControl = (sel) => { const el = document.querySelector(sel); (el?.matches?.("select[hidden]") ? el.closest("[data-fo-native-select]")?.querySelector("button") : el)?.focus(); };
  function saveAbsence() {
    const f = form;
    const from = readDate("abs-from");
    const to = readDate("abs-to");
    f.v.from = from.value; f.v.to = to.value;
    f.v.type = document.querySelector('#case-action-modal select[data-abs-field="type"]')?.value || f.v.type;
    if (f.pickPerson) f.v.person = document.querySelector('#case-action-modal select[data-abs-field="person"]')?.value || f.v.person;
    f.v.reason = document.getElementById("abs-reason")?.value ?? f.v.reason;
    const e = {};
    if (f.pickPerson && !f.v.person) e.person = "Alegeți utilizatorul.";
    if (!f.v.type) e.type = "Indicați tipul absenței.";
    if (from.bad) e.from = "Introduceți o dată validă (ZZ/LL/AAAA).";
    else if (!f.v.from) e.from = "Indicați data de început a absenței.";
    if (to.bad) e.to = "Introduceți o dată validă (ZZ/LL/AAAA).";
    else if (f.v.to && f.v.from && f.v.to < f.v.from) e.to = "Data de sfârșit nu poate fi anterioară datei de început.";
    if (String(f.v.reason || "").length > 500) e.reason = "Motivul nu poate depăși 500 de caractere.";
    if (!e.from && !e.to && f.v.person && f.v.from) {
      const clash = overlapOf({ id: f.id, person: f.v.person, from: f.v.from, to: f.v.to || null });
      if (clash) e.from = `Utilizatorul are deja o absență în perioada selectată: ${absenceLine(clash)}.`;
    }
    f.errors = e;
    if (Object.keys(e).length) {
      const first = ["person", "type", "from", "to", "reason"].find((k) => e[k]);
      renderAbsence(`#abs-${first}`);
      return;
    }
    const owner = personById(f.v.person);
    if (fails()) {
      audit(owner, f.id ? "Absență modificată" : "Absență adăugată", absenceLine({ type: f.v.type, from: f.v.from, to: f.v.to }), "Eșuat");
      window.GEAPToast?.show({ type: "error", message: `${FAIL}.`, duration: 0, key: "abs-fail" });
      return;
    }
    const rec = { type: f.v.type, from: f.v.from, to: f.v.to || null, reason: String(f.v.reason || "").trim() };
    if (f.id) {
      const a = S.list.find((x) => x.id === f.id);
      const before = absenceLine(a);
      Object.assign(a, rec);
      audit(owner, "Absență modificată", `${owner?.name}: ${before} → ${absenceLine(a)}.`);
    } else {
      const n = S.list.reduce((m, x) => Math.max(m, Number(String(x.id).replace(/\D/g, "")) || 0), 0) + 1;
      S.list.push({ id: `abs-${String(n).padStart(2, "0")}`, person: f.v.person, ...rec, recordedBy: A().currentUserName?.() || "Anastasia Cojocaru", recordedAt: nowIso() });
      audit(owner, "Absență adăugată", `${owner?.name}: ${absenceLine(rec)}.`);
    }
    persist();
    /* the agreed alert: open dossiers stay with the person (AC-14) — offer „Deleagă rol” / „Redistribuie” */
    const open = openCasesOf(owner).length;
    S.notice = open && (!rec.to || rec.to >= today()) ? { person: owner.id, open, abs: absenceLine(rec) } : null;
    closeModal();
    rerenderAll();
    U().showShellToast?.("Absența a fost salvată.");
  }

  function confirmDelete(id) {
    const a = S.list.find((x) => x.id === id);
    const owner = personById(a?.person);
    if (!a || !canManage(owner)) return;
    U().askConfirm?.({
      title: "Sigur doriți să ștergeți absența?",
      text: `${owner.name} · ${absenceLine(a)}. Pentru această perioadă, utilizatorul poate primi din nou dosare noi. Ștergerea rămâne în Jurnalul de audit.`,
      confirmLabel: "Șterge",
      destructive: true
    }, () => {
      if (fails()) {
        audit(owner, "Absență ștearsă", absenceLine(a), "Eșuat");
        window.GEAPToast?.show({ type: "error", message: `${FAIL}.`, duration: 0, key: "abs-fail" });
        return;
      }
      S.list = S.list.filter((x) => x.id !== id);
      if (S.notice?.person === owner.id) S.notice = null;
      audit(owner, "Absență ștearsă", `${owner.name}: ${absenceLine(a)}.`);
      persist();
      rerenderAll();
      U().showShellToast?.("Absența a fost ștearsă.");
    });
  }

  /* ---------------------------------------------------------------- „Setări de distribuire” (US-291) */
  const SERVICES = () => A().dossierStore?.()?.servicii || [];
  const RTS = () => A().dossierStore?.()?.tipDosar || [];
  function openDist(personId) {
    const person = personById(personId);
    if (!person || !canEditDist(person)) return;
    const d = distOf(person);
    form = { kind: "dist", person: person.id, v: { norm: d.norm || "", normReason: d.normReason || "", start: d.start || "", competences: clone(d.competences || []) }, errors: {} };
    renderDist();
  }
  function renderDist(focus = "") {
    const f = form;
    const person = personById(f.person);
    const e = f.errors;
    const rows = f.v.competences.map((c, i) => `
      <li class="e-permits-abs-comp__row" data-abs-comp="${i}">
        ${select(`abs-comp-svc-${i}`, `data-abs-comp-field="service" data-abs-comp-i="${i}" aria-label="Serviciul, competența ${i + 1}"`, SERVICES().map((s) => [s, s]), c.service, { placeholder: "Alege serviciul", error: Boolean(e[`c${i}`]) })}
        ${select(`abs-comp-rt-${i}`, `data-abs-comp-field="rt" data-abs-comp-i="${i}" aria-label="Tipul de solicitare, competența ${i + 1}"`, [["*", "Toate tipurile"], ...RTS().map((t) => [t, t])], c.rt || "*")}
        <button class="btn btn-text-destructive btn-sm btn-icon-only" type="button" aria-label="Elimină competența ${i + 1}" data-tooltip-label="Elimină competența" data-abs-comp-remove="${i}">${icon("delete")}</button>
        ${e[`c${i}`] ? `<div class="e-permits-abs-comp__error">${fieldError(e[`c${i}`])}</div>` : ""}
      </li>`).join("");
    openModal({
      title: "Setări de distribuire",
      subtitle: person?.name || "",
      body: `
        <div class="e-permits-user-create__grid">
          ${field("abs-norm", "Norma de încărcare (%)", `<div class="e-permits-fo-input${e.norm ? " is-error" : ""}"><input id="abs-norm" type="text" inputmode="numeric" maxlength="3" autocomplete="off" placeholder="100" value="${esc(f.v.norm)}" data-abs-dist="norm"${e.norm ? ' aria-invalid="true"' : ""}></div>`, { span: 6, error: e.norm, hint: "Între 1 și 100. Gol = 100%." })}
          ${field("abs-start", "Data începerii în distribuire", datePicker("abs-start", f.v.start, 'data-abs-date="start"', { error: Boolean(e.start) }), { span: 6, error: e.start, hint: "Primele 6 luni, specialistul este tratat ca nou." })}
          <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12" data-abs-wrap="abs-norm-reason">
            <label for="abs-norm-reason">Motivul normei${num(f.v.norm) && num(f.v.norm) < 100 ? req() : ""}</label>
            ${textarea("abs-norm-reason", f.v.normReason, 'data-abs-dist="normReason"', { error: Boolean(e.normReason), placeholder: "De ex. program redus, jumătate de normă" })}
            ${e.normReason ? fieldError(e.normReason) : fieldHint("Obligatoriu când norma este sub 100%.")}
          </div>
          <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12 e-permits-abs-comp">
            <span class="e-permits-cfg-ro__label" id="abs-comp-label">Competențe</span>
            ${rows ? `<div class="e-permits-abs-comp__head" aria-hidden="true"><span>Serviciul</span><span>Tipul de solicitare</span></div><ul class="e-permits-abs-comp__list" role="list" aria-labelledby="abs-comp-label">${rows}</ul>` : ""}
            <div><button class="btn btn-neutral btn-sm" type="button" data-abs-comp-add>${icon("plus-large")}<span>Adaugă competență</span></button></div>
            ${fieldHint(rows ? "Competențele sunt preferințe de distribuire; nu limitează accesul la dosare." : "Fără competențe, specialistul este competent la toate serviciile și tipurile de solicitare.")}
          </div>
        </div>`,
      footer: footer("data-abs-dist-save")
    });
    if (focus) requestAnimationFrame(() => document.querySelector(focus)?.focus());
  }
  const readDistForm = () => {
    const f = form;
    f.v.norm = document.getElementById("abs-norm")?.value.trim() ?? f.v.norm;
    f.v.normReason = document.getElementById("abs-norm-reason")?.value ?? f.v.normReason;
    const start = readDate("abs-start");
    f.v.start = start.value;
    return start;
  };
  function saveDist() {
    const f = form;
    const start = readDistForm();
    const e = {};
    const n = f.v.norm;
    if (n && (!/^\d{1,3}$/.test(n) || Number(n) < 1 || Number(n) > 100)) e.norm = "Introduceți un număr întreg între 1 și 100.";
    else if (n && Number(n) < 100 && !String(f.v.normReason || "").trim()) e.normReason = "Indicați motivul normei sub 100%.";
    if (start.bad) e.start = "Introduceți o dată validă (ZZ/LL/AAAA).";
    const seen = new Set();
    f.v.competences.forEach((c, i) => {
      if (!c.service) { e[`c${i}`] = "Alegeți serviciul."; return; }
      const k = `${c.service}|${c.rt || ""}`;
      if (seen.has(k)) e[`c${i}`] = "Competența există deja.";
      seen.add(k);
    });
    f.errors = e;
    if (Object.keys(e).length) {
      const first = Object.keys(e)[0];
      renderDist(first.startsWith("c") ? `#abs-comp-svc-${first.slice(1)}` : first === "normReason" ? "#abs-norm-reason" : `#abs-${first}`);
      return;
    }
    const person = personById(f.person);
    if (fails()) {
      audit(person, "Setări de distribuire", "Modificare respinsă.", "Eșuat");
      window.GEAPToast?.show({ type: "error", message: `${FAIL}.`, duration: 0, key: "abs-fail" });
      return;
    }
    const before = distOf(person);
    const after = { norm: n && Number(n) === 100 ? "" : n, normReason: n && Number(n) < 100 ? String(f.v.normReason).trim() : "", start: f.v.start, competences: f.v.competences.map((c) => ({ service: c.service, rt: c.rt === "*" ? "" : c.rt || "" })) };
    const compText = (list) => (list.length ? list.map((c) => `${c.service}${c.rt ? ` · ${c.rt}` : ""}`).join("; ") : "toate serviciile");
    const changes = [
      ["Norma de încărcare", `${before.norm || 100}%`, `${after.norm || 100}%`],
      ["Motivul normei", before.normReason || "—", after.normReason || "—"],
      ["Data începerii în distribuire", before.start ? long(before.start) : "—", after.start ? long(after.start) : "—"],
      ["Competențe", compText(before.competences || []), compText(after.competences)]
    ].filter(([, a, b]) => a !== b);
    S.dist[person.id] = after;
    changes.forEach(([label, a, b]) => audit(person, "Setări de distribuire", `${label}: ${a} → ${b}.`));
    persist();
    closeModal();
    rerenderAll();
    U().showShellToast?.(changes.length ? "Setările de distribuire au fost salvate." : "Nu ați modificat nimic.", changes.length ? "success" : "info");
  }

  /* ================================================================ permission per person */
  const canManage = (person) => Boolean(person) && (person.id === "me" || (canAbsences() && inScope(person)));
  const canSeeDist = (person) => Boolean(person) && (person.id === "me" ? who().roleId === "specialist" : canDistribution() && inScope(person));
  /* AC-03: the specialist sees his own data without actions */
  const canEditDist = (person) => Boolean(person) && person.id !== "me" && canDistribution() && inScope(person);

  /* ================================================================ profile tab „Absențe” (US-313) */
  const SORTS = [["from-desc", "De la, cele mai recente"], ["from-asc", "De la, cele mai vechi"], ["to-desc", "Până la, cele mai recente"], ["to-asc", "Până la, cele mai vechi"]];
  const sortState = { key: "from-desc" };
  const sortList = (list, key = sortState.key) => {
    const [field, dir] = key.split("-");
    const v = (a) => (field === "to" ? a.to || "9999-12-31" : a.from);
    return [...list].sort((a, b) => (dir === "asc" ? 1 : -1) * v(a).localeCompare(v(b)) || a.id.localeCompare(b.id));
  };
  const sortMenu = (personId) => {
    const label = SORTS.find(([k]) => k === sortState.key)?.[1] || "";
    const id = `abs-sort-${String(personId).replace(/[^a-z0-9-]/gi, "")}`;
    return `
      <div class="e-permits-stack__menu-wrap e-permits-abs-sort">
        <button class="btn btn-neutral btn-sm" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="${id}" aria-label="Sortează: ${esc(label)}" data-tooltip-label="Sortează" data-stack-menu-trigger>${icon("sort")}<span>${esc(label.split(",")[0])}</span></button>
        <ul class="e-permits-fo-intent-menu e-permits-stack__menu" id="${id}" role="menu" aria-label="Sortează absențele" hidden data-stack-menu>
          ${SORTS.map(([k, t]) => `<li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitem"${k === sortState.key ? ' aria-current="true"' : ""} data-abs-sort="${k}">${icon(k.endsWith("desc") ? "arrow-down" : "arrow-up", "icon")}<span>${esc(t)}</span>${k === sortState.key ? icon("checkmark-small", "icon e-permits-abs-sort__check") : ""}</button></li>`).join("")}
        </ul>
      </div>`;
  };
  function noticeHtml(person, { context }) {
    const n = S.notice;
    if (!n || n.person !== person.id) return "";
    const w = who();
    const canRedistribute = w.supervisor && person.subdivision === w.subdivision;
    const canDelegate = context === "user";
    const actions = [
      canDelegate ? `<button class="btn ${canRedistribute ? "btn-text-strict" : "btn-outline-strict"} btn-md btn-rounded" type="button" data-abs-delegate>Deleagă rol</button>` : "",
      canRedistribute ? `<button class="btn btn-primary btn-md btn-rounded" type="button" data-abs-redistribute="${esc(person.id)}">Redistribuie</button>` : ""
    ].join("");
    const how = canDelegate && canRedistribute ? "Delegați rolul pe perioada absenței sau redistribuiți dosarele."
      : canRedistribute ? "Redistribuiți dosarele pe perioada absenței."
        : canDelegate ? "Delegați rolul pe perioada absenței. Supervizorul subdiviziunii poate redistribui dosarele."
          : "Supervizorul subdiviziunii poate redistribui dosarele.";
    return window.GEAPAlertCard?.html({
      tone: "warning", id: "abs-open-cases", sprite: "assets/icons/sprite.svg", titleTag: "h3",
      title: `${esc(person.name)} are ${esc(roCount(n.open, "dosar deschis", "dosare deschise"))}`,
      text: `Absența (${esc(n.abs)}) nu le mută: dosarele rămân la ${person.id === "me" ? "tine" : "utilizator"}. ${esc(how)}`,
      actions, className: "e-permits-abs-alert"
    }) || "";
  }
  function absItems(person, list, { manage }) {
    return list.map((a) => {
      const st = statusOf(a);
      return {
        plainTitle: `${a.type}, ${periodText(a.from, a.to)}`,
        title: `<span class="e-permits-abs-kind e-permits-abs-kind--${typeMeta(a.type).tone}">${typeIcon(a.type)}${esc(a.type)}</span>`,
        badges: st === "current" ? [tag("În curs", "success")] : st === "future" ? [tag("Planificată", "brand")] : [],
        meta: [esc(periodText(a.from, a.to)), esc(durationText(a.from, a.to, person.authority)), `Înregistrată de ${esc(a.recordedBy)}`],
        meta2: a.reason ? [esc(a.reason)] : [],
        action: manage ? { label: "Editează", attrs: `data-abs-edit="${esc(a.id)}"` } : null,
        menu: manage ? [{ label: "Șterge", icon: "delete", danger: true, attrs: `data-abs-delete="${esc(a.id)}"` }] : []
      };
    });
  }
  function absTabHtml(person, { context = "user" } = {}) {
    if (!S.data) return window.GEAPEmptyState?.render({ title: "Se încarcă absențele…", loading: true }) || "";
    if (!canManage(person)) {
      return window.GEAPEmptyState?.render({ title: DENIED, text: `Rolul tău gestionează absențele utilizatorilor din ${perimeterText()}.`, icon: "lock" }) || DENIED;
    }
    const list = sortList(absencesOf(person.id));
    const add = `<button class="btn btn-secondary btn-sm" type="button" data-abs-add="${esc(person.id)}">${icon("plus-large")}<span>Adaugă absență</span></button>`;
    const counts = { current: list.filter((a) => statusOf(a) === "current").length, future: list.filter((a) => statusOf(a) === "future").length };
    const body = list.length
      ? A().renderStackedList?.("Absențe", [{ label: "", items: absItems(person, list, { manage: true }) }], {
        meta: [counts.current ? "1 în curs" : "", counts.future ? `${counts.future} planificate` : ""].filter(Boolean).join(" · ") || roCount(list.length, "absență", "absențe"),
        actionHtml: `${sortMenu(person.id)}${add}`
      }) || ""
      : `<section class="e-permits-dosar-profil__section"><div class="e-permits-dosar-profil__section-heading"><h2 class="e-permits-dosar-profil__section-title">Absențe</h2></div>${window.GEAPEmptyState?.render({ title: "Utilizatorul nu are absențe înregistrate.", text: "O absență oprește doar dosarele noi din perioada ei; dosarele deschise rămân la utilizator.", icon: "calendar", actionHtml: add }) || ""}</section>`;
    return `<div class="e-permits-abs-tab" data-abs-root="absences" data-abs-person="${esc(person.id)}" data-abs-context="${esc(context)}">${noticeHtml(person, { context })}${body}</div>`;
  }

  /* ================================================================ profile tab „Distribuire” (US-291) */
  function distTabHtml(person, { context = "user" } = {}) {
    if (!S.data) return window.GEAPEmptyState?.render({ title: "Se încarcă datele de distribuire…", loading: true }) || "";
    if (!canSeeDist(person)) return window.GEAPEmptyState?.render({ title: DENIED, text: `Rolul tău gestionează datele de distribuire ale specialiștilor din ${perimeterText()}.`, icon: "lock" }) || DENIED;
    const d = distOf(person);
    const edit = canEditDist(person);
    const nm = noviceMonth(person);
    const ramp = nm ? resolve(S.policy, { level: "aut", authority: person.authority, rt: "" }, "ramp").value || [] : [];
    const a = absentOn(person.id);
    const rows = [
      ["Norma de încărcare", d.norm ? `${esc(d.norm)}%` : `100% <span class="e-permits-abs-muted">· implicit</span>`],
      ["Motivul normei", d.normReason ? esc(d.normReason) : dash],
      ["Data începerii în distribuire", d.start ? esc(long(d.start)) : '<span class="e-permits-abs-muted">Necompletată</span>'],
      ["Specialist nou", nm ? `${tag("Nou", "brand")} <span class="e-permits-abs-muted">luna ${nm} din 6 · +${esc(ramp[nm - 1] ?? "—")}% din încărcarea medie la distribuire</span>` : "Nu"],
      ["Disponibil azi", a ? `${tag("Absent", "accent")} <span class="e-permits-abs-muted">${esc(absenceLine(a))}</span>` : "Da"]
    ];
    const comps = d.competences || [];
    const compList = comps.length
      ? A().renderStackedList?.("Competențe", [{ label: "", items: comps.map((c) => ({ plainTitle: c.service, title: esc(c.service), meta: [esc(c.rt || "Toate tipurile de solicitare")] })) }], { meta: roCount(comps.length, "competență", "competențe") }) || ""
      : `<section class="e-permits-dosar-profil__section"><div class="e-permits-dosar-profil__section-heading"><h2 class="e-permits-dosar-profil__section-title">Competențe</h2></div>${window.GEAPEmptyState?.render({ title: "Competent la toate serviciile", text: "Fără competențe completate, specialistul este competent la toate serviciile și tipurile de solicitare.", icon: "checkmark-large", compact: true }) || ""}</section>`;
    return `
      <div class="e-permits-abs-tab" data-abs-root="distribution" data-abs-person="${esc(person.id)}" data-abs-context="${esc(context)}">
        ${U().renderInfoNote?.(`Distribuirea automată ține cont de normă, de data începerii și de competențe. Competențele sunt preferințe de distribuire: nu limitează accesul la dosare.${edit ? "" : " Datele se modifică de supervizor sau de administrator."}`) || ""}
        ${A().renderPassportBlock?.("Setări de distribuire", rows, { actionHtml: edit ? `<button class="btn btn-neutral btn-sm" type="button" data-abs-dist-edit="${esc(person.id)}">${icon("edit")}<span>Editează</span></button>` : "" }) || ""}
        ${compList}
      </div>`;
  }

  /* a wrapped stacked-list meta line never starts with „·” (the shell's syncStackMetaRows; it observes only its own panels) */
  const syncMeta = () => requestAnimationFrame(() => document.querySelectorAll("[data-abs-root]").forEach((root) => A().syncStackMetaRows?.(root)));
  window.addEventListener("resize", syncMeta);

  /* ---------------------------------------------------------------- shell hooks: user profile tabs + journal */
  window.GEAPShellUserTabs = window.GEAPShellUserTabs || {};
  window.GEAPShellUserTabs.absences = {
    /* AC-01: another person's tab only with the permission */
    hidden: () => !canAbsences(),
    count: (user) => (S.data ? absencesOf(personOfUser(user).id).filter((a) => statusOf(a) !== "past").length || null : null),
    render: (user) => { S.users.set(user.id, user); syncMeta(); return absTabHtml(personOfUser(user), { context: "user" }); }
  };
  window.GEAPShellUserTabs.distribution = {
    hidden: () => !canDistribution(),
    count: () => null,
    render: (user) => { S.users.set(user.id, user); syncMeta(); return distTabHtml(personOfUser(user), { context: "user" }); }
  };
  /* AC-16 / US-315 AC-15 / US-316 AC-09 / US-291 AC-13: the person's absence + distribution changes in its journal */
  window.GEAPShellUserEvents = (user) => {
    const id = personOfUser(user).id;
    return S.audit.filter((e) => e.person === id).map(({ person, ...e }) => e);
  };

  /* ================================================================ „Profilul meu” (US-313 AC-02 / US-291 AC-03) */
  const MY_TABS = () => [
    { id: "absente", label: "Absențe" },
    ...(who().roleId === "specialist" ? [{ id: "distribuire", label: "Distribuire" }] : [])
  ];
  let myTab = "absente";
  function openMyProfile(tab = "absente", { push = true } = {}) {
    load().then(() => {
      const tabs = MY_TABS();
      myTab = tabs.some((t) => t.id === tab) ? tab : tabs[0].id;
      A().setActiveNav?.("");
      document.querySelectorAll("[data-nav-item].is-active").forEach((link) => { link.classList.remove("is-active"); link.removeAttribute("aria-current"); });
      A().openProfilePanel?.();
      renderMyProfile();
      A().writeHash?.(`#profilul-meu/${myTab}`, { push });
      A().els?.dosarProfilPanel?.scrollIntoView?.({ block: "start" });
    });
  }
  const tabsHtml = (tabs, active, attr) => tabs.map((t) => `
    <button id="${attr}-tab-${t.id}" class="tab-button${t.id === active ? " active" : ""}" type="button" role="tab" aria-selected="${t.id === active}" aria-controls="${attr}-panel" tabindex="${t.id === active ? 0 : -1}" data-${attr}-tab="${t.id}">
      <span>${esc(t.label)}</span>${Number.isFinite(t.count) ? A().renderPageHeaderTabCount?.(t.count) || "" : ""}
    </button>`).join("");
  function renderMyProfile() {
    const els = A().els || {};
    const p = me();
    const tabs = MY_TABS().map((t) => (t.id === "absente" ? { ...t, count: absencesOf("me").filter((a) => statusOf(a) !== "past").length || undefined } : t));
    els.dosarProfilTitleRow.innerHTML = A().renderPageHeaderTop?.({ title: p.name, caption: "Profilul meu · datele contului se gestionează în MPass" }) || "";
    els.dosarProfilSummary.innerHTML = A().renderPageHeaderMeta?.([
      ["Rol", tag(p.role, "neutral")],
      ["Subdiviziunea", esc(p.subdivision || "—")],
      ["Autoritatea", esc(p.authority)]
    ]) || "";
    A().watchPageHeaderMeta?.(els.dosarProfilSummary);
    els.dosarProfilTabs.innerHTML = tabsHtml(tabs, myTab, "abs-my");
    els.dosarProfilPanelBody.id = "abs-my-panel";
    els.dosarProfilPanelBody.setAttribute("role", "tabpanel");
    els.dosarProfilPanelBody.setAttribute("aria-labelledby", `abs-my-tab-${myTab}`);
    els.dosarProfilPanelBody.innerHTML = myTab === "distribuire" ? distTabHtml(p, { context: "me" }) : absTabHtml(p, { context: "me" });
    syncMeta();
  }

  /* ================================================================ US-312 registry „Absențe” */
  const ABS_KIND = "absente";
  const absRow = (a) => {
    const p = personById(a.person) || { name: "—", subdivision: "—", authority: "—", role: "" };
    return {
      id: `absr:${a.id}`, absId: a.id, personId: a.person,
      utilizator: p.name, rol: p.role || "", subdiviziune: p.subdivision, autoritate: p.authority,
      tip: a.type, from: a.from, to: a.to || "", motiv: a.reason || "", inregistrat: a.recordedBy, inregistratLa: a.recordedAt,
      status: statusOf(a)
    };
  };
  function absRows() {
    if (!S.data || !canAbsences()) return [];
    const w = who();
    /* „only active users” (Constraints): every seeded person is active */
    return S.list.filter((a) => { const p = personById(a.person); return p && !p.me && inScope(p, w); }).map(absRow);
  }
  function absRegistryDb() {
    if (!S.data) load().then(() => refreshRegistry(ABS_KIND, "absente"));
    const w = who();
    const tabs = [
      { id: "curente", label: "În curs și viitoare", filter: "st:open" },
      { id: "trecute", label: "Trecute", filter: "st:past" },
      { id: "toate", label: "Toate", filter: "st:all" }
    ];
    return {
      kind: ABS_KIND,
      fieldCount: 7,
      defaultSort: "from",
      defaultSortDirection: "asc",
      columns: {
        utilizator: { label: "Utilizator", width: 200, fill: true, sortable: true },
        subdiviziune: { label: "Subdiviziune", width: 160 },
        tip: { label: "Tipul absenței", width: 288 },
        from: { label: "De la", width: 150, sortable: true },
        to: { label: "Până la", width: 150, sortable: true },
        motiv: { label: "Motiv", width: 220, fill: true },
        inregistrat: { label: "Înregistrat de", width: 170 },
        actiuni: { label: "", width: 152, pin: "end" }
      },
      views: {
        [ABS_KIND]: {
          title: w.supervisor ? "Absențele echipei" : "Absențe",
          selectable: false,
          searchPlaceholder: "Caută după numele utilizatorului",
          columns: ["utilizator", "subdiviziune", "tip", "from", "to", "motiv", "inregistrat", "actiuni"],
          tabs,
          defaultTab: "curente",
          primaryAction: canAbsences() && S.data ? { id: "abs-new", label: "Adaugă absență" } : null,
          toolbarLabel: "Filtrare absențe",
          exportLabel: "Exportă CSV"
        }
      },
      runtimeRows: absRows()
    };
  }
  window.GEAPShellRegistries = window.GEAPShellRegistries || {};
  window.GEAPShellRegistries[ABS_KIND] = {
    build: absRegistryDb,
    get facets() {
      const w = who();
      return [
        { key: "tip", label: "Tipul absenței", get: (r) => r.tip },
        { key: "from", label: "Perioadă (De la)", type: "date", get: (r) => r.from },
        ...(w.central ? [{ key: "autoritate", label: "Autoritate", get: (r) => r.autoritate }] : []),
        ...(w.central || w.local ? [{ key: "subdiviziune", label: "Subdiviziune", get: (r) => r.subdiviziune }] : [])
      ];
    },
    /* AC-06: by the user's name */
    searchText: (row) => row.utilizator,
    sortValue: (row, key) => (key === "to" ? row.to || "9999-12-31" : key === "from" ? row.from : String(row[key] ?? "")),
    filterToken: (row, token) => (token === "st:open" ? row.status !== "past" : token === "st:past" ? row.status === "past" : true),
    renderCell: (row, key) => {
      switch (key) {
        case "utilizator": return `
          <div class="e-permits-workplace__case-cell">
            <span data-cell-tooltip="${esc(row.utilizator)}">${esc(row.utilizator)}</span>
            <span class="e-permits-workplace__source"><span>${esc(row.rol)}</span></span>
          </div>`;
        case "subdiviziune": return `<span data-cell-tooltip="${esc(`${row.subdiviziune} · ${row.autoritate}`)}">${esc(row.subdiviziune)}</span>`;
        /* AC-10: the current absence is marked */
        case "tip": return `<span class="e-permits-abs-type">${typeTag(row.tip)}${row.status === "current" ? tag("În curs", "success") : ""}</span>`;
        case "from": return esc(long(row.from));
        /* AC-09: no end date = empty */
        case "to": return row.to ? esc(long(row.to)) : `<span class="e-permits-workplace__dash" aria-label="fără dată de sfârșit">—</span>`;
        case "motiv": return row.motiv ? `<span data-cell-tooltip="${esc(row.motiv)}">${esc(row.motiv)}</span>` : dash;
        case "inregistrat": return `
          <span class="e-permits-workplace__date-stack">
            <span data-cell-tooltip="${esc(row.inregistrat)}">${esc(row.inregistrat)}</span>
            <span class="e-permits-workplace__date-meta">${esc(long(row.inregistratLa))}</span>
          </span>`;
        /* AC-13: edit / delete from the row */
        case "actiuni": return `<span class="e-permits-workplace__row-actions">${(U().renderRowActions?.({
          primary: { label: "Editează", attrs: `data-abs-edit="${esc(row.absId)}"` },
          menu: [{ label: "Șterge", icon: "delete", danger: true, attrs: `data-abs-delete="${esc(row.absId)}"` }],
          label: `${row.utilizator}, ${row.tip}`
        }) || "").replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>")}</span>`;
        default: return esc(String(row[key] ?? "—"));
      }
    },
    rowClass: (row) => (row.status === "past" ? "e-permits-abs-row--past" : ""),
    emptyHtml: ({ query, filtered }) => {
      const E = window.GEAPEmptyState;
      if (!S.data) return E?.render({ title: "Se încarcă absențele…", loading: true, bare: true });
      if (!canAbsences()) return E?.render({ title: DENIED, text: "Lista absențelor este disponibilă rolurilor cu permisiunea de gestionare a absențelor utilizatorilor.", icon: "lock", bare: true });
      if (query || filtered) return E?.render({ title: "Nu există absențe pentru criteriile selectate.", text: "Schimbă căutarea, filtrele sau fila.", icon: "search", bare: true });
      return E?.render({ title: "Nu există absențe pentru criteriile selectate.", text: `Absențele în curs și viitoare din ${perimeterText()} apar aici.`, icon: "calendar", bare: true });
    },
    /* AC-12 / AC-14: the filtered list as CSV + an audit entry (user, filters, rows, time) */
    exportRows: (rows) => {
      A().exportCsv?.("absente.csv", ["Utilizator", "Subdiviziune", "Tipul absenței", "De la", "Până la", "Motiv", "Înregistrat de"],
        rows.map((r) => [r.utilizator, r.subdiviziune, r.tip, ddmmyyyy(r.from), ddmmyyyy(r.to), r.motiv, r.inregistrat]));
      audit(null, "Export listă absențe", `${roCount(rows.length, "rând", "rânduri")} · căutare „${A().workplaceState?.query || ""}”.`);
      U().showShellToast?.(`Lista a fost exportată (${roCount(rows.length, "absență", "absențe")}).`);
    }
  };

  /* ================================================================ calendar-views-v1: „Calendar” (timeline) (US-312, Supervisor) */
  /* A proposal beyond US-312 (the list stays the default view; user-approved 2026-10-26), like Freshteam / Timetastic:
     rows = the team (the list's search applies to the names; „Filtre” keeps only people with a matching absence),
     columns = the days of a month or a week (prev / next, „Azi”), weekends and non-working days (js/working-days.js)
     shaded down every row, one coloured bar per absence (type = colour, legend; tooltip = type + period; click = the
     existing „Modifică absența”). The status tabs are a time filter the timeline replaces: hidden there, „Toate” while
     it shows, the list's tab back on „Listă”. The name column is pinned (js/table-pin-shadow.js draws its edge). */
  const TL = { mode: "list", scale: "", anchor: "", listTab: "" };
  const tlTone = (type) => typeMeta(type).tone;
  const WD_LETTERS = ["D", "L", "M", "M", "J", "V", "S"];
  /* calendar-views-v2: every role with the list (Central = all, Local = its authority, Supervisor = its subdivision) */
  const canTimeline = () => canAbsences();
  const absReg = () => document.querySelector(`[data-workplace][data-registry-kind="${ABS_KIND}"]`);
  const initials = (name) => String(name || "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  /* the window: a calendar month, or Monday … Sunday around the anchor */
  function tlWindow() {
    const anchor = TL.anchor || today();
    const d = dateOf(anchor);
    if (TL.scale === "week") {
      const from = addDays(anchor, -((d.getDay() + 6) % 7));
      return { from, to: addDays(from, 6) };
    }
    const from = iso(new Date(d.getFullYear(), d.getMonth(), 1));
    return { from, to: iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)) };
  }
  const tlTitle = ({ from, to }) => (TL.scale === "week" ? periodText(from, to) : capital(`${MONTHS[dateOf(from).getMonth()]} ${dateOf(from).getFullYear()}`));
  const nonWorking = (day, authority) => {
    const wd = window.GEAPWorkingDays;
    if (typeof wd?.isWorkingDay === "function") return !wd.isWorkingDay(day, authority);
    const g = dateOf(day).getDay();
    return g === 0 || g === 6;
  };
  const holidayName = (day, authority) => {
    const st = window.GEAPWorkingDays?.dayStatus?.(day, authority);
    return st && !st.working && st.exception ? st.exception.reason : "";
  };
  function tlBoardHtml() {
    const w = who();
    const win = tlWindow();
    const days = [];
    for (let day = win.from; day <= win.to; day = addDays(day, 1)) days.push(day);
    const t = today();
    const st = A().workplaceState || {};
    const query = String(st.query || "").trim().toLocaleLowerCase("ro");
    const visible = (A().getVisibleRows?.() || []).filter((r) => r.from <= win.to && (!r.to || r.to >= win.from));
    const filtered = Boolean(document.querySelector("[data-workplace-filter-count]:not([hidden])"));
    const team = scopePeople().filter((p) => (!query || p.name.toLocaleLowerCase("ro").includes(query))
      && (!filtered || (A().getVisibleRows?.() || []).some((r) => r.personId === p.id)));
    const unit = TL.scale === "week" ? "Săptămâna" : "Luna";
    const step = (dir, label, name) => `<button class="btn btn-neutral btn-sm btn-icon-only" type="button" aria-label="${label}" data-abs-tl-step="${dir}" data-abs-tl-focus="step${dir}">${icon(name)}</button>`;
    const legendTypes = (S.data?.absenceTypes || Object.keys(ABS_TYPES));
    const head = `
      <div class="e-permits-abs-tl__bar">
        <div class="e-permits-abs-tl__nav">
          <button class="btn btn-neutral btn-sm" type="button" data-abs-tl-today data-abs-tl-focus="today">Azi</button>
          ${step(-1, `${unit} anterioară`, "chevron-left")}${step(1, `${unit} următoare`, "chevron-right")}
          <h2 class="e-permits-abs-tl__title" id="abs-tl-title">${esc(tlTitle(win))}</h2>
        </div>
        ${window.GEAPViewSwitch?.html({ key: "abs-scale", label: "Perioada afișată", value: TL.scale, items: [["week", "Săptămână"], ["month", "Lună"]], className: "e-permits-abs-tl__scale" }) || ""}
      </div>
      <ul class="e-permits-abs-tl__legend" aria-label="Legendă">
        ${legendTypes.map((type) => `<li><span class="e-permits-abs-tl__swatch e-permits-abs-tl__swatch--${tlTone(type)}" aria-hidden="true">${typeIcon(type)}</span>${esc(type)}</li>`).join("")}
        <li><span class="e-permits-abs-tl__swatch e-permits-abs-tl__swatch--off" aria-hidden="true"></span>Weekend sau zi nelucrătoare</li>
        <li><span class="e-permits-abs-tl__swatch e-permits-abs-tl__swatch--today" aria-hidden="true"></span>Azi</li>
      </ul>`;
    if (!S.data) return `${head}${window.GEAPEmptyState?.render({ title: "Se încarcă absențele…", loading: true, bare: true }) || ""}`;
    if (!team.length) {
      return `${head}${query || filtered
        ? window.GEAPEmptyState?.render({ title: "Nu există absențe pentru criteriile selectate.", text: "Schimbă căutarea sau filtrele.", icon: "search", bare: true }) || ""
        : window.GEAPEmptyState?.render({ title: "Nu există membri în echipă", icon: "people", bare: true }) || ""}`;
    }
    const dayClass = (day) => `${nonWorking(day, w.authority) ? " is-off" : ""}${day === t ? " is-today" : ""}`;
    const headCells = days.map((day) => {
      const d = dateOf(day);
      const holiday = holidayName(day, w.authority);
      return `<th scope="col" class="e-permits-abs-tl__day${dayClass(day)}${holiday ? " is-holiday" : ""}"${holiday ? ` data-tooltip-text="${esc(holiday)}"` : ""} aria-label="${esc(`${long(day)}${holiday ? `, ${holiday}` : ""}`)}">
        <span class="e-permits-abs-tl__wd" aria-hidden="true">${WD_LETTERS[d.getDay()]}</span>
        <span class="e-permits-abs-tl__num" aria-hidden="true">${d.getDate()}</span>
      </th>`;
    }).join("");
    const rowsHtml = team.map((p) => {
      const mine = visible.filter((r) => r.personId === p.id).sort((a, b) => a.from.localeCompare(b.from));
      /* one cell per day (the rows line up with the header: the pinned column keeps its edge); the bar sits in
         its first visible day and spans N columns (--abs-tl-span, set after the render) */
      const cells = days.map((day, i) => {
        const a = mine.find((r) => (r.from === day || (i === 0 && r.from < day)) && (!r.to || r.to >= day));
        if (!a) return `<td class="e-permits-abs-tl__cell${dayClass(day)}"></td>`;
        let span = 1;
        while (i + span < days.length && (!a.to || a.to >= days[i + span])) span += 1;
        const period = periodText(a.from, a.to || "");
        return `<td class="e-permits-abs-tl__cell${dayClass(day)}">
          <button class="e-permits-abs-tl__item e-permits-abs-tl__item--${tlTone(a.tip)}${a.from < win.from ? " is-cut-start" : ""}${!a.to || a.to > win.to ? " is-cut-end" : ""}" type="button" data-abs-span="${span}" data-abs-edit="${esc(a.absId)}" data-abs-tl-focus="bar-${esc(a.absId)}" data-tooltip-text="${esc(`${a.tip} · ${period}`)}" aria-label="${esc(`${p.name}: ${a.tip}, ${period}. Modifică absența`)}"><span>${typeIcon(a.tip)}<span>${esc(a.tip)}</span></span></button>
        </td>`;
      });
      return `<tr>
        <th scope="row" class="e-permits-abs-tl__person">
          <span class="e-permits-abs-tl__who">
            <span class="avatar avatar--xs avatar--initials e-permits-workplace__user-avatar" aria-hidden="true">${esc(initials(p.name))}</span>
            <span class="e-permits-abs-tl__id">
              <span class="e-permits-abs-tl__name" data-cell-tooltip="${esc(p.name)}">${esc(p.name)}</span>
              ${w.supervisor ? "" : `<span class="e-permits-abs-tl__sub" data-cell-tooltip="${esc(`${p.subdivision} · ${p.authority}`)}">${esc(w.central ? `${p.subdivision} · ${p.authority}` : p.subdivision)}</span>`}
            </span>
          </span>
        </th>${cells.join("")}
      </tr>`;
    }).join("");
    return `${head}
      <div class="e-permits-workplace__table-wrap e-permits-abs-tl__scroll">
        <table class="e-permits-abs-tl e-permits-abs-tl--${TL.scale}" aria-labelledby="abs-tl-title">
          <thead><tr><th scope="col" class="e-permits-abs-tl__person e-permits-abs-tl__person--head">Membrul echipei</th>${headCells}</tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>`;
  }
  function renderTimeline() {
    const reg = absReg();
    if (!reg) return;
    reg.dataset.absView = canTimeline() ? TL.mode : "list";
    if (TL.mode !== "timeline" || !canTimeline()) return;
    let board = reg.querySelector("[data-abs-board]");
    if (!board) {
      reg.querySelector(".e-permits-workplace__table-wrap")?.insertAdjacentHTML("afterend", '<section class="e-permits-abs-board" data-abs-board aria-labelledby="abs-tl-title"></section>');
      board = reg.querySelector("[data-abs-board]");
    }
    if (!board) return;
    const focusKey = document.activeElement?.closest?.("[data-abs-board] [data-abs-tl-focus], [data-abs-board] [data-view-value]");
    const key = focusKey?.dataset.absTlFocus ? `[data-abs-tl-focus="${focusKey.dataset.absTlFocus}"]` : focusKey ? `[data-view-value="${focusKey.dataset.viewValue}"]` : "";
    const keepScroll = board.querySelector(".e-permits-abs-tl__scroll")?.scrollLeft || 0;
    board.innerHTML = tlBoardHtml();
    board.querySelectorAll("[data-abs-span]").forEach((bar) => bar.style.setProperty("--abs-tl-span", bar.dataset.absSpan));
    const scroller = board.querySelector(".e-permits-abs-tl__scroll");
    if (scroller) {
      /* a month opens at today's column (or keeps the place) */
      const todayCol = scroller.querySelector("th.is-today");
      scroller.scrollLeft = keepScroll || (todayCol ? Math.max(0, todayCol.offsetLeft - scroller.clientWidth / 2) : 0);
    }
    if (key) board.querySelector(key)?.focus();
  }
  /* the absences toolbar: the switch (Supervisor) + the hidden status tabs while the timeline shows */
  function syncAbsChrome() {
    const reg = document.querySelector("[data-workplace]");
    if (!reg) return;
    /* calendar-views-v9 (user): search → Filtre → the switch, in the toolbar's left group */
    const tools = reg.querySelector("[data-workplace-filter-toggle]");
    if (tools && !reg.querySelector('[data-view-switch="absente"]') && window.GEAPViewSwitch) {
      tools.insertAdjacentHTML("afterend", window.GEAPViewSwitch.html({ key: "absente", label: "Mod de afișare a absențelor", value: TL.mode, items: [["list", "Listă", "list-bullets"], ["timeline", "Calendar", "calendar"]], className: "e-permits-abs-switch" }));
    }
    const sw = reg.querySelector('[data-view-switch="absente"]');
    if (sw) { sw.hidden = !canTimeline(); window.GEAPViewSwitch?.set(sw, TL.mode); }
    if (reg.dataset.registryKind === ABS_KIND) renderTimeline();
  }
  function setTimeline(mode) {
    TL.mode = mode;
    const st = A().workplaceState || {};
    if (mode === "timeline") {
      if (!TL.scale) TL.scale = window.matchMedia("(max-width: 760px)").matches ? "week" : "month";
      TL.listTab = st.tabKey || "curente";
      const all = document.querySelector('[data-workplace-tab="toate"]');
      if (st.tabKey !== "toate" && all) { all.click(); return; } /* the redraw renders the timeline */
    } else if (TL.listTab && st.tabKey !== TL.listTab) {
      const back = TL.listTab;
      TL.listTab = "";
      absReg()?.setAttribute("data-abs-view", "list");
      document.querySelector(`[data-workplace-tab="${back}"]`)?.click();
      return;
    }
    renderTimeline();
  }
  window.GEAPViewSwitch?.on("absente", (value) => setTimeline(value));
  window.GEAPViewSwitch?.on("abs-scale", (value) => { TL.scale = value; renderTimeline(); });
  const tlStep = (dir) => {
    const anchor = TL.anchor || today();
    if (TL.scale === "week") TL.anchor = addDays(anchor, 7 * dir);
    else { const d = dateOf(anchor); TL.anchor = iso(new Date(d.getFullYear(), d.getMonth() + dir, 1)); }
    const scroller = absReg()?.querySelector(".e-permits-abs-tl__scroll");
    if (scroller) scroller.scrollLeft = 0;
    renderTimeline();
  };
  /* every list redraw (search, Filtre, a saved absence) redraws the timeline from the same rows */
  const observeAbsRegistry = () => {
    const reg = document.querySelector("[data-workplace]");
    if (!reg || reg.dataset.absObserved) return;
    reg.dataset.absObserved = "1";
    new MutationObserver(() => { if (reg.dataset.registryKind === ABS_KIND) syncAbsChrome(); }).observe(reg, { attributes: true, attributeFilter: ["data-registry-kind"] });
    const tbody = reg.querySelector("[data-workplace-rows]");
    if (tbody) new MutationObserver(() => { if (reg.dataset.registryKind === ABS_KIND) syncAbsChrome(); }).observe(tbody, { childList: true });
  };

  /* ================================================================ US-294 registry „Încărcarea echipei” */
  const TEAM_KIND = "echipa";
  const canTeam = (w = who()) => !off("echipa") && w.supervisor;
  function teamRows() {
    if (!S.data || !canTeam()) return [];
    const w = who();
    const t = today();
    const maxLoad = num(resolve(S.policy, { level: "aut", authority: w.authority, rt: "" }, "maxLoad").value) || 0;
    return people().filter((p) => !p.me && p.role === "Specialist" && p.subdivision === w.subdivision && p.authority === w.authority).map((p) => {
      const cases = openCasesOf(p);
      const risk = cases.filter((row) => row.termenExaminare && daysUntil(row.termenExaminare, p.authority) <= 3);
      const a = absentOn(p.id, t);
      return {
        id: `team:${p.id}`, personId: p.id, specialist: p.name, absent: Boolean(a), absence: a, novice: noviceMonth(p),
        dosare: cases.length, risc: risk.length, depasite: risk.filter((row) => row.termenExaminare < t).length,
        incarcare: loadOf(p), norma: normOf(p), max: maxLoad
      };
    });
  }
  function teamRegistryDb() {
    if (!S.data) load().then(() => refreshRegistry(TEAM_KIND, "incarcarea-echipei"));
    if (S.data && canTeam()) audit(null, "Deschidere „Încărcarea echipei”", `Subdiviziunea ${who().subdivision}.`);
    return {
      kind: TEAM_KIND,
      fieldCount: 6,
      defaultSort: "specialist",
      defaultSortDirection: "asc",
      columns: {
        specialist: { label: "Specialist", width: 220, fill: true, sortable: true },
        stare: { label: "Stare azi", width: 200 },
        dosare: { label: "Dosare active", width: 168, sortable: true },
        risc: { label: "Termene în risc", width: 156, sortable: true },
        incarcare: { label: "Încărcare", width: 220, sortable: true },
        norma: { label: "Norma", width: 96, sortable: true },
        actiuni: { label: "", width: 56, pin: "end" }
      },
      views: {
        [TEAM_KIND]: {
          title: "Încărcarea echipei",
          selectable: false,
          searchPlaceholder: "Caută specialistul",
          columns: ["specialist", "stare", "dosare", "risc", "incarcare", "norma", "actiuni"],
          toolbarLabel: "Filtrare echipă",
          exportLabel: "Exportă CSV"
        }
      },
      runtimeRows: teamRows()
    };
  }
  const meter = (value, max, label) => {
    const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
    const tone = pct >= 90 ? "danger" : pct >= 70 ? "warning" : "brand";
    return `<span class="e-permits-meter" role="meter" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}" aria-label="${esc(label)}"><svg class="e-permits-meter__svg" aria-hidden="true" focusable="false"><rect class="e-permits-meter__track" x="0" y="0" width="100%" height="100%"></rect><rect class="e-permits-meter__fill e-permits-meter__fill--${tone}" x="0" y="0" width="${pct}%" height="100%"></rect></svg></span>`;
  };
  window.GEAPShellRegistries[TEAM_KIND] = {
    build: teamRegistryDb,
    facets: [
      { key: "stare", label: "Stare azi", get: (r) => (r.absent ? "Absent" : "Disponibil") },
      { key: "nou", label: "Specialist nou", get: (r) => (r.novice ? "Da" : "Nu") }
    ],
    searchText: (row) => row.specialist,
    sortValue: (row, key) => (["dosare", "risc", "incarcare", "norma"].includes(key) ? Number(row[key]) || 0 : String(row[key] ?? "")),
    renderCell: (row, key) => {
      switch (key) {
        /* AC-06: new specialists marked */
        case "specialist": return `<span class="e-permits-abs-type"><span data-cell-tooltip="${esc(row.specialist)}">${esc(row.specialist)}</span>${row.novice ? tag("Nou", "brand", `data-tooltip-text="Specialist nou: luna ${row.novice} din 6 de distribuire"`) : ""}</span>`;
        /* AC-05: absent today, with the absence */
        case "stare": return row.absent
          ? `<span class="e-permits-workplace__date-stack"><span>${tag("Absent", "accent")}</span><span class="e-permits-workplace__date-meta" data-cell-tooltip="${esc(absenceLine(row.absence))}"><span class="e-permits-abs-kind e-permits-abs-kind--${typeMeta(row.absence.type).tone}">${typeIcon(row.absence.type)}${esc(row.absence.type)}</span>${row.absence.to ? ` · până la ${esc(long(row.absence.to))}` : " · fără dată de sfârșit"}</span></span>`
          : '<span class="e-permits-abs-muted">Disponibil</span>';
        /* AC-10: the open dossiers of an absent specialist stand out */
        case "dosare": return row.absent && row.dosare
          ? tag(roCount(row.dosare, "dosar de preluat", "dosare de preluat"), "danger")
          : esc(String(row.dosare));
        case "risc": return row.risc
          ? `<span class="e-permits-workplace__date-stack"><span>${esc(roCount(row.risc, "dosar", "dosare"))}</span><span class="e-permits-workplace__date-meta">${row.depasite ? `${esc(String(row.depasite))} cu termenul depășit` : "termen în ≤ 3 zile"}</span></span>`
          : dash;
        case "incarcare": return `<span class="e-permits-abs-load">${meter(row.incarcare, row.max || Math.max(1, row.incarcare), `Încărcare ${numText(row.incarcare)} normo-ore`)}<span class="e-permits-abs-load__value">${esc(numText(row.incarcare))} h${row.max ? `<span class="e-permits-abs-muted"> / ${esc(numText(row.max))}</span>` : ""}</span></span>`;
        case "norma": return esc(`${row.norma}%`);
        case "actiuni": {
          const p = personById(row.personId);
          const menu = [
            { label: "Vezi dosarele", icon: "page-text", attrs: `data-abs-team-cases="${esc(row.personId)}"` },
            ...(row.dosare ? [{ label: "Redistribuie dosarele", icon: "people", attrs: `data-abs-team-redistribute="${esc(row.personId)}"` }] : []),
            ...(userIdOf(p) ? [{ label: "Vezi absențele", icon: "calendar", attrs: `data-abs-team-absences="${esc(row.personId)}"` }] : [])
          ];
          return `<span class="e-permits-workplace__row-actions">${(U().renderRowActions?.({ menu, label: row.specialist }) || "").replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>")}</span>`;
        }
        default: return esc(String(row[key] ?? "—"));
      }
    },
    /* AC-09: a specialist = his active dossiers */
    openRow: (id) => showCasesOf(String(id).replace(/^team:/, "")),
    rowLabel: (row) => `${row.specialist}${row.absent ? ", absent azi" : ""}${row.novice ? ", specialist nou" : ""} — ${roCount(row.dosare, "dosar activ", "dosare active")}, deschide dosarele`,
    rowClass: (row) => (row.absent ? "e-permits-abs-row--absent" : ""),
    emptyHtml: ({ query, filtered }) => {
      const E = window.GEAPEmptyState;
      if (!S.data) return E?.render({ title: "Se încarcă echipa…", loading: true, bare: true });
      if (!canTeam()) return E?.render({ title: DENIED, text: "„Încărcarea echipei” este disponibilă supervizorului subdiviziunii.", icon: "lock", bare: true });
      if (query || filtered) return E?.noResults?.("Niciun specialist nu corespunde căutării", { text: "Caută după numele specialistului.", bare: true });
      return E?.render({ title: "Nu există specialiști în subdiviziune", icon: "people", bare: true });
    },
    exportRows: (rows) => {
      A().exportCsv?.("incarcarea-echipei.csv", ["Specialist", "Stare azi", "Dosare active", "Termene în risc", "Încărcare (normo-ore)", "Norma (%)"],
        rows.map((r) => [r.specialist, r.absent ? `Absent: ${absenceLine(r.absence)}` : "Disponibil", r.dosare, r.risc, numText(r.incarcare), r.norma]));
      U().showShellToast?.("Lista a fost exportată.");
    }
  };
  /* AC-09 / AC-11 (US-295): the specialist's dossiers in „Dosarele subdiviziunii”, optionally straight into the bulk dialog */
  function showCasesOf(personId, { redistribute = false } = {}) {
    const p = personById(personId);
    if (!p) return;
    A().setRegistryFilters?.("dossiers", { specialist: [p.name] });
    document.querySelector('[data-nav-item][data-nav-id="subdivision-cases"]')?.click();
    if (!redistribute) return;
    setTimeout(() => {
      const all = document.querySelector("[data-workplace-select-all]");
      if (all && !all.checked) all.click();
      setTimeout(() => document.querySelector("[data-workplace-redistribute]:not([hidden])")?.click(), 200);
    }, 300);
  }
  function refreshRegistry(kind, navId) {
    const reg = document.querySelector(`[data-workplace][data-registry-kind="${kind}"]`);
    if (!reg || reg.hidden || reg.closest("[hidden]")) return;
    const nav = document.querySelector(`[data-nav-item][data-nav-id="${navId}"]`);
    if (nav) nav.click();
    else { A().showRegistry?.(window.GEAPShellRegistries[kind].build()); }
  }

  /* ================================================================ US-289 „Setări › Distribuire” */
  const POL = { tab: "parametri", level: "geap", authority: "", rt: "", effAuthority: "", effRt: "", draft: null, errors: {} };
  const polScope = (pol, { level, authority, rt }) => {
    if (level === "geap") {
      if (!rt) return pol.geap || (pol.geap = {});
      pol.geapRt = pol.geapRt || {};
      return pol.geapRt[rt] || (pol.geapRt[rt] = {});
    }
    pol.authorities = pol.authorities || {};
    const a = pol.authorities[authority] || (pol.authorities[authority] = { base: {}, rt: {} });
    if (!rt) return a.base || (a.base = {});
    a.rt = a.rt || {};
    return a.rt[rt] || (a.rt[rt] = {});
  };
  const AUTHORITIES = () => Object.keys(S.policy?.authorities || {}).sort();
  const polEditable = (scope = POL, w = who()) => (scope.level === "geap" ? w.central : (w.central || (w.local && scope.authority === w.authority)));
  const tabsOfPolicy = (w = who()) => (w.supervisor ? [{ id: "efectiva", label: "Politica efectivă" }] : [{ id: "parametri", label: "Parametri" }, { id: "efectiva", label: "Politica efectivă" }, { id: "jurnal", label: "Jurnal de evenimente" }]);
  const paramKeys = () => [...PARAMS.map((p) => p.key), "ramp", ...FACTORS.map(([id]) => `f_${id}`)];
  const labelOf = (key) => (key === "ramp" ? "Rampa novicelui" : PARAMS.find((p) => p.key === key)?.label || FACTORS.find(([id]) => `f_${id}` === key)?.[1] || key);
  const scopeName = ({ level, authority, rt }) => `${level === "geap" ? "GEAP" : authority}${rt ? ` · „${rt}”` : ""}`;
  /* every (scope, key) whose value differs from the saved policy */
  function polChanges() {
    if (!POL.draft) return [];
    const out = [];
    const scopes = [{ level: "geap", authority: "", rt: "" }, ...(S.policy.requestTypes || []).map((rt) => ({ level: "geap", authority: "", rt })),
      ...AUTHORITIES().flatMap((authority) => [{ level: "aut", authority, rt: "" }, ...(S.policy.requestTypes || []).map((rt) => ({ level: "aut", authority, rt }))])];
    const peek = (pol, s) => (s.level === "geap" ? (s.rt ? pol.geapRt?.[s.rt] : pol.geap) : (s.rt ? pol.authorities?.[s.authority]?.rt?.[s.rt] : pol.authorities?.[s.authority]?.base)) || {};
    scopes.forEach((s) => {
      const a = peek(S.policy, s);
      const b = peek(POL.draft, s);
      paramKeys().forEach((k) => {
        const va = filled(a[k]) ? a[k] : null;
        const vb = filled(b[k]) ? b[k] : null;
        if (JSON.stringify(va) !== JSON.stringify(vb)) out.push({ scope: s, key: k, from: va, to: vb });
      });
    });
    return out;
  }
  function openPolicy(tab = "", { push = true } = {}) {
    load().then(() => {
      const w = who();
      const nav = document.querySelector('[data-nav-item][data-nav-id="distribuire"]');
      A().openProfilePanel?.();
      if (nav) A().setActiveNav?.("distribuire");
      if (!canPolicy(w) || !nav) {
        const els = A().els || {};
        els.dosarProfilTitleRow.innerHTML = A().renderPageHeaderTop?.({ title: "Politica de distribuire" }) || "";
        els.dosarProfilSummary.innerHTML = "";
        els.dosarProfilTabs.innerHTML = "";
        els.dosarProfilPanelBody.innerHTML = window.GEAPEmptyState?.render({ title: DENIED, text: "Politica de distribuire este disponibilă rolurilor cu permisiunea de gestionare a politicii de distribuire.", icon: "lock" }) || DENIED;
        return;
      }
      const tabs = tabsOfPolicy(w);
      POL.tab = tabs.some((t) => t.id === tab) ? tab : tabs[0].id;
      if (!POL.draft) POL.draft = clone(S.policy);
      if (w.local) { POL.authority = w.authority; if (!POL.level) POL.level = "aut"; }
      if (!POL.authority) POL.authority = w.central ? "ANSP" : w.authority;
      if (!POL.effAuthority) POL.effAuthority = w.central ? "ANSP" : w.authority;
      if (w.local && POL.level !== "geap") POL.authority = w.authority;
      renderPolicy();
      A().writeHash?.(`#distribuire/${POL.tab}`, { push });
    });
  }
  function renderPolicy(focus = "") {
    const els = A().els || {};
    const w = who();
    const changes = polChanges();
    const dirty = changes.length > 0 && POL.tab === "parametri";
    els.dosarProfilTitleRow.innerHTML = A().renderPageHeaderTop?.({
      title: "Politica de distribuire",
      actions: dirty ? `
        <button class="btn btn-neutral btn-sm" type="button" data-abs-pol-discard>Renunță</button>
        <button class="btn btn-primary btn-sm" type="button" data-abs-pol-save>Salvează</button>` : "",
      status: dirty ? `<span class="e-permits-abs-pol-status">${tag(changes.length === 1 ? "1 modificare nesalvată" : `${changes.length} modificări nesalvate`, "accent")}</span>` : "",
      caption: "Parametrii distribuirii automate · se aplică doar distribuirilor următoare"
    }) || "";
    els.dosarProfilSummary.innerHTML = A().renderPageHeaderMeta?.([
      ["Perimetru", esc(w.central ? "GEAP și toate autoritățile" : w.local ? `Autoritatea ${w.authority} (GEAP doar citire)` : `Subdiviziunea ${w.subdivision} · doar citire`)],
      ["Ultima modificare", esc(S.policy.journal?.[0] ? `${long(S.policy.journal[0].at)} · ${S.policy.journal[0].user}` : "—")]
    ]) || "";
    A().watchPageHeaderMeta?.(els.dosarProfilSummary);
    els.dosarProfilTabs.innerHTML = tabsHtml(tabsOfPolicy(w), POL.tab, "abs-pol");
    els.dosarProfilPanelBody.id = "abs-pol-panel";
    els.dosarProfilPanelBody.setAttribute("role", "tabpanel");
    els.dosarProfilPanelBody.setAttribute("aria-labelledby", `abs-pol-tab-${POL.tab}`);
    els.dosarProfilPanelBody.innerHTML = POL.tab === "jurnal" ? policyJournalHtml() : POL.tab === "efectiva" ? effectiveHtml() : paramsHtml();
    window.GEAPFormRender?.bind?.(els.dosarProfilPanelBody);
    if (focus) requestAnimationFrame(() => document.querySelector(focus)?.focus());
  }
  const polField = (key, label, control, meta, { span = 6, hint = "", err = "" } = {}) => `
    <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}" data-abs-pol-field="${esc(key)}">
      <div class="e-permits-cfg-dp__label"><label for="abs-pol-${esc(key)}">${esc(label)}</label>${meta.tag}</div>
      ${control}
      ${err ? fieldError(err) : `<p class="e-permits-fo-field__hint">${meta.hint}${hint ? `. ${esc(hint)}` : ""}</p>`}
    </div>`;
  const polMeta = (scope, key) => {
    const r = resolve(POL.draft, scope, key);
    const own = r.level === (scope.level === "geap" ? (scope.rt ? "geapRt" : "geap") : (scope.rt ? "autRt" : "aut"));
    const root = scope.level === "geap" && !scope.rt;
    const tagHtml = root ? "" : own ? tag("Suprascris", "brand") : r.level ? tag("Moștenit", "neutral") : tag("Necompletat", "accent");
    const hint = `Valoare efectivă: <strong>${esc(showValue(key, r.value))}</strong>${r.level && !root ? ` — ${own ? "setată aici" : `moștenită din ${esc(r.text)}`}` : ""}`;
    return { tag: tagHtml, hint };
  };
  function paramsHtml() {
    const w = who();
    const scope = { level: POL.level, authority: POL.authority, rt: POL.rt };
    const editable = polEditable(scope, w);
    const own = polScope(clone(POL.draft), scope);
    const ro = editable ? "" : " readonly";
    const err = (k) => POL.errors[k] || "";
    /* the value this scope would inherit if its own field were empty */
    const parentValue = (key) => {
      if (scope.level === "geap" && !scope.rt) return null;
      const draftNoOwn = clone(POL.draft);
      delete polScope(draftNoOwn, scope)[key];
      return resolve(draftNoOwn, scope, key).value;
    };
    const input = (key, inputmode = "decimal", max = 6) => {
      const inherited = parentValue(key);
      return `<div class="e-permits-fo-input${err(key) ? " is-error" : ""}${editable ? "" : " is-filled is-readonly"}"><input id="abs-pol-${esc(key)}" type="text" inputmode="${inputmode}" maxlength="${max}" autocomplete="off" value="${esc(own[key] ?? "")}" placeholder="${esc(inherited != null && filled(inherited) ? `${showValue(key, inherited)} (moștenit)` : key === "maxLoad" ? "Fără limită" : "")}" data-abs-pol="${esc(key)}"${ro}${err(key) ? ' aria-invalid="true"' : ""}></div>`;
    };
    const fields = PARAMS.map((p) => {
      const meta = polMeta(scope, p.key);
      if (p.kind === "yn") {
        const inherited = parentValue(p.key);
        const root = scope.level === "geap" && !scope.rt;
        const opts = [...(root ? [] : [["inherit", `Moștenit (${showValue(p.key, inherited)})`]]), ["da", "Da"], ["nu", "Nu"]];
        return polField(p.key, p.label, select(`abs-pol-${p.key}`, `data-abs-pol="${p.key}"`, opts, own[p.key] || (root ? "da" : "inherit"), { disabled: !editable }), meta, { hint: p.hint });
      }
      return polField(p.key, p.label, input(p.key, p.kind === "int1" ? "numeric" : "decimal"), meta, { hint: p.hint, err: err(p.key) });
    }).join("");
    const rampOwn = own.ramp || ["", "", "", "", "", ""];
    const rampInherited = parentValue("ramp") || [];
    const ramp = polField("ramp", "Rampa novicelui (% din încărcarea plină)", `
      <div class="e-permits-cfg-dp__ramp" role="group" aria-label="Rampa novicelui, lunile 1–6">
        ${[0, 1, 2, 3, 4, 5].map((i) => `
          <div class="e-permits-cfg-dp__ramp-month">
            <span class="e-permits-cfg-dp__ramp-label" aria-hidden="true">Luna ${i + 1}</span>
            <div class="e-permits-fo-input${err("ramp") ? " is-error" : ""}${editable ? "" : " is-filled is-readonly"}"><input id="abs-pol-ramp${i ? `-${i}` : ""}" type="text" inputmode="numeric" maxlength="3" autocomplete="off" value="${esc(rampOwn[i] ?? "")}" placeholder="${esc(rampInherited[i] ?? "")}" data-abs-pol="ramp" data-abs-pol-i="${i}" aria-label="Rampa novicelui, luna ${i + 1} (%)"${ro}></div>
          </div>`).join("")}
      </div>`, polMeta(scope, "ramp"), { span: 12, hint: "Procente între 0 și 100 pentru lunile 1–6 de la data începerii", err: err("ramp") });
    /* two columns, as the passport (US-290): a label + its Small tag stay on one line, so the inputs of a row align */
    const factors = FACTORS.map(([id, label]) => polField(`f_${id}`, label, input(`f_${id}`), polMeta(scope, `f_${id}`), { span: 6, err: err(`f_${id}`) })).join("");
    const authOptions = (w.central ? AUTHORITIES() : [w.authority]).map((c) => [c, c]);
    const overrides = (rt) => {
      const s = polScope(clone(POL.draft), { ...scope, rt });
      return Object.values(s).filter(filled).length;
    };
    const rtOptions = [["*", `Toate tipurile de solicitare`], ...(S.policy.requestTypes || []).map((rt) => [rt, `${rt}${overrides(rt) ? ` · ${roCount(overrides(rt), "parametru suprascris", "parametri suprascriși")}` : ""}`])];
    return `
      <div class="e-permits-abs-pol-lead">
        ${U().renderInfoNote?.("Un câmp gol se moștenește separat, în ordinea: autoritate cu tip de solicitare → autoritate → GEAP cu tip de solicitare → GEAP. Nivelul serviciului se setează în pașaportul serviciului. Modificările se aplică doar distribuirilor următoare; dosarele deja distribuite rămân neschimbate.") || ""}
        ${!editable ? U().renderNotice?.("info", POL.level === "geap" ? "<strong>Nivelul GEAP se editează doar de Administratorul Central.</strong> Îl vezi pentru citire; politica autorității tale se editează la nivelul „Autoritate”." : "<strong>Doar citire.</strong> Politica acestei autorități se editează de administratorii ei.") || "" : ""}
      </div>
      <section class="e-permits-dosar-profil__section">
        <h2 class="e-permits-dosar-profil__section-title">Nivelul politicii</h2>
        <div class="e-permits-ntpl-card e-permits-abs-pol-card">
          <div class="e-permits-user-create__grid">
            <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
              <span class="e-permits-cfg-ro__label" id="abs-pol-level-label">Nivel</span>
              <div class="segmented-control" role="radiogroup" aria-labelledby="abs-pol-level-label">
                ${[["geap", "GEAP"], ["aut", "Autoritate"]].map(([v, t]) => `<button class="segment-item${POL.level === v ? " is-selected" : ""}" type="button" role="radio" aria-checked="${POL.level === v}" tabindex="${POL.level === v ? 0 : -1}" data-abs-pol-level="${v}">${t}</button>`).join("")}
              </div>
            </div>
            ${POL.level === "aut" ? field("abs-pol-authority", "Autoritate", select("abs-pol-authority", "data-abs-pol-authority", authOptions, POL.authority, { disabled: !w.central }), { span: 6, hint: w.central ? "" : "Politica altei autorități nu este accesibilă." }) : ""}
            ${field("abs-pol-rt", "Tip de solicitare", select("abs-pol-rt", "data-abs-pol-rt", rtOptions, POL.rt || "*"), { span: 6, hint: POL.rt ? `Valorile completate aici se aplică doar tipului „${esc(POL.rt)}”.` : "Gol = toate tipurile de solicitare ale nivelului." })}
          </div>
        </div>
      </section>
      <section class="e-permits-dosar-profil__section">
        <h2 class="e-permits-dosar-profil__section-title">Reguli și încărcare</h2>
        <div class="e-permits-ntpl-card e-permits-abs-pol-card"><div class="e-permits-user-create__grid">${fields}${ramp}</div></div>
      </section>
      <section class="e-permits-dosar-profil__section">
        <h2 class="e-permits-dosar-profil__section-title">Orele factorilor de complexitate (normo-ore)</h2>
        <div class="e-permits-ntpl-card e-permits-abs-pol-card"><div class="e-permits-user-create__grid">${factors}</div></div>
      </section>`;
  }
  function effectiveHtml() {
    const w = who();
    const authority = w.central ? POL.effAuthority || "ANSP" : w.authority;
    const scope = { level: "aut", authority, rt: POL.effRt };
    const rows = paramKeys().map((k) => {
      const r = resolve(S.policy, scope, k);
      return [labelOf(k), `<span class="e-permits-abs-eff"><strong>${esc(showValue(k, r.value))}</strong><span class="e-permits-abs-muted">${esc(r.level ? r.text : "nestabilit la niciun nivel")}</span></span>`];
    });
    return `
      <section class="e-permits-dosar-profil__section">
        <h2 class="e-permits-dosar-profil__section-title">Pentru</h2>
        <div class="e-permits-ntpl-card e-permits-abs-pol-card"><div class="e-permits-user-create__grid">
          ${field("abs-eff-authority", "Autoritate", select("abs-eff-authority", "data-abs-eff-authority", (w.central ? AUTHORITIES() : [w.authority]).map((c) => [c, w.supervisor ? `${c} · ${w.subdivision}` : c]), authority, { disabled: !w.central }), { span: 6 })}
          ${field("abs-eff-rt", "Tip de solicitare", select("abs-eff-rt", "data-abs-eff-rt", [["*", "Toate tipurile de solicitare"], ...(S.policy.requestTypes || []).map((rt) => [rt, rt])], POL.effRt || "*"), { span: 6 })}
        </div></div>
      </section>
      ${A().renderPassportBlock?.("Politica efectivă", rows, { meta: "valoarea aplicată · nivelul din care provine" }) || ""}`;
  }
  const policyJournalHtml = () => A().renderEventTimeline?.("Jurnal de evenimente", (S.policy.journal || []).map((e) => ({ at: e.at, user: e.user, type: e.type, status: e.status, detail: e.detail }))) || "";
  function polValidate() {
    const e = {};
    const scope = { level: POL.level, authority: POL.authority, rt: POL.rt };
    const o = polScope(clone(POL.draft), scope);
    const isNum = (s) => /^\d+([.,]\d+)?$/.test(String(s).trim());
    if (filled(o.window) && (!/^\d+$/.test(String(o.window).trim()) || Number(o.window) < 1)) e.window = "Introduceți un număr întreg de luni, cel puțin 1.";
    if (filled(o.maxLoad) && (!isNum(o.maxLoad) || num(o.maxLoad) <= 0)) e.maxLoad = "Introduceți un număr mai mare decât 0.";
    ["coef", ...FACTORS.map(([id]) => `f_${id}`)].forEach((k) => { if (filled(o[k]) && !isNum(o[k])) e[k] = "Introduceți un număr de cel puțin 0."; });
    if (filled(o.ramp)) {
      const vals = o.ramp.map((x) => String(x ?? "").trim());
      if (vals.some((x) => x === "")) e.ramp = "Completați toate cele 6 luni sau lăsați rampa goală (moștenită).";
      else if (vals.some((x) => !/^\d+$/.test(x) || Number(x) > 100)) e.ramp = "Fiecare lună: un procent între 0 și 100.";
    }
    return e;
  }
  function polSave() {
    POL.errors = polValidate();
    if (Object.keys(POL.errors).length) {
      renderPolicy(`#abs-pol-${Object.keys(POL.errors)[0]}`);
      window.GEAPToast?.show({ type: "error", message: "Corectați câmpurile marcate, apoi salvați.", key: "abs-pol-err" });
      return;
    }
    const changes = polChanges();
    if (fails()) {
      window.GEAPToast?.show({ type: "error", message: `${FAIL}.`, duration: 0, key: "abs-fail" });
      return;
    }
    const by = A().currentUserName?.() || "Anastasia Cojocaru";
    const journal = S.policy.journal || [];
    S.policy = clone(POL.draft);
    S.policy.journal = [...changes.map((c) => ({ at: nowIso(), user: by, type: `Modificare politică — ${scopeName(c.scope)}`, status: "Reușit", detail: `${labelOf(c.key)}: ${showValue(c.key, c.from)} → ${showValue(c.key, c.to)}.` })), ...journal];
    POL.draft = clone(S.policy);
    persist();
    renderPolicy();
    U().showShellToast?.(`Politica a fost salvată (${roCount(changes.length, "modificare", "modificări")}). Se aplică distribuirilor următoare.`);
  }
  function polSet(t) {
    const scope = { level: POL.level, authority: POL.authority, rt: POL.rt };
    if (!polEditable(scope)) return;
    const o = polScope(POL.draft, scope);
    const key = t.dataset.absPol;
    if (key === "ramp") {
      const arr = [...(o.ramp || ["", "", "", "", "", ""])];
      t.value = t.value.replace(/\D/g, "").slice(0, 3);
      arr[Number(t.dataset.absPolI)] = t.value;
      if (filled(arr)) o.ramp = arr; else delete o.ramp;
    } else if (t.tagName === "SELECT") {
      if (t.value && t.value !== "inherit") o[key] = t.value; else delete o[key];
    } else {
      t.value = t.value.replace(/[^\d.,]/g, "").slice(0, 6);
      if (t.value) o[key] = t.value; else delete o[key];
    }
    delete POL.errors[key];
    /* the header status + this field's tag / effective value follow without redrawing the form (keeps the caret) */
    const changes = polChanges();
    const els = A().els || {};
    const hadActions = Boolean(els.dosarProfilTitleRow?.querySelector("[data-abs-pol-save]"));
    if (hadActions !== changes.length > 0 || hadActions) {
      const active = document.activeElement?.id;
      const pos = document.activeElement?.selectionStart;
      renderPolicyHeaderOnly(changes);
      if (active) { const el = document.getElementById(active); el?.focus(); if (pos != null && el?.setSelectionRange) el.setSelectionRange(pos, pos); }
    }
    const fieldEl = t.closest("[data-abs-pol-field]");
    if (fieldEl) {
      const meta = polMeta(scope, key);
      const lab = fieldEl.querySelector(".e-permits-cfg-dp__label");
      if (lab) { lab.querySelectorAll(".status-tag").forEach((x) => x.remove()); lab.insertAdjacentHTML("beforeend", meta.tag); }
      const hint = fieldEl.querySelector(".e-permits-fo-field__hint");
      if (hint) hint.innerHTML = meta.hint;
    }
  }
  function renderPolicyHeaderOnly(changes) {
    const els = A().els || {};
    const dirty = changes.length > 0;
    els.dosarProfilTitleRow.innerHTML = A().renderPageHeaderTop?.({
      title: "Politica de distribuire",
      actions: dirty ? `
        <button class="btn btn-neutral btn-sm" type="button" data-abs-pol-discard>Renunță</button>
        <button class="btn btn-primary btn-sm" type="button" data-abs-pol-save>Salvează</button>` : "",
      status: dirty ? `<span class="e-permits-abs-pol-status">${tag(changes.length === 1 ? "1 modificare nesalvată" : `${changes.length} modificări nesalvate`, "accent")}</span>` : "",
      caption: "Parametrii distribuirii automate · se aplică doar distribuirilor următoare"
    }) || "";
  }

  /* ================================================================ redraw what is on screen */
  function rerenderAll() {
    syncMeta();
    document.querySelectorAll("[data-abs-root]").forEach((root) => {
      const person = personById(root.dataset.absPerson) || [...S.users.values()].map(personOfUser).find((p) => p.id === root.dataset.absPerson);
      if (!person) return;
      const ctx = root.dataset.absContext;
      root.outerHTML = root.dataset.absRoot === "distribution" ? distTabHtml(person, { context: ctx }) : absTabHtml(person, { context: ctx });
    });
    /* the profile tab's count */
    const userTab = document.querySelector("#user-profile-tab-absences");
    if (userTab) {
      const user = [...S.users.values()].find((u) => document.querySelector(`[data-abs-person="${personOfUser(u).id}"]`)) || null;
      const n = user ? absencesOf(personOfUser(user).id).filter((a) => statusOf(a) !== "past").length : 0;
      userTab.querySelector(".e-permits-page-header__tab-count")?.remove();
      if (n) userTab.insertAdjacentHTML("beforeend", A().renderPageHeaderTabCount?.(n) || "");
    }
    const myTabBtn = document.querySelector("#abs-my-tab-absente");
    if (myTabBtn) {
      const n = absencesOf("me").filter((a) => statusOf(a) !== "past").length;
      myTabBtn.querySelector(".e-permits-page-header__tab-count")?.remove();
      if (n) myTabBtn.insertAdjacentHTML("beforeend", A().renderPageHeaderTabCount?.(n) || "");
    }
    ["absente", "echipa"].forEach((kind) => {
      const reg = document.querySelector(`[data-workplace][data-registry-kind="${kind}"]`);
      const st = A().workplaceState;
      if (!reg || reg.hidden || reg.closest("[hidden]") || !st) return;
      st.rows = window.GEAPShellRegistries[kind].build().runtimeRows;
      A().renderWorkplace?.();
    });
  }
  function onLoaded() {
    /* a tab or list drawn before the data arrived */
    document.querySelectorAll(".e-permits-user-profile__panel").forEach((panel) => {
      if (!panel.closest("[hidden]") && /^user-profile-panel-(absences|distribution)$/.test(panel.id)) {
        const tabKey = panel.id.replace("user-profile-panel-", "");
        const user = [...S.users.values()].pop();
        if (user) panel.innerHTML = window.GEAPShellUserTabs[tabKey].render(user);
      }
    });
    const tabs = document.querySelector("[data-user-profile-tabs]");
    if (tabs && !tabs.closest("[hidden]")) {
      const user = [...S.users.values()].pop();
      const btn = tabs.querySelector("#user-profile-tab-absences");
      const n = user ? absencesOf(personOfUser(user).id).filter((a) => statusOf(a) !== "past").length : 0;
      if (btn && n && !btn.querySelector(".e-permits-page-header__tab-count")) btn.insertAdjacentHTML("beforeend", A().renderPageHeaderTabCount?.(n) || "");
    }
  }

  /* ================================================================ events */
  document.addEventListener("click", (event) => {
    const t = event.target;
    if (!t.closest) return;
    /* calendar-views-v1: the timeline's period */
    const tlStepBtn = t.closest("[data-abs-tl-step]");
    if (tlStepBtn) { tlStep(Number(tlStepBtn.dataset.absTlStep)); return; }
    if (t.closest("[data-abs-tl-today]")) { TL.anchor = ""; const sc = absReg()?.querySelector(".e-permits-abs-tl__scroll"); if (sc) sc.scrollLeft = 0; renderTimeline(); return; }
    /* the avatar menu „Profilul meu” */
    const my = t.closest("[data-shell-my-profile]");
    if (my) { event.preventDefault(); openMyProfile("absente"); return; }
    const myTabBtn = t.closest("[data-abs-my-tab]");
    if (myTabBtn) { if (myTabBtn.dataset.absMyTab !== myTab) { myTab = myTabBtn.dataset.absMyTab; renderMyProfile(); A().writeHash?.(`#profilul-meu/${myTab}`, { push: false }); document.getElementById(`abs-my-tab-${myTab}`)?.focus(); } return; }
    const polTab = t.closest("[data-abs-pol-tab]");
    if (polTab) { if (polTab.dataset.absPolTab !== POL.tab) { POL.tab = polTab.dataset.absPolTab; renderPolicy(`#abs-pol-tab-${POL.tab}`); A().writeHash?.(`#distribuire/${POL.tab}`, { push: false }); } return; }
    const add = t.closest("[data-abs-add]");
    if (add) { openAbsence({ person: add.dataset.absAdd }); return; }
    if (t.closest('[data-workplace-add-product="abs-new"]')) { openAbsence({}); return; }
    const edit = t.closest("[data-abs-edit]");
    if (edit) { openAbsence({ id: edit.dataset.absEdit }); return; }
    const del = t.closest("[data-abs-delete]");
    if (del) { confirmDelete(del.dataset.absDelete); return; }
    const sort = t.closest("[data-abs-sort]");
    if (sort) {
      sortState.key = sort.dataset.absSort;
      const root = sort.closest("[data-abs-root]");
      const person = root?.dataset.absPerson;
      rerenderAll();
      document.querySelector(`[data-abs-person="${person}"] .e-permits-abs-sort [data-stack-menu-trigger]`)?.focus();
      return;
    }
    if (t.closest("[data-abs-save]")) { saveAbsence(); return; }
    if (t.closest("[data-abs-delegate]")) { document.querySelector("[data-user-profile-delegate]")?.click(); return; }
    const redis = t.closest("[data-abs-redistribute]");
    if (redis) { S.notice = null; showCasesOf(redis.dataset.absRedistribute, { redistribute: true }); return; }
    const distEdit = t.closest("[data-abs-dist-edit]");
    if (distEdit) { openDist(distEdit.dataset.absDistEdit); return; }
    if (t.closest("[data-abs-dist-save]")) { saveDist(); return; }
    if (t.closest("[data-abs-comp-add]")) { readDistForm(); form.v.competences.push({ service: "", rt: "" }); renderDist(`#abs-comp-svc-${form.v.competences.length - 1}`); return; }
    const compRemove = t.closest("[data-abs-comp-remove]");
    if (compRemove) { readDistForm(); form.v.competences.splice(Number(compRemove.dataset.absCompRemove), 1); form.errors = {}; renderDist("[data-abs-comp-add]"); return; }
    const teamCases = t.closest("[data-abs-team-cases]");
    if (teamCases) { showCasesOf(teamCases.dataset.absTeamCases); return; }
    const teamRedis = t.closest("[data-abs-team-redistribute]");
    if (teamRedis) { showCasesOf(teamRedis.dataset.absTeamRedistribute, { redistribute: true }); return; }
    const teamAbs = t.closest("[data-abs-team-absences]");
    if (teamAbs) { const id = userIdOf(personById(teamAbs.dataset.absTeamAbsences)); if (id) window.location.hash = `#utilizator/${id}/absences`; return; }
    const level = t.closest("[data-abs-pol-level]");
    if (level) { POL.level = level.dataset.absPolLevel; if (POL.level === "aut" && who().local) POL.authority = who().authority; POL.errors = {}; renderPolicy(`[data-abs-pol-level="${POL.level}"]`); return; }
    if (t.closest("[data-abs-pol-save]")) { polSave(); return; }
    if (t.closest("[data-abs-pol-discard]")) { POL.draft = clone(S.policy); POL.errors = {}; renderPolicy(); U().showShellToast?.("Modificările au fost anulate.", "info"); return; }
  });
  document.addEventListener("change", (event) => {
    const t = event.target;
    if (!t.closest) return;
    if (t.matches("select[data-abs-field]") && form?.kind === "absence") { form.v[t.dataset.absField] = t.value; delete form.errors[t.dataset.absField]; return; }
    if (t.matches("select[data-abs-comp-field]") && form?.kind === "dist") {
      const c = form.v.competences[Number(t.dataset.absCompI)];
      if (c) c[t.dataset.absCompField] = t.value;
      return;
    }
    if (t.matches("select[data-abs-pol]")) { polSet(t); return; }
    if (t.matches("select[data-abs-pol-authority]")) { POL.authority = t.value; POL.errors = {}; renderPolicy("#abs-pol-authority"); return; }
    if (t.matches("select[data-abs-pol-rt]")) { POL.rt = t.value === "*" ? "" : t.value; POL.errors = {}; renderPolicy("#abs-pol-rt"); return; }
    if (t.matches("select[data-abs-eff-authority]")) { POL.effAuthority = t.value; renderPolicy("#abs-eff-authority"); return; }
    if (t.matches("select[data-abs-eff-rt]")) { POL.effRt = t.value === "*" ? "" : t.value; renderPolicy("#abs-eff-rt"); }
  });
  document.addEventListener("input", (event) => {
    const t = event.target;
    if (!t.closest) return;
    if (t.matches("#abs-reason") && form?.kind === "absence") {
      form.v.reason = t.value;
      const c = document.querySelector('[data-abs-counter="abs-reason"]');
      if (c) { c.textContent = `${t.value.length} / 500`; c.classList.toggle("is-over", t.value.length > 500); }
      return;
    }
    if (t.matches("input[data-abs-pol]")) polSet(t);
  });
  /* profile tabs of the module pages: ← → Home End (the shell does it for its own strips) */
  document.addEventListener("keydown", (event) => {
    const tabBtn = event.target.closest?.("[data-abs-my-tab], [data-abs-pol-tab]");
    if (!tabBtn || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const all = [...tabBtn.parentElement.querySelectorAll("[role='tab']")];
    const i = all.indexOf(tabBtn);
    const next = event.key === "Home" ? all[0] : event.key === "End" ? all[all.length - 1] : all[(i + (event.key === "ArrowRight" ? 1 : -1) + all.length) % all.length];
    event.preventDefault();
    next?.click();
  });
  /* menu items: Setări › Distribuire is a page of this module (the shell writes #distribuire) */
  document.addEventListener("click", (event) => {
    const item = event.target.closest?.("[data-nav-item]");
    if (!item) return;
    if (item.dataset.navId === "distribuire") openPolicy(POL.tab, { push: false });
  });

  /* ================================================================ routes */
  window.GEAPShellRoutes = window.GEAPShellRoutes || [];
  window.GEAPShellRoutes.push((hash) => {
    let m = hash.match(/^#profilul-meu(?:\/([^/]+))?$/);
    if (m) { openMyProfile(m[1] || "absente", { push: false }); return true; }
    m = hash.match(/^#distribuire(?:\/([^/]+))?$/);
    if (m) {
      const nav = document.querySelector('[data-nav-item][data-nav-id="distribuire"]');
      if (nav && !m[1]) return false;
      openPolicy(m[1] || "", { push: false });
      return true;
    }
    /* a role without the menu item that opens the address directly gets the list's no-rights state (AC-01) */
    if (hash === "#absente" && !document.querySelector('[data-nav-item][data-nav-id="absente"]')) { A().showRegistry?.(absRegistryDb()); return true; }
    if (hash === "#incarcarea-echipei" && !document.querySelector('[data-nav-item][data-nav-id="incarcarea-echipei"]')) { A().showRegistry?.(teamRegistryDb()); return true; }
    return false;
  });

  load();
  observeAbsRegistry();
  if (document.querySelector("[data-workplace]")?.dataset.registryKind === ABS_KIND) syncAbsChrome();
  /* for demo states / probes */
  window.GEAPAbsencesUi = { openAbsence, openDist, openMyProfile, openPolicy, showCasesOf, state: S, POL, TL, setTimeline, renderTimeline };
})();
