(() => {
  "use strict";

  const DATA_URL = "../data/rap-evo.json";
  const FILTER_KEYS = ["authority", "subdivision", "denumire", "status", "marking"];
  const emptyDates = () => ({
    issuedFrom: "",
    issuedTo: "",
    issuedSingle: false,
    expiresFrom: "",
    expiresTo: "",
    expiresSingle: false
  });
  const state = {
    config: null,
    records: [],
    filteredRecords: [],
    search: "",
    denumiriOptions: [],
    filters: {
      authority: new Set(),
      subdivision: new Set(),
      denumire: new Set(),
      status: new Set(),
      marking: new Set()
    },
    draft: {
      authority: new Set(),
      subdivision: new Set(),
      denumire: new Set(),
      status: new Set(),
      marking: new Set()
    },
    dates: emptyDates(),
    draftDates: emptyDates(),
    sectionSearch: { authority: "", subdivision: "", denumire: "" },
    collapsedSections: new Set(),
    page: 1,
    pageSize: 16,
    activeRecord: null,
    companyFilter: null
  };

  const elements = {
    title: document.querySelector("[data-rap-title]"),
    subtitle: document.querySelector("[data-rap-subtitle]"),
    search: document.querySelector("[data-rap-search]"),
    searchClear: document.querySelector("[data-rap-search-clear]"),
    tableBody: document.querySelector("[data-rap-table-body]"),
    tableScroller: document.querySelector("[data-rap-table-scroller]"),
    resultsSummary: document.querySelector("[data-rap-results-summary]"),
    pageSize: document.querySelector("[data-rap-page-size]"),
    pagination: document.querySelector("[data-rap-pagination]"),
    empty: document.querySelector("[data-rap-empty]"),
    triggers: [...document.querySelectorAll("[data-rap-filter-trigger]")],
    filterPanel: document.querySelector("[data-rap-filter-panel]"),
    filterPanelBody: document.querySelector(".rap-filter-panel__body"),
    applyFilter: document.querySelector("[data-rap-filter-apply]"),
    resetFilter: document.querySelector("[data-rap-filter-reset]"),
    resetAll: document.querySelector("[data-rap-filter-reset-all]"),
    filterCounts: [...document.querySelectorAll("[data-rap-filter-count]")],
    tooltip: document.querySelector("[data-rap-tooltip]"),
    toast: document.querySelector("[data-rap-toast]"),
    listView: document.querySelector("[data-rap-list-view]"),
    profileView: document.querySelector("[data-rap-profile-view]"),
    companySummary: document.querySelector("[data-rap-company-summary]")
  };

  let searchTimer;
  let filterPanelTimer;
  let filterPanelMode = null;

  const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const normalize = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("ro");

  const romanianMonths = {
    ianuarie: "01",
    februarie: "02",
    martie: "03",
    aprilie: "04",
    mai: "05",
    iunie: "06",
    iulie: "07",
    august: "08",
    septembrie: "09",
    octombrie: "10",
    noiembrie: "11",
    decembrie: "12"
  };

  const toIsoDate = (value) => {
    const cleaned = normalize(value).replace(/^emis\s+/, "").trim();
    const match = cleaned.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
    if (!match || !romanianMonths[match[2]]) {
      return "";
    }
    return `${match[3]}-${romanianMonths[match[2]]}-${match[1].padStart(2, "0")}`;
  };

  const matchesDateRange = (value, from, to, single) => {
    if (!from && !to) {
      return true;
    }
    const iso = toIsoDate(value);
    if (!iso) {
      return false;
    }
    if (single && from) {
      return iso === from;
    }
    return (!from || iso >= from) && (!to || iso <= to);
  };

  const expandRecords = (seedRecords, total) => {
    if (seedRecords.length >= total) {
      return seedRecords.slice(0, total);
    }

    return Array.from({ length: total }, (_, index) => {
      const seed = seedRecords[index % seedRecords.length];
      const cycle = Math.floor(index / seedRecords.length);
      if (cycle === 0) {
        return structuredClone(seed);
      }

      const record = structuredClone(seed);
      record.id = `${seed.id}-${cycle + 1}`;
      return record;
    });
  };

  const statusClass = (status) => ({
    "Valabil": "valid",
    "Suspendat": "suspended",
    "Expirat": "expired",
    "Retras": "withdrawn",
    "Anulat": "cancelled"
  }[status] || "expired");

  const icon = (name, className = "icon") => `
    <svg class="${className}" aria-hidden="true"><use href="../assets/icons/sprite.svg#icon-${name}"></use></svg>
  `;

  const isMaskedValue = (value) => /[•*]/u.test(String(value));

  const copyValue = (value) => `
    <button class="rap-profile__copy" type="button" data-rap-copy="${escapeHtml(value)}" aria-label="Copiază ${escapeHtml(value)}">
      <span>${escapeHtml(value)}</span>
      ${icon("copy")}
      <span class="rap-profile__copy-tooltip" aria-hidden="true">
        <span data-copy-default>Copiază</span>
        <span data-copy-success>${icon("checkmark-small")} Copiat</span>
      </span>
    </button>
  `;

  // Compact copy element for table cells (IDNO under Beneficiar, Nr. act) — reuses the copy tooltip style.
  const renderCopyCell = (value, variant) => `
    <button class="rap-copy rap-copy--${variant}" type="button" data-rap-copy="${escapeHtml(value)}" aria-label="Copiază ${escapeHtml(value)}">
      <span class="rap-copy__value">${escapeHtml(value)}</span>
      ${icon("copy", "icon rap-copy__icon")}
      <span class="rap-profile__copy-tooltip" aria-hidden="true">
        <span data-copy-default>Copiază</span>
        <span data-copy-success>${icon("checkmark-small")} Copiat</span>
      </span>
    </button>
  `;

  const renderIdentifierCell = (value) => isMaskedValue(value)
    ? `<span class="rap-copy rap-copy--id rap-copy--masked"><span class="rap-copy__value">${escapeHtml(value)}</span></span>`
    : renderCopyCell(value, "id");

  const handleCopyButton = async (copyButton) => {
    try {
      positionCopyTooltip(copyButton);
      await copyText(copyButton.dataset.rapCopy);
      copyButton.classList.add("is-copied");
      copyButton.setAttribute("aria-label", `Copiat ${copyButton.dataset.rapCopy}`);
      window.clearTimeout(copyButton._copyTimer);
      copyButton._copyTimer = window.setTimeout(() => {
        copyButton.classList.remove("is-copied");
        copyButton.setAttribute("aria-label", `Copiază ${copyButton.dataset.rapCopy}`);
      }, 1600);
    } catch (error) {
      console.error(error);
      showToast("Valoarea nu a putut fi copiată.");
    }
  };

  const normalizeProfile = (record) => {
    const defaults = state.config.profileDefaults || {};
    const profile = { ...defaults, ...(record.profile || {}) };
    const issuedDate = profile.issuedDate || record.permit.issuedAt.replace(/^emis\s+/i, "");
    return {
      ...profile,
      issuedDate,
      validFrom: profile.validFrom || issuedDate,
      validUntil: profile.validUntil || record.permit.validThrough,
      timeline: record.profile?.timeline || defaults.timeline || [],
      support: { ...(defaults.support || {}), ...(record.profile?.support || {}) }
    };
  };

  const renderProfileSummaryItem = (label, value, { copy = false } = {}) => `
    <div class="rap-profile__summary-item">
      <span class="rap-profile__summary-label">${escapeHtml(label)}</span>
      <span class="rap-profile__summary-value">${copy ? copyValue(value) : escapeHtml(value)}</span>
    </div>
  `;

  const renderProfileDetailRow = (label, value, { copy = false } = {}) => `
    <div class="rap-profile__detail-row">
      <dt>${escapeHtml(label)}</dt>
      <dd>${copy ? copyValue(value) : escapeHtml(value)}</dd>
    </div>
  `;

  const renderTimeline = (timeline) => timeline.map((item) => `
    <li class="rap-profile__timeline-item rap-profile__timeline-item--${escapeHtml(item.state)}">
      <span class="rap-profile__timeline-marker" aria-hidden="true">
        ${icon(item.state === "complete" ? "circle-checkmark-filled" : "time")}
      </span>
      <span class="rap-profile__timeline-content">
        <strong>${escapeHtml(item.title)}</strong>
        ${item.date ? `<time>${escapeHtml(item.date)}</time>` : ""}
        ${item.description ? `<span>${escapeHtml(item.description)}</span>` : ""}
      </span>
    </li>
  `).join("");

  const renderProfile = (record) => {
    const profile = normalizeProfile(record);
    const beneficiaryIcon = record.beneficiary.type === "person" ? "person" : "suitcase";
    const authorityWithOffice = [record.authority.name, profile.office].filter(Boolean).join(" — ");
    const details = [
      ["Denumire act permisiv", record.permit.name],
      ["Numărul actului permisiv", record.permit.number, true],
      ["Numărul dosarului electronic", record.permit.paperNumber, true],
      ["Seria și nr. documentului tipărit", profile.printedDocumentNumber, true],
      ["Autoritatea emitentă", record.authority.name],
      ["Oficiul", profile.office],
      ["Data eliberării", profile.issuedDate],
      ["Valabil din data", profile.validFrom],
      ["Data expirării", profile.validUntil]
    ];
    const companyPermitsAction = record.beneficiary.type === "company" ? `
      <span class="rap-profile__company-permits">
        <span class="rap-profile__company-permits-separator" aria-hidden="true">•</span>
        <button type="button" data-rap-company-permits="${escapeHtml(record.beneficiary.identifier)}">
          Toate actele companiei <span aria-hidden="true">→</span>
        </button>
      </span>
    ` : "";

    elements.profileView.innerHTML = `
      <div class="rap-profile__container">
        <nav class="rap-breadcrumbs rap-profile__breadcrumbs" aria-label="Breadcrumb">
          <a href="../index.html">Acasă</a>
          ${icon("chevron-right-small")}
          <a href="#">Resurse utile</a>
          ${icon("chevron-right-small")}
          <button type="button" data-rap-profile-back>Registrul actelor permisive</button>
          ${icon("chevron-right-small")}
        </nav>

        <section class="rap-profile__hero" aria-labelledby="rap-profile-title">
          <div class="rap-profile__title-row">
            <h1 id="rap-profile-title">${escapeHtml(record.permit.name)}</h1>
            <span class="rap-status rap-status--${statusClass(record.status)} rap-profile__status">${escapeHtml(record.status)}</span>
          </div>
          <div class="rap-profile__summary">
            ${renderProfileSummaryItem("Numărul actului", record.permit.number, { copy: true })}
            ${renderProfileSummaryItem("Autoritatea emitentă", authorityWithOffice)}
            ${renderProfileSummaryItem("Valabil din data", profile.validFrom)}
            ${renderProfileSummaryItem("Data expirării", profile.validUntil)}
          </div>
          <button class="btn btn-primary rap-profile__document-button" type="button" data-rap-view-document>
            ${icon("eye-open")}
            <span>Vizualizare actul</span>
          </button>
        </section>

        <section class="rap-profile__section" aria-labelledby="rap-beneficiary-title">
          <h2 id="rap-beneficiary-title">Beneficiar</h2>
          <div class="rap-profile__beneficiary-card">
            <span class="rap-profile__beneficiary-avatar" aria-hidden="true">${icon(beneficiaryIcon)}</span>
            <span class="rap-profile__beneficiary-copy">
              <strong>${escapeHtml(record.beneficiary.name)}</strong>
              <span class="rap-profile__beneficiary-meta">
                <span>${escapeHtml(record.beneficiary.identifierType)}</span>
                <code>${escapeHtml(record.beneficiary.identifier)}</code>
                ${companyPermitsAction}
              </span>
            </span>
          </div>
        </section>

        <section class="rap-profile__section" aria-labelledby="rap-details-title">
          <h2 id="rap-details-title">Detalii act</h2>
          <dl class="rap-profile__details">
            ${details.map(([label, value, copy]) => renderProfileDetailRow(label, value, { copy })).join("")}
          </dl>
        </section>

        <section class="rap-profile__section" aria-labelledby="rap-history-title">
          <h2 id="rap-history-title">Istoric complet</h2>
          <ol class="rap-profile__timeline">${renderTimeline(profile.timeline)}</ol>
        </section>

        <section class="rap-profile__section rap-profile__section--support" aria-labelledby="rap-support-title">
          <h2 id="rap-support-title">Ai nevoie de ajutor?</h2>
          <div class="rap-profile__support-card">
            <strong>${escapeHtml(profile.support.authority || "")}</strong>
            <div class="rap-profile__support-links">
              <a href="tel:${escapeHtml((profile.support.phone || "").replaceAll(" ", ""))}">${icon("phone")}<span>${escapeHtml(profile.support.phone || "")}</span></a>
              <a href="mailto:${escapeHtml(profile.support.email || "")}">${icon("envelope")}<span>${escapeHtml(profile.support.email || "")}</span></a>
            </div>
          </div>
        </section>
      </div>
    `;
  };

  const renderBeneficiary = (record) => {
    const icon = record.beneficiary.type === "person" ? "person" : "suitcase";
    return `
      <div class="rap-beneficiary">
        <span class="rap-beneficiary__avatar" aria-hidden="true">
          <svg class="icon"><use href="../assets/icons/sprite.svg#icon-${icon}"></use></svg>
        </span>
        <span class="rap-beneficiary__copy">
          <span class="rap-beneficiary__name rap-ellipsis" data-tooltip="${escapeHtml(record.beneficiary.name)}">${escapeHtml(record.beneficiary.name)}</span>
          ${renderIdentifierCell(record.beneficiary.identifier)}
        </span>
      </div>
    `;
  };

  const renderRow = (record) => `
    <tr tabindex="0" data-record-id="${escapeHtml(record.id)}" aria-label="Deschide ${escapeHtml(record.permit.name)} pentru ${escapeHtml(record.beneficiary.name)}">
      <td>${renderBeneficiary(record)}</td>
      <td>
        <span class="rap-ellipsis" data-tooltip="${escapeHtml(record.permit.name)}">${escapeHtml(record.permit.name)}</span>
      </td>
      <td>
        <span class="rap-cell-stack">
          <span class="rap-cell-stack__primary rap-ellipsis" data-tooltip="${escapeHtml(record.authority.code)}">${escapeHtml(record.authority.code)}</span>
          <span class="rap-cell-stack__secondary rap-ellipsis" data-tooltip="${escapeHtml(record.authority.name)}">${escapeHtml(record.authority.name)}</span>
        </span>
      </td>
      <td>
        <span class="rap-cell-stack">
          ${renderCopyCell(record.permit.number, "act")}
          <span class="rap-cell-stack__secondary rap-ellipsis" data-tooltip="${escapeHtml(record.permit.paperNumber)}">Dosar: ${escapeHtml(record.permit.paperNumber)}</span>
        </span>
      </td>
      <td>
        <span class="rap-cell-stack">
          <span class="rap-cell-stack__primary">${escapeHtml(record.permit.validThrough)}</span>
          <span class="rap-cell-stack__secondary">${escapeHtml(record.permit.issuedAt)}</span>
        </span>
      </td>
      <td><span class="rap-status rap-status--${statusClass(record.status)}">${escapeHtml(record.status)}</span></td>
      <td>
        <span class="rap-row-action" aria-hidden="true">
          <svg class="icon"><use href="../assets/icons/sprite.svg#icon-chevron-right"></use></svg>
        </span>
      </td>
    </tr>
  `;

  const totalActiveFilters = () => {
    const selections = FILTER_KEYS.reduce((total, key) => total + state.filters[key].size, 0);
    const dates = Object.entries(state.dates).reduce((total, [key, value]) => (
      key.endsWith("Single") ? total + Number(Boolean(value)) : total + Number(Boolean(value))
    ), 0);
    return selections + dates;
  };

  const renderCompanySummary = () => {
    const company = state.companyFilter;
    if (!company || normalize(state.search) !== normalize(company.identifier)) {
      elements.companySummary.hidden = true;
      elements.companySummary.innerHTML = "";
      return;
    }

    const companyRecords = state.config.records.filter((record) => (
      record.beneficiary.type === "company"
      && record.beneficiary.identifier === company.identifier
    ));
    const activeCount = companyRecords.filter((record) => record.status === "Valabil").length;
    const inactiveCount = companyRecords.length - activeCount;
    elements.companySummary.innerHTML = `
      <div class="rap-company-summary__inner">
        <span class="rap-company-summary__avatar" aria-hidden="true">${icon("suitcase")}</span>
        <span class="rap-company-summary__identity">
          <strong>${escapeHtml(company.name)}</strong>
          <span class="rap-company-summary__id">
            <span>${escapeHtml(company.identifierType)}</span>
            <code>${escapeHtml(company.identifier)}</code>
          </span>
        </span>
        <span class="rap-company-summary__metrics" aria-label="Statistica actelor companiei">
          <span class="rap-company-summary__metric">
            <strong>${companyRecords.length}</strong>
            <span>Total acte</span>
          </span>
          <span class="rap-company-summary__metric rap-company-summary__metric--active">
            <strong>${activeCount}</strong>
            <span>Active</span>
          </span>
          <span class="rap-company-summary__metric rap-company-summary__metric--inactive">
            <strong>${inactiveCount}</strong>
            <span>Inactive</span>
          </span>
        </span>
      </div>
    `;
    elements.companySummary.hidden = false;
  };

  const updateFilterCount = () => {
    const count = totalActiveFilters();
    elements.filterCounts.forEach((badge) => {
      badge.textContent = String(count);
      badge.hidden = count === 0;
    });
    elements.triggers.forEach((trigger) => trigger.classList.toggle("is-active", count > 0));
    elements.resetAll.hidden = count === 0;
  };

  const applyFilters = () => {
    const query = normalize(state.search);
    const { authority, subdivision, denumire, status, marking } = state.filters;
    const sourceRecordIds = state.companyFilter
      ? new Set(state.config.records.map((record) => record.id))
      : null;
    const selectedSubdivisionCodes = new Set(
      (state.config.filters.subdivisions || [])
        .filter((item) => subdivision.has(item.name))
        .flatMap((item) => item.authorityCodes || [])
    );
    state.filteredRecords = state.records.filter((record) => {
      const searchable = normalize([
        record.beneficiary.name,
        record.beneficiary.identifier,
        record.permit.name,
        record.permit.number,
        record.permit.paperNumber,
        record.authority.code,
        record.authority.name,
        record.status
      ].join(" "));
      const matchesSearch = !query || searchable.includes(query);
      const matchesCompanyRecord = !state.companyFilter
        || (record.beneficiary.identifier === state.companyFilter.identifier && sourceRecordIds.has(record.id));
      const matchesAuthority = authority.size === 0 || authority.has(record.authority.code);
      const matchesSubdivision = subdivision.size === 0 || selectedSubdivisionCodes.has(record.authority.code);
      const matchesDenumire = denumire.size === 0 || denumire.has(record.permit.name);
      const matchesStatus = status.size === 0 || status.has(record.status);
      const matchesMarking = marking.size === 0
        || (record.markings || []).some((item) => marking.has(item));
      const matchesIssuedDate = matchesDateRange(
        record.permit.issuedAt,
        state.dates.issuedFrom,
        state.dates.issuedTo,
        state.dates.issuedSingle
      );
      const matchesExpiryDate = matchesDateRange(
        record.permit.validThrough,
        state.dates.expiresFrom,
        state.dates.expiresTo,
        state.dates.expiresSingle
      );
      return matchesSearch
        && matchesCompanyRecord
        && matchesAuthority
        && matchesSubdivision
        && matchesDenumire
        && matchesStatus
        && matchesMarking
        && matchesIssuedDate
        && matchesExpiryDate;
    });

    const totalPages = Math.max(1, Math.ceil(state.filteredRecords.length / state.pageSize));
    state.page = Math.min(state.page, totalPages);
    render();
  };

  const renderTable = () => {
    const start = (state.page - 1) * state.pageSize;
    const rows = state.filteredRecords.slice(start, start + state.pageSize);
    elements.tableBody.innerHTML = rows.map(renderRow).join("");
    elements.empty.hidden = rows.length > 0;
    document.querySelector(".rap-register").hidden = rows.length === 0;

    if (rows.length === 0) {
      elements.resultsSummary.textContent = "Nu există rezultate";
    }

    if (rows.length > 0) {
      const first = start + 1;
      const last = Math.min(start + state.pageSize, state.filteredRecords.length);
      elements.resultsSummary.innerHTML = `Showing <strong>${first}</strong> to <strong>${last}</strong> of <strong>${state.filteredRecords.length}</strong> results`;
    }
  };

  const getPaginationWindowSize = () => {
    if (window.matchMedia("(max-width: 760px)").matches) {
      return 0;
    }
    if (window.matchMedia("(max-width: 1100px)").matches) {
      return 3;
    }
    return 5;
  };

  const getVisiblePages = (current, total, windowSize) => {
    if (windowSize === 0) {
      return [];
    }
    if (total <= windowSize) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }
    const offset = Math.floor(windowSize / 2);
    const start = Math.min(Math.max(current - offset, 1), total - windowSize + 1);
    return Array.from({ length: windowSize }, (_, index) => start + index);
  };

  const renderPagination = () => {
    const totalPages = Math.max(1, Math.ceil(state.filteredRecords.length / state.pageSize));
    const pages = getVisiblePages(state.page, totalPages, getPaginationWindowSize());
    elements.pagination.innerHTML = `
      <button class="rap-page-button rap-page-button--direction" type="button" data-page="${state.page - 1}" ${state.page === 1 ? "disabled" : ""}>
        <svg class="icon" aria-hidden="true"><use href="../assets/icons/sprite.svg#icon-chevron-left"></use></svg>
        <span>Previous</span>
      </button>
      ${pages.map((page) => `
        <button class="rap-page-button${page === state.page ? " is-active" : ""}" type="button" data-page="${page}" ${page === state.page ? 'aria-current="page"' : ""}>${page}</button>
      `).join("")}
      <button class="rap-page-button rap-page-button--direction" type="button" data-page="${state.page + 1}" ${state.page === totalPages ? "disabled" : ""}>
        <span>Next</span>
        <svg class="icon" aria-hidden="true"><use href="../assets/icons/sprite.svg#icon-chevron-right"></use></svg>
      </button>
    `;
  };

  const render = () => {
    renderCompanySummary();
    renderTable();
    renderPagination();
    updateFilterCount();
  };

  const sectionOptions = (key) => {
    if (key === "authority") {
      return state.config.filters.authorities.map((authority) => ({
        value: authority.code,
        label: `${authority.code} - ${authority.name}`
      }));
    }
    if (key === "subdivision") {
      return (state.config.filters.subdivisions || []).map((subdivision) => ({
        value: subdivision.name,
        label: subdivision.name
      }));
    }
    return state.denumiriOptions.map((name) => ({ value: name, label: name }));
  };

  const syncFilterListBoundary = (list) => {
    const isScrollable = list.scrollHeight > list.clientHeight + 1;
    list.classList.toggle("is-scrollable", isScrollable);
    list.classList.toggle("is-scrolled", isScrollable && list.scrollTop > 0);
  };

  const renderSectionList = (key) => {
    const list = elements.filterPanel.querySelector(`[data-rap-section-list="${key}"]`);
    if (!list) {
      return;
    }
    const query = normalize(state.sectionSearch[key]);
    const draft = state.draft[key];
    const options = sectionOptions(key).filter((option) => !query || normalize(option.label).includes(query));
    list.innerHTML = options.length
      ? options.map((option) => `
        <label class="rap-filter-option${draft.has(option.value) ? " is-checked" : ""}">
          <input type="checkbox" value="${escapeHtml(option.value)}" data-rap-option="${key}" ${draft.has(option.value) ? "checked" : ""}>
          <span class="rap-filter-option__box" aria-hidden="true">${icon("checkmark-small")}</span>
          <span class="rap-filter-option__label">${escapeHtml(option.label)}</span>
        </label>
      `).join("")
      : `<p class="rap-filter-option__empty">Niciun rezultat.</p>`;
    list.scrollTop = 0;
    window.requestAnimationFrame(() => syncFilterListBoundary(list));
  };

  const renderFilterChips = (key, values) => {
    const wrap = elements.filterPanel.querySelector(`[data-rap-section-chips="${key}"]`);
    if (!wrap) {
      return;
    }
    wrap.innerHTML = values.map((value) => {
      const active = state.draft[key].has(value);
      return `
        <button class="rap-filter-toggle${active ? " is-active" : ""}" type="button" data-rap-chip="${key}" data-value="${escapeHtml(value)}">
          ${active ? icon("circle-checkmark-filled") : ""}
          <span>${escapeHtml(value)}</span>
        </button>
      `;
    }).join("");
  };

  const sectionSelectionCount = (key) => key === "status"
    ? state.draft.status.size + state.draft.marking.size
    : state.draft[key].size;

  const renderSectionHeader = (key) => {
    const section = elements.filterPanel.querySelector(`[data-rap-filter-section="${key}"]`);
    if (!section) {
      return;
    }
    const collapsed = state.collapsedSections.has(key);
    const count = sectionSelectionCount(key);
    const countBadge = section.querySelector(`[data-rap-section-count="${key}"]`);
    const toggle = section.querySelector(`[data-rap-section-toggle="${key}"]`);
    const content = section.querySelector(`[data-rap-section-content="${key}"]`);
    const title = section.querySelector(".rap-filter-section__heading")?.textContent.trim() || "secțiunea";

    countBadge.hidden = count === 0;
    countBadge.textContent = `${count} ${count === 1 ? "selectat" : "selectate"}`;
    section.classList.toggle("is-collapsed", collapsed);
    content.hidden = collapsed;
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.setAttribute("aria-label", `${collapsed ? "Extinde" : "Restrânge"} ${title}`);
  };

  const renderSectionHeaders = () => {
    ["authority", "subdivision", "denumire", "status"].forEach(renderSectionHeader);
  };

  const syncDraftDateControls = () => {
    elements.filterPanel.querySelectorAll("[data-rap-date]").forEach((input) => {
      input.value = state.draftDates[input.dataset.rapDate] || "";
    });
    ["issued", "expires"].forEach((prefix) => {
      const checkbox = elements.filterPanel.querySelector(`[data-rap-date-single="${prefix}"]`);
      const toInput = elements.filterPanel.querySelector(`[data-rap-date="${prefix}To"]`);
      checkbox.checked = Boolean(state.draftDates[`${prefix}Single`]);
      toInput.disabled = checkbox.checked;
    });
  };

  const renderFilterPanel = () => {
    renderSectionList("authority");
    renderSectionList("subdivision");
    renderSectionList("denumire");
    renderFilterChips("status", state.config.filters.statuses);
    renderFilterChips("marking", state.config.filters.markings || []);
    renderSectionHeaders();
    syncDraftDateControls();
  };

  const placeFilterPanelInline = () => {
    document.querySelector(".rap-toolbar")?.after(elements.filterPanel);
  };

  const syncFilterTriggerState = (openMode = null) => {
    elements.triggers.forEach((trigger) => {
      trigger.setAttribute("aria-expanded", String(trigger.dataset.rapFilterTrigger === openMode));
    });
  };

  const configureFilterPresentation = (mode) => {
    const surface = elements.filterPanel.querySelector(".rap-filter-panel__surface");
    elements.filterPanel.classList.toggle("is-drawer", mode === "drawer");
    document.body.classList.toggle("rap-filter-drawer-open", mode === "drawer");

    if (mode === "drawer") {
      document.body.append(elements.filterPanel);
      surface.setAttribute("role", "dialog");
      surface.setAttribute("aria-modal", "true");
    } else {
      placeFilterPanelInline();
      surface.setAttribute("role", "region");
      surface.removeAttribute("aria-modal");
    }
  };

  const openFilterPanel = (mode = "inline") => {
    window.clearTimeout(filterPanelTimer);
    if (elements.filterPanel.classList.contains("is-open") && filterPanelMode !== mode) {
      elements.filterPanel.classList.remove("is-open");
    }
    filterPanelMode = mode;
    configureFilterPresentation(mode);
    FILTER_KEYS.forEach((key) => {
      state.draft[key] = new Set(state.filters[key]);
    });
    state.draftDates = { ...state.dates };
    state.sectionSearch = { authority: "", subdivision: "", denumire: "" };
    elements.filterPanel.querySelectorAll("[data-rap-section-search]").forEach((input) => { input.value = ""; });
    elements.filterPanel.hidden = false;
    syncFilterTriggerState(mode);
    renderFilterPanel();
    window.requestAnimationFrame(() => elements.filterPanel.classList.add("is-open"));
    if (mode === "drawer") {
      window.requestAnimationFrame(() => elements.filterPanel.querySelector(".rap-filter-panel__close")?.focus());
    }
  };

  const closeFilterPanel = ({ immediate = false, restoreFocus = true } = {}) => {
    window.clearTimeout(filterPanelTimer);
    const activeTrigger = elements.triggers.find((trigger) => trigger.dataset.rapFilterTrigger === filterPanelMode);
    elements.filterPanel.classList.remove("is-open");
    syncFilterTriggerState();
    const finishClose = () => {
      elements.filterPanel.hidden = true;
      elements.filterPanel.classList.remove("is-drawer");
      document.body.classList.remove("rap-filter-drawer-open");
      const surface = elements.filterPanel.querySelector(".rap-filter-panel__surface");
      surface.setAttribute("role", "region");
      surface.removeAttribute("aria-modal");
      placeFilterPanelInline();
      filterPanelMode = null;
    };
    if (immediate) {
      finishClose();
    } else {
      filterPanelTimer = window.setTimeout(finishClose, 160);
    }
    if (restoreFocus && activeTrigger) {
      activeTrigger.focus({ preventScroll: true });
    }
  };

  const applyDraftFilters = () => {
    FILTER_KEYS.forEach((key) => {
      state.filters[key] = new Set(state.draft[key]);
    });
    state.dates = { ...state.draftDates };
    state.page = 1;
    closeFilterPanel();
    applyFilters();
  };

  const resetDraftFilters = () => {
    FILTER_KEYS.forEach((key) => state.draft[key].clear());
    state.draftDates = emptyDates();
    renderFilterPanel();
  };

  const resetAllFilters = () => {
    FILTER_KEYS.forEach((key) => {
      state.filters[key].clear();
      state.draft[key].clear();
    });
    state.dates = emptyDates();
    state.draftDates = emptyDates();
    state.page = 1;
    applyFilters();
  };

  const renderPageSizeOptions = () => {
    elements.pageSize.innerHTML = state.config.pagination.pageSizes.map((size) => `
      <option value="${size}" ${size === state.pageSize ? "selected" : ""}>${size}</option>
    `).join("");
  };

  const hideTooltip = () => {
    window.clearTimeout(elements.tooltip._hideTimer);
    elements.tooltip.classList.remove("is-visible");
    elements.tooltip._hideTimer = window.setTimeout(() => {
      elements.tooltip.hidden = true;
    }, 150);
  };

  const showTooltip = (target) => {
    if (target.scrollWidth <= target.clientWidth) {
      return;
    }

    window.clearTimeout(elements.tooltip._hideTimer);
    elements.tooltip.textContent = target.dataset.tooltip;
    elements.tooltip.hidden = false;
    elements.tooltip.classList.remove("is-visible");
    const rect = target.getBoundingClientRect();
    const tooltipRect = elements.tooltip.getBoundingClientRect();
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - tooltipRect.width - 8
    );
    elements.tooltip.style.left = `${left}px`;
    const above = rect.top - tooltipRect.height - 6;
    elements.tooltip.style.top = `${above >= 8
      ? above
      : Math.min(window.innerHeight - tooltipRect.height - 8, rect.bottom + 6)}px`;
    void elements.tooltip.offsetWidth;
    elements.tooltip.classList.add("is-visible");
  };

  const positionCopyTooltip = (copyButton) => {
    const tooltip = copyButton.querySelector(".rap-profile__copy-tooltip");
    if (!tooltip) {
      return;
    }
    const rect = copyButton.getBoundingClientRect();
    tooltip.style.bottom = "auto";
    tooltip.style.left = `${rect.left + (rect.width / 2)}px`;
    tooltip.style.position = "fixed";
    tooltip.style.top = `${Math.max(8, rect.top - 34)}px`;
    tooltip.style.zIndex = "100";
  };

  const showToast = (message) => {
    elements.toast.textContent = message;
    elements.toast.hidden = false;
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => {
      elements.toast.hidden = true;
    }, 2200);
  };

  const copyText = async (value) => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
        return;
      } catch (error) {
        console.warn("Clipboard API unavailable, using document fallback.", error);
      }
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) {
      throw new Error("Copy command was rejected.");
    }
  };

  const findRecord = (recordId) => state.records.find((record) => record.id === recordId);

  const syncSearchState = () => {
    const hasValue = Boolean(elements.search.value);
    const searchContainer = elements.search.closest(".search-input");
    searchContainer?.classList.toggle("has-value", hasValue);
    searchContainer?.classList.toggle("is-ready", hasValue);
    elements.searchClear.disabled = !hasValue;
  };

  const clearSearch = () => {
    window.clearTimeout(searchTimer);
    state.search = "";
    state.companyFilter = null;
    state.page = 1;
    elements.search.value = "";
    syncSearchState();

    const url = new URL(window.location.href);
    url.searchParams.delete("idno");
    window.history.replaceState({ rapCompanyIdno: null }, "", url);
    applyFilters();
    elements.search.focus();
  };

  const updateProfileUrl = (recordId, { replace = false } = {}) => {
    const url = new URL(window.location.href);
    if (recordId) {
      url.searchParams.set("act", recordId);
    } else {
      url.searchParams.delete("act");
    }
    const method = replace ? "replaceState" : "pushState";
    window.history[method]({ rapRecordId: recordId || null }, "", url);
  };

  const showCompanyPermits = (record) => {
    state.companyFilter = { ...record.beneficiary };
    state.search = record.beneficiary.identifier;
    state.page = 1;
    elements.search.value = state.search;
    syncSearchState();
    closeProfile({ updateHistory: false });
    applyFilters();

    const url = new URL(window.location.href);
    url.searchParams.delete("act");
    url.searchParams.set("idno", record.beneficiary.identifier);
    window.history.pushState({ rapCompanyIdno: record.beneficiary.identifier }, "", url);
    document.querySelector(".rap-toolbar")?.scrollIntoView({ behavior: "auto", block: "start" });
  };

  const openProfile = (recordId, { updateHistory = true } = {}) => {
    const record = findRecord(recordId);
    if (!record) {
      return false;
    }

    state.activeRecord = record;
    renderProfile(record);
    elements.listView.hidden = true;
    elements.profileView.hidden = false;
    document.body.classList.add("rap-page--profile");
    document.title = `${record.permit.name} · EVO`;
    closeFilterPanel({ immediate: true, restoreFocus: false });
    hideTooltip();
    if (updateHistory) {
      updateProfileUrl(record.id);
    }
    window.scrollTo({ top: 0, behavior: "auto" });
    return true;
  };

  const closeProfile = ({ updateHistory = true } = {}) => {
    state.activeRecord = null;
    elements.profileView.hidden = true;
    elements.listView.hidden = false;
    elements.profileView.innerHTML = "";
    document.body.classList.remove("rap-page--profile");
    document.title = "Registrul actelor permisive · EVO";
    if (updateHistory) {
      updateProfileUrl(null);
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const syncViewFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const recordId = params.get("act");
    if (recordId && openProfile(recordId, { updateHistory: false })) {
      return;
    }
    const companyIdno = params.get("idno");
    const companyRecord = companyIdno
      ? state.records.find((record) => record.beneficiary.type === "company" && record.beneficiary.identifier === companyIdno)
      : null;
    state.companyFilter = companyRecord ? { ...companyRecord.beneficiary } : null;
    state.search = companyRecord ? companyRecord.beneficiary.identifier : "";
    elements.search.value = state.search;
    syncSearchState();
    state.page = 1;
    closeProfile({ updateHistory: false });
    applyFilters();
  };

  const bindEvents = () => {
    elements.search.addEventListener("input", () => {
      window.clearTimeout(searchTimer);
      syncSearchState();
      searchTimer = window.setTimeout(() => {
        state.search = elements.search.value.trim();
        state.companyFilter = null;
        state.page = 1;
        const url = new URL(window.location.href);
        if (url.searchParams.has("idno")) {
          url.searchParams.delete("idno");
          window.history.replaceState({ rapCompanyIdno: null }, "", url);
        }
        applyFilters();
      }, 120);
    });

    elements.searchClear.addEventListener("click", clearSearch);

    elements.triggers.forEach((trigger) => trigger.addEventListener("click", () => {
      const mode = trigger.dataset.rapFilterTrigger;
      const isSameOpenMode = elements.filterPanel.classList.contains("is-open") && filterPanelMode === mode;
      if (isSameOpenMode) {
        closeFilterPanel();
        return;
      }
      openFilterPanel(mode);
    }));

    elements.resetAll.addEventListener("click", resetAllFilters);
    elements.applyFilter.addEventListener("click", applyDraftFilters);
    elements.resetFilter.addEventListener("click", resetDraftFilters);

    elements.filterPanel.querySelectorAll("[data-rap-filter-close]").forEach((el) => {
      el.addEventListener("click", () => closeFilterPanel());
    });

    elements.filterPanel.querySelectorAll("[data-rap-section-search]").forEach((input) => {
      input.addEventListener("input", () => {
        const key = input.dataset.rapSectionSearch;
        state.sectionSearch[key] = input.value.trim();
        renderSectionList(key);
      });
    });

    elements.filterPanel.querySelectorAll("[data-rap-section-list]").forEach((list) => {
      list.addEventListener("scroll", () => syncFilterListBoundary(list), { passive: true });
      if (window.ResizeObserver) {
        const observer = new ResizeObserver(() => syncFilterListBoundary(list));
        observer.observe(list);
      }
    });

    elements.filterPanelBody.addEventListener("change", (event) => {
      const option = event.target.closest("[data-rap-option]");
      if (!option) {
        return;
      }
      const key = option.dataset.rapOption;
      if (option.checked) {
        state.draft[key].add(option.value);
      } else {
        state.draft[key].delete(option.value);
      }
      option.closest(".rap-filter-option")?.classList.toggle("is-checked", option.checked);
      renderSectionHeader(key);
    });

    elements.filterPanelBody.addEventListener("click", (event) => {
      const sectionToggle = event.target.closest("[data-rap-section-toggle]");
      if (sectionToggle) {
        const key = sectionToggle.dataset.rapSectionToggle;
        if (state.collapsedSections.has(key)) {
          state.collapsedSections.delete(key);
        } else {
          state.collapsedSections.add(key);
        }
        renderSectionHeader(key);
        return;
      }

      const chip = event.target.closest("[data-rap-chip]");
      if (!chip) {
        return;
      }
      const key = chip.dataset.rapChip;
      const value = chip.dataset.value;
      if (state.draft[key].has(value)) {
        state.draft[key].delete(value);
      } else {
        state.draft[key].add(value);
      }
      renderFilterChips(key, key === "status" ? state.config.filters.statuses : state.config.filters.markings || []);
      renderSectionHeader(key === "marking" ? "status" : key);
    });

    elements.filterPanelBody.addEventListener("input", (event) => {
      const dateInput = event.target.closest("[data-rap-date]");
      if (dateInput) {
        state.draftDates[dateInput.dataset.rapDate] = dateInput.value;
      }
    });

    elements.filterPanelBody.addEventListener("change", (event) => {
      const single = event.target.closest("[data-rap-date-single]");
      if (!single) {
        return;
      }
      const prefix = single.dataset.rapDateSingle;
      state.draftDates[`${prefix}Single`] = single.checked;
      if (single.checked) {
        state.draftDates[`${prefix}To`] = "";
      }
      syncDraftDateControls();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && elements.filterPanel.classList.contains("is-open")) {
        closeFilterPanel();
        return;
      }
      if (event.key === "Tab" && filterPanelMode === "drawer" && elements.filterPanel.classList.contains("is-open")) {
        const focusable = [...elements.filterPanel.querySelectorAll("button:not(:disabled):not([tabindex='-1']), input:not(:disabled)")]
          .filter((element) => element.offsetParent !== null);
        if (!focusable.length) {
          return;
        }
        const first = focusable[0];
        const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    elements.pageSize.addEventListener("change", () => {
      state.pageSize = Number(elements.pageSize.value);
      state.page = 1;
      render();
    });

    elements.pagination.addEventListener("click", (event) => {
      const button = event.target.closest("[data-page]");
      if (!button || button.disabled) {
        return;
      }
      state.page = Number(button.dataset.page);
      render();
      elements.tableScroller.scrollTo({ left: 0, behavior: "smooth" });
      document.querySelector(".rap-register").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    elements.tableBody.addEventListener("click", (event) => {
      const copyButton = event.target.closest("[data-rap-copy]");
      if (copyButton) {
        event.stopPropagation();
        handleCopyButton(copyButton);
        return;
      }

      const row = event.target.closest("[data-record-id]");
      if (row) {
        openProfile(row.dataset.recordId);
      }
    });

    elements.tableBody.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        const row = event.target.closest("[data-record-id]");
        if (row) {
          event.preventDefault();
          openProfile(row.dataset.recordId);
        }
      }
    });

    elements.profileView.addEventListener("click", async (event) => {
      const backButton = event.target.closest("[data-rap-profile-back]");
      if (backButton) {
        closeProfile();
        return;
      }

      const copyButton = event.target.closest("[data-rap-copy]");
      if (copyButton) {
        await handleCopyButton(copyButton);
        return;
      }

      const companyPermitsButton = event.target.closest("[data-rap-company-permits]");
      if (companyPermitsButton && state.activeRecord?.beneficiary.type === "company") {
        showCompanyPermits(state.activeRecord);
        return;
      }

      if (event.target.closest("[data-rap-view-document]")) {
        showToast("Actul permisiv este pregătit pentru vizualizare.");
      }
    });

    window.addEventListener("popstate", syncViewFromUrl);

    document.addEventListener("pointerover", (event) => {
      const copyButton = event.target.closest("[data-rap-copy]");
      if (copyButton) {
        positionCopyTooltip(copyButton);
      }
      const target = event.target.closest("[data-tooltip]");
      if (target) {
        showTooltip(target);
      }
    });
    document.addEventListener("pointerout", (event) => {
      if (event.target.closest("[data-tooltip]")) {
        hideTooltip();
      }
    });
    window.addEventListener("scroll", hideTooltip, true);
    let paginationResizeTimer;
    window.addEventListener("resize", () => {
      hideTooltip();
      window.clearTimeout(paginationResizeTimer);
      paginationResizeTimer = window.setTimeout(renderPagination, 100);
    });

    document.querySelectorAll(".rap-header__languages button").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".rap-header__languages button").forEach((item) => item.classList.remove("is-active"));
        button.classList.add("is-active");
      });
    });
  };

  const init = async () => {
    try {
      placeFilterPanelInline();
      const response = await fetch(DATA_URL);
      if (!response.ok) {
        throw new Error(`Datele RAP nu au putut fi încărcate (${response.status}).`);
      }

      state.config = await response.json();
      state.records = expandRecords(state.config.records, state.config.meta.totalResults);
      state.denumiriOptions = state.config.filters.denumiri
        || [...new Set(state.records.map((record) => record.permit.name))].sort((a, b) => a.localeCompare(b, "ro"));
      state.page = state.config.pagination.initialPage;
      state.pageSize = state.config.pagination.defaultPageSize;
      elements.title.textContent = state.config.page.title;
      elements.subtitle.textContent = state.config.page.subtitle;
      elements.search.placeholder = state.config.page.searchPlaceholder;
      renderFilterPanel();
      renderPageSizeOptions();
      bindEvents();
      applyFilters();
      syncViewFromUrl();
    } catch (error) {
      console.error(error);
      elements.empty.hidden = false;
      elements.empty.querySelector("p").textContent = "Datele nu au putut fi încărcate. Reîncearcă.";
      document.querySelector(".rap-register").hidden = true;
    }
  };

  init();
})();
