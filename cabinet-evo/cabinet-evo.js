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
  };

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

  const state = { permits: [], filters: [], active: "toate", query: "" };

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
          <h2 class="cab-card__title">${escape(permit.title)}</h2>
          <div class="cab-card__tags">
            ${tacit}
            <span class="status-tag ${STATUS_TAG[permit.status] || "status-tag--neutral is-subtle"}">${escape(permit.statusLabel)}</span>
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

  /* ---------- boot ---------- */

  async function init() {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`Nu am putut încărca datele (${response.status})`);
    const data = await response.json();

    state.permits = data.permits || [];
    state.filters = data.filters || [];

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

    bind();
    render();
  }

  init().catch((error) => {
    console.error(error);
    els.empty.hidden = false;
    els.empty.textContent = error.message;
  });
})();
