/* EVO eKYC — back office, batch 3 (2026-10-13): Configurare + Administrare.
   Azure eKYC (read-only): US-UI-06 91125 Organizații · US-UI-07 91127 Clienți · US-UI-08 91128
   Cazuri de utilizare · US-UI-09 91130 Furnizori · US-UI-10 91131 Configurări scoring ·
   US-UI-11 91132 Parametri · US-UI-12 91133 Versiuni SDK · US-UI-13 91134 Utilizatori ·
   US-05-09-B 89238 Certificate root CA; functional: US-05-04-B 89227, 05-05-B 89229, 05-06-B 89231,
   05-07-B 89233, 05-08-B 89236, 05-10-B 89241, 05-12-B 89245, 05-13 89246.

   Nothing new as UI: lists = the shell's registry engine (status tabs, quick search, Filtrare
   avansată, sort, pagination, export); details = the dosar profile panel (page header, tabs,
   info cards, stacked lists, timeline, the eKYC table-in-a-card); short forms = the BO right
   drawer (.e-permits-user-create, the classifier value drawer's markup); long forms (Clienți,
   Furnizori: „pagină separată, pe secțiuni”) = the Setări one-page form (.e-permits-cfg2:
   section list · white section cards · sticky save bar · red card on errors); confirmations =
   askConfirm; results / impact dialogs = the page modal (#case-action-modal).
   Loaded after js/ekyc.js; plugs in through product.extend() and reads its helpers from
   product.shared. Data: data/ekyc-config.json (node tools/ekyc/seed-config.mjs). */
(function () {
  "use strict";

  const P = window.GEAPShellProduct;
  if (!P || P.id !== "ekyc" || !P.extend) return;
  const S = P.shared;
  const DEMO = S.DEMO;

  let A = null;
  let cfg = null;
  let loadFailed = false;
  const st = { detail: null };
  let F = null; /* the open form: { type, mode, id, v, errors, original, where: "drawer" | "page" } */

  /* ---- vocabulary ------------------------------------------------------------------ */
  const ACCOUNT_TONES = { Activ: "success", Suspendat: "warning", Blocat: "danger" };
  const HEALTH_TONES = { "Operațional": "success", Degradat: "warning", Indisponibil: "danger" };
  const SEVERITY_TONES = { "Critică": "danger", Avertisment: "warning" };
  /* illustrative lists (US-UI-08/09 AC: the API takes free strings; the real lists come from backend) */
  const IALS = ["Scăzut", "Substanțial", "Ridicat"];
  const STEP_TYPES = [["DOCUMENT_SCAN", "Scanare document"], ["NFC_CHIP", "Citire cip NFC"], ["LIVENESS", "Detecție liveness"], ["FACE_MATCH", "Potrivire facială"], ["PHONE_VERIFICATION", "Verificare telefon"], ["REGISTRY_CHECK", "Verificare în RSP"]];
  const SEVERITIES = ["Critică", "Avertisment"];
  const PROVIDER_TYPES = ["Verificare document", "Citire cip NFC", "Detecție liveness", "Potrivire facială", "Verificare telefon", "Registru de stat"];
  const AUTH_TYPES = ["Cheie API", "Cheie API + semnătură HMAC", "OAuth 2.0 (client credentials)", "mTLS (certificat client)", "Basic (utilizator + parolă)"];
  const AGGREGATIONS = ["Medie ponderată", "Medie aritmetică", "Minimul scorurilor"];
  const RULE_TYPES = ["Pondere", "Bonus", "Penalizare"];
  const DATA_TYPES = [["string", "Text (string)"], ["number", "Număr (number)"], ["boolean", "Da / Nu (boolean)"], ["json", "JSON"]];
  const PLATFORMS = ["iOS", "Android", "Web"];
  const COUNTRIES = [["MDA", "MDA — Republica Moldova"], ["ROU", "ROU — România"], ["UKR", "UKR — Ucraina"], ["BGR", "BGR — Bulgaria"], ["ITA", "ITA — Italia"], ["DEU", "DEU — Germania"], ["ISR", "ISR — Israel"], ["RUS", "RUS — Federația Rusă"]];
  const SCOPES = ["openid", "profile", "ekyc.session", "ekyc.nfc", "ekyc.result", "ekyc.evidence"];

  const VIEWS = {
    "ekyc-users": { nav: "ek-users", kind: "ekyc-users", title: "Utilizatori" },
    "ekyc-clients": { nav: "ek-clients", kind: "ekyc-clients", title: "Clienți" },
    "ekyc-use-cases": { nav: "ek-use-cases", kind: "ekyc-use-cases", title: "Cazuri de utilizare" },
    "ekyc-parameters": { nav: "ek-parameters", kind: "ekyc-parameters", title: "Parametri platformă" },
    "ekyc-scoring": { nav: "ek-scoring", kind: "ekyc-scoring", title: "Configurări scoring" },
    "ekyc-providers": { nav: "ek-providers", kind: "ekyc-providers", title: "Furnizori de verificare" },
    "ekyc-organizations": { nav: "ek-organizations", kind: "ekyc-organizations", title: "Organizații" },
    "ekyc-sdk": { nav: "ek-sdk", kind: "ekyc-sdk", title: "Versiuni SDK" },
    "ekyc-trusted-cas": { nav: "ek-trusted-cas", kind: "ekyc-trusted-cas", title: "Certificate root CA" }
  };

  /* ---- small helpers ---------------------------------------------------------------- */
  const esc = (v) => S.esc(v);
  const icon = (name, size = 20) => S.icon(name, size);
  const T = (label, tone = "neutral") => A.renderTag(label, tone);
  const statusTag = (on) => T(on ? "Activ" : "Inactiv", on ? "success" : "neutral");
  const num = (v, d = 2) => S.num(v, d);
  const intFmt = (v) => Number(v).toLocaleString("ro-RO");
  const dash = '<span class="e-permits-workplace__dash">—</span>';
  const plural = (n, one, many) => (n === 1 ? `1 ${one}` : `${n} ${many}`);
  const stamp = (iso) => (iso ? A.formatStamp(iso) : "—");
  const longDate = (iso) => (iso ? A.formatLongDate(iso) : "—");
  const updatedCell = (r) => A.renderDateTime(r.updatedAt, r.updatedBy, { short: true });
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const initials = (name) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const yesNo = (on) => (on
    ? `<span class="e-permits-workplace__tag e-permits-workplace__tag--success e-permits-workplace__tag--icon">${icon("checkmark-small", 16)}Da</span>`
    : T("Nu", "neutral"));
  const desc = (text) => (text ? `<span class="e-permits-workplace__role-desc">${esc(text)}</span>` : dash);
  const btn = (label, attrs, { variant = "neutral", ic = "" } = {}) => `<button class="btn btn-${variant} btn-sm" type="button" ${attrs}>${ic ? icon(ic, 16) : ""}<span>${esc(label)}</span></button>`;
  const addBtn = (label, attrs) => `<button class="btn btn-secondary btn-sm" type="button" ${attrs}><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-large"></use></svg><span>${esc(label)}</span></button>`;
  const rowActions = (primary, menu, label) => `<span class="e-permits-workplace__row-actions">${A.renderRowActions({ primary, menu, label })}</span>`;
  const act = (name, id) => `data-ekcfg="${name}" data-id="${esc(id)}"`;
  const me = () => S.me();
  const nowIso = () => S.nowIso();
  const event = (type, detail, status = "Reușit") => ({ at: nowIso(), type, status, detail, user: me() });
  const toast = (text, title, tone = "success") => A.showShellToast(text, tone, title);
  const sectionHead = (title, { meta = "", actions = "" } = {}) => `
    <div class="e-permits-dosar-profil__section-heading">
      <h2 class="e-permits-dosar-profil__section-title">${esc(title)}</h2>
      ${meta || actions ? `<div class="e-permits-passport__heading-tools">${meta ? `<span class="e-permits-dosar-profil__section-meta">${meta}</span>` : ""}${actions}</div>` : ""}
    </div>`;
  /* a table in a rounded card (the eKYC „Descompunerea scorului” table) */
  const cardTable = (head, rows, { cls = "" } = {}) => `
    <div class="e-permits-workplace__table-wrap e-permits-ekyc-breakdown${cls ? ` ${cls}` : ""}">
      <table class="e-permits-workplace__table e-permits-ekyc-breakdown__table">
        <thead><tr>${head.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead>
        <tbody>${rows.join("")}</tbody>
      </table>
    </div>`;
  const orgName = (id) => cfg.organizations.find((o) => o.id === id)?.name || "—";
  const providerName = (id) => cfg.providers.find((p) => p.id === id)?.name || id || "—";
  const scoringName = (id) => cfg.scoring.find((s) => s.id === id)?.name || "—";
  const ucName = (code) => cfg.useCases.find((u) => u.code === code)?.name || code;
  const stepLabel = (type) => STEP_TYPES.find(([t]) => t === type)?.[1] || type;
  const retryBtn = `<button class="btn btn-neutral btn-sm" type="button" data-ekyc-retry>${icon("rotate-arrow", 16)}<span>Reîncearcă</span></button>`;

  /* list states (loading / API error / empty with a call to action / no results) —
     US-UI-11: „fără rezultate” is a different message from the empty list */
  const listEmpty = (kind, { label, emptyTitle, emptyText, cta = "", icon: ic = "settings", noResults }) => ({ query, filtered }) => {
    if (DEMO === "incarcare") return A.renderEmptyState({ title: `Se încarcă ${label}…`, text: "Datele vin din serviciul de configurare.", loading: true, bare: true });
    if (S.failed || loadFailed) return A.renderEmptyState({ title: `Nu am putut încărca ${label}`, text: "Serviciul de configurare nu a răspuns. Reîncearcă peste câteva secunde.", icon: "warning-filled", bare: true, actionHtml: retryBtn });
    if (!allRows(kind).length || S.emptyRows()) return A.renderEmptyState({ title: emptyTitle, text: emptyText, icon: ic, bare: true, actionHtml: typeof cta === "function" ? cta() : cta });
    if (query || filtered) return A.renderNoResults(noResults, { text: "Caută altceva sau schimbă filtrele.", bare: true, actionHtml: filtered ? '<button class="btn btn-neutral btn-sm" type="button" data-filter-clear-all>Șterge filtrele</button>' : "" });
    return A.renderNoResults("Nicio înregistrare în această filă", { text: "Alege altă filă.", bare: true });
  };
  const statusTabs = (labelAll, labelOn, labelOff) => [
    { id: "all", label: labelAll, filter: "all" },
    { id: "on", label: labelOn, filter: "f:activ=1" },
    { id: "off", label: labelOff, filter: "f:activ=0" }
  ];
  const tokenFilter = (row, token) => {
    if (token.startsWith("f:")) { const [k, v] = token.slice(2).split("="); return String(row[k]) === v; }
    return true;
  };
  const csv = (file, head, rows, noun) => {
    if (!rows.length) { toast("Lista nu are înregistrări de exportat.", "Nimic de exportat", "warning"); return; }
    A.exportCsv(file, head, rows);
    toast(`${plural(rows.length, noun[0], noun[1])} în ${file}.`, "Export finalizat");
  };

  /* ---- registries: one builder for the 9 lists ---------------------------------------- */
  const ROWS = {};
  const allRows = (kind) => (cfg ? ROWS[kind]() : []);
  const registry = (view, { columns, order, tabs, search, primary = null, groupBy = "", sortKey, sortDirection = "asc" }) => {
    const v = VIEWS[view];
    const db = {
      kind: v.kind, fieldCount: order.length, statuses: {}, columns,
      views: { main: { title: v.title, selectable: false, toolbarLabel: `Filtrare ${v.title.toLocaleLowerCase("ro")}`, searchPlaceholder: search, columns: order, tabs, primaryAction: primary, groupBy: groupBy || undefined } },
      runtimeRows: S.emptyRows() || loadFailed ? [] : allRows(v.kind)
    };
    A.showRegistry(db, { sortKey, sortDirection });
  };
  /* after a change: the list behind the profile / drawer gets fresh rows */
  const refreshList = () => {
    const kind = document.querySelector("[data-workplace]")?.dataset.registryKind;
    if (!kind || !ROWS[kind]) return;
    A.workplaceState.rows = S.emptyRows() ? [] : allRows(kind);
    if (!A.els.workplacePanel?.hidden) A.renderWorkplace();
  };
  const flashRow = (id) => requestAnimationFrame(() => {
    const tr = document.querySelector(`tr[data-workplace-row="${CSS.escape(id)}"]`);
    if (!tr) return;
    tr.classList.add("is-flash");
    window.setTimeout(() => tr.classList.remove("is-flash"), 1600);
  });

  /* ---- detail pages: the dosar profile panel ------------------------------------------- */
  const ensureList = (view) => {
    const v = VIEWS[view];
    if (!document.querySelector(`[data-nav-id="${v.nav}"].is-active`) || !document.querySelector(`[data-workplace][data-registry-kind="${v.kind}"]`)) {
      A.setActiveNav(v.nav);
      S.showView(view);
    }
  };
  const openPanel = ({ view, crumb, title, actions = "", caption = "", status = "", meta = [], tabs = [], tab = "", body, hash, back }) => {
    S.ui.session = null;
    S.hideDash();
    A.openProfilePanel();
    S.setBackLabel(back || `Înapoi la ${VIEWS[view].title.toLocaleLowerCase("ro")}`);
    const els = A.els;
    els.dosarProfilTitleRow.innerHTML = A.renderPageHeaderTop({ crumbs: [{ label: VIEWS[view].title, attr: "data-dosar-profil-crumb-back" }, ...[].concat(crumb)], title, actions, caption, status });
    els.dosarProfilSummary.innerHTML = meta.length ? A.renderPageHeaderMeta(meta) : "";
    if (meta.length) A.watchPageHeaderMeta(els.dosarProfilSummary);
    els.dosarProfilTabs.innerHTML = tabs.map(([id, label, count, tone]) => {
      const on = id === tab;
      return `<button class="tab-button${on ? " active" : ""}" id="ekcfg-tab-${id}" type="button" role="tab" aria-controls="ekyc-panel" aria-selected="${on}" tabindex="${on ? 0 : -1}" data-ekcfg-tab="${id}"><span>${esc(label)}</span>${count ? A.renderPageHeaderTabCount(count, tone) : ""}</button>`;
    }).join("");
    const panel = els.dosarProfilPanelBody;
    panel.id = "ekyc-panel";
    if (tabs.length) { panel.setAttribute("role", "tabpanel"); panel.setAttribute("aria-labelledby", `ekcfg-tab-${tab}`); } else { panel.removeAttribute("role"); panel.removeAttribute("aria-labelledby"); }
    panel.innerHTML = DEMO === "incarcare" ? A.renderEmptyState({ title: "Se încarcă detaliile…", text: "Datele vin din serviciul de configurare.", loading: true }) : body;
    history.replaceState(null, "", `${location.pathname}${location.search}#${hash}`);
  };
  const notFound = (view, id, what) => (ensureList(view), openPanel({ view, crumb: { label: id }, title: id, hash: location.hash.slice(1) || VIEWS[view].nav, body: A.renderEmptyState({ title: `${what} nu există`, text: `Nu am găsit „${id}”. Poate a fost șters între timp.`, icon: "search", actionHtml: '<button class="btn btn-neutral btn-sm" type="button" data-dosar-profil-crumb-back>Înapoi la listă</button>' }) }));
  const redetail = () => { if (st.detail) DETAIL[st.detail.type](st.detail.id, st.detail.tab); };

  /* =====================================================================================
     Forms — one engine for the drawer (short forms) and the Setări-style page (long forms)
     ===================================================================================== */
  let drawer = null;
  let drawerReturn = null;
  const ensureDrawer = () => {
    if (drawer) return drawer;
    const wrap = document.createElement("div");
    /* the BO right drawer, the classifier value drawer's markup */
    wrap.innerHTML = `
      <div class="e-permits-user-create" data-ekcfg-drawer hidden>
        <button class="e-permits-user-create__scrim" type="button" aria-label="Închide" data-ekcfg-close></button>
        <aside class="e-permits-user-create__drawer" role="dialog" aria-modal="true" aria-labelledby="ekcfg-drawer-title" tabindex="-1">
          <header class="e-permits-user-create__header">
            <div class="e-permits-rt__heading">
              <h2 id="ekcfg-drawer-title" data-ekcfg-title></h2>
              <p class="e-permits-passport__modal-subtitle" data-ekcfg-subtitle></p>
            </div>
            <button class="e-permits-user-create__close" type="button" aria-label="Închide" data-ekcfg-close>
              <svg class="icon" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-cross-large"></use></svg>
            </button>
          </header>
          <div class="e-permits-user-create__body" data-ekcfg-body></div>
          <footer class="e-permits-user-create__footer">
            <span class="e-permits-rt__summary" data-ekcfg-summary aria-live="polite"></span>
            <div class="modal-buttons" data-ekcfg-buttons></div>
          </footer>
        </aside>
      </div>`;
    drawer = wrap.firstElementChild;
    document.body.appendChild(drawer);
    return drawer;
  };
  const dq = (sel) => ensureDrawer().querySelector(sel);

  /* field markup — the full-flow components (components.md › Form fields) */
  const fid = (key) => `ekcfg-${key.replace(/[^a-z0-9-]/gi, "-")}`;
  const errOf = (key) => F?.errors?.[key] || "";
  const errHtml = (key) => S.fieldError(errOf(key));
  /* tip: an explanatory tooltip on a small info button beside the label (US-UI-09) */
  const field = (key, label, control, { required = false, hint = "", span = 12, cls = "", hintTop = false, labelFor = true, tip = "" } = {}) => {
    const labelHtml = `<label ${labelFor ? `for="${fid(key)}"` : `id="${fid(key)}-label"`}>${esc(label)}${required ? S.requiredMark : ""}</label>`;
    return `
    <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}${cls ? ` ${cls}` : ""}" data-ekcfg-wrap="${esc(key)}">
      ${tip ? `<span class="e-permits-fo-field__label-row e-permits-ekcfg-label-row">${labelHtml}<button class="e-permits-ekcfg-tip" type="button" data-tooltip-label="${esc(tip)}" aria-label="${esc(`Despre „${label}”: ${tip}`)}">${icon("circle-info", 16)}</button></span>` : labelHtml}
      ${hint && hintTop ? `<p class="e-permits-fo-field__hint e-permits-fo-field__hint--top">${hint}</p>` : ""}
      ${control}
      ${errHtml(key)}
      ${hint && !hintTop ? `<p class="e-permits-fo-field__hint"${errOf(key) ? " hidden" : ""}>${hint}</p>` : ""}
    </div>`;
  };
  const val = (key) => (F.v[key] ?? "");
  const inp = (key, label, o = {}) => field(key, label, `<div class="e-permits-fo-input${errOf(key) ? " is-error" : ""}"><input id="${fid(key)}" type="text"${o.inputmode ? ` inputmode="${o.inputmode}"` : ""} maxlength="${o.max || 120}" value="${esc(val(key))}" placeholder="${esc(o.placeholder || "")}" autocomplete="off" data-ekcfg-field="${esc(key)}"${errOf(key) ? ' aria-invalid="true"' : ""}></div>`, o);
  /* „needitabil după creare”: the BO read-only box with the lock (classifier „Categorie”) */
  const locked = (key, label, text, o = {}) => field(key, label, `<div class="e-permits-fo-input is-filled is-readonly"><input id="${fid(key)}" type="text" value="${esc(text)}" readonly tabindex="-1"><svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-lock"></use></svg></div>`, { hint: "Nu se modifică după creare.", ...o });
  const area = (key, label, o = {}) => {
    const max = o.max || 500;
    return `
    <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${o.span || 12}" data-ekcfg-wrap="${esc(key)}">
      <label for="${fid(key)}">${esc(label)}${o.required ? S.requiredMark : ""}</label>
      <div class="e-permits-fo-textarea${errOf(key) ? " is-error" : ""}"><textarea id="${fid(key)}" rows="${o.rows || 3}" maxlength="${max}" placeholder="${esc(o.placeholder || "")}" data-ekcfg-field="${esc(key)}"${errOf(key) ? ' aria-invalid="true"' : ""}>${esc(val(key))}</textarea></div>
      ${errHtml(key)}
      <p class="e-permits-fo-field__hint e-permits-ntpl-count"><span>${o.hint || ""}</span><span class="e-permits-ntpl-count__value" data-ekcfg-count="${esc(key)}">${String(val(key)).length}/${max}</span></p>
    </div>`;
  };
  const sel = (key, label, options, o = {}) => field(key, label, A.renderFoSelectControl({
    id: fid(key), attrs: `data-ekcfg-field="${esc(key)}"`, error: Boolean(errOf(key)),
    optionsHtml: `${o.placeholder !== false ? `<option value=""${val(key) ? "" : " selected"}${o.allowEmpty ? "" : " disabled"}>${esc(o.placeholder || "Alege")}</option>` : ""}${options.map((x) => { const [value, text] = Array.isArray(x) ? x : [x, x]; return `<option value="${esc(value)}"${String(value) === String(val(key)) ? " selected" : ""}>${esc(text)}</option>`; }).join("")}`
  }), o);
  const tog = (key, label, description = "", o = {}) => `<div class="e-permits-user-create__field e-permits-user-create__field--${o.span || 12}">${A.renderToggle({ label, description, checked: Boolean(F.v[key]), attrs: `data-ekcfg-field="${esc(key)}"`, disabled: o.disabled })}</div>`;
  const checks = (key, label, options, o = {}) => field(key, label, `<div class="e-permits-pay__exemptions" role="group" aria-labelledby="${fid(key)}-label">${options.map((x) => { const [value, text] = Array.isArray(x) ? x : [x, x]; return A.renderCheckOption({ label: text, plain: true, checked: (F.v[key] || []).includes(value), attrs: `value="${esc(value)}" data-ekcfg-check="${esc(key)}"` }); }).join("")}</div>`, { ...o, cls: "e-permits-cfg-checks", hintTop: true, labelFor: false });
  /* editable list of single values (Redirect URIs, IP whitelist): one input per row + „Elimină”,
     „Adaugă …” under the rows — one add/remove pattern for every list (US-UI-07 AC) */
  const rowsField = (key, label, o = {}) => {
    const items = F.v[key] || [];
    return field(key, label, `
      <div class="e-permits-ekcfg-list" data-ekcfg-list="${esc(key)}">
        ${items.map((item, i) => `
          <div class="e-permits-ekcfg-list__item">
            <div class="e-permits-ekcfg-list__row">
              <div class="e-permits-fo-input${errOf(`${key}.${i}`) ? " is-error" : ""}"><input id="${fid(`${key}-${i}`)}" type="text" value="${esc(item)}" placeholder="${esc(o.placeholder || "")}" autocomplete="off" aria-label="${esc(`${label} ${i + 1}`)}" data-ekcfg-item="${esc(key)}" data-index="${i}"${errOf(`${key}.${i}`) ? ' aria-invalid="true"' : ""}></div>
              <button class="btn btn-text-destructive btn-sm" type="button" data-ekcfg-item-remove="${esc(key)}" data-index="${i}" aria-label="${esc(`Elimină ${label.toLocaleLowerCase("ro")} ${i + 1}`)}">Elimină</button>
            </div>
            ${S.fieldError(errOf(`${key}.${i}`))}
          </div>`).join("")}
        <div class="e-permits-tax-cond__add"><button class="btn btn-neutral btn-sm" type="button" data-ekcfg-item-add="${esc(key)}"><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-large"></use></svg><span>${esc(o.addLabel || "Adaugă")}</span></button></div>
      </div>`, { ...o, labelFor: false, hintTop: true });
  };
  /* chips you can type (Scope-uri permise): input + „Adaugă” on one row, the full-flow chips
     (.e-permits-fo-subgen-chip, as under „Subgen de activitate”) under it */
  const chipsField = (key, label, o = {}) => {
    const items = F.v[key] || [];
    return field(key, label, `
      <div class="e-permits-ekcfg-list">
        <div class="e-permits-ekcfg-list__row">
          <div class="e-permits-fo-input${errOf(key) ? " is-error" : ""}"><input id="${fid(key)}" type="text" placeholder="${esc(o.placeholder || "")}" autocomplete="off" list="${fid(key)}-options" data-ekcfg-chip-input="${esc(key)}"${errOf(key) ? ' aria-invalid="true"' : ""}></div>
          <button class="btn btn-neutral btn-sm" type="button" data-ekcfg-chip-add="${esc(key)}">Adaugă</button>
        </div>
        ${o.suggest ? `<datalist id="${fid(key)}-options">${o.suggest.filter((x) => !items.includes(x)).map((x) => `<option value="${esc(x)}"></option>`).join("")}</datalist>` : ""}
        ${items.length ? `<div class="e-permits-fo-subgen__chips">${items.map((x) => `
          <span class="e-permits-fo-subgen-chip">
            <span class="e-permits-fo-subgen-chip__label">${esc(x)}</span>
            <button class="e-permits-fo-subgen-chip__remove" type="button" aria-label="${esc(`Elimină ${x}`)}" data-ekcfg-chip-remove="${esc(key)}" data-value="${esc(x)}">${icon("cross-small")}</button>
          </span>`).join("")}</div>` : ""}
      </div>`, o);
  };
  const grid = (...fields) => `<div class="e-permits-user-create__grid">${fields.join("")}</div>`;
  const dSection = (title, html) => `
    <section class="e-permits-user-create__section">
      <h3 class="e-permits-user-create__section-title">${esc(title)}</h3>
      <div class="e-permits-user-create__section-content">${html}</div>
    </section>`;

  const FORMS = {};
  const changedCount = () => (F ? Object.keys(F.v).filter((k) => JSON.stringify(F.v[k]) !== JSON.stringify(F.original[k])).length : 0);

  const renderDrawer = () => {
    const def = FORMS[F.type];
    dq("[data-ekcfg-title]").textContent = def.title(F);
    dq("[data-ekcfg-subtitle]").textContent = def.subtitle?.(F) || "";
    dq("[data-ekcfg-body]").innerHTML = def.body(F);
    dq("[data-ekcfg-summary]").textContent = def.summary?.(F) || "";
    dq("[data-ekcfg-buttons]").innerHTML = `<button class="btn btn-neutral btn-rounded" type="button" data-ekcfg-close>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-ekcfg-submit>${esc(def.submit(F))}</button>`;
  };
  const openForm = (type, mode, id = null, extra = {}) => {
    const def = FORMS[type];
    const v = def.values(mode, id, extra);
    F = { type, mode, id, extra, v, original: clone(v), errors: {}, where: def.page ? "page" : "drawer" };
    if (def.page) { renderPageForm(); return; }
    drawerReturn = document.activeElement;
    renderDrawer();
    ensureDrawer().hidden = false;
    document.body.classList.add("is-user-create-open");
    requestAnimationFrame(() => dq("[data-ekcfg-body]").querySelector("input:not([readonly]), textarea, .e-permits-fo-select__button")?.focus());
  };
  const closeDrawer = (force = false) => {
    if (!drawer || drawer.hidden || drawer.classList.contains("is-closing")) return;
    const done = () => {
      drawer.classList.add("is-closing");
      window.setTimeout(() => { drawer.hidden = true; drawer.classList.remove("is-closing"); document.body.classList.remove("is-user-create-open"); F = null; drawerReturn?.focus?.(); }, 120);
    };
    if (!force && F && changedCount()) { A.askConfirm({ title: "Renunți la modificări?", text: "Datele introduse în formular se pierd.", confirmLabel: "Renunță", destructive: true }, done); return; }
    done();
  };
  /* validation → errors under the fields; the first one gets the focus */
  const submitForm = () => {
    const def = FORMS[F.type];
    F.errors = def.validate(F);
    if (Object.keys(F.errors).length) {
      if (F.where === "page") renderPageForm(true); else renderDrawer();
      const root = F.where === "page" ? A.els.dosarProfilPanelBody : dq("[data-ekcfg-body]");
      const first = root.querySelector(".e-permits-fo-field__error")?.closest(".e-permits-fo-field, .e-permits-ekcfg-list__item");
      first?.scrollIntoView({ block: "center", behavior: "smooth" });
      first?.querySelector("input:not([readonly]), textarea, .e-permits-fo-select__button")?.focus({ preventScroll: true });
      return;
    }
    const after = def.save(F);
    if (F.where === "drawer") { const f = F; F = f; closeDrawer(true); }
    refreshList();
    after?.();
  };

  /* the Setări one-page form (Clienți, Furnizori): section list · section cards · save bar */
  const renderPageForm = (keepScroll = false) => {
    const def = FORMS[F.type];
    const sections = def.sections(F);
    const errSec = new Set(sections.filter(([key]) => def.fieldsOf(key).some((k) => Object.keys(F.errors).some((e) => e === k || e.startsWith(`${k}.`)))).map(([key]) => key));
    const scrollY = window.scrollY;
    openPanel({
      view: def.view, crumb: def.crumbs(F), title: def.title(F), hash: def.hash(F), back: def.back,
      caption: F.mode === "edit" ? `Ultima editare: ${stamp(def.entity(F).updatedAt)} · ${def.entity(F).updatedBy}` : "",
      body: `
        <div class="e-permits-cfg2 e-permits-ekcfg-page" data-ekcfg-page>
          <nav class="e-permits-cfg2__nav" aria-label="Secțiunile formularului">
            <ul role="list">${sections.map(([key, title, ic], i) => `
              <li><a class="e-permits-cfg2__nav-link" href="#ekcfg-sec-${key}" data-ekcfg-nav="${key}"${i === 0 ? ' aria-current="true"' : ""}>
                <svg class="icon small e-permits-cfg2__nav-icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${ic}"></use></svg>
                <span class="e-permits-cfg2__nav-text" data-text="${esc(title)}">${esc(title)}</span>${navDot(key, errSec)}
              </a></li>`).join("")}</ul>
          </nav>
          <div class="e-permits-cfg2__main">
            ${def.note ? A.renderInfoNote(def.note(F)) : ""}
            ${sections.map(([key, title, , description, html]) => `
              <section class="e-permits-cfg2__section" id="ekcfg-sec-${key}" data-ekcfg-section="${key}" aria-labelledby="ekcfg-sec-${key}-title">
                <div class="e-permits-cfg2__head">
                  <h2 class="e-permits-dosar-profil__section-title" id="ekcfg-sec-${key}-title" tabindex="-1">${esc(title)}</h2>
                  <p class="e-permits-cfg2__desc">${esc(description)}</p>
                </div>
                <div class="e-permits-ntpl-card e-permits-clas-create e-permits-cfg-form${errSec.has(key) ? " has-error" : ""}" data-ekcfg-card="${key}">${html}</div>
              </section>`).join("")}
          </div>
          <div class="e-permits-cfg2__bar" role="region" aria-label="Salvare" data-ekcfg-bar>${pageBar()}</div>
        </div>`
    });
    if (keepScroll) window.scrollTo(0, scrollY);
    pageSpy();
  };
  /* the section list follows the scroll (Setări's cfg2Spy): sticky under the pinned header,
     current = the last section whose title is in the top 30% of the visible area */
  let spyPausedUntil = 0;
  const pageSpy = () => {
    const root = document.querySelector("[data-ekcfg-page]");
    if (!root) return;
    const pinned = () => A.els.dosarProfilTabs?.closest(".e-permits-page-header")?.getBoundingClientRect().bottom || 0;
    root.style.setProperty("--cfg2-stick", `${(A.els.dosarProfilTabs?.offsetHeight || 0) + 24}px`);
    const onScroll = () => {
      if (!root.isConnected) { window.removeEventListener("scroll", onScroll, true); return; }
      if (Date.now() < spyPausedUntil) return;
      const secs = [...root.querySelectorAll("[data-ekcfg-section]")];
      const top = Math.max(0, pinned());
      const stick = top + (window.innerHeight - top) * 0.3;
      const el = document.scrollingElement;
      const atEnd = el.scrollTop > 0 && Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight - 2;
      const current = atEnd ? secs[secs.length - 1] : secs.filter((x) => x.getBoundingClientRect().top <= stick).pop() || secs[0];
      root.querySelectorAll("[data-ekcfg-nav]").forEach((a) => (a.dataset.ekcfgNav === current?.dataset.ekcfgSection ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
    };
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    onScroll();
  };
  const navDot = (key, errSec) => (errSec.has(key) ? '<span class="e-permits-cfg2__dot e-permits-cfg2__dot--error" role="img" aria-label="are erori"></span>' : "");
  const pageBar = () => {
    const def = FORMS[F.type];
    const n = changedCount();
    const e = Object.keys(F.errors).length;
    const text = F.mode === "create"
      ? `<span>${esc(def.barCreate)}</span>`
      : n ? A.renderHeaderStatus(n === 1 ? "1 modificare nesalvată" : `${n} modificări nesalvate`, "warning") : "<span>Nicio modificare</span>";
    return `
      <p class="e-permits-cfg2__bar-text" aria-live="polite">${text}${e ? ` · <span class="e-permits-cfg2__bar-error">${e === 1 ? "1 câmp de corectat" : `${e} câmpuri de corectat`}</span>` : ""}</p>
      <div class="e-permits-cfg2__bar-actions">
        <button class="btn btn-neutral btn-sm" type="button" data-ekcfg-page-cancel>Anulează</button>
        <button class="btn btn-primary btn-sm" type="button" data-ekcfg-submit>${esc(def.submit(F))}</button>
      </div>`;
  };
  /* after every edit on the page: bar + section dots + red cards — never the form itself */
  const refreshPage = () => {
    const root = document.querySelector("[data-ekcfg-page]");
    if (!root || !F) return;
    const def = FORMS[F.type];
    const errSec = new Set(def.sections(F).map(([key]) => key).filter((key) => def.fieldsOf(key).some((k) => Object.keys(F.errors).some((e) => e === k || e.startsWith(`${k}.`)))));
    root.querySelectorAll("[data-ekcfg-nav]").forEach((a) => { a.querySelector(".e-permits-cfg2__dot")?.remove(); a.insertAdjacentHTML("beforeend", navDot(a.dataset.ekcfgNav, errSec)); });
    root.querySelectorAll("[data-ekcfg-card]").forEach((card) => card.classList.toggle("has-error", errSec.has(card.dataset.ekcfgCard)));
    const bar = root.querySelector("[data-ekcfg-bar]");
    if (bar && !bar.contains(document.activeElement)) bar.innerHTML = pageBar();
  };
  const leavePage = (proceed) => {
    if (!F || F.where !== "page" || !changedCount()) { F = null; proceed(); return; }
    A.askConfirm({ title: "Renunți la modificări?", text: "Datele introduse pe această pagină se pierd.", confirmLabel: "Renunță", destructive: true }, () => { F = null; proceed(); });
  };
  /* redraw the form part that holds the given element (a list row added / removed …) */
  const redrawForm = (focusSel) => {
    if (!F) return;
    if (F.where === "page") renderPageForm(true); else dq("[data-ekcfg-body]").innerHTML = FORMS[F.type].body(F);
    if (focusSel) requestAnimationFrame(() => document.querySelector(focusSel)?.focus());
  };
  const clearError = (key, el) => {
    if (!F || !F.errors[key]) return;
    delete F.errors[key];
    const wrap = el.closest(".e-permits-ekcfg-list__item") || el.closest(".e-permits-fo-field");
    wrap?.querySelector(":scope > .e-permits-fo-field__error")?.remove();
    wrap?.querySelector(".is-error")?.classList.remove("is-error");
    wrap?.querySelector(":scope > .e-permits-fo-field__hint[hidden]")?.removeAttribute("hidden");
    el.removeAttribute("aria-invalid");
    if (F.where === "page") refreshPage();
  };

  /* shared validators */
  const REQ = "Câmpul este obligatoriu.";
  const isUrl = (s) => /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(:\d+)?(\/\S*)?$/i.test(s);
  const isRedirect = (s) => isUrl(s) || /^[a-z][a-z0-9+.-]*:\/\/\S+$/i.test(s);
  const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(s);
  const isIdno = (s) => /^\d{13}$/.test(s);
  const isCidr = (s) => {
    const m = s.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2}))?$/);
    return Boolean(m) && m.slice(1, 5).every((x) => Number(x) <= 255) && (m[5] === undefined || Number(m[5]) <= 32);
  };
  const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  const isSemver = (s) => /^\d+\.\d+\.\d+(-[0-9a-z.-]+)?$/i.test(s);
  const toNum = (s) => (String(s).trim() === "" ? NaN : Number(String(s).replace(",", ".")));
  const intIn = (s, min, max) => { const n = toNum(s); return Number.isInteger(n) && n >= min && n <= max; };
  const unit = (s) => { const n = toNum(s); return !Number.isNaN(n) && n >= 0 && n <= 1; };

  /* =====================================================================================
     Utilizatori (US-UI-13 91134, US-05-10-B 89241) — from MPass, no create / edit
     ===================================================================================== */
  const userRow = (u) => ({
    id: u.id, user: u, nume: u.name, email: u.email, roluri: u.roles, status: u.status,
    ultimaAutentificare: u.lastLoginAt, esuate: u.failedLogins, creat: u.createdAt, self: u.name === me()
  });
  ROWS["ekyc-users"] = () => cfg.users.map(userRow);
  const showUsers = () => registry("ekyc-users", {
    columns: {
      nume: { label: "Utilizator", width: 232, sortable: true },
      email: { label: "Email", width: 232, sortable: true },
      roluri: { label: "Roluri", width: 280, fill: true },
      status: { label: "Status cont", width: 136, sortable: true },
      ultimaAutentificare: { label: "Ultima autentificare", width: 176, sortable: true },
      esuate: { label: "Login-uri eșuate", width: 136, sortable: true },
      creat: { label: "Creat la", width: 144, sortable: true },
      actiuni: { label: "", width: 176 }
    },
    order: ["nume", "email", "roluri", "status", "ultimaAutentificare", "esuate", "creat", "actiuni"],
    tabs: [{ id: "all", label: "Toți", filter: "all" }, ...Object.keys(ACCOUNT_TONES).map((s) => ({ id: s, label: { Activ: "Activi", Suspendat: "Suspendați", Blocat: "Blocați" }[s], filter: `f:status=${s}` }))],
    search: "Căutare după nume, email sau rol", sortKey: "nume", sortDirection: "asc"
  });
  const userCell = (r, key) => {
    switch (key) {
      case "nume": return `
        <div class="e-permits-workplace__user-identity">
          <span class="e-permits-workplace__user-avatar" aria-hidden="true">${esc(initials(r.nume))}</span>
          <span class="e-permits-workplace__user-name-stack"><span>${esc(r.nume)}</span><span>${r.self ? "Contul tău" : esc(r.roluri[0])}</span></span>
        </div>`;
      case "email": return desc(r.email);
      case "roluri": return chips(r.roluri, "Toate rolurile");
      case "status": return T(r.status, ACCOUNT_TONES[r.status]);
      case "ultimaAutentificare": return r.ultimaAutentificare ? A.renderDateTime(r.ultimaAutentificare, S.ago(r.ultimaAutentificare)) : '<span class="e-permits-workplace__date-meta">Nu s-a autentificat încă</span>';
      case "esuate": return r.esuate ? T(String(r.esuate), "danger") : "0";
      case "creat": return A.renderDateTime(r.creat);
      case "actiuni": return rowActions({ label: "Vezi detalii", attrs: `${act("user-open", r.id)} aria-label="Vezi detaliile contului ${esc(r.nume)}"` },
        r.self ? [] : [r.status === "Activ"
          ? { label: "Suspendă contul", icon: "pause", attrs: act("user-suspend", r.id), danger: true }
          : { label: r.status === "Blocat" ? "Deblochează contul" : "Reactivează contul", icon: "rotate-arrow", attrs: act("user-reactivate", r.id) }], r.nume);
      default: return esc(r[key] ?? "—");
    }
  };
  const findUser = (id) => cfg.users.find((u) => u.id === id);
  const activeSessions = (u) => u.sessions.filter((x) => !x.revoked);

  const USER_TABS = (u) => [["general", "Date generale"], ["sesiuni", "Sesiuni de lucru", activeSessions(u).length], ["jurnal", "Jurnal", u.events.length]];
  const userDetail = (id, tab = "general") => {
    const u = findUser(id);
    if (!u) { notFound("ekyc-users", id, "Utilizatorul"); return; }
    ensureList("ekyc-users");
    st.detail = { type: "user", id, tab };
    const self = u.name === me();
    const suspended = u.status !== "Activ";
    const actions = `
      ${btn(self ? "Revocă celelalte sesiuni" : "Revocă toate sesiunile", `${act("user-revoke-all", u.id)}${activeSessions(u).length - (self ? 1 : 0) > 0 ? "" : ' aria-disabled="true" data-tooltip-reason="Nu există sesiuni active de revocat."'}`, { ic: "logout" })}
      ${suspended
        ? btn(u.status === "Blocat" ? "Deblochează contul" : "Reactivează contul", act("user-reactivate", u.id), { variant: "primary", ic: "rotate-arrow" })
        : btn("Suspendă contul", `${act("user-suspend", u.id)}${self ? ' aria-disabled="true" data-tooltip-reason="Nu îți poți suspenda propriul cont. Cere altui administrator."' : ""}`, { ic: "pause" })}`;
    openPanel({
      view: "ekyc-users", crumb: { label: u.name }, title: u.name, actions, caption: self ? "Contul tău" : "",
      meta: [["Email", esc(u.email)], ["MPass ID", A.renderCopyCode(u.mpassId, `Copiază ${u.mpassId}`)], ["Roluri", `<span class="e-permits-passport__tag-list">${u.roles.map((r) => T(r)).join("")}</span>`], ["Status cont", T(u.status, ACCOUNT_TONES[u.status])]],
      tabs: USER_TABS(u), tab, hash: `ek-utilizator/${u.id}/${tab}`, back: "Înapoi la utilizatori",
      body: tab === "sesiuni" ? userSessions(u) : tab === "jurnal" ? A.renderEventTimeline("Jurnal", u.events, { meta: "Jurnalizat prin MLog" }) : userGeneral(u)
    });
  };
  const userGeneral = (u) => {
    const active = activeSessions(u).length;
    return `
      <section class="e-permits-dosar-profil__section" aria-label="Proveniența contului">${A.renderNotice("info", `Contul vine din <strong>MPass</strong>: s-a creat automat la prima autentificare, iar numele, emailul și rolurile se sincronizează din sistemul de identitate. Aici nu se adaugă și nu se editează utilizatori — administratorul poate doar suspenda accesul și revoca sesiunile de lucru.`)}</section>
      <section class="e-permits-dosar-profil__section" aria-label="Activitate">
        <ul class="e-permits-kpi-grid" role="list">
          ${S.kpi("Sesiuni active", String(active), active ? `din <strong>${u.sessions.length}</strong> sesiuni de lucru` : "nicio sesiune deschisă")}
          ${S.kpi("Login-uri eșuate", String(u.failedLogins), u.failedLogins >= 5 ? "contul se blochează la 5 eșecuri" : "de la ultima autentificare reușită", "", u.failedLogins ? "danger" : "")}
          ${S.kpi("Ultima autentificare", u.lastLoginAt ? S.shortStamp(u.lastLoginAt) : "—", u.lastLoginAt ? esc(S.ago(u.lastLoginAt)) : "nu s-a autentificat încă")}
        </ul>
      </section>
      ${A.renderInfoCard("Cont", [
        ["Nume", esc(u.name)],
        ["Email", esc(u.email)],
        ["MPass ID", A.renderProfileCopyCode(u.mpassId, `Copiază ${u.mpassId}`)],
        ["Roluri", `<span class="e-permits-passport__tag-list">${u.roles.map((r) => T(r)).join("")}</span>`],
        ["Status cont", T(u.status, ACCOUNT_TONES[u.status])],
        ["Proveniență", "MPass · roluri din sistemul de identitate"],
        ["Creat la", esc(stamp(u.createdAt))]
      ])}`;
  };
  const userSessions = (u) => {
    if (DEMO === "sesiuni-eroare") return `<section class="e-permits-dosar-profil__section">${sectionHead("Sesiuni de lucru")}${A.renderEmptyState({ title: "Nu am putut încărca sesiunile de lucru", text: "Serviciul de autentificare nu a răspuns. Reîncearcă peste câteva secunde.", icon: "warning-filled", actionHtml: retryBtn })}</section>`;
    if (!u.sessions.length) return A.renderPassportEmpty("Sesiuni de lucru", "Acest utilizator nu are sesiuni de lucru.", "", "time");
    const self = u.name === me();
    const short = (iso) => S.shortStamp(iso);
    /* the stacked list of the profile tabs (BO dosar tabs): one row per access token; the browser
       is parsed („Chrome 141, Windows 11”), the raw user agent is its tooltip; revoked / expired
       stay listed in their own group, greyed, for traceability */
    const item = (x) => ({
      title: `<span class="${x.revoked ? "e-permits-ekcfg-muted" : ""}" tabindex="0" data-tooltip-reason="${esc(x.userAgent)}" aria-label="${esc(`${x.browser}. User agent: ${x.userAgent}`)}">${esc(x.browser)}</span>`,
      plainTitle: x.browser,
      badges: [x.revoked ? T(x.revokedReason === "Expirată" ? "Expirată" : "Revocată", "neutral") : T("Activă", "success"), ...(x.current ? [T("Sesiunea ta", "brand")] : [])],
      meta: [`IP ${esc(x.ip)}`, x.revoked ? `${esc(x.revokedReason || "Revocată")}` : `ultima activitate ${esc(S.ago(x.lastActivityAt))}`],
      meta2: [`emisă ${esc(short(x.issuedAt))}`, `expiră ${esc(short(x.expiresAt))}`, `expirare absolută ${esc(short(x.absoluteExpiresAt))}`, ...(x.revoked ? [`ultima activitate ${esc(short(x.lastActivityAt))}`] : [])],
      action: !x.revoked && !x.current ? { label: "Revocă", attrs: `${act("session-revoke", `${u.id}|${x.id}`)} aria-label="Revocă sesiunea de pe ${esc(x.browser)} (${esc(x.ip)})"` } : null
    });
    const n = activeSessions(u).length;
    return A.renderStackedList("Sesiuni de lucru", [
      { label: "Active", items: u.sessions.filter((x) => !x.revoked).map(item) },
      { label: "Revocate sau expirate", items: u.sessions.filter((x) => x.revoked).map(item) }
    ].filter((g) => g.items.length), { meta: `${plural(n, "activă", "active")} · ${u.sessions.length - n} revocate sau expirate${self ? " · inclusiv sesiunea ta" : ""}` });
  };
  const userActions = {
    "user-open": (id) => userDetail(id),
    "user-suspend": (id) => {
      const u = findUser(id);
      if (u.name === me()) return;
      A.askConfirm({ title: `Suspenzi accesul pentru ${u.name}?`, text: "Accesul la consola eKYC se retrage imediat, iar sesiunile de lucru deschise se închid. Contul rămâne în MPass și poate fi reactivat oricând.", confirmLabel: "Suspendă contul", destructive: true }, () => {
        u.status = "Suspendat";
        u.sessions.forEach((x) => { if (!x.revoked) { x.revoked = true; x.revokedReason = "Cont suspendat"; } });
        u.events.unshift(event("Cont suspendat", "Accesul la consolă a fost retras; sesiunile active au fost închise."));
        refreshList(); redetail();
        toast(`Accesul pentru ${u.name} a fost retras.`, "Cont suspendat");
      });
    },
    "user-reactivate": (id) => {
      const u = findUser(id);
      const blocked = u.status === "Blocat";
      A.askConfirm({ title: blocked ? `Deblochezi accesul pentru ${u.name}?` : `Reactivezi accesul pentru ${u.name}?`, text: blocked ? `Contul a fost blocat după ${u.failedLogins} autentificări eșuate. După deblocare, autentificarea prin MPass funcționează din nou, iar contorul de eșecuri se resetează.` : "Accesul la consolă revine la următoarea autentificare, cu rolurile primite din MPass.", confirmLabel: blocked ? "Deblochează contul" : "Reactivează contul" }, () => {
        u.status = "Activ";
        if (blocked) u.failedLogins = 0;
        u.events.unshift(event(blocked ? "Cont deblocat" : "Cont reactivat", blocked ? "Contorul de autentificări eșuate a fost resetat." : "Accesul la consolă a fost redat."));
        refreshList(); redetail();
        toast(`${u.name} se poate autentifica din nou.`, blocked ? "Cont deblocat" : "Cont reactivat");
      });
    },
    "user-revoke-all": (id) => {
      const u = findUser(id);
      const self = u.name === me();
      const targets = activeSessions(u).filter((x) => !x.current);
      if (!targets.length) return;
      A.askConfirm({ title: self ? "Revoci celelalte sesiuni ale tale?" : `Revoci toate sesiunile pentru ${u.name}?`, text: self ? `Te deconectăm de pe celelalte ${plural(targets.length, "dispozitiv", "dispozitive")}. Sesiunea din acest browser rămâne deschisă.` : `Se închid toate sesiunile de lucru deschise (${targets.length}), pe toate dispozitivele. Autentificarea prin MPass rămâne posibilă.`, confirmLabel: self ? "Revocă celelalte sesiuni" : "Revocă toate sesiunile", destructive: true }, () => {
        targets.forEach((x) => { x.revoked = true; x.revokedReason = "Revocată de administrator"; });
        u.events.unshift(event("Sesiuni de lucru revocate", `${plural(targets.length, "sesiune revocată", "sesiuni revocate")}.`));
        if (st.detail) st.detail.tab = "sesiuni";
        refreshList(); redetail();
        toast(`${plural(targets.length, "sesiune revocată", "sesiuni revocate")}.`, "Sesiuni revocate");
      });
    },
    "session-revoke": (pair) => {
      const [uid, sid] = pair.split("|");
      const u = findUser(uid);
      const x = u.sessions.find((s) => s.id === sid);
      A.askConfirm({ title: "Revoci această sesiune?", text: `Sesiunea de pe ${x.browser} (${x.ip}) se închide imediat. Celelalte sesiuni ale contului ${u.name} rămân deschise.`, confirmLabel: "Revocă sesiunea", destructive: true }, () => {
        x.revoked = true; x.revokedReason = "Revocată de administrator";
        u.events.unshift(event("Sesiune de lucru revocată", `${x.browser} · ${x.ip}`));
        refreshList(); redetail();
      });
    }
  };

  /* =====================================================================================
     Clienți / Relying Parties (US-UI-07 91127, US-05-08-B 89236)
     ===================================================================================== */
  const clientRow = (c) => ({ id: c.id, client: c, denumire: c.name, organizatie: orgName(c.orgId), cazuri: c.useCases, scoring: scoringName(c.scoringId), activ: c.active ? 1 : 0, creat: c.createdAt, updatedAt: c.updatedAt, updatedBy: c.updatedBy });
  ROWS["ekyc-clients"] = () => cfg.clients.map(clientRow);
  const showClients = () => registry("ekyc-clients", {
    columns: {
      denumire: { label: "Denumire", width: 232, sortable: true },
      clientId: { label: "Client ID", width: 208, sortable: true },
      organizatie: { label: "Organizație", width: 216, sortable: true },
      cazuri: { label: "Cazuri de utilizare", width: 264, fill: true },
      scoring: { label: "Config scoring", width: 224, sortable: true },
      activ: { label: "Status", width: 112, sortable: true },
      creat: { label: "Creat la", width: 144, sortable: true },
      actiuni: { label: "", width: 168 }
    },
    order: ["denumire", "clientId", "organizatie", "cazuri", "scoring", "activ", "creat", "actiuni"],
    tabs: statusTabs("Toți", "Activi", "Inactivi"), search: "Căutare după denumire, Client ID sau organizație",
    primary: { id: "client-new", label: "Adaugă client" }, sortKey: "denumire"
  });
  /* chips: max 2 visible + „+N” with the rest in a tooltip (the users-registry roles pattern);
     long codes wrap to a second line instead of being clipped (passport tag list) */
  const chips = (items, what) => (items.length ? `<span class="e-permits-passport__tag-list">${items.slice(0, 2).map((c) => T(c)).join("")}${items.length > 2 ? `<span class="e-permits-workplace__user-role-more" tabindex="0" data-cell-tooltip="${esc(items.slice(2).join(", "))}" data-cell-tooltip-always aria-label="${esc(`${what}: ${items.join(", ")}`)}">+${items.length - 2}</span>` : ""}</span>` : dash);
  const ucChips = (codes) => chips(codes, "Toate cazurile");
  const clientCell = (r, key) => {
    switch (key) {
      case "denumire": return S.identity(r.denumire, r.client.redirectUris[0]?.replace(/^https?:\/\//, "").split("/")[0] || "");
      case "clientId": return A.renderCopyCode(r.id, `Copiază ${r.id}`);
      case "organizatie": return desc(r.organizatie);
      case "cazuri": return ucChips(r.cazuri);
      case "scoring": return desc(r.scoring);
      case "activ": return statusTag(r.activ);
      case "creat": return A.renderDateTime(r.creat);
      case "actiuni": return rowActions({ label: "Editează", attrs: act("client-edit", r.id) }, [
        { label: "Vezi detalii", icon: "eye-open", attrs: act("client-open", r.id) },
        r.activ ? { label: "Dezactivează", icon: "pause", attrs: act("client-toggle", r.id), danger: true } : { label: "Activează", icon: "rotate-arrow", attrs: act("client-toggle", r.id) }
      ], r.denumire);
      default: return esc(r[key] ?? "—");
    }
  };
  const findClient = (id) => cfg.clients.find((c) => c.id === id);
  const clientDetail = (id, tab = "configuratie") => {
    const c = findClient(id);
    if (!c) { notFound("ekyc-clients", id, "Clientul"); return; }
    ensureList("ekyc-clients");
    st.detail = { type: "client", id, tab };
    const list = (items) => (items.length ? `<span class="e-permits-passport__tag-list">${items.map((x) => T(x)).join("")}</span>` : dash);
    const lines = (items) => (items.length ? `<span class="e-permits-ekcfg-lines">${items.map((x) => `<span>${esc(x)}</span>`).join("")}</span>` : dash);
    const body = tab === "jurnal" ? A.renderEventTimeline("Jurnal", c.events, { meta: "Jurnalizat prin MLog" }) : `
      ${A.renderInfoCard("Date generale", [["Organizație", esc(orgName(c.orgId))], ["Denumire", esc(c.name)], ["Client ID", A.renderProfileCopyCode(c.id, `Copiază ${c.id}`)], ["MPass Client ID", A.renderProfileCopyCode(c.mpassClientId, `Copiază ${c.mpassClientId}`)]])}
      ${A.renderInfoCard("Integrare", [["Redirect URIs", lines(c.redirectUris)], ["Scope-uri permise", list(c.scopes)], ["Callback URL", c.callbackUrl ? esc(c.callbackUrl) : dash]])}
      ${A.renderInfoCard("Restricții", [["IP whitelist", c.ipWhitelist.length ? list(c.ipWhitelist) : "Fără restricție de IP"], ["Țări documente permise", list(c.countries)], ["Sesiuni concurente (max.)", c.maxSessions ? intFmt(c.maxSessions) : "Fără limită"]])}
      ${A.renderInfoCard("Verificare", [["Cazuri de utilizare", c.useCases.length ? `<span class="e-permits-ekcfg-lines">${c.useCases.map((code) => `<span>${esc(ucName(code))} <span class="e-permits-dosar-profil__termen-meta">${esc(code)}</span></span>`).join("")}</span>` : dash], ["Configurație scoring", esc(scoringName(c.scoringId))]])}
      ${A.renderInfoCard("Audit", [["Creat la", esc(stamp(c.createdAt))], ["Actualizat la", esc(stamp(c.updatedAt))], ["Actualizat de", esc(c.updatedBy)]])}`;
    openPanel({
      view: "ekyc-clients", crumb: { label: c.name }, title: c.name,
      actions: `${btn(c.active ? "Dezactivează" : "Activează", act("client-toggle", c.id), { ic: c.active ? "pause" : "rotate-arrow" })}${btn("Editează", act("client-edit", c.id), { ic: "edit" })}`,
      meta: [["Status", statusTag(c.active)], ["Organizație", esc(orgName(c.orgId))], ["Client ID", A.renderCopyCode(c.id, `Copiază ${c.id}`)], ["Cazuri de utilizare", String(c.useCases.length)]],
      tabs: [["configuratie", "Configurație"], ["jurnal", "Jurnal", c.events.length]], tab, hash: `ek-client/${c.id}/${tab}`, back: "Înapoi la clienți", body
    });
  };
  FORMS.client = {
    page: true, view: "ekyc-clients", back: "Înapoi la clienți",
    barCreate: "Client nou · câmpurile marcate sunt obligatorii",
    entity: (f) => findClient(f.id),
    title: (f) => (f.mode === "create" ? "Client nou" : `Editează ${findClient(f.id).name}`),
    crumbs: (f) => (f.mode === "create" ? { label: "Client nou" } : [{ label: findClient(f.id).name }, { label: "Editare" }]),
    hash: (f) => (f.mode === "create" ? "ek-client-nou" : `ek-client/${f.id}/editeaza`),
    submit: (f) => (f.mode === "create" ? "Creează clientul" : "Salvează"),
    note: (f) => (f.mode === "edit" ? "Modificările se aplică sesiunilor noi imediat după salvare; sesiunile în curs continuă cu configurația cu care au pornit." : "Clientul se creează activ. Client ID-ul și MPass Client ID-ul se comunică echipei de integrare a organizației."),
    values: (mode, id) => {
      if (mode === "edit") { const c = findClient(id); return { orgId: c.orgId, name: c.name, clientId: c.id, mpassClientId: c.mpassClientId, redirectUris: [...c.redirectUris], scopes: [...c.scopes], callbackUrl: c.callbackUrl, ipWhitelist: [...c.ipWhitelist], countries: [...c.countries], maxSessions: String(c.maxSessions || ""), useCases: [...c.useCases], scoringId: c.scoringId }; }
      return { orgId: "", name: "", clientId: "", mpassClientId: "", redirectUris: [""], scopes: ["openid"], callbackUrl: "", ipWhitelist: [], countries: ["MDA"], maxSessions: "100", useCases: [], scoringId: "" };
    },
    fieldsOf: (sec) => ({ general: ["orgId", "name", "clientId", "mpassClientId"], integrare: ["redirectUris", "scopes", "callbackUrl"], restrictii: ["ipWhitelist", "countries", "maxSessions"], verificare: ["useCases", "scoringId"] })[sec],
    sections: (f) => [
      ["general", "Date generale", "page-text", "Cui aparține clientul și cum se identifică în platformă și în MPass.", grid(
        f.mode === "edit" ? locked("orgId", "Organizație", orgName(f.v.orgId), { span: 12, hint: "Nu se modifică după creare — clientul rămâne în organizația lui." }) : sel("orgId", "Organizație", cfg.organizations.filter((o) => o.active).map((o) => [o.id, o.name]), { required: true, placeholder: "Alege organizația", span: 12 }),
        inp("name", "Denumire", { required: true, span: 6, placeholder: "ex. MAIB App" }),
        inp("clientId", "Client ID", { required: true, span: 6, placeholder: "ex. maib-app", hint: "Litere mici, cifre și cratimă; unic în platformă." }),
        inp("mpassClientId", "MPass Client ID", { required: true, span: 12, placeholder: "xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx", hint: "UUID-ul aplicației înregistrate în MPass (OIDC)." }))],
      ["integrare", "Integrare", "link", "Parametrii OIDC: unde se întoarce utilizatorul, ce poate cere clientul și unde primește rezultatul.", grid(
        rowsField("redirectUris", "Redirect URIs", { required: true, addLabel: "Adaugă URI", placeholder: "https://…/ekyc/callback", hint: "HTTPS sau schema aplicației mobile (ex. md.maib.app://ekyc/result)." }),
        chipsField("scopes", "Scope-uri permise", { required: true, placeholder: "ex. ekyc.result", suggest: SCOPES, hint: "Scrie un scope și apasă Adaugă sau Enter." }),
        inp("callbackUrl", "Callback URL", { span: 12, placeholder: "https://api.…/webhooks/ekyc", hint: "Opțional. Platforma trimite aici rezultatul sesiunii (webhook)." }))],
      ["restrictii", "Restricții", "shield", "Limitează de unde și pentru ce documente poate fi folosit clientul.", grid(
        rowsField("ipWhitelist", "IP whitelist", { addLabel: "Adaugă IP sau rețea", placeholder: "ex. 185.181.228.0/24", hint: "Opțional. Adrese IPv4 sau rețele CIDR; fără rânduri, orice IP este acceptat." }),
        checks("countries", "Țări documente permise", COUNTRIES, { hint: "Coduri ISO 3166 alpha-3 ale țării care a emis actul." }),
        inp("maxSessions", "Număr maxim de sesiuni concurente", { span: 6, inputmode: "numeric", max: 6, hint: "Între 1 și 10 000." }))],
      ["verificare", "Verificare", "face-id", "Fluxurile pe care clientul le poate porni și cum se decide rezultatul.", grid(
        checks("useCases", "Cazuri de utilizare", cfg.useCases.map((u) => [u.code, `${u.name} · ${u.code}${u.active ? "" : " (inactiv)"}`]), { hint: "Clientul poate porni doar fluxurile bifate." }),
        sel("scoringId", "Configurație scoring", cfg.scoring.map((s) => [s.id, `${s.name}${s.active ? "" : " (inactivă)"}`]), { required: true, placeholder: "Alege configurația", span: 12, hint: "Un client are o singură configurație de scoring." }))]
    ],
    validate: (f) => {
      const e = {}; const v = f.v;
      if (!v.orgId) e.orgId = "Alege organizația.";
      if (!v.name.trim()) e.name = REQ;
      if (!v.clientId.trim()) e.clientId = REQ;
      else if (!/^[a-z0-9][a-z0-9-]{2,40}$/.test(v.clientId.trim())) e.clientId = "Folosește litere mici, cifre și cratimă (3–40 de caractere).";
      else if (f.mode === "create" && cfg.clients.some((c) => c.id === v.clientId.trim())) e.clientId = "Există deja un client cu acest Client ID. Alege alt identificator.";
      if (!v.mpassClientId.trim()) e.mpassClientId = REQ; else if (!isUuid(v.mpassClientId.trim())) e.mpassClientId = "Introdu un UUID valid (8-4-4-4-12 caractere hexazecimale).";
      const uris = v.redirectUris.map((x) => x.trim());
      if (!uris.filter(Boolean).length) e["redirectUris.0"] = "Adaugă cel puțin un Redirect URI.";
      uris.forEach((x, i) => { if (x && !isRedirect(x)) e[`redirectUris.${i}`] = "Introdu un URI HTTPS sau schema aplicației (ex. md.app://ekyc)."; else if (x && uris.indexOf(x) !== i) e[`redirectUris.${i}`] = "URI-ul se repetă."; });
      if (!v.scopes.length) e.scopes = "Adaugă cel puțin un scope.";
      else if (!v.scopes.includes("openid")) e.scopes = "Scope-ul „openid” este obligatoriu pentru OIDC.";
      if (v.callbackUrl.trim() && !isUrl(v.callbackUrl.trim())) e.callbackUrl = "Introdu o adresă HTTPS validă.";
      v.ipWhitelist.forEach((x, i) => { if (!x.trim()) e[`ipWhitelist.${i}`] = "Completează adresa sau elimină rândul."; else if (!isCidr(x.trim())) e[`ipWhitelist.${i}`] = "Introdu un IPv4 (ex. 92.115.140.12) sau o rețea CIDR (ex. 92.115.140.0/24)."; });
      if (!v.countries.length) e.countries = "Bifează cel puțin o țară.";
      if (v.maxSessions && !intIn(v.maxSessions, 1, 10000)) e.maxSessions = "Introdu un număr întreg între 1 și 10 000.";
      if (!v.useCases.length) e.useCases = "Bifează cel puțin un caz de utilizare.";
      if (!v.scoringId) e.scoringId = "Alege configurația de scoring.";
      return e;
    },
    save: (f) => {
      const v = f.v;
      const data = { name: v.name.trim(), mpassClientId: v.mpassClientId.trim(), redirectUris: v.redirectUris.map((x) => x.trim()).filter(Boolean), scopes: [...v.scopes], callbackUrl: v.callbackUrl.trim(), ipWhitelist: v.ipWhitelist.map((x) => x.trim()), countries: [...v.countries], maxSessions: Number(v.maxSessions) || 0, useCases: [...v.useCases], scoringId: v.scoringId, updatedAt: nowIso(), updatedBy: me() };
      if (f.mode === "create") {
        const c = { id: v.clientId.trim(), orgId: v.orgId, active: true, createdAt: nowIso(), ...data, events: [event("Client creat", `${data.name} · ${v.clientId.trim()}`)] };
        cfg.clients.push(c);
        return () => { F = null; clientDetail(c.id); toast(`${c.name} poate porni sesiuni cu Client ID „${c.id}”.`, "Client creat"); };
      }
      const c = findClient(f.id);
      const changed = Object.keys(f.v).filter((k) => JSON.stringify(f.v[k]) !== JSON.stringify(f.original[k])).map((k) => CLIENT_LABELS[k] || k);
      Object.assign(c, data);
      c.events.unshift(event("Configurație actualizată", changed.join(" · ") || "Fără modificări"));
      return () => { F = null; clientDetail(c.id); toast(`${changed.length ? `${plural(changed.length, "câmp modificat", "câmpuri modificate")}. ` : ""}Se aplică sesiunilor noi.`, "Client salvat"); };
    }
  };
  const CLIENT_LABELS = { name: "Denumire", mpassClientId: "MPass Client ID", redirectUris: "Redirect URIs", scopes: "Scope-uri", callbackUrl: "Callback URL", ipWhitelist: "IP whitelist", countries: "Țări documente", maxSessions: "Sesiuni concurente", useCases: "Cazuri de utilizare", scoringId: "Configurație scoring" };
  const clientActions = {
    "client-new": () => openForm("client", "create"),
    "client-open": (id) => clientDetail(id),
    "client-edit": (id) => { ensureList("ekyc-clients"); openForm("client", "edit", id); },
    "client-toggle": (id) => {
      const c = findClient(id);
      const on = c.active;
      A.askConfirm({ title: on ? `Dezactivezi clientul ${c.name}?` : `Activezi clientul ${c.name}?`, text: on ? `${c.name} nu mai poate porni sesiuni noi; cele în curs se finalizează. Configurația rămâne salvată.` : `${c.name} poate porni din nou sesiuni pentru ${plural(c.useCases.length, "caz de utilizare", "cazuri de utilizare")}.`, confirmLabel: on ? "Dezactivează" : "Activează", destructive: on }, () => {
        c.active = !on; c.updatedAt = nowIso(); c.updatedBy = me();
        c.events.unshift(event(on ? "Client dezactivat" : "Client activat", on ? "Sesiunile noi sunt refuzate." : "Sesiunile noi sunt acceptate."));
        refreshList(); redetail(); flashRow(id);
        toast(on ? `${c.name} nu mai poate porni sesiuni noi.` : `${c.name} poate porni sesiuni.`, on ? "Client dezactivat" : "Client activat");
      });
    }
  };

  /* =====================================================================================
     Cazuri de utilizare (US-UI-08 91128, US-05-04-B 89227, US-05-05-B 89229)
     ===================================================================================== */
  const ucRow = (u) => ({ id: u.code, uc: u, denumire: u.name, cod: u.code, nivel: u.ial, versiune: u.version, pasi: u.steps.length, activ: u.active ? 1 : 0, updatedAt: u.updatedAt, updatedBy: u.updatedBy });
  ROWS["ekyc-use-cases"] = () => cfg.useCases.map(ucRow);
  const showUseCases = () => registry("ekyc-use-cases", {
    columns: {
      denumire: { label: "Denumire", width: 280, fill: true, sortable: true },
      cod: { label: "Cod", width: 248, sortable: true },
      nivel: { label: "Nivel asigurare", width: 144, sortable: true },
      versiune: { label: "Versiune", width: 104, sortable: true },
      pasi: { label: "Pași", width: 120, sortable: true },
      activ: { label: "Status", width: 112, sortable: true },
      updatedAt: { label: "Actualizat la", width: 168, sortable: true },
      actiuni: { label: "", width: 168 }
    },
    order: ["denumire", "cod", "nivel", "versiune", "pasi", "activ", "updatedAt", "actiuni"],
    tabs: statusTabs("Toate", "Active", "Inactive"), search: "Căutare după denumire sau cod",
    primary: { id: "uc-new", label: "Adaugă caz de utilizare" }, sortKey: "denumire"
  });
  const ucCell = (r, key) => {
    switch (key) {
      case "denumire": return S.identity(r.denumire, r.uc.description);
      case "cod": return A.renderCopyCode(r.cod, `Copiază ${r.cod}`);
      case "nivel": return T(r.nivel);
      case "versiune": return `v${esc(r.versiune)}`;
      case "pasi": return r.pasi ? String(r.pasi) : `<span class="e-permits-workplace__tag e-permits-workplace__tag--warning e-permits-workplace__tag--icon">${icon("warning-filled", 16)}0 · flux incomplet</span>`;
      case "activ": return statusTag(r.activ);
      case "updatedAt": return updatedCell(r);
      case "actiuni": return rowActions({ label: "Editează", attrs: act("uc-edit", r.id) }, [
        { label: "Vezi detalii", icon: "eye-open", attrs: act("uc-open", r.id) },
        r.activ ? { label: "Dezactivează", icon: "pause", attrs: act("uc-toggle", r.id), danger: true } : { label: "Activează", icon: "rotate-arrow", attrs: act("uc-toggle", r.id) }
      ], r.denumire);
      default: return esc(r[key] ?? "—");
    }
  };
  const findUc = (code) => cfg.useCases.find((u) => u.code === code);
  const clientsOfUc = (code) => cfg.clients.filter((c) => c.useCases.includes(code));
  /* every change increments the flow version (US-UI-08) and lands in the version history */
  const bumpVersion = (u, change) => {
    const [maj, min] = u.version.split(".").map(Number);
    u.version = `${maj}.${min + 1}`;
    u.versions.forEach((v) => { v.current = false; });
    u.versions.unshift({ version: u.version, at: nowIso(), by: me(), change, current: true, snapshot: { steps: clone(u.steps), veto: clone(u.veto) } });
    u.events.unshift({ at: nowIso(), type: `Versiunea v${u.version} publicată`, status: "Reușit", detail: change, user: me() });
    u.updatedAt = nowIso(); u.updatedBy = me();
  };
  const ucDetail = (code, tab = "pasi") => {
    const u = findUc(code);
    if (!u) { notFound("ekyc-use-cases", code, "Cazul de utilizare"); return; }
    ensureList("ekyc-use-cases");
    st.detail = { type: "uc", id: code, tab };
    const body = tab === "veto" ? ucVeto(u) : tab === "versiuni" ? ucVersions(u) : ucSteps(u);
    openPanel({
      view: "ekyc-use-cases", crumb: { label: u.name }, title: u.name,
      actions: `${btn(u.active ? "Dezactivează" : "Activează", act("uc-toggle", u.code), { ic: u.active ? "pause" : "rotate-arrow" })}${btn("Editează", act("uc-edit", u.code), { ic: "edit" })}`,
      meta: [["Cod", A.renderCopyCode(u.code, `Copiază ${u.code}`)], ["Nivel asigurare", T(u.ial)], ["Status", statusTag(u.active)], ["Versiune", `v${esc(u.version)}`], ["Clienți", String(clientsOfUc(u.code).length)]],
      tabs: [["pasi", "Pași de verificare", u.steps.length || 0, u.steps.length ? "" : "danger"], ["veto", "Reguli veto", u.veto.length], ["versiuni", "Versiuni", u.versions.length]], tab,
      hash: `ek-caz/${u.code}/${tab}`, back: "Înapoi la cazuri de utilizare", body
    });
  };
  const ucSteps = (u) => {
    if (DEMO === "sectiune-eroare") return `<section class="e-permits-dosar-profil__section">${sectionHead("Pași de verificare")}${A.renderEmptyState({ title: "Nu am putut încărca pașii", text: "Serviciul de configurare nu a răspuns.", icon: "warning-filled", actionHtml: retryBtn })}</section>`;
    const add = addBtn("Adaugă pas", act("step-new", u.code));
    if (!u.steps.length) {
      return `<section class="e-permits-dosar-profil__section">${sectionHead("Pași de verificare")}${A.renderEmptyState({ title: "Acest caz de utilizare nu are pași", text: "Adaugă primul pas. Până atunci fluxul nu funcționează: clienții nu pot porni sesiuni cu acest cod.", icon: "warning-filled", actionHtml: add })}</section>`;
    }
    const last = u.steps.length - 1;
    /* the session profile's „Pași de verificare” stacked list, in flow order: # + drag handle
       lead, the type / obligatoriu / async as tags, principal → rezervă in failover order */
    const items = u.steps.map((s, i) => A.renderStackItem({
      leadHtml: `<span class="e-permits-ekcfg-order"><span class="e-permits-ekcfg-order__handle" aria-hidden="true">${icon("drag", 16)}</span><span class="e-permits-ekcfg-order__n" aria-label="Poziția ${i + 1}">${i + 1}</span></span>`,
      title: esc(s.label), plainTitle: s.label,
      badges: [T(s.type), s.mandatory ? T("Obligatoriu", "neutral") : T("Opțional", "warning"), ...(s.async ? [T("Async", "brand")] : [])],
      meta: [`Furnizor principal: <strong>${esc(providerName(s.provider))}</strong>`, s.fallbacks.length ? `rezervă: ${s.fallbacks.map((id, k) => `${k + 1}. ${esc(providerName(id))}`).join(" → ")}` : "fără rezervă"],
      meta2: [`timeout ${s.timeout} s`, plural(s.retries, "reîncercare", "reîncercări")],
      actionsHtml: `
        <button class="btn btn-strict btn-sm btn-icon-only" type="button" ${act("step-up", `${u.code}|${s.id}`)} aria-label="Mută „${esc(s.label)}” mai sus" data-tooltip-label="Mută mai sus"${i === 0 ? " disabled" : ""}>${icon("arrow-up", 16)}</button>
        <button class="btn btn-strict btn-sm btn-icon-only" type="button" ${act("step-down", `${u.code}|${s.id}`)} aria-label="Mută „${esc(s.label)}” mai jos" data-tooltip-label="Mută mai jos"${i === last ? " disabled" : ""}>${icon("arrow-down", 16)}</button>
        ${A.renderRowActions({ primary: { label: "Editează", attrs: act("step-edit", `${u.code}|${s.id}`) }, menu: [{ label: "Șterge pasul", icon: "delete", attrs: act("step-delete", `${u.code}|${s.id}`), danger: true }], label: s.label })}`
    }).replace('<li class="e-permits-stack__item', `<li draggable="true" data-ekcfg-step="${esc(s.id)}" data-index="${i}" class="e-permits-stack__item`)).join("");
    return `
      <section class="e-permits-dosar-profil__section e-permits-stack-section">
        ${sectionHead("Pași de verificare", { meta: `${plural(u.steps.length, "pas", "pași")} · în ordinea execuției`, actions: add })}
        <div class="e-permits-stack e-permits-ekcfg-steps"><div class="e-permits-stack__group"><ul class="e-permits-stack__list" role="list">${items}</ul></div></div>
        <p class="e-permits-ekcfg-hint">Trage pașii de mâner sau folosește săgețile ca să schimbi ordinea. Fiecare schimbare creează o versiune nouă a fluxului.</p>
      </section>`;
  };
  const ucVeto = (u) => {
    const add = addBtn("Adaugă regulă", act("veto-new", u.code));
    if (!u.veto.length) return `<section class="e-permits-dosar-profil__section">${sectionHead("Reguli veto", { actions: add })}${A.renderEmptyState({ text: "Nicio regulă veto. Regulile sunt opționale: fără ele, decizia vine doar din scor.", icon: "shield", compact: true })}</section>`;
    const rows = u.veto.map((r) => `
      <tr${r.enabled ? "" : ' class="is-inactive"'}>
        <td>${esc(r.name)}</td>
        <td><span class="e-permits-workplace__role-desc">${esc(r.condition)}</span></td>
        <td>${T(r.severity, SEVERITY_TONES[r.severity])}</td>
        <td><div class="e-permits-toggle"><span class="e-permits-toggle__control"><input class="e-permits-toggle__input" type="checkbox" role="switch" aria-label="${esc(`Regula „${r.name}” activată`)}"${r.enabled ? " checked" : ""} ${act("veto-switch", `${u.code}|${r.id}`)}><span class="e-permits-toggle__knob" aria-hidden="true"></span></span></div></td>
        <td><span class="e-permits-workplace__row-actions">${A.renderRowActions({ primary: { label: "Editează", attrs: act("veto-edit", `${u.code}|${r.id}`) }, menu: [{ label: "Șterge regula", icon: "delete", attrs: act("veto-delete", `${u.code}|${r.id}`), danger: true }], label: r.name })}</span></td>
      </tr>`);
    return `
      <section class="e-permits-dosar-profil__section">
        ${sectionHead("Reguli veto", { meta: `${u.veto.filter((r) => r.enabled).length} din ${u.veto.length} activate · resping sesiunea indiferent de scor`, actions: add })}
        ${cardTable(["Nume regulă", "Condiție", "Severitate", "Activată", ""], rows, { cls: "e-permits-ekcfg-veto" })}
      </section>`;
  };
  const ucVersions = (u) => A.renderStackedList("Istoric versiuni", [{
    label: "",
    items: u.versions.map((v) => ({
      title: `v${esc(v.version)}`, plainTitle: `v${v.version}`,
      badges: v.current ? [T("Curentă", "success")] : [],
      meta: [esc(stamp(v.at)), esc(v.by)], meta2: [esc(v.change)],
      menu: v.current || !v.snapshot ? [] : [{ label: "Restaurează această versiune", icon: "rotate-arrow", attrs: act("uc-revert", `${u.code}|${v.version}`) }]
    }))
  }], { meta: `curentă v${u.version} · fiecare modificare creează o versiune nouă` });
  FORMS.uc = {
    title: (f) => (f.mode === "create" ? "Caz de utilizare nou" : "Editează cazul de utilizare"),
    subtitle: (f) => (f.mode === "create" ? "Pașii și regulile veto se configurează după creare, pe pagina cazului." : findUc(f.id).name),
    summary: (f) => (f.mode === "edit" ? `Salvarea creează versiunea v${findUc(f.id).version.split(".")[0]}.${Number(findUc(f.id).version.split(".")[1]) + 1}.` : "Se creează inactiv, fără pași."),
    submit: (f) => (f.mode === "create" ? "Creează și configurează pașii" : "Salvează"),
    values: (mode, id) => { const u = mode === "edit" ? findUc(id) : null; return { name: u?.name || "", code: u?.code || "", description: u?.description || "", ial: u?.ial || "" }; },
    body: (f) => grid(
      inp("name", "Denumire", { required: true, placeholder: "ex. Deschidere cont de plăți" }),
      f.mode === "edit" ? locked("code", "Cod", f.v.code, { hint: "Nu se modifică după creare — clienții îl folosesc la inițierea sesiunilor." }) : inp("code", "Cod", { required: true, placeholder: "ex. PAYMENT_ACCOUNT_SUBST", hint: "Majuscule, cifre și „_”. Clienții îl trimit la inițierea sesiunii; nu se mai schimbă." }),
      area("description", "Descriere", { max: 300, hint: "Pentru cine și când se folosește fluxul." }),
      sel("ial", "Nivel asigurare", IALS, { required: true, placeholder: "Alege nivelul", span: 6, hint: "Valori ilustrative, de confirmat cu backend-ul." })),
    validate: (f) => {
      const e = {}; const v = f.v;
      if (!v.name.trim()) e.name = REQ;
      if (f.mode === "create") {
        if (!v.code.trim()) e.code = REQ;
        else if (!/^[A-Z][A-Z0-9_]{2,40}$/.test(v.code.trim())) e.code = "Folosește majuscule, cifre și „_” (3–40 de caractere).";
        else if (cfg.useCases.some((u) => u.code === v.code.trim())) e.code = "Există deja un caz de utilizare cu acest cod.";
      }
      if (!v.ial) e.ial = "Alege nivelul de asigurare.";
      return e;
    },
    save: (f) => {
      const v = f.v;
      if (f.mode === "create") {
        const u = { code: v.code.trim(), name: v.name.trim(), description: v.description.trim(), ial: v.ial, version: "0.1", active: false, steps: [], veto: [], versions: [{ version: "0.1", at: nowIso(), by: me(), change: "Caz de utilizare creat (fără pași)", current: true }], events: [event("Caz de utilizare creat", `${v.code.trim()} · fără pași`)], createdAt: nowIso(), updatedAt: nowIso(), updatedBy: me() };
        cfg.useCases.push(u);
        return () => { ucDetail(u.code, "pasi"); toast("Adaugă pașii fluxului; apoi activează cazul de utilizare.", "Caz de utilizare creat"); };
      }
      const u = findUc(f.id);
      const changes = [["name", "denumire"], ["description", "descriere"], ["ial", "nivel de asigurare"]].filter(([k]) => v[k] !== f.original[k]).map(([, l]) => l);
      Object.assign(u, { name: v.name.trim(), description: v.description.trim(), ial: v.ial });
      if (changes.length) bumpVersion(u, `Date de bază modificate: ${changes.join(", ")}`);
      return () => { redetail(); if (changes.length) toast(`Versiunea curentă: v${u.version}.`, "Caz de utilizare salvat"); };
    }
  };
  /* Pas (add / edit): Tip pas · Denumire · Ordine · Obligatoriu · Async · Furnizor principal ·
     Furnizori de rezervă (ordonați = ordinea de failover) · Timeout · Reîncercări */
  const fallbackList = (f) => {
    const items = f.v.fallbacks;
    const options = cfg.providers.filter((p) => p.id !== f.v.provider && !items.includes(p.id));
    return field("fallbacks", "Furnizori de rezervă", `
      <div class="e-permits-ekcfg-list">
        ${items.length ? `<div class="e-permits-stack${errOf("fallbacks") ? " is-error" : ""}"><ul class="e-permits-stack__list" role="list">${items.map((id, i) => `
          <li class="e-permits-stack__item">
            <div class="e-permits-stack__main"><div class="e-permits-stack__title-row"><p class="e-permits-stack__title">${i + 1}. ${esc(providerName(id))}</p>${id === f.v.provider ? T("Furnizor principal", "danger") : ""}</div>
              <div class="e-permits-stack__meta"><span class="e-permits-stack__part">${i === 0 ? "primul la failover" : `după ${esc(providerName(items[i - 1]))}`}</span></div></div>
            <div class="e-permits-stack__actions">
              <button class="btn btn-strict btn-sm btn-icon-only" type="button" data-ekcfg-fb-move="up" data-index="${i}" aria-label="Mută ${esc(providerName(id))} mai sus" data-tooltip-label="Mai sus"${i === 0 ? " disabled" : ""}>${icon("arrow-up", 16)}</button>
              <button class="btn btn-strict btn-sm btn-icon-only" type="button" data-ekcfg-fb-move="down" data-index="${i}" aria-label="Mută ${esc(providerName(id))} mai jos" data-tooltip-label="Mai jos"${i === items.length - 1 ? " disabled" : ""}>${icon("arrow-down", 16)}</button>
              <button class="btn btn-text-destructive btn-sm" type="button" data-ekcfg-fb-remove="${i}">Elimină</button>
            </div>
          </li>`).join("")}</ul></div>` : ""}
        ${options.length ? `<div class="e-permits-ekcfg-list__add">${A.renderFoSelectControl({ id: fid("fallback-add"), attrs: 'data-ekcfg-fb-add aria-label="Adaugă furnizor de rezervă"', optionsHtml: `<option value="" selected disabled>Adaugă furnizor de rezervă</option>${options.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}${p.active ? "" : " (inactiv)"}</option>`).join("")}` })}</div>` : ""}
      </div>`, { labelFor: false, hintTop: true, hint: "Ordinea din listă = ordinea de failover, după furnizorul principal." });
  };
  FORMS.step = {
    title: (f) => (f.mode === "create" ? "Pas nou" : "Editează pasul"),
    subtitle: (f) => findUc(f.extra.code).name,
    summary: (f) => `Salvarea creează versiunea v${findUc(f.extra.code).version.split(".")[0]}.${Number(findUc(f.extra.code).version.split(".")[1]) + 1}.`,
    submit: (f) => (f.mode === "create" ? "Adaugă pasul" : "Salvează"),
    values: (mode, id, extra) => {
      const u = findUc(extra.code);
      const s = mode === "edit" ? u.steps.find((x) => x.id === id) : null;
      return s ? { type: s.type, label: s.label, order: String(u.steps.indexOf(s) + 1), mandatory: s.mandatory, async: s.async, provider: s.provider, fallbacks: [...s.fallbacks], timeout: String(s.timeout), retries: String(s.retries) }
        : { type: "", label: "", order: String(u.steps.length + 1), mandatory: true, async: false, provider: "", fallbacks: [], timeout: "30", retries: "2", ...(extra.preset || {}) };
    },
    body: (f) => {
      const u = findUc(f.extra.code);
      return `
        ${dSection("Pas", grid(
          sel("type", "Tip pas", STEP_TYPES.map(([t, l]) => [t, `${t} — ${l}`]), { required: true, placeholder: "Alege tipul", span: 6, hint: "Valori ilustrative, de confirmat cu backend-ul." }),
          inp("label", "Denumire", { span: 6, placeholder: "ex. Scanare document", hint: "Eticheta afișată utilizatorului final." }),
          inp("order", "Ordine", { span: 6, inputmode: "numeric", max: 2, hint: `Poziția în flux (1–${u.steps.length + (f.mode === "create" ? 1 : 0)}).` }),
          /* „Obligatoriu” = the checkbox option with the red star (product rule), never a switch */
          `<div class="e-permits-user-create__field e-permits-user-create__field--12"><div class="e-permits-check-options">${A.renderCheckOption({ label: "Obligatoriu", required: true, checked: Boolean(F.v.mandatory), attrs: 'data-ekcfg-field="mandatory"' })}</div><p class="e-permits-fo-field__hint">Un pas opțional eșuat nu blochează fluxul.</p></div>`,
          tog("async", "Async", "Rulează în fundal, fără să blocheze pașii următori.")))}
        ${dSection("Furnizori", grid(
          sel("provider", "Furnizor principal", cfg.providers.map((p) => [p.id, `${p.name}${p.active ? "" : " (inactiv)"}`]), { required: true, placeholder: "Alege furnizorul", span: 12 }),
          fallbackList(f)))}
        ${dSection("Reziliență", grid(
          inp("timeout", "Timeout (secunde)", { span: 6, inputmode: "numeric", max: 4, hint: "După acest timp pasul se abandonează." }),
          inp("retries", "Reîncercări maxime", { span: 6, inputmode: "numeric", max: 2, hint: "Câte reluări la eșec (0–5)." })))}`;
    },
    validate: (f) => {
      const e = {}; const v = f.v; const u = findUc(f.extra.code);
      const max = u.steps.length + (f.mode === "create" ? 1 : 0);
      if (!v.type) e.type = "Alege tipul pasului.";
      if (!intIn(v.order, 1, max)) e.order = `Introdu o poziție între 1 și ${max}.`;
      if (!v.provider) e.provider = "Alege furnizorul principal.";
      if (v.provider && v.fallbacks.includes(v.provider)) e.fallbacks = `Furnizorul principal nu poate fi și de rezervă. Elimină „${providerName(v.provider)}” din rezervă sau alege alt furnizor principal.`;
      if (!intIn(v.timeout, 1, 3600)) e.timeout = "Introdu un număr întreg de secunde (1–3600).";
      if (!intIn(v.retries, 0, 5)) e.retries = "Introdu un număr între 0 și 5.";
      return e;
    },
    save: (f) => {
      const u = findUc(f.extra.code); const v = f.v;
      const data = { type: v.type, label: v.label.trim() || stepLabel(v.type), mandatory: Boolean(v.mandatory), async: Boolean(v.async), provider: v.provider, fallbacks: [...v.fallbacks], timeout: Number(v.timeout), retries: Number(v.retries) };
      let step;
      if (f.mode === "create") { step = { id: `${u.code.toLowerCase()}-s${Date.now().toString(36)}`, ...data }; u.steps.push(step); } else { step = u.steps.find((x) => x.id === f.id); Object.assign(step, data); }
      const to = Number(v.order) - 1;
      u.steps.splice(u.steps.indexOf(step), 1);
      u.steps.splice(to, 0, step);
      bumpVersion(u, f.mode === "create" ? `Pas adăugat: ${step.label} (poziția ${to + 1})` : `Pas modificat: ${step.label}`);
      return () => { ucDetail(u.code, "pasi"); toast(`Versiunea curentă: v${u.version}.`, f.mode === "create" ? "Pas adăugat" : "Pas salvat"); };
    }
  };
  FORMS.veto = {
    title: (f) => (f.mode === "create" ? "Regulă veto nouă" : "Editează regula veto"),
    subtitle: (f) => findUc(f.extra.code).name,
    summary: () => "Regula respinge sesiunea indiferent de scor.",
    submit: (f) => (f.mode === "create" ? "Adaugă regula" : "Salvează"),
    values: (mode, id, extra) => { const r = mode === "edit" ? findUc(extra.code).veto.find((x) => x.id === id) : null; return { name: r?.name || "", condition: r?.condition || "", severity: r?.severity || "" }; },
    body: () => grid(
      inp("name", "Nume", { required: true, placeholder: "ex. Document expirat" }),
      area("condition", "Condiție", { required: true, rows: 4, max: 500, placeholder: "document.expiryDate < session.startedAt", hint: "Expresie: câmp · operator (==, !=, <, >, in) · valoare; legătura cu && sau ||." }),
      sel("severity", "Severitate", SEVERITIES, { required: true, placeholder: "Alege severitatea", span: 6, hint: "Valori ilustrative, de confirmat cu backend-ul." })),
    validate: (f) => {
      const e = {};
      if (!f.v.name.trim()) e.name = REQ;
      if (!f.v.condition.trim()) e.condition = REQ;
      else if (!/(==|!=|<=|>=|<|>|\bin\b)/.test(f.v.condition)) e.condition = "Condiția trebuie să conțină un operator (==, !=, <, >, in).";
      if (!f.v.severity) e.severity = "Alege severitatea.";
      return e;
    },
    save: (f) => {
      const u = findUc(f.extra.code);
      const data = { name: f.v.name.trim(), condition: f.v.condition.trim(), severity: f.v.severity };
      if (f.mode === "create") u.veto.push({ id: `${u.code.toLowerCase()}-v${Date.now().toString(36)}`, enabled: true, ...data }); else Object.assign(u.veto.find((x) => x.id === f.id), data);
      bumpVersion(u, `${f.mode === "create" ? "Regulă veto adăugată" : "Regulă veto modificată"}: ${data.name}`);
      return () => { ucDetail(u.code, "veto"); toast(`Versiunea curentă: v${u.version}.`, f.mode === "create" ? "Regulă adăugată" : "Regulă salvată"); };
    }
  };
  const moveStep = (u, from, to) => {
    if (to < 0 || to >= u.steps.length || from === to) return;
    const [s] = u.steps.splice(from, 1);
    u.steps.splice(to, 0, s);
    bumpVersion(u, `Ordinea pașilor schimbată: ${s.label} pe poziția ${to + 1}`);
    redetail();
    requestAnimationFrame(() => {
      const row = document.querySelector(`[data-ekcfg-step="${CSS.escape(s.id)}"]`);
      row?.classList.add("is-flash");
      (row?.querySelector(`[data-ekcfg="step-${to > from ? "down" : "up"}"]:not([disabled])`) || row?.querySelector("[data-ekcfg='step-edit']"))?.focus();
    });
  };
  const ucActions = {
    "uc-new": () => openForm("uc", "create"),
    "uc-open": (code) => ucDetail(code),
    "uc-edit": (code) => openForm("uc", "edit", code),
    "uc-toggle": (code) => {
      const u = findUc(code);
      const on = u.active;
      const clients = clientsOfUc(code).filter((c) => c.active);
      if (!on && !u.steps.length) {
        S.openModal({ title: "Cazul de utilizare nu poate fi activat", subtitle: u.code, kind: "ekcfg-blocked", body: `<div class="e-permits-case-form">${A.renderNotice("warning", "Fluxul nu are niciun pas. Adaugă cel puțin un pas de verificare, apoi activează cazul de utilizare.")}</div>`, footer: `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Închide</button><button class="btn btn-primary btn-rounded" type="button" data-case-close ${act("step-new", code)}>Adaugă primul pas</button></div>` });
        return;
      }
      A.askConfirm({ title: on ? `Dezactivezi „${u.name}”?` : `Activezi „${u.name}”?`, text: on ? (clients.length ? `Impact: clienții activi care îl folosesc (${clients.map((c) => c.name).join(", ")}) nu mai pot porni sesiuni noi cu ${u.code}. Sesiunile în curs se finalizează.` : `Nu mai pot porni sesiuni noi cu ${u.code}. Niciun client activ nu folosește fluxul.`) : `Clienții asociați pot porni sesiuni cu ${u.code}, versiunea v${u.version} (${plural(u.steps.length, "pas", "pași")}).`, confirmLabel: on ? "Dezactivează" : "Activează", destructive: on }, () => {
        u.active = !on; u.updatedAt = nowIso(); u.updatedBy = me();
        u.events.unshift(event(on ? "Caz de utilizare dezactivat" : "Caz de utilizare activat", `v${u.version}`));
        refreshList(); redetail(); flashRow(code);
        toast(on ? `${u.code} nu mai acceptă sesiuni noi.` : `${u.code} acceptă sesiuni (v${u.version}).`, on ? "Caz de utilizare dezactivat" : "Caz de utilizare activat");
      });
    },
    "uc-revert": (pair) => {
      const [code, version] = pair.split("|");
      const u = findUc(code);
      const v = u.versions.find((x) => x.version === version);
      A.askConfirm({ title: `Restaurezi versiunea v${version}?`, text: `Pașii și regulile veto revin la v${version}; se creează o versiune nouă, iar sesiunile noi o folosesc imediat.`, confirmLabel: "Restaurează" }, () => {
        u.steps = clone(v.snapshot.steps); u.veto = clone(v.snapshot.veto);
        bumpVersion(u, `Restaurată versiunea v${version}`);
        redetail();
        toast(`Conținutul v${version} este acum versiunea v${u.version}.`, "Versiune restaurată");
      });
    },
    "step-new": (code) => openForm("step", "create", null, { code }),
    "step-edit": (pair) => { const [code, id] = pair.split("|"); openForm("step", "edit", id, { code }); },
    "step-delete": (pair) => {
      const [code, id] = pair.split("|");
      const u = findUc(code); const s = u.steps.find((x) => x.id === id);
      A.askConfirm({ title: `Ștergi pasul „${s.label}”?`, text: u.steps.length === 1 ? "Este ultimul pas: fluxul rămâne fără pași și nu mai funcționează până adaugi altul." : `Pașii următori urcă o poziție. Se creează versiunea nouă a fluxului.`, confirmLabel: "Șterge pasul", destructive: true }, () => {
        u.steps = u.steps.filter((x) => x !== s);
        bumpVersion(u, `Pas șters: ${s.label}`);
        redetail();
        toast(`Versiunea curentă: v${u.version}.`, "Pas șters");
      });
    },
    "step-up": (pair) => { const [code, id] = pair.split("|"); const u = findUc(code); const i = u.steps.findIndex((x) => x.id === id); moveStep(u, i, i - 1); },
    "step-down": (pair) => { const [code, id] = pair.split("|"); const u = findUc(code); const i = u.steps.findIndex((x) => x.id === id); moveStep(u, i, i + 1); },
    "veto-new": (code) => openForm("veto", "create", null, { code }),
    "veto-edit": (pair) => { const [code, id] = pair.split("|"); openForm("veto", "edit", id, { code }); },
    "veto-delete": (pair) => {
      const [code, id] = pair.split("|");
      const u = findUc(code); const r = u.veto.find((x) => x.id === id);
      A.askConfirm({ title: `Ștergi regula „${r.name}”?`, text: "Sesiunile noi nu mai sunt respinse automat de această regulă. Dacă vrei doar să o oprești, dezactiveaz-o din comutator.", confirmLabel: "Șterge regula", destructive: true }, () => {
        u.veto = u.veto.filter((x) => x !== r);
        bumpVersion(u, `Regulă veto ștearsă: ${r.name}`);
        redetail();
      });
    }
  };

  /* =====================================================================================
     Parametri platformă (US-UI-11 91132) — grouped by category, all in the drawer
     ===================================================================================== */
  const paramValue = (p) => {
    if (p.type === "boolean") return yesNo(p.value === "true");
    if (p.type === "number") return `<span class="e-permits-ekcfg-num">${esc(intFmt(Number(p.value)))}</span>`;
    if (p.type === "json") return `<span class="e-permits-workplace__role-desc e-permits-ekcfg-json" data-cell-tooltip="${esc(p.value)}" data-cell-tooltip-always tabindex="0">${esc(p.value.length > 34 ? `${p.value.slice(0, 32)}…` : p.value)}</span>`;
    return desc(p.value);
  };
  const paramRow = (p) => ({ id: p.key, p, cheie: p.key, denumire: p.name, descriere: p.description, valoare: p.value, tip: p.type, categorie: p.category, activ: p.active ? 1 : 0, updatedAt: p.updatedAt, updatedBy: p.updatedBy });
  ROWS["ekyc-parameters"] = () => cfg.parameters.map(paramRow);
  const showParameters = () => registry("ekyc-parameters", {
    columns: {
      cheie: { label: "Cheie", width: 264, sortable: true },
      denumire: { label: "Denumire", width: 232, sortable: true },
      descriere: { label: "Descriere", width: 280, fill: true },
      valoare: { label: "Valoare", width: 200, sortable: true },
      tip: { label: "Tip date", width: 112, sortable: true },
      categorie: { label: "Categorie", width: 160, sortable: true },
      activ: { label: "Status", width: 112, sortable: true },
      updatedAt: { label: "Actualizat la / de", width: 176, sortable: true },
      actiuni: { label: "", width: 168 }
    },
    order: ["cheie", "denumire", "descriere", "valoare", "tip", "categorie", "activ", "updatedAt", "actiuni"],
    tabs: statusTabs("Toți", "Activi", "Inactivi"), search: "Căutare după cheie sau denumire",
    primary: { id: "param-new", label: "Adaugă parametru" }, groupBy: "categorie", sortKey: "cheie"
  });
  const paramCell = (r, key) => {
    switch (key) {
      case "cheie": return A.renderCopyCode(r.cheie, `Copiază ${r.cheie}`);
      case "denumire": return desc(r.denumire);
      case "descriere": return desc(r.descriere);
      case "valoare": return paramValue(r.p);
      case "tip": return T(r.tip);
      case "categorie": return desc(r.categorie);
      case "activ": return statusTag(r.activ);
      case "updatedAt": return updatedCell(r);
      case "actiuni": return rowActions({ label: "Editează", attrs: act("param-edit", r.id) }, [
        r.activ ? { label: "Dezactivează", icon: "pause", attrs: act("param-toggle", r.id) } : { label: "Activează", icon: "rotate-arrow", attrs: act("param-toggle", r.id) },
        { label: "Șterge", icon: "delete", attrs: act("param-delete", r.id), danger: true }
      ], r.cheie);
      default: return esc(r[key] ?? "—");
    }
  };
  const findParam = (key) => cfg.parameters.find((p) => p.key === key);
  /* the value control follows the data type (US-UI-11 AC: string · number · boolean · json) */
  const paramValueField = (f) => {
    switch (f.v.type) {
      case "number": return inp("value", "Valoare", { required: true, span: 6, inputmode: "decimal", max: 20, placeholder: "ex. 30", hint: "Un număr; zecimalele cu punct sau virgulă." });
      case "boolean": return tog("value", f.v.value ? "Da" : "Nu", "Valoarea parametrului (true / false).");
      case "json": return area("value", "Valoare", { required: true, rows: 6, max: 2000, placeholder: "{\n  \"cheie\": \"valoare\"\n}", hint: "JSON valid; se verifică sintaxa la salvare." });
      case "string": return inp("value", "Valoare", { required: true, max: 500, placeholder: "Text" });
      default: return field("value", "Valoare", A.renderInfoNote("Alege tipul de date: controlul valorii se adaptează tipului."), {});
    }
  };
  FORMS.param = {
    title: (f) => (f.mode === "create" ? "Parametru nou" : "Editează parametrul"),
    subtitle: (f) => (f.mode === "edit" ? f.id : "Setare globală a platformei"),
    summary: () => "Se aplică imediat, fără redeploy.",
    submit: (f) => (f.mode === "create" ? "Adaugă parametrul" : "Salvează"),
    values: (mode, id) => {
      const p = mode === "edit" ? findParam(id) : null;
      return p ? { key: p.key, name: p.name, description: p.description, type: p.type, value: p.type === "boolean" ? p.value === "true" : p.value, category: p.category } : { key: "", name: "", description: "", type: "", value: "", category: "" };
    },
    body: (f) => `
      ${dSection("Parametru", grid(
        f.mode === "edit" ? locked("key", "Cheie", f.v.key, { hint: "Nu se modifică după creare — codul platformei o folosește ca referință." }) : inp("key", "Cheie", { required: true, placeholder: "ex. session.ttlMinutes", hint: "Litere, cifre și puncte; unică. Este referința folosită în cod." }),
        inp("name", "Denumire", { span: 6, placeholder: "ex. Durata maximă a unei sesiuni" }),
        sel("category", "Categorie", [...new Set(cfg.parameters.map((p) => p.category))].sort((a, b) => a.localeCompare(b, "ro")), { span: 6, placeholder: "Alege categoria" }),
        area("description", "Descriere", { max: 300 })))}
      ${dSection("Valoare", grid(
        sel("type", "Tip date", DATA_TYPES, { required: true, placeholder: "Alege tipul", span: 6 }),
        paramValueField(f)))}`,
    validate: (f) => {
      const e = {}; const v = f.v;
      if (f.mode === "create") {
        if (!v.key.trim()) e.key = REQ;
        else if (!/^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9]+)+$/.test(v.key.trim())) e.key = "Folosește forma categorie.nume (litere, cifre, puncte), ex. session.ttlMinutes.";
        else if (cfg.parameters.some((p) => p.key === v.key.trim())) e.key = "Există deja un parametru cu această cheie.";
      }
      if (!v.type) e.type = "Alege tipul de date.";
      else if (v.type === "number" && Number.isNaN(toNum(v.value))) e.value = String(v.value).trim() ? "Introdu un număr valid." : REQ;
      else if (v.type === "json") { if (!String(v.value).trim()) e.value = REQ; else { try { JSON.parse(v.value); } catch (err) { const at = String(err.message).match(/position (\d+)/); e.value = `JSON invalid${at ? ` la caracterul ${Number(at[1]) + 1}` : ""}. Verifică ghilimelele, virgulele și acoladele.`; } } }
      else if (v.type === "string" && !String(v.value).trim()) e.value = REQ;
      return e;
    },
    save: (f) => {
      const v = f.v;
      const value = v.type === "boolean" ? String(Boolean(v.value)) : v.type === "number" ? String(toNum(v.value)) : v.type === "json" ? JSON.stringify(JSON.parse(v.value)) : String(v.value).trim();
      const data = { name: v.name.trim() || v.key, description: v.description.trim(), type: v.type, value, category: v.category || "Altele", updatedAt: nowIso(), updatedBy: me() };
      let p;
      if (f.mode === "create") { p = { key: v.key.trim(), active: true, createdAt: nowIso(), ...data }; cfg.parameters.push(p); } else { p = findParam(f.id); Object.assign(p, data); }
      return () => { flashRow(p.key); toast(`${p.key} = ${p.type === "json" ? "JSON" : p.value}. Se aplică imediat.`, f.mode === "create" ? "Parametru adăugat" : "Parametru salvat"); };
    }
  };
  const paramActions = {
    "param-new": () => openForm("param", "create"),
    "param-edit": (key) => openForm("param", "edit", key),
    "param-toggle": (key) => {
      const p = findParam(key);
      const on = p.active;
      A.askConfirm({ title: on ? `Dezactivezi ${p.key}?` : `Activezi ${p.key}?`, text: on ? "Platforma revine la valoarea implicită din cod până îl reactivezi. Valoarea salvată se păstrează." : `Platforma folosește din nou valoarea „${p.type === "json" ? "JSON" : p.value}”.`, confirmLabel: on ? "Dezactivează" : "Activează", destructive: on }, () => {
        p.active = !on; p.updatedAt = nowIso(); p.updatedBy = me();
        refreshList(); flashRow(key);
      });
    },
    /* US-UI-11: impact warning + deactivation offered as the alternative (the page modal: 3 buttons) */
    "param-delete": (key) => {
      const p = findParam(key);
      S.openModal({
        title: `Ștergi parametrul ${p.key}?`, subtitle: p.name, kind: "ekcfg-delete",
        body: `<div class="e-permits-case-form">${A.renderNotice("warning", `<strong>Parametrul poate fi referit din cod.</strong> Dacă îl ștergi, platforma folosește valoarea implicită sau poate eșua la citirea lui — de exemplu ${esc(p.category === "Sesiuni" ? "la expirarea sesiunilor" : "în funcționalitatea care îl citește")}.`)}<p class="e-permits-ekcfg-text">${p.active ? "Recomandat: <strong>dezactivează-l</strong> — efectul e același, dar valoarea rămâne salvată și îl poți reactiva oricând." : "Parametrul este deja inactiv. Ștergerea nu poate fi anulată."}</p></div>`,
        footer: `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button>${p.active ? `<button class="btn btn-secondary btn-rounded" type="button" ${act("param-deactivate", key)}>Dezactivează în schimb</button>` : ""}<button class="btn btn-destructive btn-rounded" type="button" ${act("param-delete-confirm", key)}>Șterge parametrul</button></div>`
      });
    },
    "param-deactivate": (key) => { const p = findParam(key); p.active = false; p.updatedAt = nowIso(); p.updatedBy = me(); S.closeModal(); refreshList(); flashRow(key); toast(`${p.key} este inactiv; valoarea a rămas salvată.`, "Parametru dezactivat"); },
    "param-delete-confirm": (key) => { cfg.parameters = cfg.parameters.filter((p) => p.key !== key); S.closeModal(); refreshList(); toast(`${key} a fost șters.`, "Parametru șters"); }
  };

  /* =====================================================================================
     Configurări scoring (US-UI-10 91131, US-05-06-B 89231, US-05-07-B 89233)
     ===================================================================================== */
  const scoringRow = (s) => ({ id: s.id, s, denumire: s.name, descriere: s.description, accept: s.accept, reject: s.reject, minim: s.minConfidence, agregare: s.aggregation, reguli: s.rules.length, activ: s.active ? 1 : 0, clienti: cfg.clients.filter((c) => c.scoringId === s.id).length });
  ROWS["ekyc-scoring"] = () => cfg.scoring.map(scoringRow);
  const showScoring = () => registry("ekyc-scoring", {
    columns: {
      denumire: { label: "Denumire", width: 264, sortable: true },
      descriere: { label: "Descriere", width: 280, fill: true },
      accept: { label: "Prag acceptare", width: 136, sortable: true },
      reject: { label: "Prag respingere", width: 136, sortable: true },
      minim: { label: "Scor minim încredere", width: 168, sortable: true },
      agregare: { label: "Metodă agregare", width: 176, sortable: true },
      reguli: { label: "Reguli", width: 96, sortable: true },
      activ: { label: "Status", width: 112, sortable: true },
      actiuni: { label: "", width: 168 }
    },
    order: ["denumire", "descriere", "accept", "reject", "minim", "agregare", "reguli", "activ", "actiuni"],
    tabs: statusTabs("Toate", "Active", "Inactive"), search: "Căutare după denumire sau descriere",
    primary: { id: "scoring-new", label: "Adaugă configurație" }, sortKey: "denumire"
  });
  const scoringCell = (r, key) => {
    switch (key) {
      case "denumire": return S.identity(r.denumire, r.clienti ? plural(r.clienti, "client", "clienți") : "neatribuită");
      case "descriere": return desc(r.descriere);
      case "accept": case "reject": case "minim": return `<span class="e-permits-ekyc-score">${num(r[key])}</span>`;
      case "agregare": return esc(r.agregare);
      case "reguli": return String(r.reguli);
      case "activ": return statusTag(r.activ);
      case "actiuni": return rowActions({ label: "Editează", attrs: act("scoring-edit", r.id) }, [
        { label: "Vezi detalii", icon: "eye-open", attrs: act("scoring-open", r.id) },
        r.activ ? { label: "Dezactivează", icon: "pause", attrs: act("scoring-toggle", r.id), danger: true } : { label: "Activează", icon: "rotate-arrow", attrs: act("scoring-toggle", r.id) }
      ], r.denumire);
      default: return esc(r[key] ?? "—");
    }
  };
  const findScoring = (id) => cfg.scoring.find((s) => s.id === id);
  /* Banda de decizie (US-UI-10 AC): 0–1 in three zones = the decisions meter + an axis with
     the thresholds marked (SVG attributes, no inline styles) */
  const band = (reject, accept, minConf, { title = "Banda de decizie", meta = "" } = {}) => {
    const ok = unit(reject) && unit(accept) && Number(reject) < Number(accept);
    const r = ok ? Number(reject) : 0; const a = ok ? Number(accept) : 0;
    const pctX = (x) => `${(x * 100).toFixed(2)}%`;
    const ticks = ok ? [[0, "0", "start"], [r, num(r), "middle"], [a, num(a), "middle"], [1, "1", "end"]] : [];
    return `
      <section class="e-permits-dosar-profil__section" aria-label="${esc(title)}">
        ${sectionHead(title, { meta })}
        <div class="e-permits-chart e-permits-ekyc-band">
          ${ok ? `
            ${S.meter([[r, "danger"], [a - r, "warning"], [1 - a, "success"]], { max: 1, size: "lg", label: `Respins de la 0 la ${num(r)}, revizuire manuală între ${num(r)} și ${num(a)}, acceptat de la ${num(a)} la 1` })}
            <svg class="e-permits-ekyc-band__axis" aria-hidden="true" focusable="false">
              ${ticks.map(([x, label, anchor]) => `<line class="e-permits-ekyc-band__tick" x1="${pctX(x)}" x2="${pctX(x)}" y1="0" y2="6"></line><text class="e-permits-ekyc-band__label${x > 0 && x < 1 ? " is-threshold" : ""}" x="${pctX(x)}" y="22" text-anchor="${anchor}">${esc(label)}</text>`).join("")}
              ${unit(minConf) ? `<text class="e-permits-ekyc-band__label" x="0" y="42" text-anchor="start">Scor minim de încredere per pas: ${esc(num(Number(minConf)))}</text>` : ""}
            </svg>
            ${S.legend([[`Respins · 0 – ${num(r)}`, "danger", null], [`Revizuire manuală · ${num(r)} – ${num(a)}`, "warning", null], [`Acceptat · ${num(a)} – 1`, "success", null]])}`
            : A.renderNotice("error", "Pragul de respingere trebuie să fie mai mic decât pragul de acceptare; banda nu se poate desena.")}
        </div>
      </section>`;
  };
  const scoringDetail = (id, tab = "reguli") => {
    const s = findScoring(id);
    if (!s) { notFound("ekyc-scoring", id, "Configurația"); return; }
    ensureList("ekyc-scoring");
    st.detail = { type: "scoring", id, tab };
    const clients = cfg.clients.filter((c) => c.scoringId === id);
    const rulesSection = () => {
      if (DEMO === "sectiune-eroare") return `<section class="e-permits-dosar-profil__section">${sectionHead("Reguli de scoring")}${A.renderEmptyState({ title: "Nu am putut încărca regulile", text: "Serviciul de configurare nu a răspuns.", icon: "warning-filled", actionHtml: retryBtn })}</section>`;
      const add = addBtn("Adaugă regulă", act("rule-new", id));
      if (!s.rules.length) return `<section class="e-permits-dosar-profil__section">${sectionHead("Reguli de scoring", { actions: add })}${A.renderEmptyState({ text: "Nicio regulă. Pragurile funcționează și fără reguli: scorul vine din agregarea pașilor.", icon: "chart", compact: true })}</section>`;
      const rows = [...s.rules].sort((a, b) => a.order - b.order).map((r) => `
        <tr${r.enabled ? "" : ' class="is-inactive"'}>
          <td>${r.order}</td>
          <td>${esc(r.name)}</td>
          <td>${r.stepType ? T(r.stepType) : '<span class="e-permits-workplace__date-meta">toți pașii</span>'}</td>
          <td>${esc(r.ruleType)}</td>
          <td><span class="e-permits-ekyc-score">${r.ruleType === "Penalizare" ? "−" : r.ruleType === "Bonus" ? "+" : ""}${num(r.value)}</span></td>
          <td>${r.condition ? `<span class="e-permits-workplace__role-desc">${esc(r.condition)}</span>` : '<span class="e-permits-workplace__date-meta">mereu</span>'}</td>
          <td>${yesNo(r.enabled)}</td>
          <td><span class="e-permits-workplace__row-actions">${A.renderRowActions({ primary: { label: "Editează", attrs: act("rule-edit", `${id}|${r.id}`) }, menu: [{ label: "Șterge regula", icon: "delete", attrs: act("rule-delete", `${id}|${r.id}`), danger: true }], label: r.name })}</span></td>
        </tr>`);
      return `<section class="e-permits-dosar-profil__section">${sectionHead("Reguli de scoring", { meta: `${plural(s.rules.length, "regulă", "reguli")} · evaluate în ordinea #`, actions: add })}${cardTable(["#", "Nume regulă", "Tip pas", "Tip regulă", "Valoare", "Condiție", "Activată", ""], rows, { cls: "e-permits-ekcfg-rules" })}</section>`;
    };
    openPanel({
      view: "ekyc-scoring", crumb: { label: s.name }, title: s.name,
      actions: `${btn(s.active ? "Dezactivează" : "Activează", act("scoring-toggle", id), { ic: s.active ? "pause" : "rotate-arrow" })}${btn("Editează", act("scoring-edit", id), { ic: "edit" })}`,
      meta: [["Metodă agregare", esc(s.aggregation)], ["Scor minim încredere", `<span class="e-permits-ekyc-score">${num(s.minConfidence)}</span>`], ["Status", statusTag(s.active)], ["Clienți", clients.length ? esc(clients.map((c) => c.name).join(", ")) : "neatribuită"]],
      tabs: [["reguli", "Configurație și reguli", s.rules.length], ["jurnal", "Jurnal", s.events.length]], tab, hash: `ek-scoring/${id}/${tab}`, back: "Înapoi la configurări scoring",
      body: tab === "jurnal" ? A.renderEventTimeline("Jurnal", s.events, { meta: "Jurnalizat prin MLog" }) : `${band(s.reject, s.accept, s.minConfidence, { meta: s.description ? esc(s.description) : "" })}${rulesSection()}`
    });
  };
  FORMS.scoring = {
    title: (f) => (f.mode === "create" ? "Configurație de scoring nouă" : "Editează configurația"),
    subtitle: (f) => (f.mode === "edit" ? findScoring(f.id).name : "Regulile se adaugă după creare, pe pagina configurației."),
    summary: (f) => { const n = f.mode === "edit" ? cfg.clients.filter((c) => c.scoringId === f.id && c.active).length : 0; return n ? `Impact: se aplică sesiunilor noi a ${plural(n, "client activ", "clienți activi")}.` : ""; },
    submit: (f) => (f.mode === "create" ? "Creează și adaugă reguli" : "Salvează"),
    values: (mode, id) => { const s = mode === "edit" ? findScoring(id) : null; return { name: s?.name || "", description: s?.description || "", minConfidence: s ? num(s.minConfidence) : "0,60", accept: s ? num(s.accept) : "0,80", reject: s ? num(s.reject) : "0,45", aggregation: s?.aggregation || "" }; },
    body: (f) => `
      ${dSection("Configurație", grid(
        inp("name", "Denumire", { required: true, placeholder: "ex. Standard bancar" }),
        area("description", "Descriere", { max: 300 }),
        sel("aggregation", "Metodă agregare", AGGREGATIONS, { required: true, placeholder: "Alege metoda", span: 6, hint: "Cum se combină scorurile pașilor într-un scor final." })))}
      ${dSection("Praguri (0 – 1)", `${grid(
        inp("reject", "Prag respingere", { required: true, span: 4, inputmode: "decimal", max: 4, hint: "Sub el: Respins." }),
        inp("accept", "Prag acceptare", { required: true, span: 4, inputmode: "decimal", max: 4, hint: "De la el: Acceptat." }),
        inp("minConfidence", "Scor minim încredere", { required: true, span: 4, inputmode: "decimal", max: 4, hint: "Minimul acceptat per pas." }))}
        <div data-ekcfg-band>${band(toNum(f.v.reject), toNum(f.v.accept), toNum(f.v.minConfidence), { title: "Previzualizare", meta: "se actualizează pe măsură ce scrii" })}</div>`)}`,
    validate: (f) => {
      const e = {}; const v = f.v;
      if (!v.name.trim()) e.name = REQ;
      else if (cfg.scoring.some((s) => s.name.toLocaleLowerCase("ro") === v.name.trim().toLocaleLowerCase("ro") && s.id !== f.id)) e.name = "Există deja o configurație cu această denumire.";
      if (!v.aggregation) e.aggregation = "Alege metoda de agregare.";
      Object.assign(e, thresholdErrors(v));
      return e;
    },
    save: (f) => {
      const v = f.v;
      const data = { name: v.name.trim(), description: v.description.trim(), aggregation: v.aggregation, accept: toNum(v.accept), reject: toNum(v.reject), minConfidence: toNum(v.minConfidence), updatedAt: nowIso(), updatedBy: me() };
      if (f.mode === "create") {
        const s = { id: `scr-${String(cfg.scoring.length + 1).padStart(2, "0")}`, active: true, rules: [], createdAt: nowIso(), ...data, events: [event("Configurație creată", data.name)] };
        cfg.scoring.push(s);
        return () => { scoringDetail(s.id); toast("Adaugă regulile, apoi atribuie configurația clienților.", "Configurație creată"); };
      }
      const s = findScoring(f.id);
      Object.assign(s, data);
      s.events.unshift(event("Configurație actualizată", `Prag acceptare ${num(s.accept)} · prag respingere ${num(s.reject)} · minim ${num(s.minConfidence)}`));
      return () => { redetail(); toast("Se aplică sesiunilor noi ale clienților care o folosesc.", "Configurație salvată"); };
    }
  };
  /* cross-validation with immediate feedback: reject < accept, all three in 0–1 */
  const thresholdErrors = (v) => {
    const e = {};
    ["reject", "accept", "minConfidence"].forEach((k) => { if (!String(v[k]).trim()) e[k] = REQ; else if (!unit(v[k])) e[k] = "Introdu o valoare între 0 și 1 (ex. 0,80)."; });
    if (!e.reject && !e.accept && toNum(v.reject) >= toNum(v.accept)) e.reject = `Pragul de respingere trebuie să fie mai mic decât pragul de acceptare (${num(toNum(v.accept))}).`;
    return e;
  };
  const liveThresholds = () => {
    if (!F || F.type !== "scoring") return;
    const e = thresholdErrors(F.v);
    ["reject", "accept", "minConfidence"].forEach((k) => {
      const wrap = drawer.querySelector(`[data-ekcfg-wrap="${k}"]`);
      if (!wrap) return;
      wrap.querySelector(":scope > .e-permits-fo-field__error")?.remove();
      const box = wrap.querySelector(".e-permits-fo-input");
      const hint = wrap.querySelector(":scope > .e-permits-fo-field__hint");
      if (e[k] && String(F.v[k]).trim()) { F.errors[k] = e[k]; box.classList.add("is-error"); box.insertAdjacentHTML("afterend", S.fieldError(e[k])); if (hint) hint.hidden = true; wrap.querySelector("input").setAttribute("aria-invalid", "true"); }
      else { delete F.errors[k]; box.classList.remove("is-error"); if (hint) hint.hidden = false; wrap.querySelector("input").removeAttribute("aria-invalid"); }
    });
    const slot = drawer.querySelector("[data-ekcfg-band]");
    if (slot) slot.innerHTML = band(toNum(F.v.reject), toNum(F.v.accept), toNum(F.v.minConfidence), { title: "Previzualizare", meta: "se actualizează pe măsură ce scrii" });
  };
  FORMS.rule = {
    title: (f) => (f.mode === "create" ? "Regulă de scoring nouă" : "Editează regula"),
    subtitle: (f) => findScoring(f.extra.id).name,
    summary: () => "Regulile se evaluează în ordinea #.",
    submit: (f) => (f.mode === "create" ? "Adaugă regula" : "Salvează"),
    values: (mode, id, extra) => {
      const s = findScoring(extra.id);
      const r = mode === "edit" ? s.rules.find((x) => x.id === id) : null;
      return r ? { name: r.name, stepType: r.stepType, ruleType: r.ruleType, value: num(r.value), condition: r.condition, order: String(r.order), enabled: r.enabled } : { name: "", stepType: "", ruleType: "", value: "", condition: "", order: String(s.rules.length + 1), enabled: true };
    },
    body: (f) => grid(
      inp("name", "Nume", { placeholder: "ex. Penalizare document aproape expirat" }),
      sel("stepType", "Tip pas", STEP_TYPES.map(([t, l]) => [t, `${t} — ${l}`]), { span: 6, placeholder: "Toți pașii", allowEmpty: true, hint: "Opțional; gol = se aplică tuturor pașilor." }),
      sel("ruleType", "Tip regulă", RULE_TYPES, { span: 6, required: true, placeholder: "Alege tipul" }),
      inp("value", "Valoare", { required: true, span: 6, inputmode: "decimal", max: 6, placeholder: "ex. 0,05", hint: "Pondere: 0–1 · Bonus / Penalizare: puncte de scor (0–1)." }),
      inp("order", "Ordine", { required: true, span: 6, inputmode: "numeric", max: 2 }),
      area("condition", "Condiție", { rows: 3, max: 500, placeholder: "document.expiresInDays < 30", hint: "Opțional; fără condiție regula se aplică mereu." }),
      tog("enabled", "Activată", "O regulă dezactivată rămâne salvată, dar nu se evaluează.")),
    validate: (f) => {
      const e = {}; const v = f.v; const s = findScoring(f.extra.id);
      if (!v.ruleType) e.ruleType = "Alege tipul regulii.";
      if (!String(v.value).trim()) e.value = REQ; else if (!unit(v.value)) e.value = "Introdu o valoare între 0 și 1.";
      const max = s.rules.length + (f.mode === "create" ? 1 : 0);
      if (!intIn(v.order, 1, max)) e.order = `Introdu o poziție între 1 și ${max}.`;
      if (v.condition.trim() && !/(==|!=|<=|>=|<|>|\bin\b)/.test(v.condition)) e.condition = "Condiția trebuie să conțină un operator (==, !=, <, >, in).";
      return e;
    },
    save: (f) => {
      const s = findScoring(f.extra.id); const v = f.v;
      const data = { name: v.name.trim() || `${v.ruleType} ${v.stepType || "general"}`, stepType: v.stepType, ruleType: v.ruleType, value: toNum(v.value), condition: v.condition.trim(), enabled: Boolean(v.enabled) };
      const sorted = [...s.rules].sort((a, b) => a.order - b.order);
      let r;
      if (f.mode === "create") { r = { id: `${s.id}-r${Date.now().toString(36)}`, ...data }; } else { r = s.rules.find((x) => x.id === f.id); Object.assign(r, data); sorted.splice(sorted.indexOf(r), 1); }
      sorted.splice(Number(v.order) - 1, 0, r);
      sorted.forEach((x, i) => { x.order = i + 1; });
      s.rules = sorted;
      s.updatedAt = nowIso(); s.updatedBy = me();
      s.events.unshift(event(f.mode === "create" ? "Regulă adăugată" : "Regulă modificată", `#${r.order} ${r.name}`));
      return () => { redetail(); toast(`#${r.order} · ${r.name}.`, f.mode === "create" ? "Regulă adăugată" : "Regulă salvată"); };
    }
  };
  const scoringActions = {
    "scoring-new": () => openForm("scoring", "create"),
    "scoring-open": (id) => scoringDetail(id),
    "scoring-edit": (id) => openForm("scoring", "edit", id),
    "scoring-toggle": (id) => {
      const s = findScoring(id);
      const on = s.active;
      const clients = cfg.clients.filter((c) => c.scoringId === id && c.active);
      A.askConfirm({ title: on ? `Dezactivezi „${s.name}”?` : `Activezi „${s.name}”?`, text: on ? (clients.length ? `Atenție: configurația este atribuită ${clients.length === 1 ? "clientului activ" : `celor ${clients.length} clienți activi`}: ${clients.map((c) => c.name).join(", ")}. Sesiunile noi ale acestora nu vor avea configurație de scoring până le atribui alta.` : "Configurația nu este atribuită niciunui client activ.") : "Configurația poate fi atribuită clienților.", confirmLabel: on ? "Dezactivează" : "Activează", destructive: on }, () => {
        s.active = !on; s.updatedAt = nowIso(); s.updatedBy = me();
        s.events.unshift(event(on ? "Configurație dezactivată" : "Configurație activată", clients.length ? `${plural(clients.length, "client afectat", "clienți afectați")}` : ""));
        refreshList(); redetail(); flashRow(id);
      });
    },
    "rule-new": (id) => openForm("rule", "create", null, { id }),
    "rule-edit": (pair) => { const [id, rid] = pair.split("|"); openForm("rule", "edit", rid, { id }); },
    "rule-delete": (pair) => {
      const [id, rid] = pair.split("|");
      const s = findScoring(id); const r = s.rules.find((x) => x.id === rid);
      A.askConfirm({ title: `Ștergi regula „${r.name}”?`, text: "Scorurile sesiunilor noi se calculează fără ea; regulile următoare urcă o poziție.", confirmLabel: "Șterge regula", destructive: true }, () => {
        s.rules = s.rules.filter((x) => x !== r).sort((a, b) => a.order - b.order);
        s.rules.forEach((x, i) => { x.order = i + 1; });
        s.events.unshift(event("Regulă ștearsă", r.name));
        redetail();
      });
    }
  };

  /* =====================================================================================
     Furnizori de verificare (US-UI-09 91130, US-05-12-B 89245, US-05-13 89246)
     ===================================================================================== */
  const providerRow = (p) => ({ id: p.id, p, denumire: p.name, sistem: p.system, tip: p.type, endpoint: p.endpoint, sanatate: p.health, verificare: p.lastHealthCheck, prioritate: p.priority, activ: p.active ? 1 : 0 });
  ROWS["ekyc-providers"] = () => cfg.providers.map(providerRow);
  const showProviders = () => registry("ekyc-providers", {
    columns: {
      denumire: { label: "Denumire", width: 248, sortable: true },
      sistem: { label: "Sistem", width: 168, sortable: true },
      tip: { label: "Tip", width: 176, sortable: true },
      endpoint: { label: "Endpoint", width: 264, fill: true },
      sanatate: { label: "Sănătate", width: 152, sortable: true },
      verificare: { label: "Ultima verificare", width: 168, sortable: true },
      prioritate: { label: "Prioritate", width: 104, sortable: true },
      activ: { label: "Status", width: 112, sortable: true },
      actiuni: { label: "", width: 168 }
    },
    order: ["denumire", "sistem", "tip", "endpoint", "sanatate", "verificare", "prioritate", "activ", "actiuni"],
    tabs: statusTabs("Toți", "Activi", "Inactivi"), search: "Căutare după denumire, sistem sau endpoint",
    primary: { id: "provider-new", label: "Adaugă furnizor" }, sortKey: "prioritate"
  });
  /* Sănătate ≠ Status (US-UI-09 AC): health = icon tag (signal) in its own column, status = plain tag at the end */
  const healthTag = (h) => `<span class="e-permits-workplace__tag e-permits-workplace__tag--${HEALTH_TONES[h] || "neutral"} e-permits-workplace__tag--icon">${icon("signal", 16)}${esc(h)}</span>`;
  const providerCell = (r, key) => {
    switch (key) {
      case "denumire": return S.identity(r.denumire, r.p.auth);
      case "sistem": return desc(r.sistem);
      case "tip": return desc(r.tip);
      case "endpoint": return desc(r.endpoint);
      case "sanatate": return healthTag(r.sanatate);
      case "verificare": return A.renderDateTime(r.verificare, S.ago(r.verificare));
      case "prioritate": return String(r.prioritate);
      case "activ": return statusTag(r.activ);
      /* the test is this list's main action (US-UI-09: from the row it tests the saved
         configuration; the spinner sits on this button) */
      case "actiuni": return rowActions({ label: "Testează conexiunea", attrs: `${act("provider-test", r.id)} aria-haspopup="dialog" aria-label="Testează conexiunea: ${esc(r.denumire)}"` }, [
        { label: "Editează", icon: "edit", attrs: act("provider-edit", r.id) },
        r.activ ? { label: "Dezactivează", icon: "pause", attrs: act("provider-toggle", r.id), danger: true } : { label: "Activează", icon: "rotate-arrow", attrs: act("provider-toggle", r.id) }
      ], r.denumire);
      default: return esc(r[key] ?? "—");
    }
  };
  const findProvider = (id) => cfg.providers.find((p) => p.id === id);
  const stepsUsing = (id) => cfg.useCases.flatMap((u) => u.steps.filter((s) => s.provider === id).map((s) => ({ u, s })));
  FORMS.provider = {
    page: true, view: "ekyc-providers", back: "Înapoi la furnizori",
    barCreate: "Furnizor nou · câmpurile marcate sunt obligatorii",
    entity: (f) => findProvider(f.id),
    title: (f) => (f.mode === "create" ? "Furnizor nou" : `Editează ${findProvider(f.id).name}`),
    crumbs: (f) => (f.mode === "create" ? { label: "Furnizor nou" } : [{ label: findProvider(f.id).name }, { label: "Editare" }]),
    hash: (f) => (f.mode === "create" ? "ek-furnizor-nou" : `ek-furnizor/${f.id}/editeaza`),
    submit: (f) => (f.mode === "create" ? "Adaugă furnizorul" : "Salvează"),
    note: (f) => (f.mode === "edit" ? "Schimbările intră în vigoare fără repornirea platformei: sesiunile în curs își termină pasul curent cu configurația veche (hot-swap)." : "Furnizorul se adaugă activ. Testează conexiunea înainte de salvare."),
    values: (mode, id) => {
      const p = mode === "edit" ? findProvider(id) : null;
      return { name: p?.name || "", system: p?.system || "", type: p?.type || "", endpoint: p?.endpoint || "", auth: p?.auth || "", secret: "", replaceSecret: mode === "create", timeoutMs: String(p?.timeoutMs ?? "20000"), retries: String(p?.retries ?? "2"), cbThreshold: String(p?.cbThreshold ?? "5"), cbReset: String(p?.cbReset ?? "60"), priority: String(p?.priority ?? "") };
    },
    fieldsOf: (sec) => ({ conexiune: ["name", "system", "type", "endpoint", "auth", "secret"], rezilienta: ["timeoutMs", "retries", "cbThreshold", "cbReset", "priority"] })[sec],
    sections: (f) => [
      ["conexiune", "Identificare și conexiune", "link", "Ce sistem extern este, ce verificare oferă și cum se conectează platforma la el.", `${grid(
        inp("name", "Denumire", { span: 6, placeholder: "ex. Veriff" }),
        inp("system", "Sistem furnizor", { span: 6, placeholder: "ex. Veriff" }),
        f.mode === "edit" ? locked("type", "Tip furnizor", f.v.type, { span: 6, hint: "Nu se modifică după creare — pașii folosesc tipul la alegerea furnizorului." }) : sel("type", "Tip furnizor", PROVIDER_TYPES, { required: true, placeholder: "Alege tipul", span: 6, hint: "Valori ilustrative, de confirmat cu backend-ul." }),
        sel("auth", "Tip autentificare", AUTH_TYPES, { required: true, placeholder: "Alege tipul", span: 6, hint: "Valori ilustrative, de confirmat cu backend-ul." }),
        inp("endpoint", "Endpoint", { required: true, max: 300, placeholder: "https://…", hint: "Adresa HTTPS a serviciului." }),
        secretField(f))}
        <div class="e-permits-ekcfg-test" data-ekcfg-test-slot>${testRow(f)}</div>`],
      ["rezilienta", "Reziliență", "shield", "Cât așteaptă platforma, de câte ori reîncearcă și când oprește temporar furnizorul.", grid(
        inp("timeoutMs", "Timeout (ms)", { span: 6, inputmode: "numeric", max: 6, hint: "Între 1 000 și 120 000 ms.", tip: "Cât așteaptă platforma răspunsul furnizorului la o cerere, înainte s-o considere eșuată." }),
        inp("retries", "Reîncercări maxime", { span: 6, inputmode: "numeric", max: 2, hint: "0–5 reluări la eroare temporară.", tip: "De câte ori se repetă o cerere eșuată (timeout, 5xx) înainte să treacă la furnizorul de rezervă." }),
        inp("cbThreshold", "Prag circuit breaker", { span: 6, inputmode: "numeric", max: 3, hint: "Erori consecutive (1–100).", tip: "Câte erori consecutive deschid circuitul: furnizorul nu mai primește cereri, iar pașii trec la furnizorii de rezervă." }),
        inp("cbReset", "Resetare circuit breaker (s)", { span: 6, inputmode: "numeric", max: 4, hint: "Secunde (10–3600).", tip: "După câte secunde circuitul se închide din nou: furnizorul primește o cerere de probă și, dacă reușește, revine în rotație." }),
        inp("priority", "Prioritate", { required: true, span: 6, inputmode: "numeric", max: 2, hint: "1 = preferat la selecția automată.", tip: "La selecția automată, între furnizorii de același tip se alege cel cu numărul cel mai mic." }))]
    ],
    validate: (f) => {
      const e = {}; const v = f.v;
      if (f.mode === "create" && !v.type) e.type = "Alege tipul furnizorului.";
      if (!v.endpoint.trim()) e.endpoint = REQ; else if (!isUrl(v.endpoint.trim())) e.endpoint = "Introdu o adresă HTTPS validă (ex. https://api.furnizor.md/v1).";
      if (!v.auth) e.auth = "Alege tipul de autentificare.";
      if (v.replaceSecret && !v.secret.trim()) e.secret = f.mode === "create" ? "Introdu credențialele." : "Introdu credențialele noi sau anulează înlocuirea.";
      if (!intIn(v.timeoutMs, 1000, 120000)) e.timeoutMs = "Introdu un număr între 1 000 și 120 000.";
      if (!intIn(v.retries, 0, 5)) e.retries = "Introdu un număr între 0 și 5.";
      if (!intIn(v.cbThreshold, 1, 100)) e.cbThreshold = "Introdu un număr între 1 și 100.";
      if (!intIn(v.cbReset, 10, 3600)) e.cbReset = "Introdu un număr între 10 și 3600.";
      if (!String(v.priority).trim()) e.priority = REQ; else if (!intIn(v.priority, 1, 99)) e.priority = "Introdu un număr între 1 și 99.";
      return e;
    },
    save: (f) => {
      const v = f.v;
      const data = { name: v.name.trim() || v.system.trim() || v.endpoint.replace(/^https:\/\//, "").split("/")[0], system: v.system.trim(), endpoint: v.endpoint.trim(), auth: v.auth, timeoutMs: Number(v.timeoutMs), retries: Number(v.retries), cbThreshold: Number(v.cbThreshold), cbReset: Number(v.cbReset), priority: Number(v.priority), updatedAt: nowIso(), updatedBy: me() };
      if (v.replaceSecret) { data.credentialsSet = true; data.credentialsUpdatedAt = nowIso(); }
      if (f.mode === "create") {
        const p = { id: `prv-${Date.now().toString(36)}`, type: v.type, health: "Operațional", latency: null, lastHealthCheck: nowIso(), active: true, createdAt: nowIso(), ...data, events: [event("Furnizor adăugat", data.name)] };
        cfg.providers.push(p);
        return () => { F = null; A.closeProfile(); flashRow(p.id); toast(`${p.name} poate fi ales în pașii cazurilor de utilizare.`, "Furnizor adăugat"); };
      }
      const p = findProvider(f.id);
      Object.assign(p, data);
      p.events.unshift(event("Configurație actualizată", v.replaceSecret ? "Credențiale înlocuite" : "Conexiune · reziliență"));
      return () => { F = null; A.closeProfile(); flashRow(p.id); toast(v.replaceSecret ? "Credențialele noi sunt folosite de la următoarea cerere." : "Se aplică fără repornirea platformei.", "Furnizor salvat"); };
    }
  };
  /* Credențiale: at create a masked input with „Afișează”; at edit never loaded — „••• setate”
     + „Înlocuiește credențialele” unlocks the field (US-UI-09) */
  const secretField = (f) => {
    if (!f.v.replaceSecret) {
      const p = findProvider(f.id);
      return field("secret", "Credențiale", `
        <div class="e-permits-ekcfg-list__row">
          <div class="e-permits-fo-input is-filled is-readonly"><input id="${fid("secret")}" type="text" value="••••••••• setate" readonly tabindex="-1"><svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-lock"></use></svg></div>
          <button class="btn btn-neutral btn-sm" type="button" data-ekcfg-secret-replace>Înlocuiește credențialele</button>
        </div>`, { required: true, hint: `Secretul salvat nu se afișează și nu se încarcă în pagină. Actualizat: ${esc(stamp(p.credentialsUpdatedAt))}.` });
    }
    return field("secret", "Credențiale", `
      <div class="e-permits-ekcfg-list__row">
        <div class="e-permits-fo-input${errOf("secret") ? " is-error" : ""}"><input id="${fid("secret")}" type="${F.showSecret ? "text" : "password"}" value="${esc(f.v.secret)}" autocomplete="new-password" placeholder="Cheie API, secret sau parolă" data-ekcfg-field="secret"${errOf("secret") ? ' aria-invalid="true"' : ""}></div>
        <button class="btn btn-neutral btn-sm" type="button" data-ekcfg-secret-show aria-pressed="${F.showSecret ? "true" : "false"}">${icon(F.showSecret ? "eye-open" : "eye-open", 16)}<span>${F.showSecret ? "Ascunde" : "Afișează"}</span></button>
        ${f.mode === "edit" ? '<button class="btn btn-text-neutral btn-sm" type="button" data-ekcfg-secret-cancel>Anulează înlocuirea</button>' : ""}
      </div>`, { required: true, hint: f.mode === "edit" ? "Credențialele noi înlocuiesc secretul salvat la Salvează." : "Se salvează criptat; după salvare nu se mai afișează." });
  };
  /* what the in-form test checks (US-UI-09 AC: saved vs new values must be clear) */
  const testRow = (f) => {
    const usesSaved = f.mode === "edit" && !f.v.replaceSecret;
    return `
      <div class="e-permits-ekcfg-test__row">
        ${btn("Testează conexiunea", 'data-ekcfg-test-form aria-haspopup="dialog"', { ic: "signal" })}
        <p class="e-permits-ekcfg-hint">${f.mode === "create" ? "Testează valorile din formular, înainte de salvare." : usesSaved ? "Credențialele nu au fost înlocuite: testul folosește <strong>configurația salvată</strong> (cu endpoint-ul din formular)." : "Credențialele au fost înlocuite: testul folosește <strong>valorile noi</strong> din formular."}</p>
      </div>`;
  };
  /* connection test: a deterministic mock of POST /Providers/{id}/test-connection (saved) and
     POST /Providers/test-connection (form values) — result in the page modal */
  const runTest = ({ provider, endpoint, source, button }) => {
    button.classList.add("btn-loading");
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    if (DEMO === "test-lent") return;
    window.setTimeout(() => {
      button.classList.remove("btn-loading");
      button.disabled = false;
      button.removeAttribute("aria-busy");
      const host = endpoint.replace(/^https:\/\//, "").split("/")[0];
      const fail = !isUrl(endpoint) ? `Adresa „${endpoint}” nu este un URL HTTPS valid.` : provider?.health === "Indisponibil" && endpoint === provider.endpoint ? "503 Service Unavailable — furnizorul nu răspunde." : /\.invalid$|localhost/.test(host) ? `Nu s-a putut rezolva gazda „${host}”.` : "";
      const ms = fail ? null : provider?.latency ? Math.round(provider.latency * 1000 / 3 + 90) : 240;
      const at = nowIso();
      if (provider && source === "saved") { provider.lastHealthCheck = at; provider.events.unshift({ at, type: "Test de conexiune", status: fail ? "Eșuat" : "Reușit", detail: fail || `${ms} ms`, user: me() }); refreshList(); }
      showTestResult({ ok: !fail, ms, message: fail || (ms > 1200 ? "200 OK — răspunde, dar lent." : "200 OK — furnizorul răspunde."), at, name: provider?.name || "Furnizor nou", source, retry: button.dataset.ekcfg ? `${act("provider-test", button.dataset.id)}` : "data-ekcfg-test-form" });
    }, 1100);
  };
  const showTestResult = ({ ok, ms, message, at, name, source, retry }) => {
    S.openModal({
      title: "Testul conexiunii", subtitle: `${name} · ${source === "saved" ? "configurația salvată" : source === "mixed" ? "configurația salvată + endpoint-ul din formular" : "valorile din formular"}`, kind: "ekcfg-test",
      body: `
        <div class="e-permits-case-form">
          <div class="e-permits-callout e-permits-callout--${ok ? "success" : "danger"}" role="status">
            <span class="e-permits-callout__icon" aria-hidden="true">${icon(ok ? "circle-checkmark-filled" : "circle-error-filled", 24)}</span>
            <div class="e-permits-callout__content">
              <p class="e-permits-callout__title">${ok ? "Conexiune reușită" : "Conexiunea a eșuat"}</p>
              <p class="e-permits-callout__meta">${esc(message)}</p>
            </div>
          </div>
          ${A.renderInfoCard("Rezultat", [["Latență", ms == null ? "—" : `${intFmt(ms)} ms`], ["Mesaj de status", esc(message)], ["Testat la", esc(stamp(at))], ["Configurație testată", source === "saved" ? "Salvată" : source === "mixed" ? "Salvată (credențiale) + endpoint din formular" : "Valorile din formular"]])}
        </div>`,
      footer: `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Închide</button><button class="btn btn-primary btn-rounded" type="button" ${retry}>Testează din nou</button></div>`
    });
  };
  const providerActions = {
    "provider-new": () => openForm("provider", "create"),
    "provider-edit": (id) => { ensureList("ekyc-providers"); openForm("provider", "edit", id); },
    "provider-test": (id, el) => {
      const p = findProvider(id);
      const inModal = el.closest("#case-action-modal");
      if (inModal) S.closeModal();
      const button = inModal ? document.querySelector(`tr[data-workplace-row="${CSS.escape(id)}"] [data-ekcfg="provider-test"]`) || el : el;
      runTest({ provider: p, endpoint: p.endpoint, source: "saved", button });
    },
    "provider-toggle": (id) => {
      const p = findProvider(id);
      const on = p.active;
      const used = stepsUsing(id).filter(({ u }) => u.active);
      A.askConfirm({ title: on ? `Dezactivezi ${p.name}?` : `Activezi ${p.name}?`, text: on ? (used.length ? `Atenție: este furnizorul principal în ${plural(used.length, "pas activ", "pași activi")} (${[...new Set(used.map(({ u }) => u.code))].join(", ")}). Pașii trec pe furnizorii de rezervă; unde nu există rezervă, sesiunile noi eșuează la acel pas. Sesiunile în curs nu se întrerup.` : "Nu este furnizor principal în niciun pas activ. Sesiunile în curs nu se întrerup.") : `${p.name} primește din nou cereri, fără repornirea platformei. Ultimul test: ${p.health}.`, confirmLabel: on ? "Dezactivează" : "Activează", destructive: on }, () => {
        p.active = !on; p.updatedAt = nowIso(); p.updatedBy = me();
        p.events.unshift(event(on ? "Furnizor dezactivat" : "Furnizor activat", "Fără repornirea platformei (hot-swap)."));
        refreshList(); flashRow(id);
        toast(on ? `${p.name} nu mai primește cereri noi.` : `${p.name} primește cereri.`, on ? "Furnizor dezactivat" : "Furnizor activat");
      });
    }
  };

  /* =====================================================================================
     Organizații (US-UI-06 91125)
     ===================================================================================== */
  const orgRow = (o) => ({ id: o.id, o, denumire: o.name, idno: o.idno, contact: o.contactName, email: o.contactEmail, telefon: o.contactPhone, activ: o.active ? 1 : 0, creat: o.createdAt, clienti: cfg.clients.filter((c) => c.orgId === o.id).length });
  ROWS["ekyc-organizations"] = () => cfg.organizations.map(orgRow);
  const showOrganizations = () => registry("ekyc-organizations", {
    columns: {
      denumire: { label: "Denumire", width: 264, fill: true, sortable: true },
      idno: { label: "IDNO", width: 176, sortable: true },
      contact: { label: "Persoană de contact", width: 192, sortable: true },
      email: { label: "Email", width: 248, sortable: true },
      telefon: { label: "Telefon", width: 160 },
      activ: { label: "Status", width: 112, sortable: true },
      creat: { label: "Creată la", width: 144, sortable: true },
      actiuni: { label: "", width: 168 }
    },
    order: ["denumire", "idno", "contact", "email", "telefon", "activ", "creat", "actiuni"],
    tabs: statusTabs("Toate", "Active", "Inactive"), search: "Căutare după denumire, IDNO sau persoană de contact",
    primary: { id: "org-new", label: "Adaugă organizație" }, sortKey: "denumire"
  });
  const orgCell = (r, key) => {
    switch (key) {
      case "denumire": return S.identity(r.denumire, r.clienti ? plural(r.clienti, "client", "clienți") : "fără clienți");
      case "idno": return A.renderCopyCode(r.idno, `Copiază ${r.idno}`);
      case "contact": return r.contact ? desc(r.contact) : dash;
      case "email": return r.email ? desc(r.email) : dash;
      case "telefon": return r.telefon ? esc(r.telefon) : dash;
      case "activ": return statusTag(r.activ);
      case "creat": return A.renderDateTime(r.creat);
      case "actiuni": return rowActions({ label: "Editează", attrs: act("org-edit", r.id) }, [
        r.activ ? { label: "Dezactivează", icon: "pause", attrs: act("org-toggle", r.id) } : { label: "Activează", icon: "rotate-arrow", attrs: act("org-toggle", r.id) },
        { label: "Șterge", icon: "delete", attrs: act("org-delete", r.id), danger: true }
      ], r.denumire);
      default: return esc(r[key] ?? "—");
    }
  };
  const findOrg = (id) => cfg.organizations.find((o) => o.id === id);
  FORMS.org = {
    title: (f) => (f.mode === "create" ? "Organizație nouă" : "Editează organizația"),
    subtitle: (f) => (f.mode === "edit" ? findOrg(f.id).name : "Organizația căreia îi aparțin clienții"),
    submit: (f) => (f.mode === "create" ? "Adaugă organizația" : "Salvează"),
    values: (mode, id) => { const o = mode === "edit" ? findOrg(id) : null; return { name: o?.name || "", idno: o?.idno || "", contactName: o?.contactName || "", contactEmail: o?.contactEmail || "", contactPhone: o?.contactPhone || "" }; },
    body: () => `
      ${dSection("Organizație", grid(
        inp("name", "Denumire", { required: true, placeholder: "ex. Moldtelecom SA" }),
        inp("idno", "IDNO", { required: true, span: 6, inputmode: "numeric", max: 13, placeholder: "13 cifre", hint: "Numărul de identificare de stat, 13 cifre." })))}
      ${dSection("Persoana de contact", grid(
        inp("contactName", "Nume contact", { span: 12, placeholder: "Prenume Nume" }),
        inp("contactEmail", "Email contact", { span: 6, placeholder: "nume@organizatie.md" }),
        inp("contactPhone", "Telefon contact", { span: 6, placeholder: "+373 22 000 000" })))}`,
    validate: (f) => {
      const e = {}; const v = f.v;
      if (!v.name.trim()) e.name = REQ;
      if (!v.idno.trim()) e.idno = REQ; else if (!isIdno(v.idno.trim())) e.idno = "IDNO-ul are exact 13 cifre.";
      else if (cfg.organizations.some((o) => o.idno === v.idno.trim() && o.id !== f.id)) e.idno = "Există deja o organizație cu acest IDNO.";
      if (v.contactEmail.trim() && !isEmail(v.contactEmail.trim())) e.contactEmail = "Introdu o adresă de email validă (ex. nume@organizatie.md).";
      if (v.contactPhone.trim() && !/^\+?[\d\s()-]{8,20}$/.test(v.contactPhone.trim())) e.contactPhone = "Introdu un număr de telefon valid (ex. +373 22 000 000).";
      return e;
    },
    save: (f) => {
      const v = f.v;
      const data = { name: v.name.trim(), idno: v.idno.trim(), contactName: v.contactName.trim(), contactEmail: v.contactEmail.trim(), contactPhone: v.contactPhone.trim(), updatedAt: nowIso(), updatedBy: me() };
      let o;
      if (f.mode === "create") { o = { id: `org-${Date.now().toString(36)}`, active: true, createdAt: nowIso(), ...data }; cfg.organizations.push(o); } else { o = findOrg(f.id); Object.assign(o, data); }
      return () => { flashRow(o.id); toast(o.name, f.mode === "create" ? "Organizație adăugată" : "Organizație salvată"); };
    }
  };
  const orgActions = {
    "org-new": () => openForm("org", "create"),
    "org-edit": (id) => openForm("org", "edit", id),
    "org-toggle": (id) => {
      const o = findOrg(id);
      const on = o.active;
      const n = cfg.clients.filter((c) => c.orgId === id && c.active).length;
      A.askConfirm({ title: on ? `Dezactivezi ${o.name}?` : `Activezi ${o.name}?`, text: on ? `Nu se mai pot adăuga clienți noi pentru organizație${n ? `; clienții ei activi (${n}) rămân activi până îi dezactivezi separat` : ""}.` : "Organizația poate primi clienți noi.", confirmLabel: on ? "Dezactivează" : "Activează", destructive: on }, () => { o.active = !on; refreshList(); flashRow(id); });
    },
    /* US-UI-06: confirm, then 409 (has clients) is its own dialog, distinct from a generic error */
    "org-delete": (id) => {
      const o = findOrg(id);
      A.askConfirm({ title: `Ștergi organizația ${o.name}?`, text: "Organizația se șterge definitiv din platformă. Operațiunea nu poate fi anulată.", confirmLabel: "Șterge", destructive: true }, () => {
        const clients = cfg.clients.filter((c) => c.orgId === id);
        if (DEMO === "eroare-stergere") {
          S.openModal({ title: "Nu am putut șterge organizația", subtitle: o.name, kind: "ekcfg-error", body: `<div class="e-permits-case-form">${A.renderNotice("error", "Serviciul de configurare nu a răspuns (500). Organizația nu a fost ștearsă; încearcă din nou peste câteva secunde.")}</div>`, footer: `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Închide</button><button class="btn btn-primary btn-rounded" type="button" data-case-close ${act("org-delete", id)}>Încearcă din nou</button></div>` });
          return;
        }
        if (clients.length) {
          S.openModal({
            title: "Organizația nu poate fi ștearsă", subtitle: o.name, kind: "ekcfg-conflict",
            body: `<div class="e-permits-case-form">${A.renderNotice("warning", "<strong>Organizația are clienți asociați și nu poate fi ștearsă.</strong> Mută sau șterge mai întâi clienții de mai jos, ori dezactivează organizația.")}${A.renderStackedList(`Clienți asociați (${clients.length})`, [{ label: "", items: clients.map((c) => ({ title: esc(c.name), plainTitle: c.name, badges: [statusTag(c.active)], meta: [esc(c.id), plural(c.useCases.length, "caz de utilizare", "cazuri de utilizare")] })) }])}</div>`,
            footer: `<div class="modal-buttons"><button class="btn btn-neutral btn-rounded" type="button" data-case-close>Închide</button>${o.active ? `<button class="btn btn-primary btn-rounded" type="button" data-case-close ${act("org-toggle", id)}>Dezactivează organizația</button>` : ""}</div>`
          });
          return;
        }
        cfg.organizations = cfg.organizations.filter((x) => x !== o);
        refreshList();
        toast(`${o.name} a fost ștearsă.`, "Organizație ștearsă");
      });
    }
  };

  /* =====================================================================================
     Versiuni SDK (US-UI-12 91133)
     ===================================================================================== */
  const PLATFORM_ICON = { iOS: "phone", Android: "phone-1", Web: "globe" };
  const sdkRow = (x) => ({ id: x.id, x, versiune: x.version, platforma: x.platform, descriere: x.description, lansare: x.releaseDate, recomandata: x.recommended ? 1 : 0, suportata: x.supported ? 1 : 0, descarcare: x.downloadUrl });
  ROWS["ekyc-sdk"] = () => cfg.sdk.map(sdkRow);
  const semverKey = (v) => v.split(/[.-]/).slice(0, 3).map((n) => String(Number(n) || 0).padStart(4, "0")).join(".") + (v.includes("-") ? "0" : "1");
  const showSdk = () => registry("ekyc-sdk", {
    columns: {
      versiune: { label: "Versiune", width: 136, sortable: true },
      platforma: { label: "Platformă", width: 136, sortable: true },
      descriere: { label: "Descriere", width: 320, fill: true },
      lansare: { label: "Data lansării", width: 160, sortable: true },
      recomandata: { label: "Recomandată", width: 152, sortable: true },
      suportata: { label: "Suportată", width: 136, sortable: true },
      descarcare: { label: "Descărcare", width: 112 },
      actiuni: { label: "", width: 168 }
    },
    order: ["versiune", "platforma", "descriere", "lansare", "recomandata", "suportata", "descarcare", "actiuni"],
    tabs: [{ id: "all", label: "Toate", filter: "all" }, { id: "on", label: "Suportate", filter: "f:suportata=1" }, { id: "off", label: "Nesuportate", filter: "f:suportata=0" }],
    search: "Căutare după versiune sau descriere", primary: { id: "sdk-new", label: "Adaugă versiune" }, sortKey: "lansare", sortDirection: "desc"
  });
  const sdkCell = (r, key) => {
    switch (key) {
      case "versiune": return `<span class="e-permits-passport__name">${esc(r.versiune)}</span>`;
      case "platforma": return `<span class="e-permits-workplace__tag e-permits-workplace__tag--neutral e-permits-workplace__tag--icon">${icon(PLATFORM_ICON[r.platforma], 16)}${esc(r.platforma)}</span>`;
      case "descriere": return desc(r.descriere);
      case "lansare": return esc(longDate(r.lansare));
      /* Recomandată = brand tag with the award icon; Suportată = success / neutral tag — two
         different looks so the two columns scan apart (US-UI-12 AC) */
      case "recomandata": return r.recomandata ? `<span class="e-permits-workplace__tag e-permits-workplace__tag--brand e-permits-workplace__tag--icon">${icon("award", 16)}Recomandată</span>` : dash;
      case "suportata": return r.suportata ? T("Suportată", "success") : T("Nesuportată", "neutral");
      case "descarcare": return `<a class="btn btn-strict btn-sm btn-icon-only" href="${esc(r.descarcare)}" target="_blank" rel="noopener" aria-label="Descarcă ${esc(r.platforma)} ${esc(r.versiune)} (se deschide în altă filă)" data-tooltip-label="Descarcă">${icon("external-link", 16)}</a>`;
      case "actiuni": return rowActions({ label: "Editează", attrs: act("sdk-edit", r.id) }, [
        r.suportata ? { label: "Retrage din suport", icon: "pause", attrs: act("sdk-support", r.id) } : { label: "Repune în suport", icon: "rotate-arrow", attrs: act("sdk-support", r.id) },
        { label: "Șterge", icon: "delete", attrs: act("sdk-delete", r.id), danger: true }
      ], `${r.platforma} ${r.versiune}`);
      default: return esc(r[key] ?? "—");
    }
  };
  const findSdk = (id) => cfg.sdk.find((x) => x.id === id);
  const todayIso = () => nowIso().slice(0, 10);
  const dateField = (key, label, o = {}) => {
    const iso = val(key);
    const [y, m, d] = iso ? iso.split("-") : [];
    const view = (iso || todayIso()).split("-");
    return field(key, label, `
      <div class="date-picker__field" data-date-picker data-type="default" data-locale="ro" data-selected="${esc(iso)}" data-today="${todayIso()}" data-year="${Number(view[0])}" data-month="${Number(view[1]) - 1}" data-ekcfg-date="${esc(key)}">
        <div class="e-permits-fo-input e-permits-fo-input--with-action${errOf(key) ? " is-error" : ""}">
          <input id="${fid(key)}" type="text" class="js-date-picker-input" value="${iso ? `${d}/${m}/${y}` : ""}" placeholder="ZZ/LL/AAAA" autocomplete="off">
          <button type="button" class="e-permits-fo-input__icon-button js-date-picker-toggle" aria-label="Alege data" aria-controls="${fid(key)}-panel" aria-expanded="false">${icon("calendar")}</button>
        </div>
        <div id="${fid(key)}-panel" class="date-picker-panel" aria-hidden="true" hidden>
          <div class="date-picker" role="dialog" aria-label="Alege data">
            <div class="date-picker__header">
              <button class="date-picker__nav js-date-picker-prev" type="button" aria-label="Luna anterioară"><svg class="icon medium" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-left"></use></svg></button>
              <div class="date-picker__month js-date-picker-label"></div>
              <button class="date-picker__nav js-date-picker-next" type="button" aria-label="Luna următoare"><svg class="icon medium" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-right"></use></svg></button>
            </div>
            <div class="date-picker__grid date-picker__grid--days" data-view="day"><div class="date-picker__weekdays">${["L", "M", "M", "J", "V", "S", "D"].map((w) => `<div class="date-picker__weekday">${w}</div>`).join("")}</div><div class="date-picker__days js-date-picker-days"></div></div>
          </div>
        </div>
      </div>`, o);
  };
  FORMS.sdk = {
    title: (f) => (f.mode === "create" ? "Versiune SDK nouă" : "Editează versiunea"),
    subtitle: (f) => (f.mode === "edit" ? `${findSdk(f.id).platform} ${findSdk(f.id).version}` : "SDK-ul integrat de clienți în aplicațiile lor"),
    submit: (f) => (f.mode === "create" ? "Publică versiunea" : "Salvează"),
    values: (mode, id) => { const x = mode === "edit" ? findSdk(id) : null; return { version: x?.version || "", platform: x?.platform || "", description: x?.description || "", downloadUrl: x?.downloadUrl || "", releaseDate: x?.releaseDate || todayIso(), recommended: Boolean(x?.recommended) }; },
    body: (f) => grid(
      inp("version", "Versiune", { required: true, span: 6, placeholder: "ex. 4.3.0", hint: "Semver: MAJOR.MINOR.PATCH (opțional -rc.1)." }),
      f.mode === "edit" ? locked("platform", "Platformă", f.v.platform, { span: 6 }) : sel("platform", "Platformă", PLATFORMS, { required: true, placeholder: "Alege platforma", span: 6 }),
      area("description", "Descriere", { max: 300, hint: "Ce aduce versiunea." }),
      inp("downloadUrl", "URL descărcare", { max: 300, placeholder: "https://sdk.ekyc.gov.md/…" }),
      dateField("releaseDate", "Data lansării", { span: 6 }),
      f.mode === "edit"
        ? tog("recommended", "Recomandată", `Versiunea recomandată pentru ${f.v.platform}; o înlocuiește pe cea recomandată acum.`)
        : `<div class="e-permits-user-create__field e-permits-user-create__field--12">${A.renderInfoNote("„Recomandată” se poate seta după publicare, din Editează (așa cere API-ul).")}</div>`),
    validate: (f) => {
      const e = {}; const v = f.v;
      if (!v.version.trim()) e.version = REQ; else if (!isSemver(v.version.trim())) e.version = "Folosește formatul semver, ex. 4.3.0 sau 2.5.0-rc.1.";
      if (!v.platform) e.platform = "Alege platforma.";
      if (!e.version && v.platform && cfg.sdk.some((x) => x.platform === v.platform && x.version === v.version.trim() && x.id !== f.id)) e.version = `Versiunea ${v.version.trim()} există deja pentru ${v.platform}.`;
      if (v.downloadUrl.trim() && !isUrl(v.downloadUrl.trim())) e.downloadUrl = "Introdu o adresă HTTPS validă.";
      return e;
    },
    save: (f) => {
      const v = f.v;
      const data = { version: v.version.trim(), description: v.description.trim(), downloadUrl: v.downloadUrl.trim(), releaseDate: v.releaseDate || todayIso(), updatedAt: nowIso(), updatedBy: me() };
      let x;
      if (f.mode === "create") { x = { id: `sdk-${v.platform.toLowerCase()}-${Date.now().toString(36)}`, platform: v.platform, recommended: false, supported: true, createdAt: nowIso(), ...data }; cfg.sdk.push(x); }
      else {
        x = findSdk(f.id); Object.assign(x, data);
        if (v.recommended && !x.recommended) cfg.sdk.forEach((o) => { if (o.platform === x.platform) o.recommended = false; });
        x.recommended = Boolean(v.recommended);
      }
      return () => { flashRow(x.id); toast(`${x.platform} ${x.version}${x.recommended ? " · recomandată" : ""}.`, f.mode === "create" ? "Versiune publicată" : "Versiune salvată"); };
    }
  };
  const sdkActions = {
    "sdk-new": () => openForm("sdk", "create"),
    "sdk-edit": (id) => openForm("sdk", "edit", id),
    "sdk-support": (id) => {
      const x = findSdk(id);
      const on = x.supported;
      A.askConfirm({ title: on ? `Retragi din suport ${x.platform} ${x.version}?` : `Repui în suport ${x.platform} ${x.version}?`, text: on ? `Aplicațiile cu această versiune primesc avertismentul de actualizare la inițierea sesiunii.${x.recommended ? " Era versiunea recomandată: alege alta pentru " + x.platform + "." : ""}` : "Versiunea este din nou acceptată fără avertisment.", confirmLabel: on ? "Retrage din suport" : "Repune în suport", destructive: on }, () => {
        x.supported = !on; if (on) x.recommended = false; refreshList(); flashRow(id);
      });
    },
    "sdk-delete": (id) => {
      const x = findSdk(id);
      A.askConfirm({ title: `Ștergi ${x.platform} ${x.version}?`, text: `Versiunea dispare din registru și din lista de descărcări.${x.recommended ? ` Era recomandată pentru ${x.platform}.` : ""} Operațiunea nu poate fi anulată.`, confirmLabel: "Șterge", destructive: true }, () => {
        cfg.sdk = cfg.sdk.filter((o) => o !== x); refreshList(); toast(`${x.platform} ${x.version} a fost ștearsă.`, "Versiune ștearsă");
      });
    }
  };

  /* =====================================================================================
     Certificate root CA de încredere (US-05-09-B 89238, CA-1…CA-6) — mTLS clients
     ===================================================================================== */
  const daysTo = (iso) => Math.round((new Date(`${iso}T00:00:00`) - S.now()) / 86400000);
  const caState = (c) => (daysTo(c.validTo) < 0 ? "Expirat" : c.rotation && c.status === "Activ" ? "În rotație" : c.status);
  const CA_TONES = { Activ: "success", Inactiv: "neutral", Expirat: "danger", "În rotație": "warning" };
  const caRow = (c) => ({ id: c.id, c, denumire: c.name, emitent: c.issuer.replace(/^CN=([^,]+).*/, "$1"), amprenta: c.thumbprint, valabilDeLa: c.validFrom, valabilPana: c.validTo, stare: caState(c), activ: c.status === "Activ" ? 1 : 0, clienti: c.usedBy.length });
  ROWS["ekyc-trusted-cas"] = () => cfg.trustedCas.map(caRow);
  const showCas = () => registry("ekyc-trusted-cas", {
    columns: {
      denumire: { label: "Certificat", width: 264, fill: true, sortable: true },
      emitent: { label: "Emitent", width: 216, sortable: true },
      amprenta: { label: "Amprentă SHA-256", width: 232 },
      valabilDeLa: { label: "Valabil de la", width: 152, sortable: true },
      valabilPana: { label: "Valabil până la", width: 168, sortable: true },
      stare: { label: "Status", width: 136, sortable: true },
      actiuni: { label: "", width: 176 }
    },
    order: ["denumire", "emitent", "amprenta", "valabilDeLa", "valabilPana", "stare", "actiuni"],
    tabs: [{ id: "all", label: "Toate", filter: "all" }, { id: "on", label: "Active", filter: "f:activ=1" }, { id: "rot", label: "În rotație", filter: "f:stare=În rotație" }, { id: "off", label: "Inactive", filter: "f:activ=0" }],
    search: "Căutare după denumire, emitent sau amprentă", primary: { id: "ca-new", label: "Încarcă certificat" }, sortKey: "valabilPana", sortDirection: "asc"
  });
  const shortThumb = (t) => `${t.slice(0, 11)}…${t.slice(-5)}`;
  const caCell = (r, key) => {
    switch (key) {
      case "denumire": return S.identity(r.denumire, r.clienti ? `mTLS · ${plural(r.clienti, "client", "clienți")}` : r.c.keyAlgorithm);
      case "emitent": return desc(r.emitent);
      case "amprenta": return A.renderCopyCode(shortThumb(r.amprenta), `Copiază amprenta ${r.amprenta}`).replace(`data-shell-copy-value="${esc(shortThumb(r.amprenta))}"`, `data-shell-copy-value="${esc(r.amprenta)}"`);
      case "valabilDeLa": return esc(longDate(r.valabilDeLa));
      case "valabilPana": { const d = daysTo(r.valabilPana); return `<span class="e-permits-workplace__date-stack"><span>${esc(longDate(r.valabilPana))}</span><span class="e-permits-workplace__date-meta">${d < 0 ? `expirat de ${-d} zile` : d <= 60 ? `expiră în ${d} zile` : `încă ${Math.round(d / 365)} ani`}</span></span>`; }
      case "stare": return T(r.stare, CA_TONES[r.stare]);
      case "actiuni": return rowActions({ label: "Vezi detalii", attrs: act("ca-open", r.id) }, caMenu(r.c), r.denumire);
      default: return esc(r[key] ?? "—");
    }
  };
  const caMenu = (c) => {
    const items = [];
    const expired = daysTo(c.validTo) < 0;
    if (c.status === "Activ" && !c.rotation) items.push({ label: "Rotește certificatul", icon: "rotate-arrow", attrs: act("ca-rotate", c.id) });
    if (c.rotation?.role === "new") items.push({ label: "Finalizează rotația", icon: "checkmark-small", attrs: act("ca-finish", c.id) });
    if (c.status === "Activ") items.push({ label: "Dezactivează", icon: "pause", attrs: act("ca-toggle", c.id), danger: true });
    else if (!expired) items.push({ label: "Activează", icon: "rotate-arrow", attrs: act("ca-toggle", c.id) });
    return items;
  };
  const findCa = (id) => cfg.trustedCas.find((c) => c.id === id);
  const caDetail = (id, tab = "general") => {
    const c = findCa(id);
    if (!c) { notFound("ekyc-trusted-cas", id, "Certificatul"); return; }
    ensureList("ekyc-trusted-cas");
    st.detail = { type: "ca", id, tab };
    const state = caState(c);
    const partner = c.rotation ? findCa(c.rotation.partner) : null;
    const rotation = c.rotation ? `
      <section class="e-permits-dosar-profil__section" aria-label="Rotație">
      <div class="e-permits-callout e-permits-callout--warning" role="status">
        <span class="e-permits-callout__icon" aria-hidden="true">${icon("rotate-arrow", 24)}</span>
        <div class="e-permits-callout__content">
          <p class="e-permits-callout__title">Rotație în desfășurare · ambele certificate sunt acceptate</p>
          <p class="e-permits-callout__meta">${c.rotation.role === "new" ? `Înlocuiește „${esc(partner?.name || "")}”.` : `Este înlocuit de „${esc(partner?.name || "")}”.`} Perioada de tranziție: ${esc(stamp(c.rotation.startedAt))} → ${esc(stamp(c.rotation.until))} (${Math.max(0, daysTo(c.rotation.until.slice(0, 10)))} zile rămase).</p>
          <p class="e-permits-callout__text"><strong>Urmează:</strong> clienții își reînnoiesc certificatele emise de noul CA; la final, ${c.rotation.role === "new" ? "„Finalizează rotația” dezactivează certificatul vechi" : "certificatul vechi se dezactivează"}.</p>
        </div>
      </div>
      </section>` : "";
    const actions = caMenu(c).map((x) => btn(x.label, x.attrs, { ic: x.icon })).join("");
    openPanel({
      view: "ekyc-trusted-cas", crumb: { label: c.name }, title: c.name, actions,
      meta: [["Status", T(state, CA_TONES[state])], ["Emitent", esc(c.issuer.replace(/^CN=([^,]+).*/, "$1"))], ["Valabil până la", esc(longDate(c.validTo))], ["Clienți mTLS", String(c.usedBy.length)]],
      tabs: [["general", "Date generale"], ["jurnal", "Jurnal", c.events.length]], tab, hash: `ek-certificat/${c.id}/${tab}`, back: "Înapoi la certificate",
      body: tab === "jurnal" ? A.renderEventTimeline("Jurnal", c.events, { meta: "Jurnalizat prin MLog" }) : `
        ${rotation}
        ${A.renderInfoCard("Certificat", [["Subiect", esc(c.subject)], ["Emitent", esc(c.issuer)], ["Număr de serie", A.renderProfileCopyCode(c.serial, `Copiază ${c.serial}`)], ["Amprentă SHA-256", A.renderProfileCopyCode(c.thumbprint, "Copiază amprenta")], ["Algoritm cheie", esc(c.keyAlgorithm)], ["Valabil de la", esc(longDate(c.validFrom))], ["Valabil până la", `${esc(longDate(c.validTo))} <span class="e-permits-dosar-profil__termen-meta">${daysTo(c.validTo) < 0 ? "expirat" : `${daysTo(c.validTo)} zile rămase`}</span>`]])}
        ${A.renderStackedList("Clienți care se autentifică cu acest CA", [{ label: "", items: c.usedBy.map((cid) => { const cl = findClient(cid); return { title: esc(cl?.name || cid), plainTitle: cl?.name || cid, badges: [statusTag(cl?.active)], meta: [esc(cid), esc(orgName(cl?.orgId))] }; }) }], { empty: "Niciun client nu folosește încă certificate emise de acest CA." })}
        ${A.renderInfoCard("Înregistrare", [["Încărcat la", esc(stamp(c.uploadedAt))], ["Încărcat de", esc(c.uploadedBy)]])}`
    });
  };
  /* Încarcă certificat (CA-1, CA-2): the file → parsed details shown before „Înregistrează”;
     duplicate or expired → rejected with the reason. Parsing is mocked from the file name. */
  const parseCert = (file) => {
    const base = file.name.replace(/\.(pem|crt|cer|der)$/i, "");
    if (!/\.(pem|crt|cer|der)$/i.test(file.name)) return { error: "Fișierul nu este un certificat X.509 (.pem, .crt, .cer sau .der)." };
    if (/expirat|expired/i.test(base)) return { error: "Certificatul a expirat pe 16 aprilie 2026 și nu poate fi înregistrat.", cert: { name: "STISC Test CA 2020", validTo: "2026-04-16" } };
    if (/dup|digicert/i.test(base)) { const d = findCa("ca-digicert-g2"); return { error: `Certificatul este deja înregistrat: „${d.name}” (aceeași amprentă SHA-256).`, cert: d }; }
    const name = base.replace(/[-_]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
    const from = nowIso().slice(0, 10);
    const to = `${Number(from.slice(0, 4)) + 10}${from.slice(4)}`;
    return { cert: { name, subject: `CN=${name}, O=${name.split(" ")[0]}, C=MD`, issuer: `CN=${name}, O=${name.split(" ")[0]}, C=MD`, serial: "4F2A9C11D07E3B58", thumbprint: "9C:41:7E:0B:52:D8:A3:6F:11:C4:E9:20:7D:B5:38:A6", keyAlgorithm: "ECDSA P-384", validFrom: from, validTo: to } };
  };
  const certDrop = (f) => {
    const p = f.v.parsed;
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12" data-ekcfg-wrap="file">
        <div class="e-permits-fo-doc-field e-permits-fo-doc-field--boxed${errOf("file") ? " is-error" : ""}">
          <div class="e-permits-fo-doc-field__row">
            <div class="e-permits-fo-doc-field__info">
              <span class="e-permits-fo-doc-field__label" id="${fid("file")}-label">${f.v.fileName ? esc(f.v.fileName) : "Certificatul CA"}${f.v.fileName ? "" : S.requiredMark}</span>
              <p class="e-permits-fo-doc-field__desc">${f.v.fileName ? (p?.error ? "Certificat respins — vezi motivul de mai jos." : "Certificat citit. Verifică detaliile înainte de înregistrare.") : "Fișier .pem, .crt, .cer sau .der, doar cu cheia publică a autorității."}</p>
            </div>
            <button class="btn btn-strict btn-md" type="button" aria-describedby="${fid("file")}-label" data-ekcfg-file-pick>${icon("upload")}<span>${f.v.fileName ? "Alege alt fișier" : "Alege fișierul"}</span></button>
            <input id="${fid("file")}" class="u-visually-hidden" type="file" accept=".pem,.crt,.cer,.der" tabindex="-1" aria-hidden="true" data-ekcfg-file>
          </div>
        </div>
        ${errHtml("file")}
      </div>
      ${p?.cert && !p.error ? `<div class="e-permits-user-create__field e-permits-user-create__field--12">${A.renderInfoCard("Detaliile certificatului", [["Subiect", esc(p.cert.subject)], ["Emitent", esc(p.cert.issuer)], ["Număr de serie", esc(p.cert.serial)], ["Amprentă SHA-256", esc(p.cert.thumbprint)], ["Algoritm cheie", esc(p.cert.keyAlgorithm)], ["Valabil", `${esc(longDate(p.cert.validFrom))} → ${esc(longDate(p.cert.validTo))}`]])}</div>` : ""}`;
  };
  FORMS.ca = {
    title: (f) => (f.extra.rotate ? "Rotește certificatul" : "Încarcă certificat CA"),
    subtitle: (f) => (f.extra.rotate ? findCa(f.extra.rotate).name : "Autoritate de certificare de încredere pentru clienții mTLS"),
    summary: (f) => (f.extra.rotate ? "Ambele certificate rămân acceptate până la finalul tranziției." : "Se înregistrează inactiv; îl activezi după verificare."),
    submit: (f) => (f.extra.rotate ? "Începe rotația" : "Înregistrează certificatul"),
    values: () => ({ fileName: "", parsed: null, until: "14" }),
    body: (f) => `${f.extra.rotate ? A.renderNotice("info", `Noul certificat se activează imediat, iar „${esc(findCa(f.extra.rotate).name)}” rămâne acceptat în perioada de tranziție, ca să nu se întrerupă serviciul (CA-6).`) : ""}${grid(certDrop(f), f.extra.rotate ? sel("until", "Perioada de tranziție", [["7", "7 zile"], ["14", "14 zile"], ["30", "30 de zile"]], { required: true, span: 6, placeholder: false, hint: "Cât timp sunt acceptate ambele certificate." }) : "")}`,
    validate: (f) => {
      const e = {};
      if (!f.v.fileName) e.file = "Alege fișierul certificatului.";
      else if (f.v.parsed?.error) e.file = f.v.parsed.error;
      return e;
    },
    save: (f) => {
      const p = f.v.parsed.cert;
      const id = `ca-${Date.now().toString(36)}`;
      const c = { id, ...p, status: f.extra.rotate ? "Activ" : "Inactiv", rotation: null, usedBy: [], uploadedAt: nowIso(), uploadedBy: me(), events: [event("Certificat înregistrat", `${p.name} · amprentă SHA-256 verificată`)] };
      if (f.extra.rotate) {
        const old = findCa(f.extra.rotate);
        const until = new Date(S.now().getTime() + Number(f.v.until) * 86400000);
        const u = `${until.getFullYear()}-${String(until.getMonth() + 1).padStart(2, "0")}-${String(until.getDate()).padStart(2, "0")}T23:59:00`;
        c.rotation = { role: "new", partner: old.id, startedAt: nowIso(), until: u };
        old.rotation = { role: "old", partner: id, startedAt: nowIso(), until: u };
        c.events.unshift(event("Rotație inițiată", `Înlocuiește „${old.name}”; ambele acceptate până la ${stamp(u)}.`));
        old.events.unshift(event("Rotație inițiată", `Va fi înlocuit de „${c.name}”.`));
      }
      cfg.trustedCas.push(c);
      return () => { caDetail(c.id); toast(f.extra.rotate ? "Ambele certificate sunt acceptate în perioada de tranziție." : "Verifică detaliile, apoi activează certificatul.", f.extra.rotate ? "Rotație începută" : "Certificat înregistrat"); };
    }
  };
  const caActions = {
    "ca-new": () => openForm("ca", "create"),
    "ca-open": (id) => caDetail(id),
    "ca-rotate": (id) => openForm("ca", "create", null, { rotate: id }),
    "ca-finish": (id) => {
      const c = findCa(id); const old = findCa(c.rotation.partner);
      A.askConfirm({ title: "Finalizezi rotația?", text: `„${old.name}” se dezactivează: clienții care se mai autentifică cu certificate emise de el sunt refuzați (${plural(old.usedBy.length, "client", "clienți")} încă îl folosesc).`, confirmLabel: "Finalizează rotația", destructive: true }, () => {
        old.status = "Inactiv"; old.rotation = null; c.rotation = null;
        c.usedBy = [...new Set([...c.usedBy, ...old.usedBy])]; old.usedBy = [];
        old.events.unshift(event("Certificat dezactivat", `Rotație finalizată; înlocuit de „${c.name}”.`));
        c.events.unshift(event("Rotație finalizată", `„${old.name}” a fost dezactivat.`));
        refreshList(); redetail();
        toast(`Doar „${c.name}” mai este acceptat.`, "Rotație finalizată");
      });
    },
    "ca-toggle": (id) => {
      const c = findCa(id);
      const on = c.status === "Activ";
      A.askConfirm({ title: on ? `Dezactivezi ${c.name}?` : `Activezi ${c.name}?`, text: on ? (c.usedBy.length ? `Atenție: clienții care folosesc acest CA (${c.usedBy.map((x) => findClient(x)?.name || x).join(", ")}) nu se mai pot autentifica prin mTLS. Pentru o înlocuire fără întrerupere folosește „Rotește certificatul”.` : "Niciun client nu folosește acest CA.") : "Platforma acceptă din nou certificatele de client emise de acest CA.", confirmLabel: on ? "Dezactivează" : "Activează", destructive: on }, () => {
        c.status = on ? "Inactiv" : "Activ";
        if (on && c.rotation) { const other = findCa(c.rotation.partner); if (other) other.rotation = null; c.rotation = null; }
        c.events.unshift(event(on ? "Certificat dezactivat" : "Certificat activat", ""));
        refreshList(); redetail(); flashRow(id);
        toast(on ? `${c.name} nu mai este acceptat.` : `${c.name} este acceptat pentru mTLS.`, on ? "Certificat dezactivat" : "Certificat activat");
      });
    }
  };

  /* ---- registries + facets ------------------------------------------------------------- */
  const sortBy = (map = {}) => (row, key) => {
    if (map[key]) return map[key](row);
    const v = row[key];
    if (["creat", "updatedAt", "ultimaAutentificare", "verificare", "lansare", "valabilDeLa", "valabilPana"].includes(key)) return v ? Date.parse(v) : 0;
    return v ?? "";
  };
  const registries = {
    "ekyc-users": { renderCell: userCell, searchText: (r) => [r.nume, r.email, ...r.roluri, r.status].join(" "), sortValue: sortBy(), filterToken: tokenFilter, openRow: (id) => userDetail(id),
      exportRows: (rows) => csv("utilizatori.csv", ["Nume", "Email", "Roluri", "Status cont", "Ultima autentificare", "Login-uri eșuate", "Creat la"], rows.map((r) => [r.nume, r.email, r.roluri.join("; "), r.status, r.ultimaAutentificare || "", r.esuate, r.creat]), ["utilizator exportat", "utilizatori exportați"]),
      emptyHtml: listEmpty("ekyc-users", { label: "utilizatorii", emptyTitle: "Nu există utilizatori înregistrați", emptyText: "Conturile apar aici automat, la prima autentificare prin MPass.", icon: "people", noResults: "Niciun utilizator nu corespunde căutării" }) },
    "ekyc-clients": { renderCell: clientCell, searchText: (r) => [r.denumire, r.id, r.organizatie, ...r.cazuri, r.scoring].join(" "), sortValue: sortBy({ clientId: (r) => r.id }), filterToken: tokenFilter, openRow: (id) => clientDetail(id),
      exportRows: (rows) => csv("clienti.csv", ["Denumire", "Client ID", "Organizație", "Cazuri de utilizare", "Config scoring", "Status", "Creat la"], rows.map((r) => [r.denumire, r.id, r.organizatie, r.cazuri.join("; "), r.scoring, r.activ ? "Activ" : "Inactiv", r.creat]), ["client exportat", "clienți exportați"]),
      emptyHtml: listEmpty("ekyc-clients", { label: "clienții", emptyTitle: "Nu există clienți", emptyText: "Adaugă prima aplicație integrată cu platforma eKYC.", cta: () => addBtn("Adaugă client", 'data-ekcfg="client-new"'), noResults: "Niciun client nu corespunde căutării sau filtrelor" }) },
    "ekyc-use-cases": { renderCell: ucCell, searchText: (r) => [r.denumire, r.cod, r.nivel].join(" "), sortValue: sortBy({ versiune: (r) => Number(r.versiune) }), filterToken: tokenFilter, openRow: (id) => ucDetail(id),
      exportRows: (rows) => csv("cazuri-de-utilizare.csv", ["Denumire", "Cod", "Nivel asigurare", "Versiune", "Pași", "Status", "Actualizat la"], rows.map((r) => [r.denumire, r.cod, r.nivel, r.versiune, r.pasi, r.activ ? "Activ" : "Inactiv", r.updatedAt]), ["caz exportat", "cazuri exportate"]),
      emptyHtml: listEmpty("ekyc-use-cases", { label: "cazurile de utilizare", emptyTitle: "Nu există cazuri de utilizare", emptyText: "Adaugă primul flux de verificare.", cta: () => addBtn("Adaugă caz de utilizare", 'data-ekcfg="uc-new"'), icon: "face-id", noResults: "Niciun caz de utilizare nu corespunde căutării" }) },
    "ekyc-parameters": { renderCell: paramCell, searchText: (r) => [r.cheie, r.denumire, r.descriere].join(" "), sortValue: sortBy(), filterToken: tokenFilter, openRow: (id) => openForm("param", "edit", id),
      exportRows: (rows) => csv("parametri.csv", ["Cheie", "Denumire", "Valoare", "Tip date", "Categorie", "Status", "Actualizat la", "Actualizat de"], rows.map((r) => [r.cheie, r.denumire, r.valoare, r.tip, r.categorie, r.activ ? "Activ" : "Inactiv", r.updatedAt, r.updatedBy]), ["parametru exportat", "parametri exportați"]),
      emptyHtml: listEmpty("ekyc-parameters", { label: "parametrii", emptyTitle: "Nu există parametri configurați", emptyText: "Platforma folosește valorile implicite din cod.", cta: () => addBtn("Adaugă parametru", 'data-ekcfg="param-new"'), noResults: "Niciun parametru nu corespunde filtrelor" }) },
    "ekyc-scoring": { renderCell: scoringCell, searchText: (r) => [r.denumire, r.descriere, r.agregare].join(" "), sortValue: sortBy(), filterToken: tokenFilter, openRow: (id) => scoringDetail(id),
      exportRows: (rows) => csv("configurari-scoring.csv", ["Denumire", "Prag acceptare", "Prag respingere", "Scor minim încredere", "Metodă agregare", "Reguli", "Status"], rows.map((r) => [r.denumire, num(r.accept), num(r.reject), num(r.minim), r.agregare, r.reguli, r.activ ? "Activ" : "Inactiv"]), ["configurație exportată", "configurații exportate"]),
      emptyHtml: listEmpty("ekyc-scoring", { label: "configurările de scoring", emptyTitle: "Nu există configurații de scoring", emptyText: "Adaugă prima configurație; apoi atribuie-o clienților.", cta: () => addBtn("Adaugă configurație", 'data-ekcfg="scoring-new"'), icon: "chart", noResults: "Nicio configurație nu corespunde căutării" }) },
    "ekyc-providers": { renderCell: providerCell, searchText: (r) => [r.denumire, r.sistem, r.tip, r.endpoint].join(" "), sortValue: sortBy(), filterToken: tokenFilter, openRow: (id) => providerActions["provider-edit"](id),
      exportRows: (rows) => csv("furnizori.csv", ["Denumire", "Sistem", "Tip", "Endpoint", "Sănătate", "Ultima verificare", "Prioritate", "Status"], rows.map((r) => [r.denumire, r.sistem, r.tip, r.endpoint, r.sanatate, r.verificare, r.prioritate, r.activ ? "Activ" : "Inactiv"]), ["furnizor exportat", "furnizori exportați"]),
      emptyHtml: listEmpty("ekyc-providers", { label: "furnizorii", emptyTitle: "Nu există furnizori configurați", emptyText: "Adaugă sistemele externe care execută pașii de verificare.", cta: () => addBtn("Adaugă furnizor", 'data-ekcfg="provider-new"'), icon: "signal", noResults: "Niciun furnizor nu corespunde căutării sau filtrelor" }) },
    "ekyc-organizations": { renderCell: orgCell, searchText: (r) => [r.denumire, r.idno, r.contact, r.email].join(" "), sortValue: sortBy(), filterToken: tokenFilter, openRow: (id) => openForm("org", "edit", id),
      exportRows: (rows) => csv("organizatii.csv", ["Denumire", "IDNO", "Persoană de contact", "Email", "Telefon", "Status", "Creată la"], rows.map((r) => [r.denumire, r.idno, r.contact, r.email, r.telefon, r.activ ? "Activ" : "Inactiv", r.creat]), ["organizație exportată", "organizații exportate"]),
      emptyHtml: listEmpty("ekyc-organizations", { label: "organizațiile", emptyTitle: "Nu există organizații", emptyText: "Organizațiile grupează clienții (aplicațiile) aceleiași companii sau instituții.", cta: () => addBtn("Adaugă prima organizație", 'data-ekcfg="org-new"'), icon: "business", noResults: "Nicio organizație nu corespunde căutării" }) },
    "ekyc-sdk": { renderCell: sdkCell, searchText: (r) => [r.versiune, r.platforma, r.descriere].join(" "), sortValue: sortBy({ versiune: (r) => semverKey(r.versiune) }), filterToken: tokenFilter, openRow: (id) => openForm("sdk", "edit", id),
      exportRows: (rows) => csv("versiuni-sdk.csv", ["Versiune", "Platformă", "Descriere", "Data lansării", "Recomandată", "Suportată", "URL descărcare"], rows.map((r) => [r.versiune, r.platforma, r.descriere, r.lansare, r.recomandata ? "Da" : "Nu", r.suportata ? "Da" : "Nu", r.descarcare]), ["versiune exportată", "versiuni exportate"]),
      rowClass: (r) => (r.suportata ? "" : "is-inactive"),
      emptyHtml: listEmpty("ekyc-sdk", { label: "versiunile SDK", emptyTitle: "Nu există versiuni SDK publicate", emptyText: "Publică prima versiune pentru iOS, Android sau Web.", cta: () => addBtn("Adaugă versiune", 'data-ekcfg="sdk-new"'), icon: "phone", noResults: "Nicio versiune nu corespunde filtrelor" }) },
    "ekyc-trusted-cas": { renderCell: caCell, searchText: (r) => [r.denumire, r.emitent, r.amprenta, r.c.serial].join(" "), sortValue: sortBy(), filterToken: tokenFilter, openRow: (id) => caDetail(id),
      exportRows: (rows) => csv("certificate-root-ca.csv", ["Certificat", "Emitent", "Amprentă SHA-256", "Valabil de la", "Valabil până la", "Status"], rows.map((r) => [r.denumire, r.emitent, r.amprenta, r.valabilDeLa, r.valabilPana, r.stare]), ["certificat exportat", "certificate exportate"]),
      rowClass: (r) => (r.activ ? "" : "is-inactive"),
      emptyHtml: listEmpty("ekyc-trusted-cas", { label: "certificatele", emptyTitle: "Nu există certificate CA înregistrate", emptyText: "Fără un CA de încredere, niciun client nu se poate autentifica prin mTLS.", cta: () => addBtn("Încarcă certificat", 'data-ekcfg="ca-new"'), icon: "shield-keyhole", noResults: "Niciun certificat nu corespunde căutării" }) }
  };
  const activeFacet = (r) => (r.activ ? "Activ" : "Inactiv");
  const facets = {
    "ekyc-users": [{ key: "roluri", label: "Rol", get: (r) => r.roluri, tone: () => "neutral" }, { key: "status", label: "Status cont", get: (r) => r.status, tone: (v) => ACCOUNT_TONES[v] }, { key: "esuate", label: "Login-uri eșuate", get: (r) => (r.esuate ? "Cu eșecuri" : "Fără eșecuri") }],
    "ekyc-clients": [{ key: "organizatie", label: "Organizație", get: (r) => r.organizatie }, { key: "cazuri", label: "Caz de utilizare", get: (r) => r.cazuri }, { key: "scoring", label: "Config scoring", get: (r) => r.scoring }],
    "ekyc-use-cases": [{ key: "nivel", label: "Nivel asigurare", get: (r) => r.nivel, tone: () => "neutral" }, { key: "pasi", label: "Pași", get: (r) => (r.pasi ? "Cu pași" : "Fără pași (incomplet)") }],
    "ekyc-parameters": [{ key: "categorie", label: "Categorie", get: (r) => r.categorie }, { key: "tip", label: "Tip date", get: (r) => r.tip, tone: () => "neutral" }],
    "ekyc-scoring": [{ key: "agregare", label: "Metodă agregare", get: (r) => r.agregare }, { key: "atribuire", label: "Atribuire", get: (r) => (r.clienti ? "Atribuită clienților" : "Neatribuită") }],
    "ekyc-providers": [{ key: "tip", label: "Tip furnizor", get: (r) => r.tip }, { key: "sanatate", label: "Sănătate", get: (r) => r.sanatate, tone: (v) => HEALTH_TONES[v] }, { key: "sistem", label: "Sistem", get: (r) => r.sistem }],
    "ekyc-organizations": [{ key: "clienti", label: "Clienți", get: (r) => (r.clienti ? "Cu clienți" : "Fără clienți") }, { key: "status", label: "Status", get: activeFacet, tone: (v) => (v === "Activ" ? "success" : "neutral") }],
    "ekyc-sdk": [{ key: "platforma", label: "Platformă", get: (r) => r.platforma }, { key: "recomandata", label: "Recomandată", get: (r) => (r.recomandata ? "Recomandată" : "Nerecomandată") }],
    "ekyc-trusted-cas": [{ key: "emitent", label: "Emitent", get: (r) => r.emitent }, { key: "stare", label: "Status", get: (r) => r.stare, tone: (v) => CA_TONES[v] }]
  };

  /* ---- views + routes -------------------------------------------------------------------- */
  const SHOW = { "ekyc-users": showUsers, "ekyc-clients": showClients, "ekyc-use-cases": showUseCases, "ekyc-parameters": showParameters, "ekyc-scoring": showScoring, "ekyc-providers": showProviders, "ekyc-organizations": showOrganizations, "ekyc-sdk": showSdk, "ekyc-trusted-cas": showCas };
  const DETAIL = { user: userDetail, client: clientDetail, uc: ucDetail, scoring: scoringDetail, ca: caDetail };
  const ACTIONS = { ...userActions, ...clientActions, ...ucActions, ...paramActions, ...scoringActions, ...providerActions, ...orgActions, ...sdkActions, ...caActions };
  const ROUTES = [
    [/^#ek-utilizator\/([^/]+)(?:\/([^/]+))?$/, (m) => userDetail(m[1], m[2] || "general")],
    [/^#ek-client-nou$/, () => { ensureList("ekyc-clients"); openForm("client", "create"); }],
    [/^#ek-client\/([^/]+)\/editeaza$/, (m) => (findClient(m[1]) ? clientActions["client-edit"](m[1]) : notFound("ekyc-clients", m[1], "Clientul"))],
    [/^#ek-client\/([^/]+)(?:\/([^/]+))?$/, (m) => clientDetail(m[1], m[2] || "configuratie")],
    [/^#ek-caz\/([^/]+)(?:\/([^/]+))?$/, (m) => ucDetail(m[1], m[2] || "pasi")],
    [/^#ek-scoring\/([^/]+)(?:\/([^/]+))?$/, (m) => scoringDetail(m[1], m[2] || "reguli")],
    [/^#ek-furnizor-nou$/, () => { ensureList("ekyc-providers"); openForm("provider", "create"); }],
    [/^#ek-furnizor\/([^/]+)\/editeaza$/, (m) => (findProvider(m[1]) ? providerActions["provider-edit"](m[1]) : notFound("ekyc-providers", m[1], "Furnizorul"))],
    [/^#ek-certificat\/([^/]+)(?:\/([^/]+))?$/, (m) => caDetail(m[1], m[2] || "general")]
  ];

  /* ---- events ------------------------------------------------------------------------------ */
  const onClick = (event) => {
    const t = (sel) => event.target.closest(sel);
    let el;
    if ((el = t("[data-workplace-add-product]"))) { const a = ACTIONS[el.dataset.workplaceAddProduct]; if (a) { a(); return; } }
    if ((el = t("[data-ekcfg]"))) {
      const fn = ACTIONS[el.dataset.ekcfg];
      if (!fn || el.getAttribute("aria-disabled") === "true" || el.matches("input[type=checkbox]")) return;
      event.preventDefault();
      if (el.closest("#case-action-modal") && !el.hasAttribute("data-case-close") && !["provider-test", "param-deactivate", "param-delete-confirm"].includes(el.dataset.ekcfg)) S.closeModal();
      fn(el.dataset.id, el);
      return;
    }
    if ((el = t("[data-ekcfg-tab]")) && st.detail) {
      st.detail.tab = el.dataset.ekcfgTab;
      redetail();
      A.els.dosarProfilTabs.querySelector(`[data-ekcfg-tab="${st.detail.tab}"]`)?.focus();
      return;
    }
    if (t("[data-ekcfg-close]")) { closeDrawer(); return; }
    if (t("[data-ekcfg-submit]") && F) { submitForm(); return; }
    if (t("[data-ekcfg-page-cancel]") && F) { const { id, type, mode } = F; leavePage(() => (type === "client" && mode === "edit" ? clientDetail(id) : A.closeProfile())); return; }
    if ((el = t("[data-ekcfg-nav]"))) {
      event.preventDefault();
      const root = el.closest("[data-ekcfg-page]");
      root.querySelectorAll("[data-ekcfg-nav]").forEach((a) => (a === el ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
      spyPausedUntil = Date.now() + 900;
      const target = document.getElementById(`ekcfg-sec-${el.dataset.ekcfgNav}`);
      target?.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      target?.querySelector("h2")?.focus({ preventScroll: true });
      return;
    }
    if (!F) return;
    if ((el = t("[data-ekcfg-item-add]"))) { const k = el.dataset.ekcfgItemAdd; F.v[k] = [...(F.v[k] || []), ""]; redrawForm(`#${fid(`${k}-${F.v[k].length - 1}`)}`); refreshPage(); return; }
    if ((el = t("[data-ekcfg-item-remove]"))) {
      const k = el.dataset.ekcfgItemRemove; const i = Number(el.dataset.index);
      F.v[k] = F.v[k].filter((_, n) => n !== i);
      Object.keys(F.errors).filter((e) => e.startsWith(`${k}.`)).forEach((e) => delete F.errors[e]);
      redrawForm(`[data-ekcfg-item-add="${k}"]`); refreshPage(); return;
    }
    if ((el = t("[data-ekcfg-chip-add]"))) { addChip(el.dataset.ekcfgChipAdd); return; }
    if ((el = t("[data-ekcfg-chip-remove]"))) { const k = el.dataset.ekcfgChipRemove; F.v[k] = F.v[k].filter((x) => x !== el.dataset.value); redrawForm(`#${fid(k)}`); refreshPage(); return; }
    if ((el = t("[data-ekcfg-fb-move]"))) {
      const i = Number(el.dataset.index); const j = el.dataset.ekcfgFbMove === "up" ? i - 1 : i + 1;
      const list = [...F.v.fallbacks]; [list[i], list[j]] = [list[j], list[i]]; F.v.fallbacks = list;
      redrawForm(`[data-ekcfg-fb-move="${el.dataset.ekcfgFbMove}"][data-index="${j}"]:not([disabled]), [data-ekcfg-fb-remove="${j}"]`); return;
    }
    if ((el = t("[data-ekcfg-fb-remove]"))) { F.v.fallbacks = F.v.fallbacks.filter((_, n) => n !== Number(el.dataset.ekcfgFbRemove)); if (!F.v.fallbacks.includes(F.v.provider)) delete F.errors.fallbacks; redrawForm(`#${fid("fallback-add")}`); return; }
    if (t("[data-ekcfg-file-pick]")) { document.getElementById(fid("file"))?.click(); return; }
    if (t("[data-ekcfg-secret-replace]")) { F.v.replaceSecret = true; F.showSecret = false; redrawForm(`#${fid("secret")}`); refreshPage(); return; }
    if (t("[data-ekcfg-secret-cancel]")) { F.v.replaceSecret = false; F.v.secret = ""; delete F.errors.secret; redrawForm("[data-ekcfg-secret-replace]"); refreshPage(); return; }
    if (t("[data-ekcfg-secret-show]")) { F.showSecret = !F.showSecret; redrawForm("[data-ekcfg-secret-show]"); return; }
    if ((el = t("[data-ekcfg-test-form]"))) {
      const p = F.mode === "edit" ? findProvider(F.id) : null;
      if (el.closest("#case-action-modal")) S.closeModal();
      const button = document.querySelector("[data-ekcfg-page] [data-ekcfg-test-form]") || el;
      runTest({ provider: p && !F.v.replaceSecret ? p : null, endpoint: F.v.endpoint.trim(), source: F.mode === "create" || F.v.replaceSecret ? "form" : F.v.endpoint.trim() === p.endpoint ? "saved" : "mixed", button });
    }
  };
  const addChip = (k) => {
    const input = document.getElementById(fid(k));
    const value = input?.value.trim();
    if (!value) return;
    if (!/^[a-z][a-z0-9._:-]{1,40}$/i.test(value)) { F.errors[k] = "Un scope are 2–40 de caractere: litere, cifre, „.”, „_”, „:” sau „-”, fără spații."; redrawForm(`#${fid(k)}`); refreshPage(); return; }
    if (!F.v[k].includes(value)) F.v[k] = [...F.v[k], value];
    delete F.errors[k];
    redrawForm(`#${fid(k)}`); refreshPage();
  };
  const onInput = (event) => {
    if (!F) return;
    const el = event.target;
    if (el.matches?.("[data-ekcfg-field]")) {
      const k = el.dataset.ekcfgField;
      F.v[k] = el.type === "checkbox" ? el.checked : el.value;
      const count = document.querySelector(`[data-ekcfg-count="${CSS.escape(k)}"]`);
      if (count) count.textContent = `${el.value.length}/${el.maxLength}`;
      if (F.type === "scoring" && ["reject", "accept", "minConfidence"].includes(k)) { liveThresholds(); return; }
      clearError(k, el);
      if (event.type === "change" && F.type === "param" && k === "type") { F.v.value = F.v.type === "boolean" ? false : ""; delete F.errors.value; redrawForm(`#${fid("type")}`); }
      if (event.type === "change" && F.type === "param" && k === "value" && F.v.type === "boolean") { const label = el.closest(".e-permits-toggle")?.querySelector(".e-permits-toggle__label"); if (label) label.textContent = el.checked ? "Da" : "Nu"; }
      if (event.type === "change" && F.type === "step" && k === "provider") {
        if (F.v.fallbacks.includes(F.v.provider)) F.errors.fallbacks = `Furnizorul principal nu poate fi și de rezervă. Elimină „${providerName(F.v.provider)}” din rezervă sau alege alt furnizor principal.`;
        else delete F.errors.fallbacks;
        redrawForm(`#${fid("provider")}`);
      }
      if (F.where === "page") refreshPage();
      return;
    }
    if (el.matches?.("[data-ekcfg-item]")) { const k = el.dataset.ekcfgItem; const i = Number(el.dataset.index); F.v[k][i] = el.value; clearError(`${k}.${i}`, el); if (F.where === "page") refreshPage(); return; }
    if (el.matches?.("[data-ekcfg-check]")) {
      const k = el.dataset.ekcfgCheck;
      const set = new Set(F.v[k] || []);
      if (el.checked) set.add(el.value); else set.delete(el.value);
      F.v[k] = [...set];
      clearError(k, el); if (F.where === "page") refreshPage();
      return;
    }
    if (el.matches?.("[data-ekcfg-fb-add]") && event.type === "change" && el.value) { F.v.fallbacks = [...F.v.fallbacks, el.value]; redrawForm(`#${fid("fallback-add")}`); return; }
    if (el.matches?.("[data-ekcfg-chip-input]")) { clearError(el.dataset.ekcfgChipInput, el); return; }
    if (el.matches?.("[data-ekcfg-file]") && event.type === "change" && el.files?.[0]) {
      const file = el.files[0];
      F.v.fileName = file.name;
      F.v.parsed = parseCert(file);
      F.errors = F.v.parsed.error ? { file: `${F.v.parsed.error}` } : {};
      redrawForm(F.v.parsed.error ? "[data-ekcfg-file-pick]" : "[data-ekcfg-submit]");
    }
  };
  /* steps: drag & drop rows (the arrows are the keyboard fallback) */
  let dragFrom = -1;
  const onDrag = (event) => {
    const row = event.target.closest?.("[data-ekcfg-step]");
    if (event.type === "dragstart" && row) { dragFrom = Number(row.dataset.index); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", row.dataset.ekcfgStep); row.classList.add("is-dragging"); return; }
    if (event.type === "dragover" && row && dragFrom >= 0) { event.preventDefault(); document.querySelectorAll("[data-ekcfg-step].is-drop-target").forEach((r) => r.classList.remove("is-drop-target")); row.classList.add("is-drop-target"); return; }
    if (event.type === "drop" && row && dragFrom >= 0) { event.preventDefault(); const to = Number(row.dataset.index); const u = findUc(st.detail.id); const from = dragFrom; dragFrom = -1; moveStep(u, from, to); return; }
    if (event.type === "dragend") { dragFrom = -1; document.querySelectorAll("[data-ekcfg-step].is-dragging, [data-ekcfg-step].is-drop-target").forEach((r) => r.classList.remove("is-dragging", "is-drop-target")); }
  };

  P.extend({
    views: Object.keys(VIEWS),
    registries,
    facets,
    load: async () => {
      try {
        const response = await fetch("data/ekyc-config.json", { cache: "no-store" });
        if (!response.ok) throw new Error(`eKYC config: ${response.status}`);
        cfg = await response.json();
        /* the seed carries no content per version: each starts from the current flow, so
           „Restaurează” works on every row of the history */
        cfg.useCases.forEach((u) => u.versions.forEach((v) => { v.snapshot = { steps: clone(u.steps), veto: clone(u.veto) }; }));
      } catch (error) {
        console.warn(error);
        loadFailed = true;
        cfg = { organizations: [], clients: [], useCases: [], providers: [], scoring: [], parameters: [], sdk: [], trustedCas: [], users: [] };
      }
    },
    init: () => {
      A = S.api;
      ensureDrawer();
      document.addEventListener("click", onClick);
      document.addEventListener("input", onInput);
      document.addEventListener("change", onInput);
      document.addEventListener("keydown", (event) => {
        const chip = event.target.closest?.("[data-ekcfg-chip-input]");
        if (chip && event.key === "Enter") { event.preventDefault(); addChip(chip.dataset.ekcfgChipInput); return; }
        if (event.key === "Escape" && drawer && !drawer.hidden && F) {
          if (document.querySelector("body > .e-permits-fo-select__list:not([hidden]), .date-picker-panel:not([hidden]), .modal-overlay.is-active")) return;
          event.preventDefault(); closeDrawer();
        }
      });
      ["dragstart", "dragover", "drop", "dragend"].forEach((type) => document.addEventListener(type, onDrag));
      /* the release date picker writes ISO into data-selected */
      document.addEventListener("date-picker:change", (event) => { const host = event.target.closest?.("[data-ekcfg-date]"); if (host && F) F.v[host.dataset.ekcfgDate] = host.dataset.selected || ""; });
      new MutationObserver(() => {
        const host = drawer.querySelector("[data-ekcfg-date]");
        if (host && F && host.dataset.selected !== undefined && host.dataset.selected !== F.v[host.dataset.ekcfgDate]) F.v[host.dataset.ekcfgDate] = host.dataset.selected;
      }).observe(drawer, { subtree: true, attributes: true, attributeFilter: ["data-selected"] });
      A.els.dosarProfilTabs?.addEventListener("keydown", (event) => {
        if (!st.detail || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        const tabs = [...A.els.dosarProfilTabs.querySelectorAll("[data-ekcfg-tab]")];
        if (!tabs.length) return;
        const i = tabs.findIndex((x) => x.dataset.ekcfgTab === st.detail.tab);
        const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (i + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
        tabs[next].click();
      });
      /* a back / crumb out of a page form with a draft asks first */
      document.addEventListener("click", (event) => {
        if (!F || F.where !== "page" || !changedCount()) return;
        const out = event.target.closest("[data-dosar-profil-crumb-back], [data-dosar-profil-back-shell], .e-permits-shell__nav-item, [data-nav-id]");
        if (!out || out.closest("[data-ekcfg-page]")) return;
        event.preventDefault(); event.stopImmediatePropagation();
        leavePage(() => out.click());
      }, true);
      new MutationObserver(() => { if (F?.where === "page" && !document.querySelector("[data-ekcfg-page]")) F = null; }).observe(A.els.dosarProfilPanelBody, { childList: true });
    },
    showView: (view) => {
      st.detail = null;
      if (F?.where === "page") F = null;
      if (!cfg) return;
      SHOW[view]();
    },
    route: (hash) => {
      if (!cfg) return false;
      for (const [re, fn] of ROUTES) { const m = hash.match(re); if (m) { fn(m.map((x) => (x ? decodeURIComponent(x) : x))); return true; } }
      return false;
    },
    beforeNavigate: () => { st.detail = null; if (F?.where === "page") F = null; }
  });
})();
