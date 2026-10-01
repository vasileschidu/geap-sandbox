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
    editKey: null,
    draftValue: "",
    comboForm: null,
    permOpenGroups: new Set(),
    permSearch: "",
    permSearchOpen: false,
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

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  /* the full-flow required marker (.e-permits-fo-required) */
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
  const renderFoSelectControl = ({ id, attrs = "", optionsHtml, disabled = false, label = "" }) => {
    const probe = document.createElement("select");
    probe.innerHTML = optionsHtml;
    const chosen = probe.querySelector("option[selected]") || probe.options[0];
    const isPlaceholder = !chosen || chosen.value === "";

    return `
      <div class="e-permits-fo-select${disabled ? " is-disabled" : ""}" data-fo-native-select>
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
        ultimaActualizare: user.ultimaActualizare
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
      return `
        <div class="e-permits-user-create__empty">
          <span class="e-permits-user-create__empty-icon" aria-hidden="true">
            <img src="assets/icons/user-empty-inbox.svg" alt="">
          </span>
          <span>Niciun rol adăugat</span>
        </div>
        <button class="btn btn-neutral btn-sm" type="button" data-user-combination-open>
          <svg class="icon" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-large"></use></svg>
          <span>Adaugă combinație</span>
        </button>
      `;
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
            <span>13 digits</span>
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
            <input id="user-create-idnp" type="text" inputmode="numeric" name="idnp" maxlength="13" value="${escapeHtml(userCreateState.idnp)}" placeholder="Enter IDNP" autocomplete="off">
          </div>
          <span class="e-permits-user-create__inline${userCreateState.lookupError ? " e-permits-user-create__error" : ""}">
            <span>${escapeHtml(userCreateState.lookupError || "13 digits")}</span>
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

  const renderRoleGroups = () => {
    if (!rolesDb || !roleGroupsPanel) {
      return;
    }

    roleGroupsPanel.innerHTML = rolesDb.groups.map((group) => `
      <section class="e-permits-shell__role-group" aria-labelledby="shell-role-group-${escapeHtml(group.id)}">
        <h3 id="shell-role-group-${escapeHtml(group.id)}" class="e-permits-shell__role-group-title">${escapeHtml(group.label)}</h3>
        <div class="e-permits-shell__role-list">
          ${(group.assignments || []).map((assignment) => {
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
          }).join("")}
        </div>
      </section>
    `).join("");
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
    });
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
      return ["inExaminare", "spreCoordonare"].includes(row.status);
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
    if (["services", "authorities", "tariffs"].includes(workplaceDb?.kind)) {
      return [row.cod, row.denumire, row.institutie, row.autoritateCod, row.statut, row.idno, row.domeniu]
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

  const getVisibleRows = () => {
    const view = getView();
    const tab = getActiveTab(view);

    const rows = getBaseRows(view)
      .filter((row) => filterByToken(row, tab?.filter))
      .filter(filterBySearch);

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
    if (["users", "services", "authorities", "tariffs"].includes(workplaceDb?.kind) && workplaceDb.columns[key]?.width) {
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

  /* Shared back-office page header (Figma 8993:37914): breadcrumbs + title,
     optional actions with a caption on the right, a meta row of label/value
     pairs split by vertical separators, then the tab row. Every profile —
     dosar, utilizator, rol, act permisiv — renders through these, so the
     format stays identical everywhere. A crumb with `attr` is a link that
     reuses an existing back handler; without it, it is plain text. */
  const renderPageHeaderTop = ({ crumbs = [], title = "", actions = "", caption = "" }) => `
    <div class="e-permits-page-header__heading">
      <nav class="breadcrumbs e-permits-page-header__breadcrumbs" aria-label="Navigare">
        <ol class="breadcrumbs__list">
          ${crumbs.map((crumb, index) => index < crumbs.length - 1
            ? `<li class="breadcrumbs__item">${crumb.attr
              ? `<a class="breadcrumbs__link" href="#" ${crumb.attr}>${escapeHtml(crumb.label)}</a>`
              : `<span class="breadcrumbs__link">${escapeHtml(crumb.label)}</span>`}</li>`
            : `<li class="breadcrumbs__item"><span class="breadcrumbs__current" aria-current="page">${escapeHtml(crumb.label)}</span></li>`
          ).join("")}
        </ol>
      </nav>
      <h1 class="e-permits-page-header__title" title="${escapeHtml(title)}">${escapeHtml(title)}</h1>
    </div>
    ${actions || caption ? `
      <div class="e-permits-page-header__aside">
        ${actions ? `<div class="e-permits-page-header__actions">${actions}</div>` : ""}
        ${caption ? `<p class="e-permits-page-header__caption">${escapeHtml(caption)}</p>` : ""}
      </div>
    ` : ""}
  `;

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
    { id: "notificari", label: "Notificări", count: (profile) => profile.notificari.length }
  ];

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
    const paymentState = isClosed || statusIndex >= DOSAR_STATUS_ORDER.indexOf("spreCoordonare")
      ? "achitata"
      : hasPaymentAlert
        ? "expirata"
        : "emisa";
    const paymentDate = paymentState === "achitata" ? row.dataSemnarii || row.dataDepunerii : null;
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
      ...(statusIndex >= DOSAR_STATUS_ORDER.indexOf("inExaminare") ? [{
        canal: "MNotify",
        destinatar: "+373 60 000 000",
        eveniment: "Actualizarea statutului dosarului",
        trimisaLa: formatDateTime(row.termenExaminare, "08:45"),
        status: hasFailedNotification ? "esuata" : "livrata"
      }] : [])
    ];

    const taxaBaseNr = 440000 + (hash % 50000);
    const taxaEmitere = row.dataDepunerii;
    const taxaAchitatDate = paymentDate || toIsoDate(addDays(parseIsoDate(row.dataDepunerii), 1));
    const suplimentaraNeachitat = hasPaymentAlert;
    const suplimentaraTermen = suplimentaraNeachitat
      ? toIsoDate(addDays(parseIsoDate(workplaceDb.today), 3))
      : toIsoDate(addDays(parseIsoDate(row.dataDepunerii), 30));
    const taxe = [
      {
        id: `MPAY-${taxaBaseNr}`,
        denumire: "Taxă de examinare — la depunere",
        suma: 560,
        status: "achitat",
        emitere: taxaEmitere,
        termen: taxaEmitere,
        achitare: taxaEmitere
      },
      {
        id: `MPAY-${taxaBaseNr + 1}`,
        denumire: "Taxă de eliberare a actului",
        suma: 460,
        status: "achitat",
        emitere: taxaEmitere,
        termen: toIsoDate(addDays(parseIsoDate(taxaEmitere), 30)),
        achitare: taxaAchitatDate
      },
      {
        id: `MPAY-${taxaBaseNr + 2}`,
        denumire: "Taxă suplimentară — expertiză",
        suma: 120,
        status: suplimentaraNeachitat ? "neachitat" : "achitat",
        emitere: taxaEmitere,
        termen: suplimentaraTermen,
        achitare: suplimentaraNeachitat ? null : taxaAchitatDate
      }
    ];

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
    title: row.serviciu
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

  const renderProfileState = (label, tone = "neutral") => renderTag(label, tone);

  const renderDeadlineMeta = (iso) => {
    const days = daysUntil(iso);
    const label = days < 0 ? `${Math.abs(days)} z. depășit` : `${days} z. rămase`;
    const tone = days < 0 ? "crit" : "warn";
    return ` <span class="e-permits-dosar-profil__deadline-meta e-permits-dosar-profil__deadline-meta--${tone}">${escapeHtml(label)}</span>`;
  };

  const renderProfileDocItem = ({ title, meta }) => `
    <div class="e-permits-dosar-profil__doc-item">
      <span class="e-permits-dosar-profil__doc-icon" aria-hidden="true">${renderProfileIcon("document-filled", 20)}</span>
      <div class="e-permits-dosar-profil__doc-copy">
        <p class="e-permits-dosar-profil__doc-title">${escapeHtml(title)}</p>
        <p class="e-permits-dosar-profil__doc-meta">${meta}</p>
      </div>
      <button class="e-permits-dosar-profil__doc-action" type="button">
        ${renderProfileIcon("eye-open", 16)}
        <span>Vezi documentul</span>
      </button>
    </div>
  `;

  const renderProfileDocList = (title, items) => `
    <section class="e-permits-dosar-profil__section e-permits-dosar-profil__section--docs">
      <h2 class="e-permits-dosar-profil__section-title">${escapeHtml(title)}</h2>
      <div class="e-permits-dosar-profil__doc-list">
        ${items.length ? items.map(renderProfileDocItem).join("") : `<p class="e-permits-dosar-profil__empty">Nu există înregistrări pentru această secțiune.</p>`}
      </div>
    </section>
  `;

  const renderProfileTable = (title, columns, rows, options = {}) => `
    <section class="e-permits-dosar-profil__section e-permits-dosar-profil__section--table">
      <div class="e-permits-dosar-profil__section-heading">
        <h2 class="e-permits-dosar-profil__section-title">${escapeHtml(title)}</h2>
        ${options.meta ? `<span class="e-permits-dosar-profil__section-meta">${escapeHtml(options.meta)}</span>` : ""}
      </div>
      <div class="e-permits-dosar-profil__card e-permits-dosar-profil__card--table">
        <div class="e-permits-dosar-profil__table-scroll">
        <table class="e-permits-dosar-profil__table">
          <thead>
            <tr>${columns.map((column) => `<th scope="col">${escapeHtml(column.label)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows.map((item) => `<tr>${columns.map((column) => `<td data-label="${escapeHtml(column.label)}">${column.render(item)}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
        </div>
      </div>
    </section>
  `;

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

    const dateDeProces = renderInfoCard("Date de proces", [
      [isOficiu ? "Data inițierii" : "Data depunerii", escapeHtml(formatDate(isOficiu ? row.dataInitierii : row.dataDepunerii))],
      ["Termenul de examinare", `${escapeHtml(formatDate(row.termenExaminare))}${termenMeta ? ` <span class="e-permits-dosar-profil__termen-meta">${escapeHtml(termenMeta)}</span>` : ""}`],
      ["Statutul dosarului", renderTag(status?.label, status?.tone)]
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

    return `${identificare}${dateDeProces}${organizare}${persoaneImplicate}${decizieSiAct}`;
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

  const renderDosarProfilTaxe = (row) => {
    const profile = buildDosarProfile(row);
    const dash = '<span class="e-permits-workplace__dash">—</span>';

    return renderProfileTable("Conturi de plată", [
      { label: "Numărul cont", render: (taxa) => renderCopyCode(taxa.id, `Copiază ${taxa.id}`) },
      { label: "Denumirea", render: (taxa) => escapeHtml(taxa.denumire) },
      { label: "Suma", render: (taxa) => `${taxa.suma} MDL` },
      { label: "Statut", render: (taxa) => taxa.status === "neachitat" ? renderTag("Neachitat", "warning") : renderTag("Achitat", "ok") },
      { label: "Data emiterii", render: (taxa) => escapeHtml(formatDate(taxa.emitere)) },
      { label: "Termen plată", render: (taxa) => `${escapeHtml(formatDate(taxa.termen))}${taxa.status === "neachitat" ? renderDeadlineMeta(taxa.termen) : ""}` },
      { label: "Data achitării", render: (taxa) => taxa.achitare ? escapeHtml(formatDate(taxa.achitare)) : dash }
    ], profile.taxe);
  };

  const renderDosarProfilAvize = (row) => {
    const profile = buildDosarProfile(row);
    const states = {
      favorabil: ["Finalizat", "ok"],
      inLucru: ["În lucru", "warning"],
      expirat: ["Termen depășit", "crit"]
    };

    return renderProfileTable("Avize solicitate", [
      { label: "Număr", render: (aviz) => renderCopyCode(aviz.id, `Copiază ${aviz.id}`) },
      { label: "Instituție", render: (aviz) => escapeHtml(aviz.institutie) },
      { label: "Solicitat la", render: (aviz) => escapeHtml(aviz.solicitatLa) },
      { label: "Termen", render: (aviz) => escapeHtml(aviz.termen) },
      { label: "Rezultat", render: (aviz) => escapeHtml(aviz.rezultat) },
      { label: "Statut", render: (aviz) => renderProfileState(...states[aviz.status]) }
    ], profile.avize, { meta: `${profile.avize.length} aviz solicitat` });
  };

  const renderDosarProfilDecizie = (row) => {
    const profile = buildDosarProfile(row);

    return renderProfileDocList("Acte și decizii", profile.acte.map((act) => ({
      title: act.titlu,
      meta: `Emis <strong>${escapeHtml(act.emis)}</strong> &middot; ${escapeHtml(act.sursa)}`
    })));
  };

  const renderDosarProfilDocumente = (row) => {
    const profile = buildDosarProfile(row);

    return renderProfileDocList("Documente generate", profile.documente.map((document) => ({
      title: document.nume,
      meta: `Emis <strong>${escapeHtml(document.data)}</strong> &middot; ${escapeHtml(document.autor)}`
    })));
  };

  const renderDosarProfilNotificari = (row) => {
    const profile = buildDosarProfile(row);
    const states = {
      livrata: ["Livrată", "ok"],
      esuata: ["Livrare eșuată", "crit"]
    };

    return renderProfileTable("Istoricul notificărilor", [
      { label: "Canal", render: (item) => escapeHtml(item.canal) },
      { label: "Destinatar", render: (item) => escapeHtml(item.destinatar) },
      { label: "Eveniment", render: (item) => escapeHtml(item.eveniment) },
      { label: "Trimisă la", render: (item) => escapeHtml(item.trimisaLa) },
      { label: "Statut", render: (item) => renderProfileState(...states[item.status]) }
    ], profile.notificari, { meta: `${profile.notificari.length} notificări` });
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
      case "general":
      default:
        return renderDosarProfilGeneral(row);
    }
  };

  const renderDosarProfilPanelBody = (row) => {
    if (!dosarProfilPanelBody || !row) {
      return;
    }

    dosarProfilPanelBody.id = `dosar-panel-${dosarProfilState.tabKey}`;
    dosarProfilPanelBody.setAttribute("role", "tabpanel");
    dosarProfilPanelBody.setAttribute("aria-labelledby", `dosar-tab-${dosarProfilState.tabKey}`);
    dosarProfilPanelBody.innerHTML = renderDosarProfilSection(row);
  };

  const renderDosarProfil = (row) => {
    if (!dosarProfilPanel || !row) {
      return;
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

    history.replaceState(null, "", window.location.pathname + window.location.search);

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
    }
  });

  const getUserById = (id) =>
    (usersDb?.runtimeRows || []).find((user) => user.id === id) || null;

  const getUserProfileField = (key) =>
    (usersDb?.profile?.sections || [])
      .flatMap((section) => section.fields || [])
      .find((field) => field.key === key) || null;

  const renderUserProfileTitle = (user) => renderPageHeaderTop({
    crumbs: [
      { label: "Utilizatori", attr: "data-user-profile-crumb-back" },
      { label: user.idnp }
    ],
    title: user.numeComplet,
    actions: `
      <button class="btn btn-neutral btn-sm" type="button" data-user-profile-delegate>Deleagă rol</button>
      <button class="btn btn-outline-destructive btn-sm" type="button" data-user-profile-status-toggle>
        ${user.status === "Activ" ? "Inactivare" : "Activare"}
      </button>
    `
  });

  const renderUserProfileSummary = (user) => renderPageHeaderMeta([
    ["IDNP", renderProfileCopyCode(user.idnp, `Copiază IDNP ${user.idnp}`)],
    ["Rol", `<span class="e-permits-user-profile__summary-roles">${(user.roluri?.length ? user.roluri : ["Specialist"]).map((role) => renderTag(role, "neutral")).join("")}</span>`],
    ["Autoritatea", `<span class="e-permits-user-profile__summary-authority"><span class="e-permits-user-profile__authority-icon" aria-hidden="true"></span><span>${escapeHtml(user.autoritateScurta || "ANSP")}</span></span>`],
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

  const renderUserProfileEditor = (field, user) => {
    const value = userProfileState.draftValue;
    let control = "";

    if (field.type === "authority") {
      control = renderFoSelectControl({
        id: `user-profile-editor-${field.key || "authority"}`,
        attrs: 'data-user-profile-editor',
        label: field.label,
        optionsHtml: (usersDb?.profile?.authorities || []).map((authority) => `
          <option value="${escapeHtml(authority.id)}"${authority.id === value ? " selected" : ""}>${escapeHtml(authority.label)}</option>
        `).join("")
      });
    } else if (field.type === "textarea") {
      control = `
        <div class="e-permits-fo-textarea">
          <textarea rows="3" data-user-profile-editor aria-label="${escapeHtml(field.label)}">${escapeHtml(value)}</textarea>
        </div>
      `;
    } else {
      control = `
        <div class="e-permits-fo-input">
          <input type="text" value="${escapeHtml(value)}" data-user-profile-editor aria-label="${escapeHtml(field.label)}">
        </div>
      `;
    }

    return `
      <div class="e-permits-user-profile__editor">
        ${control}
        <div class="e-permits-user-profile__editor-actions">
          <button class="e-permits-user-profile__save" type="button" data-user-profile-save>Salvează</button>
          <button class="e-permits-user-profile__cancel" type="button" data-user-profile-cancel>Anulează</button>
        </div>
      </div>
    `;
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

  const renderUserProfileField = (field, user) => {
    const editing = userProfileState.editKey === field.key;

    return `
      <div class="e-permits-user-profile__property-row${editing ? " is-editing" : ""}" data-user-profile-field="${escapeHtml(field.key)}">
        <div class="e-permits-user-profile__property-label">${escapeHtml(field.label)}</div>
        <div class="e-permits-user-profile__property-value">
          ${editing ? renderUserProfileEditor(field, user) : `
            <div class="e-permits-user-profile__property-display">
              <span>${renderUserProfileFieldValue(field, user)}</span>
              ${field.editable ? `
                <button class="e-permits-user-profile__edit" type="button" aria-label="Editează ${escapeHtml(field.label)}" data-user-profile-edit="${escapeHtml(field.key)}">
                  <svg class="icon" width="16" height="16" aria-hidden="true">
                    <use href="assets/icons/sprite.svg#icon-edit"></use>
                  </svg>
                </button>
              ` : ""}
            </div>
          `}
        </div>
      </div>
    `;
  };

  const renderUserProfileGeneral = (user) =>
    (usersDb?.profile?.sections || []).map((section) => `
      <section class="e-permits-user-profile__section" aria-labelledby="user-profile-${escapeHtml(section.id)}">
        <h2 id="user-profile-${escapeHtml(section.id)}">${escapeHtml(section.title)}</h2>
        <div class="e-permits-user-profile__property-card">
          ${(section.fields || []).map((field) => renderUserProfileField(field, user)).join("")}
        </div>
      </section>
    `).join("");

  // ---- Combinații de roluri tab ----
  const getPermissionGroups = () => usersDb?.profile?.permissionCatalog?.groups || [];

  const getAllPermissions = () =>
    getPermissionGroups().flatMap((group) =>
      (group.permissions || []).map((permission) => ({ ...permission, groupId: group.id, groupLabel: group.label })));

  const comboPermissionCount = (combo) =>
    Number.isFinite(combo.permissionCount)
      ? combo.permissionCount
      : getAllPermissions().filter((permission) => permission.role === combo.role).length;

  const renderComboCard = (combo, index) => `
    <div class="e-permits-user-profile__combo" data-combo-index="${index}">
      <span class="e-permits-user-profile__combo-icon" aria-hidden="true">
        <img src="assets/icons/sidebar-folder-shared.svg" alt="">
      </span>
      <div class="e-permits-user-profile__combo-info">
        <div class="e-permits-user-profile__combo-crumb">
          <span>${escapeHtml(combo.role)}</span>
          <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-right-small"></use></svg>
          <span>${escapeHtml(combo.authorityShort)}</span>
          <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-right-small"></use></svg>
          <span>${escapeHtml(combo.subdivision)}</span>
        </div>
        <p class="e-permits-user-profile__combo-meta"><strong>${comboPermissionCount(combo)}</strong> permisiuni</p>
      </div>
      <button class="e-permits-user-profile__combo-remove" type="button" data-combo-remove="${index}" aria-label="Elimină combinația">
        <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-cross-small"></use></svg>
      </button>
    </div>
  `;

  const renderComboSelect = (key, label, placeholder, options, value, disabled = false) => `
    <div class="e-permits-fo-field e-permits-user-profile__combo-field">
      <label for="user-profile-combo-${key}">${escapeHtml(label)}${requiredMark()}</label>
      ${renderFoSelectControl({
        id: `user-profile-combo-${key}`,
        attrs: `data-combo-field="${key}"`,
        disabled,
        optionsHtml: `
          <option value="" ${value ? "" : "selected"} disabled hidden>${escapeHtml(placeholder)}</option>
          ${options.map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === value ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
        `
      })}
    </div>
  `;


  const renderComboForm = () => {
    const form = userProfileState.comboForm || {};
    const roleOptions = (usersDb?.profile?.roleOptions || []).map((role) => ({ value: role, label: role }));
    const authorityOptions = (usersDb?.profile?.authorities || []).map((authority) => ({ value: authority.id, label: authority.shortLabel }));
    const subdivisions = form.authorityId
      ? (usersDb?.profile?.subdivisionsByAuthority?.[form.authorityId] || []).map((sub) => ({ value: sub, label: sub }))
      : [];
    const canSubmit = Boolean(form.role && form.authorityId && form.subdivision);

    return `
      <div class="e-permits-user-profile__combo-form-wrap">
        <div class="e-permits-user-profile__combo-form">
          <p class="e-permits-user-profile__combo-form-title">Adaugă combinație</p>
          <div class="e-permits-user-profile__combo-form-fields">
            ${renderComboSelect("role", "Rol", "Selectează rol", roleOptions, form.role || "")}
            ${renderComboSelect("authority", "Autoritate", "Selectează autoritate", authorityOptions, form.authorityId || "")}
            ${renderComboSelect("subdivision", "Subdiviziune", form.authorityId ? "Selectează subdiviziune" : "Selectează întâi Autoritate", subdivisions, form.subdivision || "", !form.authorityId)}
          </div>
        </div>
        <div class="e-permits-user-profile__combo-form-actions">
          <button class="e-permits-user-profile__combo-submit" type="button" data-combo-submit ${canSubmit ? "" : "disabled"}>Adaugă</button>
          <button class="e-permits-user-profile__combo-cancel" type="button" data-combo-cancel>Anulează</button>
        </div>
      </div>
    `;
  };

  const renderRolesTab = (user) => {
    const combos = user.roleCombinations || [];

    return `
      <section class="e-permits-user-profile__section e-permits-user-profile__combos-section">
        <h2>Combinații atribuite</h2>
        <div class="e-permits-user-profile__combos">
          ${combos.map((combo, index) => renderComboCard(combo, index)).join("")}
        </div>
        ${userProfileState.comboForm ? renderComboForm() : `
          <button class="e-permits-user-profile__combo-add" type="button" data-combo-add-open>
            <svg class="icon" width="16" height="16" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-large"></use></svg>
            <span>Adaugă combinație</span>
          </button>
        `}
      </section>
    `;
  };

  // ---- Permisiuni tab ----
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
  const banIcon = `<svg class="e-permits-user-profile__ban" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.5"/><line x1="3.75" y1="3.75" x2="12.25" y2="12.25" stroke="currentColor" stroke-width="1.5"/></svg>`;

  const PERM_STATE_TAG = {
    granted: ["Acordată", "success"],
    add: ["Se adaugă", "brand"],
    remove: ["Se retrage", "danger"]
  };

  const renderPermRow = (subject, permission, state = userProfileState) => {
    const rowState = permRowState(subject, permission.id, state);
    const addDisabled = rowState === "granted" || rowState === "remove";
    const subtitle = rowState === "add" ? "acordată individual, peste rol" : `din rolul ${permission.role}`;
    const tag = PERM_STATE_TAG[rowState];

    return renderStackItem({
      plainTitle: permission.label,
      title: escapeHtml(permission.label),
      badges: tag ? [renderTag(tag[0], tag[1])] : [],
      meta: [escapeHtml(subtitle)],
      actionsHtml: `
        <button class="e-permits-user-profile__perm-btn e-permits-user-profile__perm-add${rowState === "add" ? " is-active" : ""}" type="button" aria-pressed="${rowState === "add" ? "true" : "false"}" data-perm-add="${permission.id}" ${addDisabled ? "disabled" : ""}>
          <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-small"></use></svg>
          <span>Adaugă</span>
        </button>
        <button class="e-permits-user-profile__perm-btn e-permits-user-profile__perm-retrage${rowState === "remove" ? " is-active" : ""}" type="button" aria-pressed="${rowState === "remove" ? "true" : "false"}" data-perm-remove="${permission.id}">
          ${banIcon}
          <span>Retrage</span>
        </button>
      `
    });
  };

  const renderPermGroup = (subject, group, state = userProfileState) => {
    const permissions = group.permissions || [];
    const total = permissions.length;
    const granted = permissions.filter((permission) => permBaseGranted(subject, permission.id)).length;
    const addDelta = permissions.filter((permission) => state.permAdd.has(permission.id)).length;
    const removeDelta = permissions.filter((permission) => permBaseGranted(subject, permission.id) && state.permRemove.has(permission.id)).length;
    const open = state.permOpenGroups.has(group.id);

    return `
      <div class="e-permits-stack__group${open ? " is-open" : " is-collapsed"}">
        <h3 class="e-permits-stack__group-label e-permits-stack__group-label--toggle">
          <button class="e-permits-stack__group-toggle" type="button" data-perm-group="${group.id}" aria-expanded="${open ? "true" : "false"}">
            <span class="e-permits-stack__group-name">${escapeHtml(group.label)}</span>
            <span class="badge badge--lg badge--solid-light e-permits-stack__group-count">${granted}/${total}</span>
            ${addDelta ? renderTag(`+${addDelta}`, "brand") : ""}
            ${removeDelta ? renderTag(`−${removeDelta}`, "danger") : ""}
            <svg class="icon small e-permits-stack__group-chevron" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
          </button>
        </h3>
        ${open ? `<ul class="e-permits-stack__list" role="list">${permissions.map((permission) => renderPermRow(subject, permission, state)).join("")}</ul>` : ""}
      </div>
    `;
  };

  /* Search options reuse the full-flow suggestion list (.e-permits-fo-address-search)
     with the library checkbox in place of the leading icon. */
  const renderPermSearchOptions = (subject, state = userProfileState) => {
    const query = state.permSearch.trim().toLocaleLowerCase("ro");
    const matches = getAllPermissions()
      .filter((permission) => permission.label.toLocaleLowerCase("ro").includes(query))
      .slice(0, 6);

    if (!matches.length) {
      return `<li class="e-permits-fo-caem__empty" role="presentation">Nicio permisiune găsită</li>`;
    }

    return matches.map((permission) => {
      const checked = permEffectiveGranted(subject, permission.id, state);
      return `
        <li class="e-permits-fo-address-search__option" role="option" aria-selected="${checked ? "true" : "false"}" data-perm-toggle="${permission.id}">
          <span class="checkbox checkbox--medium" aria-hidden="true">
            <input class="checkbox-input" type="checkbox" tabindex="-1"${checked ? " checked" : ""}>
            <span class="checkbox-custom"></span>
          </span>
          <span class="e-permits-fo-address-search__copy">
            <span class="e-permits-fo-address-search__title">${escapeHtml(permission.label)}</span>
            <span class="e-permits-fo-address-search__meta">${escapeHtml(permission.groupLabel)}</span>
          </span>
        </li>
      `;
    }).join("");
  };

  /* Typing only refreshes the suggestion list — re-rendering the whole panel
     on every keystroke dropped characters typed before the refocus. */
  const syncPermSearchMenu = (panelBody, subject, state) => {
    const input = panelBody?.querySelector("[data-perm-search]");
    const list = panelBody?.querySelector("[data-perm-menu]");

    if (!input || !list) {
      return;
    }

    const open = Boolean(state.permSearch.trim());
    list.innerHTML = open ? renderPermSearchOptions(subject, state) : "";
    list.hidden = !open;
    input.setAttribute("aria-expanded", String(open));
  };

  const renderPermissionsTab = (subject, state = userProfileState) => {
    const active = permBaseActiveCount(subject) + state.permAdd.size - state.permRemove.size;
    const addCount = state.permAdd.size;
    const removeCount = state.permRemove.size;
    const editing = addCount > 0 || removeCount > 0;

    return `
      <section class="e-permits-user-profile__section e-permits-user-profile__perms e-permits-stack-section">
        <div class="e-permits-dosar-profil__section-heading e-permits-perms__heading">
          <h2 class="e-permits-dosar-profil__section-title">Permisiuni${renderTag(`${active} active`, "neutral")}${addCount ? renderTag(`+${addCount}`, "brand") : ""}${removeCount ? renderTag(`−${removeCount}`, "danger") : ""}</h2>
          ${editing ? `
            <div class="e-permits-stack__actions">
              <button class="btn btn-neutral btn-sm e-permits-stack__action" type="button" data-perm-discard>Renunță</button>
              <button class="btn btn-primary btn-sm e-permits-stack__action" type="button" data-perm-save>Salvează</button>
            </div>
          ` : ""}
        </div>
        <div class="e-permits-fo-address-search e-permits-user-profile__perm-search">
          <div class="e-permits-fo-input e-permits-fo-input--with-action">
            <input type="text" placeholder="Caută permisiune" value="${escapeHtml(state.permSearch)}" autocomplete="off" role="combobox" aria-label="Caută permisiune" aria-autocomplete="list" aria-expanded="${state.permSearch.trim() ? "true" : "false"}" data-perm-search>
            <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-search"></use></svg>
          </div>
          <ul class="e-permits-fo-address-search__list" role="listbox" aria-label="Permisiuni găsite" data-perm-menu${state.permSearch.trim() ? "" : " hidden"}>${state.permSearch.trim() ? renderPermSearchOptions(subject, state) : ""}</ul>
        </div>
        <div class="e-permits-stack e-permits-perms__stack">
          ${getPermissionGroups().map((group) => renderPermGroup(subject, group, state)).join("")}
        </div>
      </section>
    `;
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

    return `
      <section class="e-permits-user-profile__section">
        <h2>${escapeHtml(tab?.label || "Profil utilizator")}</h2>
        <div class="e-permits-user-profile__empty">
          <svg class="icon" width="24" height="24" aria-hidden="true">
            <use href="assets/icons/sprite.svg#icon-circle-info"></use>
          </svg>
          <span>Nu există înregistrări pentru această secțiune.</span>
        </div>
      </section>
    `;
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

    if (userProfileState.editKey) {
      requestAnimationFrame(() => focusFormControl(userProfilePanelBody.querySelector("[data-user-profile-editor]")));
    }
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
    userProfileState.permSearchOpen = false;
    userProfileState.permOpenGroups = new Set(["avizare"]);
  };

  const openUserProfile = (user, requestedTab = "general") => {
    if (!user || !userProfilePanel) {
      return;
    }

    const tabs = usersDb?.profile?.tabs || [];
    userProfileState.rowId = user.id;
    userProfileState.tabKey = tabs.some((tab) => tab.id === requestedTab) ? requestedTab : "general";
    userProfileState.editKey = null;
    userProfileState.draftValue = "";
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
    if (!userProfilePanel) {
      return;
    }

    userProfilePanel.hidden = true;
    userProfileBackShell.hidden = true;
    workplacePanel.hidden = false;
    shell.classList.remove("is-user-profile-open");
    userProfileState.rowId = null;
    userProfileState.editKey = null;
    history.replaceState(null, "", window.location.pathname + window.location.search);
    renderWorkplace();
  };

  const saveUserProfileField = () => {
    const user = getUserById(userProfileState.rowId);
    const field = getUserProfileField(userProfileState.editKey);

    if (!user || !field?.editable) {
      return;
    }

    if (field.type === "authority") {
      const authority = (usersDb?.profile?.authorities || [])
        .find((item) => item.id === userProfileState.draftValue);

      if (authority) {
        user.autoritateId = authority.id;
        user.autoritate = authority.label;
        user.autoritateScurta = authority.shortLabel;
      }
    } else {
      user[field.key] = userProfileState.draftValue.trim();
    }

    user.ultimaActualizare = new Date().toISOString().slice(0, 10);
    persistUserProfileOverride(user);
    userProfileState.editKey = null;
    userProfileState.draftValue = "";
    renderUserProfile(user);
    showShellToast("Modificările utilizatorului au fost salvate.");
  };

  const commitCombination = (user) => {
    const form = userProfileState.comboForm;

    if (!form?.role || !form.authorityId || !form.subdivision) {
      return;
    }

    const authority = (usersDb?.profile?.authorities || []).find((item) => item.id === form.authorityId);
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
    renderUserProfile(user);
    showShellToast("Combinația de rol a fost adăugată.");
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
      userProfileState.comboForm = { role: "", authorityId: "", subdivision: "" };
      renderUserProfilePanelBody(user);
      return true;
    }

    if (event.target.closest("[data-combo-cancel]")) {
      userProfileState.comboForm = null;
      renderUserProfilePanelBody(user);
      return true;
    }

    if (event.target.closest("[data-combo-submit]")) {
      commitCombination(user);
      return true;
    }

    const removeButton = event.target.closest("[data-combo-remove]");

    if (removeButton) {
      removeCombination(user, Number(removeButton.dataset.comboRemove));
      return true;
    }

    return false;
  };

  const togglePermAdd = (subject, id, state = userProfileState) => {
    if (permBaseGranted(subject, id)) {
      return;
    }

    if (state.permAdd.has(id)) {
      state.permAdd.delete(id);
    } else {
      state.permAdd.add(id);
    }

    state.permRemove.delete(id);
  };

  const togglePermRemove = (subject, id, state = userProfileState) => {
    if (!permBaseGranted(subject, id)) {
      state.permAdd.delete(id);
      return;
    }

    if (state.permRemove.has(id)) {
      state.permRemove.delete(id);
    } else {
      state.permRemove.add(id);
    }
  };

  const togglePermFromSearch = (subject, id, state = userProfileState) => {
    if (permEffectiveGranted(subject, id, state)) {
      if (permBaseGranted(subject, id)) {
        state.permRemove.add(id);
      } else {
        state.permAdd.delete(id);
      }
    } else if (permBaseGranted(subject, id)) {
      state.permRemove.delete(id);
    } else {
      state.permAdd.add(id);
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
    userProfileState.permAdd = new Set();
    userProfileState.permRemove = new Set();
    renderUserProfile(user);
    showShellToast("Permisiunile au fost salvate.");
  };

  /* Ticking a search option must not touch the open list (scroll, hover, focus):
     patch the option in place and swap only the heading counts and the groups. */
  const patchPermissionsTab = (panelBody, subject, state) => {
    const heading = panelBody?.querySelector(".e-permits-perms__heading");
    const stack = panelBody?.querySelector(".e-permits-perms__stack");

    if (!heading || !stack) {
      return false;
    }

    const next = document.createElement("div");
    next.innerHTML = renderPermissionsTab(subject, state);
    heading.replaceWith(next.querySelector(".e-permits-perms__heading"));
    stack.replaceWith(next.querySelector(".e-permits-perms__stack"));

    panelBody.querySelectorAll("[data-perm-menu] [data-perm-toggle]").forEach((option) => {
      const checked = permEffectiveGranted(subject, option.dataset.permToggle, state);
      option.setAttribute("aria-selected", String(checked));
      const box = option.querySelector(".checkbox-input");

      if (box) {
        box.checked = checked;
      }
    });

    return true;
  };

  const refocusPermSearch = () => {
    requestAnimationFrame(() => {
      const input = userProfilePanelBody?.querySelector("[data-perm-search]");

      if (input) {
        input.focus();
        const value = input.value;
        input.value = "";
        input.value = value;
      }
    });
  };

  const handlePermissionsTabClick = (event, user) => {
    if (userProfileState.tabKey !== "permissions") {
      return false;
    }

    const groupButton = event.target.closest("[data-perm-group]");

    if (groupButton) {
      const id = groupButton.dataset.permGroup;

      if (userProfileState.permOpenGroups.has(id)) {
        userProfileState.permOpenGroups.delete(id);
      } else {
        userProfileState.permOpenGroups.add(id);
      }

      renderUserProfilePanelBody(user);
      return true;
    }

    const addButton = event.target.closest("[data-perm-add]");

    if (addButton) {
      if (!addButton.disabled) {
        togglePermAdd(user, addButton.dataset.permAdd);
        renderUserProfilePanelBody(user);
      }

      return true;
    }

    const removeButton = event.target.closest("[data-perm-remove]");

    if (removeButton) {
      togglePermRemove(user, removeButton.dataset.permRemove);
      renderUserProfilePanelBody(user);
      return true;
    }

    const toggleButton = event.target.closest("[data-perm-toggle]");

    if (toggleButton) {
      togglePermFromSearch(user, toggleButton.dataset.permToggle);

      if (!patchPermissionsTab(userProfilePanelBody, user, userProfileState)) {
        renderUserProfilePanelBody(user);
        refocusPermSearch();
      }
      return true;
    }

    if (event.target.closest("[data-perm-save]")) {
      commitPermissions(user);
      return true;
    }

    if (event.target.closest("[data-perm-discard]")) {
      userProfileState.permAdd = new Set();
      userProfileState.permRemove = new Set();
      renderUserProfilePanelBody(user);
      return true;
    }

    return false;
  };

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
    permOpenGroups: new Set(["avizare"]),
    permSearch: ""
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
    roleProfileState.permOpenGroups = new Set(["avizare"]);
    roleProfileState.permSearch = "";
  };

  const renderRoleProfileTitle = (role) => renderPageHeaderTop({
    crumbs: [
      { label: "Roluri", attr: "data-role-profile-crumb-back" },
      { label: role.id }
    ],
    title: role.denumire
  });

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

    return `
      <section class="e-permits-user-profile__section">
        <h2>Date de identificare</h2>
        <div class="e-permits-user-profile__property-card">
          ${rows.map(([label, value]) => `
            <div class="e-permits-user-profile__property-row">
              <div class="e-permits-user-profile__property-label">${escapeHtml(label)}</div>
              <div class="e-permits-user-profile__property-value">
                <div class="e-permits-user-profile__property-display"><span>${value}</span></div>
              </div>
            </div>
          `).join("")}
        </div>
      </section>
    `;
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
    renderRoleProfile(role);
    roleProfilePanel.scrollIntoView?.({ block: "start" });
  };

  const closeRoleProfile = () => {
    if (roleProfilePanel) {
      roleProfilePanel.hidden = true;
    }

    if (roleProfileBackShell) {
      roleProfileBackShell.hidden = true;
    }

    shell.classList.remove("is-role-profile-open");
    roleProfileState.roleId = null;
    showRolesRegistry();
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
    roleProfileState.permAdd.forEach((id) => granted.add(id));
    roleProfileState.permRemove.forEach((id) => granted.delete(id));
    role.functii = getAllPermissions().map((permission) => permission.id).filter((id) => granted.has(id));
    resetRolePermState();
    renderRoleProfile(role);
    showShellToast("Permisiunile rolului au fost salvate.");
  };

  const refocusRolePermSearch = () => {
    requestAnimationFrame(() => {
      const input = roleProfilePanelBody?.querySelector("[data-perm-search]");

      if (input) {
        input.focus();
        const value = input.value;
        input.value = "";
        input.value = value;
      }
    });
  };

  if (roleProfilePanel) {
    roleProfilePanel.addEventListener("input", (event) => {
      const search = event.target.closest("[data-perm-search]");

      if (search) {
        roleProfileState.permSearch = search.value;
        syncPermSearchMenu(roleProfilePanelBody, getRoleById(roleProfileState.roleId), roleProfileState);
      }
    });

    roleProfilePanel.addEventListener("mousedown", (event) => {
      if (event.target.closest("[data-perm-toggle]")) {
        event.preventDefault();
      }
    });

    roleProfilePanel.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && event.target.closest("[data-perm-search]") && roleProfileState.permSearch) {
        event.preventDefault();
        event.stopPropagation();
        roleProfileState.permSearch = "";
        event.target.value = "";
        syncPermSearchMenu(roleProfilePanelBody, getRoleById(roleProfileState.roleId), roleProfileState);
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

      const tabButton = event.target.closest("[data-role-profile-tab]");

      if (tabButton) {
        roleProfileState.tabKey = tabButton.dataset.roleProfileTab;
        syncTabStripActive(roleProfileTabs, "data-role-profile-tab", "roleProfileTab", roleProfileState.tabKey);
        renderRoleProfilePanelBody(role);
        tabButton.focus();
        return;
      }

      if (roleProfileState.tabKey !== "permissions") {
        return;
      }

      const groupButton = event.target.closest("[data-perm-group]");

      if (groupButton) {
        const id = groupButton.dataset.permGroup;

        if (roleProfileState.permOpenGroups.has(id)) {
          roleProfileState.permOpenGroups.delete(id);
        } else {
          roleProfileState.permOpenGroups.add(id);
        }

        renderRoleProfilePanelBody(role);
        return;
      }

      const addButton = event.target.closest("[data-perm-add]");

      if (addButton) {
        if (!addButton.disabled) {
          togglePermAdd(role, addButton.dataset.permAdd, roleProfileState);
          renderRoleProfilePanelBody(role);
        }

        return;
      }

      const removeButton = event.target.closest("[data-perm-remove]");

      if (removeButton) {
        togglePermRemove(role, removeButton.dataset.permRemove, roleProfileState);
        renderRoleProfilePanelBody(role);
        return;
      }

      const toggleButton = event.target.closest("[data-perm-toggle]");

      if (toggleButton) {
        togglePermFromSearch(role, toggleButton.dataset.permToggle, roleProfileState);

        if (!patchPermissionsTab(roleProfilePanelBody, role, roleProfileState)) {
          renderRoleProfilePanelBody(role);
          refocusRolePermSearch();
        }
        return;
      }

      if (event.target.closest("[data-perm-save]")) {
        commitRolePermissions(role);
        return;
      }

      if (event.target.closest("[data-perm-discard]")) {
        roleProfileState.permAdd = new Set();
        roleProfileState.permRemove = new Set();
        renderRoleProfilePanelBody(role);
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
        ${remaining ? `<span class="e-permits-workplace__user-role-more">+${remaining}</span>` : ""}
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
          <td class="e-permits-workplace__empty" colspan="${colSpan}">${escapeHtml(view?.emptyMessage || "Nu sunt dosare pentru filtrul curent.")}</td>
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

      const computedCount = baseRows.filter((row) => filterByToken(row, tab.filter)).length;
      const count = Number.isFinite(tab.displayCount) ? tab.displayCount : computedCount;
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

  const SERVICE_STATUS_TONES = { Publicat: "success", Nepublicat: "warning", Inactiv: "neutral" };

  const SERVICE_PROFILE_TABS = [
    { id: "general", label: "Date generale", icon: "page-text" },
    { id: "request-types", label: "Tipuri solicitări", count: (service) => service.geap.requestTypes.length },
    { id: "forms", label: "Formulare", count: (service) => service.geap.forms.length },
    { id: "payments", label: "Plăți și tarife", count: (service) => service.geap.payments.length },
    { id: "tariffs", label: "Tarife", count: (service) => (servicesStore?.tariffs || []).filter((tariff) => tariff.scope === service.code).length },
    { id: "dependencies", label: "Interdependențe", count: (service) => service.geap.dependencies.length },
    { id: "classifiers", label: "Clasificatoare specifice", count: (service) => service.geap.classifiers.length },
    { id: "templates", label: "Șabloane", count: (service) => service.geap.templates.length },
    { id: "notifications", label: "Notificări", count: (service) => service.geap.notifications.length },
    { id: "settings", label: "Setări" },
    { id: "events", label: "Jurnal de evenimente", count: (service) => service.geap.events.length }
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
      denumire: { label: "Denumire", width: 260, fill: true, sortable: true },
      institutie: { label: "Autoritate", width: 240, sortable: true },
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
     the redirect from a service's Plăți și tarife tab; the editor comes later. */
  const tariffRow = (tariff) => ({
    id: tariff.id,
    cod: tariff.code,
    sursa: tariff.source || "GEAP",
    denumire: tariff.name,
    valoare: `${tariff.amount} ${tariff.currency}`,
    domeniu: tariff.scope === "global" ? "Global" : (getServiceByCode(tariff.scope)?.title || tariff.scope),
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
        return `<span class="e-permits-passport__name" title="${escapeHtml(row.denumire)}">${escapeHtml(row.denumire)}</span>`;
      case "statut":
        return renderTag(row.statut, TARIFF_STATUS_TONES[row.statut] || "neutral");
      case "actualizat":
        return renderDateTime(row.actualizat, row.actualizatDe);
      case "actiuni":
        return `
          <span class="e-permits-workplace__row-actions">
            <button class="e-permits-workplace__icon-action" type="button" data-tariff-edit="${escapeHtml(row.id)}" aria-label="Editează tariful ${escapeHtml(row.denumire)}" title="Editează">
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
        return `<span class="e-permits-passport__name" title="${escapeHtml(row.denumire)}">${escapeHtml(row.denumire)}</span>`;
      /* abbreviation over full institution name (as in RAP) */
      case "institutie":
        return `
          <span class="e-permits-workplace__user-name-stack e-permits-workplace__service-stack">
            <span title="${escapeHtml(row.autoritateCod || row.institutie)}">${escapeHtml(row.autoritateCod || row.institutie)}</span>
            <span title="${escapeHtml(row.institutie)}">${escapeHtml(row.institutie)}</span>
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
              <button class="e-permits-workplace__icon-action" type="button" data-service-row-sync="${escapeHtml(row.cod)}" aria-label="Sincronizare din RSSP: ${escapeHtml(row.denumire)}" title="Sincronizare din RSSP">
                <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-rotate-arrow"></use></svg>
              </button>
            ` : ""}
            <button class="e-permits-workplace__icon-action" type="button" data-service-row-open="${escapeHtml(row.cod)}" aria-label="Actualizare configurație: ${escapeHtml(row.denumire)}" title="Actualizare configurație">
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
    shell.classList.remove("is-user-profile-open", "is-dosar-profile-open", "is-role-profile-open", "is-users-registry", "is-service-profile-open");

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

    const db = kind === "services" ? servicesDb : kind === "tariffs" ? buildTariffsDb() : authoritiesDb;
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

  const renderPassportEmpty = (title, message, actionHtml = "") => `
    <section class="e-permits-dosar-profil__section">
      <div class="e-permits-dosar-profil__section-heading">
        <h2 class="e-permits-dosar-profil__section-title">${escapeHtml(title)}</h2>
      </div>
      <div class="e-permits-dosar-profil__card e-permits-passport__empty">
        <p>${escapeHtml(message)}</p>
        ${actionHtml}
      </div>
    </section>
  `;

  const yesNo = (value) => (value
    ? `<span class="status-tag status-tag--success"><svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-checkmark-small"></use></svg>Da</span>`
    : "Nu");

  const valueTags = (items) => (items?.length
    ? `<span class="e-permits-passport__tag-list">${items.map((item) => `<span class="status-tag status-tag--neutral is-subtle">${escapeHtml(item)}</span>`).join("")}</span>`
    : '<span class="e-permits-workplace__dash">—</span>');

  const requiredTag = `<span class="status-tag status-tag--neutral is-subtle"><svg class="icon small e-permits-dosar-profil__required-icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-asterisk"></use></svg>Obligatoriu</span>`;

  const renderRowAction = (label, attrs) =>
    `<button class="btn btn-text-primary btn-sm e-permits-passport__row-action" type="button" ${attrs}>${escapeHtml(label)}</button>`;

  const renderServiceGeneral = (service) => {
    const rssp = service.rssp;
    const authority = getAuthorityById(service.authorityId);

    return `
      <div class="message message--subtle banner--info e-permits-passport__notice">
        <span class="banner__icon"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-info-filled"></use></svg></span>
        <div class="banner__content">
          <p class="banner__text">Secțiunile marcate <strong>RSSP</strong> sunt preluate din Registrul de Stat al Serviciilor Publice și nu se editează în GEAP — se actualizează doar prin resincronizare.</p>
        </div>
      </div>
      ${renderPassportSection("Identificare", [
        ["Cod serviciu RSSP", renderProfileCopyCode(service.code, `Copiază ${service.code}`)],
        ["Denumirea serviciului", escapeHtml(service.title)],
        ["Tipul", rssp.isPermissiveAct ? "Act permisiv" : "Serviciu public"],
        ["Autoritatea prestatoare", escapeHtml(authority?.name || "—")],
        ["IDNO autoritate", authority ? renderProfileCopyCode(authority.idno, `Copiază IDNO ${authority.idno}`) : "—"],
        ["Statut", renderTag(service.status, SERVICE_STATUS_TONES[service.status] || "neutral")],
        ["Ultima sincronizare", renderDateTime(service.lastSync, service.syncedBy || "")]
      ], "RSSP")}
      ${renderPassportSection("Descriere și eligibilitate", [
        ["Descriere", escapeHtml(rssp.objective || "—")],
        ["Tipul solicitantului", valueTags(rssp.applicantTypes)],
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
      ${rssp.documents.length ? renderPassportSection("Documente însoțitoare", rssp.documents.map((doc) => [
        doc.title, doc.required ? requiredTag : "Opțional"
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
        <button class="e-permits-stack__menu-trigger" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="${menuId}" aria-label="Mai multe acțiuni: ${escapeHtml(label)}" data-tooltip-label="Mai multe acțiuni" data-stack-menu-trigger>
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
    <li class="e-permits-stack__item">
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
          ${item.action ? `<button class="btn ${item.action.tone === "secondary" ? "btn-secondary" : "btn-neutral"} btn-sm e-permits-stack__action" type="button" ${item.action.attrs}>${escapeHtml(item.action.label)}</button>` : ""}
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

  const renderStackedList = (title, groups, options = {}) => {
    const total = groups.reduce((sum, group) => sum + group.items.length, 0);

    if (!total) {
      return renderPassportEmpty(title, options.empty || "Nu există înregistrări pentru această secțiune.");
    }

    return `
      <section class="e-permits-dosar-profil__section e-permits-stack-section">
        <div class="e-permits-dosar-profil__section-heading">
          <h2 class="e-permits-dosar-profil__section-title">${escapeHtml(title)}</h2>
          ${options.meta ? `<span class="e-permits-dosar-profil__section-meta">${escapeHtml(options.meta)}</span>` : ""}
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
    "Eșuat": { tone: "danger", icon: "circle-error-filled" }
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
        action: admin ? { label: "Configurează", attrs: `data-passport-configure-rt="${escapeHtml(rt.id)}"` } : null
      };
    });

    return renderStackedList("Tipuri solicitări", groupBy(items, (item) => (item.source === "RSSP" ? "Subservicii RSSP" : "Adăugate în GEAP"), ["Subservicii RSSP", "Adăugate în GEAP"]), {
      meta: `${configured} din ${types.length} configurate`,
      empty: "Serviciul nu are tipuri de solicitare. Ele se preiau din subserviciile RSSP la sincronizare."
    });
  };


  const renderServiceForms = (service) => {
    const admin = isCentralAdmin();
    const typeName = (id) => service.geap.requestTypes.find((rt) => rt.id === id)?.name || "Fără tip de solicitare";
    const items = service.geap.forms.map((form) => ({
      group: typeName(form.requestType),
      plainTitle: form.name,
      title: escapeHtml(form.name),
      badges: [renderTag(form.status === "Published" ? "Publicat" : "Schiță", form.status === "Published" ? "success" : "neutral")],
      meta: [renderTag(form.technical, "neutral"), `${form.fields} câmpuri`, escapeHtml(form.version), whoWhen("Editat", form.editedAt, form.editedBy)],
      action: admin ? { label: "Editează", attrs: "data-passport-open-builder" } : { label: "Previzualizează", attrs: "data-passport-open-builder" },
      menu: admin ? [{ label: "Previzualizează", icon: "eye-open", attrs: "data-passport-open-builder" }] : []
    }));

    return renderStackedList("Formulare electronice", groupBy(items, (item) => item.group, service.geap.requestTypes.map((rt) => rt.name)), {
      empty: "Nu există formulare. Adaugă primul formular pentru un tip de solicitare."
    });
  };

  const PAYMENT_ACTION_LABELS = { publish: "Publică", activate: "Activează", deactivate: "Dezactivează", delete: "Șterge" };

  /* the tables' export icon (tray + arrow), shared by every export button */
  const EXPORT_ICON = `<svg class="icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"> <path d="M2.06641 12V10C2.06641 9.66863 2.3353 9.39974 2.66667 9.39974C2.99804 9.39974 3.26693 9.66863 3.26693 10V12C3.26693 12.405 3.59499 12.7331 4 12.7331H12C12.405 12.7331 12.7331 12.405 12.7331 12V10C12.7331 9.66863 13.002 9.39974 13.3333 9.39974C13.6647 9.39974 13.9336 9.66863 13.9336 10V12C13.9336 13.0678 13.0678 13.9336 12 13.9336H4C2.93225 13.9336 2.06641 13.0678 2.06641 12ZM7.39974 2.66667C7.39974 2.3353 7.66863 2.06641 8 2.06641C8.33137 2.06641 8.60026 2.3353 8.60026 2.66667V8.21745L9.90885 6.90885C10.1432 6.67454 10.5235 6.67454 10.7578 6.90885C10.9921 7.14317 10.9921 7.5235 10.7578 7.75781L8.42448 10.0911C8.31196 10.2037 8.15913 10.2669 8 10.2669C7.84087 10.2669 7.68804 10.2037 7.57552 10.0911L5.24219 7.75781C5.00787 7.5235 5.00787 7.14317 5.24219 6.90885C5.4765 6.67454 5.85683 6.67454 6.09115 6.90885L7.39974 8.21745V2.66667Z" fill="currentColor"/> </svg>`;

  /* ---- Plăți și tarife: list (search, filters, export) + editor drawer ---- */
  const PAY_FILTERS = [
    ["all", "Toate", () => true],
    ["published", "Publicate", (pay) => pay.state === "Publicat" && pay.active],
    ["draft", "Schiță", (pay) => pay.state === "Schiță"],
    ["inactive", "Inactive", (pay) => pay.state === "Publicat" && !pay.active]
  ];
  const payListState = { query: "", filter: "all" };

  const getTariff = (id) => servicesStore?.tariffs?.find((tariff) => tariff.id === id) || null;
  const tariffLabel = (tariff) => tariff ? `${tariff.name} · ${tariff.amount} ${tariff.currency}` : "Tarif necunoscut";
  const requestTypeFlow = (service, requestTypeName) =>
    getFlowById(service.geap.requestTypes.find((rt) => rt.name === requestTypeName)?.flow);

  const payMatches = (service, pay) => {
    const filter = PAY_FILTERS.find(([key]) => key === payListState.filter)?.[2] || (() => true);
    const query = payListState.query.trim().toLocaleLowerCase("ro");
    const text = [pay.name, pay.requestType, pay.moment, pay.generation, ...pay.tariffs.map((item) => getTariff(item.id)?.name || "")]
      .join(" ").toLocaleLowerCase("ro");
    return filter(pay) && (!query || text.includes(query));
  };

  const renderPaymentList = (service) => {
    const admin = isCentralAdmin();
    const visible = service.geap.payments.filter((pay) => payMatches(service, pay));

    if (!visible.length) {
      return `<div class="e-permits-dosar-profil__card e-permits-passport__empty"><p>${service.geap.payments.length ? "Nicio plată nu corespunde filtrului." : "Nu există plăți configurate pentru acest serviciu."}</p></div>`;
    }

    const items = visible.map((pay) => {
      const actions = admin ? passport.paymentActions(pay) : [];
      const actionAttrs = (action) => `data-passport-payment="${escapeHtml(pay.id)}" data-passport-payment-action="${action}"`;
      /* Editează always; constructive actions (Publică, Activează) blue
         secondary; destructive ones (Dezactivează, Șterge) in the ⋮ menu */
      const primary = actions.find((action) => action === "publish" || action === "activate");
      const destructive = actions.filter((action) => action === "deactivate" || action === "delete");
      const branchMissing = !passport.momentAllowed(requestTypeFlow(service, pay.requestType), pay.moment);
      const tariffs = pay.tariffs.map((item) => `${escapeHtml(tariffLabel(getTariff(item.id)))}${pay.generation === "Manual" && item.removable ? " (eliminabil)" : ""}`);
      return {
        group: pay.requestType,
        plainTitle: pay.name,
        title: escapeHtml(pay.name),
        badges: [
          renderTag(pay.state, pay.state === "Publicat" ? "success" : "neutral"),
          ...(pay.state === "Publicat" ? [renderTag(pay.active ? "Activ" : "Inactiv", pay.active ? "brand" : "neutral")] : []),
          ...(!pay.tariffs.length && pay.generation === "Automat" ? [renderTag("Fără tarif", "warning")] : []),
          ...(branchMissing ? [renderTag("Fără ramificație în flux", "warning")] : [])
        ],
        meta: [
          escapeHtml(pay.moment),
          escapeHtml(pay.generation),
          `termen ${escapeHtml(String(pay.term))} zile`,
          ...(pay.recurring ? [`recurentă ${pay.recurring.frequency === "Interval" ? `la ${pay.recurring.months} luni` : "anual"}, notificare cu ${pay.recurring.noticeDays} zile înainte`] : []),
          `v${pay.version}`,
          whoWhen("Modificat", pay.modifiedAt, pay.modifiedBy)
        ],
        meta2: [
          tariffs.length ? tariffs.join(", ") : (pay.generation === "Automat" ? "Fără tarif" : "Tarifele se aleg la generarea notei"),
          ...(pay.exemptions.length ? [`Scutiri: ${escapeHtml(pay.exemptions.join(", "))}`] : [])
        ],
        actionsHtml: admin ? `
          <button class="e-permits-workplace__icon-action" type="button" data-pay-edit="${escapeHtml(pay.id)}" aria-label="Editează ${escapeHtml(pay.name)}" title="Editează">
            <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-edit"></use></svg>
          </button>
          ${primary ? `<button class="btn btn-secondary btn-sm e-permits-stack__action" type="button" ${actionAttrs(primary)}>${PAYMENT_ACTION_LABELS[primary]}</button>` : ""}
          ${renderStackMenu(destructive.map((action) => ({
            label: PAYMENT_ACTION_LABELS[action],
            icon: action === "delete" ? "delete" : "pause",
            attrs: actionAttrs(action),
            danger: true
          })), pay.name)}
        ` : ""
      };
    });

    const groups = groupBy(items, (item) => item.group, service.geap.requestTypes.map((rt) => rt.name));
    return `
      <div class="e-permits-stack">
        ${groups.map((group) => `
          <div class="e-permits-stack__group">
            <h3 class="e-permits-stack__group-label">${escapeHtml(group.label)}<span class="badge badge--lg badge--solid-light e-permits-stack__group-count">${group.items.length}</span></h3>
            <ul class="e-permits-stack__list" role="list">${group.items.map(renderStackItem).join("")}</ul>
          </div>
        `).join("")}
      </div>
    `;
  };

  const renderPayChips = (service) => PAY_FILTERS.map(([key, label, test]) => `
    <button type="button" class="chip${payListState.filter === key ? " is-selected" : ""}" aria-pressed="${payListState.filter === key ? "true" : "false"}" data-pay-filter="${key}">
      <span class="chip__label">${label}</span>
      <span class="badge badge--lg badge--solid-light" aria-hidden="true">${service.geap.payments.filter(test).length}</span>
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
        <h2 class="e-permits-dosar-profil__section-title">Plăți și tarife</h2>
        <!-- one toolbar: filters left; search, export (icon, as in the tables) and Adaugă plată right -->
        <div class="e-permits-pay__toolbar">
          <div class="e-permits-rt__chips" role="group" aria-label="Filtrează plățile" data-pay-chips>${renderPayChips(service)}</div>
          <div class="e-permits-pay__tools">
            <div class="e-permits-fo-input e-permits-fo-input--with-action e-permits-pay__search">
              <input type="text" placeholder="Caută plată sau tarif" aria-label="Caută plată, tarif sau moment" value="${escapeHtml(payListState.query)}" autocomplete="off" data-pay-search>
              <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-search"></use></svg>
            </div>
            <button class="e-permits-workplace__icon-action" type="button" aria-label="Exportă plățile" title="Exportă" data-pay-export>
              ${EXPORT_ICON}
            </button>
            ${admin ? `
              <span class="e-permits-workplace__tool-divider" aria-hidden="true"></span>
              <button class="btn btn-secondary btn-sm" type="button" data-pay-add>
                <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-large"></use></svg>
                <span>Adaugă plată</span>
              </button>
            ` : ""}
          </div>
        </div>
        <div data-pay-list>${renderPaymentList(service)}</div>
      </section>
    `;
  };


  const renderServiceSimpleTab = (service, tabId) => {
    const geap = service.geap;

    switch (tabId) {
      case "dependencies":
        return renderStackedList("Interdependențe", groupBy(geap.dependencies.map((dep) => ({
          group: dep.relation === "Precondiție" ? "Precondiții" : "Excluderi mutuale",
          plainTitle: dep.act,
          title: escapeHtml(dep.act),
          meta: [renderCopyCode(dep.code, `Copiază ${dep.code}`), escapeHtml(dep.note)],
          action: getServiceByCode(dep.code) ? { label: "Deschide pașaportul", attrs: `data-passport-open-service="${escapeHtml(dep.code)}"` } : null
        })), (item) => item.group, ["Precondiții", "Excluderi mutuale"]), { empty: "Serviciul nu are interdependențe cu alte acte permisive." });
      case "classifiers":
        return renderStackedList("Clasificatoare specifice", groupBy(geap.classifiers.map((item) => ({
          group: item.source === "MConnect" ? "Externe · sincronizate din MConnect" : "Specifice serviciului",
          plainTitle: item.name,
          title: escapeHtml(item.name),
          meta: [renderTag(item.code, "neutral"), `${item.values} valori`, `Actualizat ${escapeHtml(formatLongDate(item.updated))}`]
        })), (item) => item.group, ["Specifice serviciului", "Externe · sincronizate din MConnect"]), { empty: "Serviciul nu are clasificatoare specifice." });
      case "templates":
        return renderStackedList("Șabloane de tipar", [{ label: "", items: geap.templates.map((item) => ({
          plainTitle: item.name,
          title: escapeHtml(item.name),
          badges: [renderTag(item.version, "neutral")],
          meta: [escapeHtml(item.type), escapeHtml(item.format), `Actualizat ${escapeHtml(formatLongDate(item.updated))}`]
        })) }], { empty: "Nu există șabloane de tipar pentru acest serviciu." });
      case "notifications":
        return renderStackedList("Notificări", groupBy(geap.notifications.map((item) => ({
          group: item.recipient === "Solicitant" ? "Către solicitant" : `Către ${item.recipient.toLowerCase()}`,
          plainTitle: item.event,
          title: escapeHtml(item.event),
          badges: [renderTag(item.active ? "Activ" : "Inactiv", item.active ? "success" : "neutral")],
          meta: item.channel.split(" · ").map(escapeHtml)
        })), (item) => item.group, ["Către solicitant"]), {
          meta: "Conținutul notificărilor se administrează în modulul Notificări",
          empty: "Serviciul nu are notificări specifice."
        });
      case "settings":
        return geap.settings
          ? renderPassportSection("Setări adiționale", [
            ["Avize necesare", valueTags(geap.settings.avize)],
            ["Subdiviziuni de examinare", valueTags(geap.settings.subdivisions)],
            ["Suspendarea termenului de examinare", escapeHtml(geap.settings.suspension)],
            ["Distribuire automată a dosarelor", escapeHtml(geap.settings.autoDistribution)],
            ["Actorul care eliberează actul", escapeHtml(geap.settings.issuer)],
            ["Așteptarea plății", escapeHtml(geap.settings.paymentWait)]
          ])
          : renderPassportEmpty("Setări adiționale", "Setările adiționale nu au fost configurate încă.");
      case "events":
        return renderEventTimeline("Jurnal de evenimente", geap.events, { meta: "Jurnalizat prin MLog" });
      default:
        return "";
    }
  };

  const renderServiceTabBody = (service, tabId) => {
    switch (tabId) {
      case "general": return renderServiceGeneral(service);
      case "request-types": return renderServiceRequestTypes(service);
      case "forms": return renderServiceForms(service);
      case "payments": return renderServicePayments(service);
      case "tariffs": return renderServiceTariffsTab(service);
      default: return renderServiceSimpleTab(service, tabId);
    }
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
      /* one source: a button; RSSP + eAPL: the same button opens a menu of
         sources (the stack-menu component, back-office size) */
      actions: canSync ? ((service.syncSources || ["RSSP"]).length > 1 ? `
        <div class="e-permits-stack__menu-wrap">
          <button class="btn btn-neutral btn-sm" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="passport-sync-menu" data-stack-menu-trigger>
            <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-rotate-arrow"></use></svg>
            <span>Sincronizează</span>
            <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
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
      `) : "",
      caption: `Ultima sincronizare ${formatStamp(service.lastSync)}`
    });
    meta.innerHTML = renderPageHeaderMeta([
      ["ID", renderProfileCopyCode(service.code, `Copiază ${service.code}`)],
      ["Autoritate", escapeHtml(authority?.name || "—")],
      ["Versiune", escapeHtml(service.geap.version)],
      ["Statut", renderTag(service.status, SERVICE_STATUS_TONES[service.status] || "neutral")]
    ]);
    watchPageHeaderMeta(meta);
    tabs.innerHTML = SERVICE_PROFILE_TABS.map((tab) => {
      const active = tab.id === serviceProfileState.tabKey;
      const count = tab.count ? tab.count(service) : null;
      return `
        <button class="tab-button${active ? " active" : ""}" id="passport-tab-${tab.id}" type="button" role="tab" aria-selected="${active ? "true" : "false"}" aria-controls="passport-panel" tabindex="${active ? "0" : "-1"}" data-passport-tab="${tab.id}">
          ${tab.icon ? `<svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-${tab.icon}"></use></svg>` : ""}
          <span>${escapeHtml(tab.label)}</span>
          ${count ? renderPageHeaderTabCount(count, tab.id === "request-types" && service.geap.requestTypes.some((rt) => passport.requestTypeState(rt).tone === "warning") ? "warning" : null) : ""}
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
    serviceProfileState.tabKey = SERVICE_PROFILE_TABS.some((tab) => tab.id === tabKey) ? tabKey : "general";

    if (workplacePanel) {
      workplacePanel.hidden = true;
    }

    hideProfilePanels();
    permitsProfilePanel.hidden = false;
    shell.classList.add("is-service-profile-open");

    if (serviceProfileBackShell) {
      serviceProfileBackShell.hidden = false;
    }

    renderServiceProfile();
    history.replaceState(null, "", `#serviciu/${code}/${serviceProfileState.tabKey}`);
    permitsProfilePanel.scrollIntoView?.({ block: "start" });
  };

  const closeServiceProfile = () => {
    history.replaceState(null, "", window.location.pathname + window.location.search);
    showServiceRegistry("services");
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
              ["Tipul solicitantului", valueTags(summary.applicantTypes)],
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
    title.textContent = multiSource ? "Sincronizare serviciu" : "Sincronizare serviciu din RSSP";
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
          <span class="message message--inline message--error message--small">
            <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-error"></use></svg>
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
      code, phase: "form", error: "", fieldError: "", result: null, eaplResult: null, eaplError: "",
      sources, source: allowed.includes(source) ? source : "RSSP", steps: []
    });
    renderSyncModal();
    window.__modal?.open?.("#service-sync-modal");
    syncModal.querySelector("[data-service-sync-code]")?.focus();
  };

  const closeSyncModal = () => window.__modal?.close?.("#service-sync-modal");

  const logServiceEvents = (code, events) => {
    const service = getServiceByCode(code);

    if (service && events.length) {
      service.geap.events = [...events].reverse().concat(service.geap.events);
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
      `<option value=""${current === "" ? " selected" : ""}>Implicit · ${escapeHtml(fallback)}</option>`,
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
      return `<div class="e-permits-dosar-profil__card e-permits-passport__empty"><p>Nicio acțiune nu corespunde filtrului.</p></div>`;
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
    <a class="link link-primary link-sm" href="e-permits-acte-permisive.html?flow=back-office#flux/${encodeURIComponent(rtDraft.flow)}" target="_blank" rel="noopener">Vezi schema fluxului în Fluxuri de lucru</a>
  ` : "";

  const renderRtActionsSection = () => {
    if (!rtDraft.flow) {
      return `<p class="e-permits-fo-field__hint">Alege întâi fluxul de procesare — acțiunile lui apar aici.</p>`;
    }

    const rows = rtActionRows();

    return `
      <div class="e-permits-rt__toolbar">
        <div class="e-permits-rt__chips" role="group" aria-label="Filtrează acțiunile" data-rt-chips>${renderRtChips(rows)}</div>
        <div class="e-permits-fo-input e-permits-fo-input--with-action e-permits-rt__search">
          <input type="text" placeholder="Caută pas sau acțiune" aria-label="Caută pas sau acțiune" value="${escapeHtml(rtDraft.query)}" autocomplete="off" data-rt-search>
          <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-search"></use></svg>
        </div>
      </div>
      <div data-rt-list>${renderRtActionList()}</div>
    `;
  };

  const renderRtFooterSummary = () => {
    const flow = getFlowById(rtDraft.flow);
    const total = passport.flowActions(flow).length;
    const changed = flow ? passport.overrideCount(rtDraft, flow) : 0;
    rtDrawer.querySelector("[data-rt-summary]").textContent = flow
      ? `${total} acțiuni · ${changed} ${changed === 1 ? "modificată" : "modificate"}`
      : "";
  };

  const renderRtDrawer = () => {
    const service = getServiceByCode(rtDraft.serviceCode);
    const rt = service.geap.requestTypes.find((item) => item.id === rtDraft.rtId);
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
    rtDrawerBody.innerHTML = `
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">General</h3>
        <div class="e-permits-user-create__section-content">
          <div class="e-permits-user-create__grid">
            <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--6">
              <label for="rt-flow">Flux de procesare${requiredMark()}</label>
              ${renderFoSelectControl({ id: "rt-flow", attrs: 'data-rt-flow required', optionsHtml: flowOptions })}
              <p class="e-permits-fo-field__hint" data-rt-flow-link>${renderRtFlowLink()}</p>
              <span class="message message--inline message--error message--small" hidden data-rt-flow-error>
                <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-error"></use></svg>
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
              <span class="message message--inline message--error message--small" hidden data-rt-term-error>
                <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-error"></use></svg>
                <span>Introdu un număr de zile între 1 și 255.</span>
              </span>
              <p class="e-permits-fo-field__hint" data-rt-term-hint>${rsspTerm ? `Din RSSP: ${rsspTerm.value} ${escapeHtml(rsspTerm.unit)}` : "Tip de solicitare adăugat în GEAP — fără termen în RSSP."}</p>
            </div>
          </div>
        </div>
      </section>
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">Formulare pe acțiuni</h3>
        <div class="e-permits-user-create__section-content">
          <p class="e-permits-fo-field__hint">Formularul deschis de fiecare acțiune a fluxului. Implicit se folosește formularul definit în proces; schimbă-l doar unde tipul de solicitare cere altceva.</p>
          <div data-rt-actions>${renderRtActionsSection()}</div>
        </div>
      </section>
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

  const openRequestTypeDrawer = (rtId) => {
    const service = getServiceByCode(serviceProfileState.code);
    const rt = service?.geap.requestTypes.find((item) => item.id === rtId);

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
      rtDraft = null;
      rtReturnFocus?.focus?.();
    }, 120);
  };

  const saveRequestTypeDrawer = () => {
    const service = getServiceByCode(rtDraft.serviceCode);
    const rt = service.geap.requestTypes.find((item) => item.id === rtDraft.rtId);
    const flowButton = rtDrawerBody.querySelector("#rt-flow");
    const termInput = rtDrawerBody.querySelector("[data-rt-term]");
    const termValue = rtDraft.termValue.trim();
    const termOk = !termValue || (/^\d+$/.test(termValue) && Number(termValue) >= 1 && Number(termValue) <= 255);

    setFieldError(flowButton, rtDrawerBody.querySelector("[data-rt-flow-error]"), !rtDraft.flow);
    setFieldError(termInput, rtDrawerBody.querySelector("[data-rt-term-error]"), !termOk);
    rtDrawerBody.querySelector("[data-rt-term-hint]").hidden = !termOk;

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

    const changed = passport.overrideCount(rt, flow);
    logServiceEvents(service.code, [{
      at: localIsoNow(), user: currentUserName(), type: "Configurare tip solicitare", status: "Reușit",
      detail: `${rt.name}: ${flow.name} ${flow.version}, ${rt.form ? "cu formular" : "fără formular"}, ${changed} acțiuni modificate`
    }]);
    closeRequestTypeDrawer();
    renderServiceProfile();
    showShellToast(`Tipul de solicitare „${rt.name}” a fost salvat.`);
  };

  rtDrawer?.addEventListener("change", (event) => {
    const target = event.target;

    if (!rtDraft) {
      return;
    }

    if (target.matches("[data-rt-flow]")) {
      rtDraft.flow = target.value;
      rtDraft.filter = "all";
      rtDraft.collapsed = new Set();
      setFieldError(rtDrawerBody.querySelector("#rt-flow"), rtDrawerBody.querySelector("[data-rt-flow-error]"), false);
      rtDrawerBody.querySelector("[data-rt-actions]").innerHTML = renderRtActionsSection();
      rtDrawerBody.querySelector("[data-rt-flow-link]").innerHTML = renderRtFlowLink();
      renderRtFooterSummary();
    } else if (target.matches("[data-rt-form]")) {
      rtDraft.form = target.value;
    } else if (target.matches("[data-rt-term-unit]")) {
      rtDraft.termUnit = target.value;
    } else if (target.matches("[data-rt-action]")) {
      const row = rtActionRows().find(({ step, action }) => passport.actionKey(step, action) === target.dataset.rtAction);
      rtDraft.actions = passport.setActionForm(rtDraft.actions, row.step, row.action, target.value);
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
      closeRequestTypeDrawer();
    }
  });

  /* ---- payment editor (drawer) -------------------------------------------
     Draft-based: nothing is written until Salvează / Publică. Field rules come
     from GEAP.servicePassport.validatePayment; the moment list marks moments
     without a payment branch in the request type's flow as unavailable. */
  const payDrawer = document.querySelector("[data-pay-drawer]");
  const payDrawerBody = payDrawer?.querySelector("[data-pay-body]");
  const PAY_FREQUENCIES = [["Anual", "Anual"], ["Interval", "Interval configurabil (luni)"]];
  let payDraft = null;
  let payReturnFocus = null;

  const defaultPaymentTerm = (service) => {
    const match = String(service.geap.settings?.paymentWait || "").match(/\d+/);
    return match ? match[0] : "";
  };

  const payFieldError = (key) => payDraft.errors[key] ? `
    <span class="message message--inline message--error message--small">
      <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-error"></use></svg>
      <span>${escapeHtml(payDraft.errors[key])}</span>
    </span>
  ` : "";

  const renderPayTariffs = (service) => {
    const manual = payDraft.generation === "Manual";
    const chosen = payDraft.tariffs.map((item) => ({ ...item, tariff: getTariff(item.id) }));
    const catalogue = (servicesStore.tariffs || []).filter((tariff) => !payDraft.tariffs.some((item) => item.id === tariff.id));
    const options = `
      <option value="" selected disabled>Adaugă un tarif din clasificator</option>
      ${catalogue.map((tariff) => {
        const check = passport.tariffEligibility(tariff, service.code, payDraft.generation);
        return `<option value="${escapeHtml(tariff.id)}"${check.ok ? "" : " disabled"}>${escapeHtml(tariffLabel(tariff))}${tariff.scope === "global" ? " · global" : " · al serviciului"}${check.ok ? "" : ` — ${escapeHtml(check.reason)}`}</option>`;
      }).join("")}
    `;

    return `
      ${chosen.length ? `
        <div class="e-permits-stack">
          <ul class="e-permits-stack__list" role="list">
            ${chosen.map(({ id, removable, tariff }) => `
              <li class="e-permits-stack__item">
                <div class="e-permits-stack__main">
                  <div class="e-permits-stack__title-row">
                    <p class="e-permits-stack__title">${escapeHtml(tariff?.name || id)}</p>
                    ${tariff?.formula ? renderTag("Formulă", "neutral") : ""}
                  </div>
                  <div class="e-permits-stack__meta">
                    <span class="e-permits-stack__part">${escapeHtml(`${tariff?.amount ?? "—"} ${tariff?.currency || ""}`)}</span>
                    <span class="e-permits-stack__part">${tariff?.scope === "global" ? "Tarif global" : "Tarif al serviciului"}</span>
                  </div>
                </div>
                <div class="e-permits-stack__actions">
                  ${manual ? `
                    <label class="checkbox checkbox--medium">
                      <input class="checkbox-input" type="checkbox" data-pay-removable="${escapeHtml(id)}"${removable ? " checked" : ""}>
                      <span class="checkbox-custom" aria-hidden="true"></span>
                      <span class="checkbox-texts"><span class="checkbox-label">Eliminabil din notă</span></span>
                    </label>
                  ` : ""}
                  <button class="btn btn-neutral btn-sm e-permits-stack__action" type="button" data-pay-tariff-remove="${escapeHtml(id)}" aria-label="Elimină ${escapeHtml(tariff?.name || id)}">Elimină</button>
                </div>
              </li>
            `).join("")}
          </ul>
        </div>
      ` : ""}
      <div class="e-permits-fo-field e-permits-pay__add-tariff">
        ${renderFoSelectControl({ id: "pay-add-tariff", attrs: "data-pay-add-tariff", label: "Adaugă un tarif", optionsHtml: options })}
        ${payFieldError("tariffs")}
        <p class="e-permits-fo-field__hint">${payDraft.notice ? `${escapeHtml(payDraft.notice)} ` : ""}Doar tarife publicate și active, globale sau ale serviciului. ${manual
          ? "La plata manuală, bifează „Eliminabil din notă” pentru tarifele pe care specialistul le poate scoate din nota de plată."
          : "Plata automată are nevoie de cel puțin un tarif pentru a fi publicată."}</p>
      </div>
    `;
  };

  const renderPayDrawer = () => {
    const service = getServiceByCode(payDraft.serviceCode);
    const existing = service.geap.payments.find((pay) => pay.id === payDraft.id);
    const flow = requestTypeFlow(service, payDraft.requestType);
    const initiation = payDraft.moment === passport.PAYMENT_MOMENTS[0];
    const manual = payDraft.generation === "Manual";
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

    payDrawer.querySelector("[data-pay-title]").textContent = existing ? "Editează plata" : "Plată nouă";
    payDrawer.querySelector("[data-pay-subtitle]").textContent = existing
      ? `${existing.name} · ${existing.state} · v${existing.version}`
      : service.title;
    payDrawerBody.innerHTML = `
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">Denumire plată</h3>
        <div class="e-permits-user-create__section-content">
          <div class="e-permits-user-create__grid">
            ${input("pay-name-ro", "name", payDraft.name, { label: "Denumire (RO)", span: 12, placeholder: "ex. Servicii de examinare",
              hint: "Eticheta afișată pe nota de plată când plata are mai multe tarife componente." })}
            ${input("pay-name-ru", "nameRu", payDraft.nameRu, { label: "Denumire (RU)", span: 6 })}
            ${input("pay-name-en", "nameEn", payDraft.nameEn, { label: "Denumire (EN)", span: 6 })}
          </div>
        </div>
      </section>
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">Aplicare</h3>
        <div class="e-permits-user-create__section-content">
          <div class="e-permits-user-create__grid">
            <div class="e-permits-fo-field e-permits-user-create__field">
              <label for="pay-request-type">Tip solicitare${requiredMark()}</label>
              ${renderFoSelectControl({ id: "pay-request-type", attrs: "data-pay-request-type", optionsHtml: rtOptions })}
              ${payFieldError("requestType")}
            </div>
            <div class="e-permits-fo-field e-permits-user-create__field">
              <label for="pay-moment">Moment generare${requiredMark()}</label>
              ${renderFoSelectControl({ id: "pay-moment", attrs: "data-pay-moment", optionsHtml: momentOptions })}
              ${payFieldError("moment")}
              ${payDraft.errors.moment ? "" : `<p class="e-permits-fo-field__hint">${payDraft.requestType
                ? (flow ? `Momentele disponibile vin din ramificațiile de plată ale fluxului „${escapeHtml(flow.name)}”; inițierea solicitării e mereu disponibilă.` : "Tipul de solicitare nu are flux — doar inițierea solicitării e disponibilă.")
                : "Alege întâi tipul de solicitare."}</p>`}
            </div>
          </div>
          <div class="e-permits-fo-field">
            <label id="pay-generation-label">Tip generare${requiredMark()}</label>
            <!-- library segmented control, 14px (default) size — Figma 8715:73423 -->
            <div class="segmented-control" role="radiogroup" aria-labelledby="pay-generation-label">
              ${["Automat", "Manual"].map((value) => `
                <button class="segment-item${payDraft.generation === value ? " is-selected" : ""}" type="button" role="radio" aria-checked="${payDraft.generation === value ? "true" : "false"}" data-pay-generation="${value}"${initiation && value === "Manual" ? " disabled" : ""}>${value}</button>
              `).join("")}
            </div>
            ${payFieldError("generation")}
            <p class="e-permits-fo-field__hint">${initiation
              ? "La inițierea solicitării plata e întotdeauna automată."
              : manual ? "Specialistul generează nota în dosar și poate alege tarifele și scutirile." : "Nota se generează automat la momentul ales, cu tarifele de mai jos."}</p>
          </div>
        </div>
      </section>
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">Tarife</h3>
        <div class="e-permits-user-create__section-content" data-pay-tariffs>${renderPayTariffs(service)}</div>
      </section>
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">Termen de achitare</h3>
        <div class="e-permits-user-create__section-content">
          <div class="e-permits-user-create__grid">
            ${input("pay-term", "term", payDraft.term, { label: "Termen (zile)", required: true, numeric: true, span: 6,
              hint: `Precompletat din pașaport (Așteptarea plății: ${escapeHtml(service.geap.settings?.paymentWait || "—")}); nota de plată reține termenul plății.` })}
          </div>
        </div>
      </section>
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">Scutiri vizibile pe notă</h3>
        <div class="e-permits-user-create__section-content">
          ${manual ? `
            <div class="e-permits-pay__exemptions">
              ${(servicesStore.exemptionOptions || []).map((option, index) => `
                <label class="checkbox checkbox--medium">
                  <input class="checkbox-input" type="checkbox" value="${escapeHtml(option)}" data-pay-exemption${payDraft.exemptions.includes(option) ? " checked" : ""}>
                  <span class="checkbox-custom" aria-hidden="true"></span>
                  <span class="checkbox-texts"><span class="checkbox-label">${escapeHtml(option)}</span></span>
                </label>
              `).join("")}
            </div>
            ${payFieldError("exemptions")}
          ` : `<p class="e-permits-fo-field__hint">Disponibile doar pentru plata manuală.</p>`}
        </div>
      </section>
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">Recurență</h3>
        <div class="e-permits-user-create__section-content">
          <div class="switch">
            <label class="switch-wrapper">
              <input type="checkbox" class="switch-input" data-pay-recurring${payDraft.recurring ? " checked" : ""}>
              <span class="switch-track"><span class="switch-thumb"></span></span>
              <span class="switch-text">
                <span class="switch-label">Plată recurentă</span>
                <span class="switch-description">Generează periodic nota de plată pe actul permisiv emis, independent de momentul generării.</span>
              </span>
            </label>
          </div>
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
                hint: "Cu câte zile înaintea scadenței se trimite notificarea și se generează plata." })}
            </div>
          ` : ""}
        </div>
      </section>
    `;

    const published = existing?.state === "Publicat";
    payDrawer.querySelector("[data-pay-summary]").textContent = published
      ? `Salvarea creează v${existing.version + 1}; notele deja generate rămân neschimbate.`
      : existing ? `Schiță · v${existing.version}` : "Plată nouă · se salvează ca schiță sau se publică direct";
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

  const openPaymentDrawer = (paymentId = null) => {
    const service = getServiceByCode(serviceProfileState.code);
    const pay = paymentId ? service?.geap.payments.find((item) => item.id === paymentId) : null;

    if (!payDrawer || !service || (paymentId && !pay)) {
      return;
    }

    payDraft = {
      serviceCode: service.code,
      id: pay?.id || null,
      name: pay?.name || "",
      nameRu: pay?.nameRu || "",
      nameEn: pay?.nameEn || "",
      requestType: pay?.requestType || "",
      moment: pay?.moment || "",
      generation: pay?.generation || "Automat",
      tariffs: (pay?.tariffs || []).map((item) => ({ ...item })),
      term: pay ? String(pay.term) : defaultPaymentTerm(service),
      exemptions: [...(pay?.exemptions || [])],
      recurring: Boolean(pay?.recurring),
      frequency: pay?.recurring?.frequency || "",
      months: pay?.recurring?.months ? String(pay.recurring.months) : "",
      noticeDays: pay?.recurring?.noticeDays ? String(pay.recurring.noticeDays) : "",
      errors: {},
      notice: ""
    };
    payReturnFocus = document.activeElement;
    renderPayDrawer();
    payDrawer.hidden = false;
    document.body.classList.add("is-user-create-open");
    requestAnimationFrame(() => payDrawerBody.querySelector("#pay-name-ro")?.focus());
  };

  const closePaymentDrawer = () => {
    if (!payDrawer || payDrawer.hidden || payDrawer.classList.contains("is-closing")) {
      return;
    }

    closeFoSelect();
    payDrawer.classList.add("is-closing");
    window.setTimeout(() => {
      payDrawer.hidden = true;
      payDrawer.classList.remove("is-closing");
      document.body.classList.remove("is-user-create-open");
      payDraft = null;
      payReturnFocus?.focus?.();
    }, 120);
  };

  const paymentFromDraft = () => ({
    /* the name is optional (a label on multi-tariff notes); default one for the list */
    name: payDraft.name.trim() || [payDraft.requestType, payDraft.moment].filter(Boolean).join(" · ") || "Plată nouă",
    nameRu: payDraft.nameRu.trim(),
    nameEn: payDraft.nameEn.trim(),
    requestType: payDraft.requestType,
    moment: payDraft.moment,
    generation: payDraft.generation,
    tariffs: payDraft.tariffs.map((item) => ({ id: item.id, removable: payDraft.generation === "Manual" && item.removable })),
    term: payDraft.term,
    exemptions: payDraft.generation === "Manual" ? payDraft.exemptions : [],
    recurring: payDraft.recurring
      ? { frequency: payDraft.frequency, months: payDraft.frequency === "Interval" ? payDraft.months : null, noticeDays: payDraft.noticeDays }
      : null
  });

  const savePaymentDrawer = (mode) => {
    const service = getServiceByCode(payDraft.serviceCode);
    const existing = service.geap.payments.find((pay) => pay.id === payDraft.id) || null;
    const publish = mode === "publish" || (mode === "save" && existing?.state === "Publicat");
    const fields = paymentFromDraft();
    const errors = passport.validatePayment(fields, { flow: requestTypeFlow(service, fields.requestType), publish });

    if (Object.keys(errors).length) {
      payDraft.errors = errors;
      const first = { requestType: "#pay-request-type", moment: "#pay-moment", generation: "[data-pay-generation]", tariffs: "#pay-add-tariff", term: "#pay-term", exemptions: "[data-pay-exemption]", frequency: "#pay-frequency", noticeDays: "#pay-notice" }[Object.keys(errors)[0]];
      rerenderPayDrawer(first);
      return;
    }

    fields.term = Number(fields.term);
    if (fields.recurring) {
      fields.recurring.noticeDays = Number(fields.recurring.noticeDays);
      fields.recurring.months = fields.recurring.months ? Number(fields.recurring.months) : null;
    }

    const meta = { at: localIsoNow(), user: currentUserName(), publish };
    const next = passport.applyPaymentEdit(existing, fields, meta);
    let message;
    let type;

    if (!existing) {
      next.id = `pay-${Date.now().toString(36)}`;
      if (next.state === "Publicat") {
        next.active = !passport.activationConflict(service.geap.payments, { ...next, active: true });
      }
      service.geap.payments.push(next);
      type = next.state === "Publicat" ? "Publicare plată" : "Creare plată";
      message = next.state === "Publicat"
        ? (next.active ? `Plata „${next.name}” a fost publicată și activată.` : `Plata „${next.name}” a fost publicată inactivă: există deja o plată activă pentru același tip și moment.`)
        : `Plata „${next.name}” a fost salvată ca schiță.`;
    } else {
      const wasDraft = existing.state === "Schiță";
      Object.assign(existing, next);
      if (wasDraft && existing.state === "Publicat") {
        existing.active = !passport.activationConflict(service.geap.payments, { ...existing, active: true });
      }
      type = wasDraft && existing.state === "Publicat" ? "Publicare plată" : "Editare plată";
      message = existing.state === "Publicat" && !wasDraft
        ? `Plata „${existing.name}” a fost actualizată la v${existing.version}. Se aplică dosarelor inițiate de acum.`
        : existing.state === "Publicat" ? `Plata „${existing.name}” a fost publicată.` : `Schița „${existing.name}” a fost salvată.`;
    }

    const saved = existing || next;
    logServiceEvents(service.code, [{ at: meta.at, user: meta.user, type, status: "Reușit", detail: `${saved.name} v${saved.version}` }]);
    closePaymentDrawer();
    renderServiceProfile();
    showShellToast(message);
  };

  payDrawer?.addEventListener("input", (event) => {
    const field = event.target.closest("[data-pay-field]");

    if (!payDraft || !field) {
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

  payDrawer?.addEventListener("change", (event) => {
    const target = event.target;

    if (!payDraft) {
      return;
    }

    if (target.matches("[data-pay-request-type]")) {
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
    } else if (target.matches("[data-pay-add-tariff]")) {
      payDraft.tariffs.push({ id: target.value, removable: false });
      payDraft.notice = "";
      delete payDraft.errors.tariffs;
      rerenderPayDrawer("#pay-add-tariff");
    } else if (target.matches("[data-pay-removable]")) {
      const item = payDraft.tariffs.find((tariff) => tariff.id === target.dataset.payRemovable);
      if (item) item.removable = target.checked;
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

  /* switching to automatic drops what an automatic payment cannot have */
  const setPayGeneration = (value) => {
    payDraft.generation = value;
    if (value !== "Automat") {
      return;
    }

    const service = getServiceByCode(payDraft.serviceCode);
    const dropped = payDraft.tariffs.filter((item) => !passport.tariffEligibility(getTariff(item.id) || {}, service.code, "Automat").ok);
    payDraft.tariffs = payDraft.tariffs.filter((item) => !dropped.includes(item));
    const hadExemptions = payDraft.exemptions.length > 0;
    payDraft.exemptions = [];
    payDraft.notice = [
      dropped.length ? `Am scos ${dropped.map((item) => getTariff(item.id)?.name || item.id).join(", ")} — necesită plată manuală.` : "",
      hadExemptions ? "Scutirile au fost golite: plata automată nu are scutiri." : ""
    ].filter(Boolean).join(" ");
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

    const generation = event.target.closest("[data-pay-generation]");

    if (generation && !generation.disabled) {
      setPayGeneration(generation.dataset.payGeneration);
      delete payDraft.errors.generation;
      rerenderPayDrawer(`[data-pay-generation="${generation.dataset.payGeneration}"]`);
      return;
    }

    const remove = event.target.closest("[data-pay-tariff-remove]");

    if (remove) {
      payDraft.tariffs = payDraft.tariffs.filter((item) => item.id !== remove.dataset.payTariffRemove);
      payDraft.notice = "";
      rerenderPayDrawer("#pay-add-tariff");
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
    const rows = service.geap.payments.filter((pay) => payMatches(service, pay));
    const header = ["Denumire", "Tip solicitare", "Moment generare", "Tip generare", "Tarife", "Termen (zile)", "Scutiri", "Recurentă", "Versiune", "Stare", "Activ", "Modificat de", "Modificat la"];
    const cell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const lines = [header, ...rows.map((pay) => [
      pay.name, pay.requestType, pay.moment, pay.generation,
      pay.tariffs.map((item) => tariffLabel(getTariff(item.id))).join(", "),
      pay.term, pay.exemptions.join(", "),
      pay.recurring ? (pay.recurring.frequency === "Interval" ? `La ${pay.recurring.months} luni` : "Anual") : "Nu",
      `v${pay.version}`, pay.state, pay.active ? "Da" : "Nu", pay.modifiedBy, pay.modifiedAt
    ])].map((line) => line.map(cell).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + lines], { type: "text/csv;charset=utf-8" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: `plati-${service.code}.csv` });
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showShellToast(`${rows.length} ${rows.length === 1 ? "plată exportată" : "plăți exportate"}.`);
  };

  /* ---- Tarife (Feature «Gestionarea clasificatorului de tarife») ---------
     Global tariffs live in Administrare → Tarife; service tariffs in the
     passport's Tarife tab. Same model, same editor (drawer: Identitate ·
     Sumă și formulă · Ciclu de viață). Rules: GEAP.servicePassport. */
  const TARIFF_FILTERS = [
    ["all", "Toate", () => true],
    ["active", "Active", (t) => t.state === "Publicat" && t.active],
    ["draft", "Schiță", (t) => t.state !== "Publicat"],
    ["inactive", "Inactive", (t) => t.state === "Publicat" && !t.active]
  ];
  const tariffListState = { query: "", filter: "all" };
  const tariffStatus = (t) => (t.state === "Publicat" ? (t.active ? "Activ" : "Inactiv") : "Schiță");
  const tariffUsage = (tariff) => (servicesStore?.services || []).flatMap((service) =>
    service.geap.payments.filter((pay) => pay.tariffs.some((item) => item.id === tariff.id)).map((pay) => ({ service, pay })));
  const tariffAmountLabel = (t) => (t.formula ? `Formulă · ${escapeHtml(t.expression || "—")}` : `${escapeHtml(String(t.amount))} ${escapeHtml(t.currency)}`);
  const tariffValidity = (t) => `${t.validFrom ? formatLongDate(t.validFrom) : "—"}${t.validTo ? ` – ${formatLongDate(t.validTo)}` : " – nelimitat"}`;
  const serviceTariffList = (service) => (servicesStore?.tariffs || []).filter((tariff) => tariff.scope === service.code);

  const tariffMatches = (t) => {
    const filter = TARIFF_FILTERS.find(([key]) => key === tariffListState.filter)?.[2] || (() => true);
    const query = tariffListState.query.trim().toLocaleLowerCase("ro");
    const text = [t.code, t.name, t.type, t.requestType, t.source].join(" ").toLocaleLowerCase("ro");
    return filter(t) && (!query || text.includes(query));
  };

  const renderTariffChips = (list) => TARIFF_FILTERS.map(([key, label, test]) => `
    <button type="button" class="chip${tariffListState.filter === key ? " is-selected" : ""}" aria-pressed="${tariffListState.filter === key ? "true" : "false"}" data-tariff-filter="${key}">
      <span class="chip__label">${label}</span>
      <span class="badge badge--lg badge--solid-light" aria-hidden="true">${list.filter(test).length}</span>
    </button>
  `).join("");

  const renderServiceTariffList = (service) => {
    const all = serviceTariffList(service);
    const visible = all.filter(tariffMatches);

    if (!visible.length) {
      return `<div class="e-permits-dosar-profil__card e-permits-passport__empty"><p>${all.length ? "Niciun tarif nu corespunde filtrului." : "Serviciul nu are tarife proprii. Adaugă un tarif sau sincronizează din RSSP."}</p></div>`;
    }

    const items = visible.map((t) => {
      const usage = tariffUsage(t).length;
      return {
        group: t.type,
        plainTitle: t.name,
        title: escapeHtml(t.name),
        badges: [
          renderTag(tariffStatus(t), TARIFF_STATUS_TONES[tariffStatus(t)] || "neutral"),
          ...(t.source !== "GEAP" ? [renderTag(t.source, "neutral")] : []),
          ...(t.formula ? [renderTag("Formulă", "neutral")] : [])
        ],
        meta: [escapeHtml(t.code), tariffAmountLabel(t), escapeHtml(t.requestType || "—"), escapeHtml(t.personType || "—"), `v${t.version || 1}`, whoWhen("Modificat", t.modifiedAt, t.modifiedBy)],
        meta2: [`Valabil ${tariffValidity(t)}`, usage ? `folosit în ${usage} ${usage === 1 ? "plată" : "plăți"}` : "nefolosit"],
        actionsHtml: isCentralAdmin() ? `
          <button class="e-permits-workplace__icon-action" type="button" data-tariff-edit="${escapeHtml(t.id)}" aria-label="Editează ${escapeHtml(t.name)}" title="Editează">
            <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-edit"></use></svg>
          </button>
        ` : ""
      };
    });
    const groups = groupBy(items, (item) => item.group, servicesStore.tariffTypes || []);
    return `
      <div class="e-permits-stack">
        ${groups.map((group) => `
          <div class="e-permits-stack__group">
            <h3 class="e-permits-stack__group-label">${escapeHtml(group.label)}<span class="badge badge--lg badge--solid-light e-permits-stack__group-count">${group.items.length}</span></h3>
            <ul class="e-permits-stack__list" role="list">${group.items.map(renderStackItem).join("")}</ul>
          </div>
        `).join("")}
      </div>
    `;
  };

  const renderServiceTariffsTab = (service) => {
    const admin = isCentralAdmin();
    const all = serviceTariffList(service);
    const eapl = (service.syncSources || []).includes("eAPL");

    return `
      <section class="e-permits-dosar-profil__section e-permits-stack-section">
        <h2 class="e-permits-dosar-profil__section-title">Tarife</h2>
        <div class="e-permits-pay__toolbar">
          <div class="e-permits-rt__chips" role="group" aria-label="Filtrează tarifele" data-tariff-chips>${renderTariffChips(all)}</div>
          <div class="e-permits-pay__tools">
            <div class="e-permits-fo-input e-permits-fo-input--with-action e-permits-pay__search">
              <input type="text" placeholder="Caută tarif" aria-label="Caută tarif după cod, denumire sau tip" value="${escapeHtml(tariffListState.query)}" autocomplete="off" data-tariff-search>
              <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-search"></use></svg>
            </div>
            <button class="e-permits-workplace__icon-action" type="button" aria-label="Exportă tarifele" data-tariff-export>
              ${EXPORT_ICON}
            </button>
            ${admin ? `
              ${eapl ? `
                <div class="e-permits-stack__menu-wrap">
                  <button class="e-permits-workplace__icon-action" type="button" aria-label="Sincronizează tarifele" aria-haspopup="menu" aria-expanded="false" aria-controls="tariff-sync-menu" data-stack-menu-trigger>
                    <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-rotate-arrow"></use></svg>
                  </button>
                  <ul class="e-permits-fo-intent-menu e-permits-stack__menu" id="tariff-sync-menu" role="menu" aria-label="Sursa tarifelor" hidden data-stack-menu>
                    ${[["RSSP", "Din RSSP"], ["eAPL", "Din eAPL"]].map(([source, label]) => `
                      <li role="none"><button class="e-permits-fo-intent-menu__item" type="button" role="menuitem" data-tariff-sync="${source}">
                        <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-rotate-arrow"></use></svg><span>${label}</span>
                      </button></li>
                    `).join("")}
                  </ul>
                </div>
              ` : `
                <button class="e-permits-workplace__icon-action" type="button" aria-label="Sincronizează tarifele din RSSP" data-tariff-sync="RSSP">
                  <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-rotate-arrow"></use></svg>
                </button>
              `}
              <span class="e-permits-workplace__tool-divider" aria-hidden="true"></span>
              <button class="btn btn-secondary btn-sm" type="button" data-tariff-add="${escapeHtml(service.code)}">
                <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-plus-large"></use></svg>
                <span>Adaugă tarif</span>
              </button>
            ` : ""}
          </div>
        </div>
        <div data-tariff-list>${renderServiceTariffList(service)}</div>
        ${admin ? `<p class="e-permits-fo-field__hint e-permits-tariff__global-link">Tarifele globale (valabile pentru orice serviciu) se gestionează în <button class="btn btn-text-primary btn-sm" type="button" data-tariff-goto="">Administrare → Tarife</button>.</p>` : ""}
      </section>
    `;
  };

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
    showShellToast(`${result.created} create, ${result.updated} actualizate, ${result.unchanged} neschimbate.`, "success", `Tarife sincronizate din ${source}`);
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
    exportCsv(filename, ["Cod", "Denumire", "Tip", "Sumă", "Valută", "Formulă", "Tip solicitare", "Tip persoană", "Domeniu", "Sursă", "Stare", "Activ", "Valabil de la", "Valabil până la", "Versiune", "Folosit în plăți"],
      list.map((t) => [t.code, t.name, t.type, t.amount, t.currency, t.formula ? t.expression : "Nu", t.requestType || "", t.personType || "", t.scope === "global" ? "Global" : t.scope, t.source, t.state, t.active ? "Da" : "Nu", t.validFrom || "", t.validTo || "", `v${t.version || 1}`, tariffUsage(t).length]));
    showShellToast(`${list.length} ${list.length === 1 ? "tarif exportat" : "tarife exportate"}.`);
  };

  /* ---- tariff editor (drawer) ---- */
  const tariffDrawer = document.querySelector("[data-tariff-drawer]");
  const tariffDrawerBody = tariffDrawer?.querySelector("[data-tariff-body]");
  let tariffDraft = null;
  let tariffReturnFocus = null;

  const tariffFieldError = (key) => tariffDraft.errors[key] ? `
    <span class="message message--inline message--error message--small">
      <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-error"></use></svg>
      <span>${escapeHtml(tariffDraft.errors[key])}</span>
    </span>
  ` : "";

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

    tariffDrawer.querySelector("[data-tariff-title]").textContent = existing ? "Editează tariful" : "Tarif nou";
    tariffDrawer.querySelector("[data-tariff-subtitle]").textContent = existing
      ? `${existing.code} · ${tariffStatus(existing)} · v${existing.version || 1}${existing.source !== "GEAP" ? ` · din ${existing.source}` : ""}`
      : (service ? `Tarif al serviciului „${service.title}”` : "Tarif global — disponibil pentru orice serviciu");

    tariffDrawerBody.innerHTML = `
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
          ` : `<p class="e-permits-fo-field__hint">Tarif global: nu se leagă de serviciu, tip solicitare, persoană sau subdiviziune.</p>`}
        </div>
      </section>
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">Sumă și formulă</h3>
        <div class="e-permits-user-create__section-content">
          <div class="e-permits-user-create__grid">
            ${input("tariff-amount", "amount", { label: d.formula ? "Sumă de bază" : "Sumă", required: true, span: 6, numeric: true, placeholder: "0.00" })}
            ${select("tariff-currency", "currency", { label: "Valută", required: true, span: 6, options: (servicesStore.currencies || ["MDL"]).map((c) => [c, c]) })}
          </div>
          <div class="switch">
            <label class="switch-wrapper">
              <input type="checkbox" class="switch-input" data-tariff-formula${d.formula ? " checked" : ""}>
              <span class="switch-track"><span class="switch-thumb"></span></span>
              <span class="switch-text">
                <span class="switch-label">Calcul prin formulă</span>
                <span class="switch-description">Suma se calculează din valorile dosarului, ex. suprafața × cota.</span>
              </span>
            </label>
          </div>
          ${d.formula ? `
            <div class="e-permits-fo-field">
              <label for="tariff-expression">Expresia formulei${requiredMark()}</label>
              <div class="e-permits-fo-textarea${d.errors.expression ? " is-error" : ""}">
                <textarea id="tariff-expression" rows="2" placeholder="{suprafata_m2} * 2" data-tariff-field="expression">${escapeHtml(d.expression)}</textarea>
              </div>
              ${tariffFieldError("expression")}
              ${d.errors.expression ? "" : `<p class="e-permits-fo-field__hint">Variabilele se scriu între acolade, ex. {suprafata_m2}; operații: + − × ÷ și paranteze.</p>`}
            </div>
            <div class="e-permits-user-create__grid">
              ${select("tariff-rounding", "rounding", { label: "Regulă de rotunjire", required: true, span: 6, options: (servicesStore.roundingRules || []).map((r) => [r, r]) })}
            </div>
            <div class="e-permits-tariff__test">
              <p class="e-permits-tariff__test-title">Verifică formula</p>
              <div class="e-permits-user-create__grid">
                ${variables.map((name) => `
                  <div class="e-permits-fo-field e-permits-user-create__field e-permits-user-create__field--6">
                    <label for="tariff-test-${name}">{${escapeHtml(name)}}</label>
                    <div class="e-permits-fo-input"><input id="tariff-test-${name}" type="text" inputmode="decimal" value="${escapeHtml(d.testValues[name] ?? "")}" placeholder="valoare de test" data-tariff-test="${escapeHtml(name)}"></div>
                  </div>
                `).join("") || '<p class="e-permits-fo-field__hint">Formula nu are variabile.</p>'}
              </div>
              <div class="e-permits-tariff__test-row">
                <button class="btn btn-neutral btn-sm" type="button" data-tariff-test-run>Calculează</button>
                <span class="e-permits-tariff__test-result" data-tariff-test-result aria-live="polite">${d.testResult || ""}</span>
              </div>
            </div>
            <label class="checkbox checkbox--medium">
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
      <section class="e-permits-user-create__section">
        <h3 class="e-permits-user-create__section-title">Ciclu de viață</h3>
        <div class="e-permits-user-create__section-content">
          <div class="e-permits-user-create__grid">
            ${datePicker("tariff-from", "validFrom", { label: "Valabil de la", required: true, span: 6 })}
            ${datePicker("tariff-to", "validTo", { label: "Valabil până la", span: 6, hint: "Gol = valabil pe termen nelimitat." })}
          </div>
          ${existing ? `
            <div class="e-permits-dosar-profil__card e-permits-passport__sync-summary">
              ${[
                ["Stare", `${renderTag(existing.state, existing.state === "Publicat" ? "success" : "neutral")} ${renderTag(existing.active ? "Activ" : "Inactiv", existing.active ? "brand" : "neutral")}`],
                ["Sursă", escapeHtml(existing.source)],
                ["Folosit de", usage.length ? usage.map(({ service: svc, pay }) => `${escapeHtml(pay.name)} <span class="e-permits-passport__muted">(${escapeHtml(svc.title)})</span>`).join("<br>") : "Nefolosit în nicio plată"],
                ["Istoric versiuni", (existing.versions || []).slice().reverse().map((v) => `<span class="e-permits-tariff__version"><strong>v${v.version}</strong> · ${escapeHtml(v.note || "")} <span class="e-permits-passport__muted">· ${formatStamp(v.at)} · ${escapeHtml(shortName(v.by || ""))}</span></span>`).join("")]
              ].map(([label, value]) => `
                <div class="e-permits-dosar-profil__row">
                  <span class="e-permits-dosar-profil__row-label">${escapeHtml(label)}</span>
                  <span class="e-permits-dosar-profil__row-value">${value}</span>
                </div>
              `).join("")}
            </div>
            <div class="e-permits-tariff__lifecycle">
              <button class="btn ${existing.active ? "btn-neutral" : "btn-secondary"} btn-sm" type="button" data-tariff-toggle-active>${existing.active ? "Dezactivează" : "Activează"}</button>
              ${usage.length ? "" : (d.confirmDelete ? `
                <span class="e-permits-tariff__confirm">Ștergi definitiv tariful?</span>
                <button class="btn btn-destructive btn-sm" type="button" data-tariff-delete-confirm>Da, șterge</button>
                <button class="btn btn-neutral btn-sm" type="button" data-tariff-delete-cancel>Nu</button>
              ` : `<button class="btn btn-text-destructive btn-sm" type="button" data-tariff-delete>Șterge tariful</button>`)}
            </div>
            <p class="e-permits-fo-field__hint">${existing.active ? "Un tarif inactiv nu mai apare la selecție în plăți și note de plată." : "Tariful nu apare la selecție până nu este activat."}${usage.length ? " Tariful e folosit, deci nu poate fi șters — doar dezactivat." : ""}</p>
          ` : ""}
        </div>
      </section>
    `;

    window.GEAPDatePicker?.init(tariffDrawerBody);

    const published = existing?.state === "Publicat";
    tariffDrawer.querySelector("[data-tariff-summary]").textContent = published
      ? "Modificarea creează o versiune nouă; notele de plată deja generate rămân neschimbate."
      : existing ? `Schiță · v${existing.version || 1}` : "Tarif nou · se salvează ca schiță sau se publică direct";
    tariffDrawer.querySelector("[data-tariff-buttons]").innerHTML = published ? `
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

  const openTariffDrawer = (tariffId = null, scope = "global") => {
    const existing = tariffId ? (servicesStore.tariffs || []).find((t) => t.id === tariffId) : null;
    if (!tariffDrawer || (tariffId && !existing)) return;
    const service = !existing && scope !== "global" ? getServiceByCode(scope) : null;
    const base = existing || {
      scope, source: "GEAP", name: "", nameRu: "", nameEn: "", type: "", legalBasis: "", amount: "", currency: "MDL",
      iban: "", requestType: service?.geap.requestTypes[0]?.name || null, personType: "Persoană juridică", subdivision: null,
      formula: false, expression: "", rounding: "2 zecimale", userVariables: false, validFrom: localIsoNow().slice(0, 10), validTo: null
    };
    tariffDraft = { ...base, id: existing?.id || null, amount: base.amount === "" ? "" : String(base.amount), validTo: base.validTo || "", errors: {}, testValues: {}, testResult: "", confirmDelete: false };
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
      amount: String(d.amount).trim().replace(",", "."), currency: d.currency, iban: d.iban || "",
      requestType: d.scope !== "global" ? d.requestType : null, personType: d.scope !== "global" ? d.personType : null,
      subdivision: d.scope !== "global" ? (d.subdivision || null) : null,
      formula: d.formula, expression: d.formula ? d.expression.trim() : "", rounding: d.rounding, userVariables: d.formula && d.userVariables,
      validFrom: d.validFrom, validTo: d.validTo || null
    };
    const errors = passport.validateTariff({ ...fields, amount: String(d.amount).trim() });

    if (Object.keys(errors).length) {
      d.errors = errors;
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
      tariffDraft[key] = field.value;
      if (tariffDraft.errors[key]) {
        delete tariffDraft.errors[key];
        field.closest(".e-permits-fo-input, .e-permits-fo-textarea")?.classList.remove("is-error");
        field.closest(".e-permits-fo-field")?.querySelector(".message--error")?.remove();
      }
    } else if (test) {
      tariffDraft.testValues[test.dataset.tariffTest] = test.value;
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
      /* new variables → new test inputs */
      rerenderTariffDrawer("#tariff-expression");
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

    if (event.target.closest("[data-tariff-test-run]")) {
      const result = passport.evaluateFormula(d.expression, d.testValues, d.rounding);
      d.testResult = result.ok ? `Rezultat: <strong>${result.value.toLocaleString("ro-MD")} ${escapeHtml(d.currency)}</strong>` : `<span class="e-permits-tariff__test-error">${escapeHtml(result.error)}</span>`;
      tariffDrawerBody.querySelector("[data-tariff-test-result]").innerHTML = d.testResult;
      return;
    }

    if (event.target.closest("[data-tariff-toggle-active]") && existing) {
      existing.active = !existing.active;
      existing.modifiedAt = localIsoNow();
      existing.modifiedBy = currentUserName();
      tariffEvent(existing, existing.active ? "Activare tarif" : "Dezactivare tarif", existing.code);
      showShellToast(`Tariful „${existing.name}” a fost ${existing.active ? "activat" : "dezactivat"}.`);
      rerenderTariffDrawer("[data-tariff-toggle-active]");
      refreshTariffViews();
      return;
    }

    if (event.target.closest("[data-tariff-delete]")) { d.confirmDelete = true; rerenderTariffDrawer("[data-tariff-delete-confirm]"); return; }
    if (event.target.closest("[data-tariff-delete-cancel]")) { d.confirmDelete = false; rerenderTariffDrawer("[data-tariff-delete]"); return; }
    if (event.target.closest("[data-tariff-delete-confirm]") && existing && !tariffUsage(existing).length) {
      servicesStore.tariffs = servicesStore.tariffs.filter((t) => t.id !== existing.id);
      tariffEvent(existing, "Ștergere tarif", `${existing.code} ${existing.name}`);
      closeTariffDrawer();
      refreshTariffViews();
      showShellToast(`Tariful „${existing.name}” a fost șters.`);
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

  const askConfirm = ({ title, text, confirmLabel, destructive }, onConfirm) => {
    if (!confirmModal) {
      onConfirm();
      return;
    }

    confirmModal.querySelector("[data-service-confirm-title]").textContent = title;
    confirmModal.querySelector("[data-service-confirm-text]").textContent = text;
    const button = confirmModal.querySelector("[data-service-confirm-ok]");
    button.textContent = confirmLabel;
    button.className = `btn ${destructive ? "btn-destructive" : "btn-primary"} btn-rounded`;
    pendingConfirm = onConfirm;
    window.__modal?.open?.("#service-confirm-modal");
  };

  confirmModal?.querySelector("[data-service-confirm-ok]")?.addEventListener("click", () => {
    window.__modal?.close?.("#service-confirm-modal");
    const run = pendingConfirm;
    pendingConfirm = null;
    run?.();
  });

  const runPaymentAction = (paymentId, action) => {
    const service = getServiceByCode(serviceProfileState.code);
    const payments = service?.geap.payments || [];
    const payment = payments.find((item) => item.id === paymentId);

    if (!payment) {
      return;
    }

    const commit = (type, detail, message) => {
      payment.modifiedAt = localIsoNow();
      payment.modifiedBy = currentUserName();
      logServiceEvents(service.code, [{ at: payment.modifiedAt, user: payment.modifiedBy, type, status: "Reușit", detail }]);
      renderServiceProfile();
      showShellToast(message);
    };

    if (action === "publish") {
      const check = passport.canPublish(payment);

      if (!check.ok) {
        showShellToast(check.message, "error");
        return;
      }

      payment.state = "Publicat";
      payment.active = !passport.activationConflict(payments, { ...payment, active: true });
      commit("Publicare plată", `${payment.name} v${payment.version}`, payment.active
        ? `Plata „${payment.name}” a fost publicată și activată.`
        : `Plata „${payment.name}” a fost publicată inactivă: există deja o plată activă pentru același tip și moment.`);
      return;
    }

    if (action === "activate") {
      const conflict = passport.activationConflict(payments, payment);

      if (conflict) {
        askConfirm({
          title: "Există deja o plată activă",
          text: `Pentru „${payment.requestType}” · „${payment.moment}” este activă plata „${conflict.name}”. Doar o plată poate fi activă pentru aceeași combinație. Dezactivează „${conflict.name}” și activează „${payment.name}”?`,
          confirmLabel: "Înlocuiește plata activă"
        }, () => {
          conflict.active = false;
          payment.active = true;
          commit("Activare plată", `${payment.name} (înlocuiește ${conflict.name})`, `Plata „${payment.name}” este acum activă.`);
        });
        return;
      }

      payment.active = true;
      commit("Activare plată", payment.name, `Plata „${payment.name}” este acum activă.`);
      return;
    }

    if (action === "deactivate") {
      askConfirm({
        title: "Dezactivezi plata?",
        text: `„${payment.name}” este folosită în ${payment.usage} ${payment.usage === 1 ? "dosar" : "dosare"}. Notele de plată deja generate nu se modifică; dosarele noi nu vor mai declanșa această plată.`,
        confirmLabel: "Dezactivează",
        destructive: true
      }, () => {
        payment.active = false;
        commit("Dezactivare plată", payment.name, `Plata „${payment.name}” a fost dezactivată.`);
      });
      return;
    }

    if (action === "delete" && passport.canDelete(payment)) {
      askConfirm({
        title: "Ștergi plata?",
        text: `„${payment.name}” va fi eliminată definitiv din pașaportul serviciului.`,
        confirmLabel: "Șterge",
        destructive: true
      }, () => {
        service.geap.payments = payments.filter((item) => item.id !== payment.id);
        commit("Ștergere plată", payment.name, `Plata „${payment.name}” a fost ștearsă.`);
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

  permitsProfilePanel?.addEventListener("click", (event) => {
    const openService = event.target.closest("[data-passport-open-service]");

    if (openService) {
      openServiceProfile(openService.dataset.passportOpenService);
      return;
    }

    const tabButton = event.target.closest("[data-passport-tab]");

    if (tabButton) {
      serviceProfileState.tabKey = tabButton.dataset.passportTab;
      renderServiceProfile();
      history.replaceState(null, "", `#serviciu/${serviceProfileState.code}/${serviceProfileState.tabKey}`);
      permitsProfilePanel.querySelector(`[data-passport-tab="${serviceProfileState.tabKey}"]`)?.focus();
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

    if (event.target.closest("[data-tariff-export]")) {
      const service = getServiceByCode(serviceProfileState.code);
      exportTariffs(serviceTariffList(service).filter(tariffMatches), `tarife-${service.code}.csv`);
      return;
    }

    const tariffFilter = event.target.closest("[data-tariff-filter]");

    if (tariffFilter) {
      const service = getServiceByCode(serviceProfileState.code);
      tariffListState.filter = tariffFilter.dataset.tariffFilter;
      permitsProfilePanel.querySelector("[data-tariff-chips]").innerHTML = renderTariffChips(serviceTariffList(service));
      permitsProfilePanel.querySelector("[data-tariff-list]").innerHTML = renderServiceTariffList(service);
      permitsProfilePanel.querySelector(`[data-tariff-filter="${tariffListState.filter}"]`)?.focus();
      return;
    }

    const tariffGoto = event.target.closest("[data-tariff-goto]");

    if (tariffGoto) {
      goToTariff(tariffGoto.dataset.tariffGoto);
      return;
    }

    if (event.target.closest("[data-pay-add]")) {
      openPaymentDrawer();
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

    const configure = event.target.closest("[data-passport-configure-rt]");

    if (configure) {
      openRequestTypeDrawer(configure.dataset.passportConfigureRt);
      return;
    }

    if (event.target.closest("[data-passport-open-builder]")) {
      window.__modal?.open?.("#form-builder-modal");
      return;
    }

    const paymentButton = event.target.closest("[data-passport-payment]");

    if (paymentButton) {
      runPaymentAction(paymentButton.dataset.passportPayment, paymentButton.dataset.passportPaymentAction);
    }
  });

  permitsProfilePanel?.addEventListener("input", (event) => {
    if (event.target.matches("[data-tariff-search]")) {
      tariffListState.query = event.target.value;
      permitsProfilePanel.querySelector("[data-tariff-list]").innerHTML = renderServiceTariffList(getServiceByCode(serviceProfileState.code));
      return;
    }

    if (event.target.matches("[data-pay-search]")) {
      payListState.query = event.target.value;
      permitsProfilePanel.querySelector("[data-pay-list]").innerHTML = renderPaymentList(getServiceByCode(serviceProfileState.code));
    }
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
    scroller.classList.toggle("has-overflow-start", scroller.scrollLeft > 1);
    scroller.classList.toggle("has-overflow-end", max - scroller.scrollLeft > 1);
  };

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
      workplaceDb = dossierDb;
      workplaceState.rows = dossierDb.runtimeRows;
    } catch (error) {
      console.warn(error);
      workplaceRows.innerHTML = `
        <tr>
          <td class="e-permits-workplace__empty" colspan="12">Nu am putut încărca baza locală de dosare.</td>
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

    const dosarHashMatch = window.location.hash.match(/^#dosar\/([^/]+)(?:\/([^/]+))?$/);
    const linkedRow = dosarHashMatch && getDosarById(dosarHashMatch[1]);

    if (linkedRow) {
      openDosarProfil(linkedRow, dosarHashMatch[2] || "general");
    }

    const serviceHashMatch = window.location.hash.match(/^#serviciu\/([^/]+)(?:\/([^/]+))?$/);

    if (serviceHashMatch && getServiceByCode(serviceHashMatch[1])) {
      activeRegistry = "services";
      servicesDb = buildServicesDb();
      workplaceDb = servicesDb;
      workplaceState.rows = servicesDb.runtimeRows;
      openServiceProfile(serviceHashMatch[1], serviceHashMatch[2] || "general");
    }

    const userHashMatch = window.location.hash.match(/^#utilizator\/([^/]+)(?:\/([^/]+))?$/);
    const linkedUser = userHashMatch && getUserById(userHashMatch[1]);

    if (linkedUser) {
      activeRegistry = "users";
      workplaceDb = usersDb;
      workplaceState.rows = usersDb.runtimeRows || [];
      openUserProfile(linkedUser, userHashMatch[2] || "general");
    }
  };

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
      if (message) message.textContent = "13 digits";
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

  if (userProfilePanel) {
    userProfilePanel.addEventListener("input", (event) => {
      const editor = event.target.closest("[data-user-profile-editor]");

      if (editor) {
        userProfileState.draftValue = editor.value;
        return;
      }

      const search = event.target.closest("[data-perm-search]");

      if (search) {
        userProfileState.permSearch = search.value;
        syncPermSearchMenu(userProfilePanelBody, getUserById(userProfileState.rowId), userProfileState);
      }
    });

    userProfilePanel.addEventListener("mousedown", (event) => {
      if (event.target.closest("[data-perm-toggle]")) {
        event.preventDefault();
      }
    });

    userProfilePanel.addEventListener("change", (event) => {
      const editor = event.target.closest("[data-user-profile-editor]");

      if (editor) {
        userProfileState.draftValue = editor.value;
        return;
      }

      const comboField = event.target.closest("[data-combo-field]");

      if (comboField && userProfileState.comboForm) {
        const key = comboField.dataset.comboField;

        if (key === "role") {
          userProfileState.comboForm.role = comboField.value;
        } else if (key === "authority") {
          userProfileState.comboForm.authorityId = comboField.value;
          userProfileState.comboForm.subdivision = "";
        } else if (key === "subdivision") {
          userProfileState.comboForm.subdivision = comboField.value;
        }

        renderUserProfilePanelBody(getUserById(userProfileState.rowId));
      }
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
        userProfileState.tabKey = tabButton.dataset.userProfileTab;
        userProfileState.editKey = null;
        userProfileState.draftValue = "";
        resetSupportingTabState();
        syncTabStripActive(userProfileTabs, "data-user-profile-tab", "userProfileTab", userProfileState.tabKey);
        renderUserProfilePanelBody(user);
        history.replaceState(null, "", `#utilizator/${user.id}/${userProfileState.tabKey}`);
        tabButton.focus();
        return;
      }

      if (handleRolesTabClick(event, user) || handlePermissionsTabClick(event, user)) {
        return;
      }

      const editButton = event.target.closest("[data-user-profile-edit]");

      if (editButton) {
        const field = getUserProfileField(editButton.dataset.userProfileEdit);

        if (!field?.editable) {
          return;
        }

        userProfileState.editKey = field.key;
        userProfileState.draftValue = field.type === "authority"
          ? String(user.autoritateId || "")
          : String(user[field.key] || "");
        renderUserProfilePanelBody(user);
        return;
      }

      if (event.target.closest("[data-user-profile-cancel]")) {
        userProfileState.editKey = null;
        userProfileState.draftValue = "";
        renderUserProfilePanelBody(user);
        return;
      }

      if (event.target.closest("[data-user-profile-save]")) {
        saveUserProfileField();
        return;
      }

      if (event.target.closest("[data-user-profile-delegate]")) {
        userProfileState.tabKey = "roles";
        userProfileState.editKey = null;
        resetSupportingTabState();
        userProfileState.comboForm = { role: "", authorityId: "", subdivision: "" };
        renderUserProfile(user);
        history.replaceState(null, "", `#utilizator/${user.id}/roles`);
        return;
      }

      if (event.target.closest("[data-user-profile-status-toggle]")) {
        user.status = user.status === "Activ" ? "Inactiv" : "Activ";
        user.ultimaActualizare = new Date().toISOString().slice(0, 10);
        persistUserProfileOverride(user);
        renderUserProfile(user);
        showShellToast(user.status === "Activ"
          ? "Utilizatorul a fost activat."
          : "Utilizatorul a fost inactivat.");
      }
    });

    userProfilePanel.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && userProfileState.editKey) {
        event.preventDefault();
        userProfileState.editKey = null;
        userProfileState.draftValue = "";
        renderUserProfilePanelBody(getUserById(userProfileState.rowId));
        return;
      }

      if (event.key === "Escape" && event.target.closest("[data-perm-search]") && userProfileState.permSearch) {
        event.preventDefault();
        userProfileState.permSearch = "";
        event.target.value = "";
        syncPermSearchMenu(userProfilePanelBody, getUserById(userProfileState.rowId), userProfileState);
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
      const option = event.target.closest("[data-shell-role-option]");

      if (!option || !option.dataset.assignmentId) {
        return;
      }

      applyRoleAssignment(option.dataset.assignmentId);
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
      Boolean(serviceProfileState.code && permitsProfilePanel && !permitsProfilePanel.hidden);

    if (activeAssignmentId && !deepLinkedProfileOpen) {
      applyRoleAssignment(activeAssignmentId, { persist: false, closeMenu: false });
    }
  })();
  syncExpandedState();
});
