/* =====================================================================================
   Administrare › Calendar — „Calendar zile nelucrătoare” (calendar-v1, 2026-10-26)
   Feature 93686 „Gestionarea calendarului”: US-283 list · US-284 add · US-285 edit · US-286 delete · US-287 national
   holidays · US-288 deadline recalculation. The data and the rules live in js/working-days.js (window.GEAPWorkingDays,
   the ONE engine the dossier deadlines and the distribution read); this file is only the screens.

   No new component. It plugs into the BO shell like js/registre.js:
     · window.GEAPShellRegistries.calendar — the BO registry engine (search „după dată sau motiv”, Filtre: Tip eveniment ·
       Domeniu de aplicare · Sursă, sort, pager, export CSV); the YEAR filter = the status tabs (current year −1 … +2,
       US-283 AC-03); the menu item `shellView: "calendar-registry"` (data/e-permits-roles.json);
     · window.GEAPShellRoutes — #calendar; a role without the right gets „Nu aveți permisiunea…” (AC-01);
     · the library dialog #case-action-modal through window.GEAPRegistre.openModal (add / edit / delete / generate /
       recalculation preview / journal), the case-dialog form markup (.e-permits-case-form + FO field shell + library
       date picker + fo-select), toasts, the event timeline.
   Page glue (description under the title, the two toolbar tools) in css/calendar.css.

   Decisions (user, 2026-10-26; PO questions stay open — plan „calendar-absences-plan.md”):
     · absences are NOT calendar events: no „Utilizator” column, no absence types (US-283 AC-06/08/13, US-284 AC-14…17
       → the user profile „Absențe”, US-312…316);
     · the table is the default view; a „Calendar” view (year → month → day) is a user-approved PROPOSAL beyond the
       stories (calendar-views-v1, 2026-10-26 — Feature 93686 lists a month grid as „out of scope”);
     · a change that moves deadlines shows a PREVIEW first (how many active dossiers get another deadline + examples),
       then the toast and a journal entry (the Feature says the preview is out of scope — PO question 5);
     · deadlines read in working days („3 zile lucrătoare rămase”, shell renderTermen).
   Permissions (demo roles): Administrator central = view + edit; Administrator local = view only (no buttons, no ⋮,
   export kept — AC-09/10); any other role = „Nu aveți permisiunea de a accesa această pagină.”.
   Demo switches: ?calendar=eroare (every write fails: „Operația nu a putut fi efectuată”, AC-12) ·
   ?calendar=autoritate (the chosen authority was removed meanwhile, US-284 AC-10).
   ===================================================================================== */
(function () {
  "use strict";

  const KIND = "calendar";
  const NAV = "calendar";
  const TITLE = "Calendar zile nelucrătoare";
  const DESCRIPTION = "Excepții de la regula „luni-vineri lucrătoare”: sărbători legale și zile transferate. Termenele de examinare se calculează după acest calendar.";
  const DENIED = "Nu aveți permisiunea de a accesa această pagină.";
  const FAILED = "Operația nu a putut fi efectuată";
  const REASON_MAX = 200;
  /* the clock of these dossiers is running or paused (US-288 AC-01); schiță / semnat / final have none */
  const ACTIVE = ["depus", "asteaptaPlata", "inExaminare", "spreCoordonare", "spreSemnare"];
  const CASE_AUTHORITY = "ANSP";
  const TYPES = { nelucratoare: "Zi nelucrătoare", lucratoare: "Zi lucrătoare" };
  const TYPE_TONE = { nelucratoare: "neutral", lucratoare: "brand" };
  /* calendar-views-v2: colour is never the only signal — each event type has its sprite icon (list tag, calendar chips,
     popover); the absent counter keeps `people` */
  const TYPE_ICON = { nelucratoare: "calendar-remove", lucratoare: "reschedule" };
  const NATIONAL = "Toată țara";

  const params = new URLSearchParams(window.location.search);
  const demo = params.get("calendar") || "";
  const WD = () => window.GEAPWorkingDays;
  const A = () => window.GEAPShellApi || {};
  const U = () => window.GEAPUi || {};
  const G = () => window.GEAPRegistre || {};
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (name, cls = "icon") => `<svg class="${cls}" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${name}"></use></svg>`;
  const pad = (n) => String(n).padStart(2, "0");
  const RO_MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
  const RO_DAYS = ["duminică", "luni", "marți", "miercuri", "joi", "vineri", "sâmbătă"];
  const toDate = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || "")); return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12) : null; };
  const longDate = (v) => { const d = toDate(v); return d ? `${d.getDate()} ${RO_MONTHS[d.getMonth()]} ${d.getFullYear()}` : ""; };
  const weekday = (v) => { const d = toDate(v); return d ? RO_DAYS[d.getDay()] : ""; };
  const dotted = (v) => { const d = toDate(v); return d ? `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}` : ""; };
  const slashed = (v) => { const d = toDate(v); return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : ""; };
  const nowIso = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
  /* Romanian counts: 1 dosar · 2–19 dosare · 20+ de dosare */
  const plural = (n, one, many) => `${n} ${n === 1 ? one : n % 100 >= 20 || (n % 100 === 0 && n) ? `de ${many}` : many}`;
  const tag = (label, tone = "neutral", iconName = "") => window.GEAPTag?.html(label, tone, iconName ? { icon: iconName } : undefined) || esc(label);
  const userName = () => A().currentUserName?.() || "Anastasia Cojocaru";
  const currentYear = () => Number(todayIso().slice(0, 4)); /* todayIso: the real date or ?today= (calendar-views-v3) */
  /* US-283 AC-03: the year filter = current year − 1 … + 2 */
  const years = () => [currentYear() - 1, currentYear(), currentYear() + 1, currentYear() + 2];

  /* ---------------------------------------------------------------- who is looking */
  const PERMS = { "central-admin": ["view", "edit"], "local-admin": ["view"] };
  function persona() {
    const a = A().currentAssignment?.() || null;
    const roleId = a?.roleId || "";
    return { roleId, roleLabel: a?.roleLabel || "", can: (perm) => (PERMS[roleId] || []).includes(perm) };
  }
  const canView = () => persona().can("view");
  const canEdit = () => persona().can("edit");

  /* ---------------------------------------------------------------- authorities (Domeniu de aplicare) */
  /* the active authorities of the services catalogue (data/e-permits-services.json › authorities, RSSP) */
  const authorities = () => (A().servicesStore?.()?.authorities || []).filter((a) => a.active !== false);
  const authorityName = (code) => (code ? authorities().find((a) => a.code === code)?.name || code : NATIONAL);

  /* ---------------------------------------------------------------- rows */
  const rowOf = (day) => ({
    id: day.id, date: day.date, year: Number(day.date.slice(0, 4)), type: day.type, reason: day.reason,
    authority: day.authority || null, domain: authorityName(day.authority), source: day.source, day
  });
  const rows = () => (WD()?.days() || []).map(rowOf);
  const dayOf = (id) => WD()?.days({ includeDeleted: true }).find((d) => d.id === id) || null;
  /* the facet „Domeniu de aplicare”: a national day counts for every authority that has no own day on that date
     (the authority's day wins, US-283 § Assumptions) — so picking an authority shows its calendar */
  function domainsOf(row) {
    if (row.authority) return [row.domain];
    const own = new Set((WD()?.days() || []).filter((d) => d.authority && d.date === row.date).map((d) => d.authority));
    return [NATIONAL, ...authorities().filter((a) => !own.has(a.code)).map((a) => a.name)];
  }

  /* ---------------------------------------------------------------- the registry */
  const activeYear = () => {
    const st = A().workplaceState;
    const tab = st?.tabKey || `y${currentYear()}`;
    return Number(String(tab).replace(/^y/, "")) || currentYear();
  };
  function registryDb() {
    const edit = canEdit();
    const tabs = years().map((y) => ({ id: `y${y}`, label: String(y), filter: `year:${y}` }));
    return {
      kind: KIND,
      fixedWidths: true,
      fieldCount: 5,
      defaultSort: "data",
      defaultSortDirection: "asc",
      columns: {
        data: { label: "Data", width: 184, sortable: true },
        tip: { label: "Tip eveniment", width: 168, sortable: true },
        motiv: { label: "Motiv", width: 320, sortable: true, fill: true },
        domeniu: { label: "Domeniu de aplicare", width: 232, sortable: true, fill: true },
        sursa: { label: "Sursă", width: 120, sortable: true },
        ...(edit ? { actiuni: { label: "", width: 56, pin: "end" } } : {})
      },
      views: {
        [KIND]: {
          title: TITLE,
          selectable: false,
          searchPlaceholder: "Căutare după dată sau motiv",
          columns: ["data", "tip", "motiv", "domeniu", "sursa", ...(edit ? ["actiuni"] : [])],
          tabs,
          defaultTab: `y${currentYear()}`,
          primaryAction: edit ? { id: "cal-add", label: "Adaugă zi" } : null,
          toolbarLabel: "Filtrare calendar",
          exportLabel: "Exportă CSV"
        }
      },
      runtimeRows: canView() ? rows() : []
    };
  }
  const SORT = { data: (r) => r.date, tip: (r) => TYPES[r.type], motiv: (r) => r.reason, domeniu: (r) => (r.authority ? r.domain : ""), sursa: (r) => r.source };
  const rowMenu = (row) => {
    const html = U().renderRowActions?.({
      menu: [
        { label: "Editează", attrs: `data-cal-action="edit" data-cal-id="${esc(row.id)}"` },
        { label: "Șterge", danger: true, attrs: `data-cal-action="delete" data-cal-id="${esc(row.id)}"` }
      ],
      label: longDate(row.date)
    }) || "";
    return html ? `<span class="e-permits-workplace__row-actions">${html.replace("hidden data-stack-menu>", "hidden data-stack-menu data-stack-menu-fixed>")}</span>` : "";
  };
  window.GEAPShellRegistries = window.GEAPShellRegistries || {};
  window.GEAPShellRegistries[KIND] = {
    build: registryDb,
    get facets() {
      return [
        { key: "tip", label: "Tip eveniment", get: (row) => TYPES[row.type] },
        { key: "domeniu", label: "Domeniu de aplicare", search: true, get: domainsOf },
        { key: "sursa", label: "Sursă", get: (row) => row.source }
      ];
    },
    /* AC-05: by date (8 iulie 2026 · 08.07.2026 · 08/07/2026 · the weekday) or by reason */
    searchText: (row) => [longDate(row.date), dotted(row.date), slashed(row.date), weekday(row.date), row.reason].join(" "),
    sortValue: (row, key) => String(SORT[key]?.(row) ?? ""),
    filterToken: (row, token) => (token.startsWith("year:") ? row.year === Number(token.slice(5)) : true),
    renderCell: (row, key) => {
      switch (key) {
        /* AC-07: the date with its weekday under it */
        case "data": return `
          <span class="e-permits-workplace__date-stack">
            <span>${esc(longDate(row.date))}</span>
            <span class="e-permits-workplace__date-meta">${esc(weekday(row.date))}</span>
          </span>`;
        case "tip": return tag(TYPES[row.type], TYPE_TONE[row.type], TYPE_ICON[row.type]);
        case "motiv": return `<span data-cell-tooltip="${esc(row.reason)}">${esc(row.reason)}</span>`;
        case "domeniu": return `<span data-cell-tooltip="${esc(row.domain)}">${esc(row.domain)}</span>`;
        case "sursa": return esc(row.source);
        case "actiuni": return canEdit() ? rowMenu(row) : "";
        default: return "";
      }
    },
    openRow: (id) => { if (canEdit()) openForm(dayOf(id)); },
    rowLabel: (row) => (canEdit() ? `${longDate(row.date)}, ${TYPES[row.type]}, ${row.reason} — editează ziua` : ""),
    emptyHtml: ({ query, filtered }) => {
      const E = window.GEAPEmptyState;
      if (!canView()) return E?.render({ title: DENIED, icon: "lock", bare: true });
      if (query || filtered) return E?.noResults?.("Nicio zi nu corespunde căutării sau filtrelor", { text: "Caută după dată (de exemplu 27.08.2026) sau după motiv.", bare: true });
      /* AC-11 */
      return E?.render({
        title: "Nu există zile în calendar pentru anul selectat",
        text: canEdit() ? `Adaugă sărbătorile legale ale anului ${activeYear()} cu „Generează anul”, apoi zilele transferate cu „Adaugă zi”.` : "Zilele se adaugă de Administratorul central.",
        icon: "calendar",
        bare: true,
        actionHtml: canEdit() ? `<button class="btn btn-primary btn-sm" type="button" data-cal-generate>${icon("calendar-add")}<span>Generează anul</span></button>` : ""
      });
    },
    exportRows: (list) => openExport(list),
    exportState: () => (canView() ? {} : { hidden: true })
  };

  /* the open list redrawn in place (rows rebuilt; search, filters, tab and page kept) */
  function refreshList() {
    const reg = document.querySelector(`[data-workplace][data-registry-kind="${KIND}"]`);
    const st = A().workplaceState;
    if (!reg || !st || reg.closest("[hidden]") || reg.hidden) return;
    st.rows = registryDb().runtimeRows;
    A().renderWorkplace?.();
    syncChrome();
  }

  /* ---------------------------------------------------------------- page chrome: description + toolbar tools */
  /* the description (AC-02) and the result note of the last change sit above the toolbar; „Jurnal” and
     „Generează anul” sit before the shell's primary „Adaugă zi”. Both are shown only on this registry (css). */
  const note = { html: "" };
  function ensureChrome() {
    const reg = document.querySelector("[data-workplace]");
    if (!reg) return;
    if (!reg.querySelector("[data-cal-intro]")) {
      reg.insertAdjacentHTML("afterbegin", '<div class="e-permits-cal-intro" data-cal-intro><p class="e-permits-cal-intro__text"></p><div class="e-permits-cal-intro__notes" data-cal-intro-notes></div></div>');
      reg.querySelector(".e-permits-cal-intro__text").textContent = DESCRIPTION;
    }
    const primary = reg.querySelector("[data-workplace-add-product]");
    if (primary && !reg.querySelector("[data-cal-tool]")) {
      primary.insertAdjacentHTML("beforebegin", `
        <button class="btn btn-neutral btn-sm btn-icon-only e-permits-cal-tool" type="button" aria-label="Jurnalul calendarului" data-cal-tool data-cal-journal>${icon("history")}</button>
        <button class="btn btn-neutral btn-sm e-permits-workplace__primary-action e-permits-cal-tool" type="button" data-cal-tool data-cal-generate>${icon("calendar-add")}<span>Generează anul</span></button>`);
    }
    /* calendar-views-v1: „Listă / Calendar” before the table tools (shown only on this registry, css/view-switch.css) */
    const tools = reg.querySelector(".e-permits-workplace__table-tools");
    if (tools && !reg.querySelector(`[data-view-switch="${KIND}"]`) && window.GEAPViewSwitch) {
      tools.insertAdjacentHTML("beforebegin", window.GEAPViewSwitch.html({ key: KIND, label: "Mod de afișare a calendarului", value: CV.mode, items: [["list", "Listă", "list-bullets"], ["calendar", "Calendar", "calendar"]], className: "e-permits-cal-switch" }));
    }
  }
  function syncChrome() {
    ensureChrome();
    const reg = document.querySelector("[data-workplace]");
    if (!reg) return;
    reg.querySelectorAll("[data-cal-generate].e-permits-cal-tool").forEach((b) => { b.hidden = !canEdit(); });
    reg.querySelectorAll("[data-cal-journal]").forEach((b) => { b.hidden = !canView(); });
    const notes = reg.querySelector("[data-cal-intro-notes]");
    if (notes) {
      const readOnly = canView() && !canEdit()
        ? U().renderNotice?.("info", "<strong>Doar consultare.</strong> Zilele se adaugă, se modifică și se șterg de Administratorul central.", { icon: "lock" }) || ""
        : "";
      notes.innerHTML = `${readOnly}${note.html}`;
      notes.hidden = !notes.innerHTML.trim();
    }
    const sw = reg.querySelector(`[data-view-switch="${KIND}"]`);
    if (sw) { sw.hidden = !canView(); window.GEAPViewSwitch?.set(sw, CV.mode); }
    if (reg.dataset.registryKind === KIND) {
      reg.dataset.calView = canView() ? CV.mode : "list";
      if (CV.mode === "calendar" && canView()) renderBoard();
    }
  }
  /* the registry draws itself through the shell: keep the chrome in step with every render */
  const observeRegistry = () => {
    const reg = document.querySelector("[data-workplace]");
    if (!reg || reg.dataset.calObserved) return;
    reg.dataset.calObserved = "1";
    new MutationObserver(() => { if (reg.dataset.registryKind === KIND) syncChrome(); }).observe(reg, { attributes: true, attributeFilter: ["data-registry-kind"] });
    /* every list redraw (tab, search, Filtre, a saved day) redraws the calendar view from the same rows */
    const tbody = reg.querySelector("[data-workplace-rows]");
    if (tbody) new MutationObserver(() => { if (reg.dataset.registryKind === KIND && CV.mode === "calendar") renderBoard(); }).observe(tbody, { childList: true });
  };

  /* ---------------------------------------------------------------- the library dialog */
  const openModal = (opts) => G().openModal?.({ ...opts, kind: `cal ${opts.kind ? `e-permits-reg-modal--cal-${opts.kind}` : ""}`.trim() });
  const closeModal = () => G().closeModal?.();
  const footer = (buttons) => `<div class="modal-buttons">${buttons.join("")}</div>`;
  const cancelBtn = (label = "Anulează", attrs = "data-case-close") => `<button class="btn btn-neutral btn-rounded" type="button" ${attrs}>${esc(label)}</button>`;
  const okBtn = (label, attrs, { destructive = false, iconName = "" } = {}) => `<button class="btn ${destructive ? "btn-destructive" : "btn-primary"} btn-rounded" type="button" ${attrs}>${iconName ? icon(iconName) : ""}<span>${esc(label)}</span></button>`;
  const failToast = (message = FAILED) => (window.GEAPToast?.show
    ? window.GEAPToast.show({ type: "error", message, duration: 0, key: "cal-failed" })
    : U().showShellToast?.(message, "error"));
  const fails = () => demo === "eroare";

  /* ---------------------------------------------------------------- US-288: recalculation */
  const activeCases = () => (A().dossierStore?.()?.runtimeRows || []).filter((r) => ACTIVE.includes(r.status) && r.dataDepunerii && Number.isFinite(r.termenZile));
  /* what a candidate calendar does to the active deadlines (preview) */
  function impactOf(candidateDays) {
    const engine = WD().create(candidateDays);
    const cases = activeCases();
    const changed = cases.map((row) => ({ row, before: row.termenExaminare, after: engine.addWorkingDays(row.dataDepunerii, row.termenZile, CASE_AUTHORITY) }))
      .filter((x) => x.after !== x.before)
      .sort((a, b) => a.before.localeCompare(b.before));
    return { total: cases.length, changed };
  }
  /* every active dossier gets its deadline from the calendar in force (AC-01/02/06) */
  function recalculate() {
    const cases = activeCases();
    let changed = 0;
    cases.forEach((row) => {
      const next = WD().addWorkingDays(row.dataDepunerii, row.termenZile, CASE_AUTHORITY);
      if (next !== row.termenExaminare) { row.termenExaminare = next; row.profil = null; changed += 1; }
    });
    const dossiers = document.querySelector("[data-workplace]:not([data-registry-kind]), [data-workplace][data-registry-kind='dossiers']");
    if (dossiers && !dossiers.closest("[hidden]") && !dossiers.hidden) A().renderWorkplace?.();
    return { total: cases.length, changed };
  }
  const recalcSentence = ({ total, changed }) => `Termenele ${total === 1 ? "unui dosar activ au" : `a ${plural(total, "dosar activ", "dosare active")} au`} fost recalculate: ${changed === 0 ? "niciunul nu s-a schimbat" : changed === 1 ? "unul s-a schimbat" : `${changed} s-au schimbat`}.`;
  const candidateWith = (day) => {
    const list = WD().days({ includeDeleted: true }).filter((d) => d.id !== day.id);
    return [...list, day];
  };
  /* the preview table: up to 5 dossiers, current → new deadline (the plain card table of the BO) */
  const previewHtml = (impact) => {
    const sample = impact.changed.slice(0, 5);
    if (!sample.length) return "";
    return `
      <div class="e-permits-workplace__table-wrap e-permits-reg-table e-permits-cal-table">
        <table class="e-permits-workplace__table e-permits-reg-table__table">
          <caption class="u-visually-hidden">Dosare care își schimbă termenul de examinare</caption>
          <thead><tr><th scope="col">Dosar</th><th scope="col">Termen actual</th><th scope="col">Termen nou</th></tr></thead>
          <tbody>${sample.map((x) => `<tr><td>${A().renderListCode?.(x.row.nrDosar) || esc(x.row.nrDosar)}</td><td>${esc(longDate(x.before))}</td><td>${esc(longDate(x.after))}</td></tr>`).join("")}</tbody>
        </table>
      </div>
      ${impact.changed.length > sample.length ? `<p class="e-permits-case-form__lead">Și încă ${esc(plural(impact.changed.length - sample.length, "dosar", "dosare"))}.</p>` : ""}`;
  };
  const impactLead = (impact) => `${impact.changed.length === 1 ? "Un dosar activ își schimbă" : `${plural(impact.changed.length, "dosar activ își schimbă", "dosare active își schimbă")}`} termenul de examinare. Termenele tuturor celor ${esc(plural(impact.total, "dosar", "dosare"))} cu ceasul pornit sau în pauză se recalculează după calendarul nou.`;
  /* after a change: toast + journal entry + the result note above the list */
  function finish({ toast, entry, impact }) {
    const result = impact ? recalculate() : null;
    WD().log({ at: nowIso(), user: userName(), role: persona().roleLabel || "Administrator central", status: "Reușit", ...entry, detail: `${entry.detail}${result ? ` ${recalcSentence(result)}` : ""}` });
    if (result) {
      WD().log({ at: nowIso(), user: "SIA GEAP", role: "Sistem", type: "Recalculare termene", status: "Reușit", detail: `După „${entry.type}”: ${plural(result.total, "dosar activ", "dosare active")}, ${plural(result.changed, "termen modificat", "termene modificate")}.` });
      note.html = U().renderNotice?.("success", `<strong>${esc(recalcSentence(result))}</strong> <button class="link link-primary link-sm e-permits-cal-intro__link" type="button" data-cal-journal>Vezi jurnalul</button>`) || "";
    }
    closeModal();
    U().showShellToast?.(`${toast}${result && result.changed ? ` ${result.changed === 1 ? "Un termen de examinare s-a schimbat." : `${plural(result.changed, "termen de examinare s-a schimbat", "termene de examinare s-au schimbat")}.`}` : ""}`, "success");
    refreshList();
  }

  /* ---------------------------------------------------------------- US-284 / US-285: the day form */
  const F = { mode: "add", id: null, original: null, values: {}, errors: {}, step: "form", pending: null };
  const fieldError = (key) => (F.errors[key] ? `
    <span class="message message--inline message--error e-permits-fo-field__error">
      <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-error-filled"></use></svg>
      <span>${esc(F.errors[key])}</span>
    </span>` : "");
  const req = () => U().requiredMark?.() || "";
  /* the library date picker in the full-flow field shell (components.md „Date field in app forms”) */
  const dateField = (key, label, { span = 6 } = {}) => {
    const iso = F.values[key] || "";
    const today = new Date();
    const viewIso = iso || `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const id = `cal-${key}`;
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
        <label for="${id}">${esc(label)}${req()}</label>
        <div class="date-picker__field" data-date-picker data-type="default" data-locale="ro" data-selected="${esc(iso)}" data-today="${esc(viewIso.slice(0, 10))}" data-year="${Number(viewIso.slice(0, 4))}" data-month="${Number(viewIso.slice(5, 7)) - 1}" data-cal-date="${key}">
          <div class="e-permits-fo-input e-permits-fo-input--with-action${F.errors[key] ? " is-error" : ""}">
            <input id="${id}" type="text" class="js-date-picker-input" value="${esc(slashed(iso))}" placeholder="ZZ/LL/AAAA" autocomplete="off" aria-required="true">
            <button type="button" class="e-permits-fo-input__icon-button js-date-picker-toggle" aria-label="Alege data" aria-controls="${id}-panel" aria-expanded="false">
              <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-calendar"></use></svg>
            </button>
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
        </div>
        ${fieldError(key)}
      </div>`;
  };
  const selectField = (key, label, options, { required = false, placeholder = "", hint = "", span = 6 } = {}) => `
    <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
      <label for="cal-${key}">${esc(label)}${required ? req() : ""}</label>
      ${U().renderFoSelectControl?.({
        id: `cal-${key}`, attrs: `data-cal-select="${key}"`, error: Boolean(F.errors[key]),
        optionsHtml: `${placeholder ? `<option value=""${F.values[key] ? "" : " selected"}${required ? " disabled" : ""}>${esc(placeholder)}</option>` : ""}${options.map(([value, text]) => `<option value="${esc(value)}"${value === F.values[key] ? " selected" : ""}>${esc(text)}</option>`).join("")}`
      }) || ""}
      ${fieldError(key)}
      ${hint && !F.errors[key] ? `<p class="e-permits-fo-field__hint">${esc(hint)}</p>` : ""}
    </div>`;
  const reasonField = () => {
    const value = F.values.reason || "";
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
        <label for="cal-reason">Motiv${req()}</label>
        <div class="e-permits-fo-textarea${F.errors.reason ? " is-error" : ""}">
          <textarea id="cal-reason" rows="3" data-cal-field="reason" aria-required="true">${esc(value)}</textarea>
        </div>
        ${fieldError("reason")}
        <p class="e-permits-fo-field__hint">De exemplu: Paștele, transfer de pe 12.05 · <span data-cal-count>${value.length}</span>/${REASON_MAX}</p>
      </div>`;
  };
  function formBody() {
    const generated = F.mode === "edit" && F.original?.source === "Generat";
    return `
      <div class="e-permits-case-form" data-cal-form>
        ${generated ? U().renderInfoNote?.("Ziua a fost generată automat. După salvare, sursa ei devine „Manual”.") || "" : ""}
        <div class="e-permits-user-create__grid">
          ${dateField("date", "Data")}
          ${selectField("type", "Tip eveniment", Object.entries(TYPES), { required: true, placeholder: "Alege tipul" })}
          ${selectField("authority", "Domeniu de aplicare", authorities().map((a) => [a.code, a.name]), { placeholder: NATIONAL, hint: "Lăsați gol pentru o zi valabilă în toată țara sau alegeți autoritatea pentru care se aplică.", span: 12 })}
          ${reasonField()}
        </div>
      </div>`;
  }
  function renderForm({ focus = "" } = {}) {
    F.step = "form";
    const edit = F.mode === "edit";
    openModal({
      kind: "form",
      title: edit ? "Editare zi" : "Adaugă zi",
      subtitle: edit && F.original ? `${longDate(F.original.date)}, ${weekday(F.original.date)}` : "",
      body: formBody(),
      footer: footer([cancelBtn(), okBtn("Salvează", "data-cal-save")])
    });
    const body = document.querySelector("#case-action-modal [data-case-modal-body]");
    window.GEAPDatePicker?.init?.(body);
    if (focus) body?.querySelector(focus)?.focus();
  }
  /* `prefill` (calendar view, a day without an event): the date + the type that day can take nationally (AC-08) */
  function openForm(day = null, prefill = {}) {
    if (!canEdit()) return; /* AC-01: the direct call is refused too */
    const preDate = prefill.date || "";
    const preType = preDate ? (WD().isWeekend(preDate) ? "lucratoare" : "nelucratoare") : "";
    Object.assign(F, {
      mode: day ? "edit" : "add",
      id: day?.id || null,
      original: day ? { ...day } : null,
      values: day ? { date: day.date, type: day.type, authority: day.authority || "", reason: day.reason } : { date: preDate, type: preType, authority: "", reason: "" },
      errors: {},
      pending: null
    });
    renderForm();
  }
  /* read the form (the date picker keeps the ISO on data-selected; a typed DD/MM/YYYY is parsed) */
  function readForm() {
    const body = document.querySelector("#case-action-modal [data-cal-form]");
    if (!body) return;
    const picker = body.querySelector("[data-cal-date='date']");
    const typed = body.querySelector("#cal-date")?.value.trim() || "";
    const m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(typed);
    F.values.date = m ? `${m[3]}-${pad(m[2])}-${pad(m[1])}` : typed ? "invalid" : (picker?.dataset.selected || "");
    body.querySelectorAll("[data-cal-select]").forEach((select) => { F.values[select.dataset.calSelect] = select.value; });
    F.values.reason = body.querySelector("[data-cal-field='reason']")?.value || "";
  }
  /* US-284 AC-02…10 (US-285 AC-03: the same) */
  function validate() {
    const v = F.values;
    const errors = {};
    const reason = v.reason.trim();
    const d = toDate(v.date);
    if (!v.date) errors.date = "Indicați data";
    else if (!d || v.date === "invalid") errors.date = "Indicați data în formatul ZZ/LL/AAAA";
    else if (d.getFullYear() < 2000 || d.getFullYear() > 2100) errors.date = "Data trebuie să fie între anii 2000 și 2100";
    if (!v.type) errors.type = "Alegeți tipul evenimentului";
    if (!reason) errors.reason = "Indicați motivul";
    else if (reason.length > REASON_MAX) errors.reason = `Motivul nu poate depăși ${REASON_MAX} de caractere`;
    if (v.authority && (demo === "autoritate" || !authorities().some((a) => a.code === v.authority))) errors.authority = "Autoritatea selectată nu există";
    if (!errors.date && !errors.type && !v.authority) {
      /* AC-08: a national exception must change the weekday's status */
      const weekend = WD().isWeekend(v.date);
      if ((v.type === "nelucratoare" && weekend) || (v.type === "lucratoare" && !weekend)) errors.type = "Pentru toată țara se adaugă doar sărbători în zilele de luni-vineri sau zile lucrătoare în weekend";
    }
    if (!errors.date && !errors.authority) {
      /* AC-09: one day per date and domain among the non-deleted days */
      const twin = WD().days().find((x) => x.date === v.date && (x.authority || "") === (v.authority || "") && x.id !== F.id);
      if (twin) errors.date = "Această zi există deja în calendar pentru domeniul selectat";
    }
    F.errors = errors;
    return !Object.keys(errors).length;
  }
  const domainLabel = (code) => (code ? authorities().find((a) => a.code === code)?.shortName || code : NATIONAL);
  const draftDay = () => {
    const v = F.values;
    const base = F.original || {};
    const at = nowIso();
    return {
      ...base,
      id: F.id || undefined,
      date: v.date, type: v.type, reason: v.reason.trim(), authority: v.authority || null,
      /* AC-11 / US-285 AC-04: what a person saves is „Manual” */
      source: "Manual", deleted: false,
      ...(F.mode === "edit" ? { editedBy: userName(), editedAt: at } : { createdBy: userName(), createdAt: at })
    };
  };
  function save() {
    readForm();
    if (!validate()) { renderForm({ focus: ".is-error input, .is-error .e-permits-fo-select__button, .is-error textarea" }); return; }
    const day = draftDay();
    const impact = impactOf(candidateWith({ ...day, id: day.id || "__new" }));
    F.pending = day;
    /* US-288: a change that moves deadlines is shown before it is saved */
    if (impact.changed.length) { renderPreview(impact); return; }
    commitSave(day, null);
  }
  function renderPreview(impact) {
    F.step = "preview";
    openModal({
      kind: "preview",
      title: "Salvezi ziua și recalculezi termenele?",
      subtitle: `${longDate(F.pending.date)} · ${TYPES[F.pending.type]} · ${domainLabel(F.pending.authority)}`,
      body: `<div class="e-permits-case-form"><p class="e-permits-case-form__lead">${impactLead(impact)}</p>${previewHtml(impact)}</div>`,
      footer: footer([cancelBtn("Înapoi", "data-cal-back"), okBtn("Salvează și recalculează", "data-cal-confirm-save")])
    });
    F.impact = impact;
  }
  function commitSave(day, impact) {
    if (fails()) { failToast(); return; } /* AC-12: the dialog stays with its data */
    const saved = WD().saveDay(day);
    const edit = F.mode === "edit";
    finish({
      toast: "Ziua a fost salvată.",
      entry: {
        type: edit ? "Zi editată" : "Zi adăugată",
        detail: `${longDate(saved.date)} · ${TYPES[saved.type]} · ${domainLabel(saved.authority)}${edit && F.original?.source === "Generat" ? " · sursa a devenit „Manual”" : ""}.`
      },
      /* a working / non-working day always triggers the recalculation (US-284 AC-13, US-285 AC-07) */
      impact: impact || { recalc: true }
    });
    F.pending = null;
    selectYear(saved.date);
  }
  /* after a save the list shows the day's year (when that year has a tab) */
  function selectYear(isoDate) {
    const y = Number(String(isoDate).slice(0, 4));
    if (!years().includes(y)) return;
    const st = A().workplaceState;
    if (st && st.tabKey !== `y${y}`) {
      const tab = document.querySelector(`[data-workplace-tab="y${y}"]`);
      if (tab) tab.click();
    }
  }

  /* ---------------------------------------------------------------- US-286: delete */
  let deleting = null;
  function openDelete(day) {
    if (!canEdit() || !day) return;
    deleting = day;
    const impact = impactOf(WD().days({ includeDeleted: true }).map((d) => (d.id === day.id ? { ...d, deleted: true } : d)));
    openModal({
      kind: "confirm",
      title: "Ștergerea zilei din calendar",
      body: `<div class="e-permits-case-form">
          <p class="e-permits-case-form__lead">Ziua ${esc(longDate(day.date))} va fi ștearsă din calendar. Generarea anului nu o va adăuga din nou.</p>
          ${impact.changed.length ? `<p class="e-permits-case-form__lead">${impactLead(impact)}</p>${previewHtml(impact)}` : ""}
        </div>`,
      footer: footer([cancelBtn(), okBtn("Șterge", "data-cal-confirm-delete", { destructive: true, iconName: "delete" })])
    });
  }
  function confirmDelete() {
    if (!deleting) return;
    if (fails()) { failToast(); return; }
    const day = WD().deleteDay(deleting.id, { by: userName(), at: nowIso() });
    deleting = null;
    /* AC-03 / AC-07 */
    finish({ toast: "Ziua a fost ștearsă.", entry: { type: "Zi ștearsă", detail: `${longDate(day.date)} · ${TYPES[day.type]} · ${domainLabel(day.authority)}.` }, impact: { recalc: true } });
  }

  /* ---------------------------------------------------------------- US-287: generate the national holidays */
  let generating = null;
  function openGenerate() {
    if (!canEdit()) return;
    const year = activeYear();
    if (year < 2000 || year > 2100) { failToast("Data trebuie să fie între anii 2000 și 2100"); return; }
    const missing = WD().missingHolidays(year);
    const skipped = WD().nationalHolidays(year).filter((h) => h.weekend);
    generating = { year, missing };
    const added = missing.map((h) => ({ id: `gen-${h.date}`, date: h.date, type: "nelucratoare", reason: h.reason, authority: null, source: "Generat", deleted: false }));
    const impact = added.length ? impactOf([...WD().days({ includeDeleted: true }), ...added]) : { total: 0, changed: [] };
    const list = missing.length ? `
      <div class="e-permits-workplace__table-wrap e-permits-reg-table e-permits-cal-table">
        <table class="e-permits-workplace__table e-permits-reg-table__table">
          <caption class="u-visually-hidden">Sărbătorile legale care se adaugă</caption>
          <thead><tr><th scope="col">Data</th><th scope="col">Sărbătoarea</th></tr></thead>
          <tbody>${missing.map((h) => `<tr><td><span class="e-permits-workplace__date-stack"><span>${esc(longDate(h.date))}</span><span class="e-permits-workplace__date-meta">${esc(weekday(h.date))}</span></span></td><td><span data-cell-tooltip="${esc(h.reason)}">${esc(h.reason)}</span></td></tr>`).join("")}</tbody>
        </table>
      </div>` : "";
    openModal({
      kind: "confirm",
      title: `Generezi sărbătorile legale pentru ${year}?`,
      body: `<div class="e-permits-case-form">
          <p class="e-permits-case-form__lead">${missing.length
            ? `Se adaugă ${esc(plural(missing.length, "sărbătoare legală", "sărbători legale"))} cu sursa „Generat”. Zilele existente, inclusiv cele manuale și cele șterse, nu se modifică.`
            : `Toate sărbătorile legale pentru ${year} sunt deja în calendar, inclusiv cele șterse manual. O nouă generare nu adaugă nicio zi.`}</p>
          ${list}
          ${skipped.length ? U().renderInfoNote?.(`Nu se înregistrează, fiindcă sunt oricum nelucrătoare: ${skipped.map((h) => `${esc(longDate(h.date).replace(/ \d{4}$/, ""))} (${esc(weekday(h.date))})`).join(", ")}. Hramurile locale și transferurile prin hotărâre de Guvern se adaugă cu „Adaugă zi”.`) || "" : ""}
          ${impact.changed.length ? `<p class="e-permits-case-form__lead">${impactLead(impact)}</p>${previewHtml(impact)}` : ""}
        </div>`,
      footer: footer([cancelBtn(), okBtn("Generează", "data-cal-confirm-generate", { iconName: "calendar-add" })])
    });
  }
  function confirmGenerate() {
    if (!generating) return;
    if (fails()) { failToast(); return; }
    const { year, missing } = generating;
    generating = null;
    WD().addGenerated(missing, { by: userName(), at: nowIso() });
    /* AC-08; AC-12/13: recalculation + journal only when at least one day was added */
    const message = `Au fost adăugate ${missing.length} ${missing.length === 1 ? "sărbătoare legală" : missing.length % 100 >= 20 ? "de sărbători legale" : "sărbători legale"} pentru anul ${year}`;
    if (!missing.length) {
      closeModal();
      U().showShellToast?.(`${message}.`, "info");
      return;
    }
    finish({ toast: `${message}.`, entry: { type: "Generare an", detail: `${year}: ${plural(missing.length, "sărbătoare legală adăugată", "sărbători legale adăugate")}.` }, impact: { recalc: true } });
    selectYear(`${year}-01-01`);
  }

  /* ---------------------------------------------------------------- US-288: the journal + the manual run */
  function journalBody() {
    const events = WD().journal();
    return window.GEAPEventTimeline?.listHtml(events) || "";
  }
  function openJournal() {
    if (!canView()) return;
    openModal({
      kind: "journal",
      title: "Jurnalul calendarului",
      subtitle: "Modificări, generări și recalculări ale termenelor",
      body: `<div class="e-permits-case-form" data-cal-journal-body>${journalBody()}</div>`,
      footer: footer([
        ...(canEdit() ? [`<button class="btn btn-neutral btn-rounded" type="button" data-cal-recalc>${icon("rotate-arrow")}<span>Recalculează termenele</span></button>`] : []),
        `<button class="btn btn-primary btn-rounded" type="button" data-case-close>Închide</button>`
      ])
    });
  }
  /* AC-06: the fallback recalculation, started by hand */
  function runRecalc() {
    if (!canEdit()) return;
    if (fails()) { failToast(); return; }
    const result = recalculate();
    WD().log({ at: nowIso(), user: userName(), role: persona().roleLabel || "Administrator central", type: "Recalculare termene", status: "Reușit", detail: `Pornită manual: ${plural(result.total, "dosar activ", "dosare active")}, ${plural(result.changed, "termen modificat", "termene modificate")}.` });
    const body = document.querySelector("#case-action-modal [data-cal-journal-body]");
    if (body) body.innerHTML = journalBody();
    U().showShellToast?.(recalcSentence(result), "success");
  }

  /* ---------------------------------------------------------------- export (AC-10, AC-14) */
  let exportList = null;
  function openExport(list) {
    exportList = list;
    openModal({
      kind: "export",
      title: "Exportă calendarul",
      subtitle: `${plural(list.length, "zi", "zile")} · anul ${activeYear()}, cu căutarea și filtrele aplicate`,
      body: `<div class="e-permits-case-form"><p class="e-permits-case-form__lead">Fișierul se descarcă în format CSV, în ordinea din listă.</p>${U().renderInfoNote?.("Exportul se înregistrează în Jurnalul de audit, cu utilizatorul, numărul de rânduri și ora.") || ""}</div>`,
      footer: footer([cancelBtn(), okBtn("Exportă CSV", "data-cal-export-confirm", { iconName: "export" })])
    });
  }
  function exportCsv() {
    const list = exportList || [];
    const head = ["Data", "Ziua săptămânii", "Tip eveniment", "Motiv", "Domeniu de aplicare", "Sursă"];
    const lines = list.map((r) => [dotted(r.date), weekday(r.date), TYPES[r.type], r.reason, r.domain, r.source]);
    const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const name = `calendar-${activeYear()}.csv`;
    const blob = new Blob([`﻿${[head, ...lines].map((l) => l.map(cell).join(";")).join("\r\n")}`], { type: "text/csv;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    WD().log({ at: nowIso(), user: userName(), role: persona().roleLabel, type: "Export listă", status: "Reușit", detail: `${name}: ${plural(lines.length, "rând exportat", "rânduri exportate")}.` });
    closeModal();
    U().showShellToast?.(`Am exportat ${plural(lines.length, "zi", "zile")} în ${name}.`, "success");
    exportList = null;
  }

  /* ---------------------------------------------------------------- calendar-views-v1: Listă / Calendar */
  /* A proposal beyond US-283 (the list stays the default view; user-approved 2026-10-26). The same rows as the list —
     the year tab (current −1 … +2), the search and „Filtre” (Domeniu de aplicare = the scope) — drawn as a year of 12
     months (iPhone-style zoom: a month opens the month grid). Two layers: the calendar exceptions (on) and the absences
     (off; js/absences.js › GEAPAbsences.between, the same people the person may manage). A day opens the existing
     „Adaugă zi” (date + type prefilled) / „Editare zi”; a read-only role gets the day's events in a popover. */
  const WEEKDAYS = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"];
  const LETTERS = ["L", "M", "M", "J", "V", "S", "D"];
  const CV = { mode: "list", month: null, layers: { events: true, absences: false } };
  const isoOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
  /* the real date; `?today=YYYY-MM-DD` pins it for the demo states (calendar-views-v3) */
  const todayIso = () => { const q = params.get("today") || ""; if (/^\d{4}-\d{2}-\d{2}$/.test(q)) return q; const d = new Date(); return isoOf(d.getFullYear(), d.getMonth(), d.getDate()); };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const monthTitle = (y, m) => `${cap(RO_MONTHS[m])} ${y}`;
  const daysIn = (y, m) => new Date(y, m + 1, 0).getDate();
  const weekendIso = (iso) => { const d = toDate(iso); return d.getDay() === 0 || d.getDay() === 6; };
  const ABS = () => window.GEAPAbsences;
  const absencesAvailable = () => typeof ABS()?.between === "function" && Boolean(ABS().canView?.());
  const registryEl = () => document.querySelector(`[data-workplace][data-registry-kind="${KIND}"]`);

  /* the list's rows (tab + search + Filtre) by date; the layer off = no exceptions drawn */
  function eventsByDate() {
    const map = new Map();
    if (!CV.layers.events) return map;
    (A().getVisibleRows?.() || []).forEach((row) => { if (!map.has(row.date)) map.set(row.date, []); map.get(row.date).push(row); });
    return map;
  }
  /* „off” = a non-working exception (holiday / transferred day off) wins; „on” = only a working day moved to a weekend */
  const kindOf = (list) => (!list?.length ? "" : list.some((r) => r.type === "nelucratoare") ? "off" : "on");
  /* the absent people per WORKING day (a weekend / holiday count would be noise) */
  function absentByDate(from, to) {
    const map = new Map();
    if (!CV.layers.absences || !absencesAvailable()) return map;
    const list = ABS().between(from, to);
    if (!list.length) return map;
    for (let d = toDate(from); d <= toDate(to); d.setDate(d.getDate() + 1)) {
      const iso = isoOf(d.getFullYear(), d.getMonth(), d.getDate());
      if (!WD().isWorkingDay(iso)) continue;
      const here = list.filter((a) => a.from <= iso && (!a.to || a.to >= iso));
      if (here.length) map.set(iso, here);
    }
    return map;
  }

  const checkHtml = (key, label, on) => `
    <label class="checkbox checkbox--medium e-permits-cal-layer">
      <input type="checkbox" class="checkbox-input" data-cal-layer="${key}" data-cal-focus="layer-${key}"${on ? " checked" : ""}>
      <span class="checkbox-custom"></span>
      <span class="checkbox-texts"><span class="checkbox-label">${esc(label)}</span></span>
    </label>`;
  /* layers (Google-Calendar-like) + the colour legend */
  const LEGEND_ICON = { "is-off": "calendar-remove", "is-on": "reschedule", "has-absences": "people" };
  const barHtml = () => {
    const legend = [
      ...(CV.layers.events ? [["is-off", "Zi nelucrătoare"], ["is-on", "Zi lucrătoare transferată"]] : []),
      ["is-weekend", "Weekend"],
      ["is-today", "Azi"],
      ...(CV.layers.absences && absencesAvailable() ? [["has-absences", "Cu absențe"]] : [])
    ];
    return `
      <div class="e-permits-cal-board__bar">
        <div class="e-permits-cal-layers" role="group" aria-label="Ce se afișează în calendar">
          ${checkHtml("events", "Sărbători și zile transferate", CV.layers.events)}
          ${absencesAvailable() ? checkHtml("absences", "Absențe", CV.layers.absences) : ""}
        </div>
        <ul class="e-permits-cal-legend" aria-label="Legendă">
          ${legend.map(([cls, label]) => `<li><span class="e-permits-cal-mark ${cls}" aria-hidden="true">${cls === "has-absences" ? "" : "8"}</span>${LEGEND_ICON[cls] ? icon(LEGEND_ICON[cls], "icon small e-permits-cal-legend__icon") : ""}${esc(label)}</li>`).join("")}
        </ul>
      </div>`;
  };

  /* ---- year: 12 compact months; a month opens the month grid */
  function miniHtml(year, m, events, absent) {
    const lead = (new Date(year, m, 1, 12).getDay() + 6) % 7;
    const today = todayIso();
    let off = 0, on = 0;
    const cells = Array.from({ length: lead }, () => '<span class="e-permits-cal-mini__day is-blank"></span>');
    for (let d = 1; d <= daysIn(year, m); d += 1) {
      const iso = isoOf(year, m, d);
      const k = kindOf(events.get(iso));
      if (k === "off") off += 1;
      if (k === "on") on += 1;
      cells.push(`<span class="e-permits-cal-mini__day${weekendIso(iso) ? " is-weekend" : ""}${k ? ` is-${k}` : ""}${iso === today ? " is-today" : ""}${absent.has(iso) ? " has-absences" : ""}">${d}</span>`);
    }
    const parts = [
      off ? plural(off, "zi nelucrătoare", "zile nelucrătoare") : "",
      on ? plural(on, "zi lucrătoare transferată", "zile lucrătoare transferate") : ""
    ].filter(Boolean);
    return `
      <button class="e-permits-cal-mini" type="button" data-cal-month="${m}" data-cal-focus="month-${m}" aria-label="${esc(`${monthTitle(year, m)}${parts.length ? `: ${parts.join(", ")}` : ""}. Deschide luna`)}">
        <span class="e-permits-cal-mini__title">${esc(cap(RO_MONTHS[m]))}</span>
        <span class="e-permits-cal-mini__grid" aria-hidden="true">${LETTERS.map((l) => `<span class="e-permits-cal-mini__wd">${l}</span>`).join("")}${cells.join("")}</span>
      </button>`;
  }
  const yearHtml = (year, events, absent) => `
    <h2 class="u-visually-hidden" id="cal-board-title">Calendarul anului ${year}</h2>
    <div class="e-permits-cal-year">${RO_MONTHS.map((_, m) => miniHtml(year, m, events, absent)).join("")}</div>`;

  /* ---- month: the full grid (Monday first), the events of each day, the absent counter */
  const eventLine = (r) => `${TYPES[r.type]}: ${r.reason}${r.authority ? ` (${r.domain})` : ""}`;
  const absentMenu = (iso, list, suffix = "") => {
    const id = `cal-abs-${iso}${suffix}`;
    return `
      <div class="e-permits-stack__menu-wrap e-permits-cal-absent">
        <button class="btn btn-neutral btn-sm e-permits-stack__menu-trigger" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="${id}" data-stack-menu-trigger data-cal-focus="abs-${iso}${suffix}" aria-label="${esc(`${plural(list.length, "absent", "absenți")} pe ${longDate(iso)}`)}">
          ${icon("people")}<span>${esc(plural(list.length, "absent", "absenți"))}</span>
        </button>
        <ul class="e-permits-fo-intent-menu e-permits-stack__menu e-permits-cal-people" id="${id}" role="menu" aria-label="${esc(`Absenți pe ${longDate(iso)}`)}" hidden data-stack-menu data-stack-menu-fixed>
          ${list.map((a) => `<li role="none"><button class="e-permits-fo-intent-menu__item e-permits-cal-people__item" type="button" role="menuitem" data-cal-absence="${esc(a.id)}">
            <span class="e-permits-cal-people__name">${esc(a.name)}</span>
            <span class="e-permits-cal-people__meta e-permits-abs-kind e-permits-abs-kind--${esc(a.tone || "neutral")}">${a.icon ? icon(a.icon, "icon small") : ""}<span>${esc(a.type)} · ${esc(a.period)}</span></span>
          </button></li>`).join("")}
        </ul>
      </div>`;
  };
  /* the read-only popover of a day (Administrator local) — and the editor's choice when a date holds two events */
  const dayPopover = (iso, list, id) => (canEdit()
    ? `<ul class="e-permits-fo-intent-menu e-permits-stack__menu" id="${id}" role="menu" aria-label="${esc(longDate(iso))}" hidden data-stack-menu data-stack-menu-fixed>
        ${list.map((r) => `<li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" data-cal-action="edit" data-cal-id="${esc(r.id)}">${icon("edit")}<span>Editează: ${esc(r.reason)}</span></button></li>`).join("")}
        <li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" data-cal-add-date="${iso}">${icon("plus-large")}<span>Adaugă zi pe această dată</span></button></li>
      </ul>`
    : `<div class="e-permits-fo-intent-menu e-permits-stack__menu e-permits-cal-pop" id="${id}" role="dialog" aria-label="${esc(longDate(iso))}" hidden data-stack-menu data-stack-menu-fixed>
        <p class="e-permits-cal-pop__title">${esc(`${longDate(iso)}, ${weekday(iso)}`)}</p>
        ${list.length
          ? `<ul class="e-permits-cal-pop__list">${list.map((r) => `<li class="e-permits-cal-pop__row">${tag(TYPES[r.type], TYPE_TONE[r.type], TYPE_ICON[r.type])}<span class="e-permits-cal-pop__text">${esc(r.reason)}</span><span class="e-permits-cal-pop__meta">${esc(r.domain)} · ${esc(r.source)}</span></li>`).join("")}</ul>`
          : `<p class="e-permits-cal-pop__text">${weekendIso(iso) ? "Zi de odihnă (weekend). Nicio excepție în calendar." : "Zi lucrătoare. Nicio excepție în calendar."}</p>`}
      </div>`);
  function cellHtml(iso, list = [], absent = null) {
    const k = kindOf(list);
    const today = iso === todayIso();
    const edit = canEdit();
    const pop = !edit || list.length > 1;
    const popId = `cal-day-${iso}`;
    const label = [
      `${longDate(iso)}, ${weekday(iso)}${today ? ", azi" : ""}`,
      ...list.map(eventLine),
      absent ? plural(absent.length, "absent", "absenți") : "",
      edit ? (list.length === 1 ? "Editează ziua" : list.length ? "Alege evenimentul" : "Adaugă o zi") : ""
    ].filter(Boolean).join(". ");
    const shown = list.slice(0, 2);
    const day = `
      <button class="e-permits-cal-day${pop ? " e-permits-stack__menu-trigger" : ""}" type="button" aria-label="${esc(label)}" data-cal-focus="day-${iso}" ${pop ? `aria-haspopup="${edit ? "menu" : "dialog"}" aria-expanded="false" aria-controls="${popId}" data-stack-menu-trigger` : `data-cal-day="${iso}"`}>
        <span class="e-permits-cal-day__num">${Number(iso.slice(8))}</span>
        ${absent ? '<span class="e-permits-cal-day__dot" aria-hidden="true"></span>' : ""}
        ${shown.length ? `<span class="e-permits-cal-day__events" aria-hidden="true">${shown.map((r) => `<span class="e-permits-cal-day__event is-${r.type === "nelucratoare" ? "off" : "on"}">${icon(TYPE_ICON[r.type], "icon small")}<span data-cell-tooltip="${esc(r.reason)}">${esc(r.reason)}</span></span>`).join("")}${list.length > shown.length ? `<span class="e-permits-cal-day__more">+${list.length - shown.length}</span>` : ""}</span>` : ""}
      </button>`;
    return `
      <td class="e-permits-cal-month__cell${weekendIso(iso) ? " is-weekend" : ""}${k ? ` is-${k}` : ""}${today ? " is-today" : ""}">
        <div class="e-permits-cal-month__inner${pop ? " e-permits-stack__menu-wrap" : ""}">
          ${day}
          ${pop ? dayPopover(iso, list, popId) : ""}
          ${absent ? absentMenu(iso, absent) : ""}
        </div>
      </td>`;
  }
  function monthHtml(year, m, events, absent, empty) {
    const ys = years();
    const first = year === ys[0] && m === 0;
    const last = year === ys[ys.length - 1] && m === 11;
    const range = `Calendarul arată anii ${ys[0]}–${ys[ys.length - 1]}`;
    const step = (dir, label, iconName, off) => `<button class="btn btn-neutral btn-sm btn-icon-only" type="button" aria-label="${label}" data-cal-step="${dir}" data-cal-focus="step${dir}"${off ? ` aria-disabled="true" data-tooltip-reason="${esc(range)}"` : ""}>${icon(iconName, "icon small")}</button>`;
    const head = `
      <div class="e-permits-cal-month-head">
        ${window.GEAPBreadcrumbs?.html([{ label: String(year), button: true, attr: 'data-cal-to-year data-cal-focus="to-year"' }, { label: monthTitle(year, m) }], { parentsOnly: true, label: "Înapoi la an" }) || ""}
        <div class="e-permits-cal-month-head__row">
          <h2 class="e-permits-cal-month-head__title" id="cal-board-title">${esc(monthTitle(year, m))}</h2>
          <div class="e-permits-cal-month-head__nav">${step(-1, "Luna anterioară", "chevron-left", first)}${step(1, "Luna următoare", "chevron-right", last)}</div>
        </div>
      </div>`;
    if (empty) return `${head}${empty}`;
    const lead = (new Date(year, m, 1, 12).getDay() + 6) % 7;
    const count = daysIn(year, m);
    const weeks = Math.ceil((lead + count) / 7);
    const body = Array.from({ length: weeks }, (_, w) => `<tr>${Array.from({ length: 7 }, (__, c) => {
      const d = w * 7 + c - lead + 1;
      if (d < 1 || d > count) return '<td class="e-permits-cal-month__cell is-blank"></td>';
      const iso = isoOf(year, m, d);
      return cellHtml(iso, events.get(iso), absent.get(iso) || null);
    }).join("")}</tr>`).join("");
    /* phones: the grid keeps the numbers + colours, the names and counters move to this list under it (iPhone) */
    const agendaDays = [...new Set([...events.keys(), ...absent.keys()])].filter((iso) => iso.startsWith(`${year}-${pad(m + 1)}-`)).sort();
    const agenda = agendaDays.length ? `
      <ul class="e-permits-cal-agenda" aria-label="${esc(`Zilele cu evenimente din ${RO_MONTHS[m]} ${year}`)}">
        ${agendaDays.map((iso) => {
          const list = events.get(iso) || [];
          const k = kindOf(list);
          return `<li class="e-permits-cal-agenda__item">
            <span class="e-permits-cal-mark${k ? ` is-${k}` : weekendIso(iso) ? " is-weekend" : ""}${iso === todayIso() ? " is-today" : ""}" aria-hidden="true">${Number(iso.slice(8))}</span>
            <span class="e-permits-cal-agenda__text">
              <span class="e-permits-cal-agenda__date">${esc(`${longDate(iso)}, ${weekday(iso)}`)}</span>
              ${list.map((r) => `<span class="e-permits-cal-agenda__event">${icon(TYPE_ICON[r.type], "icon small")}<span>${esc(r.reason)}</span></span>`).join("")}
            </span>
            ${absent.get(iso) ? absentMenu(iso, absent.get(iso), "-agenda") : ""}
          </li>`;
        }).join("")}
      </ul>` : "";
    return `${head}${barHtml()}
      <div class="e-permits-cal-month-wrap">
        <table class="e-permits-cal-month" aria-labelledby="cal-board-title">
          <thead><tr>${WEEKDAYS.map((d, i) => `<th scope="col"><span class="e-permits-cal-month__wd">${d}</span><span class="e-permits-cal-month__wd-short" aria-hidden="true">${LETTERS[i]}</span></th>`).join("")}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      ${agenda}`;
  }

  function ensureBoard(reg) {
    let board = reg.querySelector("[data-cal-board]");
    if (!board) {
      reg.querySelector(".e-permits-workplace__table-wrap")?.insertAdjacentHTML("afterend", '<section class="e-permits-cal-board" data-cal-board aria-labelledby="cal-board-title"></section>');
      board = reg.querySelector("[data-cal-board]");
    }
    return board;
  }
  function renderBoard() {
    const reg = registryEl();
    if (!reg) return;
    reg.dataset.calView = CV.mode;
    if (CV.mode !== "calendar") return;
    const board = ensureBoard(reg);
    if (!board) return;
    const focusKey = document.activeElement?.closest?.("[data-cal-board] [data-cal-focus]")?.dataset.calFocus || "";
    const year = activeYear();
    /* AC-11 / no results: the list's own empty state (the shell drew it into the table) */
    const emptyEl = reg.querySelector("[data-workplace-rows] .e-permits-empty");
    const empty = emptyEl ? emptyEl.outerHTML : "";
    const events = eventsByDate();
    const from = CV.month == null ? `${year}-01-01` : isoOf(year, CV.month, 1);
    const to = CV.month == null ? `${year}-12-31` : isoOf(year, CV.month, daysIn(year, CV.month));
    const absent = absentByDate(from, to);
    board.innerHTML = CV.month == null
      ? (empty ? `<h2 class="u-visually-hidden" id="cal-board-title">Calendarul anului ${year}</h2>${empty}` : `${barHtml()}${yearHtml(year, events, absent)}`)
      : monthHtml(year, CV.month, events, absent, empty);
    if (focusKey) board.querySelector(`[data-cal-focus="${focusKey}"]`)?.focus();
  }
  function setView(mode) {
    CV.mode = mode;
    const reg = registryEl();
    if (reg) reg.dataset.calView = mode;
    if (mode === "calendar") renderBoard();
  }
  /* prev / next month: across a year boundary the year tab follows (the board redraws with the list) */
  function stepMonth(dir) {
    const year = activeYear();
    let m = (CV.month ?? 0) + dir;
    let y = year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    if (!years().includes(y)) return;
    CV.month = m;
    if (y !== year) document.querySelector(`[data-workplace-tab="y${y}"]`)?.click();
    else renderBoard();
  }
  window.GEAPViewSwitch?.on(KIND, (value) => setView(value));

  /* ---------------------------------------------------------------- delegated events */
  const closeMenus = () => {
    document.querySelectorAll("[data-stack-menu]:not([hidden])").forEach((menu) => { menu.hidden = true; });
    document.querySelectorAll("[data-stack-menu-trigger][aria-expanded='true']").forEach((b) => b.setAttribute("aria-expanded", "false"));
  };
  document.addEventListener("click", (event) => {
    const t = event.target;
    if (!(t instanceof Element)) return;
    if (t.closest(`[data-workplace-add-product="cal-add"]`)) { event.preventDefault(); openForm(); return; }
    const act = t.closest("[data-cal-action]");
    if (act) {
      event.preventDefault(); closeMenus();
      const day = dayOf(act.dataset.calId);
      if (act.dataset.calAction === "edit") openForm(day); else openDelete(day);
      return;
    }
    /* calendar view: a day / counter popover near the bottom of the screen opens above its button (the shell
       places fixed menus under the trigger) */
    const popTrigger = t.closest("[data-cal-board] [data-stack-menu-trigger]");
    if (popTrigger) {
      requestAnimationFrame(() => {
        const menu = document.getElementById(popTrigger.getAttribute("aria-controls"));
        if (!menu || menu.hidden) return;
        const r = popTrigger.getBoundingClientRect();
        if (menu.getBoundingClientRect().bottom > window.innerHeight - 8 && r.top - menu.offsetHeight - 4 >= 8) menu.style.top = `${r.top - menu.offsetHeight - 4}px`;
      });
    }
    /* calendar view: zoom year → month → day */
    const month = t.closest("[data-cal-month]");
    if (month) { CV.month = Number(month.dataset.calMonth); renderBoard(); document.querySelector("[data-cal-board] [data-cal-to-year]")?.focus(); return; }
    if (t.closest("[data-cal-to-year]")) {
      event.preventDefault();
      const from = CV.month;
      CV.month = null; renderBoard();
      document.querySelector(`[data-cal-board] [data-cal-month="${from}"]`)?.focus();
      return;
    }
    const step = t.closest("[data-cal-step]");
    if (step) { if (step.getAttribute("aria-disabled") !== "true") stepMonth(Number(step.dataset.calStep)); return; }
    const day = t.closest("[data-cal-day]");
    if (day) {
      const list = eventsByDate().get(day.dataset.calDay) || [];
      if (list.length === 1) openForm(dayOf(list[0].id)); else openForm(null, { date: day.dataset.calDay });
      return;
    }
    const addDate = t.closest("[data-cal-add-date]");
    if (addDate) { closeMenus(); openForm(null, { date: addDate.dataset.calAddDate }); return; }
    const absence = t.closest("[data-cal-absence]");
    if (absence) { closeMenus(); ABS()?.open?.(absence.dataset.calAbsence); return; }
    if (t.closest("[data-cal-generate]")) { event.preventDefault(); openGenerate(); return; }
    if (t.closest("[data-cal-journal]")) { event.preventDefault(); openJournal(); return; }
    if (t.closest("[data-cal-save]")) { save(); return; }
    if (t.closest("[data-cal-back]")) { renderForm(); return; }
    if (t.closest("[data-cal-confirm-save]")) { if (F.pending) commitSave(F.pending, F.impact); return; }
    if (t.closest("[data-cal-confirm-delete]")) { confirmDelete(); return; }
    if (t.closest("[data-cal-confirm-generate]")) { confirmGenerate(); return; }
    if (t.closest("[data-cal-recalc]")) { runRecalc(); return; }
    if (t.closest("[data-cal-export-confirm]")) exportCsv();
  });
  /* calendar view layers (no toast — a switch of what is shown) */
  document.addEventListener("change", (event) => {
    const layer = event.target.closest?.("[data-cal-layer]");
    if (!layer) return;
    CV.layers[layer.dataset.calLayer] = layer.checked;
    if (layer.dataset.calLayer === "absences" && layer.checked && !ABS()?.ready?.()) ABS()?.load?.().then(renderBoard);
    renderBoard();
  });
  /* the reason counter (200) and the error of a field cleared as the person corrects it */
  document.addEventListener("input", (event) => {
    const area = event.target.closest?.("#case-action-modal [data-cal-field='reason']");
    if (!area) return;
    const count = area.closest(".e-permits-fo-field")?.querySelector("[data-cal-count]");
    if (count) count.textContent = String(area.value.length);
  });

  /* ---------------------------------------------------------------- routes */
  function showDenied() {
    document.querySelectorAll("[data-nav-item].is-active").forEach((link) => { link.classList.remove("is-active"); link.removeAttribute("aria-current"); });
    G().showPage?.(TITLE, window.GEAPEmptyState?.render({ title: DENIED, text: "Calendarul zilelor nelucrătoare se vede cu permisiunea de vizualizare a calendarului, acordată pe rol.", icon: "lock" }) || DENIED);
  }
  window.GEAPShellRoutes = window.GEAPShellRoutes || [];
  window.GEAPShellRoutes.push((hash) => {
    if (hash !== `#${NAV}`) return false;
    const nav = document.querySelector(`[data-nav-item][data-nav-id="${NAV}"]`);
    if (nav && canView()) nav.click(); else showDenied();
    return true;
  });
  /* the menu item opens the registry; the chrome is placed once the shell has drawn it */
  document.addEventListener("click", (event) => {
    if (event.target.closest?.(`[data-nav-item][data-nav-id="${NAV}"]`)) setTimeout(syncChrome, 0);
  });
  const boot = () => {
    observeRegistry();
    ensureChrome();
    /* the seed arrives after the first draw: redraw the open list with it */
    WD()?.ready?.then(() => { if (document.querySelector(`[data-workplace][data-registry-kind="${KIND}"]`)) refreshList(); });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();

  /* for demo states / probes */
  window.GEAPCalendarAdmin = {
    openForm, openDelete, openGenerate, openJournal, impactOf, recalculate, refreshList, persona,
    /* calendar-views-v1: demo states / probes — setView("calendar"), showMonth(6), layer("absences", true) */
    setView: (mode) => { const sw = document.querySelector(`[data-view-switch="${KIND}"] [data-view-value="${mode}"]`); if (sw) sw.click(); else setView(mode); },
    showMonth: (m) => { CV.month = m; renderBoard(); },
    layer: (key, on) => { CV.layers[key] = on; return (key === "absences" && on ? ABS()?.load?.() || Promise.resolve() : Promise.resolve()).then(renderBoard); }
  };
})();
