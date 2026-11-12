/* =====================================================================================
   BackOffice › „Rapoarte” (rbo-v1, 2026-11-11) — Feature 96587 „Rapoarte statistice predefinite” (Epic 96497 Raportare
   și analiză; the reports are built with Feature 96502 „Constructor de rapoarte” = js/rapoarte-admin.js). The BO user
   CONSUMES the published reports: menu „Locul de muncă › Rapoarte” (nav id `rapoarte-bo`, after „Tablou de bord”) →
   the list → a report → filters → „Generează” (fără / cu date cu caracter personal) → the result table → „Exportă”.

   Feature rules covered (text of the Feature, „tu” tone):
     · permission «Generarea rapoartelor» (Specialist · Supervizor · Director in the demo); without it: no menu item and a
       direct `#rapoarte-bo` shows „Nu ai permisiunea de a accesa această pagină.” (demo `?rbo=fara-permisiune`);
     · the list = the reports the ROLE has access to (published, visible at the user's authority, an active access grant
       of the builder's „Acces” tab for his role, at his authority or at all), separate from the dashboards, grouped
       by category (Rapoarte tabelare · Rapoarte statistice) — the shell stacked list (`renderStackedList` groups) with
       the builder's list row look (`.e-permits-rpt-list`: title · description (2 lines) · details);
     · a report = the LAST PUBLISHED version: name + „ⓘ” (description, Small tooltip), the filter bar on top (Perioada ·
       Tip act permisiv · Statut + the report's own „Afișează filtru” conditions = the library facet filter, the builder's
       `.e-permits-rpt-fbar` host) and the result under it; „Generează” = menu „Fără date cu caracter personal” (first,
       the default) / „Cu date cu caracter personal”; a report without personal columns = one plain „Generează”;
     · the result = the builder's report table (`GEAPRapoarte.engine.table`: two-level header, groups + subtotals, Total,
       formats: % one decimal, sums two decimals, days whole); no rows → „Nu există date pentru perioada selectată.”;
     · „Exportă” (CSV · PDF) after a generation; every generation and export → the audit journal
       (`GEAPEventTimeline.log`, module BackOffice, object „Raport”); read-only — nothing is edited here;
     · data scope = the user's perimeter (meta „Perimetru: ANSP” / „CSP Chișinău, ANSP” for the Supervizor, as the BO
       page „Tablou de bord”); a report showing the Autoritate / Subdiviziune column keeps only the perimeter's rows.
   PROPOSALS (the Feature is silent — for the PO): default period = 1 January → the end of the previous month (the
   statistic reports look at a past period); Perioada is required; „Autoritate emitentă” is not a chip for a BO user (his
   data are his authority's — shown as „Perimetru”); the personal columns of a report = report metadata `personal`
   (the builder has no such column property yet); changing a filter after a generation keeps the result with a notice
   „Generează din nou”; PDF = a toast in the prototype.
   Routes: #rapoarte-bo (list) · #rapoarte-bo/<RPT-id> (report). Demo switches ?rbo=fara-permisiune · fara-date (the
   default period = 2025, no data) · generat / generat-cu (the first report opens generated — demo links only).
   ===================================================================================== */
(function () {
  "use strict";

  const A = () => window.GEAPShellApi || {};
  const U = () => window.GEAPUi || {};
  const G = () => window.GEAPRegistre || {};
  const E = () => window.GEAPEmptyState;
  const R = () => window.GEAPRapoarte || {};
  const X = () => R().engine || {};
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (name, size = 20) => `<svg class="icon${size === 16 ? " small" : ""}" width="${size}" height="${size}" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${name}"></use></svg>`;
  const pad = (n) => String(n).padStart(2, "0");
  const RO_MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
  const longDate = (v) => { const d = v ? new Date(v) : null; return d ? `${d.getDate()} ${RO_MONTHS[d.getMonth()]} ${d.getFullYear()}` : ""; };
  const nowIso = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
  const hhmm = (iso) => iso.slice(11, 16);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : n % 100 >= 20 || (n % 100 === 0 && n) ? `de ${many}` : many}`;
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const toast = (message, type = "success") => (window.GEAPToast?.show ? window.GEAPToast.show({ type, message }) : U().showShellToast?.(message, type));

  const NAV = "rapoarte-bo";
  const TITLE = "Rapoarte";
  /* Feature AC texts („tu” tone) */
  const DENIED = "Nu ai permisiunea de a accesa această pagină.";
  const NO_DATA = "Nu există date pentru perioada selectată.";
  const ROLES = ["specialist", "supervisor", "director"];
  const params = new URLSearchParams(window.location.search);
  const demo = new Set(String(params.get("rbo") || "").split(",").map((s) => s.trim()).filter(Boolean));
  /* the default period (PROPOSAL): 1 January → the end of the previous month of the demo „today” */
  const defaultPeriod = () => (demo.has("fara-date") ? "interval:2025-01-01:2025-12-31" : "interval:2026-01-01:2026-10-31");

  /* the active assignment: role + authority (+ the Supervizor's subdivision) — the BO page „Tablou de bord” rule */
  function who() {
    const a = A().currentAssignment?.() || {};
    const role = a.roleId || "";
    return {
      role, roleLabel: a.roleLabel || "", unit: a.instanceLabel || "",
      authority: a.authority || /^([a-z]+)-/.exec(a.id || "")?.[1] || "ansp",
      has: ROLES.includes(role) && !demo.has("fara-permisiune")
    };
  }
  const authName = (id) => R().authName?.(id) || String(id || "").toUpperCase();
  const perimeter = (me) => (me.role === "supervisor" && me.unit ? `${me.unit}, ${authName(me.authority)}` : authName(me.authority));
  const lastVersion = (r) => R().lastVersion?.(r) || null;
  const nameOf = (r) => lastVersion(r)?.config.names.ro || r.id;
  const descOf = (r) => String(lastVersion(r)?.config.descriptions.ro || "").trim();
  /* the role's reports: published, visible at the authority, an active grant for the role (at the authority or at all) */
  const granted = (r, me) => (r.grants || []).some((g) => !g.revokedAt && g.role === me.role && (!g.authority || g.authority === me.authority));
  const atAuthority = (v, me) => (v.level === "Global" ? !v.authorities.length || v.authorities.includes(me.authority) : v.authorities.includes(me.authority));
  function myReports(me = who()) {
    if (!me.has) return [];
    return (R().all?.() || []).filter((r) => r.status === "Publicat" && lastVersion(r) && atAuthority(lastVersion(r).config, me) && granted(r, me));
  }
  const reportOf = (id) => myReports().find((r) => r.id === id) || null;

  /* ---------------------------------------------------------------- the generation config
     the published config + (a) the personal columns of the report (shown only „cu date cu caracter personal”; values
     filled after the render), (b) the BO filters Perioada · Tip act permisiv · Statut as asked conditions on the source's
     fields (an existing asked condition on the same field is reused), (c) the perimeter: a fixed condition on the
     Autoritate / Subdiviziune column when the report shows it */
  const BASE = {
    "reg-dosare": { perioada: "depus", tip: "serviciu", statut: "statut" },
    "reg-acte": { perioada: "emis", tip: "tipAct", statut: "status" },
    "reg-note": { perioada: "emisa", tip: "serviciu", statut: "statutNota" },
    "reg-avize": { perioada: "solicitat", tip: "", statut: "statut" }
  };
  const BASE_LABEL = { perioada: "Perioada", tip: "Tip act permisiv", statut: "Statut" };
  const hasPersonal = (r) => Boolean(r?.personal?.length);
  function genConfig(r, { personal = false } = {}) {
    const v = clone(lastVersion(r).config);
    (r.personal || []).forEach((p) => {
      const i = v.columns.findIndex((c) => c.id === p.after);
      v.columns.splice(i < 0 ? v.columns.length : i + 1, 0, { id: p.id, names: { ro: p.name, ru: "", en: "" }, kind: "calc", field: "", formula: "", operands: {}, dataType: "text", header: "", total: "sum", hidden: !personal, personal: true });
    });
    const asked = X().askChips?.(v) || [];
    const base = [];
    Object.entries(BASE[v.source] || {}).forEach(([key, field]) => {
      if (!field || !X().fieldOf?.(v.source, field)) return;
      const own = asked.find((c) => c.field === field && c.op !== "not");
      if (own) { base.push({ key, id: own.id }); return; }
      const id = `b-${key}`;
      v.filters.unshift({ id, field, op: key === "perioada" ? "between" : "is", value: "", value2: "", values: [], ask: true });
      base.push({ key, id });
    });
    const me = who();
    const scope = [["autoritate", authName(me.authority)], ...(me.role === "supervisor" && me.unit ? [["subdiviziune", me.unit]] : [])];
    scope.forEach(([field, value]) => {
      if (v.columns.some((c) => c.kind === "source" && c.field === field) && (X().fieldOf?.(v.source, field)?.values || []).includes(value)) v.filters.push({ id: `s-${field}`, field, op: "is", value: "", value2: "", values: [value], ask: false });
    });
    v.filterConj = "and";
    v.boBase = base;
    return v;
  }

  /* ---------------------------------------------------------------- page state */
  const S = { id: "", st: new Map(), busy: false };
  const stOf = (id) => {
    if (!S.st.has(id)) S.st.set(id, { open: true, applied: {}, draft: null, q: "", gen: null, stale: false, seeded: false });
    return S.st.get(id);
  };
  const cur = () => (S.id ? stOf(S.id) : { open: true, applied: {}, draft: null, q: "" });
  const curConfig = () => { const r = reportOf(S.id); return r ? genConfig(r) : null; };
  /* the facets = the BO filters first (their own labels), then the report's own asked conditions (chip labels) */
  function facets() {
    const v = curConfig();
    if (!v) return [];
    const baseIds = new Map(v.boBase.map((b) => [b.id, b.key]));
    const chips = X().askChips?.(v) || [];
    const ordered = [...v.boBase.map((b) => chips.find((c) => c.id === b.id)).filter(Boolean), ...chips.filter((c) => !baseIds.has(c.id))];
    return ordered.map((c) => {
      const key = baseIds.get(c.id);
      const date = X().condKind?.(v, c) === "date";
      return {
        key: c.id,
        label: key ? BASE_LABEL[key] : X().chipLabel?.(v, c) || c.field,
        ...(date ? { type: "date", today: () => X().today } : {}),
        ...((X().fieldOf?.(v.source, c.field)?.values || []).length > 8 ? { search: true } : {})
      };
    });
  }
  const periodKey = (v) => v?.boBase.find((b) => b.key === "perioada")?.id || "";
  const periodOf = (v, sel) => (sel?.[periodKey(v)] || [])[0] || "";
  const periodText = (token) => window.GEAPFacetFilter?.dateText?.(token, X().today) || "";

  /* ONE facet controller for the module, on a host that outlives the re-renders (moved into `[data-rbo-fslot]`) */
  let FX = null;
  function fx() {
    if (FX) return FX;
    const host = document.createElement("div");
    host.className = "e-permits-rpt-fbar e-permits-rbo__fbar";
    host.innerHTML = `
      <div class="e-permits-rpt-fbar__tools">
        <div class="search-input medium rectangular e-permits-workplace__search e-permits-list-search e-permits-list-search--fill e-permits-rpt-fbar__search" data-rbo-q-box hidden>
          <span class="icon-search" aria-hidden="true">${icon("search")}</span>
          <input class="input" type="search" id="rbo-q" autocomplete="off" data-rbo-q aria-label="Caută în raport">
          <div class="btn-group"><button type="button" class="btn-icon clear" aria-label="Șterge căutarea" data-rbo-q-clear>${icon("cross-small", 16)}</button></div>
        </div>
        <button class="chip e-permits-filter-trigger e-permits-rpt-fbar__trigger" type="button" aria-expanded="false" aria-controls="rbo-fbar" data-rbo-filter-toggle>
          <span class="chip__icon"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-filter-lines"></use></svg></span>
          <span class="chip__label">Filtre</span>
          <span class="chip__badge" aria-hidden="true" data-rbo-filter-count hidden></span>
        </button>
      </div>
      <div class="e-permits-workplace__filters e-permits-rpt-fbar__bar" id="rbo-fbar" role="group" aria-label="Filtrele raportului" hidden></div>`;
    const model = (sel) => { const v = curConfig(); return v ? X().model(v, sel, cur().q) : { rowCount: 0, records: [] }; };
    const ctl = window.GEAPFacetFilter.create({
      bar: host.querySelector(".e-permits-rpt-fbar__bar"),
      toggle: host.querySelector("[data-rbo-filter-toggle]"),
      count: host.querySelector("[data-rbo-filter-count]"),
      state: () => {
        const st = cur();
        st.open = true;
        const keys = new Set(facets().map((f) => f.key));
        Object.keys(st.applied).forEach((k) => { if (!keys.has(k)) delete st.applied[k]; });
        if (st.draft) Object.keys(st.draft).forEach((k) => { if (!keys.has(k)) delete st.draft[k]; });
        return st;
      },
      pageKey: () => S.id,
      onPageChange: () => {},
      facets: () => facets(),
      allFacets: () => facets(),
      options: (facet) => {
        const v = curConfig();
        const c = v ? (X().askChips?.(v) || []).find((x) => x.id === facet.key) : null;
        if (!c) return [];
        const counts = new Map();
        model(null).records.filter((rec) => X().recMatch(v, rec, null)).forEach((rec) => { const x = rec[c.field]; if (x != null) counts.set(x, (counts.get(x) || 0) + 1); });
        const f = X().fieldOf(v.source, c.field);
        const order = f?.values?.length ? f.values : [...counts.keys()].sort((a, b) => String(a).localeCompare(String(b), "ro"));
        return order.filter((val) => counts.has(val)).map((val) => ({ value: val, count: counts.get(val) }));
      },
      total: () => model(cur().applied).rowCount,
      preview: (sel) => model(sel).rowCount,
      /* rbo-clear-v1 (2026-11-12): the facet controller only changes the state and calls `apply`; the page owns the bar render, so
         a chip × (or any commit) re-renders the bar HERE at once (before, the cleared chip showed only after the next click) */
      apply: () => { FX?.ctl.render(); filtersChanged(); },
      hint: false,
      /* rbo-chip-group-v1 (2026-11-12, user: „the × exactly as in RAP”): an applied facet = the RAP grey pill group [chip][round ×] */
      chipGroup: true,
      /* the rows show only after „Generează”: no live count in the bar */
      text: { results: () => "" }
    });
    host.insertAdjacentHTML("beforeend", `<p class="message message--inline message--error e-permits-fo-field__error e-permits-rbo__period-error" id="rbo-period-error" role="alert" aria-live="polite" data-rbo-period-error hidden>${icon("circle-error-filled", 20)}<span>${PERIOD_ERROR}</span></p>`);
    /* every bar render rebuilds the chips: re-mark the Perioada chip (error look + aria-invalid) after it */
    new MutationObserver(() => markPeriod()).observe(host.querySelector(".e-permits-rpt-fbar__bar"), { childList: true, subtree: true });
    FX = { host, ctl };
    return FX;
  }
  /* rbo-period-required-v1 (2026-11-12): Perioada is required. Clearing it (chip ×) or pressing „Generează” without it shows the
     field error pattern: chip `is-error` (danger border; the library chip has no error variant) + the inline message under the
     bar; choosing a period clears it */
  const PERIOD_ERROR = "Alege perioada raportului.";
  function markPeriod() {
    if (!FX) return;
    const v = curConfig();
    const st = cur();
    const on = Boolean(v && st.periodError && !periodOf(v, st.applied));
    const msg = FX.host.querySelector("[data-rbo-period-error]");
    if (msg.hidden === on) msg.hidden = !on;
    const chip = FX.host.querySelector(`[data-filter-facet="${CSS.escape(periodKey(v))}"]`);
    FX.host.querySelectorAll(".e-permits-rbo__fbar .chip.is-error").forEach((c) => { if (c !== chip || !on) { c.classList.remove("is-error"); c.removeAttribute("aria-invalid"); c.removeAttribute("aria-describedby"); } });
    if (chip && on && !chip.classList.contains("is-error")) { chip.classList.add("is-error"); chip.setAttribute("aria-invalid", "true"); chip.setAttribute("aria-describedby", "rbo-period-error"); }
  }
  function requirePeriod() {
    const st = cur();
    st.periodError = true;
    markPeriod();
    fx().host.querySelector(`[data-filter-facet="${CSS.escape(periodKey(curConfig()))}"]`)?.focus();
  }
  function syncSearch() {
    const x = fx();
    const v = curConfig();
    const box = x.host.querySelector("[data-rbo-q-box]");
    const input = box.querySelector("[data-rbo-q]");
    const on = Boolean(v && (X().askText?.(v) || []).length);
    box.hidden = !on;
    x.host.classList.toggle("has-search", on);
    if (!on) return;
    const names = [...new Set(X().askText(v).map((c) => (X().fieldOf(v.source, c.field)?.label || c.field).toLocaleLowerCase("ro")))].slice(0, 3);
    input.placeholder = `Caută după ${names.join(", ")}`;
    if (input.value !== cur().q) input.value = cur().q;
    box.classList.toggle("has-value", Boolean(cur().q));
    box.classList.toggle("is-ready", Boolean(cur().q));
  }
  function mountFilters() {
    const slot = document.querySelector("[data-reg-page]:not([hidden]) [data-rbo-fslot]");
    const x = fx();
    if (!slot) { if (x.host.isConnected) { x.ctl.close(false); x.host.remove(); } return; }
    slot.replaceWith(x.host);
    syncSearch();
    x.ctl.render();
  }

  /* ---------------------------------------------------------------- the list */
  /* rbo-list-toolbar-v1 (2026-11-12, user on 15570:33546: „do as we did for admin: search, filter, sort, put „Rapoartele tale”
     on top”): the BO list is a product registry on the shell engine (`GEAPShellRegistries["rapoarte-bo"]`, the same stacked
     list + toolbar as the builder's list RPT-01: search · „Filtrare” chip · „Sortează” chip, phones icon-only); the heading
     „Rapoartele tale · N rapoarte · Perimetru” sits ABOVE the toolbar (`listHeading`), the rows are grouped by category
     (`stackGroup`). Filters: Categorie · Sursa de date; sort: Denumire · Publicat · ID. No „Rapoartele mele”. */
  const KIND = "rapoarte-bo";
  const CAT_SHORT = { tabelar: "Tabelar", statistic: "Statistic" };
  const fold = (x) => String(x || "").normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("ro");
  const catName = (id) => (X().categories?.() || [{ id: "tabelar", name: "Rapoarte tabelare" }, { id: "statistic", name: "Rapoarte statistice" }]).find((c) => c.id === id)?.name || id;
  const catOrder = (name) => (X().categories?.() || [{ id: "tabelar" }, { id: "statistic" }]).findIndex((c) => catName(c.id) === name);
  const rowOf = (r) => {
    const v = lastVersion(r);
    return { id: r.id, denumire: nameOf(r), descriere: descOf(r), categorie: catName(v.config.category), tip: CAT_SHORT[v.config.category] || "", sursa: R().sourceName?.(v.config.source) || "", publicat: v.at || "" };
  };
  const stackItem = (row) => {
    const details = [esc(row.id), esc(row.tip), esc(row.sursa), `Actualizat ${esc(longDate(row.publicat))}`].filter(Boolean);
    return {
      plainTitle: row.denumire,
      title: esc(row.denumire),
      meta: row.descriere ? [`<span class="e-permits-rpt-list__desc" data-cell-tooltip="${esc(row.descriere)}">${esc(row.descriere)}</span>`] : details,
      meta2: row.descriere ? details : null
    };
  };
  function registryDb() {
    const rows = myReports(who()).map(rowOf);
    return {
      kind: KIND,
      fixedWidths: true,
      fieldCount: 4,
      pageSizes: [20, 40, 60],
      defaultSort: "denumire",
      defaultSortDirection: "asc",
      columns: {
        id: { label: "ID", width: 112, sortable: true },
        denumire: { label: "Denumire", width: 320, sortable: true },
        categorie: { label: "Categorie", width: 168, sortable: true },
        publicat: { label: "Publicat", width: 168, sortable: true }
      },
      views: {
        [KIND]: {
          title: TITLE,
          selectable: false,
          searchPlaceholder: "Caută după ID, denumire sau descriere",
          columns: ["id", "denumire", "categorie", "publicat"],
          tabs: [],
          primaryAction: null,
          toolbarLabel: "Filtrare rapoarte"
        }
      },
      runtimeRows: rows
    };
  }
  window.GEAPShellRegistries = window.GEAPShellRegistries || {};
  window.GEAPShellRegistries[KIND] = {
    build: registryDb,
    get facets() {
      return [
        { key: "categorie", label: "Categorie", get: (row) => row.categorie },
        { key: "sursa", label: "Sursa de date", get: (row) => row.sursa }
      ];
    },
    searchText: (row) => `${row.id} ${row.denumire} ${fold(row.denumire)} ${row.descriere} ${fold(row.descriere)}`,
    stackItem,
    stackClass: "e-permits-rpt-list e-permits-rbo__list",
    stackGroup: (row) => row.categorie,
    stackGroupOrder: catOrder,
    listHeading: () => {
      const me = who();
      return { title: "Rapoartele tale", meta: `${plural(myReports(me).length, "raport", "rapoarte")} · Perimetru: ${perimeter(me)}` };
    },
    sort: {
      keys: [{ value: "denumire", label: "Denumire" }, { value: "publicat", label: "Publicat" }, { value: "id", label: "ID" }],
      orders: (key) => ({
        denumire: [{ value: "asc", label: "A–Z" }, { value: "desc", label: "Z–A" }],
        publicat: [{ value: "desc", label: "Cele mai recente întâi" }, { value: "asc", label: "Cele mai vechi întâi" }],
        id: [{ value: "asc", label: "Crescător" }, { value: "desc", label: "Descrescător" }]
      })[key] || []
    },
    sortValue: (row, key) => String(row[key] ?? ""),
    filterToken: () => true,
    openRow: (id) => showReport(id, { push: true }),
    renderCell: (row, key) => esc(row[key] ?? ""),
    exportState: () => ({ hidden: true }),
    emptyHtml: ({ query } = {}) => E()?.noResults?.("Nicio potrivire găsită.", { text: "Caută după ID, denumire sau descriere ori schimbă filtrele." }) || ""
  };

  /* ---------------------------------------------------------------- the report page */
  const genMenu = (r, off) => {
    if (!hasPersonal(r)) return `<button class="btn btn-primary btn-sm" type="button" data-rbo-generate="fara"${off}>Generează</button>`;
    const items = [
      ["fara", "eye-slash", "Fără date cu caracter personal", "Implicit. Titularii și codurile personale nu apar."],
      ["cu", "eye-open", "Cu date cu caracter personal", "Cu titularii și IDNP / IDNO; se înregistrează în jurnal."]
    ];
    return `
      <div class="e-permits-stack__menu-wrap e-permits-rbo__menu">
        <button class="btn btn-primary btn-sm e-permits-stack__menu-trigger" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="rbo-gen-menu" data-stack-menu-trigger data-rbo-gen-trigger${off}><span>Generează</span>${icon("chevron-bottom", 16)}</button>
        <ul class="e-permits-fo-intent-menu e-permits-stack__menu e-permits-rpt-add-menu" id="rbo-gen-menu" role="menu" aria-label="Generează raportul" hidden data-stack-menu>
          ${items.map(([k, ic, text, desc]) => `<li role="none"><button class="e-permits-fo-intent-menu__item e-permits-rpt-add-menu__item" type="button" role="menuitem" data-rbo-generate="${k}">${icon(ic)}<span class="e-permits-rpt-add-menu__text"><span class="e-permits-rpt-add-menu__title">${esc(text)}</span><span class="e-permits-rpt-add-menu__desc">${esc(desc)}</span></span></button></li>`).join("")}
        </ul>
      </div>`;
  };
  const exportMenu = (st) => {
    const off = st.gen ? "" : ' aria-disabled="true" data-tooltip-reason="Generează mai întâi raportul."';
    return `
      <div class="e-permits-stack__menu-wrap e-permits-rbo__menu">
        <button class="btn btn-neutral btn-sm e-permits-stack__menu-trigger" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="rbo-export-menu"${st.gen ? " data-stack-menu-trigger" : ""} data-rbo-export-trigger${off}>${icon("export", 16)}<span>Exportă</span>${icon("chevron-bottom", 16)}</button>
        <ul class="e-permits-fo-intent-menu e-permits-stack__menu" id="rbo-export-menu" role="menu" aria-label="Formatul exportului" hidden data-stack-menu>
          <li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" data-rbo-export="csv">${icon("table")}<span>CSV · pentru Excel</span></button></li>
          <li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" data-rbo-export="pdf">${icon("document")}<span>PDF · pentru tipar</span></button></li>
        </ul>
      </div>`;
  };
  function headActions(r, st) {
    const v = curConfig();
    const off = periodOf(v, st.applied) ? "" : ' aria-disabled="true" data-tooltip-reason="Alege perioada."';
    return `<div class="e-permits-page-header__actions e-permits-rbo__actions" data-rbo-actions>${exportMenu(st)}${genMenu(r, off)}</div>`;
  }
  /* the personal columns: demo holders (PF name + IDNP, PJ name + IDNO), stable per row */
  const HOLDERS = [
    ["Ion Rusu", "2001004512783"], ["SRL „Farmacia Codru”", "1012600034517"], ["Maria Ceban", "2003012298461"],
    ["ÎI „Gheorghe Lungu”", "1009600012840"], ["SA „Lactis Nord”", "1003602004315"], ["Elena Munteanu", "2004001163059"],
    ["SRL „Biocid Pro”", "1015600027713"], ["Andrei Popa", "2000018845126"], ["SRL „Igiena Plus”", "1018600041962"]
  ];
  function fillPersonal(root, v) {
    const pcols = v.columns.filter((c) => c.personal && !c.hidden);
    if (!pcols.length || !root) return;
    [...root.querySelectorAll("tbody tr:not(.e-permits-rpt-table__group):not(.e-permits-rpt-table__subtotal)")].forEach((tr, i) => {
      const h = HOLDERS[i % HOLDERS.length];
      pcols.forEach((c, j) => {
        const td = tr.querySelector(`td[data-rpt-cell="${c.id}"]`);
        if (!td) return;
        const text = j === 0 ? h[0] : h[1];
        /* a code (IDNP / IDNO) = the compact copy value, as every record number in the table (components.md › Copy value) */
        td.innerHTML = j > 0 && window.GEAPCopyValue ? window.GEAPCopyValue.html(text, { compact: true, label: `Copiază ${text}` }) : `<span data-cell-tooltip="${esc(text)}">${esc(text)}</span>`;
      });
    });
  }
  function resultHtml(r, st) {
    const heading = (meta, tools = "") => `
      <div class="e-permits-dosar-profil__section-heading">
        <h3 class="e-permits-dosar-profil__section-title" id="rbo-result-title">Rezultat</h3>
        ${meta ? `<span class="e-permits-dosar-profil__section-meta">${esc(meta)}</span>` : ""}${tools}
      </div>`;
    if (S.busy) {
      return `<section class="e-permits-dosar-profil__section e-permits-rbo__result" aria-labelledby="rbo-result-title" aria-busy="true" data-rbo-result>${heading("")}${E()?.render({ title: "Se generează raportul…", loading: true }) || ""}</section>`;
    }
    if (!st.gen) {
      return `<section class="e-permits-dosar-profil__section e-permits-rbo__result" aria-labelledby="rbo-result-title" data-rbo-result>${heading("")}${E()?.render({ title: "Raportul nu este generat încă", text: "Alege filtrele de mai sus și apasă „Generează”.", icon: "table" }) || ""}</section>`;
    }
    const g = st.gen;
    const v = genConfig(r, { personal: g.personal });
    const m = X().model(v, g.sel, g.q);
    const meta = [`Generat azi, la ${hhmm(g.at)}`, g.period ? `Perioada: ${periodText(g.period)}` : "", g.personal ? "cu date cu caracter personal" : (hasPersonal(r) ? "fără date cu caracter personal" : ""), m.rowCount ? plural(m.rowCount, "rând", "rânduri") : ""].filter(Boolean).join(" · ");
    const stale = st.stale ? U().renderNotice?.("warning", "Ai schimbat filtrele după generare. Apasă „Generează” ca să vezi datele noi; exportul păstrează rezultatul de mai jos.", { className: "e-permits-rbo__stale" }) || "" : "";
    const body = m.rowCount
      ? X().table(v, { sel: g.sel, q: g.q }).replace(/ — previzualizare cu date demonstrative/, "")
      : E()?.render({ title: NO_DATA, text: "Alege altă perioadă sau schimbă filtrele, apoi generează din nou raportul.", icon: "calendar" }) || NO_DATA;
    return `<section class="e-permits-dosar-profil__section e-permits-rbo__result" aria-labelledby="rbo-result-title" data-rbo-result>${heading(meta)}${stale}${body}</section>`;
  }
  function pageHtml(r, me) {
    const st = stOf(r.id);
    const v = lastVersion(r);
    const desc = descOf(r);
    const info = desc ? `<button class="e-permits-fo-role-info" type="button" aria-label="Despre raport" data-tooltip-hint="${esc(desc)}">${icon("circle-info-filled", 16)}</button>` : "";
    const meta = [r.id, CAT_SHORT[v.config.category] ? `Raport ${CAT_SHORT[v.config.category].toLowerCase()}` : "", `Versiunea ${v.version}`, `Perimetru: ${perimeter(me)}`].filter(Boolean).join(" · ");
    return `
      <div class="e-permits-rbo e-permits-rbo--report" data-rbo-report="${esc(r.id)}">
        ${window.GEAPPageHeader?.backMarker({ label: TITLE, attr: "data-rbo-back" }) || ""}
        <div class="e-permits-rbo__head">
          <div class="e-permits-rbo__titles">
            <div class="e-permits-rbo__title-row">
              <h2 class="e-permits-dosar-profil__section-title" id="rbo-title" tabindex="-1">${esc(nameOf(r))}</h2>
              ${info}
            </div>
            <p class="e-permits-dosar-profil__section-meta">${esc(meta)}</p>
          </div>
          ${headActions(r, st)}
        </div>
        <div data-rbo-fslot></div>
        ${resultHtml(r, st)}
      </div>`;
  }
  function rerenderParts() {
    const r = reportOf(S.id);
    const root = document.querySelector("[data-reg-page]:not([hidden]) [data-rbo-report]");
    if (!r || !root) return;
    const st = stOf(r.id);
    const actions = root.querySelector("[data-rbo-actions]");
    const focusSel = document.activeElement?.matches?.("[data-rbo-export-trigger]") ? "[data-rbo-export-trigger]" : document.activeElement?.matches?.("[data-rbo-gen-trigger], [data-rbo-generate]") ? "[data-rbo-gen-trigger], [data-rbo-generate]" : "";
    if (actions) actions.outerHTML = headActions(r, st);
    const res = root.querySelector("[data-rbo-result]");
    if (res) res.outerHTML = resultHtml(r, st);
    if (st.gen && !S.busy) fillPersonal(root.querySelector("[data-rbo-result]"), genConfig(r, { personal: st.gen.personal }));
    if (focusSel) root.querySelector(focusSel)?.focus({ preventScroll: true });
  }
  function filtersChanged() {
    const st = cur();
    if (st.gen) st.stale = true;
    const v = curConfig();
    st.periodError = !periodOf(v, st.applied);
    markPeriod();
    rerenderParts();
  }

  /* ---------------------------------------------------------------- show */
  function showDenied() {
    document.querySelectorAll("[data-nav-item].is-active").forEach((link) => { link.classList.remove("is-active"); link.removeAttribute("aria-current"); });
    G().showPage?.(TITLE, E()?.render({ title: DENIED, text: "Rapoartele sunt disponibile rolurilor cu permisiunea «Generarea rapoartelor».", icon: "lock" }) || DENIED);
  }
  async function ready() {
    await (R().load?.() || Promise.resolve());
  }
  async function showList({ push = false } = {}) {
    const me = who();
    if (!me.has) { showDenied(); return; }
    A().setActiveNav?.(NAV);
    S.id = "";
    if (!R().all?.()?.length) G().showPage?.(TITLE, E()?.render({ title: "Se încarcă rapoartele…", loading: true }) || "");
    await ready();
    if (!myReports(me).length) G().showPage?.(TITLE, `<div class="e-permits-rbo e-permits-rbo--list">${E()?.render({ title: "Nu ai acces la rapoarte.", text: "Rapoartele se deschid rolurilor de Administratorul central, din „Acces” al fiecărui raport.", icon: "table" }) || ""}</div>`);
    else A().showRegistry?.(registryDb(), { sortKey: "denumire", sortDirection: "asc" });
    mountFilters();
    A().writeHash?.(`#${NAV}`, { push });
  }
  async function showReport(id, { push = false } = {}) {
    const me = who();
    if (!me.has) { showDenied(); return; }
    A().setActiveNav?.(NAV);
    await ready();
    const r = reportOf(id);
    if (!r) { showList(); return; }
    S.id = r.id;
    S.busy = false;
    const st = stOf(r.id);
    if (!st.seeded) {
      st.seeded = true;
      const key = periodKey(genConfig(r));
      if (key) st.applied[key] = [defaultPeriod()];
    }
    /* rbo-seed-v1: a demo link (`?rbo=generat` / `generat-cu`) opens the FIRST report already generated (no replay, no
       loading flash); a real visit never auto-generates — the user presses „Generează” (Feature) */
    const seedMode = demo.has("generat-cu") ? "cu" : demo.has("generat") ? "fara" : "";
    if (seedMode && !S.seededGen && !st.gen) {
      S.seededGen = true;
      const v = genConfig(r);
      st.gen = { sel: clone(st.applied), q: st.q, personal: seedMode === "cu" && hasPersonal(r), at: nowIso(), period: periodOf(v, st.applied) };
    }
    G().showPage?.(TITLE, pageHtml(r, me));
    mountFilters();
    if (st.gen) fillPersonal(document.querySelector("[data-reg-page]:not([hidden]) [data-rbo-result]"), genConfig(r, { personal: st.gen.personal }));
    A().writeHash?.(`#${NAV}/${r.id}`, { push });
  }

  /* ---------------------------------------------------------------- generate / export (+ the audit journal) */
  /* the builder's journal context (rapoarte-admin.js journalCtx), module BackOffice; `personal` = the record touched personal
     data (a generation / export „cu date cu caracter personal”) */
  const journalCtx = (r, me, personal) => ({ module: "BackOffice", authority: authName(me.authority), subdivision: me.role === "supervisor" ? me.unit : "", objectType: "Raport", objectId: r.id, objectVersion: `versiunea ${lastVersion(r).version}`, personal, related: [] });
  const journal = (r, type, detail, personal = false) => {
    const me = who();
    window.GEAPEventTimeline?.log?.({ at: nowIso(), user: A().currentUserName?.() || "", role: me.roleLabel, type, status: "Reușit", detail }, journalCtx(r, me, personal));
  };
  function generate(mode) {
    const r = reportOf(S.id);
    if (!r) return;
    const st = stOf(r.id);
    const v = genConfig(r);
    const period = periodOf(v, st.applied);
    if (!period) return;
    const personal = mode === "cu" && hasPersonal(r);
    st.gen = { sel: clone(st.applied), q: st.q, personal, at: nowIso(), period };
    st.stale = false;
    S.busy = true;
    rerenderParts();
    window.setTimeout(() => {
      S.busy = false;
      rerenderParts();
      const m = X().model(genConfig(r, { personal }), st.gen.sel, st.gen.q);
      journal(r, "Generarea raportului", [`Perioada: ${periodText(period)}`, personal ? "cu date cu caracter personal" : "fără date cu caracter personal", m.rowCount ? plural(m.rowCount, "rând", "rânduri") : "fără date"].join(" · "), personal);
      document.querySelector("[data-rbo-result] #rbo-result-title")?.focus?.({ preventScroll: true });
    }, 500);
  }
  function csvRows(table) {
    const head = [...table.querySelectorAll("thead tr:last-child th")];
    const header = table.querySelectorAll("thead tr").length > 1 ? flatHeader(table) : head.map((th) => th.innerText.trim());
    const rows = [...table.querySelectorAll("tbody tr:not([hidden]), tfoot tr")].map((tr) => [...tr.children].flatMap((cell) => {
      const text = cell.innerText.trim().replace(/\s+/g, " ");
      const span = Number(cell.getAttribute("colspan") || 1);
      return [text, ...Array(Math.max(0, Math.min(span, header.length) - 1)).fill("")];
    }));
    return { header, rows };
  }
  /* the two-level header as one row: a column under a common header = „<antet> · <coloană>” */
  function flatHeader(table) {
    const [first, second] = table.querySelectorAll("thead tr");
    const subs = [...second.children];
    let k = 0;
    return [...first.children].flatMap((th) => {
      if (th.getAttribute("rowspan") === "2") return [th.innerText.trim().replace(/\s+/g, " ")];
      const span = Number(th.getAttribute("colspan") || 1);
      return Array.from({ length: span }, () => `${th.innerText.trim()} · ${subs[k++]?.innerText.trim().replace(/\s+/g, " ") || ""}`);
    });
  }
  function exportAs(kind) {
    const r = reportOf(S.id);
    const st = r ? stOf(r.id) : null;
    if (!r || !st?.gen) return;
    const file = `${r.id}.${kind}`;
    const table = document.querySelector("[data-rbo-result] table");
    if (kind === "csv") {
      if (table) { const { header, rows } = csvRows(table); A().exportCsv?.(file, header, rows); }
      else A().exportCsv?.(file, ["Rezultat"], [[NO_DATA]]);
    }
    journal(r, "Exportul raportului", [kind.toUpperCase(), `Perioada: ${periodText(st.gen.period)}`, st.gen.personal ? "cu date cu caracter personal" : "fără date cu caracter personal"].join(" · "), st.gen.personal);
    toast(`Am exportat raportul în ${file}.`);
  }

  /* ---------------------------------------------------------------- events */
  const inPage = (el) => Boolean(el.closest?.("[data-reg-page]:not([hidden]) .e-permits-rbo"));
  document.addEventListener("click", (event) => {
    const t = event.target;
    if (!t.closest) return;
    if (t.closest(`[data-nav-item][data-nav-id="${NAV}"]`)) { showList(); return; }
    if (t.closest("[data-rbo-back]")) { showList({ push: true }); return; }
    if (!inPage(t) && !t.closest("#rbo-fbar, .e-permits-rbo__fbar")) return;
    const gen = t.closest("[data-rbo-generate]");
    if (gen) { if (gen.getAttribute("aria-disabled") !== "true") generate(gen.dataset.rboGenerate); else requirePeriod(); return; }
    const ex = t.closest("[data-rbo-export]");
    if (ex) { exportAs(ex.dataset.rboExport); return; }
    if (t.closest("[data-rbo-q-clear]")) { cur().q = ""; syncSearch(); fx().ctl.render(); filtersChanged(); }
  });
  /* an aria-disabled menu trigger (Generează without a period) never opens its menu */
  document.addEventListener("click", (event) => {
    const trg = event.target.closest?.("[data-rbo-gen-trigger][aria-disabled='true']");
    if (trg) { event.stopImmediatePropagation(); event.preventDefault(); requirePeriod(); }
  }, true);
  document.addEventListener("input", (event) => {
    const el = event.target;
    if (!el.matches?.("[data-rbo-q]")) return;
    cur().q = el.value;
    el.closest("[data-rbo-q-box]")?.classList.toggle("has-value", Boolean(el.value));
    filtersChanged();
  });

  /* ---------------------------------------------------------------- routes + the menu item (permission) */
  window.GEAPShellRoutes = window.GEAPShellRoutes || [];
  window.GEAPShellRoutes.push((h) => {
    const m = /^#rapoarte-bo(?:\/([^/]+))?$/.exec(h);
    if (!m) return false;
    if (m[1]) showReport(decodeURIComponent(m[1])); else showList();
    return true;
  });
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

  window.GEAPRapoarteBO = { showList, showReport, reports: () => myReports(), state: () => ({ id: S.id, ...cur() }), generate, exportAs };
})();
