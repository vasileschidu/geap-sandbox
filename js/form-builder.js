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
  /* ?formular=<id>: open another form of the sandbox DB (e.g. form-sanitary-09: CAEM block + grids);
     a view for demos and checks — it does not become the active form */
  const FORM_PARAM = new URLSearchParams(window.location.search).get("formular") || "";
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
  /* the FO document picker (Fișier / Document din MDocs in the Preview) has the builder's z-index:
     it must come after the builder in the DOM to open above it */
  const foDocOverlay = document.querySelector("[data-fo-doc-modal-overlay]");
  if (foDocOverlay) document.body.appendChild(foDocOverlay);

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
  const localStamp = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const announce = (text) => { if (!el.live) return; el.live.textContent = ""; window.setTimeout(() => { el.live.textContent = text; }, 30); };
  const currentUser = () => document.querySelector(".e-permits-shell__user-name")?.textContent.trim() || "Vasile Schidu";

  /* ------------------------------------------------- component registry (spec § C) */
  const SPANS = [3, 4, 6, 8, 12];
  const SPAN_TEXT = { 3: "un sfert", 4: "o treime", 6: "jumătate", 8: "două treimi", 12: "tot rândul" };
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
  /* batch 3 (identity, registries, files, hidden, consent) */
  const RSP_CONSENT = "Declar pe proprie răspundere că dețin consimțământul sau temeiul legal pentru introducerea IDNP-ului și preluarea datelor prin platforma de interoperabilitate.";
  const CONSENT_TEXT = "În conformitate cu prevederile Legii nr. 133 din 08.07.2011 sunt de acord cu prelucrarea datelor mele cu caracter personal.";
  const CONTACT_PARTS = [["name", "Nume și prenume", "text"], ["phone", "Telefon", "telefon"], ["email", "Email", "email"]];
  const CONTACT_PARTS_DEFAULT = { name: { visible: true, required: true }, phone: { visible: true, required: true }, email: { visible: false, required: false } };
  const FILE_TYPES = [["PDF", "PDF"], ["JPG", "JPG"], ["PNG", "PNG"], ["DOCX", "DOCX (Word)"], ["XLSX", "XLSX (Excel)"], ["ZIP", "ZIP (arhivă)"]];
  const MDOCS_TYPES = [["extras-rsud", "Extras din Registrul de Stat al persoanelor juridice"], ["act-proprietate", "Act de proprietate asupra bunului imobil"], ["contract-locatiune", "Contract de locațiune"], ["certificat-sanitar", "Certificat sanitar-veterinar"], ["act-permisiv", "Act permisiv emis anterior"]];
  const HIDDEN_SOURCES = [["static", "Valoare fixă"], ["prefill", "Din precompletare (context)"], ["rule", "Din regulă (tabul Logică)"]];
  const PREFILL_KEYS = [["requestType", "Tipul solicitării"], ["applicantType", "Tipul solicitantului (PF / PJ)"], ["applicantIdnp", "IDNP-ul solicitantului"], ["applicantIdno", "IDNO-ul solicitantului"], ["channel", "Canalul de depunere"], ["serviceCode", "Codul serviciului"]];
  const SUBDIVISION_MODES = [["derived", "Derivată din adresă (raion)"], ["select", "Aleasă de solicitant"], ["auto", "Automat — o singură subdiviziune"]];
  const BO_MAPPING = [["", "Nu apare în fișa dosarului"], ["case-request", "Fișa dosarului › Date cerere"], ["case-object", "Fișa dosarului › Obiectul autorizat"], ["case-applicant", "Fișa dosarului › Solicitant"], ["case-contact", "Fișa dosarului › Persoana de contact"]];
  const RETENTION = [["", "Ca dosarul (implicit)"], ["5", "5 ani"], ["10", "10 ani"], ["75", "75 de ani (arhivă)"]];
  /* components made of several fields, or one block: always the whole row */
  const isFixedWidth = (field) => Boolean(COMPONENTS[field.type]?.fixed || (field.type === "idnp" && field.idnpSource === "rsp"));
  const spanOf = (field) => (isFixedWidth(field) ? 12 : Number(field.span) || 12);

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
    idnp: { label: "IDNP (persoană)", icon: "icon-id-card", category: "registry", desc: "13 cifre; din MPass sau verificat în RSP", span: 4, tabs: CHOICE_TABS, defaults: () => ({ idnpSource: "typed", consentText: i18n(RSP_CONSENT), validation: { message: i18n() } }) },
    idno: { label: "IDNO (companie)", icon: "icon-business", category: "registry", desc: "Denumirea vine din Registrul de Stat", span: 12, fixed: true, tabs: CHOICE_TABS, defaults: () => ({ idnoSource: "rsud", companyLabel: i18n("Denumirea companiei"), validation: { message: i18n() } }) },
    address: { label: "Adresă", icon: "icon-map-pin", category: "registry", desc: "Adresă structurată, cod cadastral", span: 12, tabs: CHOICE_TABS, defaults: () => ({ addressConfig: [] }) },
    contact: { label: "Persoana de contact", icon: "icon-contacts", category: "registry", desc: "Eu / altă persoană", span: 12, fixed: true, tabs: [T_GEN, T_DATA, T_LOGIC, T_ADV], defaults: () => ({ contactDefault: "self", contactParts: clone(CONTACT_PARTS_DEFAULT) }) },
    subdivision: { label: "Subdiviziune", icon: "icon-group", category: "registry", desc: "Subdiviziunea care examinează", span: 4, tabs: CHOICE_TABS, defaults: () => ({ subdivisionSource: "reg_subdiv_ansa", subdivisionMode: "derived", addressFieldId: "", subdivisionAuto: "" }) },
    /* batch 4 (1:N): a table of rows (US-33…39) and a card per element (the CAEM activities model) */
    grid: { label: "Grilă editabilă", icon: "icon-dot-grid", category: "repeat", desc: "Tabel cu rânduri adăugate de solicitant", span: 12, fixed: true, container: true, tabs: CHOICE_TABS, defaults: () => gridDefaults() },
    repeat: { label: "Bloc repetabil", icon: "icon-page-add", category: "repeat", desc: "„Adaugă alt…” pentru obiecte repetate", span: 12, fixed: true, container: true, tabs: CHOICE_TABS, defaults: () => repeatDefaults() },
    file: { label: "Fișier", icon: "icon-attachment", category: "files", desc: "Încărcare PDF, imagini", span: 12, fixed: true, tabs: INPUT_TABS, defaults: () => ({ fileTypes: ["PDF", "JPG", "PNG"], maxSizeMb: 10, maxFiles: 1, validation: { message: i18n() } }) },
    mdocs: { label: "Document din MDocs", icon: "icon-cloud-upload", category: "files", desc: "Alege din MDocs sau încarcă", span: 12, fixed: true, tabs: CHOICE_TABS, defaults: () => ({ docType: "" }) },
    section: { label: "Secțiune", icon: "icon-templates", category: "structure", desc: "Grupează câmpurile, cu titlu", structural: true },
    info: { label: "Text informativ", icon: "icon-circle-info", category: "structure", desc: "Notă pentru solicitant", span: 12, tabs: [T_GEN, T_LOGIC], defaults: () => ({ tone: "neutral", text: i18n("Text informativ pentru solicitant.") }) },
    callout: { label: "Notă cu titlu", icon: "icon-bubble-alert", category: "structure", desc: "Explicație mai lungă, cu titlu", span: 12, tabs: [T_GEN, T_LOGIC], defaults: () => ({ tone: "info", title: i18n("Titlul notei"), text: i18n("Explicația pentru solicitant.") }) },
    separator: { label: "Separator", icon: "icon-minus-small", category: "structure", desc: "Linie între grupuri de câmpuri", span: 12, tabs: [T_GEN] },
    hidden: { label: "Câmp ascuns", icon: "icon-data-access", category: "advanced", desc: "Valoare din context, nevăzută", span: 12, fixed: true, tabs: [T_GEN, T_DATA, T_LOGIC, T_ADV], defaults: () => ({ hiddenSource: "static", hiddenValue: "", prefillKey: "requestType" }) },
    calc: { label: "Câmp calculat", icon: "icon-calculator", category: "advanced", desc: "Formulă din alte câmpuri", soon: 5 },
    consent: { label: "Consimțământ", icon: "icon-shield", category: "advanced", desc: "Declarație pe propria răspundere", span: 12, fixed: true, tabs: [T_GEN, T_LOGIC, T_ADV], defaults: () => ({ required: true, text: i18n(CONSENT_TEXT), linkText: i18n("Legii nr. 133 din 08.07.2011"), linkUrl: "https://www.legis.md/cautare/getResults?doc_id=129462&lang=ro" }) },
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
    { id: "reg_caem", displayName: "Coduri CAEM", physicalTable: "GEAP_d_caem", visibility: "global", multilingual: true, searchable: true, rowCount: 5, availableColumns: ["code", "name", "section"], treeKey: "code", parentColumns: ["parent_code"], groupColumn: "section" },
    { id: "reg_caem_subgen", displayName: "Subgenuri de activitate", physicalTable: "GEAP_d_SubgenuriActivitate", visibility: "global", multilingual: true, searchable: true, rowCount: 11, availableColumns: ["code", "name", "caem_code"], parentColumns: ["caem_code"] },
    { id: "reg_raioane", displayName: "Raioane", physicalTable: "GEAP_d_raioane", visibility: "global", multilingual: true, searchable: false, rowCount: 43, availableColumns: ["code", "name"] },
    { id: "reg_localitati", displayName: "Localități", physicalTable: "GEAP_d_localitati", visibility: "global", multilingual: true, searchable: true, rowCount: 1843, availableColumns: ["code", "name"], parentColumns: ["raion_id"] },
    { id: "reg_tari", displayName: "Țări", physicalTable: "GEAP_d_tari", visibility: "global", multilingual: true, searchable: true, rowCount: 4, availableColumns: ["code", "name"] },
    { id: "reg_strazi", displayName: "Străzi", physicalTable: "GEAP_d_strazi", visibility: "global", multilingual: false, searchable: true, rowCount: 493, availableColumns: ["code", "name"], parentColumns: ["locality_id"] },
    { id: "reg_risc_comert", displayName: "Categorii risc comerț", physicalTable: "GEAP_d_Service_C01394_CategoriiRisc", visibility: "service", multilingual: false, searchable: false, rowCount: 12, availableColumns: ["code", "name"] },
    { id: "reg_institutii", displayName: "Instituții emitente", physicalTable: "GEAP_d_InstitutiiEmitente", visibility: "authority", multilingual: true, searchable: true, rowCount: 37, availableColumns: ["code", "name"] },
    { id: "reg_subdiv_ansa", displayName: "Subdiviziuni ANSA", physicalTable: "GEAP_d_Subdiviziuni_ANSA", visibility: "authority", multilingual: true, searchable: false, rowCount: 6, availableColumns: ["code", "name", "raion"], kind: "subdivisions" },
    { id: "reg_subdiv_ansp", displayName: "Subdiviziuni ANSP", physicalTable: "GEAP_d_Subdiviziuni_ANSP", visibility: "authority", multilingual: true, searchable: false, rowCount: 4, availableColumns: ["code", "name", "raion"], kind: "subdivisions" },
  ];
  const CLASSIFIER_ROWS = {
    /* the codes in the service passport (the FO list of service 09) + one of another section; group = CAEM section */
    reg_caem: [{ code: "I 56.10", name: "Restaurante", group: "I" }, { code: "I 56.21", name: "Activități de alimentație pentru evenimente", group: "I" }, { code: "I 56.30", name: "Baruri și alte activități de servire a băuturilor", group: "I" }, { code: "G 47.11", name: "Comerț cu amănuntul în magazine nespecializate", group: "G" }, { code: "P 85.20", name: "Învățământ primar", group: "P" }],
    reg_caem_subgen: [{ code: "S01", name: "Restaurant clasic", parent: "I 56.10" }, { code: "S02", name: "Pizzerie", parent: "I 56.10" }, { code: "S03", name: "Bistrou", parent: "I 56.10" }, { code: "S04", name: "Cafenea cu meniu cald", parent: "I 56.10" }, { code: "S05", name: "Restaurant fastfood", parent: "I 56.10" }, { code: "S06", name: "Catering evenimente", parent: "I 56.21" }, { code: "S07", name: "Servire la locația clientului", parent: "I 56.21" }, { code: "S08", name: "Magazin alimentar", parent: "G 47.11" }, { code: "S09", name: "Minimarket", parent: "G 47.11" }, { code: "S10", name: "Clase primare", parent: "P 85.20" }, { code: "S11", name: "After-school", parent: "P 85.20" }],
    reg_raioane: [{ code: "01", name: "Chișinău" }, { code: "02", name: "Bălți" }, { code: "03", name: "Anenii Noi" }, { code: "04", name: "Cahul" }, { code: "05", name: "Orhei" }],
    reg_localitati: [{ code: "0100", name: "mun. Chișinău", parent: "01" }, { code: "0101", name: "or. Durlești", parent: "01" }, { code: "0200", name: "mun. Bălți", parent: "02" }, { code: "0301", name: "or. Anenii Noi", parent: "03" }, { code: "0401", name: "mun. Cahul", parent: "04" }, { code: "0501", name: "mun. Orhei", parent: "05" }],
    reg_tari: [{ code: "MD", name: "Republica Moldova" }, { code: "RO", name: "România" }, { code: "UA", name: "Ucraina" }],
    reg_strazi: [{ code: "101", name: "bd. Ștefan cel Mare și Sfânt" }, { code: "102", name: "str. Pușkin" }],
    reg_risc_comert: [{ code: "1", name: "Risc redus" }, { code: "2", name: "Risc sporit" }],
    reg_institutii: [{ code: "ANSA", name: "Agenția Națională pentru Siguranța Alimentelor" }, { code: "ANSP", name: "Agenția Națională pentru Sănătate Publică" }],
    reg_subdiv_ansa: [{ code: "DT-CH", name: "Direcția teritorială Chișinău" }, { code: "DT-BL", name: "Direcția teritorială Bălți" }, { code: "DT-UN", name: "Direcția teritorială Ungheni" }, { code: "DT-OR", name: "Direcția teritorială Orhei" }, { code: "DT-CA", name: "Direcția teritorială Cahul" }, { code: "AC", name: "Aparatul central ANSA" }],
    reg_subdiv_ansp: [{ code: "AC", name: "Administrația centrală ANSP" }, { code: "CSP-CH", name: "CSP Chișinău" }, { code: "CSP-BL", name: "CSP Bălți" }, { code: "CSP-CA", name: "CSP Cahul" }],
  };
  const VISIBILITY_LABELS = { global: "Global", authority: "Autoritate", service: "Serviciu" };
  /* group names shown in the group-rule guidance (US-36 AC-04 / US-40 AC-03) */
  const GROUP_NAMES = { reg_caem: { I: "I — Activități de cazare și alimentație publică", G: "G — Comerț cu ridicata și cu amănuntul", P: "P — Învățământ" } };
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
    if (state.sel.kind === "child") return findChild(state.sel.id)?.child || null;
    if (state.sel.kind === "section") return findSection(state.sel.id)?.section || null;
    if (state.sel.kind === "step") return stepById(state.sel.id);
    return form;
  };
  /* the section new components land in: the selected one, the selected field's, else the last of the step */
  const activeSection = () => {
    if (state.sel.kind === "section") { const found = findSection(state.sel.id); if (found && found.step.id === activeStep().id) return found.section; }
    if (state.sel.kind === "field") { const found = findField(state.sel.id); if (found && found.step.id === activeStep().id) return found.section; }
    if (state.sel.kind === "child") { const found = findChild(state.sel.id); if (found && found.step.id === activeStep().id) return found.section; }
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
      label: i18n(type === "checkbox" ? "Confirm că …" : type === "idnp" ? "IDNP" : type === "idno" ? "IDNO" : type === "file" ? "Document atașat" : type === "mdocs" ? "Document" : type === "hidden" ? "Valoare ascunsă" : type === "subdivision" ? "Subdiviziunea" : label),
      help: i18n(),
      placeholder: i18n(),
      span: meta.span || 4,
      required: false,
      readOnly: false,
      createdAt: localStamp(),
      createdBy: currentUser(),
      ...(meta.defaults ? meta.defaults() : {}),
    };
    field.key = uniqueKey(camelKey(NO_VALUE.includes(type) ? `${type === "separator" ? "Separator" : "Nota"}` : tr(field.label)));
    return field;
  }

  function makeSection(title = "Secțiune nouă") {
    return { id: uid("sec"), title: i18n(title), description: i18n(), showTitle: true, showSeparator: true, fields: [] };
  }

  /* ------------------------------------------- 1:N containers (batch 4, spec § C.8, US-33…40)
     A Grilă editabilă holds `columns`, a Bloc repetabil holds `fields`; both are field objects (same
     panel, same FO renderer per cell / card). A column of type „grid” is a nested grid (≤ 3 levels,
     US-38). Rules reference children by id (rowRules.keyColumn / groupColumn, cascade parents). */
  const CONTAINERS = ["grid", "repeat"];
  const MAX_GRID_LEVEL = 3;
  /* US-34 simple column types (Dată și oră waits for batch 5) · US-37 complex ones · block fields */
  const COLUMN_SIMPLE = ["text", "number", "money", "date", "checkbox", "radio"];
  const COLUMN_COMPLEX = ["select", "multiselect", "grid"];
  const BLOCK_TYPES = ["text", "textarea", "number", "money", "email", "phone", "date", "select", "multiselect", "radio", "checkbox", "checklist", "info"];
  const CHILD_LABELS = { text: "Text", textarea: "Descriere", number: "Număr", money: "Sumă", email: "Email", phone: "Telefon", date: "Dată", checkbox: "Bifat", radio: "Opțiune", select: "Listă", multiselect: "Selecție multiplă", checklist: "Opțiuni", grid: "Sub-grilă", info: "Notă" };
  const isContainer = (field) => Boolean(field && CONTAINERS.includes(field.type));
  const kidsOf = (field) => {
    if (field?.type === "grid") { if (!Array.isArray(field.columns)) field.columns = []; return field.columns; }
    if (field?.type === "repeat") { if (!Array.isArray(field.fields)) field.fields = []; return field.fields; }
    return [];
  };
  function gridDefaults() {
    return { columns: [], rowRules: { minRows: "", maxRows: "", defaultRows: 1, allowAdd: true, allowRemove: true, keyColumn: "", groupColumn: "", pageSize: 10 }, addLabel: i18n("Adaugă rând"), emptyText: i18n("Niciun rând. Apasă «Adaugă rând» pentru a începe."), rowTitle: i18n("Rând"), messages: { min: i18n(), max: i18n(), duplicate: i18n(), group: i18n() } };
  }
  function repeatDefaults() {
    return { fields: [], itemTitle: i18n("Element"), addLabel: i18n("Adaugă alt element"), note: i18n(), labelHidden: false, rowRules: { minRows: 1, maxRows: "", defaultRows: 1, allowRemove: true, keyColumn: "", groupColumn: "" }, messages: { min: i18n(), max: i18n(), duplicate: i18n(), group: i18n() } };
  }
  /* every child of every container, with where it lives: level = the level of its container grid */
  function allChildren() {
    const out = [];
    const walk = (base, container, chain, level) => kidsOf(container).forEach((child, index, list) => {
      out.push({ ...base, container, chain, child, list, index, level });
      if (child.type === "grid") walk(base, child, [...chain, child], level + 1);
    });
    allFields().forEach(({ step, section, field }) => { if (isContainer(field)) walk({ step, section, top: field }, field, [field], 1); });
    return out;
  }
  const findChild = (id) => allChildren().find((item) => item.child.id === id) || null;
  const fieldOrChild = (id) => findField(id)?.field || findChild(id)?.child || null;
  /* the grid level of a container: a top-level grid is 1, a column grid one more than its parent */
  const levelOf = (container) => { const found = findChild(container.id); return found ? found.level + 1 : 1; };
  const containerOf = (id) => findChild(id)?.container || null;
  const inGridColumn = (child) => containerOf(child.id)?.type === "grid";
  const uniqueChildKey = (container, base, exceptId = "") => {
    const taken = new Set(kidsOf(container).filter((child) => child.id !== exceptId).map((child) => child.key));
    if (!taken.has(base)) return base;
    for (let n = 2; ; n += 1) if (!taken.has(`${base}${n}`)) return `${base}${n}`;
  };
  /* may this type live in this container? (US-34 AC-06: complex columns after a simple one; US-38: ≤ 3) */
  function childAllowed(container, type) {
    if (container.type === "repeat") return BLOCK_TYPES.includes(type) ? "" : "Blocul primește câmpuri simple și liste (fără grile, adrese sau alte blocuri).";
    if (COLUMN_SIMPLE.includes(type)) return "";
    if (!COLUMN_COMPLEX.includes(type)) return type === "datetime" ? "În lucru — etapa 5 a constructorului." : "Tipul nu poate fi coloană de grilă.";
    if (!kidsOf(container).some((child) => COLUMN_SIMPLE.includes(child.type))) return "Adaugă mai întâi o coloană simplă: coloanele complexe vin după configurația de bază (US-34).";
    if (type === "grid" && levelOf(container) >= MAX_GRID_LEVEL) return "Se permit cel mult 3 niveluri de grile imbricate (US-38).";
    return "";
  }
  function makeChild(type, container) {
    const meta = comp(type);
    const inGrid = container.type === "grid";
    const child = {
      id: uid(inGrid ? "col" : "bf"),
      type,
      key: "",
      label: i18n(CHILD_LABELS[type] || meta.label),
      help: i18n(),
      placeholder: i18n(),
      span: inGrid ? 12 : meta.span && meta.span < 12 ? 6 : 12,
      required: false,
      readOnly: false,
      createdAt: localStamp(),
      createdBy: currentUser(),
      ...(meta.defaults ? meta.defaults() : {}),
    };
    if (inGrid) child.width = type === "checkbox" || type === "number" || type === "money" ? "s" : "auto";
    if (type === "grid") { child.label = i18n("Sub-grilă"); child.rowRules.defaultRows = 0; child.span = 12; }
    if (type === "radio" && inGrid) child.options = [{ value: "da", label: "Da" }, { value: "nu", label: "Nu" }];
    if (type === "info") child.text = i18n("Notă pentru acest element.");
    child.key = uniqueChildKey(container, camelKey(tr(child.label)));
    return child;
  }
  /* a copy of a container gets new child ids; references (cascade parent, key / group column, rules) follow */
  function reidChildren(field) {
    const map = new Map();
    const walk = (container) => kidsOf(container).forEach((child) => { const next = uid(container.type === "grid" ? "col" : "bf"); map.set(child.id, next); child.id = next; if (child.type === "grid") walk(child); });
    walk(field);
    const fix = (container) => {
      ["keyColumn", "groupColumn"].forEach((prop) => { if (container.rowRules?.[prop] && map.has(container.rowRules[prop])) container.rowRules[prop] = map.get(container.rowRules[prop]); });
      kidsOf(container).forEach((child) => {
        if (child.dataSource?.parentFieldId && map.has(child.dataSource.parentFieldId)) child.dataSource.parentFieldId = map.get(child.dataSource.parentFieldId);
        (child.rules || []).forEach((rule) => rule.conditions.forEach((c) => { if (map.has(c.field)) c.field = map.get(c.field); if (map.has(c.other)) c.other = map.get(c.other); }));
        if (child.type === "grid") fix(child);
      });
    };
    fix(field);
    return map;
  }

  /* ---------------------------------------------------------------- persistence */
  function readDb() {
    try { const raw = window.localStorage.getItem(DB_KEY); const parsed = raw ? JSON.parse(raw) : null; return parsed?.forms?.length ? parsed : null; } catch { return null; }
  }
  function saveDb() {
    if (!db || !form) return;
    const index = db.forms.findIndex((item) => item.id === form.id);
    if (index >= 0) db.forms[index] = form; else db.forms.push(form);
    if (!FORM_PARAM) db.activeFormId = form.id;
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
          sanitizeChildren(field);
        });
      });
    });
    return record;
  }

  function sanitizeChildren(container) {
    if (!isContainer(container)) return;
    const defaults = container.type === "grid" ? gridDefaults() : repeatDefaults();
    container.rowRules = { ...defaults.rowRules, ...(container.rowRules || {}) };
    container.messages = { ...defaults.messages, ...(container.messages || {}) };
    ["addLabel", "emptyText", "rowTitle", "itemTitle", "note"].forEach((key) => { if (container[key] != null && typeof container[key] !== "object") container[key] = i18n(String(container[key])); });
    kidsOf(container).forEach((child) => {
      ["label", "help", "placeholder", "text", "noOptionsText"].forEach((key) => { if (child[key] != null && typeof child[key] !== "object") child[key] = i18n(String(child[key])); });
      child.label = child.label || i18n();
      child.help = child.help || i18n();
      child.placeholder = child.placeholder || i18n();
      child.validation = child.validation || {};
      child.validation.message = child.validation.message || i18n();
      sanitizeChildren(child);
    });
  }

  /* ---------------------------------------------------------------- undo / redo */
  function checkpoint(key = "") {
    const now = Date.now();
    if (key && key === state.lastCheckpoint.key && now - state.lastCheckpoint.at < 1500) { state.lastCheckpoint.at = now; return; }
    state.undo.push(JSON.stringify(form));
    if (state.undo.length > 80) state.undo.shift();
    state.redo = [];
    state.lastCheckpoint = { key, at: now };
    /* audit (Avansat › Jurnal): the selected field is the one being changed */
    const touched = state.sel.kind === "field" ? findField(state.sel.id)?.field : null;
    if (touched) { touched.editedAt = localStamp(); touched.editedBy = currentUser(); touched.changes = (touched.changes || 0) + 1; }
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
  /* the checks of one field — a form field, a grid column or a block field (keys = counts in its scope) */
  function fieldChecks(field, push, keys) {
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
    if (field.type === "date") (field.dateRules || []).forEach((rule, ri) => {
      if (!rule.op) push(T_VAL, `dateRules.${ri}.op`, `Regula de dată ${ri + 1}: alege comparația.`);
      else if (!rule.target) push(T_VAL, `dateRules.${ri}.target`, `Regula de dată ${ri + 1}: alege data cu care se compară.`);
      else if (rule.target !== "today" && !findField(rule.target)) push(T_VAL, `dateRules.${ri}.target`, `Regula de dată ${ri + 1} se compară cu un câmp șters.`);
      else if (rule.offset !== "" && rule.offset != null && !/^-?\d+$/.test(String(rule.offset))) push(T_VAL, `dateRules.${ri}.offset`, `Regula de dată ${ri + 1}: decalajul este un număr întreg.`);
    });
    if (field.type === "consent") {
      if (!tr(field.text).trim()) push(T_GEN, "text", "Completează textul declarației (RO).");
      else if (tr(field.linkText).trim() && !tr(field.text).includes(tr(field.linkText).trim())) push(T_GEN, "linkText", "Textul linkului nu apare în declarație.");
      if (tr(field.linkText).trim() && !/^https:\/\/\S+$/.test(field.linkUrl || "")) push(T_GEN, "linkUrl", "Adresa trebuie să înceapă cu https://.");
    }
    if (field.type === "hidden") {
      if (field.hiddenSource === "static" && !String(field.hiddenValue || "").trim()) push(T_DATA, "hiddenValue", "Completează valoarea câmpului ascuns.", "error", "Fără valoare");
      if (field.hiddenSource === "rule" && !(field.rules || []).some((rule) => rule.action === "set")) push(T_LOGIC, "rules", "Nicio regulă nu setează valoarea câmpului ascuns.", "warning");
    }
    if (field.type === "subdivision") {
      if (!getClassifier(field.subdivisionSource)) push(T_DATA, "subdivisionSource", "Alege clasificatorul subdiviziunilor.", "error", "Sursă neconfigurată");
      else if ((field.subdivisionMode || "derived") === "derived" && !findField(field.addressFieldId)) push(T_DATA, "addressFieldId", "Alege câmpul Adresă din care se ia raionul.", "error", "Fără adresă");
      else if (field.subdivisionMode === "auto" && !field.subdivisionAuto) push(T_DATA, "subdivisionAuto", "Alege subdiviziunea completată automat.");
    }
    if (field.type === "file") {
      if (!(field.fileTypes || []).length) push(T_VAL, "fileTypes", "Bifează cel puțin un tip de fișier.");
      const size = Number(field.maxSizeMb);
      if (!size || size < 1 || size > 60) push(T_VAL, "maxSizeMb", "Mărimea maximă: între 1 și 60 MB.");
    }
    if (field.type === "contact" && !CONTACT_PARTS.some(([key]) => field.contactParts?.[key]?.visible)) push(T_DATA, "contactParts", "Arată cel puțin un câmp al persoanei de contact.");
    if (field.type === "radio" || field.type === "checklist" || field.type === "segment") {
      const options = field.options || [];
      if (options.length < 2) push(T_DATA, "options", "Adaugă cel puțin două opțiuni.");
      else if (field.type === "segment" && options.length > 5) push(T_DATA, "options", "Comutatorul are cel mult 5 opțiuni; pentru mai multe folosiți butoane radio.");
      else if (options.some((option) => !String(option.label || "").trim())) push(T_DATA, "options", "O opțiune nu are text.");
    }
  }

  /* a grid / block: children, rows (US-36), nesting (US-38); its children are checked like fields and
     reported as „Grilă › Coloană” (kind child) */
  function containerChecks(container, push, issues, where, level) {
    const inGrid = container.type === "grid";
    const list = kidsOf(container);
    const r = container.rowRules || {};
    if (!list.length) push(T_DATA, "children", inGrid ? "Grila nu are coloane." : "Blocul nu are câmpuri.", "error", inGrid ? "Fără coloane" : "Fără câmpuri");
    if (inGrid && list.some((child) => COLUMN_COMPLEX.includes(child.type)) && !list.some((child) => COLUMN_SIMPLE.includes(child.type))) push(T_DATA, "children", "Coloanele complexe cer cel puțin o coloană simplă (configurația de bază, US-34).");
    if (inGrid && level > MAX_GRID_LEVEL) push(T_DATA, "children", "Se permit cel mult 3 niveluri de grile imbricate (US-38).");
    const num = (value) => (value === "" || value == null ? null : Number(value));
    [["minRows", r.minRows], ["maxRows", r.maxRows], ["defaultRows", r.defaultRows]].forEach(([prop, value]) => { const n = num(value); if (n != null && (!Number.isInteger(n) || n < 0)) push(T_VAL, `rowRules.${prop}`, "Un număr întreg, 0 sau mai mare."); });
    const min = num(r.minRows); const max = num(r.maxRows); const start = num(r.defaultRows);
    if (min != null && max && min > max) push(T_VAL, "rowRules.maxRows", "Minimul nu poate fi mai mare decât maximul.");
    if (start != null && max && start > max) push(T_VAL, "rowRules.defaultRows", `${inGrid ? "Rândurile" : "Elementele"} de la început depășesc maximul.`);
    if (r.keyColumn && !list.some((child) => child.id === r.keyColumn)) push(T_VAL, "rowRules.keyColumn", `${inGrid ? "Coloana" : "Câmpul"}-cheie nu mai există.`);
    if (r.groupColumn) {
      const groupChild = list.find((child) => child.id === r.groupColumn);
      if (!groupChild) push(T_VAL, "rowRules.groupColumn", `${inGrid ? "Coloana" : "Câmpul"} de grupare nu mai există.`);
      else if (groupChild.type !== "select" || groupChild.dataSource?.mode !== "existing") push(T_VAL, "rowRules.groupColumn", "Gruparea cere o listă derulantă cu clasificator.");
    }
    if (!tr(container.addLabel).trim()) push(T_GEN, "addLabel", "Completează textul butonului de adăugare.");
    if (!inGrid && !tr(container.itemTitle).trim()) push(T_GEN, "itemTitle", "Completează titlul elementului.");
    const keys = new Map();
    list.forEach((child) => { if (child.key) keys.set(child.key, (keys.get(child.key) || 0) + 1); });
    list.forEach((child) => {
      const pushChild = (tab, prop, message, lvl = "error", short = "") => issues.push({ level: lvl, kind: "child", id: child.id, tab, prop, name: `${fieldName(container)} › ${fieldName(child)}`, where, message, short });
      fieldChecks(child, pushChild, keys);
      const ds = child.dataSource;
      if (ds?.cascade && ds.parentFieldId && !list.some((other) => other.id === ds.parentFieldId) && !findField(ds.parentFieldId)) pushChild(T_DATA, "dataSource.parentFieldId", "Câmpul părinte nu mai există.");
      if (child.type === "grid") containerChecks(child, pushChild, issues, where, level + 1);
    });
  }

  function validate() {
    const issues = [];
    const keys = new Map();
    allFields().forEach(({ field }) => { if (field.key) keys.set(field.key, (keys.get(field.key) || 0) + 1); });
    allFields().forEach(({ step, section, field }) => {
      const where = `${tr(step.title)} › ${tr(section.title) || "Secțiune"}`;
      const push = (tab, prop, message, level = "error", short = "") => issues.push({ level, kind: "field", id: field.id, tab, prop, name: fieldName(field), where, message, short });
      fieldChecks(field, push, keys);
      if (isContainer(field)) containerChecks(field, push, issues, where, 1);
    });
    /* rules: complete conditions, sources that exist, no cycles */
    const checkRules = (target, kind, name, where) => (target.rules || []).forEach((rule, ri) => {
      if (rule.action === "set" && !String(rule.setValue || "").trim()) issues.push({ level: "error", kind, id: target.id, tab: T_LOGIC, prop: `rules.${ri}.setValue`, name, where, message: `Regula ${ri + 1}: completează valoarea setată.` });
      rule.conditions.forEach((c, ci) => {
      const k = `${ri}.${ci}`;
      const push = (prop, message) => issues.push({ level: "error", kind, id: target.id, tab: T_LOGIC, prop, name, where, message });
      if (!c.field) push(`rules.${k}.field`, `Regula ${ri + 1}: alege câmpul condiției.`);
      else if (!fieldOrChild(c.field)) push(`rules.${k}.field`, `Regula ${ri + 1} citește un câmp șters.`);
      else if (!c.op) push(`rules.${k}.op`, `Regula ${ri + 1}: alege operatorul.`);
      else if (c.mode === "field" && !c.other) push(`rules.${k}.value`, `Regula ${ri + 1}: alege câmpul cu care se compară.`);
      else if (c.mode === "field" && !fieldOrChild(c.other)) push(`rules.${k}.value`, `Regula ${ri + 1} se compară cu un câmp șters.`);
      else if (c.mode !== "field" && !NO_VALUE_OPS.includes(c.op) && !String(c.value || "").trim()) push(`rules.${k}.value`, `Regula ${ri + 1}: completează valoarea.`);
      });
    });
    allFields().forEach(({ step, section, field }) => checkRules(field, "field", fieldName(field), `${tr(step.title)} › ${tr(section.title) || "Secțiune"}`));
    allSections().forEach(({ step, section }) => checkRules(section, "section", tr(section.title) || "Secțiune", tr(step.title)));
    allChildren().forEach(({ step, section, container, child }) => checkRules(child, "child", `${fieldName(container)} › ${fieldName(child)}`, `${tr(step.title)} › ${tr(section.title) || "Secțiune"}`));
    dateRuleCycles().forEach((id) => {
      const found = findField(id);
      if (found) issues.push({ level: "error", kind: "field", id, tab: T_VAL, prop: "dateRules", name: fieldName(found.field), where: `${tr(found.step.title)} › ${tr(found.section.title) || "Secțiune"}`, message: "Regulile de dată formează un cerc: păstrați regula doar pe unul dintre câmpuri (cealaltă e reciprocă)." });
    });
    logicCycles().forEach((id) => {
      const found = findField(id) || findChild(id);
      const target = found?.field && found.field.id === id ? found.field : found?.child;
      if (found && target) issues.push({ level: "error", kind: found.child ? "child" : "field", id, tab: T_LOGIC, prop: "cycle", name: fieldName(target), where: `${tr(found.step.title)} › ${tr(found.section.title) || "Secțiune"}`, message: "Nu se poate salva: există o dependență circulară între câmpuri." });
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
    const addContainer = (container) => {
      if (!isContainer(container)) return;
      [container.addLabel, container.emptyText, container.rowTitle, container.itemTitle, container.note].forEach(add);
      kidsOf(container).forEach((child) => { add(child.type === "info" ? child.text : child.label); add(child.help); addContainer(child); });
    };
    add(form.title);
    form.steps.forEach((step) => { add(step.title); (step.sections || []).forEach((section) => { add(section.title); section.fields.forEach((field) => { if (field.type === "separator" || field.type === "hidden") return; if (field.type === "callout") { add(field.title); add(field.text); return; } if (field.type === "consent") { add(field.text); add(field.linkText); return; } add(field.type === "info" ? field.text : field.label); add(field.help); if (field.type === "idno") add(field.companyLabel); addContainer(field); }); }); });
    return list;
  }
  const errorsOf = (kind, id) => state.issues.filter((issue) => issue.level === "error" && (issue.kind === kind || (kind === "field" && issue.kind === "child")) && issue.id === id);
  /* the errors of every column / block field under a container (its card and step show them) */
  const childErrorsOf = (container) => { const ids = new Set(allChildren().filter((item) => item.chain.includes(container)).map((item) => item.child.id)); return state.issues.filter((issue) => issue.level === "error" && issue.kind === "child" && ids.has(issue.id)); };
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
  /* the options of a list with their codes, parents (cascade) and groups (group rule) */
  function optionMeta(field) {
    const ds = field.dataSource;
    if (!ds) return [];
    if (ds.mode === "static") return (ds.values || []).filter((item) => item.isValid !== false && String(item.label || "").trim()).map((item) => ({ label: String(item.label), code: String(item.label), name: String(item.label), parent: "", group: "" }));
    const classifier = getClassifier(ds.classifierId);
    if (!classifier) return [];
    return (CLASSIFIER_ROWS[classifier.id] || [{ code: "1", name: classifier.displayName }]).map((row) => ({ label: displayLabel(row, ds.template), code: row.code, name: row.name, parent: row.parent || "", group: row.group || "" }));
  }
  /* a list column / block field filtered by its parent: a sibling (same row / element) or a form field */
  function cascadeParentFo(child, container, { prefix }) {
    const ds = child.dataSource;
    if (!ds?.cascade || !ds.parentFieldId) return null;
    const sibling = kidsOf(container).find((other) => other.id === ds.parentFieldId);
    if (sibling) return { kind: "column", key: sibling.key, label: fieldName(sibling) };
    const field = findField(ds.parentFieldId)?.field;
    if (!field) return null;
    return { kind: "field", domId: `fo-${prefix}-${field.id}`.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase(), label: fieldName(field), meta: optionMeta(field) };
  }
  /* one column / block field for the FO grid or block (js/fo-grid.js draws it with the FO renderer) */
  function childFo(child, container, opts, level) {
    const text = (value) => tr(value, opts.lang) || tr(value, "ro");
    const v = child.validation || {};
    const base = { ref: child.id, key: child.key, type: child.type, label: text(child.label) || comp(child.type).label, required: Boolean(child.required), readOnly: Boolean(child.readOnly), width: child.width || "auto", span: container.type === "grid" ? 12 : Number(child.span) || 12, placeholder: text(child.placeholder), hint: text(child.help), message: text(v.message), defaultValue: child.defaultValue ?? "" };
    switch (child.type) {
      case "text": return { ...base, maxLength: Number(child.maxLength) || "", pattern: patternOf(child), patternMessage: presetOf(child).message || "", minLength: v.minLength || "", inputmode: presetOf(child).inputmode || "" };
      case "textarea": return { ...base, rows: child.rows, maxLength: Number(child.maxLength) || "", counter: Boolean(child.counter), minLength: v.minLength || "" };
      case "number": return { ...base, unit: child.unit || "", decimals: child.numberKind === "decimal" ? Number(child.decimals) || 1 : 0, min: v.min ?? "", max: v.max ?? "" };
      case "money": return { ...base, unit: child.currency || "MDL", decimals: 2, min: v.min ?? "", max: v.max ?? "" };
      case "date": return { ...base, dateMin: dateLimit(child.dateMin), dateMax: dateLimit(child.dateMax) };
      case "radio": case "checklist": return { ...base, radio: (child.options || []).map((option) => ({ value: option.value, label: option.label })), orientation: child.orientation || "horizontal" };
      case "checkbox": return { ...base, defaultValue: Boolean(child.defaultChecked) };
      case "info": return { ...base, text: text(child.text), tone: child.tone || "neutral" };
      case "select":
      case "multiselect": {
        const meta = optionMeta(child);
        const ds = child.dataSource || {};
        /* „Listă cu căutare” in a block + the multi-select that depends on it = the CAEM pair */
        if (child.type === "select" && ds.search && ds.mode === "existing" && container.type === "repeat") {
          const dep = kidsOf(container).find((other) => other.type === "multiselect" && other.dataSource?.cascade && other.dataSource.parentFieldId === child.id);
          const depMeta = dep ? optionMeta(dep) : [];
          return { ...base, type: "combobox", options: meta.map((m) => ({ code: m.code, label: m.name, group: m.group, subgenres: depMeta.filter((d) => d.parent === m.code).map((d) => d.label) })) };
        }
        return { ...base, options: meta.map((m) => m.label), meta, parent: cascadeParentFo(child, container, opts), minSelected: v.minSelected || "", maxSelected: v.maxSelected || "", emptyText: text(child.noOptionsText) };
      }
      case "grid": return { ...base, grid: gridFo(child, opts, level + 1) };
      default: return base;
    }
  }
  function containerTexts(field, text) {
    const m = field.messages || {};
    return { min: text(m.min), max: text(m.max), duplicate: text(m.duplicate), group: text(m.group) };
  }
  function containerRules(field) {
    const r = field.rowRules || {};
    const keyOf = (id) => kidsOf(field).find((child) => child.id === id)?.key || "";
    return { min: r.minRows, max: r.maxRows, defaultRows: r.defaultRows, allowAdd: r.allowAdd !== false, allowRemove: r.allowRemove !== false, key: keyOf(r.keyColumn), group: keyOf(r.groupColumn), pageSize: r.pageSize };
  }
  const groupNamesOf = (field) => { const groupChild = kidsOf(field).find((child) => child.id === field.rowRules?.groupColumn); return (groupChild && GROUP_NAMES[groupChild.dataSource?.classifierId]) || {}; };
  function gridFo(field, opts, level = 1) {
    const text = (value) => tr(value, opts.lang) || tr(value, "ro");
    const kids = kidsOf(field);
    return {
      id: `${opts.prefix}-${field.id}`, type: "grid", key: field.key, label: text(field.label), hint: text(field.help), required: Boolean(field.required), span: 12, level,
      columns: kids.map((child) => childFo(child, field, opts, level)),
      rules: containerRules(field),
      texts: { add: text(field.addLabel) || "Adaugă rând", empty: text(field.emptyText), row: text(field.rowTitle) || "Rând", ...containerTexts(field, text) },
      groupNames: groupNamesOf(field),
      usesSource: kids.some((child) => child.dataSource?.mode === "existing"),
    };
  }
  function repeatFo(field, opts) {
    const text = (value) => tr(value, opts.lang) || tr(value, "ro");
    const kids = kidsOf(field);
    return {
      id: `${opts.prefix}-${field.id}`, type: "repeat", key: field.key, label: text(field.label), hint: text(field.help), required: Boolean(field.required), span: 12, labelHidden: Boolean(field.labelHidden),
      fields: kids.map((child) => childFo(child, field, opts, 1)),
      rules: containerRules(field),
      texts: { add: text(field.addLabel) || "Adaugă alt element", title: text(field.itemTitle) || "Element", note: text(field.note), ...containerTexts(field, text) },
      groupNames: groupNamesOf(field),
      usesSource: kids.some((child) => child.dataSource?.mode === "existing"),
    };
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
      case "select": {
        /* „Listă cu căutare” (a classifier): the CAEM combobox */
        if (field.dataSource?.search && field.dataSource.mode === "existing") return { ...base, type: "combobox", placeholder: base.placeholder || "Selectează", options: optionMeta(field).map((m) => ({ code: m.code, label: m.name, group: m.group, subgenres: [] })) };
        return { ...base, value: "", placeholder: base.placeholder || "Selectează", options: selectOptions(field) };
      }
      case "grid": return gridFo(field, { prefix, lang }, 1);
      case "repeat": return repeatFo(field, { prefix, lang });
      case "multiselect": return { ...base, value: [], options: selectOptions(field) };
      case "segment": return { ...base, value: "", options: (field.options || []).map((option) => ({ value: option.value, label: option.label })) };
      case "callout": return { ...base, title: text(field.title), text: text(field.text), tone: field.tone || "info" };
      case "separator": return { ...base, span: 12 };
      case "period": return { ...base, value: { from: "", to: "" }, fromLabel: text(field.fromLabel) || "De la", toLabel: text(field.toLabel) || "Până la", min: dateLimit(field.dateMin) };
      case "radio": return { ...base, orientation: field.orientation, options: (field.options || []).map((option) => ({ value: option.value, label: option.label })) };
      case "checklist": return { ...base, value: [], options: (field.options || []).map((option) => ({ value: option.value, label: option.label })) };
      case "checkbox": return { ...base, value: Boolean(field.defaultChecked) };
      case "info": return { ...base, text: text(field.text), tone: field.tone || "neutral" };
      case "idnp": {
        const mode = field.idnpSource || "typed";
        return { ...base, span: mode === "rsp" ? 12 : base.span, mode, value: mode === "applicant" ? applicant().idnp : "", consentText: text(field.consentText) || RSP_CONSENT };
      }
      case "idno": {
        const a = applicant();
        return { ...base, span: 12, mode: field.idnoSource === "applicant" ? "applicant" : "rsud", value: a.idno, company: a.company, companyLabel: text(field.companyLabel) || "Denumirea companiei" };
      }
      case "contact": {
        const a = applicant();
        return { id: base.id, type: "contact-person", prefix: base.id, label: base.label, required: false, span: 12, default: field.contactDefault === "other" ? "other" : "self", parts: field.contactParts || CONTACT_PARTS_DEFAULT, selfPhone: a.phone, selfEmail: a.email };
      }
      case "subdivision": {
        const rows = subdivisionRows(field);
        const mode = field.subdivisionMode || "derived";
        if (mode === "auto") return { ...base, mode, subdivisions: [field.subdivisionAuto || rows[0] || ""] };
        const mapping = {};
        if (mode === "derived") R.districts().forEach((district) => { const word = String(district.value || "").split(" ").pop(); const hit = rows.find((row) => row.includes(word)); if (hit) mapping[district.value] = hit; });
        return { ...base, mode, subdivisions: rows, mapping };
      }
      case "file": return { ...base, span: 12, types: field.fileTypes || ["PDF"], maxSizeMb: field.maxSizeMb || 10, maxFiles: field.maxFiles || 1 };
      case "mdocs": return { ...base, span: 12, docType: (MDOCS_TYPES.find(([value]) => value === field.docType) || [])[1] || "" };
      case "hidden": return { id: base.id, type: "hidden", key: field.key, value: hiddenValue(field) };
      case "consent": return { ...base, span: 12, required: true, label: text(field.label), text: text(field.text), linkText: text(field.linkText), linkUrl: field.linkUrl || "" };
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
  /* the applicant of the Preview (MPass) — from the FO schema subjects */
  const applicant = () => R.applicant?.() || {};
  const subdivisionRows = (field) => (CLASSIFIER_ROWS[field.subdivisionSource] || []).map((row) => row.name);
  /* a hidden field's value: fixed, from the context, or set by a rule (Logică) */
  function hiddenValue(field) {
    if (field.hiddenSource === "static") return field.hiddenValue || "";
    if (field.hiddenSource === "prefill") {
      const a = applicant();
      return { requestType: (form.requestTypes || [])[0] || "", applicantType: a.type || "", applicantIdnp: a.idnp || "", applicantIdno: a.idno || "", channel: "portal", serviceCode: form.service?.rsspCode || "" }[field.prefillKey] || "";
    }
    return "";
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
    /* Componente salvate: system presets first, then the saved ones (newest last) */
    const saved = presets().filter((preset) => !query || normalize(`${preset.name} ${preset.desc} componente salvate ${comp(preset.type).label}`).includes(query));
    const configured = saved.length ? `
        <section class="e-permits-builder__library-section" aria-labelledby="fb-lib-configured" data-fb-library-saved>
          <h3 id="fb-lib-configured">Componente salvate</h3>
          ${saved.map((preset) => `
          <button class="e-permits-builder__library-item" type="button" draggable="true" data-builder-component="${preset.type}" data-fb-preset="${preset.id}">
            <span>${icon(preset.icon || comp(preset.type).icon)}</span>
            <strong>${esc(preset.name)}${preset.system ? "" : ui().renderTag?.(`v${preset.version}`, "neutral") || ""}</strong>
            <em>${esc(preset.desc || comp(preset.type).label)}</em>
          </button>`).join("")}
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
          const hasError = !step.locked && (errorsOf("step", step.id).length || (step.sections || []).some((section) => errorsOf("section", section.id).length || section.fields.some((field) => errorsOf("field", field.id).length || (isContainer(field) && childErrorsOf(field).length))));
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
  /* Câmp ascuns on the canvas: never drawn for the applicant (the FO renders an <input type=hidden>),
     so the card shows a dashed „Ascuns · valoare” marker — only in Build */
  function hiddenMarkerHtml(field) {
    const source = field.hiddenSource || "static";
    const value = hiddenValue(field);
    const what = source === "static" ? (value ? `„${value}”` : "fără valoare") : source === "prefill" ? `${(PREFILL_KEYS.find(([key]) => key === field.prefillKey) || [])[1] || ""}${value ? ` · „${value}”` : ""}` : "setată de reguli";
    return `
      <p class="e-permits-builder__hidden-marker">
        ${icon("icon-data-access", 16)}
        <strong>Ascuns</strong>
        <span title="${esc(tr(field.label) || "Câmp ascuns")} · ${esc(what)}">${esc(tr(field.label) || "Câmp ascuns")} · ${esc(what)}</span>
      </p>`;
  }
  /* ---- 1:N containers on the canvas: the band of columns / block fields (US-34 „zonă de coloane”):
     a chip per child (click = its properties, drag = reorder, Alt + ← / → or ↑ / ↓ = move, Delete),
     palette types dropped on the band become children, „+ Coloană” opens the typed menu */
  function addChildMenuHtml(container, where) {
    const inGrid = container.type === "grid";
    const item = (type) => {
      const reason = childAllowed(container, type);
      return `<li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitem"${reason ? ` aria-disabled="true" data-tooltip-reason="${esc(reason)}"` : ""} data-fb-add-child="${type}" data-container="${container.id}">${icon(comp(type).icon)}<span>${esc(type === "grid" ? "Grilă imbricată" : comp(type).label)}</span></button></li>`;
    };
    const head = (text) => `<li role="none" class="e-permits-builder__issues-head">${esc(text)}</li>`;
    const fromForm = allFields().map(({ field }) => field).filter((field) => !isContainer(field) && !childAllowed(container, field.type) && !(container.type === "grid" && COLUMN_COMPLEX.includes(field.type) && childAllowed(container, field.type)));
    const groups = inGrid
      ? `${head("Coloane simple")}${[...COLUMN_SIMPLE, "datetime"].map(item).join("")}${head("Coloane complexe")}${COLUMN_COMPLEX.map(item).join("")}`
      : `${head("Câmpuri")}${BLOCK_TYPES.map(item).join("")}`;
    const copies = fromForm.length ? `${head("Copie a unui câmp din formular")}${fromForm.map((field) => `<li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" data-fb-add-child-from="${field.id}" data-container="${container.id}">${icon(comp(field.type).icon)}<span>${esc(fieldName(field))}</span></button></li>`).join("")}` : "";
    return `<ul class="e-permits-fo-intent-menu e-permits-stack__menu e-permits-builder__add-menu" id="fb-addchild-${container.id}-${where}" role="menu" aria-label="${inGrid ? "Adaugă o coloană" : "Adaugă un câmp în bloc"}" hidden data-stack-menu>${groups}${copies}</ul>`;
  }
  const childHasIssue = (child) => errorsOf("child", child.id).length > 0 || (child.type === "grid" && childErrorsOf(child).length > 0);
  function subsStripHtml(field) {
    const inGrid = field.type === "grid";
    const selected = state.sel.kind === "child" ? findChild(state.sel.id) : null;
    return `
      <div class="e-permits-builder__subs" data-fb-subs="${field.id}" role="group" aria-label="${inGrid ? "Coloanele grilei" : "Câmpurile blocului"} „${esc(fieldName(field))}”">
        <span class="e-permits-builder__subs-label" aria-hidden="true">${inGrid ? "Coloane" : "Câmpuri"}</span>
        ${kidsOf(field).map((child) => {
          const bad = childHasIssue(child);
          const on = Boolean(selected && (selected.child === child || selected.chain.includes(child)));
          return `<button class="e-permits-builder__sub${on ? " is-selected" : ""}${bad ? " has-issue" : ""}" type="button" draggable="true" data-fb-child="${child.id}" aria-pressed="${on}" aria-describedby="fb-sub-kbd-hint" aria-label="${esc(`${child.type === "grid" ? "Grilă imbricată" : comp(child.type).label}: ${fieldName(child)}${child.required ? ", obligatoriu" : ""}${bad ? ", are erori" : ""}`)}" title="${esc(fieldName(child))}">${icon(comp(child.type).icon, 16)}<span>${esc(fieldName(child))}</span>${child.required ? requiredMark() : ""}${bad ? icon("icon-warning-filled", 16) : ""}</button>`;
        }).join("")}
        <div class="e-permits-stack__menu-wrap e-permits-builder__sub-add-wrap">
          <button class="e-permits-builder__sub-add" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="fb-addchild-${field.id}-cv" data-stack-menu-trigger>${icon("icon-plus-small", 16)}<span>${inGrid ? "Coloană" : "Câmp"}</span></button>
          ${addChildMenuHtml(field, "cv")}
        </div>
      </div>`;
  }
  function emptyContainerHtml(field) {
    const inGrid = field.type === "grid";
    return window.GEAPEmptyState?.render({ title: inGrid ? "Grila nu are coloane" : "Blocul nu are câmpuri", text: inGrid ? "Trage un tip din bibliotecă pe banda „Coloane” sau apasă „+ Coloană”." : "Trage un câmp din bibliotecă pe banda „Câmpuri” sau apasă „+ Câmp”.", icon: inGrid ? "dot-grid" : "page-add", compact: true, bare: true }) || "";
  }

  function fieldCardHtml(field, section, index, total) {
    const meta = comp(field.type);
    const selected = (state.sel.kind === "field" && state.sel.id === field.id) || (state.sel.kind === "child" && findChild(state.sel.id)?.top === field);
    const ownErrors = errorsOf("field", field.id);
    const kidErrors = isContainer(field) ? childErrorsOf(field) : [];
    const errors = ownErrors.length ? ownErrors : kidErrors.length ? [{ message: `${kidErrors.length} ${kidErrors.length === 1 ? "problemă" : "probleme"} în ${field.type === "grid" ? "coloane" : "câmpurile blocului"}: ${kidErrors[0].message}`, short: `${kidErrors.length} ${kidErrors.length === 1 ? "problemă" : "probleme"} în ${field.type === "grid" ? "coloane" : "câmpuri"}` }] : [];
    const name = fieldName(field);
    const sectionsInStep = activeStep().sections || [];
    const moveItems = [
      { label: "Duplică", icon: "copy", attrs: `data-fb-act="duplicate" data-id="${field.id}"` },
      { label: "Salvează ca componentă", icon: "bookmark", attrs: `data-fb-act="save-preset" data-id="${field.id}"` },
      ...(index > 0 ? [{ label: "Mută mai sus", icon: "arrow-up", attrs: `data-fb-act="up" data-id="${field.id}"` }] : []),
      ...(index < total - 1 ? [{ label: "Mută mai jos", icon: "arrow-down", attrs: `data-fb-act="down" data-id="${field.id}"` }] : []),
      ...sectionsInStep.filter((item) => item.id !== section.id).map((item) => ({ label: `Mută în „${tr(item.title) || "Secțiune"}”`, icon: "arrow-right", attrs: `data-fb-act="move-to" data-id="${field.id}" data-section="${item.id}"` })),
      { label: "Șterge", icon: "delete", danger: true, attrs: `data-fb-act="delete" data-id="${field.id}"` },
    ];
    return `
      <article class="e-permits-builder__field${selected ? " is-selected" : ""}${errors.length ? " has-issue" : ""}" data-builder-field data-id="${field.id}" data-type="${field.type}" data-span="${spanOf(field)}" tabindex="0" aria-label="${esc(meta.label)}: ${esc(name)}, lățime ${spanOf(field)} din 12${field.required ? ", obligatoriu" : ""}${field.type === "hidden" ? ", ascuns pentru solicitant" : ""}" aria-describedby="${KBD_HINT_ID}">
        <div class="e-permits-builder__field-tools">
          <div class="e-permits-builder__field-meta">
            <span class="e-permits-builder__drag-grip" aria-hidden="true">${icon("icon-drag", 16)}</span>
            <em class="e-permits-builder__tag e-permits-builder__tag--strong" title="${esc(meta.label)}">${esc(meta.label)}</em>
            <em class="e-permits-builder__tag e-permits-builder__tag--outlined" data-fb-span-tag>${spanOf(field)}/12</em>
          </div>
          <div class="e-permits-builder__field-actions">
            ${ui().renderStackMenu?.(moveItems, name) || ""}
          </div>
        </div>
        ${isContainer(field) ? subsStripHtml(field) : ""}
        <div class="e-permits-builder__field-render" inert>${field.type === "hidden" ? hiddenMarkerHtml(field) : isContainer(field) && !kidsOf(field).length ? emptyContainerHtml(field) : foHtml(field, { prefix: "cv", inCard: true })}</div>
        ${NO_VALUE.includes(field.type) && !errors.length && !(field.rules || []).length && !field.preset ? "" : `
        <div class="e-permits-builder__field-foot">
          ${NO_VALUE.includes(field.type) ? "" : `<span class="e-permits-builder__field-key" title="${esc(field.key)}">${esc(field.key)}</span>`}
          ${(field.rules || []).length ? `<em class="e-permits-builder__tag e-permits-builder__tag--outlined">${field.rules.length} ${field.rules.length === 1 ? "regulă" : "reguli"}</em>` : ""}
          ${field.preset ? `<em class="e-permits-builder__tag e-permits-builder__tag--outlined" title="Din componenta salvată „${esc(presetById(field.preset.id)?.name || "")}”">${icon("icon-bookmark", 16)}Salvată</em>` : ""}
          ${errors.length ? `<em class="e-permits-builder__tag e-permits-builder__tag--warning" title="${esc(errors[0].message)}">${icon("icon-warning-filled", 16)}${esc(errors[0].short || errors[0].message)}</em>` : ""}
        </div>`}
        ${isFixedWidth(field) ? "" : '<button class="e-permits-builder__field-resize" type="button" tabindex="-1" aria-hidden="true" data-fb-resize></button>'}
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
      <p class="u-visually-hidden" id="fb-sub-kbd-hint">Alt + săgeată stânga sau dreapta (grilă) ori sus sau jos (bloc) mută elementul; Delete îl șterge.</p>
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
    /* grids on the (inert) canvas: table or cards, by the room the card has */
    window.GEAPFoRepeat?.layout(el.canvas);
  }
  if (typeof ResizeObserver === "function") new ResizeObserver(() => window.GEAPFoRepeat?.layout(el.canvas)).observe(el.canvas);

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
  /* „Lățime” (2026-10-14, user: „a line with real columns”): a row of equal column bars, one radio per
     allowed width covering its own columns; bars up to the value are filled. Hover previews the change
     (CSS only: bars that would fill / empty turn lighter). Reuses the `data-fb-seg` click + arrow keys.
     options = [[value, cols, label, aria]] in order; `total` = number of bars. */
  function widthPicker({ prop, value, options, total, label, caption, disabled = false, reason = "" }) {
    const index = options.findIndex(([v]) => String(v) === String(value));
    const filled = index >= 0 ? options.slice(0, index + 1).reduce((n, [, cols]) => n + cols, 0) : 0;
    let col = 0;
    const captionId = `fb-width-cap-${prop.replace(/[^a-z0-9]+/gi, "-")}`;
    return `
      <div class="e-permits-builder__width${disabled ? " is-disabled" : ""}">
        <div class="e-permits-builder__width-picker" role="radiogroup" aria-label="${esc(label)}" aria-describedby="${captionId}" data-total="${total}"${disabled ? ' aria-disabled="true"' : ""}>
          ${options.map(([v, cols, , aria], i) => {
            const on = i === index;
            const bars = Array.from({ length: cols }, () => { col += 1; return `<span class="e-permits-builder__width-bar${col <= filled ? " is-filled" : ""}"></span>`; }).join("");
            return `<button class="e-permits-builder__width-option" type="button" role="radio" aria-checked="${on}" aria-label="${esc(aria)}" data-cols="${cols}" data-fb-seg="${prop}" data-value="${esc(v)}" tabindex="${on || (index < 0 && i === 0) ? 0 : -1}"${disabled ? " disabled" : ""}>${bars}</button>`;
          }).join("")}
        </div>
        <p class="e-permits-builder__width-caption" id="${captionId}">${caption}</p>
        ${reason ? `<p class="e-permits-fo-field__hint">${esc(reason)}</p>` : ""}
      </div>`;
  }
  /* a field's span on the 12-column grid */
  const spanPicker = (field, { fixed = false, reason = "" } = {}) => {
    const span = fixed ? 12 : Number(field.span) || 12;
    return widthPicker({
      prop: "span",
      value: span,
      total: 12,
      options: SPANS.map((value, i) => [value, value - (SPANS[i - 1] || 0), `${value}/12`, `${value} din 12 coloane — ${SPAN_TEXT[value]}`]),
      label: `Lățime: ${span} din 12 coloane`,
      caption: `<strong>${span}/12</strong> · ${SPAN_TEXT[span] || ""}`,
      disabled: fixed,
      reason,
    });
  };
  /* a grid column's share of the table row: parts (Îngustă 2 · Medie 3 · Lată 4); „auto” = Medie */
  const COLUMN_PARTS = [["s", 2, "Îngustă"], ["m", 3, "Medie"], ["l", 4, "Lată"]];
  const columnPicker = (field) => {
    const value = !field.width || field.width === "auto" ? "m" : field.width;
    const [, parts, name] = COLUMN_PARTS.find(([v]) => v === value) || COLUMN_PARTS[1];
    return widthPicker({
      prop: "width",
      value,
      total: 4,
      options: COLUMN_PARTS.map(([v, p, n], i) => [v, p - (COLUMN_PARTS[i - 1]?.[1] || 0), n, `${n} — ${p} părți din 4`]),
      label: `Lățime coloană: ${name}, ${parts} părți din 4`,
      caption: `<strong>${name}</strong> · ${parts} părți${!field.width || field.width === "auto" ? " (implicită)" : ""}`,
    });
  };

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

  function panelHead({ crumbs = [], title, chip = "", menu = "", subtitle = "", back = null }) {
    return `
      <div class="e-permits-builder__panel-head e-permits-builder__panel-head--selected">
        ${crumbs.length ? `<p class="e-permits-builder__crumbs">${crumbs.map(esc).join('<span aria-hidden="true"> › </span>')}</p>` : ""}
        ${back ? `<div><button class="btn btn-text-primary btn-sm e-permits-builder__back" type="button" data-fb-goto="${back.kind}:${back.id}:${T_DATA}">${icon("icon-arrow-left", 16)}<span>${esc(back.label)}</span></button></div>` : ""}
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
    else if (state.sel.kind === "child") html = childPanelHtml(findChild(state.sel.id));
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
            <div><dt>Reguli de comportament</dt><dd>${allFields().reduce((n, { field }) => n + (field.rules || []).length, 0) + allSections().reduce((n, { section }) => n + (section.rules || []).length, 0)}</dd></div>
            <div><dt>Reguli de dată</dt><dd>${allFields().reduce((n, { field }) => n + (field.dateRules || []).length, 0)}</dd></div>
            <div><dt>Surse externe</dt><dd>${allFields().filter(({ field }) => field.type === "address" || field.type === "subdivision" || field.type === "mdocs" || field.dataSource?.mode === "existing" || (field.type === "idno" && field.idnoSource !== "applicant") || (field.type === "idnp" && field.idnpSource === "rsp")).length}</dd></div>
            <div><dt>Componente salvate folosite</dt><dd>${allFields().filter(({ field }) => field.preset).length}</dd></div>
            <div><dt>Grile și blocuri repetabile</dt><dd>${allFields().filter(({ field }) => isContainer(field)).length}</dd></div>
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
    const addSection = `<button class="btn btn-secondary btn-sm" type="button" data-fb-step-act="add-section" data-id="${step.id}">${icon("icon-plus-small", 16)}<span>Adaugă secțiune</span></button>`;
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
        ${group("Secțiuni", (step.sections || []).length ? `
          <ol class="e-permits-builder__step-list">
            ${step.sections.map((section) => `
              <li><button class="e-permits-builder__step-row" type="button" data-fb-section-row="${section.id}"><span>${esc(tr(section.title) || "Secțiune fără titlu")}</span><span class="e-permits-builder__step-row-meta">${section.fields.length} câmpuri</span></button></li>`).join("")}
          </ol>
          <div>${addSection}</div>
        ` : window.GEAPEmptyState.render({ title: "Nicio secțiune", text: "Câmpurile pasului stau în secțiuni. Adaugă prima secțiune.", icon: "templates", compact: true, actionHtml: addSection }))}
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
  const FAMILY = { text: "text", textarea: "text", email: "text", phone: "text", number: "number", money: "number", date: "date", select: "choice", radio: "choice", segment: "choice", multiselect: "multi", checklist: "multi", checkbox: "bool", idnp: "text", idno: "text", hidden: "text", subdivision: "choice", consent: "bool", grid: "number", repeat: "number" };
  const OPS = { eq: "Este egal", ne: "Este diferit", contains: "Conține", in: "În listă", lt: "Mai mic", le: "Mai mic sau egal", gt: "Mai mare", ge: "Mai mare sau egal", empty: "Este gol", filled: "Este completat", checked: "Este bifat", unchecked: "Nu este bifat" };
  const OPS_BY_FAMILY = { text: ["eq", "ne", "contains", "empty", "filled"], number: ["eq", "ne", "lt", "le", "gt", "ge", "empty", "filled"], date: ["eq", "ne", "lt", "le", "gt", "ge", "empty", "filled"], choice: ["eq", "ne", "in", "empty", "filled"], multi: ["in", "empty", "filled"], bool: ["checked", "unchecked"] };
  const NO_VALUE_OPS = ["empty", "filled", "checked", "unchecked"];
  const ACTIONS_INPUT = [["show", "Afișează"], ["hide", "Ascunde"], ["require", "Setează ca obligatoriu"], ["optional", "Setează ca opțional"]];
  const ACTIONS_VISIBILITY = [["show", "Afișează"], ["hide", "Ascunde"]];
  /* Câmp ascuns (source „Din regulă”): rules only set its value */
  const ACTIONS_SET = [["set", "Setează valoarea"]];
  const kw = (text) => `<code class="e-permits-doc-kw">${esc(text)}</code>`;
  const bareSelect = (id, attrs, placeholder, options, value, { error = false, disabled = false, label = "" } = {}) => ui().renderFoSelectControl?.({ id, attrs, error, disabled, label, optionsHtml: `
    <option value=""${value ? "" : " selected"} disabled>${esc(placeholder)}</option>
    ${options.map(([v, text]) => `<option value="${esc(v)}"${String(v) === String(value) ? " selected" : ""}>${esc(text)}</option>`).join("")}` }) || "";
  /* fields a rule may read: every other field with a value family (grid columns: none yet) */
  /* a block field reads the fields of its own element; a grid column never takes part (US-42 AC-36) */
  const ruleSources = (target) => {
    const found = findChild(target.id);
    if (found) return found.container.type === "repeat" ? kidsOf(found.container).filter((child) => child.id !== target.id && FAMILY[child.type]) : [];
    return allFields().filter(({ field }) => field.id !== target.id && FAMILY[field.type]).map(({ field }) => field);
  };
  const sourceLabel = (field) => `${fieldName(field)} · ${field.type === "grid" ? "număr de rânduri" : field.type === "repeat" ? "număr de elemente" : comp(field.type).label}`;
  const optionChoices = (field) => (usesSource(field.type) ? selectOptions(field).map((value) => [value, value]) : (field.options || []).map((option) => [option.value, option.label]));
  const makeRule = (action = "show") => ({ id: uid("rule"), action, join: "and", conditions: [{ field: "", op: "", value: "" }], ...(action === "set" ? { setValue: "" } : {}) });

  function conditionHtml(rule, ri, c, ci, sources, errors) {
    const source = sources.find((field) => field.id === c.field);
    const family = source ? FAMILY[source.type] : "";
    const ops = family ? OPS_BY_FAMILY[family] : [];
    const needsValue = Boolean(c.op) && !NO_VALUE_OPS.includes(c.op);
    const k = `${ri}.${ci}`;
    /* „Valoare / Alt câmp” (US-42 AC-06, US-225): compare with a value or with another field of the
       same family — the left part of the value group, as in Servicii › Documente */
    const canField = Boolean(source) && c.op !== "in" && ["text", "number", "date", "choice"].includes(family);
    const others = canField ? sources.filter((field) => field.id !== source.id && FAMILY[field.type] === family) : [];
    let input = "";
    if (canField && c.mode === "field") {
      input = bareSelect(`fb-cv-${ri}-${ci}`, `data-fb-cond-other="${k}"`, others.length ? "Alege câmpul" : "Niciun câmp de același tip", others.map((field) => [field.id, fieldName(field)]), c.other, { disabled: !others.length, label: "Alt câmp" });
    } else if (source && (family === "choice" || family === "multi") && c.op === "in") {
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
      : `<div class="e-permits-doc-val${valueBad ? " is-error" : ""}${c.op === "in" ? " is-checks" : ""}">${canField ? `<div class="e-permits-doc-val__mode">${bareSelect(`fb-cm-${ri}-${ci}`, `data-fb-cond-mode="${k}"`, "Valoare", [["value", "Valoare"], ["field", "Alt câmp"]], c.mode === "field" ? "field" : "value", { label: "Compară cu" })}</div>` : ""}<div class="e-permits-doc-val__control">${input}</div></div>`;
    return `
      <li class="e-permits-doc-cond" data-fb-condition="${k}">
        <div class="e-permits-doc-cond__cell">${bareSelect(`fb-cf-${ri}-${ci}`, `data-fb-cond-field="${k}"`, "Câmp din formular", sources.map((field) => [field.id, sourceLabel(field)]), c.field, { error: errors.some((issue) => issue.prop === `rules.${k}.field`), label: "Câmp din formular" })}</div>
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
        ${rule.action === "set" ? grid(inputField({ prop: `rules.${ri}.setValue`, label: "Valoarea setată", value: rule.setValue || "", required: true, error: errors.find((issue) => issue.prop === `rules.${ri}.setValue`)?.message || "", placeholder: "Ex.: risc-sporit", attrs: `data-fb-rule-setvalue="${ri}"` })) : ""}
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
    const reads = (rule) => rule.conditions.some((c) => c.field === id || (c.mode === "field" && c.other === id));
    allFields().forEach(({ field }) => { if ((field.rules || []).some(reads)) list.push({ kind: "field", id: field.id, name: fieldName(field), what: comp(field.type).label }); });
    allChildren().forEach(({ child }) => { if ((child.rules || []).some(reads)) list.push({ kind: "child", id: child.id, name: fieldName(child), what: comp(child.type).label }); });
    allChildren().forEach(({ container, child }) => { if (child.dataSource?.cascade && child.dataSource.parentFieldId === id) list.push({ kind: "child", id: child.id, name: `${fieldName(container)} › ${fieldName(child)}`, what: "Listă dependentă" }); });
    allSections().forEach(({ section }) => { if ((section.rules || []).some(reads)) list.push({ kind: "section", id: section.id, name: tr(section.title) || "Secțiune", what: "Secțiune" }); });
    allFields().forEach(({ field }) => { if (field.type === "date" && (field.dateRules || []).some((rule) => rule.target === id)) list.push({ kind: "field", id: field.id, name: fieldName(field), what: "Regulă de dată" }); });
    return list;
  }

  function logicTabHtml(target, kind = "field") {
    const rules = target.rules || [];
    const sources = ruleSources(target);
    const content = kind === "section" || NO_VALUE.includes(target.type);
    if (kind === "field" && target.type === "hidden" && target.hiddenSource !== "rule") {
      return group("Reguli de comportament", `${ui().renderInfoNote?.("Un câmp ascuns nu se afișează, deci nu are reguli de afișare. Ca regulile să-i seteze valoarea, alegeți Date › Sursa valorii = „Din regulă”.") || ""}<div><button class="btn btn-secondary btn-sm" type="button" data-builder-prop-tab="data">Deschide Date</button></div>`);
    }
    const actions = content || kind === "child" ? ACTIONS_VISIBILITY : target.type === "hidden" ? ACTIONS_SET : ACTIONS_INPUT;
    const what = kind === "section" ? "această secțiune" : content ? "această notă" : "acest câmp";
    const errors = errorsOf(kind, target.id).filter((issue) => issue.tab === T_LOGIC);
    const readers = kind === "field" || kind === "child" ? usedIn(target.id) : [];
    return `
      ${group("Reguli de comportament", `
        <p class="e-permits-fo-field__hint">${target.type === "hidden" ? "Ultima regulă îndeplinită setează valoarea; fără una îndeplinită, câmpul rămâne gol." : rules.length
          ? "„Afișează”: apare doar când regula e îndeplinită. „Ascunde” câștigă în fața lui „Afișează”; „Setează ca obligatoriu” în fața lui „opțional”."
          : `Fără reguli, ${kind === "section" ? "secțiunea" : content ? "nota" : "câmpul"} se afișează mereu${content ? "" : " și urmează „Obligatoriu” din General"}.`}</p>
        ${errors.filter((issue) => issue.prop === "cycle").map((issue) => errorHtml(issue.message)).join("")}
        ${rules.length ? `<div class="e-permits-doc-rules">${rules.map((rule, ri) => ruleHtml(rule, ri, sources, actions, what, errors)).join("")}</div>` : ""}
        ${kind === "child" ? '<p class="e-permits-fo-field__hint">În bloc, regulile citesc câmpurile aceluiași card și afișează sau ascund câmpul în acel card.</p>' : ""}
        <div><button class="btn btn-secondary btn-sm" type="button" data-fb-rule-add${sources.length ? "" : ` aria-disabled="true" data-tooltip-reason="${kind === "child" ? "Blocul nu are alte câmpuri." : "Formularul nu are alte câmpuri."}"`}>${icon("icon-plus-large", 16)}<span>Adaugă regulă</span></button></div>
      `)}
      ${(kind === "field" || kind === "child") && !content ? group("Folosit în", readers.length ? `
        <ul class="e-permits-builder__step-list">${readers.map((item) => `<li><button class="e-permits-builder__step-row" type="button" data-fb-goto="${item.kind}:${item.id}"><span>${esc(item.name)}</span><span class="e-permits-builder__step-row-meta">${esc(item.what)}</span></button></li>`).join("")}</ul>` : window.GEAPEmptyState.render({ title: "Nu e folosit în reguli", text: "Nicio regulă din formular nu citește acest câmp.", icon: "link", compact: true })) : ""}`;
  }

  /* cycles: field A shown by B and B by A → refused (US-42 AC-31) */
  function logicCycles() {
    const graph = new Map();
    [...allFields().map(({ field }) => field), ...allChildren().map(({ child }) => child)].forEach((field) => graph.set(field.id, new Set((field.rules || []).flatMap((rule) => rule.conditions.flatMap((c) => [c.field, c.mode === "field" ? c.other : ""])).filter(Boolean))));
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
      { label: "Salvează ca componentă", icon: "bookmark", attrs: `data-fb-act="save-preset" data-id="${field.id}"` },
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

  /* ---- a column / block field selected → the same panel as a field (US-34 AC-03), without Logică
     for grid columns (US-42 AC-36) and with a link back to its grid / block */
  const childTabs = (found) => {
    const tabs = comp(found.child.type).tabs || INPUT_TABS;
    return found.container.type === "grid" ? tabs.filter((tab) => tab !== T_LOGIC) : tabs;
  };
  function childPanelHtml(found) {
    if (!found) return formPanelHtml();
    const { step, section, chain, container, child, index, list } = found;
    const inGrid = container.type === "grid";
    const tabs = childTabs(found);
    if (!tabs.includes(state.tab)) state.tab = T_GEN;
    const name = fieldName(child);
    const items = [
      { label: "Duplică", icon: "copy", attrs: `data-fb-child-act="duplicate" data-id="${child.id}"` },
      ...(index > 0 ? [{ label: inGrid ? "Mută la stânga" : "Mută mai sus", icon: inGrid ? "arrow-left" : "arrow-up", attrs: `data-fb-child-act="up" data-id="${child.id}"` }] : []),
      ...(index < list.length - 1 ? [{ label: inGrid ? "Mută la dreapta" : "Mută mai jos", icon: inGrid ? "arrow-right" : "arrow-down", attrs: `data-fb-child-act="down" data-id="${child.id}"` }] : []),
      { label: inGrid ? "Șterge coloana" : "Șterge câmpul", icon: "delete", danger: true, attrs: `data-fb-child-act="delete" data-id="${child.id}"` },
    ];
    let body = "";
    if (state.tab === T_GEN) body = generalTabHtml(child);
    else if (state.tab === T_DATA) body = dataTabHtml(child);
    else if (state.tab === T_VAL) body = validationTabHtml(child);
    else if (state.tab === T_LOGIC) body = logicTabHtml(child, "child");
    else body = childAdvancedHtml(found);
    return `
      ${panelHead({ crumbs: [tr(step.title), tr(section.title) || "Secțiune", ...chain.map((item) => fieldName(item))], title: name, chip: child.type === "info" ? "" : ui().renderTag?.(child.key || "fără cheie", "neutral") || "", menu: ui().renderStackMenu?.(items, name) || "", back: { kind: findChild(container.id) ? "child" : "field", id: container.id, label: `${inGrid ? (findChild(container.id) ? "Sub-grila" : "Grila") : "Blocul"} „${fieldName(container)}”` } })}
      ${tabsHtml(tabs, "child", child.id)}
      <div class="e-permits-builder__panel-scroll" id="fb-tabpanel" role="tabpanel" aria-labelledby="fb-tab-${state.tab}" data-fb-panel-scroll>
        ${body}
      </div>`;
  }

  /* Date of a grid / block: its columns or fields, in order, + „Adaugă coloană ▾” (US-34) */
  function childrenEditorHtml(container) {
    const inGrid = container.type === "grid";
    const list = kidsOf(container);
    const level = levelOf(container);
    const err = propError("field", container.id, "children");
    return `
      ${group(inGrid ? "Coloane" : "Câmpurile blocului", `
        <p class="e-permits-fo-field__hint">${inGrid ? `Ordinea de aici = ordinea coloanelor în tabel. Trage tipuri din bibliotecă pe banda „Coloane” a grilei sau adaugă-le de aici.${level > 1 ? ` Grilă de nivelul ${level} din ${MAX_GRID_LEVEL}.` : ""}` : "Câmpurile fiecărui card, în ordine. Trage tipuri din bibliotecă pe banda „Câmpuri” sau adaugă-le de aici."}</p>
        ${err ? errorHtml(err) : ""}
        ${list.length ? `<ol class="e-permits-builder__step-list" aria-label="${inGrid ? "Coloanele grilei" : "Câmpurile blocului"}">${list.map((child, i) => `
          <li><button class="e-permits-builder__step-row" type="button" data-fb-child-row="${child.id}" aria-describedby="fb-sub-kbd-hint">
            <span class="e-permits-builder__step-badge">${i + 1}</span>
            <span>${esc(fieldName(child))}${child.required ? requiredMark() : ""}</span>
            <span class="e-permits-builder__step-row-meta">${childHasIssue(child) ? `<em class="e-permits-builder__tag e-permits-builder__tag--warning">${icon("icon-warning-filled", 16)}Eroare</em>` : ""}${esc(child.type === "grid" ? `Grilă · ${kidsOf(child).length} col.` : comp(child.type).label)}</span>
          </button></li>`).join("")}</ol>` : ui().renderInfoNote?.(inGrid ? "Grila începe fără coloane (US-34)." : "Blocul începe fără câmpuri.") || ""}
        <div class="e-permits-stack__menu-wrap e-permits-builder__inline-actions">
          <button class="btn btn-secondary btn-sm" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="fb-addchild-${container.id}-panel" data-stack-menu-trigger><span>${inGrid ? "Adaugă coloană" : "Adaugă câmp"}</span>${icon("icon-chevron-bottom", 16)}</button>
          ${addChildMenuHtml(container, "panel")}
        </div>
        ${inGrid ? '<p class="e-permits-fo-field__hint">Coloanele complexe (listă, selecție multiplă, grilă imbricată) vin după cel puțin o coloană simplă (US-34 AC-06).</p>' : ""}
      `)}
      ${inGrid ? group("Mod de editare", sourceFacts([["Pe ecran mare", "Inline: clic pe celulă, Enter salvează, Esc anulează"], ["Pe telefon", "Un card pe rând, câmpuri pe toată lățimea"], ["Dialog, Formular inline", "În afara proiectului (Feature 88573)"]])) : ""}`;
  }

  /* Validare of a grid / block: rows (US-36), rules between rows, messages (RO · RU · EN) */
  function rowRulesHtml(container) {
    const inGrid = container.type === "grid";
    const r = container.rowRules || {};
    const m = container.messages || {};
    const err = (prop) => propError("field", container.id, prop);
    const list = kidsOf(container);
    const noun = inGrid ? "rânduri" : "elemente";
    const keyOptions = list.filter((child) => !["grid", "info", "checkbox", "checklist"].includes(child.type)).map((child) => [child.id, fieldName(child)]);
    const groupOptions = list.filter((child) => child.type === "select" && child.dataSource?.mode === "existing").map((child) => [child.id, fieldName(child)]);
    return `
      ${group(inGrid ? "Rânduri" : "Elemente", `
        ${grid(`
          ${inputField({ prop: "rowRules.minRows", label: "Minimum", value: r.minRows ?? "", numeric: true, span: 6, error: err("rowRules.minRows"), hint: container.required ? "Obligatoriu = cel puțin 1." : "Gol = fără minim." })}
          ${inputField({ prop: "rowRules.maxRows", label: "Maximum", value: r.maxRows ?? "", numeric: true, span: 6, error: err("rowRules.maxRows"), hint: "Gol = fără limită." })}
          ${inputField({ prop: "rowRules.defaultRows", label: "La început", value: r.defaultRows ?? "", numeric: true, span: 6, error: err("rowRules.defaultRows"), hint: inGrid ? "Rânduri goale la deschidere." : "Carduri la deschidere." })}
          ${inGrid ? selectField({ prop: "rowRules.pageSize", label: "Rânduri pe pagină", value: r.pageSize ?? 10, options: [[0, "Toate"], [5, "5"], [10, "10"], [20, "20"]], span: 6, hint: "Peste el apare paginarea (US-35 AC-06)." }) : ""}
        `)}
        <div class="e-permits-check-options e-permits-check-options--stack">
          ${inGrid ? checkOption({ prop: "rowRules.allowAdd", label: "Solicitantul adaugă rânduri", checked: r.allowAdd !== false }) : ""}
          ${checkOption({ prop: "rowRules.allowRemove", label: inGrid ? "Solicitantul șterge rânduri" : "Solicitantul șterge elemente", checked: r.allowRemove !== false })}
        </div>`)}
      ${group(`Reguli între ${noun}`, grid(`
        ${selectField({ prop: "rowRules.keyColumn", label: inGrid ? "Coloana-cheie (fără duplicate)" : "Câmpul-cheie (fără duplicate)", value: r.keyColumn || "", options: [["", "Fără"], ...keyOptions], error: err("rowRules.keyColumn"), hint: `Aceeași valoare de două ori = mesaj; ${inGrid ? "rândul nu se salvează" : "valoarea nu se acceptă"} (US-36 AC-03).` })}
        ${selectField({ prop: "rowRules.groupColumn", label: inGrid ? "Coloana de grupare" : "Câmpul de grupare", value: r.groupColumn || "", options: [["", "Fără"], ...groupOptions], error: err("rowRules.groupColumn"), hint: "Prima valoare fixează grupa; valorile din alte grupe se dezactivează, cu un mesaj permanent (US-36 AC-04)." })}
      `))}
      ${group("Mesaje", `
        ${langSwitch([m.min, m.max, m.duplicate, m.group])}
        ${grid(`
          ${inputField({ prop: "messages.min", label: langLabel("Sub minim"), value: tr(m.min, state.lang), i18nProp: true, placeholder: inGrid ? "Trebuie cel puțin {min} rânduri." : "Adaugă cel puțin {min}." })}
          ${inputField({ prop: "messages.max", label: langLabel("La maxim"), value: tr(m.max, state.lang), i18nProp: true, placeholder: inGrid ? "Maximum {max} rânduri." : "Maximum {max} elemente." })}
          ${inputField({ prop: "messages.duplicate", label: langLabel("Valoare repetată"), value: tr(m.duplicate, state.lang), i18nProp: true, placeholder: "Dvstră ați înregistrat deja această valoare." })}
          ${inputField({ prop: "messages.group", label: langLabel("Îndrumare la grupare"), value: tr(m.group, state.lang), i18nProp: true, placeholder: `Toate ${inGrid ? "rândurile" : "elementele"} au aceeași grupă la „{coloana}”: {grup}.`, hint: "{min}, {max}, {coloana} și {grup} se înlocuiesc. Gol = textul standard." })}
        `)}`)}
      ${group("Verificare la depunere", ui().renderInfoNote?.("Serverul repetă aceleași verificări pe rânduri (minim, duplicate, grupă, câmpuri), chiar dacă verificarea din browser e ocolită (US-36 AC-05).") || "")}`;
  }

  const SQL_TYPES = { text: (f) => `NVARCHAR(${f.maxLength || 100})`, textarea: (f) => (Number(f.maxLength) > 2000 ? "NVARCHAR(MAX)" : `NVARCHAR(${f.maxLength || 250})`), number: (f) => (f.numberKind === "decimal" ? `DECIMAL(18,${f.decimals || 1})` : "INT"), money: () => "DECIMAL(18,2)", email: () => "NVARCHAR(254)", phone: () => "NVARCHAR(20)", date: () => "DATE", period: () => "DATE × 2 (De la, Până la)", select: () => "INT (Id clasificator)", multiselect: () => "listă de Id-uri (tabel 1:N)", radio: () => "NVARCHAR(50)", segment: () => "NVARCHAR(50)", checkbox: () => "BIT", checklist: () => "NVARCHAR(MAX) (listă)", address: () => "INT (AddressId)", idnp: () => "CHAR(13)", idno: () => "CHAR(13) + denumire NVARCHAR(250)", contact: () => "INT (ContactId)", subdivision: () => "INT (Id subdiviziune)", file: () => "INT (FileId, tabel 1:N)", mdocs: () => "NVARCHAR(64) (Id document MDocs)", hidden: () => "NVARCHAR(100)", consent: () => "BIT", grid: () => "tabel copil (1:N)", repeat: () => "tabel copil (1:N)" };
  const sqlTypeOf = (field) => (SQL_TYPES[field.type] ? SQL_TYPES[field.type](field) : "—");
  /* the child table of a grid / block (US-33 AC-03/04): GEAP_Cases_{serviciu}_{Grilă}[_{Sub-grilă}] */
  const tableOf = (chain) => `GEAP_Cases_${form.service?.rsspCode || "C00000"}_${chain.map((item) => item.key || "Grila").join("_")}`;

  /* Avansat of a column / block field: where its value is stored */
  function childAdvancedHtml(found) {
    const { child, chain, container } = found;
    const copy = (value, what) => R.copyValueHtml?.(value, { ariaLabel: `Copiază ${what} ${value}` }) || esc(value);
    return `
      ${group("Identificare", `
        <dl class="e-permits-builder__facts">
          <div><dt>Cheie</dt><dd>${child.key ? copy(child.key, "cheia") : "—"}</dd></div>
          <div><dt>Identificator intern</dt><dd>${copy(child.id, "identificatorul")}</dd></div>
          <div><dt>Tabel</dt><dd>${esc(tableOf(chain))}</dd></div>
          <div><dt>Coloana</dt><dd>${esc(child.type === "grid" ? `tabel ${tableOf([...chain, child])}` : child.key || "—")}</dd></div>
          <div><dt>Tip SQL</dt><dd>${esc(sqlTypeOf(child))}</dd></div>
        </dl>
        <p class="e-permits-fo-field__hint">Câte un rând în tabel pentru fiecare ${container.type === "grid" ? "rând al grilei" : "element al blocului"}, legat de ${chain.length > 1 ? "rândul-părinte (ParentRowId)" : "dosar (CaseId)"}, cu ordinea în SortOrder.</p>`)}
      ${child.type === "info" ? "" : group("Date personale", `<div class="e-permits-check-options">${checkOption({ prop: "personalData", label: "Conține date cu caracter personal", checked: child.personalData })}</div>`)}`;
  }

  function generalTabHtml(field) {
    const t = field.type;
    const err = (prop) => propError("field", field.id, prop);
    if (t === "separator") {
      return group("Separator", ui().renderInfoNote?.("O linie pe toată lățimea, între grupuri de câmpuri. Nu are proprietăți și nu păstrează valori.") || "");
    }
    const content = NO_VALUE.includes(t);
    const hasPlaceholder = ["text", "textarea", "number", "money", "email", "phone", "select", "multiselect"].includes(t) || (t === "subdivision" && field.subdivisionMode === "select");
    const childInfo = findChild(field.id);
    const column = childInfo?.container.type === "grid";
    const containerKind = isContainer(field);
    const translatables = containerKind ? [field.label, field.help, field.addLabel, t === "grid" ? field.emptyText : field.note, t === "grid" ? field.rowTitle : field.itemTitle] : t === "info" ? [field.text] : t === "callout" ? [field.title, field.text] : t === "period" ? [field.label, field.help, field.fromLabel, field.toLabel]
      : t === "consent" ? [field.text, field.linkText] : t === "hidden" ? [] : t === "idno" ? [field.label, field.help, field.companyLabel] : [field.label, field.help, field.placeholder];
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
    } else if (t === "consent") {
      labelBlock = `
        ${textareaField({ prop: "text", label: langLabel("Textul declarației"), value: tr(field.text, state.lang), required: state.lang === "ro", i18nProp: true, rows: 4, error: state.lang === "ro" ? err("text") : "" })}
        ${langNote()}
        ${inputField({ prop: "linkText", label: langLabel("Textul linkului"), value: tr(field.linkText, state.lang), i18nProp: true, error: state.lang === "ro" ? err("linkText") : "", hint: "Exact cum apare în declarație; devine link spre textul legal." })}
        ${inputField({ prop: "linkUrl", label: "Adresa textului legal", value: field.linkUrl || "", placeholder: "https://www.legis.md/…", error: err("linkUrl"), hint: "Se deschide într-o filă nouă." })}
        ${inputField({ prop: "label", label: "Denumire internă", value: tr(field.label), required: true, maxlength: 150, error: err("label"), hint: "Solicitantul nu o vede; apare în reguli, rapoarte și în lista de erori." })}`;
    } else if (containerKind) {
      labelBlock = `
        ${inputField({ prop: "label", label: langLabel("Etichetă"), value: tr(field.label, state.lang), required: state.lang === "ro", i18nProp: true, maxlength: 150, error: state.lang === "ro" ? err("label") : "" })}
        ${langNote()}
        ${textareaField({ prop: "help", label: langLabel("Text ajutător"), value: tr(field.help, state.lang), i18nProp: true, hint: "Apare sub etichetă. Spune ce se adaugă și câte." })}
        ${t === "repeat" ? `<div class="e-permits-user-create__field"><div class="e-permits-check-options">${checkOption({ prop: "labelHidden", label: "Ascunde eticheta (titlul secțiunii o spune)", checked: field.labelHidden })}</div></div>` : ""}`;
    } else if (t === "hidden") {
      labelBlock = `
        ${inputField({ prop: "label", label: "Denumire internă", value: tr(field.label), required: true, maxlength: 150, error: err("label"), hint: "Solicitantul nu vede acest câmp; denumirea apare în constructor, reguli și Back Office." })}`;
    } else {
      labelBlock = `
        ${inputField({ prop: "label", label: langLabel(t === "checkbox" ? "Textul bifei" : t === "contact" ? "Titlul grupului" : "Etichetă"), value: tr(field.label, state.lang), required: state.lang === "ro", i18nProp: true, maxlength: 150, error: state.lang === "ro" ? err("label") : "" })}
        ${langNote()}
        ${textareaField({ prop: "help", label: langLabel("Text ajutător"), value: tr(field.help, state.lang), i18nProp: true, hint: "Apare sub câmp. Explică ce se cere, nu repetă eticheta." })}
        ${hasPlaceholder ? inputField({ prop: "placeholder", label: langLabel("Exemplu de completare"), value: tr(field.placeholder, state.lang), i18nProp: true, hint: "Text-exemplu în câmpul gol; nu înlocuiește eticheta." }) : ""}
        ${t === "period" ? `${inputField({ prop: "fromLabel", label: langLabel("Eticheta primei date"), value: tr(field.fromLabel, state.lang), i18nProp: true, span: 6 })}${inputField({ prop: "toLabel", label: langLabel("Eticheta celei de-a doua"), value: tr(field.toLabel, state.lang), i18nProp: true, span: 6 })}` : ""}
        ${t === "idno" ? inputField({ prop: "companyLabel", label: langLabel("Eticheta denumirii"), value: tr(field.companyLabel, state.lang), i18nProp: true, maxlength: 80, hint: "Câmpul completat din registru, lângă IDNO." }) : ""}`;
    }
    const keyLabel = column ? "Cheie (coloana din tabelul grilei)" : childInfo ? "Cheie (coloana din tabelul blocului)" : containerKind ? "Cheie (numele tabelului 1:N)" : "Cheie (coloana din baza de date)";
    const keyHint = keyLocked ? "Blocată după prima publicare: coloana există deja." : childInfo ? `Generată din eticheta RO; unică în ${column ? "grilă" : "bloc"}, litere latine și cifre (US-33 AC-04).` : containerKind ? `Tabelul ${tableOf([field])}; litere latine și cifre, maximum 60 (US-33 AC-04).` : "Generată din eticheta RO; litere latine și cifre, unică în formular.";
    const keyBlock = content ? "" : group("Cheie câmp", grid(`
        ${inputField({ prop: "key", label: keyLabel, value: field.key, required: true, readonly: keyLocked, maxlength: 60, error: keyLocked ? "" : err("key"), hint: keyHint })}
      `));
    const textsBlock = containerKind ? group(t === "grid" ? "Texte în grilă" : "Texte în bloc", grid(`
        ${t === "repeat"
          ? inputField({ prop: "itemTitle", label: langLabel("Titlul elementului"), value: tr(field.itemTitle, state.lang), required: state.lang === "ro", i18nProp: true, maxlength: 60, error: state.lang === "ro" ? err("itemTitle") : "", hint: "Pe fiecare card, după număr: „#1 Activitate”." })
          : inputField({ prop: "rowTitle", label: langLabel("Numele rândului"), value: tr(field.rowTitle, state.lang), i18nProp: true, maxlength: 40, hint: "Pe telefon, fiecare rând e un card „#1 Rând”." })}
        ${inputField({ prop: "addLabel", label: langLabel("Butonul de adăugare"), value: tr(field.addLabel, state.lang), required: state.lang === "ro", i18nProp: true, maxlength: 60, error: state.lang === "ro" ? err("addLabel") : "", hint: t === "grid" ? "Ex.: „Adaugă rând”, „Adaugă echipament”." : "Ex.: „Adaugă altă activitate”." })}
        ${t === "grid"
          ? textareaField({ prop: "emptyText", label: langLabel("Text fără rânduri"), value: tr(field.emptyText, state.lang), i18nProp: true, hint: "În grilă, cât nu e niciun rând (US-35 AC-05)." })
          : textareaField({ prop: "note", label: langLabel("Notă permanentă"), value: tr(field.note, state.lang), i18nProp: true, hint: "Nota gri deasupra cardurilor (ex.: sursa codurilor CAEM, US-40 AC-05). Gol = fără notă." })}
      `)) : "";
    const requiredBox = t === "consent"
      ? checkOption({ prop: "required", label: "Obligatoriu", checked: true, required: true, disabled: true, reason: "Un consimțământ este întotdeauna obligatoriu." })
      : checkOption({ prop: "required", label: "Obligatoriu", checked: field.required, required: true });
    const behaviour = content || t === "hidden" ? "" : containerKind ? group("Comportament", `
        <div class="e-permits-check-options">${requiredBox}</div>
        <p class="e-permits-fo-field__hint">Obligatoriu = cel puțin ${t === "grid" ? "un rând salvat" : "un element"}. Minimul și maximul sunt în Validare.</p>`) : t === "contact" ? group("Comportament", `
        <div class="e-permits-fo-field"><label id="fb-contact-default">Opțiunea aleasă la început</label>${segmented({ prop: "contactDefault", value: field.contactDefault || "self", options: [["self", "Eu"], ["other", "Altă persoană"]], labelledBy: "fb-contact-default" })}
        <p class="e-permits-fo-field__hint">„Eu” = telefonul și emailul solicitantului din MPass / MNotify, doar citire.</p></div>`) : group("Comportament", `
        <div class="e-permits-check-options">
          ${requiredBox}
        </div>
        ${["text", "textarea", "number", "money", "email", "date", "period"].includes(t) ? toggleField({ prop: "readOnly", label: "Doar citire", description: "Valoarea se vede, dar nu se poate modifica.", checked: field.readOnly }) : ""}
        ${["text", "textarea", "number", "money", "email"].includes(t) ? grid(inputField({ prop: "defaultValue", label: "Valoare implicită", value: field.defaultValue || "", numeric: t === "number" || t === "money", hint: "Trebuie să treacă validarea câmpului." })) : ""}
        ${t === "date" ? grid(selectField({ prop: "dateDefault", label: "Valoare implicită", value: field.dateDefault || "none", options: [["none", "Fără"], ["today", "Data curentă (azi)"]] })) : ""}
        ${t === "checkbox" ? `<div class="e-permits-check-options">${checkOption({ prop: "defaultChecked", label: "Bifată implicit", checked: field.defaultChecked })}</div>` : ""}
        ${t === "segment" || t === "radio" ? grid(selectField({ prop: "defaultValue", label: "Valoare implicită", value: field.defaultValue || "", placeholder: "Nicio opțiune aleasă", options: (field.options || []).map((option) => [option.value, option.label]) })) : ""}
      `);
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
    const aspect = t === "hidden" ? "" : column ? group("Aspect", `
        <div class="e-permits-fo-field">
          <span class="e-permits-builder__width-label" aria-hidden="true">Lățime coloană</span>
          ${columnPicker(field)}
          <p class="e-permits-fo-field__hint">Coloanele își împart rândul tabelului după părți. Pe telefon rândul devine card, cu câmpurile pe toată lățimea.</p>
        </div>
        ${format}
        ${counter}`) : group("Aspect", `
        <div class="e-permits-fo-field">
          <span class="e-permits-builder__width-label" aria-hidden="true">Lățime</span>
          ${isFixedWidth(field)
            ? spanPicker(field, { fixed: true, reason: t === "idnp" ? "Cu verificarea în RSP, IDNP-ul, numele și prenumele ocupă tot rândul." : "Componenta ocupă mereu tot rândul." })
            : spanPicker(field, { reason: "Pe telefon, toată lățimea." })}
        </div>
        ${format}
        ${counter}
      `);
    return `
      ${presetLinkHtml(field)}
      ${translatables.length ? langSwitch(translatables) : ""}
      ${group(content ? "Conținut" : t === "consent" ? "Declarație" : t === "hidden" ? "Denumire" : "Etichetă și ajutor", grid(labelBlock))}
      ${textsBlock}
      ${keyBlock}
      ${behaviour}
      ${aspect}`;
  }

  function validationTabHtml(field) {
    if (isContainer(field)) return rowRulesHtml(field);
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
        ${findChild(field.id) ? "" : dateRulesHtml(field)}
        ${group("Format", ui().renderInfoNote?.("Format fix ZZ/LL/AAAA; data tastată se acceptă.") || "")}
        ${group("Mesaj", `${message("Data nu respectă regula.")}${order}`)}`;
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
    if (t === "idnp" || t === "idno") {
      const code = t.toUpperCase();
      return `
        ${group("Format", `
          ${sourceFacts([["Format", "13 cifre"], ["Tastare", "doar cifre, contor n/13"], ...(t === "idno" && field.idnoSource !== "applicant" ? [["Registru", "IDNO inexistent = eroare"]] : []), ...(t === "idnp" && field.idnpSource === "rsp" ? [["Registru", "IDNP inexistent în RSP = eroare"]] : [])])}
          ${field[`${t}Source`] === "applicant" ? ui().renderInfoNote?.(`Valoarea vine din MPass: nu se validează, nu se poate modifica.`) || "" : ""}`)}
        ${group("Mesaj", `${message(`${code}-ul trebuie să aibă 13 cifre.`)}${order}`)}`;
    }
    if (t === "file") {
      const types = field.fileTypes || [];
      return `
        ${group("Fișiere acceptate", `
          <div class="e-permits-check-options">
            ${FILE_TYPES.map(([value, label]) => ui().renderCheckOption?.({ label, checked: types.includes(value), attrs: `data-fb-file-type="${value}"` }) || "").join("")}
          </div>
          ${propError("field", field.id, "fileTypes") ? errorHtml(propError("field", field.id, "fileTypes")) : ""}
          ${grid(`
            ${inputField({ prop: "maxSizeMb", label: "Mărime maximă (MB)", value: field.maxSizeMb ?? "", numeric: true, span: 6, required: true, error: propError("field", field.id, "maxSizeMb"), hint: "Cel mult 60 MB." })}
            ${selectField({ prop: "maxFiles", label: "Număr de fișiere", value: field.maxFiles || 1, options: [1, 2, 3, 5, 10].map((n) => [n, n === 1 ? "Un singur fișier" : `Până la ${n}`]), span: 6 })}
          `)}`)}
        ${group("Mesaje", `${ui().renderInfoNote?.("Mesajele sunt ale platformei: „Formatul fișierului nu este acceptat”, „Fișierul depășește {max} MB”, „Atașează documentul”.") || ""}${order}`)}`;
    }
    return group("Regulă", `${ui().renderInfoNote?.("Pentru această componentă se verifică doar „Obligatoriu”. Sursa și valorile se configurează în tabul Date.") || ""}${order}`);
  }

  /* ---- Reguli de dată (US-41): this date ≷ today or another Dată field ± N zile / luni / ani.
     A rule lives on one field; the other field shows it as its reciprocal (read-only), so a pair is
     never stored twice (two stored directions = a cycle, refused). Same rule-card markup as Logică. */
  const DATE_OPS = [["lt", "înainte de"], ["le", "cel târziu la"], ["gt", "după"], ["ge", "cel mai devreme la"]];
  const DATE_OPS_RECIPROCAL = { lt: "gt", le: "ge", gt: "lt", ge: "le" };
  const DATE_UNITS = [["days", "zile"], ["months", "luni"], ["years", "ani"]];
  const dateOpText = (op) => (DATE_OPS.find(([value]) => value === op) || [])[1] || "";
  const dateTargetName = (target) => (target === "today" ? "data curentă (azi)" : `„${fieldName(findField(target)?.field || {}) || "câmp șters"}”`);
  const offsetText = (rule) => { const n = Number(rule.offset) || 0; if (!n) return ""; const unit = (DATE_UNITS.find(([value]) => value === rule.unit) || DATE_UNITS[0])[1]; return ` ${n > 0 ? "+" : "−"} ${Math.abs(n)} ${unit}`; };
  function dateRulesHtml(field) {
    const rules = field.dateRules || [];
    const others = allFields().filter(({ field: other }) => other.type === "date" && other.id !== field.id).map(({ field: other }) => other);
    const errors = errorsOf("field", field.id).filter((issue) => issue.tab === T_VAL);
    const bad = (prop) => errors.some((issue) => issue.prop === prop);
    const reciprocal = allFields().flatMap(({ field: other }) => (other.type === "date" && other.id !== field.id ? (other.dateRules || []).filter((rule) => rule.target === field.id).map((rule) => ({ other, rule })) : []));
    return group("Reguli de dată", `
      <p class="e-permits-fo-field__hint">${rules.length || reciprocal.length ? "Data introdusă trebuie să respecte fiecare regulă; mesajul de mai jos se arată sub câmp." : "Compară data cu ziua curentă sau cu altă dată din formular (ex.: „Data contractului” cel târziu azi)."}</p>
      ${errors.filter((issue) => issue.prop === "dateRules").map((issue) => errorHtml(issue.message)).join("")}
      ${rules.length ? `<div class="e-permits-doc-rules">${rules.map((rule, ri) => `
        <div class="e-permits-doc-rule" data-fb-date-rule="${ri}">
          <div class="e-permits-doc-rule__head">
            <span class="e-permits-doc-rule__target">${kw("Această dată")}</span>
            <button class="btn btn-text-destructive btn-sm" type="button" aria-label="Elimină regula de dată ${ri + 1}" data-fb-date-rule-remove="${ri}">Elimină</button>
          </div>
          <ol class="e-permits-doc-rule__conds" role="list">
            <li class="e-permits-doc-cond">
              <div class="e-permits-doc-cond__cell e-permits-doc-cond__cell--op">${bareSelect(`fb-dr-op-${ri}`, `data-fb-date-rule-op="${ri}"`, "Comparația", DATE_OPS, rule.op, { error: bad(`dateRules.${ri}.op`), label: "Comparația" })}</div>
              <div class="e-permits-doc-cond__cell">${bareSelect(`fb-dr-target-${ri}`, `data-fb-date-rule-target="${ri}"`, "Cu data", [["today", "Data curentă (azi)"], ...others.map((other) => [other.id, fieldName(other)])], rule.target, { error: bad(`dateRules.${ri}.target`), label: "Cu data" })}</div>
              <div class="e-permits-doc-cond__cell">
                <div class="e-permits-doc-val${bad(`dateRules.${ri}.offset`) ? " is-error" : ""}">
                  <div class="e-permits-doc-val__control"><input id="fb-dr-offset-${ri}" class="e-permits-doc-val__input" type="text" inputmode="numeric" value="${esc(rule.offset ?? "")}" placeholder="± 0" aria-label="Decalaj (număr, poate fi negativ)" autocomplete="off" data-fb-date-rule-offset="${ri}"></div>
                  <div class="e-permits-doc-val__mode e-permits-doc-val__mode--end">${bareSelect(`fb-dr-unit-${ri}`, `data-fb-date-rule-unit="${ri}"`, "zile", DATE_UNITS, rule.unit || "days", { label: "Unitatea decalajului" })}</div>
                </div>
              </div>
              <span class="e-permits-doc-cond__remove" aria-hidden="true"></span>
            </li>
          </ol>
          ${rule.op && rule.target ? `<p class="e-permits-fo-field__hint">Se citește: data este ${esc(dateOpText(rule.op))} ${esc(dateTargetName(rule.target))}${esc(offsetText(rule))}.</p>` : ""}
        </div>`).join("")}</div>` : ""}
      ${reciprocal.length ? `<ul class="e-permits-builder__step-list">${reciprocal.map(({ other, rule }) => `
        <li><button class="e-permits-builder__step-row" type="button" data-fb-goto="field:${other.id}:${T_VAL}"><span>${esc(dateOpText(DATE_OPS_RECIPROCAL[rule.op]).replace(/^./, (c) => c.toUpperCase()))} „${esc(fieldName(other))}”${esc(offsetText({ ...rule, offset: -(Number(rule.offset) || 0) }))}</span><span class="e-permits-builder__step-row-meta">Reciprocă</span></button></li>`).join("")}</ul>` : ""}
      <div><button class="btn btn-secondary btn-sm" type="button" data-fb-date-rule-add>${icon("icon-plus-large", 16)}<span>Adaugă regulă de dată</span></button></div>`);
  }
  /* two stored directions between the same dates (or a longer loop) */
  function dateRuleCycles() {
    const graph = new Map();
    allFields().forEach(({ field }) => { if (field.type === "date") graph.set(field.id, new Set((field.dateRules || []).map((rule) => rule.target).filter((target) => target && target !== "today"))); });
    const inCycle = new Set();
    const visit = (id, path) => {
      if (path.includes(id)) { path.slice(path.indexOf(id)).forEach((item) => inCycle.add(item)); return; }
      (graph.get(id) || []).forEach((next) => visit(next, [...path, id]));
    };
    graph.forEach((_, id) => visit(id, []));
    return inCycle;
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
    if (isContainer(field)) return childrenEditorHtml(field);
    if (field.type === "radio" || field.type === "checklist" || field.type === "segment") {
      return group("Opțiuni", `${optionsEditor(field.options || [], { presetYesNo: field.type !== "checklist", error: propError("field", field.id, "options") })}${field.type === "segment" ? '<p class="e-permits-fo-field__hint">2–5 opțiuni scurte (un cuvânt sau două).</p>' : ""}`);
    }
    if (field.type === "address") return addressDataHtml(field);
    if (usesSource(field.type)) return selectDataHtml(field);
    if (field.type === "idnp") return idnpDataHtml(field);
    if (field.type === "idno") return idnoDataHtml(field);
    if (field.type === "contact") return contactDataHtml(field);
    if (field.type === "subdivision") return subdivisionDataHtml(field);
    if (field.type === "mdocs") return mdocsDataHtml(field);
    if (field.type === "hidden") return hiddenDataHtml(field);
    return group("Date", ui().renderInfoNote?.("Componenta nu are o sursă de date.") || "");
  }

  /* ---- batch 3 › Date: where the value comes from (once-only: registry values are read-only) */
  const sourceFacts = (rows) => `<dl class="e-permits-builder__facts">${rows.map(([dt, dd]) => `<div><dt>${esc(dt)}</dt><dd>${dd}</dd></div>`).join("")}</dl>`;
  function idnpDataHtml(field) {
    const mode = field.idnpSource || "typed";
    const explain = {
      applicant: ui().renderInfoNote?.("IDNP-ul persoanei autentificate vine din MPass și se afișează doar pentru citire — solicitantul nu îl mai introduce (principiul „o singură dată”).") || "",
      typed: ui().renderInfoNote?.("Se verifică doar formatul (13 cifre). Numele nu se caută după un IDNP introdus: altfel oricine ar putea afla cui îi aparține un IDNP.") || "",
      rsp: `${ui().renderNotice?.("warning", "Interogarea RSP cere un temei legal: solicitantul bifează declarația, abia apoi introduce IDNP-ul. Nu se oferă cererilor fără MPass.") || ""}
        ${grid(textareaField({ prop: "consentText", label: langLabel("Textul declarației"), value: tr(field.consentText, state.lang), i18nProp: true, rows: 3 }))}
        ${sourceFacts([["Registru", "RSP prin MConnect"], ["Completează", "Nume, Prenume — doar citire"], ["Jurnal", "Fiecare interogare (MLog)"]])}`,
    }[mode];
    return group("Sursa valorii", `
      ${grid(selectField({ prop: "idnpSource", label: "De unde vine IDNP-ul", value: mode, options: [["applicant", "Solicitantul — din MPass"], ["typed", "Introdus de solicitant"], ["rsp", "Introdus și verificat în RSP"]] }))}
      ${explain}`);
  }
  function idnoDataHtml(field) {
    const mode = field.idnoSource === "applicant" ? "applicant" : "rsud";
    return group("Sursa valorii", `
      ${grid(selectField({ prop: "idnoSource", label: "De unde vine IDNO-ul", value: mode, options: [["applicant", "Compania solicitantului — din MPass"], ["rsud", "Introdus și căutat în Registrul de Stat"]] }))}
      ${mode === "applicant"
        ? ui().renderInfoNote?.("IDNO-ul și denumirea companiei pe care o reprezintă solicitantul vin din MPass, doar pentru citire.") || ""
        : `${ui().renderInfoNote?.("La 13 cifre se caută compania în Registrul de Stat (date publice); denumirea se completează doar pentru citire. Un IDNO inexistent primește mesaj de eroare.") || ""}
           ${sourceFacts([["Registru", "RSUD (Registrul de Stat al unităților de drept)"], ["Completează", esc(tr(field.companyLabel) || "Denumirea companiei")], ["Jurnal", "Fiecare interogare (MLog)"]])}`}`);
  }
  function contactDataHtml(field) {
    const parts = field.contactParts || CONTACT_PARTS_DEFAULT;
    return group("Câmpurile persoanei de contact", `
      <ul class="e-permits-builder__parts">
        ${CONTACT_PARTS.map(([key, label, kind]) => {
          const part = parts[key] || { visible: false, required: false };
          return `
            <li class="e-permits-builder__part${part.visible ? "" : " is-muted"}" data-contact-item="${key}">
              <div class="e-permits-builder__part-head">
                <strong>${esc(label)}</strong>
                <em class="e-permits-builder__tag e-permits-builder__tag--outlined">${esc(kind)}</em>
              </div>
              <div class="e-permits-check-options">
                ${ui().renderCheckOption?.({ label: "Vizibil", checked: part.visible, attrs: `data-contact-visible="${key}"` }) || ""}
                ${ui().renderCheckOption?.({ label: "Obligatoriu", required: true, checked: part.required, disabled: !part.visible, reason: "Câmpul este ascuns.", attrs: `data-contact-required="${key}"` }) || ""}
              </div>
            </li>`;
        }).join("")}
      </ul>
      <p class="e-permits-fo-field__hint">Se aplică la „Altă persoană”; la „Eu” se arată datele solicitantului, doar citire.</p>`);
  }
  function subdivisionDataHtml(field) {
    const mode = field.subdivisionMode || "derived";
    const classifiers = classifierRegistry.filter((item) => item.kind === "subdivisions");
    const rows = subdivisionRows(field);
    const addresses = allFields().filter(({ field: other }) => other.type === "address");
    const err = (prop) => propError("field", field.id, prop);
    return `
      ${group("Sursa opțiunilor", `
        ${grid(selectField({ prop: "subdivisionSource", label: "Clasificatorul subdiviziunilor", value: field.subdivisionSource || "", placeholder: "Alege clasificatorul", required: true, error: err("subdivisionSource"), options: classifiers.map((item) => [item.id, item.displayName]), hint: "Subdiviziunile autorității, din Clasificatoare." }))}
        ${rows.length ? sourceFacts([["Valori", `${rows.length} subdiviziuni`], ["Exemplu", esc(rows[0])]]) : ""}`)}
      ${group("Cum se alege", `
        ${grid(`
          ${selectField({ prop: "subdivisionMode", label: "Mod", value: mode, options: SUBDIVISION_MODES })}
          ${mode === "derived" ? selectField({ prop: "addressFieldId", label: "Câmpul Adresă", value: field.addressFieldId || "", placeholder: addresses.length ? "Alege câmpul" : "Formularul nu are o adresă", required: true, error: err("addressFieldId"), options: addresses.map(({ field: other }) => [other.id, tr(other.label) || other.key]), hint: "Raionul acestei adrese propune subdiviziunea; solicitantul o poate schimba." }) : ""}
          ${mode === "auto" ? selectField({ prop: "subdivisionAuto", label: "Subdiviziunea", value: field.subdivisionAuto || "", placeholder: "Alege subdiviziunea", required: true, error: err("subdivisionAuto"), options: rows.map((row) => [row, row]), hint: "Se completează singură, doar citire (US-48 „Autoselect”)." }) : ""}
        `)}
        ${mode === "derived" ? '<p class="e-permits-fo-field__hint">Când adresa se schimbă, propunerea se recalculează (US-13 AC-06).</p>' : ""}`)}`;
  }
  function mdocsDataHtml(field) {
    return group("Document", `
      ${grid(selectField({ prop: "docType", label: "Tipul documentului în MDocs", value: field.docType || "", placeholder: "Alege tipul", options: MDOCS_TYPES, hint: "Solicitantul îl alege din documentele sale MDocs sau îl încarcă de pe dispozitiv." }))}
      ${ui().renderInfoNote?.("Cererile fără MPass (vizitator) nu au acces la MDocs: acolo se arată doar încărcarea.") || ""}`);
  }
  function hiddenDataHtml(field) {
    const source = field.hiddenSource || "static";
    return group("Valoarea", `
      ${grid(`
        ${selectField({ prop: "hiddenSource", label: "Sursa valorii", value: source, options: HIDDEN_SOURCES })}
        ${source === "static" ? inputField({ prop: "hiddenValue", label: "Valoare", value: field.hiddenValue || "", required: true, error: propError("field", field.id, "hiddenValue"), placeholder: "Ex.: ANSA-23" }) : ""}
        ${source === "prefill" ? selectField({ prop: "prefillKey", label: "Din", value: field.prefillKey || "requestType", options: PREFILL_KEYS, hint: `În Previzualizare: „${esc(hiddenValue(field) || "—")}”.` }) : ""}
      `)}
      ${source === "rule" ? `${ui().renderInfoNote?.("Valoarea o setează regulile din tabul Logică („Setează valoarea”). Fără o regulă îndeplinită, câmpul rămâne gol.") || ""}<div><button class="btn btn-secondary btn-sm" type="button" data-builder-prop-tab="logic">Deschide Logică</button></div>` : ""}
      <p class="e-permits-fo-field__hint">Valoarea pleacă odată cu cererea, spre Back Office și RAP; solicitantul nu o vede.</p>`);
  }

  /* Listă derulantă › Date: the data source (US-22), full-flow controls */
  function selectDataHtml(field) {
    const ds = field.dataSource;
    const mode = ds?.mode || "";
    const err = (prop) => propError("field", field.id, prop);
    let body = "";
    if (mode === "existing") {
      const classifier = getClassifier(ds.classifierId);
      const siblingsOf = findChild(field.id);
      const parentLabel = (other) => `${siblingsOf && kidsOf(siblingsOf.container).includes(other) ? (siblingsOf.container.type === "grid" ? "Coloana" : "Câmpul din bloc") : "Câmpul"} „${tr(other.label) || other.key}”`;
      const otherSelects = [
        ...(siblingsOf ? kidsOf(siblingsOf.container).filter((other) => other.id !== field.id && other.type === "select" && other.dataSource) : []),
        ...allFields().map(({ field: other }) => other).filter((other) => other.id !== field.id && other.type === "select" && other.dataSource),
      ].map((other) => ({ field: other }));
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
        ${classifier && field.type === "select" && !(findChild(field.id)?.container.type === "grid") ? toggleField({ prop: "dataSource.search", label: "Listă cu căutare (cod și denumire)", description: "Pentru clasificatoare mari, ex. CAEM; într-un bloc, lista care depinde de ea apare dedesubt.", checked: ds.search }) : ""}
        ${classifier?.id === "reg_caem" ? ui().renderInfoNote?.("Lista CAEM se filtrează după pașaportul serviciului (US-40 AC-05); RSUD devine sursa ulterior.") || "" : ""}
        ${classifier?.treeKey ? `
          ${toggleField({ prop: "dataSource.tree.enabled", label: "Selecție arborescentă", description: "Solicitantul alege pe niveluri (ex.: CAEM).", checked: ds.tree?.enabled })}
          ${ds.tree?.enabled ? grid(`${inputField({ prop: "dataSource.tree.maxLevels", label: "Nivel maxim", value: ds.tree.maxLevels ?? 0, numeric: true, span: 6, hint: "0 = nelimitat" })}${inputField({ prop: "dataSource.tree.minLevel", label: "Obligatoriu până la nivelul", value: ds.tree.minLevel ?? 0, numeric: true, span: 6, hint: "0 = orice nivel" })}`) : ""}` : ""}
        ${classifier && !ds.tree?.enabled ? `
          ${toggleField({ prop: "dataSource.cascade", label: "Câmp dependent", description: "Opțiunile se filtrează după alt câmp (ex.: Raion → Localitate).", checked: ds.cascade })}
          ${ds.cascade ? grid(`
            ${selectField({ prop: "dataSource.parentFieldId", label: "Câmp părinte", value: ds.parentFieldId || "", placeholder: otherSelects.length ? "Alege câmpul" : "Nicio altă listă configurată", error: propError("field", field.id, "dataSource.parentFieldId"), options: otherSelects.map(({ field: other }) => [other.id, parentLabel(other)]), hint: siblingsOf ? "O listă din același rând / element sau un câmp al formularului (US-37 AC-02); schimbarea părintelui golește lista (AC-03)." : "" })}
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

  /* ---- Avansat (spec C.0 / D.2): identity + copy, integration (API key, BO mapping), where the
     value is editable / shown, personal data, FOD properties, audit */
  const defaultApiKey = (field) => `${String(form.technical || "formular").replace(/^f_/, "")}.${field.key ? field.key.charAt(0).toLowerCase() + field.key.slice(1) : "camp"}`;
  function advancedTabHtml(field) {
    const t = field.type;
    const sqlType = sqlTypeOf(field);
    const types = form.requestTypes || [];
    const editable = field.editableAt || types;
    const fod = ["text", "textarea", "email", "number", "money"].includes(t);
    const copy = (value, what) => R.copyValueHtml?.(value, { ariaLabel: `Copiază ${what} ${value}` }) || esc(value);
    return `
      ${group("Identificare", `
        <dl class="e-permits-builder__facts">
          <div><dt>Cheie câmp</dt><dd>${field.key ? copy(field.key, "cheia") : "—"}</dd></div>
          <div><dt>Identificator intern</dt><dd>${copy(field.id, "identificatorul")}</dd></div>
          <div><dt>Coloana în BD</dt><dd>${esc(field.key || "—")}</dd></div>
          <div><dt>Tip SQL</dt><dd>${esc(sqlType)}</dd></div>
        </dl>
        <p class="e-permits-fo-field__hint">Cheia se schimbă din General; după prima publicare rămâne fixă (coloana există deja).</p>`)}
      ${isContainer(field) ? group("Stocare 1:N (US-33)", `
        <dl class="e-permits-builder__facts">
          <div><dt>Tabel copil</dt><dd>${esc(tableOf([field]))}</dd></div>
          <div><dt>Legătura</dt><dd>CaseId → dosarul (index pe CaseId)</dd></div>
          <div><dt>Ordinea</dt><dd>SortOrder</dd></div>
          <div><dt>${t === "grid" ? "Coloane" : "Câmpuri"}</dt><dd>${kidsOf(field).length}${kidsOf(field).some((child) => child.type === "grid") ? " · grilele imbricate au tabelul lor, legat de rândul-părinte" : ""}</dd></div>
        </dl>
        <p class="e-permits-fo-field__hint">Valoarea în cerere = o listă de rânduri (JSON); schema grilei se păstrează în SettingsJSON.</p>`) : ""}
      ${group("Integrare", grid(`
        ${inputField({ prop: "apiKey", label: "Cheie API / integrare", value: field.apiKey || "", placeholder: defaultApiKey(field), hint: `Numele valorii în API-ul cererii și în MConnect. Gol = „${esc(defaultApiKey(field))}”.` })}
        ${selectField({ prop: "boMapping", label: "Mapare în Back Office", value: field.boMapping || "", options: BO_MAPPING, hint: "Unde vede funcționarul valoarea în fișa dosarului." })}
        ${textareaField({ prop: "techDescription", label: "Descriere tehnică", value: field.techDescription || "", hint: "Pentru echipa tehnică și registrul RAP; solicitantul nu o vede." })}
      `))}
      ${t === "hidden" || t === "consent" ? "" : group("Editabil la tipurile de solicitare", `
        <div class="e-permits-check-options e-permits-check-options--stack">
          ${types.map((type) => ui().renderCheckOption?.({ label: type, checked: editable.includes(type), attrs: `data-fb-editable-at="${esc(type)}"` }) || "").join("")}
        </div>
        <p class="e-permits-fo-field__hint">La celelalte tipuri câmpul apare precompletat din cererea anterioară, doar citire (ex.: suplinire, US-26).</p>`)}
      ${group("Afișat în", `
        <div class="e-permits-check-options e-permits-check-options--stack">
          ${t === "hidden" ? "" : checkOption({ prop: "showInReview", label: "Pasul Verificare (rezumat)", checked: field.showInReview !== false })}
          ${checkOption({ prop: "showInPrint", label: "Formularul de tipar (PDF)", checked: field.showInPrint !== false })}
          ${checkOption({ prop: "publishRap", label: "Registrul actelor permisive (RAP)", checked: field.publishRap })}
        </div>`)}
      ${group("Date personale", `
        <div class="e-permits-check-options">
          ${checkOption({ prop: "personalData", label: "Conține date cu caracter personal", checked: field.personalData ?? ["idnp", "contact"].includes(t) })}
        </div>
        ${grid(selectField({ prop: "retention", label: "Păstrare", value: field.retention || "", options: RETENTION, hint: "Cât timp se păstrează valoarea după închiderea dosarului." }))}`)}
      ${fod ? group("Proprietăți ale câmpului (FOD)", `
        <div class="e-permits-check-options e-permits-check-options--stack">
          ${checkOption({ prop: "clearable", label: "Buton de golire (Clearable)", checked: field.clearable })}
          ${checkOption({ prop: "immediate", label: "Validare la tastare (Immediate)", checked: field.immediate })}
        </div>`) : ""}
      ${group("Jurnal", `
        <dl class="e-permits-builder__facts">
          <div><dt>Adăugat</dt><dd>${field.createdAt ? `${esc(longDate(field.createdAt))} · ${esc(field.createdBy || "")}` : `în ${esc(form.version)} (publicat)`}</dd></div>
          <div><dt>Ultima modificare</dt><dd>${field.editedAt ? `${esc(longDate(field.editedAt))}, ${esc(field.editedAt.slice(11, 16))} · ${esc(field.editedBy || "")}` : "—"}</dd></div>
          <div><dt>Modificări în sesiune</dt><dd>${field.changes || 0}</dd></div>
        </dl>
        <p class="e-permits-fo-field__hint">Fiecare modificare a configurației se jurnalizează în MLog (US-04) și apare în Jurnalul de evenimente al serviciului.</p>`)}`;
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
          <button class="btn btn-secondary btn-sm" type="button" data-fb-preview-validate${state.device === "mobile" ? ' aria-disabled="true" data-tooltip-reason="Pe ecranul de telefon apăsați „Înainte” în formular."' : ""}>Validează</button>
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
  /* the answer of a field (cell = its element; for a block field, its element inside one card) */
  function previewValue(field, cell = previewCell(field.id)) {
    if (!cell || cell.hidden) return field.type === "checkbox" ? false : field.type === "checklist" || field.type === "multiselect" ? [] : "";
    switch (field.type) {
      case "radio": return cell.querySelector("input[type='radio']:checked")?.value || "";
      case "segment": return cell.querySelector(".segment-item.is-selected")?.dataset.value || "";
      case "select": {
        const picked = cell.querySelector(".e-permits-fo-caem__option.is-selected");
        if (cell.querySelector("[data-fo-caem]")) return picked ? displayLabel({ code: picked.dataset.code, name: picked.dataset.label }, field.dataSource?.template) : "";
        const value = cell.querySelector("[data-fo-select-value]");
        return value && !value.classList.contains("e-permits-fo-select__value--placeholder") ? value.textContent.trim() : "";
      }
      /* a grid / block as a rule source = its number of rows / elements (spec D.4, batch 4) */
      case "grid":
      case "repeat": { const n = window.GEAPFoRepeat?.count(cell) || 0; return n ? String(n) : ""; }
      case "checklist": return [...cell.querySelectorAll("input[type='checkbox']:checked")].map((box) => box.value);
      case "multiselect": return [...cell.querySelectorAll(".e-permits-fo-subgen-select__option.is-selected")].map((option) => option.dataset.value);
      case "checkbox":
      case "consent": return Boolean(cell.querySelector("input[type='checkbox']")?.checked);
      case "date": return cell.querySelector("[data-date-picker]")?.dataset.selected || "";
      case "idnp":
      case "idno": { const code = cell.querySelector("[data-fo-digits]"); return code ? code.value.trim() : (cell.querySelector(".e-permits-fo-input__value")?.textContent || "").replace("—", "").trim(); }
      case "subdivision": { const value = cell.querySelector("[data-fo-select-value]"); if (!value) return (cell.querySelector(".e-permits-fo-input__value")?.textContent || "").trim(); return value.classList.contains("e-permits-fo-select__value--placeholder") ? "" : value.textContent.trim(); }
      case "hidden": return cell.value || "";
      case "file":
      case "mdocs": return cell.querySelector(".e-permits-fo-file-item, .e-permits-fo-mdocs__attachment") ? "atașat" : "";
      default: return (cell.querySelector("input, textarea")?.value || "").trim();
    }
  }
  const toDateIso = (value) => { const m = String(value || "").match(/^(\d{2})[./](\d{2})[./](\d{4})$/); return m ? `${m[3]}-${m[2]}-${m[1]}` : String(value || ""); };
  /* scope = a block card: its own fields are read there (rules between the fields of one element) */
  const valueFor = (field, scope) => (scope ? previewValue(field, scope.querySelector(`[data-fo-repeat-child="${field.id}"]`)) : previewValue(field));
  function conditionHolds(c, scope = null) {
    const source = fieldOrChild(c.field);
    if (!source || !c.op) return false;
    const family = FAMILY[source.type];
    const v = valueFor(source, scope);
    const isEmpty = Array.isArray(v) ? !v.length : v === "" || v === false;
    if (c.op === "empty") return isEmpty;
    if (c.op === "filled") return !isEmpty;
    if (c.op === "checked") return v === true;
    if (c.op === "unchecked") return v !== true;
    const list = String(c.value || "").split("|").filter(Boolean);
    if (c.op === "in") return Array.isArray(v) ? v.some((item) => list.includes(item)) : list.includes(String(v));
    /* „Alt câmp”: the other field's current answer (an empty one never matches) */
    const other = c.mode === "field" ? fieldOrChild(c.other) : null;
    if (c.mode === "field" && !other) return false;
    const right = other ? valueFor(other, scope) : c.value;
    if (other && (right === "" || right === false)) return false;
    if (c.op === "contains") return String(v).toLowerCase().includes(String(right || "").toLowerCase());
    if (family === "number" || family === "date") {
      if (isEmpty) return false;
      const a = family === "number" ? Number(String(v).replace(",", ".")) : String(v);
      const b = family === "number" ? Number(String(right).replace(",", ".")) : toDateIso(right);
      return { eq: a === b, ne: a !== b, lt: a < b, le: a <= b, gt: a > b, ge: a >= b }[c.op] ?? false;
    }
    if (c.op === "eq") return String(v) === String(right);
    if (c.op === "ne") return String(v) !== String(right);
    return false;
  }
  const ruleHolds = (rule, scope = null) => { const results = rule.conditions.map((c) => conditionHolds(c, scope)); return rule.join === "or" ? results.some(Boolean) : results.every(Boolean); };
  /* restrictive wins: Ascunde > Afișează; Obligatoriu > Opțional */
  function outcome(target, scope = null) {
    const rules = (target.rules || []).filter((rule) => rule.conditions.every((c) => c.field && c.op));
    const shows = rules.filter((rule) => rule.action === "show");
    const hidden = rules.some((rule) => rule.action === "hide" && ruleHolds(rule, scope)) || (shows.length > 0 && !shows.some((rule) => ruleHolds(rule, scope)));
    let required = Boolean(target.required);
    if (rules.some((rule) => rule.action === "optional" && ruleHolds(rule, scope))) required = false;
    if (rules.some((rule) => rule.action === "require" && ruleHolds(rule, scope))) required = true;
    return { hidden, required };
  }
  function clearCell(cell) {
    /* a hidden grid / block loses its rows (US-42 AC-11: hidden = emptied) */
    if (cell.matches?.("[data-fo-grid], [data-fo-repeat]")) { window.GEAPFoRepeat?.reset(cell); return; }
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
          /* rules between the fields of one block element, card by card */
          if (field.type === "repeat") {
            previewCell(field.id)?.querySelectorAll("[data-fo-repeat-item]").forEach((item) => kidsOf(field).forEach((child) => {
              if (!child.rules?.length) return;
              const node = item.querySelector(`[data-fo-repeat-child="${child.id}"]`);
              if (!node) return;
              const hide = outcome(child, item).hidden;
              if (node.hidden !== hide) { node.hidden = hide; changed = true; if (hide) clearCell(node); }
            }));
          }
          if (!field.rules?.length) return;
          const cell = previewCell(field.id);
          if (!cell) return;
          /* Câmp ascuns „Din regulă”: the last rule that holds sets the value */
          if (field.type === "hidden") {
            const set = (field.rules || []).filter((rule) => rule.action === "set" && rule.conditions.every((c) => c.field && c.op) && ruleHolds(rule)).pop();
            const value = field.hiddenSource === "rule" ? set?.setValue || "" : hiddenValue(field);
            if (cell.value !== value) { cell.value = value; changed = true; }
            return;
          }
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

  /* ---- „Validează” (spec F.9): the checks of „Înainte” on the Preview, in the runtime order
     Obligatoriu → format → limite → reguli între câmpuri (US-30 AC-12, US-41 AC-18). Errors = the FO
     field error (library inline message, hint hidden); focus goes to the first one. */
  const shiftIso = (iso, n, unit) => {
    const d = new Date(`${iso}T12:00:00`);
    const k = Number(n) || 0;
    if (unit === "months") d.setMonth(d.getMonth() + k); else if (unit === "years") d.setFullYear(d.getFullYear() + k); else d.setDate(d.getDate() + k);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  function dateProblem(field, iso) {
    const min = dateLimit(field.dateMin);
    const max = dateLimit(field.dateMax);
    if (min && iso < min) return `Data nu poate fi înainte de ${isoToRo(min)}.`;
    if (max && iso > max) return `Data nu poate fi după ${isoToRo(max)}.`;
    for (const rule of field.dateRules || []) {
      if (!rule.op || !rule.target) continue;
      const other = rule.target === "today" ? null : findField(rule.target)?.field;
      const base = rule.target === "today" ? R.localIsoDay() : other ? previewValue(other) : "";
      if (!base) continue;
      const limit = shiftIso(base, rule.offset, rule.unit);
      const ok = { lt: iso < limit, le: iso <= limit, gt: iso > limit, ge: iso >= limit }[rule.op];
      if (!ok) return tr(field.validation?.message) || `Data trebuie să fie ${dateOpText(rule.op)} ${rule.target === "today" ? "data curentă" : `„${fieldName(other)}”`}${offsetText(rule)} (${isoToRo(limit)}).`;
    }
    return "";
  }
  function fieldProblem(field, cell) {
    const v = previewValue(field);
    const empty = Array.isArray(v) ? !v.length : v === "" || v === false;
    const required = field.type === "consent" || outcome(field).required;
    const val = field.validation || {};
    const custom = tr(val.message);
    if (empty) {
      if (!required) return "";
      if (field.type === "consent" || field.type === "checkbox") return "Bifează pentru a continua.";
      if (field.type === "file" || field.type === "mdocs") return "Atașează documentul.";
      if (["radio", "segment", "checklist", "multiselect", "select", "subdivision"].includes(field.type)) return "Alege o opțiune.";
      return "Câmp obligatoriu";
    }
    switch (field.type) {
      case "text": {
        const pattern = patternOf(field);
        if (pattern && !regexError(pattern) && !new RegExp(pattern).test(v)) return custom || presetOf(field).message || "Valoarea nu are formatul cerut.";
        if (val.minLength && v.length < Number(val.minLength)) return custom || `Minimum ${val.minLength} caractere.`;
        return "";
      }
      case "textarea": return val.minLength && v.length < Number(val.minLength) ? `Minimum ${val.minLength} caractere.` : "";
      case "email": return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "" : custom || "Adresa email nu este validă.";
      case "phone": return /^\d{8}$/.test(v.replace(/[\s-]/g, "")) ? "" : custom || "Introdu un număr valid: 8 cifre după +373.";
      case "number":
      case "money": {
        const n = Number(String(v).replace(",", "."));
        if (Number.isNaN(n)) return "Introdu un număr.";
        if ((val.min !== "" && val.min != null && n < Number(val.min)) || (val.max !== "" && val.max != null && n > Number(val.max))) return (custom || `Introduceți o valoare între ${val.min ?? "…"} și ${val.max || "…"}.`).replace("{min}", val.min ?? "").replace("{max}", val.max ?? "");
        return "";
      }
      case "idnp":
      case "idno": {
        if (!cell.querySelector("[data-fo-digits]")) return "";
        if (!/^\d{13}$/.test(v)) return custom || `${field.type.toUpperCase()}-ul trebuie să aibă 13 cifre.`;
        const lookup = cell.foLookup || cell.closest("[data-fo-registry-lookup]")?.foLookup;
        if (lookup?.pending) return "Așteaptă răspunsul registrului.";
        if (lookup && lookup.code === v && !lookup.record) return field.type === "idno" ? "Nu am găsit o companie cu acest IDNO în Registrul de Stat." : "Nu am găsit o persoană cu acest IDNP în Registrul de Stat al Populației.";
        return "";
      }
      case "date": return dateProblem(field, v);
      case "checklist":
      case "multiselect": {
        if (val.minSelected && v.length < Number(val.minSelected)) return (custom || "Selectați cel puțin {min} opțiuni.").replace("{min}", val.minSelected);
        if (val.maxSelected && v.length > Number(val.maxSelected)) return `Selectați cel mult ${val.maxSelected} opțiuni.`;
        return "";
      }
      default: return "";
    }
  }
  function markPreviewError(cell, message) {
    const input = cell.querySelector(".e-permits-fo-input input:not([readonly]):not(:disabled), .e-permits-fo-phone--editable input");
    if (input && !cell.matches("fieldset")) { R.setFieldError?.(input, message); return input; }
    const errorHtml = `<span class="message message--inline message--error e-permits-fo-field__error" data-fb-preview-error>${icon("icon-circle-error-filled")}<span>${esc(message)}</span></span>`;
    const doc = cell.querySelector(".e-permits-fo-doc-field");
    if (doc) {
      doc.classList.add("is-error");
      const desc = doc.querySelector(".e-permits-fo-doc-field__desc");
      if (desc) { desc.hidden = true; desc.dataset.fbHintHidden = ""; desc.insertAdjacentHTML("afterend", errorHtml); } else doc.insertAdjacentHTML("beforeend", errorHtml);
      return doc.querySelector("[data-fo-open-doc-modal]");
    }
    cell.querySelectorAll(":scope > .e-permits-fo-field__hint").forEach((hint) => { hint.hidden = true; hint.dataset.fbHintHidden = ""; });
    cell.querySelector(".checkbox")?.classList.add("checkbox--error");
    cell.querySelectorAll(".e-permits-fo-select, .e-permits-fo-textarea, .e-permits-fo-subgen-select").forEach((control) => control.classList.add("is-error"));
    cell.insertAdjacentHTML("beforeend", errorHtml);
    const focusable = cell.querySelector("input:not([type='hidden']):not(:disabled), textarea, button, [tabindex='0']");
    focusable?.setAttribute("aria-invalid", "true");
    return focusable;
  }
  function clearPreviewError(cell) {
    cell.querySelectorAll("[data-fb-preview-error]").forEach((node) => node.remove());
    cell.querySelectorAll("[data-fb-hint-hidden]").forEach((node) => { node.hidden = false; delete node.dataset.fbHintHidden; });
    cell.querySelectorAll(".checkbox--error").forEach((node) => node.classList.remove("checkbox--error"));
    cell.querySelectorAll(".e-permits-fo-select.is-error, .e-permits-fo-textarea.is-error, .e-permits-fo-subgen-select.is-error, .e-permits-fo-doc-field.is-error").forEach((node) => node.classList.remove("is-error"));
    cell.querySelectorAll("[aria-invalid='true']").forEach((node) => { if (node.closest(".e-permits-fo-input, .e-permits-fo-phone--editable")) R.setFieldError?.(node, ""); else node.removeAttribute("aria-invalid"); });
  }
  function validatePreview() {
    const problems = [];
    (activeStep().sections || []).forEach((section) => {
      const sectionEl = el.previewBody.querySelector(`[data-fb-section="${section.id}"]`);
      section.fields.forEach((field) => {
        const cell = previewCell(field.id);
        if (!cell) return;
        clearPreviewError(cell);
        if (sectionEl?.hidden || cell.hidden || NO_VALUE.includes(field.type) || field.type === "hidden" || field.type === "contact") return;
        /* grid / block: rows being edited, cells, keys, min rows — marked by js/fo-grid.js */
        if (isContainer(field)) { const result = window.GEAPFoRepeat?.validate(cell) || { count: 0 }; if (result.count) problems.push(result.first || cell); return; }
        const message = fieldProblem(field, cell);
        if (message) problems.push(markPreviewError(cell, message) || cell);
      });
    });
    if (problems.length) {
      problems[0].focus?.();
      problems[0].scrollIntoView?.({ block: "center" });
      announce(`${problems.length} ${problems.length === 1 ? "câmp are o eroare" : "câmpuri au erori"}. Primul a primit focusul.`);
    } else {
      ui().showShellToast?.("Pasul trece verificarea: nicio eroare.", "success");
      announce("Pasul trece verificarea: nicio eroare.");
    }
    return problems.length;
  }
  /* an error clears when its field is edited (as in the request form) */
  ["input", "change"].forEach((type) => el.previewBody.addEventListener(type, (event) => {
    /* grids and blocks clear their own cell errors (js/fo-grid.js) */
    if (event.target.closest?.("[data-fo-grid], [data-fo-repeat]")) return;
    const cell = event.target.closest?.("[data-fb-field]");
    if (cell && cell.querySelector("[data-fb-preview-error], [aria-invalid='true']")) clearPreviewError(cell);
  }));

  /* „Completează cu date de test”: one plausible answer per field (rules re-run) */
  function fillTestData() {
    (activeStep().sections || []).forEach((section) => section.fields.forEach((field) => {
      const cell = previewCell(field.id);
      if (!cell || cell.hidden) return;
      if (isContainer(field)) { window.GEAPFoRepeat?.fill(cell); return; }
      const input = cell.querySelector("input:not([type='radio']):not([type='checkbox']):not([type='search']), textarea");
      const sample = { text: tr(field.placeholder).replace(/^Ex\.:\s*/, "") || "Exemplu", textarea: "Text de test pentru acest câmp.", email: "ion.popescu@exemplu.md", phone: "69 123 456", number: String(field.validation?.min || 10), money: "150.00" }[field.type];
      if (sample && input) input.value = field.type === "text" && presetOf(field).sample ? presetOf(field).sample : sample;
      if (field.type === "date") { const picker = cell.querySelector("[data-date-picker]"); const iso = R.localIsoDay(7); if (picker) { picker.dataset.selected = iso; const box = picker.querySelector("input"); if (box) box.value = isoToRo(iso); } }
      if (field.type === "radio") { const first = cell.querySelector("input[type='radio']"); if (first) first.checked = true; }
      if (field.type === "segment") cell.querySelector(".segment-item")?.click();
      if (field.type === "checkbox" || field.type === "checklist") { const first = cell.querySelector("input[type='checkbox']"); if (first) first.checked = true; }
      if (field.type === "select" || field.type === "subdivision") { const first = cell.querySelector(".e-permits-fo-select__option"); const value = cell.querySelector("[data-fo-select-value]"); if (first && value) { value.textContent = first.dataset.value; value.classList.remove("e-permits-fo-select__value--placeholder"); } }
      if (field.type === "consent") { const box = cell.querySelector("input[type='checkbox']"); if (box) box.checked = true; }
      /* registry codes: a code the mock registry knows, typed in → the lookup runs */
      if (field.type === "idnp" || field.type === "idno") {
        const consent = cell.querySelector("[data-fo-lookup-consent]");
        if (consent && !consent.checked) { consent.checked = true; consent.dispatchEvent(new Event("change", { bubbles: true })); }
        const code = cell.querySelector("[data-fo-digits]");
        if (code && !code.disabled) { code.value = field.type === "idno" ? "1012600000001" : "2990000000002"; code.dispatchEvent(new Event("input", { bubbles: true })); }
      }
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
          fields: section.fields.map((field) => { const { published, ...rest } = field; return withStorage(rest, [field]); }),
        })),
      })),
    };
  }
  /* grids / blocks carry where their rows live (US-33 AC-03; nested: own table, US-38 AC-02) */
  function withStorage(field, chain) {
    if (!isContainer(field)) return field;
    const key = field.type === "grid" ? "columns" : "fields";
    return {
      ...field,
      value: "rows[]",
      storage: { table: tableOf(chain), parentKey: chain.length > 1 ? "ParentRowId" : "CaseId", order: "SortOrder" },
      [key]: kidsOf(field).map((child) => (child.type === "grid" ? withStorage(child, [...chain, child]) : child)),
    };
  }
  function renderSchema() {
    el.schemaCode.textContent = JSON.stringify(schemaOf(), null, 2);
  }

  /* ================================================ COMPONENTE SALVATE (saved components)
     A configured field saved for reuse (the „Adresa obiectului” model): the palette group „Componente
     salvate” lists the system presets + the saved ones; an inserted copy stays linked
     (`field.preset = { id, version }`) and can be updated from its source, push its changes to the
     source (version + 1; the other copies are offered the update) or be detached. */
  const SYSTEM_PRESETS = [
    { id: "preset-object-address", system: true, name: "Adresa obiectului", desc: "Adresă cu cod cadastral (SRRE)", type: "address", scope: "global", version: 1, field: { label: i18n("Adresa obiectului"), required: true, span: 12, addressConfig: [{ key: "cadastral", visible: true, required: false, defaultValue: "" }] } },
    /* US-40: the FO activities (#1 Activitate · Codul CAEM · Subgen · „Adaugă altă activitate”) as a
       configured repeatable block: key + group = the CAEM code (no duplicates, one section), min 1 */
    { id: "preset-caem", system: true, name: "Activități CAEM", desc: "Cod CAEM + subgenuri, un card pe activitate", type: "repeat", icon: "icon-store", scope: "global", version: 1, field: {
      label: i18n("Activitățile desfășurate"), labelHidden: true, required: true, span: 12,
      itemTitle: i18n("Activitate"), addLabel: i18n("Adaugă altă activitate"), note: i18n("Codurile CAEM se prezintă în dependență de activitățile înregistrate în RSUD."),
      rowRules: { minRows: 1, maxRows: "", defaultRows: 1, allowRemove: true, keyColumn: "bf-caem-code", groupColumn: "bf-caem-code" },
      messages: { min: i18n("Adaugă cel puțin o activitate."), max: i18n(), duplicate: i18n("Dvstră ați înregistrat deja acest cod CAEM."), group: i18n("Într-o solicitare pot fi selectate doar coduri ale unei secțiuni: {grup}.") },
      fields: [
        { id: "bf-caem-code", type: "select", key: "CodCaem", label: i18n("Codul CAEM"), help: i18n(), placeholder: i18n("Selectează cod CAEM"), required: true, readOnly: false, span: 12, dataSource: { mode: "existing", classifierId: "reg_caem", template: "code-name", search: true } },
        { id: "bf-caem-sub", type: "multiselect", key: "SubgenActivitate", label: i18n("Subgen de activitate"), help: i18n(), placeholder: i18n("Alege subgen de activitate"), required: true, readOnly: false, span: 12, noOptionsText: i18n("Niciun subgen disponibil pentru acest cod CAEM."), dataSource: { mode: "existing", classifierId: "reg_caem_subgen", template: "name", cascade: true, parentFieldId: "bf-caem-code", filterColumn: "caem_code" }, validation: { minSelected: 1, maxSelected: "", message: i18n() } },
      ] } },
  ];
  const presets = () => [...SYSTEM_PRESETS, ...((db && db.presets) || [])];
  const presetById = (id) => presets().find((item) => item.id === id) || null;
  const PRESET_SKIP = ["id", "key", "published", "keyEdited", "preset", "rules", "createdAt", "createdBy", "editedAt", "editedBy", "changes"];
  function presetSnapshot(field) {
    const copy = clone(field);
    PRESET_SKIP.forEach((key) => delete copy[key]);
    return copy;
  }
  const presetChanged = (field, preset) => {
    /* the same normalisation as a stored field (sanitize): empty help / placeholder / message */
    const norm = (obj) => { obj.help = obj.help || i18n(); obj.placeholder = obj.placeholder || i18n(); obj.validation = { ...(obj.validation || {}) }; obj.validation.message = obj.validation.message || i18n(); return obj; };
    /* children: compared by position, not by their (re-generated) ids or audit stamps */
    const byPosition = (obj) => {
      const ids = [];
      const walk = (container) => kidsOf(container).forEach((child) => { ids.push(child.id); ["createdAt", "createdBy", "editedAt", "editedBy", "changes"].forEach((key) => delete child[key]); if (child.type === "grid") walk(child); });
      walk(obj);
      let json = JSON.stringify(obj);
      ids.forEach((id, i) => { json = json.split(`"${id}"`).join(`"#${i}"`); });
      return JSON.parse(json);
    };
    const mine = byPosition(norm(presetSnapshot(field)));
    const source = byPosition(norm({ ...makeFieldBase(preset), ...clone(preset.field) }));
    if (isContainer(source)) sanitizeChildren(source);
    /* the label is the form's own text: a renamed copy is still „the same” component */
    delete mine.label; delete source.label;
    const keys = new Set([...Object.keys(mine), ...Object.keys(source)]);
    return [...keys].some((key) => JSON.stringify(mine[key] ?? null) !== JSON.stringify(source[key] ?? null));
  };
  /* the same defaults a new field of the type gets, so a comparison ignores untouched props */
  function makeFieldBase(preset) {
    const meta = comp(preset.type);
    return { type: preset.type, label: i18n(), help: i18n(), placeholder: i18n(), span: meta.span || 4, required: false, readOnly: false, ...(meta.defaults ? meta.defaults() : {}) };
  }
  function linkedCopies(presetId, exceptId = "") {
    return allFields().filter(({ field }) => field.preset?.id === presetId && field.id !== exceptId).map(({ field }) => field);
  }

  function insertPreset(presetId, sectionId = "", index = null, { focus = true } = {}) {
    const preset = presetById(presetId);
    if (!preset || !isUsable(preset.type)) return null;
    const field = addField(preset.type, sectionId, index, { focus: false });
    if (!field) return null;
    Object.assign(field, clone(preset.field));
    sanitizeChildren(field);
    reidChildren(field);
    field.key = uniqueKey(camelKey(tr(field.label) || comp(field.type).label), field.id);
    field.preset = { id: preset.id, version: preset.version };
    commit();
    announce(`Componenta salvată „${preset.name}” a fost adăugată.`);
    if (focus) focusPanel('[data-fb-prop="label"], [data-fb-prop="text"]');
    return field;
  }

  /* Date tab top block of a linked copy */
  function presetLinkHtml(field) {
    if (!field.preset) return "";
    const preset = presetById(field.preset.id);
    if (!preset) {
      return group("Componentă salvată", `${ui().renderNotice?.("warning", "Componenta salvată din care provine câmpul a fost ștearsă. Câmpul rămâne așa cum este.") || ""}<div><button class="btn btn-neutral btn-sm" type="button" data-fb-preset-act="detach">Detașează</button></div>`);
    }
    const outdated = preset.version > (field.preset.version || 1);
    const changed = !outdated && presetChanged(field, preset);
    return group("Componentă salvată", `
      ${sourceFacts([["Sursa", `„${esc(preset.name)}”${preset.system ? " · de sistem" : ""}`], ["Versiune", `v${field.preset.version || 1}${outdated ? ` · sursa e la v${preset.version}` : ""}`], ["Stare", outdated ? "Sursa are modificări noi" : changed ? "Modificată față de sursă" : "La fel ca sursa"]])}
      ${outdated ? ui().renderNotice?.("warning", `„${esc(preset.name)}” a fost actualizată (v${preset.version}). Actualizarea înlocuiește configurația câmpului; cheia, eticheta din formular și regulile rămân.`) || "" : ""}
      <div class="e-permits-builder__inline-actions">
        ${outdated ? '<button class="btn btn-secondary btn-sm" type="button" data-fb-preset-act="update">Actualizează din sursă</button>' : ""}
        ${changed && !preset.system ? '<button class="btn btn-secondary btn-sm" type="button" data-fb-preset-act="push">Salvează în sursă</button>' : ""}
        <button class="btn btn-neutral btn-sm" type="button" data-fb-preset-act="detach">Detașează</button>
      </div>
      ${changed && preset.system ? '<p class="e-permits-fo-field__hint">Componentele de sistem nu se modifică din formular; salvați o copie cu ⋮ › Salvează ca componentă.</p>' : ""}`);
  }

  function presetAction(act) {
    const field = selectedTarget();
    const preset = presetById(field?.preset?.id);
    if (!field) return;
    if (act === "detach") {
      checkpoint();
      delete field.preset;
      commit();
      announce("Câmpul a fost detașat de componenta salvată; configurația rămâne.");
      el.panel.querySelector('[data-fb-prop="label"]')?.focus();
      return;
    }
    if (!preset) return;
    if (act === "update") {
      checkpoint();
      const keep = { id: field.id, key: field.key, label: field.label, rules: field.rules, published: field.published, keyEdited: field.keyEdited, createdAt: field.createdAt, createdBy: field.createdBy };
      Object.keys(field).forEach((key) => delete field[key]);
      Object.assign(field, makeFieldBase(preset), clone(preset.field), keep, { preset: { id: preset.id, version: preset.version } });
      commit();
      announce(`Câmpul a fost actualizat la versiunea ${preset.version} a componentei „${preset.name}”.`);
      el.panel.querySelector("[data-fb-preset-act]")?.focus();
      return;
    }
    if (act === "push" && !preset.system) {
      const others = linkedCopies(preset.id, field.id);
      const run = () => {
        checkpoint();
        preset.field = presetSnapshot(field);
        preset.version += 1;
        preset.updatedAt = localStamp();
        preset.updatedBy = currentUser();
        field.preset.version = preset.version;
        saveDb();
        commit();
        renderLibrary();
        ui().showShellToast?.(`Componenta „${preset.name}” a trecut la versiunea ${preset.version}.`, "success");
      };
      if (!others.length) { run(); return; }
      ui().askConfirm?.({ title: `Actualizați componenta „${preset.name}”?`, text: `${others.length} ${others.length === 1 ? "alt câmp o folosește și va primi" : "alte câmpuri o folosesc și vor primi"} propunerea de actualizare.`, confirmLabel: "Actualizează componenta" }, run);
    }
  }

  /* „Salvează ca componentă” — the library modal (#fb-preset-modal) */
  const presetModal = document.querySelector("#fb-preset-modal");
  if (presetModal && presetModal.parentElement !== document.body) document.body.appendChild(presetModal);
  let presetDraft = null;
  function renderPresetModal() {
    if (!presetModal || !presetDraft) return;
    const field = findField(presetDraft.fieldId)?.field;
    const name = String(presetDraft.name || "").trim();
    const error = presetDraft.tried && !name ? "Completează denumirea." : presetDraft.tried && presets().some((item) => normalize(item.name) === normalize(name)) ? "Există deja o componentă salvată cu această denumire." : "";
    presetModal.querySelector("[data-fb-preset-subtitle]").textContent = `${comp(field?.type).label} · „${fieldName(field || {})}”`;
    presetModal.querySelector("[data-fb-preset-body]").innerHTML = grid(`
      ${inputField({ prop: "preset.name", label: "Denumire", value: presetDraft.name, required: true, maxlength: 80, error, hint: "Așa apare în bibliotecă, în grupul „Componente salvate”." })}
      ${textareaField({ prop: "preset.desc", label: "Descriere", value: presetDraft.desc, hint: "Un rând: ce conține și când se folosește." })}
      ${selectField({ prop: "preset.scope", label: "Cine o poate folosi", value: presetDraft.scope, options: ACCESS })}
      <div class="e-permits-user-create__field">${ui().renderInfoNote?.("Se salvează configurația (etichete, validare, sursă, părți). Cheia și regulile nu se salvează. Câmpul rămâne legat de componentă.") || ""}</div>
    `);
    return error;
  }
  function openPresetModal(fieldId) {
    const field = findField(fieldId)?.field;
    if (!field || !presetModal) return;
    presetDraft = { fieldId, name: fieldName(field), desc: "", scope: "service", tried: false };
    renderPresetModal();
    window.__modal?.open?.("#fb-preset-modal");
    window.setTimeout(() => { const input = presetModal.querySelector('[data-fb-prop="preset.name"]'); input?.focus(); input?.select(); }, 30);
  }
  presetModal?.addEventListener("input", (event) => {
    const prop = event.target.dataset?.fbProp;
    if (!prop || !presetDraft) return;
    presetDraft[prop.split(".")[1]] = event.target.value;
  });
  presetModal?.addEventListener("change", (event) => {
    const prop = event.target.dataset?.fbProp;
    if (prop === "preset.scope" && presetDraft) presetDraft.scope = event.target.value;
  });
  presetModal?.addEventListener("click", (event) => {
    if (!event.target.closest("[data-fb-preset-save]") || !presetDraft) return;
    presetDraft.tried = true;
    if (renderPresetModal()) { presetModal.querySelector('[data-fb-prop="preset.name"]')?.focus(); return; }
    const field = findField(presetDraft.fieldId)?.field;
    if (!field) return;
    checkpoint();
    const preset = { id: uid("preset"), name: presetDraft.name.trim(), desc: presetDraft.desc.trim() || comp(field.type).desc, type: field.type, scope: presetDraft.scope, version: 1, createdAt: localStamp(), createdBy: currentUser(), field: presetSnapshot(field) };
    db.presets = [...(db.presets || []), preset];
    field.preset = { id: preset.id, version: 1 };
    presetDraft = null;
    window.__modal?.close?.("#fb-preset-modal");
    commit();
    renderLibrary();
    ui().showShellToast?.(`„${preset.name}” a fost salvată în Componente salvate.`, "success");
  });

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
    } else if (kind === "child") {
      const found = findChild(id);
      if (found) state.stepId = found.step.id;
      if (tab) state.tab = tab;
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
    if (isContainer(copy)) reidChildren(copy);
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

  /* ---- columns / block fields: add (a type, or a copy of a form field), move, duplicate, delete + undo */
  function addChild(containerId, type, index = null, { focus = true, from = null } = {}) {
    const container = fieldOrChild(containerId);
    if (!isContainer(container)) return null;
    const reason = childAllowed(container, from ? from.type : type);
    if (reason) { ui().showShellToast?.(reason, "error"); announce(reason); return null; }
    checkpoint();
    const inGrid = container.type === "grid";
    let child;
    if (from) {
      child = clone(from);
      ["rules", "preset", "published", "keyEdited", "editedAt", "editedBy", "changes", "dateRules", "editableAt"].forEach((key) => delete child[key]);
      child.id = uid(inGrid ? "col" : "bf");
      child.key = uniqueChildKey(container, from.key || camelKey(tr(from.label)));
      child.span = inGrid ? 12 : Number(from.span) || 12;
      if (inGrid) child.width = "auto";
      if (child.dataSource?.parentFieldId) child.dataSource.parentFieldId = "";
    } else child = makeChild(type, container);
    const list = kidsOf(container);
    const at = index == null ? list.length : Math.max(0, Math.min(index, list.length));
    list.splice(at, 0, child);
    state.sel = { kind: "child", id: child.id };
    state.tab = T_GEN;
    commit();
    announce(`${inGrid ? "Coloana" : "Câmpul"} „${fieldName(child)}” a fost adăugat${inGrid ? "ă" : ""} în „${fieldName(container)}”, poziția ${at + 1} din ${list.length}.`);
    if (focus) focusPanel('[data-fb-prop="label"], [data-fb-prop="text"]');
    return child;
  }
  function moveChild(id, delta, toIndex = null) {
    const found = findChild(id);
    if (!found) return false;
    const { list, index, container } = found;
    let to = toIndex == null ? index + delta : toIndex > index ? toIndex - 1 : toIndex;
    to = Math.max(0, Math.min(to, list.length - 1));
    if (to === index) { announce(delta < 0 ? "Este deja primul." : "Este deja ultimul."); return false; }
    checkpoint();
    const [child] = list.splice(index, 1);
    list.splice(to, 0, child);
    state.sel = { kind: "child", id };
    commit();
    announce(`„${fieldName(child)}” este acum pe poziția ${to + 1} din ${list.length} în „${fieldName(container)}”.`);
    return true;
  }
  function duplicateChild(id) {
    const found = findChild(id);
    if (!found) return;
    checkpoint();
    const copy = clone(found.child);
    copy.id = uid(found.container.type === "grid" ? "col" : "bf");
    if (isContainer(copy)) reidChildren(copy);
    copy.label = { ...copy.label, ro: `${tr(found.child.label)} (copie)` };
    copy.key = uniqueChildKey(found.container, found.child.key || camelKey(tr(copy.label)));
    found.list.splice(found.index + 1, 0, copy);
    state.sel = { kind: "child", id: copy.id };
    commit();
    announce(`„${fieldName(found.child)}” duplicat pe poziția ${found.index + 2}.`);
    focusChip(copy.id);
  }
  /* the field's delete pattern: no modal, „Anulează” in the toast (8 s); a rule that pointed at it
     (key / group / parent) shows as an error until it is fixed or the delete is undone */
  function deleteChild(id) {
    const found = findChild(id);
    if (!found) return;
    const { container, list, index, child } = found;
    const inGrid = container.type === "grid";
    checkpoint();
    const removed = clone(child);
    list.splice(index, 1);
    const next = list[index] || list[index - 1] || null;
    state.sel = next ? { kind: "child", id: next.id } : findChild(container.id) ? { kind: "child", id: container.id } : { kind: "field", id: container.id };
    if (!next) state.tab = T_DATA;
    commit();
    if (next) focusChip(next.id);
    const name = fieldName(child);
    announce(`${inGrid ? "Coloana" : "Câmpul"} „${name}” a fost ${inGrid ? "ștearsă" : "șters"}. Ctrl + Z ${inGrid ? "o" : "îl"} readuce.`);
    window.GEAPToast?.show({
      type: "info",
      message: `${inGrid ? "Coloana" : "Câmpul"} „${name}” a fost ${inGrid ? "ștearsă" : "șters"}.`,
      action: {
        label: "Anulează",
        onClick: () => {
          if (findChild(id)) return;
          const owner = fieldOrChild(container.id);
          if (!owner) return;
          checkpoint();
          kidsOf(owner).splice(Math.min(index, kidsOf(owner).length), 0, removed);
          state.sel = { kind: "child", id };
          commit();
          focusChip(id);
          announce(`„${name}” a fost readus.`);
        },
      },
      duration: document.documentElement.dataset.demoLink ? 0 : 8000,
      key: "fb-delete",
    });
  }
  function focusChip(id) {
    window.setTimeout(() => (el.canvas.querySelector(`[data-fb-child="${id}"]`) || el.panel.querySelector(`[data-fb-child-row="${id}"]`))?.focus({ preventScroll: false }), 20);
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
    if (found && isFixedWidth(found.field)) { announce("Componenta ocupă toată lățimea rândului."); return; }
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
    if (["span", "rows", "decimals", "maxFiles"].includes(prop)) value = Number(value);
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
    if (state.sel.kind === "child" && prop === "label" && state.lang === "ro" && !target.keyEdited) {
      const container = containerOf(target.id);
      if (container) target.key = uniqueChildKey(container, camelKey(value || comp(target.type).label), target.id);
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
    if (input.matches("[data-fb-cond-field]")) { const { cond } = ruleAt(input.dataset.fbCondField); checkpoint(); Object.assign(cond, { field: input.value, op: "", value: "", mode: "value", other: "" }); commit(); el.panel.querySelector(`#fb-co-${input.dataset.fbCondField.replace(".", "-")}`)?.focus(); return true; }
    if (input.matches("[data-fb-cond-op]")) { const { cond } = ruleAt(input.dataset.fbCondOp); checkpoint(); cond.op = input.value; if (NO_VALUE_OPS.includes(cond.op) || cond.op === "in") cond.value = ""; commit(); return true; }
    if (input.matches("[data-fb-cond-mode]")) { const { cond } = ruleAt(input.dataset.fbCondMode); checkpoint(); cond.mode = input.value; cond.value = ""; cond.other = ""; commit(); el.panel.querySelector(`#fb-cm-${input.dataset.fbCondMode.replace(".", "-")}`)?.focus(); return true; }
    if (input.matches("[data-fb-cond-other]")) { const { cond } = ruleAt(input.dataset.fbCondOther); checkpoint(); cond.other = input.value; commit(); return true; }
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

  /* ---- Reguli de dată edits (Validare of a Dată) */
  function onDateRuleEdit(input, typing) {
    const field = selectedTarget();
    const attr = ["op", "target", "unit", "offset"].find((name) => input.hasAttribute(`data-fb-date-rule-${name}`));
    if (!field || !attr) return false;
    const rule = field.dateRules?.[Number(input.getAttribute(`data-fb-date-rule-${attr}`))];
    if (!rule) return false;
    checkpoint(typing ? `${field.id}:date-rule:${attr}` : "");
    rule[attr] = attr === "offset" ? input.value.replace(/[^0-9-]/g, "") : input.value;
    commit();
    return true;
  }

  /* ------------------------------------------------------------ event wiring */
  el.panel.addEventListener("input", (event) => {
    const input = event.target;
    if (input.matches("[data-fb-date-rule-offset]")) { onDateRuleEdit(input, true); return; }
    if (input.matches("[data-fb-cond-value]") && input.tagName !== "SELECT") { onRuleEdit(input, true); return; }
    if (input.matches("[data-fb-option]")) { updateOption(Number(input.dataset.fbOption), { label: input.value }, true); return; }
    if (input.matches("[data-fb-test-input]")) return;
    if (input.matches("[data-fb-prop]") && input.type !== "checkbox" && input.tagName !== "SELECT") onPanelValue(input, { typing: true });
  });
  el.panel.addEventListener("change", (event) => {
    const input = event.target;
    if (input.tagName === "SELECT" || input.type === "checkbox") { if (onRuleEdit(input, false)) return; }
    if (input.tagName === "SELECT" && onDateRuleEdit(input, false)) return;
    if (input.matches("[data-contact-visible], [data-contact-required]")) {
      const field = selectedTarget();
      const key = input.dataset.contactVisible || input.dataset.contactRequired;
      checkpoint();
      field.contactParts = clone(field.contactParts || CONTACT_PARTS_DEFAULT);
      const part = field.contactParts[key] || (field.contactParts[key] = { visible: false, required: false });
      if (input.matches("[data-contact-visible]")) { part.visible = input.checked; if (!input.checked) part.required = false; } else part.required = input.checked;
      commit();
      el.panel.querySelector(`[data-contact-${input.matches("[data-contact-visible]") ? "visible" : "required"}="${key}"]`)?.focus();
      return;
    }
    if (input.matches("[data-fb-editable-at]")) {
      const field = selectedTarget();
      checkpoint();
      const set = new Set(field.editableAt || form.requestTypes || []);
      if (input.checked) set.add(input.dataset.fbEditableAt); else set.delete(input.dataset.fbEditableAt);
      field.editableAt = (form.requestTypes || []).filter((type) => set.has(type));
      commit();
      el.panel.querySelector(`[data-fb-editable-at="${CSS.escape(input.dataset.fbEditableAt)}"]`)?.focus();
      return;
    }
    if (input.matches("[data-fb-file-type]")) {
      const field = selectedTarget();
      checkpoint();
      const set = new Set(field.fileTypes || []);
      if (input.checked) set.add(input.dataset.fbFileType); else set.delete(input.dataset.fbFileType);
      field.fileTypes = FILE_TYPES.map(([value]) => value).filter((value) => set.has(value));
      commit();
      el.panel.querySelector(`[data-fb-file-type="${input.dataset.fbFileType}"]`)?.focus();
      return;
    }
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
    if (event.target.closest("[data-fb-date-rule-add]")) {
      const field = selectedTarget();
      checkpoint();
      field.dateRules = [...(field.dateRules || []), { id: uid("dr"), op: "le", target: "", offset: "", unit: "days" }];
      commit();
      el.panel.querySelector(`#fb-dr-target-${field.dateRules.length - 1}`)?.focus();
      return;
    }
    const dateRuleRemove = event.target.closest("[data-fb-date-rule-remove]");
    if (dateRuleRemove) {
      const field = selectedTarget();
      checkpoint();
      field.dateRules.splice(Number(dateRuleRemove.dataset.fbDateRuleRemove), 1);
      commit();
      el.panel.querySelector("[data-fb-date-rule-add]")?.focus();
      announce("Regula de dată a fost eliminată.");
      return;
    }
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
      target.rules = [...(target.rules || []), makeRule(target.type === "hidden" ? "set" : "show")];
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
    const presetAct = event.target.closest("[data-fb-preset-act]");
    if (presetAct) { presetAction(presetAct.dataset.fbPresetAct); return; }
    const goto = event.target.closest("[data-fb-goto]");
    if (goto) { const [kind, id, tab] = goto.dataset.fbGoto.split(":"); select(kind, id, { tab: tab || T_LOGIC }); return; }
    const stepRow = event.target.closest("[data-fb-step-row]");
    if (stepRow) { select("step", stepRow.dataset.fbStepRow); return; }
    const sectionRow = event.target.closest("[data-fb-section-row]");
    if (sectionRow) { select("section", sectionRow.dataset.fbSectionRow); return; }
    const childRow = event.target.closest("[data-fb-child-row]");
    if (childRow) { select("child", childRow.dataset.fbChildRow); return; }
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
    if (seg && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      const items = [...seg.parentElement.children].filter((item) => !item.disabled);
      if (!items.length) return;
      const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
      const next = items[(items.indexOf(seg) + (forward ? 1 : -1) + items.length) % items.length];
      event.preventDefault();
      next.click();
      return;
    }
    if (event.key === "Enter" && event.target.matches("[data-fb-test-input]")) { event.preventDefault(); runTest(); }
    const childRow = event.target.closest("[data-fb-child-row]");
    /* the list of a grid / block: Alt + ↑ / ↓ moves the row, the container stays selected */
    if (childRow && event.altKey && ["ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      const id = childRow.dataset.fbChildRow;
      const keep = { ...state.sel };
      const tab = state.tab;
      if (moveChild(id, event.key === "ArrowUp" ? -1 : 1)) { select(keep.kind, keep.id, { tab }); el.panel.querySelector(`[data-fb-child-row="${id}"]`)?.focus(); }
      return;
    }
    if (childRow && (event.key === "Delete" || event.key === "Backspace")) { event.preventDefault(); deleteChild(childRow.dataset.fbChildRow); }
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
      else if (act.dataset.fbAct === "save-preset") openPresetModal(id);
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
    const addKid = event.target.closest("[data-fb-add-child]");
    if (addKid) { if (addKid.getAttribute("aria-disabled") !== "true") addChild(addKid.dataset.container, addKid.dataset.fbAddChild); return true; }
    const addFrom = event.target.closest("[data-fb-add-child-from]");
    if (addFrom) { const source = findField(addFrom.dataset.fbAddChildFrom)?.field; if (source) addChild(addFrom.dataset.container, source.type, null, { from: source }); return true; }
    const kidAct = event.target.closest("[data-fb-child-act]");
    if (kidAct) {
      const id = kidAct.dataset.id;
      const act = kidAct.dataset.fbChildAct;
      if (act === "duplicate") duplicateChild(id);
      else if (act === "delete") deleteChild(id);
      else if (act === "up" || act === "down") { if (moveChild(id, act === "up" ? -1 : 1)) focusChip(id); }
      return true;
    }
    return false;
  }

  /* ---- canvas clicks */
  el.canvas.addEventListener("click", (event) => {
    if (runMenuAction(event)) return;
    if (event.target.closest("[data-stack-menu-trigger], [data-stack-menu]")) return;
    if (event.target.closest("[data-fb-add-section]")) { addSection(); return; }
    const chip = event.target.closest("[data-fb-child]");
    if (chip) { select("child", chip.dataset.fbChild); el.canvas.querySelector(`[data-fb-child="${chip.dataset.fbChild}"]`)?.focus({ preventScroll: true }); return; }
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
    const chipEl = event.target.matches?.("[data-fb-child]") ? event.target : null;
    if (chipEl) {
      const childId = chipEl.dataset.fbChild;
      const inGrid = containerOf(childId)?.type === "grid";
      const back = inGrid ? "ArrowLeft" : "ArrowUp";
      const forward = inGrid ? "ArrowRight" : "ArrowDown";
      if (event.altKey && (event.key === back || event.key === forward)) { event.preventDefault(); if (moveChild(childId, event.key === back ? -1 : 1)) focusChip(childId); return; }
      if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); deleteChild(childId); }
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
    if (item.dataset.fbPreset) insertPreset(item.dataset.fbPreset, "", null, { focus: false });
    else addField(type, "", null, { focus: false });
    el.library.querySelector(`[data-builder-component="${type}"]${item.dataset.fbPreset ? `[data-fb-preset="${item.dataset.fbPreset}"]` : ":not([data-fb-preset])"}`)?.focus();
  });
  el.search?.addEventListener("input", () => { state.query = el.search.value; renderLibrary(); });
  el.search?.closest(".search-input")?.querySelector(".btn-icon.clear")?.addEventListener("click", () => { state.query = ""; window.setTimeout(renderLibrary, 0); });

  /* ======================================================= drag and drop */
  /* 2026-10-14 (user: „when I select an element hover breaks”): a click with a few px of movement on a
     draggable card started a NATIVE drag session — the click was swallowed and, on a real Mac, the OS
     drag loop ate the mouseup and Chrome kept hover frozen until the next click. A dragend on a source
     that a drop had re-rendered (detached) also never reached the canvas listener. Now:
     - a card drags only from its tools row (grip + tags); its body is a plain click (select);
     - chips and palette items are their own handle: a „drag” shorter than DRAG_SLOP that changed
       nothing is handled as the click it was;
     - the drag ends from every path: dragend on the source itself (fires even when detached), drop
       anywhere (document, capture), a pointer move with no button held, Escape, window blur. */
  const DRAG_SLOP = 10;
  let drag = null;
  let press = null;
  const indicator = document.createElement("div");
  indicator.className = "e-permits-builder__drop-indicator";
  indicator.setAttribute("aria-hidden", "true");

  const endDrag = () => {
    drag = null;
    indicator.remove();
    builder.classList.remove("is-dragging-component");
    builder.querySelectorAll(".is-dragging, .is-drop-active").forEach((node) => node.classList.remove("is-dragging", "is-drop-active"));
    el.canvas.querySelectorAll('[data-builder-field][draggable="true"]').forEach((card) => { card.draggable = false; });
  };
  /* a drag that moved less than DRAG_SLOP and changed nothing = the click the user meant */
  const tinyDragAsClick = (record, event) => {
    if (!record || record.acted || !press) return;
    const x = event.clientX || 0;
    const y = event.clientY || 0;
    if ((x || y) && Math.hypot(x - press.x, y - press.y) > DRAG_SLOP) return;
    if (record.kind === "new") {
      const item = record.source.isConnected ? record.source : el.library.querySelector(`[data-builder-component="${record.type}"]${record.preset ? `[data-fb-preset="${record.preset}"]` : ":not([data-fb-preset])"}`);
      item?.click();
    } else if (record.kind === "child") {
      select("child", record.id);
      el.canvas.querySelector(`[data-fb-child="${record.id}"]`)?.focus({ preventScroll: true });
    } else if (record.kind === "move") {
      if (!(state.sel.kind === "field" && state.sel.id === record.id)) select("field", record.id);
      focusCard(record.id);
    }
  };
  const beginDrag = (record) => {
    drag = record;
    builder.classList.add("is-dragging-component");
    /* the source's own listener: it fires even when a drop has re-rendered (detached) the source */
    record.source.addEventListener("dragend", (event) => {
      const done = drag === record || !drag ? record : null;
      if (drag === record || !drag) endDrag();
      tinyDragAsClick(done, event);
    }, { once: true });
  };
  document.addEventListener("pointerdown", (event) => {
    press = { x: event.clientX, y: event.clientY };
    if (drag) endDrag();
  }, true);
  /* arm the card's native drag only from its tools row (never from a menu / button in it) */
  el.canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const card = event.target.closest?.("[data-builder-field]");
    if (!card) return;
    card.draggable = Boolean(event.target.closest(".e-permits-builder__field-tools") && !event.target.closest("button, a, [data-stack-menu]"));
  }, true);
  /* no native drag reports pointer events: one arriving with no button held means the drag is over */
  document.addEventListener("pointermove", (event) => { if (drag && event.buttons === 0 && event.isTrusted) endDrag(); }, true);
  document.addEventListener("pointerup", () => {
    if (drag && !drag.native) endDrag();
    el.canvas.querySelectorAll('[data-builder-field][draggable="true"]').forEach((card) => { if (!drag) card.draggable = false; });
  }, true);
  document.addEventListener("drop", (event) => { if (drag && !el.canvas.contains(event.target)) endDrag(); }, true);
  document.addEventListener("keydown", (event) => { if (drag && event.key === "Escape") endDrag(); }, true);
  window.addEventListener("blur", () => { if (drag?.native) return; if (drag) endDrag(); });

  el.library.addEventListener("dragstart", (event) => {
    const item = event.target.closest("[data-builder-component]");
    if (!item || item.getAttribute("aria-disabled") === "true") { event.preventDefault(); return; }
    beginDrag({ kind: "new", type: item.dataset.builderComponent, preset: item.dataset.fbPreset || "", source: item, native: event.isTrusted });
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/plain", drag.type);
  });
  el.canvas.addEventListener("dragstart", (event) => {
    const chip = event.target.closest?.("[data-fb-child]");
    if (chip) {
      const record = { kind: "child", id: chip.dataset.fbChild, container: chip.closest("[data-fb-subs]")?.dataset.fbSubs || "", source: chip, native: event.isTrusted };
      beginDrag(record);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", record.id);
      window.setTimeout(() => { if (drag === record) chip.classList.add("is-dragging"); }, 0);
      return;
    }
    const card = event.target.closest?.("[data-builder-field]");
    if (!card || !card.draggable) { event.preventDefault(); return; }
    const record = { kind: "move", id: card.dataset.id, span: Number(card.dataset.span), source: card, native: event.isTrusted };
    beginDrag(record);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", card.dataset.id);
    window.setTimeout(() => { if (drag === record) card.classList.add("is-dragging"); }, 0);
  });

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
  /* where a chip lands on a band: before the first chip (same line) whose middle is right of the pointer */
  function stripTarget(strip, x, y) {
    const chips = [...strip.querySelectorAll(":scope > [data-fb-child]")];
    const rects = chips.map((chip) => chip.getBoundingClientRect());
    const i = rects.findIndex((r) => y >= r.top - 6 && y <= r.bottom + 6 && x < r.left + r.width / 2);
    if (i >= 0) return { index: i, rect: rects[i], edge: "before" };
    const lastOnLine = rects.map((r, j) => ({ r, j })).filter(({ r }) => y >= r.top - 6 && y <= r.bottom + 6).pop();
    if (lastOnLine) return { index: lastOnLine.j + 1, rect: lastOnLine.r, edge: "after" };
    return chips.length ? { index: chips.length, rect: rects[rects.length - 1], edge: "after" } : { index: 0, rect: strip.querySelector(".e-permits-builder__sub-add")?.getBoundingClientRect(), edge: "before" };
  }
  function showStripIndicator(strip, target) {
    const box = strip.getBoundingClientRect();
    indicator.classList.remove("is-row");
    if (indicator.parentElement !== strip) strip.appendChild(indicator);
    const r = target.rect || box;
    indicator.style.left = `${Math.round((target.edge === "before" ? r.left - box.left - 6 : r.right - box.left + 2))}px`;
    indicator.style.top = `${Math.round(r.top - box.top)}px`;
    indicator.style.width = "4px";
    indicator.style.height = `${Math.round(r.height)}px`;
  }
  el.canvas.addEventListener("dragover", (event) => {
    if (!drag) return;
    const strip = event.target.closest("[data-fb-subs]");
    if (drag.kind === "child" || (strip && drag.kind === "new")) {
      const container = strip ? fieldOrChild(strip.dataset.fbSubs) : null;
      const allowed = strip && (drag.kind === "child" ? strip.dataset.fbSubs === drag.container : !drag.preset && drag.type !== "section" && !childAllowed(container, drag.type));
      if (!allowed) { event.dataTransfer.dropEffect = "none"; indicator.remove(); drag.target = null; return; }
      event.preventDefault();
      event.dataTransfer.dropEffect = drag.kind === "new" ? "copy" : "move";
      const target = stripTarget(strip, event.clientX, event.clientY);
      if (drag.kind === "child") {
        const found = findChild(drag.id);
        if (found && (target.index === found.index || target.index === found.index + 1)) { indicator.remove(); drag.target = null; return; }
      }
      drag.target = { strip: true, container: strip.dataset.fbSubs, index: target.index };
      showStripIndicator(strip, target);
      return;
    }
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
    if (current.target?.strip || current.target || current.kind === "new") current.acted = true;
    if (current.target?.strip) {
      if (current.kind === "new") addChild(current.target.container, current.type, current.target.index);
      else if (current.kind === "child" && moveChild(current.id, 0, current.target.index)) focusChip(current.id);
      return;
    }
    if (current.kind === "child") return;
    if (!sectionEl) return;
    if (current.kind === "new") {
      if (current.type === "section") { addSection(activeStep().id, sectionEl.dataset.sectionId); return; }
      const target = current.target || { sectionId: sectionEl.dataset.sectionId, index: null };
      if (current.preset) insertPreset(current.preset, target.sectionId, target.index);
      else addField(current.type, target.sectionId, target.index);
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
    const pointerId = event.pointerId;
    try { handle.setPointerCapture?.(pointerId); } catch { /* the pointer is already gone */ }
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
    /* ends on pointerup / pointercancel / a lost capture / window blur — once, capture released */
    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      window.removeEventListener("blur", stop);
      handle.removeEventListener("lostpointercapture", stop);
      try { if (handle.hasPointerCapture?.(pointerId)) handle.releasePointerCapture(pointerId); } catch { /* released */ }
      builder.classList.remove("is-field-resizing");
      card.classList.remove("is-resizing-field");
      if (span !== startSpan) { state.sel = { kind: "field", id }; setSpan(id, span); } else select("field", id);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    window.addEventListener("blur", stop);
    handle.addEventListener("lostpointercapture", stop);
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
    else if (kind === "child") { state.lang = "ro"; select("child", id, { tab }); }
    else { state.lang = "ro"; select("field", id, { tab }); }
    const cardId = kind === "child" ? findChild(id)?.top.id : id;
    const card = el.canvas.querySelector(`[data-builder-field][data-id="${cardId}"], [data-section-id="${id}"]`);
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
    const check = event.target.closest("[data-fb-preview-validate]");
    if (check) { if (check.getAttribute("aria-disabled") !== "true") validatePreview(); return; }
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
      /* a grid row being edited in the Preview (or its delete dialog): Esc is the grid's (js/fo-grid.js) */
      if (window.GEAPFoRepeat?.escape?.(event.target)) { event.preventDefault(); event.stopImmediatePropagation(); return; }
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
      const pointerId = event.pointerId;
      try { handle.setPointerCapture?.(pointerId); } catch { /* the pointer is already gone */ }
      builder.classList.add("is-resizing");
      const resize = (e) => {
        const box = el.workspace.getBoundingClientRect();
        if (side === "left") el.workspace.style.setProperty("--builder-left-width", `${Math.round(Math.min(Math.max(e.clientX - box.left, 260), Math.max(260, box.width - startRight - 560)))}px`);
        else el.workspace.style.setProperty("--builder-right-width", `${Math.round(Math.min(Math.max(box.right - e.clientX, 320), Math.max(320, box.width - startLeft - 560)))}px`);
      };
      /* ends on pointerup / pointercancel / a lost capture / window blur — once, capture released */
      let stopped = false;
      const stop = () => {
        if (stopped) return;
        stopped = true;
        builder.classList.remove("is-resizing");
        window.removeEventListener("pointermove", resize);
        window.removeEventListener("pointerup", stop);
        window.removeEventListener("pointercancel", stop);
        window.removeEventListener("blur", stop);
        handle.removeEventListener("lostpointercapture", stop);
        try { if (handle.hasPointerCapture?.(pointerId)) handle.releasePointerCapture(pointerId); } catch { /* released */ }
      };
      window.addEventListener("pointermove", resize);
      window.addEventListener("pointerup", stop);
      window.addEventListener("pointercancel", stop);
      window.addEventListener("blur", stop);
      handle.addEventListener("lostpointercapture", stop);
    });
  });

  /* =========================================================== start */
  async function load() {
    const stored = readDb();
    if (stored) {
      db = stored;
      /* a sandbox saved before a seed form existed: take that form from the seed */
      if (FORM_PARAM && !db.forms.some((item) => item.id === FORM_PARAM)) {
        try { const seed = await (await fetch("data/form-builder-db.json", { cache: "no-store" })).json(); const extra = seed.forms?.find((item) => item.id === FORM_PARAM); if (extra) db.forms.push(extra); } catch { /* offline: the active form opens */ }
      }
    } else {
      try {
        const response = await fetch("data/form-builder-db.json", { cache: "no-store" });
        db = response.ok ? await response.json() : null;
      } catch { db = null; }
    }
    form = sanitize(clone((FORM_PARAM && db?.forms?.find((item) => item.id === FORM_PARAM)) || db?.forms?.find((item) => item.id === db.activeFormId) || db?.forms?.[0]));
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
