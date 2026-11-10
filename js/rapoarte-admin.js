/* =====================================================================================
   Administrare › Rapoarte (rpt-v1, 2026-11-09) — Feature 96502 „Constructor de rapoarte” (Epic 96497 Raportare și
   analiză; completes Feature 94523 „Constructor de registre interne GEAP”). Child stories US-466 Crearea · US-467 Lista
   · US-468 Editarea · US-469 Publicarea · US-470 Dezactivarea / activarea · US-471 Istoricul versiunilor — not in Azure
   yet: built from the Feature text, split per its Traceability titles.

   PART 1 (this file, rpt-v1): the list (US-467), the create sheet (US-466: Date generale · Coloane · Structură ·
   Revizuire), the column builder (side panels: the data dictionary of the source + the column panel with the formula
   picker), the live preview table (two-level header, „Inclusiv” columns, group rows + subtotals, total row, calculated
   cells formatted, manual columns marked), the profile page (US-468: Configurare editable + preview; Versiuni / Istoric
   = minimal timelines). PART 2 plugs in through `window.GEAPRapoarte.hooks` (see the end of the file): publish dialog,
   versions tab + restore, deactivate / activate, access grants, clone — every button of those actions is rendered only
   when its hook exists, so part 1 never shows a dead control.

   No new engine — the KPI / widget / Registre patterns:
     · list = the BO registry (`window.GEAPShellRegistries.rapoarte`, menu `shellView: "rapoarte-registry"`), grouped by
       category (`groupBy`), facets Categorie · Statut · Nivel · Sursa de date;
     · create = the widget create sheet (sheet-page-v1: `.e-permits-reg-editor--page`, step strip, footer bar
       „Înapoi / Salvează ciorna / Continuă”), every step form 1fr | live preview 1fr (`.e-permits-ntpl-content--preview`);
     · edit = the profile page (ntpl editor, `.e-permits-editor-wide`), tabs Configurare · Versiuni · Istoric;
     · column builder = the Registre „Coloanele registrului” stacked list (order handle, drag, ↑ ↓, trash), the dictionary =
       the KPI „Dicționarul de date” stacked groups (GEAPKpi.sources / fields = the Registre sources), panels = the ONE drawer;
     · filters per column = the Registre filter types (Text / Alegere unică / Alegere multiplă / Interval de date);
     · the preview table = the widget card table (`.e-permits-wid-table--agg`) + NEW `.e-permits-rpt-table` parts.
   New (components.md › „Rapoarte”): the two-level report preview table `.e-permits-rpt-table`, the formula picker
   `.e-permits-rpt-formula`.
   Routes: #rapoarte (list) · #raport/<id>/<configurare|versiuni|istoric> · #raport/nou.
   Demo switch ?raport= (comma list): fara-permisiune · gol · eroare (every save fails).

   Interpretations (open for PO / BA — listed in components.md › „Rapoarte”):
     · „Completată manual”: config only — the column exists, the preview shows „—” + a „Manual” tag; where the values are
       stored and who enters them is the BA's open question (Feature comment 2);
     · „Inclusiv” = a breakdown of the nearest «Se adună în total» measure column to its left (the statistical form
       „Total, inclusiv: …”): its header is nested („inclusiv”), its values are parts of that column;
     · a «Numeric» column on a text / date source field = the number of records with a value in that field;
     · the Administrator central chooses the level (Global / Autoritate + authorities); any other user creates at his
       authority only; a report shared by several authorities is read-only for each of them.
   ===================================================================================== */
(function () {
  "use strict";

  const A = () => window.GEAPShellApi || {};
  const U = () => window.GEAPUi || {};
  const G = () => window.GEAPRegistre || {};
  const E = () => window.GEAPEmptyState;
  const K = () => window.GEAPKpi || {};
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (name, size = 20) => `<svg class="icon${size === 16 ? " small" : ""}" width="${size}" height="${size}" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${name}"></use></svg>`;
  const tag = (label, tone = "neutral") => window.GEAPTag?.html(label, tone) || esc(label);
  const dash = '<span class="e-permits-workplace__dash">—</span>';
  const pad = (n) => String(n).padStart(2, "0");
  const RO_MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
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
  const getPath = (obj, path) => path.split(".").reduce((o, p) => (o == null ? o : o[p]), obj);
  const setPath = (obj, path, value) => { const parts = path.split("."); const last = parts.pop(); const target = parts.reduce((o, p) => o[p], obj); target[last] = value; };
  const label = (list, key) => list.find(([k]) => k === key)?.[1] || "";

  const KIND = "rapoarte";
  const NAV = "rapoarte";
  const TITLE = "Rapoarte";
  /* Feature AC — the exact texts („tu” tone, components.md › Ton: tu) */
  const DENIED = "Nu ai permisiunea de a accesa această pagină.";
  const EMPTY_LIST = "Nu există rapoarte.";
  const NO_MATCH = "Nicio potrivire găsită.";
  const SAVE_FAILED = "Raportul nu a putut fi salvat.";
  const NAME_MAX = 150;
  const TEXT_MAX = 500;
  const MANUAL_HINT = "Valorile se completează la generarea raportului.";

  /* ---------------------------------------------------------------- the Feature's classifiers */
  const CATEGORIES = [
    ["tabelar", "Rapoarte tabelare", "Rânduri din sursa de date, cu coloane, totaluri și subtotaluri."],
    ["statistic", "Rapoarte statistice", "Indicatori agregați pe categorii, ca în formularele statistice."]
  ];
  /* rpt-rich-select-v1: the icons of the rich dropdowns (Categoria, Nivel) */
  const CATEGORY_ICON = { tabelar: "list-bullets", statistic: "chart" };
  const LEVEL_ICON = { Global: "globe", Autoritate: "business" };
  const LEVELS = [
    ["Global", "Global", "Pentru toate autoritățile; îl modifică doar Administratorul central."],
    ["Autoritate", "Autoritate", "Pentru una sau mai multe autorități alese."]
  ];
  const KINDS = [
    ["source", "Din sursa de date", "Valoarea unui câmp al sursei de date."],
    ["calc", "Calculată", "Rezultatul unei formule din setul de formule."],
    ["manual", "Completată manual", "Fără valoare din sistem: se completează la generare."]
  ];
  const KIND_TAG = { source: ["Din sursă", "neutral"], calc: ["Calculată", "brand"], manual: ["Manual", "warning"] };
  const DATA_TYPES = [["numeric", "Numeric"], ["value", "Valoric"], ["temporal", "Temporal"], ["text", "Text"]];
  const TOTALS = [["sum", "Se adună în total", "Valorile coloanei intră în subtotaluri și în rândul de total."], ["incl", "Inclusiv", "Detaliază coloana «Se adună în total» din stânga ei („din care”)."]];
  const FILTER_TYPES = [["text", "Text"], ["single", "Alegere unică"], ["multi", "Alegere multiplă"], ["date", "Interval de date"]];
  /* the filter types a source field supports (the Registre filterSupport, on the KPI field types) */
  const FILTER_SUPPORT = { text: ["text"], enum: ["single", "multi"], date: ["date"], duration: [], amount: [], number: [] };
  const FORMATS = [["int", "Număr întreg"], ["amount", "Sumă"], ["percent", "Procent"], ["days", "Zile"]];
  const RESULT_TEXT = { int: "Număr întreg", amount: "Sumă, cu două zecimale", percent: "Procent, cu o zecimală", days: "Zile întregi" };
  const FORMAT_TYPE = { int: "numeric", amount: "value", percent: "numeric", days: "numeric" };
  const TYPE_OF_FIELD = { text: "text", enum: "text", date: "temporal", duration: "numeric", number: "numeric", amount: "value" };
  const FIELD_TYPE_LABEL = { text: "Text", enum: "Listă de valori", date: "Dată", number: "Număr", duration: "Durată", amount: "Sumă (MDL)" };
  /* „no-operand” formulas work on the records of a row: per row a value, aggregated by avg / sum */
  const RECORD_AGG = { "f-avg": "avg", "f-count": "sum" };
  const STATUS_TONE = { "Ciornă": "neutral", "Publicat": "success", "Dezactivat": "neutral" };
  const EVENTS = {
    create: "Crearea raportului", clone: "Clonarea raportului", edit: "Modificarea raportului", formula: "Adăugarea unei formule",
    publish: "Publicarea raportului", rejected: "Publicare respinsă", restore: "Restaurarea unei versiuni", off: "Dezactivarea raportului",
    on: "Activarea raportului", grant: "Acordarea accesului", revoke: "Retragerea accesului"
  };
  const isMeasure = (c) => c && (c.dataType === "numeric" || c.dataType === "value");
  const isDim = (c) => c && (c.dataType === "text" || c.dataType === "temporal");
  /* rpt-group-v1: rows group by a Text column from the source (numeric / calculated / manual columns have no group toggle) */
  const groupable = (c) => Boolean(c) && c.kind === "source" && c.dataType === "text";

  const params = new URLSearchParams(window.location.search);
  const demo = new Set(String(params.get("raport") || "").split(",").map((s) => s.trim()).filter(Boolean));
  /* the permission „Gestionarea rapoartelor” (Feature 89940): the Administrator central (Global) and any other user
     holding it at his authority (the local administrator in the demo); ?raport=fara-permisiune takes it away */
  function who() {
    const a = A().currentAssignment?.() || {};
    const central = a.roleId === "central-admin";
    const local = a.roleId === "local-admin";
    const has = (central || local) && !demo.has("fara-permisiune");
    return { central, local, has, authority: central ? null : a.authority || "ansp", roleLabel: a.roleLabel || "" };
  }
  const authName = (id) => D().authorities.find((x) => x.id === id)?.name || String(id || "").toUpperCase();
  const roleLabel = () => { const w = who(); return w.central ? w.roleLabel || "Administrator central" : `Utilizator cu permisiunea «Gestionarea rapoartelor» · ${authName(w.authority)}`; };

  /* ---------------------------------------------------------------- data */
  const S = { data: null, loading: null };
  const blankConfig = (me = who()) => ({
    names: { ro: "", ru: "", en: "" }, descriptions: { ro: "", ru: "", en: "" },
    category: "", source: "", level: me.central ? "Global" : "Autoritate", authorities: me.central ? [] : [me.authority],
    columns: [], groupBy: "", filters: [], totalRow: true
  });
  const normal = (c) => {
    const base = blankConfig({ central: true });
    const v = { ...base, ...c, names: { ...base.names, ...c.names }, descriptions: { ...base.descriptions, ...c.descriptions } };
    v.columns = (v.columns || []).map((col) => ({ names: { ro: "", ru: "", en: "" }, kind: "source", field: "", formula: "", operands: {}, dataType: "text", header: "", total: "sum", ...col, names: { ro: "", ru: "", en: "", ...col.names }, operands: { ...(col.operands || {}) } }));
    v.filters = (v.filters || []).map((f) => ({ field: "", type: "", ...f }));
    v.authorities = [...(v.authorities || [])];
    return v;
  };
  function load() {
    if (S.data) return Promise.resolve(S.data);
    if (!S.loading) {
      S.loading = Promise.all([
        fetch("data/rapoarte.json?v=rpt-rows-48-v1").then((r) => r.json()),
        K().load ? K().load() : Promise.resolve(null)
      ]).then(([json]) => {
        if (demo.has("gol")) json.reports = [];
        json.reports.forEach((r) => {
          r.config = normal(r.config);
          r.history = r.history || [];
          r.versions = (r.versions || []).map((v) => {
            const config = normal(v.config || clone(r.config));
            /* the seed of an older version names the columns it did not have yet (part 2: Versiuni, restore) */
            if (v.without) config.columns = config.columns.filter((c) => !v.without.includes(c.id));
            return { ...v, type: v.type || (v.version === 1 ? "Prima publicare" : "Publicare"), config };
          });
          r.grants = r.grants || [];
          /* the seed of a report with unpublished changes names the columns its last version did not have yet */
          const last = r.versions[r.versions.length - 1];
          if (last && r.unpublishedColumns) last.config.columns = last.config.columns.filter((c) => !r.unpublishedColumns.includes(c.id));
        });
        S.data = json;
        return json;
      }).catch(() => { S.data = { reports: [], formulas: [], authorities: [], roles: [] }; return S.data; });
    }
    return S.loading;
  }
  const D = () => S.data || { reports: [], formulas: [], authorities: [], roles: [] };
  const all = () => D().reports;
  const reportOf = (id) => all().find((r) => r.id === id) || null;
  const visible = (r, me = who()) => me.central || r.config.level === "Global" || r.config.authorities.includes(me.authority);
  const reports = () => (who().has ? all().filter((r) => visible(r)) : []);
  const sources = () => K().sources?.() || [];
  const sourceOf = (id) => sources().find((s) => s.id === id) || null;
  const sourceName = (id) => sourceOf(id)?.name || "";
  const fieldsOf = (id) => (id ? K().fields?.(id) || [] : []);
  const fieldOf = (src, key) => fieldsOf(src).find((f) => f.key === key) || null;
  const formulas = () => D().formulas;
  const formulaOf = (id) => formulas().find((f) => f.id === id) || null;
  const formulaFits = (f, src) => !f.sources || f.sources.includes(src);
  const colOf = (v, id) => v.columns.find((c) => c.id === id) || null;
  const colName = (c) => c?.names.ro || "Coloană fără denumire";
  const lastVersion = (r) => r.versions[r.versions.length - 1] || null;
  const unpublished = (r) => Boolean(lastVersion(r)) && !same(r.config, lastVersion(r).config);
  const levelText = (v) => (v.level === "Global" ? "Global" : `Autoritate · ${v.authorities.map(authName).join(", ") || "—"}`);

  /* ---------------------------------------------------------------- permissions per report (Feature AC) */
  const canCreate = () => who().has;
  const canEdit = (r) => {
    const me = who();
    if (!me.has || !r) return false;
    if (me.central) return true;
    /* any other user: only his own authority's report (a report shared with other authorities stays read-only) */
    return r.config.level !== "Global" && r.config.authorities.length === 1 && r.config.authorities[0] === me.authority;
  };
  /* Proposal for PO: „Formulă nouă” — Feature assumption „Administratorul Central poate adăuga formule noi”; the
     authoring UI (name + expression on A, B, C… + result format, a simple dialog) is not specified anywhere yet */
  const canAddFormula = () => who().central;

  /* ================================================================ validation (Feature models) */
  /* the «Se adună în total» measure column an «Inclusiv» column details: the nearest one to its left */
  function parentOf(v, c) {
    const i = v.columns.indexOf(c);
    for (let j = i - 1; j >= 0; j -= 1) {
      const p = v.columns[j];
      if (!isMeasure(p)) return null;
      if (p.total === "sum") return p;
    }
    return null;
  }
  const supportOf = (v, key) => FILTER_SUPPORT[fieldOf(v.source, key)?.type] || [];
  function columnErrors(v, c) {
    const e = {};
    if (!String(c.names.ro || "").trim()) e["names.ro"] = "Introdu denumirea coloanei (RO).";
    if (c.kind === "source") {
      if (!c.field) e.field = "Alege câmpul sursei de date.";
      else if (!fieldOf(v.source, c.field)) e.field = "Câmpul nu există în sursa de date aleasă.";
    }
    if (c.kind === "calc") {
      const f = formulaOf(c.formula);
      if (!f) e.formula = "Alege formula de calcul.";
      else if (!formulaFits(f, v.source)) e.formula = "Formula nu se aplică sursei de date alese.";
      else f.operands.forEach((o) => {
        const col = colOf(v, c.operands?.[o.key]);
        if (!col) e[`op.${o.key}`] = `Alege coloana pentru ${o.key}.`;
        else if (col.id === c.id) e[`op.${o.key}`] = "Formula nu poate folosi chiar coloana ei.";
        else if (!o.types.includes(col.dataType)) e[`op.${o.key}`] = `Alege o coloană ${o.types.map((t) => label(DATA_TYPES, t)).join(" sau ")}.`;
      });
    }
    if (!c.dataType) e.dataType = "Alege tipul datelor.";
    if (c.total === "incl" && isMeasure(c) && !parentOf(v, c)) e.total = "Pune coloana «Inclusiv» imediat după coloana pe care o detaliază (Numeric sau Valoric, «Se adună în total»).";
    return e;
  }
  function validate(v, { steps = [1, 2, 3] } = {}) {
    const e = {};
    if (steps.includes(1)) {
      const name = String(v.names.ro || "").trim();
      if (!name) e["names.ro"] = "Introdu denumirea raportului (RO).";
      else if (name.length > NAME_MAX) e["names.ro"] = `Denumirea are cel mult ${NAME_MAX} de caractere.`;
      if (!v.category) e.category = "Alege categoria raportului.";
      if (!v.source) e.source = "Alege sursa de date.";
      if (v.level === "Autoritate" && !v.authorities.length) e.authorities = "Alege cel puțin o autoritate.";
    }
    if (steps.includes(2)) {
      if (!v.columns.length) e.columns = "Adaugă cel puțin o coloană.";
      v.columns.forEach((c) => { const ce = columnErrors(v, c); if (Object.keys(ce).length) e[`col.${c.id}`] = ce; });
    }
    if (steps.includes(3)) {
      if (v.groupBy && !colOf(v, v.groupBy)) e.groupBy = "Coloana de grupare nu mai este în raport.";
      v.filters.forEach((f, i) => {
        if (!f.field) e[`filter.${i}`] = "Alege câmpul filtrului.";
        else if (!f.type) e[`filter.${i}`] = "Alege tipul filtrului.";
        else if (!supportOf(v, f.field).includes(f.type)) e[`filter.${i}`] = `Câmpul acceptă doar ${supportOf(v, f.field).map((t) => label(FILTER_TYPES, t)).join(" sau ") || "niciun filtru"}.`;
      });
    }
    return e;
  }
  const STEP_OF = (key) => (/^(names|descriptions|category|source|authorities|level)/.test(key) ? 1 : /^(columns|col\.)/.test(key) ? 2 : 3);
  /* what publishing needs on top of the draft rules (US-469 — part 2 reads it through GEAPRapoarte.publishProblems) */
  function publishProblems(v) {
    const out = [];
    const e = validate(v);
    if (Object.keys(e).length) out.push("Corectează câmpurile marcate.");
    if (!String(v.names.ru || "").trim() || !String(v.names.en || "").trim()) out.push("Completează denumirea în RU și EN.");
    if (v.columns.some((c) => !String(c.names.ru || "").trim() || !String(c.names.en || "").trim())) out.push("Completează denumirea coloanelor în RU și EN.");
    return out;
  }

  /* ================================================================ the preview model (demo values on the source)
     rows = the values of the first dimension column (text / temporal), grouped by the grouping column; measures = demo
     numbers per row (stable: a hash of row + column); calculated cells = their formula on the row's values; subtotals and
     the total recompute the formulas on the summed operands (a percentage of totals, never a sum of percentages). */
  const DAY = 86400000;
  const BASE_DAY = Date.UTC(2026, 0, 5);
  const isLate = (key) => /finaliz|emis|achit|valabil/i.test(key || "");
  function dimLabels(v, c, n, seed) {
    if (!c) return [];
    const f = c.kind === "source" ? fieldOf(v.source, c.field) : null;
    if (f?.type === "enum" && f.values.length) {
      const vals = f.values;
      return Array.from({ length: Math.min(n, vals.length) }, (_, i) => vals[(i + seed) % vals.length]);
    }
    if (f?.type === "date" || c.dataType === "temporal") return Array.from({ length: n }, (_, i) => `${RO_MONTHS[(i + seed) % 12]} 2026`);
    if (f?.type === "text") return Array.from({ length: n }, (_, i) => `${f.key === "nr" ? "D" : "N"}-2026-${String(1041 + seed * 7 + i).padStart(5, "0")}`);
    return Array.from({ length: n }, (_, i) => `Rândul ${i + 1}`);
  }
  /* a tiny expression evaluator for the formula set (+ − × / and parentheses on A, B, C…) */
  function evalExpr(expr, vals) {
    const src = String(expr).replace(/×/g, "*").replace(/−/g, "-").replace(/÷/g, "/");
    const tokens = src.match(/\d+(?:[.,]\d+)?|[A-Z]|[-+*/()]/g) || [];
    let i = 0;
    const peek = () => tokens[i];
    const take = () => tokens[i++];
    const atom = () => {
      const t = take();
      if (t === "(") { const x = sum(); take(); return x; }
      if (t === "-") return -atom();
      if (/^[A-Z]$/.test(t)) { const x = vals[t]; if (x == null || Number.isNaN(x)) throw new Error("missing"); return x; }
      const n = Number(String(t).replace(",", "."));
      if (Number.isNaN(n)) throw new Error("bad");
      return n;
    };
    const prod = () => { let x = atom(); while (peek() === "*" || peek() === "/") { const op = take(); const y = atom(); if (op === "/" && !y) throw new Error("div0"); x = op === "*" ? x * y : x / y; } return x; };
    const sum = () => { let x = prod(); while (peek() === "+" || peek() === "-") { const op = take(); const y = prod(); x = op === "+" ? x + y : x - y; } return x; };
    try { const x = sum(); return i === tokens.length ? x : null; } catch { return null; }
  }
  /* the value of every column on one row (rowKey = stable seed); grp / dimVal = the row's labels */
  function rowValues(v, rowKey, labels, scale = 1) {
    const out = {};
    const done = new Set();
    v.columns.forEach((c) => {
      if (c.kind === "calc") return;
      const h = hash(`${c.id}|${rowKey}|${c.field || c.formula || ""}`);
      const f = c.kind === "source" ? fieldOf(v.source, c.field) : null;
      if (c.kind === "manual") out[c.id] = null;
      else if (labels[c.id] != null) out[c.id] = labels[c.id];
      else if (c.dataType === "text") out[c.id] = f?.type === "enum" && f.values.length ? f.values[h % f.values.length] : f?.type === "text" ? `D-2026-${String(1000 + (h % 9000)).padStart(5, "0")}` : "—";
      else if (c.dataType === "temporal") out[c.id] = BASE_DAY + ((isLate(c.field) ? 160 : 0) + (h % 120)) * DAY;
      else if (c.dataType === "value") out[c.id] = 1500 + (h % 48000) + (h % 100) / 100;
      else out[c.id] = f?.type === "duration" ? 3 + (h % 24) : 24 + (h % 180);
      /* rpt-filters-v1: a row whose records the preview filters keep only in part = its counts / sums in proportion */
      if (scale !== 1 && c.kind === "source" && typeof out[c.id] === "number" && isMeasure(c) && f?.type !== "duration") out[c.id] = c.dataType === "value" ? Math.round(out[c.id] * scale * 100) / 100 : Math.round(out[c.id] * scale);
      done.add(c.id);
    });
    /* „Inclusiv” = a part of its parent (45…84 %) */
    v.columns.forEach((c) => {
      if (c.kind !== "source" || c.total !== "incl" || !isMeasure(c)) return;
      const p = parentOf(v, c);
      if (p && typeof out[p.id] === "number") out[c.id] = c.dataType === "value" ? Math.round(out[p.id] * (0.45 + (hash(`${c.id}|${rowKey}|${c.field || c.formula || ""}`) % 40) / 100) * 100) / 100 : Math.round(out[p.id] * (0.45 + (hash(`${c.id}|${rowKey}|${c.field || c.formula || ""}`) % 40) / 100));
    });
    /* calculated columns, in dependency order (3 passes cover a formula on a formula) */
    for (let pass = 0; pass < 3; pass += 1) {
      v.columns.forEach((c) => {
        if (c.kind !== "calc" || done.has(c.id)) return;
        const f = formulaOf(c.formula);
        if (!f) { out[c.id] = null; done.add(c.id); return; }
        if (!f.operands.length) {
          const h = hash(`${c.id}|${rowKey}|${c.field || c.formula || ""}`);
          out[c.id] = f.format === "days" ? 4 + (h % 21) : f.format === "percent" ? 50 + (h % 50) : f.format === "amount" ? 800 + (h % 9000) : 8 + (h % 120);
          if (scale !== 1 && RECORD_AGG[f.id] === "sum") out[c.id] = Math.round(out[c.id] * scale);
          done.add(c.id);
          return;
        }
        const ids = f.operands.map((o) => c.operands?.[o.key]);
        if (ids.some((id) => id && v.columns.some((x) => x.id === id && x.kind === "calc") && !done.has(id))) return;
        out[c.id] = computeFormula(f, c, out, v);
        done.add(c.id);
      });
    }
    return out;
  }
  function computeFormula(f, c, vals, v) {
    const ops = {};
    for (const o of f.operands) {
      const col = colOf(v, c.operands?.[o.key]);
      const x = col ? vals[col.id] : null;
      if (x == null || typeof x !== "number") return null;
      ops[o.key] = col.dataType === "temporal" ? x / DAY : x;
    }
    const x = evalExpr(f.expr, ops);
    return x == null || !Number.isFinite(x) ? null : x;
  }
  /* subtotal / total over rows: measures summed (durations averaged), dates min / max, formulas recomputed */
  function aggregateRows(v, rows) {
    const out = {};
    v.columns.forEach((c) => {
      if (c.kind === "calc" || c.kind === "manual" || c.dataType === "text") { out[c.id] = null; return; }
      const xs = rows.map((r) => r[c.id]).filter((x) => typeof x === "number");
      if (!xs.length) { out[c.id] = null; return; }
      if (c.dataType === "temporal") out[c.id] = isLate(c.field) ? Math.max(...xs) : Math.min(...xs);
      else if (fieldOf(v.source, c.field)?.type === "duration") out[c.id] = xs.reduce((s, x) => s + x, 0) / xs.length;
      else out[c.id] = xs.reduce((s, x) => s + x, 0);
    });
    for (let pass = 0; pass < 3; pass += 1) {
      v.columns.forEach((c) => {
        if (c.kind !== "calc" || out[c.id] != null) return;
        const f = formulaOf(c.formula);
        if (!f) return;
        if (!f.operands.length) {
          const xs = rows.map((r) => r[c.id]).filter((x) => typeof x === "number");
          out[c.id] = xs.length ? (RECORD_AGG[f.id] === "sum" || f.format === "int" || f.format === "amount" ? xs.reduce((s, x) => s + x, 0) : xs.reduce((s, x) => s + x, 0) / xs.length) : null;
        } else out[c.id] = computeFormula(f, c, out, v);
      });
    }
    return out;
  }
  function fmtCell(v, c, x) {
    if (x == null || x === "") return dash;
    if (typeof x === "string") return `<span data-cell-tooltip="${esc(x)}">${esc(x)}</span>`;
    if (c.dataType === "temporal") return esc(longDate(x));
    if (c.kind === "calc") {
      const f = formulaOf(c.formula);
      const fmt = f?.format || "int";
      return esc(fmt === "percent" ? `${nf(x, 1)}%` : fmt === "amount" ? nf(x, 2) : nf(Math.round(x)));
    }
    return esc(c.dataType === "value" ? nf(x, 2) : nf(Math.round(x)));
  }
  /* ---- rpt-filters-v1 (2026-11-10, user): the „Filtre la generare” work on the preview. Every demo row stands for RECS
     records of the source; a record carries a value for each filter field (the row's own value when the field is one of
     its Text columns, else a stable demo value; dates spread over 2026). A selection keeps a row when ≥ 1 of its records
     matches (AND across filters, OR inside one) and scales its counts / sums to the share of matching records; subtotals
     and the total are recomputed on what is left. */
  const RECS = 8;
  const DEMO_TODAY = "2026-11-10";
  const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);
  const facetKey = (flt) => `${flt.field}|${flt.type}`;
  /* the complete, valid filters, in the builder's order (= the chips' order), one per field + type */
  function liveFilters(v) {
    const seen = new Set();
    return (v.filters || []).filter((flt) => {
      if (!flt.field || !flt.type || !fieldOf(v.source, flt.field) || !supportOf(v, flt.field).includes(flt.type)) return false;
      const k = facetKey(flt);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  function recordsOf(v, rowKey, vals) {
    const fl = liveFilters(v);
    if (!fl.length) return [];
    return Array.from({ length: RECS }, (_, i) => {
      const rec = {};
      fl.forEach((flt) => {
        const f = fieldOf(v.source, flt.field);
        const col = v.columns.find((c) => c.kind === "source" && c.field === flt.field && c.dataType === "text");
        const cv = col ? vals[col.id] : null;
        const h = hash(`${flt.field}|${rowKey}|${i}`);
        if (f.type === "date") rec[flt.field] = isoDay(BASE_DAY + (h % 310) * DAY);
        else if (typeof cv === "string" && cv) rec[flt.field] = cv;
        else if (f.type === "enum" && f.values.length) rec[flt.field] = f.values[h % f.values.length];
        else rec[flt.field] = `${flt.field === "nr" ? "D" : "N"}-2026-${String(1000 + (h % 9000)).padStart(5, "0")}`;
      });
      return rec;
    });
  }
  const selEntries = (sel) => Object.entries(sel || {}).filter(([, values]) => values?.length);
  function recMatch(v, rec, sel) {
    const fl = liveFilters(v);
    return selEntries(sel).every(([key, values]) => {
      const flt = fl.find((x) => facetKey(x) === key);
      if (!flt) return true;
      const x = rec[flt.field];
      if (flt.type === "date") return window.GEAPFacetFilter?.dateMatch ? window.GEAPFacetFilter.dateMatch(values[0], x, DEMO_TODAY) : true;
      return values.includes(x);
    });
  }
  function previewModel(v, sel = null) {
    const cols = v.columns;
    const groupCol = v.groupBy ? colOf(v, v.groupBy) : null;
    const dim = cols.find((c) => c !== groupCol && c.dataType === "text" && c.kind === "source") || cols.find((c) => c !== groupCol && isDim(c) && c.kind === "source") || null;
    const groups = groupCol ? dimLabels(v, groupCol, 3, 0) : [null];
    const filtering = selEntries(sel).length > 0;
    const records = [];
    const blocks = groups.map((g, gi) => {
      const dims = dim ? dimLabels(v, dim, groupCol ? 3 : 5, gi) : [null, null, null].slice(0, groupCol ? 1 : 3);
      const rows = dims.map((d, ri) => {
        const labels = {};
        if (groupCol) labels[groupCol.id] = g;
        if (dim) labels[dim.id] = d;
        const key = `${v.source}|${g}|${d ?? ri}`;
        const base = rowValues(v, key, labels);
        const recs = recordsOf(v, key, base);
        records.push(...recs);
        if (!filtering) return base;
        const n = recs.filter((rec) => recMatch(v, rec, sel)).length;
        if (!n) return null;
        return n === RECS ? base : rowValues(v, key, labels, n / RECS);
      }).filter(Boolean);
      return { group: g, rows, sub: groupCol ? aggregateRows(v, rows) : null };
    }).filter((b) => b.rows.length);
    const rowCount = blocks.reduce((n, b) => n + b.rows.length, 0);
    const total = rowCount && v.totalRow && cols.some(isMeasure) ? aggregateRows(v, blocks.flatMap((b) => b.rows)) : null;
    return { groupCol, blocks, total, rowCount, records };
  }
  /* group edges (rpt-group-edges-v1, 2026-11-09, user: „another separator, full, also vertical ones”; Excel / Sheets /
     Ant Design / MUI grouped headers): a 1px solid vertical at the left of a group's first column and of the first column
     after it (and at the right of a group that ends the table) — header (both rows) + body + subtotal + total; none between
     the columns of a group or between ungrouped columns. → per column index: [left edge, right edge] */
  function groupEdges(cols) {
    const h = (c) => String(c?.header || "").trim();
    return cols.map((c, i) => {
      const prev = cols[i - 1];
      const left = i > 0 && h(c) !== h(prev) && Boolean(h(c) || h(prev));
      const right = i === cols.length - 1 && Boolean(h(c));
      return [left, right];
    });
  }
  /* + the table's first / last column (rpt-edge-v2: they carry the card's 24 inset) */
  const edgeCls = (edges, i) => [edges[i]?.[0] ? "is-gl" : "", edges[i]?.[1] ? "is-gr" : "", i === 0 ? "is-c0" : "", i === edges.length - 1 ? "is-cn" : ""].filter(Boolean);
  /* the head: a common header (Antetul comun) spans its consecutive columns on row 1; the others span both rows */
  function headHtml(v, { link = false } = {}) {
    const cols = v.columns;
    const edges = groupEdges(cols);
    const two = cols.some((c) => String(c.header || "").trim());
    const cellBody = (c) => {
      const incl = c.total === "incl" && isMeasure(c);
      const inner = `<span class="e-permits-workplace__th-content e-permits-rpt-table__th"><span class="e-permits-rpt-table__th-text">${incl ? '<span class="e-permits-rpt-table__eyebrow">inclusiv</span>' : ""}<span>${esc(colName(c))}</span></span>${c.kind === "manual" ? tag("Manual", "warning") : ""}</span>`;
      /* rpt-col-link-v1: in the editor the header is a button → the column's item in „Coloanele raportului” */
      return link ? `<button class="e-permits-rpt-table__col-btn" type="button" data-rpt-col-pick="${esc(c.id)}" aria-label="Coloana ${cols.indexOf(c) + 1}: ${esc(colName(c))}">${inner}</button>` : inner;
    };
    const thCls = (c, extra = "") => { const i = cols.indexOf(c); const cls = [isMeasure(c) ? "e-permits-wid-table__num" : "e-permits-rpt-table__text-head", c.total === "incl" && isMeasure(c) ? "is-incl" : "", ...edgeCls(edges, i), extra].filter(Boolean).join(" "); return `${cls ? ` class="${cls}"` : ""} data-rpt-cell="${esc(c.id)}"`; };
    if (!two) return `<tr>${cols.map((c) => `<th scope="col"${thCls(c)}>${cellBody(c)}</th>`).join("")}</tr>`;
    const top = [];
    const bottom = [];
    cols.forEach((c, i) => {
      const h = String(c.header || "").trim();
      if (!h) { top.push(`<th scope="col" rowspan="2"${thCls(c)}>${cellBody(c)}</th>`); return; }
      const prev = cols[i - 1];
      if (prev && String(prev.header || "").trim() === h && top.length) top[top.length - 1] = top[top.length - 1].replace(/colspan="(\d+)"/, (m, n) => `colspan="${Number(n) + 1}"`).replace(/ data-last/, i === cols.length - 1 ? " is-gr is-cn data-last" : " data-last").replace(/data-rpt-cells="([^"]*)"/, (m, ids) => `data-rpt-cells="${ids} ${esc(c.id)}"`);
      else top.push(`<th scope="colgroup" colspan="1" class="e-permits-rpt-table__span${edges[i][0] ? " is-gl" : ""}${i === 0 ? " is-c0" : ""}${i === cols.length - 1 ? " is-gr is-cn" : ""} data-last" data-rpt-cells="${esc(c.id)}"><span class="e-permits-workplace__th-content"><span>${esc(h)}</span></span></th>`);
      bottom.push(`<th scope="col"${thCls(c, "e-permits-rpt-table__sub")}>${cellBody(c)}</th>`);
    });
    return `<tr>${top.map((x) => x.replace(" data-last", "")).join("")}</tr><tr>${bottom.join("")}</tr>`;
  }
  function tableHtml(v, { link = false, sel = null } = {}) {
    const m = previewModel(v, sel);
    const cols = v.columns;
    const labelCol = cols.find((c) => !isMeasure(c));
    const edges = groupEdges(cols);
    const cell = (c, vals, { label: lbl = "" } = {}) => {
      const cls = [isMeasure(c) ? "" : "e-permits-rpt-table__text", c.total === "incl" && isMeasure(c) ? "is-incl" : "", c.kind === "manual" ? "is-manual" : "", ...edgeCls(edges, cols.indexOf(c))].filter(Boolean).join(" ");
      const content = lbl && c === labelCol ? `<strong>${esc(lbl)}</strong>` : lbl && !isMeasure(c) ? "" : fmtCell(v, c, vals?.[c.id]);
      return `<td${cls ? ` class="${cls}"` : ""} data-rpt-cell="${esc(c.id)}">${content}</td>`;
    };
    const body = m.blocks.map((b) => `
      ${m.groupCol ? `<tr class="e-permits-rpt-table__group"><th scope="rowgroup" colspan="${cols.length}"><span data-cell-tooltip="${esc(b.group)}">${esc(`${colName(m.groupCol)}: ${b.group}`)}</span></th></tr>` : ""}
      ${b.rows.map((r) => `<tr>${cols.map((c) => cell(c, r)).join("")}</tr>`).join("")}
      ${b.sub ? `<tr class="e-permits-rpt-table__subtotal">${cols.map((c) => cell(c, b.sub, { label: "Subtotal" })).join("")}</tr>` : ""}`).join("");
    const foot = m.total ? `<tfoot><tr class="e-permits-rpt-table__total">${cols.map((c) => cell(c, m.total, { label: "Total" })).join("")}</tr></tfoot>` : "";
    return `
      <div class="e-permits-workplace__table-wrap e-permits-rpt-table-wrap">
        <table class="e-permits-workplace__table e-permits-reg-table__table e-permits-wid-table e-permits-wid-table--agg e-permits-rpt-table">
          <caption class="u-visually-hidden">${esc(v.names.ro || "Raport")} — previzualizare cu date demonstrative</caption>
          <thead>${headHtml(v, { link })}</thead>
          <tbody>${body}</tbody>
          ${foot}
        </table>
      </div>`;
  }
  /* the report as its user will see it: name + „ⓘ” with the description (Feature UX: „regulile raportului se văd sub un
     buton de informare”), the table, the manual-columns note, the filters / grouping line */
  /* the filters above the preview table: „live” = the library facet filter (mounted into `[data-rpt-fslot]` by
     mountFilters); „static” (the „Mărește” dialog, the version window) = read-only: the foot line lists the filters and the
     values applied in the preview (the library chip has no disabled look — a summary reads clearer) */
  function appliedText(v, sel) {
    const fl = liveFilters(v);
    return selEntries(sel).map(([key, values]) => {
      const flt = fl.find((x) => facetKey(x) === key);
      if (!flt) return "";
      const lbl = fieldOf(v.source, flt.field)?.label || flt.field;
      return `${lbl}: ${flt.type === "date" ? window.GEAPFacetFilter?.dateText?.(values[0], DEMO_TODAY) || values[0] : values.join(", ")}`;
    }).filter(Boolean).join("; ");
  }
  function cardHtml(v, { link = false, filters = "static", sel = null } = {}) {
    const name = v.names.ro || "Denumirea raportului";
    const info = v.descriptions.ro ? `<button class="e-permits-fo-role-info" type="button" aria-label="Despre raport" data-tooltip-hint="${esc(v.descriptions.ro)}">${icon("circle-info-filled", 16)}</button>` : "";
    const sub = [label(CATEGORIES, v.category), sourceName(v.source)].filter(Boolean).join(" · ");
    let body;
    if (!v.source) body = E()?.render({ title: "Alege sursa de date", text: "Previzualizarea folosește câmpurile sursei, pe date demonstrative.", icon: "page-text", compact: true, bare: true }) || "";
    else if (!v.columns.length) body = E()?.render({ title: "Nicio coloană încă", text: "Adaugă coloane din sursa de date, calculate sau completate manual: raportul apare aici pe măsură ce îl construiești.", icon: "page-text", compact: true, bare: true }) || "";
    else {
      const chips = liveFilters(v).length && filters === "live" ? '<div class="e-permits-rpt-fslot" data-rpt-fslot></div>' : "";
      const rows = previewModel(v, sel).rowCount;
      body = chips + (rows
        ? tableHtml(v, { link, sel })
        : `<div class="e-permits-rpt-nomatch">${E()?.render({ title: NO_MATCH, text: "Niciun rând nu corespunde filtrelor alese. Schimbă sau șterge filtrele.", icon: "search", compact: true, actionHtml: filters === "live" ? '<button class="btn btn-neutral btn-sm" type="button" data-rpt-filter-clear>Șterge filtrele</button>' : "" }) || ""}</div>`);
      if (rows && v.columns.some((c) => c.kind === "manual")) body += U().renderInfoNote?.(`<strong>Coloane «Manual».</strong> ${esc(MANUAL_HINT)}`) || "";
    }
    const chipsShown = Boolean(v.source && v.columns.length && liveFilters(v).length && filters === "live");
    const applied = filters === "live" ? "" : appliedText(v, sel);
    const foot = [
      applied ? `Aplicate în previzualizare: ${applied}` : "",
      v.filters.length && !chipsShown ? `Filtre la generare: ${v.filters.map((f) => `${fieldOf(v.source, f.field)?.label || "—"} (${label(FILTER_TYPES, f.type).toLocaleLowerCase("ro") || "—"})`).join(", ")}` : "",
      v.groupBy && colOf(v, v.groupBy) ? `Grupat după ${colName(colOf(v, v.groupBy))}, cu subtotal pe grup` : "",
      v.columns.some(isMeasure) ? (v.totalRow ? "Cu rândul de total" : "Fără rândul de total") : ""
    ].filter(Boolean);
    return `
      <article class="e-permits-chart e-permits-wid-card e-permits-rpt-card" aria-label="Previzualizarea raportului ${esc(name)}">
        <div class="e-permits-wid-card__head">
          <div class="e-permits-rpt-card__title-row"><p class="e-permits-wid-card__title">${esc(name)}</p>${info}</div>
          ${sub ? `<p class="e-permits-wid-card__subtitle">${esc(sub)}</p>` : ""}
        </div>
        <div class="e-permits-wid-card__body" aria-live="polite">${body}${foot.length ? `<p class="e-permits-wid-card__foot">${foot.map(esc).join(" · ")}</p>` : ""}</div>
      </article>`;
  }
  function previewHtml(v, { idp, ctx = "" } = {}) {
    const me = who();
    const src = sourceOf(v.source);
    const meta = `Date demonstrative · Perimetru: ${me.central ? "toate autoritățile" : authName(me.authority)}${src ? ` · ${src.name} ${src.version}` : ""}`;
    return `
      <section class="e-permits-wid-preview e-permits-rpt-preview" aria-labelledby="${idp}-preview-title">
        <div class="e-permits-dosar-profil__section-heading">
          <div class="e-permits-wid-preview__titles">
            <h2 class="e-permits-dosar-profil__section-title" id="${idp}-preview-title">Previzualizare</h2>
            <p class="e-permits-dosar-profil__section-meta e-permits-wid-preview__meta">${esc(meta)}</p>
          </div>
          <div class="e-permits-passport__heading-tools">
            <button class="btn btn-neutral btn-sm btn-icon-only" type="button" aria-label="Mărește previzualizarea" data-tooltip-label="Mărește" aria-haspopup="dialog" data-rpt-zoom${v.columns.length ? "" : ' aria-disabled="true" data-tooltip-reason="Adaugă mai întâi coloane."'}>${icon("enlarge", 16)}</button>
          </div>
        </div>
        <div class="e-permits-wid-preview__stage">${cardHtml(v, { link: idp === IDP, filters: ctx ? "live" : "static", sel: ctx ? fx(ctx).state.applied : null })}</div>
      </section>`;
  }

  /* ================================================================ form pieces (the KPI / widget form vocabulary) */
  const req = () => U().requiredMark?.() || "";
  const errorHtml = (id, msg) => `<span class="message message--inline message--error e-permits-fo-field__error" id="${id}-error">${icon("circle-error-filled")}<span>${esc(msg)}</span></span>`;
  const hintRow = (id, hint, count, max) => `<p class="e-permits-fo-field__hint e-permits-ntpl-count" id="${id}-hint"><span>${esc(hint)}</span><span class="e-permits-ntpl-count__value${count > max ? " is-over" : ""}" data-rpt-count="${id}">${count}/${max}</span></p>`;
  function textField(id, attr, lbl, value, { required = false, max = 0, hint = "", error = "", span = 12, counter = false, placeholder = "" } = {}) {
    const count = String(value ?? "").length;
    const described = error ? `${id}-error` : hint || counter ? `${id}-hint` : "";
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
        <label for="${id}">${esc(lbl)}${required ? req() : ""}</label>
        <div class="e-permits-fo-input${error ? " is-error" : ""}">
          <input id="${id}" type="text" value="${esc(value ?? "")}" autocomplete="off"${placeholder ? ` placeholder="${esc(placeholder)}"` : ""}${required ? ' aria-required="true"' : ""}${error ? ' aria-invalid="true"' : ""}${described ? ` aria-describedby="${described}"` : ""} ${attr}>
        </div>
        ${error ? errorHtml(id, error) : counter ? hintRow(id, hint, count, max) : hint ? `<p class="e-permits-fo-field__hint" id="${id}-hint">${esc(hint)}</p>` : ""}
      </div>`;
  }
  function areaField(id, attr, lbl, value, { hint = "", span = 12 } = {}) {
    const count = String(value || "").length;
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
        <label for="${id}">${esc(lbl)}</label>
        <div class="e-permits-fo-textarea"><textarea id="${id}" rows="3" aria-describedby="${id}-hint" spellcheck="true" ${attr}>${esc(value)}</textarea></div>
        ${hintRow(id, hint, count, TEXT_MAX)}
      </div>`;
  }
  function selectField(id, attr, lbl, options, value, { required = false, placeholder = "", hint = "", error = "", span = 6, disabled = false } = {}) {
    const optionsHtml = `${placeholder ? `<option value=""${value ? "" : " selected"}>${esc(placeholder)}</option>` : ""}${options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(value) ? " selected" : ""}>${esc(l)}</option>`).join("")}`;
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
        <label for="${id}">${esc(lbl)}${required ? req() : ""}</label>
        ${U().renderFoSelectControl?.({ id, attrs: attr, optionsHtml, error: Boolean(error), disabled }) || ""}
        ${error ? errorHtml(id, error) : hint ? `<p class="e-permits-fo-field__hint" id="${id}-hint">${esc(hint)}</p>` : ""}
      </div>`;
  }
  const grid = (...parts) => `<div class="e-permits-user-create__grid">${parts.join("")}</div>`;
  const full = (html) => (html ? `<div class="e-permits-user-create__field e-permits-user-create__field--12">${html}</div>` : "");
  const section = (title, body, { meta = "", id = "" } = {}) => `<section class="e-permits-dosar-profil__section"${id ? ` aria-labelledby="${id}"` : ""}><div class="e-permits-dosar-profil__section-heading"><h2 class="e-permits-dosar-profil__section-title"${id ? ` id="${id}"` : ""}>${esc(title)}</h2>${meta ? `<span class="e-permits-dosar-profil__section-meta" aria-live="polite">${esc(meta)}</span>` : ""}</div><div class="e-permits-ntpl-card">${body}</div></section>`;
  /* option cards (the widget type card, radio variant, no glyph) — categories, levels, column kinds */
  function optionCards(id, name, attr, options, value, { error = "", legend = "", cls = "" } = {}) {
    return `
      <fieldset class="e-permits-wid-types${cls ? ` ${cls}` : ""}" id="${id}"${error ? ` aria-describedby="${id}-error"` : ""}>
        <legend class="u-visually-hidden">${esc(legend)}</legend>
        <div class="e-permits-wid-types__grid">${options.map(([key, text, desc]) => `
          <label class="e-permits-fo-delivery-option e-permits-fo-delivery-option--radio e-permits-wid-type${value === key ? " is-selected" : ""}">
            <input class="e-permits-fo-delivery-option__input" type="radio" name="${name}" value="${esc(key)}"${value === key ? " checked" : ""} ${attr} aria-describedby="${id}-${key}-desc">
            <span class="e-permits-fo-delivery-option__content">
              <span class="e-permits-fo-delivery-option__copy">
                <span class="e-permits-fo-delivery-option__title-row"><span class="e-permits-fo-delivery-option__title">${esc(text)}</span></span>
                <span class="e-permits-fo-delivery-option__description" id="${id}-${key}-desc">${esc(desc)}</span>
              </span>
            </span>
            <span class="radio radio--small e-permits-fo-delivery-option__radio" aria-hidden="true"><span class="radio-custom"></span></span>
          </label>`).join("")}</div>
        ${error ? errorHtml(id, error) : ""}
      </fieldset>`;
  }
  /* rpt-rich-select-v1 (user): a dropdown whose items = icon + label + one short line (the „Adaugă coloană ▾” menu pattern:
     `.e-permits-fo-intent-menu` in a `.e-permits-stack__menu-wrap`), the trigger = the library select box showing the chosen
     icon + label; items 40+ high, phones 48; the chosen item is marked (aria-checked + the check) */
  function richSelect(id, kind, options, icons, value, { error = "", lblId = "" } = {}) {
    const cur = options.find((o) => o[0] === value);
    return `
      <div class="e-permits-fo-select e-permits-stack__menu-wrap e-permits-rpt-rich${error ? " is-error" : ""}">
        <button class="e-permits-fo-select__button" type="button" id="${id}" aria-haspopup="menu" aria-expanded="false" aria-controls="${id}-menu" data-stack-menu-trigger${lblId ? ` aria-labelledby="${lblId} ${id}"` : ""}${error ? ` aria-invalid="true" aria-describedby="${id}-error"` : ""}>
          <span class="e-permits-rpt-rich__value">${cur ? `${icon(icons[cur[0]])}<span class="e-permits-fo-select__value" data-cell-tooltip>${esc(cur[1])}</span>` : '<span class="e-permits-fo-select__value e-permits-fo-select__value--placeholder">Alege</span>'}</span>
          ${icon("chevron-bottom", 20)}
        </button>
        <ul class="e-permits-fo-intent-menu e-permits-stack__menu e-permits-rpt-add-menu e-permits-rpt-rich__menu" id="${id}-menu" role="menu" aria-label="${esc(kind)}" hidden data-stack-menu>
          ${options.map(([key, text, desc]) => `<li role="none"><button class="e-permits-fo-intent-menu__item e-permits-rpt-add-menu__item${key === value ? " is-selected" : ""}" type="button" role="menuitemradio" aria-checked="${key === value}" data-rpt-pick="${kind}|${esc(key)}">${icon(icons[key])}<span class="e-permits-rpt-add-menu__text"><span class="e-permits-rpt-add-menu__title">${esc(text)}</span><span class="e-permits-rpt-add-menu__desc">${esc(desc)}</span></span>${key === value ? icon("checkmark-large") : ""}</button></li>`).join("")}
        </ul>
      </div>
      ${error ? errorHtml(id, error) : ""}`;
  }
  const labelled = (lblId, lbl, html, { required = false } = {}) => `<div class="e-permits-wid-vis-field"><span class="e-permits-cfg-ro__label" id="${lblId}">${esc(lbl)}${required ? req() : ""}</span>${html}</div>`;

  /* ================================================================ the steps (Feature UX: Date generale · Coloane · Structură) */
  const IDP = "rpt-e";
  function stepGeneral(v, e, idp, { jump = false } = {}) {
    const me = who();
    const auths = D().authorities;
    const level = me.central
      ? full(labelled(`${idp}-level-label`, "Nivel", richSelect(`${idp}-level`, "level", LEVELS, LEVEL_ICON, v.level, { lblId: `${idp}-level-label` }), { required: true }))
      : "";
    const authPicker = v.level === "Autoritate" ? full(me.central
      ? labelled(`${idp}-auth-label`, "Autoritate(ți)", `
          <div class="e-permits-rpt-auths" role="group" aria-labelledby="${idp}-auth-label" id="${idp}-authorities">
            ${U().renderCheckOption?.({ label: "Toate autoritățile", checked: auths.length > 0 && auths.every((a) => v.authorities.includes(a.id)), attrs: "data-rpt-auth-all" }) || ""}
            ${auths.map((a) => U().renderCheckOption?.({ label: `${a.name} · ${a.long}`, checked: v.authorities.includes(a.id), attrs: `data-rpt-auth="${esc(a.id)}"${e.authorities ? ' aria-invalid="true"' : ""}` }) || "").join("")}
          </div>
          ${e.authorities ? errorHtml(`${idp}-authorities`, e.authorities) : ""}`, { required: true })
      : labelled(`${idp}-auth-label`, "Autoritate", `<div class="e-permits-cfg-ro" aria-labelledby="${idp}-auth-label">${esc(authName(me.authority))} · ${esc(D().authorities.find((a) => a.id === me.authority)?.long || "")}</div><p class="e-permits-fo-field__hint">Raportul se creează la nivelul autorității tale.</p>`)) : "";
    const fromPicker = idp === IDP && P.isNew && cloneSources().length
      ? section("Punctul de plecare", grid(selectField(`${idp}-from`, "data-rpt-from", "Raportul sursă", cloneSources().map((r) => [r.id, `${r.id} · ${r.config.names.ro}`]), P.from, { span: 12, placeholder: "Raport gol", hint: P.from ? "Copia primește coloanele, formulele și structura raportului sursă; o modifici independent." : "Opțional: alege un raport existent ca să-l clonezi." })))
      : "";
    return `
      ${fromPicker}
      ${section("Categoria și sursa de date", grid(
        full(labelled(`${idp}-category-label`, "Categoria raportului", richSelect(`${idp}-category`, "category", CATEGORIES, CATEGORY_ICON, v.category, { error: e.category, lblId: `${idp}-category-label` }), { required: true })),
        selectField(`${idp}-source`, 'data-rpt-field="source"', "Sursa de date", sources().map((s) => [s.id, `${s.name} · ${s.version}`]), v.source, { required: true, span: 12, placeholder: "Alege sursa de date", hint: "Doar sursele de date publicate. Coloanele, filtrele și formulele folosesc câmpurile ei.", error: e.source }),
        level,
        authPicker
      ))}
      ${section("Denumire și descriere", grid(
        textField(`${idp}-name-ro`, 'data-rpt-field="names.ro"', "Denumire (RO)", v.names.ro, { required: true, max: NAME_MAX, counter: true, hint: "„Raport <ce arată>”, de exemplu „Raport dosare finalizate pe autoritate”.", error: e["names.ro"] }),
        textField(`${idp}-name-ru`, 'data-rpt-field="names.ru"', "Denumire (RU)", v.names.ru, { span: 12 }),
        textField(`${idp}-name-en`, 'data-rpt-field="names.en"', "Denumire (EN)", v.names.en, { span: 12 }),
        areaField(`${idp}-desc-ro`, 'data-rpt-field="descriptions.ro"', "Descriere (RO)", v.descriptions.ro, { hint: "Regulile raportului, afișate sub butonul de informare." }),
        areaField(`${idp}-desc-ru`, 'data-rpt-field="descriptions.ru"', "Descriere (RU)", v.descriptions.ru, {}),
        areaField(`${idp}-desc-en`, 'data-rpt-field="descriptions.en"', "Descriere (EN)", v.descriptions.en, {})
      ))}`;
  }
  /* the column list = the Registre „Coloanele registrului” stacked list (order handle + drag, ↑ ↓, trash; row → panel) */
  const orderLead = (n) => `<span class="e-permits-ekcfg-order"><span class="e-permits-ekcfg-order__handle" aria-hidden="true">${icon("drag", 16)}</span><span class="e-permits-ekcfg-order__n" aria-label="Poziția ${n}">${n}</span></span>`;
  function columnMeta(v, c) {
    const out = [];
    if (c.kind === "source") out.push(`Câmp: ${fieldOf(v.source, c.field)?.label || "—"}`);
    if (c.kind === "calc") {
      const f = formulaOf(c.formula);
      out.push(f ? `${f.names.ro}${f.operands.length ? ` · ${f.operands.map((o) => `${o.key} = ${colOf(v, c.operands?.[o.key]) ? colName(colOf(v, c.operands[o.key])) : "—"}`).join(", ")}` : ""}` : "Formula: —");
    }
    if (c.kind === "manual") out.push(MANUAL_HINT);
    out.push(label(DATA_TYPES, c.dataType) || "—");
    if (String(c.header || "").trim()) out.push(`Antet comun: ${c.header.trim()}`);
    return out.map(esc);
  }
  function stepColumns(v, e, idp, { jump = false } = {}) {
    const cols = v.columns;
    const last = cols.length - 1;
    const textCols = cols.filter(groupable).length;
    /* rpt-group-v1 (2026-11-10, user; Airtable / Notion „group by” from the field): an icon-only toggle on every groupable
       Text column, before ↑ ↓ 🗑 — pressed = the column the rows are grouped by (one at a time: another moves it, the
       pressed one removes it); a lone Text column cannot group (nothing left to list the rows by) */
    const groupBtn = (c) => {
      if (!groupable(c)) return "";
      const on = v.groupBy === c.id;
      const off = !on && textCols < 2;
      const tip = off ? ' aria-disabled="true" data-tooltip-reason="Adaugă încă o coloană Text: rândurile se grupează după una și se listează după cealaltă."' : ` data-tooltip-label="${on ? "Elimină gruparea" : "Grupează rândurile după această coloană"}"`;
      return `<button class="btn btn-text-neutral btn-sm btn-icon-only e-permits-rpt-group-btn" type="button" aria-pressed="${on}" aria-label="Grupează rândurile după „${esc(colName(c))}”"${tip} data-rpt-col-group="${esc(c.id)}">${icon("bullet-list", 16)}</button>`;
    };
    /* „Adaugă coloană ▾” (rpt-add-menu-v1, 2026-11-09, user; Airtable / Notion / Retool „add field → choose type”): ONE
       library secondary button (plus + label + chevron) opening the stack dropdown; items = icon + kind + one short line */
    const ADD_ITEMS = [
      ["source", "data-access", "Din sursa de date", "Un câmp din dicționarul sursei de date."],
      ["calc", "calculator", "Calculată", "Rezultatul unei formule din setul de formule."],
      ["manual", "edit", "Completată manual", "Fără valoare din sistem: se completează la generare."]
    ];
    const add = () => `
      <div class="e-permits-stack__menu-wrap e-permits-rpt-add">
        <button class="btn btn-secondary btn-sm e-permits-stack__menu-trigger" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="${idp}-add-menu" data-stack-menu-trigger data-rpt-add-trigger>${icon("plus-large", 16)}<span>Adaugă coloană</span>${icon("chevron-bottom", 16)}</button>
        <ul class="e-permits-fo-intent-menu e-permits-stack__menu e-permits-rpt-add-menu" id="${idp}-add-menu" role="menu" aria-label="Tipul coloanei" hidden data-stack-menu>
          ${ADD_ITEMS.map(([kind, ic, text, desc]) => {
            const off = kind === "source" && !v.source;
            return `<li role="none"><button class="e-permits-fo-intent-menu__item e-permits-rpt-add-menu__item" type="button" role="menuitem" data-rpt-add="${kind}"${off ? ' aria-disabled="true" data-tooltip-reason="Alege mai întâi sursa de date."' : ""}>${icon(ic)}<span class="e-permits-rpt-add-menu__text"><span class="e-permits-rpt-add-menu__title">${esc(text)}</span><span class="e-permits-rpt-add-menu__desc">${esc(off ? "Alege mai întâi sursa de date (pasul 1)." : desc)}</span></span></button></li>`;
          }).join("")}
        </ul>
      </div>`;
    const list = cols.length ? `<div class="e-permits-stack e-permits-reg-editor__stack"><ul class="e-permits-stack__list" role="list" data-rpt-cols>${cols.map((c, i) => {
      const err = e[`col.${c.id}`];
      const [kt, kTone] = KIND_TAG[c.kind] || KIND_TAG.source;
      return (A().renderStackItem?.({
        plainTitle: colName(c),
        title: esc(colName(c)),
        leadHtml: orderLead(i + 1),
        rowAttrs: `data-rpt-col="${esc(c.id)}" data-index="${i}" tabindex="0" data-stack-row-open aria-haspopup="dialog" aria-label="Coloana ${esc(colName(c))}, poziția ${i + 1} — deschide setările"`,
        badges: [tag(kt, kTone), v.groupBy === c.id ? tag("Grupare", "brand") : "", c.total === "incl" && isMeasure(c) ? tag("Inclusiv", "neutral") : "", err ? tag("De corectat", "danger") : ""].filter(Boolean),
        meta: columnMeta(v, c),
        /* rpt-col-list-v4 (user: „bring back arrows”): the original controls — ↑ / ↓ (disabled at the ends) + the red trash */
        actionsHtml: `
          ${groupBtn(c)}
          <button class="btn btn-strict btn-sm btn-icon-only" type="button" aria-label="Mută „${esc(colName(c))}” mai sus" data-tooltip-label="Mută mai sus" data-rpt-col-move="${esc(c.id)}|-1"${i === 0 ? " disabled" : ""}>${icon("arrow-up", 16)}</button>
          <button class="btn btn-strict btn-sm btn-icon-only" type="button" aria-label="Mută „${esc(colName(c))}” mai jos" data-tooltip-label="Mută mai jos" data-rpt-col-move="${esc(c.id)}|1"${i === last ? " disabled" : ""}>${icon("arrow-down", 16)}</button>
          <button class="btn btn-text-destructive btn-sm btn-icon-only" type="button" aria-label="Elimină coloana „${esc(colName(c))}”" data-tooltip-label="Elimină coloana" data-rpt-col-remove="${esc(c.id)}">${icon("delete", 16)}</button>`
      }) || "").replace('<li class="e-permits-stack__item', '<li draggable="true" class="e-permits-stack__item');
    }).join("")}</ul></div>
      ${add()}`
      : `${E()?.render({ title: "Nicio coloană încă", text: v.source ? "Adaugă coloane din dicționarul sursei de date, calculate cu o formulă sau completate manual." : "Alege mai întâi sursa de date (pasul 1), apoi adaugă coloanele.", icon: "page-text", compact: true, actionHtml: add() }) || ""}${e.columns ? errorHtml(`${idp}-columns`, e.columns) : ""}`;
    return `
      <section class="e-permits-dosar-profil__section e-permits-stack-section" aria-labelledby="${idp}-cols-title" id="${idp}-columns">
        <div class="e-permits-dosar-profil__section-heading">
          <h2 class="e-permits-dosar-profil__section-title" id="${idp}-cols-title">Coloanele raportului</h2>
          <span class="e-permits-dosar-profil__section-meta" aria-live="polite">${esc(plural(cols.length, "coloană", "coloane"))}</span>
        </div>
        ${list}
      </section>`;
  }
  /* Structură: Gruparea rândurilor · Filtre · Rândul de total */
  const kw = (text) => `<code class="e-permits-doc-kw">${esc(text)}</code>`;
  function filterRows(v, e, idp) {
    const fields = fieldsOf(v.source).filter((f) => (FILTER_SUPPORT[f.type] || []).length);
    const sel = (id, attrs, placeholder, opts, value, { error = false, lbl = "" } = {}) => U().renderFoSelectControl?.({ id, attrs, error, label: lbl, optionsHtml: `<option value=""${value ? "" : " selected"} disabled>${esc(placeholder)}</option>${opts.map(([val, l]) => `<option value="${esc(val)}"${val === value ? " selected" : ""}>${esc(l)}</option>`).join("")}` }) || "";
    const add = `<button class="btn btn-secondary btn-sm" type="button" data-rpt-filter-add${v.source ? "" : ' aria-disabled="true" data-tooltip-reason="Alege mai întâi sursa de date."'}>${icon("plus-large", 16)}<span>Adaugă filtru</span></button>`;
    const live = liveFilters(v);
    if (!v.filters.length) return E()?.render({ title: "Fără filtre", text: "Raportul se generează pe toate înregistrările sursei. Adaugă filtre pe câmpurile filtrabile: Text, Alegere unică, Alegere multiplă sau Interval de date.", icon: "filter", compact: true, actionHtml: add }) || "";
    return `
      <div class="e-permits-doc-rule e-permits-reg-editor__rule e-permits-rpt-filters">
        <div class="e-permits-doc-rule__when">${kw("Filtre la generare")}</div>
        <ol class="e-permits-doc-rule__conds" role="list" data-rpt-flts>${v.filters.map((f, i) => {
          const err = e[`filter.${i}`];
          const types = f.field ? FILTER_TYPES.filter(([k]) => supportOf(v, f.field).includes(k)) : FILTER_TYPES;
          const name = fieldOf(v.source, f.field)?.label || `Filtrul ${i + 1}`;
          const pos = live.indexOf(f);
          /* rpt-filter-order-v1: the order = the chips' order above the preview — the first 4 are chips, the rest wait in
             „Mai multe” (the item says so); drag the item (handle) or ↑ ↓, the same FLIP slide as the columns */
          return `${i ? `<li class="e-permits-doc-cond__join" aria-hidden="true">${kw("și")}</li>` : ""}
            <li class="e-permits-doc-cond e-permits-rpt-filter e-permits-hover-surface is-hover-within" draggable="true" data-rpt-flt="${i}" data-index="${i}">
              <div class="e-permits-rpt-filter__head">
                ${orderLead(i + 1)}
                ${pos >= 4 ? tag("În «Mai multe»", "neutral") : ""}
                <span class="e-permits-rpt-filter__actions">
                  <button class="btn btn-strict btn-sm btn-icon-only" type="button" aria-label="Mută filtrul „${esc(name)}” mai sus" data-tooltip-label="Mută mai sus" data-rpt-flt-move="${i}|-1"${i === 0 ? " disabled" : ""}>${icon("arrow-up", 16)}</button>
                  <button class="btn btn-strict btn-sm btn-icon-only" type="button" aria-label="Mută filtrul „${esc(name)}” mai jos" data-tooltip-label="Mută mai jos" data-rpt-flt-move="${i}|1"${i === v.filters.length - 1 ? " disabled" : ""}>${icon("arrow-down", 16)}</button>
                  <button class="btn btn-text-destructive btn-sm btn-icon-only" type="button" aria-label="Elimină filtrul „${esc(name)}”" data-tooltip-label="Elimină filtrul" data-rpt-filter-remove="${i}">${icon("delete", 16)}</button>
                </span>
              </div>
              <div class="e-permits-doc-cond__cell">${sel(`${idp}-filter-field-${i}`, `data-rpt-filter="${i}" data-rpt-filter-part="field"`, "Câmpul", fields.map((x) => [x.key, x.label]), f.field, { error: Boolean(err) && !f.field, lbl: `Câmpul filtrului ${i + 1}` })}</div>
              <div class="e-permits-doc-cond__cell">${sel(`${idp}-filter-type-${i}`, `data-rpt-filter="${i}" data-rpt-filter-part="type"`, "Tipul filtrului", types, f.type, { error: Boolean(err) && Boolean(f.field), lbl: `Tipul filtrului ${i + 1}` })}${err ? errorHtml(`${idp}-filter-${i}`, err) : ""}</div>
            </li>`;
        }).join("")}</ol>
        <div class="e-permits-doc-rule__foot">${add}</div>
      </div>`;
  }
  function stepStructure(v, e, idp, { jump = false } = {}) {
    /* rows are grouped by one Text column and listed by another: a single Text column has nothing to group */
    const groupCols = v.columns.filter(groupable);
    const canGroup = groupCols.length > 1;
    const measures = v.columns.some(isMeasure);
    const gcol = v.groupBy ? colOf(v, v.groupBy) : null;
    /* rpt-group-v1: where the column list is on the same page (the profile) the grouping is set from the list (the
       toggle on the column) and this section is ONE summary line; the sheet's Structură step has no column list → the
       select stays there (same state) */
    const summary = gcol
      ? `<div class="e-permits-rpt-group-sum"><p class="e-permits-rpt-group-sum__text">Grupat după <strong>${esc(colName(gcol))}</strong>, cu subtotal pe grup.</p><button class="btn btn-text-destructive btn-sm" type="button" data-rpt-group-clear>${icon("delete", 16)}<span>Elimină gruparea</span></button></div>`
      : `<div class="e-permits-rpt-group-sum"><p class="e-permits-rpt-group-sum__text">${canGroup ? `Fără grupare. Apasă ${icon("bullet-list", 16)} la o coloană Text din «Coloanele raportului» ca să grupezi rândurile; fiecare grup primește un subtotal.` : "Fără grupare. Adaugă cel puțin două coloane Text: rândurile se grupează după una și se listează după cealaltă."}</p></div>`;
    return `
      ${section("Gruparea rândurilor", jump ? summary : grid(
        selectField(`${idp}-groupby`, 'data-rpt-field="groupBy"', "Grupează rândurile după", [["", "Fără grupare"], ...groupCols.map((c) => [c.id, colName(c)])], v.groupBy, { span: 12, hint: canGroup ? "Opțional. Fiecare grup are un rând de subtotal. Poți grupa și din lista coloanelor (pasul 2)." : "Adaugă cel puțin două coloane Text: rândurile se grupează după una și se listează după cealaltă.", error: e.groupBy, disabled: !canGroup && !v.groupBy })
      ))}
      ${section("Filtre", filterRows(v, e, idp))}
      ${section("Rândul de total", grid(full(U().renderToggle?.({
        label: "Rândul de total",
        description: measures ? "Implicit «Da» când raportul are coloane numerice sau valorice. Coloanele calculate se recalculează pe totaluri." : "Raportul nu are coloane numerice sau valorice: nu are ce aduna.",
        checked: measures && Boolean(v.totalRow),
        disabled: !measures,
        attrs: 'data-rpt-field="totalRow"'
      }) || "")))}`;
  }

  /* ---- read-only passport blocks (profile of a report you cannot edit, review step) */
  function configRows(v) {
    const d = (x) => (x ? esc(x) : dash);
    return {
      general: [
        ["Denumire (RO)", d(v.names.ro)], ["Denumire (RU)", d(v.names.ru)], ["Denumire (EN)", d(v.names.en)],
        ["Descriere", d(v.descriptions.ro)], ["Categoria", d(label(CATEGORIES, v.category))], ["Sursa de date", d(sourceName(v.source))], ["Nivel", d(levelText(v))]
      ],
      columns: v.columns.length ? v.columns.map((c, i) => [`${i + 1}. ${colName(c)}`, esc([KIND_TAG[c.kind]?.[0], ...columnMeta(v, c).map((x) => x.replace(/&[^;]+;/g, (m) => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" }[m] || m))), c.total === "incl" && isMeasure(c) ? "Inclusiv" : ""].filter(Boolean).join(" · "))]) : [["Coloane", dash]],
      structure: [
        ["Gruparea rândurilor", v.groupBy && colOf(v, v.groupBy) ? esc(colName(colOf(v, v.groupBy))) : "Fără grupare"],
        ["Filtre", v.filters.length ? esc(v.filters.map((f) => `${fieldOf(v.source, f.field)?.label || "—"} · ${label(FILTER_TYPES, f.type) || "—"}`).join("; ")) : "Fără filtre"],
        ["Rândul de total", v.columns.some(isMeasure) && v.totalRow ? "Da" : "Nu"]
      ]
    };
  }
  function readBlocks(v, { goto = null } = {}) {
    const rows = configRows(v);
    const block = (title, list, n) => A().renderPassportBlock?.(title, list, goto ? { actionHtml: goto(n) } : {}) || "";
    return `${block("Date generale", rows.general, 1)}${block("Coloane", rows.columns, 2)}${block("Structură", rows.structure, 3)}`;
  }
  function stepReview(v) {
    const goto = (n) => `<button class="btn btn-text-neutral btn-sm" type="button" data-rpt-goto="${n}">${icon("edit", 16)}<span>Editează</span></button>`;
    const problems = publishProblems(v);
    return `
      ${problems.length
        ? U().renderNotice?.("warning", `<strong>Raportul se poate salva ca ciornă, dar nu se poate publica încă.</strong> ${problems.map(esc).join(" ")}`) || ""
        : U().renderInfoNote?.("<strong>Configurația este completă.</strong> Raportul se poate publica.") || ""}
      ${readBlocks(v, { goto })}
      ${U().renderInfoNote?.(`Raportul se salvează la nivelul <strong>${esc(levelText(v))}</strong>, în statutul Ciornă. ID-ul se generează la prima salvare.`) || ""}`;
  }

  /* ================================================================ LIST (US-467) */
  const rowOf = (r) => {
    const lv = lastVersion(r);
    return {
      id: r.id, denumire: r.config.names.ro, categorie: label(CATEGORIES, r.config.category), sursa: sourceName(r.config.source),
      nivel: r.config.level, autoritate: r.config.level === "Global" ? "" : r.config.authorities.map(authName).join(", "),
      statut: r.status, tone: STATUS_TONE[r.status] || "neutral", versiune: lv ? String(lv.version) : "", nepublicat: unpublished(r), modificat: r.updatedAt || "", r
    };
  };
  function registryDb() {
    if (!S.data) load().then(() => { if (document.querySelector(`[data-workplace][data-registry-kind="${KIND}"]`)) refreshList(); });
    const me = who();
    return {
      kind: KIND,
      fixedWidths: true,
      fieldCount: 8,
      defaultSort: "id",
      defaultSortDirection: "asc",
      columns: {
        id: { label: "ID", width: 112, sortable: true },
        denumire: { label: "Denumire", width: 320, sortable: true },
        categorie: { label: "Categorie", width: 176, sortable: true },
        sursa: { label: "Sursa de date", width: 216, sortable: true },
        nivel: { label: "Nivel", width: 168, sortable: true },
        statut: { label: "Statut", width: 136, sortable: true },
        versiune: { label: "Versiune", width: 168, sortable: true },
        modificat: { label: "Modificat", width: 184, sortable: true },
        ...(me.has ? { actiuni: { label: "", width: 56, pin: "end" } } : {})
      },
      views: {
        [KIND]: {
          title: TITLE,
          selectable: false,
          /* Feature user flow 1: the list grouped by the report's category */
          groupBy: "categorie",
          searchPlaceholder: "Caută după ID sau denumire",
          columns: ["id", "denumire", "categorie", "sursa", "nivel", "statut", "versiune", "modificat", ...(me.has ? ["actiuni"] : [])],
          tabs: [],
          primaryAction: canCreate() ? { id: "rpt-new", label: "Raport nou" } : null,
          toolbarLabel: "Filtrare rapoarte",
          exportLabel: "Exportă CSV"
        }
      },
      runtimeRows: reports().map(rowOf)
    };
  }
  const SORT = { versiune: (r) => String(r.versiune || 0).padStart(4, "0"), modificat: (r) => r.modificat || "0000", nivel: (r) => `${r.nivel === "Global" ? 0 : 1}${r.autoritate}` };
  const HOOKS = {};
  function rowMenu(row) {
    const r = row.r;
    const items = [
      canEdit(r) && r.status !== "Dezactivat" && { label: "Editează", icon: "edit", attrs: `data-rpt-row-edit="${esc(r.id)}"` },
      ...(HOOKS.rowMenu?.(r, { canEdit: canEdit(r), canCreate: canCreate(), me: who() }) || [])
    ].filter(Boolean);
    if (!items.length) return "";
    const html = U().renderRowActions?.({ menu: items, label: `${r.id} ${r.config.names.ro}` }) || "";
    return html ? `<span class="e-permits-workplace__row-actions">${html.replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>")}</span>` : "";
  }
  const twoLines = (top, meta) => `<span class="e-permits-workplace__date-stack"><span>${top}</span><span class="e-permits-workplace__date-meta">${meta}</span></span>`;
  window.GEAPShellRegistries = window.GEAPShellRegistries || {};
  window.GEAPShellRegistries[KIND] = {
    build: registryDb,
    get facets() {
      return [
        { key: "categorie", label: "Categorie", get: (row) => row.categorie },
        { key: "statut", label: "Statut", get: (row) => row.statut },
        { key: "nivel", label: "Nivel", get: (row) => row.nivel },
        { key: "sursa", label: "Sursa de date", get: (row) => row.sursa }
      ];
    },
    searchText: (row) => `${row.id} ${row.denumire} ${fold(row.denumire)}`,
    sortValue: (row, key) => String(SORT[key]?.(row) ?? row[key] ?? ""),
    filterToken: () => true,
    rowClass: (row) => (row.statut === "Dezactivat" ? "is-inactive" : ""),
    renderCell: (row, key) => {
      switch (key) {
        case "id": return `<span data-cell-tooltip="${esc(row.id)}">${esc(row.id)}</span>`;
        case "denumire": return `<span data-cell-tooltip="${esc(row.denumire)}">${esc(row.denumire)}</span>`;
        case "categorie": return `<span data-cell-tooltip="${esc(row.categorie)}">${esc(row.categorie)}</span>`;
        case "sursa": return `<span data-cell-tooltip="${esc(row.sursa)}">${esc(row.sursa)}</span>`;
        case "nivel": return row.nivel === "Global" ? "Global" : twoLines(esc(row.nivel), `<span data-cell-tooltip="${esc(row.autoritate)}">${esc(row.autoritate)}</span>`);
        case "statut": return tag(row.statut, row.tone);
        /* „modificări nepublicate” = the clickable pending status (every config object, components.md) → the shared dialog */
        case "versiune": return row.versiune ? (row.nepublicat ? twoLines(esc(row.versiune), HOOKS.pending ? A().renderHeaderStatus?.("modificări nepublicate", "warning", `data-rpt-pending="${esc(row.id)}" aria-haspopup="dialog" data-tooltip-text="Vezi modificările" aria-label="Vezi modificările nepublicate ale ${esc(row.id)}"`) || "modificări nepublicate" : "modificări nepublicate") : esc(row.versiune)) : twoLines(dash, "nepublicat");
        case "modificat": return row.modificat ? twoLines(esc(longDate(row.modificat)), esc(`${time(row.modificat)} · ${row.r.updatedBy || ""}`)) : dash;
        case "actiuni": return rowMenu(row);
        default: return esc(row[key] ?? "") || dash;
      }
    },
    openRow: (id) => openProfile(id, "configurare"),
    rowLabel: (row) => `${row.id}, ${row.denumire} — deschide raportul`,
    emptyHtml: ({ query, filtered }) => {
      if (!who().has) return E()?.render({ title: DENIED, icon: "lock", bare: true });
      if (!S.data) return E()?.render({ title: "Se încarcă rapoartele…", loading: true, bare: true });
      if (query || filtered) return E()?.render({ title: NO_MATCH, text: "Caută după ID sau denumire, sau schimbă filtrele.", icon: "search", bare: true });
      return E()?.render({ title: EMPTY_LIST, text: canCreate() ? "Creează primul raport cu „Raport nou”." : "", icon: "page-text", bare: true, actionHtml: canCreate() ? '<button class="btn btn-primary btn-sm" type="button" data-rpt-new>Raport nou</button>' : "" });
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
    const head = ["ID", "Denumire", "Categorie", "Sursa de date", "Nivel", "Statut", "Versiune", "Modificat"];
    const lines = rows.map((r) => [r.id, r.denumire, r.categorie, r.sursa, r.nivel === "Global" ? "Global" : `${r.nivel} ${r.autoritate}`, r.statut, r.versiune || "-", r.modificat ? `${longDate(r.modificat)} ${time(r.modificat)}` : "-"]);
    const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const blob = new Blob([`﻿${[head, ...lines].map((l) => l.map(cell).join(";")).join("\r\n")}`], { type: "text/csv;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "rapoarte.csv" });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(`Am exportat ${plural(rows.length, "raport", "rapoarte")} în rapoarte.csv.`);
  }

  /* ---------------------------------------------------------------- audit (Feature AC: every configuration operation)
     the report's Istoric + the platform's unique Jurnalul de audit (GEAPEventTimeline.log = the US-262 record) */
  const journalEvent = (h) => ({ at: h.at, user: h.by, role: h.role, type: h.event, status: "Reușit", detail: h.detail || "" });
  const journalCtx = (r) => ({ module: "BackOffice", authority: r.config.level === "Global" ? "" : r.config.authorities.map(authName).join(", "), objectType: "Raport", objectId: r.id, objectVersion: lastVersion(r) ? `versiunea ${lastVersion(r).version}` : "ciornă", related: [] });
  function audit(r, kind, detail = "") {
    const h = { at: nowIso(), by: userName(), role: roleLabel(), event: EVENTS[kind] || kind, detail };
    r.history.unshift(h);
    window.GEAPEventTimeline?.log?.(journalEvent(h), journalCtx(r));
    r.updatedAt = nowIso(); r.updatedBy = userName();
  }

  /* ================================================================ PROFILE = the editor page (US-468)
     the widget profile: editor width, tabs Configurare · Versiuni · Istoric; Configurare = the three sections of the
     create sheet in one column (form 1fr) + the sticky preview (1fr); read-only = passport blocks + the preview */
  const P = { id: null, tab: "configurare", isNew: false, draft: null, base: null, errors: {}, saveError: false, step: 1, maxStep: 1 };
  const ALL_TABS = [["configurare", "Configurare"], ["versiuni", "Versiuni"], ["acces", "Acces"], ["istoric", "Istoric"]];
  /* „Acces” shows only when part 2 provides HOOKS.accessTab */
  const tabsNow = () => ALL_TABS.filter(([t]) => t !== "acces" || HOOKS.accessTab);
  const profileOpen = () => (Boolean(P.id) || P.isNew) && !document.querySelector("[data-dosar-profil]")?.hidden && A().els?.dosarProfilPanelBody?.id === "rpt-panel";
  const editable = (r = reportOf(P.id)) => P.isNew || (Boolean(r) && canEdit(r) && r.status !== "Dezactivat");
  const pageDirty = () => Boolean(P.draft) && (P.isNew ? Boolean(P.from || P.draft.names.ro || P.draft.source || P.draft.columns.length) : !same(P.draft, P.base));
  async function openProfile(id, tab = "configurare", { push = true } = {}) {
    await load();
    const r = reportOf(id);
    if (!who().has || !r || !visible(r)) { showDenied(); return; }
    if (P.id !== id || P.isNew) { fxReset("profile"); P.errors = {}; P.saveError = false; P.totalTouched = false; P.draft = clone(r.config); P.base = clone(r.config); }
    P.id = id; P.isNew = false;
    P.tab = tabsNow().some(([t]) => t === tab) ? tab : "configurare";
    show(`#raport/${id}/${P.tab}`, push);
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
  const changedLabels = () => {
    if (!P.draft || P.isNew) return [];
    const a = configRows(P.base);
    const b = configRows(P.draft);
    const out = [];
    ["general", "structure"].forEach((g) => { const mb = new Map(b[g]); a[g].forEach(([l, va]) => { if (mb.get(l) !== va) out.push([l, va, mb.get(l)]); }); });
    if (!same(P.base.columns, P.draft.columns)) out.push(["Coloane", plural(P.base.columns.length, "coloană", "coloane"), plural(P.draft.columns.length, "coloană", "coloane")]);
    return out;
  };
  function headerActions(r) {
    const d = pageDirty();
    const extra = HOOKS.headerActions?.(r, { editable: editable(r), dirty: d, canCreate: canCreate(), me: who() }) || "";
    const menu = HOOKS.headerMenu?.(r, { canEdit: canEdit(r), canCreate: canCreate(), me: who() }) || [];
    return `
      ${editable(r) ? `<button class="btn btn-secondary btn-sm" type="button" data-rpt-save${d ? "" : ' aria-disabled="true" data-tooltip-reason="Nu există modificări de salvat."'}>Salvează</button>` : ""}
      ${extra}
      ${menu.length ? (U().renderStackMenu?.(menu, r.config.names.ro) || "").replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>") : ""}`;
  }
  function headerTop(r) {
    const n = changedLabels().length;
    const status = n
      ? A().renderHeaderStatus?.(n === 1 ? "1 modificare nesalvată" : `${n} modificări nesalvate`, "warning", A().changesStatusAttrs?.("rpt-draft")) || ""
      : r && unpublished(r) && r.status !== "Dezactivat" ? A().renderHeaderStatus?.("Modificări nepublicate", "warning", HOOKS.pending ? 'data-rpt-pending aria-haspopup="dialog" data-tooltip-text="Vezi modificările"' : "") || "" : "";
    return A().renderPageHeaderTop({
      back: { label: TITLE, attr: "data-rpt-back" },
      title: r.config.names.ro,
      actions: headerActions(r),
      status,
      caption: r.updatedAt ? `Modificat ${longDate(r.updatedAt)}, ${time(r.updatedAt)} · ${r.updatedBy || ""}` : ""
    });
  }
  function renderProfile({ keep = "" } = {}) {
    const r = reportOf(P.id);
    const els = A().els || {};
    if (!r || !els.dosarProfilTitleRow) return;
    const active = document.activeElement;
    const keepSel = keep || (active && els.dosarProfilPanelBody?.contains(active) && active.id ? `#${CSS.escape(active.id)}` : "");
    const caret = active && "selectionStart" in active ? [active.selectionStart, active.selectionEnd] : null;
    els.dosarProfilTitleRow.innerHTML = headerTop(r);
    const lv = lastVersion(r);
    els.dosarProfilSummary.innerHTML = A().renderPageHeaderMeta([
      ["ID", A().renderProfileCopyCode?.(r.id, `Copiază ${r.id}`) || esc(r.id)],
      ["Categorie", esc(label(CATEGORIES, r.config.category) || "—")],
      ["Sursa de date", esc(sourceName(r.config.source) || "—")],
      ["Nivel", esc(levelText(r.config))],
      ["Statut", tag(r.status, STATUS_TONE[r.status] || "neutral")],
      ["Versiune publicată", lv ? esc(String(lv.version)) : "nepublicat"]
    ]);
    A().watchPageHeaderMeta?.(els.dosarProfilSummary);
    const counts = { versiuni: r.versions.length, acces: r.grants.filter((g) => !g.revokedAt).length, istoric: Math.min(r.history.length, 100) };
    els.dosarProfilTabs.innerHTML = tabsNow().map(([id, text]) => {
      const on = id === P.tab;
      return `<button class="tab-button${on ? " active" : ""}" id="rpt-tab-${id}" type="button" role="tab" aria-controls="rpt-panel" aria-selected="${on}" tabindex="${on ? 0 : -1}" data-rpt-tab="${id}"><span>${text}</span>${counts[id] ? A().renderPageHeaderTabCount?.(counts[id]) || "" : ""}</button>`;
    }).join("");
    const body = els.dosarProfilPanelBody;
    body.id = "rpt-panel";
    body.setAttribute("role", "tabpanel");
    body.setAttribute("aria-labelledby", `rpt-tab-${P.tab}`);
    if (P.tab !== "configurare") fx("profile").ctl.close(false);
    body.innerHTML = `${notices(r)}${P.tab === "versiuni" ? (HOOKS.versionsTab?.(r) || versionsTab(r)) : P.tab === "acces" && HOOKS.accessTab ? HOOKS.accessTab(r) : P.tab === "istoric" ? (HOOKS.historyTab?.(r) || historyTab(r)) : configTab(r)}`;
    A().syncStackMetaRows?.(body);
    if (P.tab === "configurare") mountFilters("profile");
    requestAnimationFrame(syncStick);
    if (keepSel) {
      const el = document.querySelector(keepSel);
      el?.focus?.({ preventScroll: true });
      if (caret && el && "setSelectionRange" in el) { try { el.setSelectionRange(caret[0], caret[1]); } catch { /* not text */ } }
    }
  }
  function notices(r) {
    const me = who();
    const list = [
      P.saveError && U().renderNotice?.("error", esc(SAVE_FAILED), { role: "alert" }),
      r.status === "Dezactivat" && U().renderNotice?.("warning", "<strong>Raport dezactivat.</strong> Nu apare în meniul «Rapoarte» și nu se mai generează. Nimic nu s-a șters: configurația și versiunile se păstrează."),
      r.status === "Ciornă" && P.tab === "configurare" && U().renderInfoNote?.("<strong>Ciornă.</strong> Raportul apare în meniul «Rapoarte» după prima publicare."),
      r.status === "Publicat" && unpublished(r) && U().renderNotice?.("warning", `<strong>Modificări nepublicate.</strong> Utilizatorii generează în continuare versiunea ${esc(String(lastVersion(r).version))}.${HOOKS.pending ? ' <button class="btn btn-text-primary btn-sm e-permits-rpt-pending-link" type="button" data-rpt-pending aria-haspopup="dialog">Vezi modificările</button>' : ""}`),
      !canEdit(r) && P.tab === "configurare" && U().renderInfoNote?.(r.config.level === "Global"
        ? "Raport global, creat de Administratorul central: îl vezi doar pentru citire."
        : `Raport comun pentru ${esc(r.config.authorities.map(authName).join(", "))}: îl modifică doar Administratorul central.`)
    ];
    const html = list.filter(Boolean).join("");
    return html ? `<div class="e-permits-reg-notices">${html}</div>` : "";
  }
  /* the sticky preview sits under the profile's pinned tab row and fit the scroller's height (measured: the BO
     canvas scrolls under the shell top bar; in the create sheet the body scrolls) */
  function syncStick() {
    document.querySelectorAll(".e-permits-rpt-split").forEach((grid) => {
      if (!grid.isConnected || !grid.offsetParent) return;
      const tabs = grid.closest("[data-dosar-profil]")?.querySelector(".e-permits-page-header.is-sticky .e-permits-page-header__tabs");
      const top = tabs ? tabs.offsetHeight : 0;
      let sc = grid.parentElement;
      while (sc && sc !== document.body && !/(auto|scroll)/.test(getComputedStyle(sc).overflowY)) sc = sc.parentElement;
      const h = sc && sc !== document.body ? sc.clientHeight : window.innerHeight;
      grid.style.setProperty("--rpt-stick-top", `${top}px`);
      grid.style.setProperty("--rpt-stick-h", `${Math.max(h - top, 320)}px`);
    });
  }
  window.addEventListener("resize", () => requestAnimationFrame(syncStick));
  function configTab(r) {
    if (!editable(r)) {
      return `
        <div class="e-permits-ntpl-content e-permits-ntpl-content--preview e-permits-wid-config e-permits-rpt-config e-permits-rpt-split e-permits-editor-wide">
          <div class="e-permits-ntpl-content__main">${readBlocks(r.config)}</div>
          <aside class="e-permits-ntpl-content__preview" data-rpt-preview>${previewHtml(r.config, { idp: "rpt-p", ctx: "profile" })}</aside>
        </div>`;
    }
    const v = P.draft;
    const e = P.errors;
    return `
      <div class="e-permits-ntpl-content e-permits-ntpl-content--preview e-permits-wid-config e-permits-rpt-config e-permits-rpt-split e-permits-editor-wide">
        <div class="e-permits-ntpl-content__main e-permits-rpt-form">${stepGeneral(v, e, IDP, { jump: true })}${stepColumns(v, e, IDP, { jump: true })}${stepStructure(v, e, IDP, { jump: true })}</div>
        <aside class="e-permits-ntpl-content__preview" data-rpt-preview>${previewHtml(v, { idp: IDP, ctx: "profile" })}</aside>
      </div>`;
  }
  /* Versiuni / Istoric — part 1 = the plain timelines; part 2 replaces them through HOOKS.versionsTab / historyTab */
  function versionsTab(r) {
    const list = [...r.versions].reverse();
    const cur = lastVersion(r);
    const events = list.map((v) => ({ at: v.at, user: v.by, type: `Versiunea ${v.version}${v.nr === cur.nr ? " · curentă" : ""}`, status: "Reușit", detail: v.note }));
    return window.GEAPEventTimeline?.html("Versiuni publicate", events, { meta: list.length ? plural(list.length, "versiune", "versiuni") : "", empty: "Raportul nu a fost publicat încă." }) || "";
  }
  function historyTab(r) {
    const events = r.history.slice(0, 100).map((h) => ({ at: h.at, user: h.by, role: h.role, type: h.event, status: "Reușit", detail: h.detail || "" }));
    return window.GEAPEventTimeline?.html("Jurnalul de audit", events, { meta: events.length ? "Cele mai noi primele · Jurnalizat prin MLog" : "", empty: "Pentru acest raport nu s-au înregistrat încă operații." }) || "";
  }
  /* the preview follows a typed value without a full redraw (the field keeps its caret) */
  function refreshPreviewOnly() {
    const box = creating() ? sheet.querySelector("[data-rpt-preview]") : document.querySelector("#rpt-panel [data-rpt-preview]");
    const ctx = creating() ? "sheet" : "profile";
    if (box && P.draft) box.innerHTML = previewHtml(creating() || editable() ? P.draft : reportOf(P.id).config, { idp: creating() || editable() ? IDP : "rpt-p", ctx });
    mountFilters(ctx);
    refreshZoom();
    syncColHl();
  }
  const reheader = () => { const els = A().els || {}; if (!creating() && els.dosarProfilTitleRow && P.id) els.dosarProfilTitleRow.innerHTML = headerTop(reportOf(P.id)); };

  /* ================================================================ CREATE SHEET (US-466) — the widget create sheet */
  const STEPS = ["Date generale", "Coloane", "Structură", "Revizuire"];
  let sheet = null;
  let beforeCreate = null;
  const creating = () => Boolean(P.isNew && sheet && !sheet.hidden);
  const inSheet = (el) => creating() && sheet.contains(el);
  function ensureSheet() {
    if (sheet) return sheet;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="e-permits-ntpl-sheet e-permits-reg-editor e-permits-reg-editor--page e-permits-rpt-editor" data-rpt-editor hidden>
        <div class="e-permits-ntpl-sheet__scrim" aria-hidden="true" data-rpt-ed-close></div>
        <div class="e-permits-ntpl-sheet__panel e-permits-reg-editor__panel" role="dialog" aria-modal="true" aria-labelledby="rpt-ed-title" tabindex="-1">
          <button class="modal-close e-permits-reg-editor__close" type="button" aria-label="Închide" data-rpt-ed-close>${icon("cross-large", 16)}</button>
          <header class="e-permits-page-header e-permits-reg-editor__header">
            <div class="e-permits-page-header__body"><div class="e-permits-page-header__top" data-rpt-ed-top></div></div>
          </header>
          <nav class="e-permits-steps-strip" aria-label="Pașii creării" data-rpt-ed-steps></nav>
          <div class="e-permits-reg-editor__body" data-rpt-ed-body></div>
          <div class="e-permits-cfg2__bar e-permits-reg-editor__bar" role="region" aria-label="Pașii raportului" data-rpt-ed-bar></div>
        </div>
      </div>`);
    sheet = document.querySelector("[data-rpt-editor]");
    window.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !creating()) return;
      if (document.querySelector(".modal-overlay.is-active, [data-stack-menu]:not([hidden]), .e-permits-fo-select__list:not([hidden])")) return;
      if (drawer && !drawer.hidden) return;
      if (sheet.querySelector("[aria-expanded='true']")) return;
      event.preventDefault();
      closeCreate();
    });
    return sheet;
  }
  const sheetScroller = () => sheet?.querySelector("[data-rpt-ed-scroll]");
  /* Feature: „inițiază un raport nou sau clonează un raport existent … prin alegerea raportului sursă” — the copy takes
     the columns, formulas and structure of the source; any other user than the central gets it at his authority */
  function cloneConfig(src, me = who()) {
    const v = normal(clone(src.config));
    v.names.ro = `${v.names.ro} (copie)`.slice(0, NAME_MAX);
    if (!me.central) { v.level = "Autoritate"; v.authorities = [me.authority]; }
    return v;
  }
  const cloneSources = () => reports().filter((r) => r.config.columns.length);
  async function openNew({ from = "" } = {}) {
    await load();
    if (!canCreate()) return;
    const src = from ? reportOf(from) : null;
    if (from && (!src || !visible(src))) return;
    beforeCreate = { ...P, back: document.activeElement };
    fxReset("sheet");
    const v = src ? cloneConfig(src) : blankConfig();
    Object.assign(P, { id: null, isNew: true, from: src?.id || "", tab: "configurare", draft: v, base: clone(v), errors: {}, saveError: false, totalTouched: Boolean(src), step: 1, maxStep: src ? STEPS.length : 1 });
    const el = ensureSheet();
    renderCreate();
    el.hidden = false;
    document.documentElement.classList.add("is-reg-editor-open");
    requestAnimationFrame(() => el.querySelector(src ? `#${IDP}-name-ro` : `#${IDP}-category input`)?.focus({ preventScroll: true }));
  }
  function renderCreate({ keep = "" } = {}) {
    if (!P.isNew || !sheet || !P.draft) return;
    const active = document.activeElement;
    const keepSel = keep || (active && sheet.contains(active) && active.id ? `#${CSS.escape(active.id)}` : "");
    const caret = active && "selectionStart" in active ? [active.selectionStart, active.selectionEnd] : null;
    const scroll = sheetScroller()?.scrollTop || 0;
    const v = P.draft;
    const e = P.errors;
    sheet.querySelector("[data-rpt-ed-top]").innerHTML = window.GEAPPageHeader?.top({
      title: P.from ? "Clonează raportul" : "Raport nou",
      titleId: "rpt-ed-title",
      caption: P.from ? `Copie a ${P.from} · Nivel ${levelText(v)} · primește un ID nou la salvare` : `Nivel ${levelText(v)} · ID-ul se generează la prima salvare`
    }) || `<h1 class="e-permits-page-header__title" id="rpt-ed-title">${P.from ? "Clonează raportul" : "Raport nou"}</h1>`;
    sheet.querySelector("[data-rpt-ed-steps]").innerHTML = A().renderStepStrip?.(STEPS, P, "data-rpt-goto") || "";
    const form = [() => stepGeneral(v, e, IDP), () => stepColumns(v, e, IDP), () => stepStructure(v, e, IDP), () => stepReview(v)][P.step - 1]();
    sheet.querySelector("[data-rpt-ed-body]").innerHTML = `
      <div class="e-permits-reg-editor__single e-permits-reg-editor__page" data-rpt-ed-scroll>
        ${P.saveError ? `<div class="e-permits-reg-notices">${U().renderNotice?.("error", esc(SAVE_FAILED), { role: "alert" }) || ""}</div>` : ""}
        <div class="e-permits-ntpl-content e-permits-ntpl-content--preview e-permits-wid-create e-permits-rpt-create e-permits-rpt-split">
          <div class="e-permits-ntpl-content__main e-permits-rpt-form">${form}</div>
          <aside class="e-permits-ntpl-content__preview" data-rpt-preview>${previewHtml(v, { idp: IDP, ctx: "sheet" })}</aside>
        </div>
      </div>`;
    mountFilters("sheet");
    const last = P.step === STEPS.length;
    const pub = last && HOOKS.publish ? '<button class="btn btn-primary btn-md" type="button" data-rpt-publish>Publică</button>' : "";
    sheet.querySelector("[data-rpt-ed-bar]").innerHTML = `
      <p class="e-permits-cfg2__bar-text" aria-live="polite">${esc(`Pasul ${P.step} din ${STEPS.length} · ${STEPS[P.step - 1]}`)}</p>
      <div class="e-permits-cfg2__bar-actions">
        ${P.step === 1 ? '<button class="btn btn-neutral btn-md" type="button" data-rpt-ed-close>Anulează</button>' : '<button class="btn btn-neutral btn-md" type="button" data-rpt-prev>Înapoi</button>'}
        <button class="btn ${last && !pub ? "btn-primary" : "btn-neutral"} btn-md" type="button" data-rpt-save>Salvează ciorna</button>
        ${last ? pub : '<button class="btn btn-primary btn-md" type="button" data-rpt-next>Continuă</button>'}
      </div>`;
    A().syncStackMetaRows?.(sheet);
    requestAnimationFrame(syncStick);
    if (sheetScroller() && keep !== "@top") sheetScroller().scrollTop = scroll;
    if (keepSel && keepSel !== "@top") {
      const el = sheet.querySelector(keepSel);
      el?.focus?.({ preventScroll: true });
      if (caret && el && "setSelectionRange" in el) { try { el.setSelectionRange(caret[0], caret[1]); } catch { /* not text */ } }
    }
  }
  function goStep(target) {
    if (target < 1 || target > STEPS.length) return;
    for (let s = P.step; s < target && s <= 3; s += 1) {
      const errors = validate(P.draft, { steps: [s] });
      if (Object.keys(errors).length) { P.errors = errors; showFirstError(errors); return; }
    }
    P.errors = {};
    P.step = target;
    P.maxStep = Math.max(P.maxStep, target);
    renderCreate({ keep: "@top" });
    if (sheetScroller()) sheetScroller().scrollTop = 0;
    sheet.querySelector("[data-rpt-next], [data-rpt-publish], [data-rpt-save]")?.focus({ preventScroll: true });
  }
  function hideSheet() {
    if (!sheet || sheet.hidden) return;
    sheet.hidden = true;
    document.documentElement.classList.remove("is-reg-editor-open");
  }
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
    U().askConfirm?.({ title: P.from ? "Renunți la copia raportului?" : "Renunți la raportul nou?", text: "Datele completate nu se păstrează.", confirmLabel: "Renunță", cancelLabel: "Continuă editarea", destructive: true }, close);
  }
  const rerender = (opts) => { if (creating()) renderCreate(opts); else renderProfile(opts); syncColHl(); };

  /* ---------------------------------------------------------------- save (Salvează ciorna / Salvează) */
  const errorSel = (key) => {
    if (/^col\./.test(key)) return `[data-rpt-col="${CSS.escape(key.slice(4))}"]`;
    const m = /^filter\.(\d+)$/.exec(key);
    if (m) return `#${IDP}-filter-field-${m[1]}`;
    return `#${IDP}-${({ "names.ro": "name-ro", source: "source", category: "category", authorities: "authorities", columns: "columns", groupBy: "groupby" })[key] || key}`;
  };
  function showFirstError(errors) {
    const key = Object.keys(errors)[0];
    const keep = key === "category" ? `#${IDP}-category input` : key === "authorities" ? `#${IDP}-authorities input` : errorSel(key);
    if (creating()) { P.step = STEP_OF(key); P.maxStep = Math.max(P.maxStep, P.step); renderCreate({ keep }); }
    else renderProfile({ keep });
    (creating() ? sheet : document).querySelector(errorSel(key))?.closest(".e-permits-fo-field, .e-permits-doc-cond, .e-permits-wid-types, .e-permits-stack__item, .e-permits-dosar-profil__section")?.scrollIntoView({ block: "center" });
  }
  function savePage({ silent = false } = {}) {
    const errors = validate(P.draft, { steps: [1] });
    if (Object.keys(errors).length) { P.errors = errors; showFirstError(errors); return null; }
    if (demo.has("eroare")) { P.saveError = true; rerender(); return null; }
    let r = P.isNew ? null : reportOf(P.id);
    if (r) {
      const changed = changedLabels();
      r.config = clone(P.draft);
      if (changed.length) audit(r, "edit", changed.map(([l, a, b]) => `${l}: ${String(a).replace(/<[^>]+>/g, "") || "—"} → ${String(b).replace(/<[^>]+>/g, "") || "—"}`).join(" · "));
    } else {
      const nums = all().map((x) => Number(x.id.split("-")[1]) || 0);
      const id = `RPT-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, "0")}`;
      r = { id, status: "Ciornă", createdAt: nowIso(), createdBy: userName(), updatedAt: nowIso(), updatedBy: userName(), config: clone(P.draft), versions: [], history: [], grants: [] };
      all().push(r);
      if (P.from) audit(r, "clone", `Din ${P.from} · ${levelText(r.config)}`);
      else audit(r, "create", `Ciornă · ${levelText(r.config)} · ${sourceName(r.config.source)}`);
    }
    const wasNew = P.isNew;
    const wasClone = P.from;
    Object.assign(P, { id: r.id, isNew: false, from: "", errors: {}, saveError: false, base: clone(P.draft) });
    if (wasNew) { hideSheet(); beforeCreate = null; openProfile(r.id, "configurare"); }
    else { renderProfile({ keep: "[data-rpt-save]" }); A().writeHash?.(`#raport/${r.id}/configurare`, { push: false }); }
    if (!silent) toast(wasNew ? (wasClone ? `Copia raportului ${wasClone} a fost salvată ca ${r.id}, în statutul Ciornă.` : `Ciorna raportului ${r.id} a fost salvată.`) : "Modificările au fost salvate.");
    refreshList();
    return r;
  }
  function discard() {
    const r = reportOf(P.id);
    if (!r) return;
    P.draft = clone(r.config); P.base = clone(r.config); P.errors = {}; P.saveError = false;
    renderProfile();
  }
  let changeSourceDone = false;
  const registerChangeSource = () => {
    if (changeSourceDone || !A().registerChangeSource) return;
    changeSourceDone = true;
    A().registerChangeSource("rpt-draft", () => {
      if (!P.draft || P.isNew) return null;
      return {
        name: P.draft.names.ro, applies: "se aplică după Salvează", emptyText: "Raportul este salvat.", groups: ["Configurare"],
        entries: () => changedLabels().map(([l, a, b]) => ({ undo: l, group: "Configurare", title: l, tag: ["Modificat", "brand"], detail: `${String(a).replace(/<[^>]+>/g, "") || "—"} → ${String(b).replace(/<[^>]+>/g, "") || "—"}` })),
        undo: () => discard(),
        discard,
        save: () => savePage()
      };
    });
  };
  let leaving = false;
  function guardLeave(event, proceed) {
    if (leaving || !profileOpen() || !pageDirty()) return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    U().askConfirm?.({ title: "Există modificări nesalvate. Părăsești raportul?", text: "Modificările nesalvate ale raportului se pierd.", confirmLabel: "Renunță", cancelLabel: "Continuă editarea", destructive: true }, () => { P.draft = null; leaving = true; try { proceed(); } finally { leaving = false; } });
    return true;
  }
  document.addEventListener("click", (event) => {
    const nav = event.target.closest?.("[data-nav-item]");
    if (nav) { guardLeave(event, () => nav.click()); return; }
    const back = event.target.closest?.("[data-rpt-back]");
    if (back) guardLeave(event, () => closeProfile());
  }, true);
  window.addEventListener("beforeunload", (event) => { if ((profileOpen() || creating()) && pageDirty()) { event.preventDefault(); event.returnValue = ""; } });

  /* ================================================================ the side panels = the ONE drawer
     · „Din sursa de date” = the source's data dictionary (the KPI dictionary groups), each field „Adaugă”;
     · a column = its settings (Feature model «Coloana raportului») with the formula picker */
  let drawer = null;
  let DR = null;
  function ensureDrawer() {
    if (drawer) return drawer;
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="drawer-overlay" data-rpt-drawer hidden>
        <button class="drawer-overlay__scrim" type="button" aria-label="Închide" data-rpt-drawer-close></button>
        <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="rpt-drawer-title" tabindex="-1">
          <header class="drawer__header">
            <div class="drawer__heading">
              <h2 class="drawer__title" id="rpt-drawer-title" data-rpt-drawer-title></h2>
              <p class="drawer__subtitle" data-rpt-drawer-subtitle></p>
            </div>
            <button class="modal-close" type="button" aria-label="Închide" data-rpt-drawer-close>${icon("cross-large", 16)}</button>
          </header>
          <div class="drawer__body" data-rpt-drawer-body></div>
          <footer class="drawer__footer" data-rpt-drawer-footer></footer>
        </aside>
      </div>`;
    drawer = wrap.firstElementChild;
    document.body.appendChild(drawer);
    drawer.addEventListener("click", onDrawerClick);
    drawer.addEventListener("input", onDrawerInput);
    drawer.addEventListener("change", onDrawerChange);
    drawer.addEventListener("keydown", (event) => { if (event.key === "Escape" && !document.querySelector(".modal-overlay.is-active") && !drawer.querySelector("[aria-expanded='true']")) { event.preventDefault(); event.stopPropagation(); closeDrawer(); } });
    return drawer;
  }
  function openDrawer(state) {
    DR = { back: document.activeElement, errors: {}, query: "", closed: new Set(), ...state };
    const d = ensureDrawer();
    renderDrawer();
    requestAnimationFrame(() => syncColHl({ scroll: true }));
    if (window.GEAPDrawer?.open) window.GEAPDrawer.open(d, { focus: d.querySelector("[data-rpt-autofocus]") || d.querySelector(".drawer") });
    else { d.hidden = false; document.body.classList.add("is-drawer-open"); requestAnimationFrame(() => (d.querySelector("[data-rpt-autofocus]") || d.querySelector(".drawer"))?.focus()); }
  }
  function closeDrawer() {
    if (!drawer || drawer.hidden) return;
    const back = DR?.back;
    DR = null;
    requestAnimationFrame(() => syncColHl());
    if (window.GEAPDrawer?.close) window.GEAPDrawer.close(drawer);
    else { drawer.hidden = true; document.body.classList.remove("is-drawer-open"); }
    if (back?.isConnected) back.focus({ preventScroll: true });
  }
  function renderDrawer(focusSel = "") {
    if (!DR) return;
    const d = ensureDrawer();
    const active = document.activeElement;
    const keep = focusSel || (active && d.contains(active) && active.id ? `#${CSS.escape(active.id)}` : "");
    const caret = active && "selectionStart" in active ? [active.selectionStart, active.selectionEnd] : null;
    const top = d.querySelector(".drawer__body")?.scrollTop || 0;
    const v = P.draft;
    const view = DR.mode === "dict" ? dictView(v) : colView(v);
    d.querySelector("[data-rpt-drawer-title]").textContent = view.title;
    const sub = d.querySelector("[data-rpt-drawer-subtitle]");
    sub.textContent = view.subtitle; sub.hidden = !view.subtitle;
    d.querySelector("[data-rpt-drawer-body]").innerHTML = view.body;
    d.querySelector("[data-rpt-drawer-footer]").innerHTML = view.footer;
    A().syncStackMetaRows?.(d);
    d.querySelector(".drawer__body").scrollTop = top;
    if (keep) {
      const el = d.querySelector(keep);
      el?.focus?.({ preventScroll: true });
      if (caret && el && "setSelectionRange" in el) { try { el.setSelectionRange(caret[0], caret[1]); } catch { /* not text */ } }
    }
  }
  /* ---- the data dictionary of the source (Feature: „consultă dicționarul de date al sursei”, as in Registre) */
  function dictView(v) {
    const src = sourceOf(v.source);
    const q = fold(DR.query).trim();
    const fields = fieldsOf(v.source);
    const used = new Map();
    v.columns.filter((c) => c.kind === "source").forEach((c) => used.set(c.field, (used.get(c.field) || 0) + 1));
    const match = fields.filter((f) => !q || fold(`${f.label} ${f.desc}`).includes(q));
    const groups = [...new Set(match.map((f) => f.group))].map((g) => [g, match.filter((f) => f.group === g)]);
    const list = groups.length ? `<div class="e-permits-stack e-permits-reg-editor__stack">${groups.map(([group, items]) => {
      const open = Boolean(q) || !DR.closed.has(group);
      return `
        <div class="e-permits-stack__group${open ? " is-open" : " is-collapsed"}">
          <h3 class="e-permits-stack__group-label e-permits-stack__group-label--toggle">
            <button class="e-permits-stack__group-toggle" type="button" data-rpt-dict-group="${esc(group)}" aria-expanded="${open ? "true" : "false"}"${q ? " disabled" : ""}>
              <span class="e-permits-stack__group-name">${esc(group)}</span>
              <span class="badge badge--lg badge--solid-light e-permits-stack__group-count" aria-label="${plural(items.length, "câmp", "câmpuri")}">${items.length}</span>
              ${icon("chevron-bottom", 16).replace('class="icon small"', 'class="icon small e-permits-stack__group-chevron"')}
            </button>
          </h3>
          ${open ? `<ul class="e-permits-stack__list" role="list">${items.map((f) => A().renderStackItem?.({
            plainTitle: f.label,
            title: esc(f.label),
            badges: [tag(FIELD_TYPE_LABEL[f.type] || f.type, "neutral"), used.get(f.key) ? tag(used.get(f.key) > 1 ? `În raport · ${used.get(f.key)}` : "În raport", "brand") : ""].filter(Boolean),
            meta: [esc(f.desc)],
            actionsHtml: `<button class="btn btn-secondary btn-sm" type="button" data-rpt-dict-add="${esc(f.key)}" aria-label="Adaugă coloana ${esc(f.label)}">${icon("plus-large", 16)}<span>Adaugă</span></button>`
          }) || "").join("")}</ul>` : ""}
        </div>`;
    }).join("")}</div>` : E()?.noResults?.("Niciun câmp nu corespunde căutării", { text: "Caută după denumirea sau descrierea câmpului.", compact: true }) || "";
    return {
      title: "Adaugă coloane din sursa de date",
      subtitle: src ? `Dicționarul de date · ${src.name} · ${src.version} · ${plural(fields.length, "câmp", "câmpuri")}` : "",
      body: `
        <div class="e-permits-rpt-dict">
          <div class="search-input medium rectangular e-permits-workplace__search e-permits-list-search e-permits-list-search--fill${DR.query ? " has-value is-ready" : ""}">
            <span class="icon-search" aria-hidden="true">${icon("search")}</span>
            <input class="input" type="search" id="rpt-dict-search" placeholder="Caută în dicționar" aria-label="Caută în dicționarul de date" autocomplete="off" value="${esc(DR.query)}" data-rpt-dict-search data-rpt-autofocus>
            <div class="btn-group"><button type="button" class="btn-icon clear" aria-label="Șterge căutarea" data-rpt-dict-clear>${icon("cross-small", 16)}</button></div>
          </div>
          ${list}
        </div>`,
      footer: `<div class="modal-buttons"><span class="e-permits-rpt-count" aria-live="polite">${esc(plural(v.columns.length, "coloană", "coloane"))} în raport</span><button class="btn btn-primary btn-rounded" type="button" data-rpt-drawer-close>Gata</button></div>`
    };
  }
  /* ---- the column panel (Feature model «Coloana raportului») */
  function formulaPicker(v, c, e) {
    const f = formulaOf(c.formula);
    const options = formulas().filter((x) => formulaFits(x, v.source)).map((x) => [x.id, x.names.ro]);
    const others = v.columns.filter((x) => x.id !== c.id);
    const opRows = f ? f.operands.map((o) => {
      const fit = others.filter((x) => o.types.includes(x.dataType));
      return selectField(`rpt-c-op-${o.key}`, `data-rpt-col-op="${o.key}"`, `${o.key} · ${o.label}`, fit.map((x) => [x.id, colName(x)]), c.operands?.[o.key] || "", { required: true, placeholder: fit.length ? "Alege coloana" : "Nicio coloană potrivită", hint: fit.length ? `Coloană ${o.types.map((t) => label(DATA_TYPES, t)).join(" sau ")} a raportului.` : `Adaugă întâi în raport o coloană ${o.types.map((t) => label(DATA_TYPES, t)).join(" sau ")}.`, error: e[`op.${o.key}`], disabled: !fit.length });
    }).join("") : "";
    return `
      ${selectField("rpt-c-formula", 'data-rpt-col-field="formula"', "Formula de calcul", options, c.formula, { required: true, span: 12, placeholder: "Alege formula", error: e.formula, hint: "Din setul de formule. Formula folosește doar câmpurile sursei de date și coloanele raportului." })}
      ${f ? full(`
        <div class="e-permits-rpt-formula" aria-label="Formula aleasă">
          <div class="e-permits-rpt-formula__row"><span class="e-permits-rpt-formula__label">Expresia</span><strong class="e-permits-rpt-formula__expr">${esc(f.expr)}</strong></div>
          <div class="e-permits-rpt-formula__row"><span class="e-permits-rpt-formula__label">Rezultat</span><span>${esc(RESULT_TEXT[f.format] || label(FORMATS, f.format))}</span></div>
          ${f.operands.length ? "" : '<p class="e-permits-rpt-formula__note">Se calculează pe înregistrările sursei din fiecare rând; nu are nevoie de alte coloane.</p>'}
        </div>`) : ""}
      ${f && f.operands.length ? full(`<p class="e-permits-cfg-ro__label">Coloanele formulei</p>`) + opRows : ""}
      ${canAddFormula() ? full(`<div class="e-permits-rpt-add"><button class="btn btn-text-primary btn-sm" type="button" data-rpt-formula-new aria-haspopup="dialog">${icon("plus-large", 16)}<span>Formulă nouă</span></button></div>`) : ""}`;
  }
  function colView(v) {
    const c = DR.col;
    const e = DR.errors;
    const isNew = !DR.colId;
    const pos = isNew ? v.columns.length + 1 : v.columns.findIndex((x) => x.id === DR.colId) + 1;
    const fields = fieldsOf(v.source);
    const headers = [...new Set(v.columns.map((x) => String(x.header || "").trim()).filter(Boolean))];
    const measure = isMeasure(c);
    const typeBody = c.kind === "source"
      ? grid(selectField("rpt-c-field", 'data-rpt-col-field="field"', "Câmpul sursei de date", fields.map((f) => [f.key, `${f.label} · ${FIELD_TYPE_LABEL[f.type] || f.type}`]), c.field, { required: true, span: 12, placeholder: "Alege câmpul", error: e.field, hint: fieldOf(v.source, c.field)?.desc || "Din dicționarul de date al sursei." }))
      : c.kind === "calc" ? grid(formulaPicker(v, c, e))
      : U().renderInfoNote?.(`<strong>Completată manual.</strong> ${esc(MANUAL_HINT)} În previzualizare celulele ei au „—” și antetul are eticheta «Manual».`) || "";
    const body = `
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">Denumire</h3>
        <div class="e-permits-user-create__section-content">${grid(
          textField("rpt-c-name-ro", 'data-rpt-col-field="names.ro" data-rpt-autofocus', "Denumire (RO)", c.names.ro, { required: true, max: 60, counter: true, hint: "Eticheta coloanei în raport, de exemplu „Număr dosare”.", error: e["names.ro"] }),
          textField("rpt-c-name-ru", 'data-rpt-col-field="names.ru"', "Denumire (RU)", c.names.ru, { span: 6 }),
          textField("rpt-c-name-en", 'data-rpt-col-field="names.en"', "Denumire (EN)", c.names.en, { span: 6 })
        )}</div>
      </section>
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">Tipul coloanei</h3>
        <div class="e-permits-user-create__section-content">
          ${optionCards("rpt-c-kind", "rpt-c-kind", "data-rpt-col-kind", KINDS, c.kind, { legend: "Tipul coloanei", cls: "e-permits-rpt-kinds" })}
          ${typeBody}
        </div>
      </section>
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">Afișare și total</h3>
        <div class="e-permits-user-create__section-content">${grid(
          selectField("rpt-c-type", 'data-rpt-col-field="dataType"', "Tipul datelor", DATA_TYPES, c.dataType, { required: true, error: e.dataType, hint: c.kind === "calc" && formulaOf(c.formula) ? "Urmează formatul rezultatului formulei." : c.kind === "source" && c.dataType === "numeric" && ["text", "enum", "date"].includes(fieldOf(v.source, c.field)?.type) ? "Numeric pe un câmp text sau dată = numărul înregistrărilor cu valoare." : "" }),
          textField("rpt-c-header", 'data-rpt-col-field="header" list="rpt-c-headers"', "Antetul comun", c.header, { span: 6, hint: "Opțional. Antetul de nivelul întâi deasupra coloanelor vecine cu același antet.", placeholder: headers[0] ? `De exemplu „${headers[0]}”` : "De exemplu „Dosare”" }),
          `<datalist id="rpt-c-headers">${headers.map((h) => `<option value="${esc(h)}"></option>`).join("")}</datalist>`,
          measure ? full(labelled("rpt-c-total-label", "Includerea în total", `
            <div class="radio-group e-permits-wid-vis" role="radiogroup" aria-labelledby="rpt-c-total-label" id="rpt-c-total">
              ${TOTALS.map(([k, t, d]) => `<label class="radio radio--small"><input class="radio-input" type="radio" name="rpt-c-total" value="${k}"${c.total === k ? " checked" : ""}${e.total ? ' aria-invalid="true"' : ""} data-rpt-col-total><span class="radio-custom" aria-hidden="true"></span><span class="radio-texts"><span class="radio-label">${esc(t)}</span><span class="radio-description">${esc(d)}</span></span></label>`).join("")}
            </div>
            ${e.total ? errorHtml("rpt-c-total", e.total) : ""}`, { required: true })) : ""
        )}</div>
      </section>`;
    return {
      title: isNew ? `Coloană nouă · ${label(KINDS, c.kind)}` : colName(c),
      subtitle: `Poziția ${pos} · ${label(KINDS, c.kind)}${sourceName(v.source) ? ` · ${sourceName(v.source)}` : ""}`,
      body,
      footer: `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-rpt-drawer-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-rpt-col-save>${isNew ? "Adaugă coloana" : "Salvează coloana"}</button></div>`
    };
  }
  const nextColId = (v) => `c${Math.max(0, ...v.columns.map((c) => Number(String(c.id).slice(1)) || 0)) + 1}`;
  const blankColumn = (v, kind) => ({ id: nextColId(v), names: { ro: "", ru: "", en: "" }, kind, field: "", formula: "", operands: {}, dataType: kind === "calc" ? "numeric" : kind === "manual" ? "numeric" : "text", header: "", total: "sum" });
  const fromField = (v, f) => ({ ...blankColumn(v, "source"), names: { ro: f.label, ru: "", en: "" }, field: f.key, dataType: TYPE_OF_FIELD[f.type] || "text" });
  function openColumn(id) {
    const v = P.draft;
    const c = colOf(v, id);
    if (!c) return;
    const ce = P.errors[`col.${id}`] || {};
    openDrawer({ mode: "col", colId: id, col: clone(c), errors: { ...ce } });
  }
  function addKind(kind) {
    if (kind === "source") { if (!P.draft.source) return; openDrawer({ mode: "dict" }); return; }
    openDrawer({ mode: "col", colId: null, col: blankColumn(P.draft, kind) });
  }
  function afterColumnsChange(keep = "") {
    /* the total row follows the Feature default („Da” when there are numeric / valoric columns) until the author says no */
    if (!P.draft.columns.some(isMeasure)) P.draft.totalRow = false;
    else if (!P.totalTouched) P.draft.totalRow = true;
    if (P.draft.groupBy && !groupable(colOf(P.draft, P.draft.groupBy))) P.draft.groupBy = "";
    Object.keys(P.errors).filter((k) => /^col\.|^columns$/.test(k)).forEach((k) => { const id = k.slice(4); const c = colOf(P.draft, id); if (k === "columns" ? P.draft.columns.length : !c || !Object.keys(columnErrors(P.draft, c)).length) delete P.errors[k]; else P.errors[k] = columnErrors(P.draft, c); });
    rerender({ keep });
    reheader();
  }
  function saveColumn() {
    const v = P.draft;
    const c = DR.col;
    c.names.ro = String(c.names.ro || "").trim();
    const probe = { ...v, columns: DR.colId ? v.columns.map((x) => (x.id === DR.colId ? c : x)) : [...v.columns, c] };
    const errors = columnErrors(probe, c);
    if (Object.keys(errors).length) {
      DR.errors = errors;
      renderDrawer();
      const first = { "names.ro": "#rpt-c-name-ro", field: "#rpt-c-field", formula: "#rpt-c-formula", dataType: "#rpt-c-type", total: "#rpt-c-total input" }[Object.keys(errors)[0]] || `#rpt-c-op-${Object.keys(errors)[0].slice(3)}`;
      drawer.querySelector(first)?.focus();
      drawer.querySelector(first)?.closest(".e-permits-fo-field, .e-permits-wid-vis-field")?.scrollIntoView({ block: "center" });
      return;
    }
    if (DR.colId) v.columns = probe.columns; else v.columns.push(c);
    const id = c.id;
    closeDrawer();
    afterColumnsChange(`[data-rpt-col="${CSS.escape(id)}"]`);
  }
  function onDrawerInput(event) {
    const el = event.target;
    if (!DR) return;
    if (el.matches("[data-rpt-dict-search]")) { DR.query = el.value; renderDrawer("#rpt-dict-search"); return; }
    const key = el.dataset.rptColField;
    if (!key || el.tagName === "SELECT") return;
    setPath(DR.col, key, el.value);
    const count = drawer.querySelector(`[data-rpt-count="${el.id}"]`);
    if (count) { count.textContent = `${el.value.length}/60`; count.classList.toggle("is-over", el.value.length > 60); }
    if (key === "names.ro") { delete DR.errors["names.ro"]; if (DR.colId) drawer.querySelector("[data-rpt-drawer-title]").textContent = el.value || "Coloană fără denumire"; }
  }
  function onDrawerChange(event) {
    const el = event.target;
    if (!DR || DR.mode !== "col") return;
    const c = DR.col;
    const fid = el.closest(".e-permits-fo-field")?.querySelector("button[id], input[id]")?.id || "";
    if (el.matches("[data-rpt-col-kind]")) {
      c.kind = el.value;
      DR.errors = {};
      if (c.kind === "calc") { const f = formulaOf(c.formula); c.dataType = f ? FORMAT_TYPE[f.format] : "numeric"; }
      if (c.kind === "manual" && c.dataType === "temporal") c.dataType = "numeric";
      if (c.kind === "source" && c.field) c.dataType = TYPE_OF_FIELD[fieldOf(P.draft.source, c.field)?.type] || c.dataType;
      renderDrawer(`#rpt-c-kind input[value="${el.value}"]`);
      return;
    }
    if (el.matches("[data-rpt-col-total]")) { c.total = el.value; delete DR.errors.total; renderDrawer(`#rpt-c-total input[value="${el.value}"]`); return; }
    if (el.matches("[data-rpt-col-op]")) { c.operands = { ...c.operands, [el.dataset.rptColOp]: el.value }; delete DR.errors[`op.${el.dataset.rptColOp}`]; renderDrawer(fid ? `#${CSS.escape(fid)}` : ""); return; }
    const key = el.dataset.rptColField;
    if (!key || el.tagName !== "SELECT") return;
    setPath(c, key, el.value);
    delete DR.errors[key];
    if (key === "field") {
      const f = fieldOf(P.draft.source, el.value);
      if (f) { c.dataType = TYPE_OF_FIELD[f.type] || c.dataType; if (!c.names.ro) c.names.ro = f.label; delete DR.errors["names.ro"]; }
    }
    if (key === "formula") {
      const f = formulaOf(el.value);
      if (f) { c.dataType = FORMAT_TYPE[f.format] || "numeric"; c.operands = Object.fromEntries(f.operands.map((o) => [o.key, c.operands?.[o.key] || ""])); if (!c.names.ro) c.names.ro = f.names.ro; delete DR.errors["names.ro"]; }
      Object.keys(DR.errors).filter((k) => k.startsWith("op.")).forEach((k) => delete DR.errors[k]);
    }
    if (key === "dataType" && !isMeasure(c)) { c.total = "sum"; delete DR.errors.total; }
    renderDrawer(fid ? `#${CSS.escape(fid)}` : "");
  }
  function onDrawerClick(event) {
    const t = event.target;
    if (t.closest("[data-rpt-drawer-close]")) { closeDrawer(); return; }
    if (!DR) return;
    if (t.closest("[data-rpt-dict-clear]")) { DR.query = ""; renderDrawer("#rpt-dict-search"); return; }
    const grp = t.closest("[data-rpt-dict-group]");
    if (grp) { const g = grp.dataset.rptDictGroup; if (DR.closed.has(g)) DR.closed.delete(g); else DR.closed.add(g); renderDrawer(`[data-rpt-dict-group="${CSS.escape(g)}"]`); return; }
    const addF = t.closest("[data-rpt-dict-add]");
    if (addF) {
      const f = fieldOf(P.draft.source, addF.dataset.rptDictAdd);
      if (!f) return;
      P.draft.columns.push(fromField(P.draft, f));
      renderDrawer(`[data-rpt-dict-add="${CSS.escape(f.key)}"]`);
      afterColumnsChange();
      return;
    }
    if (t.closest("[data-rpt-col-save]")) { saveColumn(); return; }
    if (t.closest("[data-rpt-formula-new]")) { openFormulaDialog(); }
  }

  /* ---- „Formulă nouă” (Proposal for PO — see canAddFormula): name + expression on A, B, C… + result format */
  const fxModal = () => document.querySelector("#case-action-modal");
  function openFormulaDialog() {
    if (!canAddFormula()) return;
    const body = `
      <div class="e-permits-user-create__grid">
        ${textField("rpt-fx-name", 'data-rpt-fx="name"', "Denumire (RO)", "", { required: true, max: NAME_MAX, hint: "De exemplu „Ponderea dosarelor respinse”." })}
        ${textField("rpt-fx-expr", 'data-rpt-fx="expr"', "Expresia", "", { required: true, hint: "Folosește A, B, C pentru coloanele formulei și + − × / ( ), de exemplu (A / B) × 100." })}
        ${selectField("rpt-fx-format", 'data-rpt-fx="format"', "Formatul rezultatului", FORMATS, "int", { required: true, span: 12 })}
      </div>`;
    G().openModal?.({
      kind: "rpt-formula",
      title: "Formulă nouă",
      subtitle: "Setul de formule al rapoartelor",
      body,
      footer: '<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-rpt-fx-confirm>Adaugă formula</button></div>'
    });
    /* above the column drawer (the confirm overlay layer, as Registre raiseModal) */
    fxModal()?.classList.add("e-permits-confirm-overlay");
    requestAnimationFrame(() => document.querySelector("#rpt-fx-name")?.focus());
  }
  function setFieldError(input, message) {
    const field = input?.closest(".e-permits-fo-field");
    if (!field) return;
    field.querySelector(".e-permits-fo-field__error")?.remove();
    field.querySelector(".e-permits-fo-input")?.classList.toggle("is-error", Boolean(message));
    input.toggleAttribute("aria-invalid", Boolean(message));
    if (message) { field.insertAdjacentHTML("beforeend", errorHtml(input.id, message)); input.setAttribute("aria-describedby", `${input.id}-error`); }
  }
  function confirmFormula() {
    const name = document.querySelector("#rpt-fx-name");
    const expr = document.querySelector("#rpt-fx-expr");
    const fmt = document.querySelector('#case-action-modal select[data-rpt-fx="format"]');
    const n = name.value.trim();
    const x = expr.value.trim();
    const keys = [...new Set((x.match(/\b[A-Z]\b/g) || []))].sort();
    let bad = false;
    if (!n) { setFieldError(name, "Introdu denumirea formulei."); bad = true; } else setFieldError(name, "");
    const probe = Object.fromEntries(keys.map((k, i) => [k, i + 2]));
    if (!x) { setFieldError(expr, "Introdu expresia."); bad = true; }
    else if (/[^A-Z0-9\s+\-−×*/÷().,]/.test(x) || evalExpr(x, probe) == null) { setFieldError(expr, "Expresia nu se poate calcula: folosește A, B, C, cifre și + − × / ( )."); bad = true; }
    else setFieldError(expr, "");
    if (bad) { (n ? expr : name).focus(); return; }
    const id = `f-new-${formulas().length + 1}`;
    formulas().push({ id, names: { ro: n, ru: "", en: "" }, expr: x, operands: keys.map((k) => ({ key: k, label: `Coloana ${k}`, types: ["numeric", "value"] })), format: fmt?.value || "int", custom: true });
    G().closeModal?.();
    fxModal()?.classList.remove("e-permits-confirm-overlay");
    if (DR?.mode === "col") { DR.col.formula = id; DR.col.dataType = FORMAT_TYPE[fmt?.value || "int"]; DR.col.operands = Object.fromEntries(keys.map((k) => [k, ""])); delete DR.errors.formula; renderDrawer("#rpt-c-formula"); }
    toast(`Formula „${n}” a fost adăugată în setul de formule.`);
  }

  /* ---- „Mărește” (rpt-zoom-v2, user): near full-screen (viewport − 2 × 24), header (title + ×) → the SAME facet filter bar as
     the inline preview (its own library instance on the shared state: applied in one = shown in the other) → the table
     filling the rest with its own scroll; phones = the full-screen sheet with the icon-only Filtre + sheet */
  const zoomOpen = () => Boolean(fxModal()?.classList.contains("is-active") && fxModal().querySelector(".e-permits-reg-modal--rpt-zoom"));
  const zoomCard = () => { const v = fxConfig("zoom"); return v ? cardHtml(v, { filters: "live", sel: fx("zoom").state.applied }) : ""; };
  function refreshZoom() {
    if (!zoomOpen()) return;
    fxModal().querySelector("[data-case-modal-body]").innerHTML = zoomCard();
    mountFilters("zoom");
  }
  function openZoom() {
    const v = editable() ? P.draft : reportOf(P.id)?.config;
    if (!v || !v.columns.length) return;
    zoomBase = creating() ? "sheet" : "profile";
    G().openModal?.({ kind: "rpt-zoom", title: v.names.ro || "Previzualizare", subtitle: "Previzualizare · date demonstrative", body: zoomCard(), footer: "" });
    fxModal()?.classList.remove("e-permits-confirm-overlay");
    document.querySelector("#case-action-modal .modal")?.classList.remove("modal--md", "modal--lg");
    mountFilters("zoom");
  }

  /* ================================================================ preview filters (rpt-filters-v1)
     ONE library facet filter per context (the profile, the create sheet): `GEAPFacetFilter.create` on a host element that
     outlives the preview's re-renders — after each render the host moves into the card's `[data-rpt-fslot]`. Desktop: the
     bar is always open (no trigger): the first 4 filters are chips, the rest under „Mai multe” (the module's inlineMax);
     „Interval de date” = the date range facet, „Alegere multiplă” = the checklist, „Alegere unică” = the radio list
     (`single`), „Text” = the checklist with its search. Confirmă → draft → „Aplică filtrele” recomputes the rows, the
     subtotals and the total. Phones: the icon-only „Filtre” square + the bottom sheet (the module's phone mode). */
  const FX = {};
  let zoomBase = "";
  const fxConfig = (ctx) => (ctx === "zoom" ? fxConfig(zoomBase || "profile") : ctx === "sheet" ? P.draft : editable() ? P.draft : reportOf(P.id)?.config) || null;
  function fxFacets(ctx) {
    const v = fxConfig(ctx);
    if (!v) return [];
    return liveFilters(v).map((flt) => ({
      key: facetKey(flt),
      label: fieldOf(v.source, flt.field)?.label || flt.field,
      ...(flt.type === "date" ? { type: "date", today: () => DEMO_TODAY } : {}),
      ...(flt.type === "single" ? { single: true } : {}),
      ...(flt.type === "text" ? { search: true } : {})
    }));
  }
  function fx(ctx) {
    if (FX[ctx]) return FX[ctx];
    const host = document.createElement("div");
    host.className = "e-permits-rpt-fbar";
    host.innerHTML = `
      <div class="e-permits-rpt-fbar__tools">
        <button class="chip e-permits-filter-trigger e-permits-rpt-fbar__trigger" type="button" aria-expanded="false" aria-controls="rpt-fbar-${ctx}" data-rpt-filter-toggle>
          <span class="chip__icon"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-filter-lines"></use></svg></span>
          <span class="chip__label">Filtre</span>
          <span class="chip__badge" aria-hidden="true" data-rpt-filter-count hidden></span>
        </button>
      </div>
      <div class="e-permits-workplace__filters e-permits-rpt-fbar__bar" id="rpt-fbar-${ctx}" role="group" aria-label="Filtrele raportului" hidden></div>`;
    /* the „Mărește” dialog shares the state of the preview it was opened from: filters applied in one show in the other */
    const state = ctx === "zoom" ? fx(zoomBase || "profile").state : { open: true, applied: {}, draft: null };
    const x = { host, state, ctl: null };
    const model = (sel) => { const v = fxConfig(ctx); return v ? previewModel(v, sel) : { rowCount: 0, records: [] }; };
    x.ctl = window.GEAPFacetFilter.create({
      bar: host.querySelector(".e-permits-rpt-fbar__bar"),
      toggle: host.querySelector("[data-rpt-filter-toggle]"),
      count: host.querySelector("[data-rpt-filter-count]"),
      state: () => {
        state.open = true;
        const keys = new Set(fxFacets(ctx).map((f) => f.key));
        Object.keys(state.applied).forEach((k) => { if (!keys.has(k)) delete state.applied[k]; });
        if (state.draft) Object.keys(state.draft).forEach((k) => { if (!keys.has(k)) delete state.draft[k]; });
        return state;
      },
      onPageChange: () => {},
      facets: () => fxFacets(ctx),
      allFacets: () => fxFacets(ctx),
      options: (facet) => {
        const v = fxConfig(ctx);
        const flt = v ? liveFilters(v).find((f) => facetKey(f) === facet.key) : null;
        if (!flt) return [];
        const counts = new Map();
        model(null).records.forEach((rec) => { const x2 = rec[flt.field]; if (x2 != null) counts.set(x2, (counts.get(x2) || 0) + 1); });
        const f = fieldOf(v.source, flt.field);
        const order = f?.values?.length ? f.values : [...counts.keys()].sort((a, b) => String(a).localeCompare(String(b), "ro"));
        return order.filter((val) => counts.has(val)).map((val) => ({ value: val, count: counts.get(val) }));
      },
      total: () => model(state.applied).rowCount,
      preview: (sel) => model(sel).rowCount,
      apply: () => refreshPreviewOnly(),
      text: { results: (n) => plural(n, "rând", "rânduri") }
    });
    FX[ctx] = x;
    return x;
  }
  function fxReset(ctx) {
    const x = FX[ctx];
    if (!x) return;
    x.ctl.close(false);
    x.state.applied = {};
    x.state.draft = null;
  }
  /* the host into the freshly rendered card (or out, when the card has no filters) */
  function mountFilters(ctx) {
    const root = ctx === "zoom" ? fxModal() : ctx === "sheet" ? sheet : document.querySelector("#rpt-panel");
    const slot = root?.querySelector("[data-rpt-fslot]");
    const x = fx(ctx);
    if (!slot) { if (x.host.isConnected) { x.ctl.close(false); x.host.remove(); } return; }
    slot.replaceWith(x.host);
    x.ctl.render();
  }

  /* ================================================================ events */
  const profileRoot = () => (profileOpen() ? A().els?.dosarProfilPanel || document.querySelector("[data-dosar-profil]") : null);
  const inPage = (el) => { if (inSheet(el)) return Boolean(P.draft); const root = profileRoot(); return Boolean(root && root.contains(el) && P.draft && editable()); };
  const move = (list, id, by) => { const i = list.findIndex((x) => x.id === id); const j = i + by; if (i < 0 || j < 0 || j >= list.length) return false; [list[i], list[j]] = [list[j], list[i]]; return true; };
  let dragFrom = -1;
  /* rpt-filter-order-v1: move a filter (↑ ↓ / drag) — its field errors move with it; FLIP slide + flash + live line */
  function moveFilter(from, to, keep) {
    const list = P.draft.filters;
    if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return;
    const before = snapFilters();
    const errs = list.map((_, i) => P.errors[`filter.${i}`]);
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    const [err] = errs.splice(from, 1);
    errs.splice(to, 0, err);
    errs.forEach((x, i) => { if (x) P.errors[`filter.${i}`] = x; else delete P.errors[`filter.${i}`]; });
    rerender({ keep: typeof keep === "function" ? keep(to) : keep });
    reheader();
    playFilters(before, moved);
  }
  function snapFilters() {
    const root = moveRoot();
    const out = new Map();
    root?.querySelectorAll("[data-rpt-flt]").forEach((el) => { const f = P.draft.filters[Number(el.dataset.index)]; if (f) out.set(f, el.getBoundingClientRect().top); });
    return out;
  }
  function playFilters(before, moved) {
    const root = moveRoot();
    if (!root || !before) return;
    const opts = { duration: tokenMs("--motion-duration-md", 300), easing: tokenEase() };
    root.querySelectorAll("[data-rpt-flt]").forEach((el) => {
      const f = P.draft.filters[Number(el.dataset.index)];
      const top = before.get(f);
      const dy = top == null ? 0 : top - el.getBoundingClientRect().top;
      if (motionOk() && Math.abs(dy) > 0.5) el.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], opts);
      if (f === moved) { el.classList.remove("is-just-moved"); void el.offsetWidth; el.classList.add("is-just-moved"); setTimeout(() => el.classList.remove("is-just-moved"), tokenMs("--motion-duration-lg", 500) * 2); }
    });
    const i = P.draft.filters.indexOf(moved);
    const name = fieldOf(P.draft.source, moved.field)?.label || "Filtrul";
    if (i > -1) announce(`${name} mutat pe poziția ${i + 1} din ${P.draft.filters.length}.`);
  }
  let fltFrom = -1;
  function onFilterDrag(event) {
    const row = event.target.closest?.("[data-rpt-flt]");
    if (!row || !inPage(row)) { if (event.type === "dragend") fltFrom = -1; return false; }
    if (event.type === "dragstart") {
      /* a drag that starts inside a field (selecting text) is not a move */
      if (event.target.closest?.("input, textarea")) { event.preventDefault(); return true; }
      fltFrom = Number(row.dataset.index); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", `filter-${fltFrom}`); row.classList.add("is-dragging"); return true;
    }
    if (event.type === "dragover" && fltFrom >= 0) { event.preventDefault(); document.querySelectorAll("[data-rpt-flt].is-drop-target").forEach((r) => r.classList.remove("is-drop-target")); row.classList.add("is-drop-target"); return true; }
    if (event.type === "drop" && fltFrom >= 0) {
      event.preventDefault();
      const from = fltFrom;
      fltFrom = -1;
      moveFilter(from, Number(row.dataset.index), (to) => `[data-rpt-flt="${to}"]`);
      return true;
    }
    if (event.type === "dragend") { fltFrom = -1; document.querySelectorAll("[data-rpt-flt].is-dragging, [data-rpt-flt].is-drop-target").forEach((r) => r.classList.remove("is-dragging", "is-drop-target")); }
    return fltFrom >= 0;
  }
  function onDrag(event) {
    if (event.target.closest?.("[data-rpt-flt]") && onFilterDrag(event)) return;
    if (event.type === "dragend") onFilterDrag(event);
    const row = event.target.closest?.("[data-rpt-col]");
    if (!row || !inPage(row)) { if (event.type === "dragend") dragFrom = -1; return; }
    if (event.type === "dragstart") { dragFrom = Number(row.dataset.index); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", row.dataset.rptCol); row.classList.add("is-dragging"); return; }
    if (event.type === "dragover" && dragFrom >= 0) { event.preventDefault(); document.querySelectorAll("[data-rpt-col].is-drop-target").forEach((r) => r.classList.remove("is-drop-target")); row.classList.add("is-drop-target"); return; }
    if (event.type === "drop" && dragFrom >= 0) {
      event.preventDefault();
      const to = Number(row.dataset.index);
      const before = snapMove();
      const [moved] = P.draft.columns.splice(dragFrom, 1);
      P.draft.columns.splice(to, 0, moved);
      dragFrom = -1;
      afterColumnsChange(`[data-rpt-col="${CSS.escape(moved.id)}"]`);
      playMove(before, moved.id);
      return;
    }
    if (event.type === "dragend") { dragFrom = -1; document.querySelectorAll("[data-rpt-col].is-dragging, [data-rpt-col].is-drop-target").forEach((r) => r.classList.remove("is-dragging", "is-drop-target")); }
  }
  /* drag-and-drop of columns / filters: on the document from the start (it used to be wired when the create sheet was
     first built — on a profile opened directly the drag did nothing) */
  ["dragstart", "dragover", "drop", "dragend"].forEach((type) => document.addEventListener(type, onDrag));
  document.addEventListener("click", (event) => {
    const t = event.target;
    if (!t.closest) return;
    /* list */
    if (t.closest('[data-workplace-add-product="rpt-new"], [data-rpt-new]')) { event.preventDefault(); openNew(); return; }
    const rowEdit = t.closest("[data-rpt-row-edit]");
    if (rowEdit) { openProfile(rowEdit.dataset.rptRowEdit, "configurare"); return; }
    if (t.closest("[data-rpt-fx-confirm]")) { confirmFormula(); return; }
    if (t.closest("#case-action-modal [data-case-close]")) fxModal()?.classList.remove("e-permits-confirm-overlay");
    const fclear = t.closest("[data-rpt-filter-clear]");
    if (fclear) { fx(fclear.closest("#case-action-modal") ? "zoom" : inSheet(fclear) ? "sheet" : "profile").ctl.clearAll(); return; }
    const zoom = t.closest("[data-rpt-zoom]");
    if (zoom) { if (zoom.getAttribute("aria-disabled") !== "true") openZoom(); return; }
    if (inSheet(t)) {
      if (t.closest("[data-rpt-ed-close]")) { event.preventDefault(); closeCreate(); return; }
      if (t.closest("[data-rpt-prev]")) { goStep(P.step - 1); return; }
      if (t.closest("[data-rpt-next]")) { goStep(P.step + 1); return; }
      const g = t.closest("[data-rpt-goto]");
      if (g) { goStep(Number(g.dataset.rptGoto)); return; }
      if (t.closest("[data-rpt-save]")) { savePage(); return; }
      if (t.closest("[data-rpt-publish]")) { HOOKS.publish?.(P.draft, { isNew: true, save: savePage, validate, publishProblems }); return; }
    } else {
      const root = profileRoot();
      if (!root || !root.contains(t)) return;
      const tab = t.closest("[data-rpt-tab]");
      if (tab) { P.tab = tab.dataset.rptTab; renderProfile({ keep: `#rpt-tab-${P.tab}` }); if (P.id) A().writeHash?.(`#raport/${P.id}/${P.tab}`, { push: false }); return; }
      const sv = t.closest("[data-rpt-save]");
      if (sv) { if (sv.getAttribute("aria-disabled") !== "true") savePage(); return; }
      if (t.closest("[data-rpt-back]")) { event.preventDefault(); closeProfile(); return; }
    }
    if (!inPage(t)) return;
    /* the form */
    const pick = t.closest("[data-rpt-pick]");
    if (pick && inPage(pick)) {
      const [kind, val] = pick.dataset.rptPick.split("|");
      const v = P.draft;
      if (kind === "category") { v.category = val; delete P.errors.category; }
      else { v.level = val; if (val === "Global") v.authorities = []; delete P.errors.authorities; }
      rerender({ keep: `#${IDP}-${kind}` }); reheader();
      return;
    }
    const add = t.closest("[data-rpt-add]");
    if (add) { if (add.getAttribute("aria-disabled") !== "true") addKind(add.dataset.rptAdd); return; }
    const mv = t.closest("[data-rpt-col-move]");
    if (mv) { const [id, by] = mv.dataset.rptColMove.split("|"); const before = snapMove(); if (move(P.draft.columns, id, Number(by))) { const at = P.draft.columns.findIndex((c) => c.id === id); const end = Number(by) < 0 ? at === 0 : at === P.draft.columns.length - 1; afterColumnsChange(end ? `[data-rpt-col-move="${CSS.escape(`${id}|${-Number(by)}`)}"]` : `[data-rpt-col-move="${CSS.escape(`${id}|${by}`)}"]`); playMove(before, id); } return; }
    const rm = t.closest("[data-rpt-col-remove]");
    if (rm) {
      const id = rm.dataset.rptColRemove;
      const c = colOf(P.draft, id);
      const users = P.draft.columns.filter((x) => x.kind === "calc" && Object.values(x.operands || {}).includes(id));
      const drop = () => { P.draft.columns = P.draft.columns.filter((x) => x.id !== id); users.forEach((u) => Object.keys(u.operands).forEach((k) => { if (u.operands[k] === id) u.operands[k] = ""; })); delete P.errors[`col.${id}`]; afterColumnsChange("[data-rpt-add-trigger]"); };
      if (users.length) U().askConfirm?.({ title: `Elimini coloana „${colName(c)}”?`, text: `Formula ${users.length === 1 ? "coloanei" : "coloanelor"} ${users.map((u) => `„${colName(u)}”`).join(", ")} o folosește: va trebui să alegi altă coloană.`, confirmLabel: "Elimină", destructive: true }, drop);
      else drop();
      return;
    }
    const grp = t.closest("[data-rpt-col-group]");
    if (grp) {
      if (grp.getAttribute("aria-disabled") === "true") return;
      const id = grp.dataset.rptColGroup;
      const on = P.draft.groupBy !== id;
      P.draft.groupBy = on ? id : "";
      delete P.errors.groupBy;
      afterColumnsChange(`[data-rpt-col-group="${CSS.escape(id)}"]`);
      announce(on ? `Rândurile sunt grupate după ${colName(colOf(P.draft, id))}.` : "Gruparea a fost eliminată.");
      return;
    }
    if (t.closest("[data-rpt-group-clear]")) { P.draft.groupBy = ""; delete P.errors.groupBy; afterColumnsChange("[data-rpt-group-clear]"); announce("Gruparea a fost eliminată."); return; }
    const col = t.closest("[data-rpt-col]");
    if (col && !t.closest("button")) { openColumn(col.dataset.rptCol); return; }
    const fadd = t.closest("[data-rpt-filter-add]");
    if (fadd) { if (fadd.getAttribute("aria-disabled") !== "true") { P.draft.filters.push({ field: "", type: "" }); rerender({ keep: `#${IDP}-filter-field-${P.draft.filters.length - 1}` }); refreshPreviewOnly(); } return; }
    const fmv = t.closest("[data-rpt-flt-move]");
    if (fmv) {
      const [i, by] = fmv.dataset.rptFltMove.split("|").map(Number);
      const to = i + by;
      const end = by < 0 ? to === 0 : to === P.draft.filters.length - 1;
      moveFilter(i, to, `[data-rpt-flt-move="${to}|${end ? -by : by}"]`);
      return;
    }
    const frm = t.closest("[data-rpt-filter-remove]");
    if (frm) { P.draft.filters.splice(Number(frm.dataset.rptFilterRemove), 1); Object.keys(P.errors).filter((k) => k.startsWith("filter.")).forEach((k) => delete P.errors[k]); rerender({ keep: "[data-rpt-filter-add]" }); reheader(); }
  });
  /* rpt-move-v1 (2026-11-10, user: „the move is hard to follow”; FLIP, Material / Notion reorder): ↑ ↓ and drag-and-drop
     slide the list items to their new places (translateY) and the preview columns to theirs (translateX), duration /
     easing = the motion tokens (--motion-duration-md, --motion-easing-standard); the moved item flashes the selected
     tint, the focus stays on the same arrow (at an end: the other one), the ring gets the same FLIP in the same frame; a polite live line says „<Nume>
     mutată pe poziția N din M.”. prefers-reduced-motion: instant swap + the flash only. */
  const motionOk = () => !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const tokenMs = (name, fallback) => { const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); const n = parseFloat(v); return Number.isFinite(n) ? (/ms$/.test(v) ? n : n * 1000) : fallback; };
  const tokenEase = () => getComputedStyle(document.documentElement).getPropertyValue("--motion-easing-standard").trim() || "ease";
  const moveRoot = () => (creating() ? sheet : document.querySelector("#rpt-panel"));
  function snapMove() {
    const root = moveRoot();
    if (!root) return null;
    const items = {};
    root.querySelectorAll("[data-rpt-col]").forEach((el) => { items[el.dataset.rptCol] = el.getBoundingClientRect().top; });
    const cols = {};
    root.querySelectorAll("[data-rpt-preview] th[data-rpt-cell]").forEach((el) => { cols[el.dataset.rptCell] = el.getBoundingClientRect().left; });
    return { items, cols, scroll: root.querySelector("[data-rpt-preview] .e-permits-rpt-table-wrap")?.scrollLeft || 0 };
  }
  let liveEl = null;
  const announce = (text) => {
    if (!liveEl) { liveEl = Object.assign(document.createElement("p"), { className: "u-visually-hidden" }); liveEl.setAttribute("aria-live", "polite"); document.body.append(liveEl); }
    liveEl.textContent = "";
    requestAnimationFrame(() => { liveEl.textContent = text; });
  };
  function playMove(before, id) {
    const root = moveRoot();
    if (!root || !before) return;
    const anim = motionOk();
    const opts = { duration: tokenMs("--motion-duration-md", 300), easing: tokenEase() };
    /* the re-render rebuilt the preview at scroll 0: put it back, then let the highlight scroll to the moved column and
       draw its ring — every delta below is measured after that, so cells and ring share one FLIP */
    const wrap = root.querySelector("[data-rpt-preview] .e-permits-rpt-table-wrap");
    if (wrap) wrap.scrollLeft = before.scroll;
    hlHover = id;
    hlLockUntil = performance.now() + opts.duration + 100;
    syncColHl({ scroll: true });
    if (anim) {
      root.querySelectorAll("[data-rpt-col]").forEach((el) => {
        const dy = (before.items[el.dataset.rptCol] ?? el.getBoundingClientRect().top) - el.getBoundingClientRect().top;
        if (Math.abs(dy) > 0.5) el.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], opts);
      });
      root.querySelectorAll("[data-rpt-preview] th[data-rpt-cell]").forEach((th) => {
        const cid = th.dataset.rptCell;
        const dx = (before.cols[cid] ?? th.getBoundingClientRect().left) - th.getBoundingClientRect().left;
        if (Math.abs(dx) < 0.5) return;
        root.querySelectorAll(`[data-rpt-preview] [data-rpt-cell="${CSS.escape(cid)}"]`).forEach((cell) => cell.animate([{ transform: `translateX(${dx}px)` }, { transform: "none" }], opts));
        /* the ring: same inverse transform, same timing, started in the same loop / frame as its column's cells */
        if (cid === id) root.querySelector("[data-rpt-preview] .e-permits-rpt-col-ring")?.animate([{ transform: `translateX(${dx}px)` }, { transform: "none" }], opts);
      });
    }
    const item = root.querySelector(`[data-rpt-col="${CSS.escape(id)}"]`);
    if (item) { item.classList.remove("is-just-moved"); void item.offsetWidth; item.classList.add("is-just-moved"); setTimeout(() => item.classList.remove("is-just-moved"), tokenMs("--motion-duration-lg", 500) * 2); }
    const i = P.draft.columns.findIndex((c) => c.id === id);
    if (i > -1) announce(`${colName(P.draft.columns[i])} mutată pe poziția ${i + 1} din ${P.draft.columns.length}.`);
  }

  /* rpt-col-link-v1 (2026-11-09, user; Salesforce / Google Ads / Zoho report builders): the column list ↔ the live preview.
     Hover / focus of a list item or its preview header, and the column whose panel is open, tint that column in the
     preview (one focus-ring rectangle `.e-permits-rpt-col-ring` over the column); focusing an item (or opening its panel)
     scrolls the preview sideways to it; a preview header button focuses its list item. */
  let hlHover = "";
  /* while a move plays, the pointer lands on another (swapped) item: hover does not steal the highlight */
  let hlLockUntil = 0;
  const hlTarget = () => hlHover || (DR?.mode === "col" && DR.colId) || "";
  function syncColHl({ scroll = false } = {}) {
    const root = creating() ? sheet : document.querySelector("#rpt-panel");
    if (!root) return;
    const id = hlTarget();
    root.querySelectorAll("[data-rpt-preview] .e-permits-rpt-col-ring").forEach((el) => el.remove());
    root.querySelectorAll("[data-rpt-col].is-selected").forEach((el) => el.classList.remove("is-selected"));
    /* the column whose panel is open = the selected list item (the Registre column list's brand-secondary row) */
    const open = DR?.mode === "col" && DR.colId;
    if (open) root.querySelector(`[data-rpt-col="${CSS.escape(open)}"]`)?.classList.add("is-selected");
    if (!id) return;
    const head = root.querySelector(`[data-rpt-preview] th[data-rpt-cell="${CSS.escape(id)}"]`);
    const wrap = head?.closest(".e-permits-rpt-table-wrap");
    /* rpt-col-ring-v5 (user): ONE straight rectangle — an overlay in the table's scroll box (it scrolls with the table),
       above every cell, line and edge shadow; x / width = the column's header cell, y = that cell's top (a grouped
       column: its second-row header, never the group label) → the table's bottom. Laid out from offset* (untransformed),
       so it is the column's FINAL place; playMove gives it the cells' FLIP in the same frame. */
    const table = head?.closest("table");
    if (head && table && wrap) {
      const ring = document.createElement("span");
      ring.className = "e-permits-rpt-col-ring";
      ring.setAttribute("aria-hidden", "true");
      [["--ring-x", table.offsetLeft + head.offsetLeft], ["--ring-y", table.offsetTop + head.offsetTop], ["--ring-w", head.offsetWidth], ["--ring-h", table.offsetHeight - head.offsetTop]].forEach(([k, px]) => ring.style.setProperty(k, `${px}px`));
      wrap.prepend(ring);
    }
    if (scroll && head && wrap) {
      const w = wrap.getBoundingClientRect();
      const r = head.getBoundingClientRect();
      if (r.left < w.left) wrap.scrollLeft -= w.left - r.left;
      else if (r.right > w.right) wrap.scrollLeft += r.right - w.right;
    }
  }
  const colFromEvent = (t) => t.closest?.("[data-rpt-col]")?.dataset.rptCol || t.closest?.("[data-rpt-col-pick]")?.dataset.rptColPick || "";
  document.addEventListener("mouseover", (event) => {
    if (!P.draft || !inPage(event.target) || performance.now() < hlLockUntil) return;
    const id = colFromEvent(event.target);
    if (id !== hlHover) { hlHover = id; syncColHl(); }
  });
  document.addEventListener("focusin", (event) => {
    if (!P.draft || !inPage(event.target)) return;
    const id = colFromEvent(event.target);
    if (id) { hlHover = id; syncColHl({ scroll: Boolean(event.target.closest("[data-rpt-col]")) }); }
  });
  document.addEventListener("focusout", (event) => {
    if (!P.draft || !inPage(event.target) || !colFromEvent(event.target)) return;
    requestAnimationFrame(() => { if (!colFromEvent(document.activeElement || document.body)) { hlHover = ""; syncColHl(); } });
  });
  document.addEventListener("click", (event) => {
    const pick = event.target.closest?.("[data-rpt-col-pick]");
    if (!pick || !inPage(pick)) return;
    const root = creating() ? sheet : document.querySelector("#rpt-panel");
    const item = root?.querySelector(`[data-rpt-col="${CSS.escape(pick.dataset.rptColPick)}"]`);
    if (!item) return;
    item.scrollIntoView({ block: "center", behavior: "smooth" });
    item.focus({ preventScroll: true });
    hlHover = pick.dataset.rptColPick;
    syncColHl();
  });
  /* Enter / Space on a column row opens its panel (the stack row is the control) */
  document.addEventListener("keydown", (event) => {
    const row = event.target.closest?.("[data-rpt-col]");
    if (row && event.target === row && (event.key === "Enter" || event.key === " ") && inPage(row)) { event.preventDefault(); openColumn(row.dataset.rptCol); return; }
    const tab = event.target.closest?.("[data-rpt-tab]");
    if (!tab || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    const TABS = tabsNow();
    const i = TABS.findIndex(([id]) => id === tab.dataset.rptTab);
    const next = TABS[(i + (event.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length][0];
    event.preventDefault();
    P.tab = next;
    renderProfile({ keep: `#rpt-tab-${next}` });
  });
  document.addEventListener("input", (event) => {
    const el = event.target;
    if (!el.closest || !inPage(el) || el.closest("[data-rpt-drawer]")) return;
    const key = el.dataset?.rptField;
    if (!key || el.tagName === "SELECT" || el.type === "checkbox") return;
    setPath(P.draft, key, el.value);
    if (key === "names.ro") delete P.errors["names.ro"];
    const count = document.querySelector(`[data-rpt-count="${el.id}"]`);
    if (count) { const max = el.tagName === "TEXTAREA" ? TEXT_MAX : NAME_MAX; count.textContent = `${el.value.length}/${max}`; count.classList.toggle("is-over", el.value.length > max); }
    refreshPreviewOnly();
    reheader();
  });
  document.addEventListener("change", (event) => {
    const el = event.target;
    if (!el.closest || !inPage(el) || el.closest("[data-rpt-drawer]")) return;
    const v = P.draft;
    const fid = (node) => node.closest(".e-permits-fo-field, .e-permits-doc-cond__cell")?.querySelector("button[id], input[id]")?.id || "";
    if (el.matches("[data-rpt-from]") && creating()) {
      const src = reportOf(el.value);
      P.from = src?.id || "";
      P.draft = src ? cloneConfig(src) : blankConfig();
      P.base = clone(P.draft); P.errors = {}; P.totalTouched = Boolean(src); P.maxStep = src ? STEPS.length : 1;
      renderCreate({ keep: `#${IDP}-from` });
      return;
    }
    if (el.matches("[data-rpt-auth-all]")) { v.authorities = el.checked ? D().authorities.map((x) => x.id) : []; delete P.errors.authorities; rerender({ keep: "[data-rpt-auth-all]" }); reheader(); return; }
    if (el.matches("[data-rpt-auth]")) {
      const id = el.dataset.rptAuth;
      v.authorities = el.checked ? [...new Set([...v.authorities, id])] : v.authorities.filter((a) => a !== id);
      delete P.errors.authorities;
      rerender({ keep: `[data-rpt-auth="${id}"]` }); reheader();
      return;
    }
    const filt = el.closest("[data-rpt-filter]");
    if (filt) {
      const i = Number(filt.dataset.rptFilter);
      const f = v.filters[i];
      f[el.dataset.rptFilterPart] = el.value;
      if (el.dataset.rptFilterPart === "field") { const sup = supportOf(v, el.value); if (!sup.includes(f.type)) f.type = sup.length === 1 ? sup[0] : ""; }
      delete P.errors[`filter.${i}`];
      rerender({ keep: fid(el) ? `#${CSS.escape(fid(el))}` : "" }); reheader();
      return;
    }
    const key = el.dataset?.rptField;
    if (!key || (el.tagName !== "SELECT" && el.type !== "checkbox")) return;
    const value = el.type === "checkbox" ? el.checked : el.value;
    const old = getPath(v, key);
    setPath(v, key, value);
    delete P.errors[key];
    if (key === "totalRow") P.totalTouched = true;
    if (key === "source" && value !== old) {
      /* another source: its fields replace the old ones — source columns and filters on missing fields are emptied */
      v.columns.forEach((c) => { if (c.kind === "source" && !fieldOf(value, c.field)) c.field = ""; if (c.kind === "calc" && formulaOf(c.formula) && !formulaFits(formulaOf(c.formula), value)) c.formula = ""; });
      v.filters = v.filters.filter((f) => fieldOf(value, f.field));
    }
    rerender({ keep: fid(el) ? `#${CSS.escape(fid(el))}` : `[data-rpt-field="${key}"]` });
    reheader();
  });

  /* ---------------------------------------------------------------- routes + denied (Feature AC) */
  function showDenied() {
    document.querySelectorAll("[data-nav-item].is-active").forEach((link) => { link.classList.remove("is-active"); link.removeAttribute("aria-current"); });
    G().showPage?.(TITLE, E()?.render({ title: DENIED, text: "Meniul „Rapoarte” este disponibil rolurilor cu permisiunea „Gestionarea rapoartelor”.", icon: "lock" }) || DENIED);
  }
  window.GEAPShellRoutes = window.GEAPShellRoutes || [];
  window.GEAPShellRoutes.push((h) => {
    if (h === `#${NAV}`) {
      const nav = document.querySelector(`[data-nav-item][data-nav-id="${NAV}"]`);
      if (nav && who().has) nav.click(); else showDenied();
      return true;
    }
    const m = /^#raport\/([^/]+)(?:\/([a-zA-Z0-9-]+))?$/.exec(h);
    if (!m) return false;
    if (!who().has) { showDenied(); return true; }
    if (m[1] === "nou") {
      if (!creating()) { document.querySelector(`[data-nav-item][data-nav-id="${NAV}"]`)?.click(); openNew(); }
      return true;
    }
    load().then(() => openProfile(decodeURIComponent(m[1]), m[2] || "configurare", { push: false }));
    return true;
  });
  /* Feature AC: the menu item exists only with „Gestionarea rapoartelor” */
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

  /* ---------------------------------------------------------------- API + the hooks for PART 2
     GEAPRapoarte.hooks (each optional; part 1 renders the matching control only when the hook exists):
       publish(draftOrConfig, ctx)              → the „Publică” button of the sheet's last step + the profile header
       headerActions(report, ctx) → html        → extra header buttons (e.g. „Publică”) after „Salvează”
       headerMenu(report, ctx) → items[]        → the ⋮ of the profile header (Clonează, Dezactivează / Activează, Acces)
       rowMenu(report, ctx) → items[]           → extra row-menu items of the list
       versionsTab(report) → html               → replaces the plain „Versiuni publicate” timeline (compare, restore)
       historyTab(report) → html                → replaces the plain audit timeline (journal records)
     Helpers for part 2: get / list / all / audit / lastVersion / unpublished / canEdit / canCreate / validate /
     publishProblems / configRows / readBlocks / cardHtml / rerender / refreshList / openNew / openProfile / state. */
  window.GEAPRapoarte = {
    load, openProfile, openNew, refreshList, perms: () => who(),
    list: () => reports(), all: () => all(), get: reportOf,
    formulas: () => formulas(),
    audit, lastVersion, unpublished, canEdit, canCreate, validate, publishProblems, configRows, readBlocks, cardHtml,
    levelText, sourceName, authName, authorities: () => D().authorities, roles: () => D().roles || [],
    save: (opts) => savePage(opts), dirty: () => pageDirty(), editable: (r) => editable(r), visible: (r) => visible(r),
    ui: { textField, areaField, selectField, errorHtml, setFieldError, grid, req },
    rerender: () => { if (creating()) renderCreate(); else if (profileOpen()) renderProfile(); },
    state: () => P,
    hooks: HOOKS,
    published: (id) => { const r = reportOf(id); return r && r.status === "Publicat" ? lastVersion(r)?.config || null : null; }
  };
})();
