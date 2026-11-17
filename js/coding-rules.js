/* =====================================================================================
   Setări › Reguli de numerotare (coding-rules-v1, 2026-11-17) — Feature 94830 „Reguli de codificare a obiectelor în
   GEAP 2”, US-328 (97117) „Vizualizarea regulilor globale de numerotare” + the Feature's matrix (objects with a generated
   ID, objects without one, the general numbering rule). Data + ID helpers: js/object-id.js (`GEAPObjectId`).

   NO new engine — the BO registry as the shared STACKED LIST (`window.GEAPShellRegistries["reguli-numerotare"]`, menu
   `shellView: "reguli-numerotare-registry"`, as Formulare globale): status tabs with counts
     · „Documente emise” — one row per document type of the US-328 data model (Cerere, Act permisiv, Decizie,
       Înștiințare, Notă de plată, Cod serviciu), meta = the model's columns with their exact labels (AC-06), the next
       number (AC-07 / 08), „Doar globală” on Cod serviciu (AC-11), „Numerotarea din GEAP 1” without a rule (AC-12);
       no create / delete (AC-10); a row opens the ONE drawer „Regulă de numerotare” (AC-13): Șablon + parameter
       buttons (the Servicii › Setări › Numerotare markup), Lungime contor, Valoare inițială, Valoare curentă (read-only),
       Resetare contor, live „Exemplu (numărul următor):”; a save goes to the Jurnal de audit (AC-14);
     · „Obiecte cu ID” — the matrix (Obiect · Prefix · Format ID · Regula de denumire · Exemplu general · Exemplu specific),
       grouped „Obiecte de configurare” / „Create în procesare”; a row opens the read-only details drawer (+ the last ID
       given and the next one);
     · „Obiecte fără ID” — Dosar, Decizie, Act, AT, Notă de plată, Solicitant, Reprezentant, Împuternicire, Cont bancar.
   Intro note per tab (`stackIntro`): AC-03 + AC-04 / the general numbering rule / why no ID. Search: object, prefix,
   format, rule, examples (diacritics ignored).
   Permission „gestionarea regulilor de numerotare” (Feature 89940): Administrator central by default; others see the
   denied page (AC-01, „tu” form). Demo switch ?numerotare= local (the local administrator holds the permission) ·
   fara-permisiune · eroare (a save fails).
   Routes: #reguli-numerotare.
   ===================================================================================== */
(function () {
  "use strict";

  const A = () => window.GEAPShellApi || {};
  const U = () => window.GEAPUi || {};
  const G = () => window.GEAPRegistre || {};
  const E = () => window.GEAPEmptyState;
  const O = () => window.GEAPObjectId || {};
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (name, size = 20) => `<svg class="icon${size === 16 ? " small" : ""}" width="${size}" height="${size}" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${name}"></use></svg>`;
  const tag = (label, tone = "neutral") => window.GEAPTag?.html(label, tone) || U().renderTag?.(label, tone) || esc(label);
  const fold = (s) => String(s || "").normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("ro");
  const pad = (n) => String(n).padStart(2, "0");
  const nowIso = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const userName = () => A().currentUserName?.() || "Anastasia Cojocaru";
  const toast = (message, type = "success") => (window.GEAPToast?.show ? window.GEAPToast.show({ type, message }) : U().showShellToast?.(message, type));

  const KIND = "reguli-numerotare";
  const NAV = "reguli-numerotare";
  const TITLE = "Reguli de numerotare";
  /* the AC texts in the „tu” tone (components.md › Ton: tu) — US-328 AC-01 says „Nu aveți …” (deviation listed for the PO) */
  const DENIED = "Nu ai permisiunea de a accesa această pagină.";
  /* AC-03 (description) + AC-04 (note) — exact texts */
  const INTRO_DOCS = "<strong>Regulile globale pentru numerele dosarelor, documentelor emise, notelor de plată și codurilor de serviciu.</strong> Un serviciu poate înlocui regula unui obiect în tabul «Setări»; altfel se aplică regula globală.";
  const INTRO_NO_ID = "Aceste obiecte se identifică prin numărul oficial sau prin identificatorul din sistemul-sursă, nu prin un ID de forma prefix și contor.";
  const GEAP1 = "Numerotarea din GEAP 1";
  const SAVE_FAILED = "Regula nu a fost salvată. Încearcă din nou.";

  /* ---------------------------------------------------------------- demo switches + who */
  const params = new URLSearchParams(window.location.search);
  const demo = new Set(String(params.get("numerotare") || "").split(",").map((s) => s.trim()).filter(Boolean));
  /* „gestionarea regulilor de numerotare” (Feature 89940): the Administrator central has every permission; the local
     administrator only when granted (?numerotare=local) */
  function who() {
    const a = A().currentAssignment?.() || {};
    const central = a.roleId === "central-admin";
    const local = a.roleId === "local-admin";
    const has = (central || (local && demo.has("local"))) && !demo.has("fara-permisiune");
    return { central, has, roleLabel: a.roleLabel || (central ? "Administrator central" : "Administrator local"), authority: central ? "" : a.authority || "ansp" };
  }

  /* ---------------------------------------------------------------- US-328 data model: one rule per document type */
  const RESET = ["Anual", "Fără resetare"];
  const TOKENS = [["{NR}", "Numărul (contorul)"], ["{YYYY}", "Anul"], ["{YY}", "Anul, 2 cifre"], ["{MM}", "Luna"], ["{DD}", "Ziua"]];
  /* `geap1` = the GEAP 1 number shown while there is no rule (AC-12); `globalOnly` = Cod serviciu (AC-11) */
  const seedRules = () => [
    { id: "cerere", doc: "Cerere", template: "", len: "", start: "", current: 201254, reset: "", geap1: "C201255/2026", editedAt: "", editedBy: "" },
    { id: "act", doc: "Act permisiv", template: "P-{NR}/{YYYY}", len: "4", start: "1", current: 124, reset: "Anual", editedAt: "2026-09-02T10:15", editedBy: "Anastasia Cojocaru" },
    { id: "decizie", doc: "Decizie", template: "DR-{NR}/{YYYY}", len: "4", start: "1", current: 12, reset: "Anual", editedAt: "2026-09-02T10:18", editedBy: "Anastasia Cojocaru" },
    { id: "instiintare", doc: "Înștiințare", template: "IN-{NR}/{YYYY}", len: "4", start: "1", current: 37, reset: "Anual", editedAt: "2026-10-14T15:40", editedBy: "Ion Rusu" },
    { id: "nota", doc: "Notă de plată", template: "", len: "", start: "", current: 0, reset: "", geap1: "Numărul primit din MPay", editedAt: "", editedBy: "" },
    { id: "cod-serviciu", doc: "Cod serviciu", template: "SRV-{NR}", len: "4", start: "1", current: 150, reset: "Fără resetare", globalOnly: true, editedAt: "2026-06-11T09:05", editedBy: "Anastasia Cojocaru" }
  ];
  const S = { rules: null };
  const rules = () => { if (!S.rules) S.rules = seedRules(); return S.rules; };
  const ruleOf = (id) => rules().find((r) => r.id === id) || null;
  const hasRule = (r) => Boolean(String(r.template || "").trim());

  /* the template: {NR} once; parameters {NR} {YYYY} {YY} {MM} {DD} (US-328 data model) */
  function templateError(tpl, { required }) {
    const t = String(tpl || "").trim();
    if (!t) return required ? "Câmpul este obligatoriu." : "";
    const nr = t.match(/\{NR\}/g) || [];
    if (nr.length !== 1) return "Șablonul trebuie să conțină {NR} o singură dată.";
    const unknown = (t.match(/\{[^}]*\}/g) || []).find((x) => !/^\{(NR|YYYY|YY|MM|DD)\}$/.test(x));
    if (unknown) return `Parametru necunoscut: ${unknown}. Parametrii admiși: {NR}, {YYYY}, {YY}, {MM}, {DD}.`;
    return /[^\x20-\x7E]/.test(t.replace(/\{[^}]*\}/g, "")) ? "Șablonul conține numai caractere ASCII, fără diacritice." : "";
  }
  /* AC-07 / 08: the next number = template + counter length + current value („DR-{NR}/{YYYY}”, 4, 12 → DR-0013/2026);
     the counter starts again from the initial value in a new year when the reset is annual — not modelled (same year) */
  function nextNumber(r) {
    if (!hasRule(r) || templateError(r.template, { required: true })) return "";
    const d = new Date();
    const next = Math.max(Number(r.current || 0) + 1, Number(r.start || 1));
    return String(r.template).trim()
      .replace("{NR}", String(next).padStart(Number(r.len) || 1, "0"))
      .replace(/\{YYYY\}/g, d.getFullYear()).replace(/\{YY\}/g, pad(d.getFullYear() % 100)).replace(/\{MM\}/g, pad(d.getMonth() + 1)).replace(/\{DD\}/g, pad(d.getDate()));
  }

  /* ---------------------------------------------------------------- rows (one list, three tabs) */
  const docRow = (r) => ({ id: `doc-${r.id}`, tab: "doc", obiect: r.doc, prefix: "", search: `${r.doc} ${r.template} ${nextNumber(r)} ${r.geap1 || ""}`, r });
  const idRow = (t) => ({ id: `id-${t.prefix}`, tab: "id", obiect: t.object, prefix: t.prefix, search: `${t.object} ${t.prefix} ${t.prefix}-${"N".repeat(t.width)} ${t.rule} ${t.general} ${t.specific}`, t });
  const noIdRow = (x, i) => ({ id: `fara-${i + 1}`, tab: "noid", obiect: x.object, prefix: "", search: `${x.object} ${x.identifier} ${x.source} ${x.name} ${x.notes}`, x });
  const allRows = () => [...rules().map(docRow), ...(O().TYPES || []).map(idRow), ...(O().NO_ID || []).map(noIdRow)];

  const copyNr = (nr) => (nr && window.GEAPCopyValue?.html ? window.GEAPCopyValue.html(nr, { compact: true, label: `Copiază numărul ${nr}` }) : esc(nr));
  const part = (label, value) => `${esc(label)}: <span class="e-permits-cod-list__value">${value}</span>`;
  const wide = (html, cls = "") => `<span class="e-permits-cod-list__text${cls ? ` ${cls}` : ""}">${html}</span>`;
  function stackItem(row) {
    if (row.tab === "doc") {
      const r = row.r;
      const next = nextNumber(r);
      return {
        plainTitle: r.doc,
        title: esc(r.doc),
        badges: [r.globalOnly ? tag("Doar globală", "info") : "", hasRule(r) ? "" : tag(GEAP1, "neutral")].filter(Boolean),
        /* AC-06: the data model's columns, labels exactly as in the model */
        meta: hasRule(r)
          ? [part("Șablon", esc(r.template)), part("Lungime contor", esc(r.len)), part("Valoare inițială", esc(r.start)), part("Valoare curentă", esc(r.current)), part("Resetare contor", esc(r.reset))]
          : [wide(r.id === "nota" ? "Fără regulă globală: numărul urmează numerotarea din GEAP 1 (numărul primit din MPay)." : "Fără regulă globală: numărul urmează numerotarea din GEAP 1.")],
        /* the next number reads as a number of the product: the compact copy value (components.md › Copy value) */
        meta2: [`Exemplu (numărul următor): <strong class="e-permits-cod-list__next">${hasRule(r) || r.id === "cerere" ? copyNr(hasRule(r) ? next : r.geap1) : esc(r.geap1)}</strong>`]
      };
    }
    if (row.tab === "id") {
      const t = row.t;
      return {
        plainTitle: t.object,
        title: esc(t.object),
        badges: [tag(t.prefix, "neutral")],
        meta: [part("Format ID", esc(`${t.prefix}-${"N".repeat(t.width)}`)), part("Denumire", esc(O().NAMING?.[t.naming]?.[0] || t.naming)), part("Ultimul ID", O().last?.(t.prefix) ? esc(O().format(t.prefix, O().last(t.prefix))) : "niciunul")],
        meta2: [
          wide(`<span class="e-permits-cod-list__label">Regula de denumire</span> ${esc(t.rule)}`, "e-permits-cod-list__rule"),
          t.general ? wide(`<span class="e-permits-cod-list__label">Exemplu general</span> ${esc(t.general)}`, "e-permits-cod-list__rule") : "",
          t.specific ? wide(`<span class="e-permits-cod-list__label">Exemplu specific</span> ${esc(t.specific)}`, "e-permits-cod-list__rule") : ""
        ].filter(Boolean)
      };
    }
    const x = row.x;
    return {
      plainTitle: x.object,
      title: esc(x.object),
      badges: [],
      meta: [part("Identificator", esc(x.identifier)), part("Sursa numărului", esc(x.source))],
      meta2: [
        wide(`<span class="e-permits-cod-list__label">Denumirea generată</span> ${esc(x.name)}`, "e-permits-cod-list__rule"),
        x.notes ? wide(`<span class="e-permits-cod-list__label">Observații</span> ${esc(x.notes)}`, "e-permits-cod-list__rule") : ""
      ].filter(Boolean)
    };
  }
  const tabKey = () => A().workplaceState?.tabKey || "documente";
  function registryDb() {
    const me = who();
    const tabs = [
      { id: "documente", label: "Documente emise", filter: "tab:doc" },
      { id: "cu-id", label: "Obiecte cu ID", filter: "tab:id" },
      { id: "fara-id", label: "Obiecte fără ID", filter: "tab:noid" }
    ];
    return {
      kind: KIND,
      fixedWidths: true,
      fieldCount: 2,
      pageSizes: [40, 60],
      columns: {
        obiect: { label: "Obiect", width: 320 },
        prefix: { label: "Prefix", width: 112 }
      },
      views: {
        [KIND]: {
          title: TITLE,
          selectable: false,
          searchPlaceholder: "Caută după obiect, prefix sau exemplu",
          columns: ["obiect", "prefix"],
          tabs,
          defaultTab: "documente",
          /* AC-10: no create / delete of rules */
          primaryAction: null,
          toolbarLabel: "Filtrare reguli"
        }
      },
      runtimeRows: me.has ? allRows() : []
    };
  }
  window.GEAPShellRegistries = window.GEAPShellRegistries || {};
  window.GEAPShellRegistries[KIND] = {
    build: registryDb,
    /* no filter: three tabs + search cover the 43 rows (US-328 asks for none) */
    facets: [],
    searchText: (row) => `${row.search} ${fold(row.search)}`,
    filterToken: (row, token) => (token.startsWith("tab:") ? row.tab === token.slice(4) : true),
    stackItem,
    stackClass: "e-permits-rpt-list e-permits-cod-list",
    get stackIntro() {
      const key = tabKey();
      return key === "cu-id" ? esc(O().GENERAL_RULE || "") : key === "fara-id" ? INTRO_NO_ID : INTRO_DOCS;
    },
    stackGroup: (row) => (row.tab === "id" ? (row.t.processing ? "Obiecte create în procesare · 6–9 cifre" : "Obiecte de configurare · 4 cifre") : ""),
    sortValue: () => "",
    renderCell: (row, key) => esc(row[key] ?? ""),
    openRow: (id) => openRow(id),
    rowLabel: (row) => (row.tab === "doc" ? `${row.obiect} — deschide regula pentru editare` : `${row.obiect}${row.prefix ? `, prefix ${row.prefix}` : ""} — vezi detaliile`),
    emptyHtml: ({ query, filtered, boxed = false }) => {
      const bare = !boxed;
      if (!who().has) return E()?.render({ title: DENIED, icon: "lock", bare });
      return E()?.render({ title: "Nicio potrivire găsită.", text: "Caută după obiect, prefix, format sau exemplu, ori alege alt tab.", icon: "search", bare, actionHtml: filtered ? '<button class="btn btn-neutral btn-sm" type="button" data-filter-clear-all>Șterge filtrele</button>' : "" });
    },
    exportState: () => ({ hidden: true })
  };
  function refreshList() {
    const reg = document.querySelector(`[data-workplace][data-registry-kind="${KIND}"]`);
    const st = A().workplaceState;
    if (!reg || !st || reg.closest("[hidden]") || reg.hidden) return;
    st.rows = registryDb().runtimeRows;
    A().renderWorkplace?.();
  }

  /* ================================================================ the ONE drawer */
  let drawer = null;
  const D = { mode: "", id: "", v: null, errors: {}, failed: false };
  function ensureDrawer() {
    if (drawer) return drawer;
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <div class="drawer-overlay" data-cod-drawer hidden>
        <button class="drawer-overlay__scrim" type="button" aria-label="Închide" tabindex="-1" data-cod-close></button>
        <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="cod-drawer-title" tabindex="-1">
          <header class="drawer__header">
            <div class="drawer__heading">
              <h2 class="drawer__title" id="cod-drawer-title"></h2>
              <p class="drawer__subtitle" data-cod-subtitle></p>
            </div>
            <button class="modal-close" type="button" aria-label="Închide" data-cod-close>${icon("cross-large", 16)}</button>
          </header>
          <div class="drawer__body" data-cod-body></div>
          <footer class="drawer__footer"><div class="modal-buttons" data-cod-footer></div></footer>
        </aside>
      </div>`;
    drawer = wrap.firstElementChild;
    document.body.appendChild(drawer);
    drawer.addEventListener("click", onDrawerClick);
    drawer.addEventListener("input", onDrawerInput);
    drawer.addEventListener("change", onDrawerChange);
    return drawer;
  }
  const req = () => U().requiredMark?.() || "";
  const errorHtml = (id, msg) => `<span class="message message--inline message--error e-permits-fo-field__error" id="${id}-error">${icon("circle-error-filled")}<span>${esc(msg)}</span></span>`;
  const grid = (...parts) => `<div class="e-permits-user-create__grid">${parts.join("")}</div>`;
  const section = (title, content) => `
    <section class="e-permits-user-create__section">
      <h3 class="e-permits-user-create__section-title">${esc(title)}</h3>
      <div class="e-permits-user-create__section-content">${content}</div>
    </section>`;
  const roField = (label, html, span = 12) => `
    <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
      <span class="e-permits-cfg-ro__label">${esc(label)}</span>
      <div class="e-permits-cfg-ro">${html}</div>
    </div>`;
  function inputField(key, label, value, { required = false, span = 6, numeric = false, max = 0, hint = "", placeholder = "", extra = "" } = {}) {
    const id = `cod-${key}`;
    const error = D.errors[key];
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
        <label for="${id}">${esc(label)}${required ? req() : ""}</label>
        <div class="e-permits-fo-input${error ? " is-error" : ""}">
          <input id="${id}" type="text" value="${esc(value)}" autocomplete="off" spellcheck="false"${numeric ? ' inputmode="numeric"' : ""}${max ? ` maxlength="${max}"` : ""}${placeholder ? ` placeholder="${esc(placeholder)}"` : ""}${required ? ' aria-required="true"' : ""}${error ? ` aria-invalid="true" aria-describedby="${id}-error"` : hint ? ` aria-describedby="${id}-hint"` : ""} data-cod-field="${key}">
        </div>
        ${extra}
        ${error ? errorHtml(id, error) : hint ? `<p class="e-permits-fo-field__hint" id="${id}-hint">${esc(hint)}</p>` : ""}
      </div>`;
  }
  function selectField(key, label, options, value, { required = false, span = 6, placeholder = "" } = {}) {
    const id = `cod-${key}`;
    const error = D.errors[key];
    const optionsHtml = `${placeholder ? `<option value=""${value ? "" : " selected"}>${esc(placeholder)}</option>` : ""}${options.map((o) => `<option value="${esc(o)}"${o === value ? " selected" : ""}>${esc(o)}</option>`).join("")}`;
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
        <label for="${id}">${esc(label)}${required ? req() : ""}</label>
        ${U().renderFoSelectControl?.({ id, attrs: `data-cod-field="${key}"`, optionsHtml, error: Boolean(error) }) || ""}
        ${error ? errorHtml(id, error) : ""}
      </div>`;
  }
  /* the Servicii › Setări › Numerotare token row (components.md „Template field with parameter tokens”) */
  const tokensHtml = () => `<div class="e-permits-cfg-num-tokens" role="group" aria-label="Parametri">${TOKENS.map(([tok, label]) => `<button class="btn btn-neutral btn-sm e-permits-cfg-num-token" type="button" data-cod-token="${tok}" aria-label="Inserează ${esc(label)}" data-tooltip-label="${esc(label)}"><code class="e-permits-doc-kw">${tok}</code></button>`).join("")}</div>`;
  const exampleText = (v) => (hasRule(v) ? nextNumber(v) || "—" : v.geap1 || "—");
  function ruleBody() {
    const v = D.v;
    const optional = !v.globalOnly && ["cerere", "nota"].includes(v.id);
    const notes = [
      D.failed ? U().renderNotice?.("error", `<strong>${esc(SAVE_FAILED)}</strong> Modificările tale sunt păstrate în formular.`, { role: "alert" }) || "" : "",
      v.globalOnly ? U().renderInfoNote?.("<strong>Regulă doar globală.</strong> Codul serviciului nu se înlocuiește în tabul «Setări» al serviciului.") || ""
        : optional ? U().renderInfoNote?.(`Fără șablon, numărul ${v.id === "nota" ? "notei de plată" : "cererii"} urmează numerotarea din GEAP 1. Completează șablonul doar pentru o regulă globală nouă.`) || ""
          : U().renderInfoNote?.("Un serviciu poate înlocui această regulă în tabul «Setări»; altfel se aplică regula globală.") || ""
    ].filter(Boolean).join("");
    const reqd = !optional || hasRule(v);
    return `
      ${notes ? `<div class="e-permits-cod-drawer__notes">${notes}</div>` : ""}
      ${section("Regula", grid(
        roField("Tip document", esc(v.doc)),
        inputField("template", "Șablon", v.template, { required: !optional, span: 12, max: 40, placeholder: "Ex. DR-{NR}/{YYYY}", extra: tokensHtml(), hint: "Textul fix se scrie direct; parametrii se inserează. {NR} apare o singură dată." }),
        inputField("len", "Lungime contor", v.len, { required: reqd, numeric: true, max: 1, hint: "Numărul de cifre al contorului, de la 1 la 9." }),
        inputField("start", "Valoare inițială", v.start, { required: reqd, numeric: true, max: 9, hint: "Prima valoare a contorului." }),
        roField("Valoare curentă", esc(String(v.current ?? 0)), 6),
        selectField("reset", "Resetare contor", RESET, v.reset, { required: reqd, placeholder: reqd ? "" : "Alege" })
      ))}
      ${section("Exemplu", `<p class="e-permits-cod-drawer__example" aria-live="polite">Exemplu (numărul următor): <strong data-cod-example>${esc(exampleText(v))}</strong></p>`)}`;
  }
  const detailRows = (rows) => A().renderPassportBlock?.(rows.title, rows.rows.filter(([, v]) => v)) || "";
  function objectBody(row) {
    if (row.tab === "id") {
      const t = row.t;
      const lastId = O().last?.(t.prefix) ? O().format(t.prefix, O().last(t.prefix)) : "";
      return `
        ${detailRows({ title: "ID", rows: [
          ["Prefix", tag(t.prefix, "neutral")],
          ["Format ID", esc(`${t.prefix}-${"N".repeat(t.width)}`)],
          ["Lățimea contorului", esc(`${t.width} cifre, minim — ${t.processing ? "obiect creat în procesare" : "obiect de configurare"}; contorul crește fără limită`)],
          ["Ultimul ID atribuit", lastId ? O().copy(lastId) : "niciunul"],
          ["Următorul ID", esc(O().peek(t.prefix))]
        ] })}
        ${detailRows({ title: "Denumire", rows: [
          ["Tip denumire", esc(`${O().NAMING?.[t.naming]?.[0] || t.naming} — ${O().NAMING?.[t.naming]?.[1] || ""}`)],
          ["Regula de denumire", esc(t.rule)],
          ["Exemplu general", esc(t.general || "—")],
          ["Exemplu specific", esc(t.specific || "—")]
        ] })}
        ${U().renderInfoNote?.("ID-ul se atribuie automat la salvare, se afișează doar pentru citire și nu se schimbă la editare sau la o versiune nouă. La clonare, copia primește următorul ID.") || ""}`;
    }
    const x = row.x;
    return detailRows({ title: "Identificare", rows: [
      ["Identificator", esc(x.identifier)],
      ["Sursa numărului", esc(x.source)],
      ["Denumirea generată", esc(x.name)],
      ["Observații", esc(x.notes || "—")]
    ] });
  }
  function renderDrawer({ keep = "" } = {}) {
    const d = ensureDrawer();
    const active = document.activeElement;
    const keepSel = keep || (active && d.contains(active) && active.id ? `#${CSS.escape(active.id)}` : "");
    const caret = active && "selectionStart" in active ? [active.selectionStart, active.selectionEnd] : null;
    const row = D.mode === "object" ? allRows().find((r) => r.id === D.id) : null;
    d.querySelector("#cod-drawer-title").textContent = D.mode === "rule" ? "Regulă de numerotare" : row?.obiect || "";
    const sub = d.querySelector("[data-cod-subtitle]");
    sub.textContent = D.mode === "rule" ? D.v.doc : row?.tab === "id" ? `Obiect cu ID generat · prefix ${row.prefix}` : "Obiect fără ID generat";
    d.querySelector("[data-cod-body]").innerHTML = D.mode === "rule" ? ruleBody() : objectBody(row);
    d.querySelector("[data-cod-footer]").innerHTML = D.mode === "rule"
      ? '<button class="btn btn-neutral btn-rounded" type="button" data-cod-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-cod-save>Salvează</button>'
      : '<button class="btn btn-neutral btn-rounded" type="button" data-cod-close>Închide</button>';
    window.GEAPFormRender?.bind?.(d.querySelector("[data-cod-body]"));
    if (keepSel) {
      const el = d.querySelector(keepSel);
      el?.focus?.();
      if (caret && el && "setSelectionRange" in el) { try { el.setSelectionRange(caret[0], caret[1]); } catch { /* not a text field */ } }
    }
  }
  function openDrawer(focus) {
    const d = ensureDrawer();
    renderDrawer();
    if (window.GEAPDrawer?.open) window.GEAPDrawer.open(d, { focus });
    else { d.hidden = false; document.body.classList.add("is-drawer-open"); }
  }
  function closeDrawer(force = false) {
    if (!drawer || drawer.hidden) return;
    const close = () => { D.mode = ""; D.v = null; D.errors = {}; D.failed = false; if (window.GEAPDrawer?.close) window.GEAPDrawer.close(drawer); else { drawer.hidden = true; document.body.classList.remove("is-drawer-open"); } };
    if (force || D.mode !== "rule" || !dirty()) { close(); return; }
    U().askConfirm?.({ title: "Renunți la modificări?", text: "Regula rămâne cum era înainte.", confirmLabel: "Renunță", destructive: true }, close);
  }
  const FIELDS = ["template", "len", "start", "reset"];
  const dirty = () => { const r = ruleOf(D.id); return Boolean(r && D.v && FIELDS.some((k) => String(r[k] ?? "") !== String(D.v[k] ?? ""))); };
  function openRule(id) {
    if (!who().has) return;
    const r = ruleOf(id);
    if (!r) return;
    D.mode = "rule"; D.id = id; D.v = { ...r }; D.errors = {}; D.failed = false;
    openDrawer("#cod-template");
  }
  function openObject(id) {
    D.mode = "object"; D.id = id; D.v = null; D.errors = {};
    openDrawer(".drawer");
  }
  function openRow(id) {
    if (String(id).startsWith("doc-")) openRule(id.slice(4)); else openObject(id);
  }
  function validate(v) {
    const e = {};
    const optional = !v.globalOnly && ["cerere", "nota"].includes(v.id);
    const te = templateError(v.template, { required: !optional });
    if (te) e.template = te;
    if (!optional || hasRule(v)) {
      if (!/^[1-9]$/.test(String(v.len || "").trim())) e.len = "Introdu un număr de la 1 la 9.";
      if (!/^\d{1,9}$/.test(String(v.start || "").trim())) e.start = "Introdu un număr întreg.";
      if (!v.reset) e.reset = "Câmpul este obligatoriu.";
    }
    return e;
  }
  function save() {
    const v = D.v;
    D.errors = validate(v);
    if (Object.keys(D.errors).length) {
      renderDrawer();
      drawer.querySelector(`#cod-${FIELDS.find((k) => D.errors[k])}`)?.focus();
      return;
    }
    const r = ruleOf(D.id);
    if (!dirty()) { closeDrawer(true); return; }
    const me = who();
    const changes = FIELDS.filter((k) => String(r[k] ?? "") !== String(v[k] ?? "")).map((k) => `${{ template: "Șablon", len: "Lungime contor", start: "Valoare inițială", reset: "Resetare contor" }[k]}: ${r[k] || "—"} → ${v[k] || "—"}`).join("; ");
    if (demo.has("eroare")) {
      D.failed = true;
      window.GEAPEventTimeline?.log?.({ at: nowIso(), user: userName(), role: me.roleLabel, type: "Modificare regulă de numerotare", status: "Eșuat", detail: `${r.doc} · ${changes}` }, { module: "AdminPortal", authority: "", objectType: "Regulă de numerotare", objectId: r.doc, objectVersion: "", related: [] });
      renderDrawer();
      return;
    }
    FIELDS.forEach((k) => { r[k] = String(v[k] ?? "").trim(); });
    r.editedAt = nowIso(); r.editedBy = userName();
    /* AC-14: every change of a rule → Jurnalul de audit */
    window.GEAPEventTimeline?.log?.({ at: r.editedAt, user: r.editedBy, role: me.roleLabel, type: "Modificare regulă de numerotare", status: "Reușit", detail: `${r.doc} · ${changes}` }, { module: "AdminPortal", authority: "", objectType: "Regulă de numerotare", objectId: r.doc, objectVersion: "", related: [] });
    closeDrawer(true);
    refreshList();
    toast(`Regula pentru „${r.doc}” a fost salvată. Numărul următor: ${nextNumber(r) || r.geap1 || "—"}.`);
  }
  function syncExample() {
    const el = drawer?.querySelector("[data-cod-example]");
    if (el && D.v) el.textContent = exampleText(D.v);
  }
  function onDrawerInput(event) {
    const t = event.target;
    const key = t.dataset?.codField;
    if (!key || !D.v) return;
    if (["len", "start"].includes(key) && /\D/.test(t.value)) { const pos = t.selectionStart; t.value = t.value.replace(/\D+/g, ""); try { t.setSelectionRange(pos - 1, pos - 1); } catch { /* */ } }
    D.v[key] = t.value;
    if (D.errors[key]) { delete D.errors[key]; renderDrawer(); }
    syncExample();
  }
  function onDrawerChange(event) {
    const t = event.target;
    const key = t.dataset?.codField;
    if (!key || !D.v || t.tagName !== "SELECT") return;
    D.v[key] = t.value;
    delete D.errors[key];
    renderDrawer({ keep: `#cod-${key}` });
  }
  function onDrawerClick(event) {
    const t = event.target;
    if (t.closest("[data-cod-close]")) { closeDrawer(); return; }
    if (t.closest("[data-cod-save]")) { save(); return; }
    const token = t.closest("[data-cod-token]");
    if (token && D.v) {
      const input = drawer.querySelector("#cod-template");
      const tok = token.dataset.codToken;
      const s = input.selectionStart ?? input.value.length;
      const e = input.selectionEnd ?? s;
      input.value = `${input.value.slice(0, s)}${tok}${input.value.slice(e)}`.slice(0, 40);
      D.v.template = input.value;
      delete D.errors.template;
      renderDrawer({ keep: "#cod-template" });
      const el = drawer.querySelector("#cod-template");
      try { el.setSelectionRange(s + tok.length, s + tok.length); } catch { /* */ }
    }
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && drawer && !drawer.hidden && event.target.matches?.("[data-cod-field]") && event.target.tagName === "INPUT") { event.preventDefault(); save(); }
  });

  /* ================================================================ routes + denied (AC-01 / AC-02) */
  function showDenied() {
    document.querySelectorAll("[data-nav-item].is-active").forEach((link) => { link.classList.remove("is-active"); link.removeAttribute("aria-current"); });
    G().showPage?.(TITLE, E()?.render({ title: DENIED, text: "Meniul „Reguli de numerotare” este disponibil utilizatorilor cu permisiunea de gestionare a regulilor de numerotare.", icon: "lock" }) || DENIED);
  }
  window.GEAPShellRoutes = window.GEAPShellRoutes || [];
  window.GEAPShellRoutes.push((h) => {
    if (h !== `#${NAV}`) return false;
    const nav = document.querySelector(`[data-nav-item][data-nav-id="${NAV}"]`);
    if (nav && who().has) nav.click(); else showDenied();
    return true;
  });
  /* the menu item exists only for who holds the permission (AC-01) */
  let navQueued = false;
  const syncNav = () => {
    navQueued = false;
    const has = who().has;
    document.querySelectorAll(`[data-nav-item][data-nav-id="${NAV}"]`).forEach((a) => { const li = a.closest("li") || a; if (li.hidden === has) li.hidden = !has; });
  };
  const boot = () => {
    new MutationObserver(() => { if (!navQueued) { navQueued = true; requestAnimationFrame(syncNav); } }).observe(document.body, { childList: true, subtree: true });
    syncNav();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();

  /* ---------------------------------------------------------------- for the demo states */
  window.GEAPCodingRules = { rules, openRule, openObject, refreshList, nextNumber, templateError, perms: who };
})();
