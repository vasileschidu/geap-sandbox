/* =====================================================================================
   Administrare › Șabloane de jurnalizare (jurnalizare-v1, 2026-10-30)
   Feature 93589 „Capturarea și configurarea evenimentelor de audit”: US-257 (95896) creare · US-258 (95897) lista ·
   US-259 (95898) editare · US-260 (95899) activare / dezactivare · US-261 (95900) istoric. Spec (plain copy, never
   edit Azure): tools/ui-qa/out/spec/93589-stories.raw.txt.

   A template = the audit policy of one event type (message text, level, destination, action, personal-data flag).
   No new component — the module is the Șabloane de notificare pattern on the shell engine:
     · list = the BO registry (`window.GEAPShellRegistries.jurnalizare`, menu `shellView: "jurnalizare-registry"`):
       tabs Toate · Active, search, Filtre Obiect · Nivel · Destinație · Tip, sort, pager, CSV export, „Șablon nou”,
       row = opens the editor, ⋮ Editează · Activează / Dezactivează; description above the toolbar = the calendar
       intro (`.e-permits-cal-intro`);
     · editor = the shared profile panel (page header: crumbs, Salvează, unsaved status → review modal; meta Cod
       (copy) · Tip · Stare · Obiect · Folosit în) with tabs Mesaj · Setări · Istoric; Mesaj = the ntpl content
       layout (`.e-permits-ntpl-content`, „Inserează câmp” picker `.e-permits-ntpl-picker`, preview card
       `.e-permits-ntpl-preview`); Setări = ntpl cards + the library switch „Activ”; Istoric = GEAPEventTimeline;
     · „Șablon nou” = the ONE drawer + step strip (Setări · Mesaj · Revizuire), review = passport blocks + „Modifică”;
     · deactivate = askConfirm (destructive), activate = immediate; leaving with edits = askConfirm.
   Routes: #sabloane-jurnalizare (list) · #sablon-jurnalizare/<id>/<mesaj|setari|istoric>.
   Demo switch ?jurnalizare= (comma list): vizualizare (view only) · fara-creare · fara-editare · fara-activare ·
   gol (no templates) · eroare (every save fails). Roles: Administrator central = every permission; others none.
   ===================================================================================== */
(function () {
  "use strict";

  const A = () => window.GEAPShellApi || {};
  const U = () => window.GEAPUi || {};
  const G = () => window.GEAPRegistre || {};
  const E = () => window.GEAPEmptyState;
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

  const KIND = "jurnalizare";
  const NAV = "sabloane-jurnalizare";
  const TITLE = "Șabloane de jurnalizare";
  /* US-258 AC-02 */
  const DENIED = "Nu aveți acces la această secțiune.";
  const NAME_MAX = 250;
  const CODE_MAX = 100;
  const TEXT_MAX = 1000;
  const MLOG_WARNING = "Codul șablonului trebuie înregistrat în MLog de AGE, altfel MLog respinge evenimentele.";
  const SYSTEM_LOCK = "Stabilit de sistem pentru șabloanele scrise de aplicație.";
  const SAVE_FAILED = "Șablonul nu a putut fi salvat.";
  const EVENTS = { create: "Crearea șablonului de jurnalizare", edit: "Modificarea șablonului de jurnalizare", on: "Activarea șablonului de jurnalizare", off: "Dezactivarea șablonului de jurnalizare" };
  const LEVEL_TONE = { "Critic": "danger", "Eroare": "danger", "Avertisment": "warning", "Informativ": "neutral" };
  /* the labels of the fields a template can insert (Inserează câmp) */
  const FIELD_LABELS = {
    CaseNumber: "Numărul dosarului", ServiceCode: "Codul serviciului", SuspendedUntil: "Suspendat până la", Reason: "Motivul", LegalBasis: "Temeiul legal",
    Resource: "Resursa", RoleName: "Rolul", ClassifierCode: "Codul clasificatorului", RegisterName: "Denumirea registrului", ActNumber: "Numărul actului",
    PaymentId: "Identificatorul plății", Amount: "Suma", Module: "Modulul", TemplateCode: "Codul șablonului", Attempts: "Numărul de încercări"
  };

  /* ---------------------------------------------------------------- demo switches + who */
  const params = new URLSearchParams(window.location.search);
  const demo = new Set(String(params.get("jurnalizare") || "").split(",").map((s) => s.trim()).filter(Boolean));
  const ALL = ["view", "create", "edit", "toggle"];
  function perms() {
    const a = A().currentAssignment?.() || null;
    if (a?.roleId !== "central-admin") return new Set();
    if (demo.has("vizualizare")) return new Set(["view"]);
    const set = new Set(ALL);
    if (demo.has("fara-creare")) set.delete("create");
    if (demo.has("fara-editare")) set.delete("edit");
    if (demo.has("fara-activare")) set.delete("toggle");
    return set;
  }
  const can = (p) => perms().has(p);
  const roleLabel = () => A().currentAssignment?.()?.roleLabel || "Administrator central";

  /* ---------------------------------------------------------------- data */
  const S = { data: null, loading: null };
  function load() {
    if (S.data) return Promise.resolve(S.data);
    if (!S.loading) {
      S.loading = fetch("data/jurnalizare.json?v=jurnalizare-v1").then((r) => r.json()).then((json) => {
        if (demo.has("gol")) json.templates = [];
        S.data = json;
        return json;
      }).catch(() => { S.data = { templates: [], levels: [], destinations: [], actions: [], objects: [], processFields: [], personalFields: [], samples: {} }; return S.data; });
    }
    return S.loading;
  }
  const templates = () => S.data?.templates || [];
  const tplOf = (id) => templates().find((t) => t.id === id) || null;
  const isSystem = (t) => t?.type === "Sistem";
  const processFields = () => (S.data?.processFields || []).map(([, token]) => token);
  /* „Inserează câmp”: a process template gets the process fields, a system one its own (US-259 assumptions) */
  const fieldsFor = (t) => (t && isSystem(t) ? t.fields || [] : processFields());
  const personalFields = () => S.data?.personalFields || [];

  /* ---------------------------------------------------------------- rules shared by create + edit (US-257) */
  const tokensOf = (text) => [...String(text || "").matchAll(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g)].map((m) => m[1]);
  function messageError(text, fields) {
    const value = String(text || "");
    if (!value.trim()) return "Completați textul mesajului.";
    if (value.length > TEXT_MAX) return `Textul mesajului poate avea cel mult ${TEXT_MAX} de caractere.`;
    const tokens = [...new Set(tokensOf(value))];
    if (tokens.some((t) => personalFields().includes(t))) return "Textul mesajului nu poate conține câmpuri cu date personale.";
    const missing = tokens.filter((t) => !fields.includes(t));
    if (missing.length) return `Câmpuri care nu sunt disponibile pentru acest șablon: ${missing.map((t) => `{{${t}}}`).join(", ")}.`;
    return "";
  }
  function nameError(name) {
    const value = String(name || "").trim();
    if (!value) return "Completați denumirea.";
    if (value.length > NAME_MAX) return `Denumirea poate avea cel mult ${NAME_MAX} de caractere.`;
    return "";
  }
  function codeError(code, selfId = "") {
    const value = String(code || "").trim();
    if (!value || value.length > CODE_MAX || !/^GEAP(\.[A-Z0-9_]+){2}$/.test(value)) return "Codul trebuie să arate ca GEAP.OBIECT.ACȚIUNE: majuscule, cifre și _.";
    if (templates().some((t) => t.code === value && t.id !== selfId)) return "Există deja un șablon cu acest cod.";
    return "";
  }
  /* AC-05: GEAP.CASE.<CUVINTE_CU_SUBLINIERE> — capitals, no diacritics */
  const codeFrom = (name) => {
    const words = String(name || "").normalize("NFD").replace(/\p{M}/gu, "").toUpperCase().replace(/[^A-Z0-9 ]+/g, " ").split(/\s+/).filter(Boolean);
    return words.length ? `GEAP.CASE.${words.join("_")}`.slice(0, CODE_MAX) : "";
  };
  const mlogNotice = (destination) => (/MLog/.test(destination || "") ? U().renderNotice?.("warning", esc(MLOG_WARNING)) || "" : "");

  /* the preview (US-257 AC-20, US-259 AC-08): sample values marked; a field without a sample = [Field] */
  function fillSample(text) {
    const samples = S.data?.samples || {};
    return esc(text || "").replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (match, token) => `<mark class="e-permits-ntpl-preview__token" data-tooltip-text="{{${esc(token)}}}">${esc(samples[token] || `[${token}]`)}</mark>`);
  }
  const previewCard = ({ level, code, name, message }) => `
    <div class="e-permits-ntpl-preview__mail-head e-permits-lgt-preview__head">
      <span class="e-permits-lgt-preview__meta">${tag(level || "Informativ", LEVEL_TONE[level] || "neutral")}<span class="e-permits-ntpl-preview__from">${esc(code || "GEAP.OBIECT.ACȚIUNE")}</span></span>
      <p class="e-permits-ntpl-preview__subject">${esc(name || "Denumirea șablonului")}</p>
    </div>
    <div class="e-permits-ntpl-preview__mail-body">${String(message || "").trim()
      ? `<p>${fillSample(message)}</p>`
      : E()?.render({ title: "Textul mesajului este gol", text: "Scrieți textul care apare în jurnal pentru acest eveniment.", icon: "page-text", bare: true, compact: true }) || ""}</div>`;
  const previewNote = '<p class="e-permits-ntpl-preview__note">Previzualizare cu valori de exemplu.</p>';

  /* „Inserează câmp” — the ntpl stack-menu picker; inserts at the caret of the message */
  function pickerHtml(fields, menuId) {
    const items = fields.map((token) => `
      <li role="none">
        <button class="e-permits-fo-intent-menu__item e-permits-ntpl-picker__item" type="button" role="menuitem" data-lgt-token="{{${esc(token)}}}">
          <span class="e-permits-ntpl-picker__label">${esc(FIELD_LABELS[token] || token)}</span>
          <span class="e-permits-ntpl-picker__token">{{${esc(token)}}}</span>
        </button>
      </li>`).join("");
    return `
      <div class="e-permits-stack__menu-wrap">
        <button class="btn btn-secondary btn-sm" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="${menuId}" data-stack-menu-trigger>
          <span>Inserează câmp</span>${icon("chevron-bottom", 16)}
        </button>
        <div class="e-permits-fo-intent-menu e-permits-stack__menu e-permits-ntpl-picker" id="${menuId}" hidden data-stack-menu>
          <ul class="e-permits-ntpl-picker__list" role="menu" aria-label="Câmpuri">${items}</ul>
        </div>
      </div>`;
  }

  /* ---- form pieces (the BO form vocabulary: .e-permits-fo-field in .e-permits-user-create__grid) */
  const req = () => U().requiredMark?.() || "";
  const errorHtml = (id, msg) => `<span class="message message--inline message--error e-permits-fo-field__error" id="${id}-error">${icon("circle-error-filled")}<span>${esc(msg)}</span></span>`;
  const hintRow = (id, hint, count, max) => `<p class="e-permits-fo-field__hint e-permits-ntpl-count" id="${id}-hint"><span>${esc(hint)}</span><span class="e-permits-ntpl-count__value${count > max ? " is-over" : ""}" data-lgt-count="${id}">${count}/${max}</span></p>`;
  function textField(id, key, label, value, { required = false, max = 0, hint = "", error = "", span = 12, counter = false, readonly = false } = {}) {
    const count = String(value || "").length;
    const described = error ? `${id}-error` : hint || counter ? `${id}-hint` : "";
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
        <label for="${id}">${esc(label)}${required ? req() : ""}</label>
        <div class="e-permits-fo-input${error ? " is-error" : ""}${readonly ? " is-filled is-readonly" : ""}">
          <input id="${id}" type="text" value="${esc(value)}" autocomplete="off"${readonly ? " readonly" : ""}${required ? ' aria-required="true"' : ""}${error ? ' aria-invalid="true"' : ""}${described ? ` aria-describedby="${described}"` : ""} data-lgt-field="${key}">
        </div>
        ${error ? errorHtml(id, error) : counter ? hintRow(id, hint, count, max) : hint ? `<p class="e-permits-fo-field__hint" id="${id}-hint">${esc(hint)}</p>` : ""}
      </div>`;
  }
  function selectField(id, key, label, options, value, { required = false, placeholder = "", hint = "", error = "", span = 6, disabled = false } = {}) {
    const optionsHtml = `${placeholder ? `<option value=""${value ? "" : " selected"}>${esc(placeholder)}</option>` : ""}${options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(value) ? " selected" : ""}>${esc(l)}</option>`).join("")}`;
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
        <label for="${id}">${esc(label)}${required ? req() : ""}</label>
        ${U().renderFoSelectControl?.({ id, attrs: `data-lgt-field="${key}"`, optionsHtml, error: Boolean(error), disabled }) || ""}
        ${error ? errorHtml(id, error) : hint ? `<p class="e-permits-fo-field__hint" id="${id}-hint">${esc(hint)}</p>` : ""}
      </div>`;
  }
  function messageField(id, value, { error = "", readonly = false, labelledBy = "" } = {}) {
    const count = String(value || "").length;
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
        <div class="e-permits-fo-textarea${error ? " is-error" : ""}"><textarea id="${id}" rows="6"${labelledBy ? ` aria-labelledby="${labelledBy}"` : ""} aria-required="true"${error ? ` aria-invalid="true" aria-describedby="${id}-error ${id}-hint"` : ` aria-describedby="${id}-hint"`}${readonly ? " readonly" : ""} spellcheck="true" data-lgt-field="message" data-lgt-message>${esc(value)}</textarea></div>
        ${error ? errorHtml(id, error) : ""}
        ${hintRow(id, readonly ? "" : "Câmpul se inserează în poziția cursorului.", count, TEXT_MAX)}
      </div>`;
  }
  const opts = (list) => list.map((v) => [v, v]);
  const section = (title, body) => `<section class="e-permits-user-create__section"><h3 class="e-permits-user-create__section-title">${esc(title)}</h3><div class="e-permits-user-create__section-content">${body}</div></section>`;
  const grid = (...parts) => `<div class="e-permits-user-create__grid">${parts.join("")}</div>`;
  const full = (html) => (html ? `<div class="e-permits-user-create__field e-permits-user-create__field--12">${html}</div>` : "");

  /* ================================================================ LIST (US-258) */
  const LEVEL_ORDER = ["Informativ", "Avertisment", "Eroare", "Critic"];
  const rowOf = (t) => ({
    id: t.id, cod: t.code, denumire: t.name, obiect: t.object, actiune: t.action, nivel: t.level, destinatie: t.destination,
    personale: t.personal ? "Da" : "Nu", tip: t.type, actualizat: t.updatedAt || "", stare: t.active ? "Activ" : "Inactiv", active: t.active, t
  });
  function registryDb() {
    if (!S.data) load().then(() => { if (document.querySelector(`[data-workplace][data-registry-kind="${KIND}"]`)) refreshList(); });
    const menu = can("view");
    return {
      kind: KIND,
      fixedWidths: true,
      fieldCount: 10,
      defaultSort: "cod",
      defaultSortDirection: "asc",
      columns: {
        cod: { label: "Cod", width: 296, sortable: true },
        denumire: { label: "Denumire", width: 320, sortable: true },
        obiect: { label: "Obiect", width: 176 },
        actiune: { label: "Acțiune", width: 144 },
        nivel: { label: "Nivel", width: 136, sortable: true },
        destinatie: { label: "Destinație", width: 144 },
        personale: { label: "Date personale", width: 136 },
        tip: { label: "Tip", width: 104 },
        actualizat: { label: "Actualizat", width: 184, sortable: true },
        stare: { label: "Stare", width: 112, sortable: true },
        ...(menu ? { actiuni: { label: "", width: 56, pin: "end" } } : {})
      },
      views: {
        [KIND]: {
          title: TITLE,
          selectable: false,
          searchPlaceholder: "Caută după cod sau denumire",
          columns: ["cod", "denumire", "obiect", "actiune", "nivel", "destinatie", "personale", "tip", "actualizat", "stare", ...(menu ? ["actiuni"] : [])],
          tabs: [{ id: "toate", label: "Toate", filter: "all" }, { id: "active", label: "Active", filter: "state:active" }],
          defaultTab: "toate",
          primaryAction: can("create") ? { id: "lgt-new", label: "Șablon nou" } : null,
          toolbarLabel: "Filtrare șabloane",
          exportLabel: "Exportă CSV"
        }
      },
      runtimeRows: can("view") ? templates().map(rowOf) : []
    };
  }
  const SORT = {
    nivel: (r) => String(LEVEL_ORDER.indexOf(r.nivel)),
    actualizat: (r) => r.actualizat || "0000",
    stare: (r) => (r.active ? "0" : "1")
  };
  function rowMenu(row) {
    const items = [
      { label: "Editează", icon: "edit", attrs: `data-lgt-row-edit="${esc(row.id)}"` },
      can("toggle") && (row.active
        ? { label: "Dezactivează", icon: "pause", attrs: `data-lgt-row-toggle="${esc(row.id)}"` }
        : { label: "Activează", icon: "checkmark-large", attrs: `data-lgt-row-toggle="${esc(row.id)}"` })
    ].filter(Boolean);
    const html = U().renderRowActions?.({ menu: items, label: row.cod }) || "";
    return html ? `<span class="e-permits-workplace__row-actions">${html.replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>")}</span>` : "";
  }
  window.GEAPShellRegistries = window.GEAPShellRegistries || {};
  window.GEAPShellRegistries[KIND] = {
    build: registryDb,
    get facets() {
      return [
        { key: "obiect", label: "Obiect", get: (row) => row.obiect },
        { key: "nivel", label: "Nivel", get: (row) => row.nivel },
        { key: "destinatie", label: "Destinație", get: (row) => row.destinatie },
        { key: "tip", label: "Tip", get: (row) => row.tip }
      ];
    },
    /* AC-07: code + name, case and diacritics ignored (both spellings searchable) */
    searchText: (row) => `${row.cod} ${row.denumire} ${fold(row.cod)} ${fold(row.denumire)}`,
    sortValue: (row, key) => String(SORT[key]?.(row) ?? row[key] ?? ""),
    filterToken: (row, token) => (token === "state:active" ? row.active : true),
    rowClass: (row) => (row.active ? "" : "is-inactive"),
    renderCell: (row, key) => {
      switch (key) {
        case "cod": return `<span data-cell-tooltip="${esc(row.cod)}">${esc(row.cod)}</span>`;
        case "denumire": return `<span data-cell-tooltip="${esc(row.denumire)}">${esc(row.denumire)}</span>`;
        /* AC-04 */
        case "nivel": return tag(row.nivel, LEVEL_TONE[row.nivel]);
        /* AC-06: the last AdminPortal change, „—” for an untouched template */
        case "actualizat": return row.actualizat ? `
          <span class="e-permits-workplace__date-stack">
            <span>${esc(longDate(row.actualizat))}</span>
            <span class="e-permits-workplace__date-meta">${esc(`${time(row.actualizat)} · ${row.t.updatedBy || ""}`)}</span>
          </span>` : dash;
        case "stare": return tag(row.stare, row.active ? "success" : "neutral");
        case "actiuni": return rowMenu(row);
        default: return esc(row[key] ?? "") || dash;
      }
    },
    /* AC-12 */
    openRow: (id) => openEditor(id, "mesaj"),
    rowLabel: (row) => `${row.cod}, ${row.denumire} — deschide editorul șablonului`,
    emptyHtml: ({ query, filtered }) => {
      if (!can("view")) return E()?.render({ title: DENIED, icon: "lock", bare: true });
      if (!S.data) return E()?.render({ title: "Se încarcă șabloanele…", loading: true, bare: true });
      /* AC-15 / AC-14 */
      if (query || filtered) return E()?.noResults?.("Nu s-au găsit rezultate", { text: "Caută după cod sau denumire, sau schimbă filtrele.", bare: true });
      return E()?.render({
        title: "Nu există șabloane de jurnalizare.",
        text: can("create") ? "Creați primul șablon cu „Șablon nou”." : "",
        icon: "checklist",
        bare: true,
        actionHtml: can("create") ? '<button class="btn btn-primary btn-sm" type="button" data-lgt-new>Șablon nou</button>' : ""
      });
    },
    exportRows: (rows) => exportCsv(rows),
    exportState: () => (can("view") ? {} : { hidden: true })
  };
  function refreshList() {
    const reg = document.querySelector(`[data-workplace][data-registry-kind="${KIND}"]`);
    const st = A().workplaceState;
    if (!reg || !st || reg.closest("[hidden]") || reg.hidden) return;
    st.rows = registryDb().runtimeRows;
    A().renderWorkplace?.();
  }

  /* AC-17 / AC-18: the visible columns of every template found by the search, tab and filters — CSV, as every BO
     list (user decision gh-01e: BO list exports are CSV; the story says XLSX — PO question) */
  function exportCsv(rows) {
    const head = ["Cod", "Denumire", "Obiect", "Acțiune", "Nivel", "Destinație", "Date personale", "Tip", "Actualizat", "Stare"];
    const lines = rows.map((r) => [r.cod, r.denumire, r.obiect, r.actiune, r.nivel, r.destinatie, r.personale, r.tip, r.actualizat ? `${longDate(r.actualizat)} ${time(r.actualizat)}` : "-", r.stare]);
    const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const blob = new Blob([`﻿${[head, ...lines].map((l) => l.map(cell).join(";")).join("\r\n")}`], { type: "text/csv;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "sabloane-jurnalizare.csv" });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(`Am exportat ${plural(rows.length, "șablon", "șabloane")} în sabloane-jurnalizare.csv.`);
  }

  /* no description above the toolbar (user 2026-10-30: „no need” — deviates from US-258 AC-02, PO point) */
  function syncChrome() {}
  const observeRegistry = () => {
    const reg = document.querySelector("[data-workplace]");
    if (!reg || reg.dataset.lgtObserved) return;
    reg.dataset.lgtObserved = "1";
    new MutationObserver(syncChrome).observe(reg, { attributes: true, attributeFilter: ["data-registry-kind"] });
  };

  /* ---------------------------------------------------------------- activate / deactivate (US-260) */
  function logEvent(t, kind, detail = "") {
    t.history = t.history || [];
    t.history.unshift({ at: nowIso(), by: userName(), role: roleLabel(), event: EVENTS[kind], detail });
    t.updatedAt = nowIso();
    t.updatedBy = userName();
  }
  function setActive(t, on, after) {
    if (!can("toggle")) return;
    const apply = () => {
      if (demo.has("eroare")) { toast(SAVE_FAILED, "error"); after?.(false); return; }
      t.active = on;
      logEvent(t, on ? "on" : "off");
      after?.(true);
    };
    /* AC-03: activation without confirmation · AC-09 / AC-10 / AC-17: deactivation confirmed */
    if (on) { apply(); return; }
    const used = !isSystem(t) && t.usedIn ? ` Șablonul este folosit în ${plural(t.usedIn, "proces", "procese")}: pașii lor de jurnal nu vor înregistra nimic.` : "";
    U().askConfirm?.({
      title: `Dezactivați șablonul „${t.name}”?`,
      text: `Evenimentul nu va mai fi înregistrat în jurnal și nu va fi transmis în MLog.${used}`,
      confirmLabel: "Dezactivează",
      destructive: true
    }, apply);
  }

  /* ================================================================ EDITOR (US-259 + US-261) */
  const P = { id: null, tab: "mesaj", draft: null, errors: {}, saveError: false, lockError: false, caret: null };
  const TABS = [["mesaj", "Mesaj"], ["setari", "Setări"], ["istoric", "Istoric"]];
  const draftOf = (t) => ({ name: t.name, message: t.message, level: t.level, destination: t.destination, action: t.action, personal: Boolean(t.personal) });
  const DRAFT_LABELS = { name: ["Denumire", "Setări"], message: ["Textul mesajului", "Mesaj"], level: ["Nivel", "Setări"], destination: ["Destinație", "Setări"], action: ["Acțiune", "Setări"], personal: ["Evenimentul privește date personale", "Setări"] };
  const changedKeys = () => {
    const t = tplOf(P.id);
    if (!t || !P.draft) return [];
    const base = draftOf(t);
    return Object.keys(base).filter((k) => base[k] !== P.draft[k]);
  };
  const dirty = () => changedKeys().length > 0;
  const editorOpen = () => Boolean(P.id) && !document.querySelector("[data-dosar-profil]")?.hidden && A().els?.dosarProfilPanelBody?.id === "lgt-panel";

  async function openEditor(id, tab = "mesaj", { push = true } = {}) {
    await load();
    const t = tplOf(id);
    if (!can("view") || !t) { showDenied(); return; }
    if (P.id !== id || !P.draft) { P.draft = draftOf(t); P.errors = {}; P.saveError = false; P.lockError = false; P.caret = null; }
    registerChangeSource();
    P.id = id;
    P.tab = TABS.some(([k]) => k === tab) ? tab : "mesaj";
    A().setActiveNav?.(NAV);
    A().openProfilePanel?.();
    renderEditor();
    A().writeHash?.(`#sablon-jurnalizare/${id}/${P.tab}`, { push });
    A().els?.dosarProfilPanel?.scrollIntoView?.({ block: "start" });
  }
  function closeEditor() {
    P.id = null; P.draft = null;
    document.querySelector(`[data-nav-item][data-nav-id="${NAV}"]`)?.click();
  }

  function headerActions() {
    if (!can("edit")) return "";
    const d = dirty();
    return `
      ${d ? '<button class="btn btn-neutral btn-sm" type="button" data-lgt-discard>Renunță</button>' : ""}
      <button class="btn btn-primary btn-sm" type="button" data-lgt-save${d ? "" : ' aria-disabled="true" data-tooltip-reason="Nu există modificări de salvat."'}>Salvează</button>`;
  }
  function renderEditor({ keep = "" } = {}) {
    const t = tplOf(P.id);
    const els = A().els || {};
    if (!t || !els.dosarProfilTitleRow) return;
    const active = document.activeElement;
    const keepSel = keep || (active && els.dosarProfilPanelBody?.contains(active) && active.id ? `#${CSS.escape(active.id)}` : "");
    const caret = active && "selectionStart" in active ? [active.selectionStart, active.selectionEnd] : null;
    const n = changedKeys().length;
    els.dosarProfilTitleRow.innerHTML = A().renderPageHeaderTop({
      crumbs: [{ label: TITLE, attr: "data-lgt-back" }, { label: t.name }],
      title: t.name,
      actions: headerActions(),
      status: n ? A().renderHeaderStatus?.(n === 1 ? "1 modificare nesalvată" : `${n} modificări nesalvate`, "warning", A().changesStatusAttrs?.("lgt-draft")) || "" : "",
      caption: t.updatedAt ? `Actualizat ${longDate(t.updatedAt)}, ${time(t.updatedAt)} · ${t.updatedBy || ""}` : ""
    });
    /* AC-02 / AC-03 */
    els.dosarProfilSummary.innerHTML = A().renderPageHeaderMeta([
      ["Cod", A().renderProfileCopyCode?.(t.code, `Copiază ${t.code}`) || esc(t.code)],
      ["Tip", esc(t.type)],
      ["Stare", tag(t.active ? "Activ" : "Inactiv", t.active ? "success" : "neutral")],
      ["Obiect", esc(t.object)],
      ...(isSystem(t) ? [] : [["Folosit în", esc(plural(t.usedIn || 0, "proces", "procese"))]])
    ]);
    A().watchPageHeaderMeta?.(els.dosarProfilSummary);
    const count = { istoric: Math.min((t.history || []).length, 100) };
    els.dosarProfilTabs.innerHTML = TABS.map(([id, label]) => {
      const on = id === P.tab;
      return `<button class="tab-button${on ? " active" : ""}" id="lgt-tab-${id}" type="button" role="tab" aria-controls="lgt-panel" aria-selected="${on}" tabindex="${on ? 0 : -1}" data-lgt-tab="${id}">
        <span>${label}</span>${count[id] ? A().renderPageHeaderTabCount?.(count[id]) || "" : ""}
      </button>`;
    }).join("");
    const body = els.dosarProfilPanelBody;
    body.id = "lgt-panel";
    body.setAttribute("role", "tabpanel");
    body.setAttribute("aria-labelledby", `lgt-tab-${P.tab}`);
    body.innerHTML = `${notices(t)}${P.tab === "setari" ? settingsTab(t) : P.tab === "istoric" ? historyTab(t) : messageTab(t)}`;
    if (keepSel) {
      const el = document.querySelector(keepSel);
      el?.focus?.({ preventScroll: true });
      if (caret && el && "setSelectionRange" in el) { try { el.setSelectionRange(caret[0], caret[1]); } catch { /* not text */ } }
    }
  }
  /* AC-15 (inactive, every tab) · AC-19 / US-260 save error · AC-13 (system field change refused) */
  function notices(t) {
    const list = [
      P.saveError && U().renderNotice?.("error", esc(SAVE_FAILED), { role: "alert" }),
      P.lockError && U().renderNotice?.("error", "Acțiunea și indicatorul de date personale ale unui șablon de sistem nu pot fi modificate.", { role: "alert" }),
      !t.active && U().renderNotice?.("warning", "<strong>Șablonul este inactiv:</strong> evenimentul nu se înregistrează în jurnal și nu se transmite în MLog.")
    ].filter(Boolean).join("");
    return list ? `<div class="e-permits-reg-notices">${list}</div>` : "";
  }
  function messageTab(t) {
    const ro = !can("edit");
    const d = P.draft;
    return `
      <div class="e-permits-ntpl-content">
        <div class="e-permits-ntpl-content__main">
          <section class="e-permits-dosar-profil__section">
            <div class="e-permits-dosar-profil__section-heading">
              <h2 class="e-permits-dosar-profil__section-title" id="lgt-message-title">Textul mesajului${ro ? "" : req()}</h2>
              ${ro ? "" : `<div class="e-permits-passport__heading-tools">${pickerHtml(fieldsFor(t), "lgt-picker")}</div>`}
            </div>
            <div class="e-permits-ntpl-card">${messageField("lgt-message", d.message, { error: P.errors.message, readonly: ro, labelledBy: "lgt-message-title" })}</div>
          </section>
        </div>
        <aside class="e-permits-ntpl-content__preview" aria-labelledby="lgt-preview-title">
          <div class="e-permits-dosar-profil__section-heading">
            <h2 class="e-permits-dosar-profil__section-title" id="lgt-preview-title">Previzualizare</h2>
          </div>
          <div class="e-permits-ntpl-preview" aria-live="polite" data-lgt-preview>${previewCard({ ...d, code: t.code })}</div>
          ${previewNote}
        </aside>
      </div>`;
  }
  function settingsTab(t) {
    const ro = !can("edit");
    const sys = isSystem(t);
    const d = P.draft;
    const e = P.errors;
    const L = S.data || {};
    return `
      <section class="e-permits-dosar-profil__section">
        <h2 class="e-permits-dosar-profil__section-title">Eveniment</h2>
        <div class="e-permits-ntpl-card">${grid(
          textField("lgt-name", "name", "Denumire", d.name, { required: true, max: NAME_MAX, counter: !ro, hint: "Apare în Jurnalul de audit și în designerul de procese.", error: e.name, readonly: ro }),
          selectField("lgt-action", "action", "Acțiune", opts(L.actions || []), d.action, { required: true, error: e.action, disabled: ro || sys, hint: sys ? SYSTEM_LOCK : "" }),
          full(`${U().renderCheckOption?.({ label: "Evenimentul privește date personale", checked: d.personal, disabled: ro || sys, reason: sys ? SYSTEM_LOCK : "", attrs: 'data-lgt-field="personal"' }) || ""}${sys ? `<p class="e-permits-fo-field__hint">${esc(SYSTEM_LOCK)}</p>` : ""}`)
        )}</div>
      </section>
      <section class="e-permits-dosar-profil__section">
        <h2 class="e-permits-dosar-profil__section-title">Înregistrare și transmitere</h2>
        <div class="e-permits-ntpl-card">${grid(
          selectField("lgt-level", "level", "Nivel", opts(L.levels || []), d.level, { required: true, disabled: ro }),
          selectField("lgt-destination", "destination", "Destinație", opts(L.destinations || []), d.destination, { required: true, disabled: ro }),
          full(mlogNotice(d.destination)),
          full(U().renderInfoNote?.("Nivelul și destinația modificate se aplică doar evenimentelor următoare; evenimentele deja înregistrate nu se schimbă.") || "")
        )}</div>
      </section>
      ${can("toggle") ? `
      <section class="e-permits-dosar-profil__section">
        <h2 class="e-permits-dosar-profil__section-title">Stare</h2>
        <div class="e-permits-ntpl-card">${U().renderToggle?.({ label: "Activ", description: "Un șablon inactiv nu înregistrează evenimentul în jurnal și nu îl transmite în MLog. Se aplică imediat.", checked: t.active, attrs: "data-lgt-active" }) || ""}</div>
      </section>` : ""}`;
  }
  /* US-261: the last 100 changes, newest first; read-only */
  function historyTab(t) {
    const events = (t.history || []).slice(0, 100).map((h) => ({ at: h.at, user: h.by, role: h.role, type: h.event, status: "Reușit", detail: h.detail || "" }));
    return window.GEAPEventTimeline?.html("Istoricul modificărilor", events, {
      meta: events.length ? "Cele mai noi primele" : "",
      empty: "Pentru acest șablon nu s-au înregistrat încă modificări."
    }) || "";
  }

  /* validation of the draft (US-259 AC-07 = US-257 rules); a failed save jumps to the tab with the error */
  function validateDraft(t) {
    const d = P.draft;
    const errors = {};
    const n = nameError(d.name); if (n) errors.name = n;
    if (!d.action) errors.action = "Alegeți acțiunea.";
    const m = messageError(d.message, fieldsFor(t)); if (m) errors.message = m;
    return errors;
  }
  function save() {
    const t = tplOf(P.id);
    if (!t || !can("edit") || !dirty()) return;
    P.errors = validateDraft(t);
    if (Object.keys(P.errors).length) {
      P.tab = P.errors.message ? "mesaj" : "setari";
      renderEditor({ keep: P.errors.message ? "#lgt-message" : P.errors.name ? "#lgt-name" : "#lgt-action" });
      A().writeHash?.(`#sablon-jurnalizare/${t.id}/${P.tab}`, { push: false });
      return;
    }
    /* AC-19 */
    if (demo.has("eroare")) { P.saveError = true; renderEditor(); return; }
    const keys = changedKeys();
    if (isSystem(t) && keys.some((k) => k === "action" || k === "personal")) { P.lockError = true; renderEditor(); return; }
    Object.assign(t, { ...P.draft, name: P.draft.name.trim() });
    /* AC-20 */
    logEvent(t, "edit", keys.map((k) => DRAFT_LABELS[k][0]).join(", "));
    P.draft = draftOf(t); P.saveError = false; P.lockError = false;
    renderEditor({ keep: "[data-lgt-save]" });
    toast("Modificările au fost salvate.");
  }
  function discard() {
    const t = tplOf(P.id);
    if (!t) return;
    P.draft = draftOf(t); P.errors = {}; P.saveError = false; P.lockError = false;
    renderEditor();
  }
  /* the shared review modal (header status → „N modificări nesalvate”) */
  /* the shell API exists only after the shell has booted: register on first use (openEditor), not at load */
  let changeSourceDone = false;
  const registerChangeSource = () => { if (!changeSourceDone && A().registerChangeSource) { changeSourceDone = true; A().registerChangeSource("lgt-draft", lgtChangeSource); } };
  const lgtChangeSource = () => {
    const t = tplOf(P.id);
    if (!t || !P.draft) return null;
    const base = draftOf(t);
    const show = (k, v) => (k === "personal" ? (v ? "Da" : "Nu") : A().changeValue?.(v) ?? String(v));
    return {
      name: t.name, applies: "se aplică după Salvează", emptyText: "Șablonul este salvat.", groups: ["Mesaj", "Setări"],
      entries: () => changedKeys().map((k) => ({ undo: k, group: DRAFT_LABELS[k][1], title: DRAFT_LABELS[k][0], tag: ["Modificat", "brand"], detail: `${show(k, base[k])} → ${show(k, P.draft[k])}` })),
      undo: (k) => { P.draft[k] = base[k]; delete P.errors[k]; renderEditor(); },
      discard,
      save
    };
  };
  /* demo / probe: the server refuses a change of a system template's action or personal flag (US-259 AC-13) */
  function tryLockedChange() {
    const t = tplOf(P.id);
    if (!t || !isSystem(t)) return;
    P.lockError = true;
    renderEditor();
  }

  /* ---------------------------------------------------------------- leaving with unsaved edits (AC-17) */
  let leaving = false;
  function guardLeave(event, proceed) {
    if (leaving || !editorOpen() || !dirty()) return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    U().askConfirm?.({
      title: "Există modificări nesalvate. Părăsiți editorul?",
      text: "Modificările nesalvate ale șablonului se pierd.",
      confirmLabel: "Părăsește editorul",
      cancelLabel: "Rămâi în editor",
      destructive: true
    }, () => { P.draft = null; leaving = true; try { proceed(); } finally { leaving = false; } });
    return true;
  }
  document.addEventListener("click", (event) => {
    const nav = event.target.closest?.("[data-nav-item]");
    if (nav) { guardLeave(event, () => nav.click()); return; }
    const back = event.target.closest?.("[data-lgt-back]");
    if (back && guardLeave(event, () => closeEditor())) return;
  }, true);
  window.addEventListener("beforeunload", (event) => { if (editorOpen() && dirty()) { event.preventDefault(); event.returnValue = ""; } });

  /* ================================================================ CREATE (US-257) — drawer + step strip */
  const STEPS = ["Setări", "Mesaj", "Revizuire"];
  let C = null;
  let drawer = null;
  function ensureDrawer() {
    if (drawer) return drawer;
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="drawer-overlay" data-lgt-drawer hidden>
        <button class="drawer-overlay__scrim" type="button" aria-label="Închide" data-lgt-close></button>
        <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="lgt-drawer-title" tabindex="-1">
          <header class="drawer__header">
            <div class="drawer__heading">
              <h2 class="drawer__title" id="lgt-drawer-title">Șablon nou</h2>
              <p class="drawer__subtitle">Șablon de proces · obiect Dosar</p>
            </div>
            <button class="modal-close" type="button" aria-label="Închide" data-lgt-close>${icon("cross-large", 16)}</button>
          </header>
          <nav class="e-permits-steps-strip" aria-label="Pașii creării" data-lgt-steps></nav>
          <div class="drawer__body" data-lgt-drawer-body></div>
          <footer class="drawer__footer">
            <span class="e-permits-rt__summary" data-lgt-summary aria-live="polite"></span>
            <div class="modal-buttons" data-lgt-buttons></div>
          </footer>
        </aside>
      </div>`;
    drawer = wrap.firstElementChild;
    document.body.appendChild(drawer);
    return drawer;
  }
  const copyOptions = () => templates().filter((t) => t.type === "Proces" || t.usable).map((t) => [t.id, `${t.name} · ${t.code}`]);
  function openCreate() {
    if (!can("create")) return;
    C = { step: 1, maxStep: 1, errors: {}, saveError: false, back: document.activeElement, caret: null,
      v: { name: "", code: "", codeTouched: false, copyFrom: "", level: "Informativ", destination: "Jurnal", action: "", personal: false, message: "" } };
    const d = ensureDrawer();
    renderCreate();
    if (window.GEAPDrawer?.open) window.GEAPDrawer.open(d, { focus: "#lgt-c-name" });
    else { d.hidden = false; document.body.classList.add("is-drawer-open"); requestAnimationFrame(() => d.querySelector("#lgt-c-name")?.focus()); }
  }
  function closeCreate(force = false) {
    if (!drawer || drawer.hidden) return;
    const v = C?.v;
    const touched = v && (v.name || v.code || v.action || v.message || v.copyFrom);
    const close = () => {
      C = null;
      if (window.GEAPDrawer?.close) window.GEAPDrawer.close(drawer); else { drawer.hidden = true; document.body.classList.remove("is-drawer-open"); }
    };
    if (force || !touched) { close(); return; }
    U().askConfirm?.({ title: "Renunțați la șablonul nou?", text: "Datele completate nu se păstrează.", confirmLabel: "Renunță", destructive: true }, close);
  }
  function stepSettings() {
    const v = C.v, e = C.errors, L = S.data || {};
    return `
      ${section("Identificare", grid(
        textField("lgt-c-name", "name", "Denumire", v.name, { required: true, max: NAME_MAX, counter: true, hint: "Apare în Jurnalul de audit și în designerul de procese.", error: e.name }),
        textField("lgt-c-code", "code", "Cod", v.code, { required: true, hint: "Se completează din denumire. Nu se poate modifica după creare.", error: e.code }),
        selectField("lgt-c-copy", "copyFrom", "Copiere din", [["", "Zero"], ...copyOptions()], v.copyFrom, { span: 12, hint: "Preia textul și parametrii unui șablon existent." })
      ))}
      ${section("Parametri", grid(
        selectField("lgt-c-level", "level", "Nivel", opts(L.levels || []), v.level, { required: true }),
        selectField("lgt-c-destination", "destination", "Destinație", opts(L.destinations || []), v.destination, { required: true }),
        full(mlogNotice(v.destination)),
        selectField("lgt-c-action", "action", "Acțiune", opts(L.actions || []), v.action, { required: true, placeholder: "Alegeți acțiunea", error: e.action }),
        full(U().renderCheckOption?.({ label: "Evenimentul privește date personale", checked: v.personal, attrs: 'data-lgt-field="personal"' }) || "")
      ))}`;
  }
  /* the editor's Mesaj layout, stacked: the message card + „Inserează câmp”, then the preview */
  function stepMessage() {
    const v = C.v;
    return `
      <section class="e-permits-dosar-profil__section">
        <div class="e-permits-dosar-profil__section-heading">
          <h2 class="e-permits-dosar-profil__section-title" id="lgt-c-message-title">Textul mesajului${req()}</h2>
          <div class="e-permits-passport__heading-tools">${pickerHtml(processFields(), "lgt-c-picker")}</div>
        </div>
        <div class="e-permits-ntpl-card">${messageField("lgt-c-message", v.message, { error: C.errors.message, labelledBy: "lgt-c-message-title" })}</div>
      </section>
      <section class="e-permits-dosar-profil__section">
        <div class="e-permits-dosar-profil__section-heading">
          <h2 class="e-permits-dosar-profil__section-title">Previzualizare</h2>
        </div>
        <div class="e-permits-ntpl-preview" aria-live="polite" data-lgt-preview>${previewCard(v)}</div>
        ${previewNote}
      </section>`;
  }
  function stepReview() {
    const v = C.v;
    const goto = (n) => `<button class="btn btn-text-primary btn-sm" type="button" data-lgt-goto="${n}">Modifică</button>`;
    const block = (title, rows, n) => A().renderPassportBlock?.(title, rows, { actionHtml: goto(n) }) || "";
    const copy = v.copyFrom ? tplOf(v.copyFrom) : null;
    return `
      ${block("Setări", [
        ["Denumire", esc(v.name.trim())],
        ["Cod", esc(v.code.trim())],
        ["Copiere din", copy ? esc(`${copy.name} · ${copy.code}`) : "Zero"],
        ["Nivel", tag(v.level, LEVEL_TONE[v.level])],
        ["Destinație", esc(v.destination)],
        ["Acțiune", esc(v.action)],
        ["Date personale", v.personal ? "Da" : "Nu"]
      ], 1)}
      ${block("Mesaj", [["Textul mesajului", `<span>${fillSample(v.message)}</span>`]], 2)}
      ${U().renderInfoNote?.("Șablonul se creează <strong>activ</strong>, de tip Proces, cu obiectul Dosar, și apare imediat la pasul „Jurnal de audit: înregistrare” din designerul de procese.") || ""}`;
  }
  function renderCreate({ keep = "" } = {}) {
    if (!C || !drawer) return;
    const active = document.activeElement;
    const keepSel = keep || (active && drawer.contains(active) && active.id ? `#${CSS.escape(active.id)}` : "");
    const caret = active && "selectionStart" in active ? [active.selectionStart, active.selectionEnd] : null;
    drawer.querySelector("[data-lgt-steps]").innerHTML = A().renderStepStrip?.(STEPS, C, "data-lgt-goto") || "";
    const body = drawer.querySelector("[data-lgt-drawer-body]");
    body.innerHTML = `${C.saveError ? `<div class="e-permits-reg-notices">${U().renderNotice?.("error", esc(SAVE_FAILED), { role: "alert" }) || ""}</div>` : ""}<div class="e-permits-clas-create">${[stepSettings, stepMessage, stepReview][C.step - 1]()}</div>`;
    drawer.querySelector("[data-lgt-summary]").textContent = `Pasul ${C.step} din ${STEPS.length} · ${STEPS[C.step - 1]}`;
    drawer.querySelector("[data-lgt-buttons]").innerHTML = `
      ${C.step === 1 ? '<button class="btn btn-neutral btn-rounded" type="button" data-lgt-close>Anulează</button>' : '<button class="btn btn-neutral btn-rounded" type="button" data-lgt-prev>Înapoi</button>'}
      ${C.step < STEPS.length ? '<button class="btn btn-primary btn-rounded" type="button" data-lgt-next>Continuă</button>' : '<button class="btn btn-primary btn-rounded" type="button" data-lgt-create>Creează șablonul</button>'}`;
    if (keepSel) {
      const el = drawer.querySelector(keepSel);
      el?.focus?.({ preventScroll: true });
      if (caret && el && "setSelectionRange" in el) { try { el.setSelectionRange(caret[0], caret[1]); } catch { /* not text */ } }
    }
  }
  function validateStep(step) {
    const v = C.v, errors = {};
    if (step === 1) {
      const n = nameError(v.name); if (n) errors.name = n;
      const c = codeError(v.code); if (c) errors.code = c;
      if (!v.action) errors.action = "Alegeți acțiunea.";
    }
    if (step === 2) { const m = messageError(v.message, processFields()); if (m) errors.message = m; }
    return errors;
  }
  const FIRST_ERROR = { name: "#lgt-c-name", code: "#lgt-c-code", action: "#lgt-c-action", message: "#lgt-c-message" };
  function goStep(target) {
    /* forward validates every step on the way; back is free */
    for (let s = C.step; s < target; s += 1) {
      const errors = validateStep(s);
      if (Object.keys(errors).length) {
        C.step = s; C.errors = errors;
        renderCreate({ keep: FIRST_ERROR[Object.keys(errors)[0]] });
        return;
      }
    }
    C.errors = {};
    C.step = target;
    C.maxStep = Math.max(C.maxStep, target);
    renderCreate();
    drawer.querySelector(".drawer__body").scrollTop = 0;
    (drawer.querySelector(target === 2 ? "#lgt-c-message" : "[data-lgt-create], [data-lgt-next]"))?.focus();
  }
  function create() {
    for (const s of [1, 2]) {
      const errors = validateStep(s);
      if (Object.keys(errors).length) { C.step = s; C.errors = errors; renderCreate({ keep: FIRST_ERROR[Object.keys(errors)[0]] }); return; }
    }
    /* AC-23 */
    if (demo.has("eroare")) { C.saveError = true; renderCreate(); drawer.querySelector(".drawer__body").scrollTop = 0; return; }
    const v = C.v;
    const id = `lgt-${v.code.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^geap-/, "")}`;
    /* AC-22: Activ, Proces, Dosar · AC-24: logged */
    const t = { id, code: v.code.trim(), name: v.name.trim(), message: v.message, level: v.level, destination: v.destination, action: v.action, object: "Dosar", personal: v.personal, type: "Proces", active: true, usedIn: 0, history: [] };
    logEvent(t, "create");
    templates().push(t);
    closeCreate(true);
    toast("Șablonul a fost creat.");
    openEditor(id, "mesaj");
  }

  /* ---------------------------------------------------------------- insert a field at the caret */
  function insertToken(token, root) {
    const area = root.querySelector("[data-lgt-message]");
    if (!area || area.readOnly) return;
    const state = root === drawer ? C : P;
    const [s, e] = state?.caret || [area.value.length, area.value.length];
    area.value = `${area.value.slice(0, s)}${token}${area.value.slice(e)}`;
    const at = s + token.length;
    area.focus();
    area.setSelectionRange(at, at);
    area.dispatchEvent(new Event("input", { bubbles: true }));
  }
  const closeMenu = (el) => {
    const menu = el.closest("[data-stack-menu]");
    if (!menu) return;
    menu.hidden = true;
    menu.closest(".e-permits-stack__menu-wrap")?.querySelector("[data-stack-menu-trigger]")?.setAttribute("aria-expanded", "false");
  };
  /* live parts while typing (no full redraw): counter, preview, cleared error */
  function onType(root, value, key) {
    const state = root === drawer ? C : P;
    const target = root === drawer ? C.v : P.draft;
    if (!state || !target) return false;
    if (key === "message") {
      target.message = value;
      const area = root.querySelector("[data-lgt-message]");
      const count = root.querySelector(`[data-lgt-count="${area?.id}"]`);
      if (count) { count.textContent = `${value.length}/${TEXT_MAX}`; count.classList.toggle("is-over", value.length > TEXT_MAX); }
    } else if (key === "name") {
      target.name = value;
      if (root === drawer && !C.v.codeTouched) {
        C.v.code = codeFrom(value);
        const code = root.querySelector("#lgt-c-code");
        if (code) code.value = C.v.code;
      }
      const input = root.querySelector('[data-lgt-field="name"]');
      const count = root.querySelector(`[data-lgt-count="${input?.id}"]`);
      if (count) { count.textContent = `${value.length}/${NAME_MAX}`; count.classList.toggle("is-over", value.length > NAME_MAX); }
    } else if (key === "code" && root === drawer) {
      C.v.code = value; C.v.codeTouched = true;
    }
    const preview = root.querySelector("[data-lgt-preview]");
    if (preview) preview.innerHTML = previewCard(root === drawer ? C.v : { ...P.draft, code: tplOf(P.id)?.code });
    return true;
  }

  /* ================================================================ events */
  const editorRoot = () => (editorOpen() ? A().els?.dosarProfilPanel || document.querySelector("[data-dosar-profil]") : null);
  document.addEventListener("mousedown", (event) => { if (event.target.closest?.("[data-lgt-token]")) event.preventDefault(); });
  document.addEventListener("click", (event) => {
    const t = event.target;
    if (!t.closest) return;
    /* list */
    if (t.closest('[data-workplace-add-product="lgt-new"], [data-lgt-new]')) { event.preventDefault(); load().then(openCreate); return; }
    const rowEdit = t.closest("[data-lgt-row-edit]");
    if (rowEdit) { openEditor(rowEdit.dataset.lgtRowEdit, "mesaj"); return; }
    const rowToggle = t.closest("[data-lgt-row-toggle]");
    if (rowToggle) {
      const tpl = tplOf(rowToggle.dataset.lgtRowToggle);
      if (tpl) setActive(tpl, !tpl.active, (ok) => { if (ok) refreshList(); });
      return;
    }
    /* drawer */
    if (drawer && drawer.contains(t)) {
      const token = t.closest("[data-lgt-token]");
      if (token) { closeMenu(token); insertToken(token.dataset.lgtToken, drawer); return; }
      if (t.closest("[data-lgt-close]")) { closeCreate(); return; }
      if (t.closest("[data-lgt-prev]")) { C.errors = {}; C.step -= 1; renderCreate(); return; }
      if (t.closest("[data-lgt-next]")) { goStep(C.step + 1); return; }
      const goto = t.closest("[data-lgt-goto]");
      if (goto) { goStep(Number(goto.dataset.lgtGoto)); return; }
      if (t.closest("[data-lgt-create]")) { create(); return; }
      return;
    }
    /* editor */
    const root = editorRoot();
    if (!root || !root.contains(t)) return;
    const tab = t.closest("[data-lgt-tab]");
    if (tab) { P.tab = tab.dataset.lgtTab; renderEditor({ keep: `#lgt-tab-${P.tab}` }); A().writeHash?.(`#sablon-jurnalizare/${P.id}/${P.tab}`, { push: false }); return; }
    const token = t.closest("[data-lgt-token]");
    if (token) { closeMenu(token); insertToken(token.dataset.lgtToken, root); return; }
    if (t.closest("[data-lgt-save]")) { if (t.closest("[data-lgt-save]").getAttribute("aria-disabled") !== "true") save(); return; }
    if (t.closest("[data-lgt-discard]")) { discard(); return; }
    if (t.closest("[data-lgt-back]")) { event.preventDefault(); closeEditor(); }
  });
  /* tabs: arrow keys move between them (the BO tab pattern) */
  document.addEventListener("keydown", (event) => {
    const tab = event.target.closest?.("[data-lgt-tab]");
    if (!tab || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    const i = TABS.findIndex(([k]) => k === tab.dataset.lgtTab);
    const next = TABS[(i + (event.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length][0];
    event.preventDefault();
    P.tab = next;
    renderEditor({ keep: `#lgt-tab-${next}` });
  });
  const rememberCaret = (event) => {
    const area = event.target.closest?.("[data-lgt-message]");
    if (!area) return;
    const state = drawer?.contains(area) ? C : P;
    if (state) state.caret = [area.selectionStart, area.selectionEnd];
  };
  ["keyup", "click", "select", "focusout"].forEach((type) => document.addEventListener(type, rememberCaret, true));
  document.addEventListener("input", (event) => {
    const field = event.target.closest?.("[data-lgt-field]");
    if (!field || field.tagName === "SELECT" || field.type === "checkbox") return;
    const inDrawer = drawer?.contains(field);
    const root = inDrawer ? drawer : editorRoot();
    if (!root || !root.contains(field)) return;
    onType(root, field.value, field.dataset.lgtField);
    rememberCaret(event);
    if (!inDrawer && P.draft) {
      /* the header follows (Salvează on / off, status count) without touching the field */
      const els = A().els || {};
      const n = changedKeys().length;
      const t = tplOf(P.id);
      els.dosarProfilTitleRow.innerHTML = A().renderPageHeaderTop({
        crumbs: [{ label: TITLE, attr: "data-lgt-back" }, { label: t.name }], title: t.name, actions: headerActions(),
        status: n ? A().renderHeaderStatus?.(n === 1 ? "1 modificare nesalvată" : `${n} modificări nesalvate`, "warning", A().changesStatusAttrs?.("lgt-draft")) || "" : "",
        caption: t.updatedAt ? `Actualizat ${longDate(t.updatedAt)}, ${time(t.updatedAt)} · ${t.updatedBy || ""}` : ""
      });
    }
  });
  document.addEventListener("change", (event) => {
    const t = event.target;
    if (!t.closest) return;
    /* the „Activ” switch (US-260 AC-07 / AC-17): waits for the answer — reset now, set on confirm */
    if (t.matches("[data-lgt-active]")) {
      const tpl = tplOf(P.id);
      if (!tpl) return;
      const on = t.checked;
      t.checked = tpl.active;
      setActive(tpl, on, () => renderEditor({ keep: "[data-lgt-active]" }));
      return;
    }
    const field = t.closest("[data-lgt-field]");
    if (!field || (field.tagName !== "SELECT" && field.type !== "checkbox")) return;
    const key = field.dataset.lgtField;
    const value = field.type === "checkbox" ? field.checked : field.value;
    if (drawer?.contains(field) && C) {
      if (key === "copyFrom") {
        /* AC-10: the text and the parameters of the chosen template */
        C.v.copyFrom = value;
        const src = tplOf(value);
        if (src) Object.assign(C.v, { message: src.message, level: src.level, destination: src.destination, action: src.action, personal: Boolean(src.personal) });
      } else C.v[key] = value;
      delete C.errors[key];
      const fid = field.closest(".e-permits-fo-field")?.querySelector("button[id], input[id]")?.id || "";
      renderCreate({ keep: fid ? `#${CSS.escape(fid)}` : `[data-lgt-field="${key}"]` });
      return;
    }
    const root = editorRoot();
    if (root?.contains(field) && P.draft) {
      P.draft[key] = value;
      delete P.errors[key];
      const fid = field.closest(".e-permits-fo-field")?.querySelector("button[id], input[id]")?.id || "";
      renderEditor({ keep: fid ? `#${CSS.escape(fid)}` : `[data-lgt-field="${key}"]` });
    }
  });

  /* ---------------------------------------------------------------- routes + denied */
  function showDenied() {
    document.querySelectorAll("[data-nav-item].is-active").forEach((link) => { link.classList.remove("is-active"); link.removeAttribute("aria-current"); });
    G().showPage?.(TITLE, E()?.render({ title: DENIED, text: "Șabloanele de jurnalizare se văd cu permisiunea de vizualizare a șabloanelor, acordată pe rol.", icon: "lock" }) || DENIED);
  }
  window.GEAPShellRoutes = window.GEAPShellRoutes || [];
  window.GEAPShellRoutes.push((hash) => {
    if (hash === `#${NAV}`) {
      const nav = document.querySelector(`[data-nav-item][data-nav-id="${NAV}"]`);
      if (nav && can("view")) nav.click(); else showDenied();
      return true;
    }
    const m = /^#sablon-jurnalizare\/([^/]+)(?:\/([a-z]+))?$/.exec(hash);
    if (!m) return false;
    if (!can("view")) { showDenied(); return true; }
    load().then(() => openEditor(m[1], m[2] || "mesaj", { push: false }));
    return true;
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest?.(`[data-nav-item][data-nav-id="${NAV}"]`)) setTimeout(() => { observeRegistry(); syncChrome(); }, 0);
  });
  const boot = () => { observeRegistry(); load(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();

  /* for demo states / probes */
  window.GEAPJurnalizare = { load, openEditor, openCreate, tryLockedChange, templates, refreshList, perms: () => [...perms()] };
})();
