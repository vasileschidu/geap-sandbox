(() => {
  "use strict";

  const DATA_URL = "../data/cabinet-evo.json?v=act-fields-v1";
  const SPRITE = "../assets/icons/sprite.svg";
  /* Figma marks only the suspended count with the accent badge */
  const ACCENT_STATES = ["suspendat"];

  /* act status → the BO / RAP Tag · Small tone (bordered, css/bo-profile-parts.css; US-162 AC-07:
     Valabil green, Suspendat warning, Expirat / Retras / Anulat red — 2026-10-17 alignment with RAP) */
  const ACT_TONE = {
    valabil: "success",
    suspendat: "warning",
    expirat: "danger",
    retras: "danger",
    anulat: "danger",
  };
  /* the BO renderTag markup (Tag · Small) — every status / result tag in the Cabinet */
  const tagHtml = (label, tone = "neutral", extra = "") =>
    `<span class="e-permits-workplace__tag e-permits-workplace__tag--${tone}"${extra}>${String(label).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch])}</span>`;
  /* „Aprobare tacită” (RAP / US-139): the blue Small tag beside the status */
  const tacitTagHtml = () => tagHtml("Aprobare tacită", "info");

  /* Feature 90818 / 89533 — GEAP acts come from the same data the front
     office uses (acte-permisive.json → intent): status × post-process
     matrix, the service passport (allows), paper acts and acts with a
     post-process already in progress. The perspective is ?as=<subject>. */
  const GEAP_URL = "../data/acte-permisive.json";
  const FO_URL = "../e-permits-acte-permisive.html";

  /* notice tone → library banner variant (subtle tint, per Figma) */
  const NOTICE_CLASS = {
    warning: "banner--warning",
    danger: "banner--error",
  };

  const els = {
    list: document.querySelector("[data-cab-list]"),
    pager: document.querySelector("[data-cab-pager]"),
    toolbar: document.querySelector("[data-cab-toolbar]"),
    restriction: document.querySelector("[data-cab-restriction]"),
    filterToggle: document.querySelector("[data-cab-filter-toggle]"),
    filterBar: document.querySelector("[data-cab-filters]"),
    filterCount: document.querySelector("[data-cab-filter-count]"),
    empty: document.querySelector("[data-cab-empty]"),
    search: document.querySelector("[data-cab-search]"),
    searchClear: document.querySelector("[data-cab-search-clear]"),
    title: document.querySelector("[data-cab-title]"),
    headerTitle: document.querySelector("[data-cab-header-title]"),
    name: document.querySelector("[data-cab-name]"),
    role: document.querySelector("[data-cab-role]"),
    avatarMenu: document.querySelector("[data-fo-avatar-menu]"),
    avatarTrigger: document.querySelector("[data-fo-avatar-trigger]"),
    avatarPanel: document.querySelector("[data-fo-avatar-dropdown]"),
  };

  const state = {
    permits: [], query: "", geap: null, detail: null, dosarByAct: {}, dosarNrByAct: {}, actProfiles: {}, help: {},
    /* the shared facet filter (js/facet-filter.js) — applied values per facet, the bar's draft */
    filter: { open: false, applied: {}, draft: null },
    page: 1,
    perPage: 10,
    /* Feature 90818 / US-159: a representative whose MPower expired or was revoked sees no act */
    restriction: null,
  };
  const PER_PAGE = [10, 25, 50, 100];

  /* ---------- compartments ----------
     One page, three views (?view=): Solicitările mele (solicitari.js), Actele mele
     permisive (this file) and the public catalog (catalog.js). ?as=<subject> is the
     perspective, ?auth=0 a visitor without an MPass session (catalog only). */
  const params = new URLSearchParams(window.location.search);
  const VIEWS = {
    solicitari: { title: "Solicitările mele" },
    acte: { title: "Actele mele permisive" },
    catalog: { title: "Catalogul serviciilor" },
    /* minimal stand-in of the EVO „Notificări” compartment (notificari.js) — the GEAP events of US-19 AC-20 / US-135 */
    notificari: { title: "Notificări" },
  };
  const VIEW = VIEWS[params.get("view")] ? params.get("view") : "acte";
  const AUTH = params.get("auth") !== "0";
  const SUBJECT = params.get("as") || "pj-global-trader";

  /* a cabinet URL that keeps the perspective (and the visitor mode) */
  function cabUrl(view, extra = {}, hash = "") {
    const next = new URLSearchParams({ view });
    if (params.get("as")) next.set("as", params.get("as"));
    if (!AUTH) next.set("auth", "0");
    Object.entries(extra).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== "") next.set(key, value); });
    return `?${next.toString()}${hash}`;
  }

  const MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
  /* „8 iulie 2026” from ISO (2026-07-08[THH:MM]) or the acts' DD.MM.YYYY */
  function longDate(value) {
    const text = String(value || "");
    let match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
    if (match) return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
    match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(text);
    if (match) return `${Number(match[1])} ${MONTHS[Number(match[2]) - 1]} ${match[3]}`;
    return text;
  }
  /* „26 iunie 2026, 13:50” */
  function longDateTime(iso) {
    const time = /T(\d{2}:\d{2})/.exec(String(iso || ""));
    return time ? `${longDate(iso)}, ${time[1]}` : longDate(iso);
  }

  function applyView() {
    document.querySelectorAll("[data-cab-view]").forEach((view) => { view.hidden = view.dataset.cabView !== VIEW; });
    document.querySelectorAll("[data-cab-nav-item]").forEach((link) => {
      const id = link.dataset.cabNavItem;
      const active = id === VIEW;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
      link.setAttribute("href", cabUrl(id));
      /* a visitor only sees the public catalog (US-19 AC-01: the rest needs MPass) */
      link.hidden = !AUTH && id !== "catalog";
    });
    if (!AUTH) {
      els.avatarMenu?.setAttribute("hidden", "");
      document.querySelector("[data-cab-login]")?.removeAttribute("hidden");
      document.querySelector("[data-cab-login]")?.setAttribute("href", `?view=catalog${window.location.hash}`);
    }
    setHeaderTitle(VIEWS[VIEW].title);
  }

  function setHeaderTitle(title) {
    els.headerTitle.textContent = title;
    document.title = `${title} · EVO Cabinet`;
  }

  /* case- and diacritic-insensitive search (US-158 AC-02 rule, shared with Solicitările mele) */
  const fold = (text) => String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const icon = (id, size = "small") =>
    `<svg class="icon ${size}" aria-hidden="true"><use href="${SPRITE}#${id}"></use></svg>`;

  const escape = (value) =>
    String(value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[ch]);

  /* the library copy-value component, with its Copiază / Copiat tooltip */
  function copyValueHtml(value) {
    const safe = escape(value);
    return `
      <button
        class="e-permits-fo-copy-value"
        type="button"
        data-fo-copy-value="${safe}"
        aria-label="Copiază numărul dosarului ${safe}"
      >
        <span>${safe}</span>
        ${icon("icon-copy", "medium")}
        <span class="e-permits-fo-copy-value__tooltip" aria-hidden="true">
          <span class="e-permits-fo-copy-value__tooltip-default">Copiază</span>
          <span class="e-permits-fo-copy-value__tooltip-copied">
            ${icon("icon-checkmark-small")}<span>Copiat</span>
          </span>
        </span>
      </button>`;
  }

  /* ---------- rendering ---------- */

  /* „Filtre” = the shared facet filter (js/facet-filter.js, as on RAP): the BO bar + popovers on
     desktop, the RAP phone mode (chip row + bottom sheets) ≤760. OR inside a facet, AND across
     facets and with the search. Values come from the acts themselves (no new data). */
  const FACETS = [
    { key: "status", label: "Statut", get: (permit) => permit.statusLabel },
    { key: "denumire", label: "Denumire act", get: (permit) => permit.serviceTitle },
    { key: "autoritate", label: "Autoritate", get: (permit) => state.help[permit.service?.authority]?.name || permit.service?.authority },
    { key: "subdiviziune", label: "Subdiviziunea autorității", get: (permit) => permit.subdivision },
  ];
  const facetValues = (facet, permit) => [].concat(facet.get(permit) ?? []).filter(Boolean);
  const matchesFacets = (permit, except = null, selection = state.filter.applied) => Object.entries(selection).every(([key, values]) => {
    if (key === except || !values?.length) return true;
    const facet = FACETS.find((f) => f.key === key);
    return !facet || facetValues(facet, permit).some((value) => values.includes(value));
  });
  /* US-55 AC-06 / the placeholder: the act number and the act name (object + act type) */
  const matchesSearch = (permit) => {
    const query = fold(state.query.trim());
    return !query || fold([permit.number || permit.dossier, permit.title, permit.serviceTitle].join(" ")).includes(query);
  };
  const facetOptions = (facet, selection = state.filter.applied) => {
    const counts = new Map();
    state.permits.forEach((permit) => {
      if (!matchesSearch(permit) || !matchesFacets(permit, facet.key, selection)) return;
      new Set(facetValues(facet, permit)).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
    });
    (selection[facet.key] || []).forEach((value) => { if (!counts.has(value)) counts.set(value, 0); });
    return [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => a.value.localeCompare(b.value, "ro", { numeric: true }));
  };
  /* a facet is offered when the acts have at least two values for it (BO / RAP rule) */
  const availableFacets = () => FACETS.filter((facet) => {
    if (state.filter.applied[facet.key]?.length) return true;
    return new Set(state.permits.flatMap((permit) => facetValues(facet, permit))).size > 1;
  });
  const STATUS_BY_LABEL = () => Object.fromEntries(state.permits.map((permit) => [permit.statusLabel, permit.status]));
  let facetFilter = null;
  function initFacetFilter() {
    if (!window.GEAPFacetFilter || !els.filterBar) return;
    facetFilter = window.GEAPFacetFilter.create({
      bar: els.filterBar,
      toggle: els.filterToggle,
      count: els.filterCount,
      sprite: SPRITE,
      state: () => state.filter,
      facets: availableFacets,
      allFacets: () => FACETS,
      options: facetOptions,
      /* status values read as the cards' Small tags */
      tag: (value, facet) => (facet.key === "status" ? tagHtml(value, ACT_TONE[STATUS_BY_LABEL()[value]] || "neutral") : null),
      total: () => visiblePermits().length,
      mobileSheets: true,
      preview: (selection) => state.permits.filter((permit) => matchesSearch(permit) && matchesFacets(permit, null, selection)).length,
      apply: () => { state.page = 1; render(); },
    });
  }

  /* the acts list = the FO „Ce vrei să soliciți?” act rows (user 2026-10-17: „as we show for the cum vrei să
     soliciți flow screen”) — the SAME renderer as FO #intent and the Ghișeu (js/act-row.js, GEAPActRow.html):
     blue document icon · title + the Cabinet Small tag (+ „Aprobare tacită”) · meta number · validity ·
     authority · subdivision (text, no institution icon) · the „Inițiază un postproces ⌄” pill when a
     post-process is available. Cabinet extras: the whole row opens the act profile (row hook + keyboard); a
     locked act = the FO locked notice (pill disabled); a paper act = the same notice slot in the info tone; no
     pill when nothing can be started (expired / withdrawn / paper). The old ⋮ („Detalii” = the row click,
     „Descarcă actul (MDocs)” = the profile's „Vezi act permisiv” → Descarcă) is gone. */
  function cardMarkup(permit) {
    const tacit = (permit.tacit || state.actProfiles[permit.id]?.tacitApprovalDate) && permit.status === "valabil" ? tacitTagHtml() : "";
    const validity = permit.status === "expirat" ? `expirat la ${longDate(permit.validUntil)}` : `valabil până la ${longDate(permit.validUntil)}`;
    const pending = permit.pending ? { title: `${permit.pendingLabel} în curs`, text: `· dosar ${permit.pending.dossier}. Poți iniția un alt postproces după finalizarea acestuia.` } : null;
    return window.GEAPActRow.html({
      id: permit.id,
      name: permit.title,
      status: permit.status,
      statusLabel: permit.statusLabel,
      meta: [permit.number, validity, permit.service?.authority, permit.subdivision],
    }, {
      menuId: `cab-menu-${permit.id}`,
      items: permit.postProcesses,
      assets: "../assets/",
      attrs: `tabindex="0" data-cab-card="${escape(permit.id)}" aria-label="${escape(`${permit.title} — ${permit.statusLabel}`)}"`,
      tagHtml: tagHtml(permit.statusLabel, ACT_TONE[permit.status]),
      extraTagsHtml: tacit,
      triggerAttrs: "data-cab-menu-trigger",
      itemAttrs: (pp) => `data-cab-pp="${escape(pp.id)}" data-cab-act="${escape(permit.id)}"`,
      pendingTitle: pending ? pending.title : "",
      pendingText: pending ? pending.text : permit.paper ? PAPER_TEXT : "",
      noticeTone: pending ? "warning" : "info",
      noticeIcon: pending ? "icon-time" : "icon-circle-info-filled",
      noticeLocks: Boolean(pending),
      hideEmptyAction: true,
    });
  }

  function visiblePermits() {
    return state.permits.filter((permit) => matchesSearch(permit) && matchesFacets(permit));
  }

  /* same contract as rap-evo: main.css reveals .btn-icon.clear on is-ready */
  function syncSearchState() {
    const hasValue = Boolean(els.search.value);
    const container = els.search.closest(".search-input");
    container?.classList.toggle("has-value", hasValue);
    container?.classList.toggle("is-ready", hasValue);
    els.searchClear.disabled = !hasValue;
  }

  function render() {
    if (state.restriction) { renderRestriction(); return; }
    const permits = visiblePermits();
    const pages = Math.max(1, Math.ceil(permits.length / state.perPage));
    state.page = Math.min(state.page, pages);
    const pageItems = permits.slice((state.page - 1) * state.perPage, state.page * state.perPage);
    els.list.innerHTML = pageItems.length ? `<ul class="e-permits-fo-intent__list cab-act-list">${pageItems.map(cardMarkup).join("")}</ul>` : "";
    els.list.hidden = !pageItems.length;
    els.pager.innerHTML = pagerHtml({ total: permits.length, page: state.page, perPage: state.perPage, prefix: "cab", label: "Paginarea actelor permisive", sizeLabel: "Acte pe pagină" });
    els.pager.hidden = !els.pager.innerHTML.trim();
    els.empty.hidden = permits.length > 0;
    /* the shared empty state: no acts at all (an unknown subject too) vs. nothing matches the
       search / filters */
    els.empty.innerHTML = permits.length ? "" : state.permits.length
      ? window.GEAPEmptyState.noResults("Niciun act permisiv nu corespunde căutării", {
        text: state.query.trim() ? "Verificați ortografia sau încercați alți termeni." : "Alegeți alte valori sau resetați filtrele.",
        actionHtml: '<button class="btn btn-neutral btn-sm" type="button" data-cab-reset>Resetează filtrele</button>'
      })
      : window.GEAPEmptyState.render({ title: "Nu aveți acte permisive", text: "Actele emise pe numele dvs. apar aici.", icon: "page-text" });
    /* no acts at all: nothing to search or filter */
    if (els.toolbar) els.toolbar.hidden = !state.permits.length;
    syncSearchState();
    facetFilter?.render();
  }

  /* Feature 90818 (§4, AC) + US-159: when the representative's MPower expired or was revoked the
     access is restricted COMPLETELY on the acts side — no list, no search, no actions, only the
     restriction notice (the requests side keeps the read-only history, US-159 AC-06) */
  function restrictionHtml(ro, text) {
    return `
      <div class="e-permits-callout e-permits-callout--neutral cab-callout" role="status">
        <span class="e-permits-callout__icon" aria-hidden="true">${icon("icon-lock", "medium")}</span>
        <div class="e-permits-callout__content">
          <p class="e-permits-callout__title">Împuternicirea MPower a ${ro.reason === "revocat" ? "fost revocată" : "expirat"} pe ${escape(longDate(ro.since))}</p>
          <p class="e-permits-callout__text">${escape(text)}</p>
        </div>
      </div>`;
  }
  function renderRestriction() {
    const name = state.geap?.subject?.name || "beneficiar";
    [els.toolbar, els.filterBar, els.list, els.pager, els.empty].forEach((el) => { if (el) el.hidden = true; });
    els.restriction.hidden = false;
    els.restriction.innerHTML = restrictionHtml(state.restriction, `Actele permisive ale ${name} nu mai sunt disponibile pentru dumneavoastră: vizualizarea, descărcarea formularului și postprocesele rămân doar la beneficiar. Pentru acces, cereți beneficiarului o împuternicire nouă în MPower.`);
  }

  /* the Cabinet pager (Solicitările mele, Actele mele permisive): „1–10 din 23” · pages · „10 pe pagină ▾”;
     none up to the smallest page size. prefix names the data hooks (data-<prefix>-page / -per-page) */
  function pagerHtml({ total, page, perPage, prefix, label, sizeLabel, sizes = PER_PAGE }) {
    if (total <= sizes[0]) return "";
    const pages = Math.max(1, Math.ceil(total / perPage));
    const first = (page - 1) * perPage + 1;
    const last = Math.min(total, page * perPage);
    const link = (target, text, { disabled = false, active = false, aria = "" } = {}) => `
      <span class="pagination__item">
        <button class="pagination__link${active ? " pagination__link--active" : ""}${disabled ? " pagination__link--disabled" : ""}" type="button" data-${prefix}-page="${target}"${disabled ? " disabled" : ""}${active ? ' aria-current="page"' : ""}${aria ? ` aria-label="${aria}"` : ""}>${text}</button>
      </span>`;
    return `
      <div class="cab-pager">
        <p class="cab-pager__range">${first}–${last} din ${total}</p>
        <nav class="pagination" aria-label="${escape(label)}">
          ${link(page - 1, icon("icon-chevron-left-small", "medium"), { disabled: page === 1, aria: "Pagina anterioară" })}
          ${Array.from({ length: pages }, (_, index) => link(index + 1, String(index + 1), { active: index + 1 === page, aria: `Pagina ${index + 1}` })).join("")}
          ${link(page + 1, icon("icon-chevron-right-small", "medium"), { disabled: page === pages, aria: "Pagina următoare" })}
        </nav>
        <div class="e-permits-fo-intent-act__action">
          <button class="btn btn-text-neutral btn-sm cab-pager__size" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="${prefix}-per-page" data-cab-menu-trigger><span>${perPage} pe pagină</span><svg class="icon small" aria-hidden="true"><use href="${SPRITE}#icon-chevron-bottom"></use></svg></button>
          <ul class="e-permits-fo-intent-menu e-permits-stack__menu cab-menu cab-menu--compact" id="${prefix}-per-page" role="menu" aria-label="${escape(sizeLabel)}" hidden>
            ${sizes.map((size) => `<li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitemradio" aria-checked="${size === perPage}" data-${prefix}-per-page="${size}"><span>${size} pe pagină</span>${size === perPage ? icon("icon-checkmark-large", "medium") : ""}</button></li>`).join("")}
          </ul>
        </div>
      </div>`;
  }

  /* ---------- header role switcher ----------
     Ported from js/e-permits-acte-permisive.js (setFrontOfficeAvatarMenuOpen /
     setDropdownHidden / updateFrontOfficeAvatarMenuScrollState). The CSS keys the
     focus ring and the chevron rotation off .e-permits-fo-auth__profile.is-open,
     and the exit animation off .is-closing on the dropdown, so both classes have
     to be driven exactly as the full flow drives them. */

  const dropdownMotionTimers = new WeakMap();

  function setDropdownHidden(element, shouldHide) {
    if (!element) return;
    const existingTimer = dropdownMotionTimers.get(element);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
      dropdownMotionTimers.delete(element);
    }

    if (!shouldHide) {
      element.classList.remove("is-closing");
      element.hidden = false;
      return;
    }

    if (element.hidden) return;
    element.classList.add("is-closing");
    const timer = window.setTimeout(() => {
      element.hidden = true;
      element.classList.remove("is-closing");
      dropdownMotionTimers.delete(element);
    }, 105);
    dropdownMotionTimers.set(element, timer);
  }

  function updateAvatarMenuScrollState() {
    const dropdown = els.avatarPanel;
    if (!dropdown) return;
    const content = dropdown.querySelector(".e-permits-fo-avatar-menu__content");
    if (!content) return;
    dropdown.classList.toggle("has-scroll", content.scrollHeight > content.clientHeight + 1);
    dropdown.classList.toggle("is-scrolled", content.scrollTop > 0);
  }

  function setAvatarMenuOpen(isOpen) {
    const { avatarMenu, avatarTrigger, avatarPanel } = els;
    if (!avatarMenu || !avatarTrigger || !avatarPanel) return;
    avatarMenu.classList.toggle("is-open", isOpen);
    setDropdownHidden(avatarPanel, !isOpen);
    avatarTrigger.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) requestAnimationFrame(updateAvatarMenuScrollState);
  }

  function bindAvatarMenu() {
    const { avatarMenu, avatarTrigger, avatarPanel } = els;
    if (!avatarMenu || !avatarTrigger || !avatarPanel) return;

    avatarTrigger.addEventListener("click", (event) => {
      event.preventDefault();
      setAvatarMenuOpen(!avatarMenu.classList.contains("is-open"));
    });

    document.addEventListener("click", (event) => {
      if (!avatarMenu.classList.contains("is-open")) return;
      if (avatarMenu.contains(event.target)) return;
      setAvatarMenuOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !avatarMenu.classList.contains("is-open")) return;
      setAvatarMenuOpen(false);
      avatarTrigger.focus();
    });

    avatarPanel.addEventListener("click", (event) => {
      const proxyToggle = event.target.closest("[data-fo-avatar-proxy-toggle]");
      if (proxyToggle) {
        event.preventDefault();
        const group = proxyToggle.closest(".e-permits-fo-avatar-menu__group");
        const label = proxyToggle.querySelector("[data-fo-avatar-proxy-label]");
        const isExpanded = !group?.classList.contains("is-expanded");
        group?.classList.toggle("is-expanded", isExpanded);
        proxyToggle.setAttribute("aria-expanded", String(isExpanded));
        if (label) label.textContent = isExpanded ? "Arată mai puține" : "Arată mai multe";
        requestAnimationFrame(updateAvatarMenuScrollState);
        return;
      }

      const perspective = event.target.closest("[data-cab-as]");
      if (perspective && perspective.dataset.cabAs !== SUBJECT) {
        const next = new URLSearchParams(window.location.search);
        next.set("as", perspective.dataset.cabAs);
        window.location.assign(`?${next.toString()}`);
        return;
      }
      const role = event.target.closest("[data-fo-avatar-role]");
      if (!role) return;
      avatarPanel.querySelectorAll("[data-fo-avatar-role]").forEach((other) => {
        other.classList.toggle("is-selected", other === role);
        other.setAttribute("aria-checked", String(other === role));
      });
      const copy = role.querySelector(".e-permits-fo-avatar-menu__role-copy");
      if (copy && els.name) els.name.textContent = copy.querySelector("strong")?.textContent || "";
      if (copy && els.role) els.role.textContent = copy.querySelector("span")?.textContent || "";
      setAvatarMenuOpen(false);
    });

    avatarPanel
      .querySelector(".e-permits-fo-avatar-menu__content")
      ?.addEventListener("scroll", updateAvatarMenuScrollState, { passive: true });
  }

  /* ---------- interaction ---------- */

  function bind() {
    els.search.addEventListener("input", (event) => {
      state.query = event.target.value;
      state.page = 1;
      render();
    });

    els.searchClear.addEventListener("click", () => {
      state.query = "";
      state.page = 1;
      els.search.value = "";
      els.search.focus();
      render();
    });

    els.empty.addEventListener("click", (event) => {
      if (!event.target.closest("[data-cab-reset]")) return;
      state.query = "";
      state.filter.applied = {};
      state.filter.draft = null;
      state.page = 1;
      els.search.value = "";
      render();
      els.search.focus();
    });

    els.pager.addEventListener("click", (event) => {
      const size = event.target.closest("[data-cab-per-page]");
      if (size) { state.perPage = Number(size.dataset.cabPerPage); state.page = 1; closeMenus(); render(); return; }
      const page = event.target.closest("[data-cab-page]");
      if (page && !page.disabled) { state.page = Number(page.dataset.cabPage); render(); document.querySelector("#cab-title")?.scrollIntoView({ block: "start" }); }
    });

    bindAvatarMenu();

    /* same contract as the front-office copy handler */
    document.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-fo-copy-value]");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();

      window.clearTimeout(button._foCopyTimer);
      try {
        await navigator.clipboard.writeText(button.dataset.foCopyValue || "");
        button.classList.add("is-copied");
        button._foCopyTimer = window.setTimeout(() => {
          button.classList.remove("is-copied");
        }, 1500);
      } catch {
        /* clipboard unavailable (insecure context) — number stays selectable */
      }
    });
  }

  /* ---------- GEAP acts (post-processes) ---------- */

  const PENDING_TEXT = (label, dossier) => `${label} în curs · dosar ${dossier}. Poți iniția un alt postproces după finalizarea acestuia.`;
  const PAPER_TEXT = "Act emis pe hârtie, în afara GEAP. Postprocesele sunt disponibile doar la ghișeul autorității emitente.";

  async function loadGeapActs() {
    const response = await fetch(GEAP_URL);
    if (!response.ok) return { acts: [], config: {} };
    const data = await response.json();
    const config = data.frontOfficeFlows?.[0]?.intent || {};
    const subjectId = SUBJECT;
    /* demo only (?acte=multe): the subject's acts + numbered copies, so the list paginates (> 10) */
    const own = config.acts?.[subjectId] || [];
    const source = params.get("acte") === "multe"
      ? [...own, ...own.flatMap((act, round) => [1, 2].map((n) => ({ ...act, id: `${act.id}-${n}`, number: `${act.number}/${n}`, name: act.name.replace(/,/, ` ${n + 1},`), pending: null, ...(round + n) % 3 ? {} : { status: "expirat", statusLabel: "Expirat" } })))]
      : own;
    const acts = source.map((act) => {
      const service = config.services?.[act.service] || {};
      const allowed = service.allows || [];
      const postProcesses = act.paper ? [] : (config.availability?.[act.status] || [])
        .filter((id) => allowed.includes(id) && config.postProcesses?.[id])
        .map((id) => ({ id, ...config.postProcesses[id] }));
      const pendingLabel = act.pending ? config.postProcesses?.[act.pending.type]?.label || act.pending.type : "";
      let notice = null;
      if (act.paper) notice = { tone: "info", icon: "icon-circle-info-filled", text: PAPER_TEXT };
      else if (act.pending) notice = { tone: "warning", icon: "icon-time", text: PENDING_TEXT(pendingLabel, act.pending.dossier) };
      return {
        ...act,
        geap: true,
        title: act.name,
        serviceTitle: service.shortTitle || service.title,
        service: service,
        serviceCode: act.service,
        authority: [service.authority, act.subdivision].filter(Boolean).join(" · "),
        dossier: act.number,
        date: act.status === "expirat" ? `expirat la ${longDate(act.validUntil)}` : `valabil până la ${longDate(act.validUntil)}`,
        dateIcon: "icon-calendar",
        postProcesses,
        pendingLabel,
        notice,
      };
    });
    const subject = (data.frontOfficeFlows?.[0]?.subjects || []).find((item) => item.id === subjectId);
    return { acts, config, subjectId, subject };
  }

  /* a menu that would run past the screen edge opens towards the other side (phones: a ⋮ after
     two tags sits far right, the left-anchored menu ran 40px off-screen) */
  function fitMenu(menu) {
    menu.classList.remove("is-end", "is-start");
    const rect = menu.getBoundingClientRect();
    const edge = document.documentElement.clientWidth;
    if (rect.right > edge) menu.classList.add("is-end");
    else if (rect.left < 0) menu.classList.add("is-start");
  }

  function closeMenus(except = null) {
    document.querySelectorAll("[data-cab-menu-trigger]").forEach((trigger) => {
      const menu = document.getElementById(trigger.getAttribute("aria-controls"));
      if (!menu || menu === except) return;
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    });
  }

  function foUrl(act, pp) {
    const params = new URLSearchParams({ flow: "full", pp: pp.id, act: act.id });
    return `${FO_URL}?${params.toString()}#request`;
  }

  /* the consequence confirmation for Suspendare / Retragere — a UX proposal,
     not in the spec (same modal as the front office) */
  function confirmPostprocess(act, pp) {
    if (pp.kind !== "consequential") {
      window.location.assign(foUrl(act, pp));
      return;
    }
    let modal = document.querySelector("[data-cab-pp-modal]");
    if (!modal) {
      modal = document.createElement("div");
      modal.className = "e-permits-fo-instance-switch-modal";
      modal.dataset.cabPpModal = "";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-labelledby", "cab-pp-title");
      document.body.appendChild(modal);
    }
    /* tone = the consequence (user 2026-10-18: „retrage with amber or red, not blue”): Suspendare (reversible) =
       amber icon, Retragere / Anulare (definitive) = red icon; the confirm is the red danger button for all three */
    const tone = pp.id === "suspendare" ? "warning" : "danger";
    modal.innerHTML = `
      <div class="e-permits-fo-instance-switch-modal__card" tabindex="-1">
        <div class="e-permits-fo-instance-switch-modal__body">
          <div class="e-permits-fo-instance-switch-modal__icon e-permits-fo-instance-switch-modal__icon--${tone}" aria-hidden="true">${icon("icon-warning-filled", "medium")}</div>
          <div class="e-permits-fo-instance-switch-modal__content">
            <h2 id="cab-pp-title">${escape(pp.label)}</h2>
            <div class="e-permits-fo-instance-switch-modal__description">
              <p>${escape(pp.consequence || "")}</p>
              <p>Act: <strong>${escape(act.title)} · ${escape(act.number)}</strong></p>
            </div>
          </div>
        </div>
        <div class="e-permits-fo-instance-switch-modal__actions">
          <button class="e-permits-fo-instance-switch-modal__secondary" type="button" data-cab-pp-cancel>Anulează</button>
          <a class="e-permits-fo-instance-switch-modal__primary e-permits-fo-instance-switch-modal__primary--danger" href="${escape(foUrl(act, pp))}" data-cab-pp-confirm>Confirm și continui</a>
        </div>
      </div>`;
    modal.hidden = false;
    modal.querySelector("[data-cab-pp-cancel]")?.focus();
  }

  /* ---------- act profile = the RAP act profile seen by the owner (2026-10-17 alignment) ----------
     The public BO header (Numărul actului · Stare · the status date · Data expirării; „Vezi act
     permisiv” = the primary, then „Inițiază un postproces ▾” and „Vezi solicitarea”), the paper /
     pending notice, then BO sections: Beneficiar (the FO identity card), Detalii act (US-162 AC-17:
     „Data suspendării actului permisiv” + „Suspendat până la data de” only for Suspendat, „Data
     retragerii actului permisiv” only for Retras, „Data aprobării tacite” + the blue badge for a tacit
     act), Autoritatea emitentă. „Vezi act permisiv” → the RAP „Vizualizare act” data modal, its
     „Descarcă” → „Forma de tipar a actului” (MDocs A4) = the shared GEAPActView (js/act-view.js). */
  const actProfileOf = (act) => state.actProfiles[act.id] || {};
  const isTacitAct = (act) => Boolean(actProfileOf(act).tacitApprovalDate);
  function actStatusDates(act) {
    const profile = actProfileOf(act);
    return [
      ...(act.status === "suspendat" ? [["Data suspendării actului permisiv", longDate(profile.suspensionDate)], ["Suspendat până la data de", longDate(profile.suspendedUntil)]] : []),
      ...(act.status === "retras" ? [["Data retragerii actului permisiv", longDate(profile.withdrawalDate)]] : []),
    ].filter(([, value]) => value);
  }
  /* the header item beside Stare: a suspended act shows when the suspension ends, a withdrawn one when it
     was withdrawn, otherwise „Valabil din data” (the RAP headerDateItem) */
  function actHeaderDate(act) {
    const profile = actProfileOf(act);
    if (act.status === "suspendat" && profile.suspendedUntil) return ["Suspendat până la", longDate(profile.suspendedUntil)];
    if (act.status === "retras" && profile.withdrawalDate) return ["Retras la", longDate(profile.withdrawalDate)];
    return ["Valabil din data", longDate(act.validFrom || act.issued)];
  }
  const actAuthority = (act) => state.help[act.service?.authority] || {};
  /* the act's public, service-configured fields (the RAP „Câmpuri specifice actului”) from the act data */
  function actGroups(act) {
    /* configured per service (2026-10-19): groups with simple fields + grids, the RAP document.sections shape */
    const configured = actProfileOf(act).specificFields;
    if (Array.isArray(configured) && configured.length) return configured;
    const object = act.object || {};
    const address = [[object.strada, object.house].filter(Boolean).join(" "), object.sector ? `sect. ${object.sector}` : "", object.localitate, object.raion].filter(Boolean).join(", ");
    const groups = [];
    const place = [["Denumirea obiectului", act.title], ["Tipul obiectului", object.name], ["Adresa obiectului", address], ["Activitatea (CAEM)", object.caem]].filter(([, value]) => value);
    if (object.name || address) groups.push({ title: "Obiectul activității", rows: place });
    if (act.activityType) groups.push({ title: null, rows: [["Genul de activitate", act.activityType]] });
    return groups;
  }
  function toActView(act) {
    const subject = state.geap.subject || {};
    const profile = actProfileOf(act);
    return {
      id: act.id,
      name: act.service.title || act.title,
      number: act.number,
      status: act.statusLabel,
      tone: ACT_TONE[act.status] || "neutral",
      watermark: act.status !== "valabil",
      authority: actAuthority(act).name || act.service.authority || "",
      office: act.subdivision || "",
      beneficiary: { name: subject.name || "", person: subject.type === "PF", idType: subject.idLabel || "", id: subject.idValue || "" },
      tacitDate: isTacitAct(act) ? longDate(profile.tacitApprovalDate) : "",
      tacitBadge: isTacitAct(act) && act.status === "valabil",
      issuedDate: longDate(act.issued),
      validFrom: longDate(act.validFrom || act.issued),
      statusDates: actStatusDates(act),
      validUntil: longDate(act.validUntil),
      paperNumber: state.dosarNrByAct[act.id] || "",
      printedNumber: profile.printedDocumentNumber || "",
      groups: actGroups(act),
      url: `${window.location.origin}${window.location.pathname}?view=acte&act=${encodeURIComponent(act.id)}`,
      source: "EVO Cabinet",
    };
  }
  let actViewInstance = null;
  const actView = () => {
    actViewInstance ||= window.GEAPActView.create({ sprite: SPRITE, copyHtml: (value) => copyValueHtml(value).replace(/aria-label="[^"]*"/, `aria-label="Copiază numărul actului ${escape(value)}"`), copySelector: "[data-fo-copy-value]", onCopy: () => {} });
    return actViewInstance;
  };

  function renderDetail(act) {
    let panel = document.querySelector("[data-cab-detail]");
    if (!panel) {
      panel = document.createElement("article");
      panel.className = "cab-profile cab-act-profile";
      panel.dataset.cabDetail = "";
      panel.setAttribute("aria-labelledby", "cab-act-title");
      els.list.insertAdjacentElement("afterend", panel);
    }
    const listParts = [document.querySelector(".cab-intro"), els.toolbar, els.filterBar, els.list, els.pager, els.empty];
    if (!act) {
      actViewInstance?.closeDocument({ toData: false });
      actViewInstance?.closeData({ restoreFocus: false });
      panel.hidden = true;
      document.querySelector(".cab-intro").hidden = false;
      state.detail = null;
      return; /* the caller re-renders the list (render() sets the list parts' visibility) */
    }
    state.detail = act.id;
    listParts.forEach((el) => { if (el) el.hidden = true; });
    const remaining = act.status === "valabil" ? daysUntil(act.validUntil) : null;
    const tacit = isTacitAct(act);
    const [dateLabel, dateValue] = actHeaderDate(act);
    const authority = actAuthority(act);
    const subject = state.geap.subject;
    const dosarNr = state.dosarNrByAct[act.id];
    const actions = [
      `<button class="btn btn-primary btn-md e-permits-page-header__action" type="button" aria-haspopup="dialog" data-cab-view-act="${escape(act.id)}">${icon("icon-eye-open")}<span>Vezi act permisiv</span></button>`,
      act.postProcesses.length ? `
        <div class="e-permits-fo-intent-act__action">
          <button class="btn btn-neutral btn-md" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="cab-detail-menu" data-cab-menu-trigger ${act.pending ? "disabled" : ""}><span>Inițiază un postproces</span>${icon("icon-chevron-bottom")}</button>
          <ul class="e-permits-fo-intent-menu e-permits-stack__menu cab-menu" id="cab-detail-menu" role="menu" aria-label="Postprocese" hidden>
            ${act.postProcesses.map((pp) => `<li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" data-cab-pp="${escape(pp.id)}" data-cab-act="${escape(act.id)}">${icon(pp.icon || "icon-edit", "medium")}<span>${escape(pp.label)}</span></button></li>`).join("")}
          </ul>
        </div>` : "",
      state.dosarByAct[act.id] ? `<a class="btn btn-neutral btn-md" href="${escape(cabUrl("solicitari", {}, `#dosar/${state.dosarByAct[act.id]}`))}" data-cab-see-dosar>${icon("icon-page-text")}<span>Vezi solicitarea</span></a>` : "",
    ].filter(Boolean).join("");
    const details = [
      detailRow("Denumire act permisiv", escape(act.service.title || "")),
      detailRow("Stare", tagHtml(act.statusLabel, ACT_TONE[act.status])),
      detailRow("Numărul actului permisiv", copyValueHtml(act.number).replace(/aria-label="[^"]*"/, `aria-label="Copiază numărul actului ${escape(act.number)}"`)),
      dosarNr ? detailRow("Numărul dosarului electronic", copyValueHtml(dosarNr)) : "",
      actProfileOf(act).printedDocumentNumber ? detailRow("Seria și nr. documentului tipărit", escape(actProfileOf(act).printedDocumentNumber)) : "",
      tacit ? detailRow("Data aprobării tacite", `<span>${escape(longDate(actProfileOf(act).tacitApprovalDate))}</span>${act.status === "valabil" ? tacitTagHtml() : ""}`) : "",
      detailRow("Data eliberării", escape(longDate(act.issued))),
      detailRow("Valabil din data", escape(longDate(act.validFrom || act.issued))),
      ...actStatusDates(act).map(([label, value]) => detailRow(label, escape(value))),
      detailRow("Data expirării", `<span>${escape(longDate(act.validUntil))}</span>${remaining !== null ? `<span class="cab-detail__muted">· ${remaining} zile rămase</span>` : ""}`),
    ];
    const link = (href, text) => `<a class="e-permits-dosar-profil__link" href="${escape(href)}">${escape(text)}</a>`;
    panel.hidden = false;
    panel.innerHTML = `
      ${pageHeader({
        back: { label: "Actele mele permisive", href: cabUrl("acte"), attr: "data-cab-back" },
        title: act.title,
        titleId: "cab-act-title",
        meta: [
          ["Numărul actului", copyValueHtml(act.number).replace(/aria-label="[^"]*"/, `aria-label="Copiază numărul actului ${escape(act.number)}"`)],
          ["Stare", `${tagHtml(act.statusLabel, ACT_TONE[act.status])}${tacit && act.status === "valabil" ? tacitTagHtml() : ""}`],
          [dateLabel, escape(dateValue || "—")],
          ["Data expirării", escape(longDate(act.validUntil) || "—")],
        ],
        actions,
      })}
      <div class="e-permits-dosar-profil__panel">
        ${act.notice ? `<div class="cab-profile__lead"><div class="message message--subtle ${NOTICE_CLASS[act.notice.tone] || "banner--info"} message--small cab-message"><span class="banner__icon">${icon(act.notice.icon, "medium")}</span><div class="banner__content"><p>${escape(act.notice.text)}</p></div></div></div>` : ""}
        ${subject ? profileSection("cab-act-beneficiary", "Beneficiar", identityCardHtml({ ...subject, initials: subject.initials || subject.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2) })) : ""}
        ${profileSection("cab-act-details", "Detalii act", detailCard(details))}
        ${profileSection("cab-act-authority", "Autoritatea emitentă", detailCard([
          detailRow("Denumire", escape(authority.name || act.service.authority || "")),
          act.service.authority ? detailRow("Cod", escape(act.service.authority)) : "",
          act.subdivision ? detailRow("Subdiviziunea", escape(act.subdivision)) : "",
          authority.phone ? detailRow("Telefon", link(`tel:${authority.phone.replace(/\s/g, "")}`, authority.phone)) : "",
          authority.email ? detailRow("E-mail", link(`mailto:${authority.email}`, authority.email)) : "",
        ]))}
      </div>`;
    syncHeaderMeta();
    window.scrollTo(0, 0);
  }

  /* the FO identity card (e-permits-fo-selected-role, read-only): PF = initials, PJ = icon-business */
  function identityCardHtml(person) {
    const isCompany = person.type === "PJ";
    const avatar = isCompany
      ? `<span class="e-permits-fo-selected-role__avatar e-permits-fo-selected-role__avatar--icon" aria-hidden="true">${icon("icon-business", "medium")}</span>`
      : `<span class="e-permits-fo-selected-role__avatar e-permits-fo-selected-role__avatar--initials" aria-hidden="true">${escape(person.initials || "")}</span>`;
    return `
      <div class="e-permits-fo-selected-role">
        <span class="e-permits-fo-selected-role__inner">
          ${avatar}
          <span class="e-permits-fo-selected-role__copy">
            <strong>${escape(person.name)}</strong>
            <span class="e-permits-fo-selected-role__meta">
              <span class="e-permits-fo-selected-role__id">
                <span class="e-permits-fo-selected-role__id-label">${escape(person.idLabel)}</span>
                <span class="e-permits-fo-copy-value e-permits-fo-copy-value--static e-permits-fo-selected-role__copy-id"><span>${escape(person.idValue)}</span></span>
              </span>
            </span>
          </span>
        </span>
      </div>`;
  }

  function daysUntil(ddmmyyyy) {
    const [d, m, y] = String(ddmmyyyy || "").split(".").map(Number);
    if (!y) return null;
    const today = new Date(2026, 9, 12);
    return Math.max(0, Math.round((new Date(y, m - 1, d) - today) / 86400000));
  }

  function bindGeap() {
    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-cab-menu-trigger]");
      if (trigger) {
        event.stopPropagation();
        const menu = document.getElementById(trigger.getAttribute("aria-controls"));
        const open = menu?.hidden !== false;
        closeMenus(menu);
        if (menu) menu.hidden = !open;
        trigger.setAttribute("aria-expanded", String(open));
        if (menu && open) fitMenu(menu);
        return;
      }
      const openBtn = event.target.closest("[data-cab-open]");
      const ppBtn = event.target.closest("[data-cab-pp]");
      const download = event.target.closest("[data-cab-download]");
      const back = event.target.closest("[data-cab-back]");
      const cancel = event.target.closest("[data-cab-pp-cancel]");
      const card = event.target.closest("[data-cab-card]");
      if (cancel) { document.querySelector("[data-cab-pp-modal]").hidden = true; return; }
      if (back) { event.preventDefault(); renderDetail(null); render(); return; }
      /* „Descarcă actul (MDocs)” → the printable form (the RAP „Forma de tipar a actului”) */
      if (download) {
        event.stopPropagation();
        closeMenus();
        const act = state.permits.find((p) => p.id === download.dataset.cabDownload);
        if (act?.geap) actView().openDocument(toActView(act), download.closest(".cab-card")?.querySelector("[data-cab-menu-trigger]") || download);
        return;
      }
      const viewAct = event.target.closest("[data-cab-view-act]");
      if (viewAct) {
        const act = state.permits.find((p) => p.id === viewAct.dataset.cabViewAct);
        if (act) actView().openData(toActView(act), viewAct);
        return;
      }
      if (ppBtn && ppBtn.getAttribute("aria-disabled") === "true") { event.stopPropagation(); return; }
      if (ppBtn && !ppBtn.disabled) {
        event.stopPropagation();
        closeMenus();
        const act = state.permits.find((p) => p.id === ppBtn.dataset.cabAct);
        const pp = act?.postProcesses.find((x) => x.id === ppBtn.dataset.cabPp);
        if (act && pp) confirmPostprocess(act, pp);
        return;
      }
      if (openBtn) { closeMenus(); renderDetail(state.permits.find((p) => p.id === openBtn.dataset.cabOpen)); return; }
      if (card && !event.target.closest(".cab-card__actions, .e-permits-fo-intent-act__action, [data-fo-copy-value]")) {
        const act = state.permits.find((p) => p.id === card.dataset.cabCard);
        if (act?.geap) renderDetail(act);
        return;
      }
      if (!event.target.closest(".cab-menu")) closeMenus();
    });
    document.addEventListener("keydown", (event) => {
      const row = event.target.matches?.("[data-cab-card]") ? event.target : null;
      if (row && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        const act = state.permits.find((p) => p.id === row.dataset.cabCard);
        if (act?.geap) renderDetail(act);
        return;
      }
      if (event.key !== "Escape") return;
      closeMenus();
      const modal = document.querySelector("[data-cab-pp-modal]");
      if (modal) modal.hidden = true;
    });
  }


  /* every Cabinet profile (request, act, catalog service) opens with the RAP / BO public page header
     (.e-permits-page-header--public, css/bo-profile-parts.css — 2026-10-17 alignment): desktop = the
     parent trail with a trailing chevron, phones = „‹ parent” (library breadcrumbs Breakpoint=Mobile);
     16 to the title, which wraps (never truncated); the meta row (label 12/16 · value 14/20 medium,
     dividers; 2 equal columns without dividers on phones); `actions` = the primary library
     btn-primary btn-md (hugging) + optional neutral btn-md, under the meta. No current-page crumb and
     no number in the trail: the title is the page. back = { label, href, attr } (the list). */
  function pageHeader({ back = null, title = "", titleId = "", meta = [], actions = "" }) {
    const link = (crumb, inner) => `<a class="breadcrumbs__link" href="${escape(crumb.href || "#")}" ${crumb.attr || ""}>${inner}</a>`;
    return `
      <header class="e-permits-page-header e-permits-page-header--public cab-page-header" data-cab-profile-header>
        <div class="e-permits-page-header__body">
          <div class="e-permits-page-header__top">
            <div class="e-permits-page-header__heading">
              ${back ? `
              <nav class="breadcrumbs breadcrumbs--trailing" aria-label="Breadcrumb"><ol class="breadcrumbs__list"><li class="breadcrumbs__item">${link(back, escape(back.label))}</li></ol></nav>
              <nav class="breadcrumbs breadcrumbs--mobile" aria-label="Breadcrumb"><ol class="breadcrumbs__list"><li class="breadcrumbs__item breadcrumbs__item--back">${link(back, `<span class="e-permits-page-header__crumb-label">${escape(back.label)}</span>`)}</li></ol></nav>` : ""}
              <h1 class="e-permits-page-header__title"${titleId ? ` id="${titleId}" tabindex="-1"` : ""}>${escape(title)}</h1>
            </div>
          </div>
          ${meta.length ? `<div class="e-permits-page-header__meta" data-cab-header-meta>${meta.filter(Boolean).map(([label, html]) => `
            <div class="e-permits-page-header__meta-item">
              <span class="e-permits-page-header__meta-label">${escape(label)}</span>
              <span class="e-permits-page-header__meta-value">${html}</span>
            </div>`).join("")}</div>` : ""}
          ${actions ? `<div class="e-permits-page-header__action-row">${actions}</div>` : ""}
        </div>
      </header>`;
  }

  /* BO profile sections (css/bo-profile-parts.css, = RAP / BO dos-01 · svc-01): the 18/26 title in a
     48 row over the grey card (no gap, 8/12 inset), rows 40 · label 14/20 secondary · value 14/20
     medium · dividers, none under the last row. The panel follows the header (20 to the first one). */
  function detailRow(label, valueHtml) {
    return `
      <div class="e-permits-dosar-profil__row">
        <span class="e-permits-dosar-profil__row-label" title="${escape(label)}">${escape(label)}</span>
        <span class="e-permits-dosar-profil__row-value">${valueHtml}</span>
      </div>`;
  }
  const detailCard = (rowsHtml) => `<div class="e-permits-dosar-profil__card">${[].concat(rowsHtml).filter(Boolean).join("")}</div>`;
  function profileSection(id, title, body, { attrs = "" } = {}) {
    return `
      <section class="e-permits-dosar-profil__section cab-section" aria-labelledby="${id}"${attrs ? ` ${attrs}` : ""}>
        <h2 class="e-permits-dosar-profil__section-title" id="${id}">${escape(title)}</h2>
        ${body}
      </section>`;
  }

  /* a wrapped meta row never starts with a separator (BO syncPageHeaderMetaRows) */
  function syncHeaderMeta() {
    document.querySelectorAll("[data-cab-header-meta]").forEach((meta) => {
      let previousTop = null;
      meta.querySelectorAll(":scope > .e-permits-page-header__meta-item").forEach((item) => {
        const top = item.offsetTop;
        item.classList.toggle("is-row-start", previousTop === null || top > previousTop + 1);
        previousTop = top;
      });
    });
  }
  window.addEventListener("resize", syncHeaderMeta);

  /* ---------- documents — the FO / BO document shape and card (2026-10-14) ----------
     doc = { sursa: upload | mdocs | generat (none = a document TYPE), tip, nr?, fisier?, size?, verb?, at?,
     de?, semnat?, tags?: [[label, tone]], note? }. Card = the FO summary row (.e-permits-fo-confirm-file--doc)
     with the shared content (icon by source, type + source tag, meta number · file · size · „<Verb> <date>” ·
     „de …” · „Semnat electronic”); with a key: „Detalii” (eye), the whole card opens the document modal
     (page preview + details) whose footer has „Descarcă”. No download from the card and no ⋮ (user
     2026-10-20: documents are downloaded only from the document modal). */
  const DOC_SOURCES = {
    upload: { tag: "Încărcat", icon: "document-uploaded.svg" },
    mdocs: { tag: "MDocs", icon: "document-generated.svg" },
    generat: { tag: "Generat", icon: "document-generated.svg" },
  };
  const TAG_TONES = { neutral: "status-tag--neutral is-subtle", strong: "status-tag--neutral is-strong", success: "status-tag--success is-subtle", danger: "status-tag--danger is-subtle" };
  /* signed = the blue Small tag with the signature icon (the FO / BO badge) */
  const signedTagHtml = () => `<span class="status-tag status-tag--brand is-subtle status-tag--small e-permits-fo-doc-tag">${icon("icon-signature")}Semnat electronic</span>`;
  /* meta in logical lines (the FO foDocMetaLines, 2026-10-14): [number] · [file · size] · [date · by whom · note];
     one row on desktop, one line each on phones; dots are CSS ::before (never orphaned at a wrap) */
  function docMetaLines(doc) {
    const part = (text, mod = "") => `<span class="e-permits-fo-doc-meta__part${mod ? ` e-permits-fo-doc-meta__part--${mod}` : ""}"${mod === "file" ? ` title="${escape(text)}"` : ""}>${escape(text)}</span>`;
    const file = doc.fisier && doc.fisier !== doc.tip ? doc.fisier : "";
    const head = [file ? part(file, "file") : "", doc.size ? part(doc.size) : ""].filter(Boolean);
    const stamp = [
      doc.at ? part(`${doc.verb || DOC_SOURCES[doc.sursa]?.tag || "Încărcat"} ${doc.at}`) : "",
      doc.de ? part(`de ${doc.de}`) : "",
      doc.note ? part(doc.note) : "",
    ].filter(Boolean);
    /* a number gets its own line next to a file name, else it leads the size */
    return (file ? [doc.nr ? [part(doc.nr)] : [], head, stamp] : [[doc.nr ? part(doc.nr) : "", ...head].filter(Boolean), stamp]).filter((line) => line.length);
  }
  function docContentHtml(doc) {
    const source = DOC_SOURCES[doc.sursa];
    const lines = docMetaLines(doc);
    return `
      <div class="e-permits-fo-lib-item__content">
        <div class="e-permits-fo-lib-item__title-row e-permits-fo-doc-title-row">
          <span class="e-permits-fo-lib-item__title" title="${escape(doc.tip)}">${escape(doc.tip)}</span>
          ${source ? `<span class="status-tag status-tag--neutral is-subtle status-tag--small e-permits-fo-doc-tag">${escape(source.tag)}</span>` : ""}
          ${doc.semnat ? signedTagHtml() : ""}
          ${(doc.tags || []).map(([label, tone]) => `<span class="status-tag ${TAG_TONES[tone] || TAG_TONES.neutral} status-tag--small e-permits-fo-doc-tag">${escape(label)}</span>`).join("")}
        </div>
        ${lines.length ? `<div class="e-permits-fo-lib-item__meta e-permits-fo-doc-meta">${lines.map((line) => `<span class="e-permits-fo-doc-meta__line">${line.join("")}</span>`).join("")}</div>` : ""}
      </div>`;
  }
  /* key: opens it (data-cab-doc…) */
  function docRowHtml(doc, { key = "" } = {}) {
    const source = DOC_SOURCES[doc.sursa] || DOC_SOURCES.upload;
    return `
      <div class="e-permits-fo-confirm-file e-permits-fo-confirm-file--doc cab-doc${key ? " is-clickable" : ""}"${key ? ` data-cab-doc="${escape(key)}"` : ""}>
        <img class="e-permits-fo-confirm-file__icon" width="24" height="24" src="../assets/icons/${source.icon}" alt="">
        ${docContentHtml(doc)}
        ${key ? `
        <div class="cab-doc__actions">
          <button class="btn btn-neutral btn-sm" type="button" aria-haspopup="dialog" aria-label="Detalii: ${escape(doc.tip)}" data-cab-doc-open="${escape(key)}">${icon("icon-eye-open")}<span>Detalii</span></button>
        </div>` : ""}
      </div>`;
  }
  /* the document modal: FO doc-modal shell, the A4 page preview (grey canvas, zoomed to the width),
     „Date generale” rows, footer Descarcă · Închide */
  let docModalOpener = null;
  /* the file „Descarcă” saves (demo: the modal's text, named after the document's file) */
  const docModalFile = { name: "", text: "" };
  /* the shared A4 viewer (js/doc-preview.js): the page zoomed to the canvas width minus its COMPUTED
     padding (was a private copy with a hard 48) */
  function fitDocPreview() {
    const canvas = document.querySelector("[data-cab-doc-modal]:not([hidden]) [data-cab-doc-canvas]");
    if (canvas) window.GEAPDocPreview?.fit(canvas);
  }
  function openDocModal({ title, subtitle, doc, pageHtml, rowsHtml, downloadAttrs = "" }) {
    let overlay = document.querySelector("[data-cab-doc-modal]");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "e-permits-fo-doc-modal-overlay cab-filter-modal cab-doc-modal";
      overlay.dataset.cabDocModal = "";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-labelledby", "cab-doc-title");
      document.body.appendChild(overlay);
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay || event.target.closest("[data-cab-doc-close]")) { closeDocModal(); return; }
        if (event.target.closest("[data-cab-doc-download]")) {
          const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([docModalFile.text], { type: "text/plain;charset=utf-8" })), download: docModalFile.name });
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        }
      });
      if ("ResizeObserver" in window) new ResizeObserver(fitDocPreview).observe(overlay);
    }
    docModalOpener = document.activeElement;
    overlay.innerHTML = `
      <div class="e-permits-fo-doc-modal">
        <div class="e-permits-fo-doc-modal__header">
          <div class="e-permits-fo-doc-modal__header-text">
            <h2 id="cab-doc-title" class="e-permits-fo-doc-modal__title">${escape(title)}</h2>
            ${subtitle ? `<p class="e-permits-fo-doc-modal__subtitle">${escape(subtitle)}</p>` : ""}
          </div>
          <button class="e-permits-fo-doc-modal__close" type="button" aria-label="Închide" data-cab-doc-close>${icon("icon-cross-large")}</button>
        </div>
        <div class="cab-filter__body cab-doc-modal__body">
          <div class="e-permits-doc-peek__canvas cab-doc-modal__preview" data-cab-doc-canvas role="img" aria-label="Previzualizare: ${escape(doc.tip)}${doc.fisier ? `, ${escape(doc.fisier)}` : ""}">
            <div class="e-permits-dtpl__page e-permits-doc-peek__page"><div class="e-permits-dtpl__surface">${pageHtml}</div></div>
          </div>
          <h3 class="e-permits-fo-finish__section-title">Date generale</h3>
          ${rowsHtml}
        </div>
        <div class="e-permits-fo-doc-modal__footer">
          <button class="e-permits-fo-doc-modal__cancel" type="button" ${downloadAttrs}>${icon("icon-export")}<span>Descarcă</span></button>
          <button class="e-permits-fo-doc-modal__submit" type="button" data-cab-doc-close>Închide</button>
        </div>
      </div>`;
    docModalFile.name = `${String(doc.fisier || doc.tip || "document").replace(/\.[a-z0-9]+$/i, "")}.txt`;
    docModalFile.text = [title, subtitle, "", ...[...overlay.querySelectorAll(".cab-doc-modal__body .e-permits-dosar-profil__row")].map((r) => `${r.querySelector(".e-permits-dosar-profil__row-label")?.textContent.trim() || ""}: ${(r.querySelector(".e-permits-dosar-profil__row-value")?.textContent || "").replace(/\s+/g, " ").trim()}`)].join("\n");
    overlay.hidden = false;
    fitDocPreview();
    overlay.querySelector("[data-cab-doc-close]")?.focus();
  }
  function closeDocModal() {
    const overlay = document.querySelector("[data-cab-doc-modal]");
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    if (docModalOpener?.isConnected) docModalOpener.focus();
  }
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeDocModal(); });

  /* ---------- shared with solicitari.js and catalog.js ---------- */
  window.CabEvo = {
    VIEW, AUTH, SUBJECT, SPRITE, params,
    icon, escape, copyValueHtml, closeMenus, cabUrl, longDate, longDateTime, setHeaderTitle, restrictionHtml, pagerHtml,
    docRowHtml, docContentHtml, openDocModal, closeDocModal, signedTagHtml,
    actGroups, pageHeader, syncHeaderMeta, identityCardHtml, tagHtml, tacitTagHtml, ACT_TONE, detailRow, detailCard, profileSection,
    els,
  };

  /* ---------- boot ---------- */

  async function init() {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`Nu am putut încărca datele (${response.status})`);
    const data = await response.json();

    state.actProfiles = data.actProfiles || {};
    state.geap = await loadGeapActs();
    /* only the subject's own acts: an unknown subject / one without acts gets the shared empty state */
    state.permits = state.geap.acts;

    if (data.page) {
      els.title.textContent = data.page.title;
    }
    applyView();
    /* Finalizat-Aprobat dosare ↔ their act („Vezi solicitarea” / „Vezi actul”) */
    try {
      const sm = await (await fetch("../data/cabinet-evo-solicitari.json")).json();
      (sm.perspectives?.[SUBJECT]?.dosare || [])
        .filter((dosar) => dosar.actId && dosar.status === "finalizat" && dosar.result === "aprobat" && !dosar.decisionOnly)
        .forEach((dosar) => { if (!state.dosarByAct[dosar.actId]) { state.dosarByAct[dosar.actId] = dosar.id; state.dosarNrByAct[dosar.actId] = dosar.nr; } });
      state.help = sm.help || {};
      state.restriction = sm.perspectives?.[SUBJECT]?.readOnly || null;
    } catch { /* the act profile simply has no link */ }
    if (state.restriction) state.permits = [];

    if (data.user) {
      els.name.textContent = data.user.name;
      els.role.textContent = data.user.role;
    }
    /* the perspective whose acts are listed */
    if (state.geap.subject) {
      els.avatarPanel?.querySelectorAll("[data-fo-avatar-role]").forEach((role) => {
        const own = role.dataset.cabAs === SUBJECT;
        role.classList.toggle("is-selected", own);
        role.setAttribute("aria-checked", String(own));
      });
      els.name.textContent = state.geap.subject.name;
      els.role.textContent = state.geap.subject.roleLabel || (state.geap.subject.type === "PJ" ? "Persoană juridică" : "Persoană fizică");
    }

    bind();
    bindGeap();
    initFacetFilter();
    render();
    /* ?act=<id> opens the act profile (from a dosar's „Vezi actul”) */
    const deepAct = VIEW === "acte" && state.permits.find((permit) => permit.id === params.get("act"));
    if (deepAct?.geap) renderDetail(deepAct);
    document.documentElement.dataset.cabReady = "true";
  }

  init().catch((error) => {
    console.error(error);
    els.empty.hidden = false;
    els.empty.innerHTML = window.GEAPEmptyState.render({ title: "A apărut o eroare", text: "Actele permisive nu au fost încărcate. Încercați din nou.", icon: "circle-error" });
  });
})();
