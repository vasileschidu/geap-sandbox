/* =====================================================================================
   Registre — the Registers module in the BackOffice, phase 1 (registre-v1, 2026-10-23)
   Epic 89620 „Gestionarea Registrelor”: Feature 94524 Registru Dosare (US-194 vizualizare, US-195 Push Case),
   Feature 91139 Registrul actelor permisive (US-196), Feature 94155 Registru note de plată (US-197), Feature 94526
   Registru Avize (US-198), Feature 94525 Registru solicitanți („În curând”: needs a 5th source object in code);
   US-273 tab „Jurnalul evenimentelor” on the record card, US-277 redaction of earlier events at anonymisation.
   Specs: tools/persona-test/specs/registre/*.md (plain copies of the Azure items — never edit Azure).

   ONE generic renderer driven by a register definition (data/registre.json › registers: source object, columns with
   sortable / filter type / visible, predefined filter, row actions with roles, grants) — what the AdminPortal builder
   (US-146…150, phase 2) publishes. It plugs into the BO shell like js/ghiseu.js:
     · window.GEAPShellRegistries[<reg-id>] — each register on the shell's registry engine (search, facet filter from
       the filterable columns, sort, compact pager, pinned first / actions column, export dialog);
     · window.GEAPShellRoutes — #registre (catalog) · #reg-<id> (a register) · #registru/<reg-id>/<record>[/<tab>]
       (the record card, in the shared profile panel: page header + tabs) — and „Acces interzis” for a register
       the role has no grant for (address typed by hand);
     · window.GEAPShellApi — header, details cards, event timeline, stacked lists, row actions, toasts, dossier seed
       (`dossierStore`, the Registru Dosare source = the BO dossiers, so „Deschide dosarul” opens the real profile).
   Perimeter (demo personas = the BO role switcher): Administrator central = everything; Administrator local ANSP =
   every ANSP record; Specialist / Supervizor / Director = their authority + subdivision (acts: authority only, Feature
   91139); Specialist ANTA = ANTA only; Specialist ghișeu = no „Registre” at all.
   Demo switches: ?lipsa=<column> (a source field gone → the column silently absent, AC-08/09),
   ?modificat=<record id> (the record changed in another session → the action is refused, US-194 AC-12),
   ?concurent=1 (Push Case refused: transferred meanwhile, US-195 AC-12), ?registre=gol (empty source).
   State (anonymised / archived / struck records, transfers, added events) lives in localStorage `e-permits-registre-v1`.

   Phase 2 (registre-v2, 2026-10-24) — the AdminPortal builder (js/registre-admin.js, US-146…150, US-193, US-215) writes
   the builder CATALOG (one record per register: names RO / RU / EN, perimeter, position, status, the working config, the
   last PUBLISHED config, the version history, the access grants) into localStorage `e-permits-registre-admin-v1`. This
   file builds the catalog from data/registre.json (the seed's published definitions + `admin`) and turns every record
   that has a published version into the SAME definition shape phase 1 always consumed (`S.data.registers`), so a
   column published in the builder shows in the BO register at once. Grants are `role` (all authorities) or
   `{ role, authority }`; a deprecated register leaves the menu and the catalog, an old link shows a notice.
   ===================================================================================== */
(function () {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const STORE_KEY = "e-permits-registre-v1";
  const DATA_URL = "data/registre.json";
  const REDACTED = "‹redactat›";
  const DENIED = "Acces interzis";

  const A = () => window.GEAPShellApi || {};
  const U = () => window.GEAPUi || {};
  const R = () => window.GEAPFormRender || {};
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (name, size = 20, cls = "icon") => `<svg class="${cls}" width="${size}" height="${size}" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${name}"></use></svg>`;
  const pad = (n) => String(n).padStart(2, "0");
  const RO_MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
  const toDate = (v) => { if (!v) return null; const s = String(v); const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T12:00:00`) : new Date(s); return Number.isNaN(d.getTime()) ? null : d; };
  const longDate = (v) => { const d = toDate(v); return d ? `${d.getDate()} ${RO_MONTHS[d.getMonth()]} ${d.getFullYear()}` : ""; };
  const stamp = (v) => { const d = toDate(v); return d ? `${longDate(v)}, ${pad(d.getHours())}:${pad(d.getMinutes())}` : ""; };
  const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const nowIso = () => isoOf(new Date());
  const dayIso = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const daysUntil = (v, from = null) => { const a = toDate(from) || new Date(); a.setHours(0, 0, 0, 0); const b = toDate(v); if (!b) return 0; b.setHours(0, 0, 0, 0); return Math.round((b - a) / 86400000); };
  /* the dossier seed lives on its own „today” (data/e-permits-workplace.json › today) — Registru Dosare counts
     deadlines from it, as the BO dossier list and profile do */
  const caseToday = () => A().dossierStore?.()?.today || dayIso();
  const plural = (n, one, many) => `${n} ${n === 1 ? one : n % 100 >= 20 || (n % 100 === 0 && n) ? `de ${many}` : many}`;
  const mdl = (n) => `${Number(n).toLocaleString("ro-RO")} MDL`;
  const hashOf = (s) => [...String(s)].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) >>> 0, 7);
  /* dossier seed dates carry no time: a stable working-hours time, as the shell's withDemoTime */
  const demoTime = (value, seed = "") => {
    if (!value || /T\d/.test(String(value))) return value;
    const n = [...String(seed || value)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    return `${value}T${pad(8 + (n % 10))}:${pad((n * 7) % 60)}:00`;
  };
  const tag = (label, tone = "neutral") => window.GEAPTag?.html(label, tone) || esc(label);
  const dash = '<span class="e-permits-workplace__dash">—</span>';
  const userName = () => A().currentUserName?.() || "Anastasia Cojocaru";

  /* ---------------------------------------------------------------- data + store */
  const S = { data: null, loading: null, store: null, saved: {}, card: null, ev: { query: "", filter: "all", sort: "desc" } };
  function readStore() {
    if (S.store) return S.store;
    try { S.store = JSON.parse(window.localStorage.getItem(STORE_KEY) || "null"); } catch { S.store = null; }
    S.store = Object.assign({ anon: {}, archived: {}, struck: {}, patches: {}, events: {}, seq: 40 }, S.store || {});
    return S.store;
  }
  const writeStore = () => { try { window.localStorage.setItem(STORE_KEY, JSON.stringify(S.store)); } catch { /* private mode: session only */ } };
  function load() {
    if (S.data) return Promise.resolve(S.data);
    if (!S.loading) {
      S.loading = fetch(DATA_URL, { cache: "no-store" }).then((r) => r.json()).then((data) => {
        if (params.get("registre") === "gol") { data.acts = []; data.notes = []; data.avize = []; }
        S.data = data;
        S.seedRegisters = data.registers;
        readStore();
        applyCatalog();
        /* the menu follows the catalog (published, granted, not deprecated) — same items as the static menu for the seed */
        A().refreshNav?.();
        return data;
      }).catch((error) => { console.warn(error); S.loading = null; return null; });
    }
    return S.loading;
  }
  const defOf = (id) => S.data?.registers.find((reg) => reg.id === id) || null;

  /* ================================================================ phase 2: the builder catalog (registre-v2) */
  /* the fields each source object offers to the builder — [group, [[key, label, type, width]]]; type decides what a
     column can do: text → sort + text filter · enum → sort + single / multi choice · date → sort + period · number →
     sort only. The Serviciu perimeter adds the service's own fields (display only, US-149 AC-04 / AC-11). */
  const FIELD_CATALOG = {
    Case: [
      ["Dosar", [["nr", "Nr. dosar", "text", 168], ["tip", "Tip solicitare", "enum", 140], ["serviciu", "Serviciu", "enum", 232], ["statut", "Statut dosar", "enum", 152], ["depus", "Data depunerii", "date", 160], ["termen", "Termen de examinare", "date", 176]]],
      ["Solicitant", [["solicitant", "Solicitant", "text", 208], ["companie", "Companie", "text", 208]]],
      ["Responsabil", [["subdiviziune", "Autoritate / Subdiviziune", "enum", 196], ["actor", "Actor responsabil", "enum", 176]]]
    ],
    Permit: [
      ["Act permisiv", [["nr", "Nr. act", "text", 168], ["denumire", "Denumire act", "enum", 264], ["tip", "Tip act", "enum", 140], ["status", "Status", "enum", 144], ["emis", "Data emiterii", "date", 160], ["valabil", "Valabil până la", "date", 168], ["dosar", "Nr. dosar", "text", 160]]],
      ["Beneficiar", [["beneficiar", "Beneficiar", "text", 208]]],
      ["Autoritate", [["autoritate", "Autoritate emitentă", "enum", 168]]]
    ],
    Invoice: [
      ["Nota de plată", [["nr", "Nr. notă de plată", "text", 176], ["referinta", "Dosar / Act permisiv", "text", 176], ["serviciu", "Serviciu", "enum", 224], ["suma", "Sumă", "number", 136], ["statutNota", "Statut notă", "enum", 152], ["emisa", "Data emiterii", "date", 160], ["termen", "Termen de achitare", "date", 168], ["confirmatDe", "Confirmat de", "enum", 168]]],
      ["Plătitor", [["solicitant", "Solicitant", "text", 200]]],
      ["Tranzacția MPay", [["statutMpay", "Tranzacție MPay", "enum", 176], ["metoda", "Metodă de plată", "enum", 160], ["mpay", "Nr. MPay", "text", 160]]],
      ["Autoritate", [["autoritate", "Autoritate / Subdiviziune", "enum", 196]]]
    ],
    Expertise: [
      ["Aviz", [["nr", "Nr. aviz", "text", 160], ["tip", "Tip aviz", "enum", 232], ["statut", "Statut aviz", "enum", 140], ["emis", "Data emiterii", "date", 160], ["valabil", "Valabil până la", "date", 168]]],
      ["Dosar", [["dosar", "Dosar", "text", 160], ["solicitant", "Solicitant", "text", 192]]],
      ["Autoritate", [["autoritate", "Autoritate / Subdiviziune", "enum", 196]]]
    ]
  };
  /* the service's own request fields (Feature 90575 passport) — display only; values follow the record */
  const SERVICE_FIELDS = {
    "003000118": [
      ["svc:activitate", "Tipul activității", ["Alimentație publică", "Comerț cu produse alimentare", "Prestări servicii de înfrumusețare", "Instituție de învățământ preșcolar"], 220],
      ["svc:suprafata", "Suprafața încăperilor", (h) => `${40 + (h % 580)} m²`, 160],
      ["svc:capacitate", "Capacitatea", (h) => `${12 + (h % 168)} locuri`, 136]
    ],
    "003000519": [
      ["svc:produs", "Denumirea produsului biocid", ["Dezinfectant pentru suprafețe", "Insecticid de uz casnic", "Raticid granulat"], 220],
      ["svc:substanta", "Substanța activă", ["Clorură de benzalconiu", "Permetrină", "Bromadiolonă"], 180]
    ]
  };
  const OBJECTS = { Case: { label: "Dosare", code: "Case" }, Permit: { label: "Acte permisive", code: "Permit" }, Invoice: { label: "Note de plată", code: "PaymentOrder" }, Expertise: { label: "Avize", code: "Expertise" } };
  const SCOPES = { Global: { label: "Global", code: "Global" }, Authority: { label: "Autoritate", code: "Authority" }, Service: { label: "Serviciu", code: "Service" } };
  const FIELD_TYPES = { text: "Text", enum: "Listă de valori", date: "Dată", number: "Număr", svc: "Câmp al serviciului" };
  const FILTER_SUPPORT = { text: ["text"], enum: ["single", "multi"], date: ["date"], number: [], svc: [] };
  const serviceOf = (code) => (S.data?.admin?.services || []).find((s) => s.code === code) || null;
  function fieldsOf(object, serviceCode = null) {
    const list = (FIELD_CATALOG[object] || []).flatMap(([group, fields]) => fields.map(([key, label, type, width]) => ({ key, label, type, width, group })));
    const own = object === "Case" && serviceCode ? (SERVICE_FIELDS[serviceCode] || []).map(([key, label, values, width]) => ({ key, label, type: "svc", width, group: "Câmpuri ale serviciului", values })) : [];
    return [...list, ...own];
  }
  const fieldOf = (object, key, serviceCode = null) => fieldsOf(object, serviceCode).find((f) => f.key === key) || null;
  /* a new column from a source field: the type's natural sort / filter, visible */
  const columnFrom = (field) => ({
    key: field.key, label: field.label, labels: { ru: "", en: "" }, width: field.width || 160, align: field.type === "number" ? "right" : "left",
    visible: true, sortable: field.type !== "svc", filter: { text: "text", enum: "multi", date: "date" }[field.type] || null
  });
  const svcValue = (row, key) => {
    const field = Object.values(SERVICE_FIELDS).flat().find(([k]) => k === key);
    if (!field) return "";
    const h = hashOf(`${row.id}:${key}`);
    return typeof field[2] === "function" ? field[2](h) : field[2][h % field[2].length];
  };
  const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
  const CATALOG_KEY = "e-permits-registre-admin-v1";
  /* RU / EN headers of the seeded Registru Dosare (v1.1.3 „Antetele RU și EN pentru toate coloanele”) */
  const HEADERS_RU_EN = {
    nr: ["№ дела", "Case no."], solicitant: ["Заявитель", "Applicant"], serviciu: ["Услуга", "Service"], subdiviziune: ["Орган / Подразделение", "Authority / Unit"],
    statut: ["Статус дела", "Case status"], actor: ["Ответственный", "Assignee"], depus: ["Дата подачи", "Submitted on"], termen: ["Срок рассмотрения", "Review deadline"], tip: ["Тип заявки", "Request type"]
  };
  /* phase-1 rule {field, op: ≠ | =, value: code} → the builder's {column, op, value: label} (AC-13 operators + „nu este”) */
  const convertFilter = (pf) => {
    if (!pf) return null;
    if (pf.rules?.every((r) => r.column)) return { label: pf.label || "", logic: pf.logic || "and", rules: pf.rules };
    return {
      label: pf.label || "",
      logic: "and",
      rules: (pf.rules || []).map((r) => (r.field === "status"
        ? { column: "statut", op: r.op === "≠" ? "isNot" : "is", value: dossierStatuses()[r.value]?.label || (r.value === "schita" ? "Schiță" : r.value) }
        : { column: r.field, op: r.op === "≠" ? "isNot" : "is", value: r.value }))
    };
  };
  const configFromDef = (def, withHeaders = false) => ({
    columns: def.columns.map((c) => ({ ...c, labels: { ru: withHeaders ? HEADERS_RU_EN[c.key]?.[0] || "" : "", en: withHeaders ? HEADERS_RU_EN[c.key]?.[1] || "" : "" } })),
    predefinedFilter: convertFilter(def.predefinedFilter),
    actions: (def.actions || []).map((a) => ({ ...a, labels: { ru: "", en: "" }, target: a.control || a.form || a.process || "" })),
    defaultSort: def.defaultSort || null,
    exportNeedsCriteria: Boolean(def.exportNeedsCriteria)
  });
  /* an older version = the config without the columns / actions added later (seed history) */
  const snapshot = (config, drop = {}) => ({
    ...clone(config),
    columns: config.columns.filter((c) => !(drop.columns || []).includes(c.key)).map(clone),
    actions: config.actions.filter((a) => !(drop.actions || []).includes(a.key)).map(clone)
  });
  function buildCatalog(data) {
    const adm = data.admin || {};
    const seed = (S.seedRegisters || data.registers).filter((def) => !def.soon);
    const records = seed.map((def) => {
      const meta = adm.registers?.[def.id] || {};
      const config = configFromDef(def, def.id === "reg-dosare");
      return {
        id: def.id, code: def.code, object: def.object, scope: "Global", authority: null, service: null, parent: null,
        names: { ro: def.name, ru: meta.names?.ru || "", en: meta.names?.en || "" }, description: def.description || "",
        position: def.position || 0, category: def.category, icon: def.icon,
        status: def.status === "Publicat" ? "Publicat" : def.status, version: def.version, publishedVersion: def.version, unpublished: false,
        config, published: clone(config), publishedAt: def.publishedAt,
        createdAt: meta.createdAt || def.publishedAt, createdBy: meta.createdBy || "Anastasia Cojocaru",
        editedAt: meta.editedAt || def.publishedAt, editedBy: meta.editedBy || "Anastasia Cojocaru",
        versions: (meta.versions || []).map((v, i) => ({ nr: i + 1, version: v.version, type: v.type, note: v.note, at: v.at, by: v.by, config: snapshot(config, v.drop) })),
        grants: (meta.grants || def.grants.map((role) => ({ role, authority: null, at: def.publishedAt, by: "Anastasia Cojocaru" }))).map((g, i) => ({ id: `${def.id}-g${i + 1}`, ...g })),
        events: []
      };
    });
    (adm.extra || []).forEach((x) => {
      const base = (id) => records.find((r) => r.id === id);
      const c = x.config || {};
      let columns = c.copyColumnsOf ? base(c.copyColumnsOf).config.columns.map(clone) : (c.columns || []).map((key) => columnFrom(fieldOf(x.object, key, x.service)));
      if (c.dropColumns) columns = columns.filter((col) => !c.dropColumns.includes(col.key));
      const config = {
        columns,
        predefinedFilter: c.predefinedFilter ? { label: "", ...clone(c.predefinedFilter) } : null,
        actions: c.copyActionsOf ? base(c.copyActionsOf).config.actions.map(clone) : [],
        defaultSort: c.copyColumnsOf ? clone(base(c.copyColumnsOf).config.defaultSort) : null,
        exportNeedsCriteria: false
      };
      const published = x.publishedVersion ? { ...clone(config), columns: config.columns.filter((col) => !(x.published?.dropColumns || []).includes(col.key)) } : null;
      records.push({
        id: x.id, code: x.code, object: x.object, scope: x.scope, authority: x.authority, service: x.service, parent: x.parent,
        names: { ru: "", en: "", ...x.names }, description: x.description, position: x.position, category: adm.categories?.[x.object] || "", icon: OBJECT_ICON[x.object],
        status: x.status, version: x.version, publishedVersion: x.publishedVersion, unpublished: Boolean(x.unpublished),
        config, published, publishedAt: x.versions?.[x.versions.length - 1]?.at || null,
        createdAt: x.createdAt, createdBy: x.createdBy, editedAt: x.editedAt, editedBy: x.editedBy,
        versions: (x.versions || []).map((v, i) => ({ nr: i + 1, version: v.version, type: v.type, note: v.note, at: v.at, by: v.by, config: clone(published || config) })),
        grants: (x.grants || []).map((g, i) => ({ id: `${x.id}-g${i + 1}`, ...g })),
        events: []
      });
    });
    return { records, seq: 100, audit: [] };
  }
  const OBJECT_ICON = { Case: "document", Permit: "permission", Invoice: "receipt-bill", Expertise: "stamp" };
  /* the name of a row action's target (a Form Designer form, a process, a control) */
  const targetLabel = (a) => {
    const t = S.data?.admin?.targets || {};
    const id = a.form || a.process || a.control || a.target;
    return [...(t.forms || []), ...(t.processes || []), ...(t.controls || [])].find((x) => x.id === id)?.label || id || a.label;
  };
  function catalog() {
    if (S.catalog) return S.catalog;
    if (!S.data) return null;
    let stored = null;
    try { stored = JSON.parse(window.localStorage.getItem(CATALOG_KEY) || "null"); } catch { stored = null; }
    S.catalog = stored?.records ? stored : buildCatalog(S.data);
    return S.catalog;
  }
  const recordOf = (id) => catalog()?.records.find((r) => r.id === id) || null;
  /* the published definition of a record = what phase 1 renders (same shape as data/registre.json › registers) */
  const activeGrants = (rec) => rec.grants.filter((g) => !g.revokedAt).map((g) => (g.authority ? { role: g.role, authority: g.authority } : g.role));
  function boDefOf(rec) {
    if (!rec.published) return null;
    const p = rec.published;
    return {
      id: rec.id, code: rec.code, name: rec.names.ro, object: rec.object, objectLabel: OBJECTS[rec.object]?.label || rec.object,
      scope: rec.scope, authority: rec.authority || null, service: rec.service || null, category: rec.category, icon: rec.icon,
      version: rec.publishedVersion, status: rec.status, publishedAt: rec.publishedAt, description: rec.description, position: rec.position,
      deprecated: rec.status === "Depreciat", deprecatedAt: rec.deprecatedAt || rec.editedAt,
      grants: activeGrants(rec),
      predefinedFilter: clone(p.predefinedFilter), exportNeedsCriteria: Boolean(p.exportNeedsCriteria), defaultSort: clone(p.defaultSort),
      columns: p.columns.map(({ labels, ...c }) => ({ ...c })),
      actions: p.actions.map(({ labels, target, ...a }) => {
        const control = a.type === "custom" ? target || a.control : undefined;
        return {
          ...a, control,
          form: a.type === "form" ? target : undefined,
          process: /^process/.test(a.type) ? target : undefined,
          danger: Boolean(a.danger || (S.data?.admin?.targets?.controls || []).find((c) => c.id === control)?.danger),
          permission: control === "PushCase" ? "Cases.Case.Push" : undefined
        };
      })
    };
  }
  const SCOPE_ORDER = { Global: 0, Authority: 1, Service: 2 };
  function applyCatalog() {
    const cat = catalog();
    if (!cat) return;
    const soon = (S.seedRegisters || []).filter((def) => def.soon);
    S.data.registers = [
      ...cat.records.map(boDefOf).filter(Boolean).sort((a, b) => (SCOPE_ORDER[a.scope] - SCOPE_ORDER[b.scope]) || (a.position - b.position)),
      ...soon
    ];
    S.data.registers.filter((def) => !def.soon).forEach((def) => registerRegistry(def.id));
  }
  /* the builder calls this after every change: save, rebuild the BO definitions, redraw the menu and an open register */
  function commit() {
    try { window.localStorage.setItem(CATALOG_KEY, JSON.stringify(S.catalog)); } catch { /* private mode: session only */ }
    applyCatalog();
    A().refreshNav?.();
    const open = document.querySelector("[data-workplace][data-registry-kind^='reg-']");
    if (open && !open.closest("[hidden]")) refresh(open.dataset.registryKind);
  }

  /* the AdminPortal permissions of the signed-in role (Feature 94523: grupul „Registre” al ecranului «Roluri») —
     read from the role on the Roles screen; ?fara=publicare,istoric… removes some for a demo */
  const PERMISSIONS = { view: "rg1", create: "rg2", edit: "rg3", publish: "rg4", deprecate: "rg5", history: "rg6", restore: "rg7", exportVersion: "rg8", access: "rg9" };
  const PERM_PARAM = { vizualizare: "view", creare: "create", editare: "edit", publicare: "publish", depreciere: "deprecate", istoric: "history", restaurare: "restore", exportversiune: "exportVersion", acces: "access" };
  function adminPerms(who = persona()) {
    const fns = A().roleFunctions?.(who.roleLabel);
    const off = (params.get("fara") || "").split(",").map((k) => PERM_PARAM[k.trim()]).filter(Boolean);
    /* before the Roles data arrives: the two administrator roles carry the whole group (the seed) */
    const has = (id) => (fns ? fns.includes(id) : ["central-admin", "local-admin"].includes(who.roleId));
    return new Set(Object.entries(PERMISSIONS).filter(([key, id]) => has(id) && !off.includes(key)).map(([key]) => key));
  }
  /* AdminPortal perimeter: the central administrator sees every register; a local one only the registers of its own
     authority and of that authority's services — never the global ones (US-146 AC-12, US-147 AC-04 / AC-21) */
  const adminSees = (rec, who = persona()) => who.all || (rec.scope !== "Global" && rec.authority === who.authority);
  const authorityOf = (code) => S.data?.authorities.find((a) => a.code === code) || { code, name: code };

  /* ---------------------------------------------------------------- who is looking (role + perimeter) */
  /* RBAC functions per BO role (Feature 89940): Registers.Viewer.Export (export), Audit.Journal.View (US-273 tab),
     Cases.Case.Push (US-195) — the row actions carry their own role list in the definition */
  const PERMS = {
    "central-admin": ["export", "journal", "push"],
    "local-admin": ["export", "journal"],
    director: ["export", "journal"],
    supervisor: ["export"],
    specialist: []
  };
  function persona() {
    const a = A().currentAssignment?.() || null;
    const roleId = a?.roleId || "";
    const authority = /^anta-/.test(a?.id || "") ? "ANTA" : "ANSP";
    const local = ["specialist", "supervisor", "director"].includes(roleId);
    const subdivision = !local ? null : authority === "ANTA" ? "Oficiul Chișinău" : a?.instanceLabel || "CSP Chișinău";
    return {
      id: a?.id || "",
      roleId,
      roleLabel: a?.roleLabel || "",
      all: roleId === "central-admin",
      authority: roleId === "central-admin" ? null : authority,
      subdivision,
      can: (perm) => (PERMS[roleId] || []).includes(perm)
    };
  }
  /* Register Grant (US-215): a role id = every authority; { role, authority } = that authority only; a deprecated
     register is out of the BO for everyone (US-193 AC-04) */
  const grantMatches = (g, who) => (typeof g === "string" ? g === who.roleId : g.role === who.roleId && (!g.authority || who.all || g.authority === who.authority));
  const granted = (def, who = persona()) => Boolean(def && !def.soon && !def.deprecated && (def.grants || []).some((g) => grantMatches(g, who)));
  /* perimeter: the authority (+ subdivision when the record has one and the role is local) */
  const inPerimeter = (who, authority, subdivision, { authorityOnly = false } = {}) => {
    if (who.all) return true;
    if (who.authority !== authority) return false;
    return authorityOnly || !who.subdivision || !subdivision || who.subdivision === subdivision;
  };
  const perimeterText = (who, { authorityOnly = false } = {}) => (who.all
    ? "toate autoritățile"
    : `${who.authority}${!authorityOnly && who.subdivision ? ` · ${who.subdivision}` : ""}`);

  /* ---------------------------------------------------------------- the dossier process (US-195) */
  /* the frozen process version of every seeded dossier: human and final steps can be push targets; server / hybrid
     steps, decision branches and steps that start a subprocess cannot (AC-03) */
  const PROCESS = { name: "Flux standard de autorizare", version: "v3.2.0" };
  const STEPS = [
    { id: "inregistrare", name: "Recepționare și înregistrare", kind: "human", status: "depus", role: "Specialist ghișeu", term: 1 },
    { id: "nota", name: "Generarea notei de plată", kind: "server" },
    { id: "plata", name: "Așteptarea achitării", kind: "human", status: "asteaptaPlata", role: "Specialist", term: 10 },
    { id: "examinare", name: "Examinarea dosarului", kind: "human", status: "inExaminare", role: "Specialist", term: 10 },
    { id: "avizare", name: "Avizare", kind: "subprocess" },
    { id: "decizie", name: "Decizia de examinare", kind: "decision" },
    { id: "coordonare", name: "Coordonarea deciziei", kind: "human", status: "spreCoordonare", role: "Supervizor", term: 3 },
    { id: "semnare", name: "Semnarea actului", kind: "human", status: "spreSemnare", role: "Director", term: 2 },
    { id: "emitere", name: "Emiterea actului în MDocs", kind: "server" },
    { id: "eliberat", name: "Act eliberat", kind: "final", status: "eliberat" },
    { id: "respins", name: "Dosar respins", kind: "final", status: "respins" }
  ];
  const STATUS_STEP = { depus: "inregistrare", asteaptaPlata: "plata", inExaminare: "examinare", spreCoordonare: "coordonare", spreSemnare: "semnare", semnat: "semnare", eliberat: "eliberat", respins: "respins", arhivat: "eliberat" };
  const FINAL = ["eliberat", "respins", "arhivat"];
  const ROLES = ["Specialist", "Supervizor", "Director", "Specialist ghișeu", "Expert"];
  const stepOf = (id) => STEPS.find((s) => s.id === id);

  /* ---------------------------------------------------------------- source objects → register rows */
  const dossierStatuses = () => A().dossierStore?.()?.statuses || {};
  /* every stored module change is re-applied to the shell's dossier rows (they are rebuilt on reload) */
  function applyPatches(src) {
    const st = readStore();
    (src || []).forEach((row) => {
      const patch = st.patches[row.id];
      if (patch && !row.__regPatched) {
        Object.assign(row, patch);
        row.profil = null;
        row.__regPatched = true;
      }
    });
    return src;
  }
  const anonOf = (kind, id) => readStore().anon[`${kind}:${id}`] || null;
  const SOURCES = {
    Case: () => applyPatches(A().dossierStore?.()?.runtimeRows || []).filter(() => params.get("registre") !== "gol").map((row) => {
      const st = readStore();
      const struck = st.struck[`reg-dosare:${row.id}`];
      const status = struck ? "radiat" : row.status;
      const anon = anonOf("reg-dosare", row.id);
      return {
        id: row.id, src: row, authority: "ANSP", subdivision: row.subdiviziune,
        nr: row.nrDosar, tip: row.tipDosar || "Eliberare", serviciu: row.serviciu,
        solicitant: anon ? REDACTED : row.numeSolicitant || "—", companie: row.companie || "",
        status, statut: status === "radiat" ? "Radiat" : dossierStatuses()[status]?.label || status,
        actor: row.specialist?.nume || "Nerepartizat", actorRol: row.specialist?.rol || "",
        depus: demoTime(row.dataDepunerii, row.id), termen: row.termenExaminare || "",
        anon: Boolean(anon), struck: Boolean(struck)
      };
    }),
    Permit: () => (S.data?.acts || []).map((a) => ({
      id: a.id, src: a, authority: a.authority, subdivision: a.subdivision, authorityOnly: true,
      nr: a.nr, denumire: a.name, tip: a.type, autoritate: a.authority, beneficiar: a.beneficiary.name,
      beneficiarId: a.beneficiary.idno ? `IDNO ${a.beneficiary.idno}` : `IDNP ${a.beneficiary.idnp}`,
      status: a.tacit && a.status === "Valabil" ? "Aprobare tacită" : a.status, emis: a.issued, valabil: a.validUntil, dosar: a.dossier
    })),
    Invoice: () => (S.data?.notes || []).map((n) => ({
      id: n.id, src: n, authority: n.authority, subdivision: n.subdivision,
      nr: n.nr, referinta: n.ref.nr, refKind: n.ref.kind === "act" ? "Act permisiv" : "Dosar", solicitant: n.payer.name,
      serviciu: n.service, suma: n.total, statutNota: n.status, statutMpay: n.mpay?.status || "Fără tranzacție",
      metoda: n.method || "—", autoritate: `${n.authority} · ${n.subdivision}`, emisa: n.issued, termen: n.due,
      confirmatDe: n.confirmedBy, mpay: n.mpay?.id || ""
    })),
    Expertise: () => (S.data?.avize || []).map((v) => ({
      id: v.id, src: v, authority: v.authority, subdivision: v.subdivision,
      nr: v.nr, tip: v.tip, dosar: v.dossier, solicitant: v.applicant, autoritate: `${v.authority} · ${v.subdivision}`,
      statut: v.status, emis: v.issued, valabil: v.validUntil
    }))
  };
  /* the fields each source object offers to the builder (a column whose key is missing here is dropped silently:
     US-194 / US-196 / US-198 AC „dacă un câmp-sursă dispare, coloana nu mai apare”) */
  /* = the builder's field catalog (registre-v2: one list for both sides) */
  const SOURCE_FIELDS = Object.fromEntries(Object.keys(FIELD_CATALOG).map((object) => [object, fieldsOf(object).map((f) => f.key)]));
  const columnsOf = (def) => {
    const gone = (params.get("lipsa") || "").split(",").filter(Boolean);
    const own = def.object === "Case" && def.service ? (SERVICE_FIELDS[def.service] || []).map(([key]) => key) : [];
    return def.columns.filter((c) => (SOURCE_FIELDS[def.object]?.includes(c.key) || own.includes(c.key)) && !gone.includes(c.key));
  };
  /* the predefined filter (invisible to the BO user, Feature 94523): phase-1 rules {field, op ≠ | =, value} or the
     builder's {column, op: contains | is | isNot | empty | notEmpty, value} joined by „Și” (all) or „Sau” (any) */
  const norm = (v) => String(v ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("ro").trim();
  const ruleHolds = (rule, row) => {
    if (rule.field) {
      const value = rule.field === "status" ? row.src?.status ?? row.status : row[rule.field];
      return rule.op === "≠" ? value !== rule.value : value === rule.value;
    }
    const value = norm(textOf(row, rule.column));
    const blank = !value || value === "—";
    switch (rule.op) {
      case "contains": return value.includes(norm(rule.value));
      case "is": return value === norm(rule.value);
      case "isNot": return value !== norm(rule.value);
      case "empty": return blank;
      case "notEmpty": return !blank;
      default: return true;
    }
  };
  const passesPredefined = (def, row) => {
    const rules = def.predefinedFilter?.rules || [];
    if (!rules.length) return true;
    return def.predefinedFilter.logic === "or" ? rules.some((r) => ruleHolds(r, row)) : rules.every((r) => ruleHolds(r, row));
  };
  /* a register on the Autoritate / Serviciu perimeter shows only that authority's / service's records */
  const inRegisterPerimeter = (def, row) => {
    if (def.authority && row.authority !== def.authority) return false;
    if (!def.service) return true;
    const name = serviceOf(def.service)?.name;
    return !name || [row.serviciu, row.src?.service, row.denumire].includes(name);
  };
  function rowsOf(def, who = persona()) {
    if (!granted(def, who)) return [];
    return (SOURCES[def.object]?.() || [])
      .filter((row) => inRegisterPerimeter(def, row))
      .filter((row) => passesPredefined(def, row))
      .filter((row) => inPerimeter(who, row.authority, row.subdivision, { authorityOnly: row.authorityOnly }));
  }
  const findRow = (def, id) => rowsOf(def).find((row) => row.id === id) || null;

  /* ---------------------------------------------------------------- tones */
  const ACT_TONE = { "Valabil": "success", "Aprobare tacită": "brand", "Suspendat": "warning", "Expirat": "neutral", "Retras": "danger", "Anulat": "danger" };
  const NOTE_TONE = { "Emisă": "brand", "Achitată": "success", "Parțial achitată": "warning", "Neachitată": "danger", "Expirată": "neutral", "Anulată": "neutral", "Rambursată": "violet" };
  const MPAY_TONE = { "Finalizată cu succes": "success", "Eșuată": "danger", "În așteptare": "warning", "Anulată": "neutral" };
  const AVIZ_TONE = { "Favorabil": "success", "Nefavorabil": "danger", "În lucru": "brand", "Expirat": "neutral", "Retras": "danger" };
  const caseTone = (row) => (row.status === "radiat" ? "danger" : dossierStatuses()[row.status]?.tone || "neutral");

  /* ---------------------------------------------------------------- cells */
  const stack = (main, sub = "", { code = false } = {}) => `
    <div class="e-permits-workplace__case-cell">
      ${code ? A().renderListCode?.(main) || esc(main) : `<span data-cell-tooltip="${esc(main)}">${esc(main)}</span>`}
      ${sub ? `<span class="e-permits-workplace__source"><span data-cell-tooltip="${esc(sub)}">${esc(sub)}</span></span>` : ""}
    </div>`;
  const inDays = (n) => (n === 0 ? "azi" : n === 1 ? "mâine" : n > 0 ? `în ${plural(n, "zi", "zile")}` : `acum ${plural(-n, "zi", "zile")}`);
  const dateCell = (value, meta = "", tone = "") => (value ? `
    <span class="e-permits-workplace__date-stack">
      <span>${esc(longDate(value))}</span>
      ${meta ? `<span class="e-permits-workplace__date-meta${tone ? ` e-permits-gh__meta--${tone}` : ""}">${esc(meta)}</span>` : ""}
    </span>` : dash);
  const dateTimeCell = (value, who = "") => (value ? A().renderDateTime?.(value, who) || esc(stamp(value)) : dash);
  const untilCell = (value, running, from = null) => {
    if (!value) return dash;
    const n = daysUntil(value, from);
    if (!running) return dateCell(value);
    return dateCell(value, n < 0 ? "termen depășit" : n <= 30 ? `expiră ${inDays(n)}` : "", n < 0 ? "danger" : n <= 30 ? "warning" : "");
  };
  const CELLS = {
    Case: {
      nr: (r) => stack(r.nr, r.tip, { code: true }),
      solicitant: (r) => stack(r.solicitant, r.anon ? "Date anonimizate" : r.companie),
      serviciu: (r) => `<span data-cell-tooltip="${esc(r.serviciu)}">${esc(r.serviciu)}</span>`,
      subdiviziune: (r) => stack(r.subdivision, r.authority),
      statut: (r) => tag(r.statut, caseTone(r)),
      actor: (r) => stack(r.actor, r.actorRol),
      depus: (r) => dateTimeCell(r.depus),
      termen: (r) => (FINAL.includes(r.status) || r.status === "radiat" ? dateCell(r.termen) : untilCell(r.termen, true, caseToday()))
    },
    Permit: {
      nr: (r) => A().renderListCode?.(r.nr) || esc(r.nr),
      denumire: (r) => `<span data-cell-tooltip="${esc(r.denumire)}">${esc(r.denumire)}</span>`,
      autoritate: (r) => `
        <div class="e-permits-workplace__case-cell">
          <span data-tooltip-text="${esc(authorityOf(r.autoritate).name)}">${esc(r.autoritate)}</span>
          <span class="e-permits-workplace__source"><span data-cell-tooltip="${esc(r.subdivision)}">${esc(r.subdivision)}</span></span>
        </div>`,
      beneficiar: (r) => stack(r.beneficiar, r.beneficiarId),
      status: (r) => tag(r.status, ACT_TONE[r.status]),
      emis: (r) => dateTimeCell(r.emis),
      valabil: (r) => untilCell(r.valabil, ["Valabil", "Aprobare tacită", "Suspendat"].includes(r.status))
    },
    Invoice: {
      nr: (r) => A().renderListCode?.(r.nr) || esc(r.nr),
      referinta: (r) => stack(r.referinta, r.refKind, { code: true }),
      solicitant: (r) => stack(r.solicitant, r.src.payer.kind === "PJ" ? `IDNO ${r.src.payer.id}` : `IDNP ${r.src.payer.id}`),
      serviciu: (r) => `<span data-cell-tooltip="${esc(r.serviciu)}">${esc(r.serviciu)}</span>`,
      suma: (r) => {
        const n = r.src;
        const sub = n.status === "Parțial achitată" ? `achitat ${mdl(n.paid)}` : n.status === "Rambursată" ? "rambursată" : "";
        return `<span class="e-permits-workplace__date-stack"><span>${esc(mdl(n.total))}</span>${sub ? `<span class="e-permits-workplace__date-meta">${esc(sub)}</span>` : ""}</span>`;
      },
      statutNota: (r) => tag(r.statutNota, NOTE_TONE[r.statutNota]),
      statutMpay: (r) => (r.src.mpay ? tag(r.statutMpay, MPAY_TONE[r.statutMpay]) : dash),
      metoda: (r) => (r.metoda === "—" ? dash : `<span data-cell-tooltip="${esc(r.metoda)}">${esc(r.metoda)}</span>`),
      autoritate: (r) => stack(r.subdivision, r.authority),
      emisa: (r) => dateTimeCell(r.emisa, r.confirmatDe),
      termen: (r) => {
        const n = r.src;
        if (["Achitată", "Rambursată"].includes(n.status)) return dateCell(n.due, "achitată");
        if (["Anulată"].includes(n.status)) return dateCell(n.due);
        const d = daysUntil(n.due);
        return dateCell(n.due, d < 0 ? "expirată" : inDays(d), d < 0 ? "danger" : d <= 3 ? "warning" : "");
      },
      confirmatDe: (r) => `<span data-cell-tooltip="${esc(r.confirmatDe)}">${esc(r.confirmatDe)}</span>`
    },
    Expertise: {
      nr: (r) => A().renderListCode?.(r.nr) || esc(r.nr),
      tip: (r) => `<span data-cell-tooltip="${esc(r.tip)}">${esc(r.tip)}</span>`,
      dosar: (r) => A().renderListCode?.(r.dosar) || esc(r.dosar),
      solicitant: (r) => `<span data-cell-tooltip="${esc(r.solicitant)}">${esc(r.solicitant)}</span>`,
      autoritate: (r) => stack(r.subdivision, r.authority),
      statut: (r) => tag(r.statut, AVIZ_TONE[r.statut]),
      emis: (r) => (r.emis ? dateTimeCell(r.emis, r.src.expert) : dateCell(r.src.asked, "solicitat, în lucru")),
      valabil: (r) => untilCell(r.valabil, r.statut === "Favorabil")
    }
  };
  /* the text a column contributes to search / facets / CSV */
  const TEXT = {
    depus: (r) => longDate(r.depus), termen: (r) => longDate(r.termen), emis: (r) => longDate(r.emis), emisa: (r) => longDate(r.emisa),
    valabil: (r) => longDate(r.valabil), suma: (r) => mdl(r.suma), subdiviziune: (r) => `${r.subdivision} (${r.authority})`,
    autoritate: (r) => (r.autoritate && r.subdivision && !String(r.autoritate).includes("·") ? `${r.autoritate} · ${r.subdivision}` : r.autoritate)
  };
  const textOf = (row, key) => String(/^svc:/.test(key) ? svcValue(row, key) : TEXT[key]?.(row) ?? row[key] ?? "");

  /* ---------------------------------------------------------------- row actions (definition × role × state) */
  const actionsFor = (def, who = persona()) => (def.actions || []).filter((a) => !a.roles.length || a.roles.includes(who.roleId))
    .filter((a) => !a.permission || who.can("push"));
  /* each control checks the record's real state (Epic 89620 AC: „respectă la execuție starea reală”) — the menu shows
     the reason, the confirm checks again */
  function actionState(action, row) {
    const st = row.src?.status;
    if (row.struck) return "Dosarul este radiat din registru.";
    switch (action.control) {
      case "ArchiveRecord": return st === "arhivat" ? "Dosarul este deja arhivat." : ["eliberat", "respins"].includes(st) ? "" : "Se arhivează doar dosarele finalizate (act eliberat sau dosar respins).";
      case "Anonymize": return row.anon ? "Datele personale sunt deja anonimizate." : FINAL.includes(st) ? "" : "Dosarul este în examinare: datele solicitantului sunt necesare procesului.";
      case "StrikeCase": return FINAL.includes(st) ? "Dosarul este finalizat: radierea se aplică doar dosarelor în lucru." : "";
      case "PushCase": return st === "schita" ? "Dosarul nu are un proces pornit." : "";
      default: return "";
    }
  }
  const menuItems = (def, row, { includeOpen = true } = {}) => actionsFor(def)
    .filter((a) => includeOpen || a.type !== "open")
    .map((a) => {
      const reason = a.type === "open" ? "" : actionState(a, row);
      return {
        label: a.label,
        icon: a.icon,
        danger: Boolean(a.danger),
        attrs: `data-reg-action="${esc(a.key)}" data-reg-kind="${esc(def.id)}" data-reg-row="${esc(row.id)}"${reason ? ` aria-disabled="true" data-tooltip-reason="${esc(reason)}"` : ""}`
      };
    });
  const rowMenuHtml = (def, row) => {
    const html = U().renderRowActions?.({ menu: menuItems(def, row), label: row.nr }) || "";
    return html ? `<span class="e-permits-workplace__row-actions">${html.replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>")}</span>` : "";
  };

  /* ---------------------------------------------------------------- one shell registry per register */
  const kindState = {};
  function registryDb(id) {
    const def = defOf(id);
    if (!S.data) {
      S.placeholder = { ...(S.placeholder || {}), [id]: true };
      load().then(() => refresh(id));
      return { kind: id, fixedWidths: true, columns: { nr: { label: "", width: 160 } }, views: { [id]: { title: navLabel(id), selectable: false, columns: ["nr"] } }, runtimeRows: [] };
    }
    const who = persona();
    const cols = columnsOf(def);
    const visible = cols.filter((c) => c.visible);
    const hasActions = actionsFor(def, who).length > 0;
    /* fill = a name column: takes the spare room and, when the table is too wide, ellipsizes with a tooltip
       (my-cases-no-hscroll-v1: authority / person / company names too, not only the service) */
    const columns = Object.fromEntries(visible.map((c) => [c.key, { label: c.label, width: c.width, sortable: c.sortable, fill: ["denumire", "serviciu", "tip", "subdiviziune", "autoritate", "solicitant", "companie", "beneficiar"].includes(c.key) }]));
    if (hasActions) columns.actiuni = { label: "", width: 56, pin: "end" };
    const rows = rowsOf(def, who);
    kindState[id] = { who, rows: rows.length };
    return {
      kind: id,
      fixedWidths: true,
      fieldCount: visible.length,
      defaultSort: def.defaultSort?.key || null,
      columns,
      views: {
        [id]: {
          title: def.name,
          selectable: false,
          searchPlaceholder: searchPlaceholder(def, cols),
          columns: [...visible.map((c) => c.key), ...(hasActions ? ["actiuni"] : [])],
          toolbarLabel: `Filtrare ${def.name}`,
          exportLabel: "Exportă CSV"
        }
      },
      runtimeRows: rows
    };
  }
  const navLabel = (id) => document.querySelector(`[data-nav-item][data-nav-id="${id}"]`)?.dataset.navLabel || "Registru";
  function searchPlaceholder(def, cols) {
    const texts = cols.filter((c) => c.filter === "text").map((c) => c.label.toLocaleLowerCase("ro").replace(/^nr\. /, "nr. "));
    return texts.length ? `Caută după ${texts.slice(0, 3).join(", ")}` : "Caută";
  }
  const FACET_SEARCH_MIN = 8;
  function facetsOf(id) {
    const def = defOf(id);
    if (!def) return [];
    return columnsOf(def).filter((c) => c.filter && c.filter !== "text").map((c) => (c.filter === "date"
      ? { key: c.key, label: c.label, type: "date", get: (row) => (row[c.key] ? String(row[c.key]).slice(0, 10) : ""), today: () => dayIso() }
      : { key: c.key, label: c.label, search: rowsOf(def).reduce((set, r) => set.add(textOf(r, c.key)), new Set()).size > FACET_SEARCH_MIN, get: (row) => textOf(row, c.key) }));
  }
  function registerRegistry(id) {
    window.GEAPShellRegistries = window.GEAPShellRegistries || {};
    window.GEAPShellRegistries[id] = {
      build: () => registryDb(id),
      get facets() { return facetsOf(id); },
      /* the columns marked „Text” in the definition (visible or not — e.g. Nr. dosar on the acts register) */
      searchText: (row) => {
        const def = defOf(id);
        return columnsOf(def).filter((c) => c.filter === "text").map((c) => textOf(row, c.key)).concat(row.beneficiarId || "").join(" ");
      },
      /* always a value: the shell's own default branch reads dossier-only fields (statuses, numeSolicitant) */
      sortValue: (row, key) => (key === "suma" ? Number(row.suma) || 0 : ["depus", "termen", "emis", "emisa", "valabil"].includes(key) ? String(row[key] || "") : textOf(row, key)),
      filterToken: () => true,
      renderCell: (row, key) => {
        const def = defOf(id);
        if (key === "actiuni") return rowMenuHtml(def, row);
        const cell = CELLS[def.object]?.[key];
        return cell ? cell(row) : esc(textOf(row, key) || "—");
      },
      openRow: (rowId) => openCard(id, rowId),
      rowLabel: (row) => `${row.nr}${row.serviciu || row.denumire || row.tip ? `, ${row.serviciu || row.denumire || row.tip}` : ""} — deschide fișa înregistrării`,
      rowClass: (row) => (row.struck ? "is-inactive" : ""),
      emptyHtml: ({ query, filtered }) => {
        const E = window.GEAPEmptyState;
        const def = defOf(id);
        if (!S.data) return E?.render({ title: "Se încarcă registrul…", loading: true, bare: true });
        if (!granted(def)) return E?.render({ title: DENIED, text: "Rolul tău nu are acces la acest registru. Accesul se acordă de Administratorul central, per rol.", icon: "lock", bare: true });
        if (query || filtered) return E?.noResults?.("Nicio înregistrare nu corespunde căutării sau filtrelor", { text: "Schimbă textul căutat sau șterge filtrele.", bare: true });
        const who = persona();
        return E?.render({ title: "Nu sunt înregistrări în perimetrul tău", text: `Registrul arată doar înregistrările pentru ${perimeterText(who, { authorityOnly: def.object === "Permit" })}.`, icon: "page-text", bare: true });
      },
      exportRows: (rows) => openExport(id, rows),
      exportState: ({ query, filtered }) => {
        const def = defOf(id);
        if (!S.data || !granted(def) || !persona().can("export")) return { hidden: true };
        if (def.exportNeedsCriteria && !query && !filtered) return { reason: "Caută sau aplică un filtru înainte de export: registrul întreg nu se exportă." };
        return {};
      }
    };
  }
  ["reg-dosare", "reg-acte", "reg-note", "reg-avize"].forEach(registerRegistry);

  /* the open register redraws in place (rows rebuilt, search / filters / page kept) */
  function refresh(id) {
    const reg = document.querySelector(`[data-workplace][data-registry-kind="${id}"]`);
    const st = A().workplaceState;
    if (!reg || !st) return;
    if (S.placeholder?.[id]) {
      /* first draw after the data arrived: the shell had built an empty placeholder → show the real register */
      delete S.placeholder[id];
      if (!reg.closest("[hidden]") && !reg.hidden) document.querySelector(`[data-nav-item][data-nav-id="${id}"]`)?.click();
      return;
    }
    /* rows rebuilt even while a record card covers the register: the crumb back shows the fresh state */
    st.rows = registryDb(id).runtimeRows;
    if (!reg.closest("[hidden]") && !reg.hidden) A().renderWorkplace?.();
  }

  /* ---------------------------------------------------------------- persistent switcher state (US-196 AC-08) */
  /* the „Registre” menu group is the persistent selector: leaving a register keeps its search / sort / page, coming
     back restores them (the facet filters persist per register in the shell already) */
  document.addEventListener("click", (event) => {
    const item = event.target.closest?.("[data-nav-item]");
    if (!item) return;
    const reg = document.querySelector("[data-workplace][data-registry-kind^='reg-']");
    const kind = reg?.dataset.registryKind;
    const st = A().workplaceState;
    if (kind && st && !reg.closest("[hidden]") && !reg.hidden) S.saved[kind] = { query: st.query, sortKey: st.sortKey, sortDirection: st.sortDirection, page: st.page, pageSize: st.pageSize };
  }, true);
  document.addEventListener("click", (event) => {
    const item = event.target.closest?.("[data-nav-item]");
    if (!item) return;
    const id = item.dataset.navId;
    if (id === "registre") { showCatalog(); return; }
    if (catalogPage) catalogPage.hidden = true;
    if (!/^reg-/.test(id || "")) return;
    const saved = S.saved[id];
    const st = A().workplaceState;
    if (saved && st) {
      Object.assign(st, saved);
      const search = document.querySelector("[data-workplace-search]");
      if (search) search.value = saved.query || "";
      A().renderWorkplace?.();
    }
  });

  /* ================================================================ catalog „Toate registrele” (Feature 91139 § UX) */
  let catalogPage = null;
  function ensurePage() {
    if (catalogPage) return catalogPage;
    const host = document.querySelector("[data-dosar-profil]")?.parentElement || document.querySelector(".e-permits-shell__canvas-surface");
    if (!host) return null;
    host.insertAdjacentHTML("beforeend", `
      <div class="permits-page__content e-permits-dosar-profil e-permits-reg-page" hidden data-shell-module-page data-reg-page>
        <div class="e-permits-dosar-profil__panel" data-reg-page-body></div>
      </div>`);
    catalogPage = host.querySelector("[data-reg-page]");
    return catalogPage;
  }
  /* a list-level page: its title is the top bar title (as every registry), the content starts under it */
  function showPage(title, body) {
    const page = ensurePage();
    if (!page) return;
    A().hideShellPages?.();
    A().shell?.classList.add("is-module-page-open");
    const els = A().els || {};
    if (els.workplaceTitle) els.workplaceTitle.textContent = title;
    if (els.workplaceRefresh) els.workplaceRefresh.hidden = true;
    page.querySelector("[data-reg-page-body]").innerHTML = body;
    page.hidden = false;
    page.closest(".e-permits-shell__canvas-surface")?.scrollTo?.(0, 0);
  }
  const catalogLead = (def) => `<span class="avatar avatar--md avatar--icon e-permits-reg-catalog__icon" aria-hidden="true">${icon(def.icon, 20)}</span>`;
  async function showCatalog() {
    await load();
    const who = persona();
    /* published + granted + not deprecated (registre-v2); „În curând” for whoever would get it */
    const defs = (S.data?.registers || []).filter((def) => (def.soon ? def.grants.includes(who.roleId) : granted(def, who)));
    if (!defs.length) {
      showPage("Registre", window.GEAPEmptyState?.render({ title: DENIED, text: "Rolul tău nu are acces la niciun registru. Accesul se acordă de Administratorul central, per rol.", icon: "lock" }) || DENIED);
      return;
    }
    const items = defs.map((def) => {
      const count = def.soon ? 0 : rowsOf(def, who).length;
      return {
        plainTitle: def.name,
        title: esc(def.name),
        leadHtml: catalogLead(def),
        badges: def.soon ? [tag("În curând", "neutral")] : [],
        meta: def.soon ? [esc(def.category), "Necesită un obiect-sursă nou în cod"] : [esc(def.category), esc(plural(count, "înregistrare", "înregistrări")), esc(def.object === "Permit" ? `Perimetru: ${perimeterText(who, { authorityOnly: true })}` : `Perimetru: ${perimeterText(who)}`)],
        meta2: [esc(def.description)],
        rowAttrs: def.soon ? "" : `data-reg-open-register="${esc(def.id)}"`
      };
    });
    const list = A().renderStackedList?.("Registrele tale", [{ label: "", items }], { meta: plural(defs.filter((d) => !d.soon).length, "registru disponibil", "registre disponibile") }) || "";
    showPage("Registre", list);
  }
  document.addEventListener("click", (event) => {
    const row = event.target.closest?.("[data-reg-open-register]");
    if (!row || event.target.closest("button, a")) return;
    document.querySelector(`[data-nav-item][data-nav-id="${row.dataset.regOpenRegister}"]`)?.click();
  });

  /* „Acces interzis” — an address typed by hand for a register the role has no grant for (AC-01) */
  function showDenied(title) {
    /* no menu item stands for a register the role cannot open */
    document.querySelectorAll("[data-nav-item].is-active").forEach((link) => { link.classList.remove("is-active"); link.removeAttribute("aria-current"); });
    showPage(title, window.GEAPEmptyState?.render({ title: DENIED, text: "Rolul tău nu are acces la acest registru. Accesul se acordă de Administratorul central, per rol.", icon: "lock" }) || DENIED);
  }

  /* a link to a register that was deprecated (US-193 AC-04): it is out of the menu; the old address explains why */
  function showDeprecated(def) {
    document.querySelectorAll("[data-nav-item].is-active").forEach((link) => { link.classList.remove("is-active"); link.removeAttribute("aria-current"); });
    showPage(def.name, window.GEAPEmptyState?.render({
      title: "Registrul nu mai este disponibil",
      text: `„${def.name}” a fost depreciat de administrator pe ${longDate(def.deprecatedAt)}. Înregistrările nu s-au pierdut: le găsești în celelalte registre din meniul „Registre”.`,
      icon: "page-text-lock",
      actionHtml: '<button class="btn btn-neutral btn-sm" type="button" data-reg-to-catalog>Toate registrele</button>'
    }) || "");
  }
  document.addEventListener("click", (event) => {
    if (!event.target.closest?.("[data-reg-to-catalog]")) return;
    document.querySelector('[data-nav-item][data-nav-id="registre"]')?.click();
  });

  /* ---------------------------------------------------------------- the „Registre” menu group (registre-v2) */
  /* the BO menu lists the published, granted, non-deprecated registers (global → authority → service, then „Poziția
     în listă”); the AdminPortal „Registre” item needs „Vizualizarea registrelor” (US-147 AC-01). Before the data
     arrives the static menu stays (the same items for the seed). */
  window.GEAPShellNavHook = (profileKey, groups) => {
    const who = persona();
    return groups.map((group) => {
      if (group.label === "Registre" && S.data) {
        const catalogItem = group.items.find((item) => item.id === "registre") || { id: "registre", label: "Toate registrele", shellView: "registre-catalog" };
        const defs = S.data.registers.filter((def) => !def.soon && granted(def, who));
        return { ...group, items: [catalogItem, ...defs.map((def) => ({ id: def.id, label: def.name, shellView: `${def.id}-registry`, navObject: def.object }))] };
      }
      if (group.items.some((item) => item.id === "registre-config") && !adminPerms(who).has("view")) {
        return { ...group, items: group.items.filter((item) => item.id !== "registre-config") };
      }
      return group;
    }).filter((group) => group.items.length);
  };

  /* ================================================================ record card (US-196 AC-07 · US-197 AC-05 · US-273) */
  function tabsOf(def, row) {
    const who = persona();
    const tabs = [{ id: "detalii", label: "Detalii", icon: "page-text" }];
    if (def.object === "Permit") tabs.push({ id: "versiuni", label: "Versiuni", count: row.src.versions.length });
    if (who.can("journal")) tabs.push({ id: "jurnal", label: "Jurnalul evenimentelor", count: eventsOf(def, row).length });
    return tabs;
  }
  async function openCard(id, rowId, tab = "detalii", { push = true } = {}) {
    await load();
    const def = defOf(id);
    if (!granted(def)) { showDenied(def?.name || "Registru"); return; }
    const row = findRow(def, rowId);
    A().setActiveNav?.(id);
    A().openProfilePanel?.();
    const els = A().els || {};
    if (!row) {
      els.dosarProfilTitleRow.innerHTML = A().renderPageHeaderTop({ crumbs: [{ label: def.name, attr: "data-dosar-profil-crumb-back" }, { label: rowId }], title: "Înregistrarea nu a fost găsită" });
      els.dosarProfilSummary.innerHTML = "";
      els.dosarProfilTabs.innerHTML = "";
      els.dosarProfilPanelBody.id = "reg-panel";
      els.dosarProfilPanelBody.innerHTML = window.GEAPEmptyState?.render({ title: "Înregistrarea nu există sau nu e în perimetrul tău", text: `Registrul arată doar înregistrările pentru ${perimeterText(persona(), { authorityOnly: def.object === "Permit" })}.`, icon: "search" }) || "";
      return;
    }
    const tabs = tabsOf(def, row);
    S.card = { id, rowId, tab: tabs.some((t) => t.id === tab) ? tab : "detalii" };
    if (S.card.tab === "jurnal" && S.ev.rowId !== rowId) Object.assign(S.ev, { rowId, query: "", filter: "all", sort: "desc" });
    logAccess(def, row);
    renderCard();
    A().writeHash?.(`#registru/${id}/${rowId}/${S.card.tab}`, { push });
    els.dosarProfilPanel?.scrollIntoView?.({ block: "start" });
  }
  function renderCard({ keepFocus = "" } = {}) {
    const c = S.card;
    if (!c) return;
    const def = defOf(c.id);
    const row = findRow(def, c.rowId);
    if (!row) return;
    const els = A().els || {};
    els.dosarProfilTitleRow.innerHTML = A().renderPageHeaderTop({
      crumbs: [{ label: def.name, attr: "data-dosar-profil-crumb-back" }, { label: row.nr }],
      title: titleOf(def, row),
      actions: cardActions(def, row)
    });
    els.dosarProfilSummary.innerHTML = A().renderPageHeaderMeta(metaOf(def, row));
    A().watchPageHeaderMeta?.(els.dosarProfilSummary);
    els.dosarProfilTabs.innerHTML = tabsOf(def, row).map((t) => {
      const active = t.id === c.tab;
      return `<button class="tab-button${active ? " active" : ""}" id="reg-tab-${t.id}" type="button" role="tab" aria-controls="reg-panel" aria-selected="${active}" tabindex="${active ? 0 : -1}" data-reg-tab="${t.id}">
        ${t.icon ? icon(t.icon) : ""}<span>${esc(t.label)}</span>${t.count ? A().renderPageHeaderTabCount?.(t.count) || "" : ""}
      </button>`;
    }).join("");
    const body = els.dosarProfilPanelBody;
    body.id = "reg-panel";
    body.setAttribute("role", "tabpanel");
    body.setAttribute("aria-labelledby", `reg-tab-${c.tab}`);
    body.innerHTML = c.tab === "versiuni" ? versionsHtml(row) : c.tab === "jurnal" ? journalHtml(def, row) : detailsHtml(def, row);
    if (keepFocus) body.querySelector(keepFocus)?.focus();
  }
  const titleOf = (def, row) => (def.object === "Case" ? row.serviciu : def.object === "Permit" ? row.denumire : def.object === "Invoice" ? "Notă de plată" : row.tip);
  function cardActions(def, row) {
    const items = menuItems(def, row, { includeOpen: false });
    const open = actionsFor(def).find((a) => a.type === "open");
    const openBtn = open && def.object === "Case" ? `<button class="btn btn-neutral btn-sm" type="button" data-reg-action="open" data-reg-kind="${esc(def.id)}" data-reg-row="${esc(row.id)}">${esc(open.label)}</button>` : "";
    const menu = (U().renderStackMenu?.(items, row.nr) || "").replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>");
    return openBtn + menu;
  }
  const copy = (value) => A().renderProfileCopyCode?.(value, `Copiază ${value}`) || esc(value);
  function metaOf(def, row) {
    const s = row.src;
    switch (def.object) {
      case "Case": return [
        ["Numărul dosarului", copy(row.nr)],
        ["Statut", `${tag(row.statut, caseTone(row))}${row.anon ? tag("Date anonimizate", "neutral") : ""}`],
        ["Subdiviziune", esc(`${row.subdivision} · ${row.authority}`)],
        ["Actor responsabil", esc(row.actor)],
        ["Termen", esc(longDate(row.termen) || "—")]
      ];
      case "Permit": return [
        ["Nr. act", copy(row.nr)],
        ["Status", tag(row.status, ACT_TONE[row.status])],
        ["Autoritate emitentă", esc(authorityOf(s.authority).name)],
        ["Valabil până la", esc(longDate(s.validUntil))]
      ];
      case "Invoice": return [
        ["Nr. notă de plată", copy(row.nr)],
        ["Statut notă", tag(s.status, NOTE_TONE[s.status])],
        ["Tranzacție MPay", s.mpay ? tag(s.mpay.status, MPAY_TONE[s.mpay.status]) : esc("Fără tranzacție")],
        ["Sumă", esc(mdl(s.total))],
        ["Termen de achitare", esc(longDate(s.due))]
      ];
      default: return [
        ["Nr. aviz", copy(row.nr)],
        ["Statut", tag(s.status, AVIZ_TONE[s.status])],
        ["Autoritate avizatoare", esc(authorityOf(s.authority).name)],
        ["Dosar", esc(s.dossier)]
      ];
    }
  }
  const card = (title, rows) => A().renderInfoCard?.(title, rows.filter(Boolean)) || "";
  const val = (v) => (v === null || v === undefined || v === "" ? "—" : esc(v));
  function detailsHtml(def, row) {
    const s = row.src;
    if (def.object === "Case") {
      const anon = anonOf(def.id, row.id);
      const notices = [
        anon && U().renderNotice?.("info", `<strong>Date personale anonimizate</strong> · ${esc(stamp(anon.at))}, ${esc(anon.by)}. Cererea ${esc(anon.request)} (aprobată). Datele solicitantului apar ca „${REDACTED}” aici, în registru și în evenimentele anterioare din jurnal.`, { icon: "shield-keyhole" }),
        row.struck && U().renderNotice?.("warning", `<strong>Dosar radiat din registru</strong> · ${esc(stamp(readStore().struck[`${def.id}:${row.id}`].at))}. Motiv: ${esc(readStore().struck[`${def.id}:${row.id}`].reason)}. Înregistrarea rămâne în sistem, nu se mai procesează.`)
      ].filter(Boolean).join("");
      return `${notices ? `<div class="e-permits-reg-notices">${notices}</div>` : ""}
        ${card("Date generale", [
          ["Numărul dosarului", copy(row.nr)],
          ["Tip solicitare", val(row.tip)],
          ["Serviciu", val(row.serviciu)],
          ["Statut", tag(row.statut, caseTone(row))],
          ["Etapa curentă", val(stepOf(STATUS_STEP[s.status])?.name || "—")],
          ["Data depunerii", val(stamp(row.depus))],
          ["Termen de examinare", val(longDate(row.termen))]
        ])}
        ${card("Solicitant", [
          ["Nume", row.anon ? esc(REDACTED) : val(row.solicitant)],
          ["Companie", val(row.companie || "—")],
          ["Sursa depunerii", val(s.sursa === "FO" ? "Portal (EVO)" : s.sursa === "OFICIU" ? "Inițiat în oficiu" : "Ghișeu")]
        ])}
        ${card("Responsabil", [
          ["Autoritate", val(authorityOf(row.authority).name)],
          ["Subdiviziune", val(row.subdivision)],
          ["Actor responsabil", val(`${row.actor}${row.actorRol ? ` · ${row.actorRol}` : ""}`)]
        ])}`;
    }
    if (def.object === "Permit") {
      const b = s.beneficiary;
      const changeNotice = s.statusChange && ["Suspendat", "Retras", "Anulat"].includes(s.status)
        ? U().renderNotice?.(s.status === "Suspendat" ? "warning" : "error", `<strong>${esc(s.status === "Suspendat" ? `Suspendat până la ${longDate(s.statusChange.until)}` : `${s.status} ${longDate(s.statusChange.at)}`)}</strong> · ${esc(s.statusChange.reason)}.`) : "";
      return `${changeNotice ? `<div class="e-permits-reg-notices">${changeNotice}</div>` : ""}
        ${card("Date generale", [
          ["Nr. act", copy(s.nr)],
          ["Denumire act", val(s.name)],
          ["Status", tag(row.status, ACT_TONE[row.status])],
          s.tacit ? ["Data aprobării tacite", val(longDate(s.issued))] : null,
          ["Data emiterii", val(stamp(s.issued))],
          ["Valabil până la", val(longDate(s.validUntil))],
          ["Autoritate emitentă", val(authorityOf(s.authority).name)],
          ["Subdiviziune", val(s.subdivision)],
          ["Nr. dosar", copy(s.dossier)],
          ["Versiunea curentă", val(`v${s.versions.length} · ${s.versions[s.versions.length - 1].event}`)]
        ])}
        ${card("Beneficiar", [
          ["Denumire", val(b.name)],
          [b.kind === "PJ" ? "IDNO" : "IDNP", copy(b.idno || b.idnp)],
          b.representative ? ["Reprezentant", val(b.representative)] : null,
          ["Adresa", val(b.address)],
          ["Telefon", val(b.phone)],
          ["E-mail", val(b.email)]
        ])}
        ${card("Date specifice actului", [
          s.place ? ["Adresa activității", val(s.place)] : null,
          ...s.fields.map(([label, value]) => [label, val(value)])
        ])}`;
    }
    if (def.object === "Invoice") {
      const lines = s.lines.map((l) => [l.label, esc(mdl(l.amount))]);
      return `${card("Nota de plată", [
          ["Nr. notă de plată", copy(s.nr)],
          ["Statut notă", tag(s.status, NOTE_TONE[s.status])],
          [s.ref.kind === "act" ? "Act permisiv" : "Dosar", copy(s.ref.nr)],
          ["Serviciu", val(s.service)],
          ["Solicitant", val(`${s.payer.name} · ${s.payer.kind === "PJ" ? "IDNO" : "IDNP"} ${s.payer.id}`)],
          ...lines,
          ["Sumă totală", esc(mdl(s.total))],
          ["Sumă achitată", esc(mdl(s.paid))],
          ["Data emiterii", val(stamp(s.issued))],
          ["Termen de achitare", val(stamp(s.due))],
          ["Confirmat de", val(s.confirmedBy)],
          ["Autoritate / Subdiviziune", val(`${authorityOf(s.authority).name} · ${s.subdivision}`)]
        ])}
        ${s.mpay ? card("Tranzacția MPay", [
          ["ID tranzacție", copy(s.mpay.id)],
          ["Statut tranzacție", tag(s.mpay.status, MPAY_TONE[s.mpay.status])],
          ["Metodă de plată", val(s.method)],
          ["Data tranzacției", val(stamp(s.mpay.at))],
          s.paidAt ? ["Data achitării", val(stamp(s.paidAt))] : null,
          s.refund ? ["Rambursare", val(`${longDate(s.refund.at)} · ${s.refund.reason}`)] : null
        ]) : `<section class="e-permits-dosar-profil__section"><h2 class="e-permits-dosar-profil__section-title">Tranzacția MPay</h2>${window.GEAPEmptyState?.render({ title: "Nicio tranzacție în MPay", text: "Solicitantul nu a început încă plata acestei note.", icon: "receipt-bill", compact: true }) || ""}</section>`}`;
    }
    return `${card("Date generale", [
        ["Nr. aviz", copy(s.nr)],
        ["Tip aviz", val(s.tip)],
        ["Statut", tag(s.status, AVIZ_TONE[s.status])],
        ["Dosar", copy(s.dossier)],
        ["Serviciu", val(s.service)],
        ["Solicitant", val(s.applicant)],
        ["Data solicitării", val(stamp(s.asked))],
        ["Data emiterii", val(s.issued ? stamp(s.issued) : "—")],
        ["Valabil până la", val(s.validUntil ? longDate(s.validUntil) : "—")]
      ])}
      ${card("Autoritatea avizatoare", [
        ["Autoritate", val(authorityOf(s.authority).name)],
        ["Subdiviziune", val(s.subdivision)],
        ["Expert", val(s.expert)],
        ["Concluzia", val(s.conclusion || "—")]
      ])}`;
  }
  /* Feature 91139: the version chain only in the record card — what changed and why, per version */
  function versionsHtml(row) {
    const s = row.src;
    const events = [...s.versions].reverse().map((v) => ({
      at: v.at,
      user: v.system ? "SIA GEAP" : authorityOf(s.authority).code,
      role: v.system ? "Sistem" : s.subdivision,
      type: `v${v.v} · ${v.event}`,
      status: ["Retragere", "Anulare"].includes(v.event) ? "Eșuat" : "Reușit",
      tone: ["Retragere", "Anulare"].includes(v.event) ? "danger" : v.event === "Suspendare" ? "pending" : "success",
      statusTag: false,
      detail: v.reason
    }));
    return A().renderEventTimeline?.("Lanțul de versiuni", events, { meta: `Versiunea curentă: v${s.versions.length}` }) || "";
  }

  /* ---------------------------------------------------------------- the record's events (US-273 + US-277) */
  const ev = (id, at, user, role, type, category, detail, changes = [], extra = {}) => ({ id, at, user, role, type, category, status: "Reușit", detail, changes, ...extra });
  /* generated from the record (deterministic) + what this session did (store); newest first */
  function baseEvents(def, row) {
    const s = row.src;
    const h = hashOf(row.id);
    const n = (k) => `EV-${String(400000 + ((h + k * 7919) % 500000)).padStart(6, "0")}`;
    const at = (base, minutes) => { const d = toDate(base) || new Date(); d.setMinutes(d.getMinutes() + minutes); return isoOf(d); };
    switch (def.object) {
      case "Case": {
        const name = s.numeSolicitant || "—";
        const phone = `+373 ${60 + (h % 19)} ${100 + (h % 899)} ${100 + ((h >> 3) % 899)}`;
        return [
          ev(n(1), at(row.depus, 0), name, s.companie ? "Reprezentant" : "Solicitant", "Depunere dosar", "modificare", `Dosarul ${row.nr} depus de ${name}.`, [{ field: "Solicitant", before: "—", after: name, personal: true }, { field: "Telefon de contact", before: "—", after: phone, personal: true }], { personal: true }),
          ev(n(2), at(row.depus, 95), "SIA GEAP", "Sistem", "Înregistrare în registru", "sistem", `Număr atribuit: ${row.nr}.`),
          ev(n(3), at(row.depus, 240), "Elena Caragia", "Supervizor", "Repartizare dosar", "modificare", `Repartizat către ${row.actor}.`, [{ field: "Actor responsabil", before: "Nerepartizat", after: row.actor }]),
          ev(n(4), at(row.depus, 1500), row.actor, row.actorRol || "Specialist", "Actualizare date de contact", "modificare", `Telefonul solicitantului ${name} a fost corectat la cererea acestuia.`, [{ field: "Telefon de contact", before: phone, after: phone.replace(/\d$/, (d) => String((Number(d) + 3) % 10)), personal: true }], { personal: true }),
          ev(n(5), at(row.depus, 2900), row.actor, row.actorRol || "Specialist", "Vizualizare dosar", "accesare", "Profilul dosarului deschis din „Dosarele mele”.")
        ].reverse();
      }
      case "Permit": return [
        ...s.versions.map((v, i) => ev(n(10 + i), v.at, v.system ? "SIA GEAP" : s.subdivision, v.system ? "Sistem" : "Autoritate emitentă", `${v.event} act`, v.system ? "sistem" : "modificare", v.reason, i === 0 ? [{ field: "Beneficiar", before: "—", after: s.beneficiary.name, personal: s.beneficiary.kind === "PF" }] : [{ field: "Versiune", before: `v${v.v - 1}`, after: `v${v.v}` }])),
        ev(n(30), at(s.issued, 30), "SIA GEAP", "Sistem", "Publicare în RAP", "sistem", "Actul a fost transmis Registrului actelor permisive (RAP)."),
        ev(n(31), at(s.issued, 4300), "Ion Popescu", "Specialist", "Vizualizare detalii act", "accesare", "Fișa actului deschisă din Registrul actelor permisive.")
      ].sort((a, b) => String(b.at).localeCompare(String(a.at)));
      case "Invoice": return [
        ev(n(1), s.issued, s.confirmedBy, "Specialist", "Generare notă de plată", "modificare", `${s.nr} · ${mdl(s.total)} confirmată de ${s.confirmedBy}.`, [{ field: "Sumă", before: "—", after: mdl(s.total) }]),
        s.mpay && ev(n(2), s.mpay.at, "MPay", "Sistem", `Tranzacție MPay · ${s.mpay.status}`, "sistem", `${s.mpay.id} · ${s.method}.`, [{ field: "Statut tranzacție", before: "—", after: s.mpay.status }], { status: s.mpay.status === "Eșuată" ? "Eșuat" : "Reușit" }),
        s.refund && ev(n(3), s.refund.at, "MPay", "Sistem", "Rambursare", "sistem", s.refund.reason, [{ field: "Statut notă", before: "Achitată", after: "Rambursată" }])
      ].filter(Boolean).sort((a, b) => String(b.at).localeCompare(String(a.at)));
      default: return [
        ev(n(1), s.asked, "SIA GEAP", "Sistem", "Solicitare aviz", "sistem", `Aviz cerut în examinarea dosarului ${s.dossier}.`),
        s.issued && ev(n(2), s.issued, s.expert, "Expert", `Aviz ${s.status.toLocaleLowerCase("ro")}`, "modificare", s.conclusion, [{ field: "Statut aviz", before: "În lucru", after: s.status }])
      ].filter(Boolean).sort((a, b) => String(b.at).localeCompare(String(a.at)));
    }
  }
  /* US-277: after an approved anonymisation the personal values of the record's EARLIER events read «‹redactat›»;
     the events stay (AC-03), every other field is unchanged (AC-04), the redaction is its own event (AC-05/06) */
  function eventsOf(def, row) {
    const key = `${def.id}:${row.id}`;
    const added = readStore().events[key] || [];
    const anon = anonOf(def.id, row.id);
    const list = [...added, ...baseEvents(def, row)].sort((a, b) => String(b.at).localeCompare(String(a.at)));
    if (!anon) return list;
    const redactedIds = new Set(anon.redacted || []);
    return list.map((e) => {
      if (!redactedIds.has(e.id)) return e;
      const name = anon.subjectName || "";
      return {
        ...e,
        redacted: true,
        user: e.user === name ? REDACTED : e.user,
        detail: name ? String(e.detail || "").split(name).join(REDACTED) : e.detail,
        changes: e.changes.map((c) => (c.personal ? { ...c, before: c.before === "—" ? "—" : REDACTED, after: REDACTED } : c))
      };
    });
  }
  function logEvent(def, row, event) {
    const st = readStore();
    const key = `${def.id}:${row.id}`;
    st.seq += 1;
    (st.events[key] ||= []).unshift({ id: `EV-${String(900000 + st.seq).padStart(6, "0")}`, at: nowIso(), status: "Reușit", changes: [], ...event });
    writeStore();
  }
  /* US-197 AC-08 / Feature 94523: every opening of a record is logged (once per session per record) */
  const accessLogged = new Set();
  function logAccess(def, row) {
    const key = `${def.id}:${row.id}`;
    if (accessLogged.has(key) || !S.data) return;
    accessLogged.add(key);
    const who = persona();
    logEvent(def, row, { user: userName(), role: who.roleLabel, type: "Vizualizare fișă în registru", category: "accesare", detail: `${def.name} · perimetru ${perimeterText(who)}.` });
  }

  const EV_FILTERS = [["all", "Toate"], ["modificare", "Modificări"], ["accesare", "Accesări"], ["sistem", "Sistem"]];
  function journalMatches(def, row) {
    const q = S.ev.query.trim().toLocaleLowerCase("ro");
    const list = eventsOf(def, row).filter((e) => (S.ev.filter === "all" || e.category === S.ev.filter)
      && (!q || [e.type, e.detail, e.user, e.role, longDate(e.at), e.id].join(" ").toLocaleLowerCase("ro").includes(q)));
    return S.ev.sort === "asc" ? [...list].reverse() : list;
  }
  function journalHtml(def, row) {
    if (S.ev.rowId !== row.id) Object.assign(S.ev, { rowId: row.id, query: "", filter: "all", sort: "desc" });
    const all = eventsOf(def, row);
    const desc = S.ev.sort === "desc";
    const chips = EV_FILTERS.map(([key, label]) => {
      const on = S.ev.filter === key;
      const count = key === "all" ? all.length : all.filter((e) => e.category === key).length;
      return `<button type="button" class="chip${on ? " is-selected" : ""}" aria-pressed="${on}" data-reg-ev-filter="${key}"><span class="chip__label">${label}</span><span class="badge badge--lg badge--solid-light" aria-hidden="true">${count}</span></button>`;
    }).join("");
    return `
      <section class="e-permits-dosar-profil__section e-permits-stack-section">
        <div class="e-permits-svc-events__heading">
          <h2 class="e-permits-dosar-profil__section-title e-permits-pay__title">Jurnalul evenimentelor</h2>
          <p class="e-permits-svc-events__count" aria-live="polite" data-reg-ev-count>${esc(journalCount(def, row))}</p>
        </div>
        <div class="e-permits-pay__toolbar e-permits-svc-events__toolbar">
          <div class="e-permits-rt__chips" role="group" aria-label="Filtrează evenimentele">${chips}</div>
          <div class="e-permits-pay__tools">
            <div class="search-input medium rectangular e-permits-workplace__search e-permits-list-search e-permits-pay__search${S.ev.query.trim() ? " has-value is-ready" : ""}">
              <span class="icon-search" aria-hidden="true">${icon("search")}</span>
              <input class="input" type="search" placeholder="Caută eveniment, utilizator sau dată" aria-label="Caută în jurnal după eveniment, utilizator sau dată" autocomplete="off" value="${esc(S.ev.query)}" data-reg-ev-search>
              <div class="btn-group">
                <span class="spinner spinner--extra-small spinner--brand" aria-hidden="true"></span>
                <button type="button" class="btn-icon clear" aria-label="Șterge căutarea">${icon("cross-small", 16, "icon small")}</button>
              </div>
            </div>
            <button class="btn btn-neutral btn-sm" type="button" data-reg-ev-sort aria-label="Ordinea: ${desc ? "cele mai noi primele" : "cele mai vechi primele"}">${icon(`arrow-${desc ? "down" : "up"}`, 16, "icon small")}<span>${desc ? "Cele mai noi" : "Cele mai vechi"}</span></button>
          </div>
        </div>
        <div data-reg-ev-list>${journalList(def, row)}</div>
      </section>`;
  }
  const journalCount = (def, row) => {
    const total = eventsOf(def, row).length;
    const shown = journalMatches(def, row).length;
    return shown === total ? plural(total, "eveniment", "evenimente") : `${shown} din ${plural(total, "eveniment", "evenimente")}`;
  };
  function journalList(def, row) {
    const all = eventsOf(def, row);
    if (!all.length) return window.GEAPEmptyState?.render({ title: "Jurnalul de audit nu conține încă înregistrări", text: "", icon: "history", compact: true }) || "";
    const list = journalMatches(def, row);
    if (!list.length) return window.GEAPEmptyState?.noResults?.("Niciun eveniment nu corespunde căutării", { text: "Schimbă textul căutat sau filtrul.", compact: true }) || "";
    /* the general screen's columns (US-270) without „Autoritate” (AC-03): when · who · role · action · result */
    const items = list.map((e) => ({ ...e, tab: e.redacted ? "Redactat" : "", detail: e.detail }));
    return window.GEAPEventTimeline?.listHtml(items, { openAttrs: (item) => `data-reg-ev-open="${esc(item.id)}"` }) || "";
  }
  function refreshJournal(def, row, focusSel = "") {
    const body = A().els?.dosarProfilPanelBody;
    const box = body?.querySelector("[data-reg-ev-list]");
    if (!box) return;
    box.innerHTML = journalList(def, row);
    body.querySelector("[data-reg-ev-count]").textContent = journalCount(def, row);
    const all = eventsOf(def, row);
    body.querySelectorAll("[data-reg-ev-filter]").forEach((chip) => {
      const on = chip.dataset.regEvFilter === S.ev.filter;
      chip.classList.toggle("is-selected", on);
      chip.setAttribute("aria-pressed", String(on));
      const k = chip.dataset.regEvFilter;
      chip.querySelector(".badge").textContent = String(k === "all" ? all.length : all.filter((e) => e.category === k).length);
    });
    const sort = body.querySelector("[data-reg-ev-sort]");
    if (sort) {
      const desc = S.ev.sort === "desc";
      sort.outerHTML = `<button class="btn btn-neutral btn-sm" type="button" data-reg-ev-sort aria-label="Ordinea: ${desc ? "cele mai noi primele" : "cele mai vechi primele"}">${icon(`arrow-${desc ? "down" : "up"}`, 16, "icon small")}<span>${desc ? "Cele mai noi" : "Cele mai vechi"}</span></button>`;
    }
    if (focusSel) body.querySelector(focusSel)?.focus();
  }
  /* US-271 detail panel of one event (library dialog): the event fields + its value changes */
  function openEvent(def, row, eventId) {
    const e = eventsOf(def, row).find((x) => x.id === eventId);
    if (!e) return;
    const anon = anonOf(def.id, row.id);
    /* title = the event, subtitle = when: the card holds the rest once */
    const rows = [
      ["Utilizator", val(e.user)],
      ["Rol", val(e.role)],
      ["Rezultat", tag(e.status, e.status === "Eșuat" ? "danger" : "success")],
      ["Identificator", copy(e.id)],
      e.redacted ? ["Redactare", `${tag("Redactat", "neutral")}<span>${esc(`${longDate(anon.at)} · cererea ${anon.request}`)}</span>`] : null,
      e.redactionOf ? ["Evenimente redactate", esc(e.redactionOf.join(", "))] : null,
      e.request ? ["Cerere de anonimizare", esc(`${e.request} · aprobată`)] : null
    ].filter(Boolean);
    const changes = (e.changes || []).map((c) => [c.field, `<span>${esc(c.before)}</span>${icon("arrow-right", 16, "icon small")}<span>${esc(c.after)}</span>`]);
    openModal({
      kind: "event",
      title: e.type,
      subtitle: stamp(e.at),
      body: `${e.detail ? `<p class="e-permits-passport__lead">${esc(e.detail)}</p>` : ""}
        <div class="e-permits-dosar-profil__card">${rows.map(detailRow).join("")}</div>
        ${changes.length ? `<h3 class="e-permits-dosar-profil__section-title">Modificări</h3><div class="e-permits-dosar-profil__card e-permits-reg-changes">${changes.map(detailRow).join("")}</div>` : ""}`,
      footer: '<div class="modal-buttons"><button class="btn btn-primary btn-rounded" type="button" data-case-close>Închide</button></div>'
    });
  }
  const detailRow = ([label, valueHtml]) => `
    <div class="e-permits-dosar-profil__row">
      <span class="e-permits-dosar-profil__row-label" data-cell-tooltip>${esc(label)}</span>
      <span class="e-permits-dosar-profil__row-value">${valueHtml}</span>
    </div>`;

  /* ================================================================ actions */
  /* ---- the library dialog (#case-action-modal) — export, confirmations, event detail */
  let modalClass = "";
  function openModal({ title, subtitle = "", body, footer, kind = "" }) {
    const overlay = document.querySelector("#case-action-modal");
    if (!overlay) return;
    const box = overlay.querySelector(".modal");
    if (!modalClass) modalClass = box.className;
    box.className = `${modalClass} e-permits-reg-modal${kind ? ` e-permits-reg-modal--${kind}` : ""}`;
    overlay.querySelector("[data-case-modal-title]").textContent = title;
    const sub = overlay.querySelector("[data-case-modal-subtitle]");
    sub.textContent = subtitle; sub.hidden = !subtitle;
    overlay.querySelector("[data-case-modal-body]").innerHTML = body;
    overlay.querySelector("[data-case-modal-footer]").innerHTML = footer;
    R().bind?.(overlay.querySelector("[data-case-modal-body]"));
    if (!overlay.dataset.regBound) {
      overlay.dataset.regBound = "1";
      overlay.addEventListener("click", onModalClick);
      new MutationObserver(() => { if (overlay.getAttribute("aria-hidden") === "true" && modalClass) overlay.querySelector(".modal").classList.remove(...[...overlay.querySelector(".modal").classList].filter((c) => c.startsWith("e-permits-reg-modal"))); }).observe(overlay, { attributes: true, attributeFilter: ["aria-hidden"] });
    }
    if (!overlay.classList.contains("is-active")) window.__modal?.open?.("#case-action-modal");
  }
  const closeModal = () => window.__modal?.close?.("#case-action-modal");
  const footerOf = (label, attrs, { destructive = false, iconName = "" } = {}) => `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn ${destructive ? "btn-destructive" : "btn-primary"} btn-rounded" type="button" ${attrs}>${iconName ? icon(iconName, 20, "icon small") : ""}<span>${esc(label)}</span></button></div>`;
  const reasonField = (id, label, placeholder) => R().fieldHtml?.({ id, type: "textarea", label, required: true, rows: 3, maxLength: 500, charCounter: true, placeholder }) || "";
  function requireText(selector, min = 1) {
    const field = document.querySelector(selector);
    const value = field?.value.trim() || "";
    if (value.length >= min) return value;
    R().setFieldError?.(field, value ? `Scrie cel puțin ${min} caractere.` : "Câmpul este obligatoriu.");
    field?.closest(".e-permits-fo-textarea")?.classList.add("is-error");
    field?.focus();
    field?.addEventListener("input", () => { R().setFieldError?.(field, ""); field.closest(".e-permits-fo-textarea")?.classList.remove("is-error"); }, { once: true });
    return null;
  }
  /* the record changed in another session meanwhile (demo ?modificat=<id>): the action is refused with a clear
     message and nothing changes (US-194 AC-12, Epic 89620 AC) */
  const conflict = (row) => params.get("modificat") === row.id;
  const refuse = (message) => {
    closeModal();
    window.GEAPToast?.show ? window.GEAPToast.show({ type: "error", message, duration: 0, key: "reg-refused" }) : U().showShellToast?.(message, "error");
  };

  let pending = null;
  function runAction(kind, rowId, key) {
    const def = defOf(kind);
    const row = findRow(def, rowId);
    const action = actionsFor(def).find((a) => a.key === key);
    if (!row || !action) return;
    if (action.type === "open") {
      /* „Deschide înregistrarea” → the dossier profile (US-194 AC-10); other objects → their record card */
      if (def.object === "Case") window.location.hash = `#dosar/${encodeURIComponent(row.id)}/general`;
      else openCard(def.id, row.id);
      return;
    }
    const blocked = actionState(action, row);
    if (blocked) { U().showShellToast?.(blocked, "info"); return; }
    pending = { kind, rowId, key };
    /* registre-v2: a form / process / control configured in the builder that has no screen of its own in this
       prototype → one confirmation naming the target; the run is logged on the record */
    if (action.type !== "custom" || !["PushCase", "ArchiveRecord", "StrikeCase", "Anonymize"].includes(action.control)) {
      const target = targetLabel(action);
      const verb = { form: "Completezi formularul", "process-start": "Pornești procesul", "process-advance": "Avansezi procesul" }[action.type] || "Rulezi controlul";
      openModal({
        kind: "confirm",
        title: `${verb} „${target}”?`,
        subtitle: titleOf(def, row),
        body: `<p class="e-permits-passport__lead">${esc(action.type === "form" ? `Formularul se deschide completat cu datele înregistrării ${row.nr}.` : action.type === "process-advance" ? `Înregistrarea ${row.nr} trece la pasul următor al procesului.` : `Acțiunea se aplică înregistrării ${row.nr} și se înregistrează în jurnalul ei.`)}</p>`,
        footer: footerOf(action.label, "data-reg-confirm", { destructive: Boolean(action.danger) })
      });
      return;
    }
    switch (action.control) {
      case "PushCase": openPush(def, row); return;
      case "ArchiveRecord":
        openModal({
          kind: "confirm",
          title: "Arhivezi dosarul?",
          subtitle: row.serviciu,
          body: `<p class="e-permits-passport__lead">Dosarul finalizat trece în statutul „Arhivat”: rămâne în registru și în căutare, dar nu mai poate fi modificat. Arhivarea se înregistrează în jurnalul dosarului.</p>
            ${reasonField("reg-archive-reason", "Motivul arhivării", "De ex. termenul de păstrare activă a expirat")}`,
          footer: footerOf("Arhivează", "data-reg-confirm", { destructive: true })
        });
        return;
      case "StrikeCase":
        openModal({
          kind: "confirm",
          title: "Radiezi dosarul din registru?",
          subtitle: row.serviciu,
          body: `<p class="e-permits-passport__lead">Dosarul nu se șterge din sistem: rămâne în registru cu statutul „Radiat” și nu mai poate fi procesat. Sarcinile deschise se închid.</p>
            ${reasonField("reg-strike-reason", "Motivul radierii", "De ex. dosar depus din eroare, dublură a dosarului D-2026-004501")}`,
          footer: footerOf("Radiază dosarul", "data-reg-confirm", { destructive: true })
        });
        return;
      case "Anonymize":
        openModal({
          kind: "confirm",
          title: "Anonimizezi datele personale?",
          subtitle: row.serviciu,
          body: `<p class="e-permits-passport__lead">Numele, IDNP-ul și datele de contact ale solicitantului se înlocuiesc cu „${REDACTED}” în registru, în fișă și în evenimentele anterioare din jurnal. Evenimentele nu se șterg. Operațiunea nu se poate anula.</p>
            <div class="e-permits-fo-field">
              <label for="reg-anon-basis">Temeiul anonimizării${U().requiredMark?.() || ""}</label>
              ${U().renderFoSelectControl?.({ id: "reg-anon-basis", attrs: "data-reg-anon-basis", optionsHtml: ['Cererea subiectului datelor (Legea nr. 175/2025)', "Expirarea termenului de păstrare", "Decizia autorității de protecție a datelor"].map((o, i) => `<option value="${esc(o)}"${i === 0 ? " selected" : ""}>${esc(o)}</option>`).join("") }) || ""}
            </div>
            ${reasonField("reg-anon-reason", "Motivul", "De ex. cererea nr. 112 din 20 octombrie 2026 a solicitantului")}
            ${U().renderInfoNote?.("Cererea de anonimizare se înregistrează ca aprobată de tine, ca Administrator central; jurnalul păstrează cine și când a aprobat-o.") || ""}`,
          footer: footerOf("Anonimizează", "data-reg-confirm", { destructive: true })
        });
        return;
      default:
    }
  }
  function confirmPending() {
    if (!pending) return;
    const { kind, rowId, key } = pending;
    const def = defOf(kind);
    const row = findRow(def, rowId);
    const action = actionsFor(def).find((a) => a.key === key);
    if (!row || !action) return;
    const st = readStore();
    if (action.type !== "custom" || !["PushCase", "ArchiveRecord", "StrikeCase", "Anonymize"].includes(action.control)) {
      logEvent(def, row, { user: userName(), role: persona().roleLabel, type: action.label, category: "modificare", detail: `${targetLabel(action)} · din ${def.name}.` });
      done(`„${action.label}” a pornit pentru ${row.nr}.`);
      return;
    }
    if (action.control === "ArchiveRecord") {
      const reason = requireText("#fo-reg-archive-reason");
      if (!reason) return;
      if (conflict(row) || actionState(action, row)) { refuse(`Dosarul ${row.nr} nu a fost arhivat: a fost modificat între timp de alt utilizator. Reîncarcă registrul, verifică statutul și reîncearcă.`); return; }
      const before = row.statut;
      st.patches[row.id] = { ...(st.patches[row.id] || {}), status: "arhivat" };
      Object.assign(row.src, { status: "arhivat" }); row.src.profil = null;
      logEvent(def, row, { user: userName(), role: persona().roleLabel, type: "Arhivare dosar", category: "modificare", detail: reason, changes: [{ field: "Statut", before, after: "Arhivat" }] });
      done(`Dosarul ${row.nr} a fost arhivat.`);
      return;
    }
    if (action.control === "StrikeCase") {
      const reason = requireText("#fo-reg-strike-reason");
      if (!reason) return;
      if (conflict(row) || actionState(action, row)) { refuse(`Dosarul ${row.nr} nu a fost radiat: a fost modificat între timp de alt utilizator. Reîncarcă registrul, verifică statutul și reîncearcă.`); return; }
      st.struck[`${def.id}:${row.id}`] = { at: nowIso(), by: userName(), reason };
      logEvent(def, row, { user: userName(), role: persona().roleLabel, type: "Radiere din registru", category: "modificare", detail: reason, changes: [{ field: "Statut", before: row.statut, after: "Radiat" }] });
      done(`Dosarul ${row.nr} a fost radiat din registru.`);
      return;
    }
    if (action.control === "Anonymize") {
      const reason = requireText("#fo-reg-anon-reason");
      if (!reason) return;
      if (conflict(row) || actionState(action, row)) { refuse(`Datele dosarului ${row.nr} nu au fost anonimizate: dosarul a fost modificat între timp de alt utilizator. Reîncarcă registrul, verifică statutul și reîncearcă.`); return; }
      const basis = document.querySelector("[data-reg-anon-basis]")?.value || "";
      st.seq += 1;
      const request = `CA-2026-${String(st.seq).padStart(6, "0")}`;
      const subjectName = row.src.numeSolicitant;
      const earlier = eventsOf(def, row).filter((e) => e.personal || (subjectName && String(e.detail || "").includes(subjectName)) || (e.changes || []).some((c) => c.personal));
      const at = nowIso();
      st.anon[`${def.id}:${row.id}`] = { at, by: userName(), request, basis, reason, subjectName, redacted: earlier.map((e) => e.id) };
      st.patches[row.id] = { ...(st.patches[row.id] || {}), numeSolicitant: REDACTED };
      row.src.numeSolicitant = REDACTED; row.src.profil = null;
      logEvent(def, row, { user: userName(), role: persona().roleLabel, type: "Anonimizare date personale", category: "modificare", detail: `${basis}. ${reason}`, request, changes: [{ field: "Solicitant", before: REDACTED, after: REDACTED, personal: true }] });
      logEvent(def, row, { user: "SIA GEAP", role: "Sistem", type: "Redactare", category: "sistem", detail: `${plural(earlier.length, "eveniment anterior redactat", "evenimente anterioare redactate")} · cererea ${request}.`, redactionOf: earlier.map((e) => e.id), request });
      done(`Datele personale ale dosarului ${row.nr} au fost anonimizate.`);
    }
  }
  function done(message) {
    writeStore();
    pending = null;
    closeModal();
    U().showShellToast?.(message, "success");
    const kind = S.card?.id || document.querySelector("[data-workplace][data-registry-kind^='reg-']")?.dataset.registryKind;
    refresh(kind);
    if (S.card && !document.querySelector("[data-dosar-profil]")?.hidden) renderCard();
  }
  function onModalClick(event) {
    if (event.target.closest("[data-reg-confirm]")) { confirmPending(); return; }
    if (event.target.closest("[data-reg-export-confirm]")) exportCsv();
  }

  /* ---- US-195 Push Case: the BO right drawer */
  let pushDrawer = null;
  let pushForm = null;
  function ensurePushDrawer() {
    if (pushDrawer) return pushDrawer;
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="drawer-overlay" data-reg-push hidden>
        <button class="drawer-overlay__scrim" type="button" aria-label="Închide" data-reg-push-close></button>
        <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="reg-push-title" tabindex="-1">
          <header class="drawer__header">
            <div class="drawer__heading">
              <h2 class="drawer__title" id="reg-push-title">Transfer administrativ</h2>
              <p class="drawer__subtitle" data-reg-push-subtitle></p>
            </div>
            <button class="modal-close" type="button" aria-label="Închide" data-reg-push-close>${icon("cross-large", 16)}</button>
          </header>
          <div class="drawer__body" data-reg-push-body></div>
          <footer class="drawer__footer">
            <div class="modal-buttons">
              <button class="btn btn-neutral btn-rounded" type="button" data-reg-push-close>Anulează</button>
              <button class="btn btn-primary btn-rounded" type="button" data-reg-push-submit>Transferă dosarul</button>
            </div>
          </footer>
        </aside>
      </div>`;
    pushDrawer = wrap.firstElementChild;
    document.body.appendChild(pushDrawer);
    pushDrawer.addEventListener("click", (event) => {
      if (event.target.closest("[data-reg-push-close]")) { closePush(); return; }
      if (event.target.closest("[data-reg-push-submit]")) { submitPush(); }
    });
    pushDrawer.addEventListener("change", (event) => {
      const t = event.target;
      if (t.name === "reg-push-step") { pushForm.step = t.value; syncPushSubmit(); return; }
      if (t.matches("[data-reg-push-block]")) { pushForm.blocks[t.dataset.regPushBlock] = t.checked; renderPush(`[data-reg-push-block="${t.dataset.regPushBlock}"]`); return; }
      if (t.name === "reg-push-term") { pushForm.termMode = t.value; renderPush(`input[name="reg-push-term"][value="${t.value}"]`); return; }
      if (t.matches("[data-reg-push-authority]")) { pushForm.authority = t.value; pushForm.subdivision = ""; renderPush("#reg-push-authority"); return; }
      if (t.matches("[data-reg-push-subdivision]")) pushForm.subdivision = t.value;
      if (t.matches("[data-reg-push-status]")) pushForm.status = t.value;
      if (t.matches("[data-reg-push-role]")) pushForm.role = t.value;
    });
    pushDrawer.addEventListener("input", (event) => {
      if (event.target.id === "fo-reg-push-reason") { pushForm.reason = event.target.value; if (pushForm.errors.reason) { pushForm.errors.reason = ""; event.target.closest(".e-permits-fo-textarea")?.classList.remove("is-error"); R().setFieldError?.(event.target, ""); } syncPushSubmit(); }
    });
    pushDrawer.addEventListener("keydown", (event) => { if (event.key === "Escape" && !event.target.closest("[aria-expanded='true'], .date-picker-panel:not([hidden])")) { event.stopPropagation(); closePush(); } });
    return pushDrawer;
  }
  function openPush(def, row) {
    const s = row.src;
    pushForm = {
      kind: def.id, rowId: row.id, step: "", reason: "", blocks: { status: false, sub: false, term: false },
      status: s.status, role: row.actorRol || "Specialist", authority: "ANSP", subdivision: s.subdiviziune, termMode: "auto", manualDate: "",
      errors: {}, notice: "", back: document.activeElement, version: s.status
    };
    renderPush();
    const d = ensurePushDrawer();
    d.hidden = false;
    document.body.classList.add("is-drawer-open");
    requestAnimationFrame(() => d.querySelector('input[name="reg-push-step"]')?.focus());
  }
  function closePush() {
    if (!pushDrawer || pushDrawer.hidden) return;
    pushDrawer.hidden = true;
    document.body.classList.remove("is-drawer-open");
    pushForm?.back?.focus?.();
    pushForm = null;
    pending = null;
  }
  const subdivisionsOf = (code) => (code === "ANSP" ? A().dossierStore?.()?.subdiviziuni || authorityOf("ANSP").subdivisions : authorityOf(code).subdivisions || []);
  const termOf = (stepId) => { const st = stepOf(stepId); const d = toDate(caseToday()) || new Date(); d.setDate(d.getDate() + (st?.term || 0)); return dayIso(d); };
  function renderPush(focusSel = "") {
    const F = pushForm;
    const def = defOf(F.kind);
    const row = findRow(def, F.rowId);
    const d = ensurePushDrawer();
    const s = row.src;
    const current = STATUS_STEP[s.status];
    d.querySelector("[data-reg-push-subtitle]").textContent = `${row.serviciu} · ${PROCESS.name} ${PROCESS.version}`;
    const targets = STEPS.filter((st) => st.kind === "human" || st.kind === "final");
    const statuses = Object.entries(dossierStatuses()).filter(([k]) => k !== "schita");
    const select = (id, attrs, options, value) => U().renderFoSelectControl?.({ id, attrs, optionsHtml: options.map(([v, l]) => `<option value="${esc(v)}"${v === value ? " selected" : ""}>${esc(l)}</option>`).join("") }) || "";
    const field = (id, label, control, { span = 12, required = true } = {}) => `<div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}"><label for="${id}">${esc(label)}${required ? U().requiredMark?.() || "" : ""}</label>${control}</div>`;
    const recalculated = termOf(F.step || current);
    d.querySelector("[data-reg-push-body]").innerHTML = `
      ${F.notice ? `<div class="e-permits-reg-notices">${U().renderNotice?.("error", F.notice, { role: "alert" }) || ""}</div>` : ""}
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">Situația curentă</h3>
        <div class="e-permits-user-create__section-content">
          <div class="e-permits-dosar-profil__card">
            ${[["Număr dosar", copy(row.nr)], ["Procesul curent", esc(`${PROCESS.name} · ${PROCESS.version}`)], ["Etapa curentă", esc(stepOf(current)?.name || "—")], ["Statut", tag(row.statut, caseTone(row))], ["Termenul curent", esc(longDate(s.termenExaminare) || "—")]].map(detailRow).join("")}
          </div>
        </div>
      </section>
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title" id="reg-push-step-label">Transferă la etapa${U().requiredMark?.() || ""}</h3>
        <div class="e-permits-user-create__section-content">
          <div class="radio-group e-permits-reg-steps" role="radiogroup" aria-labelledby="reg-push-step-label">
            ${targets.map((st) => `
              <label class="radio radio--small e-permits-reg-step">
                <input class="radio-input" type="radio" name="reg-push-step" value="${st.id}"${F.step === st.id ? " checked" : ""}>
                <span class="radio-custom" aria-hidden="true"></span>
                <span class="radio-texts">
                  <span class="radio-label">${esc(st.name)}${st.id === current ? ` ${tag("Etapa curentă", "brand")}` : ""}</span>
                  <span class="radio-description">${esc(st.kind === "final" ? "Etapă finală" : `${st.role} · termen ${plural(st.term, "zi", "zile")}`)}</span>
                </span>
              </label>`).join("")}
          </div>
          ${U().renderInfoNote?.("Lista conține doar etapele umane și finale ale versiunii de proces a dosarului. Etapele automate, deciziile și subprocesele nu pot fi țintă.") || ""}
        </div>
      </section>
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">Motiv</h3>
        <div class="e-permits-user-create__section-content">
          ${R().fieldHtml?.({ id: "reg-push-reason", type: "textarea", label: "Motivul intervenției", required: true, rows: 3, maxLength: 500, charCounter: true, value: F.reason, placeholder: "De ex. pasul automat de emitere a eșuat; dosarul revine la semnare", hint: "Minimum 10 caractere. Se păstrează doar în jurnalul de audit." }) || ""}
        </div>
      </section>
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">Modificări suplimentare</h3>
        <div class="e-permits-user-create__section-content e-permits-reg-blocks">
          ${A().renderToggle?.({ label: "Schimbă statutul și rolul", description: "Altfel se aplică statutul și rolul etapei alese.", checked: F.blocks.status, attrs: 'data-reg-push-block="status"' })}
          ${F.blocks.status ? `<div class="e-permits-user-create__grid">
            ${field("reg-push-status", "Statut nou", select("reg-push-status", "data-reg-push-status", statuses.map(([k, v]) => [k, v.label]), F.status), { span: 6 })}
            ${field("reg-push-role", "Rol nou", select("reg-push-role", "data-reg-push-role", ROLES.map((r) => [r, r]), F.role), { span: 6 })}
          </div>` : ""}
          ${A().renderToggle?.({ label: "Transferă la altă subdiviziune", description: "Lista subdiviziunilor urmează autoritatea aleasă.", checked: F.blocks.sub, attrs: 'data-reg-push-block="sub"' })}
          ${F.blocks.sub ? `<div class="e-permits-user-create__grid">
            ${field("reg-push-authority", "Autoritate", select("reg-push-authority", "data-reg-push-authority", (S.data?.authorities || []).map((a) => [a.code, a.name]), F.authority), { span: 6 })}
            ${field("reg-push-subdivision", "Subdiviziune", select("reg-push-subdivision", "data-reg-push-subdivision", [["", "Alege subdiviziunea"], ...subdivisionsOf(F.authority).map((x) => [x, x])], F.subdivision), { span: 6 })}
          </div>` : ""}
          ${A().renderToggle?.({ label: "Schimbă termenul", description: "Recalculare după etapa aleasă sau o dată introdusă manual.", checked: F.blocks.term, attrs: 'data-reg-push-block="term"' })}
          ${F.blocks.term ? `
            <div class="radio-group e-permits-reg-steps" role="radiogroup" aria-label="Termenul nou">
              <label class="radio radio--small"><input class="radio-input" type="radio" name="reg-push-term" value="auto"${F.termMode === "auto" ? " checked" : ""}><span class="radio-custom" aria-hidden="true"></span><span class="radio-texts"><span class="radio-label">Recalculare automată</span><span class="radio-description">Termen nou: ${esc(longDate(recalculated))} (termenul complet al etapei)</span></span></label>
              <label class="radio radio--small"><input class="radio-input" type="radio" name="reg-push-term" value="manual"${F.termMode === "manual" ? " checked" : ""}><span class="radio-custom" aria-hidden="true"></span><span class="radio-texts"><span class="radio-label">Dată manuală</span></span></label>
            </div>
            ${F.termMode === "manual" ? `<div class="e-permits-user-create__grid">${R().fieldHtml?.({ id: "reg-push-date", type: "date", label: "Termenul nou", required: true, span: 6, value: F.manualDate, min: caseToday() }) || ""}</div>` : ""}` : ""}
        </div>
      </section>`;
    R().bind?.(d.querySelector("[data-reg-push-body]"));
    syncPushSubmit();
    if (focusSel) d.querySelector(focusSel)?.focus();
  }
  /* AC-05: inactive until a target step and a reason of ≥ 10 characters */
  function syncPushSubmit() {
    const btn = pushDrawer?.querySelector("[data-reg-push-submit]");
    if (!btn || !pushForm) return;
    const ok = Boolean(pushForm.step) && pushForm.reason.trim().length >= 10;
    if (ok) btn.removeAttribute("aria-disabled"); else btn.setAttribute("aria-disabled", "true");
    if (ok) delete btn.dataset.tooltipReason;
    else btn.dataset.tooltipReason = !pushForm.step ? "Alege etapa la care transferi dosarul." : "Scrie motivul intervenției (minimum 10 caractere).";
  }
  function submitPush() {
    const F = pushForm;
    if (!F) return;
    const btn = pushDrawer.querySelector("[data-reg-push-submit]");
    if (btn.getAttribute("aria-disabled") === "true") return;
    const def = defOf(F.kind);
    const row = findRow(def, F.rowId);
    const s = row.src;
    if (F.blocks.sub && !F.subdivision) { pushDrawer.querySelector("#reg-push-subdivision")?.focus(); return; }
    if (F.blocks.term && F.termMode === "manual") {
      const input = pushDrawer.querySelector("#fo-reg-push-date");
      const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(input?.value.trim() || "");
      if (!m) { R().setFieldError?.(input, "Introdu data în formatul ZZ/LL/AAAA."); input?.focus(); return; }
      F.manualDate = `${m[3]}-${m[2]}-${m[1]}`;
    }
    /* AC-12: transferred in another session while the panel was open → refused, the dossier stays where the other user
       put it, the panel shows the new situation */
    if (params.get("concurent") === "1" && !F.conflictShown) {
      F.conflictShown = true;
      const st = readStore();
      st.patches[row.id] = { ...(st.patches[row.id] || {}), status: "spreCoordonare" };
      s.status = "spreCoordonare"; s.profil = null;
      logEvent(def, row, { user: "Elena Caragia", role: "Administrator central", type: "Transfer administrativ (GEAP.CASE.PUSHED)", category: "modificare", detail: "Etapa: Examinarea dosarului → Coordonarea deciziei. Motiv: verificare finalizată în afara sistemului.", changes: [{ field: "Etapa", before: "Examinarea dosarului", after: "Coordonarea deciziei" }] });
      writeStore();
      F.notice = "<strong>Transferul nu s-a aplicat.</strong> Dosarul a fost transferat între timp de Elena Caragia la „Coordonarea deciziei”. Verifică situația curentă și alege din nou etapa.";
      F.step = "";
      renderPush();
      pushDrawer.querySelector(".drawer__body")?.scrollTo?.(0, 0);
      return;
    }
    const from = stepOf(STATUS_STEP[s.status]);
    const to = stepOf(F.step);
    const before = { status: s.status, sub: s.subdiviziune, term: s.termenExaminare, statut: row.statut };
    const patch = {};
    /* the step decides status / role / term unless a block sets them explicitly (blocks win, US-195 Assumptions) */
    patch.status = F.blocks.status ? F.status : to.status;
    if (F.blocks.sub) patch.subdiviziune = F.subdivision;
    if (to.kind === "human") patch.termenExaminare = F.blocks.term && F.termMode === "manual" ? F.manualDate : termOf(to.id);
    const blocks = [F.blocks.status && "statut și rol", F.blocks.sub && "subdiviziune", F.blocks.term && (F.termMode === "manual" ? "termen (dată manuală)" : "termen (recalculat)")].filter(Boolean);
    const st = readStore();
    st.patches[row.id] = { ...(st.patches[row.id] || {}), ...patch };
    Object.assign(s, patch); s.profil = null;
    const reopened = FINAL.includes(before.status) && to.kind === "human";
    logEvent(def, row, {
      user: userName(), role: persona().roleLabel, type: "Transfer administrativ (GEAP.CASE.PUSHED)", category: "modificare",
      detail: `Etapa: ${from?.name || "—"} → ${to.name}. Motiv: ${F.reason.trim()}${blocks.length ? `. Blocuri aplicate: ${blocks.join(", ")}` : ""}.${reopened ? " Dosarul finalizat a redevenit activ." : ""} Nicio notificare trimisă.`,
      changes: [
        { field: "Etapa", before: from?.name || "—", after: to.name },
        patch.status !== before.status && { field: "Statut", before: before.statut, after: dossierStatuses()[patch.status]?.label || patch.status },
        patch.subdiviziune && patch.subdiviziune !== before.sub && { field: "Subdiviziune", before: before.sub, after: patch.subdiviziune },
        patch.termenExaminare && patch.termenExaminare !== before.term && { field: "Termen", before: longDate(before.term) || "—", after: longDate(patch.termenExaminare) }
      ].filter(Boolean)
    });
    writeStore();
    const nr = row.nr;
    closePush();
    U().showShellToast?.(`Dosarul ${nr} a fost transferat la „${to.name}”.${reopened ? " Dosarul a redevenit activ." : ""}`, "success");
    refresh(def.id);
    if (S.card && !document.querySelector("[data-dosar-profil]")?.hidden) renderCard();
  }

  /* ---- export (US-194 AC-06/07 · US-196 AC-06 · US-197 AC-06): the BO export dialog, CSV only (user decision
     gh-01e), the visible columns in the shown order, with the search / filters / sort applied */
  let exportCache = null;
  function openExport(id, rows) {
    const def = defOf(id);
    exportCache = { id, rows };
    openModal({
      kind: "export",
      title: `Exportă ${def.name.replace(/^Registr(u|ul)\b/, (m) => m.toLocaleLowerCase("ro"))}`,
      subtitle: `${plural(rows.length, "înregistrare", "înregistrări")} · filtrele aplicate și coloanele afișate`,
      body: `<p class="e-permits-passport__lead">Fișierul se descarcă în format CSV, în ordinea de sortare din registru.</p>
        ${U().renderInfoNote?.("Registrul conține date cu caracter personal: exportul se înregistrează în Jurnalul de audit.") || ""}`,
      footer: footerOf("Exportă CSV", "data-reg-export-confirm", { iconName: "export" })
    });
  }
  function exportCsv() {
    if (!exportCache) return;
    const def = defOf(exportCache.id);
    const cols = columnsOf(def).filter((c) => c.visible);
    const head = cols.map((c) => c.label);
    const lines = exportCache.rows.map((row) => cols.map((c) => textOf(row, c.key)));
    const name = `${def.id.replace(/^reg-/, "registru-")}.csv`;
    const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const blob = new Blob(["﻿" + [head, ...lines].map((line) => line.map(cell).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    closeModal();
    U().showShellToast?.(`Am exportat ${plural(lines.length, "înregistrare", "înregistrări")} în ${name}.`, "success");
    exportCache = null;
  }

  /* ---------------------------------------------------------------- delegated clicks / inputs */
  document.addEventListener("click", (event) => {
    const t = event.target;
    if (!(t instanceof Element)) return;
    const act = t.closest("[data-reg-action]");
    if (act) {
      if (act.getAttribute("aria-disabled") === "true") return;
      event.preventDefault();
      document.querySelectorAll("[data-stack-menu]:not([hidden])").forEach((menu) => { menu.hidden = true; });
      document.querySelectorAll("[data-stack-menu-trigger][aria-expanded='true']").forEach((b) => b.setAttribute("aria-expanded", "false"));
      runAction(act.dataset.regKind, act.dataset.regRow, act.dataset.regAction);
      return;
    }
    const tabBtn = t.closest("[data-reg-tab]");
    if (tabBtn && S.card) {
      S.card.tab = tabBtn.dataset.regTab;
      renderCard({ keepFocus: "" });
      A().els?.dosarProfilTabs?.querySelector(`[data-reg-tab="${S.card.tab}"]`)?.focus();
      A().writeHash?.(`#registru/${S.card.id}/${S.card.rowId}/${S.card.tab}`);
      return;
    }
    if (!S.card) return;
    const def = defOf(S.card.id);
    const row = def && findRow(def, S.card.rowId);
    if (!row) return;
    const chip = t.closest("[data-reg-ev-filter]");
    if (chip) { S.ev.filter = chip.dataset.regEvFilter; refreshJournal(def, row, `[data-reg-ev-filter="${S.ev.filter}"]`); return; }
    if (t.closest("[data-reg-ev-sort]")) { S.ev.sort = S.ev.sort === "desc" ? "asc" : "desc"; refreshJournal(def, row, "[data-reg-ev-sort]"); return; }
    const open = t.closest("[data-reg-ev-open]");
    if (open) openEvent(def, row, open.dataset.regEvOpen);
  });
  document.addEventListener("input", (event) => {
    const input = event.target.closest?.("[data-reg-ev-search]");
    if (!input || !S.card) return;
    S.ev.query = input.value;
    const def = defOf(S.card.id);
    const row = findRow(def, S.card.rowId);
    if (row) refreshJournal(def, row);
  });
  /* the crumb back to the register (shell closeDosarProfil) — forget the open card */
  document.addEventListener("click", (event) => {
    if (event.target.closest?.("[data-dosar-profil-crumb-back]")) S.card = null;
  }, true);

  /* ---------------------------------------------------------------- routes */
  const routeTo = async (hash) => {
    await load();
    const who = persona();
    if (hash === "#registre") {
      const nav = document.querySelector('[data-nav-item][data-nav-id="registre"]');
      if (nav) nav.click(); else showDenied("Registre");
      return;
    }
    let m = hash.match(/^#(reg-[a-z]+)$/);
    if (m) {
      const def = defOf(m[1]);
      const nav = document.querySelector(`[data-nav-item][data-nav-id="${m[1]}"]`);
      if (def?.deprecated) { showDeprecated(def); return; }
      if (def && granted(def, who) && nav) nav.click(); else showDenied(def?.name || "Registru");
      return;
    }
    m = hash.match(/^#registru\/(reg-[a-z]+)\/([^/]+)(?:\/([^/]+))?$/);
    if (m) {
      const def = defOf(m[1]);
      if (def?.deprecated) { showDeprecated(def); return; }
      if (!def || !granted(def, who)) { showDenied(def?.name || "Registru"); return; }
      /* the register under the card (the crumb returns to it), drawn without touching the address */
      if (document.querySelector("[data-workplace]")?.dataset.registryKind !== m[1]) {
        A().showRegistry?.(registryDb(m[1]), { sortKey: def.defaultSort?.key || null, sortDirection: def.defaultSort?.dir || "desc" });
      }
      openCard(m[1], decodeURIComponent(m[2]), m[3] || "detalii", { push: false });
    }
  };
  window.GEAPShellRoutes = window.GEAPShellRoutes || [];
  window.GEAPShellRoutes.push((hash) => {
    if (!/^#(registre|reg-[a-z]+|registru\/.+)$/.test(hash)) return false;
    routeTo(hash);
    return true;
  });

  /* tabs: ← / → / Home / End move between the record card's tabs (as the BO profile tabs) */
  document.addEventListener("keydown", (event) => {
    const tabBtn = event.target.closest?.("[data-reg-tab]");
    if (!tabBtn || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const all = [...tabBtn.parentElement.querySelectorAll("[data-reg-tab]")];
    const i = all.indexOf(tabBtn);
    const next = event.key === "Home" ? all[0] : event.key === "End" ? all[all.length - 1] : all[(i + (event.key === "ArrowRight" ? 1 : -1) + all.length) % all.length];
    event.preventDefault();
    next?.click();
  });
  load();

  /* for demo states / probes */
  window.GEAPRegistre = {
    load, openCard, persona, rowsOf: (id) => rowsOf(defOf(id)), store: readStore,
    /* registre-v2 — the AdminPortal builder (js/registre-admin.js) */
    data: () => S.data, catalog, recordOf, commit, boDefOf, defOf, adminPerms, adminSees,
    fieldsOf, fieldOf, columnFrom, objects: OBJECTS, scopes: SCOPES, fieldTypes: FIELD_TYPES, filterSupport: FILTER_SUPPORT, serviceOf, targetLabel,
    /* the distinct values of a source field (value lists of the predefined-filter rules) */
    valuesOf: (object, key) => [...new Set((SOURCES[object]?.() || []).map((row) => textOf(row, key)).filter((v) => v && v !== "—"))].sort((a, b) => a.localeCompare(b, "ro")),
    openModal, closeModal, footerOf, detailRow, tag, icon, esc, longDate, stamp, nowIso, userName, plural, clone, showPage
  };
})();
