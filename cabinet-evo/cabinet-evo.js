(() => {
  "use strict";

  const DATA_URL = "../data/cabinet-evo.json?v=act-profile-v1";
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
    `<span class="${window.GEAPTag.cls(tone)}"${extra}>${String(label).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch])}</span>`;
  /* „Aprobare tacită” (RAP / US-139) = the status tag of a VALABIL act approved tacitly — ONE tag, it replaces
     „Valabil” (tacit-tag-v1, user 2026-10-21); other statuses show their own tag only, the tacit date stays in Detalii */
  const tacitTagHtml = () => '<span class="status-tag status-tag--brand is-subtle status-tag--small">Aprobare tacită<span class="u-visually-hidden"> (valabil)</span></span>';
  const actStatusTagHtml = (act, tacit) => (tacit && act.status === "valabil" ? tacitTagHtml() : tagHtml(act.statusLabel, ACT_TONE[act.status]));

  /* Feature 90818 / 89533 — GEAP acts come from the same data the front
     office uses (acte-permisive.json → intent): status × post-process
     matrix, the service passport (allows), paper acts and acts with a
     post-process already in progress. The perspective is ?as=<subject>. */
  const GEAP_URL = "../data/acte-permisive.json?v=act-profile-v1";
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
    /* act profile (act-profile-v1): every request of the perspective by act id / by number, the demo „today” and
       the appeal term of „Solicitările mele”, the perspective (mpower = a representative) */
    dossiersByAct: {}, dosarIdByNr: {}, today: "2026-10-12", appealDays: 30, perspective: null,
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

  /* Copy value — the shared component (../js/copy-value.js, 2026-10-20): header meta, detail rows,
     dialogs, identity cards; never in list rows (plain number there) */
  function copyValueHtml(value, label = "", className = "") {
    return window.GEAPCopyValue?.html(value, { label: label || `Copiază ${value}`, className }) || escape(value);
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
     blue document icon · title + the Cabinet Small tag („Aprobare tacită” instead of „Valabil”) · meta number · validity ·
     authority · subdivision (text, no institution icon) · the „Postprocese ⌄” pill when a
     post-process is available. Cabinet extras: the whole row opens the act profile (row hook + keyboard); a
     locked act = the FO locked notice (pill disabled); a paper act = the same notice slot in the info tone; no
     pill when nothing can be started (expired / withdrawn / paper). The old ⋮ („Detalii” = the row click,
     „Descarcă actul (MDocs)” = the profile's „Vezi act permisiv” → Descarcă) is gone. */
  function cardMarkup(permit) {
    const tacit = Boolean(permit.tacit || state.actProfiles[permit.id]?.tacitApprovalDate) && permit.status === "valabil";
    const validity = permit.status === "expirat" ? `expirat la ${longDate(permit.validUntil)}` : `valabil până la ${longDate(permit.validUntil)}`;
    const pending = permit.pending ? { title: `${permit.pendingLabel} în curs`, text: `· dosar ${permit.pending.dossier}. Poți iniția un alt postproces după finalizarea acestuia.` } : null;
    return window.GEAPActRow.html({
      id: permit.id,
      name: permit.title,
      status: permit.status,
      statusLabel: permit.statusLabel,
    }, {
      /* the shared meta slots (js/act-row.js metaParts): number (plain — no copy in lists, user 2026-10-20) ·
         act / service name · authority · subdivision · validity */
      metaSlots: {
        number: permit.number,
        what: permit.serviceTitle,
        authority: permit.service?.authority,
        subdivision: permit.subdivision,
        date: validity,
      },
      menuId: `cab-menu-${permit.id}`,
      items: permit.postProcesses,
      assets: "../assets/",
      attrs: `tabindex="0" data-cab-card="${escape(permit.id)}" aria-label="${escape(`${permit.title} — ${tacit ? "Aprobare tacită (valabil)" : permit.statusLabel}`)}"`,
      tagHtml: actStatusTagHtml(permit, tacit),
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

  /* the list pager = the shared GEAPPager (js/pager.js, audit-fix-v3): „1–10 din 23” · pages · „10 pe pagină ⌄”;
     none up to the smallest page size. prefix names the data hooks (data-<prefix>-page / -per-page) */
  function pagerHtml({ total, page, perPage, prefix, label, sizeLabel, sizes = PER_PAGE }) {
    return window.GEAPPager.html({ total, page, perPage, prefix, label, sizeLabel, sizes, sprite: SPRITE });
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
     two tags sits far right, the left-anchored menu ran 40px off-screen); 16 from every screen edge.
     action-menu-v1 (2026-10-20): it also opens UPWARDS (FO `.is-open-up`) when the screen has no room
     below and there is room above (the ⋮ of the last rows on a phone) */
  const MENU_EDGE = 16;
  function fitMenu(menu) {
    menu.classList.remove("is-end", "is-start", "is-open-up");
    const rect = menu.getBoundingClientRect();
    const edge = document.documentElement.clientWidth;
    if (rect.right > edge - MENU_EDGE) menu.classList.add("is-end");
    else if (rect.left < MENU_EDGE) menu.classList.add("is-start");
    const trigger = document.querySelector(`[aria-controls="${menu.id}"]`);
    const top = trigger ? trigger.getBoundingClientRect().top : rect.top;
    if (rect.bottom > window.innerHeight - MENU_EDGE && top - (rect.bottom - rect.top) - MENU_EDGE >= MENU_EDGE) menu.classList.add("is-open-up");
  }

  /* menu keyboard (WAI-ARIA menu button): Enter / Space / ↓ on the trigger open it on the first item, ↑ on the
     last; ↑ ↓ Home End move inside; Esc closes and returns focus to the trigger; Tab closes */
  let keyOpened = null; /* the trigger an Enter / Space keydown is about to click (demo clicks don't move focus) */
  const menuItemsOf = (menu) => [...menu.querySelectorAll("[role^='menuitem']")].filter((item) => !item.disabled && item.getClientRects().length);
  function onMenuKey(event) {
    const trigger = event.target.closest?.("[data-cab-menu-trigger]");
    const menuEl = event.target.closest?.("[role='menu']");
    const inMenu = menuEl && document.querySelector(`[data-cab-menu-trigger][aria-controls="${menuEl.id}"]`) ? menuEl : null; /* request + act rows, profile */
    keyOpened = trigger && (event.key === "Enter" || event.key === " ") ? trigger : null;
    if (trigger && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      const menu = document.getElementById(trigger.getAttribute("aria-controls"));
      if (!menu || trigger.disabled) return;
      event.preventDefault();
      if (menu.hidden) trigger.click();
      if (menu.hidden) return; /* phones: a labelled trigger opened its sheet instead */
      const items = menuItemsOf(menu);
      items[event.key === "ArrowDown" ? 0 : items.length - 1]?.focus();
      return;
    }
    if (!inMenu) return;
    const items = menuItemsOf(inMenu);
    const at = items.indexOf(document.activeElement);
    const go = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: items.length - 1 }[event.key];
    if (go !== undefined && items.length) {
      event.preventDefault();
      items[(go + items.length) % items.length].focus();
      return;
    }
    if (event.key === "Escape" || event.key === "Tab") {
      const owner = document.querySelector(`[aria-controls="${inMenu.id}"]`);
      closeMenus();
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); owner?.focus(); }
    }
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
        <div class="modal-buttons e-permits-fo-instance-switch-modal__actions">
          <button class="btn btn-neutral e-permits-fo-instance-switch-modal__secondary" type="button" data-cab-pp-cancel>Anulează</button>
          <a class="btn btn-destructive e-permits-fo-instance-switch-modal__primary e-permits-fo-instance-switch-modal__primary--danger" href="${escape(foUrl(act, pp))}" data-cab-pp-confirm>Confirm și continui</a>
        </div>
      </div>`;
    modal.hidden = false;
    modal.querySelector("[data-cab-pp-cancel]")?.focus();
  }

  /* ---------- act profile (act-profile-v1, 2026-10-21 — user: „the profile as best practice; optimise, but don't
     miss anything; what the Azure stories ask must be covered”) ----------
     Each fact ONCE, key facts first (GOV.UK summary list · NN/g „key facts first” · the UK driving-licence page:
     what you may do before admin metadata · GoBusiness: action-driven). Sources: Feature 90818, US-55 AC-07…14,
     US-162 AC-04/05/07/08/12/14/17, US-161 AC-23…29, US-159, US-143. components.md › „Act profile”.
       header    back · title = the object · subtitle = the act type (the service) · the action row, LEFT-aligned under
                 the title, one line: „Vezi act permisiv” (the one primary, every status) · „Postprocese ⌄” (only when
                 eligible; disabled + the notice while one is in progress) · „Vezi solicitarea” (the issuing request);
                 what does not fit goes into a trailing „⋯” (fitActActions) · the key-facts card (grey, r16): Nr.
                 (copy) · Stare („Aprobare tacită” instead of „Valabil”) · ONE status date (actHeaderDate) on one line, the status notice
                 (actNotice, only when useful), „Vezi toate detaliile”. Look and feel from the user's YouTube reference
                 (grouped grey buttons, a compact facts card), NOT its structure — no „channel” identity row (user
                 2026-10-21: „screenshots are look and feel; research before copying a layout”).
       sections  [Beneficiar — first for a representative (MPower)] · Ce permite actul (the configured fields,
                 AC-29, the request Act tab's renderer) · Detalii act · Autoritatea emitentă · [Beneficiar — for the
                 owner, who is already named in the header avatar] · Istoric (actHistory, the shared trajectory)
     „Vezi act permisiv” opens the act document itself (MDocs A4, US-143) — every metadata of the old „Vizualizare
     act” data dialog is on the page now; „Descarcă” lives in that dialog (no-row-download rule). */
  const actProfileOf = (act) => state.actProfiles[act.id] || {};
  const isTacitAct = (act) => Boolean(actProfileOf(act).tacitApprovalDate);
  /* the date of the current status (US-162 AC-17 + Anulat): when it was suspended / withdrawn / annulled */
  const STATUS_DATE = { suspendat: "suspensionDate", retras: "withdrawalDate", anulat: "cancellationDate" };
  const statusDateOf = (act) => actProfileOf(act)[STATUS_DATE[act.status]] || "";
  /* DD.MM.YYYY | ISO → ISO (sorting and day maths) */
  const isoOf = (value) => {
    const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(value || ""));
    return match ? `${match[3]}-${match[2]}-${match[1]}` : String(value || "");
  };
  const dayCount = (fromIso, toIso) => Math.round((Date.parse(toIso.slice(0, 10)) - Date.parse(fromIso.slice(0, 10))) / 86400000);
  const addDaysIso = (iso, days) => new Date(Date.parse(iso.slice(0, 10)) + days * 86400000).toISOString().slice(0, 10);
  /* Romanian numerals: „de” after 20+ (120 de zile, 704 zile) */
  const deOf = (n) => (n % 100 >= 20 || (n >= 100 && n % 100 === 0) ? " de" : "");
  const daysText = (n) => (n === 1 ? "o zi" : `${n}${deOf(n)} zile`);
  const daysLeftOf = (act) => (act.validUntil ? Math.max(0, dayCount(state.today, isoOf(act.validUntil))) : null);
  const EXPIRY_PROMPT_DAYS = 60;

  function actStatusDates(act) {
    const profile = actProfileOf(act);
    return [
      ...(act.status === "suspendat" ? [["Data suspendării actului permisiv", longDate(profile.suspensionDate)], ["Suspendat până la data de", longDate(profile.suspendedUntil)]] : []),
      ...(act.status === "retras" ? [["Data retragerii actului permisiv", longDate(profile.withdrawalDate)]] : []),
      ...(act.status === "anulat" ? [["Data anulării actului permisiv", longDate(profile.cancellationDate)]] : []),
    ].filter(([, value]) => value);
  }
  /* the ONE status date in the header (the rest of the dates are in „Detalii act”, never twice) */
  function actHeaderDate(act) {
    const profile = actProfileOf(act);
    const date = (value) => escape(longDate(value));
    if (act.status === "suspendat") return profile.suspendedUntil ? ["Suspendat până la", date(profile.suspendedUntil)] : null;
    if (act.status === "retras") return profile.withdrawalDate ? ["Retras la", date(profile.withdrawalDate)] : null;
    if (act.status === "anulat") return profile.cancellationDate ? ["Anulat la", date(profile.cancellationDate)] : null;
    if (act.status === "expirat") return act.validUntil ? ["A expirat la", date(act.validUntil)] : null;
    /* Valabil — US-161 AC-24: an act without an end date has no „Valabil până la” */
    if (!act.validUntil) return ["Valabilitate", "nelimitată"];
    const left = daysLeftOf(act);
    return ["Valabil până la", `${date(act.validUntil)} <span class="cab-detail__muted">(${left === 0 ? "expiră azi" : `${daysText(left)} ${left === 1 ? "rămasă" : "rămase"}`})</span>`]; /* brackets, not „·” — a wrapped line never starts with a dot */
  }
  const actAuthority = (act) => state.help[act.service?.authority] || {};
  const authorityNameOf = (act) => actAuthority(act).name || act.service?.authority || "autoritatea emitentă";
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
      paperNumber: issuingDossierOf(act)?.nr || profile.dossierNr || "",
      printedNumber: profile.printedDocumentNumber || "",
      groups: actGroups(act),
      url: `${window.location.origin}${window.location.pathname}?view=acte&act=${encodeURIComponent(act.id)}`,
      source: "EVO Cabinet",
      signed: !act.paper,
    };
  }
  /* „Descarcă” in the act document dialog: the MDocs PDF in the real system — the demo saves the act's data as text
     (the Cabinet document dialog does the same) */
  function downloadAct(view) {
    const lines = [view.name, `nr. ${view.number} din ${view.issuedDate}`, `Stare: ${view.status}`, `Autoritatea emitentă: ${[view.authority, view.office].filter(Boolean).join(" · ")}`, `Beneficiar: ${view.beneficiary.name}`, `Valabil până la: ${view.validUntil || "—"}`];
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" })), download: `Act-permisiv-${view.number}.txt` });
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  let actViewInstance = null;
  const actView = () => {
    actViewInstance ||= window.GEAPActView.create({
      sprite: SPRITE,
      copyHtml: (value) => copyValueHtml(value, `Copiază numărul actului ${value}`),
      copySelector: "[data-copy-value]",
      onCopy: () => {},
      documentTitle: "Vizualizare act",
      onDocumentDownload: downloadAct,
    });
    return actViewInstance;
  };

  /* the requests in „Solicitările mele” about this act: the one that issued it (its number = the act's) and the
     post-processes (status changes, duplicates, one in progress) */
  const dossiersOf = (act) => state.dossiersByAct[act.id] || [];
  function issuingDossierOf(act) {
    const done = dossiersOf(act).filter((dosar) => dosar.status === "finalizat" && dosar.result === "aprobat" && !dosar.decisionOnly);
    return done.find((dosar) => dosar.actNr === act.number) || done.find((dosar) => dosar.id === state.dosarByAct[act.id]) || null;
  }
  const requestHref = (id) => cabUrl("solicitari", {}, `#dosar/${id}`);
  const alertLinkHtml = (href, label) => ` <a class="link link-primary link-sm cab-alert-link" href="${escape(href)}">${escape(label)}&nbsp;→</a>`;
  const alertPpHtml = (act, ppId, label) => (act.postProcesses.some((pp) => pp.id === ppId)
    ? ` <button class="link link-primary link-sm cab-alert-link" type="button" data-cab-pp="${escape(ppId)}" data-cab-act="${escape(act.id)}">${escape(label)}&nbsp;→</button>`
    : "");

  /* the status notice — only when it says something the header does not: what happens next, who decided and
     why, the deadline of a right (contestație), the action that solves it. One link at most. */
  function actNotice(act) {
    const profile = actProfileOf(act);
    const change = profile.statusChange || {};
    const byAuthority = change.initiator === "autoritate";
    const authority = authorityNameOf(act);
    const decided = byAuthority ? `de ${authority}` : "la cererea titularului";
    const decision = change.decision ? ` Decizia ${escape(change.decision)}.` : "";
    const reason = change.reason ? ` Motivul: ${escape(change.reason)}.` : "";
    const statusDate = statusDateOf(act);
    /* Feature 90818: a status changed by the AUTHORITY can be contested — on its request (the dossier), within
       the appeal term of „Solicitările mele” (appealDays from the decision) */
    const appealUntil = byAuthority && statusDate ? addDaysIso(isoOf(statusDate), state.appealDays) : "";
    const appealOpen = Boolean(appealUntil) && appealUntil >= state.today;
    const appeal = appealOpen ? ` Poți depune o contestație până la ${escape(longDate(appealUntil))}, din solicitarea care conține decizia.` : "";
    const requestLink = change.dosarId ? alertLinkHtml(requestHref(change.dosarId), "Vezi solicitarea") : "";
    const info = (html) => ({ tone: "info", icon: "icon-circle-info-filled", html });
    const warning = (html, iconId = "icon-warning-filled") => ({ tone: "warning", icon: iconId, html });
    if (act.pending) {
      const id = state.dosarIdByNr[act.pending.dossier];
      return warning(`<strong>${escape(act.pendingLabel)} în curs.</strong> Poți iniția un alt postproces după finalizarea solicitării ${escape(act.pending.dossier)}.${id ? alertLinkHtml(requestHref(id), "Vezi solicitarea") : ""}`, "icon-time");
    }
    if (act.paper) return info(escape(PAPER_TEXT));
    if (act.status === "suspendat") {
      const resume = alertPpHtml(act, "reluare", "Cere reluarea valabilității");
      const next = appealOpen ? appeal + requestLink
        : resume ? ` Poți cere reluarea valabilității înainte de această dată.${resume}`
          : ` Valabilitatea se reia automat la această dată.${requestLink}`;
      return warning(`<strong>Activitatea autorizată nu poate fi desfășurată pe durata suspendării.</strong> Suspendarea a fost decisă ${decided}.${decision}${reason}${next}`);
    }
    if (act.status === "retras" || act.status === "anulat") {
      const verb = act.status === "retras" ? "retras" : "anulat";
      const next = appealOpen ? appeal : " Pentru a desfășura din nou activitatea, depune o solicitare nouă.";
      return (appealOpen ? warning : info)(`<strong>Actul nu mai este valabil.</strong> A fost ${verb} ${decided}.${decision}${reason}${next}${requestLink}`);
    }
    if (act.status === "expirat") {
      return info(`<strong>Actul nu mai este valabil.</strong> Pentru a desfășura din nou activitatea, depune o solicitare nouă.${alertLinkHtml(cabUrl("catalog", {}, `#serviciu/${act.serviceCode}`), "Depune o solicitare nouă")}`);
    }
    const left = daysLeftOf(act);
    if (act.status === "valabil" && left !== null && left <= EXPIRY_PROMPT_DAYS) {
      const extend = alertPpHtml(act, "prelungire", "Inițiază prelungirea");
      return warning(`<strong>Termenul de valabilitate se apropie de sfârșit.</strong> ${extend ? "Depune cererea de prelungire din timp, ca activitatea să nu fie întreruptă." : "Pentru a continua activitatea după această dată, depune o solicitare nouă."}${extend || alertLinkHtml(cabUrl("catalog", {}, `#serviciu/${act.serviceCode}`), "Depune o solicitare nouă")}`);
    }
    return null;
  }

  /* „Istoric” (US-162 AC-14): the act's key moments in date order on the shared trajectory (vertical) — the request
     (when known), the tacit approval, the issue, every post-process of the act (status changes with who decided,
     duplicates, one in progress) — then what comes next, dashed (end of validity / of the suspension). A moment
     without a date is not shown. Paper acts: only what the registry knows (no GEAP post-processes). */
  const PP_EVENT = {
    duplicat: ["Duplicat emis", "done"],
    reperfectare: ["Act reperfectat", "done"],
    prelungire: ["Valabilitate prelungită", "done"],
    suspendare: ["Valabilitate suspendată", "done"],
    reluare: ["Valabilitate reluată", "done"],
    retragere: ["Act retras", "rejected"],
    anulare: ["Act anulat", "rejected"],
  };
  const STATUS_EVENT = { suspendat: "suspendare", retras: "retragere", anulat: "anulare" };
  function actHistory(act) {
    const profile = actProfileOf(act);
    const issuing = issuingDossierOf(act);
    const code = act.service?.authority || "";
    const where = [code, act.subdivision].filter(Boolean).join(" · ");
    const ref = (dosar) => (dosar?.id
      ? `<a class="e-permits-dosar-profil__link" href="${escape(requestHref(dosar.id))}">${escape(dosar.nr)}</a>`
      : dosar?.nr ? escape(dosar.nr) : "");
    const meta = (...parts) => parts.filter(Boolean).join(" · ");
    const whoOf = (initiator) => (initiator === "autoritate" ? `din inițiativa ${escape(code || "autorității")}` : "la cererea titularului");
    const events = [];
    const submitted = issuing?.submitted || profile.requestSubmitted;
    if (submitted) {
      events.push({ at: submitted, label: "Cerere depusă", state: "done", html: meta(escape(longDateTime(submitted)), issuing?.pp ? escape(issuing.tip) : "", ref(issuing || { nr: profile.dossierNr })) });
    }
    if (profile.tacitApprovalDate) {
      events.push({ at: isoOf(profile.tacitApprovalDate), label: "Aprobare tacită", state: "done", html: meta(escape(longDate(profile.tacitApprovalDate)), "autoritatea nu a emis o decizie în termen") });
    }
    events.push({ at: isoOf(act.issued), label: act.paper ? "Act emis pe hârtie" : "Act emis", state: "done", html: meta(escape(longDate(act.issued)), escape(where)) });
    const covered = new Set();
    if (!act.paper) {
      dossiersOf(act).filter((dosar) => dosar !== issuing && dosar.pp).forEach((dosar) => {
        if (dosar.status === "finalizat" && dosar.result === "aprobat" && PP_EVENT[dosar.pp]) {
          const [label, state] = PP_EVENT[dosar.pp];
          covered.add(dosar.pp);
          events.push({ at: dosar.finalized, label, state, pp: dosar.pp, html: meta(escape(longDate(dosar.finalized)), whoOf(dosar.initiatedBy), ref(dosar)) });
        } else if (["derulare", "info", "achitare"].includes(dosar.status)) {
          events.push({ at: dosar.submitted, label: `${dosar.tip} în examinare`, state: "current", html: meta(`depusă la ${escape(longDate(dosar.submitted))}`, ref(dosar)) });
        }
      });
      /* a status change the holder's requests do not show (decided by the authority on its own file) */
      const pp = STATUS_EVENT[act.status];
      const change = profile.statusChange;
      if (pp && change && !covered.has(pp) && statusDateOf(act)) {
        events.push({ at: isoOf(statusDateOf(act)), label: PP_EVENT[pp][0], state: PP_EVENT[pp][1], pp, html: meta(escape(longDate(statusDateOf(act))), whoOf(change.initiator), change.decision ? `decizia ${escape(change.decision)}` : "") });
      }
    }
    if (act.status === "expirat" && act.validUntil) {
      events.push({ at: isoOf(act.validUntil), label: "Valabilitate încheiată", state: "rejected", html: meta(escape(longDate(act.validUntil)), "termenul de valabilitate a expirat") });
    }
    events.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
    /* the suspension in force is the current moment (amber pause), an earlier one is history */
    if (act.status === "suspendat") {
      const last = events.filter((event) => event.pp === "suspendare").pop();
      if (last) last.state = "paused";
    }
    if (act.status === "valabil" && act.validUntil) events.push({ label: "Sfârșitul valabilității", state: "todo", html: escape(longDate(act.validUntil)) });
    if (act.status === "suspendat" && profile.suspendedUntil) events.push({ label: "Reluarea valabilității", state: "todo", html: escape(longDate(profile.suspendedUntil)) });
    return window.GEAPTrajectory?.html({
      layout: "vertical",
      className: "cab-act-history",
      label: "Istoricul actului",
      steps: events.map((event) => ({ label: event.label, state: event.state, metaHtml: event.html })),
    }) || "";
  }

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
    const profile = actProfileOf(act);
    const tacit = isTacitAct(act);
    const authority = actAuthority(act);
    const subject = state.geap.subject;
    const issuing = issuingDossierOf(act);
    const notice = actNotice(act);
    const statusDate = actHeaderDate(act);
    /* one line in priority order (primary · Postprocese · Vezi solicitarea); what does not fit goes into a trailing
       „⋯” (fitActActions) — the YouTube mobile action row (user 2026-10-21) */
    const actions = [
      `<button class="btn btn-primary btn-md" type="button" aria-haspopup="dialog" data-cab-view-act="${escape(act.id)}">${icon("icon-eye-open")}<span>Vezi act permisiv</span></button>`,
      act.postProcesses.length ? `
        <div class="e-permits-fo-intent-act__action" data-cab-act-action="postprocese">
          <button class="btn btn-neutral btn-md" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="cab-detail-menu" aria-label="Postprocese pentru ${escape(act.title || "")}" data-cab-menu-trigger ${act.pending ? 'disabled aria-describedby="cab-act-notice"' : ""}><span>Postprocese</span>${icon("icon-chevron-bottom")}</button>
          <ul class="e-permits-fo-intent-menu e-permits-stack__menu cab-menu" id="cab-detail-menu" role="menu" aria-label="Postprocese" hidden>
            ${window.GEAPActRow.menuItemsHtml(act.postProcesses, (pp) => `data-cab-pp="${escape(pp.id)}" data-cab-act="${escape(act.id)}"`, "../assets/") /* the act rows' items: danger last + separator (action-menu-v1) */}
          </ul>
        </div>` : "",
      issuing ? `<a class="btn btn-neutral btn-md" href="${escape(requestHref(issuing.id))}" data-cab-see-dosar data-cab-act-action="request">${icon("icon-page-text")}<span>Vezi solicitarea</span></a>` : "",
      act.postProcesses.length || issuing ? `
        <div class="e-permits-fo-intent-act__action cab-act-header__overflow" hidden>
          <button class="btn btn-neutral btn-md btn-icon-only" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="cab-detail-more" aria-label="Mai multe acțiuni" data-cab-menu-trigger>${icon("icon-more-horizontal")}</button>
          <ul class="e-permits-fo-intent-menu e-permits-stack__menu cab-menu" id="cab-detail-more" role="menu" aria-label="Mai multe acțiuni" hidden></ul>
        </div>` : "",
    ].filter(Boolean).join("");
    /* Detalii act — what the header does not say. „Valabil până la” lives in the header for Valabil / Expirat
       (as the status date) and here for the other statuses; the status date of Retras / Anulat is the header's. */
    const dossierNr = issuing?.nr || profile.dossierNr || "";
    const validFrom = act.validFrom && isoOf(act.validFrom) !== isoOf(act.issued) ? act.validFrom : "";
    const details = [
      dossierNr ? detailRow("Numărul dosarului electronic", copyValueHtml(dossierNr, `Copiază numărul dosarului ${dossierNr}`)) : "",
      profile.printedDocumentNumber ? detailRow("Seria și nr. documentului tipărit", escape(profile.printedDocumentNumber)) : "",
      tacit ? detailRow("Data aprobării tacite", escape(longDate(profile.tacitApprovalDate))) : "",
      detailRow("Data emiterii", escape(longDate(act.issued))),
      validFrom ? detailRow("Valabil din", escape(longDate(validFrom))) : "",
      !["valabil", "expirat"].includes(act.status) && act.validUntil ? detailRow("Valabil până la", escape(longDate(act.validUntil))) : "",
      act.status === "suspendat" && profile.suspensionDate ? detailRow("Data suspendării", escape(longDate(profile.suspensionDate))) : "",
    ];
    const link = (href, text) => `<a class="e-permits-dosar-profil__link" href="${escape(href)}">${escape(text)}</a>`;
    /* „Ce permite actul”: the configured groups (AC-29, empty fields hidden); a value equal to the page title (the
       object's name) is not repeated; the first group carries the section name, the next ones keep theirs */
    const groups = (window.GEAPActView?.normalizeFields(actGroups(act)) || [])
      .map((group) => ({ ...group, items: group.items.filter((item) => item.columns || String(item.value ?? "").trim() !== String(act.title).trim()) }))
      .filter((group) => group.items.length);
    const allows = window.GEAPActView?.fieldsHtml(groups, {
      untitled: "Ce permite actul",
      section: (title, body, index) => profileSection(`cab-act-fields-${index}`, index === 0 ? "Ce permite actul" : title, body),
    }) || "";
    /* Beneficiar: a representative (MPower) acts in someone else's name → that name comes first; the owner is
       already named in the header avatar → the card follows the authority (kept: the IDNx is copied from here) */
    const beneficiary = subject ? profileSection("cab-act-beneficiary", "Beneficiar", identityCardHtml({ ...subject, initials: subject.initials || subject.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2) })) : "";
    const representative = Boolean(state.perspective?.mpower);
    /* the key facts on one line (wraps by whole parts, no separators to orphan): number · status · status date */
    const facts = [
      `<span class="cab-act-header__fact"><span>Nr.</span>${copyValueHtml(act.number, `Copiază numărul actului ${act.number}`)}</span>`,
      `<span class="cab-act-header__fact cab-act-header__fact--tags">${actStatusTagHtml(act, tacit)}</span>`,
      statusDate ? `<span class="cab-act-header__fact">${escape(statusDate[0])} ${statusDate[1]}</span>` : "",
    ].filter(Boolean).join("");
    const factsHtml = `
      <div class="cab-act-header__facts">
        <p class="cab-act-header__key">${facts}</p>
        ${notice ? `<div class="message message--subtle ${NOTICE_CLASS[notice.tone] || "banner--info"} message--small cab-message" id="cab-act-notice"><span class="banner__icon">${icon(notice.icon, "medium")}</span><div class="banner__content"><p>${notice.html}</p></div></div>` : ""}
        <button class="link link-primary link-sm cab-alert-link cab-act-header__more" type="button" data-cab-jump="cab-act-details">Vezi toate detaliile</button>
      </div>`;
    panel.hidden = false;
    panel.innerHTML = `
      ${pageHeader({
        back: { label: "Actele mele permisive", href: cabUrl("acte"), attr: "data-cab-back" },
        title: act.title,
        titleId: "cab-act-title",
        subtitle: act.service.title || "",
        bodyHtml: `<div class="cab-act-header__bar"><div class="cab-act-header__actions">${actions}</div></div>${factsHtml}`,
      })}
      <div class="e-permits-dosar-profil__panel">
        ${representative ? beneficiary : ""}
        ${allows}
        ${profileSection("cab-act-details", "Detalii act", detailCard(details))}
        ${profileSection("cab-act-authority", "Autoritatea emitentă", detailCard([
          detailRow("Denumire", escape(authorityNameOf(act))),
          act.subdivision ? detailRow("Subdiviziunea emitentă", escape(act.subdivision)) : "",
          authority.phone ? detailRow("Telefon", link(`tel:${authority.phone.replace(/\s/g, "")}`, authority.phone)) : "",
          authority.email ? detailRow("E-mail", link(`mailto:${authority.email}`, authority.email)) : "",
        ]))}
        ${representative ? "" : beneficiary}
        ${profileSection("cab-act-history", "Istoric", actHistory(act))}
      </div>`;
    syncHeaderMeta();
    fitActActions();
    document.fonts?.ready.then(fitActActions);
    actActionsObserver?.observe(panel.querySelector(".cab-act-header__bar"));
    window.scrollTo(0, 0);
  }

  /* the action row never wraps: measure every action at its natural width (all reads first), keep the primary,
     then the secondaries in priority order while they fit beside the „⋯”; the rest are `hidden` (out of the tab
     order) and listed in the „⋯” menu — Vezi solicitarea, then „Postprocese” as a labelled group (danger last). */
  function fitActActions() {
    const box = document.querySelector("[data-cab-detail]:not([hidden]) .cab-act-header__actions");
    const act = box && state.permits.find((permit) => permit.id === state.detail);
    if (!box || !act) return;
    const items = [...box.querySelectorAll(":scope > [data-cab-act-action]")];
    const more = box.querySelector(":scope > .cab-act-header__overflow");
    const primary = box.querySelector(":scope > .btn-primary");
    /* read */
    box.classList.add("is-measuring");
    items.forEach((el) => { el.hidden = false; });
    if (more) more.hidden = false;
    const room = box.parentElement.clientWidth;
    const gap = parseFloat(getComputedStyle(box).columnGap) || 0;
    const width = (el) => el.getBoundingClientRect().width;
    const primaryW = width(primary);
    const widths = items.map(width);
    const moreW = more ? width(more) : 0;
    box.classList.remove("is-measuring");
    /* decide */
    let keep = items.length;
    if (primaryW + widths.reduce((sum, w) => sum + gap + w, 0) > room + 0.5) {
      let used = primaryW + gap + moreW;
      keep = 0;
      for (const w of widths) {
        if (used + gap + w > room + 0.5) break;
        used += gap + w;
        keep += 1;
      }
    }
    /* write */
    items.forEach((el, index) => { el.hidden = index >= keep; });
    if (!more) return;
    const overflow = items.slice(keep);
    more.hidden = !overflow.length;
    const kinds = overflow.map((el) => el.dataset.cabActAction);
    if (more.dataset.items !== kinds.join(" ")) { /* rebuilt only when the overflow set changes (an open menu keeps its focus) */
      more.dataset.items = kinds.join(" ");
      closeMenus();
      const menu = more.querySelector("ul");
      const request = kinds.includes("request") ? box.querySelector("[data-cab-act-action='request']") : null;
      const pps = kinds.includes("postprocese")
        ? act.postProcesses.map((pp) => (act.pending ? { ...pp, disabled: true, reason: `Postprocesul „${act.pendingLabel}” este în curs` } : pp))
        : [];
      menu.innerHTML = [
        request ? `<li role="none"><a class="e-permits-fo-intent-menu__item" role="menuitem" href="${escape(request.getAttribute("href"))}">${icon("icon-page-text", "medium")}<span>Vezi solicitarea</span></a></li>` : "",
        request && pps.length ? '<li role="separator" class="e-permits-fo-intent-menu__separator"></li>' : "",
        pps.length ? `<li class="cab-menu__label" role="presentation">Postprocese</li>${window.GEAPActRow.menuItemsHtml(pps, (pp) => `data-cab-pp="${escape(pp.id)}" data-cab-act="${escape(act.id)}"`, "../assets/")}` : "",
      ].join("");
    }
  }
  const actActionsObserver = "ResizeObserver" in window ? new ResizeObserver(() => fitActActions()) : null;

  /* the FO identity card (e-permits-fo-selected-role, read-only): PF = initials, PJ = icon-business */
  function identityCardHtml(person) {
    const isCompany = person.type === "PJ";
    const avatar = isCompany
      ? `<span class="avatar avatar--sm avatar--icon e-permits-fo-selected-role__avatar e-permits-fo-selected-role__avatar--icon" aria-hidden="true">${icon("icon-business", "medium")}</span>`
      : `<span class="avatar avatar--sm avatar--initials e-permits-fo-selected-role__avatar e-permits-fo-selected-role__avatar--initials" aria-hidden="true">${escape(person.initials || "")}</span>`;
    return `
      <div class="e-permits-fo-selected-role">
        <span class="e-permits-fo-selected-role__inner">
          ${avatar}
          <span class="e-permits-fo-selected-role__copy">
            <strong>${escape(person.name)}</strong>
            <span class="e-permits-fo-selected-role__meta">
              <span class="e-permits-fo-selected-role__id">
                <span class="e-permits-fo-selected-role__id-label">${escape(person.idLabel)}</span>
                ${copyValueHtml(person.idValue, `Copiază ${person.idLabel} ${person.idValue}`, "e-permits-fo-selected-role__copy-id")}
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
        if (menu && open) {
          fitMenu(menu);
          if (keyOpened === trigger) menuItemsOf(menu)[0]?.focus(); /* opened with Enter / Space */
        }
        keyOpened = null;
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
      const jump = event.target.closest("[data-cab-jump]");
      if (jump) {
        const target = document.getElementById(jump.dataset.cabJump);
        if (target) { target.setAttribute("tabindex", "-1"); target.scrollIntoView({ block: "start", behavior: "smooth" }); target.focus({ preventScroll: true }); }
        return;
      }
      const viewAct = event.target.closest("[data-cab-view-act]");
      if (viewAct) {
        const act = state.permits.find((p) => p.id === viewAct.dataset.cabViewAct);
        if (act) actView().openDocument(toActView(act), viewAct); /* the act itself — the page carries its data (act-profile-v1) */
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
      if (card && !event.target.closest(".cab-card__actions, .e-permits-fo-intent-act__action, [data-copy-value]")) {
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
      onMenuKey(event);
      if (event.defaultPrevented && event.key === "Escape") return;
      if (event.key !== "Escape") return;
      /* Esc on an open trigger: close and keep the focus there */
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
  function pageHeader({ back = null, title = "", titleId = "", subtitle = "", meta = [], actions = "", bodyHtml = "" }) {
    return `
      <header class="e-permits-page-header e-permits-page-header--public cab-page-header" data-cab-profile-header>
        <div class="e-permits-page-header__body">
          <div class="e-permits-page-header__top">
            <div class="e-permits-page-header__heading">
              ${back ? window.GEAPBreadcrumbs?.html([back], { trailing: true }) || "" : ""}
              ${subtitle ? '<div class="cab-page-header__titles">' : ""}
              <h1 class="e-permits-page-header__title"${titleId ? ` id="${titleId}" tabindex="-1"` : ""}>${escape(title)}</h1>
              ${subtitle ? `<p class="cab-page-header__subtitle">${escape(subtitle)}</p></div>` : ""}
            </div>
          </div>
          ${meta.length ? `<div class="e-permits-page-header__meta" data-cab-header-meta>${meta.filter(Boolean).map(([label, html]) => `
            <div class="e-permits-page-header__meta-item">
              <span class="e-permits-page-header__meta-label">${escape(label)}</span>
              <span class="e-permits-page-header__meta-value">${html}</span>
            </div>`).join("")}</div>` : ""}
          ${actions ? `<div class="e-permits-page-header__action-row">${actions}</div>` : ""}
          ${bodyHtml}
        </div>
      </header>`;
  }

  /* BO profile sections (css/bo-profile-parts.css, = RAP / BO dos-01 · svc-01): the 18/26 title in a
     48 row over the grey card (no gap, 8/12 inset), rows 40 · label 14/20 secondary · value 14/20
     medium · dividers, none under the last row. The panel follows the header (20 to the first one). */
  function detailRow(label, valueHtml) {
    return `
      <div class="e-permits-dosar-profil__row">
        <span class="e-permits-dosar-profil__row-label" data-cell-tooltip>${escape(label)}</span>
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
     „de …” · „Semnat electronic”); with a key the whole card opens the document modal (no „Detalii” button since
     no-lone-detalii-v1)
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
    const part = (text, mod = "") => `<span class="e-permits-fo-doc-meta__part${mod ? ` e-permits-fo-doc-meta__part--${mod}` : ""}"${mod === "file" ? " data-cell-tooltip" : ""}>${escape(text)}</span>`;
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
          <span class="e-permits-fo-lib-item__title" data-cell-tooltip>${escape(doc.tip)}</span>
          ${source ? `<span class="status-tag status-tag--neutral is-subtle status-tag--small e-permits-fo-doc-tag">${escape(source.tag)}</span>` : ""}
          ${doc.semnat ? signedTagHtml() : ""}
          ${(doc.tags || []).map(([label, tone]) => `<span class="status-tag ${TAG_TONES[tone] || TAG_TONES.neutral} status-tag--small e-permits-fo-doc-tag">${escape(label)}</span>`).join("")}
        </div>
        ${lines.length ? `<div class="e-permits-fo-lib-item__meta e-permits-fo-doc-meta">${lines.map((line) => `<span class="e-permits-fo-doc-meta__line">${line.join("")}</span>`).join("")}</div>` : ""}
      </div>`;
  }
  /* key: the whole card opens it (data-cab-doc…). no-lone-detalii-v1 (2026-10-21, user: „if it does the same as
     clicking the entire card, remove Detalii”): no „👁 Detalii” button — the card is the control (tabindex 0, name
     „<tip>, deschide detaliile”, Enter / Space in solicitari.js), its hover band + focus ring */
  function docRowHtml(doc, { key = "" } = {}) {
    const source = DOC_SOURCES[doc.sursa] || DOC_SOURCES.upload;
    return `
      <div class="e-permits-fo-confirm-file e-permits-fo-confirm-file--doc cab-doc${key ? " is-clickable" : ""}"${key ? ` data-cab-doc="${escape(key)}" tabindex="0" aria-label="${escape(`${doc.tip}, deschide detaliile`)}"` : ""}>
        <img class="e-permits-fo-confirm-file__icon" width="24" height="24" src="../assets/icons/${source.icon}" alt="">
        ${docContentHtml(doc)}
      </div>`;
  }
  /* the document modal: FO doc-modal shell, the A4 page preview (grey canvas, zoomed to the width),
     „Date generale” rows, footer Descarcă · Închide.
     doc-viewer-v1 (2026-10-21, GEAP 2.0 11366:6892): a GENERATED document (`generated: true`) = the preview, taking
     the dialog height, + `signature` (GEAPDocPreview.signatureHtml) under it — no „Date generale” rows */
  let docModalOpener = null;
  /* the file „Descarcă” saves (demo: the modal's text, named after the document's file) */
  const docModalFile = { name: "", text: "" };
  /* the shared A4 viewer (js/doc-preview.js): the page zoomed to the canvas width minus its COMPUTED
     padding (was a private copy with a hard 48) */
  function fitDocPreview() {
    const canvas = document.querySelector("[data-cab-doc-modal]:not([hidden]) [data-cab-doc-canvas]");
    if (canvas) window.GEAPDocPreview?.fit(canvas);
  }
  function openDocModal({ title, subtitle, doc, pageHtml, rowsHtml, downloadAttrs = "", generated = false, signature = "" }) {
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
        <div class="cab-filter__body cab-doc-modal__body${generated ? " cab-doc-modal__body--doc" : ""}">
          <div class="e-permits-doc-peek__canvas cab-doc-modal__preview" data-cab-doc-canvas role="img" aria-label="Previzualizare: ${escape(doc.tip)}${doc.fisier ? `, ${escape(doc.fisier)}` : ""}">
            <div class="e-permits-dtpl__page e-permits-doc-peek__page"><div class="e-permits-dtpl__surface">${pageHtml}</div></div>
          </div>
          ${generated ? signature : `<h3 class="e-permits-fo-finish__section-title">Date generale</h3>
          ${rowsHtml}`}
        </div>
        <div class="e-permits-fo-doc-modal__footer">
          <button class="e-permits-fo-doc-modal__cancel" type="button" ${downloadAttrs}>${icon("icon-export")}<span>Descarcă</span></button>
          <button class="e-permits-fo-doc-modal__submit" type="button" data-cab-doc-close>Închide</button>
        </div>
      </div>`;
    docModalFile.name = `${String(doc.fisier || doc.tip || "document").replace(/\.[a-z0-9]+$/i, "")}.txt`;
    /* the demo file = the details rows (from `rowsHtml`, also for a generated document whose rows are not shown) */
    const rowsBox = document.createElement("div");
    rowsBox.innerHTML = rowsHtml || "";
    docModalFile.text = [title, subtitle, "", ...[...rowsBox.querySelectorAll(".e-permits-dosar-profil__row")].map((r) => `${r.querySelector(".e-permits-dosar-profil__row-label")?.textContent.trim() || ""}: ${(r.querySelector(".e-permits-dosar-profil__row-value")?.textContent || "").replace(/\s+/g, " ").trim()}`)].join("\n");
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
      const sm = await (await fetch("../data/cabinet-evo-solicitari.json?v=act-profile-v1")).json();
      (sm.perspectives?.[SUBJECT]?.dosare || [])
        .filter((dosar) => dosar.actId && dosar.status === "finalizat" && dosar.result === "aprobat" && !dosar.decisionOnly)
        .forEach((dosar) => { if (!state.dosarByAct[dosar.actId]) { state.dosarByAct[dosar.actId] = dosar.id; state.dosarNrByAct[dosar.actId] = dosar.nr; } });
      state.help = sm.help || {};
      state.restriction = sm.perspectives?.[SUBJECT]?.readOnly || null;
      state.perspective = sm.perspectives?.[SUBJECT] || null;
      state.today = sm.today || state.today;
      state.appealDays = sm.appealDays || state.appealDays;
      (state.perspective?.dosare || []).forEach((dosar) => {
        state.dosarIdByNr[dosar.nr] = dosar.id;
        if (dosar.actId) (state.dossiersByAct[dosar.actId] ||= []).push(dosar);
      });
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
