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

  const state = { permits: [], filters: [], active: "toate", query: "", geap: null, detail: null };

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
      <ul class="e-permits-fo-intent-menu cab-menu" id="${menuId}" role="menu" aria-label="Acțiuni pentru ${escape(permit.title)}" hidden>
        <li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" data-cab-open="${escape(permit.id)}">${icon("icon-eye-open", "medium")}<span>Vezi detalii</span></button></li>
        <li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" data-cab-download="${escape(permit.id)}">${icon("icon-download", "medium")}<span>Descarcă actul (MDocs)</span></button></li>
        ${items.length ? `<li role="separator" class="cab-menu__separator"></li><li role="none" class="cab-menu__label">Postprocese</li>` : ""}
        ${items.map((pp) => `
          <li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" data-cab-pp="${escape(pp.id)}" data-cab-act="${escape(permit.id)}" ${locked ? "disabled aria-disabled=\"true\"" : ""}>${icon(pp.icon || "icon-edit", "medium")}<span>${escape(pp.label)}</span></button></li>`).join("")}
      </ul>`;
  }

  function actionsHtml(permit) {
    const menuId = `cab-menu-${permit.id}`;
    return `
      <div class="e-permits-fo-intent-act__action cab-card__actions">
        <button class="btn btn-neutral btn-icon cab-card__more" type="button" aria-label="Acțiuni" aria-haspopup="menu" aria-expanded="false" aria-controls="${menuId}" data-cab-menu-trigger>${icon("icon-more-vertical", "medium")}</button>
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
    const subjectId = new URLSearchParams(window.location.search).get("as") || "pj-global-trader";
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
      const ended = ["expirat", "retras", "anulat"].includes(act.status);
      return {
        ...act,
        geap: true,
        title: act.name,
        serviceTitle: service.shortTitle || service.title,
        service: service,
        serviceCode: act.service,
        authority: [service.authority, act.subdivision].filter(Boolean).join(" · "),
        dossier: act.number,
        date: ended ? (act.status === "expirat" ? `expirat la ${act.validUntil}` : `valabil până la ${act.validUntil}`) : `valabil până la ${act.validUntil}`,
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
      <button class="btn btn-text-neutral cab-detail__back" type="button" data-cab-back>${icon("icon-arrow-left", "medium")}<span>Actele mele permisive</span></button>
      <div class="cab-detail__head">
        <div>
          <h1 class="text-heading-h2">${escape(act.title)}</h1>
          <p class="text-body-sm cab-detail__service">${escape(act.service.title || "")}</p>
        </div>
        <span class="status-tag ${STATUS_TAG[act.status] || "status-tag--neutral is-subtle"}">${escape(act.statusLabel)}</span>
      </div>
      ${act.notice ? `<div class="message message--subtle ${NOTICE_CLASS[act.notice.tone] || "banner--info"} message--small"><span class="banner__icon">${icon(act.notice.icon, "medium")}</span><div class="banner__content"><p>${escape(act.notice.text)}</p></div></div>` : ""}
      <div class="e-permits-fo-summary-card cab-detail__card">
        ${detailRow("Numărul actului permisiv", escape(act.number))}
        ${detailRow("Serviciul", escape(act.service.title || ""))}
        ${detailRow("Autoritatea emitentă", escape(act.authority))}
        ${detailRow("Data emiterii", escape(act.issued || "—"))}
        ${detailRow(act.status === "expirat" ? "A expirat la" : "Valabil până la", escape(act.validUntil || "—") + (remaining !== null ? ` <span class="cab-detail__muted">· ${remaining} zile rămase</span>` : ""))}
        ${detailRow("Statutul", escape(act.statusLabel))}
      </div>
      <div class="cab-detail__actions">
        <button class="btn btn-neutral" type="button" data-cab-download="${escape(act.id)}">${icon("icon-download", "medium")}<span>Descarcă actul</span></button>
        ${act.postProcesses.length ? `
          <div class="e-permits-fo-intent-act__action">
            <button class="btn btn-primary" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="cab-detail-menu" data-cab-menu-trigger ${act.pending ? "disabled" : ""}><span>Inițiază un postproces</span>${icon("icon-chevron-bottom", "medium")}</button>
            <ul class="e-permits-fo-intent-menu cab-menu" id="cab-detail-menu" role="menu" aria-label="Postprocese" hidden>
              ${act.postProcesses.map((pp) => `<li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" data-cab-pp="${escape(pp.id)}" data-cab-act="${escape(act.id)}">${icon(pp.icon || "icon-edit", "medium")}<span>${escape(pp.label)}</span></button></li>`).join("")}
            </ul>
          </div>` : (act.paper ? "" : `<p class="text-body-sm cab-detail__muted">Nu există postprocese disponibile pentru statutul „${escape(act.statusLabel)}”.</p>`)}
      </div>`;
    window.scrollTo(0, 0);
  }

  function daysUntil(ddmmyyyy) {
    const [d, m, y] = String(ddmmyyyy || "").split(".").map(Number);
    if (!y) return null;
    const today = new Date(2026, 9, 6);
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
      if (back) { renderDetail(null); render(); return; }
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
      els.headerTitle.textContent = data.page.title;
      els.subtitle.textContent = data.page.subtitle;
      document.title = `${data.page.title} · EVO Cabinet`;
    }

    if (data.user) {
      els.name.textContent = data.user.name;
      els.role.textContent = data.user.role;
    }
    /* the perspective whose acts are listed */
    if (state.geap.subject) {
      els.name.textContent = state.geap.subject.name;
      els.role.textContent = state.geap.subject.roleLabel || (state.geap.subject.type === "PJ" ? "Persoană juridică" : "Persoană fizică");
    }

    bind();
    bindGeap();
    render();
    document.documentElement.dataset.cabReady = "true";
  }

  init().catch((error) => {
    console.error(error);
    els.empty.hidden = false;
    els.empty.textContent = error.message;
  });
})();
