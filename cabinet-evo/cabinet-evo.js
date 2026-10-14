(() => {
  "use strict";

  const DATA_URL = "../data/cabinet-evo.json";
  const SPRITE = "../assets/icons/sprite.svg";
  /* Figma marks only the suspended count with the accent badge */
  const ACCENT_STATES = ["suspendat"];

  /* status → library .status-tag variant */
  const STATUS_TAG = {
    valabil: "status-tag--success is-subtle",
    expirat: "status-tag--neutral is-subtle",
    suspendat: "status-tag--accent is-strong",
    anulat: "status-tag--danger is-strong",
    retras: "status-tag--danger is-subtle",
  };

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
    chips: document.querySelector("[data-cab-chips]"),
    empty: document.querySelector("[data-cab-empty]"),
    search: document.querySelector("[data-cab-search]"),
    searchClear: document.querySelector("[data-cab-search-clear]"),
    title: document.querySelector("[data-cab-title]"),
    headerTitle: document.querySelector("[data-cab-header-title]"),
    subtitle: document.querySelector("[data-cab-subtitle]"),
    name: document.querySelector("[data-cab-name]"),
    role: document.querySelector("[data-cab-role]"),
    avatarMenu: document.querySelector("[data-fo-avatar-menu]"),
    avatarTrigger: document.querySelector("[data-fo-avatar-trigger]"),
    avatarPanel: document.querySelector("[data-fo-avatar-dropdown]"),
  };

  const state = { permits: [], filters: [], active: "toate", query: "", geap: null, detail: null, dosarByAct: {} };

  /* ---------- compartments ----------
     One page, three views (?view=): Solicitările mele (solicitari.js), Actele mele
     permisive (this file) and the public catalog (catalog.js). ?as=<subject> is the
     perspective, ?auth=0 a visitor without an MPass session (catalog only). */
  const params = new URLSearchParams(window.location.search);
  const VIEWS = {
    solicitari: { title: "Solicitările mele" },
    acte: { title: "Actele mele permisive" },
    catalog: { title: "Catalogul serviciilor" },
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

  function countFor(id) {
    return id === "toate"
      ? state.permits.length
      : state.permits.filter((permit) => permit.status === id).length;
  }

  function renderChips() {
    els.chips.innerHTML = state.filters
      .map((filter) => {
        const count = countFor(filter.id);
        const accent = ACCENT_STATES.includes(filter.id) && count > 0;
        return `
          <button
            class="chip${filter.id === state.active ? " is-selected" : ""}"
            type="button"
            role="tab"
            aria-selected="${filter.id === state.active}"
            aria-pressed="${filter.id === state.active}"
            data-cab-chip="${escape(filter.id)}"
          >
            <span class="chip__label">${escape(filter.label)}</span>
            <span class="chip__badge${accent ? " chip__badge--accent" : ""}">${count}</span>
          </button>`;
      })
      .join("");
  }

  function postprocessMenuHtml(permit, menuId) {
    const items = permit.postProcesses || [];
    const locked = Boolean(permit.pending);
    return `
      <ul class="e-permits-fo-intent-menu e-permits-stack__menu cab-menu" id="${menuId}" role="menu" aria-label="Acțiuni pentru ${escape(permit.title)}" hidden>
        <li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" data-cab-open="${escape(permit.id)}">${icon("icon-eye-open", "medium")}<span>Detalii</span></button></li>
        <li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" data-cab-download="${escape(permit.id)}">${icon("icon-download")}<span>Descarcă actul (MDocs)</span></button></li>
        ${items.length ? `<li role="separator" class="cab-menu__separator"></li><li role="none" class="cab-menu__label">Postprocese</li>` : ""}
        ${items.map((pp) => `
          <li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" data-cab-pp="${escape(pp.id)}" data-cab-act="${escape(permit.id)}" ${locked ? "disabled aria-disabled=\"true\"" : ""}>${icon(pp.icon || "icon-edit", "medium")}<span>${escape(pp.label)}</span></button></li>`).join("")}
      </ul>`;
  }

  function actionsHtml(permit) {
    const menuId = `cab-menu-${permit.id}`;
    return `
      <div class="e-permits-fo-intent-act__action cab-card__actions">
        <button class="btn btn-strict btn-sm btn-icon-only cab-card__more" type="button" aria-label="Acțiuni" aria-haspopup="menu" aria-expanded="false" aria-controls="${menuId}" data-cab-menu-trigger>${icon("icon-more-vertical")}</button>
        ${postprocessMenuHtml(permit, menuId)}
      </div>`;
  }

  function cardMarkup(permit) {
    const tacit = permit.tacit
      ? `<span class="cab-card__tacit">${icon("icon-checkmark-small")}${escape(permit.tacit)}</span>`
      : "";

    const notice = permit.notice
      ? `<div class="message message--subtle ${NOTICE_CLASS[permit.notice.tone] || "banner--info"} message--small">
           <span class="banner__icon">${icon(permit.notice.icon, "medium")}</span>
           <div class="banner__content"><p>${escape(permit.notice.text)}</p></div>
         </div>`
      : "";

    return `
      <article class="cab-card" tabindex="0" data-cab-card="${escape(permit.id)}">
        <div class="cab-card__container">
        <div class="cab-card__head">
          <div class="cab-card__heading">
            <h2 class="cab-card__title">${escape(permit.title)}</h2>
            ${permit.serviceTitle ? `<p class="cab-card__service">${escape(permit.serviceTitle)}</p>` : ""}
          </div>
          <div class="cab-card__tags">
            ${tacit}
            <span class="status-tag ${STATUS_TAG[permit.status] || "status-tag--neutral is-subtle"}">${escape(permit.statusLabel)}</span>
            ${permit.geap ? actionsHtml(permit) : ""}
          </div>
        </div>

        <div class="cab-card__meta">
          <span class="cab-card__meta-item"><span class="icon medium cab-card__authority-icon" aria-hidden="true"></span>${escape(permit.authority)}</span>
          <span class="cab-card__dot" aria-hidden="true"></span>
          ${copyValueHtml(permit.dossier)}
          <span class="cab-card__dot" aria-hidden="true"></span>
          <span class="cab-card__meta-item">${icon(permit.dateIcon || "icon-calendar", "medium")}${escape(permit.date)}</span>
        </div>

        ${notice}
        </div>
      </article>`;
  }

  function visiblePermits() {
    const query = state.query.trim().toLowerCase();
    return state.permits.filter((permit) => {
      if (state.active !== "toate" && permit.status !== state.active) return false;
      if (!query) return true;
      return [permit.title, permit.dossier, permit.authority]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
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
    const permits = visiblePermits();
    els.list.innerHTML = permits.map(cardMarkup).join("");
    els.empty.hidden = permits.length > 0;
    /* the shared empty state: no acts at all vs. nothing matches the chips / search */
    els.empty.innerHTML = permits.length ? "" : state.permits.length
      ? window.GEAPEmptyState.noResults("Niciun act permisiv nu corespunde căutării", {
        text: state.query.trim() ? "Verificați ortografia sau încercați alți termeni." : "Alegeți altă stare sau resetați filtrele.",
        actionHtml: '<button class="btn btn-neutral btn-sm" type="button" data-cab-reset>Resetează filtrele</button>'
      })
      : window.GEAPEmptyState.render({ title: "Nu aveți acte permisive", text: "Actele emise pe numele dvs. apar aici.", icon: "page-text" });
    syncSearchState();
    renderChips();
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
    els.chips.addEventListener("click", (event) => {
      const chip = event.target.closest("[data-cab-chip]");
      if (!chip) return;
      state.active = chip.dataset.cabChip;
      render();
    });

    els.search.addEventListener("input", (event) => {
      state.query = event.target.value;
      render();
    });

    els.searchClear.addEventListener("click", () => {
      state.query = "";
      els.search.value = "";
      els.search.focus();
      render();
    });

    els.empty.addEventListener("click", (event) => {
      if (!event.target.closest("[data-cab-reset]")) return;
      state.query = "";
      state.active = "toate";
      els.search.value = "";
      render();
      els.search.focus();
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

  async function loadGeapActs() {
    const response = await fetch(GEAP_URL);
    if (!response.ok) return { acts: [], config: {} };
    const data = await response.json();
    const config = data.frontOfficeFlows?.[0]?.intent || {};
    const subjectId = SUBJECT;
    const acts = (config.acts?.[subjectId] || []).map((act) => {
      const service = config.services?.[act.service] || {};
      const allowed = service.allows || [];
      const postProcesses = act.paper ? [] : (config.availability?.[act.status] || [])
        .filter((id) => allowed.includes(id) && config.postProcesses?.[id])
        .map((id) => ({ id, ...config.postProcesses[id] }));
      const pendingLabel = act.pending ? config.postProcesses?.[act.pending.type]?.label || act.pending.type : "";
      let notice = null;
      if (act.paper) notice = { tone: "info", icon: "icon-circle-info-filled", text: "Act emis pe hârtie, în afara GEAP. Postprocesele sunt disponibile doar la ghișeul autorității emitente." };
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
        notice,
      };
    });
    const subject = (data.frontOfficeFlows?.[0]?.subjects || []).find((item) => item.id === subjectId);
    return { acts, config, subjectId, subject };
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
    modal.innerHTML = `
      <div class="e-permits-fo-instance-switch-modal__card" tabindex="-1">
        <div class="e-permits-fo-instance-switch-modal__body">
          <div class="e-permits-fo-instance-switch-modal__icon" aria-hidden="true">${icon("icon-warning-filled", "medium")}</div>
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
          <a class="e-permits-fo-instance-switch-modal__primary" href="${escape(foUrl(act, pp))}" data-cab-pp-confirm>Confirm și continui</a>
        </div>
      </div>`;
    modal.hidden = false;
    modal.querySelector("[data-cab-pp-cancel]")?.focus();
  }

  function detailRow(label, value) {
    return `<div class="e-permits-fo-summary-row"><span class="e-permits-fo-summary-row__label">${escape(label)}</span><div class="e-permits-fo-summary-row__value"><span>${value}</span></div></div>`;
  }

  /* act profile (Feature 90818 step 3): data, download, post-processes */
  function renderDetail(act) {
    let panel = document.querySelector("[data-cab-detail]");
    if (!panel) {
      panel = document.createElement("section");
      panel.className = "cab-detail";
      panel.dataset.cabDetail = "";
      els.list.insertAdjacentElement("afterend", panel);
    }
    const listParts = [document.querySelector(".cab-intro"), document.querySelector(".cab-toolbar"), els.chips, els.list, els.empty];
    if (!act) {
      panel.hidden = true;
      listParts.forEach((el) => { if (el) el.hidden = el === els.empty ? els.empty.hidden : false; });
      state.detail = null;
      return;
    }
    state.detail = act.id;
    listParts.forEach((el) => { if (el) el.hidden = true; });
    const remaining = act.status === "valabil" ? daysUntil(act.validUntil) : null;
    panel.hidden = false;
    panel.innerHTML = `
      ${pageHeader({
        crumbs: [{ label: "Actele mele permisive", href: cabUrl("acte"), attr: "data-cab-back" }, { label: act.service.title || "" }, { label: act.number }],
        title: act.title,
        meta: [
          ["Numărul actului", copyValueHtml(act.number).replace(/aria-label="[^"]*"/, `aria-label="Copiază numărul actului ${escape(act.number)}"`)],
          ["Statutul", `<span class="status-tag ${STATUS_TAG[act.status] || "status-tag--neutral is-subtle"}">${escape(act.statusLabel)}</span>`],
          ["Emis la", escape(longDate(act.issued) || "—")],
          [act.status === "expirat" ? "A expirat la" : "Valabil până la", escape(longDate(act.validUntil) || "—")],
          ["Autoritatea emitentă", escape(act.authority)],
        ],
      })}
      ${act.notice ? `<div class="message message--subtle ${NOTICE_CLASS[act.notice.tone] || "banner--info"} message--small"><span class="banner__icon">${icon(act.notice.icon, "medium")}</span><div class="banner__content"><p>${escape(act.notice.text)}</p></div></div>` : ""}
      <div class="e-permits-fo-summary-card cab-detail__card">
        ${detailRow("Numărul actului permisiv", escape(act.number))}
        ${detailRow("Serviciul", escape(act.service.title || ""))}
        ${detailRow("Autoritatea emitentă", escape(act.authority))}
        ${detailRow("Data emiterii", escape(longDate(act.issued) || "—"))}
        ${detailRow(act.status === "expirat" ? "A expirat la" : "Valabil până la", escape(longDate(act.validUntil) || "—") + (remaining !== null ? ` <span class="cab-detail__muted">· ${remaining} zile rămase</span>` : ""))}
        ${detailRow("Statutul", escape(act.statusLabel))}
      </div>
      <div class="cab-detail__actions">
        <button class="btn btn-neutral btn-md btn-rounded" type="button" data-cab-download="${escape(act.id)}">${icon("icon-download")}<span>Descarcă actul</span></button>
        ${state.dosarByAct[act.id] ? `<a class="btn btn-neutral btn-md btn-rounded" href="${escape(cabUrl("solicitari", {}, `#dosar/${state.dosarByAct[act.id]}`))}" data-cab-see-dosar>${icon("icon-page-text")}<span>Vezi solicitarea</span></a>` : ""}
        ${act.postProcesses.length ? `
          <div class="e-permits-fo-intent-act__action">
            <button class="btn btn-primary btn-md btn-rounded" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="cab-detail-menu" data-cab-menu-trigger ${act.pending ? "disabled" : ""}><span>Inițiază un postproces</span>${icon("icon-chevron-bottom")}</button>
            <ul class="e-permits-fo-intent-menu e-permits-stack__menu cab-menu" id="cab-detail-menu" role="menu" aria-label="Postprocese" hidden>
              ${act.postProcesses.map((pp) => `<li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" data-cab-pp="${escape(pp.id)}" data-cab-act="${escape(act.id)}">${icon(pp.icon || "icon-edit", "medium")}<span>${escape(pp.label)}</span></button></li>`).join("")}
            </ul>
          </div>` : (act.paper ? "" : `<p class="text-body-sm cab-detail__muted">Nu există postprocese disponibile pentru statutul „${escape(act.statusLabel)}”.</p>`)}
      </div>`;
    syncHeaderMeta();
    window.scrollTo(0, 0);
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
      if (download) { event.stopPropagation(); closeMenus(); return; }
      if (ppBtn && !ppBtn.disabled) {
        event.stopPropagation();
        closeMenus();
        const act = state.permits.find((p) => p.id === ppBtn.dataset.cabAct);
        const pp = act?.postProcesses.find((x) => x.id === ppBtn.dataset.cabPp);
        if (act && pp) confirmPostprocess(act, pp);
        return;
      }
      if (openBtn) { closeMenus(); renderDetail(state.permits.find((p) => p.id === openBtn.dataset.cabOpen)); return; }
      if (card && !event.target.closest(".cab-card__actions, [data-fo-copy-value]")) {
        const act = state.permits.find((p) => p.id === card.dataset.cabCard);
        if (act?.geap) renderDetail(act);
        return;
      }
      if (!event.target.closest(".cab-menu")) closeMenus();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      closeMenus();
      const modal = document.querySelector("[data-cab-pp-modal]");
      if (modal) modal.hidden = true;
    });
  }


  /* the back-office detail header (.e-permits-page-header, Figma 8993:37914), used by every
     cabinet profile (dosar, act, catalog service) at the page column width: breadcrumbs
     (links carry their data-* hook) over the 24/32 title, an optional aside (tags), then the
     meta row of label / value pairs split by vertical separators (user, 2026-10-12) */
  function pageHeader({ crumbs = [], title = "", titleId = "", aside = "", meta = [] }) {
    const trail = crumbs.map((crumb, index) => index < crumbs.length - 1
      ? `<li class="breadcrumbs__item"><a class="breadcrumbs__link" href="${escape(crumb.href || "#")}" ${crumb.attr || ""}>${escape(crumb.label)}</a></li>`
      : `<li class="breadcrumbs__item is-selected"><span class="breadcrumbs__current" aria-current="page">${escape(crumb.label)}</span></li>`).join("");
    return `
      <header class="e-permits-page-header cab-page-header">
        <div class="e-permits-page-header__body">
          <div class="e-permits-page-header__top">
            <div class="e-permits-page-header__heading">
              <nav class="breadcrumbs breadcrumbs--truncate" aria-label="Navigare"><ol class="breadcrumbs__list">${trail}</ol></nav>
              <h1 class="e-permits-page-header__title"${titleId ? ` id="${titleId}" tabindex="-1"` : ""} title="${escape(title)}">${escape(title)}</h1>
            </div>
            ${aside ? `<div class="e-permits-page-header__aside"><div class="e-permits-page-header__actions">${aside}</div></div>` : ""}
          </div>
          ${meta.length ? `<div class="e-permits-page-header__meta" data-cab-header-meta>${meta.filter(Boolean).map(([label, html]) => `
            <div class="e-permits-page-header__meta-item">
              <span class="e-permits-page-header__meta-label">${escape(label)}</span>
              <span class="e-permits-page-header__meta-value">${html}</span>
            </div>`).join("")}</div>` : ""}
        </div>
      </header>`;
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
     „de …” · „Semnat electronic”); with a key: „Detalii” (eye) + ⋮ Descarcă, the whole card opens the
     document modal (page preview + details). */
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
  /* key: opens / downloads it (data-cab-doc…); downloadAttrs: the page's own download hook */
  function docRowHtml(doc, { key = "", downloadAttrs = "" } = {}) {
    const source = DOC_SOURCES[doc.sursa] || DOC_SOURCES.upload;
    const menuId = key ? `cab-doc-menu-${key.replace(/[^\w-]/g, "-")}` : "";
    return `
      <div class="e-permits-fo-confirm-file e-permits-fo-confirm-file--doc cab-doc${key ? " is-clickable" : ""}"${key ? ` data-cab-doc="${escape(key)}"` : ""}>
        <img class="e-permits-fo-confirm-file__icon" width="24" height="24" src="../assets/icons/${source.icon}" alt="">
        ${docContentHtml(doc)}
        ${key ? `
        <div class="cab-doc__actions">
          <button class="btn btn-neutral btn-sm" type="button" aria-haspopup="dialog" aria-label="Detalii: ${escape(doc.tip)}" data-cab-doc-open="${escape(key)}">${icon("icon-eye-open")}<span>Detalii</span></button>
          <div class="e-permits-fo-intent-act__action cab-card__actions">
            <button class="btn btn-strict btn-sm btn-icon-only cab-card__more" type="button" aria-label="Acțiuni pentru ${escape(doc.tip)}" data-tooltip-label="Mai multe acțiuni" aria-haspopup="menu" aria-expanded="false" aria-controls="${menuId}" data-cab-menu-trigger>${icon("icon-more-vertical")}</button>
            <ul class="e-permits-fo-intent-menu e-permits-stack__menu cab-menu" id="${menuId}" role="menu" aria-label="Acțiuni pentru ${escape(doc.tip)}" hidden>
              <li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" ${downloadAttrs}>${icon("icon-download", "medium")}<span>Descarcă</span></button></li>
            </ul>
          </div>
        </div>` : ""}
      </div>`;
  }
  /* the document modal: FO doc-modal shell, the A4 page preview (grey canvas, zoomed to the width),
     „Date generale” rows, footer Descarcă · Închide */
  let docModalOpener = null;
  function fitDocPreview() {
    const canvas = document.querySelector("[data-cab-doc-modal]:not([hidden]) [data-cab-doc-canvas]");
    const page = canvas?.querySelector(".e-permits-doc-peek__page");
    if (page && canvas.clientWidth) page.style.zoom = String(Math.min(1, (canvas.clientWidth - 48) / 794));
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
        if (event.target === overlay || event.target.closest("[data-cab-doc-close]")) closeDocModal();
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
          <button class="e-permits-fo-doc-modal__cancel" type="button" ${downloadAttrs}>${icon("icon-download")}<span>Descarcă</span></button>
          <button class="e-permits-fo-doc-modal__submit" type="button" data-cab-doc-close>Închide</button>
        </div>
      </div>`;
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
    icon, escape, copyValueHtml, closeMenus, cabUrl, longDate, longDateTime, setHeaderTitle,
    docRowHtml, docContentHtml, openDocModal, closeDocModal, signedTagHtml,
    pageHeader, syncHeaderMeta,
    els,
  };

  /* ---------- boot ---------- */

  async function init() {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`Nu am putut încărca datele (${response.status})`);
    const data = await response.json();

    state.filters = data.filters || [];
    state.geap = await loadGeapActs();
    state.permits = state.geap.acts.length ? state.geap.acts : data.permits || [];

    if (data.page) {
      els.title.textContent = data.page.title;
      els.subtitle.textContent = data.page.subtitle;
    }
    applyView();
    /* Finalizat-Aprobat dosare ↔ their act („Vezi solicitarea” / „Vezi actul”) */
    try {
      const sm = await (await fetch("../data/cabinet-evo-solicitari.json")).json();
      (sm.perspectives?.[SUBJECT]?.dosare || [])
        .filter((dosar) => dosar.actId && dosar.status === "finalizat" && dosar.result === "aprobat" && !dosar.decisionOnly)
        .forEach((dosar) => { if (!state.dosarByAct[dosar.actId]) state.dosarByAct[dosar.actId] = dosar.id; });
    } catch { /* the act profile simply has no link */ }

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
