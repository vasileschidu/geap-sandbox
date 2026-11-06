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
     · profile = the shared profile panel: tabs Configurare (passport blocks + live preview aside) · Versiuni (the
       Registre versions table + „Compară versiuni”) · Istoric (GEAPEventTimeline = the audit trail);
     · „Widget nou” / „Editează” / „Clonează” = the Registre full-screen sheet (`.e-permits-ntpl-sheet.e-permits-reg-editor`)
       with the step strip, the form left and the live preview right (`__grid--2`), the cfg2 save bar;
     · publish / restore / version view = the library dialog (#case-action-modal via GEAPRegistre.openModal);
       deactivate = askConfirm (destructive);
     · charts = js/widget-charts.js (the eKYC SVG chart style, 11 types).
   New (components.md › „Widgete”): the chart-type gallery `.e-permits-wid-types`, the widget card head / states, the
   version comparison `.e-permits-wid-compare`, the chart types of js/widget-charts.js.
   Routes: #widgete (list) · #widget/<id>/<configurare|versiuni|istoric>.
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
  const DENIED = "Nu aveți permisiunea de a accesa această pagină.";
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
  const HEIGHTS = [["small", "Mică"], ["medium", "Medie"], ["large", "Mare"]];
  const VIS = [
    ["role", "Strict aria de responsabilitate a rolului", "Fiecare utilizator vede doar dosarele din aria lui de responsabilitate."],
    ["subdivision", "Subdiviziune", "Utilizatorul vede datele subdiviziunii lui."],
    ["authority", "Autoritate", "Utilizatorul vede datele autorității lui."],
    ["global", "Global", "Toate datele, din toate autoritățile."]
  ];
  const BELOW = [["warning", "Portocaliu (avertizare)"], ["danger", "Roșu (critic)"]];
  const OPS = [["is", "este"], ["isNot", "nu este"], ["contains", "conține"], ["empty", "este gol"], ["notEmpty", "are valoare"]];
  const NO_VALUE = ["empty", "notEmpty"];
  const NUMERIC = ["number", "duration", "amount"];
  const label = (list, key) => list.find(([k]) => k === key)?.[1] || "";
  /* where each field applies (Feature model: „la …”) */
  const NEEDS_PRIMARY = (t) => !["tile", "rowTable"].includes(t);
  const SECONDARY = { heatmap: "required", stacked: "optional", line: "optional", aggTable: "optional" };
  const ORDERED = ["bars", "stacked", "pie", "funnel", "aggTable", "rowTable"];
  const DATE_AXIS = ["line", "control"];
  const KPI_TYPES = ["bars", "line", "control", "tile", "aggTable"];
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
  const roleLabel = () => { const w = who(); return w.central ? w.roleLabel || "Administrator central" : `${w.roleLabel || "Administrator local"} · ${authName(w.authority)}`; };

  /* ---------------------------------------------------------------- data */
  const S = { data: null, loading: null };
  function load() {
    if (S.data) return Promise.resolve(S.data);
    if (demo.has("incarcare")) return new Promise(() => {});
    if (!S.loading) {
      S.loading = Promise.all([
        fetch("data/widgets.json?v=widget-v1").then((r) => r.json()),
        K().load ? K().load() : Promise.resolve(null)
      ]).then(([json]) => {
        if (demo.has("gol")) json.widgets = [];
        json.widgets.forEach((w) => {
          w.offFor = w.offFor || [];
          w.history = w.history || [];
          w.versions = (w.versions || []).map((v) => ({ ...v, config: v.config || clone(w.config) }));
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
      reason: i >= reach ? (key === "global" ? "Doar Administratorul central dă widget-urilor aria globală." : `Depășește perimetrul rolului dvs. (${me.subdivision || authName(me.authority)}).`) : ""
    }));
  }
  const defaultVis = (me = who()) => (me.supervisor ? "subdivision" : "authority");
  /* the data the author previews: his own perimeter (Feature: „îl previzualizează pe date reale, în perimetrul lui”) */
  const perimeter = (me = who()) => (me.central ? { scope: "all", text: "toate autoritățile" } : me.supervisor ? { scope: "subdivision", text: `${me.subdivision}, ${authName(me.authority)}` } : { scope: "authority", text: authName(me.authority) });

  /* ================================================================ compatibility + validation (W5) */
  const blankConfig = () => ({
    titles: { ro: "", ru: "", en: "" }, subtitles: { ro: "", ru: "", en: "" }, source: "", type: "", kpi: "", measure: "count", column: "",
    primary: "", secondary: "", dateGroup: "", order: "source", filter: { logic: "and", rules: [] }, compare: "",
    format: "number", threshold: { on: false, value: "", below: "warning" }, width: "half", height: "medium", drill: true, visibility: defaultVis()
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
    if (v.kpi && !KPI_TYPES.includes(type)) return "Nu se folosește cu un KPI din catalog.";
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
      if (!String(v.titles.ro || "").trim()) e["titles.ro"] = "Completați titlul în limba română.";
      else if (v.titles.ro.length > TITLE_MAX) e["titles.ro"] = `Titlul poate avea cel mult ${TITLE_MAX} de caractere.`;
      if (!v.source) e.source = "Alegeți sursa de date.";
    }
    if (steps.includes(2)) {
      if (!v.type) e.type = "Alegeți tipul widget-ului.";
      else if (typeProblem(v.type, v)) e.type = `${typeLabel(v.type)}: ${typeProblem(v.type, v).toLocaleLowerCase("ro")}`;
      if (v.kpi && kpiOf(v.kpi)?.source !== v.source) e.kpi = "KPI-ul folosește altă sursă de date decât widget-ul.";
    }
    if (steps.includes(3) && v.type) {
      if (usesMeasure(v)) {
        if (!v.measure) e.measure = "Alegeți ce se măsoară.";
        else if (usesColumn(v)) {
          if (!v.column) e.column = "Alegeți coloana măsurată.";
          /* Feature: „suma se calculează doar pe o coloană numerică” */
          else if (!measureColumns(v).some((f) => f.key === v.column)) e.column = ["sum", "avg"].includes(v.measure) ? "Suma și media se calculează doar pe o coloană numerică sau de durată." : "Coloana nu se potrivește cu măsura aleasă.";
        }
      }
      if (NEEDS_PRIMARY(v.type)) {
        if (!v.primary) e.primary = "Alegeți criteriul principal.";
        /* Feature: „graficul cu linie cere o coloană de dată pe axă”; diagrama de control = o coloană de dată */
        else if (DATE_AXIS.includes(v.type) && !isDate(v.source, v.primary)) e.primary = `${typeLabel(v.type)} cere o coloană de dată pe axă.`;
      }
      if (SECONDARY[v.type] === "required" && !v.secondary) e.secondary = "Harta de căldură cere și criteriul secundar.";
      else if (v.secondary && v.secondary === v.primary) e.secondary = "Criteriul secundar trebuie să fie altă coloană decât cel principal.";
      if (needsDateGroup(v) && !v.dateGroup) e.dateGroup = "Alegeți gruparea datei.";
      (v.filter.rules || []).forEach((r, i) => {
        if (!r.column) e[`rule.${i}`] = "Alegeți coloana.";
        else if (!NO_VALUE.includes(r.op) && !String(r.value || "").trim()) e[`rule.${i}`] = "Completați valoarea.";
        else if (!fieldOf(v.source, r.column)) e[`rule.${i}`] = "Coloana nu există în sursa aleasă.";
      });
      if (v.type === "rowTable" && !(v.filter.rules || []).length) e.filter = "Tabelul cu filtru cere cel puțin o condiție.";
    }
    if (steps.includes(4)) {
      if (!v.kpi && v.threshold.on) {
        const t = Number(String(v.threshold.value).replace(",", "."));
        if (v.threshold.value === "" || Number.isNaN(t) || t < 0) e["threshold.value"] = "Introduceți pragul, un număr pozitiv.";
      }
      if (!v.visibility) e.visibility = "Alegeți aria de vizibilitate.";
      else if (visOptions().find((o) => o.key === v.visibility)?.disabled) e.visibility = "Aria aleasă depășește perimetrul rolului dvs.";
    }
    return e;
  }
  const STEP_OF = (key) => (/^(titles|subtitles|source)/.test(key) ? 1 : /^(type|kpi)$/.test(key) ? 2 : /^(threshold|visibility|width|height|format)/.test(key) ? 4 : 3);
  /* what blocks a publication (Feature AC): required fields, a compatible combination, a preview that loads */
  function publishProblems(v) {
    const e = validate(v);
    const out = Object.entries(e).map(([key, msg]) => (key.startsWith("rule.") ? `Filtru suplimentar: ${msg.toLocaleLowerCase("ro")}` : msg));
    if (!String(v.titles.ru || "").trim()) out.push("Completați titlul în limba rusă: este obligatoriu la publicare.");
    if (!String(v.titles.en || "").trim()) out.push("Completați titlul în limba engleză: este obligatoriu la publicare.");
    if (!out.length && demo.has("eroare-date")) out.push("Previzualizarea nu se încarcă: sursa de date nu a răspuns. Reîncercați „Actualizează”.");
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
    const model = { type: v.type, drill: Boolean(v.drill), height: v.height, measureLabel: k ? k.names.ro : measureText(v), axisLabel: fieldOf(v.source, v.primary)?.label || "", caption: v.titles.ro, series: [], cats: [] };
    /* KPI from the catalogue: value, format, target and zones come from the KPI (Feature AC) */
    if (k) {
      const t = K().target?.(k.id, per.scope === "all" ? null : me.authority);
      if (t && t.target !== null && t.target !== undefined && t.target !== "") model.target = { value: Number(t.target), label: `Ținta ${K().format(k.id, Number(t.target))} · ${k.names.ro}` };
      const authority = per.scope === "all" ? null : me.authority;
      model.tone = (x) => ({ favorabil: "success", avertizare: "warning", critic: "danger" }[K().zone?.(k.id, x, authority)] || null);
      model.zones = model.target ? [["Favorabil", "success"], ["Avertizare", "warning"], ["Critic", "danger"]] : null;
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
      model.single = { value: cur, compare: v.compare && cur !== null && prev ? `${cur >= prev ? "▲" : "▼"} ${nf(Math.abs(((cur - prev) / prev) * 100), 1)}% față de ${COMPARE_SHORT[v.compare]} (${esc(model.fmt(prev))})` : "" };
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
      model.fmt = (x) => String(x);
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
  const measureText = (v) => {
    if (kpiOf(v.kpi)) return `KPI ${kpiOf(v.kpi).code} · ${kpiOf(v.kpi).names.ro}`;
    if (!v.measure) return "";
    return v.measure === "count" ? "Număr de înregistrări" : `${label(MEASURES, v.measure)} · ${fieldOf(v.source, v.column)?.label || "—"}`;
  };

  /* ================================================================ the widget card (preview, as on a dashboard) */
  /* what the preview misses, in the order of the form (Plane „Configure widget”: the preview says what is missing) */
  function missingOf(v) {
    if (!v.source) return ["Alegeți sursa de date", "Previzualizarea folosește datele reale ale sursei, în perimetrul dvs."];
    if (!v.type) return ["Alegeți tipul widget-ului", "Previzualizarea apare imediat ce alegeți un tip."];
    const e = validate(v, { steps: [2, 3] });
    const key = Object.keys(e)[0];
    if (!key) return null;
    const title = { primary: "Lipsește criteriul principal", secondary: "Lipsește criteriul secundar", column: "Lipsește coloana măsurată", measure: "Lipsește măsura", dateGroup: "Lipsește gruparea datei", type: "Tipul nu se potrivește", kpi: "KPI-ul nu se potrivește", filter: "Lipsește filtrul" }[key] || "Configurarea este incompletă";
    return [title, e[key]];
  }
  function cardHtml(v, { st = {}, me = who(), compact = false } = {}) {
    const title = v.titles.ro || "Titlul widget-ului";
    const head = `
      <div class="e-permits-wid-card__head">
        <p class="e-permits-wid-card__title">${esc(title)}</p>
        ${v.subtitles.ro ? `<p class="e-permits-wid-card__subtitle">${esc(v.subtitles.ro)}</p>` : ""}
      </div>`;
    let body;
    const missing = missingOf(v);
    if (missing) body = E()?.render({ title: missing[0], text: missing[1], icon: "chart", compact: true, bare: true }) || "";
    else if (st.refreshing) body = `<div class="e-permits-wid-card__loading" aria-hidden="true"><span class="skeleton skeleton--block e-permits-wid-plot--${v.height || "medium"}"></span><span class="skeleton skeleton--text"></span></div><p class="u-visually-hidden" role="status">Se actualizează datele widget-ului…</p>`;
    else if (demo.has("eroare-date")) body = E()?.render({ title: "Datele nu s-au încărcat", text: "Sursa de date nu a răspuns. Reîncercați „Actualizează”: un widget se publică doar dacă se încarcă fără eroare.", icon: "warning-filled", compact: true, bare: true }) || "";
    else {
      const m = aggregate(v, me);
      if (st.noAccess) m.drill = false;
      body = CH().render?.(m) || "";
      const foot = [
        m.compareTotal && m.compareTotal.prev ? `${m.compareTotal.cur >= m.compareTotal.prev ? "▲" : "▼"} ${nf(Math.abs(((m.compareTotal.cur - m.compareTotal.prev) / m.compareTotal.prev) * 100), 1)}% față de ${COMPARE_SHORT[v.compare]}` : "",
        v.drill && !st.noAccess ? `Clic pe o valoare: înregistrările ei în ${sourceName(v.source)}.` : v.drill ? "Fără trecere în detaliu: nu aveți acces la sursa de date." : ""
      ].filter(Boolean);
      if (foot.length && !compact) body += `<p class="e-permits-wid-card__foot">${foot.map(esc).join(" · ")}</p>`;
    }
    return `<article class="e-permits-chart e-permits-wid-card" aria-label="Previzualizarea widget-ului ${esc(title)}">${head}<div class="e-permits-wid-card__body" aria-live="polite">${body}</div></article>`;
  }
  /* the preview block: heading + data line + „Actualizează” + „Ca utilizator fără acces la sursă” + the card */
  function previewHtml(v, st, { idp, titleTag = "h2" } = {}) {
    const per = perimeter();
    const at = st.refreshedAt ? `actualizat la ${time(st.refreshedAt)}` : `date din ${longDate(D().calculatedAt)}, 06:00`;
    return `
      <section class="e-permits-wid-preview" aria-labelledby="${idp}-preview-title">
        <div class="e-permits-wid-preview__head">
          <div class="e-permits-wid-preview__heading">
            <${titleTag} class="e-permits-reg-editor__props-title" id="${idp}-preview-title">Previzualizare</${titleTag}>
            <p class="e-permits-dtpl-fields__hint">${esc(`Perimetrul dvs.: ${per.text} · ${at}`)}</p>
          </div>
          <button class="btn btn-neutral btn-sm${st.refreshing ? " btn-loading" : ""}" type="button" data-wid-refresh${st.refreshing ? ' aria-busy="true" disabled' : ""}>${icon("rotate-arrow", 16)}<span>Actualizează</span></button>
        </div>
        ${cardHtml(v, { st })}
        <p class="e-permits-dtpl-fields__hint">${esc(`Lățime: ${label(WIDTHS, v.width) || "—"} · Înălțime: ${label(HEIGHTS, v.height) || "—"} · Aria: ${label(VIS, v.visibility) || "—"}`)}</p>
        ${U().renderToggle?.({ label: "Ca utilizator fără acces la sursă", description: "Cifrele rămân, în limita ariei de vizibilitate, dar fără trecere în detaliu spre dosare sau spre sursa de date.", checked: Boolean(st.noAccess), attrs: "data-wid-noaccess" }) || ""}
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
  const section = (title, body, { id = "" } = {}) => `<section class="e-permits-user-create__section"${id ? ` aria-labelledby="${id}"` : ""}><h3 class="e-permits-user-create__section-title"${id ? ` id="${id}"` : ""}>${esc(title)}</h3><div class="e-permits-user-create__section-content">${body}</div></section>`;

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
      </div>` : `${E()?.render({ title: "Fără filtru suplimentar", text: v.type === "rowTable" ? "Tabelul cu filtru afișează rândurile sursei care trec de condiții: adăugați cel puțin una." : "Widget-ul ia toate înregistrările sursei din perioada tabloului de bord.", icon: "filter", compact: true, actionHtml: add }) || ""}${e.filter ? errorHtml(`${idp}-filter`, e.filter) : ""}`;
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
  const STEPS = ["Date", "Tip", "Date afișate", "Aspect și acces", "Revizuire"];
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
        selectField(`${idp}-source`, "source", "Sursa de date", sources().map((s) => [s.id, s.name]), v.source, { required: true, span: 12, placeholder: "Alegeți sursa de date", hint: "Doar sursele de date publicate. Widget-ul preia coloanele permise, condițiile și trecerea în detaliu ale sursei.", error: e.source })
      ))}`;
  }
  function stepType(v, e, idp) {
    const k = kpiOf(v.kpi);
    const kpiOptions = kpisFor(v.source).map((x) => [x.id, `${x.code} · ${x.names.ro}`]);
    return `
      ${section("Tipul widget-ului", typeGallery(v, e, idp))}
      ${section("KPI din catalog", grid(
        selectField(`${idp}-kpi`, "kpi", "KPI din catalog", [["", "Fără KPI"], ...kpiOptions], v.kpi, { span: 12, hint: kpiOptions.length ? "Opțional. Un singur KPI pe widget, din KPI-urile active ale sursei alese." : "Sursa aleasă nu are KPI-uri active în catalog.", error: e.kpi, disabled: !kpiOptions.length }),
        k ? full(U().renderInfoNote?.(`Valoarea, formatul, ținta, perioada țintei și pragurile vin din KPI-ul <strong>${esc(k.code)} · ${esc(k.names.ro)}</strong>. Widget-ul arată linia țintei cu sintagma „Ținta”, iar „Ce se măsoară” și „Coloana măsurată” nu se completează.`) || "") : ""
      ))}`;
  }
  function stepCalc(v, e, idp) {
    if (!v.type) return E()?.render({ title: "Alegeți mai întâi tipul widget-ului", text: "Câmpurile acestui pas depind de tip.", icon: "chart", compact: true, actionHtml: '<button class="btn btn-secondary btn-sm" type="button" data-wid-goto="2">Alege tipul</button>' }) || "";
    const prim = DATE_AXIS.includes(v.type) ? dateCols(v.source) : catCols(v.source);
    const secOpts = catCols(v.source).filter((f) => f.key !== v.primary);
    const measure = v.kpi
      ? full(U().renderInfoNote?.(`Se măsoară KPI-ul <strong>${esc(kpiOf(v.kpi)?.names.ro || "")}</strong>: numărătorul, numitorul și formatul vin din KPI.`) || "")
      : v.type === "rowTable"
        ? full(U().renderInfoNote?.("Tabelul cu filtru afișează direct rândurile sursei care trec de filtru, fără măsură și fără grupare.") || "")
        : `${selectField(`${idp}-measure`, "measure", "Ce se măsoară", MEASURES, v.measure, { required: true, hint: v.measure === "count" ? "Numără înregistrările." : "Calculul se face pe coloana măsurată.", error: e.measure })}${usesColumn(v) ? selectField(`${idp}-column`, "column", "Coloana măsurată", measureColumns(v).map((f) => [f.key, f.label]), v.column, { required: true, placeholder: "Alegeți coloana", hint: ["sum", "avg"].includes(v.measure) ? "Doar coloane numerice sau de durată." : "", error: e.column }) : ""}`;
    const groups = NEEDS_PRIMARY(v.type) ? grid(
      selectField(`${idp}-primary`, "primary", "Criteriul principal", prim.map((f) => [f.key, f.label]), v.primary, { required: true, placeholder: "Alegeți coloana", hint: DATE_AXIS.includes(v.type) ? "O coloană de dată: axa timpului." : "Categoriile axei.", error: e.primary }),
      SECONDARY[v.type] ? selectField(`${idp}-secondary`, "secondary", "Criteriul secundar", [...(SECONDARY[v.type] === "optional" ? [["", "Fără criteriu secundar"]] : []), ...secOpts.map((f) => [f.key, f.label])], v.secondary, { required: SECONDARY[v.type] === "required", placeholder: SECONDARY[v.type] === "required" ? "Alegeți coloana" : "", hint: v.type === "heatmap" ? "A doua axă a hărții." : "Împarte fiecare categorie în serii colorate.", error: e.secondary }) : "",
      needsDateGroup(v) ? selectField(`${idp}-dategroup`, "dateGroup", "Gruparea datei", DATE_GROUPS, v.dateGroup, { required: true, placeholder: "Alegeți gruparea", error: e.dateGroup }) : "",
      ORDERED.includes(v.type) && !isDate(v.source, v.primary) ? selectField(`${idp}-order`, "order", "Ordinea categoriilor", ORDERS, v.order, {}) : ""
    ) : v.type === "rowTable" ? grid(selectField(`${idp}-order`, "order", "Ordinea rândurilor", ORDERS, v.order, { span: 12, hint: "Rândurile se ordonează după data înregistrării." })) : "";
    return `
      ${section("Ce se măsoară", grid(measure))}
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
         ${full(U().renderToggle?.({ label: "Culori după prag", description: "Valorile de la prag în sus sunt verzi, cele de sub prag au culoarea aleasă. Fără prag, widget-ul folosește paleta SIA GEAP.", checked: Boolean(v.threshold.on), attrs: 'data-wid-field="threshold.on"' }) || "")}
         ${v.threshold.on ? `${textField(`${idp}-threshold`, "threshold.value", "Pragul", v.threshold.value, { span: 6, unit, numeric: true, required: true, error: e["threshold.value"] })}${selectField(`${idp}-below`, "threshold.below", "Culoarea sub prag", BELOW, v.threshold.below, {})}` : ""}`;
    const vis = visOptions();
    return `
      ${section("Format, praguri și culori", grid(look))}
      ${section("Dimensiunile implicite", grid(
        selectField(`${idp}-width`, "width", "Lățimea implicită", WIDTHS, v.width, { required: true }),
        selectField(`${idp}-height`, "height", "Înălțimea implicită", HEIGHTS, v.height, { required: true })
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
  function stepReview(v, idp, { isNew }) {
    const goto = (n) => `<button class="btn btn-text-primary btn-sm" type="button" data-wid-goto="${n}">Modifică</button>`;
    const problems = publishProblems(v);
    return `
      ${problems.length
        ? U().renderNotice?.("warning", `<strong>Widget-ul se poate salva ca ciornă, dar nu se poate publica încă.</strong> ${problems.map(esc).join(" ")}`) || ""
        : U().renderNotice?.("success", "<strong>Combinația este compatibilă și previzualizarea se încarcă fără eroare.</strong> Widget-ul se poate publica.") || ""}
      ${readBlocks(v, { goto, isNew })}
      ${U().renderInfoNote?.(`Widget-ul se salvează la nivelul <strong>${esc(levelOfText(v))}</strong>${isNew ? ", în statutul Ciornă" : ""}. Utilizatorii BackOffice văd doar ultima versiune publicată.`) || ""}`;
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
  const thresholdText = (v) => (kpiOf(v.kpi) ? "Din KPI" : v.threshold.on ? `Verde de la ${v.threshold.value}, ${label(BELOW, v.threshold.below).toLocaleLowerCase("ro")} sub prag` : "Paleta SIA GEAP, fără prag");
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
        ["Ce se măsoară", usesMeasure(v) ? d(label(MEASURES, v.measure)) : dash], ["Coloana măsurată", usesColumn(v) ? d(fieldOf(v.source, v.column)?.label) : dash],
        ["Criteriul principal", NEEDS_PRIMARY(v.type) ? d(fieldOf(v.source, v.primary)?.label) : dash], ["Criteriul secundar", SECONDARY[v.type] ? d(fieldOf(v.source, v.secondary)?.label) : dash],
        ["Gruparea datei", needsDateGroup(v) ? d(label(DATE_GROUPS, v.dateGroup)) : dash], ["Ordinea categoriilor", ORDERED.includes(v.type) ? d(label(ORDERS, v.order)) : dash],
        ["Filtru suplimentar", d(rulesText(v))], ["Perioada de comparație", d(label(COMPARES, v.compare))]
      ],
      look: [
        ["Format", k ? "Din KPI" : d(label(FORMATS, v.format))], ["Praguri și culori", esc(thresholdText(v))],
        ["Lățimea implicită", d(label(WIDTHS, v.width))], ["Înălțimea implicită", d(label(HEIGHTS, v.height))],
        ["Trecerea în detaliu", v.drill ? "Da" : "Nu"], ["Aria de vizibilitate", d(label(VIS, v.visibility))]
      ]
    };
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
      return E()?.render({ title: EMPTY_LIST, text: canCreate() ? "Creați primul widget cu „Widget nou”." : "", icon: "chart", bare: true, actionHtml: canCreate() ? '<button class="btn btn-primary btn-sm" type="button" data-wid-new>Widget nou</button>' : "" });
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

  /* ---------------------------------------------------------------- audit (Feature AC: every operation) */
  function audit(w, kind, detail = "") {
    w.history.unshift({ at: nowIso(), by: userName(), role: roleLabel(), event: EVENTS[kind], detail });
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
      title: `Dezactivați widget-ul „${w.config.titles.ro}”?`,
      text: w.level === "Global"
        ? "Widget-ul dispare din tablourile de bord ale tuturor autorităților și nu mai poate fi adăugat. Nimic nu se șterge: configurația și versiunile se păstrează, îl puteți activa oricând."
        : `Widget-ul dispare din tablourile de bord ale ${authName(w.authority)} și nu mai poate fi adăugat. Nimic nu se șterge: configurația și versiunile se păstrează, îl puteți activa oricând.`,
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
      title: `Dezactivați widget-ul „${w.config.titles.ro}” pentru ${mine}?`,
      text: `Widget-ul global dispare din tablourile de bord ale ${mine}. Celelalte autorități nu sunt afectate; îl puteți activa oricând pentru ${mine}.`,
      confirmLabel: `Dezactivează pentru ${mine}`,
      destructive: true
    }, apply);
  }

  /* ================================================================ PROFILE (US-405 · US-406 · US-408) */
  const P = { id: null, tab: "configurare", noAccess: demo.has("fara-acces"), refreshing: false, refreshedAt: "", compare: null };
  const TABS = [["configurare", "Configurare"], ["versiuni", "Versiuni"], ["istoric", "Istoric"]];
  const profileOpen = () => Boolean(P.id) && !document.querySelector("[data-dosar-profil]")?.hidden && A().els?.dosarProfilPanelBody?.id === "wid-panel";
  async function openProfile(id, tab = "configurare", { push = true } = {}) {
    await load();
    const w = widgetOf(id);
    if (!who().has || !w || !visible(w)) { showDenied(); return; }
    if (P.id !== id) P.compare = null;
    P.id = id;
    P.tab = TABS.some(([t]) => t === tab) ? tab : "configurare";
    A().setActiveNav?.(NAV);
    A().openProfilePanel?.();
    renderProfile();
    A().writeHash?.(`#widget/${id}/${P.tab}`, { push });
    A().els?.dosarProfilPanel?.scrollIntoView?.({ block: "start" });
  }
  function closeProfile() { P.id = null; document.querySelector(`[data-nav-item][data-nav-id="${NAV}"]`)?.click(); }
  function headerActions(w) {
    const me = who();
    const mine = authName(me.authority);
    const canPub = canEdit(w) && w.status !== "Dezactivat" && (!w.versions.length || unpublished(w));
    const menu = [
      canCreate() && { label: "Clonează", icon: "copy", attrs: "data-wid-clone" },
      canAuth(w) && w.status === "Publicat" && (isOffFor(w, me.authority)
        ? { label: `Activează pentru ${mine}`, icon: "rotate-arrow", attrs: "data-wid-auth" }
        : { label: `Dezactivează pentru ${mine}`, icon: "pause", attrs: "data-wid-auth" }),
      canEdit(w) && (w.status === "Dezactivat" ? { label: "Activează", icon: "rotate-arrow", attrs: "data-wid-toggle" } : { label: "Dezactivează", icon: "pause", attrs: "data-wid-toggle" })
    ].filter(Boolean);
    return `
      ${canEdit(w) && w.status !== "Dezactivat" ? `<button class="btn btn-secondary btn-sm" type="button" data-wid-edit>${icon("edit", 16)}<span>Editează</span></button>` : ""}
      ${canPub ? '<button class="btn btn-primary btn-sm" type="button" data-wid-publish>Publică</button>' : ""}
      ${(U().renderStackMenu?.(menu, w.config.titles.ro) || "").replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>")}`;
  }
  function renderProfile({ keep = "" } = {}) {
    const w = widgetOf(P.id);
    const els = A().els || {};
    if (!w || !els.dosarProfilTitleRow) return;
    const [statut, tone] = statusOf(w);
    const lv = lastVersion(w);
    els.dosarProfilTitleRow.innerHTML = A().renderPageHeaderTop({
      back: { label: TITLE, attr: "data-wid-back" },
      title: w.config.titles.ro,
      actions: headerActions(w),
      status: unpublished(w) && w.status !== "Dezactivat" ? A().renderHeaderStatus?.("Modificări nepublicate", "warning") || "" : "",
      caption: w.updatedAt ? `Modificat ${longDate(w.updatedAt)}, ${time(w.updatedAt)} · ${w.updatedBy || ""}` : ""
    });
    els.dosarProfilSummary.innerHTML = A().renderPageHeaderMeta([
      ["ID", A().renderProfileCopyCode?.(w.id, `Copiază ${w.id}`) || esc(w.id)],
      ["Tip", esc(typeLabel(w.config.type))],
      ["Nivel", esc(levelText(w))],
      ["Statut", tag(statut, tone)],
      ["Versiune publicată", lv ? esc(String(lv.version)) : "nepublicat"]
    ]);
    A().watchPageHeaderMeta?.(els.dosarProfilSummary);
    const counts = { versiuni: w.versions.length, istoric: Math.min(w.history.length, 100) };
    els.dosarProfilTabs.innerHTML = TABS.map(([id, text]) => {
      const on = id === P.tab;
      return `<button class="tab-button${on ? " active" : ""}" id="wid-tab-${id}" type="button" role="tab" aria-controls="wid-panel" aria-selected="${on}" tabindex="${on ? 0 : -1}" data-wid-tab="${id}"><span>${text}</span>${counts[id] ? A().renderPageHeaderTabCount?.(counts[id]) || "" : ""}</button>`;
    }).join("");
    const body = els.dosarProfilPanelBody;
    body.id = "wid-panel";
    body.setAttribute("role", "tabpanel");
    body.setAttribute("aria-labelledby", `wid-tab-${P.tab}`);
    body.innerHTML = `${notices(w)}${P.tab === "versiuni" ? versionsTab(w) : P.tab === "istoric" ? historyTab(w) : configTab(w)}`;
    if (keep) document.querySelector(keep)?.focus?.({ preventScroll: true });
  }
  function notices(w) {
    const me = who();
    const mine = authName(me.authority);
    const list = [
      w.status === "Dezactivat" && U().renderNotice?.("warning", `<strong>Widget dezactivat.</strong> Nu apare în tablourile de bord și nu poate fi adăugat. Configurația și versiunile se păstrează${canEdit(w) ? "; „Activează” din meniul ⋮ îl readuce" : ""}.`),
      w.status === "Ciornă" && U().renderInfoNote?.("<strong>Ciornă.</strong> Widget-ul apare la alcătuirea tablourilor de bord după prima publicare."),
      w.status === "Publicat" && unpublished(w) && U().renderNotice?.("warning", `<strong>Modificări nepublicate.</strong> Utilizatorii BackOffice văd în continuare versiunea ${esc(String(lastVersion(w).version))}.`),
      !me.central && w.level === "Global" && isOffFor(w, me.authority) && U().renderNotice?.("warning", `<strong>Dezactivat pentru ${esc(mine)}.</strong> Widget-ul global nu apare în tablourile de bord ale ${esc(mine)}.`),
      !me.central && w.level === "Global" && P.tab === "configurare" && U().renderInfoNote?.(`Widget global, creat de Administratorul central: îl vedeți doar pentru citire. Îl puteți clona la nivelul ${esc(mine)} sau îl puteți dezactiva pentru ${esc(mine)}.`)
    ].filter(Boolean).join("");
    return list ? `<div class="e-permits-reg-notices">${list}</div>` : "";
  }
  function configTab(w) {
    return `
      <div class="e-permits-ntpl-content e-permits-wid-config">
        <div class="e-permits-ntpl-content__main">${readBlocks(w.config)}</div>
        <aside class="e-permits-ntpl-content__preview">${previewHtml(w.config, P, { idp: "wid-p" })}</aside>
      </div>`;
  }

  /* ---- Versiuni (US-408): the Registre versions table + „Compară versiuni” */
  function versionsTab(w) {
    if (!w.versions.length) {
      return `<section class="e-permits-dosar-profil__section"><div class="e-permits-dosar-profil__section-heading"><h2 class="e-permits-dosar-profil__section-title">Versiuni publicate</h2></div>${E()?.render({ title: "Nicio versiune publicată", text: "Istoricul versiunilor începe la prima publicare a widget-ului.", icon: "history" }) || ""}</section>`;
    }
    const cur = lastVersion(w);
    const list = [...w.versions].reverse();
    const rows = list.map((v) => {
      const isCurrent = v.nr === cur.nr;
      const menu = [
        { label: "Vizualizează", icon: "eye-open", attrs: `data-wid-ver-view="${v.nr}"` },
        !isCurrent && { label: "Compară cu versiunea în vigoare", icon: "copy", attrs: `data-wid-ver-compare="${v.nr}"` },
        !isCurrent && canEdit(w) && w.status !== "Dezactivat" && { label: "Restaurează", icon: "rotate-arrow", attrs: `data-wid-ver-restore="${v.nr}"` }
      ].filter(Boolean);
      return `
        <tr>
          <td>${v.nr}</td>
          <td><span class="e-permits-reg-version">${esc(String(v.version))}${isCurrent ? tag("în vigoare", "brand") : ""}</span></td>
          <td><span data-cell-tooltip="${esc(v.type)}">${esc(v.type)}</span></td>
          <td><span data-cell-tooltip="${esc(v.note)}">${esc(v.note)}</span></td>
          <td>${twoLines(esc(longDate(v.at)), esc(time(v.at)))}</td>
          <td><span data-cell-tooltip="${esc(v.by)}">${esc(v.by)}</span></td>
          <td class="e-permits-reg-table__action">${(U().renderStackMenu?.(menu, `Versiunea ${v.version}`) || "").replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>")}</td>
        </tr>`;
    }).join("");
    const compareBtn = w.versions.length + (unpublished(w) ? 1 : 0) > 1 && !P.compare ? `<button class="btn btn-secondary btn-sm" type="button" data-wid-compare-open>${icon("history", 16)}<span>Compară versiuni</span></button>` : "";
    return `
      ${U().renderInfoNote?.(`Utilizatorii BackOffice văd doar ultima versiune publicată: <strong>${esc(String(cur.version))}</strong>. Fiecare publicare crește versiunea cu 1; restaurarea publică o versiune nouă cu configurația celei alese.`) || ""}
      <section class="e-permits-dosar-profil__section" aria-labelledby="wid-versions-title">
        <div class="e-permits-dosar-profil__section-heading">
          <h2 class="e-permits-dosar-profil__section-title" id="wid-versions-title">Versiuni publicate</h2>
          <div class="e-permits-passport__heading-tools"><span class="e-permits-dosar-profil__section-meta">${esc(plural(w.versions.length, "versiune", "versiuni"))}</span>${compareBtn}</div>
        </div>
        <div class="e-permits-workplace__table-wrap e-permits-reg-table">
          <table class="e-permits-workplace__table e-permits-reg-table__table e-permits-reg-table__table--versions">
            <caption class="u-visually-hidden">Versiunile publicate ale widget-ului ${esc(w.config.titles.ro)}</caption>
            <thead><tr>${["Nr.", "Versiune", "Tipul modificării", "Ce s-a schimbat", "Data", "Autor"].map((h) => `<th scope="col"><span class="e-permits-workplace__th-content"><span>${h}</span></span></th>`).join("")}<th scope="col"><span class="u-visually-hidden">Acțiuni</span></th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>
      ${P.compare ? compareHtml(w) : ""}`;
  }
  /* the configurations that can be compared: every published version + the saved, unpublished configuration */
  const compareChoices = (w) => [...[...w.versions].reverse().map((v) => [String(v.nr), `Versiunea ${v.version} · ${longDate(v.at)}${v.nr === lastVersion(w).nr ? " (în vigoare)" : ""}`, v.config]), ...(unpublished(w) ? [["draft", "Modificările nepublicate", w.config]] : [])];
  /* field-level diff (Plane / Snowflake compare: before → after, only what changed) */
  function diffRows(a, b) {
    const ra = configRows(a);
    const rb = configRows(b);
    const out = [];
    ["data", "calc", "look"].forEach((group) => ra[group].forEach(([lbl, va], i) => {
      const vb = rb[group][i][1];
      if (va !== vb) out.push([lbl, `${tag("Modificat", "brand")}<span>${va.replace(/<[^>]+>/g, "") || "—"} → ${vb.replace(/<[^>]+>/g, "") || "—"}</span>`]);
    }));
    return out;
  }
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
          ? U().renderInfoNote?.("Alegeți două versiuni diferite.") || ""
          : changes.length
            ? `<div class="e-permits-dosar-profil__card e-permits-reg-changes" aria-label="Câmpurile modificate">${changes.map((r) => G().detailRow?.(r) || "").join("")}</div>`
            : U().renderInfoNote?.("Cele două versiuni au aceeași configurație.") || ""}
        <div class="e-permits-wid-compare__grid">
          <div class="e-permits-wid-compare__col"><p class="e-permits-wid-compare__label">${esc(la)}</p>${cardHtml(ca, { st: { noAccess: true }, compact: true })}</div>
          <div class="e-permits-wid-compare__col"><p class="e-permits-wid-compare__label">${esc(lb)}</p>${cardHtml(cb, { st: { noAccess: true }, compact: true })}</div>
        </div>
      </section>`;
  }
  function historyTab(w) {
    const events = w.history.slice(0, 100).map((h) => ({ at: h.at, user: h.by, role: h.role, type: h.event, status: h.event === EVENTS.rejected ? "Respins" : "Reușit", ...(h.event === EVENTS.rejected ? { tone: "danger" } : {}), detail: h.detail || "" }));
    return window.GEAPEventTimeline?.html("Jurnalul de audit", events, { meta: events.length ? "Cele mai noi primele" : "", empty: "Pentru acest widget nu s-au înregistrat încă operații." }) || "";
  }

  /* ---- version view · restore (the library dialog) */
  const versionOf = (w, nr) => w.versions.find((v) => String(v.nr) === String(nr)) || null;
  function openVersion(nr) {
    const w = widgetOf(P.id);
    const v = versionOf(w, nr);
    if (!v) return;
    G().openModal?.({
      kind: "wid-version",
      title: `Versiunea ${v.version}`,
      subtitle: w.config.titles.ro,
      body: `
        <div class="e-permits-dosar-profil__card">${[["Tipul modificării", esc(v.type)], ["Data", esc(`${longDate(v.at)}, ${time(v.at)}`)], ["Autor", esc(v.by)], ["Ce s-a schimbat", esc(v.note)]].map((r) => G().detailRow?.(r) || "").join("")}</div>
        ${cardHtml(v.config, { st: { noAccess: true }, compact: true })}
        ${readBlocks(v.config)}`,
      footer: '<div class="modal-buttons"><button class="btn btn-primary btn-rounded" type="button" data-case-close>Închide</button></div>'
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
        <p class="e-permits-passport__lead">${esc(`Configurația versiunii ${v.version} devine versiunea nouă ${next}, publicată. Utilizatorii BackOffice o văd imediat.`)}</p>
        ${unpublished(w) ? U().renderNotice?.("warning", "<strong>Modificările nepublicate se pierd.</strong> Ciorna curentă este înlocuită de configurația restaurată.") || "" : ""}
        ${changes.length ? `<div class="e-permits-dosar-profil__card e-permits-reg-changes" aria-label="Ce se schimbă față de versiunea în vigoare">${changes.map((r) => G().detailRow?.(r) || "").join("")}</div>` : ""}
        ${areaField("wid-restore-note", "restoreNote", "Ce s-a schimbat", "", { required: true, placeholder: "De ce reveniți la această versiune", hint: "Apare în istoricul versiunilor." })}`,
      footer: '<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-wid-restore-confirm>Restaurează</button></div>'
    });
  }
  function setModalError(field, message) {
    if (!field) return;
    const box = field.closest(".e-permits-fo-textarea");
    box?.classList.add("is-error");
    field.setAttribute("aria-invalid", "true");
    const wrap = field.closest(".e-permits-fo-field");
    wrap.querySelector(".e-permits-fo-field__error")?.remove();
    wrap.querySelector(".e-permits-fo-field__hint")?.setAttribute("hidden", "");
    wrap.insertAdjacentHTML("beforeend", errorHtml(field.id, message));
    field.setAttribute("aria-describedby", `${field.id}-error`);
    field.focus();
    field.addEventListener("input", () => { box?.classList.remove("is-error"); field.removeAttribute("aria-invalid"); wrap.querySelector(".e-permits-fo-field__error")?.remove(); wrap.querySelector(".e-permits-fo-field__hint")?.removeAttribute("hidden"); field.setAttribute("aria-describedby", `${field.id}-hint`); }, { once: true });
  }
  function confirmRestore() {
    if (!restoring) return;
    const field = document.querySelector("#wid-restore-note");
    const note = field?.value.trim() || "";
    if (!note) { setModalError(field, "Descrieți ce s-a schimbat."); return; }
    const w = widgetOf(restoring.id);
    const v = versionOf(w, restoring.nr);
    if (demo.has("eroare")) { G().closeModal?.(); toast(SAVE_FAILED, "error"); restoring = null; return; }
    const next = lastVersion(w).version + 1;
    w.config = clone(v.config);
    w.versions.push({ nr: w.versions.length + 1, version: next, type: `Restaurare (din versiunea ${v.version})`, note, at: nowIso(), by: userName(), config: clone(v.config) });
    w.status = "Publicat";
    audit(w, "restore", `Versiunea ${v.version} → versiunea ${next} · ${note}`);
    restoring = null;
    P.compare = null;
    G().closeModal?.();
    renderProfile();
    refreshList();
    toast(`Versiunea ${v.version} a fost restaurată ca versiunea ${next}.`);
  }

  /* ---- publish (US-406): problems block it, otherwise version + 1 */
  let publishing = null;
  function openPublish(id, { fromEditor = false } = {}) {
    const w = id ? widgetOf(id) : null;
    const v = fromEditor ? ED.v : w?.config;
    if (!v) return;
    publishing = { id, fromEditor };
    renderPublish();
  }
  function renderPublish() {
    const w = publishing.id ? widgetOf(publishing.id) : null;
    const v = publishing.fromEditor ? ED.v : w.config;
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
        <p class="e-permits-passport__lead">Versiunea în vigoare: <strong>${esc(cur ? String(cur.version) : "—")}</strong> · versiunea nouă: <strong>${next}</strong></p>
        ${problems.length
          ? U().renderNotice?.("error", `<strong>Widget-ul nu se poate publica.</strong> ${problems.map(esc).join(" ")}`, { role: "alert" }) || ""
          : cur
            ? changes.length
              ? `${U().renderNotice?.("warning", `<strong>Configurația se schimbă față de versiunea ${esc(String(cur.version))}.</strong> ${esc(plural(changes.length, "câmp modificat", "câmpuri modificate"))}: utilizatorii BackOffice văd noua versiune imediat după publicare.`) || ""}
                 <div class="e-permits-dosar-profil__card e-permits-reg-changes">${changes.map((r) => G().detailRow?.(r) || "").join("")}</div>`
              : U().renderInfoNote?.("Configurația este aceeași ca în versiunea în vigoare.") || ""
            : U().renderInfoNote?.("<strong>Prima publicare.</strong> Widget-ul devine disponibil la alcătuirea tablourilor de bord.") || ""}
        ${areaField("wid-publish-note", "publishNote", "Ce s-a schimbat", note, { required: true, placeholder: "De ex. comparație cu săptămâna precedentă", hint: "Apare în istoricul versiunilor." })}`,
      footer: `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-wid-publish-confirm${problems.length ? ' aria-disabled="true" data-tooltip-reason="Rezolvați mai întâi problemele de mai sus."' : ""}>Publică</button></div>`
    });
  }
  function confirmPublish(button) {
    if (!publishing) return;
    const fromEditor = publishing.fromEditor;
    const v = fromEditor ? ED.v : widgetOf(publishing.id).config;
    if (button.getAttribute("aria-disabled") === "true") {
      const w = publishing.id ? widgetOf(publishing.id) : null;
      if (w) audit(w, "rejected", publishProblems(v).join(" "));
      return;
    }
    const field = document.querySelector("#wid-publish-note");
    const note = field?.value.trim() || "";
    if (!note) { setModalError(field, "Descrieți ce s-a schimbat."); return; }
    if (demo.has("eroare")) { G().closeModal?.(); toast(SAVE_FAILED, "error"); publishing = null; return; }
    let w = publishing.id ? widgetOf(publishing.id) : null;
    if (fromEditor) w = saveEditor({ silent: true });
    if (!w) return;
    const next = (lastVersion(w)?.version || 0) + 1;
    w.versions.push({ nr: w.versions.length + 1, version: next, type: next === 1 ? "Prima publicare" : "Publicare", note, at: nowIso(), by: userName(), config: clone(w.config) });
    w.status = "Publicat";
    audit(w, "publish", `Versiunea ${next} · ${note}`);
    publishing = null;
    G().closeModal?.();
    if (fromEditor) closeEditor(true);
    toast(`Versiunea ${next} a widget-ului „${w.config.titles.ro}” a fost publicată.`);
    if (fromEditor || !profileOpen()) openProfile(w.id, "configurare"); else renderProfile();
    refreshList();
  }

  /* ================================================================ the builder sheet (US-403 create · US-405 edit · clone) */
  let sheet = null;
  let ED = null;
  function ensureSheet() {
    if (sheet) return sheet;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="e-permits-ntpl-sheet e-permits-reg-editor e-permits-wid-editor" data-wid-editor hidden>
        <div class="e-permits-ntpl-sheet__scrim" aria-hidden="true"></div>
        <div class="e-permits-ntpl-sheet__panel e-permits-reg-editor__panel" role="dialog" aria-modal="true" aria-labelledby="wid-ed-title" tabindex="-1">
          <button class="modal-close e-permits-reg-editor__close" type="button" aria-label="Închide constructorul" data-wid-ed-close>${icon("cross-large", 16)}</button>
          <header class="e-permits-page-header e-permits-reg-editor__header">
            <div class="e-permits-page-header__body"><div class="e-permits-page-header__top" data-wid-ed-top></div></div>
          </header>
          <nav class="e-permits-steps-strip" aria-label="Pașii widget-ului" data-wid-ed-steps></nav>
          <div class="e-permits-reg-editor__body" data-wid-ed-body></div>
          <div class="e-permits-cfg2__bar e-permits-reg-editor__bar" role="region" aria-label="Salvarea widget-ului" data-wid-ed-bar></div>
        </div>
      </div>`);
    sheet = document.querySelector("[data-wid-editor]");
    window.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || sheet.hidden) return;
      if (document.querySelector(".modal-overlay.is-active, [data-stack-menu]:not([hidden]), .e-permits-fo-select__list:not([hidden])")) return;
      if (sheet.querySelector("[aria-expanded='true']")) return;
      event.preventDefault();
      closeEditor();
    });
    return sheet;
  }
  function openEditor({ id = "", from = "", step = 1 } = {}) {
    if (!canCreate()) return;
    const w = id ? widgetOf(id) : null;
    if (w && !canEdit(w)) return;
    const src = from ? widgetOf(from) : null;
    const me = who();
    let v = w ? clone(w.config) : src ? clone(src.config) : blankConfig();
    if (src) {
      v.titles.ro = `${v.titles.ro} (copie)`.slice(0, TITLE_MAX);
      /* a copy never reaches wider than its new author's role */
      if (visOptions(me).find((o) => o.key === v.visibility)?.disabled) v.visibility = defaultVis(me);
    }
    ED = { mode: w ? "edit" : src ? "clone" : "new", id: w?.id || "", from: src?.id || "", step: w ? step : 1, maxStep: w || src ? 5 : 1, v, base: clone(v), errors: {}, saveError: false, noAccess: demo.has("fara-acces"), refreshing: false, refreshedAt: "", back: document.activeElement };
    const el = ensureSheet();
    renderEditor();
    el.hidden = false;
    document.documentElement.classList.add("is-reg-editor-open");
    requestAnimationFrame(() => el.querySelector(ED.mode === "edit" ? ".e-permits-reg-editor__main input, .e-permits-reg-editor__main button" : `#wid-e-title-ro`)?.focus({ preventScroll: true }));
  }
  const edDirty = () => ED && (ED.mode !== "edit" ? Boolean(ED.v.titles.ro || ED.v.source || ED.from) : !same(ED.v, ED.base));
  function closeEditor(force = false) {
    if (!sheet || sheet.hidden || !ED) return;
    const close = () => {
      sheet.hidden = true;
      document.documentElement.classList.remove("is-reg-editor-open");
      const back = ED?.back;
      ED = null;
      if (back?.isConnected) back.focus({ preventScroll: true });
    };
    if (force || !edDirty()) { close(); return; }
    U().askConfirm?.({ title: ED.mode === "edit" ? "Renunțați la modificări?" : "Renunțați la widget-ul nou?", text: ED.mode === "edit" ? "Modificările nesalvate ale widget-ului se pierd." : "Datele completate nu se păstrează.", confirmLabel: "Renunță", cancelLabel: "Continuă editarea", destructive: true }, close);
  }
  function renderEditor({ keep = "", body = true } = {}) {
    if (!ED) return;
    const el = ensureSheet();
    const active = document.activeElement;
    const keepSel = keep || (active && el.contains(active) && active.id ? `#${CSS.escape(active.id)}` : "");
    const caret = active && "selectionStart" in active ? [active.selectionStart, active.selectionEnd] : null;
    const main = el.querySelector(".e-permits-reg-editor__main");
    const scroll = main ? main.scrollTop : 0;
    const w = ED.id ? widgetOf(ED.id) : null;
    const me = who();
    const title = ED.mode === "edit" ? "Editează widget-ul" : ED.mode === "clone" ? "Clonează widget-ul" : "Widget nou";
    /* the sheet's own header: title + caption, the × closes (no top-bar back marker under a full-screen sheet) */
    el.querySelector("[data-wid-ed-top]").innerHTML = window.GEAPPageHeader?.top({
      title,
      titleId: "wid-ed-title",
      caption: w ? `${w.id} · ${levelText(w)} · ${w.status}` : ED.mode === "clone" ? `Copie a ${ED.from} · primește un ID nou la salvare · nivel ${levelOfText(ED.v)}` : me.central ? "Nivel Global · ID-ul se generează la prima salvare" : `Nivel ${levelOfText(ED.v)} · ID-ul se generează la prima salvare`
    }) || "";
    el.querySelector("[data-wid-ed-steps]").innerHTML = A().renderStepStrip?.(STEPS, ED, "data-wid-goto") || "";
    if (body) {
      const idp = "wid-e";
      const form = [() => stepData(ED.v, ED.errors, idp), () => stepType(ED.v, ED.errors, idp), () => stepCalc(ED.v, ED.errors, idp), () => stepLook(ED.v, ED.errors, idp), () => stepReview(ED.v, idp, { isNew: ED.mode !== "edit" })][ED.step - 1]();
      el.querySelector("[data-wid-ed-body]").innerHTML = `
        <div class="e-permits-reg-editor__grid e-permits-reg-editor__grid--2">
          <div class="e-permits-reg-editor__main" data-wid-ed-main>
            ${ED.saveError ? `<div class="e-permits-reg-notices">${U().renderNotice?.("error", esc(SAVE_FAILED), { role: "alert" }) || ""}</div>` : ""}
            <div class="e-permits-clas-create e-permits-wid-form">${form}</div>
          </div>
          <div class="e-permits-reg-editor__props" data-wid-ed-preview>${previewHtml(ED.v, ED, { idp: "wid-e" })}</div>
        </div>`;
    }
    renderBar();
    const m2 = el.querySelector(".e-permits-reg-editor__main");
    if (m2) m2.scrollTop = keep === "@top" ? 0 : scroll;
    if (keepSel && keepSel !== "@top") {
      const target = el.querySelector(keepSel);
      target?.focus?.({ preventScroll: true });
      if (caret && target && "setSelectionRange" in target) { try { target.setSelectionRange(caret[0], caret[1]); } catch { /* not text */ } }
    }
  }
  function renderBar() {
    const n = ED.mode === "edit" ? changedCount() : 0;
    const status = n ? A().renderHeaderStatus?.(n === 1 ? "1 modificare nesalvată" : `${n} modificări nesalvate`, "warning") || "" : "";
    sheet.querySelector("[data-wid-ed-bar]").innerHTML = `
      <p class="e-permits-cfg2__bar-text" aria-live="polite"><span class="e-permits-reg-editor__saved">${esc(`Pasul ${ED.step} din ${STEPS.length} · ${STEPS[ED.step - 1]}`)}</span>${status ? ` ${status}` : ""}</p>
      <div class="e-permits-cfg2__bar-actions">
        ${ED.step > 1 ? '<button class="btn btn-neutral btn-sm" type="button" data-wid-prev>Înapoi</button>' : '<button class="btn btn-neutral btn-sm" type="button" data-wid-ed-close>Anulează</button>'}
        <button class="btn btn-neutral btn-sm" type="button" data-wid-save>${ED.mode === "edit" ? "Salvează" : "Salvează ciorna"}</button>
        ${ED.step < STEPS.length ? '<button class="btn btn-primary btn-sm" type="button" data-wid-next>Continuă</button>' : '<button class="btn btn-primary btn-sm" type="button" data-wid-ed-publish>Publică</button>'}
      </div>`;
  }
  const FIELD_LABELS = () => {
    const out = {};
    const rows = configRows(ED.base);
    const now = configRows(ED.v);
    ["data", "calc", "look"].forEach((g) => rows[g].forEach(([lbl, val], i) => { if (val !== now[g][i][1]) out[lbl] = [val, now[g][i][1]]; }));
    return out;
  };
  const changedCount = () => Object.keys(FIELD_LABELS()).length;
  const ERROR_SEL = { "titles.ro": "title-ro", source: "source", type: "type", kpi: "kpi", measure: "measure", column: "column", primary: "primary", secondary: "secondary", dateGroup: "dategroup", filter: "rule-col-0", "threshold.value": "threshold", visibility: "visibility" };
  const errorSel = (key) => { const m = /^rule\.(\d+)$/.exec(key); return m ? `#wid-e-rule-value-${m[1]}` : `#wid-e-${ERROR_SEL[key] || key}`; };
  function showFirstError(errors) {
    const key = Object.keys(errors)[0];
    ED.step = STEP_OF(key);
    renderEditor({ keep: key === "type" ? "#wid-e-type input:not(:disabled)" : key === "visibility" ? "#wid-e-visibility input:not(:disabled)" : errorSel(key) });
    sheet.querySelector(errorSel(key))?.closest(".e-permits-fo-field, .e-permits-doc-cond, .e-permits-wid-types, .e-permits-user-create__section")?.scrollIntoView({ block: "center" });
  }
  function goStep(target) {
    for (let s = ED.step; s < target; s += 1) {
      if (s > 4) break;
      const errors = validate(ED.v, { steps: [s] });
      if (Object.keys(errors).length) { ED.errors = errors; showFirstError(errors); return; }
    }
    ED.errors = {};
    ED.step = target;
    ED.maxStep = Math.max(ED.maxStep, target);
    renderEditor({ keep: "@top" });
    sheet.querySelector("[data-wid-next], [data-wid-ed-publish]")?.focus({ preventScroll: true });
  }
  /* „Salvează ciorna” / „Salvează”: step 1 is the minimum (title + source); the rest may stay incomplete in a draft */
  function saveEditor({ silent = false } = {}) {
    const errors = validate(ED.v, { steps: [1] });
    if (Object.keys(errors).length) { ED.errors = errors; showFirstError(errors); return null; }
    if (demo.has("eroare")) { ED.saveError = true; renderEditor(); return null; }
    const me = who();
    let w = ED.id ? widgetOf(ED.id) : null;
    if (w) {
      const changed = FIELD_LABELS();
      w.config = clone(ED.v);
      const lv = levelOf(w.config);
      if (w.level !== "Global") Object.assign(w, lv);
      if (Object.keys(changed).length) audit(w, "edit", Object.entries(changed).map(([lbl, [a, b]]) => `${lbl}: ${a.replace(/<[^>]+>/g, "") || "—"} → ${b.replace(/<[^>]+>/g, "") || "—"}`).join(" · "));
      ED.base = clone(ED.v);
    } else {
      const nums = all().map((x) => Number(x.id.split("-")[1]) || 0);
      const id = `WGT-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, "0")}`;
      w = { id, ...levelOf(ED.v, me), status: "Ciornă", offFor: [], createdAt: nowIso(), createdBy: userName(), updatedAt: nowIso(), updatedBy: userName(), config: clone(ED.v), versions: [], history: [] };
      all().push(w);
      audit(w, ED.from ? "clone" : "create", ED.from ? `Din ${ED.from} · ${levelText(w)}` : `Ciornă · ${levelText(w)} · ${sourceName(w.config.source)}${w.config.type ? ` · ${typeLabel(w.config.type)}` : ""}`);
      ED.id = id; ED.mode = "edit"; ED.base = clone(ED.v);
    }
    if (!silent) {
      closeEditor(true);
      toast(`Ciorna widget-ului ${w.id} a fost salvată.`);
      openProfile(w.id, "configurare");
      refreshList();
    }
    return w;
  }

  /* ================================================================ events */
  const inEditor = (el) => sheet && ED && sheet.contains(el);
  const profileRoot = () => (profileOpen() ? A().els?.dosarProfilPanel || document.querySelector("[data-dosar-profil]") : null);
  /* the preview state a control belongs to (editor or profile) */
  const previewState = (el) => (inEditor(el) ? ED : P);
  const rerenderFor = (el, opts) => (inEditor(el) ? renderEditor(opts) : renderProfile(opts));
  function refreshPreview(el) {
    const st = previewState(el);
    st.refreshing = true;
    rerenderFor(el, { keep: "[data-wid-refresh]" });
    window.setTimeout(() => {
      st.refreshing = false; st.refreshedAt = nowIso();
      if (st === ED && !ED) return;
      if (st === ED) renderEditor({ keep: "[data-wid-refresh]" }); else if (profileOpen()) renderProfile({ keep: "[data-wid-refresh]" });
    }, 900);
  }
  /* only the preview column follows a typed value (a full redraw on input would steal the caret) */
  function refreshEditorPreview() {
    const box = sheet?.querySelector("[data-wid-ed-preview]");
    if (box && ED) box.innerHTML = previewHtml(ED.v, ED, { idp: "wid-e" });
  }
  document.addEventListener("click", (event) => {
    const t = event.target;
    if (!t.closest) return;
    /* list */
    if (t.closest('[data-workplace-add-product="wid-new"], [data-wid-new]')) { event.preventDefault(); load().then(() => openEditor()); return; }
    const rowEdit = t.closest("[data-wid-row-edit]");
    if (rowEdit) { load().then(() => openEditor({ id: rowEdit.dataset.widRowEdit })); return; }
    const rowClone = t.closest("[data-wid-row-clone]");
    if (rowClone) { load().then(() => openEditor({ from: rowClone.dataset.widRowClone })); return; }
    const rowToggle = t.closest("[data-wid-row-toggle]");
    if (rowToggle) { const w = widgetOf(rowToggle.dataset.widRowToggle); if (w) setStatus(w, w.status === "Dezactivat", refreshList); return; }
    const rowAuth = t.closest("[data-wid-row-auth]");
    if (rowAuth) { const w = widgetOf(rowAuth.dataset.widRowAuth); if (w) setAuthActive(w, isOffFor(w, who().authority), refreshList); return; }
    /* drill-down (preview): what the click opens on a dashboard */
    const drill = t.closest("[data-wid-drill]");
    if (drill) {
      const v = inEditor(drill) ? ED.v : widgetOf(P.id)?.config;
      if (v) toast(`Pe tabloul de bord, clicul deschide înregistrările „${drill.dataset.widDrill}” (${drill.dataset.widDrillValue}) în ${sourceName(v.source)}.`, "info");
      return;
    }
    if (t.closest("[data-wid-refresh]")) { refreshPreview(t); return; }
    /* dialogs */
    const pub = t.closest("[data-wid-publish-confirm]");
    if (pub) { confirmPublish(pub); return; }
    if (t.closest("[data-wid-restore-confirm]")) { confirmRestore(); return; }

    /* the builder sheet */
    if (inEditor(t)) {
      if (t.closest("[data-wid-ed-close]")) { event.preventDefault(); closeEditor(); return; }
      if (t.closest("[data-wid-prev]")) { ED.errors = {}; ED.step -= 1; renderEditor({ keep: "@top" }); return; }
      if (t.closest("[data-wid-next]")) { goStep(ED.step + 1); return; }
      const goto = t.closest("[data-wid-goto]");
      if (goto) { const n = Number(goto.dataset.widGoto); if (n < ED.step) { ED.errors = {}; ED.step = n; renderEditor({ keep: "@top" }); } else goStep(n); return; }
      if (t.closest("[data-wid-save]")) { saveEditor(); return; }
      if (t.closest("[data-wid-ed-publish]")) { openPublish(ED.id, { fromEditor: true }); return; }
      if (t.closest("[data-wid-rule-add]")) { ED.v.filter.rules.push({ column: "", op: "is", value: "" }); delete ED.errors.filter; renderEditor({ keep: `#wid-e-rule-col-${ED.v.filter.rules.length - 1}` }); return; }
      const rm = t.closest("[data-wid-rule-remove]");
      if (rm) { ED.v.filter.rules.splice(Number(rm.dataset.widRuleRemove), 1); Object.keys(ED.errors).filter((k) => k.startsWith("rule.")).forEach((k) => delete ED.errors[k]); renderEditor({ keep: "[data-wid-rule-add]" }); return; }
      return;
    }
    /* profile */
    const root = profileRoot();
    if (!root || !root.contains(t)) return;
    const tab = t.closest("[data-wid-tab]");
    if (tab) { P.tab = tab.dataset.widTab; renderProfile({ keep: `#wid-tab-${P.tab}` }); A().writeHash?.(`#widget/${P.id}/${P.tab}`, { push: false }); return; }
    if (t.closest("[data-wid-edit]")) { openEditor({ id: P.id, step: 1 }); return; }
    if (t.closest("[data-wid-publish]")) { openPublish(P.id); return; }
    if (t.closest("[data-wid-clone]")) { openEditor({ from: P.id }); return; }
    if (t.closest("[data-wid-toggle]")) { const w = widgetOf(P.id); setStatus(w, w.status === "Dezactivat", () => { renderProfile(); refreshList(); }); return; }
    if (t.closest("[data-wid-auth]")) { const w = widgetOf(P.id); setAuthActive(w, isOffFor(w, who().authority), () => { renderProfile(); refreshList(); }); return; }
    const view = t.closest("[data-wid-ver-view]");
    if (view) { openVersion(view.dataset.widVerView); return; }
    const cmp = t.closest("[data-wid-ver-compare]");
    if (cmp) { const w = widgetOf(P.id); P.compare = { a: cmp.dataset.widVerCompare, b: String(lastVersion(w).nr) }; renderProfile(); document.querySelector("#wid-compare-title")?.scrollIntoView({ block: "start" }); return; }
    const rs = t.closest("[data-wid-ver-restore]");
    if (rs) { openRestore(rs.dataset.widVerRestore); return; }
    if (t.closest("[data-wid-compare-open]")) {
      const w = widgetOf(P.id);
      const ch = compareChoices(w);
      P.compare = { a: ch[1]?.[0] || ch[0][0], b: ch[0][0] };
      if (unpublished(w)) P.compare = { a: String(lastVersion(w).nr), b: "draft" };
      renderProfile({ keep: "#wid-cmp-a" });
      return;
    }
    if (t.closest("[data-wid-compare-close]")) { P.compare = null; renderProfile({ keep: "[data-wid-compare-open]" }); return; }
    if (t.closest("[data-wid-back]")) { event.preventDefault(); closeProfile(); }
  });
  document.addEventListener("keydown", (event) => {
    const tab = event.target.closest?.("[data-wid-tab]");
    if (!tab || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    const i = TABS.findIndex(([id]) => id === tab.dataset.widTab);
    const next = TABS[(i + (event.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length][0];
    event.preventDefault();
    P.tab = next;
    renderProfile({ keep: `#wid-tab-${next}` });
  });
  /* typing: the draft follows without a redraw (counters live); only the preview column is redrawn */
  document.addEventListener("input", (event) => {
    const el = event.target;
    if (!el.closest || !inEditor(el)) return;
    const rule = el.closest("[data-wid-rule]");
    if (rule && el.tagName === "INPUT") { ED.v.filter.rules[Number(rule.dataset.widRule)].value = el.value; refreshEditorPreview(); renderBar(); return; }
    const field = el.closest("[data-wid-field]");
    if (!field || field.tagName === "SELECT" || field.type === "checkbox") return;
    setPath(ED.v, field.dataset.widField, field.value);
    const count = sheet.querySelector(`[data-wid-count="${field.id}"]`);
    if (count) { const max = field.tagName === "TEXTAREA" ? TEXT_MAX : TITLE_MAX; count.textContent = `${field.value.length}/${max}`; count.classList.toggle("is-over", field.value.length > max); }
    refreshEditorPreview();
    renderBar();
  });
  document.addEventListener("change", (event) => {
    const el = event.target;
    if (!el.closest) return;
    /* „Ca utilizator fără acces la sursă” — a view switch of the preview, never a toast */
    if (el.matches("[data-wid-noaccess]")) { const st = previewState(el); st.noAccess = el.checked; rerenderFor(el, { keep: "[data-wid-noaccess]" }); return; }
    /* the comparison pickers (profile) */
    if (el.matches('[data-wid-field="cmp.a"], [data-wid-field="cmp.b"]')) { P.compare = { ...P.compare, [el.dataset.widField.slice(4)]: el.value }; renderProfile({ keep: `#wid-cmp-${el.dataset.widField.slice(4)}` }); return; }
    if (!inEditor(el)) return;
    const v = ED.v;
    const fid = (node) => node.closest(".e-permits-fo-field, .e-permits-doc-cond__cell, .e-permits-doc-cond__join")?.querySelector("button[id], input[id]")?.id || "";
    if (el.matches("[data-wid-type]")) {
      v.type = el.value;
      delete ED.errors.type;
      /* sensible defaults so the preview draws at once (Shopify „recommended”): a compatible primary criterion … */
      if (DATE_AXIS.includes(v.type) && !isDate(v.source, v.primary)) { v.primary = dateCols(v.source)[0]?.key || ""; v.dateGroup = v.dateGroup || "month"; }
      else if (NEEDS_PRIMARY(v.type) && !v.primary) v.primary = fieldsOf(v.source).find((f) => f.type === "enum")?.key || "";
      if (v.type === "stacked" && !v.secondary) v.secondary = fieldsOf(v.source).find((f) => f.type === "enum" && f.key !== v.primary && f.key === "statut")?.key || fieldsOf(v.source).find((f) => f.type === "enum" && f.key !== v.primary)?.key || "";
      if (v.type === "heatmap" && !v.secondary) { v.secondary = dateCols(v.source)[0]?.key || ""; v.dateGroup = v.dateGroup || "month"; }
      if (!SECONDARY[v.type]) v.secondary = "";
      if (!needsDateGroup(v)) v.dateGroup = "";
      renderEditor({ keep: `#wid-e-type input[value="${el.value}"]` });
      return;
    }
    if (el.matches("[data-wid-vis]")) { v.visibility = el.value; delete ED.errors.visibility; renderEditor({ keep: `#wid-e-visibility input[value="${el.value}"]` }); return; }
    const rule = el.closest("[data-wid-rule]");
    if (rule) {
      const i = Number(rule.dataset.widRule);
      const r = v.filter.rules[i];
      const which = el.dataset.widRulePart;
      if (el.tagName === "INPUT") { r.value = el.value; return; }
      r[which] = el.value;
      if (which === "column") r.value = "";
      if (which === "op" && NO_VALUE.includes(r.op)) r.value = "";
      delete ED.errors[`rule.${i}`];
      renderEditor({ keep: fid(el) ? `#${CSS.escape(fid(el))}` : "" });
      return;
    }
    if (el.matches("[data-wid-rule-logic]")) { v.filter.logic = el.value; renderEditor({ keep: fid(el) ? `#${CSS.escape(fid(el))}` : "" }); return; }
    const field = el.closest("[data-wid-field]");
    if (!field || (field.tagName !== "SELECT" && field.type !== "checkbox")) return;
    const key = field.dataset.widField;
    const value = field.type === "checkbox" ? field.checked : field.value;
    const old = getPath(v, key);
    setPath(v, key, value);
    delete ED.errors[key];
    if (key === "source" && value !== old) {
      /* a new source: its columns replace the old ones; a KPI of another source drops */
      const keep = (col) => (fieldOf(value, col) ? col : "");
      v.column = keep(v.column); v.primary = keep(v.primary); v.secondary = keep(v.secondary);
      v.filter.rules = v.filter.rules.filter((r) => fieldOf(value, r.column));
      if (v.kpi && kpiOf(v.kpi)?.source !== value) v.kpi = "";
    }
    if (key === "kpi") { delete ED.errors.type; if (value && v.type && !KPI_TYPES.includes(v.type)) v.type = ""; }
    if (key === "measure") { if (!measureColumns(v).some((f) => f.key === v.column)) v.column = ""; if (value === "count") v.column = ""; }
    if (key === "column") { const t = fieldOf(v.source, value)?.type; if (t === "duration" && v.measure !== "distinct") v.format = "duration"; else if (t === "amount") v.format = "amount"; else if (["duration", "amount"].includes(v.format)) v.format = "number"; }
    if (key === "primary" || key === "secondary") { if (needsDateGroup(v) && !v.dateGroup) v.dateGroup = "month"; if (!needsDateGroup(v)) v.dateGroup = ""; }
    renderEditor({ keep: fid(field) ? `#${CSS.escape(fid(field))}` : `[data-wid-field="${key}"]` });
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
    const m = /^#widget\/([^/]+)(?:\/([a-z]+))?$/.exec(h);
    if (!m) return false;
    if (!who().has) { showDenied(); return true; }
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
    load, openProfile, openEditor, refreshList, perms: () => who(),
    list: () => widgets(),
    get: widgetOf,
    /* Feature AC: BackOffice users see only the last published version */
    published: (id) => { const w = widgetOf(id); return w && w.status === "Publicat" ? lastVersion(w)?.config || null : null; },
    card: (config, opts) => cardHtml(config, opts),
    aggregate
  };
})();
