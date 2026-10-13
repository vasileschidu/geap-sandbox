/* Form Builder (Form Designer) — composes the request form („Detalii cerere”) of any service.
   Spec: tools/persona-test/specs/svc/form-builder.md (batches 0–1, 2026-10-13).

   One schema → one renderer → three surfaces: the canvas cards, the Preview and the request form
   all draw a field with the FO renderer (window.GEAPFormRender.fieldHtml = stepFieldHtml in
   js/e-permits-acte-permisive.js). Component markup comes from the back-office helpers
   (window.GEAPUi, js/e-permits-shell.js): renderCheckOption, renderToggle, renderNotice,
   renderInfoNote, renderFoSelectControl, renderStackMenu, askConfirm. CSS: css/form-builder.css.

   Model (sandbox DB geap.formBuilderSandboxDb.v2, seeded from data/form-builder-db.json):
     form → steps[] (service steps edit; platform steps locked) → sections[] → fields[]
   Selection drives the right panel: nothing → „Date generale formular”, step → „Pas”, section →
   „Secțiune”, field → tabs General · Date · Validare · Logică · Avansat (by component). */
document.addEventListener("DOMContentLoaded", () => {
  const builder = document.querySelector(".e-permits-builder");
  const R = window.GEAPFormRender;
  if (!builder || !R) return;
  const ui = () => window.GEAPUi || {};
  /* ?fbframe=1: this page is the phone frame of a builder's Preview (Desktop / Mobil) — it shows
     only the Preview and draws whatever the parent posts (form, step, language) */
  const FRAME = new URLSearchParams(window.location.search).get("fbframe") === "1";
  const overlay = builder.closest("#form-builder-modal");
  if (overlay && overlay.parentElement !== document.body) document.body.appendChild(overlay);

  const q = (sel, root = builder) => root.querySelector(sel);
  const el = {
    workspace: q("[data-builder-workspace]"),
    library: q("[data-fb-library]"),
    search: q("[data-builder-library-search]"),
    header: q("[data-fb-service-header]"),
    steps: q("[data-fb-steps]"),
    canvas: q("[data-builder-canvas]"),
    scroll: q("[data-fb-canvas-scroll]"),
    preview: q("[data-builder-preview]"),
    previewStepper: q("[data-builder-preview-stepper]"),
    previewBody: q("[data-fb-preview-body]"),
    schema: q("[data-builder-schema]"),
    schemaCode: q("[data-builder-schema-code]"),
    panel: q("[data-fb-panel]"),
    errors: q("[data-fb-errors]"),
    errorsLabel: q("[data-fb-errors-label]"),
    issuesMenu: q("[data-fb-issues-menu]"),
    publish: q("[data-fb-publish]"),
    version: q("[data-fb-version]"),
    live: q("[data-fb-live]"),
    viewTitle: q("[data-builder-view-title]"),
  };
  const registryModal = document.querySelector("#builder-classifier-registry");
  if (!el.canvas || !el.panel || !el.library) return;
  /* the registry lives in the shell markup, hidden on ?flow=builder: it opens above the editor */
  if (registryModal && registryModal.parentElement !== document.body) document.body.appendChild(registryModal);

  /* ---------------------------------------------------------------- helpers */
  const esc = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const icon = (id, size = 20) => `<svg class="icon" width="${size}" height="${size}" aria-hidden="true"><use href="assets/icons/sprite.svg#${id}"></use></svg>`;
  const LANGS = [["ro", "Română"], ["ru", "Rusă"], ["en", "Engleză"]];
  const tr = (value, lang = "ro") => (value && typeof value === "object" ? String(value[lang] || "") : lang === "ro" ? String(value ?? "") : "");
  const i18n = (ro = "") => ({ ro, ru: "", en: "" });
  const uid = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const normalize = (value) => String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const getPath = (obj, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
  const setPath = (obj, path, value) => {
    const keys = path.split(".");
    let o = obj;
    keys.slice(0, -1).forEach((k) => { if (o[k] == null || typeof o[k] !== "object") o[k] = {}; o = o[k]; });
    o[keys[keys.length - 1]] = value;
  };
  const RO_MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
  const longDate = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? "" : `${d.getDate()} ${RO_MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
  const isoToRo = (iso) => (iso ? iso.split("-").reverse().join("/") : "");
  const announce = (text) => { if (!el.live) return; el.live.textContent = ""; window.setTimeout(() => { el.live.textContent = text; }, 30); };
  const currentUser = () => document.querySelector(".e-permits-shell__user-name")?.textContent.trim() || "Vasile Schidu";

  /* ------------------------------------------------- component registry (spec § C) */
  const SPANS = [3, 4, 6, 8, 12];
  const SPAN_TEXT = { 3: "un sfert — 4 pe rând", 4: "o treime — 3 pe rând", 6: "jumătate — 2 pe rând", 8: "două treimi", 12: "toată lățimea" };
  const CATEGORIES = [
    ["basic", "Câmpuri de bază"],
    ["choice", "Alegere"],
    ["registry", "Date din registre"],
    ["repeat", "Repetitive"],
    ["files", "Fișiere"],
    ["structure", "Structură"],
    ["advanced", "Avansat"],
  ];
  const T_GEN = "general", T_DATA = "data", T_VAL = "validation", T_LOGIC = "logic", T_ADV = "advanced";
  const TAB_LABELS = { general: "General", data: "Date", validation: "Validare", logic: "Logică", advanced: "Avansat" };
  const INPUT_TABS = [T_GEN, T_VAL, T_LOGIC, T_ADV];
  const CHOICE_TABS = [T_GEN, T_DATA, T_VAL, T_LOGIC, T_ADV];
  /* type → label, icon, category, palette line, default span, tabs, defaults; `soon` = the batch
     that builds it (listed, not usable yet — no faked components) */
  const COMPONENTS = {
    text: { label: "Text", icon: "icon-text-bold", category: "basic", desc: "Răspuns scurt, pe un rând", span: 4, tabs: INPUT_TABS, defaults: () => ({ maxLength: 100, counter: false, validation: { preset: "none", pattern: "", minLength: "", message: i18n() } }) },
    textarea: { label: "Text multilinie", icon: "icon-page-text", category: "basic", desc: "Răspuns lung, pe mai multe rânduri", span: 12, tabs: INPUT_TABS, defaults: () => ({ rows: 2, maxLength: 250, counter: true, validation: { minLength: "", message: i18n() } }) },
    number: { label: "Număr", icon: "icon-hashtag", category: "basic", desc: "Întreg sau zecimal, cu unitate", span: 3, tabs: INPUT_TABS, defaults: () => ({ numberKind: "integer", decimals: 0, unit: "", validation: { min: "", max: "", message: i18n() } }) },
    money: { label: "Sumă", icon: "icon-coins", category: "basic", desc: "Sumă de bani, cu monedă", span: 3, tabs: INPUT_TABS, defaults: () => ({ currency: "MDL", decimals: 2, validation: { min: 0, max: "", message: i18n() } }) },
    email: { label: "Email", icon: "icon-envelope", category: "basic", desc: "Adresă de e-mail validată", span: 4, tabs: INPUT_TABS, defaults: () => ({ validation: { message: i18n("Adresa email nu este validă.") } }) },
    phone: { label: "Telefon", icon: "icon-phone", category: "basic", desc: "Număr de telefon cu prefix", span: 4, tabs: INPUT_TABS, defaults: () => ({ phoneKind: "any", validation: { message: i18n() } }) },
    date: { label: "Dată", icon: "icon-calendar", category: "basic", desc: "Calendar, format ZZ/LL/AAAA", span: 3, tabs: INPUT_TABS, defaults: () => ({ dateDefault: "none", dateMin: { mode: "none", value: "" }, dateMax: { mode: "none", value: "" }, validation: { message: i18n() } }) },
    select: { label: "Listă derulantă", icon: "icon-chevron-bottom", category: "choice", desc: "O valoare dintr-un clasificator", span: 4, tabs: CHOICE_TABS, defaults: () => ({ dataSource: null }) },
    multiselect: { label: "Selecție multiplă", icon: "icon-check-all", category: "choice", desc: "Mai multe valori, cu căutare", span: 6, tabs: CHOICE_TABS, defaults: () => ({ dataSource: null, validation: { minSelected: "", maxSelected: "", message: i18n() } }) },
    radio: { label: "Butoane radio", icon: "icon-list-bullets", category: "choice", desc: "O singură opțiune din câteva", span: 12, tabs: CHOICE_TABS, defaults: () => ({ orientation: "vertical", options: [{ value: "optiunea-1", label: "Opțiunea 1" }, { value: "optiunea-2", label: "Opțiunea 2" }] }) },
    segment: { label: "Comutator segmentat", icon: "icon-carousel", category: "choice", desc: "2–5 opțiuni scurte", span: 6, tabs: CHOICE_TABS, defaults: () => ({ options: [{ value: "optiunea-1", label: "Opțiunea 1" }, { value: "optiunea-2", label: "Opțiunea 2" }] }) },
    checkbox: { label: "Casetă de bifare", icon: "icon-checkmark-small", category: "choice", desc: "Da / Nu, o singură bifă", span: 12, tabs: INPUT_TABS, defaults: () => ({ defaultChecked: false }) },
    checklist: { label: "Listă de bifare", icon: "icon-checklist", category: "choice", desc: "Mai multe opțiuni bifate", span: 12, tabs: CHOICE_TABS, defaults: () => ({ options: [{ value: "optiunea-1", label: "Opțiunea 1" }, { value: "optiunea-2", label: "Opțiunea 2" }], validation: { minSelected: "", maxSelected: "", message: i18n() } }) },
    idnp: { label: "IDNP (persoană)", icon: "icon-id-card", category: "registry", desc: "Verificare în Registrul populației", soon: 3 },
    idno: { label: "IDNO (companie)", icon: "icon-business", category: "registry", desc: "Verificare în Registrul unităților de drept", soon: 3 },
    address: { label: "Adresă", icon: "icon-map-pin", category: "registry", desc: "Adresă structurată, cod cadastral", span: 12, tabs: CHOICE_TABS, defaults: () => ({ addressConfig: [] }) },
    contact: { label: "Persoana de contact", icon: "icon-contacts", category: "registry", desc: "Eu / altă persoană", soon: 3 },
    subdivision: { label: "Subdiviziune", icon: "icon-group", category: "registry", desc: "Subdiviziunea care examinează", soon: 3 },
    grid: { label: "Grilă editabilă", icon: "icon-dot-grid", category: "repeat", desc: "Tabel cu rânduri adăugate de solicitant", soon: 4 },
    repeat: { label: "Bloc repetabil", icon: "icon-page-add", category: "repeat", desc: "„Adaugă alt…” pentru obiecte repetate", soon: 4 },
    file: { label: "Fișier", icon: "icon-attachment", category: "files", desc: "Încărcare PDF, imagini", soon: 3 },
    mdocs: { label: "Document din MDocs", icon: "icon-cloud-upload", category: "files", desc: "Alege din MDocs sau încarcă", soon: 3 },
    section: { label: "Secțiune", icon: "icon-templates", category: "structure", desc: "Grupează câmpurile, cu titlu", structural: true },
    info: { label: "Text informativ", icon: "icon-circle-info", category: "structure", desc: "Notă pentru solicitant", span: 12, tabs: [T_GEN, T_LOGIC], defaults: () => ({ tone: "neutral", text: i18n("Text informativ pentru solicitant.") }) },
    callout: { label: "Notă cu titlu", icon: "icon-bubble-alert", category: "structure", desc: "Explicație mai lungă, cu titlu", span: 12, tabs: [T_GEN, T_LOGIC], defaults: () => ({ tone: "info", title: i18n("Titlul notei"), text: i18n("Explicația pentru solicitant.") }) },
    separator: { label: "Separator", icon: "icon-minus-small", category: "structure", desc: "Linie între grupuri de câmpuri", span: 12, tabs: [T_GEN] },
    hidden: { label: "Câmp ascuns", icon: "icon-data-access", category: "advanced", desc: "Valoare din context, nevăzută", soon: 3 },
    calc: { label: "Câmp calculat", icon: "icon-calculator", category: "advanced", desc: "Formulă din alte câmpuri", soon: 5 },
    consent: { label: "Consimțământ", icon: "icon-shield", category: "advanced", desc: "Declarație pe propria răspundere", soon: 3 },
    datetime: { label: "Dată și oră", icon: "icon-time", category: "advanced", desc: "Dată cu oră și minut", soon: 5 },
    period: { label: "Perioadă", icon: "icon-calendar-edit", category: "advanced", desc: "De la — până la, două date", span: 6, tabs: INPUT_TABS, defaults: () => ({ fromLabel: i18n("De la"), toLabel: i18n("Până la"), dateMin: { mode: "none", value: "" }, maxDays: "", validation: { message: i18n() } }) },
    tree: { label: "Arbore", icon: "icon-tree", category: "advanced", desc: "Clasificator ierarhic", soon: 2 },
  };
  const comp = (type) => COMPONENTS[type] || COMPONENTS.text;
  /* content-only components: no label, no key, no value (Text informativ, Notă cu titlu, Separator) */
  const NO_VALUE = ["info", "callout", "separator"];
  const fieldName = (field) => (field.type === "callout" ? tr(field.title) || "Notă cu titlu" : NO_VALUE.includes(field.type) ? comp(field.type).label : tr(field.label) || comp(field.type).label);
  const usesSource = (type) => type === "select" || type === "multiselect";
  const isUsable = (type) => Boolean(COMPONENTS[type] && !COMPONENTS[type].soon);

  /* ------------------------------------------- classifier registry (US-22, moved from the old builder) */
  const classifierRegistry = [
    { id: "reg_caem", displayName: "Coduri CAEM", physicalTable: "GEAP_d_caem", visibility: "global", multilingual: true, searchable: true, rowCount: 2, availableColumns: ["code", "name"], treeKey: "code", parentColumns: ["parent_code"] },
    { id: "reg_raioane", displayName: "Raioane", physicalTable: "GEAP_d_raioane", visibility: "global", multilingual: true, searchable: false, rowCount: 43, availableColumns: ["code", "name"] },
    { id: "reg_localitati", displayName: "Localități", physicalTable: "GEAP_d_localitati", visibility: "global", multilingual: true, searchable: true, rowCount: 1843, availableColumns: ["code", "name"], parentColumns: ["raion_id"] },
    { id: "reg_tari", displayName: "Țări", physicalTable: "GEAP_d_tari", visibility: "global", multilingual: true, searchable: true, rowCount: 4, availableColumns: ["code", "name"] },
    { id: "reg_strazi", displayName: "Străzi", physicalTable: "GEAP_d_strazi", visibility: "global", multilingual: false, searchable: true, rowCount: 493, availableColumns: ["code", "name"], parentColumns: ["locality_id"] },
    { id: "reg_risc_comert", displayName: "Categorii risc comerț", physicalTable: "GEAP_d_Service_C01394_CategoriiRisc", visibility: "service", multilingual: false, searchable: false, rowCount: 12, availableColumns: ["code", "name"] },
    { id: "reg_institutii", displayName: "Instituții emitente", physicalTable: "GEAP_d_InstitutiiEmitente", visibility: "authority", multilingual: true, searchable: true, rowCount: 37, availableColumns: ["code", "name"] },
  ];
  const CLASSIFIER_ROWS = {
    reg_caem: [{ code: "I 56.10", name: "Restaurante" }, { code: "I 56.30", name: "Baruri și alte activități de servire a băuturilor" }, { code: "G 47.11", name: "Comerț cu amănuntul în magazine nespecializate" }],
    reg_raioane: [{ code: "01", name: "Chișinău" }, { code: "02", name: "Bălți" }, { code: "03", name: "Anenii Noi" }, { code: "04", name: "Cahul" }, { code: "05", name: "Orhei" }],
    reg_localitati: [{ code: "0100", name: "mun. Chișinău" }, { code: "0200", name: "mun. Bălți" }],
    reg_tari: [{ code: "MD", name: "Republica Moldova" }, { code: "RO", name: "România" }, { code: "UA", name: "Ucraina" }],
    reg_strazi: [{ code: "101", name: "bd. Ștefan cel Mare și Sfânt" }, { code: "102", name: "str. Pușkin" }],
    reg_risc_comert: [{ code: "1", name: "Risc redus" }, { code: "2", name: "Risc sporit" }],
    reg_institutii: [{ code: "ANSA", name: "Agenția Națională pentru Siguranța Alimentelor" }, { code: "ANSP", name: "Agenția Națională pentru Sănătate Publică" }],
  };
  const VISIBILITY_LABELS = { global: "Global", authority: "Autoritate", service: "Serviciu" };
  const getClassifier = (id) => classifierRegistry.find((item) => item.id === id) || null;
  const TEMPLATES = [["name", "Denumire"], ["code-name", "Cod • Denumire"], ["code-dash-name", "Cod — Denumire"]];
  const displayLabel = (row, template) => (template === "code-name" && row.code ? `${row.code} • ${row.name}` : template === "code-dash-name" && row.code ? `${row.code} — ${row.name}` : row.name);
  const physicalNameFor = (technical, visibility) => {
    const clean = String(technical || "").replace(/[^A-Za-z0-9_]/g, "");
    if (!clean) return "";
    return visibility === "service" ? `GEAP_d_Service_C01394_${clean}` : `GEAP_d_${clean}`;
  };
  const validateTechnicalName = (technical, visibility) => {
    const name = String(technical || "").trim();
    if (!name) return { ok: false, error: "Completează denumirea tehnică." };
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) return { ok: false, error: "Doar litere latine, cifre și „_”, începând cu o literă." };
    const physical = physicalNameFor(name, visibility);
    if (physical.length > 100) return { ok: false, error: "Denumirea fizică depășește 100 de caractere." };
    if (classifierRegistry.some((item) => item.physicalTable.toLowerCase() === physical.toLowerCase())) return { ok: false, error: "Există deja un clasificator cu această denumire." };
    return { ok: true, physical };
  };

  /* ----------------------------------------------------- address parts (US-32 + US-54) */
  const ADDRESS_PARTS = [
    { key: "country", label: "Țară", kind: "listă", required: true, visible: true, source: "GEAP_d_tari · 117 țări", defaultValue: "Republica Moldova" },
    { key: "district", label: "Raion/Municipiu", kind: "listă", required: true, visible: true, source: "GEAP_d_raioane · 43 raioane", parent: "Țară" },
    { key: "locality", label: "Orașul/Comuna", kind: "listă", required: true, visible: true, source: "GEAP_d_localitati · 1843 localități", parent: "Raion/Municipiu" },
    { key: "sector", label: "Sector", kind: "listă", required: false, visible: false, parent: "Orașul/Comuna", note: "Apare doar când Orașul/Comuna = Chișinău." },
    { key: "street", label: "Stradă", kind: "listă", required: true, visible: true, source: "GEAP_d_strazi · 493 străzi", parent: "Orașul/Comuna" },
    { key: "house", label: "Casă", kind: "text", required: false, visible: true },
    { key: "floor", label: "Etaj", kind: "număr", required: false, visible: true },
    { key: "block", label: "Bloc", kind: "text", required: false, visible: true },
    { key: "stair", label: "Scară", kind: "text", required: false, visible: true },
    { key: "apartment", label: "Apartament/Oficiu", kind: "text", required: false, visible: true },
    { key: "cadastral", label: "Cod cadastral", kind: "text", required: false, visible: true, source: "MConnect · SRRE · verificat în timp real", noDefault: true },
  ];
  const addressConfig = (field) => ADDRESS_PARTS.map((part) => {
    const saved = (field.addressConfig || []).find((item) => item.key === part.key) || {};
    return { ...part, visible: saved.visible ?? part.visible, required: saved.required ?? part.required, defaultValue: saved.defaultValue ?? part.defaultValue ?? "" };
  });
  const setAddressPart = (field, key, updates) => {
    const config = addressConfig(field).map((part) => (part.key === key ? { ...part, ...updates } : part));
    field.addressConfig = config.map(({ key: k, visible, required, defaultValue }) => ({ key: k, visible, required: visible ? required : false, defaultValue }));
  };

  /* ------------------------------------------------------- text validation presets (US-30) */
  const PRESETS = {
    none: { label: "Fără", pattern: "" },
    email: { label: "Email", pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$", message: "Adresa email nu este validă.", sample: "ion.popescu@exemplu.md" },
    phone: { label: "Telefon (+373)", pattern: "^\\+373[0-9]{8}$", message: "Introduceți numărul în formatul +37300000000.", sample: "+37369123456" },
    idnp: { label: "IDNP", pattern: "^[0-9]{13}$", message: "IDNP-ul are 13 cifre.", sample: "2002001234567", inputmode: "numeric" },
    idno: { label: "IDNO", pattern: "^[0-9]{13}$", message: "IDNO-ul are 13 cifre.", sample: "1003600012345", inputmode: "numeric" },
    plate: { label: "Nr. de înmatriculare (MD)", pattern: "^([A-Z]{3} [0-9]{3}|[A-Z]{2} [A-Z]{2} [0-9]{3}|[A-Z] [0-9]{3} [A-Z]{2})$", message: "Formatul: AAA 000, AA AA 000 sau A 000 AA.", sample: "ABC 123" },
    postal: { label: "Cod poștal (MD-0000)", pattern: "^MD-[0-9]{4}$", message: "Codul poștal are formatul MD-0000.", sample: "MD-2001" },
    regex: { label: "Regex personalizat", pattern: null, message: "Valoarea nu are formatul cerut." },
  };
  const presetOf = (field) => PRESETS[field.validation?.preset] || PRESETS.none;
  const patternOf = (field) => (field.validation?.preset === "regex" ? field.validation?.pattern || "" : presetOf(field).pattern || "");
  const regexError = (pattern) => { if (!pattern) return ""; try { new RegExp(pattern); return ""; } catch (error) { return "Expresia regulată nu este validă."; } };
  const CURRENCIES = [["MDL", "MDL — leu moldovenesc"], ["EUR", "EUR — euro"], ["USD", "USD — dolar SUA"]];
  const PHONE_KINDS = [["any", "Oricare"], ["mobile", "Mobil"], ["landline", "Fix"]];
  const TONES = [["neutral", "Neutru"], ["info", "Informare"], ["warning", "Atenționare"], ["success", "Succes"], ["error", "Eroare"]];
  const DATE_LIMITS = [["none", "Fără limită"], ["today", "Azi"], ["fixed", "Dată fixă"]];
  const ACCESS = [["service", "Acest serviciu"], ["authority", "Autoritatea"], ["global", "Global (toate serviciile)"]];
  const PLATFORM_STEPS = {
    applicant: "Datele solicitantului vin din MPass și registre (US-12); constructorul nu le editează.",
    documents: "Lista documentelor vine din Pașaport › Documente și din regulile de solicitare (US-225).",
    review: "Rezumatul pe secțiuni și semnarea cu MSign sunt generate de platformă (US-14, US-15).",
    payment: "Taxele și plata prin MPay vin din Pașaport › Taxe (tarife).",
    finish: "Confirmarea și livrarea actului sunt generate de platformă (US-16).",
  };

  /* ------------------------------------------------------------------- model */
  const DB_KEY = "geap.formBuilderSandboxDb.v2";
  let db = null;
  let form = null;
  const state = {
    sel: { kind: "form", id: "" },
    stepId: "",
    tab: T_GEN,
    lang: "ro",
    previewLang: "ro",
    device: "desktop",
    mode: "build",
    query: "",
    tests: {},
    addressOpen: {},
    issues: [],
    undo: [],
    redo: [],
    lastCheckpoint: { key: "", at: 0 },
  };

  const steps = () => form.steps;
  const serviceSteps = () => form.steps.filter((step) => !step.locked);
  const stepById = (id) => form.steps.find((step) => step.id === id) || null;
  const activeStep = () => stepById(state.stepId) || serviceSteps()[0] || form.steps[0];
  const allSections = () => form.steps.flatMap((step) => (step.sections || []).map((section) => ({ step, section })));
  const findSection = (id) => allSections().find((item) => item.section.id === id) || null;
  const allFields = () => allSections().flatMap(({ step, section }) => section.fields.map((field, index) => ({ step, section, field, index })));
  const findField = (id) => allFields().find((item) => item.field.id === id) || null;
  const selectedTarget = () => {
    if (state.sel.kind === "field") return findField(state.sel.id)?.field || null;
    if (state.sel.kind === "section") return findSection(state.sel.id)?.section || null;
    if (state.sel.kind === "step") return stepById(state.sel.id);
    return form;
  };
  /* the section new components land in: the selected one, the selected field's, else the last of the step */
  const activeSection = () => {
    if (state.sel.kind === "section") { const found = findSection(state.sel.id); if (found && found.step.id === activeStep().id) return found.section; }
    if (state.sel.kind === "field") { const found = findField(state.sel.id); if (found && found.step.id === activeStep().id) return found.section; }
    const list = activeStep().sections || [];
    return list[list.length - 1] || null;
  };

  /* Cheie câmp: CamelCase of the RO label, ASCII, ≤ 60, unique in the form (US-30, US-05) */
  const camelKey = (label) => {
    const words = normalize(label).replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
    let key = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join("").slice(0, 56);
    if (!key || !/^[A-Za-z]/.test(key)) key = `Camp${key}`;
    return key;
  };
  const uniqueKey = (base, exceptId = "") => {
    const taken = new Set(allFields().filter(({ field }) => field.id !== exceptId).map(({ field }) => field.key));
    if (!taken.has(base)) return base;
    for (let n = 2; ; n += 1) if (!taken.has(`${base}${n}`)) return `${base}${n}`;
  };

  function makeField(type) {
    const meta = comp(type);
    const label = type === "info" ? "Text informativ" : meta.label;
    const field = {
      id: uid("fld"),
      type,
      key: "",
      label: i18n(type === "checkbox" ? "Confirm că …" : label),
      help: i18n(),
      placeholder: i18n(),
      span: meta.span || 4,
      required: false,
      readOnly: false,
      ...(meta.defaults ? meta.defaults() : {}),
    };
    field.key = uniqueKey(camelKey(NO_VALUE.includes(type) ? `${type === "separator" ? "Separator" : "Nota"}` : tr(field.label)));
    return field;
  }

  function makeSection(title = "Secțiune nouă") {
    return { id: uid("sec"), title: i18n(title), description: i18n(), showTitle: true, showSeparator: true, fields: [] };
  }

  /* ---------------------------------------------------------------- persistence */
  function readDb() {
    try { const raw = window.localStorage.getItem(DB_KEY); const parsed = raw ? JSON.parse(raw) : null; return parsed?.forms?.length ? parsed : null; } catch { return null; }
  }
  function saveDb() {
    if (!db || !form) return;
    const index = db.forms.findIndex((item) => item.id === form.id);
    if (index >= 0) db.forms[index] = form; else db.forms.push(form);
    db.activeFormId = form.id;
    try { window.localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch { /* private mode */ }
  }
  /* corrupt or old schema → a fresh form, never a crash (US-08) */
  function sanitize(record) {
    if (!record || !Array.isArray(record.steps)) return null;
    record.steps.forEach((step) => {
      step.title = typeof step.title === "object" ? step.title : i18n(step.title || "Pas");
      step.sections = Array.isArray(step.sections) ? step.sections : [];
      step.sections.forEach((section) => {
        section.title = typeof section.title === "object" ? section.title : i18n(section.title || "Secțiune");
        section.description = typeof section.description === "object" ? section.description : i18n(section.description || "");
        section.fields = Array.isArray(section.fields) ? section.fields : [];
        section.fields.forEach((field) => {
          ["label", "help", "placeholder", "text"].forEach((key) => { if (field[key] != null && typeof field[key] !== "object") field[key] = i18n(String(field[key])); });
          field.label = field.label || i18n();
          field.help = field.help || i18n();
          field.placeholder = field.placeholder || i18n();
          field.validation = field.validation || {};
          field.validation.message = field.validation.message || i18n();
          if (!SPANS.includes(Number(field.span))) field.span = comp(field.type).span || 4;
        });
      });
    });
    return record;
  }

  /* ---------------------------------------------------------------- undo / redo */
  function checkpoint(key = "") {
    const now = Date.now();
    if (key && key === state.lastCheckpoint.key && now - state.lastCheckpoint.at < 1500) { state.lastCheckpoint.at = now; return; }
    state.undo.push(JSON.stringify(form));
    if (state.undo.length > 80) state.undo.shift();
    state.redo = [];
    state.lastCheckpoint = { key, at: now };
  }
  function restore(snapshot) {
    form = JSON.parse(snapshot);
    if (state.sel.kind === "field" && !findField(state.sel.id)) state.sel = { kind: "form", id: "" };
    if (state.sel.kind === "section" && !findSection(state.sel.id)) state.sel = { kind: "form", id: "" };
    if (!stepById(state.stepId)) state.stepId = serviceSteps()[0]?.id || form.steps[0].id;
    state.lastCheckpoint = { key: "", at: 0 };
    renderAll();
  }
  function undo() {
    if (!state.undo.length) { announce("Nu există acțiuni de anulat."); return; }
    state.redo.push(JSON.stringify(form));
    restore(state.undo.pop());
    announce("Ultima acțiune a fost anulată.");
  }
  function redo() {
    if (!state.redo.length) return;
    state.undo.push(JSON.stringify(form));
    restore(state.redo.pop());
    announce("Acțiunea a fost refăcută.");
  }

  /* ------------------------------------------------- validation summary (spec § E, F.8) */
  function validate() {
    const issues = [];
    const keys = new Map();
    allFields().forEach(({ field }) => { if (field.key) keys.set(field.key, (keys.get(field.key) || 0) + 1); });
    allFields().forEach(({ step, section, field }) => {
      const where = `${tr(step.title)} › ${tr(section.title) || "Secțiune"}`;
      const name = fieldName(field);
      const push = (tab, prop, message, level = "error", short = "") => issues.push({ level, kind: "field", id: field.id, tab, prop, name, where, message, short });
      if (field.type === "info") { if (!tr(field.text).trim()) push(T_GEN, "text", "Completează textul notei."); return; }
      if (field.type === "callout") { if (!tr(field.title).trim() && !tr(field.text).trim()) push(T_GEN, "text", "Completează titlul sau textul notei."); return; }
      if (field.type === "separator") return;
      if (!tr(field.label).trim()) push(T_GEN, "label", "Completează eticheta (RO).");
      if (!field.key) push(T_GEN, "key", "Completează cheia câmpului.");
      else if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(field.key) || field.key.length > 60) push(T_GEN, "key", "Cheia: litere latine și cifre, începe cu o literă, maximum 60.");
      else if (keys.get(field.key) > 1) push(T_GEN, "key", "Cheia există deja în acest formular.");
      const v = field.validation || {};
      const minMax = (a, b, prop) => { if (a !== "" && b !== "" && a != null && b != null && Number(a) > Number(b)) push(T_VAL, prop, "Minimul nu poate fi mai mare decât maximul."); };
      if (field.type === "text") {
        if (v.preset === "regex" && !String(v.pattern || "").trim()) push(T_VAL, "validation.pattern", "Completează expresia regulată.");
        else if (v.preset === "regex" && regexError(v.pattern)) push(T_VAL, "validation.pattern", "Expresia regulată nu este validă.");
        minMax(v.minLength, field.maxLength, "validation.minLength");
      }
      if (field.type === "textarea") minMax(v.minLength, field.maxLength, "validation.minLength");
      if (field.type === "number" || field.type === "money") minMax(v.min, v.max, "validation.max");
      if (field.type === "checklist" || field.type === "multiselect") minMax(v.minSelected, v.maxSelected, "validation.maxSelected");
      if (field.type === "date" && field.dateMin?.mode === "fixed" && field.dateMax?.mode === "fixed" && field.dateMin.value && field.dateMax.value && field.dateMin.value > field.dateMax.value) push(T_VAL, "dateMax", "Intervalul de date este gol: data minimă e după data maximă.");
      if (usesSource(field.type)) {
        const ds = field.dataSource;
        if (!ds) push(T_DATA, "ds.mode", "Lista nu are sursă de opțiuni.", "error", "Sursă neconfigurată");
        else if (ds.mode === "existing" && !ds.classifierId) push(T_DATA, "ds.classifier", "Alege clasificatorul.");
        else if (ds.mode === "new" && !ds.saved) push(T_DATA, "ds.new", "Clasificatorul nou nu a fost creat.");
        else if (ds.mode === "static" && !(ds.values || []).some((item) => item.isValid !== false && String(item.label || "").trim())) push(T_DATA, "ds.values", "Adaugă cel puțin o valoare activă.");
      }
      if (field.type === "radio" || field.type === "checklist" || field.type === "segment") {
        const options = field.options || [];
        if (options.length < 2) push(T_DATA, "options", "Adaugă cel puțin două opțiuni.");
        else if (field.type === "segment" && options.length > 5) push(T_DATA, "options", "Comutatorul are cel mult 5 opțiuni; pentru mai multe folosiți butoane radio.");
        else if (options.some((option) => !String(option.label || "").trim())) push(T_DATA, "options", "O opțiune nu are text.");
      }
    });
    /* rules: complete conditions, sources that exist, no cycles */
    const checkRules = (target, kind, name, where) => (target.rules || []).forEach((rule, ri) => rule.conditions.forEach((c, ci) => {
      const k = `${ri}.${ci}`;
      const push = (prop, message) => issues.push({ level: "error", kind, id: target.id, tab: T_LOGIC, prop, name, where, message });
      if (!c.field) push(`rules.${k}.field`, `Regula ${ri + 1}: alege câmpul condiției.`);
      else if (!findField(c.field)) push(`rules.${k}.field`, `Regula ${ri + 1} citește un câmp șters.`);
      else if (!c.op) push(`rules.${k}.op`, `Regula ${ri + 1}: alege operatorul.`);
      else if (!NO_VALUE_OPS.includes(c.op) && !String(c.value || "").trim()) push(`rules.${k}.value`, `Regula ${ri + 1}: completează valoarea.`);
    }));
    allFields().forEach(({ step, section, field }) => checkRules(field, "field", fieldName(field), `${tr(step.title)} › ${tr(section.title) || "Secțiune"}`));
    allSections().forEach(({ step, section }) => checkRules(section, "section", tr(section.title) || "Secțiune", tr(step.title)));
    logicCycles().forEach((id) => {
      const found = findField(id);
      if (found) issues.push({ level: "error", kind: "field", id, tab: T_LOGIC, prop: "cycle", name: fieldName(found.field), where: `${tr(found.step.title)} › ${tr(found.section.title) || "Secțiune"}`, message: "Nu se poate salva: există o dependență circulară între câmpuri." });
    });
    form.steps.forEach((step) => {
      if (step.locked) return;
      if (!tr(step.title).trim()) issues.push({ level: "error", kind: "step", id: step.id, tab: T_GEN, prop: "title", name: "Pas fără titlu", where: "Pași", message: "Completează titlul pasului (RO)." });
      (step.sections || []).forEach((section) => {
        if (section.showTitle !== false && !tr(section.title).trim()) issues.push({ level: "error", kind: "section", id: section.id, tab: T_GEN, prop: "title", name: "Secțiune fără titlu", where: tr(step.title), message: "Completează titlul secțiunii (RO) sau ascunde-l." });
      });
    });
    if (!tr(form.title).trim()) issues.push({ level: "error", kind: "form", id: "", tab: T_GEN, prop: "title", name: "Formular", where: "Date generale", message: "Completează titlul formularului (RO)." });
    /* translations: one warning per language (fallback RO, spec § I-17) */
    ["ru", "en"].forEach((lang) => {
      const missing = translatable().filter((item) => item.ro && !item.value(lang)).length;
      if (missing) issues.push({ level: "warning", kind: "form", id: "", tab: T_GEN, prop: "languages", name: `Traduceri ${lang.toUpperCase()}`, where: "Date generale › Limbi", message: `${missing} texte fără traducere — se afișează în română.` });
    });
    return issues;
  }
  /* every translatable text of the form: { ro, value(lang) } */
  function translatable() {
    const list = [];
    const add = (obj) => { if (obj && typeof obj === "object") list.push({ ro: Boolean(String(obj.ro || "").trim()), value: (lang) => String(obj[lang] || "").trim() }); };
    add(form.title);
    form.steps.forEach((step) => { add(step.title); (step.sections || []).forEach((section) => { add(section.title); section.fields.forEach((field) => { if (field.type === "separator") return; if (field.type === "callout") { add(field.title); add(field.text); return; } add(field.type === "info" ? field.text : field.label); add(field.help); }); }); });
    return list;
  }
  const errorsOf = (kind, id) => state.issues.filter((issue) => issue.level === "error" && issue.kind === kind && issue.id === id);
  const propError = (kind, id, prop) => errorsOf(kind, id).find((issue) => issue.prop === prop)?.message || "";

  /* ------------------------------------------- projection onto the FO schema (one renderer) */
  function selectOptions(field) {
    const ds = field.dataSource;
    if (!ds) return [];
    if (ds.mode === "static") return (ds.values || []).filter((item) => item.isValid !== false && String(item.label || "").trim()).map((item) => String(item.label));
    const classifier = getClassifier(ds.classifierId);
    if (!classifier) return [];
    return (CLASSIFIER_ROWS[classifier.id] || [{ code: "1", name: classifier.displayName }]).map((row) => displayLabel(row, ds.template));
  }
  function dateLimit(limit) {
    if (!limit || limit.mode === "none") return "";
    if (limit.mode === "today") return R.localIsoDay();
    return limit.value || "";
  }
  /* builder field → FO field (the shape stepFieldHtml renders); prefix keeps ids unique per surface */
  function toFo(field, { prefix = "pv", inCard = false, lang = "ro" } = {}) {
    const text = (value) => tr(value, lang) || tr(value, "ro");
    const base = {
      id: `${prefix}-${field.id}`,
      type: field.type,
      label: text(field.label),
      required: Boolean(field.required),
      span: inCard ? 12 : Number(field.span) || 12,
      hint: text(field.help),
      placeholder: text(field.placeholder),
      readOnly: Boolean(field.readOnly),
      value: field.defaultValue || "",
    };
    switch (field.type) {
      case "text": {
        const preset = presetOf(field);
        return { ...base, maxLength: Number(field.maxLength) || "", charCounter: Boolean(field.counter), inputmode: preset.inputmode || "", autocomplete: field.validation?.preset === "email" ? "email" : "" };
      }
      case "textarea": return { ...base, rows: field.rows, maxLength: Number(field.maxLength) || "", charCounter: Boolean(field.counter) };
      case "email": return { ...base, autocomplete: "email" };
      case "phone": return { ...base, countryCodes: [{ flag: "🇲🇩", code: "+373" }, { flag: "🇷🇴", code: "+40" }, { flag: "🇺🇦", code: "+380" }] };
      case "number": return { ...base, unit: field.unit || "", decimals: field.numberKind === "decimal" ? Number(field.decimals) || 1 : 0 };
      case "money": return { ...base, unit: field.currency || "MDL", decimals: 2 };
      case "date": return { ...base, value: field.dateDefault === "today" ? R.localIsoDay() : "", min: dateLimit(field.dateMin) };
      case "select": return { ...base, value: "", placeholder: base.placeholder || "Selectează", options: selectOptions(field) };
      case "multiselect": return { ...base, value: [], options: selectOptions(field) };
      case "segment": return { ...base, value: "", options: (field.options || []).map((option) => ({ value: option.value, label: option.label })) };
      case "callout": return { ...base, title: text(field.title), text: text(field.text), tone: field.tone || "info" };
      case "separator": return { ...base, span: 12 };
      case "period": return { ...base, value: { from: "", to: "" }, fromLabel: text(field.fromLabel) || "De la", toLabel: text(field.toLabel) || "Până la", min: dateLimit(field.dateMin) };
      case "radio": return { ...base, orientation: field.orientation, options: (field.options || []).map((option) => ({ value: option.value, label: option.label })) };
      case "checklist": return { ...base, value: [], options: (field.options || []).map((option) => ({ value: option.value, label: option.label })) };
      case "checkbox": return { ...base, value: Boolean(field.defaultChecked) };
      case "info": return { ...base, text: text(field.text), tone: field.tone || "neutral" };
      case "address": {
        const config = addressConfig(field);
        const parts = {};
        config.forEach((part) => { if (part.key !== "sector" && part.key !== "cadastral") parts[part.key] = { visible: part.visible !== false, required: Boolean(part.required) }; });
        const cadastral = config.find((part) => part.key === "cadastral");
        return { id: base.id, type: "cascade-address", span: inCard ? 12 : 12, searchLabel: base.label || "Adresa", required: base.required, parts, cadastral: { visible: cadastral.visible !== false, required: Boolean(cadastral.required) }, districts: R.districts() };
      }
      default: return base;
    }
  }
  const foHtml = (field, options) => R.fieldHtml(toFo(field, options)) || ui().renderNotice?.("warning", `Componenta „${esc(comp(field.type).label)}” nu are încă o reprezentare în formular.`) || "";

  /* ================================================================== RENDER */
  function renderAll() {
    state.issues = validate();
    renderLibrary();
    renderHeader();
    renderSteps();
    renderCanvas();
    renderPanel();
    renderIssues();
    if (state.mode === "preview") renderPreview();
    if (state.mode === "schema") renderSchema();
  }

  /* after every model change: re-validate, redraw what shows the model, save */
  function commit({ panel = true, canvas = true } = {}) {
    state.issues = validate();
    form.editedAt = new Date().toISOString().slice(0, 16);
    form.editedBy = currentUser();
    form.dirty = true;
    renderHeader();
    renderSteps();
    if (canvas) renderCanvas();
    if (panel) renderPanel();
    renderIssues();
    if (state.mode === "preview") renderPreview();
    if (state.mode === "schema") renderSchema();
    saveDb();
  }

  /* --------------------------------------------------------------- palette (spec § C) */
  function libraryItemHtml(type) {
    const meta = COMPONENTS[type];
    const soon = Boolean(meta.soon);
    return `
      <button class="e-permits-builder__library-item${soon ? " is-disabled" : ""}" type="button"${soon ? ` aria-disabled="true" data-tooltip-reason="În lucru — etapa ${meta.soon} a constructorului"` : ' draggable="true"'} data-builder-component="${type}">
        <span>${icon(meta.icon)}</span>
        <strong>${esc(meta.label)}${soon ? (ui().renderTag?.("În curând", "neutral") || "") : ""}</strong>
        <em>${esc(meta.desc)}</em>
      </button>`;
  }
  function renderLibrary() {
    const query = normalize(state.query);
    const categoryName = (type) => (CATEGORIES.find(([key]) => key === COMPONENTS[type].category) || [])[1] || "";
    const matches = (type) => !query || normalize(`${COMPONENTS[type].label} ${COMPONENTS[type].desc} ${categoryName(type)}`).includes(query);
    const groups = CATEGORIES.map(([category, title]) => {
      const types = Object.keys(COMPONENTS).filter((type) => COMPONENTS[type].category === category && matches(type))
        .sort((a, b) => Number(Boolean(COMPONENTS[a].soon)) - Number(Boolean(COMPONENTS[b].soon)));
      if (!types.length) return "";
      return `
        <section class="e-permits-builder__library-section" aria-labelledby="fb-lib-${category}">
          <h3 id="fb-lib-${category}">${esc(title)}</h3>
          ${types.map(libraryItemHtml).join("")}
        </section>`;
    }).join("");
    const configured = !query || normalize("adresa obiectului componente configurate adresa").includes(query) ? `
        <section class="e-permits-builder__library-section" aria-labelledby="fb-lib-configured">
          <h3 id="fb-lib-configured">Componente configurate</h3>
          <button class="e-permits-builder__library-item" type="button" draggable="true" data-builder-component="address" data-fb-preset="object-address">
            <span>${icon("icon-map-pin")}</span>
            <strong>Adresa obiectului</strong>
            <em>Adresă cu cod cadastral (SRRE)</em>
          </button>
        </section>` : "";
    el.library.innerHTML = groups || configured
      ? `${groups}${configured}`
      : window.GEAPEmptyState?.noResults("Nicio componentă găsită", { compact: true, bare: true }) || "";
  }

  /* ------------------------------------------------------------- service header */
  function renderHeader() {
    const published = form.status === "published" && !form.dirty;
    const fieldsCount = allFields().filter(({ field }) => !NO_VALUE.includes(field.type)).length;
    el.header.innerHTML = `
      <div class="e-permits-builder__service-main">
        <nav class="breadcrumbs breadcrumbs--trailing" aria-label="Serviciul">
          <ol class="breadcrumbs__list"><li class="breadcrumbs__item"><span class="breadcrumbs__link">${esc(form.service?.name || "Serviciu")}</span></li></ol>
        </nav>
        <div class="e-permits-builder__service-title-row">
          <h2><button class="e-permits-builder__title-button" type="button" data-fb-select-form aria-label="Date generale formular: ${esc(tr(form.title))}">${esc(tr(form.title) || "Formular fără titlu")}</button></h2>
          ${ui().renderTag?.(published ? "Publicat" : "Schiță", published ? "success" : "neutral") || ""}
        </div>
      </div>
      <div class="e-permits-builder__service-meta-row">
        <div class="e-permits-builder__service-kinds" aria-label="Tipuri de solicitare">${(form.requestTypes || []).map((type) => `<span>${esc(type)}</span>`).join("")}</div>
        <span class="e-permits-builder__meta-separator" aria-hidden="true"></span>
        <div class="e-permits-builder__service-meta">
          <span>${esc(form.code)}</span><i aria-hidden="true"></i>
          <span><strong>${fieldsCount}</strong> câmpuri</span><i aria-hidden="true"></i>
          <strong>${esc(form.version)}${form.dirty ? " · schiță" : ""}</strong><i aria-hidden="true"></i>
          <span>editat ${esc(longDate(form.editedAt))}</span><i aria-hidden="true"></i>
          <span>de <strong>${esc(form.editedBy)}</strong></span>
        </div>
      </div>`;
    if (el.version) el.version.querySelector("span").textContent = form.version;
    if (el.viewTitle && !overlay?.classList.contains("is-view-only")) el.viewTitle.textContent = "";
  }

  /* ------------------------------------------------------------------- steps */
  function renderSteps() {
    const active = activeStep();
    el.steps.innerHTML = `
      <div class="e-permits-builder__steps-group" role="tablist" aria-label="Pașii formularului">
        ${form.steps.map((step, index) => {
          const isActive = step.id === active.id;
          const hasError = !step.locked && (errorsOf("step", step.id).length || (step.sections || []).some((section) => errorsOf("section", section.id).length || section.fields.some((field) => errorsOf("field", field.id).length)));
          return `
            <button class="e-permits-builder__step-chip${isActive ? " is-active" : ""}${step.locked ? " has-trailing-icon" : ""}${state.sel.kind === "step" && state.sel.id === step.id ? " is-selected" : ""}" type="button" role="tab" aria-selected="${isActive}" tabindex="${isActive ? "0" : "-1"}" data-fb-step="${step.id}" aria-label="Pasul ${index + 1}: ${esc(tr(step.title))}${step.locked ? " (generat de platformă)" : ""}${hasError ? " — are erori" : ""}">
              <span class="e-permits-builder__step-badge">${index + 1}</span>
              <strong class="e-permits-builder__step-label">${esc(tr(step.title) || "Pas fără titlu")}</strong>
              ${step.locked ? `<svg class="icon e-permits-builder__step-icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-lock"></use></svg>` : ""}
              ${hasError ? '<span class="e-permits-ntpl-dot e-permits-tariff__tab-error" aria-hidden="true"></span>' : ""}
            </button>`;
        }).join("")}
        <button class="e-permits-builder__step-add" type="button" aria-label="Adaugă un pas de serviciu" data-fb-add-step>
          ${icon("icon-plus-large", 16)}
        </button>
      </div>`;
    el.steps.querySelector(".e-permits-builder__step-chip.is-active")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  /* ------------------------------------------------------------------ canvas */
  const KBD_HINT_ID = "fb-kbd-hint";
  function fieldCardHtml(field, section, index, total) {
    const meta = comp(field.type);
    const selected = state.sel.kind === "field" && state.sel.id === field.id;
    const errors = errorsOf("field", field.id);
    const name = fieldName(field);
    const sectionsInStep = activeStep().sections || [];
    const moveItems = [
      { label: "Duplică", icon: "copy", attrs: `data-fb-act="duplicate" data-id="${field.id}"` },
      ...(index > 0 ? [{ label: "Mută mai sus", icon: "arrow-up", attrs: `data-fb-act="up" data-id="${field.id}"` }] : []),
      ...(index < total - 1 ? [{ label: "Mută mai jos", icon: "arrow-down", attrs: `data-fb-act="down" data-id="${field.id}"` }] : []),
      ...sectionsInStep.filter((item) => item.id !== section.id).map((item) => ({ label: `Mută în „${tr(item.title) || "Secțiune"}”`, icon: "arrow-right", attrs: `data-fb-act="move-to" data-id="${field.id}" data-section="${item.id}"` })),
      { label: "Șterge", icon: "delete", danger: true, attrs: `data-fb-act="delete" data-id="${field.id}"` },
    ];
    return `
      <article class="e-permits-builder__field${selected ? " is-selected" : ""}${errors.length ? " has-issue" : ""}" data-builder-field data-id="${field.id}" data-type="${field.type}" data-span="${field.span}" tabindex="0" draggable="true" aria-label="${esc(meta.label)}: ${esc(name)}, lățime ${field.span} din 12${field.required ? ", obligatoriu" : ""}" aria-describedby="${KBD_HINT_ID}">
        <div class="e-permits-builder__field-tools">
          <div class="e-permits-builder__field-meta">
            <span class="e-permits-builder__drag-grip" aria-hidden="true">${icon("icon-drag", 16)}</span>
            <em class="e-permits-builder__tag e-permits-builder__tag--strong" title="${esc(meta.label)}">${esc(meta.label)}</em>
            <em class="e-permits-builder__tag e-permits-builder__tag--outlined" data-fb-span-tag>${field.span}/12</em>
          </div>
          <div class="e-permits-builder__field-actions">
            ${ui().renderStackMenu?.(moveItems, name) || ""}
          </div>
        </div>
        <div class="e-permits-builder__field-render" inert>${foHtml(field, { prefix: "cv", inCard: true })}</div>
        ${NO_VALUE.includes(field.type) && !errors.length && !(field.rules || []).length ? "" : `
        <div class="e-permits-builder__field-foot">
          ${NO_VALUE.includes(field.type) ? "" : `<span class="e-permits-builder__field-key" title="${esc(field.key)}">${esc(field.key)}</span>`}
          ${(field.rules || []).length ? `<em class="e-permits-builder__tag e-permits-builder__tag--outlined">${field.rules.length} ${field.rules.length === 1 ? "regulă" : "reguli"}</em>` : ""}
          ${errors.length ? `<em class="e-permits-builder__tag e-permits-builder__tag--warning" title="${esc(errors[0].message)}">${icon("icon-warning-filled", 16)}${esc(errors[0].short || errors[0].message)}</em>` : ""}
        </div>`}
        <button class="e-permits-builder__field-resize" type="button" tabindex="-1" aria-hidden="true" data-fb-resize></button>
      </article>`;
  }

  function sectionHtml(section, index, total) {
    const selected = state.sel.kind === "section" && state.sel.id === section.id;
    const errors = errorsOf("section", section.id);
    const title = tr(section.title);
    const items = [
      { label: "Copiază secțiunea (goală)", icon: "copy", attrs: `data-fb-sec-act="copy" data-id="${section.id}"` },
      ...(index > 0 ? [{ label: "Mută mai sus", icon: "arrow-up", attrs: `data-fb-sec-act="up" data-id="${section.id}"` }] : []),
      ...(index < total - 1 ? [{ label: "Mută mai jos", icon: "arrow-down", attrs: `data-fb-sec-act="down" data-id="${section.id}"` }] : []),
      { label: "Șterge secțiunea", icon: "delete", danger: true, attrs: `data-fb-sec-act="delete" data-id="${section.id}"` },
    ];
    const empty = !section.fields.length ? window.GEAPEmptyState?.render({ title: "Secțiune goală", text: "Trageți un câmp aici sau alegeți o componentă din bibliotecă.", icon: "templates", compact: true, bare: true }) || "" : "";
    return `
      <section class="e-permits-builder__step-section${selected ? " is-section-selected" : ""}${errors.length ? " has-issue" : ""}" data-builder-section data-section-id="${section.id}" aria-label="Secțiunea ${esc(title || "fără titlu")}">
        <div class="e-permits-builder__section-bar">
          <span class="e-permits-builder__drag-grip e-permits-builder__section-grip" aria-hidden="true">${icon("icon-drag", 16)}</span>
          <button class="e-permits-builder__section-select" type="button" data-fb-select-section="${section.id}" aria-label="Secțiunea ${esc(title || "fără titlu")} — proprietăți" aria-describedby="fb-sec-kbd-hint" aria-pressed="${selected}">
            <span class="e-permits-builder__section-heading">
              <strong class="${section.showTitle === false ? "is-muted" : ""}">${esc(title || "Secțiune fără titlu")}${section.showTitle === false ? " · titlu ascuns" : ""}</strong>
              ${tr(section.description) ? `<span>${esc(tr(section.description))}</span>` : ""}
            </span>
          </button>
          <div class="e-permits-builder__section-actions">${ui().renderStackMenu?.(items, `secțiunea ${title}`) || ""}</div>
        </div>
        <div class="e-permits-builder__grid" data-builder-grid data-section-id="${section.id}">
          ${section.fields.map((field, i) => fieldCardHtml(field, section, i, section.fields.length)).join("")}
          ${empty ? `<div class="e-permits-builder__grid-empty">${empty}</div>` : ""}
          <div class="e-permits-stack__menu-wrap e-permits-builder__add-field">
            <button class="e-permits-builder__dropzone" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="fb-add-${section.id}" data-stack-menu-trigger data-fb-add-trigger="${section.id}">
              ${icon("icon-plus-small", 16)}<span>Adaugă câmp</span>
            </button>
            <ul class="e-permits-fo-intent-menu e-permits-stack__menu e-permits-builder__add-menu" id="fb-add-${section.id}" role="menu" aria-label="Adaugă o componentă în secțiune" hidden data-stack-menu>
              ${Object.keys(COMPONENTS).filter((type) => isUsable(type) && !COMPONENTS[type].structural).map((type) => `
                <li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" data-fb-add-type="${type}" data-section="${section.id}">${icon(COMPONENTS[type].icon)}<span>${esc(COMPONENTS[type].label)}</span></button></li>`).join("")}
            </ul>
          </div>
        </div>
      </section>`;
  }

  function renderCanvas() {
    const focusedId = document.activeElement?.closest?.("[data-builder-field]")?.dataset.id || "";
    const focusedSelf = document.activeElement?.matches?.("[data-builder-field]");
    const focusedSection = document.activeElement?.closest?.("[data-fb-select-section]")?.dataset.fbSelectSection || "";
    const step = activeStep();
    const position = form.steps.indexOf(step) + 1;
    const head = `
      <header class="e-permits-builder__form-header">
        <span>Pasul ${position} din ${form.steps.length}</span>
        <h1>${esc(tr(step.title) || "Pas fără titlu")}</h1>
      </header>`;
    if (step.locked) {
      el.canvas.innerHTML = `${head}
        <div class="e-permits-builder__locked-step">
          ${ui().renderInfoNote?.(`Pas generat de platformă. ${esc(PLATFORM_STEPS[step.platform] || "")}`) || ""}
          ${window.GEAPEmptyState?.render({ title: "Pasul nu se editează în constructor", text: "Câmpurile pentru serviciu se adaugă în pașii de serviciu.", icon: "lock", compact: true }) || ""}
        </div>`;
      return;
    }
    const sections = step.sections || [];
    el.canvas.innerHTML = `${head}
      <p class="u-visually-hidden" id="${KBD_HINT_ID}">Alt + săgeată sus sau jos mută câmpul, Alt + săgeată stânga sau dreapta schimbă lățimea, Ctrl + D duplică, Delete șterge.</p>
      <p class="u-visually-hidden" id="fb-sec-kbd-hint">Alt + săgeată sus sau jos mută secțiunea.</p>
      ${sections.map((section, index) => sectionHtml(section, index, sections.length)).join("")}
      <div class="e-permits-builder__canvas-actions">
        <button class="btn btn-secondary btn-sm" type="button" data-fb-add-section>${icon("icon-plus-small", 16)}<span>Adaugă secțiune</span></button>
      </div>`;
    if (focusedId) {
      const card = el.canvas.querySelector(`[data-builder-field][data-id="${focusedId}"]`);
      if (card && focusedSelf) card.focus({ preventScroll: true });
    } else if (focusedSection) {
      el.canvas.querySelector(`[data-fb-select-section="${focusedSection}"]`)?.focus({ preventScroll: true });
    }
  }

  /* --------------------------------------------------- properties panel (spec § D, E) */
  const pid = (prop) => `fb-p-${prop.replace(/[^a-z0-9]+/gi, "-")}`;
  const requiredMark = () => ui().requiredMark?.() || "";
  const errorHtml = (message) => `<span class="message message--inline message--error e-permits-fo-field__error">${icon("icon-circle-error-filled")}<span>${esc(message)}</span></span>`;
  /* one full-flow field (components.md „Form fields … product rules”) */
  function fieldWrap({ id, label, control, required = false, hint = "", error = "", span = 12, labelFor = true }) {
    return `
      <div class="e-permits-fo-field e-permits-user-create__field${span !== 12 ? ` e-permits-user-create__field--${span}` : ""}">
        ${label ? `<label${labelFor ? ` for="${id}"` : ` id="${id}-label"`}>${esc(label)}${required ? requiredMark() : ""}</label>` : ""}
        ${control}
        ${error ? errorHtml(error) : hint ? `<p class="e-permits-fo-field__hint" id="${id}-hint">${hint}</p>` : ""}
      </div>`;
  }
  /* text input bound to a model path; i18n = the panel language */
  function inputField({ prop, label, value, required = false, hint = "", error = "", span = 12, placeholder = "", readonly = false, numeric = false, i18nProp = false, maxlength = 0, attrs = "" }) {
    const id = pid(prop);
    const control = `
      <div class="e-permits-fo-input${readonly ? " is-filled is-readonly" : ""}${error ? " is-error" : ""}">
        <input id="${id}" type="text"${numeric ? ' inputmode="numeric"' : ""} value="${esc(value ?? "")}" placeholder="${esc(placeholder)}" autocomplete="off"${readonly ? " readonly" : ""}${maxlength ? ` maxlength="${maxlength}"` : ""}${hint && !error ? ` aria-describedby="${id}-hint"` : ""}${error ? ' aria-invalid="true"' : ""} data-fb-prop="${prop}"${i18nProp ? " data-fb-i18n" : ""}${numeric ? ' data-fb-num' : ""} ${attrs}>
      </div>`;
    return fieldWrap({ id, label, control, required, hint, error, span });
  }
  function textareaField({ prop, label, value, required = false, hint = "", error = "", rows = 2, placeholder = "", i18nProp = false }) {
    const id = pid(prop);
    const control = `
      <div class="e-permits-fo-textarea${error ? " is-error" : ""}">
        <textarea id="${id}" rows="${rows}" placeholder="${esc(placeholder)}"${error ? ' aria-invalid="true"' : ""} data-fb-prop="${prop}"${i18nProp ? " data-fb-i18n" : ""}>${esc(value ?? "")}</textarea>
      </div>`;
    return fieldWrap({ id, label, control, required, hint, error });
  }
  function selectField({ prop, label, value, options, required = false, hint = "", error = "", span = 12, placeholder = "" }) {
    const id = pid(prop);
    const optionsHtml = `${placeholder ? `<option value="" disabled${value ? "" : " selected"}>${esc(placeholder)}</option>` : ""}${options.map(([v, text]) => `<option value="${esc(v)}"${String(v) === String(value) ? " selected" : ""}>${esc(text)}</option>`).join("")}`;
    const control = ui().renderFoSelectControl?.({ id, attrs: `data-fb-prop="${prop}"`, optionsHtml, error: Boolean(error) }) || "";
    return fieldWrap({ id, label, control, required, hint, error, span });
  }
  function checkOption({ prop, label, checked, required = false, disabled = false, reason = "", plain = false }) {
    return ui().renderCheckOption?.({ label, checked: Boolean(checked), required, disabled, reason, plain, attrs: `data-fb-prop="${prop}" data-fb-bool` }) || "";
  }
  function toggleField({ prop, label, description = "", checked }) {
    return ui().renderToggle?.({ label, description, checked: Boolean(checked), attrs: `data-fb-prop="${prop}" data-fb-bool` }) || "";
  }
  function segmented({ prop, label, value, options, labelledBy = "" }) {
    return `
      <div class="segmented-control" role="radiogroup"${labelledBy ? ` aria-labelledby="${labelledBy}"` : ` aria-label="${esc(label)}"`}>
        ${options.map(([v, text, aria]) => `<button class="segment-item${String(v) === String(value) ? " is-selected" : ""}" type="button" role="radio" aria-checked="${String(v) === String(value)}"${aria ? ` aria-label="${esc(aria)}"` : ""} data-fb-seg="${prop}" data-value="${esc(v)}">${text}</button>`).join("")}
      </div>`;
  }
  /* a titled group of the panel = the drawer section (components.md drawers) */
  const group = (title, body, { id = "" } = {}) => `
    <section class="e-permits-user-create__section e-permits-builder__group"${id ? ` data-fb-group="${id}"` : ""}>
      <h3 class="e-permits-user-create__section-title">${esc(title)}</h3>
      <div class="e-permits-user-create__section-content">${body}</div>
    </section>`;
  const grid = (body) => `<div class="e-permits-user-create__grid e-permits-builder__panel-grid">${body}</div>`;

  /* RO · RU · EN — every translatable input in the panel follows it; a dot = missing text */
  function langSwitch(objects) {
    return `
      <div class="e-permits-builder__lang">
        <span class="e-permits-builder__lang-label" id="fb-lang-label">Limba textelor</span>
        <div class="segmented-control" role="radiogroup" aria-labelledby="fb-lang-label">
          ${LANGS.map(([lang, name]) => {
            const done = objects.filter((obj) => obj && String(obj.ro || "").trim()).every((obj) => String(obj[lang] || "").trim());
            const on = state.lang === lang;
            return `<button class="segment-item${on ? " is-selected" : ""}" type="button" role="radio" aria-checked="${on}" aria-label="${name}${done ? "" : " — traducere incompletă"}" data-fb-lang="${lang}">${lang.toUpperCase()}${done ? "" : '<span class="e-permits-ntpl-dot" aria-hidden="true"></span>'}</button>`;
          }).join("")}
        </div>
      </div>`;
  }
  const langNote = () => (state.lang === "ro" ? "" : `<p class="e-permits-fo-field__hint">Fără traducere, solicitantul vede textul în română.</p>`);
  const langLabel = (label) => `${label} (${state.lang.toUpperCase()})`;

  function panelHead({ crumbs = [], title, chip = "", menu = "", subtitle = "" }) {
    return `
      <div class="e-permits-builder__panel-head e-permits-builder__panel-head--selected">
        ${crumbs.length ? `<p class="e-permits-builder__crumbs">${crumbs.map(esc).join('<span aria-hidden="true"> › </span>')}</p>` : ""}
        <div class="e-permits-builder__panel-title-row">
          <h2 id="fb-panel-title">${esc(title)}</h2>
          ${menu}
        </div>
        ${chip || subtitle ? `<div class="e-permits-builder__panel-meta">${chip}${subtitle ? `<span>${esc(subtitle)}</span>` : ""}</div>` : ""}
      </div>`;
  }

  function renderPanel() {
    const active = document.activeElement;
    const focusId = el.panel.contains(active) ? active.id : "";
    const caret = focusId && typeof active.selectionStart === "number" ? [active.selectionStart, active.selectionEnd] : null;
    const scroller = el.panel.querySelector("[data-fb-panel-scroll]");
    const scrollTop = scroller ? scroller.scrollTop : 0;
    const prevKey = el.panel.dataset.fbFor || "";
    const key = `${state.sel.kind}:${state.sel.id}:${state.tab}`;

    let html = "";
    if (state.sel.kind === "field") html = fieldPanelHtml(findField(state.sel.id));
    else if (state.sel.kind === "section") html = sectionPanelHtml(findSection(state.sel.id));
    else if (state.sel.kind === "step") html = stepPanelHtml(stepById(state.sel.id));
    else html = formPanelHtml();
    el.panel.innerHTML = html;
    el.panel.dataset.fbFor = key;
    window.GEAPDatePicker?.init?.(el.panel);

    const nextScroller = el.panel.querySelector("[data-fb-panel-scroll]");
    if (nextScroller && prevKey === key) nextScroller.scrollTop = scrollTop;
    if (focusId) {
      const target = el.panel.querySelector(`#${CSS.escape(focusId)}`);
      if (target) {
        target.focus({ preventScroll: true });
        if (caret && typeof target.setSelectionRange === "function") { try { target.setSelectionRange(caret[0], caret[1]); } catch { /* not a text input */ } }
      }
    }
  }

  function tabsHtml(tabs, kind, id) {
    const errors = errorsOf(kind, id);
    return `
      <div class="tabs tabs--sm e-permits-builder__tabs">
        <div class="tab-buttons" role="tablist" aria-label="Proprietăți">
          ${tabs.map((tab) => {
            const on = tab === state.tab;
            const bad = errors.some((issue) => issue.tab === tab);
            return `<button class="tab-button${on ? " active" : ""}" id="fb-tab-${tab}" type="button" role="tab" aria-selected="${on}" aria-controls="fb-tabpanel" tabindex="${on ? "0" : "-1"}" data-builder-prop-tab="${tab}"><span>${TAB_LABELS[tab]}</span>${bad ? '<span class="e-permits-ntpl-dot e-permits-tariff__tab-error" aria-label="conține erori"></span>' : ""}</button>`;
          }).join("")}
        </div>
      </div>`;
  }

  /* ---- nothing selected → „Date generale formular” (spec § E) */
  function formPanelHtml() {
    const fieldsCount = allFields().filter(({ field }) => !NO_VALUE.includes(field.type)).length;
    const texts = translatable();
    const langCount = (lang) => texts.filter((item) => item.ro && item.value(lang)).length;
    const roTotal = texts.filter((item) => item.ro).length;
    const published = form.status === "published" && !form.dirty;
    const errorsCount = state.issues.filter((issue) => issue.level === "error").length;
    return `
      ${panelHead({ title: "Date generale formular", subtitle: form.service?.name || "" })}
      <div class="e-permits-builder__panel-scroll" data-fb-panel-scroll>
        ${langSwitch([form.title, form.description])}
        ${group("Identificare", grid(`
          ${inputField({ prop: "technical", label: "Denumire tehnică", value: form.technical, readonly: true, hint: "Se stabilește la creare și nu se mai schimbă." })}
          ${inputField({ prop: "code", label: "Cod formular", value: form.code, readonly: true, span: 6 })}
          ${inputField({ prop: "service.rsspCode", label: "Cod serviciu", value: form.service?.rsspCode || "", readonly: true, span: 6 })}
          ${inputField({ prop: "title", label: langLabel("Titlu"), value: tr(form.title, state.lang), required: state.lang === "ro", i18nProp: true, maxlength: 150, error: state.lang === "ro" ? propError("form", "", "title") : "" })}
          ${langNote()}
          ${textareaField({ prop: "description", label: langLabel("Descriere"), value: tr(form.description, state.lang), i18nProp: true, hint: "Maximum 250 de caractere." })}
        `))}
        ${group("Utilizare", `
          <div class="e-permits-fo-field">
            <label>Folosit de tipurile de solicitare</label>
            <div class="e-permits-builder__chips">${(form.requestTypes || []).map((type) => ui().renderTag?.(type, "neutral") || "").join("")}</div>
            <p class="e-permits-fo-field__hint">Se schimbă din Pașaport › Tipuri de solicitare.</p>
          </div>
          ${selectField({ prop: "access", label: "Vizibilitate și acces", value: form.access, options: ACCESS, hint: "Cine poate vedea și reutiliza acest formular." })}
        `)}
        ${group("Versiune", `
          <dl class="e-permits-builder__facts">
            <div><dt>Statut</dt><dd>${ui().renderTag?.(published ? "Publicat" : "Schiță", published ? "success" : "neutral") || ""}</dd></div>
            <div><dt>Versiune</dt><dd>${esc(form.version)}${form.dirty ? " · modificări nepublicate" : ""}</dd></div>
            <div><dt>Editat</dt><dd>${esc(longDate(form.editedAt))} · ${esc(form.editedBy)}</dd></div>
            <div><dt>Probleme</dt><dd>${errorsCount ? `${errorsCount} ${errorsCount === 1 ? "eroare" : "erori"} — publicarea e blocată` : "Fără erori"}</dd></div>
          </dl>
        `)}
        ${group("Limbi", `
          <dl class="e-permits-builder__facts" data-fb-group-languages>
            <div><dt>Română</dt><dd>Obligatorie · ${langCount("ro")}/${roTotal}</dd></div>
            <div><dt>Rusă</dt><dd>${langCount("ru")}/${roTotal} traduse</dd></div>
            <div><dt>Engleză</dt><dd>${langCount("en")}/${roTotal} traduse</dd></div>
          </dl>
          <p class="e-permits-fo-field__hint">Un text netradus se afișează în română.</p>
        `)}
        ${group("Pași", `
          <ol class="e-permits-builder__step-list">
            ${form.steps.map((step, index) => `
              <li>
                <button class="e-permits-builder__step-row" type="button" data-fb-step-row="${step.id}">
                  <span class="e-permits-builder__step-badge">${index + 1}</span>
                  <span>${esc(tr(step.title) || "Pas fără titlu")}</span>
                  ${step.locked ? `<span class="e-permits-builder__step-row-meta">${icon("icon-lock", 16)}Platformă</span>` : `<span class="e-permits-builder__step-row-meta">${(step.sections || []).length} secțiuni</span>`}
                </button>
              </li>`).join("")}
          </ol>
        `)}
        ${group("Setări completare", `
          ${toggleField({ prop: "settings.autosave", label: "Salvare automată la schimbarea pasului", description: "Solicitantul nu pierde datele dacă iese din cerere (US-21).", checked: form.settings?.autosave })}
          ${toggleField({ prop: "settings.reviewSummary", label: "Rezumat pe secțiuni la Verificare", description: "Pasul de verificare arată răspunsurile grupate pe secțiuni.", checked: form.settings?.reviewSummary })}
        `)}
        ${group("Statistici", `
          <dl class="e-permits-builder__facts">
            <div><dt>Câmpuri</dt><dd>${fieldsCount}</dd></div>
            <div><dt>Secțiuni</dt><dd>${allSections().length}</dd></div>
            <div><dt>Reguli de comportament</dt><dd>0</dd></div>
            <div><dt>Surse externe</dt><dd>${allFields().filter(({ field }) => field.type === "address" || field.dataSource?.mode === "existing").length}</dd></div>
          </dl>
        `)}
      </div>`;
  }

  /* ---- step selected → „Pas · {titlu}” */
  function stepPanelHtml(step) {
    if (!step) return formPanelHtml();
    const index = form.steps.indexOf(step) + 1;
    if (step.locked) {
      return `
        ${panelHead({ crumbs: ["Pași"], title: `Pas · ${tr(step.title)}`, chip: ui().renderTag?.("Generat de platformă", "neutral") || "" })}
        <div class="e-permits-builder__panel-scroll" data-fb-panel-scroll>
          ${group("Pas generat de platformă", `
            ${ui().renderInfoNote?.(esc(PLATFORM_STEPS[step.platform] || "")) || ""}
            <dl class="e-permits-builder__facts">
              <div><dt>Poziție</dt><dd>${index} din ${form.steps.length}</dd></div>
              <div><dt>Tip</dt><dd>Platformă — nu se mută, nu se șterge</dd></div>
            </dl>
          `)}
        </div>`;
    }
    const serviceCount = serviceSteps().length;
    const neighbour = (delta) => form.steps[form.steps.indexOf(step) + delta];
    const menu = ui().renderStackMenu?.([
      { label: "Adaugă secțiune", icon: "plus-small", attrs: `data-fb-step-act="add-section" data-id="${step.id}"` },
      ...(neighbour(-1) && !neighbour(-1).locked ? [{ label: "Mută la stânga", icon: "arrow-left", attrs: `data-fb-step-act="left" data-id="${step.id}"` }] : []),
      ...(neighbour(1) && !neighbour(1).locked ? [{ label: "Mută la dreapta", icon: "arrow-right", attrs: `data-fb-step-act="right" data-id="${step.id}"` }] : []),
      { label: "Șterge pasul", icon: "delete", danger: true, attrs: `data-fb-step-act="delete" data-id="${step.id}"` },
    ], `pasul ${tr(step.title)}`) || "";
    return `
      ${panelHead({ crumbs: ["Pași"], title: `Pas · ${tr(step.title) || "fără titlu"}`, chip: ui().renderTag?.("Pas de serviciu", "brand") || "", menu })}
      <div class="e-permits-builder__panel-scroll" data-fb-panel-scroll>
        ${langSwitch([step.title, step.description])}
        ${group("General", grid(`
          ${inputField({ prop: "title", label: langLabel("Titlu"), value: tr(step.title, state.lang), required: state.lang === "ro", i18nProp: true, maxlength: 80, error: state.lang === "ro" ? propError("step", step.id, "title") : "" })}
          ${langNote()}
          ${textareaField({ prop: "description", label: langLabel("Descriere"), value: tr(step.description, state.lang), i18nProp: true, hint: "Apare sub titlul pasului, în formular." })}
        `))}
        ${group("Afișat la tipurile de solicitare", `
          <div class="e-permits-check-options">
            ${(form.requestTypes || []).map((type) => ui().renderCheckOption?.({ label: type, checked: (step.requestTypes || form.requestTypes).includes(type), attrs: `data-fb-step-rt="${esc(type)}"` }) || "").join("")}
          </div>
          <p class="e-permits-fo-field__hint">Pasul lipsește din cererile de alt tip.</p>
        `)}
        ${group("Secțiuni", `
          <ol class="e-permits-builder__step-list">
            ${(step.sections || []).map((section) => `
              <li><button class="e-permits-builder__step-row" type="button" data-fb-section-row="${section.id}"><span>${esc(tr(section.title) || "Secțiune fără titlu")}</span><span class="e-permits-builder__step-row-meta">${section.fields.length} câmpuri</span></button></li>`).join("") || `<li class="e-permits-builder__step-row-empty">Nicio secțiune.</li>`}
          </ol>
          <div><button class="btn btn-secondary btn-sm" type="button" data-fb-step-act="add-section" data-id="${step.id}">${icon("icon-plus-small", 16)}<span>Adaugă secțiune</span></button></div>
        `)}
        ${group("Poziție", `
          <dl class="e-permits-builder__facts">
            <div><dt>Poziție</dt><dd>${index} din ${form.steps.length}</dd></div>
            <div><dt>Pași de serviciu</dt><dd>${serviceCount}${serviceCount === 1 ? " — ultimul nu se poate șterge" : ""}</dd></div>
          </dl>
        `)}
      </div>`;
  }

  /* ---- section selected → „Secțiune · {titlu}” (US-43) */
  function sectionPanelHtml(found) {
    if (!found) return formPanelHtml();
    const { step, section } = found;
    const items = [
      { label: "Copiază secțiunea (goală)", icon: "copy", attrs: `data-fb-sec-act="copy" data-id="${section.id}"` },
      { label: "Șterge secțiunea", icon: "delete", danger: true, attrs: `data-fb-sec-act="delete" data-id="${section.id}"` },
    ];
    return `
      ${panelHead({ crumbs: [tr(step.title)], title: `Secțiune · ${tr(section.title) || "fără titlu"}`, menu: ui().renderStackMenu?.(items, `secțiunea ${tr(section.title)}`) || "" })}
      ${tabsHtml([T_GEN, T_LOGIC], "section", section.id)}
      <div class="e-permits-builder__panel-scroll" id="fb-tabpanel" role="tabpanel" aria-labelledby="fb-tab-${state.tab}" data-fb-panel-scroll>
        ${state.tab === T_LOGIC ? logicTabHtml(section, "section") : `
        ${langSwitch([section.title, section.description])}
        ${group("Titlu și descriere", grid(`
          ${inputField({ prop: "title", label: langLabel("Titlu"), value: tr(section.title, state.lang), required: state.lang === "ro" && section.showTitle !== false, i18nProp: true, maxlength: 120, error: state.lang === "ro" ? propError("section", section.id, "title") : "" })}
          ${langNote()}
          ${textareaField({ prop: "description", label: langLabel("Descriere"), value: tr(section.description, state.lang), i18nProp: true, hint: "Text explicativ sub titlu." })}
        `))}
        ${group("Aspect", `
          <div class="e-permits-check-options">
            ${checkOption({ prop: "showTitle", label: "Afișează titlul", checked: section.showTitle !== false })}
            ${checkOption({ prop: "showSeparator", label: "Linie sub titlu", checked: section.showSeparator !== false, disabled: section.showTitle === false, reason: "Linia apare doar sub un titlu afișat." })}
          </div>
        `)}
        ${group("Conținut", `
          <dl class="e-permits-builder__facts">
            <div><dt>Câmpuri</dt><dd>${section.fields.length}</dd></div>
            <div><dt>Pas</dt><dd>${esc(tr(step.title))}</dd></div>
          </dl>
        `)}`}
      </div>`;
  }

  /* ---------------------------------------------------- Logică — reguli de comportament (US-42)
     The rule builder of Servicii › Documente („Reguli de solicitare”, components.md): rule card
     `.e-permits-doc-rule`, sentence rows `.e-permits-doc-cond` (câmp · operator · valoare · ×),
     keywords as `code.e-permits-doc-kw`, „și ▾ / sau” as `.e-permits-doc-kwselect`. Same markup,
     builder hooks (data-fb-rule-* / data-fb-cond-*). Operators by family (spec § D.4). */
  const FAMILY = { text: "text", textarea: "text", email: "text", phone: "text", number: "number", money: "number", date: "date", select: "choice", radio: "choice", segment: "choice", multiselect: "multi", checklist: "multi", checkbox: "bool" };
  const OPS = { eq: "Este egal", ne: "Este diferit", contains: "Conține", in: "În listă", lt: "Mai mic", le: "Mai mic sau egal", gt: "Mai mare", ge: "Mai mare sau egal", empty: "Este gol", filled: "Este completat", checked: "Este bifat", unchecked: "Nu este bifat" };
  const OPS_BY_FAMILY = { text: ["eq", "ne", "contains", "empty", "filled"], number: ["eq", "ne", "lt", "le", "gt", "ge", "empty", "filled"], date: ["eq", "ne", "lt", "le", "gt", "ge", "empty", "filled"], choice: ["eq", "ne", "in", "empty", "filled"], multi: ["in", "empty", "filled"], bool: ["checked", "unchecked"] };
  const NO_VALUE_OPS = ["empty", "filled", "checked", "unchecked"];
  const ACTIONS_INPUT = [["show", "Afișează"], ["hide", "Ascunde"], ["require", "Setează ca obligatoriu"], ["optional", "Setează ca opțional"]];
  const ACTIONS_VISIBILITY = [["show", "Afișează"], ["hide", "Ascunde"]];
  const kw = (text) => `<code class="e-permits-doc-kw">${esc(text)}</code>`;
  const bareSelect = (id, attrs, placeholder, options, value, { error = false, disabled = false, label = "" } = {}) => ui().renderFoSelectControl?.({ id, attrs, error, disabled, label, optionsHtml: `
    <option value=""${value ? "" : " selected"} disabled>${esc(placeholder)}</option>
    ${options.map(([v, text]) => `<option value="${esc(v)}"${String(v) === String(value) ? " selected" : ""}>${esc(text)}</option>`).join("")}` }) || "";
  /* fields a rule may read: every other field with a value family (grid columns: none yet) */
  const ruleSources = (target) => allFields().filter(({ field }) => field.id !== target.id && FAMILY[field.type]).map(({ field }) => field);
  const optionChoices = (field) => (usesSource(field.type) ? selectOptions(field).map((value) => [value, value]) : (field.options || []).map((option) => [option.value, option.label]));
  const makeRule = () => ({ id: uid("rule"), action: "show", join: "and", conditions: [{ field: "", op: "", value: "" }] });

  function conditionHtml(rule, ri, c, ci, sources, errors) {
    const source = sources.find((field) => field.id === c.field);
    const family = source ? FAMILY[source.type] : "";
    const ops = family ? OPS_BY_FAMILY[family] : [];
    const needsValue = Boolean(c.op) && !NO_VALUE_OPS.includes(c.op);
    const k = `${ri}.${ci}`;
    let input = "";
    if (source && (family === "choice" || family === "multi") && c.op === "in") {
      const values = String(c.value || "").split("|").filter(Boolean);
      input = `<div class="e-permits-check-options e-permits-doc-val__checks" role="group" aria-label="Valori">${optionChoices(source).map(([value, text]) => ui().renderCheckOption?.({ label: text, checked: values.includes(String(value)), attrs: `value="${esc(value)}" data-fb-cond-in="${k}"` }) || "").join("")}</div>`;
    } else if (source && family === "choice") {
      input = bareSelect(`fb-cv-${ri}-${ci}`, `data-fb-cond-value="${k}"`, "Alege valoarea", optionChoices(source), c.value, { label: "Valoare" });
    } else if (source) {
      const placeholder = family === "date" ? "ZZ/LL/AAAA" : family === "number" ? "Ex. 200" : "Valoare";
      input = `<input id="fb-cv-${ri}-${ci}" class="e-permits-doc-val__input" type="text" value="${esc(c.value || "")}" placeholder="${placeholder}" aria-label="Valoare" autocomplete="off"${family === "number" ? ' inputmode="decimal"' : ""} data-fb-cond-value="${k}">`;
    }
    const valueBad = errors.some((issue) => issue.prop === `rules.${k}.value`);
    const value = !c.op ? `<div class="e-permits-doc-val is-empty" aria-hidden="true"><span>Valoare</span></div>`
      : !needsValue ? `<div class="e-permits-doc-val is-empty"><span>Fără valoare</span></div>`
      : `<div class="e-permits-doc-val${valueBad ? " is-error" : ""}${c.op === "in" ? " is-checks" : ""}"><div class="e-permits-doc-val__control">${input}</div></div>`;
    return `
      <li class="e-permits-doc-cond" data-fb-condition="${k}">
        <div class="e-permits-doc-cond__cell">${bareSelect(`fb-cf-${ri}-${ci}`, `data-fb-cond-field="${k}"`, "Câmp din formular", sources.map((field) => [field.id, `${fieldName(field)} · ${comp(field.type).label}`]), c.field, { error: errors.some((issue) => issue.prop === `rules.${k}.field`), label: "Câmp din formular" })}</div>
        <div class="e-permits-doc-cond__cell e-permits-doc-cond__cell--op">${bareSelect(`fb-co-${ri}-${ci}`, `data-fb-cond-op="${k}"`, "Operator", ops.map((op) => [op, OPS[op]]), c.op, { error: errors.some((issue) => issue.prop === `rules.${k}.op`), disabled: !source, label: "Operator" })}</div>
        <div class="e-permits-doc-cond__cell">${value}</div>
        ${rule.conditions.length > 1
          ? `<button class="btn btn-strict btn-sm btn-icon-only e-permits-doc-cond__remove" type="button" aria-label="Elimină condiția ${ci + 1}" data-tooltip-label="Elimină condiția" data-fb-cond-remove="${k}">${icon("icon-cross-large", 16)}</button>`
          : `<span class="e-permits-doc-cond__remove" aria-hidden="true"></span>`}
      </li>`;
  }

  function ruleHtml(rule, ri, sources, actions, what, errors) {
    return `
      <div class="e-permits-doc-rule" data-fb-rule-block="${ri}">
        <div class="e-permits-doc-rule__head">
          <div class="e-permits-doc-rule__type">${bareSelect(`fb-ra-${ri}`, `data-fb-rule-action="${ri}"`, "Tipul regulii", actions, rule.action, { label: `Tipul regulii ${ri + 1}` })}</div>
          <span class="e-permits-doc-rule__target">${kw(what)}</span>
          <button class="btn btn-text-destructive btn-sm" type="button" aria-label="Elimină regula ${ri + 1}" data-fb-rule-remove="${ri}">Elimină</button>
        </div>
        ${rule.action === "hide" ? `<span class="message message--inline message--warning">${icon("icon-warning-filled")}<span>Câmpul ascuns se golește; valoarea nu se restaurează la reafișare.</span></span>` : ""}
        <div class="e-permits-doc-rule__when">${kw("Când")}</div>
        <ol class="e-permits-doc-rule__conds" role="list">${rule.conditions.map((c, ci) => `${ci === 0 ? ""
          : ci === 1 ? `<li class="e-permits-doc-cond__join e-permits-doc-kwselect" data-fo-list-min="120">${bareSelect(`fb-rj-${ri}`, `data-fb-rule-join="${ri}"`, "și", [["and", "și"], ["or", "sau"]], rule.join, { label: "Combinarea condițiilor" })}</li>`
          : `<li class="e-permits-doc-cond__join">${kw(rule.join === "or" ? "sau" : "și")}</li>`}${conditionHtml(rule, ri, c, ci, sources, errors)}`).join("")}</ol>
        <div class="e-permits-doc-rule__foot"><button class="btn btn-text-primary btn-sm" type="button" data-fb-cond-add="${ri}">${icon("icon-plus-large", 16)}<span>Adaugă condiție</span></button></div>
        ${errors.filter((issue) => issue.prop === `rules.${ri}`).map((issue) => errorHtml(issue.message)).join("")}
      </div>`;
  }

  /* who reads this field: rules of other fields / sections („Folosit în”) */
  function usedIn(id) {
    const list = [];
    allFields().forEach(({ field }) => { if ((field.rules || []).some((rule) => rule.conditions.some((c) => c.field === id))) list.push({ kind: "field", id: field.id, name: fieldName(field), what: comp(field.type).label }); });
    allSections().forEach(({ section }) => { if ((section.rules || []).some((rule) => rule.conditions.some((c) => c.field === id))) list.push({ kind: "section", id: section.id, name: tr(section.title) || "Secțiune", what: "Secțiune" }); });
    return list;
  }

  function logicTabHtml(target, kind = "field") {
    const rules = target.rules || [];
    const sources = ruleSources(target);
    const content = kind === "section" || NO_VALUE.includes(target.type);
    const actions = content ? ACTIONS_VISIBILITY : ACTIONS_INPUT;
    const what = kind === "section" ? "această secțiune" : content ? "această notă" : "acest câmp";
    const errors = errorsOf(kind, target.id).filter((issue) => issue.tab === T_LOGIC);
    const readers = kind === "field" ? usedIn(target.id) : [];
    return `
      ${group("Reguli de comportament", `
        <p class="e-permits-fo-field__hint">${rules.length
          ? "„Afișează”: apare doar când regula e îndeplinită. „Ascunde” câștigă în fața lui „Afișează”; „Setează ca obligatoriu” în fața lui „opțional”."
          : `Fără reguli, ${kind === "section" ? "secțiunea" : content ? "nota" : "câmpul"} se afișează mereu${content ? "" : " și urmează „Obligatoriu” din General"}.`}</p>
        ${errors.filter((issue) => issue.prop === "cycle").map((issue) => errorHtml(issue.message)).join("")}
        ${rules.length ? `<div class="e-permits-doc-rules">${rules.map((rule, ri) => ruleHtml(rule, ri, sources, actions, what, errors)).join("")}</div>` : ""}
        <div><button class="btn btn-secondary btn-sm" type="button" data-fb-rule-add${sources.length ? "" : ' aria-disabled="true" data-tooltip-reason="Formularul nu are alte câmpuri."'}>${icon("icon-plus-large", 16)}<span>Adaugă regulă</span></button></div>
      `)}
      ${kind === "field" && !content ? group("Folosit în", readers.length ? `
        <ul class="e-permits-builder__step-list">${readers.map((item) => `<li><button class="e-permits-builder__step-row" type="button" data-fb-goto="${item.kind}:${item.id}"><span>${esc(item.name)}</span><span class="e-permits-builder__step-row-meta">${esc(item.what)}</span></button></li>`).join("")}</ul>` : '<p class="e-permits-fo-field__hint">Nicio regulă din formular nu citește acest câmp.</p>') : ""}`;
  }

  /* cycles: field A shown by B and B by A → refused (US-42 AC-31) */
  function logicCycles() {
    const graph = new Map();
    allFields().forEach(({ field }) => graph.set(field.id, new Set((field.rules || []).flatMap((rule) => rule.conditions.map((c) => c.field)).filter(Boolean))));
    const inCycle = new Set();
    const visit = (id, path) => {
      if (path.includes(id)) { path.slice(path.indexOf(id)).forEach((item) => inCycle.add(item)); return; }
      (graph.get(id) || []).forEach((next) => visit(next, [...path, id]));
    };
    graph.forEach((_, id) => visit(id, []));
    return inCycle;
  }

  /* ---- field selected → tabs by component */
  function fieldPanelHtml(found) {
    if (!found) return formPanelHtml();
    const { step, section, field, index } = found;
    const meta = comp(field.type);
    const tabs = meta.tabs || INPUT_TABS;
    if (!tabs.includes(state.tab)) state.tab = T_GEN;
    const name = fieldName(field);
    const items = [
      { label: "Duplică", icon: "copy", attrs: `data-fb-act="duplicate" data-id="${field.id}"` },
      ...(index > 0 ? [{ label: "Mută mai sus", icon: "arrow-up", attrs: `data-fb-act="up" data-id="${field.id}"` }] : []),
      ...(index < section.fields.length - 1 ? [{ label: "Mută mai jos", icon: "arrow-down", attrs: `data-fb-act="down" data-id="${field.id}"` }] : []),
      { label: "Șterge", icon: "delete", danger: true, attrs: `data-fb-act="delete" data-id="${field.id}"` },
    ];
    let body = "";
    if (state.tab === T_GEN) body = generalTabHtml(field);
    else if (state.tab === T_DATA) body = dataTabHtml(field);
    else if (state.tab === T_VAL) body = validationTabHtml(field);
    else if (state.tab === T_LOGIC) body = logicTabHtml(field);
    else body = advancedTabHtml(field);
    return `
      ${panelHead({ crumbs: [tr(step.title), tr(section.title) || "Secțiune", meta.label], title: name, chip: NO_VALUE.includes(field.type) ? "" : (ui().renderTag?.(field.key || "fără cheie", "neutral") || ""), menu: ui().renderStackMenu?.(items, name) || "" })}
      ${tabsHtml(tabs, "field", field.id)}
      <div class="e-permits-builder__panel-scroll" id="fb-tabpanel" role="tabpanel" aria-labelledby="fb-tab-${state.tab}" data-fb-panel-scroll>
        ${body}
      </div>`;
  }

  function generalTabHtml(field) {
    const t = field.type;
    const err = (prop) => propError("field", field.id, prop);
    if (t === "separator") {
      return group("Separator", ui().renderInfoNote?.("O linie pe toată lățimea, între grupuri de câmpuri. Nu are proprietăți și nu păstrează valori.") || "");
    }
    const content = NO_VALUE.includes(t);
    const hasPlaceholder = ["text", "textarea", "number", "money", "email", "phone", "select", "multiselect"].includes(t);
    const translatables = t === "info" ? [field.text] : t === "callout" ? [field.title, field.text] : t === "period" ? [field.label, field.help, field.fromLabel, field.toLabel] : [field.label, field.help, field.placeholder];
    const keyLocked = Boolean(field.published);
    let labelBlock;
    if (t === "info") {
      labelBlock = `
        ${textareaField({ prop: "text", label: langLabel("Text"), value: tr(field.text, state.lang), required: state.lang === "ro", i18nProp: true, rows: 4, error: state.lang === "ro" ? err("text") : "" })}
        ${langNote()}
        ${selectField({ prop: "tone", label: "Ton", value: field.tone || "neutral", options: TONES, hint: "Neutru = nota gri; celelalte = notă colorată." })}`;
    } else if (t === "callout") {
      labelBlock = `
        ${inputField({ prop: "title", label: langLabel("Titlu"), value: tr(field.title, state.lang), i18nProp: true, maxlength: 120, error: state.lang === "ro" ? err("text") : "" })}
        ${langNote()}
        ${textareaField({ prop: "text", label: langLabel("Text"), value: tr(field.text, state.lang), i18nProp: true, rows: 4 })}
        ${selectField({ prop: "tone", label: "Ton", value: field.tone || "info", options: [["info", "Informare"], ["warning", "Atenționare"]] })}`;
    } else {
      labelBlock = `
        ${inputField({ prop: "label", label: langLabel(t === "checkbox" ? "Textul bifei" : "Etichetă"), value: tr(field.label, state.lang), required: state.lang === "ro", i18nProp: true, maxlength: 150, error: state.lang === "ro" ? err("label") : "" })}
        ${langNote()}
        ${textareaField({ prop: "help", label: langLabel("Text ajutător"), value: tr(field.help, state.lang), i18nProp: true, hint: "Apare sub câmp. Explică ce se cere, nu repetă eticheta." })}
        ${hasPlaceholder ? inputField({ prop: "placeholder", label: langLabel("Exemplu de completare"), value: tr(field.placeholder, state.lang), i18nProp: true, hint: "Text-exemplu în câmpul gol; nu înlocuiește eticheta." }) : ""}
        ${t === "period" ? `${inputField({ prop: "fromLabel", label: langLabel("Eticheta primei date"), value: tr(field.fromLabel, state.lang), i18nProp: true, span: 6 })}${inputField({ prop: "toLabel", label: langLabel("Eticheta celei de-a doua"), value: tr(field.toLabel, state.lang), i18nProp: true, span: 6 })}` : ""}`;
    }
    const keyBlock = content ? "" : group("Cheie câmp", grid(`
        ${inputField({ prop: "key", label: "Cheie (coloana din baza de date)", value: field.key, required: true, readonly: keyLocked, maxlength: 60, error: keyLocked ? "" : err("key"), hint: keyLocked ? "Blocată după prima publicare: coloana există deja." : "Generată din eticheta RO; litere latine și cifre, unică în formular." })}
      `));
    const behaviour = content ? "" : group("Comportament", `
        <div class="e-permits-check-options">
          ${checkOption({ prop: "required", label: "Obligatoriu", checked: field.required, required: true })}
        </div>
        ${["text", "textarea", "number", "money", "email", "date", "period"].includes(t) ? toggleField({ prop: "readOnly", label: "Doar citire", description: "Valoarea se vede, dar nu se poate modifica.", checked: field.readOnly }) : ""}
        ${["text", "textarea", "number", "money", "email"].includes(t) ? grid(inputField({ prop: "defaultValue", label: "Valoare implicită", value: field.defaultValue || "", numeric: t === "number" || t === "money", hint: "Trebuie să treacă validarea câmpului." })) : ""}
        ${t === "date" ? grid(selectField({ prop: "dateDefault", label: "Valoare implicită", value: field.dateDefault || "none", options: [["none", "Fără"], ["today", "Data curentă (azi)"]] })) : ""}
        ${t === "checkbox" ? `<div class="e-permits-check-options">${checkOption({ prop: "defaultChecked", label: "Bifată implicit", checked: field.defaultChecked })}</div>` : ""}
        ${t === "segment" || t === "radio" ? grid(selectField({ prop: "defaultValue", label: "Valoare implicită", value: field.defaultValue || "", placeholder: "Nicio opțiune aleasă", options: (field.options || []).map((option) => [option.value, option.label]) })) : ""}
      `);
    const spanOptions = SPANS.map((span) => [span, String(span), `${span} din 12`]);
    const format = {
      number: grid(`
        ${selectField({ prop: "numberKind", label: "Tip număr", value: field.numberKind || "integer", options: [["integer", "Întreg"], ["decimal", "Zecimal"]], span: 6 })}
        ${field.numberKind === "decimal" ? selectField({ prop: "decimals", label: "Zecimale", value: field.decimals || 1, options: [[1, "1"], [2, "2"], [3, "3"], [4, "4"]], span: 6 }) : ""}
        ${inputField({ prop: "unit", label: "Unitate", value: field.unit || "", placeholder: "m², ha, luni, buc., %", hint: "Apare în dreapta valorii.", span: 12 })}`),
      money: grid(selectField({ prop: "currency", label: "Monedă", value: field.currency || "MDL", options: CURRENCIES })),
      textarea: grid(selectField({ prop: "rows", label: "Rânduri vizibile", value: field.rows || 2, options: Array.from({ length: 20 }, (_, i) => [i + 1, String(i + 1)]) })),
      radio: `<div class="e-permits-fo-field"><label id="fb-orientation-label">Orientare</label>${segmented({ prop: "orientation", value: field.orientation || "vertical", options: [["vertical", "Verticală"], ["horizontal", "Orizontală"]], labelledBy: "fb-orientation-label" })}</div>`,
    }[t] || "";
    const counter = ["text", "textarea"].includes(t) ? `<div class="e-permits-check-options">${checkOption({ prop: "counter", label: "Contor de caractere", checked: field.counter })}</div>` : "";
    const aspect = group("Aspect", `
        <div class="e-permits-fo-field">
          <label id="fb-span-label">Lățime</label>
          ${segmented({ prop: "span", value: field.span, options: spanOptions, labelledBy: "fb-span-label" })}
          <p class="e-permits-fo-field__hint">${field.span}/12 · ${SPAN_TEXT[field.span] || ""}. Pe telefon, toată lățimea.</p>
        </div>
        ${format}
        ${counter}
      `);
    return `
      ${langSwitch(translatables)}
      ${group(content ? "Conținut" : "Etichetă și ajutor", grid(labelBlock))}
      ${keyBlock}
      ${behaviour}
      ${aspect}`;
  }

  function validationTabHtml(field) {
    const t = field.type;
    const v = field.validation || {};
    const err = (prop) => propError("field", field.id, prop);
    const message = (fallback) => `
      ${langSwitch([v.message])}
      ${grid(textareaField({ prop: "validation.message", label: langLabel("Mesaj de eroare"), value: tr(v.message, state.lang), i18nProp: true, placeholder: fallback, hint: "Gol = mesajul standard al platformei." }))}`;
    const order = `<p class="e-permits-fo-field__hint">Ordinea verificării: Obligatoriu → format → limite. Un câmp opțional gol este valid.</p>`;
    if (t === "text") {
      const preset = v.preset || "none";
      const pattern = patternOf(field);
      const test = state.tests[field.id];
      return `
        ${group("Format", grid(`
          ${selectField({ prop: "validation.preset", label: "Tip validare", value: preset, options: Object.entries(PRESETS).map(([k, p]) => [k, p.label]) })}
          ${preset !== "none" ? inputField({ prop: "validation.pattern", label: "Expresie regulată", value: pattern, readonly: preset !== "regex", required: preset === "regex", placeholder: "^[A-Z]{2}[0-9]{4}$", error: err("validation.pattern"), hint: preset === "regex" ? "Sintaxă JavaScript, fără delimitatori." : "Setată de tipul de validare." }) : ""}
          ${preset !== "none" ? `
            <div class="e-permits-fo-field e-permits-user-create__field e-permits-builder__test">
              <label for="fb-p-test">Testează o valoare</label>
              <div class="e-permits-builder__test-row">
                <div class="e-permits-fo-input"><input id="fb-p-test" type="text" value="${esc(test?.value ?? presetOf(field).sample ?? "")}" autocomplete="off" data-fb-test-input></div>
                <button class="btn btn-neutral btn-sm" type="button" data-fb-test="${field.id}">Testează</button>
              </div>
              ${test ? (test.ok ? `<span class="message message--inline message--success e-permits-fo-field__error e-permits-fo-field__success">${icon("icon-circle-checkmark-filled")}<span>Valoarea corespunde formatului.</span></span>` : errorHtml(test.error || `Nu corespunde: ${tr(v.message) || presetOf(field).message || "formatul cerut"}`)) : ""}
            </div>` : ""}
        `))}
        ${group("Limite", grid(`
          ${inputField({ prop: "validation.minLength", label: "Lungime minimă", value: v.minLength ?? "", numeric: true, span: 6, error: err("validation.minLength") })}
          ${inputField({ prop: "maxLength", label: "Lungime maximă", value: field.maxLength ?? "", numeric: true, span: 6, hint: "Blochează tastarea peste limită." })}
        `))}
        ${group("Mesaj", `${message(presetOf(field).message || "Valoarea nu este validă.")}${order}`)}`;
    }
    if (t === "textarea") {
      return `
        ${group("Limite", grid(`
          ${inputField({ prop: "validation.minLength", label: "Lungime minimă", value: v.minLength ?? "", numeric: true, span: 6, error: err("validation.minLength") })}
          ${inputField({ prop: "maxLength", label: "Lungime maximă", value: field.maxLength ?? "", numeric: true, span: 6, hint: "Peste 2000 → text nelimitat în BD." })}
        `))}
        ${group("Mesaje", `${ui().renderInfoNote?.("Textul multilinie folosește mesajele standard ale platformei (lungime minimă / maximă).") || ""}${order}`)}`;
    }
    if (t === "number" || t === "money") {
      return `
        ${group("Limite", grid(`
          ${inputField({ prop: "validation.min", label: "Minim", value: v.min ?? "", numeric: true, span: 6 })}
          ${inputField({ prop: "validation.max", label: "Maxim", value: v.max ?? "", numeric: true, span: 6, error: err("validation.max") })}
        `))}
        ${group("Mesaj", `${message("Introduceți o valoare între {min} și {max}.")}<p class="e-permits-fo-field__hint">{min} și {max} se înlocuiesc cu limitele.</p>${order}`)}`;
    }
    if (t === "email") {
      return `
        ${group("Format", ui().renderInfoNote?.("Adresa se verifică după standardul RFC 5322 (nume@domeniu.md).") || "")}
        ${group("Mesaj", `${message("Adresa email nu este validă.")}${order}`)}`;
    }
    if (t === "phone") {
      return `
        ${group("Format", `
          <div class="e-permits-fo-field"><label id="fb-phone-kind">Tip număr</label>${segmented({ prop: "phoneKind", value: field.phoneKind || "any", options: PHONE_KINDS, labelledBy: "fb-phone-kind" })}
          <p class="e-permits-fo-field__hint">Mobil +37300000000 · fix +373(cod regiune)000000.</p></div>`)}
        ${group("Mesaj", `${message("Se va indica număr telefon mobil +37300000000 sau fix +373(cod regiune)000000.")}${order}`)}`;
    }
    if (t === "date") {
      const limit = (prop, label, value) => `
        ${selectField({ prop: `${prop}.mode`, label, value: value?.mode || "none", options: DATE_LIMITS, span: 6 })}
        ${value?.mode === "fixed" ? dateInput(`${prop}.value`, "Data", value.value, 6) : ""}`;
      return `
        ${group("Limite", grid(`
          ${limit("dateMin", "Cea mai devreme", field.dateMin)}
          ${limit("dateMax", "Cea mai târzie", field.dateMax)}
          ${propError("field", field.id, "dateMax") ? `<div class="e-permits-user-create__field">${errorHtml(propError("field", field.id, "dateMax"))}</div>` : ""}
        `))}
        ${group("Format", ui().renderInfoNote?.("Format fix ZZ/LL/AAAA; data tastată se acceptă. Regulile între două câmpuri de tip dată vin în etapa următoare.") || "")}
        ${group("Mesaj", `${message("Data nu poate fi în viitor.")}${order}`)}`;
    }
    if (t === "period") {
      return `
        ${group("Limite", grid(`
          ${selectField({ prop: "dateMin.mode", label: "Cea mai devreme", value: field.dateMin?.mode || "none", options: DATE_LIMITS, span: 6 })}
          ${field.dateMin?.mode === "fixed" ? dateInput("dateMin.value", "Data", field.dateMin.value, 6) : ""}
          ${inputField({ prop: "maxDays", label: "Durată maximă (zile)", value: field.maxDays ?? "", numeric: true, span: 6, hint: "Gol = fără limită." })}
        `))}
        ${group("Regulă", ui().renderInfoNote?.("„Până la” nu poate fi înaintea lui „De la” — regula se aplică automat (spec C.4).") || "")}
        ${group("Mesaj", `${message("Data de sfârșit nu poate fi înaintea datei de început.")}${order}`)}`;
    }
    if (t === "checklist" || t === "multiselect") {
      return `
        ${group("Limite", grid(`
          ${inputField({ prop: "validation.minSelected", label: "Minim bifate", value: v.minSelected ?? "", numeric: true, span: 6 })}
          ${inputField({ prop: "validation.maxSelected", label: "Maxim bifate", value: v.maxSelected ?? "", numeric: true, span: 6, error: err("validation.maxSelected") })}
        `))}
        ${group("Mesaj", `${message("Selectați cel puțin {min} opțiuni.")}${order}`)}`;
    }
    if (t === "checkbox") return group("Regulă", `${ui().renderInfoNote?.("Obligatoriu = solicitantul trebuie să bifeze caseta pentru a continua.") || ""}${order}`);
    return group("Regulă", `${ui().renderInfoNote?.("Pentru această componentă se verifică doar „Obligatoriu”. Sursa și valorile se configurează în tabul Date.") || ""}${order}`);
  }

  /* a date input in the panel = the FO date picker (never type=date) */
  function dateInput(prop, label, iso, span = 12) {
    const id = pid(prop);
    const [y, m, d] = iso ? iso.split("-") : [];
    const today = R.localIsoDay();
    const view = (iso || today).split("-");
    const control = `
      <div class="date-picker__field" data-date-picker data-type="default" data-locale="ro" data-selected="${esc(iso || "")}" data-today="${today}" data-year="${Number(view[0])}" data-month="${Number(view[1]) - 1}">
        <div class="e-permits-fo-input e-permits-fo-input--with-action">
          <input id="${id}" type="text" class="js-date-picker-input" value="${iso ? `${d}/${m}/${y}` : ""}" placeholder="ZZ/LL/AAAA" autocomplete="off" data-fb-date="${prop}">
          <button type="button" class="e-permits-fo-input__icon-button js-date-picker-toggle" aria-label="Alege data" aria-controls="${id}-panel" aria-expanded="false">${icon("icon-calendar")}</button>
        </div>
        <div id="${id}-panel" class="date-picker-panel" aria-hidden="true" hidden>
          <div class="date-picker" role="dialog" aria-label="Alege data">
            <div class="date-picker__header">
              <button class="date-picker__nav js-date-picker-prev" type="button" aria-label="Luna anterioară"><svg class="icon medium" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-left"></use></svg></button>
              <div class="date-picker__month js-date-picker-label"></div>
              <button class="date-picker__nav js-date-picker-next" type="button" aria-label="Luna următoare"><svg class="icon medium" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-right"></use></svg></button>
            </div>
            <div class="date-picker__grid date-picker__grid--days" data-view="day">
              <div class="date-picker__weekdays">${["L", "M", "M", "J", "V", "S", "D"].map((w) => `<div class="date-picker__weekday">${w}</div>`).join("")}</div>
              <div class="date-picker__days js-date-picker-days"></div>
            </div>
          </div>
        </div>
      </div>`;
    return fieldWrap({ id, label, control, span });
  }

  /* options editor (Butoane radio, Listă de bifare, Valori statice) */
  function optionsEditor(options, { deactivate = false, presetYesNo = false, error = "" } = {}) {
    return `
      <ol class="e-permits-builder__options" aria-label="Opțiuni">
        ${options.map((option, index) => `
          <li class="e-permits-builder__option-row${deactivate && option.isValid === false ? " is-muted" : ""}">
            <span class="e-permits-builder__option-index" aria-hidden="true">${index + 1}</span>
            <div class="e-permits-fo-input${error && !String(option.label || "").trim() ? " is-error" : ""}"><input id="fb-opt-${index}" type="text" value="${esc(option.label || "")}" aria-label="Opțiunea ${index + 1}" autocomplete="off" data-fb-option="${index}"></div>
            ${deactivate
              ? ui().renderCheckOption?.({ label: "Activă", checked: option.isValid !== false, attrs: `data-fb-option-active="${index}"` }) || ""
              : `<button class="btn btn-strict btn-sm btn-icon-only" type="button" aria-label="Elimină opțiunea ${index + 1}" data-fb-option-remove="${index}"${options.length <= 1 ? ' aria-disabled="true" data-tooltip-reason="Rămâne cel puțin o opțiune."' : ""}>${icon("icon-delete", 16)}</button>`}
          </li>`).join("")}
      </ol>
      ${error ? errorHtml(error) : ""}
      <div class="e-permits-builder__inline-actions">
        <button class="btn btn-secondary btn-sm" type="button" data-fb-option-add>${icon("icon-plus-small", 16)}<span>Adaugă opțiune</span></button>
        ${presetYesNo ? '<button class="btn btn-neutral btn-sm" type="button" data-fb-option-yesno>Folosește Da / Nu</button>' : ""}
      </div>
      ${deactivate ? '<p class="e-permits-fo-field__hint">Valorile nu se șterg — se dezactivează (cererile vechi le păstrează).</p>' : ""}`;
  }

  function dataTabHtml(field) {
    if (field.type === "radio" || field.type === "checklist" || field.type === "segment") {
      return group("Opțiuni", `${optionsEditor(field.options || [], { presetYesNo: field.type !== "checklist", error: propError("field", field.id, "options") })}${field.type === "segment" ? '<p class="e-permits-fo-field__hint">2–5 opțiuni scurte (un cuvânt sau două).</p>' : ""}`);
    }
    if (field.type === "address") return addressDataHtml(field);
    if (usesSource(field.type)) return selectDataHtml(field);
    return group("Date", ui().renderInfoNote?.("Precompletarea din registre (MPass, MConnect, pașaport) vine într-o etapă următoare.") || "");
  }

  /* Listă derulantă › Date: the data source (US-22), full-flow controls */
  function selectDataHtml(field) {
    const ds = field.dataSource;
    const mode = ds?.mode || "";
    const err = (prop) => propError("field", field.id, prop);
    let body = "";
    if (mode === "existing") {
      const classifier = getClassifier(ds.classifierId);
      const otherSelects = allFields().filter(({ field: other }) => other.id !== field.id && other.type === "select" && other.dataSource);
      body = `
        <div class="e-permits-fo-field">
          <label id="fb-classifier-label">Clasificator${requiredMark()}</label>
          ${classifier ? `
            <div class="e-permits-builder__ref">
              <div class="e-permits-builder__ref-main">
                <strong>${esc(classifier.displayName)}</strong>
                <span>${ui().renderTag?.(classifier.physicalTable, "neutral") || ""}</span>
                <span class="e-permits-builder__ref-meta">${esc(VISIBILITY_LABELS[classifier.visibility] || "")} · ${classifier.rowCount} valori${classifier.multilingual ? " · multilingv" : ""}${classifier.searchable ? " · cu căutare" : ""}</span>
              </div>
              <button class="btn btn-neutral btn-sm" type="button" data-fb-browse>Schimbă</button>
            </div>` : `
            <div><button class="btn btn-secondary btn-sm" type="button" data-fb-browse>${icon("icon-search", 16)}<span>Alege din registru</span></button></div>
            ${err("ds.classifier") ? errorHtml(err("ds.classifier")) : ""}`}
        </div>
        ${classifier ? grid(selectField({ prop: "dataSource.template", label: "Șablon afișare", value: ds.template || "name", options: TEMPLATES, hint: `Exemplu: ${esc(displayLabel((CLASSIFIER_ROWS[classifier.id] || [{ code: "1", name: classifier.displayName }])[0], ds.template))}` })) : ""}
        ${classifier?.treeKey ? `
          ${toggleField({ prop: "dataSource.tree.enabled", label: "Selecție arborescentă", description: "Solicitantul alege pe niveluri (ex.: CAEM).", checked: ds.tree?.enabled })}
          ${ds.tree?.enabled ? grid(`${inputField({ prop: "dataSource.tree.maxLevels", label: "Nivel maxim", value: ds.tree.maxLevels ?? 0, numeric: true, span: 6, hint: "0 = nelimitat" })}${inputField({ prop: "dataSource.tree.minLevel", label: "Obligatoriu până la nivelul", value: ds.tree.minLevel ?? 0, numeric: true, span: 6, hint: "0 = orice nivel" })}`) : ""}` : ""}
        ${classifier && !ds.tree?.enabled ? `
          ${toggleField({ prop: "dataSource.cascade", label: "Câmp dependent", description: "Opțiunile se filtrează după alt câmp (ex.: Raion → Localitate).", checked: ds.cascade })}
          ${ds.cascade ? grid(`
            ${selectField({ prop: "dataSource.parentFieldId", label: "Câmp părinte", value: ds.parentFieldId || "", placeholder: otherSelects.length ? "Alege câmpul" : "Nicio altă listă configurată", options: otherSelects.map(({ field: other }) => [other.id, tr(other.label) || other.key]) })}
            ${selectField({ prop: "dataSource.filterColumn", label: "Coloana de filtrare", value: ds.filterColumn || "", placeholder: "Alege coloana", options: (classifier.parentColumns || []).map((column) => [column, column]), hint: classifier.parentColumns?.length ? "Coloana clasificatorului care leagă valoarea de părinte." : "Clasificatorul nu are coloane de legătură." })}
          `) : ""}` : ""}`;
    } else if (mode === "new") {
      const check = ds.technicalName ? validateTechnicalName(ds.technicalName, ds.visibility) : null;
      body = ds.saved ? `
        ${ui().renderNotice?.("success", `Clasificatorul „${esc(ds.displayName)}” a fost creat (${esc(physicalNameFor(ds.technicalName, ds.visibility))}). Valorile se adaugă din Clasificatoare.`) || ""}` : `
        ${grid(`
          ${inputField({ prop: "dataSource.displayName", label: "Denumire afișată", value: ds.displayName || "", required: true, placeholder: "Categorii risc sanitar" })}
          ${inputField({ prop: "dataSource.technicalName", label: "Denumire tehnică", value: ds.technicalName || "", required: true, placeholder: "CategoriiRisc", error: check && !check.ok ? check.error : "", hint: check?.ok ? `Tabela: ${esc(check.physical)}` : "Litere latine, cifre și „_”." })}
        `)}
        <div class="e-permits-fo-field"><label id="fb-new-vis">Vizibilitate</label>${segmented({ prop: "dataSource.visibility", value: ds.visibility || "service", options: [["global", "Global"], ["authority", "Autoritate"], ["service", "Serviciu"]], labelledBy: "fb-new-vis" })}</div>
        <div class="e-permits-check-options">
          ${checkOption({ prop: "dataSource.multilingual", label: "Multilingv", checked: ds.multilingual })}
          ${checkOption({ prop: "dataSource.searchable", label: "Cu căutare", checked: ds.searchable })}
        </div>
        <div><button class="btn btn-secondary btn-sm" type="button" data-fb-create-classifier>${icon("icon-plus-small", 16)}<span>Creează clasificatorul</span></button></div>
        ${err("ds.new") ? errorHtml(err("ds.new")) : ""}`;
    } else if (mode === "static") {
      body = `
        ${optionsEditor((ds.values || []).map((item) => ({ ...item, label: item.label })), { deactivate: true, error: err("ds.values") })}
        <div class="e-permits-check-options">${checkOption({ prop: "dataSource.multilingual", label: "Valori multilingve", checked: ds.multilingual })}</div>`;
    }
    return `
      ${group("Sursa opțiunilor", `
        ${grid(selectField({ prop: "dataSource.mode", label: "Sursa", value: mode, placeholder: "Alege sursa", required: true, error: err("ds.mode"), options: [["existing", "Clasificator existent"], ["new", "Clasificator nou"], ["static", "Valori statice"]] }))}
        ${!ds ? ui().renderNotice?.("warning", "Lista nu are sursă. Formularul nu poate fi publicat până când fiecare listă derulantă are o sursă de opțiuni.") || "" : ""}
        ${body}
      `)}`;
  }

  /* Adresă › Date: one row per part — Vizibil + Obligatoriu (checkbox option with star, never a
     switch) + details (source, default) */
  function addressDataHtml(field) {
    const open = state.addressOpen[field.id] || new Set();
    const parts = addressConfig(field);
    return group("Componentele adresei", `
      <ul class="e-permits-builder__parts">
        ${parts.map((part) => {
          const isOpen = open.has(part.key);
          const details = `
            ${part.source ? ui().renderInfoNote?.(`Sursă: ${esc(part.source)}`) || "" : ""}
            ${part.parent ? `<p class="e-permits-builder__part-cascade">${icon("icon-arrow-right", 16)}<span>Se filtrează după <strong>${esc(part.parent)}</strong></span></p>` : ""}
            ${part.note ? `<p class="e-permits-fo-field__hint">${esc(part.note)}</p>` : ""}
            ${part.noDefault ? "" : grid(inputField({ prop: `address.${part.key}.defaultValue`, label: "Valoare implicită", value: part.defaultValue || "", placeholder: "Nicio valoare", attrs: `data-fb-address-default="${part.key}"` }))}`;
          return `
            <li class="e-permits-builder__part${part.visible ? "" : " is-muted"}${isOpen ? " is-open" : ""}" data-address-item="${part.key}">
              <div class="e-permits-builder__part-head">
                <strong>${esc(part.label)}</strong>
                <em class="e-permits-builder__tag e-permits-builder__tag--outlined">${esc(part.kind)}</em>
                <button class="btn btn-strict btn-sm btn-icon-only e-permits-builder__part-toggle" type="button" aria-expanded="${isOpen}" aria-controls="fb-part-${part.key}" aria-label="Detalii: ${esc(part.label)}" data-address-toggle-section="${part.key}">${icon("icon-chevron-bottom", 16)}</button>
              </div>
              <div class="e-permits-check-options">
                ${ui().renderCheckOption?.({ label: "Vizibil", checked: part.visible, attrs: `data-address-visible="${part.key}"` }) || ""}
                ${ui().renderCheckOption?.({ label: "Obligatoriu", required: true, checked: part.required, disabled: !part.visible, reason: "Partea este ascunsă.", attrs: `data-address-required="${part.key}"` }) || ""}
              </div>
              <div class="e-permits-builder__part-body" id="fb-part-${part.key}"${isOpen ? "" : " hidden"}>${details}</div>
            </li>`;
        }).join("")}
      </ul>`);
  }

  function advancedTabHtml(field) {
    const sqlType = { text: `NVARCHAR(${field.maxLength || 100})`, textarea: Number(field.maxLength) > 2000 ? "NVARCHAR(MAX)" : `NVARCHAR(${field.maxLength || 250})`, number: field.numberKind === "decimal" ? `DECIMAL(18,${field.decimals || 1})` : "INT", money: "DECIMAL(18,2)", email: "NVARCHAR(254)", phone: "NVARCHAR(20)", date: "DATE", select: "INT (Id clasificator)", radio: "NVARCHAR(50)", checkbox: "BIT", checklist: "NVARCHAR(MAX) (listă)", address: "INT (AddressId)" }[field.type] || "—";
    return `
      ${group("Stocare", grid(`
        ${inputField({ prop: "column", label: "Coloana în baza de date", value: field.key, readonly: true, hint: "Aceeași cu cheia câmpului." })}
        ${inputField({ prop: "sqlType", label: "Tip SQL", value: sqlType, readonly: true })}
        ${textareaField({ prop: "techDescription", label: "Descriere tehnică", value: field.techDescription || "", hint: "Pentru echipa tehnică și registrul RAP; solicitantul nu o vede." })}
      `))}
      ${group("Afișare și date personale", `
        <div class="e-permits-check-options e-permits-check-options--stack">
          ${checkOption({ prop: "showInReview", label: "Afișat la Verificare (rezumat)", checked: field.showInReview !== false })}
          ${checkOption({ prop: "personalData", label: "Date cu caracter personal", checked: field.personalData })}
        </div>
        <p class="e-permits-fo-field__hint">Editabil la anumite tipuri de solicitare, RAP și formularul de tipar vin într-o etapă următoare.</p>
      `)}`;
  }

  /* ----------------------------------------------------------- issues (topbar) */
  function renderIssues() {
    const errors = state.issues.filter((issue) => issue.level === "error");
    const warnings = state.issues.filter((issue) => issue.level === "warning");
    const n = errors.length;
    el.errors.classList.toggle("is-clean", n === 0);
    el.errorsLabel.textContent = n ? `${n} ${n === 1 ? "eroare" : "erori"}` : "Fără erori";
    el.errors.setAttribute("aria-label", n ? `${n} ${n === 1 ? "eroare" : "erori"} în formular — vezi lista` : `Fără erori${warnings.length ? `, ${warnings.length} avertismente` : ""} — vezi lista`);
    const row = (issue) => `
      <li role="none">
        <button class="e-permits-fo-intent-menu__item e-permits-builder__issue${issue.level === "warning" ? " is-warning" : ""}" type="button" role="menuitem" data-fb-issue="${issue.kind}" data-id="${issue.id}" data-tab="${issue.tab}" data-prop="${esc(issue.prop)}">
          ${icon(issue.level === "warning" ? "icon-warning-filled" : "icon-circle-error-filled")}
          <span class="e-permits-builder__issue-text">
            <strong>${esc(issue.name)}</strong>
            <span>${esc(issue.message)}</span>
            <span class="e-permits-builder__issue-where">${esc(issue.where)}${issue.kind === "field" ? ` · ${esc(TAB_LABELS[issue.tab] || "")}` : ""}</span>
          </span>
        </button>
      </li>`;
    el.issuesMenu.innerHTML = `
      ${n ? `<li role="none" class="e-permits-builder__issues-head">${n} ${n === 1 ? "eroare blochează" : "erori blochează"} publicarea</li>${errors.map(row).join("")}` : `<li role="none" class="e-permits-builder__issues-head">Fără erori — formularul poate fi publicat</li>`}
      ${warnings.length ? `<li role="none" class="e-permits-builder__issues-head">Avertismente</li>${warnings.map(row).join("")}` : ""}`;
    if (el.publish) {
      if (n) {
        el.publish.setAttribute("aria-disabled", "true");
        el.publish.dataset.tooltipReason = `Corectați ${n} ${n === 1 ? "eroare" : "erori"} înainte de publicare.`;
      } else {
        el.publish.removeAttribute("aria-disabled");
        delete el.publish.dataset.tooltipReason;
      }
    }
  }

  /* -------------------------------------------------------------- preview + schema */
  /* Preview toolbar: language of the texts (RO / RU / EN, fallback RO) + test data */
  function previewBarHtml() {
    return `
      <div class="e-permits-builder__preview-bar" data-fb-preview-bar>
        <div class="e-permits-builder__lang">
          <span class="e-permits-builder__lang-label" id="fb-preview-lang">Limba formularului</span>
          <div class="segmented-control" role="radiogroup" aria-labelledby="fb-preview-lang">
            ${LANGS.map(([lang, name]) => `<button class="segment-item${state.previewLang === lang ? " is-selected" : ""}" type="button" role="radio" aria-checked="${state.previewLang === lang}" aria-label="${name}" data-fb-preview-lang="${lang}">${lang.toUpperCase()}</button>`).join("")}
          </div>
        </div>
        <div class="e-permits-builder__lang">
          <span class="e-permits-builder__lang-label" id="fb-preview-device">Ecran</span>
          <div class="segmented-control" role="radiogroup" aria-labelledby="fb-preview-device">
            ${[["desktop", "Desktop"], ["mobile", "Mobil"]].map(([value, label]) => `<button class="segment-item${state.device === value ? " is-selected" : ""}" type="button" role="radio" aria-checked="${state.device === value}" data-fb-preview-device="${value}">${label}</button>`).join("")}
          </div>
        </div>
        <div class="e-permits-builder__inline-actions">
          <button class="btn btn-neutral btn-sm" type="button" data-fb-preview-fill${state.device === "mobile" ? ' aria-disabled="true" data-tooltip-reason="Pe ecranul de telefon completați direct câmpurile."' : ""}>Completează cu date de test</button>
          <button class="btn btn-neutral btn-sm" type="button" data-fb-preview-clear>Golește</button>
        </div>
      </div>`;
  }

  /* the FO renderer's top element gets the builder ids (logic + test data find the cells) */
  const tagged = (html, attrs) => String(html).replace(/^(\s*<[a-z]+)/i, `$1 ${attrs}`);

  function renderPreview() {
    const step = activeStep();
    const index = form.steps.indexOf(step);
    const lang = state.previewLang;
    const text = (value) => tr(value, lang) || tr(value, "ro");
    if (!FRAME) {
      if (!el.preview.querySelector("[data-fb-preview-bar]")) el.preview.insertAdjacentHTML("afterbegin", previewBarHtml());
      else el.preview.querySelector("[data-fb-preview-bar]").outerHTML = previewBarHtml();
    }
    /* Mobil: the same page at 375 px in a frame (the FO media queries apply), fed by postMessage */
    const request = el.preview.querySelector(".e-permits-builder__citizen-preview");
    let device = el.preview.querySelector("[data-fb-device]");
    if (state.device === "mobile" && !FRAME) {
      request.hidden = true;
      if (!device) {
        el.preview.insertAdjacentHTML("beforeend", `<div class="e-permits-builder__device" data-fb-device><iframe class="e-permits-builder__device-frame" src="${window.location.pathname}?flow=builder&fbframe=1" width="375" title="Previzualizare pe telefon, 375 px" data-fb-device-frame></iframe></div>`);
        device = el.preview.querySelector("[data-fb-device]");
      }
      device.hidden = false;
      postToFrame();
    } else if (request) {
      request.hidden = false;
      if (device) device.hidden = true;
    }
    el.previewStepper.innerHTML = form.steps.map((item, i) => {
      const cls = i < index ? " is-completed" : i === index ? " is-active" : "";
      return `
        <li class="e-permits-fo-stepper__item${cls}"${i === index ? ' aria-current="step"' : ""}>
          <span class="e-permits-fo-stepper__connector" aria-hidden="true"></span>
          <button class="e-permits-fo-stepper__row" type="button" data-fb-preview-step="${item.id}">
            <span class="e-permits-fo-stepper__number"><span class="e-permits-fo-stepper__number-text">${i + 1}</span>${icon("icon-checkmark-small", 16).replace('class="icon"', 'class="icon e-permits-fo-stepper__check"')}</span>
            <span class="e-permits-fo-stepper__label">${esc(text(item.title))}</span>
          </button>
        </li>`;
    }).join("");
    const head = `
      <header class="e-permits-fo-form__header">
        <span class="e-permits-builder__preview-step-meta">Pasul ${index + 1} din ${form.steps.length}</span>
        <h1>${esc(text(step.title))}</h1>
        ${text(step.description) ? `<p class="e-permits-fo-section-header__desc">${esc(text(step.description))}</p>` : ""}
      </header>`;
    if (step.locked) {
      el.previewBody.innerHTML = `${head}${ui().renderInfoNote?.(`Pas generat de platformă. ${esc(PLATFORM_STEPS[step.platform] || "")}`) || ""}`;
      return;
    }
    el.previewBody.innerHTML = `${head}
      ${(step.sections || []).map((section) => {
        const title = text(section.title);
        const showTitle = section.showTitle !== false && title;
        return `
          <section class="e-permits-fo-form__section${showTitle ? "" : " e-permits-fo-form__section--plain"}" ${showTitle ? `aria-labelledby="pv-${section.id}-title"` : `aria-label="${esc(title || "Secțiune")}"`} data-fb-section="${section.id}">
            ${showTitle ? `
              <div class="e-permits-fo-section-header${section.showSeparator === false ? " e-permits-fo-section-header--no-border" : ""}">
                <h2 id="pv-${section.id}-title">${esc(title)}</h2>
                ${text(section.description) ? `<p class="e-permits-fo-section-header__desc">${esc(text(section.description))}</p>` : ""}
              </div>` : ""}
            <div class="e-permits-fo-form__section-body" data-builder-preview-grid>
              ${section.fields.map((field) => tagged(foHtml(field, { prefix: "pv", lang }), `data-fb-field="${field.id}"`)).join("")}
            </div>
          </section>`;
      }).join("")}`;
    R.bind(el.previewBody);
    applyLogic();
  }

  /* ---- logic live in the Preview (US-42 AC-09): read the answers, show / hide, require */
  function previewCell(id) { return el.previewBody.querySelector(`[data-fb-field="${id}"]`); }
  function previewValue(field) {
    const cell = previewCell(field.id);
    if (!cell || cell.hidden) return field.type === "checkbox" ? false : field.type === "checklist" || field.type === "multiselect" ? [] : "";
    switch (field.type) {
      case "radio": return cell.querySelector("input[type='radio']:checked")?.value || "";
      case "segment": return cell.querySelector(".segment-item.is-selected")?.dataset.value || "";
      case "select": { const value = cell.querySelector("[data-fo-select-value]"); return value && !value.classList.contains("e-permits-fo-select__value--placeholder") ? value.textContent.trim() : ""; }
      case "checklist": return [...cell.querySelectorAll("input[type='checkbox']:checked")].map((box) => box.value);
      case "multiselect": return [...cell.querySelectorAll(".e-permits-fo-subgen-select__option.is-selected")].map((option) => option.dataset.value);
      case "checkbox": return Boolean(cell.querySelector("input[type='checkbox']")?.checked);
      case "date": return cell.querySelector("[data-date-picker]")?.dataset.selected || "";
      default: return (cell.querySelector("input, textarea")?.value || "").trim();
    }
  }
  const toDateIso = (value) => { const m = String(value || "").match(/^(\d{2})[./](\d{2})[./](\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : String(value || ""); };
  function conditionHolds(c) {
    const source = findField(c.field)?.field;
    if (!source || !c.op) return false;
    const family = FAMILY[source.type];
    const v = previewValue(source);
    const isEmpty = Array.isArray(v) ? !v.length : v === "" || v === false;
    if (c.op === "empty") return isEmpty;
    if (c.op === "filled") return !isEmpty;
    if (c.op === "checked") return v === true;
    if (c.op === "unchecked") return v !== true;
    const list = String(c.value || "").split("|").filter(Boolean);
    if (c.op === "in") return Array.isArray(v) ? v.some((item) => list.includes(item)) : list.includes(String(v));
    if (c.op === "contains") return String(v).toLowerCase().includes(String(c.value || "").toLowerCase());
    if (family === "number" || family === "date") {
      if (isEmpty) return false;
      const a = family === "number" ? Number(String(v).replace(",", ".")) : String(v);
      const b = family === "number" ? Number(String(c.value).replace(",", ".")) : toDateIso(c.value);
      return { eq: a === b, ne: a !== b, lt: a < b, le: a <= b, gt: a > b, ge: a >= b }[c.op] ?? false;
    }
    if (c.op === "eq") return String(v) === String(c.value);
    if (c.op === "ne") return String(v) !== String(c.value);
    return false;
  }
  const ruleHolds = (rule) => { const results = rule.conditions.map(conditionHolds); return rule.join === "or" ? results.some(Boolean) : results.every(Boolean); };
  /* restrictive wins: Ascunde > Afișează; Obligatoriu > Opțional */
  function outcome(target) {
    const rules = (target.rules || []).filter((rule) => rule.conditions.every((c) => c.field && c.op));
    const shows = rules.filter((rule) => rule.action === "show");
    const hidden = rules.some((rule) => rule.action === "hide" && ruleHolds(rule)) || (shows.length > 0 && !shows.some(ruleHolds));
    let required = Boolean(target.required);
    if (rules.some((rule) => rule.action === "optional" && ruleHolds(rule))) required = false;
    if (rules.some((rule) => rule.action === "require" && ruleHolds(rule))) required = true;
    return { hidden, required };
  }
  function clearCell(cell) {
    cell.querySelectorAll("input[type='text'], input[type='email'], input[type='tel'], textarea").forEach((input) => { input.value = ""; });
    cell.querySelectorAll("input[type='radio'], input[type='checkbox']").forEach((input) => { input.checked = false; });
    cell.querySelectorAll(".segment-item.is-selected, .e-permits-fo-subgen-select__option.is-selected").forEach((item) => { item.classList.remove("is-selected"); item.setAttribute("aria-checked", "false"); item.setAttribute("aria-selected", "false"); });
    cell.querySelectorAll("[data-date-picker]").forEach((picker) => { picker.dataset.selected = ""; });
  }
  function setStar(cell, on) {
    const caption = cell.querySelector(":scope > label, :scope > legend, :scope > .e-permits-fo-field__label-counter > label, label.e-permits-fo-consent > span:last-child");
    if (!caption) return;
    const star = caption.querySelector(".e-permits-fo-required");
    if (on && !star) caption.insertAdjacentHTML("beforeend", ` ${ui().requiredMark?.() || ""}`);
    if (!on && star) star.remove();
  }
  function applyLogic() {
    if (activeStep().locked) return;
    for (let pass = 0; pass < 4; pass += 1) {
      let changed = false;
      (activeStep().sections || []).forEach((section) => {
        const sectionEl = el.previewBody.querySelector(`[data-fb-section="${section.id}"]`);
        if (sectionEl && section.rules?.length) {
          const hide = outcome(section).hidden;
          if (sectionEl.hidden !== hide) { sectionEl.hidden = hide; changed = true; if (hide) section.fields.forEach((field) => { const cell = previewCell(field.id); if (cell) clearCell(cell); }); }
        }
        section.fields.forEach((field) => {
          if (!field.rules?.length) return;
          const cell = previewCell(field.id);
          if (!cell) return;
          const result = outcome(field);
          if (cell.hidden !== result.hidden) { cell.hidden = result.hidden; changed = true; if (result.hidden) clearCell(cell); }
          if (!NO_VALUE.includes(field.type)) setStar(cell, result.required);
        });
      });
      if (!changed) break;
    }
  }
  let logicTimer = 0;
  const scheduleLogic = () => { window.clearTimeout(logicTimer); logicTimer = window.setTimeout(applyLogic, 30); };
  ["input", "change", "click", "mousedown", "keyup"].forEach((type) => el.previewBody.addEventListener(type, scheduleLogic));

  /* „Completează cu date de test”: one plausible answer per field (rules re-run) */
  function fillTestData() {
    (activeStep().sections || []).forEach((section) => section.fields.forEach((field) => {
      const cell = previewCell(field.id);
      if (!cell || cell.hidden) return;
      const input = cell.querySelector("input:not([type='radio']):not([type='checkbox']):not([type='search']), textarea");
      const sample = { text: tr(field.placeholder).replace(/^Ex\.:\s*/, "") || "Exemplu", textarea: "Text de test pentru acest câmp.", email: "ion.popescu@exemplu.md", phone: "69 123 456", number: String(field.validation?.min || 10), money: "150.00" }[field.type];
      if (sample && input) input.value = field.type === "text" && presetOf(field).sample ? presetOf(field).sample : sample;
      if (field.type === "date") { const picker = cell.querySelector("[data-date-picker]"); const iso = R.localIsoDay(7); if (picker) { picker.dataset.selected = iso; const box = picker.querySelector("input"); if (box) box.value = isoToRo(iso); } }
      if (field.type === "radio") { const first = cell.querySelector("input[type='radio']"); if (first) first.checked = true; }
      if (field.type === "segment") cell.querySelector(".segment-item")?.click();
      if (field.type === "checkbox" || field.type === "checklist") { const first = cell.querySelector("input[type='checkbox']"); if (first) first.checked = true; }
      if (field.type === "select") { const first = cell.querySelector(".e-permits-fo-select__option"); const value = cell.querySelector("[data-fo-select-value]"); if (first && value) { value.textContent = first.dataset.value; value.classList.remove("e-permits-fo-select__value--placeholder"); } }
    }));
    applyLogic();
    announce("Formularul a fost completat cu date de test.");
  }

  function postToFrame() {
    const frame = el.preview.querySelector("[data-fb-device-frame]");
    frame?.contentWindow?.postMessage({ type: "fb-preview", form, stepId: activeStep().id, lang: state.previewLang }, window.location.origin);
  }
  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin || !event.data) return;
    if (!FRAME && event.data.type === "fb-frame-ready") { postToFrame(); return; }
    if (FRAME && event.data.type === "fb-preview") {
      form = sanitize(event.data.form);
      state.stepId = event.data.stepId;
      state.previewLang = event.data.lang || "ro";
      renderPreview();
    }
  });

  function schemaOf() {
    return {
      id: form.id, code: form.code, technical: form.technical, version: form.version, status: form.dirty ? "draft" : form.status,
      title: form.title, requestTypes: form.requestTypes, access: form.access, grid: 12,
      steps: form.steps.map((step) => ({
        id: step.id, title: step.title, locked: Boolean(step.locked), platform: step.platform || undefined,
        sections: (step.sections || []).map((section) => ({
          id: section.id, title: section.title, description: section.description, showTitle: section.showTitle !== false, showSeparator: section.showSeparator !== false, rules: section.rules || [],
          fields: section.fields.map((field) => { const { published, ...rest } = field; return rest; }),
        })),
      })),
    };
  }
  function renderSchema() {
    el.schemaCode.textContent = JSON.stringify(schemaOf(), null, 2);
  }

  /* =============================================================== ACTIONS */
  function select(kind, id = "", { tab, focusLabel = false } = {}) {
    state.sel = { kind, id };
    if (kind === "field") {
      const found = findField(id);
      if (found) state.stepId = found.step.id;
      if (tab) state.tab = tab;
    } else if (kind === "section") {
      const found = findSection(id);
      if (found) state.stepId = found.step.id;
      state.tab = tab || T_GEN;
    } else if (kind === "step") {
      state.stepId = id;
    }
    renderSteps();
    renderCanvas();
    renderPanel();
    if (state.mode === "preview") renderPreview();
    if (focusLabel) focusPanel('[data-fb-prop="label"], [data-fb-prop="text"], [data-fb-prop="title"]');
  }

  function addField(type, sectionId, index, { focus = true } = {}) {
    if (!isUsable(type) || COMPONENTS[type].structural) return null;
    let section = sectionId ? findSection(sectionId)?.section : activeSection();
    if (!section || findSection(section.id)?.step.locked) {
      const step = serviceSteps()[0];
      if (!step) return null;
      state.stepId = step.id;
      if (!step.sections.length) step.sections.push(makeSection());
      section = step.sections[step.sections.length - 1];
    }
    checkpoint();
    const field = makeField(type);
    const at = index == null ? section.fields.length : Math.max(0, Math.min(index, section.fields.length));
    section.fields.splice(at, 0, field);
    state.sel = { kind: "field", id: field.id };
    state.tab = T_GEN;
    state.stepId = findSection(section.id).step.id;
    commit();
    announce(`${comp(type).label} adăugat în „${tr(section.title) || "secțiune"}”, poziția ${at + 1} din ${section.fields.length}.`);
    el.canvas.querySelector(`[data-builder-field][data-id="${field.id}"]`)?.scrollIntoView({ block: "nearest" });
    if (focus) focusPanel('[data-fb-prop="label"], [data-fb-prop="text"]');
    return field;
  }

  function addSection(stepId = activeStep().id, afterId = "") {
    const step = stepById(stepId);
    if (!step || step.locked) return;
    checkpoint();
    const section = makeSection();
    const at = afterId ? step.sections.findIndex((item) => item.id === afterId) + 1 : step.sections.length;
    step.sections.splice(at, 0, section);
    state.stepId = step.id;
    state.sel = { kind: "section", id: section.id };
    state.tab = T_GEN;
    commit();
    announce(`Secțiune nouă adăugată în pasul „${tr(step.title)}”.`);
    el.canvas.querySelector(`[data-section-id="${section.id}"]`)?.scrollIntoView({ block: "nearest" });
    focusPanel('[data-fb-prop="title"]');
  }

  function addStep() {
    checkpoint();
    const lastService = form.steps.reduce((last, step, index) => (!step.locked ? index : last), 0);
    const step = { id: uid("st"), locked: false, title: i18n("Pas nou"), description: i18n(), requestTypes: [...(form.requestTypes || [])], sections: [makeSection()] };
    form.steps.splice(lastService + 1, 0, step);
    state.stepId = step.id;
    state.sel = { kind: "step", id: step.id };
    commit();
    announce(`Pasul „Pas nou” a fost adăugat pe poziția ${form.steps.indexOf(step) + 1}.`);
    focusPanel('[data-fb-prop="title"]');
  }

  /* service steps swap only with a neighbouring service step; platform steps never move */
  function moveStep(id, delta) {
    const from = form.steps.findIndex((step) => step.id === id);
    const to = from + delta;
    if (from < 0 || !form.steps[to] || form.steps[to].locked || form.steps[from].locked) { announce("Pasul nu se poate muta acolo: pașii platformei au poziții fixe."); return; }
    checkpoint();
    const [step] = form.steps.splice(from, 1);
    form.steps.splice(to, 0, step);
    state.sel = { kind: "step", id };
    commit();
    announce(`Pasul „${tr(step.title)}” este acum pe poziția ${to + 1} din ${form.steps.length}.`);
    el.steps.querySelector(`[data-fb-step="${id}"]`)?.focus();
  }

  function deleteStep(id) {
    const step = stepById(id);
    if (!step || step.locked) return;
    if (serviceSteps().length <= 1) {
      ui().showShellToast?.("Formularul are nevoie de cel puțin un pas de serviciu.", "error");
      return;
    }
    const count = (step.sections || []).reduce((n, section) => n + section.fields.length, 0);
    ui().askConfirm?.({ title: `Ștergeți pasul „${tr(step.title)}”?`, text: count ? `Secțiunile și cele ${count} câmpuri ale pasului vor fi pierdute.` : "Pasul nu are câmpuri.", confirmLabel: "Șterge pasul", destructive: true }, () => {
      checkpoint();
      form.steps = form.steps.filter((item) => item.id !== id);
      state.stepId = serviceSteps()[0].id;
      state.sel = { kind: "form", id: "" };
      commit();
      ui().showShellToast?.(`Pasul „${tr(step.title)}” a fost șters.`, "success");
    });
  }

  function duplicateField(id) {
    const found = findField(id);
    if (!found) return;
    checkpoint();
    const copy = clone(found.field);
    copy.id = uid("fld");
    copy.published = false;
    copy.label = { ...copy.label, ro: `${tr(found.field.label)} (copie)` };
    copy.key = uniqueKey(found.field.key || camelKey(tr(copy.label)));
    found.section.fields.splice(found.index + 1, 0, copy);
    state.sel = { kind: "field", id: copy.id };
    commit();
    announce(`„${tr(found.field.label) || comp(found.field.type).label}” duplicat pe poziția ${found.index + 2}.`);
    focusCard(copy.id);
  }

  /* delete without a modal + „Anulează” in the toast, 8 s (spec F.5); a field other rules read
     asks first, red, naming them */
  function deleteField(id, { confirmed = false } = {}) {
    const found = findField(id);
    if (!found) return;
    const readers = usedIn(id);
    if (readers.length && !confirmed) {
      ui().askConfirm?.({ title: `Ștergeți câmpul „${fieldName(found.field)}”?`, text: `Regulile din ${readers.map((item) => `„${item.name}”`).join(", ")} citesc acest câmp și vor trebui corectate.`, confirmLabel: "Șterge câmpul", destructive: true }, () => deleteField(id, { confirmed: true }));
      return;
    }
    checkpoint();
    const removed = { field: clone(found.field), sectionId: found.section.id, index: found.index };
    const name = fieldName(found.field);
    const next = found.section.fields[found.index + 1] || found.section.fields[found.index - 1] || null;
    found.section.fields.splice(found.index, 1);
    state.sel = next ? { kind: "field", id: next.id } : { kind: "section", id: found.section.id };
    commit();
    announce(`Câmpul „${name}” a fost șters. Ctrl + Z îl readuce.`);
    if (next) focusCard(next.id);
    window.GEAPToast?.show({
      type: "info",
      message: `Câmpul „${name}” a fost șters.`,
      action: {
        label: "Anulează",
        /* put the field back where it was; later edits stay (Ctrl + Z walks the whole history) */
        onClick: () => {
          if (findField(id)) return;
          const section = findSection(removed.sectionId)?.section || activeSection();
          if (!section) return;
          checkpoint();
          section.fields.splice(Math.min(removed.index, section.fields.length), 0, removed.field);
          state.sel = { kind: "field", id };
          state.stepId = findSection(section.id).step.id;
          commit();
          focusCard(id);
          announce(`Câmpul „${name}” a fost readus.`);
        },
      },
      /* 8 s; opened from a demo link the toast is part of the screen and stays */
      duration: document.documentElement.dataset.demoLink ? 0 : 8000,
      key: "fb-delete",
    });
  }

  /* move a field: within its section (delta) or to another section / index */
  function moveField(id, { delta = 0, sectionId = "", index = null, announceIt = true } = {}) {
    const found = findField(id);
    if (!found) return false;
    const fromSection = found.section;
    let toSection = sectionId ? findSection(sectionId)?.section : fromSection;
    let to;
    if (delta) {
      to = found.index + delta;
      const step = found.step;
      const sectionIndex = step.sections.indexOf(fromSection);
      if (to < 0) {
        if (sectionIndex <= 0) return false;
        toSection = step.sections[sectionIndex - 1];
        to = toSection.fields.length;
      } else if (to >= fromSection.fields.length) {
        if (sectionIndex >= step.sections.length - 1) return false;
        toSection = step.sections[sectionIndex + 1];
        to = 0;
      }
    } else {
      to = index == null ? toSection.fields.length : index;
    }
    if (!toSection) return false;
    checkpoint();
    const [field] = fromSection.fields.splice(found.index, 1);
    if (toSection === fromSection && index != null && index > found.index) to -= 1;
    to = Math.max(0, Math.min(to, toSection.fields.length));
    toSection.fields.splice(to, 0, field);
    state.sel = { kind: "field", id };
    commit();
    if (announceIt) announce(`„${tr(field.label) || comp(field.type).label}” mutat pe poziția ${to + 1} din ${toSection.fields.length} în „${tr(toSection.title) || "secțiune"}”.`);
    return true;
  }

  function moveSection(id, delta) {
    const found = findSection(id);
    if (!found) return;
    const list = found.step.sections;
    const from = list.indexOf(found.section);
    const to = from + delta;
    if (to < 0 || to >= list.length) return;
    checkpoint();
    list.splice(from, 1);
    list.splice(to, 0, found.section);
    state.sel = { kind: "section", id };
    commit();
    announce(`Secțiunea „${tr(found.section.title)}” mutată pe poziția ${to + 1} din ${list.length}.`);
    el.canvas.querySelector(`[data-fb-select-section="${id}"]`)?.focus();
  }

  function copySection(id) {
    const found = findSection(id);
    if (!found) return;
    checkpoint();
    const copy = makeSection(`${tr(found.section.title)} (1)`);
    copy.description = clone(found.section.description);
    copy.showTitle = found.section.showTitle;
    copy.showSeparator = found.section.showSeparator;
    found.step.sections.splice(found.step.sections.indexOf(found.section) + 1, 0, copy);
    state.sel = { kind: "section", id: copy.id };
    commit();
    ui().showShellToast?.(`Secțiunea „${tr(copy.title)}” a fost adăugată (fără câmpuri).`, "success");
  }

  function deleteSection(id) {
    const found = findSection(id);
    if (!found) return;
    if (found.step.sections.length <= 1) {
      ui().showShellToast?.("Formularul trebuie să conțină cel puțin o secțiune.", "error");
      return;
    }
    const title = tr(found.section.title) || "fără titlu";
    ui().askConfirm?.({ title: "Ștergeți secțiunea?", text: `Sigur ștergeți secțiunea «${title}»? Câmpurile din secțiune vor fi pierdute.`, confirmLabel: "Șterge secțiunea", destructive: true }, () => {
      checkpoint();
      found.step.sections = found.step.sections.filter((item) => item.id !== id);
      state.sel = { kind: "step", id: found.step.id };
      commit();
      ui().showShellToast?.(`Secțiunea «${title}» a fost ștearsă.`, "success");
    });
  }

  function setSpan(id, span, { announceIt = true } = {}) {
    const found = findField(id);
    if (!found || !SPANS.includes(span) || found.field.span === span) return;
    checkpoint(`span:${id}`);
    found.field.span = span;
    commit();
    if (announceIt) announce(`Lățime ${span} din 12.`);
  }

  /* focus a panel input after the render; skipped when the selection changed meanwhile */
  function focusPanel(selector) {
    const key = `${state.sel.kind}:${state.sel.id}`;
    window.setTimeout(() => {
      if (`${state.sel.kind}:${state.sel.id}` !== key) return;
      const input = el.panel.querySelector(selector);
      input?.focus();
      input?.select?.();
    }, 30);
  }

  function focusCard(id) {
    window.setTimeout(() => el.canvas.querySelector(`[data-builder-field][data-id="${id}"]`)?.focus({ preventScroll: false }), 20);
  }

  /* ---------------------------------------------------- panel input → model */
  function writeProp(target, prop, value, i18nProp) {
    if (i18nProp) {
      const current = getPath(target, prop);
      const obj = current && typeof current === "object" ? current : i18n(String(current || ""));
      obj[state.lang] = value;
      setPath(target, prop, obj);
    } else {
      setPath(target, prop, value);
    }
  }

  function onPanelValue(input, { typing }) {
    const target = selectedTarget();
    if (!target) return;
    const prop = input.dataset.fbProp;
    if (!prop || input.readOnly) return;
    let value = input.type === "checkbox" ? input.checked : input.value;
    if (input.hasAttribute("data-fb-num")) value = value === "" ? "" : String(value).replace(/[^0-9.,-]/g, "").replace(",", ".");
    if (["span", "rows", "decimals"].includes(prop)) value = Number(value);
    checkpoint(typing ? `${state.sel.id}:${prop}:${state.lang}` : "");

    /* address default values live in addressConfig */
    if (prop.startsWith("address.")) {
      const [, key] = prop.split(".");
      setAddressPart(target, key, { defaultValue: value });
      commit({ panel: !typing });
      return;
    }
    /* data source mode: a configured source is replaced only after a confirmation */
    if (prop === "dataSource.mode") {
      const current = target.dataSource;
      const apply = () => {
        target.dataSource = value === "existing" ? { mode: "existing", classifierId: "", template: "name" }
          : value === "new" ? { mode: "new", displayName: "", technicalName: "", visibility: "service", multilingual: false, searchable: false, saved: false }
          : { mode: "static", multilingual: false, values: [{ id: 1, label: "", isValid: true }] };
        commit();
      };
      const configured = current && (current.classifierId || current.saved || (current.values || []).some((item) => item.label));
      if (configured && current.mode !== value) {
        ui().askConfirm?.({ title: "Schimbați sursa opțiunilor?", text: "Configurația actuală a sursei se pierde.", confirmLabel: "Schimbă sursa", destructive: true }, apply);
        renderPanel();
        return;
      }
      apply();
      return;
    }
    if (prop === "dataSource.cascade" && !value) { target.dataSource.parentFieldId = ""; target.dataSource.filterColumn = ""; }
    if (prop === "dataSource.parentFieldId") { const classifier = getClassifier(target.dataSource?.classifierId); if (!target.dataSource.filterColumn) target.dataSource.filterColumn = classifier?.parentColumns?.[0] || ""; }

    writeProp(target, prop, value, input.hasAttribute("data-fb-i18n"));

    /* Cheie câmp follows the RO label until it was edited or published */
    if (state.sel.kind === "field" && prop === "label" && state.lang === "ro" && !target.keyEdited && !target.published) {
      target.key = uniqueKey(camelKey(value || comp(target.type).label), target.id);
    }
    if (prop === "key") target.keyEdited = true;
    if (prop === "validation.preset" && PRESETS[value]?.message && !tr(target.validation.message)) {
      /* the preset's message is the default; the field may override it */
    }
    if (prop === "numberKind" && value === "decimal" && !target.decimals) target.decimals = 2;
    if (prop === "showTitle" && !value) target.showSeparator = false;
    delete state.tests[target.id];
    commit({ panel: true });
  }

  /* ---- rule builder edits (Logică) */
  function ruleAt(path) {
    const target = selectedTarget();
    const [ri, ci] = String(path).split(".").map(Number);
    const rule = target?.rules?.[ri];
    return { target, rule, cond: rule?.conditions?.[ci], ri, ci };
  }
  function onRuleEdit(input, typing) {
    if (input.matches("[data-fb-rule-action]")) { const { rule } = ruleAt(input.dataset.fbRuleAction); checkpoint(); rule.action = input.value; commit(); return true; }
    if (input.matches("[data-fb-rule-join]")) { const { rule } = ruleAt(input.dataset.fbRuleJoin); checkpoint(); rule.join = input.value; commit(); return true; }
    if (input.matches("[data-fb-cond-field]")) { const { cond } = ruleAt(input.dataset.fbCondField); checkpoint(); Object.assign(cond, { field: input.value, op: "", value: "" }); commit(); el.panel.querySelector(`#fb-co-${input.dataset.fbCondField.replace(".", "-")}`)?.focus(); return true; }
    if (input.matches("[data-fb-cond-op]")) { const { cond } = ruleAt(input.dataset.fbCondOp); checkpoint(); cond.op = input.value; if (NO_VALUE_OPS.includes(cond.op) || cond.op === "in") cond.value = ""; commit(); return true; }
    if (input.matches("[data-fb-cond-value]")) { const { cond } = ruleAt(input.dataset.fbCondValue); checkpoint(typing ? `${state.sel.id}:cond:${input.dataset.fbCondValue}` : ""); cond.value = input.value; commit(); return true; }
    if (input.matches("[data-fb-cond-in]")) {
      const { cond } = ruleAt(input.dataset.fbCondIn);
      checkpoint();
      const values = new Set(String(cond.value || "").split("|").filter(Boolean));
      if (input.checked) values.add(input.value); else values.delete(input.value);
      cond.value = [...values].join("|");
      commit();
      return true;
    }
    return false;
  }

  /* ------------------------------------------------------------ event wiring */
  el.panel.addEventListener("input", (event) => {
    const input = event.target;
    if (input.matches("[data-fb-cond-value]") && input.tagName !== "SELECT") { onRuleEdit(input, true); return; }
    if (input.matches("[data-fb-option]")) { updateOption(Number(input.dataset.fbOption), { label: input.value }, true); return; }
    if (input.matches("[data-fb-test-input]")) return;
    if (input.matches("[data-fb-prop]") && input.type !== "checkbox" && input.tagName !== "SELECT") onPanelValue(input, { typing: true });
  });
  el.panel.addEventListener("change", (event) => {
    const input = event.target;
    if (input.tagName === "SELECT" || input.type === "checkbox") { if (onRuleEdit(input, false)) return; }
    if (input.matches("[data-fb-option-active]")) { updateOption(Number(input.dataset.fbOptionActive), { isValid: input.checked }, false); return; }
    if (input.matches("[data-address-visible]")) { addressToggle(input.dataset.addressVisible, { visible: input.checked }); return; }
    if (input.matches("[data-address-required]")) { addressToggle(input.dataset.addressRequired, { required: input.checked }); return; }
    if (input.matches("[data-fb-step-rt]")) {
      const step = selectedTarget();
      checkpoint();
      const set = new Set(step.requestTypes || form.requestTypes);
      if (input.checked) set.add(input.dataset.fbStepRt); else set.delete(input.dataset.fbStepRt);
      step.requestTypes = (form.requestTypes || []).filter((type) => set.has(type));
      commit();
      return;
    }
    if (input.matches("[data-fb-date]")) {
      const iso = input.closest("[data-date-picker]")?.dataset.selected || "";
      const target = selectedTarget();
      checkpoint();
      setPath(target, input.dataset.fbDate, iso);
      commit();
      return;
    }
    if (input.matches("[data-fb-prop]") && (input.type === "checkbox" || input.tagName === "SELECT")) onPanelValue(input, { typing: false });
  });
  el.panel.addEventListener("click", (event) => {
    const lang = event.target.closest("[data-fb-lang]");
    if (lang) { state.lang = lang.dataset.fbLang; renderPanel(); el.panel.querySelector(`[data-fb-lang="${state.lang}"]`)?.focus(); return; }
    const seg = event.target.closest("[data-fb-seg]");
    if (seg) {
      const target = selectedTarget();
      if (!target) return;
      const prop = seg.dataset.fbSeg;
      let value = seg.dataset.value;
      if (prop === "span") { setSpan(target.id, Number(value)); el.panel.querySelector(`[data-fb-seg="span"][data-value="${value}"]`)?.focus(); return; }
      checkpoint();
      setPath(target, prop, value);
      commit();
      el.panel.querySelector(`[data-fb-seg="${prop}"][data-value="${value}"]`)?.focus();
      return;
    }
    const tab = event.target.closest("[data-builder-prop-tab]");
    if (tab) { state.tab = tab.dataset.builderPropTab; renderPanel(); el.panel.querySelector(`[data-builder-prop-tab="${state.tab}"]`)?.focus(); return; }
    if (event.target.closest("[data-fb-option-add]")) { addOption(); return; }
    if (event.target.closest("[data-fb-option-yesno]")) { setYesNo(); return; }
    const remove = event.target.closest("[data-fb-option-remove]");
    if (remove) { if (remove.getAttribute("aria-disabled") !== "true") removeOption(Number(remove.dataset.fbOptionRemove)); return; }
    const test = event.target.closest("[data-fb-test]");
    if (test) { runTest(); return; }
    if (event.target.closest("[data-fb-browse]")) { openRegistry(); return; }
    if (event.target.closest("[data-fb-create-classifier]")) { createClassifier(); return; }
    const partToggle = event.target.closest("[data-address-toggle-section]");
    if (partToggle) {
      const field = selectedTarget();
      const key = partToggle.dataset.addressToggleSection;
      const open = state.addressOpen[field.id] || (state.addressOpen[field.id] = new Set());
      if (open.has(key)) open.delete(key); else open.add(key);
      renderPanel();
      el.panel.querySelector(`[data-address-toggle-section="${key}"]`)?.focus();
      return;
    }
    if (event.target.closest("[data-fb-rule-add]")) {
      if (event.target.closest("[data-fb-rule-add]").getAttribute("aria-disabled") === "true") return;
      const target = selectedTarget();
      checkpoint();
      target.rules = [...(target.rules || []), makeRule()];
      commit();
      el.panel.querySelector(`#fb-cf-${target.rules.length - 1}-0`)?.focus();
      return;
    }
    const ruleRemove = event.target.closest("[data-fb-rule-remove]");
    if (ruleRemove) {
      const target = selectedTarget();
      checkpoint();
      target.rules.splice(Number(ruleRemove.dataset.fbRuleRemove), 1);
      commit();
      el.panel.querySelector("[data-fb-rule-add]")?.focus();
      announce("Regula a fost eliminată.");
      return;
    }
    const condAdd = event.target.closest("[data-fb-cond-add]");
    if (condAdd) {
      const { rule, ri } = ruleAt(`${condAdd.dataset.fbCondAdd}.0`);
      checkpoint();
      rule.conditions.push({ field: "", op: "", value: "" });
      commit();
      el.panel.querySelector(`#fb-cf-${ri}-${rule.conditions.length - 1}`)?.focus();
      return;
    }
    const condRemove = event.target.closest("[data-fb-cond-remove]");
    if (condRemove) {
      const { rule, ci, ri } = ruleAt(condRemove.dataset.fbCondRemove);
      checkpoint();
      rule.conditions.splice(ci, 1);
      commit();
      el.panel.querySelector(`[data-fb-cond-add="${ri}"]`)?.focus();
      return;
    }
    const goto = event.target.closest("[data-fb-goto]");
    if (goto) { const [kind, id] = goto.dataset.fbGoto.split(":"); select(kind, id, { tab: T_LOGIC }); return; }
    const stepRow = event.target.closest("[data-fb-step-row]");
    if (stepRow) { select("step", stepRow.dataset.fbStepRow); return; }
    const sectionRow = event.target.closest("[data-fb-section-row]");
    if (sectionRow) { select("section", sectionRow.dataset.fbSectionRow); return; }
    runMenuAction(event);
  });
  el.panel.addEventListener("keydown", (event) => {
    /* tabs: ← → like the library tabs (roving tabindex) */
    const tab = event.target.closest("[data-builder-prop-tab]");
    if (tab && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      const list = [...el.panel.querySelectorAll("[data-builder-prop-tab]")];
      const i = list.indexOf(tab);
      const next = event.key === "Home" ? list[0] : event.key === "End" ? list[list.length - 1] : list[(i + (event.key === "ArrowRight" ? 1 : -1) + list.length) % list.length];
      event.preventDefault();
      state.tab = next.dataset.builderPropTab;
      renderPanel();
      el.panel.querySelector(`[data-builder-prop-tab="${state.tab}"]`)?.focus();
      return;
    }
    const seg = event.target.closest("[data-fb-seg], [data-fb-lang]");
    if (seg && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
      const items = [...seg.parentElement.children];
      const next = items[(items.indexOf(seg) + (event.key === "ArrowRight" ? 1 : -1) + items.length) % items.length];
      event.preventDefault();
      next.click();
      return;
    }
    if (event.key === "Enter" && event.target.matches("[data-fb-test-input]")) { event.preventDefault(); runTest(); }
  });

  function addressToggle(key, updates) {
    const field = selectedTarget();
    if (!field || field.type !== "address") return;
    checkpoint();
    setAddressPart(field, key, updates);
    commit();
    el.panel.querySelector(`[data-address-${"visible" in updates ? "visible" : "required"}="${key}"]`)?.focus();
  }

  /* options: Butoane radio / Listă de bifare = field.options; Valori statice = dataSource.values */
  function optionList(field) {
    if (usesSource(field.type)) return field.dataSource.values;
    return field.options;
  }
  const optionValue = (label, index) => normalize(label).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `optiunea-${index + 1}`;
  function updateOption(index, updates, typing) {
    const field = selectedTarget();
    const list = optionList(field);
    if (!list?.[index]) return;
    checkpoint(typing ? `${field.id}:option:${index}` : "");
    Object.assign(list[index], updates);
    if ("label" in updates && !usesSource(field.type)) list[index].value = optionValue(updates.label, index);
    commit({ panel: !typing });
    if (typing) refreshPanelErrors();
  }
  function addOption() {
    const field = selectedTarget();
    const list = optionList(field);
    checkpoint();
    if (usesSource(field.type)) list.push({ id: Math.max(0, ...list.map((item) => Number(item.id) || 0)) + 1, label: "", isValid: true });
    else list.push({ value: `optiunea-${list.length + 1}`, label: `Opțiunea ${list.length + 1}` });
    commit();
    const inputs = el.panel.querySelectorAll("[data-fb-option]");
    inputs[inputs.length - 1]?.focus();
    inputs[inputs.length - 1]?.select?.();
  }
  function removeOption(index) {
    const field = selectedTarget();
    const list = optionList(field);
    if (list.length <= 1) return;
    checkpoint();
    list.splice(index, 1);
    commit();
    el.panel.querySelector(`[data-fb-option="${Math.min(index, list.length - 1)}"]`)?.focus();
  }
  function setYesNo() {
    const field = selectedTarget();
    checkpoint();
    field.options = [{ value: "da", label: "Da" }, { value: "nu", label: "Nu" }];
    field.orientation = "horizontal";
    commit();
    announce("Opțiunile sunt acum Da și Nu.");
  }
  /* while typing an option, refresh only the error marks (the inputs keep focus) */
  function refreshPanelErrors() {
    state.issues = validate();
    renderIssues();
    const field = selectedTarget();
    el.panel.querySelectorAll("[data-fb-option]").forEach((input) => {
      input.closest(".e-permits-fo-input")?.classList.toggle("is-error", Boolean(propError("field", field.id, "options") || propError("field", field.id, "ds.values")) && !input.value.trim());
    });
  }

  function runTest() {
    const field = selectedTarget();
    if (!field || field.type !== "text") return;
    const value = el.panel.querySelector("[data-fb-test-input]")?.value || "";
    const pattern = patternOf(field);
    const bad = regexError(pattern);
    let result;
    if (bad) result = { value, ok: false, error: bad };
    else {
      const v = field.validation || {};
      const min = Number(v.minLength) || 0;
      const max = Number(field.maxLength) || 0;
      if (min && value.length < min) result = { value, ok: false, error: `Prea scurt: minimum ${min} caractere.` };
      else if (max && value.length > max) result = { value, ok: false, error: `Prea lung: maximum ${max} caractere.` };
      else result = { value, ok: pattern ? new RegExp(pattern).test(value) : true };
    }
    state.tests[field.id] = result;
    renderPanel();
    el.panel.querySelector("[data-fb-test]")?.focus();
    announce(result.ok ? "Valoarea corespunde formatului." : "Valoarea nu corespunde formatului.");
  }

  function createClassifier() {
    const field = selectedTarget();
    const ds = field?.dataSource;
    if (!ds || ds.mode !== "new") return;
    const check = validateTechnicalName(ds.technicalName, ds.visibility);
    if (!String(ds.displayName || "").trim() || !check.ok) {
      ui().showShellToast?.(!String(ds.displayName || "").trim() ? "Completează denumirea afișată." : check.error, "error");
      return;
    }
    checkpoint();
    const entry = { id: `reg_${ds.technicalName.toLowerCase()}`, displayName: ds.displayName, physicalTable: check.physical, visibility: ds.visibility, multilingual: Boolean(ds.multilingual), searchable: Boolean(ds.searchable), rowCount: 0, availableColumns: ["code", "name"] };
    classifierRegistry.push(entry);
    CLASSIFIER_ROWS[entry.id] = [{ code: "1", name: ds.displayName }];
    Object.assign(ds, { saved: true, classifierId: entry.id });
    commit();
    ui().showShellToast?.(`Clasificatorul „${ds.displayName}” a fost creat.`, "success");
  }

  /* ---- classifier registry modal (existing markup, Romanian) */
  let registryFilter = "all";
  function renderRegistry() {
    const list = registryModal?.querySelector("[data-builder-registry-list]");
    if (!list) return;
    const search = normalize(registryModal.querySelector("[data-builder-registry-search]")?.value);
    const field = selectedTarget();
    const current = field?.dataSource?.classifierId || "";
    const items = classifierRegistry.filter((item) => (registryFilter === "all" || item.visibility === registryFilter) && (!search || normalize(`${item.displayName} ${item.physicalTable}`).includes(search)));
    const meta = registryModal.querySelector("[data-builder-registry-meta]");
    if (meta) meta.textContent = `Administrator de sistem · ${classifierRegistry.length} clasificatoare vizibile`;
    list.innerHTML = items.length ? items.map((item) => `
      <button class="e-permits-builder-registry__item${item.id === current ? " is-active" : ""}" type="button" data-fb-pick-classifier="${item.id}">
        <span class="e-permits-builder-registry__item-body">
          <span class="e-permits-builder-registry__item-title"><strong>${esc(item.displayName)}</strong>${ui().renderTag?.(item.physicalTable, "neutral") || ""}</span>
          <span class="e-permits-builder-registry__item-meta">${esc(VISIBILITY_LABELS[item.visibility])} · ${item.rowCount} valori${item.multilingual ? " · multilingv" : ""}${item.searchable ? " · cu căutare" : ""}</span>
        </span>
        <span class="e-permits-builder-registry__action"><span>${item.id === current ? "Ales" : "Alege"}</span>${icon("icon-chevron-right")}</span>
      </button>`).join("") : window.GEAPEmptyState?.noResults("Nu am găsit clasificatoare pentru căutarea curentă", { bare: true }) || "";
  }
  /* a library modal overlay: visible only with is-active (the old builder only toggled hidden,
     so the registry stayed at opacity 0) */
  function openRegistry() {
    if (!registryModal) return;
    renderRegistry();
    R.setModalHidden(registryModal, false);
    registryModal.classList.add("is-active");
    registryModal.querySelector(".modal")?.classList.add("is-active");
    registryModal.setAttribute("aria-hidden", "false");
    registryModal.querySelector("[data-builder-registry-search]")?.focus();
  }
  function closeRegistry() {
    if (!registryModal) return;
    registryModal.classList.remove("is-active");
    registryModal.querySelector(".modal")?.classList.remove("is-active");
    R.setModalHidden(registryModal, true);
    registryModal.setAttribute("aria-hidden", "true");
    el.panel.querySelector("[data-fb-browse]")?.focus();
  }
  registryModal?.addEventListener("click", (event) => {
    if (event.target === registryModal || event.target.closest("[data-builder-classifier-close]")) { closeRegistry(); return; }
    const filter = event.target.closest("[data-builder-registry-filter]");
    if (filter) {
      registryFilter = filter.dataset.builderRegistryFilter;
      registryModal.querySelectorAll("[data-builder-registry-filter]").forEach((item) => { const on = item === filter; item.classList.toggle("is-selected", on); item.setAttribute("aria-checked", String(on)); });
      renderRegistry();
      return;
    }
    const pick = event.target.closest("[data-fb-pick-classifier]");
    if (pick) {
      const field = selectedTarget();
      if (!field || !usesSource(field.type)) return;
      checkpoint();
      const classifier = getClassifier(pick.dataset.fbPickClassifier);
      field.dataSource = { ...(field.dataSource || {}), mode: "existing", classifierId: classifier.id, template: field.dataSource?.template || "name", tree: classifier.treeKey ? { enabled: false, maxLevels: 0, minLevel: 0 } : undefined };
      closeRegistry();
      commit();
      announce(`Clasificatorul „${classifier.displayName}” a fost ales.`);
    }
  });
  registryModal?.addEventListener("input", (event) => { if (event.target.matches("[data-builder-registry-search]")) renderRegistry(); });

  /* ---- menus (⋮ on cards, sections, panel head; „Adaugă câmp”) */
  function runMenuAction(event) {
    const act = event.target.closest("[data-fb-act]");
    if (act) {
      const id = act.dataset.id;
      if (act.dataset.fbAct === "duplicate") duplicateField(id);
      else if (act.dataset.fbAct === "delete") deleteField(id);
      else if (act.dataset.fbAct === "up") { if (moveField(id, { delta: -1 })) focusCard(id); }
      else if (act.dataset.fbAct === "down") { if (moveField(id, { delta: 1 })) focusCard(id); }
      else if (act.dataset.fbAct === "move-to") { moveField(id, { sectionId: act.dataset.section }); focusCard(id); }
      return true;
    }
    const sec = event.target.closest("[data-fb-sec-act]");
    if (sec) {
      const id = sec.dataset.id;
      if (sec.dataset.fbSecAct === "copy") copySection(id);
      else if (sec.dataset.fbSecAct === "delete") deleteSection(id);
      else if (sec.dataset.fbSecAct === "up") moveSection(id, -1);
      else if (sec.dataset.fbSecAct === "down") moveSection(id, 1);
      return true;
    }
    const stepAct = event.target.closest("[data-fb-step-act]");
    if (stepAct) {
      if (stepAct.dataset.fbStepAct === "add-section") addSection(stepAct.dataset.id);
      else if (stepAct.dataset.fbStepAct === "delete") deleteStep(stepAct.dataset.id);
      else if (stepAct.dataset.fbStepAct === "left") moveStep(stepAct.dataset.id, -1);
      else if (stepAct.dataset.fbStepAct === "right") moveStep(stepAct.dataset.id, 1);
      return true;
    }
    const add = event.target.closest("[data-fb-add-type]");
    if (add) { addField(add.dataset.fbAddType, add.dataset.section); return true; }
    return false;
  }

  /* ---- canvas clicks */
  el.canvas.addEventListener("click", (event) => {
    if (runMenuAction(event)) return;
    if (event.target.closest("[data-stack-menu-trigger], [data-stack-menu]")) return;
    if (event.target.closest("[data-fb-add-section]")) { addSection(); return; }
    const sectionButton = event.target.closest("[data-fb-select-section]");
    if (sectionButton) { select("section", sectionButton.dataset.fbSelectSection); sectionButton.isConnected || el.canvas.querySelector(`[data-fb-select-section="${sectionButton.dataset.fbSelectSection}"]`)?.focus(); return; }
    const card = event.target.closest("[data-builder-field]");
    if (card) {
      if (event.target.closest("[data-fb-resize]")) return;
      if (!(state.sel.kind === "field" && state.sel.id === card.dataset.id)) select("field", card.dataset.id);
      el.canvas.querySelector(`[data-builder-field][data-id="${card.dataset.id}"]`)?.focus({ preventScroll: true });
      return;
    }
    const sectionEl = event.target.closest("[data-builder-section]");
    if (sectionEl && !event.target.closest("[data-builder-grid] > *")) { select("section", sectionEl.dataset.sectionId); return; }
    if (!sectionEl) select("form");
  });
  /* an empty canvas click (outside sections) = back to the form's general data */
  el.scroll.addEventListener("click", (event) => {
    if (state.mode !== "build") return;
    if (event.target === el.scroll) select("form");
  });

  el.header.addEventListener("click", (event) => { if (event.target.closest("[data-fb-select-form]")) select("form"); });

  el.steps.addEventListener("click", (event) => {
    if (event.target.closest("[data-fb-add-step]")) { addStep(); return; }
    const chip = event.target.closest("[data-fb-step]");
    if (chip) { select("step", chip.dataset.fbStep); el.steps.querySelector(`[data-fb-step="${chip.dataset.fbStep}"]`)?.focus(); }
  });
  el.steps.addEventListener("keydown", (event) => {
    const chip = event.target.closest("[data-fb-step]");
    if (chip && event.altKey && ["ArrowLeft", "ArrowRight"].includes(event.key)) { event.preventDefault(); moveStep(chip.dataset.fbStep, event.key === "ArrowLeft" ? -1 : 1); return; }
    if (!chip || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const chips = [...el.steps.querySelectorAll("[data-fb-step]")];
    const i = chips.indexOf(chip);
    const next = event.key === "Home" ? chips[0] : event.key === "End" ? chips[chips.length - 1] : chips[(i + (event.key === "ArrowRight" ? 1 : -1) + chips.length) % chips.length];
    event.preventDefault();
    select("step", next.dataset.fbStep);
    el.steps.querySelector(`[data-fb-step="${next.dataset.fbStep}"]`)?.focus();
  });

  /* ---- keyboard on cards and sections: the drag alternative (WCAG 2.5.7) */
  el.canvas.addEventListener("keydown", (event) => {
    const sectionButton = event.target.closest("[data-fb-select-section]");
    if (sectionButton && event.altKey && ["ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      moveSection(sectionButton.dataset.fbSelectSection, event.key === "ArrowUp" ? -1 : 1);
      return;
    }
    const card = event.target.matches?.("[data-builder-field]") ? event.target : null;
    if (!card) return;
    const id = card.dataset.id;
    const found = findField(id);
    if (!found) return;
    const mod = event.ctrlKey || event.metaKey;
    if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      if (moveField(id, { delta: event.key === "ArrowUp" ? -1 : 1 })) focusCard(id);
      else announce(event.key === "ArrowUp" ? "Câmpul este deja primul." : "Câmpul este deja ultimul.");
      return;
    }
    if (event.altKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      const i = SPANS.indexOf(found.field.span);
      const next = SPANS[Math.max(0, Math.min(SPANS.length - 1, i + (event.key === "ArrowRight" ? 1 : -1)))];
      setSpan(id, next);
      focusCard(id);
      return;
    }
    if (mod && (event.key === "d" || event.key === "D")) { event.preventDefault(); duplicateField(id); return; }
    if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); deleteField(id); return; }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      select("field", id);
      focusCard(id);
    }
  });

  /* ---- palette: click = add at the end of the active section; drag = drop where shown */
  el.library.addEventListener("click", (event) => {
    const item = event.target.closest("[data-builder-component]");
    if (!item || item.getAttribute("aria-disabled") === "true") return;
    const type = item.dataset.builderComponent;
    if (type === "section") { addSection(); return; }
    const field = addField(type, "", null, { focus: false });
    if (field && item.dataset.fbPreset === "object-address") {
      field.label = i18n("Adresa obiectului");
      field.key = uniqueKey("AdresaObiectului", field.id);
      field.required = true;
      setAddressPart(field, "cadastral", { visible: true, required: false });
      commit();
    }
    item.focus();
  });
  el.search?.addEventListener("input", () => { state.query = el.search.value; renderLibrary(); });
  el.search?.closest(".search-input")?.querySelector(".btn-icon.clear")?.addEventListener("click", () => { state.query = ""; window.setTimeout(renderLibrary, 0); });

  /* ======================================================= drag and drop */
  let drag = null;
  const indicator = document.createElement("div");
  indicator.className = "e-permits-builder__drop-indicator";
  indicator.setAttribute("aria-hidden", "true");

  el.library.addEventListener("dragstart", (event) => {
    const item = event.target.closest("[data-builder-component]");
    if (!item || item.getAttribute("aria-disabled") === "true") { event.preventDefault(); return; }
    drag = { kind: "new", type: item.dataset.builderComponent, preset: item.dataset.fbPreset || "" };
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/plain", drag.type);
    builder.classList.add("is-dragging-component");
  });
  el.canvas.addEventListener("dragstart", (event) => {
    const card = event.target.closest?.("[data-builder-field]");
    if (!card) return;
    drag = { kind: "move", id: card.dataset.id, span: Number(card.dataset.span) };
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", card.dataset.id);
    window.setTimeout(() => card.classList.add("is-dragging"), 0);
    builder.classList.add("is-dragging-component");
  });
  const endDrag = () => {
    drag = null;
    indicator.remove();
    builder.classList.remove("is-dragging-component");
    el.canvas.querySelectorAll(".is-dragging, .is-drop-active").forEach((node) => node.classList.remove("is-dragging", "is-drop-active"));
  };
  el.library.addEventListener("dragend", endDrag);
  el.canvas.addEventListener("dragend", endDrag);

  /* where a drop lands in a section grid: index among the cards, by rows (pointer inside a card →
     before / after its middle; in a row's empty end → after the row; below → end) */
  function dropTarget(grid, x, y) {
    const cards = [...grid.querySelectorAll(":scope > [data-builder-field]")];
    if (!cards.length) return { index: 0, rect: null, edge: "empty", cards };
    const rects = cards.map((card) => card.getBoundingClientRect());
    for (let i = 0; i < cards.length; i += 1) {
      const r = rects[i];
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        return x < r.left + r.width / 2 ? { index: i, rect: r, edge: "before", cards } : { index: i + 1, rect: r, edge: "after", cards };
      }
    }
    /* rows: same top (± 8) */
    const rows = [];
    rects.forEach((r, i) => { let row = rows.find((item) => Math.abs(item.top - r.top) < 8); if (!row) rows.push(row = { top: r.top, bottom: r.bottom, items: [] }); row.bottom = Math.max(row.bottom, r.bottom); row.items.push(i); });
    if (y < rows[0].top) return { index: 0, rect: rects[0], edge: "before", cards };
    const row = rows.find((item) => y >= item.top && y <= item.bottom + 12);
    if (row) {
      const before = row.items.find((i) => x < rects[i].left + rects[i].width / 2);
      if (before != null) return { index: before, rect: rects[before], edge: "before", cards };
      const last = row.items[row.items.length - 1];
      return { index: last + 1, rect: rects[last], edge: "after", cards };
    }
    const lastIndex = cards.length - 1;
    return { index: cards.length, rect: rects[lastIndex], edge: "below", cards };
  }
  function showIndicator(grid, target) {
    const box = grid.getBoundingClientRect();
    indicator.classList.toggle("is-row", target.edge === "below" || target.edge === "empty");
    if (!indicator.isConnected || indicator.parentElement !== grid) grid.appendChild(indicator);
    let left; let top; let width; let height;
    if (target.edge === "empty") { left = 0; top = 0; width = box.width; height = 4; }
    else if (target.edge === "below") { left = 0; top = target.rect.bottom - box.top + 4; width = box.width; height = 4; }
    else { left = (target.edge === "before" ? target.rect.left - box.left - 7 : target.rect.right - box.left + 3); top = target.rect.top - box.top; width = 4; height = target.rect.height; }
    indicator.style.left = `${Math.round(left)}px`;
    indicator.style.top = `${Math.round(top)}px`;
    indicator.style.width = `${Math.round(width)}px`;
    indicator.style.height = `${Math.round(height)}px`;
  }
  el.canvas.addEventListener("dragover", (event) => {
    if (!drag) return;
    const sectionEl = event.target.closest("[data-builder-section]");
    const grid = sectionEl?.querySelector("[data-builder-grid]");
    el.canvas.querySelectorAll(".is-drop-active").forEach((node) => { if (node !== sectionEl) node.classList.remove("is-drop-active"); });
    if (!grid) { event.dataTransfer.dropEffect = "none"; indicator.remove(); return; }
    event.preventDefault();
    event.dataTransfer.dropEffect = drag.kind === "new" ? "copy" : "move";
    sectionEl.classList.add("is-drop-active");
    if (drag.kind === "new" && drag.type === "section") { indicator.remove(); return; }
    const target = dropTarget(grid, event.clientX, event.clientY);
    /* never at its own position (US-06) */
    if (drag.kind === "move") {
      const found = findField(drag.id);
      if (found && found.section.id === grid.dataset.sectionId && (target.index === found.index || target.index === found.index + 1)) { indicator.remove(); drag.target = null; return; }
    }
    drag.target = { sectionId: grid.dataset.sectionId, index: target.index };
    showIndicator(grid, target);
  });
  el.canvas.addEventListener("dragleave", (event) => {
    if (!el.canvas.contains(event.relatedTarget)) { indicator.remove(); el.canvas.querySelectorAll(".is-drop-active").forEach((node) => node.classList.remove("is-drop-active")); }
  });
  el.canvas.addEventListener("drop", (event) => {
    if (!drag) return;
    event.preventDefault();
    const sectionEl = event.target.closest("[data-builder-section]");
    const current = drag;
    endDrag();
    if (!sectionEl) return;
    if (current.kind === "new") {
      if (current.type === "section") { addSection(activeStep().id, sectionEl.dataset.sectionId); return; }
      const target = current.target || { sectionId: sectionEl.dataset.sectionId, index: null };
      const field = addField(current.type, target.sectionId, target.index);
      if (field && current.preset === "object-address") {
        field.label = i18n("Adresa obiectului");
        field.key = uniqueKey("AdresaObiectului", field.id);
        field.required = true;
        commit();
      }
      return;
    }
    if (current.target) {
      moveField(current.id, { sectionId: current.target.sectionId, index: current.target.index });
      focusCard(current.id);
    }
  });

  /* ---- width by dragging the right edge: snaps to 3 · 4 · 6 · 8 · 12 */
  el.canvas.addEventListener("pointerdown", (event) => {
    const handle = event.target.closest("[data-fb-resize]");
    if (!handle || event.button !== 0) return;
    const card = handle.closest("[data-builder-field]");
    const gridEl = card.closest("[data-builder-grid]");
    event.preventDefault();
    event.stopPropagation();
    const id = card.dataset.id;
    const startX = event.clientX;
    const startSpan = Number(card.dataset.span);
    const gap = parseFloat(getComputedStyle(gridEl).columnGap) || 0;
    const step = (gridEl.clientWidth - gap * 11) / 12 + gap;
    let span = startSpan;
    card.draggable = false;
    card.classList.add("is-resizing-field");
    builder.classList.add("is-field-resizing");
    handle.setPointerCapture?.(event.pointerId);
    const move = (e) => {
      const raw = startSpan + Math.round((e.clientX - startX) / step);
      const next = SPANS.reduce((best, value) => (Math.abs(value - raw) < Math.abs(best - raw) ? value : best), SPANS[0]);
      if (next !== span) {
        span = next;
        card.dataset.span = String(span);
        const tag = card.querySelector("[data-fb-span-tag]");
        if (tag) tag.textContent = `${span}/12`;
      }
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      builder.classList.remove("is-field-resizing");
      card.classList.remove("is-resizing-field");
      card.draggable = true;
      if (span !== startSpan) { state.sel = { kind: "field", id }; setSpan(id, span); } else select("field", id);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
  });

  /* ---- topbar: issues list → select + open the tab; publish blocked with a reason */
  el.issuesMenu.addEventListener("click", (event) => {
    const item = event.target.closest("[data-fb-issue]");
    if (!item) return;
    const { fbIssue: kind, id, tab, prop } = item.dataset;
    if (state.mode !== "build") setMode("build");
    if (kind === "form") { state.lang = "ro"; select("form"); }
    else if (kind === "step") select("step", id);
    else if (kind === "section") select("section", id, { tab: T_GEN });
    else { state.lang = "ro"; select("field", id, { tab }); }
    const card = el.canvas.querySelector(`[data-builder-field][data-id="${id}"], [data-section-id="${id}"]`);
    card?.scrollIntoView({ block: "center" });
    window.setTimeout(() => {
      const target = el.panel.querySelector(`[data-fb-prop="${CSS.escape(prop)}"]`) || el.panel.querySelector(`#${CSS.escape(pid(prop))}`) || (prop === "options" ? el.panel.querySelector("[data-fb-option]") : null) || el.panel.querySelector('[data-fb-prop="dataSource.mode"]')?.closest("[data-fo-native-select]")?.querySelector("button");
      const focusable = target?.matches?.("select[hidden]") ? target.closest("[data-fo-native-select]")?.querySelector("button") : target;
      focusable?.focus();
      focusable?.scrollIntoView?.({ block: "center" });
    }, 40);
  });
  el.publish?.addEventListener("click", (event) => {
    if (el.publish.getAttribute("aria-disabled") === "true") { event.preventDefault(); el.errors.click(); }
  });

  /* ---- modes: Editare · Previzualizare · Schemă */
  function setMode(mode = "build") {
    state.mode = mode;
    builder.dataset.mode = mode;
    builder.querySelectorAll("[data-builder-mode]").forEach((button) => {
      const on = button.dataset.builderMode === mode;
      button.classList.toggle("is-active", on);
      button.setAttribute("aria-selected", String(on));
    });
    el.canvas.hidden = mode !== "build";
    el.preview.hidden = mode !== "preview";
    el.schema.hidden = mode !== "schema";
    if (mode === "preview") renderPreview();
    if (mode === "schema") renderSchema();
  }
  builder.querySelectorAll("[data-builder-mode]").forEach((button) => button.addEventListener("click", () => setMode(button.dataset.builderMode)));
  el.preview.addEventListener("click", (event) => {
    const lang = event.target.closest("[data-fb-preview-lang]");
    if (lang) { state.previewLang = lang.dataset.fbPreviewLang; renderPreview(); el.preview.querySelector(`[data-fb-preview-lang="${state.previewLang}"]`)?.focus(); return; }
    const deviceButton = event.target.closest("[data-fb-preview-device]");
    if (deviceButton) { state.device = deviceButton.dataset.fbPreviewDevice; renderPreview(); el.preview.querySelector(`[data-fb-preview-device="${state.device}"]`)?.focus(); return; }
    const fill = event.target.closest("[data-fb-preview-fill]");
    if (fill) { if (fill.getAttribute("aria-disabled") !== "true") fillTestData(); return; }
    if (event.target.closest("[data-fb-preview-clear]")) { renderPreview(); el.preview.querySelector("[data-fb-preview-clear]")?.focus(); announce("Formularul a fost golit."); }
  });
  el.previewStepper.addEventListener("click", (event) => {
    const row = event.target.closest("[data-fb-preview-step]");
    if (!row) return;
    state.stepId = row.dataset.fbPreviewStep;
    renderSteps();
    renderPreview();
    el.previewStepper.querySelector(`[data-fb-preview-step="${state.stepId}"]`)?.focus();
  });

  /* ---- keyboard: undo / redo; Esc deselects (never closes the editor by accident) */
  window.addEventListener("keydown", (event) => {
    if (!overlay?.classList.contains("is-active")) return;
    if (event.key === "Escape") {
      if (overlay.classList.contains("is-view-only")) return;
      if (registryModal && !registryModal.hidden) { event.preventDefault(); event.stopImmediatePropagation(); closeRegistry(); return; }
      const other = [...document.querySelectorAll(".modal-overlay.is-active")].filter((node) => node !== overlay && !node.contains(overlay)).pop();
      if (other) { event.preventDefault(); event.stopImmediatePropagation(); window.__modal?.close?.(`#${other.id}`); return; }
      event.preventDefault();
      event.stopImmediatePropagation();
      const openMenu = document.querySelector("[data-stack-menu]:not([hidden])");
      if (openMenu) {
        openMenu.hidden = true;
        const trigger = document.querySelector(`[aria-controls="${openMenu.id}"]`);
        trigger?.setAttribute("aria-expanded", "false");
        trigger?.focus();
        return;
      }
      const picker = builder.querySelector(".date-picker-panel:not([hidden])");
      if (picker) {
        picker.hidden = true;
        picker.setAttribute("aria-hidden", "true");
        const toggle = picker.closest("[data-date-picker]")?.querySelector(".js-date-picker-toggle");
        toggle?.setAttribute("aria-expanded", "false");
        toggle?.focus();
        return;
      }
      if (state.mode !== "build") { setMode("build"); return; }
      if (state.sel.kind !== "form") { select("form"); announce("Nimic selectat — date generale formular."); }
      return;
    }
    const mod = event.ctrlKey || event.metaKey;
    if (!mod || (event.key !== "z" && event.key !== "Z" && event.key !== "y")) return;
    const typing = event.target.closest?.("input, textarea, [contenteditable='true']");
    if (typing) return;
    event.preventDefault();
    if (event.key === "y" || event.shiftKey) redo(); else undo();
  }, true);

  /* ---- side panels: drag their edge to resize */
  builder.querySelectorAll("[data-builder-resize-panel]").forEach((handle) => {
    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || !el.workspace) return;
      event.preventDefault();
      const side = handle.dataset.builderResizePanel;
      const styles = getComputedStyle(el.workspace);
      const startLeft = parseFloat(styles.getPropertyValue("--builder-left-width")) || 322;
      const startRight = parseFloat(styles.getPropertyValue("--builder-right-width")) || 382;
      handle.setPointerCapture?.(event.pointerId);
      builder.classList.add("is-resizing");
      const resize = (e) => {
        const box = el.workspace.getBoundingClientRect();
        if (side === "left") el.workspace.style.setProperty("--builder-left-width", `${Math.round(Math.min(Math.max(e.clientX - box.left, 260), Math.max(260, box.width - startRight - 560)))}px`);
        else el.workspace.style.setProperty("--builder-right-width", `${Math.round(Math.min(Math.max(box.right - e.clientX, 320), Math.max(320, box.width - startLeft - 560)))}px`);
      };
      const stop = () => {
        builder.classList.remove("is-resizing");
        window.removeEventListener("pointermove", resize);
        window.removeEventListener("pointerup", stop);
      };
      window.addEventListener("pointermove", resize);
      window.addEventListener("pointerup", stop);
    });
  });

  /* =========================================================== start */
  async function load() {
    const stored = readDb();
    if (stored) db = stored;
    else {
      try {
        const response = await fetch("data/form-builder-db.json", { cache: "no-store" });
        db = response.ok ? await response.json() : null;
      } catch { db = null; }
    }
    form = sanitize(clone(db?.forms?.find((item) => item.id === db.activeFormId) || db?.forms?.[0]));
    if (!form) {
      /* corrupt or missing: an empty form, never a crash (US-08) */
      form = { id: "form-new", schemaVersion: 2, technical: "f_formular_nou", code: "FRM-0000", service: { name: "Serviciu", rsspCode: "" }, title: i18n("Formular nou"), description: i18n(), access: "service", requestTypes: ["Eliberare"], version: "v0.1.0", status: "draft", editedAt: new Date().toISOString().slice(0, 16), editedBy: currentUser(), settings: { autosave: true, reviewSummary: true }, steps: [{ id: "st-applicant", platform: "applicant", locked: true, title: i18n("Date solicitant"), sections: [] }, { id: uid("st"), locked: false, title: i18n("Detalii cerere"), sections: [makeSection("Secțiune")] }] };
      db = { version: 2, activeFormId: form.id, forms: [form] };
    }
    state.stepId = serviceSteps()[0]?.id || form.steps[0].id;
    if (FRAME) {
      builder.classList.add("is-frame");
      document.documentElement.classList.add("is-fb-frame");
      setMode("preview");
      builder.dataset.fbReady = "true";
      window.parent?.postMessage({ type: "fb-frame-ready" }, window.location.origin);
      return;
    }
    renderAll();
    saveDb();
    builder.dataset.fbReady = "true";
    /* the address lists (raioane) come from the service schema: redraw once it is there */
    R.schemaReady().then(() => { renderCanvas(); if (state.mode === "preview") renderPreview(); });
  }
  load();

  if (R.demoFlow === "builder" || window.location.hash === "#builder") {
    const shell = document.querySelector(".e-permits-shell");
    if (shell) shell.style.display = "none";
    window.__modal?.open?.("#form-builder-modal");
    builder.focus({ preventScroll: true });
  }

  /* for demo states and checks */
  window.GEAPFormBuilder = { state, get form() { return form; }, select, setMode, addField, undo, redo, validate: () => state.issues };
});
