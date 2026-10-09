document.addEventListener("DOMContentLoaded", () => {
  const shell = document.querySelector("[data-shell]");
  const toggle = document.querySelector("[data-shell-toggle]");
  const userTrigger = document.querySelector(".e-permits-shell__user-trigger");
  const shellNav = document.querySelector("[data-shell-nav]");
  const helpMenu = document.querySelector("[data-help-menu]");
  const helpTrigger = document.querySelector("[data-help-trigger]");
  const helpPanel = document.querySelector("[data-help-panel]");
  const userMenu = document.querySelector("[data-user-menu]");
  const userPanel = document.querySelector("[data-user-panel]");
  const userMeta = document.querySelector(".e-permits-shell__user-meta");
  const roleGroupsPanel = document.querySelector("[data-shell-role-groups]");
  const roleOpeners = document.querySelectorAll("[data-role-open]");
  const roleOptions = document.querySelectorAll("#shell-role-modal [data-role-option]");
  const desktopMedia = window.matchMedia("(min-width: 961px)");
  const collapsePath = document.querySelector(".e-permits-shell__collapse-shape-path");
  const workplaceTitle = document.querySelector("[data-workplace-title]");
  const workplaceRefresh = document.querySelector(".e-permits-workplace__refresh");
  const workplaceRows = document.querySelector("[data-workplace-rows]");
  const workplaceTotal = document.querySelector("[data-workplace-total]");
  const workplacePanel = document.querySelector("[data-workplace]");
  const workplaceSearch = document.querySelector("[data-workplace-search]");
  const workplaceTabs = document.querySelector("[data-workplace-tabs]");
  const workplaceTable = document.querySelector(".e-permits-workplace__table");
  const workplaceHead = document.querySelector("[data-workplace-head]") || workplaceTable?.querySelector("thead tr");
  const workplacePagination = document.querySelector(".e-permits-workplace__pagination");
  const workplaceFieldCount = document.querySelector(".e-permits-workplace__field-count");
  const workplaceToolbar = document.querySelector("[data-workplace-toolbar]");
  const workplaceAddUser = document.querySelector("[data-workplace-add-user]");
  const workplaceSyncService = document.querySelector("[data-workplace-sync-service]");
  const userCreate = document.querySelector("[data-user-create]");
  const userCreateDrawer = userCreate?.querySelector(".e-permits-user-create__drawer");
  const userCreateBody = userCreate?.querySelector("[data-user-create-body]");
  const userCreateSubmit = userCreate?.querySelector("[data-user-create-submit]");
  const permitsProfilePanel = document.querySelector(".permits-profile");
  const workplacePageSizeOptions = [16, 32, 48, 96];
  const dosarProfilPanel = document.querySelector("[data-dosar-profil]");
  const dosarProfilTitleRow = document.querySelector("[data-dosar-profil-title-row]");
  const dosarProfilSummary = document.querySelector("[data-dosar-profil-summary]");
  const dosarProfilTabs = document.querySelector("[data-dosar-profil-tabs]");
  const dosarProfilPanelBody = document.querySelector("[data-dosar-profil-panel]");
  const dosarProfilBackShell = document.querySelector("[data-dosar-profil-back-shell]");
  const userProfilePanel = document.querySelector("[data-user-profile]");
  const userProfileTitle = document.querySelector("[data-user-profile-title]");
  const userProfileSummary = document.querySelector("[data-user-profile-summary]");
  const userProfileTabs = document.querySelector("[data-user-profile-tabs]");
  const userProfilePanelBody = document.querySelector("[data-user-profile-panel]");
  const userProfileBackShell = document.querySelector("[data-user-profile-back-shell]");
  const roleProfilePanel = document.querySelector("[data-role-profile]");
  const roleProfileTitle = document.querySelector("[data-role-profile-title]");
  const roleProfileSummary = document.querySelector("[data-role-profile-summary]");
  const roleProfileTabs = document.querySelector("[data-role-profile-tabs]");
  const roleProfilePanelBody = document.querySelector("[data-role-profile-panel]");
  const roleProfileBackShell = document.querySelector("[data-role-profile-back-shell]");

  let morphFrame = null;
  let workplaceDb = null;
  let dossierDb = null;
  let usersDb = null;
  let rsspDb = null;
  let sarciniDb = null;
  let roleAdminDb = null;
  let activeRegistry = "dossiers";

  /* ---- routing: every page has its own address ---------------------------------
     #<nav-id> for a menu page (pushed, so Back works), #dosar/… #serviciu/…
     #utilizator/… #rol/… for profiles (replaced). A refresh or Back re-reads the
     hash (routeFromHash); closing a profile restores its page's hash. */
  let routingFromHash = false;
  const activeNavId = () => document.querySelector("[data-nav-item].is-active")?.dataset.navId || "";
  const writeHash = (hash, { push = false } = {}) => {
    const url = `${window.location.pathname}${window.location.search}${hash}`;
    if (window.location.hash === hash) return;
    if (push && !routingFromHash) history.pushState(null, "", url);
    else history.replaceState(null, "", url);
  };
  const restorePageHash = () => {
    const id = activeNavId();
    if (id) writeHash(`#${id}`);
    else history.replaceState(null, "", window.location.pathname + window.location.search);
  };
  /* a profile lights up the menu item it belongs to */
  const setActiveNav = (navId) => {
    const target = document.querySelector(`[data-nav-item][data-nav-id="${navId}"]`);
    if (!target) return;
    document.querySelectorAll("[data-nav-item]").forEach((link) => {
      const isActive = link === target;
      link.classList.toggle("is-active", isActive);
      if (isActive) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  };
  let rolesDb = null;
  let activeAssignmentId = null;
  let userCreateReturnFocus = null;
  const workplaceState = {
    viewKey: "mine",
    tabKey: null,
    query: "",
    page: 1,
    pageSize: 16,
    sortKey: "dataDepunerii",
    sortDirection: "desc",
    rows: [],
    selected: new Set()
  };
  const dosarProfilState = {
    rowId: null,
    tabKey: "general",
    returnTo: "dossiers"
  };
  const userProfileState = {
    rowId: null,
    tabKey: "general",
    draft: null,
    comboForm: null,
    permOpenGroups: new Set(),
    permSearch: "",
    permFilter: "all",
    permAdd: new Set(),
    permRemove: new Set()
  };
  const userCreateState = {
    idnp: "",
    person: null,
    lookupError: "",
    functie: "",
    comments: "",
    additionalInfo: "",
    isAddingCombination: false,
    combinationDraft: {
      roleId: "",
      authorityId: "",
      subdivisionId: ""
    },
    combinations: []
  };

  if (!shell) {
    return;
  }

  const parsePath = (value) => {
    const matches = value.match(/-?\d+(\.\d+)?/g) || [];
    return matches.map(Number);
  };

  const buildPath = (points) => `M${points[0]} ${points[1]}L${points[2]} ${points[3]}L${points[4]} ${points[5]}`;

  const morphPath = (targetPath) => {
    if (!collapsePath || !targetPath) {
      return;
    }

    const from = parsePath(collapsePath.getAttribute("d") || collapsePath.dataset.defaultD || "");
    const to = parsePath(targetPath);

    if (from.length !== 6 || to.length !== 6) {
      collapsePath.setAttribute("d", targetPath);
      return;
    }

    if (morphFrame) {
      window.cancelAnimationFrame(morphFrame);
    }

    const start = performance.now();
    const duration = 180;
    const ease = (t) => 1 - Math.pow(1 - t, 3);

    const step = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = ease(progress);
      const next = from.map((value, index) => value + (to[index] - value) * eased);

      collapsePath.setAttribute("d", buildPath(next));

      if (progress < 1) {
        morphFrame = window.requestAnimationFrame(step);
      } else {
        morphFrame = null;
      }
    };

    morphFrame = window.requestAnimationFrame(step);
  };

  const syncCollapseGlyph = (isHovering = false) => {
    if (!collapsePath) {
      return;
    }

    const isCollapsed = shell.classList.contains("is-collapsed");
    const target = isHovering
      ? (isCollapsed ? collapsePath.dataset.expandD : collapsePath.dataset.collapseD)
      : collapsePath.dataset.defaultD;

    morphPath(target);
  };

  const syncExpandedState = () => {
    if (!toggle) {
      return;
    }

    const isCollapsed = shell.classList.contains("is-collapsed");
    toggle.setAttribute("aria-pressed", String(isCollapsed));
    toggle.setAttribute("aria-label", isCollapsed ? "Extinde meniul" : "Colapsează meniul");

    const tooltipLabel = isCollapsed
      ? toggle.dataset.tooltipCollapsed
      : toggle.dataset.tooltipExpanded;
    const tooltip = toggle.querySelector(".e-permits-shell__collapse-tooltip");

    if (tooltipLabel && tooltip) {
      tooltip.textContent = tooltipLabel;
    }

    syncCollapseGlyph(toggle.matches(":hover") || toggle.matches(":focus-visible"));
  };

  const setupNavTooltips = () => {
    document.querySelectorAll("[data-nav-item]").forEach((item) => {
      const label =
        item.getAttribute("title") ||
        item.dataset.navLabel ||
        item.querySelector(".e-permits-shell__nav-text")?.textContent?.trim();

      if (!label) {
        return;
      }

      item.dataset.navLabel = label;
      item.setAttribute("aria-label", label);
      item.removeAttribute("title");

      if (!item.querySelector(".e-permits-shell__nav-tooltip")) {
        const tooltip = document.createElement("span");
        tooltip.className = "e-permits-shell__nav-tooltip";
        tooltip.setAttribute("aria-hidden", "true");
        tooltip.textContent = label;
        item.appendChild(tooltip);
      }
    });
  };

  /* library .search-input actions: spinner while typing + clear (x); js/search.js
     toggles has-value / is-typing / is-ready on every search, also ones rendered later */
  const renderSearchActions = () => `<div class="btn-group"><span class="spinner spinner--extra-small spinner--brand" aria-hidden="true"></span><button type="button" class="btn-icon clear" aria-label="Șterge căutarea"><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-cross-small"></use></svg></button></div>`;

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  /* the full-flow required marker (.e-permits-fo-required) */
  /* Toggle — the one switch of the back office (Tailwind "toggle with label on the
     right" geometry, our type): 44×24 track, 20px knob, 2px inset, 12px gap, then the
     label (14/20 medium) over an optional description (14/20 tertiary).
     attrs carry the data-* hooks; the input is a real checkbox with role="switch". */
  let toggleSeq = 0;
  const renderToggle = ({ label, description = "", checked = false, attrs = "", disabled = false }) => {
    const id = `e-permits-toggle-${toggleSeq += 1}`;
    return `
      <div class="e-permits-toggle">
        <span class="e-permits-toggle__control">
          <input class="e-permits-toggle__input" type="checkbox" role="switch" id="${id}"${description ? ` aria-describedby="${id}-desc"` : ""}${checked ? " checked" : ""}${disabled ? " disabled" : ""} ${attrs}>
          <span class="e-permits-toggle__knob" aria-hidden="true"></span>
        </span>
        <span class="e-permits-toggle__text">
          <label class="e-permits-toggle__label" for="${id}">${escapeHtml(label)}</label>
          ${description ? `<span class="e-permits-toggle__description" id="${id}-desc">${escapeHtml(description)}</span>` : ""}
        </span>
      </div>
    `;
  };

  /* explanatory note (not a field hint): the library neutral info-box, compact —
     grey surface + info icon, so it reads as information, not as a control */
  /* tinted inline alert — the one component for info / success / warning / error notes
     inside content (geometry in CSS "Inline note"); icon follows the tone */
  const NOTICE_ICONS = { info: "circle-info-filled", success: "circle-checkmark-filled", warning: "warning-filled", error: "circle-error-filled" };
  const renderNotice = (tone, html, { icon = NOTICE_ICONS[tone] || "circle-info-filled", role = "status" } = {}) => `
    <div class="message message--subtle banner--${tone}" role="${role}">
      <span class="banner__icon"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${icon}"></use></svg></span>
      <div class="banner__content"><p class="banner__text">${html}</p></div>
    </div>
  `;

  /* the note at the TOP of a passport tab (what the tab is / where its data comes from):
     always the blue Mesaj · subtil Info banner, as on Date generale */
  const renderTabNotice = (html) => `
    <div class="message message--subtle banner--info e-permits-passport__notice">
      <span class="banner__icon"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-info-filled"></use></svg></span>
      <div class="banner__content">
        <p class="banner__text">${html}</p>
      </div>
    </div>
  `;

  /* a list's closing note in the Sum list tray: attached under the list, inset 12,
     square top — the same tray as a total, with the info icon instead of the sum */
  const renderListNote = (html) => `
    <div class="e-permits-sum-list__total e-permits-sum-list__note">
      <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-info-filled"></use></svg>
      <p>${html}</p>
    </div>
  `;

  const renderInfoNote = (html) => `
    <div class="info-box info-box--neutral e-permits-info-note">
      <span class="info-box__icon"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-info-filled"></use></svg></span>
      <div class="info-box__content"><p>${html}</p></div>
    </div>
  `;

  /* where an action leads (Figma 9721:9920): a tertiary label over a grey box with an
     arrow and the target step — used under every step form and confirmation */
  const renderNextStep = (target, { label = "Următorul pas", icon = "arrow-right" } = {}) => target ? `
    <div class="e-permits-next-step">
      <span class="e-permits-next-step__label">${escapeHtml(label)}</span>
      <div class="e-permits-next-step__box">
        <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${icon}"></use></svg>
        <span>${escapeHtml(target)}</span>
      </div>
    </div>
  ` : "";

  /* a list with its sum (Figma 9721:9920): the grey total tray hangs under the bordered
     list, inset 12, square top, rounded bottom */
  const renderSumList = (listHtml, total) => `
    <div class="e-permits-sum-list">
      ${listHtml}
      <div class="e-permits-sum-list__total"><span>Total</span><strong>${escapeHtml(total)}</strong></div>
    </div>
  `;

  const requiredMark = () => `
    <span class="e-permits-fo-required" aria-label="obligatoriu"><svg class="icon" width="12" height="12" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-asterisk"></use></svg></span>
  `;

  /* ---- form controls: the full-flow components, everywhere -------------------
     Field    .e-permits-fo-field > label + control + .e-permits-fo-field__hint
     Text     .e-permits-fo-input (is-filled is-readonly / is-error)
     Textarea .e-permits-fo-textarea
     Select   .e-permits-fo-select — the full-flow dropdown. It wraps a hidden
              native <select> that keeps the value and fires "change", so form
              handlers read select.value exactly as before. */
  const renderFoSelectControl = ({ id, attrs = "", optionsHtml, disabled = false, label = "", error = false }) => {
    const probe = document.createElement("select");
    probe.innerHTML = optionsHtml;
    const chosen = probe.querySelector("option[selected]") || probe.options[0];
    const isPlaceholder = !chosen || chosen.value === "";

    return `
      <div class="e-permits-fo-select${disabled ? " is-disabled" : ""}${error ? " is-error" : ""}" data-fo-native-select>
        <select ${attrs} hidden tabindex="-1"${disabled ? " disabled" : ""}>${optionsHtml}</select>
        <button class="e-permits-fo-select__button" type="button" id="${escapeHtml(id)}" aria-haspopup="listbox" aria-expanded="false"${label ? ` aria-label="${escapeHtml(label)}"` : ""}${disabled ? " disabled" : ""}>
          <span class="e-permits-fo-select__value${isPlaceholder ? " e-permits-fo-select__value--placeholder" : ""}">${escapeHtml(chosen?.textContent.trim() || "")}</span>
          <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
        </button>
      </div>
    `;
  };

  /* single choice from a few options = library chips (mono-select): the
     selected chip carries the check icon, as in Components/chip.html */
  const renderChoiceChips = ({ label, labelId, name, options, value, disabledValues = [] }) => `
    <div class="e-permits-rt__chips" role="radiogroup" aria-labelledby="${labelId}">
      ${options.map(([key, text]) => {
        const selected = key === value;
        const disabled = disabledValues.includes(key);
        return `
          <button type="button" class="chip${selected ? " is-selected" : ""}${disabled ? " is-disabled" : ""}" role="radio" aria-checked="${selected ? "true" : "false"}" data-${name}="${escapeHtml(key)}"${disabled ? ' disabled aria-disabled="true"' : ""}>
            ${selected ? `<span class="chip__icon"><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-checkmark-small"></use></svg></span>` : ""}
            <span class="chip__label">${escapeHtml(text)}</span>
          </button>
        `;
      }).join("")}
    </div>
  `;

  /* hidden selects are not focusable — focus the dropdown button instead */
  const focusFormControl = (control) => {
    const target = control?.matches?.("select[hidden]")
      ? control.closest("[data-fo-native-select]")?.querySelector(".e-permits-fo-select__button")
      : control;
    target?.focus();
  };

  /* open lists float (fixed) next to the trigger so modals and drawers never
     clip them; up when there is no room below — the full-flow
     positionFloatingSelectList rule */
  const placeFloatingList = (trigger, list, root) => {
    const rect = trigger.getBoundingClientRect();
    const gap = 4;
    const edge = 8;
    const below = window.innerHeight - rect.bottom - gap - edge;
    const above = rect.top - gap - edge;
    const openUp = below < 180 && above > below;

    list.classList.add("is-floating");
    Object.assign(list.style, {
      position: "fixed",
      left: `${Math.round(rect.left)}px`,
      width: `${Math.round(rect.width)}px`,
      maxHeight: `${Math.round(Math.max(144, Math.min(280, openUp ? above : below)))}px`,
      top: openUp ? "auto" : `${Math.round(rect.bottom + gap)}px`,
      bottom: openUp ? `${Math.round(window.innerHeight - rect.top + gap)}px` : "auto"
    });
    root?.classList.toggle("is-open-up", openUp);
  };

  let openFoSelect = null;

  const closeFoSelect = ({ focus = false } = {}) => {
    if (!openFoSelect) {
      return;
    }

    const { root, list } = openFoSelect;
    openFoSelect = null;
    list.remove();
    root.classList.remove("is-open", "is-open-up");
    const button = root.querySelector(".e-permits-fo-select__button");
    button?.setAttribute("aria-expanded", "false");

    if (focus && button?.isConnected) {
      button.focus();
    }
  };

  const openFoSelectList = (root) => {
    closeFoSelect();
    const select = root.querySelector("select");
    const button = root.querySelector(".e-permits-fo-select__button");
    const list = document.createElement("ul");
    list.className = "e-permits-fo-select__list";
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-labelledby", button.id);

    /* placeholders ("Selectează …") are disabled empty options — not choices */
    [...select.options].filter((option) => !option.hidden && !(option.value === "" && option.disabled)).forEach((option) => {
      const item = document.createElement("li");
      const selected = option.value === select.value;
      item.className = `e-permits-fo-select__option${selected ? " is-selected" : ""}`;
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = -1;
      item.dataset.value = option.value;
      item.textContent = option.textContent.trim();
      /* a disabled choice is listed (with its reason in the label) but inert */
      if (option.disabled) {
        item.classList.add("is-disabled");
        item.setAttribute("aria-disabled", "true");
      }
      list.appendChild(item);
    });

    document.body.appendChild(list);
    placeFloatingList(button, list, root);
    root.classList.add("is-open");
    button.setAttribute("aria-expanded", "true");
    openFoSelect = { root, list };
    (list.querySelector(".is-selected") || list.querySelector("[role='option']"))?.focus();
  };

  const chooseFoSelectOption = (item) => {
    if (item.getAttribute("aria-disabled") === "true") {
      return;
    }

    const { root } = openFoSelect;
    const select = root.querySelector("select");
    const value = root.querySelector(".e-permits-fo-select__value");
    value.textContent = item.textContent;
    value.classList.remove("e-permits-fo-select__value--placeholder");
    root.classList.remove("is-error");
    closeFoSelect({ focus: true });
    select.value = item.dataset.value;
    /* handlers may re-render the form from this event */
    select.dispatchEvent(new Event("change", { bubbles: true }));
  };

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-fo-native-select] .e-permits-fo-select__button");

    if (button) {
      const root = button.closest("[data-fo-native-select]");

      if (openFoSelect?.root === root) {
        closeFoSelect({ focus: true });
      } else {
        openFoSelectList(root);
      }
      return;
    }

    const item = openFoSelect && event.target.closest("[role='option']");

    if (item && openFoSelect.list.contains(item)) {
      chooseFoSelectOption(item);
      return;
    }

    if (openFoSelect && !openFoSelect.list.contains(event.target)) {
      closeFoSelect();
    }
  });

  /* window capture: runs before modal / drawer Esc handlers, so the first Esc
     closes only the list */
  window.addEventListener("keydown", (event) => {
    const button = event.target.closest?.("[data-fo-native-select] .e-permits-fo-select__button");

    if (!openFoSelect) {
      if (button && ["ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        openFoSelectList(button.closest("[data-fo-native-select]"));
      }
      return;
    }

    const options = [...openFoSelect.list.querySelectorAll("[role='option']")];

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeFoSelect({ focus: true });
    } else if (["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      const index = options.indexOf(document.activeElement);
      options[event.key === "ArrowDown" ? (index + 1) % options.length : (index - 1 + options.length) % options.length]?.focus();
    } else if ((event.key === "Enter" || event.key === " ") && openFoSelect.list.contains(event.target)) {
      event.preventDefault();
      chooseFoSelectOption(event.target);
    } else if (event.key === "Tab") {
      closeFoSelect();
    }
  }, true);

  /* scrolling the page / drawer: the list follows its trigger, and closes
     only once the trigger has left the viewport */
  document.addEventListener("scroll", (event) => {
    if (!openFoSelect || openFoSelect.list.contains(event.target)) {
      return;
    }

    const button = openFoSelect.root.querySelector(".e-permits-fo-select__button");
    const rect = button?.getBoundingClientRect();

    if (!button?.isConnected || rect.bottom < 0 || rect.top > window.innerHeight) {
      closeFoSelect();
    } else {
      placeFloatingList(button, openFoSelect.list, openFoSelect.root);
    }
  }, true);
  window.addEventListener("resize", () => closeFoSelect());

  const getPersistedCreatedUsers = () => {
    try {
      const value = JSON.parse(localStorage.getItem("e-permits-created-users") || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };

  const persistCreatedUsers = (users) => {
    try {
      localStorage.setItem("e-permits-created-users", JSON.stringify(users));
    } catch (error) {
      console.warn("Nu am putut salva utilizatorii în baza locală.", error);
    }
  };

  const getUserProfileOverrides = () => {
    try {
      const value = JSON.parse(localStorage.getItem("e-permits-user-profile-overrides") || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch {
      return {};
    }
  };

  const persistUserProfileOverride = (user) => {
    if (!user?.idnp) {
      return;
    }

    try {
      const overrides = getUserProfileOverrides();
      overrides[user.idnp] = {
        autoritateId: user.autoritateId,
        autoritate: user.autoritate,
        autoritateScurta: user.autoritateScurta,
        functie: user.functie,
        comentarii: user.comentarii,
        informatiiAditionale: user.informatiiAditionale,
        status: user.status,
        roluri: user.roluri,
        roleCombinations: user.roleCombinations,
        grantedPermissions: user.grantedPermissions,
        ultimaActualizare: user.ultimaActualizare,
        deleted: Boolean(user.deleted)
      };
      localStorage.setItem("e-permits-user-profile-overrides", JSON.stringify(overrides));
    } catch (error) {
      console.warn("Nu am putut salva modificările profilului.", error);
    }
  };

  const formatRsspDate = (value) => {
    const [year, month, day] = String(value || "").split("-");
    return year && month && day ? `${day}.${month}.${year}` : "—";
  };

  const getInitials = (firstName, lastName) =>
    `${String(firstName || "").trim()[0] || ""}${String(lastName || "").trim()[0] || ""}`
      .toLocaleUpperCase("ro") || "U";

  const resetUserCreateState = () => {
    userCreateState.idnp = "";
    userCreateState.person = null;
    userCreateState.lookupError = "";
    userCreateState.functie = "";
    userCreateState.comments = "";
    userCreateState.additionalInfo = "";
    userCreateState.isAddingCombination = false;
    userCreateState.combinationDraft = {
      roleId: "",
      authorityId: "",
      subdivisionId: ""
    };
    userCreateState.combinations = [];
  };

  const renderSelectOptions = (items, placeholder, selectedValue = "") => `
    <option value=""${selectedValue ? "" : " selected"} disabled>${escapeHtml(placeholder)}</option>
    ${items.map((item) => `
      <option value="${escapeHtml(item.id)}"${item.id === selectedValue ? " selected" : ""}>${escapeHtml(item.label)}</option>
    `).join("")}
  `;

  const getAuthority = (authorityId) =>
    (rsspDb?.authorities || []).find((authority) => authority.id === authorityId) || null;

  const getRole = (roleId) =>
    (rsspDb?.roles || []).find((role) => role.id === roleId) || null;

  const getSubdivision = (authorityId, subdivisionId) =>
    (getAuthority(authorityId)?.subdivisions || []).find((subdivision) => subdivision.id === subdivisionId) || null;

  const renderUserCreateField = ({
    label,
    name,
    value = "",
    placeholder = "",
    required = false,
    readonly = false,
    type = "text",
    span = 12,
    support = "",
    checked = false,
    calendar = false
  }) => `
    <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
      <label for="user-create-${escapeHtml(name)}">${escapeHtml(label)}${required ? requiredMark() : ""}</label>
      <div class="e-permits-fo-input${readonly ? " is-filled is-readonly" : ""}">
        <input
          id="user-create-${escapeHtml(name)}"
          type="${escapeHtml(type)}"
          name="${escapeHtml(name)}"
          value="${escapeHtml(value)}"
          placeholder="${escapeHtml(placeholder)}"
          ${required ? "required" : ""}
          ${readonly ? "readonly" : ""}
          autocomplete="off"
        >
        ${checked ? `<svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-checkmark-small"></use></svg>` : ""}
        ${calendar ? `<svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-calendar"></use></svg>` : ""}
      </div>
      ${support ? `<p class="e-permits-fo-field__hint">${escapeHtml(support)}</p>` : ""}
    </div>
  `;

  const renderCombinationCards = () => userCreateState.combinations.map((combination, index) => `
    <article class="e-permits-user-create__combo-card">
      <div class="e-permits-user-create__combo-card-head">
        <strong>${escapeHtml(combination.roleLabel)}</strong>
        <button class="e-permits-user-create__combo-remove" type="button" aria-label="Șterge combinația ${escapeHtml(combination.roleLabel)}" data-user-combination-remove="${index}">
          <svg class="icon" width="16" height="16" aria-hidden="true">
            <use href="assets/icons/sprite.svg#icon-cross-large"></use>
          </svg>
        </button>
      </div>
      <p>${escapeHtml(combination.authorityLabel)} · ${escapeHtml(combination.subdivisionLabel)}</p>
    </article>
  `).join("");

  const renderCombinationForm = () => {
    const draft = userCreateState.combinationDraft;
    const authority = getAuthority(draft.authorityId);
    const subdivisions = authority?.subdivisions || [];

    return `
      <div class="e-permits-user-create__combo-form">
        <h4>Adaugă combinație</h4>
        <div class="e-permits-user-create__combo-fields">
          <div class="e-permits-fo-field e-permits-user-create__field">
            <label for="user-combo-role">Rol${requiredMark()}</label>
            ${renderFoSelectControl({ id: "user-combo-role", attrs: 'name="roleId" required', optionsHtml: renderSelectOptions(rsspDb?.roles || [], "Selectează rol", draft.roleId) })}
          </div>
          <div class="e-permits-fo-field e-permits-user-create__field">
            <label for="user-combo-authority">Autoritate${requiredMark()}</label>
            ${renderFoSelectControl({ id: "user-combo-authority", attrs: 'name="authorityId" required', optionsHtml: renderSelectOptions(rsspDb?.authorities || [], "Selectează autoritate", draft.authorityId) })}
          </div>
          <div class="e-permits-fo-field e-permits-user-create__field">
            <label for="user-combo-subdivision">Subdiviziune${requiredMark()}</label>
            ${renderFoSelectControl({ id: "user-combo-subdivision", attrs: 'name="subdivisionId" required', disabled: !authority, optionsHtml: renderSelectOptions(subdivisions, authority ? "Selectează subdiviziune" : "Selectează întâi Autoritatea", draft.subdivisionId) })}
          </div>
        </div>
      </div>
      <div class="e-permits-user-create__combo-actions">
        <button class="btn btn-primary btn-sm" type="button" data-user-combination-confirm>Adaugă</button>
        <button class="btn btn-neutral btn-sm" type="button" data-user-combination-cancel>Anulează</button>
      </div>
    `;
  };

  const renderUserCreateCombinations = () => {
    if (userCreateState.isAddingCombination) {
      return renderCombinationForm();
    }

    if (!userCreateState.combinations.length) {
      return renderEmptyState({
        title: "Niciun rol adăugat",
        text: "Adaugă cel puțin o combinație: rol, autoritate și subdiviziune.",
        icon: "user-account",
        compact: true,
        actionHtml: `
          <button class="btn btn-secondary btn-sm" type="button" data-user-combination-open>
            <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-large"></use></svg>
            <span>Adaugă combinație</span>
          </button>`
      });
    }

    return `
      ${renderCombinationCards()}
      <button class="btn btn-neutral btn-sm" type="button" data-user-combination-open>
        <svg class="icon" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-large"></use></svg>
        <span>Adaugă combinație</span>
      </button>
    `;
  };

  const canCreateUser = () =>
    Boolean(
      userCreateState.person &&
      userCreateState.functie.trim() &&
      userCreateState.combinations.length
    );

  const renderUserCreate = ({ focusName = null } = {}) => {
    if (!userCreateBody || !userCreateSubmit) {
      return;
    }

    const person = userCreateState.person;
    const idnpCount = userCreateState.idnp.length;
    const identityContent = person ? `
      <div class="e-permits-user-create__lookup-row">
        <div class="e-permits-fo-field e-permits-user-create__field--search">
          <label for="user-create-idnp">IDNP${requiredMark()}</label>
          <div class="e-permits-fo-input">
            <input id="user-create-idnp" type="text" inputmode="numeric" name="idnp" maxlength="13" value="${escapeHtml(userCreateState.idnp)}" autocomplete="off">
          </div>
          <span class="e-permits-user-create__inline">
            <span>13 cifre</span>
            <span class="e-permits-user-create__counter">${idnpCount}/13</span>
          </span>
        </div>
        <div class="e-permits-user-create__lookup-action">
          <button class="btn btn-secondary btn-sm" type="button" data-user-change-idnp>
            <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-rotate-arrow"></use></svg>
            <span>Schimbă</span>
          </button>
        </div>
      </div>
      <div class="e-permits-user-create__grid">
        ${renderUserCreateField({ label: "Nume", name: "firstName", value: person.firstName, readonly: true, span: 4 })}
        ${renderUserCreateField({ label: "Prenume", name: "lastName", value: person.lastName, readonly: true, span: 4 })}
        ${renderUserCreateField({ label: "Data nașterii", name: "birthDate", value: formatRsspDate(person.birthDate), readonly: true, calendar: true, span: 4 })}
      </div>
      <div class="e-permits-user-create__grid">
        ${renderUserCreateField({ label: "Telefon", name: "phone", value: person.phone, readonly: true, checked: true, span: 6 })}
        ${renderUserCreateField({ label: "Email", name: "email", value: person.email, readonly: true, checked: true, span: 6 })}
      </div>
      <div class="e-permits-fo-field e-permits-user-create__field">
        <label for="user-create-additional">Informații adiționale</label>
        <div class="e-permits-fo-textarea">
          <textarea id="user-create-additional" name="additionalInfo" rows="3" placeholder="Ex. Despre când și cum poate fi contactat">${escapeHtml(userCreateState.additionalInfo)}</textarea>
        </div>
      </div>
    ` : `
      <div class="e-permits-user-create__lookup-row">
        <div class="e-permits-fo-field e-permits-user-create__field--search">
          <label for="user-create-idnp">IDNP${requiredMark()}</label>
          <div class="e-permits-fo-input${userCreateState.lookupError ? " is-error" : ""}">
            <input id="user-create-idnp" type="text" inputmode="numeric" name="idnp" maxlength="13" value="${escapeHtml(userCreateState.idnp)}" placeholder="Ex. 2005003318852" autocomplete="off">
          </div>
          <span class="e-permits-user-create__inline${userCreateState.lookupError ? " e-permits-user-create__error" : ""}">
            <span>${escapeHtml(userCreateState.lookupError || "13 cifre")}</span>
            <span class="e-permits-user-create__counter">${idnpCount}/13</span>
          </span>
        </div>
        <div class="e-permits-user-create__lookup-action">
          <button class="btn btn-primary btn-sm" type="button" data-user-lookup>
            <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-search"></use></svg>
            <span>Caută</span>
          </button>
        </div>
      </div>
    `;

    userCreateBody.innerHTML = `
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">Verificarea identității</h3>
        <div class="e-permits-user-create__section-content">${identityContent}</div>
      </section>
      ${person ? `
        <section class="e-permits-user-create__section">
          <h3 class="e-permits-user-create__section-title">Date editabile</h3>
          <div class="e-permits-user-create__section-content">
            ${renderUserCreateField({
              label: "Funcția",
              name: "functie",
              value: userCreateState.functie,
              placeholder: "Ex. Specialist principal",
              required: true,
              support: "Funcția pe care o are utilizatorul în cadrul autorității."
            })}
            <div class="e-permits-fo-field e-permits-user-create__field">
              <label for="user-create-comments">Comentarii</label>
              <div class="e-permits-fo-textarea">
                <textarea id="user-create-comments" name="comments" rows="3" placeholder="Comentarii despre utilizator">${escapeHtml(userCreateState.comments)}</textarea>
              </div>
            </div>
          </div>
        </section>
        <section class="e-permits-user-create__section">
          <h3 class="e-permits-user-create__section-title">Combinații de roluri</h3>
          <div class="e-permits-user-create__section-content" data-user-combinations>
            ${renderUserCreateCombinations()}
          </div>
        </section>
      ` : ""}
    `;

    userCreateSubmit.disabled = !canCreateUser();

    if (focusName) {
      requestAnimationFrame(() => {
        focusFormControl(userCreateBody.querySelector(`[name="${focusName}"]`));
      });
    }
  };

  const openUserCreate = () => {
    if (!userCreate || !rsspDb) {
      return;
    }

    userCreateReturnFocus = document.activeElement;
    resetUserCreateState();
    renderUserCreate();
    userCreate.hidden = false;
    document.body.classList.add("is-user-create-open");
    requestAnimationFrame(() => {
      userCreateDrawer?.focus();
      userCreateBody?.querySelector('[name="idnp"]')?.focus();
    });
  };

  const closeUserCreate = () => {
    if (!userCreate || userCreate.hidden || userCreate.classList.contains("is-closing")) {
      return;
    }

    userCreate.classList.add("is-closing");
    window.setTimeout(() => {
      userCreate.hidden = true;
      userCreate.classList.remove("is-closing");
      document.body.classList.remove("is-user-create-open");
      userCreateReturnFocus?.focus?.();
    }, 120);
  };

  /* back-office feedback = the product toast (js/toast.js → library .toast);
     tone "success" (default) or "error" — an error never reads as a success */
  const showShellToast = (message, tone = "success", title = "") => {
    window.GEAPToast?.show({ type: tone === "error" ? "error" : tone === "info" ? "info" : "success", title, message });
  };

  const lookupRsspPerson = () => {
    if (userCreateState.idnp.length !== 13) {
      userCreateState.lookupError = "Introdu exact 13 cifre.";
      renderUserCreate({ focusName: "idnp" });
      return;
    }

    const person = (rsspDb?.people || []).find((item) => item.idnp === userCreateState.idnp);

    if (!person) {
      userCreateState.lookupError = "Persoana nu a fost găsită în RSSP.";
      renderUserCreate({ focusName: "idnp" });
      return;
    }

    const alreadyExists = (usersDb?.runtimeRows || []).some((user) => user.idnp === person.idnp);

    if (alreadyExists) {
      userCreateState.lookupError = "Această persoană este deja utilizator.";
      renderUserCreate({ focusName: "idnp" });
      return;
    }

    userCreateState.person = person;
    userCreateState.lookupError = "";
    userCreateState.additionalInfo = person.additionalInfo || "";
    renderUserCreate({ focusName: "functie" });
  };

  const addUserCombination = () => {
    const draft = userCreateState.combinationDraft;
    const role = getRole(draft.roleId);
    const authority = getAuthority(draft.authorityId);
    const subdivision = getSubdivision(draft.authorityId, draft.subdivisionId);

    if (!role || !authority || !subdivision) {
      return;
    }

    const duplicate = userCreateState.combinations.some((combination) =>
      combination.roleId === role.id &&
      combination.authorityId === authority.id &&
      combination.subdivisionId === subdivision.id
    );

    if (!duplicate) {
      userCreateState.combinations.push({
        roleId: role.id,
        roleLabel: role.label,
        authorityId: authority.id,
        authorityLabel: authority.label,
        subdivisionId: subdivision.id,
        subdivisionLabel: subdivision.label
      });
    }

    userCreateState.isAddingCombination = false;
    userCreateState.combinationDraft = { roleId: "", authorityId: "", subdivisionId: "" };
    renderUserCreate();
  };

  const createRegistryUser = () => {
    if (!canCreateUser() || !userCreateState.person || !usersDb) {
      return;
    }

    const person = userCreateState.person;
    const today = new Date().toISOString().slice(0, 10);
    const storedUsers = getPersistedCreatedUsers();
    const firstCombination = userCreateState.combinations[0];
    const createdUser = {
      id: `created-user-${Date.now()}`,
      numeComplet: `${person.firstName} ${person.lastName}`.trim(),
      initiale: getInitials(person.firstName, person.lastName),
      idnp: person.idnp,
      email: person.email,
      status: "Activ",
      functie: userCreateState.functie.trim(),
      comentarii: userCreateState.comments.trim(),
      informatiiAditionale: userCreateState.additionalInfo.trim(),
      roluri: userCreateState.combinations.map((combination) => combination.roleLabel),
      combinatiiRoluri: userCreateState.combinations,
      subdiviziune: firstCombination?.subdivisionLabel || "—",
      ultimaConectare: null,
      ultimaConectareRelativ: "Nu s-a conectat",
      ultimaActualizare: today,
      isCreatedLocally: true
    };

    persistCreatedUsers([createdUser, ...storedUsers.filter((user) => user.idnp !== createdUser.idnp)]);
    usersDb.runtimeRows = [createdUser, ...(usersDb.runtimeRows || []).filter((user) => user.idnp !== createdUser.idnp)];
    workplaceState.rows = usersDb.runtimeRows;
    workplaceState.query = "";
    workplaceState.page = 1;

    if (workplaceSearch) {
      workplaceSearch.value = "";
    }

    renderWorkplace();
    closeUserCreate();
    showShellToast(`Utilizatorul ${createdUser.numeComplet} a fost creat.`);
  };

  const getRoleAssignments = () =>
    (rolesDb?.groups || []).flatMap((group) => group.assignments || []);

  const renderConfiguredIcon = (item, className = "icon") => {
    if (item.iconAsset) {
      return `<img class="${className}" src="${escapeHtml(item.iconAsset)}" alt="">`;
    }

    return `
      <svg class="${className}" width="20" height="20" aria-hidden="true">
        <use href="assets/icons/sprite.svg#icon-${escapeHtml(item.icon || "document")}"></use>
      </svg>
    `;
  };

  // An institution with more than this many roles becomes a collapsible section —
  // the full-flow role picker's collapse (toggle + badge stack + "+N"), same markup.
  const ROLE_GROUP_COLLAPSE_AFTER = 3;

  const renderRoleCard = (assignment) => {
    const isActive = assignment.id === activeAssignmentId;

    return `
      <button
        type="button"
        class="e-permits-shell__role-card${isActive ? " is-active" : ""}"
        role="menuitemradio"
        aria-checked="${isActive ? "true" : "false"}"
        data-shell-role-option
        data-assignment-id="${escapeHtml(assignment.id)}"
      >
        <span class="e-permits-shell__role-card-icon" aria-hidden="true">
          ${renderConfiguredIcon(assignment)}
        </span>
        <span class="e-permits-shell__role-card-copy">
          <span class="e-permits-shell__role-card-name">${escapeHtml(assignment.roleLabel)}</span>
          <span class="e-permits-shell__role-card-meta">${escapeHtml(assignment.instanceLabel)}</span>
        </span>
        <svg class="icon e-permits-shell__role-card-check" width="20" height="20" aria-hidden="true">
          <use href="assets/icons/sprite.svg#icon-checkmark-large"></use>
        </svg>
      </button>
    `;
  };

  // as renderRoleCollapsePreview() in the full flow: up to 4 badges, the 4th turns
  // into "+N" when there are more than 4
  const renderRoleCollapsePreview = (assignments) => `
    <span class="e-permits-fo-auth__role-collapse-preview" aria-hidden="true">
      <span class="e-permits-fo-auth__role-collapse-stack">
        ${assignments.slice(0, 4).map((assignment, index) => {
          if (index === 3 && assignments.length > 4) {
            return `<span class="e-permits-fo-auth__role-collapse-avatar e-permits-fo-auth__role-collapse-avatar--counter">+${assignments.length - 3}</span>`;
          }
          return `<span class="e-permits-fo-auth__role-collapse-avatar e-permits-shell__role-card-icon">${renderConfiguredIcon(assignment)}</span>`;
        }).join("")}
      </span>
      <span class="e-permits-fo-auth__role-collapse-arrow">
        <svg class="icon" width="16" height="16">
          <use href="assets/icons/sprite.svg#icon-chevron-bottom"></use>
        </svg>
      </span>
    </span>
  `;

  const renderRoleGroups = () => {
    if (!rolesDb || !roleGroupsPanel) {
      return;
    }

    roleGroupsPanel.innerHTML = rolesDb.groups.map((group) => {
      const assignments = group.assignments || [];
      const groupId = escapeHtml(group.id);
      const list = `<div class="e-permits-shell__role-list">${assignments.map(renderRoleCard).join("")}</div>`;
      const isCollapsible = assignments.length > ROLE_GROUP_COLLAPSE_AFTER;
      // the institution of the current role opens expanded, so the active card is visible
      const isExpanded = isCollapsible && assignments.some((assignment) => assignment.id === activeAssignmentId);

      return `
        <section class="e-permits-shell__role-group${isCollapsible ? " is-collapsible" : ""}${isExpanded ? " is-expanded" : ""}" aria-labelledby="shell-role-group-${groupId}">
          <h3 id="shell-role-group-${groupId}" class="e-permits-shell__role-group-title">${escapeHtml(group.label)}</h3>
          ${isCollapsible ? `
            <button class="e-permits-fo-auth__role-collapse-toggle" type="button" aria-expanded="${isExpanded ? "true" : "false"}" aria-controls="shell-role-collapse-${groupId}" data-shell-role-collapse-toggle>
              <span class="e-permits-fo-auth__role-collapse-label" data-shell-role-collapse-label>${isExpanded ? "Arată mai puține" : "Arată mai multe"}</span>
              ${renderRoleCollapsePreview(assignments)}
            </button>
            <div class="e-permits-fo-auth__role-collapse" id="shell-role-collapse-${groupId}"${isExpanded ? "" : " inert"}>${list}</div>
          ` : list}
        </section>
      `;
    }).join("");
  };

  const renderShellNav = (profileKey) => {
    const profile = rolesDb?.menus?.[profileKey];

    if (!profile || !shellNav) {
      return null;
    }

    shellNav.setAttribute("aria-label", profile.ariaLabel || "Navigare principală");

    shellNav.innerHTML = (profile.groups || []).map((group, groupIndex) => `
      <div class="e-permits-shell__nav-group${groupIndex === 0 ? " e-permits-shell__nav-group--workplace" : ""}${group.label === "Configurare" ? " e-permits-shell__nav-group--config" : ""}">
        <p class="e-permits-shell__group-label">${escapeHtml(group.label)}</p>
        <ul class="e-permits-shell__nav-list">
          ${(group.items || []).map((item) => {
            const isActive = item.id === profile.defaultItemId;
            const attributes = [
              item.workplaceView ? `data-workplace-view="${escapeHtml(item.workplaceView)}"` : "",
              item.shellView ? `data-shell-view="${escapeHtml(item.shellView)}"` : ""
            ].filter(Boolean).join(" ");

            return `
              <li>
                <a href="#" class="e-permits-shell__nav-link${isActive ? " is-active" : ""}" data-nav-item data-nav-id="${escapeHtml(item.id)}" data-nav-label="${escapeHtml(item.label)}" ${attributes}${isActive ? ' aria-current="page"' : ""}>
                  <span class="e-permits-shell__nav-icon" aria-hidden="true"></span>
                  <span class="e-permits-shell__nav-text">${escapeHtml(item.label)}</span>
                  ${Number.isFinite(item.badge) ? `<span class="badge badge--solid-neutral badge--xl e-permits-shell__nav-badge"${item.badgeView ? ` data-workplace-badge="${escapeHtml(item.badgeView)}"` : ""}>${item.badge}</span>` : ""}
                </a>
              </li>
            `;
          }).join("")}
        </ul>
      </div>
    `).join("");

    setupNavTooltips();
    return (profile.groups || []).flatMap((group) => group.items || []).find((item) => item.id === profile.defaultItemId) || null;
  };

  const showRolePlaceholder = (title) => {
    activeRegistry = "placeholder";
    shell.classList.remove("is-users-registry");
    shell.classList.remove("is-user-profile-open");

    if (workplacePanel) {
      workplacePanel.hidden = true;
      workplacePanel.classList.remove("is-users-registry");
    }

    if (permitsProfilePanel) {
      permitsProfilePanel.hidden = true;
    }

    if (userProfilePanel) {
      userProfilePanel.hidden = true;
    }

    if (userProfileBackShell) {
      userProfileBackShell.hidden = true;
    }

    if (workplaceTitle) {
      workplaceTitle.textContent = title;
    }

    if (workplaceRefresh) {
      workplaceRefresh.hidden = true;
    }
  };

  const applyRoleAssignment = (assignmentId, { persist = true, closeMenu = true } = {}) => {
    const assignment = getRoleAssignments().find((item) => item.id === assignmentId);

    if (!assignment) {
      return;
    }

    activeAssignmentId = assignment.id;

    if (persist) {
      window.sessionStorage.setItem("e-permits-back-office-assignment", assignment.id);
    }

    if (userMeta) {
      userMeta.textContent = assignment.headerMeta || `${assignment.roleLabel} • ${assignment.instanceLabel}`;
    }

    const defaultItem = renderShellNav(assignment.menuProfile);
    renderRoleGroups();

    if (defaultItem?.workplaceView && dossierDb) {
      if (workplaceRefresh) {
        workplaceRefresh.hidden = false;
      }
      setWorkplaceView(defaultItem.workplaceView);
    } else if (defaultItem?.shellView === "users-registry" && usersDb) {
      showUsersRegistry();
    } else if (defaultItem?.shellView === "classifiers-registry") {
      showClassifiersRegistry();
    } else if (defaultItem) {
      showRolePlaceholder(defaultItem.label);
    }

    if (closeMenu) {
      closeUserMenu();
      userTrigger?.focus();
    }
  };

  const initRoleSwitcher = async () => {
    if (!roleGroupsPanel || !shellNav) {
      return;
    }

    try {
      const response = await fetch("data/e-permits-roles.json", { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`Cannot load roles DB: ${response.status}`);
      }

      rolesDb = await response.json();
      const storedAssignment = window.sessionStorage.getItem("e-permits-back-office-assignment");
      const assignmentExists = getRoleAssignments().some((item) => item.id === storedAssignment);
      const initialAssignment = assignmentExists ? storedAssignment : rolesDb.defaultAssignmentId;

      applyRoleAssignment(initialAssignment, { persist: false, closeMenu: false });
    } catch (error) {
      console.warn(error);
      setupNavTooltips();
    }
  };

  const parseIsoDate = (value) => {
    if (!value) {
      return null;
    }

    const [year, month, day] = String(value).split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const toIsoDate = (date) => {
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  const formatDate = (value) => {
    const date = parseIsoDate(value);

    if (!date) {
      return "—";
    }

    const pad = (part) => String(part).padStart(2, "0");
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  };

  const addDays = (date, days) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  };

  const daysUntil = (value) => {
    const date = parseIsoDate(value);
    const today = parseIsoDate(workplaceDb?.today);

    if (!date || !today) {
      return 0;
    }

    return Math.ceil((date.getTime() - today.getTime()) / 86400000);
  };

  const mulberry32 = (seed) => {
    let value = seed;

    return () => {
      value += 0x6D2B79F5;
      let next = value;
      next = Math.imul(next ^ (next >>> 15), next | 1);
      next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
      return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
    };
  };

  const pick = (items, rnd) => items[Math.floor(rnd() * items.length)];

  const buildDosare = (db) => {
    if (!db) {
      return [];
    }

    const rnd = mulberry32(db.seed || 11);
    const today = parseIsoDate(db.today) || new Date();
    const mySpecialist = db.specialisti.find((specialist) => specialist.id === db.meSpecialistId) || db.specialisti[0];
    const otherSubdiviziuni = db.subdiviziuni.filter((subdiviziune) => subdiviziune !== db.mySubdiviziune);
    const servicePool = db.serviceScope?.length ? db.serviceScope : db.servicii;
    const rows = [];
    let sequence = 4400;
    let alertCursor = 0;

    db.plan.forEach(({ status, count, alerts }) => {
      for (let index = 0; index < count; index += 1) {
        sequence += 1 + Math.floor(rnd() * 4);

        const isOficiu = status === "schita";
        const actBaza = isOficiu ? pick(db.acteEmise, rnd) : null;
        const solicitant = isOficiu ? { nume: actBaza.titular, companie: actBaza.companie } : pick(db.solicitanti, rnd);
        const serviciu = isOficiu ? actBaza.denumire : pick(servicePool, rnd);
        const tipDosar = isOficiu
          ? pick(db.postProcessTipuri, rnd)
          : db.tipDosar[Math.floor(rnd() * (rnd() > 0.72 ? db.tipDosar.length : 2))];
        const motivOficiu = isOficiu ? pick(db.motiveOficiu, rnd) : null;
        const isUnassigned = status === "depus" || status === "schita";
        const specialist = isUnassigned
          ? null
          : rnd() < 0.5
            ? mySpecialist
            : db.specialisti[1 + Math.floor(rnd() * (db.specialisti.length - 1))];
        const repartizatDe = isUnassigned ? null : pick(db.specialisti, rnd);
        const dataDepunerii = addDays(today, -Math.floor(rnd() * 75));
        const termenExaminare = addDays(dataDepunerii, 10 + Math.floor(rnd() * 21));
        const alerte = [];

        if (alerts?.length && rnd() > 0.28) {
          alerte.push(alerts[alertCursor % alerts.length]);
          alertCursor += 1;

          if (rnd() > 0.76) {
            const second = pick(alerts, rnd);
            if (!alerte.includes(second)) {
              alerte.push(second);
            }
          }
        }

        let decizia = "none";

        if (status === "spreCoordonare" || status === "spreSemnare") {
          decizia = "proiect";
        } else if (status === "semnat" || status === "eliberat") {
          decizia = "aprobare";
        } else if (status === "respins") {
          decizia = "respingere";
        } else if (status === "arhivat") {
          decizia = rnd() > 0.5 ? "aprobare" : "respingere";
        }

        const id = `D-2026-${String(sequence).padStart(6, "0")}`;
        const nrActEmis = decizia === "aprobare" && ["semnat", "eliberat"].includes(status)
          ? `AUT-2026-${String(sequence).padStart(6, "0")}`
          : null;

        rows.push({
          id,
          nrDosar: id,
          status,
          alerte,
          decizia,
          tipDosar,
          serviciu,
          numeSolicitant: solicitant.nume,
          companie: solicitant.companie,
          specialist,
          repartizatDe,
          subdiviziune: rnd() < 0.72 ? db.mySubdiviziune : pick(otherSubdiviziuni, rnd),
          dataDepunerii: toIsoDate(dataDepunerii),
          termenExaminare: toIsoDate(termenExaminare),
          dataSemnarii: ["semnat", "eliberat"].includes(status)
            ? toIsoDate(addDays(today, -Math.floor(rnd() * 14)))
            : null,
          modLivrare: pick(db.modLivrare, rnd),
          nedistribuit: status === "depus" && rnd() > 0.52,
          sursa: isOficiu ? "OFICIU" : (rnd() > 0.35 ? "FO" : "BO"),
          actBaza,
          nrActEmis,
          motivOficiu,
          dataInitierii: isOficiu ? toIsoDate(dataDepunerii) : null,
          initiatDe: isOficiu ? pick(db.specialisti, rnd) : null
        });
      }
    });

    /* fees are generated by the specialist after verification: a case with an overdue
       payment rests at the payment step */
    rows.forEach((row) => { if (row.status === "inExaminare" && row.alerte.includes("neachitatTermen")) row.status = "asteaptaPlata"; });

    return rows.sort((a, b) => String(b.dataDepunerii).localeCompare(String(a.dataDepunerii)));
  };

  const buildUsers = (db) => {
    const rows = (db.users || []).map((user, index) => ({
      id: `user-${index + 1}`,
      ...user
    }));
    const firstNames = db.generator?.firstNames || [];
    const lastNames = db.generator?.lastNames || [];
    const roles = db.generator?.roles || [["Specialist"]];
    const subdivisions = db.generator?.subdivisions || ["CSP Chișinău"];
    let generatedIndex = 0;

    while (rows.length < (db.totalRows || rows.length)) {
      const firstName = firstNames[generatedIndex % firstNames.length] || `Utilizator ${generatedIndex + 1}`;
      const lastName = lastNames[Math.floor(generatedIndex / Math.max(1, firstNames.length)) % Math.max(1, lastNames.length)] || "";
      const name = `${firstName} ${lastName}`.trim();
      const emailName = `${firstName}.${lastName}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z.]/g, "")
        .toLocaleLowerCase("ro");
      const rowIndex = rows.length;
      const day = String(1 + (rowIndex % 28)).padStart(2, "0");
      const month = String(1 + (rowIndex % 5)).padStart(2, "0");

      rows.push({
        id: `user-${rowIndex + 1}`,
        numeComplet: name,
        initiale: `${firstName[0] || "U"}${lastName[0] || ""}`.toLocaleUpperCase("ro"),
        idnp: String(2118421010044 + rowIndex),
        email: `${emailName || `utilizator.${rowIndex + 1}`}@ansp.gov.md`,
        status: "Activ",
        roluri: roles[generatedIndex % roles.length],
        subdiviziune: subdivisions[generatedIndex % subdivisions.length],
        ultimaConectare: `2026-${month}-${day}`,
        ultimaConectareRelativ: rowIndex % 3 === 0 ? "acum 1 zi" : `acum ${1 + (rowIndex % 10)} zile`,
        ultimaActualizare: `2026-${month}-${day}`
      });

      generatedIndex += 1;
    }

    const persistedUsers = getPersistedCreatedUsers()
      .filter((user) => user?.idnp)
      .map((user, index) => ({
        id: user.id || `created-user-${index + 1}`,
        ...user
      }));
    const persistedIdnps = new Set(persistedUsers.map((user) => user.idnp));
    const profileOverrides = getUserProfileOverrides();
    const defaultAuthority = db.profile?.authorities?.[0] || {
      id: "ansp",
      label: "Agenția Națională pentru Sănătate Publică (ANSP)",
      shortLabel: "ANSP"
    };
    const catalogPermissions = (db.profile?.permissionCatalog?.groups || [])
      .flatMap((group) => (group.permissions || []).map((permission) => ({ ...permission, group: group.id })));

    return [
      ...persistedUsers,
      ...rows.filter((user) => !persistedIdnps.has(user.idnp))
    ].map((user) => {
      const merged = {
        telefon: "+373 60 000 000",
        autoritateId: defaultAuthority.id,
        autoritate: defaultAuthority.label,
        autoritateScurta: defaultAuthority.shortLabel,
        functie: user.roluri?.[0] || "Specialist",
        comentarii: "",
        informatiiAditionale: "",
        delegationsCount: 1,
        ...user,
        ...(profileOverrides[user.idnp] || {})
      };

      if (!Array.isArray(merged.roleCombinations) || !merged.roleCombinations.length) {
        merged.roleCombinations = (merged.roluri?.length ? merged.roluri : ["Specialist"]).map((role) => ({
          role,
          authorityShort: merged.autoritateScurta || "ANSP",
          subdivision: merged.subdiviziune || "CSP Chișinău"
        }));
      }

      if (!Array.isArray(merged.grantedPermissions)) {
        const roleSet = new Set(merged.roluri?.length ? merged.roluri : ["Specialist"]);
        merged.grantedPermissions = catalogPermissions
          .filter((permission) => roleSet.has(permission.role))
          .map((permission) => permission.id);
      }

      merged.permissionsCount = merged.grantedPermissions.length;
      return merged;
    }).filter((user) => !user.deleted);
  };

  const buildSarcini = () => {
    const source = (dossierDb?.runtimeRows || [])
      .filter((row) => row.dataSemnarii)
      .sort((a, b) => String(a.serviciu).localeCompare(String(b.serviciu), "ro"));

    const rows = [];
    let sequence = 1002;

    for (let index = 0; index < Math.min(source.length, 10); index += 1) {
      const dosar = source[index];
      // ~4 radiere (Schiță) + ~6 redeschidere (Aprobat), per Figma tab counts
      const isRadiere = index % 5 < 2;
      sequence += 1;

      rows.push({
        id: `S-${sequence}`,
        nrSarcina: `S-${sequence}`,
        tipSarcina: isRadiere ? "radiere" : "redeschidere",
        statut: isRadiere ? "schita" : "aprobat",
        dosarNr: dosar.nrDosar,
        sursa: dosar.sursa,
        tipDosar: dosar.tipDosar,
        numeSolicitant: dosar.numeSolicitant,
        companie: dosar.companie,
        modLivrare: dosar.modLivrare,
        dataSemnarii: dosar.dataSemnarii,
        serviciu: dosar.serviciu
      });
    }

    return rows;
  };

  const buildSarciniDb = () => ({
    kind: "sarcini",
    fieldCount: dossierDb?.fieldCount || 48,
    myAutoritate: dossierDb?.myAutoritate,
    tipSarcina: {
      radiere: { label: "Radiere", tone: "danger", icon: "cross-small" },
      redeschidere: { label: "Redeschidere", tone: "brand", icon: "checkmark-small" }
    },
    statuses: {
      aprobat: { label: "Aprobat", tone: "ok" },
      schita: { label: "Schiță", tone: "neutral" }
    },
    columns: {
      nrSarcina: { label: "Numărul sarcinii", width: 120 },
      tipSarcina: { label: "Tip sarcină", width: 150 },
      dosar: { label: "Dosar", width: 150 },
      statut: { label: "Statut", width: 110 },
      tipDosar: { label: "Tip dosar", width: 112 },
      solicitant: { label: "Nume solicitant", width: 152 },
      companie: { label: "Compania", width: 164 },
      modLivrare: { label: "Metoda de livrare", width: 150 },
      dataSemnarii: { label: "Data semnării", width: 120, sortable: true }
    },
    views: {
      sarcini: {
        title: "Sarcinile mele",
        groupBy: "serviciu",
        columns: ["nrSarcina", "tipSarcina", "dosar", "statut", "tipDosar", "solicitant", "companie", "modLivrare", "dataSemnarii"],
        defaultTab: "toate",
        tabs: [
          { id: "radiere", label: "Radiere", filter: "sarcina:radiere", tone: "crit" },
          { id: "redeschidere", label: "Redeschidere", filter: "sarcina:redeschidere" },
          { divider: true },
          { id: "toate", label: "Toate", filter: "all" }
        ]
      }
    },
    runtimeRows: buildSarcini()
  });

  const buildRoleAdminDb = () => {
    const groups = usersDb?.profile?.permissionCatalog?.groups || [];
    const ids = (groupId) => (groups.find((group) => group.id === groupId)?.permissions || []).map((permission) => permission.id);
    const all = groups.flatMap((group) => (group.permissions || []).map((permission) => permission.id));
    const total = all.length;

    const specialistFns = [...ids("dosare"), "p1", "p3", ...ids("avizare").slice(0, 1), ...ids("decizii"), ...ids("sarcini"), ...ids("audit")];
    const supervisorFns = [...ids("dosare"), ...ids("plati"), ...ids("avizare"), ...ids("decizii"), ...ids("sarcini")];
    const admlFns = ["adm1", "adm2", "adm3", "adm4", "adm5", "adm6", "adm8", ...ids("audit"), "d1", "s1"];

    const roles = [
      { id: "rol-admc", denumire: "Administrator central", descriere: "Administrare completă: autorități, subdiviziuni, roluri, utilizatori, excepții de permisiuni.", eligibilLocal: false, protejat: true, activ: true, dataCreare: "2026-04-30", utilizatori: 2, functii: all },
      { id: "rol-adml", denumire: "Administrator local", descriere: "Administrează utilizatorii și delegările din propria autoritate.", eligibilLocal: true, activ: true, dataCreare: "2026-05-31", utilizatori: 5, functii: admlFns },
      { id: "rol-specialist", denumire: "Specialist", descriere: "Examinează dosarele repartizate, adaugă taxe și pregătește proiectele de decizie.", eligibilLocal: true, activ: true, dataCreare: "2026-04-30", utilizatori: 34, functii: specialistFns },
      { id: "rol-supervizor", denumire: "Supervizor", descriere: "Distribuie dosarele, coordonează și semnează deciziile subdiviziunii.", eligibilLocal: true, activ: true, dataCreare: "2026-04-30", utilizatori: 8, functii: supervisorFns },
      { id: "rol-specialist-ghiseu", denumire: "Specialist ghișeu", descriere: "Recepționează cererile la ghișeu și inițiază dosarele.", eligibilLocal: true, activ: true, dataCreare: "2026-05-12", utilizatori: 6, functii: [...ids("dosare").slice(0, 4), "p1"] },
      { id: "rol-expert", denumire: "Expert", descriere: "Examinează și emite avizele de specialitate solicitate.", eligibilLocal: false, activ: true, dataCreare: "2026-05-03", utilizatori: 4, functii: [...ids("avizare"), "d1"] },
      { id: "rol-auditor", denumire: "Auditor", descriere: "Vizualizează și exportă jurnalele de audit.", eligibilLocal: false, activ: true, dataCreare: "2026-04-30", utilizatori: 3, functii: ids("audit") },
      { id: "rol-operator", denumire: "Operator registru", descriere: "Actualizează datele din registre și gestionează actele emise.", eligibilLocal: false, activ: false, dataCreare: "2026-03-18", utilizatori: 0, functii: ["d1", "d3", ...ids("audit")] }
    ];

    return {
      kind: "roles",
      fieldCount: 48,
      permissionTotal: total,
      statuses: {
        Activ: { label: "Activ", tone: "ok" },
        Inactiv: { label: "Inactiv", tone: "neutral" }
      },
      columns: {
        denumire: { label: "Denumire rol", width: 220 },
        descriere: { label: "Descriere", width: 420 },
        statut: { label: "Statut", width: 96 },
        eligibilLocal: { label: "Eligibil adm. locală", width: 150 },
        dataCreare: { label: "Data creării", width: 120, sortable: true }
      },
      views: {
        roles: {
          title: "Roluri",
          columns: ["denumire", "descriere", "statut", "eligibilLocal", "dataCreare"]
        }
      },
      runtimeRows: roles
    };
  };

  const getView = (viewKey = workplaceState.viewKey) =>
    workplaceDb?.views?.[viewKey] || workplaceDb?.views?.mine || null;

  const filterByView = (row, view) => {
    switch (view?.filter) {
      case "specialistMine":
        return row.specialist?.id === workplaceDb.meSpecialistId;
      case "unassigned":
        return row.status === "depus" && row.nedistribuit;
      case "office":
        return row.status === "schita";
      case "print":
        return row.specialist?.id === workplaceDb.meSpecialistId && row.status === "semnat" && row.modLivrare !== "Electronic";
      default:
        return true;
    }
  };

  const filterByToken = (row, filterToken) => {
    if (!filterToken || filterToken === "all") {
      return true;
    }

    if (filterToken === "activeWork") {
      return ["inExaminare", "asteaptaPlata", "spreCoordonare"].includes(row.status);
    }

    if (filterToken === "hasAlerts") {
      return row.alerte.length > 0;
    }

    if (filterToken.startsWith("alert:")) {
      return row.alerte.includes(filterToken.slice(6));
    }

    if (filterToken.startsWith("sarcina:")) {
      return row.tipSarcina === filterToken.slice(8);
    }

    if (filterToken.startsWith("svc:")) {
      return row.statut === filterToken.slice(4);
    }

    return true;
  };

  const getBaseRows = (view = getView()) =>
    workplaceState.rows.filter((row) => filterByView(row, view));

  const getSortValue = (row, key) => {
    switch (key) {
      case "decizia":
        return workplaceDb.decisions[row.decizia]?.label || "";
      case "status":
        return workplaceDb.statuses[row.status]?.label || "";
      case "alerte":
        return row.alerte.map((alert) => workplaceDb.alerts[alert]?.label || alert).join(" ");
      case "dataDepunerii":
      case "termenExaminare":
      case "dataSemnarii":
      case "dataInitierii":
      case "ultimaConectare":
      case "ultimaActualizare":
      case "actualizat":
        return row[key] ? Date.parse(row[key]) : 0;
      case "actBaza":
        return `${row.actBaza?.nr || ""} ${row.actBaza?.denumire || ""}`;
      case "titular":
        return row.actBaza?.titular || "";
      case "initiatDe":
        return row.initiatDe?.nume || "";
      case "solicitant":
        return row.numeSolicitant || "";
      default:
        return row[key] ?? "";
    }
  };

  const compareSortValues = (left, right) => {
    if (typeof left === "number" && typeof right === "number") {
      return left - right;
    }

    return String(left).localeCompare(String(right), "ro", { numeric: true, sensitivity: "base" });
  };

  const compareRowsByActiveSort = (left, right, fallbackDirection = "desc") => {
    if (workplaceState.sortKey) {
      const direction = workplaceState.sortDirection === "asc" ? 1 : -1;
      const sorted = compareSortValues(
        getSortValue(left, workplaceState.sortKey),
        getSortValue(right, workplaceState.sortKey)
      );

      if (sorted !== 0) {
        return sorted * direction;
      }
    }

    const fallback = String(left.dataDepunerii || "").localeCompare(String(right.dataDepunerii || ""));
    return fallbackDirection === "asc" ? fallback : -fallback;
  };

  const getSearchHaystack = (row) => {
    if (["services", "authorities", "tariffs", "ntpl", "classifiers"].includes(workplaceDb?.kind)) {
      return [row.cod, row.denumire, row.descriere, row.familie, row.id, row.institutie, row.autoritateCod, row.statut, row.idno, row.domeniu, row.obiect, row.sursaDate, row.reguli]
        .filter(Boolean).join(" ").toLocaleLowerCase("ro");
    }

    if (workplaceDb?.kind === "users") {
      return [
        row.numeComplet,
        row.idnp,
        row.email,
        row.status,
        ...(row.roluri || []),
        row.subdiviziune,
        formatDate(row.ultimaConectare),
        formatDate(row.ultimaActualizare)
      ].filter(Boolean).join(" ").toLocaleLowerCase("ro");
    }

    if (workplaceDb?.kind === "sarcini") {
      return [
        row.nrSarcina,
        workplaceDb.tipSarcina[row.tipSarcina]?.label,
        row.dosarNr,
        workplaceDb.statuses[row.statut]?.label,
        row.tipDosar,
        row.numeSolicitant,
        row.companie,
        row.modLivrare,
        row.serviciu,
        formatDate(row.dataSemnarii)
      ].filter(Boolean).join(" ").toLocaleLowerCase("ro");
    }

    if (workplaceDb?.kind === "roles") {
      return [
        row.denumire,
        row.descriere,
        row.activ ? "activ" : "inactiv",
        row.eligibilLocal ? "da" : "nu",
        formatDate(row.dataCreare)
      ].filter(Boolean).join(" ").toLocaleLowerCase("ro");
    }

    const status = workplaceDb.statuses[row.status]?.label;
    const decizia = workplaceDb.decisions[row.decizia]?.label;
    const alertLabels = row.alerte.map((alert) => workplaceDb.alerts[alert]?.label || alert);

    return [
      row.nrDosar,
      row.sursa,
      decizia,
      status,
      ...alertLabels,
      row.tipDosar,
      row.serviciu,
      row.numeSolicitant,
      row.companie,
      row.specialist?.nume,
      row.subdiviziune,
      formatDate(row.dataDepunerii),
      formatDate(row.termenExaminare),
      formatDate(row.dataSemnarii),
      row.modLivrare,
      row.actBaza?.nr,
      row.actBaza?.denumire,
      row.actBaza?.titular,
      row.motivOficiu,
      row.initiatDe?.nume
    ].filter(Boolean).join(" ").toLocaleLowerCase("ro");
  };

  const filterBySearch = (row) => {
    const query = workplaceState.query.trim().toLocaleLowerCase("ro");

    if (!query) {
      return true;
    }

    return query.split(/\s+/).every((term) => getSearchHaystack(row).includes(term));
  };

  /* ---- Advanced filter (faceted, Azure DevOps / Linear pattern) -----------------
     "Filtrare avansată" opens a bar of facet chips; a chip opens a checklist with live
     counts; choices are staged and applied with "Aplică". OR inside a facet, AND
     across facets, on top of the status tab and the quick search. Per registry, kept
     for the session. */
  const registryKindOf = () => workplaceDb?.kind || "dossiers";
  const asList = (value) => (Array.isArray(value) ? value : [value]).map((v) => (v == null ? "" : String(v).trim())).filter((v) => v && v !== "—");
  const FILTER_FACETS = {
    dossiers: [
      { key: "status", label: "Statut", get: (r) => workplaceDb.statuses?.[r.status]?.label || r.status },
      { key: "tipDosar", label: "Tip dosar", get: (r) => workplaceDb.tipDosar?.[r.tipDosar]?.label || r.tipDosar },
      { key: "decizia", label: "Decizia", get: (r) => workplaceDb.decisions?.[r.decizia]?.label },
      { key: "alerte", label: "Alerte", get: (r) => (r.alerte || []).map((a) => workplaceDb.alerts?.[a]?.label || a) },
      { key: "serviciu", label: "Serviciu", get: (r) => r.serviciu },
      { key: "specialist", label: "Specialist", get: (r) => r.specialist?.nume },
      { key: "subdiviziune", label: "Subdiviziune", get: (r) => r.subdiviziune },
      { key: "modLivrare", label: "Mod de livrare", get: (r) => r.modLivrare },
      { key: "sursa", label: "Sursă", get: (r) => r.sursa }
    ],
    sarcini: [
      { key: "tipSarcina", label: "Tip sarcină", get: (r) => workplaceDb.tipSarcina?.[r.tipSarcina]?.label || r.tipSarcina },
      { key: "status", label: "Statut", get: (r) => workplaceDb.statuses?.[r.status]?.label || r.status },
      { key: "serviciu", label: "Serviciu", get: (r) => r.serviciu }
    ],
    users: [
      { key: "status", label: "Statut", get: (r) => r.status },
      { key: "roluri", label: "Roluri", get: (r) => r.roluri },
      { key: "autoritate", label: "Autoritate", get: (r) => r.autoritateScurta || r.autoritate },
      { key: "subdiviziune", label: "Subdiviziune", get: (r) => r.subdiviziune }
    ],
    roles: [
      { key: "statut", label: "Statut", get: (r) => r.statut || (r.activ === false ? "Inactiv" : "Activ") },
      { key: "eligibilLocal", label: "Eligibil adm. locală", get: (r) => (r.eligibilLocal ? "Da" : "Nu") }
    ],
    services: [
      { key: "statut", label: "Statut", get: (r) => r.statut },
      { key: "institutie", label: "Instituția", get: (r) => r.institutie },
      { key: "sursa", label: "Sursă", get: (r) => r.sursa }
    ],
    authorities: [
      { key: "sursa", label: "Sursă", get: (r) => r.sursa }
    ],
    tariffs: [
      { key: "statut", label: "Statut", get: (r) => r.statut },
      { key: "tip", label: "Tip tarif", get: (r) => r.tip },
      { key: "domeniu", label: "Domeniu", get: (r) => r.domeniu },
      { key: "formula", label: "Formulă", get: (r) => r.formula },
      { key: "sursa", label: "Sursă", get: (r) => r.sursa }
    ],
    ntpl: [
      { key: "statut", label: "Stare", get: (r) => r.statut },
      { key: "obiect", label: "Obiect", get: (r) => r.obiect },
      { key: "sursa", label: "Sursă", get: (r) => r.sursa },
      { key: "prioritate", label: "Prioritate", get: (r) => r.prioritate }
    ],
    classifiers: [
      { key: "statut", label: "Statut", get: (r) => r.statut },
      { key: "domeniu", label: "Domeniu", get: (r) => r.domeniu },
      { key: "familie", label: "Familie", get: (r) => r.familie },
      { key: "sursa", label: "Sursă", get: (r) => r.sursa },
      { key: "autoritate", label: "Autoritate", get: (r) => r.autoritate },
      { key: "utilizare", label: "Utilizare", get: (r) => r.utilizare }
    ]
  };
  const filterStore = {};
  const filterStorageKey = (kind) => `e-permits-filters:${kind}`;
  const getFilterState = (kind = registryKindOf()) => {
    if (!filterStore[kind]) {
      let saved = null;
      try { saved = JSON.parse(window.sessionStorage.getItem(filterStorageKey(kind)) || "null"); } catch { saved = null; }
      /* the bar always starts closed; applied filters persist (badge on the button) */
      filterStore[kind] = { open: false, applied: saved?.applied || {} };
    }
    return filterStore[kind];
  };
  const saveFilterState = (kind = registryKindOf()) => {
    const st = getFilterState(kind);
    try { window.sessionStorage.setItem(filterStorageKey(kind), JSON.stringify({ open: st.open, applied: st.applied })); } catch { /* private mode: session only */ }
  };
  const facetsOf = () => FILTER_FACETS[registryKindOf()] || [];
  const appliedEntries = () => Object.entries(getFilterState().applied).filter(([, values]) => values?.length);
  const matchesFacets = (row, except = null) => appliedEntries().every(([key, values]) => {
    if (key === except) return true;
    const facet = facetsOf().find((f) => f.key === key);
    if (!facet) return true;
    const rowValues = asList(facet.get(row));
    return values.some((v) => rowValues.includes(v));
  });
  /* rows the facet's options are counted on: everything else applied, this facet not */
  const facetPool = (exceptKey) => {
    const view = getView();
    const tab = getActiveTab(view);
    return getBaseRows(view).filter((row) => filterByToken(row, tab?.filter)).filter(filterBySearch).filter((row) => matchesFacets(row, exceptKey));
  };
  const facetOptions = (facet) => {
    const counts = new Map();
    for (const row of facetPool(facet.key)) for (const v of new Set(asList(facet.get(row)))) counts.set(v, (counts.get(v) || 0) + 1);
    for (const v of getFilterState().applied[facet.key] || []) if (!counts.has(v)) counts.set(v, 0);
    return [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => a.value.localeCompare(b.value, "ro", { numeric: true }));
  };
  /* a facet is offered when the registry has at least two values for it */
  const availableFacets = () => {
    const view = getView();
    const base = getBaseRows(view);
    return facetsOf().filter((facet) => {
      if (getFilterState().applied[facet.key]?.length) return true;
      const seen = new Set();
      for (const row of base) { for (const v of asList(facet.get(row))) seen.add(v); if (seen.size > 1) return true; }
      return false;
    });
  };

  const getVisibleRows = () => {
    const view = getView();
    const tab = getActiveTab(view);

    const rows = getBaseRows(view)
      .filter((row) => filterByToken(row, tab?.filter))
      .filter(filterBySearch)
      .filter((row) => matchesFacets(row));

    return [...rows].sort((a, b) => {
      if (!view?.groupBy) {
        return compareRowsByActiveSort(a, b);
      }

      const groupA = String(a[view.groupBy] || "");
      const groupB = String(b[view.groupBy] || "");
      const byGroup = groupA.localeCompare(groupB, "ro");

      if (byGroup !== 0) {
        return byGroup;
      }

      return compareRowsByActiveSort(a, b);
    });
  };

  const getActiveTab = (view = getView()) => {
    const tabs = (view?.tabs || []).filter((tab) => !tab.divider);

    if (!tabs.length) {
      return null;
    }

    const current = workplaceState.tabKey || view.defaultTab || tabs[0].id;
    return tabs.find((tab) => tab.id === current) || tabs[0];
  };

  const fillColumns = new Set(["solicitant", "companie", "actBaza", "titular", "motivOficiu"]);
  const defaultMinColumnWidth = 128;
  const selectColumnWidth = 43;
  const fixedColumnWidths = {
    nrDosar: 139
  };
  const minColumnWidths = {
    decizia: 72,
    status: 76,
    alerte: 92,
    tipDosar: 94,
    solicitant: 132,
    companie: 132,
    dataDepunerii: 116,
    termenExaminare: 126,
    dataSemnarii: 116,
    modLivrare: 104,
    actBaza: 260,
    titular: 132,
    motivOficiu: 220,
    dataInitierii: 116,
    initiatDe: 160,
    creatDe: 168
  };
  const maxColumnWidths = {
    decizia: 128,
    status: 150,
    alerte: 184,
    tipDosar: 132,
    dataDepunerii: 132,
    termenExaminare: 144,
    dataSemnarii: 132,
    modLivrare: 132,
    dataInitierii: 132,
    initiatDe: 180
  };

  const measureCanvas = document.createElement("canvas");
  const measureContext = measureCanvas.getContext?.("2d");

  const measureText = (value, font = "500 14px Onest, Arial, sans-serif") => {
    const text = String(value || "");

    if (!text) {
      return 0;
    }

    if (!measureContext) {
      return text.length * 7.4;
    }

    measureContext.font = font;
    return measureContext.measureText(text).width;
  };

  const clamp = (value, min, max = Infinity) => Math.max(min, Math.min(max, value));

  const getColumnTextLines = (row, key) => {
    if (workplaceDb?.kind === "users") {
      switch (key) {
        case "numeComplet":
          return [row.numeComplet, "Specialist"];
        case "roluri":
          return row.roluri || [];
        case "ultimaConectare":
          return [formatDate(row.ultimaConectare), row.ultimaConectareRelativ];
        case "ultimaActualizare":
          return [formatDate(row.ultimaActualizare)];
        default:
          return [row[key] ?? "—"];
      }
    }

    switch (key) {
      case "nrDosar":
        return [row.nrDosar, `Sursă: ${row.sursa}`];
      case "decizia":
        return [workplaceDb.decisions[row.decizia]?.label || "—"];
      case "status":
        return [workplaceDb.statuses[row.status]?.label || "—"];
      case "alerte":
        return row.alerte?.length
          ? row.alerte.map((alertKey) => workplaceDb.alerts[alertKey]?.short || alertKey)
          : ["—"];
      case "dataDepunerii":
        return [formatDate(row.dataDepunerii)];
      case "termenExaminare":
        return [formatDate(row.termenExaminare), daysUntil(row.termenExaminare) < 0 ? "depășit" : "rămase"];
      case "dataSemnarii":
        return [formatDate(row.dataSemnarii)];
      case "actBaza":
        return [row.actBaza?.nr, row.actBaza?.denumire].filter(Boolean);
      case "titular":
        return [row.actBaza?.titular || "—"];
      case "initiatDe":
        return [row.initiatDe?.nume || "—"];
      case "solicitant":
        return [row.numeSolicitant || "—"];
      default:
        return [row[key] ?? "—"];
    }
  };

  const getNaturalColumnWidth = (key, rows) => {
    if (["users", "services", "authorities", "tariffs", "ntpl"].includes(workplaceDb?.kind) && workplaceDb.columns[key]?.width) {
      return workplaceDb.columns[key].width;
    }

    if (fixedColumnWidths[key]) {
      return fixedColumnWidths[key];
    }

    const column = workplaceDb.columns[key];
    const minWidth = Math.max(defaultMinColumnWidth, minColumnWidths[key] || 0, column?.width || 0);
    const maxWidth = Math.max(minWidth, maxColumnWidths[key] || (fillColumns.has(key) ? Infinity : 220));
    const headerWidth = measureText(column?.label || key, "500 12px Onest, Arial, sans-serif") + 24;
    const contentWidth = rows.reduce((max, row) => {
      const lineWidth = Math.max(...getColumnTextLines(row, key).map((line) => measureText(line)));
      return Math.max(max, lineWidth + 24);
    }, 0);

    return Math.ceil(clamp(Math.max(headerWidth, contentWidth), minWidth, maxWidth));
  };

  const getColumnWidths = (columns, rows) => {
    const widths = Object.fromEntries(columns.map((key) => [key, getNaturalColumnWidth(key, rows)]));
    const tablePaddingWidth = getView()?.selectable === false ? 0 : selectColumnWidth;
    const visibleTableWidth = workplaceTable?.parentElement?.clientWidth || 0;
    const naturalWidth = columns.reduce((sum, key) => sum + widths[key], tablePaddingWidth);
    const extraWidth = Math.max(0, visibleTableWidth - naturalWidth);
    const growable = columns.filter((key) => fillColumns.has(key) || workplaceDb?.columns[key]?.fill);

    if (extraWidth > 0 && growable.length) {
      const each = Math.floor(extraWidth / growable.length);
      let remainder = extraWidth - each * growable.length;

      growable.forEach((key) => {
        widths[key] += each + (remainder > 0 ? 1 : 0);
        remainder -= 1;
      });
    }

    return widths;
  };

  const setColumnWidth = (column, width) => {
    const value = width || column?.width || 140;
    return `width:${value}px;min-width:${value}px;max-width:${value}px;`;
  };

  const renderSortIcon = (column, direction = null) => {
    if (!column?.sortable) {
      return "";
    }

    return `
      <span class="e-permits-workplace__sort${direction ? ` is-${escapeHtml(direction)}` : ""}" aria-hidden="true">
        <svg class="icon" width="20" height="20"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
      </span>
    `;
  };

  const renderTableHead = (columns, columnWidths) => {
    if (!workplaceHead) {
      return;
    }

    const selectable = getView()?.selectable !== false;

    workplaceHead.innerHTML = `
      ${selectable ? `<th scope="col" class="e-permits-workplace__select-cell">
        <label class="checkbox checkbox--medium">
          <input class="checkbox-input" type="checkbox" aria-label="Selectează toate rândurile" data-workplace-select-all>
          <span class="checkbox-custom" aria-hidden="true"></span>
        </label>
      </th>` : ""}
      ${columns.map((key) => {
        const column = workplaceDb.columns[key];
        const sortable = Boolean(column?.sortable);
        const isSorted = sortable && workplaceState.sortKey === key;
        const sortDirection = isSorted ? workplaceState.sortDirection : null;
        const ariaSort = isSorted ? (sortDirection === "asc" ? "ascending" : "descending") : "none";
        const label = escapeHtml(column.label);

        return `
          <th scope="col" style="${setColumnWidth(column, columnWidths[key])}" data-column="${escapeHtml(key)}"${sortable ? ` aria-sort="${ariaSort}"` : ""} class="${sortable ? `is-sortable${isSorted ? " is-sorted" : ""}` : ""}">
            ${sortable ? `
              <button class="e-permits-workplace__th-content" type="button" data-workplace-sort="${escapeHtml(key)}" aria-label="Sortează după ${label}">
                <span>${label}</span>${renderSortIcon(column, sortDirection)}
              </button>
            ` : `
              <span class="e-permits-workplace__th-content"><span>${label}</span></span>
            `}
          </th>
        `;
      }).join("")}
    `;
  };

  const renderTag = (label, tone = "neutral") => {
    if (!label || label === "—") {
      return '<span class="e-permits-workplace__dash">—</span>';
    }

    return `<span class="e-permits-workplace__tag e-permits-workplace__tag--${escapeHtml(tone)}">${escapeHtml(label)}</span>`;
  };

  const renderAlerts = (alerts) => {
    if (!alerts?.length) {
      return '<span class="e-permits-workplace__dash">—</span>';
    }

    return `
      <div class="e-permits-workplace__alert-list">
        ${alerts.map((alertKey) => {
          const alert = workplaceDb.alerts[alertKey];
          return `<span class="e-permits-workplace__flag e-permits-workplace__flag--${escapeHtml(alert?.tone || "neutral")}" title="${escapeHtml(alert?.label || alertKey)}">${escapeHtml(alert?.short || alertKey)}</span>`;
        }).join("")}
      </div>
    `;
  };

  const renderTermen = (row) => {
    const days = daysUntil(row.termenExaminare);
    const done = ["eliberat", "respins", "arhivat", "semnat"].includes(row.status);
    let meta = "";
    let tone = "muted";

    if (!done) {
      if (days < 0) {
        meta = `${Math.abs(days)} z. depășit`;
        tone = "danger";
      } else if (days <= 3) {
        meta = `${days} z. rămase`;
        tone = "warning";
      } else {
        meta = `${days} z. rămase`;
      }
    }

    return `
      <span class="e-permits-workplace__date-stack">
        <span>${escapeHtml(formatDate(row.termenExaminare))}</span>
        ${meta ? `<span class="e-permits-workplace__date-meta e-permits-workplace__date-meta--${tone}">${tone === "danger" ? '<span class="e-permits-workplace__date-dot" aria-hidden="true"></span>' : ""}${escapeHtml(meta)}</span>` : ""}
      </span>
    `;
  };

  const handleCopyClick = async (copyButton) => {
    const value = copyButton.dataset.shellCopyValue || "";

    try {
      await navigator.clipboard.writeText(value);
    } catch (error) {
      console.warn(error);
    }

    copyButton.classList.add("is-copied");
    const tooltip = copyButton.querySelector(".e-permits-workplace__copy-tooltip");

    if (tooltip) {
      tooltip.textContent = "Copiat";
    }

    window.setTimeout(() => {
      copyButton.classList.remove("is-copied");

      if (tooltip) {
        tooltip.textContent = "Copiază";
      }
    }, 1300);
  };

  const renderCopyCode = (value, label = value) => {
    if (!value || value === "—") {
      return '<span class="e-permits-workplace__dash">—</span>';
    }

    return `
      <button class="e-permits-workplace__copy-code" type="button" data-shell-copy-value="${escapeHtml(value)}" aria-label="${escapeHtml(label)}">
        <span>${escapeHtml(value)}</span>
        <span class="e-permits-workplace__copy-tooltip" aria-hidden="true">Copiază</span>
      </button>
    `;
  };

  /* Library breadcrumbs (Figma Components 232:5282). A crumb with `attr` is a link that
     reuses an existing back handler; without it, it is plain text. The last crumb is the
     current level unless `trailing` (the trail runs into a title shown below it). */
  const renderBreadcrumbs = (crumbs, { trailing = false, truncate = false, label = "Navigare" } = {}) => `
    <nav class="breadcrumbs${trailing ? " breadcrumbs--trailing" : ""}${truncate ? " breadcrumbs--truncate" : ""}" aria-label="${escapeHtml(label)}">
      <ol class="breadcrumbs__list">
        ${crumbs.map((crumb, index) => index < crumbs.length - 1 || trailing
          ? `<li class="breadcrumbs__item">${crumb.attr
            ? `<a class="breadcrumbs__link" href="#" ${crumb.attr}>${escapeHtml(crumb.label)}</a>`
            : `<span class="breadcrumbs__link">${escapeHtml(crumb.label)}</span>`}</li>`
          : `<li class="breadcrumbs__item is-selected"><span class="breadcrumbs__current" aria-current="page">${escapeHtml(crumb.label)}</span></li>`
        ).join("")}
      </ol>
    </nav>
  `;

  /* Shared back-office page header (Figma 8993:37914): breadcrumbs + title,
     optional actions with a caption on the right, a meta row of label/value
     pairs split by vertical separators, then the tab row. Every profile —
     dosar, utilizator, rol, act permisiv — renders through these, so the
     format stays identical everywhere. */
  /* the menu section a page lives in (Locul de muncă, Administrare…): the group of the
     menu item named by the first crumb, else of the active item */
  const navSectionOf = (label) => {
    const links = [...document.querySelectorAll("[data-nav-item]")];
    const link = links.find((item) => (item.getAttribute("title") || item.textContent).trim() === label)
      || links.find((item) => item.classList.contains("is-active"));
    return link?.closest(".e-permits-shell__nav-group")?.querySelector(".e-permits-shell__group-label")?.textContent.trim() || "";
  };

  /* a state that is not an action ("Modificări nepublicate"): dot + text, never a tag
     wedged between buttons */
  const renderHeaderStatus = (text, tone = "warning", attrs = "") => attrs
    /* clickable: opens the review of what is pending */
    ? `<button class="e-permits-page-header__status e-permits-page-header__status--${tone} e-permits-page-header__status--button" type="button" ${attrs}>${escapeHtml(text)}</button>`
    : `<span class="e-permits-page-header__status e-permits-page-header__status--${tone}">${escapeHtml(text)}</span>`;

  const renderPageHeaderTop = ({ crumbs = [], title = "", actions = "", caption = "", status = "" }) => {
    const section = crumbs.length ? navSectionOf(crumbs[0].label) : "";
    const trail = section && section !== crumbs[0].label ? [{ label: section }, ...crumbs] : crumbs;
    return `
    <div class="e-permits-page-header__heading">
      ${renderBreadcrumbs(trail, { truncate: true })}
      <h1 class="e-permits-page-header__title" title="${escapeHtml(title)}">${escapeHtml(title)}</h1>
    </div>
    ${actions || caption || status ? `
      <div class="e-permits-page-header__aside">
        ${actions ? `<div class="e-permits-page-header__actions">${actions}</div>` : ""}
        ${caption || status ? `<p class="e-permits-page-header__caption">${status}${status && caption ? " · " : ""}${escapeHtml(caption)}</p>` : ""}
      </div>
    ` : ""}
  `;
  };

  /* Separators are drawn by each item's ::before (see the CSS), not as flex
     children, so hiding one never changes the layout it depends on. */
  const renderPageHeaderMeta = (items) => items.map(([label, valueHtml]) => `
    <div class="e-permits-page-header__meta-item">
      <span class="e-permits-page-header__meta-label">${escapeHtml(label)}</span>
      <span class="e-permits-page-header__meta-value">${valueHtml}</span>
    </div>
  `).join("");

  /* When the meta row wraps, an item that starts a new line gets
     .is-row-start, which drops its separator — so no line ever ends or begins
     with one. Re-measured whenever a meta row resizes or is re-rendered. */
  const syncPageHeaderMetaRows = (meta) => {
    let previousTop = null;

    meta.querySelectorAll(":scope > .e-permits-page-header__meta-item").forEach((item) => {
      const top = item.offsetTop;
      item.classList.toggle("is-row-start", previousTop === null || top > previousTop + 1);
      previousTop = top;
    });
  };

  const pageHeaderMetaObserver = "ResizeObserver" in window
    ? new ResizeObserver((entries) => entries.forEach((entry) => syncPageHeaderMetaRows(entry.target)))
    : null;

  /* Sticky tabs: the whole header is sticky with a negative top of
     (tabs height − header height), so the title and meta scroll away and the
     tab row pins under the shell top bar. Heights change with wrapping meta,
     so the offset is re-measured on resize. */
  const syncStickyPageHeader = (header) => {
    const tabs = header.querySelector(".e-permits-page-header__tabs");
    header.classList.toggle("is-sticky", Boolean(tabs));

    if (tabs) {
      header.style.setProperty("--page-header-stick", `${tabs.offsetHeight - header.offsetHeight}px`);
    }
  };

  const pageHeaderObserver = "ResizeObserver" in window
    ? new ResizeObserver((entries) => entries.forEach((entry) => syncStickyPageHeader(entry.target)))
    : null;

  const watchPageHeaderMeta = (meta) => {
    if (!meta) {
      return;
    }

    pageHeaderMetaObserver?.observe(meta);
    syncPageHeaderMetaRows(meta);

    const header = meta.closest(".e-permits-page-header");

    if (header) {
      pageHeaderObserver?.observe(header);
      syncStickyPageHeader(header);
    }
  };

  document.querySelectorAll(".e-permits-page-header__meta").forEach(watchPageHeaderMeta);

  const renderPageHeaderTabCount = (count, tone) =>
    `<span class="e-permits-page-header__tab-count${tone ? ` e-permits-page-header__tab-count--${escapeHtml(tone)}` : ""}">${count}</span>`;

  const DOSAR_STATUS_ORDER = [
    "schita",
    "depus",
    "inExaminare",
    "asteaptaPlata",
    "spreCoordonare",
    "spreSemnare",
    "semnat",
    "eliberat",
    "respins",
    "arhivat"
  ];

  const DOSAR_PROFIL_TABS = [
    { id: "general", label: "Date generale", icon: "page-text" },
    { id: "solicitare", label: "Detalii solicitare" },
    { id: "taxe", label: "Taxe și plăți", count: (profile) => profile.taxe.length },
    { id: "avize", label: "Avize", count: (profile) => profile.avize.length },
    { id: "decizie", label: "Act/Decizie", count: (profile) => profile.acte.length },
    { id: "documente", label: "Documente generate", count: (profile) => profile.documente.length },
    { id: "notificari", label: "Notificări", count: (profile) => profile.notificari.length },
    { id: "jurnal", label: "Jurnalul activităților" }
  ];

  /* US-115 §10: which tabs a case shows — by its content and by the viewer's role */
  const DOSAR_TAB_ROLES = { expert: ["avize"], "operator-ghiseu": ["general", "solicitare"] };
  const dosarTabVisible = (tab, profile, row) => {
    const allowed = DOSAR_TAB_ROLES[currentEngineRole()];
    if (allowed && !allowed.includes(tab.id)) return false;
    if (tab.id === "taxe") return profile.taxe.length > 0;
    if (tab.id === "avize") return profile.avize.length > 0;
    if (tab.id === "decizie") return profile.acte.length > 0;
    if (tab.id === "jurnal") return Boolean(caseFlowOf(row));
    return true;
  };

  const getDosarById = (id) =>
    workplaceState.rows.find((row) => row.id === id) ||
    (dossierDb?.runtimeRows || []).find((row) => row.id === id);

  const hashValue = (value) => {
    let hash = 2166136261;

    for (const character of String(value || "")) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
  };

  const formatMoney = (value) => new Intl.NumberFormat("ro-MD", {
    style: "currency",
    currency: "MDL",
    minimumFractionDigits: 2
  }).format(value);

  const formatDateTime = (date, time = "09:30") => `${formatDate(date)}, ${time}`;

  const renderProfileIcon = (name, size = 20) => `
    <svg class="icon" width="${size}" height="${size}" aria-hidden="true">
      <use href="assets/icons/sprite.svg#icon-${name}"></use>
    </svg>
  `;

  const buildDosarProfile = (row) => {
    if (row.profil) {
      return row.profil;
    }

    const hash = hashValue(row.id);
    const isOficiu = row.sursa === "OFICIU";
    const isClosed = ["eliberat", "respins", "arhivat"].includes(row.status);
    const statusIndex = DOSAR_STATUS_ORDER.indexOf(row.status);
    const hasPaymentAlert = row.alerte.includes("neachitatTermen");
    const hasReviewAlert = row.alerte.some((alert) => ["inAvizare", "neavizatTermen"].includes(alert));
    const hasFailedNotification = row.alerte.includes("notificareEsuata");
    const hasDecisionStage = statusIndex >= DOSAR_STATUS_ORDER.indexOf("spreCoordonare");
    const needsReviews = hasReviewAlert || row.serviciu.toLowerCase().includes("alcoolice") || hash % 5 === 0;
    const applicantId = `2${String(hash % 1000000000000).padStart(12, "0")}`;
    const companyId = row.companie ? `1${String((hash * 13) % 1000000000000).padStart(12, "0")}` : null;
    const representationType = !isOficiu && row.companie
      ? (hash % 3 === 0 ? "administrator" : "mpower")
      : null;
    const representative = representationType
      ? {
          type: representationType,
          nume: row.numeSolicitant,
          idnp: applicantId,
          numar: representationType === "mpower" ? `MP-${String(hash % 1000000).padStart(6, "0")}` : null,
          emisaLa: representationType === "mpower" ? "2026-02-14" : null,
          valabilaPanaLa: representationType === "mpower" ? "2027-02-14" : null,
          scop: representationType === "mpower" ? "Depunerea și reprezentarea cererii pentru serviciul selectat" : "Reprezentare legală deplină"
        }
      : null;
    /* fees: generated by the specialist after verification (never at submission) */
    const feesGenerated = row.status === "asteaptaPlata"
      || ["spreCoordonare", "spreSemnare", "semnat", "eliberat"].includes(row.status)
      || (row.status === "arhivat" && row.decizia === "aprobare");
    const feesPaid = feesGenerated && row.status !== "asteaptaPlata";
    const verificatLa = toIsoDate(addDays(parseIsoDate(row.dataDepunerii), 2 + (hash % 3)));
    const taxaTermen = toIsoDate(addDays(parseIsoDate(verificatLa), 5));
    const taxaAchitatDate = toIsoDate(addDays(parseIsoDate(verificatLa), 1 + (hash % 3)));
    const paymentState = feesPaid ? "achitata" : feesGenerated ? (hasPaymentAlert ? "expirata" : "emisa") : "fara";
    const paymentDate = feesPaid ? taxaAchitatDate : null;
    const paymentDueDate = toIsoDate(addDays(parseIsoDate(row.dataDepunerii), 5));
    const avize = needsReviews
      ? [
          {
            id: `AV-${String(hash % 100000).padStart(5, "0")}`,
            institutie: "Agenția Națională pentru Siguranța Alimentelor",
            solicitatLa: formatDate(row.dataDepunerii),
            termen: formatDate(toIsoDate(addDays(parseIsoDate(row.dataDepunerii), 10))),
            status: row.alerte.includes("neavizatTermen") ? "expirat" : row.alerte.includes("inAvizare") ? "inLucru" : "favorabil",
            rezultat: row.alerte.includes("inAvizare") || row.alerte.includes("neavizatTermen") ? "—" : "Pozitiv"
          }
        ]
      : [];
    const documente = [
      {
        nume: isOficiu ? "Nota de inițiere" : "Cererea depusă",
        tip: "PDF",
        data: formatDate(isOficiu ? row.dataInitierii : row.dataDepunerii),
        autor: isOficiu ? row.initiatDe?.nume || "Autoritatea emitentă" : row.numeSolicitant
      },
      ...(representative?.type === "mpower" ? [{
        nume: "Extras MPower",
        tip: "PDF",
        data: formatDate(row.dataDepunerii),
        autor: "MPower"
      }] : []),
      ...(paymentState === "achitata" ? [{
        nume: "Confirmarea achitării taxei",
        tip: "PDF",
        data: formatDate(paymentDate),
        autor: "MPay"
      }] : []),
      ...(hasDecisionStage ? [{
        nume: row.decizia === "respingere" ? "Decizia de respingere" : "Proiectul actului permisiv",
        tip: "PDF",
        data: formatDate(row.dataSemnarii || row.termenExaminare),
        autor: row.specialist?.nume || workplaceDb.myAutoritate
      }] : [])
    ];
    const notificari = [
      {
        canal: "Email",
        destinatar: `${row.numeSolicitant.toLowerCase().replace(/\s+/g, ".")}@example.md`,
        eveniment: isOficiu ? "Inițierea procedurii" : "Înregistrarea cererii",
        trimisaLa: formatDateTime(isOficiu ? row.dataInitierii : row.dataDepunerii, "10:14"),
        status: "livrata"
      },
      ...(feesGenerated ? [{
        canal: "MNotify",
        destinatar: "+373 60 000 000",
        eveniment: "Notă de plată emisă — de achitat",
        trimisaLa: formatDateTime(verificatLa, "11:20"),
        status: "livrata"
      }, {
        canal: "Email",
        destinatar: `${row.numeSolicitant.toLowerCase().replace(/\s+/g, ".")}@example.md`,
        eveniment: "Notă de plată emisă — de achitat",
        trimisaLa: formatDateTime(verificatLa, "11:20"),
        status: "livrata"
      }] : []),
      ...(statusIndex >= DOSAR_STATUS_ORDER.indexOf("inExaminare") ? [{
        canal: "MNotify",
        destinatar: "+373 60 000 000",
        eveniment: "Actualizarea statutului dosarului",
        trimisaLa: formatDateTime(row.termenExaminare, "08:45"),
        status: hasFailedNotification ? "esuata" : "livrata"
      }] : [])
    ];

    /* No fee at submission: the specialist generates the fees after verifying the case
       (Setarea taxei / taxa de examinare), MPay issues the payment note and the citizen is
       notified. Rejected cases never get fees. */
    const taxaBaseNr = 440000 + (hash % 50000);
    const taxe = feesGenerated ? [
      { id: `MPAY-${taxaBaseNr}`, denumire: "Taxă de examinare", suma: 560, status: feesPaid ? "achitat" : "neachitat", emitere: verificatLa, termen: taxaTermen, achitare: feesPaid ? taxaAchitatDate : null },
      { id: `MPAY-${taxaBaseNr + 1}`, denumire: "Taxă de eliberare a actului", suma: 460, status: feesPaid ? "achitat" : "neachitat", emitere: verificatLa, termen: taxaTermen, achitare: feesPaid ? taxaAchitatDate : null }
    ] : [];

    const acteSursa = "ASP";
    const acte = hasDecisionStage
      ? Array.from({ length: row.decizia === "respingere" ? 2 : 1 }, () => ({
          titlu: row.decizia === "respingere"
            ? "Decizie de respingere"
            : row.nrActEmis ? `Act permisiv ${row.nrActEmis}` : "Decizie de aprobare",
          emis: formatDate(row.dataSemnarii || row.termenExaminare),
          sursa: acteSursa
        }))
      : [];

    row.profil = {
      isOficiu,
      rolPersoana: isOficiu ? "titular" : "solicitant",
      applicantId,
      companyId,
      representative,
      hasDecisionStage,
      taxe,
      avize,
      acte,
      documente,
      notificari
    };

    return row.profil;
  };

  const getProfileSignal = (profile, tabId) => {
    if (tabId === "taxe") {
      const neachitat = profile.taxe.filter((taxa) => taxa.status === "neachitat");

      if (neachitat.some((taxa) => daysUntil(taxa.termen) < 0)) {
        return { tone: "danger", label: "Există o plată cu termenul depășit" };
      }

      if (neachitat.length) {
        return { tone: "warning", label: "Există o plată în așteptare" };
      }
    }

    if (tabId === "avize") {
      if (profile.avize.some((aviz) => aviz.status === "expirat")) {
        return { tone: "danger", label: "Există un aviz cu termenul depășit" };
      }

      if (profile.avize.some((aviz) => aviz.status === "inLucru")) {
        return { tone: "warning", label: "Există un aviz în lucru" };
      }
    }

    if (tabId === "notificari" && profile.notificari.some((notificare) => notificare.status === "esuata")) {
      return { tone: "danger", label: "O notificare nu a fost livrată" };
    }

    return null;
  };

  const getDosarProfileTabs = (row) => {
    const profile = buildDosarProfile(row);

    return DOSAR_PROFIL_TABS
      .filter((tab) => dosarTabVisible(tab, profile, row))
      .map((tab) => ({
        ...tab,
        countValue: tab.count ? tab.count(profile) : null,
        signal: getProfileSignal(profile, tab.id)
      }));
  };

  const renderAvatarChip = (person) => {
    if (!person) {
      return '<span class="e-permits-workplace__dash">—</span>';
    }

    return `
      <span class="e-permits-dosar-profil__person">
        <span class="e-permits-dosar-profil__avatar" style="background:${escapeHtml(person.color || "#0058D2")}">${escapeHtml(person.initiale || "")}</span>
        <span>${escapeHtml(person.nume)}</span>
      </span>
    `;
  };

  /* " 3 z. rămase" / " 2 z. depășit" after a due date (fees, approvals) */
  const renderDeadlineMeta = (iso) => {
    if (!iso) return "";
    const days = daysUntil(iso);
    return ` <span class="e-permits-dosar-profil__termen-meta">${days < 0 ? `${Math.abs(days)} z. depășit` : `${days} z. rămase`}</span>`;
  };

  const renderTermenMeta = (row) => {
    const done = ["eliberat", "respins", "arhivat", "semnat"].includes(row.status);

    if (done) {
      return "";
    }

    const days = daysUntil(row.termenExaminare);
    return days < 0 ? `${Math.abs(days)} z. depășit` : `${days} z. rămase`;
  };

  const renderDosarProfilTitle = (row) => renderPageHeaderTop({
    crumbs: [
      { label: workplaceTitle?.textContent.trim() || "Dosare", attr: "data-dosar-profil-crumb-back" },
      { label: row.nrDosar }
    ],
    title: row.serviciu,
    /* the current process step and its actions (core/case-flow.js) */
    actions: renderCaseActions(row),
    caption: caseActionCaption(row)
  });

  const renderDosarProfilSummary = (row) => {
    const termenMeta = renderTermenMeta(row);
    const profile = buildDosarProfile(row);
    const status = workplaceDb.statuses[row.status];
    const applicant = row.companie || row.numeSolicitant || "—";
    const representative = profile.representative?.nume || (row.companie ? row.numeSolicitant : "—");

    return renderPageHeaderMeta([
      ["Numărul dosarului", renderProfileCopyCode(row.nrDosar, `Copiază ${row.nrDosar}`)],
      [profile.isOficiu ? "Titular" : "Solicitant", escapeHtml(profile.isOficiu ? row.actBaza?.titular || applicant : applicant)],
      ["Reprezentant", escapeHtml(profile.isOficiu ? "—" : representative)],
      ["Termen", `${escapeHtml(formatDate(row.termenExaminare))}${termenMeta ? ` <span class="e-permits-dosar-profil__termen-meta">${escapeHtml(termenMeta)}</span>` : ""}`],
      ["Alerte", renderAlerts(row.alerte)],
      ["Specialist", renderAvatarChip(row.specialist)],
      ["Statut", `${renderTag(status?.label, status?.tone)}${row.tipDosar ? renderTag(row.tipDosar, "neutral") : ""}`]
    ]);
  };

  const renderDosarProfilTabs = (row = getDosarById(dosarProfilState.rowId)) => getDosarProfileTabs(row).map((tab) => {
    const isActive = dosarProfilState.tabKey === tab.id;

    return `
      <button class="tab-button${isActive ? " active" : ""}" id="dosar-tab-${tab.id}" type="button" role="tab" aria-controls="dosar-panel-${tab.id}" aria-selected="${isActive ? "true" : "false"}" tabindex="${isActive ? "0" : "-1"}" data-dosar-tab="${tab.id}">
        ${tab.icon ? renderProfileIcon(tab.icon, 20) : ""}
        <span>${escapeHtml(tab.label)}</span>
        ${tab.countValue !== null && tab.countValue > 0 ? renderPageHeaderTabCount(tab.countValue, tab.signal?.tone) : ""}
      </button>
    `;
  }).join("");

  const renderInfoCard = (title, rows) => `
    <section class="e-permits-dosar-profil__section">
      <h2 class="e-permits-dosar-profil__section-title">${escapeHtml(title)}</h2>
      <div class="e-permits-dosar-profil__card">
        ${rows.map(([label, valueHtml]) => `
          <div class="e-permits-dosar-profil__row">
            <span class="e-permits-dosar-profil__row-label" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
            <span class="e-permits-dosar-profil__row-value">${valueHtml}</span>
          </div>
        `).join("")}
      </div>
    </section>
  `;

  const renderProfileFile = (file) => `
    <div class="e-permits-dosar-profil__file${file.system ? " e-permits-dosar-profil__file--system" : ""}">
      <img class="e-permits-dosar-profil__file-icon" src="assets/icons/${file.system ? "document-generated.svg" : "document-uploaded.svg"}" width="24" height="24" alt="">
      <div class="e-permits-dosar-profil__file-copy">
        <div class="e-permits-dosar-profil__file-title-row">
          <span class="e-permits-dosar-profil__file-title">${escapeHtml(file.name)}</span>
          ${file.size ? `<span class="e-permits-dosar-profil__file-dot" aria-hidden="true">•</span><span class="e-permits-dosar-profil__file-size">${escapeHtml(file.size)}</span>` : ""}
        </div>
        ${file.system ? `<div class="e-permits-dosar-profil__file-meta"><span>Emis <strong>${escapeHtml(file.issuedAt)}</strong></span><span class="e-permits-dosar-profil__file-dot" aria-hidden="true">•</span><span>${escapeHtml(file.issuer)}</span></div>` : ""}
      </div>
    </div>
  `;

  const renderProfileCopyCode = (value, label = value) => {
    if (!value || value === "—") {
      return '<span class="e-permits-workplace__dash">—</span>';
    }

    return `
      <button class="e-permits-workplace__copy-code e-permits-dosar-profil__copy-code" type="button" data-shell-copy-value="${escapeHtml(value)}" aria-label="${escapeHtml(label)}">
        <span>${escapeHtml(value)}</span>
        ${renderProfileIcon("copy", 20)}
        <span class="e-permits-workplace__copy-tooltip" aria-hidden="true">Copiază</span>
      </button>
    `;
  };





  const renderRepresentation = (representative) => {
    if (!representative) {
      return "";
    }

    if (representative.type === "administrator") {
      return renderInfoCard("Reprezentare", [
        ["Temeiul reprezentării", "Administrator al persoanei juridice"],
        ["Reprezentant", escapeHtml(representative.nume)],
        ["IDNP", renderCopyCode(representative.idnp, `Copiază IDNP ${representative.idnp}`)],
        ["Sursa verificării", "Registrul de stat al persoanelor juridice"],
        ["Domeniul reprezentării", escapeHtml(representative.scop)]
      ]);
    }

    return renderInfoCard("Reprezentare prin MPower", [
      ["Numărul împuternicirii", renderCopyCode(representative.numar, `Copiază ${representative.numar}`)],
      ["Reprezentant", escapeHtml(representative.nume)],
      ["IDNP", renderCopyCode(representative.idnp, `Copiază IDNP ${representative.idnp}`)],
      ["Emisă la", escapeHtml(formatDate(representative.emisaLa))],
      ["Valabilă până la", escapeHtml(formatDate(representative.valabilaPanaLa))],
      ["Domeniul reprezentării", escapeHtml(representative.scop)]
    ]);
  };

  /* "Traiectoria dosarului" (Figma GEAP 2.0 8929:7814): the case's path at a glance —
     Depusă → Examinare → Coordonare → Semnare → Semnat → Eliberat (Respins on a
     rejection). Done steps: green check + date + who; the current one: blue clock (amber
     pause when suspended) + since when + who; the rest: empty circles. Under the path,
     "Acum" and "Urmează" say in words where the case is and what happens next.
     Dates the seed does not store are derived deterministically from the filing date. */
  const TRAJECTORY_NEXT = {
    depus: "Repartizarea către un specialist, care începe examinarea.",
    asteaptaPlata: "După achitarea în MPay, specialistul pregătește proiectul actului.",
    examinare: "Specialistul pregătește proiectul de decizie și îl trimite la coordonare.",
    coordonare: "Șeful subdiviziunii verifică proiectul și îl trimite la semnare.",
    semnare: "Conducătorul autorității semnează actul sau decizia.",
    semnat: "Actul se eliberează solicitantului prin modalitatea aleasă.",
    final: ""
  };
  const renderDosarTrajectory = (row) => {
    const isOficiu = row.sursa === "OFICIU";
    const rejected = row.decizia === "respingere" && ["respins", "arhivat"].includes(row.status);
    const current = { schita: 0, depus: 1, inExaminare: 1, asteaptaPlata: 1, spreCoordonare: 2, spreSemnare: 3, semnat: 5, eliberat: 6, respins: 6, arhivat: 6 }[row.status] ?? 0;
    const flowCtx = caseFlowOf(row);
    const suspended = Boolean(flowCtx?.state.suspended);
    const today = parseIsoDate(workplaceDb.today) || new Date();
    const start = parseIsoDate(isOficiu ? row.dataInitierii || row.dataDepunerii : row.dataDepunerii);
    const hash = hashValue(row.id);
    const cap = (date) => (date > today ? today : date);
    const signed = row.dataSemnarii ? parseIsoDate(row.dataSemnarii) : null;
    const dates = [start];
    for (let i = 1; i < 6; i += 1) dates.push(cap(addDays(dates[i - 1], 1 + ((hash >>> (i * 3)) % 3))));
    if (signed) { dates[4] = signed; dates[3] = cap(addDays(signed, -1)); dates[5] = cap(addDays(signed, 1)); }
    /* steps happen in order: an earlier step never shows a later date than the next one */
    for (let i = 4; i >= 0; i -= 1) if (dates[i] > dates[i + 1]) dates[i] = dates[i + 1];
    for (let i = 1; i < 6; i += 1) if (dates[i] < dates[i - 1]) dates[i] = dates[i - 1];
    const steps = [
      { key: "depus", label: isOficiu ? "Inițiat" : "Depusă", who: isOficiu ? "Din oficiu" : row.sursa === "FO" ? "Solicitant" : "Ghișeu" },
      { key: "examinare", label: "Examinare", who: row.specialist?.nume || "Nerepartizat" },
      { key: "coordonare", label: "Coordonare", who: row.repartizatDe?.nume || "Șeful subdiviziunii" },
      { key: "semnare", label: "Semnare", who: "Conducătorul autorității" },
      { key: "semnat", label: "Semnat", who: "Conducătorul autorității" },
      { key: "final", label: rejected ? "Respins" : "Eliberat", who: rejected ? "Solicitant notificat" : row.modLivrare || "Ghișeu" }
    ];
    /* waiting for payment: the deadline that matters is the payment note's */
    const payDue = row.status === "asteaptaPlata" ? (buildDosarProfile(row).taxe.filter((t) => t.status === "neachitat").map((t) => t.termen).sort()[0] || null) : null;
    const overdue = payDue ? parseIsoDate(payDue) < today : current >= 1 && current <= 3 && row.termenExaminare && parseIsoDate(row.termenExaminare) < today;
    const stateOf = (i) => (i < current || (current === 6 && i <= 5) ? "done" : i === current ? (suspended ? "paused" : "current") : "todo");
    const icon = { done: "circle-checkmark-filled", current: "time-filled", paused: "pause" };
    const short = (date) => date.toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" });
    const stepNow = steps[Math.min(current, 5)];
    const daysIn = Math.max(0, Math.round((today - dates[Math.min(current, 5)]) / 86400000));
    /* "Acum / Urmează" — a callout under the path (Figma GEAP 2.0 8440:119598, flat light
       blue): the timeline's clock icon (pause when suspended), what is happening now and since when, and what comes next */
    const nowTitle = current >= 6 ? (rejected ? "Dosar respins" : "Dosar finalizat")
      : `Acum: ${{ depus: "Așteaptă repartizarea", asteaptaPlata: "Așteaptă plata taxelor", semnat: "Așteaptă eliberarea" }[row.status] || stepNow.label}`;
    const nowMeta = current >= 6
      ? (rejected ? "Decizia de respingere a fost comunicată solicitantului." : `Actul a fost eliberat${row.modLivrare ? ` (${row.modLivrare})` : ""}.`)
      : [daysIn ? `de ${plural(daysIn, "zi", "zile")}` : "de azi", suspended ? "suspendat" : "", payDue ? `plată până la ${formatLongDate(payDue)}` : row.termenExaminare && current <= 3 ? `termen ${formatLongDate(row.termenExaminare)}` : ""].filter(Boolean).join(" · ");
    const nextText = current >= 6 ? "" : TRAJECTORY_NEXT[["depus", "asteaptaPlata", "semnat"].includes(row.status) ? row.status : stepNow.key] || "";
    const summary = `
      <div class="e-permits-callout-wrap">
        <div class="e-permits-callout e-permits-callout--info" role="status">
          <span class="e-permits-callout__icon" aria-hidden="true"><svg class="icon" width="24" height="24"><use href="assets/icons/sprite.svg#icon-${current >= 6 ? (rejected ? "circle-error-filled" : "circle-checkmark-filled") : suspended ? "pause" : "time-filled"}"></use></svg></span>
          <div class="e-permits-callout__content">
            <p class="e-permits-callout__title">${escapeHtml(nowTitle)}${overdue ? renderTag("Termen depășit", "danger") : ""}</p>
            ${nowMeta ? `<p class="e-permits-callout__meta">${escapeHtml(nowMeta)}</p>` : ""}
            ${nextText ? `<p class="e-permits-callout__text"><strong>Urmează:</strong> ${escapeHtml(nextText)}</p>` : ""}
          </div>
        </div>
      </div>`;
    return `
      <section class="e-permits-dosar-profil__section e-permits-trajectory-section">
        <h2 class="e-permits-dosar-profil__section-title">Traiectoria dosarului</h2>
        <div class="e-permits-trajectory">
          <ol class="e-permits-trajectory__steps">
            ${steps.map((step, i) => {
              const state = stateOf(i);
              const failed = state === "done" && step.key === "final" && rejected;
              const showMeta = state !== "todo";
              return `
                <li class="e-permits-trajectory__step is-${failed ? "rejected" : state}"${state === "current" || state === "paused" ? ' aria-current="step"' : ""}>
                  <span class="e-permits-trajectory__marker" aria-hidden="true">${state === "todo" ? '<span class="e-permits-trajectory__dot"></span>' : `<svg class="icon" width="24" height="24"><use href="assets/icons/sprite.svg#icon-${failed ? "circle-error-filled" : icon[state]}"></use></svg>`}</span>
                  <span class="e-permits-trajectory__label">${escapeHtml(step.label)}<span class="sr-only"> — ${state === "done" ? "finalizat" : state === "todo" ? "urmează" : state === "paused" ? "suspendat" : "în curs"}</span></span>
                  ${showMeta ? `<span class="e-permits-trajectory__meta">${escapeHtml(short(dates[i]))}<br>${escapeHtml(step.who)}</span>` : ""}
                </li>`;
            }).join("")}
          </ol>
        </div>
        ${summary}
      </section>`;
  };

  const renderDosarProfilGeneral = (row) => {
    const isOficiu = row.sursa === "OFICIU";
    const status = workplaceDb.statuses[row.status];
    const decizia = workplaceDb.decisions[row.decizia];
    const receptionatDe = row.sursa === "FO" ? "Front Office" : row.sursa === "OFICIU" ? "Din oficiu" : "Ghișeu";
    const termenMeta = renderTermenMeta(row);
    const dash = '<span class="e-permits-workplace__dash">—</span>';

    const identificare = renderInfoCard("Identificare", [
      ["Numărul dosarului", renderCopyCode(row.nrDosar, `Copiază ${row.nrDosar}`)],
      ["Tipul dosarului", escapeHtml(row.tipDosar)],
      ["Denumirea serviciului", escapeHtml(row.serviciu)]
    ]);

    /* MMIP v2 Case Profile: current status, current step and assigned actor */
    const flowCtx = caseFlowOf(row);
    const publicStatus = casePublicStatus(row);
    const stepNode = flowCtx ? flowCtx.flow.nodes[flowCtx.state.stateId] : null;
    const stepLane = flowCtx ? caseFlow.laneOf(flowCtx.flow, flowCtx.state.stateId) : null;
    const dateDeProces = renderInfoCard("Date de proces", [
      [isOficiu ? "Data inițierii" : "Data depunerii", escapeHtml(formatDate(isOficiu ? row.dataInitierii : row.dataDepunerii))],
      ["Termenul de examinare", `${escapeHtml(formatDate(row.termenExaminare))}${termenMeta ? ` <span class="e-permits-dosar-profil__termen-meta">${escapeHtml(termenMeta)}</span>` : ""}`],
      ["Statutul dosarului", renderTag(status?.label, status?.tone)],
      ...(flowCtx ? [
        ["Pasul curent", stepNode?.kind === "terminal" ? escapeHtml(stepNode.name) : `${escapeHtml(stepNode?.name || "—")}${flowCtx.state.suspended ? renderTag("Suspendat", "neutral") : ""}`],
        ["Responsabil", stepLane ? escapeHtml(stepLane.title) : dash],
        ["Statut public (Evo Cabinet)", escapeHtml(publicStatus?.label || "—")],
        ["Flux", escapeHtml(flowCtx.flow.name)]
      ] : [])
    ]);

    const organizare = renderInfoCard("Organizare", [
      ["Autoritatea", escapeHtml(workplaceDb.myAutoritate)],
      ["Subdiviziunea de procesare", escapeHtml(row.subdiviziune)]
    ]);

    const persoaneImplicate = renderInfoCard("Persoane implicate", [
      ["Recepționat de", escapeHtml(receptionatDe)],
      ["Repartizat de", renderAvatarChip(row.repartizatDe)],
      ["Specialist", renderAvatarChip(row.specialist)],
      ["Aprobat de", dash]
    ]);

    const decizieSiAct = renderInfoCard("Decizie și act", [
      ["Decizia", decizia && decizia.label !== "—" ? renderTag(decizia.label, decizia.tone) : dash],
      ["Nr. actului generat", row.nrActEmis ? escapeHtml(row.nrActEmis) : dash],
      ["Nr. actului anterior", row.actBaza?.nr ? escapeHtml(row.actBaza.nr) : dash]
    ]);

    return `${renderDosarTrajectory(row)}${identificare}${dateDeProces}${organizare}${persoaneImplicate}${decizieSiAct}`;
  };

  const renderDosarProfilSolicitare = (row) => {
    const profile = buildDosarProfile(row);

    if (profile.isOficiu) {
      return `
        <section class="e-permits-dosar-profil__section">
          <h2 class="e-permits-dosar-profil__section-title">Date despre solicitare</h2>
          <div class="e-permits-dosar-profil__not-applicable">
            <span class="e-permits-dosar-profil__not-applicable-icon">${renderProfileIcon("circle-info", 24)}</span>
            <div>
              <h3>Nu se aplică acestui dosar</h3>
              <p>Procedura a fost inițiată din oficiu. Dosarul are un titular și un act permisiv de bază, nu un solicitant și o cerere depusă.</p>
            </div>
          </div>
        </section>
        ${renderInfoCard("Titular și act de bază", [
          ["Titular", escapeHtml(row.actBaza?.titular || "—")],
          ["Compania", escapeHtml(row.actBaza?.companie || "—")],
          ["Act permisiv de bază", renderCopyCode(row.actBaza?.nr, `Copiază ${row.actBaza?.nr || ""}`)],
          ["Motivul inițierii", escapeHtml(row.motivOficiu || "—")]
        ])}
      `;
    }

    const email = `${row.numeSolicitant.toLowerCase().replace(/\s+/g, ".")}@mail.md`;
    const applicantName = row.companie || row.numeSolicitant;
    const applicantId = profile.companyId || profile.applicantId;
    const applicantIdLabel = profile.companyId ? "IDNO" : "IDNP";
    const representativeName = profile.representative?.nume || row.numeSolicitant;
    const representativeId = profile.representative?.idnp || profile.applicantId;
    const deliverySelected = row.modLivrare === "Ghișeu" ? "Ridicare de la ghișeu" : row.modLivrare;
    const deliveryCost = ["Poștă", "MDelivery"].includes(row.modLivrare) ? "25 MDL" : "Gratuit";
    const files = [
      { name: "copia-actului-de-proprietate.pdf", size: "1.8 MB" },
      { name: "planul-incaperilor", size: "1.8 MB" },
      { name: `Extras Registru de Stat - ”${row.companie || applicantName}”`, system: true, issuedAt: formatDate(row.dataDepunerii), issuer: "ASP" },
      { name: "planul-incaperilor-etajului-subsol", size: "1.8 MB" }
    ];

    return `
      <div class="e-permits-dosar-profil__details-grid">
        ${renderInfoCard("Date solicitant", [
          ["Nume complet", escapeHtml(applicantName)],
          [applicantIdLabel, renderProfileCopyCode(applicantId, `Copiază ${applicantIdLabel} ${applicantId}`)]
        ])}
        ${renderInfoCard("Date reprezentant", [
          ["Nume complet", escapeHtml(representativeName)],
          ["IDNP", renderProfileCopyCode(representativeId, `Copiază IDNP ${representativeId}`)]
        ])}
      </div>
      ${profile.representative?.type === "mpower" ? renderInfoCard("Împuternicire MPower aplicată", [
        ["Acordată de", escapeHtml(applicantName)],
        ["Valabilă până la", escapeHtml(formatDate(profile.representative.valabilaPanaLa))],
        ["Cod împuternicire", renderProfileCopyCode(profile.representative.numar, `Copiază ${profile.representative.numar}`)]
      ]) : ""}
      ${renderInfoCard("Date de contact pentru notificări", [
        ["Nume complet", escapeHtml(row.numeSolicitant)],
        ["Telefon", "+37322000000"],
        ["Email", escapeHtml(email)]
      ])}
      <section class="e-permits-dosar-profil__section e-permits-dosar-profil__section--files">
        <h2 class="e-permits-dosar-profil__section-title">Documente însoțitoare</h2>
        <div class="e-permits-dosar-profil__files">${files.map(renderProfileFile).join("")}</div>
      </section>
      ${renderInfoCard("Livrarea", [
        ["Modalitate implicită", "Ridicare de la ghișeu"],
        ["Modalitate selectată", escapeHtml(deliverySelected)],
        ["Cost", escapeHtml(deliveryCost)],
        ["Adresa de livrare", "mun. Chișinău, str. Alba Iulia 20"]
      ])}
    `;
  };

  /* Dosar tabs as the passport's stacked lists (renderStackedList): a section heading
     with a short meta, grouped rows — title + status tags, a dot-separated meta line,
     and the row's action on the right */
  const sumMdl = (items) => `${items.reduce((sum, item) => sum + Number(item.suma || 0), 0).toLocaleString("ro-MD")} MDL`;

  const renderDosarProfilTaxe = (row) => {
    const profile = buildDosarProfile(row);
    const paid = profile.taxe.filter((taxa) => taxa.status !== "neachitat");
    const items = profile.taxe.map((taxa) => {
      const pending = taxa.status === "neachitat";
      return {
        group: pending ? "În așteptare" : "Achitate",
        plainTitle: taxa.denumire,
        title: escapeHtml(taxa.denumire),
        badges: [pending ? renderTag("Neachitat", "warning") : renderTag("Achitat", "success")],
        meta: [
          `<strong>${escapeHtml(String(taxa.suma))} MDL</strong>`,
          renderCopyCode(taxa.id, `Copiază ${taxa.id}`),
          `Emisă ${escapeHtml(formatDate(taxa.emitere))}`,
          pending
            ? `Termen ${escapeHtml(formatDate(taxa.termen))}${renderDeadlineMeta(taxa.termen)}`
            : `Achitată ${escapeHtml(formatDate(taxa.achitare || taxa.termen))}`
        ],
        rowAttrs: `data-dosar-detail-row="taxe|${escapeHtml(taxa.id)}"`,
        action: { label: "Detalii", attrs: `data-dosar-detail="taxe|${escapeHtml(taxa.id)}" aria-label="Detalii: ${escapeHtml(taxa.denumire)}"` }
      };
    });

    return renderStackedList("Taxe și plăți", groupBy(items, (item) => item.group, ["În așteptare", "Achitate"]), {
      meta: `Total ${sumMdl(profile.taxe)} · achitat ${sumMdl(paid)}`,
      empty: "Dosarul nu are taxe."
    });
  };

  const renderDosarProfilAvize = (row) => {
    const profile = buildDosarProfile(row);
    const states = {
      inLucru: ["În lucru", "warning", "Active"],
      expirat: ["Termen depășit", "danger", "Termen depășit"],
      favorabil: ["Finalizat", "success", "Finalizate"]
    };
    const items = profile.avize.map((aviz) => {
      const [label, tone, group] = states[aviz.status] || states.favorabil;
      return {
        group,
        plainTitle: aviz.institutie,
        title: escapeHtml(aviz.institutie),
        badges: [renderTag(label, tone)],
        meta: [
          renderCopyCode(aviz.id, `Copiază ${aviz.id}`),
          `Solicitat ${escapeHtml(aviz.solicitatLa)}`,
          `Termen ${escapeHtml(aviz.termen)}`,
          `Rezultat: ${escapeHtml(aviz.rezultat)}`
        ],
        rowAttrs: `data-dosar-detail-row="avize|${escapeHtml(aviz.id)}"`,
        action: { label: "Detalii", attrs: `data-dosar-detail="avize|${escapeHtml(aviz.id)}" aria-label="Detalii: ${escapeHtml(aviz.institutie)}"` }
      };
    });

    return renderStackedList("Avize", groupBy(items, (item) => item.group, ["Active", "Termen depășit", "Finalizate"]), {
      meta: plural(profile.avize.length, "aviz solicitat", "avize solicitate"),
      empty: "Nu au fost solicitate avize."
    });
  };

  const renderDosarProfilDecizie = (row) => {
    const profile = buildDosarProfile(row);
    const items = profile.acte.map((act, index) => ({
      plainTitle: act.titlu,
      title: escapeHtml(act.titlu),
      badges: [renderTag(/respingere/i.test(act.titlu) ? "Respingere" : "Aprobare", /respingere/i.test(act.titlu) ? "danger" : "success")],
      meta: [`Emis ${escapeHtml(act.emis)}`, escapeHtml(act.sursa)],
      rowAttrs: `data-dosar-detail-row="acte|${index}"`,
      action: { label: "Detalii", attrs: `data-dosar-detail="acte|${index}" aria-label="Detalii: ${escapeHtml(act.titlu)}"` }
    }));

    return renderStackedList("Acte și decizii", [{ label: "", items }], { empty: "Nu există acte sau decizii emise." });
  };

  const renderDosarProfilDocumente = (row) => {
    const profile = buildDosarProfile(row);
    const items = profile.documente.map((document, index) => ({
      plainTitle: document.nume,
      title: escapeHtml(document.nume),
      badges: [renderTag(document.tip || "PDF", "neutral")],
      meta: [`Emis ${escapeHtml(document.data)}`, escapeHtml(document.autor)],
      rowAttrs: `data-dosar-detail-row="documente|${index}"`,
      action: { label: "Detalii", attrs: `data-dosar-detail="documente|${index}" aria-label="Detalii: ${escapeHtml(document.nume)}"` }
    }));

    return renderStackedList("Documente generate", [{ label: "", items }], {
      meta: "Generate în timpul examinării",
      empty: "Nu există documente generate."
    });
  };

  const renderDosarProfilNotificari = (row) => {
    const profile = buildDosarProfile(row);
    const items = profile.notificari.map((item) => ({
      group: item.canal,
      plainTitle: item.eveniment,
      title: escapeHtml(item.eveniment),
      badges: [item.status === "esuata" ? renderTag("Livrare eșuată", "danger") : renderTag("Livrată", "success")],
      meta: [escapeHtml(item.destinatar), `Trimisă ${escapeHtml(item.trimisaLa)}`]
    }));

    return renderStackedList("Notificări", groupBy(items, (item) => item.group), {
      meta: plural(profile.notificari.length, "notificare trimisă", "notificări trimise"),
      empty: "Nu au fost trimise notificări."
    });
  };

  const renderDosarProfilSection = (row) => {
    switch (dosarProfilState.tabKey) {
      case "solicitare":
        return renderDosarProfilSolicitare(row);
      case "taxe":
        return renderDosarProfilTaxe(row);
      case "avize":
        return renderDosarProfilAvize(row);
      case "decizie":
        return renderDosarProfilDecizie(row);
      case "documente":
        return renderDosarProfilDocumente(row);
      case "notificari":
        return renderDosarProfilNotificari(row);
      case "jurnal":
        return renderEventTimeline("Jurnalul activităților", caseFlowOf(row)?.state.log || [], { meta: "Jurnalizat prin MLog", empty: "Nu există activități înregistrate." });
      case "general":
      default:
        return renderDosarProfilGeneral(row);
    }
  };

  /* ---- Dosar: detail modal for a payment, approval, act or generated document ----
     Figma GEAP 2.0 8912:54211 "Notă de plată": title + subtitle, a "Date generale"
     card of label/value rows, the grey "Doar citire" note, Descarcă · Închide. */
  const dosarDetailModal = document.querySelector("#dosar-detail-modal");
  const dosarDetailFile = { name: "", text: "" };
  const renderReadOnlyNote = () => `
    <div class="info-box info-box--neutral e-permits-info-note e-permits-readonly-note">
      <span class="info-box__icon"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-lock"></use></svg></span>
      <div class="info-box__content"><p>Doar citire</p></div>
    </div>`;
  const openDosarDetail = (kind, key) => {
    dosarDetailAfterClose = null;
    const row = getDosarById(dosarProfilState.rowId);
    if (!row || !dosarDetailModal) return;
    const profile = buildDosarProfile(row);
    const dash = '<span class="e-permits-workplace__dash">—</span>';
    const today = workplaceDb.today;
    let title = "", subtitle = "", rows = [], file = "";
    if (kind === "taxe") {
      const t = profile.taxe.find((x) => x.id === key); if (!t) return;
      const paid = t.status !== "neachitat";
      const expired = !paid && t.termen < today;
      title = "Notă de plată"; subtitle = t.denumire;
      rows = [
        ["Număr cont", renderCopyCode(t.id, `Copiază ${t.id}`)],
        ["Denumirea", escapeHtml(t.denumire)],
        ["Suma", `${escapeHtml(String(t.suma))} MDL`],
        ["Statutul", paid ? renderTag("Achitat", "success") : expired ? renderTag("Expirat", "danger") : renderTag("Neachitat", "warning")],
        ["Data emiterii", escapeHtml(formatLongDate(t.emitere))],
        ["Termen de plată", escapeHtml(formatLongDate(t.termen))],
        ["Data achitării", paid && t.achitare ? escapeHtml(formatLongDate(t.achitare)) : dash],
        ["Metoda de plată", paid ? "MPay · card bancar" : dash],
        ["Număr dosar", escapeHtml(row.nrDosar)]
      ];
      file = `nota-de-plata-${t.id}`;
    } else if (kind === "avize") {
      const a = profile.avize.find((x) => x.id === key); if (!a) return;
      const states = { inLucru: ["În lucru", "warning"], expirat: ["Termen depășit", "danger"], favorabil: ["Finalizat", "success"] };
      const [label, tone] = states[a.status] || states.favorabil;
      title = "Aviz"; subtitle = a.institutie;
      rows = [
        ["Număr aviz", renderCopyCode(a.id, `Copiază ${a.id}`)],
        ["Instituția avizatoare", escapeHtml(a.institutie)],
        ["Statutul", renderTag(label, tone)],
        ["Solicitat la", escapeHtml(a.solicitatLa)],
        ["Solicitat de", escapeHtml(row.specialist?.nume || "—")],
        ["Termen de răspuns", escapeHtml(a.termen)],
        ["Rezultat", a.rezultat && a.rezultat !== "—" ? renderTag(a.rezultat, a.rezultat === "Pozitiv" ? "success" : "danger") : dash],
        ["Număr dosar", escapeHtml(row.nrDosar)]
      ];
      file = a.status === "favorabil" ? `aviz-${a.id}` : "";
    } else if (kind === "acte" || kind === "documente") {
      const list = kind === "acte" ? profile.acte : profile.documente;
      const d = list[Number(key)]; if (!d) return;
      const name = kind === "acte" ? d.titlu : d.nume;
      const rejectedAct = /respingere/i.test(name);
      title = kind === "acte" ? (rejectedAct ? "Decizie" : "Act permisiv") : "Document";
      subtitle = name;
      rows = kind === "acte" ? [
        ["Denumirea", escapeHtml(name)],
        ["Tipul", renderTag(rejectedAct ? "Respingere" : "Aprobare", rejectedAct ? "danger" : "success")],
        ...(row.nrActEmis && !rejectedAct ? [["Număr act", renderCopyCode(row.nrActEmis, `Copiază ${row.nrActEmis}`)]] : []),
        ["Emis la", escapeHtml(d.emis)],
        ["Emitent", escapeHtml(workplaceDb.myAutoritate)],
        ["Registru", escapeHtml(d.sursa)],
        ["Semnat electronic", row.dataSemnarii ? "Da · MSign" : "Nu — proiect"],
        ["Număr dosar", escapeHtml(row.nrDosar)]
      ] : [
        ["Denumirea", escapeHtml(name)],
        ["Format", renderTag(d.tip || "PDF", "neutral")],
        ["Emis la", escapeHtml(d.data)],
        ["Autor / emitent", escapeHtml(d.autor)],
        ["Dimensiune", `${(0.2 + (hashValue(name + row.id) % 18) / 10).toFixed(1)} MB`],
        ["Număr dosar", escapeHtml(row.nrDosar)]
      ];
      file = clasSnake(name) || "document";
    } else return;
    dosarDetailModal.querySelector("[data-dosar-detail-title]").textContent = title;
    dosarDetailModal.querySelector("[data-dosar-detail-subtitle]").textContent = subtitle;
    dosarDetailModal.querySelector("[data-dosar-detail-body]").innerHTML = `
      ${renderInfoCard("Date generale", rows)}
      ${renderReadOnlyNote()}`;
    dosarDetailFile.name = file;
    dosarDetailFile.text = [title, subtitle, "", ...rows.map(([label, html]) => { const tmp = document.createElement("div"); tmp.innerHTML = html; return `${label}: ${tmp.textContent.replace(/\s*Copiază\s*$/, "").trim() || "—"}`; })].join("\n");
    dosarDetailModal.querySelector("[data-dosar-detail-buttons]").innerHTML = `
      ${file ? '<button class="btn btn-neutral btn-rounded" type="button" data-dosar-detail-download><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-download"></use></svg><span>Descarcă</span></button>' : ""}
      <button class="btn btn-primary btn-rounded" type="button" data-dosar-detail-close>Închide</button>`;
    window.__modal?.open?.("#dosar-detail-modal");
  };
  /* a one-shot action after the modal closes (any way: button, ×, overlay, Esc) */
  let dosarDetailAfterClose = null;
  if (dosarDetailModal) {
    new MutationObserver(() => {
      if (dosarDetailModal.getAttribute("aria-hidden") === "true" && dosarDetailAfterClose) { const run = dosarDetailAfterClose; dosarDetailAfterClose = null; run(); }
    }).observe(dosarDetailModal, { attributes: true, attributeFilter: ["aria-hidden"] });
  }

  /* informative modal after fees are set: what was created, the case's new status and
     step; closing lands on Taxe și plăți */
  const openFeesCreatedModal = (row, fees, stepName) => {
    if (!dosarDetailModal) return;
    const status = workplaceDb.statuses[row.status];
    const total = fees.reduce((sum, fee) => sum + Number(fee.suma || 0), 0);
    dosarDetailModal.querySelector("[data-dosar-detail-title]").textContent = fees.length === 1 ? "Taxă generată" : `${fees.length} taxe generate`;
    dosarDetailModal.querySelector("[data-dosar-detail-subtitle]").textContent = `Dosarul ${row.nrDosar}`;
    dosarDetailModal.querySelector("[data-dosar-detail-body]").innerHTML = `
      ${renderNotice("success", "Nota de plată a fost emisă în MPay. Solicitantul a fost notificat prin e-mail și MNotify că are de achitat.")}
      <section class="e-permits-dosar-profil__section">
        <h2 class="e-permits-dosar-profil__section-title">Ce s-a generat</h2>
        ${renderSumList(`<ul class="e-permits-case-form__fees" role="list">
          ${fees.map((fee) => `
            <li class="e-permits-case-form__fee">
              <span class="e-permits-case-form__fee-copy">
                <span class="e-permits-case-form__fee-name">${escapeHtml(fee.denumire)}</span>
                <span class="e-permits-case-form__fee-meta">${escapeHtml(fee.id)} · termen de plată ${escapeHtml(formatLongDate(fee.termen))}</span>
              </span>
              <span class="e-permits-case-form__fee-amount">${escapeHtml(String(fee.suma))} ${escapeHtml(fee.currency)}</span>
            </li>`).join("")}
        </ul>`, `${total.toLocaleString("ro-MD")} MDL`)}
      </section>
      ${renderInfoCard("Dosarul acum", [
        ["Statutul dosarului", renderTag(status?.label || row.status, status?.tone || "neutral")],
        ["Pas curent", escapeHtml(stepName)],
        ["Statutul taxelor", renderTag("Neachitat", "warning")]
      ])}
      ${renderInfoNote("Dosarul continuă după ce solicitantul achită. Plata o urmărești în <strong>Taxe și plăți</strong>, iar mesajele trimise în <strong>Notificări</strong>.")}`;
    dosarDetailModal.querySelector("[data-dosar-detail-buttons]").innerHTML = '<button class="btn btn-primary btn-rounded" type="button" data-dosar-detail-close>Închide</button>';
    dosarDetailAfterClose = () => {
      if (dosarProfilState.rowId !== row.id) return;
      const tab = document.querySelector('[data-dosar-tab="taxe"]');
      if (tab) tab.click();
    };
    window.__modal?.open?.("#dosar-detail-modal");
  };

  dosarDetailModal?.addEventListener("click", (event) => {
    if (event.target.closest("[data-dosar-detail-close]")) { window.__modal?.close?.("#dosar-detail-modal"); return; }
    if (!event.target.closest("[data-dosar-detail-download]")) return;
    const blob = new Blob([`﻿${dosarDetailFile.text}\n`], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${dosarDetailFile.name}.txt`; link.click(); URL.revokeObjectURL(link.href);
  });
  dosarProfilPanelBody?.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-dosar-detail]") || (!event.target.closest("button, a, input, label") && event.target.closest(".e-permits-stack__item[data-dosar-detail-row]"));
    if (!trigger) return;
    const [kind, key] = (trigger.dataset.dosarDetail || trigger.dataset.dosarDetailRow).split("|");
    openDosarDetail(kind, key);
  });

  const renderDosarProfilPanelBody = (row) => {
    if (!dosarProfilPanelBody || !row) {
      return;
    }

    dosarProfilPanelBody.id = `dosar-panel-${dosarProfilState.tabKey}`;
    dosarProfilPanelBody.setAttribute("role", "tabpanel");
    dosarProfilPanelBody.setAttribute("aria-labelledby", `dosar-tab-${dosarProfilState.tabKey}`);
    dosarProfilPanelBody.innerHTML = renderDosarProfilSection(row);
  };

  /* ---- Dosar: process actions (core/case-flow.js) ---------------------------
     "Case (Dosar) logic and actions": the case rests on a BPMN node (stateId); the
     header button names that step (US name) and opens what the current role may do
     there. Status (statusId, 5 values) is derived. */
  const caseFlow = window.GEAP?.caseFlow || null;
  const ENGINE_ROLES = { specialist: "specialist", supervisor: "supervizor", director: "director", "central-admin": "adm-c", "local-admin": "adm-l", expert: "expert", "operator-ghiseu": "operator-ghiseu" };
  const currentEngineRole = () => ENGINE_ROLES[getRoleAssignments().find((assignment) => assignment.id === activeAssignmentId)?.roleId] || "specialist";

  const personFromName = (name) => ({
    nume: name,
    initiale: String(name).split(/\s+/).map((part) => part[0] || "").join("").slice(0, 2).toUpperCase(),
    color: "#0058D2"
  });

  /* the journal a case starts with (US-104), newest first */
  const seedCaseLog = (row) => {
    const log = [{
      at: `${row.dataDepunerii}T09:00:00`,
      user: row.sursa === "FO" ? (row.companie || row.numeSolicitant) : "Specialist ghișeu",
      type: "Dosar depus",
      status: "Reușit",
      detail: row.sursa === "FO" ? "Depus prin Front Office." : "Înregistrat la ghișeu."
    }];
    if (row.specialist) {
      log.unshift({ at: `${row.dataDepunerii}T11:30:00`, user: row.repartizatDe?.nume || "", type: "Dosar distribuit", status: "Reușit", detail: `Repartizat către ${row.specialist.nume}.` });
    }
    return log;
  };

  /* a case's process state, created on first use. The flow is a property of the
     service; the guard variables come from the service passport, except
     SecondaryApproval, which follows the processing subdivision (US-113). */
  const caseFlowOf = (row) => {
    if (!caseFlow || !row || row.sursa === "OFICIU" || row.status === "schita") {
      return null;
    }

    if (!row.flowState) {
      const serviceHash = hashValue(row.serviciu);
      const flow = caseFlow.getFlow(serviceHash % 3 === 0 ? "simplified" : "complex");
      const vars = {
        IsAutoDistribution: false,
        SuspensionWithCoordination: serviceHash % 2 === 0,
        WithExpertise: false,
        IsPaperPermit: serviceHash % 5 === 0,
        SecondaryApproval: row.subdiviziune !== (dossierDb?.mySubdiviziune || "")
      };
      const init = caseFlow.initialState(flow, row.status, {
        hasSpecialist: Boolean(row.specialist) && !row.nedistribuit,
        suspended: row.alerte.includes("suspendat"),
        vars
      });

      if (!init) {
        return null;
      }

      /* visited: the human steps this case has passed through (for "Vezi fluxul") */
      const visited = [
        ...(row.specialist && !vars.IsAutoDistribution ? ["node5"] : []),
        ...(["spreCoordonare", "spreSemnare", "semnat", "eliberat", "respins", "arhivat"].includes(row.status) ? ["node6", row.decizia === "respingere" ? "node14" : "node17"] : []),
        ...(row.status === "spreSemnare" && flow.nodes.RecordState2 ? ["RecordState2"] : [])
      ];
      row.flowState = { flowId: flow.id, vars, ...init, visited, decision: row.decizia === "respingere" ? "respingere" : null, log: seedCaseLog(row) };
    }

    return { flow: caseFlow.getFlow(row.flowState.flowId), state: row.flowState };
  };

  const caseBlockers = (row) => {
    const profile = buildDosarProfile(row);
    return {
      pendingFees: profile.taxe.filter((taxa) => taxa.status === "neachitat").length,
      activeReviews: profile.avize.filter((aviz) => aviz.status === "inLucru").length
    };
  };

  /* statusId; a manual fee addition at "Verificarea datelor" shows Plată suplimentară (US-117) */
  const casePublicStatus = (row) => {
    const cf = caseFlowOf(row);
    if (!cf) return null;
    const id = cf.state.stateId === "node6" && !cf.state.suspended && row.flowState.manualFee && caseBlockers(row).pendingFees
      ? 4
      : caseFlow.statusId(cf.flow, cf.state);
    return { id, label: caseFlow.STATUS[id] };
  };

  const caseAvailable = (row) => {
    const cf = caseFlowOf(row);
    if (!cf) return null;
    const blockers = caseBlockers(row);
    const avail = caseFlow.available(cf.flow, cf.state, { role: currentEngineRole(), vars: cf.state.vars, ...blockers });
    /* the Asistent tehnic has no back-office role in this prototype: its automatic step
       (US-156, nothing editable) gets a demo stand-in so the case can move on */
    const lane = caseFlow.laneOf(cf.flow, cf.state.stateId);
    if (lane?.role === "asistent-tehnic" && !avail.items.length) {
      const t = avail.step.transitions[0];
      avail.items.push({ id: t.id, label: `Simulează: ${t.label}`, kind: "advance", icon: t.icon, form: avail.step.form, demo: true, target: "Achitare notă de plată (MPay) · Solicitant" });
    }
    /* prototype stand-ins for the applicant paying and the institutions answering, so a
       blocked case can be moved on in the demo */
    if (cf.state.stateId === "node6" && avail.items.length && !cf.state.suspended) {
      if (blockers.pendingFees) avail.items.push({ id: "demoAchitaTaxe", label: "Simulează achitarea taxelor", kind: "operation", icon: "receipt-check", demo: true, target: `${blockers.pendingFees} ${blockers.pendingFees === 1 ? "taxă în așteptare" : "taxe în așteptare"}` });
      if (blockers.activeReviews) avail.items.push({ id: "demoFinalizeazaAvize", label: "Simulează răspunsul la avize", kind: "operation", icon: "check-all", demo: true, target: `${blockers.activeReviews} ${blockers.activeReviews === 1 ? "aviz activ" : "avize active"}` });
    }
    return { ...cf, avail };
  };

  /* the header action: the current step's name on the library btn-primary btn-md (Figma
     6675:158399), opening the stack-menu component with the role's actions */
  const renderCaseActions = (row) => {
    const ctx = caseAvailable(row);
    if (!ctx) return "";
    const { avail, state } = ctx;
    const finished = state.stateId === "end";
    const label = finished ? "Dosar finalizat" : avail.step.name;

    return `
      <div class="e-permits-stack__menu-wrap e-permits-case-actions">
        <button class="btn btn-primary btn-md e-permits-case-actions__trigger" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="case-actions-menu" data-stack-menu-trigger>
          <span>${escapeHtml(label)}</span>
          <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
        </button>
        <ul class="e-permits-fo-intent-menu e-permits-stack__menu e-permits-case-actions__menu" id="case-actions-menu" role="menu" aria-label="Acțiuni: ${escapeHtml(label)}" hidden data-stack-menu>
          ${avail.items.map((item, index) => `
            ${index && item.kind === "operation" && avail.items[index - 1].kind !== "operation" ? '<li role="separator" class="e-permits-case-actions__separator"></li>' : ""}
            <li role="none">
              <button class="e-permits-fo-intent-menu__item e-permits-case-actions__item" type="button" role="menuitem" data-case-action="${escapeHtml(item.id)}"${item.disabled ? ' aria-disabled="true"' : ""}>
                <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${escapeHtml(item.icon || "checkmark-large")}"></use></svg>
                <span class="e-permits-case-actions__copy">
                  <span class="e-permits-case-actions__label">${escapeHtml(item.label)}${item.demo ? renderTag("Demo", "neutral") : ""}</span>
                  <span class="e-permits-case-actions__hint">${escapeHtml(item.disabled ? item.reason : item.kind === "return" ? `Înapoi la: ${item.target}` : item.target)}</span>
                </span>
              </button>
            </li>
          `).join("")}
          ${avail.note ? `<li role="none" class="e-permits-case-actions__note">${escapeHtml(avail.note)}</li>` : ""}
          <li role="separator" class="e-permits-case-actions__separator"></li>
          <li role="none">
            <button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" data-case-flow-view>
              <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-tree"></use></svg>
              <span>Vezi fluxul</span>
            </button>
          </li>
        </ul>
      </div>
    `;
  };

  const caseActionCaption = (row) => {
    const ctx = caseFlowOf(row);
    if (!ctx || ctx.state.stateId === "end") return "";
    const lane = caseFlow.laneOf(ctx.flow, ctx.state.stateId);
    return lane ? `Responsabil: ${lane.title}` : "";
  };

  /* ---- the step form (§12): the current node's form, else the target's. Short forms,
     so the simple library modal; "Vezi fluxul" keeps the right drawer ---- */
  const caseModal = document.querySelector("#case-action-modal");
  const caseModalBody = caseModal?.querySelector("[data-case-modal-body]");
  const caseDrawer = document.querySelector("[data-case-drawer]");
  const caseDrawerBody = caseDrawer?.querySelector("[data-case-body]");
  let caseDraft = null;
  let caseReturnFocus = null;
  const CASE_TEXT_MAX = 5000;

  const caseFieldError = (key) => caseDraft.errors[key] ? `
    <span class="message message--inline message--error e-permits-fo-field__error">
      <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-error-filled"></use></svg>
      <span>${escapeHtml(caseDraft.errors[key])}</span>
    </span>
  ` : "";

  const caseReadonly = (label, value, span = 6) => `
    <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
      <label>${escapeHtml(label)}</label>
      <div class="e-permits-fo-input is-filled is-readonly">
        <input type="text" value="${escapeHtml(value || "—")}" readonly tabindex="-1">
        <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-lock"></use></svg>
      </div>
    </div>
  `;

  const caseTextarea = (key, label, { required = false, hint = "" } = {}) => {
    const value = caseDraft.values[key] || "";
    return `
      <div class="e-permits-fo-field e-permits-user-create__field">
        <label for="case-${key}">${escapeHtml(label)}${required ? requiredMark() : ""}</label>
        <div class="e-permits-fo-textarea${caseDraft.errors[key] ? " is-error" : ""}">
          <textarea id="case-${key}" rows="4" maxlength="${CASE_TEXT_MAX}" data-case-field="${key}">${escapeHtml(value)}</textarea>
        </div>
        ${caseFieldError(key)}
        <p class="e-permits-fo-field__hint">${hint ? `${escapeHtml(hint)} · ` : ""}<span data-case-count="${key}">${value.length}</span>/${CASE_TEXT_MAX}</p>
      </div>
    `;
  };

  const caseInput = (key, label, { required = false, numeric = false, hint = "", span = 12 } = {}) => `
    <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
      <label for="case-${key}">${escapeHtml(label)}${required ? requiredMark() : ""}</label>
      <div class="e-permits-fo-input${caseDraft.errors[key] ? " is-error" : ""}">
        <input id="case-${key}" type="text"${numeric ? ' inputmode="numeric"' : ""} value="${escapeHtml(caseDraft.values[key] || "")}" data-case-field="${key}" autocomplete="off">
      </div>
      ${caseFieldError(key)}
      ${hint && !caseDraft.errors[key] ? `<p class="e-permits-fo-field__hint">${escapeHtml(hint)}</p>` : ""}
    </div>
  `;

  const caseSelect = (key, label, options, { required = false, placeholder = "Alege", hint = "" } = {}) => `
    <div class="e-permits-fo-field e-permits-user-create__field">
      <label for="case-${key}">${escapeHtml(label)}${required ? requiredMark() : ""}</label>
      ${renderFoSelectControl({
        id: `case-${key}`, attrs: `data-case-select="${key}"`,
        optionsHtml: `<option value=""${caseDraft.values[key] ? "" : " selected"} disabled>${escapeHtml(placeholder)}</option>${options.map(([value, text]) => `<option value="${escapeHtml(value)}"${value === caseDraft.values[key] ? " selected" : ""}>${escapeHtml(text)}</option>`).join("")}`
      })}
      ${caseFieldError(key)}
      ${hint && !caseDraft.errors[key] ? `<p class="e-permits-fo-field__hint">${escapeHtml(hint)}</p>` : ""}
    </div>
  `;

  /* library date picker in the full-flow field shell (as the tariff drawer) */
  const caseDate = (key, label, { required = false, span = 6, hint = "" } = {}) => {
    const iso = caseDraft.values[key] || "";
    const [y, m, day] = iso ? iso.split("-") : [];
    const today = localIsoNow().slice(0, 10);
    const view = (iso || today).split("-");
    const id = `case-${key}`;
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
        <label for="${id}">${escapeHtml(label)}${required ? requiredMark() : ""}</label>
        <div class="date-picker__field" data-date-picker data-type="default" data-locale="ro" data-selected="${escapeHtml(iso)}" data-today="${today}" data-year="${Number(view[0])}" data-month="${Number(view[1]) - 1}" data-case-date="${key}">
          <div class="e-permits-fo-input e-permits-fo-input--with-action${caseDraft.errors[key] ? " is-error" : ""}">
            <input id="${id}" type="text" class="js-date-picker-input" value="${iso ? `${day}/${m}/${y}` : ""}" placeholder="ZZ/LL/AAAA" autocomplete="off">
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
        ${caseFieldError(key)}
        ${hint && !caseDraft.errors[key] ? `<p class="e-permits-fo-field__hint">${escapeHtml(hint)}</p>` : ""}
      </div>
    `;
  };

  const caseNotice = (text, tone = "info") => `
    <div class="message message--subtle banner--${tone} e-permits-case-form__notice">
      <span class="banner__icon"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-info-filled"></use></svg></span>
      <div class="banner__content"><p class="banner__text">${text}</p></div>
    </div>
  `;

  /* US-117: the fees come from the service passport; nothing is typed */
  const caseFeeOptions = () => {
    const accounts = (servicesStore?.bankAccounts || []).filter((account) => account.active);
    const principal = accounts.find((account) => account.principal) || accounts[0];
    return (servicesStore?.tariffs || [])
      .filter((tariff) => tariff.state === "Publicat" && tariff.active && !tariff.formula)
      .slice(0, 6)
      .map((tariff) => ({ id: tariff.id, denumire: tariff.name, suma: Number(tariff.amount) || 0, currency: tariff.currency || "MDL", iban: tariff.iban || principal?.iban || "—" }));
  };

  const caseSpecialists = () => {
    const rows = dossierDb?.runtimeRows || [];
    return (dossierDb?.specialisti || []).map((person) => ({
      ...person,
      load: rows.filter((row) => row.specialist?.id === person.id && !["semnat", "eliberat", "respins", "arhivat"].includes(row.status)).length
    }));
  };

  const CASE_REVIEW_INSTITUTIONS = ["Agenția Națională pentru Siguranța Alimentelor", "Inspectoratul General pentru Situații de Urgență", "Agenția de Mediu", "Inspectoratul de Stat în Construcții"];

  const renderCaseForm = (row) => {
    const d = caseDraft;
    const applicant = row.companie || row.numeSolicitant || "—";
    switch (d.form) {
      case "distribuire":
        return `
          <div class="e-permits-user-create__grid">
            ${caseReadonly("Numărul dosarului", row.nrDosar)}
            ${caseReadonly("Data depunerii", formatDate(row.dataDepunerii))}
            ${caseReadonly("Serviciul", row.serviciu, 12)}
            ${caseReadonly("Solicitant", applicant)}
            ${caseReadonly("Termenul de examinare", formatDate(row.termenExaminare))}
          </div>
          ${caseSelect("specialist", "Specialist", caseSpecialists().map((person) => [person.id, `${person.nume} · ${person.load} ${person.load === 1 ? "dosar" : "dosare"} în lucru`]), { required: true, placeholder: "Alege specialistul", hint: "Numărul de dosare în lucru ajută la o repartizare echilibrată." })}
          ${caseTextarea("instructiuni", "Instrucțiuni", { required: true })}
        `;
      case "decizie":
        return `
          <div class="e-permits-fo-field">
            <label id="case-decision-label">Rezultatul examinării${requiredMark()}</label>
            <div class="segmented-control" role="radiogroup" aria-labelledby="case-decision-label">
              ${[["aprobare", "Aprobare"], ["respingere", "Respingere"]].map(([value, text]) => `
                <button class="segment-item${d.values.choice === value ? " is-selected" : ""}" type="button" role="radio" aria-checked="${d.values.choice === value ? "true" : "false"}" data-case-choice="${value}">${text}</button>
              `).join("")}
            </div>
          </div>
          ${renderNextStep(d.values.choice === "respingere"
            ? "Crearea proiectului deciziei de respingere (US-121)"
            : "Setarea taxei (US-117), apoi proiectul actului permisiv (US-120)")}
        `;
      case "suspendare":
        return `
          ${caseNotice("Câmpuri deduse din titlul pasului BPMN „Indică motiv, setează termen”. US-126/127 nu au fost furnizate — de confirmat cu PO.", "warning")}
          ${caseTextarea("motiv", "Motivul suspendării", { required: true })}
          ${caseInput("zile", "Termenul suspendării (zile lucrătoare)", { required: true, numeric: true, hint: "Termenul de examinare se oprește pe durata suspendării." })}
          <p class="e-permits-case-form__lead">${row.flowState.vars.SuspensionWithCoordination
            ? "Varianta B: decizia de suspendare se semnează. Dosarul rămâne „În lucru” până la semnare."
            : "Varianta A: dosarul se suspendă imediat după confirmare."}</p>
        `;
      case "taxa": {
        const fees = caseFeeOptions();
        const chosen = fees.filter((fee) => (d.values.fees || []).includes(fee.id));
        const total = chosen.reduce((sum, fee) => sum + fee.suma, 0);
        return `
          <p class="e-permits-case-form__lead">Alege taxele configurate în pașaportul serviciului. Denumirea, suma, valuta și contul nu se editează.</p>
          ${renderSumList(`<ul class="e-permits-case-form__fees" role="list">
            ${fees.map((fee) => `
              <li>
                <!-- the whole row is the label; the library checkbox sits inside it -->
                <label class="e-permits-case-form__fee e-permits-case-form__fee--pick">
                  <span class="checkbox checkbox--medium">
                    <input class="checkbox-input" type="checkbox" value="${escapeHtml(fee.id)}" data-case-fee${(d.values.fees || []).includes(fee.id) ? " checked" : ""}>
                    <span class="checkbox-custom" aria-hidden="true"></span>
                  </span>
                  <span class="e-permits-case-form__fee-copy">
                    <span class="e-permits-case-form__fee-name">${escapeHtml(fee.denumire)}</span>
                    <span class="e-permits-case-form__fee-meta">Cont ${escapeHtml(fee.iban)}</span>
                  </span>
                  <span class="e-permits-case-form__fee-amount">${fee.suma} ${escapeHtml(fee.currency)}</span>
                </label>
              </li>
            `).join("")}
          </ul>`, `${total.toLocaleString("ro-MD")} MDL`)}
          ${caseFieldError("fees")}
        `;
      }
      case "nota": {
        const pending = buildDosarProfile(row).taxe.filter((taxa) => taxa.status === "neachitat");
        return `
          <p class="e-permits-case-form__lead">Nota de plată se generează automat din taxele setate. Niciun câmp nu este editabil (US-156).</p>
          <ul class="e-permits-case-form__fees" role="list">
            ${(pending.length ? pending : buildDosarProfile(row).taxe.slice(-1)).map((taxa) => `
              <li class="e-permits-case-form__fee">
                <span class="e-permits-case-form__fee-copy"><span class="e-permits-case-form__fee-name">${escapeHtml(taxa.denumire)}</span><span class="e-permits-case-form__fee-meta">${escapeHtml(taxa.id)}</span></span>
                <span class="e-permits-case-form__fee-amount">${taxa.suma} MDL</span>
              </li>
            `).join("")}
          </ul>
        `;
      }
      case "act":
        return `
          <div class="e-permits-user-create__grid">
            ${caseReadonly("Numărul dosarului", row.nrDosar)}
            ${caseReadonly("Tipul dosarului", row.tipDosar)}
            ${caseReadonly("Serviciul", row.serviciu, 12)}
            ${caseReadonly("Titular", applicant, 12)}
            ${caseDate("valabilDin", "Valabil din", { required: true })}
            ${caseDate("valabilPana", "Valabil până la", { hint: "Opțional — fără dată, actul este nelimitat." })}
          </div>
        `;
      case "respingere":
        return `
          ${caseTextarea("motiv", "Motivul refuzului", { required: true })}
          ${caseTextarea("temei", "Temei legal")}
          ${caseTextarea("recomandari", "Recomandări")}
        `;
      case "aviz":
        return `
          ${caseNotice("Câmpuri deduse — US-119 (Avize interinstituționale) nu a fost furnizat. De confirmat cu PO.", "warning")}
          ${caseSelect("institutie", "Instituția avizatoare", CASE_REVIEW_INSTITUTIONS.map((name) => [name, name]), { required: true, placeholder: "Alege instituția" })}
          ${caseTextarea("obiect", "Obiectul avizului", { required: true })}
          <p class="e-permits-case-form__lead">Dosarul rămâne la Specialist. „Dosar examinat” se blochează până la răspunsul instituției.</p>
        `;
      default:
        /* no form: one sentence, then where the case goes — back (return) or on */
        return `
          <p class="e-permits-case-form__lead">${escapeHtml(d.confirmText)}</p>
          ${d.kind === "return"
            ? renderNextStep(d.next, { label: "Se întoarce la", icon: "arrow-left" })
            : renderNextStep(d.next)}
        `;
    }
  };

  const renderCaseModal = () => {
    const row = getDosarById(caseDraft.rowId);
    caseModal.querySelector("[data-case-modal-title]").textContent = caseDraft.title;
    caseModal.querySelector("[data-case-modal-subtitle]").textContent = caseDraft.subtitle;
    caseModalBody.innerHTML = `
      <div class="e-permits-case-form">
        ${renderCaseForm(row)}
        ${caseDraft.form && caseDraft.form !== "decizie" ? renderNextStep(caseDraft.next) : ""}
      </div>
    `;
    caseModal.querySelector("[data-case-modal-footer]").innerHTML = `
      <div class="modal-buttons">
        <button class="btn btn-neutral btn-rounded" type="button" data-case-close>Anulează</button>
        <button class="btn ${caseDraft.kind === "return" ? "btn-neutral" : "btn-primary"} btn-rounded" type="button" data-case-submit>${escapeHtml(caseDraft.submitLabel)}</button>
      </div>
    `;
    window.GEAPDatePicker?.init(caseModalBody);
  };

  const openCaseAction = (row, actionId) => {
    const ctx = caseAvailable(row);
    const item = ctx?.avail.items.find((entry) => entry.id === actionId);

    if (!item || item.disabled || !caseModal) {
      return;
    }

    const quick = { demoAchitaTaxe: true, demoFinalizeazaAvize: true, reiaExaminarea: true };
    if (quick[actionId]) {
      applyCaseAction(row, item, {});
      return;
    }

    const today = localIsoNow().slice(0, 10);
    caseDraft = {
      rowId: row.id,
      actionId,
      kind: item.kind,
      form: item.kind === "return" ? null : item.form,
      /* a form of the current step is titled by the step (US name); a form of the
         next step (Suspendare termen at Verificarea datelor) by the action */
      title: item.kind !== "operation" && item.form && item.form === ctx.avail.step.form ? ctx.avail.step.name : item.label,
      subtitle: `${row.nrDosar} · ${row.serviciu}`,
      /* operations get a verb; transitions keep their US label */
      submitLabel: { taxaExaminare: "Adaugă taxele", aviz: "Solicită avizul" }[actionId] || item.label,
      next: item.kind === "operation" ? "" : item.target,
      confirmText: item.kind === "return"
        ? "Dosarul se întoarce la un pas anterior al fluxului."
        : `Confirmați acțiunea „${item.label}”.`,
      values: {
        instructiuni: "Spre examinare",
        choice: "aprobare",
        fees: [],
        valabilDin: today,
        ...(row.flowState.suspension && item.form === "suspendare" ? row.flowState.suspension : {})
      },
      errors: {}
    };
    renderCaseModal();
    window.__modal?.open?.("#case-action-modal");
    requestAnimationFrame(() => focusFormControl(caseModalBody.querySelector("[data-case-field], [data-case-select], [data-case-choice], [data-case-fee]") || caseModal.querySelector("[data-case-submit]")));
  };

  const closeCaseModal = () => {
    closeFoSelect();
    window.__modal?.close?.("#case-action-modal");
    caseDraft = null;
  };

  const closeCaseDrawer = () => {
    if (!caseDrawer || caseDrawer.hidden || caseDrawer.classList.contains("is-closing")) return;
    caseDrawer.classList.add("is-closing");
    window.setTimeout(() => {
      caseDrawer.hidden = true;
      caseDrawer.classList.remove("is-closing");
      document.body.classList.remove("is-user-create-open");
      caseReturnFocus?.focus?.();
    }, 120);
  };

  const validateCaseDraft = () => {
    const v = caseDraft.values;
    const errors = {};
    const need = (key, message) => { if (!String(v[key] || "").trim()) errors[key] = message; };
    switch (caseDraft.form) {
      case "distribuire": need("specialist", "Alege specialistul."); need("instructiuni", "Scrie instrucțiunile."); break;
      case "suspendare":
        need("motiv", "Indică motivul suspendării.");
        if (!/^\d+$/.test(String(v.zile || "")) || Number(v.zile) < 1) errors.zile = "Indică un număr de zile mai mare ca 0.";
        break;
      case "taxa": if (!(v.fees || []).length) errors.fees = "Alege cel puțin o taxă."; break;
      case "act":
        need("valabilDin", "Alege data de început.");
        if (v.valabilPana && v.valabilDin && v.valabilPana < v.valabilDin) errors.valabilPana = "Data de sfârșit este înaintea datei de început.";
        break;
      case "respingere": need("motiv", "Indică motivul refuzului."); break;
      case "aviz": need("institutie", "Alege instituția."); need("obiect", "Descrie obiectul avizului."); break;
      default: break;
    }
    caseDraft.errors = errors;
    return !Object.keys(errors).length;
  };

  /* apply: move the case (or run the operation), update the record and its journal */
  const applyCaseAction = (row, item, values) => {
    const ctx = caseFlowOf(row);
    const { flow, state } = ctx;
    const profile = buildDosarProfile(row);
    const me = currentUserName();
    const now = localIsoNow();
    const today = now.slice(0, 10);
    const stepName = flow.nodes[state.stateId]?.name || "";
    let detail = "";
    let createdFees = [];

    switch (item.id) {
      case "distribuie": {
        const person = (dossierDb?.specialisti || []).find((entry) => entry.id === values.specialist);
        row.specialist = person || row.specialist;
        row.repartizatDe = personFromName(me);
        row.nedistribuit = false;
        detail = `Repartizat către ${person?.nume || "—"}. Instrucțiuni: ${values.instructiuni}`;
        break;
      }
      case "taxaExaminare":
      case "confirmaTaxa": {
        const fees = caseFeeOptions().filter((fee) => values.fees.includes(fee.id));
        const base = 90000 + (hashValue(row.id + now) % 9000);
        /* fees live on the dossiers' clock (workplace "today"), so their deadline counts match */
        const feeDay = workplaceDb?.today || today;
        createdFees = fees.map((fee, index) => ({ id: `MPAY-${base + index}`, denumire: fee.denumire, suma: fee.suma, currency: fee.currency || "MDL", status: "neachitat", emitere: feeDay, termen: toIsoDate(addDays(parseIsoDate(feeDay), 5)), achitare: null }));
        createdFees.forEach(({ currency, ...taxa }) => profile.taxe.push(taxa));
        /* MPay issues the note; the citizen is told there is something to pay */
        const phone = "+373 60 000 000", mail = `${row.numeSolicitant.toLowerCase().replace(/\s+/g, ".")}@example.md`;
        profile.notificari.unshift(
          { canal: "MNotify", destinatar: phone, eveniment: "Notă de plată emisă — de achitat", trimisaLa: formatDateTime(feeDay, now.slice(11, 16)), status: "livrata" },
          { canal: "Email", destinatar: mail, eveniment: "Notă de plată emisă — de achitat", trimisaLa: formatDateTime(feeDay, now.slice(11, 16)), status: "livrata" }
        );
        if (item.id === "taxaExaminare") state.manualFee = true;
        detail = fees.map((fee) => `${fee.denumire} · ${fee.suma} ${fee.currency}`).join("; ");
        break;
      }
      case "aviz":
        profile.avize.push({ id: `AV-${String(hashValue(row.id + now) % 100000).padStart(5, "0")}`, institutie: values.institutie, solicitatLa: formatDate(today), termen: formatDate(toIsoDate(addDays(parseIsoDate(today), 10))), status: "inLucru", rezultat: "—" });
        if (!row.alerte.includes("inAvizare")) row.alerte.push("inAvizare");
        detail = `${values.institutie}: ${values.obiect}`;
        break;
      case "demoAchitaTaxe":
        profile.taxe.forEach((taxa) => { if (taxa.status === "neachitat") { taxa.status = "achitat"; taxa.achitare = today; } });
        row.alerte = row.alerte.filter((alert) => alert !== "neachitatTermen");
        state.manualFee = false;
        detail = "Toate taxele în așteptare au fost achitate (MPay).";
        break;
      case "demoFinalizeazaAvize":
        profile.avize.forEach((aviz) => { if (aviz.status === "inLucru") { aviz.status = "favorabil"; aviz.rezultat = "Pozitiv"; } });
        row.alerte = row.alerte.filter((alert) => !["inAvizare", "neavizatTermen"].includes(alert));
        detail = "Avizele active au primit răspuns favorabil.";
        break;
      case "suspendare":
      case "confirmaSuspendarea":
        state.suspension = { motiv: values.motiv, zile: values.zile };
        detail = `${values.motiv} · ${values.zile} zile`;
        break;
      case "dosarExaminat":
        detail = values.choice === "respingere" ? "Rezultat: respingere." : "Rezultat: aprobare.";
        break;
      case "inainteAct":
        state.act = { valabilDin: values.valabilDin, valabilPana: values.valabilPana || null };
        detail = `Valabil din ${formatDate(values.valabilDin)}${values.valabilPana ? ` până la ${formatDate(values.valabilPana)}` : ", nelimitat"}.`;
        break;
      case "inainteRespingere":
        state.rejection = { motiv: values.motiv, temei: values.temei, recomandari: values.recomandari };
        detail = values.motiv;
        break;
      default:
        break;
    }

    const next = caseFlow.apply(flow, state, item.id, { vars: state.vars, choice: values.choice });
    const wasSuspended = state.suspended;
    if (next.stateId !== state.stateId && !state.visited.includes(state.stateId)) state.visited.push(state.stateId);
    Object.assign(state, next);

    /* alerts follow the suspension (§11) */
    if (state.suspended && !wasSuspended) {
      row.alerte = [...row.alerte.filter((alert) => alert !== "dupaSuspendare"), "suspendat"];
    } else if (!state.suspended && wasSuspended) {
      row.alerte = [...row.alerte.filter((alert) => alert !== "suspendat"), "dupaSuspendare"];
      detail = detail || "Informațiile au fost completate; termenul de examinare a fost reluat.";
    }

    /* the registry keeps its coarse status in step with the resting node */
    row.status = caseFlow.listStatus(flow, state);
    if (["node14", "node17", "RecordState2", "node19", "node20"].includes(state.stateId)) row.decizia = "proiect";
    if (state.stateId === "end") {
      row.decizia = state.decision === "respingere" ? "respingere" : "aprobare";
      row.dataSemnarii = today;
      row.nrActEmis = row.decizia === "aprobare" ? `AUT-2026-${row.nrDosar.slice(-6)}` : null;
      profile.hasDecisionStage = true;
      profile.acte = [{ titlu: row.decizia === "respingere" ? "Decizie de respingere" : `Act permisiv ${row.nrActEmis}`, emis: formatDate(today), sursa: "ASP" }];
    }

    const landed = flow.nodes[state.stateId];
    state.log.unshift({
      at: now,
      user: item.id === "achitat" ? (row.companie || row.numeSolicitant) : me,
      type: item.kind === "operation" ? item.label : `${item.label} — ${stepName}`,
      status: "Reușit",
      detail: [detail, item.kind !== "operation" ? `Pas curent: ${state.suspended ? "dosar suspendat" : landed?.name || ""}.` : ""].filter(Boolean).join(" ")
    });

    renderDosarProfil(row);
    syncCaseRowInList(row);
    /* fees just generated: say exactly what was generated and that the citizen was
       notified, then land on Taxe și plăți */
    if (createdFees.length) { openFeesCreatedModal(row, createdFees, state.suspended ? "Dosar suspendat" : landed?.name || "—"); return; }
    showShellToast(item.kind === "operation" ? detail || item.label : `Pas curent: ${state.suspended ? "Dosar suspendat" : landed?.name || "—"}.`, "success", item.label);
  };

  /* the open registry shows the new status / alerts at once */
  const syncCaseRowInList = (row) => {
    if (workplacePanel && !workplacePanel.hidden && typeof renderWorkplace === "function") {
      renderWorkplace();
    }
  };

  const submitCaseDraft = () => {
    if (!caseDraft) return;
    if (!validateCaseDraft()) {
      renderCaseModal();
      focusFormControl(caseModalBody.querySelector(".is-error input, .is-error textarea, .e-permits-fo-select.is-error .e-permits-fo-select__button, [data-case-fee]"));
      return;
    }
    const row = getDosarById(caseDraft.rowId);
    const item = caseAvailable(row)?.avail.items.find((entry) => entry.id === caseDraft.actionId);
    const values = { ...caseDraft.values };
    closeCaseModal();
    if (item) applyCaseAction(row, item, values);
  };

  /* ---- Vezi fluxul: the flow's human steps, the current one marked ---- */
  const renderCaseFlowView = (row) => {
    const { flow, state } = caseFlowOf(row);
    const vars = state.vars;
    const yesNo = (value) => (value ? "Da" : "Nu");
    return `
      <div class="e-permits-case-form">
        ${renderInfoCard("Schema procesului", [
          ["Flux", escapeHtml(flow.name)],
          ["Pas curent", escapeHtml(state.stateId === "end" ? "Dosar finalizat" : `${flow.nodes[state.stateId].name}${state.suspended ? " (suspendat)" : ""}`)],
          ["Statut public", escapeHtml(casePublicStatus(row)?.label || "—")],
          ["Distribuire automată", yesNo(vars.IsAutoDistribution)],
          ["Suspendare cu semnare", yesNo(vars.SuspensionWithCoordination)],
          ["Aprobare secundară", `${yesNo(vars.SecondaryApproval)} <span class="e-permits-dosar-profil__termen-meta">din subdiviziunea de procesare</span>`],
          ["Eliberare pe hârtie", yesNo(vars.IsPaperPermit)]
        ])}
        <section class="e-permits-dosar-profil__section">
          <h2 class="e-permits-dosar-profil__section-title">Pașii umani</h2>
          <ol class="e-permits-timeline">
            ${flow.order.map((id) => {
              const node = flow.nodes[id];
              const lane = caseFlow.LANES[node.lane];
              const tone = id === state.stateId ? "pending" : state.visited.includes(id) ? "success" : "upcoming";
              return `
                <li class="e-permits-timeline__item e-permits-timeline__item--${tone}">
                  <span class="e-permits-timeline__rail" aria-hidden="true">
                    <span class="e-permits-timeline__marker">${tone === "upcoming" ? "" : `<svg class="icon"><use href="assets/icons/sprite.svg#icon-${tone === "pending" ? "time-filled" : "circle-checkmark-filled"}"></use></svg>`}</span>
                  </span>
                  <div class="e-permits-timeline__content">
                    <span class="e-permits-timeline__title">${escapeHtml(node.name)}${id === state.stateId ? renderTag("Pas curent", "info") : ""}</span>
                    <span class="e-permits-timeline__stamp">${escapeHtml(`${lane.title} · ${node.us} · BPMN: ${node.bpmn}`)}</span>
                  </div>
                </li>
              `;
            }).join("")}
          </ol>
        </section>
      </div>
    `;
  };

  const openCaseFlowView = (row) => {
    if (!caseDrawer || !caseFlowOf(row)) return;
    caseReturnFocus = document.activeElement;
    caseDrawer.querySelector("[data-case-title]").textContent = "Fluxul dosarului";
    caseDrawer.querySelector("[data-case-subtitle]").textContent = `${row.nrDosar} · ${row.serviciu}`;
    caseDrawerBody.innerHTML = renderCaseFlowView(row);
    caseDrawer.querySelector("[data-case-summary]").textContent = "";
    caseDrawer.querySelector("[data-case-buttons]").innerHTML = '<button class="btn btn-neutral btn-rounded" type="button" data-case-close>Închide</button>';
    caseDrawer.hidden = false;
    document.body.classList.add("is-user-create-open");
    requestAnimationFrame(() => caseDrawer.querySelector("[data-case-close]")?.focus());
  };

  caseDrawer?.addEventListener("click", (event) => {
    if (event.target.closest("[data-case-close]")) closeCaseDrawer();
  });

  caseModal?.addEventListener("click", (event) => {
    if (event.target.closest("[data-case-close]")) { closeCaseModal(); return; }
    if (event.target.closest("[data-case-submit]")) { submitCaseDraft(); return; }
    const choice = event.target.closest("[data-case-choice]");
    if (choice && caseDraft) {
      caseDraft.values.choice = choice.dataset.caseChoice;
      renderCaseModal();
      caseModalBody.querySelector(`[data-case-choice="${caseDraft.values.choice}"]`)?.focus();
    }
  });

  caseModal?.addEventListener("input", (event) => {
    const field = event.target.closest("[data-case-field]");
    if (!field || !caseDraft) return;
    caseDraft.values[field.dataset.caseField] = field.value;
    const count = caseModalBody.querySelector(`[data-case-count="${field.dataset.caseField}"]`);
    if (count) count.textContent = field.value.length;
  });

  caseModal?.addEventListener("change", (event) => {
    if (!caseDraft) return;
    const select = event.target.closest("[data-case-select]");
    if (select) { caseDraft.values[select.dataset.caseSelect] = select.value; delete caseDraft.errors[select.dataset.caseSelect]; return; }
    const fee = event.target.closest("[data-case-fee]");
    if (fee) {
      const set = new Set(caseDraft.values.fees || []);
      if (fee.checked) set.add(fee.value); else set.delete(fee.value);
      caseDraft.values.fees = [...set];
      delete caseDraft.errors.fees;
      renderCaseModal();
      caseModalBody.querySelector(`[data-case-fee][value="${fee.value}"]`)?.focus();
      return;
    }
    const picker = event.target.closest("[data-case-date]");
    if (picker) { caseDraft.values[picker.dataset.caseDate] = picker.dataset.selected || ""; delete caseDraft.errors[picker.dataset.caseDate]; }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && caseDrawer && !caseDrawer.hidden && !document.querySelector(".date-picker-panel:not([hidden]), body > .e-permits-fo-select__list")) closeCaseDrawer();
  });

  const renderDosarProfil = (row) => {
    if (!dosarProfilPanel || !row) {
      return;
    }

    /* a tab can disappear (role switch, §10): fall back to the first visible one */
    const visibleTabs = getDosarProfileTabs(row);
    if (!visibleTabs.some((tab) => tab.id === dosarProfilState.tabKey)) {
      dosarProfilState.tabKey = visibleTabs[0]?.id || "general";
    }

    if (dosarProfilTitleRow) {
      dosarProfilTitleRow.innerHTML = renderDosarProfilTitle(row);
    }

    if (dosarProfilSummary) {
      dosarProfilSummary.innerHTML = renderDosarProfilSummary(row);
      watchPageHeaderMeta(dosarProfilSummary);
    }

    if (dosarProfilTabs) {
      dosarProfilTabs.innerHTML = renderDosarProfilTabs(row);
    }

    renderDosarProfilPanelBody(row);
  };

  const openDosarProfil = (row, requestedTab = "general") => {
    if (!row) {
      return;
    }

    const tabs = getDosarProfileTabs(row);
    const activeTab = tabs.some((tab) => tab.id === requestedTab) ? requestedTab : "general";

    dosarProfilState.rowId = row.id;
    dosarProfilState.tabKey = activeTab;

    if (workplacePanel) {
      workplacePanel.hidden = true;
    }

    if (permitsProfilePanel) {
      permitsProfilePanel.hidden = true;
    }

    if (dosarProfilPanel) {
      dosarProfilPanel.hidden = false;
    }

    if (userProfilePanel) {
      userProfilePanel.hidden = true;
    }

    if (userProfileBackShell) {
      userProfileBackShell.hidden = true;
    }

    shell.classList.remove("is-user-profile-open");
    shell.classList.add("is-dosar-profile-open");
    if (dosarProfilBackShell) {
      dosarProfilBackShell.hidden = false;
    }

    renderDosarProfil(row);
    history.replaceState(null, "", `#dosar/${row.id}/${activeTab}`);
    dosarProfilPanel?.scrollIntoView?.({ block: "start" });
  };

  const closeDosarProfil = () => {
    if (dosarProfilPanel) {
      dosarProfilPanel.hidden = true;
    }

    shell.classList.remove("is-dosar-profile-open");
    if (dosarProfilBackShell) {
      dosarProfilBackShell.hidden = true;
    }

    restorePageHash();

    if (dosarProfilState.returnTo === "sarcini") {
      dosarProfilState.returnTo = "dossiers";
      showSarciniRegistry();
      return;
    }

    if (workplacePanel) {
      workplacePanel.hidden = false;
    }

    renderWorkplace();
  };

  dosarProfilBackShell?.addEventListener("click", closeDosarProfil);
  dosarProfilTitleRow?.addEventListener("click", (event) => {
    if (event.target.closest("[data-dosar-profil-crumb-back]")) {
      event.preventDefault();
      closeDosarProfil();
      return;
    }

    const row = getDosarById(dosarProfilState.rowId);
    const action = event.target.closest("[data-case-action]");

    if (action) {
      if (action.getAttribute("aria-disabled") === "true") {
        return;
      }
      openCaseAction(row, action.dataset.caseAction);
      return;
    }

    if (event.target.closest("[data-case-flow-view]")) {
      openCaseFlowView(row);
    }
  });

  const getUserById = (id) =>
    (usersDb?.runtimeRows || []).find((user) => user.id === id) || null;

  /* GEAP-administered fields (the rest come from MPass / RSSP and are read-only) */
  const USER_GEAP_FIELDS = ["autoritateId", "functie", "comentarii", "informatiiAditionale"];
  const userGeapDraftOf = (user) => Object.fromEntries(USER_GEAP_FIELDS.map((key) => [key, String(user[key] || "")]));
  const userGeapDirty = (user) => {
    const draft = userProfileState.draft;
    if (!draft || !user) return false;
    const base = userGeapDraftOf(user);
    return USER_GEAP_FIELDS.some((key) => draft[key] !== base[key]);
  };
  /* unsaved changes on the profile: the GEAP data draft + the permissions draft */
  const userGeapChangedKeys = (user) => {
    const draft = userProfileState.draft;
    if (!draft || !user) return [];
    const base = userGeapDraftOf(user);
    return USER_GEAP_FIELDS.filter((key) => draft[key] !== base[key]);
  };
  const userProfileChanges = (user) => userGeapChangedKeys(user).length + permDirtyCount(userProfileState);
  const confirmLeaveUserProfile = () => !userProfileChanges(getUserById(userProfileState.rowId))
    || window.confirm("Ai modificări nesalvate în profilul utilizatorului. Renunți la ele?");

  /* page header: Renunță · Salvează only while the GEAP data is dirty (as Clasificatoare /
     Șabloane › Setări), then the profile actions; the caption carries the dirty status */
  const renderUserProfileTitle = (user) => {
    const changes = userProfileChanges(user);
    const dirty = changes > 0;
    return renderPageHeaderTop({
      crumbs: [
        { label: "Utilizatori", attr: "data-user-profile-crumb-back" },
        { label: user.idnp }
      ],
      title: user.numeComplet,
      actions: `
        ${dirty ? `
          <button class="btn btn-neutral btn-sm" type="button" data-user-profile-discard>Renunță</button>
          <button class="btn btn-primary btn-sm" type="button" data-user-profile-save>Salvează</button>
          <span class="e-permits-page-header__divider" aria-hidden="true"></span>
        ` : ""}
        <button class="btn btn-secondary btn-sm" type="button" data-user-profile-delegate>Deleagă rol</button>
        ${renderStackMenu([
          user.status === "Activ"
            ? { label: "Inactivează utilizatorul", icon: "pause", danger: true, attrs: "data-user-profile-status-toggle" }
            : { label: "Activează utilizatorul", icon: "checkmark-large", attrs: "data-user-profile-status-toggle" },
          { label: "Șterge utilizatorul", icon: "delete", danger: true, attrs: user.status === "Activ"
            ? 'data-user-profile-delete aria-disabled="true" data-tooltip-reason="Inactivează întâi utilizatorul — un cont activ nu se șterge."'
            : "data-user-profile-delete" }
        ], user.numeComplet)}
      `,
      status: dirty ? renderHeaderStatus(changes === 1 ? "1 modificare nesalvată" : `${changes} modificări nesalvate`, "warning", 'data-profile-changes aria-haspopup="dialog" title="Vezi modificările"') : "",
      caption: `Ultima conectare ${user.ultimaConectareRelativ || formatLongDate(user.ultimaConectare)} · actualizat ${formatLongDate(user.ultimaActualizare)}`
    });
  };

  const renderUserProfileSummary = (user) => renderPageHeaderMeta([
    ["IDNP", renderProfileCopyCode(user.idnp, `Copiază IDNP ${user.idnp}`)],
    ["Rol", `<span class="e-permits-user-profile__summary-roles">${(user.roluri?.length ? user.roluri : ["Specialist"]).map((role) => renderTag(role, "neutral")).join("")}</span>`],
    ["Autoritatea", escapeHtml(user.autoritateScurta || "ANSP")],
    ["Email", escapeHtml(user.email)],
    ["Statut", renderTag(user.status, user.status === "Activ" ? "success" : "neutral")]
  ]);

  const renderUserProfileTabs = (user) =>
    (usersDb?.profile?.tabs || []).map((tab) => {
      const active = tab.id === userProfileState.tabKey;
      const count = tab.countKey ? Number(user[tab.countKey] || 0) : null;

      return `
        <button
          id="user-profile-tab-${escapeHtml(tab.id)}"
          class="tab-button${active ? " active" : ""}"
          type="button"
          role="tab"
          aria-selected="${active ? "true" : "false"}"
          aria-controls="user-profile-panel-${escapeHtml(tab.id)}"
          tabindex="${active ? "0" : "-1"}"
          data-user-profile-tab="${escapeHtml(tab.id)}"
        >
          ${tab.icon ? `
            <svg class="icon" width="20" height="20" aria-hidden="true">
              <use href="assets/icons/sprite.svg#icon-${escapeHtml(tab.icon)}"></use>
            </svg>
          ` : ""}
          <span>${escapeHtml(tab.label)}</span>
          ${count !== null ? renderPageHeaderTabCount(count) : ""}
        </button>
      `;
    }).join("");

  /* Switching tabs must never tear down and rebuild the tab buttons — that
     destroys the focused element (killing keyboard nav + flashing the focus
     ring off/on) and forces an avoidable reflow. This just flips the
     active/aria-selected/tabindex state on the buttons that already exist.
     `attr` is the plain HTML attribute name (e.g. "data-user-profile-tab"),
     `datasetProp` its camelCase `.dataset` counterpart (e.g. "userProfileTab"). */
  const syncTabStripActive = (container, attr, datasetProp, activeId) => {
    if (!container) {
      return;
    }

    container.querySelectorAll(`[${attr}]`).forEach((button) => {
      const isActive = button.dataset[datasetProp] === activeId;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-selected", String(isActive));
      button.tabIndex = isActive ? 0 : -1;
    });
  };

  const renderUserProfileFieldValue = (field, user) => {
    const rawValue = user[field.key];
    const value = rawValue === null || rawValue === undefined || rawValue === ""
      ? (field.emptyValue || "—")
      : rawValue;

    if (field.type === "status") {
      return renderTag(value, value === "Activ" ? "success" : "neutral");
    }

    if (field.copyable) {
      return renderCopyCode(value, `Copiază ${field.label} ${value}`);
    }

    return escapeHtml(value);
  };

  /* Date generale: what comes from MPass / RSSP is read-only data → the grey passport
     card; what GEAP administers is actionable → the white bordered form card. Edits are a
     draft; Renunță · Salvează sit in the page header while it is dirty. */
  const renderUserProfileGeneral = (user) => {
    const draft = userProfileState.draft || (userProfileState.draft = userGeapDraftOf(user));
    const readSections = (usersDb?.profile?.sections || []).map((section) => {
      const rows = (section.fields || []).filter((field) => !field.editable)
        .map((field) => [field.label, renderUserProfileFieldValue(field, user)]);
      return rows.length ? renderPassportSection(section.title, rows) : "";
    }).join("");
    const authorities = usersDb?.profile?.authorities || [];
    const field = (id, label, control, hint = "") => `
      <div class="e-permits-fo-field">
        <label for="${id}">${escapeHtml(label)}</label>
        ${control}
        ${hint ? `<p class="e-permits-fo-field__hint">${escapeHtml(hint)}</p>` : ""}
      </div>`;
    const textarea = (id, key, placeholder) => `<div class="e-permits-fo-textarea"><textarea id="${id}" rows="3" placeholder="${escapeHtml(placeholder)}" data-user-geap="${key}">${escapeHtml(draft[key])}</textarea></div>`;
    return `
      ${readSections}
      <section class="e-permits-dosar-profil__section">
        <h2 class="e-permits-dosar-profil__section-title">Date administrate în GEAP</h2>
        <div class="e-permits-ntpl-card e-permits-clas-form">
          <div class="e-permits-clas-form__row">
            ${field("user-geap-authority", "Autoritatea", renderFoSelectControl({
              id: "user-geap-authority",
              attrs: 'data-user-geap="autoritateId"',
              optionsHtml: authorities.map((authority) => `<option value="${escapeHtml(authority.id)}"${authority.id === draft.autoritateId ? " selected" : ""}>${escapeHtml(authority.label)}</option>`).join("")
            }), "Autoritatea de bază a contului. Combinațiile de roluri pot viza și alte autorități.")}
            ${field("user-geap-function", "Funcția", `<div class="e-permits-fo-input"><input id="user-geap-function" type="text" autocomplete="off" value="${escapeHtml(draft.functie)}" placeholder="Ex. Specialist principal" data-user-geap="functie"></div>`)}
          </div>
          ${field("user-geap-comments", "Comentarii", textarea("user-geap-comments", "comentarii", "Note interne despre cont"), "Vizibile doar administratorilor.")}
          ${field("user-geap-info", "Informații adiționale", textarea("user-geap-info", "informatiiAditionale", "Ex. program de lucru, ghișeu"))}
        </div>
      </section>
    `;
  };

  const saveUserGeapDraft = (user) => {
    const draft = userProfileState.draft;
    if (!draft || !userGeapDirty(user)) return;
    const authority = (usersDb?.profile?.authorities || []).find((item) => item.id === draft.autoritateId);
    if (authority) {
      user.autoritateId = authority.id;
      user.autoritate = authority.label;
      user.autoritateScurta = authority.shortLabel;
    }
    user.functie = draft.functie.trim();
    user.comentarii = draft.comentarii.trim();
    user.informatiiAditionale = draft.informatiiAditionale.trim();
    user.ultimaActualizare = new Date().toISOString().slice(0, 10);
    persistUserProfileOverride(user);
    userProfileState.draft = userGeapDraftOf(user);
    renderUserProfile(user);
    showShellToast("Datele utilizatorului au fost salvate.");
  };

  // ---- Combinații de roluri tab ----  // ---- Combinații de roluri tab ----
  const getPermissionGroups = () => usersDb?.profile?.permissionCatalog?.groups || [];

  const getAllPermissions = () =>
    getPermissionGroups().flatMap((group) =>
      (group.permissions || []).map((permission) => ({ ...permission, groupId: group.id, groupLabel: group.label })));

  /* the role's permissions in the catalog (one source for the list and the add modal);
     the stored count is only a fallback for roles the catalog does not know */
  const comboPermissionCount = (combo) => {
    const fromCatalog = getAllPermissions().filter((permission) => permission.role === combo.role).length;
    return fromCatalog || (Number.isFinite(combo.permissionCount) ? combo.permissionCount : 0);
  };

  const renderComboSelect = (key, label, placeholder, options, value, disabled = false, error = "") => `
    <div class="e-permits-fo-field">
      <label for="user-profile-combo-${key}">${escapeHtml(label)}${requiredMark()}</label>
      ${renderFoSelectControl({
        id: `user-profile-combo-${key}`,
        attrs: `data-combo-field="${key}"`,
        disabled,
        error: Boolean(error),
        optionsHtml: `
          <option value="" ${value ? "" : "selected"} disabled hidden>${escapeHtml(placeholder)}</option>
          ${options.map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === value ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
        `
      })}
      ${clasFieldError({ [key]: error }, key)}
    </div>
  `;


  /* "Adaugă combinație" = library central modal (as Clonează / Atașează): Rol → Autoritate →
     Subdiviziune (enabled once the authority is chosen); errors inline on Adaugă */
  const renderComboModalBody = () => {
    const form = userProfileState.comboForm || {};
    const errors = form.errors || {};
    const roleOptions = (usersDb?.profile?.roleOptions || []).map((role) => ({ value: role, label: role }));
    const authorityOptions = (usersDb?.profile?.authorities || []).map((authority) => ({ value: authority.id, label: authority.label }));
    const subdivisions = form.authorityId
      ? (usersDb?.profile?.subdivisionsByAuthority?.[form.authorityId] || []).map((sub) => ({ value: sub, label: sub }))
      : [];
    const permissions = form.role ? comboPermissionCount({ role: form.role }) : 0;
    return `
      <div class="e-permits-case-form">
        ${renderComboSelect("role", "Rol", "Selectează rolul", roleOptions, form.role || "", false, errors.role)}
        ${renderComboSelect("authority", "Autoritate", "Selectează autoritatea", authorityOptions, form.authorityId || "", false, errors.authority)}
        ${renderComboSelect("subdivision", "Subdiviziune", form.authorityId ? "Selectează subdiviziunea" : "Alege întâi autoritatea", subdivisions, form.subdivision || "", !form.authorityId, errors.subdivision)}
        ${form.role ? renderNotice("info", `Rolul <strong>${escapeHtml(form.role)}</strong> aduce ${permissions ? (permissions === 1 ? "o permisiune" : `${permissions} permisiuni`) : "permisiunile din profilul lui (Roluri)"}. Autoritatea și subdiviziunea stabilesc ce dosare vede utilizatorul.`) : ""}
      </div>
    `;
  };

  const renderRolesTab = (user) => {
    const combos = user.roleCombinations || [];
    const authorityLabel = (short) => (usersDb?.profile?.authorities || []).find((item) => item.shortLabel === short)?.label || short;
    const items = combos.map((combo, index) => ({
      plainTitle: combo.role,
      title: escapeHtml(combo.role),
      badges: [renderTag(combo.authorityShort, "neutral")],
      meta: [escapeHtml(combo.subdivision), ...(comboPermissionCount(combo) ? [`${comboPermissionCount(combo)} permisiuni`] : []), escapeHtml(authorityLabel(combo.authorityShort))],
      menu: [{ label: "Elimină combinația", icon: "delete", danger: true, attrs: `data-combo-remove="${index}"${combos.length === 1 ? ' aria-disabled="true" data-tooltip-reason="Utilizatorul are nevoie de cel puțin o combinație."' : ""}` }]
    }));
    return `
      <section class="e-permits-dosar-profil__section e-permits-stack-section">
        <!-- title and the one action on the same row (no toolbar: there is nothing to search) -->
        <div class="e-permits-dosar-profil__section-heading">
          <h2 class="e-permits-dosar-profil__section-title">Combinații de roluri</h2>
          <button class="btn btn-secondary btn-sm" type="button" data-combo-add-open>
            <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-large"></use></svg>
            <span>Adaugă combinație</span>
          </button>
        </div>
        <div class="e-permits-sum-list">
          ${items.length ? `
            <div class="e-permits-stack">
              <div class="e-permits-stack__group">
                <ul class="e-permits-stack__list" role="list">${items.map(renderStackItem).join("")}</ul>
              </div>
            </div>
          ` : renderEmptyState({ title: "Nicio combinație de roluri", text: "Fără combinații, utilizatorul nu vede dosare și nu are permisiuni.", icon: "user-account" })}
          ${renderListNote("O combinație = rol + autoritate + subdiviziune. Rolul aduce permisiunile; autoritatea și subdiviziunea stabilesc ce dosare vede utilizatorul.")}
        </div>
      </section>
    `;
  };

  // ---- Permisiuni tab ----  // ---- Permisiuni tab ----
  const permBaseGranted = (subject, id) => (subject.grantedPermissions || subject.functii || []).includes(id);

  const permRowState = (subject, id, state = userProfileState) => {
    const base = permBaseGranted(subject, id);

    if (state.permAdd.has(id)) {
      return "add";
    }

    if (base && state.permRemove.has(id)) {
      return "remove";
    }

    return base ? "granted" : "off";
  };

  const permEffectiveGranted = (subject, id, state = userProfileState) => ["add", "granted"].includes(permRowState(subject, id, state));

  const permBaseActiveCount = (subject) => (subject.grantedPermissions || subject.functii || []).length;

  /* Permisiuni reuse the passport's stacked list (state tag + source line);
     the two row actions stay as they were: Adaugă / Retrage toggles */
  /* ---- Permisiuni (user + role profile) ------------------------------------------
     One switch per permission: on = granted. A change is a draft (permAdd / permRemove)
     until Salvează in the page header; the row says where the permission comes from and
     tags only what changes (Se acordă / Se retrage). Chips filter (Toate · Acordate ·
     Neacordate · Modificate), the search filters in place; groups collapse. */
  const PERM_FILTERS = [
    ["all", "Toate", () => true],
    ["granted", "Acordate", (subject, id, state) => permEffectiveGranted(subject, id, state)],
    ["off", "Neacordate", (subject, id, state) => !permEffectiveGranted(subject, id, state)],
    ["changed", "Modificate", (subject, id, state) => state.permAdd.has(id) || state.permRemove.has(id)]
  ];
  const permDirtyCount = (state) => state.permAdd.size + state.permRemove.size;
  const permSubjectRoles = (subject) => new Set((subject.roleCombinations || []).map((combo) => combo.role));
  const permIsUser = (subject) => Array.isArray(subject.roleCombinations);

  const permVisible = (subject, permission, state) => {
    const query = String(state.permSearch || "").trim().toLocaleLowerCase("ro");
    const filter = PERM_FILTERS.find(([key]) => key === (state.permFilter || "all"))?.[2] || (() => true);
    return filter(subject, permission.id, state)
      && (!query || `${permission.label} ${permission.groupLabel || ""}`.toLocaleLowerCase("ro").includes(query));
  };

  /* where the permission comes from, in one short line */
  const permSourceLine = (subject, permission, rowState) => {
    /* a role's own list: the switch says it all */
    if (!permIsUser(subject)) return "";
    const viaRole = permission.role && permSubjectRoles(subject).has(permission.role);
    if (rowState === "add") return "Se acordă individual, peste roluri";
    if (rowState === "remove") return viaRole ? `Din rolul ${permission.role} — se retrage doar pentru acest utilizator` : "Acordată individual — se retrage";
    if (rowState === "granted") return viaRole ? `Din rolul ${permission.role}` : "Acordată individual";
    return permission.role ? `Face parte din rolul ${permission.role}` : "";
  };

  const PERM_CHANGE_TAG = { add: ["Se acordă", "success"], remove: ["Se retrage", "danger"] };

  const renderPermRow = (subject, permission, state, editable) => {
    const rowState = permRowState(subject, permission.id, state);
    const on = permEffectiveGranted(subject, permission.id, state);
    const change = PERM_CHANGE_TAG[rowState];
    const source = permSourceLine(subject, permission, rowState);
    const id = `perm-switch-${permission.id}`;
    return `
      <li class="e-permits-stack__item e-permits-perms__row${change ? " is-changed" : ""}">
        <div class="e-permits-stack__main">
          <div class="e-permits-stack__title-row">
            <label class="e-permits-stack__title e-permits-perms__label" for="${id}">${escapeHtml(permission.label)}</label>
            ${change ? renderTag(change[0], change[1]) : ""}
          </div>
          ${source ? `<div class="e-permits-stack__meta"><span class="e-permits-stack__part">${escapeHtml(source)}</span></div>` : ""}
        </div>
        <div class="e-permits-stack__actions">
          <span class="e-permits-toggle__control">
            <input class="e-permits-toggle__input" type="checkbox" role="switch" id="${id}"${on ? " checked" : ""}${editable ? "" : " disabled"} data-perm-switch="${escapeHtml(permission.id)}">
            <span class="e-permits-toggle__knob" aria-hidden="true"></span>
          </span>
        </div>
      </li>
    `;
  };

  const renderPermGroup = (subject, group, state, editable, filtering) => {
    const permissions = (group.permissions || []).map((permission) => ({ ...permission, groupLabel: group.label }));
    const shown = permissions.filter((permission) => permVisible(subject, permission, state));
    if (filtering && !shown.length) return "";
    const granted = permissions.filter((permission) => permEffectiveGranted(subject, permission.id, state)).length;
    const added = permissions.filter((permission) => state.permAdd.has(permission.id)).length;
    const removed = permissions.filter((permission) => state.permRemove.has(permission.id)).length;
    /* a search or a filter opens every group that has matches */
    const open = filtering || state.permOpenGroups.has(group.id);
    return `
      <div class="e-permits-stack__group${open ? " is-open" : " is-collapsed"}">
        <h3 class="e-permits-stack__group-label e-permits-stack__group-label--toggle">
          <button class="e-permits-stack__group-toggle" type="button" data-perm-group="${group.id}" aria-expanded="${open ? "true" : "false"}"${filtering ? " disabled" : ""}>
            <span class="e-permits-stack__group-name">${escapeHtml(group.label)}</span>
            <span class="badge badge--lg badge--solid-light e-permits-stack__group-count" aria-label="${granted} din ${permissions.length} acordate">${granted}/${permissions.length}</span>
            ${added ? renderTag(plural(added, "adăugată", "adăugate"), "success") : ""}
            ${removed ? renderTag(plural(removed, "retrasă", "retrase"), "danger") : ""}
            <svg class="icon small e-permits-stack__group-chevron" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
          </button>
        </h3>
        ${open ? `<ul class="e-permits-stack__list" role="list">${shown.map((permission) => renderPermRow(subject, permission, state, editable)).join("")}</ul>` : ""}
      </div>
    `;
  };

  const renderPermChips = (subject, state) => {
    const all = getAllPermissions();
    return PERM_FILTERS
      .filter(([key]) => key !== "changed" || permDirtyCount(state))
      .map(([key, label, test]) => {
        const selected = (state.permFilter || "all") === key;
        return `
          <button type="button" class="chip${selected ? " is-selected" : ""}" aria-pressed="${selected}" data-perm-filter="${key}">
            <span class="chip__label">${label}</span>
            <span class="badge badge--lg badge--solid-light" aria-hidden="true">${all.filter((permission) => test(subject, permission.id, state)).length}</span>
          </button>`;
      }).join("");
  };

  const renderPermResults = (subject, state, editable = true) => {
    const filtering = Boolean(String(state.permSearch || "").trim()) || (state.permFilter || "all") !== "all";
    const groups = getPermissionGroups().map((group) => renderPermGroup(subject, group, state, editable, filtering)).join("");
    return groups.trim()
      ? `<div class="e-permits-stack e-permits-perms__stack">${groups}</div>`
      : renderNoResults(String(state.permSearch || "").trim() ? "Nicio permisiune nu corespunde căutării" : "Nicio permisiune în acest filtru", { text: "Schimbă filtrul sau caută altceva." });
  };

  const renderPermissionsTab = (subject, state = userProfileState, { editable = true } = {}) => {
    const all = getAllPermissions();
    const granted = all.filter((permission) => permEffectiveGranted(subject, permission.id, state)).length;
    return `
      <section class="e-permits-dosar-profil__section e-permits-stack-section e-permits-perms">
        <div class="e-permits-dosar-profil__section-heading">
          <h2 class="e-permits-dosar-profil__section-title">Permisiuni</h2>
          <span class="e-permits-dosar-profil__section-meta" data-perm-summary>${granted} acordate din ${all.length}</span>
        </div>
        <div class="e-permits-pay__toolbar">
          <div class="e-permits-rt__chips" role="group" aria-label="Filtrează permisiunile" data-perm-chips>${renderPermChips(subject, state)}</div>
          <div class="e-permits-pay__tools">
            <div class="search-input medium rectangular e-permits-workplace__search e-permits-list-search e-permits-pay__search${String(state.permSearch || "").trim() ? " has-value is-ready" : ""}">
              <span class="icon-search" aria-hidden="true"><svg class="icon" width="20" height="20"><use href="assets/icons/sprite.svg#icon-search"></use></svg></span>
              <input class="input" type="search" placeholder="Caută permisiune" aria-label="Caută permisiune după denumire sau grup" value="${escapeHtml(state.permSearch || "")}" autocomplete="off" data-perm-search>
              ${renderSearchActions()}
            </div>
          </div>
        </div>
        <div class="e-permits-sum-list">
          <div data-perm-results>${renderPermResults(subject, state, editable)}</div>
          ${renderListNote(permIsUser(subject)
            ? "Permisiunile vin din <strong>rolurile</strong> utilizatorului. Aici le poți acorda sau retrage <strong>individual</strong>, doar pentru acest cont; modificările se aplică după <strong>Salvează</strong>."
            : "Permisiunile rolului se aplică tuturor utilizatorilor care îl au. Modificările se aplică după <strong>Salvează</strong>.")}
        </div>
      </section>
    `;
  };

  /* chips, counts and list follow the draft without touching the search field */
  const refreshPermResults = (body, subject, state) => {
    if (!body || !subject) return;
    const all = getAllPermissions();
    const summary = body.querySelector("[data-perm-summary]");
    if (summary) summary.textContent = `${all.filter((permission) => permEffectiveGranted(subject, permission.id, state)).length} acordate din ${all.length}`;
    if (!permDirtyCount(state) && state.permFilter === "changed") state.permFilter = "all";
    const chips = body.querySelector("[data-perm-chips]");
    if (chips) chips.innerHTML = renderPermChips(subject, state);
    const results = body.querySelector("[data-perm-results]");
    if (results) results.innerHTML = renderPermResults(subject, state);
  };

  const renderUserProfileSupportingTab = (user) => {
    if (userProfileState.tabKey === "roles") {
      return renderRolesTab(user);
    }

    if (userProfileState.tabKey === "permissions") {
      return renderPermissionsTab(user);
    }

    if (userProfileState.tabKey === "events") {
      return renderEventTimeline("Jurnal de evenimente", userEvents(user));
    }

    const tab = (usersDb?.profile?.tabs || []).find((item) => item.id === userProfileState.tabKey);
    return userProfileState.tabKey === "delegations"
      ? renderPassportEmpty("Delegări", "Nicio delegare activă. Un rol se deleagă din antet, cu „Deleagă rol”.", "", "user-account")
      : renderPassportEmpty(tab?.label || "Profil utilizator", "Nu există înregistrări pentru această secțiune.");
  };

  const renderUserProfilePanelBody = (user) => {
    if (!userProfilePanelBody || !user) {
      return;
    }

    userProfilePanelBody.id = `user-profile-panel-${userProfileState.tabKey}`;
    userProfilePanelBody.setAttribute("role", "tabpanel");
    userProfilePanelBody.setAttribute("aria-labelledby", `user-profile-tab-${userProfileState.tabKey}`);
    userProfilePanelBody.innerHTML = userProfileState.tabKey === "general"
      ? renderUserProfileGeneral(user)
      : renderUserProfileSupportingTab(user);

  };

  const renderUserProfile = (user) => {
    if (!userProfilePanel || !user) {
      return;
    }

    userProfileTitle.innerHTML = renderUserProfileTitle(user);
    userProfileSummary.innerHTML = renderUserProfileSummary(user);
    watchPageHeaderMeta(userProfileSummary);
    userProfileTabs.innerHTML = renderUserProfileTabs(user);
    renderUserProfilePanelBody(user);
  };

  const resetSupportingTabState = () => {
    userProfileState.comboForm = null;
    userProfileState.permAdd = new Set();
    userProfileState.permRemove = new Set();
    userProfileState.permSearch = "";
    userProfileState.permFilter = "all";
    userProfileState.permOpenGroups = new Set(["dosare"]);
  };

  const openUserProfile = (user, requestedTab = "general") => {
    if (!user || !userProfilePanel) {
      return;
    }

    const tabs = usersDb?.profile?.tabs || [];
    userProfileState.rowId = user.id;
    userProfileState.tabKey = tabs.some((tab) => tab.id === requestedTab) ? requestedTab : "general";
    userProfileState.draft = userGeapDraftOf(user);
    resetSupportingTabState();

    if (workplacePanel) {
      workplacePanel.hidden = true;
    }

    if (permitsProfilePanel) {
      permitsProfilePanel.hidden = true;
    }

    if (dosarProfilPanel) {
      dosarProfilPanel.hidden = true;
    }

    if (dosarProfilBackShell) {
      dosarProfilBackShell.hidden = true;
    }

    userProfilePanel.hidden = false;
    userProfileBackShell.hidden = false;
    shell.classList.remove("is-dosar-profile-open");
    shell.classList.add("is-user-profile-open");
    renderUserProfile(user);
    history.replaceState(null, "", `#utilizator/${user.id}/${userProfileState.tabKey}`);
    userProfilePanel.scrollIntoView?.({ block: "start" });
  };

  const closeUserProfile = () => {
    if (!userProfilePanel || !confirmLeaveUserProfile()) {
      return;
    }

    userProfilePanel.hidden = true;
    userProfileBackShell.hidden = true;
    workplacePanel.hidden = false;
    shell.classList.remove("is-user-profile-open");
    userProfileState.rowId = null;
    userProfileState.draft = null;
    restorePageHash();
    renderWorkplace();
  };

  const openComboModal = () => {
    userProfileState.comboForm = { role: "", authorityId: "", subdivision: "", errors: {} };
    const body = document.querySelector("[data-user-combo-body]");
    if (body) body.innerHTML = renderComboModalBody();
    window.__modal?.open?.("#user-combo-modal");
  };

  const commitCombination = (user) => {
    const form = userProfileState.comboForm;
    if (!form) return;
    const authority = (usersDb?.profile?.authorities || []).find((item) => item.id === form.authorityId);
    const errors = {};
    if (!form.role) errors.role = "Alege rolul.";
    if (!form.authorityId) errors.authority = "Alege autoritatea.";
    if (form.authorityId && !form.subdivision) errors.subdivision = "Alege subdiviziunea.";
    if (!Object.keys(errors).length && (user.roleCombinations || []).some((item) => item.role === form.role && item.authorityShort === authority?.shortLabel && item.subdivision === form.subdivision)) {
      errors.subdivision = "Utilizatorul are deja această combinație.";
    }
    form.errors = errors;
    const body = document.querySelector("[data-user-combo-body]");
    if (Object.keys(errors).length) {
      body.innerHTML = renderComboModalBody();
      focusFormControl(body.querySelector(".e-permits-fo-select.is-error .e-permits-fo-select__button"));
      return;
    }

    const combo = {
      role: form.role,
      authorityShort: authority?.shortLabel || form.authorityId,
      subdivision: form.subdivision,
      permissionCount: getAllPermissions().filter((permission) => permission.role === form.role).length
    };

    user.roleCombinations = [...(user.roleCombinations || []), combo];
    user.roluri = [...new Set(user.roleCombinations.map((item) => item.role))];
    user.ultimaActualizare = new Date().toISOString().slice(0, 10);
    persistUserProfileOverride(user);
    userProfileState.comboForm = null;
    window.__modal?.close?.("#user-combo-modal");
    renderUserProfile(user);
    showShellToast(`Combinația „${combo.role} · ${combo.authorityShort} · ${combo.subdivision}” a fost adăugată.`);
  };

  const removeCombination = (user, index) => {
    if (!Array.isArray(user.roleCombinations)) {
      return;
    }

    user.roleCombinations = user.roleCombinations.filter((_, itemIndex) => itemIndex !== index);
    user.roluri = [...new Set(user.roleCombinations.map((item) => item.role))];

    if (!user.roluri.length) {
      user.roluri = ["Specialist"];
    }

    user.ultimaActualizare = new Date().toISOString().slice(0, 10);
    persistUserProfileOverride(user);
    renderUserProfile(user);
    showShellToast("Combinația de rol a fost eliminată.");
  };

  const handleRolesTabClick = (event, user) => {
    if (userProfileState.tabKey !== "roles") {
      return false;
    }

    if (event.target.closest("[data-combo-add-open]")) {
      openComboModal();
      return true;
    }

    const removeButton = event.target.closest("[data-combo-remove]");

    if (removeButton) {
      if (removeButton.getAttribute("aria-disabled") === "true") return true;
      const index = Number(removeButton.dataset.comboRemove);
      const combo = (user.roleCombinations || [])[index];
      if (!combo) return true;
      askConfirm({
        title: "Elimini combinația?",
        text: `${user.numeComplet} pierde rolul ${combo.role} în ${combo.authorityShort} · ${combo.subdivision} și permisiunile lui. Dosarele deja repartizate rămân la utilizator până la redistribuire.`,
        confirmLabel: "Elimină",
        destructive: true
      }, () => removeCombination(user, index));
      return true;
    }

    return false;
  };

  /* one switch: back to the saved state clears the change */
  const togglePerm = (subject, id, on, state) => {
    if (permBaseGranted(subject, id)) {
      if (on) state.permRemove.delete(id); else state.permRemove.add(id);
    } else if (on) {
      state.permAdd.add(id);
    } else {
      state.permAdd.delete(id);
    }
  };

  const commitPermissions = (user) => {
    const granted = new Set(user.grantedPermissions || []);
    userProfileState.permAdd.forEach((id) => granted.add(id));
    userProfileState.permRemove.forEach((id) => granted.delete(id));
    user.grantedPermissions = getAllPermissions().map((permission) => permission.id).filter((id) => granted.has(id));
    user.permissionsCount = user.grantedPermissions.length;
    user.ultimaActualizare = new Date().toISOString().slice(0, 10);
    persistUserProfileOverride(user);
    const added = userProfileState.permAdd.size;
    const removed = userProfileState.permRemove.size;
    userProfileState.permAdd = new Set();
    userProfileState.permRemove = new Set();
    userProfileState.permFilter = "all";
    renderUserProfile(user);
    showShellToast(`Permisiunile au fost salvate: ${[added ? plural(added, "acordată", "acordate") : "", removed ? plural(removed, "retrasă", "retrase") : ""].filter(Boolean).join(", ")}.`);
  };

  /* shared wiring for a Permisiuni tab (user + role profile): group collapse, chips,
     search in place, switches (the knob slides, then the list re-renders) */
  const PERM_SLIDE_MS = 220;
  const handlePermClick = (event, body, subject, state) => {
    const groupButton = event.target.closest("[data-perm-group]");
    if (groupButton) {
      const id = groupButton.dataset.permGroup;
      if (state.permOpenGroups.has(id)) state.permOpenGroups.delete(id); else state.permOpenGroups.add(id);
      refreshPermResults(body, subject, state);
      body.querySelector(`[data-perm-group="${id}"]`)?.focus();
      return true;
    }
    const chip = event.target.closest("[data-perm-filter]");
    if (chip) {
      state.permFilter = chip.dataset.permFilter;
      refreshPermResults(body, subject, state);
      body.querySelector(`[data-perm-filter="${chip.dataset.permFilter}"]`)?.focus();
      return true;
    }
    return false;
  };
  const handlePermSearch = (event, body, subject, state) => {
    const search = event.target.closest("[data-perm-search]");
    if (!search) return false;
    state.permSearch = search.value;
    search.closest(".search-input")?.classList.toggle("has-value", Boolean(search.value));
    refreshPermResults(body, subject, state);
    return true;
  };
  const handlePermSwitch = (event, body, subject, state, onDraftChange) => {
    const input = event.target.closest("[data-perm-switch]");
    if (!input) return false;
    const id = input.dataset.permSwitch;
    togglePerm(subject, id, input.checked, state);
    onDraftChange();
    setTimeout(() => {
      refreshPermResults(body, subject, state);
      body.querySelector(`[data-perm-switch="${CSS.escape(id)}"]`)?.focus();
    }, PERM_SLIDE_MS);
    return true;
  };

  /* ---- Unsaved changes review (header status → modal) ------------------------------
     Every pending change of the profile in one list before Salvează: GEAP data (old →
     new) and permissions (Se acordă / Se retrage). Each row can be undone; the footer
     saves or drops everything. Same stacked-list rows as the tabs. */
  const USER_GEAP_LABELS = { autoritateId: "Autoritatea", functie: "Funcția", comentarii: "Comentarii", informatiiAditionale: "Informații adiționale" };
  const profileChangesTarget = () => {
    const role = !roleProfilePanel?.hidden && getRoleById(roleProfileState.roleId);
    if (role) return { kind: "role", subject: role, state: roleProfileState, name: role.denumire };
    const user = getUserById(userProfileState.rowId);
    return user ? { kind: "user", subject: user, state: userProfileState, name: user.numeComplet } : null;
  };
  const profileChangeEntries = (target) => {
    const entries = [];
    if (target.kind === "user") {
      const authorities = usersDb?.profile?.authorities || [];
      const shown = (key, value) => key === "autoritateId" ? (authorities.find((a) => a.id === value)?.label || value) : value;
      const base = userGeapDraftOf(target.subject);
      userGeapChangedKeys(target.subject).forEach((key) => entries.push({
        undo: `geap:${key}`, title: USER_GEAP_LABELS[key], group: "Date administrate în GEAP",
        detail: `${shown(key, base[key]) || "—"} → ${shown(key, target.state.draft[key]) || "—"}`, tag: ["Modificat", "brand"]
      }));
    }
    getAllPermissions().forEach((permission) => {
      const add = target.state.permAdd.has(permission.id), remove = target.state.permRemove.has(permission.id);
      if (add || remove) entries.push({
        undo: `perm:${permission.id}`, title: permission.label, group: "Permisiuni",
        detail: permission.groupLabel, tag: add ? ["Se acordă", "success"] : ["Se retrage", "danger"]
      });
    });
    return entries;
  };
  const renderProfileChangesBody = (target) => {
    const entries = profileChangeEntries(target);
    if (!entries.length) return renderEmptyState({ title: "Nu mai sunt modificări nesalvate", text: "Profilul este la zi.", icon: "checkmark-large", compact: true });
    return groupBy(entries, (entry) => entry.group, ["Date administrate în GEAP", "Permisiuni"]).map((group) => `
      <div class="e-permits-stack">
        <div class="e-permits-stack__group">
          <h3 class="e-permits-stack__group-label">${escapeHtml(group.label)}<span class="badge badge--lg badge--solid-light e-permits-stack__group-count">${group.items.length}</span></h3>
          <ul class="e-permits-stack__list" role="list">${group.items.map((entry) => renderStackItem({
            plainTitle: entry.title,
            title: escapeHtml(entry.title),
            badges: [renderTag(entry.tag[0], entry.tag[1])],
            meta: [escapeHtml(entry.detail)],
            actionsHtml: `<button class="btn btn-neutral btn-sm" type="button" data-change-undo="${escapeHtml(entry.undo)}">Anulează</button>`
          })).join("")}</ul>
        </div>
      </div>`).join("");
  };
  const profileChangesModal = document.querySelector("#profile-changes-modal");
  const refreshProfileChanges = () => {
    const target = profileChangesTarget();
    if (!target || !profileChangesModal) return;
    const count = profileChangeEntries(target).length;
    profileChangesModal.querySelector("[data-profile-changes-subtitle]").textContent = `${target.name} · ${count ? `${count === 1 ? "1 modificare" : `${count} modificări`} · se aplică după Salvează` : "nicio modificare"}`;
    profileChangesModal.querySelector("[data-profile-changes-body]").innerHTML = renderProfileChangesBody(target);
    profileChangesModal.querySelector("[data-profile-changes-save]").disabled = !count;
  };
  /* the profile behind follows every undo */
  const rerenderProfileBehind = (target) => {
    if (target.kind === "user") renderUserProfile(target.subject);
    else renderRoleProfile(target.subject);
  };
  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-profile-changes]")) {
      refreshProfileChanges();
      window.__modal?.open?.("#profile-changes-modal");
      return;
    }
    if (!profileChangesModal?.contains(event.target)) return;
    const target = profileChangesTarget();
    if (!target) return;
    const undo = event.target.closest("[data-change-undo]");
    if (undo) {
      const [kind, key] = undo.dataset.changeUndo.split(":");
      if (kind === "perm") { target.state.permAdd.delete(key); target.state.permRemove.delete(key); }
      else if (kind === "geap") target.state.draft[key] = userGeapDraftOf(target.subject)[key];
      rerenderProfileBehind(target);
      refreshProfileChanges();
      return;
    }
    if (event.target.closest("[data-profile-changes-discard]")) {
      target.state.permAdd = new Set(); target.state.permRemove = new Set();
      if (target.kind === "user") target.state.draft = userGeapDraftOf(target.subject);
      window.__modal?.close?.("#profile-changes-modal");
      rerenderProfileBehind(target);
      showShellToast("Modificările au fost anulate.", "info");
      return;
    }
    if (event.target.closest("[data-profile-changes-save]")) {
      window.__modal?.close?.("#profile-changes-modal");
      if (target.kind === "role") { commitRolePermissions(target.subject); return; }
      if (permDirtyCount(target.state)) commitPermissions(target.subject);
      if (userGeapDirty(target.subject)) saveUserGeapDraft(target.subject);
    }
  });

  userProfileBackShell?.addEventListener("click", closeUserProfile);
  userProfileTitle?.addEventListener("click", (event) => {
    if (event.target.closest("[data-user-profile-crumb-back]")) {
      event.preventDefault();
      closeUserProfile();
    }
  });

  // ---- Role profile ----
  const roleProfileState = {
    roleId: null,
    tabKey: "general",
    permAdd: new Set(),
    permRemove: new Set(),
    permOpenGroups: new Set(["dosare"]),
    permSearch: "",
    permFilter: "all"
  };

  const getRoleById = (id) => (roleAdminDb?.runtimeRows || []).find((role) => role.id === id) || null;

  const ROLE_PROFILE_TABS = [
    { id: "general", label: "Date generale", icon: "page-text" },
    { id: "permissions", label: "Permisiuni", count: (role) => role.functii.length },
    { id: "events", label: "Jurnal de evenimente" }
  ];

  const resetRolePermState = () => {
    roleProfileState.permAdd = new Set();
    roleProfileState.permRemove = new Set();
    roleProfileState.permOpenGroups = new Set(["dosare"]);
    roleProfileState.permSearch = "";
    roleProfileState.permFilter = "all";
  };

  /* the permissions draft puts Renunță · Salvează and the change count in the header */
  const confirmLeaveRoleProfile = () => !permDirtyCount(roleProfileState)
    || window.confirm("Ai modificări nesalvate în permisiunile rolului. Renunți la ele?");
  const renderRoleProfileTitle = (role) => {
    const changes = permDirtyCount(roleProfileState);
    return renderPageHeaderTop({
      crumbs: [
        { label: "Roluri", attr: "data-role-profile-crumb-back" },
        { label: role.id }
      ],
      title: role.denumire,
      actions: changes ? `
        <button class="btn btn-neutral btn-sm" type="button" data-role-profile-discard>Renunță</button>
        <button class="btn btn-primary btn-sm" type="button" data-role-profile-save>Salvează</button>
      ` : "",
      status: changes ? renderHeaderStatus(changes === 1 ? "1 modificare nesalvată" : `${changes} modificări nesalvate`, "warning", 'data-profile-changes aria-haspopup="dialog" title="Vezi modificările"') : ""
    });
  };

  const renderRoleProfileSummary = (role) => renderPageHeaderMeta([
    ["Nr. de permisiuni", `${role.functii.length}/${roleAdminDb.permissionTotal}`],
    ["Utilizatori cu acest rol", String(role.utilizatori)],
    ["Creat", escapeHtml(formatDate(role.dataCreare))],
    ["Statut", renderTag(role.activ ? "Activ" : "Inactiv", role.activ ? "success" : "neutral")]
  ]);

  const renderRoleProfileTabs = (role) => ROLE_PROFILE_TABS.map((tab) => {
    const active = tab.id === roleProfileState.tabKey;
    const count = tab.count ? tab.count(role) : null;

    return `
      <button id="role-profile-tab-${tab.id}" class="tab-button${active ? " active" : ""}" type="button" role="tab" aria-selected="${active ? "true" : "false"}" tabindex="${active ? "0" : "-1"}" data-role-profile-tab="${tab.id}">
        ${tab.icon ? `<svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${tab.icon}"></use></svg>` : ""}
        <span>${escapeHtml(tab.label)}</span>
        ${count !== null ? renderPageHeaderTabCount(count) : ""}
      </button>
    `;
  }).join("");

  const renderRoleProfileGeneral = (role) => {
    const rows = [
      ["Denumirea rolului", escapeHtml(role.denumire)],
      ["Descrierea rolului", escapeHtml(role.descriere)],
      ["Statut", renderTag(role.activ ? "Activ" : "Inactiv", role.activ ? "success" : "neutral")],
      ["Domeniu", "Global — toate autoritățile"],
      ["Eligibil pentru administrare locală", role.eligibilLocal ? "DA" : "NU"]
    ];

    /* read-only → the passport grey card, as every other profile */
    return renderPassportSection("Date de identificare", rows);
  };

  const renderRoleProfilePanelBody = (role) => {
    if (!roleProfilePanelBody || !role) {
      return;
    }

    roleProfilePanelBody.id = `role-profile-panel-${roleProfileState.tabKey}`;
    roleProfilePanelBody.setAttribute("role", "tabpanel");

    if (roleProfileState.tabKey === "permissions") {
      roleProfilePanelBody.innerHTML = renderPermissionsTab(role, roleProfileState);
      return;
    }

    if (roleProfileState.tabKey === "events") {
      roleProfilePanelBody.innerHTML = renderEventTimeline("Jurnal de evenimente", roleEvents(role));
      return;
    }

    roleProfilePanelBody.innerHTML = renderRoleProfileGeneral(role);
  };

  const renderRoleProfile = (role) => {
    if (!roleProfilePanel || !role) {
      return;
    }

    roleProfileTitle.innerHTML = renderRoleProfileTitle(role);
    roleProfileSummary.innerHTML = renderRoleProfileSummary(role);
    watchPageHeaderMeta(roleProfileSummary);
    roleProfileTabs.innerHTML = renderRoleProfileTabs(role);
    renderRoleProfilePanelBody(role);
  };

  const openRoleProfile = (role) => {
    shell.classList.remove("is-service-profile-open");
    document.querySelector("[data-service-profile-back-shell]")?.setAttribute("hidden", "");
    if (!role || !roleProfilePanel) {
      return;
    }

    roleProfileState.roleId = role.id;
    roleProfileState.tabKey = "general";
    resetRolePermState();

    [workplacePanel, permitsProfilePanel, userProfilePanel, userProfileBackShell, dosarProfilPanel, dosarProfilBackShell].forEach((panel) => {
      if (panel) {
        panel.hidden = true;
      }
    });

    roleProfilePanel.hidden = false;
    roleProfileBackShell.hidden = false;
    shell.classList.remove("is-user-profile-open");
    shell.classList.remove("is-dosar-profile-open");
    shell.classList.add("is-role-profile-open");
    setActiveNav("roles");
    renderRoleProfile(role);
    writeHash(`#rol/${role.id}/${roleProfileState.tabKey}`);
    roleProfilePanel.scrollIntoView?.({ block: "start" });
  };

  const closeRoleProfile = () => {
    if (!confirmLeaveRoleProfile()) return;
    resetRolePermState();
    if (roleProfilePanel) {
      roleProfilePanel.hidden = true;
    }

    if (roleProfileBackShell) {
      roleProfileBackShell.hidden = true;
    }

    shell.classList.remove("is-role-profile-open");
    roleProfileState.roleId = null;
    showRolesRegistry();
    restorePageHash();
  };

  roleProfileBackShell?.addEventListener("click", closeRoleProfile);
  /* the act-permisiv page is static markup; give its IDs the same copy behaviour */
  permitsProfilePanel?.addEventListener("click", async (event) => {
    const copyButton = event.target.closest("[data-shell-copy-value]");

    if (copyButton) {
      event.preventDefault();
      await handleCopyClick(copyButton);
    }
  });

  roleProfileTitle?.addEventListener("click", (event) => {
    if (event.target.closest("[data-role-profile-crumb-back]")) {
      event.preventDefault();
      closeRoleProfile();
    }
  });

  const commitRolePermissions = (role) => {
    const granted = new Set(role.functii || []);
    const added = roleProfileState.permAdd.size;
    const removed = roleProfileState.permRemove.size;
    roleProfileState.permAdd.forEach((id) => granted.add(id));
    roleProfileState.permRemove.forEach((id) => granted.delete(id));
    role.functii = getAllPermissions().map((permission) => permission.id).filter((id) => granted.has(id));
    roleProfileState.permAdd = new Set();
    roleProfileState.permRemove = new Set();
    roleProfileState.permFilter = "all";
    renderRoleProfile(role);
    showShellToast(`Permisiunile rolului au fost salvate: ${[added ? plural(added, "acordată", "acordate") : "", removed ? plural(removed, "retrasă", "retrase") : ""].filter(Boolean).join(", ")}. Se aplică tuturor utilizatorilor cu acest rol.`);
  };

  if (roleProfilePanel) {
    roleProfilePanel.addEventListener("input", (event) => {
      handlePermSearch(event, roleProfilePanelBody, getRoleById(roleProfileState.roleId), roleProfileState);
    });

    roleProfilePanel.addEventListener("change", (event) => {
      const role = getRoleById(roleProfileState.roleId);
      handlePermSwitch(event, roleProfilePanelBody, role, roleProfileState, () => {
        roleProfileTitle.innerHTML = renderRoleProfileTitle(role);
      });
    });

    roleProfilePanel.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && event.target.closest("[data-perm-search]") && roleProfileState.permSearch) {
        event.preventDefault();
        event.stopPropagation();
        event.target.value = "";
        handlePermSearch(event, roleProfilePanelBody, getRoleById(roleProfileState.roleId), roleProfileState);
      }
    });

    roleProfilePanel.addEventListener("click", async (event) => {
      const role = getRoleById(roleProfileState.roleId);

      if (!role) {
        return;
      }

      const copyButton = event.target.closest("[data-shell-copy-value]");

      if (copyButton) {
        event.preventDefault();
        await handleCopyClick(copyButton);
        return;
      }

      if (event.target.closest("[data-role-profile-save]")) {
        commitRolePermissions(role);
        return;
      }

      if (event.target.closest("[data-role-profile-discard]")) {
        roleProfileState.permAdd = new Set();
        roleProfileState.permRemove = new Set();
        roleProfileState.permFilter = "all";
        renderRoleProfile(role);
        return;
      }

      const tabButton = event.target.closest("[data-role-profile-tab]");

      if (tabButton) {
        if (tabButton.dataset.roleProfileTab === roleProfileState.tabKey) return;
        if (!confirmLeaveRoleProfile()) return;
        resetRolePermState();
        roleProfileTitle.innerHTML = renderRoleProfileTitle(role);
        roleProfileState.tabKey = tabButton.dataset.roleProfileTab;
        writeHash(`#rol/${role.id}/${roleProfileState.tabKey}`);
        syncTabStripActive(roleProfileTabs, "data-role-profile-tab", "roleProfileTab", roleProfileState.tabKey);
        renderRoleProfilePanelBody(role);
        tabButton.focus();
        return;
      }

      if (roleProfileState.tabKey === "permissions") {
        handlePermClick(event, roleProfilePanelBody, role, roleProfileState);
      }
    });

    roleProfileTabs?.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
        return;
      }

      const tabs = [...roleProfileTabs.querySelectorAll("[data-role-profile-tab]")];
      const currentIndex = tabs.findIndex((tab) => tab.dataset.roleProfileTab === roleProfileState.tabKey);
      let nextIndex = currentIndex;

      if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = tabs.length - 1;
      } else if (event.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % tabs.length;
      } else if (event.key === "ArrowLeft") {
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      }

      event.preventDefault();
      tabs[nextIndex]?.click();
    });
  }

  const renderNrDosar = (row) => `
    <div class="e-permits-workplace__case-cell">
      ${renderCopyCode(row.nrDosar, `Copiază ${row.nrDosar}`)}
      <span class="e-permits-workplace__source">
        <span>Sursă:</span>
        <span>${escapeHtml(row.sursa)}</span>
      </span>
    </div>
  `;

  const renderUserRoles = (roles = []) => {
    const visibleRoles = roles.slice(0, 2);
    const remaining = Math.max(0, roles.length - visibleRoles.length);

    return `
      <div class="e-permits-workplace__user-roles">
        ${visibleRoles.map((role) => renderTag(role, "neutral")).join("")}
        ${remaining ? `<span class="e-permits-workplace__user-role-more" tabindex="0" data-cell-tooltip="${escapeHtml(roles.join(", "))}" data-cell-tooltip-always aria-label="${escapeHtml(`Toate rolurile: ${roles.join(", ")}`)}">+${remaining}</span>` : ""}
      </div>
    `;
  };

  const renderUserCell = (row, key) => {
    switch (key) {
      case "numeComplet":
        return `
          <div class="e-permits-workplace__user-identity">
            <span class="e-permits-workplace__user-avatar" aria-hidden="true">${escapeHtml(row.initiale)}</span>
            <span class="e-permits-workplace__user-name-stack">
              <span>${escapeHtml(row.numeComplet)}</span>
              <span>${escapeHtml(row.functie || row.roluri?.[0] || "Specialist")}</span>
            </span>
          </div>
        `;
      case "idnp":
        return `<span class="e-permits-workplace__user-idnp">${escapeHtml(row.idnp)}</span>`;
      case "status":
        return renderTag(row.status, row.status === "Activ" ? "success" : "neutral");
      case "roluri":
        return renderUserRoles(row.roluri);
      case "ultimaConectare":
        return `
          <span class="e-permits-workplace__date-stack">
            <span>${escapeHtml(formatDate(row.ultimaConectare))}</span>
            <span class="e-permits-workplace__date-meta">${escapeHtml(row.ultimaConectareRelativ || "")}</span>
          </span>
        `;
      case "ultimaActualizare":
        return escapeHtml(formatDate(row.ultimaActualizare));
      default:
        return escapeHtml(row[key] ?? "—");
    }
  };

  const renderTablePerson = (person, subtitle) => {
    if (!person) {
      return '<span class="e-permits-workplace__dash">—</span>';
    }

    return `
      <span class="e-permits-workplace__person">
        <span class="e-permits-workplace__person-avatar" style="background:${escapeHtml(person.color || "#0058d2")}">${escapeHtml(person.initiale || "")}</span>
        <span class="e-permits-workplace__person-copy">
          <span class="e-permits-workplace__person-name">${escapeHtml(person.nume)}</span>
          ${subtitle ? `<span class="e-permits-workplace__person-role">${escapeHtml(subtitle)}</span>` : ""}
        </span>
      </span>
    `;
  };

  const renderSarcinaCell = (row, key) => {
    switch (key) {
      case "nrSarcina":
        return renderCopyCode(row.nrSarcina, `Copiază ${row.nrSarcina}`);
      case "tipSarcina": {
        const tip = workplaceDb.tipSarcina[row.tipSarcina];
        return `<span class="e-permits-workplace__tag e-permits-workplace__tag--${escapeHtml(tip?.tone || "neutral")} e-permits-workplace__tag--icon">
          <svg class="icon" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${escapeHtml(tip?.icon || "checkmark-small")}"></use></svg>
          <span>${escapeHtml(tip?.label || row.tipSarcina)}</span>
        </span>`;
      }
      case "dosar":
        return `
          <div class="e-permits-workplace__case-cell">
            ${renderCopyCode(row.dosarNr, `Copiază ${row.dosarNr}`)}
            <span class="e-permits-workplace__source"><span>Sursă:</span><span>${escapeHtml(row.sursa)}</span></span>
          </div>
        `;
      case "statut": {
        const status = workplaceDb.statuses[row.statut];
        return renderTag(status?.label, status?.tone);
      }
      case "solicitant":
        return escapeHtml(row.numeSolicitant);
      case "dataSemnarii":
        return escapeHtml(formatDate(row.dataSemnarii));
      default:
        return escapeHtml(row[key] ?? "—");
    }
  };

  const renderRoleAdminCell = (row, key) => {
    switch (key) {
      case "denumire":
        return `
          <div class="e-permits-workplace__role-identity">
            <span class="e-permits-workplace__role-name">${escapeHtml(row.denumire)}</span>
            <span class="e-permits-workplace__role-meta">${row.functii.length} permisiuni</span>
          </div>
        `;
      case "descriere":
        return `<span class="e-permits-workplace__role-desc">${escapeHtml(row.descriere)}</span>`;
      case "statut":
        return renderTag(row.activ ? "Activ" : "Inactiv", row.activ ? "success" : "neutral");
      case "eligibilLocal":
        return renderTag(row.eligibilLocal ? "Da" : "Nu", row.eligibilLocal ? "ok" : "neutral");
      case "dataCreare":
        return escapeHtml(formatDate(row.dataCreare));
      default:
        return escapeHtml(row[key] ?? "—");
    }
  };

  const renderCell = (row, key) => {
    if (workplaceDb?.kind === "users") {
      return renderUserCell(row, key);
    }

    if (workplaceDb?.kind === "sarcini") {
      return renderSarcinaCell(row, key);
    }

    if (workplaceDb?.kind === "roles") {
      return renderRoleAdminCell(row, key);
    }

    if (workplaceDb?.kind === "services") {
      return renderServiceCell(row, key);
    }

    if (workplaceDb?.kind === "authorities") {
      return renderAuthorityCell(row, key);
    }

    if (workplaceDb?.kind === "tariffs") {
      return renderTariffCell(row, key);
    }

    if (workplaceDb?.kind === "ntpl") {
      return renderNtplCell(row, key);
    }

    if (workplaceDb?.kind === "classifiers") {
      return renderClassifierCell(row, key);
    }

    switch (key) {
      case "nrDosar":
        return renderNrDosar(row);
      case "decizia": {
        const decision = workplaceDb.decisions[row.decizia];
        return renderTag(decision?.label, decision?.tone);
      }
      case "status": {
        const status = workplaceDb.statuses[row.status];
        return renderTag(status?.label, status?.tone);
      }
      case "alerte":
        return renderAlerts(row.alerte);
      case "solicitant":
        return escapeHtml(row.numeSolicitant);
      case "dataDepunerii":
        return escapeHtml(formatDate(row.dataDepunerii));
      case "termenExaminare":
        return renderTermen(row);
      case "dataSemnarii":
        return escapeHtml(formatDate(row.dataSemnarii));
      case "actBaza":
        return `
          <span class="e-permits-workplace__act-base">
            ${renderCopyCode(row.actBaza?.nr, `Copiază ${row.actBaza?.nr || ""}`)}
            <span>${escapeHtml(row.actBaza?.denumire || "—")}</span>
          </span>
        `;
      case "titular":
        return escapeHtml(row.actBaza?.titular || "—");
      case "initiatDe":
        return renderTablePerson(row.initiatDe);
      case "creatDe":
        return renderTablePerson(row.specialist, row.specialist?.rol || "Specialist");
      default:
        return escapeHtml(row[key] ?? "—");
    }
  };

  const renderServiceGroupRow = (label, colSpan) => `
    <tr class="e-permits-workplace__group-row" data-workplace-group="${escapeHtml(label)}">
      <td colspan="${colSpan}">
        <div class="e-permits-workplace__group-header">
          <svg class="icon" width="20" height="20" aria-hidden="true">
            <use href="assets/icons/sprite.svg#icon-page-text"></use>
          </svg>
          <span>${escapeHtml(label)}</span>
        </div>
      </td>
    </tr>
  `;

  const renderDataRow = (row, columns, columnWidths, view = getView()) => `
    <tr data-workplace-row="${escapeHtml(row.id)}">
      ${view?.selectable === false ? "" : `<td class="e-permits-workplace__select-cell">
        <label class="checkbox checkbox--medium">
          <input class="checkbox-input" type="checkbox" aria-label="Selectează rândul" data-workplace-select-row="${escapeHtml(row.id)}" ${workplaceState.selected.has(row.id) ? "checked" : ""}>
          <span class="checkbox-custom" aria-hidden="true"></span>
        </label>
      </td>`}
      ${columns.map((key) => {
        const column = workplaceDb.columns[key];
        return `<td style="${setColumnWidth(column, columnWidths[key])}" data-column="${escapeHtml(key)}">${renderCell(row, key)}</td>`;
      }).join("")}
    </tr>
  `;

  const renderTableRows = (rows, columns, view, columnWidths) => {
    if (!workplaceRows) {
      return;
    }

    if (!rows.length) {
      const colSpan = columns.length + (view?.selectable === false ? 0 : 1);
      workplaceRows.innerHTML = `
        <tr>
          <td class="e-permits-workplace__empty" colspan="${colSpan}">${appliedEntries().length
            ? renderNoResults("Niciun rezultat pentru filtrele aplicate", { text: "Schimbă filtrele sau șterge-le ca să vezi toată lista.", bare: true, actionHtml: '<button class="btn btn-neutral btn-sm" type="button" data-filter-clear-all>Șterge filtrele</button>' })
            : renderNoResults(view?.emptyMessage || ({ tariffs: "Nu există tarife pentru filtrul curent.", ntpl: "Nu există șabloane pentru filtrul curent.", services: "Nu există servicii pentru filtrul curent.", users: "Nu există utilizatori pentru filtrul curent.", roles: "Nu există roluri pentru filtrul curent.", authorities: "Nu există autorități pentru filtrul curent." })[workplaceDb?.kind] || "Nu sunt dosare pentru filtrul curent.", { text: "Alege alt tab sau caută altceva.", bare: true })}</td>
        </tr>
      `;
      return;
    }

    if (!view?.groupBy) {
      workplaceRows.innerHTML = rows.map((row) => renderDataRow(row, columns, columnWidths, view)).join("");
      return;
    }

    let previousGroup = "";
    const colSpan = columns.length + (view?.selectable === false ? 0 : 1);

    workplaceRows.innerHTML = rows.map((row) => {
      const group = row[view.groupBy] || "Fără serviciu";
      const header = group !== previousGroup ? renderServiceGroupRow(group, colSpan) : "";
      previousGroup = group;

      return `${header}${renderDataRow(row, columns, columnWidths, view)}`;
    }).join("");
  };

  const renderWorkplaceTabs = (view) => {
    if (!workplaceTabs) {
      return;
    }

    const tabs = view?.tabs || [];

    if (!tabs.length) {
      workplaceTabs.hidden = true;
      workplaceTabs.innerHTML = "";
      return;
    }

    const baseRows = getBaseRows(view);
    const activeTab = getActiveTab(view);

    workplaceTabs.hidden = false;
    workplaceTabs.innerHTML = tabs.map((tab) => {
      if (tab.divider) {
        return '<span class="e-permits-workplace__status-divider" aria-hidden="true"></span>';
      }

      /* with advanced filters on, every tab counts inside them (and the search) */
      const filtering = appliedEntries().length > 0;
      const computedCount = baseRows.filter((row) => filterByToken(row, tab.filter) && (!filtering || (filterBySearch(row) && matchesFacets(row)))).length;
      const count = Number.isFinite(tab.displayCount) && !filtering ? tab.displayCount : computedCount;
      const isActive = activeTab?.id === tab.id;

      return `
        <button class="e-permits-workplace__status-tab${isActive ? " is-active" : ""}${tab.tone ? ` e-permits-workplace__status-tab--${escapeHtml(tab.tone)}` : ""}" type="button" role="tab" data-workplace-tab="${escapeHtml(tab.id)}" aria-selected="${isActive ? "true" : "false"}">
          <span class="e-permits-workplace__status-label">${escapeHtml(tab.label)}</span>
          <span class="e-permits-workplace__status-count">${count}</span>
        </button>
      `;
    }).join("");
  };

  const renderPagination = (totalRows, firstRow, lastRow) => {
    if (!workplacePagination) {
      return;
    }

    const pages = Math.max(1, Math.ceil(totalRows / workplaceState.pageSize));
    workplaceState.page = Math.min(workplaceState.page, pages);
    const pageButtons = Array.from({ length: Math.min(pages, 5) }, (_, index) => index + 1);
    const rowOptions = workplacePageSizeOptions.map((option) => (
      `<option value="${option}"${option === workplaceState.pageSize ? " selected" : ""}>${option}</option>`
    )).join("");

    workplacePagination.innerHTML = `
      <div class="e-permits-workplace__pagination-summary">
        <span data-workplace-range>Showing ${firstRow} to ${lastRow} of ${totalRows} results</span>
        <label class="e-permits-workplace__rows-control">
          <span>Rows per page:</span>
          <span class="e-permits-workplace__rows-select">
            <select data-workplace-page-size aria-label="Rows per page">${rowOptions}</select>
            <svg class="icon" width="20" height="20" aria-hidden="true">
              <use href="assets/icons/sprite.svg#icon-chevron-bottom"></use>
            </svg>
          </span>
        </label>
      </div>
      <div class="e-permits-workplace__pagination-pages" aria-label="Pagination">
        <button class="e-permits-workplace__pagination-action" type="button" data-workplace-page="prev" ${workplaceState.page <= 1 ? "disabled" : ""}>
          <svg class="icon" width="20" height="20" aria-hidden="true">
            <use href="assets/icons/sprite.svg#icon-chevron-left-small"></use>
          </svg>
          <span>Previous</span>
        </button>
        <span class="e-permits-workplace__pagination-list">
          ${pageButtons.map((page) => `<button class="e-permits-workplace__pagination-item${page === workplaceState.page ? " is-active" : ""}" type="button" data-workplace-page="${page}" aria-current="${page === workplaceState.page ? "page" : "false"}">${page}</button>`).join("")}
        </span>
        <button class="e-permits-workplace__pagination-action" type="button" data-workplace-page="next" ${workplaceState.page >= pages ? "disabled" : ""}>
          <span>Next</span>
          <svg class="icon" width="20" height="20" aria-hidden="true">
            <use href="assets/icons/sprite.svg#icon-chevron-right-small"></use>
          </svg>
        </button>
      </div>
    `;
  };

  const syncSelectAll = (rows) => {
    if (getView()?.selectable === false) {
      return;
    }

    const selectAll = document.querySelector("[data-workplace-select-all]");

    if (!selectAll) {
      return;
    }

    const visibleIds = rows.map((row) => row.id);
    const selectedCount = visibleIds.filter((id) => workplaceState.selected.has(id)).length;

    selectAll.checked = selectedCount > 0 && selectedCount === visibleIds.length;
    selectAll.indeterminate = selectedCount > 0 && selectedCount < visibleIds.length;
  };

  /* ---- Advanced filter: bar + popover (Figma GEAP 244:14333) ----
     Two layers, so one table query covers many choices:
     - a facet popover edits the bar's DRAFT ("Confirmă" keeps it, Esc / outside click
       drops it) — no query;
     - "Aplică filtrele" in the bar commits the whole draft at once — one query. */
  const filterBar = document.querySelector("[data-workplace-filters]");
  const filterToggle = document.querySelector("[data-workplace-filter-toggle]");
  const filterCount = document.querySelector("[data-workplace-filter-count]");
  const FILTER_INLINE_MAX = 4;
  let filterPopover = null;
  let filterEdit = null; /* { key, values:Set, query, anchor } while a facet popover is open */
  let filterMoreOpen = false;

  const draftOf = () => { const st = getFilterState(); if (!st.draft) st.draft = JSON.parse(JSON.stringify(st.applied)); return st.draft; };
  const sameSelection = (a = {}, b = {}) => {
    const norm = (o) => JSON.stringify(Object.keys(o).filter((k) => o[k]?.length).sort().map((k) => [k, [...o[k]].sort()]));
    return norm(a) === norm(b);
  };
  const filterPending = () => !sameSelection(draftOf(), getFilterState().applied);
  const facetTone = (facet, value) => {
    if (!/^(statut|status)$/.test(facet.key)) return null;
    const fromDb = Object.values(workplaceDb.statuses || {}).find((st) => st.label === value)?.tone;
    return fromDb || { Activ: "success", Activă: "success", Publicat: "success", Inactiv: "neutral", Schiță: "warning", Nepublicat: "warning" }[value] || "neutral";
  };

  let filterBarKind = null;
  const renderFilterBar = () => {
    if (!filterBar) return;
    const state = getFilterState();
    /* arriving on another table: its bar starts closed and an unapplied draft is dropped */
    const page = `${registryKindOf()}:${workplaceState.viewKey || ""}`;
    if (filterBarKind !== page) {
      Object.values(filterStore).forEach((st) => { st.open = false; st.draft = null; });
      filterBarKind = page;
    }
    const draft = draftOf();
    const appliedCount = appliedEntries().reduce((sum, [, values]) => sum + values.length, 0);
    if (filterCount) { filterCount.hidden = !appliedCount; filterCount.textContent = String(appliedCount); }
    const facets = availableFacets();
    /* the chips show only after "Filtrare avansată" is clicked; the button's badge
       keeps telling how many values are applied while the bar is closed */
    const show = (state.open || filterPending()) && facets.length > 0;
    filterBar.hidden = !show;
    if (filterToggle) {
      const none = !facets.length;
      filterToggle.setAttribute("aria-expanded", String(show));
      if (none) { filterToggle.setAttribute("aria-disabled", "true"); filterToggle.dataset.tooltipReason = "Lista nu are încă valori după care să filtrezi."; }
      else { filterToggle.removeAttribute("aria-disabled"); delete filterToggle.dataset.tooltipReason; }
    }
    if (!show) { filterBar.innerHTML = ""; return; }
    /* the first few facets are chips; the rest wait in "Mai multe" until they hold a value */
    const inline = facets.filter((f, i) => i < FILTER_INLINE_MAX || draft[f.key]?.length);
    const more = facets.filter((f) => !inline.includes(f));
    const chip = (facet) => {
      const n = draft[facet.key]?.length || 0;
      const open = filterEdit?.key === facet.key;
      return `<button class="chip${n ? " is-selected" : ""} e-permits-workplace__filter-chip" type="button" aria-haspopup="dialog" aria-expanded="${open}" data-filter-facet="${escapeHtml(facet.key)}"${n ? ` aria-label="${escapeHtml(facet.label)}: ${n} ${n === 1 ? "valoare selectată" : "valori selectate"}"` : ""}>
        <span class="chip__label">${escapeHtml(facet.label)}</span>
        ${n ? `<span class="badge badge--lg badge--solid-light">${n}</span>` : ""}
        <svg class="icon e-permits-workplace__filter-caret" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-${open ? "top" : "bottom"}"></use></svg>
      </button>`;
    };
    const pending = filterPending();
    const total = getVisibleRows().length;
    filterBar.innerHTML = `
      <div class="e-permits-workplace__filter-chips">
        ${inline.map(chip).join("")}
        ${more.length ? `<button class="chip e-permits-workplace__filter-chip" type="button" aria-haspopup="menu" aria-expanded="${filterMoreOpen}" data-filter-more>
          <span class="chip__label">Mai multe</span>
          <svg class="icon e-permits-workplace__filter-caret" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-${filterMoreOpen ? "top" : "bottom"}"></use></svg>
        </button>` : ""}
      </div>
      <div class="e-permits-workplace__filter-meta" aria-live="polite">
        ${pending ? `
          <span class="e-permits-workplace__filter-hint">Filtre neaplicate</span>
          <button class="btn btn-text-neutral btn-sm" type="button" data-filter-discard>Renunță</button>
          <button class="btn btn-primary btn-sm" type="button" data-filter-commit>Aplică filtrele</button>
        ` : appliedCount ? `
          <span class="e-permits-workplace__filter-result">${total === 1 ? "1 rezultat" : `${total} rezultate`}</span>
          <button class="btn btn-text-neutral btn-sm" type="button" data-filter-clear-all>Șterge filtrele</button>
        ` : '<span class="e-permits-workplace__filter-hint">Alege valorile, apoi aplică filtrele.</span>'}
      </div>
    `;
  };

  const ensureFilterPopover = () => {
    if (filterPopover) return;
    filterPopover = document.createElement("div");
    filterPopover.className = "e-permits-fo-intent-menu e-permits-workplace__filter-pop";
    filterPopover.hidden = true;
    document.body.appendChild(filterPopover);
    wireFilterPopover();
  };

  const placeFilterPopover = (anchor) => {
    const r = anchor.getBoundingClientRect();
    const width = filterPopover.offsetWidth;
    filterPopover.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - width - 8))}px`;
    filterPopover.style.top = `${r.bottom + 8}px`;
  };

  const closeFilterPopover = (restoreFocus = true) => {
    if (!filterPopover || filterPopover.hidden) return;
    const key = filterEdit?.key;
    const wasMore = filterMoreOpen;
    filterPopover.hidden = true;
    filterEdit = null;
    filterMoreOpen = false;
    renderFilterBar();
    if (!restoreFocus) return;
    const back = (key && filterBar?.querySelector(`[data-filter-facet="${CSS.escape(key)}"]`)) || ((wasMore || key) && filterBar?.querySelector("[data-filter-more]"));
    back?.focus();
  };

  const renderFilterOptions = () => {
    const facet = facetsOf().find((f) => f.key === filterEdit.key);
    const q = filterEdit.query.trim().toLocaleLowerCase("ro");
    const options = facetOptions(facet).filter((o) => !q || o.value.toLocaleLowerCase("ro").includes(q));
    return options.length ? options.map((o) => {
      const tone = facetTone(facet, o.value);
      return `
        <li>
          <label class="e-permits-workplace__filter-option">
            <span class="checkbox checkbox--medium"><input class="checkbox-input" type="checkbox" value="${escapeHtml(o.value)}"${filterEdit.values.has(o.value) ? " checked" : ""} data-filter-option><span class="checkbox-custom" aria-hidden="true"></span></span>
            ${tone ? renderTag(o.value, tone) : `<span class="e-permits-workplace__filter-option-label">${escapeHtml(o.value)}</span>`}
          </label>
        </li>
      `;
    }).join("") : '<li class="e-permits-workplace__filter-empty">Nicio valoare nu corespunde.</li>';
  };

  const openFilterPopover = (key, anchor) => {
    const facet = facetsOf().find((f) => f.key === key);
    if (!facet) return;
    ensureFilterPopover();
    filterMoreOpen = false;
    filterEdit = { key, values: new Set(draftOf()[key] || []), query: "", anchor };
    const many = facetOptions(facet).length > 7;
    filterPopover.setAttribute("role", "dialog");
    filterPopover.setAttribute("aria-label", `Filtru: ${facet.label}`);
    filterPopover.innerHTML = `
      ${many ? `
        <div class="e-permits-workplace__filter-head">
          <div class="search-input medium rectangular e-permits-workplace__search">
            <span class="icon-search" aria-hidden="true"><svg class="icon" width="20" height="20"><use href="assets/icons/sprite.svg#icon-search"></use></svg></span>
            <input class="input" type="search" placeholder="Caută în ${escapeHtml(facet.label.toLocaleLowerCase("ro"))}" aria-label="Caută în ${escapeHtml(facet.label)}" data-filter-search>
            ${renderSearchActions()}
          </div>
        </div>` : ""}
      <ul class="e-permits-workplace__filter-list" role="list" data-filter-list>${renderFilterOptions()}</ul>
      <div class="e-permits-workplace__filter-footer">
        <button class="btn btn-primary btn-sm" type="button" data-filter-confirm>Confirmă</button>
        <button class="btn btn-neutral btn-sm" type="button" data-filter-reset>
          <svg class="icon" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-cross-small"></use></svg>
          <span>Șterge</span>
        </button>
      </div>
    `;
    filterPopover.hidden = false;
    renderFilterBar();
    placeFilterPopover(filterBar.querySelector(`[data-filter-facet="${CSS.escape(key)}"]`) || filterBar.querySelector("[data-filter-more]") || anchor);
    requestAnimationFrame(() => (filterPopover.querySelector("[data-filter-search]") || filterPopover.querySelector("[data-filter-option]") || filterPopover.querySelector("[data-filter-confirm]"))?.focus());
  };

  const openMoreMenu = (anchor) => {
    ensureFilterPopover();
    filterEdit = null;
    filterMoreOpen = true;
    const facets = availableFacets();
    const draft = draftOf();
    const inline = facets.filter((f, i) => i < FILTER_INLINE_MAX || draft[f.key]?.length);
    filterPopover.setAttribute("role", "menu");
    filterPopover.setAttribute("aria-label", "Mai multe filtre");
    filterPopover.innerHTML = `<div class="e-permits-workplace__filter-list">${facets.filter((f) => !inline.includes(f)).map((f) => `
      <button class="e-permits-workplace__filter-more-item" type="button" role="menuitem" data-filter-more-facet="${escapeHtml(f.key)}">${escapeHtml(f.label)}</button>`).join("")}</div>`;
    filterPopover.hidden = false;
    renderFilterBar();
    placeFilterPopover(filterBar.querySelector("[data-filter-more]") || anchor);
    requestAnimationFrame(() => filterPopover.querySelector("[data-filter-more-facet]")?.focus());
  };

  /* popover "Confirmă": the facet goes into the draft; nothing is queried yet */
  const confirmFacetEdit = () => {
    const draft = draftOf();
    const values = [...filterEdit.values];
    if (values.length) draft[filterEdit.key] = values; else delete draft[filterEdit.key];
    closeFilterPopover();
  };

  /* bar "Aplică filtrele": one query for everything that changed */
  const commitFilters = () => {
    const state = getFilterState();
    state.applied = JSON.parse(JSON.stringify(draftOf()));
    Object.keys(state.applied).forEach((k) => { if (!state.applied[k]?.length) delete state.applied[k]; });
    state.draft = null;
    saveFilterState();
    workplaceState.page = 1;
    renderWorkplace();
    filterBar?.querySelector("[data-filter-clear-all], [data-filter-facet]")?.focus();
  };

  const discardFilterDraft = () => { getFilterState().draft = null; renderFilterBar(); };

  const clearAllFilters = () => {
    const state = getFilterState();
    state.applied = {};
    state.draft = null;
    saveFilterState();
    workplaceState.page = 1;
    renderWorkplace();
  };

  function wireFilterPopover() {
    filterPopover.addEventListener("change", (event) => {
      const box = event.target.closest("[data-filter-option]");
      if (!box || !filterEdit) return;
      if (box.checked) filterEdit.values.add(box.value); else filterEdit.values.delete(box.value);
    });
    filterPopover.addEventListener("input", (event) => {
      if (!event.target.closest("[data-filter-search]") || !filterEdit) return;
      filterEdit.query = event.target.value;
      filterPopover.querySelector("[data-filter-list]").innerHTML = renderFilterOptions();
    });
    filterPopover.addEventListener("click", (event) => {
      const moreFacet = event.target.closest("[data-filter-more-facet]");
      if (moreFacet) { openFilterPopover(moreFacet.dataset.filterMoreFacet, filterBar.querySelector("[data-filter-more]")); return; }
      if (!filterEdit) return;
      if (event.target.closest("[data-filter-confirm]")) { confirmFacetEdit(); return; }
      if (event.target.closest("[data-filter-reset]")) {
        filterEdit.values.clear();
        filterPopover.querySelectorAll("[data-filter-option]").forEach((box) => { box.checked = false; });
      }
    });
    filterPopover.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { event.preventDefault(); closeFilterPopover(); return; }
      if (event.key === "Enter" && filterEdit && !event.target.closest("button")) { event.preventDefault(); confirmFacetEdit(); }
    });
  }

  filterToggle?.addEventListener("click", () => {
    if (filterToggle.getAttribute("aria-disabled") === "true") return;
    const state = getFilterState();
    const visible = !filterBar.hidden;
    if (visible && filterPending()) { filterBar.querySelector("[data-filter-commit]")?.focus(); return; }
    state.open = !visible;
    saveFilterState();
    renderFilterBar();
    if (state.open) filterBar.querySelector("[data-filter-facet]")?.focus();
  });

  filterBar?.addEventListener("click", (event) => {
    if (event.target.closest("[data-filter-clear-all]")) { clearAllFilters(); return; }
    if (event.target.closest("[data-filter-commit]")) { commitFilters(); return; }
    if (event.target.closest("[data-filter-discard]")) { discardFilterDraft(); return; }
    const more = event.target.closest("[data-filter-more]");
    if (more) { if (filterMoreOpen) closeFilterPopover(); else openMoreMenu(more); return; }
    const chip = event.target.closest("[data-filter-facet]");
    if (!chip) return;
    if (filterEdit?.key === chip.dataset.filterFacet) { closeFilterPopover(); return; }
    openFilterPopover(chip.dataset.filterFacet, chip);
  });

  /* the empty-table "Șterge filtrele" lives in the table body */
  document.addEventListener("click", (event) => {
    const clear = event.target.closest("[data-filter-clear-all]");
    if (clear && !filterBar?.contains(clear)) { event.stopPropagation(); clearAllFilters(); }
  });

  /* outside click / resize / table scroll cancel the open popover (the draft stays) */
  document.addEventListener("pointerdown", (event) => {
    if (!filterPopover || filterPopover.hidden) return;
    if (filterPopover.contains(event.target) || event.target.closest("[data-filter-facet], [data-filter-more]")) return;
    closeFilterPopover(false);
  });
  window.addEventListener("resize", () => closeFilterPopover(false));
  document.querySelector(".e-permits-workplace__table-wrap")?.addEventListener("scroll", () => closeFilterPopover(false), { passive: true });

  const renderWorkplace = () => {
    if (!workplaceDb || !workplaceTable) {
      return;
    }

    const view = getView();
    const activeTab = getActiveTab(view);

    if (!view) {
      return;
    }

    if (workplaceTitle) {
      workplaceTitle.textContent = view.title;
    }

    const isUsersRegistry = workplaceDb.kind === "users";
    workplacePanel?.classList.toggle("is-users-registry", isUsersRegistry);

    if (workplacePanel) {
      workplacePanel.dataset.registryKind = workplaceDb.kind || "dossiers";
    }
    shell.classList.toggle("is-users-registry", isUsersRegistry);
    workplaceToolbar?.setAttribute(
      "aria-label",
      workplaceDb.kind === "users" ? "Filtrare utilizatori" : "Filtrare dosare"
    );

    if (workplaceSearch) {
      workplaceSearch.placeholder = workplaceDb.kind === "users"
        ? "Căutare rapidă după denumire, cod sau instituție"
        : "Căutare rapidă după denumire, cod sau instituție";
      workplaceSearch.value = workplaceState.query;
    }

    if (workplaceAddUser) {
      workplaceAddUser.hidden = workplaceDb.kind !== "users";
    }

    if (workplaceSyncService) {
      /* US-111: synchronisation is reserved to Administrator central */
      workplaceSyncService.hidden = workplaceDb.kind !== "services" || !isCentralAdmin();
    }

    const workplaceAddTariff = document.querySelector("[data-workplace-add-tariff]");
    if (workplaceAddTariff) {
      workplaceAddTariff.hidden = workplaceDb.kind !== "tariffs" || !isCentralAdmin();
    }

    const workplaceAddNtpl = document.querySelector("[data-workplace-add-ntpl]");
    if (workplaceAddNtpl) {
      workplaceAddNtpl.hidden = workplaceDb.kind !== "ntpl" || !isCentralAdmin();
    }

    const workplaceAddClassifier = document.querySelector("[data-workplace-add-classifier]");
    if (workplaceAddClassifier) {
      workplaceAddClassifier.hidden = workplaceDb.kind !== "classifiers";
    }

    if (workplaceFieldCount) {
      workplaceFieldCount.innerHTML = `<strong>${workplaceDb.fieldCount || view.columns.length}</strong> câmpuri`;
    }

    const filteredRows = getVisibleRows();
    const columnWidths = getColumnWidths(view.columns, filteredRows);
    const tableWidth = view.columns.reduce(
      (sum, key) => sum + columnWidths[key],
      view.selectable === false ? 0 : selectColumnWidth
    );

    workplaceTable.style.width = `${tableWidth}px`;

    renderWorkplaceTabs(view);
    renderFilterBar();
    renderTableHead(view.columns, columnWidths);

    const startIndex = (workplaceState.page - 1) * workplaceState.pageSize;
    const visibleRows = filteredRows.slice(startIndex, startIndex + workplaceState.pageSize);

    if (workplaceTotal) {
      workplaceTotal.textContent = String(filteredRows.length);
    }

    const first = filteredRows.length ? startIndex + 1 : 0;
    const last = Math.min(startIndex + visibleRows.length, filteredRows.length);

    renderTableRows(visibleRows, view.columns, view, columnWidths);
    renderPagination(filteredRows.length, first, last);
    syncSelectAll(visibleRows);

    const activeLabel = activeTab ? `, ${activeTab.label}` : "";
    workplaceTable.setAttribute("aria-label", `${view.title}${activeLabel}`);
  };

  const setWorkplaceView = (viewKey) => {
    shell.classList.remove("is-service-profile-open");
    document.querySelector("[data-service-profile-back-shell]")?.setAttribute("hidden", "");
    if (dossierDb) {
      activeRegistry = "dossiers";
      workplaceDb = dossierDb;
      workplaceState.rows = dossierDb.runtimeRows || [];
    }

    const view = getView(viewKey);

    if (!view) {
      return;
    }

    workplaceState.viewKey = viewKey;
    workplaceState.tabKey = view.defaultTab || (view.tabs || []).find((tab) => !tab.divider)?.id || null;
    workplaceState.page = 1;
    if (!view.columns.includes(workplaceState.sortKey)) {
      workplaceState.sortKey = view.columns.includes("dataDepunerii") ? "dataDepunerii" : null;
      workplaceState.sortDirection = "desc";
    }
    workplaceState.selected.clear();

    if (workplacePanel) {
      workplacePanel.hidden = false;
    }

    if (permitsProfilePanel) {
      permitsProfilePanel.hidden = true;
    }

    if (userProfilePanel) {
      userProfilePanel.hidden = true;
    }

    if (userProfileBackShell) {
      userProfileBackShell.hidden = true;
    }

    shell.classList.remove("is-user-profile-open");

    if (workplaceRefresh) {
      workplaceRefresh.hidden = false;
    }

    document.querySelectorAll("[data-workplace-view]").forEach((link) => {
      const isActive = link.dataset.workplaceView === viewKey;
      link.classList.toggle("is-active", isActive);

      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    renderWorkplace();
  };

  const showUsersRegistry = () => {
    shell.classList.remove("is-service-profile-open");
    document.querySelector("[data-service-profile-back-shell]")?.setAttribute("hidden", "");
    if (!usersDb) {
      showRolePlaceholder("Utilizatori");
      return;
    }

    activeRegistry = "users";
    workplaceDb = usersDb;
    workplaceState.rows = usersDb.runtimeRows || [];
    workplaceState.viewKey = "users";
    workplaceState.tabKey = null;
    workplaceState.query = "";
    workplaceState.page = 1;
    workplaceState.pageSize = 16;
    workplaceState.sortKey = null;
    workplaceState.sortDirection = "desc";
    workplaceState.selected.clear();

    if (workplacePanel) {
      workplacePanel.hidden = false;
    }

    if (permitsProfilePanel) {
      permitsProfilePanel.hidden = true;
    }

    if (userProfilePanel) {
      userProfilePanel.hidden = true;
    }

    if (userProfileBackShell) {
      userProfileBackShell.hidden = true;
    }

    shell.classList.remove("is-user-profile-open");

    if (workplaceRefresh) {
      workplaceRefresh.hidden = false;
    }

    renderWorkplace();
  };

  const showSarciniRegistry = () => {
    if (!sarciniDb) {
      showRolePlaceholder("Sarcinile mele");
      return;
    }

    activeRegistry = "sarcini";
    workplaceDb = sarciniDb;
    workplaceState.rows = sarciniDb.runtimeRows || [];
    workplaceState.viewKey = "sarcini";
    workplaceState.tabKey = sarciniDb.views.sarcini.defaultTab;
    workplaceState.query = "";
    workplaceState.page = 1;
    workplaceState.pageSize = 16;
    workplaceState.sortKey = null;
    workplaceState.sortDirection = "desc";
    workplaceState.selected.clear();

    if (workplacePanel) {
      workplacePanel.hidden = false;
    }

    if (permitsProfilePanel) {
      permitsProfilePanel.hidden = true;
    }

    if (userProfilePanel) {
      userProfilePanel.hidden = true;
    }

    if (userProfileBackShell) {
      userProfileBackShell.hidden = true;
    }

    if (dosarProfilPanel) {
      dosarProfilPanel.hidden = true;
    }

    if (dosarProfilBackShell) {
      dosarProfilBackShell.hidden = true;
    }

    shell.classList.remove("is-user-profile-open");
    shell.classList.remove("is-dosar-profile-open");

    if (workplaceRefresh) {
      workplaceRefresh.hidden = false;
    }

    renderWorkplace();
  };

  const showRolesRegistry = () => {
    shell.classList.remove("is-service-profile-open");
    document.querySelector("[data-service-profile-back-shell]")?.setAttribute("hidden", "");
    if (!roleAdminDb) {
      showRolePlaceholder("Roluri");
      return;
    }

    activeRegistry = "roles";
    workplaceDb = roleAdminDb;
    workplaceState.rows = roleAdminDb.runtimeRows || [];
    workplaceState.viewKey = "roles";
    workplaceState.tabKey = null;
    workplaceState.query = "";
    workplaceState.page = 1;
    workplaceState.pageSize = 16;
    workplaceState.sortKey = null;
    workplaceState.sortDirection = "desc";
    workplaceState.selected.clear();

    if (workplacePanel) {
      workplacePanel.hidden = false;
    }

    [permitsProfilePanel, userProfilePanel, userProfileBackShell, dosarProfilPanel, dosarProfilBackShell, roleProfilePanel, roleProfileBackShell].forEach((panel) => {
      if (panel) {
        panel.hidden = true;
      }
    });

    shell.classList.remove("is-user-profile-open");
    shell.classList.remove("is-dosar-profile-open");
    shell.classList.remove("is-role-profile-open");

    if (workplaceRefresh) {
      workplaceRefresh.hidden = false;
    }

    renderWorkplace();
  };

  /* ==========================================================================
     Pașaportul Serviciului — Feature 90575, US-111, Feature 93591.
     Rules live in core/service-passport.js (GEAP.servicePassport); this block
     only renders and wires. Registries (Servicii, Autorități) run on the shared
     workplace engine; the profile is the shared page header + 10 tabs, drawn
     into the .permits-profile panel.
     ========================================================================== */
  const passport = window.GEAP?.servicePassport || null;
  const serviceProfileBackShell = document.querySelector("[data-service-profile-back-shell]");
  let servicesStore = null;
  let servicesDb = null;
  let authoritiesDb = null;
  let servicesRegistryLabel = "Configurări servicii";
  const serviceProfileState = { code: null, tabKey: "general", focusCode: null };

  /* the former Plăți și tarife and Tarife tabs are now Taxe; old links still land there */
  const normalizePassportTab = (tabKey) => {
    if (tabKey === "payments" || tabKey === "tariffs") {
      return "fees";
    }
    /* Interdependențe moved into Setări (feedback 2026-10-07: few services use it) */
    if (tabKey === "dependencies") {
      return "settings";
    }
    return SERVICE_PROFILE_TABS.some((tab) => tab.id === tabKey) ? tabKey : "general";
  };

  const SERVICE_STATUS_TONES = { Publicat: "success", Nepublicat: "warning", Inactiv: "neutral" };

  const SERVICE_PROFILE_TABS = [
    { id: "general", label: "Date generale", icon: "page-text" },
    /* US-221 AC-05: Setări sits right after Date generale */
    { id: "settings", label: "Setări" },
    { id: "request-types", label: "Tipuri solicitări", count: (service) => service.geap.requestTypes.length },
    { id: "forms", label: "Formulare", count: (service) => service.geap.forms.length },
    /* Documente însoțitoare left Date generale for their own tab (feedback 2026-10-07):
       document settings will grow there */
    { id: "documents", label: "Documente", count: (service) => service.rssp.documents.length },
    /* Taxe = tariffs + their application rules in one place (revised 2026-10-02: a tax is
       a tariff plus the rule RSSP / eAPL do not carry). Count = taxes + tariffs to configure */
    { id: "fees", label: "Taxe și tarife", count: (service) => serviceTaxes(service).length + unconfiguredServiceTariffs(service).length },
    { id: "classifiers", label: "Clasificatoare specifice", count: (service) => service.geap.classifiers.length },
    { id: "templates", label: "Șabloane", count: (service) => service.geap.templates.length },
    { id: "notifications", label: "Notificări", count: (service) => (service.geap.notificationTemplates || []).length },
    { id: "events", label: "Jurnal de evenimente", count: (service) => serviceEventLog(service).length }
  ];

  const isCentralAdmin = () =>
    getRoleAssignments().find((assignment) => assignment.id === activeAssignmentId)?.menuProfile === "central-admin";

  const currentUserName = () =>
    document.querySelector(".e-permits-shell__user-name")?.textContent.trim() || "Anastasia Cojocaru";

  const pad2 = (value) => String(value).padStart(2, "0");

  const localIsoNow = () => {
    const now = new Date();
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}T${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
  };

  /* Passport dates are written out ("22 aprilie 2026"); the time goes on a
     small second line (the dosar list's date stack). formatStamp is the
     one-line form for captions and labels. */
  const RO_MONTHS = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];

  const toDate = (value) => {
    /* no value is no date (new Date(null) would be 1 Jan 1970) */
    if (value === null || value === undefined || value === "") return null;
    /* "yyyy-mm-dd" alone would parse as UTC midnight; read it as a local day */
    const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T00:00:00` : value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatLongDate = (value) => {
    const date = toDate(value);
    return date ? `${date.getDate()}\u00a0${RO_MONTHS[date.getMonth()]}\u00a0${date.getFullYear()}` : "—";
  };

  const formatTime = (value) => {
    const date = toDate(value);
    return date ? `${pad2(date.getHours())}:${pad2(date.getMinutes())}` : "";
  };

  const formatStamp = (value) => (toDate(value) ? `${formatLongDate(value)}, ${formatTime(value)}` : "—");

  /* "Anastasia Cojocaru" → "A. Cojocaru" for narrow table cells */
  const shortName = (name) => {
    /* system actors ("Sincronizare eAPL", "Job zilnic") are not person names */
    if (/^(Sincronizare|Job|Sistem)\b/.test(String(name || ""))) return String(name);
    const parts = String(name || "").trim().split(/\s+/);
    return parts.length > 1 ? `${parts[0][0]}. ${parts.slice(1).join(" ")}` : parts[0] || "";
  };

  /* date over "hh:mm · who" in 12/16 tertiary. `short` abbreviates the first
     name for table cells; the full name stays in the tooltip. */
  const renderDateTime = (value, author = "", { short = false } = {}) => (toDate(value) ? `
    <span class="e-permits-workplace__date-stack">
      <span>${escapeHtml(formatLongDate(value))}</span>
      <span class="e-permits-workplace__date-meta"${author ? ` title="${escapeHtml(author)}"` : ""}>${escapeHtml([formatTime(value), short ? shortName(author) : author].filter(Boolean).join(" · "))}</span>
    </span>
  ` : '<span class="e-permits-workplace__dash">—</span>');

  const getServiceByCode = (code) => servicesStore?.services.find((service) => service.code === code) || null;
  const getAuthorityById = (id) => servicesStore?.authorities.find((authority) => authority.id === id) || null;
  const getFlowById = (id) => servicesStore?.flows.find((flow) => flow.id === id) || null;

  /* flows exported from the process designer carry their JSON definition:
     the steps/actions (and the schema view) are derived from it, and the form
     names it uses join the process-form catalogue */
  const loadFlowDefinitions = async () => {
    await Promise.all((servicesStore?.flows || []).filter((flow) => flow.definitionUrl).map(async (flow) => {
      try {
        const response = await fetch(flow.definitionUrl, { cache: "no-store" });
        if (!response.ok) return;
        flow.definition = await response.json();
        flow.steps = passport.stepsFromDefinition(flow.definition);
        flow.paymentMoments = passport.momentsFromDefinition(flow.definition);
        passport.definitionForms(flow.definition).forEach((name) => {
          if (!servicesStore.processForms.some((form) => form.id === name)) {
            servicesStore.processForms.push({ id: name, name });
          }
        });
      } catch (error) {
        console.warn(error);
      }
    }));
  };

  const serviceRow = (service) => ({
    id: service.code,
    cod: service.code,
    denumire: service.title,
    institutie: getAuthorityById(service.authorityId)?.name || "—",
    autoritateCod: getAuthorityById(service.authorityId)?.code || "",
    statut: service.status,
    versiune: service.geap?.version || "—",
    sursa: (service.syncSources || ["RSSP"]).join(" + "),
    actualizat: service.lastSync,
    actualizatDe: service.syncedBy || "",
    actiuni: ""
  });

  const authorityRow = (authority) => ({
    id: authority.id,
    denumire: authority.name,
    idno: authority.idno,
    cod: authority.code || "—",
    servicii: servicesStore.services.filter((service) => service.authorityId === authority.id).length,
    sursa: authority.source || "RSSP"
  });

  const buildServicesDb = () => ({
    kind: "services",
    fieldCount: 7,
    /* the Dosare layout: ID column (code + source) first, name on its own */
    columns: {
      cod: { label: "Cod serviciu RSSP", width: 156, sticky: true, sortable: true },
      denumire: { label: "Act permisiv", width: 260, fill: true, sortable: true },
      institutie: { label: "Instituția", width: 240, sortable: true },
      statut: { label: "Statut", width: 116, sortable: true },
      versiune: { label: "Versiune", width: 100, sortable: true },
      actualizat: { label: "Ultima actualizare", width: 180, sortable: true },
      actiuni: { label: "", width: 104 }
    },
    views: {
      services: {
        title: servicesRegistryLabel,
        selectable: false,
        columns: ["cod", "denumire", "institutie", "statut", "versiune", "actualizat", "actiuni"],
        tabs: [
          { id: "all", label: "Toate", filter: "all" },
          { id: "published", label: "Publicate", filter: "svc:Publicat" },
          { id: "unpublished", label: "Nepublicate", filter: "svc:Nepublicat" },
          { id: "inactive", label: "Inactive", filter: "svc:Inactiv" }
        ]
      }
    },
    runtimeRows: servicesStore.services.map(serviceRow)
  });

  const buildAuthoritiesDb = () => ({
    kind: "authorities",
    fieldCount: 5,
    columns: {
      denumire: { label: "Denumire", width: 360, fill: true, sortable: true },
      idno: { label: "IDNO", width: 160 },
      cod: { label: "Cod", width: 104 },
      servicii: { label: "Servicii", width: 104, sortable: true },
      sursa: { label: "Sursă", width: 104 }
    },
    views: {
      authorities: {
        title: "Autorități",
        selectable: false,
        columns: ["denumire", "idno", "cod", "servicii", "sursa"]
      }
    },
    runtimeRows: servicesStore.authorities.map(authorityRow)
  });

  /* Tarife — the tariff classifier (Feature 94153). For now the registry and
     the redirect from a service's Taxe tab; the editor comes later. */
  const tariffRow = (tariff) => ({
    id: tariff.id,
    cod: tariff.code,
    sursa: tariff.source || "GEAP",
    denumire: tariff.name,
    valoare: tariff.formula ? `Formulă · ${formulaReadable(tariff.expression)}` : `${tariff.amount} ${tariff.currency}`,
    domeniu: tariff.scope === "global" ? "Global" : (getServiceByCode(tariff.scope)?.title || tariff.scope),
    tip: tariff.type || "",
    formula: tariff.formula ? (tariff.userVariables ? "Da, cu variabile" : "Da") : "Nu",
    statut: tariff.state === "Publicat" ? (tariff.active ? "Activ" : "Inactiv") : tariff.state,
    actualizat: tariff.modifiedAt,
    actualizatDe: tariff.modifiedBy || "",
    actiuni: ""
  });

  const buildTariffsDb = () => ({
    kind: "tariffs",
    fieldCount: 8,
    columns: {
      cod: { label: "Cod tarif", width: 132, sticky: true, sortable: true },
      denumire: { label: "Denumire", width: 260, fill: true, sortable: true },
      valoare: { label: "Valoare", width: 104, sortable: true },
      domeniu: { label: "Domeniu", width: 200, sortable: true },
      formula: { label: "Formulă", width: 128 },
      statut: { label: "Statut", width: 104, sortable: true },
      actualizat: { label: "Ultima actualizare", width: 180, sortable: true },
      actiuni: { label: "", width: 64 }
    },
    views: {
      tariffs: {
        title: "Tarife",
        selectable: false,
        columns: ["cod", "denumire", "valoare", "domeniu", "formula", "statut", "actualizat", "actiuni"],
        tabs: [
          { id: "all", label: "Toate", filter: "all" },
          { id: "active", label: "Active", filter: "svc:Activ" },
          { id: "draft", label: "Schiță", filter: "svc:Schiță" },
          { id: "inactive", label: "Inactive", filter: "svc:Inactiv" }
        ]
      }
    },
    runtimeRows: (servicesStore.tariffs || []).map(tariffRow)
  });

  const TARIFF_STATUS_TONES = { Activ: "success", Inactiv: "neutral", "Schiță": "warning" };

  const renderTariffCell = (row, key) => {
    switch (key) {
      case "cod":
        return `
          <div class="e-permits-workplace__case-cell">
            ${renderCopyCode(row.cod, `Copiază ${row.cod}`)}
            <span class="e-permits-workplace__source"><span>Sursă:</span><span>${escapeHtml(row.sursa)}</span></span>
          </div>
        `;
      case "denumire":
        return `<span class="e-permits-passport__name" data-cell-tooltip="${escapeHtml(row.denumire)}">${escapeHtml(row.denumire)}</span>`;
      case "statut":
        return renderTag(row.statut, TARIFF_STATUS_TONES[row.statut] || "neutral");
      case "actualizat":
        return renderDateTime(row.actualizat, row.actualizatDe);
      case "actiuni":
        return `
          <span class="e-permits-workplace__row-actions">
            <button class="btn btn-neutral btn-sm btn-icon-only" type="button" data-tariff-edit="${escapeHtml(row.id)}" aria-label="Editează tariful ${escapeHtml(row.denumire)}" title="Editează">
              <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-edit"></use></svg>
            </button>
          </span>
        `;
      default:
        return escapeHtml(row[key] ?? "—");
    }
  };

  const refreshServiceRegistries = () => {
    if (!servicesStore) {
      return;
    }

    servicesDb = buildServicesDb();
    authoritiesDb = buildAuthoritiesDb();

    if (activeRegistry === "services") {
      workplaceDb = servicesDb;
      workplaceState.rows = servicesDb.runtimeRows;
      renderWorkplace();
    } else if (activeRegistry === "authorities") {
      workplaceDb = authoritiesDb;
      workplaceState.rows = authoritiesDb.runtimeRows;
      renderWorkplace();
    }
  };

  const renderServiceCell = (row, key) => {
    switch (key) {
      /* the Dosare ID cell: copyable code over "Sursă: RSSP" */
      case "cod":
        return `
          <div class="e-permits-workplace__case-cell">
            ${renderCopyCode(row.cod, `Copiază ${row.cod}`)}
            <span class="e-permits-workplace__source">
              <span>Sursă:</span>
              <span>${escapeHtml(row.sursa)}</span>
            </span>
          </div>
        `;
      case "denumire":
        return `<span class="e-permits-passport__name" data-cell-tooltip="${escapeHtml(row.denumire)}">${escapeHtml(row.denumire)}</span>`;
      /* abbreviation over full institution name (as in RAP) */
      case "institutie":
        return `
          <span class="e-permits-workplace__user-name-stack e-permits-workplace__service-stack">
            <span data-cell-tooltip="${escapeHtml(row.autoritateCod || row.institutie)}">${escapeHtml(row.autoritateCod || row.institutie)}</span>
            <span data-cell-tooltip="${escapeHtml(row.institutie)}">${escapeHtml(row.institutie)}</span>
          </span>
        `;
      case "statut":
        return renderTag(row.statut, SERVICE_STATUS_TONES[row.statut] || "neutral");
      case "actualizat":
        return renderDateTime(row.actualizat, row.actualizatDe);
      case "actiuni":
        return `
          <span class="e-permits-workplace__row-actions">
            ${isCentralAdmin() ? `
              <button class="btn btn-neutral btn-sm btn-icon-only" type="button" data-service-row-sync="${escapeHtml(row.cod)}" aria-label="Sincronizare din RSSP: ${escapeHtml(row.denumire)}" title="Sincronizare din RSSP">
                <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-rotate-arrow"></use></svg>
              </button>
            ` : ""}
            <button class="btn btn-neutral btn-sm btn-icon-only" type="button" data-service-row-open="${escapeHtml(row.cod)}" aria-label="Actualizare configurație: ${escapeHtml(row.denumire)}" title="Actualizare configurație">
              <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-edit"></use></svg>
            </button>
          </span>
        `;
      default:
        return escapeHtml(row[key] ?? "—");
    }
  };

  const renderAuthorityCell = (row, key) => {
    switch (key) {
      case "denumire":
        return `<span class="e-permits-passport__name">${escapeHtml(row.denumire)}</span>`;
      case "idno":
        return renderCopyCode(row.idno, `Copiază IDNO ${row.idno}`);
      case "sursa":
        return renderTag(row.sursa, "neutral");
      default:
        return escapeHtml(String(row[key] ?? "—"));
    }
  };

  const hideProfilePanels = () => {
    [userProfilePanel, userProfileBackShell, dosarProfilPanel, dosarProfilBackShell, roleProfilePanel, roleProfileBackShell].forEach((panel) => {
      if (panel) {
        panel.hidden = true;
      }
    });
    shell.classList.remove("is-user-profile-open", "is-dosar-profile-open", "is-role-profile-open", "is-users-registry", "is-service-profile-open", "is-ntpl-profile-open");
    document.querySelectorAll("[data-ntpl-profile], [data-ntpl-profile-back-shell], [data-clas-profile], [data-clas-profile-back-shell]").forEach((panel) => { panel.hidden = true; });
    shell.classList.remove("is-clas-profile-open");

    if (serviceProfileBackShell) {
      serviceProfileBackShell.hidden = true;
    }
  };

  const showServiceRegistry = (kind, label) => {
    if (!servicesStore) {
      showRolePlaceholder(label || "Servicii");
      return;
    }

    if (kind === "services") {
      servicesRegistryLabel = label || servicesRegistryLabel;
      servicesDb = buildServicesDb();
    } else if (kind === "authorities") {
      authoritiesDb = buildAuthoritiesDb();
    }

    const db = kind === "services" ? servicesDb : kind === "tariffs" ? buildTariffsDb() : kind === "ntpl" ? buildNtplDb() : authoritiesDb;
    activeRegistry = kind;
    workplaceDb = db;
    workplaceState.rows = db.runtimeRows;
    workplaceState.viewKey = kind;
    workplaceState.tabKey = null;
    workplaceState.query = "";
    workplaceState.page = 1;
    workplaceState.pageSize = 16;
    workplaceState.sortKey = null;
    workplaceState.sortDirection = "desc";
    workplaceState.selected.clear();
    serviceProfileState.code = null;

    hideProfilePanels();

    if (permitsProfilePanel) {
      permitsProfilePanel.hidden = true;
    }

    if (workplacePanel) {
      workplacePanel.hidden = false;
    }

    if (workplaceRefresh) {
      workplaceRefresh.hidden = false;
    }

    renderWorkplace();
  };

  /* ---- profile ----------------------------------------------------------- */

  const renderPassportSection = (title, rows, tag) => `
    <section class="e-permits-dosar-profil__section">
      <h2 class="e-permits-dosar-profil__section-title">${escapeHtml(title)}${tag ? `<span class="e-permits-workplace__tag e-permits-workplace__tag--neutral">${escapeHtml(tag)}</span>` : ""}</h2>
      <div class="e-permits-dosar-profil__card">
        ${rows.map(([label, valueHtml]) => `
          <div class="e-permits-dosar-profil__row">
            <span class="e-permits-dosar-profil__row-label" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
            <span class="e-permits-dosar-profil__row-value">${valueHtml}</span>
          </div>
        `).join("")}
      </div>
    </section>
  `;

  /* ---- Setări: the service's process switches (Feature 90575) ------------------
     One compact bordered card (actionable = the white form card, not the grey read-only
     one): the product toggle first, the label
     and one short line on what it changes. A change goes into the service draft at
     once (header "Modificări nepublicate"); the Publică modal lists every switch that
     changed ("Ce s-a modificat") — that is the confirmation, not a modal per switch.
     Filed cases keep their flow. */
  const SERVICE_SETTINGS = [
    ["actHartie", "Act pe suport de hârtie", "Actul semnat se tipărește și se eliberează și pe hârtie."],
    ["aprobareSecundara", "Aprobare secundară", "Proiectul actului trece la coordonare înainte de semnare."],
    ["cuExpertiza", "Cu expertiză", "Dosarul cere avizul altor autorități înainte de decizie."],
    ["cuPlata", "Cu plată", "Dosarul așteaptă achitarea notei de plată în MPay."],
    ["distribuireAutomata", "Distribuire automată", "Dosarele noi se repartizează specialiștilor fără supervizor."],
    ["mdelivery", "Livrare prin MDelivery", "Actul pe hârtie se livrează la adresa solicitantului."],
    ["suspendareCoordonare", "Suspendare cu coordonare", "Suspendarea termenului se aprobă de supervizor."]
  ];
  /* the toggle's knob transition (css/e-permits-shell.css .e-permits-toggle__knob) */
  const SERVICE_SETTING_SLIDE_MS = 220;
  const SERVICE_SETTING_LABELS = Object.fromEntries(SERVICE_SETTINGS.map(([key, label]) => [key, label]));

  /* the switches start from the configured settings (avize, suspension, distribution, taxes) */
  const serviceSettingFlags = (service) => {
    const geap = service.geap;
    if (!geap.flags) {
      const settings = geap.settings || {};
      geap.flags = {
        actHartie: false,
        aprobareSecundara: false,
        cuExpertiza: Boolean(settings.avize?.length),
        cuPlata: serviceTaxes(service).length > 0,
        distribuireAutomata: /^Da/.test(settings.autoDistribution || ""),
        mdelivery: false,
        suspendareCoordonare: /^Da/.test(settings.suspension || "")
      };
    }
    return geap.flags;
  };

  /* Empty state — the shared component (js/empty-state.js, css/empty-state.css) */
  const renderEmptyState = (options) => window.GEAPEmptyState.render(options);
  const renderNoResults = (title, options) => window.GEAPEmptyState.noResults(title, options);

  const renderPassportEmpty = (title, message, actionHtml = "", icon = "page-text") => `
    <section class="e-permits-dosar-profil__section">
      <div class="e-permits-dosar-profil__section-heading">
        <h2 class="e-permits-dosar-profil__section-title">${escapeHtml(title)}</h2>
      </div>
      ${renderEmptyState({ text: message, actionHtml, icon })}
    </section>
  `;

  const yesNo = (value) => (value
    ? `<span class="e-permits-workplace__tag e-permits-workplace__tag--success e-permits-workplace__tag--icon"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-checkmark-small"></use></svg>Da</span>`
    : renderTag("Nu", "neutral"));

  /* applicant types get a filled icon so PF / PJ read at a glance (user, 2026-10-09):
     person = persoană fizică, suitcase = persoană juridică (central icon system, filled) */
  const applicantIcon = (label) => /fizic|^PF/i.test(label) ? "person-filled" : /juridic|^PJ/i.test(label) ? "suitcase-filled" : "";
  const applicantTags = (items) => (items?.length
    ? `<span class="e-permits-passport__tag-list">${items.map((item) => { const icon = applicantIcon(item); return icon
      ? `<span class="e-permits-workplace__tag e-permits-workplace__tag--neutral e-permits-workplace__tag--icon"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${icon}"></use></svg>${escapeHtml(item)}</span>`
      : renderTag(item, "neutral"); }).join("")}</span>`
    : '<span class="e-permits-workplace__dash">—</span>');

  /* value lists use the same Medium tag as every other tag outside tables */
  const valueTags = (items) => (items?.length
    ? `<span class="e-permits-passport__tag-list">${items.map((item) => renderTag(item, "neutral")).join("")}</span>`
    : '<span class="e-permits-workplace__dash">—</span>');

  /* Documente tab: for each RSSP document GEAP configures Vizibilitatea („Afișează” — the
     applicant sees it in the request) and Obligativitatea („Obligatoriu”); RSSP's own value
     stays read-only in the row (US-225). Overrides in geap.documentVisible /
     geap.documentRequired, keyed by title. A hidden document is never required. */
  const serviceDocVisible = (service, doc) => service.geap.documentVisible?.[doc.title] ?? true;
  const serviceDocRequired = (service, doc) => serviceDocVisible(service, doc) && (service.geap.documentRequired?.[doc.title] ?? Boolean(doc.required));

  const renderServiceDocuments = (service) => {
    const admin = isCentralAdmin();
    const docs = service.rssp.documents;
    const required = docs.filter((doc) => serviceDocRequired(service, doc)).length;
    const hidden = docs.filter((doc) => !serviceDocVisible(service, doc)).length;
    return renderStackedList("Documente însoțitoare", docs.length ? [{ label: "", items: docs.map((doc, index) => {
      const visible = serviceDocVisible(service, doc);
      const value = serviceDocRequired(service, doc);
      const changed = !visible || value !== Boolean(doc.required);
      return {
        plainTitle: doc.title,
        title: escapeHtml(doc.title),
        leadHtml: '<img class="e-permits-fo-lib-item__icon" src="assets/icons/document-uploaded.svg" width="24" height="24" alt="">',
        badges: changed ? [renderTag("Modificat în GEAP", "brand")] : [],
        meta: [renderTag("RSSP", "neutral"), `În RSSP: ${doc.required ? "obligatoriu" : "opțional"}`, ...(visible ? [] : ["Nu apare în cerere"])],
        /* two checkboxes, each in a small grey container; Obligatoriu carries the red star */
        actionsHtml: `<div class="e-permits-svc-doc__switches">
          <label class="checkbox checkbox--small e-permits-svc-doc__opt${!admin ? " is-disabled" : ""}">
            <input class="checkbox-input" type="checkbox"${visible ? " checked" : ""}${!admin ? " disabled" : ""} data-svc-doc-visible="${index}">
            <span class="checkbox-custom" aria-hidden="true"></span>
            <span class="checkbox-label">Afișează</span>
          </label>
          <label class="checkbox checkbox--small e-permits-svc-doc__opt${!admin || !visible ? " is-disabled" : ""}"${admin && !visible ? ' data-tooltip-reason="Bifează întâi „Afișează” — un document care nu apare în cerere nu poate fi obligatoriu."' : ""}>
            <input class="checkbox-input" type="checkbox"${value ? " checked" : ""}${!admin || !visible ? " disabled" : ""} data-svc-doc-required="${index}">
            <span class="checkbox-custom" aria-hidden="true"></span>
            <span class="checkbox-label">Obligatoriu${requiredMark()}</span>
          </label>
        </div>`
      };
    }) }] : [], {
      meta: `${plural(docs.length, "document", "documente")} · ${required} ${required === 1 ? "obligatoriu" : "obligatorii"}${hidden ? ` · ${hidden} ${hidden === 1 ? "ascuns" : "ascunse"}` : ""}`,
      empty: "Serviciul nu are documente însoțitoare în RSSP."
    });
  };

  const renderRowAction = (label, attrs) =>
    `<button class="btn btn-text-primary btn-sm e-permits-passport__row-action" type="button" ${attrs}>${escapeHtml(label)}</button>`;

  /* a passport section whose heading carries a status tag, a caption and an action
     (Date din RSSP: Sincronizat · last sync) */
  const renderPassportBlock = (title, rows, { tagHtml = "", meta = "", actionHtml = "" } = {}) => `
    <section class="e-permits-dosar-profil__section">
      <div class="e-permits-dosar-profil__section-heading">
        <h2 class="e-permits-dosar-profil__section-title">${escapeHtml(title)}${tagHtml}</h2>
        ${meta || actionHtml ? `<div class="e-permits-passport__heading-tools">
          ${meta ? `<span class="e-permits-dosar-profil__section-meta">${meta}</span>` : ""}
          ${actionHtml}
        </div>` : ""}
      </div>
      <div class="e-permits-dosar-profil__card">
        ${rows.map(([label, valueHtml]) => `
          <div class="e-permits-dosar-profil__row">
            <span class="e-permits-dosar-profil__row-label" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
            <span class="e-permits-dosar-profil__row-value">${valueHtml}</span>
          </div>
        `).join("")}
      </div>
    </section>
  `;

  /* a library link that switches the passport tab (handled by [data-passport-tab]) */
  const passportTabLink = (service, tabId, label, size = "sm") =>
    `<a class="link link-primary link-${size} e-permits-passport__tab-link" href="#serviciu/${escapeHtml(service.code)}/${tabId}" data-passport-tab="${tabId}">${escapeHtml(label)} →</a>`;

  const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

  /* Date generale (Feature 90575): Date din RSSP (read-only; resync is in the header), what is configured
     in GEAP, the latest changes, the government services the passport relies on, then
     the rest of the RSSP record */
  const renderServiceGeneral = (service) => {
    const rssp = service.rssp;
    const geap = service.geap;
    const authority = getAuthorityById(service.authorityId);
    const configuredTypes = geap.requestTypes.filter((rt) => passport.requestTypeState(rt).label === "Configurat").length;
    const publishedForms = geap.forms.filter((form) => form.status === "Published").length;
    const tariffs = serviceTariffList(service);
    const requiredDocs = rssp.documents.filter((doc) => serviceDocRequired(service, doc)).length;
    const withLink = (text, tabId, label) => `${text}<span class="e-permits-passport__row-link">${passportTabLink(service, tabId, label)}</span>`;
    const connected = (on, detail) => `${renderTag(on ? "Conectat" : "Neutilizat", on ? "success" : "neutral")}<span class="e-permits-passport__row-note">${escapeHtml(detail)}</span>`;
    const mconnect = geap.classifiers.filter((item) => item.source === "MConnect").length;

    return `
      ${renderTabNotice("Secțiunile marcate <strong>RSSP</strong> sunt preluate din Registrul de Stat al Serviciilor Publice și nu se editează în GEAP — se actualizează doar prin resincronizare.")}
      ${renderPassportBlock("Date din RSSP", [
        ["Cod serviciu RSSP", renderProfileCopyCode(service.code, `Copiază ${service.code}`)],
        ["Denumirea serviciului", escapeHtml(service.title)],
        ["Tipul", rssp.isPermissiveAct ? "Act permisiv" : "Serviciu public"],
        ["Instituția", escapeHtml(authority?.name || "—")],
        ["IDNO instituție", authority ? renderProfileCopyCode(authority.idno, `Copiază IDNO ${authority.idno}`) : "—"],
        ["Statut", renderTag(service.status, SERVICE_STATUS_TONES[service.status] || "neutral")],
        ["Versiune", escapeHtml(serviceVersionInForce(servicePublication(service)) || "—")]
      ], {
        tagHtml: renderTag("Sincronizat", "success"),
        /* resync lives only in the page header (Sincronizează) */
        meta: `Ultima sincronizare ${escapeHtml(formatStamp(service.lastSync))}${service.syncedBy ? ` · ${escapeHtml(service.syncedBy)}` : ""}`
      })}
      ${renderPassportSection("Obiecte configurate în GEAP", [
        ["Tipuri solicitări", withLink(`${configuredTypes} din ${geap.requestTypes.length} configurate`, "request-types", "Vezi tipurile")],
        ["Formulare electronice", withLink(`${plural(publishedForms, "publicat", "publicate")} · ${geap.forms.length - publishedForms} în schiță`, "forms", "Vezi formularele")],
        ["Șabloane de tipar", withLink(plural(geap.templates.length, "șablon", "șabloane"), "templates", "Vezi șabloanele")],
        ["Taxe", withLink(`${plural(serviceTaxes(service).length, "taxă", "taxe")} · ${plural(tariffs.length, "tarif", "tarife")}${unconfiguredServiceTariffs(service).length ? ` · ${unconfiguredServiceTariffs(service).length} de configurat` : ""}`, "fees", "Vezi taxele")],
        ["Documente însoțitoare", rssp.documents.length ? withLink(`${rssp.documents.length} · ${requiredDocs} obligatorii`, "documents", "Vezi documentele") : "—"],
        ["Tipuri solicitanți", applicantTags(rssp.applicantTypes)]
      ], "GEAP")}
      ${renderEventTimeline("Ultimele modificări", geap.events.slice(0, 3), {
        empty: "Nu există modificări înregistrate.",
        actionHtml: geap.events.length > 3 ? passportTabLink(service, "events", "Vezi tot jurnalul") : ""
      })}
      ${renderPassportSection("Servicii guvernamentale conectate", [
        ["MConnect", connected(mconnect > 0, mconnect ? `${plural(mconnect, "clasificator preluat", "clasificatoare preluate")} din registrele de stat` : "Nu preia date din registre")],
        ["MPay", connected(rssp.paid || serviceTaxes(service).length > 0, rssp.paid ? "Achitarea taxelor serviciului" : "Serviciu fără plată")],
        ["MSign", connected(geap.templates.length > 0, geap.templates.length ? "Semnarea documentelor eliberate" : "Fără documente de semnat")]
      ])}
      ${renderPassportSection("Descriere și eligibilitate", [
        ["Descriere", escapeHtml(rssp.objective || "—")],
        ["Tipul solicitantului", applicantTags(rssp.applicantTypes)],
        ["Serviciu cu plată", yesNo(rssp.paid)],
        ["Permite MPower", yesNo(rssp.allowsMPower)],
        ["Permite MDelivery", yesNo(rssp.allowsMDelivery)],
        ["Livrare", valueTags(rssp.delivery)]
      ], "RSSP")}
      ${rssp.subServices.length ? renderPassportSection("Subservicii", rssp.subServices.map((sub) => [
        sub.title,
        [sub.type, sub.duration ? `${sub.duration.value} ${sub.duration.unit}` : null, sub.price ? `${sub.price.amount} ${sub.price.currency}` : null]
          .filter(Boolean).map(escapeHtml).join(" · ")
      ]), "RSSP") : ""}
      ${rssp.validity.length ? renderPassportSection("Valabilitatea actului", rssp.validity.map((period, index) => [
        index === 0 ? "Valabilitatea" : `Varianta ${index + 1}`, escapeHtml(period.description || "—")
      ]), "RSSP") : ""}
      ${service.eapl ? renderPassportSection("Date locale", [
        ["Autoritate locală", escapeHtml(service.eapl.authority?.name || "—")],
        ["Taxă locală", service.eapl.fee ? `${escapeHtml(service.eapl.fee.label)} · ${service.eapl.fee.amount} ${escapeHtml(service.eapl.fee.currency)}` : "—"],
        ["Termen local", service.eapl.term ? `${service.eapl.term.value} ${escapeHtml(service.eapl.term.unit)}` : "—"],
        ["Sincronizat", formatStamp(service.eapl.syncedAt)]
      ], "eAPL") : (service.syncSources || []).includes("eAPL") ? renderPassportSection("Date locale", [
        ["eAPL", "Nesincronizat încă — folosește Sincronizează → din eAPL."]
      ], "eAPL") : ""}
    `;
  };

  /* ---- stacked lists ----------------------------------------------------
     The passport's lists (Tipuri solicitări, Formulare, Plăți, …) are
     stacked lists (Tailwind UI "stacked list" rhythm, our tokens/components):
     a group heading, then rows of title + status tags, a dot-separated meta
     line, and on the right our neutral Small button + an overflow menu. */
  /* overflow menu = the post-process menu from "Ce vrei să soliciți?"
     (.e-permits-fo-intent-menu: icon + 16/24 medium items, 16px panel) */
  let stackMenuSeq = 0;

  const renderStackMenu = (items, label) => {
    if (!items.length) {
      return "";
    }

    const menuId = `passport-stack-menu-${stackMenuSeq += 1}`;
    return `
      <div class="e-permits-stack__menu-wrap">
        <button class="btn btn-strict btn-sm btn-icon-only e-permits-stack__menu-trigger" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="${menuId}" aria-label="Mai multe acțiuni: ${escapeHtml(label)}" data-tooltip-label="Mai multe acțiuni" data-stack-menu-trigger>
          <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-more-vertical"></use></svg>
        </button>
        <ul class="e-permits-fo-intent-menu e-permits-stack__menu" id="${menuId}" role="menu" aria-label="Acțiuni: ${escapeHtml(label)}" hidden data-stack-menu>
          ${items.map((item) => `
            <li role="none">
              <button class="e-permits-fo-intent-menu__item${item.danger ? " is-danger" : ""}" type="button" role="menuitem" ${item.attrs}>
                <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${escapeHtml(item.icon || "edit")}"></use></svg>
                <span>${escapeHtml(item.label)}</span>
              </button>
            </li>
          `).join("")}
        </ul>
      </div>
    `;
  };

  const renderStackItem = (item) => `
    <li class="e-permits-stack__item${item.rowAttrs ? " is-clickable" : ""}${item.leadHtml ? " has-lead" : ""}"${item.rowAttrs ? ` ${item.rowAttrs}` : ""}>
      ${item.leadHtml || ""}
      <div class="e-permits-stack__main">
        <div class="e-permits-stack__title-row">
          <p class="e-permits-stack__title">${item.title}</p>
          ${(item.badges || []).join("")}
        </div>
        ${[item.meta, item.meta2].filter((line) => line && line.length).map((line) => `
          <div class="e-permits-stack__meta">
            ${line.map((part) => `<span class="e-permits-stack__part">${part}</span>`).join("")}
          </div>
        `).join("")}
      </div>
      ${item.actionsHtml ? `<div class="e-permits-stack__actions">${item.actionsHtml}</div>` : item.action || item.menu?.length ? `
        <div class="e-permits-stack__actions">
          ${item.action ? `<button class="btn ${item.action.tone === "secondary" ? "btn-secondary" : "btn-neutral"} btn-sm e-permits-stack__action" type="button" ${item.action.attrs}>${actionLabelHtml(item.action.label)}</button>` : ""}
          ${renderStackMenu(item.menu || [], item.plainTitle || "")}
        </div>
      ` : ""}
    </li>
  `;

  const groupBy = (items, keyOf, order = []) => {
    const map = new Map(order.map((key) => [key, []]));
    items.forEach((item) => {
      const key = keyOf(item);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return [...map.entries()].filter(([, list]) => list.length).map(([label, list]) => ({ label, items: list }));
  };

  /* „Editează” always carries the pen (user, 2026-10-09); other labels stay text */
  const actionLabelHtml = (label) => label === "Editează"
    ? `<svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-edit"></use></svg><span>Editează</span>`
    : escapeHtml(label);
  const EDIT_LABEL_HTML = actionLabelHtml("Editează");

  /* Row actions — one rule for every list in the service profile (2026-10-09; NN/g: labelled
     actions beat icons; Carbon: secondary actions in the overflow, destructive last):
     [eye „Previzualizează” — icon-only, strict, tooltip, only where a view-only preview exists]
     · [one labelled primary: „Editează”, or „Configurează” for what is not configured yet]
     · [⋮ everything else, destructive last]. Never an icon-only primary, never two text buttons. */
  const renderRowActions = ({ preview = null, primary = null, menu = [], label = "" }) => `
    ${preview ? `<button class="btn btn-strict btn-sm btn-icon-only" type="button" aria-label="Previzualizează: ${escapeHtml(label)}" data-tooltip-label="Previzualizează" ${preview}><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-eye-open"></use></svg></button>` : ""}
    ${primary ? `<button class="btn btn-neutral btn-sm e-permits-stack__action" type="button" ${primary.attrs}>${actionLabelHtml(primary.label)}</button>` : ""}
    ${menu.length ? renderStackMenu(menu, label) : ""}`;

  const renderStackedList = (title, groups, options = {}) => {
    const total = groups.reduce((sum, group) => sum + group.items.length, 0);

    if (!total) {
      return renderPassportEmpty(title, options.empty || "Nu există înregistrări pentru această secțiune.", options.actionHtml || "");
    }

    return `
      <section class="e-permits-dosar-profil__section e-permits-stack-section">
        <div class="e-permits-dosar-profil__section-heading">
          <h2 class="e-permits-dosar-profil__section-title">${escapeHtml(title)}</h2>
          ${options.actionHtml ? `<div class="e-permits-passport__heading-tools">
            ${options.meta ? `<span class="e-permits-dosar-profil__section-meta">${escapeHtml(options.meta)}</span>` : ""}
            ${options.actionHtml}
          </div>` : options.meta ? `<span class="e-permits-dosar-profil__section-meta">${escapeHtml(options.meta)}</span>` : ""}
        </div>
        <div class="e-permits-stack">
          ${groups.map((group) => `
            <div class="e-permits-stack__group">
              ${group.label ? `<h3 class="e-permits-stack__group-label">${escapeHtml(group.label)}<span class="badge badge--lg badge--solid-light e-permits-stack__group-count">${group.items.length}</span></h3>` : ""}
              <ul class="e-permits-stack__list" role="list">${group.items.map(renderStackItem).join("")}</ul>
            </div>
          `).join("")}
        </div>
      </section>
    `;
  };

  /* Event log — EVO Cabinet "Istoric complet" timeline (Figma EVO-Cabinet 519:12410).
     Events are { at, user, type, status, detail }, newest first. "Reușit" gets the
     green check, "Eșuat" the red error and a tag; anything else is pending (clock). */
  const TIMELINE_TONES = {
    "Reușit": { tone: "success", icon: "circle-checkmark-filled" },
    "Eșuat": { tone: "danger", icon: "circle-error-filled" },
    "Schiță": { tone: "pending", icon: "edit" }
  };

  const renderEventTimeline = (title, events, options = {}) => {
    if (!events.length) {
      return renderPassportEmpty(title, options.empty || "Nu există evenimente înregistrate.");
    }

    return `
      <section class="e-permits-dosar-profil__section">
        <div class="e-permits-dosar-profil__section-heading">
          <h2 class="e-permits-dosar-profil__section-title">${escapeHtml(title)}</h2>
          ${options.meta ? `<span class="e-permits-dosar-profil__section-meta">${escapeHtml(options.meta)}</span>` : ""}
          ${options.actionHtml || ""}
        </div>
        <ol class="e-permits-timeline">
          ${events.map((item) => {
            const look = TIMELINE_TONES[item.status] || { tone: "pending", icon: "time-filled" };
            return `
              <li class="e-permits-timeline__item e-permits-timeline__item--${look.tone}">
                <span class="e-permits-timeline__rail" aria-hidden="true">
                  <span class="e-permits-timeline__marker"><svg class="icon"><use href="assets/icons/sprite.svg#icon-${look.icon}"></use></svg></span>
                </span>
                <div class="e-permits-timeline__content">
                  <span class="e-permits-timeline__title">${escapeHtml(item.type)}${look.tone === "danger" ? renderTag(item.status, "danger") : ""}</span>
                  <span class="e-permits-timeline__stamp"><time datetime="${escapeHtml(item.at)}">${escapeHtml(String(item.at).includes("T") ? formatStamp(item.at) : formatLongDate(item.at))}</time>${item.user ? ` · ${escapeHtml(item.user)}` : ""}</span>
                  ${item.detail ? `<p class="e-permits-timeline__text">${escapeHtml(item.detail)}</p>` : ""}
                </div>
              </li>
            `;
          }).join("")}
        </ol>
      </section>
    `;
  };

  /* ---- Jurnal de evenimente (service) — every change is logged, so the list is long
     (~100 here): filter chips (Toate / Reușite / Eșuate) + search (type, detail, user,
     date) with a live „X din N” count; the timeline shows SVC_EVENTS_PAGE at a time and
     „Arată încă N” under it loads the next page. Older history is demo data, generated
     once per service behind the real events (deterministic). */
  const SVC_EVENTS_PAGE = 25;
  const SVC_EVENT_SAMPLES = [
    ["Editare formular", (s, i) => `Câmp actualizat în Cerere de ${i % 2 ? "notificare" : "reperfectare"}`],
    ["Publicare formular", (s, i) => `Cerere de notificare v2.${i % 9}.0`],
    ["Sincronizare serviciu", (s) => `Cod ${s.code} preluat din RSSP`],
    ["Actualizare serviciu", () => "Datele RSSP ale serviciului au fost actualizate"],
    ["Editare taxă", (s, i) => `Taxă de stat · Emitere primară · v${1 + (i % 4)}`],
    ["Publicare taxă", (s, i) => `Examinare documente · Emitere primară · v${1 + (i % 3)}`],
    ["Editare tip solicitare", (s, i) => `${i % 2 ? "Reperfectare" : "Emitere primară"} · termen și flux`],
    ["Editare șablon de notificare", (s, i) => `Texte RO / RU actualizate · v${1 + (i % 5)}`],
    ["Publicare serviciu", (s, i) => `v2.${i % 9}.0 · ${2 + (i % 6)} modificări`],
    ["Atașare șablon MDocs", () => "Act permisiv — șablon atașat din catalog"],
    ["Editare interdependență", () => "Aviz ANSA — condiție actualizată"],
    ["Sincronizare tarife", (s, i) => `${i % 3 ? `${1 + (i % 3)} tarife preluate` : "1 tarif preluat"} din ${i % 2 ? "eAPL" : "RSSP"}`]
  ];
  const SVC_EVENT_USERS = ["Vasile Schidu", "Anastasia Cojocaru", "Ion Popescu", "Mariana Rusu"];
  const serviceEventLog = (service) => {
    const geap = service.geap;
    if (!geap.events) geap.events = [];
    if (geap.eventHistorySeeded) return geap.events;
    geap.eventHistorySeeded = true;
    const oldest = geap.events.length ? new Date(geap.events[geap.events.length - 1].at) : new Date("2026-04-22T14:00:00");
    const seed = [...String(service.code)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const pad = (n) => String(n).padStart(2, "0");
    let t = new Date(oldest.getTime());
    for (let i = geap.events.length; i < 100; i += 1) {
      /* ~1 in 13 is a failed RSSP sync — the only thing that fails in this log */
      const failed = (seed + i) % 13 === 0;
      const k = failed ? 2 : (seed + i * 7) % SVC_EVENT_SAMPLES.length;
      t = new Date(t.getTime() - ((((seed + i * 13) % 50) + 6) * 60 + ((i * 17) % 60)) * 60 * 1000);
      geap.events.push({
        at: `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}T${pad(t.getHours())}:${pad(t.getMinutes())}:00`,
        user: SVC_EVENT_USERS[(seed + i) % SVC_EVENT_USERS.length],
        type: SVC_EVENT_SAMPLES[k][0],
        status: failed ? "Eșuat" : "Reușit",
        detail: failed ? `Cod ${service.code}: Serviciul RSSP este momentan indisponibil. Încercați mai târziu.` : SVC_EVENT_SAMPLES[k][1](service, i)
      });
    }
    return geap.events;
  };
  const SVC_EVENT_FILTERS = [["all", "Toate", () => true], ["ok", "Reușite", (e) => e.status !== "Eșuat"], ["failed", "Eșuate", (e) => e.status === "Eșuat"]];
  const svcEventsState = { code: "", query: "", filter: "all", shown: SVC_EVENTS_PAGE };
  const svcEventsMatches = (service) => {
    const test = SVC_EVENT_FILTERS.find(([key]) => key === svcEventsState.filter)?.[2] || (() => true);
    const q = clasCore.normName(svcEventsState.query.trim());
    return serviceEventLog(service).filter((e) => test(e) && (!q || clasCore.normName(`${e.type} ${e.detail || ""} ${e.user || ""} ${formatStamp(e.at)}`).includes(q)));
  };
  const renderSvcEventChips = (service) => SVC_EVENT_FILTERS.map(([key, label, test]) => `
    <button type="button" class="chip${svcEventsState.filter === key ? " is-selected" : ""}" aria-pressed="${svcEventsState.filter === key ? "true" : "false"}" data-svc-events-filter="${key}">
      <span class="chip__label">${label}</span>
      <span class="badge badge--lg badge--solid-light" aria-hidden="true">${serviceEventLog(service).filter(test).length}</span>
    </button>
  `).join("");
  const renderSvcEventList = (service) => {
    const all = serviceEventLog(service);
    const rows = svcEventsMatches(service);
    const filtered = svcEventsState.query.trim() || svcEventsState.filter !== "all";
    const count = `<p class="e-permits-svc-events__count" aria-live="polite">${filtered ? `${rows.length} din ${all.length} evenimente` : `${all.length} evenimente`}</p>`;
    if (!rows.length) {
      return `${count}${renderNoResults("Niciun eveniment nu corespunde căutării")}`;
    }
    const shown = rows.slice(0, svcEventsState.shown);
    const rest = rows.length - shown.length;
    /* the timeline markup of renderEventTimeline, without its section heading */
    const timeline = renderEventTimeline("", shown).replace(/^[\s\S]*?(<ol class="e-permits-timeline">[\s\S]*<\/ol>)[\s\S]*$/, "$1");
    return `${count}${timeline}${rest > 0 ? `
      <div class="e-permits-svc-events__more">
        <span>Afișate ${shown.length} din ${rows.length}</span>
        <button class="btn btn-neutral btn-sm btn-rounded" type="button" data-svc-events-more>Arată încă ${Math.min(rest, SVC_EVENTS_PAGE)}</button>
      </div>` : ""}`;
  };
  const renderServiceEvents = (service) => {
    if (svcEventsState.code !== service.code) Object.assign(svcEventsState, { code: service.code, query: "", filter: "all", shown: SVC_EVENTS_PAGE });
    return `
      <section class="e-permits-dosar-profil__section e-permits-stack-section">
        <div class="e-permits-dosar-profil__section-heading">
          <h2 class="e-permits-dosar-profil__section-title">Jurnal de evenimente</h2>
          <span class="e-permits-dosar-profil__section-meta">Jurnalizat prin MLog</span>
        </div>
        <div class="e-permits-pay__toolbar">
          <div class="e-permits-rt__chips" role="group" aria-label="Filtrează evenimentele" data-svc-events-chips>${renderSvcEventChips(service)}</div>
          <div class="e-permits-pay__tools">
            <div class="search-input medium rectangular e-permits-workplace__search e-permits-list-search e-permits-pay__search${svcEventsState.query.trim() ? " has-value is-ready" : ""}">
              <span class="icon-search" aria-hidden="true"><svg class="icon" width="20" height="20"><use href="assets/icons/sprite.svg#icon-search"></use></svg></span>
              <input class="input" type="search" placeholder="Caută eveniment, utilizator sau dată" aria-label="Caută în jurnalul de evenimente" autocomplete="off" value="${escapeHtml(svcEventsState.query)}" data-svc-events-search>
              ${renderSearchActions()}
            </div>
          </div>
        </div>
        <div class="e-permits-svc-events" data-svc-events-list>${renderSvcEventList(service)}</div>
      </section>
    `;
  };
  const refreshSvcEvents = (withChips = false) => {
    const service = getServiceByCode(serviceProfileState.code);
    const box = permitsProfilePanel?.querySelector("[data-svc-events-list]");
    if (!service || !box) return;
    box.innerHTML = renderSvcEventList(service);
    if (withChips) permitsProfilePanel.querySelector("[data-svc-events-chips]").innerHTML = renderSvcEventChips(service);
  };

  /* Roles and users keep no audit trail in the demo data — derive one from their dates */
  const roleEvents = (role) => [
    !role.activ && { at: role.dataCreare, user: "", type: "Rol dezactivat", status: "Reușit", detail: "Rolul nu mai poate fi atribuit utilizatorilor." },
    { at: role.dataCreare, user: "", type: "Permisiuni configurate", status: "Reușit", detail: `${role.functii.length} permisiuni atribuite rolului.` },
    { at: role.dataCreare, user: "", type: "Rol creat", status: "Reușit", detail: role.descriere }
  ].filter(Boolean);

  const userEvents = (user) => [
    user.ultimaConectare && { at: user.ultimaConectare, user: user.numeComplet, type: "Autentificare prin MPass", status: "Reușit", detail: "" },
    user.ultimaActualizare && { at: user.ultimaActualizare, user: "", type: "Profil actualizat", status: "Reușit", detail: (user.roluri || []).length ? `Roluri: ${user.roluri.join(", ")}.` : "" }
  ].filter(Boolean);

  const whoWhen = (verb, at, by) => `${verb} ${escapeHtml(formatLongDate(at))}, ${escapeHtml(formatTime(at))}${by ? ` de ${escapeHtml(shortName(by))}` : ""}`;

  const RT_POST_PROCESS_TYPES = ["Reperfectare", "Prelungire", "Eliberare duplicat", "Suspendare", "Reluare", "Retragere", "Anulare"];

  /* „Suspendare” and „Suspendarea valabilității” are the same post-process */
  const rtStem = (name) => clasCore.normName(name).slice(0, 7);

  const addServiceRequestType = (name) => {
    const service = getServiceByCode(serviceProfileState.code);
    if (!service || service.geap.requestTypes.some((rt) => rtStem(rt.name) === rtStem(name))) return;
    const ids = service.geap.requestTypes.map((rt) => Number(String(rt.id).replace(/\D/g, "")) || 0);
    /* added only on „Adaugă tipul” at the last step; Anulează leaves nothing behind */
    const rt = { id: `rt-${Math.max(0, ...ids) + 1}`, name, source: "GEAP", flow: null, form: null, term: null, actions: {} };
    openRequestTypeDrawer(rt.id, rt);
  };

  const removeServiceRequestType = (rtId) => {
    const service = getServiceByCode(serviceProfileState.code);
    const rt = service?.geap.requestTypes.find((item) => item.id === rtId);
    if (!rt || rt.source === "RSSP") return;
    askConfirm({ title: `Elimini „${rt.name}”?`, text: "Solicitanții nu mai pot iniția acest postproces pentru serviciu. Dosarele deja depuse continuă pe fluxul lor.", confirmLabel: "Elimină", destructive: true }, () => {
      service.geap.requestTypes = service.geap.requestTypes.filter((item) => item !== rt);
      logServiceEvents(service.code, [{ at: localIsoNow(), user: currentUserName(), type: "Eliminare tip solicitare", status: "Reușit", detail: rt.name }]);
      renderServiceProfile();
      showShellToast(`„${rt.name}” nu mai este disponibil pentru acest serviciu.`, "success", "Tip de solicitare eliminat");
    });
  };

  const renderServiceRequestTypes = (service) => {
    const admin = isCentralAdmin();
    const types = service.geap.requestTypes;
    const configured = types.filter((rt) => passport.requestTypeState(rt).label === "Configurat").length;
    const items = types.map((rt) => {
      const state = passport.requestTypeState(rt);
      const flow = getFlowById(rt.flow);
      const form = service.geap.forms.find((item) => item.id === rt.form);
      const changed = flow ? passport.overrideCount(rt, flow) : 0;
      return {
        source: rt.source,
        plainTitle: rt.name,
        title: escapeHtml(rt.name),
        badges: [renderTag(state.label, state.tone), ...(changed ? [renderTag(`${changed} ${changed === 1 ? "acțiune modificată" : "acțiuni modificate"}`, "brand")] : [])],
        meta: [
          flow ? `Flux: ${escapeHtml(flow.name)} · ${escapeHtml(flow.version)}` : "Fără flux de procesare",
          rt.term ? `Termen: ${rt.term.value} ${escapeHtml(rt.term.unit)}` : "Fără termen"
        ],
        meta2: [form ? `Formular: ${escapeHtml(form.name)} · ${escapeHtml(form.version)}` : "Fără formular electronic"],
        action: admin ? { label: state.label === "Configurat" ? "Editează" : "Configurează", attrs: `data-passport-configure-rt="${escapeHtml(rt.id)}"` } : null,
        /* only the types added in GEAP can be removed; RSSP ones come back at every sync */
        menu: admin && rt.source !== "RSSP" ? [{ label: "Elimină", icon: "delete", danger: true, attrs: `data-passport-remove-rt="${escapeHtml(rt.id)}"` }] : []
      };
    });
    /* post-processes eligible for the service are added in GEAP, several at once
       (feedback 2026-10-07): the menu lists the types the service does not have yet */
    const missing = RT_POST_PROCESS_TYPES.filter((name) => !types.some((rt) => rtStem(rt.name) === rtStem(name)));
    const addHtml = admin && missing.length ? `
      <div class="e-permits-stack__menu-wrap">
        <button class="btn btn-secondary btn-sm" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="passport-add-rt-menu" data-stack-menu-trigger>
          <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-large"></use></svg>
          <span>Adaugă tip solicitare</span>
        </button>
        <ul class="e-permits-fo-intent-menu e-permits-stack__menu" id="passport-add-rt-menu" role="menu" aria-label="Postprocese eligibile" hidden data-stack-menu>
          ${missing.map((name) => `
            <li role="none">
              <button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" data-passport-add-rt="${escapeHtml(name)}">
                <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-large"></use></svg>
                <span>${escapeHtml(name)}</span>
              </button>
            </li>
          `).join("")}
        </ul>
      </div>` : "";

    return renderStackedList("Tipuri solicitări", groupBy(items, (item) => (item.source === "RSSP" ? "Subservicii RSSP" : "Postprocese adăugate în GEAP"), ["Subservicii RSSP", "Postprocese adăugate în GEAP"]), {
      meta: `${configured} din ${types.length} configurate`,
      actionHtml: addHtml,
      empty: "Serviciul nu are tipuri de solicitare. Ele se preiau din subserviciile RSSP la sincronizare."
    });
  };


  /* Formulare (feedback 2026-10-07, A. Pascalov): one flat list — a form can serve
     several request types at once (Emitere primară and Duplicat), so the list is not
     grouped by type. „Folosit în” shows the mapping, which is made in the request type
     (Configurează › Formular electronic). */
  const formUsage = (service, formId) => service.geap.requestTypes.filter((rt) => rt.form === formId);

  const renderServiceForms = (service) => {
    const admin = isCentralAdmin();
    const forms = [...service.geap.forms].sort((a, b) => String(b.editedAt || "").localeCompare(String(a.editedAt || "")));
    const items = forms.map((form) => {
      const used = formUsage(service, form.id);
      return {
        plainTitle: form.name,
        title: escapeHtml(form.name),
        badges: [renderTag(form.status === "Published" ? "Publicat" : "Schiță", form.status === "Published" ? "success" : "neutral")],
        meta: [renderTag(form.technical, "neutral"), `${form.fields} câmpuri`, escapeHtml(form.version), whoWhen("Editat", form.editedAt, form.editedBy)],
        meta2: [`Folosit în ${used.length ? `<span class="e-permits-passport__tag-list">${used.map((rt) => renderTag(rt.name, "neutral")).join("")}</span>` : '<span class="e-permits-passport__muted">niciun tip de solicitare</span>'}`],
        actionsHtml: renderRowActions({
          preview: `aria-haspopup="dialog" data-passport-form="${escapeHtml(form.id)}" data-passport-form-action="preview"`,
          primary: admin ? { label: "Editează", attrs: "data-passport-open-builder" } : null,
          menu: admin ? [
            { label: "Duplică", icon: "copy", attrs: `data-passport-form="${escapeHtml(form.id)}" data-passport-form-action="duplicate"` },
            { label: "Versiuni", icon: "time", attrs: `data-passport-form="${escapeHtml(form.id)}" data-passport-form-action="versions"` },
            { label: "Exportă setări (JSON)", icon: "download", attrs: `data-passport-form="${escapeHtml(form.id)}" data-passport-form-action="export"` },
            { label: "Elimină", icon: "delete", danger: true, attrs: `data-passport-form="${escapeHtml(form.id)}" data-passport-form-action="remove"` }
          ] : [],
          label: form.name
        })
      };
    });
    const addHtml = admin ? `
      <button class="btn btn-secondary btn-sm" type="button" data-passport-form-new>
        <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-large"></use></svg>
        <span>Adaugă formular</span>
      </button>` : "";

    return renderStackedList("Formulare electronice", items.length ? [{ label: "", items }] : [], {
      meta: `${plural(forms.filter((form) => form.status === "Published").length, "publicat", "publicate")} · ${forms.filter((form) => form.status !== "Published").length} în schiță`,
      actionHtml: addHtml,
      empty: "Nu există formulare. Adaugă primul formular, apoi alege-l în tipurile de solicitare care îl folosesc."
    });
  };

  const createServiceForm = () => {
    const service = getServiceByCode(serviceProfileState.code);
    if (!service) return;
    const ids = service.geap.forms.map((form) => Number(String(form.id).replace(/\D/g, "")) || 0);
    const n = Math.max(0, ...ids) + 1;
    service.geap.forms.unshift({ id: `frm-${n}`, name: "Formular nou", technical: `f_formular_${n}`, requestType: null, fields: 0, version: "v0.1.0", status: "Draft", editedAt: localIsoNow(), editedBy: currentUserName() });
    logServiceEvents(service.code, [{ at: localIsoNow(), user: currentUserName(), type: "Creare formular", status: "Reușit", detail: `Formular nou (f_formular_${n})` }]);
    renderServiceProfile();
    formBuilderOverlay?.classList.add("is-sheet");
    window.__modal?.open?.("#form-builder-modal");
  };

  /* the form's published versions (seeded once from its current version, newest first);
     a draft sits on top of the version in force */
  const FORM_VERSION_NOTES = ["Câmpuri noi pentru reprezentant (procură) și validarea IDNO.", "Adresa obiectului din registrul de adrese; mesaje de eroare revizuite.", "Prima versiune publicată."];
  const formVersionHistory = (form) => {
    if (form.history) return form.history;
    const [maj, min] = String(form.version).replace(/^v/, "").split(".").map(Number);
    const at0 = new Date(form.editedAt || localIsoNow());
    const list = [{ version: form.version, at: form.editedAt, by: form.editedBy, draft: form.status !== "Published", note: form.status !== "Published" ? "Modificări în lucru — nu se folosesc încă în cereri." : "Versiunea folosită acum în cereri." }];
    const prev = [];
    for (let m = (min || 0) - 1, M = maj; prev.length < 3 && M >= 1; m--) { if (m < 0) { M--; m = 2; if (M < 1) break; } prev.push(`v${M}.${m}.0`); }
    prev.forEach((version, i) => { const d = new Date(at0); d.setMonth(d.getMonth() - 2 * (i + 1)); list.push({ version, at: d.toISOString().slice(0, 16), by: i % 2 ? "Alexandr Pascalov" : form.editedBy, note: FORM_VERSION_NOTES[Math.min(i, FORM_VERSION_NOTES.length - 1)] }); });
    if (list.length > 1) list[list.length - 1].note = "Prima versiune publicată.";
    form.history = list;
    return list;
  };

  const formBuilderOverlay = document.querySelector("#form-builder-modal");
  /* Previzualizează = the rendered form, as the applicant sees it: the builder's Preview,
     view-only (editing controls hidden), in the same sheet as Editează */
  const openFormPreview = (form) => {
    if (!formBuilderOverlay) return;
    formBuilderOverlay.classList.add("is-sheet", "is-view-only");
    const title = formBuilderOverlay.querySelector("[data-builder-view-title]");
    if (title) title.innerHTML = `Previzualizare · ${escapeHtml(form.name)} <span class="e-permits-builder__view-meta">${escapeHtml(form.version)}</span> ${renderTag("Doar vizualizare", "neutral")}`;
    window.__modal?.open?.("#form-builder-modal");
    formBuilderOverlay.querySelector('[data-builder-mode="preview"]')?.click();
  };
  /* leaving the view-only preview resets the builder for „Editează” */
  if (formBuilderOverlay) new MutationObserver(() => {
    /* guard every remove: DOMTokenList.remove re-sets the attribute even when the class is
       absent, which would re-trigger this observer forever */
    if (formBuilderOverlay.classList.contains("is-active")) return;
    if (formBuilderOverlay.classList.contains("is-sheet")) formBuilderOverlay.classList.remove("is-sheet");
    if (formBuilderOverlay.classList.contains("is-view-only")) {
      formBuilderOverlay.classList.remove("is-view-only");
      formBuilderOverlay.querySelector('[data-builder-mode="build"]')?.click();
    }
  }).observe(formBuilderOverlay, { attributes: true, attributeFilter: ["class"] });

  const runServiceFormAction = (formId, action) => {
    const service = getServiceByCode(serviceProfileState.code);
    const form = service?.geap.forms.find((item) => item.id === formId);
    if (!form) return;
    const log = (type, detail) => logServiceEvents(service.code, [{ at: localIsoNow(), user: currentUserName(), type, status: "Reușit", detail }]);

    if (action === "duplicate") {
      const ids = service.geap.forms.map((item) => Number(String(item.id).replace(/\D/g, "")) || 0);
      const copy = { ...form, id: `frm-${Math.max(0, ...ids) + 1}`, name: `${form.name} (copie)`, technical: `${form.technical}_copie`, version: "v0.1.0", status: "Draft", editedAt: localIsoNow(), editedBy: currentUserName() };
      service.geap.forms.splice(service.geap.forms.indexOf(form) + 1, 0, copy);
      log("Clonare formular", `${form.name} → ${copy.name}`);
      renderServiceProfile();
      showShellToast(`„${copy.name}” a fost creat în schiță. Alege-l în tipul de solicitare care îl folosește.`, "success", "Formular duplicat");
      return;
    }

    /* Versiuni = the standard „Istoric versiuni” modal (as for the service and the templates) */
    if (action === "versions") {
      const modal = document.querySelector("#dtpl-history-modal");
      if (!modal) return;
      modal.querySelector("#dtpl-history-title").textContent = "Istoric versiuni";
      modal.querySelector("[data-dtpl-history-subtitle]").textContent = `${form.name} · ${form.technical}`;
      modal.querySelector("[data-dtpl-history-body]").innerHTML = renderEventTimeline("Versiuni", formVersionHistory(form).map((h, i) => ({
        at: h.at, user: h.by,
        type: h.draft ? `${h.version} · schiță, nepublicată` : (i === 0 || formVersionHistory(form)[i - 1]?.draft) ? `${h.version} · în vigoare` : h.version,
        status: h.draft ? "Schiță" : "Reușit",
        detail: h.note
      })), { meta: "Cea mai recentă primele" });
      window.__modal?.open?.("#dtpl-history-modal");
      return;
    }

    /* Previzualizează = the builder's Preview, view-only, as an inset modal */
    if (action === "preview") { openFormPreview(form); return; }

    if (action === "export") {
      const used = formUsage(service, form.id).map((rt) => rt.name);
      const blob = new Blob([JSON.stringify({ service: service.code, ...form, usedIn: used }, null, 2)], { type: "application/json" });
      const link = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${form.technical}-${form.version}.json` });
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      showShellToast(`Setările formularului au fost exportate în ${link.download}.`, "success", "Export JSON");
      return;
    }

    if (action === "remove") {
      const used = formUsage(service, form.id);
      if (used.length) {
        showShellToast(`Formularul este folosit în ${used.map((rt) => `„${rt.name}”`).join(", ")}. Alege alt formular în ${used.length === 1 ? "acest tip" : "aceste tipuri"} de solicitare, apoi elimină-l.`, "error", "Formularul nu poate fi eliminat");
        return;
      }
      askConfirm({ title: `Elimini „${form.name}”?`, text: "Formularul nu este folosit în niciun tip de solicitare. Cererile deja depuse cu el rămân în dosare.", confirmLabel: "Elimină", destructive: true }, () => {
        service.geap.forms = service.geap.forms.filter((item) => item !== form);
        log("Eliminare formular", `${form.name} (${form.technical})`);
        renderServiceProfile();
        showShellToast(`„${form.name}” a fost eliminat.`, "success", "Formular eliminat");
      });
    }
  };

  const PAYMENT_ACTION_LABELS = { publish: "Publică", activate: "Activează", deactivate: "Dezactivează", delete: "Șterge" };

  /* the tables' export icon (tray + arrow), shared by every export button */
  const EXPORT_ICON = `<svg class="icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"> <path d="M2.06641 12V10C2.06641 9.66863 2.3353 9.39974 2.66667 9.39974C2.99804 9.39974 3.26693 9.66863 3.26693 10V12C3.26693 12.405 3.59499 12.7331 4 12.7331H12C12.405 12.7331 12.7331 12.405 12.7331 12V10C12.7331 9.66863 13.002 9.39974 13.3333 9.39974C13.6647 9.39974 13.9336 9.66863 13.9336 10V12C13.9336 13.0678 13.0678 13.9336 12 13.9336H4C2.93225 13.9336 2.06641 13.0678 2.06641 12ZM7.39974 2.66667C7.39974 2.3353 7.66863 2.06641 8 2.06641C8.33137 2.06641 8.60026 2.3353 8.60026 2.66667V8.21745L9.90885 6.90885C10.1432 6.67454 10.5235 6.67454 10.7578 6.90885C10.9921 7.14317 10.9921 7.5235 10.7578 7.75781L8.42448 10.0911C8.31196 10.2037 8.15913 10.2669 8 10.2669C7.84087 10.2669 7.68804 10.2037 7.57552 10.0911L5.24219 7.75781C5.00787 7.5235 5.00787 7.14317 5.24219 6.90885C5.4765 6.67454 5.85683 6.67454 6.09115 6.90885L7.39974 8.21745V2.66667Z" fill="currentColor"/> </svg>`;

  /* ---- Taxe = tariff + application rule (revised 2026-10-02) ----------------
     Feedback (G. Roșca, O. Luchian): taxes are computed from tariffs, ~80% equal the
     tariff, and the tariffs come mostly from RSSP / eAPL. So the tab starts from the
     tariff: a tax is ONE tariff plus the rule the registries do not carry (request
     type, moment, automatic/manual, an optional condition on a classifier value
     chosen at initiation, calculation, term, exemptions, recurrence). Tariffs that
     arrived without a rule wait in "De configurat" ("Aplică ca atare" = the 80%).
     Rules: GEAP.servicePassport (validateTax, taxConflict, taxAmount). */
  const TAX_FILTERS = [
    ["all", "Toate", () => true],
    ["active", "Active", (tax) => tax.state === "Publicat" && tax.active],
    ["draft", "Schiță", (tax) => tax.state !== "Publicat"],
    ["inactive", "Inactive", (tax) => tax.state === "Publicat" && !tax.active]
  ];
  const payListState = { query: "", filter: "all" };

  const getTariff = (id) => servicesStore?.tariffs?.find((tariff) => tariff.id === id) || null;
  /* a tariff's value as text: its sum, or its formula (computed on the payment note) */
  const tariffValueText = (tariff) => (tariff.formula ? `Formulă · ${formulaReadable(tariff.expression)}` : `${Number(tariff.amount).toLocaleString("ro-MD")} ${tariff.currency}`);
  const tariffLabel = (tariff) => tariff ? `${tariff.name} · ${tariffValueText(tariff)}` : "Tarif necunoscut";
  const requestTypeFlow = (service, requestTypeName) =>
    getFlowById(service.geap.requestTypes.find((rt) => rt.name === requestTypeName)?.flow);
  const serviceTaxes = (service) => service.geap.taxes || (service.geap.taxes = []);
  const unconfiguredServiceTariffs = (service) => passport.unconfiguredTariffs(servicesStore?.tariffs || [], serviceTaxes(service), service.code);
  const conditionClassifiers = (service) => (servicesStore?.conditionClassifiers || []).filter((item) => item.scope === service.code || item.scope === "global");
  const getConditionClassifier = (code) => (servicesStore?.conditionClassifiers || []).find((item) => item.code === code) || null;
  /* value → parent per classifier: a checked parent covers its children (CAEM G ⊃ 47 ⊃ 47.1) */
  const conditionTree = () => passport.classifierTree(servicesStore?.conditionClassifiers || []);
  const conditionValueLabel = (classifier, code) => getConditionClassifier(classifier)?.values.find((v) => v.code === code)?.label || code;
  const conditionLabel = (condition) => {
    if (!condition?.classifier) return "";
    const classifier = getConditionClassifier(condition.classifier);
    const labels = (condition.values || []).map((code) => classifier?.values.find((value) => value.code === code)?.label || code);
    return `${classifier?.name || condition.classifier} = ${labels.join(" sau ")}`;
  };
  /* several classifiers = AND: „Motiv = minoră sau majoră și Solicitant = IMM” */
  const conditionsLabel = (tax) => passport.taxConditions(tax).map(conditionLabel).join(" și ");
  const isConditional = (tax) => passport.taxConditions(tax).length > 0;
  /* a scenario = one checked value of each classifier, named by its value labels */
  const scenarioLabel = (scenario) => scenario.picks.map(({ classifier, value }) =>
    getConditionClassifier(classifier)?.values.find((v) => v.code === value)?.label || value).join(" · ");
  const scenarioCalcText = (calc) => (calc.mode === "reducere" ? `Reducere ${calc.percent}%` : passport.TAX_CALC_LABELS.tarif);
  const tariffSourceTag = (tariff) => !tariff ? "" : tariff.scope === "global"
    ? renderTag("Global", "neutral")
    : renderTag(tariff.source === "GEAP" ? "Manual" : tariff.source, "neutral");
  const TAX_STATUS = (tax) => (tax.state === "Publicat" ? (tax.active ? "Activă" : "Inactivă") : "Schiță");
  const TAX_STATUS_TONES = { "Activă": "success", "Inactivă": "neutral", "Schiță": "warning" };
  const money = (value, currency = "MDL") => `${Number(value).toLocaleString("ro-MD")} ${currency}`;

  /* what the tax charges: the tariff's sum (its amount or its own formula),
     optionally reduced — a formula is set on the tariff, never on the tax */
  const taxCalcLabel = (tax, tariff) => {
    const calc = tax.calc || { mode: "tarif" };
    if (!tariff) return "Tarif lipsă";
    const scenarios = passport.taxScenarios(tax);
    const reduced = scenarios.filter((s) => passport.scenarioCalc(tax, s.key).mode === "reducere").length;
    if (reduced) {
      const base = tariff.formula ? `Formula tarifului · ${escapeHtml(formulaReadable(tariff.expression))}` : `<strong>${escapeHtml(money(tariff.amount, tariff.currency))}</strong>`;
      return `${base} · reducere în ${reduced} din ${scenarios.length} scenarii`;
    }
    if (calc.mode === "reducere") {
      if (tariff.formula) return `Formula tarifului · ${escapeHtml(formulaReadable(tariff.expression))} − ${escapeHtml(String(calc.percent))}%`;
      const sum = passport.taxAmount(tax, tariff);
      return `${escapeHtml(money(tariff.amount, tariff.currency))} − ${escapeHtml(String(calc.percent))}% = <strong>${escapeHtml(sum.ok ? money(sum.value, tariff.currency) : "—")}</strong>`;
    }
    return tariff.formula ? `Formula tarifului · ${escapeHtml(formulaReadable(tariff.expression))}` : `<strong>${escapeHtml(money(tariff.amount, tariff.currency))}</strong>`;
  };

  const payMatches = (service, tax) => {
    const filter = TAX_FILTERS.find(([key]) => key === payListState.filter)?.[2] || (() => true);
    const query = payListState.query.trim().toLocaleLowerCase("ro");
    const tariff = getTariff(tax.tariffId);
    const text = [tariff?.name, tariff?.code, tax.requestType, tax.moment, tax.generation, conditionsLabel(tax)]
      .join(" ").toLocaleLowerCase("ro");
    return filter(tax) && (!query || text.includes(query));
  };
  const unconfiguredMatches = (tariff) => {
    if (!["all", "draft"].includes(payListState.filter)) return false;
    const query = payListState.query.trim().toLocaleLowerCase("ro");
    return !query || [tariff.name, tariff.code, tariff.requestType, tariff.source].join(" ").toLocaleLowerCase("ro").includes(query);
  };

  const renderTaxGroup = (label, items, extraClass = "") => `
    <div class="e-permits-stack__group${extraClass}">
      <h3 class="e-permits-stack__group-label">${escapeHtml(label)}<span class="badge badge--lg badge--solid-light e-permits-stack__group-count">${items.length}</span></h3>
      <ul class="e-permits-stack__list" role="list">${items.map(renderStackItem).join("")}</ul>
    </div>
  `;

  const renderPaymentList = (service) => {
    const admin = isCentralAdmin();
    const taxes = serviceTaxes(service);
    const visible = taxes.filter((tax) => payMatches(service, tax));
    const pending = unconfiguredServiceTariffs(service).filter(unconfiguredMatches);

    if (!visible.length && !pending.length) {
      return taxes.length
        ? renderNoResults("Nicio taxă nu corespunde filtrului", { text: "Alege alt filtru sau caută după tarif, cod ori tip de solicitare." })
        : renderEmptyState({ title: "Serviciul nu are taxe", text: "Sincronizează tarifele din RSSP / eAPL sau adaugă o taxă.", icon: "receipt-check" });
    }

    /* tariffs that came in without a rule: apply as is (one click) or configure */
    const pendingItems = pending.map((tariff) => ({
      plainTitle: tariff.name,
      title: escapeHtml(tariff.name),
      badges: [tariffSourceTag(tariff), renderTag("Fără regulă de aplicare", "warning")],
      meta: [`<strong>${escapeHtml(tariffValueText(tariff))}</strong>`, escapeHtml(tariff.code), escapeHtml(tariff.requestType || "Tip solicitare neprecizat"), whoWhen(tariff.source === "GEAP" ? "Adăugat" : "Preluat", tariff.modifiedAt, tariff.modifiedBy)],
      actionsHtml: admin ? renderRowActions({ primary: { label: "Configurează", attrs: `data-tax-configure="${escapeHtml(tariff.id)}"` }, menu: [{ label: "Aplică ca atare", icon: "checkmark-large", attrs: `data-tax-apply="${escapeHtml(tariff.id)}"` }], label: tariff.name }) : ""
    }));

    const items = visible.map((tax) => {
      const tariff = getTariff(tax.tariffId);
      const actions = admin ? passport.paymentActions(tax) : [];
      const actionAttrs = (action) => `data-passport-payment="${escapeHtml(tax.id)}" data-passport-payment-action="${action}"`;
      /* Editează always; constructive actions (Publică, Activează) blue
         secondary; destructive ones (Dezactivează, Șterge) in the ⋮ menu */
      const primary = actions.find((action) => action === "publish" || action === "activate");
      const destructive = actions.filter((action) => action === "deactivate" || action === "delete");
      const branchMissing = !passport.momentAllowed(requestTypeFlow(service, tax.requestType), tax.moment);
      const status = TAX_STATUS(tax);
      return {
        group: tax.requestType,
        plainTitle: tariff?.name || tax.tariffId,
        title: escapeHtml(tariff?.name || tax.tariffId),
        badges: [
          renderTag(status, TAX_STATUS_TONES[status]),
          tariffSourceTag(tariff),
          ...(isConditional(tax) ? [renderTag("Condiționată", "info")] : []),
          ...(branchMissing ? [renderTag("Fără ramificație în flux", "warning")] : [])
        ],
        meta: [
          taxCalcLabel(tax, tariff),
          escapeHtml(tax.moment),
          escapeHtml(tax.generation),
          `termen ${escapeHtml(String(tax.term))} zile`,
          ...(tax.recurring ? [`recurentă ${tax.recurring.frequency === "Interval" ? `la ${tax.recurring.months} luni` : "anual"}`] : []),
          `v${tax.version}`,
          whoWhen("Modificat", tax.modifiedAt, tax.modifiedBy)
        ],
        meta2: [
          ...(isConditional(tax) ? [`Se aplică doar dacă ${escapeHtml(conditionsLabel(tax))}`] : []),
          ...(tax.exemptions.length ? [`Scutiri: ${escapeHtml(tax.exemptions.join(", "))}`] : []),
          ...(tax.generation === "Manual" && tax.removable ? ["eliminabilă din notă"] : [])
        ],
        actionsHtml: admin ? renderRowActions({
          primary: { label: "Editează", attrs: `data-pay-edit="${escapeHtml(tax.id)}" aria-label="Editează taxa ${escapeHtml(tariff?.name || "")}"` },
          menu: [
            ...(primary ? [{ label: PAYMENT_ACTION_LABELS[primary], icon: primary === "publish" ? "cloud-upload" : "checkmark-large", attrs: actionAttrs(primary) }] : []),
            ...destructive.map((action) => ({ label: PAYMENT_ACTION_LABELS[action], icon: action === "delete" ? "delete" : "pause", attrs: actionAttrs(action), danger: true }))
          ],
          label: tariff?.name || "taxă"
        }) : ""
      };
    });

    const groups = groupBy(items, (item) => item.group, service.geap.requestTypes.map((rt) => rt.name));
    return `
      <div class="e-permits-stack">
        ${pendingItems.length ? renderTaxGroup("De configurat", pendingItems, " e-permits-tax__pending") : ""}
        ${groups.map((group) => renderTaxGroup(group.label, group.items)).join("")}
      </div>
    `;
  };

  const renderPayChips = (service) => TAX_FILTERS.map(([key, label, test]) => `
    <button type="button" class="chip${payListState.filter === key ? " is-selected" : ""}" aria-pressed="${payListState.filter === key ? "true" : "false"}" data-pay-filter="${key}">
      <span class="chip__label">${label}</span>
      <span class="badge badge--lg badge--solid-light" aria-hidden="true">${serviceTaxes(service).filter(test).length + (["all", "draft"].includes(key) ? unconfiguredServiceTariffs(service).length : 0)}</span>
    </button>
  `).join("");

  /* go to the Tarife classifier; with an id, find and highlight that tariff */
  const goToTariff = (tariffId) => {
    const nav = document.querySelector('[data-nav-id="tariffs"]');

    if (!nav) {
      return;
    }

    nav.click();
    const tariff = (servicesStore.tariffs || []).find((item) => item.id === tariffId);

    if (!tariff) {
      return;
    }

    workplaceState.query = tariff.code;
    if (workplaceSearch) workplaceSearch.value = tariff.code;
    renderWorkplace();
    requestAnimationFrame(() => {
      const row = document.querySelector(`tr[data-workplace-row="${CSS.escape(tariff.id)}"]`);
      row?.classList.add("is-flash");
      row?.querySelector("[data-tariff-edit]")?.focus();
    });
  };

  const renderServicePayments = (service) => {
    const admin = isCentralAdmin();

    return `
      <section class="e-permits-dosar-profil__section e-permits-stack-section">
        <h2 class="e-permits-dosar-profil__section-title">Taxe</h2>
        <!-- one toolbar: filters left; search, Adaugă taxă and ⋮ (export, sync) right -->
        <div class="e-permits-pay__toolbar">
          <div class="e-permits-rt__chips" role="group" aria-label="Filtrează taxele" data-pay-chips>${renderPayChips(service)}</div>
          <div class="e-permits-pay__tools">
            <div class="search-input medium rectangular e-permits-workplace__search e-permits-list-search e-permits-pay__search${String(payListState.query || "").trim() ? " has-value is-ready" : ""}">
              <span class="icon-search" aria-hidden="true"><svg class="icon" width="20" height="20"><use href="assets/icons/sprite.svg#icon-search"></use></svg></span>
              <input class="input" type="search" placeholder="Caută taxă sau tarif" aria-label="Caută după tarif, tip solicitare, moment sau condiție" value="${escapeHtml(payListState.query)}" autocomplete="off" data-pay-search>
              ${renderSearchActions()}
            </div>
            ${admin ? `
              <button class="btn btn-secondary btn-sm" type="button" data-pay-add>
                <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-large"></use></svg>
                <span>Adaugă taxă</span>
              </button>
            ` : ""}
            <!-- one visible action; the rest (export, sync) in the ⋮ menu -->
            ${renderStackMenu([
              { label: "Exportă taxele", icon: "download", attrs: "data-pay-export" },
              ...(admin ? ["RSSP", ...((service.syncSources || []).includes("eAPL") ? ["eAPL"] : [])].map((source) => ({
                label: `Sincronizează tarifele din ${source}`, icon: "rotate-arrow", attrs: `data-tariff-sync="${source}"`
              })) : [])
            ], "taxe")}
          </div>
        </div>
        <div class="e-permits-sum-list">
          <div data-pay-list>${renderPaymentList(service)}</div>
          ${admin ? renderListNote('Tarifele globale (valabile pentru orice serviciu) se gestionează în <a class="link link-primary link-md" href="#tarife" data-tariff-goto="">Administrare → Tarife</a>.') : ""}
        </div>
      </section>
    `;
  };

  const renderServiceSimpleTab = (service, tabId) => {
    const geap = service.geap;

    switch (tabId) {
      case "classifiers":
        return renderStackedList("Clasificatoare specifice", groupBy(geap.classifiers.map((item) => ({
          group: item.source === "MConnect" ? "Externe · sincronizate din MConnect" : "Specifice serviciului",
          plainTitle: item.name,
          title: escapeHtml(item.name),
          meta: [renderTag(item.code, "neutral"), `${item.values} valori`, `Actualizat ${escapeHtml(formatLongDate(item.updated))}`]
        })), (item) => item.group, ["Specifice serviciului", "Externe · sincronizate din MConnect"]), { empty: "Serviciul nu are clasificatoare specifice." });
      case "templates":
        return renderServiceDocTemplates(service);
      case "settings":
        return renderServiceSettings(service);
      case "events":
        return renderServiceEvents(service);
      default:
        return "";
    }
  };

  /* Taxe (Feature 90575): fee summary as stat cards, then the payments (Feature 93591) */
  /* Sumar taxe: one stacked-list group per figure (the "Emitere primară" header with its
     count badge), the breakdown as rows below */
  /* more rows than the card shows → the totals tray under the list (flat top, inset 12):
     „Încă N …” left, „Arată toate” right — opens the list modal */
  const renderFeeGroup = ({ label, icon, count, rows, more = null }) => `
    <div class="e-permits-sum-list e-permits-fee-summary__group">
      <div class="e-permits-stack">
        <div class="e-permits-stack__group">
          <h3 class="e-permits-stack__group-label"><svg class="icon medium e-permits-fee-summary__icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${icon}"></use></svg>${escapeHtml(label)}<span class="badge badge--lg badge--solid-light e-permits-stack__group-count">${count}</span></h3>
          <ul class="e-permits-stack__list" role="list">
            ${rows.map(([name, valueHtml]) => `
              <li class="e-permits-stack__item e-permits-fee-summary__row">
                <span class="e-permits-fee-summary__name" title="${escapeHtml(name)}">${escapeHtml(name)}</span>
                <span class="e-permits-fee-summary__value">${valueHtml}</span>
              </li>
            `).join("")}
          </ul>
        </div>
      </div>
      ${more ? `
        <div class="e-permits-sum-list__total e-permits-fee-summary__more">
          <span>${escapeHtml(more.text)}</span>
          <button class="btn btn-text-primary btn-sm btn-rounded e-permits-fee-summary__action" type="button" data-fee-list-all="${more.kind}">Arată toate</button>
        </div>` : ""}
    </div>
  `;


  /* Bank accounts of a service: the authority's own active accounts, plus — when the
     service collects a local fee through eAPL — one treasury account per local public
     authority (APL). The APL list is mock data (deterministic), sized like reality: ~500. */
  const FEE_ACCOUNTS_VISIBLE = 2;
  const APL_RAIONS = ["Anenii Noi", "Basarabeasca", "Briceni", "Cahul", "Cantemir", "Călărași", "Căușeni", "Cimișlia", "Criuleni", "Dondușeni", "Drochia", "Dubăsari", "Edineț", "Fălești", "Florești", "Glodeni", "Hîncești", "Ialoveni", "Leova", "Nisporeni", "Ocnița", "Orhei", "Rezina", "Rîșcani", "Sîngerei", "Soroca", "Strășeni", "Șoldănești", "Ștefan Vodă", "Taraclia", "Telenești", "Ungheni", "UTA Găgăuzia", "mun. Chișinău", "mun. Bălți"];
  const aplAccountsCache = new Map();
  const aplBankAccounts = (service) => {
    if (!servicesStore?.eapl?.responses?.[service.code]) return [];
    if (aplAccountsCache.has(service.code)) return aplAccountsCache.get(service.code);
    const list = [];
    for (let i = 0; i < 500; i += 1) {
      const raion = APL_RAIONS[i % APL_RAIONS.length];
      const nr = Math.floor(i / APL_RAIONS.length) + 1;
      const digits = String(100000000000 + ((i * 7919 + 104729) % 900000000000)).padStart(12, "0");
      list.push({ id: `apl-${i + 1}`, label: `Primăria ${raion} · UAT ${String(nr).padStart(2, "0")}`, bank: `Trezoreria de Stat · ${raion}`, iban: `MD${String(10 + (i % 89)).padStart(2, "0")}TR00000002${digits.slice(0, 10)}`, apl: true, active: true });
    }
    aplAccountsCache.set(service.code, list);
    return list;
  };
  const serviceBankAccounts = (service) => [
    ...(servicesStore?.bankAccounts || []).filter((account) => account.authorityId === service.authorityId && account.active).sort((a, b) => Number(b.principal) - Number(a.principal)),
    ...aplBankAccounts(service)
  ];

  const feeMore = (kind, total, one, many) => {
    const rest = total - FEE_ACCOUNTS_VISIBLE;
    return rest > 0 ? { kind, text: `Încă ${clasNumber(rest)} ${rest === 1 ? one : many}` } : null;
  };
  /* one-line sums for the summary rows; a formula is computed only on the payment note */
  const taxShortValue = (tax) => {
    const tariff = getTariff(tax.tariffId);
    const sum = tariff ? passport.taxAmount(tax, tariff) : { ok: false };
    const sums = tariff ? passport.taxScenarios(tax).map((s) => passport.taxAmount(tax, tariff, {}, { scenario: s.key })) : [];
    if (sums.length && sums.every((x) => x.ok)) {
      const values = sums.map((x) => x.value);
      const low = Math.min(...values), high = Math.max(...values);
      return low === high ? money(low, tariff.currency) : `${money(low, tariff.currency)} – ${money(high, tariff.currency)}`;
    }
    if (sum.ok) return money(sum.value, tariff.currency);
    return tax.calc?.mode === "reducere" && tariff?.formula ? `Formulă − ${tax.calc.percent}%` : "Formulă";
  };
  const tariffShortValue = (tariff) => (tariff.formula ? "Formulă" : money(tariff.amount, tariff.currency));

  const renderServiceFees = (service) => {
    const tariffs = serviceTariffList(service);
    const taxes = serviceTaxes(service);
    const pending = unconfiguredServiceTariffs(service);
    const accounts = serviceBankAccounts(service);

    return `
      ${renderTabNotice("<strong>O taxă = un tarif + regula de aplicare.</strong> Tarifele vin din RSSP și eAPL; aici adaugi doar ce lipsește: când se aplică, condiția și calculul. Un tarif nou se creează doar dacă lipsește din registre.")}
      <section class="e-permits-dosar-profil__section">
        <h2 class="e-permits-dosar-profil__section-title">Sumar taxe</h2>
        <div class="e-permits-fee-summary">
          ${renderFeeGroup({
            /* Taxe and Tarife: the first rows + „Arată toate” → the same list modal as
               Conturi bancare (search + scroll); the counts move to the modal subtitle */
            label: "Taxe", icon: "receipt-bill", count: taxes.length,
            rows: taxes.length
              ? taxes.slice(0, FEE_ACCOUNTS_VISIBLE).map((tax) => [getTariff(tax.tariffId)?.name || tax.tariffId, escapeHtml(taxShortValue(tax))])
              : [["Nicio taxă", "—"]],
            more: feeMore("taxes", taxes.length, "taxă", "taxe")
          })}
          ${renderFeeGroup({
            label: "Tarife", icon: "coins", count: tariffs.length,
            rows: tariffs.length
              ? tariffs.slice(0, FEE_ACCOUNTS_VISIBLE).map((tariff) => [tariff.name, escapeHtml(tariffShortValue(tariff))])
              : [["Niciun tarif", "—"]],
            more: feeMore("tariffs", tariffs.length, "tarif", "tarife")
          })}
          ${renderFeeGroup({
            label: "Conturi bancare", icon: "credit-card", count: clasNumber(accounts.length),
            /* the first accounts (principal first): name + the IBAN copy component; the
               rest in the list modal (search + scroll) — an APL service has ~500 */
            rows: accounts.length
              ? accounts.slice(0, FEE_ACCOUNTS_VISIBLE).map((account) => [account.label, renderProfileCopyCode(account.iban, `Copiază IBAN ${account.iban}`)])
              : [["Niciun cont activ", "—"]],
            more: feeMore("accounts", accounts.length, "cont", "conturi")
          })}
        </div>
      </section>
      ${renderServicePayments(service)}
    `;
  };

  /* ---- Notificări — the service's own notification templates (US-187) ----------
     List (Cod, Denumire, Obiect, Reguli, Stare) with "Clonează" and "Șablon nou";
     clone = library modal (system templates only), new = right drawer; both create the
     template Inactiv and open its detail on Texte. "← Șabloane de notificare" returns to
     this tab. Editing and activation are US-184. */
  const NTPL_LANGS = [["ro", "Română"], ["ru", "Русский"], ["en", "English"]];
  const NTPL_SOURCES = ["Dosar", "Plată", "Act permisiv", "Aviz"];
  const NTPL_PRIORITIES = ["Normală", "Înaltă"];
  /* the global templates; origin "Sistem" (shipped) or "Personalizat" (custom) */
  const globalTemplates = () => servicesStore?.notificationTemplates || [];
  /* US-187: only system templates can be cloned into a service */
  const systemTemplates = () => globalTemplates().filter((tpl) => tpl.origin !== "Personalizat");
  const serviceTemplates = (service) => service.geap.notificationTemplates || (service.geap.notificationTemplates = []);
  const templateRulesLabel = (tpl) => (tpl.rules || []).length
    ? `${tpl.rules.length === 1 ? "1 regulă" : `${tpl.rules.length} reguli`}: ${tpl.rules.map((rule) => rule.recipient).join(", ")}`
    : "Fără reguli";

  const renderServiceNotifications = (service) => {
    const tpl = serviceProfileState.templateCode ? serviceTemplates(service).find((item) => item.code === serviceProfileState.templateCode) : null;
    if (tpl) return renderTemplateDetail(service, tpl);

    const admin = isCentralAdmin();
    const list = serviceTemplates(service);
    return `
      <section class="e-permits-dosar-profil__section e-permits-stack-section">
        <h2 class="e-permits-dosar-profil__section-title">Șabloane de notificare</h2>
        <div class="e-permits-pay__toolbar">
            ${list.length ? `
              <div class="search-input medium rectangular e-permits-workplace__search e-permits-list-search e-permits-pay__search${serviceNtplQuery ? " has-value is-ready" : ""}">
                <span class="icon-search" aria-hidden="true"><svg class="icon" width="20" height="20"><use href="assets/icons/sprite.svg#icon-search"></use></svg></span>
                <input class="input" type="search" placeholder="Caută după cod sau denumire" aria-label="Caută șablon de notificare" autocomplete="off" value="${escapeHtml(serviceNtplQuery)}" data-ntpl-svc-search>
                ${renderSearchActions()}
              </div>` : ""}
          <div class="e-permits-pay__tools">
            ${admin ? `
              <button class="btn btn-neutral btn-sm" type="button" data-ntpl-clone>
                <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-copy"></use></svg>
                <span>Clonează</span>
              </button>
              <button class="btn btn-secondary btn-sm" type="button" data-ntpl-new>
                <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-large"></use></svg>
                <span>Șablon nou</span>
              </button>
            ` : ""}
          </div>
        </div>
        <div class="e-permits-sum-list">
          <div data-ntpl-svc-list>${renderServiceNtplList(service)}</div>
          ${renderListNote("Șabloanele serviciului se gestionează independent de cele globale. Le legi de pașii procesului în configurarea tipului de solicitare.")}
        </div>
      </section>
    `;
  };

  let serviceNtplQuery = "";
  const renderServiceNtplList = (service) => {
    const admin = isCentralAdmin();
    const all = serviceTemplates(service);
    const q = clasCore.normName(serviceNtplQuery.trim());
    const list = q ? all.filter((item) => clasCore.normName(`${item.code} ${item.name}`).includes(q)) : all;
    const items = list.map((item) => ({
      plainTitle: item.name,
      title: escapeHtml(item.name),
      badges: [renderTag(item.active ? "Activ" : "Inactiv", item.active ? "success" : "neutral")],
      meta: [renderTag(item.code, "neutral"), `Obiect: ${escapeHtml(item.object || item.dataSource || "—")}`, escapeHtml(templateRulesLabel(item))],
      action: { label: admin ? "Editează" : "Vezi", attrs: `data-ntpl-open="${escapeHtml(item.code)}"` },
      menu: admin ? [
        { label: item.active === false ? "Activează" : "Dezactivează", icon: item.active === false ? "checkmark-large" : "pause", attrs: `data-ntpl-row-toggle="${escapeHtml(item.code)}"` },
        { label: "Șterge", icon: "delete", danger: true, attrs: `data-ntpl-row-delete="${escapeHtml(item.code)}"` }
      ] : []
    }));

    return items.length ? `
      <div class="e-permits-stack">
        <div class="e-permits-stack__group">
          <ul class="e-permits-stack__list" role="list">${items.map(renderStackItem).join("")}</ul>
        </div>
      </div>
    ` : all.length
      ? renderNoResults("Niciun șablon nu corespunde căutării")
      : renderEmptyState({ title: "Niciun șablon de notificare propriu", text: "Creează unul nou sau clonează un șablon de sistem." });
  };

  /* =====================================================================
     Servicii › Șabloane — document templates kept in MDocs (acts, decisions,
     payment notes). List: eye = constructor (full-screen sheet), Editează =
     details drawer, ⋮ = Șterge. Toolbar: Importă din MDocs (modal) · Șablon nou (modal →
     constructor). Every template belongs to this service only — created from scratch or
     imported, never attached from a shared catalog (A. Pascalov, 2026-10-07). Constructor: Șablon · Date de test (JSON)
     · Previzualizare, "Câmpuri disponibile" panel, Vizual / HTML, Publică în MDocs.
     ===================================================================== */
  const DTPL_TYPES = ["Act permisiv", "Certificat", "Decizie", "Notă de plată", "Aviz"];
  const DTPL_FIELD_GROUPS = [
    ["Dosar", [["Numărul dosarului", "CaseNumber", "D-2026-004575"], ["Data depunerii", "SubmittedOn", "5 iulie 2026"], ["Termenul de examinare", "DueOn", "16 iulie 2026"], ["Suspendat la", "SuspendedOn", "8 iulie 2026"], ["Suspendat până la", "SuspendedUntil", "30 iulie 2026"], ["Motivul suspendării", "SuspensionReason", "Lipsește avizul de mediu"], ["Denumirea serviciului", "ServiceTitle", "Autorizație sanitară de funcționare"], ["Autoritatea emitentă", "AuthorityName", "Agenția Națională pentru Sănătate Publică"], ["Subdiviziunea", "TeamName", "CSP Chișinău"], ["Tipul solicitării", "SubServiceName", "Eliberare"]]],
    ["Solicitant", [["Numele solicitantului", "ApplicantName", "Victor Grosu"], ["Denumirea persoanei juridice", "CompanyName", "SRL Construct Plus"], ["IDNO", "IDNO", "1018601000021"], ["IDNP", "IDNP", "2004001234567"], ["Adresa juridică", "LegalAddress", "mun. Chișinău, str. Ismail 45"], ["E-mail", "ApplicantEmail", "office@constructplus.md"], ["Telefon", "ApplicantPhone", "+373 69 123 456"], ["Persoană juridică", "IsLegalEntity", "Da"]]],
    ["Act permisiv", [["Numărul actului", "PermitNumber", "AUT-2026-004575"], ["Data emiterii", "IssuedOn", "18 iulie 2026"], ["Valabil până la", "ValidUntil", "18 iulie 2031"], ["Obiectul autorizat", "PermitObject", "Cafenea „La Plăcinte”"], ["Genul de activitate (CAEM)", "ActivityCode", "56.10 — Restaurante"]]],
    ["Plată", [["Numărul notei de plată", "PaymentNoteNumber", "MPAY-470173"], ["Suma", "Amount", "560 MDL"], ["Termenul de achitare", "PaymentDueOn", "12 iulie 2026"], ["Contul bancar", "BankAccount", "MD24AG000000022512345678"]]],
    ["Semnare", [["Semnat de", "SignedBy", "Ion Popescu, director"], ["Data semnării", "SignedOn", "18 iulie 2026"], ["Semnat electronic", "IsSigned", "Da"]]]
  ];
  const DTPL_FIELD_MAP = new Map(DTPL_FIELD_GROUPS.flatMap(([group, fields]) => fields.map(([label, token, sample]) => [token, { label, token, sample, group }])));
  const DTPL_TOOLBAR = [["bold", "text-bold", "Aldin"], ["italic", "text-italic", "Cursiv"], ["underline", "text-underline", "Subliniat"], "|", ["insertUnorderedList", "list-bullets", "Listă cu puncte"], ["insertOrderedList", "list-numbers", "Listă numerotată"], "|", ["insertIf", "brackets", "Bloc condiționat {{#if}}"], "|", ["undo", "undo", "Anulează"], ["redo", "redo", "Refă"], ["removeFormat", "eraser", "Șterge formatarea"]];
  const DTPL_BLOCKS = [["p", "Normal"], ["h1", "Titlu"], ["h2", "Subtitlu"], ["h3", "Titlu de secțiune"]];
  const DTPL_TOKEN_RE = /\{\{\s*([#/]?)([A-Za-z][A-Za-z0-9._]*)?\s*([A-Za-z][A-Za-z0-9._]*)?\s*\}\}/g;

  const dtplCodeFrom = (name) => `GEAP.${String(name || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join("").slice(0, 40) || "Sablon"}`;
  const dtplVersion = (v) => { const m = String(v || "").match(/(\d+)(?:\.(\d+))?(?:\.(\d+))?/); return m ? `v${m[1]}.${m[2] || 0}.${m[3] || 0}` : "v1.0.0"; };
  const dtplBump = (v) => { const [a, b] = dtplVersion(v).slice(1).split(".").map(Number); return `v${a}.${b + 1}.0`; };

  const dtplDefaultHtml = (tpl, service) => {
    const title = (tpl.type || tpl.name || "Document").toLocaleUpperCase("ro");
    const permit = /act|certificat|aviz/i.test(tpl.type || "");
    return `<p><strong>{{AuthorityName}}</strong><br>{{TeamName}}</p>
<h1>${escapeHtml(title)}</h1>
<p>Nr. {{${permit ? "PermitNumber" : "CaseNumber"}}} din {{IssuedOn}}</p>
<table>
<tr><td>1. Titularul</td><td>{{#if IsLegalEntity}}{{CompanyName}}, reprezentată de {{/if}}{{ApplicantName}}</td></tr>
<tr><td>2. Cod fiscal</td><td>{{IDNO}}</td></tr>
<tr><td>3. Obiectul autorizat</td><td>{{PermitObject}}</td></tr>
<tr><td>4. Adresa desfășurării activității</td><td>{{ActivityAddress}}</td></tr>
<tr><td>5. Genul de activitate (CAEM)</td><td>{{ActivityCode}}</td></tr>
</table>
<p>Se eliberează în baza materialelor de supraveghere din {{InspectionDate}}, pentru serviciul „${escapeHtml(service?.title || "")}”.</p>
<p>Valabil până la {{ValidUntil}}.</p>
<p>{{#if IsSigned}}<em>Semnat electronic</em> — {{SignedBy}}, {{SignedOn}}{{/if}}</p>`;
  };

  /* service.geap.templates rows from the data get the fields the screen shows, once */
  const serviceDocTemplates = (service) => {
    const list = service.geap.templates || (service.geap.templates = []);
    list.forEach((tpl, index) => {
      if (tpl.code) return;
      Object.assign(tpl, {
        code: dtplCodeFrom(tpl.name),
        version: dtplVersion(tpl.version),
        status: "published",
        description: tpl.description || `Șablon MDocs pentru ${String(tpl.type || "document").toLocaleLowerCase("ro")} eliberat de autoritate.`,
        source: "MDocs",
        editedAt: tpl.updated ? `${tpl.updated}T10:00:00` : localIsoNow(),
        editedBy: "Alexandr Pascalov",
        html: dtplDefaultHtml(tpl, service),
        testData: {},
        history: [{ version: dtplVersion(tpl.version), at: tpl.updated ? `${tpl.updated}T10:00:00` : localIsoNow(), by: "Alexandr Pascalov", note: "Versiune publicată în MDocs." }],
        /* the first one shows the "changed in MDocs by someone else" state */
        mdocsChange: index === 0 ? { at: "2026-09-22T14:17:00", by: "geap-backoffice (staging)" } : null
      });
    });
    return list;
  };

  /* which request types generate a print template (02a › Documente generate). Until a
     type is saved with its own choice, the first one (Emitere primară) issues them all */
  /* the print templates a request type generates: per document step of its flow, the
     service template that replaces it, or the one of the step's document type */
  const rtTemplateCodes = (service, rt) => {
    const flow = getFlowById(rt.flow);
    if (!flow) return [];
    return passport.documentSteps(flow).map((st) => (rt.docOverrides || {})[st.key] || serviceDocTemplates(service).find((t) => t.type === st.docType)?.code).filter(Boolean);
  };
  const dtplRequestTypes = (service, code) => service.geap.requestTypes.filter((rt) => rtTemplateCodes(service, rt).includes(code));

  /* tokens of a template: known (in a field group), helpers ({{#if}}/{{/if}}), unknown */
  const dtplTokens = (html) => {
    const used = new Set(), unknown = new Set();
    String(html || "").replace(DTPL_TOKEN_RE, (m, sign, name, arg) => {
      const token = sign ? arg : name;
      if (!token || token === "if" || token === "each") return m;
      used.add(token);
      if (!DTPL_FIELD_MAP.has(token)) unknown.add(token);
      return m;
    });
    return { used: [...used], unknown: [...unknown] };
  };

  /* Date de test = one JSON object, as in MDocs (A. Pascalov, 2026-10-07): the key is the field
     name; nested objects fill dotted fields ({"Applicant":{"Name":"…"}} → {{Applicant.Name}}) */
  const dtplFlatten = (obj, prefix = "", out = {}) => {
    Object.entries(obj || {}).forEach(([key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === "object" && !Array.isArray(value)) dtplFlatten(value, path, out);
      else out[path] = value == null ? "" : String(value);
    });
    return out;
  };
  const dtplParseJson = (text) => {
    try {
      const value = JSON.parse(String(text || "").trim() || "{}");
      if (!value || typeof value !== "object" || Array.isArray(value)) return { error: "Datele de test trebuie să fie un obiect: { \"Câmp\": \"valoare\" }." };
      return { data: dtplFlatten(value), raw: value };
    } catch (error) {
      /* the browser's message is English and differs per engine — say where and what, in Romanian */
      const msg = String(error.message || ""), text0 = String(text || "");
      const pos = Number((msg.match(/position (\d+)/) || [])[1]);
      const lc = msg.match(/line (\d+) column (\d+)/);
      const before = Number.isFinite(pos) ? text0.slice(0, pos).split("\n") : null;
      const line = lc ? lc[1] : before ? before.length : null, col = lc ? lc[2] : before ? before[before.length - 1].length + 1 : null;
      const what = /Expected ',' or '[}\]]'|expected ',' or/i.test(msg) ? "lipsește o virgulă sau o acoladă de închidere"
        : /end of (JSON|data)|Unexpected end/i.test(msg) ? "JSON-ul se termină prea devreme"
        : /property name|double-quoted/i.test(msg) ? "cheile și textele se scriu între ghilimele duble"
        : "caracter neașteptat";
      return { error: `JSON invalid${line ? ` la linia ${line}, coloana ${col}` : ""}: ${what}.` };
    }
  };
  /* every field the template uses, with its current or sample value */
  const dtplSampleJson = (html, data = {}) => JSON.stringify(Object.fromEntries(dtplTokens(html).used.map((t) => [t, data[t] ?? DTPL_FIELD_MAP.get(t)?.sample ?? ""])), null, 2);

  /* visual mode: tokens become non-editable chips; reading back turns them into text */
  const dtplMarkTokens = (html) => String(html || "").replace(DTPL_TOKEN_RE, (m, sign, name, arg) => {
    const token = sign ? arg : name;
    const kind = sign || name === "if" || name === "each" ? "is-logic" : DTPL_FIELD_MAP.has(token) ? "" : "is-unknown";
    return `<span class="e-permits-dtpl-token${kind ? ` ${kind}` : ""}" contenteditable="false"${kind === "is-unknown" ? ' title="Câmp inexistent în sursele de date"' : ""}>${escapeHtml(m)}</span>`;
  });
  const dtplReadSurface = (surface) => {
    const copy = surface.cloneNode(true);
    copy.querySelectorAll(".e-permits-dtpl-token").forEach((chip) => chip.replaceWith(document.createTextNode(chip.textContent)));
    return copy.innerHTML.trim();
  };
  const dtplFill = (html, data) => String(html || "")
    .replace(/<\/?(script|style|iframe)[^>]*>/gi, "")
    .replace(/\{\{\s*#if\s+([A-Za-z0-9._]+)\s*\}\}([\s\S]*?)\{\{\s*\/if\s*\}\}/g, (m, flag, inner) => (/^(da|true|1)$/i.test(String(data[flag] ?? DTPL_FIELD_MAP.get(flag)?.sample ?? "")) ? inner : ""))
    .replace(/\{\{\s*([A-Za-z][A-Za-z0-9._]*)\s*\}\}/g, (m, token) => {
      const value = data[token] ?? DTPL_FIELD_MAP.get(token)?.sample;
      return value ? `<mark class="e-permits-ntpl-preview__token" title="{{${token}}}">${escapeHtml(value)}</mark>` : `<mark class="e-permits-dtpl-token is-unknown" title="Câmp inexistent">${escapeHtml(m)}</mark>`;
    });

  /* ---- list ---- */
  let dtplQuery = "";
  const renderDtplRows = (service) => {
    const admin = isCentralAdmin();
    const all = serviceDocTemplates(service);
    const q = clasCore.normName(dtplQuery.trim());
    const rows = q ? all.filter((t) => clasCore.normName(`${t.name} ${t.code} ${t.type || ""}`).includes(q)) : all;
    if (!all.length) return renderEmptyState({ title: "Serviciul nu are șabloane de tipar", text: "Creează unul nou sau importă-l din MDocs." });
    if (!rows.length) return renderNoResults("Niciun șablon nu corespunde căutării");
    return `
      <div class="e-permits-stack">
        <div class="e-permits-stack__group">
          <ul class="e-permits-stack__list" role="list">${rows.map((t) => renderStackItem({
            plainTitle: t.name,
            title: escapeHtml(t.name),
            badges: [t.status === "draft" ? renderTag("Schiță · nepublicat în MDocs", "warning") : t.status === "unpublished" ? renderTag("Modificări nepublicate", "warning") : renderTag("Publicat", "success")],
            /* every template is a PDF from MDocs (the note under the list says so), so the
               row shows what differs: type, version, and where it is generated */
            meta: [renderTag(t.code, "neutral"), escapeHtml(t.type || "—"), escapeHtml(t.version), `Editat ${escapeHtml(formatStamp(t.editedAt))} · ${escapeHtml(t.editedBy || "—")}`],
            meta2: [(() => { const used = dtplRequestTypes(service, t.code); return `Generat la ${used.length ? `<span class="e-permits-passport__tag-list">${used.map((rt) => renderTag(rt.name, "neutral")).join("")}</span>` : '<span class="e-permits-passport__muted">niciun tip de solicitare</span>'}`; })()],
            actionsHtml: `
              <button class="btn btn-strict btn-sm btn-icon-only" type="button" aria-label="Previzualizează: ${escapeHtml(t.name)}" data-tooltip-label="Previzualizează" aria-haspopup="dialog" aria-controls="tpl-preview" aria-expanded="false" data-dtpl-preview="${escapeHtml(t.code)}">
                <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-eye-open"></use></svg>
              </button>
              ${admin ? `<button class="btn btn-neutral btn-sm e-permits-stack__action" type="button" data-dtpl-edit="${escapeHtml(t.code)}">${EDIT_LABEL_HTML}</button>` : ""}
              ${admin ? renderStackMenu([
                { label: "Șterge", icon: "delete", danger: true, attrs: `data-dtpl-delete="${escapeHtml(t.code)}"` }
              ], t.name) : ""}`
          })).join("")}</ul>
        </div>
      </div>`;
  };

  const renderServiceDocTemplates = (service) => {
    const admin = isCentralAdmin();
    const all = serviceDocTemplates(service);
    return `
      <section class="e-permits-dosar-profil__section e-permits-stack-section">
        <h2 class="e-permits-dosar-profil__section-title">Șabloane de tipar</h2>
        <div class="e-permits-pay__toolbar">
            ${all.length ? `
              <div class="search-input medium rectangular e-permits-workplace__search e-permits-list-search e-permits-pay__search${dtplQuery ? " has-value is-ready" : ""}">
                <span class="icon-search" aria-hidden="true"><svg class="icon" width="20" height="20"><use href="assets/icons/sprite.svg#icon-search"></use></svg></span>
                <input class="input" type="search" placeholder="Caută după denumire, cod sau tip" aria-label="Caută șablon de tipar" autocomplete="off" value="${escapeHtml(dtplQuery)}" data-dtpl-search>
                ${renderSearchActions()}
              </div>` : ""}
          <div class="e-permits-pay__tools">
            ${admin ? `
              <button class="btn btn-neutral btn-sm" type="button" data-dtpl-import>
                <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-download"></use></svg>
                <span>Importă din MDocs</span>
              </button>
              <button class="btn btn-secondary btn-sm" type="button" aria-haspopup="dialog" aria-controls="dtpl-new-modal" aria-expanded="false" data-dtpl-new>
                <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-large"></use></svg>
                <span>Șablon nou</span>
              </button>` : ""}
          </div>
        </div>
        <div class="e-permits-sum-list">
          <div data-dtpl-list>${renderDtplRows(service)}</div>
          ${renderListNote("Documentele generate de serviciu sunt păstrate și versionate în <strong>MDocs</strong>. Le legi de pașii procesului în configurarea tipului de solicitare.")}
        </div>
      </section>`;
  };

  const dtplService = () => getServiceByCode(serviceProfileState.code);
  const dtplFind = (code, service = dtplService()) => (service ? serviceDocTemplates(service).find((t) => t.code === code) : null);
  /* Șabloane › eye = view-only preview (same A4 page as the request-type preview); the
     builder is one step further: „Deschide constructorul” in the preview's footer */
  const tplPreview = document.querySelector("[data-tpl-preview]");
  let tplPreviewTrigger = null;
  const fitTplPreview = () => {
    const canvas = tplPreview?.querySelector("[data-tpl-preview-canvas]"); const page = canvas?.querySelector(".e-permits-dtpl__page");
    if (page) page.style.zoom = String(Math.min(1, (canvas.clientWidth - 48) / 794));
  };
  const openTplPreview = (code, trigger) => {
    const service = dtplService(); const tpl = service && serviceDocTemplates(service).find((t) => t.code === code);
    if (!tpl || !tplPreview) return;
    tplPreview.querySelector("[data-tpl-preview-title]").textContent = tpl.name;
    tplPreview.querySelector("[data-tpl-preview-subtitle]").innerHTML = `${renderTag(tpl.code, "neutral")} ${escapeHtml(tpl.type || "—")} · ${escapeHtml(tpl.version)} ${renderTag("Doar vizualizare", "neutral")}`;
    tplPreview.querySelector("[data-tpl-preview-canvas]").innerHTML = `<div class="e-permits-dtpl__page e-permits-doc-peek__page"${tpl.background ? ` style="background-image:url('${tpl.background}')"` : ""}><div class="e-permits-dtpl__surface">${dtplFill(tpl.html, tpl.testData || {})}</div></div>`;
    tplPreview.querySelector("[data-tpl-preview-buttons]").innerHTML = `
      <button class="btn btn-neutral btn-rounded" type="button" data-tpl-preview-close>Închide</button>
      ${isCentralAdmin() ? `<button class="btn btn-primary btn-rounded" type="button" data-tpl-preview-builder="${escapeHtml(tpl.code)}">Deschide constructorul</button>` : ""}`;
    tplPreviewTrigger = trigger || null;
    tplPreviewTrigger?.setAttribute("aria-expanded", "true");
    tplPreview.hidden = false;
    document.body.classList.add("is-user-create-open");
    fitTplPreview();
    requestAnimationFrame(() => tplPreview.querySelector(".e-permits-user-create__close")?.focus());
  };
  const closeTplPreview = (after) => {
    if (!tplPreview || tplPreview.hidden || tplPreview.classList.contains("is-closing")) return;
    tplPreview.classList.add("is-closing");
    window.setTimeout(() => {
      tplPreview.hidden = true; tplPreview.classList.remove("is-closing");
      document.body.classList.remove("is-user-create-open");
      tplPreviewTrigger?.setAttribute("aria-expanded", "false");
      if (after) after(); else tplPreviewTrigger?.focus?.();
    }, 120);
  };
  tplPreview?.addEventListener("click", (event) => {
    if (event.target.closest("[data-tpl-preview-close]")) { closeTplPreview(); return; }
    const b = event.target.closest("[data-tpl-preview-builder]");
    if (b) { const code = b.dataset.tplPreviewBuilder; closeTplPreview(() => openDtpl(code)); }
  });
  tplPreview?.addEventListener("keydown", (event) => { if (event.key === "Escape") { event.preventDefault(); closeTplPreview(); } });
  window.addEventListener("resize", fitTplPreview);

  const refreshDtplList = () => { const service = dtplService(); const box = permitsProfilePanel?.querySelector("[data-dtpl-list]"); if (service && box) box.innerHTML = renderDtplRows(service); else renderServiceProfile(); };

  /* ---- drawers (Editează · Atașează) share the open / close ---- */
  const dtplDrawerOpen = (drawer, focusSel) => {
    drawer.hidden = false;
    document.body.classList.add("is-user-create-open");
    requestAnimationFrame(() => drawer.querySelector(focusSel)?.focus());
  };
  const dtplDrawerClose = (drawer, after) => {
    if (!drawer || drawer.hidden || drawer.classList.contains("is-closing")) return;
    closeFoSelect();
    drawer.classList.add("is-closing");
    window.setTimeout(() => { drawer.hidden = true; drawer.classList.remove("is-closing"); document.body.classList.remove("is-user-create-open"); after?.(); }, 120);
  };

  const dtplEditDrawer = document.querySelector("[data-dtpl-edit-drawer]");
  let dtplEdit = null;
  const renderDtplEdit = () => {
    const e = dtplEdit, service = dtplService(), tpl = dtplFind(e.code);
    dtplEditDrawer.querySelector("[data-dtpl-subtitle]").textContent = `${tpl.code} · ${service?.title || ""}`;
    dtplEditDrawer.querySelector("[data-dtpl-body]").innerHTML = `
      <div class="e-permits-clas-create">
        ${clasCreateSection("Identificare", `<div class="e-permits-user-create__grid">
          <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
            <label for="dtpl-e-name">Denumirea șablonului${requiredMark()}</label>
            <div class="e-permits-fo-input${e.errors.name ? " is-error" : ""}"><input id="dtpl-e-name" type="text" value="${escapeHtml(e.name)}" autocomplete="off" data-dtpl-e="name"></div>
            ${clasFieldError(e.errors, "name")}
            ${e.errors.name ? "" : '<p class="e-permits-fo-field__hint">Cum apare în lista serviciului și în pașii de proces.</p>'}
          </div>
          ${clasTextarea("dtpl-e-desc", 'data-dtpl-e="description"', e.description, { label: "Descriere scurtă", hint: "Pentru administratori — nu apare pe document.", placeholder: "Ex. Actul permisiv emis după aprobarea dosarului." })}
        </div>`)}
        ${renderPassportBlock("Din MDocs", [["Cod", renderTag(tpl.code, "neutral")], ["Versiune", escapeHtml(tpl.version)], ["Tip document", escapeHtml(tpl.type || "—")], ["Generat la", escapeHtml(dtplRequestTypes(service, tpl.code).map((rt) => rt.name).join(", ") || "niciun tip de solicitare")]])}
      </div>`;
  };
  const openDtplEdit = (code) => {
    const tpl = dtplFind(code);
    if (!tpl || !dtplEditDrawer) return;
    dtplEdit = { code, name: tpl.name, description: tpl.description || "", errors: {}, dirty: false, ret: document.activeElement };
    renderDtplEdit();
    dtplDrawerOpen(dtplEditDrawer, "#dtpl-e-name");
  };
  const closeDtplEdit = (force = false) => {
    if (!force && dtplEdit?.dirty) { askConfirm({ title: "Renunți la modificări?", text: "Detaliile schimbate în acest formular se pierd.", confirmLabel: "Renunță", destructive: true }, () => closeDtplEdit(true)); return; }
    const ret = dtplEdit?.ret;
    dtplDrawerClose(dtplEditDrawer, () => { dtplEdit = null; ret?.focus?.(); });
  };
  const saveDtplEdit = () => {
    const e = dtplEdit, tpl = dtplFind(e.code), service = dtplService();
    e.errors = e.name.trim() ? {} : { name: "Completează denumirea." };
    if (!e.errors.name && serviceDocTemplates(service).some((t) => t !== tpl && clasCore.normName(t.name) === clasCore.normName(e.name))) e.errors.name = "Serviciul are deja un șablon cu această denumire.";
    if (e.errors.name) { renderDtplEdit(); dtplEditDrawer.querySelector("#dtpl-e-name")?.focus(); return; }
    Object.assign(tpl, { name: e.name.trim(), description: e.description.trim(), editedAt: localIsoNow(), editedBy: currentUserName() });
    logServiceEvents(service.code, [{ at: tpl.editedAt, user: tpl.editedBy, type: "Modificare șablon de tipar", status: "Reușit", detail: tpl.code }]);
    closeDtplEdit(true);
    refreshDtplList();
    showShellToast(`Detaliile „${tpl.name}” au fost salvate.`, "success", "Șablon salvat");
  };
  dtplEditDrawer?.addEventListener("click", (event) => {
    if (event.target.closest("[data-dtpl-drawer-close]")) { closeDtplEdit(); return; }
    if (event.target.closest("[data-dtpl-edit-save]")) saveDtplEdit();
  });
  dtplEditDrawer?.addEventListener("input", (event) => {
    const f = event.target.closest("[data-dtpl-e]");
    if (!f || !dtplEdit) return;
    dtplEdit[f.dataset.dtplE] = f.value; dtplEdit.dirty = true;
    clearClasFieldError(event.target, null);
  });
  dtplEditDrawer?.addEventListener("change", (event) => {
    const f = event.target.closest("[data-dtpl-e-select]");
    if (f && dtplEdit) { dtplEdit[f.dataset.dtplESelect] = f.value; dtplEdit.dirty = true; }
  });

  dtplEditDrawer?.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || document.querySelector(".modal-overlay.is-active, body > .e-permits-fo-select__list")) return;
    event.preventDefault();
    closeDtplEdit();
  });

  /* ---- Importă din MDocs — library modal ---- */
  const dtplImportModal = document.querySelector("#dtpl-import-modal");
  let dtplImport = null;
  const renderDtplImport = () => {
    const d = dtplImport;
    const input = (key, label, placeholder, hint) => `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
        <label for="dtpl-i-${key}">${label}${requiredMark()}</label>
        <div class="e-permits-fo-input${d.errors[key] ? " is-error" : ""}"><input id="dtpl-i-${key}" type="text" value="${escapeHtml(d[key])}" placeholder="${escapeHtml(placeholder)}" autocomplete="off" data-dtpl-i="${key}"></div>
        ${clasFieldError(d.errors, key)}
        ${hint && !d.errors[key] ? `<p class="e-permits-fo-field__hint">${hint}</p>` : ""}
      </div>`;
    dtplImportModal.querySelector("[data-dtpl-import-body]").innerHTML = `
      <div class="e-permits-case-form"><div class="e-permits-user-create__grid">
        ${input("code", "Codul șablonului în MDocs", "Ex. GEAP.ActPermisiv", "Exact cum apare în MDocs. Versiunea publicată se preia automat.")}
        ${input("name", "Denumire", "Ex. Act permisiv", "")}
        <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
          <label for="dtpl-i-type">Tip document</label>
          ${renderFoSelectControl({ id: "dtpl-i-type", attrs: 'data-dtpl-i-select="type"', optionsHtml: DTPL_TYPES.map((t) => `<option value="${escapeHtml(t)}"${t === d.type ? " selected" : ""}>${escapeHtml(t)}</option>`).join("") })}
        </div>
      </div></div>`;
  };
  const openDtplImport = () => {
    if (!dtplImportModal || !isCentralAdmin()) return;
    dtplImport = { code: "", name: "", type: DTPL_TYPES[0], errors: {} };
    renderDtplImport();
    window.__modal?.open?.("#dtpl-import-modal");
    requestAnimationFrame(() => dtplImportModal.querySelector("#dtpl-i-code")?.focus());
  };
  const saveDtplImport = () => {
    const d = dtplImport, service = dtplService();
    d.errors = {};
    if (!d.code.trim()) d.errors.code = "Completează codul din MDocs.";
    else if (!/^[A-Za-z][A-Za-z0-9._]*$/.test(d.code.trim())) d.errors.code = "Doar litere, cifre și punct, fără spații.";
    else if (serviceDocTemplates(service).some((t) => t.code.toLowerCase() === d.code.trim().toLowerCase())) d.errors.code = "Serviciul are deja un șablon cu acest cod.";
    if (!d.name.trim()) d.errors.name = "Completează denumirea.";
    if (Object.keys(d.errors).length) { renderDtplImport(); dtplImportModal.querySelector(".is-error input")?.focus(); return; }
    const at = localIsoNow(), by = currentUserName();
    const tpl = { name: d.name.trim(), type: d.type, format: "PDF · MDocs", code: d.code.trim(), version: "v1.0.0", status: "published", description: "", source: "MDocs", editedAt: at, editedBy: by, testData: {}, history: [{ version: "v1.0.0", at, by, note: "Importat din MDocs." }], mdocsChange: null };
    tpl.html = dtplDefaultHtml(tpl, service);
    serviceDocTemplates(service).push(tpl);
    logServiceEvents(service.code, [{ at, user: by, type: "Import șablon din MDocs", status: "Reușit", detail: tpl.code }]);
    window.__modal?.close?.("#dtpl-import-modal");
    dtplImport = null;
    renderServiceProfile();
    showShellToast(`„${tpl.name}” a fost importat din MDocs.`, "success", "Șablon importat");
  };

  /* ---- Șablon nou — created from scratch for this service only (library modal), then the
     constructor opens on the draft; it goes to MDocs with „Publică în MDocs” ---- */
  const dtplNewModal = document.querySelector("#dtpl-new-modal");
  let dtplNew = null;
  const renderDtplNew = () => {
    const d = dtplNew;
    const input = (key, label, placeholder, hint) => `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
        <label for="dtpl-n-${key}">${label}${requiredMark()}</label>
        <div class="e-permits-fo-input${d.errors[key] ? " is-error" : ""}"><input id="dtpl-n-${key}" type="text" value="${escapeHtml(d[key])}" placeholder="${escapeHtml(placeholder)}" autocomplete="off" data-dtpl-n="${key}"></div>
        ${clasFieldError(d.errors, key)}
        ${hint && !d.errors[key] ? `<p class="e-permits-fo-field__hint">${hint}</p>` : ""}
      </div>`;
    dtplNewModal.querySelector("[data-dtpl-new-body]").innerHTML = `
      <div class="e-permits-case-form"><div class="e-permits-user-create__grid">
        ${input("name", "Denumire", "Ex. Decizie de respingere", "Cum apare în lista serviciului și în pașii de proces.")}
        <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
          <label for="dtpl-n-type">Tip document${requiredMark()}</label>
          ${renderFoSelectControl({ id: "dtpl-n-type", attrs: 'data-dtpl-n-select="type"', optionsHtml: DTPL_TYPES.map((t) => `<option value="${escapeHtml(t)}"${t === d.type ? " selected" : ""}>${escapeHtml(t)}</option>`).join("") })}
        </div>
        ${input("code", "Cod în MDocs", "Ex. GEAP.DecizieRespingere", "Se completează din denumire; cu acest cod se publică în MDocs.")}
      </div></div>`;
  };
  const openDtplNew = (trigger) => {
    if (!dtplNewModal || !isCentralAdmin()) return;
    dtplNew = { name: "", type: DTPL_TYPES[0], code: "", codeTouched: false, errors: {}, trigger };
    renderDtplNew();
    trigger?.setAttribute("aria-expanded", "true");
    window.__modal?.open?.("#dtpl-new-modal");
    requestAnimationFrame(() => dtplNewModal.querySelector("#dtpl-n-name")?.focus());
  };
  const saveDtplNew = () => {
    const d = dtplNew, service = dtplService(), list = serviceDocTemplates(service);
    d.errors = {};
    if (!d.name.trim()) d.errors.name = "Completează denumirea.";
    else if (list.some((t) => clasCore.normName(t.name) === clasCore.normName(d.name))) d.errors.name = "Serviciul are deja un șablon cu această denumire.";
    if (!d.code.trim()) d.errors.code = "Completează codul.";
    else if (!/^[A-Za-z][A-Za-z0-9._]*$/.test(d.code.trim())) d.errors.code = "Doar litere, cifre și punct, fără spații.";
    else if (list.some((t) => t.code.toLowerCase() === d.code.trim().toLowerCase())) d.errors.code = "Serviciul are deja un șablon cu acest cod.";
    if (Object.keys(d.errors).length) { renderDtplNew(); dtplNewModal.querySelector(".is-error input")?.focus(); return; }
    const at = localIsoNow(), by = currentUserName();
    const tpl = { name: d.name.trim(), type: d.type, format: "PDF · MDocs", code: d.code.trim(), version: "v0.1.0", status: "draft", description: "", source: "GEAP", editedAt: at, editedBy: by, testData: {}, history: [], mdocsChange: null };
    tpl.html = dtplDefaultHtml(tpl, service);
    list.push(tpl);
    logServiceEvents(service.code, [{ at, user: by, type: "Creare șablon de tipar", status: "Reușit", detail: tpl.code }]);
    d.trigger?.setAttribute("aria-expanded", "false");
    window.__modal?.close?.("#dtpl-new-modal");
    dtplNew = null;
    renderServiceProfile();
    openDtpl(tpl.code);
  };
  dtplNewModal?.addEventListener("click", (event) => { if (event.target.closest("[data-dtpl-new-save]")) saveDtplNew(); });
  dtplNewModal?.addEventListener("input", (event) => {
    const f = event.target.closest("[data-dtpl-n]");
    if (!f || !dtplNew) return;
    dtplNew[f.dataset.dtplN] = f.value;
    if (f.dataset.dtplN === "code") dtplNew.codeTouched = Boolean(f.value);
    /* the code follows the name until it is typed by hand */
    if (f.dataset.dtplN === "name" && !dtplNew.codeTouched) { dtplNew.code = f.value.trim() ? dtplCodeFrom(f.value) : ""; const c = dtplNewModal.querySelector("#dtpl-n-code"); if (c) c.value = dtplNew.code; }
    clearClasFieldError(event.target, null);
  });
  dtplNewModal?.addEventListener("change", (event) => { const f = event.target.closest("[data-dtpl-n-select]"); if (f && dtplNew) dtplNew.type = f.value; });
  dtplImportModal?.addEventListener("click", (event) => { if (event.target.closest("[data-dtpl-import-save]")) saveDtplImport(); });
  dtplImportModal?.addEventListener("input", (event) => {
    const f = event.target.closest("[data-dtpl-i]");
    if (!f || !dtplImport) return;
    dtplImport[f.dataset.dtplI] = f.value;
    clearClasFieldError(event.target, null);
  });
  dtplImportModal?.addEventListener("change", (event) => { const f = event.target.closest("[data-dtpl-i-select]"); if (f && dtplImport) dtplImport.type = f.value; });

  /* ---- Șterge — the template belongs to this service only ---- */
  const deleteDtpl = (code) => {
    const service = dtplService(), list = serviceDocTemplates(service), tpl = dtplFind(code);
    if (!tpl) return;
    const used = dtplRequestTypes(service, code);
    askConfirm({ title: `Ștergi „${tpl.name}”?`, text: `${used.length ? `Îl generează ${plural(used.length, "tip de solicitare", "tipuri de solicitare")} (${used.map((rt) => rt.name).join(", ")}); pașii rămân fără document până alegi altul. ` : ""}Documentele deja emise rămân în dosare. Acțiunea nu se poate anula.`, confirmLabel: "Șterge", destructive: true }, () => {
      list.splice(list.indexOf(tpl), 1);
      logServiceEvents(service.code, [{ at: localIsoNow(), user: currentUserName(), type: "Ștergere șablon de tipar", status: "Reușit", detail: code }]);
      renderServiceProfile();
      showShellToast(`„${tpl.name}” a fost șters.`, "success", "Șablon șters");
    });
  };

  /* ---- constructor — full-screen sheet ---- */
  const dtplSheet = document.querySelector("[data-dtpl-sheet]");
  const dtplPanel = dtplSheet?.querySelector("[data-dtpl-panel]");
  const dtplState = { code: null, view: "template", mode: "visual", fieldQuery: "", collapsed: new Set(), draft: null, dirty: false, range: null, ret: null };
  const dtplTpl = () => dtplFind(dtplState.code);

  const renderDtplFields = () => {
    const q = clasCore.normName(dtplState.fieldQuery.trim());
    const groups = DTPL_FIELD_GROUPS.map(([group, fields]) => [group, q ? fields.filter(([label, token]) => clasCore.normName(`${label} ${token}`).includes(q)) : fields]).filter(([, f]) => f.length);
    return groups.length ? groups.map(([group, fields]) => {
      const open = q || !dtplState.collapsed.has(group);
      return `
        <section class="e-permits-dtpl-fields__group">
          <button class="e-permits-dtpl-fields__head" type="button" aria-expanded="${open ? "true" : "false"}" data-dtpl-group="${escapeHtml(group)}">
            <span class="e-permits-dtpl-fields__title">${escapeHtml(group)}</span>
            <span class="e-permits-page-header__tab-count">${fields.length}</span>
            <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-${open ? "top" : "bottom"}-small"></use></svg>
          </button>
          ${open ? `<ul class="e-permits-dtpl-fields__list" role="list">${fields.map(([label, token]) => `
            <li><button class="e-permits-fo-intent-menu__item e-permits-ntpl-picker__item" type="button" draggable="true" data-dtpl-token="{{${escapeHtml(token)}}}" aria-label="Inserează ${escapeHtml(label)}">
              <span class="e-permits-ntpl-picker__label">${escapeHtml(label)}</span>
              <span class="e-permits-ntpl-picker__token">{{${escapeHtml(token)}}}</span>
            </button></li>`).join("")}</ul>` : ""}
        </section>`;
    }).join("") : '<p class="e-permits-dtpl-fields__empty">Niciun câmp nu corespunde căutării.</p>';
  };

  const renderDtplTemplateView = () => {
    const d = dtplState.draft;
    const { unknown } = dtplTokens(d.html);
    return `
      <div class="e-permits-dtpl__work">
        <aside class="e-permits-dtpl-fields" aria-labelledby="dtpl-fields-title">
          <h2 class="e-permits-dtpl-fields__heading" id="dtpl-fields-title">Câmpuri disponibile</h2>
          <p class="e-permits-dtpl-fields__hint">Trage câmpul în șablon sau apasă pe el ca să-l inserezi unde ai lăsat cursorul.</p>
          <div class="search-input medium rectangular e-permits-workplace__search e-permits-list-search e-permits-list-search--fill${dtplState.fieldQuery ? " has-value" : ""}">
            <span class="icon-search" aria-hidden="true"><svg class="icon" width="20" height="20"><use href="assets/icons/sprite.svg#icon-search"></use></svg></span>
            <input class="input" type="search" placeholder="Caută un câmp" aria-label="Caută un câmp" autocomplete="off" value="${escapeHtml(dtplState.fieldQuery)}" data-dtpl-field-search>
            ${renderSearchActions()}
          </div>
          <div class="e-permits-dtpl-fields__groups" data-dtpl-fields>${renderDtplFields()}</div>
        </aside>
        <div class="e-permits-dtpl__editor">
          <div class="e-permits-dtpl__editor-bar">
            <div class="segmented-control" role="radiogroup" aria-label="Mod de editare">
              ${[["visual", "Vizual"], ["html", "HTML"]].map(([v, l]) => `<button class="segment-item${dtplState.mode === v ? " is-selected" : ""}" type="button" role="radio" aria-checked="${dtplState.mode === v}" data-dtpl-mode="${v}">${l}</button>`).join("")}
            </div>
            <div class="e-permits-pay__tools">
              <button class="btn btn-neutral btn-sm" type="button" data-dtpl-bg><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-image"></use></svg><span>Fundal pagină</span></button>
              <button class="btn btn-neutral btn-sm" type="button" data-dtpl-xml><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-page-upload"></use></svg><span>Import din XML</span></button>
            </div>
          </div>
          ${dtplState.mode === "visual" ? `
            <div class="e-permits-ntpl-editor__toolbar e-permits-dtpl__toolbar" role="toolbar" aria-label="Formatare">
              <div class="e-permits-dtpl__block-select">${renderFoSelectControl({ id: "dtpl-block", attrs: 'data-dtpl-block aria-label="Stil paragraf"', optionsHtml: DTPL_BLOCKS.map(([v, l]) => `<option value="${v}">${l}</option>`).join("") })}</div>
              <span class="e-permits-ntpl-editor__sep" aria-hidden="true"></span>
              ${DTPL_TOOLBAR.map((item) => item === "|" ? '<span class="e-permits-ntpl-editor__sep" aria-hidden="true"></span>'
                : `<button class="e-permits-ntpl-editor__tool" type="button" data-dtpl-cmd="${item[0]}" aria-label="${escapeHtml(item[2])}" data-tooltip-label="${escapeHtml(item[2])}"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${item[1]}"></use></svg></button>`).join("")}
            </div>` : ""}
          <div class="e-permits-dtpl__status">
            <p class="e-permits-fo-field__hint">${dtplState.mode === "visual" ? "Câmpurile apar ca etichete și nu se pot rupe la editare. Ciclurile ({{#each}}) și marcajele speciale se editează în modul HTML." : "HTML-ul documentului, așa cum se salvează în MDocs."}</p>
            ${unknown.length ? `<span class="e-permits-workplace__tag e-permits-workplace__tag--danger" title="${escapeHtml(unknown.join(", "))}" data-dtpl-unknown>${escapeHtml(plural(unknown.length, "câmp inexistent", "câmpuri inexistente"))}</span>` : `<span class="e-permits-workplace__tag e-permits-workplace__tag--success" data-dtpl-unknown>Toate câmpurile există</span>`}
          </div>
          <div class="e-permits-dtpl__canvas">
            ${dtplState.mode === "visual"
              ? `<div class="e-permits-dtpl__page"${d.background ? ` style="background-image:url('${d.background}')"` : ""}><div class="e-permits-dtpl__surface" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Conținutul documentului" data-dtpl-surface>${dtplMarkTokens(d.html)}</div></div>`
              : `<div class="e-permits-fo-textarea e-permits-ntpl-html e-permits-dtpl__html"><textarea rows="24" aria-label="HTML-ul documentului" spellcheck="false" data-dtpl-html>${escapeHtml(d.html)}</textarea></div>`}
          </div>
        </div>
      </div>`;
  };

  const renderDtplJsonStatus = () => {
    const d = dtplState.draft;
    const { used, unknown } = dtplTokens(d.html);
    const parsed = dtplParseJson(d.testJson);
    const data = parsed.data || {};
    const missing = used.filter((t) => DTPL_FIELD_MAP.has(t) && !(t in data));
    const extra = Object.keys(data).filter((k) => !used.includes(k));
    const bad = Boolean(parsed.error);
    return `
      <div class="e-permits-dtpl__json-bar">
        <div class="e-permits-dtpl__json-state">
          ${bad ? `<span class="message message--inline message--error e-permits-fo-field__error"><svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-error-filled"></use></svg><span>${escapeHtml(parsed.error)}</span></span>`
            : `<p class="e-permits-fo-field__hint">${plural(Object.keys(data).length, "câmp", "câmpuri")} cu valoare de test.</p>`}
        </div>
        <div class="e-permits-dtpl__json-tools">
          <button class="btn btn-neutral btn-sm" type="button" data-dtpl-json-fill${bad ? ' aria-disabled="true" data-tooltip-reason="Corectează întâi JSON-ul."' : ""}>Completează cu exemple</button>
          <button class="btn btn-neutral btn-sm" type="button" data-dtpl-json-format${bad ? ' aria-disabled="true" data-tooltip-reason="Corectează întâi JSON-ul."' : ""}>Formatează</button>
        </div>
      </div>
      ${unknown.length ? renderNotice("error", `<strong>Câmpuri necunoscute:</strong> ${unknown.map((t) => escapeHtml(`{{${t}}}`)).join(", ")} — șablonul le folosește, dar nu există în sursele de date; la emitere rămân goale. Corectează numele în șablon.`) : ""}
      ${!bad && missing.length ? renderInfoNote(`<strong>Fără valoare de test:</strong> ${missing.map((t) => escapeHtml(`{{${t}}}`)).join(", ")} — la previzualizare folosesc exemplul implicit.`) : ""}
      ${!bad && extra.length ? renderInfoNote(`<strong>Chei care nu apar în șablon:</strong> ${extra.map((k) => escapeHtml(k)).join(", ")} — sunt ignorate.`) : ""}`;
  };
  const renderDtplTestView = () => {
    const d = dtplState.draft;
    const bad = Boolean(dtplParseJson(d.testJson).error);
    return `
      <div class="e-permits-dtpl__narrow">
        ${renderInfoNote("Datele de test sunt un obiect <strong>JSON</strong>, ca în MDocs: cheia este numele câmpului din șablon („{{CaseNumber}}” → \"CaseNumber\"), iar obiectele imbricate completează câmpurile cu punct („{{Applicant.Name}}”). Se folosesc doar la Previzualizare; la emitere, câmpurile se completează din dosar.")}
        <div class="e-permits-fo-field e-permits-dtpl__json">
          <label for="dtpl-json">Date de test (JSON)</label>
          <div class="e-permits-fo-textarea e-permits-ntpl-html${bad ? " is-error" : ""}" data-dtpl-json-box><textarea id="dtpl-json" rows="20" spellcheck="false" autocomplete="off" data-dtpl-json>${escapeHtml(d.testJson)}</textarea></div>
          <div data-dtpl-json-status>${renderDtplJsonStatus()}</div>
        </div>
      </div>`;
  };

  const renderDtplPreviewView = () => {
    const d = dtplState.draft;
    return `
      ${dtplParseJson(d.testJson).error ? `<div class="e-permits-dtpl__narrow">${renderNotice("warning", "<strong>JSON-ul cu date de test are erori.</strong> Previzualizarea folosește ultimele date valide — corectează-l în „Date de test”.")}</div>` : ""}
      <div class="e-permits-dtpl__canvas e-permits-dtpl__canvas--preview">
        <div class="e-permits-dtpl__page"${d.background ? ` style="background-image:url('${d.background}')"` : ""}><div class="e-permits-dtpl__surface">${dtplFill(d.html, d.testData)}</div></div>
      </div>
      <p class="e-permits-ntpl-preview__note e-permits-dtpl__preview-note">Câmpurile marcate sunt completate cu datele de test. Documentul final se generează în MDocs, ca PDF.</p>`;
  };

  const renderDtpl = () => {
    const tpl = dtplTpl(), d = dtplState.draft;
    if (!tpl) return;
    const pending = dtplState.dirty || tpl.status === "unpublished" || tpl.status === "draft";
    const view = dtplState.view;
    dtplPanel.innerHTML = `
      <header class="e-permits-dtpl__head">
        <div class="e-permits-dtpl__identity">
          ${renderTag(tpl.version, "neutral")}
          <h2 class="e-permits-dtpl__title" id="dtpl-title" title="${escapeHtml(tpl.name)}">${escapeHtml(tpl.name)}</h2>
          ${renderProfileCopyCode(tpl.code, `Copiază ${tpl.code}`)}
        </div>
        <div class="segmented-control e-permits-dtpl__views" role="tablist" aria-label="Constructor">
          ${[["template", "Șablon"], ["test", "Date de test"], ["preview", "Previzualizare"]].map(([v, l]) => `<button class="segment-item${view === v ? " is-selected" : ""}" type="button" role="tab" aria-selected="${view === v}" data-dtpl-view="${v}">${l}</button>`).join("")}
        </div>
        <div class="e-permits-dtpl__actions">
          ${pending ? (dtplState.dirty ? renderHeaderStatus("Modificări nesalvate") : tpl.status === "draft" ? renderHeaderStatus("Schiță · nepublicat în MDocs", "warning") : renderHeaderStatus("Modificări nepublicate", "warning", 'data-dtpl-pending aria-haspopup="dialog" title="Vezi modificările"')) : ""}
          <button class="btn btn-neutral btn-sm" type="button" data-dtpl-history><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-history"></use></svg><span>Istoric versiuni</span></button>
          ${pending
            ? '<button class="btn btn-primary btn-sm" type="button" data-dtpl-publish>Publică în MDocs</button>'
            : '<button class="btn btn-primary btn-sm" type="button" aria-disabled="true" data-tooltip-reason="Nu există modificări de publicat." data-dtpl-publish>Publică în MDocs</button>'}
          <span class="e-permits-ntpl-sheet__divider" aria-hidden="true"></span>
          <button class="btn btn-strict btn-sm btn-icon-only" type="button" aria-label="Închide constructorul" data-tooltip-label="Închide" data-dtpl-close>
            <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-cross-large"></use></svg>
          </button>
        </div>
      </header>
      ${tpl.mdocsChange ? `
        <div class="message message--subtle banner--warning e-permits-dtpl__banner" role="status">
          <span class="banner__icon"><svg class="icon" width="24" height="24" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-warning-filled"></use></svg></span>
          <div class="banner__content">
            <p class="banner__text"><strong>Modificat în MDocs de altcineva</strong> — ${escapeHtml(formatStamp(tpl.mdocsChange.at))} · ${escapeHtml(tpl.mdocsChange.by)}. Descarcă versiunea din MDocs înainte să publici, ca să nu o suprascrii.</p>
          </div>
          <button class="btn btn-text-primary btn-sm" type="button" data-dtpl-pull><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-download"></use></svg><span>Descarcă din MDocs</span></button>
        </div>` : ""}
      <div class="e-permits-dtpl__body" data-dtpl-body-view="${view}">
        ${view === "template" ? renderDtplTemplateView() : view === "test" ? renderDtplTestView() : renderDtplPreviewView()}
      </div>
      <footer class="e-permits-dtpl__foot">
        <span class="e-permits-rt__summary" data-dtpl-summary>${dtplState.dirty ? "Modificări nesalvate" : `Salvat ${escapeHtml(formatStamp(tpl.editedAt))} · ${escapeHtml(tpl.editedBy || "")}`}</span>
        <div class="modal-buttons">
          <button class="btn btn-neutral btn-rounded" type="button" data-dtpl-cancel>Anulează</button>
          <button class="btn btn-primary btn-rounded" type="button" data-dtpl-save${dtplState.dirty ? "" : ' aria-disabled="true" data-tooltip-reason="Nu există modificări de salvat."'}>Salvează</button>
        </div>
      </footer>`;
    void d;
  };

  const syncDtpl = () => {
    const surface = dtplPanel.querySelector("[data-dtpl-surface]");
    const html = dtplPanel.querySelector("[data-dtpl-html]");
    if (surface) dtplState.draft.html = dtplReadSurface(surface);
    if (html) dtplState.draft.html = html.value;
  };
  const markDtplDirty = () => {
    if (dtplState.dirty) {
      const tag = dtplPanel.querySelector("[data-dtpl-unknown]");
      if (tag) { syncDtpl(); const n = dtplTokens(dtplState.draft.html).unknown.length; tag.className = `e-permits-workplace__tag e-permits-workplace__tag--${n ? "danger" : "success"}`; tag.textContent = n ? plural(n, "câmp inexistent", "câmpuri inexistente") : "Toate câmpurile există"; }
      return;
    }
    syncDtpl();
    dtplState.dirty = true;
    const scroll = dtplPanel.querySelector(".e-permits-dtpl__canvas")?.scrollTop;
    const sel = window.getSelection();
    const range = sel.rangeCount ? sel.getRangeAt(0) : null;
    /* only the header + footer change; the body (and caret) stays */
    const head = document.createElement("div");
    const keepBody = dtplPanel.querySelector(".e-permits-dtpl__body");
    renderDtpl();
    dtplPanel.querySelector(".e-permits-dtpl__body").replaceWith(keepBody);
    if (scroll) keepBody.querySelector(".e-permits-dtpl__canvas").scrollTop = scroll;
    if (range) { sel.removeAllRanges(); sel.addRange(range); }
    void head;
  };

  const openDtpl = (code) => {
    const tpl = dtplFind(code);
    if (!tpl || !dtplSheet) return;
    Object.assign(dtplState, { code, view: "template", mode: "visual", fieldQuery: "", draft: { html: tpl.html || "", testData: { ...(tpl.testData || {}) }, testJson: tpl.testJson || dtplSampleJson(tpl.html, tpl.testData || {}), background: tpl.background || "" }, dirty: false, range: null, ret: document.activeElement });
    renderDtpl();
    dtplSheet.hidden = false;
    document.body.classList.add("is-ntpl-sheet-open");
    requestAnimationFrame(() => dtplPanel.focus());
  };
  const closeDtpl = (force = false) => {
    if (!dtplSheet || dtplSheet.hidden || dtplSheet.classList.contains("is-closing")) return;
    if (!force && dtplState.dirty) { askConfirm({ title: "Închizi fără să salvezi?", text: "Modificările din constructor se pierd.", confirmLabel: "Închide fără salvare", destructive: true }, () => closeDtpl(true)); return; }
    closeFoSelect();
    dtplSheet.classList.add("is-closing");
    window.setTimeout(() => {
      dtplSheet.hidden = true;
      dtplSheet.classList.remove("is-closing");
      document.body.classList.remove("is-ntpl-sheet-open");
      const code = dtplState.code;
      dtplState.code = null; dtplState.dirty = false;
      refreshDtplList();
      (permitsProfilePanel?.querySelector(`[data-dtpl-open="${CSS.escape(code)}"]`) || dtplState.ret)?.focus?.();
    }, 140);
  };
  const saveDtpl = ({ silent = false } = {}) => {
    syncDtpl();
    const tpl = dtplTpl(), service = dtplService();
    Object.assign(tpl, { html: dtplState.draft.html, testData: { ...dtplState.draft.testData }, testJson: dtplState.draft.testJson, background: dtplState.draft.background, status: tpl.status === "draft" ? "draft" : "unpublished", editedAt: localIsoNow(), editedBy: currentUserName() });
    dtplState.dirty = false;
    logServiceEvents(service.code, [{ at: tpl.editedAt, user: tpl.editedBy, type: "Modificare șablon de tipar", status: "Reușit", detail: `${tpl.code} · ciornă` }]);
    renderDtpl();
    if (!silent) showShellToast("Salvat ca ciornă. Documentele emise folosesc versiunea publicată până la „Publică în MDocs”.", "success", "Șablon salvat");
  };
  const publishDtpl = () => {
    const tpl = dtplTpl();
    /* a template created here goes to MDocs for the first time as v1.0.0 */
    const next = tpl.status === "draft" ? "v1.0.0" : dtplBump(tpl.version);
    const run = () => {
      if (dtplState.dirty) saveDtpl({ silent: true });
      const at = localIsoNow(), by = currentUserName();
      Object.assign(tpl, { version: next, status: "published", editedAt: at, editedBy: by, mdocsChange: null });
      tpl.history = [{ version: next, at, by, note: "Publicat în MDocs din constructor." }, ...(tpl.history || [])];
      logServiceEvents(dtplService().code, [{ at, user: by, type: "Publicare șablon în MDocs", status: "Reușit", detail: `${tpl.code} ${next}` }]);
      renderDtpl();
      showShellToast(`Versiunea ${next} este în MDocs. Documentele emise de acum o folosesc.`, "success", "Șablon publicat");
    };
    if (tpl.mdocsChange) { askConfirm({ title: "Suprascrii versiunea din MDocs?", text: `Șablonul a fost modificat în MDocs de ${tpl.mdocsChange.by}. Dacă publici acum, modificările lor se pierd. Recomandat: „Descarcă din MDocs” mai întâi.`, confirmLabel: "Publică oricum", destructive: true }, run); return; }
    askConfirm({ title: `Publici ${next} în MDocs?`, text: "Documentele emise de acum folosesc noua versiune. Cele deja emise rămân neschimbate.", confirmLabel: "Publică în MDocs" }, run);
  };
  const pullDtpl = () => {
    const tpl = dtplTpl();
    askConfirm({ title: "Descarci versiunea din MDocs?", text: dtplState.dirty ? "Înlocuiește conținutul din constructor, inclusiv modificările nesalvate." : "Înlocuiește conținutul din constructor cu cel din MDocs.", confirmLabel: "Descarcă", destructive: dtplState.dirty }, () => {
      const at = localIsoNow();
      tpl.html = `${tpl.html.replace(/<p>Valabil până la \{\{ValidUntil\}\}\.<\/p>/, "<p>Valabil până la {{ValidUntil}}, cu drept de prelungire.</p>")}`;
      Object.assign(tpl, { mdocsChange: null, editedAt: at, editedBy: tpl.mdocsChange?.by || "MDocs" });
      dtplState.draft.html = tpl.html;
      dtplState.dirty = false;
      renderDtpl();
      showShellToast("Constructorul are acum versiunea din MDocs.", "success", "Descărcat din MDocs");
    });
  };
  const openDtplHistory = () => {
    const tpl = dtplTpl(), modal = document.querySelector("#dtpl-history-modal");
    if (!modal) return;
    modal.querySelector("[data-dtpl-history-subtitle]").textContent = `${tpl.name} · ${tpl.code}`;
    modal.querySelector("[data-dtpl-history-body]").innerHTML = renderEventTimeline("Versiuni publicate în MDocs", (tpl.history || []).map((h, i) => ({ at: h.at, user: h.by, type: i === 0 ? `${h.version} · curentă` : h.version, status: "Reușit", detail: h.note })), { meta: "Cea mai recentă primele" });
    window.__modal?.open?.("#dtpl-history-modal");
  };

  /* the template's own pending changes: what the service log recorded about it since the
     last MDocs version; a template saved without a log line still lists its content */
  const openDtplPendingChanges = () => {
    const tpl = dtplTpl(), service = dtplService();
    if (!tpl) return;
    const since = tpl.history?.[0]?.at || "";
    const logged = (service?.geap.events || []).filter((e) => e.at > since && /șablon|tipar/i.test(e.type || "") && [tpl.code, tpl.name].some((key) => String(e.detail || "").includes(key)))
      .map((e) => ({ area: e.type, detail: e.detail || "", at: e.at, user: e.user || "", status: /^(Creare|Atașare|Import|Adăugare)/.test(e.type) ? "Adăugat" : /^(Ștergere|Detașare|Eliminare)/.test(e.type) ? "Eliminat" : "Modificat" }));
    const changes = logged.length ? logged : [{ area: "Conținutul șablonului", detail: `Salvat peste ${tpl.version}`, at: tpl.editedAt, user: tpl.editedBy || "", status: "Modificat" }];
    openPendingChanges({ subject: `${tpl.name} · față de ${tpl.version}`, changes, publishLabel: "Publică în MDocs", onPublish: publishDtpl });
  };

  const insertDtplToken = (token) => {
    const surface = dtplPanel.querySelector("[data-dtpl-surface]");
    const html = dtplPanel.querySelector("[data-dtpl-html]");
    if (html) { const a = html.selectionStart ?? html.value.length; html.focus(); html.setRangeText(token, a, html.selectionEnd ?? a, "end"); markDtplDirty(); return; }
    if (!surface) return;
    surface.focus();
    const sel = window.getSelection();
    if (dtplState.range && surface.contains(dtplState.range.startContainer)) { sel.removeAllRanges(); sel.addRange(dtplState.range); }
    const chip = document.createElement("span");
    chip.className = `e-permits-dtpl-token${DTPL_FIELD_MAP.has(token.replace(/[{}]/g, "")) ? "" : " is-unknown"}`;
    chip.contentEditable = "false";
    chip.textContent = token;
    const range = sel.rangeCount ? sel.getRangeAt(0) : null;
    if (range && surface.contains(range.startContainer)) { range.deleteContents(); range.insertNode(chip); range.setStartAfter(chip); range.collapse(true); sel.removeAllRanges(); sel.addRange(range); }
    else surface.append(chip);
    markDtplDirty();
  };

  dtplPanel?.addEventListener("mousedown", (event) => { if (event.target.closest("[data-dtpl-cmd], [data-dtpl-token]")) event.preventDefault(); });
  document.addEventListener("selectionchange", () => {
    const surface = dtplPanel?.querySelector("[data-dtpl-surface]");
    const sel = window.getSelection();
    if (surface && sel.rangeCount && surface.contains(sel.anchorNode)) dtplState.range = sel.getRangeAt(0).cloneRange();
  });
  dtplPanel?.addEventListener("click", (event) => {
    if (!dtplState.code) return;
    if (event.target.closest("[data-dtpl-close], [data-dtpl-cancel]")) { closeDtpl(); return; }
    const view = event.target.closest("[data-dtpl-view]");
    if (view) { syncDtpl(); dtplState.view = view.dataset.dtplView; const dirty = dtplState.dirty; renderDtpl(); dtplState.dirty = dirty; dtplPanel.querySelector(`[data-dtpl-view="${dtplState.view}"]`)?.focus(); return; }
    const mode = event.target.closest("[data-dtpl-mode]");
    if (mode) { syncDtpl(); dtplState.mode = mode.dataset.dtplMode; renderDtpl(); dtplPanel.querySelector(`[data-dtpl-mode="${dtplState.mode}"]`)?.focus(); return; }
    const group = event.target.closest("[data-dtpl-group]");
    if (group) { const g = group.dataset.dtplGroup; if (dtplState.collapsed.has(g)) dtplState.collapsed.delete(g); else dtplState.collapsed.add(g); dtplPanel.querySelector("[data-dtpl-fields]").innerHTML = renderDtplFields(); dtplPanel.querySelector(`[data-dtpl-group="${CSS.escape(g)}"]`)?.focus(); return; }
    const token = event.target.closest("[data-dtpl-token]");
    if (token) { insertDtplToken(token.dataset.dtplToken); return; }
    const cmd = event.target.closest("[data-dtpl-cmd]");
    if (cmd) {
      const surface = dtplPanel.querySelector("[data-dtpl-surface]");
      surface?.focus();
      if (cmd.dataset.dtplCmd === "insertIf") document.execCommand("insertText", false, "{{#if IsSigned}}…{{/if}}");
      else document.execCommand(cmd.dataset.dtplCmd, false, null);
      markDtplDirty();
      return;
    }
    if (event.target.closest("[data-dtpl-bg]")) { dtplSheet.querySelector("[data-dtpl-bg-file]").click(); return; }
    if (event.target.closest("[data-dtpl-xml]")) { dtplSheet.querySelector("[data-dtpl-xml-file]").click(); return; }
    if (event.target.closest("[data-dtpl-history]")) { openDtplHistory(); return; }
    if (event.target.closest("[data-dtpl-pending]")) { openDtplPendingChanges(); return; }
    const jsonTool = event.target.closest("[data-dtpl-json-fill], [data-dtpl-json-format]");
    if (jsonTool) {
      if (jsonTool.getAttribute("aria-disabled") === "true") return;
      const d = dtplState.draft; const parsed = dtplParseJson(d.testJson);
      if (parsed.error) return;
      const raw = jsonTool.matches("[data-dtpl-json-fill]")
        ? { ...Object.fromEntries(dtplTokens(d.html).used.filter((t) => !(t in parsed.data)).map((t) => [t, DTPL_FIELD_MAP.get(t)?.sample ?? ""])), ...parsed.raw }
        : parsed.raw;
      d.testJson = JSON.stringify(raw, null, 2); d.testData = dtplFlatten(raw);
      markDtplDirty(); renderDtpl();
      dtplPanel.querySelector(jsonTool.matches("[data-dtpl-json-fill]") ? "[data-dtpl-json-fill]" : "[data-dtpl-json-format]")?.focus();
      return;
    }
    if (event.target.closest("[data-dtpl-pull]")) { pullDtpl(); return; }
    const publish = event.target.closest("[data-dtpl-publish]");
    if (publish && publish.getAttribute("aria-disabled") !== "true") { publishDtpl(); return; }
    const save = event.target.closest("[data-dtpl-save]");
    if (save && save.getAttribute("aria-disabled") !== "true") saveDtpl();
  });
  dtplPanel?.addEventListener("input", (event) => {
    if (!dtplState.code) return;
    const search = event.target.closest("[data-dtpl-field-search]");
    if (search) { dtplState.fieldQuery = search.value; dtplPanel.querySelector("[data-dtpl-fields]").innerHTML = renderDtplFields(); return; }
    const json = event.target.closest("[data-dtpl-json]");
    if (json) {
      const d = dtplState.draft;
      d.testJson = json.value;
      const parsed = dtplParseJson(d.testJson);
      if (parsed.data) d.testData = parsed.data;
      /* only the status under the editor changes — the caret stays where it is */
      dtplPanel.querySelector("[data-dtpl-json-box]")?.classList.toggle("is-error", Boolean(parsed.error));
      const status = dtplPanel.querySelector("[data-dtpl-json-status]"); if (status) status.innerHTML = renderDtplJsonStatus();
      markDtplDirty();
      return;
    }
    if (event.target.closest("[data-dtpl-surface], [data-dtpl-html]")) markDtplDirty();
  });
  dtplPanel?.addEventListener("change", (event) => {
    const block = event.target.closest("[data-dtpl-block]");
    if (!block) return;
    const surface = dtplPanel.querySelector("[data-dtpl-surface]");
    surface?.focus();
    if (dtplState.range) { const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(dtplState.range); }
    document.execCommand("formatBlock", false, block.value);
    markDtplDirty();
  });
  dtplPanel?.addEventListener("dragstart", (event) => {
    const token = event.target.closest?.("[data-dtpl-token]");
    if (token) { event.dataTransfer.setData("text/plain", token.dataset.dtplToken); event.dataTransfer.effectAllowed = "copy"; }
  });
  dtplPanel?.addEventListener("drop", (event) => { if (event.target.closest?.("[data-dtpl-surface]")) window.setTimeout(() => { markDtplDirty(); }, 0); });
  dtplSheet?.addEventListener("click", (event) => { if (event.target.closest(".e-permits-ntpl-sheet__scrim")) closeDtpl(); });
  dtplSheet?.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || document.querySelector(".modal-overlay.is-active, body > .e-permits-fo-select__list") || event.target.closest?.(".e-permits-fo-select.is-open")) return;
    event.preventDefault();
    closeDtpl();
  });
  dtplSheet?.querySelector("[data-dtpl-xml-file]")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    file.text().then((text) => {
      const body = text.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || text.replace(/<\?xml[^>]*>/, "");
      dtplState.draft.html = body.trim();
      dtplState.dirty = true;
      renderDtpl();
      showShellToast(`„${file.name}” a fost încărcat în constructor. Verifică câmpurile, apoi salvează.`, "success", "Importat din XML");
    });
  });
  dtplSheet?.querySelector("[data-dtpl-bg-file]")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { syncDtpl(); dtplState.draft.background = reader.result; dtplState.dirty = true; renderDtpl(); };
    reader.readAsDataURL(file);
  });

  /* a template's sections — Texte (per language) · Reguli de destinatari · Detalii —
     shared by the passport detail and the global registry drawer */
  const renderTemplateBody = (tpl, view, tabAttr, extraDetails = []) => {
    const source = tpl.source ? systemTemplates().find((item) => item.code === tpl.source) : null;
    const dash = '<span class="e-permits-workplace__dash">—</span>';
    const content = view === "rules"
      ? (tpl.rules || []).length ? `
          <div class="e-permits-stack">
            <div class="e-permits-stack__group">
              <ul class="e-permits-stack__list" role="list">${tpl.rules.map((rule) => renderStackItem({
                plainTitle: rule.recipient,
                title: escapeHtml(rule.recipient),
                meta: (rule.channels || []).map(escapeHtml)
              })).join("")}</ul>
            </div>
          </div>
        ` : renderEmptyState({ title: "Fără reguli de destinatari", text: "Se adaugă la editare (US-184).", icon: "user-account" })
      : view === "details"
        ? renderPassportSection("Detalii", [
          ["Cod", renderTag(tpl.code, "neutral")],
          ["Denumire", escapeHtml(tpl.name)],
          ["Sursa de date", escapeHtml(tpl.dataSource || "—")],
          ["Prioritate", escapeHtml(tpl.priority || "—")],
          ["Descriere", tpl.description ? escapeHtml(tpl.description) : dash],
          ["Stare", renderTag(tpl.active === false ? "Inactiv" : "Activ", tpl.active === false ? "neutral" : "success")],
          ...(tpl.createdAt || tpl.source !== undefined ? [["Creat din", source ? `${escapeHtml(source.name)} ${renderTag(source.code, "neutral")}` : "Creat de la zero"]] : []),
          ...(tpl.createdAt ? [["Creat", `${escapeHtml(formatStamp(tpl.createdAt))}${tpl.createdBy ? ` · ${escapeHtml(tpl.createdBy)}` : ""}`]] : []),
          ...extraDetails
        ])
        : NTPL_LANGS.map(([lang, label]) => {
          const text = tpl.texts?.[lang] || {};
          return renderPassportSection(label, [
            ["Obiect", text.subject ? escapeHtml(text.subject) : dash],
            ["Text", text.body ? escapeHtml(text.body) : dash]
          ]);
        }).join("");

    return `
      <div class="segmented-control e-permits-ntpl__tabs" role="radiogroup" aria-label="Secțiunile șablonului">
        ${[["texts", "Texte"], ["rules", "Reguli de destinatari"], ["details", "Detalii"]].map(([id, label]) => `
          <button class="segment-item${view === id ? " is-selected" : ""}" type="button" role="radio" aria-checked="${view === id ? "true" : "false"}" ${tabAttr}="${id}">${label}</button>
        `).join("")}
      </div>
      <div class="e-permits-ntpl__body">${content}</div>
    `;
  };

  /* detail inside the passport: back to this tab, title + state, then the sections */
  const renderTemplateDetail = (service, tpl) => `
    <section class="e-permits-dosar-profil__section e-permits-ntpl">
      <button class="btn btn-neutral btn-sm e-permits-ntpl__back" type="button" data-ntpl-back>
        <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-arrow-left"></use></svg>
        <span>Șabloane de notificare</span>
      </button>
      <div class="e-permits-dosar-profil__section-heading">
        <h2 class="e-permits-dosar-profil__section-title">${escapeHtml(tpl.name)}${renderTag(tpl.active ? "Activ" : "Inactiv", tpl.active ? "success" : "neutral")}</h2>
        <span class="e-permits-dosar-profil__section-meta">${escapeHtml(tpl.code)}</span>
      </div>
      ${tpl.active ? "" : `
        <div class="message message--subtle banner--info e-permits-ntpl__notice">
          <span class="banner__icon"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-info-filled"></use></svg></span>
          <div class="banner__content"><p class="banner__text">Șablonul este inactiv și nu se trimite. Editarea textelor, a regulilor și activarea se fac conform US-184.</p></div>
        </div>
      `}
      ${renderTemplateBody(tpl, serviceProfileState.templateTab || "texts", "data-ntpl-tab")}
    </section>
  `;

  /* ---- Administrare › Șabloane de notificare — the global (system) templates ----
     Feature 91332 is not detailed yet: a read-only registry in the workplace table
     (as Tarife); a row opens the template in the right drawer. */
  const templateUsage = (code) => (servicesStore?.services || []).filter((service) => (service.geap.notificationTemplates || []).some((tpl) => tpl.source === code));

  const ntplRegistryRow = (tpl) => ({
    id: tpl.code,
    cod: tpl.code,
    sursa: tpl.origin || "Sistem",
    denumire: tpl.name,
    obiect: tpl.object || tpl.dataSource || "—",
    reguli: (tpl.rules || []).length,
    versiune: tpl.version || "—",
    actualizat: tpl.updatedAt || null,
    actualizatDe: tpl.updatedBy || "",
    statut: tpl.active === false ? "Inactiv" : "Activ",
    prioritate: tpl.priority || "Normală"
  });

  const buildNtplDb = () => ({
    kind: "ntpl",
    fieldCount: 7,
    columns: {
      cod: { label: "Cod", width: 236, sticky: true, sortable: true },
      denumire: { label: "Denumire", width: 300, fill: true, sortable: true },
      obiect: { label: "Obiect", width: 132, sortable: true },
      reguli: { label: "Reguli", width: 88, sortable: true },
      versiune: { label: "Versiune", width: 96, sortable: true },
      actualizat: { label: "Actualizat", width: 180, sortable: true },
      statut: { label: "Stare", width: 96, sortable: true }
    },
    views: {
      ntpl: {
        title: "Șabloane de notificare",
        selectable: false,
        columns: ["cod", "denumire", "obiect", "reguli", "versiune", "actualizat", "statut"],
        tabs: [
          { id: "all", label: "Toate", filter: "all" },
          { id: "active", label: "Active", filter: "svc:Activ" }
        ]
      }
    },
    runtimeRows: globalTemplates().map(ntplRegistryRow)
  });

  /* =====================================================================
     CLASIFICATOARE — Back Office module (Features 91423 / 91424, Concept v0.2)
     A classifier is a governed reference list consumed by forms, registers,
     reports and process logic. Two lifecycles, never mixed:
       classifier  draft → published → archived (republish), draft-over-published
                   keeps a snapshot that "Renunță la ciornă" restores (core/classifiers.js)
       value       active / inactive only — never deleted, stays resolvable
     Rights (core/permissions.js): central admin everything; local admin only the
     authority's specific classifiers flagged localAdminManageable; archived = read-only.
     Open divergences DIV-C1…C8 are documented in components.md, not hidden here.
     ===================================================================== */
  const clasCore = window.GEAP?.classifiers;
  const clasPerm = window.GEAP?.permissions;
  let classifiersStore = null; /* { list, fieldTypes } */
  const CLAS_FAMILY = { national: "Național", "internațional": "Internațional", interoperabilitate: "Interoperabilitate", intern: "Intern GEAP 2.0" };
  const CLAS_SCOPE = { system: ["Sistem", "neutral"], global: ["Global", "brand"], authority: ["Autoritate", "info"], service: ["Serviciu", "neutral"] };
  const CLAS_SOURCE = { intern: "Intern", mconnect: "MConnect", api: "API" };
  const CLAS_STATUS = { draft: ["Ciornă", "warning"], published: ["Publicat", "success"], archived: ["Arhivat", "neutral"] };
  const CLAS_AUTHORITY = { ansp: ["ANSP", "Agenția Națională pentru Sănătate Publică"], anta: ["ANTA", "Agenția Națională Transport Auto"] };
  const CLAS_TABS = [["valori", "Valori"], ["coloane", "Coloane"], ["mapare", "Mapare MConnect"], ["dependente", "Hartă dependențe"], ["jurnal", "Jurnal de evenimente"], ["setari", "Setări"]];
  const clasState = { id: null, tabKey: "valori", query: "", activity: "all", draft: null, selected: new Set() };

  const clasList = () => classifiersStore?.list || [];
  const getClassifier = (id) => clasList().find((c) => c.id === id) || null;
  const replaceClassifier = (next) => { classifiersStore.list = clasList().map((c) => (c.id === next.id ? next : c)); return next; };
  const clasRole = () => {
    const a = getRoleAssignments().find((x) => x.id === activeAssignmentId);
    if (a?.menuProfile === "central-admin") return { id: "adm-c", authority: null };
    if (a?.menuProfile === "local-admin") return { id: "adm-l", authority: a.authority || "ansp" };
    return { id: "viewer", authority: null };
  };
  /* Local Admin sees its authority's specific classifiers only (DIV-C6 as implemented) */
  const clasVisible = (c) => { const r = clasRole(); return r.id === "adm-c" || (c.categorie === "specific" && c.autoritate === r.authority); };
  const clasCanEdit = (c) => {
    const r = clasRole();
    if (r.id === "viewer") return false;
    if (r.id === "adm-l" && (c.categorie !== "specific" || c.autoritate !== r.authority)) return false;
    return clasPerm.canEditClassifier(c, r.id === "adm-c" ? "adm-c" : "adm-l");
  };
  const clasCanEditStructure = (c) => c.status !== "archived" && clasPerm.canEditStructure(clasRole().id === "adm-c" ? "adm-c" : "adm-l");
  const clasReadOnlyReason = (c) => {
    if (c.status === "archived") return "Clasificatorul este arhivat și nu se mai modifică. Republică-l ca să-l poți edita.";
    if (clasRole().id === "adm-l" && !c.localAdminManageable) return "Administratorul central gestionează acest clasificator, pentru că alimentează procese, termene sau validări.";
    return "";
  };
  const clasScope = (c) => clasCore.scopeOf(c);
  const clasAuthorityLabel = (c) => (c.autoritate ? (CLAS_AUTHORITY[c.autoritate]?.[0] || c.autoritate.toUpperCase()) : "Toate");
  const clasNumber = (n) => Number(n || 0).toLocaleString("ro-MD");
  const clasToday = () => localIsoNow().slice(0, 10);
  const clasLog = (c, type, detail, status = "Reușit") => {
    c.jurnal = [{ at: localIsoNow(), user: currentUserName(), type, status, detail }, ...(c.jurnal || [])];
    c.editatLa = clasToday();
    c.editatDe = currentUserName();
  };
  /* every edit of a published classifier goes through a draft first */
  const clasEdit = (c, mutate, journal) => {
    let next = clasCore.beginDraft(c);
    if (next === c) next = JSON.parse(JSON.stringify(c));
    const opened = c.status === "published";
    mutate(next);
    if (opened) clasLog(next, "Ciornă deschisă", `Peste versiunea publicată v${c.versiune}; consumatorii văd încă v${c.versiune}.`);
    if (journal) clasLog(next, journal[0], journal[1]);
    return replaceClassifier(next);
  };

  /* seed: journal and flags the JSON does not carry */
  const seedClassifiers = (list) => list.map((c) => {
    const x = { ...c, everPublished: c.status !== "draft", publishedSnapshot: c.publishedSnapshot || null };
    if (!x.jurnal || !x.jurnal.length) {
      const j = [{ at: `${c.editatLa}T10:00:00`, user: c.editatDe || "Sistem", type: c.status === "published" ? `Publicat v${c.versiune}` : "Actualizat", status: "Reușit", detail: c.sursa === "mconnect" ? `${clasNumber(c.nrValori)} valori sincronizate din MConnect.` : `${clasNumber(c.nrValori)} valori.` }];
      if (c.sursa === "mconnect") j.push({ at: "2026-06-01T08:00:00", user: "Sistem (MConnect)", type: "Sincronizare", status: "Reușit", detail: "Fără valori noi; 0 dezactivate." });
      j.push({ at: "2024-07-18T09:00:00", user: "Vasile Schidu", type: "Creat", status: "Reușit", detail: c.copiatDinId ? `Creat din „${list.find((y) => y.id === c.copiatDinId)?.denumire || c.copiatDinId}”.` : "Clasificator creat." });
      x.jurnal = j;
    }
    return x;
  });

  /* ---- registry ---- */
  const clasRow = (c) => {
    const usage = clasCore.usageOf(c);
    return {
      id: c.id,
      denumire: c.denumire,
      descriere: c.descriere,
      domeniu: CLAS_SCOPE[clasScope(c)][0],
      familie: CLAS_FAMILY[c.familie] || c.familie,
      sursa: CLAS_SOURCE[c.sursa] || c.sursa,
      autoritate: clasAuthorityLabel(c),
      utilizare: usage.unused ? "Neutilizat" : "Utilizat",
      utilizat: usage,
      valori: c.nrValori || (c.valori || []).length,
      versiune: c.versiune,
      actualizat: c.editatLa ? `${c.editatLa}T12:00:00` : null,
      actualizatDe: c.editatDe || "",
      statut: CLAS_STATUS[c.status][0]
    };
  };

  const buildClassifiersDb = () => ({
    kind: "classifiers",
    fieldCount: 9,
    columns: {
      denumire: { label: "Denumire", width: 340, fill: true, sticky: true, sortable: true },
      domeniu: { label: "Domeniu", width: 120, sortable: true },
      familie: { label: "Familie", width: 150, sortable: true },
      sursa: { label: "Sursă", width: 110, sortable: true },
      utilizat: { label: "Utilizat de", width: 140 },
      valori: { label: "Valori", width: 96, sortable: true },
      versiune: { label: "Versiune", width: 96, sortable: true },
      actualizat: { label: "Modificat", width: 180, sortable: true },
      statut: { label: "Statut", width: 108, sortable: true }
    },
    views: {
      classifiers: {
        title: "Clasificatoare",
        selectable: false,
        columns: ["denumire", "domeniu", "familie", "sursa", "utilizat", "valori", "versiune", "actualizat", "statut"],
        tabs: [
          { id: "all", label: "Toate", filter: "all" },
          { id: "published", label: "Publicate", filter: "svc:Publicat" },
          { id: "draft", label: "Ciorne", filter: "svc:Ciornă" },
          { id: "archived", label: "Arhivate", filter: "svc:Arhivat" }
        ],
        emptyMessage: "Nu există clasificatoare pentru filtrul curent."
      }
    },
    runtimeRows: clasList().filter(clasVisible).map(clasRow)
  });

  const renderClassifierCell = (row, key) => {
    switch (key) {
      /* name over its description, as the registries' two-line ID cell */
      case "denumire": return `
        <div class="e-permits-workplace__case-cell e-permits-clas-cell">
          <span class="e-permits-passport__name e-permits-clas-grid__text" data-cell-tooltip="${escapeHtml(row.denumire)}">${escapeHtml(row.denumire)}</span>
          ${row.descriere ? `<span class="e-permits-clas-grid__text e-permits-clas-cell__desc" data-cell-tooltip="${escapeHtml(row.descriere)}">${escapeHtml(row.descriere)}</span>` : ""}
        </div>`;
      case "domeniu": { const scope = Object.values(CLAS_SCOPE).find(([l]) => l === row.domeniu); return renderTag(row.domeniu, scope?.[1] || "neutral"); }
      case "utilizat": return row.utilizat.unused ? '<span class="e-permits-workplace__dash">Neutilizat</span>' : `
        <div class="e-permits-workplace__case-cell">
          <span>${plural(row.utilizat.modules, "modul", "module")}</span>
          <span class="e-permits-workplace__source"><span>${plural(row.utilizat.objects, "obiect", "obiecte")}</span></span>
        </div>`;
      case "valori": return escapeHtml(clasNumber(row.valori));
      case "versiune": return `v${escapeHtml(row.versiune)}`;
      case "actualizat": return renderDateTime(row.actualizat, row.actualizatDe);
      case "statut": { const st = Object.values(CLAS_STATUS).find(([l]) => l === row.statut); return renderTag(row.statut, st?.[1] || "neutral"); }
      default: return escapeHtml(String(row[key] ?? "—"));
    }
  };

  function showClassifiersRegistry() {
    if (!classifiersStore) { showRolePlaceholder("Clasificatoare"); return; }
    activeRegistry = "classifiers";
    workplaceDb = buildClassifiersDb();
    workplaceState.rows = workplaceDb.runtimeRows;
    workplaceState.viewKey = "classifiers";
    workplaceState.tabKey = null;
    workplaceState.query = "";
    workplaceState.page = 1;
    workplaceState.pageSize = 16;
    workplaceState.sortKey = null;
    workplaceState.sortDirection = "desc";
    workplaceState.selected.clear();
    hideProfilePanels();
    if (permitsProfilePanel) permitsProfilePanel.hidden = true;
    if (workplacePanel) workplacePanel.hidden = false;
    if (workplaceRefresh) workplaceRefresh.hidden = false;
    renderWorkplace();
  }

  const refreshClassifierViews = () => {
    if (activeRegistry === "classifiers" && workplacePanel && !workplacePanel.hidden) {
      workplaceDb = buildClassifiersDb();
      workplaceState.rows = workplaceDb.runtimeRows;
      renderWorkplace();
    }
    if (clasProfilePanel && !clasProfilePanel.hidden) renderClassifierProfile();
  };

  /* ---- profile ---- */
  const clasProfilePanel = document.querySelector("[data-clas-profile]");
  const clasProfileTitle = document.querySelector("[data-clas-profile-title]");
  const clasProfileSummary = document.querySelector("[data-clas-profile-summary]");
  const clasProfileTabs = document.querySelector("[data-clas-profile-tabs]");
  const clasProfileBody = document.querySelector("[data-clas-profile-panel]");
  const clasProfileBackShell = document.querySelector("[data-clas-profile-back-shell]");

  const clasTabsFor = (c) => CLAS_TABS.filter(([id]) => id !== "mapare" || c.mod === "mconnect" || c.sursa === "api");

  /* lifecycle actions follow core.statusActions; the primary one (Publică / Republică)
     is blue, Șterge ciorna is destructive, the rest neutral */
  const renderClassifierHeader = (c) => {
    const editable = clasCanEdit(c) || (c.status === "archived" && clasRole().id !== "viewer" && (clasRole().id === "adm-c" || c.localAdminManageable));
    const actions = editable ? clasCore.statusActions(c).map((a) => {
      if (a.action === "renuntaClas") {
        const meta = clasCore.discardMeta(c);
        return `<button class="btn ${meta.destructive ? "btn-outline-destructive" : "btn-neutral"} btn-sm" type="button" data-clas-action="${meta.destructive ? "stergeCiorna" : "renuntaClas"}">${escapeHtml(meta.label)}</button>`;
      }
      const primary = a.action === "publicaClas" || a.action === "republicaClas";
      return `<button class="btn ${primary ? "btn-primary" : "btn-neutral"} btn-sm" type="button" data-clas-action="${a.action}">${escapeHtml(a.label)}</button>`;
    }).reverse().join("") : "";
    const sync = c.sursa !== "intern" && clasCanEdit(c) ? `<button class="btn btn-secondary btn-sm" type="button" data-clas-sync><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-rotate-arrow"></use></svg><span>Sincronizează</span></button>` : "";
    const caption = c.status === "published" ? `Publicat v${c.versiune} · ${formatLongDate(c.editatLa)} · ${c.editatDe}`
      : c.status === "draft" ? (c.publishedSnapshot ? `Ciornă peste v${c.publishedSnapshot.versiune} · modificat ${formatLongDate(c.editatLa)}` : `Ciornă nepublicată · ${formatLongDate(c.editatLa)}`)
      : `Arhivat · ${formatLongDate(c.editatLa)} · ${c.editatDe}`;
    clasProfileTitle.innerHTML = renderPageHeaderTop({
      crumbs: [{ label: "Clasificatoare", attr: "data-clas-crumb-back" }, { label: c.denumire }],
      title: c.denumire,
      actions: `${sync}${actions}`,
      caption
    });
    const scope = CLAS_SCOPE[clasScope(c)];
    clasProfileSummary.innerHTML = renderPageHeaderMeta([
      ["Domeniu", renderTag(scope[0], scope[1])],
      ["Familie", escapeHtml(CLAS_FAMILY[c.familie] || c.familie)],
      ["Sursă", c.endpoint ? `${escapeHtml(CLAS_SOURCE[c.sursa] || c.sursa)} · <a class="link link-primary link-sm" href="${escapeHtml(c.endpoint)}" target="_blank" rel="noopener">Deschide sursa ↗</a>` : escapeHtml(CLAS_SOURCE[c.sursa] || c.sursa)],
      ["Versiune", `v${escapeHtml(c.versiune)}`],
      ["Statut", renderTag(CLAS_STATUS[c.status][0], CLAS_STATUS[c.status][1])],
      ["Autoritate", escapeHtml(c.autoritate ? CLAS_AUTHORITY[c.autoritate]?.[1] || c.autoritate : "Toate autoritățile")]
    ]);
    watchPageHeaderMeta(clasProfileSummary);
    const counts = { valori: c.nrValori || (c.valori || []).length, coloane: (c.campuriExtra || []).length || null, dependente: (c.consumatori || []).length || null, jurnal: (c.jurnal || []).length };
    clasProfileTabs.innerHTML = clasTabsFor(c).map(([id, label]) => {
      const active = id === clasState.tabKey;
      return `<button class="tab-button${active ? " active" : ""}" id="clas-tab-${id}" type="button" role="tab" aria-selected="${active}" tabindex="${active ? "0" : "-1"}" data-clas-profile-tab="${id}"><span>${label}</span>${counts[id] ? renderPageHeaderTabCount(counts[id] > 999 ? clasNumber(counts[id]) : counts[id]) : ""}</button>`;
    }).join("");
  };

  /* "cannot be edited here" notice: amber banner with a lock, so read-only reads as a
     restriction, not as information (archived, local admin without the right, values
     from MConnect/API, structure reserved to the central admin) */
  const clasLockNotice = (html) => renderNotice("warning", html, { icon: "lock" });

  /* state notices: read-only, draft over published, never published */
  const renderClassifierNotice = (c) => {
    const ro = clasReadOnlyReason(c);
    if (ro) return clasLockNotice(`<strong>Doar consultare.</strong> ${escapeHtml(ro)}`);
    if (c.status === "draft" && c.publishedSnapshot) {
      const ch = clasCore.draftChanges(c);
      const parts = [ch.added && plural(ch.added, "valoare nouă", "valori noi"), ch.changed && plural(ch.changed, "modificată", "modificate"), ch.deactivated && plural(ch.deactivated, "dezactivată", "dezactivate"), ch.structure && "structură modificată"].filter(Boolean);
      return `<div class="message message--subtle banner--warning e-permits-clas-banner"><span class="banner__icon"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-warning-filled"></use></svg></span><div class="banner__content"><p class="banner__text"><strong>Ciornă nepublicată.</strong> Consumatorii văd încă v${escapeHtml(c.publishedSnapshot.versiune)}${parts.length ? ` · ${parts.join(", ")}` : ""}.</p></div></div>`;
    }
    if (c.status === "draft") return renderInfoNote("Ciornă — clasificatorul nu este disponibil consumatorilor până la prima publicare.");
    return "";
  };

  const clasSection = (title, meta, body, actionHtml = "") => `
    <section class="e-permits-dosar-profil__section">
      <div class="e-permits-dosar-profil__section-heading">
        <h2 class="e-permits-dosar-profil__section-title">${escapeHtml(title)}</h2>
        ${meta || actionHtml ? `<div class="e-permits-passport__heading-tools">${meta ? `<span class="e-permits-dosar-profil__section-meta">${meta}</span>` : ""}${actionHtml}</div>` : ""}
      </div>
      ${body}
    </section>`;

  /* Valori: a full-width, compact table (registry table) to scan and select; a value is
     added or edited in the side drawer (click the row or "Editează"). Row actions sit in
     a sticky column on the right: Editează · Activează/Dezactivează · Șterge (only for
     values never published — published values are deactivated, never deleted). Rows
     changed since the published version are marked Nouă / Modificată. */
  const clasPublishedValues = (c) => (c.publishedSnapshot ? c.publishedSnapshot.valori || [] : c.status === "published" ? c.valori || [] : []);
  const clasValueIsPublished = (c, v) => clasPublishedValues(c).some((p) => p.cod === (v.codAnterior || v.cod));
  const clasValueChange = (c, v) => {
    if (!c.publishedSnapshot) return null;
    const before = c.publishedSnapshot.valori.find((p) => p.cod === (v.codAnterior || v.cod));
    if (!before) return ["Nouă", "brand"];
    const strip = ({ codAnterior, ...rest }) => JSON.stringify(rest);
    return v.codAnterior || strip(before) !== strip(v) ? ["Modificată", "warning"] : null;
  };
  const clasShortDate = (iso) => (iso ? iso.split("-").reverse().join(".") : "");
  const clasGridColumns = (c) => {
    const parent = c.parintId ? getClassifier(c.parintId) : null;
    return [
      { key: "cod", label: "Cod", width: 96 },
      { key: "denRo", label: "Denumire RO", width: 240 },
      { key: "traduceri", label: "Traduceri RU · EN", width: 220 },
      ...(parent ? [{ key: "parinte", label: "Valoare-părinte", width: 150, parent }] : []),
      ...(c.campuriExtra || []).map((f) => ({ key: `x:${f.id}`, label: f.label, width: f.tip === "Boolean" ? 104 : 150, extra: f })),
      { key: "activDeLa", label: "Activ de la", width: 112 },
      { key: "stare", label: "Stare", width: 180 }
    ];
  };
  const clasGridText = (text, muted = false) => (text ? `<span class="e-permits-clas-grid__text${muted ? " e-permits-clas-grid__muted" : ""}" data-cell-tooltip="${escapeHtml(text)}">${escapeHtml(text)}</span>` : '<span class="e-permits-workplace__dash">—</span>');
  const clasGridDisplayCell = (c, v, col) => {
    if (col.key === "cod") return `<span class="e-permits-clas-grid__code">${escapeHtml(v.cod)}</span>`;
    if (col.key === "traduceri") return v.denRu || v.denEn ? `<div class="e-permits-workplace__case-cell">${v.denRu ? clasGridText(`RU · ${v.denRu}`) : ""}${v.denEn ? clasGridText(`EN · ${v.denEn}`, Boolean(v.denRu)) : ""}</div>` : '<span class="e-permits-workplace__dash">—</span>';
    if (col.parent) { const p = v.parinte && col.parent.valori.find((x) => x.cod === v.parinte); return v.parinte ? `<span class="e-permits-clas-grid__text" data-cell-tooltip-always data-cell-tooltip="${escapeHtml(`${v.parinte} — ${p?.denRo || "valoare negăsită"}`)}">${escapeHtml(v.parinte)}${p ? ` <span class="e-permits-clas-grid__muted">${escapeHtml(p.denRo)}</span>` : ""}</span>` : clasGridText(""); }
    if (col.extra) { const x = v.extra?.[col.extra.id]; return x === true ? "Da" : x === false ? "Nu" : clasGridText(x == null ? "" : String(x)); }
    if (col.key === "activDeLa") return v.activDeLa ? escapeHtml(clasShortDate(v.activDeLa)) : clasGridText("");
    if (col.key === "stare") {
      const ch = clasValueChange(c, v);
      return `<span class="e-permits-clas-grid__tags">${renderTag(v.activ ? "Activ" : "Inactiv", v.activ ? "success" : "neutral")}${ch ? renderTag(ch[0], ch[1]) : ""}${v.autoInactivat ? renderTag("Din sincronizare", "neutral") : ""}${v.activ && v.activPanaLa ? `<span class="e-permits-clas-grid__muted">până la ${escapeHtml(clasShortDate(v.activPanaLa))}</span>` : ""}</span>`;
    }
    return clasGridText(v[col.key]);
  };
  const clasIconAction = (icon, label, attrs, reason = "") => `<button class="btn btn-neutral btn-sm btn-icon-only" type="button" aria-label="${escapeHtml(label)}" data-tooltip-label="${escapeHtml(label)}"${reason ? ` aria-disabled="true" data-tooltip-reason="${escapeHtml(reason)}"` : ""} ${attrs}><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${icon}"></use></svg></button>`;

  const renderClassifierValues = (c) => {
    const editable = clasCanEdit(c) && c.sursa === "intern";
    const cols = clasGridColumns(c);
    const q = clasState.query.trim().toLocaleLowerCase("ro");
    const all = c.valori || [];
    const counts = { all: all.length, active: all.filter((v) => v.activ).length, inactive: all.filter((v) => !v.activ).length };
    const rows = all.filter((v) => (clasState.activity === "all" || (clasState.activity === "active" ? v.activ : !v.activ)) && (!q || [v.cod, v.denRo, v.denRu, v.denEn].filter(Boolean).join(" ").toLocaleLowerCase("ro").includes(q)));
    const selected = [...clasState.selected].filter((cod) => all.some((v) => v.cod === cod));
    const toolbar = `
      <div class="e-permits-clas-grid__toolbar">
        <div class="search-input medium rectangular e-permits-workplace__search${String(clasState.query || "").trim() ? " has-value is-ready" : ""}">
          <span class="icon-search" aria-hidden="true"><svg class="icon" width="20" height="20"><use href="assets/icons/sprite.svg#icon-search"></use></svg></span>
          <input class="input" type="search" placeholder="Caută după cod sau denumire" value="${escapeHtml(clasState.query)}" aria-label="Caută valori" data-clas-value-search>
          ${renderSearchActions()}
        </div>
        <div class="e-permits-rt__chips" role="group" aria-label="Filtrează după stare">
          ${[["all", "Toate"], ["active", "Active"], ["inactive", "Inactive"]].map(([k, l]) => `
            <button type="button" class="chip${clasState.activity === k ? " is-selected" : ""}" aria-pressed="${clasState.activity === k}" data-clas-activity="${k}">
              <span class="chip__label">${l}</span>
              <span class="badge badge--lg badge--solid-light" aria-hidden="true">${counts[k]}</span>
            </button>`).join("")}
        </div>
        <div class="e-permits-clas-grid__actions-bar">
          ${editable && selected.length ? `
            <span class="e-permits-clas-grid__selection" aria-live="polite">${plural(selected.length, "valoare selectată", "valori selectate")}</span>
            <button class="btn btn-neutral btn-sm" type="button" data-clas-grid-bulk="on">Activează</button>
            <button class="btn btn-neutral btn-sm" type="button" data-clas-grid-bulk="off">Dezactivează</button>
            <button class="btn btn-text-primary btn-sm" type="button" data-clas-grid-clear>Anulează selecția</button>
          ` : editable ? `
            <button class="btn btn-neutral btn-sm" type="button" data-clas-import><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-upload"></use></svg><span>Importă CSV</span></button>
            <button class="btn btn-primary btn-sm" type="button" data-clas-grid-add><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-large"></use></svg><span>Adaugă valoare</span></button>
          ` : ""}
        </div>
      </div>`;
    const allVisibleSelected = editable && rows.length > 0 && rows.every((v) => clasState.selected.has(v.cod));
    const head = `<tr>
      ${editable ? `<th scope="col" class="e-permits-workplace__select-cell"><label class="checkbox checkbox--medium"><input class="checkbox-input" type="checkbox" aria-label="Selectează toate valorile afișate" data-clas-grid-select-all${allVisibleSelected ? " checked" : ""}><span class="checkbox-custom" aria-hidden="true"></span></label></th>` : ""}
      ${cols.map((col) => `<th scope="col" style="${col.key === "denRo" ? `min-width:${col.width}px;` : setColumnWidth(col, col.width)}"><span class="e-permits-workplace__th-content"><span>${escapeHtml(col.label)}</span></span></th>`).join("")}
      ${editable ? '<th scope="col" class="e-permits-workplace__actions-cell e-permits-clas-grid__actions"><span class="sr-only">Acțiuni</span></th>' : ""}
    </tr>`;
    const row = (v) => `
      <tr data-clas-row="${escapeHtml(v.cod)}" class="${v.activ ? "" : "is-inactive"}${clasState.selected.has(v.cod) ? " is-selected" : ""}"${editable ? ` tabindex="0" aria-label="Editează ${escapeHtml(v.cod)} — ${escapeHtml(v.denRo)}"` : ""}>
        ${editable ? `<td class="e-permits-workplace__select-cell"><label class="checkbox checkbox--medium"><input class="checkbox-input" type="checkbox" aria-label="Selectează ${escapeHtml(v.cod)}" value="${escapeHtml(v.cod)}" data-clas-grid-select${clasState.selected.has(v.cod) ? " checked" : ""}><span class="checkbox-custom" aria-hidden="true"></span></label></td>` : ""}
        ${cols.map((col) => `<td>${clasGridDisplayCell(c, v, col)}</td>`).join("")}
        ${editable ? `<td class="e-permits-workplace__actions-cell e-permits-clas-grid__actions">
          <span class="e-permits-workplace__row-actions">
            ${clasIconAction("edit", "Editează", `data-clas-grid-edit="${escapeHtml(v.cod)}"`)}
            ${v.activ ? clasIconAction("pause", "Dezactivează", `data-clas-grid-toggle="${escapeHtml(v.cod)}"`) : clasIconAction("checkmark-large", "Activează", `data-clas-grid-toggle="${escapeHtml(v.cod)}"`)}
            ${clasIconAction("delete", "Șterge", `data-clas-grid-delete="${escapeHtml(v.cod)}"`, clasValueIsPublished(c, v) ? "Valoarea a fost publicată: nu se șterge, se dezactivează." : "")}
          </span>
        </td>` : ""}
      </tr>`;
    const colSpan = cols.length + (editable ? 2 : 0);
    const body = rows.length ? rows.map(row).join("") : `<tr class="e-permits-clas-grid__empty-row"><td colspan="${colSpan}">${q || clasState.activity !== "all"
      ? renderNoResults("Nicio valoare nu corespunde căutării", { bare: true })
      : renderEmptyState({ title: "Clasificatorul nu are încă valori", text: editable ? "Adaugă prima valoare sau importă-le dintr-un fișier CSV." : "Valorile apar aici după ce sunt adăugate.", icon: "list-bullets", bare: true, actionHtml: editable ? '<button class="btn btn-secondary btn-sm" type="button" data-clas-grid-add><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-large"></use></svg><span>Adaugă prima valoare</span></button>' : "" })}</td></tr>`;
    const sample = (c.nrValori || 0) > all.length;
    const note = clasReadOnlyReason(c) ? "" : c.sursa === "mconnect" ? clasLockNotice("<strong>Valorile nu se editează manual.</strong> Vin din MConnect și se actualizează prin sincronizare; valorile care lipsesc din răspuns se dezactivează automat.") : c.sursa === "api" ? clasLockNotice("<strong>Valorile nu se editează manual.</strong> Vin din API-ul extern și se actualizează prin sincronizare.") : "";
    return `
      <div class="e-permits-clas-grid">
        ${note ? `<div class="e-permits-clas-grid__notice">${note}</div>` : ""}
        ${toolbar}
        <div class="e-permits-workplace__table-wrap e-permits-clas-grid__wrap">
          <table class="e-permits-workplace__table e-permits-clas-grid__table${editable ? " is-editable" : ""}" style="width:${cols.reduce((sum, col) => sum + col.width, editable ? 43 + 136 : 0)}px">
            <thead>${head}</thead>
            <tbody>${body}</tbody>
          </table>
        </div>
        <p class="e-permits-clas-grid__footer">
          <span>${sample ? `Afișate ${clasNumber(all.length)} din ${clasNumber(c.nrValori)} (eșantion)` : `Afișate ${rows.length} din ${plural(all.length, "valoare", "valori")}`}</span>
        </p>
      </div>`;
  };

  const flashClasRow = (cod) => {
    const tr = clasProfileBody.querySelector(`tr[data-clas-row="${CSS.escape(cod)}"]`);
    if (!tr) return;
    tr.classList.add("is-flash");
    window.setTimeout(() => tr.classList.remove("is-flash"), 1600);
  };
  const clasDraftOpenedToast = (before) => {
    if (before.status === "published") showShellToast(`S-a deschis o ciornă peste v${before.versiune}. Consumatorii o văd după „Publică”.`, "info", "Ciornă deschisă");
  };

  /* validate + save one value (drawer). Returns false when it must stay open: field
     errors, or a rename that children use (asks first, then calls done). */
  const saveClasValue = (e, done) => {
    const c = getClassifier(clasState.id), v = e.values;
    v.cod = String(v.cod || "").trim();
    v.denRo = String(v.denRo || "").trim();
    e.errors = clasCore.validateValueRow(e.key || "__new__", v, c.valori);
    if (e.errors.cod === "ID obligatoriu") e.errors.cod = "Completează codul.";
    if (e.errors.cod === "ID deja existent") e.errors.cod = "Codul există deja în acest clasificator.";
    if (e.errors.denRo) e.errors.denRo = "Completează denumirea în română.";
    if (e.errors.activDeLa) e.errors.activDeLa = "Alege data de la care valoarea este activă.";
    const limit = Number(c.limitaDenumiri || classifiersStore.fieldTypes.defaults.limitaDenumiri);
    ["denRo", "denRu", "denEn"].forEach((k) => { if ((v[k] || "").length > limit) e.errors[k] = `Denumirea are peste ${limit} de caractere.`; });
    if ((c.idFormat || "INT") === "INT" && !e.key && v.cod && !/^\d+$/.test(v.cod)) e.errors.cod = "Formatul ID este INT: folosește doar cifre.";
    if (v.activPanaLa && v.activDeLa && v.activPanaLa < v.activDeLa) e.errors.activPanaLa = "Data de sfârșit este înaintea datei de început.";
    if (Object.keys(e.errors).length) return false;
    const clean = { ...v, denRu: v.denRu || null, denEn: v.denEn || null, activPanaLa: v.activPanaLa || null, sursa: v.sursa || "manual" };
    const apply = () => {
      if (!e.key) {
        clasEdit(c, (x) => { x.valori = [clean, ...x.valori]; x.nrValori = (x.nrValori || 0) + 1; }, ["Valoare adăugată", `${clean.cod} — ${clean.denRo}`]);
      } else if (e.key !== clean.cod) {
        /* open the draft first, so the published snapshot keeps the old code */
        if (c.status === "published") { const d = clasCore.beginDraft(c); clasLog(d, "Ciornă deschisă", `Peste versiunea publicată v${c.versiune}; consumatorii văd încă v${c.versiune}.`); replaceClassifier(d); }
        const r = clasCore.renameValueCode(clasList(), c.id, e.key, clean.cod);
        classifiersStore.list = r.classifiers;
        r.affected.forEach((id) => clasLog(getClassifier(id), "Referință actualizată", `Cod-părinte ${e.key} → ${clean.cod} în „${c.denumire}”; trecut în ciornă.`));
        clean.codAnterior = e.original.codAnterior || e.key;
        clasEdit(getClassifier(c.id), (x) => { x.valori = x.valori.map((y) => (y.cod === clean.cod || y.cod === e.key ? clean : y)); }, ["Cod redenumit", `${e.key} → ${clean.cod}${r.affected.length ? `; actualizat în ${plural(r.affected.length, "clasificator-copil", "clasificatoare-copil")}` : ""}.`]);
      } else {
        clasEdit(c, (x) => { x.valori = x.valori.map((y) => (y.cod === e.key ? clean : y)); }, ["Valoare modificată", `${clean.cod} — ${clean.denRo}`]);
      }
      clasDraftOpenedToast(c);
      done(clean.cod);
    };
    const children = e.key && e.key !== clean.cod ? clasCore.childrenOf(clasList(), c.id).filter((ch) => (ch.valori || []).some((x) => x.parinte === e.key)) : [];
    if (children.length) {
      const refs = children.reduce((n, ch) => n + ch.valori.filter((x) => x.parinte === e.key).length, 0);
      askConfirm({ title: `Redenumești codul ${e.key} în ${clean.cod}?`, text: `Codul este folosit de ${plural(refs, "valoare", "valori")} în ${children.map((ch) => `„${ch.denumire}”`).join(", ")}. Referințele se actualizează automat, iar acele clasificatoare trec în ciornă.`, confirmLabel: "Redenumește" }, apply);
      return true;
    }
    apply();
    return true;
  };

  /* activate / deactivate / delete — always confirmed */
  const setClasValuesActive = (codes, active) => {
    const c = getClassifier(clasState.id);
    const targets = c.valori.filter((v) => codes.includes(v.cod) && v.activ !== active);
    if (!targets.length) { showShellToast(`Valorile selectate sunt deja ${active ? "active" : "inactive"}.`, "info", "Nimic de schimbat"); return; }
    const usage = clasCore.usageOf(c);
    const what = targets.length === 1 ? `„${targets[0].cod} — ${targets[0].denRo}”` : plural(targets.length, "valoare", "valori");
    askConfirm({
      title: active ? `Activezi ${targets.length === 1 ? "valoarea" : `${targets.length} valori`}?` : `Dezactivezi ${targets.length === 1 ? "valoarea" : `${targets.length} valori`}?`,
      text: active ? `${what} va putea fi aleasă din nou după publicare.` : `${what} nu va mai putea fi aleasă după publicare, dar rămâne citită corect în înregistrările existente.${usage.unused ? "" : ` Clasificatorul este folosit de ${plural(usage.modules, "modul", "module")}.`}`,
      confirmLabel: active ? "Activează" : "Dezactivează",
      destructive: !active
    }, () => {
      const set = new Set(targets.map((v) => v.cod));
      clasEdit(c, (x) => { x.valori = x.valori.map((v) => (set.has(v.cod) ? { ...v, activ: active, autoInactivat: false, ...(active ? { activPanaLa: null } : {}) } : v)); }, [active ? "Valori activate" : "Valori dezactivate", targets.map((v) => v.cod).join(", ")]);
      clasState.selected.clear();
      refreshClassifierViews();
      targets.forEach((v) => flashClasRow(v.cod));
      clasDraftOpenedToast(c);
    });
  };
  const deleteClasValue = (cod) => {
    const c = getClassifier(clasState.id);
    const v = c.valori.find((x) => x.cod === cod);
    askConfirm({ title: "Ștergi valoarea?", text: `„${v.cod} — ${v.denRo}” nu a fost publicată niciodată, deci nu e folosită nicăieri. Se șterge din ciornă.`, confirmLabel: "Șterge", destructive: true }, () => {
      clasEdit(c, (x) => { x.valori = x.valori.filter((y) => y.cod !== cod); x.nrValori = Math.max(0, (x.nrValori || 1) - 1); }, ["Valoare ștearsă", `${v.cod} — ${v.denRo} (nepublicată)`]);
      clasState.selected.delete(cod);
      refreshClassifierViews();
      showShellToast(`„${v.cod}” a fost ștearsă.`, "info", "Valoare ștearsă");
    });
  };

  const renderClassifierFields = (c) => {
    const structure = clasCanEditStructure(c);
    const fields = clasCore.fieldsOf(c, classifiersStore.fieldTypes);
    const items = fields.map((f) => ({
      title: escapeHtml(f.label),
      badges: [renderTag(f.tip, "neutral"), f.obligatoriu ? renderTag("Obligatoriu", "brand") : "", f.derivat ? renderTag("Din ierarhie", "info") : ""].filter(Boolean),
      meta: [f.cfg ? escapeHtml(f.cfg) : f.implicit ? "Coloană standard — nu se poate elimina" : f.derivat ? "Valoarea-părinte din clasificatorul-părinte" : "Coloană suplimentară", `Cheie: ${escapeHtml(f.id)}`],
      plainTitle: f.label,
      actionsHtml: structure && !f.implicit && !f.derivat ? `<button class="btn btn-neutral btn-sm" type="button" data-clas-field-edit="${escapeHtml(f.id)}">${EDIT_LABEL_HTML}</button><button class="btn btn-text-destructive btn-sm" type="button" data-clas-field-remove="${escapeHtml(f.id)}">Elimină</button>` : ""
    }));
    const lock = !structure && !clasReadOnlyReason(c) ? clasLockNotice("<strong>Structura nu se editează aici.</strong> Doar administratorul central adaugă sau modifică coloane.") : "";
    return `${lock}${renderStackedList("Coloane", [{ label: "Standard", items: items.filter((_, i) => fields[i].implicit) }, { label: "Suplimentare", items: items.filter((_, i) => !fields[i].implicit) }].filter((g) => g.items.length), { meta: `Format ID: ${escapeHtml(c.idFormat || classifiersStore.fieldTypes.defaults.idFormat)} · denumiri max. ${c.limitaDenumiri || classifiersStore.fieldTypes.defaults.limitaDenumiri} caractere` })}
      ${structure ? '<div class="e-permits-clas-add-row"><button class="btn btn-secondary btn-sm" type="button" data-clas-field-add><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-large"></use></svg><span>Adaugă coloană</span></button></div>' : ""}`;
  };

  const renderClassifierMapping = (c) => {
    const last = (c.jurnal || []).find((e) => /Sincronizare/.test(e.type));
    return `${renderPassportBlock("Sursă", [
      ["Mod", escapeHtml(c.mod === "mconnect" ? "Sincronizare MConnect" : "API extern")],
      ["Link la sursă", c.endpoint ? `<span class="e-permits-clas-source-link"><a class="link link-primary link-sm" href="${escapeHtml(c.endpoint)}" target="_blank" rel="noopener">${escapeHtml(c.endpoint)} ↗</a>${clasIconAction("copy", "Copiază linkul", `data-shell-copy-value="${escapeHtml(c.endpoint)}"`)}</span>` : "—"],
      ["Ultima sincronizare", last ? `${escapeHtml(formatStamp(last.at))} · ${escapeHtml(last.user)}` : "—"],
      ["La lipsa unei valori", "Se dezactivează automat (rămâne în înregistrările existente)"]
    ], { actionHtml: clasCanEdit(c) ? '<button class="btn btn-secondary btn-sm" type="button" data-clas-sync>Sincronizează acum</button>' : "" })}
    ${clasSection("Mapare coloane", plural((c.mapare || []).length, "coloană", "coloane"), `
      <div class="e-permits-dosar-profil__table-scroll">
        <table class="e-permits-dosar-profil__table">
          <thead><tr><th scope="col">Coloană GEAP</th><th scope="col">Câmp sursă</th></tr></thead>
          <tbody>${(c.mapare || []).map((m) => { const f = clasCore.fieldsOf(c, classifiersStore.fieldTypes).find((x) => x.id === m.camp); return `<tr><td>${escapeHtml(f?.label || m.camp)} <span class="e-permits-workplace__source">${escapeHtml(m.camp)}</span></td><td>${escapeHtml(m.sursa)}</td></tr>`; }).join("")}</tbody>
        </table>
      </div>`)}`;
  };

  /* Hartă dependențe: who consumes it, the live hierarchy, the dead copy lineage
     (kept apart — DIV-C5), and where it applies */
  const renderClassifierDependencies = (c) => {
    const all = clasList();
    const consumers = (c.consumatori || []).map((m) => ({ title: escapeHtml(m.modul), badges: [renderTag(plural(m.obiecte.length, "obiect", "obiecte"), "neutral")], meta: m.obiecte.map(escapeHtml), plainTitle: m.modul }));
    const node = (x, here = false) => x ? `<button class="e-permits-clas-node${here ? " is-current" : ""}" type="button"${here ? ' aria-current="true"' : ` data-clas-open="${escapeHtml(x.id)}"`}><span class="e-permits-clas-node__name">${escapeHtml(x.denumire)}</span><span class="e-permits-clas-node__meta">${escapeHtml(CLAS_SCOPE[clasScope(x)][0])} · ${escapeHtml(clasNumber(x.nrValori))} valori · ${escapeHtml(CLAS_STATUS[x.status][0])}</span></button>` : "";
    const ancestors = clasCore.ancestorsOf(all, c);
    const children = clasCore.childrenOf(all, c.id);
    const grand = children.flatMap((ch) => clasCore.childrenOf(all, ch.id).map((g) => ({ g, ch })));
    const chain = ancestors.length || children.length ? `
      <div class="e-permits-clas-tree">
        ${ancestors.map((a) => `${node(a)}<span class="e-permits-clas-tree__link" aria-hidden="true">↓ părinte al</span>`).join("")}
        ${node(c, true)}
        ${children.length ? `<span class="e-permits-clas-tree__link" aria-hidden="true">↓ copii</span><div class="e-permits-clas-tree__children">${children.map((ch) => `<div class="e-permits-clas-tree__branch">${node(ch)}${grand.filter((x) => x.ch === ch).map((x) => `<span class="e-permits-clas-tree__link" aria-hidden="true">↓</span>${node(x.g)}`).join("")}</div>`).join("")}</div>` : ""}
      </div>` : renderInfoNote("Nu face parte dintr-o ierarhie: nu are clasificator-părinte și nici copii.");
    const copy = c.copiatDinId ? getClassifier(c.copiatDinId) : null;
    const copies = all.filter((x) => x.copiatDinId === c.id);
    const lineage = copy || copies.length ? `${copy ? `<p class="e-permits-clas-lineage">Creat din ${node(copy)}</p>` : ""}${copies.length ? `<p class="e-permits-clas-lineage">Copii create din acesta: ${copies.map((x) => node(x)).join("")}</p>` : ""}${renderInfoNote("„Creat din” e doar originea: copia nu se sincronizează cu sursa. Ierarhia (clasificator-părinte) este o legătură vie.")}` : "";
    const services = (c.servicii || []);
    const where = c.categorie === "global" ? renderInfoNote("Clasificator global: disponibil tuturor autorităților și serviciilor platformei.") : `
      <div class="e-permits-dosar-profil__table-scroll"><table class="e-permits-dosar-profil__table">
        <thead><tr><th scope="col">Autoritate</th><th scope="col">Serviciu</th></tr></thead>
        <tbody>${services.map((sv, i) => `<tr><td>${i === 0 ? escapeHtml(CLAS_AUTHORITY[c.autoritate]?.[1] || c.autoritate || "—") : ""}</td><td>${escapeHtml(sv)}</td></tr>`).join("")}</tbody>
      </table></div>`;
    return `${consumers.length ? renderStackedList("Consumatori", [{ label: "", items: consumers }], { meta: `${plural(consumers.length, "modul", "module")} · ${plural(clasCore.usageOf(c).objects, "obiect", "obiecte")}` }) : clasSection("Consumatori", "", renderInfoNote("Niciun modul nu folosește încă acest clasificator."))}
      ${clasSection("Ierarhie", "Clasificator-părinte · copii", chain)}
      ${lineage ? clasSection("Creat din", "Origine, fără sincronizare", lineage) : ""}
      ${clasSection("Autorități și servicii", c.categorie === "global" ? "Global" : plural(services.length, "serviciu", "servicii"), where)}`;
  };

  const renderClassifierJournal = (c) => renderEventTimeline("Jurnal de evenimente", (c.jurnal || []).map((e) => ({ at: e.at, user: e.user, type: e.type, status: e.status, detail: e.detail })), { meta: "Cel mai recent primul", empty: "Nu există evenimente." });

  /* Setări: identity, hierarchy, who may edit, value format. Edits go into a local
     draft; the header offers Renunță · Salvează while it differs. */
  const renderClassifierSettings = (c) => {
    const d = clasState.draft;
    const editable = clasCanEdit(c);
    const central = clasRole().id === "adm-c";
    const all = clasList();
    const banned = new Set([c.id, ...clasCore.descendantIds(all, c.id)]);
    const parents = all.filter((x) => !banned.has(x.id) && x.status !== "archived");
    const ro = !editable;
    const field = (id, label, key, { required = false, hint = "", textarea = false } = {}) => `
      <div class="e-permits-fo-field">
        <label for="${id}">${escapeHtml(label)}${required ? requiredMark() : ""}</label>
        ${textarea ? `<div class="e-permits-fo-textarea${d.errors?.[key] ? " is-error" : ""}"><textarea id="${id}" rows="3" data-clas-setting="${key}"${ro ? " readonly" : ""}>${escapeHtml(d[key] || "")}</textarea></div>`
          : `<div class="e-permits-fo-input${ro ? " is-filled is-readonly" : ""}${d.errors?.[key] ? " is-error" : ""}"><input id="${id}" type="text" value="${escapeHtml(d[key] || "")}" data-clas-setting="${key}" autocomplete="off"${ro ? " readonly" : ""}></div>`}
        ${d.errors?.[key] ? `<span class="message message--inline message--error e-permits-fo-field__error"><svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-error-filled"></use></svg><span>${escapeHtml(d.errors[key])}</span></span>` : ""}${hint ? `<p class="e-permits-fo-field__hint"${d.errors?.[key] ? " hidden" : ""}>${hint}</p>` : ""}
      </div>`;
    const select = (id, label, key, options, { hint = "", disabled = false } = {}) => `
      <div class="e-permits-fo-field">
        <label for="${id}">${escapeHtml(label)}</label>
        ${renderFoSelectControl({ id, attrs: `data-clas-setting="${key}"`, disabled: ro || disabled, optionsHtml: options.map(([v, l]) => `<option value="${escapeHtml(v)}"${String(d[key] ?? "") === v ? " selected" : ""}>${escapeHtml(l)}</option>`).join("") })}
        ${hint ? `<p class="e-permits-fo-field__hint">${hint}</p>` : ""}
      </div>`;
    const copy = c.copiatDinId ? getClassifier(c.copiatDinId) : null;
    return `
      ${clasSection("Identificare", "", `<div class="e-permits-ntpl-card e-permits-clas-form">
        ${field("clas-set-name", "Denumire", "denumire", { required: true })}
        ${clasTextarea("clas-set-desc", 'data-clas-setting="descriere"', d.descriere, { label: "Descriere", hint: "Ce conține și cine îl folosește.", placeholder: "Ex. Motivele pentru care o cerere poate fi suspendată.", readonly: ro })}
        <div class="e-permits-clas-form__row">
          ${select("clas-set-family", "Familie", "familie", Object.entries(CLAS_FAMILY), { disabled: !central })}
          <div class="e-permits-fo-field"><label>Categorie</label><div class="e-permits-fo-input is-filled is-readonly"><input type="text" value="${c.categorie === "global" ? "Global — toată platforma" : `Specific — ${escapeHtml(clasAuthorityLabel(c))}`}" readonly tabindex="-1"><svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-lock"></use></svg></div><p class="e-permits-fo-field__hint">Se alege la creare.</p></div>
        </div>
      </div>`)}
      ${clasSection("Ierarhie", "", `<div class="e-permits-ntpl-card e-permits-clas-form">
        ${select("clas-set-parent", "Clasificator-părinte", "parintId", [["", "Fără părinte"], ...parents.map((x) => [x.id, x.denumire])], { disabled: !central || !clasCanEditStructure(c), hint: "Legătură vie: fiecare valoare indică o valoare din clasificatorul-părinte." })}
        <div class="e-permits-fo-field"><label>Creat din</label><div class="e-permits-fo-input is-filled is-readonly"><input type="text" value="${escapeHtml(copy ? copy.denumire : "—")}" readonly tabindex="-1"><svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-lock"></use></svg></div><p class="e-permits-fo-field__hint">Originea copiei — fără sincronizare.</p></div>
      </div>`)}
      ${clasSection("Acces și utilizare", "", `<div class="e-permits-ntpl-card e-permits-clas-form">
        ${renderToggle({ label: "Critic pentru proces", description: "Alimentează procese, termene (SLA) sau validări. Un clasificator critic rămâne la administratorul central.", checked: Boolean(d.criticProces), attrs: 'data-clas-toggle="criticProces"', disabled: !central || ro })}
        ${renderToggle({ label: "Administratorul local poate modifica valorile", description: c.categorie !== "specific" ? "Doar pentru clasificatoarele specifice unei autorități." : d.criticProces ? "Indisponibil: clasificatorul este critic pentru proces." : "Administratorul local al autorității gestionează valorile; structura rămâne la administratorul central.", checked: Boolean(d.localAdminManageable), attrs: 'data-clas-toggle="localAdminManageable"', disabled: !central || ro || c.categorie !== "specific" || Boolean(d.criticProces) })}
      </div>`)}
      ${clasSection("Format valori", "", `<div class="e-permits-ntpl-card e-permits-clas-form">
        <div class="e-permits-fo-field"><label id="clas-set-idf">Format ID</label>
          <div class="segmented-control" role="radiogroup" aria-labelledby="clas-set-idf">${[["INT", "Număr (INT)"], ["UID", "Cod unic (UID)"]].map(([v, l]) => `<button class="segment-item${(d.idFormat || "INT") === v ? " is-selected" : ""}" type="button" role="radio" aria-checked="${(d.idFormat || "INT") === v}" data-clas-idformat="${v}"${!central || !clasCanEditStructure(c) ? " disabled" : ""}>${l}</button>`).join("")}</div>
        </div>
        ${field("clas-set-limit", "Lungime maximă a denumirii", "limitaDenumiri", { hint: "Caractere, pentru RO / RU / EN." })}
      </div>`)}`;
  };

  const clasSettingsDraft = (c) => ({ denumire: c.denumire, descriere: c.descriere || "", familie: c.familie, parintId: c.parintId || "", criticProces: Boolean(c.criticProces), localAdminManageable: Boolean(c.localAdminManageable), idFormat: c.idFormat || classifiersStore.fieldTypes.defaults.idFormat, limitaDenumiri: String(c.limitaDenumiri || classifiersStore.fieldTypes.defaults.limitaDenumiri), errors: {} });
  const clasSettingsDirty = (c) => { const a = clasSettingsDraft(c), b = clasState.draft; return b && ["denumire", "descriere", "familie", "parintId", "criticProces", "localAdminManageable", "idFormat", "limitaDenumiri"].some((k) => String(a[k]) !== String(b[k])); };

  function renderClassifierProfile() {
    const c = getClassifier(clasState.id);
    if (!c || !clasProfilePanel) return;
    if (!clasTabsFor(c).some(([id]) => id === clasState.tabKey)) clasState.tabKey = "valori";
    if (!clasState.draft) clasState.draft = clasSettingsDraft(c);
    renderClassifierHeader(c);
    if (clasState.tabKey === "setari" && clasSettingsDirty(c)) {
      clasProfileTitle.querySelector(".e-permits-page-header__actions")?.insertAdjacentHTML("afterbegin", '<button class="btn btn-neutral btn-sm" type="button" data-clas-settings-discard>Renunță</button><button class="btn btn-primary btn-sm" type="button" data-clas-settings-save>Salvează</button><span class="e-permits-page-header__divider" aria-hidden="true"></span>');
    }
    const views = { valori: renderClassifierValues, coloane: renderClassifierFields, mapare: renderClassifierMapping, dependente: renderClassifierDependencies, jurnal: renderClassifierJournal, setari: renderClassifierSettings };
    const notice = renderClassifierNotice(c);
    /* Valori is a full-width grid, as the registries; the other tabs keep the reading column */
    const wide = clasState.tabKey === "valori";
    clasProfileBody.classList.toggle("is-wide", wide);
    clasProfileBody.innerHTML = wide ? `${notice ? `<div class="e-permits-clas-grid__notice">${notice}</div>` : ""}${views.valori(c)}` : `${notice}${views[clasState.tabKey](c)}`;
  }

  const openClassifierProfile = (id, tab = "valori") => {
    const c = getClassifier(id);
    if (!c || !clasProfilePanel) return;
    Object.assign(clasState, { id, tabKey: tab, query: "", activity: "all", draft: null, selected: new Set() });
    if (workplacePanel) workplacePanel.hidden = true;
    hideProfilePanels();
    if (permitsProfilePanel) permitsProfilePanel.hidden = true;
    clasProfilePanel.hidden = false;
    if (clasProfileBackShell) clasProfileBackShell.hidden = false;
    shell.classList.add("is-clas-profile-open");
    setActiveNav("classifiers");
    renderClassifierProfile();
    writeHash(`#clasificator/${encodeURIComponent(id)}/${clasState.tabKey}`);
    clasProfilePanel.scrollIntoView?.({ block: "start" });
  };

  const hideClassifierProfile = () => {
    if (clasProfilePanel) clasProfilePanel.hidden = true;
    if (clasProfileBackShell) clasProfileBackShell.hidden = true;
    shell.classList.remove("is-clas-profile-open");
  };

  const closeClassifierProfile = () => {
    const c = getClassifier(clasState.id);
    if (c && clasSettingsDirty(c) && !window.confirm("Ai modificări nesalvate în setări. Renunți la ele?")) return;
    hideClassifierProfile();
    clasState.id = null;
    showClassifiersRegistry();
    restorePageHash();
  };

  /* ---- lifecycle ---- */
  const runClassifierAction = (action) => {
    const c = getClassifier(clasState.id);
    if (!c) return;
    const usage = clasCore.usageOf(c);
    const consumersText = usage.unused ? "Niciun modul nu îl folosește." : `Îl folosesc ${plural(usage.modules, "modul", "module")} (${(c.consumatori || []).map((m) => m.modul).join(", ")}).`;
    if (action === "publicaClas") {
      const ch = clasCore.draftChanges(c);
      const next = clasCore.nextVersion(c);
      const what = ch.first ? `Prima publicare, cu ${plural((c.valori || []).filter((v) => v.activ).length, "valoare activă", "valori active")}.` : [ch.added && plural(ch.added, "valoare nouă", "valori noi"), ch.changed && plural(ch.changed, "valoare modificată", "valori modificate"), ch.deactivated && plural(ch.deactivated, "valoare dezactivată", "valori dezactivate"), ch.structure && "structura"].filter(Boolean).join(", ");
      askConfirm({ title: `Publici v${next}?`, text: `${ch.first ? what : what ? `Modificări: ${what}.` : "Fără diferențe față de versiunea publicată."} ${consumersText} Consumatorii văd noua versiune imediat.`, confirmLabel: "Publică" }, () => {
        const pub = clasCore.transition(c, "publicaClas"); clasLog(pub, `Publicat v${pub.versiune}`, ch.first ? "Prima publicare." : what ? `Modificări: ${what}.` : "Fără modificări de valori."); replaceClassifier(pub);
        refreshClassifierViews(); showShellToast(`„${c.denumire}” v${pub.versiune} este publicat.`, "success", "Clasificator publicat");
      });
      return;
    }
    if (action === "arhiveazaClas") {
      askConfirm({ title: "Arhivezi clasificatorul?", text: `Devine doar-citire: nu mai poate fi modificat, importat sau sincronizat. ${consumersText}${c.status === "draft" ? " Ciorna curentă se abandonează; se arhivează versiunea publicată." : ""}`, confirmLabel: "Arhivează", destructive: true }, () => {
        const arch = clasCore.transition(c, "arhiveazaClas"); clasLog(arch, "Arhivat", `v${arch.versiune} arhivată.`); replaceClassifier(arch);
        refreshClassifierViews(); showShellToast(`„${c.denumire}” este arhivat.`, "info", "Clasificator arhivat");
      });
      return;
    }
    if (action === "republicaClas") {
      askConfirm({ title: "Republici clasificatorul?", text: `v${c.versiune} redevine disponibilă consumatorilor și poate fi modificată.`, confirmLabel: "Republică" }, () => {
        const rp = clasCore.transition(c, "republicaClas"); clasLog(rp, `Republicat v${rp.versiune}`, "Scos din arhivă."); replaceClassifier(rp);
        refreshClassifierViews(); showShellToast(`„${c.denumire}” este din nou publicat.`, "success", "Clasificator republicat");
      });
      return;
    }
    if (action === "renuntaClas") {
      askConfirm({ title: "Renunți la ciornă?", text: `Modificările nepublicate se pierd; clasificatorul revine la v${c.publishedSnapshot.versiune} publicată.`, confirmLabel: "Renunță la ciornă", destructive: true }, () => {
        const back = clasCore.transition(c, "renuntaClas"); clasLog(back, "Ciornă abandonată", `Revenit la v${back.versiune}.`); replaceClassifier(back);
        clasState.draft = null; refreshClassifierViews(); showShellToast("Ciorna a fost abandonată.", "info", "Revenit la versiunea publicată");
      });
      return;
    }
    if (action === "stergeCiorna") {
      askConfirm({ title: "Ștergi ciorna?", text: `„${c.denumire}” nu a fost publicat niciodată: se șterge definitiv, cu toate valorile.`, confirmLabel: "Șterge ciorna", destructive: true }, () => {
        classifiersStore.list = clasList().filter((x) => x.id !== c.id);
        hideClassifierProfile(); clasState.id = null; showClassifiersRegistry(); restorePageHash();
        showShellToast(`„${c.denumire}” a fost șters.`, "info", "Ciornă ștearsă");
      });
    }
  };

  /* ---- drawer: value editor + create wizard ---- */
  const clasDrawer = document.querySelector("[data-clas-drawer]");
  const clasDrawerBody = clasDrawer?.querySelector("[data-clas-drawer-body]");
  let clasDrawerState = null; /* { mode: "value"|"create", ... } */
  let clasDrawerReturn = null;
  const clasFieldError = (errors, key) => errors?.[key] ? `<span class="message message--inline message--error e-permits-fo-field__error"><svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-error-filled"></use></svg><span>${escapeHtml(errors[key])}</span></span>` : "";
  /* text area — Figma Components text-area 14701:8123, same anatomy as the publish comment:
     placeholder, max length, helper text with a live "n/max" counter on the right */
  const CLAS_DESC_MAX = 300;
  const clasTextarea = (id, attrs, value, { label, hint = "", placeholder = "", max = CLAS_DESC_MAX, readonly = false, error = "" } = {}) => `
    <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
      <label for="${id}">${escapeHtml(label)}</label>
      <div class="e-permits-fo-textarea${error ? " is-error" : ""}"><textarea id="${id}" rows="3" maxlength="${max}" placeholder="${escapeHtml(placeholder)}" ${attrs} data-clas-count-max="${max}"${readonly ? " readonly" : ""}>${escapeHtml(value || "")}</textarea></div>
      ${error ? clasFieldError({ e: error }, "e") : ""}
      <p class="e-permits-fo-field__hint e-permits-ntpl-count"><span>${hint}</span><span class="e-permits-ntpl-count__value" data-clas-count>${(value || "").length}/${max}</span></p>
    </div>`;
  document.addEventListener("input", (event) => {
    const area = event.target.closest?.("textarea[data-clas-count-max]");
    if (!area) return;
    const counter = area.closest(".e-permits-fo-field")?.querySelector("[data-clas-count]");
    if (counter) { counter.textContent = `${area.value.length}/${area.dataset.clasCountMax}`; counter.classList.toggle("is-over", area.value.length >= Number(area.dataset.clasCountMax)); }
  });

  const clasInput = (id, key, value, { label, required = false, hint = "", span = 12, errors, attr = "data-clas-value" }) => `
    <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
      <label for="${id}">${escapeHtml(label)}${required ? requiredMark() : ""}</label>
      <div class="e-permits-fo-input${errors?.[key] ? " is-error" : ""}"><input id="${id}" type="text" value="${escapeHtml(value ?? "")}" ${attr}="${key}" autocomplete="off"></div>
      ${clasFieldError(errors, key)}${hint ? `<p class="e-permits-fo-field__hint"${errors?.[key] ? " hidden" : ""}>${hint}</p>` : ""}
    </div>`;
  /* ---- value drawer: add / edit one value ---- */
  const clasDateField = (id, key, iso, { label, required = false, span = 6, errors, hint = "" }) => {
    const [y, m, d] = iso ? iso.split("-") : [];
    const today = clasToday();
    const view = (iso || today).split("-");
    return `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
        <label for="${id}">${escapeHtml(label)}${required ? requiredMark() : ""}</label>
        <div class="date-picker__field" data-date-picker data-type="default" data-locale="ro" data-selected="${escapeHtml(iso || "")}" data-today="${today}" data-year="${Number(view[0])}" data-month="${Number(view[1]) - 1}" data-clas-date="${key}">
          <div class="e-permits-fo-input e-permits-fo-input--with-action${errors?.[key] ? " is-error" : ""}">
            <input id="${id}" type="text" class="js-date-picker-input" value="${iso ? `${d}/${m}/${y}` : ""}" placeholder="ZZ/LL/AAAA" autocomplete="off">
            <button type="button" class="e-permits-fo-input__icon-button js-date-picker-toggle" aria-label="Alege data" aria-controls="${id}-panel" aria-expanded="false"><svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-calendar"></use></svg></button>
          </div>
          <div id="${id}-panel" class="date-picker-panel" aria-hidden="true" hidden>
            <div class="date-picker" role="dialog" aria-label="Alege data">
              <div class="date-picker__header">
                <button class="date-picker__nav js-date-picker-prev" type="button" aria-label="Luna anterioară"><svg class="icon medium" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-left"></use></svg></button>
                <div class="date-picker__month js-date-picker-label"></div>
                <button class="date-picker__nav js-date-picker-next" type="button" aria-label="Luna următoare"><svg class="icon medium" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-right"></use></svg></button>
              </div>
              <div class="date-picker__grid date-picker__grid--days" data-view="day"><div class="date-picker__weekdays">${["L", "M", "M", "J", "V", "S", "D"].map((w) => `<div class="date-picker__weekday">${w}</div>`).join("")}</div><div class="date-picker__days js-date-picker-days"></div></div>
            </div>
          </div>
        </div>
        ${clasFieldError(errors, key)}${hint ? `<p class="e-permits-fo-field__hint"${errors?.[key] ? " hidden" : ""}>${hint}</p>` : ""}
      </div>`;
  };

  const renderValueDrawer = () => {
    const s = clasDrawerState, c = getClassifier(clasState.id), v = s.values, e = s.errors;
    const parent = c.parintId ? getClassifier(c.parintId) : null;
    const extras = c.campuriExtra || [];
    const usedByChildren = s.key && clasCore.childrenOf(clasList(), c.id).some((ch) => (ch.valori || []).some((x) => x.parinte === s.key));
    clasDrawer.querySelector("[data-clas-drawer-title]").textContent = s.key ? `Editează valoarea ${s.key}` : "Valoare nouă";
    clasDrawer.querySelector("[data-clas-drawer-subtitle]").textContent = c.denumire;
    clasDrawerBody.innerHTML = `
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">Identificare</h3>
        <div class="e-permits-user-create__section-content"><div class="e-permits-user-create__grid">
          ${clasInput("clas-v-cod", "cod", v.cod, { label: "Cod", required: true, span: 6, errors: e, hint: usedByChildren ? "Folosit de clasificatoare-copil: la redenumire, referințele se actualizează." : `Unic în clasificator${(c.idFormat || "INT") === "INT" ? "; doar cifre" : ""}.` })}
          ${parent ? `<div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--6"><label for="clas-v-parent">Valoare-părinte</label>${renderFoSelectControl({ id: "clas-v-parent", attrs: 'data-clas-value="parinte"', optionsHtml: [["", "Fără"], ...parent.valori.filter((p) => p.activ || p.cod === v.parinte).map((p) => [p.cod, `${p.cod} — ${p.denRo}`])].map(([val, l]) => `<option value="${escapeHtml(val)}"${(v.parinte || "") === val ? " selected" : ""}>${escapeHtml(l)}</option>`).join("") })}<p class="e-permits-fo-field__hint">Din „${escapeHtml(parent.denumire)}”.</p></div>` : ""}
        </div></div>
      </section>
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">Denumiri</h3>
        <div class="e-permits-user-create__section-content"><div class="e-permits-user-create__grid">
          ${clasInput("clas-v-ro", "denRo", v.denRo, { label: "Denumire în română", required: true, errors: e })}
          ${clasInput("clas-v-ru", "denRu", v.denRu, { label: "Denumire în rusă", span: 6, errors: e })}
          ${clasInput("clas-v-en", "denEn", v.denEn, { label: "Denumire în engleză", span: 6, errors: e })}
        </div></div>
      </section>
      ${extras.length ? `<section class="e-permits-user-create__section"><h3 class="e-permits-user-create__section-title">Coloane suplimentare</h3><div class="e-permits-user-create__section-content"><div class="e-permits-user-create__grid">
        ${extras.map((f) => {
          const x = v.extra?.[f.id];
          if (f.tip === "Boolean") return `<div class="e-permits-user-create__field e-permits-user-create__field--12">${renderToggle({ label: f.label, checked: Boolean(x), attrs: `data-clas-extra-bool="${escapeHtml(f.id)}"` })}</div>`;
          if (f.tip === "Selecție" && f.cfg) return `<div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--6"><label for="clas-v-x-${escapeHtml(f.id)}">${escapeHtml(f.label)}</label>${renderFoSelectControl({ id: `clas-v-x-${f.id}`, attrs: `data-clas-extra="${escapeHtml(f.id)}"`, optionsHtml: [["", "Alege"], ...f.cfg.split("/").map((o) => o.trim()).filter(Boolean).map((o) => [o, o])].map(([val, l]) => `<option value="${escapeHtml(val)}"${String(x ?? "") === val ? " selected" : ""}>${escapeHtml(l)}</option>`).join("") })}</div>`;
          return clasInput(`clas-v-x-${f.id}`, f.id, x ?? "", { label: f.label, span: 6, errors: e, attr: "data-clas-extra" });
        }).join("")}
      </div></div></section>` : ""}
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">Valabilitate</h3>
        <div class="e-permits-user-create__section-content"><div class="e-permits-user-create__grid">
          ${clasDateField("clas-v-from", "activDeLa", v.activDeLa, { label: "Activ de la", required: true, errors: e })}
          ${clasDateField("clas-v-to", "activPanaLa", v.activPanaLa, { label: "Activ până la", errors: e, hint: "Opțional. Fără dată, valoarea rămâne activă." })}
        </div></div>
      </section>`;
    const c0 = getClassifier(clasState.id);
    clasDrawer.querySelector("[data-clas-drawer-summary]").textContent = c0.status === "published" ? `Salvarea deschide o ciornă peste v${c0.versiune}.` : "Se salvează în ciornă.";
    clasDrawer.querySelector("[data-clas-drawer-buttons]").innerHTML = `
      <button class="btn btn-neutral btn-rounded" type="button" data-clas-close>Anulează</button>
      ${s.key ? "" : '<button class="btn btn-secondary btn-rounded" type="button" data-clas-value-save="next">Salvează și adaugă alta</button>'}
      <button class="btn btn-primary btn-rounded" type="button" data-clas-value-save>Salvează</button>`;
    window.GEAPDatePicker?.init(clasDrawerBody);
  };

  const openValueEditor = (key = null) => {
    const c = getClassifier(clasState.id);
    const v = key ? JSON.parse(JSON.stringify(c.valori.find((x) => x.cod === key))) : { cod: "", denRo: "", denRu: "", denEn: "", activ: true, activDeLa: clasToday(), activPanaLa: null, parinte: null, extra: {} };
    openClasDrawer({ mode: "value", key, values: v, original: JSON.parse(JSON.stringify(v)), errors: {} });
  };

  const saveValueFromDrawer = (addAnother) => {
    const s = clasDrawerState;
    const ok = saveClasValue(s, (cod) => {
      refreshClassifierViews();
      flashClasRow(cod);
      if (addAnother) {
        openValueEditor(null);
        showShellToast(`„${cod}” a fost adăugată.`, "success", "Valoare salvată");
      } else {
        closeClasDrawer();
      }
    });
    if (!ok) { renderValueDrawer(); clasDrawerBody.querySelector(".is-error input")?.focus(); }
  };

  const openClasDrawer = (state) => {
    clasDrawerState = state;
    clasDrawerReturn = document.activeElement;
    clasDrawer.querySelector("[data-clas-drawer-steps]").hidden = state.mode !== "create";
    (state.mode === "value" ? renderValueDrawer : renderCreateDrawer)();
    clasDrawer.hidden = false;
    document.body.classList.add("is-user-create-open");
    requestAnimationFrame(() => clasDrawerBody.querySelector("input:not([readonly])")?.focus());
  };
  const closeClasDrawer = () => {
    if (!clasDrawer || clasDrawer.hidden || clasDrawer.classList.contains("is-closing")) return;
    closeFoSelect();
    clasDrawer.classList.add("is-closing");
    window.setTimeout(() => { clasDrawer.hidden = true; clasDrawer.classList.remove("is-closing"); document.body.classList.remove("is-user-create-open"); clasDrawerState = null; clasDrawerReturn?.focus?.(); }, 120);
  };

  /* ---- create wizard: wide right drawer, 4 steps (full-flow stepper on the left) ----
     1 Date generale  name, description, family, where it applies, starting point
     2 Structură      standard columns (locked) + extra columns, ID format, parent, access
     3 Valori         source: Intern (none / CSV checked against step 2 / copy subset)
                      or MConnect / API (link to the source, connection test, mapping)
     4 Revizuire      summary per step with "Modifică", then "Creează ciorna"
     Visited steps stay clickable; closing with data asks first. */
  const CLAS_CREATE_STEPS = ["Date generale", "Structură", "Valori", "Revizuire"];
  const clasSnake = (label) => clasCore.normName(label).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const clasCamel = (label) => clasSnake(label).replace(/_(.)/g, (_, ch) => ch.toUpperCase());
  const clasCreateExtras = (d) => d.extras.filter((x) => x.label.trim()).map((x) => ({ id: x.id || clasCamel(x.label), label: x.label.trim(), tip: x.tip, ...(x.cfg ? { cfg: x.cfg } : {}) }));
  const clasCreateDraftClassifier = (d) => ({ parintId: d.parintId || null, campuriExtra: clasCreateExtras(d), idFormat: d.idFormat, limitaDenumiri: classifiersStore.fieldTypes.defaults.limitaDenumiri });
  const clasCreateColumns = (d) => clasCore.fieldsOf(clasCreateDraftClassifier(d), classifiersStore.fieldTypes);
  const clasIsHttps = (url) => /^https:\/\/[^\s/$.?#].[^\s]*$/i.test(String(url || "").trim());

  const clasSegmented = (name, label, options, value, { disabled = false, hint = "", required = true } = {}) => `
    <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
      <label id="clas-c-${name}-l">${escapeHtml(label)}${required ? requiredMark() : ""}</label>
      <div class="segmented-control" role="radiogroup" aria-labelledby="clas-c-${name}-l"${hint ? ` aria-describedby="clas-c-${name}-h"` : ""}>${options.map(([v, l]) => `<button class="segment-item${value === v ? " is-selected" : ""}" type="button" role="radio" aria-checked="${value === v}" data-clas-create-choice="${name}" data-value="${v}"${disabled ? " disabled" : ""}>${l}</button>`).join("")}</div>
      ${hint ? `<p class="e-permits-fo-field__hint" id="clas-c-${name}-h">${hint}</p>` : ""}
    </div>`;
  const clasCreateSection = (title, body) => `<section class="e-permits-user-create__section"><h3 class="e-permits-user-create__section-title">${escapeHtml(title)}</h3><div class="e-permits-user-create__section-content">${body}</div></section>`;

  /* compact step strip under the drawer header — Figma GEAP 2.0 8772:118666 (.step-desktop
     horizontal): 24px numbered circle + label side by side, 36px line between steps;
     visited steps are buttons to go back */
  const renderStepStrip = (steps, s, gotoAttr) => `
    <ol class="e-permits-steps-strip__list">
      ${steps.map((label, i) => {
        const n = i + 1, active = n === s.step, done = !active && n <= s.maxStep;
        const state = active ? "current" : done ? "completed" : "incomplete";
        const inner = `<span class="e-permits-steps-strip__circle">${done ? '<svg class="icon" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-checkmark-small"></use></svg>' : n}</span><span class="e-permits-steps-strip__label">${label}</span>`;
        return `<li class="e-permits-steps-strip__step is-${state}"${active ? ' aria-current="step"' : ""}>
          ${i ? '<span class="e-permits-steps-strip__line" aria-hidden="true"></span>' : ""}
          ${done ? `<button class="e-permits-steps-strip__cell" type="button" ${gotoAttr}="${n}" aria-label="Pasul ${n}: ${label} (completat)">${inner}</button>` : `<span class="e-permits-steps-strip__cell">${inner}</span>`}
        </li>`;
      }).join("")}
    </ol>`;
  const renderCreateStepper = (s) => renderStepStrip(CLAS_CREATE_STEPS, s, "data-clas-create-goto");

  const renderCreateStep1 = (s) => {
    const d = s.values, e = s.errors, role = clasRole();
    const sources = clasList().filter(clasVisible).filter((c) => c.status !== "draft");
    const services = (servicesStore?.services || []).filter((sv) => sv.authorityId === `aut-${d.autoritate}`).map((sv) => sv.title);
    const svcOptions = [...new Set([...services, ...clasList().filter((c) => c.autoritate === d.autoritate).flatMap((c) => c.servicii || [])])];
    const categoryHint = role.id !== "adm-c" ? "Administratorul local creează doar clasificatoare pentru autoritatea sa."
      : d.categorie === "global" ? "Poate fi folosit de toate autoritățile și serviciile platformei." : "Poate fi folosit doar de serviciile alese ale unei autorități.";
    return `
      ${clasCreateSection("Identificare", `<div class="e-permits-user-create__grid">
        ${clasInput("clas-c-name", "denumire", d.denumire, { label: "Denumire", required: true, errors: e, attr: "data-clas-create", hint: "Ex. Motive de suspendare — ANSP" })}
        ${clasTextarea("clas-c-desc", 'data-clas-create="descriere"', d.descriere, { label: "Descriere", hint: "Ce conține și cine îl folosește.", placeholder: "Ex. Motivele pentru care o cerere ANSP poate fi suspendată; folosit la examinarea dosarelor." })}
        <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--6"><label for="clas-c-family">Familie${requiredMark()}</label>${renderFoSelectControl({ id: "clas-c-family", attrs: 'data-clas-create="familie"', optionsHtml: Object.entries(CLAS_FAMILY).map(([v, l]) => `<option value="${v}"${d.familie === v ? " selected" : ""}>${l}</option>`).join("") })}</div>
      </div>`)}
      ${clasCreateSection("Unde se aplică", `<div class="e-permits-user-create__grid">
        ${clasSegmented("categorie", "Categorie", [["global", "Global"], ["specific", "Specific unei autorități"]], d.categorie, { disabled: role.id !== "adm-c", hint: categoryHint })}
        ${d.categorie === "specific" ? `
          <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12"><label for="clas-c-auth">Autoritate${requiredMark()}</label>${renderFoSelectControl({ id: "clas-c-auth", attrs: 'data-clas-create="autoritate"', disabled: role.id !== "adm-c", optionsHtml: Object.entries(CLAS_AUTHORITY).map(([v, [s1, l]]) => `<option value="${v}"${d.autoritate === v ? " selected" : ""}>${s1} — ${l}</option>`).join("") })}</div>
          <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12"><span class="e-permits-fo-field__label-row"><label>Servicii${requiredMark()}</label></span>
            <div class="e-permits-clas-checklist">${svcOptions.map((sv) => `<label class="checkbox checkbox--medium"><input class="checkbox-input" type="checkbox" value="${escapeHtml(sv)}"${d.servicii.includes(sv) ? " checked" : ""} data-clas-create-service><span class="checkbox-custom" aria-hidden="true"></span><span class="checkbox-texts"><span class="checkbox-label">${escapeHtml(sv)}</span></span></label>`).join("")}</div>
            ${clasFieldError(e, "servicii")}${renderInfoNote("Un singur serviciu → domeniul „Serviciu”. Mai multe servicii → domeniul „Autoritate”.")}
          </div>` : ""}
      </div>`)}
      ${clasCreateSection("Punct de plecare", `<div class="e-permits-user-create__grid">
        ${clasSegmented("start", "Pornești de la", [["zero", "Zero"], ["copy", "Copia unui clasificator existent"]], d.start, { hint: d.start === "copy" ? "Se preiau coloanele și valorile alese. Copia nu se sincronizează cu originalul." : "Definești coloanele și valorile în pașii următori." })}
        ${d.start === "copy" ? `<div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12"><label for="clas-c-copy">Clasificator sursă${requiredMark()}</label><div class="${e.copiatDinId ? "is-error-wrap" : ""}">${renderFoSelectControl({ id: "clas-c-copy", attrs: 'data-clas-create="copiatDinId"', optionsHtml: [["", "Alege clasificatorul"], ...sources.map((c) => [c.id, `${c.denumire} · ${clasNumber(c.nrValori)} valori`])].map(([v, l]) => `<option value="${escapeHtml(v)}"${(d.copiatDinId || "") === v ? " selected" : ""}>${escapeHtml(l)}</option>`).join("") })}</div>${clasFieldError(e, "copiatDinId")}</div>` : ""}
      </div>`)}`;
  };

  const renderCreateStep2 = (s) => {
    const d = s.values, e = s.errors, central = clasRole().id === "adm-c";
    const standard = classifiersStore.fieldTypes.defaults.fields;
    const parents = clasList().filter((c) => c.status !== "archived" && clasVisible(c));
    const types = classifiersStore.fieldTypes.fieldTypes;
    const rows = d.extras.map((x, i) => `
      <div class="e-permits-clas-create__col-row">
        <div class="e-permits-fo-field"><div class="e-permits-fo-input${e[`x${i}label`] ? " is-error" : ""}"><input type="text" value="${escapeHtml(x.label)}" placeholder="Ex. Termen de examinare (zile)" aria-label="Denumirea coloanei ${i + 1}" data-clas-x="label" data-index="${i}" autocomplete="off"></div>${clasFieldError(e, `x${i}label`)}</div>
        <div class="e-permits-fo-field">${renderFoSelectControl({ id: `clas-c-x${i}-tip`, attrs: `data-clas-x="tip" data-index="${i}" aria-label="Tipul coloanei ${i + 1}"`, optionsHtml: types.map((t) => `<option value="${escapeHtml(t)}"${x.tip === t ? " selected" : ""}>${escapeHtml(t)}</option>`).join("") })}</div>
        <div class="e-permits-fo-field">${x.tip === "Selecție" ? `<div class="e-permits-fo-input${e[`x${i}cfg`] ? " is-error" : ""}"><input type="text" value="${escapeHtml(x.cfg || "")}" placeholder="Opțiuni: anual / 2 ani / 3 ani" aria-label="Opțiunile coloanei ${i + 1}" data-clas-x="cfg" data-index="${i}" autocomplete="off"></div>${clasFieldError(e, `x${i}cfg`)}`
          : x.tip === "Referință clasificator" ? `${renderFoSelectControl({ id: `clas-c-x${i}-ref`, attrs: `data-clas-x="cfg" data-index="${i}" aria-label="Clasificatorul referit de coloana ${i + 1}"`, optionsHtml: [["", "Alege clasificatorul"], ...parents.map((c) => [c.denumire, c.denumire])].map(([v, l]) => `<option value="${escapeHtml(v)}"${(x.cfg || "") === v ? " selected" : ""}>${escapeHtml(l)}</option>`).join("") })}${clasFieldError(e, `x${i}cfg`)}`
          : '<span class="e-permits-clas-create__muted">Fără setări</span>'}</div>
        ${clasIconAction("delete", "Elimină coloana", `data-clas-x-remove="${i}"`)}
      </div>`).join("");
    return `
      ${clasCreateSection("Coloane", `
        <p class="e-permits-clas-create__label">Standard <span class="e-permits-clas-create__muted">· au toate clasificatoarele, nu se pot elimina</span></p>
        <div class="e-permits-clas-create__tags">${standard.map((f) => renderTag(`${f.label}${f.obligatoriu || f.id === "cod" ? " *" : ""}`, "neutral")).join("")}${d.parintId ? renderTag("Valoare-părinte", "info") : ""}</div>
        <p class="e-permits-clas-create__label">Suplimentare <span class="e-permits-clas-create__muted">· apar în tabelul de valori, pentru fiecare valoare</span></p>
        ${d.extras.length ? `<div class="e-permits-clas-create__cols"><div class="e-permits-clas-create__col-row e-permits-clas-create__col-head" aria-hidden="true"><span>Denumire coloană</span><span>Tip</span><span>Setări</span><span></span></div>${rows}</div>` : '<p class="e-permits-clas-create__muted">Nicio coloană suplimentară. Adaugă doar ce trebuie păstrat la fiecare valoare (ex. termen, frecvență, cod extern).</p>'}
        <div><button class="btn btn-secondary btn-sm" type="button" data-clas-x-add><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-large"></use></svg><span>Adaugă coloană</span></button></div>`)}
      ${clasCreateSection("Format și ierarhie", `<div class="e-permits-user-create__grid">
        ${clasSegmented("idFormat", "Format cod", [["INT", "Număr (INT)"], ["UID", "Cod unic (UID)"]], d.idFormat, { hint: d.idFormat === "INT" ? "Codurile sunt numere: 1, 2, 1001." : "Codurile pot conține litere și cifre: MD, R1, A-01." })}
        <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12"><label for="clas-c-parent">Clasificator-părinte</label>${renderFoSelectControl({ id: "clas-c-parent", attrs: 'data-clas-create="parintId"', optionsHtml: [["", "Fără părinte"], ...parents.map((c) => [c.id, c.denumire])].map(([v, l]) => `<option value="${escapeHtml(v)}"${(d.parintId || "") === v ? " selected" : ""}>${escapeHtml(l)}</option>`).join("") })}<p class="e-permits-fo-field__hint">Opțional. Legătură vie: fiecare valoare va indica o valoare din clasificatorul-părinte.</p></div>
      </div>`)}
      ${central ? clasCreateSection("Acces", `<div class="e-permits-clas-form">
        ${renderToggle({ label: "Critic pentru proces", description: "Alimentează procese, termene (SLA) sau validări. Rămâne la administratorul central.", checked: d.criticProces, attrs: 'data-clas-create-toggle="criticProces"' })}
        ${renderToggle({ label: "Administratorul local poate modifica valorile", description: d.categorie !== "specific" ? "Doar pentru clasificatoarele specifice unei autorități." : d.criticProces ? "Indisponibil: clasificatorul este critic pentru proces." : "Structura rămâne la administratorul central.", checked: d.localAdminManageable, attrs: 'data-clas-create-toggle="localAdminManageable"', disabled: d.categorie !== "specific" || d.criticProces })}
      </div>`) : ""}`;
  };

  const renderCreateStep3 = (s) => {
    const d = s.values, e = s.errors;
    const copyFrom = d.start === "copy" ? getClassifier(d.copiatDinId) : null;
    if (copyFrom) {
      const vals = copyFrom.valori || [];
      return clasCreateSection(`Valori copiate din „${copyFrom.denumire}”`, `
        <div class="e-permits-clas-subset__bar"><span>${s.subset.size} din ${vals.length} selectate</span><button class="btn btn-text-primary btn-sm" type="button" data-clas-subset-all>${s.subset.size === vals.length ? "Deselectează tot" : "Selectează tot"}</button></div>
        <div class="e-permits-clas-checklist e-permits-clas-checklist--values">${vals.map((v) => `<label class="checkbox checkbox--medium e-permits-check"><input class="checkbox-input" type="checkbox" value="${escapeHtml(v.cod)}"${s.subset.has(v.cod) ? " checked" : ""} data-clas-subset><span class="checkbox-custom" aria-hidden="true"></span><span class="checkbox-texts"><span class="checkbox-label">${escapeHtml(v.cod)} — ${escapeHtml(v.denRo)}</span>${v.activ ? "" : '<span class="checkbox-description">Inactivă în original</span>'}</span></label>`).join("")}</div>
        ${clasFieldError(e, "subset")}
        ${renderInfoNote("Copia este internă: valorile se gestionează aici, fără sincronizare cu originalul.")}`);
    }
    const sourceHint = { intern: "Valorile se adaugă manual sau din fișier CSV.", mconnect: "Valorile se preiau din MConnect și se actualizează la sincronizare.", api: "Valorile se preiau dintr-un API extern, la sincronizare." }[d.sursa];
    const source = `<div class="e-permits-user-create__grid">${clasSegmented("sursa", "Sursa valorilor", [["intern", "Intern"], ["mconnect", "MConnect"], ["api", "API extern"]], d.sursa, { hint: sourceHint })}</div>`;
    if (d.sursa === "intern") {
      const cols = clasCreateColumns(d).map((f) => f.id);
      const p = d.csv?.parsed;
      const valid = p ? p.rows.filter((r) => r.cod && r.denRo) : [];
      return `${clasCreateSection("Sursa", source)}
        ${clasCreateSection("Valori inițiale", `
          <div class="e-permits-clas-choice" role="radiogroup" aria-label="Valori inițiale">
            ${[["empty", "Fără valori acum", "Le adaugi din tab-ul Valori, după creare."], ["csv", "Import din fișier CSV", "Fișierul se verifică pe coloanele definite la pasul Structură."]].map(([v, l, h]) => `<label class="radio"><input class="radio-input" type="radio" name="clas-c-values" value="${v}"${d.valoriStart === v ? " checked" : ""} data-clas-create-values><span class="radio-custom" aria-hidden="true"></span><span class="radio-label">${l}<span class="e-permits-clas-create__muted"> — ${h}</span></span></label>`).join("")}
          </div>
          ${d.valoriStart === "csv" ? `
            <div class="e-permits-clas-import__keys"><span>Coloane acceptate:</span> ${cols.map((k) => renderTag(k, "neutral")).join(" ")}</div>
            <div class="e-permits-clas-import__file">
              <label class="btn btn-secondary btn-sm" for="clas-c-file"><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-upload"></use></svg><span>${d.csv ? "Alege alt fișier" : "Alege fișierul CSV"}</span></label>
              <input id="clas-c-file" class="sr-only" type="file" accept=".csv,text/csv" data-clas-create-file>
              <button class="btn btn-text-primary btn-sm" type="button" data-clas-create-template>Descarcă modelul CSV</button>
            </div>
            ${clasFieldError(e, "csv")}
            ${p ? `
              <p class="e-permits-case-form__lead"><strong>${escapeHtml(d.csv.name)}</strong> · ${plural(p.rows.length, "rând", "rânduri")}</p>
              ${p.missing.length ? `<div class="message message--subtle banner--error"><span class="banner__icon"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-error-filled"></use></svg></span><div class="banner__content"><p class="banner__text">Lipsesc coloanele obligatorii: ${p.missing.map(escapeHtml).join(", ")}.</p></div></div>` : `
              <ul class="e-permits-case-form__fees" role="list">
                <li class="e-permits-case-form__fee"><span class="e-permits-case-form__fee-copy"><span class="e-permits-case-form__fee-name">Valori de importat</span></span>${renderTag(String(valid.length), "success")}</li>
                ${p.rows.length - valid.length ? `<li class="e-permits-case-form__fee"><span class="e-permits-case-form__fee-copy"><span class="e-permits-case-form__fee-name">Rânduri ignorate</span><span class="e-permits-case-form__fee-meta">Fără cod sau fără Denumire RO</span></span>${renderTag(String(p.rows.length - valid.length), "neutral")}</li>` : ""}
              </ul>`}
              ${p.unknownColumns.length ? `<div class="message message--subtle banner--warning"><span class="banner__icon"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-warning-filled"></use></svg></span><div class="banner__content"><p class="banner__text">Coloane necunoscute, nu se importă: <strong>${p.unknownColumns.map(escapeHtml).join(", ")}</strong>. Adaugă-le la pasul Structură dacă sunt necesare.</p></div></div>` : ""}` : ""}` : ""}`)}`;
    }
    const isM = d.sursa === "mconnect";
    const test = s.test;
    const fields = clasCreateColumns(d);
    const detected = test?.status === "ok" ? test.fields : null;
    return `${clasCreateSection("Sursa", source)}
      ${clasCreateSection("Link la sursă", `<div class="e-permits-user-create__grid">
        <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
          <label for="clas-c-endpoint">${isM ? "Link la serviciul MConnect" : "Link la API"}${requiredMark()}</label>
          <div class="e-permits-clas-create__link-row">
            <div class="e-permits-fo-input${e.endpoint ? " is-error" : ""}"><input id="clas-c-endpoint" type="url" inputmode="url" value="${escapeHtml(d.endpoint)}" placeholder="https://" data-clas-create="endpoint" autocomplete="off"></div>
            <button class="btn btn-secondary btn-sm" type="button" data-clas-create-test${test?.status === "loading" ? " disabled" : ""}>${test?.status === "loading" ? "Se verifică…" : "Testează conexiunea"}</button>
          </div>
          ${clasFieldError(e, "endpoint")}
          ${test?.status === "ok" ? `<span class="message message--inline message--success e-permits-fo-field__error e-permits-fo-field__success"><svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-checkmark-filled"></use></svg><span>Sursa răspunde · ${clasNumber(test.count)} înregistrări · ${test.fields.length} câmpuri găsite. Maparea a fost propusă mai jos — verific-o.</span></span>` : ""}
          ${test?.status === "error" ? clasFieldError({ t: test.message }, "t") : ""}
          <p class="e-permits-fo-field__hint"${e.endpoint || test ? " hidden" : ""}>${isM ? "Adresa serviciului din catalogul MConnect, ex. https://mconnect.gov.md/api/bns/cuatm/v3" : "Adresa HTTPS a API-ului, ex. https://api.exemplu.gov.md/clasificator"}</p>
        </div>
      </div>`)}
      ${clasCreateSection("Mapare coloane", `
        <div class="e-permits-dosar-profil__table-scroll"><table class="e-permits-dosar-profil__table e-permits-clas-create__map"><thead><tr><th scope="col">Coloană GEAP</th><th scope="col">Câmp în sursă</th></tr></thead><tbody>
          ${fields.filter((f) => !f.derivat).map((f) => `<tr><td>${escapeHtml(f.label)}${f.id === "cod" || f.id === "denRo" ? requiredMark() : ""} <span class="e-permits-clas-create__muted">${escapeHtml(f.id)}</span></td><td>${detected
            ? renderFoSelectControl({ id: `clas-c-map-${f.id}`, attrs: `data-clas-map="${f.id}" aria-label="Câmp în sursă pentru ${escapeHtml(f.label)}"`, optionsHtml: [["", "Nemapat"], ...detected.map((x) => [x, x])].map(([v, l]) => `<option value="${escapeHtml(v)}"${(d.mapare[f.id] || "") === v ? " selected" : ""}>${escapeHtml(l)}</option>`).join("") })
            : `<div class="e-permits-fo-input"><input type="text" value="${escapeHtml(d.mapare[f.id] || "")}" placeholder="${f.id === "cod" ? "ex. code" : ""}" aria-label="Câmp în sursă pentru ${escapeHtml(f.label)}" data-clas-map="${f.id}" autocomplete="off"></div>`}</td></tr>`).join("")}
        </tbody></table></div>
        ${clasFieldError(e, "mapare")}<p class="e-permits-fo-field__hint"${e.mapare ? " hidden" : ""}>ID și Denumire RO sunt obligatorii. La fiecare sincronizare, valorile care lipsesc din răspuns se dezactivează automat.</p>`)}`;
  };

  const renderCreateStep4 = (s) => {
    const d = s.values;
    const copyFrom = d.start === "copy" ? getClassifier(d.copiatDinId) : null;
    const extras = clasCreateExtras(d);
    const goto = (n) => `<button class="btn btn-text-primary btn-sm" type="button" data-clas-create-goto="${n}">Modifică</button>`;
    const valid = d.csv?.parsed ? d.csv.parsed.rows.filter((r) => r.cod && r.denRo).length : 0;
    const sursa = copyFrom ? "Intern (copie)" : CLAS_SOURCE[d.sursa];
    const initial = copyFrom ? `${s.subset.size} copiate din „${escapeHtml(copyFrom.denumire)}”` : d.sursa !== "intern" ? "Se preiau la prima sincronizare" : d.valoriStart === "csv" ? `${valid} din fișierul ${escapeHtml(d.csv?.name || "")}` : "Niciuna — le adaugi după creare";
    return `
      ${renderPassportBlock("Date generale", [
        ["Denumire", escapeHtml(d.denumire.trim())],
        ["Descriere", d.descriere.trim() ? escapeHtml(d.descriere.trim()) : "—"],
        ["Familie", escapeHtml(CLAS_FAMILY[d.familie])],
        ["Se aplică", d.categorie === "global" ? "Global — toată platforma" : `${escapeHtml(CLAS_AUTHORITY[d.autoritate]?.[0] || d.autoritate)} · ${plural(d.servicii.length, "serviciu", "servicii")}`],
        ["Punct de plecare", copyFrom ? `Copie a „${escapeHtml(copyFrom.denumire)}”` : "De la zero"]
      ], { actionHtml: goto(1) })}
      ${renderPassportBlock("Structură", [
        ["Coloane", `${classifiersStore.fieldTypes.defaults.fields.length} standard${extras.length ? ` + ${extras.map((x) => `${escapeHtml(x.label)} (${escapeHtml(x.tip)})`).join(", ")}` : ""}`],
        ["Format cod", d.idFormat === "INT" ? "Număr (INT)" : "Cod unic (UID)"],
        ["Clasificator-părinte", d.parintId ? escapeHtml(getClassifier(d.parintId)?.denumire || "") : "Fără"],
        ["Acces", `${d.criticProces ? "Critic pentru proces" : "Necritic"} · ${d.localAdminManageable && d.categorie === "specific" && !d.criticProces ? "administratorul local poate modifica valorile" : "doar administratorul central modifică"}`]
      ], { actionHtml: goto(2) })}
      ${renderPassportBlock("Valori", [
        ["Sursă", escapeHtml(sursa)],
        ...(!copyFrom && d.sursa !== "intern" ? [["Link la sursă", `<a class="link link-primary link-sm" href="${escapeHtml(d.endpoint.trim())}" target="_blank" rel="noopener">${escapeHtml(d.endpoint.trim())} ↗</a>`], ["Mapare", plural(Object.values(d.mapare).filter(Boolean).length, "coloană mapată", "coloane mapate")]] : []),
        ["Valori inițiale", initial]
      ], { actionHtml: goto(3) })}
      ${renderInfoNote("Se creează <strong>ciorna v0.1</strong>, invizibilă consumatorilor. O publici din pagina clasificatorului, după ce verifici valorile.")}`;
  };

  const renderCreateDrawer = () => {
    const s = clasDrawerState;
    clasDrawer.querySelector("[data-clas-drawer-title]").textContent = "Clasificator nou";
    clasDrawer.querySelector("[data-clas-drawer-subtitle]").textContent = s.values.denumire.trim() || "Ciornă nouă";
    const views = [renderCreateStep1, renderCreateStep2, renderCreateStep3, renderCreateStep4];
    const strip = clasDrawer.querySelector("[data-clas-drawer-steps]");
    strip.hidden = false;
    strip.innerHTML = renderCreateStepper(s);
    clasDrawerBody.innerHTML = `<div class="e-permits-clas-create">${views[s.step - 1](s)}</div>`;
    clasDrawer.querySelector("[data-clas-drawer-summary]").textContent = `Pasul ${s.step} din ${CLAS_CREATE_STEPS.length} · ${CLAS_CREATE_STEPS[s.step - 1]}`;
    clasDrawer.querySelector("[data-clas-drawer-buttons]").innerHTML = `
      ${s.step === 1 ? '<button class="btn btn-neutral btn-rounded" type="button" data-clas-close>Anulează</button>' : '<button class="btn btn-neutral btn-rounded" type="button" data-clas-create-back>Înapoi</button>'}
      ${s.step < CLAS_CREATE_STEPS.length ? '<button class="btn btn-primary btn-rounded" type="button" data-clas-create-next>Continuă</button>' : '<button class="btn btn-primary btn-rounded" type="button" data-clas-create-done>Creează ciorna</button>'}`;
  };

  const openCreateWizard = () => {
    const role = clasRole();
    openClasDrawer({ mode: "create", step: 1, maxStep: 1, errors: {}, subset: new Set(), test: null, dirty: false, values: {
      denumire: "", descriere: "", familie: "intern", categorie: role.id === "adm-c" ? "global" : "specific", autoritate: role.authority || "ansp", servicii: [],
      start: "zero", copiatDinId: "", extras: [], idFormat: classifiersStore.fieldTypes.defaults.idFormat, parintId: "", criticProces: false, localAdminManageable: role.id === "adm-l",
      sursa: "intern", valoriStart: "empty", csv: null, endpoint: "", mapare: {}
    } });
  };

  /* validation per step; returns the errors map */
  const validateCreateStep = (s, step) => {
    const d = s.values, e = {};
    if (step === 1) {
      if (!d.denumire.trim()) e.denumire = "Completează denumirea.";
      else if (clasList().some((c) => clasCore.normName(c.denumire) === clasCore.normName(d.denumire))) e.denumire = "Există deja un clasificator cu această denumire.";
      if (d.categorie === "specific" && !d.servicii.length) e.servicii = "Alege cel puțin un serviciu.";
      if (d.start === "copy" && !d.copiatDinId) e.copiatDinId = "Alege clasificatorul pe care îl copiezi.";
    }
    if (step === 2) {
      const reserved = new Set(classifiersStore.fieldTypes.defaults.fields.map((f) => clasCore.normName(f.label)));
      const seen = new Set();
      d.extras.forEach((x, i) => {
        const n = clasCore.normName(x.label);
        if (!x.label.trim()) e[`x${i}label`] = "Completează denumirea coloanei.";
        else if (reserved.has(n)) e[`x${i}label`] = "Este o coloană standard.";
        else if (seen.has(n)) e[`x${i}label`] = "Există deja o coloană cu această denumire.";
        seen.add(n);
        if (x.tip === "Selecție" && !String(x.cfg || "").split("/").map((o) => o.trim()).filter(Boolean).length) e[`x${i}cfg`] = "Completează opțiunile, separate cu „/”.";
        if (x.tip === "Referință clasificator" && !x.cfg) e[`x${i}cfg`] = "Alege clasificatorul.";
      });
    }
    if (step === 3) {
      if (d.start === "copy") { if (!s.subset.size) e.subset = "Alege cel puțin o valoare de copiat."; }
      else if (d.sursa === "intern") {
        if (d.valoriStart === "csv") {
          const p = d.csv?.parsed;
          if (!p) e.csv = "Alege fișierul CSV sau continuă fără valori.";
          else if (p.missing.length) e.csv = "Fișierul nu are coloanele obligatorii.";
          else if (!p.rows.some((r) => r.cod && r.denRo)) e.csv = "Fișierul nu are nicio valoare validă.";
        }
      } else {
        if (!d.endpoint.trim()) e.endpoint = "Completează linkul la sursă.";
        else if (!clasIsHttps(d.endpoint)) e.endpoint = "Linkul trebuie să înceapă cu https://.";
        else if (s.test?.status !== "ok") e.endpoint = "Testează conexiunea înainte de a continua.";
        if (!d.mapare.cod || !d.mapare.denRo) e.mapare = "Mapează cel puțin ID și Denumire RO.";
      }
    }
    return e;
  };

  const goCreateStep = (target) => {
    const s = clasDrawerState;
    if (target > s.step) {
      for (let st = s.step; st < target; st += 1) {
        const e = validateCreateStep(s, st);
        if (Object.keys(e).length) { s.step = st; s.errors = e; renderCreateDrawer(); clasDrawerBody.querySelector(".is-error input, .is-error textarea, .e-permits-fo-field__error")?.closest(".e-permits-fo-field, section")?.querySelector("input, textarea, button")?.focus(); return; }
      }
    }
    if (target === 3 && s.values.start === "copy" && !s.subsetFor) { s.subset = new Set((getClassifier(s.values.copiatDinId)?.valori || []).map((v) => v.cod)); s.subsetFor = s.values.copiatDinId; }
    if (s.values.csv?.text) s.values.csv.parsed = clasCore.parseCsv(s.values.csv.text, clasCreateColumns(s.values).map((f) => f.id));
    s.step = target; s.maxStep = Math.max(s.maxStep, target); s.errors = {};
    renderCreateDrawer();
    clasDrawerBody.scrollTop = 0;
    clasDrawerBody.querySelector(".e-permits-clas-create input:not([type=checkbox]):not([type=radio]), .e-permits-clas-create button")?.focus();
  };

  /* simulated connection test: an https link answers; fields are proposed from the columns */
  const testCreateSource = () => {
    const s = clasDrawerState, d = s.values;
    if (!clasIsHttps(d.endpoint)) { s.errors = { ...s.errors, endpoint: d.endpoint.trim() ? "Linkul trebuie să înceapă cu https://." : "Completează linkul la sursă." }; renderCreateDrawer(); clasDrawerBody.querySelector("#clas-c-endpoint")?.focus(); return; }
    s.test = { status: "loading" }; delete s.errors.endpoint; renderCreateDrawer();
    window.setTimeout(() => {
      if (clasDrawerState !== s) return;
      if (/eroare|error|invalid/i.test(d.endpoint)) { s.test = { status: "error", message: "Sursa nu răspunde. Verifică linkul sau contactează furnizorul." }; renderCreateDrawer(); return; }
      const guess = { cod: "code", denRo: "name_ro", denRu: "name_ru", denEn: "name_en", activ: "is_active", activDeLa: "valid_from", activPanaLa: "valid_to", parinte: "parent_code" };
      const cols = clasCreateColumns(d).filter((f) => !f.derivat || f.id === "parinte");
      const fields = cols.map((f) => guess[f.id] || clasSnake(f.label));
      cols.forEach((f, i) => { if (!d.mapare[f.id]) d.mapare[f.id] = fields[i]; });
      s.test = { status: "ok", fields: [...new Set([...fields, "updated_at"])], count: 120 + Math.floor(Math.random() * 400) };
      delete s.errors.mapare;
      renderCreateDrawer();
    }, 700);
  };

  const createDone = () => {
    const s = clasDrawerState, d = s.values;
    for (let st = 1; st <= 3; st += 1) { const e = validateCreateStep(s, st); if (Object.keys(e).length) { s.step = st; s.errors = e; renderCreateDrawer(); return; } }
    const copyFrom = d.start === "copy" ? getClassifier(d.copiatDinId) : null;
    const extras = clasCreateExtras(d);
    const extraIds = extras.map((x) => x.id);
    let valori = [];
    if (copyFrom) valori = copyFrom.valori.filter((v) => s.subset.has(v.cod)).map((v) => ({ ...JSON.parse(JSON.stringify(v)), parinte: null, sursa: "copie" }));
    else if (d.sursa === "intern" && d.valoriStart === "csv") valori = d.csv.parsed.rows.filter((r) => r.cod && r.denRo).map((r) => {
      const extra = {}; extraIds.forEach((k) => { if (r[k] != null && r[k] !== "") extra[k] = r[k]; });
      return { cod: r.cod, denRo: r.denRo, denRu: r.denRu || null, denEn: r.denEn || null, activ: r.activ ? !/^(0|false|nu)$/i.test(r.activ) : true, activDeLa: r.activDeLa || clasToday(), activPanaLa: r.activPanaLa || null, parinte: r.parinte || null, extra, autoInactivat: false, sursa: "import" };
    });
    const sursa = copyFrom ? "intern" : d.sursa;
    const id = `cl-${Date.now().toString(36)}`;
    const c = {
      id, denumire: d.denumire.trim(), descriere: d.descriere.trim(), familie: d.familie, categorie: d.categorie, servicii: d.categorie === "specific" ? d.servicii : [], autoritate: d.categorie === "specific" ? d.autoritate : null,
      activ: true, status: "draft", everPublished: false, scopeSystem: false, mod: sursa === "mconnect" ? "mconnect" : "manual", endpoint: sursa === "intern" ? null : d.endpoint.trim(), sursa,
      parintId: d.parintId || null, copiatDinId: copyFrom?.id || null, localAdminManageable: d.categorie === "specific" && !d.criticProces && d.localAdminManageable, criticProces: d.criticProces,
      idFormat: d.idFormat, limitaDenumiri: classifiersStore.fieldTypes.defaults.limitaDenumiri, versiune: "0.1", editatLa: clasToday(), editatDe: currentUserName(),
      nrValori: valori.length, campuriExtra: extras, mapare: sursa === "intern" ? [] : Object.entries(d.mapare).filter(([, v]) => v).map(([camp, src]) => ({ camp, sursa: src })), valori, consumatori: [], publishedSnapshot: null, jurnal: []
    };
    clasLog(c, "Creat", [copyFrom ? `Copie a „${copyFrom.denumire}”: ${s.subset.size} din ${copyFrom.valori.length} valori.` : sursa === "intern" ? (valori.length ? `${plural(valori.length, "valoare importată", "valori importate")} din ${d.csv.name}.` : "Fără valori.") : `Sursă ${CLAS_SOURCE[sursa]}: ${c.endpoint}.`, extras.length ? `Coloane suplimentare: ${extras.map((x) => x.label).join(", ")}.` : ""].filter(Boolean).join(" "));
    classifiersStore.list = [c, ...clasList()];
    s.dirty = false;
    closeClasDrawer();
    openClassifierProfile(id, "valori");
    showShellToast(sursa === "intern" ? `„${c.denumire}” este o ciornă${valori.length ? ` cu ${plural(valori.length, "valoare", "valori")}` : ""}. Verifică valorile, apoi publică.` : `„${c.denumire}” este o ciornă. Sincronizează valorile din sursă, apoi publică.`, "success", "Clasificator creat");
  };

  /* closing a wizard with data asks first */
  const requestCloseClasDrawer = () => {
    const s = clasDrawerState;
    if (s?.mode === "create" && s.dirty) {
      askConfirm({ title: "Renunți la clasificatorul nou?", text: "Datele introduse în acest formular se pierd.", confirmLabel: "Renunță", destructive: true }, () => { s.dirty = false; closeClasDrawer(); });
      return;
    }
    closeClasDrawer();
  };

  /* ---- modal: fields, CSV import, sync ---- */
  const clasModal = document.querySelector("#clas-modal");
  const clasModalBody = clasModal?.querySelector("[data-clas-modal-body]");
  let clasModalState = null;
  const openClasModal = (title, subtitle, body, buttons, state) => {
    clasModalState = state;
    clasModal.querySelector("[data-clas-modal-title]").textContent = title;
    clasModal.querySelector("[data-clas-modal-subtitle]").textContent = subtitle || "";
    clasModalBody.innerHTML = body;
    clasModal.querySelector("[data-clas-modal-buttons]").innerHTML = buttons;
    window.__modal?.open?.("#clas-modal");
  };
  const closeClasModal = () => { closeFoSelect(); window.__modal?.close?.("#clas-modal"); clasModalState = null; };

  const renderFieldModalBody = () => {
    const s = clasModalState;
    return `<div class="e-permits-case-form">
      <div class="e-permits-fo-field"><label for="clas-f-label">Denumire${requiredMark()}</label><div class="e-permits-fo-input${s.errors.label ? " is-error" : ""}"><input id="clas-f-label" type="text" value="${escapeHtml(s.label)}" data-clas-f="label" autocomplete="off"></div>${clasFieldError(s.errors, "label")}</div>
      <div class="e-permits-fo-field"><label for="clas-f-tip">Tip${requiredMark()}</label>${renderFoSelectControl({ id: "clas-f-tip", attrs: 'data-clas-f="tip"', optionsHtml: classifiersStore.fieldTypes.fieldTypes.map((t) => `<option value="${escapeHtml(t)}"${s.tip === t ? " selected" : ""}>${escapeHtml(t)}</option>`).join("") })}</div>
      ${s.tip === "Selecție" || s.tip === "Referință clasificator" ? `<div class="e-permits-fo-field"><label for="clas-f-cfg">${s.tip === "Selecție" ? "Opțiuni" : "Clasificator referit"}</label><div class="e-permits-fo-input"><input id="clas-f-cfg" type="text" value="${escapeHtml(s.cfg)}" placeholder="${s.tip === "Selecție" ? "ex. I / II / mun." : "ex. CUATM"}" data-clas-f="cfg" autocomplete="off"></div><p class="e-permits-fo-field__hint">${s.tip === "Selecție" ? "Separă opțiunile cu „/”." : "Numele clasificatorului din care se aleg valorile."}</p></div>` : ""}
      ${renderInfoNote("Coloana apare în tabelul de valori, pentru fiecare valoare. Modificarea structurii trece clasificatorul în ciornă.")}
    </div>`;
  };
  const openFieldModal = (fieldId = null) => {
    const c = getClassifier(clasState.id);
    const f = fieldId ? c.campuriExtra.find((x) => x.id === fieldId) : null;
    openClasModal(f ? "Editează coloana" : "Coloană nouă", c.denumire, "", '<button class="btn btn-neutral btn-rounded" type="button" data-clas-modal-cancel>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-clas-field-save>Salvează</button>', { kind: "field", id: fieldId, label: f?.label || "", tip: f?.tip || "Text", cfg: f?.cfg || "", errors: {} });
    clasModalBody.innerHTML = renderFieldModalBody();
    requestAnimationFrame(() => clasModalBody.querySelector("#clas-f-label")?.focus());
  };
  const saveField = () => {
    const s = clasModalState, c = getClassifier(clasState.id);
    const all = clasCore.fieldsOf(c, classifiersStore.fieldTypes);
    s.errors = clasCore.validateFieldRow(s.id || "__new__", { label: s.label }, all);
    if (Object.keys(s.errors).length) { clasModalBody.innerHTML = renderFieldModalBody(); clasModalBody.querySelector("#clas-f-label")?.focus(); return; }
    const key = s.id || clasCore.normName(s.label).replace(/[^a-z0-9]+(.)/g, (_, ch) => ch.toUpperCase()).replace(/[^a-zA-Z0-9]/g, "");
    clasEdit(c, (x) => { const def = { id: key, label: s.label.trim(), tip: s.tip, ...(s.cfg ? { cfg: s.cfg } : {}) }; x.campuriExtra = s.id ? x.campuriExtra.map((y) => (y.id === s.id ? def : y)) : [...(x.campuriExtra || []), def]; }, [s.id ? "Coloană modificată" : "Coloană adăugată", `${s.label.trim()} (${s.tip})`]);
    closeClasModal(); refreshClassifierViews(); showShellToast("Structura s-a actualizat în ciornă.", "success", "Coloană salvată");
  };

  const openImportModal = () => {
    const c = getClassifier(clasState.id);
    const known = clasCore.fieldsOf(c, classifiersStore.fieldTypes).map((f) => f.id);
    openClasModal("Importă valori din CSV", c.denumire, `<div class="e-permits-case-form">
      <p class="e-permits-case-form__lead">Prima linie conține cheile coloanelor. Codurile existente se actualizează, cele noi se adaugă; nimic nu se șterge.</p>
      <div class="e-permits-clas-import__keys"><span>Coloane acceptate:</span> ${known.map((k) => `<span class="e-permits-workplace__tag e-permits-workplace__tag--neutral">${escapeHtml(k)}</span>`).join(" ")}</div>
      <div class="e-permits-clas-import__file">
        <label class="btn btn-secondary btn-sm" for="clas-import-file"><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-upload"></use></svg><span>Alege fișierul CSV</span></label>
        <input id="clas-import-file" class="sr-only" type="file" accept=".csv,text/csv" data-clas-import-file>
        <button class="btn btn-text-primary btn-sm" type="button" data-clas-import-template>Descarcă modelul CSV</button>
      </div>
      <div data-clas-import-result></div>
    </div>`, '<button class="btn btn-neutral btn-rounded" type="button" data-clas-modal-cancel>Anulează</button><button class="btn btn-primary btn-rounded" type="button" data-clas-import-apply disabled>Importă</button>', { kind: "import", parsed: null, known });
  };
  const showImportPreview = (text, fileName) => {
    const s = clasModalState, c = getClassifier(clasState.id);
    const p = clasCore.parseCsv(text, s.known);
    const existing = new Set(c.valori.map((v) => v.cod));
    const valid = p.rows.filter((r) => r.cod && r.denRo);
    const upd = valid.filter((r) => existing.has(r.cod)).length;
    s.parsed = { ...p, valid };
    clasModalBody.querySelector("[data-clas-import-result]").innerHTML = `
      <p class="e-permits-case-form__lead"><strong>${escapeHtml(fileName)}</strong> · ${plural(p.rows.length, "rând", "rânduri")}</p>
      ${p.missing.length ? `<div class="message message--subtle banner--error"><span class="banner__icon"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-error-filled"></use></svg></span><div class="banner__content"><p class="banner__text">Lipsesc coloanele obligatorii: ${p.missing.map(escapeHtml).join(", ")}.</p></div></div>` : `
      <ul class="e-permits-case-form__fees" role="list">
        <li class="e-permits-case-form__fee"><span class="e-permits-case-form__fee-copy"><span class="e-permits-case-form__fee-name">Valori noi</span></span>${renderTag(String(valid.length - upd), "success")}</li>
        <li class="e-permits-case-form__fee"><span class="e-permits-case-form__fee-copy"><span class="e-permits-case-form__fee-name">Valori actualizate</span></span>${renderTag(String(upd), "info")}</li>
        ${p.rows.length - valid.length ? `<li class="e-permits-case-form__fee"><span class="e-permits-case-form__fee-copy"><span class="e-permits-case-form__fee-name">Rânduri ignorate</span><span class="e-permits-case-form__fee-meta">Fără cod sau fără Denumire RO</span></span>${renderTag(String(p.rows.length - valid.length), "neutral")}</li>` : ""}
      </ul>`}
      ${p.unknownColumns.length ? `<div class="message message--subtle banner--warning"><span class="banner__icon"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-warning-filled"></use></svg></span><div class="banner__content"><p class="banner__text">Coloane necunoscute, nu se importă: <strong>${p.unknownColumns.map(escapeHtml).join(", ")}</strong>. Adaugă-le întâi în tab-ul Coloane, dacă sunt necesare.</p></div></div>` : ""}`;
    clasModal.querySelector("[data-clas-import-apply]").disabled = Boolean(p.missing.length) || !valid.length;
  };
  const applyImport = () => {
    const s = clasModalState, c = getClassifier(clasState.id);
    const extraIds = (c.campuriExtra || []).map((f) => f.id);
    let added = 0, updatedN = 0;
    clasEdit(c, (x) => {
      const by = new Map(x.valori.map((v) => [v.cod, v]));
      s.parsed.valid.forEach((r) => {
        const extra = {}; extraIds.forEach((k) => { if (r[k] != null && r[k] !== "") extra[k] = r[k]; });
        const base = { cod: r.cod, denRo: r.denRo, denRu: r.denRu || null, denEn: r.denEn || null, activ: r.activ ? !/^(0|false|nu)$/i.test(r.activ) : true, activDeLa: r.activDeLa || clasToday(), activPanaLa: r.activPanaLa || null, parinte: r.parinte || null, extra, autoInactivat: false, sursa: "import" };
        if (by.has(r.cod)) { Object.assign(by.get(r.cod), { ...base, extra: { ...by.get(r.cod).extra, ...extra } }); updatedN++; } else { x.valori.push(base); added++; }
      });
      x.nrValori = Math.max(x.nrValori || 0, x.valori.length) + added - (x.nrValori >= x.valori.length ? 0 : 0);
    }, ["Import CSV", `${plural(added, "valoare nouă", "valori noi")}, ${plural(updatedN, "actualizată", "actualizate")}${s.parsed.unknownColumns.length ? `; coloane ignorate: ${s.parsed.unknownColumns.join(", ")}` : ""}.`]);
    closeClasModal(); refreshClassifierViews(); showShellToast(`${plural(added, "valoare nouă", "valori noi")}, ${plural(updatedN, "actualizată", "actualizate")}. Publică pentru a fi vizibile consumatorilor.`, "success", "Import finalizat");
  };

  /* MConnect sync: fetch → apply → summary with impact (DIV-C7: no blocking) */
  const openSyncFlow = () => {
    const c = getClassifier(clasState.id);
    askConfirm({ title: "Sincronizezi din MConnect?", text: `Valorile se preiau din ${c.endpoint || "sursă"}. Valorile care lipsesc din răspuns se dezactivează automat (rămân în înregistrările existente).`, confirmLabel: "Sincronizează" }, () => {
      /* mock response: the source renamed one value, added one, dropped the last active one */
      const active = c.valori.filter((v) => v.activ);
      const incoming = active.slice(0, -1).map((v, i) => (i === 0 ? { ...v, denRo: `${v.denRo}` } : v));
      incoming.push({ cod: String(9000 + Math.floor(Math.random() * 900)), denRo: "Valoare nouă din sursă", denRu: null, denEn: null });
      const plan = clasCore.syncPlan(c, incoming);
      const next = clasCore.applySync(c, incoming, clasToday());
      next.versiune = clasCore.bumpVersion(c.versiune);
      next.nrValori = (c.nrValori || 0) + plan.added.length;
      clasLog(next, "Sincronizare", `${plural(plan.added.length, "valoare nouă", "valori noi")}, ${plural(plan.updated.length, "actualizată", "actualizate")}, ${plural(plan.deactivated.length, "dezactivată automat", "dezactivate automat")}.`);
      next.editatDe = "Sistem (MConnect)";
      replaceClassifier(next);
      refreshClassifierViews();
      const affected = (c.consumatori || []);
      openClasModal("Sincronizare finalizată", `${c.denumire} · v${next.versiune}`, `<div class="e-permits-case-form">
        <ul class="e-permits-case-form__fees" role="list">
          <li class="e-permits-case-form__fee"><span class="e-permits-case-form__fee-copy"><span class="e-permits-case-form__fee-name">Valori noi</span><span class="e-permits-case-form__fee-meta">${plan.added.map(escapeHtml).join(", ") || "—"}</span></span>${renderTag(String(plan.added.length), "success")}</li>
          <li class="e-permits-case-form__fee"><span class="e-permits-case-form__fee-copy"><span class="e-permits-case-form__fee-name">Actualizate</span></span>${renderTag(String(plan.updated.length), "info")}</li>
          <li class="e-permits-case-form__fee"><span class="e-permits-case-form__fee-copy"><span class="e-permits-case-form__fee-name">Dezactivate automat</span><span class="e-permits-case-form__fee-meta">${plan.deactivated.map(escapeHtml).join(", ") || "—"} — lipseau din răspuns</span></span>${renderTag(String(plan.deactivated.length), plan.deactivated.length ? "warning" : "neutral")}</li>
        </ul>
        ${plan.deactivated.length && affected.length ? `<div class="message message--subtle banner--warning"><span class="banner__icon"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-warning-filled"></use></svg></span><div class="banner__content"><p class="banner__text"><strong>Verifică modulele care îl folosesc:</strong> ${affected.map((m) => escapeHtml(m.modul)).join(", ")}. Valorile dezactivate nu mai pot fi alese.</p></div></div>` : ""}
      </div>`, '<button class="btn btn-primary btn-rounded" type="button" data-clas-modal-cancel>Am înțeles</button>', { kind: "sync" });
    });
  };

  /* ---- events ---- */
  /* a field's error clears as soon as it is edited (validation re-runs on save) */
  const clearClasFieldError = (target, errors) => {
    const box = target.closest(".e-permits-fo-input.is-error, .e-permits-fo-textarea.is-error");
    if (!box) return;
    box.classList.remove("is-error");
    box.parentElement.querySelector(":scope > .message--error")?.remove();
    box.parentElement.querySelector(":scope > .e-permits-fo-field__hint[hidden]")?.removeAttribute("hidden");
    const key = (target.dataset.clasX ? `x${target.dataset.index}${target.dataset.clasX}` : "") || target.dataset.clasCell || target.dataset.clasValue || target.dataset.clasCreate || target.dataset.clasSetting || target.dataset.clasExtra || target.dataset.clasF;
    if (errors && key) delete errors[key];
  };
  [clasDrawer, clasProfileBody, clasModal].forEach((root) => root?.addEventListener("input", (event) => {
    const errors = root === clasDrawer ? clasDrawerState?.errors : root === clasModal ? clasModalState?.errors : clasState.draft?.errors;
    clearClasFieldError(event.target, errors);
  }, true));
  clasProfileBackShell?.addEventListener("click", closeClassifierProfile);
  document.querySelector("[data-workplace-add-classifier]")?.addEventListener("click", openCreateWizard);

  clasProfileTitle?.addEventListener("click", (event) => {
    if (event.target.closest("[data-clas-crumb-back]")) { event.preventDefault(); closeClassifierProfile(); return; }
    const act = event.target.closest("[data-clas-action]"); if (act) { runClassifierAction(act.dataset.clasAction); return; }
    if (event.target.closest("[data-clas-sync]")) { openSyncFlow(); return; }
    if (event.target.closest("[data-clas-settings-discard]")) { clasState.draft = null; renderClassifierProfile(); return; }
    if (event.target.closest("[data-clas-settings-save]")) saveClassifierSettings();
  });

  clasProfileTabs?.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-clas-profile-tab]"); if (!tab) return;
    clasState.tabKey = tab.dataset.clasProfileTab;
    renderClassifierProfile();
    writeHash(`#clasificator/${encodeURIComponent(clasState.id)}/${clasState.tabKey}`);
    clasProfileTabs.querySelector(`[data-clas-profile-tab="${clasState.tabKey}"]`)?.focus();
  });

  const saveClassifierSettings = () => {
    const c = getClassifier(clasState.id), d = clasState.draft;
    d.errors = {};
    if (!d.denumire.trim()) d.errors.denumire = "Completează denumirea.";
    else if (clasList().some((x) => x.id !== c.id && clasCore.normName(x.denumire) === clasCore.normName(d.denumire))) d.errors.denumire = "Există deja un clasificator cu această denumire.";
    if (!/^\d+$/.test(String(d.limitaDenumiri)) || Number(d.limitaDenumiri) < 10) d.errors.limitaDenumiri = "Un număr de cel puțin 10.";
    if (Object.keys(d.errors).length) { renderClassifierProfile(); clasProfileBody.querySelector(".is-error input")?.focus(); return; }
    const parentChanged = (c.parintId || "") !== d.parintId;
    clasEdit(c, (x) => { x.denumire = d.denumire.trim(); x.descriere = d.descriere.trim(); x.familie = d.familie; x.parintId = d.parintId || null; x.criticProces = d.criticProces; x.localAdminManageable = d.criticProces ? false : d.localAdminManageable; x.idFormat = d.idFormat; x.limitaDenumiri = Number(d.limitaDenumiri); if (parentChanged) x.valori.forEach((v) => { v.parinte = null; }); }, ["Setări modificate", parentChanged ? `Clasificator-părinte: ${d.parintId ? getClassifier(d.parintId)?.denumire : "fără"}.` : "Identificare, acces sau format."]);
    clasState.draft = null; refreshClassifierViews(); showShellToast("Setările au fost salvate.", "success", "Salvat");
  };

  clasProfileBody?.addEventListener("click", (event) => {
    const open = event.target.closest("[data-clas-open]"); if (open) { openClassifierProfile(open.dataset.clasOpen, "dependente"); return; }
    const act = event.target.closest("[data-clas-activity]"); if (act) { clasState.activity = act.dataset.clasActivity; renderClassifierProfile(); clasProfileBody.querySelector(`[data-clas-activity="${clasState.activity}"]`)?.focus(); return; }
    if (event.target.closest("[data-clas-grid-add]")) { openValueEditor(); return; }
    const ed = event.target.closest("[data-clas-grid-edit]"); if (ed) { openValueEditor(ed.dataset.clasGridEdit); return; }
    const tg = event.target.closest("[data-clas-grid-toggle]");
    if (tg) { const v = getClassifier(clasState.id).valori.find((x) => x.cod === tg.dataset.clasGridToggle); setClasValuesActive([v.cod], !v.activ); return; }
    const del = event.target.closest("[data-clas-grid-delete]"); if (del) { if (del.getAttribute("aria-disabled") !== "true") deleteClasValue(del.dataset.clasGridDelete); return; }
    const bulk = event.target.closest("[data-clas-grid-bulk]"); if (bulk) { setClasValuesActive([...clasState.selected], bulk.dataset.clasGridBulk === "on"); return; }
    if (event.target.closest("[data-clas-grid-clear]")) { clasState.selected.clear(); renderClassifierProfile(); return; }
    if (event.target.closest("[data-clas-import]")) { openImportModal(); return; }
    if (event.target.closest("[data-clas-sync]")) { openSyncFlow(); return; }
    if (event.target.closest("[data-clas-field-add]")) { openFieldModal(); return; }
    const fe = event.target.closest("[data-clas-field-edit]"); if (fe) { openFieldModal(fe.dataset.clasFieldEdit); return; }
    const fr = event.target.closest("[data-clas-field-remove]");
    if (fr) {
      const c = getClassifier(clasState.id); const f = c.campuriExtra.find((x) => x.id === fr.dataset.clasFieldRemove);
      const used = c.valori.filter((v) => v.extra && v.extra[f.id] != null && v.extra[f.id] !== "").length;
      askConfirm({ title: "Elimini coloana?", text: `„${f.label}”${used ? ` are date la ${plural(used, "valoare", "valori")}; ele se pierd la publicare` : " nu are date"}. Modificarea trece clasificatorul în ciornă.`, confirmLabel: "Elimină", destructive: true }, () => {
        clasEdit(c, (x) => { x.campuriExtra = x.campuriExtra.filter((y) => y.id !== f.id); x.valori.forEach((v) => { if (v.extra) delete v.extra[f.id]; }); x.mapare = (x.mapare || []).filter((m) => m.camp !== f.id); }, ["Coloană eliminată", f.label]);
        refreshClassifierViews(); showShellToast(`„${f.label}” a fost eliminat din ciornă.`, "info", "Coloană eliminată");
      });
      return;
    }
    const idf = event.target.closest("[data-clas-idformat]"); if (idf && !idf.disabled) { clasState.draft.idFormat = idf.dataset.clasIdformat; renderClassifierProfile(); }
  });
  clasProfileBody?.addEventListener("input", (event) => {
    const sr = event.target.closest("[data-clas-value-search]");
    if (sr) { clasState.query = sr.value; const pos = sr.selectionStart; renderClassifierProfile(); const ni = clasProfileBody.querySelector("[data-clas-value-search]"); ni?.focus(); ni?.setSelectionRange(pos, pos); return; }
    const st = event.target.closest("[data-clas-setting]");
    if (st && st.tagName !== "SELECT") { const wasDirty = clasSettingsDirty(getClassifier(clasState.id)); clasState.draft[st.dataset.clasSetting] = st.value; if (wasDirty !== clasSettingsDirty(getClassifier(clasState.id))) renderClassifierHeaderOnly(); }
  });
  clasProfileBody?.addEventListener("change", (event) => {
    const st = event.target.closest("select[data-clas-setting]"); if (st) { clasState.draft[st.dataset.clasSetting] = st.value; renderClassifierProfile(); return; }
    const tg = event.target.closest("[data-clas-toggle]"); if (tg) { clasState.draft[tg.dataset.clasToggle] = tg.checked; if (tg.dataset.clasToggle === "criticProces" && tg.checked) clasState.draft.localAdminManageable = false; renderClassifierProfile(); }
  });
  /* table: checkboxes select; click a row (or Enter on it) to edit in the drawer */
  clasProfileBody?.addEventListener("change", (event) => {
    const one = event.target.closest("[data-clas-grid-select]");
    if (one) { if (one.checked) clasState.selected.add(one.value); else clasState.selected.delete(one.value); renderClassifierProfile(); clasProfileBody.querySelector(`[data-clas-grid-select][value="${CSS.escape(one.value)}"]`)?.focus(); return; }
    const allBox = event.target.closest("[data-clas-grid-select-all]");
    if (allBox) {
      clasProfileBody.querySelectorAll("[data-clas-grid-select]").forEach((box) => { if (allBox.checked) clasState.selected.add(box.value); else clasState.selected.delete(box.value); });
      renderClassifierProfile(); clasProfileBody.querySelector("[data-clas-grid-select-all]")?.focus();
    }
  });
  clasProfileBody?.addEventListener("click", (event) => {
    const tr = event.target.closest(".e-permits-clas-grid__table.is-editable tr[data-clas-row]");
    if (!tr || event.target.closest("button, label, input, a")) return;
    openValueEditor(tr.dataset.clasRow);
  });
  clasProfileBody?.addEventListener("keydown", (event) => {
    const tr = event.target.matches?.(".e-permits-clas-grid__table.is-editable tr[data-clas-row]") ? event.target : null;
    if (tr && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); openValueEditor(tr.dataset.clasRow); }
  });

  const renderClassifierHeaderOnly = () => {
    const c = getClassifier(clasState.id);
    renderClassifierHeader(c);
    if (clasState.tabKey === "setari" && clasSettingsDirty(c)) clasProfileTitle.querySelector(".e-permits-page-header__actions")?.insertAdjacentHTML("afterbegin", '<button class="btn btn-neutral btn-sm" type="button" data-clas-settings-discard>Renunță</button><button class="btn btn-primary btn-sm" type="button" data-clas-settings-save>Salvează</button><span class="e-permits-page-header__divider" aria-hidden="true"></span>');
  };

  clasDrawer?.addEventListener("click", (event) => {
    if (event.target.closest("[data-clas-close]")) { requestCloseClasDrawer(); return; }
    const vs = event.target.closest("[data-clas-value-save]"); if (vs) { saveValueFromDrawer(vs.dataset.clasValueSave === "next"); return; }
    const s = clasDrawerState; if (!s || s.mode !== "create") return;
    const d = s.values;
    if (event.target.closest("[data-clas-create-next]")) { goCreateStep(s.step + 1); return; }
    if (event.target.closest("[data-clas-create-back]")) { goCreateStep(s.step - 1); return; }
    const go = event.target.closest("[data-clas-create-goto]"); if (go) { goCreateStep(Number(go.dataset.clasCreateGoto)); return; }
    if (event.target.closest("[data-clas-create-done]")) { createDone(); return; }
    if (event.target.closest("[data-clas-create-test]")) { testCreateSource(); return; }
    const ch = event.target.closest("[data-clas-create-choice]");
    if (ch && !ch.disabled) {
      const key = ch.dataset.clasCreateChoice, value = ch.dataset.value;
      d[key] = value; s.dirty = true;
      if (key === "categorie" && value === "global") { d.servicii = []; d.localAdminManageable = false; }
      if (key === "sursa") { s.test = null; d.mapare = {}; delete s.errors.endpoint; delete s.errors.mapare; }
      if (key === "start" && value === "zero") { d.copiatDinId = ""; s.subsetFor = null; }
      renderCreateDrawer();
      clasDrawerBody.querySelector(`[data-clas-create-choice="${key}"][data-value="${value}"]`)?.focus();
      return;
    }
    if (event.target.closest("[data-clas-x-add]")) {
      d.extras.push({ label: "", tip: "Text", cfg: "" }); s.dirty = true; renderCreateDrawer();
      clasDrawerBody.querySelector(`[data-clas-x="label"][data-index="${d.extras.length - 1}"]`)?.focus();
      return;
    }
    const rm = event.target.closest("[data-clas-x-remove]");
    if (rm) { d.extras.splice(Number(rm.dataset.clasXRemove), 1); s.errors = {}; renderCreateDrawer(); clasDrawerBody.querySelector("[data-clas-x-add]")?.focus(); return; }
    if (event.target.closest("[data-clas-subset-all]")) { const vals = getClassifier(d.copiatDinId).valori; s.subset = s.subset.size === vals.length ? new Set() : new Set(vals.map((v) => v.cod)); renderCreateDrawer(); return; }
    if (event.target.closest("[data-clas-create-template]")) {
      const cols = clasCreateColumns(d).map((f) => f.id);
      const blob = new Blob([`\uFEFF${cols.join(";")}\n`], { type: "text/csv;charset=utf-8" });
      const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${clasSnake(d.denumire || "clasificator") || "clasificator"}-model.csv`; link.click(); URL.revokeObjectURL(link.href);
    }
  });
  clasDrawer?.addEventListener("input", (event) => {
    const s = clasDrawerState; if (!s) return;
    if (s.mode === "value") {
      const v = event.target.closest("input[data-clas-value]"); if (v) { s.values[v.dataset.clasValue] = v.value; return; }
      const x = event.target.closest("input[data-clas-extra]"); if (x) s.values.extra = { ...(s.values.extra || {}), [x.dataset.clasExtra]: x.value };
      return;
    }
    s.dirty = true;
    const cr = event.target.closest("[data-clas-create]");
    if (cr && cr.tagName !== "SELECT") {
      s.values[cr.dataset.clasCreate] = cr.value;
      if (cr.dataset.clasCreate === "endpoint" && s.test) { s.test = null; clasDrawerBody.querySelectorAll(".message--success").forEach((m) => m.remove()); }
      if (cr.dataset.clasCreate === "denumire") clasDrawer.querySelector("[data-clas-drawer-subtitle]").textContent = cr.value.trim() || "Ciornă nouă";
      return;
    }
    const x = event.target.closest("input[data-clas-x]"); if (x) { s.values.extras[Number(x.dataset.index)][x.dataset.clasX] = x.value; return; }
    const mp = event.target.closest("input[data-clas-map]"); if (mp) s.values.mapare[mp.dataset.clasMap] = mp.value.trim();
  });
  clasDrawer?.addEventListener("change", (event) => {
    const s = clasDrawerState; if (!s) return;
    if (s.mode === "value") {
      const sel = event.target.closest("select[data-clas-value]"); if (sel) { s.values[sel.dataset.clasValue] = sel.value || null; return; }
      const xs = event.target.closest("select[data-clas-extra]"); if (xs) { s.values.extra = { ...(s.values.extra || {}), [xs.dataset.clasExtra]: xs.value }; return; }
      const xb = event.target.closest("[data-clas-extra-bool]"); if (xb) { s.values.extra = { ...(s.values.extra || {}), [xb.dataset.clasExtraBool]: xb.checked }; return; }
      const dt = event.target.closest("[data-clas-date]");
      if (dt) {
        s.values[dt.dataset.clasDate] = dt.dataset.selected || null;
        if (s.errors[dt.dataset.clasDate]) { delete s.errors[dt.dataset.clasDate]; dt.querySelector(".is-error")?.classList.remove("is-error"); const f = dt.closest(".e-permits-fo-field"); f.querySelector(":scope > .message--error")?.remove(); f.querySelector(":scope > .e-permits-fo-field__hint")?.removeAttribute("hidden"); }
      }
      return;
    }
    s.dirty = true;
    const d = s.values;
    const cs = event.target.closest("select[data-clas-create]");
    if (cs) {
      d[cs.dataset.clasCreate] = cs.value;
      if (cs.dataset.clasCreate === "autoritate") d.servicii = [];
      if (cs.dataset.clasCreate === "copiatDinId") { s.subsetFor = null; const src = getClassifier(cs.value); if (src && !d.extras.length) d.extras = (src.campuriExtra || []).map((f) => ({ id: f.id, label: f.label, tip: f.tip, cfg: f.cfg || "" })); if (src) d.idFormat = src.idFormat || d.idFormat; }
      if (s.errors[cs.dataset.clasCreate]) delete s.errors[cs.dataset.clasCreate];
      renderCreateDrawer(); return;
    }
    const xs = event.target.closest("select[data-clas-x]"); if (xs) { const x = d.extras[Number(xs.dataset.index)]; if (xs.dataset.clasX === "tip" && x.tip !== xs.value) x.cfg = ""; x[xs.dataset.clasX] = xs.value; delete s.errors[`x${xs.dataset.index}cfg`]; renderCreateDrawer(); return; }
    const mp = event.target.closest("select[data-clas-map]"); if (mp) { d.mapare[mp.dataset.clasMap] = mp.value; return; }
    const tg = event.target.closest("[data-clas-create-toggle]"); if (tg) { d[tg.dataset.clasCreateToggle] = tg.checked; if (tg.dataset.clasCreateToggle === "criticProces" && tg.checked) d.localAdminManageable = false; renderCreateDrawer(); return; }
    const sv = event.target.closest("[data-clas-create-service]"); if (sv) { d.servicii = sv.checked ? [...d.servicii, sv.value] : d.servicii.filter((x) => x !== sv.value); if (s.errors.servicii && d.servicii.length) { delete s.errors.servicii; const f = sv.closest(".e-permits-fo-field"); f.querySelector(":scope > .message--error")?.remove(); f.querySelector(":scope > .e-permits-fo-field__hint")?.removeAttribute("hidden"); } return; }
    const sb = event.target.closest("[data-clas-subset]"); if (sb) { if (sb.checked) s.subset.add(sb.value); else s.subset.delete(sb.value); clasDrawerBody.querySelector(".e-permits-clas-subset__bar span").textContent = `${s.subset.size} din ${getClassifier(d.copiatDinId).valori.length} selectate`; return; }
    const vr = event.target.closest("[data-clas-create-values]"); if (vr) { d.valoriStart = vr.value; delete s.errors.csv; renderCreateDrawer(); return; }
    const file = event.target.closest("[data-clas-create-file]");
    if (file?.files?.[0]) {
      const fl = file.files[0]; const reader = new FileReader();
      reader.onload = () => { d.csv = { name: fl.name, text: String(reader.result || ""), parsed: clasCore.parseCsv(String(reader.result || ""), clasCreateColumns(d).map((f) => f.id)) }; delete s.errors.csv; renderCreateDrawer(); };
      reader.readAsText(fl);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !clasDrawerState || clasDrawer.hidden) return;
    if (document.querySelector("body > .e-permits-fo-select__list:not([hidden]), .date-picker-panel:not([hidden]), .modal-overlay.is-active")) return;
    event.preventDefault(); requestCloseClasDrawer();
  });

  clasModal?.addEventListener("click", (event) => {
    if (event.target.closest("[data-clas-modal-cancel]")) { closeClasModal(); return; }
    if (event.target.closest("[data-clas-field-save]")) { saveField(); return; }
    if (event.target.closest("[data-clas-import-apply]")) { applyImport(); return; }
    if (event.target.closest("[data-clas-import-template]")) {
      const c = getClassifier(clasState.id);
      const cols = clasCore.fieldsOf(c, classifiersStore.fieldTypes).map((f) => f.id);
      const blob = new Blob([`﻿${cols.join(";")}\n`], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${c.id}-model.csv`; a.click(); URL.revokeObjectURL(a.href);
    }
  });
  clasModal?.addEventListener("input", (event) => { const f = event.target.closest("[data-clas-f]"); if (f && clasModalState?.kind === "field" && f.tagName !== "SELECT") clasModalState[f.dataset.clasF] = f.value; });
  clasModal?.addEventListener("change", (event) => {
    const f = event.target.closest("select[data-clas-f]"); if (f && clasModalState?.kind === "field") { clasModalState[f.dataset.clasF] = f.value; clasModalBody.innerHTML = renderFieldModalBody(); return; }
    const file = event.target.closest("[data-clas-import-file]");
    if (file?.files?.[0]) { const fl = file.files[0]; const r = new FileReader(); r.onload = () => showImportPreview(String(r.result || ""), fl.name); r.readAsText(fl); }
  });


  const renderNtplCell = (row, key) => {
    switch (key) {
      /* the registries' ID cell: copyable code + source line (as Tarife, Servicii);
         the template's origin is the source */
      case "cod": return `
        <div class="e-permits-workplace__case-cell">
          ${renderCopyCode(row.cod, `Copiază ${row.cod}`)}
          <span class="e-permits-workplace__source"><span>Sursă:</span><span>${escapeHtml(row.sursa)}</span></span>
        </div>
      `;
      case "denumire": return `<span class="e-permits-passport__name" data-cell-tooltip="${escapeHtml(row.denumire)}">${escapeHtml(row.denumire)}</span>`;
      case "actualizat": return renderDateTime(row.actualizat, row.actualizatDe);
      case "statut": return renderTag(row.statut, row.statut === "Activ" ? "success" : "neutral");
      default: return escapeHtml(String(row[key] ?? "—"));
    }
  };

  /* ---- Șablon de notificare — profile (Feature 91332) -------------------------
     Designed around the job: write what the notification says (per language, per
     channel), see it as the recipient will, choose who gets it, publish.
       Header   standard page header; actions follow the state —
                unsaved edits: Renunță · Salvează · Publică; saved: Publică; else none.
       Conținut editor (E-mail: Subiect + Corp; Mesaj scurt: SMS / MNotify) next to a
                live Previzualizare with sample data; "Inserează câmp" = searchable
                picker that inserts at the last caret.
       Destinatari  stacked list; add / edit in a modal.
       Setări   identity fields (rarely edited) + the "Șablon activ" switch.
       Istoric  published versions as a timeline. */
  const ntplProfilePanel = document.querySelector("[data-ntpl-profile]");
  const ntplProfileTitle = document.querySelector("[data-ntpl-profile-title]");
  const ntplProfileSummary = document.querySelector("[data-ntpl-profile-summary]");
  const ntplProfileTabs = document.querySelector("[data-ntpl-profile-tabs]");
  const ntplProfileBody = document.querySelector("[data-ntpl-profile-panel]");
  const ntplProfileBackShell = document.querySelector("[data-ntpl-profile-back-shell]");
  const NTPL_TABS = [["content", "Conținut"], ["recipients", "Destinatari"], ["settings", "Setări"], ["history", "Istoric"]];
  const NTPL_DATA_SOURCES = ["Dosar", "Plată", "Act permisiv", "Notificare", "Utilizator"];
  const NTPL_PRIORITY_OPTIONS = ["Scăzută", "Normală", "Înaltă"];
  const NTPL_RECIPIENTS = ["Responsabilul dosarului", "Solicitant", "Specialist", "Supervizor", "Director", "Instituția avizatoare", "Utilizator", "Destinatari selectați"];
  const NTPL_DELIVERY = ["Email", "MNotify", "Email și MNotify", "MDelivery"];
  const NTPL_DELIVERY_CHANNELS = { Email: ["Email"], MNotify: ["MNotify"], "Email și MNotify": ["Email", "MNotify"], MDelivery: ["MDelivery"] };
  const NTPL_SMS_LIMIT = 160;
  /* placeholders by data source, with the sample value the preview shows */
  const NTPL_FIELDS = {
    Dosar: [
      ["Numărul dosarului", "CaseNumber", "D-2026-004575"], ["Denumirea serviciului", "ServiceTitle", "Autorizație sanitară de funcționare"],
      ["Tipul solicitării", "SubServiceName", "Eliberare"], ["Numele solicitantului", "ApplicantName", "Victor Grosu"],
      ["Denumirea persoanei juridice", "CompanyName", "SRL Construct Plus"], ["Autoritatea emitentă", "AuthorityName", "Agenția Națională pentru Sănătate Publică"],
      ["Subdiviziunea responsabilă", "TeamName", "CSP Chișinău"], ["Data creării dosarului", "CreatedOn", "5 iulie 2026"],
      ["Data depunerii", "SubmittedOn", "5 iulie 2026"], ["Termenul de examinare", "DueOn", "16 iulie 2026"],
      ["Suspendat până la", "SuspendedUntil", "30 iulie 2026"], ["Motivul suspendării", "SuspensionReason", "Lipsește avizul de mediu"],
      ["Motivul returnării la Specialist", "ReturnReason", "Date incomplete în cerere"], ["Tipul expertizei solicitate", "ExpertiseType", "Expertiză sanitară"],
      ["Subdiviziunea de avizare", "ExpertiseTeam", "ANSA Chișinău"], ["Termenul avizării", "ExpertiseDueOn", "20 iulie 2026"],
      ["Motivul revocării avizării", "RevokeReason", "Cerere retrasă"]
    ],
    "Plată": [["Numărul notei de plată", "PaymentNoteNumber", "MPAY-470173"], ["Suma", "Amount", "560 MDL"], ["Termenul de achitare", "PaymentDueOn", "12 iulie 2026"], ["Contul bancar", "BankAccount", "MD24AG000000022512345678"]],
    "Act permisiv": [["Numărul actului", "PermitNumber", "AUT-2026-004575"], ["Data emiterii", "IssuedOn", "18 iulie 2026"], ["Valabil până la", "ValidUntil", "18 iulie 2031"], ["Titularul", "HolderName", "SRL Construct Plus"]],
    Notificare: [["Destinatarul", "RecipientName", "Victor Grosu"], ["Mesajul", "MessageText", "Text liber"]],
    Utilizator: [["Numele utilizatorului", "UserName", "Elena Caragia"], ["Rolul", "RoleName", "Specialist"], ["Autoritatea", "AuthorityName", "Agenția Națională pentru Sănătate Publică"]]
  };
  const NTPL_SAMPLE = Object.fromEntries(Object.values(NTPL_FIELDS).flat().map(([, token, sample]) => [token, sample]));
  const ntplProfileState = { code: null, service: null, tabKey: "content", lang: "ro", mode: "visual", preview: "email", draft: null, fieldQuery: "", focusTarget: null, range: null };

  const getGlobalTemplate = (code) => globalTemplates().find((tpl) => tpl.code === code) || null;
  /* the editor serves both scopes: the global registry (page) and one service's own
     templates (full-screen sheet over the service passport, US-187) */
  const ntplScopeList = () => ntplProfileState.service ? serviceTemplates(getServiceByCode(ntplProfileState.service)) : globalTemplates();
  const ntplCurrent = () => ntplScopeList().find((tpl) => tpl.code === ntplProfileState.code) || null;
  const ntplWriteHash = (code = ntplProfileState.code) => { if (!ntplProfileState.service) writeHash(`#sablon/${encodeURIComponent(code)}/${ntplProfileState.tabKey}`); };

  const ntplDraftFrom = (tpl) => ({
    code: tpl.code, name: tpl.name, dataSource: tpl.dataSource || tpl.object || "Dosar", priority: tpl.priority || "Normală",
    description: tpl.description || "", texts: JSON.parse(JSON.stringify(tpl.texts || {})), errors: {}, dirty: false
  });

  const ntplLangComplete = (texts, lang) => Boolean((texts?.[lang]?.subject || "").trim() && plainText(texts?.[lang]?.body));

  /* the standard header; actions follow the state */
  const renderNtplProfileHeader = (tpl) => {
    const inactive = tpl.active === false;
    const dirty = Boolean(ntplProfileState.draft?.dirty);
    const lastPublished = (tpl.history || [])[0];
    const service = ntplProfileState.service ? getServiceByCode(ntplProfileState.service) : null;
    const source = service && tpl.source ? systemTemplates().find((item) => item.code === tpl.source) : null;
    ntplProfileTitle.innerHTML = renderPageHeaderTop({
      crumbs: service
        ? [{ label: "Configurări servicii", attr: "data-ntpl-crumb-back" }, { label: service.code, attr: "data-ntpl-crumb-back" }, { label: "Notificări", attr: "data-ntpl-crumb-back" }, { label: tpl.code }]
        : [{ label: "Șabloane de notificare", attr: "data-ntpl-crumb-back" }, { label: tpl.code }],
      title: tpl.name,
      actions: `
        ${dirty ? `
          <button class="btn btn-neutral btn-sm" type="button" data-ntpl-discard>Renunță</button>
          <button class="btn btn-secondary btn-sm" type="button" data-ntpl-save>Salvează</button>
        ` : ""}
        ${dirty || tpl.unpublished
          ? '<button class="btn btn-primary btn-sm" type="button" data-ntpl-publish>Publică</button>'
          /* stays in place, unavailable: the tooltip says why (aria-disabled keeps it focusable) */
          : '<button class="btn btn-primary btn-sm" type="button" aria-disabled="true" data-tooltip-reason="Nu există modificări de publicat." data-ntpl-publish>Publică</button>'}
        ${service ? `
          <span class="e-permits-ntpl-sheet__divider" aria-hidden="true"></span>
          <button class="btn btn-strict btn-sm btn-icon-only" type="button" aria-label="Închide șablonul" data-tooltip-label="Închide" data-ntpl-sheet-close>
            <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-cross-large"></use></svg>
          </button>` : ""}
      `,
      caption: !lastPublished ? "Nepublicat încă"
        : ntplIsPending(lastPublished) ? `${lastPublished.version} intră în vigoare pe ${formatLongDate(lastPublished.effectiveFrom)} · ${lastPublished.by}`
        : `Publicat ${formatStamp(lastPublished.at)} · ${lastPublished.by}`
    });
    ntplProfileSummary.innerHTML = renderPageHeaderMeta([
      ["Cod", renderProfileCopyCode(tpl.code, `Copiază ${tpl.code}`)],
      ["Versiune", escapeHtml(tpl.version || "—")],
      ["Stare", renderTag(inactive ? "Inactiv" : "Activ", inactive ? "neutral" : "success")],
      ["Obiect", escapeHtml(tpl.object || tpl.dataSource || "—")],
      service
        ? ["Sursă", source ? `Clonat din ${renderTag(source.code, "neutral")}` : "Creat în serviciu"]
        : ["Sursă", escapeHtml(tpl.origin || "Sistem")]
    ]);
    watchPageHeaderMeta(ntplProfileSummary);
    const counts = { recipients: (tpl.rules || []).length, history: (tpl.history || []).length };
    ntplProfileTabs.innerHTML = NTPL_TABS.map(([id, label]) => {
      const active = id === ntplProfileState.tabKey;
      return `
        <button class="tab-button${active ? " active" : ""}" id="ntpl-tab-${id}" type="button" role="tab" aria-selected="${active ? "true" : "false"}" tabindex="${active ? "0" : "-1"}" data-ntpl-profile-tab="${id}">
          <span>${label}</span>
          ${counts[id] ? renderPageHeaderTabCount(counts[id]) : ""}
        </button>
      `;
    }).join("");
  };

  /* library info-box, Strong · Warning, with its Close option (Figma 8230:2388);
     closed, it stays closed for this template for the session */
  const ntplBannerKey = (tpl) => `e-permits-ntpl-banner-closed:${tpl.code}`;
  const ntplBannerClosed = (tpl) => { try { return window.sessionStorage.getItem(ntplBannerKey(tpl)) === "1"; } catch { return false; } };
  const renderNtplUnpublishedBanner = (tpl) => tpl.unpublished && !ntplBannerClosed(tpl) ? `
    <div class="message message--subtle banner--warning e-permits-ntpl-banner" role="status">
      <span class="banner__icon"><svg class="icon" width="24" height="24" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-warning-filled"></use></svg></span>
      <div class="banner__content">
        <p class="banner__text">${tpl.version ? `Modificări nepublicate. Destinatarii primesc încă versiunea ${escapeHtml(tpl.version)} până la publicare.` : "Șablonul nu a fost publicat încă. Destinatarii nu primesc nimic până la publicare."}</p>
      </div>
      <button class="banner__close" type="button" aria-label="Închide mesajul" data-ntpl-banner-close>
        <span class="d-inline-flex"><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-cross-large"></use></svg></span>
      </button>
    </div>
  ` : "";

  const ntplField = (key, label, control, { required = false, span = 12, hint = "" } = {}) => `
    <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
      <label for="ntplp-${key}">${escapeHtml(label)}${required ? requiredMark() : ""}</label>
      ${control}
      ${ntplError(ntplProfileState.draft.errors[key])}
      ${hint && !ntplProfileState.draft.errors[key] ? `<p class="e-permits-fo-field__hint">${hint}</p>` : ""}
    </div>
  `;

  const ntplTextInput = (key, value, extra = "") => `
    <div class="e-permits-fo-input${ntplProfileState.draft.errors[key] ? " is-error" : ""}">
      <input id="ntplp-${key}" type="text" value="${escapeHtml(value || "")}" autocomplete="off" ${extra}>
    </div>
  `;

  const ntplSelectControl = (key, value, options, attr) => renderFoSelectControl({
    id: `ntplp-${key}`, attrs: attr,
    optionsHtml: options.map((option) => `<option value="${escapeHtml(option)}"${option === value ? " selected" : ""}>${escapeHtml(option)}</option>`).join("")
  });

  /* formatting bar for the e-mail body (contenteditable + execCommand) */
  /* [command, sprite icon (central icon system, text-editor set), label] */
  const NTPL_TOOLBAR = [
    ["bold", "text-bold", "Aldin"], ["italic", "text-italic", "Cursiv"], ["underline", "text-underline", "Subliniat"],
    "|", ["insertUnorderedList", "list-bullets", "Listă cu puncte"], ["insertOrderedList", "list-numbers", "Listă numerotată"],
    "|", ["createLink", "link", "Link"], ["insertIf", "brackets", "Bloc condiționat {{#if}}"],
    "|", ["undo", "undo", "Anulează"], ["redo", "redo", "Refă"], ["removeFormat", "eraser", "Șterge formatarea"]
  ];

  /* "Inserează câmp": searchable picker (stack-menu), inserts at the last caret */
  const renderNtplFieldItems = () => {
    const d = ntplProfileState.draft;
    const query = ntplProfileState.fieldQuery.trim().toLocaleLowerCase("ro");
    const fields = (NTPL_FIELDS[d.dataSource] || NTPL_FIELDS.Dosar).filter(([label, token]) => !query || `${label} ${token}`.toLocaleLowerCase("ro").includes(query));
    return fields.length ? fields.map(([label, token]) => `
      <li role="none">
        <button class="e-permits-fo-intent-menu__item e-permits-ntpl-picker__item" type="button" role="menuitem" data-ntplp-token="{{${escapeHtml(token)}}}">
          <span class="e-permits-ntpl-picker__label">${escapeHtml(label)}</span>
          <span class="e-permits-ntpl-picker__token">{{${escapeHtml(token)}}}</span>
        </button>
      </li>
    `).join("") : '<li role="none" class="e-permits-ntpl-picker__empty">Niciun câmp nu corespunde.</li>';
  };

  const renderNtplFieldPicker = () => `
    <div class="e-permits-stack__menu-wrap">
      <button class="btn btn-secondary btn-sm" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="ntpl-field-picker" data-stack-menu-trigger>
        <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-large"></use></svg>
        <span>Inserează câmp</span>
      </button>
      <div class="e-permits-fo-intent-menu e-permits-stack__menu e-permits-ntpl-picker" id="ntpl-field-picker" hidden data-stack-menu>
        <div class="e-permits-fo-input e-permits-fo-input--with-action e-permits-ntpl-picker__search">
          <input type="text" placeholder="Caută un câmp" aria-label="Caută un câmp" value="${escapeHtml(ntplProfileState.fieldQuery)}" data-ntplp-field-search autocomplete="off">
          <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-search"></use></svg>
        </div>
        <p class="e-permits-ntpl-picker__group">${escapeHtml(ntplProfileState.draft.dataSource)}</p>
        <ul class="e-permits-ntpl-picker__list" role="menu" aria-label="Câmpuri" data-ntplp-field-list>${renderNtplFieldItems()}</ul>
      </div>
    </div>
  `;

  /* the preview: tokens filled with sample data and marked */
  const fillNtplSample = (text, { html = false } = {}) => {
    const safe = html ? String(text || "").replace(/<\/?(script|style|iframe)[^>]*>/gi, "") : escapeHtml(text || "");
    return safe.replace(/\{\{\s*([A-Za-z]+)\s*\}\}/g, (match, token) => `<mark class="e-permits-ntpl-preview__token" title="{{${token}}}">${escapeHtml(NTPL_SAMPLE[token] || match)}</mark>`);
  };

  const renderNtplPreviewBody = () => renderNtplPreviewOf(ntplProfileState.draft.texts[ntplProfileState.lang] || {}, ntplProfileState.preview);
  /* one language's texts as e-mail or as the phone's message (also the read-only preview) */
  const renderNtplPreviewOf = (text, mode) => {
    /* Mobil: the short text as it lands in the phone's messages app (iOS Messages
       pattern): sender on top, a timestamp, one received bubble */
    if (mode === "mobile") {
      const sms = (text.plain || "").trim();
      return `
        <div class="e-permits-ntpl-preview__chat-head">
          <span class="e-permits-ntpl-preview__avatar" aria-hidden="true">eP</span>
          <span class="e-permits-ntpl-preview__sender">e-Permis</span>
        </div>
        <div class="e-permits-ntpl-preview__chat">
          <span class="e-permits-ntpl-preview__time">Mesaj text · Azi 09:41</span>
          ${sms
            ? `<div class="e-permits-ntpl-preview__sms">${fillNtplSample(sms)}</div>`
            : '<p class="e-permits-ntpl-preview__empty">Fără mesaj scurt în această limbă.</p>'}
        </div>
      `;
    }
    return `
      <div class="e-permits-ntpl-preview__mail-head">
        <span class="e-permits-ntpl-preview__from">e-Permis · noreply@e-permits.gov.md</span>
        <p class="e-permits-ntpl-preview__subject">${text.subject?.trim() ? fillNtplSample(text.subject) : '<span class="e-permits-ntpl-preview__empty">Fără subiect</span>'}</p>
      </div>
      <div class="e-permits-ntpl-preview__mail-body">${plainText(text.body) ? fillNtplSample(text.body, { html: true }) : '<p class="e-permits-ntpl-preview__empty">Corpul mesajului este gol.</p>'}</div>
    `;
  };

  const refreshNtplPreview = () => {
    const pane = ntplProfileBody.querySelector("[data-ntpl-preview]");
    if (pane) pane.innerHTML = renderNtplPreviewBody();
    const counter = ntplProfileBody.querySelector("[data-ntpl-sms-count]");
    if (counter) {
      const length = (ntplProfileState.draft.texts[ntplProfileState.lang]?.plain || "").length;
      counter.textContent = `${length}/${NTPL_SMS_LIMIT}`;
      counter.classList.toggle("is-over", length > NTPL_SMS_LIMIT);
    }
  };

  const renderNtplContent = (tpl) => {
    const d = ntplProfileState.draft;
    const lang = ntplProfileState.lang;
    const text = d.texts[lang] || (d.texts[lang] = { subject: "", body: "", plain: "" });
    const smsLength = (text.plain || "").length;

    return `
      ${renderNtplUnpublishedBanner(tpl)}
      <div class="e-permits-ntpl-content">
        <div class="e-permits-ntpl-content__main">
          <div class="e-permits-ntpl-content__bar">
            <div class="segmented-control" role="radiogroup" aria-label="Limba conținutului">
              ${NTPL_LANGS.map(([value, label]) => {
                const done = ntplLangComplete(d.texts, value);
                return `<button class="segment-item${lang === value ? " is-selected" : ""}" type="button" role="radio" aria-checked="${lang === value ? "true" : "false"}" aria-label="${label}${done ? "" : " — incomplet"}" data-ntplp-lang="${value}">${value.toUpperCase()}${done ? "" : '<span class="e-permits-ntpl-dot" aria-hidden="true"></span>'}</button>`;
              }).join("")}
            </div>
            ${renderNtplFieldPicker()}
          </div>

          <section class="e-permits-dosar-profil__section">
            <h2 class="e-permits-dosar-profil__section-title">E-mail</h2>
            <div class="e-permits-ntpl-card e-permits-ntpl-card--stack">
              ${ntplField(`subject-${lang}`, "Subiect", ntplTextInput(`subject-${lang}`, text.subject, 'data-ntplp-text="subject" data-ntpl-insert-target'), { required: lang === "ro" })}
              <div class="e-permits-fo-field">
                <div class="e-permits-ntpl-body-head">
                  <label id="ntplp-body-label">Corp${lang === "ro" ? requiredMark() : ""}</label>
                  <div class="segmented-control" role="radiogroup" aria-label="Mod de editare">
                    ${[["visual", "Vizual"], ["html", "HTML"]].map(([value, label]) => `<button class="segment-item${ntplProfileState.mode === value ? " is-selected" : ""}" type="button" role="radio" aria-checked="${ntplProfileState.mode === value ? "true" : "false"}" data-ntplp-mode="${value}">${label}</button>`).join("")}
                  </div>
                </div>
                ${ntplProfileState.mode === "visual" ? `
                <div class="e-permits-ntpl-editor${d.errors[`body-${lang}`] ? " is-error" : ""}">
                    <div class="e-permits-ntpl-editor__toolbar" role="toolbar" aria-label="Formatare">
                      ${NTPL_TOOLBAR.map((item) => item === "|"
                        ? '<span class="e-permits-ntpl-editor__sep" aria-hidden="true"></span>'
                        : `<button class="e-permits-ntpl-editor__tool" type="button" data-ntplp-cmd="${item[0]}" aria-label="${escapeHtml(item[2])}" data-tooltip-label="${escapeHtml(item[2])}"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${item[1]}"></use></svg></button>`).join("")}
                    </div>
                    <div class="e-permits-ntpl-editor__surface" contenteditable="true" role="textbox" aria-multiline="true" aria-labelledby="ntplp-body-label" data-ntplp-body data-ntpl-insert-target>${text.body || ""}</div>
                </div>` : `
                <div class="e-permits-fo-textarea e-permits-ntpl-html${d.errors[`body-${lang}`] ? " is-error" : ""}"><textarea rows="12" aria-labelledby="ntplp-body-label" data-ntplp-html data-ntpl-insert-target spellcheck="false">${escapeHtml(text.body || "")}</textarea></div>`}
                ${ntplError(d.errors[`body-${lang}`])}
              </div>
            </div>
          </section>

          <section class="e-permits-dosar-profil__section">
            <div class="e-permits-dosar-profil__section-heading">
              <h2 class="e-permits-dosar-profil__section-title">Mesaj scurt</h2>
              <span class="e-permits-dosar-profil__section-meta">SMS și MNotify — fără formatare</span>
            </div>
            <div class="e-permits-ntpl-card">
              <div class="e-permits-fo-field">
                <label for="ntplp-plain">Text</label>
                <div class="e-permits-fo-textarea"><textarea id="ntplp-plain" rows="3" data-ntplp-text="plain" data-ntpl-insert-target>${escapeHtml(text.plain || "")}</textarea></div>
                <p class="e-permits-fo-field__hint e-permits-ntpl-count"><span>Un SMS are ${NTPL_SMS_LIMIT} de caractere.</span><span class="e-permits-ntpl-count__value${smsLength > NTPL_SMS_LIMIT ? " is-over" : ""}" data-ntpl-sms-count>${smsLength}/${NTPL_SMS_LIMIT}</span></p>
              </div>
            </div>
          </section>
        </div>

        <aside class="e-permits-ntpl-content__preview" aria-labelledby="ntpl-preview-title">
          <div class="e-permits-dosar-profil__section-heading">
            <h2 class="e-permits-dosar-profil__section-title" id="ntpl-preview-title">Previzualizare</h2>
            <div class="segmented-control" role="radiogroup" aria-label="Previzualizare pe">
              ${[["email", "E-mail"], ["mobile", "Mobil"]].map(([value, label]) => `<button class="segment-item${ntplProfileState.preview === value ? " is-selected" : ""}" type="button" role="radio" aria-checked="${ntplProfileState.preview === value ? "true" : "false"}" data-ntplp-preview="${value}">${label}</button>`).join("")}
            </div>
          </div>
          <div class="e-permits-ntpl-preview" aria-live="polite" data-ntpl-preview>${renderNtplPreviewBody()}</div>
          <p class="e-permits-ntpl-preview__note">Câmpurile marcate sunt completate cu date de exemplu.</p>
        </aside>
      </div>
    `;
  };

  /* Destinatari — the stacked list, as every list in the back office */
  const renderNtplRecipients = (tpl) => {
    const rules = tpl.rules || [];
    const items = rules.map((rule, index) => ({
      plainTitle: rule.recipient,
      title: escapeHtml(rule.recipient),
      badges: [renderTag(rule.active === false ? "Inactivă" : "Activă", rule.active === false ? "neutral" : "success")],
      meta: [`Livrare: ${escapeHtml(rule.delivery || (rule.channels || []).join(", ") || "—")}`, rule.separate ? "Un mesaj pentru fiecare destinatar" : "Un mesaj comun"],
      action: { label: "Editează", attrs: `data-ntpl-rule-edit="${index}"` },
      menu: [
        { label: rule.active === false ? "Activează" : "Dezactivează", icon: rule.active === false ? "checkmark-large" : "pause", attrs: `data-ntpl-rule-toggle="${index}"` },
        /* the template needs at least one recipient — the last rule cannot be deleted */
        { label: "Șterge", icon: "delete", danger: true, attrs: rules.length === 1
          ? `data-ntpl-rule-delete="${index}" aria-disabled="true" data-tooltip-reason="Șablonul are nevoie de cel puțin un destinatar. Adaugă altă regulă înainte să o ștergi pe aceasta."`
          : `data-ntpl-rule-delete="${index}"` }
      ]
    }));
    return `
      ${renderNtplUnpublishedBanner(tpl)}
      <section class="e-permits-dosar-profil__section e-permits-stack-section">
        <div class="e-permits-dosar-profil__section-heading">
          <h2 class="e-permits-dosar-profil__section-title">Reguli de destinatari</h2>
          <button class="btn btn-secondary btn-sm" type="button" data-ntpl-rule-add>
            <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-large"></use></svg>
            <span>Adaugă regulă</span>
          </button>
        </div>
        ${items.length ? `
          <div class="e-permits-stack">
            <div class="e-permits-stack__group">
              <ul class="e-permits-stack__list" role="list">${items.map(renderStackItem).join("")}</ul>
            </div>
          </div>
        ` : renderEmptyState({ title: "Șablonul nu se trimite nimănui", text: "Nu are încă reguli de destinatari. Adaugă o regulă ca să ajungă la cineva.", icon: "user-account" })}
      </section>
    `;
  };

  /* Setări — identity (versioned, saved with the header) + the active switch (immediate) */
  const renderNtplSettings = (tpl) => {
    const d = ntplProfileState.draft;
    return `
      ${renderNtplUnpublishedBanner(tpl)}
      <section class="e-permits-dosar-profil__section">
        <h2 class="e-permits-dosar-profil__section-title">Identificare</h2>
        <div class="e-permits-ntpl-card">
          <div class="e-permits-user-create__grid">
            ${ntplField("code", "Cod", ntplTextInput("code", d.code, 'data-ntplp-field="code"'), { required: true, span: 6, hint: "Unic. Folosit de sistem pentru a declanșa notificarea." })}
            ${ntplField("name", "Denumire", ntplTextInput("name", d.name, 'data-ntplp-field="name"'), { required: true, span: 6 })}
            ${ntplField("dataSource", "Sursa de date", ntplSelectControl("dataSource", d.dataSource, NTPL_DATA_SOURCES, 'data-ntplp-select="dataSource"'), { span: 6, hint: "Determină câmpurile care pot fi inserate." })}
            ${ntplField("priority", "Prioritate", ntplSelectControl("priority", d.priority, NTPL_PRIORITY_OPTIONS, 'data-ntplp-select="priority"'), { span: 6 })}
            ${ntplField("description", "Descriere", `<div class="e-permits-fo-textarea"><textarea id="ntplp-description" rows="3" data-ntplp-field="description">${escapeHtml(d.description)}</textarea></div>`, { hint: "Pentru administratori — nu se trimite destinatarilor." })}
          </div>
        </div>
      </section>
      <section class="e-permits-dosar-profil__section">
        <h2 class="e-permits-dosar-profil__section-title">Stare</h2>
        <div class="e-permits-ntpl-card">
          ${renderToggle({ label: "Șablon activ", description: "Un șablon inactiv nu se trimite. Se aplică imediat, fără publicare.", checked: tpl.active !== false, attrs: "data-ntpl-active" })}
        </div>
      </section>
    `;
  };

  /* a version published with a future "Intră în vigoare" date is Programat until then */
  const ntplIsPending = (entry) => Boolean(entry?.effectiveFrom && entry.effectiveFrom > localIsoNow().slice(0, 10));

  const renderNtplHistory = (tpl) => {
    const history = tpl.history || [];
    const current = history.findIndex((entry) => !ntplIsPending(entry));
    return renderEventTimeline("Versiuni publicate", history.map((entry, index) => ({
      at: entry.at,
      user: entry.by,
      type: ntplIsPending(entry)
        ? `${entry.version} · programată pentru ${formatLongDate(entry.effectiveFrom)}`
        : index === current ? `${entry.version} · curentă` : entry.version,
      status: ntplIsPending(entry) ? "Programat" : "Reușit",
      detail: entry.note
    })), { meta: "Cea mai recentă primele", empty: "Șablonul nu a fost publicat încă." });
  };

  const renderNtplProfile = () => {
    const tpl = ntplCurrent();
    if (!tpl || !ntplProfilePanel) return;
    renderNtplProfileHeader(tpl);
    const views = { content: renderNtplContent, recipients: renderNtplRecipients, settings: renderNtplSettings, history: renderNtplHistory };
    ntplProfileBody.innerHTML = (views[ntplProfileState.tabKey] || renderNtplContent)(tpl);
  };

  const ntplTabFromHash = (tab) => (tab === "texts" ? "content" : NTPL_TABS.some(([id]) => id === tab) ? tab : "content");

  const openNtplProfile = (code, tab = "content") => {
    const tpl = getGlobalTemplate(code);
    if (!tpl || !ntplProfilePanel) return;
    ntplPublishedBase(tpl);
    Object.assign(ntplProfileState, { code, service: null, tabKey: ntplTabFromHash(tab), lang: "ro", mode: "visual", preview: "email", draft: ntplDraftFrom(tpl), fieldQuery: "", focusTarget: null, range: null });
    if (workplacePanel) workplacePanel.hidden = true;
    hideProfilePanels();
    if (permitsProfilePanel) permitsProfilePanel.hidden = true;
    ntplProfilePanel.hidden = false;
    if (ntplProfileBackShell) ntplProfileBackShell.hidden = false;
    shell.classList.add("is-ntpl-profile-open");
    setActiveNav("notification-templates");
    renderNtplProfile();
    writeHash(`#sablon/${encodeURIComponent(code)}/${ntplProfileState.tabKey}`);
    ntplProfilePanel.scrollIntoView?.({ block: "start" });
  };

  const hideNtplProfile = () => {
    if (ntplProfilePanel) ntplProfilePanel.hidden = true;
    if (ntplProfileBackShell) ntplProfileBackShell.hidden = true;
    shell.classList.remove("is-ntpl-profile-open");
  };

  /* a service's own template: the same editor, moved into a full-screen sheet over
     the service passport (24px clear at the top), moved back when it closes */
  const ntplSheet = document.querySelector("[data-ntpl-sheet]");
  const ntplSheetPanel = ntplSheet?.querySelector("[data-ntpl-sheet-panel]");
  const ntplProfileHome = ntplProfilePanel ? document.createComment("ntpl-profile-home") : null;
  let ntplSheetReturn = null;

  const openNtplSheet = (code, tab = "content") => {
    const service = getServiceByCode(serviceProfileState.code);
    const tpl = service && serviceTemplates(service).find((item) => item.code === code);
    if (!tpl || !ntplSheet || !ntplProfilePanel) return;
    ntplPublishedBase(tpl);
    Object.assign(ntplProfileState, { code, service: service.code, tabKey: ntplTabFromHash(tab), lang: "ro", mode: "visual", preview: "email", draft: ntplDraftFrom(tpl), fieldQuery: "", focusTarget: null, range: null });
    ntplSheetReturn = document.activeElement;
    if (!ntplProfileHome.parentNode) ntplProfilePanel.before(ntplProfileHome);
    ntplSheetPanel.append(ntplProfilePanel);
    ntplProfilePanel.hidden = false;
    ntplSheet.hidden = false;
    document.body.classList.add("is-ntpl-sheet-open");
    renderNtplProfile();
    ntplSheetPanel.scrollTop = 0;
    requestAnimationFrame(() => ntplSheetPanel.focus());
  };

  const closeNtplSheet = ({ force = false } = {}) => {
    if (!ntplSheet || ntplSheet.hidden || ntplSheet.classList.contains("is-closing")) return;
    if (!force && !confirmLeaveNtpl()) return;
    if (ntplProfileState.draft) ntplProfileState.draft.dirty = false;
    const code = ntplProfileState.code;
    closeFoSelect();
    ntplSheet.classList.add("is-closing");
    window.setTimeout(() => {
      ntplSheet.hidden = true;
      ntplSheet.classList.remove("is-closing");
      document.body.classList.remove("is-ntpl-sheet-open");
      ntplProfilePanel.hidden = true;
      ntplProfileHome.replaceWith(ntplProfilePanel);
      ntplProfileState.service = null;
      serviceProfileState.templateCode = null;
      renderServiceProfile();
      (permitsProfilePanel?.querySelector(`[data-ntpl-open="${CSS.escape(code)}"]`) || ntplSheetReturn)?.focus?.();
    }, 140);
  };

  ntplSheet?.addEventListener("click", (event) => {
    if (event.target.closest("[data-ntpl-sheet-close]") || event.target.closest(".e-permits-ntpl-sheet__scrim")) closeNtplSheet();
  });

  ntplSheet?.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || document.querySelector(".modal-overlay.is-active, body > .e-permits-fo-select__list")) return;
    if (event.target.closest?.(".e-permits-fo-select.is-open, [data-stack-menu]:not([hidden])")) return;
    event.preventDefault();
    closeNtplSheet();
  });

  /* leaving with unsaved edits asks first */
  const confirmLeaveNtpl = () => !ntplProfileState.draft?.dirty || window.confirm("Ai modificări nesalvate în acest șablon. Renunți la ele?");

  window.addEventListener("beforeunload", (event) => {
    if (ntplProfilePanel && !ntplProfilePanel.hidden && ntplProfileState.draft?.dirty) {
      event.preventDefault();
      event.returnValue = "";
    }
  });

  const closeNtplProfile = () => {
    if (ntplProfileState.service) { closeNtplSheet(); return; }
    if (!confirmLeaveNtpl()) return;
    if (ntplProfileState.draft) ntplProfileState.draft.dirty = false;
    hideNtplProfile();
    showServiceRegistry("ntpl", "Șabloane de notificare");
    restorePageHash();
  };

  /* ---- Șablon nou — the standard right drawer with the step strip ----
     Order follows the notification tools (Customer.io, HubSpot, Azure Communication
     Services): define the message first, then who gets it on which channel, then write it
     — the channels decide what must be written (e-mail: subject + body; MNotify: short
     text ≤ 160) and the data source decides which fields can be inserted.
       1 Setări       name, code (suggested from the name), data source, priority,
                      description, starting point (from scratch / copy of a template)
       2 Destinatari  recipient + channel rules (at least one, no duplicate recipient)
       3 Conținut     RO required, RU / EN optional; fields shown per channel;
                      "Inserează câmp" adds {{Token}} at the caret
       4 Revizuire    summary per step + RO preview with sample data
     Created unpublished; opens on Conținut, where the full editor and preview live. */
  const NTPL_CREATE_STEPS = ["Setări", "Destinatari", "Conținut", "Revizuire"];
  const ntplCreateDrawer = document.querySelector("[data-ntpl-create]");
  const ntplCreateBody = ntplCreateDrawer?.querySelector("[data-ntpl-create-body]");
  let ntplCreate = null;
  let ntplCreateCaret = null; /* { field, start, end } — last text position for "Inserează câmp" */
  let ntplCreateReturn = null;

  const ntplCodeFrom = (name) => clasCore.normName(name).split(/[^a-z0-9]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join("").slice(0, 40);
  const ntplHtmlToText = (html) => { const tmp = document.createElement("div"); tmp.innerHTML = String(html || "").replace(/<\/p>\s*<p>/g, "</p>\n\n<p>").replace(/<br\s*\/?>/g, "\n"); return tmp.textContent.trim(); };
  const ntplTextToHtml = (text) => String(text || "").trim().split(/\n{2,}/).map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`).join("");
  const ntplCreateChannels = (c) => [...new Set(c.values.rules.flatMap((r) => NTPL_DELIVERY_CHANNELS[r.delivery] || []))];
  const ntplErr = (key) => ntplCreate.errors[key];
  const ntplCreateField = (id, label, control, { required = false, key = "", hint = "", span = 12, counter = "" } = {}) => `
    <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
      <label for="${id}">${escapeHtml(label)}${required ? requiredMark() : ""}</label>
      ${control}
      ${key && ntplErr(key) ? clasFieldError(ntplCreate.errors, key) : ""}
      ${counter ? `<p class="e-permits-fo-field__hint e-permits-ntpl-count"><span>${hint}</span>${counter}</p>` : hint ? `<p class="e-permits-fo-field__hint"${key && ntplErr(key) ? " hidden" : ""}>${hint}</p>` : ""}
    </div>`;
  const ntplCreateInput = (id, key, value, attrs, placeholder = "") => `<div class="e-permits-fo-input${ntplErr(key) ? " is-error" : ""}"><input id="${id}" type="text" value="${escapeHtml(value || "")}" placeholder="${escapeHtml(placeholder)}" autocomplete="off" ${attrs}></div>`;
  const ntplCreateSelect = (id, value, options, attrs) => renderFoSelectControl({ id, attrs, optionsHtml: options.map(([v, l]) => `<option value="${escapeHtml(v)}"${v === value ? " selected" : ""}>${escapeHtml(l)}</option>`).join("") });

  const renderNtplCreateStep1 = (c) => {
    const d = c.values;
    const sources = globalTemplates();
    return `
      ${clasCreateSection("Identificare", `<div class="e-permits-user-create__grid">
        ${ntplCreateField("ntpl-c-name", "Denumire", ntplCreateInput("ntpl-c-name", "name", d.name, 'data-ntpl-c="name"', "Ex. Cerere suspendată — lipsă documente"), { required: true, key: "name", hint: "Cum apare în lista de șabloane." })}
        ${ntplCreateField("ntpl-c-code", "Cod", ntplCreateInput("ntpl-c-code", "code", d.code, 'data-ntpl-c="code"', "Ex. CerereSuspendata"), { required: true, key: "code", span: 6, hint: d.codeTouched ? "Litere și cifre, fără spații. Unic." : "Propus din denumire; îl poți schimba." })}
        ${ntplCreateField("ntpl-c-source", "Sursa de date", ntplCreateSelect("ntpl-c-source", d.dataSource, NTPL_DATA_SOURCES.map((x) => [x, x]), 'data-ntpl-c-select="dataSource"'), { required: true, span: 6, hint: "Determină câmpurile care pot fi inserate în text." })}
        ${clasSegmented("ntpl-priority", "Prioritate", NTPL_PRIORITY_OPTIONS.map((x) => [x, x]), d.priority, { hint: { Scăzută: "Se poate grupa cu alte notificări.", Normală: "Se trimite imediat după eveniment.", Înaltă: "Se trimite imediat și apare primul în listele destinatarului." }[d.priority] }).replaceAll("data-clas-create-choice", "data-ntpl-c-choice")}
        ${clasTextarea("ntpl-c-desc", 'data-ntpl-c="description"', d.description, { label: "Descriere", hint: "Pentru administratori — nu se trimite destinatarilor.", placeholder: "Ex. Se trimite solicitantului când specialistul suspendă dosarul." })}
      </div>`)}
      ${clasCreateSection("Punct de plecare", `<div class="e-permits-user-create__grid">
        ${clasSegmented("ntpl-start", "Pornești de la", [["zero", "Zero"], ["copy", "Copia unui șablon existent"]], d.start, { hint: d.start === "copy" ? "Se preiau sursa de date, destinatarii și textele în toate limbile. Le poți schimba în pașii următori." : "Completezi destinatarii și textele în pașii următori." }).replaceAll("data-clas-create-choice", "data-ntpl-c-choice")}
        ${d.start === "copy" ? ntplCreateField("ntpl-c-copy", "Șablon sursă", ntplCreateSelect("ntpl-c-copy", d.copyFrom, [["", "Alege șablonul"], ...sources.map((t) => [t.code, `${t.name} · ${t.code}`])], 'data-ntpl-c-select="copyFrom"'), { required: true, key: "copyFrom" }) : ""}
      </div>`)}`;
  };

  const renderNtplCreateStep2 = (c) => {
    const rules = c.values.rules;
    return clasCreateSection("Cine primește notificarea", `
      ${rules.length ? `<div class="e-permits-clas-create__cols">
        <div class="e-permits-clas-create__col-row e-permits-ntpl-create__rule e-permits-clas-create__col-head" aria-hidden="true"><span>Destinatar</span><span>Canal de livrare</span><span></span></div>
        ${rules.map((r, i) => `
          <div class="e-permits-clas-create__col-row e-permits-ntpl-create__rule">
            <div class="e-permits-fo-field">${ntplCreateSelect(`ntpl-c-r${i}-who`, r.recipient, NTPL_RECIPIENTS.map((x) => [x, x]), `data-ntpl-c-rule="recipient" data-index="${i}" aria-label="Destinatarul regulii ${i + 1}"`)}${clasFieldError(c.errors, `r${i}`)}</div>
            <div class="e-permits-fo-field">${ntplCreateSelect(`ntpl-c-r${i}-ch`, r.delivery, NTPL_DELIVERY.map((x) => [x, x]), `data-ntpl-c-rule="delivery" data-index="${i}" aria-label="Canalul regulii ${i + 1}"`)}</div>
            ${clasIconAction("delete", "Elimină destinatarul", `data-ntpl-c-rule-remove="${i}"`, rules.length === 1 ? "Șablonul are nevoie de cel puțin un destinatar." : "")}
          </div>`).join("")}
      </div>` : ""}
      ${clasFieldError(c.errors, "rules")}
      <div><button class="btn btn-secondary btn-sm" type="button" data-ntpl-c-rule-add><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-large"></use></svg><span>Adaugă destinatar</span></button></div>
      ${renderInfoNote("Canalul decide ce scrii la pasul următor: <strong>Email</strong> cere subiect și corp, <strong>MNotify</strong> cere un mesaj scurt de cel mult 160 de caractere. Mesaje separate și reguli inactive se setează din pagina șablonului.")}`);
  };

  const renderNtplCreateStep3 = (c) => {
    const d = c.values, lang = c.lang;
    const channels = ntplCreateChannels(c);
    const email = channels.includes("Email") || channels.includes("MDelivery");
    const short = channels.includes("MNotify");
    const t = d.texts[lang];
    const done = (l) => { const x = d.texts[l]; return (!email || (x.subject.trim() && x.bodyText.trim())) && (!short || x.plain.trim()); };
    const fields = NTPL_FIELDS[d.dataSource] || [];
    return `
      ${clasCreateSection("Limba", `
        <div class="segmented-control" role="radiogroup" aria-label="Limba conținutului">
          ${NTPL_LANGS.map(([v, label]) => `<button class="segment-item${lang === v ? " is-selected" : ""}" type="button" role="radio" aria-checked="${lang === v}" aria-label="${label}${done(v) ? "" : " — incomplet"}" data-ntpl-c-lang="${v}">${v.toUpperCase()}${done(v) ? "" : '<span class="e-permits-ntpl-dot" aria-hidden="true"></span>'}</button>`).join("")}
        </div>
        <p class="e-permits-fo-field__hint">Româna este obligatorie. Rusa și engleza se pot completa și după creare.</p>`)}
      ${clasCreateSection(`Text · ${NTPL_LANGS.find(([v]) => v === lang)[1]}`, `<div class="e-permits-user-create__grid">
        <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
          <label for="ntpl-c-insert">Inserează câmp</label>
          ${renderFoSelectControl({ id: "ntpl-c-insert", attrs: 'data-ntpl-c-insert', optionsHtml: [["", `Câmpuri din „${d.dataSource}”`], ...fields.map(([label, token]) => [token, `${label} · {{${token}}}`])].map(([v, l]) => `<option value="${escapeHtml(v)}">${escapeHtml(l)}</option>`).join("") })}
          <p class="e-permits-fo-field__hint">Se inserează unde ai lăsat cursorul; la trimitere se înlocuiește cu valoarea reală.</p>
        </div>
        ${email ? `
          ${ntplCreateField("ntpl-c-subject", "Subiect e-mail", ntplCreateInput("ntpl-c-subject", `subject-${lang}`, t.subject, 'data-ntpl-c-text="subject"', "Ex. Cererea {{CaseNumber}} a fost suspendată"), { required: lang === "ro", key: `subject-${lang}` })}
          <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
            <label for="ntpl-c-body">Corp e-mail${lang === "ro" ? requiredMark() : ""}</label>
            <div class="e-permits-fo-textarea${ntplErr(`body-${lang}`) ? " is-error" : ""}"><textarea id="ntpl-c-body" rows="7" placeholder="Stimate {{ApplicantName}},&#10;&#10;…" data-ntpl-c-text="bodyText">${escapeHtml(t.bodyText)}</textarea></div>
            ${clasFieldError(c.errors, `body-${lang}`)}
            <p class="e-permits-fo-field__hint">Paragrafele se despart printr-un rând gol. Formatarea (bold, liste, linkuri) se face în pagina șablonului.</p>
          </div>` : ""}
        ${short ? `
          <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
            <label for="ntpl-c-plain">Mesaj scurt (MNotify)${lang === "ro" ? requiredMark() : ""}</label>
            <div class="e-permits-fo-textarea${ntplErr(`plain-${lang}`) ? " is-error" : ""}"><textarea id="ntpl-c-plain" rows="3" maxlength="${NTPL_SMS_LIMIT}" placeholder="e-Permis: cererea {{CaseNumber}} a fost suspendată." data-ntpl-c-text="plain" data-clas-count-max="${NTPL_SMS_LIMIT}">${escapeHtml(t.plain)}</textarea></div>
            ${clasFieldError(c.errors, `plain-${lang}`)}
            <p class="e-permits-fo-field__hint e-permits-ntpl-count"><span>Fără formatare. Câmpurile se pot lungi la trimitere.</span><span class="e-permits-ntpl-count__value" data-clas-count>${t.plain.length}/${NTPL_SMS_LIMIT}</span></p>
          </div>` : ""}
      </div>`)}`;
  };

  const renderNtplCreateStep4 = (c) => {
    const d = c.values, ro = d.texts.ro;
    const channels = ntplCreateChannels(c);
    const goto = (n) => `<button class="btn btn-text-primary btn-sm" type="button" data-ntpl-c-goto="${n}">Modifică</button>`;
    const langs = NTPL_LANGS.filter(([v]) => d.texts[v].subject.trim() || d.texts[v].bodyText.trim() || d.texts[v].plain.trim()).map(([v]) => v.toUpperCase());
    return `
      ${renderPassportBlock("Setări", [
        ["Denumire", escapeHtml(d.name.trim())],
        ["Cod", escapeHtml(d.code.trim())],
        ["Sursa de date", escapeHtml(d.dataSource)],
        ["Prioritate", escapeHtml(d.priority)],
        ["Punct de plecare", d.start === "copy" ? `Copie a „${escapeHtml(getGlobalTemplate(d.copyFrom)?.name || "")}”` : "De la zero"]
      ], { actionHtml: goto(1) })}
      ${renderPassportBlock("Destinatari", d.rules.map((r) => [r.recipient, escapeHtml(r.delivery)]), { actionHtml: goto(2) })}
      ${renderPassportBlock("Conținut", [["Limbi", langs.join(" · ") || "—"], ["Canale", escapeHtml(channels.join(", "))]], { actionHtml: goto(3) })}
      ${clasCreateSection("Previzualizare · RO, cu date de exemplu", `<div class="e-permits-ntpl-card e-permits-ntpl-create__preview">
        ${ro.subject.trim() ? `<p class="e-permits-ntpl-create__subject">${fillNtplSample(ro.subject)}</p>` : ""}
        ${ro.bodyText.trim() ? `<div class="e-permits-ntpl-create__body">${fillNtplSample(ntplTextToHtml(ro.bodyText), { html: true })}</div>` : ""}
        ${ro.plain.trim() ? `<p class="e-permits-ntpl-create__plain"><strong>MNotify:</strong> ${fillNtplSample(ro.plain)}</p>` : ""}
      </div>`)}
      ${renderInfoNote("Șablonul se creează <strong>nepublicat</strong>: destinatarii nu primesc nimic până la „Publică”. Îl verifici și îl formatezi în pagina lui.")}`;
  };

  const renderNtplCreate = () => {
    const c = ntplCreate;
    ntplCreateDrawer.querySelector("[data-ntpl-create-subtitle]").textContent = ntplCreateSubtitle(c, c.values.name);
    ntplCreateDrawer.querySelector("[data-ntpl-create-steps]").innerHTML = renderStepStrip(NTPL_CREATE_STEPS, c, "data-ntpl-c-goto");
    ntplCreateBody.innerHTML = `<div class="e-permits-clas-create">${[renderNtplCreateStep1, renderNtplCreateStep2, renderNtplCreateStep3, renderNtplCreateStep4][c.step - 1](c)}</div>`;
    ntplCreateDrawer.querySelector("[data-ntpl-create-summary]").textContent = `Pasul ${c.step} din ${NTPL_CREATE_STEPS.length} · ${NTPL_CREATE_STEPS[c.step - 1]}`;
    ntplCreateDrawer.querySelector("[data-ntpl-create-buttons]").innerHTML = `
      ${c.step === 1 ? '<button class="btn btn-neutral btn-rounded" type="button" data-ntpl-c-close>Anulează</button>' : '<button class="btn btn-neutral btn-rounded" type="button" data-ntpl-c-back>Înapoi</button>'}
      ${c.step < NTPL_CREATE_STEPS.length ? '<button class="btn btn-primary btn-rounded" type="button" data-ntpl-c-next>Continuă</button>' : '<button class="btn btn-primary btn-rounded" type="button" data-ntpl-c-done>Creează șablonul</button>'}`;
  };

  /* the same wizard serves the global registry and a service's Notificări tab
     (service = that service's code: unique within it, lands in its list) */
  const openNtplCreate = ({ service = null } = {}) => {
    const emptyTexts = () => Object.fromEntries(NTPL_LANGS.map(([v]) => [v, { subject: "", bodyText: "", plain: "", body: null }]));
    ntplCreate = { service, step: 1, maxStep: 1, lang: "ro", errors: {}, dirty: false, values: { name: "", code: "", codeTouched: false, dataSource: "Dosar", priority: "Normală", description: "", start: "zero", copyFrom: "", rules: [{ recipient: "Solicitant", delivery: "Email și MNotify" }], texts: emptyTexts() } };
    ntplCreateReturn = document.activeElement;
    renderNtplCreate();
    ntplCreateDrawer.hidden = false;
    document.body.classList.add("is-user-create-open");
    requestAnimationFrame(() => ntplCreateBody.querySelector("#ntpl-c-name")?.focus());
  };
  const closeNtplCreate = () => {
    if (!ntplCreateDrawer || ntplCreateDrawer.hidden || ntplCreateDrawer.classList.contains("is-closing")) return;
    closeFoSelect();
    ntplCreateDrawer.classList.add("is-closing");
    window.setTimeout(() => { ntplCreateDrawer.hidden = true; ntplCreateDrawer.classList.remove("is-closing"); document.body.classList.remove("is-user-create-open"); ntplCreate = null; ntplCreateReturn?.focus?.(); }, 120);
  };
  const requestCloseNtplCreate = () => {
    if (ntplCreate?.dirty) { askConfirm({ title: "Renunți la șablonul nou?", text: "Datele introduse în acest formular se pierd.", confirmLabel: "Renunță", destructive: true }, () => { ntplCreate.dirty = false; closeNtplCreate(); }); return; }
    closeNtplCreate();
  };

  const ntplCreateSubtitle = (c, name) => [c.service ? `Serviciul ${c.service}` : "", name.trim() || "Șablon nou nepublicat"].filter(Boolean).join(" · ");
  const ntplCreateScope = (c) => c.service ? serviceTemplates(getServiceByCode(c.service)) : globalTemplates();
  const validateNtplCreateStep = (c, step) => {
    const d = c.values, e = {};
    if (step === 1) {
      if (!d.name.trim()) e.name = "Completează denumirea.";
      else if (ntplCreateScope(c).some((t) => clasCore.normName(t.name) === clasCore.normName(d.name))) e.name = c.service ? "Serviciul are deja un șablon cu această denumire." : "Există deja un șablon cu această denumire.";
      if (!d.code.trim()) e.code = "Completează codul.";
      else if (!/^[A-Za-z][A-Za-z0-9]*$/.test(d.code.trim())) e.code = "Doar litere și cifre, fără spații; începe cu o literă.";
      else if (ntplCreateScope(c).some((t) => t.code.toLowerCase() === d.code.trim().toLowerCase())) e.code = c.service ? "Codul există deja în acest serviciu." : "Codul există deja.";
      if (d.start === "copy" && !d.copyFrom) e.copyFrom = "Alege șablonul pe care îl copiezi.";
    }
    if (step === 2) {
      if (!d.rules.length) e.rules = "Adaugă cel puțin un destinatar.";
      const seen = new Set();
      d.rules.forEach((r, i) => { if (seen.has(r.recipient)) e[`r${i}`] = "Destinatarul apare deja."; seen.add(r.recipient); });
    }
    if (step === 3) {
      const channels = ntplCreateChannels(c);
      const email = channels.includes("Email") || channels.includes("MDelivery"), short = channels.includes("MNotify");
      const ro = d.texts.ro;
      if (email && !ro.subject.trim()) e["subject-ro"] = "Completează subiectul în română.";
      if (email && !ro.bodyText.trim()) e["body-ro"] = "Completează corpul e-mailului în română.";
      if (short && !ro.plain.trim()) e["plain-ro"] = "Completează mesajul scurt în română.";
      if (Object.keys(e).length) c.lang = "ro";
    }
    return e;
  };
  const goNtplCreateStep = (target) => {
    const c = ntplCreate;
    if (target > c.step) {
      for (let st = c.step; st < target; st += 1) {
        const e = validateNtplCreateStep(c, st);
        if (Object.keys(e).length) { c.step = st; c.errors = e; renderNtplCreate(); ntplCreateBody.querySelector(".is-error input, .is-error textarea, .e-permits-fo-field__error")?.closest(".e-permits-fo-field")?.querySelector("input, textarea, button")?.focus(); return; }
      }
    }
    c.step = target; c.maxStep = Math.max(c.maxStep, target); c.errors = {};
    renderNtplCreate();
    ntplCreateBody.scrollTop = 0;
    ntplCreateBody.querySelector("input:not([type=checkbox]), textarea, button")?.focus();
  };

  const createNtplTemplate = () => {
    const c = ntplCreate, d = c.values;
    for (let st = 1; st <= 3; st += 1) { const e = validateNtplCreateStep(c, st); if (Object.keys(e).length) { c.step = st; c.errors = e; renderNtplCreate(); return; } }
    const texts = Object.fromEntries(NTPL_LANGS.map(([v]) => { const t = d.texts[v]; return [v, { subject: t.subject.trim(), body: t.body && ntplHtmlToText(t.body) === t.bodyText.trim() ? t.body : ntplTextToHtml(t.bodyText), plain: t.plain.trim() }]; }));
    const tpl = {
      code: d.code.trim(), name: d.name.trim(), object: d.dataSource, dataSource: d.dataSource, priority: d.priority, description: d.description.trim(),
      rules: d.rules.map((r) => ({ recipient: r.recipient, delivery: r.delivery, channels: NTPL_DELIVERY_CHANNELS[r.delivery] || ["Email"], separate: false, active: true })),
      texts, version: "—", updatedAt: localIsoNow(), updatedBy: currentUserName(), origin: "Personalizat", active: true, unpublished: true, history: []
    };
    c.dirty = false;
    if (c.service) {
      const service = getServiceByCode(c.service);
      Object.assign(tpl, { origin: undefined, source: d.start === "copy" ? d.copyFrom : null, createdAt: tpl.updatedAt, createdBy: tpl.updatedBy });
      serviceTemplates(service).push(tpl);
      logServiceEvents(service.code, [{ at: tpl.createdAt, user: tpl.createdBy, type: "Creare șablon de notificare", status: "Reușit", detail: tpl.code }]);
      ntplCreateReturn = null;
      closeNtplCreate();
      renderServiceProfile();
      openTemplateDetail(tpl.code, "content");
    } else {
      servicesStore.notificationTemplates = [tpl, ...globalTemplates()];
      closeNtplCreate();
      openNtplProfile(tpl.code, "content");
    }
    showShellToast(`„${tpl.name}” este creat, nepublicat. Verifică textul și previzualizarea, apoi publică.`, "success", "Șablon creat");
  };

  document.querySelector("[data-workplace-add-ntpl]")?.addEventListener("click", () => openNtplCreate());
  ntplCreateDrawer?.addEventListener("click", (event) => {
    if (!ntplCreate) return;
    const c = ntplCreate, d = c.values;
    if (event.target.closest("[data-ntpl-c-close]")) { requestCloseNtplCreate(); return; }
    if (event.target.closest("[data-ntpl-c-next]")) { goNtplCreateStep(c.step + 1); return; }
    if (event.target.closest("[data-ntpl-c-back]")) { goNtplCreateStep(c.step - 1); return; }
    const go = event.target.closest("[data-ntpl-c-goto]"); if (go) { goNtplCreateStep(Number(go.dataset.ntplCGoto)); return; }
    if (event.target.closest("[data-ntpl-c-done]")) { createNtplTemplate(); return; }
    const ch = event.target.closest("[data-ntpl-c-choice]");
    if (ch) {
      const key = ch.dataset.ntplCChoice === "ntpl-priority" ? "priority" : "start";
      d[key] = ch.dataset.value; c.dirty = true;
      if (key === "start" && ch.dataset.value === "zero") d.copyFrom = "";
      renderNtplCreate(); ntplCreateBody.querySelector(`[data-ntpl-c-choice="${ch.dataset.ntplCChoice}"][data-value="${ch.dataset.value}"]`)?.focus(); return;
    }
    if (event.target.closest("[data-ntpl-c-rule-add]")) {
      const used = new Set(d.rules.map((r) => r.recipient));
      d.rules.push({ recipient: NTPL_RECIPIENTS.find((x) => !used.has(x)) || NTPL_RECIPIENTS[0], delivery: "Email" }); c.dirty = true; delete c.errors.rules;
      renderNtplCreate(); return;
    }
    const rm = event.target.closest("[data-ntpl-c-rule-remove]");
    if (rm && rm.getAttribute("aria-disabled") !== "true") { d.rules.splice(Number(rm.dataset.ntplCRuleRemove), 1); c.errors = {}; renderNtplCreate(); return; }
    const lg = event.target.closest("[data-ntpl-c-lang]"); if (lg) { c.lang = lg.dataset.ntplCLang; ntplCreateCaret = null; renderNtplCreate(); ntplCreateBody.querySelector(`[data-ntpl-c-lang="${c.lang}"]`)?.focus(); }
  });
  ntplCreateDrawer?.addEventListener("input", (event) => {
    if (!ntplCreate) return;
    const c = ntplCreate, d = c.values; c.dirty = true;
    clearClasFieldError(event.target, null);
    const f = event.target.closest("[data-ntpl-c]");
    if (f) {
      d[f.dataset.ntplC] = f.value;
      if (f.dataset.ntplC === "name") {
        ntplCreateDrawer.querySelector("[data-ntpl-create-subtitle]").textContent = ntplCreateSubtitle(c, f.value);
        if (!d.codeTouched) { d.code = ntplCodeFrom(f.value); const code = ntplCreateBody.querySelector("#ntpl-c-code"); if (code) code.value = d.code; }
      }
      if (f.dataset.ntplC === "code") d.codeTouched = true;
      delete c.errors[f.dataset.ntplC];
      return;
    }
    const t = event.target.closest("[data-ntpl-c-text]");
    if (t) { d.texts[c.lang][t.dataset.ntplCText] = t.value; delete c.errors[`${t.dataset.ntplCText === "bodyText" ? "body" : t.dataset.ntplCText}-${c.lang}`]; }
  });
  /* remember where the caret was, for "Inserează câmp" */
  ["keyup", "click", "focusin", "input"].forEach((type) => ntplCreateBody?.addEventListener(type, (event) => {
    const t = event.target.closest?.("[data-ntpl-c-text]");
    if (t) ntplCreateCaret = { field: t.dataset.ntplCText, start: t.selectionStart, end: t.selectionEnd };
  }));
  ntplCreateDrawer?.addEventListener("change", (event) => {
    if (!ntplCreate) return;
    const c = ntplCreate, d = c.values; c.dirty = true;
    const sel = event.target.closest("select[data-ntpl-c-select]");
    if (sel) {
      d[sel.dataset.ntplCSelect] = sel.value; delete c.errors[sel.dataset.ntplCSelect];
      if (sel.dataset.ntplCSelect === "copyFrom" && sel.value) {
        const src = getGlobalTemplate(sel.value);
        d.dataSource = src.dataSource || src.object || d.dataSource;
        d.rules = (src.rules || []).map((r) => ({ recipient: r.recipient, delivery: r.delivery || "Email" }));
        NTPL_LANGS.forEach(([v]) => { const x = src.texts?.[v] || {}; d.texts[v] = { subject: x.subject || "", body: x.body || null, bodyText: ntplHtmlToText(x.body), plain: x.plain || "" }; });
        if (!d.name.trim()) { d.name = `${src.name} (copie)`; if (!d.codeTouched) d.code = ntplCodeFrom(d.name); }
      }
      renderNtplCreate(); return;
    }
    const rule = event.target.closest("select[data-ntpl-c-rule]");
    if (rule) { d.rules[Number(rule.dataset.index)][rule.dataset.ntplCRule] = rule.value; c.errors = {}; renderNtplCreate(); return; }
    const ins = event.target.closest("select[data-ntpl-c-insert]");
    if (ins && ins.value) {
      const token = `{{${ins.value}}}`;
      const fieldKey = ntplCreateCaret?.field || (ntplCreateBody.querySelector("[data-ntpl-c-text='bodyText']") ? "bodyText" : "plain");
      const area = ntplCreateBody.querySelector(`[data-ntpl-c-text="${fieldKey}"]`);
      if (area) {
        const start = ntplCreateCaret?.field === fieldKey ? ntplCreateCaret.start : area.value.length;
        const end = ntplCreateCaret?.field === fieldKey ? ntplCreateCaret.end : area.value.length;
        area.value = `${area.value.slice(0, start)}${token}${area.value.slice(end)}`;
        d.texts[c.lang][fieldKey] = area.value;
        area.focus(); area.setSelectionRange(start + token.length, start + token.length);
        area.dispatchEvent(new Event("input", { bubbles: true }));
      }
      ins.value = "";
      const btn = ins.closest(".e-permits-fo-select")?.querySelector(".e-permits-fo-select__value"); if (btn) btn.textContent = `Câmpuri din „${d.dataSource}”`;
    }
  });
  /* Esc closes (asking first when there is data) unless a list, picker or confirm is open */
  const drawerOverlayOpen = () => Boolean(document.querySelector("body > .e-permits-fo-select__list:not([hidden]), .date-picker-panel:not([hidden]), .modal-overlay.is-active"));
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !ntplCreate || ntplCreateDrawer.hidden || drawerOverlayOpen()) return;
    event.preventDefault(); requestCloseNtplCreate();
  });

  /* read the visual / HTML body into the draft */
  const syncNtplBody = () => {
    const d = ntplProfileState.draft;
    if (!d) return;
    const text = d.texts[ntplProfileState.lang];
    const surface = ntplProfileBody.querySelector("[data-ntplp-body]");
    const html = ntplProfileBody.querySelector("[data-ntplp-html]");
    if (surface && text) text.body = surface.innerHTML.trim() === "<br>" ? "" : surface.innerHTML;
    if (html && text) text.body = html.value;
  };

  /* the first edit brings Renunță / Salvează into the header; the body is not
     re-rendered, so the caret stays */
  const markNtplDirty = () => {
    const d = ntplProfileState.draft;
    if (!d) return;
    refreshNtplPreview();
    if (d.dirty) return;
    d.dirty = true;
    renderNtplProfileHeader(ntplCurrent());
  };

  function plainText(html) {
    const probe = document.createElement("div");
    probe.innerHTML = html || "";
    return probe.textContent.trim();
  }

  const saveNtplTexts = ({ silent = false } = {}) => {
    syncNtplBody();
    const tpl = ntplCurrent();
    const d = ntplProfileState.draft;
    const errors = {};
    if (!d.code.trim()) errors.code = "Completează codul.";
    else if (ntplScopeList().some((item) => item !== tpl && item.code.toLowerCase() === d.code.trim().toLowerCase())) errors.code = ntplProfileState.service ? "Codul există deja în acest serviciu." : "Codul există deja.";
    if (!d.name.trim()) errors.name = "Completează denumirea.";
    if (!(d.texts.ro?.subject || "").trim()) errors["subject-ro"] = "Completează subiectul în română.";
    if (!plainText(d.texts.ro?.body)) errors["body-ro"] = "Completează corpul mesajului în română.";
    d.errors = errors;
    if (Object.keys(errors).length) {
      ntplProfileState.tabKey = errors.code || errors.name ? "settings" : "content";
      if (errors["subject-ro"] || errors["body-ro"]) ntplProfileState.lang = "ro";
      renderNtplProfile();
      ntplWriteHash();
      focusFormControl(ntplProfileBody.querySelector(".is-error input, .is-error textarea, .e-permits-ntpl-editor.is-error [data-ntplp-body]"));
      return false;
    }
    const oldCode = tpl.code;
    Object.assign(tpl, { code: d.code.trim(), name: d.name.trim(), dataSource: d.dataSource, object: d.dataSource, priority: d.priority, description: d.description.trim(), texts: JSON.parse(JSON.stringify(d.texts)), unpublished: true });
    d.dirty = false;
    ntplProfileState.code = tpl.code;
    if (oldCode !== tpl.code) ntplWriteHash(tpl.code);
    renderNtplProfile();
    if (!silent) showShellToast("Modificările intră în vigoare după publicare.", "success", "Salvat");
    return true;
  };

  const discardNtplTexts = () => {
    ntplProfileState.draft = ntplDraftFrom(ntplCurrent());
    renderNtplProfile();
  };

  const bumpVersion = (version) => {
    const parts = String(version || "v1.0.0").replace(/^v/, "").split(".").map(Number);
    parts[2] = (parts[2] || 0) + 1;
    return `v${parts.join(".")}`;
  };

  /* what a published version is made of; Stare (active) applies at once, so it is
     not part of it */
  const ntplSnapshot = (tpl) => JSON.parse(JSON.stringify({
    code: tpl.code, name: tpl.name, dataSource: tpl.dataSource || tpl.object || "Dosar", priority: tpl.priority || "Normală",
    description: tpl.description || "", texts: tpl.texts || {}, rules: tpl.rules || []
  }));

  /* the last published version; taken when the profile first opens if the data has none */
  const ntplPublishedBase = (tpl) => {
    if (!tpl.published) tpl.published = ntplSnapshot(tpl);
    return tpl.published;
  };

  /* the changes between the published version and the saved one, grouped by area */
  const ntplChanges = (tpl) => {
    const base = ntplPublishedBase(tpl);
    const next = ntplSnapshot(tpl);
    const rows = [];
    NTPL_LANGS.forEach(([lang, label]) => {
      const before = base.texts[lang] || {};
      const after = next.texts[lang] || {};
      const parts = [["subject", "Subiect"], ["body", "Corp"], ["plain", "Mesaj scurt"]]
        .filter(([key]) => (before[key] || "").trim() !== (after[key] || "").trim())
        .map(([, name]) => name);
      if (!parts.length) return;
      const added = !ntplLangComplete(base.texts, lang) && ntplLangComplete(next.texts, lang);
      rows.push({ area: `Conținut · ${label}`, detail: parts.join(", "), status: added ? "Adăugat" : "Modificat" });
    });
    const ruleKey = (rule) => JSON.stringify([rule.delivery || "Email", Boolean(rule.separate), rule.active !== false]);
    const byRecipient = (rules) => new Map(rules.map((rule) => [rule.recipient, rule]));
    const beforeRules = byRecipient(base.rules);
    const afterRules = byRecipient(next.rules);
    [...afterRules].filter(([who]) => !beforeRules.has(who)).forEach(([who, rule]) => rows.push({ area: `Regulă · ${who}`, detail: rule.delivery || "Email", status: "Adăugat" }));
    [...afterRules].filter(([who, rule]) => beforeRules.has(who) && ruleKey(beforeRules.get(who)) !== ruleKey(rule)).forEach(([who, rule]) => {
      const was = beforeRules.get(who);
      const parts = [];
      if ((was.delivery || "Email") !== (rule.delivery || "Email")) parts.push(`Livrare: ${was.delivery || "Email"} → ${rule.delivery || "Email"}`);
      if (Boolean(was.separate) !== Boolean(rule.separate)) parts.push(rule.separate ? "Mesaje separate" : "Mesaj comun");
      if ((was.active !== false) !== (rule.active !== false)) parts.push(rule.active !== false ? "Activată" : "Dezactivată");
      rows.push({ area: `Regulă · ${who}`, detail: parts.join(" · "), status: "Modificat" });
    });
    [...beforeRules].filter(([who]) => !afterRules.has(who)).forEach(([who, rule]) => rows.push({ area: `Regulă · ${who}`, detail: rule.delivery || "Email", status: "Eliminat" }));
    const settings = [["name", "Denumire"], ["code", "Cod"], ["dataSource", "Sursa de date"], ["priority", "Prioritate"], ["description", "Descriere"]]
      .filter(([key]) => (base[key] || "") !== (next[key] || ""))
      .map(([key, name]) => key === "description" ? name : `${name}: ${base[key] || "—"} → ${next[key] || "—"}`);
    if (settings.length) rows.push({ area: "Setări", detail: settings.join(" · "), status: "Modificat" });
    return rows;
  };

  const NTPL_NOTE_MAX = 200;
  const ntplNextDay = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    const next = new Date(y, m - 1, d + 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
  };
  const NTPL_CHANGE_TONES = { Adăugat: "success", Modificat: "info", Eliminat: "danger" };
  const ntplPublishModal = document.querySelector("#ntpl-publish-modal");
  const ntplPublishBody = ntplPublishModal?.querySelector("[data-ntpl-publish-body]");
  let ntplPublishDraft = null;

  const renderNtplPublishModal = () => {
    const tpl = ntplCurrent();
    const { note, error, changes, when, date, dateError } = ntplPublishDraft;
    const today = localIsoNow().slice(0, 10);
    const tomorrow = ntplNextDay(today);
    const [y, m, day] = date ? date.split("-") : [];
    const view = (date || tomorrow).split("-");
    const target = ntplPublishDraft.target;
    ntplPublishModal.querySelector("#ntpl-publish-title").textContent = target ? target.title : "Publică șablonul";
    const confirmBtn = ntplPublishModal.querySelector("[data-ntpl-publish-confirm]");
    if (confirmBtn) confirmBtn.textContent = target?.confirmLabel || "Publică";
    ntplPublishModal.querySelector("[data-ntpl-publish-subtitle]").textContent = target
      ? `${target.from} → ${target.to} · ${when === "scheduled" ? (date ? `intră în vigoare pe ${formatLongDate(date)}.` : "intră în vigoare la data aleasă.") : target.now}`
      : `${tpl.version || "v1.0.0"} → ${bumpVersion(tpl.version)} · ${when === "scheduled" ? (date ? `intră în vigoare pe ${formatLongDate(date)}.` : "intră în vigoare la data aleasă.") : "destinatarii primesc noua versiune imediat."}`;
    ntplPublishBody.innerHTML = `
      <div class="e-permits-case-form">
        ${target?.notice ? caseNotice(escapeHtml(target.notice)) : ""}
        <div class="e-permits-fo-field">
          <label>Ce s-a modificat</label>
          ${changes.length ? `
            <ul class="e-permits-case-form__fees" role="list">
              ${changes.map((row) => `
                <li class="e-permits-case-form__fee">
                  <span class="e-permits-case-form__fee-copy">
                    <span class="e-permits-case-form__fee-name">${escapeHtml(row.area)}</span>
                    ${row.detail ? `<span class="e-permits-case-form__fee-meta">${escapeHtml(row.detail)}</span>` : ""}
                  </span>
                  ${renderTag(row.status, NTPL_CHANGE_TONES[row.status])}
                </li>
              `).join("")}
            </ul>
          ` : '<p class="e-permits-case-form__lead">Conținutul este identic cu versiunea publicată; se publică o versiune nouă.</p>'}
        </div>
        ${target?.reschedule ? "" : `<div class="e-permits-fo-field">
          <label id="ntpl-publish-when-label">Intră în vigoare</label>
          <div class="segmented-control" role="radiogroup" aria-labelledby="ntpl-publish-when-label">
            ${[["now", "Imediat"], ["scheduled", "La o dată anume"]].map(([value, label]) => `<button class="segment-item${when === value ? " is-selected" : ""}" type="button" role="radio" aria-checked="${when === value ? "true" : "false"}" data-ntpl-publish-when="${value}">${label}</button>`).join("")}
          </div>
        </div>`}
        ${when === "scheduled" ? `
          <div class="e-permits-fo-field">
            <label for="ntpl-publish-date">Data intrării în vigoare${requiredMark()}</label>
            <div class="date-picker__field" data-date-picker data-type="default" data-locale="ro" data-selected="${escapeHtml(date)}" data-today="${today}" data-min="${tomorrow}" data-year="${Number(view[0])}" data-month="${Number(view[1]) - 1}" data-ntpl-publish-date>
              <div class="e-permits-fo-input e-permits-fo-input--with-action${dateError ? " is-error" : ""}">
                <input id="ntpl-publish-date" type="text" class="js-date-picker-input" value="${date ? `${day}/${m}/${y}` : ""}" placeholder="ZZ/LL/AAAA" autocomplete="off">
                <button type="button" class="e-permits-fo-input__icon-button js-date-picker-toggle" aria-label="Alege data" aria-controls="ntpl-publish-date-panel" aria-expanded="false">
                  <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-calendar"></use></svg>
                </button>
              </div>
              <div id="ntpl-publish-date-panel" class="date-picker-panel" aria-hidden="true" hidden>
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
            ${dateError ? `
              <span class="message message--inline message--error e-permits-fo-field__error">
                <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-error-filled"></use></svg>
                <span>${escapeHtml(dateError)}</span>
              </span>
            ` : `<p class="e-permits-fo-field__hint">${target ? escapeHtml(target.until) : "Până atunci destinatarii primesc versiunea curentă."}</p>`}
          </div>
        ` : ""}
        <div class="e-permits-fo-field">
          <label for="ntpl-publish-note">Comentariu${requiredMark()}</label>
          <div class="e-permits-fo-textarea${error ? " is-error" : ""}">
            <textarea id="ntpl-publish-note" rows="3" maxlength="${NTPL_NOTE_MAX}" placeholder="Ex. Text actualizat conform modificărilor Legii nr. 160/2011" data-ntpl-publish-note>${escapeHtml(note)}</textarea>
          </div>
          ${error ? `
            <span class="message message--inline message--error e-permits-fo-field__error">
              <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-error-filled"></use></svg>
              <span>${escapeHtml(error)}</span>
            </span>
          ` : ""}
          <p class="e-permits-fo-field__hint e-permits-ntpl-count"><span>De ce publici — apare în Istoric.</span><span class="e-permits-ntpl-count__value" data-ntpl-publish-count>${note.length}/${NTPL_NOTE_MAX}</span></p>
        </div>
      </div>
    `;
    window.GEAPDatePicker?.init(ntplPublishBody);
  };

  /* Publică saves pending edits first (silently), then asks what and why */
  const publishNtpl = () => {
    const tpl = ntplCurrent();
    if (ntplProfileState.draft?.dirty && !saveNtplTexts({ silent: true })) return;
    if (!tpl.unpublished || !ntplPublishModal) return;
    ntplPublishDraft = { note: "", error: "", changes: ntplChanges(tpl), when: "now", date: "", dateError: "" };
    renderNtplPublishModal();
    window.__modal?.open?.("#ntpl-publish-modal");
    requestAnimationFrame(() => ntplPublishBody.querySelector("[data-ntpl-publish-note]")?.focus());
  };

  const closeNtplPublishModal = () => {
    window.__modal?.close?.("#ntpl-publish-modal");
    ntplPublishDraft = null;
  };

  const confirmNtplPublish = () => {
    if (ntplPublishDraft?.target) {
      const d = ntplPublishDraft;
      const tomorrow0 = ntplNextDay(localIsoNow().slice(0, 10));
      d.error = d.note.trim() ? "" : "Scrie pe scurt ce și de ce s-a modificat.";
      d.dateError = d.when !== "scheduled" ? "" : !d.date ? "Alege data intrării în vigoare." : d.date < tomorrow0 ? "Alege o dată din viitor." : "";
      if (d.error || d.dateError) { renderNtplPublishModal(); ntplPublishBody.querySelector(d.dateError ? "#ntpl-publish-date" : "[data-ntpl-publish-note]")?.focus(); return; }
      const target = d.target;
      closeNtplPublishModal();
      target.onConfirm({ note: d.note.trim(), effectiveFrom: d.when === "scheduled" ? d.date : "", changes: d.changes });
      return;
    }
    const tpl = ntplCurrent();
    const note = ntplPublishDraft.note.trim();
    const { when, date } = ntplPublishDraft;
    const tomorrow = ntplNextDay(localIsoNow().slice(0, 10));
    ntplPublishDraft.error = note ? "" : "Scrie pe scurt ce și de ce s-a modificat.";
    ntplPublishDraft.dateError = when !== "scheduled" ? ""
      : !date ? "Alege data intrării în vigoare."
      : date < tomorrow ? "Alege o dată din viitor." : "";
    if (ntplPublishDraft.error || ntplPublishDraft.dateError) {
      renderNtplPublishModal();
      ntplPublishBody.querySelector(ntplPublishDraft.dateError ? "#ntpl-publish-date" : "[data-ntpl-publish-note]")?.focus();
      return;
    }
    const effectiveFrom = when === "scheduled" ? date : "";
    const at = localIsoNow();
    const by = currentUserName();
    const changes = ntplPublishDraft.changes.map((row) => `${row.area}${row.detail ? ` (${row.detail})` : ""}`);
    tpl.version = bumpVersion(tpl.version);
    tpl.updatedAt = at;
    tpl.updatedBy = by;
    tpl.unpublished = false;
    tpl.published = ntplSnapshot(tpl);
    tpl.history = [{ version: tpl.version, at, by, note, changes, ...(effectiveFrom ? { effectiveFrom } : {}) }, ...(tpl.history || [])];
    closeNtplPublishModal();
    renderNtplProfile();
    showShellToast(effectiveFrom
      ? `Versiunea ${tpl.version} intră în vigoare pe ${formatLongDate(effectiveFrom)}.`
      : `Destinatarii primesc de acum versiunea ${tpl.version}.`, "success", effectiveFrom ? "Publicare programată" : "Șablon publicat");
  };

  ntplPublishModal?.addEventListener("click", (event) => {
    if (event.target.closest("[data-ntpl-publish-cancel]")) { closeNtplPublishModal(); return; }
    const when = event.target.closest("[data-ntpl-publish-when]");
    if (when && ntplPublishDraft && ntplPublishDraft.when !== when.dataset.ntplPublishWhen) {
      ntplPublishDraft.when = when.dataset.ntplPublishWhen;
      ntplPublishDraft.dateError = "";
      renderNtplPublishModal();
      if (ntplPublishDraft.when === "scheduled") ntplPublishBody.querySelector("#ntpl-publish-date")?.focus();
      return;
    }
    if (event.target.closest("[data-ntpl-publish-confirm]")) confirmNtplPublish();
  });

  ntplPublishModal?.addEventListener("change", (event) => {
    const picker = event.target.closest("[data-ntpl-publish-date]");
    if (!picker || !ntplPublishDraft) return;
    ntplPublishDraft.date = picker.dataset.selected || "";
    ntplPublishDraft.dateError = "";
    renderNtplPublishModal();
  });

  ntplPublishModal?.addEventListener("input", (event) => {
    const field = event.target.closest("[data-ntpl-publish-note]");
    if (!field || !ntplPublishDraft) return;
    ntplPublishDraft.note = field.value;
    ntplPublishModal.querySelector("[data-ntpl-publish-count]").textContent = `${field.value.length}/${NTPL_NOTE_MAX}`;
    if (ntplPublishDraft.error && field.value.trim()) {
      ntplPublishDraft.error = "";
      field.closest(".e-permits-fo-textarea").classList.remove("is-error");
      ntplPublishModal.querySelector(".message--error")?.remove();
    }
  });

  /* a field token goes to the last place the user typed in */
  const insertNtplToken = (token) => {
    const target = ntplProfileState.focusTarget && ntplProfileBody.contains(ntplProfileState.focusTarget)
      ? ntplProfileState.focusTarget
      : ntplProfileBody.querySelector("[data-ntplp-body], [data-ntplp-html]");
    if (!target) return;
    if (target.matches("[data-ntplp-body]")) {
      target.focus();
      const selection = window.getSelection();
      if (ntplProfileState.range && target.contains(ntplProfileState.range.startContainer)) {
        selection.removeAllRanges();
        selection.addRange(ntplProfileState.range);
      }
      document.execCommand("insertText", false, token);
    } else {
      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? target.value.length;
      target.focus();
      target.setRangeText(token, start, end, "end");
      target.dispatchEvent(new Event("input", { bubbles: true }));
    }
    markNtplDirty();
  };

  /* ---- rule modal (add / edit) ---- */
  const ntplRuleModal = document.querySelector("#ntpl-rule-modal");
  const ntplRuleBody = ntplRuleModal?.querySelector("[data-ntpl-rule-body]");
  let ntplRuleDraft = null;

  const renderNtplRuleModal = () => {
    const r = ntplRuleDraft;
    ntplRuleModal.querySelector("[data-ntpl-rule-title]").textContent = r.index === null ? "Regulă nouă" : `Regula ${r.index + 1}`;
    const select = (key, label, options) => `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
        <label for="ntpl-rule-${key}">${escapeHtml(label)}${requiredMark()}</label>
        ${renderFoSelectControl({ id: `ntpl-rule-${key}`, attrs: `data-ntpl-rule-field="${key}"`, optionsHtml: options.map((option) => `<option value="${escapeHtml(option)}"${option === r[key] ? " selected" : ""}>${escapeHtml(option)}</option>`).join("") })}
      </div>
    `;
    const toggle = (key, label, description) => renderToggle({ label, description, checked: Boolean(r[key]), attrs: `data-ntpl-rule-switch="${key}"` });
    ntplRuleBody.innerHTML = `
      <div class="e-permits-case-form">
        <div class="e-permits-user-create__grid">
          ${select("recipient", "Destinatar", NTPL_RECIPIENTS)}
          ${select("delivery", "Livrare", NTPL_DELIVERY)}
        </div>
        ${toggle("separate", "Mesaje separate", "Fiecare destinatar primește propriul mesaj, nu un mesaj comun.")}
        ${toggle("active", "Regulă activă", "O regulă inactivă rămâne în șablon, dar nu trimite.")}
      </div>
    `;
  };

  const openNtplRuleModal = (index = null) => {
    const tpl = ntplCurrent();
    const rule = index === null ? null : tpl.rules[index];
    ntplRuleDraft = rule
      ? { index, recipient: rule.recipient, delivery: rule.delivery || "Email", separate: Boolean(rule.separate), active: rule.active !== false }
      : { index: null, recipient: "Solicitant", delivery: "Email", separate: false, active: true };
    renderNtplRuleModal();
    window.__modal?.open?.("#ntpl-rule-modal");
    requestAnimationFrame(() => ntplRuleBody.querySelector(".e-permits-fo-select__button")?.focus());
  };

  const closeNtplRuleModal = () => {
    closeFoSelect();
    window.__modal?.close?.("#ntpl-rule-modal");
    ntplRuleDraft = null;
  };

  const commitNtplRules = (tpl, message, title) => {
    tpl.unpublished = true;
    renderNtplProfile();
    showShellToast(message, "success", title);
  };

  const saveNtplRule = () => {
    const tpl = ntplCurrent();
    const r = ntplRuleDraft;
    const rule = { recipient: r.recipient, delivery: r.delivery, channels: NTPL_DELIVERY_CHANNELS[r.delivery] || ["Email"], separate: r.separate, active: r.active };
    tpl.rules = tpl.rules || [];
    if (r.index === null) tpl.rules.push(rule); else tpl.rules[r.index] = rule;
    closeNtplRuleModal();
    commitNtplRules(tpl, "Intră în vigoare după publicare.", r.index === null ? "Regulă adăugată" : "Regulă salvată");
  };

  ntplRuleModal?.addEventListener("click", (event) => {
    if (event.target.closest("[data-ntpl-rule-cancel]")) { closeNtplRuleModal(); return; }
    if (event.target.closest("[data-ntpl-rule-confirm]")) saveNtplRule();
  });

  ntplRuleModal?.addEventListener("change", (event) => {
    if (!ntplRuleDraft) return;
    const field = event.target.closest("[data-ntpl-rule-field]");
    if (field) { ntplRuleDraft[field.dataset.ntplRuleField] = field.value; return; }
    const toggle = event.target.closest("[data-ntpl-rule-switch]");
    if (toggle) ntplRuleDraft[toggle.dataset.ntplRuleSwitch] = toggle.checked;
  });

  ntplProfileBackShell?.addEventListener("click", closeNtplProfile);

  ntplProfileTitle?.addEventListener("click", (event) => {
    if (event.target.closest("[data-ntpl-crumb-back]")) { event.preventDefault(); closeNtplProfile(); return; }
    if (event.target.closest("[data-ntpl-save]")) { saveNtplTexts(); return; }
    if (event.target.closest("[data-ntpl-discard]")) { discardNtplTexts(); return; }
    const publish = event.target.closest("[data-ntpl-publish]");
    if (publish && publish.getAttribute("aria-disabled") !== "true") publishNtpl();
  });

  ntplProfileTabs?.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-ntpl-profile-tab]");
    if (!tab) return;
    syncNtplBody();
    ntplProfileState.tabKey = tab.dataset.ntplProfileTab;
    renderNtplProfile();
    ntplWriteHash();
    ntplProfileTabs.querySelector(`[data-ntpl-profile-tab="${ntplProfileState.tabKey}"]`)?.focus();
  });

  ntplProfileBody?.addEventListener("mousedown", (event) => {
    /* toolbar and picker items must not steal the editor's selection */
    if (event.target.closest("[data-ntplp-cmd], [data-ntplp-token]")) event.preventDefault();
  });

  ntplProfileBody?.addEventListener("click", (event) => {
    const tpl = ntplCurrent();
    const lang = event.target.closest("[data-ntplp-lang]");
    if (lang) { syncNtplBody(); ntplProfileState.lang = lang.dataset.ntplpLang; renderNtplProfile(); ntplProfileBody.querySelector(`[data-ntplp-lang="${ntplProfileState.lang}"]`)?.focus(); return; }
    const mode = event.target.closest("[data-ntplp-mode]");
    if (mode) { syncNtplBody(); ntplProfileState.mode = mode.dataset.ntplpMode; renderNtplProfile(); ntplProfileBody.querySelector(`[data-ntplp-mode="${ntplProfileState.mode}"]`)?.focus(); return; }
    const preview = event.target.closest("[data-ntplp-preview]");
    if (preview) {
      syncNtplBody();
      ntplProfileState.preview = preview.dataset.ntplpPreview;
      preview.parentElement.querySelectorAll("[data-ntplp-preview]").forEach((button) => {
        const on = button === preview;
        button.classList.toggle("is-selected", on);
        button.setAttribute("aria-checked", String(on));
      });
      refreshNtplPreview();
      return;
    }
    const cmd = event.target.closest("[data-ntplp-cmd]");
    if (cmd) {
      ntplProfileBody.querySelector("[data-ntplp-body]")?.focus();
      const name = cmd.dataset.ntplpCmd;
      if (name === "createLink") {
        const url = window.prompt("Adresa linkului", "https://");
        if (url) document.execCommand("createLink", false, url);
      } else if (name === "insertIf") {
        document.execCommand("insertText", false, "{{#if Câmp}}text{{/if}}");
      } else {
        document.execCommand(name, false, null);
      }
      syncNtplBody();
      markNtplDirty();
      return;
    }
    const token = event.target.closest("[data-ntplp-token]");
    if (token) {
      insertNtplToken(token.dataset.ntplpToken);
      syncNtplBody();
      refreshNtplPreview();
      closeStackMenus();
      return;
    }
    if (event.target.closest("[data-ntpl-banner-close]")) {
      try { window.sessionStorage.setItem(ntplBannerKey(tpl), "1"); } catch { /* private mode: closes until re-render */ }
      event.target.closest(".e-permits-ntpl-banner")?.remove();
      return;
    }
    if (event.target.closest("[data-ntpl-rule-add]")) { openNtplRuleModal(); return; }
    const ruleEdit = event.target.closest("[data-ntpl-rule-edit]");
    if (ruleEdit) { openNtplRuleModal(Number(ruleEdit.dataset.ntplRuleEdit)); return; }
    const ruleToggle = event.target.closest("[data-ntpl-rule-toggle]");
    if (ruleToggle) {
      const rule = tpl.rules[Number(ruleToggle.dataset.ntplRuleToggle)];
      const next = rule.active === false;
      closeStackMenus();
      askConfirm(next
        ? { title: "Activezi regula?", text: `${rule.recipient} va primi notificarea prin ${rule.delivery || "Email"}. Intră în vigoare după publicare.`, confirmLabel: "Activează" }
        : { title: "Dezactivezi regula?", text: `${rule.recipient} nu va mai primi notificarea. Regula rămâne în șablon; intră în vigoare după publicare.`, confirmLabel: "Dezactivează", destructive: true }, () => {
        rule.active = next;
        commitNtplRules(tpl, "Intră în vigoare după publicare.", rule.active ? "Regulă activată" : "Regulă dezactivată");
      });
      return;
    }
    const ruleDelete = event.target.closest("[data-ntpl-rule-delete]");
    if (ruleDelete) {
      if (ruleDelete.getAttribute("aria-disabled") === "true") return;
      const index = Number(ruleDelete.dataset.ntplRuleDelete);
      const rule = tpl.rules[index];
      closeStackMenus();
      askConfirm({ title: "Ștergi regula?", text: `${rule.recipient} nu va mai primi această notificare. Intră în vigoare după publicare.`, confirmLabel: "Șterge", destructive: true }, () => {
        tpl.rules.splice(index, 1);
        commitNtplRules(tpl, "Intră în vigoare după publicare.", "Regulă ștearsă");
      });
    }
  });

  ntplProfileBody?.addEventListener("focusin", (event) => {
    const target = event.target.closest("[data-ntpl-insert-target]");
    if (target) ntplProfileState.focusTarget = target;
  });

  /* remember the caret inside the visual editor, so a field lands where the user was */
  document.addEventListener("selectionchange", () => {
    const surface = ntplProfileBody?.querySelector("[data-ntplp-body]");
    const selection = window.getSelection();
    if (surface && selection.rangeCount && surface.contains(selection.anchorNode)) ntplProfileState.range = selection.getRangeAt(0).cloneRange();
  });

  ntplProfileBody?.addEventListener("input", (event) => {
    const d = ntplProfileState.draft;
    if (!d) return;
    const field = event.target.closest("[data-ntplp-field]");
    if (field) { d[field.dataset.ntplpField] = field.value; markNtplDirty(); return; }
    const text = event.target.closest("[data-ntplp-text]");
    if (text) { d.texts[ntplProfileState.lang][text.dataset.ntplpText] = text.value; markNtplDirty(); return; }
    if (event.target.closest("[data-ntplp-body], [data-ntplp-html]")) { syncNtplBody(); markNtplDirty(); return; }
    const search = event.target.closest("[data-ntplp-field-search]");
    if (search) {
      ntplProfileState.fieldQuery = search.value;
      const list = ntplProfileBody.querySelector("[data-ntplp-field-list]");
      if (list) list.innerHTML = renderNtplFieldItems();
    }
  });

  ntplProfileBody?.addEventListener("change", (event) => {
    const d = ntplProfileState.draft;
    const select = event.target.closest("[data-ntplp-select]");
    if (select && d) { d[select.dataset.ntplpSelect] = select.value; d.dirty = true; renderNtplProfile(); return; }
    const active = event.target.closest("[data-ntpl-active]");
    if (active) {
      const tpl = ntplCurrent();
      const next = active.checked;
      /* the switch waits for the confirmation */
      active.checked = !next;
      askConfirm(next
        ? { title: "Activezi șablonul?", text: `„${tpl.name}” se trimite din nou destinatarilor, imediat, fără publicare.`, confirmLabel: "Activează" }
        : { title: "Dezactivezi șablonul?", text: `„${tpl.name}” nu se mai trimite până la reactivare. Se aplică imediat, fără publicare.`, confirmLabel: "Dezactivează", destructive: true }, () => {
        tpl.active = next;
        active.checked = next;
        renderNtplProfileHeader(tpl);
        /* the switch and the header show the result — no toast */
      });
    }
  });

  ntplProfileBody?.addEventListener("dragstart", (event) => {
    const token = event.target.closest?.("[data-ntplp-token]");
    if (token) { event.dataTransfer.setData("text/plain", token.dataset.ntplpToken); event.dataTransfer.effectAllowed = "copy"; }
  });

  ntplProfileBody?.addEventListener("drop", (event) => {
    if (event.target.closest?.("[data-ntpl-insert-target]")) window.setTimeout(() => { syncNtplBody(); markNtplDirty(); }, 0);
  });


  const openTemplateDetail = (code, tab = "content") => openNtplSheet(code, tab);

  const ntplCodeTaken = (service, code) => serviceTemplates(service).some((item) => item.code.toLowerCase() === code.trim().toLowerCase());

  const ntplError = (message) => message ? `
    <span class="message message--inline message--error e-permits-fo-field__error">
      <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-error-filled"></use></svg>
      <span>${escapeHtml(message)}</span>
    </span>
  ` : "";

  const ntplInput = (draft, key, label, { required = true, hint = "", span = 12 } = {}) => `
    <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
      <label for="${draft.prefix}-${key}">${escapeHtml(label)}${required ? requiredMark() : ""}</label>
      <div class="e-permits-fo-input${draft.errors[key] ? " is-error" : ""}">
        <input id="${draft.prefix}-${key}" type="text" value="${escapeHtml(draft[key] || "")}" data-ntpl-field="${key}" autocomplete="off">
      </div>
      ${ntplError(draft.errors[key])}
      ${hint && !draft.errors[key] ? `<p class="e-permits-fo-field__hint">${escapeHtml(hint)}</p>` : ""}
    </div>
  `;

  const ntplSelect = (draft, key, label, options, placeholder) => `
    <div class="e-permits-fo-field e-permits-user-create__field">
      <label for="${draft.prefix}-${key}">${escapeHtml(label)}${requiredMark()}</label>
      ${renderFoSelectControl({
        id: `${draft.prefix}-${key}`, attrs: `data-ntpl-select="${key}"`,
        optionsHtml: `<option value=""${draft[key] ? "" : " selected"} disabled>${escapeHtml(placeholder)}</option>${options.map(([value, text]) => `<option value="${escapeHtml(value)}"${value === draft[key] ? " selected" : ""}>${escapeHtml(text)}</option>`).join("")}`
      }).replace('class="e-permits-fo-select"', `class="e-permits-fo-select${draft.errors[key] ? " is-error" : ""}"`)}
      ${ntplError(draft.errors[key])}
    </div>
  `;

  /* ---- Calea A — Clonare (library modal) ---- */
  /* Sumar taxe › „Arată toate” — one library modal for the three summary lists
     (Taxe, Tarife, Conturi bancare): search + scrolling list; each card shows only
     the first FEE_ACCOUNTS_VISIBLE rows */
  const feeAccountsModal = document.querySelector("#fee-accounts-modal");
  const feeAccountsState = { kind: "accounts", query: "" };
  const feeListRow = ({ name, tags = "", meta, value }) => `
    <li class="e-permits-stack__item e-permits-fee-summary__row e-permits-fee-accounts__row">
      <span class="e-permits-fee-accounts__copy">
        <span class="e-permits-fee-accounts__name">${escapeHtml(name)}${tags}</span>
        <span class="e-permits-fee-accounts__meta">${meta}</span>
      </span>
      <span class="e-permits-fee-summary__value">${value}</span>
    </li>`;
  const FEE_LISTS = {
    taxes: {
      title: "Taxe", placeholder: "Caută după tarif, cod sau tip de solicitare", label: "Caută taxă", noun: "taxe",
      items: (service) => serviceTaxes(service),
      subtitle: (service, all) => {
        const pending = unconfiguredServiceTariffs(service).length;
        return `${all.filter((tax) => tax.state === "Publicat" && tax.active).length} active · ${pending === 1 ? "1 tarif" : `${pending} tarife`} de configurat`;
      },
      text: (tax) => { const t = getTariff(tax.tariffId); return `${t?.name || ""} ${t?.code || ""} ${tax.requestType || ""} ${tax.moment || ""}`; },
      row: (tax) => {
        const status = TAX_STATUS(tax);
        return feeListRow({
          name: getTariff(tax.tariffId)?.name || tax.tariffId,
          tags: renderTag(status, TAX_STATUS_TONES[status]),
          meta: [tax.requestType, tax.moment, tax.generation].filter(Boolean).map(escapeHtml).join(" · "),
          value: escapeHtml(taxShortValue(tax))
        });
      }
    },
    tariffs: {
      title: "Tarife", placeholder: "Caută după denumire sau cod", label: "Caută tarif", noun: "tarife",
      items: (service) => serviceTariffList(service),
      subtitle: (service, all) => {
        const fromRegistry = all.filter((tariff) => tariff.source === "RSSP" || tariff.source === "eAPL").length;
        return `${fromRegistry} din RSSP / eAPL · ${all.length - fromRegistry} adăugate manual`;
      },
      text: (tariff) => `${tariff.name} ${tariff.code || ""} ${tariff.source || ""}`,
      row: (tariff) => feeListRow({
        name: tariff.name,
        tags: tariffSourceTag(tariff),
        meta: [tariff.code, tariffStatus(tariff), tariff.requestType].filter(Boolean).map(escapeHtml).join(" · "),
        value: escapeHtml(tariffShortValue(tariff))
      })
    },
    accounts: {
      title: "Conturi bancare", placeholder: "Caută după denumire, bancă sau IBAN", label: "Caută cont bancar", noun: "conturi",
      items: (service) => serviceBankAccounts(service),
      subtitle: (service, all) => `${clasNumber(all.length)} conturi active`,
      text: (a) => `${a.label} ${a.bank || ""} ${a.iban}`,
      row: (a) => feeListRow({
        name: a.label,
        tags: a.principal ? renderTag("Principal", "brand") : "",
        meta: `${escapeHtml(a.bank || "")}${a.apl ? " · APL (eAPL)" : ""}`,
        value: renderProfileCopyCode(a.iban, `Copiază IBAN ${a.iban}`)
      })
    }
  };
  const renderFeeAccountsList = () => {
    const service = getServiceByCode(serviceProfileState.code);
    const list = FEE_LISTS[feeAccountsState.kind];
    if (!feeAccountsModal || !service || !list) return;
    const all = list.items(service);
    const q = clasCore.normName(feeAccountsState.query.trim());
    const rows = q ? all.filter((item) => clasCore.normName(list.text(item)).includes(q)) : all;
    feeAccountsModal.querySelector("[data-fee-accounts-subtitle]").textContent = `${service.title || service.code} · ${list.subtitle(service, all)}`;
    feeAccountsModal.querySelector("[data-fee-accounts-count]").textContent = q ? `${clasNumber(rows.length)} din ${clasNumber(all.length)} ${list.noun}` : `${clasNumber(all.length)} ${list.noun}`;
    feeAccountsModal.querySelector("[data-fee-accounts-list]").innerHTML = rows.length
      ? rows.map(list.row).join("")
      : `<li class="e-permits-fee-accounts__empty">${renderNoResults("Niciun rezultat nu corespunde căutării", { bare: true })}</li>`;
  };
  const openFeeAccounts = (kind = "accounts") => {
    const list = FEE_LISTS[kind];
    if (!feeAccountsModal || !list) return;
    feeAccountsState.kind = kind;
    feeAccountsState.query = "";
    feeAccountsModal.querySelector("#fee-accounts-title").textContent = list.title;
    const input = feeAccountsModal.querySelector("[data-fee-accounts-search]");
    input.value = "";
    input.placeholder = list.placeholder;
    input.setAttribute("aria-label", list.label);
    input.closest(".search-input")?.classList.remove("has-value", "is-typing", "is-ready");
    renderFeeAccountsList();
    feeAccountsModal.querySelector("[data-fee-accounts-list]").scrollTop = 0;
    window.__modal?.open?.("#fee-accounts-modal");
    requestAnimationFrame(() => input.focus());
  };
  document.addEventListener("click", (event) => {
    const all = event.target.closest("[data-fee-list-all]");
    if (all) { event.preventDefault(); openFeeAccounts(all.dataset.feeListAll); return; }
    if (event.target.closest("[data-fee-accounts-close]")) window.__modal?.close?.("#fee-accounts-modal");
  });
  feeAccountsModal?.querySelector("[data-fee-accounts-search]")?.addEventListener("input", (event) => {
    feeAccountsState.query = event.target.value;
    renderFeeAccountsList();
  });

  /* Clonează — centred library modal, progressive: 1) pick the source in a dropdown,
     2) the summary of what is copied + Cod and Denumire appear (prefilled, editable) */
  const ntplCloneModal = document.querySelector("#ntpl-clone-modal");
  const ntplCloneBody = ntplCloneModal?.querySelector("[data-ntpl-clone-body]");
  let ntplClone = null;

  const ntplLangsFilled = (tpl) => NTPL_LANGS.filter(([lang]) => (tpl.texts?.[lang]?.subject || "").trim() || plainText(tpl.texts?.[lang]?.body)).map(([lang]) => lang.toUpperCase());

  const renderNtplClone = () => {
    const source = systemTemplates().find((item) => item.code === ntplClone.source);
    ntplCloneBody.innerHTML = `
      <div class="e-permits-case-form">
        <div class="e-permits-user-create__grid">
          ${ntplSelect(ntplClone, "source", "Șablonul sursă", systemTemplates().map((item) => [item.code, `${item.name} · ${item.code}`]), "Alege un șablon de sistem")}
        </div>
        ${source ? `
          ${renderPassportBlock("Ce se copiază", [
            ["Sursa de date", escapeHtml(source.dataSource || source.object || "—")],
            ["Destinatari", escapeHtml(templateRulesLabel(source))],
            ["Limbi", escapeHtml(ntplLangsFilled(source).join(" · ") || "—")]
          ])}
          <div class="e-permits-user-create__grid">
            ${ntplInput(ntplClone, "code", "Cod", { hint: "Unic în cadrul serviciului." })}
            ${ntplInput(ntplClone, "name", "Denumire")}
          </div>` : '<p class="e-permits-fo-field__hint">Se pot clona doar șabloanele de sistem. Copia nu se mai actualizează când sursa se schimbă.</p>'}
      </div>`;
  };

  const openNtplClone = () => {
    if (!ntplCloneModal || !isCentralAdmin()) return;
    ntplClone = { prefix: "ntpl-clone", source: "", code: "", name: "", errors: {} };
    renderNtplClone();
    window.__modal?.open?.("#ntpl-clone-modal");
    requestAnimationFrame(() => focusFormControl(ntplCloneBody.querySelector("[data-ntpl-select]")));
  };

  const closeNtplClone = () => {
    closeFoSelect();
    window.__modal?.close?.("#ntpl-clone-modal");
    ntplClone = null;
  };

  const saveNtplClone = () => {
    const service = getServiceByCode(serviceProfileState.code);
    if (!ntplClone || !service) return;
    const errors = {};
    if (!ntplClone.source) errors.source = "Alege șablonul sursă.";
    else {
      if (!ntplClone.code.trim()) errors.code = "Completează codul.";
      else if (ntplCodeTaken(service, ntplClone.code)) errors.code = "Codul există deja în acest serviciu.";
      if (!ntplClone.name.trim()) errors.name = "Completează denumirea.";
    }
    ntplClone.errors = errors;
    if (Object.keys(errors).length) {
      renderNtplClone();
      focusFormControl(ntplCloneBody.querySelector(".is-error input, .e-permits-fo-select.is-error .e-permits-fo-select__button") || ntplCloneBody.querySelector("[data-ntpl-select]"));
      return;
    }
    const source = systemTemplates().find((item) => item.code === ntplClone.source);
    const created = {
      code: ntplClone.code.trim(),
      name: ntplClone.name.trim(),
      dataSource: source.dataSource,
      object: source.object || source.dataSource,
      priority: source.priority,
      description: source.description,
      rules: JSON.parse(JSON.stringify(source.rules || [])),
      texts: JSON.parse(JSON.stringify(source.texts || {})),
      active: false,
      unpublished: true,
      source: source.code,
      createdAt: localIsoNow(),
      createdBy: currentUserName()
    };
    serviceTemplates(service).push(created);
    logServiceEvents(service.code, [{ at: created.createdAt, user: created.createdBy, type: "Clonare șablon de notificare", status: "Reușit", detail: `${created.code} din ${source.code}` }]);
    closeNtplClone();
    renderServiceProfile();
    openTemplateDetail(created.code, "content");
    showShellToast(`„${created.name}” a fost creat inactiv, cu textele și regulile sursei.`, "success", "Șablon clonat");
  };

  ntplCloneModal?.addEventListener("click", (event) => {
    if (event.target.closest("[data-ntpl-clone-close]")) { closeNtplClone(); return; }
    if (event.target.closest("[data-ntpl-clone-save]")) saveNtplClone();
  });

  ntplCloneModal?.addEventListener("input", (event) => {
    const field = event.target.closest("[data-ntpl-field]");
    if (field && ntplClone) ntplClone[field.dataset.ntplField] = field.value;
  });

  ntplCloneModal?.addEventListener("change", (event) => {
    const select = event.target.closest("[data-ntpl-select]");
    if (!select || !ntplClone) return;
    /* the source fills Cod and Denumire; both stay editable */
    const source = systemTemplates().find((item) => item.code === select.value);
    Object.assign(ntplClone, { source: select.value, code: source?.code || "", name: source?.name || "", errors: {} });
    renderNtplClone();
    ntplCloneBody.querySelector("#ntpl-clone-code")?.focus();
  });

  /* ---- a service template's row actions: Activează / Dezactivează · Șterge ---- */
  const toggleServiceTemplate = (code) => {
    const service = getServiceByCode(serviceProfileState.code);
    const tpl = service && serviceTemplates(service).find((item) => item.code === code);
    if (!tpl) return;
    const run = () => {
      tpl.active = tpl.active === false;
      logServiceEvents(service.code, [{ at: localIsoNow(), user: currentUserName(), type: tpl.active ? "Activare șablon de notificare" : "Dezactivare șablon de notificare", status: "Reușit", detail: tpl.code }]);
      if (ntplProfileState.service) renderNtplProfile();
      renderServiceProfile();
      showShellToast(tpl.active ? "Notificările se trimit de acum după acest șablon." : "Șablonul nu mai trimite notificări. Rămâne în serviciu.", "success", tpl.active ? "Șablon activat" : "Șablon dezactivat");
    };
    if (tpl.active === false) run();
    else askConfirm({ title: `Dezactivezi „${tpl.name}”?`, text: "Destinatarii nu mai primesc această notificare până îl activezi din nou.", confirmLabel: "Dezactivează", destructive: true }, run);
  };

  const deleteServiceTemplate = (code) => {
    const service = getServiceByCode(serviceProfileState.code);
    const list = service ? serviceTemplates(service) : [];
    const tpl = list.find((item) => item.code === code);
    if (!tpl) return;
    askConfirm({ title: `Ștergi „${tpl.name}”?`, text: "Șablonul dispare din serviciu. Notificările deja trimise rămân în istoricul dosarelor.", confirmLabel: "Șterge", destructive: true }, () => {
      list.splice(list.indexOf(tpl), 1);
      logServiceEvents(service.code, [{ at: localIsoNow(), user: currentUserName(), type: "Ștergere șablon de notificare", status: "Reușit", detail: tpl.code }]);
      if (ntplProfileState.service) closeNtplSheet({ force: true });
      renderServiceProfile();
      showShellToast(`„${tpl.name}” a fost șters din serviciu.`, "success", "Șablon șters");
    });
  };

  /* ---- Calea B — Creare nouă (right drawer) ---- */
  const ntplDrawer = document.querySelector("[data-ntpl-drawer]");
  const ntplDrawerBody = ntplDrawer?.querySelector("[data-ntpl-body]");
  let ntplDraft = null;
  let ntplReturnFocus = null;

  const renderNtplDrawer = () => {
    const d = ntplDraft;
    const lang = d.lang;
    ntplDrawer.querySelector("[data-ntpl-subtitle]").textContent = getServiceByCode(serviceProfileState.code)?.title || "";
    ntplDrawerBody.innerHTML = `
      <div class="e-permits-user-create__grid">
        ${ntplInput(d, "code", "Cod", { span: 6, hint: "Unic în cadrul serviciului." })}
        ${ntplInput(d, "name", "Denumire", { span: 6 })}
      </div>
      ${ntplSelect(d, "dataSource", "Sursa de date", NTPL_SOURCES.map((value) => [value, value]), "Alege sursa de date")}
      <div class="e-permits-fo-field">
        <label id="ntpl-priority-label">Prioritate${requiredMark()}</label>
        <div class="segmented-control" role="radiogroup" aria-labelledby="ntpl-priority-label">
          ${NTPL_PRIORITIES.map((value) => `<button class="segment-item${d.priority === value ? " is-selected" : ""}" type="button" role="radio" aria-checked="${d.priority === value ? "true" : "false"}" data-ntpl-priority="${value}">${value}</button>`).join("")}
        </div>
      </div>
      <div class="e-permits-fo-field e-permits-user-create__field">
        <label for="ntpl-description">Descriere</label>
        <div class="e-permits-fo-textarea"><textarea id="ntpl-description" rows="2" data-ntpl-field="description">${escapeHtml(d.description)}</textarea></div>
      </div>
      <div class="e-permits-fo-field">
        <label id="ntpl-lang-label">Conținut</label>
        <div class="segmented-control" role="radiogroup" aria-labelledby="ntpl-lang-label">
          ${NTPL_LANGS.map(([value]) => `<button class="segment-item${lang === value ? " is-selected" : ""}" type="button" role="radio" aria-checked="${lang === value ? "true" : "false"}" data-ntpl-lang="${value}">${value.toUpperCase()}</button>`).join("")}
        </div>
        <p class="e-permits-fo-field__hint">Opțional la creare — textele se pot completa ulterior (US-184).</p>
      </div>
      <div class="e-permits-fo-field e-permits-user-create__field">
        <label for="ntpl-subject">Obiect (${lang.toUpperCase()})</label>
        <div class="e-permits-fo-input"><input id="ntpl-subject" type="text" value="${escapeHtml(d.texts[lang].subject)}" data-ntpl-text="subject" autocomplete="off"></div>
      </div>
      <div class="e-permits-fo-field e-permits-user-create__field">
        <label for="ntpl-body">Text (${lang.toUpperCase()})</label>
        <div class="e-permits-fo-textarea"><textarea id="ntpl-body" rows="5" data-ntpl-text="body">${escapeHtml(d.texts[lang].body)}</textarea></div>
      </div>
    `;
  };

  const openNtplDrawer = () => {
    if (!ntplDrawer || !isCentralAdmin()) return;
    ntplDraft = {
      prefix: "ntpl-new", code: "", name: "", dataSource: "", priority: "Normală", description: "", lang: "ro",
      texts: { ro: { subject: "", body: "" }, ru: { subject: "", body: "" }, en: { subject: "", body: "" } },
      errors: {}
    };
    ntplReturnFocus = document.activeElement;
    renderNtplDrawer();
    ntplDrawer.hidden = false;
    document.body.classList.add("is-user-create-open");
    requestAnimationFrame(() => ntplDrawerBody.querySelector("#ntpl-new-code")?.focus());
  };

  const closeNtplDrawer = () => {
    if (!ntplDrawer || ntplDrawer.hidden || ntplDrawer.classList.contains("is-closing")) return;
    closeFoSelect();
    ntplDrawer.classList.add("is-closing");
    window.setTimeout(() => {
      ntplDrawer.hidden = true;
      ntplDrawer.classList.remove("is-closing");
      document.body.classList.remove("is-user-create-open");
      ntplDraft = null;
      ntplReturnFocus?.focus?.();
    }, 120);
  };

  const saveNtplDraft = () => {
    const service = getServiceByCode(serviceProfileState.code);
    if (!ntplDraft || !service) return;
    const d = ntplDraft;
    const errors = {};
    if (!d.code.trim()) errors.code = "Completează codul.";
    else if (ntplCodeTaken(service, d.code)) errors.code = "Codul există deja în acest serviciu.";
    if (!d.name.trim()) errors.name = "Completează denumirea.";
    if (!d.dataSource) errors.dataSource = "Alege sursa de date.";
    d.errors = errors;
    if (Object.keys(errors).length) {
      renderNtplDrawer();
      focusFormControl(ntplDrawerBody.querySelector(".is-error input, .e-permits-fo-select.is-error .e-permits-fo-select__button") || ntplDrawerBody.querySelector("[data-ntpl-select]"));
      return;
    }
    const created = {
      code: d.code.trim(), name: d.name.trim(), dataSource: d.dataSource, priority: d.priority, description: d.description.trim(),
      rules: [], texts: JSON.parse(JSON.stringify(d.texts)), active: false, source: null, createdAt: localIsoNow(), createdBy: currentUserName()
    };
    serviceTemplates(service).push(created);
    logServiceEvents(service.code, [{ at: created.createdAt, user: created.createdBy, type: "Creare șablon de notificare", status: "Reușit", detail: created.code }]);
    ntplReturnFocus = null;
    closeNtplDrawer();
    openTemplateDetail(created.code, "texts");
    showShellToast(`„${created.name}” a fost creat inactiv, fără reguli de destinatari.`, "success", "Șablon creat");
  };

  ntplDrawer?.addEventListener("click", (event) => {
    if (event.target.closest("[data-ntpl-close]")) { closeNtplDrawer(); return; }
    if (event.target.closest("[data-ntpl-save]")) { saveNtplDraft(); return; }
    const priority = event.target.closest("[data-ntpl-priority]");
    if (priority && ntplDraft) { ntplDraft.priority = priority.dataset.ntplPriority; renderNtplDrawer(); ntplDrawerBody.querySelector(`[data-ntpl-priority="${ntplDraft.priority}"]`)?.focus(); return; }
    const lang = event.target.closest("[data-ntpl-lang]");
    if (lang && ntplDraft) { ntplDraft.lang = lang.dataset.ntplLang; renderNtplDrawer(); ntplDrawerBody.querySelector(`[data-ntpl-lang="${ntplDraft.lang}"]`)?.focus(); }
  });

  ntplDrawer?.addEventListener("input", (event) => {
    if (!ntplDraft) return;
    const field = event.target.closest("[data-ntpl-field]");
    if (field) { ntplDraft[field.dataset.ntplField] = field.value; return; }
    const text = event.target.closest("[data-ntpl-text]");
    if (text) ntplDraft.texts[ntplDraft.lang][text.dataset.ntplText] = text.value;
  });

  ntplDrawer?.addEventListener("change", (event) => {
    const select = event.target.closest("[data-ntpl-select]");
    if (select && ntplDraft) { ntplDraft[select.dataset.ntplSelect] = select.value; delete ntplDraft.errors[select.dataset.ntplSelect]; }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && ntplDrawer && !ntplDrawer.hidden && !document.querySelector("body > .e-permits-fo-select__list")) closeNtplDrawer();
  });

  const renderServiceTabBody = (service, tabId) => {
    switch (tabId) {
      case "general": return renderServiceGeneral(service);
      case "request-types": return renderServiceRequestTypes(service);
      case "forms": return renderServiceForms(service);
      case "documents": return renderServiceDocuments(service);
      case "fees": return renderServiceFees(service);
      case "notifications": return renderServiceNotifications(service);
      default: return renderServiceSimpleTab(service, tabId);
    }
  };

  /* ---- Servicii › publicare: like the template / classifier profiles. Every change
     logged since the last publication is pending; "Publică" asks what changed (from the
     log), a comment and when it takes effect, then raises the version. ---- */
  const SERVICE_EVENT_SILENT = /^(Sincronizare|Publicare serviciu)/;
  const servicePublication = (service) => {
    const g = service.geap;
    if (!g.publishedAt) {
      g.publishedAt = (g.events || []).map((e) => e.at).filter(Boolean).sort().pop() || service.lastSync || localIsoNow();
      g.publications = g.publications || [{ version: g.version, at: g.publishedAt, by: (g.events || [])[0]?.user || "—", note: "Versiunea în vigoare." }];
    }
    return g;
  };
  /* a publication with a future „Intră în vigoare” date is Programat; until then the
     previous one stays in force (header Versiune, Istoric „curentă”) */
  const servicePublicationPending = (h) => Boolean(h?.effectiveFrom && h.effectiveFrom > localIsoNow().slice(0, 10));
  const serviceScheduled = (g) => (servicePublicationPending((g.publications || [])[0]) ? g.publications[0] : null);
  const serviceScheduledRows = (h) => h.rows || (h.changes || []).map((c) => ({ area: c, detail: "", status: "Modificat" }));
  const serviceVersionInForce = (g) => (g.publications || []).find((h) => !servicePublicationPending(h))?.version || g.version;
  const servicePendingChanges = (service) => {
    const g = servicePublication(service);
    return (g.events || []).filter((e) => e.at > g.publishedAt && !SERVICE_EVENT_SILENT.test(e.type || "")).map((e) => ({
      area: e.type, detail: e.detail || "", at: e.at, user: e.user || "",
      status: /^(Creare|Atașare|Import|Clonare|Adăugare)/.test(e.type) ? "Adăugat" : /^(Ștergere|Detașare|Eliminare)/.test(e.type) ? "Eliminat" : "Modificat"
    }));
  };
  /* „N modificări nepublicate” in a page header opens this list (feedback 2026-10-07):
     every pending change grouped Adăugat / Modificat / Eliminat, with who and when;
     the footer's Publică continues to the publication modal */
  const pendingChangesModal = document.querySelector("#pending-changes-modal");
  let pendingChangesPublish = null;
  const PENDING_TONES = { "Adăugat": "success", "Modificat": "brand", "Eliminat": "danger" };
  const openPendingChanges = ({ subject, changes, publishLabel = "Publică", onPublish }) => {
    if (!pendingChangesModal) return;
    pendingChangesPublish = onPublish;
    pendingChangesModal.querySelector("[data-pending-changes-subtitle]").textContent = `${subject} · ${changes.length === 1 ? "1 modificare" : `${changes.length} modificări`} · intră în vigoare după publicare`;
    pendingChangesModal.querySelector("[data-pending-changes-body]").innerHTML = changes.length ? groupBy(changes, (c) => c.status, ["Adăugat", "Modificat", "Eliminat"]).map((group) => `
      <div class="e-permits-stack">
        <div class="e-permits-stack__group">
          <h3 class="e-permits-stack__group-label">${escapeHtml(group.label)}<span class="badge badge--lg badge--solid-light e-permits-stack__group-count">${group.items.length}</span></h3>
          <ul class="e-permits-stack__list" role="list">${group.items.map((c) => renderStackItem({
            plainTitle: c.area,
            title: escapeHtml(c.area),
            badges: [renderTag(c.status, PENDING_TONES[c.status] || "neutral")],
            meta: [c.detail ? escapeHtml(c.detail) : "", c.at ? `${escapeHtml(formatStamp(c.at))}${c.user ? ` · ${escapeHtml(c.user)}` : ""}` : ""].filter(Boolean)
          })).join("")}</ul>
        </div>
      </div>`).join("") : renderEmptyState({ title: "Nu există modificări nepublicate", text: "Versiunea publicată este la zi.", icon: "checkmark-large", compact: true });
    const publish = pendingChangesModal.querySelector("[data-pending-changes-publish]");
    publish.textContent = publishLabel;
    publish.hidden = !onPublish || !changes.length;
    window.__modal?.open?.("#pending-changes-modal");
  };
  pendingChangesModal?.addEventListener("click", (event) => {
    if (!event.target.closest("[data-pending-changes-publish]")) return;
    const next = pendingChangesPublish;
    window.__modal?.close?.("#pending-changes-modal");
    window.setTimeout(() => next?.(), 160);
  });
  const openServicePendingChanges = () => {
    const service = getServiceByCode(serviceProfileState.code);
    if (!service) return;
    openPendingChanges({ subject: `${service.title} · față de ${servicePublication(service).version}`, changes: servicePendingChanges(service), onPublish: isCentralAdmin() ? openServicePublish : null });
  };

  /* a scheduled version (one at a time): reschedule, publish now or cancel — the last two
     confirm first; cancelling sends its changes back to „nepublicate” */
  const handleServiceSchedule = (action) => {
    const service = getServiceByCode(serviceProfileState.code);
    const g = service && servicePublication(service);
    const sch = g && serviceScheduled(g);
    if (!sch) return;
    const by = currentUserName();
    const when = formatLongDate(sch.effectiveFrom);
    if (action === "reschedule") {
      ntplPublishDraft = {
        note: sch.note || "", error: "", changes: serviceScheduledRows(sch), when: "scheduled", date: sch.effectiveFrom, dateError: "",
        target: {
          title: "Reprogramează publicarea", from: serviceVersionInForce(g), to: sch.version, reschedule: true, confirmLabel: "Reprogramează",
          now: "", until: "Până atunci rămâne în vigoare versiunea curentă.",
          onConfirm: ({ note, effectiveFrom }) => {
            const at = localIsoNow();
            logServiceEvents(service.code, [{ at, user: by, type: "Publicare serviciu — reprogramată", status: "Programat", detail: `${sch.version} · din ${formatLongDate(effectiveFrom)} (în loc de ${when})` }]);
            Object.assign(sch, { effectiveFrom, note });
            renderServiceProfile();
            showShellToast(`Versiunea ${sch.version} intră în vigoare pe ${formatLongDate(effectiveFrom)}.`, "success", "Publicare reprogramată");
          }
        }
      };
      renderNtplPublishModal();
      window.__modal?.open?.("#ntpl-publish-modal");
      return;
    }
    if (action === "now") {
      askConfirm({ title: `Publici acum ${sch.version}?`, text: `Versiunea intră în vigoare imediat, nu pe ${when}. Solicitările noi o folosesc de acum.`, confirmLabel: "Publică acum" }, () => {
        const at = localIsoNow();
        delete sch.effectiveFrom;
        sch.at = at;
        logServiceEvents(service.code, [{ at, user: by, type: "Publicare serviciu — imediat", status: "Reușit", detail: `${sch.version} · programarea din ${when} a fost înlocuită` }]);
        renderServiceProfile();
        showShellToast(`Versiunea ${sch.version} este în vigoare. Solicitările noi o folosesc.`, "success", "Serviciu publicat");
      });
      return;
    }
    if (action === "cancel") {
      askConfirm({ title: `Anulezi programarea ${sch.version}?`, text: `Versiunea nu mai intră în vigoare pe ${when}. Modificările ei revin la „nepublicate” și le poți publica din nou.`, confirmLabel: "Anulează programarea", cancelLabel: "Păstrează programarea", destructive: true }, () => {
        const prev = (g.publications || [])[1];
        g.publications = g.publications.slice(1);
        g.version = prev?.version || g.version;
        g.publishedAt = prev?.at || g.publishedAt;
        logServiceEvents(service.code, [{ at: localIsoNow(), user: by, type: "Publicare serviciu — programare anulată", status: "Anulat", detail: `${sch.version} nu mai intră în vigoare pe ${when}` }]);
        renderServiceProfile();
        showShellToast(`Programarea versiunii ${sch.version} a fost anulată. Modificările sunt din nou nepublicate.`, "success", "Programare anulată");
      });
    }
  };

  const openServicePublish = () => {
    const service = getServiceByCode(serviceProfileState.code);
    if (!service || !ntplPublishModal) return;
    const g = servicePublication(service);
    const scheduled = serviceScheduled(g);
    const changes = [...(scheduled ? serviceScheduledRows(scheduled) : []), ...servicePendingChanges(service)];
    if (!changes.length) return;
    const from = serviceVersionInForce(g);
    const to = scheduled ? scheduled.version : bumpVersion(g.version);
    ntplPublishDraft = {
      note: "", error: "", changes, when: "now", date: "", dateError: "",
      target: {
        title: "Publică serviciul", from, to,
        notice: scheduled ? `Înlocuiește publicarea programată pentru ${formatLongDate(scheduled.effectiveFrom)}.` : "",
        now: "solicitările noi folosesc configurarea nouă imediat.",
        until: "Până atunci rămâne în vigoare versiunea curentă.",
        onConfirm: ({ note, effectiveFrom, changes: rows }) => {
          const at = localIsoNow(), by = currentUserName();
          g.version = to;
          const rest = (g.publications || []).filter((h) => h !== scheduled);
          g.publications = [{ version: to, at, by, note, rows, changes: rows.map((r) => `${r.area}${r.detail ? ` (${r.detail})` : ""}`), ...(effectiveFrom ? { effectiveFrom } : {}) }, ...rest];
          logServiceEvents(service.code, [{ at, user: by, type: "Publicare serviciu", status: effectiveFrom ? "Programat" : "Reușit", detail: `${to}${effectiveFrom ? ` · din ${formatLongDate(effectiveFrom)}` : ""} · ${note}` }]);
          g.publishedAt = at;
          renderServiceProfile();
          showShellToast(effectiveFrom ? `Versiunea ${to} intră în vigoare pe ${formatLongDate(effectiveFrom)}.` : `Versiunea ${to} este în vigoare. Solicitările noi o folosesc.`, "success", effectiveFrom ? "Publicare programată" : "Serviciu publicat");
        }
      }
    };
    renderNtplPublishModal();
    window.__modal?.open?.("#ntpl-publish-modal");
    requestAnimationFrame(() => ntplPublishBody.querySelector("[data-ntpl-publish-note]")?.focus());
  };
  const openServiceHistory = () => {
    const service = getServiceByCode(serviceProfileState.code);
    const modal = document.querySelector("#dtpl-history-modal");
    if (!service || !modal) return;
    const g = servicePublication(service);
    modal.querySelector("#dtpl-history-title").textContent = "Istoric versiuni";
    modal.querySelector("[data-dtpl-history-subtitle]").textContent = `${service.title} · ${service.code}`;
    const inForce = serviceVersionInForce(g);
    modal.querySelector("[data-dtpl-history-body]").innerHTML = renderEventTimeline("Versiuni publicate", (g.publications || []).map((h) => ({
      at: h.at, user: h.by,
      type: servicePublicationPending(h) ? `${h.version} · programată pentru ${formatLongDate(h.effectiveFrom)}` : h.version === inForce ? `${h.version} · curentă` : h.version,
      status: servicePublicationPending(h) ? "Programat" : "Reușit",
      detail: [h.note, ...(h.changes || [])].filter(Boolean).join(" · ")
    })), { meta: "Cea mai recentă primele" });
    window.__modal?.open?.("#dtpl-history-modal");
  };
  /* the header's publication actions; refreshed whenever the log changes */
  const renderServicePublishActions = (service) => {
    if (!isCentralAdmin()) return "";
    const pending = servicePendingChanges(service).length;
    const scheduled = serviceScheduled(servicePublication(service));
    const scheduledHtml = scheduled ? `
      <div class="e-permits-stack__menu-wrap">
        <button class="btn btn-secondary btn-sm" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="service-schedule-menu" data-stack-menu-trigger data-tooltip-label="${escapeHtml(`${scheduled.version} intră în vigoare pe ${formatLongDate(scheduled.effectiveFrom)}`)}">
          <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-clock"></use></svg>
          <span>Programat · ${escapeHtml(formatDate(scheduled.effectiveFrom))}</span>
        </button>
        <ul class="e-permits-fo-intent-menu e-permits-stack__menu" id="service-schedule-menu" role="menu" aria-label="Publicare programată" hidden data-stack-menu>
          ${[["calendar-edit", "Reprogramează", "reschedule", false], ["cloud-upload", "Publică acum", "now", false], ["calendar-remove", "Anulează programarea", "cancel", true]].map(([icon, label, action, danger]) => `
            <li role="none">
              <button class="e-permits-fo-intent-menu__item${danger ? " is-danger" : ""}" type="button" role="menuitem" data-service-schedule="${action}">
                <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${icon}"></use></svg>
                <span>${label}</span>
              </button>
            </li>
          `).join("")}
        </ul>
      </div>` : "";
    return `
      <button class="btn btn-neutral btn-sm" type="button" data-service-history>
        <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-history"></use></svg>
        <span>Istoric versiuni</span>
      </button>
      ${scheduledHtml}
      ${scheduled && !pending ? "" : pending
        ? '<button class="btn btn-primary btn-sm" type="button" data-service-publish>Publică</button>'
        : '<button class="btn btn-primary btn-sm" type="button" aria-disabled="true" data-tooltip-reason="Nu există modificări de publicat." data-service-publish>Publică</button>'}`;
  };

  const renderServiceProfile = () => {
    const service = getServiceByCode(serviceProfileState.code);

    if (!service || !permitsProfilePanel) {
      return;
    }

    const authority = getAuthorityById(service.authorityId);
    const canSync = isCentralAdmin();
    const header = permitsProfilePanel.querySelector("[data-passport-header]");
    const top = permitsProfilePanel.querySelector("[data-passport-top]");
    const meta = permitsProfilePanel.querySelector("[data-passport-meta]");
    const tabs = permitsProfilePanel.querySelector("[data-passport-tabs]");
    const body = permitsProfilePanel.querySelector("[data-passport-body]");

    top.innerHTML = renderPageHeaderTop({
      crumbs: [
        { label: servicesRegistryLabel, attr: "data-passport-crumb-back" },
        { label: service.code }
      ],
      title: service.title,
      /* Figma button-filled-rectangular Neutral · Small · Leading icon. One source: it
         resyncs; RSSP + eAPL: the same button opens the sources menu (stack-menu) */
      actions: canSync ? ((service.syncSources || ["RSSP"]).length > 1 ? `
        <div class="e-permits-stack__menu-wrap">
          <button class="btn btn-neutral btn-sm" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="passport-sync-menu" data-stack-menu-trigger>
            <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-rotate-arrow"></use></svg>
            <span>Sincronizează</span>
          </button>
          <ul class="e-permits-fo-intent-menu e-permits-stack__menu" id="passport-sync-menu" role="menu" aria-label="Sursa sincronizării" hidden data-stack-menu>
            ${[["RSSP", "Sincronizează din RSSP"], ["eAPL", "Sincronizează din eAPL"], ["both", "Sincronizează din RSSP și eAPL"]].map(([source, label]) => `
              <li role="none">
                <button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" data-sync-open="${escapeHtml(service.code)}" data-sync-source="${source}">
                  <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-rotate-arrow"></use></svg>
                  <span>${label}</span>
                </button>
              </li>
            `).join("")}
          </ul>
        </div>
      ` : `
        <button class="btn btn-neutral btn-sm" type="button" data-passport-resync>
          <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-rotate-arrow"></use></svg>
          <span>Sincronizează</span>
        </button>
      `) + renderServicePublishActions(service) : "",
      /* pending changes lead the caption as a warning status (dot + text), not a tag */
      status: (() => { const n = servicePendingChanges(service).length; return canSync && n ? renderHeaderStatus(n === 1 ? "1 modificare nepublicată" : `${n} modificări nepublicate`, "warning", 'data-service-pending aria-haspopup="dialog" title="Vezi modificările"') : ""; })(),
      caption: (() => { const n = servicePendingChanges(service).length; const g = servicePublication(service); const next = (g.publications || [])[0]; return `${n ? `față de ${g.version}` : servicePublicationPending(next) ? `${next.version} intră în vigoare pe ${formatLongDate(next.effectiveFrom)}` : `Publicat ${formatStamp(g.publishedAt)}`} · sincronizat ${formatStamp(service.lastSync)}`; })()
    });
    meta.innerHTML = renderPageHeaderMeta([
      ["ID", renderProfileCopyCode(service.code, `Copiază ${service.code}`)],
      ["Autoritate", escapeHtml(authority?.name || "—")],
      ["Versiune", escapeHtml(serviceVersionInForce(servicePublication(service)))],
      ["Statut", renderTag(service.status, SERVICE_STATUS_TONES[service.status] || "neutral")]
    ]);
    watchPageHeaderMeta(meta);
    tabs.innerHTML = SERVICE_PROFILE_TABS.map((tab) => {
      const active = tab.id === serviceProfileState.tabKey;
      const count = tab.count ? tab.count(service) : null;
      /* count badge: grey = all good; yellow = something blocks the service (a request
         type without a flow cannot receive applications) — the tooltip says what */
      const attention = tab.id === "request-types" ? service.geap.requestTypes.filter((rt) => passport.requestTypeState(rt).tone === "warning").length : 0;
      const reason = attention ? `${attention === 1 ? "Un tip de solicitare nu are" : `${attention} tipuri de solicitare nu au`} flux de procesare — nu pot primi cereri.` : "";
      return `
        <button class="tab-button${active ? " active" : ""}" id="passport-tab-${tab.id}" type="button" role="tab" aria-selected="${active ? "true" : "false"}" aria-controls="passport-panel" tabindex="${active ? "0" : "-1"}" data-passport-tab="${tab.id}"${reason ? ` data-tooltip-reason="${escapeHtml(reason)}"` : ""}>
          ${tab.icon ? `<svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${tab.icon}"></use></svg>` : ""}
          <span>${escapeHtml(tab.label)}</span>
          ${count ? renderPageHeaderTabCount(count, attention ? "warning" : null) : ""}
        </button>
      `;
    }).join("");
    tabs.querySelector(".tab-button.active")?.scrollIntoView({ block: "nearest", inline: "nearest" });
    syncPassportTabOverflow();
    body.setAttribute("aria-labelledby", `passport-tab-${serviceProfileState.tabKey}`);
    body.innerHTML = renderServiceTabBody(service, serviceProfileState.tabKey);
    syncStackMetaRows(body);
    header.hidden = false;
  };

  const openServiceProfile = (code, tabKey = "general") => {
    const service = getServiceByCode(code);

    if (!service || !permitsProfilePanel) {
      return;
    }

    serviceProfileState.code = code;
    serviceProfileState.tabKey = normalizePassportTab(tabKey);
    serviceProfileState.templateCode = null;

    if (workplacePanel) {
      workplacePanel.hidden = true;
    }

    hideProfilePanels();
    permitsProfilePanel.hidden = false;
    shell.classList.add("is-service-profile-open");

    if (serviceProfileBackShell) {
      serviceProfileBackShell.hidden = false;
    }

    setActiveNav("service-config");
    renderServiceProfile();
    history.replaceState(null, "", `#serviciu/${code}/${serviceProfileState.tabKey}`);
    permitsProfilePanel.scrollIntoView?.({ block: "start" });
  };

  const closeServiceProfile = () => {
    showServiceRegistry("services");
    restorePageHash();
  };

  /* ---- RSSP lookup (mock of GET api/public-service/code/{cod}) ----------- */

  const rsspLookup = (code) => {
    const mock = servicesStore.rssp;

    if (mock.unavailable.includes(code)) {
      return { status: "unavailable" };
    }

    if (mock.invalid.includes(code)) {
      return { status: "ok", data: { code } };
    }

    if (mock.responses[code]) {
      return { status: "ok", data: mock.responses[code] };
    }

    /* codes already in GEAP resync from their stored RSSP data */
    const existing = getServiceByCode(code);
    const authority = existing && getAuthorityById(existing.authorityId);

    if (existing && authority) {
      const r = existing.rssp;
      return {
        status: "ok",
        data: {
          code,
          title: { ro: r.title },
          objective: { ro: r.objective },
          types: passport.APPLICANT_TYPES.filter((type) => r.applicantTypes.includes(type.label)).reduce((mask, type) => mask | type.bit, 0),
          isPermissiveAct: r.isPermissiveAct,
          allowsMPay: r.paid,
          allowsMDelivery: r.allowsMDelivery,
          allowsMPower: r.allowsMPower,
          eService: r.delivery.includes("Electronic"),
          isActive: r.rsspStatus !== "Inactiv",
          published: r.rsspStatus !== "Nepublicat",
          organization: { idno: authority.idno, code: authority.code, name: { ro: authority.name } },
          subServices: r.subServices.map((sub) => ({
            title: { ro: sub.title },
            subServiceType: { title: { ro: sub.type } },
            isDisabled: false,
            costs: [{ price: sub.price?.amount ?? 0, currency: sub.price?.currency || "MDL", durationValue: sub.duration?.value || 0, durationUnit: sub.duration?.unit === "zile lucrătoare" ? "WorkDay" : "CalendarDay" }]
          })),
          documents: r.documents.map((doc) => ({ title: { ro: doc.title }, type: doc.required ? "required" : "optional" })),
          validityPeriods: r.validity.map((period) => ({ validFor: period.validFor, description: { ro: period.description } }))
        }
      };
    }

    return { status: "notFound" };
  };

  /* ---- sync modal (US-111) ------------------------------------------------ */

  const syncModal = document.querySelector("#service-sync-modal");
  const syncModalBody = syncModal?.querySelector("[data-service-sync-body]");
  const syncModalFooter = syncModal?.querySelector("[data-service-sync-footer]");
  const syncState = { code: "", phase: "form", error: "", fieldError: "", result: null, eaplResult: null, eaplError: "", sources: ["RSSP"], source: "RSSP", steps: [] };

  /* ---- sync: RSSP, eAPL or both ------------------------------------------
     Services declare their sources (syncSources). A new service is always
     created from RSSP (US-111); eAPL enriches an existing one with its local
     data. "Both" runs RSSP, then eAPL — an eAPL failure after a successful
     RSSP sync is reported without undoing the RSSP update. While it runs, the
     modal shows each source's progress over a skeleton of the summary. */
  const SYNC_SOURCES = [["RSSP", "RSSP"], ["eAPL", "eAPL"], ["both", "RSSP + eAPL"]];
  const syncSourceLabel = (source) => SYNC_SOURCES.find(([key]) => key === source)?.[1] || source;

  const eaplLookup = (code) => {
    const mock = servicesStore.eapl || { unavailable: [], responses: {} };
    if (mock.unavailable.includes(code)) return { status: "unavailable" };
    return mock.responses[code] ? { status: "ok", data: mock.responses[code] } : { status: "notFound" };
  };

  const syncRow = ([label, value]) => `
    <div class="e-permits-dosar-profil__row">
      <span class="e-permits-dosar-profil__row-label">${escapeHtml(label)}</span>
      <span class="e-permits-dosar-profil__row-value">${value}</span>
    </div>
  `;

  const renderEaplSummary = (eapl) => `
    <div class="e-permits-dosar-profil__card e-permits-passport__sync-summary">
      ${[
        ["Sursă", `${renderTag("eAPL", "neutral")} ${escapeHtml(eapl.register || "")}`],
        ["Autoritate locală", `${escapeHtml(eapl.authority?.name || "—")}${eapl.authority?.code ? ` <span class="e-permits-passport__muted">(${escapeHtml(eapl.authority.code)})</span>` : ""}`],
        ["Taxă locală", eapl.fee ? `${escapeHtml(eapl.fee.label)} · ${eapl.fee.amount} ${escapeHtml(eapl.fee.currency)}` : "—"],
        ["Termen local", eapl.term ? `${eapl.term.value} ${escapeHtml(eapl.term.unit)}` : "—"]
      ].map(syncRow).join("")}
    </div>
  `;

  /* skeleton of the summary card + one progress line per source */
  const renderSyncLoading = () => `
    <ul class="e-permits-sync__steps" aria-live="polite">
      ${syncState.steps.map((step) => `
        <li class="e-permits-sync__step is-${step.status}">
          ${step.status === "loading" ? '<span class="spinner spinner--small" aria-hidden="true"></span>'
            : step.status === "done" ? '<svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-checkmark-filled"></use></svg>'
            : step.status === "error" ? '<svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-error-filled"></use></svg>'
            : '<span class="e-permits-sync__step-dot" aria-hidden="true"></span>'}
          <span>${step.status === "loading" ? `Se preiau datele din ${step.source}…` : step.status === "done" ? `Date preluate din ${step.source}` : step.status === "error" ? `${step.source}: eroare` : `În așteptare: ${step.source}`}</span>
        </li>
      `).join("")}
    </ul>
    <div class="e-permits-dosar-profil__card e-permits-passport__sync-summary" aria-hidden="true">
      ${[132, 220, 180, 150, 96, 200].map((width) => `
        <div class="e-permits-dosar-profil__row">
          <span class="e-permits-dosar-profil__row-label"><span class="e-permits-fo-skeleton e-permits-fo-skeleton--label"></span></span>
          <span class="e-permits-dosar-profil__row-value"><span class="e-permits-fo-skeleton e-permits-fo-skeleton--label" style="width:${width}px"></span></span>
        </div>
      `).join("")}
    </div>
  `;

  const renderSyncModal = () => {
    if (!syncModalBody || !syncModalFooter) {
      return;
    }

    const title = syncModal.querySelector("[data-service-sync-title]");
    const multiSource = syncState.sources.length > 1;

    if (syncState.phase === "done") {
      const result = syncState.result;
      const eapl = syncState.eaplResult;
      const summary = result?.summary;
      const parts = [result ? "RSSP" : "", eapl ? "eAPL" : ""].filter(Boolean).join(" și ");
      title.textContent = result?.kind === "created" ? "Serviciu creat din RSSP" : `Serviciu actualizat din ${parts}`;
      syncModalBody.innerHTML = `
        <div class="message message--subtle banner--success e-permits-passport__sync-message" role="status">
          <span class="banner__icon"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-checkmark-filled"></use></svg></span>
          <div class="banner__content">
            <p class="banner__text">${result?.kind === "created"
              ? "Pașaportul serviciului a fost creat. Datele RSSP sunt needitabile în GEAP."
              : `Datele ${parts} ale serviciului au fost actualizate. Configurația GEAP a rămas neschimbată.`}</p>
          </div>
        </div>
        ${syncState.eaplError ? `
          <div class="message message--subtle banner--warning e-permits-passport__sync-message" role="alert">
            <span class="banner__icon"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-warning-filled"></use></svg></span>
            <div class="banner__content"><p class="banner__text">eAPL nu a fost sincronizat: ${escapeHtml(syncState.eaplError)} Datele RSSP au fost salvate.</p></div>
          </div>
        ` : ""}
        ${result ? `
          <div class="e-permits-dosar-profil__card e-permits-passport__sync-summary">
            ${[
              ["Sursă", renderTag("RSSP", "neutral")],
              ["Cod serviciu", escapeHtml(summary.code)],
              ["Denumire", escapeHtml(summary.title)],
              ["Autoritate", `${escapeHtml(result.authority.name)} ${renderTag(result.authorityCreated ? "Creată" : "Legată", result.authorityCreated ? "brand" : "neutral")}`],
              ["Tipul solicitantului", applicantTags(summary.applicantTypes)],
              ["Subservicii importate", `${summary.subServices}${summary.ignoredSubServices ? ` <span class="e-permits-passport__muted">(${summary.ignoredSubServices} dezactivate, ignorate)</span>` : ""}`],
              ["Documente", String(summary.documents)],
              ["Indicatori", valueTags(Object.entries(summary.flags).filter(([, on]) => on).map(([name]) => name))]
            ].map(syncRow).join("")}
          </div>
        ` : ""}
        ${eapl ? renderEaplSummary(eapl.service.eapl) : ""}
      `;
      syncModalFooter.innerHTML = `
        <div class="modal-buttons">
          <button class="btn btn-primary btn-rounded" type="button" data-service-sync-close>Închide</button>
        </div>
      `;
      return;
    }

    const loading = syncState.phase === "loading";
    /* a service is created only by import from RSSP (Feature 90575, US-111) */
    title.textContent = syncState.creating ? "Creează serviciu nou din RSSP" : multiSource ? "Sincronizare serviciu" : "Sincronizare serviciu din RSSP";
    syncModalBody.innerHTML = `
      <p class="e-permits-passport__lead">${multiSource
        ? "Serviciul se integrează cu RSSP și cu eAPL. Alege sursa: RSSP actualizează datele pașaportului, eAPL aduce datele locale (autoritatea locală, taxa și termenul local)."
        : "Introdu codul serviciului din Registrul de Stat al Serviciilor Publice. Dacă serviciul există deja în GEAP, datele RSSP se actualizează; altfel se creează un pașaport nou."}</p>
      ${syncState.error ? `
        <div class="message message--subtle banner--error e-permits-passport__sync-message" role="alert">
          <span class="banner__icon"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-error-filled"></use></svg></span>
          <div class="banner__content"><p class="banner__text">${escapeHtml(syncState.error)}</p></div>
        </div>
      ` : ""}
      ${multiSource ? `
        <div class="e-permits-fo-field">
          <label id="service-sync-source-label">Sursa sincronizării${requiredMark()}</label>
          ${renderChoiceChips({
            labelId: "service-sync-source-label",
            name: "service-sync-source",
            options: SYNC_SOURCES,
            value: syncState.source,
            disabledValues: loading ? SYNC_SOURCES.map(([key]) => key) : []
          })}
        </div>
      ` : ""}
      <div class="e-permits-fo-field">
        <label for="service-sync-code">Cod serviciu${multiSource ? "" : " RSSP"}${requiredMark()}</label>
        <div class="e-permits-fo-input${syncState.fieldError ? " is-error" : ""}">
          <input id="service-sync-code" type="text" inputmode="numeric" autocomplete="off" placeholder="ex. 003000333"
            value="${escapeHtml(syncState.code)}" data-service-sync-code ${loading ? "disabled" : ""}
            aria-invalid="${syncState.fieldError ? "true" : "false"}" aria-describedby="service-sync-hint">
        </div>
        ${syncState.fieldError ? `
          <span class="message message--inline message--error e-permits-fo-field__error">
            <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-error-filled"></use></svg>
            <span>${escapeHtml(syncState.fieldError)}</span>
          </span>
        ` : loading ? "" : `<p class="e-permits-fo-field__hint" id="service-sync-hint">Coduri demo: 003000333 (serviciu nou, autoritate nouă) · 003000451 (serviciu nou, autoritate existentă) · 003000023 (existent, RSSP + eAPL) · 000000000 (indisponibil) · 003999998 (răspuns invalid)</p>`}
      </div>
      ${loading ? renderSyncLoading() : ""}
    `;
    syncModalFooter.innerHTML = `
      <div class="modal-buttons">
        <button class="btn btn-neutral btn-rounded" type="button" data-service-sync-close ${loading ? "disabled" : ""}>Închide</button>
        <button class="btn btn-primary btn-rounded" type="button" data-service-sync-submit ${loading ? "disabled aria-busy=\"true\"" : ""}>
          ${loading ? '<span class="spinner spinner--small spinner--light-on-color" aria-hidden="true"></span><span>Se preiau datele…</span>' : `<span>Sincronizează${multiSource ? ` din ${syncSourceLabel(syncState.source)}` : " serviciu"}</span>`}
        </button>
      </div>
    `;
  };

  const openSyncModal = (code = "", source = "") => {
    if (!syncModal || !isCentralAdmin()) {
      return;
    }

    const sources = getServiceByCode(code)?.syncSources || ["RSSP"];
    const allowed = sources.length > 1 ? ["RSSP", "eAPL", "both"] : ["RSSP"];
    Object.assign(syncState, {
      code, creating: !code, phase: "form", error: "", fieldError: "", result: null, eaplResult: null, eaplError: "",
      sources, source: allowed.includes(source) ? source : "RSSP", steps: []
    });
    renderSyncModal();
    window.__modal?.open?.("#service-sync-modal");
    syncModal.querySelector("[data-service-sync-code]")?.focus();
  };

  const closeSyncModal = () => window.__modal?.close?.("#service-sync-modal");

  const logServiceEvents = (code, events, { render = true } = {}) => {
    const service = getServiceByCode(code);

    if (service && events.length) {
      servicePublication(service);
      service.geap.events = [...events].reverse().concat(service.geap.events);
      /* the header's "Modificări nepublicate" / Publică follow the log */
      if (render && serviceProfileState.code === code) queueMicrotask(() => { if (!permitsProfilePanel?.hidden) renderServiceProfile(); });
    }
  };

  const syncStepDelay = 900;

  const runRsspStep = () => {
    const result = passport.syncService({
      code: syncState.code,
      lookup: rsspLookup,
      services: servicesStore.services,
      authorities: servicesStore.authorities,
      now: localIsoNow(),
      user: currentUserName()
    });

    if (!result.ok) {
      logServiceEvents(syncState.code.trim(), result.events);
      return { ok: false, message: result.message };
    }

    const previous = getServiceByCode(result.service.code);
    /* the RSSP mapper rebuilds the service: keep what GEAP owns */
    result.service.syncSources = previous?.syncSources || ["RSSP"];
    if (previous?.eapl) result.service.eapl = previous.eapl;

    const index = servicesStore.services.findIndex((service) => service.code === result.service.code);
    if (index >= 0) servicesStore.services[index] = result.service;
    else servicesStore.services.unshift(result.service);
    if (result.authorityCreated) servicesStore.authorities.push(result.authority);
    logServiceEvents(result.service.code, result.events);
    syncState.result = result;
    return { ok: true };
  };

  const runEaplStep = () => {
    const service = getServiceByCode(syncState.code.trim());
    const result = passport.syncFromEapl({ code: syncState.code, service, lookup: eaplLookup, now: localIsoNow(), user: currentUserName() });
    logServiceEvents(syncState.code.trim(), result.events);

    if (!result.ok) {
      return { ok: false, message: result.message };
    }

    const index = servicesStore.services.findIndex((item) => item.code === result.service.code);
    servicesStore.services[index] = result.service;
    syncState.eaplResult = result;
    return { ok: true };
  };

  const finishSync = () => {
    syncState.phase = "done";
    renderSyncModal();
    refreshServiceRegistries();
    const code = syncState.code.trim();

    if (serviceProfileState.code === code) {
      renderServiceProfile();
    }

    const service = getServiceByCode(code);
    const title = syncState.result?.kind === "created" ? "Serviciu creat din RSSP"
      : `Serviciu actualizat din ${[syncState.result ? "RSSP" : "", syncState.eaplResult ? "eAPL" : ""].filter(Boolean).join(" și ")}`;
    showShellToast(`${code} · ${service?.title || ""}`, "success", title);
  };

  const runSync = () => {
    const input = syncModal.querySelector("[data-service-sync-code]");
    syncState.code = input ? input.value : syncState.code;
    Object.assign(syncState, { error: "", fieldError: "", result: null, eaplResult: null, eaplError: "" });

    if (!syncState.code.trim()) {
      /* US-111: validation only — no registry is called */
      syncState.fieldError = passport.MESSAGES.required;
      renderSyncModal();
      syncModal.querySelector("[data-service-sync-code]")?.focus();
      return;
    }

    const order = syncState.source === "both" ? ["RSSP", "eAPL"] : [syncState.source];
    syncState.steps = order.map((source, index) => ({ source, status: index === 0 ? "loading" : "pending" }));
    syncState.phase = "loading";
    renderSyncModal();

    const step = (index) => {
      window.setTimeout(() => {
        const current = syncState.steps[index];
        const outcome = current.source === "RSSP" ? runRsspStep() : runEaplStep();
        current.status = outcome.ok ? "done" : "error";

        if (!outcome.ok) {
          if (current.source === "eAPL" && syncState.result) {
            /* RSSP succeeded: keep it, report eAPL */
            syncState.eaplError = outcome.message;
            finishSync();
            return;
          }
          syncState.phase = "form";
          syncState.error = outcome.message;
          renderSyncModal();
          return;
        }

        if (index + 1 < syncState.steps.length) {
          syncState.steps[index + 1].status = "loading";
          renderSyncModal();
          step(index + 1);
          return;
        }

        finishSync();
      }, syncStepDelay);
    };

    step(0);
  };

  syncModal?.addEventListener("click", (event) => {
    const source = event.target.closest("[data-service-sync-source]");

    if (source) {
      const input = syncModal.querySelector("[data-service-sync-code]");
      syncState.code = input ? input.value : syncState.code;
      syncState.source = source.dataset.serviceSyncSource;
      syncState.error = "";
      renderSyncModal();
      syncModal.querySelector(`[data-service-sync-source="${syncState.source}"]`)?.focus();
      return;
    }

    if (event.target.closest("[data-service-sync-submit]")) {
      runSync();
    } else if (event.target.closest("[data-service-sync-close]")) {
      closeSyncModal();
    }
  });

  syncModal?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.matches("[data-service-sync-code]")) {
      event.preventDefault();
      runSync();
    }
  });

  syncModal?.addEventListener("input", (event) => {
    if (event.target.matches("[data-service-sync-code]") && syncState.fieldError) {
      syncState.fieldError = "";
      syncState.code = event.target.value;
      const shellEl = event.target.closest(".e-permits-fo-input");
      shellEl?.classList.remove("is-error");
      event.target.setAttribute("aria-invalid", "false");
      shellEl?.parentElement.querySelector(".message--error")?.remove();
    }
  });

  /* ---- request type configuration (wide drawer) --------------------------
     A request type = flow + the applicant's electronic form (exactly one) +
     examination term + the form each flow action opens. Actions inherit the
     process default ("din proces"); overrides are kept only where they differ
     (GEAP.servicePassport.setActionForm). Editing happens in a draft; nothing
     is written until Salvează. */

  /* the back-office field error state: red control, inline message */
  const setFieldError = (control, message, on) => {
    control.closest(".e-permits-fo-input, .e-permits-fo-select")?.classList.toggle("is-error", on);
    control.setAttribute("aria-invalid", on ? "true" : "false");

    if (message) {
      message.hidden = !on;
    }
  };

  const rtDrawer = document.querySelector("[data-rt-drawer]");
  const rtDrawerBody = rtDrawer?.querySelector("[data-rt-body]");
  const RT_TERM_UNITS = ["zile lucrătoare", "zile calendaristice"];
  const RT_FILTERS = [
    ["all", "Toate"],
    ["changed", "Modificate"],
    ["with", "Cu formular"],
    ["without", "Fără formular"]
  ];
  let rtDraft = null;
  let rtReturnFocus = null;

  const processFormName = (id) => servicesStore?.processForms?.find((form) => form.id === id)?.name || id;

  const rtActionRows = () => {
    const flow = getFlowById(rtDraft.flow);
    return passport.flowActions(flow).map(({ step, action }) => ({
      step,
      action,
      ...passport.actionForm(step, action, rtDraft.actions)
    }));
  };

  const rtMatches = (row) => {
    const query = rtDraft.query.trim().toLocaleLowerCase("ro");
    const text = `${row.step.name} ${row.action.name} ${row.form || ""}`.toLocaleLowerCase("ro");

    if (query && !text.includes(query)) {
      return false;
    }

    return rtDraft.filter === "changed" ? row.overridden
      : rtDraft.filter === "with" ? Boolean(row.form)
      : rtDraft.filter === "without" ? !row.form
      : true;
  };

  const renderRtChips = (rows) => {
    const counts = {
      all: rows.length,
      changed: rows.filter((row) => row.overridden).length,
      with: rows.filter((row) => row.form).length,
      without: rows.filter((row) => !row.form).length
    };

    return RT_FILTERS.map(([key, label]) => `
      <button type="button" class="chip${rtDraft.filter === key ? " is-selected" : ""}" aria-pressed="${rtDraft.filter === key ? "true" : "false"}" data-rt-filter="${key}">
        <span class="chip__label">${label}</span>
        <span class="badge badge--lg badge--solid-light" aria-hidden="true">${counts[key]}</span>
      </button>
    `).join("");
  };

  const renderRtActionRow = (row) => {
    const key = passport.actionKey(row.step, row.action);
    const fallback = row.action.defaultForm ? `${processFormName(row.action.defaultForm)} · din proces` : "fără formular";
    const current = row.overridden ? (row.form || passport.NO_FORM) : "";
    const options = [
      `<option value="default"${current === "" ? " selected" : ""}>Implicit · ${escapeHtml(fallback)}</option>`,
      row.action.defaultForm ? `<option value="${passport.NO_FORM}"${current === passport.NO_FORM ? " selected" : ""}>Fără formular</option>` : "",
      ...(servicesStore?.processForms || []).filter((form) => form.id !== row.action.defaultForm).map((form) => `
        <option value="${escapeHtml(form.id)}"${current === form.id ? " selected" : ""}>${escapeHtml(form.name)}</option>
      `)
    ].join("");

    return `
      <li class="e-permits-stack__item e-permits-rt__action${row.overridden ? " is-overridden" : ""}">
        <div class="e-permits-stack__main">
          <div class="e-permits-stack__title-row">
            <p class="e-permits-stack__title">${escapeHtml(row.action.name)}</p>
            ${row.overridden ? renderTag("Modificat", "brand") : ""}
          </div>
          ${row.overridden ? `
            <div class="e-permits-stack__meta">
              <span class="e-permits-stack__part">Implicit: ${escapeHtml(fallback)}</span>
            </div>
          ` : ""}
        </div>
        <div class="e-permits-stack__actions e-permits-rt__action-control">
          ${renderFoSelectControl({
            id: `rt-action-${key.replace(/[^a-z0-9-]/gi, "-")}`,
            attrs: `data-rt-action="${escapeHtml(key)}"`,
            label: `Formular pentru ${row.step.name} / ${row.action.name}`,
            optionsHtml: options
          })}
          ${row.overridden ? `<button class="btn btn-text-primary btn-sm" type="button" data-rt-reset="${escapeHtml(key)}">Revino la implicit</button>` : ""}
        </div>
      </li>
    `;
  };

  const renderRtActionList = () => {
    const rows = rtActionRows();
    const visible = rows.filter(rtMatches);
    const steps = getFlowById(rtDraft.flow)?.steps || [];
    const groups = steps.map((step) => ({
      step,
      rows: visible.filter((row) => row.step === step),
      changed: rows.filter((row) => row.step === step && row.overridden).length
    })).filter((group) => group.rows.length);

    if (!groups.length) {
      return renderNoResults("Nicio acțiune nu corespunde filtrului");
    }

    return `
      <div class="e-permits-stack e-permits-rt__stack">
        ${groups.map((group) => {
          const open = !rtDraft.collapsed.has(group.step.id);
          return `
            <div class="e-permits-stack__group${open ? " is-open" : " is-collapsed"}">
              <h3 class="e-permits-stack__group-label e-permits-stack__group-label--toggle">
                <button class="e-permits-stack__group-toggle" type="button" data-rt-step="${escapeHtml(group.step.id)}" aria-expanded="${open ? "true" : "false"}">
                  <span class="e-permits-stack__group-name">${escapeHtml(group.step.name)}</span>
                  <span class="badge badge--lg badge--solid-light e-permits-stack__group-count">${group.rows.length}</span>
                  ${group.step.auto ? renderTag("Automat", "neutral") : ""}
                  ${group.changed ? renderTag(`${group.changed} ${group.changed === 1 ? "modificată" : "modificate"}`, "brand") : ""}
                  <svg class="icon small e-permits-stack__group-chevron" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
                </button>
              </h3>
              ${open ? `<ul class="e-permits-stack__list" role="list">${group.rows.map(renderRtActionRow).join("")}</ul>` : ""}
            </div>
          `;
        }).join("")}
      </div>
    `;
  };

  /* the flow diagram lives in the Workflows (Fluxuri de lucru) item; the
     drawer only links there — opened in a new tab so the draft stays */
  const renderRtFlowLink = () => rtDraft.flow ? `
    <a class="link link-primary link-sm e-permits-passport__tab-link" href="e-permits-acte-permisive.html?flow=back-office#flux/${encodeURIComponent(rtDraft.flow)}" target="_blank" rel="noopener">Vezi schema fluxului în Fluxuri de lucru →</a>
  ` : "";

  const renderRtActionsSection = () => {
    if (!rtDraft.flow) {
      return `<p class="e-permits-fo-field__hint">Alege întâi fluxul de procesare — acțiunile lui apar aici.</p>`;
    }

    const rows = rtActionRows();

    return `
      <div class="e-permits-rt__toolbar">
        <div class="e-permits-rt__chips" role="group" aria-label="Filtrează acțiunile" data-rt-chips>${renderRtChips(rows)}</div>
        <div class="search-input medium rectangular e-permits-workplace__search e-permits-list-search e-permits-rt__search${String(rtDraft.query || "").trim() ? " has-value is-ready" : ""}">
              <span class="icon-search" aria-hidden="true"><svg class="icon" width="20" height="20"><use href="assets/icons/sprite.svg#icon-search"></use></svg></span>
              <input class="input" type="search" placeholder="Caută pas sau acțiune" aria-label="Caută pas sau acțiune" value="${escapeHtml(rtDraft.query)}" autocomplete="off" data-rt-search>
              ${renderSearchActions()}
            </div>
      </div>
      <div data-rt-list>${renderRtActionList()}</div>
    `;
  };

  const renderRtFooterSummary = () => {
    const flow = getFlowById(rtDraft.flow);
    const total = passport.flowActions(flow).length;
    const changed = flow ? passport.overrideCount(rtDraft, flow) : 0;
    rtDrawer.querySelector("[data-rt-summary]").textContent = rtDraft.pending
      ? `Pasul ${rtDraft.step} din ${RT_CREATE_STEPS.length} · ${RT_CREATE_STEPS[rtDraft.step - 1][1]}`
      : flow ? `${total} acțiuni · ${changed} ${changed === 1 ? "modificată" : "modificate"}` : "";
  };

  /* Documente generate / Notificări / Taxe follow the flow, step by step (US-222, US-188;
     A. Pascalov 2026-10-07): the process sets what each step generates or sends, and the
     request type keeps it („Implicit” / „Din proces”) or replaces it with a template of
     the service („Personalizat”) — the forms-per-action model. Taxes are read-only here
     (owned by Taxe și tarife), grouped by the moment of the flow where they apply. */
  const rtOverrideRow = ({ key, attr, lead, title, meta, defaultLabel, defaultTag, current, options }) => {
    const overridden = Boolean(current);
    return `
      <li class="e-permits-stack__item${lead ? " has-lead" : ""} e-permits-rt__action${overridden ? " is-overridden" : ""}${rtDraft.peek === key ? " is-previewing" : ""}">
        ${lead || ""}
        <div class="e-permits-stack__main">
          <div class="e-permits-stack__title-row">
            <p class="e-permits-stack__title">${escapeHtml(title)}</p>
            ${overridden ? renderTag("Personalizat", "brand") : renderTag(defaultTag, "neutral")}
          </div>
          <div class="e-permits-stack__meta">
            ${meta.map((part) => `<span class="e-permits-stack__part">${part}</span>`).join("")}
            ${overridden ? `<span class="e-permits-stack__part">${escapeHtml(defaultTag)}: ${escapeHtml(defaultLabel)}</span>` : ""}
          </div>
        </div>
        <div class="e-permits-stack__actions e-permits-rt__action-control">
          <button class="btn btn-strict btn-sm btn-icon-only" type="button" aria-label="Previzualizează ${attr === "doc" ? "documentul" : "notificarea"}: ${escapeHtml(title)}" data-tooltip-label="Previzualizează" aria-controls="rt-peek" aria-expanded="${rtDraft.peek === key}" data-rt-doc-peek="${escapeHtml(key)}"><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-eye-open"></use></svg></button>
          ${renderFoSelectControl({
            id: `rt-${attr}-${String(key).replace(/[^a-z0-9-]/gi, "-")}`,
            attrs: `data-rt-${attr}="${escapeHtml(key)}"`,
            label: `Șablon pentru ${title}`,
            optionsHtml: `<option value="default"${overridden ? "" : " selected"}>${escapeHtml(defaultTag)} · ${escapeHtml(defaultLabel)}</option>${options.map((o) => `<option value="${escapeHtml(o.value)}"${o.value === current ? " selected" : ""}>${escapeHtml(o.label)}</option>`).join("")}`
          })}
          ${overridden ? `<button class="btn btn-text-primary btn-sm" type="button" data-rt-${attr}-reset="${escapeHtml(key)}">Revino la implicit</button>` : ""}
        </div>
      </li>`;
  };

  const RT_MOMENTS = ["La inițierea solicitării", "La examinare", "La avizare", "La luarea deciziei", "După semnare act", "După emitere act"];

  const renderRtOutputs = (service, rt) => {
    const flow = getFlowById(rtDraft.flow);
    const docSteps = flow ? passport.documentSteps(flow) : [];
    const noteSteps = flow ? passport.notificationSteps(flow) : [];
    const docOptions = serviceDocTemplates(service).map((t) => ({ value: t.code, label: `${t.name} · ${t.version}` }));
    const own = serviceTemplates(service);
    const noteOptions = [...own, ...((servicesStore?.notificationTemplates || []).filter((t) => !own.some((o) => o.code === t.code)))].map((t) => ({ value: t.code, label: `${t.code} · ${t.name}` }));
    const blue = '<img class="e-permits-fo-lib-item__icon" src="assets/icons/document-generated.svg" width="24" height="24" alt="">';
    const needFlow = '<p class="e-permits-fo-field__hint">Alege întâi fluxul de procesare (tabul General) — pașii lui apar aici.</p>';
    const changedDocs = docSteps.filter((st) => rtDraft.docOverrides[st.key]).length;
    const changedNotes = noteSteps.filter((st) => rtDraft.notifyOverrides[st.key]).length;
    const group = (label, count, changed, rows) => `
      <div class="e-permits-stack e-permits-rt__stack">
        <div class="e-permits-stack__group">
          <h3 class="e-permits-stack__group-label">${escapeHtml(label)}<span class="badge badge--lg badge--solid-light e-permits-stack__group-count">${count}</span>${changed ? renderTag(`${changed} ${changed === 1 ? "personalizat" : "personalizate"}`, "brand") : ""}</h3>
          <ul class="e-permits-stack__list" role="list">${rows}</ul>
        </div>
      </div>`;
    const taxes = serviceTaxes(service).filter((tax) => tax.requestType === rt.name);
    const moments = [...new Set(taxes.map((tax) => tax.moment || RT_MOMENTS[0]))];
    const momentStep = (moment) => (flow?.definition?.states || []).find((st) => (st.properties || {}).momentId === RT_MOMENTS.indexOf(moment) + 1)?.title || "";
    return {
      documents: `
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">Documente generate</h3>
        <div class="e-permits-user-create__section-content">
          <p class="e-permits-fo-field__hint">Fluxul stabilește documentul generat la fiecare pas (PDF din MDocs). Păstrează-l implicit sau înlocuiește-l cu un șablon de tipar al serviciului.</p>
          ${!flow ? needFlow : docSteps.length ? group("Pași care generează documente", docSteps.length, changedDocs, docSteps.map((st) => {
            const def = serviceDocTemplates(service).find((t) => t.type === st.docType);
            return rtOverrideRow({ key: st.key, attr: "doc", lead: blue, title: st.stepName, meta: [renderTag(st.docType, "neutral")], defaultLabel: def ? def.name : "șablonul procesului", defaultTag: "Implicit", current: rtDraft.docOverrides[st.key] || "", options: docOptions });
          }).join("")) : '<p class="e-permits-fo-field__hint">Fluxul ales nu are pași care generează documente.</p>'}
        </div>
      </section>`,
      notifications: `
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">Notificări</h3>
        <div class="e-permits-user-create__section-content">
          <p class="e-permits-fo-field__hint">Pașii de notificare ai fluxului, câte un rând pe eveniment. Implicit se trimite șablonul din proces; îl poți înlocui pentru acest tip de solicitare.</p>
          ${!flow ? needFlow : noteSteps.length ? group("Pași de notificare", noteSteps.length, changedNotes, noteSteps.map((st) => rtOverrideRow({ key: st.key, attr: "notify", title: st.stepName, meta: [renderTag(st.event, "neutral")], defaultLabel: st.event, defaultTag: "Din proces", current: rtDraft.notifyOverrides[st.key] || "", options: noteOptions })).join("")) : '<p class="e-permits-fo-field__hint">Fluxul ales nu are pași de notificare.</p>'}
        </div>
      </section>`,
      taxes: `
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">Taxe aplicate</h3>
        <div class="e-permits-user-create__section-content">
          <p class="e-permits-fo-field__hint">Taxele acestui tip de solicitare, la momentul din flux în care se aplică. Se configurează în tabul Taxe și tarife.</p>
          ${taxes.length ? `<div class="e-permits-stack e-permits-rt__stack">${moments.map((moment) => {
            const list = taxes.filter((tax) => (tax.moment || RT_MOMENTS[0]) === moment);
            const step = momentStep(moment);
            return `
            <div class="e-permits-stack__group">
              <h3 class="e-permits-stack__group-label">${escapeHtml(step ? `${moment} · ${step}` : moment)}<span class="badge badge--lg badge--solid-light e-permits-stack__group-count">${list.length}</span></h3>
              <ul class="e-permits-stack__list" role="list">${list.map((tax) => {
                const tariff = getTariff(tax.tariffId);
                const status = TAX_STATUS(tax);
                return `
                <li class="e-permits-stack__item">
                  <div class="e-permits-stack__main"><div class="e-permits-stack__title-row"><p class="e-permits-stack__title">${escapeHtml(tariff?.name || "Tarif necunoscut")}</p>${renderTag(status, TAX_STATUS_TONES[status] || "neutral")}</div></div>
                  <div class="e-permits-stack__actions">${taxCalcLabel(tax, tariff)}</div>
                </li>`;
              }).join("")}</ul>
            </div>`;
          }).join("")}</div>` : '<p class="e-permits-fo-field__hint">Nicio taxă pentru acest tip de solicitare.</p>'}
        </div>
      </section>`
    };
  };

  /* adding a type = the step strip of every multi-step create drawer (Tarif nou,
     Clasificator nou); configuring an existing one = tabs. Taxe has nothing yet for a new type. */
  const RT_CREATE_STEPS = [["general", "General"], ["forms", "Formulare"], ["documents", "Documente generate"], ["notifications", "Notificări"]];
  const rtCurrent = (service) => rtDraft.pending || service.geap.requestTypes.find((item) => item.id === rtDraft.rtId);
  const RT_DRAWER_TABS = [["general", "General"], ["forms", "Formulare"], ["documents", "Documente generate"], ["notifications", "Notificări"], ["taxes", "Taxe"]];

  const renderRtDrawer = () => { renderRtDrawerCore(); syncRtPeek(); };

  /* Documente generate › Previzualizează (comment 1958021586): the document the step
     will generate — override or the default for its type — read-only, A4 scaled to fit,
     docked in the free space left of the drawer (over the drawer's left part when the
     screen is too narrow). It follows the row's select. */
  const rtPeek = rtDrawer?.querySelector("[data-rt-peek]");
  const syncRtPeek = () => {
    if (!rtPeek) return;
    const service = rtDraft && getServiceByCode(rtDraft.serviceCode);
    const flow = service && getFlowById(rtDraft.flow);
    const kind = rtDraft?.tab === "notifications" ? "notify" : rtDraft?.tab === "documents" ? "doc" : null;
    const st = rtDraft?.peek && kind && flow ? (kind === "doc" ? passport.documentSteps(flow) : passport.notificationSteps(flow)).find((s) => s.key === rtDraft.peek) : null;
    if (!st) {
      if (rtDraft) rtDraft.peek = null;
      /* slide back behind the drawer, then hide */
      rtDrawer.classList.remove("has-peek", "has-peek-overlay");
      if (!rtPeek.hidden && !rtPeek.classList.contains("is-closing")) {
        rtPeek.classList.add("is-closing");
        window.setTimeout(() => { if (rtDraft?.peek) return; rtPeek.hidden = true; rtPeek.classList.remove("is-closing"); delete rtPeek.dataset.code; }, 140);
      }
      return;
    }
    if (kind === "notify") { syncRtPeekNotify(service, st); return; }
    const own = rtDraft.docOverrides[st.key];
    const tpl = serviceDocTemplates(service).find((t) => t.code === own) || serviceDocTemplates(service).find((t) => t.type === st.docType);
    rtPeek.querySelector("[data-rt-peek-title]").textContent = tpl ? tpl.name : st.docType;
    rtPeek.querySelector("[data-rt-peek-subtitle]").innerHTML = `${escapeHtml(st.stepName)} · ${escapeHtml(st.docType)}${tpl ? ` · ${escapeHtml(tpl.version)}` : ""} ${renderTag(own ? "Personalizat" : "Implicit", own ? "brand" : "neutral")} ${renderTag("Doar vizualizare", "neutral")}`;
    rtPeek.querySelector("[data-rt-peek-note]").textContent = "Doar vizualizare · câmpurile marcate sunt completate cu date de exemplu. Documentul final se generează în MDocs, ca PDF.";
    const canvasEl = rtPeek.querySelector("[data-rt-peek-canvas]");
    const code = tpl?.code || st.docType;
    const swapped = !rtPeek.hidden && rtPeek.dataset.code && rtPeek.dataset.code !== code;
    const unchanged = !rtPeek.hidden && rtPeek.dataset.code === code && !rtPeek.classList.contains("is-closing");
    rtPeek.classList.remove("is-closing");
    rtDrawer.classList.add("has-peek");
    rtPeek.dataset.code = code;
    if (unchanged) { fitRtPeek(); return; }
    canvasEl.classList.remove("is-mail");
    canvasEl.innerHTML = tpl
      ? `<div class="e-permits-dtpl__page e-permits-doc-peek__page"${tpl.background ? ` style="background-image:url('${tpl.background}')"` : ""}><div class="e-permits-dtpl__surface">${dtplFill(tpl.html, tpl.testData || {})}</div></div>`
      : `<p class="e-permits-fo-field__hint">Serviciul nu are încă un șablon pentru ${escapeHtml(st.docType)}.</p>`;
    rtPeek.hidden = false;
    fitRtPeek();
    /* another template in the same panel: a short cross-fade instead of a jump */
    if (swapped) { canvasEl.classList.remove("is-swapping"); void canvasEl.offsetWidth; canvasEl.classList.add("is-swapping"); }
  };
  /* Notificări: the template that step sends — override or the process one — as e-mail
     or as the phone's message (the same preview as the template's Conținut tab) */
  const syncRtPeekNotify = (service, st) => {
    const own = rtDraft.notifyOverrides[st.key];
    const all = [...serviceTemplates(service), ...(servicesStore?.notificationTemplates || [])];
    const tpl = all.find((t) => t.code === (own || st.event));
    const mode = rtDraft.peekMode || "email";
    rtPeek.querySelector("[data-rt-peek-title]").textContent = tpl ? tpl.name : st.event;
    rtPeek.querySelector("[data-rt-peek-subtitle]").innerHTML = `${escapeHtml(st.stepName)} · ${escapeHtml(st.event)}${tpl?.version ? ` · ${escapeHtml(tpl.version)}` : ""} ${renderTag(own ? "Personalizat" : "Din proces", own ? "brand" : "neutral")} ${renderTag("Doar vizualizare", "neutral")}`;
    rtPeek.querySelector("[data-rt-peek-note]").textContent = "Doar vizualizare · câmpurile marcate sunt completate cu date de exemplu. Textul în română.";
    const canvasEl = rtPeek.querySelector("[data-rt-peek-canvas]");
    const code = `${tpl?.code || st.event}|${mode}`;
    const swapped = !rtPeek.hidden && rtPeek.dataset.code && rtPeek.dataset.code !== code;
    const unchanged = !rtPeek.hidden && rtPeek.dataset.code === code && !rtPeek.classList.contains("is-closing");
    rtPeek.classList.remove("is-closing"); rtDrawer.classList.add("has-peek"); rtPeek.dataset.code = code;
    if (unchanged) { fitRtPeek(); return; }
    canvasEl.classList.add("is-mail");
    canvasEl.innerHTML = `
      <div class="e-permits-doc-peek__mail">
        <div class="segmented-control" role="radiogroup" aria-label="Previzualizare pe">
          ${[["email", "E-mail"], ["mobile", "Mobil"]].map(([v, l]) => `<button class="segment-item${mode === v ? " is-selected" : ""}" type="button" role="radio" aria-checked="${mode === v}" data-rt-peek-mode="${v}">${l}</button>`).join("")}
        </div>
        <div class="e-permits-ntpl-preview e-permits-doc-peek__page" aria-live="polite">${tpl ? renderNtplPreviewOf((tpl.texts || {}).ro || {}, mode) : '<p class="e-permits-ntpl-preview__empty">Șablonul nu a fost găsit.</p>'}</div>
      </div>`;
    rtPeek.hidden = false;
    fitRtPeek();
    if (swapped) { canvasEl.classList.remove("is-swapping"); void canvasEl.offsetWidth; canvasEl.classList.add("is-swapping"); }
  };
  /* while the preview is open the drawer narrows (CSS .has-peek: 100vw − 592px, 640–1120)
     so both sit side by side; only below ~1200px is there no room — then the preview
     slides over the drawer (.is-overlay). Decided from the drawer's target width, as the
     drawer is still animating; the A4 page re-scales whenever the canvas resizes. */
  const fitRtPeek = () => {
    if (!rtPeek || rtPeek.hidden) return;
    /* side by side from 1232px (640 drawer + 560 preview + gaps); below that the preview
       is a full-screen panel inside the 16px inset */
    const overlay = window.innerWidth < 1232;
    rtPeek.classList.toggle("is-overlay", overlay);
    rtDrawer.classList.toggle("has-peek-overlay", overlay);
    zoomRtPeek();
  };
  const zoomRtPeek = () => {
    const canvas = rtPeek?.querySelector("[data-rt-peek-canvas]"); const page = canvas?.querySelector(".e-permits-dtpl__page.e-permits-doc-peek__page");
    if (page && canvas.clientWidth) page.style.zoom = String(Math.min(1, (canvas.clientWidth - 48) / 794));
  };
  if (rtPeek && "ResizeObserver" in window) new ResizeObserver(zoomRtPeek).observe(rtPeek.querySelector("[data-rt-peek-canvas]"));
  window.addEventListener("resize", fitRtPeek);

  const renderRtDrawerCore = () => {
    const service = getServiceByCode(rtDraft.serviceCode);
    const rt = rtCurrent(service);
    const rsspTerm = service.rssp.subServices.find((sub) => sub.title === rt.name)?.duration;
    const flowOptions = `
      <option value=""${rtDraft.flow ? "" : " selected"} disabled>Selectează fluxul de procesare</option>
      ${servicesStore.flows.map((flow) => `<option value="${escapeHtml(flow.id)}"${flow.id === rtDraft.flow ? " selected" : ""}>${escapeHtml(flow.name)} · ${escapeHtml(flow.version)}</option>`).join("")}
    `;
    const formOptions = `
      <option value=""${rtDraft.form ? "" : " selected"}>Fără formular electronic</option>
      ${service.geap.forms.map((form) => `<option value="${escapeHtml(form.id)}"${form.id === rtDraft.form ? " selected" : ""}>${escapeHtml(form.name)} · ${escapeHtml(form.version)}${form.status === "Published" ? "" : " (schiță)"}</option>`).join("")}
    `;
    const unitOptions = RT_TERM_UNITS.map((unit) => `<option value="${unit}"${unit === rtDraft.termUnit ? " selected" : ""}>${unit}</option>`).join("");

    rtDrawer.querySelector("[data-rt-subtitle]").textContent = `${rt.name} · ${service.title}`;
    /* one tab per concern (feedback 2026-10-07: too much to scroll) — the tariff
       drawer's tab row (.tabs.tabs--sm.e-permits-tariff__tabs) */
    const outputs = renderRtOutputs(service, rt);
    const panels = {
      general: `
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">General</h3>
        <div class="e-permits-user-create__section-content">
          <div class="e-permits-user-create__grid">
            <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--6">
              <label for="rt-flow">Flux de procesare${requiredMark()}</label>
              ${renderFoSelectControl({ id: "rt-flow", attrs: 'data-rt-flow required', optionsHtml: flowOptions })}
              <p class="e-permits-fo-field__hint" data-rt-flow-link>${renderRtFlowLink()}</p>
              <span class="message message--inline message--error e-permits-fo-field__error" hidden data-rt-flow-error>
                <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-error-filled"></use></svg>
                <span>Selectează fluxul de procesare.</span>
              </span>
            </div>
            <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--6">
              <label for="rt-form">Formular electronic</label>
              ${renderFoSelectControl({ id: "rt-form", attrs: "data-rt-form", optionsHtml: formOptions })}
              <p class="e-permits-fo-field__hint">Formularul completat de solicitant pentru acest tip de solicitare.</p>
            </div>
            <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--6">
              <label for="rt-term">Termen de examinare</label>
              <div class="e-permits-rt__term">
                <div class="e-permits-fo-input">
                  <input id="rt-term" type="text" inputmode="numeric" maxlength="3" placeholder="ex. 30" value="${escapeHtml(rtDraft.termValue)}" data-rt-term>
                </div>
                ${renderFoSelectControl({ id: "rt-term-unit", attrs: "data-rt-term-unit", label: "Unitatea termenului", optionsHtml: unitOptions })}
              </div>
              <span class="message message--inline message--error e-permits-fo-field__error" hidden data-rt-term-error>
                <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-error-filled"></use></svg>
                <span>Introdu un număr de zile între 1 și 255.</span>
              </span>
              <p class="e-permits-fo-field__hint" data-rt-term-hint>${rsspTerm ? `Din RSSP: ${rsspTerm.value} ${escapeHtml(rsspTerm.unit)}` : "Tip de solicitare adăugat în GEAP — fără termen în RSSP."}</p>
            </div>
          </div>
        </div>
      </section>
`,
      forms: `      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">Formulare pe acțiuni</h3>
        <div class="e-permits-user-create__section-content">
          <p class="e-permits-fo-field__hint">Formularul deschis de fiecare acțiune a fluxului. Implicit se folosește formularul definit în proces; schimbă-l doar unde tipul de solicitare cere altceva.</p>
          <div data-rt-actions>${renderRtActionsSection()}</div>
        </div>
      </section>
`,
      documents: outputs.documents,
      notifications: outputs.notifications,
      taxes: outputs.taxes
    };
    const creating = Boolean(rtDraft.pending);
    const strip = rtDrawer.querySelector("[data-rt-steps]");
    strip.hidden = !creating;
    rtDrawer.querySelector("[data-rt-title]").textContent = creating ? "Adaugă tip de solicitare" : "Configurează tipul de solicitare";
    if (creating) {
      rtDraft.step = RT_CREATE_STEPS.findIndex(([id]) => id === rtDraft.tab) + 1;
      rtDraft.maxStep = Math.max(rtDraft.maxStep || 1, rtDraft.step);
      strip.innerHTML = renderStepStrip(RT_CREATE_STEPS.map(([, label]) => label), rtDraft, "data-rt-goto");
      rtDrawerBody.innerHTML = `<div class="e-permits-tariff__panel">${panels[rtDraft.tab]}</div>`;
      const last = rtDraft.step === RT_CREATE_STEPS.length;
      rtDrawer.querySelector("[data-rt-buttons]").innerHTML = `
        ${rtDraft.step === 1 ? '<button class="btn btn-neutral btn-rounded" type="button" data-rt-close>Anulează</button>' : '<button class="btn btn-neutral btn-rounded" type="button" data-rt-back>Înapoi</button>'}
        ${last ? '<button class="btn btn-primary btn-rounded" type="button" data-rt-save>Adaugă tipul</button>' : '<button class="btn btn-primary btn-rounded" type="button" data-rt-next>Continuă</button>'}`;
      renderRtFooterSummary();
      return;
    }
    rtDrawer.querySelector("[data-rt-buttons]").innerHTML = `
      <button class="btn btn-neutral btn-rounded" type="button" data-rt-close>Anulează</button>
      <button class="btn btn-primary btn-rounded" type="button" data-rt-save>Salvează</button>`;
    rtDrawerBody.innerHTML = `
      <div class="tabs tabs--sm e-permits-tariff__tabs">
        <div class="tab-buttons" role="tablist" aria-label="Secțiunile tipului de solicitare">
          ${RT_DRAWER_TABS.map(([id, label]) => {
            const active = id === rtDraft.tab;
            return `<button class="tab-button${active ? " active" : ""}" id="rt-tab-${id}" type="button" role="tab" aria-selected="${active}" aria-controls="rt-panel" tabindex="${active ? "0" : "-1"}" data-rt-tab="${id}"><span>${label}</span></button>`;
          }).join("")}
        </div>
      </div>
      <div class="e-permits-tariff__panel" id="rt-panel" role="tabpanel" aria-labelledby="rt-tab-${rtDraft.tab}">
        ${panels[rtDraft.tab]}
      </div>
    `;
    renderRtFooterSummary();
  };

  /* partial refreshes keep focus and the drawer's scroll position */
  const refreshRtActions = ({ list = true, chips = true } = {}) => {
    const rows = rtActionRows();

    if (chips) {
      const chipsEl = rtDrawerBody.querySelector("[data-rt-chips]");
      if (chipsEl) chipsEl.innerHTML = renderRtChips(rows);
    }

    if (list) {
      const listEl = rtDrawerBody.querySelector("[data-rt-list]");
      if (listEl) listEl.innerHTML = renderRtActionList();
    }

    renderRtFooterSummary();
  };

  const openRequestTypeDrawer = (rtId, pending = null) => {
    const service = getServiceByCode(serviceProfileState.code);
    const rt = pending || service?.geap.requestTypes.find((item) => item.id === rtId);

    if (!rtDrawer || !rt) {
      return;
    }

    rtDraft = {
      serviceCode: service.code,
      rtId,
      flow: rt.flow || "",
      form: rt.form || "",
      termValue: rt.term ? String(rt.term.value) : "",
      termUnit: rt.term?.unit || RT_TERM_UNITS[0],
      actions: { ...(rt.actions || {}) },
      docOverrides: { ...(rt.docOverrides || {}) },
      notifyOverrides: { ...(rt.notifyOverrides || {}) },
      tab: "general",
      pending,
      step: 1,
      maxStep: 1,
      filter: "all",
      query: "",
      collapsed: new Set()
    };
    rtReturnFocus = document.activeElement;
    renderRtDrawer();
    rtDrawer.hidden = false;
    document.body.classList.add("is-user-create-open");
    requestAnimationFrame(() => rtDrawer.querySelector("#rt-flow")?.focus());
  };

  const closeRequestTypeDrawer = () => {
    if (!rtDrawer || rtDrawer.hidden || rtDrawer.classList.contains("is-closing")) {
      return;
    }

    closeFoSelect();
    rtDrawer.classList.add("is-closing");
    window.setTimeout(() => {
      rtDrawer.hidden = true;
      rtDrawer.classList.remove("is-closing");
      document.body.classList.remove("is-user-create-open");
      if (rtPeek) rtPeek.hidden = true;
      rtDrawer.classList.remove("has-peek", "has-peek-overlay");
      rtDraft = null;
      rtReturnFocus?.focus?.();
    }, 120);
  };

  const saveRequestTypeDrawer = () => {
    const service = getServiceByCode(rtDraft.serviceCode);
    const rt = rtCurrent(service);
    const termValue = rtDraft.termValue.trim();
    const termOk = !termValue || (/^\d+$/.test(termValue) && Number(termValue) >= 1 && Number(termValue) <= 255);
    /* the flow and term errors are shown on General */
    if ((!rtDraft.flow || !termOk) && rtDraft.tab !== "general") {
      rtDraft.tab = "general";
      renderRtDrawer();
    }
    const flowButton = rtDrawerBody.querySelector("#rt-flow");
    const termInput = rtDrawerBody.querySelector("[data-rt-term]");

    /* the fields exist only on General; from another tab a valid draft saves directly */
    if (flowButton) {
      setFieldError(flowButton, rtDrawerBody.querySelector("[data-rt-flow-error]"), !rtDraft.flow);
      setFieldError(termInput, rtDrawerBody.querySelector("[data-rt-term-error]"), !termOk);
      rtDrawerBody.querySelector("[data-rt-term-hint]").hidden = !termOk;
    }

    if (!rtDraft.flow || !termOk) {
      (!rtDraft.flow ? flowButton : termInput).focus();
      return;
    }

    /* overrides for actions that are not in the chosen flow are dropped */
    const flow = getFlowById(rtDraft.flow);
    const keys = new Set(passport.flowActions(flow).map(({ step, action }) => passport.actionKey(step, action)));
    rt.flow = rtDraft.flow;
    rt.form = rtDraft.form || null;
    rt.term = termValue ? { value: Number(termValue), unit: rtDraft.termUnit } : null;
    rt.actions = Object.fromEntries(Object.entries(rtDraft.actions).filter(([key]) => keys.has(key)));
    rt.docOverrides = { ...rtDraft.docOverrides };
    rt.notifyOverrides = { ...rtDraft.notifyOverrides };

    const changed = passport.overrideCount(rt, flow);
    const added = Boolean(rtDraft.pending);
    if (added) service.geap.requestTypes.push(rt);
    logServiceEvents(service.code, [{
      at: localIsoNow(), user: currentUserName(), type: added ? "Adăugare tip solicitare" : "Configurare tip solicitare", status: "Reușit",
      detail: `${rt.name}${added ? " — postproces eligibil" : ""}: ${flow.name} ${flow.version}, ${rt.form ? "cu formular" : "fără formular"}, ${changed} acțiuni modificate`
    }]);
    closeRequestTypeDrawer();
    renderServiceProfile();
    showShellToast(added ? `„${rt.name}” poate primi cereri pentru acest serviciu.` : `Tipul de solicitare „${rt.name}” a fost salvat.`, "success", added ? "Tip de solicitare adăugat" : "");
  };

  rtDrawer?.addEventListener("change", (event) => {
    const target = event.target;

    if (!rtDraft) {
      return;
    }

    if (target.matches("[data-rt-doc], [data-rt-notify]")) {
      const isDoc = target.dataset.rtDoc !== undefined;
      const map = isDoc ? rtDraft.docOverrides : rtDraft.notifyOverrides;
      const key = isDoc ? target.dataset.rtDoc : target.dataset.rtNotify;
      if (target.value && target.value !== "default") map[key] = target.value; else delete map[key];
      renderRtDrawer();
      rtDrawerBody.querySelector(`[data-rt-${isDoc ? "doc" : "notify"}="${CSS.escape(key)}"]`)?.closest("[data-fo-native-select]")?.querySelector(".e-permits-fo-select__button")?.focus();
      return;
    }

    if (target.matches("[data-rt-flow]")) {
      rtDraft.flow = target.value;
      rtDraft.filter = "all";
      rtDraft.collapsed = new Set();
      setFieldError(rtDrawerBody.querySelector("#rt-flow"), rtDrawerBody.querySelector("[data-rt-flow-error]"), false);
      const actionsBox = rtDrawerBody.querySelector("[data-rt-actions]");
      if (actionsBox) actionsBox.innerHTML = renderRtActionsSection();
      rtDrawerBody.querySelector("[data-rt-flow-link]").innerHTML = renderRtFlowLink();
      renderRtFooterSummary();
    } else if (target.matches("[data-rt-form]")) {
      rtDraft.form = target.value;
    } else if (target.matches("[data-rt-term-unit]")) {
      rtDraft.termUnit = target.value;
    } else if (target.matches("[data-rt-action]")) {
      const row = rtActionRows().find(({ step, action }) => passport.actionKey(step, action) === target.dataset.rtAction);
      rtDraft.actions = passport.setActionForm(rtDraft.actions, row.step, row.action, target.value === "default" ? "" : target.value);
      refreshRtActions();
      rtDrawerBody.querySelector(`[data-rt-action="${CSS.escape(target.dataset.rtAction)}"]`)
        ?.closest("[data-fo-native-select]")?.querySelector(".e-permits-fo-select__button")?.focus();
    }
  });

  rtDrawer?.addEventListener("input", (event) => {
    if (!rtDraft) {
      return;
    }

    if (event.target.matches("[data-rt-search]")) {
      rtDraft.query = event.target.value;
      refreshRtActions({ chips: false });
    } else if (event.target.matches("[data-rt-term]")) {
      event.target.value = event.target.value.replace(/\D/g, "").slice(0, 3);
      rtDraft.termValue = event.target.value;
      setFieldError(event.target, rtDrawerBody.querySelector("[data-rt-term-error]"), false);
      rtDrawerBody.querySelector("[data-rt-term-hint]").hidden = false;
    }
  });

  rtDrawer?.addEventListener("click", (event) => {
    if (!rtDraft) {
      return;
    }

    if (event.target.closest("[data-rt-close]")) {
      closeRequestTypeDrawer();
      return;
    }

    if (event.target.closest("[data-rt-save]")) {
      saveRequestTypeDrawer();
      return;
    }

    /* create steps: Continuă checks General (flux, termen) before leaving it */
    const rtGoto = event.target.closest("[data-rt-goto]");
    if (event.target.closest("[data-rt-next]") || event.target.closest("[data-rt-back]") || rtGoto) {
      closeFoSelect();
      const cur = rtDraft.step;
      const target = rtGoto ? Number(rtGoto.dataset.rtGoto) : event.target.closest("[data-rt-next]") ? cur + 1 : cur - 1;
      if (cur === 1 && target > 1) {
        const termValue = rtDraft.termValue.trim();
        const termOk = !termValue || (/^\d+$/.test(termValue) && Number(termValue) >= 1 && Number(termValue) <= 255);
        const flowButton = rtDrawerBody.querySelector("#rt-flow");
        const termInput = rtDrawerBody.querySelector("[data-rt-term]");
        setFieldError(flowButton, rtDrawerBody.querySelector("[data-rt-flow-error]"), !rtDraft.flow);
        setFieldError(termInput, rtDrawerBody.querySelector("[data-rt-term-error]"), !termOk);
        rtDrawerBody.querySelector("[data-rt-term-hint]").hidden = !termOk;
        if (!rtDraft.flow || !termOk) { (!rtDraft.flow ? flowButton : termInput).focus(); return; }
      }
      rtDraft.tab = RT_CREATE_STEPS[Math.min(Math.max(target, 1), RT_CREATE_STEPS.length) - 1][0];
      renderRtDrawer();
      rtDrawerBody.scrollTop = 0;
      return;
    }

    const resetOverride = event.target.closest("[data-rt-doc-reset], [data-rt-notify-reset]");
    if (resetOverride) {
      if (resetOverride.dataset.rtDocReset !== undefined) delete rtDraft.docOverrides[resetOverride.dataset.rtDocReset];
      else delete rtDraft.notifyOverrides[resetOverride.dataset.rtNotifyReset];
      renderRtDrawer();
      return;
    }

    const peekMode = event.target.closest("[data-rt-peek-mode]");
    if (peekMode) { rtDraft.peekMode = peekMode.dataset.rtPeekMode; syncRtPeek(); rtPeek.querySelector(`[data-rt-peek-mode="${rtDraft.peekMode}"]`)?.focus(); return; }
    const peekBtn = event.target.closest("[data-rt-doc-peek]");
    if (peekBtn) {
      const key = peekBtn.dataset.rtDocPeek;
      rtDraft.peek = rtDraft.peek === key ? null : key;
      renderRtDrawer();
      rtDrawerBody.querySelector(`[data-rt-doc-peek="${CSS.escape(key)}"]`)?.focus();
      return;
    }
    if (event.target.closest("[data-rt-peek-close]")) {
      const key = rtDraft.peek; rtDraft.peek = null; renderRtDrawer();
      rtDrawerBody.querySelector(`[data-rt-doc-peek="${CSS.escape(key || "")}"]`)?.focus();
      return;
    }

    const rtTab = event.target.closest("[data-rt-tab]");

    if (rtTab) {
      closeFoSelect();
      rtDraft.tab = rtTab.dataset.rtTab;
      renderRtDrawer();
      rtDrawerBody.querySelector(`[data-rt-tab="${rtDraft.tab}"]`)?.focus();
      return;
    }

    const filter = event.target.closest("[data-rt-filter]");

    if (filter) {
      rtDraft.filter = filter.dataset.rtFilter;
      refreshRtActions();
      return;
    }

    const step = event.target.closest("[data-rt-step]");

    if (step) {
      const id = step.dataset.rtStep;
      rtDraft.collapsed.has(id) ? rtDraft.collapsed.delete(id) : rtDraft.collapsed.add(id);
      refreshRtActions({ chips: false });
      rtDrawerBody.querySelector(`[data-rt-step="${CSS.escape(id)}"]`)?.focus();
      return;
    }

    const reset = event.target.closest("[data-rt-reset]");

    if (reset) {
      const key = reset.dataset.rtReset;
      const row = rtActionRows().find(({ step: s, action }) => passport.actionKey(s, action) === key);
      rtDraft.actions = passport.setActionForm(rtDraft.actions, row.step, row.action, "");
      refreshRtActions();
      rtDrawerBody.querySelector(`[data-rt-action="${CSS.escape(key)}"]`)
        ?.closest("[data-fo-native-select]")?.querySelector(".e-permits-fo-select__button")?.focus();
    }
  });

  rtDrawer?.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && rtDraft) {
      event.preventDefault();
      /* Esc closes the preview first, then the drawer */
      if (rtDraft.peek) { const key = rtDraft.peek; rtDraft.peek = null; renderRtDrawer(); rtDrawerBody.querySelector(`[data-rt-doc-peek="${CSS.escape(key)}"]`)?.focus(); return; }
      closeRequestTypeDrawer();
    }
  });

  /* ---- tax editor (drawer) — a tax = one tariff + its application rule ----
     Draft-based: nothing is written until Salvează / Publică. Sections follow the
     question order: which tariff · when · for whom (condition) · how much ·
     until when · exemptions · recurrence. Rules: GEAP.servicePassport.validateTax.
     The drawer keeps the data-pay-* hooks of the former payment editor. */
  const payDrawer = document.querySelector("[data-pay-drawer]");
  const payDrawerBody = payDrawer?.querySelector("[data-pay-body]");
  const PAY_FREQUENCIES = [["Anual", "Anual"], ["Interval", "Interval configurabil (luni)"]];
  let payDraft = null;
  let payReturnFocus = null;
  /* "Tarif nou" hands over to the tariff drawer and comes back with the new tariff */
  let taxAwaitingTariff = null;
  let taxResumeTariffId = null;

  /* US-221 AC-45: „Termenul de achitare (zile)” from Setări › Plată prefills every new tax */
  const defaultPaymentTerm = (service) => String(serviceConfig(service).payTerm || "30");

  const payFieldError = (key) => payDraft.errors[key] ? `
    <span class="message message--inline message--error e-permits-fo-field__error">
      <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-error-filled"></use></svg>
      <span>${escapeHtml(payDraft.errors[key])}</span>
    </span>
  ` : "";

  const paySegmented = (labelId, label, options, current, attr, { disabled = () => false, hint = "", error = "" } = {}) => `
    <div class="e-permits-fo-field">
      <label id="${labelId}">${escapeHtml(label)}${requiredMark()}</label>
      <div class="segmented-control" role="radiogroup" aria-labelledby="${labelId}">
        ${options.map(([value, text]) => `
          <button class="segment-item${current === value ? " is-selected" : ""}" type="button" role="radio" aria-checked="${current === value ? "true" : "false"}" ${attr}="${value}"${disabled(value) ? " disabled" : ""}>${escapeHtml(text)}</button>
        `).join("")}
      </div>
      ${error ? payFieldError(error) : ""}
      ${hint ? `<p class="e-permits-fo-field__hint">${hint}</p>` : ""}
    </div>
  `;

  /* Tarif: the price the tax is computed from — the service's tariffs first, then global
     (flat list: each option says its source, the fo-select has no group headings) */
  const renderTaxTariff = (service) => {
    const tariff = getTariff(payDraft.tariffId);
    const own = (servicesStore.tariffs || []).filter((t) => t.scope === service.code);
    const global = (servicesStore.tariffs || []).filter((t) => t.scope === "global");
    const option = (t) => {
      const check = passport.tariffEligibility(t, service.code, payDraft.generation);
      const source = t.scope === "global" ? "global" : t.source === "GEAP" ? "manual" : `din ${t.source}`;
      return `<option value="${escapeHtml(t.id)}"${t.id === payDraft.tariffId ? " selected" : ""}${check.ok || t.id === payDraft.tariffId ? "" : " disabled"}>${escapeHtml(`${t.name} · ${tariffValueText(t)} · ${source}`)}${check.ok ? "" : ` — ${escapeHtml(check.reason)}`}</option>`;
    };
    return `
      <div class="e-permits-fo-field">
        <label for="pay-tariff">Tarif${requiredMark()}</label>
        ${renderFoSelectControl({ id: "pay-tariff", attrs: "data-pay-tariff", optionsHtml: `
          <option value=""${payDraft.tariffId ? "" : " selected"} disabled>Alege tariful din care se calculează taxa</option>
          ${own.map(option).join("")}
          ${global.map(option).join("")}
        ` })}
        ${payFieldError("tariffId")}
        ${tariff && !payDraft.errors.tariffId ? `<p class="e-permits-fo-field__hint">${escapeHtml([tariff.code, tariff.type, tariff.legalBasis].filter(Boolean).join(" · "))}${tariff.source !== "GEAP" ? ` · preluat din ${escapeHtml(tariff.source)}, nu se editează aici` : ""}</p>` : ""}
      </div>
      <p class="e-permits-tax__new-tariff">Tariful lipsește din RSSP / eAPL? <button class="link link-primary link-md" type="button" data-tax-new-tariff>Creează un tarif nou</button></p>
    `;
  };

  /* Condiție: always, or only for some values of one or more classifiers chosen at
     initiation (AND). Each checked value of each classifier makes a scenario; the
     scenarios get their own calculation in Calcul (user, Figma 04h, 2026-10-08). */
  const condErrorKey = (base, index) => base + (payDraft.conditions.length > 1 ? `:${index}` : "");
  const renderTaxCondition = (service) => {
    const classifiers = conditionClassifiers(service);
    const tree = conditionTree();
    const conditions = payDraft.conditions;
    const conditional = Boolean(conditions);
    const used = (conditions || []).map((c) => c.classifier);
    const block = (condition, index) => {
      const classifier = getConditionClassifier(condition.classifier);
      const free = classifiers.filter((c) => c.code === condition.classifier || !used.includes(c.code));
      const classifierKey = condErrorKey("conditionClassifier", index);
      const valuesKey = condErrorKey("conditionValues", index);
      return `
        <div class="e-permits-tax-cond" data-pay-condition="${index}">
          <div class="e-permits-tax-cond__head">
            <label for="pay-condition-classifier-${index}">Clasificator${conditions.length > 1 ? ` ${index + 1}` : ""}${requiredMark()}</label>
            ${conditions.length > 1 ? `<button class="btn btn-text-destructive btn-sm" type="button" data-pay-condition-remove="${index}">Elimină</button>` : ""}
          </div>
          <div class="e-permits-fo-field">
            ${renderFoSelectControl({ id: `pay-condition-classifier-${index}`, attrs: `data-pay-condition-classifier="${index}"`, error: Boolean(payDraft.errors[classifierKey]), optionsHtml: `
              <option value=""${classifier ? "" : " selected"} disabled>Alege clasificatorul</option>
              ${free.map((c) => `<option value="${escapeHtml(c.code)}"${c.code === classifier?.code ? " selected" : ""}>${escapeHtml(c.name)}</option>`).join("")}
            ` })}
            ${payFieldError(classifierKey)}
          </div>
          ${classifier ? `
            <div class="e-permits-fo-field">
              <span class="e-permits-tax-cond__label" id="pay-condition-values-label-${index}">Valori pentru care se aplică taxa${requiredMark()}</span>
              <div class="e-permits-pay__exemptions" role="group" aria-labelledby="pay-condition-values-label-${index}">
                ${classifier.values.map((value) => {
                  const ancestors = passport.valueAncestors(tree, classifier.code, value.code);
                  const coveredBy = ancestors.find((code) => condition.values.includes(code));
                  const checked = condition.values.includes(value.code);
                  const note = coveredBy && !checked ? `Inclus în ${conditionValueLabel(classifier.code, coveredBy).split(" — ")[0]} · bifează pentru o sumă separată`
                    : coveredBy && checked ? `Excepție de la ${conditionValueLabel(classifier.code, coveredBy).split(" — ")[0]}` : "";
                  return `
                    <label class="checkbox checkbox--medium e-permits-tax-cond__value" style="--tax-cond-level: ${Math.min(ancestors.length, 3)}">
                      <input class="checkbox-input" type="checkbox" value="${escapeHtml(value.code)}" data-pay-condition-value="${index}"${checked ? " checked" : ""}>
                      <span class="checkbox-custom" aria-hidden="true"></span>
                      <span class="checkbox-texts"><span class="checkbox-label">${escapeHtml(value.label)}</span>${note ? `<span class="checkbox-description">${escapeHtml(note)}</span>` : ""}</span>
                    </label>
                  `;
                }).join("")}
              </div>
              ${payFieldError(valuesKey)}
              ${classifier.hierarchical && !payDraft.errors[valuesKey] ? '<p class="e-permits-fo-field__hint">Clasificator pe niveluri: o valoare bifată include tot ce e sub ea. Bifează și o subdiviziune ca să-i dai o sumă separată — se aplică cea mai specifică.</p>' : ""}
            </div>
          ` : ""}
        </div>
      `;
    };
    return `
      ${paySegmented("pay-condition-label", "Se aplică", [["always", "Întotdeauna"], ["conditional", "Doar pentru anumite valori"]], conditional ? "conditional" : "always", "data-pay-condition-mode", {
        disabled: (value) => value === "conditional" && !classifiers.length,
        hint: classifiers.length
          ? "Ex.: la reperfectare, tariful depinde de motivul ales de solicitant la inițierea solicitării."
          : "Serviciul nu are clasificatoare pentru condiții. Adaugă-le în Clasificatoare specifice."
      })}
      ${conditional ? `
        <div class="e-permits-tax-cond__list">${conditions.map(block).join("")}</div>
        <div class="e-permits-tax-cond__add">
          <button class="btn btn-neutral btn-sm" type="button" data-pay-condition-add${used.length >= classifiers.length ? " disabled" : ""}>
            <svg class="icon" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-large"></use></svg>
            Adaugă clasificator
          </button>
          ${renderInfoNote(`${conditions.length > 1
            ? "<strong>Taxa se aplică doar dacă toate condițiile sunt îndeplinite.</strong> Valoarea o alege solicitantul în formular, la inițiere."
            : "Valoarea o alege solicitantul în formular, la inițiere."}${used.length >= classifiers.length && classifiers.length > 1 ? " Toate clasificatoarele serviciului sunt folosite." : ""}`)}
        </div>
      ` : ""}
    `;
  };

  /* Calcul: the tariff's sum as is (default) or a reduction of it. A formula
     lives on the tariff („Calcul prin formulă”), so there is one formula level.
     A conditional tax computes per scenario — one amount for each combination. */
  const draftTax = () => ({ conditions: payDraft.conditions || [], scenarioCalc: payDraft.scenarioCalc, calc: payDraft.calc });
  /* hierarchy: a parent row covers what is not an exception; a child row is the exception */
  const scenarioNote = (scenario) => {
    const tree = conditionTree();
    const checked = (code) => (payDraft.conditions || []).find((c) => c.classifier === code)?.values || [];
    return scenario.picks.map(({ classifier, value }) => {
      const parent = passport.valueAncestors(tree, classifier, value).find((code) => checked(classifier).includes(code));
      if (parent) return `excepție de la ${conditionValueLabel(classifier, parent).split(" — ")[0]}`;
      const children = Object.keys(tree[classifier] || {}).filter((code) => passport.valueAncestors(tree, classifier, code).includes(value));
      if (!children.length) return "";
      /* only the direct exceptions: 47.3 under a checked 47 belongs to 47's row */
      const excepted = children.filter((code) => checked(classifier).includes(code) &&
        passport.valueAncestors(tree, classifier, code).find((up) => checked(classifier).includes(up)) === value);
      return excepted.length ? `restul subdiviziunilor, fără ${excepted.map((code) => conditionValueLabel(classifier, code).split(" — ")[0]).join(", ")}` : "cu toate subdiviziunile";
    }).filter(Boolean).join(" · ");
  };
  const draftScenarioCalc = (key) => payDraft.scenarioCalc[key] || (payDraft.scenarioCalc[key] = { mode: "tarif", percent: "" });
  const renderScenarioCalc = (tariff, scenarios) => {
    if (!scenarios.length) {
      return `<p class="e-permits-fo-field__hint">Bifează valorile din Condiție — fiecare combinație primește calculul ei.</p>`;
    }
    if (scenarios.length > passport.TAX_SCENARIO_MAX) {
      return `
        <span class="message message--inline message--error e-permits-fo-field__error">
          <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-error-filled"></use></svg>
          <span>Prea multe combinații (${scenarios.length}). Bifează mai puține valori — cel mult ${passport.TAX_SCENARIO_MAX} scenarii.</span>
        </span>
      `;
    }
    const tax = draftTax();
    const row = (scenario, index) => {
      const calc = draftScenarioCalc(scenario.key);
      const reduce = calc.mode === "reducere";
      const label = scenarioLabel(scenario);
      const sum = tariff ? passport.taxAmount(tax, tariff, {}, { scenario: scenario.key }) : null;
      const percent = String(calc.percent || "").trim();
      const result = !tariff ? "—"
        : tariff.formula ? (reduce && percent ? `Formula − ${percent}%` : "Formula tarifului")
        : reduce && !percent ? "—"
        : sum?.ok ? money(sum.value, tariff.currency) : "—";
      const percentKey = `percent:${scenario.key}`;
      return `
        <li class="e-permits-stack__item e-permits-tax-scn__row" data-pay-scn="${index}">
          <span class="e-permits-stack__main e-permits-tax-scn__label" id="pay-scn-label-${index}">${scenario.picks.map(({ classifier, value }) =>
            `<span>${escapeHtml(conditionValueLabel(classifier, value))}</span>`).join("")}${scenarioNote(scenario) ? `<span class="e-permits-tax-scn__note">${escapeHtml(scenarioNote(scenario))}</span>` : ""}</span>
          <div class="e-permits-stack__actions">
            <div class="e-permits-tax-scn__calc">
              ${renderFoSelectControl({ id: `pay-scn-calc-${index}`, attrs: `data-pay-scn-calc="${index}"`, label: `Calcul: ${label}`, optionsHtml: passport.TAX_CALC.map((value) =>
                `<option value="${value}"${calc.mode === value ? " selected" : ""}>${escapeHtml(passport.TAX_CALC_LABELS[value])}</option>`).join("") })}
            </div>
            ${reduce ? `
              <div class="e-permits-fo-input e-permits-tax-scn__percent${payDraft.errors[percentKey] ? " is-error" : ""}">
                <input id="pay-percent-${index}" type="text" inputmode="numeric" maxlength="3" value="${escapeHtml(calc.percent || "")}" data-pay-scn-percent="${index}" placeholder="0" aria-label="Reducere (%): ${escapeHtml(label)}" autocomplete="off">
                <label class="e-permits-fo-input__suffix" for="pay-percent-${index}" aria-hidden="true">%</label>
              </div>
            ` : '<span class="e-permits-tax-scn__percent" aria-hidden="true"></span>'}
            <span class="e-permits-tax-scn__sum">${escapeHtml(result)}</span>
          </div>
          ${payDraft.errors[percentKey] ? `<div class="e-permits-tax-scn__error">${payFieldError(percentKey)}</div>` : ""}
        </li>
      `;
    };
    return `
      <div class="e-permits-fo-field">
        <span class="e-permits-tax-cond__label">Calcul pe scenarii${requiredMark()}</span>
        <div class="e-permits-stack e-permits-tax-scn"><div class="e-permits-stack__group"><ul class="e-permits-stack__list" role="list">${scenarios.map(row).join("")}</ul></div></div>
        <p class="e-permits-fo-field__hint">${scenarios.length} ${scenarios.length === 1 ? "scenariu" : "scenarii"} — câte o sumă pentru fiecare combinație de valori bifate. Reducerea se aplică doar scenariului ales${tariff?.formula ? "; formula se calculează la generarea notei" : ""}.</p>
      </div>
    `;
  };
  const renderTaxCalc = () => {
    const tariff = getTariff(payDraft.tariffId);
    if (payDraft.conditions) return renderScenarioCalc(tariff, passport.taxScenarios(draftTax()));
    const mode = payDraft.calc.mode === "reducere" ? "reducere" : "tarif";
    const preview = tariff ? passport.taxAmount({ calc: payDraft.calc }, tariff, {}) : null;
    const tariffSum = tariff ? (tariff.formula ? `formula tarifului (${formulaReadable(tariff.expression)})` : money(tariff.amount, tariff.currency)) : "";
    const percent = String(payDraft.calc.percent || "").trim();
    return `
      ${paySegmented("pay-calc-label", "Calcul", passport.TAX_CALC.map((value) => [value, passport.TAX_CALC_LABELS[value]]), mode, "data-pay-calc", {
        hint: mode === "tarif"
          ? (tariff ? `Taxa = tariful: <strong>${escapeHtml(tariffSum)}</strong>${tariff.formula ? ", calculată la generarea notei" : ""}. Cazul cel mai des întâlnit.` : "Taxa este egală cu tariful ales.")
          : "Procent scăzut din tarif (ex. reducere pentru IMM-uri)."
      })}
      ${mode === "reducere" ? `
        <div class="e-permits-user-create__grid">
          <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--4">
            <label for="pay-percent">Reducere (%)${requiredMark()}</label>
            <div class="e-permits-fo-input${payDraft.errors.percent ? " is-error" : ""}">
              <input id="pay-percent" type="text" inputmode="numeric" maxlength="3" value="${escapeHtml(payDraft.calc.percent || "")}" data-pay-calc-field="percent" placeholder="0" autocomplete="off">
              <label class="e-permits-fo-input__suffix" for="pay-percent" aria-hidden="true">%</label>
            </div>
            ${payFieldError("percent")}
            ${!payDraft.errors.percent && tariff && percent
              ? (tariff.formula
                ? `<p class="e-permits-fo-field__hint">De plată: rezultatul formulei tarifului − <strong>${escapeHtml(percent)}%</strong>, calculat la generarea notei</p>`
                : preview?.ok ? `<p class="e-permits-fo-field__hint">De plată: <strong>${escapeHtml(money(preview.value, tariff.currency))}</strong> din ${escapeHtml(money(tariff.amount, tariff.currency))}</p>` : "")
              : ""}
          </div>
        </div>
      ` : ""}
    `;
  };

  const renderPayDrawer = () => {
    const service = getServiceByCode(payDraft.serviceCode);
    const existing = serviceTaxes(service).find((tax) => tax.id === payDraft.id);
    const flow = requestTypeFlow(service, payDraft.requestType);
    const initiation = payDraft.moment === passport.PAYMENT_MOMENTS[0];
    const manual = payDraft.generation === "Manual";
    const tariff = getTariff(payDraft.tariffId);
    const rtOptions = `
      <option value=""${payDraft.requestType ? "" : " selected"} disabled>Selectează tipul de solicitare</option>
      ${service.geap.requestTypes.map((rt) => `<option value="${escapeHtml(rt.name)}"${rt.name === payDraft.requestType ? " selected" : ""}>${escapeHtml(rt.name)}</option>`).join("")}
    `;
    const momentOptions = `
      <option value=""${payDraft.moment ? "" : " selected"} disabled>Selectează momentul generării</option>
      ${passport.PAYMENT_MOMENTS.map((moment) => {
        const allowed = passport.momentAllowed(flow, moment);
        return `<option value="${escapeHtml(moment)}"${moment === payDraft.moment ? " selected" : ""}${allowed || moment === payDraft.moment ? "" : " disabled"}>${escapeHtml(moment)}${allowed ? "" : " — fără ramificație de plată în flux"}</option>`;
      }).join("")}
    `;
    const input = (id, key, value, { label, hint = "", required = false, span = 4, numeric = false, placeholder = "" }) => `
      <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
        <label for="${id}">${escapeHtml(label)}${required ? requiredMark() : ""}</label>
        <div class="e-permits-fo-input${payDraft.errors[key] ? " is-error" : ""}">
          <input id="${id}" type="text"${numeric ? ' inputmode="numeric" maxlength="3"' : ""} value="${escapeHtml(value || "")}" placeholder="${escapeHtml(placeholder)}" data-pay-field="${key}" autocomplete="off">
        </div>
        ${payFieldError(key)}
        ${hint && !payDraft.errors[key] ? `<p class="e-permits-fo-field__hint">${hint}</p>` : ""}
      </div>
    `;
    const section = (title, content, attr = "") => `
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">${escapeHtml(title)}</h3>
        <div class="e-permits-user-create__section-content"${attr}>${content}</div>
      </section>
    `;

    payDrawer.querySelector("[data-pay-title]").textContent = existing ? "Editează taxa" : "Taxă nouă";
    payDrawer.querySelector("[data-pay-subtitle]").textContent = existing
      ? `${tariff?.name || ""} · ${TAX_STATUS(existing)} · v${existing.version}`
      : service.title;
    payDrawerBody.innerHTML = `
      ${section("Tarif", renderTaxTariff(service))}
      ${section("Aplicare", `
        <div class="e-permits-user-create__grid">
          <div class="e-permits-fo-field e-permits-user-create__field">
            <label for="pay-request-type">Tip solicitare${requiredMark()}</label>
            ${renderFoSelectControl({ id: "pay-request-type", attrs: "data-pay-request-type", optionsHtml: rtOptions })}
            ${payFieldError("requestType")}
            ${!payDraft.errors.requestType && tariff?.requestType && tariff.requestType === payDraft.requestType && tariff.source !== "GEAP" ? `<p class="e-permits-fo-field__hint">Preluat din ${escapeHtml(tariff.source)} odată cu tariful.</p>` : ""}
          </div>
          <div class="e-permits-fo-field e-permits-user-create__field">
            <label for="pay-moment">Moment generare${requiredMark()}</label>
            ${renderFoSelectControl({ id: "pay-moment", attrs: "data-pay-moment", optionsHtml: momentOptions })}
            ${payFieldError("moment")}
            ${payDraft.errors.moment ? "" : `<p class="e-permits-fo-field__hint">${payDraft.requestType
              ? (flow ? `Momentele vin din ramificațiile de plată ale fluxului „${escapeHtml(flow.name)}”; inițierea e mereu disponibilă.` : "Tipul de solicitare nu are flux — doar inițierea solicitării e disponibilă.")
              : "Alege întâi tipul de solicitare."}</p>`}
          </div>
        </div>
        ${paySegmented("pay-generation-label", "Tip generare", [["Automat", "Automat"], ["Manual", "Manual"]], payDraft.generation, "data-pay-generation", {
          disabled: (value) => initiation && value === "Manual",
          error: "generation",
          hint: initiation ? "La inițierea solicitării taxa e întotdeauna automată."
            : manual ? "Specialistul generează nota în dosar, după verificare." : "Nota se generează automat la momentul ales."
        })}
      `)}
      ${section("Condiție", renderTaxCondition(service))}
      ${section("Calcul", renderTaxCalc(), " data-pay-calc-section")}
      ${section("Termen de achitare", `
        <div class="e-permits-user-create__grid">
          ${input("pay-term", "term", payDraft.term, { label: "Termen (zile)", required: true, numeric: true, span: 6,
            hint: `Precompletat din Setări › Plată (${escapeHtml(defaultPaymentTerm(service))} zile).` })}
        </div>
      `)}
      ${section("Scutiri", manual ? `
        <div class="e-permits-pay__exemptions">
          ${(servicesStore.exemptionOptions || []).map((option) => `
            <label class="checkbox checkbox--medium">
              <input class="checkbox-input" type="checkbox" value="${escapeHtml(option)}" data-pay-exemption${payDraft.exemptions.includes(option) ? " checked" : ""}>
              <span class="checkbox-custom" aria-hidden="true"></span>
              <span class="checkbox-texts"><span class="checkbox-label">${escapeHtml(option)}</span></span>
            </label>
          `).join("")}
          <label class="checkbox checkbox--medium">
            <input class="checkbox-input" type="checkbox" data-pay-removable${payDraft.removable ? " checked" : ""}>
            <span class="checkbox-custom" aria-hidden="true"></span>
            <span class="checkbox-texts"><span class="checkbox-label">Specialistul poate scoate taxa din notă</span></span>
          </label>
        </div>
        ${payFieldError("exemptions")}
      ` : renderInfoNote("Scutirile se aleg de specialist, deci sunt disponibile doar pentru taxele generate manual."))}
      ${section("Recurență", `
        ${renderToggle({ label: "Taxă recurentă", description: "Generează periodic nota de plată pe actul permisiv emis (ex. taxa anuală).", checked: Boolean(payDraft.recurring), attrs: "data-pay-recurring" })}
        ${payDraft.recurring ? `
          <div class="e-permits-user-create__grid">
            <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--6">
              <label for="pay-frequency">Frecvență${requiredMark()}</label>
              ${renderFoSelectControl({ id: "pay-frequency", attrs: "data-pay-frequency", optionsHtml: `
                <option value=""${payDraft.frequency ? "" : " selected"} disabled>Selectează frecvența</option>
                ${PAY_FREQUENCIES.map(([value, label]) => `<option value="${value}"${value === payDraft.frequency ? " selected" : ""}>${label}</option>`).join("")}
              ` })}
              ${payFieldError("frequency")}
            </div>
            ${payDraft.frequency === "Interval" ? input("pay-months", "months", payDraft.months, { label: "Interval (luni)", required: true, numeric: true, span: 6 }) : ""}
            ${input("pay-notice", "noticeDays", payDraft.noticeDays, { label: "Zile notificare prealabilă", required: true, numeric: true, span: 6,
              hint: "Cu câte zile înaintea scadenței se trimite notificarea și se generează nota." })}
          </div>
        ` : ""}
      `)}
    `;

    const published = existing?.state === "Publicat";
    payDrawer.querySelector("[data-pay-summary]").textContent = published
      ? `Salvarea creează v${existing.version + 1}; notele deja generate rămân neschimbate.`
      : existing ? `Schiță · v${existing.version}` : "Taxă nouă · se salvează ca schiță sau se publică direct";
    payDrawer.querySelector("[data-pay-buttons]").innerHTML = published ? `
      <button class="btn btn-neutral btn-rounded" type="button" data-pay-close>Anulează</button>
      <button class="btn btn-primary btn-rounded" type="button" data-pay-save="save">Salvează · v${existing.version + 1}</button>
    ` : `
      <button class="btn btn-neutral btn-rounded" type="button" data-pay-close>Anulează</button>
      <button class="btn btn-neutral btn-rounded" type="button" data-pay-save="draft">Salvează schiță</button>
      <button class="btn btn-primary btn-rounded" type="button" data-pay-save="publish">Publică</button>
    `;
  };

  /* structural changes re-render the body; the scroll position stays */
  const rerenderPayDrawer = (focusSelector) => {
    const top = payDrawerBody.scrollTop;
    renderPayDrawer();
    payDrawerBody.scrollTop = top;
    if (focusSelector) focusFormControl(payDrawerBody.querySelector(focusSelector));
  };

  const showPayDrawer = (focusSelector) => {
    renderPayDrawer();
    payDrawer.hidden = false;
    document.body.classList.add("is-user-create-open");
    requestAnimationFrame(() => focusFormControl(payDrawerBody.querySelector(focusSelector)));
  };

  /* open: an existing tax, a new one, or a new one for a tariff to configure */
  const openPaymentDrawer = (taxId = null, { tariffId = null } = {}) => {
    const service = getServiceByCode(serviceProfileState.code);
    const tax = taxId ? serviceTaxes(service || { geap: {} }).find((item) => item.id === taxId) : null;

    if (!payDrawer || !service || (taxId && !tax)) {
      return;
    }

    const tariff = getTariff(tax?.tariffId || tariffId);
    const base = tax || (tariff ? passport.defaultTaxForTariff(tariff, { term: defaultPaymentTerm(service) }) : null);
    payDraft = {
      serviceCode: service.code,
      id: tax?.id || null,
      tariffId: base?.tariffId || "",
      requestType: base?.requestType || "",
      moment: base?.moment || "",
      generation: base?.generation || "Automat",
      conditions: base && passport.taxConditions(base).length ? passport.taxConditions(base).map((c) => ({ classifier: c.classifier, values: [...c.values] })) : null,
      scenarioCalc: Object.fromEntries(base ? passport.taxScenarios(base).map((sc) => {
        const calc = passport.scenarioCalc(base, sc.key);
        return [sc.key, { mode: calc.mode === "reducere" ? "reducere" : "tarif", percent: calc.percent ? String(calc.percent) : "" }];
      }) : []),
      calc: { percent: "", ...(base?.calc || {}), mode: base?.calc?.mode === "reducere" ? "reducere" : "tarif" },
      term: base ? String(base.term) : defaultPaymentTerm(service),
      exemptions: [...(base?.exemptions || [])],
      removable: Boolean(base?.removable),
      recurring: Boolean(base?.recurring),
      frequency: base?.recurring?.frequency || "",
      months: base?.recurring?.months ? String(base.recurring.months) : "",
      noticeDays: base?.recurring?.noticeDays ? String(base.recurring.noticeDays) : "",
      errors: {}
    };
    payDraft.calc.percent = payDraft.calc.percent == null ? "" : String(payDraft.calc.percent);
    payReturnFocus = document.activeElement;
    showPayDrawer(tariff ? "#pay-moment" : "#pay-tariff");
  };

  const closePaymentDrawer = ({ keepDraft = false } = {}) => {
    if (!payDrawer || payDrawer.hidden || payDrawer.classList.contains("is-closing")) {
      return;
    }

    closeFoSelect();
    payDrawer.classList.add("is-closing");
    window.setTimeout(() => {
      payDrawer.hidden = true;
      payDrawer.classList.remove("is-closing");
      if (!keepDraft) {
        document.body.classList.remove("is-user-create-open");
        payDraft = null;
        payReturnFocus?.focus?.();
      }
    }, 120);
  };

  /* back from the tariff drawer: the kept draft, with the new tariff if one was saved */
  const resumeTaxDraft = (draft, tariffId) => {
    payDraft = draft;
    if (tariffId) {
      payDraft.tariffId = tariffId;
      const tariff = getTariff(tariffId);
      if (tariff?.requestType && !payDraft.requestType) payDraft.requestType = tariff.requestType;
      delete payDraft.errors.tariffId;
    }
    showPayDrawer("#pay-tariff");
  };

  const paymentFromDraft = () => ({
    tariffId: payDraft.tariffId,
    requestType: payDraft.requestType,
    moment: payDraft.moment,
    generation: payDraft.generation,
    condition: null,
    conditions: (payDraft.conditions || []).map((c) => ({ classifier: c.classifier, values: [...c.values] })),
    /* only the scenarios that still exist; a missing one falls back to the tariff */
    scenarioCalc: Object.fromEntries(passport.taxScenarios(draftTax()).map((sc) => {
      const calc = draftScenarioCalc(sc.key);
      return [sc.key, calc.mode === "reducere" ? { mode: "reducere", percent: calc.percent } : { mode: "tarif" }];
    })),
    calc: !payDraft.conditions && payDraft.calc.mode === "reducere" ? { mode: "reducere", percent: payDraft.calc.percent } : { mode: "tarif" },
    term: payDraft.term,
    exemptions: payDraft.generation === "Manual" ? payDraft.exemptions : [],
    removable: payDraft.generation === "Manual" && payDraft.removable,
    recurring: payDraft.recurring
      ? { frequency: payDraft.frequency, months: payDraft.frequency === "Interval" ? payDraft.months : null, noticeDays: payDraft.noticeDays }
      : null
  });

  const taxName = (tax) => getTariff(tax.tariffId)?.name || "taxa";

  const savePaymentDrawer = (mode) => {
    const service = getServiceByCode(payDraft.serviceCode);
    const taxes = serviceTaxes(service);
    const existing = taxes.find((tax) => tax.id === payDraft.id) || null;
    const publish = mode === "publish" || (mode === "save" && existing?.state === "Publicat");
    const fields = paymentFromDraft();
    const errors = passport.validateTax(fields, { flow: requestTypeFlow(service, fields.requestType), tariff: getTariff(fields.tariffId), serviceCode: service.code });

    if (Object.keys(errors).length) {
      payDraft.errors = errors;
      /* per-condition keys end in :index, per-scenario keys in :scenarioKey */
      const [base, suffix = ""] = Object.keys(errors)[0].split(/:(.*)/s);
      const scenarioIndex = passport.taxScenarios(fields).findIndex((sc) => sc.key === suffix);
      const first = {
        tariffId: "#pay-tariff", requestType: "#pay-request-type", moment: "#pay-moment", generation: "[data-pay-generation]",
        conditionClassifier: `#pay-condition-classifier-${suffix || 0}`, conditionValues: `[data-pay-condition-value="${suffix || 0}"]`,
        scenarios: "[data-pay-condition-value]",
        calc: suffix ? `#pay-scn-calc-${scenarioIndex}` : "[data-pay-calc]", percent: suffix ? `#pay-percent-${scenarioIndex}` : "#pay-percent",
        term: "#pay-term", exemptions: "[data-pay-exemption]", frequency: "#pay-frequency", noticeDays: "#pay-notice"
      }[base];
      rerenderPayDrawer(first);
      return;
    }

    fields.term = Number(fields.term);
    if (fields.calc.mode === "reducere") fields.calc.percent = Number(fields.calc.percent);
    if (fields.recurring) {
      fields.recurring.noticeDays = Number(fields.recurring.noticeDays);
      fields.recurring.months = fields.recurring.months ? Number(fields.recurring.months) : null;
    }

    const meta = { at: localIsoNow(), user: currentUserName(), publish };
    const next = passport.applyPaymentEdit(existing, fields, meta);
    const name = taxName(next);
    let message;
    let type;

    if (!existing) {
      next.id = `tax-${Date.now().toString(36)}`;
      if (next.state === "Publicat") {
        next.active = !passport.taxConflict(taxes, { ...next, active: true }, conditionTree());
      }
      taxes.push(next);
      type = next.state === "Publicat" ? "Publicare taxă" : "Creare taxă";
      message = next.state === "Publicat"
        ? (next.active ? `Taxa „${name}” a fost publicată și activată.` : `Taxa „${name}” a fost publicată inactivă: același tarif se aplică deja la acest tip, moment și condiție.`)
        : `Taxa „${name}” a fost salvată ca schiță.`;
    } else {
      const wasDraft = existing.state !== "Publicat";
      Object.assign(existing, next);
      if (wasDraft && existing.state === "Publicat") {
        existing.active = !passport.taxConflict(taxes, { ...existing, active: true }, conditionTree());
      }
      type = wasDraft && existing.state === "Publicat" ? "Publicare taxă" : "Editare taxă";
      message = existing.state === "Publicat" && !wasDraft
        ? `Taxa „${name}” a fost actualizată la v${existing.version}. Se aplică dosarelor inițiate de acum.`
        : existing.state === "Publicat" ? `Taxa „${name}” a fost publicată.` : `Schița „${name}” a fost salvată.`;
    }

    const saved = existing || next;
    logServiceEvents(service.code, [{ at: meta.at, user: meta.user, type, status: "Reușit", detail: `${name} · ${saved.requestType} · v${saved.version}` }]);
    closePaymentDrawer();
    renderServiceProfile();
    showShellToast(message);
  };

  /* "Aplică ca atare": the tariff as is, automatic at initiation — published at once */
  const applyTariffAsIs = (tariffId) => {
    const service = getServiceByCode(serviceProfileState.code);
    const tariff = getTariff(tariffId);
    if (!service || !tariff) return;
    const fields = passport.defaultTaxForTariff(tariff, { term: Number(defaultPaymentTerm(service)) });
    const errors = passport.validateTax(fields, { flow: requestTypeFlow(service, fields.requestType), tariff, serviceCode: service.code });

    /* no request type from the registry (or a draft tariff): configure it instead */
    if (Object.keys(errors).length) {
      openPaymentDrawer(null, { tariffId });
      return;
    }

    const meta = { at: localIsoNow(), user: currentUserName(), publish: true };
    const next = passport.applyPaymentEdit(null, fields, meta);
    next.id = `tax-${Date.now().toString(36)}`;
    next.active = !passport.taxConflict(serviceTaxes(service), { ...next, active: true }, conditionTree());
    serviceTaxes(service).push(next);
    logServiceEvents(service.code, [{ at: meta.at, user: meta.user, type: "Publicare taxă", status: "Reușit", detail: `${tariff.name} · aplicat ca atare · ${next.requestType}` }]);
    renderServiceProfile();
    showShellToast(`Taxa „${tariff.name}” se aplică ca atare: ${next.requestType} · la inițierea solicitării · ${tariffValueText(tariff)}.`);
  };

  payDrawer?.addEventListener("input", (event) => {
    if (!payDraft) {
      return;
    }

    const scnPercent = event.target.closest("[data-pay-scn-percent]");
    if (scnPercent) {
      scnPercent.value = scnPercent.value.replace(/\D/g, "").slice(0, 3);
      const key = passport.taxScenarios(draftTax())[Number(scnPercent.dataset.payScnPercent)]?.key;
      if (key) draftScenarioCalc(key).percent = scnPercent.value;
      if (payDraft.errors[`percent:${key}`]) {
        delete payDraft.errors[`percent:${key}`];
        scnPercent.closest(".e-permits-fo-input")?.classList.remove("is-error");
        scnPercent.closest(".e-permits-tax-scn__row")?.querySelector(".e-permits-tax-scn__error")?.remove();
      }
      return;
    }

    const calcField = event.target.closest("[data-pay-calc-field]");
    if (calcField) {
      const key = calcField.dataset.payCalcField;
      if (key === "percent") calcField.value = calcField.value.replace(/\D/g, "").slice(0, 3);
      payDraft.calc[key] = calcField.value;
      if (payDraft.errors[key]) {
        delete payDraft.errors[key];
        calcField.closest(".e-permits-fo-input")?.classList.remove("is-error");
        calcField.closest(".e-permits-fo-field")?.querySelector(".message--error")?.remove();
      }
      return;
    }

    const field = event.target.closest("[data-pay-field]");

    if (!field) {
      return;
    }

    const key = field.dataset.payField;
    if (["term", "months", "noticeDays"].includes(key)) {
      field.value = field.value.replace(/\D/g, "").slice(0, 3);
    }
    payDraft[key] = field.value;
    if (payDraft.errors[key]) {
      delete payDraft.errors[key];
      field.closest(".e-permits-fo-input")?.classList.remove("is-error");
      field.closest(".e-permits-fo-field")?.querySelector(".message--error")?.remove();
    }
  });

  payDrawer?.addEventListener("focusout", (event) => {
    /* the reduction's result line follows the typed value */
    if (payDraft && event.target.matches?.("[data-pay-calc-field], [data-pay-scn-percent]")) rerenderPayDrawer();
  });

  payDrawer?.addEventListener("change", (event) => {
    const target = event.target;

    if (!payDraft) {
      return;
    }

    if (target.matches("[data-pay-tariff]")) {
      payDraft.tariffId = target.value;
      const tariff = getTariff(target.value);
      /* the registry's request type comes with the tariff */
      if (tariff?.requestType && tariff.source !== "GEAP" && !payDraft.id) payDraft.requestType = tariff.requestType;
      delete payDraft.errors.tariffId;
      rerenderPayDrawer("#pay-tariff");
    } else if (target.matches("[data-pay-request-type]")) {
      payDraft.requestType = target.value;
      delete payDraft.errors.requestType;
      /* a moment the new flow cannot generate is cleared */
      const service = getServiceByCode(payDraft.serviceCode);
      if (payDraft.moment && !passport.momentAllowed(requestTypeFlow(service, payDraft.requestType), payDraft.moment)) {
        payDraft.moment = "";
      }
      delete payDraft.errors.moment;
      rerenderPayDrawer("#pay-request-type");
    } else if (target.matches("[data-pay-moment]")) {
      payDraft.moment = target.value;
      delete payDraft.errors.moment;
      if (payDraft.moment === passport.PAYMENT_MOMENTS[0] && payDraft.generation !== "Automat") {
        setPayGeneration("Automat");
      }
      delete payDraft.errors.generation;
      rerenderPayDrawer("#pay-moment");
    } else if (target.matches("[data-pay-condition-classifier]")) {
      const index = Number(target.dataset.payConditionClassifier);
      delete payDraft.errors[condErrorKey("conditionClassifier", index)];
      delete payDraft.errors[condErrorKey("conditionValues", index)];
      payDraft.conditions[index] = { classifier: target.value, values: [] };
      rerenderPayDrawer(`#pay-condition-classifier-${index}`);
    } else if (target.matches("[data-pay-condition-value]")) {
      const index = Number(target.dataset.payConditionValue);
      payDraft.conditions[index].values = [...payDrawerBody.querySelectorAll(`[data-pay-condition-value="${index}"]:checked`)].map((input) => input.value);
      delete payDraft.errors[condErrorKey("conditionValues", index)];
      delete payDraft.errors.scenarios;
      /* the scenario rows in Calcul follow the checked values */
      rerenderPayDrawer(`[data-pay-condition-value="${index}"][value="${CSS.escape(target.value)}"]`);
    } else if (target.matches("[data-pay-scn-calc]")) {
      const index = Number(target.dataset.payScnCalc);
      const key = passport.taxScenarios(draftTax())[index]?.key;
      if (key) {
        draftScenarioCalc(key).mode = target.value;
        delete payDraft.errors[`calc:${key}`];
        delete payDraft.errors[`percent:${key}`];
      }
      rerenderPayDrawer(target.value === "reducere" ? `#pay-percent-${index}` : `#pay-scn-calc-${index}`);
    } else if (target.matches("[data-pay-removable]")) {
      payDraft.removable = target.checked;
    } else if (target.matches("[data-pay-exemption]")) {
      payDraft.exemptions = [...payDrawerBody.querySelectorAll("[data-pay-exemption]:checked")].map((input) => input.value);
      delete payDraft.errors.exemptions;
    } else if (target.matches("[data-pay-recurring]")) {
      payDraft.recurring = target.checked;
      rerenderPayDrawer("[data-pay-recurring]");
    } else if (target.matches("[data-pay-frequency]")) {
      payDraft.frequency = target.value;
      delete payDraft.errors.frequency;
      rerenderPayDrawer("#pay-frequency");
    }
  });

  /* switching to automatic drops what an automatic tax cannot have */
  const setPayGeneration = (value) => {
    payDraft.generation = value;
    if (value === "Automat") {
      payDraft.exemptions = [];
      payDraft.removable = false;
    }
  };

  payDrawer?.addEventListener("click", (event) => {
    if (!payDraft) {
      return;
    }

    if (event.target.closest("[data-pay-close]")) {
      closePaymentDrawer();
      return;
    }

    const save = event.target.closest("[data-pay-save]");

    if (save) {
      savePaymentDrawer(save.dataset.paySave);
      return;
    }

    if (event.target.closest("[data-tax-new-tariff]")) {
      /* keep the draft, create the tariff, come back with it selected */
      taxAwaitingTariff = payDraft;
      closePaymentDrawer({ keepDraft: true });
      window.setTimeout(() => openTariffDrawer(null, payDraft?.serviceCode || serviceProfileState.code, { requestType: taxAwaitingTariff?.requestType }), 140);
      return;
    }

    const generation = event.target.closest("[data-pay-generation]");

    if (generation && !generation.disabled) {
      setPayGeneration(generation.dataset.payGeneration);
      delete payDraft.errors.generation;
      rerenderPayDrawer(`[data-pay-generation="${generation.dataset.payGeneration}"]`);
      return;
    }

    const conditionMode = event.target.closest("[data-pay-condition-mode]");

    if (conditionMode && !conditionMode.disabled) {
      const conditional = conditionMode.dataset.payConditionMode === "conditional";
      const service = getServiceByCode(payDraft.serviceCode);
      const only = conditionClassifiers(service);
      payDraft.conditions = conditional ? (payDraft.conditions || [{ classifier: only.length === 1 ? only[0].code : "", values: [] }]) : null;
      Object.keys(payDraft.errors).filter((key) => /^(condition|scenarios|calc:|percent:)/.test(key)).forEach((key) => delete payDraft.errors[key]);
      rerenderPayDrawer(`[data-pay-condition-mode="${conditionMode.dataset.payConditionMode}"]`);
      return;
    }

    if (event.target.closest("[data-pay-condition-add]") && payDraft.conditions) {
      const service = getServiceByCode(payDraft.serviceCode);
      const used = payDraft.conditions.map((c) => c.classifier);
      const free = conditionClassifiers(service).filter((c) => !used.includes(c.code));
      payDraft.conditions.push({ classifier: free.length === 1 ? free[0].code : "", values: [] });
      Object.keys(payDraft.errors).filter((key) => key.startsWith("condition")).forEach((key) => delete payDraft.errors[key]);
      rerenderPayDrawer(`#pay-condition-classifier-${payDraft.conditions.length - 1}`);
      return;
    }

    const conditionRemove = event.target.closest("[data-pay-condition-remove]");
    if (conditionRemove && payDraft.conditions) {
      payDraft.conditions.splice(Number(conditionRemove.dataset.payConditionRemove), 1);
      Object.keys(payDraft.errors).filter((key) => /^(condition|scenarios|calc:|percent:)/.test(key)).forEach((key) => delete payDraft.errors[key]);
      rerenderPayDrawer("[data-pay-condition-add]");
      return;
    }

    const calc = event.target.closest("[data-pay-calc]");

    if (calc) {
      payDraft.calc.mode = calc.dataset.payCalc;
      ["calc", "expression", "percent"].forEach((key) => delete payDraft.errors[key]);
      rerenderPayDrawer(`[data-pay-calc="${calc.dataset.payCalc}"]`);
    }
  });

  payDrawer?.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && payDraft) {
      event.preventDefault();
      closePaymentDrawer();
    }
  });

  /* export = the filtered list as CSV (Excel-friendly: BOM + semicolons) */
  const exportPayments = (service) => {
    const rows = serviceTaxes(service).filter((tax) => payMatches(service, tax));
    const header = ["Tarif", "Cod tarif", "Sursa tarifului", "Tip solicitare", "Moment generare", "Tip generare", "Condiție", "Calcul", "Termen (zile)", "Scutiri", "Recurentă", "Versiune", "Stare", "Modificat de", "Modificat la"];
    const cell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const lines = [header, ...rows.map((tax) => {
      const tariff = getTariff(tax.tariffId);
      const calc = tax.calc || { mode: "tarif" };
      return [
        tariff?.name, tariff?.code, tariff?.scope === "global" ? "Global" : tariff?.source, tax.requestType, tax.moment, tax.generation,
        conditionsLabel(tax) || "Întotdeauna",
        passport.taxScenarios(tax).length ? passport.taxScenarios(tax).map((sc) => `${scenarioLabel(sc)}: ${scenarioCalcText(passport.scenarioCalc(tax, sc.key))}`).join("; ") : calc.mode === "reducere" ? `Reducere ${calc.percent}%` : tariff?.formula ? `Formula tarifului ${formulaReadable(tariff.expression)}` : `${tariff?.amount} ${tariff?.currency}`,
        tax.term, tax.exemptions.join(", "),
        tax.recurring ? (tax.recurring.frequency === "Interval" ? `La ${tax.recurring.months} luni` : "Anual") : "Nu",
        `v${tax.version}`, TAX_STATUS(tax), tax.modifiedBy, tax.modifiedAt
      ];
    })].map((line) => line.map(cell).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + lines], { type: "text/csv;charset=utf-8" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: `taxe-${service.code}.csv` });
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showShellToast(`${rows.length} ${rows.length === 1 ? "taxă exportată" : "taxe exportate"}.`);
  };

  /* ---- Tarife (Feature «Gestionarea clasificatorului de tarife») ---------
     The price list. Global tariffs live in Administrare → Tarife; a service's
     tariffs (mostly from RSSP / eAPL) are charged through its Taxe tab. Same
     model, same editor (drawer: Identitate · Sumă și formulă · Ciclu de viață).
     Rules: GEAP.servicePassport. */
  const tariffStatus = (t) => (t.state === "Publicat" ? (t.active ? "Activ" : "Inactiv") : "Schiță");
  /* where a tariff is charged: the taxes that use it, in every service */
  const tariffUsage = (tariff) => (servicesStore?.services || []).flatMap((service) =>
    serviceTaxes(service).filter((tax) => tax.tariffId === tariff.id).map((tax) => ({ service, tax })));
  const tariffAmountLabel = (t) => (t.formula ? `Formulă · ${escapeHtml(formulaReadable(t.expression))}` : `${escapeHtml(String(t.amount))} ${escapeHtml(t.currency)}`);
  const tariffValidity = (t) => `${t.validFrom ? formatLongDate(t.validFrom) : "—"}${t.validTo ? ` – ${formatLongDate(t.validTo)}` : " – nelimitat"}`;
  const serviceTariffList = (service) => (servicesStore?.tariffs || []).filter((tariff) => tariff.scope === service.code);

  /* RSSP sub-services with a price → one tariff each; eAPL local fee → one tariff */
  const syncServiceTariffsFrom = (service, source) => {
    const incoming = source === "RSSP"
      ? (service.rssp.subServices || []).filter((sub) => Number(sub.price?.amount) > 0).map((sub) => ({
          externalId: `sub-${sub.title}`, name: `Taxă — ${sub.title}`, amount: Number(sub.price.amount), currency: sub.price.currency || "MDL",
          requestType: sub.title, type: "Taxă de stat"
        }))
      : [servicesStore.eapl?.responses?.[service.code]].filter(Boolean).map((local) => ({
          externalId: "local-fee", name: local.localFee.label, amount: local.localFee.amount, currency: local.localFee.currency,
          requestType: "Emitere primară", type: "Taxă suplimentară"
        }));
    const now = localIsoNow();
    const result = passport.syncServiceTariffs({ tariffs: servicesStore.tariffs, incoming, serviceCode: service.code, source, now, today: now.slice(0, 10) });
    servicesStore.tariffs = result.tariffs;
    logServiceEvents(service.code, [{ at: now, user: currentUserName(), type: `Sincronizare tarife (${source})`, status: "Reușit", detail: `${result.created} create, ${result.updated} actualizate, ${result.unchanged} neschimbate` }]);
    renderServiceProfile();
    showShellToast(`${result.created} create, ${result.updated} actualizate, ${result.unchanged} neschimbate.${result.created ? " Tarifele noi așteaptă regula de aplicare la „De configurat”." : ""}`, "success", `Tarife sincronizate din ${source}`);
  };

  const exportCsv = (filename, header, rows) => {
    const cell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const text = [header, ...rows].map((line) => line.map(cell).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: filename });
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportTariffs = (list, filename) => {
    exportCsv(filename, ["Cod", "Denumire", "Tip", "Sumă", "Valută", "Formulă", "Tip solicitare", "Tip persoană", "Domeniu", "Sursă", "Stare", "Activ", "Valabil de la", "Valabil până la", "Versiune", "Folosit în taxe"],
      list.map((t) => [t.code, t.name, t.type, t.amount, t.currency, t.formula ? t.expression : "Nu", t.requestType || "", t.personType || "", t.scope === "global" ? "Global" : t.scope, t.source, t.state, t.active ? "Da" : "Nu", t.validFrom || "", t.validTo || "", `v${t.version || 1}`, tariffUsage(t).length]));
    showShellToast(`${list.length} ${list.length === 1 ? "tarif exportat" : "tarife exportate"}.`);
  };

  /* ---- tariff editor (drawer) ---- */
  const tariffDrawer = document.querySelector("[data-tariff-drawer]");
  const tariffDrawerBody = tariffDrawer?.querySelector("[data-tariff-body]");
  let tariffDraft = null;
  let tariffReturnFocus = null;

  const tariffFieldError = (key) => tariffDraft.errors[key] ? `
    <span class="message message--inline message--error e-permits-fo-field__error">
      <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-error-filled"></use></svg>
      <span>${escapeHtml(tariffDraft.errors[key])}</span>
    </span>
  ` : "";

  const TARIFF_CREATE_STEPS = ["Detalii", "Sumă și formulă"];
  /* the drawer's tabs and which tab owns each validated field */
  const tariffDrawerTabs = (existing) => [["detalii", "Detalii"], ["suma", "Sumă și formulă"], ...(existing ? [["utilizare", "Utilizare și istoric"]] : [])];
  const TARIFF_FIELD_TAB = {
    name: "detalii", nameRu: "detalii", nameEn: "detalii", type: "detalii", legalBasis: "detalii", requestType: "detalii",
    subdivision: "detalii", personType: "detalii", validFrom: "detalii", validTo: "detalii",
    amount: "suma", currency: "suma", expression: "suma", rounding: "suma", iban: "suma"
  };

  /* formula builder: the expression is a row of tokens — variables chosen from the
     catalogue (no free text), numbers, + − × ÷ ( ) — stored as "{var} * 2" */
  const TARIFF_FORMULA_OPS = [["+", "+", "Plus"], ["-", "−", "Minus"], ["*", "×", "Înmulțit cu"], ["/", "÷", "Împărțit la"], ["(", "(", "Paranteză deschisă"], [")", ")", "Paranteză închisă"]];
  /* {{nume}} like the templates; the older {nume} still reads */
  const formulaTokens = (expression) => String(expression || "").match(/\{\{\s*[a-z0-9_]+\s*\}\}|\{[a-z0-9_]+\}|\d+(?:[.,]\d+)?|[-+*/()]/gi) || [];
  const formulaTokenKey = (token) => token.replace(/[{}\s]/g, "");
  const formulaVar = (key) => (servicesStore.formulaVariables || []).find((v) => v.key === key) || null;
  const formulaVarCaption = (key) => { const v = formulaVar(key); return v ? `${v.label}${v.unit ? ` (${v.unit})` : ""}` : key; };
  /* the expression as people read it: "Suprafața obiectului × 2" */
  const formulaReadable = (expression) => formulaTokens(expression).map((token) => {
    if (token.startsWith("{")) return formulaVar(formulaTokenKey(token))?.label || token;
    if (/^\d/.test(token)) return token.replace(".", ",");
    return (TARIFF_FORMULA_OPS.find(([op]) => op === token) || [token, token])[1];
  }).join(" ") || "—";

  const renderTariffFormulaVarItems = (query = "") => {
    const q = query.trim().toLocaleLowerCase("ro");
    const vars = (servicesStore.formulaVariables || []).filter((v) => !q || `${v.label} ${v.key} ${v.source}`.toLocaleLowerCase("ro").includes(q));
    if (!vars.length) return '<li role="none" class="e-permits-ntpl-picker__empty">Nicio variabilă nu corespunde.</li>';
    const groups = [...new Set(vars.map((v) => v.source))];
    return groups.map((group) => `
      <li role="none"><p class="e-permits-ntpl-picker__group">${escapeHtml(group)}</p></li>
      ${vars.filter((v) => v.source === group).map((v) => `
        <li role="none">
          <button class="e-permits-fo-intent-menu__item e-permits-ntpl-picker__item" type="button" role="menuitem" data-tariff-var="${escapeHtml(v.key)}">
            <span class="e-permits-ntpl-picker__label">${escapeHtml(v.label)}</span>
            <span class="e-permits-ntpl-picker__token">${escapeHtml(v.unit ? `${v.unit} · ` : "")}{{${escapeHtml(v.key)}}}</span>
          </button>
        </li>
      `).join("")}
    `).join("");
  };

  /* typed text → formula text: digits, spaces, + - * / ( ) . , and whole {{variable}} tokens;
     × ÷ − become * / -; anything else (letters outside a variable) is dropped. The caret stays put. */
  const sanitizeFormula = (value, caret) => {
    let out = "";
    let at = caret;
    for (let i = 0; i < value.length;) {
      const token = value[i] === "{" ? value.slice(i).match(/^\{\{\s*[a-z0-9_]+\s*\}\}|^\{[a-z0-9_]+\}/i) : null;
      if (token) {
        if (caret > i && caret < i + token[0].length) at = out.length + (caret - i);
        out += token[0];
        i += token[0].length;
        if (caret >= i) at = out.length;
        continue;
      }
      const ch = { "×": "*", "÷": "/", "−": "-" }[value[i]] || value[i];
      if (/[\d\s.,+\-*/()]/.test(ch)) out += ch;
      i += 1;
      if (caret >= i) at = out.length;
    }
    return { value: out, caret: at };
  };

  /* the formula as people read it, variables marked as in the Șabloane preview */
  const formulaReadableHtml = (expression) => formulaTokens(expression).map((token) => {
    if (token.startsWith("{")) {
      const v = formulaVar(formulaTokenKey(token));
      return v
        ? `<mark class="e-permits-ntpl-preview__token" title="${escapeHtml(token)}">${escapeHtml(formulaVarCaption(v.key))}</mark>`
        : `<mark class="e-permits-ntpl-preview__token e-permits-tariff-formula__unknown" title="Variabilă necunoscută">${escapeHtml(token)}</mark>`;
    }
    if (/^\d/.test(token)) return escapeHtml(token.replace(".", ","));
    return (TARIFF_FORMULA_OPS.find(([op]) => op === token) || [token, token])[1];
  }).join(" ");

  /* Expresia formulei: a text field like the Șabloane subject — the cursor goes anywhere,
     numbers and + − × ÷ ( ) are typed, variables come only from „Inserează variabilă” */
  const renderTariffFormulaBuilder = (d) => `
    <div class="e-permits-fo-field e-permits-tariff-formula">
      <div class="e-permits-tariff-formula__head">
        <label for="tariff-expression">Expresia formulei${requiredMark()}</label>
        <div class="e-permits-stack__menu-wrap">
          <button class="btn btn-secondary btn-sm" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="tariff-var-picker" data-stack-menu-trigger>
            <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-large"></use></svg>
            <span>Inserează variabilă</span>
          </button>
          <div class="e-permits-fo-intent-menu e-permits-stack__menu e-permits-ntpl-picker" id="tariff-var-picker" hidden data-stack-menu>
            <div class="e-permits-fo-input e-permits-fo-input--with-action e-permits-ntpl-picker__search">
              <input type="text" placeholder="Caută o variabilă" aria-label="Caută o variabilă" value="${escapeHtml(d.varQuery || "")}" data-tariff-var-search autocomplete="off">
              <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-search"></use></svg>
            </div>
            <ul class="e-permits-ntpl-picker__list" role="menu" aria-label="Variabile" data-tariff-var-list>${renderTariffFormulaVarItems(d.varQuery || "")}</ul>
          </div>
        </div>
      </div>
      <div class="e-permits-fo-textarea${d.errors.expression ? " is-error" : ""}">
        <textarea id="tariff-expression" rows="2" spellcheck="false" placeholder="ex. {{suprafata_m2}} * 2" data-tariff-field="expression">${escapeHtml(d.expression)}</textarea>
      </div>
      ${tariffFieldError("expression")}
      ${d.errors.expression ? "" : '<p class="e-permits-fo-field__hint">Scrie numere și + − × ÷ ( ). Variabilele se adaugă din „Inserează variabilă”, la poziția cursorului.</p>'}
      <p class="e-permits-tariff-formula__readable" data-tariff-readable${d.expression.trim() ? "" : " hidden"}>Se citește: <span>${formulaReadableHtml(d.expression)}</span></p>
    </div>
  `;

  const renderTariffDrawer = () => {
    const d = tariffDraft;
    const existing = (servicesStore.tariffs || []).find((t) => t.id === d.id) || null;
    const service = d.scope !== "global" ? getServiceByCode(d.scope) : null;
    const locked = (field) => passport.tariffLocked(d, field);
    const lockedNote = `Preluat din ${escapeHtml(d.source)} — needitabil.`;
    /* library date picker (.date-picker__field + .date-picker-panel, js/input-date-picker.js)
       inside the full-flow field shell; the ISO value lives on data-selected */
    const datePicker = (id, key, { label, span = 6, required = false, hint = "" }) => {
      const iso = d[key] || "";
      const [y, m, day] = iso ? iso.split("-") : [];
      const today = localIsoNow().slice(0, 10);
      const view = (iso || today).split("-");
      return `
        <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
          <label for="${id}">${escapeHtml(label)}${required ? requiredMark() : ""}</label>
          <div class="date-picker__field" data-date-picker data-type="default" data-locale="ro" data-selected="${escapeHtml(iso)}" data-today="${today}" data-year="${Number(view[0])}" data-month="${Number(view[1]) - 1}">
            <div class="e-permits-fo-input e-permits-fo-input--with-action${d.errors[key] ? " is-error" : ""}">
              <input id="${id}" type="text" class="js-date-picker-input" value="${iso ? `${day}/${m}/${y}` : ""}" placeholder="ZZ/LL/AAAA" data-tariff-date="${key}" autocomplete="off">
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
          ${tariffFieldError(key)}
          ${hint && !d.errors[key] ? `<p class="e-permits-fo-field__hint">${hint}</p>` : ""}
        </div>
      `;
    };

    const input = (id, key, { label, span = 12, required = false, numeric = false, type = "text", hint = "", placeholder = "" }) => {
      const isLocked = locked(key);
      return `
        <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
          <label for="${id}">${escapeHtml(label)}${required ? requiredMark() : ""}</label>
          <div class="e-permits-fo-input${isLocked ? " is-filled is-readonly" : ""}${d.errors[key] ? " is-error" : ""}">
            <input id="${id}" type="${type}"${numeric ? ' inputmode="decimal"' : ""} value="${escapeHtml(d[key] ?? "")}" placeholder="${escapeHtml(placeholder)}" data-tariff-field="${key}" autocomplete="off"${isLocked ? " readonly" : ""}>
            ${isLocked ? '<svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-lock"></use></svg>' : ""}
          </div>
          ${tariffFieldError(key)}
          ${!d.errors[key] && (isLocked || hint) ? `<p class="e-permits-fo-field__hint">${isLocked ? lockedNote : hint}</p>` : ""}
        </div>
      `;
    };
    const select = (id, key, { label, span = 12, required = false, options, placeholder, hint = "" }) => {
      const isLocked = locked(key);
      return `
        <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
          <label for="${id}">${escapeHtml(label)}${required ? requiredMark() : ""}</label>
          ${renderFoSelectControl({
            id, attrs: `data-tariff-select="${key}"`, disabled: isLocked,
            optionsHtml: `${placeholder ? `<option value=""${d[key] ? "" : " selected"}${required ? " disabled" : ""}>${escapeHtml(placeholder)}</option>` : ""}${options.map(([value, text]) => `<option value="${escapeHtml(value)}"${value === (d[key] ?? "") ? " selected" : ""}>${escapeHtml(text)}</option>`).join("")}`
          })}
          ${tariffFieldError(key)}
          ${!d.errors[key] && (isLocked || hint) ? `<p class="e-permits-fo-field__hint">${isLocked ? lockedNote : hint}</p>` : ""}
        </div>
      `;
    };
    const accounts = (servicesStore.bankAccounts || []).filter((a) => a.active && (!service || a.authorityId === service.authorityId));
    const fallback = service ? passport.tariffPayAccount({ iban: "" }, servicesStore.bankAccounts, service.authorityId) : null;
    const usage = existing ? tariffUsage(existing) : [];
    const variables = passport.formulaVariables(d.expression);
    d.renderedVars = variables.join();

    tariffDrawer.querySelector("[data-tariff-title]").textContent = existing ? "Editează tariful" : "Tarif nou";
    tariffDrawer.querySelector("[data-tariff-subtitle]").textContent = existing
      ? `${existing.code} · ${tariffStatus(existing)} · v${existing.version || 1}${existing.source !== "GEAP" ? ` · din ${existing.source}` : ""}`
      : (service ? `Tarif al serviciului „${service.title}”` : "Tarif global — disponibil pentru orice serviciu");

    /* one status, its meaning, and the actions that change it — at the top, so
       Activează / Dezactivează / Șterge are visible and not confused with Publică
       (Publică = a draft's first release, in the footer; Activează = turn a published
       tariff back on) */
    const status = existing ? tariffStatus(existing) : "";
    const STATUS_COPY = {
      Schiță: "Nu se folosește încă. Publică-l din subsol ca să devină disponibil.",
      Activ: "Disponibil la selecție în taxe și pe notele de plată.",
      Inactiv: "Publicat, dar nu poate fi ales în taxe."
    };
    const deleteReason = usage.length ? `Folosit în ${usage.length === 1 ? "1 taxă" : `${usage.length} taxe`} — poate fi doar dezactivat.` : "";
    const statusStrip = existing ? `
      <div class="e-permits-tariff__status">
        <div class="e-permits-tariff__status-copy">
          <span class="e-permits-tariff__status-title">Stare ${renderTag(status, status === "Activ" ? "success" : "neutral")}</span>
          <span class="e-permits-tariff__status-text">${STATUS_COPY[status]}</span>
        </div>
        <div class="e-permits-tariff__status-actions">
          ${existing.state === "Publicat" ? `<button class="btn ${existing.active ? "btn-neutral" : "btn-secondary"} btn-sm" type="button" data-tariff-toggle-active>${existing.active ? "Dezactivează" : "Activează"}</button>` : ""}
          <button class="btn btn-outline-destructive btn-sm" type="button" data-tariff-delete${deleteReason ? ` aria-disabled="true" data-tooltip-reason="${escapeHtml(deleteReason)}"` : ""}>Șterge</button>
        </div>
      </div>
    ` : "";

    /* tabs: Detalii · Sumă și formulă (· Utilizare și istoric for a saved tariff).
       A tab with an error carries a dot; saving opens the first tab with an error. */
    const tabs = tariffDrawerTabs(existing);
    if (!tabs.some(([id]) => id === d.tab)) d.tab = "detalii";
    const panels = {
      detalii: `
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">Identitate</h3>
        <div class="e-permits-user-create__section-content">
          <div class="e-permits-user-create__grid">
            ${input("tariff-name", "name", { label: "Denumire (RO)", required: true, placeholder: "ex. Taxă de examinare" })}
            ${input("tariff-name-ru", "nameRu", { label: "Denumire (RU)", span: 6 })}
            ${input("tariff-name-en", "nameEn", { label: "Denumire (EN)", span: 6 })}
            ${select("tariff-type", "type", { label: "Tip tarif", required: true, span: 6, placeholder: "Selectează tipul", options: (servicesStore.tariffTypes || []).map((t) => [t, t]) })}
            ${input("tariff-legal", "legalBasis", { label: "Temei legal", span: 6, placeholder: "ex. Legea nr. 213/2023, anexa 1" })}
          </div>
          ${service ? `
            <div class="e-permits-user-create__grid">
              ${select("tariff-rt", "requestType", { label: "Tip solicitare", required: true, span: 6, placeholder: "Selectează tipul solicitării", options: service.geap.requestTypes.map((rt) => [rt.name, rt.name]) })}
              ${select("tariff-subdivision", "subdivision", { label: "Subdiviziune de examinare", span: 6, placeholder: "Toate subdiviziunile", options: (service.geap.settings?.subdivisions || []).map((sub) => [sub, sub]) })}
            </div>
            <div class="e-permits-fo-field">
              <label id="tariff-person-label">Tip persoană${requiredMark()}</label>
              <div class="segmented-control" role="radiogroup" aria-labelledby="tariff-person-label">
                ${["Persoană fizică", "Persoană juridică"].map((value) => `
                  <button class="segment-item${d.personType === value ? " is-selected" : ""}" type="button" role="radio" aria-checked="${d.personType === value ? "true" : "false"}" data-tariff-person="${value}">${value}</button>
                `).join("")}
              </div>
              ${tariffFieldError("personType")}
            </div>
          ` : renderInfoNote("Tarif global: nu se leagă de serviciu, tip solicitare, persoană sau subdiviziune.")}
        </div>
      </section>
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">Valabilitate</h3>
        <div class="e-permits-user-create__section-content">
          <div class="e-permits-user-create__grid">
            ${datePicker("tariff-from", "validFrom", { label: "Valabil de la", required: true, span: 6 })}
            ${datePicker("tariff-to", "validTo", { label: "Valabil până la", span: 6, hint: "Gol = valabil pe termen nelimitat." })}
          </div>
        </div>
      </section>
      `,
      suma: `
      <section class="e-permits-user-create__section">
        <div class="e-permits-user-create__section-content">
          <div class="e-permits-user-create__grid">
            ${d.formula ? "" : input("tariff-amount", "amount", { label: "Sumă", required: true, span: 6, numeric: true, placeholder: "0.00" })}
            ${select("tariff-currency", "currency", { label: "Valută", required: true, span: 6, options: (servicesStore.currencies || ["MDL"]).map((c) => [c, c]) })}
          </div>
          ${renderToggle({ label: "Calcul prin formulă", description: "Suma se calculează din valorile dosarului, ex. suprafața × cota.", checked: Boolean(d.formula), attrs: "data-tariff-formula" })}
          ${d.formula ? `
            ${renderTariffFormulaBuilder(d)}
            <div class="e-permits-user-create__grid">
              ${select("tariff-rounding", "rounding", { label: "Regulă de rotunjire", required: true, span: 6, options: (servicesStore.roundingRules || []).map((r) => [r, r]) })}
            </div>
            <div class="e-permits-tariff__test">
              <p class="e-permits-tariff__test-title">Verifică formula</p>
              ${variables.length ? `<div class="e-permits-user-create__grid">
                ${variables.map((name) => `
                  <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--6">
                    <label for="tariff-test-${name}">${escapeHtml(formulaVarCaption(name))}</label>
                    <div class="e-permits-fo-input"><input id="tariff-test-${name}" type="text" inputmode="decimal" value="${escapeHtml(d.testValues[name] ?? "")}" placeholder="valoare de test" data-tariff-test="${escapeHtml(name)}"></div>
                  </div>
                `).join("")}
              </div>` : '<p class="e-permits-fo-field__hint">Formula nu are variabile.</p>'}
              <div class="e-permits-tariff__test-row">
                <button class="btn btn-neutral btn-sm" type="button" data-tariff-test-run>Calculează</button>
                <span class="e-permits-tariff__test-result" data-tariff-test-result aria-live="polite">${d.testResult || ""}</span>
              </div>
            </div>
            <label class="checkbox checkbox--medium e-permits-check">
              <input class="checkbox-input" type="checkbox" data-tariff-uservars${d.userVariables ? " checked" : ""}>
              <span class="checkbox-custom" aria-hidden="true"></span>
              <span class="checkbox-texts"><span class="checkbox-label">Specialistul completează variabilele la generarea notei</span><span class="checkbox-description">Tariful nu va putea fi folosit într-o plată automată.</span></span>
            </label>
          ` : ""}
          ${select("tariff-iban", "iban", {
            label: "Cont bancar (IBAN)",
            placeholder: fallback?.iban ? `Implicit — contul principal al autorității (${fallback.iban})` : "Implicit — contul principal al autorității",
            options: accounts.map((a) => [a.iban, `${a.iban} · ${a.label}`]),
            hint: "Fără IBAN propriu, la achitare se folosește contul Principal și Activ al autorității sau subdiviziunii."
          })}
        </div>
      </section>
      `,
      utilizare: existing ? `
      <section class="e-permits-user-create__section">
        <div class="e-permits-user-create__section-content">
            <div class="e-permits-dosar-profil__card e-permits-passport__sync-summary">
              ${[
                ["Sursă", escapeHtml(existing.source)],
                ["Folosit de", usage.length ? usage.map(({ service: svc, tax }) => `${escapeHtml(tax.requestType)} · ${escapeHtml(tax.moment)}${isConditional(tax) ? ` · ${escapeHtml(conditionsLabel(tax))}` : ""} <span class="e-permits-passport__muted">(${escapeHtml(svc.title)})</span>`).join("<br>") : "Nefolosit în nicio taxă"],
                ["Istoric versiuni", (existing.versions || []).slice().reverse().map((v) => `<span class="e-permits-tariff__version"><strong>v${v.version}</strong> · ${escapeHtml(v.note || "")} <span class="e-permits-passport__muted">· ${formatStamp(v.at)} · ${escapeHtml(shortName(v.by || ""))}</span></span>`).join("")]
              ].map(([label, value]) => `
                <div class="e-permits-dosar-profil__row">
                  <span class="e-permits-dosar-profil__row-label">${escapeHtml(label)}</span>
                  <span class="e-permits-dosar-profil__row-value">${value}</span>
                </div>
              `).join("")}
            </div>
        </div>
      </section>
      ` : ""
    };
    /* creation = the step strip of every multi-step create drawer (Clasificator nou,
       Șablon nou); editing a saved tariff = tabs */
    const creating = !existing;
    const strip = tariffDrawer.querySelector("[data-tariff-steps]");
    strip.hidden = !creating;
    if (creating) {
      d.step = d.tab === "suma" ? 2 : 1;
      d.maxStep = Math.max(d.maxStep || 1, d.step);
      strip.innerHTML = renderStepStrip(TARIFF_CREATE_STEPS, d, "data-tariff-goto");
      tariffDrawerBody.innerHTML = `<div class="e-permits-tariff__panel">${panels[d.tab]}</div>`;
    } else tariffDrawerBody.innerHTML = `
      ${statusStrip}
      <div class="tabs tabs--sm e-permits-tariff__tabs">
        <div class="tab-buttons" role="tablist" aria-label="Secțiunile tarifului">
          ${tabs.map(([id, label]) => {
            const active = id === d.tab;
            const hasError = Object.keys(d.errors).some((key) => TARIFF_FIELD_TAB[key] === id);
            return `<button class="tab-button${active ? " active" : ""}" id="tariff-tab-${id}" type="button" role="tab" aria-selected="${active}" aria-controls="tariff-panel" tabindex="${active ? "0" : "-1"}" data-tariff-tab="${id}"><span>${label}</span>${hasError ? '<span class="e-permits-ntpl-dot e-permits-tariff__tab-error" aria-label="conține erori"></span>' : ""}</button>`;
          }).join("")}
        </div>
      </div>
      <div class="e-permits-tariff__panel" id="tariff-panel" role="tabpanel" aria-labelledby="tariff-tab-${d.tab}">
        ${panels[d.tab]}
      </div>
    `;

    window.GEAPDatePicker?.init(tariffDrawerBody);

    const published = existing?.state === "Publicat";
    tariffDrawer.querySelector("[data-tariff-summary]").textContent = published
      ? "Modificarea creează o versiune nouă; notele de plată deja generate rămân neschimbate."
      : existing ? `Schiță · v${existing.version || 1}` : `Pasul ${d.step} din ${TARIFF_CREATE_STEPS.length} · ${TARIFF_CREATE_STEPS[d.step - 1]}`;
    tariffDrawer.querySelector("[data-tariff-buttons]").innerHTML = creating ? (d.step === 1 ? `
      <button class="btn btn-neutral btn-rounded" type="button" data-tariff-close>Anulează</button>
      <button class="btn btn-primary btn-rounded" type="button" data-tariff-next>Continuă</button>
    ` : `
      <button class="btn btn-neutral btn-rounded" type="button" data-tariff-back>Înapoi</button>
      <button class="btn btn-neutral btn-rounded" type="button" data-tariff-save="draft">Salvează schiță</button>
      <button class="btn btn-primary btn-rounded" type="button" data-tariff-save="publish">Publică</button>
    `) : published ? `
      <button class="btn btn-neutral btn-rounded" type="button" data-tariff-close>Anulează</button>
      <button class="btn btn-primary btn-rounded" type="button" data-tariff-save="save">Salvează</button>
    ` : `
      <button class="btn btn-neutral btn-rounded" type="button" data-tariff-close>Anulează</button>
      <button class="btn btn-neutral btn-rounded" type="button" data-tariff-save="draft">Salvează schiță</button>
      <button class="btn btn-primary btn-rounded" type="button" data-tariff-save="publish">Publică</button>
    `;
  };

  const rerenderTariffDrawer = (focusSelector) => {
    const top = tariffDrawerBody.scrollTop;
    renderTariffDrawer();
    tariffDrawerBody.scrollTop = top;
    if (focusSelector) focusFormControl(tariffDrawerBody.querySelector(focusSelector));
  };

  const openTariffDrawer = (tariffId = null, scope = "global", { requestType = null } = {}) => {
    const existing = tariffId ? (servicesStore.tariffs || []).find((t) => t.id === tariffId) : null;
    if (!tariffDrawer || (tariffId && !existing)) return;
    const service = !existing && scope !== "global" ? getServiceByCode(scope) : null;
    const base = existing || {
      scope, source: "GEAP", name: "", nameRu: "", nameEn: "", type: "", legalBasis: "", amount: "", currency: "MDL",
      iban: "", requestType: requestType || service?.geap.requestTypes[0]?.name || null, personType: "Persoană juridică", subdivision: null,
      formula: false, expression: "", rounding: "2 zecimale", userVariables: false, validFrom: localIsoNow().slice(0, 10), validTo: null
    };
    tariffDraft = { ...base, id: existing?.id || null, amount: base.amount === "" ? "" : String(base.amount), validTo: base.validTo || "", errors: {}, testValues: {}, testResult: "", confirmDelete: false, tab: "detalii", varQuery: "" };
    tariffReturnFocus = document.activeElement;
    renderTariffDrawer();
    tariffDrawer.hidden = false;
    document.body.classList.add("is-user-create-open");
    requestAnimationFrame(() => tariffDrawerBody.querySelector("#tariff-name:not([readonly]), #tariff-name-ru")?.focus());
  };

  const closeTariffDrawer = () => {
    if (!tariffDrawer || tariffDrawer.hidden || tariffDrawer.classList.contains("is-closing")) return;
    closeFoSelect();
    tariffDrawer.classList.add("is-closing");
    window.setTimeout(() => {
      tariffDrawer.hidden = true;
      tariffDrawer.classList.remove("is-closing");
      document.body.classList.remove("is-user-create-open");
      tariffDraft = null;
      /* opened from a tax ("Creează un tarif nou"): go back to that tax */
      if (taxAwaitingTariff) {
        const draft = taxAwaitingTariff;
        const created = taxResumeTariffId;
        taxAwaitingTariff = null;
        taxResumeTariffId = null;
        resumeTaxDraft(draft, created);
        return;
      }
      tariffReturnFocus?.focus?.();
    }, 120);
  };

  /* after a change: the open registry / service tab reflect it */
  const refreshTariffViews = () => {
    if (activeRegistry === "tariffs" && workplacePanel && !workplacePanel.hidden) {
      workplaceDb = buildTariffsDb();
      workplaceState.rows = workplaceDb.runtimeRows;
      renderWorkplace();
    }
    if (serviceProfileState.code) renderServiceProfile();
  };

  const tariffEvent = (tariff, type, detail) => {
    if (tariff.scope !== "global") {
      logServiceEvents(tariff.scope, [{ at: localIsoNow(), user: currentUserName(), type, status: "Reușit", detail }]);
    }
  };

  const saveTariffDrawer = (mode) => {
    const d = tariffDraft;
    const existing = (servicesStore.tariffs || []).find((t) => t.id === d.id) || null;
    const publish = mode === "publish" || (mode === "save" && existing?.state === "Publicat");
    const fields = {
      scope: d.scope, name: d.name.trim(), nameRu: d.nameRu.trim(), nameEn: d.nameEn.trim(), type: d.type, legalBasis: d.legalBasis.trim(),
      amount: d.formula ? "" : String(d.amount).trim().replace(",", "."), currency: d.currency, iban: d.iban || "",
      requestType: d.scope !== "global" ? d.requestType : null, personType: d.scope !== "global" ? d.personType : null,
      subdivision: d.scope !== "global" ? (d.subdivision || null) : null,
      formula: d.formula, expression: d.formula ? d.expression.trim() : "", rounding: d.rounding, userVariables: d.formula && d.userVariables,
      validFrom: d.validFrom, validTo: d.validTo || null
    };
    const errors = passport.validateTariff({ ...fields, amount: d.formula ? "" : String(d.amount).trim() }, { variables: (servicesStore.formulaVariables || []).map((v) => v.key) });

    if (Object.keys(errors).length) {
      d.errors = errors;
      d.tab = TARIFF_FIELD_TAB[Object.keys(errors)[0]] || d.tab;
      const first = { name: "#tariff-name", type: "#tariff-type", amount: "#tariff-amount", currency: "#tariff-currency", requestType: "#tariff-rt", personType: "[data-tariff-person]", iban: "#tariff-iban", expression: "#tariff-expression", rounding: "#tariff-rounding", validFrom: "#tariff-from", validTo: "#tariff-to" }[Object.keys(errors)[0]];
      rerenderTariffDrawer(first);
      return;
    }

    fields.amount = Number(fields.amount);
    const meta = { at: localIsoNow(), user: currentUserName(), publish };
    const next = passport.applyTariffEdit(existing, fields, meta);
    let message;

    if (!existing) {
      const max = (servicesStore.tariffs || []).reduce((m, t) => Math.max(m, parseInt(String(t.code).replace(/\D/g, ""), 10) || 0), 0);
      next.id = `tf-${Date.now().toString(36)}`;
      next.code = `TRF-${String(max + 1).padStart(3, "0")}`;
      servicesStore.tariffs.push(next);
      if (taxAwaitingTariff) taxResumeTariffId = next.id;
      message = next.state === "Publicat" ? `Tariful „${next.name}” a fost publicat.` : `Tariful „${next.name}” a fost salvat ca schiță.`;
      tariffEvent(next, next.state === "Publicat" ? "Publicare tarif" : "Creare tarif", `${next.code} ${next.name}`);
    } else {
      const wasDraft = existing.state !== "Publicat";
      const before = existing.version;
      Object.assign(existing, next);
      message = existing.version !== before ? `Tariful „${existing.name}” a trecut la v${existing.version}.`
        : wasDraft && existing.state === "Publicat" ? `Tariful „${existing.name}” a fost publicat.` : `Tariful „${existing.name}” a fost salvat.`;
      tariffEvent(existing, existing.version !== before ? "Versiune nouă tarif" : wasDraft && existing.state === "Publicat" ? "Publicare tarif" : "Editare tarif", `${existing.code} v${existing.version}`);
    }

    closeTariffDrawer();
    refreshTariffViews();
    showShellToast(message);
  };

  tariffDrawer?.addEventListener("input", (event) => {
    if (!tariffDraft) return;
    const field = event.target.closest("[data-tariff-field]");
    const test = event.target.closest("[data-tariff-test]");
    if (field) {
      const key = field.dataset.tariffField;
      if (key === "amount") field.value = field.value.replace(/[^\d.,]/g, "");
      if (key === "expression") {
        const clean = sanitizeFormula(field.value, field.selectionStart ?? field.value.length);
        if (clean.value !== field.value) { field.value = clean.value; field.setSelectionRange(clean.caret, clean.caret); }
        const readable = tariffDrawerBody.querySelector("[data-tariff-readable]");
        readable.hidden = !clean.value.trim();
        readable.querySelector("span").innerHTML = formulaReadableHtml(clean.value);
        tariffDraft.testResult = "";
      }
      tariffDraft[key] = field.value;
      if (tariffDraft.errors[key]) {
        delete tariffDraft.errors[key];
        field.closest(".e-permits-fo-input, .e-permits-fo-textarea")?.classList.remove("is-error");
        field.closest(".e-permits-fo-field")?.querySelector(".message--error")?.remove();
      }
    } else if (test) {
      tariffDraft.testValues[test.dataset.tariffTest] = test.value;
    } else if (event.target.matches("[data-tariff-var-search]")) {
      tariffDraft.varQuery = event.target.value;
      tariffDrawerBody.querySelector("[data-tariff-var-list]").innerHTML = renderTariffFormulaVarItems(tariffDraft.varQuery);
    }
  });

  tariffDrawer?.addEventListener("change", (event) => {
    if (!tariffDraft) return;
    const target = event.target;
    if (target.matches("[data-tariff-select]")) {
      tariffDraft[target.dataset.tariffSelect] = target.value;
      delete tariffDraft.errors[target.dataset.tariffSelect];
      rerenderTariffDrawer(`#${target.closest("[data-fo-native-select]").querySelector("button").id}`);
    } else if (target.matches("[data-tariff-formula]")) {
      tariffDraft.formula = target.checked;
      tariffDraft.testResult = "";
      rerenderTariffDrawer("[data-tariff-formula]");
    } else if (target.matches("[data-tariff-date]")) {
      const key = target.dataset.tariffDate;
      tariffDraft[key] = target.closest("[data-date-picker]")?.dataset.selected || "";
      if (tariffDraft.errors[key]) {
        delete tariffDraft.errors[key];
        target.closest(".e-permits-fo-input")?.classList.remove("is-error");
        target.closest(".e-permits-fo-field")?.querySelector(".message--error")?.remove();
      }
    } else if (target.matches("[data-tariff-uservars]")) {
      tariffDraft.userVariables = target.checked;
    } else if (target.matches('[data-tariff-field="expression"]')) {
      /* new variables → new test inputs; the caret stays where it was */
      if (passport.formulaVariables(tariffDraft.expression).join() === tariffDraft.renderedVars) return;
      const caret = target.selectionStart;
      rerenderTariffDrawer("#tariff-expression");
      tariffDrawerBody.querySelector("#tariff-expression")?.setSelectionRange(caret, caret);
    }
  });

  tariffDrawer?.addEventListener("click", (event) => {
    if (!tariffDraft) return;
    const d = tariffDraft;
    const existing = (servicesStore.tariffs || []).find((t) => t.id === d.id) || null;

    if (event.target.closest("[data-tariff-close]")) { closeTariffDrawer(); return; }
    const save = event.target.closest("[data-tariff-save]");
    if (save) { saveTariffDrawer(save.dataset.tariffSave); return; }

    const person = event.target.closest("[data-tariff-person]");
    if (person) {
      d.personType = person.dataset.tariffPerson;
      delete d.errors.personType;
      rerenderTariffDrawer(`[data-tariff-person="${person.dataset.tariffPerson}"]`);
      return;
    }

    /* creation steps: Continuă validates „Detalii” before moving on */
    const goto = event.target.closest("[data-tariff-goto]");
    if (event.target.closest("[data-tariff-next]") || (goto && Number(goto.dataset.tariffGoto) === 2)) {
      const errors = passport.validateTariff({ ...d, amount: "1", formula: false, expression: "" });
      const stepErrors = Object.fromEntries(Object.entries(errors).filter(([key]) => TARIFF_FIELD_TAB[key] === "detalii"));
      if (Object.keys(stepErrors).length) { d.errors = stepErrors; rerenderTariffDrawer(".is-error input, .is-error .e-permits-fo-select__button"); return; }
      d.errors = {}; d.tab = "suma"; rerenderTariffDrawer("#tariff-currency"); tariffDrawerBody.scrollTop = 0; return;
    }
    if (event.target.closest("[data-tariff-back]") || (goto && Number(goto.dataset.tariffGoto) === 1)) { d.tab = "detalii"; rerenderTariffDrawer("#tariff-name"); tariffDrawerBody.scrollTop = 0; return; }

    const tab = event.target.closest("[data-tariff-tab]");
    if (tab) { d.tab = tab.dataset.tariffTab; rerenderTariffDrawer(`[data-tariff-tab="${d.tab}"]`); return; }

    /* „Inserează variabilă”: the token lands at the caret (as in Șabloane) */
    const pick = event.target.closest("[data-tariff-var]");
    if (pick) {
      const area = tariffDrawerBody.querySelector("#tariff-expression");
      const start = area.selectionStart ?? area.value.length;
      const end = area.selectionEnd ?? area.value.length;
      closeStackMenus();
      area.focus();
      area.setRangeText(`{{${pick.dataset.tariffVar}}}`, start, end, "end");
      area.dispatchEvent(new Event("input", { bubbles: true }));
      area.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    if (event.target.closest("[data-tariff-test-run]")) {
      const result = passport.evaluateFormula(d.expression, d.testValues, d.rounding);
      d.testResult = result.ok ? `Rezultat: <strong>${result.value.toLocaleString("ro-MD")} ${escapeHtml(d.currency)}</strong>` : `<span class="e-permits-tariff__test-error">${escapeHtml(result.error)}</span>`;
      tariffDrawerBody.querySelector("[data-tariff-test-result]").innerHTML = d.testResult;
      return;
    }

    if (event.target.closest("[data-tariff-toggle-active]") && existing) {
      const next = !existing.active;
      askConfirm(next
        ? { title: "Activezi tariful?", text: `„${existing.name}” va putea fi ales în taxe și apare pe notele de plată.`, confirmLabel: "Activează" }
        : { title: "Dezactivezi tariful?", text: `„${existing.name}” nu va mai putea fi ales în taxe. Taxele și notele deja generate nu se modifică.`, confirmLabel: "Dezactivează", destructive: true }, () => {
        existing.active = next;
        existing.modifiedAt = localIsoNow();
        existing.modifiedBy = currentUserName();
        tariffEvent(existing, existing.active ? "Activare tarif" : "Dezactivare tarif", existing.code);
        showShellToast(`Tariful „${existing.name}” a fost ${existing.active ? "activat" : "dezactivat"}.`);
        rerenderTariffDrawer("[data-tariff-toggle-active]");
        refreshTariffViews();
      });
      return;
    }

    const del = event.target.closest("[data-tariff-delete]");
    if (del && existing && del.getAttribute("aria-disabled") !== "true" && !tariffUsage(existing).length) {
      askConfirm({
        title: "Ștergi tariful?",
        text: `„${existing.name}” (${existing.code}) va fi eliminat definitiv. Acțiunea nu poate fi anulată.`,
        confirmLabel: "Șterge",
        destructive: true
      }, () => {
        servicesStore.tariffs = servicesStore.tariffs.filter((t) => t.id !== existing.id);
        tariffEvent(existing, "Ștergere tarif", `${existing.code} ${existing.name}`);
        closeTariffDrawer();
        refreshTariffViews();
        showShellToast(`Tariful „${existing.name}” a fost șters.`);
      });
    }
  });

  tariffDrawer?.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && tariffDraft) {
      event.preventDefault();
      closeTariffDrawer();
    }
  });

  /* ---- payment actions (Feature 93591) ---------------------------------- */

  const confirmModal = document.querySelector("#service-confirm-modal");
  let pendingConfirm = null;

  const askConfirm = ({ title, text, confirmLabel, destructive, cancelLabel = "Anulează" }, onConfirm) => {
    if (!confirmModal) {
      onConfirm();
      return;
    }

    confirmModal.querySelector("[data-service-confirm-title]").textContent = title;
    confirmModal.querySelector("[data-service-confirm-text]").textContent = text;
    const button = confirmModal.querySelector("[data-service-confirm-ok]");
    button.textContent = confirmLabel;
    button.className = `btn ${destructive ? "btn-destructive" : "btn-primary"} btn-rounded`;
    const dismiss = confirmModal.querySelector(".modal--footer [data-close]");
    if (dismiss) dismiss.textContent = cancelLabel;
    pendingConfirm = onConfirm;
    window.__modal?.open?.("#service-confirm-modal");
  };

  confirmModal?.querySelector("[data-service-confirm-ok]")?.addEventListener("click", () => {
    window.__modal?.close?.("#service-confirm-modal");
    const run = pendingConfirm;
    pendingConfirm = null;
    run?.();
  });

  /* tax lifecycle from the list: publish · activate · deactivate · delete, all confirmed */
  const runPaymentAction = (taxId, action) => {
    const service = getServiceByCode(serviceProfileState.code);
    const taxes = service ? serviceTaxes(service) : [];
    const tax = taxes.find((item) => item.id === taxId);

    if (!tax) {
      return;
    }

    const name = taxName(tax);
    const where = `„${tax.requestType}” · „${tax.moment}”${isConditional(tax) ? ` · ${conditionsLabel(tax)}` : ""}`;
    const commit = (type, detail, message) => {
      tax.modifiedAt = localIsoNow();
      tax.modifiedBy = currentUserName();
      logServiceEvents(service.code, [{ at: tax.modifiedAt, user: tax.modifiedBy, type, status: "Reușit", detail }]);
      renderServiceProfile();
      showShellToast(message);
    };

    if (action === "publish") {
      const check = passport.canPublishTax(tax);

      if (!check.ok) {
        showShellToast(check.message, "error");
        return;
      }

      askConfirm({
        title: "Publici taxa?",
        text: `Dosarele noi pentru ${where} vor include „${name}”.`,
        confirmLabel: "Publică"
      }, () => {
        tax.state = "Publicat";
        tax.active = !passport.taxConflict(taxes, { ...tax, active: true }, conditionTree());
        commit("Publicare taxă", `${name} v${tax.version}`, tax.active
          ? `Taxa „${name}” a fost publicată și activată.`
          : `Taxa „${name}” a fost publicată inactivă: același tarif se aplică deja la ${where}.`);
      });
      return;
    }

    if (action === "activate") {
      const conflict = passport.taxConflict(taxes, tax, conditionTree());

      if (conflict) {
        askConfirm({
          title: "Tariful se aplică deja",
          text: `„${name}” se aplică deja la ${where} printr-o altă taxă activă. Același tarif nu se poate încasa de două ori pe o solicitare. Dezactivezi cealaltă taxă și o activezi pe aceasta?`,
          confirmLabel: "Înlocuiește taxa activă",
      destructive: true
        }, () => {
          conflict.active = false;
          tax.active = true;
          commit("Activare taxă", `${name} (înlocuiește v${conflict.version})`, `Taxa „${name}” este acum activă.`);
        });
        return;
      }

      askConfirm({
        title: "Activezi taxa?",
        text: `Dosarele noi pentru ${where} vor include „${name}”.`,
        confirmLabel: "Activează"
      }, () => {
        tax.active = true;
        commit("Activare taxă", name, `Taxa „${name}” este acum activă.`);
      });
      return;
    }

    if (action === "deactivate") {
      askConfirm({
        title: "Dezactivezi taxa?",
        text: `„${name}” a fost aplicată în ${tax.usage} ${tax.usage === 1 ? "dosar" : "dosare"}. Notele de plată deja generate nu se modifică; dosarele noi nu o vor mai include.`,
        confirmLabel: "Dezactivează",
        destructive: true
      }, () => {
        tax.active = false;
        commit("Dezactivare taxă", name, `Taxa „${name}” a fost dezactivată.`);
      });
      return;
    }

    if (action === "delete" && passport.canDelete(tax)) {
      askConfirm({
        title: "Ștergi taxa?",
        text: `Regula pentru „${name}” va fi eliminată. Tariful rămâne și revine la „De configurat”.`,
        confirmLabel: "Șterge",
        destructive: true
      }, () => {
        service.geap.taxes = taxes.filter((item) => item.id !== tax.id);
        commit("Ștergere taxă", name, `Taxa „${name}” a fost ștearsă.`);
      });
    }
  };

  /* ---- wiring ----------------------------------------------------------- */

  /* a meta line that wraps must not end or start with a dot: parts that
     begin a new line get .is-row-start (the dot is their ::before, drawn in
     the gap, so hiding it never reflows the line) */
  const syncStackMetaRows = (root) => {
    root?.querySelectorAll(".e-permits-stack__meta").forEach((line) => {
      let previousTop = null;

      line.querySelectorAll(":scope > .e-permits-stack__part").forEach((part) => {
        const top = part.offsetTop;
        part.classList.toggle("is-row-start", previousTop === null || top > previousTop + 1);
        previousTop = top;
      });
    });
  };

  const passportBodyObserver = "ResizeObserver" in window
    ? new ResizeObserver(() => syncStackMetaRows(permitsProfilePanel))
    : null;
  const passportBodyEl = permitsProfilePanel?.querySelector("[data-passport-body]");

  if (passportBodyEl) {
    passportBodyObserver?.observe(passportBodyEl);
  }

  /* „Ieșire” (US-110): ends the session (SIA GEAP + MPass SLO) and lands on the login page */
  document.addEventListener("click", (event) => {
    const logout = event.target.closest(".e-permits-shell__profile-logout");
    if (!logout) return;
    event.preventDefault();
    window.location.assign("bo-login.html?ended=logout");
  });

  /* stacked-list overflow menus: one open at a time, Esc / outside click close */
  const closeStackMenus = (except = null) => {
    document.querySelectorAll("[data-stack-menu]").forEach((menu) => {
      if (menu !== except) {
        menu.hidden = true;
        document.querySelector(`[aria-controls="${menu.id}"]`)?.setAttribute("aria-expanded", "false");
      }
    });
  };

  /* one handler for every stacked list (passport, user / role permissions):
     open / close the overflow menu; its items keep their own data-* actions */
  document.addEventListener("click", (event) => {
    const menuTrigger = event.target.closest("[data-stack-menu-trigger]");

    if (menuTrigger) {
      const menu = document.getElementById(menuTrigger.getAttribute("aria-controls"));
      const willOpen = menu.hidden;
      closeStackMenus(menu);
      menu.hidden = !willOpen;
      menuTrigger.setAttribute("aria-expanded", String(willOpen));

      if (willOpen) {
        menu.querySelector("[role='menuitem']")?.focus();
      }

      return;
    }

    if (!event.target.closest(".e-permits-stack__menu-wrap") || event.target.closest(".e-permits-stack__menu [role='menuitem']")) {
      closeStackMenus();
    }
  });

  document.addEventListener("keydown", (event) => {
    const open = document.querySelector("[data-stack-menu]:not([hidden])");

    if (!open) {
      return;
    }

    if (event.key === "Escape") {
      closeStackMenus();
      document.querySelector(`[aria-controls="${open.id}"]`)?.focus();
      return;
    }

    /* same keyboard model as the post-process menu */
    if (["ArrowDown", "ArrowUp"].includes(event.key) && open.contains(document.activeElement)) {
      event.preventDefault();
      const items = [...open.querySelectorAll("[role='menuitem']")];
      const index = items.indexOf(document.activeElement);
      items[event.key === "ArrowDown" ? (index + 1) % items.length : (index - 1 + items.length) % items.length]?.focus();
    }
  });

  permitsProfilePanel?.addEventListener("input", (event) => {
    const evSearch = event.target.closest?.("[data-svc-events-search]");
    if (evSearch) { svcEventsState.query = evSearch.value; svcEventsState.shown = SVC_EVENTS_PAGE; refreshSvcEvents(); return; }
    const dtplSearch = event.target.closest?.("[data-dtpl-search]");
    if (dtplSearch) { dtplQuery = dtplSearch.value; refreshDtplList(); return; }
    const search = event.target.closest?.("[data-ntpl-svc-search]");
    if (!search) return;
    serviceNtplQuery = search.value;
    const service = getServiceByCode(serviceProfileState.code);
    const box = permitsProfilePanel.querySelector("[data-ntpl-svc-list]");
    if (service && box) box.innerHTML = renderServiceNtplList(service);
  });

  permitsProfilePanel?.addEventListener("click", (event) => {
    const openService = event.target.closest("[data-passport-open-service]");

    if (openService) {
      openServiceProfile(openService.dataset.passportOpenService);
      return;
    }

    const evFilter = event.target.closest("[data-svc-events-filter]");
    if (evFilter) {
      svcEventsState.filter = evFilter.dataset.svcEventsFilter; svcEventsState.shown = SVC_EVENTS_PAGE; refreshSvcEvents(true);
      permitsProfilePanel.querySelector(`[data-svc-events-filter="${svcEventsState.filter}"]`)?.focus();
      return;
    }
    if (event.target.closest("[data-svc-events-more]")) {
      svcEventsState.shown += SVC_EVENTS_PAGE; refreshSvcEvents();
      /* focus stays on the list: the next „Arată încă” (or the last row) */
      (permitsProfilePanel.querySelector("[data-svc-events-more]") || permitsProfilePanel.querySelector("[data-svc-events-list] .e-permits-timeline__item:last-child"))?.focus?.();
      return;
    }
    if (event.target.closest("[data-ntpl-clone]")) { openNtplClone(); return; }
    if (event.target.closest("[data-ntpl-new]")) { if (isCentralAdmin()) openNtplCreate({ service: serviceProfileState.code }); return; }
    if (event.target.closest("[data-service-history]")) { openServiceHistory(); return; }
    const svcSchedule = event.target.closest("[data-service-schedule]");
    if (svcSchedule) { closeStackMenus?.(); handleServiceSchedule(svcSchedule.dataset.serviceSchedule); return; }
    if (event.target.closest("[data-service-pending]")) { openServicePendingChanges(); return; }
    const svcPublish = event.target.closest("[data-service-publish]");
    if (svcPublish) { if (svcPublish.getAttribute("aria-disabled") !== "true") openServicePublish(); return; }
    const dtplPreviewBtn = event.target.closest("[data-dtpl-preview]");
    if (dtplPreviewBtn) { openTplPreview(dtplPreviewBtn.dataset.dtplPreview, dtplPreviewBtn); return; }
    const dtplOpenBtn = event.target.closest("[data-dtpl-open]");
    if (dtplOpenBtn) { openDtpl(dtplOpenBtn.dataset.dtplOpen); return; }
    const dtplEditBtn = event.target.closest("[data-dtpl-edit]");
    if (dtplEditBtn) { openDtplEdit(dtplEditBtn.dataset.dtplEdit); return; }
    const dtplDeleteBtn = event.target.closest("[data-dtpl-delete]");
    if (dtplDeleteBtn) { deleteDtpl(dtplDeleteBtn.dataset.dtplDelete); return; }
    if (event.target.closest("[data-dtpl-import]")) { openDtplImport(); return; }
    const dtplNewBtn = event.target.closest("[data-dtpl-new]");
    if (dtplNewBtn) { openDtplNew(dtplNewBtn); return; }
    const ntplToggle = event.target.closest("[data-ntpl-row-toggle]");
    if (ntplToggle) { toggleServiceTemplate(ntplToggle.dataset.ntplRowToggle); return; }
    const ntplDelete = event.target.closest("[data-ntpl-row-delete]");
    if (ntplDelete) { deleteServiceTemplate(ntplDelete.dataset.ntplRowDelete); return; }
    const ntplOpen = event.target.closest("[data-ntpl-open]");
    if (ntplOpen) { openTemplateDetail(ntplOpen.dataset.ntplOpen); return; }
    if (event.target.closest("[data-ntpl-back]")) {
      /* back to this service's Notificări tab, not a global list (US-187) */
      const code = serviceProfileState.templateCode;
      serviceProfileState.templateCode = null;
      renderServiceProfile();
      permitsProfilePanel.querySelector(`[data-ntpl-open="${code}"]`)?.focus();
      return;
    }
    const ntplTab = event.target.closest("[data-ntpl-tab]");
    if (ntplTab) {
      serviceProfileState.templateTab = ntplTab.dataset.ntplTab;
      renderServiceProfile();
      permitsProfilePanel.querySelector(`[data-ntpl-tab="${serviceProfileState.templateTab}"]`)?.focus();
      return;
    }

    const tabButton = event.target.closest("[data-passport-tab]");

    if (tabButton) {
      event.preventDefault();
      serviceProfileState.tabKey = normalizePassportTab(tabButton.dataset.passportTab);
      serviceProfileState.templateCode = null;
      renderServiceProfile();
      history.replaceState(null, "", `#serviciu/${serviceProfileState.code}/${serviceProfileState.tabKey}`);
      permitsProfilePanel.querySelector(`[data-passport-tabs] [data-passport-tab="${serviceProfileState.tabKey}"]`)?.focus();

      return;
    }

    if (event.target.closest("[data-passport-crumb-back]")) {
      event.preventDefault();
      closeServiceProfile();
      return;
    }

    if (event.target.closest("[data-passport-resync]")) {
      openSyncModal(serviceProfileState.code);
      return;
    }

    const syncOpen = event.target.closest("[data-sync-open]");

    if (syncOpen) {
      openSyncModal(syncOpen.dataset.syncOpen, syncOpen.dataset.syncSource);
      return;
    }

    const tariffAdd = event.target.closest("[data-tariff-add]");

    if (tariffAdd) {
      openTariffDrawer(null, tariffAdd.dataset.tariffAdd);
      return;
    }

    const tariffEdit = event.target.closest("[data-tariff-edit]");

    if (tariffEdit) {
      openTariffDrawer(tariffEdit.dataset.tariffEdit);
      return;
    }

    const tariffSync = event.target.closest("[data-tariff-sync]");

    if (tariffSync) {
      syncServiceTariffsFrom(getServiceByCode(serviceProfileState.code), tariffSync.dataset.tariffSync);
      return;
    }

    const tariffGoto = event.target.closest("[data-tariff-goto]");

    if (tariffGoto) {
      event.preventDefault();
      goToTariff(tariffGoto.dataset.tariffGoto);
      return;
    }

    if (event.target.closest("[data-pay-add]")) {
      openPaymentDrawer();
      return;
    }

    const taxApply = event.target.closest("[data-tax-apply]");

    if (taxApply) {
      applyTariffAsIs(taxApply.dataset.taxApply);
      return;
    }

    const taxConfigure = event.target.closest("[data-tax-configure]");

    if (taxConfigure) {
      openPaymentDrawer(null, { tariffId: taxConfigure.dataset.taxConfigure });
      return;
    }

    const payEdit = event.target.closest("[data-pay-edit]");

    if (payEdit) {
      openPaymentDrawer(payEdit.dataset.payEdit);
      return;
    }

    if (event.target.closest("[data-pay-export]")) {
      exportPayments(getServiceByCode(serviceProfileState.code));
      return;
    }

    const payFilter = event.target.closest("[data-pay-filter]");

    if (payFilter) {
      const service = getServiceByCode(serviceProfileState.code);
      payListState.filter = payFilter.dataset.payFilter;
      permitsProfilePanel.querySelector("[data-pay-chips]").innerHTML = renderPayChips(service);
      permitsProfilePanel.querySelector("[data-pay-list]").innerHTML = renderPaymentList(service);
      permitsProfilePanel.querySelector(`[data-pay-filter="${payListState.filter}"]`)?.focus();
      return;
    }

    if (event.target.closest("[data-passport-form-new]")) {
      createServiceForm();
      return;
    }

    const formAction = event.target.closest("[data-passport-form-action]");

    if (formAction) {
      runServiceFormAction(formAction.dataset.passportForm, formAction.dataset.passportFormAction);
      return;
    }

    const addRt = event.target.closest("[data-passport-add-rt]");

    if (addRt) {
      addServiceRequestType(addRt.dataset.passportAddRt);
      return;
    }

    const removeRt = event.target.closest("[data-passport-remove-rt]");

    if (removeRt) {
      removeServiceRequestType(removeRt.dataset.passportRemoveRt);
      return;
    }

    const configure = event.target.closest("[data-passport-configure-rt]");

    if (configure) {
      openRequestTypeDrawer(configure.dataset.passportConfigureRt);
      return;
    }

    if (event.target.closest("[data-passport-open-builder]")) {
      formBuilderOverlay?.classList.add("is-sheet");
      window.__modal?.open?.("#form-builder-modal");
      return;
    }

    const paymentButton = event.target.closest("[data-passport-payment]");

    if (paymentButton) {
      runPaymentAction(paymentButton.dataset.passportPayment, paymentButton.dataset.passportPaymentAction);
    }
  });

  permitsProfilePanel?.addEventListener("input", (event) => {
    if (event.target.matches("[data-pay-search]")) {
      payListState.query = event.target.value;
      permitsProfilePanel.querySelector("[data-pay-list]").innerHTML = renderPaymentList(getServiceByCode(serviceProfileState.code));
    }
  });

  /* Documente: „Afișează” / „Obligatoriu” go into the service draft like a setting */
  permitsProfilePanel?.addEventListener("change", (event) => {
    const input = event.target.closest("[data-svc-doc-required], [data-svc-doc-visible]");
    const service = input && getServiceByCode(serviceProfileState.code);
    if (!service) return;
    const isVisible = input.dataset.svcDocVisible !== undefined;
    const index = isVisible ? input.dataset.svcDocVisible : input.dataset.svcDocRequired;
    const doc = service.rssp.documents[Number(index)];
    const key = isVisible ? "documentVisible" : "documentRequired";
    const rssp = isVisible ? true : Boolean(doc.required);
    service.geap[key] = { ...(service.geap[key] || {}), [doc.title]: input.checked };
    if (input.checked === rssp) delete service.geap[key][doc.title];
    const what = isVisible ? (input.checked ? "afișat în cerere" : "ascuns din cerere") : (input.checked ? "obligatoriu" : "opțional");
    logServiceEvents(service.code, [{ at: localIsoNow(), user: currentUserName(), type: "Editare document însoțitor", status: "Reușit", detail: `${doc.title}: ${what}` }], { render: false });
    const attr = isVisible ? "data-svc-doc-visible" : "data-svc-doc-required";
    setTimeout(() => {
      if (permitsProfilePanel.hidden || serviceProfileState.code !== service.code) return;
      renderServiceProfile();
      permitsProfilePanel.querySelector(`[${attr}="${index}"]`)?.focus();
    }, SERVICE_SETTING_SLIDE_MS);
    /* a switch shows its own result — no toast (user, 2026-10-08) */
  });

  /* =====================================================================
     Servicii › Setări (US-221, Azure 95229): the story's 11 sections, in its order, each a
     read-only card with „Editează” → the standard drawer (Salvează / Anulează). RSSP values
     are read-only and tagged „Din RSSP”; MPower, MDelivery and aprobare tacită are editable
     only when RSSP sends nothing. Saving logs one audit event per changed field (old → new)
     and the passport header counts them as unpublished changes. The three switches that are
     not in the story stay as they were, under „Alte setări”.
     ===================================================================== */
  const CFG_APPLICANT = { "Persoană fizică": "PF", "Persoană juridică": "PJ", "Persoană fizică străină": "PF Străin", "Persoană juridică străină": "PJ Străin" };
  const CFG_AUTH_MODES = ["Doar MPower", "Doar procură pe hârtie", "MPower și procură pe hârtie"];
  const CFG_CRITERIA = ["După coeficientul de ocupare", "Aleatoriu"];
  const CFG_SIGN_REQUEST = ["Obligatorie", "Opțională", "Nu se semnează"];
  const CFG_PDF_GEN = ["Automat la aprobare", "La inițiativa specialistului"];
  const CFG_RELEASE_ACTORS = ["Specialist ghișeu", "Specialist", "Asistent tehnic"];
  const CFG_DECISIONS = ["Aprobare", "Respingere"];
  const CFG_DAY_TYPES = ["Zile lucrătoare", "Zile calendaristice"];
  const CFG_DOC_TYPES = ["Act permisiv", "Decizie de respingere", "Înștiințare"];
  const CFG_RESET = ["Anual", "Fără resetare"];
  const CFG_DEP_TYPES = ["Totală", "Parțială", "Externă", "Exclusivă"];
  const CFG_DEP_HINT = {
    "Totală": "Cererea se depune doar după emiterea actului în serviciul sursă; câmpurile alese se preiau din dosarul sursă.",
    "Parțială": "Cererea poate solicita actele alese ale serviciului sursă; câmpurile alese se preiau din dosarul sursă.",
    "Externă": "Valoarea câmpului din cerere se verifică prin MConnect în sursa externă.",
    "Exclusivă": "Solicitantul cu un act activ în serviciul incompatibil nu poate depune cererea — și invers."
  };
  const CFG_EXT_SOURCES = ["Registrul bunurilor imobile · MConnect", "Registrul de stat al unităților de drept · MConnect", "Registrul de stat al populației · MConnect"];
  /* fields of the service's forms (Formulare) — what RAP can publish and a source service can give */
  const CFG_FORM_FIELDS = ["Denumirea persoanei juridice", "IDNO", "Adresa juridică", "Obiectul autorizat", "Adresa desfășurării activității", "Genul de activitate (CAEM)", "Suprafața obiectului (m²)", "Codul cadastral", "Numele și prenumele (PF)", "IDNP"];
  /* personal data of a natural person is always published anonymised (US-145) */
  const CFG_ALWAYS_ANON = ["Numele și prenumele (PF)", "IDNP"];
  const CFG_SECTIONS = [
    ["applicant", "Solicitant și act"], ["exam", "Examinare și distribuire"], ["suspension", "Suspendare"], ["signing", "Semnare"],
    ["payment", "Plată"], ["delivery", "Livrare și eliberare"], ["appeal", "Contestare"], ["numbering", "Numerotare"],
    ["rap", "Publicare în RAP"], ["drafts", "Schițe"]
  ];
  const CFG_FIELDS = {
    applicant: [["mpower", "Verificare împuternicire prin MPower"], ["authMode", "Modalitatea de verificare a împuternicirii"], ["tacit", "Aprobare tacită activată"]],
    exam: [["subdivisions", "Subdiviziuni de examinare"], ["autoDist", "Distribuire automată"], ["distEligible", "Doar specialiștii eligibili pentru serviciu"], ["distExcludeAbsent", "Exclude specialiștii absenți sau inactivi"], ["distCriterion", "Criteriu de distribuire"], ["distMax", "Coeficientul maxim de ocupare"]],
    suspension: [["suspCustom", "Suspendare termen examinare personalizată"], ["suspDays", "Termenul de suspendare implicit (zile)"], ["suspEditable", "Termen de suspendare modificabil de specialist"], ["suspSigned", "Suspendare cu semnarea deciziei"]],
    signing: [["signRequest", "Semnarea cererii prin MSign"], ["signCounter", "Semnarea cererii MSign de ghișeu"], ["pdfGen", "Generarea documentului PDF"], ["pdfSign", "Semnarea documentului PDF prin MSign"]],
    payment: [["mpayCode", "Cod serviciu MPay"], ["payTerm", "Termenul de achitare (zile)"]],
    delivery: [["eDelivery", "Livrare electronică"], ["mdelivery", "Livrare prin MDelivery"], ["paperRelease", "Eliberare pe hârtie la autoritatea emitentă"], ["releaseActor", "Actorul care imprimă și eliberează actul"]],
    appeal: [["appealable", "Serviciu contestabil"], ["appealTypes", "Tipuri de solicitare contestabile"], ["appealDecisions", "Decizii contestabile"], ["appealDays", "Termen admisibil de contestare (zile)"], ["appealDayType", "Tipul zilelor de contestare"]],
    numbering: [["numbering", "Reguli de numerotare"]],
    rap: [["rap", "Câmpuri transmise în RAP"]],
    drafts: [["draftDays", "Perioada de retenție a schițelor (zile)"]]
  };

  const cfgRssp = (service) => {
    const r = service.rssp || {};
    const v = (r.validity || [])[0];
    return {
      applicants: (r.applicantTypes || []).map((t) => CFG_APPLICANT[t] || t),
      mpower: typeof r.allowsMPower === "boolean" ? r.allowsMPower : null,
      validity: v ? (v.validFor ? String(v.validFor) : "Nelimitată") : "—",
      validityUnit: v && v.validFor ? "Ani" : "—",
      tacit: typeof r.tacitApproval === "boolean" ? r.tacitApproval : null,
      paid: Boolean(r.paid),
      mdelivery: typeof r.allowsMDelivery === "boolean" ? r.allowsMDelivery : null
    };
  };
  const cfgSubdivisionOptions = (service) => [...new Set([...(service.geap.settings?.subdivisions || []), "Secția autorizări Bălți", "Secția autorizări Cahul"])];
  const cfgPublishedServices = (service) => (servicesStore?.services || []).filter((s) => s.code !== service.code && s.status !== "Inactiv");
  const cfgServiceTitle = (code) => { const s = getServiceByCode(code); return s ? `${s.title} · ${s.code}` : code || "—"; };

  const serviceConfig = (service) => {
    const geap = service.geap;
    if (geap.cfg) return geap.cfg;
    const s = geap.settings || {}, flags = serviceSettingFlags(service), r = cfgRssp(service);
    const rts = geap.requestTypes.map((rt) => rt.name);
    const term = String(s.paymentWait || "").match(/\d+/);
    geap.cfg = {
      authMode: CFG_AUTH_MODES[2], mpower: r.mpower ?? true, tacit: r.tacit ?? false,
      subdivisions: [...(s.subdivisions || [])], autoDist: Boolean(flags.distribuireAutomata), distEligible: true, distExcludeAbsent: true, distCriterion: CFG_CRITERIA[0], distMax: "15",
      suspCustom: /^Da/.test(s.suspension || ""), suspDays: (String(s.suspension || "").match(/(\d+)\s*zile/) || [])[1] || "30", suspEditable: true, suspSigned: false,
      signRequest: CFG_SIGN_REQUEST[1], signCounter: true, pdfGen: CFG_PDF_GEN[0], pdfSign: true,
      mpayCode: r.paid ? `MP-${service.code}` : "", payTerm: term ? term[0] : "30",
      eDelivery: true, mdelivery: r.mdelivery ?? Boolean(flags.mdelivery), paperRelease: Boolean(flags.actHartie), releaseActor: CFG_RELEASE_ACTORS[0],
      appealable: false, appealTypes: [], appealDecisions: [], appealDays: "", appealDayType: CFG_DAY_TYPES[0],
      numbering: [{ doc: "Act permisiv", prefix: (getAuthorityById(service.authorityId)?.code || "AUT"), sep: "-", len: "6", start: "1", current: 4575, reset: "Anual" }],
      rap: [{ field: "Denumirea persoanei juridice", anon: false }, { field: "IDNO", anon: false }, { field: "Obiectul autorizat", anon: false }, { field: "Numele și prenumele (PF)", anon: true }],
      draftDays: "90",
      deps: (geap.dependencies || []).map((d, i) => d.relation === "Excludere mutuală"
        ? { id: `dep-${i + 1}`, name: d.act, requestTypes: [...rts], type: "Exclusivă", incompatible: d.code }
        : { id: `dep-${i + 1}`, name: d.act, requestTypes: rts.slice(0, 1), type: "Totală", source: d.code, fields: ["Denumirea persoanei juridice", "IDNO"] }),
      editedAt: null, editedBy: null
    };
    return geap.cfg;
  };
  /* the switches elsewhere read flags: keep them in step with the settings */
  const syncCfgFlags = (service) => {
    const c = serviceConfig(service), f = serviceSettingFlags(service);
    Object.assign(f, { distribuireAutomata: c.autoDist, actHartie: c.paperRelease, mdelivery: c.mdelivery });
  };
  const cfgNumberExample = (rule) => {
    const next = Math.max(Number(rule.current || 0) + 1, Number(rule.start || 1));
    return `${rule.prefix || ""}${rule.sep || ""}${String(next).padStart(Number(rule.len) || 1, "0")}`;
  };

  /* ---- read view ---- */
  /* the RSSP source is plain caption text at the row's right end (as „sincronizat …” in the
     header), not a tag (user, 2026-10-09) */
  const cfgRssPNote = () => '<span class="e-permits-cfg-source">Din RSSP</span>';
  const cfgFromRssp = (html) => `<span class="e-permits-cfg-value e-permits-cfg-value--rssp"><span class="e-permits-cfg-value">${html}</span>${cfgRssPNote()}</span>`;
  const cfgRows = (service, key) => {
    const c = serviceConfig(service), r = cfgRssp(service);
    switch (key) {
      case "applicant": return [
        ["Tip solicitant", cfgFromRssp(applicantTags(r.applicants))],
        ["Verificare împuternicire prin MPower", r.mpower === null ? yesNo(c.mpower) : cfgFromRssp(yesNo(r.mpower))],
        ["Modalitatea de verificare a împuternicirii", escapeHtml(c.authMode)],
        ["Durata valabilității actului", cfgFromRssp(escapeHtml(r.validity))],
        ["Unitatea valabilității", cfgFromRssp(escapeHtml(r.validityUnit))],
        ["Aprobare tacită activată", r.tacit === null ? yesNo(c.tacit) : cfgFromRssp(yesNo(r.tacit))]];
      case "exam": return [
        ["Subdiviziuni de examinare", valueTags(c.subdivisions)],
        ["Distribuire automată", c.autoDist ? yesNo(true) : "Nu — dosarele se distribuie manual"],
        ...(c.autoDist ? [["Doar specialiștii eligibili pentru serviciu", yesNo(c.distEligible)], ["Exclude specialiștii absenți sau inactivi", yesNo(c.distExcludeAbsent)], ["Criteriu de distribuire", escapeHtml(c.distCriterion)], ["Coeficientul maxim de ocupare", escapeHtml(c.distMax ? `${c.distMax} dosare active / specialist` : "—")]] : [])];
      case "suspension": return [
        ["Suspendare termen examinare personalizată", yesNo(c.suspCustom)],
        ["Termenul de suspendare implicit (zile)", escapeHtml(c.suspCustom ? `${c.suspDays} zile calendaristice` : "30 zile calendaristice (implicit)")],
        ["Termen de suspendare modificabil de specialist", yesNo(c.suspEditable)],
        ["Suspendare cu semnarea deciziei", yesNo(c.suspSigned)]];
      case "signing": return [
        ["Semnarea cererii prin MSign", escapeHtml(c.signRequest)], ["Semnarea cererii MSign de ghișeu", yesNo(c.signCounter)],
        ["Generarea documentului PDF", escapeHtml(c.pdfGen)], ["Semnarea documentului PDF prin MSign", yesNo(c.pdfSign)]];
      case "payment": return [
        ["Serviciu cu plată", cfgFromRssp(yesNo(r.paid))],
        ["Cod serviciu MPay", r.paid ? escapeHtml(c.mpayCode || "—") : '<span class="e-permits-passport__muted">Nu se aplică — serviciul nu are plată</span>'],
        ["Termenul de achitare (zile)", escapeHtml(`${c.payTerm} zile calendaristice`)]];
      case "delivery": return [
        ["Livrare electronică", yesNo(c.eDelivery)],
        ["Livrare prin MDelivery", r.mdelivery === null ? yesNo(c.mdelivery) : cfgFromRssp(yesNo(r.mdelivery))],
        ["Eliberare pe hârtie la autoritatea emitentă", yesNo(c.paperRelease)],
        ["Actorul care imprimă și eliberează actul", escapeHtml(c.releaseActor)]];
      case "appeal": return [
        ["Serviciu contestabil", yesNo(c.appealable)],
        ...(c.appealable ? [["Tipuri de solicitare contestabile", valueTags(c.appealTypes)], ["Decizii contestabile", valueTags(c.appealDecisions)], ["Termen admisibil de contestare", escapeHtml(`${c.appealDays} ${c.appealDayType.toLocaleLowerCase("ro")}`)]] : [])];
      case "numbering": return c.numbering.length
        ? c.numbering.map((rule) => [rule.doc, `<span class="e-permits-cfg-value"><strong>${escapeHtml(cfgNumberExample(rule))}</strong><span class="e-permits-passport__muted">următorul · contor ${escapeHtml(rule.len)} cifre · ${escapeHtml(rule.reset === "Anual" ? "resetare anuală" : "fără resetare")} · ultimul ${escapeHtml(String(rule.current || 0))}</span></span>`])
        : [["Reguli de numerotare", '<span class="e-permits-passport__muted">Nicio regulă</span>']];
      case "rap": return c.rap.length
        ? c.rap.map((row) => [row.field, row.anon || CFG_ALWAYS_ANON.includes(row.field) ? renderTag("Anonimizat", "neutral") : "Se publică"])
        : [["Câmpuri transmise în RAP", '<span class="e-permits-passport__muted">Niciun câmp</span>']];
      case "drafts": return [["Perioada de retenție a schițelor (zile)", escapeHtml(`${c.draftDays} zile calendaristice`)]];
      default: return [];
    }
  };
  const cfgEditButton = (key, title) => `<button class="btn btn-neutral btn-sm" type="button" aria-haspopup="dialog" aria-controls="svc-cfg-drawer" aria-expanded="false" aria-label="Editează: ${escapeHtml(title)}" data-svc-cfg-edit="${key}">${EDIT_LABEL_HTML}</button>`;
  const renderServiceSettings = (service) => {
    const editable = isCentralAdmin();
    const flags = serviceSettingFlags(service);
    const c = serviceConfig(service);
    const blocks = CFG_SECTIONS.map(([key, title]) => renderPassportBlock(title, cfgRows(service, key), { actionHtml: editable ? cfgEditButton(key, title) : "" })).join("");
    const deps = c.deps.map((dep) => ({
      plainTitle: dep.name,
      title: escapeHtml(dep.name),
      badges: [renderTag(dep.type, "neutral")],
      meta: [
        dep.type === "Externă" ? `${escapeHtml(dep.formField)} → ${escapeHtml(dep.extSource)}` : dep.type === "Exclusivă" ? `Serviciul incompatibil: ${escapeHtml(cfgServiceTitle(dep.incompatible))}` : `Serviciul sursă: ${escapeHtml(cfgServiceTitle(dep.source))}`,
        `Tip solicitare: ${escapeHtml(dep.requestTypes.join(", ") || "—")}`
      ],
      actionsHtml: editable ? `
        <button class="btn btn-neutral btn-sm e-permits-stack__action" type="button" aria-haspopup="dialog" aria-controls="svc-cfg-drawer" data-svc-dep-edit="${escapeHtml(dep.id)}">${EDIT_LABEL_HTML}</button>
        ${renderStackMenu([{ label: "Elimină", icon: "delete", danger: true, attrs: `data-svc-dep-remove="${escapeHtml(dep.id)}"` }], dep.name)}` : ""
    }));
    const addDep = editable ? `<button class="btn btn-secondary btn-sm" type="button" aria-haspopup="dialog" aria-controls="svc-cfg-drawer" aria-expanded="false" data-svc-dep-add><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-large"></use></svg><span>Adaugă interdependență</span></button>` : "";
    const kept = SERVICE_SETTINGS.filter(([key]) => ["aprobareSecundara", "cuExpertiza", "suspendareCoordonare"].includes(key));
    return `
      ${c.editedAt ? `<p class="e-permits-cfg-edited">Editat ${escapeHtml(formatStamp(c.editedAt))} · ${escapeHtml(c.editedBy || "—")}</p>` : ""}
      ${blocks}
      ${renderStackedList("Interdependențe", deps.length ? [{ label: "", items: deps }] : [], { actionHtml: addDep, meta: deps.length ? plural(deps.length, "interdependență", "interdependențe") : "", empty: "Serviciul nu are interdependențe cu alte servicii sau surse externe." })}
      <section class="e-permits-dosar-profil__section">
        <h2 class="e-permits-dosar-profil__section-title">Alte setări</h2>
        <div class="e-permits-ntpl-card e-permits-svc-settings">
          ${kept.map(([key, label, description]) => `<div class="e-permits-svc-setting">${renderToggle({ label, description, checked: Boolean(flags[key]), attrs: `data-svc-setting="${key}"`, disabled: !editable })}</div>`).join("")}
        </div>
      </section>
    `;
  };

  /* ---- edit drawer (one section, or one interdependence) ---- */
  const cfgDrawer = document.querySelector("[data-svc-cfg-drawer]");
  const cfgBody = cfgDrawer?.querySelector("[data-svc-cfg-body]");
  let cfgDraft = null;
  const cfgClone = (v) => JSON.parse(JSON.stringify(v));
  const cfgField = (key, label, control, { required = false, hint = "", span = 12 } = {}) => `
    <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--${span}">
      <label for="cfg-${key}">${escapeHtml(label)}${required ? requiredMark() : ""}</label>
      ${control}
      ${clasFieldError(cfgDraft.errors, key)}
      ${hint && !cfgDraft.errors[key] ? `<p class="e-permits-fo-field__hint">${hint}</p>` : ""}
    </div>`;
  const cfgSelect = (key, label, options, o = {}) => cfgField(key, label, renderFoSelectControl({ id: `cfg-${key}`, attrs: `data-cfg-select="${key}"`, error: Boolean(cfgDraft.errors[key]),
    optionsHtml: `${o.placeholder ? `<option value=""${cfgDraft.v[key] ? "" : " selected"} disabled>${escapeHtml(o.placeholder)}</option>` : ""}${options.map((x) => { const [val, lab] = Array.isArray(x) ? x : [x, x]; return `<option value="${escapeHtml(val)}"${val === cfgDraft.v[key] ? " selected" : ""}>${escapeHtml(lab)}</option>`; }).join("")}` }), o);
  const cfgInput = (key, label, o = {}) => cfgField(key, label, `<div class="e-permits-fo-input${cfgDraft.errors[key] ? " is-error" : ""}"><input id="cfg-${key}" type="text"${o.numeric ? ' inputmode="numeric" maxlength="5" data-cfg-numeric' : ' maxlength="60"'} value="${escapeHtml(cfgDraft.v[key] ?? "")}" placeholder="${escapeHtml(o.placeholder || "")}" autocomplete="off" data-cfg-input="${key}"></div>`, o);
  const cfgSwitch = (key, label, description, { disabled = false } = {}) => `<div class="e-permits-svc-setting">${renderToggle({ label, description, checked: Boolean(cfgDraft.v[key]), attrs: `data-cfg-switch="${key}"`, disabled })}</div>`;
  const cfgChecks = (key, label, options, o = {}) => cfgField(key, label, `<div class="e-permits-pay__exemptions" role="group" aria-label="${escapeHtml(label)}">${options.map((x) => { const [val, lab] = Array.isArray(x) ? x : [x, x]; return `
    <label class="checkbox checkbox--medium"><input class="checkbox-input" type="checkbox" value="${escapeHtml(val)}" data-cfg-check="${key}"${(cfgDraft.v[key] || []).includes(val) ? " checked" : ""}><span class="checkbox-custom" aria-hidden="true"></span><span class="checkbox-texts"><span class="checkbox-label">${escapeHtml(lab)}</span></span></label>`; }).join("")}</div>`, o);
  const cfgReadonly = (label, html) => `
    <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--12">
      <span class="e-permits-cfg-ro__label">${escapeHtml(label)}</span>
      <div class="e-permits-cfg-ro">${cfgFromRssp(html)}</div>
      <p class="e-permits-fo-field__hint">Preluat din RSSP — se actualizează la resincronizarea serviciului.</p>
    </div>`;
  const cfgGrid = (html) => `<div class="e-permits-user-create__grid">${html}</div>`;
  /* a switch that unlocks more fields: one bordered group, the fields under the switch text */
  const cfgGroup = (switchHtml, on, bodyHtml) => `<div class="e-permits-cfg-group">${switchHtml}${on ? `<div class="e-permits-cfg-group__body">${bodyHtml}</div>` : ""}</div>`;

  const CFG_GROUP_SWITCHES = ["autoDist", "suspCustom", "appealable"];
  const renderCfgForm = (service) => {
    const v = cfgDraft.v, r = cfgRssp(service), rts = service.geap.requestTypes.map((rt) => rt.name);
    switch (cfgDraft.section) {
      case "applicant": return cfgGrid(`
        ${cfgReadonly("Tip solicitant", escapeHtml(r.applicants.join(", ") || "—"))}
        ${r.mpower === null ? cfgSwitch("mpower", "Verificare împuternicire prin MPower", "RSSP nu transmite valoarea — se poate seta aici.") : cfgReadonly("Verificare împuternicire prin MPower", r.mpower ? "Da" : "Nu")}
        ${cfgSelect("authMode", "Modalitatea de verificare a împuternicirii", CFG_AUTH_MODES, { required: true, hint: "Cum se verifică împuternicirea solicitantului care acționează în numele altei persoane." })}
        ${cfgReadonly("Durata valabilității actului", `${escapeHtml(r.validity)}${r.validityUnit !== "—" ? ` ${escapeHtml(r.validityUnit.toLocaleLowerCase("ro"))}` : ""}`)}
        ${r.tacit === null ? cfgSwitch("tacit", "Aprobare tacită activată", "Implicit Nu. Pe fiecare tip de solicitare se setează în „Tipuri solicitări”.") : cfgReadonly("Aprobare tacită activată", r.tacit ? "Da" : "Nu")}`);
      case "exam": return cfgGrid(`
        ${cfgChecks("subdivisions", "Subdiviziuni de examinare", cfgSubdivisionOptions(service), { required: true, hint: "Examinează toate tipurile de solicitare ale serviciului." })}
        ${cfgGroup(cfgSwitch("autoDist", "Distribuire automată", v.autoDist ? "Dosarele noi se distribuie după regulile de mai jos." : "Dosarele se distribuie manual de supervizor."), v.autoDist, `
          ${cfgSwitch("distEligible", "Doar specialiștii eligibili pentru serviciu", "Dosarele merg doar la specialiștii marcați eligibili.")}
          ${cfgSwitch("distExcludeAbsent", "Exclude specialiștii absenți sau inactivi", "Concediu sau cont inactiv = nu primesc dosare.")}
          ${cfgGrid(`${cfgSelect("distCriterion", "Criteriu de distribuire", CFG_CRITERIA, { required: true, span: 6 })}${cfgInput("distMax", "Coeficientul maxim de ocupare", { numeric: true, span: 6, placeholder: "Ex. 15", hint: "Dosare active la examinare per specialist." })}`)}`)}`);
      case "suspension": return cfgGrid(`
        ${cfgGroup(cfgSwitch("suspCustom", "Suspendare termen examinare personalizată", v.suspCustom ? "Termenul implicit de mai jos înlocuiește cele 30 de zile." : "Se aplică termenul implicit de 30 de zile calendaristice."), v.suspCustom,
          cfgGrid(cfgInput("suspDays", "Termenul de suspendare implicit (zile)", { required: true, numeric: true, span: 6, hint: "Zile calendaristice." })))}
        ${cfgSwitch("suspEditable", "Termen de suspendare modificabil de specialist", "Specialistul poate schimba termenul la inițierea suspendării.")}
        ${cfgSwitch("suspSigned", "Suspendare cu semnarea deciziei", "Suspendarea trece prin semnarea deciziei (US-127); altfel fără semnare (US-126).")}`);
      case "signing": return cfgGrid(`
        ${cfgSelect("signRequest", "Semnarea cererii prin MSign", CFG_SIGN_REQUEST, { required: true, hint: "Semnarea cererii de către solicitant la depunerea online." })}
        ${cfgSwitch("signCounter", "Semnarea cererii MSign de ghișeu", "Specialistul ghișeu semnează prin MSign cererea depusă la ghișeu.")}
        ${cfgSelect("pdfGen", "Generarea documentului PDF", CFG_PDF_GEN, { required: true, hint: "Pentru actul permisiv și decizia de respingere." })}
        ${cfgSwitch("pdfSign", "Semnarea documentului PDF prin MSign", "Numărul de semnături se setează pe tipul de solicitare.")}`);
      case "payment": return cfgGrid(`
        ${cfgReadonly("Serviciu cu plată", r.paid ? "Da — RSSP are tarife mai mari de 0 lei" : "Nu")}
        ${r.paid ? cfgInput("mpayCode", "Cod serviciu MPay", { required: true, span: 6, placeholder: "Ex. MP-003000023", hint: "Identificatorul serviciului în MPay, pentru nota de plată." }) : ""}
        ${cfgInput("payTerm", "Termenul de achitare (zile)", { required: true, numeric: true, span: 6, hint: "Zile calendaristice; precompletează termenul fiecărei taxe noi." })}`);
      case "delivery": return cfgGrid(`
        ${cfgSwitch("eDelivery", "Livrare electronică", "Actul ajunge în EVO Cabinet.")}
        ${r.mdelivery === null ? cfgSwitch("mdelivery", "Livrare prin MDelivery", "RSSP nu transmite valoarea — se poate seta aici.") : cfgReadonly("Livrare prin MDelivery", r.mdelivery ? "Da" : "Nu")}
        ${cfgSwitch("paperRelease", "Eliberare pe hârtie la autoritatea emitentă", "Declanșează emiterea fizică a rezultatului solicitării.")}
        ${cfgSelect("releaseActor", "Actorul care imprimă și eliberează actul", CFG_RELEASE_ACTORS, { required: true })}`);
      case "appeal": return cfgGrid(`
        ${cfgGroup(cfgSwitch("appealable", "Serviciu contestabil", v.appealable ? "Se poate depune contestație în termenul de mai jos." : "Nu se pot depune contestații pentru dosarele serviciului."), v.appealable, cfgGrid(`
          ${cfgChecks("appealTypes", "Tipuri de solicitare contestabile", rts, { required: true })}
          ${cfgChecks("appealDecisions", "Decizii contestabile", CFG_DECISIONS, { required: true })}
          ${cfgInput("appealDays", "Termen admisibil de contestare (zile)", { required: true, numeric: true, span: 6, hint: "Calculat de la emiterea deciziei." })}
          ${cfgSelect("appealDayType", "Tipul zilelor de contestare", CFG_DAY_TYPES, { required: true, span: 6 })}`))}`);
      case "numbering": {
        const used = v.numbering.map((x) => x.doc);
        return `
          <div class="e-permits-tax-cond__list">${v.numbering.map((rule, i) => {
            const k = (f) => `n${i}-${f}`;
            const sel = (f, label, options, span, req = true) => cfgField(k(f), label, renderFoSelectControl({ id: `cfg-${k(f)}`, attrs: `data-cfg-rule="${i}" data-cfg-rule-field="${f}"`, error: Boolean(cfgDraft.errors[k(f)]), optionsHtml: `<option value=""${rule[f] ? "" : " selected"} disabled>Alege</option>${options.map((x) => `<option value="${escapeHtml(x)}"${x === rule[f] ? " selected" : ""}>${escapeHtml(x)}</option>`).join("")}` }), { required: req, span });
            const inp = (f, label, span, req, numeric, ph) => cfgField(k(f), label, `<div class="e-permits-fo-input${cfgDraft.errors[k(f)] ? " is-error" : ""}"><input id="cfg-${k(f)}" type="text"${numeric ? ' inputmode="numeric" maxlength="5" data-cfg-numeric' : ' maxlength="12"'} value="${escapeHtml(rule[f] ?? "")}" placeholder="${escapeHtml(ph || "")}" autocomplete="off" data-cfg-rule="${i}" data-cfg-rule-field="${f}"></div>`, { required: req, span });
            return `
              <div class="e-permits-tax-cond" data-cfg-rule-block="${i}">
                <div class="e-permits-tax-cond__head"><label>Regula ${i + 1}</label><button class="btn btn-text-destructive btn-sm" type="button" data-cfg-rule-remove="${i}">Elimină</button></div>
                ${cfgGrid(`
                  ${sel("doc", "Tip document", CFG_DOC_TYPES.filter((d) => d === rule.doc || !used.includes(d)), 6)}
                  ${sel("reset", "Resetare contor", CFG_RESET, 6)}
                  ${inp("prefix", "Prefix", 4, true, false, "Ex. AUT")}
                  ${inp("sep", "Separator", 4, false, false, "Ex. -")}
                  ${inp("len", "Lungime contor", 4, true, true, "Ex. 6")}
                  ${inp("start", "Valoare inițială", 6, true, true, "Ex. 1")}
                  <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--6"><span class="e-permits-cfg-ro__label">Valoare curentă</span><div class="e-permits-cfg-ro">${escapeHtml(String(rule.current || 0))}</div></div>`)}
                <p class="e-permits-fo-field__hint" data-cfg-rule-example="${i}">Exemplu (numărul următor): <strong>${escapeHtml(cfgNumberExample(rule))}</strong></p>
              </div>`;
          }).join("")}</div>
          <div class="e-permits-tax-cond__add">
            <button class="btn btn-neutral btn-sm" type="button" data-cfg-rule-add${used.length >= CFG_DOC_TYPES.length ? " disabled" : ""}><svg class="icon" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-large"></use></svg>Adaugă regulă</button>
            ${renderInfoNote("Câte o regulă pentru fiecare tip de document emis: act permisiv, decizie de respingere, înștiințare. „Valoare curentă” = ultimul număr atribuit.")}
          </div>`;
      }
      case "rap": return `
        ${renderInfoNote("<strong>Datele personale ale persoanei fizice</strong> (IDNP, numele și prenumele) se publică mereu anonimizat, indiferent de setare.")}
        <ul class="e-permits-cfg-rap" role="list">${CFG_FORM_FIELDS.map((field) => {
          const row = v.rap.find((x) => x.field === field); const always = CFG_ALWAYS_ANON.includes(field);
          return `<li class="e-permits-cfg-rap__row">
            <label class="checkbox checkbox--medium"><input class="checkbox-input" type="checkbox" value="${escapeHtml(field)}" data-cfg-rap="${escapeHtml(field)}"${row ? " checked" : ""}><span class="checkbox-custom" aria-hidden="true"></span><span class="checkbox-texts"><span class="checkbox-label">${escapeHtml(field)}</span></span></label>
            ${renderToggle({ label: "Anonimizare", checked: always || Boolean(row?.anon), attrs: `data-cfg-rap-anon="${escapeHtml(field)}"`, disabled: !row || always })}
          </li>`; }).join("")}</ul>`;
      case "drafts": return cfgGrid(cfgInput("draftDays", "Perioada de retenție a schițelor (zile)", { required: true, numeric: true, span: 6, hint: "Zile calendaristice. Înainte de expirare, solicitantul e anunțat prin MNotify; apoi schița se arhivează. Doar Administratorul Central." }));
      case "dep": {
        const d = v;
        const svcOpts = cfgPublishedServices(service).map((s) => [s.code, `${s.title} · ${s.code}`]);
        const src = getServiceByCode(d.source);
        const acts = src ? [...new Set((src.geap?.templates || []).map((t) => t.name))] : [];
        return cfgGrid(`
          ${cfgInput("name", "Denumire", { required: true, placeholder: "Ex. Autorizație sanitară valabilă" })}
          ${cfgChecks("requestTypes", "Tip solicitare", rts, { required: true, hint: "Tipurile de solicitare la care se aplică." })}
          ${cfgSelect("type", "Tip interdependență", CFG_DEP_TYPES, { required: true, placeholder: "Alege tipul", hint: d.type ? CFG_DEP_HINT[d.type] : "" })}
          ${d.type === "Totală" || d.type === "Parțială" ? `
            ${cfgSelect("source", "Serviciul sursă", svcOpts, { required: true, placeholder: "Alege serviciul", hint: "Doar servicii publicate; finalizarea lui = emiterea actului." })}
            ${cfgChecks("fields", "Date preluate", CFG_FORM_FIELDS.filter((f) => !CFG_ALWAYS_ANON.includes(f)), { required: true })}
            ${d.type === "Parțială" ? (acts.length ? cfgChecks("acts", "Acte solicitate", acts, { required: true }) : cfgField("acts", "Acte solicitate", `<p class="e-permits-fo-field__hint">${src ? "Serviciul sursă nu are acte configurate." : "Alege întâi serviciul sursă."}</p>`, { required: true })) : ""}` : ""}
          ${d.type === "Externă" ? `
            ${cfgSelect("formField", "Câmp din cerere", CFG_FORM_FIELDS, { required: true, placeholder: "Alege câmpul", span: 6 })}
            ${cfgSelect("extSource", "Sursa externă", CFG_EXT_SOURCES, { required: true, placeholder: "Alege sursa", span: 6, hint: "Surse disponibile prin MConnect." })}` : ""}
          ${d.type === "Exclusivă" ? cfgSelect("incompatible", "Serviciul incompatibil", svcOpts, { required: true, placeholder: "Alege serviciul", hint: "Doar servicii publicate, fără serviciul deschis." }) : ""}`);
      }
      default: return "";
    }
  };
  const renderCfgDrawer = () => {
    const service = getServiceByCode(serviceProfileState.code);
    if (!cfgDraft || !service) return;
    const top = cfgBody.scrollTop;
    const isDep = cfgDraft.section === "dep";
    cfgDrawer.querySelector("[data-svc-cfg-title]").textContent = isDep ? (cfgDraft.depId ? "Editează interdependența" : "Interdependență nouă") : (CFG_SECTIONS.find(([k]) => k === cfgDraft.section) || [])[1] || "Setări";
    cfgDrawer.querySelector("[data-svc-cfg-subtitle]").textContent = `Setări · ${service.title}`;
    cfgBody.innerHTML = `<div class="e-permits-clas-create e-permits-cfg-form">${renderCfgForm(service)}</div>`;
    cfgBody.scrollTop = top;
  };
  const openCfgDrawer = (section, trigger, depId = null) => {
    const service = getServiceByCode(serviceProfileState.code);
    if (!service || !cfgDrawer || !isCentralAdmin()) return;
    const c = serviceConfig(service);
    const dep = depId ? c.deps.find((d) => d.id === depId) : null;
    cfgDraft = { section, depId, v: section === "dep" ? cfgClone(dep || { name: "", requestTypes: [], type: "", source: "", fields: [], acts: [], formField: "", extSource: "", incompatible: "" }) : cfgClone(c), errors: {}, dirty: false, trigger };
    renderCfgDrawer();
    trigger?.setAttribute("aria-expanded", "true");
    cfgDrawer.hidden = false;
    document.body.classList.add("is-user-create-open");
    requestAnimationFrame(() => cfgBody.querySelector("input:not([disabled]), .e-permits-fo-select__button")?.focus());
  };
  const closeCfgDrawer = (force = false) => {
    if (!cfgDraft || cfgDrawer.hidden) return;
    if (!force && cfgDraft.dirty) { askConfirm({ title: "Renunți la modificări?", text: "Setările schimbate în acest formular se pierd.", confirmLabel: "Renunță", destructive: true }, () => closeCfgDrawer(true)); return; }
    closeFoSelect();
    const trigger = cfgDraft.trigger;
    trigger?.setAttribute("aria-expanded", "false");
    cfgDrawer.classList.add("is-closing");
    window.setTimeout(() => { cfgDrawer.hidden = true; cfgDrawer.classList.remove("is-closing"); document.body.classList.remove("is-user-create-open"); cfgDraft = null; trigger?.focus?.(); }, 120);
  };
  const CFG_REQUIRED_MSG = "Câmpul este obligatoriu.";
  const CFG_INT_MSG = "Introdu un număr întreg mai mare ca zero.";
  const validateCfg = (service) => {
    const v = cfgDraft.v, r = cfgRssp(service), e = {};
    const req = (k, ok) => { if (!ok) e[k] = CFG_REQUIRED_MSG; };
    const int = (k, val, required = true) => { const s = String(val ?? "").trim(); if (!s) { if (required) e[k] = CFG_REQUIRED_MSG; } else if (!/^\d+$/.test(s) || Number(s) < 1) e[k] = CFG_INT_MSG; };
    switch (cfgDraft.section) {
      case "applicant": req("authMode", v.authMode); break;
      case "exam": req("subdivisions", v.subdivisions.length); if (v.autoDist) { req("distCriterion", v.distCriterion); int("distMax", v.distMax, false); } break;
      case "suspension": if (v.suspCustom) int("suspDays", v.suspDays); break;
      case "signing": req("signRequest", v.signRequest); req("pdfGen", v.pdfGen); break;
      case "payment": if (r.paid) req("mpayCode", String(v.mpayCode || "").trim()); int("payTerm", v.payTerm); break;
      case "delivery": req("releaseActor", v.releaseActor); break;
      case "appeal": if (v.appealable) { req("appealTypes", v.appealTypes.length); req("appealDecisions", v.appealDecisions.length); int("appealDays", v.appealDays); req("appealDayType", v.appealDayType); } break;
      case "numbering": v.numbering.forEach((rule, i) => { req(`n${i}-doc`, rule.doc); req(`n${i}-reset`, rule.reset); req(`n${i}-prefix`, String(rule.prefix || "").trim()); int(`n${i}-len`, rule.len); int(`n${i}-start`, rule.start); }); break;
      case "drafts": int("draftDays", v.draftDays); break;
      case "dep":
        req("name", String(v.name || "").trim()); req("requestTypes", v.requestTypes.length); req("type", v.type);
        if (v.type === "Totală" || v.type === "Parțială") { req("source", v.source); req("fields", (v.fields || []).length); }
        if (v.type === "Parțială") req("acts", (v.acts || []).length);
        if (v.type === "Externă") { req("formField", v.formField); req("extSource", v.extSource); }
        if (v.type === "Exclusivă") req("incompatible", v.incompatible);
        break;
      default: break;
    }
    return e;
  };
  const cfgFmt = (val) => Array.isArray(val) ? (val.length ? val.map((x) => (typeof x === "object" ? (x.doc || x.field || JSON.stringify(x)) : x)).join(", ") : "—") : typeof val === "boolean" ? (val ? "Da" : "Nu") : (val === "" || val == null ? "—" : String(val));
  const saveCfgDrawer = () => {
    const service = getServiceByCode(serviceProfileState.code);
    cfgDraft.errors = validateCfg(service);
    if (Object.keys(cfgDraft.errors).length) {
      renderCfgDrawer();
      cfgBody.querySelector(".is-error input, .e-permits-fo-select.is-error .e-permits-fo-select__button, .e-permits-fo-field__error")?.closest(".e-permits-fo-field")?.querySelector("input, button")?.focus();
      return;
    }
    const c = serviceConfig(service), at = localIsoNow(), by = currentUserName();
    let events = [], toast;
    if (cfgDraft.section === "dep") {
      const v = cfgDraft.v, prev = cfgDraft.depId ? c.deps.find((d) => d.id === cfgDraft.depId) : null;
      if (prev) Object.assign(prev, v); else c.deps.push({ ...v, id: `dep-${Date.now()}` });
      events = [{ at, user: by, type: prev ? "Modificare interdependență" : "Adăugare interdependență", status: "Reușit", detail: `${v.name} · ${v.type}` }];
      toast = [prev ? "Interdependența a fost salvată." : "Interdependența a fost adăugată.", prev ? "Interdependență salvată" : "Interdependență adăugată"];
    } else {
      const title = (CFG_SECTIONS.find(([k]) => k === cfgDraft.section) || [])[1];
      for (const [key, label] of CFG_FIELDS[cfgDraft.section] || []) {
        const before = cfgFmt(c[key]), after = cfgFmt(cfgDraft.v[key]);
        if (JSON.stringify(c[key]) !== JSON.stringify(cfgDraft.v[key])) events.push({ at, user: by, type: "Modificare setări", status: "Reușit", detail: `${title} · ${label}: ${before} → ${after}` });
        c[key] = cfgClone(cfgDraft.v[key]);
      }
      toast = events.length ? [`${title}: ${plural(events.length, "setare modificată", "setări modificate")}. Intră în vigoare după publicarea pașaportului.`, "Setări salvate"] : null;
    }
    if (events.length) { c.editedAt = at; c.editedBy = by; syncCfgFlags(service); logServiceEvents(service.code, events, { render: false }); }
    closeCfgDrawer(true);
    renderServiceProfile();
    if (toast) showShellToast(toast[0], "success", toast[1]);
  };
  const removeCfgDep = (depId) => {
    const service = getServiceByCode(serviceProfileState.code), c = serviceConfig(service), dep = c.deps.find((d) => d.id === depId);
    if (!dep) return;
    closeStackMenus();
    askConfirm({ title: "Elimină interdependența", text: `„${dep.name}” nu se mai verifică la completarea și depunerea cererii. Intră în vigoare după publicarea pașaportului.`, confirmLabel: "Confirmă", destructive: true }, () => {
      c.deps.splice(c.deps.indexOf(dep), 1);
      c.editedAt = localIsoNow(); c.editedBy = currentUserName();
      logServiceEvents(service.code, [{ at: c.editedAt, user: c.editedBy, type: "Eliminare interdependență", status: "Reușit", detail: `${dep.name} · ${dep.type}` }], { render: false });
      renderServiceProfile();
      showShellToast(`„${dep.name}” a fost eliminată.`, "success", "Interdependență eliminată");
    });
  };
  permitsProfilePanel?.addEventListener("click", (event) => {
    const edit = event.target.closest("[data-svc-cfg-edit]");
    if (edit) { openCfgDrawer(edit.dataset.svcCfgEdit, edit); return; }
    const add = event.target.closest("[data-svc-dep-add]");
    if (add) { openCfgDrawer("dep", add); return; }
    const depEdit = event.target.closest("[data-svc-dep-edit]");
    if (depEdit) { openCfgDrawer("dep", depEdit, depEdit.dataset.svcDepEdit); return; }
    const depRemove = event.target.closest("[data-svc-dep-remove]");
    if (depRemove) removeCfgDep(depRemove.dataset.svcDepRemove);
  });
  const cfgMark = (key, target) => {
    cfgDraft.dirty = true;
    if (cfgDraft.errors[key]) { delete cfgDraft.errors[key]; target?.closest(".e-permits-fo-input, .e-permits-fo-select")?.classList.remove("is-error"); target?.closest(".e-permits-fo-field")?.querySelector(".e-permits-fo-field__error")?.remove(); }
  };
  cfgDrawer?.addEventListener("click", (event) => {
    if (!cfgDraft) return;
    if (event.target.closest("[data-svc-cfg-close]")) { closeCfgDrawer(); return; }
    if (event.target.closest("[data-svc-cfg-save]")) { saveCfgDrawer(); return; }
    if (event.target.closest("[data-cfg-rule-add]")) {
      const used = cfgDraft.v.numbering.map((x) => x.doc);
      cfgDraft.v.numbering.push({ doc: CFG_DOC_TYPES.find((d) => !used.includes(d)) || "", prefix: "", sep: "-", len: "6", start: "1", current: 0, reset: "Anual" });
      cfgDraft.dirty = true; renderCfgDrawer();
      cfgBody.querySelector(`[data-cfg-rule-block="${cfgDraft.v.numbering.length - 1}"] input`)?.focus();
      return;
    }
    const rm = event.target.closest("[data-cfg-rule-remove]");
    if (rm) { cfgDraft.v.numbering.splice(Number(rm.dataset.cfgRuleRemove), 1); cfgDraft.errors = {}; cfgDraft.dirty = true; renderCfgDrawer(); cfgBody.querySelector("[data-cfg-rule-add]")?.focus(); }
  });
  cfgDrawer?.addEventListener("input", (event) => {
    if (!cfgDraft) return;
    const t = event.target;
    if (t.matches("[data-cfg-numeric]")) t.value = t.value.replace(/\D/g, "").slice(0, 5);
    if (t.matches("[data-cfg-input]")) { cfgDraft.v[t.dataset.cfgInput] = t.value; cfgMark(t.dataset.cfgInput, t); return; }
    if (t.matches("[data-cfg-rule]")) {
      const i = Number(t.dataset.cfgRule), f = t.dataset.cfgRuleField; cfgDraft.v.numbering[i][f] = t.value; cfgMark(`n${i}-${f}`, t);
      const ex = cfgBody.querySelector(`[data-cfg-rule-example="${i}"] strong`); if (ex) ex.textContent = cfgNumberExample(cfgDraft.v.numbering[i]);
    }
  });
  cfgDrawer?.addEventListener("change", (event) => {
    if (!cfgDraft) return;
    const t = event.target;
    if (t.matches("[data-cfg-select]")) {
      const key = t.dataset.cfgSelect; cfgDraft.v[key] = t.value; cfgMark(key, t);
      /* a new interdependence type or source changes which fields follow */
      if (cfgDraft.section === "dep" && (key === "type" || key === "source")) { if (key === "source") cfgDraft.v.acts = []; renderCfgDrawer(); cfgBody.querySelector(`#cfg-${key}`)?.focus(); }
      return;
    }
    if (t.matches("[data-cfg-rule]")) { const i = Number(t.dataset.cfgRule), f = t.dataset.cfgRuleField; cfgDraft.v.numbering[i][f] = t.value; cfgMark(`n${i}-${f}`, t); if (f === "doc") { renderCfgDrawer(); cfgBody.querySelector(`#cfg-n${i}-doc`)?.focus(); } return; }
    if (t.matches("[data-cfg-switch]")) {
      const key = t.dataset.cfgSwitch; cfgDraft.v[key] = t.checked; cfgDraft.dirty = true;
      /* only a group switch changes the form; redraw once the knob has slid (200ms), so the
         switch keeps its transition */
      if (CFG_GROUP_SWITCHES.includes(key)) setTimeout(() => { if (!cfgDraft) return; renderCfgDrawer(); cfgBody.querySelector(`[data-cfg-switch="${key}"]`)?.focus(); }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 200);
      return;
    }
    if (t.matches("[data-cfg-check]")) { const key = t.dataset.cfgCheck; cfgDraft.v[key] = [...cfgBody.querySelectorAll(`[data-cfg-check="${key}"]:checked`)].map((x) => x.value); cfgMark(key, t); return; }
    if (t.matches("[data-cfg-rap]")) {
      const field = t.value;
      const always = CFG_ALWAYS_ANON.includes(field);
      if (t.checked) cfgDraft.v.rap.push({ field, anon: always }); else cfgDraft.v.rap = cfgDraft.v.rap.filter((x) => x.field !== field);
      /* in place, no redraw: the checkbox keeps its transition; Anonimizare follows the row */
      const anon = t.closest(".e-permits-cfg-rap__row")?.querySelector("[data-cfg-rap-anon]");
      if (anon) { anon.disabled = !t.checked || always; anon.checked = always || (t.checked && anon.checked); const row = cfgDraft.v.rap.find((x) => x.field === field); if (row) row.anon = anon.checked; }
      cfgDraft.dirty = true; return;
    }
    if (t.matches("[data-cfg-rap-anon]")) { const row = cfgDraft.v.rap.find((x) => x.field === t.dataset.cfgRapAnon); if (row) row.anon = t.checked; cfgDraft.dirty = true; }
  });
  cfgDrawer?.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || document.querySelector(".modal-overlay.is-active, body > .e-permits-fo-select__list")) return;
    event.preventDefault(); closeCfgDrawer();
  });

  /* Setări: a switch goes straight into the service draft */
  permitsProfilePanel?.addEventListener("change", (event) => {
    const input = event.target.closest("[data-svc-setting]");
    const service = input && getServiceByCode(serviceProfileState.code);
    if (!service) return;
    const key = input.dataset.svcSetting;
    const flags = serviceSettingFlags(service);
    flags[key] = input.checked;
    if (key === "actHartie" && !input.checked) flags.mdelivery = false;
    const label = SERVICE_SETTING_LABELS[key];
    const state = input.checked ? "activată" : "dezactivată";
    logServiceEvents(service.code, [{ at: localIsoNow(), user: currentUserName(), type: "Modificare setări", status: "Reușit", detail: `${label}: ${state}${key === "actHartie" && !input.checked ? " (și Livrare prin MDelivery)" : ""}` }], { render: false });
    /* let the switch slide (200ms transition) before the header and the locks re-render;
       the new markup has the same state, so nothing jumps; focus goes back to the switch */
    setTimeout(() => {
      if (permitsProfilePanel.hidden || serviceProfileState.code !== service.code) return;
      renderServiceProfile();
      permitsProfilePanel.querySelector(`[data-svc-setting="${key}"]`)?.focus();
    }, SERVICE_SETTING_SLIDE_MS);
    /* the switch shows its own result and the header shows „N modificări nepublicate” —
       no toast (user, 2026-10-08) */
  });

  permitsProfilePanel?.addEventListener("keydown", (event) => {
    const tab = event.target.closest("[data-passport-tab]");

    if (!tab || !["ArrowLeft", "ArrowRight"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const tabs = [...permitsProfilePanel.querySelectorAll("[data-passport-tab]")];
    const next = tabs[(tabs.indexOf(tab) + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
    next?.click();
  });

  document.querySelector("[data-workplace-sync-service]")?.addEventListener("click", () => openSyncModal());
  document.querySelector("[data-workplace-add-tariff]")?.addEventListener("click", () => openTariffDrawer(null, "global"));
  document.querySelector("[data-workplace-export]")?.addEventListener("click", () => {
    if (workplaceDb?.kind === "tariffs") {
      const ids = new Set(getVisibleRows().map((row) => row.id));
      exportTariffs((servicesStore.tariffs || []).filter((t) => ids.has(t.id)), "tarife.csv");
    } else {
      showShellToast("Exportul acestei liste urmează.", "info");
    }
  });
  serviceProfileBackShell?.addEventListener("click", closeServiceProfile);

  /* 10 tabs outgrow the page: keep the active one in view and fade the edge
     that hides more (Figma's tab .arrow buttons are not in the library yet) */
  const syncPassportTabOverflow = () => {
    const scroller = permitsProfilePanel?.querySelector(".e-permits-page-header__tabs");

    if (!scroller) {
      return;
    }

    const max = scroller.scrollWidth - scroller.clientWidth;
    const start = scroller.scrollLeft > 1;
    const end = max - scroller.scrollLeft > 1;
    scroller.classList.toggle("has-overflow-start", start);
    scroller.classList.toggle("has-overflow-end", end);
    /* on narrow screens the faded edge gets an arrow that scrolls the row */
    const arrows = scroller.parentElement;
    arrows.querySelector('[data-passport-tabs-scroll="-1"]')?.toggleAttribute("hidden", !start);
    arrows.querySelector('[data-passport-tabs-scroll="1"]')?.toggleAttribute("hidden", !end);
  };

  permitsProfilePanel?.addEventListener("click", (event) => {
    const arrow = event.target.closest("[data-passport-tabs-scroll]");
    const scroller = arrow?.parentElement.querySelector(".e-permits-page-header__tabs");
    if (!scroller) return;
    scroller.scrollBy({ left: Number(arrow.dataset.passportTabsScroll) * scroller.clientWidth * 0.6, behavior: "smooth" });
  });

  permitsProfilePanel?.querySelector(".e-permits-page-header__tabs")?.addEventListener("scroll", syncPassportTabOverflow, { passive: true });
  window.addEventListener("resize", syncPassportTabOverflow);

  const initWorkplace = async () => {
    if (!workplacePanel) {
      return;
    }

    try {
      const [dossierResponse, usersResponse, rsspResponse] = await Promise.all([
        fetch("data/e-permits-workplace.json", { cache: "no-store" }),
        fetch("data/e-permits-users.json", { cache: "no-store" }),
        fetch("data/e-permits-rssp-people.json", { cache: "no-store" })
      ]);

      if (!dossierResponse.ok) {
        throw new Error(`Cannot load workplace DB: ${dossierResponse.status}`);
      }

      if (!usersResponse.ok) {
        throw new Error(`Cannot load users DB: ${usersResponse.status}`);
      }

      if (!rsspResponse.ok) {
        throw new Error(`Cannot load RSSP DB: ${rsspResponse.status}`);
      }

      dossierDb = await dossierResponse.json();
      usersDb = await usersResponse.json();
      rsspDb = await rsspResponse.json();
      dossierDb.runtimeRows = buildDosare(dossierDb);
      usersDb.runtimeRows = buildUsers(usersDb);
      sarciniDb = buildSarciniDb();
      roleAdminDb = buildRoleAdminDb();

      /* Pașaportul Serviciului seed + mock RSSP; the rest of the shell works without it */
      try {
        const servicesResponse = await fetch("data/e-permits-services.json", { cache: "no-store" });

        if (servicesResponse.ok && passport) {
          servicesStore = await servicesResponse.json();
          await loadFlowDefinitions();
          servicesDb = buildServicesDb();
          authoritiesDb = buildAuthoritiesDb();
        }
      } catch (servicesError) {
        console.warn(servicesError);
      }

      /* Clasificatoare seed + field-type catalogue */
      try {
        const [clsResponse, typesResponse] = await Promise.all([
          fetch("data/classifiers/classifiers.json", { cache: "no-store" }),
          fetch("data/catalog/clas-field-types.json", { cache: "no-store" })
        ]);
        if (clsResponse.ok && typesResponse.ok && clasCore && clasPerm) {
          const seed = await clsResponse.json();
          classifiersStore = { list: seedClassifiers(seed.classifiers || []), fieldTypes: await typesResponse.json() };
        }
      } catch (classifiersError) {
        console.warn(classifiersError);
      }
      workplaceDb = dossierDb;
      workplaceState.rows = dossierDb.runtimeRows;
    } catch (error) {
      console.warn(error);
      workplaceRows.innerHTML = `
        <tr>
          <td class="e-permits-workplace__empty" colspan="12">${renderEmptyState({ title: "Nu am putut încărca dosarele", text: "Baza locală nu a răspuns. Reîncarcă pagina.", icon: "warning-filled", bare: true })}</td>
        </tr>
      `;
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const linkedView = params.get("workplace");

    setWorkplaceView(
      linkedView && workplaceDb.views?.[linkedView]
        ? linkedView
        : document.querySelector("[data-workplace-view].is-active")?.dataset.workplaceView || "mine"
    );

    routeFromHash();
  };

  /* open whatever the address names; unknown or empty → keep the role's default page
     and write its hash, so the link always matches the screen */
  const routeFromHash = () => {
    routingFromHash = true;
    try {
      const hash = window.location.hash;
      let match = hash.match(/^#dosar\/([^/]+)(?:\/([^/]+))?$/);
      const linkedRow = match && getDosarById(match[1]);
      if (linkedRow) {
        openDosarProfil(linkedRow, match[2] || "general");
        return;
      }

      match = hash.match(/^#serviciu\/([^/]+)(?:\/([^/]+))?$/);
      if (match && getServiceByCode(match[1])) {
        activeRegistry = "services";
        servicesDb = buildServicesDb();
        workplaceDb = servicesDb;
        workplaceState.rows = servicesDb.runtimeRows;
        openServiceProfile(match[1], match[2] || "general");
        return;
      }

      match = hash.match(/^#utilizator\/([^/]+)(?:\/([^/]+))?$/);
      const linkedUser = match && getUserById(match[1]);
      if (linkedUser) {
        setActiveNav("users");
        activeRegistry = "users";
        workplaceDb = usersDb;
        workplaceState.rows = usersDb.runtimeRows || [];
        openUserProfile(linkedUser, match[2] || "general");
        return;
      }

      match = hash.match(/^#sablon\/([^/]+)(?:\/([^/]+))?$/);
      if (match && getGlobalTemplate(decodeURIComponent(match[1]))) {
        document.querySelector('[data-nav-item][data-nav-id="notification-templates"]')?.click();
        openNtplProfile(decodeURIComponent(match[1]), match[2] || "content");
        return;
      }

      match = hash.match(/^#clasificator\/([^/]+)(?:\/([^/]+))?$/);
      if (match && getClassifier(decodeURIComponent(match[1])) && clasVisible(getClassifier(decodeURIComponent(match[1])))) {
        document.querySelector('[data-nav-item][data-nav-id="classifiers"]')?.click();
        openClassifierProfile(decodeURIComponent(match[1]), match[2] || "valori");
        return;
      }

      match = hash.match(/^#rol\/([^/]+)(?:\/([^/]+))?$/);
      const linkedRole = match && getRoleById(match[1]);
      if (linkedRole) {
        document.querySelector('[data-nav-item][data-nav-id="roles"]')?.click();
        openRoleProfile(linkedRole);
        const tab = match[2] && roleProfileTabs?.querySelector(`[data-role-profile-tab="${match[2]}"]`);
        tab?.click();
        return;
      }

      const navId = decodeURIComponent(hash.slice(1));
      const nav = navId && [...document.querySelectorAll("[data-nav-item]")].find((item) => item.dataset.navId === navId);
      if (nav) {
        nav.click();
        return;
      }

      restorePageHash();
    } finally {
      routingFromHash = false;
    }
  };

  window.addEventListener("popstate", () => {
    closeStackMenus?.();
    routeFromHash();
  });

  const setHelpMenuOpen = (nextOpen) => {
    if (!helpTrigger || !helpPanel) {
      return;
    }

    helpTrigger.setAttribute("aria-expanded", String(nextOpen));
    helpPanel.hidden = !nextOpen;
  };

  const closeHelpMenu = () => {
    setHelpMenuOpen(false);
  };

  const setUserMenuOpen = (nextOpen) => {
    if (!userTrigger || !userPanel) {
      return;
    }

    userTrigger.setAttribute("aria-expanded", String(nextOpen));
    userPanel.hidden = !nextOpen;
  };

  const closeUserMenu = () => {
    setUserMenuOpen(false);
  };

  if (toggle) {
    toggle.addEventListener("click", () => {
      if (!desktopMedia.matches) {
        return;
      }

      shell.classList.toggle("is-collapsed");
      syncExpandedState();
    });

    toggle.addEventListener("mouseenter", () => {
      syncCollapseGlyph(true);
    });

    toggle.addEventListener("mouseleave", () => {
      syncCollapseGlyph(false);
    });

    toggle.addEventListener("focus", () => {
      syncCollapseGlyph(true);
    });

    toggle.addEventListener("blur", () => {
      syncCollapseGlyph(false);
    });
  }

  if (helpTrigger && helpPanel) {
    helpTrigger.addEventListener("click", (event) => {
      event.preventDefault();
      const isOpen = helpTrigger.getAttribute("aria-expanded") === "true";
      closeUserMenu();
      setHelpMenuOpen(!isOpen);
    });

    helpTrigger.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setHelpMenuOpen(true);
        helpPanel.querySelector('[role="menuitem"]')?.focus();
      }
    });

    helpPanel.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeHelpMenu();
        helpTrigger.focus();
      }
    });

    helpPanel.querySelectorAll('[role="menuitem"]').forEach((item) => {
      item.addEventListener("click", () => {
        closeHelpMenu();
      });
    });

    document.addEventListener("click", (event) => {
      if (!helpMenu.contains(event.target)) {
        closeHelpMenu();
      }
    });
  }

  if (shellNav) {
    shellNav.addEventListener("click", (event) => {
      const item = event.target.closest("[data-nav-item]");

      if (!item || !shellNav.contains(item)) {
        return;
      }

      const href = item.getAttribute("href");

      if (!href || href === "#") {
        event.preventDefault();
      }

      if (ntplProfilePanel && !ntplProfilePanel.hidden && !confirmLeaveNtpl()) {
        event.preventDefault();
        return;
      }
      if (ntplProfileState.draft) ntplProfileState.draft.dirty = false;
      hideNtplProfile();

      document.querySelectorAll("[data-nav-item]").forEach((link) => {
        const isActive = link === item;
        link.classList.toggle("is-active", isActive);

        if (isActive) {
          link.setAttribute("aria-current", "page");
        } else {
          link.removeAttribute("aria-current");
        }
      });

      if (item.dataset.workplaceView) {
        setWorkplaceView(item.dataset.workplaceView);
      }

      if (item.dataset.shellView === "services-registry" || item.dataset.shellView === "permits-profile") {
        showServiceRegistry("services", item.dataset.navLabel || "Configurări servicii");
      }

      if (item.dataset.shellView === "authorities-registry") {
        showServiceRegistry("authorities", item.dataset.navLabel || "Autorități");
      }

      if (item.dataset.shellView === "tariffs-registry") {
        showServiceRegistry("tariffs", item.dataset.navLabel || "Tarife");
      }

      if (item.dataset.shellView === "ntpl-registry") {
        showServiceRegistry("ntpl", item.dataset.navLabel || "Șabloane de notificare");
      }

      if (item.dataset.shellView === "classifiers-registry") {
        showClassifiersRegistry();
      }

      if (item.dataset.shellView === "users-registry") {
        showUsersRegistry();
      }

      if (item.dataset.shellView === "sarcini-registry") {
        showSarciniRegistry();
      }

      if (item.dataset.shellView === "roles-registry") {
        showRolesRegistry();
      }

      if (item.dataset.shellView === "role-placeholder") {
        showRolePlaceholder(item.dataset.navLabel || item.textContent.trim());
      }

      if (item.dataset.navId) {
        writeHash(`#${item.dataset.navId}`, { push: true });
      }
    });
  }

  workplaceAddUser?.addEventListener("click", openUserCreate);

  userCreate?.addEventListener("click", (event) => {
    if (event.target.closest("[data-user-create-close]")) {
      closeUserCreate();
      return;
    }

    if (event.target.closest("[data-user-lookup]")) {
      lookupRsspPerson();
      return;
    }

    if (event.target.closest("[data-user-change-idnp]")) {
      userCreateState.person = null;
      userCreateState.lookupError = "";
      userCreateState.functie = "";
      userCreateState.comments = "";
      userCreateState.combinations = [];
      userCreateState.isAddingCombination = false;
      renderUserCreate({ focusName: "idnp" });
      return;
    }

    if (event.target.closest("[data-user-combination-open]")) {
      userCreateState.isAddingCombination = true;
      userCreateState.combinationDraft = { roleId: "", authorityId: "", subdivisionId: "" };
      renderUserCreate({ focusName: "roleId" });
      userCreateBody?.scrollTo({ top: userCreateBody.scrollHeight, behavior: "smooth" });
      return;
    }

    if (event.target.closest("[data-user-combination-cancel]")) {
      userCreateState.isAddingCombination = false;
      userCreateState.combinationDraft = { roleId: "", authorityId: "", subdivisionId: "" };
      renderUserCreate();
      return;
    }

    if (event.target.closest("[data-user-combination-confirm]")) {
      addUserCombination();
      return;
    }

    const removeCombination = event.target.closest("[data-user-combination-remove]");

    if (removeCombination) {
      userCreateState.combinations.splice(Number(removeCombination.dataset.userCombinationRemove), 1);
      renderUserCreate();
    }
  });

  userCreate?.addEventListener("input", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
      return;
    }

    if (target.name === "idnp") {
      const value = target.value.replace(/\D/g, "").slice(0, 13);
      target.value = value;
      userCreateState.idnp = value;
      userCreateState.lookupError = "";
      const inline = target.closest(".e-permits-fo-field")?.querySelector(".e-permits-user-create__inline");
      const message = inline?.querySelector("span:first-child");
      const counter = inline?.querySelector(".e-permits-user-create__counter");
      inline?.classList.remove("e-permits-user-create__error");
      target.closest(".e-permits-fo-input")?.classList.remove("is-error");
      if (message) message.textContent = "13 cifre";
      if (counter) counter.textContent = `${value.length}/13`;
      return;
    }

    if (target.name === "functie") {
      userCreateState.functie = target.value;
    } else if (target.name === "comments") {
      userCreateState.comments = target.value;
    } else if (target.name === "additionalInfo") {
      userCreateState.additionalInfo = target.value;
    }

    if (userCreateSubmit) {
      userCreateSubmit.disabled = !canCreateUser();
    }
  });

  userCreate?.addEventListener("change", (event) => {
    const select = event.target.closest("select");

    if (!select) {
      return;
    }

    if (select.name === "roleId") {
      userCreateState.combinationDraft.roleId = select.value;
      return;
    }

    if (select.name === "authorityId") {
      userCreateState.combinationDraft.authorityId = select.value;
      userCreateState.combinationDraft.subdivisionId = "";
      renderUserCreate({ focusName: "subdivisionId" });
      return;
    }

    if (select.name === "subdivisionId") {
      userCreateState.combinationDraft.subdivisionId = select.value;
    }
  });

  userCreate?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeUserCreate();
      return;
    }

    if (event.key === "Enter" && event.target?.name === "idnp") {
      event.preventDefault();
      lookupRsspPerson();
      return;
    }

    if (event.key !== "Tab" || !userCreateDrawer) {
      return;
    }

    const focusable = [...userCreateDrawer.querySelectorAll(
      'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])'
    )].filter((element) => !element.hidden);

    if (!focusable.length) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  userCreateSubmit?.addEventListener("click", createRegistryUser);

  if (workplaceSearch) {
    workplaceSearch.addEventListener("input", () => {
      workplaceState.query = workplaceSearch.value;
      workplaceState.page = 1;
      workplaceState.selected.clear();
      renderWorkplace();
    });
  }

  if (workplaceTabs) {
    workplaceTabs.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-workplace-tab]");

      if (!tab) {
        return;
      }

      workplaceState.tabKey = tab.dataset.workplaceTab;
      workplaceState.page = 1;
      workplaceState.selected.clear();
      renderWorkplace();
    });
  }

  if (workplaceTable) {
    workplaceTable.addEventListener("click", (event) => {
      const sortButton = event.target.closest("[data-workplace-sort]");

      if (!sortButton) {
        return;
      }

      const key = sortButton.dataset.workplaceSort;
      const column = workplaceDb?.columns?.[key];

      if (!column?.sortable) {
        return;
      }

      if (workplaceState.sortKey === key) {
        workplaceState.sortDirection = workplaceState.sortDirection === "asc" ? "desc" : "asc";
      } else {
        workplaceState.sortKey = key;
        workplaceState.sortDirection = "desc";
      }

      workplaceState.page = 1;
      renderWorkplace();
    });
  }

  if (workplacePagination) {
    workplacePagination.addEventListener("click", (event) => {
      const button = event.target.closest("[data-workplace-page]");

      if (!button || button.disabled) {
        return;
      }

      const filteredRows = getVisibleRows();
      const pages = Math.max(1, Math.ceil(filteredRows.length / workplaceState.pageSize));
      const value = button.dataset.workplacePage;

      if (value === "prev") {
        workplaceState.page = Math.max(1, workplaceState.page - 1);
      } else if (value === "next") {
        workplaceState.page = Math.min(pages, workplaceState.page + 1);
      } else {
        workplaceState.page = Number(value);
      }

      renderWorkplace();
    });

    workplacePagination.addEventListener("change", (event) => {
      const select = event.target.closest("[data-workplace-page-size]");

      if (!select) {
        return;
      }

      const nextSize = Number(select.value);

      if (!workplacePageSizeOptions.includes(nextSize)) {
        return;
      }

      workplaceState.pageSize = nextSize;
      workplaceState.page = 1;
      renderWorkplace();
    });
  }

  if (workplacePanel) {
    workplacePanel.addEventListener("change", (event) => {
      const selectAll = event.target.closest("[data-workplace-select-all]");
      const rowCheckbox = event.target.closest("[data-workplace-select-row]");

      if (selectAll) {
        const visibleRows = getVisibleRows().slice(
          (workplaceState.page - 1) * workplaceState.pageSize,
          workplaceState.page * workplaceState.pageSize
        );

        visibleRows.forEach((row) => {
          if (selectAll.checked) {
            workplaceState.selected.add(row.id);
          } else {
            workplaceState.selected.delete(row.id);
          }
        });

        renderWorkplace();
      }

      if (rowCheckbox) {
        if (rowCheckbox.checked) {
          workplaceState.selected.add(rowCheckbox.dataset.workplaceSelectRow);
        } else {
          workplaceState.selected.delete(rowCheckbox.dataset.workplaceSelectRow);
        }

        syncSelectAll(getVisibleRows().slice(
          (workplaceState.page - 1) * workplaceState.pageSize,
          workplaceState.page * workplaceState.pageSize
        ));
      }
    });

    workplacePanel.addEventListener("click", async (event) => {
      const copyButton = event.target.closest("[data-shell-copy-value]");

      if (copyButton) {
        event.preventDefault();
        await handleCopyClick(copyButton);
        return;
      }

      const registryTariffEdit = event.target.closest("[data-tariff-edit]");

      if (registryTariffEdit) {
        openTariffDrawer(registryTariffEdit.dataset.tariffEdit);
        return;
      }

      const serviceRowSync = event.target.closest("[data-service-row-sync]");

      if (serviceRowSync) {
        openSyncModal(serviceRowSync.dataset.serviceRowSync);
        return;
      }

      const serviceRowOpen = event.target.closest("[data-service-row-open]");

      if (serviceRowOpen) {
        openServiceProfile(serviceRowOpen.dataset.serviceRowOpen);
        return;
      }

      if (event.target.closest("input, label, button, a")) {
        return;
      }

      const serviceRowEl = event.target.closest("tr[data-workplace-row]");

      if (serviceRowEl && activeRegistry === "services") {
        openServiceProfile(serviceRowEl.dataset.workplaceRow);
        return;
      }

      if (serviceRowEl && activeRegistry === "ntpl") {
        openNtplProfile(serviceRowEl.dataset.workplaceRow);
        return;
      }

      if (serviceRowEl && activeRegistry === "classifiers") {
        openClassifierProfile(serviceRowEl.dataset.workplaceRow);
        return;
      }

      if (serviceRowEl && activeRegistry === "authorities") {
        /* an authority row lists its services */
        const authority = getAuthorityById(serviceRowEl.dataset.workplaceRow);
        showServiceRegistry("services", servicesRegistryLabel);
        workplaceState.query = authority?.name || "";
        renderWorkplace();
        return;
      }

      const rowEl = event.target.closest("tr[data-workplace-row]");
      const rowId = rowEl?.dataset.workplaceRow;
      const row = rowId && getDosarById(rowId);

      if (row && activeRegistry === "dossiers") {
        dosarProfilState.returnTo = "dossiers";
        openDosarProfil(row);
        return;
      }

      if (rowId && activeRegistry === "users") {
        const user = getUserById(rowId);

        if (user) {
          openUserProfile(user);
        }
        return;
      }

      if (rowId && activeRegistry === "sarcini") {
        const sarcina = (sarciniDb?.runtimeRows || []).find((item) => item.id === rowId);
        const dosar = sarcina && (dossierDb?.runtimeRows || []).find((item) => item.id === sarcina.dosarNr);

        if (dosar) {
          dosarProfilState.returnTo = "sarcini";
          activeRegistry = "dossiers";
          workplaceDb = dossierDb;
          workplaceState.rows = dossierDb.runtimeRows || [];
          openDosarProfil(dosar);
        }
        return;
      }

      if (rowId && activeRegistry === "roles") {
        const role = getRoleById(rowId);

        if (role) {
          openRoleProfile(role);
        }
      }
    });
  }

  /* "Adaugă combinație" modal: dependent selects re-render the body, Adaugă validates */
  const userComboModal = document.querySelector("#user-combo-modal");
  userComboModal?.addEventListener("change", (event) => {
    const field = event.target.closest("[data-combo-field]");
    const form = userProfileState.comboForm;
    if (!field || !form) return;
    const key = field.dataset.comboField;
    if (key === "role") form.role = field.value;
    else if (key === "authority") { form.authorityId = field.value; form.subdivision = ""; }
    else if (key === "subdivision") form.subdivision = field.value;
    delete form.errors[key];
    if (key === "authority") delete form.errors.subdivision;
    userComboModal.querySelector("[data-user-combo-body]").innerHTML = renderComboModalBody();
    focusFormControl(userComboModal.querySelector(`[data-combo-field="${key}"]`));
  });
  userComboModal?.addEventListener("click", (event) => {
    if (!event.target.closest("[data-user-combo-save]")) return;
    const user = getUserById(userProfileState.rowId);
    if (user) commitCombination(user);
  });

  if (userProfilePanel) {
    /* GEAP data draft: the header (Renunță · Salvează + status) follows dirtiness */
    const syncUserGeapDraft = (control) => {
      const user = getUserById(userProfileState.rowId);
      if (!user || !userProfileState.draft) return;
      const wasDirty = userGeapDirty(user);
      userProfileState.draft[control.dataset.userGeap] = control.value;
      if (wasDirty !== userGeapDirty(user)) userProfileTitle.innerHTML = renderUserProfileTitle(user);
    };

    userProfilePanel.addEventListener("input", (event) => {
      const geap = event.target.closest("[data-user-geap]");

      if (geap) {
        syncUserGeapDraft(geap);
        return;
      }

      handlePermSearch(event, userProfilePanelBody, getUserById(userProfileState.rowId), userProfileState);
    });

    userProfilePanel.addEventListener("change", (event) => {
      const geap = event.target.closest("[data-user-geap]");

      if (geap) {
        syncUserGeapDraft(geap);
        return;
      }

      const user = getUserById(userProfileState.rowId);
      handlePermSwitch(event, userProfilePanelBody, user, userProfileState, () => {
        userProfileTitle.innerHTML = renderUserProfileTitle(user);
      });
    });

    userProfilePanel.addEventListener("click", async (event) => {
      const user = getUserById(userProfileState.rowId);

      if (!user) {
        return;
      }

      const copyButton = event.target.closest("[data-shell-copy-value]");

      if (copyButton) {
        event.preventDefault();
        await handleCopyClick(copyButton);
        return;
      }

      const tabButton = event.target.closest("[data-user-profile-tab]");

      if (tabButton) {
        if (tabButton.dataset.userProfileTab === userProfileState.tabKey) return;
        if (!confirmLeaveUserProfile()) return;
        userProfileState.tabKey = tabButton.dataset.userProfileTab;
        userProfileState.draft = userGeapDraftOf(user);
        userProfileTitle.innerHTML = renderUserProfileTitle(user);
        resetSupportingTabState();
        syncTabStripActive(userProfileTabs, "data-user-profile-tab", "userProfileTab", userProfileState.tabKey);
        renderUserProfilePanelBody(user);
        history.replaceState(null, "", `#utilizator/${user.id}/${userProfileState.tabKey}`);
        tabButton.focus();
        return;
      }

      if (handleRolesTabClick(event, user)
        || (userProfileState.tabKey === "permissions" && handlePermClick(event, userProfilePanelBody, user, userProfileState))) {
        return;
      }

      /* one Salvează / Renunță for the profile's drafts (GEAP data, permissions) */
      if (event.target.closest("[data-user-profile-save]")) {
        if (permDirtyCount(userProfileState)) commitPermissions(user);
        if (userGeapDirty(user)) saveUserGeapDraft(user);
        return;
      }

      if (event.target.closest("[data-user-profile-discard]")) {
        userProfileState.draft = userGeapDraftOf(user);
        userProfileState.permAdd = new Set();
        userProfileState.permRemove = new Set();
        userProfileState.permFilter = "all";
        renderUserProfile(user);
        return;
      }

      if (event.target.closest("[data-user-profile-delegate]")) {
        if (!confirmLeaveUserProfile()) return;
        userProfileState.tabKey = "roles";
        userProfileState.draft = userGeapDraftOf(user);
        resetSupportingTabState();
        renderUserProfile(user);
        history.replaceState(null, "", `#utilizator/${user.id}/roles`);
        openComboModal();
        return;
      }

      const deleteItem = event.target.closest("[data-user-profile-delete]");

      if (deleteItem) {
        if (deleteItem.getAttribute("aria-disabled") === "true") return;
        askConfirm({
          title: "Ștergi utilizatorul?",
          text: `Contul lui ${user.numeComplet} (IDNP ${user.idnp}) se șterge definitiv, cu rolurile și permisiunile lui. Acțiunile făcute rămân în jurnal (MLog) și în dosare, cu numele lui.`,
          confirmLabel: "Șterge",
          destructive: true
        }, () => {
          user.deleted = true;
          persistUserProfileOverride(user);
          usersDb.runtimeRows = (usersDb.runtimeRows || []).filter((item) => item.id !== user.id);
          workplaceState.rows = usersDb.runtimeRows;
          userProfileState.draft = null;
          userProfileState.permAdd = new Set();
          userProfileState.permRemove = new Set();
          closeUserProfile();
          showShellToast(`Utilizatorul ${user.numeComplet} a fost șters.`);
        });
        return;
      }

      if (event.target.closest("[data-user-profile-status-toggle]")) {
        const activate = user.status !== "Activ";
        askConfirm(activate
          ? { title: "Activezi utilizatorul?", text: `${user.numeComplet} va putea accesa din nou sistemul cu rolurile atribuite.`, confirmLabel: "Activează" }
          : { title: "Inactivezi utilizatorul?", text: `${user.numeComplet} nu va mai putea accesa sistemul. Rolurile rămân atribuite și revin la reactivare.`, confirmLabel: "Inactivează", destructive: true }, () => {
          user.status = activate ? "Activ" : "Inactiv";
          user.ultimaActualizare = new Date().toISOString().slice(0, 10);
          persistUserProfileOverride(user);
          renderUserProfile(user);
          showShellToast(user.status === "Activ"
            ? "Utilizatorul a fost activat."
            : "Utilizatorul a fost inactivat.");
        });
      }
    });

    userProfilePanel.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && event.target.closest("[data-perm-search]") && userProfileState.permSearch) {
        event.preventDefault();
        event.target.value = "";
        handlePermSearch(event, userProfilePanelBody, getUserById(userProfileState.rowId), userProfileState);
        return;
      }

      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
        return;
      }

      const focusedTab = event.target.closest("[data-user-profile-tab]");

      if (!focusedTab) {
        return;
      }

      const tabs = [...userProfileTabs.querySelectorAll("[data-user-profile-tab]")];
      const currentIndex = tabs.indexOf(focusedTab);
      let nextIndex = currentIndex;

      if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = tabs.length - 1;
      } else if (event.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % tabs.length;
      } else {
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      }

      event.preventDefault();
      tabs[nextIndex]?.click();
    });
  }

  if (dosarProfilPanel) {
    dosarProfilPanel.addEventListener("click", async (event) => {
      const copyButton = event.target.closest("[data-shell-copy-value]");

      if (copyButton) {
        event.preventDefault();
        await handleCopyClick(copyButton);
        return;
      }

      if (event.target.closest("[data-dosar-profil-back]")) {
        closeDosarProfil();
        return;
      }

      const tabButton = event.target.closest("[data-dosar-tab]");

      if (!tabButton) {
        return;
      }

      dosarProfilState.tabKey = tabButton.dataset.dosarTab;

      syncTabStripActive(dosarProfilTabs, "data-dosar-tab", "dosarTab", dosarProfilState.tabKey);
      renderDosarProfilPanelBody(getDosarById(dosarProfilState.rowId));
      history.replaceState(null, "", `#dosar/${dosarProfilState.rowId}/${dosarProfilState.tabKey}`);
      tabButton.focus();
    });

    dosarProfilTabs?.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
        return;
      }

      const tabs = [...dosarProfilTabs.querySelectorAll("[data-dosar-tab]")];
      const currentIndex = tabs.findIndex((tab) => tab.dataset.dosarTab === dosarProfilState.tabKey);
      let nextIndex = currentIndex;

      if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = tabs.length - 1;
      } else if (event.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % tabs.length;
      } else if (event.key === "ArrowLeft") {
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      }

      event.preventDefault();
      tabs[nextIndex]?.click();
    });
  }

  if (userTrigger) {
    userTrigger.addEventListener("click", (event) => {
      event.preventDefault();
      const expanded = userTrigger.getAttribute("aria-expanded") === "true";
      closeHelpMenu();
      setUserMenuOpen(!expanded);
    });
  }

  if (userTrigger && userPanel && userMenu) {
    userTrigger.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        closeHelpMenu();
        setUserMenuOpen(true);
        userPanel.querySelector('[role="menuitemradio"], [role="menuitem"]')?.focus();
      }
    });

    userPanel.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeUserMenu();
        userTrigger.focus();
      }
    });

    userPanel.querySelectorAll('[role="menuitem"]').forEach((item) => {
      item.addEventListener("click", () => {
        closeUserMenu();
      });
    });

    userPanel.addEventListener("click", (event) => {
      const collapseToggle = event.target.closest("[data-shell-role-collapse-toggle]");

      if (collapseToggle) {
        const group = collapseToggle.closest(".e-permits-shell__role-group");
        const isExpanded = !group?.classList.contains("is-expanded");
        const label = collapseToggle.querySelector("[data-shell-role-collapse-label]");
        group?.classList.toggle("is-expanded", isExpanded);
        // a collapsed panel stays out of the tab order
        group?.querySelector(".e-permits-fo-auth__role-collapse")?.toggleAttribute("inert", !isExpanded);
        collapseToggle.setAttribute("aria-expanded", String(isExpanded));
        if (label) label.textContent = isExpanded ? "Arată mai puține" : "Arată mai multe";
        return;
      }

      const option = event.target.closest("[data-shell-role-option]");

      if (!option || !option.dataset.assignmentId) {
        return;
      }

      applyRoleAssignment(option.dataset.assignmentId);
      restorePageHash();
    });

    document.addEventListener("click", (event) => {
      if (!userMenu.contains(event.target)) {
        closeUserMenu();
      }
    });
  }

  roleOpeners.forEach((button) => {
    button.addEventListener("click", () => {
      closeUserMenu();
      closeHelpMenu();
    });
  });

  roleOptions.forEach((option) => {
    option.addEventListener("click", () => {
      roleOptions.forEach((item) => item.classList.toggle("is-active", item === option));
    });
  });

  desktopMedia.addEventListener("change", (event) => {
    if (!event.matches) {
      shell.classList.remove("is-collapsed");
    }

    syncExpandedState();
  });

  setupNavTooltips();
  void (async () => {
    await initRoleSwitcher();
    await initWorkplace();

    /* initWorkplace may have opened a #dosar/ or #utilizator/ deep link;
       re-applying the assignment would put the registry back over it */
    const deepLinkedProfileOpen = shell.classList.contains("is-dosar-profile-open") ||
      shell.classList.contains("is-user-profile-open") ||
      shell.classList.contains("is-role-profile-open") ||
      shell.classList.contains("is-ntpl-profile-open") ||
      shell.classList.contains("is-clas-profile-open") ||
      Boolean(serviceProfileState.code && permitsProfilePanel && !permitsProfilePanel.hidden);

    if (activeAssignmentId && !deepLinkedProfileOpen) {
      applyRoleAssignment(activeAssignmentId, { persist: false, closeMenu: false });
      /* the role's default page is drawn; now open the page the address names */
      routeFromHash();
    }
  })();
  syncExpandedState();

  /* every modal: a hairline under the header / above the footer only while content is
     scrolled out of view on that side (.modal-content is the scroller) */
  const syncModalScrollEdges = (content) => {
    const modal = content.closest(".modal");
    if (!modal) return;
    const scrollable = content.scrollHeight - content.clientHeight > 1;
    modal.classList.toggle("has-scroll-above", scrollable && content.scrollTop > 0);
    modal.classList.toggle("has-scroll-below", scrollable && content.scrollTop + content.clientHeight < content.scrollHeight - 1);
  };
  let modalEdgesFrame = 0;
  const syncOpenModalEdges = () => {
    if (modalEdgesFrame) return;
    modalEdgesFrame = requestAnimationFrame(() => {
      modalEdgesFrame = 0;
      document.querySelectorAll(".modal-overlay.is-active .modal-content").forEach(syncModalScrollEdges);
    });
  };
  document.addEventListener("scroll", (event) => {
    if (event.target instanceof Element && event.target.matches(".modal-content")) syncModalScrollEdges(event.target);
  }, true);
  new MutationObserver(syncOpenModalEdges).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "hidden"] });
  window.addEventListener("resize", syncOpenModalEdges);
});
