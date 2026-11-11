/* =====================================================================================
   Administrare › Widgete (widget-v1, 2026-11-06) — Feature 96501 „Configurarea widget-urilor” (Epic 96497 Raportare
   și analiză). No child stories exist in Azure: built from the Feature text, split per the Traceability titles —
   US-403 crearea cu previzualizare · US-404 lista · US-405 editarea · US-406 publicarea · US-407 dezactivarea /
   activarea · US-408 istoricul versiunilor + restaurarea · US-409 agregarea datelor din sursa de date.

   A widget = an aggregated projection of ONE published data source (the KPI sources, window.GEAPKpi): type (11),
   optional KPI from the catalogue, measure + measured column, primary / secondary criterion, date grouping, category
   order, extra filter (the Registre rule builder), comparison period, format + threshold colours, default size,
   drill-down, visibility area. Lifecycle Ciornă → Publicat (version + 1 at each publication) → Dezactivat (nothing is
   deleted); versions are kept, compared and restored. Levels: Global (Administrator central) · Autoritate · Serviciu
   (an authority widget whose filter fixes one service).

   No new engine — the KPI / Registre patterns:
     · list = the BO registry (`window.GEAPShellRegistries.widgete`, menu `shellView: "widgete-registry"`);
     · profile = the shared profile panel (1280, the ntpl template editor): tabs Configurare (settings form 5fr + BIG
       sticky preview 7fr; read-only = passport blocks + preview) · Versiuni (GEAPEventTimeline „Versiuni publicate” +
       „Compară versiuni”) · Istoric (GEAPEventTimeline = the audit trail; every operation also goes to the unique
       Jurnalul de audit via GEAPEventTimeline.log, an entry opens its record);
     · „Widget nou” / „Clonează” = the create sheet (sheet-page-v1: the KPI create sheet on the editor page width, 5 steps,
       each form 5fr | preview 7fr); the first save opens the new widget's profile page;
     · a KPI from the catalogue works on every type (Feature 96501 rev 18);
     · publish / restore / version view = the library dialog (#case-action-modal via GEAPRegistre.openModal);
       deactivate = askConfirm (destructive);
     · charts = js/widget-charts.js (the eKYC SVG chart style, 11 types).
   New (components.md › „Widgete”): the chart-type gallery `.e-permits-wid-types`, the widget card head / states, the
   version comparison `.e-permits-wid-compare`, the chart types of js/widget-charts.js.
   Routes: #widgete (list) · #widget/<id>/<configurare|versiuni|istoric> · #widget/nou[/din-<id>].
   Demo switch ?widget= (comma list): fara-permisiune · gol · incarcare · eroare (every save fails) · eroare-date (the
   preview does not load) · supervizor (the Supervisor holds „Gestionarea widget-urilor”) · fara-acces (preview as a
   user without access to the source).
   ===================================================================================== */
(function () {
  "use strict";

  const A = () => window.GEAPShellApi || {};
  const U = () => window.GEAPUi || {};
  const G = () => window.GEAPRegistre || {};
  const E = () => window.GEAPEmptyState;
  const K = () => window.GEAPKpi || {};
  const CH = () => window.GEAPWidgetCharts || {};
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (name, size = 20) => `<svg class="icon${size === 16 ? " small" : ""}" width="${size}" height="${size}" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${name}"></use></svg>`;
  const tag = (label, tone = "neutral") => window.GEAPTag?.html(label, tone) || esc(label);
  const dash = '<span class="e-permits-workplace__dash">—</span>';
  const pad = (n) => String(n).padStart(2, "0");
  const RO_MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
  const RO_SHORT = ["ian.", "feb.", "mar.", "apr.", "mai", "iun.", "iul.", "aug.", "sept.", "oct.", "nov.", "dec."];
  const toDate = (v) => (v ? new Date(v) : null);
  const longDate = (v) => { const d = toDate(v); return d ? `${d.getDate()} ${RO_MONTHS[d.getMonth()]} ${d.getFullYear()}` : ""; };
  const time = (v) => { const d = toDate(v); return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : ""; };
  const nowIso = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
  const userName = () => A().currentUserName?.() || "Anastasia Cojocaru";
  const fold = (s) => String(s || "").normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("ro");
  const plural = (n, one, many) => `${n} ${n === 1 ? one : n % 100 >= 20 || (n % 100 === 0 && n) ? `de ${many}` : many}`;
  const toast = (message, type = "success") => (window.GEAPToast?.show ? window.GEAPToast.show({ type, message }) : U().showShellToast?.(message, type));
  const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
  const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const nf = (v, d = 0) => Number(v).toLocaleString("ro-MD", { minimumFractionDigits: d, maximumFractionDigits: d });
  const round1 = (v) => Math.round(v * 10) / 10;
  const getPath = (obj, path) => path.split(".").reduce((o, p) => (o == null ? o : o[p]), obj);
  const setPath = (obj, path, value) => { const parts = path.split("."); const last = parts.pop(); const target = parts.reduce((o, p) => o[p], obj); target[last] = value; };

  const KIND = "widgete";
  const NAV = "widgete";
  const TITLE = "Widgete";
  /* Feature 96501 AC (Feature 89940 wording) — word for word */
  const DENIED = "Nu ai permisiunea de a accesa această pagină.";
  const EMPTY_LIST = "Nu există widget-uri.";
  const NO_MATCH = "Nicio potrivire găsită.";
  const SAVE_FAILED = "Widget-ul nu a putut fi salvat.";
  const TITLE_MAX = 150;
  const TEXT_MAX = 500;

  /* ---- classifiers of the data model (Feature 96501 › Model de date) */
  const TYPES = [
    ["bars", "Bare", "Compară valorile pe categorii sau în timp."],
    ["stacked", "Bare suprapuse", "Împarte fiecare bară pe criteriul secundar."],
    ["line", "Linie sau arie", "Evoluția în timp, pe o coloană de dată."],
    ["pie", "Sectoare sau inel", "Ponderea fiecărei categorii în total."],
    ["aggTable", "Tabel agregat", "Valorile pe categorii, într-un tabel."],
    ["heatmap", "Hartă de căldură", "Două criterii, intensitatea pe culoare."],
    ["funnel", "Pâlnie", "Etapele unui parcurs, de la prima la ultima."],
    ["treemap", "Treemap", "Ponderile, ca suprafețe proporționale."],
    ["control", "Diagramă de control", "Media și limitele de control, în timp."],
    ["tile", "Plăcuță simplă", "O singură valoare, cu perioada de comparație."],
    ["rowTable", "Tabel cu filtru pe sursa de date", "Rândurile sursei care trec de filtru, fără grupare."]
  ];
  const typeLabel = (t) => TYPES.find(([k]) => k === t)?.[1] || "";
  const MEASURES = [["count", "Număr"], ["distinct", "Număr distinct"], ["sum", "Sumă"], ["avg", "Medie"], ["min", "Minim"], ["max", "Maxim"]];
  const DATE_GROUPS = [["day", "Zi"], ["week", "Săptămână"], ["month", "Lună"], ["quarter", "Trimestru"], ["year", "An"], ["weekday", "Ziua săptămânii"], ["hour", "Ora"]];
  const ORDERS = [["valueDesc", "După valoare descrescător"], ["valueAsc", "După valoare crescător"], ["source", "Ca în sursa de date"], ["alpha", "Alfabetic"]];
  const COMPARES = [["sameLastYear", "Aceeași perioadă a anului precedent"], ["prevMonth", "Luna precedentă"], ["prevWeek", "Săptămâna precedentă"], ["prevQuarter", "Trimestrul precedent"], ["prevSemester", "Semestrul precedent"], ["prevYear", "Anul precedent"], ["prevSameLength", "Perioada precedentă de aceeași lungime"]];
  const COMPARE_SHORT = { sameLastYear: "aceeași perioadă a anului precedent", prevMonth: "luna precedentă", prevWeek: "săptămâna precedentă", prevQuarter: "trimestrul precedent", prevSemester: "semestrul precedent", prevYear: "anul precedent", prevSameLength: "perioada precedentă" };
  const FORMATS = [["number", "Număr întreg"], ["decimal", "Număr cu o zecimală"], ["percent", "Procent din total"], ["duration", "Durată (zile)"], ["amount", "Sumă (MDL)"]];
  const WIDTHS = [["third", "O treime"], ["half", "Jumătate"], ["twoThirds", "Două treimi"], ["full", "Rând întreg"]];
  /* wid-heights-v1 (2026-11-11, proposal for the PO): two heights instead of Mică / Medie / Mare — „Compactă” = one dashboard
     row, „Înaltă” = two rows + the grid gap (two compact widgets stacked beside a tall one line up); the old values are
     still read (small / medium → compact, large → tall) */
  const HEIGHTS = [["compact", "Compactă"], ["tall", "Înaltă"]];
  const heightKey = (h) => (h === "tall" || h === "large" ? "tall" : "compact");
  /* wid-card-v2 (2026-11-11, user): a number tile („Plăcuță simplă”) has ONE height — Compactă */
  const heightOf = (cfg, h = cfg?.height) => (cfg?.type === "tile" ? "compact" : heightKey(h));
  const VIS = [
    ["role", "Strict aria de responsabilitate a rolului", "Fiecare utilizator vede doar dosarele din aria lui de responsabilitate."],
    ["subdivision", "Subdiviziune", "Utilizatorul vede datele subdiviziunii lui."],
    ["authority", "Autoritate", "Utilizatorul vede datele autorității lui."],
    ["global", "Global", "Toate datele, din toate autoritățile."]
  ];
  const BELOW = [["warning", "Portocaliu (avertizare)"], ["danger", "Roșu (critic)"]];
  /* „Culori” (chart-palette-v2, 2026-11-09, user: the admin chooses the graph colours from a limited, brand-harmonious
     range, one palette per widget) — the class `.e-permits-wid--pal-<key>` on the card re-defines series s1…s5 + the heat
     ramp (css/widget.css); s6 „Altele” and the KPI zones never change */
  /* chart-palette-v4 (2026-11-09, user: „more various, not just one colour range”): six CATEGORICAL palettes (five hue
     families each); the v2 single-hue keys are migrated (blue → default, sky → calm, mixed → intense, violet → warm,
     indigo → cool) */
  const PALETTES = [["default", "Implicită"], ["calm", "Calmă"], ["intense", "Intensă"], ["warm", "Caldă"], ["cool", "Rece"], ["neutral", "Neutră"]];
  const PAL_V2 = { blue: "default", sky: "calm", mixed: "intense", violet: "warm", indigo: "cool" };
  const palKey = (v) => { const k = PAL_V2[v?.palette] || v?.palette; return PALETTES.some(([key]) => key === k) ? k : "default"; };
  /* chart-status-v1: the widget's coloured dimension is a status (fixed colours, js/widget-charts.js STATUS_COLOURS) →
     „Culori” is disabled with the reason, the read-only rows say „După status” */
  const statusColours = (v) => {
    const W = window.GEAPWidgetCharts;
    if (!W?.isStatusDim || !v?.source) return false;
    return (["bars", "stacked", "pie", "treemap"].includes(v.type) && W.isStatusDim(v.source, v.primary)) || (["stacked", "line"].includes(v.type) && W.isStatusDim(v.source, v.secondary));
  };
  const swatches = (key) => `<span class="e-permits-wid-pal e-permits-wid--pal-${key}" aria-hidden="true">${[1, 2, 3, 4, 5].map((n) => `<span class="e-permits-wid-pal__swatch e-permits-wid-s${n}"></span>`).join("")}</span>`;
  const isPhone = () => Boolean(window.matchMedia?.("(max-width: 760px)").matches);
  const OPS = [["is", "este"], ["isNot", "nu este"], ["contains", "conține"], ["empty", "este gol"], ["notEmpty", "are valoare"]];
  const NO_VALUE = ["empty", "notEmpty"];
  const NUMERIC = ["number", "duration", "amount"];
  const label = (list, key) => list.find(([k]) => k === key)?.[1] || "";
  /* where each field applies (Feature model: „la …”) */
  const NEEDS_PRIMARY = (t) => !["tile", "rowTable"].includes(t);
  const SECONDARY = { heatmap: "required", stacked: "optional", line: "optional", aggTable: "optional" };
  const ORDERED = ["bars", "stacked", "pie", "funnel", "aggTable", "rowTable"];
  const DATE_AXIS = ["line", "control"];
  const STATUS_TONE = { "Ciornă": "neutral", "Publicat": "success", "Dezactivat": "neutral" };
  const EVENTS = {
    create: "Crearea widget-ului", clone: "Clonarea widget-ului", edit: "Modificarea widget-ului", publish: "Publicarea widget-ului",
    rejected: "Publicare respinsă", restore: "Restaurarea unei versiuni", on: "Activarea widget-ului", off: "Dezactivarea widget-ului",
    authOn: "Activat pentru autoritate", authOff: "Dezactivat pentru autoritate"
  };

  /* ---------------------------------------------------------------- demo switches + who */
  const params = new URLSearchParams(window.location.search);
  const demo = new Set(String(params.get("widget") || "").split(",").map((s) => s.trim()).filter(Boolean));
  function who() {
    const a = A().currentAssignment?.() || {};
    const central = a.roleId === "central-admin";
    const local = a.roleId === "local-admin";
    /* assumption: the role model (Feature 89940) can give „Gestionarea widget-urilor” to a Supervisor — ?widget=supervizor */
    const supervisor = a.roleId === "supervisor" && demo.has("supervizor");
    const has = (central || local || supervisor) && !demo.has("fara-permisiune");
    return { central, local, supervisor, has, authority: central ? null : a.authority || "ansp", subdivision: supervisor ? a.instanceLabel || "" : "", roleLabel: a.roleLabel || "", roleId: a.roleId || "" };
  }
  const authName = (id) => ({ ansp: "ANSP", anta: "ANTA" }[id] || String(id || "").toUpperCase());
  /* Feature 96501 rev 18: the actor is „a user with «Gestionarea widget-urilor»” at its authority level — never a role
     name the Feature does not use; the journal keeps the signed-in role's own label */
  const roleLabel = () => { const w = who(); return w.central ? w.roleLabel || "Administrator central" : `${w.supervisor ? w.roleLabel || "Supervizor" : "Utilizator cu permisiunea «Gestionarea widget-urilor»"} · ${authName(w.authority)}`; };

  /* ---------------------------------------------------------------- data */
  const S = { data: null, loading: null };
  function load() {
    if (S.data) return Promise.resolve(S.data);
    if (demo.has("incarcare")) return new Promise(() => {});
    if (!S.loading) {
      S.loading = Promise.all([
        fetch("data/widgets.json?v=wid-heights-v2").then((r) => r.json()),
        K().load ? K().load() : Promise.resolve(null)
      ]).then(([json]) => {
        if (demo.has("gol")) json.widgets = [];
        /* ?tablou=kpi3 (demo dsh-04q): two more published number tiles so a row of three KPIs can be shown (Dosare examinate, Acte emise) */
        if (new URLSearchParams(window.location.search).get("tablou")?.split(",").includes("kpi3")) {
          const tile = (id, ro, sub, source) => ({ id, level: "Global", status: "Publicat", createdAt: "2026-10-03T10:00:00", createdBy: "Anastasia Cojocaru", updatedAt: "2026-10-03T10:25:00", updatedBy: "Anastasia Cojocaru",
            config: { titles: { ro, ru: "", en: "" }, subtitles: { ro: sub, ru: "", en: "" }, source, type: "tile", kpi: "", measure: "count", column: "", primary: "", secondary: "", dateGroup: "", order: "source", filter: { logic: "and", rules: [] }, compare: "prevMonth", format: "number", threshold: { on: false, value: "", below: "warning" }, width: "third", height: "compact", drill: true, visibility: "authority" },
            versions: [{ nr: 1, version: 1, type: "Prima publicare", note: "Plăcuță KPI.", at: "2026-10-03T10:25:00", by: "Anastasia Cojocaru" }], history: [] });
          json.widgets.push(tile("WGT-0015", "Dosare examinate", "Dosarele examinate în luna curentă", "reg-dosare"), tile("WGT-0016", "Acte emise", "Actele emise în luna curentă", "reg-acte"));
        }
        json.widgets.forEach((w) => {
          w.offFor = w.offFor || [];
          w.history = w.history || [];
          w.versions = (w.versions || []).map((v) => ({ ...v, config: v.config || clone(w.config) }));
          /* a configuration saved before „Culori” reads as the default palette */
          [w.config, ...w.versions.map((v) => v.config)].forEach((c) => { c.palette = palKey(c); c.height = heightOf(c); });
        });
        S.data = json;
        return json;
      }).catch(() => { S.data = { widgets: [] }; return S.data; });
    }
    return S.loading;
  }
  const D = () => S.data || { widgets: [] };
  const all = () => D().widgets;
  const widgetOf = (id) => all().find((w) => w.id === id) || null;
  const visible = (w, me = who()) => me.central || w.level === "Global" || w.authority === me.authority;
  const widgets = () => (who().has ? all().filter((w) => visible(w)) : []);
  const sources = () => K().sources?.() || [];
  const sourceOf = (id) => sources().find((s) => s.id === id) || null;
  const sourceName = (id) => sourceOf(id)?.name || "";
  const fieldsOf = (id) => (id ? K().fields?.(id) || [] : []);
  const fieldOf = (src, key) => fieldsOf(src).find((f) => f.key === key) || null;
  const kpiOf = (id) => (id ? K().get?.(id) || null : null);
  const kpisFor = (src) => (K().list?.() || []).filter((k) => k.source === src && k.status === "Activ");
  const lastVersion = (w) => w.versions[w.versions.length - 1] || null;
  const unpublished = (w) => Boolean(lastVersion(w)) && !same(w.config, lastVersion(w).config);
  const isOffFor = (w, authId) => Boolean(authId) && w.offFor.includes(authId);
  const levelText = (w) => (w.level === "Global" ? "Global" : w.level === "Serviciu" ? `Serviciu · ${w.service}` : `Autoritate · ${authName(w.authority)}`);

  /* ---------------------------------------------------------------- permissions per widget (Feature AC W2) */
  const canCreate = () => who().has;
  const canEdit = (w) => { const me = who(); return me.has && !!w && (me.central || (w.level !== "Global" && w.authority === me.authority)); };
  const canAuth = (w) => { const me = who(); return me.has && !me.central && !!w && w.level === "Global"; };

  /* ---------------------------------------------------------------- the visibility a role may give (W14) */
  function visOptions(me = who()) {
    const reach = me.central ? 4 : me.supervisor ? 2 : 3;
    return VIS.map(([key, text, desc], i) => ({
      key, text, desc,
      disabled: i >= reach,
      reason: i >= reach ? (key === "global" ? "Doar Administratorul central dă widget-urilor aria globală." : `Depășește perimetrul rolului tău (${me.subdivision || authName(me.authority)}).`) : ""
    }));
  }
  const defaultVis = (me = who()) => (me.supervisor ? "subdivision" : "authority");
  /* the data the author previews: his own perimeter (Feature: „îl previzualizează pe date reale, în perimetrul lui”) */
  const perimeter = (me = who()) => (me.central ? { scope: "all", text: "toate autoritățile" } : me.supervisor ? { scope: "subdivision", text: `${me.subdivision}, ${authName(me.authority)}` } : { scope: "authority", text: authName(me.authority) });

  /* ================================================================ compatibility + validation (W5) */
  const blankConfig = () => ({
    titles: { ro: "", ru: "", en: "" }, subtitles: { ro: "", ru: "", en: "" }, source: "", type: "", kpi: "", measure: "count", column: "",
    primary: "", secondary: "", dateGroup: "", order: "source", filter: { logic: "and", rules: [] }, compare: "",
    format: "number", threshold: { on: false, value: "", below: "warning" }, width: "half", height: "compact", palette: "default", drill: true, visibility: defaultVis()
  });
  const dateCols = (src) => fieldsOf(src).filter((f) => f.type === "date");
  const catCols = (src) => fieldsOf(src).filter((f) => f.type === "enum" || f.type === "date");
  const isDate = (src, key) => fieldOf(src, key)?.type === "date";
  const needsDateGroup = (v) => (NEEDS_PRIMARY(v.type) && isDate(v.source, v.primary)) || (SECONDARY[v.type] && isDate(v.source, v.secondary));
  const usesMeasure = (v) => !v.kpi && v.type !== "rowTable";
  const usesColumn = (v) => usesMeasure(v) && v.measure && v.measure !== "count";
  /* why a type cannot be chosen now (the gallery's disabled reason) */
  function typeProblem(type, v) {
    if (!v.source) return "";
    if ((DATE_AXIS.includes(type) || type === "heatmap") && !dateCols(v.source).length) return "Sursa nu are o coloană de dată.";
    return "";
  }
  function measureColumns(v) {
    const fields = fieldsOf(v.source);
    if (v.measure === "distinct") return fields.filter((f) => f.type !== "date");
    if (["sum", "avg"].includes(v.measure)) return fields.filter((f) => NUMERIC.includes(f.type));
    return fields.filter((f) => NUMERIC.includes(f.type) || f.type === "date");
  }
  /* the errors of one or more steps — the same rules block „Continuă”, „Salvează ciorna” (step 1) and „Publică” */
  function validate(v, { steps = [1, 2, 3, 4] } = {}) {
    const e = {};
    if (steps.includes(1)) {
      if (!String(v.titles.ro || "").trim()) e["titles.ro"] = "Completează titlul în limba română.";
      else if (v.titles.ro.length > TITLE_MAX) e["titles.ro"] = `Titlul poate avea cel mult ${TITLE_MAX} de caractere.`;
      if (!v.source) e.source = "Alege sursa de date.";
    }
    if (steps.includes(2)) {
      if (!v.type) e.type = "Alege tipul widget-ului.";
      else if (typeProblem(v.type, v)) e.type = `${typeLabel(v.type)}: ${typeProblem(v.type, v).toLocaleLowerCase("ro")}`;
      if (v.kpi && kpiOf(v.kpi)?.source !== v.source) e.kpi = "KPI-ul folosește altă sursă de date decât widget-ul.";
    }
    if (steps.includes(3) && v.type) {
      if (usesMeasure(v)) {
        if (!v.measure) e.measure = "Alege ce se măsoară.";
        else if (usesColumn(v)) {
          if (!v.column) e.column = "Alege coloana măsurată.";
          /* Feature: „suma se calculează doar pe o coloană numerică” */
          else if (!measureColumns(v).some((f) => f.key === v.column)) e.column = ["sum", "avg"].includes(v.measure) ? "Suma și media se calculează doar pe o coloană numerică sau de durată." : "Coloana nu se potrivește cu măsura aleasă.";
        }
      }
      if (NEEDS_PRIMARY(v.type)) {
        if (!v.primary) e.primary = "Alege criteriul principal.";
        /* Feature: „graficul cu linie cere o coloană de dată pe axă”; diagrama de control = o coloană de dată */
        else if (DATE_AXIS.includes(v.type) && !isDate(v.source, v.primary)) e.primary = `${typeLabel(v.type)} cere o coloană de dată pe axă.`;
      }
      if (SECONDARY[v.type] === "required" && !v.secondary) e.secondary = "Harta de căldură cere și criteriul secundar.";
      else if (v.secondary && v.secondary === v.primary) e.secondary = "Criteriul secundar trebuie să fie altă coloană decât cel principal.";
      if (needsDateGroup(v) && !v.dateGroup) e.dateGroup = "Alege gruparea datei.";
      (v.filter.rules || []).forEach((r, i) => {
        if (!r.column) e[`rule.${i}`] = "Alege coloana.";
        else if (!NO_VALUE.includes(r.op) && !String(r.value || "").trim()) e[`rule.${i}`] = "Completează valoarea.";
        else if (!fieldOf(v.source, r.column)) e[`rule.${i}`] = "Coloana nu există în sursa aleasă.";
      });
      if (v.type === "rowTable" && !(v.filter.rules || []).length) e.filter = "Tabelul cu filtru cere cel puțin o condiție.";
    }
    if (steps.includes(4)) {
      if (!v.kpi && v.threshold.on) {
        const t = Number(String(v.threshold.value).replace(",", "."));
        if (v.threshold.value === "" || Number.isNaN(t) || t < 0) e["threshold.value"] = "Introdu pragul, un număr pozitiv.";
      }
      if (!v.visibility) e.visibility = "Alege aria de vizibilitate.";
      else if (visOptions().find((o) => o.key === v.visibility)?.disabled) e.visibility = "Aria aleasă depășește perimetrul rolului tău";
    }
    return e;
  }
  const STEP_OF = (key) => (/^(titles|subtitles|source)/.test(key) ? 1 : /^(type|kpi)$/.test(key) ? 2 : /^(threshold|visibility|width|height|format)/.test(key) ? 4 : 3);
  /* what blocks a publication (Feature AC): required fields, a compatible combination, a preview that loads */
  function publishProblems(v) {
    const e = validate(v);
    const out = Object.entries(e).map(([key, msg]) => (key.startsWith("rule.") ? `Filtru suplimentar: ${msg.toLocaleLowerCase("ro")}` : msg));
    if (!String(v.titles.ru || "").trim()) out.push("Completează titlul în limba rusă: este obligatoriu la publicare.");
    if (!String(v.titles.en || "").trim()) out.push("Completează titlul în limba engleză: este obligatoriu la publicare.");
    if (!out.length && demo.has("eroare-date")) out.push("Previzualizarea nu se încarcă: sursa de date nu a răspuns. Apasă din nou „Actualizează”.");
    return [...new Set(out)];
  }

  /* ================================================================ aggregation on the source (US-409) — deterministic mock */
  const SCALE = { all: 1, authority: 0.42, subdivision: 0.13 };
  function dateLabels(group) {
    const today = new Date(`${(K().calculatedAt?.() || "2026-11-06T06:00:00").slice(0, 10)}T00:00:00`);
    switch (group) {
      case "day": return Array.from({ length: 14 }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() - 13 + i); return `${d.getDate()} ${RO_SHORT[d.getMonth()]}`; });
      case "week": return Array.from({ length: 8 }, (_, i) => `săpt. ${38 + i}`);
      case "quarter": return ["T3 2025", "T4 2025", "T1 2026", "T2 2026", "T3 2026", "T4 2026"];
      case "year": return ["2022", "2023", "2024", "2025", "2026"];
      case "weekday": return ["Luni", "Marți", "Miercuri", "Joi", "Vineri"];
      case "hour": return ["08:00", "10:00", "12:00", "14:00", "16:00"];
      default: return Array.from({ length: 12 }, (_, i) => { const d = new Date(today.getFullYear(), today.getMonth() - 11 + i, 1); return `${RO_SHORT[d.getMonth()]} ${d.getFullYear()}`; });
    }
  }
  /* the categories of a criterion inside the perimeter: an author never sees more than his role allows */
  function categoriesOf(v, key, per, me, { columns = false } = {}) {
    const f = fieldOf(v.source, key);
    if (!f) return [];
    /* a heat map's date columns: the last 6 periods, months without the year (the width of a dashboard cell) */
    if (f.type === "date") return dateLabels(v.dateGroup || "month").slice(columns ? -6 : 0).map((l) => ({ key: l, label: columns && (v.dateGroup || "month") === "month" ? l.split(" ")[0] : l }));
    let values = f.values || [];
    if (key === "autoritate" && per.scope !== "all") values = values.filter((x) => x === authName(me.authority));
    if (key === "subdiviziune" && per.scope === "subdivision") values = values.filter((x) => x === me.subdivision);
    return values.map((x) => ({ key: x, label: x }));
  }
  function formatOf(v) {
    const k = kpiOf(v.kpi);
    if (k) return k.format === "percent" ? "percent" : k.format === "duration" ? "duration" : k.format === "amount" ? "amount" : "number";
    return v.format || "number";
  }
  function fmtFn(v, total) {
    const k = kpiOf(v.kpi);
    if (k) return (x) => (x === null || x === undefined ? "n/a" : K().format(k.id, x));
    const f = formatOf(v);
    if (f === "percent") return (x) => `${nf(total ? (x / total) * 100 : 0, 1)}%`;
    if (f === "decimal") return (x) => nf(x, 1);
    if (f === "duration") return (x) => `${nf(x, 1)} zile`;
    if (f === "amount") return (x) => `${nf(Math.round(x))} MDL`;
    return (x) => nf(Math.round(x));
  }
  function baseValue(v, seed) {
    const h = hash(seed);
    if (kpiOf(v.kpi)) return null;
    if (["avg", "min", "max"].includes(v.measure)) { const base = v.measure === "min" ? 1 : v.measure === "max" ? 18 : 5; return round1(base + (h % 70) / 10); }
    if (v.measure === "sum") return 18000 + (h % 380000);
    if (v.measure === "distinct") return 3 + (h % 40);
    return 40 + (h % 560);
  }
  function aggregate(v, me = who()) {
    const per = perimeter(me);
    const scale = SCALE[per.scope] || 1;
    const k = kpiOf(v.kpi);
    const filterFactor = (v.filter.rules || []).reduce((acc, r, i) => acc * (0.3 + (hash(`${r.column}${r.op}${r.value}${i}`) % 50) / 100), 1);
    const avgLike = k || ["avg", "min", "max"].includes(v.measure);
    const val = (seed) => {
      const b = baseValue(v, `${v.source}|${v.measure}|${v.column}|${seed}`);
      return avgLike ? b : Math.max(0, Math.round(b * scale * filterFactor));
    };
    const kpiVal = (seed, i, n) => {
      const series = K().series?.(k.id, per.scope === "all" ? "all" : me.authority) || [];
      const fromSeries = series.length ? series[Math.max(0, series.length - n + i)]?.value : null;
      const base = fromSeries ?? K().value?.(k.id)?.cur ?? 0;
      const swing = ((hash(seed) % 13) - 6) / 100;
      return k.format === "percent" ? Math.min(100, round1(base * (1 + swing))) : k.format === "number" || k.format === "amount" ? Math.round(base * (1 + swing)) : round1(base * (1 + swing));
    };
    const prevOf = (x, seed) => (x === null ? null : avgLike ? round1(x * (0.9 + (hash(`p${seed}`) % 22) / 100)) : Math.round(x * (0.84 + (hash(`p${seed}`) % 30) / 100)));
    const model = { type: v.type, drill: Boolean(v.drill), height: heightKey(v.height), measureLabel: k ? k.names.ro : measureText(v), axisLabel: fieldOf(v.source, v.primary)?.label || "", caption: v.titles.ro, series: [], cats: [] };
    /* KPI from the catalogue: value, format, target and zones come from the KPI (Feature AC) */
    if (k) {
      const t = K().target?.(k.id, per.scope === "all" ? null : me.authority);
      if (t && t.target !== null && t.target !== undefined && t.target !== "") model.target = { value: Number(t.target), label: `Ținta ${K().format(k.id, Number(t.target))} · ${k.names.ro}` };
      const authority = per.scope === "all" ? null : me.authority;
      model.tone = (x) => ({ favorabil: "success", avertizare: "warning", critic: "danger" }[K().zone?.(k.id, x, authority)] || null);
      model.zones = model.target ? [["Favorabil", "success"], ["Avertizare", "warning"], ["Critic", "danger"]] : null;
      /* Feature rev 18: a KPI on any type — its overall value (tables / sectors / heat map … show it next to „Ținta”) */
      model.kpi = true;
      model.kpiCurrent = K().value?.(k.id, per.scope === "all" ? "all" : me.authority)?.cur ?? null;
    } else if (v.threshold?.on && v.threshold.value !== "") {
      const th = Number(String(v.threshold.value).replace(",", "."));
      model.tone = (x) => (x >= th ? "success" : v.threshold.below);
      const show = fmtFn(v, 0);
      model.zones = [[`de la ${formatOf(v) === "percent" ? `${nf(th)}%` : show(th)}`, "success"], [`sub ${formatOf(v) === "percent" ? `${nf(th)}%` : show(th)}`, v.threshold.below]];
    }
    if (v.type === "tile") {
      const cur = k ? (K().value?.(k.id, per.scope === "all" ? "all" : me.authority)?.cur ?? null) : val("tile");
      const prev = k ? (K().value?.(k.id, per.scope === "all" ? "all" : me.authority)?.prev ?? null) : prevOf(cur, "tile");
      model.fmt = fmtFn(v, 0);
      /* wid-card-v2: compact only (no sparkline); the delta = a Small tag „+4,3%” + the tertiary line „față de … (2.190)” */
      model.height = "compact";
      model.single = { value: cur, delta: v.compare && cur !== null && prev ? { up: cur >= prev, pct: nf(Math.abs(((cur - prev) / prev) * 100), 1), text: `față de ${COMPARE_SHORT[v.compare]} (${model.fmt(prev)})` } : null };
      return model;
    }
    if (v.type === "rowTable") {
      /* the record number, the filtered columns, the other first enums, one date — at most 5 columns */
      const fl = fieldsOf(v.source);
      const filtered = (v.filter.rules || []).map((r) => fieldOf(v.source, r.column)).filter(Boolean);
      const f = [...new Map([fl.find((x) => x.type === "text"), ...filtered, ...fl.filter((x) => x.type === "enum"), fl.find((x) => x.type === "date")].filter(Boolean).map((x) => [x.key, x])).values()];
      const date = f.find((x) => x.type === "date");
      f.splice(4);
      if (date && !f.includes(date)) f.push(date);
      const fixed = Object.fromEntries((v.filter.rules || []).filter((r) => r.op === "is").map((r) => [r.column, r.value]));
      model.columns = f.map((x) => x.label);
      const n = Math.max(3, Math.min(8, Math.round(6 * scale * 2)));
      model.rows = Array.from({ length: n }, (_, i) => f.map((x) => {
        if (fixed[x.key]) return fixed[x.key];
        if (x.type === "text") return `${x.key === "nr" ? "D" : ""}${2026}-${pad(10 + (i % 2))}-${String(4100 + ((hash(`${v.source}${i}`) % 900))).padStart(5, "0")}`;
        if (x.type === "enum") { const vals = x.key === "autoritate" && per.scope !== "all" ? [authName(me.authority)] : x.values; return vals[hash(`${x.key}${i}`) % vals.length]; }
        if (x.type === "date") return `${(hash(`${x.key}${i}`) % 27) + 1} ${RO_MONTHS[9 + (i % 2)]} 2026`;
        return "—";
      }));
      model.fmt = k ? fmtFn(v, 0) : (x) => String(x);
      return model;
    }
    const prim = categoriesOf(v, v.primary, per, me);
    const sec = SECONDARY[v.type] && v.secondary ? categoriesOf(v, v.secondary, per, me, { columns: v.type === "heatmap" }) : [];
    model.dateAxis = isDate(v.source, v.primary);
    model.series = sec.map((s) => ({ key: s.key, label: s.label }));
    /* a time axis is one level moving ±15 % per period (not independent draws); the control chart has one spike */
    const timeVal = (seed, key, i) => {
      const level = val(seed);
      const f = 0.85 + (hash(`t${key}`) % 30) / 100 * (v.type === "control" && i === prim.length - 4 ? 0 : 1) + (v.type === "control" && i === prim.length - 4 ? 0.62 : 0);
      return avgLike ? round1(level * f) : Math.round(level * f);
    };
    let cats = prim.map((c, i) => {
      const parts = sec.map((s, j) => ({ key: s.key, value: k ? kpiVal(`${c.key}|${s.key}`, i, prim.length) : model.dateAxis ? timeVal(`series|${s.key}|${j}`, c.key, i) : val(`${c.key}|${s.key}|${j}`) }));
      const value = k ? kpiVal(c.key, i, prim.length) : sec.length && !avgLike ? parts.reduce((a, p) => a + p.value, 0) : model.dateAxis ? timeVal("series", c.key, i) : val(c.key);
      return { key: c.key, label: c.label, value, prev: prevOf(value, c.key), parts };
    });
    /* a KPI split by the secondary criterion (Bare suprapuse): the segments share the category's KPI value — a rate is
       never summed across segments */
    if (k && v.type === "stacked") cats.forEach((c) => { const sum = c.parts.reduce((a, p) => a + (p.value || 0), 0); if (sum && c.value !== null) c.parts = c.parts.map((p) => ({ ...p, value: round1((c.value * p.value) / sum) })); });
    /* Pâlnie: each stage keeps a part of the one before (a parcours, not independent counts) */
    if (v.type === "funnel") { let last = null; cats = cats.map((c, i) => { const value = i === 0 ? c.value : Math.round(last * (0.55 + (hash(`f${c.key}`) % 35) / 100)); last = value; return { ...c, value }; }); }
    /* Ordinea categoriilor — never on a date axis */
    if (ORDERED.includes(v.type) && !model.dateAxis) {
      const total = (c) => c.value;
      if (v.order === "valueDesc" && v.type !== "funnel") cats.sort((a, b) => total(b) - total(a));
      else if (v.order === "valueAsc" && v.type !== "funnel") cats.sort((a, b) => total(a) - total(b));
      else if (v.order === "alpha") cats.sort((a, b) => a.label.localeCompare(b.label, "ro"));
    }
    model.cats = cats;
    /* Status dimensions = fixed colours (chart-status-v1): the categories (bars / sectors / treemap) and the series (stacked,
       lines) of a status field take the value's fixed colour; other fields keep the palette */
    const W = window.GEAPWidgetCharts;
    if (W?.isStatusDim?.(v.source, v.primary) && ["bars", "stacked", "pie", "treemap"].includes(v.type)) model.catStatus = cats.map((c) => W.statusClass(v.source, v.primary, c.label));
    if (W?.isStatusDim?.(v.source, v.secondary) && model.series.length) model.seriesStatus = model.series.map((s) => W.statusClass(v.source, v.secondary, s.label));
    const grand = cats.reduce((a, c) => a + (c.value || 0), 0);
    model.fmt = fmtFn(v, grand);
    if (v.type === "control") {
      const vals = cats.map((c) => c.value);
      const mean = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
      const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (vals.length || 1)) || mean * 0.08;
      const lim = { mean: round1(mean), ucl: round1(mean + 2 * sd), lcl: round1(Math.max(0, mean - 2 * sd)) };
      lim.out = vals.filter((x) => x > lim.ucl || x < lim.lcl).length;
      model.limits = lim;
    }
    model.compareLabel = v.compare ? `Față de ${COMPARE_SHORT[v.compare]}` : "";
    model.compareTotal = v.compare && !avgLike ? { cur: grand, prev: cats.reduce((a, c) => a + (c.prev || 0), 0) } : null;
    return model;
  }
  /* the KPI target as the widget shows it (Feature rev 18: „Ținta”, the target value, the KPI name) */
  const kpiTargetText = (v, me = who()) => {
    const k = kpiOf(v.kpi);
    if (!k) return "";
    const t = K().target?.(k.id, me.central ? null : me.authority);
    return t && t.target !== null && t.target !== undefined && t.target !== "" ? K().format(k.id, Number(t.target)) : "fără țintă";
  };
  const measureText = (v) => {
    if (kpiOf(v.kpi)) return `KPI ${kpiOf(v.kpi).code} · ${kpiOf(v.kpi).names.ro}`;
    if (!v.measure) return "";
    return v.measure === "count" ? "Număr de înregistrări" : `${label(MEASURES, v.measure)} · ${fieldOf(v.source, v.column)?.label || "—"}`;
  };

  /* ================================================================ the widget card (preview, as on a dashboard) */
  /* what the preview misses, in the order of the form (Plane „Configure widget”: the preview says what is missing) */
  function missingOf(v) {
    if (!v.source) return ["Alege sursa de date", "Previzualizarea folosește datele reale ale sursei, în perimetrul tău."];
    if (!v.type) return ["Alege tipul widget-ului", "Previzualizarea apare imediat ce alegi un tip."];
    const e = validate(v, { steps: [2, 3] });
    const key = Object.keys(e)[0];
    if (!key) return null;
    const title = { primary: "Lipsește criteriul principal", secondary: "Lipsește criteriul secundar", column: "Lipsește coloana măsurată", measure: "Lipsește măsura", dateGroup: "Lipsește gruparea datei", type: "Tipul nu se potrivește", kpi: "KPI-ul nu se potrivește", filter: "Lipsește filtrul" }[key] || "Configurarea este incompletă";
    return [title, e[key]];
  }
  /* `natural: true` = the card at its content height (the „Mărește” / „Vezi tot” dialog); else the fixed height of its
     „Înălțime” (css/widget.css, desktop only — phones always natural) */
  /* dsh-view-v1 (the BO „Tablou de bord” page, js/dashboard-admin.js): `st.bodyHtml` replaces the body (one widget's data
     error, the others keep loading — Feature 96498), `ariaLabel` names the card outside the preview */
  function cardHtml(v, { st = {}, me = who(), compact = false, natural = false, ariaLabel = "" } = {}) {
    const title = v.titles.ro || "Titlul widget-ului";
    const hk = heightOf(v);
    const stat = v.type === "tile";
    /* wid-card-v2 (2026-11-11, user: Metronic cards): head = ONE row — title (1 line + tooltip) + „ⓘ” (the description in the
       Small hint tooltip, Grafana panel; none when empty); charts get a divider under the head, the number tile has none */
    const desc = String(v.subtitles?.ro || "").trim();
    const info = desc ? `<button class="e-permits-fo-role-info e-permits-wid-card__info" type="button" aria-label="Despre widget-ul „${esc(title)}”" data-tooltip-hint="${esc(desc)}">${icon("circle-info-filled", 16)}</button>` : "";
    const head = `
      <div class="e-permits-wid-card__head">
        <div class="e-permits-wid-card__title-row"><p class="e-permits-wid-card__title" data-cell-tooltip="${esc(title)}">${esc(title)}</p>${info}</div>
      </div>`;
    let body;
    const missing = missingOf(v);
    if (missing) body = E()?.render({ title: missing[0], text: missing[1], icon: "chart", compact: true, bare: true }) || "";
    else if (st.bodyHtml) body = st.bodyHtml;
    else if (st.refreshing) body = `<div class="e-permits-wid-card__loading" aria-hidden="true"><span class="skeleton skeleton--block e-permits-wid-plot--${hk}"></span><span class="skeleton skeleton--text"></span></div><p class="u-visually-hidden" role="status">Se actualizează datele widget-ului…</p>`;
    else if (demo.has("eroare-date")) body = E()?.render({ title: "Datele nu s-au încărcat", text: "Sursa de date nu a răspuns. Apasă din nou „Actualizează”: un widget se publică doar dacă se încarcă fără eroare.", icon: "warning-filled", compact: true, bare: true }) || "";
    else {
      const m = aggregate(v, me);
      if (st.noAccess) m.drill = false;
      body = CH().render?.(m) || "";
      const foot = [
        m.compareTotal && m.compareTotal.prev ? `${m.compareTotal.cur >= m.compareTotal.prev ? "▲" : "▼"} ${nf(Math.abs(((m.compareTotal.cur - m.compareTotal.prev) / m.compareTotal.prev) * 100), 1)}% față de ${COMPARE_SHORT[v.compare]}` : "",
        v.drill && !st.noAccess ? `Clic pe o valoare: înregistrările ei în ${sourceName(v.source)}.` : v.drill ? "Fără trecere în detaliu: nu ai acces la sursa de date." : ""
      ].filter(Boolean);
      if (foot.length && !compact) body += `<p class="e-permits-wid-card__foot">${foot.map(esc).join(" · ")}</p>`;
    }
    return `<article class="e-permits-chart e-permits-wid-card e-permits-wid-card--panel${stat ? " e-permits-wid-card--stat" : ""} e-permits-wid--pal-${palKey(v)}${compact ? "" : ` e-permits-wid-card--${v.width || "full"}`} e-permits-wid-card--${hk}${natural || stat ? "" : " e-permits-wid-card--fixed"}" aria-label="${esc(ariaLabel || `Previzualizarea widget-ului ${title}`)}">${head}<div class="e-permits-wid-card__body" aria-live="polite">${body}</div></article>`;
  }
  /* the preview block (the ntpl preview aside): heading row „Previzualizare” + meta line (perimeter · data · size ·
     area) | „Actualizează” (secondary Small) + „Mărește” (icon-only); „Previzualizează ca” = the library segmented control
     (the ntpl „E-mail / Mobil” switch); the card at the widget's chosen width of the dashboard row */
  function previewHtml(v, st, { idp } = {}) {
    const per = perimeter();
    const at = st.refreshedAt ? `actualizat la ${time(st.refreshedAt)}` : `date din ${longDate(D().calculatedAt)}, 06:00`;
    const as = st.noAccess ? "fara-acces" : "acces";
    return `
      <section class="e-permits-wid-preview" aria-labelledby="${idp}-preview-title">
        <div class="e-permits-dosar-profil__section-heading">
          <div class="e-permits-wid-preview__titles">
            <h2 class="e-permits-dosar-profil__section-title" id="${idp}-preview-title">Previzualizare</h2>
            <p class="e-permits-dosar-profil__section-meta e-permits-wid-preview__meta">${esc(`Perimetru: ${per.text} · ${at} · Lățime: ${label(WIDTHS, v.width) || "—"} · Înălțime: ${label(HEIGHTS, v.height) || "—"} · Aria: ${label(VIS, v.visibility) || "—"}`)}</p>
          </div>
          <div class="e-permits-passport__heading-tools">
            <button class="btn btn-secondary btn-sm${st.refreshing ? " btn-loading" : ""}" type="button" data-wid-refresh${st.refreshing ? ' aria-busy="true" disabled' : ""}>${icon("rotate-arrow", 16)}<span>Actualizează</span></button>
            <button class="btn btn-neutral btn-sm btn-icon-only" type="button" aria-label="Mărește previzualizarea" data-tooltip-label="Mărește" aria-haspopup="dialog" data-wid-zoom>${icon("enlarge", 16)}</button>
          </div>
        </div>
        <div class="segmented-control" role="radiogroup" aria-label="Previzualizează ca">
          ${[["acces", "Utilizator cu acces la sursă"], ["fara-acces", "Fără acces la sursă"]].map(([k, l]) => `<button class="segment-item${as === k ? " is-selected" : ""}" type="button" role="radio" aria-checked="${as === k}" data-wid-viewas="${k}">${l}</button>`).join("")}
        </div>
        <div class="e-permits-wid-preview__stage">${cardHtml({ ...v, width: "full" }, { st })}</div>
      </section>`;
  }

  /* ================================================================ form pieces (the KPI form vocabulary) */
  const req = () => U().requiredMark?.() || "";
  const errorHtml = (id, msg) => `<span class="message message--inline message--error e-permits-fo-field__error" id="${id}-error">${icon("circle-error-filled")}<span>${esc(msg)}</span></span>`;
  const hintRow = (id, hint, count, max) => `<p class="e-permits-fo-field__hint e-permits-ntpl-count" id="${id}-hint"><span>${esc(hint)}</span><span class="e-permits-ntpl-count__value${count > max ? " is-over" : ""}" data-wid-count="${id}">${count}/${max}</span></p>`;
  function textField(id, key, lbl, value, { required = false, max = 0, hint = "", error = "", span = 12, counter = false, unit = "", numeric = false, placeholder = "" } = {}) {
    const count = String(value ?? "").length;
    const described = error ? `${id}-error` : hint || counter ? `${id}-hint` : "";
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
        <label for="${id}">${esc(lbl)}${required ? req() : ""}</label>
        <div class="e-permits-fo-input${error ? " is-error" : ""}">
          <input id="${id}" type="text" value="${esc(value ?? "")}" autocomplete="off"${numeric ? ' inputmode="decimal"' : ""}${placeholder || unit ? ` placeholder="${esc(placeholder || "0")}"` : ""}${required ? ' aria-required="true"' : ""}${error ? ' aria-invalid="true"' : ""}${described ? ` aria-describedby="${described}"` : ""} data-wid-field="${key}">
          ${unit ? `<label class="e-permits-fo-input__suffix" for="${id}" aria-hidden="true">${esc(unit)}</label>` : ""}
        </div>
        ${error ? errorHtml(id, error) : counter ? hintRow(id, hint, count, max) : hint ? `<p class="e-permits-fo-field__hint" id="${id}-hint">${esc(hint)}</p>` : ""}
      </div>`;
  }
  function areaField(id, key, lbl, value, { hint = "", required = false, error = "", placeholder = "" } = {}) {
    const count = String(value || "").length;
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
        <label for="${id}">${esc(lbl)}${required ? req() : ""}</label>
        <div class="e-permits-fo-textarea${error ? " is-error" : ""}"><textarea id="${id}" rows="3" aria-describedby="${error ? `${id}-error` : `${id}-hint`}"${required ? ' aria-required="true"' : ""}${error ? ' aria-invalid="true"' : ""}${placeholder ? ` placeholder="${esc(placeholder)}"` : ""} spellcheck="true" data-wid-field="${key}">${esc(value)}</textarea></div>
        ${error ? errorHtml(id, error) : hintRow(id, hint, count, TEXT_MAX)}
      </div>`;
  }
  function selectField(id, key, lbl, options, value, { required = false, placeholder = "", hint = "", error = "", span = 6, disabled = false } = {}) {
    const optionsHtml = `${placeholder ? `<option value=""${value ? "" : " selected"}>${esc(placeholder)}</option>` : ""}${options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(value) ? " selected" : ""}>${esc(l)}</option>`).join("")}`;
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
        <label for="${id}">${esc(lbl)}${required ? req() : ""}</label>
        ${U().renderFoSelectControl?.({ id, attrs: `data-wid-field="${key}"`, optionsHtml, error: Boolean(error), disabled }) || ""}
        ${error ? errorHtml(id, error) : hint ? `<p class="e-permits-fo-field__hint" id="${id}-hint">${esc(hint)}</p>` : ""}
      </div>`;
  }
  const grid = (...parts) => `<div class="e-permits-user-create__grid">${parts.join("")}</div>`;
  const full = (html) => (html ? `<div class="e-permits-user-create__field e-permits-user-create__field--12">${html}</div>` : "");
  /* a settings group = the ntpl / KPI profile card: section heading + `.e-permits-ntpl-card` */
  const section = (title, body) => `<section class="e-permits-dosar-profil__section"><div class="e-permits-dosar-profil__section-heading"><h2 class="e-permits-dosar-profil__section-title">${esc(title)}</h2></div><div class="e-permits-ntpl-card">${body}</div></section>`;

  /* ---- the rule builder (the Registre „Filtru predefinit” markup, own hooks data-wid-rule*) */
  const kw = (text) => `<code class="e-permits-doc-kw">${esc(text)}</code>`;
  function ruleBuilder(v, e, idp) {
    const block = v.filter;
    const rules = block.rules || [];
    const options = fieldsOf(v.source).map((f) => [f.key, f.label]);
    const add = `<button class="btn btn-text-primary btn-sm" type="button" data-wid-rule-add>${icon("plus-large", 16)}<span>Adaugă condiție</span></button>`;
    const sel = (id, attrs, placeholder, opts, value, { error = false, lbl = "" } = {}) => U().renderFoSelectControl?.({ id, attrs, error, label: lbl, optionsHtml: `<option value=""${value ? "" : " selected"} disabled>${esc(placeholder)}</option>${opts.map(([val, l]) => `<option value="${esc(val)}"${val === value ? " selected" : ""}>${esc(l)}</option>`).join("")}` }) || "";
    const condRow = (r, i) => {
      const f = fieldOf(v.source, r.column);
      const err = e[`rule.${i}`];
      const id = `${idp}-rule-value-${i}`;
      const values = f?.type === "enum" && ["is", "isNot"].includes(r.op) ? f.values : [];
      const control = values.length
        ? sel(id, `data-wid-rule="${i}" data-wid-rule-part="value"`, "Alege valoarea", values.map((x) => [x, x]), r.value, { error: Boolean(err), lbl: "Valoare" })
        : `<div class="e-permits-fo-input${err ? " is-error" : ""}"><input id="${id}" type="text" value="${esc(r.value)}" placeholder="${f?.type === "date" ? "zz.ll.aaaa" : "Valoare"}" aria-label="Valoare" autocomplete="off"${err ? ` aria-invalid="true" aria-describedby="${id}-error"` : ""} data-wid-rule="${i}" data-wid-rule-part="value"></div>`;
      const value = NO_VALUE.includes(r.op) ? `<div class="e-permits-fo-input is-disabled"><input id="${id}" type="text" value="" placeholder="Fără valoare" aria-label="Valoare (nu este necesară)" disabled></div>` : control;
      return `
        <li class="e-permits-doc-cond">
          <div class="e-permits-doc-cond__cell">${sel(`${idp}-rule-col-${i}`, `data-wid-rule="${i}" data-wid-rule-part="column"`, "Coloană", options, r.column, { lbl: `Coloana condiției ${i + 1}` })}</div>
          <div class="e-permits-doc-cond__cell e-permits-doc-cond__cell--op">${sel(`${idp}-rule-op-${i}`, `data-wid-rule="${i}" data-wid-rule-part="op"`, "Operator", OPS, r.op, { lbl: `Operatorul condiției ${i + 1}` })}</div>
          <div class="e-permits-doc-cond__cell">${value}${err ? errorHtml(id, err) : ""}</div>
          <button class="btn btn-text-destructive btn-sm btn-icon-only e-permits-doc-cond__remove" type="button" aria-label="Elimină condiția ${i + 1}" data-tooltip-label="Elimină condiția" data-wid-rule-remove="${i}">${icon("delete", 16)}</button>
        </li>`;
    };
    if (!v.source) return "";
    return rules.length ? `
      <div class="e-permits-doc-rule e-permits-reg-editor__rule">
        <div class="e-permits-doc-rule__when">${kw("Arată înregistrările când")}</div>
        <ol class="e-permits-doc-rule__conds" role="list">${rules.map((r, i) => `${i === 0 ? ""
          : i === 1 ? `<li class="e-permits-doc-cond__join e-permits-doc-kwselect" data-fo-list-min="120">${sel(`${idp}-logic`, "data-wid-rule-logic", "și", [["and", "și"], ["or", "sau"]], block.logic || "and", { lbl: "Combinarea condițiilor" })}</li>`
          : `<li class="e-permits-doc-cond__join">${kw(block.logic === "or" ? "sau" : "și")}</li>`}${condRow(r, i)}`).join("")}</ol>
        <div class="e-permits-doc-rule__foot">${add}</div>
      </div>` : `${E()?.render({ title: "Fără filtru suplimentar", text: v.type === "rowTable" ? "Tabelul cu filtru afișează rândurile sursei care trec de condiții: adaugă cel puțin una." : "Widget-ul ia toate înregistrările sursei din perioada tabloului de bord.", icon: "filter-lines", compact: true, actionHtml: add }) || ""}${e.filter ? errorHtml(`${idp}-filter`, e.filter) : ""}`;
  }

  /* ---- the chart-type gallery (NEW `.e-permits-wid-types`: the selectable option card, radio variant, + a type glyph) */
  function typeGallery(v, e, idp) {
    const cards = TYPES.map(([key, text, desc]) => {
      const why = typeProblem(key, v);
      const on = v.type === key;
      return `
        <label class="e-permits-fo-delivery-option e-permits-fo-delivery-option--radio e-permits-wid-type${on ? " is-selected" : ""}${why ? " is-disabled" : ""}">
          <input class="e-permits-fo-delivery-option__input" type="radio" name="${idp}-type" value="${key}"${on ? " checked" : ""}${why ? " disabled" : ""} data-wid-type aria-describedby="${idp}-type-${key}-desc">
          <span class="e-permits-fo-delivery-option__content">
            <span class="e-permits-wid-type__glyph" aria-hidden="true">${CH().glyph?.(key) || ""}</span>
            <span class="e-permits-fo-delivery-option__copy">
              <span class="e-permits-fo-delivery-option__title-row"><span class="e-permits-fo-delivery-option__title">${esc(text)}</span></span>
              <span class="e-permits-fo-delivery-option__description" id="${idp}-type-${key}-desc">${esc(why || desc)}</span>
            </span>
          </span>
          <span class="radio radio--small e-permits-fo-delivery-option__radio" aria-hidden="true"><span class="radio-custom"></span></span>
        </label>`;
    }).join("");
    return `
      <fieldset class="e-permits-wid-types" id="${idp}-type"${e.type ? ` aria-describedby="${idp}-type-error"` : ""}>
        <legend class="u-visually-hidden">Tipul widget-ului</legend>
        <div class="e-permits-wid-types__grid">${cards}</div>
        ${e.type ? errorHtml(`${idp}-type`, e.type) : ""}
      </fieldset>`;
  }

  /* ---- the five steps (Feature user flow, step 2) */
  function stepData(v, e, idp) {
    return `
      ${section("Titlu și descriere", grid(
        textField(`${idp}-title-ro`, "titles.ro", "Titlu (RO)", v.titles.ro, { required: true, max: TITLE_MAX, counter: true, hint: "Afișat pe tabloul de bord, de exemplu „Dosare examinate”.", error: e["titles.ro"] }),
        textField(`${idp}-title-ru`, "titles.ru", "Titlu (RU)", v.titles.ru, { span: 6, hint: "Obligatoriu la publicare." }),
        textField(`${idp}-title-en`, "titles.en", "Titlu (EN)", v.titles.en, { span: 6, hint: "Obligatoriu la publicare." }),
        areaField(`${idp}-sub-ro`, "subtitles.ro", "Subtitlu și descriere (RO)", v.subtitles.ro, { hint: "Explicația scurtă pentru utilizator." }),
        textField(`${idp}-sub-ru`, "subtitles.ru", "Subtitlu și descriere (RU)", v.subtitles.ru, { span: 6 }),
        textField(`${idp}-sub-en`, "subtitles.en", "Subtitlu și descriere (EN)", v.subtitles.en, { span: 6 })
      ))}
      ${section("Sursa de date", grid(
        selectField(`${idp}-source`, "source", "Sursa de date", sources().map((s) => [s.id, s.name]), v.source, { required: true, span: 12, placeholder: "Alege sursa de date", hint: "Doar sursele de date publicate. Widget-ul preia coloanele permise, condițiile și trecerea în detaliu ale sursei.", error: e.source })
      ))}`;
  }
  function stepType(v, e, idp) {
    const k = kpiOf(v.kpi);
    const kpiOptions = kpisFor(v.source).map((x) => [x.id, `${x.code} · ${x.names.ro}`]);
    return `
      ${section("Tipul widget-ului", typeGallery(v, e, idp))}
      ${section("KPI din catalog", grid(
        selectField(`${idp}-kpi`, "kpi", "KPI din catalog", [["", "Fără KPI"], ...kpiOptions], v.kpi, { span: 12, hint: kpiOptions.length ? "Opțional, pe orice tip. Un singur KPI pe widget, din KPI-urile active ale sursei alese." : "Sursa aleasă nu are KPI-uri active în catalog.", error: e.kpi, disabled: !kpiOptions.length }),
        k ? full(U().renderInfoNote?.(`Valoarea, formatul, ținta, perioada țintei și pragurile vin din KPI-ul <strong>${esc(k.code)} · ${esc(k.names.ro)}</strong>, calculat pe fiecare categorie a criteriilor widget-ului. Widget-ul arată „Ținta ${esc(kpiTargetText(v) || "—")}”; „Ce se măsoară” și „Coloana măsurată” nu se completează.`) || "") : ""
      ))}`;
  }
  function stepCalc(v, e, idp) {
    if (!v.type) return section("Date afișate", E()?.render({ title: "Alege mai întâi tipul widget-ului", text: "Măsura, criteriile, filtrul și comparația depind de tip.", icon: "chart", compact: true, bare: true }) || "");
    const prim = DATE_AXIS.includes(v.type) ? dateCols(v.source) : catCols(v.source);
    const secOpts = catCols(v.source).filter((f) => f.key !== v.primary);
    const measure = v.kpi
      ? ""
      : v.type === "rowTable"
        ? full(U().renderInfoNote?.("Tabelul cu filtru afișează direct rândurile sursei care trec de filtru, fără măsură și fără grupare.") || "")
        : `${selectField(`${idp}-measure`, "measure", "Ce se măsoară", MEASURES, v.measure, { required: true, hint: v.measure === "count" ? "Numără înregistrările." : "Calculul se face pe coloana măsurată.", error: e.measure })}${usesColumn(v) ? selectField(`${idp}-column`, "column", "Coloana măsurată", measureColumns(v).map((f) => [f.key, f.label]), v.column, { required: true, placeholder: "Alege coloana", hint: ["sum", "avg"].includes(v.measure) ? "Doar coloane numerice sau de durată." : "", error: e.column }) : ""}`;
    const groups = NEEDS_PRIMARY(v.type) ? grid(
      selectField(`${idp}-primary`, "primary", "Criteriul principal", prim.map((f) => [f.key, f.label]), v.primary, { required: true, placeholder: "Alege coloana", hint: DATE_AXIS.includes(v.type) ? "O coloană de dată: axa timpului." : "Categoriile axei.", error: e.primary }),
      SECONDARY[v.type] ? selectField(`${idp}-secondary`, "secondary", "Criteriul secundar", [...(SECONDARY[v.type] === "optional" ? [["", "Fără criteriu secundar"]] : []), ...secOpts.map((f) => [f.key, f.label])], v.secondary, { required: SECONDARY[v.type] === "required", placeholder: SECONDARY[v.type] === "required" ? "Alege coloana" : "", hint: v.type === "heatmap" ? "A doua axă a hărții." : "Împarte fiecare categorie în serii colorate.", error: e.secondary }) : "",
      needsDateGroup(v) ? selectField(`${idp}-dategroup`, "dateGroup", "Gruparea datei", DATE_GROUPS, v.dateGroup, { required: true, placeholder: "Alege gruparea", error: e.dateGroup }) : "",
      ORDERED.includes(v.type) && !isDate(v.source, v.primary) ? selectField(`${idp}-order`, "order", "Ordinea categoriilor", ORDERS, v.order, {}) : ""
    ) : v.type === "rowTable" ? grid(selectField(`${idp}-order`, "order", "Ordinea rândurilor", ORDERS, v.order, { span: 12, hint: "Rândurile se ordonează după data înregistrării." })) : "";
    return `
      ${measure ? section("Ce se măsoară", grid(measure)) : ""}
      ${groups ? section(v.type === "rowTable" ? "Rândurile" : "Gruparea", groups) : ""}
      ${section("Filtru suplimentar", `${ruleBuilder(v, e, idp)}<p class="e-permits-fo-field__hint">Se adaugă la condițiile sursei; perioada vine din filtrul tabloului de bord.</p>`)}
      ${section("Comparație", grid(selectField(`${idp}-compare`, "compare", "Perioada de comparație", [["", "Fără comparație"], ...COMPARES], v.compare, { span: 12 })))}`;
  }
  function stepLook(v, e, idp) {
    const k = kpiOf(v.kpi);
    const formats = FORMATS.filter(([f]) => (f === "duration" ? fieldOf(v.source, v.column)?.type === "duration" : f === "amount" ? fieldOf(v.source, v.column)?.type === "amount" : f === "percent" ? !["avg", "min", "max"].includes(v.measure) : true));
    const unit = formatOf(v) === "percent" ? "%" : formatOf(v) === "duration" ? "zile" : formatOf(v) === "amount" ? "MDL" : "";
    const look = k
      ? full(U().renderInfoNote?.(`Formatul și pragurile vin din KPI-ul <strong>${esc(k.names.ro)}</strong>: verde favorabil, portocaliu la apropierea de țintă, roșu după depășirea ei.`) || "")
      : `${selectField(`${idp}-format`, "format", "Format", formats, v.format, { span: 12 })}
         ${full(U().renderToggle?.({ label: "Culori după prag", description: "Valorile de la prag în sus sunt verzi, cele de sub prag au culoarea aleasă. Fără prag, widget-ul folosește culorile alese mai jos.", checked: Boolean(v.threshold.on), attrs: 'data-wid-field="threshold.on"' }) || "")}
         ${v.threshold.on ? `${textField(`${idp}-threshold`, "threshold.value", "Pragul", v.threshold.value, { span: 6, unit, numeric: true, required: true, error: e["threshold.value"] })}${selectField(`${idp}-below`, "threshold.below", "Culoarea sub prag", BELOW, v.threshold.below, {})}` : ""}`;
    const vis = visOptions();
    const byStatus = statusColours(v);
    const palette = full(`
      <div class="e-permits-wid-vis-field e-permits-wid-pal-field">
        <span class="e-permits-cfg-ro__label" id="${idp}-palette-label">Culori</span>
        <fieldset class="e-permits-wid-types" id="${idp}-palette" aria-describedby="${idp}-palette-hint">
          <legend class="u-visually-hidden">Culori</legend>
          <div class="e-permits-wid-types__grid e-permits-wid-pal-grid">${PALETTES.map(([key, name]) => `
            <label class="e-permits-fo-delivery-option e-permits-fo-delivery-option--radio e-permits-wid-type${byStatus ? " is-disabled" : palKey(v) === key ? " is-selected" : ""}">
              <input class="e-permits-fo-delivery-option__input" type="radio" name="${idp}-pal" value="${key}"${palKey(v) === key && !byStatus ? " checked" : ""}${byStatus ? " disabled" : ""} data-wid-pal>
              <span class="e-permits-fo-delivery-option__content">
                <span class="e-permits-fo-delivery-option__copy">
                  <span class="e-permits-fo-delivery-option__title-row"><span class="e-permits-fo-delivery-option__title">${esc(name)}</span></span>
                  <span class="e-permits-fo-delivery-option__description">${swatches(key)}</span>
                </span>
              </span>
              <span class="radio radio--small e-permits-fo-delivery-option__radio" aria-hidden="true"><span class="radio-custom"></span></span>
            </label>`).join("")}</div>
        </fieldset>
        <p class="e-permits-fo-field__hint" id="${idp}-palette-hint">${byStatus ? "Culorile urmează statusurile (aceleași ca etichetele din tabele)." : "Zonele KPI păstrează verde / galben / roșu."}</p>
      </div>`);
    return `
      ${section("Format, praguri și culori", grid(look, palette))}
      ${section("Dimensiunile implicite", grid(
        selectField(`${idp}-width`, "width", "Lățimea implicită", WIDTHS, v.width, { required: true }),
        selectField(`${idp}-height`, "height", "Înălțimea implicită", v.type === "tile" ? HEIGHTS.filter(([k]) => k === "compact") : HEIGHTS, heightOf(v), { required: true })
      ))}
      ${section("Trecerea în detaliu", grid(full(U().renderToggle?.({ label: "Trecerea în detaliu", description: v.type === "tile" ? `Clic pe plăcuță deschide înregistrările filtrului widget-ului în ${sourceName(v.source) || "sursa de date"}.` : `Clic pe o valoare deschide înregistrările ei în ${sourceName(v.source) || "sursa de date"}, filtrate pe criteriul principal.`, checked: Boolean(v.drill), attrs: 'data-wid-field="drill"' }) || "")))}
      ${section("Aria de vizibilitate", `
        <div class="e-permits-wid-vis-field">
          <span class="e-permits-cfg-ro__label" id="${idp}-vis-label">Ce date vede utilizatorul${req()}</span>
          <div class="radio-group e-permits-wid-vis" role="radiogroup" aria-labelledby="${idp}-vis-label" id="${idp}-visibility">
            ${vis.map((o) => `<label class="radio radio--small"${o.disabled ? ' aria-disabled="true"' : ""}><input class="radio-input" type="radio" name="${idp}-vis" value="${o.key}"${v.visibility === o.key ? " checked" : ""}${o.disabled ? " disabled" : ""} data-wid-vis><span class="radio-custom" aria-hidden="true"></span><span class="radio-texts"><span class="radio-label">${esc(o.text)}</span><span class="radio-description">${esc(o.reason || o.desc)}</span></span></label>`).join("")}
          </div>
          ${e.visibility ? errorHtml(`${idp}-visibility`, e.visibility) : ""}
        </div>
        ${U().renderInfoNote?.("Aria de vizibilitate nu lărgește perimetrul de date al rolului: utilizatorul nu vede niciodată mai mult decât permite rolul lui.") || ""}`)}`;
  }
  /* the generated level (Feature model: Global / Autoritate / Serviciu) */
  function levelOf(v, me = who()) {
    if (me.central) return { level: "Global" };
    const svc = (v.filter.rules || []).filter((r) => r.column === "serviciu" && r.op === "is");
    if (svc.length === 1) return { level: "Serviciu", authority: me.authority, service: serviceCode(svc[0].value) };
    return { level: "Autoritate", authority: me.authority };
  }
  const SERVICES = { "Autorizație sanitară de funcționare": "003000118", "Autorizarea produselor biocide": "003000519", "Certificat de conformitate igienică": "003000201" };
  const serviceCode = (name) => SERVICES[name] || name;
  const levelOfText = (v) => { const l = levelOf(v); return l.level === "Global" ? "Global" : l.level === "Serviciu" ? `Serviciu ${l.service}` : `Autoritate ${authName(l.authority)}`; };

  /* ---- read-only passport blocks (profile, review, version view) */
  const rulesText = (v) => (v.filter.rules?.length ? v.filter.rules.map((r) => `${fieldOf(v.source, r.column)?.label || r.column} ${label(OPS, r.op)}${NO_VALUE.includes(r.op) ? "" : ` „${r.value}”`}`).join(v.filter.logic === "or" ? " sau " : " și ") : "");
  const thresholdText = (v) => (kpiOf(v.kpi) ? "Din KPI" : v.threshold.on ? `Verde de la ${v.threshold.value}, ${label(BELOW, v.threshold.below).toLocaleLowerCase("ro")} sub prag` : "Fără prag");
  const paletteHtml = (v) => (statusColours(v) ? "După status" : `<span class="e-permits-wid-pal-value">${swatches(palKey(v))}<span>${esc(label(PALETTES, palKey(v)))}</span></span>`);
  /* one row per field of the model; a field the type does not use reads „—” */
  function configRows(v) {
    const k = kpiOf(v.kpi);
    const d = (x) => (x ? esc(x) : dash);
    return {
      data: [
        ["Titlu (RO)", d(v.titles.ro)], ["Titlu (RU)", d(v.titles.ru)], ["Titlu (EN)", d(v.titles.en)],
        ["Subtitlu și descriere", d(v.subtitles.ro)], ["Sursa de date", d(sourceName(v.source))]
      ],
      calc: [
        ["Tip", d(typeLabel(v.type))], ["KPI din catalog", k ? esc(`${k.code} · ${k.names.ro}`) : dash],
        ...(k ? [["Ținta", d(kpiTargetText(v))]] : [["Ce se măsoară", usesMeasure(v) ? d(label(MEASURES, v.measure)) : dash], ["Coloana măsurată", usesColumn(v) ? d(fieldOf(v.source, v.column)?.label) : dash]]),
        ["Criteriul principal", NEEDS_PRIMARY(v.type) ? d(fieldOf(v.source, v.primary)?.label) : dash], ["Criteriul secundar", SECONDARY[v.type] ? d(fieldOf(v.source, v.secondary)?.label) : dash],
        ["Gruparea datei", needsDateGroup(v) ? d(label(DATE_GROUPS, v.dateGroup)) : dash], ["Ordinea categoriilor", ORDERED.includes(v.type) ? d(label(ORDERS, v.order)) : dash],
        ["Filtru suplimentar", d(rulesText(v))], ["Perioada de comparație", d(label(COMPARES, v.compare))]
      ],
      look: [
        ["Format", k ? "Din KPI" : d(label(FORMATS, v.format))], ["Praguri", esc(thresholdText(v))], ["Culori", paletteHtml(v)],
        ["Lățimea implicită", d(label(WIDTHS, v.width))], ["Înălțimea implicită", d(label(HEIGHTS, v.height))],
        ["Trecerea în detaliu", v.drill ? "Da" : "Nu"], ["Aria de vizibilitate", d(label(VIS, v.visibility))]
      ]
    };
  }
  /* the rows of two configurations side by side, matched by label (a KPI swaps the measure rows for „Ținta”) */
  function rowPairs(a, b) {
    const out = [];
    ["data", "calc", "look"].forEach((g) => {
      const mb = new Map(b[g]);
      const ma = new Map(a[g]);
      [...new Set([...a[g].map(([l]) => l), ...b[g].map(([l]) => l)])].forEach((lbl) => out.push([lbl, ma.has(lbl) ? ma.get(lbl) : dash, mb.has(lbl) ? mb.get(lbl) : dash]));
    });
    return out;
  }
  function readBlocks(v, { goto = null } = {}) {
    const rows = configRows(v);
    const block = (title, list, n) => A().renderPassportBlock?.(title, list, goto ? { actionHtml: goto(n) } : {}) || "";
    return `${block("Date", rows.data, 1)}${block("Tip și calcul", rows.calc, 3)}${block("Aspect și acces", rows.look, 4)}`;
  }

  /* ================================================================ LIST (US-404) */
  const statusOf = (w, me = who()) => {
    if (w.status === "Publicat" && isOffFor(w, me.authority) && !me.central) return [`Dezactivat în ${authName(me.authority)}`, "neutral"];
    return [w.status, STATUS_TONE[w.status] || "neutral"];
  };
  const rowOf = (w) => {
    const [statut, tone] = statusOf(w);
    const lv = lastVersion(w);
    return {
      id: w.id, titlu: w.config.titles.ro, tip: typeLabel(w.config.type), sursa: sourceName(w.config.source), nivel: w.level, autoritate: w.level === "Global" ? "" : levelText(w).split(" · ")[1] || "",
      statut, tone, versiune: lv ? String(lv.version) : "", nepublicat: unpublished(w), modificat: w.updatedAt || "", w
    };
  };
  function registryDb() {
    if (!S.data) load().then(() => { if (document.querySelector(`[data-workplace][data-registry-kind="${KIND}"]`)) refreshList(); });
    const me = who();
    const mine = authName(me.authority);
    return {
      kind: KIND,
      fixedWidths: true,
      fieldCount: 8,
      defaultSort: "id",
      defaultSortDirection: "asc",
      columns: {
        id: { label: "ID", width: 112, sortable: true },
        titlu: { label: "Titlu", width: 320, sortable: true },
        tip: { label: "Tip", width: 200, sortable: true },
        sursa: { label: "Sursa de date", width: 216, sortable: true },
        nivel: { label: "Nivel", width: 168, sortable: true },
        statut: { label: "Statut", width: 176, sortable: true },
        versiune: { label: "Versiune", width: 168, sortable: true },
        modificat: { label: "Modificat", width: 184, sortable: true },
        ...(me.has ? { actiuni: { label: "", width: 56, pin: "end" } } : {})
      },
      views: {
        [KIND]: {
          title: TITLE,
          selectable: false,
          searchPlaceholder: "Caută după ID sau titlu",
          columns: ["id", "titlu", "tip", "sursa", "nivel", "statut", "versiune", "modificat", ...(me.has ? ["actiuni"] : [])],
          tabs: me.central
            ? [{ id: "toate", label: "Toate", filter: "all" }, { id: "globale", label: "Globale", filter: "level:global" }, { id: "autoritati", label: "Ale autorităților", filter: "level:authority" }]
            : [{ id: "toate", label: "Toate", filter: "all" }, { id: "globale", label: "Globale", filter: "level:global" }, { id: "autoritati", label: `Ale ${mine}`, filter: "level:authority" }],
          defaultTab: "toate",
          primaryAction: canCreate() ? { id: "wid-new", label: "Widget nou" } : null,
          toolbarLabel: "Filtrare widget-uri",
          /* Feature assumption: widget data is not exported — the list itself is (registry CSV, like KPI) */
          exportLabel: "Exportă CSV"
        }
      },
      runtimeRows: widgets().map(rowOf)
    };
  }
  const SORT = { versiune: (r) => String(r.versiune || 0).padStart(4, "0"), modificat: (r) => r.modificat || "0000", nivel: (r) => `${r.nivel === "Global" ? 0 : 1}${r.autoritate}` };
  function rowMenu(row) {
    const w = row.w;
    const me = who();
    const mine = authName(me.authority);
    const items = [
      canEdit(w) && w.status !== "Dezactivat" && { label: "Editează", icon: "edit", attrs: `data-wid-row-edit="${esc(w.id)}"` },
      canCreate() && { label: "Clonează", icon: "copy", attrs: `data-wid-row-clone="${esc(w.id)}"` },
      canAuth(w) && w.status === "Publicat" && (isOffFor(w, me.authority)
        ? { label: `Activează pentru ${mine}`, icon: "rotate-arrow", attrs: `data-wid-row-auth="${esc(w.id)}"` }
        : { label: `Dezactivează pentru ${mine}`, icon: "pause", attrs: `data-wid-row-auth="${esc(w.id)}"` }),
      canEdit(w) && (w.status === "Dezactivat"
        ? { label: "Activează", icon: "rotate-arrow", attrs: `data-wid-row-toggle="${esc(w.id)}"` }
        : { label: "Dezactivează", icon: "pause", attrs: `data-wid-row-toggle="${esc(w.id)}"` })
    ].filter(Boolean);
    if (!items.length) return "";
    const html = U().renderRowActions?.({ menu: items, label: `${w.id} ${w.config.titles.ro}` }) || "";
    return html ? `<span class="e-permits-workplace__row-actions">${html.replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>")}</span>` : "";
  }
  const twoLines = (top, meta) => `<span class="e-permits-workplace__date-stack"><span>${top}</span><span class="e-permits-workplace__date-meta">${meta}</span></span>`;
  window.GEAPShellRegistries = window.GEAPShellRegistries || {};
  window.GEAPShellRegistries[KIND] = {
    build: registryDb,
    get facets() {
      return [
        { key: "tip", label: "Tip", get: (row) => row.tip },
        { key: "sursa", label: "Sursa de date", get: (row) => row.sursa },
        { key: "statut", label: "Statut", get: (row) => row.statut }
      ];
    },
    searchText: (row) => `${row.id} ${row.titlu} ${fold(row.titlu)}`,
    sortValue: (row, key) => String(SORT[key]?.(row) ?? row[key] ?? ""),
    filterToken: (row, token) => (token === "level:global" ? row.nivel === "Global" : token === "level:authority" ? row.nivel !== "Global" : true),
    rowClass: (row) => (row.statut === "Publicat" || row.statut === "Ciornă" ? "" : "is-inactive"),
    renderCell: (row, key) => {
      switch (key) {
        case "id": return `<span data-cell-tooltip="${esc(row.id)}">${esc(row.id)}</span>`;
        case "titlu": return `<span data-cell-tooltip="${esc(row.titlu)}">${esc(row.titlu)}</span>`;
        case "tip": return `<span data-cell-tooltip="${esc(row.tip)}">${esc(row.tip)}</span>`;
        case "sursa": return `<span data-cell-tooltip="${esc(row.sursa)}">${esc(row.sursa)}</span>`;
        case "nivel": return row.nivel === "Global" ? "Global" : twoLines(esc(row.nivel), esc(row.autoritate));
        case "statut": return tag(row.statut, row.tone);
        case "versiune": return row.versiune ? (row.nepublicat ? twoLines(esc(row.versiune), "modificări nepublicate") : esc(row.versiune)) : twoLines(dash, "nepublicat");
        case "modificat": return row.modificat ? twoLines(esc(longDate(row.modificat)), esc(`${time(row.modificat)} · ${row.w.updatedBy || ""}`)) : dash;
        case "actiuni": return rowMenu(row);
        default: return esc(row[key] ?? "") || dash;
      }
    },
    openRow: (id) => openProfile(id, "configurare"),
    rowLabel: (row) => `${row.id}, ${row.titlu} — deschide widget-ul`,
    emptyHtml: ({ query, filtered }) => {
      if (!who().has) return E()?.render({ title: DENIED, icon: "lock", bare: true });
      if (!S.data) return E()?.render({ title: "Se încarcă widget-urile…", loading: true, bare: true });
      /* Feature AC — the exact texts (render keeps the full stop) */
      if (query || filtered) return E()?.render({ title: NO_MATCH, text: "Caută după ID sau titlu, sau schimbă filtrele.", icon: "search", bare: true });
      return E()?.render({ title: EMPTY_LIST, text: canCreate() ? "Creează primul widget cu „Widget nou”." : "", icon: "chart", bare: true, actionHtml: canCreate() ? '<button class="btn btn-primary btn-sm" type="button" data-wid-new>Widget nou</button>' : "" });
    },
    exportRows: (rows) => exportCsv(rows),
    exportState: () => (who().has ? {} : { hidden: true })
  };
  function refreshList() {
    const reg = document.querySelector(`[data-workplace][data-registry-kind="${KIND}"]`);
    const st = A().workplaceState;
    if (!reg || !st || reg.closest("[hidden]") || reg.hidden) return;
    st.rows = registryDb().runtimeRows;
    A().renderWorkplace?.();
  }
  function exportCsv(rows) {
    const head = ["ID", "Titlu", "Tip", "Sursa de date", "Nivel", "Statut", "Versiune", "Modificat"];
    const lines = rows.map((r) => [r.id, r.titlu, r.tip, r.sursa, r.nivel === "Global" ? "Global" : `${r.nivel} ${r.autoritate}`, r.statut, r.versiune || "-", r.modificat ? `${longDate(r.modificat)} ${time(r.modificat)}` : "-"]);
    const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const blob = new Blob([`﻿${[head, ...lines].map((l) => l.map(cell).join(";")).join("\r\n")}`], { type: "text/csv;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "widgete.csv" });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(`Am exportat ${plural(rows.length, "widget", "widget-uri")} în widgete.csv.`);
  }

  /* ---------------------------------------------------------------- audit (Feature AC: every operation)
     Feature 96501 rev 18: each operation (create · clone · edit · publish · rejected publication · deactivate · activate ·
     per-authority (de)activation · restore) is written to the widget's Istoric AND to the platform's unique Jurnalul de
     audit (GEAPEventTimeline.log = the US-262 record: actor, role, authority, object Widget + ID + version, correlation,
     MLog transmission). The Istoric entry opens that record. */
  const journalEvent = (h) => ({ at: h.at, user: h.by, role: h.role, type: h.event, status: h.event === EVENTS.rejected ? "Eșuat" : "Reușit", detail: h.detail || "" });
  /* the version in force when the event happened (seed events too) */
  const versionAt = (w, at) => w.versions.filter((x) => String(x.at || "") <= String(at)).pop()?.version || 0;
  const journalCtx = (w, h) => {
    const auth = /· (ANSP|ANTA)$/.exec(h.role || "")?.[1] || (w.level === "Global" ? "" : authName(w.authority));
    const v = versionAt(w, h.at);
    return {
      module: "BackOffice",
      authority: auth,
      objectType: "Widget",
      objectId: w.id,
      objectVersion: v ? `versiunea ${v}` : "ciornă",
      related: h.event === EVENTS.publish || h.event === EVENTS.restore ? [{ module: "Tablouri de bord", type: "Ultima versiune publicată, disponibilă pe tablourile de bord", user: "SIA GEAP" }] : []
    };
  };
  function audit(w, kind, detail = "", changes = null) {
    const h = { at: nowIso(), by: userName(), role: roleLabel(), event: EVENTS[kind], detail, ...(changes ? { changes } : {}) };
    w.history.unshift(h);
    window.GEAPEventTimeline?.log?.(journalEvent(h), journalCtx(w, h));
    if (!["authOn", "authOff", "rejected"].includes(kind)) { w.updatedAt = nowIso(); w.updatedBy = userName(); }
  }

  /* ---------------------------------------------------------------- deactivate / activate (US-407) */
  function setStatus(w, on, after) {
    if (!canEdit(w)) return;
    const apply = () => {
      if (demo.has("eroare")) { toast(SAVE_FAILED, "error"); return; }
      w.status = on ? (w.versions.length ? "Publicat" : "Ciornă") : "Dezactivat";
      audit(w, on ? "on" : "off");
      toast(on ? `Widget-ul „${w.config.titles.ro}” a fost activat.` : `Widget-ul „${w.config.titles.ro}” a fost dezactivat.`);
      after?.();
    };
    if (on) { apply(); return; }
    U().askConfirm?.({
      title: `Dezactivezi widget-ul „${w.config.titles.ro}”?`,
      text: w.level === "Global"
        ? "Widget-ul dispare din tablourile de bord ale tuturor autorităților și nu mai poate fi adăugat. Nimic nu se șterge: configurația și versiunile se păstrează, îl poți activa oricând."
        : `Widget-ul dispare din tablourile de bord ale ${authName(w.authority)} și nu mai poate fi adăugat. Nimic nu se șterge: configurația și versiunile se păstrează, îl poți activa oricând.`,
      confirmLabel: "Dezactivează",
      destructive: true
    }, apply);
  }
  function setAuthActive(w, on, after) {
    if (!canAuth(w)) return;
    const me = who();
    const mine = authName(me.authority);
    const apply = () => {
      if (demo.has("eroare")) { toast(SAVE_FAILED, "error"); return; }
      w.offFor = on ? w.offFor.filter((a) => a !== me.authority) : [...new Set([...w.offFor, me.authority])];
      audit(w, on ? "authOn" : "authOff", mine);
      toast(on ? `Widget-ul „${w.config.titles.ro}” a fost activat pentru ${mine}.` : `Widget-ul „${w.config.titles.ro}” a fost dezactivat pentru ${mine}.`);
      after?.();
    };
    if (on) { apply(); return; }
    U().askConfirm?.({
      title: `Dezactivezi widget-ul „${w.config.titles.ro}” pentru ${mine}?`,
      text: `Widget-ul global dispare din tablourile de bord ale ${mine}. Celelalte autorități nu sunt afectate; îl poți activa oricând pentru ${mine}.`,
      confirmLabel: `Dezactivează pentru ${mine}`,
      destructive: true
    }, apply);
  }

  /* ================================================================ PROFILE = the editor page (US-403 · US-405 · US-406 · US-408)
     widget-v2 (user: „make it full, as in Notificări › Șabloane”): create and edit on the shared profile page, the
     ntpl editor structure — 1280 column, tabs Configurare · Versiuni · Istoric, `.e-permits-ntpl-content` with the
     settings form (5fr, ≥ 360) and the BIG sticky preview (7fr; Asana / Sentry / Twenty chart editors); under 1100 the
     preview stacks first. Header: unsaved status · „Salvează” / „Salvează ciorna” · „Publică” · ⋮. A read-only widget
     (a global one for an authority) = passport blocks + the preview. */
  const P = { id: null, tab: "configurare", isNew: false, from: "", draft: null, base: null, errors: {}, saveError: false, noAccess: demo.has("fara-acces"), refreshing: false, refreshedAt: "", compare: null };
  const TABS = [["configurare", "Configurare"], ["versiuni", "Versiuni"], ["istoric", "Istoric"]];
  const IDP = "wid-e";
  const profileOpen = () => (Boolean(P.id) || P.isNew) && !document.querySelector("[data-dosar-profil]")?.hidden && A().els?.dosarProfilPanelBody?.id === "wid-panel";
  const editable = (w = widgetOf(P.id)) => P.isNew || (Boolean(w) && canEdit(w) && w.status !== "Dezactivat");
  const pageDirty = () => Boolean(P.draft) && (P.isNew ? Boolean(P.draft.titles.ro || P.draft.source || P.from) : !same(P.draft, P.base));
  async function openProfile(id, tab = "configurare", { push = true } = {}) {
    await load();
    const w = widgetOf(id);
    if (!who().has || !w || !visible(w)) { showDenied(); return; }
    if (P.id !== id || P.isNew) { P.compare = null; P.errors = {}; P.saveError = false; P.draft = clone(w.config); P.base = clone(w.config); }
    P.id = id; P.isNew = false; P.from = "";
    P.tab = TABS.some(([t]) => t === tab) ? tab : "configurare";
    show(`#widget/${id}/${P.tab}`, push);
  }
  /* „Widget nou” / „Clonează” = the create sheet (sheet-page-v1, 2026-11-07, user: „do as in KPIs”): the Registre
     full-screen sheet on the editor page width, step strip Date · Tip · Date afișate · Aspect și acces · Revizuire, every
     step = form 5fr | the BIG sticky preview 7fr; the ID is generated at the first save, then the widget opens on its
     profile page (editing stays there) */
  let beforeCreate = null;
  async function openNew({ from = "" } = {}) {
    await load();
    if (!canCreate()) return;
    const src = from ? widgetOf(from) : null;
    const me = who();
    const v = src ? clone(src.config) : blankConfig();
    if (src) {
      v.titles.ro = `${v.titles.ro} (copie)`.slice(0, TITLE_MAX);
      /* a copy never reaches wider than its new author's role */
      if (visOptions(me).find((o) => o.key === v.visibility)?.disabled) v.visibility = defaultVis(me);
    }
    beforeCreate = { ...P, back: document.activeElement };
    Object.assign(P, { id: null, isNew: true, from: src?.id || "", tab: "configurare", draft: v, base: clone(v), errors: {}, saveError: false, compare: null, step: 1, maxStep: src ? STEPS.length : 1 });
    const el = ensureSheet();
    renderCreate();
    el.hidden = false;
    document.documentElement.classList.add("is-reg-editor-open");
    requestAnimationFrame(() => el.querySelector(`#${IDP}-title-ro`)?.focus({ preventScroll: true }));
  }
  function show(hash, push) {
    A().setActiveNav?.(NAV);
    A().openProfilePanel?.();
    registerChangeSource();
    renderProfile();
    A().writeHash?.(hash, { push });
    A().els?.dosarProfilPanel?.scrollIntoView?.({ block: "start" });
  }
  function closeProfile() { P.id = null; P.isNew = false; P.draft = null; document.querySelector(`[data-nav-item][data-nav-id="${NAV}"]`)?.click(); }
  const changedFields = () => {
    if (!P.draft || P.isNew) return {};
    const out = {};
    const a = configRows(P.base);
    const b = configRows(P.draft);
    rowPairs(a, b).forEach(([lbl, va, vb]) => { if (va !== vb) out[lbl] = [va, vb]; });
    return out;
  };
  function headerActions(w) {
    const me = who();
    const mine = authName(me.authority);
    if (P.isNew) {
      return `
        <button class="btn btn-secondary btn-sm" type="button" data-wid-save>Salvează ciorna</button>
        <button class="btn btn-primary btn-sm" type="button" data-wid-publish>Publică</button>`;
    }
    const d = pageDirty();
    const canPub = editable(w) && (!w.versions.length || unpublished(w) || d);
    const menu = [
      canCreate() && { label: "Clonează", icon: "copy", attrs: "data-wid-clone" },
      canAuth(w) && w.status === "Publicat" && (isOffFor(w, me.authority)
        ? { label: `Activează pentru ${mine}`, icon: "rotate-arrow", attrs: "data-wid-auth" }
        : { label: `Dezactivează pentru ${mine}`, icon: "pause", attrs: "data-wid-auth" }),
      canEdit(w) && (w.status === "Dezactivat" ? { label: "Activează", icon: "rotate-arrow", attrs: "data-wid-toggle" } : { label: "Dezactivează", icon: "pause", attrs: "data-wid-toggle" })
    ].filter(Boolean);
    return `
      ${editable(w) ? `<button class="btn btn-secondary btn-sm" type="button" data-wid-save${d ? "" : ' aria-disabled="true" data-tooltip-reason="Nu există modificări de salvat."'}>Salvează</button>` : ""}
      ${canPub ? '<button class="btn btn-primary btn-sm" type="button" data-wid-publish>Publică</button>' : ""}
      ${(U().renderStackMenu?.(menu, w.config.titles.ro) || "").replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>")}`;
  }
  function headerTop(w) {
    const n = Object.keys(changedFields()).length;
    const status = n
      ? A().renderHeaderStatus?.(n === 1 ? "1 modificare nesalvată" : `${n} modificări nesalvate`, "warning", A().changesStatusAttrs?.("wid-draft")) || ""
      : w && unpublished(w) && w.status !== "Dezactivat" ? A().renderHeaderStatus?.("Modificări nepublicate", "warning", 'data-wid-pending aria-haspopup="dialog" data-tooltip-text="Vezi modificările"') || "" : "";
    const me = who();
    return A().renderPageHeaderTop({
      back: { label: TITLE, attr: "data-wid-back" },
      title: P.isNew ? (P.from ? "Clonează widget-ul" : "Widget nou") : w.config.titles.ro,
      actions: headerActions(w),
      status,
      caption: P.isNew ? (P.from ? `Copie a ${P.from} · primește un ID nou la salvare` : "ID-ul se generează la prima salvare") : w.updatedAt ? `Modificat ${longDate(w.updatedAt)}, ${time(w.updatedAt)} · ${w.updatedBy || ""}` : ""
    });
  }
  function renderProfile({ keep = "" } = {}) {
    const w = P.isNew ? null : widgetOf(P.id);
    const els = A().els || {};
    if ((!w && !P.isNew) || !els.dosarProfilTitleRow) return;
    const active = document.activeElement;
    const keepSel = keep || (active && els.dosarProfilPanelBody?.contains(active) && active.id ? `#${CSS.escape(active.id)}` : "");
    const caret = active && "selectionStart" in active ? [active.selectionStart, active.selectionEnd] : null;
    els.dosarProfilTitleRow.innerHTML = headerTop(w);
    const lv = w ? lastVersion(w) : null;
    const [statut, tone] = w ? statusOf(w) : ["Ciornă", "neutral"];
    els.dosarProfilSummary.innerHTML = A().renderPageHeaderMeta([
      ["ID", w ? A().renderProfileCopyCode?.(w.id, `Copiază ${w.id}`) || esc(w.id) : "se generează la salvare"],
      ["Tip", esc(typeLabel((P.draft || w.config).type) || "—")],
      ["Nivel", esc(w ? levelText(w) : levelOfText(P.draft))],
      ["Statut", tag(statut, tone)],
      ["Versiune publicată", lv ? esc(String(lv.version)) : "nepublicat"]
    ]);
    A().watchPageHeaderMeta?.(els.dosarProfilSummary);
    const tabs = P.isNew ? TABS.slice(0, 1) : TABS;
    const counts = w ? { versiuni: w.versions.length, istoric: Math.min(w.history.length, 100) } : {};
    els.dosarProfilTabs.innerHTML = tabs.map(([id, text]) => {
      const on = id === P.tab;
      return `<button class="tab-button${on ? " active" : ""}" id="wid-tab-${id}" type="button" role="tab" aria-controls="wid-panel" aria-selected="${on}" tabindex="${on ? 0 : -1}" data-wid-tab="${id}"><span>${text}</span>${counts[id] ? A().renderPageHeaderTabCount?.(counts[id]) || "" : ""}</button>`;
    }).join("");
    const body = els.dosarProfilPanelBody;
    body.id = "wid-panel";
    body.setAttribute("role", "tabpanel");
    body.setAttribute("aria-labelledby", `wid-tab-${P.tab}`);
    body.innerHTML = `${notices(w)}${P.tab === "versiuni" && w ? versionsTab(w) : P.tab === "istoric" && w ? historyTab(w) : configTab(w)}`;
    if (keepSel) {
      const el = document.querySelector(keepSel);
      el?.focus?.({ preventScroll: true });
      if (caret && el && "setSelectionRange" in el) { try { el.setSelectionRange(caret[0], caret[1]); } catch { /* not text */ } }
    }
  }
  function notices(w) {
    const me = who();
    const mine = authName(me.authority);
    const list = w ? [
      P.saveError && U().renderNotice?.("error", esc(SAVE_FAILED), { role: "alert" }),
      w.status === "Dezactivat" && U().renderNotice?.("warning", `<strong>Widget dezactivat.</strong> Nu apare în tablourile de bord și nu poate fi adăugat. Configurația și versiunile se păstrează${canEdit(w) ? "; „Activează” din meniul ⋮ îl readuce" : ""}.`),
      w.status === "Ciornă" && U().renderInfoNote?.("<strong>Ciornă.</strong> Widget-ul apare la alcătuirea tablourilor de bord după prima publicare."),
      w.status === "Publicat" && unpublished(w) && U().renderNotice?.("warning", `<strong>Modificări nepublicate.</strong> Utilizatorii BackOffice văd în continuare versiunea ${esc(String(lastVersion(w).version))}.`),
      !me.central && w.level === "Global" && isOffFor(w, me.authority) && U().renderNotice?.("warning", `<strong>Dezactivat pentru ${esc(mine)}.</strong> Widget-ul global nu apare în tablourile de bord ale ${esc(mine)}.`),
      !me.central && w.level === "Global" && P.tab === "configurare" && U().renderInfoNote?.(`Widget global, creat de Administratorul central: îl vezi doar pentru citire. Îl poți clona la nivelul ${esc(mine)} sau îl poți dezactiva pentru ${esc(mine)}.`)
    ] : [P.saveError && U().renderNotice?.("error", esc(SAVE_FAILED), { role: "alert" })];
    const html = list.filter(Boolean).join("");
    return html ? `<div class="e-permits-reg-notices">${html}</div>` : "";
  }
  /* Configurare: the form (settings) + the BIG preview — or, read-only, the passport blocks + the preview */
  function configTab(w) {
    if (!editable(w)) {
      return `
        <div class="e-permits-ntpl-content e-permits-ntpl-content--preview e-permits-wid-config e-permits-editor-wide">
          <div class="e-permits-ntpl-content__main">${readBlocks(w.config)}</div>
          <aside class="e-permits-ntpl-content__preview" data-wid-preview>${previewHtml(w.config, P, { idp: "wid-p" })}</aside>
        </div>`;
    }
    const v = P.draft;
    const e = P.errors;
    return `
      <div class="e-permits-ntpl-content e-permits-ntpl-content--preview e-permits-wid-config e-permits-editor-wide">
        <div class="e-permits-ntpl-content__main e-permits-wid-form">
          ${stepData(v, e, IDP)}${stepType(v, e, IDP)}${stepCalc(v, e, IDP)}${stepLook(v, e, IDP)}
        </div>
        <aside class="e-permits-ntpl-content__preview" data-wid-preview>${previewHtml(v, P, { idp: IDP })}</aside>
      </div>`;
  }
  /* the preview follows a typed value without a full redraw (the field keeps its caret) */
  function refreshPreviewOnly() {
    const box = creating() ? sheet.querySelector("[data-wid-preview]") : document.querySelector("#wid-panel [data-wid-preview]");
    if (box && P.draft) box.innerHTML = previewHtml(editable() ? P.draft : widgetOf(P.id).config, P, { idp: editable() ? IDP : "wid-p" });
  }
  const reheader = () => { const els = A().els || {}; if (!creating() && els.dosarProfilTitleRow && P.id) els.dosarProfilTitleRow.innerHTML = headerTop(widgetOf(P.id)); };

  /* ================================================================ CREATE SHEET (US-403) — the KPI create sheet structure
     (`.e-permits-ntpl-sheet.e-permits-reg-editor.e-permits-reg-editor--page`, css/registre.css): header, step strip,
     content and footer bar on one edge; × / Anulează / Esc with data → the leave confirmation */
  const STEPS = ["Date", "Tip", "Date afișate", "Aspect și acces", "Revizuire"];
  let sheet = null;
  const creating = () => Boolean(P.isNew && sheet && !sheet.hidden);
  const inSheet = (el) => creating() && sheet.contains(el);
  function ensureSheet() {
    if (sheet) return sheet;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="e-permits-ntpl-sheet e-permits-reg-editor e-permits-reg-editor--page e-permits-wid-editor" data-wid-editor hidden>
        <div class="e-permits-ntpl-sheet__scrim" aria-hidden="true" data-wid-ed-close></div>
        <div class="e-permits-ntpl-sheet__panel e-permits-reg-editor__panel" role="dialog" aria-modal="true" aria-labelledby="wid-ed-title" tabindex="-1">
          <button class="modal-close e-permits-reg-editor__close" type="button" aria-label="Închide" data-wid-ed-close>${icon("cross-large", 16)}</button>
          <header class="e-permits-page-header e-permits-reg-editor__header">
            <div class="e-permits-page-header__body"><div class="e-permits-page-header__top" data-wid-ed-top></div></div>
          </header>
          <nav class="e-permits-steps-strip" aria-label="Pașii creării" data-wid-ed-steps></nav>
          <div class="e-permits-reg-editor__body" data-wid-ed-body></div>
          <div class="e-permits-cfg2__bar e-permits-reg-editor__bar" role="region" aria-label="Pașii widget-ului" data-wid-ed-bar></div>
        </div>
      </div>`);
    sheet = document.querySelector("[data-wid-editor]");
    window.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !creating()) return;
      if (document.querySelector(".modal-overlay.is-active, [data-stack-menu]:not([hidden]), .e-permits-fo-select__list:not([hidden])")) return;
      if (sheet.querySelector("[aria-expanded='true']")) return;
      event.preventDefault();
      closeCreate();
    });
    return sheet;
  }
  const sheetScroller = () => sheet?.querySelector("[data-wid-ed-scroll]");
  /* Revizuire: whether it can be published + the passport blocks („Editează” → the step) */
  function stepReview(v) {
    const goto = (n) => `<button class="btn btn-text-neutral btn-sm" type="button" data-wid-goto="${n}">${icon("edit", 16)}<span>Editează</span></button>`;
    const problems = publishProblems(v);
    return `
      ${problems.length
        ? U().renderNotice?.("warning", `<strong>Widget-ul se poate salva ca ciornă, dar nu se poate publica încă.</strong> ${problems.map(esc).join(" ")}`) || ""
        : U().renderInfoNote?.("<strong>Combinația este compatibilă și previzualizarea se încarcă fără eroare.</strong> Widget-ul se poate publica.") || ""}
      ${readBlocks(v, { goto })}
      ${U().renderInfoNote?.(`Widget-ul se salvează la nivelul <strong>${esc(levelOfText(v))}</strong>, în statutul Ciornă. Utilizatorii BackOffice văd doar ultima versiune publicată.`) || ""}`;
  }
  function renderCreate({ keep = "" } = {}) {
    if (!P.isNew || !sheet || !P.draft) return;
    const active = document.activeElement;
    const keepSel = keep || (active && sheet.contains(active) && active.id ? `#${CSS.escape(active.id)}` : "");
    const caret = active && "selectionStart" in active ? [active.selectionStart, active.selectionEnd] : null;
    const scroll = sheetScroller()?.scrollTop || 0;
    const v = P.draft;
    const e = P.errors;
    sheet.querySelector("[data-wid-ed-top]").innerHTML = window.GEAPPageHeader?.top({
      title: P.from ? "Clonează widget-ul" : "Widget nou",
      titleId: "wid-ed-title",
      caption: P.from ? `Copie a ${P.from} · nivel ${levelOfText(v)} · primește un ID nou la salvare` : `Nivel ${levelOfText(v)} · ID-ul se generează la prima salvare`
    }) || `<h1 class="e-permits-page-header__title" id="wid-ed-title">${P.from ? "Clonează widget-ul" : "Widget nou"}</h1>`;
    sheet.querySelector("[data-wid-ed-steps]").innerHTML = A().renderStepStrip?.(STEPS, P, "data-wid-goto") || "";
    const form = [() => stepData(v, e, IDP), () => stepType(v, e, IDP), () => stepCalc(v, e, IDP), () => stepLook(v, e, IDP), () => stepReview(v)][P.step - 1]();
    sheet.querySelector("[data-wid-ed-body]").innerHTML = `
      <div class="e-permits-reg-editor__single e-permits-reg-editor__page" data-wid-ed-scroll>
        ${P.saveError ? `<div class="e-permits-reg-notices">${U().renderNotice?.("error", esc(SAVE_FAILED), { role: "alert" }) || ""}</div>` : ""}
        <div class="e-permits-ntpl-content e-permits-ntpl-content--preview e-permits-wid-create">
          <div class="e-permits-ntpl-content__main e-permits-wid-form">${form}</div>
          <aside class="e-permits-ntpl-content__preview" data-wid-preview>${previewHtml(v, P, { idp: IDP })}</aside>
        </div>
      </div>`;
    sheet.querySelector("[data-wid-ed-bar]").innerHTML = `
      <p class="e-permits-cfg2__bar-text" aria-live="polite">${esc(`Pasul ${P.step} din ${STEPS.length} · ${STEPS[P.step - 1]}`)}</p>
      <div class="e-permits-cfg2__bar-actions">
        ${P.step === 1 ? '<button class="btn btn-neutral btn-md" type="button" data-wid-ed-close>Anulează</button>' : '<button class="btn btn-neutral btn-md" type="button" data-wid-prev>Înapoi</button>'}
        <button class="btn btn-neutral btn-md" type="button" data-wid-save>Salvează ciorna</button>
        ${P.step < STEPS.length ? '<button class="btn btn-primary btn-md" type="button" data-wid-next>Continuă</button>' : '<button class="btn btn-primary btn-md" type="button" data-wid-publish>Publică</button>'}
      </div>`;
    if (sheetScroller() && keep !== "@top") sheetScroller().scrollTop = scroll;
    if (keepSel && keepSel !== "@top") {
      const el = sheet.querySelector(keepSel);
      el?.focus?.({ preventScroll: true });
      if (caret && el && "setSelectionRange" in el) { try { el.setSelectionRange(caret[0], caret[1]); } catch { /* not text */ } }
    }
  }
  /* forward = every step on the way is checked (the same rules as „Salvează ciorna” / „Publică”); back = free */
  function goStep(target) {
    if (target < 1 || target > STEPS.length) return;
    for (let s = P.step; s < target && s <= 4; s += 1) {
      const errors = validate(P.draft, { steps: [s] });
      if (Object.keys(errors).length) { P.errors = errors; showFirstError(errors); return; }
    }
    P.errors = {};
    P.step = target;
    P.maxStep = Math.max(P.maxStep, target);
    renderCreate({ keep: "@top" });
    if (sheetScroller()) sheetScroller().scrollTop = 0;
    sheet.querySelector("[data-wid-next], [data-wid-publish]")?.focus({ preventScroll: true });
  }
  function hideSheet() {
    if (!sheet || sheet.hidden) return;
    sheet.hidden = true;
    document.documentElement.classList.remove("is-reg-editor-open");
  }
  /* × / Anulează / Esc: with data → „Renunți la widget-ul nou?” (destructive); the page under it comes back as it was */
  function closeCreate(force = false) {
    if (!creating()) return;
    const close = () => {
      const back = beforeCreate?.back;
      hideSheet();
      const prev = beforeCreate || {};
      delete prev.back;
      Object.assign(P, { id: null, isNew: false, from: "", draft: null, base: null, errors: {}, saveError: false, ...prev, step: 1, maxStep: 1 });
      if (P.id && !P.draft) P.isNew = false;
      beforeCreate = null;
      if (back?.isConnected) back.focus({ preventScroll: true });
    };
    if (force || !pageDirty()) { close(); return; }
    U().askConfirm?.({ title: P.from ? "Renunți la copia widget-ului?" : "Renunți la widget-ul nou?", text: "Datele completate nu se păstrează.", confirmLabel: "Renunță", cancelLabel: "Continuă editarea", destructive: true }, close);
  }
  /* one redraw for the form, wherever it is (the create sheet or the profile page) */
  const rerender = (opts) => (creating() ? renderCreate(opts) : renderProfile(opts));

  /* ---- Versiuni (US-408): the ONE version history of the back office = GEAPEventTimeline („Versiuni publicate”, as
     Șabloane de notificare / Servicii / MDocs); an entry opens its version window (Compară · Restaurează · Închide) */
  function versionsTab(w) {
    const cur = lastVersion(w);
    const list = [...w.versions].reverse();
    const n = w.versions.length;
    const compareBtn = n + (unpublished(w) ? 1 : 0) > 1 && !P.compare ? `<button class="btn btn-secondary btn-sm" type="button" data-wid-compare-open>${icon("history", 16)}<span>Compară versiuni</span></button>` : "";
    const events = list.map((v) => ({
      at: v.at,
      user: v.by,
      type: `Versiunea ${v.version}${v.nr === cur.nr ? " · curentă" : ""}${/^Restaurare/.test(v.type) ? ` · ${v.type.toLocaleLowerCase("ro")}` : ""}`,
      status: "Reușit",
      detail: v.note
    }));
    return `
      ${n ? U().renderInfoNote?.(`Utilizatorii BackOffice văd doar ultima versiune publicată: <strong>${esc(String(cur.version))}</strong>. Fiecare publicare crește versiunea cu 1; restaurarea publică o versiune nouă cu configurația celei alese.`) || "" : ""}
      ${window.GEAPEventTimeline?.html("Versiuni publicate", events, { meta: n ? plural(n, "versiune", "versiuni") : "", actionHtml: compareBtn, empty: "Widget-ul nu a fost publicat încă.", openAttrs: (item, i) => `data-wid-ver-view="${list[i].nr}" aria-haspopup="dialog"` }) || ""}
      ${P.compare ? compareHtml(w) : ""}`;
  }
  /* the configurations that can be compared: every published version + the saved, unpublished configuration */
  const compareChoices = (w) => [...[...w.versions].reverse().map((v) => [String(v.nr), `Versiunea ${v.version} · ${longDate(v.at)}${v.nr === lastVersion(w).nr ? " (curentă)" : ""}`, v.config]), ...(unpublished(w) ? [["draft", "Modificările nepublicate", w.config]] : [])];
  /* field-level diff (Plane / Snowflake compare: before → after, only what changed) */
  /* → [{ label, before, after }] — before / after are already-escaped text („—” for an empty field) */
  function diffRows(a, b) {
    const ra = configRows(a);
    const rb = configRows(b);
    const text = (html) => html.replace(/<[^>]+>/g, "").trim() || "—";
    const out = [];
    rowPairs(ra, rb).forEach(([lbl, va, vb]) => { if (va !== vb) out.push({ label: lbl, before: text(va), after: text(vb) }); });
    return out;
  }
  /* „Modificări (N)”: the stacked list (field on its own line, no divider under the last row) with the Jurnal /
     RSSP-sync change value `.e-permits-event-diff` — previous value muted + struck through → new value. One renderer for
     the publish and restore dialogs and „Compară versiuni”. */
  const diffHtml = (c) => window.GEAPConfigPublish.diffHtml(c);
  const changesList = (changes, title = "Modificări") => window.GEAPConfigPublish.changesList(changes, title);
  /* „Compară versiuni” — blocks 24 apart (section rhythm, padding without gap), label → its widget 8; the changes = the
     same „Modificări (N)” list as the publish dialog */
  function compareHtml(w) {
    const choices = compareChoices(w);
    const pick = (key) => choices.find(([k]) => k === key) || choices[0];
    const [ka, la, ca] = pick(P.compare.a);
    const [kb, lb, cb] = pick(P.compare.b);
    const opts = choices.map(([k, l]) => [k, l]);
    const changes = ka === kb ? [] : diffRows(ca, cb);
    return `
      <section class="e-permits-dosar-profil__section e-permits-wid-compare" aria-labelledby="wid-compare-title">
        <div class="e-permits-dosar-profil__section-heading">
          <h2 class="e-permits-dosar-profil__section-title" id="wid-compare-title">Compară versiuni</h2>
          <div class="e-permits-passport__heading-tools"><button class="btn btn-neutral btn-sm" type="button" data-wid-compare-close>Închide comparația</button></div>
        </div>
        <div class="e-permits-ntpl-card">${grid(
          selectField("wid-cmp-a", "cmp.a", "Versiunea de bază", opts, ka, { span: 6 }),
          selectField("wid-cmp-b", "cmp.b", "Comparată cu", opts, kb, { span: 6 })
        )}</div>
        ${ka === kb
          ? U().renderInfoNote?.("Alege două versiuni diferite.") || ""
          : changes.length
            ? changesList(changes)
            : U().renderInfoNote?.("Cele două versiuni au aceeași configurație.") || ""}
        <div class="e-permits-wid-compare__grid">
          <div class="e-permits-wid-compare__col"><p class="e-permits-wid-compare__label">${esc(la)}</p>${cardHtml(ca, { st: { noAccess: true }, compact: true })}</div>
          <div class="e-permits-wid-compare__col"><p class="e-permits-wid-compare__label">${esc(lb)}</p>${cardHtml(cb, { st: { noAccess: true }, compact: true })}</div>
        </div>
      </section>`;
  }
  function historyTab(w) {
    const T = window.GEAPEventTimeline;
    const events = w.history.slice(0, 100).map((h) => ({ at: h.at, user: h.by, role: h.role, type: h.event, status: h.event === EVENTS.rejected ? "Respins" : "Reușit", ...(h.event === EVENTS.rejected ? { tone: "danger" } : {}), detail: h.detail || "", context: T?.contextOf?.(T.audit(journalEvent(h), journalCtx(w, h))) }));
    return T?.html("Jurnalul de audit", events, { meta: events.length ? "Cele mai noi primele · Jurnalizat prin MLog" : "", empty: "Pentru acest widget nu s-au înregistrat încă operații.", openAttrs: (item, i) => `data-wid-event="${i}"` }) || "";
  }
  /* an Istoric entry → its record in the unique Jurnalul de audit (the shell's US-262 event detail) */
  function openJournal(i) {
    const w = widgetOf(P.id);
    const h = w?.history[Number(i)];
    if (!h) return;
    const record = window.GEAPEventTimeline.audit(journalEvent(h), journalCtx(w, h));
    /* US-263: the shared „Modificări” (the seed / saved `changes`, else the „Câmp: vechi → nou · …” of an older entry) */
    A().openAuditEventDetail?.(record, { title: h.event, general: [["Denumirea evenimentului", esc(h.event)], ["Widget", esc(`${w.id} · ${w.config.titles.ro}`)]], changes: window.GEAPEventTimeline.changesOf(h) });
  }

  /* ---- version window (Compară · Restaurează · Închide) · restore (the library dialog) */
  const versionOf = (w, nr) => w.versions.find((v) => String(v.nr) === String(nr)) || null;
  function openVersion(nr) {
    const w = widgetOf(P.id);
    const v = versionOf(w, nr);
    if (!v) return;
    const isCurrent = v.nr === lastVersion(w).nr;
    G().openModal?.({
      kind: "wid-version",
      title: `Versiunea ${v.version}${isCurrent ? " · curentă" : ""}`,
      subtitle: w.config.titles.ro,
      body: `
        <div class="e-permits-dosar-profil__card">${[["Tipul modificării", esc(v.type)], ["Data", esc(`${longDate(v.at)}, ${time(v.at)}`)], ["Autor", esc(v.by)], ["Ce s-a schimbat", esc(v.note)]].map((r) => G().detailRow?.(r) || "").join("")}</div>
        ${cardHtml(v.config, { st: { noAccess: true }, compact: true })}
        ${readBlocks(v.config)}`,
      footer: `<div class="modal-buttons">${isCurrent ? "" : `<button class="btn btn-neutral btn-rounded" type="button" data-wid-ver-compare="${v.nr}">Compară cu versiunea curentă</button>${canEdit(w) && w.status !== "Dezactivat" ? `<button class="btn btn-neutral btn-rounded" type="button" data-wid-ver-restore="${v.nr}">${icon("rotate-arrow")}<span>Restaurează</span></button>` : ""}`}<button class="btn btn-primary btn-rounded" type="button" data-case-close>Închide</button></div>`
    });
  }
  let restoring = null;
  function openRestore(nr) {
    const w = widgetOf(P.id);
    const v = versionOf(w, nr);
    if (!w || !v || !canEdit(w)) return;
    restoring = { id: w.id, nr: v.nr };
    const next = (lastVersion(w)?.version || 0) + 1;
    const changes = diffRows(lastVersion(w).config, v.config);
    G().openModal?.({
      kind: "wid-restore",
      title: `Restaurare versiune ${v.version}`,
      subtitle: w.config.titles.ro,
      body: `
        ${U().renderNotice?.(unpublished(w) || pageDirty() ? "warning" : "info", `<strong>Versiunea ${next} reia configurația versiunii ${v.version}.</strong> Utilizatorii BackOffice o văd imediat după restaurare.${unpublished(w) || pageDirty() ? " Modificările nepublicate se pierd." : ""}`) || ""}
        ${changes.length ? changesList(changes) : ""}
        ${areaField("wid-restore-note", "restoreNote", "Ce s-a schimbat", "", { required: true, placeholder: "De ce revii la această versiune", hint: "Apare în istoricul versiunilor." })}`,
      footer: '<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-wid-restore-confirm>Restaurează</button></div>'
    });
  }
  /* the shared note-field error (js/config-publish.js — one code path with the dashboards) */
  const setModalError = (field, message) => window.GEAPConfigPublish.setModalError(field, message);
  function confirmRestore() {
    if (!restoring) return;
    const field = document.querySelector("#wid-restore-note");
    const note = field?.value.trim() || "";
    if (!note) { setModalError(field, "Descrie ce s-a schimbat."); return; }
    const w = widgetOf(restoring.id);
    const v = versionOf(w, restoring.nr);
    if (demo.has("eroare")) { G().closeModal?.(); toast(SAVE_FAILED, "error"); restoring = null; return; }
    const next = lastVersion(w).version + 1;
    w.config = clone(v.config);
    w.versions.push({ nr: w.versions.length + 1, version: next, type: `Restaurare (din versiunea ${v.version})`, note, at: nowIso(), by: userName(), config: clone(v.config) });
    w.status = "Publicat";
    audit(w, "restore", `Versiunea ${v.version} → versiunea ${next} · ${note}`);
    restoring = null;
    P.compare = null; P.draft = clone(w.config); P.base = clone(w.config);
    G().closeModal?.();
    renderProfile();
    refreshList();
    toast(`Versiunea ${v.version} a fost restaurată ca versiunea ${next}.`);
  }

  /* ---- publish (US-406): problems block it (also shown inline in the form), otherwise version + 1 */
  let publishing = null;
  /* „Modificări nepublicate” in the profile header → the shared pending-changes dialog (as Servicii / Șabloane): the
     difference between the published version and the saved configuration, Publică continues to the publish dialog */
  function openPending() {
    const w = widgetOf(P.id);
    const last = w && lastVersion(w);
    if (!last) return;
    const changes = diffRows(last.config, w.config).map((c) => ({ area: c.label, detail: `${c.before} → ${c.after}`, at: w.updatedAt || "", user: w.updatedBy || "", status: "Modificat" }));
    A().openPendingChanges?.({ subject: `${w.config.titles.ro} · față de versiunea ${last.version}`, changes, onPublish: editable(w) ? () => openPublish() : null });
  }
  function openPublish() {
    if (!P.draft && !P.id) return;
    publishing = { id: P.id };
    const v = editable() ? P.draft : widgetOf(P.id).config;
    if (editable() && publishProblems(v).length) { P.errors = validate(v); rerender(); }
    renderPublish();
  }
  function renderPublish() {
    const w = publishing.id ? widgetOf(publishing.id) : null;
    const v = editable(w) ? P.draft : w.config;
    const problems = publishProblems(v);
    const cur = w ? lastVersion(w) : null;
    const next = (cur?.version || 0) + 1;
    const changes = cur ? diffRows(cur.config, v) : [];
    const note = document.querySelector("#wid-publish-note")?.value || "";
    G().openModal?.({
      kind: "wid-publish",
      title: "Publicare widget",
      subtitle: v.titles.ro || "Widget nou",
      body: `
        ${problems.length
          ? U().renderNotice?.("error", `<strong>Widget-ul nu se poate publica.</strong> ${problems.map(esc).join(" ")}`, { role: "alert" }) || ""
          : U().renderNotice?.("info", cur
            ? `<strong>Versiunea ${next} o înlocuiește pe versiunea ${esc(String(cur.version))}.</strong> ${changes.length ? "Utilizatorii BackOffice văd noua versiune imediat după publicare." : "Configurația este aceeași ca în versiunea în vigoare."}`
            : `<strong>Prima publicare: versiunea ${next}.</strong> Widget-ul devine disponibil la alcătuirea tablourilor de bord.`) || ""}
        ${!problems.length && changes.length ? changesList(changes) : ""}
        ${areaField("wid-publish-note", "publishNote", "Ce s-a schimbat", note, { required: true, placeholder: "De ex. comparație cu săptămâna precedentă", hint: "Apare în istoricul versiunilor." })}`,
      footer: `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-wid-publish-confirm${problems.length ? ' aria-disabled="true" data-tooltip-reason="Rezolvă mai întâi problemele de mai sus."' : ""}>Publică</button></div>`
    });
  }
  function confirmPublish(button) {
    if (!publishing) return;
    const w0 = publishing.id ? widgetOf(publishing.id) : null;
    const v = editable(w0) ? P.draft : w0.config;
    if (button.getAttribute("aria-disabled") === "true") { if (w0) audit(w0, "rejected", publishProblems(v).join(" ")); return; }
    const field = document.querySelector("#wid-publish-note");
    const note = field?.value.trim() || "";
    if (!note) { setModalError(field, "Descrie ce s-a schimbat."); return; }
    if (demo.has("eroare")) { G().closeModal?.(); toast(SAVE_FAILED, "error"); publishing = null; return; }
    const w = editable(w0) ? savePage({ silent: true }) : w0;
    if (!w) { G().closeModal?.(); return; }
    const next = (lastVersion(w)?.version || 0) + 1;
    w.versions.push({ nr: w.versions.length + 1, version: next, type: next === 1 ? "Prima publicare" : "Publicare", note, at: nowIso(), by: userName(), config: clone(w.config) });
    w.status = "Publicat";
    audit(w, "publish", `Versiunea ${next} · ${note}`);
    publishing = null;
    G().closeModal?.();
    toast(`Versiunea ${next} a widget-ului „${w.config.titles.ro}” a fost publicată.`);
    openProfile(w.id, "configurare", { push: false });
    refreshList();
  }

  /* ---- save (US-403 „Salvează ciorna” · US-405 „Salvează”): step „Date” (title + source) is the minimum of a draft */
  const ERROR_SEL = { "titles.ro": "title-ro", source: "source", type: "type", kpi: "kpi", measure: "measure", column: "column", primary: "primary", secondary: "secondary", dateGroup: "dategroup", filter: "rule-col-0", "threshold.value": "threshold", visibility: "visibility" };
  const errorSel = (key) => { const m = /^rule\.(\d+)$/.exec(key); return m ? `#${IDP}-rule-value-${m[1]}` : `#${IDP}-${ERROR_SEL[key] || key}`; };
  function showFirstError(errors) {
    const key = Object.keys(errors)[0];
    const keep = key === "type" ? `#${IDP}-type input:not(:disabled)` : key === "visibility" ? `#${IDP}-visibility input:not(:disabled)` : errorSel(key);
    if (creating()) { P.step = STEP_OF(key); P.maxStep = Math.max(P.maxStep, P.step); renderCreate({ keep }); }
    else renderProfile({ keep });
    (creating() ? sheet : document).querySelector(errorSel(key))?.closest(".e-permits-fo-field, .e-permits-doc-cond, .e-permits-wid-types, .e-permits-dosar-profil__section")?.scrollIntoView({ block: "center" });
  }
  function savePage({ silent = false } = {}) {
    const errors = validate(P.draft, { steps: [1] });
    if (Object.keys(errors).length) { P.errors = errors; showFirstError(errors); return null; }
    if (demo.has("eroare")) { P.saveError = true; rerender(); return null; }
    const me = who();
    let w = P.isNew ? null : widgetOf(P.id);
    if (w) {
      const changed = changedFields();
      w.config = clone(P.draft);
      if (w.level !== "Global") Object.assign(w, levelOf(w.config));
      /* US-263: the event keeps the changed fields (field · previous · new) for its „Modificări” */
      const plain = (v) => String(v || "").replace(/<[^>]+>/g, "");
      if (Object.keys(changed).length) audit(w, "edit", Object.entries(changed).map(([lbl, [a, b]]) => `${lbl}: ${plain(a) || "—"} → ${plain(b) || "—"}`).join(" · "), Object.entries(changed).map(([lbl, [a, b]]) => ({ field: plain(lbl), before: plain(a), after: plain(b) })));
    } else {
      const nums = all().map((x) => Number(x.id.split("-")[1]) || 0);
      const id = `WGT-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, "0")}`;
      w = { id, ...levelOf(P.draft, me), status: "Ciornă", offFor: [], createdAt: nowIso(), createdBy: userName(), updatedAt: nowIso(), updatedBy: userName(), config: clone(P.draft), versions: [], history: [] };
      all().push(w);
      audit(w, P.from ? "clone" : "create", P.from ? `Din ${P.from} · ${levelText(w)}` : `Ciornă · ${levelText(w)} · ${sourceName(w.config.source)}${w.config.type ? ` · ${typeLabel(w.config.type)}` : ""}`);
    }
    const wasNew = P.isNew;
    Object.assign(P, { id: w.id, isNew: false, from: "", errors: {}, saveError: false, base: clone(P.draft), compare: null });
    /* a new widget leaves the create sheet: from now on it is edited on its profile page */
    if (wasNew) { hideSheet(); beforeCreate = null; }
    if (!silent) {
      if (wasNew) openProfile(w.id, "configurare");
      else { renderProfile({ keep: "[data-wid-save]" }); A().writeHash?.(`#widget/${w.id}/configurare`, { push: false }); }
      toast(wasNew ? `Ciorna widget-ului ${w.id} a fost salvată.` : "Modificările au fost salvate.");
      refreshList();
    }
    return w;
  }
  function discard() {
    if (P.isNew) { closeProfile(); return; }
    const w = widgetOf(P.id);
    P.draft = clone(w.config); P.base = clone(w.config); P.errors = {}; P.saveError = false;
    renderProfile();
  }
  /* the unsaved status opens the shared review modal (as KPI / Registre): undo one field, discard, save */
  let changeSourceDone = false;
  const registerChangeSource = () => {
    if (changeSourceDone || !A().registerChangeSource) return;
    changeSourceDone = true;
    A().registerChangeSource("wid-draft", () => {
      if (!P.draft || P.isNew) return null;
      return {
        name: P.draft.titles.ro, applies: "se aplică după Salvează", emptyText: "Widget-ul este salvat.", groups: ["Configurare"],
        entries: () => Object.entries(changedFields()).map(([lbl, [a, b]]) => ({ undo: lbl, group: "Configurare", title: lbl, tag: ["Modificat", "brand"], detail: `${a.replace(/<[^>]+>/g, "") || "—"} → ${b.replace(/<[^>]+>/g, "") || "—"}` })),
        undo: () => discard(),
        /* changes-reveal-v1: „Vezi” → the Configurare tab, the section of that setting */
        reveal: async (lbl) => {
          if (P.tab !== "configurare") await openProfile(P.id, "configurare", { push: false });
          const panel = document.querySelector("#wid-panel");
          const alias = { Tip: "Tipul widget-ului", "Coloana măsurată": "Ce se măsoară", "Ținta": "Ce se măsoară", "Criteriul principal": "Gruparea", "Criteriul secundar": "Gruparea", "Gruparea datei": "Gruparea", "Ordinea categoriilor": "Gruparea", Format: "Format, praguri și culori", Praguri: "Format, praguri și culori", Culori: "Format, praguri și culori", "Perioada de comparație": "Comparație", "Lățimea implicită": "Dimensiunile implicite", "Înălțimea implicită": "Dimensiunile implicite", "Subtitlu și descriere": "Titlu și descriere" }[lbl];
          return A().sectionOfLabel?.(panel, alias || lbl) || (alias ? null : A().sectionOfLabel?.(panel, "Titlu și descriere"));
        },
        discard,
        save: () => savePage()
      };
    });
  };
  /* leaving the page with unsaved edits (menu, back chevron, browser) */
  let leaving = false;
  function guardLeave(event, proceed) {
    if (leaving || !profileOpen() || !pageDirty()) return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    U().askConfirm?.({
      title: P.isNew ? "Renunți la widget-ul nou?" : "Există modificări nesalvate. Părăsești widget-ul?",
      text: P.isNew ? "Datele completate nu se păstrează." : "Modificările nesalvate ale widget-ului se pierd.",
      confirmLabel: "Renunță",
      cancelLabel: "Continuă editarea",
      destructive: true
    }, () => { P.draft = null; P.isNew = false; leaving = true; try { proceed(); } finally { leaving = false; } });
    return true;
  }
  document.addEventListener("click", (event) => {
    const nav = event.target.closest?.("[data-nav-item]");
    if (nav) { guardLeave(event, () => nav.click()); return; }
    const back = event.target.closest?.("[data-wid-back]");
    if (back) guardLeave(event, () => closeProfile());
  }, true);
  window.addEventListener("beforeunload", (event) => { if ((profileOpen() || creating()) && pageDirty()) { event.preventDefault(); event.returnValue = ""; } });

  /* ---- „Mărește”: the preview at the dialog's width (wide tables, heat maps) */
  function openZoom() {
    const v = editable() ? P.draft : widgetOf(P.id)?.config;
    if (v) openFull(v, { st: P });
  }
  /* „Mărește” (preview) and „Vezi tot” (a card that hides rows to keep its height, preview or dashboard): the whole widget,
     full width, at its content height */
  function openFull(v, { st = {}, subtitle = `Previzualizare · ${label(WIDTHS, "full")}` } = {}) {
    G().openModal?.({
      kind: "wid-zoom",
      title: v.titles.ro || "Previzualizare",
      subtitle,
      body: cardHtml({ ...v, width: "full" }, { st, natural: true }),
      footer: '<div class="modal-buttons"><button class="btn btn-primary btn-rounded" type="button" data-case-close>Închide</button></div>'
    });
    document.querySelector("#case-action-modal .modal")?.classList.replace("modal--md", "modal--lg");
  }

  /* ================================================================ events */
  const profileRoot = () => (profileOpen() ? A().els?.dosarProfilPanel || document.querySelector("[data-dosar-profil]") : null);
  const inPage = (el) => { if (inSheet(el)) return Boolean(P.draft); const root = profileRoot(); return Boolean(root && root.contains(el) && P.draft && editable()); };
  function refreshPreview() {
    P.refreshing = true;
    refreshPreviewOnly();
    window.setTimeout(() => { P.refreshing = false; P.refreshedAt = nowIso(); if (profileOpen() || creating()) refreshPreviewOnly(); }, 900);
  }
  document.addEventListener("click", (event) => {
    const t = event.target;
    if (!t.closest) return;
    /* list */
    if (t.closest('[data-workplace-add-product="wid-new"], [data-wid-new]')) { event.preventDefault(); openNew(); return; }
    const rowEdit = t.closest("[data-wid-row-edit]");
    if (rowEdit) { openProfile(rowEdit.dataset.widRowEdit, "configurare"); return; }
    const rowClone = t.closest("[data-wid-row-clone]");
    if (rowClone) { openNew({ from: rowClone.dataset.widRowClone }); return; }
    const rowToggle = t.closest("[data-wid-row-toggle]");
    if (rowToggle) { const w = widgetOf(rowToggle.dataset.widRowToggle); if (w) setStatus(w, w.status === "Dezactivat", refreshList); return; }
    const rowAuth = t.closest("[data-wid-row-auth]");
    if (rowAuth) { const w = widgetOf(rowAuth.dataset.widRowAuth); if (w) setAuthActive(w, isOffFor(w, who().authority), refreshList); return; }
    /* drill-down (preview): what the click opens on a dashboard */
    const drill = t.closest("[data-wid-drill]");
    if (drill) {
      const v = P.draft || widgetOf(P.id)?.config;
      if (v) toast(`Pe tabloul de bord, clicul deschide înregistrările „${drill.dataset.widDrill}” (${drill.dataset.widDrillValue}) în ${sourceName(v.source)}.`, "info");
      return;
    }
    if (t.closest("[data-wid-refresh]")) { refreshPreview(); return; }
    if (t.closest("[data-wid-zoom]")) { openZoom(); return; }
    if (t.closest(".e-permits-wid-preview [data-wid-all]")) { openZoom(); return; }
    const as = t.closest("[data-wid-viewas]");
    if (as) { P.noAccess = as.dataset.widViewas === "fara-acces"; refreshPreviewOnly(); document.querySelector(`[data-wid-viewas="${as.dataset.widViewas}"]`)?.focus(); return; }
    /* dialogs */
    const pub = t.closest("[data-wid-publish-confirm]");
    if (pub) { confirmPublish(pub); return; }
    if (t.closest("[data-wid-restore-confirm]")) { confirmRestore(); return; }
    const vcmp = t.closest("[data-wid-ver-compare]");
    if (vcmp) { const w = widgetOf(P.id); G().closeModal?.(); P.compare = { a: vcmp.dataset.widVerCompare, b: String(lastVersion(w).nr) }; renderProfile(); document.querySelector("#wid-compare-title")?.scrollIntoView({ block: "start" }); return; }
    const vrs = t.closest("[data-wid-ver-restore]");
    if (vrs) { openRestore(vrs.dataset.widVerRestore); return; }
    /* the create sheet */
    if (inSheet(t)) {
      if (t.closest("[data-wid-ed-close]")) { event.preventDefault(); closeCreate(); return; }
      if (t.closest("[data-wid-prev]")) { goStep(P.step - 1); return; }
      if (t.closest("[data-wid-next]")) { goStep(P.step + 1); return; }
      const g = t.closest("[data-wid-goto]");
      if (g) { goStep(Number(g.dataset.widGoto)); return; }
      if (t.closest("[data-wid-save]")) { savePage(); return; }
      if (t.closest("[data-wid-publish]")) { openPublish(); return; }
    } else {
      /* profile */
      if (t.closest("[data-wid-pending]")) { openPending(); return; }
      const root = profileRoot();
      if (!root || !root.contains(t)) return;
      const tab = t.closest("[data-wid-tab]");
      if (tab) { P.tab = tab.dataset.widTab; renderProfile({ keep: `#wid-tab-${P.tab}` }); if (P.id) A().writeHash?.(`#widget/${P.id}/${P.tab}`, { push: false }); return; }
      const sv = t.closest("[data-wid-save]");
      if (sv) { if (sv.getAttribute("aria-disabled") !== "true") savePage(); return; }
      if (t.closest("[data-wid-publish]")) { openPublish(); return; }
      if (t.closest("[data-wid-clone]")) { openNew({ from: P.id }); return; }
      if (t.closest("[data-wid-toggle]")) { const w = widgetOf(P.id); setStatus(w, w.status === "Dezactivat", () => { if (w.status !== "Dezactivat") { P.draft = clone(w.config); P.base = clone(w.config); } renderProfile(); refreshList(); }); return; }
      if (t.closest("[data-wid-auth]")) { const w = widgetOf(P.id); setAuthActive(w, isOffFor(w, who().authority), () => { renderProfile(); refreshList(); }); return; }
      const view = t.closest("[data-wid-ver-view]");
      if (view) { openVersion(view.dataset.widVerView); return; }
      const ev = t.closest("[data-wid-event]");
      if (ev) { openJournal(ev.dataset.widEvent); return; }
      if (t.closest("[data-wid-compare-open]")) {
        const w = widgetOf(P.id);
        const ch = compareChoices(w);
        P.compare = unpublished(w) ? { a: String(lastVersion(w).nr), b: "draft" } : { a: ch[1]?.[0] || ch[0][0], b: ch[0][0] };
        renderProfile({ keep: "#wid-cmp-a" });
        return;
      }
      if (t.closest("[data-wid-compare-close]")) { P.compare = null; renderProfile({ keep: "[data-wid-compare-open]" }); return; }
      if (t.closest("[data-wid-back]")) { event.preventDefault(); closeProfile(); return; }
    }
    if (!inPage(t)) return;
    /* the form */
    if (t.closest("[data-wid-rule-add]")) { P.draft.filter.rules.push({ column: "", op: "is", value: "" }); delete P.errors.filter; rerender({ keep: `#${IDP}-rule-col-${P.draft.filter.rules.length - 1}` }); return; }
    const rm = t.closest("[data-wid-rule-remove]");
    if (rm) { P.draft.filter.rules.splice(Number(rm.dataset.widRuleRemove), 1); Object.keys(P.errors).filter((k) => k.startsWith("rule.")).forEach((k) => delete P.errors[k]); rerender({ keep: "[data-wid-rule-add]" }); }
  });
  document.addEventListener("keydown", (event) => {
    const tab = event.target.closest?.("[data-wid-tab]");
    if (!tab || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    const tabs = P.isNew ? TABS.slice(0, 1) : TABS;
    const i = tabs.findIndex(([id]) => id === tab.dataset.widTab);
    const next = tabs[(i + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length][0];
    event.preventDefault();
    P.tab = next;
    renderProfile({ keep: `#wid-tab-${next}` });
  });
  /* typing: the draft follows without a redraw (counters live); the preview + header follow */
  document.addEventListener("input", (event) => {
    const el = event.target;
    if (!el.closest || !inPage(el)) return;
    const rule = el.closest("[data-wid-rule]");
    if (rule && el.tagName === "INPUT") { P.draft.filter.rules[Number(rule.dataset.widRule)].value = el.value; refreshPreviewOnly(); reheader(); return; }
    const field = el.closest("[data-wid-field]");
    if (!field || field.tagName === "SELECT" || field.type === "checkbox" || field.dataset.widField.startsWith("cmp.")) return;
    setPath(P.draft, field.dataset.widField, field.value);
    const count = document.querySelector(`[data-wid-count="${field.id}"]`);
    if (count) { const max = field.tagName === "TEXTAREA" ? TEXT_MAX : TITLE_MAX; count.textContent = `${field.value.length}/${max}`; count.classList.toggle("is-over", field.value.length > max); }
    refreshPreviewOnly();
    reheader();
  });
  document.addEventListener("change", (event) => {
    const el = event.target;
    if (!el.closest) return;
    /* the comparison pickers (profile) */
    if (el.matches('[data-wid-field="cmp.a"], [data-wid-field="cmp.b"]')) { P.compare = { ...P.compare, [el.dataset.widField.slice(4)]: el.value }; renderProfile({ keep: `#wid-cmp-${el.dataset.widField.slice(4)}` }); return; }
    if (!inPage(el)) return;
    const v = P.draft;
    const fid = (node) => node.closest(".e-permits-fo-field, .e-permits-doc-cond__cell, .e-permits-doc-cond__join")?.querySelector("button[id], input[id]")?.id || "";
    if (el.matches("[data-wid-type]")) {
      v.type = el.value;
      if (v.type === "tile") v.height = "compact";
      delete P.errors.type;
      /* sensible defaults so the preview draws at once (Shopify „recommended”): a compatible primary criterion … */
      if (DATE_AXIS.includes(v.type) && !isDate(v.source, v.primary)) { v.primary = dateCols(v.source)[0]?.key || ""; v.dateGroup = v.dateGroup || "month"; }
      else if (NEEDS_PRIMARY(v.type) && !v.primary) v.primary = fieldsOf(v.source).find((f) => f.type === "enum")?.key || "";
      if (v.type === "stacked" && !v.secondary) v.secondary = fieldsOf(v.source).find((f) => f.type === "enum" && f.key !== v.primary && f.key === "statut")?.key || fieldsOf(v.source).find((f) => f.type === "enum" && f.key !== v.primary)?.key || "";
      if (v.type === "heatmap" && !v.secondary) { v.secondary = dateCols(v.source)[0]?.key || ""; v.dateGroup = v.dateGroup || "month"; }
      if (!SECONDARY[v.type]) v.secondary = "";
      if (!needsDateGroup(v)) v.dateGroup = "";
      rerender({ keep: `#${IDP}-type input[value="${el.value}"]` });
      return;
    }
    if (el.matches("[data-wid-pal]")) { v.palette = el.value; rerender({ keep: `#${IDP}-palette input[value="${el.value}"]` }); return; }
    if (el.matches("[data-wid-vis]")) { v.visibility = el.value; delete P.errors.visibility; rerender({ keep: `#${IDP}-visibility input[value="${el.value}"]` }); return; }
    const rule = el.closest("[data-wid-rule]");
    if (rule) {
      const i = Number(rule.dataset.widRule);
      const r = v.filter.rules[i];
      const which = el.dataset.widRulePart;
      if (el.tagName === "INPUT") { r.value = el.value; return; }
      r[which] = el.value;
      if (which === "column") r.value = "";
      if (which === "op" && NO_VALUE.includes(r.op)) r.value = "";
      delete P.errors[`rule.${i}`];
      rerender({ keep: fid(el) ? `#${CSS.escape(fid(el))}` : "" });
      return;
    }
    if (el.matches("[data-wid-rule-logic]")) { v.filter.logic = el.value; rerender({ keep: fid(el) ? `#${CSS.escape(fid(el))}` : "" }); return; }
    const field = el.closest("[data-wid-field]");
    if (!field || (field.tagName !== "SELECT" && field.type !== "checkbox")) return;
    const key = field.dataset.widField;
    const value = field.type === "checkbox" ? field.checked : field.value;
    const old = getPath(v, key);
    setPath(v, key, value);
    delete P.errors[key];
    if (key === "source" && value !== old) {
      /* a new source: its columns replace the old ones; a KPI of another source drops */
      const keepCol = (col) => (fieldOf(value, col) ? col : "");
      v.column = keepCol(v.column); v.primary = keepCol(v.primary); v.secondary = keepCol(v.secondary);
      v.filter.rules = v.filter.rules.filter((r) => fieldOf(value, r.column));
      if (v.kpi && kpiOf(v.kpi)?.source !== value) v.kpi = "";
    }
    if (key === "kpi") delete P.errors.type;
    if (key === "measure") { if (!measureColumns(v).some((f) => f.key === v.column)) v.column = ""; if (value === "count") v.column = ""; }
    if (key === "column") { const t = fieldOf(v.source, value)?.type; if (t === "duration" && v.measure !== "distinct") v.format = "duration"; else if (t === "amount") v.format = "amount"; else if (["duration", "amount"].includes(v.format)) v.format = "number"; }
    if (key === "primary" || key === "secondary") { if (needsDateGroup(v) && !v.dateGroup) v.dateGroup = "month"; if (!needsDateGroup(v)) v.dateGroup = ""; }
    rerender({ keep: fid(field) ? `#${CSS.escape(fid(field))}` : `[data-wid-field="${key}"]` });
  });

  /* ---------------------------------------------------------------- routes + denied (Feature AC) */
  function showDenied() {
    document.querySelectorAll("[data-nav-item].is-active").forEach((link) => { link.classList.remove("is-active"); link.removeAttribute("aria-current"); });
    G().showPage?.(TITLE, E()?.render({ title: DENIED, text: "Meniul „Widgete” este disponibil rolurilor cu permisiunea „Gestionarea widget-urilor”.", icon: "lock" }) || DENIED);
  }
  window.GEAPShellRoutes = window.GEAPShellRoutes || [];
  window.GEAPShellRoutes.push((h) => {
    if (h === `#${NAV}`) {
      const nav = document.querySelector(`[data-nav-item][data-nav-id="${NAV}"]`);
      if (nav && who().has) nav.click(); else showDenied();
      return true;
    }
    const m = /^#widget\/([^/]+)(?:\/([a-zA-Z0-9-]+))?$/.exec(h);
    if (!m) return false;
    if (!who().has) { showDenied(); return true; }
    /* a direct link to the create sheet: the list under it, then the sheet */
    if (m[1] === "nou") {
      if (!creating()) { document.querySelector(`[data-nav-item][data-nav-id="${NAV}"]`)?.click(); openNew({ from: (m[2] || "").replace(/^din-/, "") }); }
      return true;
    }
    load().then(() => openProfile(decodeURIComponent(m[1]), m[2] || "configurare", { push: false }));
    return true;
  });
  /* Feature AC: the menu item exists only with „Gestionarea widget-urilor” — the roles.json menus list it for the two
     administrators and (hidden) for the Supervisor; without the permission the item goes */
  let navQueued = false;
  const syncNav = () => {
    navQueued = false;
    const has = who().has;
    document.querySelectorAll(`[data-nav-item][data-nav-id="${NAV}"]`).forEach((a) => { const li = a.closest("li") || a; if (li.hidden === has) li.hidden = !has; });
  };
  const boot = () => {
    load();
    new MutationObserver(() => { if (!navQueued) { navQueued = true; requestAnimationFrame(syncNav); } }).observe(document.body, { childList: true, subtree: true });
    syncNav();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();

  /* ---------------------------------------------------------------- for dashboards (Features 96586 / 96498), demo states */
  window.GEAPWidgets = {
    load, openProfile, openNew, refreshList, perms: () => who(),
    list: () => widgets(),
    get: widgetOf,
    /* Feature AC: BackOffice users see only the last published version */
    published: (id) => { const w = widgetOf(id); return w && w.status === "Publicat" ? lastVersion(w)?.config || null : null; },
    card: (config, opts) => cardHtml(config, opts),
    aggregate,
    /* the widget model's labels, reused by Tablouri de bord (js/dashboard-admin.js) */
    typeLabel, levelText, isOffFor, WIDTHS, HEIGHTS, heightKey, heightOf, openFull
  };
})();
