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

    [...select.options].filter((option) => option.value !== "" && !option.hidden).forEach((option) => {
      const item = document.createElement("li");
      const selected = option.value === select.value;
      item.className = `e-permits-fo-select__option${selected ? " is-selected" : ""}`;
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = -1;
      item.dataset.value = option.value;
      item.textContent = option.textContent.trim();
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

  document.addEventListener("scroll", (event) => {
    if (openFoSelect && !openFoSelect.list.contains(event.target)) {
      closeFoSelect();
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
                  ${Number.isFinite(item.badge) ? `<span class="badge badge--solid-neutral badge--lg e-permits-shell__nav-badge"${item.badgeView ? ` data-workplace-badge="${escapeHtml(item.badgeView)}"` : ""}>${item.badge}</span>` : ""}
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
    if (workplaceDb?.kind === "services" || workplaceDb?.kind === "authorities") {
      return [row.cod, row.denumire, row.institutie, row.autoritateCod, row.statut, row.idno]
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
    if (["users", "services", "authorities"].includes(workplaceDb?.kind) && workplaceDb.columns[key]?.width) {
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
            <span class="e-permits-stack__group-count">${granted}/${total}</span>
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
      roleProfilePanelBody.innerHTML = `
        <section class="e-permits-user-profile__section">
          <h2>Jurnal de evenimente</h2>
          <div class="e-permits-user-profile__empty">
            <svg class="icon" width="24" height="24" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-info"></use></svg>
            <span>Nu există înregistrări pentru această secțiune.</span>
          </div>
        </section>
      `;
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
    { id: "dependencies", label: "Interdependențe", count: (service) => service.geap.dependencies.length },
    { id: "classifiers", label: "Clasificatoare specifice", count: (service) => service.geap.classifiers.length },
    { id: "templates", label: "Șabloane", count: (service) => service.geap.templates.length },
    { id: "notifications", label: "Notificări", count: (service) => service.geap.notifications.length },
    { id: "settings", label: "Setări" },
    { id: "events", label: "Jurnal evenimente", count: (service) => service.geap.events.length }
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

  const serviceRow = (service) => ({
    id: service.code,
    cod: service.code,
    denumire: service.title,
    institutie: getAuthorityById(service.authorityId)?.name || "—",
    autoritateCod: getAuthorityById(service.authorityId)?.code || "",
    statut: service.status,
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
    fieldCount: 5,
    columns: {
      denumire: { label: "Act permisiv", width: 360, fill: true, sortable: true },
      institutie: { label: "Instituția", width: 300, sortable: true },
      statut: { label: "Statut", width: 120, sortable: true },
      actualizat: { label: "Actualizat", width: 196, sortable: true },
      actiuni: { label: "Acțiuni", width: 104 }
    },
    views: {
      services: {
        title: servicesRegistryLabel,
        selectable: false,
        columns: ["denumire", "institutie", "statut", "actualizat", "actiuni"],
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
      /* two-line cells, the users-registry stack: name over copyable ID,
         abbreviation over full institution name (as in RAP) */
      case "denumire":
        return `
          <span class="e-permits-workplace__user-name-stack e-permits-workplace__service-stack">
            <span class="e-permits-workplace__service-name" title="${escapeHtml(row.denumire)}">${escapeHtml(row.denumire)}</span>
            <span class="e-permits-workplace__service-id">${renderCopyCode(row.cod, `Copiază ${row.cod}`)}</span>
          </span>
        `;
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
    } else {
      authoritiesDb = buildAuthoritiesDb();
    }

    const db = kind === "services" ? servicesDb : authoritiesDb;
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
        <button class="e-permits-stack__menu-trigger" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="${menuId}" aria-label="Mai multe acțiuni: ${escapeHtml(label)}" data-stack-menu-trigger>
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
              ${group.label ? `<h3 class="e-permits-stack__group-label">${escapeHtml(group.label)}<span class="e-permits-stack__group-count">${group.items.length}</span></h3>` : ""}
              <ul class="e-permits-stack__list" role="list">${group.items.map(renderStackItem).join("")}</ul>
            </div>
          `).join("")}
        </div>
      </section>
    `;
  };

  const whoWhen = (verb, at, by) => `${verb} ${escapeHtml(formatLongDate(at))}, ${escapeHtml(formatTime(at))}${by ? ` de ${escapeHtml(shortName(by))}` : ""}`;

  const renderServiceRequestTypes = (service) => {
    const admin = isCentralAdmin();
    const items = service.geap.requestTypes.map((rt) => {
      const state = passport.requestTypeState(rt);
      const flow = getFlowById(rt.flow);
      const forms = (rt.forms || []).map((id) => service.geap.forms.find((form) => form.id === id)?.name).filter(Boolean);
      return {
        source: rt.source,
        plainTitle: rt.name,
        title: escapeHtml(rt.name),
        badges: [renderTag(state.label, state.tone)],
        meta: [
          flow ? `Flux: ${escapeHtml(flow.name)} ${escapeHtml(flow.version)}` : "Fără flux de procesare",
          forms.length ? `${forms.length} ${forms.length === 1 ? "formular" : "formulare"}` : "Fără formulare"
        ],
        meta2: forms.length ? [escapeHtml(forms.join(", "))] : null,
        action: admin ? { label: "Configurează", attrs: `data-passport-configure-rt="${escapeHtml(rt.id)}"` } : null
      };
    });

    return renderStackedList("Tipuri solicitări", groupBy(items, (item) => (item.source === "RSSP" ? "Subservicii RSSP" : "Adăugate în GEAP"), ["Subservicii RSSP", "Adăugate în GEAP"]), {
      meta: "Fluxul și formularele se setează per tip de solicitare",
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

  const renderServicePayments = (service) => {
    const admin = isCentralAdmin();
    const items = service.geap.payments.map((pay) => {
      const actions = admin ? passport.paymentActions(pay) : [];
      const actionAttrs = (action) => `data-passport-payment="${escapeHtml(pay.id)}" data-passport-payment-action="${action}"`;
      /* constructive actions stay visible (blue secondary); destructive ones
         (deactivate, delete) live in the overflow menu */
      const primary = actions.find((action) => action === "publish" || action === "activate");
      const destructive = actions.filter((action) => action === "deactivate" || action === "delete");
      return {
        group: pay.requestType,
        plainTitle: pay.name,
        title: escapeHtml(pay.name),
        badges: [
          renderTag(pay.state, pay.state === "Publicat" ? "success" : "neutral"),
          ...(pay.state === "Publicat" ? [renderTag(pay.active ? "Activ" : "Inactiv", pay.active ? "brand" : "neutral")] : []),
          ...(!pay.tariffs.length && pay.generation === "Automat" ? [renderTag("Fără tarif", "warning")] : [])
        ],
        meta: [
          escapeHtml(pay.moment),
          escapeHtml(pay.generation),
          `termen ${pay.term} zile`,
          ...(pay.recurring ? [`recurentă ${escapeHtml(pay.recurring.frequency.toLowerCase())}, notificare cu ${pay.recurring.noticeDays} zile înainte`] : []),
          `v${pay.version}`,
          whoWhen("Modificat", pay.modifiedAt, pay.modifiedBy)
        ],
        meta2: [
          pay.tariffs.length ? escapeHtml(pay.tariffs.join(", ")) : (pay.generation === "Automat" ? "Fără tarif" : "Tarifele se aleg la generarea notei"),
          ...(pay.exemptions.length ? [`Scutiri: ${escapeHtml(pay.exemptions.join(", "))}`] : [])
        ],
        action: primary ? { label: PAYMENT_ACTION_LABELS[primary], attrs: actionAttrs(primary), tone: "secondary" } : null,
        menu: destructive.map((action) => ({
          label: PAYMENT_ACTION_LABELS[action],
          icon: action === "delete" ? "delete" : "pause",
          attrs: actionAttrs(action),
          danger: true
        }))
      };
    });

    return renderStackedList("Plăți și tarife", groupBy(items, (item) => item.group, service.geap.requestTypes.map((rt) => rt.name)), {
      meta: "Tarifele se administrează în clasificatorul tarifelor (Feature 94153)",
      empty: "Nu există plăți configurate pentru acest serviciu."
    });
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
        return renderStackedList("Jurnal evenimente", groupBy(geap.events.map((item) => ({
          group: formatLongDate(item.at),
          plainTitle: item.type,
          title: escapeHtml(item.type),
          badges: [renderTag(item.status, item.status === "Reușit" ? "success" : "danger")],
          meta: [escapeHtml(formatTime(item.at)), escapeHtml(item.user), escapeHtml(item.detail)]
        })), (item) => item.group), { meta: "Jurnalizat prin MLog", empty: "Nu există evenimente înregistrate." });
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
      actions: canSync ? `
        <button class="btn btn-neutral btn-sm" type="button" data-passport-resync>
          <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-rotate-arrow"></use></svg>
          <span>Sincronizează</span>
        </button>
      ` : "",
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
  const syncState = { code: "", phase: "form", error: "", fieldError: "", result: null };

  const renderSyncModal = () => {
    if (!syncModalBody || !syncModalFooter) {
      return;
    }

    const title = syncModal.querySelector("[data-service-sync-title]");

    if (syncState.phase === "done") {
      const result = syncState.result;
      const summary = result.summary;
      title.textContent = result.kind === "created" ? "Serviciu creat din RSSP" : "Serviciu actualizat din RSSP";
      syncModalBody.innerHTML = `
        <div class="message message--subtle banner--success e-permits-passport__sync-message" role="status">
          <span class="banner__icon"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-checkmark-filled"></use></svg></span>
          <div class="banner__content">
            <p class="banner__text">${result.kind === "created"
              ? "Pașaportul serviciului a fost creat. Datele RSSP sunt needitabile în GEAP."
              : "Datele RSSP ale serviciului au fost actualizate. Configurația GEAP a rămas neschimbată."}</p>
          </div>
        </div>
        <div class="e-permits-dosar-profil__card e-permits-passport__sync-summary">
          ${[
            ["Cod serviciu", escapeHtml(summary.code)],
            ["Denumire", escapeHtml(summary.title)],
            ["Autoritate", `${escapeHtml(result.authority.name)} ${renderTag(result.authorityCreated ? "Creată" : "Legată", result.authorityCreated ? "brand" : "neutral")}`],
            ["Tipul solicitantului", valueTags(summary.applicantTypes)],
            ["Subservicii importate", `${summary.subServices}${summary.ignoredSubServices ? ` <span class="e-permits-passport__muted">(${summary.ignoredSubServices} dezactivate, ignorate)</span>` : ""}`],
            ["Documente", String(summary.documents)],
            ["Indicatori", valueTags(Object.entries(summary.flags).filter(([, on]) => on).map(([name]) => name))]
          ].map(([label, value]) => `
            <div class="e-permits-dosar-profil__row">
              <span class="e-permits-dosar-profil__row-label">${escapeHtml(label)}</span>
              <span class="e-permits-dosar-profil__row-value">${value}</span>
            </div>
          `).join("")}
        </div>
      `;
      syncModalFooter.innerHTML = `
        <div class="modal-buttons">
          <button class="btn btn-secondary btn-sm" type="button" data-service-sync-close>Închide</button>
        </div>
      `;
      return;
    }

    const loading = syncState.phase === "loading";
    title.textContent = "Sincronizare serviciu din RSSP";
    syncModalBody.innerHTML = `
      <p class="e-permits-passport__lead">Introdu codul serviciului din Registrul de Stat al Serviciilor Publice. Dacă serviciul există deja în GEAP, datele RSSP se actualizează; altfel se creează un pașaport nou.</p>
      ${syncState.error ? `
        <div class="message message--subtle banner--error e-permits-passport__sync-message" role="alert">
          <span class="banner__icon"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-error-filled"></use></svg></span>
          <div class="banner__content"><p class="banner__text">${escapeHtml(syncState.error)}</p></div>
        </div>
      ` : ""}
      <div class="e-permits-fo-field">
        <label for="service-sync-code">Cod serviciu RSSP${requiredMark()}</label>
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
        ` : `<p class="e-permits-fo-field__hint" id="service-sync-hint">Coduri demo: 003000333 (serviciu nou, autoritate nouă) · 003000451 (serviciu nou, autoritate existentă) · 003000023 (existent) · 000000000 (RSSP indisponibil) · 003999998 (răspuns invalid)</p>`}
      </div>
    `;
    syncModalFooter.innerHTML = `
      <div class="modal-buttons">
        <button class="btn btn-secondary btn-sm" type="button" data-service-sync-close ${loading ? "disabled" : ""}>Închide</button>
        <button class="btn btn-primary btn-sm" type="button" data-service-sync-submit ${loading ? "disabled aria-busy=\"true\"" : ""}>
          ${loading ? '<span class="spinner spinner--small spinner--light-on-color" aria-hidden="true"></span><span>Se preiau datele…</span>' : "<span>Sincronizează serviciu</span>"}
        </button>
      </div>
    `;
  };

  const openSyncModal = (code = "") => {
    if (!syncModal || !isCentralAdmin()) {
      return;
    }

    Object.assign(syncState, { code, phase: "form", error: "", fieldError: "", result: null });
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

  const runSync = () => {
    const input = syncModal.querySelector("[data-service-sync-code]");
    syncState.code = input ? input.value : syncState.code;
    syncState.error = "";
    syncState.fieldError = "";

    if (!syncState.code.trim()) {
      /* US-111: validation only — RSSP is not called */
      syncState.fieldError = passport.MESSAGES.required;
      renderSyncModal();
      syncModal.querySelector("[data-service-sync-code]")?.focus();
      return;
    }

    syncState.phase = "loading";
    renderSyncModal();

    window.setTimeout(() => {
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
        syncState.phase = "form";
        syncState.error = result.message;
        renderSyncModal();
        return;
      }

      const index = servicesStore.services.findIndex((service) => service.code === result.service.code);

      if (index >= 0) {
        servicesStore.services[index] = result.service;
      } else {
        servicesStore.services.unshift(result.service);
      }

      if (result.authorityCreated) {
        servicesStore.authorities.push(result.authority);
      }

      logServiceEvents(result.service.code, result.events);
      syncState.phase = "done";
      syncState.result = result;
      renderSyncModal();
      refreshServiceRegistries();

      if (serviceProfileState.code === result.service.code) {
        renderServiceProfile();
      }

      showShellToast(`${result.service.code} · ${result.service.title}`, "success", result.kind === "created" ? "Serviciu creat din RSSP" : "Serviciu actualizat din RSSP");
    }, 900);
  };

  syncModal?.addEventListener("click", (event) => {
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

  /* ---- request type configuration --------------------------------------- */

  const rtModal = document.querySelector("#service-rt-modal");
  let rtEditingId = null;

  const openRequestTypeModal = (rtId) => {
    const service = getServiceByCode(serviceProfileState.code);
    const requestType = service?.geap.requestTypes.find((rt) => rt.id === rtId);

    if (!rtModal || !requestType) {
      return;
    }

    rtEditingId = rtId;
    rtModal.querySelectorAll(":scope > [data-service-rt-flow-list]").forEach((list) => list.remove());
    rtModal.querySelector("[data-service-rt-title]").textContent = requestType.name;
    rtModal.querySelector("[data-service-rt-body]").innerHTML = `
      <div class="e-permits-fo-field" data-service-rt-flow-field>
        <label id="service-rt-flow-label">Flux de procesare${requiredMark()}</label>
        <!-- the full-flow dropdown (.e-permits-fo-select): same states everywhere -->
        <div class="e-permits-fo-select" data-service-rt-flow-select data-value="${escapeHtml(requestType.flow || "")}">
          <button class="e-permits-fo-select__button" type="button" aria-haspopup="listbox" aria-expanded="false"
            aria-labelledby="service-rt-flow-label service-rt-flow-value" aria-describedby="service-rt-flow-error" data-service-rt-flow>
            <span class="e-permits-fo-select__value${requestType.flow ? "" : " e-permits-fo-select__value--placeholder"}" id="service-rt-flow-value">${escapeHtml(getFlowById(requestType.flow) ? `${getFlowById(requestType.flow).name} · ${getFlowById(requestType.flow).version}` : "Selectează fluxul de procesare")}</span>
            <svg class="icon" width="20" height="20" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-chevron-bottom"></use></svg>
          </button>
          <ul class="e-permits-fo-select__list" role="listbox" aria-labelledby="service-rt-flow-label" hidden data-service-rt-flow-list>
            ${servicesStore.flows.map((flow) => `
              <li class="e-permits-fo-select__option${flow.id === requestType.flow ? " is-selected" : ""}" role="option" tabindex="-1" aria-selected="${flow.id === requestType.flow ? "true" : "false"}" data-value="${escapeHtml(flow.id)}">${escapeHtml(flow.name)} · ${escapeHtml(flow.version)}</li>
            `).join("")}
          </ul>
        </div>
        <span class="message message--inline message--error message--small" id="service-rt-flow-error" hidden data-service-rt-flow-error>
          <svg class="icon small" aria-hidden="true"><use href="assets/icons/sprite.svg#icon-circle-error"></use></svg>
          <span>Selectează fluxul de procesare pentru acest tip de solicitare.</span>
        </span>
      </div>
      ${service.geap.forms.length ? `
        <!-- the stacked-list group (grey header + count), each form a checkable row -->
        <div class="e-permits-stack" role="group" aria-labelledby="service-rt-forms-label">
          <div class="e-permits-stack__group">
            <h3 class="e-permits-stack__group-label" id="service-rt-forms-label">Formulare utilizate<span class="e-permits-stack__group-count">${service.geap.forms.length}</span></h3>
            <ul class="e-permits-stack__list" role="list">
              ${service.geap.forms.map((form) => `
                <li class="e-permits-stack__item">
                  <label class="checkbox checkbox--medium e-permits-passport__rt-form">
                    <input type="checkbox" class="checkbox-input" value="${escapeHtml(form.id)}" data-service-rt-form${(requestType.forms || []).includes(form.id) ? " checked" : ""}>
                    <span class="checkbox-custom" aria-hidden="true"></span>
                    <span class="e-permits-stack__main">
                      <span class="e-permits-stack__title-row">
                        <span class="e-permits-stack__title">${escapeHtml(form.name)}</span>
                        ${renderTag(form.status === "Published" ? "Publicat" : "Schiță", form.status === "Published" ? "success" : "neutral")}
                      </span>
                      <span class="e-permits-stack__meta">
                        <span class="e-permits-stack__part">${renderTag(form.technical, "neutral")}</span>
                        <span class="e-permits-stack__part">${escapeHtml(form.version)}</span>
                      </span>
                    </span>
                  </label>
                </li>
              `).join("")}
            </ul>
          </div>
        </div>
      ` : `
        <div class="e-permits-fo-field">
          <label>Formulare utilizate</label>
          <p class="e-permits-fo-field__hint">Serviciul nu are încă formulare electronice. Adaugă-le în tab-ul Formulare.</p>
        </div>
      `}
    `;
    window.__modal?.open?.("#service-rt-modal");
  };

  /* the back-office field error state: red control, inline message */
  const setFieldError = (control, message, on) => {
    control.closest(".e-permits-fo-input, .e-permits-fo-select")?.classList.toggle("is-error", on);
    control.setAttribute("aria-invalid", on ? "true" : "false");

    if (message) {
      message.hidden = !on;
    }
  };

  /* "Flux de procesare" dropdown: click / Enter / Space open, ↑↓ move,
     Enter or click select, Esc or outside click close */
  const flowDropdown = () => rtModal?.querySelector("[data-service-rt-flow-select]");
  const flowList = () => rtModal?.querySelector("[data-service-rt-flow-list]");

  /* The modal clips (overflow: hidden) and is transformed, so an open list would
     be cut at its edge. While open, the list floats in the overlay — fixed to the
     trigger, flipping up when there is no room below — the full-flow
     positionFloatingSelectList pattern; closing puts it back. */
  const placeFlowList = (dropdown, list) =>
    placeFloatingList(dropdown.querySelector(".e-permits-fo-select__button"), list, dropdown);

  const setFlowOpen = (open) => {
    const dropdown = flowDropdown();
    const list = flowList();

    if (!dropdown || !list) {
      return;
    }

    const button = dropdown.querySelector(".e-permits-fo-select__button");
    dropdown.classList.toggle("is-open", open);
    button.setAttribute("aria-expanded", String(open));

    if (open) {
      rtModal.appendChild(list);
      placeFlowList(dropdown, list);
      list.hidden = false;
      (list.querySelector(".is-selected") || list.querySelector("[role='option']"))?.focus();
      return;
    }

    list.hidden = true;
    list.classList.remove("is-floating");
    list.removeAttribute("style");
    dropdown.classList.remove("is-open-up");
    dropdown.appendChild(list);
  };

  /* the trigger moves when the modal body scrolls or the window resizes */
  const closeFlowOnMove = (event) => {
    if (flowDropdown()?.classList.contains("is-open") && !flowList()?.contains(event.target)) {
      setFlowOpen(false);
    }
  };
  rtModal?.addEventListener("scroll", closeFlowOnMove, true);
  window.addEventListener("resize", closeFlowOnMove);

  const chooseFlow = (option) => {
    const dropdown = flowDropdown();
    const value = dropdown.querySelector(".e-permits-fo-select__value");
    dropdown.dataset.value = option.dataset.value;
    flowList().querySelectorAll("[role='option']").forEach((item) => {
      const selected = item === option;
      item.classList.toggle("is-selected", selected);
      item.setAttribute("aria-selected", String(selected));
    });
    value.textContent = option.textContent.trim();
    value.classList.remove("e-permits-fo-select__value--placeholder");
    setFieldError(dropdown.querySelector(".e-permits-fo-select__button"), rtModal.querySelector("[data-service-rt-flow-error]"), false);
    setFlowOpen(false);
    dropdown.querySelector(".e-permits-fo-select__button").focus();
  };

  rtModal?.addEventListener("click", (event) => {
    const dropdown = flowDropdown();

    if (!dropdown) {
      return;
    }

    if (event.target.closest("[data-service-rt-flow]")) {
      setFlowOpen(!dropdown.classList.contains("is-open"));
      return;
    }

    const option = event.target.closest("[data-service-rt-flow-list] [role='option']");

    if (option) {
      chooseFlow(option);
      return;
    }

    if (!event.target.closest("[data-service-rt-flow-select], [data-service-rt-flow-list]")) {
      setFlowOpen(false);
    }
  });

  rtModal?.addEventListener("keydown", (event) => {
    const dropdown = flowDropdown();

    if (!dropdown || !(dropdown.contains(event.target) || flowList()?.contains(event.target))) {
      return;
    }

    const options = [...flowList().querySelectorAll("[role='option']")];

    if (["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();

      if (!dropdown.classList.contains("is-open")) {
        setFlowOpen(true);
        return;
      }

      const index = options.indexOf(document.activeElement);
      options[event.key === "ArrowDown" ? (index + 1) % options.length : (index - 1 + options.length) % options.length]?.focus();
    } else if ((event.key === "Enter" || event.key === " ") && event.target.matches("[role='option']")) {
      event.preventDefault();
      chooseFlow(event.target);
    }
  }, true);

  /* modal.js closes the dialog on Esc from a document capture listener; catch
     Esc earlier (window capture) while the dropdown is open, so the first Esc
     closes only the dropdown */
  window.addEventListener("keydown", (event) => {
    const dropdown = flowDropdown();

    if (event.key !== "Escape" || !dropdown?.classList.contains("is-open") || !(dropdown.contains(event.target) || flowList()?.contains(event.target))) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    setFlowOpen(false);
    dropdown.querySelector(".e-permits-fo-select__button").focus();
  }, true);

  rtModal?.querySelector("[data-service-rt-save]")?.addEventListener("click", () => {
    const service = getServiceByCode(serviceProfileState.code);
    const requestType = service?.geap.requestTypes.find((rt) => rt.id === rtEditingId);

    if (!requestType) {
      return;
    }

    const flowSelect = rtModal.querySelector("[data-service-rt-flow-select]");
    const flowButton = rtModal.querySelector("[data-service-rt-flow]");

    if (!flowSelect.dataset.value) {
      /* required field: error state + message, nothing saved */
      setFieldError(flowButton, rtModal.querySelector("[data-service-rt-flow-error]"), true);
      flowButton.focus();
      return;
    }

    requestType.flow = flowSelect.dataset.value;
    requestType.forms = [...rtModal.querySelectorAll("[data-service-rt-form]:checked")].map((input) => input.value);
    logServiceEvents(service.code, [{
      at: localIsoNow(), user: currentUserName(), type: "Configurare tip solicitare", status: "Reușit",
      detail: `${requestType.name}: ${getFlowById(requestType.flow)?.name || "fără flux"}, ${requestType.forms.length} formulare`
    }]);
    window.__modal?.close?.("#service-rt-modal");
    renderServiceProfile();
    showShellToast(`Tipul de solicitare „${requestType.name}” a fost salvat.`);
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
    button.className = `btn ${destructive ? "btn-destructive" : "btn-primary"} btn-sm`;
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

    const configure = event.target.closest("[data-passport-configure-rt]");

    if (configure) {
      openRequestTypeModal(configure.dataset.passportConfigureRt);
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
