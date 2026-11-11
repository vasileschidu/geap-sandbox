/* =====================================================================================
   Administrare › Rapoarte (rpt-v1, 2026-11-09) — Feature 96502 „Constructor de rapoarte” (Epic 96497 Raportare și
   analiză; completes Feature 94523 „Constructor de registre interne GEAP”). Child stories US-466 Crearea · US-467 Lista
   · US-468 Editarea · US-469 Publicarea · US-470 Dezactivarea / activarea · US-471 Istoricul versiunilor — not in Azure
   yet: built from the Feature text, split per its Traceability titles.

   PART 1 (this file, rpt-v1): the list (US-467), the create sheet (US-466: Date generale · Coloane · Structură ·
   Revizuire), the column builder (side panels: the data dictionary of the source + the column panel with the formula
   picker), the live preview table (two-level header, „Inclusiv” columns, group rows + subtotals, total row, calculated
   cells formatted), the profile page (US-468: Configurare editable + preview; Versiuni / Istoric
   = minimal timelines). PART 2 plugs in through `window.GEAPRapoarte.hooks` (see the end of the file): publish dialog,
   versions tab + restore, deactivate / activate, access grants, clone — every button of those actions is rendered only
   when its hook exists, so part 1 never shows a dead control.

   No new engine — the KPI / widget / Registre patterns:
     · list = the BO registry (`window.GEAPShellRegistries.rapoarte`, menu `shellView: "rapoarte-registry"`) drawn as the
       shell stacked list (`stackItem`, rpt-stack-list-v1: no grouping), facets Categorie · Nivel · Statut;
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

   rpt-feature-v1 (2026-11-10, user: „make it match the Feature”) — aligned with the Feature text:
     · column kinds = Din sursa de date / Calculată only (the Feature comment removed the manual columns);
     · filters = per COLUMN, as in Registre (column panel: „Filtrabilă” + „Tipul filtrului” Text / Alegere unică /
       Alegere multiplă / Interval de date, only the types the field supports); chips above the preview in column order
       (first 4 + „Mai multe”), Text filters = the search field above them (the BO register search);
     · grouping: Feature = ONE column; PROPOSAL FOR PO (Alexandru chat, user 2026-11-10, rpt-levels-v2) = up to 3 ordered
       levels, nested group rows + a subtotal per level;
     · Nivel is generated: Global for the Administrator central (optional authorities, none = all), Autoritate (the
       user's own) for anyone else; clone = same category (read-only on a copy);
     · the formula set = the formulas of the reports the user can clone, on the same source; „Formulă nouă” for every
       author, it enters the set when the report is saved; an identical formula is kept once.
     (The PO-chat extras are back as proposals for the PO: și / sau conditions (rpt-cond-restore-v1) and multi-level
     grouping (rpt-levels-v2, from rpt-levels-v1 910b8635).)

   Interpretations (open for PO / BA — listed in components.md › „Rapoarte”):
     · „Inclusiv” = a breakdown of the nearest «Se adună în total» measure column to its left (the statistical form
       „Total, inclusiv: …”): its header is nested („inclusiv”), its values are parts of that column;
     · a «Numeric» column on a text / date source field = the number of records with a value in that field;
     · a Global report with no authority chosen = every authority; „identical formula” = same expression + format.
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

  /* ---------------------------------------------------------------- the Feature's classifiers */
  const CATEGORIES = [
    ["tabelar", "Rapoarte tabelare", "Rânduri din sursa de date, cu coloane, totaluri și subtotaluri."],
    ["statistic", "Rapoarte statistice", "Indicatori agregați pe categorii, ca în formularele statistice."]
  ];
  /* rpt-rich-select-v1: the icons of the rich dropdown (Categoria) */
  const CATEGORY_ICON = { tabelar: "table", statistic: "chart" };
  /* the list's meta line + Categorie facet (rpt-stack-list-v1) */
  const CATEGORY_SHORT = { tabelar: "Tabelar", statistic: "Statistic" };
  /* Feature model «Coloana raportului»: Din sursa de date / Calculată (no manual columns — Feature comment, 2026-11) */
  const KINDS = [
    ["source", "Din sursa de date", "Valoarea unui câmp al sursei de date."],
    ["calc", "Calculată", "Rezultatul unei formule din setul de formule."]
  ];
  const KIND_TAG = { source: ["Din sursă", "neutral"], calc: ["Calculată", "brand"] };
  const DATA_TYPES = [["numeric", "Numeric"], ["value", "Valoric"], ["temporal", "Temporal"], ["text", "Text"]];
  const TOTALS = [["sum", "Se adună în total", "Valorile coloanei intră în subtotaluri și în rândul de total."], ["incl", "Inclusiv", "Detaliază coloana «Se adună în total» din stânga ei („din care”)."]];
  /* rpt-cond-v1 (2026-11-10, PO: inline filters with „și / sau”; Notion / Airtable / Linear / Metabase filter builder): a
     condition = „Unde [Câmp] [Condiție] [Valoare]”; the operators follow the field's kind; „Afișează filtru” leaves the
     value empty → the condition becomes a filter chip above the report (a Text condition „conține” = the search field above
     the chips, rpt-cond-text-v1; number fields always take a fixed value). rpt-cond-restore-v1 (2026-11-10, user decision):
     the PO's inline builder (Alexandru chat) is back — a Proposal for PO vs the Feature text („pe coloane, ca la registre”). */
  const COND_KIND = { enum: "list", text: "text", date: "date", duration: "number", amount: "number", number: "number" };
  const COND_OPS = {
    list: [["is", "este"], ["not", "nu este"]],
    text: [["contains", "conține"], ["is", "este"]],
    date: [["between", "între"], ["before", "înainte de"], ["after", "după"], ["last", "în ultimele N zile"]],
    number: [["eq", "="], ["neq", "≠"], ["gt", ">"], ["lt", "<"], ["between", "între"]]
  };
  const ASK_OPS = { list: ["is", "not"], text: ["contains"], date: ["between"], number: [] };
  const NO_ASK = "Un câmp numeric primește o valoare fixă: alege condiția și valoarea.";
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
  /* rpt-group-v1: rows group by a Text column from the source (numeric / calculated columns have no group toggle) */
  const groupable = (c) => Boolean(c) && c.kind === "source" && c.dataType === "text";
  /* rpt-levels-v2 (2026-11-10, user: „how can I see 1, 2, 3?”) — PROPOSAL FOR PO (Alexandru chat) vs Feature 96502's ONE
     grouping column: up to 3 ordered levels (rpt-levels-v1 910b8635 restored). `groupBy` = the ordered column ids; one
     Text column always stays ungrouped (the rows are listed by it). */
  const MAX_LEVELS = 3;
  /* the grouping glyph: the sprite has no „group rows / layers” icon (icon-tree = a plant) → numbered list (ordered levels) */
  const GROUP_ICON = "list-numbers";
  const levelCols = (v) => (v.groupBy || []).map((id) => colOf(v, id)).filter(groupable).slice(0, MAX_LEVELS);
  const levelsText = (v) => levelCols(v).map(colName).join(", ");
  /* rpt-cond-text-v1: the asked Text conditions („conține”) = ONE search field above the chips (the BO register search) */
  const askText = (v) => askConds(v).filter((c) => condKind(v, c) === "text");
  const askChips = (v) => askConds(v).filter((c) => condKind(v, c) !== "text");
  const searchText = (v) => `Caută după ${[...new Set(askText(v).map((c) => fldLabel(v, c).toLocaleLowerCase("ro")))].slice(0, 3).join(", ")}`;

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
  const authLabel = (a) => `${a.name} · ${a.long}`.replace(/ · $/, "");
  /* rpt-auth-ms-v1: „Toate autoritățile” unticked on a draft with no authority yet (UI state per draft object) */
  const AUTH_SOME = new WeakMap();
  const authSome = (v) => (AUTH_SOME.has(v) ? AUTH_SOME.get(v) : (v.authorities || []).length > 0);
  const roleLabel = () => { const w = who(); return w.central ? w.roleLabel || "Administrator central" : `Utilizator cu permisiunea «Gestionarea rapoartelor» · ${authName(w.authority)}`; };

  /* ---------------------------------------------------------------- data */
  const S = { data: null, loading: null };
  const blankConfig = (me = who()) => ({
    names: { ro: "", ru: "", en: "" }, descriptions: { ro: "", ru: "", en: "" },
    category: "", source: "", level: me.central ? "Global" : "Autoritate", authorities: me.central ? [] : [me.authority],
    columns: [], groupBy: [], filters: [], totalRow: true
  });
  const normal = (c) => {
    const base = blankConfig({ central: true });
    const v = { ...base, ...c, names: { ...base.names, ...c.names }, descriptions: { ...base.descriptions, ...c.descriptions } };
    /* rpt-feature-v1: a legacy manual column is dropped (and emptied from the formulas that used it) */
    const gone = new Set((v.columns || []).filter((col) => col.kind === "manual").map((col) => col.id));
    v.columns = (v.columns || []).filter((col) => !gone.has(col.id)).map((col) => ({ names: { ro: "", ru: "", en: "" }, kind: "source", field: "", formula: "", operands: {}, dataType: "text", header: "", total: "sum", ...col, names: { ro: "", ru: "", en: "", ...col.names }, operands: Object.fromEntries(Object.entries(col.operands || {}).map(([k, id]) => [k, gone.has(id) ? "" : id])) }));
    /* rpt-cond-v1: conditions + one-level groups; a legacy filter { field, type } = an „Afișează filtru” condition (Text →
       „conține”); a column filter of the rpt-feature-v1 build becomes one too */
    let seq = 0;
    const legacyOp = (t) => (t === "date" ? "between" : t === "text" ? "contains" : t ? "is" : "");
    const cond = (f) => ({ id: f.id || `f${seq += 1}`, field: f.field || "", op: f.op || legacyOp(f.type), value: String(f.value ?? ""), value2: String(f.value2 ?? ""), values: [...(f.values || [])], ask: f.ask ?? Boolean(f.type) });
    const fromCols = v.columns.filter((col) => col.filter && col.kind === "source").map((col) => ({ field: col.field, type: col.filter }));
    v.columns.forEach((col) => { delete col.filter; });
    v.filters = [...(Array.isArray(v.filters) ? v.filters : []), ...(Array.isArray(v.filters) && v.filters.length ? [] : fromCols)].map((f) => (f.group ? { id: f.id || `g${seq += 1}`, group: true, conj: f.conj === "or" ? "or" : "and", rules: (f.rules || []).filter((x) => !x.group).map(cond) } : cond(f))).filter((f) => !f.group || f.rules.length);
    v.filterConj = v.filterConj === "or" ? "or" : "and";
    v.authorities = [...(v.authorities || [])];
    v.groupBy = (Array.isArray(v.groupBy) ? v.groupBy : v.groupBy ? [v.groupBy] : []).slice(0, MAX_LEVELS);
    return v;
  };
  function load() {
    if (S.data) return Promise.resolve(S.data);
    if (!S.loading) {
      S.loading = Promise.all([
        fetch("data/rapoarte.json?v=rpt-page-v1").then((r) => r.json()),
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
  /* a Global report with authorities = assigned to those (none = all); an Autoritate report = its own authority */
  const visible = (r, me = who()) => me.central || (r.config.level === "Global" ? !r.config.authorities.length || r.config.authorities.includes(me.authority) : r.config.authorities.includes(me.authority));
  const reports = () => (who().has ? all().filter((r) => visible(r)) : []);
  const sources = () => K().sources?.() || [];
  const sourceOf = (id) => sources().find((s) => s.id === id) || null;
  const sourceName = (id) => sourceOf(id)?.name || "";
  const fieldsOf = (id) => (id ? K().fields?.(id) || [] : []);
  const fieldOf = (src, key) => fieldsOf(src).find((f) => f.key === key) || null;
  const formulas = () => D().formulas;
  /* „Formulă nouă” waits in P.newFormulas until the report is saved (Feature: „intră în set la salvarea raportului”) */
  const formulaOf = (id) => formulas().find((f) => f.id === id) || (P.newFormulas || []).find((f) => f.id === id) || null;
  const formulaFits = (f, src) => !f.sources || f.sources.includes(src);
  /* an identical formula = the same expression (spaces / × * / − - ignored) and the same result format */
  const exprKey = (x) => String(x || "").replace(/\s+/g, "").replace(/×/g, "*").replace(/−/g, "-").replace(/÷/g, "/").toUpperCase();
  const sameFormula = (a, b) => exprKey(a.expr) === exprKey(b.expr) && a.format === b.format;
  const colOf = (v, id) => v.columns.find((c) => c.id === id) || null;
  /* rpt-col-hide-v1 (2026-11-11, user): a hidden column stays in the report (grouping, filters, formulas) but is not shown */
  const shownCols = (v) => v.columns.filter((c) => !c.hidden);
  const colName = (c) => c?.names.ro || "Coloană fără denumire";
  const lastVersion = (r) => r.versions[r.versions.length - 1] || null;
  const unpublished = (r) => Boolean(lastVersion(r)) && !same(r.config, lastVersion(r).config);
  const authSummary = (v) => (!v.authorities.length ? (v.level === "Global" ? "Toate autoritățile" : "—") : v.authorities.length <= 2 ? v.authorities.map(authName).join(", ") : `${v.authorities.length} autorități`);
  const levelText = (v) => (v.level === "Global" ? (v.authorities.length ? `Global · ${v.authorities.map(authName).join(", ")}` : "Global") : `Autoritate · ${v.authorities.map(authName).join(", ") || "—"}`);

  /* ---------------------------------------------------------------- permissions per report (Feature AC) */
  const canCreate = () => who().has;
  const canEdit = (r) => {
    const me = who();
    if (!me.has || !r) return false;
    if (me.central) return true;
    /* any other user: only his own authority's report; global reports are read-only (he clones them) */
    return r.config.level !== "Global" && r.config.authorities.includes(me.authority);
  };
  /* Feature: „Autoritatea alege formula din setul de formule disponibile sau adaugă o formulă nouă” — every author */
  const canAddFormula = () => who().has;
  /* Feature: „setul oferă doar formulele din rapoartele pe care utilizatorul le poate clona, construite pe aceeași sursă
     de date” — the formulas used by the visible reports on that source + the ones saved with them (origin) + this
     report's new ones; one per identical expression */
  function formulaSet(v) {
    const mine = reports().filter((r) => r.config.source === v.source);
    const used = new Set(mine.flatMap((r) => r.config.columns.filter((c) => c.kind === "calc").map((c) => c.formula)));
    const origins = new Set(mine.map((r) => r.id));
    v.columns.forEach((c) => { if (c.kind === "calc" && c.formula) used.add(c.formula); });
    const list = [...formulas(), ...(P.newFormulas || [])].filter((f) => formulaFits(f, v.source) && (used.has(f.id) || origins.has(f.origin) || (P.newFormulas || []).includes(f)));
    return list.filter((f, i) => list.findIndex((x) => sameFormula(x, f)) === i);
  }

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
  /* ---- conditions (rpt-cond-v1) */
  const flatConds = (v) => (v.filters || []).flatMap((x) => (x.group ? x.rules : [x]));
  const condKind = (v, c) => COND_KIND[fieldOf(v.source, c.field)?.type] || "";
  const opOf = (v, c) => { const k = condKind(v, c); const ops = (COND_OPS[k] || []).map(([o]) => o); return ops.includes(c.op) ? c.op : ops[0] || ""; };
  const opText = (v, c) => label(COND_OPS[condKind(v, c)] || [], opOf(v, c));
  const canAsk = (v, c) => Boolean(c.field) && (ASK_OPS[condKind(v, c)] || []).length > 0;
  const asking = (v, c) => Boolean(c.ask) && canAsk(v, c);
  /* the conditions that become chips above the report, in the builder's order */
  const askConds = (v) => flatConds(v).filter((c) => asking(v, c) && fieldOf(v.source, c.field));
  const fldLabel = (v, c) => fieldOf(v.source, c.field)?.label || c.field;
  const chipLabel = (v, c) => (opOf(v, c) === "not" ? `${fldLabel(v, c)} · nu este` : fldLabel(v, c));
  const roDate = (iso) => (iso ? longDate(`${iso}T12:00:00`) : "");
  /* what a fixed condition misses ("" = complete) — the field error texts */
  function condMissing(v, c) {
    const k = condKind(v, c);
    const op = opOf(v, c);
    if (!c.field) return "Alege câmpul.";
    if (!k) return "Câmpul nu există în sursa de date aleasă.";
    if (asking(v, c)) return "";
    if (k === "list") return c.values.length ? "" : "Alege cel puțin o valoare.";
    if (k === "text") return String(c.value).trim() ? "" : "Introdu textul.";
    if (k === "number") {
      const bad = (x) => String(x).trim() === "" || Number.isNaN(Number(String(x).replace(",", ".")));
      if (op === "between") return bad(c.value) || bad(c.value2) ? "Introdu ambele valori." : Number(String(c.value).replace(",", ".")) > Number(String(c.value2).replace(",", ".")) ? "Prima valoare trebuie să fie cel mult a doua." : "";
      return bad(c.value) ? "Introdu valoarea." : "";
    }
    if (op === "last") return /^\d+$/.test(String(c.value).trim()) && Number(c.value) > 0 ? "" : "Introdu numărul de zile.";
    if (op === "between") return !c.value || !c.value2 ? "Alege ambele date." : c.value > c.value2 ? "„De la” trebuie să fie înainte de „Până la”." : "";
    return c.value ? "" : "Alege data.";
  }
  const condComplete = (v, c) => !condMissing(v, c);
  /* „Condiții: …” — the fixed conditions as one sentence (groups in parentheses) */
  function condSentence(v, c) {
    const k = condKind(v, c);
    const op = opOf(v, c);
    const f = fldLabel(v, c);
    if (k === "list") return `${f} ${opText(v, c)} ${c.values.join(", ")}`;
    if (k === "text") return `${f} ${opText(v, c)} „${String(c.value).trim()}”`;
    if (k === "number") return op === "between" ? `${f} între ${c.value} și ${c.value2}` : `${f} ${opText(v, c)} ${c.value}`;
    if (op === "last") return `${f} în ultimele ${plural(Number(c.value), "zi", "zile")}`;
    if (op === "between") return `${f} între ${roDate(c.value)} și ${roDate(c.value2)}`;
    return `${f} ${opText(v, c)} ${roDate(c.value)}`;
  }
  const fixed = (v, c) => !asking(v, c) && condComplete(v, c);
  /* rpt-scope-v1 (2026-11-11, user): the same conditions as „Câmp: valoare” for the preview notice („Filtre aplicate: …”) */
  function condRead(v, c) {
    const k = condKind(v, c);
    const op = opOf(v, c);
    const f = fldLabel(v, c);
    if (k === "list") return `${f}: ${op === "not" ? "nu este " : ""}${c.values.join(", ")}`;
    if (k === "text") return `${f}: ${opText(v, c)} „${String(c.value).trim()}”`;
    if (k === "number") return op === "between" ? `${f}: între ${c.value} și ${c.value2}` : `${f}: ${opText(v, c)} ${c.value}`;
    if (op === "last") return `${f}: ultimele ${plural(Number(c.value), "zi", "zile")}`;
    if (op === "between") return `${f}: ${roDate(c.value)} – ${roDate(c.value2)}`;
    return `${f}: ${opText(v, c)} ${roDate(c.value)}`;
  }
  function condsText(v, sentence = condSentence) {
    const word = (conj) => (conj === "or" ? " sau " : " și ");
    const parts = (v.filters || []).map((x) => {
      if (!x.group) return fixed(v, x) ? sentence(v, x) : "";
      const inner = x.rules.filter((c) => fixed(v, c)).map((c) => sentence(v, c));
      return inner.length > 1 ? `(${inner.join(word(x.conj))})` : inner[0] || "";
    }).filter(Boolean);
    return parts.join(word(v.filterConj));
  }
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
      if (v.level === "Global" && authSome(v) && !v.authorities.length) e.authorities = "Alege cel puțin o autoritate.";
    }
    if (steps.includes(2)) {
      if (!v.columns.length) e.columns = "Adaugă cel puțin o coloană.";
      v.columns.forEach((c) => { const ce = columnErrors(v, c); if (Object.keys(ce).length) e[`col.${c.id}`] = ce; });
    }
    if (steps.includes(3)) {
      if (v.groupBy.some((id) => !colOf(v, id))) e.groupBy = "Coloana de grupare nu mai este în raport.";
      flatConds(v).forEach((c) => {
        const m = condMissing(v, c);
        if (m) e[`filter.${c.id}.${!c.field || !condKind(v, c) ? "field" : "value"}`] = m;
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
      if (labels[c.id] != null) out[c.id] = labels[c.id];
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
      if (c.kind === "calc" || c.dataType === "text") { out[c.id] = null; return; }
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
    /* a record number (Nr. dosar / act / notă) = the compact copy value, as in every list (components.md › Copy value) */
    if (typeof x === "string" && c.kind === "source" && fieldOf(v.source, c.field)?.type === "text" && window.GEAPCopyValue) return window.GEAPCopyValue.html(x, { compact: true, label: `Copiază ${x}` });
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
  /* rpt-cond-v1: every demo record carries a value for each field a condition uses (the row's own value when the field is
     one of its Text columns; dates spread over 2026; numbers by kind) */
  function recordsOf(v, rowKey, vals) {
    const keys = [...new Set(flatConds(v).filter((c) => condKind(v, c)).map((c) => c.field))];
    if (!keys.length) return [];
    return Array.from({ length: RECS }, (_, i) => {
      const rec = {};
      keys.forEach((key) => {
        const f = fieldOf(v.source, key);
        const col = v.columns.find((c) => c.kind === "source" && c.field === key && c.dataType === "text");
        const cv = col ? vals[col.id] : null;
        const h = hash(`${key}|${rowKey}|${i}`);
        if (f.type === "date") rec[key] = isoDay(BASE_DAY + (h % 310) * DAY);
        else if (f.type === "duration") rec[key] = 1 + (h % 45);
        else if (f.type === "amount") rec[key] = 100 + (h % 20000);
        else if (f.type === "number") rec[key] = h % 100;
        else if (typeof cv === "string" && cv) rec[key] = cv;
        else if (f.type === "enum" && f.values.length) rec[key] = f.values[h % f.values.length];
        else rec[key] = `${key === "nr" ? "D" : "N"}-2026-${String(1000 + (h % 9000)).padStart(5, "0")}`;
      });
      return rec;
    });
  }
  const selEntries = (sel) => Object.entries(sel || {}).filter(([, values]) => values?.length);
  const num = (x) => Number(String(x).replace(",", "."));
  /* one condition on one record: true / false, or null = not active (incomplete, or a chip with nothing chosen) */
  function condOk(v, c, rec, sel, q = "") {
    const k = condKind(v, c);
    if (!k) return null;
    const x = rec[c.field];
    const op = opOf(v, c);
    if (asking(v, c)) {
      /* rpt-cond-text-v1: an asked Text condition = the search field (q), „conține” */
      if (k === "text") { const needle = fold(q).trim(); return needle ? fold(x).includes(needle) : null; }
      const vals = sel?.[c.id];
      if (!vals?.length) return null;
      if (k === "date") return window.GEAPFacetFilter?.dateMatch ? window.GEAPFacetFilter.dateMatch(vals[0], x, DEMO_TODAY) : true;
      const hit = vals.includes(x);
      return op === "not" ? !hit : hit;
    }
    if (!condComplete(v, c)) return null;
    if (k === "list") { const hit = c.values.includes(x); return op === "not" ? !hit : hit; }
    if (k === "text") return op === "is" ? fold(x) === fold(c.value).trim() : fold(x).includes(fold(c.value).trim());
    if (k === "number") {
      const a = num(c.value);
      return op === "eq" ? x === a : op === "neq" ? x !== a : op === "gt" ? x > a : op === "lt" ? x < a : x >= a && x <= num(c.value2);
    }
    if (op === "last") return x <= DEMO_TODAY && x >= isoDay(Date.UTC(2026, 10, 10) - Number(c.value) * DAY);
    if (op === "between") return x >= c.value && x <= c.value2;
    return op === "before" ? x < c.value : x > c.value;
  }
  /* AND / OR at each level (one conjunction per level — Airtable); inactive items are skipped */
  const levelOk = (items, conj, test) => { const rs = items.map(test).filter((r) => r !== null); return rs.length ? (conj === "or" ? rs.some(Boolean) : rs.every(Boolean)) : null; };
  function recMatch(v, rec, sel, q = "") {
    return levelOk(v.filters || [], v.filterConj, (x) => (x.group ? levelOk(x.rules, x.conj, (c) => condOk(v, c, rec, sel, q)) : condOk(v, x, rec, sel, q))) !== false;
  }
  const scoped = (v, sel, q = "") => selEntries(sel).length > 0 || flatConds(v).some((c) => fixed(v, c)) || Boolean(String(q || "").trim() && askText(v).length);
  /* rpt-levels-v1: the demo DATA does not depend on the grouping (the Total stays the same whatever the grouping): the rows =
     combinations of the report's Text columns from the source (values per column, in column order: 1 column → 5, 2 → 3 × 3,
     3 → 3 × 2 × 2, 4+ → 2 each), measures seeded by the combination; the grouping only buckets them (up to 3 levels,
     rpt-levels-v2), groups in first-appearance order, every group = { level, col, value, rows, leafRows, sub } with its
     subtotal; a group whose rows are all filtered out disappears */
  const FANS = [[], [5], [3, 3], [3, 2, 2]];
  function previewModel(v, sel = null, q = "") {
    const cols = v.columns;
    const levels = levelCols(v);
    const n = levels.length;
    const text = cols.filter((c) => c.kind === "source" && c.dataType === "text");
    const dims = text.length ? text : cols.filter((c) => c.kind === "source" && isDim(c)).slice(0, 1);
    const fan = FANS[dims.length] || dims.map((_, i) => (i < 4 ? 2 : 1));
    const combos = [];
    const walk = (i, acc, seed) => {
      if (i === dims.length) { combos.push(acc); return; }
      dimLabels(v, dims[i], fan[i], seed).forEach((x, j) => walk(i + 1, { ...acc, [dims[i].id]: x }, seed + j + i));
    };
    if (dims.length) walk(0, {}, 0); else combos.push(...[0, 1, 2].map((i) => ({ __row: i })));
    const filtering = scoped(v, sel, q);
    const records = [];
    const rows = combos.map((labels) => {
      const own = { ...labels };
      delete own.__row;
      const key = `${v.source}|${dims.length ? dims.map((d) => labels[d.id]).join("/") : labels.__row}`;
      const base = rowValues(v, key, own);
      const recs = recordsOf(v, key, base);
      records.push(...recs);
      if (!filtering) return base;
      const k = recs.filter((rec) => recMatch(v, rec, sel, q)).length;
      if (!k) return null;
      return k === RECS ? base : rowValues(v, key, own, k / RECS);
    }).filter(Boolean);
    /* rpt-col-hide-v1: a hidden Text column that does not group the rows no longer splits them — rows equal on the shown
       Text columns + the levels are merged (measures re-aggregated, so the Total never changes) */
    const keyCols = dims.filter((d) => !d.hidden || levels.includes(d));
    if (keyCols.length < dims.length) {
      const merged = new Map();
      rows.forEach((r) => { const k = keyCols.map((d) => r[d.id]).join("\u0001"); if (!merged.has(k)) merged.set(k, []); merged.get(k).push(r); });
      rows.splice(0, rows.length, ...[...merged.values()].map((list) => (list.length === 1 ? list[0] : { ...list[0], ...Object.fromEntries(Object.entries(aggregateRows(v, list)).filter(([id]) => isMeasure(colOf(v, id)) || colOf(v, id)?.kind === "calc")) })));
    }
    const build = (l, list) => {
      if (l === n) return { rows: list, leafRows: list };
      const col = levels[l];
      const order = [...new Set(list.map((r) => r[col.id]))];
      const nodes = order.map((g) => {
        const child = build(l + 1, list.filter((r) => r[col.id] === g));
        return { level: l + 1, col, value: g, ...child, sub: aggregateRows(v, child.leafRows) };
      });
      return { nodes, leafRows: list };
    };
    const root = build(0, rows);
    const rowCount = rows.length;
    const total = rowCount && v.totalRow && cols.some(isMeasure) ? aggregateRows(v, rows) : null;
    return { levels, groupCol: levels[0] || null, root, total, rowCount, records };
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
    const cols = shownCols(v);
    const edges = groupEdges(cols);
    const two = cols.some((c) => String(c.header || "").trim());
    const cellBody = (c) => {
      const incl = c.total === "incl" && isMeasure(c);
      const inner = `<span class="e-permits-workplace__th-content e-permits-rpt-table__th"><span class="e-permits-rpt-table__th-text">${incl ? '<span class="e-permits-rpt-table__eyebrow">inclusiv</span>' : ""}<span>${esc(colName(c))}</span></span></span>`;
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
  /* rpt-fold-v1: folded group paths (`/<col>=<value>/…`), for the open report (cleared when another one opens) */
  const FOLD = new Set();
  let foldOf = "";
  const foldBtn = (path, text, shut) => `<button class="btn btn-text-neutral btn-sm btn-icon-only e-permits-rpt-fold" type="button" aria-expanded="${!shut}" aria-label="Grupul „${esc(text)}”" data-tooltip-label="${shut ? "Extinde grupul" : "Restrânge grupul"}" data-rpt-fold="${esc(path)}">${icon(shut ? "chevron-right" : "chevron-bottom", 16)}</button>`;
  const foldHidden = (inPath) => { if (!inPath) return false; let acc = ""; return inPath.split("/").slice(1).some((part) => FOLD.has(acc += `/${part}`)); };
  const foldRows = (html) => html.replace(/<tr class="([^"]*)" data-rpt-in="([^"]*)"|<tr data-rpt-in="([^"]*)"/g, (m, cls, a, b) => {
    const p = (a ?? b).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    return foldHidden(p) ? `${m} hidden` : m;
  });
  /* a click: every report table on the page (the inline preview + „Mărește”) follows, without a redraw (focus stays) */
  function applyFold() {
    document.querySelectorAll(".e-permits-rpt-table").forEach((table) => {
      table.querySelectorAll("tbody tr[data-rpt-in]").forEach((tr) => { tr.hidden = foldHidden(tr.dataset.rptIn); });
      table.querySelectorAll("[data-rpt-fold]").forEach((b) => {
        const shut = FOLD.has(b.dataset.rptFold);
        b.setAttribute("aria-expanded", String(!shut));
        b.dataset.tooltipLabel = shut ? "Extinde grupul" : "Restrânge grupul";
        b.querySelector("use")?.setAttribute("href", `assets/icons/sprite.svg#icon-${shut ? "chevron-right" : "chevron-bottom"}`);
        b.closest("tr")?.classList.toggle("is-folded", shut);
      });
    });
  }
  function tableHtml(v, { link = false, sel = null, q = "" } = {}) {
    const fk = P.id || (P.isNew ? "nou" : "");
    if (foldOf !== fk) { FOLD.clear(); foldOf = fk; }
    const m = previewModel(v, sel, q);
    const cols = shownCols(v);
    const labelCol = cols.find((c) => !isMeasure(c));
    const edges = groupEdges(cols);
    const cell = (c, vals, { label: lbl = "" } = {}) => {
      const isLabel = Boolean(lbl) && c === labelCol;
      const cls = [isMeasure(c) ? "" : "e-permits-rpt-table__text", isLabel ? "e-permits-rpt-table__label" : "", c.total === "incl" && isMeasure(c) ? "is-incl" : "", ...edgeCls(edges, cols.indexOf(c))].filter(Boolean).join(" ");
      const content = isLabel ? `<strong data-cell-tooltip="${esc(lbl)}">${esc(lbl)}</strong>` : lbl && !isMeasure(c) ? "" : fmtCell(v, c, vals?.[c.id]);
      return `<td${cls ? ` class="${cls}"` : ""} data-rpt-cell="${esc(c.id)}">${content}</td>`;
    };
    /* rpt-levels-v1: a subtotal / total row merges the leading text columns into ONE label cell (the label never truncates
       in a narrow first column, the indent has room); measures keep their own cells */
    const lead = cols[0] && !isMeasure(cols[0]) ? Math.max(1, cols.findIndex(isMeasure) === -1 ? cols.length : cols.findIndex(isMeasure)) : 0;
    const sumRow = (vals, lbl) => {
      if (!lead) return cols.map((c) => cell(c, vals, { label: lbl })).join("");
      const last = lead - 1;
      const cls = ["e-permits-rpt-table__text", "e-permits-rpt-table__label", ...edgeCls(edges, 0).filter((x) => x !== "is-gr" && x !== "is-cn"), ...(edges[last]?.[1] ? ["is-gr"] : []), ...(last === cols.length - 1 ? ["is-cn"] : [])].join(" ");
      return `<td class="${cls}" colspan="${lead}" data-rpt-cell="${esc(cols[0].id)}"><strong data-cell-tooltip="${esc(lbl)}">${esc(lbl)}</strong></td>${cols.slice(lead).map((c) => cell(c, vals, { label: lbl })).join("")}`;
    };
    /* rpt-levels-v1: label row → its groups / rows → its subtotal (indented like its label), at every level.
       rpt-fold-v1 (2026-11-11, user): every group row starts with a chevron button (⌄ open / › folded, aria-expanded) that
       hides the group's rows and inner groups; its subtotal stays. `data-rpt-in` = the group path a row sits in (folding
       is applied by `applyFold`, shared by the inline preview and „Mărește”) */
    const nodesHtml = (nodes, base = "") => nodes.map((nd) => {
      const text = `${colName(nd.col)}: ${nd.value}`;
      const path = `${base}/${encodeURIComponent(nd.col.id)}=${encodeURIComponent(nd.value)}`;
      const shut = FOLD.has(path);
      const inner = nd.nodes ? nodesHtml(nd.nodes, path) : nd.rows.map((r) => `<tr data-rpt-in="${esc(path)}">${cols.map((c) => cell(c, r)).join("")}</tr>`).join("");
      return `
      <tr class="e-permits-rpt-table__group is-l${nd.level}${shut ? " is-folded" : ""}" data-rpt-in="${esc(base)}"><th scope="rowgroup" colspan="${cols.length}"><span class="e-permits-rpt-table__gcell">${foldBtn(path, text, shut)}<span class="e-permits-rpt-table__gtext" data-cell-tooltip="${esc(text)}">${esc(text)}</span></span></th></tr>
      ${inner}
      <tr class="e-permits-rpt-table__subtotal is-l${nd.level}" data-rpt-in="${esc(base)}">${sumRow(nd.sub, `Subtotal ${nd.value}`)}</tr>`;
    }).join("");
    const body = m.root.nodes ? foldRows(nodesHtml(m.root.nodes)) : m.root.rows.map((r) => `<tr>${cols.map((c) => cell(c, r)).join("")}</tr>`).join("");
    const foot = m.total ? `<tfoot><tr class="e-permits-rpt-table__total">${sumRow(m.total, "Total")}</tr></tfoot>` : "";
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
     buton de informare”), the column filters above the table, the filters / grouping / total line under it */
  /* the filters above the preview table: „live” = the Text search + the library facet filter (mounted into
     `[data-rpt-fslot]` by mountFilters); „static” (the version window) = read-only: the foot line lists the filters and the
     values applied in the preview (the library chip has no disabled look — a summary reads clearer) */
  function appliedText(v, sel, q = "") {
    const ask = askChips(v);
    return [
      String(q || "").trim() && askText(v).length ? `Căutare: „${String(q).trim()}”` : "",
      ...selEntries(sel).map(([key, values]) => {
        const c = ask.find((x) => x.id === key);
        if (!c) return "";
        return `${chipLabel(v, c)}: ${condKind(v, c) === "date" ? window.GEAPFacetFilter?.dateText?.(values[0], DEMO_TODAY) || values[0] : values.join(", ")}`;
      })
    ].filter(Boolean).join("; ");
  }
  /* rpt-scope-v1 (2026-11-11, user): above the preview table ONE library info notice (blue Mesaj · subtil) — „Grupat după:
     A › B” · „Filtre aplicate: <the fixed conditions, și / sau>” · „Vizibile în raport: <the „Afișează filtru” fields>”,
     one line each, only the lines that apply; nothing → no notice. Replaces the grey „Condiții: …” line. */
  function scopeNotice(v) {
    const lines = [
      levelCols(v).length ? ["Grupat după", levelCols(v).map(colName).join(" › ")] : null,
      condsText(v, condRead) ? ["Filtre aplicate", condsText(v, condRead)] : null,
      askConds(v).length ? ["Vizibile în raport", [...new Set(askConds(v).map((c) => fldLabel(v, c)))].join(", ")] : null
    ].filter(Boolean);
    if (!lines.length) return "";
    return U().renderNotice?.("info", lines.map(([k, t]) => `<span class="e-permits-rpt-scope__line"><strong>${esc(k)}:</strong> ${esc(t)}</span>`).join(""), { role: "note", className: "e-permits-rpt-scope" }) || "";
  }
  function cardHtml(v, { link = false, filters = "static", sel = null, q = "" } = {}) {
    const name = v.names.ro || "Denumirea raportului";
    const info = v.descriptions.ro ? `<button class="e-permits-fo-role-info" type="button" aria-label="Despre raport" data-tooltip-hint="${esc(v.descriptions.ro)}">${icon("circle-info-filled", 16)}</button>` : "";
    const sub = [label(CATEGORIES, v.category), sourceName(v.source)].filter(Boolean).join(" · ");
    const live = filters === "live" && askConds(v).length > 0;
    const filtered = selEntries(sel).length > 0 || Boolean(String(q || "").trim() && askText(v).length);
    let body;
    if (!v.source) body = E()?.render({ title: "Alege sursa de date", text: "Previzualizarea folosește câmpurile sursei, pe date demonstrative.", icon: "page-text", compact: true, bare: true }) || "";
    else if (!v.columns.length) body = E()?.render({ title: "Nicio coloană încă", text: "Adaugă coloane din sursa de date sau calculate: raportul apare aici pe măsură ce îl construiești.", icon: "page-text", compact: true, bare: true }) || "";
    else if (!shownCols(v).length) body = E()?.render({ title: "Toate coloanele sunt ascunse", text: "Afișează cel puțin o coloană din «Coloanele raportului».", icon: "page-text", compact: true, bare: true }) || "";
    else {
      const rows = previewModel(v, sel, q).rowCount;
      body = scopeNotice(v) + (live ? '<div class="e-permits-rpt-fslot" data-rpt-fslot></div>' : "") + (rows
        ? tableHtml(v, { link, sel, q })
        : `<div class="e-permits-rpt-nomatch">${E()?.render({ title: NO_MATCH, text: filtered ? "Niciun rând nu corespunde filtrelor alese. Schimbă sau șterge filtrele." : "Niciun rând nu corespunde condițiilor raportului. Schimbă condițiile din «Filtre».", icon: "search", compact: true, actionHtml: filters === "live" && filtered ? '<button class="btn btn-neutral btn-sm" type="button" data-rpt-filter-clear>Șterge filtrele</button>' : "" }) || ""}</div>`);
    }
    const applied = filters === "live" ? "" : appliedText(v, sel, q);
    /* rpt-scope-v1: the conditions, the asked filters and the grouping live in the notice above the table */
    const foot = [
      applied ? `Aplicate în previzualizare: ${applied}` : "",
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
    const st = ctx ? fx(ctx).state : null;
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
        <div class="e-permits-wid-preview__stage">${cardHtml(v, { link: idp === IDP, filters: ctx ? "live" : "static", sel: st ? st.applied : null, q: st ? st.q : "" })}</div>
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
    const ro = (lblId, lbl, text, hint = "") => full(labelled(lblId, lbl, `<div class="e-permits-cfg-ro" aria-labelledby="${lblId}">${esc(text)}</div>${hint ? `<p class="e-permits-fo-field__hint">${esc(hint)}</p>` : ""}`));
    /* rpt-feature-v1: Nivel is generated (Feature model: „— (generat)”) — Global for the Administrator central, Autoritate for
       anyone else; the central may assign the global report to some authorities (none = all, the „Toate autoritățile” item) */
    const level = ro(`${idp}-level-label`, "Nivel", v.level === "Global" ? "Global" : "Autoritate", v.level === "Global" ? "Generat: raportul Administratorului central este global." : "Generat: raportul se creează la nivelul autorității tale.");
    /* rpt-auth-ms-v1 (2026-11-10, user: „the checklist won't scale” — dozens of issuing + local public authorities): „Toate
       autoritățile” checkbox above the FO multi-select of CAEM (searchable dropdown with checkboxes, chips with × under the
       field, GEAPFormRender `multiselect`); ticked = all (the field disabled, no chips), unticked = pick ≥ 1 */
    const some = authSome(v);
    const msErr = e.authorities || "";
    /* rpt-auth-ms-v2 (user): „Toate autoritățile” = the FIRST item of the dropdown (select-all, indeterminate when some, one chip when all) */
    let ms = window.GEAPFormRender?.fieldHtml({ id: `${idp}-authorities`, type: "multiselect", chipMax: 4, label: "Autoritățile raportului", required: true, options: auths.map(authLabel), allSelected: !some, selectAllLabel: "Toate autoritățile", value: some ? v.authorities.map((id) => authLabel(auths.find((a) => a.id === id) || { name: authName(id), long: "" })) : [], placeholder: "Alege autoritățile", countOne: "autoritate selectată", countMany: "autorități selectate", removeLabel: "Elimină autoritatea", searchLabel: "Caută autoritatea", searchAria: "Caută autoritatea", hint: "Raportul este disponibil autorităților alese; „Toate autoritățile” include și cele adăugate ulterior.", span: 12 }) || "";
    if (msErr) ms = ms.replace("e-permits-fo-subgen-select\" data-fo-subgen-select", "e-permits-fo-subgen-select is-error\" data-fo-subgen-select").replace(/<p class="e-permits-fo-field__hint"[^]*?<\/p>\s*<\/div>\s*$/, "</div>").replace(/<\/div>\s*$/, `${errorHtml(`fo-${idp}-authorities`, msErr)}</div>`);
    const authPicker = v.level === "Global" ? (me.central ? full(`<div class="e-permits-rpt-auths" id="${idp}-authorities" data-rpt-auth-ms>${ms}</div>`) : "")
      : ro(`${idp}-auth-label`, "Autoritate", v.authorities.map((id) => `${authName(id)} · ${D().authorities.find((a) => a.id === id)?.long || ""}`).join(", ") || "—");
    const fromPicker = idp === IDP && P.isNew && cloneSources().length
      ? section("Punctul de plecare", grid(selectField(`${idp}-from`, "data-rpt-from", "Raportul sursă", cloneSources().map((r) => [r.id, `${r.id} · ${r.config.names.ro} · ${label(CATEGORIES, r.config.category)}`]), P.from, { span: 12, placeholder: "Raport gol", hint: P.from ? "Copia primește coloanele, formulele și structura raportului sursă, în aceeași categorie; o modifici independent." : "Opțional: alege un raport existent ca să-l clonezi." })))
      : "";
    /* Feature: „clonarea se face doar în aceeași categorie” — a copy keeps the source's category (read-only) */
    const category = P.isNew && P.from
      ? ro(`${idp}-category-label`, "Categoria raportului", label(CATEGORIES, v.category), "Copia rămâne în categoria raportului sursă.")
      : full(labelled(`${idp}-category-label`, "Categoria raportului", richSelect(`${idp}-category`, "category", CATEGORIES, CATEGORY_ICON, v.category, { error: e.category, lblId: `${idp}-category-label` }), { required: true }));
    return `
      ${fromPicker}
      ${section("Categoria și sursa de date", grid(
        category,
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
  /* rpt-handle-v1 (2026-11-10, user: the ˄ ˅ stack „looks awful”): the reorder control on the LEFT = ONE focusable drag
     handle (library `button.btn.btn-text-neutral.btn-sm.btn-icon-only.e-permits-ekcfg-order__handle.e-permits-rpt-handle`, aria-label „Mută <nume>”, Small tooltip „Trage sau
     folosește săgețile ↑ ↓”) + the position number; drag it, or Arrow Up / Down while it has focus (same FLIP slide + live
     line, focus stays on it). `kind` = col · cond · level */
  const moverLead = (n, { kind, id, what, label = "Poziția" }) => `<span class="e-permits-ekcfg-order e-permits-rpt-order"><button class="btn btn-text-neutral btn-sm btn-icon-only e-permits-ekcfg-order__handle e-permits-rpt-handle" type="button" aria-label="Mută ${what}" aria-keyshortcuts="ArrowUp ArrowDown" data-tooltip-label="Trage sau folosește săgețile ↑ ↓" data-rpt-handle="${kind}|${esc(id)}">${icon("drag", 16)}</button><span class="e-permits-ekcfg-order__n" aria-label="${label} ${n}">${n}</span></span>`;
  function columnMeta(v, c) {
    const out = [];
    if (c.kind === "source") out.push(`Câmp: ${fieldOf(v.source, c.field)?.label || "—"}`);
    if (c.kind === "calc") {
      const f = formulaOf(c.formula);
      out.push(f ? `${f.names.ro}${f.operands.length ? ` · ${f.operands.map((o) => `${o.key} = ${colOf(v, c.operands?.[o.key]) ? colName(colOf(v, c.operands[o.key])) : "—"}`).join(", ")}` : ""}` : "Formula: —");
    }
    out.push(label(DATA_TYPES, c.dataType) || "—");
    if (String(c.header || "").trim()) out.push(`Antet comun: ${c.header.trim()}`);
    if (c.hidden) out.push("Ascunsă");
    return out.map(esc);
  }
  function stepColumns(v, e, idp, { jump = false } = {}) {
    const cols = v.columns;
    const last = cols.length - 1;
    /* rpt-group-v1 → rpt-levels-v2: an icon-only toggle on every groupable Text column, before ↑ ↓ 🗑: a click adds the
       column as the next grouping level (pressed = neutral pressed fill + dark icon + the level number), the pressed one
       removes its level; a 4th level / the last free Text column = disabled with the reason as the Small tooltip */
    const groupBtn = (c) => {
      if (!groupable(c)) return "";
      const lv = v.groupBy.indexOf(c.id) + 1;
      const why = lv ? "" : groupBlock(v);
      /* a toggle keeps its name; aria-pressed says it is on (the tooltip says the level and what a click does) */
      const tip = why ? ` aria-disabled="true" data-tooltip-reason="${esc(why)}"` : ` data-tooltip-label="${lv ? `Nivelul ${lv} de grupare · apasă ca să-l elimini` : `Grupează rândurile după această coloană (nivelul ${v.groupBy.length + 1})`}"`;
      return `<button class="btn btn-text-neutral btn-sm btn-icon-only e-permits-rpt-group-btn" type="button" aria-pressed="${lv > 0}" aria-label="Grupează rândurile după „${esc(colName(c))}”${lv ? ` (nivelul ${lv})` : ""}"${tip} data-rpt-col-group="${esc(c.id)}">${lv ? `<span class="e-permits-rpt-group-btn__n" aria-hidden="true">${lv}</span>` : icon(GROUP_ICON, 16)}</button>`;
    };
    /* „Adaugă coloană ▾” (rpt-add-menu-v1, 2026-11-09, user; Airtable / Notion / Retool „add field → choose type”): ONE
       library secondary button (plus + label + chevron) opening the stack dropdown; items = icon + kind + one short line */
    const ADD_ITEMS = [
      ["source", "data-access", "Din sursa de date", "Un câmp din dicționarul sursei de date."],
      ["calc", "calculator", "Calculată", "Rezultatul unei formule din setul de formule."]
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
    /* rpt-col-group-note-v1 (user): a column the rows are grouped by says so after its name — „· Grupare” (one level) /
       „· Grupare 2” (several), secondary 14/20 like the meta text */
    const groupNote = (v2, c) => { const lv = levelCols(v2).findIndex((x) => x.id === c.id) + 1; return lv ? `<span class="e-permits-rpt-col-note"> · Grupare${levelCols(v2).length > 1 ? ` ${lv}` : ""}</span>` : ""; };
    const list = cols.length ? `<div class="e-permits-stack e-permits-reg-editor__stack"><ul class="e-permits-stack__list" role="list" data-rpt-cols>${cols.map((c, i) => {
      const err = e[`col.${c.id}`];
      const [kt] = KIND_TAG[c.kind] || KIND_TAG.source;
      return (A().renderStackItem?.({
        plainTitle: colName(c),
        /* rpt-col-item-v3 (2026-11-10, user): the title line = the name (+ „· Grupare N” for a grouping column, rpt-col-group-note-v1) („De corectat” in the error colour when
           invalid); the kind („Din sursă” / „Calculată”) and „Inclusiv” go to the meta line after the data type; the
           grouping level shows on the toggle */
        title: `${esc(colName(c))}${groupNote(v, c)}${err ? '<span class="e-permits-rpt-col-note is-error"> · De corectat</span>' : ""}`,
        leadHtml: moverLead(i + 1, { kind: "col", id: c.id, what: `„${esc(colName(c))}”` }),
        rowAttrs: `data-rpt-col="${esc(c.id)}" data-index="${i}" tabindex="0" data-stack-row-open aria-haspopup="dialog" aria-label="Coloana ${esc(colName(c))}, poziția ${i + 1} — deschide setările"`,
        badges: [],
        meta: (() => { const m = columnMeta(v, c); m.splice(2, 0, ...[kt, c.total === "incl" && isMeasure(c) ? "Inclusiv" : ""].filter(Boolean).map(esc)); return m; })(),
        /* rpt-col-list-v4 (user: „bring back arrows”): the original controls — ↑ / ↓ (disabled at the ends) + the red trash */
        /* rpt-col-hide-v1 (2026-11-11, user): [group] · eye (Ascunde / Afișează coloana) · trash, one centre line */
        actionsHtml: `
          ${groupBtn(c)}
          <button class="btn btn-text-neutral btn-sm btn-icon-only e-permits-rpt-eye-btn" type="button" aria-label="${c.hidden ? "Afișează" : "Ascunde"} coloana „${esc(colName(c))}”" data-tooltip-label="${c.hidden ? "Afișează coloana" : "Ascunde coloana"}" data-rpt-col-hide="${esc(c.id)}">${icon(c.hidden ? "eye-closed" : "eye-open", 16)}</button>
          <button class="btn btn-text-destructive btn-sm btn-icon-only" type="button" aria-label="Elimină coloana „${esc(colName(c))}”" data-tooltip-label="Elimină coloana" data-rpt-col-remove="${esc(c.id)}">${icon("delete", 16)}</button>`
      }) || "").replace('<li class="e-permits-stack__item', `<li draggable="true" class="e-permits-stack__item${c.hidden ? " is-col-hidden" : ""}`);
    }).join("")}</ul></div>
      ${add()}`
      : `${E()?.render({ title: "Nicio coloană încă", text: v.source ? "Adaugă coloane din dicționarul sursei de date sau calculate cu o formulă." : "Alege mai întâi sursa de date (pasul 1), apoi adaugă coloanele.", icon: "page-text", compact: true, actionHtml: add() }) || ""}${e.columns ? errorHtml(`${idp}-columns`, e.columns) : ""}`;
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
  /* rpt-cond-v1 (2026-11-10, PO Alexandru: inline filters with „și / sau”; Notion / Airtable / Linear / Metabase): „Filtre” =
     the condition builder. Each item = the connector (row 1 „Unde” code token, rows 2+ the „și / sau” token select — ONE
     conjunction per level: changing one changes all at that level) 8 left of the condition, which sits on the shared hover
     surface (padding 16, r12): order lead (drag handle + position) · Câmp (fo-select) · Condiție (fo-select, by the field's
     kind) · Valoare (multi-value menu / text / number / date picker(s) / N zile) · „Afișează filtru” (checkbox) · ↑ ↓ 🗑.
     „Adaugă grup de condiții” = a bordered sub-block one level deep with its own connector (mixing și / sau). A condition with
     „Afișează filtru” has no value: it becomes a chip above the preview; the others restrict the report („Condiții: …”). */
  const cid = (idp, c, part) => `${idp}-cf-${c.id}-${part}`;
  const condErr = (e, c) => e[`filter.${c.id}.field`] || e[`filter.${c.id}.value`] || "";
  function connector(idp, items, i, conj, scope) {
    if (i === 0) return '<code class="e-permits-doc-kw">Unde</code>';
    return `<div class="e-permits-doc-kwselect" data-fo-list-min="120">${U().renderFoSelectControl?.({ id: `${idp}-conj-${scope}-${i}`, attrs: `data-rpt-conj="${esc(scope)}" aria-label="Combinarea condițiilor${scope === "top" ? "" : " din grup"}"`, optionsHtml: [["and", "și"], ["or", "sau"]].map(([k, l]) => `<option value="${k}"${conj === k ? " selected" : ""}>${l}</option>`).join("") }) || ""}</div>`;
  }
  function datePick(id, attr, iso, lbl) {
    const [y, m, d] = iso ? iso.split("-") : [];
    const view = (iso || DEMO_TODAY).split("-");
    return `
      <div class="date-picker__field" data-date-picker data-type="default" data-locale="ro" data-selected="${esc(iso)}" data-today="${DEMO_TODAY}" data-year="${Number(view[0])}" data-month="${Number(view[1]) - 1}">
        <div class="e-permits-fo-input e-permits-fo-input--with-action">
          <input id="${id}" type="text" class="js-date-picker-input" value="${iso ? `${d}/${m}/${y}` : ""}" placeholder="ZZ/LL/AAAA" aria-label="${esc(lbl)}" autocomplete="off" ${attr}>
          <button type="button" class="e-permits-fo-input__icon-button js-date-picker-toggle" aria-label="Alege data" aria-controls="${id}-panel" aria-expanded="false">${icon("calendar")}</button>
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
  }
  const textInput = (id, attr, value, lbl, { placeholder = "", numeric = false, suffix = "", error = false } = {}) => `<div class="e-permits-fo-input${error ? " is-error" : ""}"><input id="${id}" type="text" value="${esc(value)}" aria-label="${esc(lbl)}" autocomplete="off"${placeholder ? ` placeholder="${esc(placeholder)}"` : ""}${numeric ? ' inputmode="decimal"' : ""}${error ? ' aria-invalid="true"' : ""} ${attr}>${suffix ? `<span class="e-permits-fo-input__suffix">${esc(suffix)}</span>` : ""}</div>`;
  /* the values of a list field = the rich-select box with a checkbox menu (the menu stays open while choosing) */
  const multiText = (vals) => (vals.length ? vals.join(", ") : "Alege valorile");
  function multiValues(id, c, f, error) {
    return `
      <div class="e-permits-fo-select e-permits-stack__menu-wrap e-permits-rpt-rich e-permits-rpt-multi${error ? " is-error" : ""}">
        <button class="e-permits-fo-select__button" type="button" id="${id}" aria-haspopup="menu" aria-expanded="false" aria-controls="${id}-menu" aria-label="Valori: ${esc(multiText(c.values))}" data-stack-menu-trigger${error ? ' aria-invalid="true"' : ""}>
          <span class="e-permits-fo-select__value${c.values.length ? "" : " e-permits-fo-select__value--placeholder"}" data-cell-tooltip data-rpt-cv-text>${esc(multiText(c.values))}</span>
          ${icon("chevron-bottom", 20)}
        </button>
        <ul class="e-permits-fo-intent-menu e-permits-stack__menu e-permits-rpt-rich__menu e-permits-rpt-multi__menu" id="${id}-menu" role="menu" aria-label="Valorile câmpului ${esc(f.label)}" hidden data-stack-menu>
          ${f.values.map((x) => { const on = c.values.includes(x); return `<li role="none"><button class="e-permits-fo-intent-menu__item e-permits-rpt-multi__item" type="button" role="menuitemcheckbox" aria-checked="${on}" data-rpt-cv="${esc(c.id)}" data-value="${esc(x)}"><span class="checkbox checkbox--medium" aria-hidden="true"><input class="checkbox-input" type="checkbox" tabindex="-1"${on ? " checked" : ""}><span class="checkbox-custom" aria-hidden="true"></span></span><span class="e-permits-rpt-multi__label">${esc(x)}</span></button></li>`; }).join("")}
        </ul>
      </div>`;
  }
  function condValue(v, c, idp, err) {
    const k = condKind(v, c);
    const op = opOf(v, c);
    const f = fieldOf(v.source, c.field);
    const id = cid(idp, c, "value");
    const at = (part) => `data-rpt-cf="${esc(c.id)}|${part}"`;
    if (!k) return { html: `<div class="e-permits-doc-val is-empty e-permits-rpt-cond__slot" aria-hidden="true"><span>Valoare</span></div>` };
    if (asking(v, c)) return { html: `<div class="e-permits-doc-val is-empty e-permits-rpt-cond__slot" id="${id}" data-cell-tooltip="Valoarea se alege la generarea raportului."><span>Se alege în raport</span></div>` };
    if (k === "list") return { html: multiValues(id, c, f, err) };
    if (k === "text") return { html: textInput(id, at("value"), c.value, "Textul căutat", { placeholder: "Text", error: err }) };
    if (k === "number") {
      if (op === "between") return { wide: true, html: `<div class="e-permits-rpt-cond__pair">${textInput(id, at("value"), c.value, "De la", { placeholder: "De la", numeric: true, error: err })}${textInput(cid(idp, c, "value2"), at("value2"), c.value2, "Până la", { placeholder: "Până la", numeric: true, error: err })}</div>` };
      return { html: textInput(id, at("value"), c.value, "Valoarea", { placeholder: "Valoare", numeric: true, error: err }) };
    }
    if (op === "last") return { html: textInput(id, at("value"), c.value, "Numărul de zile", { placeholder: "N", numeric: true, suffix: "zile", error: err }) };
    if (op === "between") return { wide: true, html: `<div class="e-permits-rpt-cond__pair">${datePick(id, at("value"), c.value, "De la")}${datePick(cid(idp, c, "value2"), at("value2"), c.value2, "Până la")}</div>` };
    return { html: datePick(id, at("value"), c.value, op === "before" ? "Înainte de" : "După") };
  }
  function condRow(v, e, idp, c, i, last) {
    const k = condKind(v, c);
    const fe = e[`filter.${c.id}.field`];
    const ve = e[`filter.${c.id}.value`];
    const fields = fieldsOf(v.source);
    const name = c.field ? fldLabel(v, c) : `condiția ${i + 1}`;
    const val = condValue(v, c, idp, Boolean(ve));
    const ops = asking(v, c) ? (COND_OPS[k] || []).filter(([o]) => ASK_OPS[k].includes(o)) : COND_OPS[k] || [];
    const opSel = U().renderFoSelectControl?.({ id: cid(idp, c, "op"), attrs: `data-rpt-cf="${esc(c.id)}|op" aria-label="Condiția"`, optionsHtml: k ? ops.map(([o, l]) => `<option value="${o}"${opOf(v, c) === o ? " selected" : ""}>${esc(l)}</option>`).join("") : '<option value="" selected>Condiție</option>', disabled: !k || ops.length < 2 }) || "";
    const fieldSel = U().renderFoSelectControl?.({ id: cid(idp, c, "field"), attrs: `data-rpt-cf="${esc(c.id)}|field" aria-label="Câmpul"`, optionsHtml: `<option value=""${c.field ? "" : " selected"}>Alege câmpul</option>${fields.map((f) => `<option value="${esc(f.key)}"${f.key === c.field ? " selected" : ""}>${esc(f.label)}</option>`).join("")}`, error: Boolean(fe) }) || "";
    const ask = U().renderCheckOption?.({ label: "Afișează filtru", plain: true, checked: asking(v, c), disabled: !canAsk(v, c), reason: c.field ? NO_ASK : "Alege mai întâi câmpul.", attrs: `data-rpt-cond-ask="${esc(c.id)}"` }) || "";
    return `
      <div class="e-permits-rpt-cond e-permits-hover-surface is-hover-within${fe || ve ? " has-error" : ""}" role="group" aria-label="Condiția ${i + 1}${c.field ? `: ${esc(fldLabel(v, c))}` : ""}">
        <div class="e-permits-rpt-cond__head">
          <span class="e-permits-rpt-cond__lead">${moverLead(i + 1, { kind: "cond", id: c.id, what: `condiția „${esc(name)}”` })}</span>
          <span class="e-permits-rpt-cond__ask">${ask}</span>
          <span class="e-permits-rpt-cond__actions"><button class="btn btn-text-destructive btn-sm btn-icon-only" type="button" aria-label="Elimină condiția „${esc(name)}”" data-tooltip-label="Elimină condiția" data-rpt-cond-remove="${esc(c.id)}">${icon("delete", 16)}</button></span>
        </div>
        <div class="e-permits-rpt-cond__cell e-permits-rpt-cond__field">${fieldSel}${fe ? errorHtml(cid(idp, c, "field"), fe) : ""}</div>
        <div class="e-permits-rpt-cond__cell e-permits-rpt-cond__op">${opSel}</div>
        <div class="e-permits-rpt-cond__cell e-permits-rpt-cond__val${val.wide ? " is-wide" : ""}">${val.html}${ve ? errorHtml(cid(idp, c, "value"), ve) : ""}</div>
      </div>`;
  }
  function condItems(v, e, idp, items, conj, scope) {
    const last = items.length - 1;
    return items.map((x, i) => `
      <li class="e-permits-rpt-cond-item" draggable="true" data-rpt-ci="${esc(x.id)}" data-scope="${esc(scope)}" data-index="${i}">
        <div class="e-permits-rpt-cond-item__conn">${connector(idp, items, i, conj, scope)}</div>
        ${x.group ? `
          <div class="e-permits-rpt-cgroup" role="group" aria-label="Grup de condiții ${i + 1}">
            <div class="e-permits-rpt-cgroup__head">
              ${moverLead(i + 1, { kind: "cond", id: x.id, what: `grupul ${i + 1}` })}<span class="e-permits-rpt-cgroup__title">Grup de condiții</span>
              <span class="e-permits-rpt-cond__actions"><button class="btn btn-text-destructive btn-sm btn-icon-only" type="button" aria-label="Elimină grupul ${i + 1}" data-tooltip-label="Elimină grupul" data-rpt-cond-remove="${esc(x.id)}">${icon("delete", 16)}</button></span>
            </div>
            <ol class="e-permits-rpt-conds" role="list" data-rpt-conds="${esc(x.id)}">${condItems(v, e, idp, x.rules, x.conj, x.id)}</ol>
            <div class="e-permits-rpt-cgroup__add"><button class="btn btn-text-primary btn-sm" type="button" data-rpt-cond-add="${esc(x.id)}">${icon("plus-large", 16)}<span>Adaugă condiție</span></button></div>
          </div>` : condRow(v, e, idp, x, i, last)}
      </li>`).join("");
  }
  function filtersSection(v, e, idp) {
    const off = v.source ? "" : ' aria-disabled="true" data-tooltip-reason="Alege mai întâi sursa de date."';
    const n = flatConds(v).length;
    /* rpt-cond-v2 (user): „Adaugă grup de condiții” (text button) only once there are ≥ 2 conditions */
    const add = `<div class="e-permits-rpt-conds__add"><button class="btn btn-secondary btn-sm" type="button" data-rpt-cond-add="top"${off}>${icon("plus-large", 16)}<span>Adaugă condiție</span></button>${n >= 2 ? `<button class="btn btn-text-primary btn-sm" type="button" data-rpt-group-add${off}>${icon("plus-large", 16)}<span>Adaugă grup de condiții</span></button>` : ""}</div>`;
    const body = v.filters.length
      ? `<div class="e-permits-rpt-builder"><ol class="e-permits-rpt-conds" role="list" aria-label="Condițiile raportului" data-rpt-conds="top">${condItems(v, e, idp, v.filters, v.filterConj, "top")}</ol>${add}</div>`
      : E()?.render({ title: "Nicio condiție", text: "Adaugă o condiție ca să limitezi rândurile raportului, de ex. «Canal de depunere este Online».", icon: "filter-lines", compact: true, actionHtml: add }) || "";
    return `
      <section class="e-permits-dosar-profil__section e-permits-stack-section" aria-labelledby="${idp}-flt-title" id="${idp}-filters">
        <div class="e-permits-dosar-profil__section-heading">
          <h2 class="e-permits-dosar-profil__section-title" id="${idp}-flt-title">Filtre</h2>
          <span class="e-permits-dosar-profil__section-meta" aria-live="polite">${esc(plural(n, "condiție", "condiții"))}</span>
        </div>
        ${v.filters.length ? `<div class="e-permits-ntpl-card">${body}</div>` : body}
      </section>`;
  }
  /* why the rows cannot get another grouping level (rpt-levels-v2): "" = they can */
  function groupBlock(v) {
    const text = v.columns.filter(groupable).length;
    if (v.groupBy.length >= MAX_LEVELS) return "Poți grupa pe cel mult 3 niveluri.";
    if (text < 2) return "Adaugă încă o coloană Text: rândurile se grupează după una și se listează după cealaltă.";
    if (v.groupBy.length + 1 >= text) return "Lasă o coloană Text negrupată: după ea se listează rândurile.";
    return "";
  }
  /* „Gruparea rândurilor” (rpt-levels-v1 910b8635 → v2) = the ORDERED list of the levels (Salesforce „Group rows”): each
     level = a row on the shared hover surface (order lead = drag handle + the level number, the column name, ↑ ↓ + the red
     trash), indented 16 per level like the table's group rows; „Elimină gruparea” clears all. The profile adds levels from
     the column list (the toggle); the create sheet's Structură step (no column list there) adds them with „Adaugă un nivel” */
  function groupSection(v, e, idp, { jump = false } = {}) {
    const levels = levelCols(v);
    const why = groupBlock(v);
    const last = levels.length - 1;
    const list = levels.length ? `<ol class="e-permits-rpt-levels" role="list" aria-label="Nivelurile de grupare" data-rpt-levels>${levels.map((c, i) => `
      <li class="e-permits-rpt-level e-permits-hover-surface is-hover-within is-l${i + 1}" draggable="true" data-rpt-level="${esc(c.id)}" data-index="${i}">
        ${moverLead(i + 1, { kind: "level", id: c.id, what: `nivelul „${esc(colName(c))}”`, label: "Nivelul" })}
        <span class="e-permits-rpt-level__name" data-cell-tooltip>${esc(colName(c))}</span>
        <span class="e-permits-rpt-level__actions">
          <button class="btn btn-text-destructive btn-sm btn-icon-only" type="button" aria-label="Elimină nivelul „${esc(colName(c))}” din grupare" data-tooltip-label="Elimină nivelul" data-rpt-level-remove="${esc(c.id)}">${icon("delete", 16)}</button>
        </span>
      </li>`).join("")}</ol>` : "";
    const free = v.columns.filter((c) => groupable(c) && !v.groupBy.includes(c.id));
    const add = jump || (why && levels.length) ? "" : selectField(`${idp}-groupby`, "data-rpt-level-add", levels.length ? "Adaugă un nivel" : "Grupează rândurile după", free.map((c) => [c.id, colName(c)]), "", { span: 12, placeholder: why ? "Nu se mai pot adăuga niveluri" : "Alege coloana", hint: why || (levels.length ? `Nivelul ${levels.length + 1}: grupează rândurile din fiecare grup.` : "Opțional. Fiecare grup are un rând de subtotal. Poți grupa pe cel mult 3 niveluri, și din lista coloanelor (pasul 2)."), error: e.groupBy, disabled: Boolean(why) });
    const empty = jump && !levels.length ? `<p class="e-permits-rpt-group-sum__text">${why && v.columns.filter(groupable).length < 2 ? "Fără grupare. Adaugă cel puțin două coloane Text: rândurile se grupează după una și se listează după cealaltă." : `Fără grupare. Apasă ${icon(GROUP_ICON, 16)} la o coloană Text din «Coloanele raportului»: fiecare apăsare adaugă un nivel (cel mult 3), fiecare grup primește un subtotal.`}</p>` : "";
    const clear = levels.length ? `<button class="btn btn-text-destructive btn-sm" type="button" data-rpt-group-clear>${icon("delete", 16)}<span>Elimină gruparea</span></button>` : "";
    const body = `<div class="e-permits-rpt-group">${list}${empty}${add ? grid(add) : ""}${clear ? `<div class="e-permits-rpt-group__foot">${clear}</div>` : ""}</div>`;
    return section("Gruparea rândurilor", body, { meta: levels.length ? plural(levels.length, "nivel", "niveluri") : "", id: `${idp}-group-title` });
  }
  function stepStructure(v, e, idp, { jump = false } = {}) {
    const measures = v.columns.some(isMeasure);
    return `
      ${groupSection(v, e, idp, { jump })}
      ${filtersSection(v, e, idp)}
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
        ["Descriere", d(v.descriptions.ro)], ["Categoria", d(label(CATEGORIES, v.category))], ["Sursa de date", d(sourceName(v.source))], ["Nivel", d(v.level === "Global" ? "Global" : "Autoritate")],
        /* changes-reveal-v1: the authorities are their own row, summarised (a long list only in the field itself) */
        ["Autoritățile raportului", d(authSummary(v))]
      ],
      columns: v.columns.length ? v.columns.map((c, i) => [`${i + 1}. ${colName(c)}`, esc([KIND_TAG[c.kind]?.[0], ...columnMeta(v, c).map((x) => x.replace(/&[^;]+;/g, (m) => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" }[m] || m))), c.total === "incl" && isMeasure(c) ? "Inclusiv" : ""].filter(Boolean).join(" · "))]) : [["Coloane", dash]],
      structure: [
        ["Gruparea rândurilor", levelCols(v).length ? esc(`${levelCols(v).map((c, i) => `${i + 1}. ${colName(c)}`).join(" › ")}, cu subtotal ${levelCols(v).length > 1 ? "la fiecare nivel" : "pe grup"}`) : "Fără grupare"],
        ["Filtre", flatConds(v).length ? esc([condsText(v) ? `Condiții: ${condsText(v)}` : "", askConds(v).length ? `La generare: ${askConds(v).map((c) => chipLabel(v, c)).join(", ")}` : "", flatConds(v).some((c) => !condComplete(v, c)) ? "Condiții incomplete" : ""].filter(Boolean).join(" · ")) : "Fără filtre"],
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
      /* rpt-stack-list-v1: Categorie = the short Statistic / Tabelar (meta line + facet); descriere = the RO description */
      id: r.id, denumire: r.config.names.ro, categorie: CATEGORY_SHORT[r.config.category] || "", descriere: String(r.config.descriptions?.ro || "").trim(), sursa: sourceName(r.config.source),
      nivel: r.config.level, autoritate: r.config.authorities.map(authName).join(", "),
      statut: r.status, tone: STATUS_TONE[r.status] || "neutral", versiune: lv ? String(lv.version) : "", nepublicat: unpublished(r), modificat: r.updatedAt || "",
      /* rpt-facets-v1 (2026-11-11, user): Creat de · Autoritate (a Global report for every authority matches all of them) ·
         Serviciu (the services named by the report's fixed conditions) */
      creat: r.createdBy || "",
      autoritati: r.config.level === "Global" && !r.config.authorities.length ? D().authorities.map((a) => a.name) : r.config.authorities.map(authName),
      servicii: [...new Set(flatConds(r.config).filter((c) => c.field === "serviciu" && fixed(r.config, c) && opOf(r.config, c) === "is").flatMap((c) => c.values))],
      r
    };
  };
  function registryDb() {
    if (!S.data) load().then(() => { if (document.querySelector(`[data-workplace][data-registry-kind="${KIND}"]`)) refreshList(); });
    const me = who();
    return {
      kind: KIND,
      fixedWidths: true,
      fieldCount: 8,
      /* rpt-page-v1 (2026-11-11, user): the shared BO pager, 20 a page („1–20 din 46”) */
      pageSizes: [20, 40, 60],
      /* rpt-sort-v1: newest change first; „Sortează” = Ultima modificare · Denumire · ID (registry `sort`) */
      defaultSort: "modificat",
      defaultSortDirection: "desc",
      columns: {
        id: { label: "ID", width: 112, sortable: true },
        denumire: { label: "Denumire", width: 320, sortable: true },
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
          /* rpt-stack-list-v1 (2026-11-11, Galina on RPT-01 15189:1665): no category grouping, no Categorie / Sursa de date
             columns — the rows are the shared stacked list (`stackItem` below); the table columns stay for sort / export */
          searchPlaceholder: "Caută după ID, denumire sau descriere",
          columns: ["id", "denumire", "nivel", "statut", "versiune", "modificat", ...(me.has ? ["actiuni"] : [])],
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
    /* fixed: the list scrolls inside the registry's table wrap, an in-flow menu would be clipped */
    return html ? html.replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>") : "";
  }
  const twoLines = (top, meta) => `<span class="e-permits-workplace__date-stack"><span>${top}</span><span class="e-permits-workplace__date-meta">${meta}</span></span>`;
  /* „modificări nepublicate” = the clickable pending status (every config object, components.md) → the shared dialog */
  const pendingHtml = (row) => (HOOKS.pending ? A().renderHeaderStatus?.("Modificări nepublicate", "warning", `data-rpt-pending="${esc(row.id)}" aria-haspopup="dialog" data-tooltip-text="Vezi modificările" aria-label="Vezi modificările nepublicate ale ${esc(row.id)}"`) || "modificări nepublicate" : "modificări nepublicate");
  /* rpt-details-line-v1 (2026-11-11, user): status tag on the title line; version · level · edited in the details line,
     worded as the other stacked lists („Editat <dată>, <oră> · <cine>”, tariffs / templates); right side = only ⋮ */
  const scopeText = (row) => (row.autoritate ? `${row.nivel}: ${row.autoritate}` : row.nivel);
  const stackItem = (row) => {
    const details = [
      esc(row.id), esc(row.categorie),
      row.versiune ? `v${esc(row.versiune)}` : "nepublicat",
      esc(scopeText(row)),
      row.nepublicat ? pendingHtml(row) : "",
      row.modificat ? `Editat ${esc(longDate(row.modificat))}, ${esc(time(row.modificat))}${row.r.updatedBy ? ` · ${esc(row.r.updatedBy)}` : ""}` : ""
    ].filter(Boolean);
    return {
      plainTitle: row.denumire,
      title: esc(row.denumire),
      badges: [tag(row.statut, row.tone)],
      /* the description (max 2 lines + the Small tooltip when cut), then the details; none → only the details */
      meta: row.descriere ? [`<span class="e-permits-rpt-list__desc" data-cell-tooltip="${esc(row.descriere)}">${esc(row.descriere)}</span>`] : details,
      meta2: row.descriere ? details : null,
      actionsHtml: who().has ? rowMenu(row) : ""
    };
  };
  window.GEAPShellRegistries = window.GEAPShellRegistries || {};
  window.GEAPShellRegistries[KIND] = {
    build: registryDb,
    get facets() {
      return [
        { key: "categorie", label: "Categorie", get: (row) => row.categorie },
        { key: "nivel", label: "Nivel", get: (row) => row.nivel },
        { key: "statut", label: "Statut", get: (row) => row.statut },
        { key: "creat", label: "Creat de", search: true, get: (row) => row.creat },
        { key: "autoritate", label: "Autoritate", search: true, get: (row) => row.autoritati },
        { key: "serviciu", label: "Serviciu", get: (row) => row.servicii }
      ];
    },
    searchText: (row) => `${row.id} ${row.denumire} ${fold(row.denumire)} ${row.descriere} ${fold(row.descriere)}`,
    stackItem,
    stackClass: "e-permits-rpt-list",
    sort: {
      keys: [{ value: "modificat", label: "Ultima modificare" }, { value: "denumire", label: "Denumire" }, { value: "id", label: "ID" }],
      orders: (key) => ({
        modificat: [{ value: "desc", label: "Cele mai noi întâi" }, { value: "asc", label: "Cele mai vechi întâi" }],
        denumire: [{ value: "asc", label: "A–Z" }, { value: "desc", label: "Z–A" }],
        id: [{ value: "asc", label: "Crescător" }, { value: "desc", label: "Descrescător" }]
      })[key] || []
    },
    sortValue: (row, key) => String(SORT[key]?.(row) ?? row[key] ?? ""),
    filterToken: () => true,
    rowClass: (row) => (row.statut === "Dezactivat" ? "is-inactive" : ""),
    renderCell: (row, key) => {
      switch (key) {
        case "id": return `<span data-cell-tooltip="${esc(row.id)}">${esc(row.id)}</span>`;
        case "denumire": return `<span data-cell-tooltip="${esc(row.denumire)}">${esc(row.denumire)}</span>`;
        case "nivel": return !row.autoritate ? esc(row.nivel) : twoLines(esc(row.nivel), `<span data-cell-tooltip="${esc(row.autoritate)}">${esc(row.autoritate)}</span>`);
        case "statut": return tag(row.statut, row.tone);
        /* „modificări nepublicate” = the clickable pending status (every config object, components.md) → the shared dialog */
        case "versiune": return row.versiune ? (row.nepublicat ? twoLines(esc(row.versiune), pendingHtml(row)) : esc(row.versiune)) : twoLines(dash, "nepublicat");
        case "modificat": return row.modificat ? twoLines(esc(longDate(row.modificat)), esc(`${time(row.modificat)} · ${row.r.updatedBy || ""}`)) : dash;
        case "actiuni": return rowMenu(row);
        default: return esc(row[key] ?? "") || dash;
      }
    },
    openRow: (id) => openProfile(id, "configurare"),
    rowLabel: (row) => `${row.id}, ${row.denumire} — deschide raportul`,
    /* boxed (registry-stack-v1): the stacked list has no table cell around it → the normal dashed empty state */
    emptyHtml: ({ query, filtered, boxed = false }) => {
      const bare = !boxed;
      if (!who().has) return E()?.render({ title: DENIED, icon: "lock", bare });
      if (!S.data) return E()?.render({ title: "Se încarcă rapoartele…", loading: true, bare });
      if (query || filtered) return E()?.render({ title: NO_MATCH, text: "Caută după ID, denumire sau descriere, sau schimbă filtrele.", icon: "search", bare, actionHtml: filtered ? '<button class="btn btn-neutral btn-sm" type="button" data-filter-clear-all>Șterge filtrele</button>' : "" });
      return E()?.render({ title: EMPTY_LIST, text: canCreate() ? "Creează primul raport cu „Raport nou”." : "", icon: "page-text", bare, actionHtml: canCreate() ? '<button class="btn btn-primary btn-sm" type="button" data-rpt-new>Raport nou</button>' : "" });
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
    const lines = rows.map((r) => [r.id, r.denumire, label(CATEGORIES, r.r.config.category), r.sursa, r.autoritate ? `${r.nivel} ${r.autoritate}` : r.nivel, r.statut, r.versiune || "-", r.modificat ? `${longDate(r.modificat)} ${time(r.modificat)}` : "-"]);
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
  const journalCtx = (r) => ({ module: "BackOffice", authority: r.config.authorities.map(authName).join(", "), objectType: "Raport", objectId: r.id, objectVersion: lastVersion(r) ? `versiunea ${lastVersion(r).version}` : "ciornă", related: [] });
  function audit(r, kind, detail = "") {
    const h = { at: nowIso(), by: userName(), role: roleLabel(), event: EVENTS[kind] || kind, detail };
    r.history.unshift(h);
    window.GEAPEventTimeline?.log?.(journalEvent(h), journalCtx(r));
    r.updatedAt = nowIso(); r.updatedBy = userName();
  }

  /* ================================================================ PROFILE = the editor page (US-468)
     the widget profile: editor width, tabs Configurare · Versiuni · Istoric; Configurare = the three sections of the
     create sheet in one column (form 1fr) + the sticky preview (1fr); read-only = passport blocks + the preview */
  const P = { id: null, tab: "configurare", isNew: false, draft: null, base: null, errors: {}, saveError: false, step: 1, maxStep: 1, newFormulas: [] };
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
    if (P.id !== id || P.isNew) { fxReset("profile"); P.errors = {}; P.saveError = false; P.totalTouched = false; P.newFormulas = []; P.draft = clone(r.config); P.base = clone(r.config); }
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
    if (P.tab === "configurare") { mountFilters("profile"); window.GEAPDatePicker?.init?.(body); bindAuth(body); }
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
        ? "Raport global, creat de Administratorul central: îl vezi doar pentru citire. Îl poți clona ca raport al autorității tale."
        : `Raportul autorității ${esc(r.config.authorities.map(authName).join(", "))}: îl vezi doar pentru citire.`)
    ];
    const html = list.filter(Boolean).join("");
    return html ? `<div class="e-permits-reg-notices">${html}</div>` : "";
  }
  /* the sticky preview sits under the profile's pinned tab row and fit the scroller's height (measured: the BO
     canvas scrolls under the shell top bar; in the create sheet the body scrolls) */
  const stickObserved = new WeakSet();
  function syncStick() {
    document.querySelectorAll(".e-permits-rpt-split").forEach((grid) => {
      if (!grid.isConnected || !grid.offsetParent) return;
      /* rpt-stick-v2: the pinned part of the sticky page header = its height + its (negative) sticky top — measured, so the
         preview sticks exactly at the tabs' bottom edge whatever the header holds */
      const hdr = grid.closest("[data-dosar-profil]")?.querySelector(".e-permits-page-header.is-sticky");
      const top = hdr ? Math.max(0, Math.round(hdr.offsetHeight + (parseFloat(getComputedStyle(hdr).top) || 0))) : 0;
      if (hdr && !stickObserved.has(hdr) && window.ResizeObserver) { stickObserved.add(hdr); new ResizeObserver(() => requestAnimationFrame(syncStick)).observe(hdr); }
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
    /* Nivel is generated from who clones: the central → Global (keeps the assignment of a global source), anyone else →
       his authority; the category stays the source's (Feature: „doar în aceeași categorie”) */
    if (me.central) { v.level = "Global"; if (src.config.level !== "Global") v.authorities = []; }
    else { v.level = "Autoritate"; v.authorities = [me.authority]; }
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
    Object.assign(P, { id: null, isNew: true, from: src?.id || "", tab: "configurare", draft: v, base: clone(v), errors: {}, saveError: false, totalTouched: Boolean(src), step: 1, maxStep: src ? STEPS.length : 1, newFormulas: [] });
    const el = ensureSheet();
    renderCreate();
    el.hidden = false;
    document.documentElement.classList.add("is-reg-editor-open");
    requestAnimationFrame(() => el.querySelector(src ? `#${IDP}-name-ro` : `#${IDP}-category`)?.focus({ preventScroll: true }));
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
    window.GEAPDatePicker?.init?.(sheet);
    bindAuth(sheet);
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
      Object.assign(P, { id: null, isNew: false, from: "", draft: null, base: null, errors: {}, saveError: false, ...prev, step: 1, maxStep: 1, newFormulas: [] });
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
    const m = /^filter\.([^.]+)\.(field|value)$/.exec(key);
    if (m) return `#${IDP}-cf-${m[1]}-${m[2]}`;
    return `#${IDP}-${({ "names.ro": "name-ro", source: "source", category: "category", authorities: "authorities", columns: "columns", groupBy: "groupby" })[key] || key}`;
  };
  function showFirstError(errors) {
    const key = Object.keys(errors)[0];
    const keep = key === "category" ? `#${IDP}-category` : key === "authorities" ? `#fo-${IDP}-authorities` : errorSel(key);
    if (creating()) { P.step = STEP_OF(key); P.maxStep = Math.max(P.maxStep, P.step); renderCreate({ keep }); }
    else renderProfile({ keep });
    (creating() ? sheet : document).querySelector(errorSel(key))?.closest(".e-permits-fo-field, .e-permits-wid-types, .e-permits-stack__item, .e-permits-dosar-profil__section")?.scrollIntoView({ block: "center" });
  }
  function savePage({ silent = false } = {}) {
    const errors = validate(P.draft, { steps: [1] });
    if (Object.keys(errors).length) { P.errors = errors; showFirstError(errors); return null; }
    if (demo.has("eroare")) { P.saveError = true; rerender(); return null; }
    let r = P.isNew ? null : reportOf(P.id);
    const added = commitFormulas(P.draft);
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
    /* Feature: „orice modificare … a formulei se înregistrează în Jurnalul de audit” */
    added.forEach(({ f, added: isNew }) => { if (isNew) { f.origin = r.id; audit(r, "formula", `„${f.names.ro}” · ${f.expr} · ${label(FORMATS, f.format)}`); } });
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
    P.draft = clone(r.config); P.base = clone(r.config); P.errors = {}; P.saveError = false; P.newFormulas = [];
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
        /* changes-reveal-v1: „Vezi” → the Configurare tab, the section of that row (fields by their label; the
           numbered column rows → the column list) */
        reveal: async (lbl) => {
          if (P.tab !== "configurare") await openProfile(P.id, "configurare", { push: false });
          const panel = document.querySelector("#rpt-panel .e-permits-rpt-form") || document.querySelector("#rpt-panel");
          const byId = { "Autoritățile raportului": `#${IDP}-authorities`, Nivel: `#${IDP}-level-label`, Coloane: `#${IDP}-cols-title`, "Gruparea rândurilor": `#${IDP}-group-title`, Filtre: `#${IDP}-flt-title` }[lbl];
          const el = byId && panel?.querySelector(byId);
          return el?.closest(".e-permits-dosar-profil__section") || A().sectionOfLabel?.(panel, lbl) || null;
        },
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
    const set = formulaSet(v);
    const options = set.map((x) => [x.id, `${x.names.ro}${(P.newFormulas || []).includes(x) ? " (nouă)" : ""}`]);
    const others = v.columns.filter((x) => x.id !== c.id);
    const opRows = f ? f.operands.map((o) => {
      const fit = others.filter((x) => o.types.includes(x.dataType));
      return selectField(`rpt-c-op-${o.key}`, `data-rpt-col-op="${o.key}"`, `${o.key} · ${o.label}`, fit.map((x) => [x.id, colName(x)]), c.operands?.[o.key] || "", { required: true, placeholder: fit.length ? "Alege coloana" : "Nicio coloană potrivită", hint: fit.length ? `Coloană ${o.types.map((t) => label(DATA_TYPES, t)).join(" sau ")} a raportului.` : `Adaugă întâi în raport o coloană ${o.types.map((t) => label(DATA_TYPES, t)).join(" sau ")}.`, error: e[`op.${o.key}`], disabled: !fit.length });
    }).join("") : "";
    return `
      ${selectField("rpt-c-formula", 'data-rpt-col-field="formula"', "Formula de calcul", options, c.formula, { required: true, span: 12, placeholder: options.length ? "Alege formula" : "Nicio formulă în set", error: e.formula, hint: options.length ? "Din setul de formule: formulele rapoartelor pe care le poți clona, pe aceeași sursă de date." : "Setul nu are încă formule pe această sursă de date: adaugă o formulă nouă.", disabled: !options.length })}
      ${f ? full(`
        <div class="e-permits-rpt-formula" aria-label="Formula aleasă">
          <div class="e-permits-rpt-formula__row"><span class="e-permits-rpt-formula__label">Expresia</span><strong class="e-permits-rpt-formula__expr">${esc(f.expr)}</strong></div>
          <div class="e-permits-rpt-formula__row"><span class="e-permits-rpt-formula__label">Rezultat</span><span>${esc(RESULT_TEXT[f.format] || label(FORMATS, f.format))}</span></div>
          ${f.operands.length ? "" : '<p class="e-permits-rpt-formula__note">Se calculează pe înregistrările sursei din fiecare rând; nu are nevoie de alte coloane.</p>'}
        </div>`) : ""}
      ${f && f.operands.length ? full(`<p class="e-permits-cfg-ro__label">Coloanele formulei</p>`) + opRows : ""}
      ${f && (P.newFormulas || []).includes(f) ? full(U().renderInfoNote?.("Formula nouă intră în setul de formule la salvarea raportului.") || "") : ""}
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
      : grid(formulaPicker(v, c, e));
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
      </section>

`;
    return {
      title: isNew ? `Coloană nouă · ${label(KINDS, c.kind)}` : colName(c),
      subtitle: `Poziția ${pos} · ${label(KINDS, c.kind)}${sourceName(v.source) ? ` · ${sourceName(v.source)}` : ""}`,
      body,
      footer: `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-rpt-drawer-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-rpt-col-save>${isNew ? "Adaugă coloana" : "Salvează coloana"}</button></div>`
    };
  }
  const nextColId = (v) => `c${Math.max(0, ...v.columns.map((c) => Number(String(c.id).slice(1)) || 0)) + 1}`;
  const blankColumn = (v, kind) => ({ id: nextColId(v), names: { ro: "", ru: "", en: "" }, kind, field: "", formula: "", operands: {}, dataType: kind === "calc" ? "numeric" : "text", header: "", total: "sum" });
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
  /* the grouping follows the columns: a removed / no longer groupable column leaves it, one Text column stays free */
  function trimLevels(v) {
    v.groupBy = v.groupBy.filter((id) => groupable(colOf(v, id))).slice(0, MAX_LEVELS);
    const text = v.columns.filter(groupable).length;
    while (v.groupBy.length && v.groupBy.length >= text) v.groupBy.pop();
  }
  function afterColumnsChange(keep = "") {
    /* the total row follows the Feature default („Da” when there are numeric / valoric columns) until the author says no */
    if (!P.draft.columns.some(isMeasure)) P.draft.totalRow = false;
    else if (!P.totalTouched) P.draft.totalRow = true;
    trimLevels(P.draft);
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

  /* ---- „Formulă nouă” (Feature: the author adds a formula; it enters the set when the report is saved): name + expression on
     A, B, C… (the formula's columns) + result format */
  const fxModal = () => document.querySelector("#case-action-modal");
  function openFormulaDialog() {
    if (!canAddFormula()) return;
    const body = `
      <div class="e-permits-user-create__grid">
        ${textField("rpt-fx-name", 'data-rpt-fx="name"', "Denumire (RO)", "", { required: true, max: NAME_MAX, hint: "De exemplu „Ponderea dosarelor respinse”." })}
        ${textField("rpt-fx-expr", 'data-rpt-fx="expr"', "Expresia", "", { required: true, hint: "Folosește A, B, C pentru coloanele raportului pe care lucrează formula și + − × / ( ), de exemplu (A / B) × 100." })}
        ${selectField("rpt-fx-format", 'data-rpt-fx="format"', "Formatul rezultatului", FORMATS, "int", { required: true, span: 12 })}
      </div>`;
    G().openModal?.({
      kind: "rpt-formula",
      title: "Formulă nouă",
      subtitle: "Intră în setul de formule la salvarea raportului",
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
    const draft = { names: { ro: n, ru: "", en: "" }, expr: x, format: fmt?.value || "int" };
    const pick = (f, keys) => { if (DR?.mode === "col") { DR.col.formula = f.id; DR.col.dataType = FORMAT_TYPE[f.format] || "numeric"; DR.col.operands = Object.fromEntries(keys.map((k) => [k, DR.col.operands?.[k] || ""])); if (!DR.col.names.ro) DR.col.names.ro = f.names.ro; delete DR.errors.formula; renderDrawer("#rpt-c-formula"); } };
    G().closeModal?.();
    fxModal()?.classList.remove("e-permits-confirm-overlay");
    /* Feature: „o formulă identică se păstrează o singură dată” — the set already has it: that one is chosen */
    const dup = formulaSet(P.draft).find((f) => sameFormula(f, draft));
    if (dup) { pick(dup, dup.operands.map((o) => o.key)); toast(`Formula există deja în set: „${dup.names.ro}”. Am ales-o pe aceea.`, "info"); return; }
    const f = { id: `f-new-${Date.now() % 1000000}`, ...draft, operands: keys.map((k) => ({ key: k, label: `Coloana ${k}`, types: ["numeric", "value"] })), sources: [P.draft.source], custom: true };
    P.newFormulas = [...(P.newFormulas || []), f];
    pick(f, keys);
  }
  /* at the report's save the new formulas it uses enter the set (an identical one already there is reused — kept once);
     each one is an audit entry of the report */
  function commitFormulas(v) {
    const fresh = (P.newFormulas || []).filter((f) => v.columns.some((c) => c.kind === "calc" && c.formula === f.id));
    P.newFormulas = [];
    return fresh.map((f) => {
      const old = formulas().find((x) => formulaFits(x, v.source) && sameFormula(x, f));
      const kept = old || f;
      if (!old) { delete f.custom; formulas().push(f); }
      v.columns.forEach((c) => { if (c.kind === "calc" && c.formula === f.id) c.formula = kept.id; });
      return { f: kept, added: !old };
    });
  }

  /* ---- „Mărește” (rpt-zoom-v2, user): near full-screen (viewport − 2 × 24), header (title + ×) → the SAME facet filter bar as
     the inline preview (its own library instance on the shared state: applied in one = shown in the other) → the table
     filling the rest with its own scroll; phones = the full-screen sheet with the icon-only Filtre + sheet */
  const zoomOpen = () => Boolean(fxModal()?.classList.contains("is-active") && fxModal().querySelector(".e-permits-reg-modal--rpt-zoom"));
  const zoomCard = () => { const v = fxConfig("zoom"); return v ? cardHtml(v, { filters: "live", sel: fx("zoom").state.applied, q: fx("zoom").state.q }) : ""; };
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

  /* ================================================================ preview filters (rpt-filters-v1 → rpt-feature-v1)
     ONE library facet filter per context (the profile, the create sheet, „Mărește”): `GEAPFacetFilter.create` on a host
     element that outlives the preview's re-renders — after each render the host moves into the card's `[data-rpt-fslot]`.
     The chips = the filtered columns in column order (desktop: the bar always open, the first 4 chips, the rest under
     „Mai multe” = the module's inlineMax); „Interval de date” = the date range facet, „Alegere multiplă” = the checklist,
     „Alegere unică” = the radio list (`single`). „Text” = the BO register way: ONE search field above the chips
     („Caută după …”, the library list search) that looks into every Text-filter column. Phones: the search + the icon-only
     „Filtre” square in one row, the bottom sheet (the module's phone mode). */
  const FX = {};
  let zoomBase = "";
  const fxConfig = (ctx) => (ctx === "zoom" ? fxConfig(zoomBase || "profile") : ctx === "sheet" ? P.draft : editable() ? P.draft : reportOf(P.id)?.config) || null;
  const FACET_SEARCH_MIN = 8;
  function fxFacets(ctx) {
    const v = fxConfig(ctx);
    if (!v) return [];
    /* rpt-cond-v1: the chips = the „Afișează filtru” conditions in the builder's order (key = the condition id); an asked
       Text condition is the search field, not a chip */
    return askChips(v).map((c) => ({
      key: c.id,
      label: chipLabel(v, c),
      ...(condKind(v, c) === "date" ? { type: "date", today: () => DEMO_TODAY } : {}),
      ...((fieldOf(v.source, c.field)?.values || []).length > FACET_SEARCH_MIN ? { search: true } : {})
    }));
  }
  function fx(ctx) {
    if (FX[ctx]) return FX[ctx];
    const host = document.createElement("div");
    host.className = "e-permits-rpt-fbar";
    host.innerHTML = `
      <div class="e-permits-rpt-fbar__tools">
        <div class="search-input medium rectangular e-permits-workplace__search e-permits-list-search e-permits-list-search--fill e-permits-rpt-fbar__search" data-rpt-q-box hidden>
          <span class="icon-search" aria-hidden="true">${icon("search")}</span>
          <input class="input" type="search" id="rpt-q-${ctx}" autocomplete="off" data-rpt-q aria-label="Caută în raport">
          <div class="btn-group"><button type="button" class="btn-icon clear" aria-label="Șterge căutarea" data-rpt-q-clear>${icon("cross-small", 16)}</button></div>
        </div>
        <button class="chip e-permits-filter-trigger e-permits-rpt-fbar__trigger" type="button" aria-expanded="false" aria-controls="rpt-fbar-${ctx}" data-rpt-filter-toggle>
          <span class="chip__icon"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-filter-lines"></use></svg></span>
          <span class="chip__label">Filtre</span>
          <span class="chip__badge" aria-hidden="true" data-rpt-filter-count hidden></span>
        </button>
      </div>
      <div class="e-permits-workplace__filters e-permits-rpt-fbar__bar" id="rpt-fbar-${ctx}" role="group" aria-label="Filtrele raportului" hidden></div>`;
    /* the „Mărește” dialog shares the state of the preview it was opened from: filters applied in one show in the other */
    const state = ctx === "zoom" ? fx(zoomBase || "profile").state : { open: true, applied: {}, draft: null, q: "" };
    const x = { host, state, ctl: null };
    const model = (sel) => { const v = fxConfig(ctx); return v ? previewModel(v, sel, state.q) : { rowCount: 0, records: [] }; };
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
        const flt = v ? askChips(v).find((c) => c.id === facet.key) : null;
        if (!flt) return [];
        const counts = new Map();
        /* the options = the values left in the report's scope (its fixed conditions) */
        model(null).records.filter((rec) => recMatch(v, rec, null)).forEach((rec) => { const x2 = rec[flt.field]; if (x2 != null) counts.set(x2, (counts.get(x2) || 0) + 1); });
        const f = fieldOf(v.source, flt.field);
        const order = f?.values?.length ? f.values : [...counts.keys()].sort((a, b) => String(a).localeCompare(String(b), "ro"));
        return order.filter((val) => counts.has(val)).map((val) => ({ value: val, count: counts.get(val) }));
      },
      total: () => model(state.applied).rowCount,
      preview: (sel) => model(sel).rowCount,
      apply: () => refreshPreviewOnly(),
      /* user: no „Alege valorile, apoi aplică filtrele.” under the chips */
      hint: false,
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
    x.state.q = "";
  }
  /* the search box follows the report's Text filters (shown only when there is one; placeholder = their names) */
  function syncSearch(ctx) {
    const x = fx(ctx);
    const v = fxConfig(ctx);
    const box = x.host.querySelector("[data-rpt-q-box]");
    const input = box.querySelector("[data-rpt-q]");
    const on = Boolean(v && askText(v).length);
    box.hidden = !on;
    x.host.classList.toggle("has-search", on);
    if (!on) return;
    const ph = searchText(v);
    if (input.placeholder !== ph) input.placeholder = ph;
    if (input.value !== x.state.q) input.value = x.state.q;
    box.classList.toggle("has-value", Boolean(x.state.q));
    box.classList.toggle("is-ready", Boolean(x.state.q));
  }
  /* the host into the freshly rendered card (or out, when the card has no filters); a search field that had the focus keeps
     it (the re-render detached it) */
  function mountFilters(ctx) {
    const root = ctx === "zoom" ? fxModal() : ctx === "sheet" ? sheet : document.querySelector("#rpt-panel");
    const slot = root?.querySelector("[data-rpt-fslot]");
    const x = fx(ctx);
    if (!slot) { if (x.host.isConnected) { x.ctl.close(false); x.host.remove(); } return; }
    slot.replaceWith(x.host);
    syncSearch(ctx);
    x.ctl.render();
    if (x.refocus) {
      const input = x.host.querySelector("[data-rpt-q]");
      input.focus({ preventScroll: true });
      try { input.setSelectionRange(x.refocus[0], x.refocus[1]); } catch { /* not text */ }
      x.refocus = null;
    }
  }
  const ctxOf = (el) => (el.closest("#case-action-modal") ? "zoom" : inSheet(el) ? "sheet" : "profile");
  document.addEventListener("input", (event) => {
    const el = event.target;
    if (!el.matches?.("[data-rpt-q]")) return;
    const ctx = ctxOf(el);
    const x = fx(ctx);
    x.state.q = el.value;
    x.refocus = [el.selectionStart, el.selectionEnd];
    /* the inline preview and an open „Mărește” both follow (shared state); the field that was typed in keeps the focus */
    refreshPreviewOnly();
  });

  /* ================================================================ events */
  const profileRoot = () => (profileOpen() ? A().els?.dosarProfilPanel || document.querySelector("[data-dosar-profil]") : null);
  const inPage = (el) => { if (inSheet(el)) return Boolean(P.draft); const root = profileRoot(); return Boolean(root && root.contains(el) && P.draft && editable()); };
  const move = (list, id, by) => { const i = list.findIndex((x) => x.id === id); const j = i + by; if (i < 0 || j < 0 || j >= list.length) return false; [list[i], list[j]] = [list[j], list[i]]; return true; };
  let dragFrom = -1;
  /* after the grouping is cleared the focus goes where it is set again */
  const levelKeep = () => (creating() ? `#${IDP}-groupby` : "[data-rpt-col-group]");
  /* rpt-cond-v1: the list an item lives in (top level or a group's rules) */
  const condScope = (scope) => (scope === "top" ? P.draft.filters : P.draft.filters.find((x) => x.id === scope)?.rules || null);
  const scopeOf = (id) => (P.draft.filters.some((x) => x.id === id) ? "top" : P.draft.filters.find((x) => x.group && x.rules.some((c) => c.id === id))?.id || "");
  const nextCid = (v, pre) => `${pre}${Math.max(0, ...flatConds(v).map((c) => Number(String(c.id).slice(1)) || 0), ...v.filters.filter((x) => x.group).map((x) => Number(String(x.id).slice(1)) || 0)) + 1}`;
  const blankCond = (v) => ({ id: nextCid(v, "f"), field: "", op: "", value: "", value2: "", values: [], ask: false });
  /* move a condition / group (↑ ↓ / drag) inside its level; FLIP slide + flash + live line, focus kept */
  function moveCond(scope, from, to, keep) {
    const list = condScope(scope);
    if (!list || from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return;
    const before = snapConds();
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    rerender({ keep });
    reheader();
    const root = moveRoot();
    const opts = { duration: tokenMs("--motion-duration-md", 300), easing: tokenEase() };
    root?.querySelectorAll("[data-rpt-ci]").forEach((el) => {
      const top = before.get(el.dataset.rptCi);
      const dy = top == null ? 0 : top - el.getBoundingClientRect().top;
      if (motionOk() && Math.abs(dy) > 0.5) el.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], opts);
      if (el.dataset.rptCi === moved.id) { el.classList.remove("is-just-moved"); void el.offsetWidth; el.classList.add("is-just-moved"); setTimeout(() => el.classList.remove("is-just-moved"), tokenMs("--motion-duration-lg", 500) * 2); }
    });
    announce(`${moved.group ? "Grupul" : moved.field ? fldLabel(P.draft, moved) : "Condiția"} mutat pe poziția ${to + 1} din ${list.length}.`);
  }
  function snapConds() {
    const out = new Map();
    moveRoot()?.querySelectorAll("[data-rpt-ci]").forEach((el) => out.set(el.dataset.rptCi, el.getBoundingClientRect().top));
    return out;
  }
  let fltFrom = null;
  function onFilterDrag(event) {
    const row = event.target.closest?.("[data-rpt-ci]");
    if (!row || !inPage(row)) { if (event.type === "dragend") fltFrom = null; return false; }
    if (event.type === "dragstart") {
      /* a drag that starts inside a field (selecting text) is not a move; the innermost item moves */
      if (event.target.closest?.("input, textarea")) { event.preventDefault(); return true; }
      event.stopPropagation();
      fltFrom = { scope: row.dataset.scope, index: Number(row.dataset.index) };
      event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", `cond-${row.dataset.rptCi}`); row.classList.add("is-dragging"); return true;
    }
    /* drops land only on an item of the same level */
    const target = fltFrom ? event.target.closest?.(`[data-rpt-ci][data-scope="${CSS.escape(fltFrom.scope)}"]`) : null;
    if (event.type === "dragover" && target) { event.preventDefault(); document.querySelectorAll("[data-rpt-ci].is-drop-target").forEach((r) => r.classList.remove("is-drop-target")); target.classList.add("is-drop-target"); return true; }
    if (event.type === "drop" && target) {
      event.preventDefault();
      const { scope, index } = fltFrom;
      fltFrom = null;
      moveCond(scope, index, Number(target.dataset.index), "");
      return true;
    }
    if (event.type === "dragend") { fltFrom = null; document.querySelectorAll("[data-rpt-ci].is-dragging, [data-rpt-ci].is-drop-target").forEach((r) => r.classList.remove("is-dragging", "is-drop-target")); }
    return Boolean(fltFrom);
  }
  /* rpt-levels-v2: move a grouping level (↑ ↓ / drag), flash, focus kept, live line */
  function moveLevel(from, to, how = "arrow", by = 0) {
    const list = P.draft.groupBy;
    if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return;
    const [id] = list.splice(from, 1);
    list.splice(to, 0, id);
    afterColumnsChange(how === "arrow" ? `[data-rpt-handle="level|${CSS.escape(id)}"]` : "");
    const row = moveRoot()?.querySelector(`[data-rpt-level="${CSS.escape(id)}"]`);
    if (row) { row.classList.remove("is-just-moved"); void row.offsetWidth; row.classList.add("is-just-moved"); setTimeout(() => row.classList.remove("is-just-moved"), tokenMs("--motion-duration-lg", 500) * 2); }
    announce(`${colName(colOf(P.draft, id))}: nivelul ${to + 1} de grupare din ${list.length}.`);
  }
  let lvFrom = -1;
  function onLevelDrag(event) {
    const row = event.target.closest?.("[data-rpt-level]");
    if (!row || !inPage(row)) { if (event.type === "dragend") lvFrom = -1; return false; }
    if (event.type === "dragstart") { lvFrom = Number(row.dataset.index); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", `level-${lvFrom}`); row.classList.add("is-dragging"); return true; }
    if (event.type === "dragover" && lvFrom >= 0) { event.preventDefault(); document.querySelectorAll("[data-rpt-level].is-drop-target").forEach((r) => r.classList.remove("is-drop-target")); row.classList.add("is-drop-target"); return true; }
    if (event.type === "drop" && lvFrom >= 0) { event.preventDefault(); const from = lvFrom; lvFrom = -1; document.querySelectorAll("[data-rpt-level].is-dragging, [data-rpt-level].is-drop-target").forEach((r) => r.classList.remove("is-dragging", "is-drop-target")); moveLevel(from, Number(row.dataset.index), "drag"); return true; }
    if (event.type === "dragend") { lvFrom = -1; document.querySelectorAll("[data-rpt-level].is-dragging, [data-rpt-level].is-drop-target").forEach((r) => r.classList.remove("is-dragging", "is-drop-target")); }
    return lvFrom >= 0;
  }
  function onDrag(event) {
    if (event.target.closest?.("[data-rpt-level]") && onLevelDrag(event)) return;
    if (event.type === "dragend") onLevelDrag(event);
    if (event.target.closest?.("[data-rpt-ci]") && onFilterDrag(event)) return;
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
  /* rpt-cond-v2 (user): the values menu is wider than its trigger when needed (max-content ≤ 360); once open, it keeps its
     left edge on the trigger's left edge, or flips to the right edge when it would leave the screen */
  document.addEventListener("click", (event) => {
    const trig = event.target.closest?.(".e-permits-rpt-multi > [data-stack-menu-trigger]");
    if (!trig) return;
    requestAnimationFrame(() => {
      const menu = document.getElementById(trig.getAttribute("aria-controls"));
      if (!menu || menu.hidden) return;
      menu.classList.remove("is-flip-x");
      menu.style.removeProperty("--rpt-menu-max");
      const t = trig.getBoundingClientRect();
      const w = menu.getBoundingClientRect().width;
      const right = window.innerWidth - 16 - t.left;
      const left = t.right - 16;
      if (w <= right) return;
      const flip = w <= left || left > right;
      menu.classList.toggle("is-flip-x", flip);
      if (w > (flip ? left : right)) menu.style.setProperty("--rpt-menu-max", `${Math.floor(flip ? left : right)}px`);
    });
  });
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
    if (fclear) { const x = fx(ctxOf(fclear)); x.state.q = ""; x.ctl.clearAll(); refreshPreviewOnly(); return; }
    const qclear = t.closest("[data-rpt-q-clear]");
    if (qclear) { const x = fx(ctxOf(qclear)); x.state.q = ""; x.refocus = [0, 0]; refreshPreviewOnly(); return; }
    const zoom = t.closest("[data-rpt-zoom]");
    if (zoom) { if (zoom.getAttribute("aria-disabled") !== "true") openZoom(); return; }
    const fold = t.closest("[data-rpt-fold]");
    if (fold) {
      const path = fold.dataset.rptFold;
      if (FOLD.has(path)) FOLD.delete(path); else FOLD.add(path);
      applyFold();
      return;
    }
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
      rerender({ keep: `#${IDP}-${kind}` }); reheader();
      return;
    }
    const add = t.closest("[data-rpt-add]");
    if (add) { if (add.getAttribute("aria-disabled") !== "true") addKind(add.dataset.rptAdd); return; }
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
    const hide = t.closest("[data-rpt-col-hide]");
    if (hide) {
      const c = colOf(P.draft, hide.dataset.rptColHide);
      if (!c) return;
      if (c.hidden) delete c.hidden; else c.hidden = true;
      afterColumnsChange(`[data-rpt-col-hide="${CSS.escape(c.id)}"]`);
      announce(c.hidden ? `Coloana „${colName(c)}” este ascunsă în raport.` : `Coloana „${colName(c)}” se afișează în raport.`);
      return;
    }
    const grp = t.closest("[data-rpt-col-group]");
    if (grp) {
      if (grp.getAttribute("aria-disabled") === "true") return;
      const id = grp.dataset.rptColGroup;
      const on = !P.draft.groupBy.includes(id);
      /* rpt-levels-v2: a click adds the next level, the pressed one removes its level (the others move up) */
      P.draft.groupBy = on ? [...P.draft.groupBy, id] : P.draft.groupBy.filter((x) => x !== id);
      delete P.errors.groupBy;
      afterColumnsChange(`[data-rpt-col-group="${CSS.escape(id)}"]`);
      announce(on ? `${colName(colOf(P.draft, id))}: nivelul ${P.draft.groupBy.length} de grupare.` : `${colName(colOf(P.draft, id))} nu mai grupează rândurile.`);
      return;
    }
    if (t.closest("[data-rpt-group-clear]")) { P.draft.groupBy = []; delete P.errors.groupBy; afterColumnsChange(levelKeep()); announce("Gruparea a fost eliminată."); return; }
    const lrm = t.closest("[data-rpt-level-remove]");
    if (lrm) { const id = lrm.dataset.rptLevelRemove; P.draft.groupBy = P.draft.groupBy.filter((x) => x !== id); delete P.errors.groupBy; afterColumnsChange(P.draft.groupBy.length ? "[data-rpt-level-remove]" : levelKeep()); announce(`${colName(colOf(P.draft, id))} nu mai grupează rândurile.`); return; }
    const col = t.closest("[data-rpt-col]");
    if (col && !t.closest("button")) { openColumn(col.dataset.rptCol); return; }
    /* rpt-cond-v1: the condition builder */
    const cadd = t.closest("[data-rpt-cond-add]");
    if (cadd) {
      if (cadd.getAttribute("aria-disabled") === "true") return;
      const list = condScope(cadd.dataset.rptCondAdd);
      if (!list) return;
      const c = blankCond(P.draft);
      list.push(c);
      rerender({ keep: `#${IDP}-cf-${c.id}-field` }); reheader();
      return;
    }
    if (t.closest("[data-rpt-group-add]")) {
      if (t.closest("[data-rpt-group-add]").getAttribute("aria-disabled") === "true") return;
      const g = { id: nextCid(P.draft, "g"), group: true, conj: P.draft.filterConj === "or" ? "and" : "or", rules: [] };
      P.draft.filters.push(g);
      const c = blankCond(P.draft);
      g.rules.push(c);
      rerender({ keep: `#${IDP}-cf-${c.id}-field` }); reheader();
      announce("Grup de condiții adăugat.");
      return;
    }
    const crm = t.closest("[data-rpt-cond-remove]");
    if (crm) {
      const id = crm.dataset.rptCondRemove;
      const scope = scopeOf(id);
      const list = condScope(scope);
      const i = list.findIndex((x) => x.id === id);
      const gone = list[i];
      list.splice(i, 1);
      /* a group without conditions disappears */
      if (scope !== "top" && !list.length) P.draft.filters = P.draft.filters.filter((x) => x.id !== scope);
      Object.keys(P.errors).filter((k) => k.startsWith("filter.")).forEach((k) => delete P.errors[k]);
      rerender({ keep: "[data-rpt-cond-add=\"top\"]" }); reheader();
      announce(gone?.group ? "Grupul de condiții a fost eliminat." : "Condiția a fost eliminată.");
      return;
    }
    const cv = t.closest("[data-rpt-cv]");
    if (cv) {
      /* a value of a list condition: toggled in place, the menu stays open, the preview follows */
      const c = flatConds(P.draft).find((x) => x.id === cv.dataset.rptCv);
      if (!c) return;
      const x = cv.dataset.value;
      c.values = c.values.includes(x) ? c.values.filter((y) => y !== x) : [...c.values, x];
      const f = fieldOf(P.draft.source, c.field);
      c.values = (f?.values || []).filter((y) => c.values.includes(y));
      const on = c.values.includes(x);
      cv.setAttribute("aria-checked", String(on));
      cv.querySelector("input").checked = on;
      const box = cv.closest(".e-permits-rpt-multi");
      const txt = box.querySelector("[data-rpt-cv-text]");
      txt.textContent = multiText(c.values);
      txt.classList.toggle("e-permits-fo-select__value--placeholder", !c.values.length);
      box.querySelector(".e-permits-fo-select__button").setAttribute("aria-label", `Valori: ${multiText(c.values)}`);
      if (c.values.length && P.errors[`filter.${c.id}.value`]) { delete P.errors[`filter.${c.id}.value`]; box.classList.remove("is-error"); box.parentElement.querySelector(".e-permits-fo-field__error")?.remove(); }
      refreshPreviewOnly(); reheader();
    }
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
    /* after the move the ring follows the pointer / focus again (it never stays on its own) */
    setTimeout(() => { if (hlHover === id) { hlHover = ""; syncColHl(); } }, opts.duration + 150);
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
  /* rpt-ring-v6 (user: a ring with no column): hovered (pointer inside the editor) → focused (derived live, so a re-render
     that drops the focused node drops the ring) → the column whose panel is open */
  const hlTarget = () => hlHover || colFromEvent(document.activeElement || document.body) || (DR?.mode === "col" && DR.colId) || "";
  function syncColHl({ scroll = false } = {}) {
    hlFlt = "";
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
  /* rpt-filter-link-v1 (user): hover / focus of a filter item outlines its chip in the preview (the column list's link);
     a Text filter has no chip (it is the search field) */
  let hlFlt = "";
  function syncFltHl() {
    const root = moveRoot();
    if (!root) return;
    root.querySelectorAll("[data-rpt-preview] .chip.is-linked").forEach((c) => c.classList.remove("is-linked"));
    const f = hlFlt ? flatConds(P.draft || { filters: [] }).find((c) => c.id === hlFlt) : null;
    const name = f && asking(P.draft, f) && condKind(P.draft, f) !== "text" ? chipLabel(P.draft, f) : "";
    if (!name) return;
    [...root.querySelectorAll("[data-rpt-preview] .e-permits-rpt-fbar .chip:not(.e-permits-filter-trigger)")].find((c) => c.querySelector(".chip__label")?.textContent.trim() === name)?.classList.add("is-linked");
  }
  const fltFromEvent = (t) => { const r = t.closest?.("[data-rpt-ci]"); return r ? r.dataset.rptCi : ""; };
  const colFromEvent = (t) => t.closest?.("[data-rpt-col]")?.dataset.rptCol || t.closest?.("[data-rpt-col-pick]")?.dataset.rptColPick || "";
  document.addEventListener("mouseover", (event) => {
    if (!P.draft || performance.now() < hlLockUntil) return;
    /* the pointer left the editor (tabs, sidebar, header…): no hovered column any more */
    if (!inPage(event.target)) { if (hlHover) { hlHover = ""; syncColHl(); } return; }
    const id = colFromEvent(event.target);
    if (id !== hlHover) { hlHover = id; syncColHl(); }
    const fi = fltFromEvent(event.target);
    if (fi !== hlFlt) { hlFlt = fi; syncFltHl(); }
  });
  document.addEventListener("focusin", (event) => {
    if (!P.draft || !inPage(event.target)) return;
    const id = colFromEvent(event.target);
    if (id) syncColHl({ scroll: Boolean(event.target.closest("[data-rpt-col]")) });
    const fi = fltFromEvent(event.target);
    if (fi) { hlFlt = fi; syncFltHl(); }
  });
  document.addEventListener("focusout", (event) => {
    if (!P.draft || !inPage(event.target) || !colFromEvent(event.target)) return;
    requestAnimationFrame(() => syncColHl());
  });
  document.addEventListener("click", (event) => {
    const pick = event.target.closest?.("[data-rpt-col-pick]");
    if (!pick || !inPage(pick)) return;
    const root = creating() ? sheet : document.querySelector("#rpt-panel");
    const item = root?.querySelector(`[data-rpt-col="${CSS.escape(pick.dataset.rptColPick)}"]`);
    if (!item) return;
    item.scrollIntoView({ block: "center", behavior: "smooth" });
    item.focus({ preventScroll: true });
    syncColHl();
  });
  /* rpt-auth-ms-v1: the authorities multi-select reports every tick / chip × — model only (no re-render: the menu stays open) */
  document.addEventListener("fo-multiselect-change", (event) => {
    const host = event.target.closest?.("[data-rpt-auth-ms]");
    if (!host || !P.draft || !inPage(host)) return;
    const byLabel = new Map(D().authorities.map((a) => [authLabel(a), a.id]));
    /* all ticked = every authority, also the ones added later (authorities []); none / some = the list */
    P.draft.authorities = event.detail?.all ? [] : (event.detail?.values || []).map((x) => byLabel.get(x)).filter(Boolean);
    AUTH_SOME.set(P.draft, !event.detail?.all);
    if (P.errors.authorities && (event.detail?.all || P.draft.authorities.length)) {
      delete P.errors.authorities;
      host.querySelector(".e-permits-fo-subgen-select.is-error")?.classList.remove("is-error");
      host.querySelector(".e-permits-fo-field__error")?.remove();
    }
    reheader();
  });
  /* the FO behaviour of the authorities multi-select after every render */
  function bindAuth(root) { root?.querySelectorAll("[data-rpt-auth-ms]").forEach((el) => window.GEAPFormRender?.bind?.(el)); }
  /* rpt-handle-v1: Arrow Up / Down on a focused drag handle moves its item one place (columns, conditions / groups, levels);
     the focus stays on the moved handle; the ends do nothing */
  function moveByHandle(kind, id, by) {
    const keep = `[data-rpt-handle="${kind}|${CSS.escape(id)}"]`;
    if (kind === "col") { const before = snapMove(); if (move(P.draft.columns, id, by)) { afterColumnsChange(keep); playMove(before, id); } return; }
    if (kind === "level") { const i = P.draft.groupBy.indexOf(id); moveLevel(i, i + by, "arrow", by); return; }
    const scope = scopeOf(id);
    const list = condScope(scope);
    if (!list) return;
    const i = list.findIndex((x) => x.id === id);
    moveCond(scope, i, i + by, keep);
  }
  /* Enter / Space on a column row opens its panel (the stack row is the control) */
  document.addEventListener("keydown", (event) => {
    const hdl = event.target.closest?.("[data-rpt-handle]");
    if (hdl && (event.key === "ArrowUp" || event.key === "ArrowDown") && inPage(hdl)) {
      event.preventDefault();
      const [kind, id] = hdl.dataset.rptHandle.split("|");
      moveByHandle(kind, id, event.key === "ArrowUp" ? -1 : 1);
      return;
    }
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
    /* rpt-cond-v1: a typed value of a condition (text / number / N zile) — the preview follows, the field keeps its caret */
    if (el.dataset?.rptCf && el.tagName === "INPUT" && !el.classList.contains("js-date-picker-input")) {
      const [id, part] = el.dataset.rptCf.split("|");
      const c = flatConds(P.draft).find((x) => x.id === id);
      if (c && (part === "value" || part === "value2")) { c[part] = el.value; refreshPreviewOnly(); reheader(); }
      return;
    }
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
    /* rpt-cond-v1: field / condition / date values, the connector, „Afișează filtru” */
    if (el.matches("[data-rpt-conj]")) {
      const scope = el.dataset.rptConj;
      if (scope === "top") v.filterConj = el.value === "or" ? "or" : "and";
      else { const g = v.filters.find((x) => x.id === scope); if (g) g.conj = el.value === "or" ? "or" : "and"; }
      rerender({ keep: `#${CSS.escape(el.closest(".e-permits-fo-select")?.querySelector("button")?.id || "")}` }); reheader();
      announce(`Condițiile ${scope === "top" ? "" : "din grup "}se combină cu „${el.value === "or" ? "sau" : "și"}”.`);
      return;
    }
    if (el.matches("[data-rpt-cond-ask]")) {
      const c = flatConds(v).find((x) => x.id === el.dataset.rptCondAsk);
      if (!c) return;
      c.ask = el.checked;
      const k = condKind(v, c);
      if (c.ask && !ASK_OPS[k]?.includes(opOf(v, c))) c.op = ASK_OPS[k]?.[0] || c.op;
      delete P.errors[`filter.${c.id}.value`];
      rerender({ keep: `[data-rpt-cond-ask="${CSS.escape(c.id)}"]` }); reheader();
      return;
    }
    if (el.dataset?.rptCf) {
      const [id, part] = el.dataset.rptCf.split("|");
      const c = flatConds(v).find((x) => x.id === id);
      if (!c) return;
      if (part === "field") {
        c.field = el.value; c.op = ""; c.value = ""; c.value2 = ""; c.values = [];
        if (!canAsk(v, c)) c.ask = false;
        if (c.ask) c.op = ASK_OPS[condKind(v, c)][0];
        delete P.errors[`filter.${id}.field`]; delete P.errors[`filter.${id}.value`];
        rerender({ keep: `#${IDP}-cf-${id}-field` }); reheader();
        return;
      }
      if (part === "op") {
        const was = opOf(v, c);
        c.op = el.value;
        /* another value shape (N zile ↔ a date, one value ↔ two): the old value no longer fits */
        if ((was === "last") !== (c.op === "last")) { c.value = ""; c.value2 = ""; }
        if (c.op !== "between") c.value2 = "";
        rerender({ keep: `#${IDP}-cf-${id}-op` }); reheader();
        return;
      }
      if (el.classList.contains("js-date-picker-input")) {
        const iso = el.closest("[data-date-picker]")?.dataset.selected || "";
        c[part] = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : "";
        if (condComplete(v, c)) delete P.errors[`filter.${id}.value`];
        refreshPreviewOnly(); reheader();
        return;
      }
      if (part === "value" || part === "value2") { c[part] = el.value; if (condComplete(v, c)) delete P.errors[`filter.${id}.value`]; refreshPreviewOnly(); reheader(); }
      return;
    }
    if (el.matches("[data-rpt-level-add]")) {
      if (el.value && groupable(colOf(v, el.value)) && !v.groupBy.includes(el.value) && !groupBlock(v)) { v.groupBy.push(el.value); delete P.errors.groupBy; announce(`${colName(colOf(v, el.value))}: nivelul ${v.groupBy.length} de grupare.`); }
      afterColumnsChange(`#${IDP}-groupby`);
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
      v.filters = v.filters.map((x) => (x.group ? { ...x, rules: x.rules.filter((c) => fieldOf(value, c.field)) } : x)).filter((x) => (x.group ? x.rules.length : fieldOf(value, x.field)));
      trimLevels(v);
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
